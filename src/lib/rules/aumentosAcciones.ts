// Acciones propias de los aumentos (tanda A4a de docs/propuesta-aumentos.md, docs/sistema.md
// §11.3): la sección "Aumentos" de la pestaña Acciones, hermana de "Dotes"
// (dotesAcciones.ts). Lo expone resolverFicha (FichaResuelta.accionesAumentos); la UI solo pinta.
//
//   directas      acciones sin dado (AccionDirecta) con su coste de fatiga y su nota:
//                 Acción combinada, Cortar hemorragia y exanguinante, Eliminar exanguinante,
//                 Sacudir miedo, Dominar terror, Mensaje subvocal y Telemetría, Sanar letal y
//                 Sanar grave. Algunas traen `efecto` (quitar o bajar un estado, +1 de vida),
//                 que aplica el servidor con usoDeAccionAumento.
//   informativas  filas sin botón: la defensa del MQE contra la intrusión psiónica, la del
//                 nivel que se tenga (cada nivel sustituye al anterior).
//
// Respeta operacionesActivas (con un requisito roto no hay acción) y los niveles del implante
// (se acumulan; la misma acción en un nivel alto sustituye a la del bajo).
import type { AccionDirecta } from "./acciones";
import { aumentoPorId, operacionesActivas } from "./aumentos";
import { acumulaPorClave, nivelesHasta } from "./equipo";
import type { EstadoActivo } from "./estados";
import type { OperacionEstado } from "./vidaPorEstados";
import { ajustarVida, pagarFatiga, topesEnReposo } from "./vitalidad";
import type { Sheet } from "./sheet";
import { estadoPorId } from "../catalog/estados";

// Lo que hace la acción además de cobrar:
//   estado  quita el estado (`a: null`) o lo pasa a otro grado, solo si la ficha lo tiene (y en
//           el grado `desde`, si lo trae). Sin él, la acción se cobra igual (usuario, 2026-10-22).
//   vida    suma a la vida actual, sin pasar del máximo en reposo (ajustarVida).
export type EfectoAccionAumento =
  | { tipo: "estado"; estadoId: string; desde?: string; a: string | null }
  | { tipo: "vida"; delta: number };

// En el catálogo (operación o nivel de implante). `economia`: el tipo de acción, en texto.
export type AccionAumentoCatalogo = {
  id: string;
  label: string;
  economia: string;
  costeFatiga?: number;
  nota: string;
  efecto?: EfectoAccionAumento;
};

// Defensa del MQE contra la intrusión psiónica, por nivel. Dato sobre un tercero: la app no
// tira por el intruso (§11.3).
export type DefensaIntrusion = { alcance: string; dificultad: number; defensa: string; contragolpe: string };

export type AccionDeAumento = AccionDirecta & { fuente: string; efecto: EfectoAccionAumento | null };
export type InfoDeAumento = { id: string; label: string; fuente: string; lineas: string[] };
export type AccionesDeAumentos = { directas: AccionDeAumento[]; informativas: InfoDeAumento[] };

export const SIN_ACCIONES_DE_AUMENTOS: AccionesDeAumentos = { directas: [], informativas: [] };

const NOTA_INTRUSO =
  "El intruso tira cada turno lo que proceda por Resonancia (acción compleja, con concentración) y la dificultad sube 1 por turno. La app no tira por él.";

type Aporte = { fuente: string; acciones: AccionAumentoCatalogo[]; defensa: DefensaIntrusion | null };

function aportes(sheet: Pick<Sheet, "equipo">): Aporte[] {
  const activas = operacionesActivas(sheet);
  return sheet.equipo.flatMap((pieza): Aporte[] => {
    const cat = aumentoPorId(pieza.catalogoId);
    if (!cat) return [];
    if (cat.familia === "operacionGenetica") {
      return activas.has(cat.id) && cat.acciones ? [{ fuente: cat.label, acciones: cat.acciones, defensa: null }] : [];
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

function directa(a: AccionAumentoCatalogo, fuente: string, fatigaActual: number): AccionDeAumento {
  const coste = a.costeFatiga ?? 0;
  const cabecera = [a.economia, coste > 0 ? fatigaTexto(coste) : "sin coste"].join(", ");
  return {
    id: a.id,
    label: a.label,
    grupo: "Aumentos",
    nota: `${cabecera}. ${a.nota} (${fuente})`,
    ...(coste > 0 && { costeFatiga: coste }),
    ...(coste > fatigaActual && { bloqueada: `No te llega la fatiga: cuesta ${coste} y te quedan ${fatigaActual}.` }),
    fuente,
    efecto: a.efecto ?? null,
  };
}

export function accionesDeAumentos(sheet: Pick<Sheet, "equipo" | "fatigaActual">): AccionesDeAumentos {
  const directas: AccionDeAumento[] = [];
  const informativas: InfoDeAumento[] = [];
  for (const ap of aportes(sheet)) {
    for (const a of ap.acciones) directas.push(directa(a, ap.fuente, sheet.fatigaActual));
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
  return directas.length === 0 && informativas.length === 0 ? SIN_ACCIONES_DE_AUMENTOS : { directas, informativas };
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

// Valida contra la ficha que la acción existe (pieza equipada, requisito sano, nivel) y que
// llega la fatiga, y devuelve lo que hay que escribir.
export function usoDeAccionAumento(sheet: Sheet, estados: readonly EstadoActivo[], accionId: string): UsoAccionAumento {
  const accion = accionesDeAumentos(sheet).directas.find((a) => a.id === accionId);
  if (!accion) return { ok: false, error: "No tienes esa acción (falta el aumento o tiene un requisito roto)." };
  if (accion.bloqueada) return { ok: false, error: accion.bloqueada };
  const pagado = pagarFatiga(sheet, accion.costeFatiga ?? 0, false);
  const efecto = accion.efecto;
  const coste = accion.costeFatiga ? `−${accion.costeFatiga} de fatiga.` : null;
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
