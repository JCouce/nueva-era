// Sobreesfuerzo psiónico (T6a del cuestionario de cierre: es-01, au-05, ps-01…04; usuario
// 2026-11-13). Sustituye al peaje neurológico viejo del Maolher (Fortaleza 5 + nivel, un nivel
// de daño por punto de fatiga): la foto de Drive del 14 de octubre lo rehace como sobreesfuerzo.
//
// Quién puede tener poderes (au-04) y con qué sobreesfuerzo lo declara el catálogo, como
// «fuente psiónica»: un rasgo de especie (Arianyi, Casa de Maolher) o un nivel del Implante de
// Resonancia Métrica. Cada fuente trae su sobreesfuerzo: cuándo salta (nivel del poder desde el
// que salta y hasta el que nunca salta; estar fatigado siempre lo dispara), la dificultad de la
// salvación de Voluntad (base + nivel empleado) y su tabla de daño y estados por grado, normal
// y exhausto. Las dotes lo retocan (Potencia, Maestría y Gran Maestría Psiónica: nunca salta
// hasta cierto nivel; Maestría: su tabla, si es más suave; Saber es Poder: moneda si salta solo
// por estar fatigado).
//
// Aquí solo los datos y las decisiones, sin catálogos de especie, equipo ni dotes (los junta
// fuentesPsionicas.ts) ni montaje de tiradas (usoPoder.ts): lo importan los tipos del catálogo
// de dotes.
import { z } from "zod";
import { CATEGORIAS_DANIO, type CategoriaDanio } from "./danio";
import type { UmbralFatiga } from "./estados";
import type { ConsecuenciaPropia } from "./consecuenciasPropias";
import { estadoPorId } from "../catalog/estados";
import { TIPOS_DANIO } from "../catalog/tiposDanio";

const TIPOS_DANIO_IDS = TIPOS_DANIO.map((t) => t.id) as [(typeof TIPOS_DANIO)[number]["id"], ...(typeof TIPOS_DANIO)[number]["id"][]];

// «Exhausto» empeora la tabla (ps-02); fatigado o normal usan la base.
export const UMBRALES_SOBREESFUERZO = ["base", "exhausto"] as const;
export type UmbralSobreesfuerzo = (typeof UMBRALES_SOBREESFUERZO)[number];
export const GRADOS_FALLO = ["fracaso", "fracasoCritico"] as const;
export type GradoFallo = (typeof GRADOS_FALLO)[number];

// Un estado que el fallo te pone. `turnos: "nivelPoder"`: tantos como el nivel del poder
// empleado (la confusión del fracaso crítico del Maolher).
const estadoSobreesfuerzoSchema = z.strictObject({
  estadoId: z.string().min(1),
  gradoId: z.string().min(1),
  turnos: z.union([z.number().int().min(1), z.literal("nivelPoder")]),
});

// Lo que te pasa en una casilla de la tabla. `muerte`: muerte cerebral automática (fracaso
// crítico del implante 1 y 2 estando exhausto); la app no la aplica, la avisa. `danio.tipo`: el
// tipo de daño, si la fuente lo dice (Resonancia Métrica: mental, sync Drive 2026-11-14). No
// cambia cómo se aplica: el sobreesfuerzo ya entra sin blindaje.
export const resultadoSobreesfuerzoSchema = z.strictObject({
  danio: z
    .strictObject({ valor: z.number().int().min(1), categoria: z.enum(CATEGORIAS_DANIO), tipo: z.enum(TIPOS_DANIO_IDS).optional() })
    .optional(),
  estados: z.array(estadoSobreesfuerzoSchema),
  muerte: z.literal(true).optional(),
});
export type ResultadoSobreesfuerzo = z.infer<typeof resultadoSobreesfuerzoSchema>;
export type EstadoSobreesfuerzo = z.infer<typeof estadoSobreesfuerzoSchema>;

// Cada casilla, las opciones entre las que se elige: una sola casi siempre; dos en el fracaso
// crítico del implante 4 («escoger entre sufrir aturdimiento o recibir daño letal»).
const casillaSchema = z.array(resultadoSobreesfuerzoSchema).min(1);
export type CasillaSobreesfuerzo = z.infer<typeof casillaSchema>;
export type TablaSobreesfuerzo = Record<UmbralSobreesfuerzo, Record<GradoFallo, CasillaSobreesfuerzo>>;

