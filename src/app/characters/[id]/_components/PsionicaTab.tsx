import {
  DISCIPLINAS,
  DISCIPLINA_MAX,
  costeSiguienteNivel,
  cumpleRequisito,
  disciplinaPorId,
  presupuestoPsionica,
  puntosPsionicaDisponibles,
  sueloPorRequisitos,
  textoNivelDisciplina,
  type DisciplinaId,
  type FichaResuelta,
  textoPuntos,
} from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { Stepper } from "./Stepper";

const RAMAS = [
  { id: "metasensoria", label: "Metasensoria" },
  { id: "metrica", label: "Métrica" },
] as const;

// Compra de disciplinas: nivel N a N×3 (con los descuentos de especie de §14.6
// ya resueltos en la FichaResuelta), mismo patrón que AtributosTab (pool de
// la letra en creación, XP tras aprobar, solo subir). En modo libre (editor de
// NPC) no hay pool ni XP: 0-6 en las dos direcciones, requisitos incluidos.
// Los poderes se usan desde Acciones; aquí solo se compra. El stepper va sobre lo
// comprado; el nivel efectivo (con la Resonancia +1 de especie) y los requisitos
// rotos salen de ficha.psionica.
export function PsionicaTab({
  ficha,
  aprobada = false,
  xp = 0,
  libre = false,
  onSet,
}: {
  ficha: FichaResuelta;
  aprobada?: boolean;
  xp?: number;
  libre?: boolean;
  onSet: (id: DisciplinaId, value: number) => void;
}) {
  const sheet = ficha.ficha;
  const letra = sheet.prioridades.psionica;
  const disponible = libre ? Infinity : aprobada ? xp : puntosPsionicaDisponibles(sheet, ficha.ajusteCoste);

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
          Asigna una letra de prioridad a Psiónica en Personaje → Prioridades para saber cuántos puntos tienes aquí.
        </p>
      )}

      {RAMAS.map((rama) => (
        <section key={rama.id} className="flex flex-col gap-2">
          <h2 className="mt-2 border-b border-border pb-1 font-display text-sm font-semibold uppercase tracking-wide text-muted">
            {rama.label}
          </h2>
          {DISCIPLINAS.filter((d) => d.rama === rama.id).map((d) => {
            const nivel = ficha.psionica.disciplinas[d.id];
            const value = nivel.comprado;
            const bonos = ficha.psionica.bonos;
            const { coste: costeSiguiente, pista } = costeSiguienteNivel(
              { tipo: "disciplina", id: d.id },
              value,
              ficha.ajusteCoste,
            );
            const requisitoOk = cumpleRequisito(sheet, d.id, bonos);
            const requisitoRoto = ficha.psionica.requisitosRotos.includes(d.id);
            const suelo = sueloPorRequisitos(sheet, d.id, bonos);
            const req = d.requisito;
            return (
              <HudCard key={d.id} className={`p-3 ${requisitoOk ? "" : "opacity-60"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="block truncate font-display text-base font-semibold uppercase leading-none">
                      {d.label}
                    </span>
                    {nivel.bono !== 0 && (
                      <span className="mt-1 block font-mono text-[10px] uppercase text-info">
                        nivel {textoNivelDisciplina(nivel, ficha.modificadores, d.id)}
                      </span>
                    )}
                    {req && (
                      <span className={`mt-1 block font-mono text-[10px] uppercase ${requisitoOk ? "text-muted" : "text-danger"}`}>
                        {requisitoRoto ? "requisito no cumplido: " : "requiere "}
                        {disciplinaPorId(req.disciplina).label} {req.nivel}
                      </span>
                    )}
                    {pista && !libre && value < DISCIPLINA_MAX && (
                      <span className="mt-1 block font-mono text-[10px] uppercase text-info">
                        {pista}
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
                {d.acciones.length === 0 && nivel.efectivo > 0 && (
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
