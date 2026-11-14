// Lo que las dotes ponen en las tiradas (docs/sistema.md §9.3, tanda D2a): casillas,
// bonos fijos y textos en tiradas que ya existen. Mismo patrón que la especie (E4,
// especie.ts): las casillas entran en el índice de condiciones, los bonos fijos como
// Modificador de tirada (origen "dote") y los textos en `textosTirada`; resolverFicha
// lo junta y conExtrasDeFicha / montarTirada lo pintan sin saber de dónde viene.
//
// Solo se construye lo que el catálogo marca `construido` en su MotorMetadata (el
// generador decide qué es eso, contra catalog/dotesDestinos.ts): un efecto pendiente de
// otra tanda no hace nada aquí aunque su destino exista.
//
// Tiradas generadas por arma (D2b-1): el alcance "familia:<f>" pasa a AlcanceModificador
// "familiaArma" (con el empleo si la dote filtra el arma), las casillas van al mismo índice
// y los textos con destino de familia. Un efecto con requisito por rama (Asesino…) solo sale
// si la ficha cumple el de su rama. Aparte, lo que no es casilla ni texto:
//   bonosTramo  bono por tramo de distancia (Tirador de Larga Distancia y su Avanzado, este
//               solo en especialidad; vale el mejor de los dos), y por opción de un selector de
//               la tirada (SELECTORES_DE_TIRADA: Rastreo al Paso en «Marcha»; con condición, solo
//               con su casilla marcada, `siActiva`: Bioma Predilecto)
//   criticos    crítico fijo en los ataques de la especialidad elegida (Crítico Mejorado)
//   permisos    (D2b-2) lo que solo existe con dote en las tiradas de arma: las familias
//               habilitadas (Bloqueo → bloquear_melee) y dónde cabe el estilo Sutil (Combate
//               Sutil → ataque_melee y bloquear_melee). Lo lee combate.ts al generar filas.
//   descuentos  (D2c-1) contador de la tirada que cuenta unidades de menos (Reflejos Felinos:
//               un atacante adicional menos en la esquiva). Lo pone conExtrasDeFicha.
//   grados      (tiradas fijas) cambios de grado sin casilla en una tirada fija: fracaso → éxito
//               (Velocista en Carrera) y crítico más fácil (Velocista; Gran Puntería en Apuntar,
//               éxito → crítico = margen 0). Los pone conExtrasDeFicha (subeGradoFijo,
//               criticoFijo). No se encadenan: el fracaso que pasa a éxito no llega a crítico.
//   alternativas (tiradas fijas) otra habilidad/especialidad con casilla en la fila (Cazador
//               Cazado, Vigilancia Táctica): Accion.habilidadAlternativa, como Levitar.
//
// Casillas de D2d: los efectos de una dote con el mismo destino y la misma condición van a UNA
// casilla, que junta lo que hace cada uno (condiciones.ts, toggle): bono (con el valor según la
// ficha si trae umbral: Presencia Imponente +2 con Fuerza ≥ 5), ventaja (y su fatiga: Ojo
// Clínico), fracaso → éxito (Balanceo), crítico más fácil (Equilibrista, Especialidad Médica),
// otro aplicado (Negociación Analítica) y lo que toca el daño (Golpe Fatigante −1, golpe letal
// con escudo, «Derribo con acción estándar»). La maniobra Derribo (Derribo Mejorado y Brutal)
// es una casilla propia en los golpes melee (casillaDeManiobra), y su salvación del objetivo
// sale en «El objetivo» con la casilla marcada (SALVACION_DERRIBO).
//
// Efectos sobre el objetivo (T3b, do-05: Golpe Entorpecedor, Golpe Fatigante, Derribo Mejorado,
// Dominio Elevado, Asesino, Onda Residual): `objetivos`, con el destino de un texto; los cuelga
// conExtrasDeFicha (o prepararPoder) en `efectosObjetivoDeFicha` y los avisa el resultado
// (rules/efectosArma.ts). Con condición, solo con la casilla de esa condición marcada.
// Las acciones propias de dote (y lo que otras dotes les añaden) van aparte: dotesAcciones.ts.
// Los poderes de dote, en dotesPoderes.ts; los textos de dote sobre un poder (D2c-2, destino
// "poder") van a `textos` por el id de su acción y los pone prepararPoder (usoPoder.ts).
//
//   dotesActivas     las compradas que dan efecto: sin requisito roto y sin las que
//                    sustituye una mejorada que también se tiene ("vale la mejor")
//   efectosDeDotes   → { casillas, modificadores, textos, objetivos, bonosTramo, criticos, permisos,
//                        descuentos, grados, alternativas }
//   casillasDeDotes / textosDeDotes / modificadoresDeDotes / permisosDeDotes   atajos sobre una ficha
import { ATRIBUTOS, type AplicadoId } from "./atributos";
import { HABILIDADES, type HabilidadId } from "./habilidades";
import {
  cumpleRequisitoDote,
  dotesConRequisitoRoto,
  especialidadArmaPropia,
  etiquetaEleccion,
  valoresRequisitoDeFicha,
  type ValoresRequisito,
} from "./dotes";
import { dotePorId, mismaDote, normalizarNombre, type DoteComprada } from "./dotesCompradas";
import { DESTINOS_DOTES, OPCIONES_DE_TRAMO, SELECTORES_DE_TIRADA } from "../catalog/dotesDestinos";
import { DOTES } from "../catalog/dotes";
import { especialidadPorId, etiquetaEspecialidad, type EspecialidadId } from "../catalog/especialidades";
import type { DoteCatalogo, EfectoDote, ValorDote } from "../catalog/dotesTipos";
import { resumenCasilla, type BonoPorTramo, type CondicionTirada, type EfectoDanioCasilla, type OpcionCondicion, type TramoDistancia } from "./condiciones";
import type { EfectoArma } from "./efectosArma";
import type { ObjetivoEnTirada } from "./textosTirada";
import type { AlcanceModificador, FamiliaArma, ModificadorConFuente } from "./modificadores";
import type { TextoEnTirada } from "./especie";
import type { OrigenAporte } from "./origen";
import type { RebajaConFuente } from "./tipoAccion";
import type { Sheet } from "./sheet";
import { SIN_DOTES_SOBREESFUERZO, type EfectoSobreesfuerzoDote, type SobreesfuerzoDeDotes } from "./sobreesfuerzo";

