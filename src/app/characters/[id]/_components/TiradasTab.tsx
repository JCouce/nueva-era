"use client";

import { useState } from "react";
import {
  TIRADAS,
  GRUPOS_TIRADA,
  APLICADOS,
  HABILIDADES,
  modificadorTirada,
  resolverTirada,
  resolverDanio,
  tirarD12,
  tiradasDeAtaque,
  tiradasDeHerramientas,
  valorCondiciones,
  valorBonosTramo,
  modificadoresActivos,
  modificadoresDeEstados,
  condicionesActivas,
  bonoAlcance,
  modoElegido,
  type Tirada,
  type Resultado,
  type ResultadoDanio,
  type Sheet,
  type EstadoCondiciones,
  type EstadoActivo,
  type ModificadorConFuente,
} from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { TiradaModal } from "@/components/TiradaModal";

function signo(n: number) {
  return n >= 0 ? `+${n}` : `${n}`;
}

function sumaAjustesFijos(tirada: Tirada): number {
  return (tirada.ajustesFijos ?? []).reduce((t, a) => t + a.valor, 0);
}

// Info de daño de la tirada de ataque que la generó: null si la tirada no es
// un ataque. `base` es null en melee — el daño ahí es una fórmula sobre un
// atributo ("Fue+2"), no un número, así que no hay botón de "tirar daño"
// todavía para esas filas: se muestra la fórmula para calcularla a mano.
type DanioInfo = { base: number | null; formulaDanio: string | null; categoriaDanio: string };

type Lanzamiento = Resultado & {
  id: number;
  label: string;
  danioInfo?: DanioInfo | null;
  danioResuelto?: ResultadoDanio;
};

