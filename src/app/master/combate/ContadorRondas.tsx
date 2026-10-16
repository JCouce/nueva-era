"use client";

// Contador de rondas de la consola (E1d): ronda, de quién es el turno, cuánto lleva y la
// vuelta en segmentos, pegado a "Siguiente turno". Dos variantes: `barra` (escritorio,
// arriba de la consola, con el botón a la derecha) y `dock` (móvil, fijo abajo, con el
// botón grande debajo). Las animaciones solo con motion-safe (keyframes ronda-* en
// globals.css).
//
// El tiempo del turno es de pantalla: cuenta desde que este cliente ve el cambio de
// turno (o desde que se abre la página), no se guarda. Recargar lo pone a 0.
import { useEffect, useState } from "react";
import {
  cambioDeTurno,
  relojDeTurno,
  segmentosDeVuelta,
  type CambioDeTurno,
  type PosicionTurno,
} from "@/lib/rules";
import { FOCO } from "@/components/mando/controles";

export type EnCola = { id: string; nombre: string; tipo: "pj" | "npc" };

type Visto = { clave: string; pos: PosicionTurno; cambio: CambioDeTurno; inicio: number | null };

const TIC_MS = 250;

export function ContadorRondas({
  ronda,
  turnoIndex,
  cola,
  variante,
  onSiguiente,
  deshabilitado,
}: {
  ronda: number;
  turnoIndex: number;
  cola: EnCola[];
  variante: "barra" | "dock";
  onSiguiente: () => void;
  deshabilitado: boolean;
}) {
  const clave = `${ronda}:${turnoIndex}`;
  const pos = { ronda, turnoIndex };
  // Qué cambió desde lo último que se pintó, para animar solo eso (vuelta o turno), y
  // cuándo empezó este turno en este cliente.
  const [visto, setVisto] = useState<Visto>({ clave, pos, cambio: null, inicio: null });
  if (visto.clave !== clave) setVisto({ clave, pos, cambio: cambioDeTurno(visto.pos, pos), inicio: null });

  const [ahora, setAhora] = useState<number | null>(null);
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setAhora(t);
      setVisto((v) => (v.inicio === null ? { ...v, inicio: t } : v));
    }, TIC_MS);
    return () => clearInterval(id);
  }, []);
  const reloj = relojDeTurno(ahora !== null && visto.inicio !== null ? ahora - visto.inicio : 0);

  const actual = cola[turnoIndex] ?? null;
  const segmentos = segmentosDeVuelta(cola.length, turnoIndex);
  const posicion = `${Math.min(turnoIndex + 1, cola.length)}/${cola.length}`;
  const vuelta = visto.cambio === "vuelta";
  const digitos = String(ronda).padStart(2, "0").split("");
  const dock = variante === "dock";

  const numero = (
    <div className="grid">
      <span className="font-mono text-xs tracking-[0.3em] text-accent">RONDA</span>
      <span
        aria-live="polite"
        aria-label={`Ronda ${ronda}`}
        className={`flex font-display font-bold leading-[0.95] tabular-nums [text-shadow:0_0_18px_color-mix(in_srgb,var(--color-accent)_45%,transparent)] ${
          dock ? "text-[2.8rem]" : "text-[3.6rem]"
        }`}
      >
        {digitos.map((d, i) => (
          <span
            key={`${ronda}-${i}`}
            aria-hidden="true"
            className={`inline-block ${vuelta ? "motion-safe:animate-[ronda-rueda_.45s_cubic-bezier(.2,.9,.3,1.3)]" : ""}`}
          >
            {d}
          </span>
        ))}
      </span>
    </div>
  );

  const info = (
    <div className="grid min-w-0 gap-2">
      <div className="flex min-w-0 items-baseline gap-2.5 overflow-hidden">
        <small className="whitespace-nowrap font-mono text-xs uppercase tracking-[0.14em] text-muted">Turno de</small>
        <b
          key={clave}
          className={`truncate font-display ${dock ? "text-lg" : "text-2xl"} ${
            actual?.tipo === "npc" ? "text-glitch" : "text-info"
          } ${visto.cambio ? "motion-safe:animate-[ronda-entra_.35s_ease-out]" : ""}`}
        >
          {actual?.nombre ?? "—"}
        </b>
        <span
          aria-label={`Tiempo del turno ${reloj.texto}`}
          className={`ml-auto whitespace-nowrap font-mono text-sm tabular-nums ${reloj.lento ? "text-neon-orange" : "text-muted"}`}
        >
          {reloj.texto}
        </span>
      </div>
      <div role="img" aria-label={`Turno ${posicion} de la vuelta`} className="flex gap-1">
        {segmentos.map((s, i) => {
          const npc = cola[i]?.tipo === "npc";
          return (
            <i
              key={cola[i]?.id ?? i}
              className={`h-1.5 flex-1 ${
                s === "hecho"
                  ? "bg-accent/55"
                  : s === "actual"
                    ? `motion-safe:animate-[ronda-pulso_1.4s_ease-in-out_infinite] ${
                        npc ? "bg-glitch shadow-[0_0_10px_var(--color-glitch)]" : "bg-accent shadow-[0_0_10px_var(--color-accent)]"
                      }`
                    : "bg-elevated"
              }`}
            />
          );
        })}
      </div>
    </div>
  );

  const capas = (
    <>
      {visto.cambio && (
        <span
          key={`barrido-${clave}`}
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(100deg,transparent_30%,var(--color-accent)_50%,transparent_70%)] opacity-30 ${
            vuelta ? "motion-safe:animate-[ronda-barrido_.9s_ease-out]" : "motion-safe:animate-[ronda-barrido_.5s_ease-out]"
          }`}
        />
      )}
      {vuelta && (
        <span
          key={`sello-${clave}`}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 motion-safe:animate-[ronda-sello_1.1s_ease-out]"
        >
          <b
            className={`bg-accent px-4 font-display tracking-[0.1em] text-night [clip-path:polygon(4%_0,100%_0,96%_100%,0_100%)] ${
              dock ? "text-3xl" : "text-5xl"
            }`}
          >
            RONDA {ronda}
          </b>
        </span>
      )}
    </>
  );

  const pulsoBoton = deshabilitado ? "" : "motion-safe:animate-[ronda-boton_2s_ease-in-out_infinite]";

  if (dock) {
    return (
      <div className="grid gap-2.5">
        <div className="relative grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3.5 overflow-hidden">
          {numero}
          {info}
          {capas}
        </div>
        <button
          type="button"
          onClick={onSiguiente}
          disabled={deshabilitado}
          className={`min-h-[58px] w-full bg-accent font-display text-lg font-bold tracking-wide text-night transition active:translate-y-px disabled:bg-elevated disabled:text-muted ${pulsoBoton} ${FOCO}`}
        >
          Siguiente turno · {posicion}
        </button>
      </div>
    );
  }

  return (
    <div className="relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-5 overflow-hidden border border-border bg-surface px-5 py-3.5">
      {numero}
      {info}
      <button
        type="button"
        onClick={onSiguiente}
        disabled={deshabilitado}
        className={`relative grid min-h-16 place-items-center bg-accent pl-6 pr-9 font-display text-lg font-bold tracking-wide text-night transition [clip-path:polygon(0_0,calc(100%-14px)_0,100%_50%,calc(100%-14px)_100%,0_100%)] active:translate-y-px disabled:bg-elevated disabled:text-muted ${pulsoBoton} ${FOCO}`}
      >
        Siguiente turno
        <small className="font-mono text-[0.66rem] font-normal tracking-[0.14em] opacity-70">
          {posicion} <span className="ml-1 border border-current px-1">Espacio</span>
        </small>
      </button>
      {capas}
    </div>
  );
}
