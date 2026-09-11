"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Fase 6b, subtarea 4.1 (D3: polling inteligente para empezar, no
// websockets — es mesa física, no hace falta latencia de videojuego
// online). Compartido entre la consola del máster (CombateConsole.tsx) y
// la ficha del jugador (CharacterSheet.tsx): refresca los Server Components
// de la ruta actual cada `intervaloMs` mientras `activo` sea true, y se
// calla del todo si la pestaña está en background
// (document.visibilitychange) — nadie gasta peticiones por un combate que
// nadie está mirando. `router.refresh()` (no un fetch propio) porque ambas
// páginas ya son Server Components que leen el Combate EN_CURSO directo de
// Prisma — refrescar vuelve a correr ese fetch, no hace falta duplicar la
// query en el cliente.
export function usePollingCombate(activo: boolean, intervaloMs = 4000) {
  const router = useRouter();

  useEffect(() => {
    if (!activo) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;
    const iniciar = () => {
      if (intervalId !== null) return;
      intervalId = setInterval(() => router.refresh(), intervaloMs);
    };
    const detener = () => {
      if (intervalId === null) return;
      clearInterval(intervalId);
      intervalId = null;
    };
    const alCambiarVisibilidad = () => {
      if (document.hidden) detener();
      else iniciar();
    };

    if (!document.hidden) iniciar();
    document.addEventListener("visibilitychange", alCambiarVisibilidad);

    return () => {
      detener();
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    };
  }, [activo, intervaloMs, router]);
}
