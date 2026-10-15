// Las dotes compradas tal y como viven en la ficha (sheet.dotes) y su lectura
// tolerante. Aparte de dotes.ts a propósito: sheet.ts lo importa, y dotes.ts tira de
// derivados/especie, que a su vez importan sheet.ts (ciclo en la carga del módulo).
import { z } from "zod";
import { DOTES } from "../catalog/dotes";
import type { DoteCatalogo } from "../catalog/dotesTipos";
import { ESPECIALIDADES_ARMA } from "../catalog/especialidades";

export const ELECCION_MAX = 60;
export const MAX_DOTES = 200;

// Lo que decide el jugador: qué dote y, si la dote la pide, qué eligió (§9.1).
export const doteCompradaSchema = z.object({
  id: z.string().min(1).max(80),
  eleccion: z.string().trim().min(1).max(ELECCION_MAX).optional(),
});
export type DoteComprada = z.infer<typeof doteCompradaSchema>;

const POR_ID = new Map(DOTES.map((d) => [d.id, d]));

export function dotePorId(id: string): DoteCatalogo | undefined {
  return POR_ID.get(id);
}

// Para comparar nombres escritos a mano: sin tildes, sin mayúsculas, sin espacios
// en los bordes ("Empatía" ↔ "empatia").
export function normalizarNombre(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// La elección ya validada contra la dote, o null si no encaja. Lista cerrada: uno
// de sus ids. Especialidad de arma: un id de ESPECIALIDADES_ARMA (que la ficha la tenga
// es gate de compra, dotes.ts). Abierta: texto libre recortado.
export function eleccionValida(dote: DoteCatalogo, eleccion: string | undefined): string | null | undefined {
  if (!dote.eleccion) return undefined; // la dote no pide elección: se ignora lo que venga
  const texto = typeof eleccion === "string" ? eleccion.trim().slice(0, ELECCION_MAX) : "";
  if (!texto) return null;
  const { opciones } = dote.eleccion;
  if (opciones === "especialidades_arma") return ESPECIALIDADES_ARMA.some((e) => e.id === texto) ? texto : null;
  if (Array.isArray(opciones) && !("abierta" in dote.eleccion && dote.eleccion.abierta)) {
    return opciones.includes(texto) ? texto : null;
  }
  return texto;
}

// Misma dote y misma elección (normalizada): lo que una repetible no admite dos veces.
export function mismaDote(a: DoteComprada, b: DoteComprada): boolean {
  return a.id === b.id && normalizarNombre(a.eleccion ?? "") === normalizarNombre(b.eleccion ?? "");
}

// Lectura tolerante (parseSheet): descarta ids desconocidos, entradas sin la
// elección que su dote exige o con una que no encaja en la lista cerrada, y
// duplicados (una no repetible, una vez; una repetible, nunca dos con la misma
// elección). No mira requisitos ni coste: eso es gate de compra, no de lectura.
export function normalizarDotes(raw: unknown): DoteComprada[] {
  if (!Array.isArray(raw)) return [];
  const dotes: DoteComprada[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const { id, eleccion } = x as { id?: unknown; eleccion?: unknown };
    if (typeof id !== "string") continue;
    const dote = dotePorId(id);
    if (!dote) continue;
    const el = eleccionValida(dote, typeof eleccion === "string" ? eleccion : undefined);
    if (el === null) continue;
    const entrada: DoteComprada = el === undefined ? { id } : { id, eleccion: el };
    const repetida = dote.repetible ? dotes.some((d) => mismaDote(d, entrada)) : dotes.some((d) => d.id === id);
    if (repetida) continue;
    dotes.push(entrada);
    if (dotes.length >= MAX_DOTES) break;
  }
  return dotes;
}
