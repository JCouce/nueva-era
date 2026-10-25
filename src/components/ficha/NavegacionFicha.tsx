"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode, type Ref } from "react";
import { createPortal } from "react-dom";
import { FOCO } from "@/components/mando/controles";

// Cuatro grupos: la ficha en sí, lo que el personaje hace o lleva en la mesa, el
// combate (solo mientras hay uno EN_CURSO) y el catálogo — que no es del
// personaje, es la dirección del juego consultando o repartiendo equipo.
export type GrupoSeccion = "ficha" | "mesa" | "combate" | "catalogo";

export interface Seccion<Id extends string = string> {
  id: Id;
  label: string;
  sigla: string;
  grupo: GrupoSeccion;
  // Posición en el dock móvil (mesa/combate): no coincide con el orden de escritorio.
  dock?: number;
}

export const SECCIONES_FICHA = [
  { id: "personaje", label: "Personaje", sigla: "PJ", grupo: "ficha" },
  { id: "attrs", label: "Atributos", sigla: "AT", grupo: "ficha" },
  { id: "skills", label: "Habilidades", sigla: "HA", grupo: "ficha" },
  { id: "dotes", label: "Dotes", sigla: "DO", grupo: "ficha" },
  { id: "psionica", label: "Psiónica", sigla: "PS", grupo: "ficha" },
  { id: "acciones", label: "Acciones", sigla: "AC", grupo: "mesa", dock: 1 },
  { id: "equipo", label: "Equipo", sigla: "EQ", grupo: "mesa", dock: 3 },
  { id: "recursos", label: "Recursos", sigla: "RE", grupo: "mesa", dock: 2 },
  { id: "combate", label: "Combate", sigla: "CO", grupo: "combate", dock: 0 },
  { id: "tienda", label: "Tienda", sigla: "TI", grupo: "catalogo" },
] as const satisfies readonly Seccion[];

export type TabId = (typeof SECCIONES_FICHA)[number]["id"];

const RADIO_INTERIOR = 150;
const RADIO_EXTERIOR = 262;
const EN_INTERIOR = 3;
const DISCO = 52;
const MARGEN = 4;
const ANCHO_ITEM = 76;

const COLOR: Record<GrupoSeccion, { texto: string; disco: string }> = {
  ficha: { texto: "text-accent", disco: "border-accent bg-accent text-night" },
  mesa: { texto: "text-info", disco: "border-info bg-info text-night" },
  combate: { texto: "text-neon-magenta", disco: "border-neon-magenta bg-neon-magenta text-night" },
  catalogo: { texto: "text-neon-magenta", disco: "border-neon-magenta bg-neon-magenta text-night" },
};

const enRueda = (s: Seccion) => s.grupo === "ficha" || s.grupo === "catalogo";

// El dock y la rueda van por portal a body: un HudCard o cualquier ancestro con
// clip-path/transform recorta o rompe el `fixed` (mismo motivo que los modales).
const sinSuscripcion = () => () => {};
function useEnCliente() {
  return useSyncExternalStore(sinSuscripcion, () => true, () => false);
}

export function NavegacionFicha<Id extends string>({
  secciones,
  activa,
  onCambiar,
  enCombate = false,
}: {
  secciones: readonly Seccion<Id>[];
  activa: Id;
  onCambiar: (id: Id) => void;
  enCombate?: boolean;
}) {
  const visibles = secciones.filter((s) => s.grupo !== "combate" || enCombate);
  const porGrupo = (g: GrupoSeccion) => visibles.filter((s) => s.grupo === g);
  const escritorio = [porGrupo("ficha"), [...porGrupo("mesa"), ...porGrupo("combate")], porGrupo("catalogo")];

  return (
    <>
      <nav
        aria-label="Secciones de la ficha"
        className="hidden items-stretch overflow-x-auto border-b border-border lg:flex"
      >
        {escritorio.map((grupo, i) => (
          <div key={i} className={`flex ${i > 0 ? "ml-1 border-l border-border pl-1" : ""}`}>
            {grupo.map((s) => (
              <TabEscritorio
                key={s.id}
                seccion={s}
                activa={activa === s.id}
                aviso={s.grupo === "combate" && activa !== s.id}
                onClick={() => onCambiar(s.id)}
              />
            ))}
          </div>
        ))}
      </nav>
      <DockMovil secciones={visibles} activa={activa} onCambiar={onCambiar} />
    </>
  );
}

