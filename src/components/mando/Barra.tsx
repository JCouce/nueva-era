// Barra de vida o fatiga con "actual/max" encima (Mesa y cola del combate). `grande`:
// más gruesa y con los números legibles (cola del combate, donde además es el atajo a
// la pestaña Vida). `danio`: el desglose de lo perdido (vida), pintado tras el relleno.
import type { DanioVida } from "@/lib/rules";

export function Barra({
  label,
  actual,
  max,
  relleno,
  danio,
  grande = false,
}: {
  label: string;
  actual: number;
  max: number;
  relleno: string;
  danio?: DanioVida;
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
      <span className={`flex overflow-hidden bg-elevated ${grande ? "h-2" : "h-1"}`}>
        <span className={`h-full shrink-0 ${relleno}`} style={{ width: `${pct}%` }} />
        {danio && max > 0 && (
          <>
            <Tramo puntos={danio.noLetal} max={max} clase="bg-herida-no-letal" />
            <Tramo puntos={danio.letal} max={max} clase="bg-herida-letal" />
            <Tramo puntos={danio.grave} max={max} clase="rayado-grave" />
          </>
        )}
      </span>
    </span>
  );
}

function Tramo({ puntos, max, clase }: { puntos: number; max: number; clase: string }) {
  if (puntos <= 0) return null;
  return <span className={`h-full shrink-0 ${clase}`} style={{ width: `${Math.min(100, (puntos / max) * 100)}%` }} />;
}
