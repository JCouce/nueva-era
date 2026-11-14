"use client";

import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { etiquetaDuracionCorta, explicacionDeEstado, type EstadoActivoDescrito } from "@/lib/rules";
import { Modal } from "./Modal";

// Los botones del modal de un chip propio («Prolongar un turno», «Se acabó: aplicar el bajón»).
// Los construye un solo sitio (CharacterSheet, `botonesDeChip`) y los reciben todas las pantallas
// de la ficha del jugador que pintan sus chips; `onMensaje`, dónde va lo que contesta el servidor.
export type BotonesDeChip = (
  estado: EstadoActivoDescrito,
  onMensaje?: (mensaje: string) => void,
) => { onProlongar?: () => void; onAcabar?: () => void; deshabilitado?: boolean };

// Los botones y el último aviso, juntos, para las pantallas que solo pintan chips.
export type ChipsDeFicha = { botones: BotonesDeChip; aviso: string | null };

// El aviso del servidor tras pulsar uno de esos botones, bajo los chips.
export function AvisoChips({ aviso }: { aviso: string | null | undefined }) {
  if (!aviso) return null;
  return <p className="border-l-2 border-info pl-2 font-sans text-[12px] leading-relaxed text-info">{aviso}</p>;
}

const FOCO =
  "outline-none focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// Un estado activo en un chip: "Aturdido · Fracaso · 2r". Un solo componente para todas las
// pantallas (Mesa, cola del combate, ficha del jugador). Ancho fijo (usuario 2026-11-14): la fila
// entera en móvil y 16rem desde sm, sin pasar nunca del contenedor; el nombre se trunca con «…» y
// lo de detrás (grado, duración, inmunidad) cede entero antes que él, así que nada desborda.
// Fondo tintado y borde del color de aviso, nombre en tinta y negrita (se lee sobre cualquier
// superficie), grado y duración en mono atenuado. Sin text-shadow: la utilidad `text-glitch` de
// globals.css añade sombra doble y no se lee.
// Pulsarlo abre un modal con lo que hace el estado (explicacionDeEstado, el motor: el grado
// puesto, la duración y, en el Shock, las piezas de esta ficha que toca). Con `onQuitar`, una × de
// 44 px de área táctil en el propio chip; con `onProlongar` (ps-07, Sondeo No-Local), el botón de
// alargarlo va en el modal, y con `onAcabar` (fa-03, «Se acabó: aplicar el bajón» de un recordatorio
// de fármaco), el de acabarlo. Puede ir dentro de un botón (la tarjeta del jugador en la Mesa): el
// chip no es un <button> y no deja subir su pulsación.
export function ChipEstado({
  estado,
  onQuitar,
  quitarLabel,
  onProlongar,
  onAcabar,
  deshabilitado = false,
}: {
  estado: EstadoActivoDescrito;
  onQuitar?: () => void;
  onProlongar?: () => void;
  onAcabar?: () => void;
  quitarLabel?: string;
  deshabilitado?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  // Activables de aumento (A5a): la duración larga, que dice que las rondas solo corren en combate.
  // A7: un estado que la inmunidad deja sin efecto lo dice ("Inmune (Ojo Biónico 2)"), y uno
  // puesto con "Aplicar igualmente", "forzado". Los automáticos (Heridas, Fatiga, Inconsciencia
  // por la vida o la fatiga) no tienen duración ni ×: se van solos.
  const quitable = onQuitar && !estado.automatico;
  const extra = [
    estado.grado,
    estado.automatico ? "automático" : (estado.duracionActivable ?? etiquetaDuracionCorta(estado.duracion)),
    estado.inmune ? `Inmune (${estado.inmune})` : null,
    estado.forzado ? "forzado" : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const abrir = (e: MouseEvent | KeyboardEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setAbierto(true);
  };
  return (
    <span
      className={`inline-flex min-h-9 w-full min-w-0 max-w-full items-center border text-[0.85rem] leading-tight text-foreground sm:w-64 ${
        estado.inmune
          ? "border-dashed border-info bg-info/10"
          : estado.automatico
            ? "border-danger bg-danger/10"
            : "border-glitch bg-glitch/15"
      }`}
    >
      <span
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-label={`${estado.label}: qué hace`}
        onClick={abrir}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") abrir(e);
        }}
        className={`flex min-h-9 min-w-0 flex-1 cursor-pointer items-center gap-1.5 self-stretch px-2 hover:bg-glitch/20 ${FOCO}`}
      >
        <b className={`max-w-full shrink-0 truncate font-bold ${estado.inmune ? "line-through decoration-info" : ""}`}>{estado.nombre}</b>
        {/* T4: el número que guarda (Sigilo por sentido, «dificultad 12 · Mosquito»). Cede antes que el nombre. */}
        {estado.valorTexto && (
          <span className="min-w-0 shrink-[100] truncate font-mono text-[0.78rem] tabular-nums text-accent">{estado.valorTexto}</span>
        )}
        {extra && <span className="min-w-0 shrink-[100] truncate font-mono text-[0.72rem] text-muted">· {extra}</span>}
      </span>
      {quitable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onQuitar();
          }}
          disabled={deshabilitado}
          aria-label={quitarLabel ?? `Quitar ${estado.label}`}
          // 44 px de área con un chip más bajo: el margen negativo no empuja la fila.
          className={`-my-1 grid size-11 shrink-0 place-items-center text-lg text-foreground hover:bg-glitch/30 disabled:opacity-50 ${FOCO}`}
        >
          ×
        </button>
      )}
      {abierto && (
        <ModalEstado
          estado={estado}
          onCerrar={() => setAbierto(false)}
          onProlongar={onProlongar && estado.prolongar ? onProlongar : undefined}
          onAcabar={
            onAcabar && estado.acabar
              ? () => {
                  setAbierto(false);
                  onAcabar();
                }
              : undefined
          }
          deshabilitado={deshabilitado}
        />
      )}
    </span>
  );
}

