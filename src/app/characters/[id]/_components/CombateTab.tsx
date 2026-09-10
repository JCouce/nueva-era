// Fase 6b, bloque 3 (D5: combate → ficha, nunca al revés). Solo lectura —
// la única escritura que el jugador tiene hacia el combate es su propio
// PG/fatiga (D2, subtarea 3.2, aparte). Cola completa, no solo el propio
// combatiente: sin ver a los demás no hay contexto táctico (decisión
// ampliada con el usuario, ver docs/fase-6b.md bloque 3).
import { describirEstadosActivos, type EstadoActivo } from "@/lib/rules";
import { HudCard } from "@/components/HudCard";

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
  // Para resaltar la propia fila en la cola, además del turno activo.
  miCombatienteId: string | null;
}) {
  const turnoActual = combate.combatientes[combate.turnoIndex] ?? null;

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
              </HudCard>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
