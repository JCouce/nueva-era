"use client";

import { useMemo, useState } from "react";
import type { Sheet, EstadoActivo, VitalidadActual } from "@/lib/rules";
import { Modal } from "@/components/Modal";
import { AccionesTab } from "@/app/characters/[id]/_components/AccionesTab";
import { useFichaResuelta } from "@/hooks/useFichaResuelta";
import type { Lanzamiento } from "@/components/ResultadoTirada";

// Fase 6b, subtarea 5.5 (el motivo original de todo el rediseño del bloque
// 5): mismo AccionesTab.tsx que ya usa el jugador, alimentado por el `sheet`
// y los `estados` congelados del Combatiente (no los de la plantilla, que
// puede haber cambiado desde que se añadió — mismo criterio de "foto" que
// el resto de `Combatiente`). Un panel bajo demanda, uno a la vez — con
// 30-50 combatientes en la cola, montar un AccionesTab por fila sería
// bastante trabajo de más para lo que se ve en pantalla en cada momento.
// Va en Modal, como AccionModal.tsx: el modal que AccionesTab abre por dentro al
// pulsar "Tirar" se monta después en body y queda encima (antes este iba a z-40 para
// eso); Escape y el fondo cierran solo el de arriba.
export function NpcAccionesPanel({
  nombre,
  sheet,
  estadosCombate,
  pgActual,
  pgMax,
  fatigaActual,
  fatigaMax,
  onCerrar,
}: {
  nombre: string;
  sheet: Sheet;
  estadosCombate: EstadoActivo[];
  // La vida/fatiga de su fila en el combate, no la de la plantilla: de ella salen los
  // umbrales de §7 (Herido −1…).
  pgActual: number;
  pgMax: number;
  fatigaActual: number;
  fatigaMax: number;
  onCerrar: () => void;
}) {
  const vitalidad = useMemo<VitalidadActual>(
    () => ({ origen: "combate", pgActual, pgMax, fatigaActual, fatigaMax }),
    [pgActual, pgMax, fatigaActual, fatigaMax],
  );
  const ficha = useFichaResuelta(sheet, estadosCombate, vitalidad, { libre: true });
  // Panel bajo demanda: se desmonta al cerrar (onCerrar, en el padre), así
  // que este estado ya nacía fresco en cada apertura incluso cuando vivía
  // dentro de AccionesTab — el historial subió de nivel (2026-09-24, para que
  // sobreviva a cambiar de tab en la ficha del jugador), pero aquí no aplica
  // ese problema: no hay tabs que cambiar dentro de este panel.
  const [historial, setHistorial] = useState<Lanzamiento[]>([]);
  const [memoria, setMemoria] = useState<
    Record<string, { dificultad: number | null; circunstancial: number }>
  >({});

  return (
    <Modal ariaLabel={nombre} onCerrar={onCerrar}>
      <div className="flex items-start justify-between gap-2 border-b border-border pb-2">
        <h2 className="truncate font-display text-lg font-semibold uppercase leading-tight">
          {nombre}
        </h2>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="shrink-0 border border-border px-2 py-1 font-mono text-xs text-muted active:scale-95"
        >
          Cerrar
        </button>
      </div>
      <div className="mt-3">
        <AccionesTab
          ficha={ficha}
          historial={historial}
          setHistorial={setHistorial}
          memoria={memoria}
          setMemoria={setMemoria}
        />
      </div>
    </Modal>
  );
}
