"use client";

import { useState } from "react";
import {
  APLICADOS,
  HABILIDADES,
  HABILIDAD_MIN_ENTRENADA,
  HABILIDAD_NO_ENTRENADA,
  conExtrasDeFicha,
  elegirEspecialidad,
  especialidadesDe,
  especialidadesDeTirada,
  esEspecialidadDe,
  etiquetaEspecialidad,
  eleccionSinTocar,
  montarTirada,
  valorFueraDeEspecialidad,
  type Accion,
  type AplicadoId,
  type EspecialidadId,
  type FichaResuelta,
  type Fuente,
  type HabilidadId,
} from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { Desglose } from "@/components/Desglose";

// Prototipo (rama prueba/tiradas-en-habilidades): las tiradas de habilidad de todos los
// orígenes colgadas en Habilidad › Especialidad › Tirada, para ver si ayuda a tirar la que
// trae los bonos en vez de la libre. Solo presentación: los números salen de la ficha
// resuelta y de montarTirada, como en el resto de la pestaña.

// `origen`: la pestaña de la que viene la fila, para comparar con la vista por origen.
export type TiradaDeArbol = { accion: Accion; origen: string };

const BOTON_TIRAR =
  "clip-chamfer-sm shrink-0 border border-accent bg-accent px-3 py-2 font-display text-xs font-semibold uppercase tracking-wide text-black active:scale-95 disabled:border-border disabled:bg-elevated disabled:text-muted disabled:active:scale-100";

const sumar = (fuentes: Fuente[]) => fuentes.reduce((t, f) => t + f.valor, 0);

// Lo que apunta a la habilidad entera: lo que sube su valor (tipo "habilidad") y los bonos de
// tirada con alcance "habilidad".
function fuentesDeHabilidad(ficha: FichaResuelta, habilidad: HabilidadId): Fuente[] {
  return ficha.modificadores.flatMap((m): Fuente[] => {
    if (m.tipo === "habilidad" && m.id === habilidad) return [{ etiqueta: m.fuente, valor: m.valor }];
    if (m.tipo === "tirada" && m.alcance.tipo === "habilidad" && m.alcance.habilidad === habilidad)
      return [{ etiqueta: `${m.fuente} (tiradas)`, valor: m.valor }];
    return [];
  });
}

function fuentesDeEspecialidad(ficha: FichaResuelta, especialidad: EspecialidadId): Fuente[] {
  return ficha.modificadores.flatMap((m): Fuente[] =>
    m.tipo === "tirada" && m.alcance.tipo === "especialidad" && m.alcance.especialidades.includes(especialidad)
      ? [{ etiqueta: m.fuente, valor: m.valor }]
      : [],
  );
}

// El aplicado que más usan las tiradas de esa rama: el punto de partida de la genérica.
function aplicadoHabitual(tiradas: TiradaDeArbol[]): AplicadoId {
  const cuenta = new Map<AplicadoId, number>();
  for (const { accion } of tiradas) cuenta.set(accion.aplicado, (cuenta.get(accion.aplicado) ?? 0) + 1);
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "perspicacia";
}