function ModalEstado({
  estado,
  onCerrar,
  onProlongar,
  onAcabar,
  deshabilitado,
}: {
  estado: EstadoActivoDescrito;
  onCerrar: () => void;
  onProlongar?: () => void;
  onAcabar?: () => void;
  deshabilitado: boolean;
}) {
  const x = explicacionDeEstado(estado);
  return (
    <Modal titulo={x.titulo} onCerrar={onCerrar}>
      <div className="mt-3 grid gap-3 text-left normal-case tracking-normal">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          {[x.grado, x.duracion].filter(Boolean).join(" · ")}
        </p>
        {estado.valorTexto && <p className="font-mono text-sm tabular-nums text-accent">{estado.valorTexto}</p>}
        {x.efecto.length > 0 && (
          <div className="grid gap-1 border-l-2 border-glitch py-1 pl-3">
            {x.efecto.map((d) => (
              <p key={d} className="text-[0.95rem] leading-snug">
                {d}
              </p>
            ))}
          </div>
        )}
        {x.piezas && <p className="border-l-2 border-accent py-1 pl-3 text-[0.95rem] leading-snug">{x.piezas}</p>}
        {x.resumen && <p className="text-sm leading-snug text-soft">{x.resumen}</p>}
        {x.avisos.map((a) => (
          <p key={a} className="border-l-2 border-info py-1 pl-3 text-sm text-info">
            {a}
          </p>
        ))}
        {onProlongar && estado.prolongar && (
          <button
            type="button"
            onClick={onProlongar}
            disabled={deshabilitado}
            className={`min-h-11 border border-accent px-3 font-display text-sm font-semibold uppercase tracking-wide text-accent active:scale-95 disabled:opacity-50 ${FOCO}`}
          >
            {estado.prolongar.etiqueta} (−{estado.prolongar.coste} fatiga)
          </button>
        )}
        {onAcabar && estado.acabar && (
          <button
            type="button"
            onClick={onAcabar}
            disabled={deshabilitado}
            className={`min-h-11 border border-accent px-3 font-display text-sm font-semibold uppercase tracking-wide text-accent active:scale-95 disabled:opacity-50 ${FOCO}`}
          >
            {estado.acabar.etiqueta} (−{estado.acabar.fatiga} fatiga)
          </button>
        )}
      </div>
    </Modal>
  );
}
