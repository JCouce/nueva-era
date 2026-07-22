import {
  ATTRIBUTES,
  attrCost,
  ATTR_MIN,
  ATTR_MAX,
  type AttributeId,
} from "@/lib/rules";
import type { BuildSheet } from "@/lib/validation";
import { HudCard } from "@/components/HudCard";
import { Stepper } from "./Stepper";

export function AtributosTab({
  attributes,
  xpDisponible,
  onSet,
}: {
  attributes: BuildSheet["attributes"];
  xpDisponible: number;
  onSet: (id: AttributeId, value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {ATTRIBUTES.map((a) => {
        const value = attributes[a.id];
        const cost = attrCost(value);
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
                cost={cost}
                canBuy={xpDisponible >= cost}
                atMin={value <= ATTR_MIN}
                atMax={value >= ATTR_MAX}
                onBuy={() => onSet(a.id, value + 1)}
                onSell={() => onSet(a.id, value - 1)}
              />
            </div>
            <div className="mt-3 flex gap-1">
              {Array.from({ length: ATTR_MAX }).map((_, i) => (
                <span
                  key={i}
                  className={`h-2 flex-1 ${
                    i < value ? "bg-accent shadow-glow-yellow" : "bg-elevated"
                  }`}
                />
              ))}
            </div>
          </HudCard>
        );
      })}
    </div>
  );
}
