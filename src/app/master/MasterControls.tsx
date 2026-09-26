// Piezas de UI del máster compartidas entre /master (la cola) y la tira
// solo-máster de characters/[id] (ver la ficha en sí). Los server actions
// viven en ./actions — aquí solo el markup.
import { approveCharacterAction, revertToDraftAction, adjustXpAction, adjustCreditosAction } from "./actions";

export function StatusControl({
  characterId,
  status,
}: {
  characterId: string;
  status: "DRAFT" | "APPROVED";
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
