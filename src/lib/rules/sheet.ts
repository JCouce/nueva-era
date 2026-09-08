// La ficha: forma, validación y lectura tolerante desde la base de datos.
// Vive como Json en Character.stats, así que este módulo es la única frontera
// entre "lo que hay guardado" y "lo que el motor asume".
import { z } from "zod";
import {
  ATRIBUTOS,
  ATRIBUTO_MIN,
  ATRIBUTO_MAX,
} from "./atributos";
import { migrar } from "./migraciones";
import {
  HABILIDADES,
  HABILIDAD_NO_ENTRENADA,
  HABILIDAD_MIN_ENTRENADA,
  HABILIDAD_MAX,
  MAX_ESPECIALIDADES,
} from "./habilidades";
import { piezaEquipadaSchema, type PiezaEquipada } from "./equipo";

// Versión del formato de ficha. Al subirla hay que añadir su migración en
// migraciones.ts y el test que la cubre.
//   1 → primera versión versionada
//   2 → la especie pasa de texto libre a id del catálogo
//   3 → se añade el equipo instalado
export const SCHEMA_VERSION = 3;

const atributoValue = z.number().int().min(ATRIBUTO_MIN).max(ATRIBUTO_MAX);

const habilidadValue = z.object({
  valor: z.number().int().min(HABILIDAD_NO_ENTRENADA).max(HABILIDAD_MAX),
  especialidades: z.array(z.string().trim().min(1).max(40)).max(MAX_ESPECIALIDADES),
});

const atributosShape = Object.fromEntries(
  ATRIBUTOS.map((a) => [a.id, atributoValue]),
) as Record<(typeof ATRIBUTOS)[number]["id"], typeof atributoValue>;

const habilidadesShape = Object.fromEntries(
  HABILIDADES.map((h) => [h.id, habilidadValue]),
) as Record<(typeof HABILIDADES)[number]["id"], typeof habilidadValue>;

export const sheetSchema = z.object({
  schemaVersion: z.number().int().min(1),
  edad: z.number().int().min(0).max(999).nullable(),
  especieId: z.string().max(40).nullable(),
  trasfondo: z.string().max(2000),
  motivacion: z.string().max(500),
  atributos: z.object(atributosShape),
  habilidades: z.object(habilidadesShape),
  equipo: z.array(piezaEquipadaSchema).max(200),
});

export type Sheet = z.infer<typeof sheetSchema>;

export function defaultSheet(): Sheet {
  return {
    schemaVersion: SCHEMA_VERSION,
    edad: null,
    especieId: null,
    trasfondo: "",
    motivacion: "",
    atributos: Object.fromEntries(
      ATRIBUTOS.map((a) => [a.id, 0]),
    ) as Sheet["atributos"],
    habilidades: Object.fromEntries(
      HABILIDADES.map((h) => [
        h.id,
        { valor: HABILIDAD_NO_ENTRENADA, especialidades: [] as string[] },
      ]),
    ) as Sheet["habilidades"],
    equipo: [],
  };
}

export function clampInt(
  v: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

// Lectura tolerante: el Json puede traer fichas incompletas, de formatos previos
// o con valores fuera de rango. Nunca lanza; en el peor caso devuelve la ficha
// por defecto. OJO: esto recorta y descarta en silencio, que sirve para no
// romper la página pero NO sustituye a una migración.
export function parseSheet(raw: unknown): Sheet {
  const base = defaultSheet();
  if (!raw || typeof raw !== "object") return base;
  // Primero se lleva la ficha al formato actual; después se normaliza.
  const { ficha: r } = migrar(raw, SCHEMA_VERSION);

  const rAtributos = (r.atributos ?? {}) as Record<string, unknown>;
  const atributos = { ...base.atributos };
  for (const a of ATRIBUTOS) {
    atributos[a.id] = clampInt(rAtributos[a.id], ATRIBUTO_MIN, ATRIBUTO_MAX, 0);
  }

  const rHabilidades = (r.habilidades ?? {}) as Record<string, unknown>;
  const habilidades = { ...base.habilidades };
  for (const h of HABILIDADES) {
    const entry = (rHabilidades[h.id] ?? {}) as Record<string, unknown>;
    const valor = clampInt(
      entry.valor,
      HABILIDAD_NO_ENTRENADA,
      HABILIDAD_MAX,
      HABILIDAD_NO_ENTRENADA,
    );
    const especialidades = Array.isArray(entry.especialidades)
      ? entry.especialidades
          .filter((e): e is string => typeof e === "string")
          .map((e) => e.trim().slice(0, 40))
          .filter((e) => e.length > 0)
          .slice(0, MAX_ESPECIALIDADES)
      : [];
    // Sin entrenar no hay especialidad que valga.
    habilidades[h.id] =
      valor < HABILIDAD_MIN_ENTRENADA
        ? { valor: HABILIDAD_NO_ENTRENADA, especialidades: [] }
        : { valor, especialidades };
  }

  // Cada pieza se valida por separado: una entrada corrupta se descarta sin
  // tirar el resto del equipo por la borda.
  const rEquipo = Array.isArray(r.equipo) ? r.equipo : [];
  const equipo: PiezaEquipada[] = rEquipo
    .map((p) => piezaEquipadaSchema.safeParse(p))
    .filter((res): res is { success: true; data: PiezaEquipada } => res.success)
    .map((res) => res.data)
    .slice(0, 200);

  return {
    schemaVersion: clampInt(r.schemaVersion, 1, SCHEMA_VERSION, SCHEMA_VERSION),
    edad: r.edad === null || r.edad === undefined ? null : clampInt(r.edad, 0, 999, 0),
    especieId: typeof r.especieId === "string" ? r.especieId.slice(0, 40) : null,
    trasfondo: typeof r.trasfondo === "string" ? r.trasfondo.slice(0, 2000) : "",
    motivacion: typeof r.motivacion === "string" ? r.motivacion.slice(0, 500) : "",
    atributos,
    habilidades,
    equipo,
  };
}
