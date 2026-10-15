// Forma del catálogo de dotes: MODELO_DOTES v2 (scripts/workflows/modelar-area-extraer.ts;
// reglas en docs/sistema.md §9). Compra desde D1; efectos y MotorMetadata desde D2a
// (qué se aplica de verdad lo dice el MotorMetadata, ver rules/dotesEfectos.ts).
//
// El schema Zod lo usa scripts/generar-catalogo-dotes.ts para validar el borrador
// (docs/modelado-dotes.json) antes de escribir src/lib/catalog/dotes.ts; los tipos
// los usa el motor (rules/dotes.ts). Objetos estrictos a propósito: una clave que no
// está en el modelo es un error, no algo que se descarta en silencio.
import { z } from "zod";
import { ATRIBUTOS, APLICADOS } from "../rules/atributos";
import { HABILIDADES } from "../rules/habilidades";
import { DISCIPLINA_IDS } from "./psionica";
import { ESPECIALIDAD_IDS } from "./especialidades";
import { motorMetadataSchema } from "../rules/motor";

const ids = <T extends readonly { id: string }[]>(lista: T) =>
  lista.map((x) => x.id) as unknown as [T[number]["id"], ...T[number]["id"][]];

const atributoId = z.enum(ids(ATRIBUTOS));
const aplicadoId = z.enum(ids(APLICADOS));
const habilidadId = z.enum(ids(HABILIDADES));
const nivel = z.number().int().min(1).max(6);
// Id del catálogo de especialidades (catalog/especialidades.ts). Que sea de la habilidad
// del requisito lo comprueba el generador (scripts/generar-catalogo-dotes.ts).
const idEspecialidad = z.enum(ESPECIALIDAD_IDS);
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
// especialidad de arma que tenga el personaje, lista cerrada de ids que se resuelve con
// la ficha (ESPECIALIDADES_ARMA, rules/dotes.ts opcionesDeEleccion; Crítico Mejorado).
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

// ── Efectos (MODELO_DOTES v2, tanda D2a) ─────────────────────────────────
// Todos los efectos del borrador, normalizados por el generador. Que un efecto esté
// aquí no significa que la app lo aplique: eso lo dice su MotorMetadata (`motor[i]`,
// mismo índice), y rules/dotesEfectos.ts solo construye los `construido`.

const GRADOS = ["critico", "exito", "fracaso", "fracasoCritico"] as const;
const grado = z.enum(GRADOS);
// null = siempre; texto = interruptor que el jugador marca al tirar (o cuándo se
// muestra un texto).
const condicion = z.string().min(1).nullable();
// id de acción | "grupo:<g>" | "habilidad:<h>" | "especialidad:<e>" | "familia:<f>" |
// "dotes_<acción de dote>". Lo traduce a un destino real catalog/dotesDestinos.ts.
const alcance = z.string().min(1);

const limiteUno = z.strictObject({
  veces: z.number().int().min(1),
  por: z.enum(["turno", "escena", "dia", "objetivo", "aliado", "pista"]),
});
// DATO: hoy solo se muestra, la app no lo cuenta (§9.3).
const limite = z.union([limiteUno.nullable(), z.array(limiteUno).min(2)]);
const economiaUna = z.union([
  z.enum(["gratuita", "simple", "estandar", "compleja", "reaccion"]),
  z.strictObject({ tiempo: z.string().min(1) }),
]);
const economia = z.union([economiaUna, z.array(economiaUna).min(2)]);

// Umbral de la ficha que cambia el valor (Presencia Imponente: Fuerza ≥ 5 → +2).
const siMin = z.discriminatedUnion("tipo", [
  z.strictObject({ tipo: z.literal("atributo"), id: atributoId, min: nivel, valor: z.number().int() }),
  z.strictObject({ tipo: z.literal("habilidad"), id: habilidadId, min: nivel, valor: z.number().int() }),
]);
const valor = z.union([
  z.number().int(),
  z.strictObject({ base: z.number().int(), siMin: siMin.optional() }),
  z.strictObject({
    porNivelEmpleado: z.number(),
    porCadaNiveles: z.strictObject({ cada: z.number().int().min(1), minimo: z.number().int() }).optional(),
  }),
  z.strictObject({ manual: z.string().min(1) }),
]);

// Campos comunes de todo efecto con alcance (v2). `borrador`: índice del efecto en
// docs/modelado-dotes.json del que sale (el generador puede partir uno en dos o
// convertir un texto en efecto real; el test de recuento lo usa para casar).
const comunes = {
  requisitoAlcance: requisitoSimpleSchema.optional(),
  condicionFicha: z.literal("no_fatigado").optional(),
  filtroArma: z
    .strictObject({
      empleo: z.enum(["una mano", "dos manos"]).optional(),
      tipoDanio: z.array(z.string().min(1)).optional(),
      desarmado: z.literal(true).optional(),
    })
    .optional(),
  borrador: z.number().int().min(0),
};

const resolucionDote = z.discriminatedUnion("tipo", [
  z.strictObject({ tipo: z.literal("sin_dado") }),
  z.strictObject({
    tipo: z.literal("tirada"),
    aplicado: aplicadoId,
    habilidad: habilidadId,
    especialidad: z.union([idEspecialidad, z.array(idEspecialidad).min(2)]).optional(),
    dificultad: valor.optional(),
  }),
  z.strictObject({
    tipo: z.literal("enfrentada"),
    aplicado: aplicadoId,
    habilidad: habilidadId,
    especialidad: z.union([idEspecialidad, z.array(idEspecialidad).min(2)]).optional(),
  }),
  z.strictObject({
    tipo: z.literal("ataque"),
    aplicado: aplicadoId,
    habilidad: habilidadId,
    especialidad: z.union([idEspecialidad, z.array(idEspecialidad).min(2)]).optional(),
    modificador: z.number().int().optional(),
  }),
]);

