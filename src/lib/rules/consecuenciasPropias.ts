// Lo que una acción le hace a quien la hace (T3c del cuestionario de cierre, usuario 2026-11-13).
//
// Dos formas, las dos resueltas aquí y aplicadas por el servidor con la ficha guardada
// (aplicarConsecuenciaPropiaAction), como los estados propios de los poderes (P1):
//   - Por el grado de la propia tirada (`Accion.consecuenciasPropias`): el fracaso crítico de
//     intimidar en combate te deja con Miedo 1 turno (Grito de Guerra y compañía, do-04).
//   - Por una salvación propia tras la acción (`Accion.salvacionesPropias`), acierte o falle: el
//     retroceso entrópico del Kerzul (eq-18, eq-19). El resultado ofrece el botón, la app tira la
//     salvación de la ficha y el grado decide la consecuencia.
// El daño entra directo a la vida (en combate, a la foto del Combatiente), no por «Resistir daño».
// La fatiga (fa-03: el rechazo del Xovromium), igual: en combate a la foto, si no a la ficha.
import { z } from "zod";
import type { Accion } from "./acciones";
import type { CategoriaDanio } from "./danio";
import { estadoActivoCon, type EstadoActivo } from "./estados";
import type { OperacionEstado } from "./vidaPorEstados";
import type { Grado } from "./psionica";
import { estadoPorId } from "../catalog/estados";

// Un estado que la app pone sobre quien tira. Sin `turnos`, hasta que se quite (Derribado: se
// levanta con una acción de movimiento).
export const estadoPropioSchema = z.strictObject({
  estadoId: z.string().min(1),
  gradoId: z.string().min(1),
  turnos: z.number().int().min(1).optional(),
});
export type EstadoPropio = z.infer<typeof estadoPropioSchema>;

export type ConsecuenciaPropia = {
  texto: string;
  danio?: { valor: number; categoria: CategoriaDanio };
  // Fatiga que pierdes (sin pasar de 0, como el ajuste de la pestaña Vida).
  fatiga?: number;
  estados: EstadoPropio[];
  // Fármacos instantáneos (fármacos como estados, usuario 2026-11-14): estados que te quita
  // (Hemostáticos: la Hemorragia) y estados que te baja un grado (Estabilizadores Neurales: el
  // Aturdido). `orden`: sus grados del peor al más leve; bajar del último (o de uno que no esté en
  // la lista) lo quita. Sin el estado puesto, nada.
  quita?: string[];
  rebaja?: { estadoId: string; orden: string[] }[];
};

// Una salvación que hace quien tira tras la acción: con qué fila de la ficha, contra cuánto y
// qué le pasa en cada grado. `soloModo`: solo con ese modo del ataque (id de la opción).
export type SalvacionPropia = {
  fuente: string;
  etiqueta: string;
  tiradaId: string;
  tiradaLabel: string;
  dificultad: number;
  grados: Partial<Record<Grado, ConsecuenciaPropia>>;
  soloModo?: string;
};

// La salvación propia de esta tirada con el modo elegido (null si no hay o no toca en ese modo).
export function salvacionPropiaDe(t: Pick<Accion, "salvacionesPropias">, modoId: string | null): SalvacionPropia | null {
  return t.salvacionesPropias?.find((s) => s.soloModo === undefined || s.soloModo === modoId) ?? null;
}

// Lo que el servidor aplica: por el grado de la tirada o por el de su salvación propia.
// T4 (rules/sigilo.ts), por el mismo camino: `total`, el total de una tirada que queda como el
// número de un estado (Sigilo, Arma escondida, Disfrazado), con la opción que da su nota;
// `usar`, la opción elegida en una acción sin dado que pone un estado (Activar camuflaje);
// `atacar`, un ataque estando en Sigilo, que te lo baja. T6a: `sobreesfuerzo`, el fallo de la
// salvación de sobreesfuerzo de un poder. T6b: `prolongar`, un turno más de un estado propio.
// T7c: `acabar`, el botón de un estado recordatorio (rules/acabarEstado.ts).
export type OperacionConsecuenciaPropia =
  | { tipo: "grado"; accionId: string; grado: Grado }
  | { tipo: "salvacion"; accionId: string; modoId: string | null; grado: Grado }
  | { tipo: "total"; accionId: string; total: number; eleccion: string | null }
  | { tipo: "usar"; accionId: string; opcion: string | null }
  | { tipo: "atacar"; accionId: string }
  // T6a (rules/sobreesfuerzo.ts): el fallo del sobreesfuerzo tras usar un poder, con el grado de
  // la salvación y la opción elegida (fracaso crítico del implante 4; si no, 0).
  | { tipo: "sobreesfuerzo"; poderId: string; elecciones: Record<string, string>; grado: Grado; opcion: number }
  // T6b (rules/prolongarEstado.ts): alargar un estado propio pagando su fatiga (Sondeo No-Local).
  | { tipo: "prolongar"; estadoId: string }
  // T7c (rules/acabarEstado.ts, fa-03): «Se acabó: aplicar el bajón» de un estado recordatorio.
  | { tipo: "acabar"; estadoId: string };

