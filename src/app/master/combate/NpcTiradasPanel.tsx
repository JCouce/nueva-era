"use client";

import { useState } from "react";
import type { Sheet, EstadoActivo } from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { TiradasTab } from "@/app/characters/[id]/_components/TiradasTab";
import type { Lanzamiento } from "@/components/ResultadoTirada";

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
  // Panel bajo demanda: se desmonta al cerrar (onCerrar, en el padre), así
  // que este estado ya nacía fresco en cada apertura incluso cuando vivía
  // dentro de TiradasTab — el historial subió de nivel (2026-09-24, para que
  // sobreviva a cambiar de tab en la ficha del jugador), pero aquí no aplica
  // ese problema: no hay tabs que cambiar dentro de este panel.
  const [historial, setHistorial] = useState<Lanzamiento[]>([]);
  const [memoria, setMemoria] = useState<
    Record<string, { dificultad: number | null; circunstancial: number }>
  >({});

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
            <TiradasTab
              sheet={sheet}
              estadosCombate={estadosCombate}
              historial={historial}
              setHistorial={setHistorial}
              memoria={memoria}
              setMemoria={setMemoria}
            />
          </div>
        </div>
      </HudCard>
    </div>
  );
}
