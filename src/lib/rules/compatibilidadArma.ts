// Qué mejoras de arma admite cada arma, y qué hacer con una ya instalada que el catálogo ha
// dejado de admitir (td-03, usuario 2026-11-14).
//
// La compatibilidad tiene tres formas: la de la mejora, por tipo de arma («solo fusiles de
// asalto») o por categoría de daño («las armas de plasma no pueden instalarla»), y la del arma,
// cuando dice ella misma cuáles admite (`ArmaFuego.mejorasPermitidas`: Arco y Ballesta, solo
// miras, Puntero Láser y Linterna). Si el arma lo dice, manda el arma.
//
// Una mejora instalada que su arma ya no admite (comprada antes de que cambiara la regla) se
// queda en la ficha: no se pierde ni se devuelve lo pagado, ocupa su ranura y pesa, sale en
// Equipo con MOTIVO_NO_ADMITIDA y no aporta nada (ni casillas, ni ajustes, ni textos, ni
// acciones). Lo decide mejorasNoAdmitidas; el motor la quita de la ficha con la que calcula lo
// que aportan las piezas (sinMejorasNoAdmitidas, en piezasEnUso y accionesDeAtaque), como a
// una pieza apagada por el Shock.
import { equipoPorId, type ArmaFuego, type MejoraDeArma } from "../catalog/equipo";
import type { PiezaEquipada } from "./equipo";
import type { Sheet } from "./sheet";

export const MOTIVO_NO_ADMITIDA = "No compatible con este arma";

export function compatibleConArma(mejora: MejoraDeArma, arma: ArmaFuego): boolean {
  if (arma.mejorasPermitidas) return arma.mejorasPermitidas.includes(mejora.id);
  const c = mejora.compatibilidad;
  if (c.tipo === "todas") return true;
  if (c.tipo === "porTipoArma") return c.tiposPermitidos.includes(arma.tipo);
  return !arma.modos.some((m) => c.categoriasExcluidas.includes(m.categoriaDanio));
}

// El motivo por el que una pieza instalada no hace nada en su arma, o null si funciona (o no es
// una mejora de arma).
export function motivoNoAdmitida(sheet: Pick<Sheet, "equipo">, pieza: PiezaEquipada): string | null {
  if (!pieza.instaladoEnId) return null;
  const cat = equipoPorId(pieza.catalogoId);
  if (cat?.familia !== "mejoraArma") return null;
  const host = sheet.equipo.find((p) => p.instanciaId === pieza.instaladoEnId);
  const hostCat = host ? equipoPorId(host.catalogoId) : null;
  if (hostCat?.familia !== "arma") return null;
  return compatibleConArma(cat, hostCat) ? null : MOTIVO_NO_ADMITIDA;
}

export function mejorasNoAdmitidas(sheet: Pick<Sheet, "equipo">): ReadonlySet<string> {
  return new Set(sheet.equipo.filter((p) => motivoNoAdmitida(sheet, p) !== null).map((p) => p.instanciaId));
}

// La ficha sin las mejoras que su arma no admite. La misma si no hay ninguna.
export function sinMejorasNoAdmitidas<S extends Pick<Sheet, "equipo">>(sheet: S): S {
  const fuera = mejorasNoAdmitidas(sheet);
  if (fuera.size === 0) return sheet;
  return { ...sheet, equipo: sheet.equipo.filter((p) => !fuera.has(p.instanciaId)) };
}
