// Catálogo de especies.
//
// ⚠ PROVISIONAL. El diseñador aún no ha enviado el documento de especies; estas
// dos son andamio para poder construir y probar el motor de modificadores. Sus
// nombres salen del material existente (los arkorü aparecen en el equipamiento
// como los forjadores del kerzul y los técnicos de la pistola Norgul), pero
// **los modificadores son inventados** y hay que sustituirlos en cuanto llegue
// el documento real.
//
// Añadir las especies definitivas es solo añadir entradas a esta lista.
import type { Modificador } from "../rules/modificadores";

export type Especie = {
  id: string;
  label: string;
  descripcion: string;
  modificadores: Modificador[];
  // Mientras sea true, la ficha avisa de que los números no son oficiales.
  provisional: boolean;
};

export const ESPECIES: Especie[] = [
  {
    id: "humano",
    label: "Humano",
    descripcion:
      "La referencia del sistema: sin ventajas ni penalizaciones de especie.",
    modificadores: [],
    provisional: true,
  },
  {
    id: "arkoru",
    label: "Arkorü",
    descripcion:
      "Originarios de Gülqar, un planeta forjado por impactos cataclísmicos. Metalúrgicos de tradición ancestral: suyo es el kerzul y las armas que solo ellos saben trabajar.",
    modificadores: [
      { tipo: "atributo", id: "aguante", valor: 1 },
      { tipo: "atributo", id: "caracter", valor: -1 },
      { tipo: "habilidad", id: "tecnociencia", valor: 1 },
    ],
    provisional: true,
  },
];

export function especiePorId(id: string | null): Especie | null {
  if (!id) return null;
  return ESPECIES.find((e) => e.id === id) ?? null;
}
