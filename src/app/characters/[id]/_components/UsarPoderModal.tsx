"use client";

import type { ReactNode } from "react";
import type { DetallePoder } from "@/lib/rules";
import { Modal } from "@/components/Modal";
import { ObjetivoTira } from "@/components/ResultadoTirada";

// Poder sin tirada (Trasladar, Sensor…): misma cabecera que el modal de tirada
// (nivel, opciones, ficha, fatiga), pero "Usar" en vez de dado. Tras usarlo se
// queda abierto con lo que tira el objetivo y, si toca, la sobrecarga.
export function UsarPoderModal({
  titulo,
  cabecera,
  bloqueo,
  usado,
  costeUsado,
  objetivoTira,
  pie,
  onUsar,
  onCerrar,
}: {
  titulo: string;
  cabecera: ReactNode;
  bloqueo: string | null;
  usado: boolean;
  costeUsado: number | null;
  objetivoTira: DetallePoder["objetivoTira"];
  pie?: ReactNode;
  onUsar: () => void;
  onCerrar: () => void;
}) {
  const botonUsar = (label: string, className: string) => (
    <button
      type="button"
      onClick={onUsar}
      disabled={Boolean(bloqueo)}
      className={`clip-chamfer-sm border border-accent bg-accent py-3 font-display text-sm font-semibold uppercase tracking-wide text-black active:scale-[0.98] disabled:border-border disabled:bg-elevated disabled:text-muted ${className}`}
    >
      {label}
    </button>
  );

  return (
    <Modal titulo={titulo} onCerrar={onCerrar}>

      {usado ? (
        <div className="mt-4 border-t border-border pt-3">
          <p className="font-mono text-xs uppercase tracking-widest text-info">
            Usado{costeUsado ? ` · −${costeUsado} fatiga` : ""}
          </p>
          {objetivoTira.length > 0 && <ObjetivoTira tiradas={objetivoTira} />}
          {pie}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onCerrar}
              className="clip-chamfer-sm border border-border py-3 font-display text-sm font-semibold uppercase tracking-wide text-muted active:scale-[0.98]"
            >
              Cerrar
            </button>
            {botonUsar("Usar otra vez", "")}
          </div>
        </div>
      ) : (
        <>
          {cabecera}
          {botonUsar("Usar", "mt-4 w-full")}
        </>
      )}
      {bloqueo && (
        <p className="mt-2 border-l-2 border-danger pl-2 font-sans text-prosa-sm text-danger">{bloqueo}</p>
      )}
    </Modal>
  );
}
