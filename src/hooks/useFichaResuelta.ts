"use client";

import { useMemo } from "react";
import { resolverFicha, type EstadoActivo, type FichaResuelta, type Sheet } from "@/lib/rules";

// Sin combate. Constante de módulo para que la referencia no cambie en cada render
// (un `[]` literal invalidaría el useMemo de abajo siempre).
export const SIN_ESTADOS: EstadoActivo[] = [];

// La ficha resuelta una vez por cambio (propuesta-especies §3.1), compartida por
// CharacterSheet, NpcEditor y el panel de acciones de un NPC en combate. Deps sobre la
// ficha entera, sin parciales: cuesta ~1 ms y así nada se queda con un cálculo viejo
// (p. ej. el índice de casillas al cambiar de especie).
// `libre`: editor de NPC (sin costes de creación ni bolsa de aumentos, §14.3).
export function useFichaResuelta(
  sheet: Sheet,
  estadosCombate: EstadoActivo[],
  { libre = false }: { libre?: boolean } = {},
): FichaResuelta {
  return useMemo(() => resolverFicha(sheet, { estadosCombate, libre }), [sheet, estadosCombate, libre]);
}
