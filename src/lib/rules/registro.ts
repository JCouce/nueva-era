// Registro del máster con deshacer (E1b, docs/tareas.md "Centro de mando del máster").
// Qué se guarda de cada acción (`datos` de RegistroMaster) y, sin tocar la base,
// cómo se deshace y cuándo ya no se puede. Las acciones solo leen, llaman y escriben.
//
// Criterio general de "ya no se puede": deshacer devuelve lo que hizo ESA entrada,
// no la ficha a una foto vieja; si devolverlo choca con lo que ha pasado después, no
// toca nada y explica por qué. Caso a caso:
//   - Entrada ya deshecha, o con `datos` que no se entienden (formato viejo): no.
//   - xp/créditos: se resta (o se suma) lo que de verdad se movió. Si eso deja a
//     alguien en negativo (ya lo gastó), no, para nadie de la entrada.
//   - Poner un estado: el estado tiene que seguir puesto con el mismo grado y la misma
//     clase de duración (las rondas pueden haber bajado). Si se quitó o se cayó por
//     rondas, o lo cambió otra acción, no.
//   - Quitar un estado: no tiene que haber vuelto a ponerse.
//   - En los dos de estado, además: si una entrada posterior sin deshacer toca ese
//     mismo estado de ese personaje, no (hay que deshacer antes la posterior).
//   - Un personaje borrado se salta: no queda nada suyo que devolver.
import { z } from "zod";
import { leerEstados, ponerEstado, quitarEstado } from "./estadosFicha";
import type { EstadoActivo } from "./estados";
import { devolverVida, maximosConEstados, type CambioEstadoPersonaje, type ParVida } from "./vidaPorEstados";
import type { Sheet } from "./sheet";

// "fin_escena" (Terminar escena, E1c) y los que vengan se añaden aquí con su forma.
export const TIPOS_REGISTRO = ["xp", "creditos", "estado_poner", "estado_quitar"] as const;
export type TipoRegistro = (typeof TIPOS_REGISTRO)[number];
export type RecursoMaster = "xp" | "creditos";

export type CambioRecurso = { characterId: string; antes: number; despues: number };

// Un miembro por tipo (y no `tipo: "xp" | "creditos"`) para que TS estreche bien.
export type DatosRecurso = { tipo: "xp"; cambios: CambioRecurso[] } | { tipo: "creditos"; cambios: CambioRecurso[] };
export type DatosEstado =
  | { tipo: "estado_poner"; cambios: CambioEstadoPersonaje[] }
  | { tipo: "estado_quitar"; cambios: CambioEstadoPersonaje[] };
export type DatosRegistro = DatosRecurso | DatosEstado;

// Lo que va a la columna `datos` (el tipo va en su columna).
export function datosParaGuardar(d: DatosRegistro): { cambios: DatosRegistro["cambios"] } {
  return { cambios: d.cambios };
}

const parVidaSchema = z.object({ vida: z.number().int().min(0), fatiga: z.number().int().min(0) });
const cambioRecursoSchema = z.object({ characterId: z.string(), antes: z.number().int(), despues: z.number().int() });
const cambioEstadoSchema = z.object({
  characterId: z.string(),
  estadoId: z.string(),
  antes: z.unknown(),
  despues: z.unknown(),
  restado: parVidaSchema,
  combatientes: z.array(z.object({ id: z.string(), restado: parVidaSchema })),
});

// Un EstadoActivo guardado, por el lector tolerante de siempre; null si no había.
function leerEstadoGuardado(v: unknown): EstadoActivo | null | undefined {
  if (v === null) return null;
  const [e] = leerEstados([v]);
  return e;
}

export function leerDatosRegistro(tipo: string, json: unknown): DatosRegistro | null {
  const cambios = (json as { cambios?: unknown } | null)?.cambios;
  if (tipo === "xp" || tipo === "creditos") {
    const r = z.array(cambioRecursoSchema).safeParse(cambios);
    return r.success ? { tipo, cambios: r.data } : null;
  }
  if (tipo === "estado_poner" || tipo === "estado_quitar") {
    const r = z.array(cambioEstadoSchema).safeParse(cambios);
    if (!r.success) return null;
    const leidos: CambioEstadoPersonaje[] = [];
    for (const c of r.data) {
      const antes = leerEstadoGuardado(c.antes);
      const despues = leerEstadoGuardado(c.despues);
      // Un estado que ya no existe en el catálogo: no se puede devolver tal cual.
      if (antes === undefined || despues === undefined) return null;
      leidos.push({ ...c, antes, despues });
    }
    return { tipo, cambios: leidos };
  }
  return null;
}

export type Plan<T> = { ok: true; plan: T } | { ok: false; error: string };

export function entradaDeshacible(entrada: {
  tipo: string;
  datos: unknown;
  deshechoAt: Date | null;
}): Plan<DatosRegistro> {
  if (entrada.deshechoAt) return { ok: false, error: "Esa acción ya está deshecha." };
  const datos = leerDatosRegistro(entrada.tipo, entrada.datos);
  if (!datos) return { ok: false, error: "No se entiende lo que guardó esa acción: no se puede deshacer." };
  return { ok: true, plan: datos };
}

