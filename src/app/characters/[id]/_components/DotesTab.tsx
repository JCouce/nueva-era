import { PUNTOS_DOTES_POR_LETRA } from "@/lib/rules";
import type { Sheet } from "@/lib/rules";
import { HudCard } from "@/components/HudCard";

// Dotes es el hueco más abierto de los cinco: HOJA2 solo rellena la letra E
// (0 puntos) en la tabla de prioridad — A-D no tienen número todavía (S12).
// Ni presupuesto fiable ni catálogo, así que aquí no hay más que declararlo.
export function DotesTab({ sheet }: { sheet: Sheet }) {
  const letra = sheet.prioridades.dotes;
  const puntos = letra ? PUNTOS_DOTES_POR_LETRA[letra] : undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="mb-1 flex items-center justify-between border-y border-border py-2 font-mono text-xs">
        <span className="uppercase tracking-wide text-muted">Presupuesto</span>
        <span className={`tabular-nums ${letra ? "text-accent" : "text-muted"}`}>
          {!letra
            ? "sin letra"
            : puntos === undefined
              ? `letra ${letra}: pendiente de confirmar`
              : `${puntos} pts (letra ${letra})`}
        </span>
      </div>

      {!letra && (
        <p className="font-mono text-[11px] leading-relaxed text-muted">
          Asigna una letra de prioridad a Dotes en Resumen.
        </p>
      )}

      <HudCard className="border-dashed p-3 opacity-60">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-display text-sm font-semibold uppercase text-muted">
            Dotes
          </span>
          <span className="font-mono text-[10px] uppercase text-danger">sin definir</span>
        </div>
        <p className="mt-1 font-mono text-[10px] leading-relaxed text-muted">
          El diseñador no ha dicho qué son las dotes, cuántas se eligen ni qué compra cada
          punto (docs/sistema.md §9). Con letras A-D tampoco se sabe el presupuesto todavía
          — solo la E, que da 0.
        </p>
      </HudCard>
    </div>
  );
}
