"use client";

import { type ReactNode } from "react";
import { eleccionSinTocar, montarTirada, type Accion, type AplicadoId, type FichaResuelta } from "@/lib/rules";

const ICONOS: Partial<Record<AplicadoId, ReactNode>> = {
  fortaleza: <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />,
  reflejos: <path d="M13 2L5 14h6l-1 8 8-12h-6l1-8z" />,
  voluntad: (
    <>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
};

const CORTO: Partial<Record<AplicadoId, string>> = { fortaleza: "Fort", reflejos: "Refl", voluntad: "Vol" };

const BOTON =
  "clip-chamfer-sm flex min-h-12 min-w-0 flex-1 items-center justify-center gap-1.5 border border-border bg-elevated px-1 active:scale-95";

function Icono({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

// Las tres salvaciones y la tirada libre, a un toque encima de las pestañas: no son de ninguna
// habilidad y en mesa se piden a menudo.
export function BarraSalvaciones({
  ficha,
  salvaciones,
  onAbrir,
  onLibre,
}: {
  ficha: FichaResuelta;
  salvaciones: Accion[];
  onAbrir: (t: Accion) => void;
  onLibre: () => void;
}) {
  return (
    <div className="flex gap-2">
      {salvaciones.map((s) => {
        const total = montarTirada(ficha, s, eleccionSinTocar(s)).modificador;
        return (
          <button key={s.id} type="button" aria-label={s.label} onClick={() => onAbrir(s)} className={BOTON}>
            <span className="text-info">
              <Icono>{ICONOS[s.aplicado]}</Icono>
            </span>
            <span className="font-display text-xs font-semibold uppercase">{CORTO[s.aplicado] ?? s.aplicado}</span>
            <span className="font-mono text-sm text-info">{total >= 0 ? `+${total}` : total}</span>
          </button>
        );
      })}
      <button type="button" aria-label="Tirada libre" onClick={onLibre} className={BOTON}>
        <span className="text-accent">
          <Icono>
            <path d="M12 2l9 5v10l-9 5-9-5V7l9-5z" />
            <path d="M12 2v20M3 7l9 5 9-5" />
          </Icono>
        </span>
        <span className="font-display text-xs font-semibold uppercase">Libre</span>
      </button>
    </div>
  );
}
