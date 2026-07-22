import { treeFor, nodeRank } from "@/lib/disciplines";
import { weaponById, weaponAttr } from "@/lib/weapons";
import type { BuildSheet } from "@/lib/validation";
import { HudCard } from "@/components/HudCard";

// Compila la ficha en acciones jugables. Solo lectura: refleja lo comprado.
export function RepertorioTab({
  sheet,
  onOpen,
}: {
  sheet: BuildSheet;
  onOpen: (id: string) => void;
}) {
  const hackPool = sheet.attributes.inteligencia + sheet.skills.netrunning;

  const active = treeFor(sheet.especialidad)
    .filter((n) => nodeRank(n, sheet.disciplinas) >= 1)
    .map((n) => ({ node: n, rank: nodeRank(n, sheet.disciplinas) }));
  const hacks = active.filter((a) => !a.node.cross);
  const passives = active.filter((a) => a.node.cross);

  const weapons = sheet.weapons
    .map((w) => weaponById(w.id))
    .filter((w): w is NonNullable<typeof w> => Boolean(w));

  return (
    <div className="flex flex-col gap-4">
      {/* Hacks */}
      {hacks.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-muted">
            <span>/// Hacks</span>
            <span className="text-info">
              reserva [{hackPool}d] · INT + Netrunning
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {hacks.map(({ node, rank }) => (
              <HudCard key={node.id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onOpen(node.id)}
                    className="text-left font-display text-sm font-semibold uppercase underline-offset-2 hover:text-info hover:underline"
                  >
                    {node.label}
                  </button>
                  <span className="font-mono text-xs text-info">R{rank}</span>
                </div>
                <p className="mt-0.5 font-sans text-xs leading-tight text-muted">
                  {node.desc}
                </p>
              </HudCard>
            ))}
          </div>
        </div>
      )}

      {/* Pasivas (habilitadoras de cruce) */}
      {passives.length > 0 && (
        <div>
          <p className="mb-1.5 font-mono text-[11px] uppercase tracking-widest text-muted">
            /// Pasivas
          </p>
          <div className="flex flex-col gap-2">
            {passives.map(({ node, rank }) => (
              <HudCard key={node.id} className="border-glitch p-3">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onOpen(node.id)}
                    className="text-left font-display text-sm font-semibold uppercase text-glitch underline-offset-2 hover:underline"
                  >
                    {node.label}
                  </button>
                  <span className="font-mono text-xs text-glitch">R{rank}</span>
                </div>
                <p className="mt-0.5 font-sans text-xs leading-tight text-muted">
                  {node.desc}
                </p>
              </HudCard>
            ))}
          </div>
        </div>
      )}

      {/* Armas */}
      <div>
        <p className="mb-1.5 font-mono text-[11px] uppercase tracking-widest text-muted">
          /// Armas
        </p>
        {weapons.length === 0 ? (
          <p className="font-mono text-xs text-muted">// sin armas equipadas</p>
        ) : (
          <div className="flex flex-col gap-2">
            {weapons.map((w) => {
              const attr = weaponAttr(w, sheet.attributes);
              const skill =
                w.tipo === "melee"
                  ? sheet.skills.cuerpo_a_cuerpo
                  : sheet.skills.armas_distancia;
              const pool = sheet.attributes[attr] + skill;
              return (
                <HudCard key={w.id} className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-sm font-semibold uppercase">
                      {w.label}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-accent">
                      [{pool}d] · DÑ {w.dano}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-muted">
                    {w.tipo === "melee" ? "Cuerpo a cuerpo" : "Armas a distancia"} ·{" "}
                    {attr.slice(0, 3).toUpperCase()}
                  </p>
                </HudCard>
              );
            })}
          </div>
        )}
      </div>

      {hacks.length === 0 && passives.length === 0 && weapons.length === 0 && (
        <p className="font-mono text-sm text-muted">
          // Nada aún. Compra disciplinas y armas para poblar tu repertorio.
        </p>
      )}
    </div>
  );
}
