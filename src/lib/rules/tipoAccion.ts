// Tipo de acción de lo que se hace con una fila además de tirarla (T5c del barrido, eq-35 y do-07):
// desenfundar y recargar el arma, inyectarse el fármaco. La app no cuenta acciones por turno: el
// tipo es una etiqueta que informa (docs/sistema.md §10, «La app no cuenta acciones»).
//
//   base     lo que dice la fuente para esa fila (la declara quien genera la fila, desde el catálogo)
//   rebaja   lo que la abarata, declarado en el catálogo por pieza (NivelModulo.rebajasTipoAccion) o
//            dote (efecto "economia"); la aplica resolverTipoAccion
//
// La fila enseña el tipo ya rebajado con su fuente; donde la rebaja tiene límite de uso («una vez
// por turno»), un selector frente a la normal, por si ya se gastó. Nada bloquea ni cuenta.
import { z } from "zod";
import type { Economia } from "./psionica";
import type { EmpleoArma } from "./modificadores";
import type { CondicionTirada, OpcionCondicion } from "./condiciones";
import type { OrigenAporte } from "./origen";

// ── Economía: etiquetas y el paso de rebaja (compartidos con los poderes, poderes.ts) ──────────

const ETIQUETA_ECONOMIA: Record<Exclude<Economia, { tiempo: string }>, string> = {
  gratuita: "Gratuita",
  simple: "Simple",
  estandar: "Estándar",
  compleja: "Compleja",
  reaccion: "Reacción",
};

export function etiquetaEconomia(e: Economia): string {
  return typeof e === "string" ? ETIQUETA_ECONOMIA[e] : e.tiempo;
}

// Un paso menos: tiempos largos → compleja → estándar → simple (nunca por debajo).
const PASO_ECONOMIA: Partial<Record<Economia & string, Economia>> = { compleja: "estandar", estandar: "simple" };
const PASO_TIEMPO: Record<string, Economia> = {
  "1 hora": { tiempo: "10 minutos" },
  "10 minutos": { tiempo: "1 minuto" },
  "1 minuto": "compleja",
};

export const mismaEconomia = (a: Economia, b: Economia) => JSON.stringify(a) === JSON.stringify(b);

export function bajarUnPaso(e: Economia): Economia {
  if (typeof e === "string") return PASO_ECONOMIA[e] ?? e;
  return PASO_TIEMPO[e.tiempo] ?? e;
}

// Cuánto cuesta, para saber si una sustitución abarata. La reacción no es más barata que la simple:
// es otro momento del turno, así que solo entra como alternativa.
function coste(e: Economia): number {
  if (typeof e !== "string") return 4;
  return { gratuita: 0, simple: 1, reaccion: 1, estandar: 2, compleja: 3 }[e];
}

// «acción simple», «acción gratuita», «reacción», «1 minuto».
function textoEconomia(e: Economia): string {
  if (typeof e !== "string") return e.tiempo;
  return e === "reaccion" ? "reacción" : `acción ${etiquetaEconomia(e).toLocaleLowerCase("es")}`;
}
const lista = (tipos: readonly Economia[]) => tipos.map(textoEconomia).join(" o ");
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ── Datos ───────────────────────────────────────────────────────────────────────────────────

export const ACCIONES_CON_TIPO = ["desenfundar", "recargar", "inyectarse"] as const;
export type AccionConTipo = (typeof ACCIONES_CON_TIPO)[number];

const ETIQUETA_ACCION: Record<AccionConTipo, string> = {
  desenfundar: "Desenfundar",
  recargar: "Recargar",
  inyectarse: "Inyectarse",
};

export const economiaSchema = z.union([
  z.enum(["gratuita", "simple", "estandar", "compleja", "reaccion"]),
  z.strictObject({ tiempo: z.string().min(1) }),
]);

