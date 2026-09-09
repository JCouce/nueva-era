"use client";

import { useState } from "react";
import {
  DIFICULTADES,
  estadoInicial,
  valorCondiciones,
  type CondicionTirada,
  type EstadoCondiciones,
} from "@/lib/rules";
import { HudCard } from "./HudCard";

function signo(n: number) {
  return n >= 0 ? `+${n}` : `${n}`;
}

function ControlCondicion({
  condicion,
  estado,
  onCambiar,
}: {
  condicion: CondicionTirada;
  estado: EstadoCondiciones;
  onCambiar: (id: string, valor: string | number | boolean) => void;
}) {
  if (condicion.tipo === "toggle") {
    const activo = Boolean(estado[condicion.id]);
    return (
      <button
        type="button"
        onClick={() => onCambiar(condicion.id, !activo)}
        aria-pressed={activo}
        className={`clip-chamfer-sm w-full border px-3 py-2 text-left font-mono text-xs uppercase active:scale-[0.99] ${
          activo ? "border-info text-info" : "border-border text-muted"
        }`}
      >
        {activo ? "✓ " : ""}
        {condicion.etiqueta}
        <span className="float-right tabular-nums">
          {signo(activo ? condicion.valorActivo : (condicion.valorInactivo ?? 0))}
        </span>
      </button>
    );
  }

  if (condicion.tipo === "opcion") {
    return (
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {condicion.etiqueta}
        </p>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          {condicion.opciones.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onCambiar(condicion.id, o.id)}
              className={`clip-chamfer-sm border px-2 py-1.5 font-mono text-[11px] uppercase active:scale-[0.98] ${
                estado[condicion.id] === o.id
                  ? "border-accent text-accent"
                  : "border-border text-muted"
              }`}
            >
              {o.etiqueta}
              <span className="ml-1 tabular-nums">{signo(o.valor)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // contador
  const n = typeof estado[condicion.id] === "number" ? (estado[condicion.id] as number) : condicion.porDefecto;
  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {condicion.etiqueta}
        </p>
        <p className="font-mono text-[10px] tabular-nums text-muted">
          {signo(n * condicion.valorPorUnidad)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onCambiar(condicion.id, Math.max(condicion.min, n - 1))}
          aria-label={`Bajar ${condicion.etiqueta}`}
          className="h-9 w-9 border border-border bg-elevated font-mono text-lg leading-none text-muted active:scale-95"
        >
          −
        </button>
        <span className="w-6 text-center font-mono text-lg tabular-nums text-foreground">{n}</span>
        <button
          type="button"
          onClick={() => onCambiar(condicion.id, Math.min(condicion.max, n + 1))}
          aria-label={`Subir ${condicion.etiqueta}`}
          className="h-9 w-9 border border-border bg-elevated font-mono text-lg leading-none text-muted active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function TiradaModal({
  titulo,
  subtitulo,
  modBase,
  condiciones,
  dificultadInicial,
  circunstancialInicial,
  onCerrar,
  onTirar,
}: {
  titulo: string;
  subtitulo?: string;
  modBase: number;
  condiciones: CondicionTirada[];
  dificultadInicial: number | null;
  circunstancialInicial: number;
  onCerrar: () => void;
  onTirar: (args: {
    estadoCondiciones: EstadoCondiciones;
    dificultad: number | null;
    circunstancial: number;
  }) => void;
}) {
  const [estado, setEstado] = useState<EstadoCondiciones>(() => estadoInicial(condiciones));
  const [dificultad, setDificultad] = useState(dificultadInicial);
  const [dificultadCustom, setDificultadCustom] = useState("");
  const [circunstancial, setCircunstancial] = useState(circunstancialInicial);

  const cambiar = (id: string, valor: string | number | boolean) =>
    setEstado((e) => ({ ...e, [id]: valor }));

  const totalCondiciones = valorCondiciones(condiciones, estado);
  const totalPrevisto = modBase + totalCondiciones + circunstancial;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
      onClick={onCerrar}
    >
      <HudCard
        className="max-h-[85vh] w-full max-w-md overflow-y-auto p-4 sm:mx-4"
        // Evita que un tap dentro de la tarjeta cierre el modal por el
        // listener del fondo.
      >
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate font-display text-lg font-semibold uppercase leading-tight">
                {titulo}
              </h2>
              {subtitulo && (
                <p className="mt-0.5 font-mono text-[10px] uppercase text-muted">{subtitulo}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="shrink-0 border border-border px-2 py-1 font-mono text-xs text-muted active:scale-95"
            >
              ✕
            </button>
          </div>

          {condiciones.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-3">
              {condiciones.map((c) => (
                <ControlCondicion key={c.id} condicion={c} estado={estado} onCambiar={cambiar} />
              ))}
            </div>
          )}

          <div className="mt-4 border-t border-border pt-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {"// Dificultad"}
            </p>
            <div className="mt-2 grid grid-cols-4 gap-1">
              {DIFICULTADES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setDificultad(d.valor);
                    setDificultadCustom("");
                  }}
                  className={`clip-chamfer-sm border px-1 py-1.5 font-mono text-[10px] uppercase active:scale-95 ${
                    dificultad === d.valor && dificultadCustom === ""
                      ? "border-accent text-accent"
                      : "border-border text-muted"
                  }`}
                >
                  {d.label}
                  <span className="block tabular-nums">{d.valor}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setDificultad(null);
                  setDificultadCustom("");
                }}
                className={`clip-chamfer-sm border px-1 py-1.5 font-mono text-[10px] uppercase active:scale-95 ${
                  dificultad === null
                    ? "border-accent text-accent"
                    : "border-border text-muted"
                }`}
              >
                sin dificultad
              </button>
              <input
                type="number"
                inputMode="numeric"
                placeholder="custom"
                value={dificultadCustom}
                onChange={(e) => {
                  const v = e.target.value;
                  setDificultadCustom(v);
                  setDificultad(v === "" ? null : Number(v));
                }}
                className="clip-chamfer-sm border border-border bg-elevated px-1 py-1.5 text-center font-mono text-[10px] uppercase text-foreground placeholder:text-muted"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {"// Modificador circunstancial"}
              </p>
              <p className="font-sans text-[11px] text-muted">Heridas, fatiga, cobertura…</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCircunstancial((v) => Math.max(-10, v - 1))}
                aria-label="Bajar modificador"
                className="h-9 w-9 border border-border bg-elevated font-mono text-lg leading-none text-muted active:scale-95"
              >
                −
              </button>
              <span
                className={`w-10 text-center font-mono text-xl tabular-nums ${
                  circunstancial === 0 ? "text-muted" : circunstancial > 0 ? "text-info" : "text-danger"
                }`}
              >
                {signo(circunstancial)}
              </span>
              <button
                type="button"
                onClick={() => setCircunstancial((v) => Math.min(10, v + 1))}
                aria-label="Subir modificador"
                className="h-9 w-9 border border-border bg-elevated font-mono text-lg leading-none text-muted active:scale-95"
              >
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onTirar({ estadoCondiciones: estado, dificultad, circunstancial })}
            className="clip-chamfer-sm mt-4 w-full border border-accent bg-accent py-3 font-display text-sm font-semibold uppercase tracking-wide text-black active:scale-[0.98]"
          >
            Tirar ({signo(totalPrevisto)})
          </button>
        </div>
      </HudCard>
    </div>
  );
}
