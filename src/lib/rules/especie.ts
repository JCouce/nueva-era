// La especie de una ficha, sin UI (docs/sistema.md §14, propuesta-especies §2.2 y §3).
//
//   especieDeFicha  elección guardada (especie + casta + linaje) → efectos resueltos
//   elegirEspecie   cambiar la elección: valida, bloquea si está aprobada y aplica
//                   el reset de §14.3. La pantalla y el servidor solo aplican lo
//                   que devuelve.
//   hayQuePerder    decide si hay que avisar antes de cambiar
//   hayQueAvisar    lo mismo con el contexto: solo avisa si el cambio resetearía
//   eleccionCompleta / faltaEnEleccion / eleccionDeFicha / eleccionesIguales
//                   el borrador del selector: no se llama a la action a medias
//   rangoReferencia peso y altura de referencia con la Fuerza con especie (§14.5)
//   ajustesDeCoste  los rasgos de coste (§14.6) → el AjusteCoste que reciben
//                   creacion.ts, psionica.ts y progresion.ts
//   bolsaDeAumentos los créditos aparte para aumentos (Humanos), o null
//
// Mismo patrón que usoPoder.ts: entrada explícita, nada se lee de fuera salvo el
// catálogo, y el resultado se aplica tal cual.
import {
  especiePorId,
  normalizarOpciones,
  type Especie,
  type EspecieOpciones,
  type OpcionEspecie,
  type ReferenciaFisica,
  type Rasgo,
} from "../catalog/especies";
import type { ModificadorConFuente } from "./modificadores";
import { creditosDeLaLetra } from "./prioridad";
import { AJUSTE_NEUTRO, type AjusteCoste } from "./progresion";
import { defaultSheet, type Sheet } from "./sheet";
import type { HabilidadId } from "./habilidades";

export type RasgoConFuente = Rasgo & { fuente: string };

export type EspecieResuelta = {
  especie: Especie;
  casta: OpcionEspecie | null;
  linaje: OpcionEspecie | null;
  // Especie, casta y linaje, en ese orden, cada uno con su fuente para el desglose.
  modificadores: ModificadorConFuente[];
  rasgos: RasgoConFuente[];
  referencia: ReferenciaFisica | null; // la de la casta si la hay
};

export function especieDeFicha(sheet: Pick<Sheet, "especieId" | "especieOpciones">): EspecieResuelta | null {
  const especie = especiePorId(sheet.especieId);
  if (!especie) return null;
  const opciones = normalizarOpciones(especie.id, sheet.especieOpciones);
  const casta = especie.castas?.find((c) => c.id === opciones.casta) ?? null;
  const linaje = especie.linajes?.opciones.find((l) => l.id === opciones.linaje) ?? null;

  const capas: { fuente: string; rasgos: Rasgo[] }[] = [
    { fuente: especie.label, rasgos: especie.rasgos },
    ...(casta ? [{ fuente: casta.fuente, rasgos: casta.rasgos }] : []),
    ...(linaje ? [{ fuente: linaje.fuente, rasgos: linaje.rasgos }] : []),
  ];
  const rasgos = capas.flatMap(({ fuente, rasgos }) => rasgos.map((r) => ({ ...r, fuente })));
  const modificadores: ModificadorConFuente[] = rasgos.flatMap((r) =>
    (r.modificadores ?? []).map((m) => ({ ...m, origen: "especie" as const, fuente: r.fuente })),
  );
  return {
    especie,
    casta,
    linaje,
    modificadores,
    rasgos,
    referencia: casta?.referencia ?? especie.referencia,
  };
}

export type EleccionEspecie = {
  especieId: string | null;
  casta?: string | null;
  linaje?: string | null;
};

export type ContextoEleccion = {
  aprobada: boolean;
  esMaster: boolean;
  // Editor de NPC del máster: sin reset y sin bloqueo por aprobación (§14.3).
  libre: boolean;
};

export type ResultadoEleccion = { sheet: Sheet; reseteada: boolean } | { error: string };

