import type { Resultado, ResultadoDanio } from "@/lib/rules";

function signo(n: number) {
  return n >= 0 ? `+${n}` : `${n}`;
}

// Info de daño de la tirada de ataque que la generó: null si la tirada no es
// un ataque. En melee `base` se calcula desde la Fuerza efectiva del propio
// personaje (combate.ts, bonoFormulaFuerza) — antes de 2026-09-24 se dejaba
// en null y solo se mostraba la fórmula ("Fue+2") para calcularla a mano;
// `formulaDanio` se conserva igual, ahora solo como referencia de dónde sale
// el número. `base` solo queda null si una fórmula futura no sigue el
// patrón "Fuerza"/"Fue" (+N) que hoy cubre el catálogo entero.
export type DanioInfo = { base: number | null; formulaDanio: string | null; categoriaDanio: string };

export type Lanzamiento = Resultado & {
  id: number;
  label: string;
  danioInfo?: DanioInfo | null;
  danioResuelto?: ResultadoDanio;
  // Texto de crítico de la Accion que generó esta tirada (Accion.efectoCritico,
  // combate.ts) — solo tiene sentido pintarlo si esta tirada acabó en crítico,
  // ver el bloque de daño más abajo.
  efectoCritico?: string;
  // Efectos que tocan otra tirada (Accion.efectos, acciones.ts) — no se
  // automatizan, se listan para que el jugador/máster los aplique a mano.
  // Se pintan tras resolver el daño, no antes: es el momento en que el
  // jugador ya sabe si el ataque impactó de verdad.
  efectos?: { fuente: string; texto: string }[];
};

// Contenido de un resultado de tirada — dado, total, veredicto, daño. Lo
// comparten el Marcador de AccionesTab (panel superior, log rápido que se
// pierde al cambiar de tab) y AccionModal (resultado in-place tras pulsar
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
      {/* Sin el label de la tirada aquí a propósito (2026-09-24): el único
          sitio que pinta esto es AccionModal, y su propio <h2> ya lleva el
          nombre justo encima. "Hero stat" (feedback del usuario, tres
          vueltas): el número (6rem) es lo primero que impacta, veredicto
          como eyebrow encima de él — y el desglose técnico vuelve al hueco
          de la derecha, que quedaba vacío junto a un número tan alto. */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className={`font-mono text-xs uppercase tracking-widest ${tono}`}>
            {veredicto}
          </span>
          <span className={`-mt-1 font-display text-[6rem] font-bold leading-none tabular-nums ${tono}`}>
            {resultado.total}
          </span>
        </div>

        <p className="text-right font-mono text-xs leading-relaxed text-muted">
          d12 <span className="text-foreground">{resultado.dado}</span>
          <br />
          {"mod "}
          <span className="text-foreground">{signo(resultado.modificador)}</span>
          {resultado.circunstancial !== 0 && (
            <>
              <br />
              {"circ "}
              <span className="text-foreground">{signo(resultado.circunstancial)}</span>
            </>
          )}
          {resultado.dificultad !== null && (
            <>
              <br />
              {"vs "}
              <span className="text-foreground">{resultado.dificultad}</span>
              <br />
              <span className={tono}>
                {margen! >= 0 ? `${margen} éxitos` : `${Math.abs(margen!)} fracasos`}
              </span>
            </>
          )}
        </p>
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
              {resultado.critico && resultado.efectoCritico && (
                <span className="text-accent"> · {resultado.efectoCritico}</span>
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

      {/* Efectos que tocan otra tirada (Sigilo, la Esquiva/Alerta Activa de
          un tercero...): el motor no los automatiza, así que se listan aquí
          para que se apliquen a mano — docs/sistema.md, pregunta 25b. Solo
          tras el daño resuelto: antes de eso el jugador todavía no sabe si
          el ataque impactó de verdad. Si la Accion no tiene daño (no es un
          ataque), se pintan sin esperar a nada. */}
      {resultado.efectos &&
        resultado.efectos.length > 0 &&
        (!resultado.danioInfo || resultado.danioResuelto) && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted">Efectos</p>
            <ul className="mt-1 flex flex-col gap-1">
              {resultado.efectos.map((e, i) => (
                <li key={i} className="font-sans text-[11px] leading-relaxed text-foreground">
                  <span className="font-semibold">{e.fuente}:</span> {e.texto}
                </li>
              ))}
            </ul>
          </div>
        )}
    </>
  );
}
