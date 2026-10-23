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
import { activosDeAumentos, efectosDeActivables } from "./aumentosActivables";
import { modificadoresActivos, salud } from "./derivados";
import { desequipar } from "./equipo";
import type { EstadoActivo } from "./estados";
import type { Sheet } from "./sheet";
import { acotarDanio, danioIgual, normalizarDanio, type CategoriaDanio, type DanioVida } from "./danio";
import { estadoPorId } from "../catalog/estados";

export type TopesVida = { vida: number; fatiga: number };

// Tope de la vida y la fatiga actuales: el máximo en reposo (especie + equipo) más lo que
// suban los activables de aumento puestos (A5b, usuario 2026-10-22: "con la Neuroprótesis
// puesta el máximo real es 9 y tienes que poder curarte hasta 9"). Los estados que pone el
// máster no cuentan: con ellos sigue S74 (curar topa en reposo; lo que bajan es S75). Sin
// `estados`, el máximo en reposo de siempre.
export function topesDeVida(sheet: Sheet, estados: readonly EstadoActivo[] = []): TopesVida {
  const activables = efectosDeActivables(sheet, estados).modificadores;
  return salud(sheet, [...modificadoresActivos(sheet), ...activables]);
}

// El tope más alto que podrían dar los activables equipados (cada estado propio, puesto o no,
// en cada grado). Es lo que recorta parseSheet, que no conoce Character.estados: así nunca
// baja una vida curada con la Neuroprótesis puesta. El recorte exacto, con los estados, lo
// hace quien los lee (reconciliarVidaConEstados). Sin activables equipados, el de reposo.
export function topesPosibles(sheet: Sheet): TopesVida {
  const base = topesDeVida(sheet);
  const ids = [...new Set(activosDeAumentos(sheet).map((a) => a.activo.estadoId))];
  if (ids.length === 0) return base;
  let combinaciones: EstadoActivo[][] = [[]];
  for (const estadoId of ids) {
    const grados = estadoPorId(estadoId)?.grados ?? [];
    combinaciones = combinaciones.flatMap((c) => [
      c,
      ...grados.map((g) => [...c, { estadoId, gradoId: g.id, rondasRestantes: null }]),
    ]);
  }
  return combinaciones.reduce((mejor, estados) => {
    const t = topesDeVida(sheet, estados);
    return { vida: Math.max(mejor.vida, t.vida), fatiga: Math.max(mejor.fatiga, t.fatiga) };
  }, base);
}

// Delta manual sobre un valor con tope: [0, tope]. La usan la ficha (ajustarVida) y
// la foto de combate (pgActual/fatigaActual), y la vista previa del máster.
export function vidaTrasAjuste(actual: number, tope: number, delta: number): number {
  return Math.max(0, Math.min(tope, actual + Math.round(delta)));
}

// Recorta vidaActual/fatigaActual a `topes` — nunca los sube solo (eso es
// ajustarVida/ajustarFatiga, una acción explícita del jugador), solo los baja si el
// máximo cayó por debajo de lo que había. Idempotente, sin efecto si ya está dentro de
// rango. parseSheet lo llama con topesPosibles; quien conoce los estados, con
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

// Lo que hace parseSheet en cada lectura: recortar al tope posible (topesPosibles). El
// centinela 999 de una ficha nueva cae aquí a un número de verdad (antes de mirar el daño:
// con la vida ya recortada, una ficha nueva no ha perdido nada).
// El desglose del daño no se normaliza del todo: sin los estados, el tope de verdad está entre
// el de reposo y el posible (Neuroprótesis, A5b). Se acota a ese rango —lo que falte hasta la
// pérdida en reposo es letal; lo que pase de la pérdida con el tope posible se quita de lo más
// leve— y el ajuste exacto lo hace reconciliarVidaConEstados. Normalizar aquí contra el posible
// y luego contra el exacto se comería el no letal (sobraría y se quitaría lo más leve).
export function reconciliarVidaAlLeer(sheet: Sheet): Sheet {
  const posibles = topesPosibles(sheet);
  const vidaActual = Math.min(sheet.vidaActual, posibles.vida);
  const fatigaActual = Math.min(sheet.fatigaActual, posibles.fatiga);
  const reposo = topesDeVida(sheet).vida;
  return conDanio(
    vidaActual === sheet.vidaActual && fatigaActual === sheet.fatigaActual ? sheet : { ...sheet, vidaActual, fatigaActual },
    acotarDanio(sheet.danio, reposo - vidaActual, posibles.vida - vidaActual),
  );
}

// Desequipar y recortar la vida/fatiga actuales al máximo nuevo en el mismo golpe: quitar
// una pieza que daba vida (Hipertrofia, un +1 a Agilidad o Aguante, A1) baja el máximo y
// la pantalla no debe ver "12/10" hasta la próxima lectura. Ponerla no sube la actual
// (como con la especie o el equipo: curar es ajustarVida).
// `estados`: los del personaje, para no recortar lo que da un activable que sigue puesto.
export function retirarPieza(sheet: Sheet, instanciaId: string, estados: readonly EstadoActivo[] = []): Sheet {
  return reconciliarVidaConEstados(desequipar(sheet, instanciaId), estados);
}

// El recorte exacto: al tope con los activables puestos (topesDeVida). Lo usan las lecturas
// que conocen Character.estados (la ficha, loadEditable, la Mesa, el combate).
export function reconciliarVidaConEstados(sheet: Sheet, estados: readonly EstadoActivo[]): Sheet {
  return reconciliarVida(sheet, topesDeVida(sheet, estados));
}

// Delta manual (+/-), clamp [0, topesDeVida] — mismo patrón que ajustarRecurso() en
// recursos.ts. `estados`: los del personaje (con la Neuroprótesis puesta se cura hasta su
// máximo, A5b); sin ellos, el máximo en reposo. Sin categoría: el daño entra como letal y la
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
  if (!Number.isFinite(delta)) return sheet;
  const d = Math.round(delta);
  if (d === 0) return sheet;
  const tope = topesDeVida(sheet, estados).vida;
  const actual = Math.max(0, Math.min(sheet.vidaActual, tope));
  const danio = normalizarDanio(sheet.danio, tope - actual);
  const n = d > 0 ? Math.min(d, actual) : -Math.min(-d, danio[categoria]);
  if (n === 0) return conDanio(actual === sheet.vidaActual ? sheet : { ...sheet, vidaActual: actual }, danio);
  return { ...sheet, vidaActual: actual - n, danio: { ...danio, [categoria]: danio[categoria] + n } };
}

export function ajustarFatiga(sheet: Sheet, delta: number, estados: readonly EstadoActivo[] = []): Sheet {
  if (!Number.isFinite(delta)) return sheet;
  const fatigaActual = vidaTrasAjuste(sheet.fatigaActual, topesDeVida(sheet, estados).fatiga, delta);
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
): { pgActual: number; fatigaActual: number } {
  return {
    pgActual: Math.max(0, Math.min(sheet.vidaActual, max.vida)),
    fatigaActual: Math.max(0, Math.min(sheet.fatigaActual, max.fatiga)),
  };
}
