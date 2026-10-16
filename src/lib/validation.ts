// Validación de entrada de la app (no del sistema de juego). Los esquemas de la
// ficha viven en "@/lib/rules" porque dependen de las reglas.
import { z } from "zod";
import { HABILIDADES, type HabilidadId } from "./rules/habilidades";
import { esEspecialidadDe } from "./catalog/especialidades";
import { estadoPorId } from "./catalog/estados";
import { MAX_RONDAS_ESTADO } from "./rules/estadosFicha";

// Login flexible para el grupo: acepta usuario simple (no hace falta email) y
// contraseñas cortas. El campo se llama `email` porque mapea a User.email.
export const loginSchema = z.object({
  email: z.string().trim().min(1, "Pon un usuario"),
  password: z.string().min(1, "Pon una contraseña"),
});

export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(1).max(60).optional(),
});

export const characterCreateSchema = z.object({
  name: z.string().trim().min(1, "Pon un nombre").max(80),
});

export const characterIdSchema = z.string().trim().min(1).max(40);

// Nota del máster al devolver una ficha a creación. Vacía = sin nota.
export const notaRevisionSchema = z
  .string()
  .trim()
  .max(500, "La nota no puede pasar de 500 caracteres")
  .transform((s) => (s === "" ? null : s));

// Elección de especie (setEspecieAction y su espejo de NPC). Solo la forma: que la
// combinación exista y esté completa lo decide elegirEspecie con el catálogo.
const idCatalogo = z.string().max(40);
export const eleccionEspecieSchema = z.object({
  especieId: idCatalogo.nullable(),
  casta: idCatalogo.nullable().optional(),
  linaje: idCatalogo.nullable().optional(),
});

// Especialidad que se añade o se quita (addEspecialidadAction y su espejo de NPC): la
// habilidad tiene que existir y la especialidad ser un id de SU lista
// (catalog/especialidades.ts). Una habilidad sin lista no admite ninguna.
export const especialidadDeHabilidadSchema = z
  .object({
    habilidadId: z.enum(HABILIDADES.map((h) => h.id) as [HabilidadId, ...HabilidadId[]]),
    especialidadId: z.string().max(40),
  })
  .refine((v) => esEspecialidadDe(v.habilidadId, v.especialidadId), {
    message: "Esa especialidad no es de esta habilidad",
    path: ["especialidadId"],
  });

// Un estado que pone el máster (E1a): que el estado y el grado existan lo mira el
// catálogo aquí mismo; la duración, una de las tres formas (DuracionEstado).
export const duracionEstadoSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("rondas"), rondas: z.number().int().min(0).max(MAX_RONDAS_ESTADO) }),
  z.object({ tipo: z.literal("escena") }),
  z.object({ tipo: z.literal("hastaQuitarlo") }),
]);

export const estadoAAplicarSchema = z
  .object({ estadoId: idCatalogo, gradoId: idCatalogo, duracion: duracionEstadoSchema })
  .refine((v) => estadoPorId(v.estadoId)?.grados.some((g) => g.id === v.gradoId) ?? false, {
    message: "Ese estado o grado no existe en el catálogo.",
    path: ["gradoId"],
  });

// Por qué lo hace el máster (registro, E1b). Vacío = sin motivo.
export const motivoSchema = z
  .string()
  .trim()
  .max(200, "El motivo no puede pasar de 200 caracteres")
  .optional()
  .transform((s) => (s ? s : undefined));

// A varios personajes a la vez (la mesa entera cabe de sobra en 50).
const variosPersonajesSchema = z.array(characterIdSchema).min(1, "Elige al menos un personaje.").max(50);

export const aplicarEstadoAPersonajesSchema = z.object({
  characterIds: variosPersonajesSchema,
  estado: estadoAAplicarSchema,
  motivo: motivoSchema,
});

// XP o créditos a varios (E1b): negativa para quitar.
export const darRecursoSchema = z.object({
  characterIds: variosPersonajesSchema,
  cantidad: z
    .number()
    .int("Tiene que ser un número entero.")
    .min(-100_000)
    .max(100_000)
    .refine((n) => n !== 0, "La cantidad no puede ser 0."),
  motivo: motivoSchema,
});

export const registroIdSchema = z.string().trim().min(1).max(40);

export const quitarEstadoSchema = z.object({ id: characterIdSchema, estadoId: idCatalogo });
