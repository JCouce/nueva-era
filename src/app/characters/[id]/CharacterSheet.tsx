"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  setAtributoAction,
  setHabilidadAction,
  setDisciplinaAction,
  addEspecialidadAction,
  removeEspecialidadAction,
  descartarAvisoEspecialidadesAction,
  saveIdentityAction,
  setEspecieAction,
  setAtributoLibreAction,
  resetBuildAction,
  equiparAction,
  comprarAumentoAction,
  desequiparAction,
  fijarArmaIncorporadaAction,
  setPrioridadAction,
  ajustarRecursoAction,
  comprarRecargaAction,
  ajustarMaterialAction,
  comprarMaterialAction,
  repararAction,
  fabricarAction,
  convertirArmaAction,
  ajustarGranadaAction,
  comprarGranadaAction,
  comprarMunicionEspecialAction,
  ajustarMunicionEspecialAction,
  ajustarFarmacoAction,
  comprarFarmacoAction,
  ajustarVidaAction,
  ajustarDanioAction,
  ajustarFatigaAction,
  devolverFatigaAction,
  pagarFatigaAction,
  ajustarFatigaTemporalAction,
  terminarEscenaAction,
  gastarUsosEscenaAction,
  liberarUsoEscenaAction,
  usarAccionAumentoAction,
  comprarDoteAction,
  quitarDoteAction,
  marcarFavoritaAction,
  type SaveResult,
} from "./actions";
import {
  setAtributoValue,
  setHabilidadValue,
  setDisciplinaValue,
  addEspecialidad,
  removeEspecialidad,
  descartarAvisoEspecialidades,
  puntosAtributosDisponibles,
  puntosHabilidadesDisponibles,
  equipar,
  convertirArma,
  type ModificacionArmaId,
  type OpcionesFabricar,
  retirarPieza,
  fijarArmaIncorporada,
  setPrioridad,
  ajustarRecurso,
  ajustarMaterial,
  ajustarGranada,
  ajustarMunicionEspecial,
  ajustarFarmaco,
  ajustarVida,
  ajustarDanioCategoria,
  type CategoriaDanio,
  ajustarFatiga,
  pagarFatiga,
  ajustarFatigaTemporal,
  terminarEscena,
  gastarUsosEscena,
  liberarUsoEscena,
  RECURSOS_POR_LETRA,
  describirEstadosActivos,
  fichaSoloLectura,
  type EstadoFicha,
  type AtributoId,
  type HabilidadId,
  type DisciplinaId,
  type PiezaEquipada,
  type CompraAumento,
  type CategoriaPrioridad,
  type LetraPrioridad,
  type MaterialTier,
  type EleccionEspecie,
  type VitalidadActual,
  VITALIDAD_DE_FICHA,
  comprarDote,
  quitarDote,
  marcarFavorita,
  type DoteComprada,
  type EstadoActivo,
} from "@/lib/rules";
import type { ExtraAccionAumento, Sheet } from "@/lib/rules";
import { PersonajeTab, PanelFieldset } from "./_components/personaje/PersonajeTab";
import { AvisoEnRevision } from "./_components/RevisionFicha";
import { EstadoFichaChip } from "@/components/EstadoFichaChip";
import { ChipEstado } from "@/components/ChipEstado";
import { AtributosTab } from "./_components/AtributosTab";
import { HabilidadesTab } from "./_components/HabilidadesTab";
import { DotesTab } from "./_components/DotesTab";
import { PsionicaTab } from "./_components/PsionicaTab";
import { AccionesTab } from "./_components/AccionesTab";
import { TiendaTab } from "./_components/TiendaTab";
import { EquipoTab } from "./_components/EquipoTab";
import { RecursosTab } from "./_components/RecursosTab";
import { CombateTab, type CombateView } from "./_components/CombateTab";
import type { Lanzamiento } from "@/components/ResultadoTirada";

