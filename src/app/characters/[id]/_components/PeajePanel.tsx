import type { Lanzamiento } from "@/components/ResultadoTirada";

// Peaje neurológico (Maolher, sistema.md §14.9) bajo el resultado de un poder, después
// del de sobrecarga. La salvación la tira la app (tirarPeaje) y el daño se resta solo
// donde hay vida que restar (`restado`); en la consola de combate, el máster a mano.
export function PeajePanel({
  dificultad,
  salvacion,
  restado,
  onTirar,
}: {
  dificultad: number;
  salvacion: (Lanzamiento & { aviso: string | null }) | null;
  restado: boolean;
  onTirar: (id: number) => void;
}) {
  return (
    <div className="mt-3 border-2 border-danger p-3">
      <p className="font-display text-sm font-semibold uppercase text-danger">
        Peaje neurológico · Salvación de Fortaleza, dificultad {dificultad}
      </p>
      {salvacion ? (
        <p className="mt-2 font-mono text-[11px] uppercase text-foreground">
          Fortaleza: {salvacion.total} vs {dificultad} ·{" "}
          {salvacion.exito ? (salvacion.critico ? "éxito crítico" : "éxito") : salvacion.critico ? "fracaso crítico" : "fracaso"}
          <span className="block normal-case text-danger">
            {salvacion.aviso ? `${salvacion.aviso}${restado ? " Ya restado." : " Réstalo a mano."}` : "Sin daño"}
          </span>
        </p>
      ) : (
        <button
          type="button"
          onClick={() => onTirar(Date.now())}
          className="clip-chamfer-sm mt-2 w-full border border-danger py-2 font-display text-xs font-semibold uppercase tracking-wide text-danger active:scale-[0.98]"
        >
          Tirar
        </button>
      )}
    </div>
  );
}
