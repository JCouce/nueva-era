import type { Resultado, ResultadoDanio } from "@/lib/rules";

function signo(n: number) {
  return n >= 0 ? `+${n}` : `${n}`;
}

// Info de daño de la tirada de ataque que la generó: null si la tirada no es
// un ataque. `base` es null en melee — el daño ahí es una fórmula sobre un
// atributo ("Fue+2"), no un número, así que no hay botón de "tirar daño"
// todavía para esas filas: se muestra la fórmula para calcularla a mano.
export type DanioInfo = { base: number | null; formulaDanio: string | null; categoriaDanio: string };

export type Lanzamiento = Resultado & {
  id: number;
  label: string;
  danioInfo?: DanioInfo | null;
  danioResuelto?: ResultadoDanio;
};

// Contenido de un resultado de tirada — dado, total, veredicto, daño. Lo
// comparten el Marcador de TiradasTab (panel superior, log rápido que se
// pierde al cambiar de tab) y TiradaModal (resultado in-place tras pulsar
// Tirar, sin cerrar el modal) para no duplicar la lógica de tono/veredicto
// en dos sitios. Ver docs/equipo-efectos-especiales.md, UX del modal,
// 2026-09-23: cerrar el modal dejaba al jugador mirando la lista de botones
// sin ver el resultado si había hecho scroll — ahora el resultado vive donde
// ya estás mirando.
export function ContenidoResultado({
  resultado,
  onTirarDanio,
}: {
  resultado: Lanzamiento;
  onTirarDanio: () => void;
}) {
  const { exito, critico, margen } = resultado;
  const tono =
    exito === null
      ? "text-foreground"
      : exito
        ? critico
          ? "text-accent"
          : "text-info"
        : critico
          ? "text-danger"
          : "text-muted";

  const veredicto =
    exito === null
      ? "sin dificultad"
      : exito
        ? critico
          ? "ÉXITO CRÍTICO"
          : "éxito"
        : critico
          ? "FRACASO CRÍTICO"
          : "fracaso";

  const puedeTirarDanio =
    resultado.danioInfo?.base !== null &&
    resultado.danioInfo !== null &&
    resultado.danioInfo !== undefined &&
    exito === true &&
    margen !== null &&
    !resultado.danioResuelto;

  return (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-display text-sm font-semibold uppercase tracking-wide">
          {resultado.label}
        </span>
        <span className={`font-mono text-[11px] uppercase tracking-widest ${tono}`}>
          {veredicto}
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-3">
        <span className={`font-display text-5xl font-bold tabular-nums ${tono}`}>
          {resultado.total}
        </span>
        <span className="font-mono text-xs leading-tight text-muted">
          d12 <span className="text-foreground">{resultado.dado}</span>
          {" · mod "}
          <span className="text-foreground">{signo(resultado.modificador)}</span>
          {resultado.circunstancial !== 0 && (
            <>
              {" · circ "}
              <span className="text-foreground">{signo(resultado.circunstancial)}</span>
            </>
          )}
          {resultado.dificultad !== null && (
            <>
              <br />
              {"vs dificultad "}
              <span className="text-foreground">{resultado.dificultad}</span>
              {" · "}
              <span className={tono}>
                {margen! >= 0 ? `${margen} éxitos` : `${Math.abs(margen!)} fracasos`}
              </span>
            </>
          )}
        </span>
      </div>

      {resultado.danioInfo && (
        <div className="mt-3 border-t border-border pt-3">
          {resultado.danioResuelto ? (
            <p className="font-mono text-xs uppercase text-danger">
              Daño: <span className="text-lg tabular-nums">{resultado.danioResuelto.total}</span>{" "}
              {resultado.danioInfo.categoriaDanio}
              {resultado.danioResuelto.bonoExitos > 0 && (
                <span className="text-muted">
                  {" "}
                  ({resultado.danioResuelto.base} base +{resultado.danioResuelto.bonoExitos} por éxitos)
                </span>
              )}
            </p>
          ) : puedeTirarDanio ? (
            <button
              type="button"
              onClick={onTirarDanio}
              className="clip-chamfer-sm w-full border border-danger py-2 font-display text-xs font-semibold uppercase tracking-wide text-danger active:scale-[0.98]"
            >
              Tirar daño ({resultado.danioInfo.base} {resultado.danioInfo.categoriaDanio} base)
            </button>
          ) : resultado.danioInfo.formulaDanio ? (
            <p className="font-mono text-[10px] uppercase text-muted">
              Daño: {resultado.danioInfo.formulaDanio} {resultado.danioInfo.categoriaDanio} (fórmula — se
              calcula a mano)
            </p>
          ) : null}
        </div>
      )}
    </>
  );
}
