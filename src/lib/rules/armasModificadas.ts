// Armas Modificadas (S87): Electrificante, Térmica, Plasma y Nanofilamento sobre un
// arma melee. Datos en catalog/armasModificadas.ts; aquí, todo lo que se calcula:
// tramo, compatibilidad, coste, rareza, peso, nombre y el golpe resultante.
//
// Decisiones del usuario (2026-10-23):
// - Se guardan en `PiezaEquipada.modificaciones`; no ocupan ranura.
// - Admiten modificación todas las armas melee que se compran salvo las de kerzul.
//   Escudos: solo Electrificante. Nanofilamento: solo armas de filo (ArmaMelee.filo).
// - Plasma no se combina con nada; las otras tres, libremente.
// - El tramo sale del +N del PRIMER modo del arma SIN modificar ("2 o menos" cae en la
//   fila "2"), igual para todas las modificaciones, y su daño extra va a todos los modos.
// - Coste multiplicativo: básico × N₁ × N₂…; convertir un arma que ya tienes cuesta la
//   diferencia. Rareza: la mayor entre la del arma y las de sus modificaciones.
import { z } from "zod";
import { equipoPorId, RAREZA_ORDEN, type Rareza } from "../catalog/equipo";
import { PELEA, type ArmaMelee } from "../catalog/armasMelee";
import {
  MODIFICACIONES_ARMA_IDS,
  modificacionArmaPorId,
  type ModificacionArmaId,
  type TramoModificacion,
} from "../catalog/armasModificadas";
import { TIPOS_DANIO, type TipoDanio } from "../catalog/tiposDanio";
import type { PiezaEquipada } from "./equipo";
import type { Sheet } from "./sheet";

// El daño melee es una fórmula sobre Fuerza ("Fue+3"): todo `formulaDanio` de
// armasMelee.ts sigue el patrón "Fuerza"/"Fue" y, opcionalmente, "+N". Si algún día
// aparece una que no, sale null y la tirada cae al texto "se calcula a mano".
export function bonoFormulaFuerza(formula: string): number | null {
  const m = /^(?:Fuerza|Fue)(?:\+(\d+))?$/.exec(formula);
  if (!m) return null;
  return m[1] ? Number(m[1]) : 0;
}

export const modificacionArmaSchema = z.enum(MODIFICACIONES_ARMA_IDS);
export const listaModificacionesSchema = z.array(modificacionArmaSchema).min(1).max(MODIFICACIONES_ARMA_IDS.length);

export const ETIQUETA_TRAMO = ["2", "3 a 6", "7 o +"] as const;
export type IndiceTramo = 0 | 1 | 2;

// Fila de la tabla ("Daño Modelo Básico") que le toca al arma, o null si su fórmula no
// se reconoce.
export function tramoDanioBasico(arma: ArmaMelee): IndiceTramo | null {
  const bono = bonoFormulaFuerza(arma.modos[0].formulaDanio);
  if (bono === null) return null;
  return bono <= 2 ? 0 : bono <= 6 ? 1 : 2;
}

const IDS_PELEA = new Set(PELEA.map((p) => p.id));

// Si el arma admite alguna modificación: las que se compran, sin la Pelea ni el kerzul.
export function admiteModificaciones(arma: ArmaMelee): boolean {
  return arma.coste !== null && !IDS_PELEA.has(arma.id) && arma.material !== "kerzul" && tramoDanioBasico(arma) !== null;
}

// Por qué `id` no cabe en el arma por sí sola (sin mirar con qué se combina), o null.
export function motivoIncompatible(arma: ArmaMelee, id: ModificacionArmaId): string | null {
  if (!admiteModificaciones(arma)) return `${arma.label} no admite modificaciones.`;
  const mod = modificacionArmaPorId(id);
  if (arma.defensa && id !== "electrificante") return "Los escudos solo admiten Electrificante.";
  if (mod.soloFilo && !arma.filo) return `${mod.label} es exclusiva de armas de filo.`;
  return null;
}

