// Validación de entrada de la app (no del sistema de juego). Los esquemas de la
// ficha viven en "@/lib/rules" porque dependen de las reglas.
import { z } from "zod";
import { HABILIDADES, type HabilidadId } from "./rules/habilidades";
import { ATRIBUTOS, type AtributoId } from "./rules/atributos";
import { esEspecialidadDe } from "./catalog/especialidades";
import { estadoPorId } from "./catalog/estados";
import { MAX_RONDAS_ESTADO } from "./rules/estadosFicha";
import { CATEGORIAS_DANIO } from "./rules/danio";
import { MAX_LINEAS_PERSONALIZADO, MAX_NOMBRE_PERSONALIZADO, MAX_VALOR_PERSONALIZADO } from "./rules/estadoPersonalizado";

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

// Atributo libre de la especie (setAtributoLibreAction y su espejo de NPC).
export const atributoLibreSchema = z.enum(ATRIBUTOS.map((a) => a.id) as [AtributoId, ...AtributoId[]]);

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

const estadoDelCatalogoSchema = z
  .strictObject({ estadoId: idCatalogo, gradoId: idCatalogo, duracion: duracionEstadoSchema })
  .refine((v) => estadoPorId(v.estadoId)?.grados.some((g) => g.id === v.gradoId) ?? false, {
    message: "Ese estado o grado no existe en el catálogo.",
    path: ["gradoId"],
  });

// El «Personalizado» (rules/estadoPersonalizado.ts): nombre recortado y líneas «atributo básico o
// habilidad ± N», N entero distinto de 0. El id no viene del cliente: lo pone activoAAplicar.
const valorPersonalizadoSchema = z
  .number()
  .int("Tiene que ser un número entero.")
  .min(-MAX_VALOR_PERSONALIZADO)
  .max(MAX_VALOR_PERSONALIZADO)
  .refine((n) => n !== 0, "El bono no puede ser 0.");

const lineaPersonalizadoSchema = z.discriminatedUnion("tipo", [
  z.strictObject({ tipo: z.literal("atributo"), id: atributoLibreSchema, valor: valorPersonalizadoSchema }),
  z.strictObject({
    tipo: z.literal("habilidad"),
    id: z.enum(HABILIDADES.map((h) => h.id) as [HabilidadId, ...HabilidadId[]]),
    valor: valorPersonalizadoSchema,
  }),
]);

export const estadoPersonalizadoSchema = z.strictObject({
  nombre: z
    .string()
    .max(200)
    .transform((s) => s.trim().slice(0, MAX_NOMBRE_PERSONALIZADO).trim())
    .refine((s) => s !== "", "Ponle un nombre al estado."),
  modificadores: z
    .array(lineaPersonalizadoSchema)
    .min(1, "Añade al menos un bono.")
    .max(MAX_LINEAS_PERSONALIZADO, `Como mucho ${MAX_LINEAS_PERSONALIZADO} bonos.`),
});

export const estadoAAplicarSchema = z.union([
  estadoDelCatalogoSchema,
  z.strictObject({ custom: estadoPersonalizadoSchema, duracion: duracionEstadoSchema }),
]);

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
  // A7: "Aplicar igualmente" a quien es inmune.
  forzar: z.boolean().optional(),
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

export const quitarEstadoAPersonajesSchema = z.object({
  characterIds: variosPersonajesSchema,
  estadoId: idCatalogo,
  motivo: motivoSchema,
});

// Limpiar estados: de la Mesa (todos los personajes en juego) o del combate abierto (su
// cola, NPC incluidos). Motivo opcional.
export const limpiarEstadosSchema = z.object({ ambito: z.enum(["mesa", "combate"]), motivo: motivoSchema });

// Estados desde la consola de combate (E1d): objetivos = filas de la cola (Combatiente),
// jugadores y NPC mezclados.
const variosCombatientesSchema = z
  .array(z.string().trim().min(1).max(40))
  .min(1, "Elige al menos a uno de la cola.")
  .max(100);

export const aplicarEstadoEnCombateSchema = z.object({
  combatienteIds: variosCombatientesSchema,
  estado: estadoAAplicarSchema,
  motivo: motivoSchema,
  // A7: "Aplicar igualmente" a quien es inmune.
  forzar: z.boolean().optional(),
});

export const quitarEstadoEnCombateSchema = z.object({
  combatienteIds: variosCombatientesSchema,
  estadoId: idCatalogo,
  motivo: motivoSchema,
});

// Pestaña Vida del centro de mando: el signo de `cantidad` lo pone el modo (daño
// negativo, curación positiva), nunca lo teclea el máster.
const recursoVitalSchema = z.enum(["vida", "fatiga"]);
const cantidadVidaSchema = z
  .number()
  .int("Tiene que ser un número entero.")
  .min(-999)
  .max(999)
  .refine((n) => n !== 0, "La cantidad no puede ser 0.");

// Categoría del daño (o de lo que se cura) en la vida; la fatiga no tiene y se ignora.
export const categoriaDanioSchema = z.enum(CATEGORIAS_DANIO);

export const ajustarVidaAPersonajesSchema = z.object({
  characterIds: variosPersonajesSchema,
  recurso: recursoVitalSchema,
  cantidad: cantidadVidaSchema,
  categoria: categoriaDanioSchema.optional(),
});

export const ajustarVidaEnCombateSchema = z.object({
  combatienteIds: variosCombatientesSchema,
  recurso: recursoVitalSchema,
  cantidad: cantidadVidaSchema,
  categoria: categoriaDanioSchema.optional(),
});

// Fila propia del jugador en el combate: daño (delta > 0) o cura (< 0) de una categoría en
// su foto, como ajustarDanioAction en la ficha.
export const ajustarDanioCombatienteSchema = z.object({
  combatienteId: z.string().min(1),
  categoria: categoriaDanioSchema,
  delta: z
    .number()
    .int()
    .min(-999)
    .max(999)
    .refine((n) => n !== 0, "La cantidad no puede ser 0."),
});
