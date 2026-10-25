"use client";

import { useState, type ReactNode } from "react";
import { CATEGORIAS_DANIO, ETIQUETA_DANIO, type CategoriaDanio, type DanioVida } from "@/lib/rules";
import { BarraVital } from "@/components/BarraVital";
import { HudCard } from "@/components/HudCard";

// Cómo se pinta cada categoría de daño (§7) en todos los controles de vida: la muestra es la
// misma que su tramo en BarraVital, para que barra y botones se lean juntos. La grave va
// rayada para no depender solo del color.
export const ESTILO_DANIO: Record<CategoriaDanio, { muestra: string; texto: string; borde: string }> = {
  noLetal: { muestra: "bg-herida-no-letal", texto: "text-herida-no-letal", borde: "border-herida-no-letal" },
  letal: { muestra: "bg-herida-letal", texto: "text-herida-letal", borde: "border-herida-letal" },
  grave: { muestra: "rayado-grave", texto: "text-herida-grave", borde: "border-herida-grave" },
};

export const nombreDanio = (c: CategoriaDanio) => ETIQUETA_DANIO[c].toLowerCase();

// Control de vida con daño por categoría (§7, pregunta 24): la barra con lo perdido
// desglosado y, por categoría, recibir 1 o curar 1. `onAjustar`: delta > 0 recibe daño de
// esa categoría, < 0 cura esa categoría (ajustarDanioCategoria / ajustarDanioVital).
// - "completa" (Recursos): una casilla por categoría, cada una con su −/+.
// - "compacta" (cabina, fila de combate): se elige la categoría y un solo par −/+. Quien la
//   monta puede controlar la elegida (la fila de combate la usa también para su ±N).
export function ControlVida({
  actual,
  max,
  danio,
  onAjustar,
  variante = "completa",
  disabled = false,
  label = "Vida",
  categoria,
  onCategoria,
}: {
  actual: number;
  max: number;
  danio: DanioVida;
  onAjustar: (categoria: CategoriaDanio, delta: number) => void;
  variante?: "completa" | "compacta";
  disabled?: boolean;
  label?: string;
  categoria?: CategoriaDanio;
  onCategoria?: (c: CategoriaDanio) => void;
}) {
  if (variante === "compacta") {
    return (
      <Compacta
        actual={actual}
        max={max}
        danio={danio}
        onAjustar={onAjustar}
        disabled={disabled}
        label={label}
        categoria={categoria}
        onCategoria={onCategoria}
      />
    );
  }
  return (
    <HudCard className="p-3">
      <BarraVital label={label} actual={actual} max={max} tono="danger" danio={danio} />
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {CATEGORIAS_DANIO.map((c) => {
          const n = danio[c];
          const e = ESTILO_DANIO[c];
          return (
            <div
              key={c}
              className={`clip-chamfer-sm flex flex-col border bg-night ${n > 0 ? e.borde : "border-border"}`}
            >
              <span aria-hidden className={`h-1 w-full ${e.muestra}`} />
              <div className="flex items-baseline justify-between gap-1 px-2 pb-1 pt-1.5">
                <span className={`font-mono text-[10px] uppercase tracking-widest ${n > 0 ? e.texto : "text-muted"}`}>
                  {ETIQUETA_DANIO[c]}
                </span>
                <span
                  className={`font-display text-xl font-bold leading-none tabular-nums ${n > 0 ? "text-foreground" : "text-muted"}`}
                >
                  {n}
                </span>
              </div>
              <div className="grid grid-cols-2 border-t border-border">
                <BotonVida
                  etiqueta={`Recibir 1 de daño ${nombreDanio(c)}`}
                  disabled={disabled || actual <= 0}
                  onClick={() => onAjustar(c, 1)}
                  className="h-11 border-r border-border text-danger"
                >
                  −
                </BotonVida>
                <BotonVida
                  etiqueta={`Curar 1 de daño ${nombreDanio(c)}`}
                  disabled={disabled || n <= 0}
                  onClick={() => onAjustar(c, -1)}
                  className="h-11 text-neon-green"
                >
                  +
                </BotonVida>
              </div>
            </div>
          );
        })}
      </div>
    </HudCard>
  );
}

function Compacta({
  actual,
  max,
  danio,
  onAjustar,
  disabled,
  label,
  categoria,
  onCategoria,
}: {
  actual: number;
  max: number;
  danio: DanioVida;
  onAjustar: (categoria: CategoriaDanio, delta: number) => void;
  disabled: boolean;
  label: string;
  categoria?: CategoriaDanio;
  onCategoria?: (c: CategoriaDanio) => void;
}) {
  const [propia, setPropia] = useState<CategoriaDanio>("letal");
  const elegida = categoria ?? propia;
  const elegir = (c: CategoriaDanio) => (onCategoria ? onCategoria(c) : setPropia(c));
  const nombre = nombreDanio(elegida);

  return (
    <div className="flex flex-col gap-1.5">
      <BarraVital label={label} actual={actual} max={max} tono="danger" danio={danio} />
      <div role="radiogroup" aria-label="Categoría de daño" className="grid grid-cols-3 gap-1">
        {CATEGORIAS_DANIO.map((c) => {
          const e = ESTILO_DANIO[c];
          const activa = c === elegida;
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={activa}
              title={`${ETIQUETA_DANIO[c]}: ${danio[c]}`}
              disabled={disabled}
              onClick={() => elegir(c)}
              className={`flex min-h-11 flex-col justify-center gap-0.5 border px-1.5 py-1 text-left transition active:scale-95 disabled:opacity-40 ${
                activa ? `${e.borde} bg-elevated` : "border-border bg-night"
              }`}
            >
              <span className="flex items-center justify-between gap-1">
                <span aria-hidden className={`h-2.5 w-2.5 shrink-0 ${e.muestra}`} />
                <span
                  className={`font-display text-sm font-bold leading-none tabular-nums ${danio[c] > 0 ? "text-foreground" : "text-muted"}`}
                >
                  {danio[c]}
                </span>
              </span>
              <span
                className={`whitespace-nowrap font-mono text-[9px] uppercase tracking-wide ${activa ? e.texto : "text-muted"}`}
              >
                {ETIQUETA_DANIO[c]}
              </span>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-1">
        <BotonVida
          etiqueta={`Recibir 1 de daño ${nombre}`}
          disabled={disabled || actual <= 0}
          onClick={() => onAjustar(elegida, 1)}
          className="h-9 border border-border bg-elevated text-danger"
        >
          − <span className="font-mono text-[10px] uppercase tracking-widest">recibir</span>
        </BotonVida>
        <BotonVida
          etiqueta={`Curar 1 de daño ${nombre}`}
          disabled={disabled || danio[elegida] <= 0}
          onClick={() => onAjustar(elegida, -1)}
          className="h-9 border border-border bg-elevated text-neon-green"
        >
          + <span className="font-mono text-[10px] uppercase tracking-widest">curar</span>
        </BotonVida>
      </div>
    </div>
  );
}

function BotonVida({
  etiqueta,
  disabled,
  onClick,
  className,
  children,
}: {
  etiqueta: string;
  disabled: boolean;
  onClick: () => void;
  className: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 font-mono text-lg leading-none transition hover:bg-elevated active:scale-95 disabled:opacity-30 ${className}`}
    >
      {children}
    </button>
  );
}
