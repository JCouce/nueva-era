// Todo lo que se calcula y nunca se guarda: aplicados, salud, movimiento y el
// valor efectivo de una habilidad. Fuente: docs/sistema.md §2, §4 y §5.
import { APLICADOS, type AplicadoId } from "./atributos";
import {
  HABILIDAD_MIN_ENTRENADA,
  HABILIDAD_NO_ENTRENADA,
  type HabilidadId,
} from "./habilidades";
import type { Sheet } from "./sheet";

export function aplicado(sheet: Sheet, id: AplicadoId): number {
  const def = APLICADOS.find((a) => a.id === id)!;
  return sheet.atributos[def.de[0]] + sheet.atributos[def.de[1]];
}

export function aplicados(sheet: Sheet): Record<AplicadoId, number> {
  return Object.fromEntries(
    APLICADOS.map((a) => [a.id, sheet.atributos[a.de[0]] + sheet.atributos[a.de[1]]]),
  ) as Record<AplicadoId, number>;
}

export function salud(sheet: Sheet): { vida: number; fatiga: number } {
  return {
    vida: 8 + aplicado(sheet, "fortaleza"),
    fatiga: 8 + aplicado(sheet, "voluntad"),
  };
}

// Movimiento: todas las fórmulas cuelgan de Potencia + Atletismo.
// Con Potencia 0 y Atletismo sin entrenar (−1) la base es negativa y el salto
// vertical saldría en negativo, así que se corta en 0. Supuesto S6 de
// docs/sistema.md: el documento no dice qué pasa por debajo de cero.
export function movimiento(sheet: Sheet) {
  const base = aplicado(sheet, "potencia") + sheet.habilidades.atletismo.valor;
  const noNegativo = (n: number) => Math.max(0, n);
  return {
    carrera: noNegativo(15 + base), // metros
    saltoVertical: noNegativo(10 * base), // centímetros
    saltoHorizontal: noNegativo(150 + base * 60), // centímetros
    escalada: noNegativo(5 + Math.floor(base / 2)), // metros
    nado: noNegativo(5 + Math.floor(base / 2)), // metros
  };
}

// Valor efectivo de una habilidad: total en su especialidad, la mitad hacia
// arriba fuera de ella. Sin entrenar es -1 siempre.
export function valorEfectivo(
  sheet: Sheet,
  id: HabilidadId,
  enEspecialidad: boolean,
): number {
  const { valor } = sheet.habilidades[id];
  if (valor < HABILIDAD_MIN_ENTRENADA) return HABILIDAD_NO_ENTRENADA;
  return enEspecialidad ? valor : Math.ceil(valor / 2);
}
