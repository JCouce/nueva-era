import { salud, movimiento } from "@/lib/rules";
import type { Sheet } from "@/lib/rules";
import { HudCard } from "@/components/HudCard";

const fieldLabel = "font-mono text-[10px] uppercase tracking-widest text-muted";
const fieldInput =
  "clip-chamfer-sm border border-border bg-night px-3 py-2 font-mono outline-none focus:border-accent";

function Dato({
  label,
  value,
  unidad,
  tono = "text-foreground",
}: {
  label: string;
  value: number;
  unidad?: string;
  tono?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border py-1.5 last:border-0">
      <span className="font-mono text-[11px] uppercase text-muted">{label}</span>
      <span className={`font-mono text-sm tabular-nums ${tono}`}>
        {value}
        {unidad && <span className="text-muted"> {unidad}</span>}
      </span>
    </div>
  );
}

export function ResumenTab({
  name,
  sheet,
  onName,
  onEdad,
  onEspecie,
  onTrasfondo,
  onMotivacion,
}: {
  name: string;
  sheet: Sheet;
  onName: (v: string) => void;
  onEdad: (v: number | null) => void;
  onEspecie: (v: string) => void;
  onTrasfondo: (v: string) => void;
  onMotivacion: (v: string) => void;
}) {
  const { vida, fatiga } = salud(sheet);
  const mov = movimiento(sheet);

  return (
    <div className="flex flex-col gap-4">
      {/* Identidad */}
      <HudCard className="p-4">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted">
          {"//SYSTEM · identidad"}
        </p>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>{"// Nombre"}</span>
            <input
              type="text"
              value={name}
              maxLength={80}
              onChange={(e) => onName(e.target.value)}
              className={`${fieldInput} text-lg text-foreground`}
            />
          </label>
          <div className="flex gap-3">
            <label className="flex w-24 flex-col gap-1">
              <span className={fieldLabel}>{"// Edad"}</span>
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
            <label className="flex flex-1 flex-col gap-1">
              <span className={fieldLabel}>{"// Especie"}</span>
              <input
                type="text"
                value={sheet.especie}
                maxLength={60}
                onChange={(e) => onEspecie(e.target.value)}
                className={`${fieldInput} text-lg text-foreground`}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>{"// Motivación"}</span>
            <input
              type="text"
              value={sheet.motivacion}
              maxLength={500}
              placeholder="Qué te mueve"
              onChange={(e) => onMotivacion(e.target.value)}
              className={`${fieldInput} text-sm text-foreground placeholder:text-muted`}
            />
          </label>
        </div>
      </HudCard>

      {/* Derivados: nada de esto se edita, todo sale de atributos y habilidades */}
      <HudCard className="p-4">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted">
          {"//SYSTEM · estado"}
        </p>
        <Dato label="Puntos de vida" value={vida} tono="text-danger" />
        <Dato label="Puntos de fatiga" value={fatiga} tono="text-info" />
      </HudCard>

      <HudCard className="p-4">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted">
          {"//SYSTEM · movimiento"}
        </p>
        <Dato label="Carrera" value={mov.carrera} unidad="m" />
        <Dato label="Salto vertical" value={mov.saltoVertical} unidad="cm" />
        <Dato label="Salto horizontal" value={mov.saltoHorizontal} unidad="cm" />
        <Dato label="Escalada" value={mov.escalada} unidad="m" />
        <Dato label="Nado" value={mov.nado} unidad="m" />
      </HudCard>

      {/* Trasfondo */}
      <HudCard className="p-4">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted">
          {"//SYSTEM · trasfondo"}
        </p>
        <textarea
          value={sheet.trasfondo}
          maxLength={2000}
          rows={5}
          placeholder="Historia, ganchos de rol…"
          onChange={(e) => onTrasfondo(e.target.value)}
          className="clip-chamfer-sm w-full resize-none border border-border bg-night px-3 py-2 font-sans text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
        />
      </HudCard>
    </div>
  );
}
