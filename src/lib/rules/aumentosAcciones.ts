// Acciones propias de los aumentos (tandas A4a y A4b de docs/propuesta-aumentos.md,
// docs/sistema.md §11.3): la sección "Aumentos" de la pestaña Acciones, hermana de "Dotes"
// (dotesAcciones.ts). Lo expone resolverFicha (FichaResuelta.accionesAumentos); la UI solo pinta.
//
//   filas         en el orden del catálogo (por pieza y, dentro de ella, como vienen), para
//                 que lo que va junto salga junto (Barrido electromagnético: ampliar a 30 m,
//                 a 60 m y la tirada de buscar):
//                   directa  acción sin dado (AccionDirecta) con su coste de fatiga y su nota:
//                            Acción combinada, Cortar hemorragia y exanguinante, Eliminar
//                            exanguinante, Sacudir miedo, Dominar terror, Mensaje subvocal y
//                            Telemetría, Sanar letal y grave, Ampliar el barrido. Algunas traen
//                            `efecto` (quitar o bajar un estado, +1 de vida), que aplica el
//                            servidor con usoDeAccionAumento.
//                   tirada   Accion (FilaTirada) (A4b): Encontrar o distinguir (barrido),
//                            Incorporar arma (Brazo, con la regla de especialidad de las
//                            acciones de dote) y Tempestad Nanobótica (ataque de daño fijo, con
//                            su fatiga cobrada al tirar: Accion.costeFatiga).
//   directas      las filas directas, para el servidor.
//   informativas  filas sin botón: la defensa del MQE contra la intrusión psiónica, la del
//                 nivel que se tenga (cada nivel sustituye al anterior).
//
// Respeta operacionesActivas (con un requisito roto no hay acción), la opción elegida de la
// operación (Introgresión: el sentido) y los niveles del implante (se acumulan; la misma acción
// en un nivel alto sustituye a la del bajo).
//
// A5a, activables: una directa con efecto "activar" cobra la fatiga y pone el estado propio del
// aumento (reactivar lo sustituye: renueva la duración, no apila). Con el estado puesto sale
// detrás una fila "Desactivar" (sin coste, no devuelve la fatiga); sale aunque ya no se lleve la
// pieza, para poder quitarlo. Lo que hace el estado, en aumentosActivables.ts.
import type { Accion, AccionDirecta } from "./acciones";
import type { AplicadoId } from "./atributos";
import type { HabilidadId } from "./habilidades";
import type { EspecialidadId } from "../catalog/especialidades";
import { aumentoPorId, operacionesActivas } from "./aumentos";
import { acumulaPorClave, nivelesHasta } from "./equipo";
import { duracionDe, estadoActivoCon, textoDuracionActivable, type DuracionEstado, type EstadoActivo } from "./estados";
import type { CondicionTirada } from "./condiciones";
import type { OperacionEstado } from "./vidaPorEstados";
import { ajustarVida, pagarFatiga, topesEnReposo } from "./vitalidad";
import type { Sheet } from "./sheet";
import { esEstadoDeAumento, estadoPorId } from "../catalog/estados";

// Lo que hace la acción además de cobrar:
//   estado  quita el estado (`a: null`) o lo pasa a otro grado, solo si la ficha lo tiene (y en
//           el grado `desde`, si lo trae). Sin él, la acción se cobra igual (usuario, 2026-10-22).
//   vida    suma a la vida actual, sin pasar del máximo en reposo (ajustarVida).
//   activar    (A5a) pone el estado propio del aumento con esa duración; con `eleccion`, el
//              grado es lo elegido en el modal (Neuroprótesis 2: a qué va el +2); sin ella,
//              "activo". Si ya estaba, lo sustituye (renueva la duración).
//   desactivar (A5a) quita el estado propio; no lo trae el catálogo, lo genera la fila.
export type EfectoAccionAumento =
  | { tipo: "estado"; estadoId: string; desde?: string; a: string | null }
  | { tipo: "vida"; delta: number }
  | {
      tipo: "activar";
      estadoId: string;
      duracion: DuracionEstado;
      eleccion?: { etiqueta: string; opciones: { id: string; label: string }[] };
    }
  | { tipo: "desactivar"; estadoId: string };

