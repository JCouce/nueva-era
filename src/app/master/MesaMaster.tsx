"use client";

// La Mesa (E1c): centro de mando del máster fuera de combate. Un solo componente para
// escritorio y móvil, repartido por breakpoints (lg):
//   - escritorio: jugadores a la izquierda, panel de mando en el centro, registro a la
//     derecha; "Terminar escena" en la cabecera.
//   - móvil: tira de avatares para elegir objetivo, el panel o el registro según la
//     barra de pestañas de abajo, y la configuración del estado en una hoja inferior.
import { useCallback, useState, useTransition, type ReactNode } from "react";
import { etiquetaDuracionCorta, formatoNumero, nombreCorto, type EstadoActivoDescrito } from "@/lib/rules";
import { MasterTabs } from "@/components/MasterTabs";
import { usePollingCombate } from "@/hooks/usePollingCombate";
import { Aviso } from "@/components/mando/Aviso";
import { Boton, FOCO, Iniciales } from "@/components/mando/controles";
import { PanelMando, type PestanaMando } from "@/components/mando/PanelMando";
import { RegistroMando, type EntradaMando } from "@/components/mando/RegistroMando";
import type { AccionesMando, AvisoMando, ObjetivoMando } from "@/components/mando/tipos";
import {
  aplicarEstadoAPersonajesAction,
  darCreditosAction,
  darXpAction,
  deshacerRegistroAction,
  quitarEstadoAPersonajesAction,
  terminarEscenaAction,
} from "./actions";

export type JugadorMesa = {
  id: string;
  nombre: string;
  especie: string | null;
  xp: number;
  creditos: number;
  vida: { actual: number; max: number };
  fatiga: { actual: number; max: number };
  estados: EstadoActivoDescrito[];
};

const ACCIONES: AccionesMando = {
  aplicarEstado: (characterIds, estado) => aplicarEstadoAPersonajesAction({ characterIds, estado }),
  quitarEstado: (characterIds, estadoId) => quitarEstadoAPersonajesAction({ characterIds, estadoId }),
  darRecurso: (recurso, characterIds, cantidad, motivo) =>
    (recurso === "xp" ? darXpAction : darCreditosAction)({ characterIds, cantidad, motivo }),
};

type VistaMovil = PestanaMando | "registro";

// Refresco de fondo: la vida y la fatiga las mueven los jugadores desde su ficha.
const POLLING_MS = 15_000;

