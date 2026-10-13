// Bolsa de aumentos de la especie (Humanos, sistema.md §14.6): créditos aparte, solo
// para aumentos. Hoy no se gasta (no hay aumentos): solo se enseña como dato.
export function BolsaAumentos({ creditos }: { creditos: number }) {
  return (
    <p className="font-mono text-[10px] uppercase text-muted">
      Bolsa de aumentos{" "}
      <span className="tabular-nums text-foreground">{creditos.toLocaleString("es-ES")}</span> · pendiente de
      aumentos
    </p>
  );
}
