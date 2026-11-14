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
import { baseDeFicha, modificadoresDeBase } from "./baseFicha";
import { salud } from "./derivados";
import { desequipar } from "./equipo";
import type { EstadoActivo } from "./estados";
import type { Sheet } from "./sheet";
import { acotarDanio, ajustarDanioVital, danioIgual, normalizarDanio, type CategoriaDanio, type DanioVida } from "./danio";
import { DESCANSO } from "../catalog/descanso";

export type TopesVida = { vida: number; fatiga: number };

// Tope de la vida y la fatiga actuales: el máximo que se ve (td-12, usuario 2026-11-14), el mismo
// que FichaResuelta.salud. Con todos los estados: los del máster que bajan la Fortaleza o la
// Voluntad lo bajan y curar no pasa de ahí (antes topaba en reposo,
// S74, y podía verse «14 de 12»). Al quitarse el estado el máximo sube y la vida no (S75). Sale de
// la misma base que resolverFicha (baseFicha.ts: Shock, inmunidades, Estabilizado); sin las dotes,
// que solo dan bonos de tirada. Sin `estados`, el máximo en reposo de siempre.
export function topesDeVida(sheet: Sheet, estados: readonly EstadoActivo[] = []): TopesVida {
  return salud(sheet, modificadoresDeBase(baseDeFicha(sheet, [...estados])));
}

// Delta manual sobre un valor con tope: [0, tope]. La usan la ficha (ajustarVida) y
// la foto de combate (pgActual/fatigaActual), y la vista previa del máster.
export function vidaTrasAjuste(actual: number, tope: number, delta: number): number {
  return Math.max(0, Math.min(tope, actual + Math.round(delta)));
}

// Recorta vidaActual/fatigaActual a `topes` — nunca los sube solo (eso es
// ajustarVida/ajustarFatiga, una acción explícita del jugador), solo los baja si el
// máximo cayó por debajo de lo que había. Idempotente, sin efecto si ya está dentro de
// rango. parseSheet lo llama con el tope en reposo; quien conoce los estados, con
// reconciliarVidaConEstados.
// También normaliza el desglose del daño (danio.ts) contra la vida perdida con ese tope.
export function reconciliarVida(sheet: Sheet, topes: TopesVida = topesDeVida(sheet)): Sheet {
  const { vida, fatiga } = topes;
  const vidaActual = Math.min(sheet.vidaActual, vida);
  const fatigaActual = Math.min(sheet.fatigaActual, fatiga);
  return conDanio(
    vidaActual === sheet.vidaActual && fatigaActual === sheet.fatigaActual ? sheet : { ...sheet, vidaActual, fatigaActual },
    normalizarDanio(sheet.danio, vida - vidaActual),
  );
}

function conDanio(sheet: Sheet, danio: DanioVida): Sheet {
  return danioIgual(danio, sheet.danio) ? sheet : { ...sheet, danio };
}

// Lo que hace parseSheet en cada lectura: recortar al tope en reposo (ningún estado lo sube desde
// que la Neuroprótesis no toca atributos, sync Drive 2026-11-14). El centinela 999 de una ficha
// nueva cae aquí a un número de verdad.
// El desglose del daño no se normaliza: sin los estados no se sabe el tope de verdad, que puede
// estar por debajo (un estado del máster que baja la Fortaleza, td-12). Solo se quita lo que pase
// de la pérdida con el tope en reposo (de lo más leve); lo que falte lo pone como letal la
// normalización exacta (reconciliarVidaConEstados, o la de resolverFicha al pintar). Rellenar aquí
// hasta la pérdida en reposo y luego normalizar contra un tope más bajo se comería el no letal.
export function reconciliarVidaAlLeer(sheet: Sheet): Sheet {
  const posibles = topesDeVida(sheet);
  const vidaActual = Math.min(sheet.vidaActual, posibles.vida);
  const fatigaActual = Math.min(sheet.fatigaActual, posibles.fatiga);
  return conDanio(
    vidaActual === sheet.vidaActual && fatigaActual === sheet.fatigaActual ? sheet : { ...sheet, vidaActual, fatigaActual },
    acotarDanio(sheet.danio, 0, posibles.vida - vidaActual),
  );
}

