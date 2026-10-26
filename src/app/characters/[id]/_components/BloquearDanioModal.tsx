"use client";

import { useState } from "react";
import {
  casillaBlindajeBrazo,
  casillaBlindajeReactivo,
  categoriaDelGolpe,
  desgloseBlindaje,
  golpeAlEscudo,
  TIPOS_DANIO,
  type FichaResuelta,
  type TipoDanio,
} from "@/lib/rules";
import { Modal } from "@/components/Modal";

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

// "Bloquear daño" (docs/tareas.md, Hallazgo #5 / sistema.md pregunta 29): un
// calculador puro, sin dado — eliges tipo de daño + cuánto recibes, y ves cuánto
// absorbe el blindaje ahora mismo. Lo único que escribe es la fatiga de la casilla de
// blindaje reactivo (Densificar del Enjambre 3+, A4b): se cobra al marcarla y se devuelve
// al desmarcarla sin cerrar; qué vale y cuándo lo dice casillaBlindajeReactivo (blindaje.ts).
// Sin onPagarFatiga (combate en vivo) la casilla suma igual y la fatiga se cobra a mano.
// "Bloqueado con el brazo biónico" (A6a, Brazo de nivel 2+): sin coste, suma el blindaje del
// brazo a este golpe (casillaBlindajeBrazo).
//
// "¿A qué da el golpe?" (Murillo, 2026-10-23): si el ataque supera la defensa pero falla por
// la cobertura, golpea la cobertura. "Al escudo" lo resuelve golpeAlEscudo (blindaje.ts): el
// escudo resta su blindaje y el resto va a su durabilidad. Con onDaniarEscudo (la ficha del
// jugador) un botón la resta del recurso; sin él (NPC, combate en vivo), solo los números.
type Destino = "portador" | "escudo" | "cobertura";

