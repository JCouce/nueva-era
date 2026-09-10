"use client";

// Fase 6b, subtarea 2.1: crear combate + añadir jugadores. Nada de
// FormData+no-op como MasterControls.tsx — las acciones de ./actions son
// tipadas (ver su cabecera), así que esto llama directo y refresca con
// router.refresh() al terminar, mismo patrón que CharacterSheet.tsx usa
// para sus propias acciones tipadas.
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { HudCard } from "@/components/HudCard";
import {
  crearCombateAction,
  terminarCombateAction,
  agregarJugadorAction,
  agregarAdHocAction,
  avanzarTurnoAction,
  establecerIniciativaAction,
  ordenarPorIniciativaAction,
  moverCombatienteAction,
  type CombateResult,
} from "./actions";

type CombatienteView = {
  id: string;
  nombre: string;
  pgActual: number;
  pgMax: number;
  iniciativa: number | null;
  characterId: string | null;
  derrotado: boolean;
};

type CombateView = {
  id: string;
  ronda: number;
  turnoIndex: number;
  combatientes: CombatienteView[];
};

type CharacterOption = {
  id: string;
  name: string;
  owner: { name: string | null; email: string };
};

export function CombateConsole({
  combate,
  characters,
}: {
  combate: CombateView | null;
  characters: CharacterOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [npcNombre, setNpcNombre] = useState("");
  const [npcPg, setNpcPg] = useState("");

  function ejecutar(accion: () => Promise<CombateResult>) {
    setError(null);
    startTransition(async () => {
      const res = await accion();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  if (!combate) {
    return (
      <div className="flex flex-col gap-4">
        <HudCard className="border-dashed px-4 py-8 text-center">
          <p className="font-mono text-sm text-muted">No hay ningún combate en curso.</p>
        </HudCard>
        <button
          type="button"
          disabled={pending}
          onClick={() => ejecutar(() => crearCombateAction())}
          className="clip-chamfer-sm bg-accent px-4 py-3 font-mono text-sm font-semibold uppercase tracking-wide text-black shadow-glow-yellow active:scale-[0.99] disabled:opacity-50"
        >
          Crear combate
        </button>
        {error && <p className="font-mono text-xs text-danger">{error}</p>}
      </div>
    );
  }

  // Mismo criterio que agregarJugadorAction: solo cuenta "ya está" si tiene
  // una fila activa (no derrotada) — un jugador derrotado se puede volver a
  // meter en fila aparte.
  const enCombateIds = new Set(
    combate.combatientes
      .filter((c) => c.characterId !== null && !c.derrotado)
      .map((c) => c.characterId as string),
  );
  const disponibles = characters.filter((c) => !enCombateIds.has(c.id));

  const agregarNpc = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const pg = Number(npcPg);
    setError(null);
    startTransition(async () => {
      const res = await agregarAdHocAction(combate.id, npcNombre, pg);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setNpcNombre("");
      setNpcPg("");
      router.refresh();
    });
  };

  const turnoActual = combate.combatientes[combate.turnoIndex] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <HudCard className="flex flex-col gap-3 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm uppercase tracking-wide">Ronda {combate.ronda}</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => ejecutar(() => terminarCombateAction(combate.id))}
            className="px-2 py-1 font-mono text-xs uppercase tracking-wide text-muted transition hover:text-danger disabled:opacity-50"
          >
            Terminar combate
          </button>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <span className="font-display text-sm uppercase tracking-wide">
            Turno de: <span className="text-accent">{turnoActual?.nombre ?? "—"}</span>
          </span>
          <button
            type="button"
            disabled={pending || combate.combatientes.length === 0}
            onClick={() => ejecutar(() => avanzarTurnoAction(combate.id))}
            className="clip-chamfer-sm bg-accent px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wide text-black shadow-glow-yellow active:scale-[0.99] disabled:opacity-50"
          >
            Siguiente turno
          </button>
        </div>
      </HudCard>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-wide text-muted">
            En combate ({combate.combatientes.length})
          </h2>
          <button
            type="button"
            disabled={pending || combate.combatientes.length < 2}
            onClick={() => ejecutar(() => ordenarPorIniciativaAction(combate.id))}
            className="font-mono text-xs uppercase tracking-wide text-muted transition hover:text-accent disabled:opacity-50"
          >
            Ordenar por iniciativa
          </button>
        </div>
        <ul className="flex flex-col gap-2">
          {combate.combatientes.map((c, i) => (
            <li key={c.id}>
              <HudCard
                className={`flex items-center gap-3 px-4 py-3 ${c.derrotado ? "opacity-50" : ""} ${
                  i === combate.turnoIndex ? "!border-accent shadow-glow-yellow" : ""
                }`}
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    disabled={pending || i === 0}
                    onClick={() => ejecutar(() => moverCombatienteAction(c.id, "arriba"))}
                    aria-label={`Subir a ${c.nombre}`}
                    className="h-5 w-5 text-muted transition hover:text-accent disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={pending || i === combate.combatientes.length - 1}
                    onClick={() => ejecutar(() => moverCombatienteAction(c.id, "abajo"))}
                    aria-label={`Bajar a ${c.nombre}`}
                    className="h-5 w-5 text-muted transition hover:text-accent disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>

                <div className="flex-1">
                  <span className="font-display text-base font-medium uppercase tracking-wide">
                    {c.nombre}
                    {c.derrotado && " (derrotado)"}
                  </span>
                  <span className="block font-mono text-xs text-muted">
                    PG {c.pgActual}/{c.pgMax}
                  </span>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <label htmlFor={`iniciativa-${c.id}`} className="font-mono text-[10px] text-muted">
                    Iniciativa
                  </label>
                  <input
                    id={`iniciativa-${c.id}`}
                    type="number"
                    defaultValue={c.iniciativa ?? ""}
                    onBlur={(e) => {
                      const valor = e.target.value === "" ? null : Number(e.target.value);
                      ejecutar(() => establecerIniciativaAction(c.id, valor));
                    }}
                    className="clip-chamfer-sm w-16 border border-border bg-background px-2 py-1 text-right font-mono text-sm"
                  />
                </div>
              </HudCard>
            </li>
          ))}
          {combate.combatientes.length === 0 && (
            <li className="clip-chamfer border border-dashed border-border px-4 py-8 text-center font-mono text-sm text-muted">
              Todavía no hay nadie en la cola.
            </li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">Añadir jugador</h2>
        <ul className="flex flex-col gap-2">
          {disponibles.map((c) => (
            <li key={c.id}>
              <HudCard className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="font-display text-base font-medium uppercase tracking-wide">
                    {c.name}
                  </span>
                  <span className="block font-mono text-xs text-muted">
                    {c.owner.name ?? c.owner.email}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => ejecutar(() => agregarJugadorAction(combate.id, c.id))}
                  className="clip-chamfer-sm border border-border px-3 py-2 font-mono text-xs uppercase tracking-wide text-muted transition hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  Añadir
                </button>
              </HudCard>
            </li>
          ))}
          {disponibles.length === 0 && (
            <li className="clip-chamfer border border-dashed border-border px-4 py-8 text-center font-mono text-sm text-muted">
              {characters.length === 0 ? "No hay personajes creados." : "Ya están todos en combate."}
            </li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">
          Añadir NPC (suelto, sin catálogo)
        </h2>
        <HudCard className="p-4">
          <form onSubmit={agregarNpc} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="npc-nombre" className="font-mono text-xs text-muted">
                Nombre
              </label>
              <input
                id="npc-nombre"
                type="text"
                value={npcNombre}
                onChange={(e) => setNpcNombre(e.target.value)}
                className="clip-chamfer-sm border border-border bg-background px-3 py-2 font-mono text-sm"
                placeholder="Guardia de seguridad"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="npc-pg" className="font-mono text-xs text-muted">
                PG
              </label>
              <input
                id="npc-pg"
                type="number"
                min={1}
                value={npcPg}
                onChange={(e) => setNpcPg(e.target.value)}
                className="clip-chamfer-sm border border-border bg-background px-3 py-2 font-mono text-sm"
                placeholder="12"
              />
            </div>
            <button
              type="submit"
              disabled={pending || !npcNombre.trim() || !npcPg}
              className="clip-chamfer-sm border border-border px-3 py-2 font-mono text-xs uppercase tracking-wide text-muted transition hover:border-accent hover:text-accent disabled:opacity-50"
            >
              Añadir NPC
            </button>
          </form>
        </HudCard>
      </section>

      {error && <p className="font-mono text-xs text-danger">{error}</p>}
    </div>
  );
}