// El selector del modal de activar (UsarModal): su valor llega al servidor como `eleccion`.
export const ID_ELECCION_ACTIVABLE = "aum_eleccion_activable";

// Acción con dado (A4b). `especialidad`: la regla de las acciones de dote (con ella, en
// especialidad; sin ella, a la mitad). Sin `dificultad`, la pone el máster (el modal abre en
// la de siempre). `ataque`: daño fijo, sin bono por éxitos. `efectos`: lo que el jugador
// aplica a mano en otro sitio (el blindaje del objetivo), tras el daño.
export type TiradaAumentoCatalogo = {
  aplicado: AplicadoId;
  habilidad: HabilidadId;
  especialidad?: EspecialidadId;
  dificultad?: number;
  ataque?: { danio: number; categoria: string };
  efectos?: string[];
};

// En el catálogo (operación, opción de la operación o nivel de implante). `economia`: el tipo
// de acción, en texto (vacío: no se dice). Con `tirada` es una acción con dado: su fatiga se
// cobra al tirar y no lleva `efecto`.
export type AccionAumentoCatalogo = {
  id: string;
  label: string;
  economia: string;
  costeFatiga?: number;
  nota: string;
  efecto?: EfectoAccionAumento;
  tirada?: TiradaAumentoCatalogo;
};

// Defensa del MQE contra la intrusión psiónica, por nivel. Dato sobre un tercero: la app no
// tira por el intruso (§11.3).
export type DefensaIntrusion = { alcance: string; dificultad: number; defensa: string; contragolpe: string };

export type AccionDeAumento = AccionDirecta & { fuente: string; efecto: EfectoAccionAumento | null };
export type InfoDeAumento = { id: string; label: string; fuente: string; lineas: string[] };
export type FilaAumento = { tipo: "directa"; accion: AccionDeAumento } | { tipo: "tirada"; accion: Accion };
export type AccionesDeAumentos = { filas: FilaAumento[]; directas: AccionDeAumento[]; informativas: InfoDeAumento[] };

export const SIN_ACCIONES_DE_AUMENTOS: AccionesDeAumentos = { filas: [], directas: [], informativas: [] };

const NOTA_INTRUSO =
  "El intruso tira cada turno lo que proceda por Resonancia (acción compleja, con concentración) y la dificultad sube 1 por turno. La app no tira por él.";

type Aporte = { fuente: string; acciones: AccionAumentoCatalogo[]; defensa: DefensaIntrusion | null };

function aportes(sheet: Pick<Sheet, "equipo">): Aporte[] {
  const activas = operacionesActivas(sheet);
  return sheet.equipo.flatMap((pieza): Aporte[] => {
    const cat = aumentoPorId(pieza.catalogoId);
    if (!cat) return [];
    if (cat.familia === "operacionGenetica") {
      if (!activas.has(cat.id)) return [];
      // La opción elegida (Introgresión: Percepción Electromagnética trae el barrido).
      const opcion = cat.eleccion?.opciones.find((o) => o.id === pieza.eleccion);
      const acciones = [...(cat.acciones ?? []), ...(opcion?.acciones ?? [])];
      if (acciones.length === 0) return [];
      return [{ fuente: opcion?.acciones ? `${cat.label} (${opcion.label})` : cat.label, acciones, defensa: null }];
    }
    if (pieza.nivel === undefined) return [];
    const niveles = nivelesHasta(cat.niveles, pieza.nivel);
    const acciones = acumulaPorClave(niveles.map((n) => n.acciones ?? []), (a) => a.id);
    const defensa = [...niveles].reverse().find((n) => n.defensaIntrusion)?.defensaIntrusion ?? null;
    if (acciones.length === 0 && !defensa) return [];
    return [{ fuente: `${cat.label} ${pieza.nivel}`, acciones, defensa }];
  });
}

