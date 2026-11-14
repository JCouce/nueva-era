// Habilitador (tipo 5 de docs/motor.md; fase 6 de docs/aportes/plan.md): si una hoja de Acciones
// (tirada, acción sin dado o poder) se puede usar ahora. Lo decide el motor; la pantalla solo
// elige cómo pintarlo según `estado`:
//   activa     se tira / se usa.
//   bloqueada  se ve apagada, con el motivo.
//   oculta     no se pinta. Las listas del motor ya no la devuelven (esVisible).
// `arbitraje` (motor.md, "El tipo 5 lleva un sub-campo pendiente"): nunca por defecto, lo declara
// cada productor. Todos los de hoy son "duro" (la hoja no se puede usar).
//
// Cada productor (escudo roto, sin cargas, sin fatiga, límite agotado, requisito roto, sin
// especialidad, permiso de dote…) da su Habilitacion; juntarHabilitacion las combina en una.
import type { Arbitraje } from "./motor";
import type { FamiliaArma } from "./modificadores";
import type { PermisosDeDotes } from "./dotesEfectos";
import { FAMILIAS_SOLO_CON_DOTE } from "../catalog/dotesDestinos";

export type Habilitacion =
  | { estado: "activa" }
  | { estado: "bloqueada"; motivo: string; arbitraje: Arbitraje }
  | { estado: "oculta"; motivo: string; arbitraje: Arbitraje };

export const ACTIVA: Habilitacion = { estado: "activa" };

export const bloqueadaPor = (motivo: string, arbitraje: Arbitraje): Habilitacion => ({ estado: "bloqueada", motivo, arbitraje });
export const ocultaPor = (motivo: string, arbitraje: Arbitraje): Habilitacion => ({ estado: "oculta", motivo, arbitraje });

// Para los productores que ya devuelven "motivo o null" (noFuncionaPorFatiga, bloqueoPorRequisito…).
export const bloqueadaSi = (motivo: string | null | undefined, arbitraje: Arbitraje): Habilitacion | null =>
  motivo ? bloqueadaPor(motivo, arbitraje) : null;

// Junta lo que dicen los productores de una hoja. Oculta gana a bloqueada y bloqueada a activa;
// entre dos del mismo estado, la primera: el orden de la lista es la prioridad del motivo que se
// enseña (como las cadenas `a ?? b ?? c` que sustituye). Devuelve la misma referencia que gana,
// para que quien la pone en una hoja sepa si ha cambiado algo.
export function juntarHabilitacion(...habilitaciones: readonly (Habilitacion | null | undefined)[]): Habilitacion {
  let gana: Habilitacion = ACTIVA;
  for (const h of habilitaciones) {
    if (!h || h.estado === "activa") continue;
    if (h.estado === "oculta") return h;
    if (gana.estado === "activa") gana = h;
  }
  return gana;
}

// Lo que lee la pantalla. Sin `habilitacion`, la hoja está activa.
export const motivoDeBloqueo = (h: Habilitacion | null | undefined): string | null =>
  h?.estado === "bloqueada" ? h.motivo : null;
export const esVisible = (hoja: { habilitacion?: Habilitacion }): boolean => hoja.habilitacion?.estado !== "oculta";

// El único sitio donde se junta lo de fuera con lo que ya trae la hoja (de quien la genera:
// escudo roto, sin cargas, sin fatiga, límite agotado…). Prioridad del motivo: primero `deFuera`
// (lo que depende de la ficha, habilitacionEnFicha, o del permiso de dote, habilitacionDeFamilia),
// luego lo de la hoja. Así el Shock gana al «sin fatiga» de un implante; oculta gana siempre.
// Sin cambios, la misma hoja.
export function conHabilitacion<T extends { habilitacion?: Habilitacion }>(hoja: T, deFuera: Habilitacion | null | undefined): T {
  const h = juntarHabilitacion(deFuera, hoja.habilitacion);
  return h === (hoja.habilitacion ?? ACTIVA) ? hoja : { ...hoja, habilitacion: h };
}

// Permiso de dote (D2b-2, §9.2): una familia de FAMILIAS_SOLO_CON_DOTE («Bloquear con X») solo
// existe si una dote activa la habilita (Bloqueo). Sin ella, oculta: arbitraje duro (motor.md).
export function habilitacionDeFamilia(familia: FamiliaArma | undefined, permisos: PermisosDeDotes): Habilitacion | null {
  if (!familia || !FAMILIAS_SOLO_CON_DOTE.includes(familia) || permisos.familias.includes(familia)) return null;
  return ocultaPor("Solo con la dote que la habilita (Bloqueo).", "duro");
}
