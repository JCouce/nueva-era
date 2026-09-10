"use client";

// Fase 6b, bloque 3 (D5: combate → ficha, nunca al revés). Solo lectura,
// salvo la fila propia: el jugador puede autogestionar su PG/fatiga (D2,
// subtarea 3.2) — es la única vía "ficha → combate" que existe, todo lo
// demás (tirar Iniciativa y mandarla, por ejemplo) se descartó explícitamente
// por D5. Cola completa, no solo el propio combatiente: sin ver a los demás
// no hay contexto táctico (decisión ampliada con el usuario, ver
// docs/fase-6b.md bloque 3).
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { describirEstadosActivos, type EstadoActivo } from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { ajustarPgAction, ajustarFatigaAction } from "@/app/master/combate/actions";

type CombatienteView = {
  id: string;
  nombre: string;
  pgActual: number;
  pgMax: number;
  fatigaActual: number;
  fatigaMax: number;
  characterId: string | null;
  derrotado: boolean;
  estados: EstadoActivo[];
};

export type CombateView = {
  id: string;
  ronda: number;
  turnoIndex: number;
  combatientes: CombatienteView[];
};

export function CombateTab({
  combate,
  miCombatienteId,
}: {
  combate: CombateView;
  // Para resaltar la propia fila en la cola y decidir dónde va el control
  // de autogestión (D2, 3.2) — nadie más lo ve, ni siquiera el máster desde
  // esta pantalla (él ajusta desde /master/combate, no desde aquí).
  miCombatienteId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const deltaRef = useRef<HTMLInputElement | null>(null);
  const turnoActual = combate.combatientes[combate.turnoIndex] ?? null;

  // Mismo patrón sin control de React que CombateConsole.tsx (2.4): un solo
  // combatiente editable aquí, así que el motivo original (evitar
  // re-renderizar toda una cola larga en cada tecla) no aplica tanto, pero
  // mantiene el mismo idioma que ya conoce quien toque esta zona.
  function aplicarDelta(combatienteId: string, recurso: "pg" | "fatiga") {
    const input = deltaRef.current;
    if (!input || !input.value) return;
    const delta = Number(input.value);
    if (!Number.isFinite(delta) || delta === 0) return;
    setError(null);
    startTransition(async () => {
      const res =
        recurso === "pg"
          ? await ajustarPgAction(combatienteId, delta)
          : await ajustarFatigaAction(combatienteId, delta);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
    input.value = "";
  }

  return (
    <div className="flex flex-col gap-4">
      <HudCard className="flex items-center justify-between px-4 py-3">
        <span className="font-mono text-sm uppercase tracking-wide">Ronda {combate.ronda}</span>
        <span className="font-display text-sm uppercase tracking-wide">
          Turno de: <span className="text-accent">{turnoActual?.nombre ?? "—"}</span>
        </span>
      </HudCard>

      <ul className="flex flex-col gap-2">
        {combate.combatientes.map((c, i) => {
          const activos = describirEstadosActivos(c.estados);
          const esYo = c.id === miCombatienteId;
          return (
            <li key={c.id}>
              <HudCard
                className={`flex flex-col gap-2 px-4 py-3 ${c.derrotado ? "opacity-50" : ""} ${
                  i === combate.turnoIndex ? "!border-accent shadow-glow-yellow" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="font-display text-base font-medium uppercase tracking-wide">
                      {c.nombre}
                      {esYo && <span className="text-accent"> (tú)</span>}
                      {c.derrotado && " (derrotado)"}
                    </span>
                    <span className="block font-mono text-xs text-muted">
                      PG {c.pgActual}/{c.pgMax} · Fatiga {c.fatigaActual}/{c.fatigaMax}
                    </span>
                  </div>
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
                        </div>
                        {/* Detalle visible de verdad, no en un `title` —
                            mismo arreglo que CombateConsole.tsx. */}
                        {a.detalle.length > 0 && (
                          <p className="mt-0.5 text-[10px] normal-case tracking-normal text-muted">
                            {a.detalle.join(" ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* D2/3.2: la única fila donde el jugador puede escribir,
                    no solo leer — su propio PG/fatiga, un número objetivo
                    sin juicio de por medio, no un botón "curar"/"herir". */}
                {esYo && !c.derrotado && (
                  <div className="flex items-center gap-2 border-t border-border pt-2">
                    <input
                      ref={deltaRef}
                      type="number"
                      aria-label="Delta de PG o fatiga"
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
                )}
              </HudCard>
            </li>
          );
        })}
      </ul>

      {error && <p className="font-mono text-xs text-danger">{error}</p>}
    </div>
  );
}
