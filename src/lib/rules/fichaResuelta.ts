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
  salvacionesDePiezas,
  notasAlertaPasivaDeAumentos,
  textosDeAumentos,
  ventajasFijasDeAumentos,
  type VentajaFija,
} from "./aumentosTiradas";
import { normalizarDanio, type DanioVida } from "./danio";
import { ESTADO_CAMUFLAJE_ID, estadoPorId } from "../catalog/estados";
import { accionEsconderArma, mallaAnulaCamuflaje, ocultacionDeFicha, textoSigiloPorSentido, type OcultacionDeFicha } from "./sigilo";
import { absorcionDeContencion, tieneEscudoMelee, type AbsorcionPropia, type ArmaduraNatural } from "./blindaje";
import {
  alerta,
  aplicados,
  atributosEfectivos,
  cargaMaxima,
  desgloseAplicado,
  desgloseAtributo,
  topeAgilidadAplicado,
  type TopeAgilidadAplicado,
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
  excepcionesRareza,
  fallosCriticosDeEspecie,
  formulaMovimientoDeEspecie,
  multiplicadorCargaDeEspecie,
  recargoArmadurasDeEspecie,
  textosDeEspecie,
  fuentesPsionicasDeFicha,
  accesoDeFuentes,
  salvacionesDeEspecie,
  notasFarmacosDeEspecie,
  accionesSinDadoDeEspecie,
  type EspecieResuelta,
  type FalloCriticoFijo,
  type TextoEnTirada,
  type FormulaMovimientoResuelta,
  type MultiplicadorCarga,
} from "./especie";
import { bonosDeDisciplina, nivelesDePsionica, type PsionicaResuelta } from "./psionica";
import type { SobreesfuerzoDeFicha } from "./sobreesfuerzo";
import { modificadoresDeRequisito, valoresDeRequisito, type ValoresRequisito } from "./dotes";
import {
  dotesActivas,
  efectosDeDotes,
  type AlternativaDeDote,
  type CompensaManiobra,
  type BonoTramoDeDote,
  type CriticoDeDote,
  type DescuentoDeDote,
  type GradoFijoDeDote,
  type PermisosDeDotes,
} from "./dotesEfectos";
import { accionesDeDotes, type AccionesDeDotes, type MesaDeFicha } from "./dotesAcciones";
import { accionesDeAumentos, type AccionesDeAumentos, type FilaAumento } from "./aumentosAcciones";
import { efectosDeActivables } from "./aumentosActivables";
import { conUsosEscena, usosEscenaDeFicha } from "./usosEscena";
import { poderesDeDotes } from "./dotesPoderes";
import type { ExcepcionRareza, RecargoArmaduras } from "../catalog/especies";
import { AJUSTE_NEUTRO, type AjusteCoste } from "./progresion";
import {
  consultaIndiceCondiciones,
  indiceDeCondiciones,
  modificadoresDeEquipo,
  pesoEquipado,
  rebajasTipoAccionDeEquipo,
  reduccionesDeEquipo,
  salvacionesDeEquipo,
  type IndiceCondiciones,
} from "./equipo";
import { casillasDeFarmacos } from "./farmacos";
import {
  ajusteUmbralesDeEstabilizado,
  describirEstados,
  estadosDerivados,
  modificadoresDeUmbrales,
  movimientoPorUmbrales,
  velocidadConUmbrales,
  sumaAjustesUmbrales,
  ajusteUmbralesDeEstados,
  umbralFatiga,
  type AjusteUmbrales,
  umbralSalud,
  type EstadoActivo,
  type EstadoActivoDescrito,
  type EstadoDerivado,
  type Inmunidad,
  type MovimientoPorUmbral,
  type UmbralFatiga,
  type UmbralSalud,
} from "./estados";
import { casillasDePsionica, levitacion, type PoderDisponible } from "./poderes";
import { fatigaEfectiva, fatigaEnJuego } from "./vitalidad";
import { baseDeFicha, modificadoresDeBase } from "./baseFicha";
import { accionesDeMovimiento, accionesDirectasDeMovimiento } from "./movimiento";
import { alcanzaA, descartadosPorNoApila, type AlcanceModificador, type ModificadorConFuente } from "./modificadores";
import { aplicadosPosibles, conTextosDeFicha, contextoDe, junta, textosDe, textosSinDado, type ObjetivoEnTirada } from "./textosTirada";
import {
  bonoConShock,
  conMarcaDeReglaPropia,
  esComplejaOReaccion,
  etiquetaShock,
  MARCA_SHOCK,
  motivoApagada,
  motivoSinComplejasNiReacciones,
  piezasDeEstado,
  sinComplejasNiReacciones,
  sinModosComplejos,
  type PiezaConReglaPropia,
  type PiezaPenalizada,
} from "./shock";
import type { OrigenAporte } from "./origen";
import type { Sheet } from "./sheet";
import { condicionApuntado, ID_APUNTADO, ID_APUNTAR, tieneEspecialidad, type Accion, type AccionDirecta } from "./acciones";
import { bloqueadaPor, conHabilitacion, juntarHabilitacion, motivoDeBloqueo, ocultaPor, type Habilitacion } from "./habilitacion";
import type { CondicionTirada } from "./condiciones";
import { idSelectorTipoAccion, resolverTiposDeAccion, selectorTipoAccion, textoTipoAccion, type RebajaConFuente } from "./tipoAccion";

export type DesgloseDerivado = { total: number; fuentes: Fuente[] };

export type BolsaAumentosResuelta = { total: number; gastada: number; saldo: number };

function bolsaResuelta(total: number | null, gastada: number): BolsaAumentosResuelta | null {
  if (total === null) return null;
  return { total, gastada, saldo: saldoBolsaAumentos(total, gastada) };
}

