"use client";

import { useSyncExternalStore } from "react";

// La cabina de tres columnas de la ficha arranca en el `xl:` de Tailwind v4 (80rem). Para lo
// que el CSS solo no puede decidir: qué pestaña sale, qué se pinta una vez y no dos. En el
// servidor y en la hidratación da false (sin cabina).
const CONSULTA = "(min-width: 80rem)";

function suscribir(aviso: () => void) {
  const mq = window.matchMedia(CONSULTA);
  mq.addEventListener("change", aviso);
  return () => mq.removeEventListener("change", aviso);
}

export function useCabina() {
  return useSyncExternalStore(
    suscribir,
    () => window.matchMedia(CONSULTA).matches,
    () => false,
  );
}
