import {
  ATRIBUTOS,
  APLICADOS,
  ATRIBUTO_MIN,
  ATRIBUTO_MAX_CREACION,
  ATRIBUTO_MAX,
  modificadoresActivos,
  desgloseAtributo,
  desgloseAplicado,
  type AtributoId,
} from "@/lib/rules";
import type { Sheet } from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { Desglose } from "@/components/Desglose";
import { Stepper } from "./Stepper";

// Escala pintada: 5 casillas, el techo del sistema (ATRIBUTO_MAX), no el de
// creación. La 5ª solo puede encenderse por progresión post-creación: la
// compra en la ficha nunca pasa de ATRIBUTO_MAX_CREACION, así que hoy se ve
// siempre vacía. El -1 no tiene casilla propia: reutiliza la primera en rojo
// (deuda) en vez de sumar un amarillo.
const CASILLAS = ATRIBUTO_MAX;

export function AtributosTab({
  sheet,
  puntosDisponibles,
  onSet,
}: {
  sheet: Sheet;
  puntosDisponibles: number;
  onSet: (id: AtributoId, value: number) => void;
}) {
  // Se calculan una vez y se pasan hacia abajo: evita recalcular la especie
  // por cada atributo y cada aplicado del render.
  const mods = modificadoresActivos(sheet);

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
        const desglose = desgloseAtributo(sheet, a.id, mods);
        const tieneModificadores = desglose.fuentes.length > 1;
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
            {/* Comprado vs. en juego: el Stepper edita la compra; esto es lo
                que de verdad cuenta a la mesa cuando algo lo está modificando. */}
            {tieneModificadores && (
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  En juego
                </span>
                <Desglose
                  total={desglose.total}
                  fuentes={desglose.fuentes}
                  className="text-sm text-info"
                />
              </div>
            )}
            <div className="mt-3 flex gap-1">
              {Array.from({ length: CASILLAS }).map((_, i) => {
                // Con valor negativo solo se enciende la primera casilla, en
                // rojo (deuda). Con valor positivo se rellena desde la
                // primera, en amarillo, una casilla por punto.
                const enDeuda = value < 0;
                const activo = enDeuda ? i === 0 : i < value;
                return (
                  <span
                    key={i}
                    className={`h-2 flex-1 ${
                      activo
                        ? enDeuda
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
          const desglose = desgloseAplicado(sheet, a.id, mods);
          return (
            <HudCard key={a.id} className="p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-display text-sm font-semibold uppercase leading-none">
                  {a.label}
                </span>
                <Desglose
                  total={desglose.total}
                  fuentes={desglose.fuentes}
                  className="text-xl text-info"
                />
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
