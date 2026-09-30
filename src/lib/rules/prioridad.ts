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

// "S+": letra de PRUEBAS (usuario, 2026-09-30, temporal): puntos ilimitados y
// se puede repetir en todas las categorías. Se quitará.
export const LETRAS_PRIORIDAD = ["A", "B", "C", "D", "E", "S+"] as const;
export type LetraPrioridad = (typeof LETRAS_PRIORIDAD)[number];
export const LETRA_PRUEBAS = "S+" satisfies LetraPrioridad;

// Presupuestos ilimitados (S+) se pintan como ∞.
export function textoPuntos(n: number): string {
  return Number.isFinite(n) ? String(n) : "∞";
}

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
  "S+": Infinity,
};

export const PUNTOS_HABILIDADES_POR_LETRA: Record<LetraPrioridad, number> = {
  A: 18,
  B: 15,
  C: 12,
  D: 9,
  E: 6,
  "S+": Infinity,
};

export const PUNTOS_PSIONICA_POR_LETRA: Record<LetraPrioridad, number> = {
  A: 18,
  B: 12,
  C: 9,
  D: 3,
  E: 0,
  "S+": Infinity,
};

// S12: HOJA2 solo rellena la casilla E (0 puntos); A-D no aparecen en el documento.
// Pendiente de confirmar con el diseñador si faltan por transcribir o si Dotes no
// tiene pool propio fuera de E. No se inventa un número para las que faltan.
export const PUNTOS_DOTES_POR_LETRA: Partial<Record<LetraPrioridad, number>> = {
  E: 0,
  "S+": Infinity,
};

// La rareza es el tope de lo que se puede equipar en creación (Tienda con
// créditos, docs/traspaso.md §6): quien pone Recursos en E no puede equipar
// nada por encima de Común aunque encuentre el dinero, ni con la letra A se
// llega a Singular — el tope más alto de la tabla es Muy Extraño.
export const RECURSOS_POR_LETRA: Record<LetraPrioridad, { creditos: number; rareza: Rareza }> = {
  A: { creditos: 66000, rareza: "Muy Extraño" },
  B: { creditos: 41000, rareza: "Extraño" },
  C: { creditos: 27000, rareza: "Poco Habitual" },
  D: { creditos: 13000, rareza: "Poco Habitual" },
  E: { creditos: 1500, rareza: "Común" },
  // Los créditos son un entero en la base: "ilimitado" = mil millones.
  "S+": { creditos: 1_000_000_000, rareza: "Singular" },
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

// Incluye S+ tantas veces como se repita (el reparto completo cuenta categorías).
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
  return LETRAS_PRIORIDAD.filter((l) => l === actual || l === LETRA_PRUEBAS || !usadas.has(l));
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
  if (letra !== null && letra !== LETRA_PRUEBAS) {
    for (const c of CATEGORIAS_PRIORIDAD) {
      if (c !== categoria && limpio[c] === letra) limpio[c] = null;
    }
  }
  limpio[categoria] = letra;
  return limpio;
}
