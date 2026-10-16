// Barra de vida o fatiga con "actual/max" encima (Mesa y cola del combate). `grande`:
// más gruesa y con los números legibles (cola del combate, donde además es el atajo a
// la pestaña Vida).
export function Barra({
  label,
  actual,
  max,
  relleno,
  grande = false,
}: {
  label: string;
  actual: number;
  max: number;
  relleno: string;
  grande?: boolean;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (actual / max) * 100)) : 0;
  return (
    <span className={`grid w-full ${grande ? "gap-1" : "gap-0.5"}`}>
      <span className={`flex items-baseline justify-between font-mono ${grande ? "text-xs" : "text-[0.68rem]"} text-muted`}>
        <span>{label}</span>
        <span className={`tabular-nums ${grande ? "text-[0.95rem] font-bold text-foreground" : ""}`}>
          {actual}
          <span className={grande ? "text-xs font-normal text-muted" : ""}>/{max}</span>
        </span>
      </span>
      <span className={`relative bg-elevated ${grande ? "h-2" : "h-1"}`}>
        <span className={`absolute inset-y-0 left-0 ${relleno}`} style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}
