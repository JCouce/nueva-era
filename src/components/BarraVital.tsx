// Barra de estado HUD (vida/fatiga/escudo): mismo lenguaje visual que
// BarraProgreso (track oscuro + relleno con glow neón), pero por VALOR
// (actual/max) en vez de por tiempo, y segmentada al estilo Night City en
// vez de un degradado liso — pedido del usuario 2026-09-27 ("barras
// futuristas y molonas para llevar la vida"). Reutilizada por Vida, Fatiga
// y el colchón de Malla Plasmática (RecursosTab.tsx): el color y la etiqueta
// son lo único que cambia entre las tres.
const TONOS = {
  danger: { texto: "text-danger", relleno: "bg-danger", glow: "shadow-glow-danger" },
  info: { texto: "text-info", relleno: "bg-info", glow: "shadow-glow-cyan" },
  glitch: { texto: "text-glitch", relleno: "bg-glitch", glow: "shadow-glow-magenta" },
} as const;

export type TonoVital = keyof typeof TONOS;

export function BarraVital({
  label,
  actual,
  max,
  tono,
}: {
  label: string;
  actual: number;
  max: number;
  tono: TonoVital;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (actual / max) * 100)) : 0;
  const vacio = actual <= 0;
  // Crítico: por debajo del 25% pero no a cero — el aviso es "cuidado", no
  // "ya está muerto" (vacío ya tiene su propio tratamiento, sin parpadeo).
  const critico = !vacio && max > 0 && actual / max <= 0.25;
  const { texto, relleno, glow } = TONOS[tono];
  // Un segmento por punto: es lo que hace que el borde de cada bloque
  // coincida siempre con el relleno (10 fijos no cuadraban con un máximo de
  // 8, 12, 14...; los valores de este sistema son enteros pequeños, así que
  // no hace falta capar esto para un máximo enorme).
  const segmentos = Math.max(1, Math.round(max));
  const anchoSegmento = 100 / segmentos;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span
          className={`font-mono text-[10px] uppercase tracking-widest ${vacio ? "text-danger" : "text-muted"}`}
        >
          {`// ${label}`}
        </span>
        <span
          className={`font-mono text-sm tabular-nums ${vacio ? "text-danger" : critico ? "text-danger" : texto}`}
        >
          {actual}
          <span className="text-muted">/{max}</span>
        </span>
      </div>
      <div
        className={`clip-chamfer-sm relative mt-1.5 h-3 w-full overflow-hidden border bg-night ${
          vacio || critico ? "border-danger" : "border-border"
        } ${critico ? "animate-pulse" : ""}`}
      >
        <div
          className={`h-full transition-[width] duration-500 ease-out ${vacio ? "" : `${relleno} ${glow}`}`}
          style={{ width: `${pct}%` }}
        />
        {/* Separadores de segmento — el relleno se lee en bloques, no como un
            degradado líquido, mismo espíritu "panel técnico" que hazard-stripes
            y scanlines en globals.css. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, transparent 0, transparent calc(${anchoSegmento}% - 2px), var(--color-night) calc(${anchoSegmento}% - 2px), var(--color-night) ${anchoSegmento}%)`,
          }}
        />
      </div>
    </div>
  );
}
