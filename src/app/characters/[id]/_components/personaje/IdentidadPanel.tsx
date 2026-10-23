"use client";

import { useState } from "react";
import { rangoReferencia, identidadPorDefecto, type FichaResuelta } from "@/lib/rules";
import { HudCard } from "@/components/HudCard";

const fieldLabel = "font-mono text-[10px] uppercase tracking-widest text-muted";
const fieldBase = "clip-chamfer-sm w-full min-w-0 border border-border bg-night px-3 py-2 outline-none focus:border-accent";
const fieldInput = `${fieldBase} font-mono`;

// Número opcional como texto (sin las flechas del navegador). Sin valor guardado
// enseña `defecto` atenuado (no se guarda: §14.5). Mientras tiene el foco manda lo
// que se escribe, para que borrar el campo y teclear otro número no se encuentre
// el por defecto de vuelta a media escritura.
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
        type="text"
        inputMode="numeric"
        value={mostrado}
        onFocus={() => setEditando(valor === null ? "" : String(valor))}
        onBlur={() => setEditando(null)}
        placeholder={defecto !== null ? String(defecto) : undefined}
        onChange={(e) => {
          const limpio = e.target.value.replace(/\D/g, "").slice(0, 4);
          setEditando(limpio);
          onChange(limpio === "" ? null : Number(limpio));
        }}
        className={`${fieldInput} text-lg tabular-nums placeholder:text-muted/60 ${
          porDefecto && editando === null ? "text-muted" : "text-foreground"
        }`}
      />
      {porDefecto && <span className="font-mono text-[10px] uppercase tracking-wide text-muted">por defecto</span>}
    </label>
  );
}

// La barra del rango de referencia es el control: un range nativo transparente
// encima (accesible y táctil) mueve el marcador. La escala deja margen a cada lado,
// porque el rango solo es referencia (§14.5) y se puede salir de él.
function SliderRango({
  label,
  fuente,
  min,
  max,
  valor,
  defecto,
  unidad,
  onChange,
}: {
  label: string;
  fuente: string;
  min: number;
  max: number;
  valor: number | null;
  defecto: number;
  unidad: string;
  onChange: (v: number | null) => void;
}) {
  const margen = Math.max(1, Math.round((max - min) * 0.4));
  const desde = Math.max(0, min - margen);
  const hasta = max + margen;
  const actual = valor ?? defecto;
  const pct = (v: number) => `${Math.min(100, Math.max(0, ((v - desde) / (hasta - desde)) * 100))}%`;
  const fuera = actual < min || actual > max;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className={fieldLabel}>{label}</span>
        <span className="flex items-baseline gap-2">
          {valor === null ? (
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted">por defecto</span>
          ) : (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="font-mono text-[10px] uppercase tracking-wide text-info active:scale-95"
            >
              ↺ por defecto
            </button>
          )}
          <span
            className={`font-mono text-lg tabular-nums ${
              fuera ? "text-danger" : valor === null ? "text-muted" : "text-foreground"
            }`}
          >
            {actual}
            <span className="text-xs text-muted"> {unidad}</span>
          </span>
        </span>
      </div>
      <div className="relative h-8">
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 bg-night">
          <div className="absolute inset-y-0 bg-info/40" style={{ left: pct(min), right: `calc(100% - ${pct(max)})` }} />
        </div>
        <div
          className={`pointer-events-none absolute top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 ${
            fuera ? "bg-danger" : "bg-accent"
          }`}
          style={{ left: pct(actual) }}
        />
        <input
          type="range"
          min={desde}
          max={hasta}
          step={1}
          value={actual}
          aria-label={label}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      <p className="font-mono text-[10px] leading-relaxed text-muted">
        {fuente}: {min}–{max} {unidad}
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
        {/* Solo referencia (§14.5): los valores siguen libres, no se valida. */}
        {rango ? (
          <>
            <div className="w-24">
              <CampoNumero label="// Edad" valor={sheet.edad} defecto={null} onChange={onEdad} />
            </div>
            <SliderRango
              label="// Altura"
              fuente={rango.fuente}
              min={rango.alturaCm.min}
              max={rango.alturaCm.max}
              valor={sheet.altura}
              defecto={defecto.alturaCm!}
              unidad="cm"
              onChange={onAltura}
            />
            <SliderRango
              label="// Peso"
              fuente={rango.fuente}
              min={rango.pesoKg.min}
              max={rango.pesoKg.max}
              valor={sheet.peso}
              defecto={defecto.pesoKg!}
              unidad="kg"
              onChange={onPeso}
            />
          </>
        ) : (
          <>
            <div className="flex items-start gap-2">
              <CampoNumero label="// Edad" valor={sheet.edad} defecto={null} onChange={onEdad} />
              <CampoNumero label="// Altura (cm)" valor={sheet.altura} defecto={null} onChange={onAltura} />
              <CampoNumero label="// Peso (kg)" valor={sheet.peso} defecto={null} onChange={onPeso} />
            </div>
            <p className="font-mono text-[10px] leading-relaxed text-muted">{sinRango}</p>
          </>
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
            className={`${fieldBase} resize-none font-sans text-prosa text-foreground placeholder:text-muted`}
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
            className={`${fieldBase} resize-none font-sans text-prosa text-foreground placeholder:text-muted`}
          />
        </label>
      </HudCard>
    </div>
  );
}