export type DoteActiva = { dote: DoteCatalogo; compra: DoteComprada };

// `valores`: los de los requisitos (FichaResuelta.requisitosDotes). null = sin mirar
// requisitos: NPC del máster (§9.4, "sin requisitos ni coste").
//
// Requisito no cumplido (marca de D1, dotesConRequisitoRoto): la dote NO da efecto
// mientras esté marcada (supuesto S34, docs/sistema.md). Sin cascada: una dote cuyo
// requisito es otra dote marcada sigue contando como cumplido, igual que la marca.
//
// Vale la mejor (§9.1): si se tienen la básica y la mejorada (`sustituye`, también en
// cadena: Constante → Mejorado → básica), solo da efecto la mejor. Una mejorada con el
// requisito roto no sustituye a nada: vuelve a valer la básica.
export function dotesActivas(sheet: Sheet, valores: ValoresRequisito | null): DoteActiva[] {
  const rotas = valores ? dotesConRequisitoRoto(sheet, valores).map((r) => r.dote) : [];
  const compradas = sheet.dotes.flatMap((compra): DoteActiva[] => {
    const dote = dotePorId(compra.id);
    if (!dote || rotas.some((r) => mismaDote(r, compra))) return [];
    return [{ dote, compra }];
  });
  const sustituidas = new Set<string>();
  for (const { dote } of compradas) {
    const vistas = new Set<string>();
    for (let s = dote.sustituye; s && !vistas.has(s); s = dotePorId(s)?.sustituye ?? null) {
      vistas.add(s);
      sustituidas.add(s);
    }
  }
  return compradas.filter(({ dote }) => !sustituidas.has(dote.id));
}

// Bono por tramo de distancia de una dote, con el alcance de las tiradas que lo reciben
// (conExtrasDeFicha lo añade a su `bonosTramo`).
export type BonoTramoDeDote = { alcance: AlcanceModificador; bono: BonoPorTramo };
// Crítico fijo (Crítico Mejorado): `margen` éxitos en los ataques con arma de esa especialidad.
// `familias`: las tiradas de esa arma que cuentan (las de ataque: ni lanzarla ni bloquear),
// del destino de la dote (E10 del inventario de aportes: antes, una lista en conExtrasDeFicha).
export type CriticoDeDote = {
  especialidad: EspecialidadId;
  familias: readonly FamiliaArma[];
  margen: number;
  fuente: string;
  origen?: OrigenAporte;
};

// Lo que habilitan las dotes en las tiradas generadas por arma (D2b-2, §9.2). Sin dote no
// hay permiso: ni el NPC del máster (modo libre) se lo salta, solo deja de mirar requisitos.
//   familias  las de FAMILIAS_SOLO_CON_DOTE que alguna dote activa habilita (Bloqueo)
//   sutil     familias donde un arma Sutil puede tirar con Reflejos (Combate Sutil)
export type PermisosDeDotes = { familias: readonly FamiliaArma[]; sutil: readonly FamiliaArma[] };
export const SIN_PERMISOS_DE_DOTES: PermisosDeDotes = { familias: [], sutil: [] };

// Descuento en un contador de la tirada (Reflejos Felinos): `contador` es el id de la condición.
export type DescuentoDeDote = { alcance: AlcanceModificador; contador: string; unidades: number; fuente: string; origen?: OrigenAporte };

