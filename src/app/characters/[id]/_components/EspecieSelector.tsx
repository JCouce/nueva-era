"use client";

import { ESPECIES, especiePorId, type EleccionEspecie } from "@/lib/rules";
import { useEleccionEspecie } from "./useEleccionEspecie";

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

// Selector compacto de especie → casta → linaje (§14.1), el del editor de NPC. La
// lógica del borrador y la confirmación vive en useEleccionEspecie (la comparte el
// carrusel de Origen). El padre lo monta con `key` = elección guardada.
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
  const { borrador, falta, onEspecie, onCasta, onLinaje, modal } = useEleccionEspecie({ guardada, avisar, onElegir });

  const especie = especiePorId(borrador.especieId);
  const conLinaje = !!especie?.linajes && especie.linajes.casta === borrador.casta;
  const deshabilitado = bloqueo !== null;

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

      {modal}
    </div>
  );
}
