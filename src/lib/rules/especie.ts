// La especie de una ficha, sin UI (docs/sistema.md §14, propuesta-especies §2.2 y §3).
//
//   especieDeFicha  elección guardada (especie + casta + linaje) → efectos resueltos
//   elegirEspecie   cambiar la elección: valida, bloquea si está aprobada y aplica
//                   el reset de §14.3. La pantalla y el servidor solo aplican lo
//                   que devuelve.
//   hayQuePerder    decide si hay que avisar antes de cambiar
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
import { defaultSheet, type Sheet } from "./sheet";

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

// Lo que sobrevive al reset (§14.3): la pestaña Resumen. El nombre vive en
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

export function elegirEspecie(sheet: Sheet, eleccion: EleccionEspecie, ctx: ContextoEleccion): ResultadoEleccion {
  const valida = validarEleccion(eleccion);
  if ("error" in valida) return valida;
  const { especieId, opciones } = valida;

  if (mismaEleccion(sheet, especieId, opciones)) return { sheet, reseteada: false };
  if (ctx.libre) return { sheet: { ...sheet, especieId, especieOpciones: opciones }, reseteada: false };
  if (ctx.aprobada && !ctx.esMaster) {
    return { error: "La ficha está aprobada: la especie ya no se puede cambiar" };
  }
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
