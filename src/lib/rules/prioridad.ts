// Creación por prioridad. Fuente: docs/sistema.md §2 ("Creación por prioridad") y
// CONV-4. Sustituye el pool plano de 10 puntos: cada categoría recibe una letra A-E,
// cada letra se usa una sola vez, y la letra fija el presupuesto de esa categoría.
// Confirmado por el diseñador: las 5 letras se reparten entre las 5 categorías sin
// repetir ninguna — igual que Shadowrun.
import type { Rareza } from "../catalog/equipo";

export const CATEGORIAS_PRIORIDAD = [
  "atributos",
  "habilidades",
  "dotes",
  "psionica",
  "recursos",
] as const;
export type CategoriaPrioridad = (typeof CATEGORIAS_PRIORIDAD)[number];

export const LETRAS_PRIORIDAD = ["A", "B", "C", "D", "E"] as const;
export type LetraPrioridad = (typeof LETRAS_PRIORIDAD)[number];

// Letra elegida por el jugador para cada categoría. null = todavía sin asignar.
export type Prioridades = Record<CategoriaPrioridad, LetraPrioridad | null>;

export function prioridadesVacias(): Prioridades {
  return { atributos: null, habilidades: null, dotes: null, psionica: null, recursos: null };
}

export const PUNTOS_ATRIBUTOS_POR_LETRA: Record<LetraPrioridad, number> = {
  A: 18,
  B: 14,
  C: 12,
  D: 10,
  E: 8,
};

export const PUNTOS_HABILIDADES_POR_LETRA: Record<LetraPrioridad, number> = {
  A: 18,
  B: 15,
  C: 12,
  D: 9,
  E: 6,
};

export const PUNTOS_PSIONICA_POR_LETRA: Record<LetraPrioridad, number> = {
  A: 18,
  B: 12,
  C: 9,
  D: 3,
  E: 0,
};

// S12: HOJA2 solo rellena la casilla E (0 puntos); A-D no aparecen en el documento.
// Pendiente de confirmar con el diseñador si faltan por transcribir o si Dotes no
// tiene pool propio fuera de E. No se inventa un número para las que faltan.
export const PUNTOS_DOTES_POR_LETRA: Partial<Record<LetraPrioridad, number>> = {
  E: 0,
};

// La rareza es el tope de lo que se puede equipar en creación (Tienda con
// créditos, docs/handoff.md §6): quien pone Recursos en E no puede equipar
// nada por encima de Común aunque encuentre el dinero, ni con la letra A se
// llega a Singular — el tope más alto de la tabla es Muy Extraño.
export const RECURSOS_POR_LETRA: Record<LetraPrioridad, { creditos: number; rareza: Rareza }> = {
  A: { creditos: 66000, rareza: "Muy Extraño" },
  B: { creditos: 41000, rareza: "Extraño" },
  C: { creditos: 27000, rareza: "Poco Habitual" },
  D: { creditos: 13000, rareza: "Poco Habitual" },
  E: { creditos: 1500, rareza: "Común" },
};

// Coste por nivel (docs/sistema.md, "Coste y progresión"): coste marginal = nivel ×
// factor. Rige tanto la compra en creación como subir de nivel después con XP.
export const COSTE_FACTOR_ATRIBUTO = 2;
export const COSTE_FACTOR_HABILIDAD = 1;
export const COSTE_FACTOR_PSIONICA = 3;

// Coste de comprar justo el nivel `nivel` (el paso nivel-1 → nivel).
export function costeMarginal(nivel: number, factor: number): number {
  return nivel <= 0 ? 0 : nivel * factor;
}

// Coste total acumulado de tener el rasgo en `valor` (triangular: 1+2+...+valor,
// multiplicado por el factor de la categoría). 0 para valor <= 0.
export function costeTotal(valor: number, factor: number): number {
  if (valor <= 0) return 0;
  return factor * ((valor * (valor + 1)) / 2);
}

export function letrasUsadas(prioridades: Prioridades): LetraPrioridad[] {
  return CATEGORIAS_PRIORIDAD.map((c) => prioridades[c]).filter(
    (l): l is LetraPrioridad => l !== null,
  );
}

export function letrasDisponibles(
  prioridades: Prioridades,
  categoria: CategoriaPrioridad,
): LetraPrioridad[] {
  const usadas = new Set(letrasUsadas(prioridades));
  const actual = prioridades[categoria];
  return LETRAS_PRIORIDAD.filter((l) => l === actual || !usadas.has(l));
}

export function repartoCompleto(prioridades: Prioridades): boolean {
  return letrasUsadas(prioridades).length === CATEGORIAS_PRIORIDAD.length;
}

export function setLetra(
  prioridades: Prioridades,
  categoria: CategoriaPrioridad,
  letra: LetraPrioridad | null,
): Prioridades {
  // Si la letra ya la tenía otra categoría, se la quita — un reparto válido nunca
  // repite letra, así que asignarla aquí implica soltarla de donde estuviera.
  const limpio: Prioridades = { ...prioridades };
  if (letra !== null) {
    for (const c of CATEGORIAS_PRIORIDAD) {
      if (c !== categoria && limpio[c] === letra) limpio[c] = null;
    }
  }
  limpio[categoria] = letra;
  return limpio;
}
