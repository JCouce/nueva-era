// Point-buy de creación: cuánto cuesta cada cosa y las operaciones que modifican
// la ficha. Todas son puras y las ejecuta tanto el servidor (autoridad) como el
// cliente (estado optimista). Fuente: docs/sistema.md §2 y §3.
import { ATRIBUTOS, ATRIBUTO_MIN, ATRIBUTO_MAX_CREACION, type AtributoId } from "./atributos";
import {
  HABILIDADES,
  HABILIDAD_NO_ENTRENADA,
  HABILIDAD_MIN_ENTRENADA,
  HABILIDAD_MAX_CREACION,
  COSTE_ESPECIALIDAD_EXTRA,
  MAX_ESPECIALIDADES,
  type HabilidadId,
} from "./habilidades";
import { clampInt, defaultSheet, type Sheet } from "./sheet";
import {
  costeTotal,
  setLetra,
  PUNTOS_ATRIBUTOS_POR_LETRA,
  PUNTOS_HABILIDADES_POR_LETRA,
  COSTE_FACTOR_ATRIBUTO,
  COSTE_FACTOR_HABILIDAD,
  type CategoriaPrioridad,
  type LetraPrioridad,
} from "./prioridad";

// Wrapper a nivel de ficha: setLetra (prioridad.ts) opera sobre el objeto
// Prioridades solo; esto lo engancha a la Sheet completa, que es lo que
// manejan las acciones y el resto de este módulo.
export function setPrioridad(
  sheet: Sheet,
  categoria: CategoriaPrioridad,
  letra: LetraPrioridad | null,
): Sheet {
  return { ...sheet, prioridades: setLetra(sheet.prioridades, categoria, letra) };
}

// El presupuesto de creación ya no es una constante: lo fija la letra de
// prioridad elegida para esa categoría. Sin letra asignada, no hay nada que
// gastar todavía — es preferible a inventar un pool por defecto.
export function presupuestoAtributos(sheet: Sheet): number {
  const letra = sheet.prioridades.atributos;
  return letra ? PUNTOS_ATRIBUTOS_POR_LETRA[letra] : 0;
}
export function presupuestoHabilidades(sheet: Sheet): number {
  const letra = sheet.prioridades.habilidades;
  return letra ? PUNTOS_HABILIDADES_POR_LETRA[letra] : 0;
}

// Coste de un atributo: triangular (docs/sistema.md, "Coste y progresión",
// Nivel × 2). Bajar a -1 sigue devolviendo 1 punto (FIRME · HOJA, sin tocar
// por HOJA2), así que un -1 cuenta como gasto negativo, no como coste 0.
// Exportada: la reutiliza npc.ts (métrica de "Poder") sin duplicar la regla.
export function costeAtributo(valor: number): number {
  if (valor <= ATRIBUTO_MIN) return -1;
  return costeTotal(valor, COSTE_FACTOR_ATRIBUTO);
}

export function puntosAtributosGastados(sheet: Sheet): number {
  return ATRIBUTOS.reduce((total, a) => total + costeAtributo(sheet.atributos[a.id]), 0);
}
export function puntosAtributosDisponibles(sheet: Sheet): number {
  return presupuestoAtributos(sheet) - puntosAtributosGastados(sheet);
}

// Coste de una habilidad: triangular (Nivel × 1). La primera especialidad va
// incluida al entrenar; a partir de la segunda cuesta 1 punto cada una.
export function costeHabilidad(valor: number, especialidades: number): number {
  if (valor < HABILIDAD_MIN_ENTRENADA) return 0;
  return costeTotal(valor, COSTE_FACTOR_HABILIDAD) + Math.max(0, especialidades - 1) * COSTE_ESPECIALIDAD_EXTRA;
}

export function puntosHabilidadesGastados(sheet: Sheet): number {
  return HABILIDADES.reduce((total, h) => {
    const { valor, especialidades } = sheet.habilidades[h.id];
    return total + costeHabilidad(valor, especialidades.length);
  }, 0);
}
export function puntosHabilidadesDisponibles(sheet: Sheet): number {
  return presupuestoHabilidades(sheet) - puntosHabilidadesGastados(sheet);
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
