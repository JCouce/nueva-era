"use client";

import { useState } from "react";
import {
  TIRADAS,
  GRUPOS_TIRADA,
  DIFICULTADES,
  APLICADOS,
  HABILIDADES,
  modificadorTirada,
  resolverTirada,
  tirarD12,
  type Tirada,
  type Resultado,
  type Sheet,
} from "@/lib/rules";
import { HudCard } from "@/components/HudCard";

type Lanzamiento = Resultado & { id: number; label: string };

function signo(n: number) {
  return n >= 0 ? `+${n}` : `${n}`;
}

// Panel del último resultado. Es lo primero que se mira tras pulsar, así que
// va arriba y con el total en grande.
function Marcador({ ultimo }: { ultimo: Lanzamiento | null }) {
  if (!ultimo) {
    return (
      <HudCard className="border-dashed p-4 text-center">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
          {"//SYSTEM · sin tiradas"}
        </p>
        <p className="mt-2 font-sans text-sm text-muted">
          Elige una acción y pulsa TIRAR.
        </p>
      </HudCard>
    );
  }

  const { exito, critico, margen } = ultimo;
  const tono =
    exito === null
      ? "text-foreground"
      : exito
        ? critico
          ? "text-accent"
          : "text-info"
        : critico
          ? "text-danger"
          : "text-muted";

  const veredicto =
    exito === null
      ? "sin dificultad"
      : exito
        ? critico
          ? "ÉXITO CRÍTICO"
          : "éxito"
        : critico
          ? "FRACASO CRÍTICO"
          : "fracaso";

  return (
    <HudCard className={`p-4 ${critico ? "border-accent" : ""}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-display text-sm font-semibold uppercase tracking-wide">
          {ultimo.label}
        </span>
        <span className={`font-mono text-[11px] uppercase tracking-widest ${tono}`}>
          {veredicto}
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-3">
        <span className={`font-display text-5xl font-bold tabular-nums ${tono}`}>
          {ultimo.total}
        </span>
        <span className="font-mono text-xs leading-tight text-muted">
          d12 <span className="text-foreground">{ultimo.dado}</span>
          {" · mod "}
          <span className="text-foreground">{signo(ultimo.modificador)}</span>
          {ultimo.circunstancial !== 0 && (
            <>
              {" · circ "}
              <span className="text-foreground">{signo(ultimo.circunstancial)}</span>
            </>
          )}
          {ultimo.dificultad !== null && (
            <>
              <br />
              {"vs dificultad "}
              <span className="text-foreground">{ultimo.dificultad}</span>
              {" · "}
              <span className={tono}>
                {margen! >= 0 ? `${margen} éxitos` : `${Math.abs(margen!)} fracasos`}
              </span>
            </>
          )}
        </span>
      </div>
    </HudCard>
  );
}

function FilaTirada({
  tirada,
  sheet,
  onTirar,
}: {
  tirada: Tirada;
  sheet: Sheet;
  onTirar: (t: Tirada, enEspecialidad: boolean) => void;
}) {
  const [enEspecialidad, setEnEspecialidad] = useState(false);

  const especialidades = tirada.habilidad
    ? sheet.habilidades[tirada.habilidad].especialidades
    : [];
  const mod = modificadorTirada(sheet, tirada, enEspecialidad);
  const nombreAplicado = APLICADOS.find((a) => a.id === tirada.aplicado)!;
  const nombreHabilidad = tirada.habilidad
    ? HABILIDADES.find((h) => h.id === tirada.habilidad)!.label
    : null;

  if (tirada.bloqueada) {
    return (
      <HudCard className="border-dashed p-3 opacity-60">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-display text-sm font-semibold uppercase text-muted">
            {tirada.label}
          </span>
          <span className="font-mono text-[10px] uppercase text-danger">
            sin definir
          </span>
        </div>
        <p className="mt-1 font-mono text-[10px] leading-relaxed text-muted">
          {tirada.bloqueada}
        </p>
      </HudCard>
    );
  }

  return (
    <HudCard className="p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="block truncate font-display text-base font-semibold uppercase leading-none">
            {tirada.label}
          </span>
          <span className="mt-1 block font-mono text-[10px] uppercase text-muted">
            {nombreAplicado.abbr} {mod.aplicado}
            {nombreHabilidad && (
              <>
                {" + "}
                {nombreHabilidad} {mod.habilidad}
              </>
            )}
          </span>
        </div>

        <span className="font-mono text-2xl tabular-nums text-info">
          {signo(mod.total)}
        </span>

        <button
          type="button"
          onClick={() => onTirar(tirada, enEspecialidad)}
          className="clip-chamfer-sm shrink-0 border border-accent bg-accent px-3 py-2 font-display text-xs font-semibold uppercase tracking-wide text-black active:scale-95"
        >
          Tirar
        </button>
      </div>

      {especialidades.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase text-muted">
            especialidad:
          </span>
          <button
            type="button"
            onClick={() => setEnEspecialidad((v) => !v)}
            className={`clip-chamfer-sm border px-2 py-1 font-mono text-[10px] uppercase active:scale-95 ${
              enEspecialidad
                ? "border-info text-info"
                : "border-border text-muted"
            }`}
          >
            {enEspecialidad ? "✓ " : ""}
            {especialidades.join(" / ")}
          </button>
        </div>
      )}

      {tirada.nota && (
        <p className="mt-2 font-sans text-[11px] leading-relaxed text-muted">
          {tirada.nota}
        </p>
      )}
    </HudCard>
  );
}

export function TiradasTab({ sheet }: { sheet: Sheet }) {
  const [dificultad, setDificultad] = useState<number | null>(7);
  const [circunstancial, setCircunstancial] = useState(0);
  const [historial, setHistorial] = useState<Lanzamiento[]>([]);

  const tirar = (t: Tirada, enEspecialidad: boolean) => {
    const mod = modificadorTirada(sheet, t, enEspecialidad);
    const r = resolverTirada({
      dado: tirarD12(),
      modificador: mod.total,
      circunstancial,
      dificultad,
    });
    setHistorial((h) => [{ ...r, id: Date.now(), label: t.label }, ...h].slice(0, 6));
  };

  return (
    <div className="flex flex-col gap-3">
      <Marcador ultimo={historial[0] ?? null} />

      {/* Ajustes que se aplican a la siguiente tirada */}
      <HudCard className="p-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {"// Dificultad"}
        </p>
        <div className="mt-2 grid grid-cols-4 gap-1">
          {DIFICULTADES.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDificultad(d.valor)}
              className={`clip-chamfer-sm border px-1 py-1.5 font-mono text-[10px] uppercase active:scale-95 ${
                dificultad === d.valor
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
            onClick={() => setDificultad(null)}
            className={`clip-chamfer-sm col-span-2 border px-1 py-1.5 font-mono text-[10px] uppercase active:scale-95 ${
              dificultad === null
                ? "border-accent text-accent"
                : "border-border text-muted"
            }`}
          >
            sin dificultad
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {"// Modificador"}
            </p>
            <p className="font-sans text-[11px] text-muted">
              Heridas, fatiga, cobertura, distancia…
            </p>
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
                circunstancial === 0
                  ? "text-muted"
                  : circunstancial > 0
                    ? "text-info"
                    : "text-danger"
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
      </HudCard>

      {GRUPOS_TIRADA.map((grupo) => (
        <div key={grupo} className="flex flex-col gap-2">
          <h2 className="mt-2 border-b border-border pb-1 font-display text-sm font-semibold uppercase tracking-wide text-muted">
            {grupo}
          </h2>
          {TIRADAS.filter((t) => t.grupo === grupo).map((t) => (
            <FilaTirada key={t.id} tirada={t} sheet={sheet} onTirar={tirar} />
          ))}
        </div>
      ))}

      {historial.length > 1 && (
        <>
          <h2 className="mt-2 border-b border-border pb-1 font-display text-sm font-semibold uppercase tracking-wide text-muted">
            Anteriores
          </h2>
          <div className="flex flex-col gap-1">
            {historial.slice(1).map((h) => (
              <div
                key={h.id}
                className="flex items-baseline justify-between gap-2 border-b border-border py-1.5 font-mono text-[11px] last:border-0"
              >
                <span className="truncate text-muted">{h.label}</span>
                <span className="shrink-0 tabular-nums text-muted">
                  d12 {h.dado} {signo(h.modificador + h.circunstancial)} ={" "}
                  <span
                    className={
                      h.exito === null
                        ? "text-foreground"
                        : h.exito
                          ? "text-info"
                          : "text-danger"
                    }
                  >
                    {h.total}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
