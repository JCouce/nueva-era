"use client";

import { vuelo, levitacion, pesoEquipado, type FichaResuelta } from "@/lib/rules";
import { HudCard } from "@/components/HudCard";

// Vistazo rápido: el ajuste de vida y fatiga vive en Recursos (docs/tareas.md, 2026-09-27).
function Barra({
  label,
  actual,
  max,
  color,
  nota,
}: {
  label: string;
  actual: number;
  max: number;
  color: "danger" | "info";
  nota?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (actual / max) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wide text-muted">{label}</span>
        <span className={`font-mono text-lg tabular-nums ${color === "danger" ? "text-danger" : "text-info"}`}>
          {actual}
          <span className="text-sm text-muted">/{max}</span>
        </span>
      </div>
      <div className="clip-chamfer-sm h-2.5 bg-night">
        <div
          className={`h-full ${color === "danger" ? "bg-danger shadow-glow-danger" : "bg-info shadow-glow-cyan"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {nota && <p className="font-mono text-[10px] leading-relaxed text-info">{nota}</p>}
    </div>
  );
}

function Dato({
  label,
  valor,
  unidad,
  tono = "text-foreground",
  nota,
}: {
  label: string;
  valor: number;
  unidad?: string;
  tono?: string;
  // De dónde sale un extra, p.ej. "+4 exoesqueleto": mismo tono que el valor.
  nota?: string;
}) {
  return (
    <div className="clip-chamfer-sm flex flex-col gap-0.5 border border-border bg-night px-3 py-2">
      <span className="font-mono text-[10px] uppercase tracking-wide text-muted">{label}</span>
      <span className={`font-mono text-lg tabular-nums leading-tight ${tono}`}>
        {valor}
        {unidad && <span className="text-xs text-muted"> {unidad}</span>}
      </span>
      {nota && <span className={`font-mono text-[10px] ${tono}`}>{nota}</span>}
    </div>
  );
}

// Lo derivado: nada de esto se edita, todo sale de atributos, habilidades y equipo.
export function EstadoPanel({ ficha }: { ficha: FichaResuelta }) {
  const sheet = ficha.ficha;
  const { vida, fatiga } = ficha.salud;
  const mov = ficha.movimiento;
  const vue = vuelo(sheet);
  const lev = levitacion(ficha.psionica.paraEfectos);
  const conExo = mov.bonoExoesqueleto > 0;
  const notaExo = conExo ? `+${mov.bonoExoesqueleto} exoesqueleto` : undefined;
  const tonoMov = conExo ? "text-info" : "text-foreground";
  const limiteCarga = ficha.cargaMaxima;
  const pesoArmas = pesoEquipado(sheet);

  return (
    <div className="flex flex-col gap-4">
      <HudCard className="flex flex-col gap-4 p-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted">{"//SYSTEM · salud"}</p>
        <Barra label="Puntos de vida" actual={sheet.vidaActual} max={vida} color="danger" />
        <Barra
          label="Puntos de fatiga"
          actual={sheet.fatigaActual}
          max={fatiga}
          color="info"
          nota={
            sheet.fatigaTemporal > 0
              ? `${sheet.fatigaTemporal} temporal de Proeza · efectiva ${sheet.fatigaActual - sheet.fatigaTemporal}`
              : undefined
          }
        />
      </HudCard>

      <HudCard className="flex flex-col gap-3 p-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted">{"//SYSTEM · datos"}</p>
        <div className="grid grid-cols-2 gap-2">
          <Dato label="Alerta" valor={ficha.alerta} tono="text-accent" />
          {/* Carga transportable (sistema.md §5.5): solo el dato, sin penalizadores todavía. */}
          <Dato
            label="Carga (armas)"
            valor={pesoArmas}
            unidad={`/ ${limiteCarga} kg`}
            tono={pesoArmas > limiteCarga ? "text-danger" : "text-foreground"}
          />
          <Dato label="Carrera" valor={mov.carrera} unidad="m" tono={tonoMov} nota={notaExo} />
          <Dato label="Salto vertical" valor={mov.saltoVertical} unidad="cm" tono={tonoMov} nota={notaExo} />
          <Dato label="Salto horizontal" valor={mov.saltoHorizontal} unidad="cm" tono={tonoMov} nota={notaExo} />
          <Dato label="Escalada" valor={mov.escalada} unidad="m" tono={tonoMov} nota={notaExo} />
          <Dato label="Nado" valor={mov.nado} unidad="m" tono={tonoMov} nota={notaExo} />
          {vue && <Dato label={`Vuelo (mov. aérea ${vue.nivel})`} valor={vue.velocidadM} unidad="m" tono="text-info" />}
          {lev && <Dato label={`Levitar (Traslación ${lev.nivel})`} valor={lev.velocidadM} unidad="m" tono="text-info" />}
        </div>
        <p className="font-mono text-[10px] leading-relaxed text-muted">
          Carga: peso equipado frente al límite sin penalizador. Armaduras y módulos no traen peso en el
          documento — este número cuenta solo las armas equipadas.
        </p>
      </HudCard>
    </div>
  );
}