// Cambio de grado fijo, sin casilla (tiradas fijas): fracaso → éxito y/o crítico con `margen`.
export type GradoFijoDeDote = { alcance: AlcanceModificador; fuente: string; subeGrado?: true; margen?: number; origen?: OrigenAporte };

// Otra habilidad y especialidad con la casilla de la fila (Cazador Cazado: Manipulación en
// Discernir mentiras). `aplicado`: el de la dote; solo vale si es el de la tirada.
export type AlternativaDeDote = {
  alcance: AlcanceModificador;
  aplicado?: AplicadoId;
  habilidad: HabilidadId;
  especialidad: EspecialidadId;
  etiqueta: string;
  origen?: OrigenAporte;
};

export type EfectosDeDotes = {
  // Casillas con alcance, al mismo índice que las del equipo y la especie.
  casillas: CondicionTirada[];
  // Bonos siempre activos (sin casilla): Modificador de tirada con origen "dote".
  modificadores: ModificadorConFuente[];
  textos: TextoEnTirada[];
  objetivos: ObjetivoEnTirada[];
  bonosTramo: BonoTramoDeDote[];
  criticos: CriticoDeDote[];
  permisos: PermisosDeDotes;
  descuentos: DescuentoDeDote[];
  grados: GradoFijoDeDote[];
  alternativas: AlternativaDeDote[];
  // Lo que abaratan de una acción de otra fila (T5c, rules/tipoAccion.ts): Recarga Relámpago.
  rebajasTipoAccion: RebajaConFuente[];
  // Lo que hacen con el sobreesfuerzo psiónico (T6a, rules/sobreesfuerzo.ts): Potencia, Maestría
  // y Gran Maestría Psiónica (vale el nivel más alto), la tabla de Maestría y Saber es Poder.
  sobreesfuerzo: SobreesfuerzoDeDotes;
};

export const SIN_EFECTOS_DE_DOTES: EfectosDeDotes = {
  casillas: [],
  modificadores: [],
  textos: [],
  objetivos: [],
  bonosTramo: [],
  criticos: [],
  permisos: SIN_PERMISOS_DE_DOTES,
  descuentos: [],
  grados: [],
  alternativas: [],
  rebajasTipoAccion: [],
  sobreesfuerzo: SIN_DOTES_SOBREESFUERZO,
};

const TRAMOS: readonly TramoDistancia[] = ["bocajarro", "corta", "media", "larga"];

// El alcance del efecto: el del destino y, si la dote filtra el arma por empleo
// (Desenfundado Rápido: a una mano), tipo de daño (Golpe Fatigante: contundente o a dos manos)
// o especialidad (Golpe Mejorado con Escudo: Escudos), ese filtro en el alcance de familia.
type FiltroArma = NonNullable<Extract<EfectoDote, { tipo: "bono" }>["filtroArma"]>;
function alcanceDe(destino: AlcanceModificador, e: { filtroArma?: FiltroArma }): AlcanceModificador {
  const f = e.filtroArma;
  if (!f || destino.tipo !== "familiaArma") return destino;
  return {
    ...destino,
    ...(f.empleo && { empleo: f.empleo }),
    ...(f.desarmado && { desarmado: true as const }),
    ...(f.tipoDanio?.includes("contundente") && { contundente: true as const }),
    ...(f.especialidad && { especialidad: f.especialidad }),
    ...(f.mediaFuerza && { mediaFuerza: true as const }),
    ...(f.conPenalizadorDesarmado && { conPenalizadorDesarmado: true as const }),
  };
}

// "Vale la mejor" entre bonos por tramo que no se suman (`noAcumulaCon`, en cualquiera de
// los dos sentidos): misma clave para la dote y las que excluye, en ese alcance y tramo.
function claveExcluyente(dote: DoteCatalogo, e: Extract<EfectoDote, { tipo: "bono" }>): string | undefined {
  const otras = new Set(e.noAcumulaCon ?? []);
  for (const d of DOTES)
    for (const o of d.efectos)
      if (o.tipo === "bono" && o.alcance === e.alcance && o.tramo === e.tramo && o.noAcumulaCon?.includes(dote.id)) otras.add(d.id);
  if (otras.size === 0) return undefined;
  return [dote.id, ...otras].sort().join("|");
}

// "Especialidad Médica: Ceguera y sordera"; sin elección, el nombre a secas.
function nombreDe({ dote, compra }: DoteActiva): string {
  const el = etiquetaEleccion(dote, compra.eleccion);
  return el ? `${dote.label}: ${el}` : dote.label;
}