function validarEleccion(eleccion: EleccionEspecie): { especieId: string | null; opciones: EspecieOpciones } | { error: string } {
  const casta = eleccion.casta ?? null;
  const linaje = eleccion.linaje ?? null;
  if (eleccion.especieId === null) {
    if (casta || linaje) return { error: "Sin especie no hay casta ni linaje" };
    return { especieId: null, opciones: {} };
  }
  const especie = especiePorId(eleccion.especieId);
  if (!especie) return { error: "Especie desconocida" };

  if (!especie.castas) {
    if (casta || linaje) return { error: `${especie.label} no tiene casta ni linaje` };
    return { especieId: especie.id, opciones: {} };
  }
  if (!casta) return { error: `${especie.label}: elige casta` };
  const opcionCasta = especie.castas.find((c) => c.id === casta);
  if (!opcionCasta) return { error: "Casta desconocida" };

  const linajes = especie.linajes;
  if (!linajes || linajes.casta !== opcionCasta.id) {
    if (linaje) return { error: `La casta ${opcionCasta.label} no tiene linaje` };
    return { especieId: especie.id, opciones: { casta: opcionCasta.id } };
  }
  if (!linaje) return { error: `${opcionCasta.label}: elige linaje` };
  const opcionLinaje = linajes.opciones.find((l) => l.id === linaje);
  if (!opcionLinaje) return { error: "Linaje desconocido" };
  return { especieId: especie.id, opciones: { casta: opcionCasta.id, linaje: opcionLinaje.id } };
}

const mismaEleccion = (sheet: Sheet, especieId: string | null, opciones: EspecieOpciones) =>
  sheet.especieId === especieId &&
  sheet.especieOpciones.casta === opciones.casta &&
  sheet.especieOpciones.linaje === opciones.linaje;

// Lo que sobrevive al reset (§14.3): la pestaña Personaje. El nombre vive en
// Character.name, fuera de la ficha. Lo demás vuelve a defaultSheet(), con vida
// y fatiga actuales en el centinela de máximo (parseSheet lo recorta).
function resetear(sheet: Sheet, especieId: string | null, opciones: EspecieOpciones): Sheet {
  return {
    ...defaultSheet(),
    edad: sheet.edad,
    altura: sheet.altura,
    peso: sheet.peso,
    trasfondo: sheet.trasfondo,
    motivacion: sheet.motivacion,
    prioridades: { ...sheet.prioridades },
    especieId,
    especieOpciones: opciones,
  };
}

// Por qué no se puede cambiar la especie, o null si se puede. La pantalla lo pinta
// junto al selector deshabilitado; elegirEspecie devuelve el mismo texto.
export function bloqueoDeEspecie(ctx: ContextoEleccion): string | null {
  if (ctx.libre || !ctx.aprobada || ctx.esMaster) return null;
  return "La ficha está aprobada: la especie ya no se puede cambiar";
}

export function elegirEspecie(sheet: Sheet, eleccion: EleccionEspecie, ctx: ContextoEleccion): ResultadoEleccion {
  const valida = validarEleccion(eleccion);
  if ("error" in valida) return valida;
  const { especieId, opciones } = valida;

  if (mismaEleccion(sheet, especieId, opciones)) return { sheet, reseteada: false };
  if (ctx.libre) return { sheet: { ...sheet, especieId, especieOpciones: opciones }, reseteada: false };
  const bloqueo = bloqueoDeEspecie(ctx);
  if (bloqueo) return { error: bloqueo };
  // §14.3: el reset es solo "en borrador". El máster cambiando
  // la especie de una ficha aprobada se queda sin reset (lo reversible): conserva
  // todo lo comprado (validado por el usuario, 2026-10-09).
  if (ctx.aprobada) return { sheet: { ...sheet, especieId, especieOpciones: opciones }, reseteada: false };
  return { sheet: resetear(sheet, especieId, opciones), reseteada: true };
}

