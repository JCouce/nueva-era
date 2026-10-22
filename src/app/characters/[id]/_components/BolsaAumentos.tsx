import type { BolsaAumentosResuelta } from "@/lib/rules";

// Bolsa de aumentos de la especie (Humanos, sistema.md §14.6): créditos aparte, solo
// para aumentos. Se gasta primero al comprar un aumento; lo que no se gaste se pierde.
export function BolsaAumentos({ bolsa }: { bolsa: BolsaAumentosResuelta }) {
  return (
    <p className="font-mono text-[10px] uppercase text-muted">
      Bolsa de aumentos{" "}
      <span className="tabular-nums text-foreground">{bolsa.saldo.toLocaleString("es-ES")}</span>
      {" / "}
      <span className="tabular-nums">{bolsa.total.toLocaleString("es-ES")}</span>
    </p>
  );
}
