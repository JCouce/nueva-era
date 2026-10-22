// Vida y fatiga en partida: dejan de ser solo el número derivado que enseña
// salud() (derivados.ts) y pasan a vivir como recurso persistente en la
// ficha (`Sheet.vidaActual`/`fatigaActual`) — mismo espíritu que RECURSOS
// (recursos.ts), pero atado al personaje entero, no a una instancia de
// equipo, así que vive en su propio archivo. Pedido del usuario 2026-09-27:
// "la vida solo se lleva en un número arriba perdido y solitario".
//
// Deliberadamente fuera de este cambio: el snapshot de PG/fatiga que lleva
// `Combatiente` en Fase 6b (master/combate) sigue igual — esto es para fuera
// de combate (la ficha, RecursosTab), no sustituye esa foto.
import { modificadoresActivos, salud } from "./derivados";
import { desequipar } from "./equipo";
import type { Sheet } from "./sheet";

// Máximos en reposo (especie + equipo), sin estados de combate: es lo que recorta
// parseSheet y lo que clampa el servidor, que no conoce el combate. Igual que antes
// de resolverFicha (E1b), cuando salud() tomaba estos modificadores por defecto.
const saludEnReposo = (sheet: Sheet) => salud(sheet, modificadoresActivos(sheet));

// El tope al que cura un ajuste de vida/fatiga de la ficha (S74): el máximo en reposo.
export function topesEnReposo(sheet: Sheet): { vida: number; fatiga: number } {
  const { vida, fatiga } = saludEnReposo(sheet);
  return { vida, fatiga };
}

// Delta manual sobre un valor con tope: [0, tope]. La usan la ficha (ajustarVida) y
// la foto de combate (pgActual/fatigaActual), y la vista previa del máster.
export function vidaTrasAjuste(actual: number, tope: number, delta: number): number {
  return Math.max(0, Math.min(tope, actual + Math.round(delta)));
}

// Recorta vidaActual/fatigaActual al máximo actual de salud() — nunca los
// sube solo (eso es ajustarVida/ajustarFatiga, una acción explícita del
// jugador), solo los baja si el máximo cayó por debajo de lo que había.
// Se llama desde parseSheet en cada lectura, mismo criterio que
// reconciliarRecursos: idempotente, sin efecto si ya está dentro de rango.
export function reconciliarVida(sheet: Sheet): Sheet {
  const { vida, fatiga } = saludEnReposo(sheet);
  const vidaActual = Math.min(sheet.vidaActual, vida);
  const fatigaActual = Math.min(sheet.fatigaActual, fatiga);
  if (vidaActual === sheet.vidaActual && fatigaActual === sheet.fatigaActual) return sheet;
  return { ...sheet, vidaActual, fatigaActual };
}

// Desequipar y recortar la vida/fatiga actuales al máximo nuevo en el mismo golpe: quitar
// una pieza que daba vida (Hipertrofia, un +1 a Agilidad o Aguante, A1) baja el máximo y
// la pantalla no debe ver "12/10" hasta la próxima lectura. Ponerla no sube la actual
// (como con la especie o el equipo: curar es ajustarVida).
export function retirarPieza(sheet: Sheet, instanciaId: string): Sheet {
  return reconciliarVida(desequipar(sheet, instanciaId));
}

// Delta manual (+/-), clamp [0, máximo de salud()] — mismo patrón que
// ajustarRecurso() en recursos.ts.
export function ajustarVida(sheet: Sheet, delta: number): Sheet {
  if (!Number.isFinite(delta)) return sheet;
  const vidaActual = vidaTrasAjuste(sheet.vidaActual, saludEnReposo(sheet).vida, delta);
  if (vidaActual === sheet.vidaActual) return sheet;
  return { ...sheet, vidaActual };
}

export function ajustarFatiga(sheet: Sheet, delta: number): Sheet {
  if (!Number.isFinite(delta)) return sheet;
  const fatigaActual = vidaTrasAjuste(sheet.fatigaActual, saludEnReposo(sheet).fatiga, delta);
  if (fatigaActual === sheet.fatigaActual) return sheet;
  return { ...sheet, fatigaActual };
}

// ── Fatiga temporal (Proeza) ───────────────────────────────────────
// Proeza es la única acción que puede gastar más fatiga de la que se tiene: lo
// que no llega se apunta aparte como fatiga temporal. Cuenta para los umbrales
// mientras dura la escena y se devuelve al terminarla (docs/sistema.md §10.6).

export function fatigaEfectiva(sheet: Sheet): number {
  return sheet.fatigaActual - sheet.fatigaTemporal;
}

// Paga `coste` de fatiga. Sin `permiteTemporal`, recorta en 0 como ajustarFatiga
// (el bloqueo previo ya impide llegar aquí sin fatiga); con él, el exceso pasa a
// fatiga temporal.
export function pagarFatiga(sheet: Sheet, coste: number, permiteTemporal: boolean): Sheet {
  if (!Number.isFinite(coste) || coste <= 0) return sheet;
  const c = Math.round(coste);
  const pagado = Math.min(c, sheet.fatigaActual);
  const exceso = permiteTemporal ? c - pagado : 0;
  return { ...sheet, fatigaActual: sheet.fatigaActual - pagado, fatigaTemporal: Math.min(999, sheet.fatigaTemporal + exceso) };
}

export function ajustarFatigaTemporal(sheet: Sheet, delta: number): Sheet {
  if (!Number.isFinite(delta)) return sheet;
  const fatigaTemporal = Math.max(0, Math.min(999, sheet.fatigaTemporal + Math.round(delta)));
  return fatigaTemporal === sheet.fatigaTemporal ? sheet : { ...sheet, fatigaTemporal };
}

// "Al terminar la escena volverá al nivel de fatiga que le correspondiese".
export function terminarEscena(sheet: Sheet): Sheet {
  return sheet.fatigaTemporal === 0 ? sheet : { ...sheet, fatigaTemporal: 0 };
}

// Foto con la que un jugador entra en un combate: su vida y fatiga actuales de la
// ficha, no el máximo. Con los umbrales sacados del combatiente (M1b), entrar a tope
// le quitaría a un herido sus penalizadores. Los NPC salen de una plantilla y entran
// enteros.
export function vitalidadAlEntrarEnCombate(
  sheet: Sheet,
  max: { vida: number; fatiga: number },
): { pgActual: number; fatigaActual: number } {
  return {
    pgActual: Math.max(0, Math.min(sheet.vidaActual, max.vida)),
    fatigaActual: Math.max(0, Math.min(sheet.fatigaActual, max.fatiga)),
  };
}
