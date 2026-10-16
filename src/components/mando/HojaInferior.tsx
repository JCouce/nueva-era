"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FOCO } from "./controles";

// Hoja que sube desde abajo (móvil). Portal a body: dentro de una tarjeta un `fixed`
// queda atrapado debajo del resto de la página. Se cierra con Escape, con "Cerrar" o
// tocando fuera. `className` permite esconderla por breakpoint (lg:hidden en la Mesa,
// donde en escritorio la misma configuración va en línea).
export function HojaInferior({
  titulo,
  onCerrar,
  pie,
  children,
  className = "",
}: {
  titulo: string;
  onCerrar: () => void;
  pie?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const cerrarRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cerrarRef.current?.focus();
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [onCerrar]);

  return createPortal(
    <div className={`fixed inset-0 z-40 ${className}`}>
      <button type="button" aria-label="Cerrar" tabIndex={-1} onClick={onCerrar} className="absolute inset-0 bg-night/70" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="absolute inset-x-0 bottom-0 grid max-h-[85dvh] motion-safe:animate-[hoja-sube_.25s_ease-out] grid-rows-[auto_minmax(0,1fr)_auto] border-t-2 border-accent bg-surface"
      >
        <span aria-hidden="true" className="mx-auto mt-2 h-1 w-10 bg-border" />
        <div className="flex min-h-0 flex-col">
          <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-1">
            <h2 className="font-display text-lg font-bold">{titulo}</h2>
            <button
              ref={cerrarRef}
              type="button"
              onClick={onCerrar}
              className={`min-h-11 px-2 font-semibold text-info ${FOCO}`}
            >
              Cerrar
            </button>
          </div>
          <div className="grid min-h-0 content-start gap-4 overflow-y-auto px-4 pb-3">{children}</div>
        </div>
        {pie && <div className="border-t border-border px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">{pie}</div>}
      </div>
    </div>,
    document.body,
  );
}
