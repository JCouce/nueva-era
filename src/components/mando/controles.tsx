"use client";

// Controles del centro de mando (E1c), rediseñados desde cero (no son los de
// MasterControls): targets de 44 px, foco visible y estados alineados en fila.
import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";

export const FOCO =
  "outline-none focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-offset-2 focus-visible:ring-offset-background";

type Variante = "primario" | "secundario" | "aviso" | "peligro" | "fantasma";

const VARIANTES: Record<Variante, string> = {
  primario:
    "border-accent bg-accent font-display text-night disabled:border-border disabled:bg-elevated disabled:text-muted",
  secundario: "border-border bg-surface text-foreground hover:border-muted disabled:text-muted",
  aviso: "border-glitch bg-transparent text-glitch hover:bg-glitch/10 disabled:opacity-50",
  peligro: "border-danger bg-transparent text-danger hover:bg-danger/10 disabled:opacity-50",
  fantasma: "border-transparent bg-transparent text-info hover:underline disabled:text-muted",
};

export function Boton({
  variante = "secundario",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 border px-4 font-semibold tracking-wide transition disabled:cursor-not-allowed ${VARIANTES[variante]} ${FOCO} ${className}`}
    />
  );
}

// Una opción de un grupo (grado, duración, importe rápido). `alerta`: en rojo al estar
// elegida (los fracasos críticos).
export function Opcion({
  elegida,
  alerta = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { elegida: boolean; alerta?: boolean }) {
  const tono = !elegida
    ? "border-border text-muted hover:text-foreground"
    : alerta
      ? "border-danger text-danger"
      : "border-accent text-accent";
  return (
    <button
      type="button"
      aria-pressed={elegida}
      {...props}
      className={`min-h-11 border bg-night px-3 font-semibold transition ${tono} ${FOCO} ${className}`}
    />
  );
}

// Interruptor de dos o tres posiciones (Dar / Quitar).
export function Segmentado<T extends string>({
  valor,
  opciones,
  onCambio,
  etiqueta,
}: {
  valor: T;
  opciones: { valor: T; label: string }[];
  onCambio: (v: T) => void;
  etiqueta: string;
}) {
  return (
    <div role="group" aria-label={etiqueta} className="inline-flex border border-border bg-surface">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          aria-pressed={o.valor === valor}
          onClick={() => onCambio(o.valor)}
          className={`min-h-11 px-4 font-semibold transition ${
            o.valor === valor ? "bg-accent text-night" : "text-muted hover:text-foreground"
          } ${FOCO}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// − [número] +, con el número editable. Mientras se escribe se guarda el texto tal
// cual; al salir del campo vuelve al valor (ya recortado entre min y max).
export function Stepper({
  valor,
  onCambio,
  min,
  max,
  paso = 1,
  etiqueta,
}: {
  valor: number;
  onCambio: (n: number) => void;
  min: number;
  max: number;
  paso?: number;
  etiqueta: string;
}) {
  const [borrador, setBorrador] = useState<string | null>(null);
  const recortar = (n: number) => Math.min(max, Math.max(min, n));
  const boton = `grid min-h-11 w-11 place-items-center text-lg text-foreground transition hover:bg-elevated disabled:text-muted ${FOCO}`;
  return (
    <span className="inline-flex items-stretch border border-border bg-night">
      <button
        type="button"
        aria-label={`${etiqueta}: ${paso} menos`}
        disabled={valor <= min}
        onClick={() => onCambio(recortar(valor - paso))}
        className={boton}
      >
        −
      </button>
      <input
        inputMode="numeric"
        aria-label={etiqueta}
        value={borrador ?? String(valor)}
        onChange={(e) => {
          const texto = e.target.value.replace(/\D/g, "");
          setBorrador(texto);
          if (texto !== "") onCambio(recortar(Number(texto)));
        }}
        onBlur={() => setBorrador(null)}
        className={`w-20 border-x border-border bg-transparent text-center font-mono tabular-nums ${FOCO}`}
      />
      <button
        type="button"
        aria-label={`${etiqueta}: ${paso} más`}
        disabled={valor >= max}
        onClick={() => onCambio(recortar(valor + paso))}
        className={boton}
      >
        +
      </button>
    </span>
  );
}

// Fila etiqueta + controles: en móvil apilada, desde sm alineada en dos columnas.
export function Fila({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-center">
      <span className="font-mono text-xs uppercase tracking-widest text-muted">{etiqueta}</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function Iniciales({ nombre, tono = "pj", className = "" }: { nombre: string; tono?: "pj" | "npc"; className?: string }) {
  const ini = nombre
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center border border-current font-display font-bold ${
        tono === "pj" ? "text-info" : "text-glitch"
      } ${className}`}
    >
      {ini}
    </span>
  );
}
