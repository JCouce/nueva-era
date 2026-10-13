"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ESPECIES,
  especiePorId,
  eleccionCompleta,
  eleccionesIguales,
  type EleccionEspecie,
} from "@/lib/rules";
import { UsarModal } from "@/components/UsarModal";

// Texto fijo de docs/sistema.md §14.3.
const AVISO_RESET = "Cambiar de especie reseteará la ficha (todo salvo el Resumen). ¿Seguir?";

const fieldLabel = "font-mono text-[10px] uppercase tracking-widest text-muted";

function Opcion({
  label,
  activa,
  disabled,
  onClick,
}: {
  label: string;
  activa: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`clip-chamfer-sm border px-2 py-2 font-display text-xs font-semibold uppercase tracking-wide active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${
        activa ? "border-info text-info" : "border-border text-muted"
      }`}
    >
      {label}
    </button>
  );
}

// Especie → casta → linaje (§14.1). Ficha de jugador (ResumenTab) y NPC (NpcEditor).
// Mantiene un borrador local y solo llama a `onElegir` con una elección completa
// (elegirEspecie exige casta y, para noble, linaje) y distinta de la guardada. Con
// `avisar`, pide confirmación antes. El padre lo monta con `key` = elección
// guardada, así que cuando el servidor devuelve la ficha nueva el borrador se
// reinicia solo.
export function EspecieSelector({
  guardada,
  bloqueo,
  avisar,
  onElegir,
}: {
  guardada: EleccionEspecie;
  // Motivo por el que no se puede cambiar (bloqueoDeEspecie), o null.
  bloqueo: string | null;
  // hayQueAvisar: el cambio resetearía algo que el jugador ya ha comprado.
  avisar: boolean;
  onElegir: (eleccion: EleccionEspecie) => void;
}) {
  const [borrador, setBorrador] = useState<EleccionEspecie>(guardada);
  const [pendiente, setPendiente] = useState<EleccionEspecie | null>(null);
  // UsarModal llama a onUsar y luego a onCerrar: esto distingue confirmar de cancelar.
  const confirmado = useRef(false);

  const especie = especiePorId(borrador.especieId);
  const conLinaje = !!especie?.linajes && especie.linajes.casta === borrador.casta;
  const deshabilitado = bloqueo !== null;

  const intentar = (nueva: EleccionEspecie) => {
    setBorrador(nueva);
    if (!eleccionCompleta(nueva) || eleccionesIguales(nueva, guardada)) return;
    if (avisar) setPendiente(nueva);
    else onElegir(nueva);
  };

  // Volver a la especie (o casta) guardada recupera lo que había debajo.
  const onEspecie = (id: string) => {
    if (borrador.especieId === id) return intentar({ especieId: null });
    intentar(id === guardada.especieId ? guardada : { especieId: id });
  };
  const onCasta = (id: string) => {
    const mismaGuardada = borrador.especieId === guardada.especieId && id === guardada.casta;
    intentar(mismaGuardada ? guardada : { especieId: borrador.especieId, casta: id });
  };
  const onLinaje = (id: string) => intentar({ ...borrador, linaje: id });

  const falta = !especie?.castas
    ? null
    : !borrador.casta
      ? "Elige casta para aplicar el cambio."
      : conLinaje && !borrador.linaje
        ? "Elige linaje para aplicar el cambio."
        : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className={fieldLabel}>{"// Especie"}</span>
        <div className="flex flex-wrap gap-1">
          {ESPECIES.map((e) => (
            <Opcion
              key={e.id}
              label={e.label}
              activa={borrador.especieId === e.id}
              disabled={deshabilitado}
              onClick={() => onEspecie(e.id)}
            />
          ))}
        </div>
      </div>

      {especie?.castas && (
        <div className="flex flex-col gap-1">
          <span className={fieldLabel}>{"// Casta"}</span>
          <div className="flex flex-wrap gap-1">
            {especie.castas.map((c) => (
              <Opcion
                key={c.id}
                label={c.label}
                activa={borrador.casta === c.id}
                disabled={deshabilitado}
                onClick={() => onCasta(c.id)}
              />
            ))}
          </div>
        </div>
      )}

      {conLinaje && especie?.linajes && (
        <div className="flex flex-col gap-1">
          <span className={fieldLabel}>{"// Linaje"}</span>
          <div className="flex flex-wrap gap-1">
            {especie.linajes.opciones.map((l) => (
              <Opcion
                key={l.id}
                label={l.label}
                activa={borrador.linaje === l.id}
                disabled={deshabilitado}
                onClick={() => onLinaje(l.id)}
              />
            ))}
          </div>
        </div>
      )}

      {bloqueo && <p className="font-mono text-[10px] leading-relaxed text-muted">{bloqueo}.</p>}
      {!bloqueo && falta && <p className="font-mono text-[10px] leading-relaxed text-accent">{falta}</p>}

      {/* createPortal: dentro del HudCard de Resumen el modal `fixed` quedaba atrapado
          debajo del resto de la página (mismo problema y misma salida que en
          FabricarSeccion.tsx). */}
      {pendiente &&
        createPortal(
          <UsarModal
            titulo="Cambiar de especie"
            nota={AVISO_RESET}
            confirmarLabel="Seguir"
            onUsar={() => {
              confirmado.current = true;
              onElegir(pendiente);
            }}
            onCerrar={() => {
              if (!confirmado.current) setBorrador(guardada);
              confirmado.current = false;
              setPendiente(null);
            }}
          />,
          document.body,
        )}
    </div>
  );
}
