"use client";

import { useState, type ReactNode } from "react";
import {
  APLICADOS,
  HABILIDADES,
  HABILIDAD_MIN_ENTRENADA,
  HABILIDAD_NO_ENTRENADA,
  conExtrasDeFicha,
  elegirEspecialidad,
  especialidadesDe,
  esEspecialidadDe,
  etiquetaEspecialidad,
  eleccionSinTocar,
  montarTirada,
  usarHabilidadAlternativa,
  valorFueraDeEspecialidad,
  textoValor,
  etiquetaEconomia,
  type Accion,
  type AplicadoId,
  type EspecialidadId,
  type FichaResuelta,
  type Fuente,
  type HabilidadId,
  type PoderDisponible,
  type PoderPreparado,
  type SeleccionPoder,
} from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { Desglose } from "@/components/Desglose";

// Pestaña Habilidades de Acciones: todo lo que tira con habilidad (tiradas, ataques, poderes,
// Reparar y Fabricar) colgado en Habilidad › Especialidad › Hoja. Solo presentación: los números
// salen de la ficha resuelta, de montarTirada y de prepararPoder.

// Una hoja del árbol: dónde cuelga (habilidad y especialidades que nombra; sin ninguna de esa
// habilidad, de la habilidad entera) y qué se pinta. `aplicado`: para la tirada genérica.
export type HojaDeArbol = {
  key: string;
  habilidad: HabilidadId;
  especialidades: readonly EspecialidadId[];
  aplicado: AplicadoId;
  nodo: ReactNode;
};

export type Estrella = { marcada: boolean; onMarcar: () => void };

// Marca la fila como favorita. Dentro del fieldset de la pestaña: en solo lectura se apaga sola.
export function BotonEstrella({ estrella }: { estrella: Estrella }) {
  return (
    <button
      type="button"
      aria-pressed={estrella.marcada}
      aria-label={estrella.marcada ? "Quitar de favoritas" : "Añadir a favoritas"}
      onClick={estrella.onMarcar}
      className={`flex min-h-10 min-w-10 shrink-0 items-center justify-center text-xl leading-none active:scale-90 disabled:opacity-50 ${
        estrella.marcada ? "text-accent" : "text-muted"
      }`}
    >
      {estrella.marcada ? "★" : "☆"}
    </button>
  );
}

const BOTON_TIRAR =
  "clip-chamfer-sm shrink-0 border border-accent bg-accent px-3 py-2 font-display text-xs font-semibold uppercase tracking-wide text-black active:scale-95 disabled:border-border disabled:bg-elevated disabled:text-muted disabled:active:scale-100";

const CHIP = "clip-chamfer-sm min-h-8 border px-2 py-1 font-mono text-[10px] uppercase active:scale-95";

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

// El aplicado que más usan las hojas de esa rama: el punto de partida de la genérica.
function aplicadoHabitual(hojas: HojaDeArbol[]): AplicadoId {
  const cuenta = new Map<AplicadoId, number>();
  for (const { aplicado } of hojas) cuenta.set(aplicado, (cuenta.get(aplicado) ?? 0) + 1);
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "perspicacia";
}

const textoCuenta = (n: number) => (n === 0 ? "sin tiradas" : `${n} tirada${n === 1 ? "" : "s"}`);

