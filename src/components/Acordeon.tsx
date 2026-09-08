"use client";

import { useState, type ReactNode } from "react";
import { HudCard } from "./HudCard";

// El "tocho plegable": card cerrada con nombre + resumen de una línea; un tap
// despliega el detalle completo debajo. Mismo lenguaje visual del HUD, mismo
// criterio táctil que Desglose (sin hover, es para móvil). Pensado para el
// equipo (un arma cabe en una fila, un subsistema no), pero es genérico.
export function Acordeon({
  titulo,
  resumen,
  etiqueta,
  children,
  defaultAbierto = false,
}: {
  titulo: string;
  resumen: string;
  etiqueta?: ReactNode;
  children: ReactNode;
  defaultAbierto?: boolean;
}) {
  const [abierto, setAbierto] = useState(defaultAbierto);

  return (
    <HudCard className="p-3">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          className="flex min-w-0 flex-1 items-start justify-between gap-2 text-left"
        >
          <div className="min-w-0">
            <span className="truncate font-display text-base font-semibold uppercase leading-none">
              {titulo}
            </span>
            <p className="mt-1 font-sans text-xs leading-snug text-muted">{resumen}</p>
          </div>
          <span
            className={`mt-0.5 shrink-0 font-mono text-[9px] text-muted transition-transform ${abierto ? "rotate-180" : ""}`}
          >
            ▾
          </span>
        </button>
        {etiqueta && <div className="shrink-0">{etiqueta}</div>}
      </div>
      {abierto && <div className="mt-3 border-t border-border pt-3">{children}</div>}
    </HudCard>
  );
}
