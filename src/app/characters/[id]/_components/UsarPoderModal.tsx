"use client";

import type { ReactNode } from "react";
import type { DetallePoder } from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { ObjetivoTira } from "@/components/ResultadoTirada";

// Poder sin tirada (Trasladar, Sensor…): misma cabecera que el modal de tirada
// (nivel, opciones, ficha, fatiga), pero "Usar" en vez de dado. Tras usarlo se
// queda abierto con lo que tira el objetivo y, si toca, la sobrecarga.
export function UsarPoderModal({
  titulo,
  cabecera,
  bloqueo,
  usado,
  costeUsado,
  objetivoTira,
  pie,
  onUsar,
  onCerrar,
}: {
  titulo: string;
  cabecera: ReactNode;
  bloqueo: string | null;
  usado: boolean;
  costeUsado: number | null;
  objetivoTira: DetallePoder["objetivoTira"];
  pie?: ReactNode;
  onUsar: () => void;
  onCerrar: () => void;
}) {
  const botonUsar = (label: string, className: string) => (
    <button
      type="button"
      onClick={onUsar}
      disabled={Boolean(bloqueo)}
      className={`clip-chamfer-sm border border-accent bg-accent py-3 font-display text-sm font-semibold uppercase tracking-wide text-black active:scale-[0.98] disabled:border-border disabled:bg-elevated disabled:text-muted ${className}`}
    >
      {label}
    </button>
  );

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

          {usado ? (
            <div className="mt-4 border-t border-border pt-3">
              <p className="font-mono text-xs uppercase tracking-widest text-info">
                Usado{costeUsado ? ` · −${costeUsado} fatiga` : ""}
              </p>
              {objetivoTira.length > 0 && <ObjetivoTira tiradas={objetivoTira} />}
              {pie}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onCerrar}
                  className="clip-chamfer-sm border border-border py-3 font-display text-sm font-semibold uppercase tracking-wide text-muted active:scale-[0.98]"
                >
                  Cerrar
                </button>
                {botonUsar("Usar otra vez", "")}
              </div>
            </div>
          ) : (
            <>
              {cabecera}
              {botonUsar("Usar", "mt-4 w-full")}
            </>
          )}
          {bloqueo && (
            <p className="mt-2 border-l-2 border-danger pl-2 font-sans text-[11px] leading-relaxed text-danger">{bloqueo}</p>
          )}
        </div>
      </HudCard>
    </div>
  );
}
