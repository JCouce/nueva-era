// Forma del catálogo de dotes: los campos de COMPRA de MODELO_DOTES v2
// (scripts/workflows/modelar-area-extraer.ts; reglas en docs/sistema.md §9.1).
// Los efectos (capas, MotorMetadata) llegan en tandas posteriores: aquí no están.
//
// El schema Zod lo usa scripts/generar-catalogo-dotes.ts para validar el borrador
// (docs/modelado-dotes.json) antes de escribir src/lib/catalog/dotes.ts; los tipos
// los usa el motor (rules/dotes.ts). Objetos estrictos a propósito: una clave que no
// está en el modelo es un error, no algo que se descarta en silencio.
import { z } from "zod";
import { ATRIBUTOS, APLICADOS } from "../rules/atributos";
import { HABILIDADES } from "../rules/habilidades";
import { DISCIPLINA_IDS } from "./psionica";

const ids = <T extends readonly { id: string }[]>(lista: T) =>
  lista.map((x) => x.id) as unknown as [T[number]["id"], ...T[number]["id"][]];

const atributoId = z.enum(ids(ATRIBUTOS));
const aplicadoId = z.enum(ids(APLICADOS));
const habilidadId = z.enum(ids(HABILIDADES));
const nivel = z.number().int().min(1).max(6);
// Las especialidades aún no tienen catálogo (sistema.md §3, [PARCIAL]): el id es el
// nombre en minúsculas, sin tildes y con "_" (empatia, ingenieria_genetica).
const idEspecialidad = z.string().regex(/^[a-z][a-z_]*$/);
export const ID_DOTE = /^dote_[a-z0-9_]+$/;

const requisitoSimpleSchema = z.discriminatedUnion("tipo", [
  z.strictObject({ tipo: z.literal("atributo"), id: atributoId, min: nivel }),
  z.strictObject({ tipo: z.literal("aplicado"), id: aplicadoId, min: nivel }),
  z.strictObject({ tipo: z.literal("habilidad"), id: habilidadId, min: nivel }),
  z.strictObject({ tipo: z.literal("especialidad"), habilidad: habilidadId, id: idEspecialidad, min: nivel }),
  // "Nivel en una habilidad psiónica N" → "cualquiera" (§9.1).
  z.strictObject({ tipo: z.literal("disciplina"), id: z.enum([...DISCIPLINA_IDS, "cualquiera"]), min: nivel }),
  // "Psiónica de origen biológico": por especie o por implante (§9.1).
  z.strictObject({ tipo: z.literal("psionico") }),
  z.strictObject({ tipo: z.literal("dote"), id: z.string().regex(ID_DOTE) }),
]);

// "Empatía 1 o Liderazgo 1": basta una. Sin anidar: la fuente no trae "o" dentro de "o".
export const requisitoDoteSchema = z.union([
  requisitoSimpleSchema,
  z.strictObject({ tipo: z.literal("uno_de"), opciones: z.array(requisitoSimpleSchema).min(2) }),
]);

// Elección al comprar (§9.1). `opciones` cerrada = ids de una lista fija, con su
// etiqueta legible en `etiquetas` (la pone el generador); `abierta` = las opciones
// son ejemplos y vale texto libre (Bioma Predilecto); "especialidades_arma" = una
// especialidad de arma del personaje, texto libre (Crítico Mejorado).
export const eleccionDoteSchema = z.union([
  z.strictObject({
    id: z.string().min(1),
    label: z.string().min(1),
    opciones: z.array(z.string().min(1)).min(1),
    abierta: z.literal(true).optional(),
    etiquetas: z.record(z.string(), z.string().min(1)).optional(),
  }),
  z.strictObject({
    id: z.string().min(1),
    label: z.string().min(1),
    opciones: z.literal("especialidades_arma"),
  }),
]);

export const doteCatalogoSchema = z.strictObject({
  id: z.string().regex(ID_DOTE),
  label: z.string().min(1),
  grupo: habilidadId,
  subgrupo: z.literal("psionica").optional(),
  coste: z.number().int().min(1).max(20),
  requisitos: z.array(requisitoDoteSchema),
  eleccion: eleccionDoteSchema.nullable(),
  repetible: z.boolean(),
  sustituye: z.string().regex(ID_DOTE).nullable(),
  visible: z.boolean(),
  texto: z.string(),
});

export type RequisitoDoteSimple = z.infer<typeof requisitoSimpleSchema>;
export type RequisitoDote = z.infer<typeof requisitoDoteSchema>;
export type EleccionDote = z.infer<typeof eleccionDoteSchema>;
export type DoteCatalogo = z.infer<typeof doteCatalogoSchema>;