// Desequipar y recortar la vida/fatiga actuales al máximo nuevo en el mismo golpe: quitar
// una pieza que daba vida (Hipertrofia, un +1 a Agilidad o Aguante, A1) baja el máximo y
// la pantalla no debe ver "12/10" hasta la próxima lectura. Ponerla no sube la actual
// (como con la especie o el equipo: curar es ajustarVida).
// `estados`: los del personaje (td-12: el tope que se ve).
export function retirarPieza(sheet: Sheet, instanciaId: string, estados: readonly EstadoActivo[] = []): Sheet {
  return reconciliarVidaConEstados(desequipar(sheet, instanciaId), estados);
}

// El recorte exacto: al tope con los estados (topesDeVida, el máximo que se ve). Lo usan las
// lecturas que conocen Character.estados (la ficha, loadEditable, la Mesa, el combate).
export function reconciliarVidaConEstados(sheet: Sheet, estados: readonly EstadoActivo[]): Sheet {
  return reconciliarVida(sheet, topesDeVida(sheet, estados));
}

// Delta manual (+/-), clamp [0, topesDeVida] — mismo patrón que ajustarRecurso() en
// recursos.ts. `estados`: los del personaje (se cura hasta el máximo que se ve: con un estado que
// baja la Fortaleza, el bajado, td-12);
// sin ellos, el máximo en reposo. Sin categoría: el daño entra como letal y la
// cura quita lo más leve primero (normalizarDanio).
export function ajustarVida(sheet: Sheet, delta: number, estados: readonly EstadoActivo[] = []): Sheet {
  if (!Number.isFinite(delta)) return sheet;
  const tope = topesDeVida(sheet, estados).vida;
  const vidaActual = vidaTrasAjuste(sheet.vidaActual, tope, delta);
  if (vidaActual === sheet.vidaActual) return sheet;
  return { ...sheet, vidaActual, danio: normalizarDanio(sheet.danio, tope - vidaActual) };
}

// Daño o cura de una categoría (docs/sistema.md §7, pregunta 24). delta > 0 recibe daño de
// esa categoría (baja la vida, sin pasar de 0); delta < 0 cura esa categoría (sube la vida,
// sin curar más de lo que hay en ella). Mantiene vidaActual + desglose === tope.
export function ajustarDanioCategoria(
  sheet: Sheet,
  categoria: CategoriaDanio,
  delta: number,
  estados: readonly EstadoActivo[] = [],
): Sheet {
  if (!Number.isFinite(delta) || Math.round(delta) === 0) return sheet;
  const tope = topesDeVida(sheet, estados).vida;
  const r = ajustarDanioVital({ actual: sheet.vidaActual, tope, danio: sheet.danio }, categoria, delta);
  return conDanio(r.actual === sheet.vidaActual ? sheet : { ...sheet, vidaActual: r.actual }, r.danio);
}

export function ajustarFatiga(sheet: Sheet, delta: number, estados: readonly EstadoActivo[] = []): Sheet {
  if (!Number.isFinite(delta)) return sheet;
  const fatigaActual = vidaTrasAjuste(sheet.fatigaActual, topesDeVida(sheet, estados).fatiga, delta);
  if (fatigaActual === sheet.fatigaActual) return sheet;
  return { ...sheet, fatigaActual };
}

// La línea informativa bajo la barra de Fatiga (au-03): lo que recuperan un descanso breve y una
// comida, sacado de DESCANSO. Solo informa: la fatiga se ajusta a mano (au-02).
export function textoDescanso(): string {
  const { breve, comida } = DESCANSO;
  return `Descanso breve (${breve.minutos} min, ${breve.porDia} al día): +${breve.fatiga} · Comida (${comida.porDia} al día): +${comida.fatiga}`;
}

// ── Fatiga temporal (Proeza) ───────────────────────────────────────
// Proeza es la única acción que puede gastar más fatiga de la que se tiene: lo
// que no llega se apunta aparte como fatiga temporal. Cuenta para los umbrales
// mientras dura la escena y se devuelve al terminarla (docs/sistema.md §10.6).

export function fatigaEfectiva(sheet: Sheet): number {
  return sheet.fatigaActual - sheet.fatigaTemporal;
}

// La fatiga que se gasta ahora mismo (td-25): con un combate en curso, la de la foto del
// combatiente (la que vale en combate, §7); si no, la de la ficha. Sin restar la temporal de
// Proeza: es lo que se puede pagar. La efectiva (umbrales, sobrecarga) es esta menos la temporal.
export function fatigaEnJuego(sheet: Pick<Sheet, "fatigaActual">, foto: { fatigaActual: number } | null): number {
  return foto ? foto.fatigaActual : sheet.fatigaActual;
}