function TabEscritorio({
  seccion,
  activa,
  aviso,
  onClick,
}: {
  seccion: Seccion;
  activa: boolean;
  aviso: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={activa ? "page" : undefined}
      className={`relative -mb-px whitespace-nowrap border-b-2 px-2 py-2 font-display text-xs font-semibold uppercase tracking-wide ${
        activa ? `border-current ${COLOR[seccion.grupo].texto}` : "border-transparent text-muted hover:text-foreground"
      } ${FOCO}`}
    >
      {seccion.label}
      {aviso && <PuntoCombate className="right-0.5 top-1.5" />}
    </button>
  );
}

function PuntoCombate({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`absolute size-1.5 rounded-full bg-neon-magenta shadow-glow-magenta motion-safe:animate-pulse ${className}`}
    />
  );
}

function DockMovil<Id extends string>({
  secciones,
  activa,
  onCambiar,
}: {
  secciones: readonly Seccion<Id>[];
  activa: Id;
  onCambiar: (id: Id) => void;
}) {
  const enCliente = useEnCliente();
  const [centro, setCentro] = useState<{ x: number; y: number } | null>(null);
  const botonFicha = useRef<HTMLButtonElement>(null);
  const abierta = centro !== null;

  const enDock = secciones
    .filter((s) => s.grupo === "mesa" || s.grupo === "combate")
    .sort((a, b) => (a.dock ?? 0) - (b.dock ?? 0));
  const rueda = secciones.filter(enRueda);
  const activaEnRueda = rueda.find((s) => s.id === activa);

  const cerrar = () => {
    setCentro(null);
    botonFicha.current?.focus();
  };

  useEffect(() => {
    if (!abierta) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCentro(null);
        botonFicha.current?.focus();
      }
    };
    // El centro se calcula al abrir: si cambia el viewport, cerrar es más honesto que recolocar.
    const onResize = () => setCentro(null);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [abierta]);

  if (!enCliente) return null;

  const columnas = enDock.length + 1;
  return createPortal(
    <>
      {centro && (
        <Rueda
          centro={centro}
          secciones={rueda}
          activa={activa}
          onElegir={(id) => {
            onCambiar(id);
            cerrar();
          }}
          onCerrar={cerrar}
        />
      )}
      <nav
        aria-label="Secciones de la ficha"
        style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}
        className="fixed inset-x-0 bottom-0 z-40 grid border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {enDock.map((s) => {
          const esActiva = activa === s.id;
          return (
            <ItemDock
              key={s.id}
              activa={esActiva}
              color={COLOR[s.grupo].texto}
              icono={ICONOS[s.id] ?? ICONOS.ficha}
              label={s.label}
              onClick={() => {
                setCentro(null);
                onCambiar(s.id);
              }}
            >
              {s.grupo === "combate" && !esActiva && <PuntoCombate className="right-[calc(50%-18px)] top-2" />}
            </ItemDock>
          );
        })}
        <ItemDock
          ref={botonFicha}
          activa={abierta || activaEnRueda !== undefined}
          color="text-accent"
          icono={abierta ? ICONO_CERRAR : ICONOS.ficha}
          label={abierta ? "Cerrar" : (activaEnRueda?.label ?? "Ficha")}
          ariaExpanded={abierta}
          ariaLabel={abierta ? "Cerrar secciones de la ficha" : "Secciones de la ficha"}
          onClick={() => {
            if (abierta) return cerrar();
            const r = botonFicha.current?.getBoundingClientRect();
            if (r) setCentro({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
          }}
        />
      </nav>
    </>,
    document.body,
  );
}

function ItemDock({
  ref,
  activa,
  color,
  icono,
  label,
  ariaExpanded,
  ariaLabel,
  onClick,
  children,
}: {
  ref?: Ref<HTMLButtonElement>;
  activa: boolean;
  color: string;
  icono: ReactNode;
  label: string;
  ariaExpanded?: boolean;
  ariaLabel?: string;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-current={activa && ariaExpanded === undefined ? "page" : undefined}
      aria-expanded={ariaExpanded}
      aria-label={ariaLabel}
      className={`relative grid min-h-[60px] min-w-0 content-center justify-items-center gap-1 px-0.5 font-mono text-[10px] uppercase tracking-wider ${
        activa ? `${color} shadow-[inset_0_2px_0_currentColor]` : "text-muted"
      } ${FOCO}`}
    >
      {icono}
      <span className="max-w-full truncate">{label}</span>
      {children}
    </button>
  );
}