export function ArbolHabilidades({
  ficha,
  tiradas,
  onAbrir,
}: {
  ficha: FichaResuelta;
  tiradas: TiradaDeArbol[];
  onAbrir: (t: Accion, sutil: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {HABILIDADES.map((h) => (
        <RamaHabilidad
          key={h.id}
          habilidad={h.id}
          label={h.label}
          ficha={ficha}
          tiradas={tiradas.filter((t) => t.accion.habilidad === h.id)}
          onAbrir={onAbrir}
        />
      ))}
    </div>
  );
}

function RamaHabilidad({
  habilidad,
  label,
  ficha,
  tiradas,
  onAbrir,
}: {
  habilidad: HabilidadId;
  label: string;
  ficha: FichaResuelta;
  tiradas: TiradaDeArbol[];
  onAbrir: (t: Accion, sutil: boolean) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const { valor, especialidades: propias } = ficha.ficha.habilidades[habilidad];
  const entrenada = valor >= HABILIDAD_MIN_ENTRENADA;
  const deHabilidad = fuentesDeHabilidad(ficha, habilidad);
  const fuentes: Fuente[] = [
    { etiqueta: entrenada ? "Ficha" : "Sin entrenar", valor: entrenada ? valor : HABILIDAD_NO_ENTRENADA },
    ...deHabilidad,
  ];
  const catalogo = especialidadesDe(habilidad);

  // Cuelga de cada especialidad de esta habilidad que nombre; sin ninguna (o a elegir), de la
  // habilidad.
  const enEspecialidad = (t: TiradaDeArbol): EspecialidadId[] =>
    especialidadesDeTirada(t.accion).filter((e) => esEspecialidadDe(habilidad, e));
  const directas = tiradas.filter((t) => enEspecialidad(t).length === 0);

  return (
    <HudCard className="p-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          className="flex min-h-10 min-w-0 flex-1 items-center justify-between gap-2 text-left"
        >
          <div className="min-w-0">
            <span className="block font-display text-base font-semibold uppercase leading-tight">{label}</span>
            <span className="mt-1 block font-mono text-[10px] uppercase text-muted">
              {tiradas.length === 0 ? "sin tiradas" : `${tiradas.length} tirada${tiradas.length === 1 ? "" : "s"}`}
              {propias.length > 0 && ` · ${propias.map(etiquetaEspecialidad).join(", ")}`}
            </span>
          </div>
          <span className={`shrink-0 font-mono text-[9px] text-muted transition-transform ${abierto ? "rotate-180" : ""}`}>
            ▾
          </span>
        </button>
        <Desglose total={sumar(fuentes)} fuentes={fuentes} className="text-2xl text-info" />
      </div>

      {abierto && (
        <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
          {directas.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {catalogo.length > 0 ? "// Habilidad entera" : "// Sin especialidades: siempre entera"}
              </p>
              {directas.map((t) => (
                <HojaTirada key={t.accion.id} tirada={t} ficha={ficha} onAbrir={onAbrir} />
              ))}
            </div>
          )}

          {/* Interpretación no tiene especialidades: la genérica, de la habilidad. */}
          {catalogo.length === 0 && (
            <TiradaGenerica
              habilidad={habilidad}
              especialidad={null}
              etiqueta={label}
              aplicadoInicial={aplicadoHabitual(tiradas)}
              ficha={ficha}
              onAbrir={onAbrir}
            />
          )}

          {catalogo.map((e) => {
            const colgadas = tiradas.filter((t) => enEspecialidad(t).includes(e.id));
            return (
              <RamaEspecialidad
                key={e.id}
                habilidad={habilidad}
                especialidad={e.id}
                label={e.label}
                ficha={ficha}
                fuentesHabilidad={deHabilidad}
                tiradas={colgadas}
                aplicadoInicial={aplicadoHabitual(colgadas.length > 0 ? colgadas : tiradas)}
                onAbrir={onAbrir}
              />
            );
          })}
        </div>
      )}
    </HudCard>
  );
}

function RamaEspecialidad({
  habilidad,
  especialidad,
  label,
  ficha,
  fuentesHabilidad,
  tiradas,
  aplicadoInicial,
  onAbrir,
}: {
  habilidad: HabilidadId;
  especialidad: EspecialidadId;
  label: string;
  ficha: FichaResuelta;
  fuentesHabilidad: Fuente[];
  tiradas: TiradaDeArbol[];
  aplicadoInicial: AplicadoId;
  onAbrir: (t: Accion, sutil: boolean) => void;
}) {
  const { valor, especialidades } = ficha.ficha.habilidades[habilidad];
  const tiene = especialidades.includes(especialidad);
  const entrenada = valor >= HABILIDAD_MIN_ENTRENADA;
  // Sin entrenar es -1 con especialidad o sin ella (sistema.md §3).
  const base: Fuente = !entrenada
    ? { etiqueta: "Sin entrenar", valor: HABILIDAD_NO_ENTRENADA }
    : tiene
      ? { etiqueta: "Ficha (especialidad)", valor }
      : { etiqueta: "Ficha (mitad, sin especialidad)", valor: valorFueraDeEspecialidad(valor) };
  const fuentes = [base, ...fuentesHabilidad, ...fuentesDeEspecialidad(ficha, especialidad)];
  const [abierta, setAbierta] = useState(false);

  return (
    <div className="flex flex-col gap-2 border-l-2 border-border pl-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setAbierta((v) => !v)}
          aria-expanded={abierta}
          className="flex min-h-10 min-w-0 flex-1 items-center justify-between gap-2 text-left"
        >
          <div className="min-w-0">
            <span className="block font-display text-sm font-semibold uppercase leading-tight">{label}</span>
            <span className={`mt-0.5 block font-mono text-[10px] uppercase ${tiene ? "text-info" : "text-muted"}`}>
              {!entrenada ? "sin entrenar" : tiene ? "✓ especialidad" : "la mitad"}
              <span className="text-muted">
                {" · "}
                {tiradas.length === 0 ? "sin tiradas" : `${tiradas.length} tirada${tiradas.length === 1 ? "" : "s"}`}
              </span>
            </span>
          </div>
          <span className={`shrink-0 font-mono text-[9px] text-muted transition-transform ${abierta ? "rotate-180" : ""}`}>
            ▾
          </span>
        </button>
        <Desglose total={sumar(fuentes)} fuentes={fuentes} className="text-lg text-foreground" />
      </div>

      {abierta && (
        <>
          {tiradas.map((t) => (
            <HojaTirada key={t.accion.id} tirada={t} ficha={ficha} onAbrir={onAbrir} />
          ))}
          <TiradaGenerica
            habilidad={habilidad}
            especialidad={especialidad}
            etiqueta={label}
            aplicadoInicial={aplicadoInicial}
            ficha={ficha}
            onAbrir={onAbrir}
          />
        </>
      )}
    </div>
  );
}

function HojaTirada({
  tirada,
  ficha,
  onAbrir,
}: {
  tirada: TiradaDeArbol;
  ficha: FichaResuelta;
  onAbrir: (t: Accion, sutil: boolean) => void;
}) {
  const t = tirada.accion;
  // Convencer / mentir: como en su fila, no se tira sin elegir especialidad.
  const [elegida, setElegida] = useState<EspecialidadId | null>(null);
  const pendienteElegir = !!t.especialidadAElegir && elegida === null;
  const efectiva = t.especialidadAElegir && elegida ? elegirEspecialidad(t, elegida) : t;
  const montada = montarTirada(ficha, efectiva, eleccionSinTocar(efectiva));
  const aplicado = APLICADOS.find((a) => a.id === montada.aplicado.id)!;
  const situacional = (t.condiciones?.length ?? 0) > 0;

  return (
    <div className={`flex flex-col gap-1.5 border border-border bg-night p-2 ${t.bloqueada ? "border-dashed opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="block font-display text-sm font-semibold uppercase leading-tight">{t.label}</span>
          <span className="mt-0.5 block font-mono text-[10px] uppercase text-muted">
            {aplicado.abbr} · {tirada.origen}
            {situacional && <span className="text-info"> · ± según situación</span>}
          </span>
        </div>
        {t.bloqueada ? (
          <span className="shrink-0 font-mono text-[10px] uppercase text-danger">no disponible</span>
        ) : (
          <>
            <Desglose total={montada.modificador} fuentes={montada.desglose} className="text-lg text-info" />
            <button type="button" disabled={pendienteElegir} onClick={() => onAbrir(efectiva, false)} className={BOTON_TIRAR}>
              Tirar
            </button>
          </>
        )}
      </div>

      {t.bloqueada && <p className="font-mono text-[10px] leading-relaxed text-muted">{t.bloqueada}</p>}

      {t.especialidadAElegir && !t.bloqueada && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`font-mono text-[10px] uppercase ${pendienteElegir ? "text-danger" : "text-muted"}`}>
            {pendienteElegir ? "elige especialidad:" : "especialidad:"}
          </span>
          {t.especialidadAElegir.map((e) => (
            <button
              key={e}
              type="button"
              aria-pressed={elegida === e}
              onClick={() => setElegida(e)}
              className={`clip-chamfer-sm min-h-8 border px-2 py-1 font-mono text-[10px] uppercase active:scale-95 ${
                elegida === e ? "border-info text-info" : "border-border text-muted"
              }`}
            >
              {elegida === e ? "✓ " : ""}
              {etiquetaEspecialidad(e)}
            </button>
          ))}
        </div>
      )}

      {t.habilidadAlternativa && (
        <p className="font-mono text-[10px] uppercase text-muted">
          alternativa ({t.habilidadAlternativa.etiqueta}): desde su pestaña
        </p>
      )}
    </div>
  );
}

// La tirada genérica de una especialidad: grupo "Libre" para que no le case ningún alcance por
// grupo ni por id de tirada, pero sí lo de la habilidad, la especialidad, el aplicado y "todas".
// El aplicado se elige aquí y no en el modal: el selector del modal solo sale con `libre`, que
// además deja elegir habilidad y quita las casillas por especialidad.
function TiradaGenerica({
  habilidad,
  especialidad,
  etiqueta,
  aplicadoInicial,
  ficha,
  onAbrir,
}: {
  habilidad: HabilidadId;
  especialidad: EspecialidadId | null;
  etiqueta: string;
  aplicadoInicial: AplicadoId;
  ficha: FichaResuelta;
  onAbrir: (t: Accion, sutil: boolean) => void;
}) {
  const [aplicado, setAplicado] = useState<AplicadoId>(aplicadoInicial);
  const abbr = APLICADOS.find((a) => a.id === aplicado)!.abbr;
  const accion = conExtrasDeFicha(ficha, {
    id: `generica_${especialidad ?? habilidad}`,
    label: `${etiqueta} (${abbr})`,
    grupo: "Libre",
    aplicado,
    habilidad,
    ...(especialidad && { especialidadesAccion: [especialidad] }),
  });
  const montada = montarTirada(ficha, accion, eleccionSinTocar(accion));

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label={`Aplicado de la tirada genérica de ${etiqueta}`}
        value={aplicado}
        onChange={(e) => setAplicado(e.target.value as AplicadoId)}
        className="min-h-10 min-w-0 flex-1 border border-border bg-elevated px-2 font-mono text-xs uppercase text-foreground"
      >
        {APLICADOS.map((a) => (
          <option key={a.id} value={a.id}>
            {a.label}
          </option>
        ))}
      </select>
      <Desglose total={montada.modificador} fuentes={montada.desglose} className="text-base text-muted" />
      <button
        type="button"
        onClick={() => onAbrir(accion, false)}
        className="clip-chamfer-sm min-h-10 shrink-0 border border-accent px-3 py-2 font-display text-xs font-semibold uppercase tracking-wide text-accent active:scale-95"
      >
        Tirar {etiqueta}
      </button>
    </div>
  );
}
