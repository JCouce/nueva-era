import {
  treeFor,
  disciplineBuyState,
  pointsInTree,
  troncoRank,
  TIER_GATING,
  DISC_MAX,
  type DisciplineNode,
} from "@/lib/disciplines";
import type { BuildSheet } from "@/lib/validation";
import { HudCard } from "@/components/HudCard";

const BRANCH_LABEL: Record<string, string> = {
  tronco: "Tronco",
  dano: "Daño",
  control: "Control",
  intrusion: "Intrusión",
};
const TIERS = [1, 2, 3, 4, 5];

function NodeCard({
  node,
  sheet,
  xpDisponible,
  onSet,
  onOpen,
}: {
  node: DisciplineNode;
  sheet: BuildSheet;
  xpDisponible: number;
  onSet: (id: string, value: number) => void;
  onOpen: (id: string) => void;
}) {
  const { rank, cost, canBuy, locked, reason } = disciplineBuyState(
    node,
    sheet.especialidad,
    sheet.disciplinas,
    xpDisponible,
  );
  const floor = node.gift ? 1 : 0;
  const badge = node.exclusive ? "⚡" : node.cross ? "⇄" : "";

  return (
    <HudCard className="p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase text-muted">
              {BRANCH_LABEL[node.branch]}
            </span>
            <button
              type="button"
              onClick={() => onOpen(node.id)}
              className="text-left font-display text-sm font-semibold uppercase underline-offset-2 hover:text-info hover:underline"
            >
              {node.label}
            </button>
            {badge && <span className="text-xs">{badge}</span>}
          </div>
          <p className="mt-0.5 font-sans text-xs leading-tight text-muted">
            {node.desc}
          </p>
          {locked && (
            <p className="mt-1 font-mono text-[10px] text-danger">
              🔒 requiere {reason}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSet(node.id, rank - 1)}
            disabled={rank <= floor}
            aria-label="Bajar"
            className="h-8 w-8 border border-border bg-elevated font-mono text-muted active:scale-95 disabled:opacity-30"
          >
            −
          </button>
          <span className="w-4 text-center font-mono text-lg tabular-nums">
            {rank}
          </span>
          <div className="flex w-11 flex-col items-center">
            <button
              type="button"
              onClick={() => onSet(node.id, rank + 1)}
              disabled={!canBuy}
              aria-label="Subir"
              className="h-8 w-8 border border-accent bg-accent font-mono text-black active:scale-95 disabled:border-border disabled:bg-elevated disabled:text-muted"
            >
              +
            </button>
            <span className="mt-0.5 font-mono text-[9px] leading-none text-muted">
              {rank >= DISC_MAX ? "MÁX" : locked ? "🔒" : `${cost}xp`}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-2 flex gap-1">
        {Array.from({ length: DISC_MAX }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 ${i < rank ? "bg-info" : "bg-elevated"}`}
          />
        ))}
      </div>
    </HudCard>
  );
}

export function BuildTab({
  sheet,
  xpDisponible,
  onSet,
  onOpen,
}: {
  sheet: BuildSheet;
  xpDisponible: number;
  onSet: (id: string, value: number) => void;
  onOpen: (id: string) => void;
}) {
  const tree = treeFor(sheet.especialidad);
  if (tree.length === 0) {
    return (
      <p className="font-mono text-sm text-muted">
        // Árbol pendiente para este arquetipo. Elige Netrunner en Resumen.
      </p>
    );
  }

  const pts = pointsInTree(sheet.especialidad, sheet.disciplinas);
  const hackeo = troncoRank(sheet.especialidad, sheet.disciplinas);
  const nextTier = [3, 4, 5].find((t) => pts < TIER_GATING[t]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 border-y border-border py-2 font-mono text-xs">
        <span className="uppercase tracking-wide text-muted">Puntos en árbol</span>
        <span className="tabular-nums text-info">
          {pts}
          {nextTier && (
            <span className="text-muted"> · T{nextTier} a los {TIER_GATING[nextTier]}</span>
          )}
        </span>
      </div>

      {TIERS.filter((t) => tree.some((n) => n.tier === t)).map((t) => {
        const ptsOk = pts >= (TIER_GATING[t] ?? 0);
        const hackOk = hackeo >= t;
        const unlocked = ptsOk && hackOk;
        const lockReason = !ptsOk ? `${TIER_GATING[t]} pts` : `Hackeo ${t}`;
        return (
          <div key={t}>
            <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-muted">
              <span>/// Tier {t}</span>
              <span className={unlocked ? "text-muted" : "text-danger"}>
                {unlocked ? "abierto" : `🔒 ${lockReason}`}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {tree
                .filter((n) => n.tier === t)
                .map((n) => (
                  <NodeCard
                    key={n.id}
                    node={n}
                    sheet={sheet}
                    xpDisponible={xpDisponible}
                    onSet={onSet}
                    onOpen={onOpen}
                  />
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
