// Habilidades del sistema. Fuente: docs/sistema.md §3.
// Cada habilidad tiene un valor y una lista de especialidades: dentro de la
// especialidad se usa el valor entero, fuera la mitad redondeando hacia arriba.

export const HABILIDADES = [
  { id: "actitud", label: "Actitud" },
  { id: "atletismo", label: "Atletismo" },
  { id: "biociencia", label: "Biociencia" },
  { id: "combate_distancia", label: "Combate a Distancia" },
  { id: "combate_melee", label: "Combate Melee" },
  { id: "cultura", label: "Cultura" },
  { id: "interpretacion", label: "Interpretación" },
  { id: "sigilo", label: "Sigilo" },
  { id: "supervivencia", label: "Supervivencia" },
  { id: "tecnociencia", label: "Tecnociencia" },
] as const;
export type HabilidadId = (typeof HABILIDADES)[number]["id"];

export const HABILIDAD_NO_ENTRENADA = -1;
export const HABILIDAD_MIN_ENTRENADA = 1;
// El pool de creación ya no es una constante: sale de la letra de prioridad
// asignada a Habilidades (ver prioridad.ts, PUNTOS_HABILIDADES_POR_LETRA).
export const HABILIDAD_MAX_CREACION = 4; // HOJA2: sube de 3 a 4, iguala a atributos
export const HABILIDAD_MAX = 6; // HOJA2: techo del sistema sube de 5 a 6
export const COSTE_ESPECIALIDAD_EXTRA = 1; // la primera va incluida al entrenar
export const MAX_ESPECIALIDADES = 3;

// Especialidades citadas de pasada en los documentos; no hay catálogo cerrado
// todavía (docs/sistema.md, pregunta 3), así que son texto libre y esto solo
// alimenta sugerencias en la UI.
export const ESPECIALIDADES_CONOCIDAS: Partial<Record<HabilidadId, string[]>> = {
  tecnociencia: ["Mecánica"],
  biociencia: ["Medicina", "Química", "Bioquímica"],
  actitud: ["Empatía", "Manipulación", "Liderazgo"],
  combate_melee: ["Pelea"],
};
