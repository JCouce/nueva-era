// La ficha resuelta, sin UI (propuesta-especies §3.1): una sola pasada que monta los
// modificadores (especie + equipo + estados de combate) y todo lo que cuelga de ellos.
// Las pantallas la calculan una vez por cambio (useFichaResuelta) y leen de aquí; no
// llaman a modificadoresActivos ni a los derivados sueltos (regla de ESLint).
//
// Mismo patrón que usoPoder.ts: entrada explícita, nada se lee de fuera salvo el
// catálogo. Los estados de combate y la vida/fatiga de un combate no están en la
// ficha, por eso entran aparte.
import { APLICADOS, ATRIBUTOS, type AplicadoId, type AtributoId } from "./atributos";
import { tieneEscudoMelee, type ArmaduraNatural } from "./blindaje";
import {
  alerta,
  aplicados,
  atributosEfectivos,
  cargaMaxima,
  desgloseAplicado,
  desgloseAtributo,
  movimiento,
  salud,
  vuelo,
  type Fuente,
} from "./derivados";
import {
  ajustesDeCoste,
  ajusteUmbralesDeEspecie,
  armaduraNaturalDeEspecie,
  bolsaDeAumentos,
  casillasDeEspecie,
  especieDeFicha,
  excepcionesRareza,
  formulaMovimientoDeEspecie,
  multiplicadorCargaDeEspecie,
  textosDeEspecie,
  type EspecieResuelta,
  type TextoEnTirada,
  type FormulaMovimientoResuelta,
  type MultiplicadorCarga,
} from "./especie";
import { bonosDeDisciplina, nivelesDePsionica, type PsionicaResuelta } from "./psionica";
import type { ExcepcionRareza } from "../catalog/especies";
import { AJUSTE_NEUTRO, type AjusteCoste } from "./progresion";
import { consultaIndiceCondiciones, indiceDeCondiciones, modificadoresDeEquipo, type IndiceCondiciones } from "./equipo";
import {
  modificadoresDeEstados,
  modificadoresDeUmbrales,
  movimientoPorUmbrales,
  umbralFatiga,
  type AjusteUmbrales,
  umbralSalud,
  type EstadoActivo,
  type MovimientoPorUmbral,
  type UmbralFatiga,
  type UmbralSalud,
} from "./estados";
import { levitacion } from "./poderes";
import { fatigaEfectiva } from "./vitalidad";
import type { ModificadorConFuente } from "./modificadores";
import type { Sheet } from "./sheet";
import type { Accion } from "./acciones";

export type DesgloseDerivado = { total: number; fuentes: Fuente[] };

