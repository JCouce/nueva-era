"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  setAtributoAction,
  setHabilidadAction,
  addEspecialidadAction,
  removeEspecialidadAction,
  saveIdentityAction,
  resetBuildAction,
  equiparAction,
  desequiparAction,
  setPrioridadAction,
  type SaveResult,
} from "./actions";
import {
  setAtributoValue,
  setHabilidadValue,
  addEspecialidad,
  removeEspecialidad,
  puntosAtributosDisponibles,
  puntosHabilidadesDisponibles,
  salud,
  especiePorId,
  equipar,
  desequipar,
  setPrioridad,
  RECURSOS_POR_LETRA,
  describirEstadosActivos,
  type AtributoId,
  type HabilidadId,
  type PiezaEquipada,
  type CategoriaPrioridad,
  type LetraPrioridad,
} from "@/lib/rules";
import type { Sheet } from "@/lib/rules";
import { ResumenTab } from "./_components/ResumenTab";
import { AtributosTab } from "./_components/AtributosTab";
import { HabilidadesTab } from "./_components/HabilidadesTab";
import { DotesTab } from "./_components/DotesTab";
import { PsionicaTab } from "./_components/PsionicaTab";
import { TiradasTab } from "./_components/TiradasTab";
import { TiendaTab } from "./_components/TiendaTab";
import { EquipoTab } from "./_components/EquipoTab";
import { CombateTab, type CombateView } from "./_components/CombateTab";
import type { Lanzamiento } from "@/components/ResultadoTirada";

// Único sitio para tocar el delay de autosave — lo usan tanto identidad como
// el debounce por campo de atributos/habilidades (y, cuando existan, dotes/
// poderes: mismo helper, otra clave).
const AUTOSAVE_DEBOUNCE_MS = 500;
import { usePollingCombate } from "@/hooks/usePollingCombate";

// Tres grupos, no una lista plana: la ficha en sí (fila 1), lo que el
// personaje hace o lleva (fila 2, izquierda) y el catálogo — que no es del
// personaje, es la dirección del juego consultando o repartiendo equipo —
// separado a la derecha en esa misma fila.
const TABS_FICHA = [
  { id: "resumen", label: "Resumen" },
  { id: "attrs", label: "Atributos" },
  { id: "skills", label: "Habilidades" },
  { id: "dotes", label: "Dotes" },
  { id: "psionica", label: "Psiónica" },
] as const;
const TABS_PERSONAJE = [
  { id: "tiradas", label: "Tiradas" },
  { id: "equipo", label: "Equipo" },
] as const;
const TABS_CATALOGO = [{ id: "tienda", label: "Tienda" }] as const;
// No es un cuarto grupo estático: "combate" solo existe mientras el
// personaje está metido en un Combate EN_CURSO (fase 6b bloque 3, D5), así
// que se añade a mano junto a TABS_PERSONAJE en vez de vivir en su propia
// lista siempre visible.
type TabId =
  | (typeof TABS_FICHA)[number]["id"]
  | (typeof TABS_PERSONAJE)[number]["id"]
  | (typeof TABS_CATALOGO)[number]["id"]
  | "combate";
type SaveStatus = "idle" | "saving" | "saved" | "error";

function TabButton({
  tab,
  active,
  onClick,
}: {
  tab: { id: TabId; label: string };
  active: boolean;
  onClick: (id: TabId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(tab.id)}
      className={`-mb-px border-b-2 px-3 py-2 font-display text-sm font-semibold uppercase tracking-wide ${
        active ? "border-accent text-foreground" : "border-transparent text-muted"
      }`}
    >
      {tab.label}
    </button>
  );
}


