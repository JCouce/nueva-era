// Los estados guardados (E1a, docs/tareas.md "Centro de mando del máster"): los de un
// jugador viven en Character.estados, escritos solo por el máster (como xp/créditos,
// traspaso.md §9); los de un NPC, en su Combatiente.estados. Los dos son Json con
// EstadoActivo[] y se leen con el mismo lector tolerante.
import { estadoPorId } from "../catalog/estados";
import { descontarDuracion, type EstadoActivo } from "./estados";

// Tope de cordura para una duración en rondas: más que esto es un dato roto.
export const MAX_RONDAS_ESTADO = 999;

function rondasValidas(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= MAX_RONDAS_ESTADO;
}

// Nunca revienta: lo que no es una lista da []; una entrada sin ids, o con un estado o
// grado que ya no existe en el catálogo, se descarta; una duración que no se entiende
// queda como "hasta quitarlo" (que el máster lo vea y lo quite, mejor que perderlo). Un
// estadoId repetido se queda con la última entrada, como al aplicarlo dos veces.
export function leerEstados(json: unknown): EstadoActivo[] {
  if (!Array.isArray(json)) return [];
  const porId = new Map<string, EstadoActivo>();
  for (const e of json) {
    if (typeof e !== "object" || e === null) continue;
    const { estadoId, gradoId, rondasRestantes, finDeEscena } = e as Record<string, unknown>;
    if (typeof estadoId !== "string" || typeof gradoId !== "string") continue;
    if (!estadoPorId(estadoId)?.grados.some((g) => g.id === gradoId)) continue;
    const activo: EstadoActivo = rondasValidas(rondasRestantes)
      ? { estadoId, gradoId, rondasRestantes }
      : rondasRestantes == null && finDeEscena === true
        ? { estadoId, gradoId, rondasRestantes: null, finDeEscena: true }
        : { estadoId, gradoId, rondasRestantes: null };
    porId.delete(estadoId);
    porId.set(estadoId, activo);
  }
  return [...porId.values()];
}

// Un solo grado de cada estado a la vez: aplicar uno que ya estaba sustituye al
// anterior (mismo criterio que la consola de combate desde la fase 6b).
export function ponerEstado(activos: EstadoActivo[], nuevo: EstadoActivo): EstadoActivo[] {
  return [...activos.filter((e) => e.estadoId !== nuevo.estadoId), nuevo];
}

export function quitarEstado(activos: EstadoActivo[], estadoId: string): EstadoActivo[] {
  return activos.filter((e) => e.estadoId !== estadoId);
}

// Lo que escribe "Siguiente turno" en una fila: null si no había nada que descontar
// (no hace falta tocarla). Ojo: "tenía algo" es la condición, no "cambió de tamaño":
// pasar de 3 a 2 rondas es un cambio aunque no se caiga ninguno. Los de escena y los
// de "hasta quitarlo" no bajan (descontarDuracion no toca rondasRestantes null).
export function estadosTrasTurno(json: unknown): EstadoActivo[] | null {
  const activos = leerEstados(json);
  return activos.length === 0 ? null : descontarDuracion(activos);
}

// Un solo sitio para los estados de un jugador, también en combate: los de su ficha
// (`character`, la fila de Character que trae el include). Lo que hubiera en su
// Combatiente.estados (combates abiertos antes de E1a) se ignora, no se migra ni se
// suma (decisión del usuario, 2026-10-16). Un NPC, los de su fila.
export function estadosDeCombatiente(c: {
  characterId: string | null;
  estados: unknown;
  character: { estados: unknown } | null;
}): EstadoActivo[] {
  if (c.characterId === null) return leerEstados(c.estados);
  return leerEstados(c.character?.estados);
}
