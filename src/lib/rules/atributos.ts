// Atributos del sistema. Fuente: docs/sistema.md §2.
// Los básicos se compran; los aplicados son suma de dos básicos y jamás se persisten.

export const ATRIBUTOS = [
  { id: "fuerza", label: "Fuerza", abbr: "FUE" },
  { id: "agilidad", label: "Agilidad", abbr: "AGI" },
  { id: "aguante", label: "Aguante", abbr: "AGU" },
  { id: "percepcion", label: "Percepción", abbr: "PER" },
  { id: "inteligencia", label: "Inteligencia", abbr: "INT" },
  { id: "caracter", label: "Carácter", abbr: "CAR" },
] as const;
export type AtributoId = (typeof ATRIBUTOS)[number]["id"];

export const APLICADOS = [
  { id: "fortaleza", label: "Fortaleza", abbr: "FOR", de: ["fuerza", "aguante"] },
  { id: "potencia", label: "Potencia", abbr: "POT", de: ["fuerza", "agilidad"] },
  { id: "reflejos", label: "Reflejos", abbr: "REF", de: ["agilidad", "percepcion"] },
  { id: "voluntad", label: "Voluntad", abbr: "VOL", de: ["aguante", "caracter"] },
  { id: "perspicacia", label: "Perspicacia", abbr: "PSP", de: ["inteligencia", "percepcion"] },
  { id: "expresion", label: "Expresión", abbr: "EXP", de: ["caracter", "inteligencia"] },
] as const satisfies readonly {
  id: string;
  label: string;
  abbr: string;
  de: readonly [AtributoId, AtributoId];
}[];
export type AplicadoId = (typeof APLICADOS)[number]["id"];

// Límites y pool de creación.
export const ATRIBUTO_MIN = -1; // bajar a -1 devuelve un punto al pool
export const ATRIBUTO_MAX_CREACION = 4;
export const ATRIBUTO_MAX = 5;
export const PUNTOS_ATRIBUTOS = 10;
