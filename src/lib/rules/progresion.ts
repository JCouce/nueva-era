// Coste por nivel con el ajuste de especie, y progresión con XP tras aprobar
// (docs/sistema.md §2.5 y §14.6). El mismo coste rige en creación (pool de la
// letra) y con XP: subir de `desde` a `hasta` suma el coste de cada nivel.
//
//   AjusteCoste / AJUSTE_NEUTRO  el ajuste ya resuelto (especie.ts: ajustesDeCoste)
//   costeNivelHabilidad / costeNivelDisciplina  el coste de comprar justo el nivel N
//   costeSubidaXp                lo que cuesta en XP subir un rasgo varios niveles
//   costeSiguienteNivel          el siguiente nivel, su coste y la pista para la ficha
//
// Aquí no se lee el catálogo ni la especie: quien tiene la ficha resuelve el ajuste
// (servidor en actions.ts, cliente en resolverFicha) y lo pasa. Vive aparte de
// especie.ts para que creacion.ts y psionica.ts no arrastren el catálogo de especies.
import { HABILIDAD_MIN_ENTRENADA, type HabilidadId } from "./habilidades";
import type { DisciplinaId } from "../catalog/psionica";
import { costeMarginal, COSTE_FACTOR_ATRIBUTO, COSTE_FACTOR_HABILIDAD, COSTE_FACTOR_PSIONICA } from "./prioridad";

// `etiqueta`: la palabra corta de la pista ("casta", "arianyi", "Maolher"; "aumentos" o
// "casta y aumentos" con las rebajas de los aumentos, A1). `delta`: la suma de todo lo
// que toca esa habilidad (casta ±1, cada aumento −1); el coste nunca baja de 1.
export type AjusteHabilidad = { delta: number; etiqueta: string };

export type AjusteCoste = {
  // Casta de Manduk: −1 (mínimo 1) o +1 al coste de cada nivel de esa habilidad. Con la
  // ficha aprobada se suman las rebajas de los aumentos (ajusteCosteConAumentos).
  habilidades: Partial<Record<HabilidadId, AjusteHabilidad>>;
  // Arianyi: el nivel 1 de cada disciplina cuesta esto en vez de 3.
  psionicaNivel1: { coste: number; etiqueta: string } | null;
  // Maolher: se suma al coste de cada nivel de cualquier disciplina (−1).
  psionicaPorNivel: { delta: number; etiqueta: string } | null;
};

// Sin especie, especie sin ajustes y NPC (edición libre, §14.3).
export const AJUSTE_NEUTRO: AjusteCoste = { habilidades: {}, psionicaNivel1: null, psionicaPorNivel: null };

export function costeNivelHabilidad(nivel: number, ajuste: AjusteHabilidad | undefined): number {
  const base = costeMarginal(nivel, COSTE_FACTOR_HABILIDAD);
  if (base === 0 || !ajuste) return base;
  return Math.max(1, base + ajuste.delta);
}

// Nivel 1 sustituido (Arianyi) y delta por nivel (Maolher) no coinciden en ninguna
// especie; si un día lo hicieran, el delta se aplica también sobre el nivel 1.
export function costeNivelDisciplina(nivel: number, ajuste: AjusteCoste): number {
  if (nivel <= 0) return 0;
  const base =
    nivel === 1 && ajuste.psionicaNivel1 ? ajuste.psionicaNivel1.coste : costeMarginal(nivel, COSTE_FACTOR_PSIONICA);
  return base + (ajuste.psionicaPorNivel?.delta ?? 0);
}

export type RasgoProgresion =
  | { tipo: "atributo" }
  | { tipo: "habilidad"; id: HabilidadId }
  | { tipo: "disciplina"; id: DisciplinaId };

function costeNivel(rasgo: RasgoProgresion, nivel: number, ajuste: AjusteCoste): number {
  switch (rasgo.tipo) {
    case "atributo":
      return costeMarginal(nivel, COSTE_FACTOR_ATRIBUTO); // sin ajuste por especie (§14.2)
    case "habilidad":
      return costeNivelHabilidad(nivel, ajuste.habilidades[rasgo.id]);
    case "disciplina":
      return costeNivelDisciplina(nivel, ajuste);
  }
}

// Coste total en XP para subir de `desde` a `hasta` (ambos inclusive del lado alto).
export function costeSubidaXp(
  rasgo: RasgoProgresion,
  desde: number,
  hasta: number,
  ajuste: AjusteCoste,
): number {
  let total = 0;
  for (let nivel = desde + 1; nivel <= hasta; nivel++) total += costeNivel(rasgo, nivel, ajuste);
  return total;
}

const signo = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "±0");

function pista(rasgo: RasgoProgresion, nivel: number, ajuste: AjusteCoste): string | null {
  switch (rasgo.tipo) {
    case "atributo":
      return null;
    case "habilidad": {
      const a = ajuste.habilidades[rasgo.id];
      return a ? `${signo(a.delta)} ${a.etiqueta}` : null;
    }
    case "disciplina": {
      const partes: string[] = [];
      if (nivel === 1 && ajuste.psionicaNivel1)
        partes.push(`nivel 1 a ${ajuste.psionicaNivel1.coste} (${ajuste.psionicaNivel1.etiqueta})`);
      if (ajuste.psionicaPorNivel) partes.push(`${signo(ajuste.psionicaPorNivel.delta)} ${ajuste.psionicaPorNivel.etiqueta}`);
      return partes.length ? partes.join(" · ") : null;
    }
  }
}

// El nivel que se compraría al pulsar "+", lo que cuesta (puntos en creación, XP
// aprobada: es el mismo número) y la pista del ajuste, o null si no hay. Una
// habilidad sin entrenar salta directa al nivel 1 (no existe el 0).
export function costeSiguienteNivel(
  rasgo: RasgoProgresion,
  actual: number,
  ajuste: AjusteCoste,
): { nivel: number; coste: number; pista: string | null } {
  const nivel = rasgo.tipo === "habilidad" && actual < HABILIDAD_MIN_ENTRENADA ? HABILIDAD_MIN_ENTRENADA : actual + 1;
  return { nivel, coste: costeNivel(rasgo, nivel, ajuste), pista: pista(rasgo, nivel, ajuste) };
}
