"use client";

import {
  alternarModificacion,
  opcionesModificacion,
  resumenArmaModificada,
  type ArmaMelee,
  type ModificacionArmaId,
} from "@/lib/rules";
import { DetalleArmaModificada } from "./PiezaDetalle";

// Armas Modificadas (S87): elegir una o varias modificaciones sobre un arma melee, con el
// arma resultante recalculada debajo. Lo usan la Tienda (al comprar), Equipo (convertir un
// arma que ya llevas: las que tiene van `fijas`) y Fabricar. Quien lo usa guarda la
// selección y decide qué hacer con ella; aquí solo se elige y se enseña.
export function SelectorModificaciones({
  arma,
  seleccion,
  fijas = [],
  onCambiar,
}: {
  arma: ArmaMelee;
  seleccion: ModificacionArmaId[];
  fijas?: ModificacionArmaId[];
  onCambiar: (ids: ModificacionArmaId[]) => void;
}) {
  const opciones = opcionesModificacion(arma, seleccion, fijas);
  const resumen = seleccion.length > 0 ? resumenArmaModificada(arma, seleccion) : null;
  const motivos = [...new Set(opciones.filter((o) => !o.marcada && o.motivo).map((o) => `${o.label}: ${o.motivo}`))];
  return (
    <div className="mt-3 border-t border-border pt-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{"// Arma modificada"}</p>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {opciones.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={o.marcada}
            disabled={o.fija || (!o.marcada && o.motivo !== null)}
            onClick={() => onCambiar(alternarModificacion(arma, seleccion, o.id, fijas))}
            className={`clip-chamfer-sm border px-2 py-2 font-mono text-[10px] uppercase tracking-wide active:scale-95 disabled:opacity-40 ${
              o.marcada ? "border-accent text-accent" : "border-border text-muted"
            }`}
          >
            {o.marcada ? "✓ " : ""}
            {o.label}
            {o.fija ? " · ya" : ""}
          </button>
        ))}
      </div>
      {motivos.length > 0 && (
        <ul className="mt-1.5 flex flex-col gap-0.5">
          {motivos.map((m) => (
            <li key={m} className="font-sans text-prosa-sm text-soft">
              {m}
            </li>
          ))}
        </ul>
      )}
      {resumen && <DetalleArmaModificada r={resumen} />}
    </div>
  );
}