export type FichaResuelta = {
  ficha: Sheet;
  especie: EspecieResuelta | null;
  // Especie, equipo, estados de combate y umbrales de salud/fatiga (§7), en ese orden
  // (el de modificadoresActivos más los estados detrás, como los sumaba Acciones).
  modificadores: ModificadorConFuente[];
  atributos: Record<AtributoId, number>;
  aplicados: Record<AplicadoId, number>;
  desgloses: {
    atributos: Record<AtributoId, DesgloseDerivado>;
    aplicados: Record<AplicadoId, DesgloseDerivado>;
  };
  salud: { vida: number; fatiga: number };
  alerta: number;
  // Umbrales de §7 con la vida/fatiga de `vitalidad` (fatiga efectiva) y lo que hacen
  // a velocidad y carga, ya aplicado en movimiento, vuelo, levitación y cargaMaxima.
  umbrales: { salud: UmbralSalud; fatiga: UmbralFatiga; movimiento: MovimientoPorUmbral };
  // Un tramo menos de penalizador por especie (Guerrero, Siervo; §14.8), ya aplicado en
  // los modificadores de umbral de arriba. Derivado: también al NPC.
  ajusteUmbrales: AjusteUmbrales;
  movimiento: ReturnType<typeof movimiento>;
  // null si la ficha no vuela (Movilidad Aérea) o no levita (Traslación 2+).
  vuelo: ReturnType<typeof vuelo>;
  levitacion: ReturnType<typeof levitacion>;
  cargaMaxima: number;
  // Lo que la especie cambia de fórmula (§14.7), con su fuente: lo usan movimiento,
  // cargaMaxima y las notas de Estado (notasDeEstado). Derivado: también al NPC.
  formulaMovimiento: FormulaMovimientoResuelta;
  multiplicadorCarga: MultiplicadorCarga;
  // Lo de blindaje que no depende de la tirada; el desglose contra un tipo de daño
  // (desgloseBlindaje) lo pide el modal con lo que elige el jugador, pasándole
  // la armadura natural de aquí.
  blindaje: { tieneEscudoMelee: boolean; armaduraNatural: ArmaduraNatural };
  // Casillas con alcance del equipo y de la especie (§14.8), indexadas una vez
  // (consultaIndiceCondiciones). Las de especie son derivadas: también al NPC.
  indiceCondiciones: IndiceCondiciones;
  // Textos sin mecanizar de la especie (§14.10) que cuelgan de una tirada: los pone
  // conExtrasDeFicha en su nota o en su texto de crítico.
  textosTirada: TextoEnTirada[];
  // Creación y progresión (§14.6): el ajuste de coste que reciben los puntos, la
  // compra y el coste del siguiente nivel, y la bolsa de aumentos (null si la
  // especie no la trae). En modo libre (NPC, §14.3), neutros.
  ajusteCoste: AjusteCoste;
  bolsaAumentos: number | null;
  // Piezas sin tope de rareza por especie (kerzul del Arköru, §14.6): las recibe
  // puedeEquiparSinRareza. Es de creación: vacío en modo libre.
  excepcionesRareza: ExcepcionRareza[];
  // Niveles de disciplina (§14.6): comprado, efectivo (con Resonancia +1 de especie,
  // puede pasar de 6) y paraEfectos (tope 6), y los requisitos rotos. Derivado: le
  // llega también al NPC. Poderes y bonos por nivel leen `paraEfectos`.
  psionica: PsionicaResuelta;
};

// `libre`: editor de NPC del máster. Le llega todo lo derivado de la especie (también
// la Resonancia +1), pero no lo de creación (costes por casta, descuentos psiónicos,
// bolsa de aumentos, kerzul sin rareza).
export type OpcionesFicha = { estadosCombate: EstadoActivo[]; vitalidad: VitalidadActual; libre?: boolean };

// De dónde salen la vida y la fatiga para los umbrales (§7). Fuera de combate, las de
// la ficha (vidaActual/fatigaActual) contra los máximos que resuelve esta misma
// pasada. En un combate, la foto del Combatiente (pgActual/pgMax...), también para el
// NPC de la consola: la de su fila, no la de su plantilla. Lo decide quien llama.
export type VitalidadActual =
  | { origen: "ficha" }
  | { origen: "combate"; pgActual: number; pgMax: number; fatigaActual: number; fatigaMax: number };

export const VITALIDAD_DE_FICHA: VitalidadActual = { origen: "ficha" };

// La reducción de §7 sobre un valor ya calculado (con la especie dentro), hacia abajo.
// TODO(revisar): S28 y S29 de docs/sistema.md (redondeo y orden con la especie).
const reducir = (valor: number, fraccion: number) => Math.floor(valor * (1 - fraccion));