// Lo que declara una fuente psiónica (rasgo de especie, nivel de implante).
//   dificultadBase   Voluntad contra base + nivel empleado
//   desdeNivel       salta con poderes de este nivel o más; null = el nivel solo no lo dispara
//                    (implante 4: solo fatigado)
//   inmuneHastaNivel con poderes de este nivel o menos nunca salta, ni fatigado (implante 3 y 4)
export type SobreesfuerzoDeclarado = {
  dificultadBase: number;
  desdeNivel: number | null;
  inmuneHastaNivel: number;
  tabla: TablaSobreesfuerzo;
};
export type FuentePsionica = { sobreesfuerzo: SobreesfuerzoDeclarado };

// Lo que hace una dote con el sobreesfuerzo (efecto de dote «sobreesfuerzo», generado desde
// docs/modelado-dotes.json): nunca salta hasta un nivel; una casilla de su tabla; o la moneda.
export const efectoSobreesfuerzoDoteSchema = z.discriminatedUnion("tipo", [
  z.strictObject({ tipo: z.literal("inmune"), hastaNivel: z.number().int().min(1).max(6) }),
  z.strictObject({
    tipo: z.literal("tabla"),
    umbral: z.enum(UMBRALES_SOBREESFUERZO),
    grado: z.enum(GRADOS_FALLO),
    casilla: casillaSchema,
  }),
  z.strictObject({ tipo: z.literal("moneda") }),
]);
export type EfectoSobreesfuerzoDote = z.infer<typeof efectoSobreesfuerzoDoteSchema>;

// Lo de la ficha, ya junto (fuentesPsionicas.ts). `fuentes` vacío: sin acceso a la psiónica.
export type FuenteConNombre = SobreesfuerzoDeclarado & { fuente: string };
export type SobreesfuerzoDeDotes = {
  inmune: { hastaNivel: number; fuente: string } | null;
  tabla: { casillas: Partial<Record<UmbralSobreesfuerzo, Partial<Record<GradoFallo, CasillaSobreesfuerzo>>>>; fuente: string } | null;
  moneda: { fuente: string } | null;
};
export const SIN_DOTES_SOBREESFUERZO: SobreesfuerzoDeDotes = { inmune: null, tabla: null, moneda: null };
export type SobreesfuerzoDeFicha = { fuentes: FuenteConNombre[]; dotes: SobreesfuerzoDeDotes };

// Un sobreesfuerzo que toca tras usar un poder: lo que pinta el panel y lo que vuelve a
// calcular el servidor al aplicar el fallo.
export type SobreesfuerzoDeUso = {
  fuente: string;
  nivel: number; // nivel empleado
  dificultad: number;
  umbral: Exclude<UmbralFatiga, "normal"> | null; // null = no fatigado
  // Salta solo por estar fatigado (el nivel no llega): ahí entra Saber es Poder.
  soloPorFatiga: boolean;
  moneda: { fuente: string } | null;
  // Las dos casillas de fallo que valen (umbral ya elegido), con de dónde sale cada una.
  fallos: Record<GradoFallo, { casilla: CasillaSobreesfuerzo; fuente: string }>;
};

// Si salta con este nivel y este umbral de fatiga (ps-02: «fatigado» = umbral Fatigado o peor).
// TODO(revisar): el umbral es el de después de pagar el poder (es el que ve el servidor al
// aplicar el fallo); la prosa dice «estando fatigado» y no aclara si antes o después del gasto.
export function saltaSobreesfuerzo(s: Pick<SobreesfuerzoDeclarado, "desdeNivel" | "inmuneHastaNivel">, nivel: number, fatigado: boolean, inmuneDotes = 0): boolean {
  if (nivel <= Math.max(s.inmuneHastaNivel, inmuneDotes)) return false;
  return fatigado || (s.desdeNivel !== null && nivel >= s.desdeNivel);
}

// El sobreesfuerzo de este uso, o null si no toca. Con varias fuentes (un Maolher con el
// implante), la que salte con más dificultad. TODO(revisar): la fuente no contempla dos.
export function sobreesfuerzoDeUso(s: SobreesfuerzoDeFicha | null, nivel: number, umbral: UmbralFatiga): SobreesfuerzoDeUso | null {
  if (!s || nivel <= 0) return null;
  const fatigado = umbral !== "normal";
  const inmune = s.dotes.inmune?.hastaNivel ?? 0;
  const fuente = s.fuentes
    .filter((f) => saltaSobreesfuerzo(f, nivel, fatigado, inmune))
    .sort((a, b) => b.dificultadBase - a.dificultadBase)[0];
  if (!fuente) return null;
  const soloPorFatiga = fuente.desdeNivel === null || nivel < fuente.desdeNivel;
  const tramo: UmbralSobreesfuerzo = umbral === "exhausto" ? "exhausto" : "base";
  const fallo = (grado: GradoFallo) => {
    const propia = { casilla: fuente.tabla[tramo][grado], fuente: fuente.fuente };
    const deDote = s.dotes.tabla?.casillas[tramo]?.[grado];
    return deDote && esMasSuave(deDote, propia.casilla) ? { casilla: deDote, fuente: s.dotes.tabla!.fuente } : propia;
  };
  return {
    fuente: fuente.fuente,
    nivel,
    dificultad: fuente.dificultadBase + nivel,
    umbral: fatigado ? umbral : null,
    soloPorFatiga,
    moneda: soloPorFatiga ? s.dotes.moneda : null,
    fallos: { fracaso: fallo("fracaso"), fracasoCritico: fallo("fracasoCritico") },
  };
}

