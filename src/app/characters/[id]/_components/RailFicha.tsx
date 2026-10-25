"use client";

import type { ReactNode } from "react";
import {
  ATRIBUTOS,
  APLICADOS,
  describirEstadosActivos,
  pesoEquipado,
  type EstadoFicha,
  type FichaResuelta,
} from "@/lib/rules";
import { BarraVital } from "@/components/BarraVital";
import { ChipEstado } from "@/components/ChipEstado";
import { EstadoFichaChip } from "@/components/EstadoFichaChip";

// Columna izquierda de la cabina de escritorio: el vistazo de siempre a la ficha. Solo lee,
// salvo el −/+ de vida y fatiga (los mismos commits que Recursos). Lo que se edita —
// identidad, especie, compra de atributos, envío a revisión— sigue en sus pestañas.
export function RailFicha({
  name,
  estado,
  ficha,
  xp,
  creditos,
  controlMaster,
  soloLectura,
  onAjustarVida,
  onAjustarFatiga,
}: {
  name: string;
  estado: EstadoFicha;
  ficha: FichaResuelta;
  xp: number;
  creditos: number;
  controlMaster?: ReactNode;
  soloLectura: boolean;
  onAjustarVida: (delta: number) => void;
  onAjustarFatiga: (delta: number) => void;
}) {
  const sheet = ficha.ficha;
  const { vida, fatiga } = ficha.salud;
  const especie = ficha.especie
    ? [ficha.especie.especie, ficha.especie.casta, ficha.especie.linaje].flatMap((o) => (o ? [o.label] : [])).join(" · ")
    : "sin especie";
  const estados = describirEstadosActivos(ficha.estados, ficha.inmunidades);
  const mov = ficha.movimiento;
  const pesoArmas = pesoEquipado(sheet);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <EstadoFichaChip estado={estado} className="self-start" />
        <h1 className="break-words font-display text-3xl font-bold uppercase leading-none tracking-wide">
          {name || "Sin nombre"}
        </h1>
        <p className="font-mono text-xs uppercase tracking-wide text-muted">
          {especie}
          <br />
          <span className="tabular-nums">
            XP {xp} · {creditos.toLocaleString("es-ES")} cr.
          </span>
        </p>
      </div>

      {controlMaster && <div className="flex flex-wrap items-center gap-2">{controlMaster}</div>}

      <Bloque titulo="salud">
        <Vital
          label="Vida"
          actual={sheet.vidaActual}
          max={vida}
          tono="danger"
          danio={ficha.danio}
          disabled={soloLectura}
          onAjustar={onAjustarVida}
        />
        <Vital
          label="Fatiga"
          actual={sheet.fatigaActual}
          max={fatiga}
          tono="info"
          disabled={soloLectura}
          onAjustar={onAjustarFatiga}
        />
        {sheet.fatigaTemporal > 0 && (
          <p className="font-mono text-[10px] leading-relaxed text-info">
            {sheet.fatigaTemporal} temporal de Proeza · efectiva {sheet.fatigaActual - sheet.fatigaTemporal}
          </p>
        )}
      </Bloque>

      {estados.length > 0 && (
        <Bloque titulo="estados">
          <div className="flex flex-wrap gap-1.5">
            {estados.map((a) => (
              <ChipEstado key={a.estadoId} estado={a} />
            ))}
          </div>
        </Bloque>
      )}

      <Bloque titulo="atributos">
        <div className="grid grid-cols-3 gap-1.5">
          {ATRIBUTOS.map((a) => {
            const total = ficha.desgloses.atributos[a.id].total;
            return (
              <Celda
                key={a.id}
                sigla={a.abbr}
                titulo={a.label}
                valor={total}
                tono={total !== sheet.atributos[a.id] ? "text-info" : "text-foreground"}
              />
            );
          })}
        </div>
      </Bloque>

      <Bloque titulo="aplicados">
        <div className="grid grid-cols-3 gap-1.5">
          {APLICADOS.map((a) => (
            <Celda
              key={a.id}
              sigla={a.abbr}
              titulo={`${a.label} = ${a.de.map((b) => ATRIBUTOS.find((x) => x.id === b)!.abbr).join(" + ")}`}
              valor={ficha.desgloses.aplicados[a.id].total}
              tono="text-info"
              linea
            />
          ))}
        </div>
      </Bloque>

      <Bloque titulo="datos">
        <dl className="flex flex-col font-mono text-xs">
          <Dato k="Alerta" v={`${ficha.alerta}`} />
          <Dato k="Carrera" v={`${mov.carrera} m`} />
          <Dato k="Salto horizontal" v={`${mov.saltoHorizontal} cm`} />
          <Dato k="Salto vertical" v={`${mov.saltoVertical} cm`} />
          <Dato
            k="Carga (armas)"
            v={`${pesoArmas} / ${ficha.cargaMaxima} kg`}
            tono={pesoArmas > ficha.cargaMaxima ? "text-danger" : undefined}
          />
        </dl>
      </Bloque>
    </div>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted">{`//${titulo}`}</h2>
      {children}
    </section>
  );
}

function Vital({
  label,
  actual,
  max,
  tono,
  danio,
  disabled,
  onAjustar,
}: {
  label: string;
  actual: number;
  max: number;
  tono: "danger" | "info";
  danio?: FichaResuelta["danio"];
  disabled: boolean;
  onAjustar: (delta: number) => void;
}) {
  return (
    <div className="flex items-end gap-2">
      <div className="min-w-0 flex-1">
        <BarraVital label={label} actual={actual} max={max} tono={tono} danio={danio} />
      </div>
      <BotonVital label={`Bajar ${label.toLowerCase()}`} disabled={disabled || actual <= 0} onClick={() => onAjustar(-1)}>
        −
      </BotonVital>
      <BotonVital label={`Subir ${label.toLowerCase()}`} disabled={disabled || actual >= max} onClick={() => onAjustar(1)}>
        +
      </BotonVital>
    </div>
  );
}

function BotonVital({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="h-8 w-8 shrink-0 border border-border bg-elevated font-mono text-base leading-none text-foreground active:scale-95 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function Celda({
  sigla,
  titulo,
  valor,
  tono,
  linea = false,
}: {
  sigla: string;
  titulo: string;
  valor: number;
  tono: string;
  linea?: boolean;
}) {
  return (
    <div
      title={titulo}
      className={`flex items-baseline justify-between border border-border bg-surface px-2 py-1.5 ${linea ? "border-l-2 border-l-info" : ""}`}
    >
      <span className="font-mono text-[11px] text-muted">{sigla}</span>
      <span className={`font-display text-lg font-bold tabular-nums leading-none ${tono}`}>{valor}</span>
    </div>
  );
}

function Dato({ k, v, tono }: { k: string; v: string; tono?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border py-1 last:border-0">
      <dt className="text-soft">{k}</dt>
      <dd className={`tabular-nums ${tono ?? "text-foreground"}`}>{v}</dd>
    </div>
  );
}