export function MesaMaster({
  jugadores,
  registro,
  generadoEn,
}: {
  jugadores: JugadorMesa[];
  registro: EntradaMando[];
  generadoEn: number;
}) {
  usePollingCombate(true, POLLING_MS);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [vista, setVista] = useState<VistaMovil>("estados");
  const [pestana, setPestana] = useState<PestanaMando>("estados");
  const [aviso, setAviso] = useState<AvisoMando | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [deshaciendo, setDeshaciendo] = useState<string | null>(null);
  const [terminando, startTerminar] = useTransition();
  const [, startDeshacer] = useTransition();

  // Quien deja de estar en juego desaparece también de la selección.
  const objetivos: ObjetivoMando[] = jugadores
    .filter((j) => seleccion.includes(j.id))
    .map((j) => ({ id: j.id, nombre: j.nombre, tipo: "pj", xp: j.xp, creditos: j.creditos, estados: j.estados }));
  const todos = jugadores.length > 0 && jugadores.every((j) => seleccion.includes(j.id));

  const alternar = (id: string) => setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const quitarObjetivo = (id: string) => setSeleccion((s) => s.filter((x) => x !== id));
  const alternarTodos = () => setSeleccion(todos ? [] : jugadores.map((j) => j.id));

  const avisar = useCallback((a: Omit<AvisoMando, "id">) => setAviso({ ...a, id: Date.now() }), []);
  const cerrarAviso = useCallback(() => setAviso(null), []);

  const deshacer = (id: string) => {
    setDeshaciendo(id);
    startDeshacer(async () => {
      const r = await deshacerRegistroAction(id);
      setDeshaciendo(null);
      setErrores((prev) => {
        const resto = { ...prev };
        delete resto[id];
        return r.ok ? resto : { ...resto, [id]: r.error };
      });
      avisar(r.ok ? { mensaje: "Deshecho", registroId: null, tono: "ok" } : { mensaje: r.error, registroId: null, tono: "aviso" });
    });
  };

  const terminarEscena = () =>
    startTerminar(async () => {
      const r = await terminarEscenaAction();
      if (!r.ok) return avisar({ mensaje: r.error, registroId: null, tono: "aviso" });
      avisar(
        r.personajes === 0
          ? { mensaje: "No había estados de escena que limpiar.", registroId: null, tono: "ok" }
          : { mensaje: "Escena terminada", registroId: r.registroId, tono: "ok" },
      );
    });

  const vigentes = registro.filter((e) => !e.deshecha).length;

  return (
    <>
      <div className="mb-3 flex items-center gap-3">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Mesa</h1>
        <span className="flex-1" />
        <Boton variante="aviso" onClick={terminarEscena} disabled={terminando}>
          <span className="lg:hidden">Fin de escena</span>
          <span className="hidden lg:inline">Terminar escena</span>
        </Boton>
      </div>
      <MasterTabs className="mb-4" />

      {/* Móvil: tira de objetivos. */}
      <section aria-label="Objetivo" className="mb-4 lg:hidden">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-widest text-muted">
            Objetivo · {objetivos.length}/{jugadores.length}
          </span>
          {jugadores.length > 0 && (
            <button type="button" onClick={alternarTodos} className={`min-h-11 px-1 font-semibold text-info ${FOCO}`}>
              {todos ? "Ninguno" : "Todos"}
            </button>
          )}
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto border-b border-border px-4 pb-3 [scrollbar-width:none]">
          {jugadores.map((j) => {
            const elegido = seleccion.includes(j.id);
            return (
              <button
                key={j.id}
                type="button"
                aria-pressed={elegido}
                aria-label={`${j.nombre}${j.estados.length ? `, ${j.estados.length} estados` : ""}`}
                onClick={() => alternar(j.id)}
                className={`grid w-16 shrink-0 justify-items-center gap-1 pt-1 ${FOCO}`}
              >
                <span className="relative">
                  <Iniciales
                    nombre={j.nombre}
                    className={`size-12 ${elegido ? "border-info bg-info !text-night" : ""}`}
                  />
                  {j.estados.length > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 font-mono text-[0.62rem] text-night">
                      {j.estados.length}
                    </span>
                  )}
                </span>
                <span className={`max-w-16 truncate text-sm font-semibold ${elegido ? "text-foreground" : "text-muted"}`}>
                  {nombreCorto(j.nombre)}
                </span>
              </button>
            );
          })}
          {jugadores.length === 0 && <SinJugadores />}
        </div>
      </section>

      <div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)_290px] lg:border lg:border-border">
        {/* Escritorio: jugadores. */}
        <section aria-labelledby="mesa-jugadores" className="hidden min-w-0 border-r border-border lg:block">
          <Cabecera id="mesa-jugadores" titulo="Jugadores">
            {jugadores.length > 0 && (
              <button type="button" onClick={alternarTodos} className={`min-h-9 font-semibold text-info ${FOCO}`}>
                {todos ? "Ninguno" : "Todos"}
              </button>
            )}
          </Cabecera>
          <div className="grid gap-2 px-3 pb-4">
            {jugadores.map((j) => (
              <TarjetaJugador key={j.id} jugador={j} elegido={seleccion.includes(j.id)} onClick={() => alternar(j.id)} />
            ))}
            {jugadores.length === 0 && <SinJugadores />}
          </div>
        </section>

        <section
          aria-label="Panel de mando"
          className={`min-w-0 lg:block lg:border-r lg:border-border lg:px-5 lg:pb-5 ${vista === "registro" ? "hidden" : ""}`}
        >
          <PanelMando
            objetivos={objetivos}
            acciones={ACCIONES}
            pestana={pestana}
            onPestana={setPestana}
            onQuitarObjetivo={quitarObjetivo}
            onAviso={avisar}
          />
        </section>

        <aside
          aria-labelledby="mesa-registro"
          className={`min-w-0 lg:sticky lg:top-12 lg:block lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto ${
            vista === "registro" ? "" : "hidden"
          }`}
        >
          <Cabecera id="mesa-registro" titulo="Registro">
            <span className="font-mono text-xs text-muted">{vigentes} acciones</span>
          </Cabecera>
          <div className="lg:px-3 lg:pb-4">
            <RegistroMando
              entradas={registro}
              generadoEn={generadoEn}
              errores={errores}
              deshaciendo={deshaciendo}
              onDeshacer={deshacer}
            />
          </div>
        </aside>
      </div>

      {/* Móvil: barra de pestañas. */}
      <nav
        role="tablist"
        aria-label="Qué hacer"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {(["estados", "recompensas", "registro"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={vista === t}
            onClick={() => {
              setVista(t);
              if (t !== "registro") setPestana(t);
            }}
            className={`grid min-h-14 justify-items-center gap-0.5 pb-1.5 pt-2 text-sm font-semibold ${
              vista === t ? "text-accent" : "text-muted"
            } ${FOCO}`}
          >
            {ICONOS[t]}
            {t === "estados" ? "Estados" : t === "recompensas" ? "Recompensas" : "Registro"}
          </button>
        ))}
      </nav>

      <Aviso aviso={aviso} onCerrar={cerrarAviso} onDeshacer={deshacer} />
    </>
  );
}

