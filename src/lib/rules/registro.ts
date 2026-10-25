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
//   - Limpiar estados (y el viejo fin de escena): como quitar, para cada estado que limpió; si uno
//     solo ha vuelto a ponerse, no se devuelve ninguno.
//   - En los de estado, además: si una entrada posterior sin deshacer toca ese
//     mismo estado de ese personaje, no (hay que deshacer antes la posterior).
//   - Un personaje borrado se salta: no queda nada suyo que devolver.
//   - Vida/fatiga (pestaña Vida del máster, tipo "vida"): se vuelve al "antes" de cada
//     objetivo (ficha o foto de combate, jugador o NPC), recortado a su tope de hoy. No
//     se puede si el valor actual ya no es el "después" registrado: alguien lo ha
//     movido después (el jugador, otra acción, un estado que restó) y hay que deshacer
//     antes lo posterior; tampoco se toca a nadie más de la entrada. Un objetivo que ya
//     no existe (personaje borrado, combatiente de un combate cerrado o quitado) se
//     salta. Solo mira el valor, no las entradas posteriores: si lo posterior ya lo
//     devolvió al mismo número, se deja deshacer.
//     Con desglose (vida, entradas desde 2026-10-25): cada cambio guarda el desglose de
//     antes y de después; deshacer exige que el de ahora sea el de después (curar una
//     categoría y dañar otra deja el número igual) y devuelve exactamente el de antes.
//     Las entradas viejas, sin desglose, vuelven al número y el desglose se normaliza.
import { z } from "zod";
import { leerEstados, ponerEstado, quitarEstado } from "./estadosFicha";
import type { EstadoActivo } from "./estados";
import {
  cambianActivables,
  devolverVida,
  maximosConEstados,
  type CambioEstadoPersonaje,
  type ParVida,
} from "./vidaPorEstados";
import type { Sheet } from "./sheet";
import { reconciliarVida, topesDeVida, vidaTrasAjuste } from "./vitalidad";
import { ajustarVidaDeObjetivo, type RecursoVital } from "./ajusteVida";
import { CATEGORIAS_DANIO, danioIgual, danioSchema, normalizarDanio, type CategoriaDanio, type DanioVida } from "./danio";

// Los que vengan se añaden aquí con su forma.
export const TIPOS_REGISTRO = ["xp", "creditos", "estado_poner", "estado_quitar", "fin_escena", "limpiar_estados", "vida"] as const;
export type TipoRegistro = (typeof TIPOS_REGISTRO)[number];
export type RecursoMaster = "xp" | "creditos";

export type CambioRecurso = { characterId: string; antes: number; despues: number };

// Un miembro por tipo (y no `tipo: "xp" | "creditos"`) para que TS estreche bien.
export type DatosRecurso = { tipo: "xp"; cambios: CambioRecurso[] } | { tipo: "creditos"; cambios: CambioRecurso[] };
// fin_escena (entradas de antes de "Limpiar estados") y limpiar_estados: un cambio por
// estado quitado (varios por personaje).
export type DatosEstado =
  | { tipo: "estado_poner"; cambios: CambioEstadoPersonaje[] }
  | { tipo: "estado_quitar"; cambios: CambioEstadoPersonaje[] }
  | { tipo: "fin_escena"; cambios: CambioEstadoPersonaje[] }
  | { tipo: "limpiar_estados"; cambios: CambioEstadoPersonaje[] };
// Vida o fatiga (pestaña Vida): un cambio por objetivo. `ficha`: Character.stats (id =
// characterId); `combatiente`: la foto de combate (id = combatienteId), jugador o NPC.
// El nombre se guarda para el texto (un NPC no tiene ficha de donde leerlo). `delta`:
// lo que pidió el máster; cada cambio guarda lo que de verdad movió (con los topes).
export type ObjetivoVida = "ficha" | "combatiente";
// `danioAntes`/`danioDespues`: el desglose de la vida (solo recurso vida, entradas nuevas).
// `categoria`: la que eligió el máster (sin ella, el ajuste sin categoría de siempre).
export type CambioVida = {
  objetivo: ObjetivoVida;
  id: string;
  nombre: string;
  npc: boolean;
  antes: number;
  despues: number;
  danioAntes?: DanioVida;
  danioDespues?: DanioVida;
};
export type DatosVida = { tipo: "vida"; recurso: RecursoVital; delta: number; categoria?: CategoriaDanio; cambios: CambioVida[] };

export type DatosRegistro = DatosRecurso | DatosEstado | DatosVida;

// Lo que va a la columna `datos` (el tipo va en su columna).
export function datosParaGuardar(
  d: DatosRegistro,
):
  | { cambios: DatosRegistro["cambios"] }
  | { recurso: RecursoVital; delta: number; categoria?: CategoriaDanio; cambios: CambioVida[] } {
  if (d.tipo === "vida") {
    return d.categoria
      ? { recurso: d.recurso, delta: d.delta, categoria: d.categoria, cambios: d.cambios }
      : { recurso: d.recurso, delta: d.delta, cambios: d.cambios };
  }
  return { cambios: d.cambios };
}

