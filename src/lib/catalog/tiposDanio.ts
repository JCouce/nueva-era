// Tipos de daño (docs/sistema.md §7). Datos puros: los usan el blindaje (blindaje.ts, que
// los reexporta) y las Armas Modificadas (armasModificadas.ts) sin importarse entre sí.
//
// `categoria`: gravedad del daño específico (docs/fuente/reglas-base.md, "Daño Específico");
// `categoriaCritico`, la que toma en crítico si cambia. Cinético no tiene: la pone el arma.
export const TIPOS_DANIO = [
  { id: "cinetico", label: "Cinético", categoria: null },
  { id: "electrico", label: "Eléctrico", categoria: "Letal", categoriaCritico: "Grave" },
  { id: "fuego", label: "Fuego", categoria: "Grave" },
  { id: "frio", label: "Frío", categoria: "No Letal", categoriaCritico: "Letal" },
  { id: "corrosivo", label: "Corrosivo", categoria: "Grave" },
  { id: "plasma", label: "Plasma", categoria: "Grave" },
  { id: "sonico", label: "Sónico", categoria: "No Letal", categoriaCritico: "Letal" },
  { id: "toxico", label: "Tóxico", categoria: "Letal" },
  { id: "mental", label: "Mental", categoria: "Letal" },
] as const;
export type TipoDanio = (typeof TIPOS_DANIO)[number]["id"];
