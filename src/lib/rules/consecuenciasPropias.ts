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
import { z } from "zod";
import type { Accion } from "./acciones";
import type { CategoriaDanio } from "./danio";
import { estadoActivoCon, type EstadoActivo } from "./estados";
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
  estados: EstadoPropio[];
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
// `atacar`, un ataque estando en Sigilo, que te lo baja.
export type OperacionConsecuenciaPropia =
  | { tipo: "grado"; accionId: string; grado: Grado }
  | { tipo: "salvacion"; accionId: string; modoId: string | null; grado: Grado }
  | { tipo: "total"; accionId: string; total: number; eleccion: string | null }
  | { tipo: "usar"; accionId: string; opcion: string | null }
  | { tipo: "atacar"; accionId: string };

export function consecuenciaPropia(
  t: Pick<Accion, "consecuenciasPropias" | "salvacionesPropias">,
  op: { grado: Grado; tipo: "grado" | "salvacion"; modoId?: string | null },
): ConsecuenciaPropia | null {
  const c = op.tipo === "grado" ? t.consecuenciasPropias?.[op.grado] : salvacionPropiaDe(t, op.modoId ?? null)?.grados[op.grado];
  return c && (c.danio || c.estados.length > 0) ? c : null;
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

// «Recibes 5 de daño no letal. Te pones Entorpecido y Derribado.»
export function textoDeConsecuencia(c: ConsecuenciaPropia): string {
  const nombres = c.estados.map((e) => estadoPorId(e.estadoId)?.label ?? e.estadoId);
  return [
    c.danio ? `Recibes ${c.danio.valor} de daño ${ETIQUETA_CATEGORIA[c.danio.categoria]}.` : null,
    nombres.length > 0 ? `Te pones ${nombres.join(" y ")}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
}
