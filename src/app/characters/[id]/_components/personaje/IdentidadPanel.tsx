"use client";

import { useState } from "react";
import { rangoReferencia, identidadPorDefecto, type FichaResuelta } from "@/lib/rules";
import { HudCard } from "@/components/HudCard";

const fieldLabel = "font-mono text-[10px] uppercase tracking-widest text-muted";
const fieldBase = "clip-chamfer-sm w-full min-w-0 border border-border bg-night px-3 py-2 outline-none focus:border-accent";
const fieldInput = `${fieldBase} font-mono`;

// Número opcional. Sin valor guardado enseña `defecto` atenuado (no se guarda: §14.5).
// Mientras tiene el foco manda lo que se escribe, para que borrar el campo y teclear
// otro número no se encuentre el por defecto de vuelta a media escritura.
function CampoNumero({
  label,
  valor,
  defecto,
  onChange,
}: {
  label: string;
  valor: number | null;
  defecto: number | null;
  onChange: (v: number | null) => void;
}) {
  const [editando, setEditando] = useState<string | null>(null);
  const porDefecto = valor === null && defecto !== null;
  const mostrado = editando ?? String(valor ?? defecto ?? "");
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className={fieldLabel}>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={mostrado}
        onFocus={() => setEditando(valor === null ? "" : String(valor))}
        onBlur={() => setEditando(null)}
        placeholder={defecto !== null ? String(defecto) : undefined}
        onChange={(e) => {
          setEditando(e.target.value);
          onChange(e.target.value === "" ? null : Number(e.target.value));
        }}
        className={`${fieldInput} text-lg tabular-nums placeholder:text-muted/60 ${
          porDefecto && editando === null ? "text-muted" : "text-foreground"
        }`}
      />
      {porDefecto && <span className="font-mono text-[9px] uppercase tracking-wide text-muted">por defecto</span>}
    </label>
  );
}

// Barra del rango de referencia con tu valor marcado. La escala deja un margen a
// cada lado para que un valor fuera de rango se vea fuera.
function BarraRango({
  fuente,
  min,
  max,
  valor,
  unidad,
}: {
  fuente: string;
  min: number;
  max: number;
  valor: number | null;
  unidad: string;
}) {
  const margen = Math.max(1, (max - min) * 0.4);
  const desde = Math.max(0, min - margen);
  const hasta = max + margen;
  const pct = (v: number) => `${Math.min(100, Math.max(0, ((v - desde) / (hasta - desde)) * 100))}%`;
  const fuera = valor !== null && (valor < min || valor > max);
  return (
    <div className="flex flex-col gap-1">
      <div className="relative h-2 bg-night">
        <div className="absolute inset-y-0 bg-info/40" style={{ left: pct(min), right: `calc(100% - ${pct(max)})` }} />
        {valor !== null && (
          <div
            className={`absolute -top-1 h-4 w-1 -translate-x-1/2 ${fuera ? "bg-danger" : "bg-accent"}`}
            style={{ left: pct(valor) }}
          />
        )}
      </div>
      <p className="font-mono text-[10px] leading-relaxed text-muted">
        {fuente}: {min}–{max} {unidad}
        {valor !== null && (
          <>
            {" · "}
            <span className={fuera ? "text-danger" : "text-foreground"}>tú: {valor}</span>
          </>
        )}
      </p>
    </div>
  );
}

export function IdentidadPanel({
  name,
  ficha,
  onName,
  onEdad,
  onAltura,
  onPeso,
  onMotivacion,
  onTrasfondo,
}: {
  name: string;
  ficha: FichaResuelta;
  onName: (v: string) => void;
  onEdad: (v: number | null) => void;
  onAltura: (v: number | null) => void;
  onPeso: (v: number | null) => void;
  onMotivacion: (v: string) => void;
  onTrasfondo: (v: string) => void;
}) {
  const sheet = ficha.ficha;
  const rango = rangoReferencia(ficha.especie, sheet.atributos.fuerza);
  const defecto = identidadPorDefecto(rango);
  const altura = sheet.altura ?? defecto.alturaCm;
  const peso = sheet.peso ?? defecto.pesoKg;
  const sinRango = !ficha.especie
    ? "Elige especie para ver tu rango."
    : ficha.especie.especie.castas && !ficha.especie.casta
      ? "Elige casta para ver tu rango."
      : "El documento no da rango para esta especie.";

  return (
    <div className="flex flex-col gap-4">
      <HudCard className="flex flex-col gap-3 p-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted">{"//SYSTEM · identidad"}</p>
        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>{"// Nombre"}</span>
          <input
            type="text"
            value={name}
            maxLength={80}
            placeholder="Cómo te llaman"
            onChange={(e) => onName(e.target.value)}
            className={`${fieldInput} text-lg text-foreground placeholder:text-muted`}
          />
        </label>
        <div className="flex items-start gap-2">
          <CampoNumero label="// Edad" valor={sheet.edad} defecto={null} onChange={onEdad} />
          <CampoNumero label="// Altura (cm)" valor={sheet.altura} defecto={defecto.alturaCm} onChange={onAltura} />
          <CampoNumero label="// Peso (kg)" valor={sheet.peso} defecto={defecto.pesoKg} onChange={onPeso} />
        </div>
        {/* Solo referencia (§14.5): los campos siguen libres, no se valida. */}
        {rango ? (
          <div className="flex flex-col gap-3">
            <BarraRango fuente={rango.fuente} min={rango.alturaCm.min} max={rango.alturaCm.max} valor={altura} unidad="cm" />
            <BarraRango fuente={rango.fuente} min={rango.pesoKg.min} max={rango.pesoKg.max} valor={peso} unidad="kg" />
          </div>
        ) : (
          <p className="font-mono text-[10px] leading-relaxed text-muted">{sinRango}</p>
        )}
      </HudCard>

      <HudCard className="flex flex-col gap-3 p-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted">{"//SYSTEM · trasfondo"}</p>
        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>{"// Motivación"}</span>
          <textarea
            value={sheet.motivacion}
            maxLength={500}
            rows={2}
            placeholder="Qué te mueve"
            onChange={(e) => onMotivacion(e.target.value)}
            className={`${fieldBase} resize-none font-sans text-sm text-foreground placeholder:text-muted`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>{"// Trasfondo"}</span>
          <textarea
            value={sheet.trasfondo}
            maxLength={2000}
            rows={5}
            placeholder="Historia, ganchos de rol…"
            onChange={(e) => onTrasfondo(e.target.value)}
            className={`${fieldBase} resize-none font-sans text-sm text-foreground placeholder:text-muted`}
          />
        </label>
      </HudCard>
    </div>
  );
}