// El ítem de los aportes de una dote (fase 2): su id, con la elección si es repetible (como
// fuentesDeCapa1, capa1.ts), y el nombre con la elección ("Bioma Predilecto: Selva densa").
export function origenDeDote(activa: DoteActiva): OrigenAporte {
  const { dote, compra } = activa;
  return { tipo: "dote", id: dote.repetible && compra.eleccion ? `${dote.id}:${compra.eleccion}` : dote.id, label: nombreDe(activa) };
}

// Prefijo estable de los ids de casilla: el id de la dote, y la elección si es repetible
// (una casilla por pareja comprada de Especialidad Médica, §9.3).
function claveDe({ dote, compra }: DoteActiva): string {
  if (!dote.repetible || !compra.eleccion) return dote.id;
  return `${dote.id}_${normalizarNombre(compra.eleccion).replace(/[^a-z0-9]+/g, "_")}`;
}

const etiquetaUmbral = (s: { tipo: "atributo" | "habilidad"; id: string }) =>
  (s.tipo === "atributo" ? ATRIBUTOS : HABILIDADES).find((x) => x.id === s.id)?.label ?? s.id;

// Valor de un bono según la ficha (D2d, valor por umbral): con el umbral cumplido, el suyo, y
// la etiqueta lo dice ("Fuerza ≥ 5"). Mira los valores de juego con la especie (los de los
// requisitos), entera la habilidad. Sin ficha que mirar, la base. Por nivel empleado o manual
// no es un número: null (no sale).
function valorDeBono(v: ValorDote, ficha: ValoresRequisito | null): { valor: number; umbral?: string } | null {
  if (typeof v === "number") return { valor: v };
  if (!("base" in v)) return null;
  const s = v.siMin;
  if (!s || !ficha) return { valor: v.base };
  const tiene = s.tipo === "atributo" ? ficha.atributos[s.id] : ficha.habilidades[s.id];
  return tiene >= s.min ? { valor: s.valor, umbral: `${etiquetaUmbral(s)} ≥ ${s.min}` } : { valor: v.base };
}

type Toggle = Extract<CondicionTirada, { tipo: "toggle" }>;

// "letal" → "Letal", como las categorías del catálogo de armas.
const categoriaLegible = (c: string) => c.charAt(0).toUpperCase() + c.slice(1);

// La maniobra Derribo (docs/fuente/habilidades.md, Combate Melee), solo con una dote de derribo
// (decisión del usuario, D2d): −2 al ataque y, si acierta, el daño básico sin el bono por éxitos;
// la resistencia del rival, en la nota. Con Derribo Brutal sin el −2 (su «Derribo con acción
// estándar» devuelve el bono por éxitos, en su propia casilla).
// TODO(revisar): "por cada tamaño de diferencia ±2 al ataque" y "puede no causar daño, sin −2"
// van en la nota, a mano (circunstancial).
// TODO(revisar): con varias dotes de derribo la casilla es una sola; su `origen` es el de la
// primera (como el nombre que enseñaba "te afecta"), las demás solo van en la etiqueta.
export const ID_MANIOBRA_DERRIBO = "maniobra_derribo";
const FUENTE_MANIOBRA_DERRIBO = "Derribo (maniobra)";

// La resistencia del objetivo a la maniobra (habilidades.md, Combate Melee): «potencia +
// atletismo o combate melee […] con tantos éxitos o más que los resultantes en la tirada de
// ataque (antes de restar los éxitos en defensa del objetivo) o caerá al suelo derribado […]; si
// obtuviese un fracaso crítico en la defensa además pierde 1 punto de fatiga». Las dotes le
// añaden lo suyo (Derribo Mejorado, Dominio Elevado: `ajusteSalvacion`).
const SALVACION_DERRIBO: EfectoArma = {
  tipo: "salvacion",
  estadoId: "derribado",
  tirada: { etiqueta: "Potencia + Atletismo o Combate Melee" },
  dificultad: "exitosDelAtaque",
  tabla: {
    fracasoCritico: {
      texto: "Cae derribado en su casilla o en una adyacente libre, a tu elección, y pierde 1 punto de fatiga al golpear contra el suelo.",
      estado: { estadoId: "derribado", gradoId: "activo" },
      fatiga: 1,
    },
    fracaso: {
      texto: "Cae derribado en su casilla o en una adyacente libre, a tu elección.",
      estado: { estadoId: "derribado", gradoId: "activo" },
    },
    exito: { texto: "Resiste: no cae." },
  },
  cuando: "acierto",
  soloEn: { casilla: ID_MANIOBRA_DERRIBO },
};

