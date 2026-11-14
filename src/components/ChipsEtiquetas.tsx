"use client";

// Fichas de etiqueta con recuento que se pulsan para filtrar (catálogo de NPCs y combate).
// `vertical` las apila en columna desde lg (columna lateral del catálogo).
export function ChipsEtiquetas({
  recuento,
  marcada,
  alternar,
  vertical = false,
  className = "",
}: {
  recuento: { etiqueta: string; n: number }[];
  marcada: (etiqueta: string) => boolean;
  alternar: (etiqueta: string) => void;
  vertical?: boolean;
  className?: string;
}) {
  if (recuento.length === 0) return null;
  return (
    <div
      aria-label="Filtrar por etiqueta"
      className={`flex flex-wrap gap-1.5 ${vertical ? "lg:flex-col lg:flex-nowrap" : ""} ${className}`}
    >
      {recuento.map(({ etiqueta, n }) => (
        <button
          key={etiqueta}
          type="button"
          aria-pressed={marcada(etiqueta)}
          onClick={() => alternar(etiqueta)}
          className={`border px-2.5 py-1.5 font-mono text-[11px] tracking-wide ${
            vertical ? "lg:flex lg:justify-between lg:text-left" : ""
          } ${marcada(etiqueta) ? "border-accent bg-accent text-black" : "border-border bg-surface text-foreground"}`}
        >
          {etiqueta} <span className={marcada(etiqueta) ? "" : "text-muted"}>{n}</span>
        </button>
      ))}
    </div>
  );
}
