"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  DIFICULTADES,
  CARAS_DADO,
  tirarDado,
  estadoInicial,
  valorCondiciones,
  desgloseCondiciones,
  notasCondiciones,
  valorBonosTramo,
  desgloseBonosTramo,
  modoElegido,
  bonoAlcance,
  desgloseAlcance,
  avisoInsuficiente,
  type Accion,
  type CondicionTirada,
  type EstadoCondiciones,
  type BonoPorTramo,
  type ModificadorConFuente,
  type ContextoAccion,
} from "@/lib/rules";
import { HudCard } from "./HudCard";
import { BarraProgreso } from "./BarraProgreso";
import { ContenidoResultado, type Lanzamiento } from "./ResultadoTirada";

// Cuánto "rueda" el dado (número aleatorio cambiando) antes de aterrizar en
// el valor real — ver dispararTirada más abajo. Más corto que el
// VINCULANDO_MS de la Tienda (900ms): un dado se siente mejor rápido y seco,
// no como una transacción.
const RODANDO_MS = 650;
// Cada cuánto cambia el número mientras rueda — ~9 cambios en total.
const RODANDO_INTERVALO_MS = 70;
// Cuánto se queda el número REAL fijo en pantalla antes de pasar a la vista
// completa de resultado (UX 2026-09-23, pedido del usuario: "que se vea lo
// que ha salido un poco más de tiempo" antes de saltar a la otra vista).
const ASENTADO_MS = 900;

// Debajo de "Tirar" y de "Tirar otra vez" (docs/prompt-gasto-recursos.md,
// feedback del usuario 2026-09-28) — mismo sitio en los dos casos, para que
// sea lo último que se lee justo antes de confirmar la tirada.
function AvisoRecurso({ texto }: { texto: string }) {
  return <p className="mt-2 font-sans text-[11px] leading-relaxed text-danger">{texto}</p>;
}

function signo(n: number) {
  return n >= 0 ? `+${n}` : `${n}`;
}

export function ControlCondicion({
  condicion,
  estado,
  onCambiar,
}: {
  condicion: CondicionTirada;
  estado: EstadoCondiciones;
  onCambiar: (id: string, valor: string | number | boolean) => void;
}) {
  if (condicion.tipo === "toggle") {
    const activo = Boolean(estado[condicion.id]);
    return (
      <div>
        <button
          type="button"
          onClick={() => onCambiar(condicion.id, !activo)}
          aria-pressed={activo}
          className={`clip-chamfer-sm w-full border px-3 py-2 text-left font-mono text-xs uppercase active:scale-[0.99] ${
            activo ? "border-info text-info" : "border-border text-muted"
          }`}
        >
          {activo ? "✓ " : ""}
          {condicion.etiqueta}
          <span className="float-right tabular-nums">
            {signo(activo ? condicion.valorActivo : (condicion.valorInactivo ?? 0))}
          </span>
        </button>
        {activo && condicion.nota && (
          <p className="mt-1.5 font-sans text-[11px] leading-relaxed text-muted">{condicion.nota}</p>
        )}
      </div>
    );
  }

  if (condicion.tipo === "opcion") {
    const elegida = condicion.opciones.find((o) => o.id === estado[condicion.id]);
    return (
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {condicion.etiqueta}
        </p>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          {condicion.opciones.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onCambiar(condicion.id, o.id)}
              className={`clip-chamfer-sm border px-2 py-1.5 font-mono text-[11px] uppercase active:scale-[0.98] ${
                estado[condicion.id] === o.id
                  ? "border-accent text-accent"
                  : "border-border text-muted"
              }`}
            >
              {o.etiqueta}
              <span className="ml-1 tabular-nums">{signo(o.valor)}</span>
            </button>
          ))}
        </div>
        {elegida?.nota && (
          <p className="mt-1.5 font-sans text-[11px] leading-relaxed text-muted">{elegida.nota}</p>
        )}
      </div>
    );
  }

  // contador
  const n = typeof estado[condicion.id] === "number" ? (estado[condicion.id] as number) : condicion.porDefecto;
  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {condicion.etiqueta}
        </p>
        <p className="font-mono text-[10px] tabular-nums text-muted">
          {signo(n * condicion.valorPorUnidad)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onCambiar(condicion.id, Math.max(condicion.min, n - 1))}
          aria-label={`Bajar ${condicion.etiqueta}`}
          className="h-9 w-9 border border-border bg-elevated font-mono text-lg leading-none text-muted active:scale-95"
        >
          −
        </button>
        <span className="w-6 text-center font-mono text-lg tabular-nums text-foreground">{n}</span>
        <button
          type="button"
          onClick={() => onCambiar(condicion.id, Math.min(condicion.max, n + 1))}
          aria-label={`Subir ${condicion.etiqueta}`}
          className="h-9 w-9 border border-border bg-elevated font-mono text-lg leading-none text-muted active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
}

