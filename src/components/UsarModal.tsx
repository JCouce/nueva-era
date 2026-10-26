"use client";

import { useState } from "react";
import { estadoInicial, type CondicionTirada, type EstadoCondiciones } from "@/lib/rules";
import { Modal } from "./Modal";
import { ControlCondicion } from "./AccionModal";

// Modal genérico para "acciones sin dado" (docs/motor.md) — activar algo,
// declarar un gasto, sin resolución de d12 de por medio. Hermano ligero de
// AccionModal.tsx: mismo lenguaje visual (Modal, ControlCondicion),
// sin dificultad/circunstancial/desglose/rodar dado, que aquí no significan nada.
export function UsarModal({
  titulo,
  nota,
  condiciones = [],
  confirmarLabel = "Usar",
  onUsar,
  onCerrar,
}: {
  titulo: string;
  nota?: string;
  condiciones?: CondicionTirada[];
  confirmarLabel?: string;
  // Ausente en piezas sin efecto que mutar (Radar nv4 "Marcar objetivo": solo
  // informa, no escribe nada en la ficha) — el botón se limita a cerrar.
  onUsar?: (estadoCondiciones: EstadoCondiciones) => void;
  onCerrar: () => void;
}) {
  const [estado, setEstado] = useState<EstadoCondiciones>(() => estadoInicial(condiciones));
  const cambiar = (id: string, valor: string | number | boolean) =>
    setEstado((e) => ({ ...e, [id]: valor }));

  const confirmar = () => {
    onUsar?.(estado);
    onCerrar();
  };

  return (
    <Modal titulo={titulo} onCerrar={onCerrar}>

      {nota && <p className="mt-2 font-sans text-prosa-sm text-soft">{nota}</p>}

      {condiciones.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-3">
          {condiciones.map((c) => (
            <ControlCondicion key={c.id} condicion={c} estado={estado} onCambiar={cambiar} />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={confirmar}
        className="clip-chamfer-sm mt-4 w-full border border-accent bg-accent py-3 font-display text-sm font-semibold uppercase tracking-wide text-black active:scale-[0.98]"
      >
        {confirmarLabel}
      </button>
    </Modal>
  );
}