// Panel del último resultado. Es lo primero que se mira tras pulsar, así que
// va arriba y con el total en grande.
function Marcador({
  ultimo,
  onTirarDanio,
}: {
  ultimo: Lanzamiento | null;
  onTirarDanio: () => void;
}) {
  if (!ultimo) {
    return (
      <HudCard className="border-dashed p-4 text-center">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
          {"//SYSTEM · sin tiradas"}
        </p>
        <p className="mt-2 font-sans text-sm text-muted">
          Elige una acción y pulsa TIRAR.
        </p>
      </HudCard>
    );
  }

  const { exito, critico, margen } = ultimo;
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
    ultimo.danioInfo?.base !== null &&
    ultimo.danioInfo !== null &&
    ultimo.danioInfo !== undefined &&
    exito === true &&
    margen !== null &&
    !ultimo.danioResuelto;

  return (
    <HudCard className={`p-4 ${critico ? "border-accent" : ""}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-display text-sm font-semibold uppercase tracking-wide">
          {ultimo.label}
        </span>
        <span className={`font-mono text-[11px] uppercase tracking-widest ${tono}`}>
          {veredicto}
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-3">
        <span className={`font-display text-5xl font-bold tabular-nums ${tono}`}>
          {ultimo.total}
        </span>
        <span className="font-mono text-xs leading-tight text-muted">
          d12 <span className="text-foreground">{ultimo.dado}</span>
          {" · mod "}
          <span className="text-foreground">{signo(ultimo.modificador)}</span>
          {ultimo.circunstancial !== 0 && (
            <>
              {" · circ "}
              <span className="text-foreground">{signo(ultimo.circunstancial)}</span>
            </>
          )}
          {ultimo.dificultad !== null && (
            <>
              <br />
              {"vs dificultad "}
              <span className="text-foreground">{ultimo.dificultad}</span>
              {" · "}
              <span className={tono}>
                {margen! >= 0 ? `${margen} éxitos` : `${Math.abs(margen!)} fracasos`}
              </span>
            </>
          )}
        </span>
      </div>

      {ultimo.danioInfo && (
        <div className="mt-3 border-t border-border pt-3">
          {ultimo.danioResuelto ? (
            <p className="font-mono text-xs uppercase text-danger">
              Daño: <span className="text-lg tabular-nums">{ultimo.danioResuelto.total}</span>{" "}
              {ultimo.danioInfo.categoriaDanio}
              {ultimo.danioResuelto.bonoExitos > 0 && (
                <span className="text-muted">
                  {" "}
                  ({ultimo.danioResuelto.base} base +{ultimo.danioResuelto.bonoExitos} por éxitos)
                </span>
              )}
            </p>
          ) : puedeTirarDanio ? (
            <button
              type="button"
              onClick={onTirarDanio}
              className="clip-chamfer-sm w-full border border-danger py-2 font-display text-xs font-semibold uppercase tracking-wide text-danger active:scale-[0.98]"
            >
              Tirar daño ({ultimo.danioInfo.base} {ultimo.danioInfo.categoriaDanio} base)
            </button>
          ) : ultimo.danioInfo.formulaDanio ? (
            <p className="font-mono text-[10px] uppercase text-muted">
              Daño: {ultimo.danioInfo.formulaDanio} {ultimo.danioInfo.categoriaDanio} (fórmula — se
              calcula a mano)
            </p>
          ) : null}
        </div>
      )}
    </HudCard>
  );
}

function FilaTirada({
  tirada,
  sheet,
  mods,
  onAbrir,
}: {
  tirada: Tirada;
  sheet: Sheet;
  mods: ModificadorConFuente[];
  onAbrir: (t: Tirada, enEspecialidad: boolean) => void;
}) {
  const [enEspecialidad, setEnEspecialidad] = useState(false);

  const especialidades = tirada.habilidad
    ? sheet.habilidades[tirada.habilidad].especialidades
    : [];
  const mod = modificadorTirada(sheet, tirada, enEspecialidad, mods);
  const nombreAplicado = APLICADOS.find((a) => a.id === tirada.aplicado)!;
  const nombreHabilidad = tirada.habilidad
    ? HABILIDADES.find((h) => h.id === tirada.habilidad)!.label
    : null;

  if (tirada.bloqueada) {
    return (
      <HudCard className="border-dashed p-3 opacity-60">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-display text-sm font-semibold uppercase text-muted">
            {tirada.label}
          </span>
          <span className="font-mono text-[10px] uppercase text-danger">
            sin definir
          </span>
        </div>
        <p className="mt-1 font-mono text-[10px] leading-relaxed text-muted">
          {tirada.bloqueada}
        </p>
      </HudCard>
    );
  }

  return (
    <HudCard className="p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="block truncate font-display text-base font-semibold uppercase leading-none">
            {tirada.label}
          </span>
          <span className="mt-1 block font-mono text-[10px] uppercase text-muted">
            {nombreAplicado.abbr} {mod.aplicado}
            {nombreHabilidad && (
              <>
                {" + "}
                {nombreHabilidad} {mod.habilidad}
              </>
            )}
            {(tirada.ajustesFijos ?? []).map((a, i) => (
              <span key={i}> {signo(a.valor)}</span>
            ))}
          </span>
        </div>

        <span className="font-mono text-2xl tabular-nums text-info">
          {signo(mod.total + sumaAjustesFijos(tirada))}
        </span>

        <button
          type="button"
          onClick={() => onAbrir(tirada, enEspecialidad)}
          className="clip-chamfer-sm shrink-0 border border-accent bg-accent px-3 py-2 font-display text-xs font-semibold uppercase tracking-wide text-black active:scale-95"
        >
          Tirar
        </button>
      </div>

      {especialidades.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase text-muted">
            especialidad:
          </span>
          <button
            type="button"
            onClick={() => setEnEspecialidad((v) => !v)}
            className={`clip-chamfer-sm border px-2 py-1 font-mono text-[10px] uppercase active:scale-95 ${
              enEspecialidad
                ? "border-info text-info"
                : "border-border text-muted"
            }`}
          >
            {enEspecialidad ? "✓ " : ""}
            {especialidades.join(" / ")}
          </button>
        </div>
      )}

      {tirada.nota && (
        <p className="mt-2 font-sans text-[11px] leading-relaxed text-muted">
          {tirada.nota}
        </p>
      )}
    </HudCard>
  );
}

export function TiradasTab({
  sheet,
  estadosCombate = [],
}: {
  sheet: Sheet;
  // Fase 6b, 3.1b (D5: combate → ficha): los estados que el máster le tenga
  // puestos ahora mismo en el Combate EN_CURSO, si el jugador está metido en
  // uno — vacío si no hay combate o no está dentro. Se combinan con los
  // modificadores "en reposo" de la ficha antes de que nada se calcule, así
  // que fila y modal ven exactamente los mismos números.
  estadosCombate?: EstadoActivo[];
}) {
  const [historial, setHistorial] = useState<Lanzamiento[]>([]);
  const mods = [...modificadoresActivos(sheet), ...modificadoresDeEstados(estadosCombate)];
  // Última dificultad/circunstancial usada en CADA tirada, no una global: un
  // francotirador repite la misma tirada varias veces por turno, pero eso no
  // dice nada de la siguiente salvación o de otra arma.
  const [memoria, setMemoria] = useState<
    Record<string, { dificultad: number | null; circunstancial: number }>
  >({});
  const [modal, setModal] = useState<{
    tirada: Tirada;
    modBase: number;
    desgloseBase: { etiqueta: string; valor: number }[];
    mods: ModificadorConFuente[];
    ctxBase: { id: string; grupo: Tirada["grupo"]; habilidad: Tirada["habilidad"] };
  } | null>(null);

  // Mezcla las condiciones de alcance (Visor Nocturno y lo que venga después,
  // ver docs/modificadores-tiradas.md §8) en CUALQUIER tirada — de ataque,
  // de herramienta o fija de TIRADAS — sin que ninguna de las tres sepa que
  // eso existe. `modoElegido: null` aquí a propósito: en este punto la tirada
  // ni siquiera se ha abierto, así que una condición con alcance "modo" no
  // tiene nada que matchear todavía (no tiene sentido de origen de todos
  // modos, ver condicionesActivas en equipo.ts).
  const conCondicionesDeEquipo = (t: Tirada): Tirada => {
    const extra = condicionesActivas(sheet, { id: t.id, grupo: t.grupo, habilidad: t.habilidad, modoElegido: null });
    return extra.length > 0 ? { ...t, condiciones: [...(t.condiciones ?? []), ...extra] } : t;
  };

  const ataques = tiradasDeAtaque(sheet).map(conCondicionesDeEquipo);
  const herramientas = tiradasDeHerramientas(sheet).map(conCondicionesDeEquipo);

  const abrir = (t: Tirada, enEspecialidad: boolean) => {
    const mod = modificadorTirada(sheet, t, enEspecialidad, mods);
    const nombreAplicado = APLICADOS.find((a) => a.id === t.aplicado)!;
    const nombreHabilidad = t.habilidad ? HABILIDADES.find((h) => h.id === t.habilidad)!.label : null;
    const desgloseBase = [
      { etiqueta: nombreAplicado.label, valor: mod.aplicado },
      ...(nombreHabilidad
        ? [{ etiqueta: `${nombreHabilidad}${enEspecialidad ? " (especialidad)" : ""}`, valor: mod.habilidad ?? 0 }]
        : []),
      ...(t.ajustesFijos ?? []).map((a) => ({ etiqueta: a.fuente, valor: a.valor })),
    ];
    setModal({
      tirada: t,
      modBase: mod.total + sumaAjustesFijos(t),
      desgloseBase,
      mods,
      ctxBase: { id: t.id, grupo: t.grupo, habilidad: t.habilidad },
    });
  };

  const tirar = ({
    estadoCondiciones,
    dificultad,
    circunstancial,
  }: {
    estadoCondiciones: EstadoCondiciones;
    dificultad: number | null;
    circunstancial: number;
  }) => {
    if (!modal) return;
    const { tirada, modBase, mods, ctxBase } = modal;
    const bonoCondiciones = valorCondiciones(tirada.condiciones ?? [], estadoCondiciones);
    const bonoTramo = valorBonosTramo(tirada.bonosTramo ?? [], estadoCondiciones);
    const bonoEquipoEspecie = bonoAlcance(mods, {
      ...ctxBase,
      modoElegido: modoElegido(tirada.condiciones ?? [], estadoCondiciones),
    });
    const r = resolverTirada({
      dado: tirarD12(),
      modificador: modBase + bonoCondiciones + bonoTramo + bonoEquipoEspecie,
      circunstancial,
      dificultad,
    });

    setMemoria((m) => ({ ...m, [tirada.id]: { dificultad, circunstancial } }));

    let danioInfo: DanioInfo | null = null;
    if (tirada.ataque) {
      const modoId = typeof estadoCondiciones.modo === "string" ? estadoCondiciones.modo : tirada.ataque.modos[0].id;
      const modo = tirada.ataque.modos.find((m) => m.id === modoId) ?? tirada.ataque.modos[0];
      danioInfo = { base: modo.danio, formulaDanio: modo.formulaDanio, categoriaDanio: modo.categoriaDanio };
    }

    setHistorial((h) => [{ ...r, id: Date.now(), label: tirada.label, danioInfo }, ...h].slice(0, 6));
    setModal(null);
  };

  const tirarDanio = () => {
    setHistorial((h) => {
      const [ultimo, ...resto] = h;
      if (!ultimo?.danioInfo || ultimo.danioInfo.base === null || ultimo.margen === null) return h;
      const danioResuelto = resolverDanio(ultimo.danioInfo.base, ultimo.margen, ultimo.danioInfo.categoriaDanio);
      return [{ ...ultimo, danioResuelto }, ...resto];
    });
  };

  const especialidadesActuales = modal?.tirada.habilidad
    ? sheet.habilidades[modal.tirada.habilidad].especialidades
    : [];

  return (
    <div className="flex flex-col gap-3">
      <Marcador ultimo={historial[0] ?? null} onTirarDanio={tirarDanio} />

      <div className="flex flex-col gap-2">
        <h2 className="mt-2 border-b border-border pb-1 font-display text-sm font-semibold uppercase tracking-wide text-muted">
          Ataques
        </h2>
        {ataques.map((t) => (
          <FilaTirada key={t.id} tirada={t} sheet={sheet} mods={mods} onAbrir={abrir} />
        ))}
      </div>

      {/* Como Ataques: dinámica, generada por lo que hay equipado, no del
          catálogo fijo (ver herramientas.ts). Solo se pinta si hay algo que
          la use — a diferencia de Ataques, es opcional para la mayoría de
          personajes y no merece un hueco vacío permanente. */}
      {herramientas.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="mt-2 border-b border-border pb-1 font-display text-sm font-semibold uppercase tracking-wide text-muted">
            Herramientas
          </h2>
          {herramientas.map((t) => (
            <FilaTirada key={t.id} tirada={t} sheet={sheet} mods={mods} onAbrir={abrir} />
          ))}
        </div>
      )}

      {GRUPOS_TIRADA.map((grupo) => (
        <div key={grupo} className="flex flex-col gap-2">
          <h2 className="mt-2 border-b border-border pb-1 font-display text-sm font-semibold uppercase tracking-wide text-muted">
            {grupo}
          </h2>
          {TIRADAS.filter((t) => t.grupo === grupo).map(conCondicionesDeEquipo).map((t) => (
            <FilaTirada key={t.id} tirada={t} sheet={sheet} mods={mods} onAbrir={abrir} />
          ))}
        </div>
      ))}

      {historial.length > 1 && (
        <>
          <h2 className="mt-2 border-b border-border pb-1 font-display text-sm font-semibold uppercase tracking-wide text-muted">
            Anteriores
          </h2>
          <div className="flex flex-col gap-1">
            {historial.slice(1).map((h) => (
              <div
                key={h.id}
                className="flex items-baseline justify-between gap-2 border-b border-border py-1.5 font-mono text-[11px] last:border-0"
              >
                <span className="truncate text-muted">{h.label}</span>
                <span className="shrink-0 tabular-nums text-muted">
                  d12 {h.dado} {signo(h.modificador + h.circunstancial)} ={" "}
                  <span
                    className={
                      h.exito === null
                        ? "text-foreground"
                        : h.exito
                          ? "text-info"
                          : "text-danger"
                    }
                  >
                    {h.total}
                  </span>
                  {h.danioResuelto && (
                    <span className="text-danger"> · daño {h.danioResuelto.total}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {modal && (
        <TiradaModal
          titulo={modal.tirada.label}
          subtitulo={
            especialidadesActuales.length > 0
              ? `especialidad: ${especialidadesActuales.join(" / ")}`
              : undefined
          }
          modBase={modal.modBase}
          desgloseBase={modal.desgloseBase}
          condiciones={modal.tirada.condiciones ?? []}
          bonosTramo={modal.tirada.bonosTramo ?? []}
          mods={modal.mods}
          ctxBase={modal.ctxBase}
          dificultadInicial={memoria[modal.tirada.id]?.dificultad ?? 7}
          circunstancialInicial={memoria[modal.tirada.id]?.circunstancial ?? 0}
          onCerrar={() => setModal(null)}
          onTirar={tirar}
        />
      )}
    </div>
  );
}
