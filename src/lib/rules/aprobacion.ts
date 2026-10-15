// Guardarraíl de la ficha aprobada: solo comprar, nunca vender.
//
// Al aprobar, el máster congela una foto de Atributos y Habilidades
// (snapshotFromSheet). Mientras la ficha esté aprobada, cualquier intento de
// bajar un atributo o habilidad por debajo de su valor congelado se recorta
// al suelo — mismo estilo "clamp silencioso" que ya usa creacion.ts, no un
// error. Especialidades quedan fuera a propósito: no cuestan puntos del pool
// (ver habilidades.ts), así que cambiarlas no es "vender" nada.
//
// Esto es el guardarraíl, no el sistema de progresión: subir un atributo o
// habilidad por ENCIMA del snapshot necesita una fórmula de coste en XP que
// el diseñador no ha dado todavía (Progresión sigue [PENDIENTE] en
// docs/sistema.md). Este módulo solo impide bajar.
import { z } from "zod";
import { ATRIBUTOS, ATRIBUTO_MIN, ATRIBUTO_MAX, type AtributoId } from "./atributos";
import { HABILIDADES, HABILIDAD_NO_ENTRENADA, HABILIDAD_MAX, type HabilidadId } from "./habilidades";
import type { Sheet } from "./sheet";
import { doteCompradaSchema } from "./dotesCompradas";

const atributosFloorShape = Object.fromEntries(
  ATRIBUTOS.map((a) => [a.id, z.number().int().min(ATRIBUTO_MIN).max(ATRIBUTO_MAX)]),
) as Record<AtributoId, z.ZodNumber>;

const habilidadesFloorShape = Object.fromEntries(
  HABILIDADES.map((h) => [
    h.id,
    z.number().int().min(HABILIDAD_NO_ENTRENADA).max(HABILIDAD_MAX),
  ]),
) as Record<HabilidadId, z.ZodNumber>;

// `dotes` es opcional a propósito: las fotos guardadas antes de las dotes (D1) no
// lo traen, y si fuera obligatorio dejarían de validar y esas fichas perderían el
// suelo entero (parseSnapshot → null). Con la ficha aprobada ninguna dote se vende
// (dotes.ts, motivoNoQuitable); la foto dice cuáles venían de creación.
const snapshotSchema = z.object({
  atributos: z.object(atributosFloorShape),
  habilidades: z.object(habilidadesFloorShape),
  dotes: z.array(doteCompradaSchema).optional(),
});

export type AprobacionSnapshot = z.infer<typeof snapshotSchema>;

// Foto de los dos bloques que la aprobación congela. Se llama al aprobar.
export function snapshotFromSheet(sheet: Sheet): AprobacionSnapshot {
  return {
    atributos: { ...sheet.atributos },
    habilidades: Object.fromEntries(
      HABILIDADES.map((h) => [h.id, sheet.habilidades[h.id].valor]),
    ) as Record<HabilidadId, number>,
    dotes: sheet.dotes.map((d) => ({ ...d })),
  };
}

// Lectura tolerante desde Character.approvedSnapshot (Json, puede ser null si
// la ficha nunca se aprobó con este mecanismo todavía). Igual que parseSheet:
// si no es válido, se trata como "sin snapshot" en vez de reventar.
export function parseSnapshot(json: unknown): AprobacionSnapshot | null {
  const parsed = snapshotSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

// Recorta value para que nunca baje del suelo congelado. Sin snapshot (ficha
// aprobada antes de que existiera este campo), no hay suelo que aplicar.
export function aplicarSueloAtributo(
  value: number,
  id: AtributoId,
  snapshot: AprobacionSnapshot | null,
): number {
  if (!snapshot) return value;
  return Math.max(value, snapshot.atributos[id]);
}

export function aplicarSueloHabilidad(
  value: number,
  id: HabilidadId,
  snapshot: AprobacionSnapshot | null,
): number {
  if (!snapshot) return value;
  return Math.max(value, snapshot.habilidades[id]);
}
