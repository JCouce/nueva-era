// Tiradas de cada combatiente en el combate en curso (Combatiente.tiradas, Json): lo que el
// máster ve en la consola, por ronda. Es un log para mirar, no estado mecánico: nada del motor
// lo lee. La ronda la pone el servidor al guardar (Combate.ronda en ese momento), nunca el
// cliente. Dos bloques por fila: las acciones y las defensas (grupo "Defensa": la esquiva y los
// bloqueos con arma, bayoneta, aguijón o brazo biónico).
import { z } from "zod";
import type { Accion, Resultado } from "./acciones";
import type { GrupoAccion } from "./modificadores";
import { gradoDeTirada } from "./poderes";

// Las últimas que se guardan por combatiente; las más viejas se caen al añadir.
export const MAX_TIRADAS_COMBATE = 150;

export const BLOQUES_TIRADA = ["accion", "esquiva"] as const;
export type BloqueTirada = (typeof BLOQUES_TIRADA)[number];

export const VEREDICTOS_TIRADA = ["exito", "fracaso", "critico", "fracasoCritico", "sinDificultad"] as const;
export type VeredictoTirada = (typeof VEREDICTOS_TIRADA)[number];

const entero = z.number().int().min(-999).max(999);

export const danioTiradaSchema = z.object({
  total: z.number().int().min(0).max(9999),
  categoria: z.string().trim().min(1).max(60),
});
export type DanioTirada = z.infer<typeof danioTiradaSchema>;

// Lo que manda el cliente: todo menos la ronda y la hora, que pone el servidor.
export const tiradaNuevaSchema = z.object({
  id: z.string().min(1).max(64),
  bloque: z.enum(BLOQUES_TIRADA),
  etiqueta: z.string().trim().min(1).max(120),
  total: entero,
  dificultad: entero.nullable(),
  contraEsquiva: z.literal(true).optional(),
  veredicto: z.enum(VEREDICTOS_TIRADA),
  danio: danioTiradaSchema.optional(),
});
export type TiradaNueva = z.infer<typeof tiradaNuevaSchema>;

export const tiradaCombateSchema = tiradaNuevaSchema.extend({
  ronda: z.number().int().min(1).max(9999),
  // Epoch en ms.
  at: z.number().int().min(0),
});
export type TiradaCombate = z.infer<typeof tiradaCombateSchema>;

export function bloqueDeGrupo(grupo: GrupoAccion): BloqueTirada {
  return grupo === "Defensa" ? "esquiva" : "accion";
}

export function veredictoDe(r: Pick<Resultado, "exito" | "critico">): VeredictoTirada {
  return gradoDeTirada(r) ?? "sinDificultad";
}

// El resumen de una tirada recién hecha en la pestaña Acciones (la Accion tirada y su
// Resultado). `etiqueta` aparte porque la tirada libre la monta con el par elegido.
export function resumenDeTirada(
  id: string,
  accion: Pick<Accion, "grupo">,
  etiqueta: string,
  r: Pick<Resultado, "total" | "dificultad" | "contraEsquiva" | "exito" | "critico">,
): TiradaNueva {
  return {
    id,
    bloque: bloqueDeGrupo(accion.grupo),
    etiqueta,
    total: r.total,
    dificultad: r.dificultad,
    ...(r.contraEsquiva && { contraEsquiva: true as const }),
    veredicto: veredictoDe(r),
  };
}

// Lectura tolerante del Json: lo que no encaje en el schema se descarta, sin romper la consola.
export function leerTiradasCombate(json: unknown): TiradaCombate[] {
  if (!Array.isArray(json)) return [];
  const leidas: TiradaCombate[] = [];
  for (const t of json) {
    const p = tiradaCombateSchema.safeParse(t);
    if (p.success) leidas.push(p.data);
  }
  return leidas;
}

// Añade al final (orden de llegada) y se queda con las últimas MAX_TIRADAS_COMBATE. Un id que ya
// estaba no se duplica (reintento del cliente).
export function anadirTirada(lista: TiradaCombate[], nueva: TiradaNueva, ronda: number, at: number): TiradaCombate[] {
  if (lista.some((t) => t.id === nueva.id)) return lista;
  return [...lista, { ...nueva, ronda, at }].slice(-MAX_TIRADAS_COMBATE);
}

// El daño se tira después, sobre la misma entrada: no es una línea nueva. Sin esa id (se cayó
// del tope o era de otro combate), no cambia nada.
export function anotarDanioTirada(lista: TiradaCombate[], id: string, danio: DanioTirada): TiradaCombate[] {
  return lista.some((t) => t.id === id) ? lista.map((t) => (t.id === id ? { ...t, danio } : t)) : lista;
}

export type RondaDeTiradas = { ronda: number; acciones: TiradaCombate[]; esquivas: TiradaCombate[] };

const enBloques = (ronda: number, tiradas: TiradaCombate[]): RondaDeTiradas => ({
  ronda,
  acciones: tiradas.filter((t) => t.bloque === "accion"),
  esquivas: tiradas.filter((t) => t.bloque === "esquiva"),
});

export function tiradasDeRonda(lista: TiradaCombate[], ronda: number): RondaDeTiradas {
  return enBloques(
    ronda,
    lista.filter((t) => t.ronda === ronda),
  );
}

// El historial, de la ronda más reciente a la primera; dentro de cada una, en orden de llegada.
export function agruparTiradasPorRonda(lista: TiradaCombate[]): RondaDeTiradas[] {
  const rondas = [...new Set(lista.map((t) => t.ronda))].sort((a, b) => b - a);
  return rondas.map((ronda) => tiradasDeRonda(lista, ronda));
}

const TEXTO_VEREDICTO: Record<VeredictoTirada, string> = {
  exito: "éxito",
  fracaso: "fracaso",
  critico: "crítico",
  fracasoCritico: "fracaso crítico",
  sinDificultad: "sin dificultad",
};

export function textoVeredicto(v: VeredictoTirada): string {
  return TEXTO_VEREDICTO[v];
}

// «contra 7», «contra esquiva 12» o nada.
export function textoContra(t: Pick<TiradaCombate, "dificultad" | "contraEsquiva">): string | null {
  if (t.dificultad === null) return null;
  return t.contraEsquiva ? `contra esquiva ${t.dificultad}` : `contra ${t.dificultad}`;
}
