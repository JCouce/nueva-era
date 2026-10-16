// Pestaña Vida del centro de mando del máster: daño o curación de vida o fatiga a
// varios objetivos a la vez (fichas en la Mesa, fotos de combate en la consola).
// Las tres categorías de daño restan igual de los mismos PG (docs/sistema.md §7), así
// que aquí solo hay una cantidad; el signo lo pone el modo (daño resta, curación suma).
// El tope es el de siempre (vidaTrasAjuste): suelo 0; la curación topa en el máximo en
// reposo en la ficha (S74) y en pgMax/fatigaMax en la foto. Cómo se registra y se
// deshace: registro.ts (tipo "vida").
import { umbralVital, type UmbralVital } from "./estados";
import { vidaTrasAjuste } from "./vitalidad";

export type RecursoVital = "vida" | "fatiga";
export type ModoVida = "danio" | "curacion";

// `max`: el que se enseña y contra el que se miden los umbrales; `tope`: hasta dónde
// sube una curación (en la ficha, el máximo en reposo, que puede ser mayor que `max` si
// un estado lo ha bajado).
export type VitalDeObjetivo = { actual: number; max: number; tope: number };

export const deltaDeModo = (modo: ModoVida, cantidad: number) => (modo === "danio" ? -cantidad : cantidad);

export type PreviaVida = {
  antes: number;
  despues: number;
  max: number;
  umbralAntes: UmbralVital | null;
  umbralDespues: UmbralVital | null;
  // Entra, sale o cambia de umbral.
  cambiaUmbral: boolean;
};

export function previaAjusteVida(v: VitalDeObjetivo, recurso: RecursoVital, delta: number): PreviaVida {
  const despues = vidaTrasAjuste(v.actual, v.tope, delta);
  const umbralAntes = umbralVital(recurso, v.actual, v.max);
  const umbralDespues = umbralVital(recurso, despues, v.max);
  return {
    antes: v.actual,
    despues,
    max: v.max,
    umbralAntes,
    umbralDespues,
    cambiaUmbral: (umbralAntes?.id ?? null) !== (umbralDespues?.id ?? null),
  };
}

// "Herido (−1)"; sin umbral, "sin penalizador".
// TODO(revisar): el −N es el base de §7; el ajuste de especie (Guerrero, Siervo, §14.8)
// solo lo aplica la ficha resuelta, la vista previa no lo conoce.
export function textoUmbral(u: UmbralVital | null): string {
  return u ? `${u.etiqueta} (−${Math.abs(u.penalizador)})` : "sin penalizador";
}