export function resolverFicha(sheet: Sheet, { estadosCombate, vitalidad, libre = false }: OpcionesFicha): FichaResuelta {
  const especie = especieDeFicha(sheet);
  const formulaMovimiento = formulaMovimientoDeEspecie(especie);
  const multiplicadorCarga = multiplicadorCargaDeEspecie(especie);
  // = [...modificadoresActivos(sheet), ...estados], sin volver a resolver la especie.
  const sinUmbrales: ModificadorConFuente[] = [
    ...(especie?.modificadores ?? []),
    ...modificadoresDeEquipo(sheet),
    ...modificadoresDeEstados(estadosCombate),
  ];
  // Los umbrales solo dan modificadores de tirada: no tocan los máximos de salud.
  const maximos = salud(sheet, sinUmbrales);
  // La temporal de Proeza cuenta para el umbral mientras dura la escena (sheet.ts).
  // TODO(revisar): en combate se resta de la fatiga del combatiente, porque Combatiente
  // no lleva temporal propia y Proeza la apunta en la ficha.
  const v =
    vitalidad.origen === "combate"
      ? { pg: vitalidad.pgActual, pgMax: vitalidad.pgMax, fatiga: vitalidad.fatigaActual - sheet.fatigaTemporal, fatigaMax: vitalidad.fatigaMax }
      : { pg: sheet.vidaActual, pgMax: maximos.vida, fatiga: fatigaEfectiva(sheet), fatigaMax: maximos.fatiga };
  const umbrales = {
    salud: umbralSalud(v.pg, v.pgMax),
    fatiga: umbralFatiga(v.fatiga, v.fatigaMax),
  };
  const porUmbral = movimientoPorUmbrales(umbrales.salud, umbrales.fatiga);
  const ajusteUmbrales = ajusteUmbralesDeEspecie(especie);
  const modificadores = [...sinUmbrales, ...modificadoresDeUmbrales(v.pg, v.pgMax, v.fatiga, v.fatigaMax, ajusteUmbrales)];

  // Media velocidad: carrera, vuelo y levitación; saltos, escalada y nado no (S26).
  const velocidad = (m: number) => (porUmbral.mediaVelocidad.length > 0 ? Math.floor(m / 2) : m);
  const mov = movimiento(sheet, modificadores, formulaMovimiento.formula);
  const vue = vuelo(sheet);
  const psionica = nivelesDePsionica(sheet, bonosDeDisciplina(modificadores));
  const lev = levitacion(psionica.paraEfectos);
  const carga = cargaMaxima(sheet, modificadores, multiplicadorCarga.valor);

  return {
    ficha: sheet,
    especie,
    modificadores,
    atributos: atributosEfectivos(sheet, modificadores),
    aplicados: aplicados(sheet, modificadores),
    desgloses: {
      atributos: Object.fromEntries(
        ATRIBUTOS.map((a) => [a.id, desgloseAtributo(sheet, a.id, modificadores)]),
      ) as Record<AtributoId, DesgloseDerivado>,
      aplicados: Object.fromEntries(
        APLICADOS.map((a) => [a.id, desgloseAplicado(sheet, a.id, modificadores)]),
      ) as Record<AplicadoId, DesgloseDerivado>,
    },
    salud: maximos,
    alerta: alerta(sheet, modificadores),
    umbrales: { ...umbrales, movimiento: porUmbral },
    ajusteUmbrales,
    movimiento: { ...mov, carrera: velocidad(mov.carrera) },
    vuelo: vue && { ...vue, velocidadM: velocidad(vue.velocidadM) },
    levitacion: lev && { ...lev, velocidadM: velocidad(lev.velocidadM) },
    cargaMaxima: porUmbral.reduccionCarga ? reducir(carga, porUmbral.reduccionCarga.fraccion) : carga,
    formulaMovimiento,
    multiplicadorCarga,
    blindaje: { tieneEscudoMelee: tieneEscudoMelee(sheet), armaduraNatural: armaduraNaturalDeEspecie(especie) },
    indiceCondiciones: indiceDeCondiciones(sheet, casillasDeEspecie(especie)),
    textosTirada: textosDeEspecie(especie),
    ajusteCoste: libre ? AJUSTE_NEUTRO : ajustesDeCoste(especie),
    bolsaAumentos: libre ? null : bolsaDeAumentos(especie),
    excepcionesRareza: libre ? [] : excepcionesRareza(especie),
    psionica,
  };
}

// --- Lo que la ficha añade a una tirada antes de montarla ------------------------

// Las casillas con alcance (equipo y especie, del índice) y los textos de especie de
// esta tirada, sea fija de ACCIONES o generada (ataques, herramientas, Volar…). Ni la
// tirada ni la pantalla saben de dónde vienen. `modoElegido: null`: la tirada aún no se
// ha abierto, así que una casilla con alcance "modo" no tiene nada que casar (ver
// indiceDeCondiciones). Sin nada que añadir, devuelve la misma tirada.
export function conExtrasDeFicha(ficha: Pick<FichaResuelta, "indiceCondiciones" | "textosTirada">, t: Accion): Accion {
  const extra = consultaIndiceCondiciones(ficha.indiceCondiciones, { id: t.id, grupo: t.grupo, habilidad: t.habilidad, modoElegido: null });
  const textos = ficha.textosTirada.filter((x) => (x.en.tipo === "desarmado" ? t.desarmado === true : x.en.id === t.id));
  if (extra.length === 0 && textos.length === 0) return t;
  const lineas = (critico: boolean) => textos.filter((x) => x.soloEnCritico === critico).map((x) => `${x.texto} (${x.fuente})`);
  const enNota = lineas(false);
  const enCritico = lineas(true);
  const junta = (actual: string | undefined, nuevas: string[]) => [actual, ...nuevas].filter(Boolean).join(" · ");
  return {
    ...t,
    ...(extra.length > 0 && { condiciones: [...(t.condiciones ?? []), ...extra] }),
    ...(enNota.length > 0 && { nota: junta(t.nota, enNota) }),
    ...(enCritico.length > 0 && { efectoCritico: junta(t.efectoCritico, enCritico) }),
  };
}