export type FichaResuelta = {
  ficha: Sheet;
  especie: EspecieResuelta | null;
  // Los estados que lleva puestos (los de OpcionesFicha): los guardados, sin los derivados.
  estados: EstadoActivo[];
  // Los umbrales de §7 como estados (Heridas, Fatiga) e Inconsciencia a 0, con la misma
  // vida/fatiga que `umbrales`. Nunca se guardan; para pintarlos junto a `estados`, con
  // estadosParaPintar. Sus números ya van en `modificadores`, `movimiento` y `cargaMaxima`.
  estadosDerivados: EstadoDerivado[];
  // A7: estados a los que es inmune, con la pieza que lo da. Los puestos sin forzar no hacen
  // efecto (estadosConEfecto); siguen en `estados`. Derivado: también al NPC.
  inmunidades: Inmunidad[];
  // `estados` sin los que anula una inmunidad: los que hacen efecto. Los lee prepararPoder
  // (Supresores dobla la fatiga de los poderes, cuestionario eq-22).
  estadosConEfecto: EstadoActivo[];
  // Piezas que no funcionan ahora mismo, por instanciaId, con el motivo («Shock», «Shock en el
  // equipo»): las que apaga el grado puesto de un estado (rules/shock.ts, S73). Todo lo de
  // abajo se calcula sin ellas (`fichaSinApagadas`); sus acciones propias salen bloqueadas
  // (conExtrasDeFicha, accionesDeAumentos) y el desglose de las tiradas a las que llegaban lo
  // dice (`aportesApagados`).
  piezasInutilizadas: ReadonlyMap<string, string>;
  // Piezas que el grado puesto penaliza (fracaso −2, éxito −1; pl-02, usuario 2026-11-14): cada
  // bono positivo suyo pierde N sin bajar de 0 (los modificadores con `item`, ya aquí abajo en
  // `modificadores`; lo que trae la tirada, conPiezasAfectadas; Resistir daño, conShockEnLineas) y
  // las tiradas que la usan llevan −N.
  piezasPenalizadas: ReadonlyMap<string, PiezaPenalizada>;
  // Piezas tocadas con regla propia (`alShock`, eq-29), en cualquier grado con efecto: ni apagadas
  // ni penalizadas. Inyector 2, como el nivel 1 (ya en `fichaSinApagadas`); Soporte Vital, sus
  // salvaciones del «Contra…» a +1 y sin la resistencia térmica (ya en `indiceCondiciones`).
  piezasConReglaPropia: ReadonlyMap<string, PiezaConReglaPropia>;
  // La ficha sin las piezas apagadas y con la de regla `comoNivel` en ese nivel (piezasEnUso): con
  // ella se resuelve lo que no llega por un aporte con origen (blindaje y absorción al resistir
  // daño, vuelo, exoesqueleto…). `ficha` sigue entera.
  fichaSinApagadas: Sheet;
  // A qué tiradas llegaba cada pieza apagada (por el blanco de sus aportes), para que su
  // desglose diga por qué no está. Vacío sin piezas apagadas.
  aportesApagados: AporteApagado[];
  // Especie, dotes (bonos fijos a tiradas, §9.3), equipo, aumentos (A1), estados y umbrales de
  // salud/fatiga (§7), en ese orden (el de modificadoresActivos más los estados detrás,
  // como los sumaba Acciones).
  modificadores: ModificadorConFuente[];
  atributos: Record<AtributoId, number>;
  // La Agilidad topada por la armadura (S93), para que la ficha lo enseñe («Agilidad 5 → 4
  // (Armadura Pesada)»); null si ninguna armadura la está topando. Ya aplicado en `atributos`,
  // `aplicados` y `modificadores`.
  topeAgilidad: TopeAgilidadAplicado | null;
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
  // a velocidad y carga, ya aplicado en movimiento, vuelo, levitación y cargaMaxima (sin lo de
  // un umbral que `ajusteUmbrales` elimina, td-10).
  umbrales: { salud: UmbralSalud; fatiga: UmbralFatiga; movimiento: MovimientoPorUmbral };
  // Puntos menos de penalizador por especie (Guerrero, Siervo; §14.8) y por aumentos
  // (Estabilización Autonómica, A3; Neuroprótesis activa, A5a), sumados (R8) y ya aplicados en los modificadores de umbral
  // de arriba. No lleva las reducciones por aplicado (Neurogénesis), que van como compensación
  // propia en `modificadores`. Derivado: también al NPC.
  ajusteUmbrales: AjusteUmbrales;
  movimiento: ReturnType<typeof movimiento>;
  // "Volar" (Movilidad Aérea, movimiento.ts) con los metros ya a media velocidad si toca (td-26).
  accionesMovimiento: Accion[];
  // «Volar» con maniobra simple, sin dado (movimiento.ts), con la misma media velocidad.
  directasMovimiento: AccionDirecta[];
  // Lo que las dotes anulan de la dificultad de maniobra en la esquiva en vuelo (Piloto y As de
  // Exoarmadura): se lo pasa la pantalla a conEsquivaEnVuelo, que lo topa en la maniobrabilidad.
  compensaManiobraVuelo: CompensaManiobra | null;
  // T4 (rules/sigilo.ts): «Esconder arma» si hay algo que esconder; la ocultación que lleva
  // (camuflaje activo y pasivo), que se suma por sentido al Sigilo al pintarlo; y las casillas que
  // salen ya marcadas por un estado puesto (Camuflaje: «Tengo cobertura» en la esquiva, eq-26).
  accionesOcultacion: Accion[];
  ocultacion: OcultacionDeFicha | null;
  casillasMarcadas: string[];
  // null si la ficha no vuela (Movilidad Aérea) o no levita (Traslación 2+).
  vuelo: ReturnType<typeof vuelo>;
  levitacion: ReturnType<typeof levitacion>;
  cargaMaxima: number;
  // Lo que pesa lo que se lleva (pesoEquipado, rules/equipo.ts), con el recargo de abajo.
  pesoEquipado: number;
  // Modelos a Medida (Arköru, sync Drive 2026-11-14): % de más en peso y precio de las
  // armaduras, o null. Lo usan la carga y la Tienda (costeDePieza). Derivado: también al NPC.
  recargoArmaduras: RecargoArmaduras | null;
  // Lo que la especie cambia de fórmula (§14.7), con su fuente: lo usan movimiento,
  // cargaMaxima y las notas de Estado (notasDeEstado). Derivado: también al NPC.
  formulaMovimiento: FormulaMovimientoResuelta;
  multiplicadorCarga: MultiplicadorCarga;
  // Lo de blindaje que no depende de la tirada; el desglose contra un tipo de daño
  // (desgloseBlindaje) lo pide el modal con lo que elige el jugador, pasándole
  // la armadura natural de aquí.
  // `contencion`: la absorción de la Contención puesta (estado propio del poder), o null.
  blindaje: { tieneEscudoMelee: boolean; armaduraNatural: ArmaduraNatural; contencion: AbsorcionPropia | null };
  // Casillas con alcance del equipo, de la especie (§14.8), de las dotes (§9.3) y de los
  // aumentos (A2a: casillas de Alerta y el selector "Contra…" de las salvaciones),
  // indexadas una vez (consultaIndiceCondiciones). Las de especie, dotes y aumentos son
  // derivadas: también al NPC.
  indiceCondiciones: IndiceCondiciones;
  // Textos sin mecanizar de la especie (§14.10), de las dotes (§9.3) y de los aumentos
  // (A2a: Matriz de Red en la salvación de Voluntad) que cuelgan de una tirada: los pone conExtrasDeFicha en
  // `textosDeFicha`; cuándo se enseñan lo dice textosDeTirada (fase 4).
  textosTirada: TextoEnTirada[];
  // Efectos sobre el objetivo que la ficha cuelga de sus tiradas (dotes y la maniobra Derribo,
  // T3b): los pone conExtrasDeFicha (y prepararPoder) en `efectosObjetivoDeFicha`.
  objetivosTirada: ObjetivoEnTirada[];
  // Ventajas sin casilla de los aumentos (A2b: Red Frontoparietal en Iniciativa), con su
  // alcance: las pone conExtrasDeFicha en `Accion.ventaja`. Derivadas: también al NPC.
  ventajasFijas: VentajaFija[];
  // Fallo → fallo crítico sin casilla de la especie (Rigidez narcisista), con su alcance: lo
  // pone conExtrasDeFicha en `Accion.falloCritico`.
  fallosCriticos: FalloCriticoFijo[];
  // Lo de las dotes que no es casilla ni texto (D2b-1): bonos por tramo de distancia con
  // su alcance y críticos fijos por especialidad de arma. También los pone conExtrasDeFicha.
  // `permisos` (D2b-2): Bloquear y el estilo Sutil, que solo existen con su dote; se los
  // pasa quien genera las filas de arma (accionesDeAtaque). En modo libre igual: sin dote,
  // tampoco el NPC. `descuentos` (D2c-1): contadores que cuentan de menos (Reflejos Felinos).
  // `grados` y `alternativas` (tiradas fijas): cambios de grado sin casilla (Velocista, Gran
  // Puntería) y otra habilidad con casilla en la fila (Cazador Cazado, Vigilancia Táctica).
  // En `bonosTramo` van también los de los aumentos (`EfectosTiradaAumento.bonosTramo`).
  extrasDotes: {
    bonosTramo: BonoTramoDeDote[];
    criticos: CriticoDeDote[];
    permisos: PermisosDeDotes;
    descuentos: DescuentoDeDote[];
    grados: GradoFijoDeDote[];
    alternativas: AlternativaDeDote[];
  };
  // Lo que abaratan el equipo y las dotes de desenfundar, recargar o inyectarse (T5c,
  // rules/tipoAccion.ts): Funda Automática, Inyector Hipodérmico, Recarga Relámpago. Lo aplica
  // conExtrasDeFicha a la línea de cada fila. Derivado: también al NPC.
  rebajasTipoAccion: RebajaConFuente[];
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
  // La fatiga que se gasta ahora (td-25): con combate en curso, la de la foto (`vitalidad`); si
  // no, la de la ficha. `actual`, lo que se puede pagar (bloqueos por coste, cobros);
  // `efectiva`, menos la temporal de Proeza (umbrales, sobrecarga).
  fatigaEnJuego: { actual: number; efectiva: number };
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
  // Otras áreas (§14.9, E5), derivadas: también al NPC. El sobreesfuerzo al usar un poder (T6a:
  // las fuentes psiónicas de especie e implante con lo que retocan las dotes; lo lee usarPoder;
  // null sin fuente psiónica), las notas fijas de las filas de fármaco y las acciones sin dado
  // del rasgo (activar la visión).
  sobreesfuerzo: SobreesfuerzoDeFicha | null;
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
// `mesa`: los aliados y el turno de combate de un jugador, para contar los límites de sus
// acciones de dote (dotesAcciones.ts). Sin ella (NPC, editor), los límites son texto.
export type OpcionesFicha = {
  estados: EstadoActivo[];
  vitalidad: VitalidadActual;
  libre?: boolean;
  aprobada?: boolean;
  mesa?: MesaDeFicha | null;
};

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

// Un aporte de una pieza apagada: de qué pieza, por qué y a qué blanco iba.
export type AporteApagado = { origen: OrigenAporte; motivo: string; en: AlcanceModificador | { tipo: "desarmado" } };

// Los aportes con origen de las piezas apagadas, calculados con la ficha entera (con ellas): solo
// para el desglose. Los atributos llegan a las tiradas de los aplicados que los usan.
function aportesDePiezasApagadas(sheet: Sheet, estados: EstadoActivo[], inutilizadas: ReadonlyMap<string, string>): AporteApagado[] {
  if (inutilizadas.size === 0) return [];
  const aportes: AporteApagado[] = [];
  const pon = (origen: OrigenAporte | undefined, en: AporteApagado["en"]) => {
    const motivo = origen?.instanciaId ? inutilizadas.get(origen.instanciaId) : undefined;
    if (origen && motivo) aportes.push({ origen, motivo, en });
  };
  for (const m of [...modificadoresDeEquipo(sheet), ...modificadoresDeAumentos(sheet), ...efectosDeActivables(sheet, estados).modificadores]) {
    if (m.tipo === "tirada" || m.tipo === "anulaPenalizadores") pon(m.item, m.alcance);
    else if (m.tipo === "atributo") {
      const id = m.id;
      pon(m.item, { tipo: "aplicado", aplicados: APLICADOS.filter((a) => (a.de as readonly string[]).includes(id)).map((a) => a.id) });
    }
  }
  for (const c of condicionesDelIndice(indiceDeCondiciones(sheet, casillasDeAumentos(sheet)))) if (c.alcance) pon(c.origen, c.alcance);
  // Los bonos «Contra…» de la pieza: a la salvación entera (el selector no lleva pieza).
  for (const s of salvacionesDePiezas(sheet, efectosDeActivables(sheet, estados).salvaciones, salvacionesDeEquipo(sheet))) {
    pon(s.origen, { tipo: "tiradaId", id: s.salvacion });
  }
  for (const t of textosDeAumentos(sheet)) pon(t.origen, t.en);
  for (const v of [...ventajasFijasDeAumentos(sheet), ...efectosDeActivables(sheet, estados).ventajasFijas]) pon(v.origen, v.alcance);
  for (const b of bonosTramoDeAumentos(sheet)) pon(b.bono.origen, b.alcance);
  return aportes;
}

function condicionesDelIndice(i: IndiceCondiciones): CondicionTirada[] {
  const entradas = [
    ...[i.porTiradaId, i.porGrupo, i.porHabilidad, i.porFamiliaArma, i.porEspecialidad].flatMap((m) => [...m.values()].flat()),
    ...i.porAplicado,
    ...i.todas,
  ];
  return [...new Set(entradas.map((e) => e.condicion))];
}

export function resolverFicha(
  sheet: Sheet,
  { estados, vitalidad, libre = false, aprobada = false, mesa = null }: OpcionesFicha,
): FichaResuelta {
  // Shock, activables, inmunidades y estados con efecto (baseDeFicha, rules/baseFicha.ts): lo mismo
  // que lee el tope de curar (topesDeVida, td-12). Lo que aportan las piezas lo pone la ficha sin
  // las apagadas (`enUso`). Los requisitos de dote, las dotes y lo que es del personaje (atributos,
  // psiónica, fármacos) miran la ficha entera.
  // TODO(revisar): la fuente psiónica de un implante apagado (IRM) sigue dando acceso, y
  // prepararPoder lee la ficha entera (cargas y alcance de una Derivación Psiónica apagada).
  // Las salvaciones de `salvacionesA` (eq-29) las cambia el selector «Contra…» (casillasDeAumentos
  // con `afectacion`, conShockEnSalvaciones).
  const base = baseDeFicha(sheet, estados);
  const { especie, afectacion, enUso, inmunidades, estabilizado } = base;
  const conEfecto = base.conEfecto;
  // Lo de los activables va con origen "estado" y no entra en requisitosDotes (R3, S30).
  const activables = base.activables;
  const formulaMovimiento = formulaMovimientoDeEspecie(especie);
  const multiplicadorCarga = multiplicadorCargaDeEspecie(especie);
  const requisitosDotes = valoresDeRequisito(sheet, modificadoresDeRequisito(sheet, especie?.modificadores ?? []));
  // Lo que ponen las dotes en las tiradas (§9.3, D2a). Sin las de requisito roto (S34);
  // en modo libre (NPC del máster) sin mirar requisitos (§9.4).
  const valoresDotes = libre ? null : requisitosDotes;
  const activas = dotesActivas(sheet, valoresDotes);
  // Los bonos con umbral (D2d) miran la ficha con la especie también en el NPC.
  const dotes = efectosDeDotes(activas, valoresDotes, requisitosDotes);
  const sinTope: ModificadorConFuente[] = modificadoresDeBase(base, dotes.modificadores);
  // Tope de Agilidad de la armadura (S93): detrás de todo lo demás, para que aplicados,
  // movimiento y tiradas usen ya la Agilidad topada.
  const tope = topeAgilidadAplicado(sheet, sinTope);
  const sinUmbrales: ModificadorConFuente[] = tope ? [...sinTope, tope.modificador] : sinTope;
  // Los umbrales solo dan modificadores de tirada: no tocan los máximos de salud.
  const maximos = salud(sheet, sinUmbrales);
  // La temporal de Proeza cuenta para el umbral mientras dura la escena (sheet.ts). Vive en la
  // ficha (Combatiente no lleva temporal propia) y en combate se resta de la fatiga de la foto,
  // que es la que vale (td-25: se paga contra ella, pagarFatiga con fatigaEnJuego).
  const v =
    vitalidad.origen === "combate"
      ? { pg: vitalidad.pgActual, pgMax: vitalidad.pgMax, fatiga: vitalidad.fatigaActual - sheet.fatigaTemporal, fatigaMax: vitalidad.fatigaMax }
      : { pg: sheet.vidaActual, pgMax: maximos.vida, fatiga: fatigaEfectiva(sheet), fatigaMax: maximos.fatiga };
  const enJuego = fatigaEnJuego(sheet, vitalidad.origen === "combate" ? vitalidad : null);
  const umbrales = {
    salud: umbralSalud(v.pg, v.pgMax),
    fatiga: umbralFatiga(v.fatiga, v.fatigaMax),
  };
  const ajusteUmbrales = sumaAjustesUmbrales(
    ajusteUmbralesDeEspecie(especie),
    ajusteUmbralesDeAumentos(enUso),
    activables.ajusteUmbrales,
    ajusteUmbralesDeEstabilizado(estabilizado),
    ajusteUmbralesDeEstados(conEfecto),
  );
  // Lo que elimina por completo el umbral (Neuroprótesis 4) quita también su media velocidad y su
  // recorte de carga (td-10); las reducciones de 1 no.
  const porUmbral = movimientoPorUmbrales(
    ajusteUmbrales.salud?.elimina ? "normal" : umbrales.salud,
    ajusteUmbrales.fatiga?.elimina ? "normal" : umbrales.fatiga,
  );
  const modificadores = [
    ...sinUmbrales,
    ...modificadoresDeUmbrales(v.pg, v.pgMax, v.fatiga, v.fatigaMax, ajusteUmbrales, [
      ...reduccionesPorAplicadoDeAumentos(enUso),
      ...reduccionesDeEquipo(enUso),
    ]),
  ];

  // Media velocidad: carrera, vuelo y levitación; saltos, escalada y nado no (S26).
  const velocidad = (m: number) => velocidadConUmbrales(m, porUmbral);
  const mov = movimiento(enUso, modificadores, formulaMovimiento.formula);
  const vue = vuelo(enUso);
  // au-04: sin fuente psiónica, la psiónica comprada queda «requisito no cumplido». El NPC del
  // máster (libre) no lo mira.
  const fuentesPsionicas = fuentesPsionicasDeFicha(sheet, especie);
  const acceso = libre ? undefined : accesoDeFuentes(fuentesPsionicas);
  const psionica = nivelesDePsionica(sheet, bonosDeDisciplina(modificadores), acceso);
  const lev = levitacion(psionica.paraEfectos);
  const carga = cargaMaxima(enUso, modificadores, multiplicadorCarga.valor);
  const ajusteCoste = libre ? AJUSTE_NEUTRO : ajustesDeCoste(especie);
  const recargoArmaduras = recargoArmadurasDeEspecie(especie);

  const resuelta: FichaResuelta = {
    ficha: sheet,
    especie,
    estados,
    estadosDerivados: estadosDerivados(v.pg, v.pgMax, v.fatiga, v.fatigaMax),
    inmunidades,
    estadosConEfecto: conEfecto,
    piezasInutilizadas: afectacion.inutilizadas,
    piezasPenalizadas: afectacion.penalizadas,
    piezasConReglaPropia: afectacion.conReglaPropia,
    fichaSinApagadas: enUso,
    aportesApagados: aportesDePiezasApagadas(sheet, estados, afectacion.inutilizadas),
    modificadores,
    atributos: atributosEfectivos(sheet, modificadores),
    topeAgilidad: tope,
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
    accionesMovimiento: accionesDeMovimiento(sheet, porUmbral),
    directasMovimiento: accionesDirectasDeMovimiento(sheet, porUmbral),
    compensaManiobraVuelo: dotes.compensaManiobra,
    accionesOcultacion: ((e) => (e ? [e] : []))(accionEsconderArma(sheet)),
    ocultacion: ocultacionDeFicha(enUso, conEfecto),
    casillasMarcadas: [
      ...new Set(
        conEfecto
          .filter((e) => e.estadoId !== ESTADO_CAMUFLAJE_ID || !mallaAnulaCamuflaje(conEfecto))
          .flatMap((e) => estadoPorId(e.estadoId)?.marcaCasillas ?? []),
      ),
    ],
    vuelo: vue && { ...vue, velocidadM: velocidad(vue.velocidadM) },
    levitacion: lev && { ...lev, velocidadM: velocidad(lev.velocidadM) },
    cargaMaxima: porUmbral.reduccionCarga ? reducir(carga, porUmbral.reduccionCarga.fraccion) : carga,
    pesoEquipado: pesoEquipado(sheet, recargoArmaduras),
    recargoArmaduras,
    formulaMovimiento,
    multiplicadorCarga,
    blindaje: {
      tieneEscudoMelee: tieneEscudoMelee(sheet),
      armaduraNatural: armaduraNaturalDeEspecie(especie),
      contencion: absorcionDeContencion(conEfecto),
    },
    indiceCondiciones: indiceDeCondiciones(enUso, [
      ...casillasDeEspecie(especie),
      ...dotes.casillas,
      ...conUsosEscena(
        casillasDeAumentos(enUso, activables.salvaciones, [...salvacionesDeEspecie(especie), ...salvacionesDeEquipo(enUso)], afectacion, inmunidades),
        sheet.usosEscena,
      ),
      ...casillasDeFarmacos(sheet),
      ...casillasDePsionica(psionica.paraEfectos),
    ]),
    textosTirada: [...textosDeEspecie(especie), ...dotes.textos, ...textosDeAumentos(enUso), ...activables.textos],
    objetivosTirada: dotes.objetivos,
    ventajasFijas: [...ventajasFijasDeAumentos(enUso), ...activables.ventajasFijas],
    fallosCriticos: fallosCriticosDeEspecie(especie),
    extrasDotes: {
      bonosTramo: [...dotes.bonosTramo, ...bonosTramoDeAumentos(enUso)],
      criticos: dotes.criticos,
      permisos: dotes.permisos,
      descuentos: dotes.descuentos,
      grados: dotes.grados,
      alternativas: dotes.alternativas,
    },
    rebajasTipoAccion: [...conMarcaDeReglaPropia(rebajasTipoAccionDeEquipo(enUso), afectacion.conReglaPropia), ...dotes.rebajasTipoAccion],
    accionesDotes: accionesDeDotes(activas, { usosEscena: sheet.usosEscena, mesa }),
    poderesDotes: poderesDeDotes(activas, sheet, psionica.paraEfectos),
    fatigaEnJuego: { actual: enJuego, efectiva: v.fatiga },
    accionesAumentos: accionesDeAumentos(sheet, estados, enJuego),
    usosEscena: usosEscenaDeFicha(sheet, mesa?.aliados),
    ajusteCoste,
    ajusteCosteSubida: libre ? AJUSTE_NEUTRO : ajusteCosteDeSubida(ajusteCoste, sheet, aprobada),
    bolsaAumentos: libre ? null : bolsaResuelta(bolsaDeAumentos(especie), sheet.bolsaAumentosGastada),
    excepcionesRareza: libre ? [] : excepcionesRareza(especie),
    psionica,
    requisitosDotes,
    sobreesfuerzo: fuentesPsionicas.length > 0 ? { fuentes: fuentesPsionicas, dotes: dotes.sobreesfuerzo } : null,
    notasFarmacos: notasFarmacosDeEspecie(especie),
    accionesEspecie: accionesSinDadoDeEspecie(especie),
  };
  // Las acciones de aumento con lo que depende de la ficha (un implante apagado por el Shock):
  // la pantalla pinta sus directas tal cual.
  return { ...resuelta, accionesAumentos: aumentosHabilitados(resuelta) };
}

// `accionesAumentos` con lo que depende de la ficha (resolverFicha). Exportada para la red de
// seguridad de habilitacion-catalogo.test.ts, que la llama con piezas apagadas a la fuerza.
export function aumentosHabilitados(ficha: FichaResuelta): AccionesDeAumentos {
  const { filas, directas, informativas } = ficha.accionesAumentos;
  const conLaDeFicha = <T extends Accion | AccionDirecta>(a: T): T => conHabilitacion(a, habilitacionEnFicha(ficha, a));
  const fila = (f: FilaAumento): FilaAumento =>
    f.tipo === "tirada" ? { tipo: "tirada", accion: conLaDeFicha(f.accion) } : { tipo: "directa", accion: conLaDeFicha(f.accion) };
  return { filas: filas.map(fila), directas: directas.map(conLaDeFicha), informativas };
}

// Lo que se pinta en las listas de estados (ficha, Mesa, combate): los derivados de la vida y la
// fatiga, marcados automáticos, y los guardados con sus inmunidades (describirEstados).
// T4: el Sigilo con lo que la ocultación suma a cada sentido («14 · visual 17 · …») y el Camuflaje
// con el nivel de la pieza.
// Shock (usuario 2026-11-14): los que tocan piezas, con las de esta ficha (`piezas`), para que el
// modal del chip diga cuáles apaga o hacen funcionar peor (explicacionDeEstado).
export function estadosParaPintar(
  ficha: Pick<FichaResuelta, "estados" | "estadosDerivados" | "inmunidades"> & Partial<Pick<FichaResuelta, "ocultacion" | "ficha">>,
): EstadoActivoDescrito[] {
  const o = ficha.ocultacion ?? null;
  const sheet = ficha.ficha;
  return describirEstados(ficha.estados, ficha.estadosDerivados, ficha.inmunidades).map((e) => {
    const piezas = sheet && estadoPorId(e.estadoId)?.afectaPiezas ? piezasDeEstado(sheet, ficha.estados, e.estadoId) : null;
    const conPiezas = piezas ? { ...e, piezas } : e;
    if (e.valor !== undefined && estadoPorId(e.estadoId)?.valor?.porSentido) return { ...conPiezas, valorTexto: textoSigiloPorSentido(e.valor, o) };
    if (e.estadoId === ESTADO_CAMUFLAJE_ID && o) return { ...conPiezas, valorTexto: `nivel ${o.nivel}` };
    return conPiezas;
  });
}

// --- Lo que la ficha añade a una tirada antes de montarla ------------------------

// Las casillas con alcance (equipo, especie y dotes, del índice) y los textos de especie
// y dotes de esta tirada, sea fija de ACCIONES o generada (ataques, herramientas, Volar…). Ni la
// tirada ni la pantalla saben de dónde vienen. `modoElegido: null`: la tirada aún no se
// ha abierto, así que una casilla con alcance "modo" no tiene nada que casar (ver
// indiceDeCondiciones). De las dotes, además, los bonos por tramo y el crítico fijo de
// Crítico Mejorado (en las familias de su destino: solo ataques, ni al lanzar ni al bloquear).
// Sin nada que añadir, devuelve la misma tirada.

// Lo de las piezas afectadas por el Shock (rules/shock.ts) que cuelga de la tirada: lo leen
// conExtrasDeFicha y conExtrasDirectaDeFicha. Sin ello (tests, pantallas viejas), nada.
type PiezasDeFicha = Partial<Pick<FichaResuelta, "piezasInutilizadas" | "piezasPenalizadas" | "aportesApagados" | "modificadores">>;

export function conExtrasDeFicha(
  ficha: FichaParaHabilitar & Partial<Pick<FichaResuelta, "objetivosTirada" | "casillasMarcadas" | "rebajasTipoAccion">> & PiezasDeFicha,
  t: Accion,
): Accion {
  return conPiezasAfectadas(ficha, conCasillasDeEstados(ficha, conExtrasSinPiezas(ficha, conHabilitacion(t, habilitacionEnFicha(ficha, t)))));
}

// Las casillas que dependen de los estados puestos, sobre todas las de la tirada (las suyas y las
// del índice): las que un estado deja ya marcadas (Estado.marcaCasillas: Camuflaje → «Tengo
// cobertura», eq-26) y las que piden uno (`requiereEstado`): sin él, bloqueadas con su motivo, o
// fuera si no lo traen.
function conCasillasDeEstados(ficha: Partial<Pick<FichaResuelta, "casillasMarcadas" | "estados">>, t: Accion): Accion {
  if (!t.condiciones?.length) return t;
  const marcadas = ficha.casillasMarcadas ?? [];
  const puestos = new Set((ficha.estados ?? []).map((e) => e.estadoId));
  let cambia = false;
  const condiciones = t.condiciones.flatMap((c): CondicionTirada[] => {
    if (c.tipo !== "toggle") return [c];
    if (c.requiereEstado && !puestos.has(c.requiereEstado.estadoId)) {
      cambia = true;
      const motivo = c.requiereEstado.motivo;
      return motivo ? [{ ...c, activaPorDefecto: false, bloqueada: c.bloqueada ?? motivo }] : [];
    }
    if (!marcadas.includes(c.id) || c.activaPorDefecto) return [c];
    cambia = true;
    return [{ ...c, activaPorDefecto: true }];
  });
  return cambia ? { ...t, condiciones } : t;
}

function conExtrasSinPiezas(
  ficha: Pick<FichaResuelta, "indiceCondiciones" | "textosTirada" | "extrasDotes" | "ventajasFijas" | "fallosCriticos"> &
    Partial<Pick<FichaResuelta, "objetivosTirada" | "casillasMarcadas" | "rebajasTipoAccion">>,
  t: Accion,
): Accion {
  // T5c: el tipo de acción de desenfundar, recargar o inyectarse, ya rebajado, y su selector.
  if (t.tiposDeAccionBase?.length) t = { ...t, ...conTiposDeAccion(t, ficha.rebajasTipoAccion ?? []) };
  // T4: las casillas que un estado puesto deja ya marcadas, en conCasillasDeEstados (también las
  // del índice).
  // La tirada libre (T-007, R1): sin casillas, textos, ventajas, bonos por tramo, descuentos
  // ni crítico fijo; solo los modificadores de alcance que casen con su aplicado y habilidad.
  if (t.libre) return t;
  const ctx = contextoDe(t);
  const extra = consultaIndiceCondiciones(ficha.indiceCondiciones, ctx);
  const textos = textosDe(ficha.textosTirada, ctx, t.desarmado === true);
  const objetivos = textosDe(ficha.objetivosTirada ?? [], ctx, t.desarmado === true).map((o) => o.efecto);
  const bonosTramo = ficha.extrasDotes.bonosTramo.filter((b) => alcanzaA(b.alcance, ctx)).map((b) => b.bono);
  const familia = t.familiaArma;
  const critico = familia && t.especialidadArma
    ? ficha.extrasDotes.criticos
        .filter((c) => c.especialidad === t.especialidadArma && c.familias.includes(familia))
        .reduce<CriticoDeDote | null>((mejor, c) => (!mejor || c.margen < mejor.margen ? c : mejor), null)
    : null;
  const descuentos = ficha.extrasDotes.descuentos.filter((d) => alcanzaA(d.alcance, ctx));
  // La ventaja que ya trae la tirada manda (no se acumula).
  const ventajaFija = t.ventaja ? undefined : ficha.ventajasFijas.find((v) => alcanzaA(v.alcance, ctx));
  const ventaja = ventajaFija?.fuente;
  const falloCritico = ficha.fallosCriticos.find((f) => alcanzaA(f.alcance, ctx));
  // Cambios de grado sin casilla (Velocista, Gran Puntería): el crítico más fácil gana.
  const grados = ficha.extrasDotes.grados.filter((g) => alcanzaA(g.alcance, ctx));
  type Critico = NonNullable<Accion["criticoFijo"]>;
  const conOrigen = (c: { margen: number; fuente: string; origen?: Critico["origen"] }): Critico => ({
    margen: c.margen,
    fuente: c.fuente,
    ...(c.origen && { origen: c.origen }),
  });
  const criticoFinal = [
    ...(critico ? [conOrigen(critico)] : []),
    ...grados.flatMap((g) => (g.margen === undefined ? [] : [conOrigen({ ...g, margen: g.margen })])),
  ].reduce<Critico | null>((mejor, c) => (!mejor || c.margen < mejor.margen ? c : mejor), null);
  const gradoSube = grados.find((g) => g.subeGrado);
  const subeGradoFijo = gradoSube?.fuente;
  // Otra habilidad con casilla en la fila (Cazador Cazado), si la tirada no trae ya una y el
  // aplicado de la dote es el suyo.
  const alt = t.habilidadAlternativa
    ? undefined
    : ficha.extrasDotes.alternativas.find((a) => alcanzaA(a.alcance, ctx) && (!a.aplicado || a.aplicado === t.aplicado));
  const conApuntado = t.condiciones && selectorApuntadoDeFicha(ficha, t.condiciones);
  if (
    extra.length === 0 &&
    textos.length === 0 &&
    objetivos.length === 0 &&
    bonosTramo.length === 0 &&
    !criticoFinal &&
    descuentos.length === 0 &&
    !ventaja &&
    !falloCritico &&
    !subeGradoFijo &&
    !alt &&
    conApuntado === t.condiciones
  )
    return t;
  const condiciones = conDescuentos([...(conApuntado ?? []), ...extra], descuentos);
  return {
    ...conTextosDeFicha(t, textos),
    ...(objetivos.length > 0 && { efectosObjetivoDeFicha: [...(t.efectosObjetivoDeFicha ?? []), ...objetivos] }),
    ...((extra.length > 0 || descuentos.length > 0 || conApuntado !== t.condiciones) && { condiciones }),
    ...(bonosTramo.length > 0 && { bonosTramo: [...(t.bonosTramo ?? []), ...bonosTramo] }),
    ...(criticoFinal && { criticoFijo: criticoFinal }),
    ...(subeGradoFijo && { subeGradoFijo, ...(gradoSube?.origen && { origenSubeGrado: gradoSube.origen }) }),
    ...(alt && {
      habilidadAlternativa: {
        habilidad: alt.habilidad,
        especialidad: alt.especialidad,
        etiqueta: alt.etiqueta,
        ...(alt.origen && { origen: alt.origen }),
      },
    }),
    ...(ventaja && { ventaja, ...(ventajaFija?.origen && { origenVentaja: ventajaFija.origen }) }),
    ...(falloCritico && { falloCritico }),
  };
}

// Shock (S73, rules/shock.ts) sobre una tirada ya con lo de la ficha:
//   - Lo que la propia fila trae de una pieza apagada (casillas y ajustes de una mejora, la
//     extremidad del Brazo, textos, la rebaja de desenfundar del arma incorporada…) se quita. (Que
//     la fila de una pieza apagada, o la que se hace con ella, salga bloqueada lo decide
//     habilitacionEnFicha.)
//   - Cada pieza apagada que llegaba a la tirada (por la fila o por `aportesApagados`) deja una
//     línea a 0 en el desglose: `piezasApagadas`, que pinta montarTirada («Ojo Biónico (shock)»).
//   - Lo que la fila trae de una pieza penalizada (pl-02, usuario 2026-11-14): cada bono positivo
//     con su −N sin bajar de 0 y «<pieza> (shock)» en su línea (ajustes fijos y bonos por tramo;
//     las casillas con número, «(shock)» detrás de su etiqueta). Sus modificadores con `item`
//     ya llegan reducidos de resolverFicha.
//   - La tirada de una pieza penalizada (su `origen`: Volar, disparar el arma de energía…) lleva
//     el −N al usarla: un ajuste fijo «<pieza> (shock)».
type PiezasDeTirada = PiezasDeFicha & Partial<Pick<FichaResuelta, "rebajasTipoAccion">>;

export function conPiezasAfectadas(ficha: PiezasDeTirada, t: Accion): Accion {
  const inutilizadas = ficha.piezasInutilizadas;
  const penalizadas = ficha.piezasPenalizadas;
  if (!inutilizadas?.size && !penalizadas?.size) return t;
  const apagadas = new Map<string, { origen: OrigenAporte; motivo: string }>();
  const motivoDe = (o: OrigenAporte | undefined) => (o?.instanciaId ? inutilizadas?.get(o.instanciaId) : undefined);
  // true = se queda; si es de una pieza apagada, la apunta y se quita.
  const vale = (o: OrigenAporte | undefined): boolean => {
    const motivo = motivoDe(o);
    if (!o || !motivo) return true;
    apagadas.set(o.instanciaId!, { origen: o, motivo });
    return false;
  };
  const filtra = <T extends { origen?: OrigenAporte }>(xs: T[] | undefined): T[] | undefined => {
    if (!xs) return xs;
    const quedan = xs.filter((x) => vale(x.origen));
    return quedan.length === xs.length ? xs : quedan;
  };
  const propia = motivoDe(t.origen);
  if (propia) vale(t.origen);
  // Solo los campos que cambian, para no dejar claves a undefined en la tirada.
  const cambia = <K extends keyof Accion>(k: K, v: Accion[K]): Partial<Accion> => (v === t[k] ? {} : { [k]: v });
  const unico = <T extends { origen?: OrigenAporte }>(x: T | undefined) => (x && vale(x.origen) ? x : undefined);
  // La rebaja de una pieza apagada (desenfundar gratis el arma incorporada en el Brazo) fuera, y
  // los tipos de acción vueltos a resolver sin ella.
  const conRebajas = (() => {
    if (!t.tiposDeAccionBase?.length) return {};
    const base = t.tiposDeAccionBase.map((b) => (b.rebajas ? { ...b, rebajas: filtra(b.rebajas) } : b));
    if (base.every((b, i) => b.rebajas === t.tiposDeAccionBase![i].rebajas)) return {};
    const r = conTiposDeAccion({ tiposDeAccionBase: base, condiciones: t.condiciones }, ficha.rebajasTipoAccion ?? []);
    return { tiposDeAccionBase: base, ...r };
  })();
  const t0: Accion = { ...t, ...conRebajas };
  const sin: Accion = {
    ...t0,
    ...cambia("condiciones", filtra(t0.condiciones)),
    ...cambia("ajustesFijos", filtra(t.ajustesFijos)),
    ...cambia("bonosTramo", filtra(t.bonosTramo)),
    ...cambia("efectos", filtra(t.efectos)),
    ...cambia("efectosObjetivo", filtra(t.efectosObjetivo)),
    ...cambia("efectosObjetivoDeFicha", filtra(t.efectosObjetivoDeFicha)),
    ...cambia("textosDeFicha", filtra(t.textosDeFicha)),
    ...cambia("extremidad", unico(t.extremidad)),
    ...cambia("ignoraBlindaje", unico(t.ignoraBlindaje)),
    ...cambia("criticoFijo", unico(t.criticoFijo)),
    ...cambia("falloCritico", unico(t.falloCritico)),
    ...cambia("habilidadAlternativa", unico(t.habilidadAlternativa)),
    ...(t.ventaja && !vale(t.origenVentaja) && { ventaja: undefined, origenVentaja: undefined }),
    ...(t.subeGradoFijo && !vale(t.origenSubeGrado) && { subeGradoFijo: undefined, origenSubeGrado: undefined }),
  };
  const ctx = contextoDe(sin);
  const aplicadosDeTirada = aplicadosPosibles(sin);
  const llega = (en: AporteApagado["en"]) =>
    en.tipo === "desarmado" ? sin.desarmado === true : en.tipo === "aplicado" ? en.aplicados.some((a) => aplicadosDeTirada.includes(a)) : alcanzaA(en, ctx);
  if (!t.libre) {
    for (const a of ficha.aportesApagados ?? []) if (llega(a.en) && !apagadas.has(a.origen.instanciaId!)) apagadas.set(a.origen.instanciaId!, a);
  }
  const conApagadas: Accion = { ...sin, ...(apagadas.size > 0 && { piezasApagadas: [...apagadas.values()] }) };
  return penalizadas?.size ? conPenalizadas(conApagadas, penalizadas) : conApagadas;
}

// Lo de las piezas penalizadas sobre la tirada (ver conPiezasAfectadas).
function conPenalizadas(t: Accion, penalizadas: ReadonlyMap<string, PiezaPenalizada>): Accion {
  const de = (o: OrigenAporte | undefined) => (o?.instanciaId ? penalizadas.get(o.instanciaId) : undefined);
  const reduce = <T extends { origen?: OrigenAporte }>(xs: T[] | undefined, f: (x: T, p: PiezaPenalizada) => T): T[] | undefined => {
    if (!xs?.some((x) => de(x.origen))) return xs;
    return xs.map((x) => {
      const p = de(x.origen);
      return p ? f(x, p) : x;
    });
  };
  const ajustesFijos = reduce(t.ajustesFijos, (a, p) => (a.valor > 0 ? { ...a, valor: bonoConShock(a.valor, p.valor), fuente: etiquetaShock(p.origen.label) } : a));
  const bonosTramo = reduce(t.bonosTramo, (b, p) => {
    const porTramo = Object.fromEntries(Object.entries(b.porTramo).map(([k, v]) => [k, v === undefined ? v : bonoConShock(v, p.valor)]));
    return Object.values(b.porTramo).some((v) => (v ?? 0) > 0) ? { ...b, porTramo, fuente: etiquetaShock(p.origen.label) } : b;
  });
  const condiciones = reduce(t.condiciones, (c, p): CondicionTirada => {
    // La casilla ya suele nombrar su pieza («… · Ojo Biónico 3»): entonces solo «(shock)» detrás.
    const etiqueta = c.etiqueta.includes(p.origen.label) ? `${c.etiqueta} ${MARCA_SHOCK}` : `${c.etiqueta} · ${etiquetaShock(p.origen.label)}`;
    if (c.tipo === "toggle") {
      if (c.valorActivo <= 0 && (c.valorInactivo ?? 0) <= 0) return c;
      return {
        ...c,
        etiqueta,
        valorActivo: bonoConShock(c.valorActivo, p.valor),
        ...(c.valorInactivo !== undefined && { valorInactivo: bonoConShock(c.valorInactivo, p.valor) }),
      };
    }
    if (c.tipo === "opcion") {
      if (!c.opciones.some((o) => o.valor > 0)) return c;
      return { ...c, etiqueta, opciones: c.opciones.map((o) => (o.valor > 0 ? { ...o, valor: bonoConShock(o.valor, p.valor), partes: undefined } : o)) };
    }
    return c;
  });
  const alt = t.habilidadAlternativa;
  const pAlt = de(alt?.origen);
  const habilidadAlternativa =
    alt?.ajuste && pAlt && alt.ajuste.valor > 0 ? { ...alt, ajuste: { ...alt.ajuste, valor: bonoConShock(alt.ajuste.valor, pAlt.valor), fuente: etiquetaShock(pAlt.origen.label) } } : alt;
  // Al usarla: −N a la tirada cuya pieza es ella.
  const usada = de(t.origen);
  const uso = usada ? [{ valor: -usada.valor, fuente: etiquetaShock(usada.origen.label), origen: usada.estado }] : [];
  // Fracaso del Shock sobre los implantes: con la pieza (la de la fila o la extremidad con la que
  // se hace siempre) no hay modos «Compleja».
  const sinComplejas =
    sinComplejasNiReacciones(penalizadas, t.origen?.instanciaId) ?? sinComplejasNiReacciones(penalizadas, t.extremidad?.origen?.instanciaId);
  const conPenalizacion: Accion = {
    ...t,
    ...(ajustesFijos !== t.ajustesFijos || uso.length > 0 ? { ajustesFijos: [...(ajustesFijos ?? []), ...uso] } : {}),
    ...(bonosTramo !== t.bonosTramo && { bonosTramo }),
    ...(condiciones !== t.condiciones && { condiciones }),
    ...(habilidadAlternativa !== alt && { habilidadAlternativa }),
  };
  return sinComplejas ? sinModosComplejos(conPenalizacion) : conPenalizacion;
}

type FichaParaHabilitar = Pick<
  FichaResuelta,
  "ficha" | "modificadores" | "indiceCondiciones" | "textosTirada" | "extrasDotes" | "ventajasFijas" | "fallosCriticos"
> &
  Partial<Pick<FichaResuelta, "piezasInutilizadas" | "piezasPenalizadas" | "estados">>;

// Lo que depende de la ficha en la habilitación de una hoja (fase 6 de docs/aportes/plan.md),
// sin lo que la hoja ya trae de quien la genera: eso lo junta conHabilitacion. Lo llaman
// conExtrasDeFicha y conExtrasDirectaDeFicha, por donde pasa toda hoja antes de pintarse,
// resolverFicha para las acciones de aumento y bloqueoDeAccionAumento (el servidor). Un
// productor nuevo que dependa de la ficha se añade aquí, en el orden de prioridad de su motivo:
//   1. La pieza que da la hoja (su `origen.instanciaId`) está apagada (S73, piezasInutilizadas):
//      bloqueada, «Apagada por <estado>.». Vale para cualquier hoja de pieza: arma, mejora,
//      subsistema, herramienta, movimiento, implante (sus acciones y tiradas). Y la que se hace
//      siempre con la extremidad de una pieza apagada (`extremidad.origen`: el arma incorporada
//      en el Brazo Biónico): «Apagada por <estado> (<pieza>).».
//   1b. La pieza (o esa extremidad) está en fracaso del Shock del cuerpo y la hoja es compleja o
//      reacción (esComplejaOReaccion; fuente aumentos.md «Implantes», sync Drive 2026-11-14):
//      bloqueada, «Shock (fracaso): sin acciones complejas ni reacciones con <pieza>.».
//   2. S99: Rastreo y compañía sin su especialidad ni nada que les enganche, ocultas.
export function habilitacionEnFicha(ficha: FichaParaHabilitar, hoja: Accion | AccionDirecta): Habilitacion {
  const pieza = hoja.origen?.instanciaId;
  const apagada = pieza ? ficha.piezasInutilizadas?.get(pieza) : undefined;
  // La hoja se hace siempre con una extremidad de otra pieza (el arma incorporada en el Brazo
  // Biónico, A6b): si esa pieza está apagada, no se puede (usuario 2026-11-14).
  const conExtremidad = "extremidad" in hoja ? hoja.extremidad?.origen : undefined;
  const extremidadApagada = conExtremidad?.instanciaId ? ficha.piezasInutilizadas?.get(conExtremidad.instanciaId) : undefined;
  const sinComplejas =
    sinComplejasNiReacciones(ficha.piezasPenalizadas, pieza) ?? sinComplejasNiReacciones(ficha.piezasPenalizadas, conExtremidad?.instanciaId);
  return juntarHabilitacion(
    apagada ? bloqueadaPor(motivoApagada(apagada), "duro") : null,
    extremidadApagada ? bloqueadaPor(motivoApagada(extremidadApagada, conExtremidad!.label), "duro") : null,
    sinComplejas && esComplejaOReaccion(hoja) ? bloqueadaPor(motivoSinComplejasNiReacciones(sinComplejas), "duro") : null,
    "soloConEspecialidad" in hoja && hoja.soloConEspecialidad && !enganchaTiradaFija(ficha, hoja) ? SIN_ESPECIALIDAD : null,
    "requiereEstado" in hoja && hoja.requiereEstado && !ficha.estados?.some((e) => e.estadoId === hoja.requiereEstado!.estadoId)
      ? bloqueadaPor(hoja.requiereEstado.motivo, "duro")
      : null,
  );
}

// Una pieza apagada por el Shock (S73) con recurso propio (colchón de la Malla, cargas de Movilidad
// Aérea, batería de un arma de energía): el motivo, para que Recursos pinte su barra apagada y sin
// ajustes. null si funciona.
export function motivoPiezaApagada(ficha: Pick<FichaResuelta, "piezasInutilizadas">, instanciaId: string): string | null {
  const motivo = ficha.piezasInutilizadas.get(instanciaId);
  return motivo ? motivoApagada(motivo) : null;
}

// Lo que comprueba el servidor antes de usar una acción de aumento (usarAccionAumentoAction): lo
// que depende de la ficha (un implante apagado por el Shock). La fatiga la mira
// usoDeAccionAumento con la fatiga en juego. null si se puede (o no existe: lo dice él).
export function bloqueoDeAccionAumento(ficha: FichaResuelta, accionId: string): string | null {
  const accion = ficha.accionesAumentos.directas.find((a) => a.id === accionId);
  return accion ? motivoDeBloqueo(habilitacionEnFicha(ficha, accion)) : null;
}

const SIN_ESPECIALIDAD = ocultaPor("Sin su especialidad ni nada que le enganche (S99).", "duro");

// Las tiradas fijas de `soloConEspecialidad` (Rastreo, Subsistencia, Trato con Animales,
// Investigación; decisión del usuario 2026-10-26, S99) solo se pintan si la ficha tiene alguna
// de sus especialidades o si algo de capa 1 le engancha algo a ella: una casilla, texto, bono,
// ventaja o cambio de grado con alcance por su id o por su especialidad. Lo general (alcance por
// grupo, habilidad, aplicado o "todas") no cuenta: no es de esa fila. El NPC, igual, con sus
// especialidades y lo derivado de su especie, dotes y aumentos.
function enganchaTiradaFija(ficha: FichaParaHabilitar, t: Accion): boolean {
  const especialidades = t.especialidadesAccion ?? [];
  const habilidad = t.habilidad;
  if (habilidad && especialidades.some((e) => tieneEspecialidad(ficha.ficha, habilidad, e))) return true;
  const apunta = (a: AlcanceModificador) =>
    (a.tipo === "tiradaId" && a.id === t.id) || (a.tipo === "especialidad" && a.especialidades.some((e) => especialidades.includes(e)));
  const x = ficha.extrasDotes;
  return (
    (ficha.indiceCondiciones.porTiradaId.get(t.id)?.length ?? 0) > 0 ||
    especialidades.some((e) => (ficha.indiceCondiciones.porEspecialidad.get(e)?.length ?? 0) > 0) ||
    ficha.textosTirada.some((txt) => txt.en.tipo === "tiradaId" && txt.en.id === t.id) ||
    ficha.modificadores.some((m) => m.tipo === "tirada" && apunta(m.alcance)) ||
    [...x.bonosTramo, ...x.grados, ...x.alternativas, ...x.descuentos, ...ficha.ventajasFijas, ...ficha.fallosCriticos].some((e) =>
      apunta(e.alcance),
    )
  );
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
  // El selector cambiado es de Gran Puntería (aporte sobre aporte, plan de aportes §1.8.3).
  return condiciones.map((c, j) => (j === i ? { ...condicionApuntado(gp.fuente), ...(gp.origen && { origen: gp.origen }) } : c));
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
      descuento: {
        unidades: propios.reduce((t, d) => t + d.unidades, 0),
        fuente: propios.map((d) => d.fuente).join(", "),
        ...(propios.some((d) => d.origen) && { origenes: propios.flatMap((d) => (d.origen ? [d.origen] : [])) }),
      },
    };
  });
}

