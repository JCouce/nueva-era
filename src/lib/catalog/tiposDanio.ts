// Tipos de daño (docs/sistema.md §7). Datos puros: los usan el blindaje (blindaje.ts, que
// los reexporta) y las Armas Modificadas (armasModificadas.ts) sin importarse entre sí.
export const TIPOS_DANIO = [
  { id: "cinetico", label: "Cinético" },
  { id: "electrico", label: "Eléctrico" },
  { id: "fuego", label: "Fuego" },
  { id: "frio", label: "Frío" },
  { id: "corrosivo", label: "Corrosivo" },
  { id: "plasma", label: "Plasma" },
  { id: "sonico", label: "Sónico" },
  { id: "toxico", label: "Tóxico" },
  { id: "mental", label: "Mental" },
] as const;
export type TipoDanio = (typeof TIPOS_DANIO)[number]["id"];
