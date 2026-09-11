"use client";

import { useState } from "react";
import {
  HABILIDADES,
  HABILIDAD_NO_ENTRENADA,
  HABILIDAD_MIN_ENTRENADA,
  HABILIDAD_MAX_CREACION,
  HABILIDAD_MAX,
  MAX_ESPECIALIDADES,
  COSTE_ESPECIALIDAD_EXTRA,
  costeMarginal,
  COSTE_FACTOR_HABILIDAD,
  type HabilidadId,
} from "@/lib/rules";
import type { Sheet } from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { Stepper } from "./Stepper";

function Especialidades({
  id,
  nombres,
  puntosDisponibles,
  onAdd,
  onRemove,
}: {
  id: HabilidadId;
  nombres: string[];
  puntosDisponibles: number;
  onAdd: (id: HabilidadId, nombre: string) => void;
  onRemove: (id: HabilidadId, nombre: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");

  // La primera especialidad va incluida al entrenar; las siguientes cuestan punto.
  const cuesta = nombres.length >= 1;
  const puedeAnadir =
    nombres.length < MAX_ESPECIALIDADES &&
    (!cuesta || puntosDisponibles >= COSTE_ESPECIALIDAD_EXTRA);

  const confirmar = () => {
    const limpio = texto.trim();
    if (limpio) onAdd(id, limpio);
    setTexto("");
    setAbierto(false);
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {nombres.map((n, i) => (
        <span
          key={n}
          className="clip-chamfer-sm flex items-center gap-1 border border-info px-2 py-1 font-mono text-[10px] uppercase text-info"
        >
          {n}
          {i > 0 && <span className="text-muted">1pt</span>}
          <button
            type="button"
            onClick={() => onRemove(id, n)}
            aria-label={`Quitar ${n}`}
            className="text-muted active:scale-95"
          >
            ×
          </button>
        </span>
      ))}

      {abierto ? (
        <input
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={confirmar}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirmar();
            if (e.key === "Escape") {
              setTexto("");
              setAbierto(false);
            }
          }}
          maxLength={40}
          placeholder="especialidad"
          className="w-32 border border-border bg-elevated px-2 py-1 font-mono text-[11px] text-foreground outline-none focus:border-accent"
        />
      ) : (
        puedeAnadir && (
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="clip-chamfer-sm border border-border px-2 py-1 font-mono text-[10px] uppercase text-muted active:scale-95"
          >
            + especialidad{cuesta ? " (1pt)" : ""}
          </button>
        )
      )}
    </div>
  );
}

export function HabilidadesTab({
  sheet,
  puntosDisponibles,
  aprobada,
  xp,
  libre = false,
  onSet,
  onAddEspecialidad,
  onRemoveEspecialidad,
}: {
  sheet: Sheet;
  // No aplican en modo libre (edición de NPC, fase 6b 5.1) — ver AtributosTab.
  puntosDisponibles?: number;
  aprobada?: boolean;
  xp?: number;
  libre?: boolean;
  onSet: (id: HabilidadId, value: number) => void;
  onAddEspecialidad: (id: HabilidadId, nombre: string) => void;
  onRemoveEspecialidad: (id: HabilidadId, nombre: string) => void;
}) {
  const tope = libre || aprobada ? HABILIDAD_MAX : HABILIDAD_MAX_CREACION;
  const disponible = libre ? Infinity : aprobada ? xp! : puntosDisponibles!;

  return (
    <div className="flex flex-col gap-2">
      {!libre && (
        <div className="mb-1 flex items-center justify-between border-y border-border py-2 font-mono text-xs">
          <span className="uppercase tracking-wide text-muted">{aprobada ? "XP" : "Puntos"}</span>
          <span className={`tabular-nums ${disponible < 0 ? "text-danger" : "text-accent"}`}>
            {disponible}
          </span>
        </div>
      )}

      <p className="font-mono text-[11px] leading-relaxed text-muted">
        Sin entrenar tiras a −1. En tu especialidad usas el valor entero; fuera de
        ella, la mitad redondeando hacia arriba.
      </p>

      {HABILIDADES.map((h) => {
        const { valor, especialidades } = sheet.habilidades[h.id];
        const entrenada = valor >= HABILIDAD_MIN_ENTRENADA;
        const siguiente = entrenada ? valor + 1 : HABILIDAD_MIN_ENTRENADA;
        // Coste marginal del siguiente punto: triangular, Nivel × 1 — no es
        // fijo en 1, crece con el nivel (docs/sistema.md, "Coste y progresión").
        const costeSiguiente = costeMarginal(siguiente, COSTE_FACTOR_HABILIDAD);
        const fuera = entrenada ? Math.ceil(valor / 2) : HABILIDAD_NO_ENTRENADA;

        return (
          <HudCard key={h.id} className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="block truncate font-display text-base font-semibold uppercase leading-none">
                  {h.label}
                </span>
                <span className="mt-1 block font-mono text-[10px] uppercase text-muted">
                  {entrenada ? `fuera de especialidad ${fuera}` : "no entrenada"}
                </span>
              </div>
              <Stepper
                value={valor}
                hint={valor >= tope ? "MÁX" : libre ? "" : `${costeSiguiente} ${aprobada ? "xp" : "pts"}`}
                canBuy={libre || disponible >= costeSiguiente}
                atMin={libre ? valor <= HABILIDAD_NO_ENTRENADA : aprobada || valor <= HABILIDAD_NO_ENTRENADA}
                atMax={valor >= tope}
                onBuy={() => onSet(h.id, siguiente)}
                onSell={() =>
                  onSet(h.id, valor - 1 < HABILIDAD_MIN_ENTRENADA ? HABILIDAD_NO_ENTRENADA : valor - 1)
                }
              />
            </div>

            {entrenada && (
              <Especialidades
                id={h.id}
                nombres={especialidades}
                // Mismo valor que recibía antes de "libre" (el pool de
                // creación tal cual, sin tocar el criterio existente del
                // resto de la ficha) — solo se sustituye por Infinity en
                // modo libre, para no cambiar de paso el comportamiento del
                // jugador.
                puntosDisponibles={libre ? Infinity : puntosDisponibles!}
                onAdd={onAddEspecialidad}
                onRemove={onRemoveEspecialidad}
              />
            )}
          </HudCard>
        );
      })}
    </div>
  );
}
