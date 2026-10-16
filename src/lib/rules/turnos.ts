// El combate visto desde el centro de mando (E1d, docs/tareas.md "Centro de mando del
// máster"): cómo avanza el turno y cuándo se cierra la vuelta, lo que pinta el contador
// de rondas, el resumen al terminar y qué vida enseña la Mesa con un combate en curso.

// --- Avance del turno ---

export type PosicionTurno = { ronda: number; turnoIndex: number };
export type PasoDeTurno = PosicionTurno & { cierraVuelta: boolean };

// Pasar del último de la cola al primero cierra la vuelta: sube la ronda, y es el único
// momento en que bajan las rondas de los estados (decisión del usuario, 2026-10-16).
export function pasarTurno(actual: PosicionTurno, total: number): PasoDeTurno {
  if (total <= 0) return { ...actual, cierraVuelta: false };
  const siguiente = actual.turnoIndex + 1;
  const cierraVuelta = siguiente >= total;
  return {
    ronda: cierraVuelta ? actual.ronda + 1 : actual.ronda,
    turnoIndex: cierraVuelta ? 0 : siguiente,
    cierraVuelta,
  };
}

// --- Contador de rondas ---

export type Segmento = "hecho" | "actual" | "pendiente";

export function segmentosDeVuelta(total: number, turnoIndex: number): Segmento[] {
  return Array.from({ length: Math.max(0, total) }, (_, i) =>
    i < turnoIndex ? "hecho" : i === turnoIndex ? "actual" : "pendiente",
  );
}

// Qué celebra el contador al cambiar de posición: la vuelta cerrada (sube la ronda) o
// un turno normal. Sin posición anterior (primera pintada) o sin cambio, nada. Un
// combate nuevo (la ronda baja) cuenta como turno, no como vuelta.
export type CambioDeTurno = "vuelta" | "turno" | null;

export function cambioDeTurno(antes: PosicionTurno | null, ahora: PosicionTurno): CambioDeTurno {
  if (!antes) return null;
  if (antes.ronda === ahora.ronda && antes.turnoIndex === ahora.turnoIndex) return null;
  return ahora.ronda > antes.ronda ? "vuelta" : "turno";
}

// Pasado un minuto el reloj del turno se pinta en naranja.
export const TURNO_LENTO_MS = 60_000;

export function relojDeTurno(ms: number): { texto: string; lento: boolean } {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { texto: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`, lento: ms >= TURNO_LENTO_MS };
}

// --- Resumen al terminar ---

export type ResumenCombate = {
  // La ronda en la que se terminó (la empezada cuenta).
  rondas: number;
  // null si no se llegó a comenzar (no hay hora de inicio).
  duracionMs: number | null;
  jugadores: number;
  npcs: number;
  derrotados: number;
  // Acciones del registro del máster durante el combate que siguen sin deshacer.
  acciones: number;
};

export function resumenCombate(c: {
  ronda: number;
  iniciadoAt: Date | null;
  terminadoAt: Date | null;
  combatientes: { characterId: string | null; derrotado: boolean }[];
  acciones: number;
}): ResumenCombate {
  const jugadores = new Set(c.combatientes.flatMap((x) => (x.characterId ? [x.characterId] : []))).size;
  return {
    rondas: c.ronda,
    duracionMs:
      c.iniciadoAt && c.terminadoAt ? Math.max(0, c.terminadoAt.getTime() - c.iniciadoAt.getTime()) : null,
    jugadores,
    npcs: c.combatientes.filter((x) => x.characterId === null).length,
    derrotados: c.combatientes.filter((x) => x.derrotado).length,
    acciones: c.acciones,
  };
}

// "1 h 05 min", "12 min", "menos de 1 min".
export function duracionLegible(ms: number): string {
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "menos de 1 min";
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`;
}

// --- Vida en la Mesa con combate abierto ---

export type ParActualMax = { actual: number; max: number };
export type VidaMostrada = { vida: ParActualMax; fatiga: ParActualMax; deCombate: boolean };

export type FotoDeJugador = {
  orden: number;
  derrotado: boolean;
  pgActual: number;
  pgMax: number;
  fatigaActual: number;
  fatigaMax: number;
};

// La foto que enseña (y ajusta, pestaña Vida) la Mesa; null si no tiene ninguna.
export function fotoEnMesa<F extends FotoDeJugador>(fotos: F[]): F | null {
  if (fotos.length === 0) return null;
  return [...fotos].sort((a, b) => Number(b.derrotado === false) - Number(a.derrotado === false) || b.orden - a.orden)[0];
}

// Con un combate en curso en el que el jugador está en la cola, la Mesa enseña la vida
// del combate (su foto) y lo marca; si no, la de la ficha (decisión del usuario,
// 2026-10-16). Con varias filas (lo derrotaron y volvió a entrar), la que sigue en pie;
// entre iguales, la última de la cola.
export function vidaEnMesa(ficha: { vida: ParActualMax; fatiga: ParActualMax }, fotos: FotoDeJugador[]): VidaMostrada {
  const foto = fotoEnMesa(fotos);
  if (!foto) return { ...ficha, deCombate: false };
  return {
    vida: { actual: foto.pgActual, max: foto.pgMax },
    fatiga: { actual: foto.fatigaActual, max: foto.fatigaMax },
    deCombate: true,
  };
}