// --- Notas de Personaje → Estado ------------------------------------------------

export type CampoEstado =
  | "carrera"
  | "saltoVertical"
  | "saltoHorizontal"
  | "escalada"
  | "nado"
  | "vuelo"
  | "levitacion"
  | "carga";
export type NotasEstado = Record<CampoEstado, string | undefined>;

const CAMPOS_MOVIMIENTO = ["carrera", "saltoVertical", "saltoHorizontal", "escalada", "nado"] as const;

// Los que frena la "media velocidad" de §7 (S26).
const CAMPOS_VELOCIDAD = ["carrera", "vuelo", "levitacion"] as const;

const CAMPO_DE_FORMULA: Record<keyof FormulaMovimientoResuelta["formula"], CampoEstado> = {
  saltoVerticalPorPunto: "saltoVertical",
  saltoHorizontalPorPunto: "saltoHorizontal",
  escaladaBase: "escalada",
  nadoBase: "nado",
};

// De dónde sale que un derivado no sea el general, en una nota corta junto al valor:
// "+4 exoesqueleto", "fórmula · Arköru", "+200 · Casa de Zimethroni", "×1,2 · Arköru",
// y los umbrales de §7: "media velocidad · Malherido", "−25 % · Exhausto", "una casilla
// por turno · Moribundo" (esta última solo como texto, sin tocar el número).
// Varias, separadas por coma. undefined si el valor sale de la fórmula general.
export function notasDeEstado(ficha: FichaResuelta): NotasEstado {
  const notas: Record<CampoEstado, string[]> = {
    carrera: [],
    saltoVertical: [],
    saltoHorizontal: [],
    escalada: [],
    nado: [],
    vuelo: [],
    levitacion: [],
    carga: [],
  };
  const exo = ficha.movimiento.bonoExoesqueleto;
  if (exo > 0) for (const c of CAMPOS_MOVIMIENTO) notas[c].push(`+${exo} exoesqueleto`);
  for (const [k, fuente] of Object.entries(ficha.formulaMovimiento.fuentes) as [keyof typeof CAMPO_DE_FORMULA, string][]) {
    notas[CAMPO_DE_FORMULA[k]].push(`fórmula · ${fuente}`);
  }
  for (const m of ficha.especie?.modificadores ?? []) {
    // Solo movimiento: el Modificador "carga" no lo suma cargaMaxima (deuda aparte,
    // docs/tareas.md), así que no se anuncia.
    if (m.tipo !== "derivado") continue;
    const campo = CAMPOS_MOVIMIENTO.find((c) => c === m.id);
    if (!campo) continue;
    notas[campo].push(`${m.valor >= 0 ? "+" : ""}${m.valor} · ${m.fuente}`);
  }
  const { valor, fuente } = ficha.multiplicadorCarga;
  if (valor !== 1) notas.carga.push(`×${String(valor).replace(".", ",")}${fuente ? ` · ${fuente}` : ""}`);

  const { mediaVelocidad, unaCasillaPorTurno, reduccionCarga } = ficha.umbrales.movimiento;
  for (const c of CAMPOS_VELOCIDAD) {
    if (mediaVelocidad.length > 0) notas[c].push(`media velocidad · ${mediaVelocidad.join(" y ")}`);
    if (unaCasillaPorTurno) notas[c].push(`una casilla por turno · ${unaCasillaPorTurno}`);
  }
  if (reduccionCarga) notas.carga.push(`−${reduccionCarga.fraccion * 100} % · ${reduccionCarga.fuentes.join(" y ")}`);

  return Object.fromEntries(
    Object.entries(notas).map(([c, n]) => [c, n.length ? n.join(", ") : undefined]),
  ) as NotasEstado;
}
