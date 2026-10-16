"use client";

import { useEffect, useState } from "react";
import { haceCuanto } from "@/lib/rules";
import { FOCO } from "./controles";

// Una entrada del registro ya lista para pintar (el texto lo arma el servidor con
// textoEntradaRegistro).
export type EntradaMando = {
  id: string;
  creadaEn: number;
  texto: string;
  motivo: string | null;
  deshecha: boolean;
  // false si lo guardado no se entiende (formato viejo): se lista, no se deshace.
  deshacible: boolean;
};

const REFRESCO_HORA_MS = 30_000;

export function RegistroMando({
  entradas,
  generadoEn,
  errores,
  deshaciendo,
  onDeshacer,
}: {
  entradas: EntradaMando[];
  // Hora del servidor al pintar: la primera "hace X" sale igual en servidor y cliente.
  generadoEn: number;
  errores: Record<string, string>;
  deshaciendo: string | null;
  onDeshacer: (id: string) => void;
}) {
  const [ahora, setAhora] = useState(generadoEn);
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), REFRESCO_HORA_MS);
    return () => clearInterval(t);
  }, []);
  // Una entrada recién creada no puede ser "del futuro" si el reloj del cliente va atrás.
  const referencia = Math.max(ahora, generadoEn);

  if (entradas.length === 0) {
    return <p className="border border-dashed border-border px-3 py-4 text-muted">Aún no has hecho nada en esta mesa.</p>;
  }
  return (
    <ol className="grid gap-2">
      {entradas.map((e) => (
        <li
          key={e.id}
          className={`grid gap-1.5 border border-border bg-surface p-2.5 ${e.deshecha ? "opacity-55" : ""}`}
        >
          <span className="font-mono text-xs tracking-wide text-muted">
            {haceCuanto(e.creadaEn, referencia)}
            {e.deshecha && " · deshecho"}
          </span>
          <span className={`leading-snug ${e.deshecha ? "line-through" : ""}`}>{e.texto}</span>
          {e.motivo && <span className="text-sm italic text-muted">«{e.motivo}»</span>}
          {errores[e.id] && (
            <span role="alert" className="text-sm text-neon-orange">
              {errores[e.id]}
            </span>
          )}
          {!e.deshecha && (
            <div className="flex justify-end">
              {e.deshacible ? (
                <button
                  type="button"
                  onClick={() => onDeshacer(e.id)}
                  disabled={deshaciendo !== null}
                  className={`min-h-11 border border-border px-3 font-bold transition hover:border-glitch hover:text-glitch disabled:text-muted ${FOCO}`}
                >
                  {deshaciendo === e.id ? "Deshaciendo…" : "Deshacer"}
                </button>
              ) : (
                <span className="text-sm text-muted">No se puede deshacer (formato antiguo).</span>
              )}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
