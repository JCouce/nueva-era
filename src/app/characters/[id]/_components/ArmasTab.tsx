import { WEAPONS, weaponReqMet, type Weapon } from "@/lib/weapons";
import type { BuildSheet } from "@/lib/validation";
import { HudCard } from "@/components/HudCard";

const ATTR_ABBR: Record<string, string> = {
  fuerza: "FUE",
  destreza: "DES",
  inteligencia: "INT",
};

function WeaponCard({
  weapon,
  owned,
  affordable,
  reqMet,
  onBuy,
  onSell,
}: {
  weapon: Weapon;
  owned: boolean;
  affordable: boolean;
  reqMet: boolean;
  onBuy: () => void;
  onSell: () => void;
}) {
  const props = [
    `DÑ ${weapon.dano}`,
    weapon.tipo === "melee" ? "Melee" : weapon.alcance,
    weapon.cadencia !== "—" ? weapon.cadencia : null,
    weapon.ocultable ? "ocultable" : null,
  ].filter(Boolean);

  return (
    <HudCard className={`p-3 ${owned ? "border-info" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-display text-sm font-semibold uppercase">
              {weapon.label}
            </span>
            <span className="font-mono text-[10px] text-info">
              {weapon.attrs.map((a) => ATTR_ABBR[a]).join("/")}
            </span>
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-muted">
            {props.join(" · ")}
          </p>
          {!reqMet && (
            <p className="mt-0.5 font-mono text-[10px] text-danger">
              requisito de atributo no cumplido
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-mono text-xs tabular-nums text-accent">
            {weapon.precio.toLocaleString("es-ES")} €$
          </span>
          {owned ? (
            <button
              type="button"
              onClick={onSell}
              className="clip-chamfer-sm border border-danger px-2 py-1 font-mono text-[10px] uppercase text-danger active:scale-95"
            >
              Vender
            </button>
          ) : (
            <button
              type="button"
              onClick={onBuy}
              disabled={!affordable}
              className="clip-chamfer-sm border border-accent bg-accent px-2 py-1 font-mono text-[10px] uppercase text-black active:scale-95 disabled:border-border disabled:bg-elevated disabled:text-muted"
            >
              Comprar
            </button>
          )}
        </div>
      </div>
    </HudCard>
  );
}

export function ArmasTab({
  sheet,
  dineroDisponible,
  onBuy,
  onSell,
}: {
  sheet: BuildSheet;
  dineroDisponible: number;
  onBuy: (id: string) => void;
  onSell: (id: string) => void;
}) {
  const owned = new Set(sheet.weapons.map((w) => w.id));
  return (
    <div className="flex flex-col gap-2">
      <div className="mb-1 flex items-center justify-between border-y border-border py-2 font-mono text-xs">
        <span className="uppercase tracking-wide text-muted">Disponible</span>
        <span className="tabular-nums text-accent">
          {dineroDisponible.toLocaleString("es-ES")} €$
        </span>
      </div>
      {WEAPONS.map((w) => (
        <WeaponCard
          key={w.id}
          weapon={w}
          owned={owned.has(w.id)}
          affordable={dineroDisponible >= w.precio}
          reqMet={weaponReqMet(w, sheet.attributes)}
          onBuy={() => onBuy(w.id)}
          onSell={() => onSell(w.id)}
        />
      ))}
    </div>
  );
}
