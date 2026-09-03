import { HudCard } from "@/components/HudCard";

// Bloque de ficha que el sistema aún no tiene definido. Se declara en la UI para
// que el grupo vea que existe y qué falta, en vez de esconderlo.
export function PendienteTab({
  titulo,
  falta,
}: {
  titulo: string;
  falta: string;
}) {
  return (
    <HudCard className="border-dashed p-5">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
        {"//SYSTEM · "}
        {titulo}
      </p>
      <p className="mt-3 font-display text-lg font-semibold uppercase text-muted">
        Sin definir
      </p>
      <p className="mt-2 font-sans text-sm leading-relaxed text-muted">{falta}</p>
    </HudCard>
  );
}