function casillaDeManiobra(maniobras: { fuente: string; sinPenalizador: boolean; origen: OrigenAporte }[]): Toggle {
  const sinPenalizador = maniobras.find((m) => m.sinPenalizador);
  const fuentes = [...new Set(maniobras.map((m) => m.fuente))];
  const nota = [
    "Si aciertas, el daño es el básico, sin el bono por éxitos.",
    "El objetivo resiste con Potencia + Atletismo o Combate Melee: necesita tantos éxitos o más como los de tu ataque (antes de restar los de su defensa), o cae derribado en su casilla o en una adyacente libre, a tu elección. Con fracaso crítico pierde además 1 punto de fatiga.",
    sinPenalizador
      ? null
      : "Si eliges no hacer daño, no hay −2: compénsalo con +2 en el circunstancial y no tires daño.",
    "Tamaño: +2 al ataque por cada categoría superior y −2 por cada inferior (en el circunstancial).",
  ]
    .filter(Boolean)
    .join(" ");
  return {
    id: ID_MANIOBRA_DERRIBO,
    tipo: "toggle",
    etiqueta: `Derribo (${fuentes.join(", ")}${sinPenalizador ? `; sin −2: ${sinPenalizador.fuente}` : ""})`,
    valorActivo: sinPenalizador ? 0 : -2,
    nota,
    danio: { sinBonoExitos: true },
    alcance: { tipo: "familiaArma", familia: "ataque_melee" },
    origen: maniobras[0].origen,
  };
}

