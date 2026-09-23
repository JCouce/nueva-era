import { PUNTOS_PSIONICA_POR_LETRA } from "@/lib/rules";
import type { Sheet } from "@/lib/rules";
import { HudCard } from "@/components/HudCard";

// Psiónica tiene presupuesto de creación (HOJA2, letra de prioridad) pero
// sigue sin catálogo de poderes — mismo patrón que AccionesTab.tsx usa para
// una tirada bloqueada: se declara el hueco, no se rellena en silencio.
export function PsionicaTab({ sheet }: { sheet: Sheet }) {
  const letra = sheet.prioridades.psionica;

  return (
    <div className="flex flex-col gap-2">
      <div className="mb-1 flex items-center justify-between border-y border-border py-2 font-mono text-xs">
        <span className="uppercase tracking-wide text-muted">Presupuesto</span>
        <span className={`tabular-nums ${letra ? "text-accent" : "text-muted"}`}>
          {letra ? `${PUNTOS_PSIONICA_POR_LETRA[letra]} pts (letra ${letra})` : "sin letra"}
        </span>
      </div>

      {!letra && (
        <p className="font-mono text-[11px] leading-relaxed text-muted">
          Asigna una letra de prioridad a Psiónica en Resumen para saber cuántos puntos
          tienes aquí.
        </p>
      )}

      <HudCard className="border-dashed p-3 opacity-60">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-display text-sm font-semibold uppercase text-muted">
            Poderes psiónicos
          </span>
          <span className="font-mono text-[10px] uppercase text-danger">sin definir</span>
        </div>
        <p className="mt-1 font-mono text-[10px] leading-relaxed text-muted">
          El diseñador todavía no ha enviado el catálogo de poderes (docs/sistema.md §10).
          {letra
            ? ` Tus ${PUNTOS_PSIONICA_POR_LETRA[letra]} puntos quedan declarados; no hay nada que comprar con ellos todavía.`
            : ""}
        </p>
      </HudCard>
    </div>
  );
}