// Una línea del desglose: etiqueta a la izquierda, valor con signo a la
// derecha. Nada suma en silencio — cada número que entra en el total tiene
// aquí su fuente, para que abrir el modal sea la fuente única de la verdad
// de lo que se va a tirar.
function LineaDesglose({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 font-mono text-[11px]">
      <span className="truncate text-muted">{etiqueta}</span>
      <span className={`shrink-0 tabular-nums ${valor > 0 ? "text-info" : valor < 0 ? "text-danger" : "text-muted"}`}>
        {signo(valor)}
      </span>
    </div>
  );
}

export function AccionModal({
  titulo,
  subtitulo,
  nota,
  cabecera,
  bloqueo,
  pieResultado,
  tirada,
  recursoActual,
  modBase,
  desgloseBase,
  condiciones,
  bonosTramo,
  mods,
  ctxBase,
  dificultadInicial,
  circunstancialInicial,
  resultado,
  notaResultado,
  onTirarDanio,
  onCerrar,
  onTirar,
}: {
  titulo: string;
  subtitulo?: string;
  // Texto fijo de la propia Acción (arma.efectos/especial volcado en
  // combate.ts — "Crítico de Hemorragia (9)", "Daño grave. Pulso: alcance...",
  // etc.). Antes de 2026-09-24 solo se pintaba en la tarjeta cerrada
  // (FilaTirada, AccionesTab.tsx) — el modal nunca lo recibía, así que
  // desaparecía justo cuando más falta hace (al tirar daño). Se muestra
  // siempre que existe, en cualquier estado del modal (eligiendo, rodando,
  // con resultado) — es información de la pieza, no del resultado de la
  // tirada.
  nota?: string;
  // Controles propios de la tirada antes de las condiciones genéricas — hoy
  // solo los poderes psiónicos (nivel empleado, forma y su ficha resuelta).
  // Se oculta al tirar, como el resto de controles.
  cabecera?: ReactNode;
  // Motivo por el que no se puede tirar (poder sin fatiga suficiente): apaga
  // Tirar y "Tirar otra vez" y se muestra junto al botón.
  bloqueo?: string | null;
  // Bloque extra bajo el resultado (sobrecarga psiónica).
  pieResultado?: ReactNode;
  // Solo para el aviso de "no te llega" (avisoInsuficiente, acciones.ts) —
  // recomputado en cada render contra el `estado` en vivo del modal, así que
  // cambiar de modo o de toggle aquí dentro lo actualiza al instante, a
  // diferencia de antes (docs/prompt-gasto-recursos.md, feedback del usuario
  // 2026-09-28: el aviso vivía embebido en `nota`/`opciones[].nota`, fijado
  // al abrir el modal). `recursoActual` es una foto tomada al abrir (no
  // cambia mientras el modal sigue abierto: el gasto solo se aplica al
  // confirmar) — ausente si la tirada no gasta ningún RECURSO.
  tirada: Accion;
  recursoActual?: { actual: number; max: number };
  modBase: number;
  desgloseBase: { etiqueta: string; valor: number }[];
  condiciones: CondicionTirada[];
  bonosTramo?: BonoPorTramo[];
  // Modificadores de especie/equipo con alcance (salvaciones del traje, el
  // Sistema de Retroceso...) y lo que hace falta de esta tirada para
  // resolverlos — ver docs/modificadores-tiradas.md.
  mods: ModificadorConFuente[];
  ctxBase: Omit<ContextoAccion, "modoElegido">;
  dificultadInicial: number | null;
  circunstancialInicial: number;
  // Presente en cuanto se pulsa Tirar: el modal deja de pintar los controles
  // y pasa a mostrar el resultado in-place, sin cerrarse — corrección de UX
  // 2026-09-23 (ver ResultadoTirada.tsx). null mientras se eligen condiciones.
  resultado: Lanzamiento | null;
  // Mensaje sobre el EFECTO de esta tirada en concreto (Fabricar/Reparar:
  // "Has construido X" / "Has perdido los materiales"), no información de
  // la pieza como `nota` — por eso solo se pinta junto al resultado, nunca
  // antes de tirar, y por eso el resto de tiradas de la app no lo usan
  // (dejan el prop sin pasar, ver FabricarSeccion.tsx/ReparaFabricaModal.tsx).
  notaResultado?: string;
  onTirarDanio: () => void;
  onCerrar: () => void;
  onTirar: (args: {
    dado: number;
    dados?: [number, number]; // con ventaja, los dos d12 (dado = el mejor)
    estadoCondiciones: EstadoCondiciones;
    dificultad: number | null;
    circunstancial: number;
  }) => void;
}) {
  const [estado, setEstado] = useState<EstadoCondiciones>(() => estadoInicial(condiciones));
  const [dificultad, setDificultad] = useState(dificultadInicial);
  // Si `dificultadInicial` no coincide con ningún botón fijo (p.ej. el 3 de
  // Reparar, base 7 -4), el número ya se usa bien al tirar (se guarda en
  // `dificultad`, no aquí) pero sin esto no se veía en ningún sitio del
  // modal antes de tirar — ni botón resaltado ni campo custom relleno.
  // Corrección 2026-09-25, detectada al dar de alta la tirada de Reparar.
  const [dificultadCustom, setDificultadCustom] = useState(() =>
    dificultadInicial !== null && !DIFICULTADES.some((d) => d.valor === dificultadInicial)
      ? String(dificultadInicial)
      : "",
  );
  const [circunstancial, setCircunstancial] = useState(circunstancialInicial);
  // El dado "rueda" (número aleatorio cambiando rápido) durante RODANDO_MS,
  // luego se congela en el valor REAL (`dadoAsentado`) durante ASENTADO_MS
  // antes de que llegue el `resultado` completo del padre — ver
  // dispararTirada. Puramente táctil, igual que BotonEquipar en TiendaTab: el
  // dado ya se ha tirado de verdad en cuanto arranca (con tirarD12 aquí
  // mismo, no en el padre) — solo se retrasa cuándo se revela y cómo.
  const [rodando, setRodando] = useState(false);
  const [dadoAsentado, setDadoAsentado] = useState(false);
  // Un número por dado: dos con ventaja, cada uno girando por su lado.
  const [numerosRodando, setNumerosRodando] = useState<number[]>([1]);
  // Índice del dado que vale una vez asentado (con ventaja, el mejor).
  const [indiceMejor, setIndiceMejor] = useState(0);

  useEffect(() => {
    if (!rodando || dadoAsentado) return;
    const id = setInterval(
      () => setNumerosRodando((ns) => ns.map(() => 1 + Math.floor(Math.random() * CARAS_DADO))),
      RODANDO_INTERVALO_MS,
    );
    return () => clearInterval(id);
  }, [rodando, dadoAsentado]);

  const cambiar = (id: string, valor: string | number | boolean) =>
    setEstado((e) => ({ ...e, [id]: valor }));

  const dispararTirada = () => {
    const { dado, dados } = tirarDado(Boolean(tirada.ventaja));
    const reales = dados ?? [dado];
    setNumerosRodando(reales.map(() => 1));
    setRodando(true);
    setDadoAsentado(false);
    setTimeout(() => {
      setNumerosRodando(reales);
      setIndiceMejor(reales.indexOf(dado));
      setDadoAsentado(true);
      setTimeout(() => {
        onTirar({ dado, dados, estadoCondiciones: estado, dificultad, circunstancial });
        setRodando(false);
        setDadoAsentado(false);
      }, ASENTADO_MS);
    }, RODANDO_MS);
  };

  const totalCondiciones = valorCondiciones(condiciones, estado);
  const totalBonosTramo = valorBonosTramo(bonosTramo ?? [], estado);
  const ctx: ContextoAccion = { ...ctxBase, modoElegido: modoElegido(condiciones, estado) };
  const totalAlcance = bonoAlcance(mods, ctx);
  const totalPrevisto = modBase + totalCondiciones + totalBonosTramo + totalAlcance + circunstancial;
  // Textos de las opciones activas (Visor Nocturno y demás "texto
  // informativo" del §8) — `estado` no cambia entre elegir y ver el
  // resultado, así que esto sigue siendo válido en la pantalla final sin
  // necesidad de guardarlo aparte.
  const notas = notasCondiciones(condiciones, estado);
  // Mismo cálculo de modoId que tirar() (AccionesTab.tsx): el id de
  // `estado.modo` si hay selector, si no el único modo de `ataque.modos`.
  // Reactivo a `estado` — cambiar de modo aquí recalcula el aviso al
  // instante (ver comentario de `tirada`/`recursoActual` arriba de los props).
  const modoId = tirada.ataque
    ? typeof estado.modo === "string"
      ? estado.modo
      : tirada.ataque.modos[0].id
    : null;
  const avisoRecurso = avisoInsuficiente(tirada, modoId, estado, recursoActual);

  // Bloqueado mientras rueda el dado: 650ms es corto, mejor no dejar que un
  // tap accidental en el fondo o la ✕ corte la animación a medias — el dado
  // ya se ha tirado de verdad en cuanto arranca (ver dispararTirada).
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={rodando ? undefined : onCerrar}
    >
      <HudCard
        className="max-h-[85vh] w-full max-w-md overflow-y-auto p-4 sm:mx-4"
        // Evita que un tap dentro de la tarjeta cierre el modal por el
        // listener del fondo.
      >
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold uppercase leading-tight">
                {titulo}
              </h2>
              {subtitulo && (
                <p className="mt-0.5 font-mono text-[10px] uppercase text-muted">{subtitulo}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onCerrar}
              disabled={rodando}
              aria-label="Cerrar"
              className="shrink-0 border border-border px-2 py-1 font-mono text-xs text-muted active:scale-95 disabled:opacity-40"
            >
              ✕
            </button>
          </div>

          {nota && (
            <p className="mt-2 font-sans text-[11px] leading-relaxed text-muted">{nota}</p>
          )}

          {!resultado && !rodando && cabecera}

          {rodando && (
            <div className="mt-4 border-t border-border pt-3">
              <p
                className={`font-mono text-[11px] uppercase tracking-widest ${
                  dadoAsentado ? "text-accent" : "text-info"
                }`}
              >
                {dadoAsentado ? "// tirada" : "// tirando"}
                {!dadoAsentado && <span className="animate-pulse">_</span>}
              </p>
              <div className={`mt-2 grid gap-4 ${numerosRodando.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
                {numerosRodando.map((n, i) => {
                  const descartado = dadoAsentado && numerosRodando.length === 2 && i !== indiceMejor;
                  return (
                    <div key={i}>
                      <div className="flex items-baseline gap-3">
                        <span
                          className={`font-display text-5xl font-bold tabular-nums ${
                            descartado ? "text-muted line-through" : dadoAsentado ? "text-accent" : "text-info"
                          }`}
                        >
                          {n}
                        </span>
                        <span className="font-mono text-xs text-muted">
                          d{CARAS_DADO}
                          {dadoAsentado && numerosRodando.length === 2 && (descartado ? " · descartado" : " · vale")}
                        </span>
                      </div>
                      <BarraProgreso ms={RODANDO_MS} />
                    </div>
                  );
                })}
              </div>
              {tirada.ventaja && (
                <p className="mt-2 font-mono text-[11px] uppercase text-muted">
                  Ventaja ({tirada.ventaja}): 2d{CARAS_DADO}, te quedas el mejor
                </p>
              )}
            </div>
          )}

          {resultado && !rodando && (
            <div className="mt-4 border-t border-border pt-3">
              <ContenidoResultado resultado={resultado} onTirarDanio={onTirarDanio} />
              {pieResultado}
              {notaResultado && (
                <p className="mt-3 border-l-2 border-accent pl-2 font-sans text-[12px] font-semibold leading-relaxed text-accent">
                  {notaResultado}
                </p>
              )}
              {notas.length > 0 && (
                <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                  {notas.map((n, i) => (
                    <div key={i}>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-info">
                        {n.etiqueta}
                      </p>
                      <p className="mt-0.5 border-l-2 border-info pl-2 font-sans text-[12px] leading-relaxed text-foreground">
                        {n.nota}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onCerrar}
                  className="clip-chamfer-sm border border-border py-3 font-display text-sm font-semibold uppercase tracking-wide text-muted active:scale-[0.98]"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={dispararTirada}
                  disabled={Boolean(bloqueo)}
                  className="clip-chamfer-sm border border-accent bg-accent py-3 font-display text-sm font-semibold uppercase tracking-wide text-black active:scale-[0.98] disabled:border-border disabled:bg-elevated disabled:text-muted"
                >
                  Tirar otra vez
                </button>
              </div>
              {avisoRecurso && <AvisoRecurso texto={avisoRecurso} />}
              {bloqueo && <AvisoRecurso texto={bloqueo} />}
            </div>
          )}

          {!resultado && !rodando && condiciones.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {"// Activaciones"}
              </p>
              {condiciones.map((c) => (
                <ControlCondicion key={c.id} condicion={c} estado={estado} onCambiar={cambiar} />
              ))}
            </div>
          )}

          {!resultado && !rodando && (
            <div className="mt-4 border-t border-border pt-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {"// Dificultad"}
              </p>
              <div className="mt-2 grid grid-cols-4 gap-1">
                {DIFICULTADES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setDificultad(d.valor);
                      setDificultadCustom("");
                    }}
                    className={`clip-chamfer-sm border px-1 py-1.5 font-mono text-[10px] uppercase active:scale-95 ${
                      dificultad === d.valor && dificultadCustom === ""
                        ? "border-accent text-accent"
                        : "border-border text-muted"
                    }`}
                  >
                    {d.label}
                    <span className="block tabular-nums">{d.valor}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setDificultad(null);
                    setDificultadCustom("");
                  }}
                  className={`clip-chamfer-sm border px-1 py-1.5 font-mono text-[10px] uppercase active:scale-95 ${
                    dificultad === null
                      ? "border-accent text-accent"
                      : "border-border text-muted"
                  }`}
                >
                  sin dificultad
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="custom"
                  value={dificultadCustom}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDificultadCustom(v);
                    setDificultad(v === "" ? null : Number(v));
                  }}
                  className="clip-chamfer-sm border border-border bg-elevated px-1 py-1.5 text-center font-mono text-[10px] uppercase text-foreground placeholder:text-muted"
                />
              </div>
            </div>
          )}

          {!resultado && !rodando && (
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  {"// Modificador circunstancial"}
                </p>
                <p className="font-sans text-[11px] text-muted">Heridas, fatiga, cobertura…</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCircunstancial((v) => Math.max(-10, v - 1))}
                  aria-label="Bajar modificador"
                  className="h-9 w-9 border border-border bg-elevated font-mono text-lg leading-none text-muted active:scale-95"
                >
                  −
                </button>
                <span
                  className={`w-10 text-center font-mono text-xl tabular-nums ${
                    circunstancial === 0 ? "text-muted" : circunstancial > 0 ? "text-info" : "text-danger"
                  }`}
                >
                  {signo(circunstancial)}
                </span>
                <button
                  type="button"
                  onClick={() => setCircunstancial((v) => Math.min(10, v + 1))}
                  aria-label="Subir modificador"
                  className="h-9 w-9 border border-border bg-elevated font-mono text-lg leading-none text-muted active:scale-95"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {!resultado && !rodando && (
            <div className="mt-4 flex flex-col gap-1 border-t border-border pt-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {"// Desglose"}
              </p>
              {desgloseBase.map((f, i) => (
                <LineaDesglose key={`base-${i}`} etiqueta={f.etiqueta} valor={f.valor} />
              ))}
              {desgloseAlcance(mods, ctx).map((f, i) => (
                <LineaDesglose key={`alcance-${i}`} etiqueta={f.etiqueta} valor={f.valor} />
              ))}
              {desgloseCondiciones(condiciones, estado).map((f, i) => (
                <LineaDesglose key={`cond-${i}`} etiqueta={f.etiqueta} valor={f.valor} />
              ))}
              {desgloseBonosTramo(bonosTramo ?? [], estado).map((f, i) => (
                <LineaDesglose key={`tramo-${i}`} etiqueta={f.etiqueta} valor={f.valor} />
              ))}
              {circunstancial !== 0 && (
                <LineaDesglose etiqueta="Modificador circunstancial" valor={circunstancial} />
              )}
              <div className="mt-1 flex items-baseline justify-between border-t border-border pt-1.5">
                <span className="font-mono text-xs uppercase text-foreground">Total</span>
                <span className="font-mono text-lg font-bold tabular-nums text-accent">
                  {signo(totalPrevisto)}
                </span>
              </div>
            </div>
          )}

          {!resultado && !rodando && tirada.ventaja && (
            <p className="mt-3 border-l-2 border-info pl-2 font-mono text-[11px] uppercase text-info">
              Ventaja ({tirada.ventaja}): tiras 2d{CARAS_DADO} y te quedas el mejor
            </p>
          )}

          {!resultado && !rodando && (
            <button
              type="button"
              onClick={dispararTirada}
              disabled={Boolean(bloqueo)}
              className="clip-chamfer-sm mt-3 w-full border border-accent bg-accent py-3 font-display text-sm font-semibold uppercase tracking-wide text-black active:scale-[0.98] disabled:border-border disabled:bg-elevated disabled:text-muted"
            >
              Tirar ({signo(totalPrevisto)})
            </button>
          )}
          {!resultado && !rodando && avisoRecurso && <AvisoRecurso texto={avisoRecurso} />}
          {!resultado && !rodando && bloqueo && <AvisoRecurso texto={bloqueo} />}
        </div>
      </HudCard>
    </div>
  );
}