export const accionDoteSchema = z.strictObject({
  id: z.string().regex(/^dotes_[a-z0-9_]+$/),
  label: z.string().min(1),
  economia,
  limite,
  resolucion: resolucionDote,
  objetivoTira: z.array(z.strictObject({ que: z.string().min(1), grados: z.partialRecord(grado, z.string().min(1)).optional() })),
  resultados: z.partialRecord(grado, z.strictObject({ texto: z.string().min(1) })),
  notas: z.array(z.strictObject({ texto: z.string().min(1), condicion })),
  // Grupo fijo de Acciones donde la acción sale además de la sección Dotes (§9.3, UX propia:
  // Traicionero «pudiendo usarse como tirada de iniciativa»). Lo pone el generador.
  grupoExtra: z.enum(["Defensa", "Salvaciones", "Iniciativa", "Acciones"]).optional(),
});

export const PORQUES_TEXTO = ["tablero", "turno", "tercero", "area_sin_construir", "sin_regla", "narrativo"] as const;

export const efectoDoteSchema = z.discriminatedUnion("tipo", [
  z.strictObject({
    tipo: z.literal("bono"),
    alcance,
    valor,
    condicion,
    sobre: z.enum(["tirada", "danio"]).optional(),
    // "<id de condición>:<id de opción>": el bono depende de la opción elegida en otra
    // condición de la tirada ("tramo:larga"; "movimiento_oculto:total").
    tramo: z.string().regex(/^[a-z_]+:[a-z_]+$/).optional(),
    soloEspecialidad: z.boolean().optional(),
    // Extensión propuesta en docs/modelado-dotes.md §3.2 (Tirador de Larga Distancia
    // Avanzado): no se suma con la básica en ese alcance.
    noAcumulaCon: z.array(z.string().regex(ID_DOTE)).optional(),
    ...comunes,
  }),
  z.strictObject({
    tipo: z.literal("cambia_par"),
    alcance,
    aplicado: aplicadoId.optional(),
    habilidad: habilidadId.optional(),
    especialidad: idEspecialidad.optional(),
    condicion,
    ...comunes,
  }),
  z.strictObject({ tipo: z.literal("margen_critico"), alcance, valor: z.number().int().min(0), condicion, ...comunes }),
  z.strictObject({ tipo: z.literal("sube_grado"), alcance, de: grado, a: grado, condicion, ...comunes }),
  z.strictObject({
    tipo: z.literal("ventaja"),
    alcance,
    condicion,
    coste: z.strictObject({ fatiga: z.number().int().min(1) }).optional(),
    ...comunes,
  }),
  z.strictObject({ tipo: z.literal("exito_extra"), alcance, exitos: z.number().int().min(1), condicion, ...comunes }),
  z.strictObject({ tipo: z.literal("danio_por_exitos"), alcance, condicion, ...comunes }),
  z.strictObject({ tipo: z.literal("categoria_danio"), alcance, a: z.string().min(1), condicion, ...comunes }),
  z.strictObject({ tipo: z.literal("economia"), alcance, economia, limite: limite.optional(), condicion, ...comunes }),
  z.strictObject({ tipo: z.literal("habilita"), accion: alcance, borrador: comunes.borrador }),
  // Cuenta `unidades` menos en un contador de la tirada, sin bajar de su mínimo (§9.3, UX
  // propia: Reflejos Felinos, un atacante adicional menos en la esquiva). Lo pone el
  // generador (CONVERSIONES); hoy solo el de atacantes adicionales.
  z.strictObject({
    tipo: z.literal("descuento_contador"),
    alcance,
    contador: z.literal("atacantes_adicionales"),
    unidades: z.number().int().min(1),
    borrador: comunes.borrador,
  }),
  z.strictObject({ tipo: z.literal("accion"), accion: accionDoteSchema, borrador: comunes.borrador }),
  // AccionPoder del modelo de psiónica (+ disciplinaNivel, sobreArma…): forma abierta
  // a propósito hasta su tanda (D2c-2), que la validará contra poderes.ts.
  z.strictObject({
    tipo: z.literal("poder"),
    accion: z.looseObject({ id: z.string().regex(/^dotes_[a-z0-9_]+$/), label: z.string().min(1) }),
    borrador: comunes.borrador,
  }),
  z.strictObject({
    tipo: z.literal("texto"),
    lugar: alcance, // o "ficha"
    texto: z.string().min(1),
    condicion,
    grados: z.array(grado).min(1).optional(), // solo tras ese resultado (efectoCritico si es "critico")
    porque: z.enum(PORQUES_TEXTO),
    // Como en los efectos con alcance: requisito por rama y filtro de arma (D2b-1).
    requisitoAlcance: comunes.requisitoAlcance,
    filtroArma: comunes.filtroArma,
    borrador: comunes.borrador,
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
  efectos: z.array(efectoDoteSchema),
  // Límites de la dote sin acción propia (DATO) y patrón de UX candidato (§9.3).
  limite,
  candidataUX: z.string().min(1).nullable(),
  // Uno por efecto, mismo índice (docs/motor.md). Lo pone el generador.
  motor: z.array(motorMetadataSchema),
});

export type RequisitoDoteSimple = z.infer<typeof requisitoSimpleSchema>;
export type RequisitoDote = z.infer<typeof requisitoDoteSchema>;
export type EleccionDote = z.infer<typeof eleccionDoteSchema>;
export type EfectoDote = z.infer<typeof efectoDoteSchema>;
export type AccionDote = z.infer<typeof accionDoteSchema>;
export type ValorDote = z.infer<typeof valor>;
export type DoteCatalogo = z.infer<typeof doteCatalogoSchema>;
