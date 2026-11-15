// En un combate en curso hay una sola vida, la de la foto (usuario, 2026-11-15; td-13): la ficha
// enseña la del combatiente (FichaResuelta.vital) y sus botones de vida y fatiga escriben en él. La
// ficha no se toca mientras dura: al terminar el combate se le copia lo de la foto
// (vitalidadAlSalirDeCombate), así que no se pierde nada de lo ajustado dentro.
// Fuera de combate, la ficha de siempre (ajustarVida, ajustarDanioCategoria, ajustarFatiga).
// La fatiga temporal de Proeza no es de la foto (Combatiente no la tiene): sigue en la ficha.
import type { Sheet } from "./sheet";
import type { EstadoActivo } from "./estados";
import { danioIgual, type CategoriaDanio, type DanioVida } from "./danio";
import { ajustarDanioCategoria, ajustarFatiga, ajustarVida, vidaTrasAjuste } from "./vitalidad";
import { ajustarVidaDeObjetivo } from "./ajusteVida";

// La foto de un combate en curso con su desglose ya leído (danioDeFoto).
export type VitalDeFoto = { pgActual: number; pgMax: number; fatigaActual: number; fatigaMax: number; danio: DanioVida };

// `delta` > 0 cura o devuelve; < 0 daña o gasta. En la vida, con `categoria` el daño entra en ella y
// la cura sale solo de ella; sin ella, daño letal y cura de lo más leve (normalizarDanio).
export type AjusteVital =
  | { recurso: "vida"; delta: number; categoria?: CategoriaDanio }
  | { recurso: "fatiga"; delta: number };

// Dónde cae el ajuste y cuánto: con `foto`, en ella, con su máximo de tope (pgMax/fatigaMax) y la
// ficha igual; sin ella, en la ficha con el tope que se ve (topesDeVida con `estados`, td-12). Sin
// cambio devuelve los mismos objetos, para que quien escribe sepa que no hay nada que guardar.
export function ajustarVitalEnJuego<F extends VitalDeFoto>(
  sheet: Sheet,
  estados: readonly EstadoActivo[],
  foto: F | null,
  ajuste: AjusteVital,
): { sheet: Sheet; foto: F | null } {
  if (!Number.isFinite(ajuste.delta)) return { sheet, foto };
  const delta = Math.round(ajuste.delta);
  if (!foto) {
    if (ajuste.recurso === "fatiga") return { sheet: ajustarFatiga(sheet, delta, estados), foto: null };
    // ajustarDanioCategoria cuenta al revés: delta > 0 es daño.
    const tras = ajuste.categoria ? ajustarDanioCategoria(sheet, ajuste.categoria, -delta, estados) : ajustarVida(sheet, delta, estados);
    return { sheet: tras, foto: null };
  }
  if (ajuste.recurso === "fatiga") {
    const fatigaActual = vidaTrasAjuste(foto.fatigaActual, foto.fatigaMax, delta);
    return { sheet, foto: fatigaActual === foto.fatigaActual ? foto : { ...foto, fatigaActual } };
  }
  const r = ajustarVidaDeObjetivo({ actual: foto.pgActual, tope: foto.pgMax, danio: foto.danio }, delta, ajuste.categoria);
  const danio = r.danio ?? foto.danio;
  if (r.despues === foto.pgActual && danioIgual(danio, foto.danio)) return { sheet, foto };
  return { sheet, foto: { ...foto, pgActual: r.despues, danio } };
}
