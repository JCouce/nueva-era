"use client";

import { nombreCorto } from "@/lib/rules";
import { FOCO } from "./controles";
import type { ObjetivoMando } from "./tipos";

// "Objetivo: [Kira ×] [Tarsis ×]": a quién va la acción, con cada uno quitable.
export function BarraObjetivo({
  objetivos,
  onQuitar,
  vacio,
  className = "flex",
}: {
  objetivos: ObjetivoMando[];
  onQuitar: (id: string) => void;
  vacio: string;
  className?: string;
}) {
  return (
    <div className={`flex-wrap items-center gap-1.5 ${className}`}>
      <span className="mr-1 font-mono text-xs uppercase tracking-widest text-muted">Objetivo</span>
      {objetivos.length === 0 && <span className="text-muted">{vacio}</span>}
      {objetivos.map((o) => (
        <span
          key={o.id}
          className={`inline-flex items-center gap-1 border pl-2 font-semibold ${
            o.tipo === "npc" ? "border-glitch text-glitch" : "border-info text-info"
          }`}
        >
          {nombreCorto(o.nombre)}
          <button
            type="button"
            aria-label={`Quitar a ${o.nombre} del objetivo`}
            onClick={() => onQuitar(o.id)}
            className={`grid size-9 place-items-center ${FOCO}`}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
