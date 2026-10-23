"use client";

import { ATRIBUTOS, type AtributoId, type Especie } from "@/lib/rules";
import { HudCard } from "@/components/HudCard";

// +N a un atributo de libre elección (Humanos, sistema.md §14.4). Va aparte del
// selector de especie: elegir o cambiar no resetea la ficha. Sin `onElegir` es solo
// lectura y enseña únicamente lo elegido (o nada si no hay elección).
export function AtributoLibre({
  especie,
  elegido,
  onElegir,
  pie,
}: {
  especie: Especie | null;
  elegido: AtributoId | null;
  onElegir?: (id: AtributoId) => void;
  // Motivo del bloqueo, si lo hay (bloqueoDeAtributoLibre).
  pie?: string | null;
}) {
  if (!especie?.atributoLibre) return null;
  const valor = especie.atributoLibre;
  const opciones = onElegir ? ATRIBUTOS : ATRIBUTOS.filter((a) => a.id === elegido);
  if (!opciones.length) return null;

  return (
    <HudCard className="flex flex-col gap-3 p-4">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
        {"//SYSTEM · "}Atributo +{valor}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {opciones.map((a) => {
          const activo = a.id === elegido;
          return (
            <button
              key={a.id}
              type="button"
              disabled={!onElegir}
              onClick={onElegir ? () => onElegir(a.id) : undefined}
              className={`clip-chamfer-sm flex flex-col items-center gap-0.5 border bg-night px-1 py-2.5 active:scale-[0.98] disabled:active:scale-100 ${
                activo ? "!border-accent shadow-glow-yellow" : "border-border"
              }`}
            >
              <span className="font-display text-sm font-semibold uppercase tracking-wide text-foreground">
                {a.label}
              </span>
              <span className={`font-mono text-[11px] ${activo ? "text-neon-green" : "text-muted"}`}>
                {a.abbr} +{valor}
              </span>
            </button>
          );
        })}
      </div>
      {onElegir && !elegido && (
        <p className="font-sans text-prosa-sm text-accent">
          Elige qué atributo recibe el +{valor}. Cambiarlo no resetea la ficha.
        </p>
      )}
      {pie && <p className="font-mono text-[10px] uppercase leading-relaxed text-muted">{pie}</p>}
    </HudCard>
  );
}
