"use client";

import { BarraObjetivo } from "./BarraObjetivo";
import { FOCO } from "./controles";
import { PanelEstados } from "./PanelEstados";
import { PanelRecompensas } from "./PanelRecompensas";
import type { AccionesMando, AvisoMando, ObjetivoMando } from "./tipos";

export type PestanaMando = "estados" | "recompensas";

const PESTANAS: { id: PestanaMando; label: string }[] = [
  { id: "estados", label: "Estados" },
  { id: "recompensas", label: "Recompensas" },
];

// El panel compartido del centro de mando (E1c): primero a quién (barra de objetivo),
// luego qué (pestañas). Recibe los objetivos y las acciones por props para montarse
// igual en la Mesa y dentro del combate (E1d, objetivos = la cola). La pestaña la lleva
// quien lo monta: en móvil la elige la barra de abajo y aquí se esconden las pestañas.
export function PanelMando({
  objetivos,
  acciones,
  pestana,
  onPestana,
  onQuitarObjetivo,
  onAviso,
}: {
  objetivos: ObjetivoMando[];
  acciones: AccionesMando;
  pestana: PestanaMando;
  onPestana: (p: PestanaMando) => void;
  onQuitarObjetivo: (id: string) => void;
  onAviso: (a: Omit<AvisoMando, "id">) => void;
}) {
  return (
    <div className="grid content-start gap-4">
      <div className="z-[5] hidden border-b border-border bg-background pb-2.5 pt-3.5 lg:sticky lg:top-12 lg:block">
        <BarraObjetivo objetivos={objetivos} onQuitar={onQuitarObjetivo} vacio="Elige a quién en la lista." />
      </div>
      <div role="tablist" aria-label="Qué hacer" className="hidden gap-0.5 border-b border-border lg:flex">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={pestana === p.id}
            onClick={() => onPestana(p.id)}
            className={`-mb-px min-h-11 border-b-2 px-4 font-display font-semibold ${
              pestana === p.id ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground"
            } ${FOCO}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {pestana === "estados" ? (
        <PanelEstados objetivos={objetivos} acciones={acciones} onAviso={onAviso} onQuitarObjetivo={onQuitarObjetivo} />
      ) : (
        <PanelRecompensas objetivos={objetivos} acciones={acciones} onAviso={onAviso} />
      )}
    </div>
  );
}
