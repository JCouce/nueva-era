"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { HudCard } from "@/components/HudCard";
import { deleteCharacter } from "../actions";

// El primer intento va sin confirmar: si la ficha no tiene trabajo, el servidor la borra
// sin más; si lo tiene, contesta "confirmar" y sale el modal.
export function BorrarFicha({ id, nombre }: { id: string; nombre: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [pendiente, empezar] = useTransition();

  const borrar = (confirmado: boolean) =>
    empezar(async () => {
      const res = await deleteCharacter({ id, confirmado });
      setConfirmando("confirmar" in res);
    });

  return (
    <>
      <button
        type="button"
        onClick={() => borrar(false)}
        disabled={pendiente}
        className="px-2 py-1 font-mono text-xs uppercase tracking-wide text-muted transition hover:text-danger disabled:opacity-40"
        aria-label={`Borrar ${nombre}`}
      >
        Borrar
      </button>
      {confirmando &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
            onClick={() => setConfirmando(false)}
          >
            <HudCard className="w-full max-w-sm p-4">
              <div role="dialog" aria-modal="true" aria-labelledby="borrar-titulo" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-2">
                  <h2 id="borrar-titulo" className="font-display text-lg font-semibold uppercase leading-tight">
                    Borrar {nombre}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setConfirmando(false)}
                    aria-label="Cerrar"
                    className="shrink-0 border border-border px-2 py-1 font-mono text-xs text-muted active:scale-95"
                  >
                    ✕
                  </button>
                </div>
                <p className="mt-2 font-sans text-prosa-sm text-soft">
                  Esta ficha ya tiene trabajo. Dejará de aparecer en las listas.
                </p>
                <button
                  type="button"
                  onClick={() => borrar(true)}
                  disabled={pendiente}
                  className="clip-chamfer-sm mt-4 w-full border border-danger bg-danger py-3 font-display text-sm font-semibold uppercase tracking-wide text-black active:scale-[0.98] disabled:opacity-50"
                >
                  Confirmar
                </button>
              </div>
            </HudCard>
          </div>,
          document.body,
        )}
    </>
  );
}
