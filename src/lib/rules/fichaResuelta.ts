// La ficha resuelta, sin UI (propuesta-especies §3.1): una sola pasada que monta los
// modificadores (especie + equipo + estados) y todo lo que cuelga de ellos.
// Las pantallas la calculan una vez por cambio (useFichaResuelta) y leen de aquí; no
// llaman a modificadoresActivos ni a los derivados sueltos (regla de ESLint).
//
// Mismo patrón que usoPoder.ts: entrada explícita, nada se lee de fuera salvo el
// catálogo. Los estados (columna propia, los pone el máster) y la vida/fatiga de un
// combate no están en la ficha, por eso entran aparte.
import { APLICADOS, ATRIBUTOS, type AplicadoId, type AtributoId } from "./atributos";
import {
  ajusteCosteDeSubida,
  ajusteUmbralesDeAumentos,
  modificadoresDeAumentos,
  notasCargaDeAumentos,
  reduccionesPorAplicadoDeAumentos,
  saldoBolsaAumentos,
} from "./aumentos";
import {
  bonosTramoDeAumentos,
  casillasDeAumentos,
  notasAlertaPasivaDeAumentos,
  textosDeAumentos,
  ventajasFijasDeAumentos,
  type VentajaFija,
} from "./aumentosTiradas";
import { normalizarDanio, type DanioVida } from "./danio";
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
  peajeNeurologicoDeEspecie,
  notasFarmacosDeEspecie,
  accionesSinDadoDeEspecie,
  type EspecieResuelta,
  type PeajeNeurologico,
  type TextoEnTirada,
  type FormulaMovimientoResuelta,
  type MultiplicadorCarga,
} from "./especie";
import { bonosDeDisciplina, nivelesDePsionica, type PsionicaResuelta } from "./psionica";
import { modificadoresDeRequisito, valoresDeRequisito, type ValoresRequisito } from "./dotes";
import {
  dotesActivas,
  efectosDeDotes,
  type AlternativaDeDote,
  type BonoTramoDeDote,
  type CriticoDeDote,
  type DescuentoDeDote,
  type GradoFijoDeDote,
  type PermisosDeDotes,
} from "./dotesEfectos";
import { accionesDeDotes, type AccionesDeDotes } from "./dotesAcciones";
import { accionesDeAumentos, type AccionesDeAumentos } from "./aumentosAcciones";
import { efectosDeActivables } from "./aumentosActivables";
import { conUsosEscena, usosEscenaDeFicha } from "./usosEscena";
import { poderesDeDotes } from "./dotesPoderes";
import type { ExcepcionRareza } from "../catalog/especies";
import { AJUSTE_NEUTRO, type AjusteCoste } from "./progresion";
import { consultaIndiceCondiciones, indiceDeCondiciones, modificadoresDeEquipo, salvacionesDeEquipo, type IndiceCondiciones } from "./equipo";
import { casillasDeFarmacos } from "./farmacos";
import { inmunidadesDe } from "./inmunidades";
import {
  estadosConEfecto,
  modificadoresDeEstados,
  modificadoresDeUmbrales,
  movimientoPorUmbrales,
  sumaAjustesUmbrales,
  umbralFatiga,
  type AjusteUmbrales,
  umbralSalud,
  type EstadoActivo,
  type Inmunidad,
  type MovimientoPorUmbral,
  type UmbralFatiga,
  type UmbralSalud,
} from "./estados";
import { levitacion, type PoderDisponible } from "./poderes";
import { fatigaEfectiva } from "./vitalidad";
import { alcanzaA, descartadosPorNoApila, type FamiliaArma, type ModificadorConFuente } from "./modificadores";
import { conTextosEnTirada, contextoDe, junta, textosDe, textosSinDado } from "./textosTirada";
import type { Sheet } from "./sheet";
import { condicionApuntado, ID_APUNTADO, ID_APUNTAR, type Accion, type AccionDirecta } from "./acciones";
import type { CondicionTirada } from "./condiciones";

export type DesgloseDerivado = { total: number; fuentes: Fuente[] };

export type BolsaAumentosResuelta = { total: number; gastada: number; saldo: number };

function bolsaResuelta(total: number | null, gastada: number): BolsaAumentosResuelta | null {
  if (total === null) return null;
  return { total, gastada, saldo: saldoBolsaAumentos(total, gastada) };
}