// Único sitio para tocar el delay de autosave — lo usan tanto identidad como
// el debounce por campo de atributos/habilidades (y, cuando existan, dotes/
// poderes: mismo helper, otra clave).
const AUTOSAVE_DEBOUNCE_MS = 500;
import { usePollingCombate } from "@/hooks/usePollingCombate";
import { useFichaResuelta } from "@/hooks/useFichaResuelta";

// Tres grupos, no una lista plana: la ficha en sí (fila 1), lo que el
// personaje hace o lleva (fila 2, izquierda) y el catálogo — que no es del
// personaje, es la dirección del juego consultando o repartiendo equipo —
// separado a la derecha en esa misma fila.
const TABS_FICHA = [
  { id: "personaje", label: "Personaje" },
  { id: "attrs", label: "Atributos" },
  { id: "skills", label: "Habilidades" },
  { id: "dotes", label: "Dotes" },
  { id: "psionica", label: "Psiónica" },
] as const;
const TABS_PERSONAJE = [
  { id: "acciones", label: "Acciones" },
  { id: "equipo", label: "Equipo" },
  { id: "recursos", label: "Recursos" },
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
  esDueno,
  submittedAt,
  reviewNote,
  dotesDeLaFoto,
  estados,
  vidaGuardada,
  combate,
}: {
  characterId: string;
  initialName: string;
  initialSheet: Sheet;
  characterStatus: EstadoFicha;
  initialXp: number;
  initialCreditos: number;
  esMaster: boolean;
  // Envío a revisión: el máster dueño de una ficha la envía y la retira como un jugador.
  esDueno: boolean;
  submittedAt: string | null;
  reviewNote: string | null;
  // Dotes de la foto de aprobación (null sin foto): solo para explicar por qué no se
  // puede quitar una dote en ficha aprobada. El servidor la relee de la base.
  dotesDeLaFoto: DoteComprada[] | null;
  // Los que le ha puesto el máster (Character.estados), dentro o fuera de combate. Prop
  // aparte y no en `sheet`, que vive en useState: así los trae frescos el polling.
  estados: EstadoActivo[];
  // vidaActual/fatigaActual tal como están en la base, frescas en cada refresco: el
  // máster las baja al poner un estado (S75) sin pasar por esta pantalla.
  vidaGuardada: { vida: number; fatiga: number };
  // null si no hay Combate EN_CURSO, o si lo hay pero este personaje no
  // tiene fila dentro (fase 6b bloque 3) — en los dos casos, nada de
  // combate se enseña en la ficha.
  combate: CombateView | null;
}) {
  const aprobada = characterStatus === "APPROVED";
  // En revisión, el jugador solo lee (el máster puede editar): la regla, en revision.ts.
  const soloLectura = fichaSoloLectura({ estado: characterStatus, esMaster });
  const [active, setActive] = useState<TabId>("personaje");
  const [sheet, setSheet] = useState<Sheet>(initialSheet);
  const [name, setName] = useState(initialName);
  const [xp, setXp] = useState(initialXp);
  const [creditos, setCreditos] = useState(initialCreditos);
  // Si la vida/fatiga de la base cambió desde la última vez que se vio, se copian a
  // `sheet` solo esos dos campos, sin pisar lo demás que se esté editando. Ajuste
  // durante el render al cambiar una prop (patrón de React), no un efecto. Un -1 del
  // propio jugador también llega por aquí, con el valor que ya tenía en pantalla.
  const [vidaVista, setVidaVista] = useState(vidaGuardada);
  if (vidaVista.vida !== vidaGuardada.vida || vidaVista.fatiga !== vidaGuardada.fatiga) {
    setVidaVista(vidaGuardada);
    setSheet((s) => ({ ...s, vidaActual: vidaGuardada.vida, fatigaActual: vidaGuardada.fatiga }));
  }
  const [status, setStatus] = useState<SaveStatus>("idle");
  // Último rechazo del servidor en Dotes, con su motivo (la pantalla ya filtra con
  // las mismas reglas, así que solo salta si la ficha cambió por otro lado).
  const [errorDotes, setErrorDotes] = useState<string | null>(null);
  // Historial de tiradas y memoria de dificultad/circunstancial por tirada:
  // vive aquí, no dentro de AccionesTab, para que sobreviva a cambiar de tab
  // (antes se perdía porque AccionesTab se desmonta entero al cambiar de tab
  // — ver el `{activeEfectivo === "acciones" && (...)}` de abajo). Dura lo que
  // dure esta pestaña del navegador abierta — sin persistir a servidor ni a
  // almacenamiento del navegador a propósito: es un log de cortesía de las
  // últimas tiradas, no un dato mecánico como PG/fatiga (2026-09-24, pedido
  // del usuario — "si cierras es nueva sesión").
  const [accionesHistorial, setAccionesHistorial] = useState<Lanzamiento[]>([]);
  const [accionesMemoria, setAccionesMemoria] = useState<
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
  // en cada render, que son `combate` y `estados`, y la vida/fatiga de
  // `vidaGuardada`, que se copia a `sheet` (arriba).
  usePollingCombate(true, combate !== null ? 4000 : 15000);

  // Derivado durante el render, no sincronizado en un efecto (ver "you
  // might not need an effect" de React): si `combate` desaparece entre una
  // carga y otra de esta página (el combate terminó) con `active` todavía
  // en "combate", cae a "personaje" en vez de dejar la ficha en blanco — el
  // switch de abajo no renderiza nada para "combate" sin `combate`.
  const activeEfectivo: TabId = active === "combate" && !combate ? "personaje" : active;

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
    (fn: () => Promise<SaveResult>, onOk?: (s: Sheet) => void, onError?: (error: string) => void) => {
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
            } else {
              onError?.(res.error);
              setStatus("error");
            }
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
  // inmediato.
  //
  // Bug de producción arreglado 2026-09-24 (reportado por el usuario, "no se
  // siente instantáneo"): reconciliar con `setSheet(res.sheet)` a secas
  // reemplaza el SHEET ENTERO con la foto que tenía el servidor al procesar
  // ESE campo — si mientras tanto (500ms de debounce + latencia real de
  // producción) el jugador tocó OTRO atributo/habilidad, su cambio optimista
  // ya en pantalla se pisaba con esa foto vieja hasta que le llegara su
  // propia reconciliación. En local, con latencia casi cero, la ventana para
  // que esto pasara era minúscula; en producción, no. Arreglo: fusionar solo
  // el campo que se acaba de guardar, no el sheet entero — y solo hace falta
  // hacerlo en absoluto si `aprobada` (en creación cliente y servidor
  // calculan idéntico, reconciliar no aporta nada y solo abre la ventana de
  // la carrera). ──
  const commitAtributo = (id: AtributoId, value: number) => {
    setSheet((s) => setAtributoValue(s, id, value));
    scheduleCommit(
      `atributo:${id}`,
      () => setAtributoAction(characterId, id, value),
      aprobada
        ? (servidor) => setSheet((actual) => ({ ...actual, atributos: { ...actual.atributos, [id]: servidor.atributos[id] } }))
        : undefined,
    );
  };
  const commitHabilidad = (id: HabilidadId, value: number) => {
    setSheet((s) => setHabilidadValue(s, id, value, ficha.ajusteCoste));
    scheduleCommit(
      `habilidad:${id}`,
      () => setHabilidadAction(characterId, id, value),
      aprobada
        ? (servidor) => setSheet((actual) => ({ ...actual, habilidades: { ...actual.habilidades, [id]: servidor.habilidades[id] } }))
        : undefined,
    );
  };
  const commitDisciplina = (id: DisciplinaId, value: number) => {
    setSheet((s) => setDisciplinaValue(s, id, value, ficha.ajusteCoste, ficha.psionica.bonos));
    scheduleCommit(
      `disciplina:${id}`,
      () => setDisciplinaAction(characterId, id, value),
      aprobada
        ? (servidor) => setSheet((actual) => ({ ...actual, psionica: servidor.psionica }))
        : undefined,
    );
  };
  // Dotes: optimista con las mismas funciones que el servidor y reconciliando solo
  // `dotes` (no el sheet entero, ver el bug de 2026-09-24 arriba). La XP la trae
  // runSave. Si el servidor rechaza, se deshace lo optimista y se enseña su motivo.
  const commitComprarDote = (entrada: DoteComprada) => {
    const res = comprarDote(sheet, entrada, { valores: ficha.requisitosDotes, aprobada, xp });
    if (!res.ok) {
      setErrorDotes(res.error);
      return;
    }
    setErrorDotes(null);
    const antes = sheet.dotes;
    setSheet((s) => ({ ...s, dotes: res.sheet.dotes }));
    runSave(
      () => comprarDoteAction(characterId, entrada),
      (servidor) => setSheet((actual) => ({ ...actual, dotes: servidor.dotes })),
      (error) => {
        setErrorDotes(error);
        setSheet((actual) => ({ ...actual, dotes: antes }));
      },
    );
  };
  const commitQuitarDote = (entrada: DoteComprada) => {
    const res = quitarDote(sheet, entrada, { aprobada, foto: dotesDeLaFoto });
    if (!res.ok) {
      setErrorDotes(res.error);
      return;
    }
    setErrorDotes(null);
    const antes = sheet.dotes;
    setSheet((s) => ({ ...s, dotes: res.sheet.dotes }));
    runSave(
      () => quitarDoteAction(characterId, entrada),
      (servidor) => setSheet((actual) => ({ ...actual, dotes: servidor.dotes })),
      (error) => {
        setErrorDotes(error);
        setSheet((actual) => ({ ...actual, dotes: antes }));
      },
    );
  };
  const commitAddEspecialidad = (id: HabilidadId, especialidad: string) => {
    setSheet((s) => addEspecialidad(s, id, especialidad, ficha.ajusteCoste));
    runSave(() => addEspecialidadAction(characterId, id, especialidad));
  };
  const commitRemoveEspecialidad = (id: HabilidadId, especialidad: string) => {
    setSheet((s) => removeEspecialidad(s, id, especialidad));
    runSave(() => removeEspecialidadAction(characterId, id, especialidad));
  };
  const commitDescartarAviso = () => {
    setSheet((s) => descartarAvisoEspecialidades(s));
    runSave(() => descartarAvisoEspecialidadesAction(characterId));
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
    setSheet((s) => retirarPieza(s, instanciaId, estados));
    runSave(() => desequiparAction(characterId, instanciaId), setSheet);
  };
  // Armas Modificadas (S87): el precio (la diferencia) y el tope de rareza los vuelve a
  // comprobar el servidor; aquí solo se adelanta la pieza convertida.
  const commitConvertirArma = (instanciaId: string, modificaciones: ModificacionArmaId[]) => {
    setSheet((s) => convertirArma(s, instanciaId, modificaciones));
    runSave(() => convertirArmaAction(characterId, { instanciaId, modificaciones }), setSheet);
  };
  const commitArmaIncorporada = (brazoInstanciaId: string, armaInstanciaId: string | null) => {
    setSheet((s) => {
      const res = fijarArmaIncorporada(s, brazoInstanciaId, armaInstanciaId);
      return res.ok ? res.sheet : s;
    });
    runSave(() => fijarArmaIncorporadaAction(characterId, { brazoInstanciaId, armaInstanciaId }), setSheet);
  };
  const commitAjustarRecurso = (instanciaId: string, delta: number) => {
    setSheet((s) => ajustarRecurso(s, instanciaId, delta));
    runSave(() => ajustarRecursoAction(characterId, instanciaId, delta), setSheet);
  };
  const commitRecargar = (instanciaId: string) => {
    runSave(() => comprarRecargaAction(characterId, instanciaId), setSheet);
  };
  const commitAjustarMaterial = (tier: MaterialTier, delta: number) => {
    setSheet((s) => ajustarMaterial(s, tier, delta));
    runSave(() => ajustarMaterialAction(characterId, tier, delta), setSheet);
  };
  const commitComprarMaterial = (tier: MaterialTier) => {
    runSave(() => comprarMaterialAction(characterId, tier), setSheet);
  };
  const commitAjustarGranada = (catalogoId: string, delta: number) => {
    setSheet((s) => ajustarGranada(s, catalogoId, delta));
    runSave(() => ajustarGranadaAction(characterId, catalogoId, delta), setSheet);
  };
  const commitAjustarFarmaco = (catalogoId: string, delta: number) => {
    setSheet((s) => ajustarFarmaco(s, catalogoId, delta));
    runSave(() => ajustarFarmacoAction(characterId, catalogoId, delta), setSheet);
  };
  const commitAjustarVida = (delta: number) => {
    setSheet((s) => ajustarVida(s, delta, estados));
    runSave(() => ajustarVidaAction(characterId, delta), setSheet);
  };
  const commitAjustarDanio = (categoria: CategoriaDanio, delta: number) => {
    setSheet((s) => ajustarDanioCategoria(s, categoria, delta, estados));
    runSave(() => ajustarDanioAction(characterId, categoria, delta), setSheet);
  };
  const commitAjustarFatiga = (delta: number) => {
    setSheet((s) => ajustarFatiga(s, delta, estados));
    runSave(() => ajustarFatigaAction(characterId, delta), setSheet);
  };
  // Densificar desmarcado (A4b): devuelve lo que cobró pagarFatigaAction, también a la foto
  // del combate (A5b).
  const commitDevolverFatiga = (delta: number) => {
    if (delta <= 0) return;
    setSheet((s) => ajustarFatiga(s, delta, estados));
    runSave(() => devolverFatigaAction(characterId, delta), setSheet);
  };
  const commitPagarFatiga = (coste: number, permiteTemporal: boolean) => {
    setSheet((s) => pagarFatiga(s, coste, permiteTemporal));
    runSave(() => pagarFatigaAction(characterId, coste, permiteTemporal), setSheet);
  };
  const commitAjustarFatigaTemporal = (delta: number) => {
    setSheet((s) => ajustarFatigaTemporal(s, delta));
    runSave(() => ajustarFatigaTemporalAction(characterId, delta), setSheet);
  };
  const commitTerminarEscena = () => {
    setSheet((s) => terminarEscena(s));
    runSave(() => terminarEscenaAction(characterId), setSheet);
  };
  // Usos "una vez por escena" (A4a): se gastan al tirar y se liberan a mano en Recursos.
  const commitGastarUsosEscena = (ids: string[]) => {
    setSheet((s) => gastarUsosEscena(s, ids));
    runSave(() => gastarUsosEscenaAction(characterId, ids), setSheet);
  };
  const commitLiberarUsoEscena = (id: string) => {
    setSheet((s) => liberarUsoEscena(s, id));
    runSave(() => liberarUsoEscenaAction(characterId, id), setSheet);
  };
  // Favoritas (T-006): la estrella cambia ya; si el guardado falla (también sin red, que rechaza
  // la promesa) se deshace solo ese id. En éxito no se toca la ficha: otra estrella pulsada
  // mientras tanto no parpadea.
  const commitMarcarFavorita = (id: string, marcada: boolean) => {
    setSheet((s) => marcarFavorita(s, id, marcada));
    runSave(
      () => marcarFavoritaAction(characterId, { id, marcada }).catch(() => ({ ok: false as const, error: "Sin conexión" })),
      undefined,
      () => setSheet((s) => marcarFavorita(s, id, !marcada)),
    );
  };
  // Acciones de aumento (A4a): sin estado optimista, las cobra y aplica el servidor (también
  // quitar un estado, que llega por la revalidación de la página).
  // Activables (A5a): `extra.eleccion` es lo elegido en el modal de activar (Neuroprótesis 2);
  // `extra.repetida`, la casilla "ya usada" de la acción adicional (A5b).
  const commitUsarAccionAumento = (accionId: string, onMensaje: (m: string) => void, extra?: ExtraAccionAumento) => {
    runSave(
      async () => {
        const res = await usarAccionAumentoAction(characterId, accionId, extra);
        onMensaje(res.ok ? (res.mensaje ?? "Hecho.") : res.error);
        return res;
      },
      setSheet,
    );
  };
  const commitComprarGranada = (catalogoId: string) => {
    runSave(() => comprarGranadaAction(characterId, catalogoId), setSheet);
  };
  const commitComprarFarmaco = (catalogoId: string) => {
    runSave(() => comprarFarmacoAction(characterId, catalogoId), setSheet);
  };
  // Sin optimista: requisitos, precio y bolsa los decide el servidor (comprarAumento).
  const commitComprarAumento = (compra: CompraAumento) => {
    runSave(() => comprarAumentoAction(characterId, compra), setSheet);
  };
  const commitComprarMunicionEspecial = (municionId: string) => {
    runSave(() => comprarMunicionEspecialAction(characterId, municionId), setSheet);
  };
  const commitAjustarMunicionEspecial = (municionId: string, delta: number) => {
    setSheet((s) => ajustarMunicionEspecial(s, municionId, delta));
    runSave(() => ajustarMunicionEspecialAction(characterId, municionId, delta), setSheet);
  };
  // Sin actualización optimista: la rareza suficiente y el stock se validan
  // en el servidor (mismo criterio que commitComprarMaterial/commitRecargar).
  // exito: mismo criterio que commitFabricar, ver el comentario de repararAction.
  const commitReparar = (instanciaId: string, tier: MaterialTier, exito: boolean) => {
    runSave(() => repararAction(characterId, instanciaId, tier, exito), setSheet);
  };
  // exito llega ya resuelto por el cliente: la tirada de Fabricar (dado +
  // dificultad) se juega en AccionModal, dentro de FabricarSeccion, antes de
  // llamar aquí — ver el comentario de fabricarAction.
  const commitFabricar = (catalogoId: string, tier: MaterialTier, exito: boolean, opciones?: OpcionesFabricar) => {
    runSave(() => fabricarAction(characterId, catalogoId, tier, exito, opciones), setSheet);
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
  // Sin estado optimista: el reset de §14.3 lo aplica el servidor (elegirEspecie no
  // se usa en pantalla). Se reconcilia con la ficha y los créditos que devuelve.
  const onEspecie = (eleccion: EleccionEspecie) => {
    runSave(() => setEspecieAction(characterId, eleccion), setSheet);
  };
  const onAtributoLibre = (id: AtributoId) => {
    runSave(() => setAtributoLibreAction(characterId, id), setSheet);
  };
  const onTrasfondo = (v: string) => {
    setSheet((s) => ({ ...s, trasfondo: v }));
    scheduleIdentity();
  };
  const onMotivacion = (v: string) => {
    setSheet((s) => ({ ...s, motivacion: v }));
    scheduleIdentity();
  };


  // Fase 6b bloque 3: mi fila en el combate activo, si la hay. `combate` ya
  // viene null desde el servidor si este personaje no está metido dentro
  // (page.tsx) — esto solo busca cuál de las filas es la mía para resaltar
  // turno/estados en la tira compacta.
  const miCombatiente = combate?.combatientes.find((c) => c.characterId === characterId) ?? null;
  // La ficha resuelta una vez (propuesta-especies §3.1) y la misma para todas las
  // pestañas: con los estados dentro, Personaje y Acciones ven los mismos números. Los
  // estados, siempre los de la ficha: en combate no se suman los de mi fila
  // (estadosDeCombatiente ya me los da iguales en `combate`).
  // Umbrales de §7: en combate, con la vida/fatiga de mi fila (la foto del combate);
  // fuera, con la de la ficha.
  const vitalidad = useMemo<VitalidadActual>(
    () =>
      miCombatiente
        ? {
            origen: "combate",
            pgActual: miCombatiente.pgActual,
            pgMax: miCombatiente.pgMax,
            fatigaActual: miCombatiente.fatigaActual,
            fatigaMax: miCombatiente.fatigaMax,
          }
        : VITALIDAD_DE_FICHA,
    [miCombatiente],
  );
  const ficha = useFichaResuelta(sheet, estados, vitalidad, { aprobada });
  const puntosAttr = puntosAtributosDisponibles(sheet);
  // Con el ajuste de coste de la especie (§14.6), el mismo que aplica el servidor.
  const puntosSkill = puntosHabilidadesDisponibles(sheet, ficha.ajusteCoste);
  const { vida, fatiga } = ficha.salud;
  const esMiTurno = !!(miCombatiente && combate!.combatientes[combate!.turnoIndex]?.id === miCombatiente.id);
  const misEstadosActivos = miCombatiente ? describirEstadosActivos(estados, ficha.inmunidades) : [];

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
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide">
          {name || "Sin nombre"}
        </h1>
        <EstadoFichaChip estado={characterStatus} />
      </div>

      {/* HUD fino: estado de solo lectura (la edición está en cada tab) */}
      <div className="flex items-center gap-3 border-y border-border py-2 font-mono text-sm">
        <span className="uppercase tracking-wide text-muted">
          {ficha.especie
            ? [ficha.especie.especie, ficha.especie.casta, ficha.especie.linaje]
                .flatMap((o) => (o ? [o.label] : []))
                .join(" · ")
            : "sin especie"}
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
            <div className="flex flex-col gap-1.5 border-t border-border pt-1.5">
              {misEstadosActivos.map((a) => (
                <div key={a.estadoId} className="flex flex-col items-start gap-0.5">
                  <ChipEstado estado={a} />
                  {/* Detalle visible de verdad, no en un `title` — mismo
                      arreglo que CombateConsole.tsx. */}
                  {a.detalle.length > 0 && (
                    <p className="text-prosa-sm normal-case tracking-normal text-soft">
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

      {characterStatus === "IN_REVIEW" && esDueno && (
        <AvisoEnRevision characterId={characterId} submittedAt={submittedAt} puedeRetirar={esDueno} />
      )}

      {activeEfectivo === "personaje" && (
        <PersonajeTab
          name={name}
          ficha={ficha}
          aprobada={aprobada}
          esMaster={esMaster}
          creditos={creditos}
          onName={onName}
          onEdad={onEdad}
          onAltura={onAltura}
          onPeso={onPeso}
          onEspecie={onEspecie}
          onAtributoLibre={onAtributoLibre}
          onTrasfondo={onTrasfondo}
          onMotivacion={onMotivacion}
          onPrioridad={commitPrioridad}
          soloLectura={soloLectura}
          envio={
            esDueno && characterStatus === "DRAFT"
              ? { characterId, reviewNote, esperarGuardados: () => queue.current }
              : null
          }
        />
      )}
      {/* Acciones lleva su propio fieldset (su barra Básicas/Tiradas sigue navegable). */}
      {activeEfectivo === "acciones" && (
        <AccionesTab
          ficha={ficha}
          historial={accionesHistorial}
          setHistorial={setAccionesHistorial}
          memoria={accionesMemoria}
          setMemoria={setAccionesMemoria}
          onReparar={commitReparar}
          onFabricar={commitFabricar}
          onGastarRecurso={commitAjustarRecurso}
          onDaniarEscudo={commitAjustarRecurso}
          onAjustarFarmaco={commitAjustarFarmaco}
          onAjustarMunicionEspecial={commitAjustarMunicionEspecial}
          onPagarFatiga={commitPagarFatiga}
          onAjustarFatiga={commitDevolverFatiga}
          onAjustarVida={commitAjustarVida}
          onAjustarDanio={commitAjustarDanio}
          onGastarUsosEscena={commitGastarUsosEscena}
          onUsarAccionAumento={commitUsarAccionAumento}
          onMarcarFavorita={commitMarcarFavorita}
          soloLectura={soloLectura}
        />
      )}
      {/* Personaje lleva su propio fieldset (sus sub-pestañas siguen navegables). */}
      {activeEfectivo !== "personaje" && activeEfectivo !== "acciones" && (
        <PanelFieldset disabled={soloLectura}>
          {activeEfectivo === "attrs" && (
            <AtributosTab
              ficha={ficha}
              puntosDisponibles={puntosAttr}
              aprobada={aprobada}
              xp={xp}
              onSet={commitAtributo}
            />
          )}
          {activeEfectivo === "skills" && (
            <HabilidadesTab
              ficha={ficha}
              puntosDisponibles={puntosSkill}
              aprobada={aprobada}
              xp={xp}
              onSet={commitHabilidad}
              onAddEspecialidad={commitAddEspecialidad}
              onRemoveEspecialidad={commitRemoveEspecialidad}
              onDescartarAviso={commitDescartarAviso}
            />
          )}
          {activeEfectivo === "dotes" && (
            <DotesTab
              ficha={ficha}
              aprobada={aprobada}
              xp={xp}
              foto={dotesDeLaFoto}
              error={errorDotes}
              onComprar={commitComprarDote}
              onQuitar={commitQuitarDote}
            />
          )}
          {activeEfectivo === "psionica" && (
            <PsionicaTab ficha={ficha} aprobada={aprobada} xp={xp} onSet={commitDisciplina} />
          )}
          {activeEfectivo === "tienda" && (
            <TiendaTab
              sheet={sheet}
              creditos={creditos}
              topeRareza={topeRareza}
              bolsaAumentos={ficha.bolsaAumentos}
              excepcionRareza={{ estado: characterStatus, esMaster, excepciones: ficha.excepcionesRareza }}
              onEquipar={commitEquipar}
              onComprarGranada={commitComprarGranada}
              onComprarFarmaco={commitComprarFarmaco}
              onRecargar={commitRecargar}
              onComprarMunicionEspecial={commitComprarMunicionEspecial}
              onComprarAumento={commitComprarAumento}
            />
          )}
          {activeEfectivo === "equipo" && (
            <EquipoTab
              sheet={sheet}
              creditos={creditos}
              onDesequipar={commitDesequipar}
              onArmaIncorporada={commitArmaIncorporada}
              onConvertirArma={commitConvertirArma}
              topeRareza={topeRareza}
            />
          )}
          {activeEfectivo === "recursos" && (
            <RecursosTab
              ficha={ficha}
              creditos={creditos}
              onAjustar={commitAjustarRecurso}
              onRecargar={commitRecargar}
              onAjustarMaterial={commitAjustarMaterial}
              onComprarMaterial={commitComprarMaterial}
              onAjustarGranada={commitAjustarGranada}
              onAjustarFarmaco={commitAjustarFarmaco}
              onAjustarMunicionEspecial={commitAjustarMunicionEspecial}
              onComprarMunicionEspecial={commitComprarMunicionEspecial}
              onAjustarVida={commitAjustarVida}
              onAjustarDanio={commitAjustarDanio}
              onAjustarFatiga={commitAjustarFatiga}
              onAjustarFatigaTemporal={commitAjustarFatigaTemporal}
              onTerminarEscena={commitTerminarEscena}
              onLiberarUsoEscena={commitLiberarUsoEscena}
            />
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
        </PanelFieldset>
      )}
    </div>
  );
}