export function consecuenciaPropia(
  t: Pick<Accion, "consecuenciasPropias" | "salvacionesPropias">,
  op: { grado: Grado; tipo: "grado" | "salvacion"; modoId?: string | null },
): ConsecuenciaPropia | null {
  const c = op.tipo === "grado" ? t.consecuenciasPropias?.[op.grado] : salvacionPropiaDe(t, op.modoId ?? null)?.grados[op.grado];
  return c && (c.danio || c.fatiga || c.estados.length > 0 || c.quita?.length || c.rebaja?.length) ? c : null;
}

// Lo que `quita` y `rebaja` hacen de verdad sobre los estados que llevas: quitar el que tengas y
// bajar un grado (o quitar) el que tengas. Lo que no llevas no da operación.
export function cambiosDeEstadoDe(c: Pick<ConsecuenciaPropia, "quita" | "rebaja">, actuales: readonly EstadoActivo[]): OperacionEstado[] {
  const quitar = (c.quita ?? []).flatMap((id): OperacionEstado[] => (actuales.some((e) => e.estadoId === id) ? [{ tipo: "quitar", estadoId: id }] : []));
  const rebajar = (c.rebaja ?? []).flatMap(({ estadoId, orden }): OperacionEstado[] => {
    const actual = actuales.find((e) => e.estadoId === estadoId);
    if (!actual) return [];
    const i = orden.indexOf(actual.gradoId);
    const siguiente = i >= 0 ? orden[i + 1] : undefined;
    return [siguiente ? { tipo: "poner", estado: { ...actual, gradoId: siguiente } } : { tipo: "quitar", estadoId }];
  });
  return [...quitar, ...rebajar];
}

// «Se te quita Hemorragia.» / «Aturdido baja a Éxito.» Sin cambios, lo que no había que quitar.
export function textoDeCambiosDeEstado(c: Pick<ConsecuenciaPropia, "quita" | "rebaja">, ops: readonly OperacionEstado[]): string {
  const nombre = (id: string) => estadoPorId(id)?.label ?? id;
  if (ops.length === 0) {
    const ids = [...(c.quita ?? []), ...(c.rebaja ?? []).map((r) => r.estadoId)];
    return ids.length > 0 ? `No llevas ${ids.map(nombre).join(" ni ")}: nada que quitar.` : "";
  }
  return ops
    .map((op) => {
      if (op.tipo === "quitar") return `Se te quita ${nombre(op.estadoId)}.`;
      const grado = estadoPorId(op.estado.estadoId)?.grados.find((g) => g.id === op.estado.gradoId)?.label ?? op.estado.gradoId;
      return `${nombre(op.estado.estadoId)} baja a ${grado}.`;
    })
    .join(" ");
}

// Los EstadoActivo que se ponen (sin los que el catálogo ya no conoce: dato desfasado).
export function estadosActivosDe(estados: readonly EstadoPropio[]): EstadoActivo[] {
  return estados.flatMap((e) =>
    estadoPorId(e.estadoId)?.grados.some((g) => g.id === e.gradoId)
      ? [estadoActivoCon(e.estadoId, e.gradoId, e.turnos ? { tipo: "rondas", rondas: e.turnos } : { tipo: "hastaQuitarlo" })]
      : [],
  );
}

const ETIQUETA_CATEGORIA: Record<CategoriaDanio, string> = { noLetal: "no letal", letal: "letal", grave: "grave" };

// «Recibes 5 de daño no letal. Pierdes 1 de fatiga. Te pones Entorpecido y Derribado.»
export function textoDeConsecuencia(c: ConsecuenciaPropia): string {
  const nombres = c.estados.map((e) => estadoPorId(e.estadoId)?.label ?? e.estadoId);
  return [
    c.danio ? `Recibes ${c.danio.valor} de daño ${ETIQUETA_CATEGORIA[c.danio.categoria]}.` : null,
    c.fatiga ? `Pierdes ${c.fatiga} de fatiga.` : null,
    nombres.length > 0 ? `Te pones ${nombres.join(" y ")}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
}
