import {
  DISCIPLINAS,
  DISCIPLINA_MAX,
  COSTE_FACTOR_PSIONICA,
  costeMarginal,
  cumpleRequisito,
  disciplinaPorId,
  nivelDisciplina,
  presupuestoPsionica,
  puntosPsionicaDisponibles,
  sueloPorRequisitos,
  type DisciplinaId,
  textoPuntos,
} from "@/lib/rules";
import type { Sheet } from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { Stepper } from "./Stepper";

const RAMAS = [
  { id: "metasensoria", label: "Metasensoria" },
  { id: "metrica", label: "Métrica" },
] as const;

// Compra de disciplinas: nivel N a N×3, mismo patrón que AtributosTab (pool de
// la letra en creación, XP tras aprobar, solo subir). En modo libre (editor de
// NPC) no hay pool ni XP: 0-6 en las dos direcciones, requisitos incluidos.
// Los poderes se usan desde Acciones; aquí solo se compra.
export function PsionicaTab({
  sheet,
  aprobada = false,
  xp = 0,
  libre = false,
  onSet,
}: {
  sheet: Sheet;
  aprobada?: boolean;
  xp?: number;
  libre?: boolean;
  onSet: (id: DisciplinaId, value: number) => void;
}) {
  const letra = sheet.prioridades.psionica;
  const disponible = libre ? Infinity : aprobada ? xp : puntosPsionicaDisponibles(sheet);

  return (
    <div className="flex flex-col gap-2">
      {!libre && (
        <div className="mb-1 flex items-center justify-between border-y border-border py-2 font-mono text-xs">
          <span className="uppercase tracking-wide text-muted">{aprobada ? "XP" : "Puntos"}</span>
          <span className={`tabular-nums ${disponible < 0 ? "text-danger" : letra || aprobada ? "text-accent" : "text-muted"}`}>
            {aprobada ? disponible : letra ? `${textoPuntos(disponible)} / ${textoPuntos(presupuestoPsionica(sheet))} (letra ${letra})` : "sin letra"}
          </span>
        </div>
      )}

      {!libre && !letra && !aprobada && (
        <p className="font-mono text-[11px] leading-relaxed text-muted">
          Asigna una letra de prioridad a Psiónica en Resumen para saber cuántos puntos tienes aquí.
        </p>
      )}

      {RAMAS.map((rama) => (
        <section key={rama.id} className="flex flex-col gap-2">
          <h2 className="mt-2 border-b border-border pb-1 font-display text-sm font-semibold uppercase tracking-wide text-muted">
            {rama.label}
          </h2>
          {DISCIPLINAS.filter((d) => d.rama === rama.id).map((d) => {
            const value = nivelDisciplina(sheet, d.id);
            const costeSiguiente = costeMarginal(value + 1, COSTE_FACTOR_PSIONICA);
            const requisitoOk = cumpleRequisito(sheet, d.id);
            const suelo = sueloPorRequisitos(sheet, d.id);
            const req = d.requisito;
            return (
              <HudCard key={d.id} className={`p-3 ${requisitoOk ? "" : "opacity-60"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="block truncate font-display text-base font-semibold uppercase leading-none">
                      {d.label}
                    </span>
                    {req && (
                      <span className={`mt-1 block font-mono text-[10px] uppercase ${requisitoOk ? "text-muted" : "text-danger"}`}>
                        requiere {disciplinaPorId(req.disciplina).label} {req.nivel}
                      </span>
                    )}
                    {suelo > 0 && value <= suelo && (
                      <span className="mt-1 block font-mono text-[10px] uppercase text-muted">
                        mínimo {suelo}: otra disciplina la requiere
                      </span>
                    )}
                  </div>
                  <Stepper
                    value={value}
                    hint={value >= DISCIPLINA_MAX ? "MÁX" : libre ? "" : `${costeSiguiente} ${aprobada ? "xp" : "pts"}`}
                    canBuy={requisitoOk && disponible >= costeSiguiente}
                    atMin={(!libre && aprobada) || value <= suelo}
                    atMax={value >= DISCIPLINA_MAX}
                    onBuy={() => onSet(d.id, value + 1)}
                    onSell={() => onSet(d.id, value - 1)}
                  />
                </div>
                {d.acciones.length === 0 && value > 0 && (
                  <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted">
                    Sus poderes aún no están en la app; llegan disciplina a disciplina.
                  </p>
                )}
              </HudCard>
            );
          })}
        </section>
      ))}
    </div>
  );
}
