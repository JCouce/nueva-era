"use client";

// Fase 6b, subtarea 2.1: crear combate + añadir jugadores. Nada de
// FormData+no-op como MasterControls.tsx — las acciones de ./actions son
// tipadas (ver su cabecera), así que esto llama directo y refresca con
// router.refresh() al terminar, mismo patrón que CharacterSheet.tsx usa
// para sus propias acciones tipadas.
import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { HudCard } from "@/components/HudCard";
import { usePollingCombate } from "@/hooks/usePollingCombate";
import { ESTADOS, estadoPorId, describirEstadosActivos, type EstadoActivo } from "@/lib/rules";
import {
  crearCombateAction,
  comenzarCombateAction,
  terminarCombateAction,
  agregarJugadorAction,
  agregarAdHocAction,
  avanzarTurnoAction,
  establecerIniciativaAction,
  ordenarPorIniciativaAction,
  moverCombatienteAction,
  ajustarPgAction,
  ajustarFatigaAction,
  aplicarEstadoAction,
  quitarEstadoAction,
  type CombateResult,
} from "./actions";

type CombatienteView = {
  id: string;
  nombre: string;
  pgActual: number;
  pgMax: number;
  fatigaActual: number;
  fatigaMax: number;
  iniciativa: number | null;
  characterId: string | null;
  derrotado: boolean;
  estados: EstadoActivo[];
};

type CombateView = {
  id: string;
  // TERMINADO nunca llega aquí (page.tsx solo busca PREPARANDO/EN_CURSO),
  // pero se deja el tipo completo por si algún día se lista uno terminado.
  estado: "PREPARANDO" | "EN_CURSO" | "TERMINADO";
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
  // 4.1: mientras haya un combate en curso, alguien más (otra pestaña, el
  // jugador desde su ficha) puede cambiarlo sin que esta pantalla se
  // entere hasta el próximo refresh manual — esto lo hace solo.
  usePollingCombate(combate !== null);
  // Un input sin control de React por combatiente (subtarea 2.4): con la
  // cola llena, un estado controlado por fila fuerza un re-render de toda
  // la lista en cada tecla. Se lee del DOM al aplicar y se limpia a mano.
  const deltaRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
          <p className="font-mono text-sm text-muted">No hay ningún combate abierto.</p>
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

  // El número de categoría de daño (no letal/letal/grave) no entra aquí a
  // propósito: docs/sistema.md §7 dice que las tres restan igual de los
  // mismos PG ("se suman todas para los PG restantes") — solo cambia cómo
  // se cura, y eso no está mecanizado todavía. Un selector que no mueve
  // ningún número sería peor que no tenerlo.
  function aplicarDelta(combatienteId: string, recurso: "pg" | "fatiga") {
    const input = deltaRefs.current[combatienteId];
    if (!input || !input.value) return;
    const delta = Number(input.value);
    if (!Number.isFinite(delta) || delta === 0) return;
    ejecutar(() =>
      recurso === "pg" ? ajustarPgAction(combatienteId, delta) : ajustarFatigaAction(combatienteId, delta),
    );
    input.value = "";
  }

  return (
    <div className="flex flex-col gap-6">
      <HudCard className="flex flex-col gap-3 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm uppercase tracking-wide">
            {combate.estado === "PREPARANDO" ? "Preparando combate" : `Ronda ${combate.ronda}`}
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() => ejecutar(() => terminarCombateAction(combate.id))}
            className="px-2 py-1 font-mono text-xs uppercase tracking-wide text-muted transition hover:text-danger disabled:opacity-50"
          >
            Terminar combate
          </button>
        </div>
        {/* PREPARANDO: el máster monta la escena sin que nadie más lo vea
            (characters/[id]/page.tsx solo busca EN_CURSO) — "Turno de: X" no
            significa nada todavía, así que en su lugar va el botón que de
            verdad decide cuándo empieza (pedido explícito del usuario,
            2026-09-11: antes "crear combate" ya lo dejaba EN_CURSO). */}
        {combate.estado === "PREPARANDO" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => ejecutar(() => comenzarCombateAction(combate.id))}
            className="clip-chamfer-sm border-t border-border bg-accent px-3 py-3 font-mono text-sm font-semibold uppercase tracking-wide text-black shadow-glow-yellow active:scale-[0.99] disabled:opacity-50"
          >
            Comenzar combate
          </button>
        ) : (
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
        )}
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
            <CombatienteRow
              key={c.id}
              c={c}
              esTurnoActual={i === combate.turnoIndex}
              esPrimero={i === 0}
              esUltimo={i === combate.combatientes.length - 1}
              pending={pending}
              ejecutar={ejecutar}
              aplicarDelta={aplicarDelta}
              deltaRef={(el) => {
                deltaRefs.current[c.id] = el;
              }}
            />
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

