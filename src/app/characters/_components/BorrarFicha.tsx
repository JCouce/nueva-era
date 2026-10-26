"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
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
      {confirmando && (
        <Modal titulo={`Borrar ${nombre}`} onCerrar={() => setConfirmando(false)} className="mx-4 w-full max-w-sm p-4">
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
        </Modal>
      )}
    </>
  );
}
