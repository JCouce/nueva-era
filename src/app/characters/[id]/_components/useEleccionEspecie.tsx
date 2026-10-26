"use client";

import { useRef, useState } from "react";
import { eleccionCompleta, eleccionesIguales, faltaEnEleccion, type EleccionEspecie } from "@/lib/rules";
import { UsarModal } from "@/components/UsarModal";

// Texto fijo de docs/sistema.md §14.3.
const AVISO_RESET = "Cambiar de especie reseteará la ficha (todo salvo Personaje). ¿Seguir?";

// Borrador de especie → casta → linaje (§14.1), compartido por el selector compacto
// (NPC) y el carrusel de Origen. Solo llama a `onElegir` con una elección completa
// (elegirEspecie exige casta y, para noble, linaje) y distinta de la guardada; con
// `avisar`, pide confirmación antes. Quien lo usa se monta con `key` = elección
// guardada, así que cuando el servidor devuelve la ficha nueva el borrador se
// reinicia solo.
export function useEleccionEspecie({
  guardada,
  avisar,
  onElegir,
}: {
  guardada: EleccionEspecie;
  // hayQueAvisar: el cambio resetearía algo que el jugador ya ha comprado.
  avisar: boolean;
  onElegir: (eleccion: EleccionEspecie) => void;
}) {
  const [borrador, setBorrador] = useState<EleccionEspecie>(guardada);
  const [pendiente, setPendiente] = useState<EleccionEspecie | null>(null);
  // UsarModal llama a onUsar y luego a onCerrar: esto distingue confirmar de cancelar.
  const confirmado = useRef(false);

  const intentar = (nueva: EleccionEspecie) => {
    setBorrador(nueva);
    if (!eleccionCompleta(nueva) || eleccionesIguales(nueva, guardada)) return;
    if (avisar) setPendiente(nueva);
    else onElegir(nueva);
  };

  // Volver a la especie (o casta) guardada recupera lo que había debajo. Pulsar la
  // especie del borrador la quita (selector compacto; el carrusel no lo permite).
  const onEspecie = (id: string) => {
    if (borrador.especieId === id) return intentar({ especieId: null });
    intentar(id === guardada.especieId ? guardada : { especieId: id });
  };
  const onCasta = (id: string) => {
    const mismaGuardada = borrador.especieId === guardada.especieId && id === guardada.casta;
    intentar(mismaGuardada ? guardada : { especieId: borrador.especieId, casta: id });
  };
  const onLinaje = (id: string) => intentar({ ...borrador, linaje: id });

  // Solo con especie elegida: sin especie no falta nada que aplicar.
  const motivo = borrador.especieId ? faltaEnEleccion(borrador) : null;
  const falta = motivo ? `${motivo} para aplicar el cambio.` : null;

  const modal = pendiente && (
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
    />
  );

  return { borrador, falta, onEspecie, onCasta, onLinaje, modal };
}
