"use client";

import { useState } from "react";
import {
  CATEGORIAS_DANIO,
  ETIQUETA_DANIO,
  casillaBlindajeBrazo,
  casillaBlindajeReactivo,
  golpeAlEscudo,
  pulsarTipoDanio,
  resolverGolpe,
  textoDelGolpe,
  tirarD12,
  tirarSalvacionAlRecibir,
  TIPOS_DANIO,
  type CategoriaDanio,
  type FichaResuelta,
  type GolpeAplicado,
  type GolpeRecibido,
  type GolpeResuelto,
  type Resultado,
  type SalvacionAlRecibir,
  type TipoDanio,
  type TipoElegido,
} from "@/lib/rules";
import { Modal } from "@/components/Modal";
import type { Lanzamiento } from "@/components/ResultadoTirada";

function signo(n: number) {
  return n >= 0 ? `+${n}` : `${n}`;
}

// Una línea del desglose de blindaje — mismo criterio que LineaDesglose en
// AccionModal.tsx ("nada suma en silencio"), componente propio en vez de
// compartido porque este modal no tira dado y no comparte el resto de esa
// forma (dificultad, condiciones...).
function LineaBlindaje({ etiqueta, valor, nota }: { etiqueta: string; valor: number; nota?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 font-mono text-[11px]">
        <span className="truncate text-muted">{etiqueta}</span>
        <span className={`shrink-0 tabular-nums ${valor > 0 ? "text-info" : "text-muted"}`}>
          {signo(valor)}
        </span>
      </div>
      {nota && <p className="font-sans text-prosa-sm text-soft">{nota}</p>}
    </div>
  );
}

function Casilla({
  marcada,
  etiqueta,
  disabled,
  onClick,
}: {
  marcada: boolean;
  etiqueta: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={marcada}
      disabled={disabled}
      className={`clip-chamfer-sm w-full border px-3 py-2 text-left font-mono text-xs uppercase active:scale-[0.99] disabled:opacity-50 disabled:active:scale-100 ${
        marcada ? "border-info text-info" : "border-border text-muted"
      }`}
    >
      {marcada ? "✓ " : ""}
      {etiqueta}
    </button>
  );
}