// Los tipos de acción de la fila resueltos con las rebajas de la ficha (T5c), y sus selectores
// (los de antes fuera: se puede volver a pasar por aquí).
function conTiposDeAccion(
  t: Pick<Accion, "tiposDeAccionBase" | "condiciones">,
  rebajas: readonly RebajaConFuente[],
): Pick<Accion, "tiposDeAccion" | "condiciones"> {
  const tipos = resolverTiposDeAccion(t.tiposDeAccionBase, rebajas);
  const ids = new Set(tipos.map((x) => idSelectorTipoAccion(x.accion)));
  const selectores = tipos.flatMap((x) => selectorTipoAccion(x) ?? []);
  const sinViejos = (t.condiciones ?? []).filter((c) => !ids.has(c.id));
  return {
    tiposDeAccion: tipos,
    ...((selectores.length > 0 || sinViejos.length !== (t.condiciones ?? []).length) && { condiciones: [...sinViejos, ...selectores] }),
  };
}

// Lo mismo para una acción sin dado ("Levantar [escudo]"): solo textos, todos a su nota
// (no hay crítico). El tipo de acción (T5c: Inyectarse en «Usar [fármaco]»), a la nota y su
// selector a las condiciones. Sin nada que añadir, devuelve la misma acción.
export function conExtrasDirectaDeFicha(
  ficha: FichaParaHabilitar & Partial<Pick<FichaResuelta, "rebajasTipoAccion">>,
  d: AccionDirecta,
): AccionDirecta {
  // Shock (rules/shock.ts): la de una pieza apagada sale bloqueada por habilitacionEnFicha. Sin
  // dado no hay tirada a la que restar el −N de una penalizada.
  d = conHabilitacion(d, habilitacionEnFicha(ficha, d));
  const textos = textosDe(ficha.textosTirada, contextoDe({ ...d, habilidad: null }), false);
  const tipos = d.tiposDeAccionBase?.length ? conTiposDeAccion(d, ficha.rebajasTipoAccion ?? []) : null;
  if (textos.length === 0 && !tipos) return d;
  const lineasTipo = (tipos?.tiposDeAccion ?? []).map((x) =>
    x.fuentes.length > 0 ? `${textoTipoAccion(x)} (${x.fuentes.map((f) => f.fuente).join(", ")})` : textoTipoAccion(x),
  );
  return {
    ...d,
    nota: junta(d.nota, [...lineasTipo, ...textosSinDado(textos)]),
    ...(tipos?.condiciones && { condiciones: tipos.condiciones }),
  };
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