const fatigaTexto = (n: number) => `${n} de fatiga`;

const sinFatiga = (coste: number, fatigaActual: number) =>
  coste > fatigaActual ? { bloqueada: `No te llega la fatiga: cuesta ${coste} y te quedan ${fatigaActual}.` } : {};


function selectorEleccion(e: NonNullable<Extract<EfectoAccionAumento, { tipo: "activar" }>["eleccion"]>): CondicionTirada {
  return {
    id: ID_ELECCION_ACTIVABLE,
    tipo: "opcion",
    etiqueta: e.etiqueta,
    opciones: e.opciones.map((o) => ({ id: o.id, etiqueta: o.label, valor: 0 })),
    porDefecto: e.opciones[0].id,
  };
}

function directa(a: AccionAumentoCatalogo, fuente: string, fatigaActual: number, estados: readonly EstadoActivo[]): AccionDeAumento {
  const coste = a.costeFatiga ?? 0;
  const cabecera = [a.economia, coste > 0 ? fatigaTexto(coste) : "sin coste"].filter(Boolean).join(", ");
  const activar = a.efecto?.tipo === "activar" ? a.efecto : null;
  const puesto = activar ? estados.find((e) => e.estadoId === activar.estadoId) : undefined;
  const yaActiva = puesto ? ` Ya está activa (${textoDuracionActivable(duracionDe(puesto))}): reactivarla renueva la duración, no la apila.` : "";
  return {
    id: a.id,
    label: a.label,
    grupo: "Aumentos",
    nota: `${cabecera}. ${a.nota}${yaActiva} (${fuente})`,
    ...(activar?.eleccion && { condiciones: [selectorEleccion(activar.eleccion)] }),
    ...(activar && { confirmarLabel: puesto ? "Renovar" : "Activar" }),
    ...(coste > 0 && { costeFatiga: coste }),
    ...sinFatiga(coste, fatigaActual),
    fuente,
    efecto: a.efecto ?? null,
  };
}

// La fila de desactivar un estado propio que está puesto.
function desactivar(estado: EstadoActivo): AccionDeAumento {
  const label = estadoPorId(estado.estadoId)?.label ?? estado.estadoId;
  return {
    id: `aumentos_desactivar_${estado.estadoId}`,
    label: `Desactivar ${label}`,
    grupo: "Aumentos",
    nota: `Sin coste. Activa: ${textoDuracionActivable(duracionDe(estado))}. Se quita el estado; la fatiga no se devuelve.`,
    confirmarLabel: "Desactivar",
    fuente: label,
    efecto: { tipo: "desactivar", estadoId: estado.estadoId },
  };
}

function conTirada(a: AccionAumentoCatalogo, t: TiradaAumentoCatalogo, fuente: string, fatigaActual: number): Accion {
  const coste = a.costeFatiga ?? 0;
  const cabecera = [a.economia, coste > 0 ? `${fatigaTexto(coste)} al tirar` : null].filter(Boolean).join(", ");
  return {
    id: a.id,
    label: a.label,
    grupo: "Aumentos",
    aplicado: t.aplicado,
    habilidad: t.habilidad,
    nota: `${cabecera ? `${cabecera}. ` : ""}${a.nota} (${fuente})`,
    ...(t.especialidad && { especialidadesAccion: [t.especialidad] }),
    ...(t.dificultad !== undefined && { dificultadSugerida: t.dificultad }),
    ...(coste > 0 && { costeFatiga: coste }),
    ...sinFatiga(coste, fatigaActual),
    ...(t.ataque && {
      ataque: {
        modos: [{ id: a.id, danio: t.ataque.danio, formulaDanio: null, categoriaDanio: t.ataque.categoria }],
        sinBonoExitos: a.label,
      },
    }),
    ...(t.efectos && { efectos: t.efectos.map((texto) => ({ fuente: a.label, texto })) }),
  };
}

