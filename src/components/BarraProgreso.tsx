"use client";

import { useEffect, useState } from "react";

// Barra de progreso real (no decorativa): arranca en 0 y transiciona a 100%
// en exactamente `ms`, así que el relleno siempre acaba justo cuando dispara
// el timeout que la acompaña — nunca se queda a medias ni salta de golpe. El
// doble requestAnimationFrame es el truco de siempre para que el navegador
// pinte el 0% antes de animar a 100%; si no, no hay transición que ver.
//
// Compartida por TiendaTab (confirmación de "vinculando" al equipar algo) y
// TiradaModal (el dado "rodando" antes del resultado) — mismo lenguaje
// visual de "el sistema está trabajando" en los dos sitios donde hace falta,
// en vez de reinventarlo. `className` decide el color/glow del relleno; el
// track siempre es el mismo.
export function BarraProgreso({
  ms,
  className = "bg-info shadow-glow-cyan",
}: {
  ms: number;
  className?: string;
}) {
  const [lleno, setLleno] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setLleno(true)));
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <span className="mt-1.5 block h-1 w-full overflow-hidden bg-night">
      <span
        className={`block h-full ${className}`}
        style={{
          width: lleno ? "100%" : "0%",
          transitionProperty: "width",
          transitionDuration: `${ms}ms`,
          transitionTimingFunction: "linear",
        }}
      />
    </span>
  );
}
