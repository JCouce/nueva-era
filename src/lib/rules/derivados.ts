// Todo lo que se calcula y nunca se guarda: atributos efectivos, aplicados,
// salud, movimiento y el valor efectivo de una habilidad.
// Fuente: docs/sistema.md §2, §4 y §5.
import { APLICADOS, ATRIBUTOS, type AplicadoId, type AtributoId } from "./atributos";
import {
  HABILIDAD_MIN_ENTRENADA,
  HABILIDAD_NO_ENTRENADA,
  type HabilidadId,
} from "./habilidades";
import {
  bonoAtributo,
  bonoDerivado,
  bonoHabilidad,
  type ModificadorConFuente,
} from "./modificadores";
import { especiePorId } from "../catalog/especies";
import type { Sheet } from "./sheet";

// Los modificadores activos de una ficha. Hoy solo los aporta la especie;
// cuando existan dotes, aumentos, equipo y estados, se añaden aquí y todo lo
// demás sigue funcionando sin tocarse.
export function modificadoresActivos(sheet: Sheet): ModificadorConFuente[] {
  const especie = especiePorId(sheet.especieId);
  if (!especie) return [];
  return especie.modificadores.map((m) => ({
    ...m,
    origen: "especie" as const,
    fuente: especie.label,
  }));
}

// Atributo tal y como se usa en juego: lo comprado más lo que aporten las
// fuentes externas. OJO: el point-buy de creación trabaja siempre con los
// valores COMPRADOS (sheet.atributos), nunca con estos.
export function atributoEfectivo(
  sheet: Sheet,
  id: AtributoId,
  mods = modificadoresActivos(sheet),
): number {
  return sheet.atributos[id] + bonoAtributo(mods, id);
}

export function atributosEfectivos(
  sheet: Sheet,
  mods = modificadoresActivos(sheet),
): Record<AtributoId, number> {
  return Object.fromEntries(
    ATRIBUTOS.map((a) => [a.id, sheet.atributos[a.id] + bonoAtributo(mods, a.id)]),
  ) as Record<AtributoId, number>;
}

export function aplicado(
  sheet: Sheet,
  id: AplicadoId,
  mods = modificadoresActivos(sheet),
): number {
  const def = APLICADOS.find((a) => a.id === id)!;
  return (
    atributoEfectivo(sheet, def.de[0], mods) + atributoEfectivo(sheet, def.de[1], mods)
  );
}

export function aplicados(
  sheet: Sheet,
  mods = modificadoresActivos(sheet),
): Record<AplicadoId, number> {
  const efectivos = atributosEfectivos(sheet, mods);
  return Object.fromEntries(
    APLICADOS.map((a) => [a.id, efectivos[a.de[0]] + efectivos[a.de[1]]]),
  ) as Record<AplicadoId, number>;
}

export function salud(
  sheet: Sheet,
  mods = modificadoresActivos(sheet),
): { vida: number; fatiga: number } {
  return {
    vida: 8 + aplicado(sheet, "fortaleza", mods) + bonoDerivado(mods, "vida"),
    fatiga: 8 + aplicado(sheet, "voluntad", mods) + bonoDerivado(mods, "fatiga"),
  };
}

// Movimiento: todas las fórmulas cuelgan de Potencia + Atletismo.
// Con Potencia 0 y Atletismo sin entrenar (−1) la base es negativa y el salto
// vertical saldría en negativo, así que se corta en 0. Supuesto S6 de
// docs/sistema.md: el documento no dice qué pasa por debajo de cero.
export function movimiento(sheet: Sheet, mods = modificadoresActivos(sheet)) {
  const base =
    aplicado(sheet, "potencia", mods) +
    sheet.habilidades.atletismo.valor +
    bonoHabilidad(mods, "atletismo");
  const noNegativo = (n: number) => Math.max(0, n);
  return {
    carrera: noNegativo(15 + base + bonoDerivado(mods, "carrera")), // metros
    saltoVertical: noNegativo(10 * base), // centímetros
    saltoHorizontal: noNegativo(150 + base * 60), // centímetros
    escalada: noNegativo(5 + Math.floor(base / 2)), // metros
    nado: noNegativo(5 + Math.floor(base / 2)), // metros
  };
}

// Valor efectivo de una habilidad: total en su especialidad, la mitad hacia
// arriba fuera de ella. Sin entrenar es -1 siempre, aunque los modificadores
// externos sí se suman encima.
export function valorEfectivo(
  sheet: Sheet,
  id: HabilidadId,
  enEspecialidad: boolean,
  mods = modificadoresActivos(sheet),
): number {
  const { valor } = sheet.habilidades[id];
  const bono = bonoHabilidad(mods, id);
  if (valor < HABILIDAD_MIN_ENTRENADA) return HABILIDAD_NO_ENTRENADA + bono;
  return (enEspecialidad ? valor : Math.ceil(valor / 2)) + bono;
}
