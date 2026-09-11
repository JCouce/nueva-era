"use client";

import type { Sheet, EstadoActivo } from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { TiradasTab } from "@/app/characters/[id]/_components/TiradasTab";

// Fase 6b, subtarea 5.5 (el motivo original de todo el rediseño del bloque
// 5): mismo TiradasTab.tsx que ya usa el jugador, alimentado por el `sheet`
// y los `estados` congelados del Combatiente (no los de la plantilla, que
// puede haber cambiado desde que se añadió — mismo criterio de "foto" que
// el resto de `Combatiente`). Un panel bajo demanda, uno a la vez — con
// 30-50 combatientes en la cola, montar un TiradasTab por fila sería
// bastante trabajo de más para lo que se ve en pantalla en cada momento.
// Mismo lenguaje visual que TiradaModal.tsx (el modal que TiradasTab abre
// por dentro al pulsar "Tirar" queda encima de este, sin conflicto: cada
// overlay cierra solo con su propio fondo).
export function NpcTiradasPanel({
  nombre,
  sheet,
  estadosCombate,
  onCerrar,
}: {
  nombre: string;
  sheet: Sheet;
  estadosCombate: EstadoActivo[];
  onCerrar: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 sm:items-center"
      onClick={onCerrar}
    >
      <HudCard className="max-h-[85vh] w-full max-w-md overflow-y-auto p-4 sm:mx-4">
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-2 border-b border-border pb-2">
            <h2 className="truncate font-display text-lg font-semibold uppercase leading-tight">
              {nombre}
            </h2>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="shrink-0 border border-border px-2 py-1 font-mono text-xs text-muted active:scale-95"
            >
              Cerrar
            </button>
          </div>
          <div className="mt-3">
            <TiradasTab sheet={sheet} estadosCombate={estadosCombate} />
          </div>
        </div>
      </HudCard>
    </div>
  );
}
