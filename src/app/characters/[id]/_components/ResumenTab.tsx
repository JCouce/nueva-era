import { ESPECIALIDADES, type EspecialidadId } from "@/lib/rules";
import type { BuildSheet } from "@/lib/validation";
import { HudCard } from "@/components/HudCard";
import { ACCENT } from "./accents";

const fieldLabel = "font-mono text-[10px] uppercase tracking-widest text-muted";
const fieldInput =
  "clip-chamfer-sm border border-border bg-night px-3 py-2 font-mono outline-none focus:border-accent";

export function ResumenTab({
  name,
  sheet,
  xpDisponible,
  dineroDisponible,
  onName,
  onEdad,
  onTrasfondo,
  onEspecialidad,
  onGanadoXp,
  onGanadoDinero,
}: {
  name: string;
  sheet: BuildSheet;
  xpDisponible: number;
  dineroDisponible: number;
  onName: (v: string) => void;
  onEdad: (v: number | null) => void;
  onTrasfondo: (v: string) => void;
  onEspecialidad: (v: EspecialidadId | null) => void;
  onGanadoXp: (v: number) => void;
  onGanadoDinero: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Identidad */}
      <HudCard className="p-4">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted">
          //SYSTEM · identidad
        </p>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>// Nombre</span>
            <input
              type="text"
              value={name}
              maxLength={80}
              onChange={(e) => onName(e.target.value)}
              className={`${fieldInput} text-lg text-foreground`}
            />
          </label>
          <label className="flex w-28 flex-col gap-1">
            <span className={fieldLabel}>// Edad</span>
            <input
              type="number"
              inputMode="numeric"
              value={sheet.edad ?? ""}
              onChange={(e) =>
                onEdad(e.target.value === "" ? null : Number(e.target.value))
              }
              className={`${fieldInput} text-lg tabular-nums text-foreground`}
            />
          </label>
        </div>
      </HudCard>

      {/* Arquetipo */}
      <HudCard className="p-4">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted">
          //SYSTEM · arquetipo
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {ESPECIALIDADES.map((e) => {
            const selected = sheet.especialidad === e.id;
            const a = ACCENT[e.accent];
            return (
              <button
                key={e.id}
                type="button"
                onClick={() =>
                  onEspecialidad(sheet.especialidad === e.id ? null : e.id)
                }
                className={`clip-chamfer-sm border px-1 py-2 font-display text-xs font-semibold uppercase tracking-wide transition ${
                  selected
                    ? `${a.border} ${a.text} ${a.glow} bg-elevated`
                    : "border-border text-muted"
                }`}
              >
                {e.label}
              </button>
            );
          })}
        </div>
      </HudCard>

      {/* Recursos: se edita lo GANADO, el disponible se deriva */}
      <HudCard className="p-4">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted">
          //SYSTEM · recursos
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className={`${fieldLabel} text-info`}>// XP total</span>
            <input
              type="number"
              inputMode="numeric"
              value={sheet.xpGanado}
              onChange={(e) => onGanadoXp(Number(e.target.value))}
              className={`${fieldInput} text-2xl tabular-nums text-info focus:border-info`}
            />
            <span className="font-mono text-[10px] tabular-nums text-muted">
              disponible: <span className="text-info">{xpDisponible}</span>
            </span>
          </label>
          <label className="flex flex-col gap-1">
            <span className={`${fieldLabel} text-accent`}>// €$ total</span>
            <input
              type="number"
              inputMode="numeric"
              value={sheet.dineroGanado}
              onChange={(e) => onGanadoDinero(Number(e.target.value))}
              className={`${fieldInput} text-2xl tabular-nums text-accent`}
            />
            <span className="font-mono text-[10px] tabular-nums text-muted">
              disponible:{" "}
              <span className="text-accent">
                {dineroDisponible.toLocaleString("es-ES")}
              </span>
            </span>
          </label>
        </div>
      </HudCard>

      {/* Trasfondo */}
      <HudCard className="p-4">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted">
          //SYSTEM · trasfondo
        </p>
        <textarea
          value={sheet.trasfondo}
          maxLength={2000}
          rows={5}
          placeholder="Historia, motivaciones, ganchos de rol…"
          onChange={(e) => onTrasfondo(e.target.value)}
          className="clip-chamfer-sm w-full resize-none border border-border bg-night px-3 py-2 font-sans text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
        />
      </HudCard>
    </div>
  );
}