// --- xp y créditos ---

export function planDeshacerRecurso(
  recurso: RecursoMaster,
  cambios: CambioRecurso[],
  personajes: { id: string; nombre: string; valor: number }[],
): Plan<{ id: string; valor: number }[]> {
  const porId = new Map(personajes.map((p) => [p.id, p]));
  const valores: { id: string; valor: number }[] = [];
  for (const c of cambios) {
    const p = porId.get(c.characterId);
    if (!p) continue;
    const valor = p.valor - (c.despues - c.antes);
    if (valor < 0) {
      const que = recurso === "xp" ? "XP" : "créditos";
      return {
        ok: false,
        error: `${p.nombre} ya ha gastado parte de esos ${que} (le quedan ${p.valor}): deshacer le dejaría en ${valor}.`,
      };
    }
    valores.push({ id: p.id, valor });
  }
  return { ok: true, plan: valores };
}

// --- Estados ---

export type PersonajeParaDeshacer = { id: string; nombre: string; sheet: Sheet; estados: EstadoActivo[] };
// Las fotos del jugador en combates abiertos (todas, no solo las que tocó la entrada:
// su máximo se recalcula con los estados devueltos).
export type CombatienteParaDeshacer = {
  id: string;
  characterId: string;
  pgActual: number;
  fatigaActual: number;
};
export type EntradaPosterior = { tipo: string; datos: unknown };

export type PlanEstados = {
  personajes: { id: string; estados: EstadoActivo[]; sheet: Sheet }[];
  combatientes: { id: string; pgActual: number; pgMax: number; fatigaActual: number; fatigaMax: number }[];
};

// Mismo estado: mismo grado y misma clase de duración; las rondas pueden haber bajado.
function sigueIgual(actual: EstadoActivo, puesto: EstadoActivo): boolean {
  if (actual.gradoId !== puesto.gradoId) return false;
  if (puesto.rondasRestantes !== null) {
    return actual.rondasRestantes !== null && actual.rondasRestantes <= puesto.rondasRestantes;
  }
  return actual.rondasRestantes === null && actual.finDeEscena === puesto.finDeEscena;
}

function tocaEstado(posterior: EntradaPosterior, characterId: string, estadoId: string): boolean {
  const d = leerDatosRegistro(posterior.tipo, posterior.datos);
  if (!d || (d.tipo !== "estado_poner" && d.tipo !== "estado_quitar")) return false;
  return d.cambios.some((c) => c.characterId === characterId && c.estadoId === estadoId);
}

export function planDeshacerEstados(
  datos: DatosEstado,
  personajes: PersonajeParaDeshacer[],
  combatientes: CombatienteParaDeshacer[],
  posteriores: EntradaPosterior[],
): Plan<PlanEstados> {
  const porId = new Map(personajes.map((p) => [p.id, p]));
  const plan: PlanEstados = { personajes: [], combatientes: [] };

  for (const c of datos.cambios) {
    const p = porId.get(c.characterId);
    if (!p) continue;
    const actual = p.estados.find((e) => e.estadoId === c.estadoId) ?? null;

    if (c.despues) {
      if (!actual) return { ok: false, error: `${p.nombre} ya no tiene ese estado (se quitó o se le acabaron las rondas).` };
      if (!sigueIgual(actual, c.despues)) return { ok: false, error: `A ${p.nombre} le han cambiado ese estado después.` };
    } else if (actual) {
      return { ok: false, error: `A ${p.nombre} le han vuelto a poner ese estado después.` };
    }
    if (posteriores.some((e) => tocaEstado(e, c.characterId, c.estadoId))) {
      return {
        ok: false,
        error: `Hay una acción posterior sobre ese estado de ${p.nombre}: deshazla antes.`,
      };
    }

    const sinEste = quitarEstado(p.estados, c.estadoId);
    const estados = c.antes ? ponerEstado(sinEste, c.antes) : sinEste;
    const maximos = maximosConEstados(p.sheet, estados);
    const sheet = devolverVidaFicha(p.sheet, c.restado, maximos);
    plan.personajes.push({ id: p.id, estados, sheet });

    const devueltaPorFoto = new Map(c.combatientes.map((f) => [f.id, f.restado]));
    for (const f of combatientes.filter((f) => f.characterId === p.id)) {
      const devuelta = devueltaPorFoto.get(f.id) ?? { vida: 0, fatiga: 0 };
      plan.combatientes.push({
        id: f.id,
        pgActual: devolverVida(f.pgActual, devuelta.vida, maximos.vida),
        pgMax: maximos.vida,
        fatigaActual: devolverVida(f.fatigaActual, devuelta.fatiga, maximos.fatiga),
        fatigaMax: maximos.fatiga,
      });
    }
  }
  return { ok: true, plan };
}

function devolverVidaFicha(sheet: Sheet, devuelta: ParVida, maximos: ParVida): Sheet {
  if (devuelta.vida === 0 && devuelta.fatiga === 0) return sheet;
  return {
    ...sheet,
    vidaActual: devolverVida(sheet.vidaActual, devuelta.vida, maximos.vida),
    fatigaActual: devolverVida(sheet.fatigaActual, devuelta.fatiga, maximos.fatiga),
  };
}
