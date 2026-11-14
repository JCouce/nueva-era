"use client";

import { useMemo, useState } from "react";
import { vidaTrasAjuste, type DanioTirada, type Sheet, type TiradaNueva, type EstadoActivo, type GolpeRecibido, type OperacionEstadoDePoder, type VitalidadActual } from "@/lib/rules";
import { Modal } from "@/components/Modal";
import { AccionesTab } from "@/app/characters/[id]/_components/AccionesTab";
import { useFichaResuelta } from "@/hooks/useFichaResuelta";
import type { Lanzamiento } from "@/components/ResultadoTirada";
import type { ResultadoRecibir } from "@/app/characters/[id]/_components/ResistirDanioModal";
import { deshacerRegistroAction } from "../actions";
import { ajustarVidaEnCombateAction, anotarDanioTiradaAction, estadoDePoderNpcAction, registrarTiradaAction } from "./actions";

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
  combatienteId,
  nombre,
  sheet,
  estadosCombate,
  pgActual,
  pgMax,
  fatigaActual,
  fatigaMax,
  onCerrar,
}: {
  // Su fila en la cola: ahí van los estados propios de sus poderes (estadoDePoderNpcAction).
  combatienteId: string;
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
  // Estados propios de sus poderes (Contención, Aturdido de Retrocognición, Estabilizado): los
  // pone y quita el servidor en su fila, como los que pone el máster; llegan con la consola
  // revalidada.
  const estadoDePoder = (op: OperacionEstadoDePoder, onMensaje: (m: string) => void) => {
    void estadoDePoderNpcAction(combatienteId, op).then((res) => {
      if (!res.ok) onMensaje(res.error);
      else if (res.mensaje) onMensaje(res.mensaje);
    });
  };
  // «Recibir» en Resistir daño (T2): la vida de su fila, con la acción de la pestaña Vida (con
  // registro, que es lo que deshace). TODO(revisar): el blindaje perdido del NPC no se apunta
  // (su ficha es la foto congelada de la fila, Combatiente.sheet, y no hay acción que la
  // reescriba); el modal avisa de apuntarlo a mano.
  const recibirDanio = async (golpe: GolpeRecibido): Promise<ResultadoRecibir> => {
    const vida = pgActual - vidaTrasAjuste(pgActual, pgMax, -golpe.cantidad);
    const aplicado = { categoria: golpe.categoria, vida, blindaje: 0 };
    if (golpe.cantidad === 0) return { ok: true, aplicado, deshacer: async () => null };
    const res = await ajustarVidaEnCombateAction({
      combatienteIds: [combatienteId],
      recurso: "vida",
      cantidad: -golpe.cantidad,
      categoria: golpe.categoria,
    });
    if (!res.ok) return res;
    const registroId = res.registroId;
    return {
      ok: true,
      aplicado,
      deshacer: async () => {
        if (!registroId) return null;
        const d = await deshacerRegistroAction(registroId);
        return d.ok ? null : d.error;
      },
    };
  };
  // Sus tiradas, a su fila de la consola (por ronda). En segundo plano: si no llegan, la tirada
  // aquí sigue igual.
  const destino = { tipo: "npc" as const, combatienteId };
  const tiradaHecha = (tirada: TiradaNueva) => void registrarTiradaAction(destino, tirada).catch(() => undefined);
  const danioTirado = (id: string, danio: DanioTirada) =>
    void anotarDanioTiradaAction(destino, id, danio).catch(() => undefined);
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
          onEstadoDePoder={estadoDePoder}
          onRecibirDanio={recibirDanio}
          onTiradaHecha={tiradaHecha}
          onDanioTirado={danioTirado}
        />
      </div>
    </Modal>
  );
}
