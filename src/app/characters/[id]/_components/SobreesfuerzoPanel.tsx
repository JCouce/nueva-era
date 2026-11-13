import type { Lanzamiento } from "@/components/ResultadoTirada";
import { textoResultadoSobreesfuerzo, type ResultadoSobreesfuerzo, type SobreesfuerzoDeUso } from "@/lib/rules";

// Sobreesfuerzo (T6a, rules/sobreesfuerzo.ts) bajo el resultado de un poder, después del de
// sobrecarga. La salvación la tira la app (tirarSobreesfuerzo) y el fallo lo aplica el servidor
// (aplicarConsecuenciaPropiaAction); sin él (NPC de la consola), el máster a mano.
export type SalvacionSobreesfuerzo = Lanzamiento & { opciones: ResultadoSobreesfuerzo[] };

const ETIQUETA_UMBRAL = { fatigado: "fatigado", exhausto: "exhausto" } as const;

export function SobreesfuerzoPanel({
  uso,
  libra,
  salvacion,
  elegida,
  mensaje,
  aplica,
  onTirar,
  onElegir,
}: {
  uso: SobreesfuerzoDeUso;
  libra: boolean | null; // Saber es Poder: null sin moneda
  salvacion: SalvacionSobreesfuerzo | null;
  elegida: number | null;
  mensaje: string | null;
  aplica: boolean;
  onTirar: (id: number) => void;
  onElegir: (opcion: number) => void;
}) {
  const causa = [
    ...(uso.soloPorFatiga ? [] : [`poder de nivel ${uso.nivel}`]),
    ...(uso.umbral ? [ETIQUETA_UMBRAL[uso.umbral]] : []),
  ].join(" y ");
  const tabla = (["fracaso", "fracasoCritico"] as const).map((g) => ({
    g,
    texto: uso.fallos[g].casilla.map((r) => textoResultadoSobreesfuerzo(r, uso.nivel)).join(", o a elegir: "),
    fuente: uso.fallos[g].fuente,
  }));
  const opciones = salvacion?.opciones ?? [];
  return (
    <div className="mt-3 border-2 border-danger p-3">
      <p className="font-display text-sm font-semibold uppercase text-danger">
        Sobreesfuerzo · Voluntad, dificultad {uso.dificultad}
      </p>
      <p className="mt-1 font-mono text-[11px] text-muted">
        {uso.fuente} · {causa}
      </p>
      <ul className="mt-1 font-sans text-[12px] leading-relaxed text-foreground">
        {tabla.map((t) => (
          <li key={t.g}>
            {t.g === "fracaso" ? "Fracaso" : "Fracaso crítico"}: {t.texto}
            {t.fuente !== uso.fuente && <span className="text-info"> ({t.fuente})</span>}
          </li>
        ))}
      </ul>
      {uso.moneda && libra !== null && (
        <p className={`mt-2 font-display text-xs font-semibold uppercase ${libra ? "text-neon-green" : "text-danger"}`}>
          {uso.moneda.fuente}: {libra ? "te libras" : "no te libras"}
        </p>
      )}
      {libra ? null : salvacion ? (
        <div className="mt-2 font-mono text-[11px] uppercase text-foreground">
          Voluntad: {salvacion.total} vs {uso.dificultad} ·{" "}
          {salvacion.exito ? (salvacion.critico ? "éxito crítico" : "éxito") : salvacion.critico ? "fracaso crítico" : "fracaso"}
          {opciones.length === 0 && <span className="block text-muted">Sin efecto</span>}
          {opciones.length > 1 && elegida === null && aplica && (
            <div className="mt-2 flex flex-col gap-2">
              {opciones.map((o, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onElegir(i)}
                  className="clip-chamfer-sm w-full border border-danger py-2 font-display text-xs font-semibold uppercase tracking-wide text-danger active:scale-[0.98]"
                >
                  {textoResultadoSobreesfuerzo(o, uso.nivel)}
                </button>
              ))}
            </div>
          )}
          {opciones.length > 0 && !aplica && (
            <span className="block normal-case text-danger">
              {opciones.map((o) => textoResultadoSobreesfuerzo(o, uso.nivel)).join(", o a elegir: ")}. Aplícalo a mano.
            </span>
          )}
          {mensaje && <span className="block normal-case text-danger">{mensaje}</span>}
        </div>
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
