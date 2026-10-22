"use client";

import { useMemo } from "react";
import { resolverFicha, type EstadoActivo, type FichaResuelta, type Sheet, type VitalidadActual } from "@/lib/rules";

// Sin estados. Constante de módulo para que la referencia no cambie en cada render
// (un `[]` literal invalidaría el useMemo de abajo siempre).
export const SIN_ESTADOS: EstadoActivo[] = [];

// La ficha resuelta una vez por cambio (propuesta-especies §3.1), compartida por
// CharacterSheet, NpcEditor y el panel de acciones de un NPC en combate. Deps sobre la
// ficha entera, sin parciales: cuesta ~1 ms y así nada se queda con un cálculo viejo
// (p. ej. el índice de casillas al cambiar de especie).
// `vitalidad`: de dónde salen la vida/fatiga de los umbrales (VITALIDAD_DE_FICHA fuera
// de combate, la fila del combatiente dentro). Referencia estable: memorizarla fuera.
// `libre`: editor de NPC (sin costes de creación ni bolsa de aumentos, §14.3).
// `aprobada`: ficha aprobada, sube con XP (las rebajas de coste de los aumentos, A1).
export function useFichaResuelta(
  sheet: Sheet,
  estados: EstadoActivo[],
  vitalidad: VitalidadActual,
  { libre = false, aprobada = false }: { libre?: boolean; aprobada?: boolean } = {},
): FichaResuelta {
  return useMemo(
    () => resolverFicha(sheet, { estados, vitalidad, libre, aprobada }),
    [sheet, estados, vitalidad, libre, aprobada],
  );
}