function Rueda<Id extends string>({
  centro,
  secciones,
  activa,
  onElegir,
  onCerrar,
}: {
  centro: { x: number; y: number };
  secciones: readonly Seccion<Id>[];
  activa: Id;
  onElegir: (id: Id) => void;
  onCerrar: () => void;
}) {
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const arcos = [secciones.slice(0, EN_INTERIOR), secciones.slice(EN_INTERIOR)];
  const posiciones = arcos.flatMap((arco, a) => {
    const radio = a === 0 ? RADIO_INTERIOR : RADIO_EXTERIOR;
    return arco.map((s, i) => {
      // De 210° a 270° en coordenadas de pantalla (y hacia abajo: 270° es arriba).
      const grados = arco.length === 1 ? 240 : 210 + (60 * i) / (arco.length - 1);
      const rad = (grados * Math.PI) / 180;
      const lim = (v: number, mitad: number, max: number) => Math.min(Math.max(v, mitad + MARGEN), max - mitad - MARGEN);
      return {
        s,
        x: lim(centro.x + radio * Math.cos(rad), ANCHO_ITEM / 2, window.innerWidth),
        y: lim(centro.y + radio * Math.sin(rad), DISCO / 2, window.innerHeight),
      };
    });
  });

  useLayoutEffect(() => {
    items.current[0]?.focus();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    items.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = centro.x - (r.left + r.width / 2);
      const dy = centro.y - (r.top + r.height / 2);
      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(0.3)`, opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 180, delay: i * 20, easing: "cubic-bezier(.2,.9,.3,1.2)", fill: "backwards" },
      );
    });
  }, [centro]);

  const anillo = (radio: number) => (
    <span
      aria-hidden
      className="pointer-events-none absolute rounded-full border border-dashed border-border"
      style={{ left: centro.x - radio, top: centro.y - radio, width: radio * 2, height: radio * 2 }}
    />
  );
  const etiqueta = (195 * Math.PI) / 180;
  const medio = (RADIO_INTERIOR + RADIO_EXTERIOR) / 2;

  return (
    <div className="fixed inset-0 z-30 overflow-hidden lg:hidden">
      <button
        type="button"
        aria-label="Cerrar secciones de la ficha"
        tabIndex={-1}
        onClick={onCerrar}
        className="absolute inset-0 bg-night/80 backdrop-blur-[2px]"
      />
      {anillo(RADIO_INTERIOR)}
      {anillo(RADIO_EXTERIOR)}
      <span
        aria-hidden
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted"
        style={{ left: centro.x + medio * Math.cos(etiqueta), top: centro.y + medio * Math.sin(etiqueta) }}
      >
        Ficha
      </span>
      <div role="menu" aria-label="Secciones de la ficha">
        {posiciones.map(({ s, x, y }, i) => {
          const esActiva = activa === s.id;
          const color = COLOR[s.grupo];
          return (
            <button
              key={s.id}
              ref={(el) => {
                items.current[i] = el;
              }}
              type="button"
              role="menuitem"
              aria-current={esActiva ? "page" : undefined}
              onClick={() => onElegir(s.id)}
              className={`absolute flex flex-col items-center gap-1 outline-none ${color.texto} group`}
              style={{ left: x - ANCHO_ITEM / 2, top: y - DISCO / 2, width: ANCHO_ITEM }}
            >
              <span
                className={`grid size-[52px] place-items-center rounded-full border-2 font-display text-base font-bold tracking-wide group-focus-visible:ring-2 group-focus-visible:ring-info group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background ${
                  esActiva ? color.disco : "border-current bg-surface"
                }`}
              >
                {s.sigla}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider">{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const svg = (d: ReactNode) => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {d}
  </svg>
);

const ICONOS: Record<string, ReactNode> = {
  acciones: svg(<path d="M13 2 4 14h7l-1 8 9-12h-7z" />),
  recursos: svg(
    <>
      <rect x="6" y="4" width="12" height="17" rx="1.5" />
      <path d="M10 2h4M9 10h6M9 14h6" />
    </>,
  ),
  equipo: svg(<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z" />),
  combate: svg(
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
    </>,
  ),
  ficha: svg(
    <>
      <rect x="4" y="4" width="7" height="7" />
      <rect x="13" y="4" width="7" height="7" />
      <rect x="4" y="13" width="7" height="7" />
      <rect x="13" y="13" width="7" height="7" />
    </>,
  ),
};
const ICONO_CERRAR = svg(<path d="M6 6l12 12M18 6 6 18" />);
