"use client";

// Consola de combate del máster. Desde E1d es el centro de mando dentro del combate:
//   - escritorio: contador de rondas arriba; debajo, la cola (objetivos), el panel de
//     mando compartido (components/mando) y el registro con deshacer.
//   - móvil: la cola en una columna, botón flotante "Acciones a N" que abre la hoja
//     inferior con el panel de mando (Estados, Vida, Recompensas) y un dock fijo abajo
//     con el contador y "Siguiente turno".
// Tocar las barras de PG o fatiga de una fila la deja como objetivo único y abre la
// pestaña Vida con ese recurso (en móvil, en la hoja).
// Las acciones de ./actions son tipadas: se llaman directo y refrescan solas
// (`refresh()` en el servidor).
import { MasterTabs } from "@/components/MasterTabs";
import { useEffect, useEffectEvent, useOptimistic, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { usePollingCombate } from "@/hooks/usePollingCombate";
import {
  duracionLegible,
  formatoNumero,
  nombreCorto,
  pasarTurno,
  type EstadoActivoDescrito,
  type Inmunidad,
  type RecursoVital,
  type ResumenCombate,
  type Sheet,
} from "@/lib/rules";
import { ChipEstado } from "@/components/ChipEstado";
import { Aviso } from "@/components/mando/Aviso";
import { Barra } from "@/components/mando/Barra";
import { Boton, FOCO, Iniciales } from "@/components/mando/controles";
import { HojaInferior } from "@/components/mando/HojaInferior";
import { PanelMando, type PestanaMando } from "@/components/mando/PanelMando";
import { RegistroMando, type EntradaMando } from "@/components/mando/RegistroMando";
import { useAvisosMando } from "@/components/mando/useAvisosMando";
import type { AccionesMando, ObjetivoMando } from "@/components/mando/tipos";
import { darCreditosAction, darXpAction, deshacerRegistroAction, limpiarEstadosAction } from "../actions";
import { NpcAccionesPanel } from "./NpcAccionesPanel";
import { ContadorRondas, type EnCola } from "./ContadorRondas";
import {
  crearCombateAction,
  comenzarCombateAction,
  terminarCombateAction,
  agregarJugadorAction,
  agregarNpcDeCatalogoAction,
  avanzarTurnoAction,
  establecerIniciativaAction,
  ordenarPorIniciativaAction,
  moverCombatienteAction,
  ajustarVidaEnCombateAction,
  aplicarEstadoEnCombateAction,
  quitarEstadoEnCombateAction,
  type CombateResult,
} from "./actions";

type CombatienteView = {
  id: string;
  nombre: string;
  pgActual: number;
  pgMax: number;
  fatigaActual: number;
  fatigaMax: number;
  iniciativa: number | null;
  characterId: string | null;
  derrotado: boolean;
  estados: EstadoActivoDescrito[];
  // A7: los de su ficha (jugador) o los de la foto (NPC).
  inmunidades: Inmunidad[];
  // Los de su ficha (jugador); null en un NPC.
  xp: number | null;
  creditos: number | null;
  // Solo un NPC lo trae (foto congelada al añadirlo, 5.0) — un
  // Combatiente-jugador siempre lo trae `null`, lee su Sheet en vivo desde
  // su propia ficha. Es lo que habilita el botón "Acciones" de la 5.5.
  sheet: Sheet | null;
};

type CombateView = {
  id: string;
  // TERMINADO nunca llega aquí (page.tsx solo busca PREPARANDO/EN_CURSO),
  // pero se deja el tipo completo por si algún día se lista uno terminado.
  estado: "PREPARANDO" | "EN_CURSO" | "TERMINADO";
  ronda: number;
  turnoIndex: number;
  combatientes: CombatienteView[];
};

type CharacterOption = {
  id: string;
  name: string;
  owner: { name: string | null; email: string };
};

type NpcOption = {
  id: string;
  nombre: string;
  nota: string | null;
  poder: number;
};

const tipoDe = (c: CombatienteView): "pj" | "npc" => (c.characterId !== null ? "pj" : "npc");

// Vibración corta al pasar turno en móvil (más larga al cerrar la vuelta), si existe.
function vibrar(patron: number | number[]) {
  try {
    navigator.vibrate?.(patron);
  } catch {
    // Algunos navegadores la tienen y la bloquean: no pasa nada.
  }
}

// La barra espaciadora pasa turno salvo con el foco en algo que ya la usa.
function focoUsaEspacio(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(el.tagName);
}

export function CombateConsole({
  combate,
  characters,
  npcs,
  resumen,
  registro,
  generadoEn,
}: {
  combate: CombateView | null;
  characters: CharacterOption[];
  npcs: NpcOption[];
  resumen: ResumenCombate | null;
  registro: EntradaMando[];
  generadoEn: number;
}) {
  const [pending, startTransition] = useTransition();
  const [pasandoTurno, startTurno] = useTransition();
  const [terminandoEscena, startEscena] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // 5.5: un panel a la vez, no un AccionesTab montado por fila.
  const [tiradasDe, setTiradasDe] = useState<CombatienteView | null>(null);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [pestana, setPestana] = useState<PestanaMando>("estados");
  const [recursoVida, setRecursoVida] = useState<RecursoVital>("vida");
  const [hoja, setHoja] = useState(false);
  const { aviso, avisar, cerrarAviso, errores, deshaciendo, deshacer } = useAvisosMando(deshacerRegistroAction);
  // 4.1: otra pestaña o el jugador desde su ficha pueden cambiar el combate.
  usePollingCombate(combate !== null);

  // "Siguiente turno" mueve el contador al momento; la respuesta de la acción lo confirma.
  const [pos, moverOptimista] = useOptimistic(
    { ronda: combate?.ronda ?? 1, turnoIndex: combate?.turnoIndex ?? 0 },
    (actual, total: number) => pasarTurno(actual, total),
  );

  const enCurso = combate?.estado === "EN_CURSO";
  const cola = combate?.combatientes ?? [];

  function siguienteTurno() {
    if (!combate || !enCurso || pasandoTurno || cola.length === 0) return;
    vibrar(pasarTurno(pos, cola.length).cierraVuelta ? [20, 40, 30] : 12);
    setError(null);
    startTurno(async () => {
      moverOptimista(cola.length);
      const r = await avanzarTurnoAction(combate.id);
      if (!r.ok) setError(r.error);
    });
  }

  const alPulsarTecla = useEffectEvent((e: KeyboardEvent) => {
    if (e.code !== "Space" || e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (focoUsaEspacio(document.activeElement) || hoja || tiradasDe) return;
    if (!enCurso) return;
    e.preventDefault();
    siguienteTurno();
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => alPulsarTecla(e);
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  function ejecutar(accion: () => Promise<CombateResult>) {
    setError(null);
    startTransition(async () => {
      const res = await accion();
      if (!res.ok) setError(res.error);
    });
  }

  if (!combate) {
    return (
      <div className="flex flex-col gap-4">
        <Cabecera titulo="Combate" />
        <MasterTabs className="mb-4" />
        {resumen ? (
          <Resumen resumen={resumen} />
        ) : (
          <p className="border border-dashed border-border px-4 py-8 text-center font-mono text-sm text-muted">
            No hay ningún combate abierto.
          </p>
        )}
        <Boton
          variante="primario"
          disabled={pending}
          onClick={() => ejecutar(() => crearCombateAction())}
          className="min-h-13 text-lg lg:self-start"
        >
          {resumen ? "Nuevo combate" : "Crear combate"}
        </Boton>
        {error && <p className="font-mono text-xs text-danger">{error}</p>}
      </div>
    );
  }

  // La fila viva (tras el polling o un ajuste de PG), no la que se abrió.
  const npcAbierto = tiradasDe ? (cola.find((c) => c.id === tiradasDe.id) ?? tiradasDe) : null;

  const objetivos: ObjetivoMando[] = cola
    .filter((c) => seleccion.includes(c.id))
    .map((c) => ({
      id: c.id,
      nombre: c.nombre,
      tipo: tipoDe(c),
      xp: c.xp,
      creditos: c.creditos,
      estados: c.estados,
      inmunidades: c.inmunidades,
      vida: { actual: c.pgActual, max: c.pgMax, tope: c.pgMax },
      fatiga: { actual: c.fatigaActual, max: c.fatigaMax, tope: c.fatigaMax },
    }));
  const todos = cola.length > 0 && cola.every((c) => seleccion.includes(c.id));
  const alternar = (id: string) => setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const quitarObjetivo = (id: string) => setSeleccion((s) => s.filter((x) => x !== id));
  const alternarTodos = () => setSeleccion(todos ? [] : cola.map((c) => c.id));

  const characterIdsDe = (ids: string[]) => [
    ...new Set(cola.flatMap((c) => (ids.includes(c.id) && c.characterId !== null ? [c.characterId] : []))),
  ];
  const acciones: AccionesMando = {
    aplicarEstado: (combatienteIds, estado, forzar) => aplicarEstadoEnCombateAction({ combatienteIds, estado, forzar }),
    quitarEstado: (combatienteIds, estadoId) => quitarEstadoEnCombateAction({ combatienteIds, estadoId }),
    darRecurso: (recurso, ids, cantidad, motivo) =>
      (recurso === "xp" ? darXpAction : darCreditosAction)({ characterIds: characterIdsDe(ids), cantidad, motivo }),
    ajustarVida: (recurso, combatienteIds, cantidad) => ajustarVidaEnCombateAction({ combatienteIds, recurso, cantidad }),
  };

  // Atajo desde las barras de una fila: objetivo único y pestaña Vida con ese recurso.
  const abrirVida = (c: CombatienteView, recurso: RecursoVital) => {
    setSeleccion([c.id]);
    setRecursoVida(recurso);
    setPestana("vida");
    // En escritorio el panel ya está a la vista; la hoja es solo de móvil (lg = 64rem).
    if (!window.matchMedia("(min-width: 64rem)").matches) setHoja(true);
  };

  const quitarEstadoDeFila = (c: CombatienteView, e: EstadoActivoDescrito) => {
    setError(null);
    startTransition(async () => {
      const r = await quitarEstadoEnCombateAction({ combatienteIds: [c.id], estadoId: e.estadoId });
      if (!r.ok) return setError(r.error);
      avisar({ mensaje: `Quitado ${e.label} a ${nombreCorto(c.nombre)}`, registroId: r.registroId, tono: "ok" });
    });
  };

  const terminarEscena = () =>
    startEscena(async () => {
      const r = await limpiarEstadosAction({ ambito: "combate" });
      if (!r.ok) return avisar({ mensaje: r.error, registroId: null, tono: "aviso" });
      avisar(
        r.personajes + r.npcs === 0
          ? { mensaje: "No había estados que limpiar.", registroId: null, tono: "ok" }
          : { mensaje: "Estados limpiados", registroId: r.registroId, tono: "ok" },
      );
    });

  // Mismo criterio que agregarJugadorAction: solo cuenta "ya está" con una fila activa.
  const enCombateIds = new Set(cola.filter((c) => c.characterId !== null && !c.derrotado).map((c) => c.characterId as string));
  const disponibles = characters.filter((c) => !enCombateIds.has(c.id));
  const enCola: EnCola[] = cola.map((c) => ({ id: c.id, nombre: c.nombre, tipo: tipoDe(c) }));
  const vigentes = registro.filter((e) => !e.deshecha).length;

  return (
    <>
      <Cabecera titulo="Combate">
        <Boton variante="aviso" onClick={terminarEscena} disabled={terminandoEscena}>
          Limpiar estados
        </Boton>
        <Boton variante="peligro" disabled={pending} onClick={() => ejecutar(() => terminarCombateAction(combate.id))}>
          <span className="lg:hidden">Terminar</span>
          <span className="hidden lg:inline">Terminar combate</span>
        </Boton>
      </Cabecera>
      <MasterTabs className="mb-4" />

      {/* PREPARANDO: el máster monta la escena sin que nadie más lo vea
          (characters/[id]/page.tsx solo busca EN_CURSO); el botón decide cuándo empieza. */}
      {combate.estado === "PREPARANDO" ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 border border-border bg-surface px-4 py-3">
          <span className="flex-1 font-mono text-sm uppercase tracking-widest text-muted">Preparando combate</span>
          <Boton
            variante="primario"
            disabled={pending}
            onClick={() => ejecutar(() => comenzarCombateAction(combate.id))}
            className="min-h-13 text-lg max-lg:w-full"
          >
            Comenzar combate
          </Boton>
        </div>
      ) : (
        <div className="mb-4 hidden lg:block">
          <ContadorRondas
            ronda={pos.ronda}
            turnoIndex={pos.turnoIndex}
            cola={enCola}
            variante="barra"
            onSiguiente={siguienteTurno}
            deshabilitado={pasandoTurno || cola.length === 0}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="mb-3 border border-danger px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="lg:grid lg:grid-cols-[360px_minmax(0,1fr)_280px] lg:border lg:border-border">
        <section aria-labelledby="combate-cola" className="min-w-0 lg:border-r lg:border-border">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pb-2.5 pt-1 lg:px-4 lg:pt-3.5">
            <h2 id="combate-cola" className="font-display text-[0.95rem] font-bold uppercase tracking-widest">
              Cola <span className="font-mono text-xs font-normal text-muted">({cola.length})</span>
            </h2>
            <span className="flex-1" />
            {/* Ordenar, como las flechas y la iniciativa de cada fila, solo al preparar. */}
            {!enCurso && (
              <button
                type="button"
                disabled={pending || cola.length < 2}
                onClick={() => ejecutar(() => ordenarPorIniciativaAction(combate.id))}
                className={`min-h-11 font-mono text-xs uppercase tracking-wide text-muted transition hover:text-accent disabled:opacity-50 ${FOCO}`}
              >
                Por iniciativa
              </button>
            )}
            {cola.length > 0 && (
              <button type="button" onClick={alternarTodos} className={`min-h-9 font-semibold text-info ${FOCO}`}>
                {todos ? "Ninguno" : "Todos"}
              </button>
            )}
          </div>
          <ul className="grid gap-2.5 pt-2 lg:px-3 lg:pb-4">
            {cola.map((c, i) => (
              <FilaCola
                key={c.id}
                c={c}
                elegido={seleccion.includes(c.id)}
                esTurno={enCurso && i === pos.turnoIndex}
                esPrimero={i === 0}
                esUltimo={i === cola.length - 1}
                preparando={combate.estado === "PREPARANDO"}
                pending={pending}
                onAlternar={() => alternar(c.id)}
                onQuitarEstado={(e) => quitarEstadoDeFila(c, e)}
                onAjustarVida={(r) => abrirVida(c, r)}
                ejecutar={ejecutar}
                onAbrirTiradas={setTiradasDe}
              />
            ))}
            {cola.length === 0 && (
              <li className="border border-dashed border-border px-4 py-8 text-center font-mono text-sm text-muted">
                Todavía no hay nadie en la cola.
              </li>
            )}
          </ul>

          <details open={combate.estado === "PREPARANDO" || cola.length === 0} className="mt-4 lg:mx-3 lg:mb-4">
            <summary className={`min-h-11 cursor-pointer py-2 font-display font-semibold uppercase tracking-wide ${FOCO}`}>
              Añadir combatientes
            </summary>
            <div className="grid gap-4 pt-2">
              <ListaAnadir titulo="Jugadores" vacio={characters.length === 0 ? "No hay personajes creados." : "Ya están todos en combate."}>
                {disponibles.map((c) => (
                  <FilaAnadir
                    key={c.id}
                    nombre={c.name}
                    sub={c.owner.name ?? c.owner.email}
                    disabled={pending}
                    onAnadir={() => ejecutar(() => agregarJugadorAction(combate.id, c.id))}
                  />
                ))}
              </ListaAnadir>
              <ListaAnadir
                titulo="NPC"
                vacio={
                  <>
                    No hay NPCs en el catálogo.{" "}
                    <Link href="/master/npcs" className="text-accent hover:underline">
                      Crea el primero
                    </Link>
                    .
                  </>
                }
              >
                {npcs.map((n) => (
                  <FilaAnadir
                    key={n.id}
                    nombre={n.nombre}
                    sub={`${n.poder.toFixed(1)} poder${n.nota ? ` · ${n.nota}` : ""}`}
                    disabled={pending}
                    onAnadir={() => ejecutar(() => agregarNpcDeCatalogoAction(combate.id, n.id))}
                  />
                ))}
              </ListaAnadir>
            </div>
          </details>
        </section>

        {/* Escritorio: panel de mando. En móvil va en la hoja inferior. */}
        <section aria-label="Panel de mando" className="hidden min-w-0 lg:block lg:border-r lg:border-border lg:px-5 lg:pb-5">
          <PanelMando
            objetivos={objetivos}
            acciones={acciones}
            pestana={pestana}
            onPestana={setPestana}
            recursoVida={recursoVida}
            onRecursoVida={setRecursoVida}
            onQuitarObjetivo={quitarObjetivo}
            onAviso={avisar}
          />
        </section>

        <aside
          aria-labelledby="combate-registro"
          className="hidden min-w-0 lg:sticky lg:top-12 lg:block lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto"
        >
          <div className="flex items-center justify-between gap-2 px-4 pb-2.5 pt-3.5">
            <h2 id="combate-registro" className="font-display text-[0.95rem] font-bold uppercase tracking-widest">
              Registro
            </h2>
            <span className="font-mono text-xs text-muted">{vigentes} acciones</span>
          </div>
          <div className="px-3 pb-4">
            <RegistroMando
              entradas={registro}
              generadoEn={generadoEn}
              errores={errores}
              deshaciendo={deshaciendo}
              onDeshacer={deshacer}
            />
          </div>
        </aside>
      </div>

      {/* Móvil: botón flotante, hoja inferior y dock con el contador. */}
      {objetivos.length > 0 && !hoja && (
        <button
          type="button"
          onClick={() => setHoja(true)}
          className={`fixed right-4 z-30 min-h-12 bg-info px-[18px] font-bold text-night shadow-[0_8px_24px_-8px_var(--color-info)] lg:hidden ${
            enCurso ? "bottom-[calc(11.5rem+env(safe-area-inset-bottom))]" : "bottom-6"
          } ${FOCO}`}
        >
          Acciones a {objetivos.length}
        </button>
      )}
      {hoja && (
        <HojaInferior titulo="Acciones" onCerrar={() => setHoja(false)} className="lg:hidden">
          <PanelMando
            objetivos={objetivos}
            acciones={acciones}
            pestana={pestana}
            onPestana={setPestana}
            recursoVida={recursoVida}
            onRecursoVida={setRecursoVida}
            onQuitarObjetivo={quitarObjetivo}
            onAviso={avisar}
            enLinea
            onAplicado={() => setHoja(false)}
          />
        </HojaInferior>
      )}
      {enCurso && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface px-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2.5 lg:hidden">
          <ContadorRondas
            ronda={pos.ronda}
            turnoIndex={pos.turnoIndex}
            cola={enCola}
            variante="dock"
            onSiguiente={siguienteTurno}
            deshabilitado={pasandoTurno || cola.length === 0}
          />
        </div>
      )}

      <Aviso
        aviso={aviso}
        onCerrar={cerrarAviso}
        onDeshacer={deshacer}
        altura={enCurso ? "bottom-[calc(15.5rem+env(safe-area-inset-bottom))]" : "bottom-24"}
      />

      {npcAbierto && npcAbierto.sheet && (
        <NpcAccionesPanel
          nombre={npcAbierto.nombre}
          sheet={npcAbierto.sheet}
          estadosCombate={npcAbierto.estados}
          pgActual={npcAbierto.pgActual}
          pgMax={npcAbierto.pgMax}
          fatigaActual={npcAbierto.fatigaActual}
          fatigaMax={npcAbierto.fatigaMax}
          onCerrar={() => setTiradasDe(null)}
        />
      )}
    </>
  );
}

function Cabecera({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide">{titulo}</h1>
      <span className="flex-1" />
      {children}
    </div>
  );
}

function Resumen({ resumen: r }: { resumen: ResumenCombate }) {
  const datos: [string, string][] = [
    ["Duración", r.duracionMs === null ? "—" : duracionLegible(r.duracionMs)],
    ["Jugadores", String(r.jugadores)],
    ["NPC", String(r.npcs)],
    ["Derrotados", String(r.derrotados)],
    ["Acciones en el registro", formatoNumero(r.acciones)],
  ];
  return (
    <section aria-label="Resumen del último combate" className="grid gap-3 border border-border bg-surface px-5 py-4">
      <div className="flex items-end gap-5">
        <div className="grid">
          <span className="font-mono text-xs tracking-[0.3em] text-accent">COMBATE</span>
          <span className="font-display text-[3rem] font-bold leading-[0.95]">FIN</span>
        </div>
        <div className="grid">
          <small className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Rondas</small>
          <b className="font-display text-3xl tabular-nums">{r.rondas}</b>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
        {datos.map(([k, v]) => (
          <div key={k} className="grid">
            <dt className="font-mono text-xs uppercase tracking-widest text-muted">{k}</dt>
            <dd className="font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted">El siguiente combate empieza en la ronda 1.</p>
    </section>
  );
}

function ListaAnadir({ titulo, vacio, children }: { titulo: string; vacio: ReactNode; children: ReactNode[] }) {
  return (
    <div className="grid min-w-0 gap-2">
      <h3 className="font-mono text-xs uppercase tracking-widest text-muted">{titulo}</h3>
      {children.length > 0 ? (
        <ul className="grid min-w-0 gap-1.5">{children}</ul>
      ) : (
        <p className="border border-dashed border-border px-3 py-4 text-sm text-muted">{vacio}</p>
      )}
    </div>
  );
}

function FilaAnadir({ nombre, sub, disabled, onAnadir }: { nombre: string; sub: string; disabled: boolean; onAnadir: () => void }) {
  return (
    <li className="flex min-w-0 items-center justify-between gap-2 border border-border bg-surface py-1.5 pl-3 pr-1.5">
      <span className="min-w-0">
        <span className="block truncate font-semibold">{nombre}</span>
        <span className="block truncate font-mono text-xs text-muted">{sub}</span>
      </span>
      <Boton disabled={disabled} onClick={onAnadir} className="shrink-0">
        Añadir
      </Boton>
    </li>
  );
}

// Una fila de la cola: la parte de arriba elige objetivo (como en la Mesa); debajo, las
// barras de PG y fatiga (atajo a la pestaña Vida), los estados con su × y, al preparar,
// orden e iniciativa. "Acciones" (tiradas del NPC) siempre.
function FilaCola({
  c,
  elegido,
  esTurno,
  esPrimero,
  esUltimo,
  preparando,
  pending,
  onAlternar,
  onQuitarEstado,
  onAjustarVida,
  ejecutar,
  onAbrirTiradas,
}: {
  c: CombatienteView;
  elegido: boolean;
  esTurno: boolean;
  esPrimero: boolean;
  esUltimo: boolean;
  preparando: boolean;
  pending: boolean;
  onAlternar: () => void;
  onQuitarEstado: (e: EstadoActivoDescrito) => void;
  onAjustarVida: (recurso: RecursoVital) => void;
  ejecutar: (accion: () => Promise<CombateResult>) => void;
  onAbrirTiradas: (c: CombatienteView) => void;
}) {
  const tipo = tipoDe(c);
  const borde = esTurno
    ? "border-accent shadow-[inset_0_0_0_1px_var(--color-accent)]"
    : elegido
      ? "border-info shadow-[inset_3px_0_0_var(--color-info)]"
      : "border-border";
  const control = `grid min-h-11 place-items-center border border-border px-2.5 font-mono text-xs uppercase tracking-wide text-muted transition hover:border-accent hover:text-accent disabled:opacity-40 ${FOCO}`;
  const barra = `grid min-h-11 content-center border border-transparent px-1.5 py-1 text-left transition hover:border-border hover:bg-elevated ${FOCO}`;
  const conControles = preparando || c.sheet !== null;

  return (
    <li className={`relative border bg-surface ${borde} ${c.derrotado ? "opacity-50" : ""}`}>
      {esTurno && (
        <span className="absolute -top-2 right-2.5 bg-accent px-1.5 font-mono text-[0.62rem] tracking-widest text-night">
          TURNO
        </span>
      )}
      <button
        type="button"
        aria-pressed={elegido}
        onClick={onAlternar}
        className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 p-2.5 pb-1.5 text-left ${
          elegido ? "bg-info/5" : ""
        } ${FOCO}`}
      >
        <Iniciales nombre={c.nombre} tono={tipo} className="row-span-2 size-10" />
        <span className="truncate text-[1.02rem] font-bold leading-tight">
          {c.nombre}
          {c.derrotado && " (derrotado)"}
        </span>
        <span
          aria-hidden="true"
          className={`row-span-2 grid size-6 place-items-center border text-sm ${
            elegido ? "border-info bg-info text-night" : "border-border"
          }`}
        >
          {elegido ? "✓" : ""}
        </span>
        <span className="min-w-0 truncate text-sm text-muted">
          {tipo === "npc" ? "NPC" : "Jugador"}
          {c.iniciativa !== null && <span className="font-mono"> · Ini {c.iniciativa}</span>}
        </span>
      </button>

      <div className="grid grid-cols-2 gap-1.5 px-1 pb-1.5">
        <button
          type="button"
          onClick={() => onAjustarVida("vida")}
          aria-label={`PG de ${c.nombre}: ${c.pgActual} de ${c.pgMax}. Ajustar`}
          className={barra}
        >
          <Barra label="PG" actual={c.pgActual} max={c.pgMax} relleno="bg-neon-green" grande />
        </button>
        <button
          type="button"
          onClick={() => onAjustarVida("fatiga")}
          aria-label={`Fatiga de ${c.nombre}: ${c.fatigaActual} de ${c.fatigaMax}. Ajustar`}
          className={barra}
        >
          <Barra label="Fatiga" actual={c.fatigaActual} max={c.fatigaMax} relleno="bg-info" grande />
        </button>
      </div>

      {c.estados.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-2.5 pb-2.5">
          {c.estados.map((e) => (
            <ChipEstado
              key={e.estadoId}
              estado={e}
              onQuitar={() => onQuitarEstado(e)}
              quitarLabel={`Quitar ${e.label} a ${c.nombre}`}
              deshabilitado={pending}
            />
          ))}
        </div>
      )}

      {conControles && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border px-2.5 py-2">
          {preparando && (
            <>
              <button
                type="button"
                disabled={pending || esPrimero}
                onClick={() => ejecutar(() => moverCombatienteAction(c.id, "arriba"))}
                aria-label={`Subir a ${c.nombre}`}
                className={`${control} w-11 px-0`}
              >
                ▲
              </button>
              <button
                type="button"
                disabled={pending || esUltimo}
                onClick={() => ejecutar(() => moverCombatienteAction(c.id, "abajo"))}
                aria-label={`Bajar a ${c.nombre}`}
                className={`${control} w-11 px-0`}
              >
                ▼
              </button>
              <input
                type="number"
                aria-label={`Iniciativa de ${c.nombre}`}
                placeholder="Ini"
                defaultValue={c.iniciativa ?? ""}
                onBlur={(e) => {
                  const valor = e.target.value === "" ? null : Number(e.target.value);
                  if (valor === c.iniciativa) return;
                  ejecutar(() => establecerIniciativaAction(c.id, valor));
                }}
                className={`min-h-11 w-16 border border-border bg-night px-1.5 text-center font-mono text-sm ${FOCO}`}
              />
            </>
          )}
          {/* Solo un NPC trae `sheet` (foto congelada, 5.0): un jugador tira desde su ficha. */}
          {c.sheet && (
            <button
              type="button"
              onClick={() => onAbrirTiradas(c)}
              className={`grid min-h-11 place-items-center border border-info px-2.5 font-mono text-xs uppercase tracking-wide text-info ${FOCO}`}
            >
              Acciones
            </button>
          )}
        </div>
      )}
    </li>
  );
}