function iguales(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => iguales((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

// ¿Cambiar de especie borraría algo? Compara la ficha con su propio reset. Vida y
// fatiga actuales no cuentan: volver al máximo no es perder nada.
export function hayQuePerder(sheet: Sheet, creditos: number, creditosDeLaLetra: number): boolean {
  if (creditos !== creditosDeLaLetra) return true;
  const sinVida = (s: Sheet) => ({ ...s, vidaActual: 0, fatigaActual: 0, schemaVersion: 0 });
  return !iguales(sinVida(resetear(sheet, sheet.especieId, sheet.especieOpciones)), sinVida(sheet));
}

// hayQuePerder, pero solo cuando el cambio de verdad resetea (en borrador y fuera
// del modo libre): el máster con la ficha aprobada cambia sin reset, y el NPC nunca
// resetea. Créditos de la letra: los de RECURSOS_POR_LETRA, como al elegir la letra.
export function hayQueAvisar(sheet: Sheet, creditos: number, ctx: ContextoEleccion): boolean {
  if (ctx.libre || ctx.aprobada) return false;
  return hayQuePerder(sheet, creditos, creditosDeLaLetra(sheet.prioridades));
}

// --- Borrador del selector -------------------------------------------------

export function eleccionDeFicha(sheet: Pick<Sheet, "especieId" | "especieOpciones">): EleccionEspecie {
  return {
    especieId: sheet.especieId,
    casta: sheet.especieOpciones.casta ?? null,
    linaje: sheet.especieOpciones.linaje ?? null,
  };
}

// ¿Se puede mandar ya? Las mismas reglas que elegirEspecie: casta obligatoria si la
// especie tiene castas, linaje obligatorio con la casta que lo admite.
export function eleccionCompleta(eleccion: EleccionEspecie): boolean {
  return !("error" in validarEleccion(eleccion));
}

// Qué le falta a una elección para poder mandarse, o null si está completa ("casa"
// es como ve el jugador el linaje). Mismo orden que validarEleccion; con una
// especie, casta o linaje desconocidos devuelve null y lo rechaza elegirEspecie
// (aquí solo se guía al jugador).
export function faltaEnEleccion(eleccion: EleccionEspecie): "Elige especie" | "Elige casta" | "Elige casa" | null {
  const especie = especiePorId(eleccion.especieId);
  if (!especie) return eleccion.especieId === null ? "Elige especie" : null;
  if (!especie.castas) return null;
  if (!eleccion.casta) return "Elige casta";
  if (especie.linajes?.casta === eleccion.casta && !eleccion.linaje) return "Elige casa";
  return null;
}

export function eleccionesIguales(a: EleccionEspecie, b: EleccionEspecie): boolean {
  return (
    a.especieId === b.especieId &&
    (a.casta ?? null) === (b.casta ?? null) &&
    (a.linaje ?? null) === (b.linaje ?? null)
  );
}

// --- Peso y altura de referencia (§14.5) -----------------------------------

export type RangoReferencia = {
  fuente: string; // de quién es la referencia: la casta si la trae, si no la especie
  pesoKg: { min: number; max: number };
  alturaCm: { min: number; max: number };
};

// Peso = min-max + porFuerza × Fuerza con especie (M21): la comprada más lo que
// suma la especie, sin equipo ni estados. Solo referencia, no se valida. El peso no
// baja de 0 (un Riux con Fuerza −2 restaría 20 kg al mínimo, no más).
export function rangoReferencia(especie: EspecieResuelta | null, fuerzaComprada: number): RangoReferencia | null {
  if (!especie?.referencia) return null;
  const { pesoKg, alturaCm } = especie.referencia;
  const fuerza =
    fuerzaComprada +
    especie.modificadores.reduce((t, m) => (m.tipo === "atributo" && m.id === "fuerza" ? t + m.valor : t), 0);
  const extra = pesoKg.porFuerza * fuerza;
  return {
    fuente: especie.casta?.referencia ? especie.casta.fuente : especie.especie.label,
    pesoKg: { min: Math.max(0, pesoKg.min + extra), max: Math.max(0, pesoKg.max + extra) },
    alturaCm: { min: alturaCm.min, max: alturaCm.max },
  };
}

// --- Creación y progresión (§14.6) ------------------------------------------

// Junta los `costes` de los rasgos de especie, casta y linaje. La especie no se
// guarda en el ajuste: las funciones de coste lo reciben ya resuelto y no miran el
// catálogo. Sin especie, o con una sin rasgos de coste, AJUSTE_NEUTRO.
export function ajustesDeCoste(especie: EspecieResuelta | null): AjusteCoste {
  if (!especie) return AJUSTE_NEUTRO;
  const ajuste: AjusteCoste = { habilidades: {}, psionicaNivel1: null, psionicaPorNivel: null };
  let tocado = false;
  for (const { costes } of especie.rasgos) {
    if (!costes) continue;
    tocado = true;
    const { etiqueta } = costes;
    for (const [id, delta] of Object.entries(costes.habilidades ?? {}) as [HabilidadId, -1 | 1][]) {
      ajuste.habilidades[id] = { delta, etiqueta };
    }
    if (costes.psionicaNivel1 !== undefined) ajuste.psionicaNivel1 = { coste: costes.psionicaNivel1, etiqueta };
    if (costes.psionicaPorNivel !== undefined) ajuste.psionicaPorNivel = { delta: costes.psionicaPorNivel, etiqueta };
  }
  return tocado ? ajuste : AJUSTE_NEUTRO;
}

// Bolsa de aumentos (M3): hoy solo se enseña, no se gasta (no hay aumentos).
export function bolsaDeAumentos(especie: EspecieResuelta | null): number | null {
  const bolsas = (especie?.rasgos ?? []).flatMap((r) => (r.bolsaAumentos === undefined ? [] : [r.bolsaAumentos]));
  return bolsas.length ? bolsas.reduce((a, b) => a + b, 0) : null;
}