// Orden fijo y sin repetidos: así se guardan y así se nombran.
export function normalizarModificaciones(ids: readonly ModificacionArmaId[]): ModificacionArmaId[] {
  return MODIFICACIONES_ARMA_IDS.filter((id) => ids.includes(id));
}

export function validarModificaciones(
  arma: ArmaMelee,
  ids: readonly ModificacionArmaId[],
): { ok: true } | { ok: false; motivo: string } {
  if (new Set(ids).size !== ids.length) return { ok: false, motivo: "Modificación repetida." };
  for (const id of ids) {
    const motivo = motivoIncompatible(arma, id);
    if (motivo) return { ok: false, motivo };
  }
  const exclusiva = ids.map(modificacionArmaPorId).find((m) => m.exclusiva);
  if (exclusiva && ids.length > 1) return { ok: false, motivo: `${exclusiva.label} no se combina con otras modificaciones.` };
  return { ok: true };
}

// Las cuatro modificaciones para el selector de la UI, partiendo de la selección actual:
// `fija` las que el arma ya lleva (no se quitan al convertir), y para el resto si se
// pueden marcar o desmarcar ahora mismo y, si no, por qué.
export type OpcionModificacion = {
  id: ModificacionArmaId;
  label: string;
  marcada: boolean;
  fija: boolean;
  motivo: string | null;
};

export function opcionesModificacion(
  arma: ArmaMelee,
  seleccion: readonly ModificacionArmaId[],
  fijas: readonly ModificacionArmaId[] = [],
): OpcionModificacion[] {
  return MODIFICACIONES_ARMA_IDS.map((id) => {
    const mod = modificacionArmaPorId(id);
    const marcada = seleccion.includes(id);
    const fija = fijas.includes(id);
    if (marcada) return { id, label: mod.label, marcada, fija, motivo: null };
    const res = validarModificaciones(arma, [...seleccion, id]);
    return { id, label: mod.label, marcada, fija, motivo: res.ok ? null : res.motivo };
  });
}

// Alterna `id` en la selección (sin tocar las fijas) y la devuelve normalizada; si el
// cambio no es válido, la selección no cambia.
export function alternarModificacion(
  arma: ArmaMelee,
  seleccion: readonly ModificacionArmaId[],
  id: ModificacionArmaId,
  fijas: readonly ModificacionArmaId[] = [],
): ModificacionArmaId[] {
  if (fijas.includes(id)) return normalizarModificaciones(seleccion);
  const siguiente = seleccion.includes(id) ? seleccion.filter((m) => m !== id) : [...seleccion, id];
  return validarModificaciones(arma, siguiente).ok ? normalizarModificaciones(siguiente) : normalizarModificaciones(seleccion);
}

function filasDe(arma: ArmaMelee, ids: readonly ModificacionArmaId[]): { id: ModificacionArmaId; fila: TramoModificacion }[] {
  const tramo = tramoDanioBasico(arma);
  if (tramo === null) return [];
  return normalizarModificaciones(ids).map((id) => ({ id, fila: modificacionArmaPorId(id).tramos[tramo] }));
}

// "Básico × N₁ × N₂…". Sin coste de base (la Pelea), null.
export function precioArmaModificada(arma: ArmaMelee, ids: readonly ModificacionArmaId[]): number | null {
  if (arma.coste === null) return null;
  return filasDe(arma, ids).reduce((precio, { fila }) => precio * fila.multiplicadorCoste, arma.coste);
}

export function rarezaArmaModificada(arma: ArmaMelee, ids: readonly ModificacionArmaId[]): Rareza | null {
  const rarezas = [arma.rareza, ...filasDe(arma, ids).map(({ fila }) => fila.rareza)].filter((r): r is Rareza => r !== null);
  if (rarezas.length === 0) return null;
  return rarezas.reduce((max, r) => (RAREZA_ORDEN.indexOf(r) > RAREZA_ORDEN.indexOf(max) ? r : max));
}

