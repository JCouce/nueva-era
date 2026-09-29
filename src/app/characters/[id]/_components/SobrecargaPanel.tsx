import type { Lanzamiento } from "@/components/ResultadoTirada";

// Bloque de sobrecarga bajo el resultado de un poder: la inconsciencia se avisa
// (la marca el máster), la salvación la tira la app y su daño se resta solo.
export function SobrecargaPanel({
  dificultad,
  salvacion,
  onTirar,
}: {
  dificultad: number;
  salvacion: (Lanzamiento & { danio: number }) | null;
  onTirar: (id: number) => void;
}) {
  return (
    <div className="mt-3 border-2 border-danger p-3">
      <p className="font-display text-sm font-semibold uppercase text-danger">Sobrecarga</p>
      <p className="mt-1 font-sans text-[12px] leading-relaxed text-foreground">
        Has cruzado el umbral de exhausto con un gasto psiónico: <strong>quedas inconsciente</strong>. Díselo al
        máster para que lo marque.
      </p>
      {salvacion ? (
        <p className="mt-2 font-mono text-[11px] uppercase text-foreground">
          Fortaleza: {salvacion.total} vs {dificultad} ·{" "}
          {salvacion.exito ? (salvacion.critico ? "éxito crítico" : "éxito") : salvacion.critico ? "fracaso crítico" : "fracaso"}
          <span className="block text-danger">
            {salvacion.danio > 0 ? `${salvacion.danio} de daño letal (no absorbible), ya restado` : "Sin daño"}
          </span>
        </p>
      ) : (
        <button
          type="button"
          onClick={() => onTirar(Date.now())}
          className="clip-chamfer-sm mt-2 w-full border border-danger py-2 font-display text-xs font-semibold uppercase tracking-wide text-danger active:scale-[0.98]"
        >
          Tirar salvación de Fortaleza (dificultad {dificultad})
        </button>
      )}
    </div>
  );
}