export function ArbolHabilidades({
  ficha,
  hojas,
  onAbrir,
}: {
  ficha: FichaResuelta;
  hojas: HojaDeArbol[];
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
          hojas={hojas.filter((t) => t.habilidad === h.id)}
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
  hojas,
  onAbrir,
}: {
  habilidad: HabilidadId;
  label: string;
  ficha: FichaResuelta;
  hojas: HojaDeArbol[];
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
  const enEspecialidad = (t: HojaDeArbol): readonly EspecialidadId[] =>
    t.especialidades.filter((e) => esEspecialidadDe(habilidad, e));
  const directas = hojas.filter((t) => enEspecialidad(t).length === 0);

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
              {textoCuenta(hojas.length)}
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
                <div key={t.key}>{t.nodo}</div>
              ))}
            </div>
          )}

          {/* Interpretación no tiene especialidades: la genérica, de la habilidad. */}
          {catalogo.length === 0 && (
            <TiradaGenerica
              habilidad={habilidad}
              especialidad={null}
              etiqueta={label}
              aplicadoInicial={aplicadoHabitual(hojas)}
              ficha={ficha}
              onAbrir={onAbrir}
            />
          )}

          {catalogo.map((e) => {
            const colgadas = hojas.filter((t) => enEspecialidad(t).includes(e.id));
            return (
              <RamaEspecialidad
                key={e.id}
                habilidad={habilidad}
                especialidad={e.id}
                label={e.label}
                ficha={ficha}
                fuentesHabilidad={deHabilidad}
                hojas={colgadas}
                aplicadoInicial={aplicadoHabitual(colgadas.length > 0 ? colgadas : hojas)}
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
  hojas,
  aplicadoInicial,
  onAbrir,
}: {
  habilidad: HabilidadId;
  especialidad: EspecialidadId;
  label: string;
  ficha: FichaResuelta;
  fuentesHabilidad: Fuente[];
  hojas: HojaDeArbol[];
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
                {textoCuenta(hojas.length)}
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
          {hojas.map((t) => (
            <div key={t.key}>{t.nodo}</div>
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

const MARCO_HOJA = "flex flex-col gap-1.5 border border-border bg-night p-2";

// Una tirada (fija, de arma, de equipo, de dote, de aumento): Sutil, habilidad alternativa y
// especialidad a elegir en la propia hoja, como en FilaTirada.
export function HojaTirada({
  accion: t,
  origen,
  ficha,
  onAbrir,
  estrella,
}: {
  accion: Accion;
  origen: string;
  ficha: FichaResuelta;
  onAbrir: (t: Accion, sutil: boolean) => void;
  estrella?: Estrella;
}) {
  // Sutil: preseleccionado por el aplicado que dé más al ataque (como FilaTirada).
  const [sutilActivo, setSutilActivo] = useState(() =>
    t.aplicadoSutil ? ficha.aplicados[t.aplicadoSutil] > ficha.aplicados[t.aplicado] : false,
  );
  const [alternativaActiva, setAlternativaActiva] = useState(false);
  const alternativa = alternativaActiva ? usarHabilidadAlternativa(t) : null;
  // Convencer / mentir: como en su fila, no se tira sin elegir especialidad.
  const [elegida, setElegida] = useState<EspecialidadId | null>(null);
  const pendienteElegir = !alternativa && !!t.especialidadAElegir && elegida === null;
  const efectiva = alternativa ?? (t.especialidadAElegir && elegida ? elegirEspecialidad(t, elegida) : t);
  const montada = montarTirada(ficha, efectiva, eleccionSinTocar(efectiva, sutilActivo));
  const aplicado = APLICADOS.find((a) => a.id === montada.aplicado.id)!;
  const situacional = (t.condiciones?.length ?? 0) > 0;

  return (
    <div className={`${MARCO_HOJA} ${t.bloqueada ? "border-dashed opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="block font-display text-sm font-semibold uppercase leading-tight">{t.label}</span>
          <span className="mt-0.5 block font-mono text-[10px] uppercase text-muted">
            {aplicado.abbr} · {origen}
            {situacional && <span className="text-info"> · ± según situación</span>}
          </span>
        </div>
        {t.bloqueada ? (
          <span className="shrink-0 font-mono text-[10px] uppercase text-danger">no disponible</span>
        ) : (
          <>
            <Desglose total={montada.modificador} fuentes={montada.desglose} className="text-lg text-info" />
            <button type="button" disabled={pendienteElegir} onClick={() => onAbrir(efectiva, sutilActivo)} className={BOTON_TIRAR}>
              Tirar
            </button>
          </>
        )}
        {estrella && <BotonEstrella estrella={estrella} />}
      </div>

      {t.bloqueada && <p className="font-mono text-[10px] leading-relaxed text-muted">{t.bloqueada}</p>}

      {!t.bloqueada && (t.aplicadoSutil || t.habilidadAlternativa) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {t.aplicadoSutil && (
            <button
              type="button"
              aria-pressed={sutilActivo}
              onClick={() => setSutilActivo((v) => !v)}
              className={`${CHIP} ${sutilActivo ? "border-info text-info" : "border-border text-muted"}`}
            >
              {sutilActivo ? "✓ " : ""}Sutil
            </button>
          )}
          {t.habilidadAlternativa && (
            <button
              type="button"
              aria-pressed={alternativaActiva}
              onClick={() => setAlternativaActiva((v) => !v)}
              className={`${CHIP} ${alternativaActiva ? "border-info text-info" : "border-border text-muted"}`}
            >
              {alternativaActiva ? "✓ " : ""}
              {t.habilidadAlternativa.etiqueta}
            </button>
          )}
        </div>
      )}

      {t.especialidadAElegir && !alternativa && !t.bloqueada && (
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
              className={`${CHIP} ${elegida === e ? "border-info text-info" : "border-border text-muted"}`}
            >
              {elegida === e ? "✓ " : ""}
              {etiquetaEspecialidad(e)}
            </button>
          ))}
        </div>
      )}

      {montada.especialidadArma && !pendienteElegir && !montada.especialidadArma.tiene && (
        <p className="font-mono text-[10px] uppercase text-muted">sin {montada.especialidadArma.label}: la mitad</p>
      )}
    </div>
  );
}

// Un poder con tirada, en la variante que cuelga de esta rama (`preparado` con la selección
// puesta). "Usar" abre el flujo de poder de siempre con esa selección.
export function HojaPoder({
  poder,
  preparado,
  origen,
  onAbrir,
  estrella,
}: {
  poder: PoderDisponible;
  preparado: PoderPreparado;
  origen: string;
  onAbrir: (p: PoderDisponible, seleccion: SeleccionPoder) => void;
  estrella?: Estrella;
}) {
  const { montada, tirada } = preparado;
  if (!montada || !tirada) return null;
  const p = preparado.resuelto;
  const aplicado = APLICADOS.find((a) => a.id === montada.aplicado.id)!;
  const fatiga = preparado.coste ? preparado.coste.total : textoValor(p.fatiga);
  const datos = [etiquetaEconomia(p.economia), `${fatiga} fatiga`].join(" · ");
  return (
    <div className={`${MARCO_HOJA} ${poder.bloqueo ? "border-dashed opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="block font-display text-sm font-semibold uppercase leading-tight">{tirada.label}</span>
          <span className="mt-0.5 block font-mono text-[10px] uppercase text-muted">
            {aplicado.abbr} · {origen}
          </span>
          <span className="mt-0.5 block font-mono text-[10px] text-muted">{datos}</span>
        </div>
        <Desglose total={montada.modificador} fuentes={montada.desglose} className="text-lg text-info" />
        <button type="button" disabled={!!poder.bloqueo} onClick={() => onAbrir(poder, preparado.seleccion)} className={BOTON_TIRAR}>
          Usar
        </button>
        {estrella && <BotonEstrella estrella={estrella} />}
      </div>
      {poder.bloqueo && <p className="font-mono text-[10px] leading-relaxed text-danger">{poder.bloqueo}</p>}
    </div>
  );
}

// Reparar y Fabricar: abre su modal (ReparaFabricaModal); la tirada se hace allí.
export function HojaReparaFabrica({ onAbrir, estrella }: { onAbrir: () => void; estrella?: Estrella }) {
  return (
    <div className={MARCO_HOJA}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="block font-display text-sm font-semibold uppercase leading-tight">Reparar y Fabricar</span>
          <span className="mt-0.5 block font-mono text-[10px] uppercase text-muted">Per · tira al reparar o construir</span>
        </div>
        <button type="button" onClick={onAbrir} className={BOTON_TIRAR}>
          Abrir
        </button>
        {estrella && <BotonEstrella estrella={estrella} />}
      </div>
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