// `valores`: los de los requisitos, para el requisito por rama (null = NPC, sin mirar).
// `ficha`: los valores de juego de la ficha (especie incluida) para los bonos con umbral (D2d);
// también al NPC, que no mira requisitos pero sí su Fuerza. Sin ellos, el de los requisitos.
export function efectosDeDotes(
  activas: readonly DoteActiva[],
  valores: ValoresRequisito | null,
  ficha: ValoresRequisito | null = valores,
): EfectosDeDotes {
  if (activas.length === 0) return SIN_EFECTOS_DE_DOTES;
  const casillas: CondicionTirada[] = [];
  const modificadores: ModificadorConFuente[] = [];
  const textos: TextoEnTirada[] = [];
  const objetivos: ObjetivoEnTirada[] = [];
  const bonosTramo: BonoTramoDeDote[] = [];
  const criticos: CriticoDeDote[] = [];
  const descuentos: DescuentoDeDote[] = [];
  const grados: GradoFijoDeDote[] = [];
  const alternativas: AlternativaDeDote[] = [];
  const rebajasTipoAccion: RebajaConFuente[] = [];
  let sobreesfuerzo: SobreesfuerzoDeDotes = SIN_DOTES_SOBREESFUERZO;
  const familias = new Set<FamiliaArma>();
  const sutil = new Set<FamiliaArma>();
  const compradas = activas.map((a) => a.compra);
  const maniobras: { fuente: string; sinPenalizador: boolean; origen: OrigenAporte }[] = [];

  for (const activa of activas) {
    const { dote, compra } = activa;
    const fuente = nombreDe(activa);
    const origen = origenDeDote(activa);
    const clave = claveDe(activa);
    // Bonos por opción de una condición que la tirada no tiene: una casilla de opción por
    // grupo (movimiento_oculto), con una opción por bono.
    const porTramo = new Map<string, { casilla: Extract<CondicionTirada, { tipo: "opcion" }> }>();
    // Una casilla por destino y condición (D2d): la crea el primer efecto y los demás le suman lo suyo.
    const porCondicion = new Map<string, Toggle>();
    const casillaPara = (
      e: { alcance: string; condicion: string | null; filtroArma?: FiltroArma },
      i: number,
      umbral?: string,
    ): Toggle | null => {
      const destino = DESTINOS_DOTES[e.alcance];
      if (destino?.tipo !== "tirada") return null;
      const alcance = alcanceDe(destino.alcance, e);
      const condicion = e.condicion ?? "tirando con la especialidad";
      const llave = `${JSON.stringify(alcance)}|${condicion}`;
      let c = porCondicion.get(llave);
      if (!c) {
        c = { id: `${clave}_${i}`, tipo: "toggle", etiqueta: `${condicion} (${fuente}${umbral ? `, ${umbral}` : ""})`, valorActivo: 0, alcance, origen };
        porCondicion.set(llave, c);
        casillas.push(c);
      }
      return c;
    };
    // Casillas que solo encienden un efecto sobre el objetivo (Asesino): sin número que enseñar.
    const deObjetivo = new Set<Toggle>();
    const conDanio = (c: Toggle, d: EfectoDanioCasilla) => {
      c.danio = { ...c.danio, ...d, ...(d.ajuste !== undefined && { ajuste: (c.danio?.ajuste ?? 0) + d.ajuste }) };
    };

    dote.efectos.forEach((e, i) => {
      if (dote.motor[i]?.estado !== "construido") return;
      // Requisito por rama: el efecto de la rama que la ficha no cumple no sale (§9.5).
      if ("requisitoAlcance" in e && e.requisitoAlcance && valores && !cumpleRequisitoDote(e.requisitoAlcance, valores, compradas)) return;
      // Sin condición: cambio de grado fijo (Velocista, Gran Puntería), sin casilla.
      const destinoFijo = "alcance" in e ? DESTINOS_DOTES[e.alcance] : undefined;
      const fijo = destinoFijo?.tipo === "tirada" && "condicion" in e && e.condicion === null;
      if (fijo && e.tipo === "sube_grado" && e.de === "fracaso" && e.a === "exito") {
        grados.push({ alcance: destinoFijo.alcance, fuente, subeGrado: true, origen });
        return;
      }
      if (fijo && e.tipo === "sube_grado" && e.de === "exito" && e.a === "critico") {
        grados.push({ alcance: destinoFijo.alcance, fuente, margen: 0, origen });
        return;
      }
      if (fijo && e.tipo === "margen_critico") {
        grados.push({ alcance: destinoFijo.alcance, fuente, margen: e.valor, origen });
        return;
      }
      if (e.tipo === "margen_critico" && DESTINOS_DOTES[e.alcance]?.tipo === "tirada") {
        // Equilibrista (0: cualquier éxito es crítico) y Especialidad Médica (5), con casilla.
        const c = casillaPara(e, i);
        if (c) c.margenCriticoExito = Math.min(c.margenCriticoExito ?? e.valor, e.valor);
        return;
      }
      if (e.tipo === "margen_critico") {
        // Crítico Mejorado: la especialidad elegida al comprar, mientras siga siendo propia y
        // de la rama que cumple (S43; NPC sin mirar).
        const esp = compra.eleccion ? especialidadPorId(compra.eleccion) : undefined;
        const destino = DESTINOS_DOTES[e.alcance];
        if (destino?.tipo !== "especialidadArmaElegida" || !esp) return;
        if (valores && !especialidadArmaPropia(dote, esp.id, valores, compradas)) return;
        criticos.push({ especialidad: esp.id, familias: destino.familias, margen: e.valor, fuente, origen });
        return;
      }
      if (e.tipo === "economia") {
        rebajasTipoAccion.push({ ...e.rebaja, fuente, origen });
        return;
      }
      if (e.tipo === "sobreesfuerzo") {
        sobreesfuerzo = conEfectoSobreesfuerzo(sobreesfuerzo, e.efecto, fuente);
        return;
      }
      // Habilitador (Bloqueo): la familia aparece. Arbitraje duro (§9.2): sin él, no existe.
      if (e.tipo === "habilita") {
        const destino = DESTINOS_DOTES[e.accion];
        if (destino?.tipo === "tirada" && destino.alcance.tipo === "familiaArma") familias.add(destino.alcance.familia);
        return;
      }
      // Estilo Sutil (Combate Sutil): el generador solo construye el cambio a Reflejos sobre
      // una familia de arma, que es lo que hace el interruptor Sutil de siempre.
      // Otro aplicado con casilla (Negociación Analítica: Perspicacia en vez de Expresión).
      if (e.tipo === "cambia_par" && DESTINOS_DOTES[e.alcance]?.tipo === "tirada" && !e.alcance.startsWith("familia:")) {
        // Otra habilidad y especialidad (tiradas fijas): la casilla de la fila, no del modal.
        const destino = DESTINOS_DOTES[e.alcance];
        if (e.habilidad && e.especialidad && destino?.tipo === "tirada") {
          alternativas.push({
            alcance: destino.alcance,
            ...(e.aplicado && { aplicado: e.aplicado }),
            habilidad: e.habilidad,
            especialidad: e.especialidad,
            etiqueta: `Con ${etiquetaEspecialidad(e.especialidad)} (${fuente})`,
            origen,
          });
          return;
        }
        const c = e.aplicado && !e.habilidad && !e.especialidad ? casillaPara(e, i) : null;
        if (c) c.aplicado = e.aplicado;
        return;
      }
      if (e.tipo === "ventaja") {
        const c = casillaPara(e, i);
        if (!c) return;
        c.ventaja = true;
        if (e.coste) c.costeFatiga = (c.costeFatiga ?? 0) + e.coste.fatiga;
        return;
      }
      if (e.tipo === "coste") {
        // Lo que cobra la casilla de la misma condición (Ojo Clínico).
        const c = casillaPara(e, i);
        if (c) c.costeFatiga = (c.costeFatiga ?? 0) + e.fatiga;
        return;
      }
      if (e.tipo === "sube_grado") {
        // Fracaso → éxito (Balanceo) o éxito → crítico, que es margen 0 (Olfato de Investigador,
        // como Gran Puntería sin casilla). El generador no construye otro.
        if (e.de === "fracaso" && e.a === "exito") {
          const c = casillaPara(e, i);
          if (c) c.subeGrado = true;
        } else if (e.de === "exito" && e.a === "critico") {
          const c = casillaPara(e, i);
          if (c) c.margenCriticoExito = 0;
        }
        return;
      }
      if (e.tipo === "categoria_danio") {
        const c = casillaPara(e, i);
        if (c) conDanio(c, { categoria: categoriaLegible(e.a) });
        return;
      }
      if (e.tipo === "fuerza_entera") {
        const c = casillaPara(e, i);
        if (c) conDanio(c, { fuerzaEntera: true });
        return;
      }
      if (e.tipo === "danio_por_exitos") {
        const c = casillaPara(e, i);
        if (c) conDanio(c, { conBonoExitos: true });
        return;
      }
      if (e.tipo === "maniobra") {
        maniobras.push({ fuente, sinPenalizador: e.sinPenalizador === true, origen });
        return;
      }
      if (e.tipo === "cambia_par") {
        const destino = DESTINOS_DOTES[e.alcance];
        if (destino?.tipo === "tirada" && destino.alcance.tipo === "familiaArma" && e.aplicado === "reflejos")
          sutil.add(destino.alcance.familia);
        return;
      }
      // Reflejos Felinos (D2c-1): el contador de su tirada cuenta unidades de menos.
      if (e.tipo === "descuento_contador") {
        const destino = DESTINOS_DOTES[e.alcance];
        if (destino?.tipo === "tirada") descuentos.push({ alcance: destino.alcance, contador: e.contador, unidades: e.unidades, fuente, origen });
        return;
      }
      if (e.tipo === "bono" && e.sobre === "danio") {
        // Golpe Fatigante: −1 al daño con su casilla (y su filtro de arma).
        const c = typeof e.valor === "number" && e.condicion ? casillaPara(e, i) : null;
        if (c) conDanio(c, { ajuste: e.valor as number });
        return;
      }
      if (e.tipo === "bono") {
        const destino = DESTINOS_DOTES[e.alcance];
        const resuelto = valorDeBono(e.valor, ficha);
        if (destino?.tipo !== "tirada" || !resuelto) return;
        const valorBono = resuelto.valor;
        const alcance = alcanceDe(destino.alcance, e);
        if (e.tramo) {
          const [grupo, opcion] = e.tramo.split(":");
          // Tramo de distancia de los disparos: bono por tramo, no casilla.
          if (grupo === "tramo") {
            if (!TRAMOS.includes(opcion as TramoDistancia)) return;
            const excluyente = claveExcluyente(dote, e);
            bonosTramo.push({
              alcance,
              bono: {
                fuente,
                origen,
                porTramo: { [opcion]: valorBono },
                ...(e.soloEspecialidad && { soloEnEspecialidad: true as const }),
                ...(excluyente && { excluyente }),
              },
            });
            return;
          }
          // Opción de un selector que ya trae la tirada («Marcha» de Rastreo): bono por opción
          // y, si la dote pone condición (Bioma Predilecto), solo con su casilla marcada.
          const selector = SELECTORES_DE_TIRADA[grupo];
          if (selector) {
            if (!selector.opciones.includes(opcion)) return;
            const excluyente = claveExcluyente(dote, e);
            const c = e.condicion ? casillaPara(e, i) : null;
            if (c) c.resumen = `cambia «${selector.etiqueta}»`;
            bonosTramo.push({
              alcance,
              bono: {
                fuente,
                origen,
                condicion: grupo,
                porTramo: { [opcion]: valorBono },
                ...(c && { siActiva: c.id }),
                ...(excluyente && { excluyente }),
              },
            });
            return;
          }
          const def = OPCIONES_DE_TRAMO[grupo];
          if (!def) return;
          let g = porTramo.get(grupo);
          if (!g) {
            g = {
              casilla: {
                id: `${clave}_${grupo}`,
                tipo: "opcion",
                etiqueta: `${def.etiqueta} (${fuente})`,
                opciones: [{ id: "ninguna", etiqueta: def.ninguna, valor: 0 }],
                porDefecto: "ninguna",
                alcance,
                origen,
              },
            };
            porTramo.set(grupo, g);
            casillas.push(g.casilla);
          }
          const op: OpcionCondicion = { id: opcion, etiqueta: def.opciones[opcion] ?? opcion, valor: valorBono };
          g.casilla.opciones.push(op);
          // La etiqueta dice cuánto compensa: "reduce 2" o "reduce hasta 4" si varía por opción.
          const valores = g.casilla.opciones.slice(1).map((o) => o.valor);
          const max = Math.max(...valores);
          const cuanto = valores.every((v) => v === max) ? `${max}` : `hasta ${max}`;
          g.casilla.etiqueta = `${def.etiqueta} ${cuanto} (${fuente})`;
          return;
        }
        // Siempre activo: bono fijo, sale en el desglose con la dote.
        if (e.condicion === null) {
          modificadores.push({ tipo: "tirada", alcance, valor: valorBono, origen: "dote", fuente, item: origen });
          return;
        }
        const c = casillaPara(e, i, resuelto.umbral);
        if (c) c.valorActivo += valorBono;
        return;
      }
      if (e.tipo === "objetivo") {
        const destino = DESTINOS_DOTES[e.lugar];
        // La condición es la casilla de la dote (la misma que la del bono de ese destino).
        const c = e.condicion ? casillaPara({ alcance: e.lugar, condicion: e.condicion, filtroArma: e.filtroArma }, i) : null;
        if (e.condicion && !c) return;
        if (c) deObjetivo.add(c);
        const efecto = { ...e.efecto, ...(c && { soloEn: { ...e.efecto.soloEn, casilla: c.id } }), fuente, origen };
        if (destino?.tipo === "poder") objetivos.push({ en: { tipo: "tiradaId", id: destino.id }, efecto });
        else if (destino?.tipo === "tirada") {
          const alcance = alcanceDe(destino.alcance, e);
          if (alcance.tipo === "familiaArma") objetivos.push({ en: alcance, efecto });
          else for (const id of destino.textos) objetivos.push({ en: { tipo: "tiradaId", id }, efecto });
        }
        return;
      }
      if (e.tipo === "texto") {
        const destino = DESTINOS_DOTES[e.lugar];
        const texto = e.condicion ? `${e.condicion}: ${e.texto}` : e.texto;
        const soloEnCritico = e.grados?.includes("critico") ?? false;
        // Crítico natural (Gran Puntería en Apuntar): a su campo aparte, que solo sale sin conversión.
        if (e.criticoNatural && destino?.tipo === "tirada" && destino.alcance.tipo !== "familiaArma") {
          for (const id of destino.textos) textos.push({ en: { tipo: "tiradaId", id }, texto, fuente, soloEnCritico: true, soloEnCriticoNatural: true, origen });
          return;
        }
        // Poder (D2c-2) o acción sin dado (Resistir daño, do-02): por su id; lo recogen
        // prepararPoder (usoPoder.ts) y resolverGolpe (resistirDanio.ts).
        if (destino?.tipo === "poder" || destino?.tipo === "sinDado") {
          textos.push({ en: { tipo: "tiradaId", id: destino.id }, texto, fuente, soloEnCritico, origen });
          return;
        }
        if (destino?.tipo !== "tirada") return; // "ficha": vive en la tarjeta de la dote
        const alcance = alcanceDe(destino.alcance, e);
        if (alcance.tipo === "familiaArma") textos.push({ en: alcance, texto, fuente, soloEnCritico, origen });
        else for (const id of destino.textos) textos.push({ en: { tipo: "tiradaId", id }, texto, fuente, soloEnCritico, origen });
      }
    });
    for (const c of deObjetivo) if (resumenCasilla(c, true) === "+0") c.resumen = "aviso al objetivo";
  }
  if (maniobras.length > 0) {
    const casilla = casillaDeManiobra(maniobras);
    casillas.push(casilla);
    objetivos.push({
      en: { tipo: "familiaArma", familia: "ataque_melee" },
      efecto: { ...SALVACION_DERRIBO, fuente: FUENTE_MANIOBRA_DERRIBO, ...(casilla.origen && { origen: casilla.origen }) },
    });
  }
  return {
    casillas,
    modificadores,
    textos,
    objetivos,
    bonosTramo,
    criticos,
    permisos: { familias: [...familias], sutil: [...sutil] },
    descuentos,
    grados,
    alternativas,
    rebajasTipoAccion,
    sobreesfuerzo,
  };
}