function Cabecera({ id, titulo, children }: { id: string; titulo: string; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 pb-2.5 pt-1 lg:px-4 lg:pt-3.5">
      <h2 id={id} className="font-display text-[0.95rem] font-bold uppercase tracking-widest">
        {titulo}
      </h2>
      {children}
    </div>
  );
}

function SinJugadores() {
  return <p className="text-muted">Ninguna ficha en juego todavía. Se aprueban en Fichas.</p>;
}

function TarjetaJugador({ jugador: j, elegido, onClick }: { jugador: JugadorMesa; elegido: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={elegido}
      onClick={onClick}
      className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 border p-2.5 text-left transition ${
        elegido ? "border-info bg-info/5 shadow-[inset_3px_0_0_var(--color-info)]" : "border-border bg-surface hover:border-muted"
      } ${FOCO}`}
    >
      <Iniciales nombre={j.nombre} className="row-span-2 size-10" />
      <span className="truncate text-[1.02rem] font-bold leading-tight">{j.nombre}</span>
      <span
        aria-hidden="true"
        className={`row-span-2 grid size-6 place-items-center border text-sm ${
          elegido ? "border-info bg-info text-night" : "border-border"
        }`}
      >
        {elegido ? "✓" : ""}
      </span>
      <span className="min-w-0 text-sm text-muted">
        {j.especie ?? "Sin especie"} ·{" "}
        <span className="font-mono">
          {j.xp} XP · {formatoNumero(j.creditos)} cr
        </span>
      </span>
      <span className="col-start-2 col-end-4 grid grid-cols-2 gap-1.5 pt-1">
        <Barra label="Vida" actual={j.vida.actual} max={j.vida.max} relleno="bg-neon-green" />
        <Barra label="Fatiga" actual={j.fatiga.actual} max={j.fatiga.max} relleno="bg-info" />
      </span>
      {j.estados.length > 0 && (
        <span className="col-start-2 col-end-4 flex flex-wrap gap-1 pt-1">
          {j.estados.map((e) => (
            <ChipEstado key={e.estadoId} estado={e} />
          ))}
        </span>
      )}
    </button>
  );
}

function Barra({ label, actual, max, relleno }: { label: string; actual: number; max: number; relleno: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (actual / max) * 100)) : 0;
  return (
    <span className="grid gap-0.5">
      <span className="flex justify-between font-mono text-[0.68rem] text-muted">
        <span>{label}</span>
        <span className="tabular-nums">
          {actual}/{max}
        </span>
      </span>
      <span className="relative h-1 bg-elevated">
        <span className={`absolute inset-y-0 left-0 ${relleno}`} style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}

function ChipEstado({ estado }: { estado: EstadoActivoDescrito }) {
  const dur = etiquetaDuracionCorta(estado.duracion);
  return (
    <span className="whitespace-nowrap border border-glitch px-1.5 font-mono text-[0.7rem] text-glitch">
      {estado.label}
      {dur && ` · ${dur}`}
    </span>
  );
}

const ICONO = "size-[22px]";
const ICONOS: Record<VistaMovil, ReactNode> = {
  estados: (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={ICONO}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </svg>
  ),
  recompensas: (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={ICONO}>
      <path d="M12 2 3 7l9 5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5" />
    </svg>
  ),
  registro: (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={ICONO}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5M12 7v5l3 3" />
    </svg>
  ),
};