export function BloquearDanioModal({
  ficha,
  onPagarFatiga,
  onAjustarFatiga,
  onDaniarEscudo,
  onCerrar,
}: {
  ficha: FichaResuelta;
  onPagarFatiga?: (coste: number, permiteTemporal: boolean) => void;
  onAjustarFatiga?: (delta: number) => void;
  onDaniarEscudo?: (instanciaId: string, delta: number) => void;
  onCerrar: () => void;
}) {
  const [tipo, setTipo] = useState<TipoDanio>("cinetico");
  const [destinoElegido, setDestino] = useState<Destino>("portador");
  const [danioRecibido, setDanioRecibidoEstado] = useState(0);
  const [reactivo, setReactivo] = useState(false);
  const [conBrazo, setConBrazo] = useState(false);
  // Lo que se restó al pulsar el botón, para no restarlo dos veces con los mismos números.
  const [escudoAplicado, setEscudoAplicado] = useState<{ recibe: number; de: number; a: number } | null>(null);

  const golpe = golpeAlEscudo(ficha.ficha, tipo, danioRecibido);
  // Ignífuga 2 / Polímero 2: ese daño cuenta como letal, no grave (R8).
  const categoria = categoriaDelGolpe(ficha.ficha, tipo);
  // Roto o daño mental: "Al escudo" no se puede elegir, y si estaba elegido vuelve a "A ti"
  // (salvo que se acabe de romper con el botón: se queda mostrando lo que pasó).
  const destino: Destino =
    destinoElegido === "escudo" && !escudoAplicado && (!golpe || golpe.bloqueada) ? "portador" : destinoElegido;
  // Tras restar, la ficha ya trae la durabilidad nueva: se enseña la foto de lo restado.
  const durabilidad =
    escudoAplicado ?? (golpe && { recibe: golpe.aDurabilidad, de: golpe.durabilidadActual, a: golpe.durabilidadResultante });
  const seRompe = escudoAplicado ? escudoAplicado.a === 0 && escudoAplicado.de > 0 : Boolean(golpe?.seRompe);
  const casilla = casillaBlindajeReactivo(ficha.ficha, tipo, reactivo);
  const casillaBrazo = casillaBlindajeBrazo(ficha.ficha, tipo);
  const desglose = desgloseBlindaje(
    ficha.ficha,
    tipo,
    ficha.blindaje.armaduraNatural,
    reactivo,
    conBrazo && Boolean(casillaBrazo),
  );

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

  // Cambiar a un tipo en el que no vale (Mental, Fuego) la desmarca y devuelve la fatiga.
  const elegirTipo = (t: TipoDanio) => {
    const otra = casillaBlindajeReactivo(ficha.ficha, t, reactivo);
    if (reactivo && otra?.bloqueada) {
      onAjustarFatiga?.(otra.costeFatiga);
      setReactivo(false);
    }
    if (casillaBlindajeBrazo(ficha.ficha, t)?.bloqueada) setConBrazo(false);
    setEscudoAplicado(null);
    setTipo(t);
  };
  const blindaje = desglose.reduce((total, l) => total + l.valor, 0);
  const pasa = Math.max(0, danioRecibido - blindaje);

  return (
    <Modal titulo="Bloquear daño" onCerrar={onCerrar}>
      <p className="mt-2 font-sans text-prosa-sm text-soft">
        Elige tipo de daño y cuánto recibes — el desglose de abajo explica de dónde sale
        cada punto de blindaje.
      </p>

      <div className="mt-4 border-t border-border pt-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{"// Tipo de daño"}</p>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {TIPOS_DANIO.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => elegirTipo(t.id)}
              className={`clip-chamfer-sm border px-2 py-1.5 font-mono text-[11px] uppercase active:scale-95 ${
                tipo === t.id ? "border-accent text-accent" : "border-border text-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

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

      {destino === "portador" && casillaBrazo && (
        <div className="mt-4 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setConBrazo((v) => !v)}
            aria-pressed={conBrazo}
            disabled={!conBrazo && Boolean(casillaBrazo.bloqueada)}
            className={`clip-chamfer-sm w-full border px-3 py-2 text-left font-mono text-xs uppercase active:scale-[0.99] disabled:opacity-50 disabled:active:scale-100 ${
              conBrazo ? "border-info text-info" : "border-border text-muted"
            }`}
          >
            {conBrazo ? "✓ " : ""}
            {casillaBrazo.etiqueta}
          </button>
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
          <button
            type="button"
            onClick={marcarReactivo}
            aria-pressed={reactivo}
            disabled={!reactivo && Boolean(casilla.bloqueada)}
            className={`clip-chamfer-sm w-full border px-3 py-2 text-left font-mono text-xs uppercase active:scale-[0.99] disabled:opacity-50 disabled:active:scale-100 ${
              reactivo ? "border-info text-info" : "border-border text-muted"
            }`}
          >
            {reactivo ? "✓ " : ""}
            {casilla.etiqueta}
          </button>
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

      {destino === "portador" && (
        <>
          <div className="mt-4 flex flex-col gap-1 border-t border-border pt-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{"// Desglose"}</p>
            {desglose.map((l, i) => (
              <LineaBlindaje key={i} etiqueta={l.etiqueta} valor={l.valor} nota={l.nota} />
            ))}
            <div className="mt-1 flex items-baseline justify-between border-t border-border pt-1.5">
              <span className="font-mono text-xs uppercase text-foreground">Blindaje</span>
              <span className="font-mono text-lg font-bold tabular-nums text-info">{signo(blindaje)}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="font-mono text-xs uppercase text-foreground">Pasa</span>
            <span className="font-mono text-2xl font-bold tabular-nums text-danger">{pasa}</span>
          </div>
          {categoria.categoria && (
            <p className="mt-1 font-mono text-[11px] text-muted">
              Cuenta como {categoria.categoria.toLowerCase()}
              {categoria.fuente && <span className="text-info"> · {categoria.fuente}</span>}
            </p>
          )}
        </>
      )}

      {destino === "escudo" && golpe && (
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

      {destino === "cobertura" && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="font-display text-sm font-semibold uppercase text-info">
            Te golpean la cobertura: no recibes daño
          </p>
        </div>
      )}
    </Modal>
  );
}
