"use client";

import { useId, useState } from "react";
import { normalizarClave, normalizarEtiquetas } from "@/lib/npcEtiquetas";

// Fichas con × para quitar y un campo para añadir (Enter o coma). Las sugerencias son las
// etiquetas que ya existen en el catálogo, para que el máster no invente variantes.
export function EditorEtiquetas({
  etiquetas,
  sugerencias,
  onCambiar,
}: {
  etiquetas: string[];
  sugerencias: string[];
  onCambiar: (etiquetas: string[]) => void;
}) {
  const [texto, setTexto] = useState("");
  const listaId = useId();
  const propias = new Set(etiquetas.map(normalizarClave));
  const disponibles = sugerencias.filter((s) => !propias.has(normalizarClave(s)));

  const anadir = (crudo: string) => {
    const nuevas = normalizarEtiquetas([...etiquetas, ...crudo.split(",")]);
    setTexto("");
    if (nuevas.length !== etiquetas.length) onCambiar(nuevas);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Etiquetas</span>
      {etiquetas.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {etiquetas.map((e) => (
            <li key={e} className="flex items-center border border-border bg-night font-mono text-xs text-info">
              <span className="py-1.5 pl-2.5">{e}</span>
              <button
                type="button"
                onClick={() => onCambiar(etiquetas.filter((x) => x !== e))}
                aria-label={`Quitar etiqueta ${e}`}
                className="px-2.5 py-1.5 text-muted hover:text-danger"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex gap-2"
        onSubmit={(ev) => {
          ev.preventDefault();
          anadir(texto);
        }}
      >
        <input
          value={texto}
          onChange={(ev) => {
            const v = ev.target.value;
            if (v.includes(",")) anadir(v);
            else setTexto(v);
          }}
          list={listaId}
          maxLength={60}
          placeholder="Escena 3, jefe, corporación…"
          aria-label="Nueva etiqueta"
          className="clip-chamfer-sm min-w-0 flex-1 border border-border bg-night px-3 py-2 font-mono text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="clip-chamfer-sm shrink-0 border border-accent px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-accent active:scale-95"
        >
          Añadir
        </button>
        <datalist id={listaId}>
          {disponibles.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </form>
    </div>
  );
}
