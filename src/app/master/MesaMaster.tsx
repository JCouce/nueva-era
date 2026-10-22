"use client";

// La Mesa (E1c): centro de mando del máster fuera de combate. Un solo componente para
// escritorio y móvil, repartido por breakpoints (lg):
//   - escritorio: jugadores a la izquierda, panel de mando en el centro, registro a la
//     derecha; "Limpiar estados" en la cabecera.
//   - móvil: tira de avatares para elegir objetivo; según la barra de pestañas de abajo,
//     las tarjetas de los jugadores (Jugadores), el panel (Estados, Vida, Recompensas)
//     o el registro, y la configuración del estado en una hoja inferior. El globo de un
//     avatar (nº de estados) lleva a su tarjeta en Jugadores.
import { useState, useTransition, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { formatoNumero, nombreCorto, type EstadoActivoDescrito, type Inmunidad, type RecursoVital, type VitalDeObjetivo } from "@/lib/rules";
import { MasterTabs } from "@/components/MasterTabs";
import { ChipEstado } from "@/components/ChipEstado";
import { usePollingCombate } from "@/hooks/usePollingCombate";
import { Aviso } from "@/components/mando/Aviso";
import { Barra } from "@/components/mando/Barra";
import { useAvisosMando } from "@/components/mando/useAvisosMando";
import { Boton, FOCO, Iniciales } from "@/components/mando/controles";
import { PanelMando, type PestanaMando } from "@/components/mando/PanelMando";
import { RegistroMando, type EntradaMando } from "@/components/mando/RegistroMando";
import type { AccionesMando, ObjetivoMando } from "@/components/mando/tipos";
import {
  ajustarVidaAPersonajesAction,
  aplicarEstadoAPersonajesAction,
  darCreditosAction,
  darXpAction,
  deshacerRegistroAction,
  quitarEstadoAPersonajesAction,
  limpiarEstadosAction,
} from "./actions";

export type JugadorMesa = {
  id: string;
  nombre: string;
  especie: string | null;
  xp: number;
  creditos: number;
  vida: VitalDeObjetivo;
  fatiga: VitalDeObjetivo;
  // La vida y la fatiga son las del combate en curso (su foto), no las de la ficha (E1d).
  deCombate: boolean;
  estados: EstadoActivoDescrito[];
  inmunidades: Inmunidad[];
};

const ACCIONES: AccionesMando = {
  aplicarEstado: (characterIds, estado, forzar) => aplicarEstadoAPersonajesAction({ characterIds, estado, forzar }),
  quitarEstado: (characterIds, estadoId) => quitarEstadoAPersonajesAction({ characterIds, estadoId }),
  darRecurso: (recurso, characterIds, cantidad, motivo) =>
    (recurso === "xp" ? darXpAction : darCreditosAction)({ characterIds, cantidad, motivo }),
  ajustarVida: (recurso, characterIds, cantidad) => ajustarVidaAPersonajesAction({ characterIds, recurso, cantidad }),
};

type VistaMovil = "jugadores" | PestanaMando | "registro";
const VISTAS: { id: VistaMovil; label: string }[] = [
  { id: "jugadores", label: "Jugadores" },
  { id: "estados", label: "Estados" },
  { id: "vida", label: "Vida" },
  { id: "recompensas", label: "Recompensas" },
  { id: "registro", label: "Registro" },
];

const idTarjeta = (id: string) => `mesa-jugador-${id}`;

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
  const [vista, setVista] = useState<VistaMovil>("jugadores");
  const [pestana, setPestana] = useState<PestanaMando>("estados");
  const [recursoVida, setRecursoVida] = useState<RecursoVital>("vida");
  const { aviso, avisar, cerrarAviso, errores, deshaciendo, deshacer } = useAvisosMando(deshacerRegistroAction);
  const [terminando, startTerminar] = useTransition();

  // Quien deja de estar en juego desaparece también de la selección.
  const objetivos: ObjetivoMando[] = jugadores
    .filter((j) => seleccion.includes(j.id))
    .map((j) => ({
      id: j.id,
      nombre: j.nombre,
      tipo: "pj",
      xp: j.xp,
      creditos: j.creditos,
      estados: j.estados,
      inmunidades: j.inmunidades,
      vida: j.vida,
      fatiga: j.fatiga,
    }));
  const todos = jugadores.length > 0 && jugadores.every((j) => seleccion.includes(j.id));

  const alternar = (id: string) => setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const quitarObjetivo = (id: string) => setSeleccion((s) => s.filter((x) => x !== id));
  const alternarTodos = () => setSeleccion(todos ? [] : jugadores.map((j) => j.id));
  // flushSync: la pestaña Jugadores tiene que estar pintada antes de buscar la tarjeta.
  const verTarjeta = (id: string) => {
    flushSync(() => setVista("jugadores"));
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(idTarjeta(id))?.scrollIntoView({ block: "center", behavior: reducir ? "auto" : "smooth" });
  };

  const terminarEscena = () =>
    startTerminar(async () => {
      const r = await limpiarEstadosAction({ ambito: "mesa" });
      if (!r.ok) return avisar({ mensaje: r.error, registroId: null, tono: "aviso" });
      avisar(
        r.personajes + r.npcs === 0
          ? { mensaje: "No había estados que limpiar.", registroId: null, tono: "ok" }
          : { mensaje: "Estados limpiados", registroId: r.registroId, tono: "ok" },
      );
    });

  const vigentes = registro.filter((e) => !e.deshecha).length;

  return (
    <>
      <div className="mb-3 flex items-center gap-3">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Mesa</h1>
        <span className="flex-1" />
        <Boton variante="aviso" onClick={terminarEscena} disabled={terminando}>
          Limpiar estados
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
            const n = j.estados.length;
            return (
              <div key={j.id} className="relative w-16 shrink-0 pt-1">
                <button
                  type="button"
                  aria-pressed={elegido}
                  aria-label={j.nombre}
                  onClick={() => alternar(j.id)}
                  className={`grid w-full justify-items-center gap-1 ${FOCO}`}
                >
                  <Iniciales
                    nombre={j.nombre}
                    className={`size-12 ${elegido ? "border-info bg-info !text-night" : ""}`}
                  />
                  <span className={`max-w-16 truncate text-sm font-semibold ${elegido ? "text-foreground" : "text-muted"}`}>
                    {nombreCorto(j.nombre)}
                  </span>
                </button>
                {/* Hermano del avatar, no dentro: tocarlo enseña la tarjeta sin cambiar la
                    selección. 44 px de área con el globo pequeño en su esquina. */}
                {n > 0 && (
                  <button
                    type="button"
                    aria-label={`${n} ${n === 1 ? "estado" : "estados"} de ${nombreCorto(j.nombre)}: ver su tarjeta`}
                    onClick={() => verTarjeta(j.id)}
                    className={`absolute -right-2 -top-2 grid size-11 place-items-start justify-items-end p-1 ${FOCO}`}
                  >
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 font-mono text-[0.7rem] font-bold text-night">
                      {n}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
          {jugadores.length === 0 && <SinJugadores />}
        </div>
      </section>

      <div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)_290px] lg:border lg:border-border">
        {/* Jugadores: columna en escritorio, pestaña Jugadores en móvil. */}
        <section
          aria-labelledby="mesa-jugadores"
          className={`min-w-0 lg:block lg:border-r lg:border-border ${vista === "jugadores" ? "" : "hidden"}`}
        >
          <Cabecera id="mesa-jugadores" titulo="Jugadores">
            {jugadores.length > 0 && (
              <button type="button" onClick={alternarTodos} className={`min-h-9 font-semibold text-info ${FOCO}`}>
                {todos ? "Ninguno" : "Todos"}
              </button>
            )}
          </Cabecera>
          <div className="grid gap-2 pb-4 lg:px-3">
            {jugadores.map((j) => (
              <TarjetaJugador key={j.id} jugador={j} elegido={seleccion.includes(j.id)} onClick={() => alternar(j.id)} />
            ))}
            {jugadores.length === 0 && <SinJugadores />}
          </div>
        </section>

        <section
          aria-label="Panel de mando"
          className={`min-w-0 lg:block lg:border-r lg:border-border lg:px-5 lg:pb-5 ${
            vista === "registro" || vista === "jugadores" ? "hidden" : ""
          }`}
        >
          <PanelMando
            objetivos={objetivos}
            acciones={ACCIONES}
            pestana={pestana}
            onPestana={setPestana}
            recursoVida={recursoVida}
            onRecursoVida={setRecursoVida}
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
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {VISTAS.map(({ id: t, label }) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={vista === t}
            onClick={() => {
              setVista(t);
              if (t !== "registro" && t !== "jugadores") setPestana(t);
            }}
            className={`grid min-h-14 min-w-0 justify-items-center gap-0.5 pb-1.5 pt-2 text-[0.78rem] font-semibold ${
              vista === t ? "text-accent" : "text-muted"
            } ${FOCO}`}
          >
            {ICONOS[t]}
            <span className="max-w-full truncate px-0.5">{label}</span>
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
      id={idTarjeta(j.id)}
      aria-pressed={elegido}
      onClick={onClick}
      className={`grid w-full scroll-mt-24 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 border p-2.5 text-left transition ${
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
      {j.deCombate && (
        <span className="col-start-2 col-end-4 font-mono text-[0.68rem] uppercase tracking-widest text-accent">
          Vida y fatiga del combate en curso
        </span>
      )}
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

const ICONO = "size-[22px]";
const ICONOS: Record<VistaMovil, ReactNode> = {
  jugadores: (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={ICONO}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.7.8 2.7 2.5 3 5.2" />
    </svg>
  ),
  vida: (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={ICONO}>
      <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" />
      <path d="M3 12h4l1.5-2.5L11 15l1.5-3H21" />
    </svg>
  ),
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
