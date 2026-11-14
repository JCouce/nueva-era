// Pestaña Vida del centro de mando del máster: daño o curación de vida o fatiga a
// varios objetivos a la vez (fichas en la Mesa, fotos de combate en la consola).
// Las tres categorías de daño restan de los mismos PG (docs/sistema.md §7): hay una sola
// cantidad, el signo lo pone el modo (daño resta, curación suma) y, en la vida, la
// categoría dice a qué parte del desglose va (daño) o de cuál sale (curación).
// El tope es el de siempre (vidaTrasAjuste): suelo 0; la curación topa en el máximo que se ve
// (td-12): en la ficha, topesDeVida con sus estados; en la foto, pgMax/fatigaMax. Cómo se registra y se
// deshace: registro.ts (tipo "vida").
import { umbralVital, type AjusteUmbral, type UmbralVital } from "./estados";
import { vidaTrasAjuste } from "./vitalidad";
import { ajustarDanioVital, normalizarDanio, type CategoriaDanio, type DanioVida } from "./danio";

export type RecursoVital = "vida" | "fatiga";
export type ModoVida = "danio" | "curacion";

// `max`: el que se enseña y contra el que se miden los umbrales; `tope`: hasta dónde
// sube una curación. Desde td-12 los dos coinciden (en la ficha, topesDeVida con sus estados;
// en la foto, su máximo); `tope` sigue aparte porque lo da quien lee el objetivo.
// `danio` (solo vida): el desglose de lo perdido contra `tope`.
// `ajuste`: la reducción de penalizador de ese recurso (FichaResuelta.ajusteUmbrales.salud o
// .fatiga: Guerrero, Siervo, aumentos), la misma que aplica la ficha; sin él, el −N base.
export type VitalDeObjetivo = { actual: number; max: number; tope: number; danio?: DanioVida; ajuste?: AjusteUmbral | null };

export const deltaDeModo = (modo: ModoVida, cantidad: number) => (modo === "danio" ? -cantidad : cantidad);

// Ajuste de un objetivo: con desglose y categoría, el daño (delta < 0) entra en esa
// categoría y la curación (delta > 0) sale solo de ella; sin categoría, el de siempre
// (vidaTrasAjuste) y el desglose se normaliza (daño letal, cura de lo más leve).
export function ajustarVidaDeObjetivo(
  v: { actual: number; tope: number; danio?: DanioVida },
  delta: number,
  categoria?: CategoriaDanio,
): { despues: number; danio?: DanioVida } {
  if (v.danio && categoria) {
    const r = ajustarDanioVital({ actual: v.actual, tope: v.tope, danio: v.danio }, categoria, -delta);
    return { despues: r.actual, danio: r.danio };
  }
  const despues = vidaTrasAjuste(v.actual, v.tope, delta);
  return v.danio ? { despues, danio: normalizarDanio(v.danio, Math.max(0, v.tope - despues)) } : { despues };
}

export type PreviaVida = {
  antes: number;
  despues: number;
  max: number;
  umbralAntes: UmbralVital | null;
  umbralDespues: UmbralVital | null;
  // Entra, sale o cambia de umbral.
  cambiaUmbral: boolean;
  // Con desglose (vida): cómo queda, para la vista previa.
  danioDespues?: DanioVida;
};

export function previaAjusteVida(
  v: VitalDeObjetivo,
  recurso: RecursoVital,
  delta: number,
  categoria?: CategoriaDanio,
): PreviaVida {
  const r = ajustarVidaDeObjetivo(recurso === "vida" ? v : { actual: v.actual, tope: v.tope }, delta, categoria);
  const despues = r.despues;
  const umbralAntes = umbralVital(recurso, v.actual, v.max, v.ajuste ?? null);
  const umbralDespues = umbralVital(recurso, despues, v.max, v.ajuste ?? null);
  return {
    antes: v.actual,
    despues,
    max: v.max,
    umbralAntes,
    umbralDespues,
    cambiaUmbral: (umbralAntes?.id ?? null) !== (umbralDespues?.id ?? null),
    danioDespues: r.danio,
  };
}

// "Herido (−1)"; con ajuste, "Herido (−0 · Guerrero)"; sin umbral, "sin penalizador".
export function textoUmbral(u: UmbralVital | null): string {
  if (!u) return "sin penalizador";
  return `${u.etiqueta} (−${Math.abs(u.penalizador)}${u.fuenteAjuste ? ` · ${u.fuenteAjuste}` : ""})`;
}
