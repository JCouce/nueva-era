// Piezas de UI del máster compartidas entre /master/fichas (la cola) y la tira
// solo-máster de characters/[id] (ver la ficha en sí). Los server actions
// viven en ./actions — aquí solo el markup.
import type { EstadoFicha } from "@/lib/rules";
import {
  approveCharacterAction,
  devolverAction,
  revertToDraftAction,
  adjustXpAction,
  adjustCreditosAction,
} from "./actions";

export function StatusControl({
  characterId,
  status,
}: {
  characterId: string;
  status: EstadoFicha;
}) {
  if (status === "DRAFT") {
    return (
      <form action={approveCharacterAction}>
        <input type="hidden" name="id" value={characterId} />
        <button
          type="submit"
          className="clip-chamfer-sm bg-accent px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wide text-black shadow-glow-yellow active:scale-[0.99]"
        >
          Aprobar
        </button>
      </form>
    );
  }
  if (status === "IN_REVIEW") {
    // Un solo formulario, dos destinos: "Devolver" se lleva la nota; "Aprobar" la
    // ignora. Ocupa una fila entera (basis-full) dentro de la fila flex que lo aloja.
    return (
      <form action={devolverAction} className="flex basis-full flex-col gap-2">
        <input type="hidden" name="id" value={characterId} />
        <textarea
          name="nota"
          maxLength={500}
          rows={2}
          placeholder="Nota para el jugador (opcional), p. ej. «Te sobran 2 puntos de Atletismo»"
          className="clip-chamfer-sm w-full min-w-0 resize-y border border-border bg-night px-3 py-2 text-sm outline-none placeholder:text-muted/70 focus:border-neon-magenta"
        />
        <div className="flex justify-end gap-2">
          <button
            type="submit"
            className="clip-chamfer-sm border border-neon-magenta px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wide text-neon-magenta active:scale-[0.99]"
          >
            Devolver
          </button>
          <button
            type="submit"
            formAction={approveCharacterAction}
            className="clip-chamfer-sm bg-neon-green px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wide text-black active:scale-[0.99]"
          >
            Aprobar
          </button>
        </div>
      </form>
    );
  }
  return (
    <form action={revertToDraftAction}>
      <input type="hidden" name="id" value={characterId} />
      <button
        type="submit"
        className="px-2 py-1 font-mono text-xs uppercase tracking-wide text-muted transition hover:text-danger"
      >
        Revertir
      </button>
    </form>
  );
}

// TODO(revisar): E1d la quitó de la ficha (xp/créditos van por la Mesa); sigue en
// /master/fichas. ¿Fuera también de ahí (y con ella adjustXp/CreditosAction)?
export function ResourceRow({
  characterId,
  xp,
  creditos,
}: {
  characterId: string;
  xp: number;
  creditos: number;
}) {
  return (
    <div className="flex items-center gap-4 border-t border-border pt-3">
      <Stepper characterId={characterId} label="XP" value={xp} action={adjustXpAction} />
      <Stepper
        characterId={characterId}
        label="Créditos"
        value={creditos}
        action={adjustCreditosAction}
      />
    </div>
  );
}

// Antes eran dos botones ±1 fijos — para Créditos, que se mueven en cientos o
// miles (5000+ por una pieza de equipo), sumar de uno en uno no es viable.
// Un solo campo (admite negativos, para restar sin un botón aparte) sustituye
// a los dos botones — decisión del usuario 2026-09-26, prefirió esto a
// atajos ±10/±100 o a editar el total directamente.
function Stepper({
  characterId,
  label,
  value,
  action,
}: {
  characterId: string;
  label: string;
  value: number;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="flex flex-1 items-center gap-2 font-mono text-xs">
      <span className="w-14 text-muted">{label}</span>
      <span className="w-14 text-center">{value}</span>
      <form action={action} className="flex items-center gap-1">
        <input type="hidden" name="id" value={characterId} />
        <input
          type="number"
          name="delta"
          placeholder="±cantidad"
          aria-label={`Cantidad a sumar o restar de ${label}`}
          className="clip-chamfer-sm h-6 w-20 border border-border bg-elevated px-1 text-center font-mono text-[11px] text-foreground placeholder:text-muted"
        />
        <button
          type="submit"
          className="h-6 shrink-0 border border-border px-2 text-muted transition hover:text-accent"
        >
          Aplicar
        </button>
      </form>
    </div>
  );
}
