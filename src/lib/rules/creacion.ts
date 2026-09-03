// Point-buy de creación: cuánto cuesta cada cosa y las operaciones que modifican
// la ficha. Todas son puras y las ejecuta tanto el servidor (autoridad) como el
// cliente (estado optimista). Fuente: docs/sistema.md §2 y §3.
import {
  ATRIBUTOS,
  ATRIBUTO_MIN,
  ATRIBUTO_MAX_CREACION,
  PUNTOS_ATRIBUTOS,
  type AtributoId,
} from "./atributos";
import {
  HABILIDADES,
  HABILIDAD_NO_ENTRENADA,
  HABILIDAD_MIN_ENTRENADA,
  HABILIDAD_MAX_CREACION,
  PUNTOS_HABILIDADES,
  COSTE_ESPECIALIDAD_EXTRA,
  MAX_ESPECIALIDADES,
  type HabilidadId,
} from "./habilidades";
import { clampInt, defaultSheet, type Sheet } from "./sheet";

// El coste de un atributo es su propio valor; el -1 devuelve un punto.
export function puntosAtributosGastados(sheet: Sheet): number {
  return ATRIBUTOS.reduce((total, a) => total + sheet.atributos[a.id], 0);
}
export function puntosAtributosDisponibles(sheet: Sheet): number {
  return PUNTOS_ATRIBUTOS - puntosAtributosGastados(sheet);
}

// Supuesto S1 de docs/sistema.md: la hoja no dice el coste de las habilidades,
// se asume lineal como en atributos. La primera especialidad va incluida.
export function costeHabilidad(valor: number, especialidades: number): number {
  if (valor < HABILIDAD_MIN_ENTRENADA) return 0;
  return valor + Math.max(0, especialidades - 1) * COSTE_ESPECIALIDAD_EXTRA;
}

export function puntosHabilidadesGastados(sheet: Sheet): number {
  return HABILIDADES.reduce((total, h) => {
    const { valor, especialidades } = sheet.habilidades[h.id];
    return total + costeHabilidad(valor, especialidades.length);
  }, 0);
}
export function puntosHabilidadesDisponibles(sheet: Sheet): number {
  return PUNTOS_HABILIDADES - puntosHabilidadesGastados(sheet);
}

// ── Operaciones ────────────────────────────────────────────────────
// Cada una fija un valor objetivo y rechaza el cambio si dejaría el pool en
// negativo. Bajar siempre vale: el respec es gratis.

export function setAtributoValue(
  sheet: Sheet,
  id: AtributoId,
  value: number,
): Sheet {
  const v = clampInt(value, ATRIBUTO_MIN, ATRIBUTO_MAX_CREACION, sheet.atributos[id]);
  const next: Sheet = { ...sheet, atributos: { ...sheet.atributos, [id]: v } };
  return puntosAtributosDisponibles(next) < 0 ? sheet : next;
}

export function setHabilidadValue(
  sheet: Sheet,
  id: HabilidadId,
  value: number,
): Sheet {
  const actual = sheet.habilidades[id];
  const v = clampInt(
    value,
    HABILIDAD_NO_ENTRENADA,
    HABILIDAD_MAX_CREACION,
    actual.valor,
  );
  // 0 no es un estado válido: o está sin entrenar (-1) o vale al menos 1.
  const valor = v < HABILIDAD_MIN_ENTRENADA ? HABILIDAD_NO_ENTRENADA : v;
  const especialidades = valor < HABILIDAD_MIN_ENTRENADA ? [] : actual.especialidades;
  const next: Sheet = {
    ...sheet,
    habilidades: { ...sheet.habilidades, [id]: { valor, especialidades } },
  };
  return puntosHabilidadesDisponibles(next) < 0 ? sheet : next;
}

export function addEspecialidad(
  sheet: Sheet,
  id: HabilidadId,
  nombre: string,
): Sheet {
  const actual = sheet.habilidades[id];
  if (actual.valor < HABILIDAD_MIN_ENTRENADA) return sheet; // sin entrenar, no hay especialidad
  const limpio = nombre.trim().slice(0, 40);
  if (!limpio) return sheet;
  if (actual.especialidades.length >= MAX_ESPECIALIDADES) return sheet;
  if (actual.especialidades.some((e) => e.toLowerCase() === limpio.toLowerCase())) {
    return sheet;
  }
  const next: Sheet = {
    ...sheet,
    habilidades: {
      ...sheet.habilidades,
      [id]: { ...actual, especialidades: [...actual.especialidades, limpio] },
    },
  };
  return puntosHabilidadesDisponibles(next) < 0 ? sheet : next;
}

export function removeEspecialidad(
  sheet: Sheet,
  id: HabilidadId,
  nombre: string,
): Sheet {
  const actual = sheet.habilidades[id];
  return {
    ...sheet,
    habilidades: {
      ...sheet.habilidades,
      [id]: {
        ...actual,
        especialidades: actual.especialidades.filter((e) => e !== nombre),
      },
    },
  };
}

// Devuelve atributos y habilidades a cero. La identidad se conserva.
export function resetBuild(sheet: Sheet): Sheet {
  const base = defaultSheet();
  return {
    ...sheet,
    atributos: base.atributos,
    habilidades: base.habilidades,
  };
}
