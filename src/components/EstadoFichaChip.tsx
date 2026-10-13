import type { EstadoFicha } from "@/lib/rules";

const CHIP: Record<EstadoFicha, { texto: string; clase: string }> = {
  DRAFT: { texto: "En creación", clase: "border-accent text-accent" },
  IN_REVIEW: { texto: "En revisión", clase: "border-neon-magenta text-neon-magenta" },
  APPROVED: { texto: "En juego", clase: "border-neon-green text-neon-green" },
};

export function EstadoFichaChip({ estado, className = "" }: { estado: EstadoFicha; className?: string }) {
  const { texto, clase } = CHIP[estado];
  return (
    <span
      className={`inline-block shrink-0 whitespace-nowrap border px-1.5 py-0.5 font-display text-[10px] font-semibold uppercase leading-none tracking-widest ${clase} ${className}`}
    >
      {texto}
    </span>
  );
}