// "+25 %" sobre el peso del arma básica. Varias modificaciones suman sus porcentajes
// sobre ese mismo básico. TODO(revisar): la fuente no dice cómo se combinan; el usuario
// pidió solo enseñar el peso calculado (la carga no está construida).
export function pesoArmaModificada(arma: ArmaMelee, ids: readonly ModificacionArmaId[]): number | null {
  if (arma.pesoKg === null) return null;
  const pct = normalizarModificaciones(ids).reduce((t, id) => t + modificacionArmaPorId(id).pesoPorcentaje, 0);
  return Math.round(arma.pesoKg * (1 + pct / 100) * 100) / 100;
}

// "Espada Electrificante", "Cuchillo de Combate de Nanofilamento Térmico y Electrificante".
// El género del adjetivo sale de la primera palabra del nombre (Espada, Hacha, Lanza →
// femenino; Cuchillo, Montante, Pico → masculino): vale para todo el catálogo melee.
export function nombreArmaModificada(arma: ArmaMelee, ids: readonly ModificacionArmaId[]): string {
  const mods = normalizarModificaciones(ids).map(modificacionArmaPorId);
  if (mods.length === 0) return arma.label;
  const femenino = /a$/i.test(arma.label.split(" ")[0]);
  const de = mods.flatMap((m) => (m.nombre.tipo === "de" ? [m.nombre.texto] : []));
  const adjetivos = mods.flatMap((m) =>
    m.nombre.tipo === "adjetivo" ? [femenino ? m.nombre.femenino : m.nombre.masculino] : [],
  );
  const cola = adjetivos.length > 1 ? `${adjetivos.slice(0, -1).join(", ")} y ${adjetivos.at(-1)}` : (adjetivos[0] ?? "");
  return [arma.label, ...de, cola].filter(Boolean).join(" ");
}

export function etiquetaTipoDanio(tipo: TipoDanio): string {
  return TIPOS_DANIO.find((t) => t.id === tipo)?.label ?? tipo;
}

// Gravedad del tipo de daño fuera de crítico (null en cinético: la pone el arma).
const categoriaDeTipo = (tipo: TipoDanio): string | null =>
  TIPOS_DANIO.find((t) => t.id === tipo)?.categoria ?? null;

export type DanioExtra = { tipo: TipoDanio; valor: number; fuente: string };

// Cómo cambian las modificaciones un golpe del arma: de qué tipo es el daño básico,
// cuánto se le suma (lo que es de ese mismo tipo), qué daño extra de otro tipo va
// aparte, la categoría si cambia (Nanofilamento: Grave; Térmica y Plasma: la del tipo al
// que convierten, grave) y los textos.
export type PerfilGolpe = {
  tipoBase: TipoDanio;
  sumaBase: number;
  extras: DanioExtra[];
  categoria: string | null;
  efectos: string[];
  efectosCritico: string[];
  ignoraBlindaje: number | null;
  fuente: string;
};

export function perfilGolpe(arma: ArmaMelee, ids: readonly ModificacionArmaId[] | undefined): PerfilGolpe | null {
  const filas = filasDe(arma, ids ?? []);
  if (filas.length === 0) return null;
  const mods = filas.map(({ id, fila }) => ({ mod: modificacionArmaPorId(id), fila }));
  const tipoBase = mods.find(({ mod }) => mod.convierteBase)?.mod.convierteBase ?? "cinetico";
  let sumaBase = 0;
  const extras: DanioExtra[] = [];
  for (const { mod, fila } of mods) {
    const tipo = mod.tipoAdicional ?? tipoBase;
    if (tipo === tipoBase) {
      sumaBase += fila.danioAdicional;
      continue;
    }
    const previo = extras.find((e) => e.tipo === tipo);
    if (previo) previo.valor += fila.danioAdicional;
    else extras.push({ tipo, valor: fila.danioAdicional, fuente: mod.label });
  }
  const ignora = mods.reduce((max, { fila }) => Math.max(max, fila.ignoraBlindaje ?? 0), 0);
  return {
    tipoBase,
    sumaBase,
    extras,
    categoria: mods.find(({ mod }) => mod.categoriaGolpe)?.mod.categoriaGolpe ?? categoriaDeTipo(tipoBase),
    efectos: mods.map(({ fila }) => fila.efecto),
    efectosCritico: mods.flatMap(({ fila }) => (fila.efectoCritico ? [fila.efectoCritico] : [])),
    ignoraBlindaje: ignora > 0 ? ignora : null,
    fuente: mods.map(({ mod }) => mod.label).join(" + "),
  };
}

