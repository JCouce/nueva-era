"use client";

import {
  HABILIDADES,
  HABILIDAD_NO_ENTRENADA,
  HABILIDAD_MIN_ENTRENADA,
  HABILIDAD_MAX_CREACION,
  HABILIDAD_MAX,
  MAX_ESPECIALIDADES,
  COSTE_ESPECIALIDAD_EXTRA,
  costeSiguienteNivel,
  type FichaResuelta,
  type HabilidadId,
  textoPuntos,
  especialidadesDe,
  etiquetaEspecialidad,
  admiteEspecialidades,
  valorFueraDeEspecialidad,
} from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { Stepper } from "./Stepper";

// Especialidades de una habilidad: lista cerrada del catálogo (catalog/especialidades.ts),
// sin texto libre. Una habilidad sin lista en la fuente no admite ninguna.
function Especialidades({
  id,
  elegidas,
  puntosDisponibles,
  onAdd,
  onRemove,
}: {
  id: HabilidadId;
  elegidas: string[];
  puntosDisponibles: number;
  onAdd: (id: HabilidadId, especialidad: string) => void;
  onRemove: (id: HabilidadId, especialidad: string) => void;
}) {
  const lista = especialidadesDe(id);
  const libres = lista.filter((e) => !elegidas.includes(e.id));

  // La primera especialidad va incluida al entrenar; las siguientes cuestan punto.
  const cuesta = elegidas.length >= 1;
  const puedeAnadir =
    libres.length > 0 &&
    elegidas.length < MAX_ESPECIALIDADES &&
    (!cuesta || puntosDisponibles >= COSTE_ESPECIALIDAD_EXTRA);

  if (lista.length === 0) {
    return (
      <p className="mt-2 font-mono text-[10px] uppercase text-muted">
        sin especialidades en la fuente: tiras con el valor entero
      </p>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {elegidas.map((e, i) => (
        <span
          key={e}
          className="clip-chamfer-sm flex items-center gap-1 border border-info px-2 py-1 font-mono text-[10px] uppercase text-info"
        >
          {etiquetaEspecialidad(e)}
          {i > 0 && <span className="text-muted">1pt</span>}
          <button
            type="button"
            onClick={() => onRemove(id, e)}
            aria-label={`Quitar ${etiquetaEspecialidad(e)}`}
            className="text-muted active:scale-95"
          >
            ×
          </button>
        </span>
      ))}

      {puedeAnadir && (
        <select
          value=""
          onChange={(ev) => {
            if (ev.target.value) onAdd(id, ev.target.value);
          }}
          aria-label="Añadir especialidad"
          className="clip-chamfer-sm border border-border bg-elevated px-2 py-1 font-mono text-[10px] uppercase text-muted outline-none focus:border-accent"
        >
          <option value="">+ especialidad{cuesta ? " (1pt)" : ""}</option>
          {libres.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export function HabilidadesTab({
  ficha,
  puntosDisponibles,
  aprobada,
  xp,
  libre = false,
  onSet,
  onAddEspecialidad,
  onRemoveEspecialidad,
  onDescartarAviso,
}: {
  ficha: FichaResuelta;
  // No aplican en modo libre (edición de NPC, fase 6b 5.1) — ver AtributosTab.
  puntosDisponibles?: number;
  aprobada?: boolean;
  xp?: number;
  libre?: boolean;
  onSet: (id: HabilidadId, value: number) => void;
  onAddEspecialidad: (id: HabilidadId, especialidad: string) => void;
  onRemoveEspecialidad: (id: HabilidadId, especialidad: string) => void;
  // Sin él (NPC) el aviso de especialidades no reconocidas se ve pero no se descarta.
  onDescartarAviso?: () => void;
}) {
  const sheet = ficha.ficha;
  const tope = libre || aprobada ? HABILIDAD_MAX : HABILIDAD_MAX_CREACION;
  const disponible = libre ? Infinity : aprobada ? xp! : puntosDisponibles!;

  return (
    <div className="flex flex-col gap-2">
      {!libre && (
        <div className="mb-1 flex items-center justify-between border-y border-border py-2 font-mono text-xs">
          <span className="uppercase tracking-wide text-muted">{aprobada ? "XP" : "Puntos"}</span>
          <span className={`tabular-nums ${disponible < 0 ? "text-danger" : "text-accent"}`}>
            {textoPuntos(disponible)}
          </span>
        </div>
      )}

      {sheet.avisoEspecialidades.length > 0 && (
        <HudCard className="!border-danger p-3">
          <p className="font-mono text-[11px] leading-relaxed text-danger">
            Especialidades no reconocidas: {sheet.avisoEspecialidades.join(" · ")} — elige la buena
            de la lista de su habilidad.
          </p>
          {onDescartarAviso && (
            <button
              type="button"
              onClick={onDescartarAviso}
              className="clip-chamfer-sm mt-2 border border-border px-2 py-1 font-mono text-[10px] uppercase text-muted active:scale-95"
            >
              Entendido, quitar aviso
            </button>
          )}
        </HudCard>
      )}

      <p className="font-mono text-[11px] leading-relaxed text-muted">
        Sin entrenar tiras a −1. En tu especialidad usas el valor entero; fuera de
        ella, la mitad redondeando hacia arriba.
      </p>

      {HABILIDADES.map((h) => {
        const { valor, especialidades } = sheet.habilidades[h.id];
        const entrenada = valor >= HABILIDAD_MIN_ENTRENADA;
        // Coste del siguiente punto: Nivel × 1, con el ajuste de casta si lo hay
        // (docs/sistema.md §2.5 y §14.6) y, aprobada, las rebajas de los aumentos (A1).
        // Puntos en creación, XP aprobada.
        const {
          nivel: siguiente,
          coste: costeSiguiente,
          pista,
        } = costeSiguienteNivel({ tipo: "habilidad", id: h.id }, valor, ficha.ajusteCosteSubida);
        const conLista = admiteEspecialidades(h.id);
        const fuera = valorFueraDeEspecialidad(valor);

        return (
          <HudCard key={h.id} className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="block truncate font-display text-base font-semibold uppercase leading-none">
                  {h.label}
                </span>
                <span className="mt-1 block font-mono text-[10px] uppercase text-muted">
                  {!entrenada ? "no entrenada" : conLista ? `fuera de especialidad ${fuera}` : `siempre ${valor}`}
                </span>
                {pista && !libre && valor < tope && (
                  <span className="mt-1 block font-mono text-[10px] uppercase text-info">
                    {pista}
                  </span>
                )}
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
                elegidas={especialidades}
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