function conEfectoSobreesfuerzo(s: SobreesfuerzoDeDotes, e: EfectoSobreesfuerzoDote, fuente: string): SobreesfuerzoDeDotes {
  if (e.tipo === "inmune") return !s.inmune || e.hastaNivel > s.inmune.hastaNivel ? { ...s, inmune: { hastaNivel: e.hastaNivel, fuente } } : s;
  if (e.tipo === "moneda") return { ...s, moneda: { fuente } };
  const casillas = s.tabla?.casillas ?? {};
  return { ...s, tabla: { fuente, casillas: { ...casillas, [e.umbral]: { ...casillas[e.umbral], [e.grado]: e.casilla } } } };
}

// Atajos con los requisitos de la propia ficha (sin especie resuelta aparte).
const deFicha = (sheet: Sheet) => {
  const valores = valoresRequisitoDeFicha(sheet);
  return efectosDeDotes(dotesActivas(sheet, valores), valores);
};
export const casillasDeDotes = (sheet: Sheet): CondicionTirada[] => deFicha(sheet).casillas;
export const textosDeDotes = (sheet: Sheet): TextoEnTirada[] => deFicha(sheet).textos;
export const modificadoresDeDotes = (sheet: Sheet): ModificadorConFuente[] => deFicha(sheet).modificadores;
export const permisosDeDotes = (sheet: Sheet): PermisosDeDotes => deFicha(sheet).permisos;
