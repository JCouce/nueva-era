// Alargar un estado propio pagando fatiga (ps-07 del cuestionario, usuario 2026-11-13): el
// Sondeo No-Local con crítico se prolonga «pagando la misma fatiga cada turno, sin volver a
// tirar». El estado guarda esa fatiga como su número (EstadoActivo.valor) y su catálogo dice
// cuántos turnos suma cada pulsación (Estado.prolongable). Lo aplica el servidor
// (aplicarConsecuenciaPropiaAction, tipo «prolongar»): cobro y estado, cada uno con su entrada
// en el registro del máster.
import { estadoPorId } from "../catalog/estados";
import { cruzaSobrecarga } from "./poderes";
import type { EstadoActivo } from "./estados";

export type Prolongacion =
  | { ok: true; coste: number; estado: EstadoActivo; fuente: string; avisos: string[] }
  | { ok: false; error: string };

// `fatiga`: la efectiva en juego (en combate, la de la foto) y su máximo.
// TODO(revisar): cruzar a exhausto al prolongar avisa de la sobrecarga, pero su salvación no
// sale aquí (se tira a mano) y no vuelve a saltar el sobreesfuerzo (como prolongar Proeza, S104).
export function prolongarEstado(
  estados: readonly EstadoActivo[],
  estadoId: string,
  fatiga: { efectiva: number; max: number },
): Prolongacion {
  const cat = estadoPorId(estadoId);
  const regla = cat?.prolongable;
  if (!cat || !regla) return { ok: false, error: "Ese estado no se puede prolongar." };
  const puesto = estados.find((e) => e.estadoId === estadoId);
  if (!puesto) return { ok: false, error: `Ya no llevas ${cat.label}.` };
  const coste = puesto.valor;
  if (coste === undefined) return { ok: false, error: `${cat.label} no guarda lo que cuesta prolongarlo.` };
  if (coste > fatiga.efectiva) {
    return { ok: false, error: `Te faltan ${coste - fatiga.efectiva} de fatiga (tienes ${fatiga.efectiva}, cuesta ${coste}).` };
  }
  const despues = fatiga.efectiva - coste;
  const cruza = cruzaSobrecarga(fatiga.efectiva, despues, fatiga.max);
  const avisos = [
    ...(cruza
      ? ["Quedas exhausto: salta la sobrecarga psiónica (inconsciente al terminar la acción; salvación de Fortaleza a mano)."]
      : []),
    ...(despues <= 0 && !cruza ? ["Te has quedado sin fatiga: quedas inconsciente al terminar la acción."] : []),
  ];
  // Sin rondas (fuera de combate no corren), sigue hasta quitarlo: se cobra igual.
  const rondas = puesto.rondasRestantes === null ? null : puesto.rondasRestantes + regla.turnos;
  return { ok: true, coste, estado: { ...puesto, rondasRestantes: rondas }, fuente: cat.label, avisos };
}
