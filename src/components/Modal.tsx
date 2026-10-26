"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { HudCard } from "./HudCard";

// Pila de modales abiertos (ids, el último es el de arriba): con uno abierto desde otro
// (Fabricar → AccionModal), Escape cierra solo el de encima.
const pila: string[] = [];

// Modal centrado común. Portal a body: dentro de una HudCard un `fixed` queda atrapado
// debajo del resto de la página (selector de especie, 2026-10-13), y Safari/iOS encoge un
// `fixed` anidado en un contenedor con scroll propio al tamaño de ese contenedor
// (Fabricar, 2026-09-25).
// Cierra con Escape y tocando el fondo; el fondo es un botón aparte (como HojaInferior)
// para que arrastrar desde dentro de la tarjeta y soltar fuera no lo cierre.
// Con `titulo` pinta la cabecera de siempre (título + ✕); sin él, cada modal pone la suya
// y da `ariaLabel`.
export function Modal({
  onCerrar,
  cerrable = true,
  className = "max-h-[85vh] w-full max-w-md overflow-y-auto p-4 sm:mx-4",
  children,
  ...cabecera
}: {
  onCerrar: () => void;
  // false: ni Escape ni el fondo cierran (AccionModal mientras rueda el dado).
  cerrable?: boolean;
  className?: string;
  children: ReactNode;
} & ({ titulo: string; ariaLabel?: never } | { titulo?: never; ariaLabel: string })) {
  const id = useId();
  const tituloId = `${id}-titulo`;
  // En refs para no volver a suscribir (ni recolocarse en la pila) en cada render.
  const cerrarRef = useRef(onCerrar);
  const cerrableRef = useRef(cerrable);
  useEffect(() => {
    cerrarRef.current = onCerrar;
    cerrableRef.current = cerrable;
  });

  useEffect(() => {
    pila.push(id);
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || pila[pila.length - 1] !== id) return;
      if (cerrableRef.current) cerrarRef.current();
    };
    document.addEventListener("keydown", alPulsar);
    return () => {
      document.removeEventListener("keydown", alPulsar);
      const i = pila.lastIndexOf(id);
      if (i >= 0) pila.splice(i, 1);
    };
  }, [id]);

  return createPortal(
    // Los eventos de React suben por el árbol de componentes aunque el DOM esté en body:
    // sin cortarlos aquí, un click dentro del modal llegaría a los onClick de quien lo monta.
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label="Cerrar"
        tabIndex={-1}
        onClick={cerrable ? onCerrar : undefined}
        className="absolute inset-0 bg-night/70"
      />
      <HudCard className={`relative ${className}`}>
        <div
          role="dialog"
          aria-modal="true"
          {...(cabecera.titulo ? { "aria-labelledby": tituloId } : { "aria-label": cabecera.ariaLabel })}
        >
          {cabecera.titulo && (
            <div className="flex items-start justify-between gap-2">
              <h2 id={tituloId} className="font-display text-lg font-semibold uppercase leading-tight">
                {cabecera.titulo}
              </h2>
              <button
                type="button"
                onClick={onCerrar}
                aria-label="Cerrar"
                className="shrink-0 border border-border px-2 py-1 font-mono text-xs text-muted active:scale-95"
              >
                ✕
              </button>
            </div>
          )}
          {children}
        </div>
      </HudCard>
    </div>,
    document.body,
  );
}