// Cuánto de `coste` sale de la fatiga en juego y cuánto pasa a temporal (solo con
// `permiteTemporal`, Proeza). Sin él, lo que no llega no se paga (el bloqueo previo ya impide
// llegar aquí sin fatiga).
export function cobroDeFatiga(coste: number, enJuego: number, permiteTemporal: boolean): { pagado: number; temporal: number } {
  if (!Number.isFinite(coste) || coste <= 0) return { pagado: 0, temporal: 0 };
  const c = Math.round(coste);
  const pagado = Math.min(c, Math.max(0, enJuego));
  return { pagado, temporal: permiteTemporal ? c - pagado : 0 };
}

// Paga `coste` de fatiga. Sin `permiteTemporal`, recorta en 0 como ajustarFatiga; con él, el
// exceso pasa a fatiga temporal. `enJuego` (td-25): la fatiga contra la que se paga
// (fatigaEnJuego); en combate, la de la foto, y la ficha baja lo mismo sin pasar de 0 (A5b: se
// cobra en las dos). Sin él, la de la ficha.
export function pagarFatiga(sheet: Sheet, coste: number, permiteTemporal: boolean, enJuego: number = sheet.fatigaActual): Sheet {
  const { pagado, temporal } = cobroDeFatiga(coste, enJuego, permiteTemporal);
  if (pagado === 0 && temporal === 0) return sheet;
  return {
    ...sheet,
    fatigaActual: Math.max(0, sheet.fatigaActual - pagado),
    fatigaTemporal: Math.min(999, sheet.fatigaTemporal + temporal),
  };
}

export function ajustarFatigaTemporal(sheet: Sheet, delta: number): Sheet {
  if (!Number.isFinite(delta)) return sheet;
  const fatigaTemporal = Math.max(0, Math.min(999, sheet.fatigaTemporal + Math.round(delta)));
  return fatigaTemporal === sheet.fatigaTemporal ? sheet : { ...sheet, fatigaTemporal };
}

// "Al terminar la escena volverá al nivel de fatiga que le correspondiese". También se
// vacían los usos "una vez por escena" de los aumentos (A4a, usosEscena.ts).
export function terminarEscena(sheet: Sheet): Sheet {
  if (sheet.fatigaTemporal === 0 && sheet.usosEscena.length === 0) return sheet;
  return { ...sheet, fatigaTemporal: 0, usosEscena: [] };
}

// Foto con la que un jugador entra en un combate: su vida y fatiga actuales de la
// ficha, no el máximo. Con los umbrales sacados del combatiente (M1b), entrar a tope
// le quitaría a un herido sus penalizadores. Los NPC salen de una plantilla y entran
// enteros.
export function vitalidadAlEntrarEnCombate(
  sheet: Sheet,
  max: { vida: number; fatiga: number },
): { pgActual: number; fatigaActual: number; danio: DanioVida } {
  const pgActual = Math.max(0, Math.min(sheet.vidaActual, max.vida));
  return {
    pgActual,
    fatigaActual: Math.max(0, Math.min(sheet.fatigaActual, max.fatiga)),
    // El desglose de la ficha, contra lo perdido en la foto (su máximo puede ser otro).
    danio: normalizarDanio(sheet.danio, max.vida - pgActual),
  };
}

// Al terminar un combate (td-13, decisiones del usuario 2026-11-13): lo perdido en el combate
// vuelve a la ficha. Se copia el daño recibido (máximo de la foto − actual), no el valor: si el
// tope de la ficha (`topes`: topesDeVida con sus estados) no coincide con el máximo de la foto
// (equipo o base cambiados), el daño sigue siendo el mismo. Igual con la fatiga gastada. El
// desglose, el de la foto (danioDeFoto). Sin cambio, la misma ficha.
export function vitalidadAlSalirDeCombate(
  sheet: Sheet,
  foto: { pgActual: number; pgMax: number; fatigaActual: number; fatigaMax: number; danio: DanioVida },
  topes: TopesVida,
): Sheet {
  const perdida = (actual: number, max: number) => Math.max(0, max - actual);
  const vidaActual = Math.max(0, Math.min(topes.vida - perdida(foto.pgActual, foto.pgMax), topes.vida));
  const fatigaActual = Math.max(0, Math.min(topes.fatiga - perdida(foto.fatigaActual, foto.fatigaMax), topes.fatiga));
  const danio = normalizarDanio(foto.danio, topes.vida - vidaActual);
  if (vidaActual === sheet.vidaActual && fatigaActual === sheet.fatigaActual && danioIgual(danio, sheet.danio)) return sheet;
  return { ...sheet, vidaActual, fatigaActual, danio };
}