export type FichaResuelta = {
  ficha: Sheet;
  especie: EspecieResuelta | null;
  // Los estados que lleva puestos (los de OpcionesFicha), para pintarlos.
  estados: EstadoActivo[];
  // A7: estados a los que es inmune, con la pieza que lo da. Los puestos sin forzar no hacen
  // efecto (estadosConEfecto); siguen en `estados`. Derivado: también al NPC.
  inmunidades: Inmunidad[];
  // Piezas que no funcionan ahora mismo, por instanciaId, con el motivo. Hueco para el
  // Shock (S73: la pieza afectada pierde su bono) y los aumentos; vacío hasta entonces.
  piezasInutilizadas: ReadonlyMap<string, string>;
  // Especie, dotes (bonos fijos a tiradas, §9.3), equipo, aumentos (A1), estados y umbrales de
  // salud/fatiga (§7), en ese orden (el de modificadoresActivos más los estados detrás,
  // como los sumaba Acciones).
  modificadores: ModificadorConFuente[];
  atributos: Record<AtributoId, number>;
  aplicados: Record<AplicadoId, number>;
  desgloses: {
    atributos: Record<AtributoId, DesgloseDerivado>;
    aplicados: Record<AplicadoId, DesgloseDerivado>;
  };
  salud: { vida: number; fatiga: number };
  // Desglose de la vida perdida (danio.ts) contra el máximo de `salud`, el que pinta la barra:
  // cuadra con lo que se ve aunque un estado del máster mueva el máximo.
  danio: DanioVida;
  alerta: number;
  // Umbrales de §7 con la vida/fatiga de `vitalidad` (fatiga efectiva) y lo que hacen
  // a velocidad y carga, ya aplicado en movimiento, vuelo, levitación y cargaMaxima.
  umbrales: { salud: UmbralSalud; fatiga: UmbralFatiga; movimiento: MovimientoPorUmbral };
  // Puntos menos de penalizador por especie (Guerrero, Siervo; §14.8) y por aumentos
  // (Estabilización Autonómica, A3; Neuroprótesis activa, A5a), sumados (R8) y ya aplicados en los modificadores de umbral
  // de arriba. No lleva las reducciones por aplicado (Neurogénesis), que van como compensación
  // propia en `modificadores`. Derivado: también al NPC.
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
  // Casillas con alcance del equipo, de la especie (§14.8), de las dotes (§9.3) y de los
  // aumentos (A2a: casillas de Alerta y el selector "Contra…" de las salvaciones),
  // indexadas una vez (consultaIndiceCondiciones). Las de especie, dotes y aumentos son
  // derivadas: también al NPC.
  indiceCondiciones: IndiceCondiciones;
  // Textos sin mecanizar de la especie (§14.10), de las dotes (§9.3) y de los aumentos
  // (A2a: Matriz de Red en la salvación de Voluntad) que cuelgan de una tirada: los pone conExtrasDeFicha en su nota o en su texto de crítico.
  textosTirada: TextoEnTirada[];
  // Ventajas sin casilla de los aumentos (A2b: Red Frontoparietal en Iniciativa), con su
  // alcance: las pone conExtrasDeFicha en `Accion.ventaja`. Derivadas: también al NPC.
  ventajasFijas: VentajaFija[];
  // Lo de las dotes que no es casilla ni texto (D2b-1): bonos por tramo de distancia con
  // su alcance y críticos fijos por especialidad de arma. También los pone conExtrasDeFicha.
  // `permisos` (D2b-2): Bloquear y el estilo Sutil, que solo existen con su dote; se los
  // pasa quien genera las filas de arma (accionesDeAtaque). En modo libre igual: sin dote,
  // tampoco el NPC. `descuentos` (D2c-1): contadores que cuentan de menos (Reflejos Felinos).
  // `grados` y `alternativas` (tiradas fijas): cambios de grado sin casilla (Velocista, Gran
  // Puntería) y otra habilidad con casilla en la fila (Cazador Cazado, Vigilancia Táctica).
  // En `bonosTramo` van también los de los aumentos (Foveo con el selector "Apuntado").
  extrasDotes: {
    bonosTramo: BonoTramoDeDote[];
    criticos: CriticoDeDote[];
    permisos: PermisosDeDotes;
    descuentos: DescuentoDeDote[];
    grados: GradoFijoDeDote[];
    alternativas: AlternativaDeDote[];
  };
  // Acciones propias de dote (D2c-1, dotesAcciones.ts): la sección "Dotes" de Acciones y las
  // copias en su grupo extra. Sin las de requisito roto (S34); el NPC, sin mirar requisitos.
  accionesDotes: AccionesDeDotes;
  // Poderes de dote (D2c-2, dotesPoderes.ts): Impacto Métrico y Sobrecarga Métrica, como
  // PoderDisponible al nivel de su disciplina (psionica.paraEfectos). Van a la sección "Dotes"
  // de Acciones y se usan con prepararPoder como cualquier poder. Sin las de requisito roto.
  poderesDotes: PoderDisponible[];
  // Acciones propias de aumento (A4a, aumentosAcciones.ts): la sección "Aumentos" de Acciones,
  // con las filas informativas (defensa del MQE). Sin las de requisito roto; derivadas: también
  // al NPC.
  accionesAumentos: AccionesDeAumentos;
  // Casillas "una vez por escena" ya gastadas (sheet.usosEscena), con su etiqueta: la lista de
  // Recursos. En el índice de condiciones esas casillas ya salen bloqueadas.
  usosEscena: { id: string; etiqueta: string }[];
  // Creación y progresión (§14.6): el ajuste de coste que reciben los puntos, la
  // compra y el coste del siguiente nivel, y la bolsa de aumentos (null si la
  // especie no la trae). En modo libre (NPC, §14.3), neutros.
  // `ajusteCoste`: el de la especie, el del point-buy de creación (puntos gastados,
  // excesos, compra en borrador). `ajusteCosteSubida`: con el que se paga la siguiente
  // subida en el estado de la ficha — aprobada (XP), con las rebajas de los aumentos
  // (A1); en borrador, igual que ajusteCoste. Lo lee el coste del "+" (Habilidades).
  ajusteCoste: AjusteCoste;
  ajusteCosteSubida: AjusteCoste;
  // Bolsa de aumentos (Humanos): total de la especie, lo gastado (sheet) y el saldo.
  bolsaAumentos: BolsaAumentosResuelta | null;
  // Piezas sin tope de rareza por especie (kerzul del Arköru, §14.6): las recibe
  // puedeEquiparSinRareza. Es de creación: vacío en modo libre.
  excepcionesRareza: ExcepcionRareza[];
  // Niveles de disciplina (§14.6): comprado, efectivo (con Resonancia +1 de especie,
  // puede pasar de 6) y paraEfectos (tope 6), y los requisitos rotos. Derivado: le
  // llega también al NPC. Poderes y bonos por nivel leen `paraEfectos`.
  psionica: PsionicaResuelta;
  // Los valores que miran los requisitos de dotes (§9.1, dotes.ts): con la especie y
  // los aumentos permanentes (§11.3), sin equipo normal ni estados de combate. Los lee
  // la pestaña Dotes y faltasDeDotes.
  requisitosDotes: ValoresRequisito;
  // Otras áreas (§14.9, E5), derivadas: también al NPC. El peaje al pagar fatiga por un
  // poder (lo lee usarPoder; null sin el rasgo), las notas fijas de las filas de
  // fármaco y las acciones sin dado del rasgo (activar la visión).
  peajeNeurologico: PeajeNeurologico | null;
  notasFarmacos: string[];
  accionesEspecie: AccionDirecta[];
};

