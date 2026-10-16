"use client";

import type { RecursoVital } from "@/lib/rules";
import { BarraObjetivo } from "./BarraObjetivo";
import { FOCO } from "./controles";
import { PanelEstados } from "./PanelEstados";
import { PanelRecompensas } from "./PanelRecompensas";
import { PanelVida } from "./PanelVida";
import type { AccionesMando, AvisoMando, ObjetivoMando } from "./tipos";

export type PestanaMando = "estados" | "vida" | "recompensas";

const PESTANAS: { id: PestanaMando; label: string }[] = [
  { id: "estados", label: "Estados" },
  { id: "vida", label: "Vida" },
  { id: "recompensas", label: "Recompensas" },
];

// El panel compartido del centro de mando (E1c): primero a quién (barra de objetivo),
// luego qué (pestañas). Recibe los objetivos y las acciones por props para montarse
// igual en la Mesa y dentro del combate (E1d, objetivos = la cola). La pestaña la lleva
// quien lo monta: en móvil la elige la barra de abajo y aquí se esconden las pestañas.
// `enLinea`: ya va dentro de una hoja inferior (combate en móvil): objetivo y pestañas
// siempre visibles, y la configuración del estado debajo en vez de en otra hoja.
// Con un NPC entre los objetivos, Recompensas se apaga (PanelRecompensas dice por qué).
export function PanelMando({
  objetivos,
  acciones,
  pestana,
  onPestana,
  recursoVida,
  onRecursoVida,
  onQuitarObjetivo,
  onAviso,
  enLinea = false,
  onAplicado,
}: {
  objetivos: ObjetivoMando[];
  acciones: AccionesMando;
  pestana: PestanaMando;
  onPestana: (p: PestanaMando) => void;
  recursoVida: RecursoVital;
  onRecursoVida: (r: RecursoVital) => void;
  onQuitarObjetivo: (id: string) => void;
  onAviso: (a: Omit<AvisoMando, "id">) => void;
  enLinea?: boolean;
  onAplicado?: () => void;
}) {
  const conNpc = objetivos.some((o) => o.tipo === "npc");
  return (
    <div className="grid content-start gap-4">
      <div
        className={
          enLinea
            ? ""
            : "z-[5] hidden border-b border-border bg-background pb-2.5 pt-3.5 lg:sticky lg:top-12 lg:block"
        }
      >
        <BarraObjetivo
          objetivos={objetivos}
          onQuitar={onQuitarObjetivo}
          vacio={enLinea ? "Elige a quién en la cola." : "Elige a quién en la lista."}
        />
      </div>
      <div role="tablist" aria-label="Qué hacer" className={`gap-0.5 border-b border-border ${enLinea ? "flex" : "hidden lg:flex"}`}>
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={pestana === p.id}
            onClick={() => onPestana(p.id)}
            title={p.id === "recompensas" && conNpc ? "Los NPC no reciben experiencia ni créditos" : undefined}
            className={`-mb-px min-h-11 flex-1 border-b-2 px-4 font-display font-semibold lg:flex-none ${
              pestana === p.id ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground"
            } ${p.id === "recompensas" && conNpc ? "line-through opacity-60" : ""} ${FOCO}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {pestana === "estados" ? (
        <PanelEstados
          objetivos={objetivos}
          acciones={acciones}
          onAviso={onAviso}
          onQuitarObjetivo={onQuitarObjetivo}
          enLinea={enLinea}
          onAplicado={onAplicado}
        />
      ) : pestana === "vida" ? (
        <PanelVida
          objetivos={objetivos}
          acciones={acciones}
          onAviso={onAviso}
          recurso={recursoVida}
          onRecurso={onRecursoVida}
          onAplicado={onAplicado}
        />
      ) : (
        <PanelRecompensas objetivos={objetivos} acciones={acciones} onAviso={onAviso} />
      )}
    </div>
  );
}