// `estados`: los del personaje, para los activables (A5a): la nota de "ya activa" y las filas de
// desactivar.
export function accionesDeAumentos(
  sheet: Pick<Sheet, "equipo" | "fatigaActual">,
  estados: readonly EstadoActivo[] = [],
): AccionesDeAumentos {
  const filas: FilaAumento[] = [];
  const informativas: InfoDeAumento[] = [];
  for (const ap of aportes(sheet)) {
    for (const a of ap.acciones) {
      filas.push(
        a.tirada
          ? { tipo: "tirada", accion: conTirada(a, a.tirada, ap.fuente, sheet.fatigaActual) }
          : { tipo: "directa", accion: directa(a, ap.fuente, sheet.fatigaActual, estados) },
      );
    }
    if (ap.defensa) {
      const d = ap.defensa;
      informativas.push({
        id: "aumentos_mqe_defensa",
        label: "Defensa contra intrusión psiónica",
        fuente: ap.fuente,
        lineas: [
          `Alcance: ${d.alcance}.`,
          `Dificultad de infiltración: ${d.dificultad} (+1 por turno).`,
          `Defensa: ${d.defensa}`,
          `Contragolpe: ${d.contragolpe}`,
          NOTA_INTRUSO,
        ],
      });
    }
  }
  // Desactivar, detrás de su "Activar" si la pieza sigue; si no, al final.
  for (const e of estados.filter((x) => esEstadoDeAumento(x.estadoId))) {
    const fila: FilaAumento = { tipo: "directa", accion: desactivar(e) };
    const i = filas.findIndex(
      (f) => f.tipo === "directa" && f.accion.efecto?.tipo === "activar" && f.accion.efecto.estadoId === e.estadoId,
    );
    if (i >= 0) filas.splice(i + 1, 0, fila);
    else filas.push(fila);
  }
  const directas = filas.flatMap((f) => (f.tipo === "directa" ? [f.accion] : []));
  return filas.length === 0 && informativas.length === 0 ? SIN_ACCIONES_DE_AUMENTOS : { filas, directas, informativas };
}

// --- Usar una acción (lo aplica el servidor) ---------------------------------

const nombreGrado = (estadoId: string, gradoId: string): string => {
  const e = estadoPorId(estadoId);
  if (!e) return estadoId;
  return e.grados.length > 1 ? (e.grados.find((g) => g.id === gradoId)?.label ?? gradoId) : e.label;
};

// La operación sobre Character.estados que pide el efecto, o null si la ficha no tiene el
// estado (o no en el grado `desde`): entonces no cambia nada. Al bajar de grado se conserva
// la duración que tenía.
export function operacionDeEfecto(efecto: EfectoAccionAumento, estados: readonly EstadoActivo[]): OperacionEstado | null {
  if (efecto.tipo === "desactivar") {
    return estados.some((e) => e.estadoId === efecto.estadoId) ? { tipo: "quitar", estadoId: efecto.estadoId } : null;
  }
  if (efecto.tipo !== "estado") return null;
  const actual = estados.find((e) => e.estadoId === efecto.estadoId);
  if (!actual || (efecto.desde !== undefined && actual.gradoId !== efecto.desde)) return null;
  if (efecto.a === null) return { tipo: "quitar", estadoId: efecto.estadoId };
  return { tipo: "poner", estado: { ...actual, gradoId: efecto.a } };
}

function mensajeEstado(efecto: Extract<EfectoAccionAumento, { tipo: "estado" }>, op: OperacionEstado | null): string {
  const estado = estadoPorId(efecto.estadoId);
  const varios = (estado?.grados.length ?? 1) > 1;
  const desde = nombreGrado(efecto.estadoId, efecto.desde ?? "activo");
  if (!op) return `${varios ? `No estás ${desde}` : `No tienes ${desde}`}: la acción se cobra igual.`;
  if (op.tipo === "quitar") return `Se te quita ${estado?.label ?? efecto.estadoId}${varios ? ` (${desde})` : ""}.`;
  return `Pasas de ${desde} a ${nombreGrado(efecto.estadoId, op.estado.gradoId)}.`;
}

