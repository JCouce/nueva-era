import {
  ATTRIBUTES,
  SKILLS,
  skillCost,
  SKILL_MIN,
  SKILL_MAX,
  type SkillId,
} from "@/lib/rules";
import type { BuildSheet } from "@/lib/validation";
import { HudCard } from "@/components/HudCard";
import { Stepper } from "./Stepper";

export function HabilidadesTab({
  attributes,
  skills,
  xpDisponible,
  accentText,
  onSet,
}: {
  attributes: BuildSheet["attributes"];
  skills: BuildSheet["skills"];
  xpDisponible: number;
  accentText: string;
  onSet: (id: SkillId, value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {ATTRIBUTES.map((a) => (
        <div key={a.id}>
          <p className="mb-1.5 font-mono text-[11px] uppercase tracking-widest text-muted">
            /// {a.label}
          </p>
          <div className="flex flex-col gap-2">
            {SKILLS.filter((s) => s.attr === a.id).map((s) => {
              const value = skills[s.id];
              const cost = skillCost(value);
              const pool = attributes[a.id] + value;
              return (
                <HudCard key={s.id} className="flex items-center gap-3 p-3">
                  <div className="flex flex-1 items-center gap-2">
                    <span className="font-display text-sm font-medium">
                      {s.label}
                    </span>
                    <span
                      className={`${accentText} font-mono text-xs tabular-nums`}
                      title="Dice pool (atributo + habilidad)"
                    >
                      [{pool}d]
                    </span>
                  </div>
                  <Stepper
                    value={value}
                    cost={cost}
                    canBuy={xpDisponible >= cost}
                    atMin={value <= SKILL_MIN}
                    atMax={value >= SKILL_MAX}
                    onBuy={() => onSet(s.id, value + 1)}
                    onSell={() => onSet(s.id, value - 1)}
                  />
                </HudCard>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