// La salvación que dispara el golpe al recibirlo (Falla metabólica), con el patrón del panel del
// peaje neurológico (PeajePanel): la tira la app; el estado lo pone el máster.
function SalvacionPanel({
  salvacion,
  resultado,
  onTirar,
}: {
  salvacion: SalvacionAlRecibir;
  resultado: Resultado | null;
  onTirar: (id: number) => void;
}) {
  return (
    <div className="mt-3 border-2 border-danger p-3">
      <p className="font-display text-sm font-semibold uppercase text-danger">
        {salvacion.etiqueta} · Fortaleza, dificultad {salvacion.dificultad}
      </p>
      <p className="font-mono text-[10px] uppercase text-muted">{salvacion.fuente}</p>
      {resultado ? (
        <p className="mt-2 font-mono text-[11px] uppercase text-foreground">
          Fortaleza: {resultado.total} vs {salvacion.dificultad} ·{" "}
          {resultado.exito ? (resultado.critico ? "éxito crítico" : "éxito") : resultado.critico ? "fracaso crítico" : "fracaso"}
          {!resultado.exito && <span className="block normal-case text-danger">{salvacion.fracaso}</span>}
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

// Lo que devuelve aplicar un golpe: lo aplicado de verdad (para enseñarlo) y cómo deshacerlo
// (devuelve el error, o null si fue bien).
export type ResultadoRecibir =
  | { ok: true; aplicado: GolpeAplicado; deshacer: () => Promise<string | null> }
  | { ok: false; error: string };

// "Resistir daño" (antes "Bloquear daño"; T2 del barrido del cuestionario, 2026-11-13): la
// puerta del daño. Eliges tipo de daño y cuánto recibes, y el motor (resolverGolpe,
// rules/resistirDanio.ts) dice cuánto para el blindaje, qué suman las casillas que te tocan
// (Tensión ósea, Malla Plasmática, blindaje roto), con qué categoría entra y qué notas aplican
// (Saber Caer). «Recibir» lo aplica con `onRecibirDanio`: la ficha del jugador (su vida o, en
// combate, la de su foto, y el blindaje perdido) o el NPC del combate en vivo (su vida). Una vez
// aplicado, los controles se bloquean hasta «Otro golpe», y «Deshacer» lo devuelve: así no se
// aplica dos veces con los mismos números. Sin `onRecibirDanio` (editor de NPC), solo números.
//
// Lo único que escribe además es la fatiga de la casilla de blindaje reactivo (Densificar del
// Enjambre 3+, A4b): se cobra al marcarla y se devuelve al desmarcarla sin cerrar; qué vale y
// cuándo lo dice casillaBlindajeReactivo (blindaje.ts). Sin onPagarFatiga (combate en vivo) la
// casilla suma igual y la fatiga se cobra a mano. "Bloqueado con el brazo biónico" (A6a, Brazo
// de nivel 2+): sin coste, suma el blindaje del brazo a este golpe (casillaBlindajeBrazo).
//
// "¿A qué da el golpe?" (Murillo, 2026-10-23): si el ataque supera la defensa pero falla por
// la cobertura, golpea la cobertura. "Al escudo" lo resuelve golpeAlEscudo (blindaje.ts): el
// escudo resta su blindaje y el resto va a su durabilidad. Con onDaniarEscudo (la ficha del
// jugador) un botón la resta del recurso; sin él (NPC, combate en vivo), solo los números.
type Destino = "portador" | "escudo" | "cobertura";

export function ResistirDanioModal({
  ficha,
  onPagarFatiga,
  onAjustarFatiga,
  onDaniarEscudo,
  onRecibirDanio,
  onLanzamiento,
  onCerrar,
}: {
  ficha: FichaResuelta;
  onPagarFatiga?: (coste: number, permiteTemporal: boolean) => void;
  onAjustarFatiga?: (delta: number) => void;
  onDaniarEscudo?: (instanciaId: string, delta: number) => void;
  onRecibirDanio?: (golpe: GolpeRecibido) => Promise<ResultadoRecibir>;
  // La salvación tirada (Falla metabólica), al historial de Acciones.
  onLanzamiento?: (l: Lanzamiento) => void;
  onCerrar: () => void;
}) {
  // Cada pulsación en un tipo avanza: normal → crítico (solo los que cambian) → sin elegir
  // (pulsarTipoDanio). Sin tipo elegido no se calcula nada ni se puede recibir.
  const [elegido, setElegido] = useState<TipoElegido>({ tipo: "cinetico", critico: false });
  const tipo: TipoDanio = elegido?.tipo ?? "cinetico";
  const [destinoElegido, setDestino] = useState<Destino>("portador");
  const [danioRecibido, setDanioRecibidoEstado] = useState(0);
  const [reactivo, setReactivo] = useState(false);
  const [conBrazo, setConBrazo] = useState(false);
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [rompe, setRompe] = useState(0);
  const [categoriaElegida, setCategoria] = useState<CategoriaDanio | null>(null);
  // Lo que se restó al pulsar el botón, para no restarlo dos veces con los mismos números.
  const [escudoAplicado, setEscudoAplicado] = useState<{ recibe: number; de: number; a: number } | null>(null);
  // El golpe ya recibido: lo aplicado, cómo deshacerlo y las salvaciones que disparó (con lo
  // tirado). Mientras está, los controles no se tocan.
  const [recibido, setRecibido] = useState<{
    texto: string;
    aplicado: GolpeAplicado;
    rompePedido: number;
    deshacer: () => Promise<string | null>;
    salvaciones: SalvacionAlRecibir[];
    resuelto: GolpeResuelto;
  } | null>(null);
  // Lo tirado en cada salvación (Falla metabólica), por id.
  const [tiradas, setTiradas] = useState<Record<string, Resultado>>({});
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const golpe = golpeAlEscudo(ficha.ficha, tipo, danioRecibido);
  // Roto o daño mental: "Al escudo" no se puede elegir, y si estaba elegido vuelve a "A ti"
  // (salvo que se acabe de romper con el botón: se queda mostrando lo que pasó).
  const destino: Destino =
    destinoElegido === "escudo" && !escudoAplicado && (!golpe || golpe.bloqueada) ? "portador" : destinoElegido;
  // Tras restar, la ficha ya trae la durabilidad nueva: se enseña la foto de lo restado.
  const durabilidad =
    escudoAplicado ?? (golpe && { recibe: golpe.aDurabilidad, de: golpe.durabilidadActual, a: golpe.durabilidadResultante });
  const seRompe = escudoAplicado ? escudoAplicado.a === 0 && escudoAplicado.de > 0 : Boolean(golpe?.seRompe);
  const casilla = casillaBlindajeReactivo(ficha.ficha, tipo, reactivo, ficha.fatigaEnJuego.actual);
  const casillaBrazo = casillaBlindajeBrazo(ficha.ficha, tipo);
  const enVivo = resolverGolpe(ficha, {
    tipo,
    critico: elegido?.critico ?? false,
    danio: danioRecibido,
    reactivo,
    conBrazo,
    marcadas,
    rompeBlindaje: rompe,
    categoria: categoriaElegida,
  });
  // Recibido el golpe, se enseña tal como se aplicó: la ficha ya trae el blindaje perdido y la
  // cuenta en vivo diría otra cosa.
  const r = recibido?.resuelto ?? enVivo;
  const bloqueado = recibido !== null || enCurso;

  const setDanioRecibido = (f: (v: number) => number) => {
    setDanioRecibidoEstado(f);
    setEscudoAplicado(null);
  };

  // Las casillas de blindaje son del portador: fuera de "A ti" se desmarcan (Densificar
  // devuelve su fatiga).
  const elegirDestino = (d: Destino) => {
    if (d === destino) return;
    if (d !== "portador") {
      if (reactivo && casilla) onAjustarFatiga?.(casilla.costeFatiga);
      setReactivo(false);
      setConBrazo(false);
    }
    setEscudoAplicado(null);
    setDestino(d);
  };

  const daniarEscudo = () => {
    if (!golpe || golpe.bloqueada || golpe.aDurabilidad === 0 || !onDaniarEscudo) return;
    onDaniarEscudo(golpe.instanciaId, -golpe.aDurabilidad);
    setEscudoAplicado({ recibe: golpe.aDurabilidad, de: golpe.durabilidadActual, a: golpe.durabilidadResultante });
  };

  const marcarReactivo = () => {
    if (!casilla) return;
    if (reactivo) {
      onAjustarFatiga?.(casilla.costeFatiga);
      setReactivo(false);
    } else if (!casilla.bloqueada) {
      onPagarFatiga?.(casilla.costeFatiga, false);
      setReactivo(true);
    }
  };

  const alternar = (id: string) => setMarcadas((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));

  // Cambiar a un tipo en el que no vale (Mental, Fuego) la desmarca y devuelve la fatiga.
  const elegirTipo = (t: TipoDanio) => {
    const siguiente = pulsarTipoDanio(elegido, t);
    const otra = siguiente && casillaBlindajeReactivo(ficha.ficha, siguiente.tipo, reactivo, ficha.fatigaEnJuego.actual);
    // Sin tipo, o uno en el que no vale (Mental, Fuego): Densificar se desmarca y devuelve la fatiga.
    if (reactivo && (!siguiente || otra?.bloqueada)) {
      if (casilla) onAjustarFatiga?.(casilla.costeFatiga);
      setReactivo(false);
    }
    if (!siguiente || casillaBlindajeBrazo(ficha.ficha, siguiente.tipo)?.bloqueada) setConBrazo(false);
    setEscudoAplicado(null);
    setElegido(siguiente);
  };

  const recibir = async () => {
    if (!onRecibirDanio || !r.golpe || bloqueado) return;
    setEnCurso(true);
    setError(null);
    const res = await onRecibirDanio(r.golpe);
    setEnCurso(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setRecibido({
      texto: textoDelGolpe(r.golpe),
      aplicado: res.aplicado,
      rompePedido: r.golpe.rompeBlindaje,
      deshacer: res.deshacer,
      salvaciones: r.salvaciones,
      resuelto: r,
    });
    setTiradas({});
  };

  const deshacer = async () => {
    if (!recibido) return;
    setEnCurso(true);
    setError(null);
    const fallo = await recibido.deshacer();
    setEnCurso(false);
    if (fallo) setError(fallo);
    else {
      setRecibido(null);
      setTiradas({});
    }
  };

  // Nuevo golpe: los números a cero, el tipo se queda (suelen repetirse).
  const otroGolpe = () => {
    if (reactivo && casilla) onAjustarFatiga?.(casilla.costeFatiga);
    setRecibido(null);
    setTiradas({});
    setError(null);
    setDanioRecibidoEstado(0);
    setReactivo(false);
    setConBrazo(false);
    setMarcadas([]);
    setRompe(0);
  };

  const tirarSalvacion = (s: SalvacionAlRecibir, id: number) => {
    if (tiradas[s.id]) return;
    const resultado = tirarSalvacionAlRecibir(ficha, s, tirarD12());
    onLanzamiento?.({ ...resultado, id, label: `${s.etiqueta}: salvación de Fortaleza` });
    setTiradas((t) => ({ ...t, [s.id]: resultado }));
  };

  // Las que dispara el golpe recibido; sin «Recibir» (editor de NPC), en cuanto el golpe entra.
  const salvaciones = recibido ? recibido.salvaciones : onRecibirDanio ? [] : r.salvaciones;

  return (
    <Modal titulo="Resistir daño" onCerrar={onCerrar}>
      <p className="mt-2 font-sans text-prosa-sm text-soft">
        El daño que te dice el máster: elige el tipo y cuánto recibes. El desglose explica de dónde
        sale cada punto de blindaje{onRecibirDanio ? " y «Recibir» te resta lo que entra" : ""}.
      </p>

      <fieldset disabled={bloqueado} className="contents">
        <div className="mt-4 border-t border-border pt-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{"// Tipo de daño"}</p>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            {TIPOS_DANIO.map((t) => {
              const activo = elegido?.tipo === t.id;
              const critico = activo && elegido.critico;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => elegirTipo(t.id)}
                  aria-pressed={activo}
                  className={`clip-chamfer-sm touch-manipulation border px-2 py-1.5 font-mono text-[11px] uppercase active:scale-95 disabled:opacity-60 ${
                    critico
                      ? "border-danger bg-danger/15 text-danger"
                      : activo
                        ? "border-accent text-accent"
                        : "border-border text-muted"
                  }`}
                >
                  {t.label}
                  {critico && " · crítico"}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 font-mono text-[10px] text-muted">
            Otra pulsación: crítico (eléctrico, frío y sónico) y luego sin tipo.
          </p>
        </div>

        {elegido && (
          <>

        <div className="mt-4 border-t border-border pt-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{"// ¿A qué da el golpe?"}</p>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            {(
              [
                { id: "portador", label: "A ti", disabled: false },
                ...(golpe ? [{ id: "escudo", label: "Al escudo", disabled: Boolean(golpe.bloqueada) }] : []),
                { id: "cobertura", label: "A la cobertura", disabled: false },
              ] as { id: Destino; label: string; disabled: boolean }[]
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => elegirDestino(o.id)}
                disabled={o.disabled}
                aria-pressed={destino === o.id}
                className={`clip-chamfer-sm min-h-11 border px-2 py-1.5 font-mono text-[11px] uppercase active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${
                  destino === o.id ? "border-accent text-accent" : "border-border text-muted"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {golpe?.bloqueada && <p className="mt-1.5 font-mono text-[11px] text-danger">{golpe.bloqueada}</p>}
        </div>

        {destino === "portador" && r.eligeCategoria && (
          <div className="mt-4 border-t border-border pt-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{"// Categoría (la del arma)"}</p>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {CATEGORIAS_DANIO.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoria(c)}
                  aria-pressed={r.categoria === c}
                  className={`clip-chamfer-sm min-h-11 border px-2 py-1.5 font-mono text-[11px] uppercase active:scale-95 disabled:opacity-60 ${
                    r.categoria === c ? "border-accent text-accent" : "border-border text-muted"
                  }`}
                >
                  {ETIQUETA_DANIO[c]}
                </button>
              ))}
            </div>
          </div>
        )}

        {destino === "portador" && casillaBrazo && (
          <div className="mt-4 border-t border-border pt-3">
            <Casilla
              marcada={conBrazo}
              etiqueta={casillaBrazo.etiqueta}
              disabled={!conBrazo && Boolean(casillaBrazo.bloqueada)}
              onClick={() => setConBrazo((v) => !v)}
            />
            {casillaBrazo.bloqueada && !conBrazo && (
              <p className="mt-1.5 font-mono text-[11px] text-danger">{casillaBrazo.bloqueada}</p>
            )}
            <p className="mt-1.5 font-sans text-prosa-sm text-soft">
              +{casillaBrazo.valor} de blindaje. {casillaBrazo.nota}
            </p>
          </div>
        )}

        {destino === "portador" && casilla && (
          <div className="mt-4 border-t border-border pt-3">
            <Casilla
              marcada={reactivo}
              etiqueta={casilla.etiqueta}
              disabled={!reactivo && Boolean(casilla.bloqueada)}
              onClick={marcarReactivo}
            />
            {casilla.bloqueada && !reactivo && (
              <p className="mt-1.5 font-mono text-[11px] text-danger">{casilla.bloqueada}</p>
            )}
            <p className="mt-1.5 font-sans text-prosa-sm text-soft">
              +{casilla.valor} de blindaje. {casilla.nota}
              {reactivo ? " Desmarcarla te devuelve la fatiga." : ""}
              {!onPagarFatiga ? " Cóbrate la fatiga a mano." : ""}
            </p>
          </div>
        )}

        {destino === "portador" &&
          r.casillas.map((c) => (
            <div key={c.id} className="mt-4 border-t border-border pt-3">
              <Casilla
                marcada={marcadas.includes(c.id) && !c.bloqueada}
                etiqueta={c.etiqueta}
                disabled={Boolean(c.bloqueada)}
                onClick={() => alternar(c.id)}
              />
              {c.bloqueada && <p className="mt-1.5 font-mono text-[11px] text-danger">{c.bloqueada}</p>}
              <p className="mt-1.5 font-sans text-prosa-sm text-soft">
                {c.nota} <span className="text-info">· {c.fuente}</span>
              </p>
            </div>
          ))}

        {destino === "portador" && r.rompeBlindaje && (
          <div className="mt-4 border-t border-border pt-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{"// Este golpe rompe blindaje"}</p>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {[0, 1, 2].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRompe(n)}
                  disabled={n > r.rompeBlindaje!.max}
                  aria-pressed={r.rompeBlindaje!.elegido === n}
                  className={`clip-chamfer-sm min-h-11 border px-2 py-1.5 font-mono text-[11px] uppercase active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${
                    r.rompeBlindaje!.elegido === n ? "border-accent text-accent" : "border-border text-muted"
                  }`}
                >
                  {n === 0 ? "No" : `−${n}`}
                </button>
              ))}
            </div>
            <p className="mt-1.5 font-sans text-prosa-sm text-soft">
              Crítico de Munición Perforante o del Proyector de Pulso 4 (−1), Impacto Estructural de
              Kerzul (−1; −2 a dos manos): se pierde para siempre de tu {r.rompeBlindaje.armadura}, hasta
              que la repares.
            </p>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {"// Daño recibido"}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDanioRecibido((v) => Math.max(0, v - 1))}
              aria-label="Bajar daño recibido"
              className="h-9 w-9 border border-border bg-elevated font-mono text-lg leading-none text-muted active:scale-95"
            >
              −
            </button>
            <span className="w-8 text-center font-mono text-lg tabular-nums text-foreground">
              {danioRecibido}
            </span>
            <button
              type="button"
              onClick={() => setDanioRecibido((v) => Math.min(50, v + 1))}
              aria-label="Subir daño recibido"
              className="h-9 w-9 border border-border bg-elevated font-mono text-lg leading-none text-muted active:scale-95"
            >
              +
            </button>
          </div>
        </div>
          </>
        )}
      </fieldset>

      {!elegido && <p className="mt-4 border-t border-border pt-3 font-mono text-[11px] text-muted">Elige el tipo de daño.</p>}

      {elegido && destino === "portador" && (
        <>
          {r.notas.length > 0 && (
            <div className="mt-4 flex flex-col gap-1 border-t border-border pt-3">
              {r.notas.map((n) => (
                <p key={n} className="font-sans text-prosa-sm text-soft">
                  {n}
                </p>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-col gap-1 border-t border-border pt-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{"// Desglose"}</p>
            {r.desglose.map((l, i) => (
              <LineaBlindaje key={i} etiqueta={l.etiqueta} valor={l.valor} nota={l.nota} />
            ))}
            <div className="mt-1 flex items-baseline justify-between border-t border-border pt-1.5">
              <span className="font-mono text-xs uppercase text-foreground">Blindaje</span>
              <span className="font-mono text-lg font-bold tabular-nums text-info">{signo(r.blindaje)}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="font-mono text-xs uppercase text-foreground">Pasa</span>
            <span className="font-mono text-lg font-bold tabular-nums text-foreground">{r.pasa}</span>
          </div>
          {r.extras.map((x) => (
            <div key={x.etiqueta} className="flex items-baseline justify-between gap-3 font-mono text-[11px]">
              <span className="truncate text-muted">{x.etiqueta}</span>
              <span className="shrink-0 tabular-nums text-danger">{signo(x.valor)}</span>
            </div>
          ))}
          <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
            <span className="font-mono text-xs uppercase text-foreground">Te entra</span>
            <span className="font-mono text-2xl font-bold tabular-nums text-danger">{r.entra}</span>
          </div>
          <p className="mt-1 font-mono text-[11px] text-muted">
            Daño {ETIQUETA_DANIO[r.categoria].toLowerCase()}
            {r.fuenteCategoria && <span className="text-info"> · {r.fuenteCategoria}</span>}
          </p>
          {r.avisos.map((a) => (
            <p key={a} className="mt-2 font-mono text-[11px] text-info">
              {a}
            </p>
          ))}

          {onRecibirDanio &&
            (recibido ? (
              <div className="mt-3 border-t border-border pt-3">
                <p className="font-mono text-[11px] text-info">
                  Hecho: {recibido.texto.replace(/^Recibir/, "recibido")}.
                  {recibido.aplicado.vida > 0 && ` Vida −${recibido.aplicado.vida}.`}
                  {recibido.aplicado.blindaje > 0 && ` Blindaje −${recibido.aplicado.blindaje}.`}
                </p>
                {recibido.aplicado.blindaje < recibido.rompePedido && (
                  <p className="font-mono text-[11px] text-danger">El blindaje perdido no se ha apuntado aquí: apúntalo a mano.</p>
                )}
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={deshacer}
                    disabled={enCurso}
                    className="clip-chamfer-sm min-h-11 border border-border px-3 py-2 font-mono text-xs uppercase text-muted active:scale-95 disabled:opacity-50"
                  >
                    Deshacer
                  </button>
                  <button
                    type="button"
                    onClick={otroGolpe}
                    disabled={enCurso}
                    className="clip-chamfer-sm min-h-11 border border-accent px-3 py-2 font-mono text-xs uppercase text-accent active:scale-95 disabled:opacity-50"
                  >
                    Otro golpe
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={recibir}
                disabled={!r.golpe || enCurso}
                className="clip-chamfer-sm mt-3 min-h-11 w-full border border-accent bg-accent px-3 py-2 font-display text-xs font-semibold uppercase tracking-wide text-black active:scale-95 disabled:border-border disabled:bg-elevated disabled:text-muted disabled:active:scale-100"
              >
                {r.golpe ? textoDelGolpe(r.golpe) : "No te entra nada"}
              </button>
            ))}
          {error && <p className="mt-1.5 font-mono text-[11px] text-danger">{error}</p>}

          {salvaciones.map((s) => (
            <SalvacionPanel key={s.id} salvacion={s} resultado={tiradas[s.id] ?? null} onTirar={(id) => tirarSalvacion(s, id)} />
          ))}
        </>
      )}

      {elegido && destino === "escudo" && golpe && (
        <div className="mt-4 flex flex-col gap-1 border-t border-border pt-3">
          <p className="font-display text-sm font-semibold uppercase text-info">Te golpean el escudo</p>
          <p className="font-sans text-prosa-sm text-soft">
            El escudo recibe el daño entero y le resta su blindaje; a ti no te llega nada.
          </p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted">{"// Blindaje del escudo"}</p>
          <LineaBlindaje etiqueta={golpe.blindaje.etiqueta} valor={golpe.blindaje.valor} />
          <p className="mt-2 font-mono text-xs text-foreground">
            El escudo recibe{" "}
            <span className="tabular-nums text-danger">
              {durabilidad?.recibe}
            </span> · durabilidad{" "}
            <span className="tabular-nums">
              {durabilidad?.de} → {durabilidad?.a}
            </span>
          </p>
          {seRompe && (
            <p className="font-display text-sm font-semibold uppercase text-danger">El escudo se rompe</p>
          )}
          {onDaniarEscudo &&
            (escudoAplicado ? (
              <p className="mt-2 font-mono text-[11px] text-info">Hecho: restado de la durabilidad.</p>
            ) : (
              <button
                type="button"
                onClick={daniarEscudo}
                disabled={golpe.aDurabilidad === 0}
                className="clip-chamfer-sm mt-2 min-h-11 w-full border border-accent bg-accent px-3 py-2 font-display text-xs font-semibold uppercase tracking-wide text-black active:scale-95 disabled:border-border disabled:bg-elevated disabled:text-muted disabled:active:scale-100"
              >
                Restar {golpe.aDurabilidad} de durabilidad
              </button>
            ))}
        </div>
      )}

      {elegido && destino === "cobertura" && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="font-display text-sm font-semibold uppercase text-info">
            Te golpean la cobertura: no recibes daño
          </p>
        </div>
      )}
    </Modal>
  );
}
