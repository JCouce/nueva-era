"use client";

import { useState } from "react";
import { HudCard } from "./HudCard";

// Modal para "acciones sin dado" (docs/motor.md) que sacrifican una cantidad
// ELEGIDA por el jugador de un RECURSO — a diferencia de UsarModal (gasto
// fijo o ninguno), aquí el número lo decide él mismo con un contador,
// acotado a lo que tenga disponible, y ve el resultado antes de confirmar.
// Primer y único caso real: "Detonar pulso térmico" (Malla Plasmática,
// docs/tareas.md 2026-09-28) — antes el jugador calculaba el daño a mano y
// se descontaba el colchón aparte en Recursos; ahora las dos cosas pasan
// aquí. `previewTexto` vive en quien la abre (AccionesTab.tsx), no aquí:
// cada pieza tiene su propia fórmula de resultado (hoy 1:1, colchón = daño),
// este modal no sabe nada de plasma ni de ninguna regla concreta.
export function SacrificioRecursoModal({
  titulo,
  nota,
  recursoActual,
  unidadRecurso = "puntos",
  previewTexto,
  confirmarLabel = "Confirmar",
  onConfirmar,
  onCerrar,
}: {
  titulo: string;
  nota?: string;
  recursoActual: { actual: number; max: number };
  unidadRecurso?: string;
  previewTexto: (puntos: number) => string;
  confirmarLabel?: string;
  onConfirmar: (puntos: number) => void;
  onCerrar: () => void;
}) {
  const [puntos, setPuntos] = useState(0);
  const clamp = (n: number) => Math.max(0, Math.min(recursoActual.actual, n));

  const confirmar = () => {
    if (puntos <= 0) return;
    onConfirmar(puntos);
    onCerrar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onCerrar}>
      <HudCard className="max-h-[85vh] w-full max-w-md overflow-y-auto p-4 sm:mx-4">
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-display text-lg font-semibold uppercase leading-tight">{titulo}</h2>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="shrink-0 border border-border px-2 py-1 font-mono text-xs text-muted active:scale-95"
            >
              ✕
            </button>
          </div>

          {nota && <p className="mt-2 font-sans text-[11px] leading-relaxed text-muted">{nota}</p>}

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {`Sacrificar ${unidadRecurso} (tienes ${recursoActual.actual}/${recursoActual.max})`}
              </p>
              <p className="mt-1 font-sans text-[12px] leading-relaxed text-accent">{previewTexto(puntos)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setPuntos((n) => clamp(n - 1))}
                disabled={puntos <= 0}
                aria-label={`Bajar ${unidadRecurso}`}
                className="h-9 w-9 border border-border bg-elevated font-mono text-lg leading-none text-muted active:scale-95 disabled:opacity-30"
              >
                −
              </button>
              <span className="w-10 text-center font-mono text-xl tabular-nums text-foreground">{puntos}</span>
              <button
                type="button"
                onClick={() => setPuntos((n) => clamp(n + 1))}
                disabled={puntos >= recursoActual.actual}
                aria-label={`Subir ${unidadRecurso}`}
                className="h-9 w-9 border border-border bg-elevated font-mono text-lg leading-none text-muted active:scale-95 disabled:opacity-30"
              >
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={confirmar}
            disabled={puntos <= 0}
            className="clip-chamfer-sm mt-4 w-full border border-accent bg-accent py-3 font-display text-sm font-semibold uppercase tracking-wide text-black active:scale-[0.98] disabled:border-border disabled:bg-elevated disabled:text-muted"
          >
            {confirmarLabel}
          </button>
        </div>
      </HudCard>
    </div>
  );
}
