import {
  ATRIBUTOS,
  APLICADOS,
  ATRIBUTO_MIN,
  ATRIBUTO_MAX_CREACION,
  aplicados as calcAplicados,
  type AtributoId,
} from "@/lib/rules";
import type { Sheet } from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { Stepper } from "./Stepper";

// Escala pintada: de -1 a 4. El −1 se marca en rojo porque es deuda, no compra.
const CASILLAS = ATRIBUTO_MAX_CREACION - ATRIBUTO_MIN;

export function AtributosTab({
  sheet,
  puntosDisponibles,
  onSet,
}: {
  sheet: Sheet;
  puntosDisponibles: number;
  onSet: (id: AtributoId, value: number) => void;
}) {
  const derivados = calcAplicados(sheet);

  return (
    <div className="flex flex-col gap-2">
      <div className="mb-1 flex items-center justify-between border-y border-border py-2 font-mono text-xs">
        <span className="uppercase tracking-wide text-muted">Puntos</span>
        <span
          className={`tabular-nums ${puntosDisponibles < 0 ? "text-danger" : "text-accent"}`}
        >
          {puntosDisponibles}
        </span>
      </div>

      {ATRIBUTOS.map((a) => {
        const value = sheet.atributos[a.id];
        const siguiente = value + 1;
        return (
          <HudCard key={a.id} className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-baseline gap-2">
                <span className="font-mono text-xs text-muted">{a.abbr}</span>
                <span className="truncate font-display text-base font-semibold uppercase leading-none">
                  {a.label}
                </span>
              </div>
              <Stepper
                value={value}
                hint={
                  value >= ATRIBUTO_MAX_CREACION
                    ? "MÁX"
                    : siguiente <= 0
                      ? "+1 pt"
                      : `${siguiente} pts`
                }
                canBuy={puntosDisponibles >= siguiente}
                atMin={value <= ATRIBUTO_MIN}
                atMax={value >= ATRIBUTO_MAX_CREACION}
                onBuy={() => onSet(a.id, value + 1)}
                onSell={() => onSet(a.id, value - 1)}
              />
            </div>
            <div className="mt-3 flex gap-1">
              {Array.from({ length: CASILLAS }).map((_, i) => {
                const nivel = ATRIBUTO_MIN + i + 1; // -1 … 4
                const negativo = nivel <= 0;
                const activo = negativo ? value <= nivel : value >= nivel;
                return (
                  <span
                    key={nivel}
                    className={`h-2 flex-1 ${
                      activo
                        ? negativo
                          ? "bg-danger"
                          : "bg-accent shadow-glow-yellow"
                        : "bg-elevated"
                    }`}
                  />
                );
              })}
            </div>
          </HudCard>
        );
      })}

      <h2 className="mt-3 border-b border-border pb-1 font-display text-sm font-semibold uppercase tracking-wide text-muted">
        Aplicados
      </h2>
      <p className="font-mono text-[11px] leading-relaxed text-muted">
        Se calculan solos: no se compran ni se guardan.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {APLICADOS.map((a) => {
          const de = a.de.map(
            (b) => ATRIBUTOS.find((x) => x.id === b)!.abbr,
          );
          return (
            <HudCard key={a.id} className="p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-display text-sm font-semibold uppercase leading-none">
                  {a.label}
                </span>
                <span className="font-mono text-xl tabular-nums text-info">
                  {derivados[a.id]}
                </span>
              </div>
              <p className="mt-1 font-mono text-[10px] uppercase text-muted">
                {de.join(" + ")}
              </p>
            </HudCard>
          );
        })}
      </div>
    </div>
  );
}