// Lo que abarata una acción. `op`:
//   sustituye     pasa a ser `a` si eso la abarata (Inyector 1: simple; Funda: gratuita)
//   baja_un_paso  compleja → estándar → simple, nunca por debajo (Recarga Relámpago)
//   alternativa   otra forma de hacerla, `a`, con su `limite`: selector frente a la normal
//                 (Inyector 2: gratuita o reacción, una vez por turno)
// `desde`: solo si el tipo de la fuente (el de base, sin rebajar) es uno de estos (Recarga
// Relámpago baja la compleja y la estándar; a la que ya es simple le pone la alternativa, y a la
// estándar que baja a simple, no). Filtros de la fila: `empleo` del arma
// (Funda 1: a una mano) y `soloArmaDeFuego` (Recarga Relámpago).
export const rebajaTipoAccionSchema = z
  .strictObject({
    accion: z.enum(ACCIONES_CON_TIPO),
    op: z.enum(["sustituye", "baja_un_paso", "alternativa"]),
    a: z.array(economiaSchema).min(1).optional(),
    desde: z.array(economiaSchema).min(1).optional(),
    limite: z.strictObject({ veces: z.number().int().min(1), por: z.literal("turno") }).optional(),
    empleo: z.enum(["una mano", "dos manos"]).optional(),
    soloArmaDeFuego: z.literal(true).optional(),
    nota: z.string().min(1).optional(),
  })
  .refine((r) => (r.op === "baja_un_paso") === (r.a === undefined), "`a` va con sustituye y alternativa, y solo con ellas")
  .refine((r) => r.op === "alternativa" || r.limite === undefined, "`limite` solo en una alternativa");

export type RebajaTipoAccion = z.infer<typeof rebajaTipoAccionSchema>;
export type RebajaConFuente = RebajaTipoAccion & { fuente: string; origen?: OrigenAporte };

// La acción de una fila con su tipo de base. `base` null: la fuente no lo da (desenfundar un arma
// melee); sin nada que la rebaje, no se enseña. `empleo` y `armaDeFuego`: lo que miran los filtros
// de las rebajas. `rebajas`: las de esta fila sola (el arma incorporada en el Brazo Biónico).
export type TipoAccionBase = {
  accion: AccionConTipo;
  base: Economia[] | null;
  empleo?: EmpleoArma;
  armaDeFuego?: true;
  rebajas?: RebajaConFuente[];
};

export type FuenteRebaja = { fuente: string; origen?: OrigenAporte };

// `normal`: el tipo que vale siempre, ya rebajado (null si la fuente no lo da y nada lo fija).
// `limitadas`: las alternativas con límite de uso.
export type TipoAccionEnTirada = {
  accion: AccionConTipo;
  etiqueta: string;
  normal: Economia[] | null;
  limitadas: { tipos: Economia[]; limite: { veces: number; por: "turno" } | null; fuente: FuenteRebaja }[];
  fuentes: FuenteRebaja[];
  notas: string[];
};

// ── Motor ───────────────────────────────────────────────────────────────────────────────────

const casaDesde = (desde: readonly Economia[] | undefined, base: Economia[] | null) =>
  !desde || (base !== null && desde.some((d) => mismaEconomia(d, base[0])));

