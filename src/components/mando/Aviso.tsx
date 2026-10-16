"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { AvisoMando } from "./tipos";
import { FOCO } from "./controles";

const DURACION_MS = 4200;

// El aviso tras cada acción, abajo y centrado (en móvil, por encima de la barra de
// pestañas), con "Deshacer" si la acción dejó entrada en el registro.
export function Aviso({
  aviso,
  onCerrar,
  onDeshacer,
}: {
  aviso: AvisoMando | null;
  onCerrar: () => void;
  onDeshacer: (registroId: string) => void;
}) {
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(onCerrar, DURACION_MS);
    return () => clearTimeout(t);
  }, [aviso, onCerrar]);

  if (!aviso) return null;
  const { registroId } = aviso;
  return createPortal(
    <div
      role="status"
      className={`fixed bottom-24 left-1/2 z-50 flex w-max max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-4 border bg-elevated py-2 pl-4 pr-2 shadow-lg motion-safe:animate-[aviso-entra_.25s_ease-out] lg:bottom-6 ${
        aviso.tono === "ok" ? "border-neon-green" : "border-neon-orange"
      }`}
    >
      <span className="font-semibold">{aviso.mensaje}</span>
      {registroId && (
        <button
          type="button"
          onClick={() => {
            onDeshacer(registroId);
            onCerrar();
          }}
          className={`min-h-11 shrink-0 px-2 font-bold text-accent ${FOCO}`}
        >
          Deshacer
        </button>
      )}
    </div>,
    document.body,
  );
}