// Lo que enseña la ficha del arma (Tienda, Equipo, Fabricar) antes de comprarla o
// convertirla: todo ya calculado, la UI solo lo pinta.
export type ResumenArmaModificada = {
  nombre: string;
  tramo: string;
  coste: number | null;
  rareza: Rareza | null;
  pesoKg: number | null;
  modos: {
    etiqueta: string;
    dificultad: number;
    // La fórmula con lo que suma al daño básico ya dentro ("Fue+3" + 2 de fuego → "Fue+5").
    formulaDanio: string;
    categoriaDanio: string;
    tipoBase: TipoDanio;
    extras: DanioExtra[];
  }[];
  efectos: string[];
  efectosCritico: string[];
  ignoraBlindaje: number | null;
};

export function formulaConSuma(formula: string, suma: number): string {
  const bono = bonoFormulaFuerza(formula);
  if (bono === null || suma === 0) return formula;
  return `Fue+${bono + suma}`;
}

export function resumenArmaModificada(arma: ArmaMelee, ids: readonly ModificacionArmaId[]): ResumenArmaModificada | null {
  const perfil = perfilGolpe(arma, ids);
  const tramo = tramoDanioBasico(arma);
  if (!perfil || tramo === null) return null;
  return {
    nombre: nombreArmaModificada(arma, ids),
    tramo: ETIQUETA_TRAMO[tramo],
    coste: precioArmaModificada(arma, ids),
    rareza: rarezaArmaModificada(arma, ids),
    pesoKg: pesoArmaModificada(arma, ids),
    modos: arma.modos.map((m) => ({
      etiqueta: m.etiqueta,
      dificultad: m.dificultad,
      formulaDanio: formulaConSuma(m.formulaDanio, perfil.sumaBase),
      categoriaDanio: perfil.categoria ?? m.categoriaDanio,
      tipoBase: perfil.tipoBase,
      extras: perfil.extras,
    })),
    efectos: perfil.efectos,
    efectosCritico: perfil.efectosCritico,
    ignoraBlindaje: perfil.ignoraBlindaje,
  };
}

// Daño ya tirado, por tipo, para el resultado del golpe: el básico (con el bono por
// éxitos y los ajustes ya dentro) de su tipo más los extras de otros tipos. Null si el
// golpe no lleva tipo propio (armas sin modificar).
export type ParteDanio = { tipo: TipoDanio; label: string; valor: number };

export function desgloseDanio(
  totalBase: number,
  tipoBase: TipoDanio | undefined,
  extras: readonly DanioExtra[] | undefined,
): { partes: ParteDanio[]; total: number } | null {
  if (!tipoBase && (!extras || extras.length === 0)) return null;
  const base = tipoBase ?? "cinetico";
  const partes: ParteDanio[] = [{ tipo: base, label: etiquetaTipoDanio(base), valor: totalBase }];
  for (const e of extras ?? []) {
    const previa = partes.find((p) => p.tipo === e.tipo);
    if (previa) previa.valor += e.valor;
    else partes.push({ tipo: e.tipo, label: etiquetaTipoDanio(e.tipo), valor: e.valor });
  }
  return { partes, total: partes.reduce((t, p) => t + p.valor, 0) };
}

// ── Sobre la ficha ────────────────────────────────────────────────────────────

