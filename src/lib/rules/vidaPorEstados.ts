// Vida perdida al bajar el máximo (decisión del usuario 2026-10-16, supuesto S75 de
// docs/sistema.md): cuando poner un estado, o cambiarle el grado, baja la vida máxima,
// la vida actual baja lo mismo y se queda así. Es castigo: no vuelve al quitarse el
// estado ni al caerse por rondas. Igual con la fatiga. Si el máximo sube o no cambia,
// la actual no se toca. Suelo 0; llegar a 0 no hace nada solo (la inconsciencia la
// marca el máster).
//
// Fuera de combate se escribe en la ficha (vidaActual/fatigaActual). Si el jugador
// tiene fila en un combate abierto, además en su foto (pgActual/fatigaActual), y la
// foto recalcula su máximo con los estados nuevos (sube al quitar, sin tocar la actual).
import { resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";
import { ponerEstado, quitarEstado } from "./estadosFicha";
import type { EstadoActivo } from "./estados";
import { esEstadoDeAumento } from "../catalog/estados";
import type { Sheet } from "./sheet";
import { topesDeVida } from "./vitalidad";

export type ParVida = { vida: number; fatiga: number };

export function maximosConEstados(sheet: Sheet, estados: EstadoActivo[]): ParVida {
  return resolverFicha(sheet, { estados, vitalidad: VITALIDAD_DE_FICHA }).salud;
}

// Lo que baja cada máximo; 0 si sube o se queda igual.
export function bajadaDeMaximos(antes: ParVida, despues: ParVida): ParVida {
  return { vida: Math.max(0, antes.vida - despues.vida), fatiga: Math.max(0, antes.fatiga - despues.fatiga) };
}

// La foto de un jugador en un combate abierto (Combatiente).
export type FotoCombatiente = { id: string; pgActual: number; fatigaActual: number };
export type FotoCombatienteNueva = {
  id: string;
  pgActual: number;
  pgMax: number;
  fatigaActual: number;
  fatigaMax: number;
  // Lo que de verdad se restó (con el suelo de 0): es lo que devuelve deshacer.
  restado: ParVida;
};

export type CambioDeVida = {
  // La misma referencia si no se restó nada.
  sheet: Sheet;
  restado: ParVida;
  maximos: ParVida;
  combatientes: FotoCombatienteNueva[];
};

// Resta la bajada (S75) y, con `tope`, recorta además al máximo nuevo (A5b, activables).
function restar(actual: number, bajada: number, tope: number | null = null): { actual: number; restado: number } {
  const tras = Math.max(0, actual - bajada);
  const nuevo = tope !== null && tras > tope ? Math.max(0, tope) : tras;
  return { actual: nuevo, restado: actual - nuevo };
}

// Los activables de los aumentos (A5a: Neuroprótesis, +1 a Fuerza) suben el máximo mientras
// duran. No cuentan para la bajada: si no, activar y dejar que caduque costaría vida de verdad
// (al activar la actual no sube; al caerse, S75 restaría lo que bajó el máximo). El máximo que
// se escribe en las fotos sí los lleva.
// Recorte (usuario, 2026-10-22, A5b; cambia A5a): si al caerse, desactivarse o cambiar un
// activable la vida actual queda por encima del máximo nuevo, se recorta a él (como
// retirarPieza/reconciliarVida al desequipar). Igual la fatiga y las fotos. Solo cuando cambian
// los activables: un estado normal sigue con S75 y no toca la vida que esté por encima del
// máximo por otra vía (S74). Lo recortado cuenta como restado (deshacer lo devuelve).
// La ficha se recorta a su tope (topesDeVida: reposo más los activables que queden, el mismo
// al que cura); la foto, a su máximo con todos los estados, que es el suyo.
const sinActivables = (estados: EstadoActivo[]) => estados.filter((e) => !esEstadoDeAumento(e.estadoId));
const claveActivables = (estados: readonly EstadoActivo[]) =>
  estados
    .filter((e) => esEstadoDeAumento(e.estadoId))
    .map((e) => `${e.estadoId}:${e.gradoId}`)
    .sort()
    .join("|");

// Si entre dos listas de estados cambian los activables (alguno se pone, se cae o cambia de
// grado; las rondas no cuentan). Es cuando toca recortar.
export const cambianActivables = (antes: readonly EstadoActivo[], despues: readonly EstadoActivo[]) =>
  claveActivables(antes) !== claveActivables(despues);

export function vidaTrasCambioDeEstados(
  sheet: Sheet,
  antes: EstadoActivo[],
  despues: EstadoActivo[],
  combatientes: FotoCombatiente[] = [],
): CambioDeVida {
  const maximos = maximosConEstados(sheet, despues);
  const bajada = bajadaDeMaximos(
    maximosConEstados(sheet, sinActivables(antes)),
    maximosConEstados(sheet, sinActivables(despues)),
  );
  const recorta = cambianActivables(antes, despues);
  const tope = (n: number) => (recorta ? n : null);
  const topes = topesDeVida(sheet, despues);
  const vida = restar(sheet.vidaActual, bajada.vida, tope(topes.vida));
  const fatiga = restar(sheet.fatigaActual, bajada.fatiga, tope(topes.fatiga));
  const cambia = vida.restado > 0 || fatiga.restado > 0;
  return {
    sheet: cambia ? { ...sheet, vidaActual: vida.actual, fatigaActual: fatiga.actual } : sheet,
    restado: { vida: vida.restado, fatiga: fatiga.restado },
    maximos,
    combatientes: combatientes.map((c) => {
      const pg = restar(c.pgActual, bajada.vida, tope(maximos.vida));
      const fat = restar(c.fatigaActual, bajada.fatiga, tope(maximos.fatiga));
      return {
        id: c.id,
        pgActual: pg.actual,
        pgMax: maximos.vida,
        fatigaActual: fat.actual,
        fatigaMax: maximos.fatiga,
        restado: { vida: pg.restado, fatiga: fat.restado },
      };
    }),
  };
}

// --- Cobros desde la ficha con el jugador en combate (A5b, paso 0) ---

// En combate la vida y la fatiga que valen son las de la foto (Combatiente). Lo que la ficha
// cobra o suma por su cuenta (fatiga de acciones de aumento, casillas y poderes; Sanar letal)
// se lleva también a la foto: la misma diferencia, entre 0 y su máximo. Sin cambio, la foto
// no se toca (ni se recorta).
export type FotoConMaximos = FotoCombatiente & { pgMax: number; fatigaMax: number };
type ParActual = Pick<Sheet, "vidaActual" | "fatigaActual">;

export function fotoTrasCambioDeFicha<T extends FotoConMaximos>(foto: T, antes: ParActual, despues: ParActual): T {
  const dv = despues.vidaActual - antes.vidaActual;
  const df = despues.fatigaActual - antes.fatigaActual;
  if (dv === 0 && df === 0) return foto;
  // Restar: suelo 0. Sumar: hasta el máximo, sin bajar una actual que ya esté por encima.
  const mover = (actual: number, delta: number, max: number) =>
    delta < 0 ? Math.max(0, actual + delta) : delta > 0 ? Math.max(actual, Math.min(max, actual + delta)) : actual;
  return { ...foto, pgActual: mover(foto.pgActual, dv, foto.pgMax), fatigaActual: mover(foto.fatigaActual, df, foto.fatigaMax) };
}

// Devolver lo restado (deshacer): sube hasta el máximo, nunca baja. Si la actual ya
// está por encima del máximo (curó en reposo, S74), se queda como está.
export function devolverVida(actual: number, devuelta: number, max: number): number {
  return Math.max(actual, Math.min(max, actual + devuelta));
}

// --- Poner o quitar un estado a un personaje, con su vida ---

export type OperacionEstado =
  | { tipo: "poner"; estado: EstadoActivo }
  | { tipo: "quitar"; estadoId: string };

// Lo que guarda el registro del máster por personaje (registro.ts): el estado antes y
// después (null = no lo tenía / ya no lo tiene) y lo restado a la ficha y a cada foto.
export type CambioEstadoPersonaje = {
  characterId: string;
  estadoId: string;
  antes: EstadoActivo | null;
  despues: EstadoActivo | null;
  restado: ParVida;
  combatientes: { id: string; restado: ParVida }[];
};

export type ResultadoOperacionEstado = {
  estados: EstadoActivo[];
  vida: CambioDeVida;
  cambio: CambioEstadoPersonaje;
};

const estadoIdDe = (op: OperacionEstado) => (op.tipo === "poner" ? op.estado.estadoId : op.estadoId);

// null si no cambia nada (quitar un estado que no tenía).
export function aplicarOperacionEstado(
  personaje: { id: string; sheet: Sheet; estados: EstadoActivo[] },
  op: OperacionEstado,
  combatientes: FotoCombatiente[] = [],
): ResultadoOperacionEstado | null {
  const estadoId = estadoIdDe(op);
  const antes = personaje.estados.find((e) => e.estadoId === estadoId) ?? null;
  if (op.tipo === "quitar" && antes === null) return null;
  const estados = op.tipo === "poner" ? ponerEstado(personaje.estados, op.estado) : quitarEstado(personaje.estados, estadoId);
  const vida = vidaTrasCambioDeEstados(personaje.sheet, personaje.estados, estados, combatientes);
  return {
    estados,
    vida,
    cambio: {
      characterId: personaje.id,
      estadoId,
      antes,
      despues: op.tipo === "poner" ? op.estado : null,
      restado: vida.restado,
      combatientes: vida.combatientes.map((c) => ({ id: c.id, restado: c.restado })),
    },
  };
}

// --- Limpiar estados (antes "Terminar escena") ---

export type ResultadoLimpiarEstados = {
  estados: EstadoActivo[];
  // La misma referencia si no cambió (quitar no resta vida: solo puede subir el máximo).
  sheet: Sheet;
  // Las fotos con el máximo recalculado tras quitarlos todos.
  combatientes: FotoCombatienteNueva[];
  // Uno por estado quitado: lo que guarda la entrada `limpiar_estados` del registro.
  cambios: CambioEstadoPersonaje[];
};

// Quita a un personaje los estados que pasan el filtro (por defecto, todos), uno tras otro
// con la misma operación que "quitar" (así cada cambio se deshace igual). null si no
// tenía ninguno.
export function quitarEstadosDe(
  personaje: { id: string; sheet: Sheet; estados: EstadoActivo[] },
  combatientes: FotoCombatiente[] = [],
  filtro: (e: EstadoActivo) => boolean = () => true,
): ResultadoLimpiarEstados | null {
  const deEscena = personaje.estados.filter(filtro);
  if (deEscena.length === 0) return null;
  let actual = personaje;
  let fotos = combatientes;
  let fotosNuevas: FotoCombatienteNueva[] = [];
  const cambios: CambioEstadoPersonaje[] = [];
  for (const e of deEscena) {
    const r = aplicarOperacionEstado(actual, { tipo: "quitar", estadoId: e.estadoId }, fotos);
    if (!r) continue;
    actual = { ...actual, sheet: r.vida.sheet, estados: r.estados };
    fotosNuevas = r.vida.combatientes;
    fotos = fotosNuevas.map((f) => ({ id: f.id, pgActual: f.pgActual, fatigaActual: f.fatigaActual }));
    cambios.push(r.cambio);
  }
  return { estados: actual.estados, sheet: actual.sheet, combatientes: fotosNuevas, cambios };
}
