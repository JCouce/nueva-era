"use client";

import { useState } from "react";
import { estadoInicial, type CondicionTirada, type EstadoCondiciones } from "@/lib/rules";
import { HudCard } from "./HudCard";
import { ControlCondicion } from "./AccionModal";

// Modal genérico para "acciones sin dado" (docs/motor.md) — activar algo,
// declarar un gasto, sin resolución de d12 de por medio. Hermano ligero de
// AccionModal.tsx: mismo lenguaje visual (HudCard, backdrop, ControlCondicion),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onCerrar}>
      <HudCard className="max-h-[85vh] w-full max-w-md overflow-y-auto p-4 sm:mx-4">
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-display text-lg font-semibold uppercase leading-tight">{titulo}</h2>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="shrink-0 border border-border px-2 py-1 font-mono text-xs text-muted active:scale-95"
            >
              ✕
            </button>
          </div>

          {nota && <p className="mt-2 font-sans text-[11px] leading-relaxed text-muted">{nota}</p>}

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
        </div>
      </HudCard>
    </div>
  );
}