// `libre`: editor de NPC del máster. Le llega todo lo derivado de la especie (también
// la Resonancia +1), pero no lo de creación (costes por casta, descuentos psiónicos,
// bolsa de aumentos, kerzul sin rareza).
// `estados`: los del personaje (Character.estados, también en combate) o los de la fila
// del NPC; mueven también la vida y la fatiga máximas.
// `aprobada`: la ficha está aprobada (Character.status === "APPROVED") y sube con XP. Solo
// cambia ajusteCosteSubida (rebajas de los aumentos, A1). Sin él, borrador.
export type OpcionesFicha = { estados: EstadoActivo[]; vitalidad: VitalidadActual; libre?: boolean; aprobada?: boolean };

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

const SIN_PIEZAS_INUTILIZADAS: ReadonlyMap<string, string> = new Map();

export function resolverFicha(
  sheet: Sheet,
  { estados, vitalidad, libre = false, aprobada = false }: OpcionesFicha,
): FichaResuelta {
  const especie = especieDeFicha(sheet);
  const formulaMovimiento = formulaMovimientoDeEspecie(especie);
  const multiplicadorCarga = multiplicadorCargaDeEspecie(especie);
  const deAumentos = modificadoresDeAumentos(sheet);
  // Activables encendidos (A5a): estado propio puesto y pieza que funciona. Sus atributos van con
  // origen "estado" y no entran en requisitosDotes (R3, S30).
  const activables = efectosDeActivables(sheet, estados);
  // A7: lo puesto antes de ganar la inmunidad sigue en la lista pero no hace nada.
  const inmunidades = inmunidadesDe(sheet);
  const requisitosDotes = valoresDeRequisito(sheet, modificadoresDeRequisito(sheet, especie?.modificadores ?? []));
  // Lo que ponen las dotes en las tiradas (§9.3, D2a). Sin las de requisito roto (S34);
  // en modo libre (NPC del máster) sin mirar requisitos (§9.4).
  const valoresDotes = libre ? null : requisitosDotes;
  const activas = dotesActivas(sheet, valoresDotes);
  // Los bonos con umbral (D2d) miran la ficha con la especie también en el NPC.
  const dotes = efectosDeDotes(activas, valoresDotes, requisitosDotes);
  // = [...modificadoresActivos(sheet), ...estados], sin volver a resolver la especie.
  const sinUmbrales: ModificadorConFuente[] = [
    ...(especie?.modificadores ?? []),
    ...dotes.modificadores,
    ...modificadoresDeEquipo(sheet),
    ...deAumentos,
    ...modificadoresDeEstados(estadosConEfecto(estados, inmunidades), activables.reduceEstados),
    ...activables.modificadores,
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
  const ajusteUmbrales = sumaAjustesUmbrales(
    ajusteUmbralesDeEspecie(especie),
    ajusteUmbralesDeAumentos(sheet),
    activables.ajusteUmbrales,
  );
  const modificadores = [
    ...sinUmbrales,
    ...modificadoresDeUmbrales(v.pg, v.pgMax, v.fatiga, v.fatigaMax, ajusteUmbrales, reduccionesPorAplicadoDeAumentos(sheet)),
  ];

  // Media velocidad: carrera, vuelo y levitación; saltos, escalada y nado no (S26).
  const velocidad = (m: number) => (porUmbral.mediaVelocidad.length > 0 ? Math.floor(m / 2) : m);
  const mov = movimiento(sheet, modificadores, formulaMovimiento.formula);
  const vue = vuelo(sheet);
  const psionica = nivelesDePsionica(sheet, bonosDeDisciplina(modificadores));
  const lev = levitacion(psionica.paraEfectos);
  const carga = cargaMaxima(sheet, modificadores, multiplicadorCarga.valor);
  const ajusteCoste = libre ? AJUSTE_NEUTRO : ajustesDeCoste(especie);

  return {
    ficha: sheet,
    especie,
    estados,
    inmunidades,
    piezasInutilizadas: SIN_PIEZAS_INUTILIZADAS,
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
    danio: normalizarDanio(sheet.danio, Math.max(0, maximos.vida - sheet.vidaActual)),
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
    indiceCondiciones: indiceDeCondiciones(sheet, [
      ...casillasDeEspecie(especie),
      ...dotes.casillas,
      ...conUsosEscena(casillasDeAumentos(sheet, activables.salvaciones, salvacionesDeEquipo(sheet)), sheet.usosEscena),
      ...casillasDeFarmacos(sheet),
    ]),
    textosTirada: [...textosDeEspecie(especie), ...dotes.textos, ...textosDeAumentos(sheet), ...activables.textos],
    ventajasFijas: ventajasFijasDeAumentos(sheet),
    extrasDotes: {
      bonosTramo: [...dotes.bonosTramo, ...bonosTramoDeAumentos(sheet)],
      criticos: dotes.criticos,
      permisos: dotes.permisos,
      descuentos: dotes.descuentos,
      grados: dotes.grados,
      alternativas: dotes.alternativas,
    },
    accionesDotes: accionesDeDotes(activas),
    poderesDotes: poderesDeDotes(activas, sheet, psionica.paraEfectos),
    accionesAumentos: accionesDeAumentos(sheet, estados),
    usosEscena: usosEscenaDeFicha(sheet),
    ajusteCoste,
    ajusteCosteSubida: libre ? AJUSTE_NEUTRO : ajusteCosteDeSubida(ajusteCoste, sheet, aprobada),
    bolsaAumentos: libre ? null : bolsaResuelta(bolsaDeAumentos(especie), sheet.bolsaAumentosGastada),
    excepcionesRareza: libre ? [] : excepcionesRareza(especie),
    psionica,
    requisitosDotes,
    peajeNeurologico: peajeNeurologicoDeEspecie(especie),
    notasFarmacos: notasFarmacosDeEspecie(especie),
    accionesEspecie: accionesSinDadoDeEspecie(especie),
  };
}

// --- Lo que la ficha añade a una tirada antes de montarla ------------------------

// Las casillas con alcance (equipo, especie y dotes, del índice) y los textos de especie
// y dotes de esta tirada, sea fija de ACCIONES o generada (ataques, herramientas, Volar…). Ni la
// tirada ni la pantalla saben de dónde vienen. `modoElegido: null`: la tirada aún no se
// ha abierto, así que una casilla con alcance "modo" no tiene nada que casar (ver
// indiceDeCondiciones). De las dotes, además, los bonos por tramo y el crítico fijo de
// Crítico Mejorado (solo en ataques: ni al lanzar ni al bloquear). Sin nada que añadir,
// devuelve la misma tirada.
const FAMILIAS_CON_CRITICO_FIJO: readonly FamiliaArma[] = ["ataque_melee", "ataque_fuego", "ataque_pesado"];

export function conExtrasDeFicha(
  ficha: Pick<FichaResuelta, "indiceCondiciones" | "textosTirada" | "extrasDotes" | "ventajasFijas">,
  t: Accion,
): Accion {
  // La tirada libre (T-007, R1): sin casillas, textos, ventajas, bonos por tramo, descuentos
  // ni crítico fijo; solo los modificadores de alcance que casen con su aplicado y habilidad.
  if (t.libre) return t;
  const ctx = contextoDe(t);
  const extra = consultaIndiceCondiciones(ficha.indiceCondiciones, ctx);
  const textos = textosDe(ficha.textosTirada, ctx, t.desarmado === true);
  const bonosTramo = ficha.extrasDotes.bonosTramo.filter((b) => alcanzaA(b.alcance, ctx)).map((b) => b.bono);
  const critico = t.familiaArma && FAMILIAS_CON_CRITICO_FIJO.includes(t.familiaArma) && t.especialidadArma
    ? ficha.extrasDotes.criticos
        .filter((c) => c.especialidad === t.especialidadArma)
        .reduce<CriticoDeDote | null>((mejor, c) => (!mejor || c.margen < mejor.margen ? c : mejor), null)
    : null;
  const descuentos = ficha.extrasDotes.descuentos.filter((d) => alcanzaA(d.alcance, ctx));
  // La ventaja que ya trae la tirada manda (no se acumula).
  const ventaja = t.ventaja ? undefined : ficha.ventajasFijas.find((v) => alcanzaA(v.alcance, ctx))?.fuente;
  // Cambios de grado sin casilla (Velocista, Gran Puntería): el crítico más fácil gana.
  const grados = ficha.extrasDotes.grados.filter((g) => alcanzaA(g.alcance, ctx));
  const criticoFinal = [...(critico ? [{ margen: critico.margen, fuente: critico.fuente }] : []), ...grados.flatMap((g) => (g.margen === undefined ? [] : [{ margen: g.margen, fuente: g.fuente }]))]
    .reduce<{ margen: number; fuente: string } | null>((mejor, c) => (!mejor || c.margen < mejor.margen ? c : mejor), null);
  const subeGradoFijo = grados.find((g) => g.subeGrado)?.fuente;
  // Otra habilidad con casilla en la fila (Cazador Cazado), si la tirada no trae ya una y el
  // aplicado de la dote es el suyo.
  const alt = t.habilidadAlternativa
    ? undefined
    : ficha.extrasDotes.alternativas.find((a) => alcanzaA(a.alcance, ctx) && (!a.aplicado || a.aplicado === t.aplicado));
  const conApuntado = t.condiciones && selectorApuntadoDeFicha(ficha, t.condiciones);
  if (
    extra.length === 0 &&
    textos.length === 0 &&
    bonosTramo.length === 0 &&
    !criticoFinal &&
    descuentos.length === 0 &&
    !ventaja &&
    !subeGradoFijo &&
    !alt &&
    conApuntado === t.condiciones
  )
    return t;
  const condiciones = conDescuentos([...(conApuntado ?? []), ...extra], descuentos);
  return {
    ...conTextosEnTirada(t, textos),
    ...((extra.length > 0 || descuentos.length > 0 || conApuntado !== t.condiciones) && { condiciones }),
    ...(bonosTramo.length > 0 && { bonosTramo: [...(t.bonosTramo ?? []), ...bonosTramo] }),
    ...(criticoFinal && { criticoFijo: criticoFinal }),
    ...(subeGradoFijo && { subeGradoFijo }),
    ...(alt && { habilidadAlternativa: { habilidad: alt.habilidad, especialidad: alt.especialidad, etiqueta: alt.etiqueta } }),
    ...(ventaja && { ventaja }),
  };
}

// Con Gran Puntería (éxito → crítico sin casilla en Apuntar), el selector "Apuntado" de los
// ataques a distancia cuenta el éxito como crítico y el crítico natural baja la cobertura 2
// niveles en total (acciones.ts, condicionApuntado). Sin ella, las mismas condiciones.
function selectorApuntadoDeFicha(ficha: Pick<FichaResuelta, "extrasDotes">, condiciones: CondicionTirada[]): CondicionTirada[] {
  const i = condiciones.findIndex((c) => c.id === ID_APUNTADO);
  if (i < 0) return condiciones;
  const gp = ficha.extrasDotes.grados.find(
    (g) => g.alcance.tipo === "tiradaId" && g.alcance.id === ID_APUNTAR && g.margen === 0,
  );
  if (!gp) return condiciones;
  return condiciones.map((c, j) => (j === i ? condicionApuntado(gp.fuente) : c));
}

// Reflejos Felinos: el contador de la tirada cuenta unidades de menos (varios se suman).
function conDescuentos(condiciones: CondicionTirada[], descuentos: DescuentoDeDote[]): CondicionTirada[] {
  if (descuentos.length === 0) return condiciones;
  return condiciones.map((c) => {
    if (c.tipo !== "contador") return c;
    const propios = descuentos.filter((d) => d.contador === c.id);
    if (propios.length === 0) return c;
    return {
      ...c,
      descuento: { unidades: propios.reduce((t, d) => t + d.unidades, 0), fuente: propios.map((d) => d.fuente).join(", ") },
    };
  });
}

// Lo mismo para una acción sin dado ("Levantar [escudo]"): solo textos, todos a su nota
// (no hay crítico). Sin nada que añadir, devuelve la misma acción.
export function conExtrasDirectaDeFicha(ficha: Pick<FichaResuelta, "textosTirada">, d: AccionDirecta): AccionDirecta {
  const textos = textosDe(ficha.textosTirada, contextoDe({ ...d, habilidad: null }), false);
  if (textos.length === 0) return d;
  return { ...d, nota: junta(d.nota, textosSinDado(textos)) };
}

// --- Notas de Personaje → Estado ------------------------------------------------

export type CampoEstado =
  | "alerta"
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
    alerta: [],
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
  // Alerta pasiva (A2a): lo que la sube, con su fuente (el que no se apila, a 0), y lo que
  // solo vale en ciertas condiciones, como nota sin sumar (Detección Química).
  const deAlerta = ficha.modificadores.filter((m) => m.tipo === "derivado" && m.id === "alerta");
  const fueraAlerta = descartadosPorNoApila(deAlerta, (m) => (m.tipo === "derivado" ? m.noApila : undefined), (m) => m.valor);
  for (const m of deAlerta) {
    const gana = fueraAlerta.get(m);
    notas.alerta.push(gana ? `${m.fuente} no se suma con ${gana.fuente}` : `${m.valor >= 0 ? "+" : ""}${m.valor} · ${m.fuente}`);
  }
  notas.alerta.push(...notasAlertaPasivaDeAumentos(ficha.ficha));

  const { valor, fuente } = ficha.multiplicadorCarga;
  if (valor !== 1) notas.carga.push(`×${String(valor).replace(".", ",")}${fuente ? ` · ${fuente}` : ""}`);
  notas.carga.push(...notasCargaDeAumentos(ficha.ficha));

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