// Componente aparte, no un bloque más de la lista: los desplegables de
// estado/grado (subtarea 2.5) necesitan su propio estado local — grado
// depende de qué estado está elegido, duración depende de qué grado — y
// eso no cabe bien en el patrón de refs sin control que usa el delta de
// PG/fatiga (2.4), donde no hace falta reaccionar a lo que el usuario va
// eligiendo, solo leer un valor al final.
function CombatienteRow({
  c,
  esTurnoActual,
  esPrimero,
  esUltimo,
  pending,
  ejecutar,
  aplicarDelta,
  deltaRef,
}: {
  c: CombatienteView;
  esTurnoActual: boolean;
  esPrimero: boolean;
  esUltimo: boolean;
  pending: boolean;
  ejecutar: (accion: () => Promise<CombateResult>) => void;
  aplicarDelta: (combatienteId: string, recurso: "pg" | "fatiga") => void;
  deltaRef: (el: HTMLInputElement | null) => void;
}) {
  const [estadoId, setEstadoId] = useState("");
  const [gradoId, setGradoId] = useState("");
  const [duracion, setDuracion] = useState("");

  const estadoElegido = estadoId ? estadoPorId(estadoId) : null;
  const grados = estadoElegido?.grados ?? [];

  function elegirEstado(id: string) {
    setEstadoId(id);
    const primerGrado = estadoPorId(id)?.grados[0] ?? null;
    setGradoId(primerGrado?.id ?? "");
    setDuracion(primerGrado?.duracionTurnos != null ? String(primerGrado.duracionTurnos) : "");
  }

  function elegirGrado(id: string) {
    setGradoId(id);
    const grado = grados.find((g) => g.id === id);
    setDuracion(grado?.duracionTurnos != null ? String(grado.duracionTurnos) : "");
  }

  function aplicarEstado() {
    if (!estadoId || !gradoId) return;
    const rondas = duracion === "" ? null : Number(duracion);
    ejecutar(() => aplicarEstadoAction(c.id, estadoId, gradoId, rondas));
  }

  // lib/rules/estados.ts (bloque 3): antes vivía inline aquí, ahora
  // compartido con la ficha del jugador.
  const activos = describirEstadosActivos(c.estados);

  return (
    <li>
      <HudCard
        className={`flex flex-col gap-2 px-4 py-3 ${c.derrotado ? "opacity-50" : ""} ${
          esTurnoActual ? "!border-accent shadow-glow-yellow" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <button
              type="button"
              disabled={pending || esPrimero}
              onClick={() => ejecutar(() => moverCombatienteAction(c.id, "arriba"))}
              aria-label={`Subir a ${c.nombre}`}
              className="h-5 w-5 text-muted transition hover:text-accent disabled:opacity-30"
            >
              ▲
            </button>
            <button
              type="button"
              disabled={pending || esUltimo}
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
              PG {c.pgActual}/{c.pgMax} · Fatiga {c.fatigaActual}/{c.fatigaMax}
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
        </div>

        <div className="flex items-center gap-2 border-t border-border pt-2">
          <input
            ref={deltaRef}
            type="number"
            aria-label={`Delta de PG o fatiga para ${c.nombre}`}
            placeholder="±N"
            className="clip-chamfer-sm w-20 border border-border bg-background px-2 py-2.5 text-center font-mono text-sm"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => aplicarDelta(c.id, "pg")}
            className="clip-chamfer-sm flex-1 border border-border px-3 py-2.5 font-mono text-xs uppercase tracking-wide text-muted transition hover:border-accent hover:text-accent disabled:opacity-50"
          >
            Aplicar a PG
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => aplicarDelta(c.id, "fatiga")}
            className="clip-chamfer-sm flex-1 border border-border px-3 py-2.5 font-mono text-xs uppercase tracking-wide text-muted transition hover:border-accent hover:text-accent disabled:opacity-50"
          >
            Aplicar a fatiga
          </button>
        </div>

        {activos.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-border pt-2">
            {activos.map((a) => (
              <div
                key={a.estadoId}
                className="clip-chamfer-sm border border-accent px-2 py-1 font-mono text-accent"
              >
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide">
                  <span>{a.label}</span>
                  {a.rondasRestantes !== null && <span>· {a.rondasRestantes}r</span>}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => ejecutar(() => quitarEstadoAction(c.id, a.estadoId))}
                    aria-label={`Quitar ${a.label} a ${c.nombre}`}
                    className="ml-auto disabled:opacity-50"
                  >
                    ×
                  </button>
                </div>
                {/* Detalle visible de verdad, no en un `title` — en móvil no
                    hay hover que lo enseñe (hallazgo real de uso, fase 6b
                    bloque 3). */}
                {a.detalle.length > 0 && (
                  <p className="mt-0.5 text-[10px] normal-case tracking-normal text-muted">
                    {a.detalle.join(" ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-2 border-t border-border pt-2">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor={`estado-${c.id}`} className="font-mono text-[10px] text-muted">
              Estado
            </label>
            <select
              id={`estado-${c.id}`}
              value={estadoId}
              onChange={(e) => elegirEstado(e.target.value)}
              className="clip-chamfer-sm w-full border border-border bg-background px-2 py-2 font-mono text-xs"
            >
              <option value="">— elegir —</option>
              {ESTADOS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>

          {grados.length > 1 && (
            <div className="flex flex-col gap-1">
              <label htmlFor={`grado-${c.id}`} className="font-mono text-[10px] text-muted">
                Grado
              </label>
              <select
                id={`grado-${c.id}`}
                value={gradoId}
                onChange={(e) => elegirGrado(e.target.value)}
                className="clip-chamfer-sm border border-border bg-background px-2 py-2 font-mono text-xs"
              >
                {grados.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor={`rondas-${c.id}`} className="font-mono text-[10px] text-muted">
              Rondas
            </label>
            <input
              id={`rondas-${c.id}`}
              type="number"
              min={0}
              value={duracion}
              onChange={(e) => setDuracion(e.target.value)}
              placeholder="∞"
              className="clip-chamfer-sm w-16 border border-border bg-background px-2 py-2 text-center font-mono text-xs"
            />
          </div>

          <button
            type="button"
            disabled={pending || !estadoId}
            onClick={aplicarEstado}
            className="clip-chamfer-sm border border-border px-3 py-2 font-mono text-xs uppercase tracking-wide text-muted transition hover:border-accent hover:text-accent disabled:opacity-50"
          >
            Aplicar estado
          </button>
        </div>
      </HudCard>
    </li>
  );
}