// ps-03: «vale la que menos daño hace». Se compara casilla a casilla (fracaso y fracaso crítico,
// normal y exhausto), por este orden: muerte, categoría del daño, niveles de daño y turnos de
// estado (los de «nivel del poder» cuentan como 6, lo peor). De una casilla con elección, la
// opción más suave: es la que escogería el jugador.
// TODO(revisar): casilla a casilla y no la tabla entera (ninguna de las dos tablas es más suave
// en todas las casillas con el implante 1 y 2); y el orden daño antes que estados (implante 1
// exhausto: grave a secas frente a letal y aturdido → gana Maestría).
const PESO_CATEGORIA: Record<CategoriaDanio, number> = { noLetal: 1, letal: 2, grave: 3 };

function peso(r: ResultadoSobreesfuerzo): number[] {
  return [
    r.muerte ? 1 : 0,
    r.danio ? PESO_CATEGORIA[r.danio.categoria] : 0,
    r.danio?.valor ?? 0,
    r.estados.reduce((t, e) => t + (e.turnos === "nivelPoder" ? 6 : e.turnos), 0),
  ];
}

function compara(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

const pesoCasilla = (c: CasillaSobreesfuerzo) => c.map(peso).sort(compara)[0];

export function esMasSuave(a: CasillaSobreesfuerzo, b: CasillaSobreesfuerzo): boolean {
  return compara(pesoCasilla(a), pesoCasilla(b)) < 0;
}

// Saber es Poder (ps-04): la app echa la moneda. `d2`: 1 o 2 (tirarDadoDeCaras(2)); 1 = te libras.
export function libraPorMoneda(d2: number): boolean {
  return d2 === 1;
}

const ETIQUETA_CATEGORIA: Record<CategoriaDanio, string> = { noLetal: "no letal", letal: "letal", grave: "grave" };

const etiquetaTipo = (tipo: string) => TIPOS_DANIO.find((t) => t.id === tipo)?.label.toLowerCase() ?? tipo;

const turnosDe = (e: EstadoSobreesfuerzo, nivel: number) => (e.turnos === "nivelPoder" ? nivel : e.turnos);

// «1 letal y Aturdido 1 turno», para la tabla del panel y las opciones a elegir.
export function textoResultadoSobreesfuerzo(r: ResultadoSobreesfuerzo, nivel: number): string {
  if (r.muerte) return "Muerte cerebral automática";
  const partes = [
    ...(r.danio ? [`${r.danio.valor} de daño ${ETIQUETA_CATEGORIA[r.danio.categoria]}${r.danio.tipo ? ` (${etiquetaTipo(r.danio.tipo)})` : ""}`] : []),
    ...r.estados.map((e) => {
      const t = turnosDe(e, nivel);
      return `${estadoPorId(e.estadoId)?.label ?? e.estadoId} ${t} ${t === 1 ? "turno" : "turnos"}`;
    }),
  ];
  return partes.length > 0 ? partes.join(" y ") : "Nada";
}

// Lo que aplica el servidor (aplicarConsecuenciaPropiaAction), con los turnos resueltos. La
// muerte cerebral no se aplica: sale en el texto para que el máster la marque.
export function consecuenciaDeSobreesfuerzo(r: ResultadoSobreesfuerzo, nivel: number, fuente: string): ConsecuenciaPropia {
  return {
    texto: r.muerte ? `Sobreesfuerzo (${fuente}): muerte cerebral automática. Avisa al máster.` : `Sobreesfuerzo (${fuente})`,
    ...(r.danio && { danio: { valor: r.danio.valor, categoria: r.danio.categoria } }),
    estados: r.estados.map((e) => ({ estadoId: e.estadoId, gradoId: e.gradoId, turnos: turnosDe(e, nivel) })),
  };
}

// La opción elegida de la casilla de ese grado; null si no es un fallo o la opción no existe.
export function resultadoElegido(uso: SobreesfuerzoDeUso, grado: string, opcion: number): ResultadoSobreesfuerzo | null {
  if (grado !== "fracaso" && grado !== "fracasoCritico") return null;
  return uso.fallos[grado].casilla[opcion] ?? null;
}