// El tipo de una acción de la fila con las rebajas de la ficha (y las suyas). Primero lo que
// cambia el tipo normal, en el orden declarado; luego las alternativas.
// null si no hay nada que enseñar.
export function resolverTipoAccion(base: TipoAccionBase, deFicha: readonly RebajaConFuente[]): TipoAccionEnTirada | null {
  const aplicables = [...(base.rebajas ?? []), ...deFicha].filter(
    (r) =>
      r.accion === base.accion &&
      (!r.empleo || r.empleo === base.empleo) &&
      (!r.soloArmaDeFuego || base.armaDeFuego === true),
  );
  let normal = base.base;
  const fuentes: FuenteRebaja[] = [];
  const notas: string[] = [];
  const anota = (r: RebajaConFuente) => {
    if (!fuentes.some((f) => f.fuente === r.fuente)) fuentes.push({ fuente: r.fuente, ...(r.origen && { origen: r.origen }) });
    if (r.nota && !notas.includes(r.nota)) notas.push(r.nota);
  };
  for (const r of aplicables) {
    if (r.op === "alternativa" || !casaDesde(r.desde, base.base)) continue;
    if (r.op === "sustituye" && r.a && (normal === null || coste(r.a[0]) < coste(normal[0]))) {
      normal = r.a;
      anota(r);
    } else if (r.op === "baja_un_paso" && normal !== null) {
      const bajado = normal.map(bajarUnPaso);
      if (bajado.some((e, i) => !mismaEconomia(e, normal![i]))) {
        normal = bajado.filter((e, i) => bajado.findIndex((x) => mismaEconomia(x, e)) === i);
        anota(r);
      }
    }
  }
  const limitadas: TipoAccionEnTirada["limitadas"] = [];
  for (const r of aplicables) {
    if (r.op !== "alternativa" || !r.a || !casaDesde(r.desde, base.base)) continue;
    limitadas.push({ tipos: r.a, limite: r.limite ?? null, fuente: { fuente: r.fuente, ...(r.origen && { origen: r.origen }) } });
    anota(r);
  }
  if (normal === null && limitadas.length === 0) return null;
  return { accion: base.accion, etiqueta: ETIQUETA_ACCION[base.accion], normal, limitadas, fuentes, notas };
}

export function resolverTiposDeAccion(
  bases: readonly TipoAccionBase[] | undefined,
  deFicha: readonly RebajaConFuente[],
): TipoAccionEnTirada[] {
  return (bases ?? []).flatMap((b) => resolverTipoAccion(b, deFicha) ?? []);
}

const textoLimite = (l: { veces: number; por: "turno" } | null) =>
  l ? (l.veces === 1 ? "una vez por turno" : `${l.veces} veces por turno`) : null;

// «Recargar: acción simple, o acción gratuita o reacción, una vez por turno». La fuente va
// aparte (TextoDeTirada.fuente).
export function textoTipoAccion(t: TipoAccionEnTirada): string {
  const partes = [
    ...(t.normal ? [lista(t.normal)] : []),
    ...t.limitadas.map((l) => {
      const limite = textoLimite(l.limite);
      return `${t.normal ? "o " : ""}${lista(l.tipos)}${limite ? `, ${limite}` : ""}`;
    }),
  ];
  const notas = t.notas.length > 0 ? `. ${t.notas.join(" ")}` : "";
  return `${t.etiqueta}: ${partes.join(", ")}${notas}`;
}

export const idSelectorTipoAccion = (accion: AccionConTipo) => `tipo_accion_${accion}`;

// El selector de una acción con alternativa limitada: la limitada (por defecto) frente a la
// normal, por si ya la gastaste. No suma nada: informa. null si no hay alternativa o no hay normal
// con la que comparar.
export function selectorTipoAccion(t: TipoAccionEnTirada): CondicionTirada | null {
  if (t.limitadas.length === 0 || !t.normal) return null;
  const opciones: OpcionCondicion[] = [
    ...t.limitadas.map((l, i): OpcionCondicion => {
      const limite = textoLimite(l.limite);
      return {
        id: `limitada_${i}`,
        etiqueta: capital(lista(l.tipos)),
        valor: 0,
        sinValor: true,
        nota: `${capital(lista(l.tipos))}${limite ? `, ${limite}` : ""} (${l.fuente.fuente}). Si ya la has gastado, la otra.`,
      };
    }),
    { id: "normal", etiqueta: capital(lista(t.normal)), valor: 0, sinValor: true },
  ];
  const origen = t.limitadas[0].fuente.origen;
  return {
    id: idSelectorTipoAccion(t.accion),
    tipo: "opcion",
    etiqueta: t.etiqueta,
    opciones,
    porDefecto: opciones[0].id,
    ...(origen && { origen }),
  };
}
