"use client";

import type { Lanzamiento } from "@/components/ResultadoTirada";
import { CombateTab, type CombateView } from "./CombateTab";
import { HistorialTiradas } from "./AccionesTab";

// Columna derecha de la cabina de escritorio: lo que pasa en la mesa. La cola del combate
// (en móvil, la pestaña Combate) y el log de tiradas (en móvil, arriba de Acciones).
export function MesaFicha({
  combate,
  miCombatienteId,
  historial,
}: {
  combate: CombateView | null;
  miCombatienteId: string | null;
  historial: Lanzamiento[];
}) {
  return (
    <div className="flex flex-col gap-5">
      {combate && (
        <section aria-label="Combate" className="flex flex-col gap-2">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-neon-magenta">{"//en combate"}</h2>
          <CombateTab combate={combate} miCombatienteId={miCombatienteId} compacta />
        </section>
      )}
      <section aria-label="Tiradas recientes" className="flex flex-col gap-2">
        <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted">{"//tiradas recientes"}</h2>
        <HistorialTiradas historial={historial} destacada />
      </section>
    </div>
  );
}
