"use client";

import { useState } from "react";
import type { Fuente } from "@/lib/rules";

function signo(n: number) {
  return n >= 0 ? `+${n}` : `${n}`;
}

// De dónde sale un número. Pieza central y reutilizable: hoy explica la
// especie, pero es el mismo sitio donde aparecerán equipo, fatiga, estados y
// poderes según se vayan enganchando a modificadoresActivos.
//
// Táctil, no hover — se usa en móvil. Un tap despliega la lista debajo, igual
// que el resto de "tochos plegables" de la ficha (equipo usará el mismo patrón).
export function Desglose({
  total,
  fuentes,
  className = "text-base text-foreground",
}: {
  total: number;
  fuentes: Fuente[];
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);

  // Con una sola fuente no hay nada que explicar: se pinta el número a secas.
  if (fuentes.length <= 1) {
    return <span className={`font-mono tabular-nums ${className}`}>{total}</span>;
  }

  return (
    <div className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className={`flex items-center gap-1 font-mono tabular-nums active:opacity-70 ${className}`}
      >
        {total}
        <span
          className={`text-[9px] text-muted transition-transform ${abierto ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      {abierto && (
        <div className="clip-chamfer-sm mt-1 w-max min-w-32 border border-border bg-night px-2 py-1.5">
          {fuentes.map((f, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase leading-relaxed"
            >
              <span className="text-muted">{f.etiqueta}</span>
              <span className={f.valor >= 0 ? "text-info" : "text-danger"}>
                {signo(f.valor)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