function armaMeleeDe(catalogoId: string): ArmaMelee | null {
  const cat = equipoPorId(catalogoId);
  return cat?.familia === "armaMelee" ? cat : null;
}

// Nombre con el que se enseña una pieza equipada: el del catálogo, o el del arma
// modificada.
export function nombreDePieza(pieza: Pick<PiezaEquipada, "catalogoId" | "modificaciones">): string {
  const cat = equipoPorId(pieza.catalogoId);
  if (!cat) return pieza.catalogoId;
  if (cat.familia === "armaMelee" && pieza.modificaciones?.length) return nombreArmaModificada(cat, pieza.modificaciones);
  return cat.label;
}

// Si las modificaciones de la pieza valen (o no lleva). Lo usan equipar() y parseSheet.
export function modificacionesValidas(pieza: Pick<PiezaEquipada, "catalogoId" | "modificaciones">): boolean {
  if (!pieza.modificaciones) return true;
  const arma = armaMeleeDe(pieza.catalogoId);
  return arma !== null && pieza.modificaciones.length > 0 && validarModificaciones(arma, pieza.modificaciones).ok;
}

// parseSheet: una combinación que ya no vale (el catálogo cambió) se descarta entera y el
// arma queda sin modificar, en vez de tirar la pieza.
export function conModificacionesValidas(pieza: PiezaEquipada): PiezaEquipada {
  if (!pieza.modificaciones) return pieza;
  if (modificacionesValidas(pieza)) return { ...pieza, modificaciones: normalizarModificaciones(pieza.modificaciones) };
  const sin = { ...pieza };
  delete sin.modificaciones;
  return sin;
}

// Convertir un arma que ya se lleva: añadir modificaciones (nunca quitarlas) pagando la
// diferencia entre el precio nuevo y el que tenía.
export type Conversion =
  | { ok: true; pieza: PiezaEquipada; coste: number; rareza: Rareza | null; nombre: string }
  | { ok: false; motivo: string };

export function conversionDeArma(
  sheet: Pick<Sheet, "equipo">,
  instanciaId: string,
  nuevas: readonly ModificacionArmaId[],
): Conversion {
  const pieza = sheet.equipo.find((p) => p.instanciaId === instanciaId);
  if (!pieza) return { ok: false, motivo: "Esa arma ya no está equipada." };
  const arma = armaMeleeDe(pieza.catalogoId);
  if (!arma) return { ok: false, motivo: "Solo se modifican armas de cuerpo a cuerpo." };
  const actuales = pieza.modificaciones ?? [];
  if (actuales.some((m) => !nuevas.includes(m))) return { ok: false, motivo: "No se puede quitar una modificación." };
  if (nuevas.length <= actuales.length) return { ok: false, motivo: "Elige al menos una modificación nueva." };
  const valida = validarModificaciones(arma, nuevas);
  if (!valida.ok) return valida;
  const modificaciones = normalizarModificaciones(nuevas);
  const antes = precioArmaModificada(arma, actuales) ?? 0;
  const despues = precioArmaModificada(arma, modificaciones) ?? 0;
  return {
    ok: true,
    pieza: { ...pieza, modificaciones },
    coste: despues - antes,
    rareza: rarezaArmaModificada(arma, modificaciones),
    nombre: nombreArmaModificada(arma, modificaciones),
  };
}

// La pieza convertida en su sitio; si la conversión no vale, la ficha no cambia.
export function convertirArma(sheet: Sheet, instanciaId: string, nuevas: readonly ModificacionArmaId[]): Sheet {
  const res = conversionDeArma(sheet, instanciaId, nuevas);
  if (!res.ok) return sheet;
  return { ...sheet, equipo: sheet.equipo.map((p) => (p.instanciaId === instanciaId ? res.pieza : p)) };
}

export const conversionArmaEntradaSchema = z.object({
  instanciaId: z.string().min(1).max(60),
  modificaciones: listaModificacionesSchema,
});
