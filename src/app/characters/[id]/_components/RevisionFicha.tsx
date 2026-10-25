"use client";

// Envío a revisión, lado del jugador: la barra de envío (Personaje, en creación) y el
// aviso de ficha en revisión con "Retirar". Lo que falta, los avisos y las
// transiciones salen de @/lib/rules (revision.ts); aquí solo se pinta y se llama a la
// action. Los controles del máster viven en master/MasterControls.tsx.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enviarARevisionAction, retirarRevisionAction, type RevisionResult } from "../actions";

function useAccionRevision() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const ejecutar = (fn: () => Promise<RevisionResult>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  };
  return { pending, error, ejecutar };
}

// "hace X" a partir de submittedAt. Basta con minutos/horas/días.
function haceTiempo(desde: string): string {
  const min = Math.floor((Date.now() - new Date(desde).getTime()) / 60_000);
  if (min < 1) return "un momento";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "1 día" : `${d} días`;
}

export function BarraEnvio({
  characterId,
  falta,
  avisos,
  reviewNote,
  esperarGuardados,
}: {
  characterId: string;
  falta: string[];
  avisos: string[];
  reviewNote: string | null;
  // El servidor valida con lo guardado: antes de enviar se espera a la cola de
  // autosave para no mandar sin el último cambio.
  esperarGuardados: () => Promise<unknown>;
}) {
  const { pending, error, ejecutar } = useAccionRevision();
  const listo = falta.length === 0;

  return (
    <div className="sticky bottom-[calc(61px+env(safe-area-inset-bottom))] z-[5] -mx-4 mt-2 lg:bottom-0 bg-linear-to-t from-background from-70% to-transparent px-4 pb-3 pt-4">
      <div className="flex flex-col gap-2">
        {reviewNote && (
          <div className="clip-chamfer-sm border border-neon-magenta bg-neon-magenta/10 px-3 py-2">
            <p className="font-display text-[10px] font-semibold uppercase tracking-widest text-neon-magenta">
              Devuelta por el máster
            </p>
            <p className="mt-1 whitespace-pre-line text-sm text-foreground">{reviewNote}</p>
          </div>
        )}
        <div className="clip-chamfer-sm flex flex-col gap-2 border border-border bg-surface px-3 py-2">
          {listo ? (
            <p className="font-mono text-xs text-neon-green">✓ Todo listo para que el máster la revise</p>
          ) : (
            <ul className="flex flex-col gap-0.5 font-mono text-xs text-neon-orange">
              {falta.map((f) => (
                <li key={f}>· {f}</li>
              ))}
            </ul>
          )}
          {/* Plegados: no bloquean, y la barra fija no debe tapar media pantalla. */}
          {avisos.length > 0 && (
            <details className="font-mono text-[11px] text-muted">
              <summary className="cursor-pointer select-none">
                {avisos.length === 1 ? "1 aviso" : `${avisos.length} avisos`} · puntos sin gastar
              </summary>
              <ul className="mt-1 flex flex-col gap-0.5">
                {avisos.map((a) => (
                  <li key={a}>· {a}</li>
                ))}
              </ul>
            </details>
          )}
          <button
            type="button"
            disabled={!listo || pending}
            onClick={() =>
              ejecutar(async () => {
                await esperarGuardados();
                return enviarARevisionAction(characterId);
              })
            }
            className="clip-chamfer bg-accent px-4 py-3 font-display font-semibold uppercase tracking-wide text-black shadow-glow-yellow transition active:scale-[0.99] disabled:bg-elevated disabled:text-muted disabled:shadow-none"
          >
            {pending ? "Enviando…" : "Enviar a revisión"}
          </button>
          {error && <p className="font-mono text-[11px] text-danger">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export function AvisoEnRevision({
  characterId,
  submittedAt,
  puedeRetirar,
}: {
  characterId: string;
  submittedAt: string | null;
  puedeRetirar: boolean;
}) {
  const { pending, error, ejecutar } = useAccionRevision();
  return (
    <div className="clip-chamfer-sm flex flex-col gap-2 border border-neon-magenta bg-neon-magenta/10 px-3 py-2">
      <p className="text-sm">
        {/* El tiempo relativo depende del reloj: puede diferir entre servidor y cliente. */}
        <span suppressHydrationWarning>
          Enviada al máster{submittedAt ? ` hace ${haceTiempo(submittedAt)}` : ""}.
        </span>{" "}
        <span className="text-muted">Mientras la revisa, la ficha es de solo lectura.</span>
      </p>
      {puedeRetirar && (
        <button
          type="button"
          disabled={pending}
          onClick={() => ejecutar(() => retirarRevisionAction(characterId))}
          className="clip-chamfer-sm self-start border border-border px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-muted transition hover:text-foreground disabled:opacity-50"
        >
          {pending ? "Retirando…" : "Retirar para seguir editando"}
        </button>
      )}
      {error && <p className="font-mono text-[11px] text-danger">{error}</p>}
    </div>
  );
}