function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function CharacterSheet({
  characterId,
  initialName,
  initialSheet,
  characterStatus,
  initialXp,
  initialCreditos,
  esMaster,
  combate,
}: {
  characterId: string;
  initialName: string;
  initialSheet: Sheet;
  characterStatus: "DRAFT" | "APPROVED";
  initialXp: number;
  initialCreditos: number;
  esMaster: boolean;
  // null si no hay Combate EN_CURSO, o si lo hay pero este personaje no
  // tiene fila dentro (fase 6b bloque 3) — en los dos casos, nada de
  // combate se enseña en la ficha.
  combate: CombateView | null;
}) {
  const aprobada = characterStatus === "APPROVED";
  const [active, setActive] = useState<TabId>("resumen");
  const [sheet, setSheet] = useState<Sheet>(initialSheet);
  const [name, setName] = useState(initialName);
  const [xp, setXp] = useState(initialXp);
  const [creditos, setCreditos] = useState(initialCreditos);
  const [status, setStatus] = useState<SaveStatus>("idle");
  // Historial de tiradas y memoria de dificultad/circunstancial por tirada:
  // vive aquí, no dentro de TiradasTab, para que sobreviva a cambiar de tab
  // (antes se perdía porque TiradasTab se desmonta entero al cambiar de tab
  // — ver el `{activeEfectivo === "tiradas" && (...)}` de abajo). Dura lo que
  // dure esta pestaña del navegador abierta — sin persistir a servidor ni a
  // almacenamiento del navegador a propósito: es un log de cortesía de las
  // últimas tiradas, no un dato mecánico como PG/fatiga (2026-09-24, pedido
  // del usuario — "si cierras es nueva sesión").
  const [tiradasHistorial, setTiradasHistorial] = useState<Lanzamiento[]>([]);
  const [tiradasMemoria, setTiradasMemoria] = useState<
    Record<string, { dificultad: number | null; circunstancial: number }>
  >({});

  // 4.1: SIEMPRE activo aquí, no solo cuando `combate !== null` — a
  // diferencia de CombateConsole.tsx (donde el máster ve el combate desde
  // que se crea), el jugador no se entera de nada hasta que el máster pulsa
  // "Comenzar combate" (PREPARANDO → EN_CURSO, combate/actions.ts). Si el
  // polling solo arrancara con `combate !== null`, un jugador que cargó la
  // ficha mientras el combate seguía en preparación se quedaría colgado sin
  // enterarse nunca de que empezó — bug real encontrado verificando esto
  // mismo en Chrome. Intervalo largo (15s) mientras no hay nada que ver
  // (solo para detectar que algo apareció), corto (4s) en cuanto sí lo hay.
  // Seguro para el resto del estado de este componente:
  // `sheet`/`name`/`xp`/`creditos` viven en useState ya montado, así que un
  // refresh no los pisa — solo trae fresco lo que se lee directo de props
  // en cada render, que es `combate`.
  usePollingCombate(true, combate !== null ? 4000 : 15000);

  // Derivado durante el render, no sincronizado en un efecto (ver "you
  // might not need an effect" de React): si `combate` desaparece entre una
  // carga y otra de esta página (el combate terminó) con `active` todavía
  // en "combate", cae a "resumen" en vez de dejar la ficha en blanco — el
  // switch de abajo no renderiza nada para "combate" sin `combate`.
  const activeEfectivo: TabId = active === "combate" && !combate ? "resumen" : active;

  // Refs con el último valor, para leerlos dentro de los saves con debounce.
  // Se sincronizan en efecto, no en render: escribirlas durante el render
  // rompe la garantía de React y lo avisa el linter.
  const sheetRef = useRef(sheet);
  const nameRef = useRef(name);
  useEffect(() => {
    sheetRef.current = sheet;
    nameRef.current = name;
  }, [sheet, name]);

  // Cola secuencial: los autosaves no se pisan (evita carreras load-modify-write).
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const idTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Un timer por campo (clave = "atributo:fuerza", "habilidad:sigilo"...) para
  // que subir dos campos casi a la vez no comparta ventana de debounce — a
  // diferencia de identidad, que siempre manda el objeto entero y sí puede
  // compartir un único timer.
  const pendingTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const runSave = useCallback(
    (fn: () => Promise<SaveResult>, onOk?: (s: Sheet) => void) => {
      setStatus("saving");
      queue.current = queue.current
        .then(() => fn())
        .then(
          (res) => {
            if (res.ok) {
              onOk?.(res.sheet);
              // Subir de nivel tras aprobar gasta XP, y equipar/desequipar
              // cobra o devuelve créditos, siempre en el servidor — se
              // refleja aquí en vez de en cada callsite.
              if (res.xp !== undefined) setXp(res.xp);
              if (res.creditos !== undefined) setCreditos(res.creditos);
              setStatus("saved");
            } else setStatus("error");
          },
          () => setStatus("error"),
        );
    },
    [],
  );

  // Debounce genérico por clave (independiente de scheduleIdentity, que manda
  // el objeto entero): pensado para steppers que se clican varias veces
  // seguidas — atributos/habilidades hoy, dotes/poderes el día que existan,
  // sin tocar nada más que la clave y la llamada al action. El estado
  // optimista (setSheet) ya ocurre en el callsite antes de llamar aquí, así
  // que la UI no se entera del delay — solo se retrasa la escritura.
  const scheduleCommit = (key: string, fn: () => Promise<SaveResult>, onOk?: (s: Sheet) => void) => {
    const existing = pendingTimers.current.get(key);
    if (existing) clearTimeout(existing);
    pendingTimers.current.set(
      key,
      setTimeout(() => {
        pendingTimers.current.delete(key);
        runSave(fn, onOk);
      }, AUTOSAVE_DEBOUNCE_MS),
    );
  };

  // ── Build. El estado optimista usa las mismas funciones puras que el
  // servidor, así que normalmente no hace falta reconciliar en éxito — salvo
  // atributos/habilidades: si la ficha está aprobada, el servidor aplica
  // además el guardarraíl de solo-comprar (aprobacion.ts), que el cliente no
  // conoce. Por eso aquí sí se reconcilia con lo que devuelve. Atributos y
  // habilidades van debounced por campo (clics rápidos en un stepper durante
  // la creación no deben disparar un round-trip por clic); el resto es
  // inmediato. ──
  const commitAtributo = (id: AtributoId, value: number) => {
    setSheet((s) => setAtributoValue(s, id, value));
    scheduleCommit(`atributo:${id}`, () => setAtributoAction(characterId, id, value), setSheet);
  };
  const commitHabilidad = (id: HabilidadId, value: number) => {
    setSheet((s) => setHabilidadValue(s, id, value));
    scheduleCommit(`habilidad:${id}`, () => setHabilidadAction(characterId, id, value), setSheet);
  };
  const commitAddEspecialidad = (id: HabilidadId, nombre: string) => {
    setSheet((s) => addEspecialidad(s, id, nombre));
    runSave(() => addEspecialidadAction(characterId, id, nombre));
  };
  const commitRemoveEspecialidad = (id: HabilidadId, nombre: string) => {
    setSheet((s) => removeEspecialidad(s, id, nombre));
    runSave(() => removeEspecialidadAction(characterId, id, nombre));
  };
  const reset = () => {
    runSave(() => resetBuildAction(characterId), setSheet);
  };
  const commitPrioridad = (categoria: CategoriaPrioridad, letra: LetraPrioridad | null) => {
    setSheet((s) => setPrioridad(s, categoria, letra));
    runSave(() => setPrioridadAction(characterId, categoria, letra), setSheet);
  };
  // Reconcilia con lo que devuelve el servidor: el cliente ya filtra por
  // crédito suficiente antes de dejar pulsar el botón (ver TiendaTab), pero
  // el precio real y el guardarraíl de instalación viven en el servidor.
  const commitEquipar = (pieza: PiezaEquipada) => {
    setSheet((s) => equipar(s, pieza));
    runSave(() => equiparAction(characterId, pieza), setSheet);
  };
  const commitDesequipar = (instanciaId: string) => {
    setSheet((s) => desequipar(s, instanciaId));
    runSave(() => desequiparAction(characterId, instanciaId), setSheet);
  };

  // ── Identidad (debounced, fire-and-forget). ──
  const scheduleIdentity = () => {
    if (idTimer.current) clearTimeout(idTimer.current);
    idTimer.current = setTimeout(() => {
      runSave(() =>
        saveIdentityAction(characterId, {
          name: nameRef.current,
          edad: sheetRef.current.edad,
          altura: sheetRef.current.altura,
          peso: sheetRef.current.peso,
          especieId: sheetRef.current.especieId,
          trasfondo: sheetRef.current.trasfondo,
          motivacion: sheetRef.current.motivacion,
        }),
      );
    }, AUTOSAVE_DEBOUNCE_MS);
  };

  const onName = (v: string) => {
    setName(v);
    scheduleIdentity();
  };
  const onEdad = (v: number | null) => {
    setSheet((s) => ({ ...s, edad: v === null ? null : clampInt(v, 0, 999) }));
    scheduleIdentity();
  };
  const onAltura = (v: number | null) => {
    setSheet((s) => ({ ...s, altura: v === null ? null : clampInt(v, 0, 999) }));
    scheduleIdentity();
  };
  const onPeso = (v: number | null) => {
    setSheet((s) => ({ ...s, peso: v === null ? null : clampInt(v, 0, 999) }));
    scheduleIdentity();
  };
  const onEspecie = (v: string | null) => {
    setSheet((s) => ({ ...s, especieId: v }));
    scheduleIdentity();
  };
  const onTrasfondo = (v: string) => {
    setSheet((s) => ({ ...s, trasfondo: v }));
    scheduleIdentity();
  };
  const onMotivacion = (v: string) => {
    setSheet((s) => ({ ...s, motivacion: v }));
    scheduleIdentity();
  };

  const puntosAttr = puntosAtributosDisponibles(sheet);
  const puntosSkill = puntosHabilidadesDisponibles(sheet);
  const { vida, fatiga } = salud(sheet);

  // Fase 6b bloque 3: mi fila en el combate activo, si la hay. `combate` ya
  // viene null desde el servidor si este personaje no está metido dentro
  // (page.tsx) — esto solo busca cuál de las filas es la mía para resaltar
  // turno/estados en la tira compacta.
  const miCombatiente = combate?.combatientes.find((c) => c.characterId === characterId) ?? null;
  const esMiTurno = !!(miCombatiente && combate!.combatientes[combate!.turnoIndex]?.id === miCombatiente.id);
  const misEstadosActivos = miCombatiente ? describirEstadosActivos(miCombatiente.estados) : [];

  // Tope de rareza de la letra de Recursos (docs/sistema.md §2): solo en
  // creación, nunca al máster — aprobada la ficha, o editando el máster,
  // cualquier rareza pasa siempre que llegue el saldo (mismo criterio que el
  // servidor en equiparAction).
  const topeRareza =
    !aprobada && !esMaster && sheet.prioridades.recursos
      ? RECURSOS_POR_LETRA[sheet.prioridades.recursos].rareza
      : null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide">
        {name || "Sin nombre"}
      </h1>

      {/* HUD fino: estado de solo lectura (la edición está en cada tab) */}
      <div className="flex items-center gap-3 border-y border-border py-2 font-mono text-sm">
        <span className="uppercase tracking-wide text-muted">
          {especiePorId(sheet.especieId)?.label ?? "sin especie"}
        </span>
        <span className="ml-auto tabular-nums text-danger">
          {vida}
          <span className="text-muted"> pv</span>
        </span>
        <span className="tabular-nums text-info">
          {fatiga}
          <span className="text-muted"> fat</span>
        </span>
      </div>

      {/* Tira de combate (fase 6b, bloque 3, D5: combate → ficha, nunca al
          revés): solo aparece si este personaje está metido en el Combate
          EN_CURSO actual. PG/fatiga aquí son la foto del combatiente, no el
          derivado de la ficha de arriba — durante combate son magnitudes
          distintas a propósito (ver comentario de Combatiente en
          schema.prisma). */}
      {miCombatiente && (
        <div
          className={`clip-chamfer-sm flex flex-col gap-1.5 border px-3 py-2 font-mono text-xs ${
            esMiTurno ? "!border-accent shadow-glow-yellow" : "border-border"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="uppercase tracking-wide text-muted">Ronda {combate!.ronda}</span>
            {esMiTurno && (
              <span className="uppercase tracking-wide text-accent">Tu turno</span>
            )}
            <span className="ml-auto tabular-nums text-danger">
              {miCombatiente.pgActual}
              <span className="text-muted">/{miCombatiente.pgMax} pv</span>
            </span>
            <span className="tabular-nums text-info">
              {miCombatiente.fatigaActual}
              <span className="text-muted">/{miCombatiente.fatigaMax} fat</span>
            </span>
          </div>
          {misEstadosActivos.length > 0 && (
            <div className="flex flex-col gap-1 border-t border-border pt-1.5">
              {misEstadosActivos.map((a) => (
                <div key={a.estadoId}>
                  <span className="uppercase tracking-wide text-accent">
                    {a.label}
                    {a.rondasRestantes !== null && ` · ${a.rondasRestantes}r`}
                  </span>
                  {/* Detalle visible de verdad, no en un `title` — mismo
                      arreglo que CombateConsole.tsx. */}
                  {a.detalle.length > 0 && (
                    <p className="text-[11px] normal-case tracking-normal text-muted">
                      {a.detalle.join(" ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* El guardado es automático y casi siempre invisible a propósito —
          "guardando…"/"guardado ✓" permanente en la fila de tabs sobraba
          más de lo que ayudaba. Solo se avisa cuando de verdad hace falta
          hacer algo: el guardado ha fallado. */}
      {status === "error" && (
        <p className="font-mono text-[11px] uppercase tracking-wide text-danger">
          Error al guardar — vuelve a intentarlo
        </p>
      )}

      <div className="flex flex-col gap-1 border-b border-border">
        <nav className="flex flex-wrap gap-1">
          {TABS_FICHA.map((t) => (
            <TabButton key={t.id} tab={t} active={activeEfectivo === t.id} onClick={setActive} />
          ))}
        </nav>

        <div className="flex items-end justify-between gap-2">
          <nav className="flex flex-wrap gap-1">
            {TABS_PERSONAJE.map((t) => (
              <TabButton key={t.id} tab={t} active={activeEfectivo === t.id} onClick={setActive} />
            ))}
            {/* Solo mientras el personaje está en el Combate EN_CURSO — no
                un tab más de la lista estática, ver TabId más arriba. */}
            {combate && (
              <TabButton
                tab={{ id: "combate", label: "Combate" }}
                active={activeEfectivo === "combate"}
                onClick={setActive}
              />
            )}
          </nav>
          {/* Separada del resto: la Tienda es catálogo, no algo que "es" del
              personaje — el borde y el hueco a la izquierda lo marcan. */}
          <nav className="flex flex-wrap gap-1 border-l border-border pl-2">
            {TABS_CATALOGO.map((t) => (
              <TabButton key={t.id} tab={t} active={activeEfectivo === t.id} onClick={setActive} />
            ))}
          </nav>
        </div>
      </div>

      {activeEfectivo === "resumen" && (
        <ResumenTab
          name={name}
          sheet={sheet}
          aprobada={aprobada}
          onName={onName}
          onEdad={onEdad}
          onAltura={onAltura}
          onPeso={onPeso}
          onEspecie={onEspecie}
          onTrasfondo={onTrasfondo}
          onMotivacion={onMotivacion}
          onPrioridad={commitPrioridad}
        />
      )}
      {activeEfectivo === "attrs" && (
        <AtributosTab
          sheet={sheet}
          puntosDisponibles={puntosAttr}
          aprobada={aprobada}
          xp={xp}
          onSet={commitAtributo}
        />
      )}
      {activeEfectivo === "skills" && (
        <HabilidadesTab
          sheet={sheet}
          puntosDisponibles={puntosSkill}
          aprobada={aprobada}
          xp={xp}
          onSet={commitHabilidad}
          onAddEspecialidad={commitAddEspecialidad}
          onRemoveEspecialidad={commitRemoveEspecialidad}
        />
      )}
      {activeEfectivo === "dotes" && <DotesTab sheet={sheet} />}
      {activeEfectivo === "psionica" && <PsionicaTab sheet={sheet} />}
      {activeEfectivo === "tiradas" && (
        <TiradasTab
          sheet={sheet}
          estadosCombate={miCombatiente?.estados ?? []}
          historial={tiradasHistorial}
          setHistorial={setTiradasHistorial}
          memoria={tiradasMemoria}
          setMemoria={setTiradasMemoria}
        />
      )}
      {activeEfectivo === "tienda" && (
        <TiendaTab
          sheet={sheet}
          creditos={creditos}
          topeRareza={topeRareza}
          onEquipar={commitEquipar}
        />
      )}
      {activeEfectivo === "equipo" && (
        <EquipoTab sheet={sheet} creditos={creditos} onDesequipar={commitDesequipar} />
      )}
      {activeEfectivo === "combate" && combate && (
        <CombateTab combate={combate} miCombatienteId={miCombatiente?.id ?? null} />
      )}

      {/* Resetear es vender todo de golpe: no tiene sentido, y el servidor
          lo rechaza, en cuanto la ficha está aprobada. */}
      {!aprobada && (activeEfectivo === "attrs" || activeEfectivo === "skills") && (
        <button
          type="button"
          onClick={reset}
          className="clip-chamfer-sm mt-2 self-start border border-danger px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-danger active:scale-95"
        >
          ⟲ Reset build
        </button>
      )}
    </div>
  );
}
