"use client";

import { useEffect, useState } from "react";
import {
  DIFICULTADES,
  CARAS_DADO,
  tirarD12,
  estadoInicial,
  valorCondiciones,
  desgloseCondiciones,
  valorBonosTramo,
  desgloseBonosTramo,
  modoElegido,
  bonoAlcance,
  desgloseAlcance,
  type CondicionTirada,
  type EstadoCondiciones,
  type BonoPorTramo,
  type ModificadorConFuente,
  type ContextoTirada,
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
const ASENTADO_MS = 500;

function signo(n: number) {
  return n >= 0 ? `+${n}` : `${n}`;
}

function ControlCondicion({
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

export function TiradaModal({
  titulo,
  subtitulo,
  modBase,
  desgloseBase,
  condiciones,
  bonosTramo,
  mods,
  ctxBase,
  dificultadInicial,
  circunstancialInicial,
  resultado,
  onTirarDanio,
  onCerrar,
  onTirar,
}: {
  titulo: string;
  subtitulo?: string;
  modBase: number;
  desgloseBase: { etiqueta: string; valor: number }[];
  condiciones: CondicionTirada[];
  bonosTramo?: BonoPorTramo[];
  // Modificadores de especie/equipo con alcance (salvaciones del traje, el
  // Sistema de Retroceso...) y lo que hace falta de esta tirada para
  // resolverlos — ver docs/modificadores-tiradas.md.
  mods: ModificadorConFuente[];
  ctxBase: Omit<ContextoTirada, "modoElegido">;
  dificultadInicial: number | null;
  circunstancialInicial: number;
  // Presente en cuanto se pulsa Tirar: el modal deja de pintar los controles
  // y pasa a mostrar el resultado in-place, sin cerrarse — corrección de UX
  // 2026-09-23 (ver ResultadoTirada.tsx). null mientras se eligen condiciones.
  resultado: Lanzamiento | null;
  onTirarDanio: () => void;
  onCerrar: () => void;
  onTirar: (args: {
    dado: number;
    estadoCondiciones: EstadoCondiciones;
    dificultad: number | null;
    circunstancial: number;
  }) => void;
}) {
  const [estado, setEstado] = useState<EstadoCondiciones>(() => estadoInicial(condiciones));
  const [dificultad, setDificultad] = useState(dificultadInicial);
  const [dificultadCustom, setDificultadCustom] = useState("");
  const [circunstancial, setCircunstancial] = useState(circunstancialInicial);
  // El dado "rueda" (número aleatorio cambiando rápido) durante RODANDO_MS,
  // luego se congela en el valor REAL (`dadoAsentado`) durante ASENTADO_MS
  // antes de que llegue el `resultado` completo del padre — ver
  // dispararTirada. Puramente táctil, igual que BotonEquipar en TiendaTab: el
  // dado ya se ha tirado de verdad en cuanto arranca (con tirarD12 aquí
  // mismo, no en el padre) — solo se retrasa cuándo se revela y cómo.
  const [rodando, setRodando] = useState(false);
  const [dadoAsentado, setDadoAsentado] = useState(false);
  const [numeroRodando, setNumeroRodando] = useState(1);

  useEffect(() => {
    if (!rodando || dadoAsentado) return;
    const id = setInterval(
      () => setNumeroRodando(1 + Math.floor(Math.random() * CARAS_DADO)),
      RODANDO_INTERVALO_MS,
    );
    return () => clearInterval(id);
  }, [rodando, dadoAsentado]);

  const cambiar = (id: string, valor: string | number | boolean) =>
    setEstado((e) => ({ ...e, [id]: valor }));

  const dispararTirada = () => {
    const dado = tirarD12();
    setRodando(true);
    setDadoAsentado(false);
    setTimeout(() => {
      setNumeroRodando(dado);
      setDadoAsentado(true);
      setTimeout(() => {
        onTirar({ dado, estadoCondiciones: estado, dificultad, circunstancial });
        setRodando(false);
        setDadoAsentado(false);
      }, ASENTADO_MS);
    }, RODANDO_MS);
  };

  const totalCondiciones = valorCondiciones(condiciones, estado);
  const totalBonosTramo = valorBonosTramo(bonosTramo ?? [], estado);
  const ctx: ContextoTirada = { ...ctxBase, modoElegido: modoElegido(condiciones, estado) };
  const totalAlcance = bonoAlcance(mods, ctx);
  const totalPrevisto = modBase + totalCondiciones + totalBonosTramo + totalAlcance + circunstancial;

  // Bloqueado mientras rueda el dado: 650ms es corto, mejor no dejar que un
  // tap accidental en el fondo o la ✕ corte la animación a medias — el dado
  // ya se ha tirado de verdad en cuanto arranca (ver dispararTirada).
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
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
              <h2 className="truncate font-display text-lg font-semibold uppercase leading-tight">
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
              <div className="mt-2 flex items-baseline gap-3">
                <span
                  className={`font-display text-5xl font-bold tabular-nums ${
                    dadoAsentado ? "text-accent" : "text-info"
                  }`}
                >
                  {numeroRodando}
                </span>
                <span className="font-mono text-xs text-muted">d{CARAS_DADO}</span>
              </div>
              <BarraProgreso ms={RODANDO_MS} />
            </div>
          )}

          {resultado && (
            <div className="mt-4 border-t border-border pt-3">
              <ContenidoResultado resultado={resultado} onTirarDanio={onTirarDanio} />
              <button
                type="button"
                onClick={onCerrar}
                className="clip-chamfer-sm mt-3 w-full border border-accent bg-accent py-3 font-display text-sm font-semibold uppercase tracking-wide text-black active:scale-[0.98]"
              >
                Cerrar
              </button>
            </div>
          )}

          {!resultado && !rodando && condiciones.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-3">
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

          {!resultado && !rodando && (
            <button
              type="button"
              onClick={dispararTirada}
              className="clip-chamfer-sm mt-3 w-full border border-accent bg-accent py-3 font-display text-sm font-semibold uppercase tracking-wide text-black active:scale-[0.98]"
            >
              Tirar ({signo(totalPrevisto)})
            </button>
          )}
        </div>
      </HudCard>
    </div>
  );
}
