// Los estados guardados (E1a, docs/tareas.md "Centro de mando del máster"): los de un
// jugador viven en Character.estados, escritos solo por el máster (como xp/créditos,
// traspaso.md §9); los de un NPC, en su Combatiente.estados. Los dos son Json con
// EstadoActivo[] y se leen con el mismo lector tolerante.
import { estadoPorId } from "../catalog/estados";
import { descontarDuracion, type EstadoActivo } from "./estados";
import type { OperacionEstado } from "./vidaPorEstados";

// Tope de cordura para una duración en rondas: más que esto es un dato roto.
export const MAX_RONDAS_ESTADO = 999;

function rondasValidas(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= MAX_RONDAS_ESTADO;
}

// `cubre` (Estabilizado): ids de estado del catálogo, sin repetir y hasta un tope; otra cosa se
// descarta (sin `cubre`, el estado no cubre ninguno).
const MAX_CUBRE = 40;
function leerCubre(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  return [...new Set(v.filter((x): x is string => typeof x === "string" && estadoPorId(x) !== null))].slice(0, MAX_CUBRE);
}

// `valor` (T4): entero y acotado; `nota`: texto corto. Lo que no encaja se descarta.
export const MAX_VALOR_ESTADO = 99;
export const MAX_NOTA_ESTADO = 60;
function valorValido(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && Math.abs(v) <= MAX_VALOR_ESTADO;
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
    const { estadoId, gradoId, rondasRestantes, finDeEscena, forzado, cubre, valor, nota } = e as Record<string, unknown>;
    if (typeof estadoId !== "string" || typeof gradoId !== "string") continue;
    if (!estadoPorId(estadoId)?.grados.some((g) => g.id === gradoId)) continue;
    const activo: EstadoActivo = rondasValidas(rondasRestantes)
      ? { estadoId, gradoId, rondasRestantes }
      : rondasRestantes == null && finDeEscena === true
        ? { estadoId, gradoId, rondasRestantes: null, finDeEscena: true }
        : { estadoId, gradoId, rondasRestantes: null };
    porId.delete(estadoId);
    const cubiertos = leerCubre(cubre);
    porId.set(estadoId, {
      ...activo,
      ...(forzado === true && { forzado: true as const }),
      ...(cubiertos && { cubre: cubiertos }),
      ...(valorValido(valor) && { valor }),
      ...(typeof nota === "string" && nota.length > 0 && { nota: nota.slice(0, MAX_NOTA_ESTADO) }),
    });
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

// Lo que escribe "Siguiente turno" en una fila al cerrar la vuelta (S77): null si no
// había nada que descontar (no hace falta tocarla). Ojo: "tenía algo" es la condición,
// no "cambió de tamaño": pasar de 3 a 2 rondas es un cambio aunque no se caiga ninguno.
// Los de escena y los de "hasta quitarlo" no bajan (descontarDuracion no toca
// rondasRestantes null).
export function estadosAlCerrarVuelta(json: unknown): EstadoActivo[] | null {
  const activos = leerEstados(json);
  return activos.length === 0 ? null : descontarDuracion(activos);
}

// "Limpiar estados" sobre un NPC: sin ninguno, o null si ya no tenía (no hay que escribir).
export function sinEstados(json: unknown): EstadoActivo[] | null {
  return leerEstados(json).length > 0 ? [] : null;
}

// Poner o quitar un estado a un NPC (su Combatiente.estados): sin vida que restar (su
// foto no recalcula el máximo con estados). null si quitar no cambia nada.
export function estadosDeNpcTras(json: unknown, op: OperacionEstado): EstadoActivo[] | null {
  const activos = leerEstados(json);
  if (op.tipo === "poner") return ponerEstado(activos, op.estado);
  return activos.some((e) => e.estadoId === op.estadoId) ? quitarEstado(activos, op.estadoId) : null;
}

// Lo que guarda el registro del máster de un NPC al ponerle o quitarle un estado desde el panel
// de mando del combate (td-20), para que "Deshacer" se lo devuelva como a los jugadores: el
// estado antes y después en su fila (null = no lo tenía / ya no lo tiene). Sin vida restada.
// `nombre`: el de la fila, para el texto del registro (un NPC no tiene ficha de donde leerlo).
export type CambioEstadoNpc = {
  combatienteId: string;
  nombre: string;
  estadoId: string;
  antes: EstadoActivo | null;
  despues: EstadoActivo | null;
};

// estadosDeNpcTras con el cambio para el registro. null si no cambia nada.
export function operacionEstadoNpc(
  fila: { id: string; nombre: string; estados: unknown },
  op: OperacionEstado,
): { estados: EstadoActivo[]; cambio: CambioEstadoNpc } | null {
  const estados = estadosDeNpcTras(fila.estados, op);
  if (!estados) return null;
  const estadoId = op.tipo === "poner" ? op.estado.estadoId : op.estadoId;
  const antes = leerEstados(fila.estados).find((e) => e.estadoId === estadoId) ?? null;
  const despues = estados.find((e) => e.estadoId === estadoId) ?? null;
  return { estados, cambio: { combatienteId: fila.id, nombre: fila.nombre, estadoId, antes, despues } };
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