export type UsoAccionAumento =
  | { ok: false; error: string }
  // `sheet`: con la fatiga cobrada y la vida sumada. `op`: lo que hay que hacer en
  // Character.estados (null, nada). `mensaje`: qué ha pasado, para el jugador.
  | { ok: true; accion: AccionDeAumento; sheet: Sheet; op: OperacionEstado | null; mensaje: string };

// Activar (A5a): el grado sale de la elección (obligatoria si la acción la trae).
function usoDeActivar(
  efecto: Extract<EfectoAccionAumento, { tipo: "activar" }>,
  estados: readonly EstadoActivo[],
  eleccion: string | undefined,
): { ok: true; op: OperacionEstado; texto: string } | { ok: false; error: string } {
  let grado = "activo";
  if (efecto.eleccion) {
    const opcion = efecto.eleccion.opciones.find((o) => o.id === eleccion);
    if (!opcion) return { ok: false, error: `Elige: ${efecto.eleccion.etiqueta.toLowerCase()}.` };
    grado = opcion.id;
  }
  const estado = estadoActivoCon(efecto.estadoId, grado, efecto.duracion);
  const nombre = nombreGrado(efecto.estadoId, grado);
  const renueva = estados.some((e) => e.estadoId === efecto.estadoId);
  const label = estadoPorId(efecto.estadoId)?.label ?? efecto.estadoId;
  const cual = nombre === label ? label : `${label} (${nombre})`;
  return {
    ok: true,
    op: { tipo: "poner", estado },
    texto: `${cual} ${renueva ? "renovada" : "activa"}: ${textoDuracionActivable(efecto.duracion)}.`,
  };
}

// Valida contra la ficha que la acción existe (pieza equipada, requisito sano, nivel) y que
// llega la fatiga, y devuelve lo que hay que escribir. `eleccion`: lo elegido en el modal de
// activar (Neuroprótesis 2).
export function usoDeAccionAumento(
  sheet: Sheet,
  estados: readonly EstadoActivo[],
  accionId: string,
  eleccion?: string,
): UsoAccionAumento {
  const accion = accionesDeAumentos(sheet, estados).directas.find((a) => a.id === accionId);
  if (!accion) return { ok: false, error: "No tienes esa acción (falta el aumento o tiene un requisito roto)." };
  if (accion.bloqueada) return { ok: false, error: accion.bloqueada };
  const pagado = pagarFatiga(sheet, accion.costeFatiga ?? 0, false);
  const efecto = accion.efecto;
  const coste = accion.costeFatiga ? `−${accion.costeFatiga} de fatiga.` : null;
  if (efecto?.tipo === "activar") {
    const r = usoDeActivar(efecto, estados, eleccion);
    if (!r.ok) return r;
    return { ok: true, accion, sheet: pagado, op: r.op, mensaje: [coste, r.texto].filter(Boolean).join(" ") };
  }
  if (efecto?.tipo === "desactivar") {
    const op = operacionDeEfecto(efecto, estados);
    return { ok: true, accion, sheet: pagado, op, mensaje: op ? `Desactivada: ${accion.fuente}.` : "Ya no estaba activa." };
  }
  if (efecto?.tipo === "vida") {
    const curado = ajustarVida(pagado, efecto.delta);
    const max = topesEnReposo(curado).vida;
    const texto =
      curado.vidaActual === pagado.vidaActual
        ? "Ya estabas al máximo de vida."
        : `+${curado.vidaActual - pagado.vidaActual} de vida (${curado.vidaActual}/${max}).`;
    return { ok: true, accion, sheet: curado, op: null, mensaje: [coste, texto].filter(Boolean).join(" ") };
  }
  const op = efecto ? operacionDeEfecto(efecto, estados) : null;
  const texto = efecto ? mensajeEstado(efecto, op) : null;
  return { ok: true, accion, sheet: pagado, op, mensaje: [coste, texto].filter(Boolean).join(" ") || "Hecho." };
}