// Las columnas characterIds y combatienteIds de RegistroMaster: a quién toca la entrada.
export function idsDeRegistro(d: DatosRegistro): { characterIds: string[]; combatienteIds: string[] } {
  if (d.tipo === "vida") {
    const de = (o: ObjetivoVida) => [...new Set(d.cambios.filter((c) => c.objetivo === o).map((c) => c.id))];
    return { characterIds: de("ficha"), combatienteIds: de("combatiente") };
  }
  return { characterIds: [...new Set(d.cambios.map((c) => c.characterId))], combatienteIds: [] };
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

const datosVidaSchema = z.object({
  recurso: z.enum(["vida", "fatiga"]),
  delta: z.number().int(),
  categoria: z.enum(CATEGORIAS_DANIO).optional(),
  cambios: z.array(
    z.object({
      objetivo: z.enum(["ficha", "combatiente"]),
      id: z.string(),
      nombre: z.string(),
      npc: z.boolean(),
      antes: z.number().int(),
      despues: z.number().int(),
      danioAntes: danioSchema.optional(),
      danioDespues: danioSchema.optional(),
    }),
  ),
});

export function leerDatosRegistro(tipo: string, json: unknown): DatosRegistro | null {
  if (tipo === "vida") {
    const r = datosVidaSchema.safeParse(json);
    return r.success ? { tipo, ...r.data } : null;
  }
  const cambios = (json as { cambios?: unknown } | null)?.cambios;
  if (tipo === "xp" || tipo === "creditos") {
    const r = z.array(cambioRecursoSchema).safeParse(cambios);
    return r.success ? { tipo, cambios: r.data } : null;
  }
  if (tipo === "estado_poner" || tipo === "estado_quitar" || tipo === "fin_escena" || tipo === "limpiar_estados") {
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

// "Kira", "Kira y Tarsis", "Kira, Tarsis y Oru".
export function listaLegible(nombres: string[]): string {
  if (nombres.length <= 1) return nombres.join("");
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

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

// Sumar `cantidad` (negativa para quitar) a varios. Si a alguien le dejaría en negativo,
// no se mueve nada para nadie y se dice a quién no le llega (decisión del usuario,
// 2026-10-16: avisar en vez de recortar a 0). Quien no cambia (cantidad 0) no sale.
export function planAjusteRecurso(
  recurso: RecursoMaster,
  cantidad: number,
  personajes: { id: string; nombre: string; valor: number }[],
): Plan<CambioRecurso[]> {
  const cortos = personajes.filter((p) => p.valor + cantidad < 0);
  if (cortos.length > 0) {
    const que = recurso === "xp" ? "XP" : "créditos";
    const quien = listaLegible(cortos.map((p) => `${p.nombre} (${p.valor})`));
    const verbo = cortos.length === 1 ? "no tiene" : "no tienen";
    return { ok: false, error: `${quien} ${verbo} ${-cantidad} ${que} que quitar.` };
  }
  if (cantidad === 0) return { ok: true, plan: [] };
  return { ok: true, plan: personajes.map((p) => ({ characterId: p.id, antes: p.valor, despues: p.valor + cantidad })) };
}

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
  if (!d || d.tipo === "xp" || d.tipo === "creditos" || d.tipo === "vida") return false;
  return d.cambios.some((c) => c.characterId === characterId && c.estadoId === estadoId);
}

// Los cambios se aplican uno tras otro sobre el mismo personaje (fin de escena trae
// varios por personaje), y la vida y los máximos se calculan al final con todos.
export function planDeshacerEstados(
  datos: DatosEstado,
  personajes: PersonajeParaDeshacer[],
  combatientes: CombatienteParaDeshacer[],
  posteriores: EntradaPosterior[],
): Plan<PlanEstados> {
  const porId = new Map(personajes.map((p) => [p.id, p]));
  type EnCurso = { p: PersonajeParaDeshacer; estados: EstadoActivo[]; ficha: ParVida; fotos: Map<string, ParVida> };
  const enCurso = new Map<string, EnCurso>();

  for (const c of datos.cambios) {
    const p = porId.get(c.characterId);
    if (!p) continue;
    const w = enCurso.get(p.id) ?? { p, estados: p.estados, ficha: { vida: 0, fatiga: 0 }, fotos: new Map() };
    const actual = w.estados.find((e) => e.estadoId === c.estadoId) ?? null;

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

    const sinEste = quitarEstado(w.estados, c.estadoId);
    w.estados = c.antes ? ponerEstado(sinEste, c.antes) : sinEste;
    w.ficha = sumar(w.ficha, c.restado);
    for (const f of c.combatientes) w.fotos.set(f.id, sumar(w.fotos.get(f.id) ?? { vida: 0, fatiga: 0 }, f.restado));
    enCurso.set(p.id, w);
  }

  // Si deshacer pone o quita un activable de aumento (deshacer "Activar", A5b), la vida que
  // quede por encima del máximo nuevo se recorta, como al caerse (vidaTrasCambioDeEstados).
  // La ficha, a su tope (topesDeVida, también para devolver); la foto, a su máximo.
  const plan: PlanEstados = { personajes: [], combatientes: [] };
  for (const { p, estados, ficha, fotos } of enCurso.values()) {
    const maximos = maximosConEstados(p.sheet, estados);
    const topes = topesDeVida(p.sheet, estados);
    const recorta = cambianActivables(p.estados, estados);
    const devuelta = devolverVidaFicha(p.sheet, ficha, topes);
    plan.personajes.push({ id: p.id, estados, sheet: recorta ? reconciliarVida(devuelta, topes) : devuelta });
    const alTope = (n: number, max: number) => (recorta ? Math.min(n, Math.max(0, max)) : n);
    for (const f of combatientes.filter((f) => f.characterId === p.id)) {
      const devueltaFoto = fotos.get(f.id) ?? { vida: 0, fatiga: 0 };
      plan.combatientes.push({
        id: f.id,
        pgActual: alTope(devolverVida(f.pgActual, devueltaFoto.vida, maximos.vida), maximos.vida),
        pgMax: maximos.vida,
        fatigaActual: alTope(devolverVida(f.fatigaActual, devueltaFoto.fatiga, maximos.fatiga), maximos.fatiga),
        fatigaMax: maximos.fatiga,
      });
    }
  }
  return { ok: true, plan };
}

const sumar = (a: ParVida, b: ParVida): ParVida => ({ vida: a.vida + b.vida, fatiga: a.fatiga + b.fatiga });

function devolverVidaFicha(sheet: Sheet, devuelta: ParVida, maximos: ParVida): Sheet {
  if (devuelta.vida === 0 && devuelta.fatiga === 0) return sheet;
  return {
    ...sheet,
    vidaActual: devolverVida(sheet.vidaActual, devuelta.vida, maximos.vida),
    fatigaActual: devolverVida(sheet.fatigaActual, devuelta.fatiga, maximos.fatiga),
  };
}

// --- Vida y fatiga (pestaña Vida) ---

// Un objetivo de la pestaña Vida tal como está ahora: valor actual y hasta dónde puede
// subir (máximo en reposo en la ficha, S74; pgMax/fatigaMax en la foto). `danio`: el
// desglose de la vida perdida contra `tope` (solo recurso vida).
export type ObjetivoVidaActual = {
  objetivo: ObjetivoVida;
  id: string;
  nombre: string;
  npc: boolean;
  actual: number;
  tope: number;
  danio?: DanioVida;
};

// Sumar `delta` (negativo = daño) a varios, con los topes de siempre (vidaTrasAjuste) y,
// con `categoria`, a esa parte del desglose (ajustarVidaDeObjetivo). Quien no cambia
// (curar a quien ya está al tope o no tiene daño de esa categoría, dañar a quien está a 0)
// no sale.
export function planAjusteVida(objetivos: ObjetivoVidaActual[], delta: number, categoria?: CategoriaDanio): CambioVida[] {
  return objetivos.flatMap((o) => {
    const r = ajustarVidaDeObjetivo(o, delta, categoria);
    if (r.despues === o.actual) return [];
    const base = { objetivo: o.objetivo, id: o.id, nombre: o.nombre, npc: o.npc, antes: o.actual, despues: r.despues };
    return o.danio && r.danio ? [{ ...base, danioAntes: o.danio, danioDespues: r.danio }] : [base];
  });
}

const claveVida = (o: { objetivo: ObjetivoVida; id: string }) => `${o.objetivo}:${o.id}`;

export type ValorDeshacerVida = { objetivo: ObjetivoVida; id: string; valor: number; danio?: DanioVida };

// Criterio en la cabecera del archivo. `actuales`: los objetivos de la entrada que
// siguen existiendo, con su valor de ahora.
export function planDeshacerVida(datos: DatosVida, actuales: ObjetivoVidaActual[]): Plan<ValorDeshacerVida[]> {
  const porClave = new Map(actuales.map((a) => [claveVida(a), a]));
  const que = datos.recurso === "vida" ? "vida" : "fatiga";
  const valores: ValorDeshacerVida[] = [];
  for (const c of datos.cambios) {
    const a = porClave.get(claveVida(c));
    if (!a) continue;
    if (a.actual !== c.despues) {
      return {
        ok: false,
        error: `${a.nombre} ya no tiene ${c.despues} de ${que} (ahora ${a.actual}): algo lo ha cambiado después. Deshaz antes lo posterior.`,
      };
    }
    if (c.danioDespues && a.danio && !danioIgual(a.danio, c.danioDespues)) {
      return {
        ok: false,
        error: `A ${a.nombre} le han cambiado el tipo de daño después: deshaz antes lo posterior.`,
      };
    }
    const valor = vidaTrasAjuste(c.antes, a.tope, 0);
    const base = { objetivo: c.objetivo, id: c.id, valor };
    if (!a.danio) {
      valores.push(base);
      continue;
    }
    // Entrada vieja sin desglose: el de ahora, normalizado a la vida devuelta.
    valores.push({ ...base, danio: normalizarDanio(c.danioAntes ?? a.danio, a.tope - valor) });
  }
  return { ok: true, plan: valores };
}
