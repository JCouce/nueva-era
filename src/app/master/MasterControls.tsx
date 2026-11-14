// Piezas de UI del máster compartidas entre /master/fichas (la cola) y la tira
// solo-máster de characters/[id] (ver la ficha en sí). Los server actions
// viven en ./actions — aquí solo el markup.
import type { EstadoFicha } from "@/lib/rules";
import {
  approveCharacterAction,
  devolverAction,
  revertToDraftAction,
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
