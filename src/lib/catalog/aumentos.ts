// Catálogo de aumentos (docs/sistema.md §11): 26 operaciones genéticas y los 6
// implantes cerrados. Los 5 implantes "en proceso" de docs/aumentos.md no entran
// hasta que Murillo los cierre.
//
// Escrito a mano a partir de docs/modelado-aumentos.json (ids, rareza, coste,
// requisitos, niveles, variantes, elección y MotorMetadata) y de la prosa literal de
// docs/aumentos.md (`detalle`, sin las marcas *(sic)*). `resumen` es redacción nuestra
// para la card cerrada. aumentos.test.ts cruza ids, costes, rarezas, requisitos y
// niveles contra el JSON: si el modelado cambia, el test lo dice.
//
// Tanda A0 (docs/propuesta-aumentos.md §2): se compran, se ven y se pagan.
// Tanda A1: los +1 permanentes a atributos básicos (`modificadores` con tipo
// "atributo", origen "aumento" vía modificadoresDeAumentos en rules/aumentos.ts), la
// vida de Hipertrofia (Modificador "multiplicadorVida", que lee salud()) y las rebajas
// de coste de habilidad (`rebajaCosteHabilidad`, solo con la ficha aprobada:
// ajusteCosteConAumentos). Esos efectos llevan su MotorMetadata en "construido"; el
// resto sigue "pendiente" o "bloqueado" (salvo las frases puramente narrativas, que
// ya se ven en la card) hasta A2-A7.
// Tanda A2a: `salvaciones` (selector "Contra…"), `casillas` (con alcance), `textos`,
// `notaAlertaPasiva` y `armaduraNatural` en la operación o en la opción de Introgresión, y
// `salvaciones`/`condiciones`/`modificadores` por nivel en los implantes (el Ojo, con
// `noApila`). Los lee rules/aumentosTiradas.ts.
// Tanda A2b: casillas con alcance "aplicado" (Prefrontal, Mielinización con `ahorroFatiga`,
// Sincronización) o "todas" (Callosa), `casillasOcultasCon` (Prefrontal con Callosa),
// `ventajasFijas` (Red Frontoparietal en Iniciativa) y textos por grupo o por aplicado (Asa,
// Consciencia, Automatismo, Red Frontoparietal). "Una vez por escena" va en la nota de la
// casilla hasta A4.
//
// Tanda A4a: `usoPorEscena` en las casillas de una vez por escena (Mielinización, Proyección,
// Matriz de Red; usosEscena.ts), `acciones` (sin dado, con su fatiga y, si toca, quitar o bajar
// un estado o +1 de vida: aumentosAcciones.ts) en la operación o en el nivel del implante, y la
// `defensaIntrusion` del MQE por nivel. La acción combinada de Red Frontoparietal deja de ser
// texto en las pruebas mentales.
//
// Tanda A4b: acciones con dado (`tirada` en la acción: el barrido de Percepción
// Electromagnética, que va en la opción de Introgresión; Incorporar arma del Brazo; Tempestad
// Nanobótica del Enjambre 4, con daño fijo) y el `blindajeReactivo` del Enjambre 3 (Densificar,
// casilla en "Bloquear daño": blindaje.ts).
//
// Tanda A5a: activables. La acción de activar (`efecto: "activar"`, aumentosAcciones.ts) pone un
// estado propio (catalog/estados.ts, ESTADOS_DE_AUMENTO); `activo` (en la operación o en el
// nivel del implante: vale el del nivel más alto) dice qué hace mientras está puesto
// (aumentosActivables.ts). Neuroprótesis 1-2 y Proyección; la Neuroprótesis 3-4 es A5b.
//
// Tanda A6a: `extremidad` del Brazo Biónico (en el nivel 1-2 y en cada modelo del 3-4): Fuerza
// y Agilidad propias con su tope, blindaje, bloqueo y letal en pelea (rules/brazoBionico.ts).
//
// Tanda A7: `inmuneA` (en la operación o en el nivel del implante): estados del catálogo que no
// se le aplican (Ojo Biónico 2-4 contra la ceguera; Regeneración Tisular contra la hemorragia).
// Lo lee rules/inmunidades.ts.
//
// Tanda A3: `reducePenalizador` (Estabilización Autonómica en heridas y fatiga, Neurogénesis
// en fatiga solo con sus aplicados, Matriz Ósea en carga como nota) y las casillas de
// cobertura (Foveo, Ojo 2-4) en ataques a distancia y Buscar/percibir, sin apilar entre sí.
//
// MotorMetadata: copiado del modelado. Donde el modelado dice `mecanismo: "hueco"`
// (aún no hay mecanismo en el motor), se pone el mecanismo más cercano por tipo
// (habilitador → gate_instalacion; acción → accion_equipo; extremidad del Brazo →
// sustitucion_aplicado; ventaja en un grupo → siempre_activo; el resto, que alimenta
// un derivado o un atributo → suma_derivado) y se conservan estado y bloqueoPor.
// TODO(revisar): esa traducción de "hueco" es provisional; cada tanda A1-A7 debe
// confirmar el mecanismo real al construir su capa. A1 ya lo resolvió para los
// efectos `atributo` (suma_derivado: Modificador "atributo"), `coste_habilidad`
// (sin acción: ajuste de coste de progresión) y `formula_salud` (suma_derivado:
// Modificador "multiplicadorVida" sobre la vida).
import type { AplicadoId } from "../rules/atributos";
import type { HabilidadId } from "../rules/habilidades";
import type { CondicionTirada } from "../rules/condiciones";
import type { Modificador } from "../rules/modificadores";
import type { MotorMetadata } from "../rules/motor";
import type { BlindajeReactivo, EfectoSalvacion, EfectosTiradaAumento } from "../rules/aumentosTiradas";
import type { AccionAumentoCatalogo, DefensaIntrusion } from "../rules/aumentosAcciones";
import type { ActivoAumento } from "../rules/aumentosActivables";
import type { ExtremidadBionica } from "../rules/brazoBionico";
import type { NivelModulo, Rareza } from "./equipo";
import { VISION_AUMENTADA } from "./mejorasArma";
import { NO_APILA_COBERTURA, NOTA_COBERTURA } from "./cobertura";

// Cobertura (A3): constantes compartidas con el Visor Nocturno 2 (catalog/cobertura.ts).

// Puntos menos de penalizador (A3, R8 de §11.3). `heridas` y `fatiga` se suman al ajuste de
// umbrales de la especie (ajusteUmbralesDeAumentos); con `aplicados`, solo en esas tiradas, como
// compensación aparte (reduccionesPorAplicadoDeAumentos). `carga`: solo nota, porque los
// penalizadores por carga no están mecanizados (notasCargaDeAumentos).
export type ReduccionPenalizadorAumento = { de: "heridas" | "fatiga" | "carga"; valor: number; aplicados?: AplicadoId[] };

// Elección al comprar (Introgresión: el sentido). Cada opción con su texto y, desde A2a,
// lo que ese sentido pone en las tiradas (EfectosTiradaAumento). A4b: sus acciones propias
// (Percepción Electromagnética: el barrido).
export type OpcionAumento = { id: string; label: string; detalle: string[]; acciones?: AccionAumentoCatalogo[] } & EfectosTiradaAumento;
export type EleccionAumento = { id: string; label: string; opciones: OpcionAumento[] };

export type OperacionGenetica = {
  familia: "operacionGenetica";
  id: string;
  label: string;
  resumen: string;
  detalle: string[];
  rareza: Rareza;
  coste: number;
  // Ids de otras operaciones; hacen falta todas (§11.1).
  requisitos: string[];
  eleccion: EleccionAumento | null;
  // Solo Introgresión: se vuelve a comprar con otra elección, nunca la misma.
  repetible: boolean;
  // Neurogénesis y Engramática (A1): −valor al coste de cada nivel de esas habilidades
  // (mínimo 1), solo al subir con XP con la ficha aprobada (usuario, 2026-10-22).
  rebajaCosteHabilidad?: { habilidades: HabilidadId[] | "todas"; valor: number };
  reducePenalizador?: ReduccionPenalizadorAumento[];
  // A4a: acciones propias, sin dado.
  acciones?: AccionAumentoCatalogo[];
  // A5a: lo que hace mientras su estado propio está puesto (Proyección).
  activo?: ActivoAumento;
  // A7: ids de estados del catálogo a los que es inmune mientras funciona (rules/inmunidades.ts).
  inmuneA?: string[];
  // Solo efectos permanentes (A1: +1 a atributos básicos y multiplicadorVida).
  modificadores: Modificador[];
  motor: MotorMetadata[];
} & EfectosTiradaAumento;

// Modelos del Brazo Biónico en los niveles 3 y 4: se elige al comprar ese nivel. A6a: la
// Fuerza, la Agilidad y el blindaje del modelo (`extremidad`, rules/brazoBionico.ts).
export type VarianteImplante = { id: string; label: string; detalle: string[]; extremidad?: ExtremidadBionica };
// A2a: `modificadores` lleva los bonos siempre activos (Ojo a distancia y a la Alerta
// pasiva), `condiciones` las casillas con alcance y `salvaciones` lo que entra en el
// selector "Contra…" (rules/aumentosTiradas.ts). Los niveles se acumulan; la misma clave
// en un nivel alto sustituye a la del bajo.
// A4a: `acciones` (se acumulan por id como las casillas) y `defensaIntrusion` (MQE: vale la
// del nivel más alto). A4b: `blindajeReactivo` (Densificar: vale el del nivel más alto) y
// acciones con dado (`tirada`).
export type NivelImplante = NivelModulo & {
  variantes?: VarianteImplante[];
  salvaciones?: EfectoSalvacion[];
  acciones?: AccionAumentoCatalogo[];
  defensaIntrusion?: DefensaIntrusion;
  blindajeReactivo?: BlindajeReactivo;
  // A5a: lo que hace mientras su estado propio está puesto (Neuroprótesis). Cada nivel que lo
  // trae lo trae entero: vale el del nivel más alto.
  activo?: ActivoAumento;
  // A5b: otros activables del nivel, cada uno con su estado propio (Neuroprótesis 4). Por
  // estado, vale el del nivel más alto.
  activos?: ActivoAumento[];
  // A6a: el Brazo Biónico sin modelo (niveles 1 y 2): Fuerza y Agilidad propias sobre la base
  // permanente del usuario, con su tope, y el blindaje para el golpe bloqueado. En los niveles
  // 3 y 4 lo trae cada modelo (`variantes`).
  extremidad?: ExtremidadBionica;
  // A7: ids de estados del catálogo a los que es inmune desde este nivel (se acumula: el 3
  // hereda la del 2).
  inmuneA?: string[];
};

export type Implante = {
  familia: "implante";
  id: string;
  label: string;
  resumen: string;
  descripcion: string;
  // Reglas generales de los implantes (docs/aumentos.md): marcas para la ficha.
  sabotaje: boolean;
  // Lo afecta el Shock (§11.3, tercera ronda): todos los implantes hoy.
  electronico: boolean;
  // null: el documento no dice si se puede extraer (pregunta 20).
  extraible: boolean | null;
  niveles: NivelImplante[];
};

export type Aumento = OperacionGenetica | Implante;

// Neuroprótesis Simpática (A5a): lo que hace mientras está activa (niveles 1 y 2; el 2 añade la
// mejora) y su acción de activar. No reduce su propio −1 a las salvaciones: va en el selector
// "Contra…", no es un estado.
const ACTIVO_NEUROPROTESIS: ActivoAumento = {
  estadoId: "aum_neuroprotesis",
  atributos: { fuerza: 1, agilidad: 1, percepcion: 1 },
  reducePenalizadores: 1,
  salvaciones: [{ contra: ["enfermedad", "radiacion", "toxinas", "venenos"], bono: -1 }],
};

function activarNeuroprotesis(conEleccion: boolean, segundaReaccion = false): AccionAumentoCatalogo {
  return {
    id: "aumentos_activar_neuroprotesis",
    label: "Activar Neuroprótesis",
    economia: "Acción gratuita en tu turno o reacción",
    costeFatiga: 2,
    nota:
      (conEleccion ? "+2 a Fuerza o Agilidad (eliges al activar) y +1 a los otros dos de Fuerza, Agilidad y Percepción" : "+1 a Fuerza, Agilidad y Percepción") +
      " (no cuenta para requisitos de dote), −1 a cada penalizador por estado, heridas y fatiga (sin pasar de 0) y −1 a las salvaciones de Fortaleza contra enfermedad, radiación, toxinas y venenos. Dura 3 rondas, que solo corren en combate: fuera de él, desactívala a mano." +
      (segundaReaccion ? " Mientras dura, segunda reacción por ronda (nivel 3)." : ""),
    efecto: {
      tipo: "activar",
      estadoId: "aum_neuroprotesis",
      duracion: { tipo: "rondas", rondas: 3 },
      ...(conEleccion && {
        eleccion: {
          etiqueta: "El +2 va a",
          opciones: [
            { id: "fuerza", label: "Fuerza" },
            { id: "agilidad", label: "Agilidad" },
          ],
        },
      }),
    },
  };
}


// A5b: Neuroprótesis 3, segunda reacción mientras está activa (texto en Defensa, como las de
// A2b) sobre lo de los niveles 1-2.
const ACTIVO_NEUROPROTESIS_3: ActivoAumento = {
  ...ACTIVO_NEUROPROTESIS,
  mejora: { atributos: ["fuerza", "agilidad"], valor: 2 },
  textos: [{ en: { tipo: "grupo", grupo: "Defensa" }, texto: "Segunda reacción por ronda mientras la Neuroprótesis está activa." }],
};

// A5b: Neuroprótesis 4, la acción adicional pagada a 3. Estado propio de 1 ronda que convive
// con el de la activa: +2 a los tres sustituyendo al +1/+2 y heridas y fatiga a 0.
const ACTIVO_NEUROPROTESIS_4: ActivoAumento = {
  estadoId: "aum_neuroprotesis_4",
  atributos: { fuerza: 2, agilidad: 2, percepcion: 2 },
  sustituyeAtributosDe: "aum_neuroprotesis",
  eliminaPenalizadoresUmbrales: true,
};

// A5b: la acción simple adicional del nivel 3 (2 de fatiga; 3 si ya se usó desde el último
// descanso, casilla del modal). No pide tener la Neuroprótesis activada, solo el implante
// (el sabotaje y los descansos no los lleva la app). Con el nivel 4, pagar 3 pone su estado.
function accionAdicionalNeuroprotesis(nivel4: boolean): AccionAumentoCatalogo {
  return {
    id: "aumentos_accion_simple_adicional",
    label: "Acción simple adicional",
    economia: "En tu turno, una vez",
    costeFatiga: 2,
    nota:
      "Ganas una acción simple más este turno. No hace falta tener la Neuroprótesis activada, solo que el implante no esté saboteado ni apagado. Vuelve a usarla antes de un descanso breve o largo y cuesta 3 (marca la casilla; la app no lleva los descansos)." +
      (nivel4
        ? " Nivel 4: pagando 3, durante esta ronda +2 a Fuerza, Agilidad y Percepción (sustituye al +1/+2 de la activa) y sin penalizadores por heridas ni fatiga; esa parte no se puede volver a usar hasta un descanso breve o largo."
        : ""),
    efecto: {
      tipo: "accionAdicional",
      repetida: {
        costeFatiga: 3,
        ...(nivel4 && { activar: { estadoId: "aum_neuroprotesis_4", duracion: { tipo: "rondas", rondas: 1 } } }),
      },
    },
  };
}

export const OPERACIONES_GENETICAS: OperacionGenetica[] = [
  {
    familia: "operacionGenetica",
    id: "aum_mielinizacion_central",
    label: "Mielinización Central",
    resumen: "+1 Inteligencia. Una vez por escena, ahorra 1 de fatiga en una prueba de perspicacia, voluntad o expresión.",
    detalle: [
      "El personaje aumenta en 1 su puntuación en el atributo de Inteligencia.",
      "Una vez por escena puedes omitir el gasto de un punto de fatiga para una prueba que utilicen perspicacia, voluntad o expresión. Se puede combinar este beneficio con el gasto de fatiga de aumentos que influyan en el empleo de estos atributos.",
    ],
    rareza: "Poco Habitual",
    coste: 30000,
    requisitos: [],
    eleccion: null,
    repetible: false,
    modificadores: [{ tipo: "atributo", id: "inteligencia", valor: 1 }],
    // A2b: casilla de ahorro, que resta 1 al gasto de fatiga de la tirada (el de las casillas
    // de pago y, en un poder, el del poder), sin bajar de 0. Una vez por escena (A4a).
    casillas: [
      {
        id: "aum_mielinizacion_ahorro",
        tipo: "toggle",
        etiqueta: "Ahorro de fatiga",
        alcance: { tipo: "aplicado", aplicados: ["perspicacia", "voluntad", "expresion"] },
        valorActivo: 0,
        ahorroFatiga: 1,
        usoPorEscena: true,
        nota: "Una vez por escena: omites 1 punto del gasto de fatiga de esta prueba, aunque el gasto combinado sea mayor.",
      },
    ],
    motor: [
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "aplicado:perspicacia|voluntad|expresion" }, mecanismo: "eleccion_jugador", estado: "construido" },
    ],
  },
  {
    familia: "operacionGenetica",
    id: "aum_neurogenesis_hipocampal",
    label: "Neurogénesis Hipocampal",
    resumen: "+1 Inteligencia. −1 al penalizador por fatiga en perspicacia, voluntad y expresión; Biociencia, Cultura y Tecnociencia cuestan 1 menos.",
    detalle: [
      "El personaje aumenta en 1 su puntuación en el atributo de Inteligencia.",
      "El personaje reduce en 1 los penalizadores por fatiga cuando vaya a realizar pruebas que utilicen perspicacia, voluntad o expresión.",
      "Reduce en 1 (gasto mínimo 1) el coste para aumentar las habilidades de Biociencia, Cultura y Tecnociencia.",
    ],
    rareza: "Poco Habitual",
    coste: 45000,
    requisitos: ["aum_mielinizacion_central"],
    eleccion: null,
    repetible: false,
    rebajaCosteHabilidad: { habilidades: ["biociencia", "cultura", "tecnociencia"], valor: 1 },
    // A3: compensación automática (+1) en las pruebas mentales mientras la fatiga penalice,
    // sin dejar el penalizador por encima de 0 (usuario, 2026-10-22).
    reducePenalizador: [{ de: "fatiga", valor: 1, aplicados: ["perspicacia", "voluntad", "expresion"] }],
    modificadores: [{ tipo: "atributo", id: "inteligencia", valor: 1 }],
    motor: [
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "aplicado:perspicacia|voluntad|expresion" }, mecanismo: "siempre_activo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
    ],
  },
  {
    familia: "operacionGenetica",
    id: "aum_estabilizacion_engramatica",
    label: "Estabilización Engramática",
    resumen: "+1 Inteligencia adicional y memoria perfecta. Subir cualquier habilidad cuesta 1 menos (mínimo 1).",
    detalle: [
      "El personaje aumenta en 1 adicional su puntuación en el atributo de Inteligencia.",
      "El cerebro elimina por completo la degradación de los recuerdos. Cada concepto, habilidad o dato adquirido se archiva con fidelidad estructural imborrable.",
      "Reduce en 1 el coste para cualquier aumento de habilidad (mínimo 1).",
    ],
    rareza: "Extraño",
    coste: 45000,
    requisitos: ["aum_neurogenesis_hipocampal"],
    eleccion: null,
    repetible: false,
    rebajaCosteHabilidad: { habilidades: "todas", valor: 1 },
    modificadores: [{ tipo: "atributo", id: "inteligencia", valor: 1 }],
    motor: [
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
      { tipo: "narrativo", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
    ],
  },
  {
    familia: "operacionGenetica",
    id: "aum_red_frontoparietal",
    label: "Red Frontoparietal",
    resumen: "+1 Inteligencia y Carácter. Dos dados en Iniciativa; por 1 de fatiga, una prueba mental y otra física en la misma acción.",
    detalle: [
      "El personaje aumenta en 1 su puntuación en los atributos de Inteligencia y Carácter.",
      "El personaje lanza dos dados para su Iniciativa y escoge la mejor tirada.",
      "Por el gasto de un punto de fatiga, el personaje puede desarrollar una prueba mental que requiera una acción simple o estándar de forma simultánea a una prueba física como parte de la misma acción. La acción empleada es la más compleja.",
    ],
    rareza: "Extraño",
    coste: 30000,
    requisitos: ["aum_mielinizacion_central"],
    eleccion: null,
    repetible: false,
    modificadores: [{ tipo: "atributo", id: "inteligencia", valor: 1 }, { tipo: "atributo", id: "caracter", valor: 1 }],
    ventajasFijas: [{ alcance: { tipo: "grupo", grupo: "Iniciativa" } }],
    // A4a: la acción combinada, acción propia (antes, texto en las pruebas mentales). Sin
    // límite de usos (§11.3, tercera ronda).
    acciones: [
      {
        id: "aumentos_accion_combinada",
        label: "Acción combinada",
        economia: "Acción simple o estándar (cuenta la más compleja)",
        costeFatiga: 1,
        nota:
          "Haces una prueba mental (perspicacia, voluntad o expresión) de acción simple o estándar a la vez que cualquier acción física simple o estándar, ataques y defensas incluidos, como parte de la misma acción. Cada prueba se tira en su fila. Sin límite de usos.",
      },
    ],
    motor: [
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "grupo:Iniciativa" }, mecanismo: "siempre_activo", estado: "construido" },
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "aumentos_accion_combinada" }, mecanismo: "accion_equipo", estado: "construido" },
    ],
  },
  {
    familia: "operacionGenetica",
    id: "aum_prefrontal_aumentada",
    label: "Prefrontal Aumentada",
    resumen: "+1 Percepción. Por 1 de fatiga, te concentras en una acción de perspicacia, voluntad o expresión y tiras dos dados.",
    detalle: [
      "El personaje aumenta en 1 su puntuación en el atributo de Percepción.",
      "El personaje podrá concentrarse al desarrollar una acción simple o estándar que utilice perspicacia, voluntad o expresión y resolverla como acción compleja, lanzando dos dados para la tirada y escogiendo el mejor resultado, usar esta habilidad conlleva el gasto de un punto de fatiga.",
      "No se puede utilizar de forma simultánea a la de Asa Estriatotalámica.",
    ],
    rareza: "Poco Habitual",
    coste: 25000,
    requisitos: ["aum_mielinizacion_central"],
    eleccion: null,
    repetible: false,
    modificadores: [{ tipo: "atributo", id: "percepcion", valor: 1 }],
    // Conectividad Callosa es su progresión: con ella funcionando, esta casilla no sale.
    casillasOcultasCon: "aum_conectividad_callosa",
    casillas: [
      {
        id: "aum_prefrontal_concentrarse",
        tipo: "toggle",
        etiqueta: "Concentrarse",
        alcance: { tipo: "aplicado", aplicados: ["perspicacia", "voluntad", "expresion"] },
        valorActivo: 0,
        ventaja: true,
        costeFatiga: 1,
        nota: "La acción simple o estándar se resuelve como compleja. No a la vez que Asa Estriatotalámica.",
      },
    ],
    motor: [
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "aplicado:perspicacia|voluntad|expresion" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "aplicado:perspicacia|voluntad|expresion" }, mecanismo: "eleccion_jugador", estado: "construido" },
    ],
  },
  {
    familia: "operacionGenetica",
    id: "aum_optimizacion_foveo_sensorial",
    label: "Optimización Foveo-Sensorial",
    resumen: "+1 Percepción. +1 a los ataques a distancia tras apuntar y −1 a la cobertura visual.",
    detalle: [
      "El personaje aumenta en 1 su puntuación en el atributo de Percepción.",
      "Además gana un bonificador de +1 en tiradas de ataque a distancia por puntería. También reduce en 1 los penalizadores por cobertura visual al realizar ataques a distancia o pruebas de percepción visual.",
    ],
    rareza: "Poco Habitual",
    coste: 30000,
    requisitos: [],
    eleccion: null,
    repetible: false,
    modificadores: [{ tipo: "atributo", id: "percepcion", valor: 1 }],
    // "Por puntería": +1 en el ataque a distancia con el selector "Apuntado" en Éxito o Crítico
    // (la acción Apuntar previa salió bien; acciones.ts, condicionApuntado).
    bonosTramo: [
      {
        alcance: { tipo: "grupoHabilidad", grupo: "Ataques", habilidad: "combate_distancia" },
        bono: { condicion: "apuntado", porTramo: { exito: 1, critico: 1 } },
      },
    ],
    casillas: [...casillasCobertura("aum_foveo", 1, false)],
    motor: [
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "grupoHabilidad:Ataques+combate_distancia" }, mecanismo: "bono_tramo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "grupoHabilidad:Ataques+combate_distancia" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "alerta_activa" }, mecanismo: "eleccion_jugador", estado: "construido" },
    ],
  },
  {
    familia: "operacionGenetica",
    id: "aum_optimizacion_vestibulo_auditiva",
    label: "Optimización Vestíbulo-Auditiva",
    resumen: "+1 Percepción. +2 contra ceguera y sordera; dos dados al buscar o rastrear por el oído.",
    detalle: [
      "El personaje aumenta en 1 su puntuación en el atributo de Percepción.",
      "Además, otorga un bonificador de +2 contra efectos de ceguera y sordera. También permite lanzar dos dados y escoger el mejor en las pruebas de percepción auditiva para detectar enemigos ocultos, o rastrear por el sonido.",
    ],
    rareza: "Extraño",
    coste: 25000,
    requisitos: ["aum_optimizacion_foveo_sensorial"],
    eleccion: null,
    repetible: false,
    modificadores: [{ tipo: "atributo", id: "percepcion", valor: 1 }],
    salvaciones: [{ contra: ["ceguera", "sordera"], bono: 2 }],
    // La ventaja auditiva solo al buscar activamente: no sube la Alerta pasiva (§11.3).
    casillas: [
      {
        id: "aum_vestibulo_auditiva",
        tipo: "toggle",
        etiqueta: "¿Percepción auditiva? (detectar ocultos o rastrear por el sonido)",
        alcance: { tipo: "tiradaId", id: "alerta_activa" },
        valorActivo: 0,
        ventaja: true,
      },
    ],
    motor: [
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "alerta_activa" }, mecanismo: "eleccion_jugador", estado: "construido" },
    ],
  },
  {
    familia: "operacionGenetica",
    id: "aum_consciencia_omnidireccional",
    label: "Consciencia Omnidireccional",
    resumen: "+1 Percepción. No te pueden flanquear; por 1 de fatiga, esquivas con dos dados.",
    detalle: [
      "El personaje aumenta en 1 su puntuación en el atributo de Percepción.",
      "Además, el personaje no puede ser flanqueado, además por el gasto de un punto de fatiga realiza una acción defensiva de esquiva contra un ataque melee o a distancia tirando dos dados y escogiendo el mejor.",
    ],
    rareza: "Muy Extraño",
    coste: 30000,
    requisitos: ["aum_optimizacion_foveo_sensorial", "aum_prefrontal_aumentada"],
    eleccion: null,
    repetible: false,
    modificadores: [{ tipo: "atributo", id: "percepcion", valor: 1 }],
    casillas: [
      {
        id: "aum_consciencia_esquiva",
        tipo: "toggle",
        etiqueta: "Esquivar con dos dados",
        alcance: { tipo: "tiradaId", id: "defensa" },
        valorActivo: 0,
        ventaja: true,
        costeFatiga: 1,
        nota: "Esquiva contra un ataque melee o a distancia.",
      },
    ],
    // El flanqueo es del que ataca; mientras no haya bono de flanqueo en el motor, texto en la
    // defensa.
    textos: [
      {
        en: { tipo: "grupo", grupo: "Defensa" },
        texto: "No te pueden flanquear: quien te ataca no gana ningún bono por flanquear o rodear, tampoco el de dotes.",
      },
    ],
    motor: [
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
      { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "ataque_melee_<instancia>" }, mecanismo: "nota_fija", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "defensa" }, mecanismo: "eleccion_jugador", estado: "construido" },
    ],
  },
  {
    familia: "operacionGenetica",
    id: "aum_asa_estriatotalamica",
    label: "Asa Estriatotalámica",
    resumen: "Por 1 de fatiga, una acción de perspicacia, voluntad o expresión baja un paso (de compleja a estándar o de estándar a simple).",
    detalle: [
      "El personaje podrá simplificar acciones que utilicen perspicacia, voluntad o expresión, de compleja a estándar o de estándar a simple por el gasto de un punto de fatiga.",
      "Esta habilidad no se puede utilizar de forma simultánea a la de Conectividad Callosa o Prefrontal Aumentada",
    ],
    rareza: "Poco Habitual",
    coste: 15000,
    requisitos: ["aum_mielinizacion_central"],
    eleccion: null,
    repetible: false,
    modificadores: [],
    // Texto: el tipo de acción no lo lleva la app (no hay economía de acciones por turno).
    textos: [
      {
        en: { tipo: "aplicado", aplicados: ["perspicacia", "voluntad", "expresion"] },
        texto:
          "Por 1 de fatiga, esta acción baja un paso: compleja → estándar o estándar → simple; un solo paso por acción. No a la vez que Conectividad Callosa ni Prefrontal Aumentada.",
      },
    ],
    motor: [
      { tipo: "texto", afecta: { modo: "accion_existente", id: "aplicado:perspicacia|voluntad|expresion" }, mecanismo: "nota_fija", estado: "construido" },
    ],
  },
  {
    familia: "operacionGenetica",
    id: "aum_conectividad_callosa",
    label: "Conectividad Callosa",
    resumen: "Por 1 de fatiga, te concentras en cualquier acción simple o estándar y tiras dos dados.",
    detalle: [
      "El personaje podrá concentrarse al desarrollar una acción simple o estándar de cualquier tipo y resolverla como acción compleja, lanzando dos dados para la tirada y escogiendo el mejor resultado. Esta habilidad conlleva el gasto de un punto de fatiga. Podrá emplear dos turnos en realizar una acción compleja ganando también este bonificador.",
      "Este aumento no se puede usar simultáneamente con la habilidad de Asa Estriatotalámica.",
    ],
    rareza: "Extraño",
    coste: 20000,
    requisitos: ["aum_prefrontal_aumentada"],
    eleccion: null,
    repetible: false,
    modificadores: [],
    casillas: [
      {
        id: "aum_callosa_concentrarse",
        tipo: "toggle",
        etiqueta: "Concentrarse",
        alcance: { tipo: "todas" },
        valorActivo: 0,
        ventaja: true,
        costeFatiga: 1,
        nota: "La acción simple o estándar se resuelve como compleja. No a la vez que Asa Estriatotalámica.",
      },
      {
        id: "aum_callosa_dos_turnos",
        tipo: "toggle",
        etiqueta: "Dos turnos",
        alcance: { tipo: "todas" },
        valorActivo: 0,
        ventaja: true,
        costeFatiga: 1,
        nota: "Empleas dos turnos en esta acción compleja. No a la vez que Asa Estriatotalámica.",
      },
    ],
    motor: [
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "nota_fija", estado: "construido" },
    ],
  },
  {
    familia: "operacionGenetica",
    id: "aum_regulacion_limbico_prefrontal",
    label: "Regulación Límbico-Prefrontal",
    resumen: "+1 Carácter. +1 contra coerción, intimidación, manipulación mental y miedo.",
    detalle: [
      "El personaje aumenta en 1 su puntuación en el atributo de Carácter.",
      "Además, gana un bonificador de +1 en tiradas contra coerción, intimidación, manipulación mental y efectos de miedo.",
    ],
    rareza: "Poco Habitual",
    coste: 30000,
    requisitos: [],
    eleccion: null,
    repetible: false,
    modificadores: [{ tipo: "atributo", id: "caracter", valor: 1 }],
    salvaciones: [{ contra: ["coercion", "intimidacion", "manipulacion_mental", "miedo"], bono: 1 }],
    motor: [
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_voluntad" }, mecanismo: "eleccion_jugador", estado: "construido" },
    ],
  },
  {
    familia: "operacionGenetica",
    id: "aum_proyeccion_neuro_expresiva",
    label: "Proyección Neuro-Expresiva",
    resumen: "+1 Carácter. Una vez por escena, dos dados en una prueba de Actitud con lenguaje; por 1 de fatiga, anulas los penalizadores sociales.",
    detalle: [
      "El personaje aumenta en 1 su puntuación en el atributo de Carácter.",
      "Además, una vez por escena o combate puede realizar dos tiradas para una misma prueba y escoger el mejor resultado en el uso de la habilidad de Actitud, la prueba en cuestión tiene que emplear algún tipo de lenguaje.",
      "También, mediante el gasto de un punto de fatiga, puede anular cualquier penalizador en sus interacciones sociales durante una hora.",
    ],
    rareza: "Extraño",
    coste: 25000,
    requisitos: ["aum_regulacion_limbico_prefrontal"],
    eleccion: null,
    repetible: false,
    modificadores: [{ tipo: "atributo", id: "caracter", valor: 1 }],
    casillas: [
      {
        id: "aum_proyeccion_lenguaje",
        tipo: "toggle",
        etiqueta: "Con lenguaje",
        alcance: { tipo: "habilidad", habilidad: "actitud" },
        valorActivo: 0,
        ventaja: true,
        usoPorEscena: true,
        nota: "Una vez por escena o combate; la prueba tiene que emplear algún tipo de lenguaje.",
      },
    ],
    // A5a: "una hora" = hasta el final de la escena (R2); "interacciones sociales" = cualquier
    // tirada de Actitud (usuario, 2026-10-22); activarla es gratuito (tercera ronda).
    acciones: [
      {
        id: "aumentos_activar_proyeccion",
        label: "Activar Proyección",
        economia: "Acción gratuita",
        costeFatiga: 1,
        nota: "Hasta el final de la escena, sin penalizadores por heridas, fatiga ni estados en las tiradas de Actitud (Convencer / mentir, Iniciativa distrayendo). El circunstancial no cambia.",
        efecto: { tipo: "activar", estadoId: "aum_proyeccion", duracion: { tipo: "escena" } },
      },
    ],
    activo: { estadoId: "aum_proyeccion", anulaPenalizadores: { tipo: "habilidad", habilidad: "actitud" } },
    motor: [
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "habilidad:actitud" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "habilidad:actitud" }, mecanismo: "suma_derivado", estado: "construido" },
    ],
  },
  {
    familia: "operacionGenetica",
    id: "aum_matriz_de_red_predeterminada",
    label: "Matriz de Red Predeterminada",
    resumen: "+1 Carácter. +2 contra dominación y sugestión, con salvación extra cada turno; una vez por escena repites una tirada de Actitud.",
    detalle: [
      "El personaje aumenta en 1 su puntuación en el atributo de Carácter.",
      "El núcleo de su personalidad se vuelve impermeable: es muy resistente contra efectos de dominación mental artificial, sugestión coercitiva o pérdida de voluntad por agentes químicos, farmacológicos o neurológicos.",
      "Gana un bonificador de +2 en todas las tiradas de salvación contra efectos de dominación mental, sugestión coercitiva o alteración de la voluntad; si llega a ser dominado o manipulado, puede realizar una tirada de salvación adicional al final de cada uno de sus turnos para romper el control de inmediato.",
      "Una vez por escena puede repetir un tirada de Actitud lanzando dos dados y escogiendo el mejor resultado.",
    ],
    rareza: "Muy Extraño",
    coste: 35000,
    requisitos: ["aum_proyeccion_neuro_expresiva"],
    eleccion: null,
    repetible: false,
    modificadores: [{ tipo: "atributo", id: "caracter", valor: 1 }],
    salvaciones: [{ contra: ["dominacion_mental", "sugestion_coercitiva", "alteracion_voluntad"], bono: 2 }],
    casillas: [
      {
        id: "aum_matriz_red_repetir",
        tipo: "toggle",
        etiqueta: "Repetir tras fallar",
        alcance: { tipo: "habilidad", habilidad: "actitud" },
        valorActivo: 0,
        ventaja: true,
        usoPorEscena: true,
        nota: "Solo al repetir esa misma tirada de Actitud tras fallarla; una vez por escena.",
      },
    ],
    textos: [
      {
        en: { tipo: "tiradaId", id: "salv_voluntad" },
        texto: "Si está dominado o manipulado, puede repetir la salvación al final de cada uno de sus turnos para romper el control de inmediato.",
      },
    ],
    motor: [
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
      { tipo: "narrativo", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "grupo:Salvaciones" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "salv_voluntad" }, mecanismo: "nota_fija", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "habilidad:actitud" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "habilidad:actitud" }, mecanismo: "nota_fija", estado: "construido" },
    ],
  },
  {
    familia: "operacionGenetica",
    id: "aum_integridad_osteotendinosa",
    label: "Integridad Osteotendinosa",
    resumen: "+1 Fuerza y Agilidad. +1 de armadura natural contra perforantes y cortantes.",
    detalle: [
      "El personaje aumenta en 1 su puntuación en los atributos de Fuerza y Agilidad.",
      "Además, gana un punto de blindaje por armadura natural contra ataques perforantes o cortantes.",
    ],
    rareza: "Poco Habitual",
    coste: 30000,
    requisitos: [],
    eleccion: null,
    repetible: false,
    modificadores: [{ tipo: "atributo", id: "fuerza", valor: 1 }, { tipo: "atributo", id: "agilidad", valor: 1 }],
    // R6: +1 contra Cinético, con la nota de a qué golpes vale.
    armaduraNatural: { valor: 1, tipos: ["cinetico"], nota: "Vale contra golpes perforantes y cortantes; el máster lo arbitra." },
    motor: [
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "bloquear_danio" }, mecanismo: "suma_derivado", estado: "construido" },
    ],
  },
  {
    familia: "operacionGenetica",
    id: "aum_matriz_osea_adaptativa",
    label: "Matriz Ósea Adaptativa",
    resumen: "+1 Fuerza y Aguante. −1 a los penalizadores de carga y +1 de armadura natural contra contundentes.",
    detalle: [
      "El personaje aumenta en 1 su puntuación en los atributos de Fuerza y Aguante.",
      "Reduce en 1 los penalizadores por capacidad de carga, además, gana un punto de blindaje por armadura natural contra ataques contundentes o por impactos masivos.",
    ],
    rareza: "Poco Habitual",
    coste: 40000,
    requisitos: [],
    eleccion: null,
    repetible: false,
    modificadores: [{ tipo: "atributo", id: "fuerza", valor: 1 }, { tipo: "atributo", id: "aguante", valor: 1 }],
    armaduraNatural: { valor: 1, tipos: ["cinetico"], nota: "Vale contra golpes contundentes e impactos masivos; el máster lo arbitra." },
    // A3: solo nota junto a la carga (Personaje → Estado); el número sigue bloqueado.
    reducePenalizador: [{ de: "carga", valor: 1 }],
    motor: [
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "acciones_fisicas_carga" }, mecanismo: "suma_derivado", estado: "bloqueado", bloqueoPor: "penalizadores por carga sin mecanizar (sistema.md §5.5)" },
      { tipo: "texto", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "bloquear_danio" }, mecanismo: "suma_derivado", estado: "construido" },
    ],
  },
  {
    familia: "operacionGenetica",
    id: "aum_hipertrofia_miofibrilar",
    label: "Hipertrofia Miofibrilar",
    resumen: "+1 Fuerza. La Fortaleza cuenta ×1,5 para la vida y sanas el daño no letal al doble de velocidad.",
    detalle: [
      "El personaje aumenta en 1 su puntuación en el atributo de Fuerza.",
      "Además, multiplica por 1,5 la puntuación de fortaleza para calcular los puntos de golpe y sana de forma natural daño no letal al doble de velocidad.",
    ],
    rareza: "Poco Habitual",
    coste: 40000,
    requisitos: ["aum_matriz_osea_adaptativa", "aum_integridad_osteotendinosa"],
    eleccion: null,
    repetible: false,
    modificadores: [{ tipo: "atributo", id: "fuerza", valor: 1 }, { tipo: "multiplicadorVida", valor: 1.5 }],
    motor: [
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "derivado:vida" }, mecanismo: "suma_derivado", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ficha" }, mecanismo: "nota_fija", estado: "pendiente" },
    ],
  },
  {
    familia: "operacionGenetica",
    id: "aum_sincronizacion_neuromotora_profunda",
    label: "Sincronización Neuromotora Profunda",
    resumen: "+1 Fuerza y Agilidad. Por 1 de fatiga, dos dados en una tirada de Potencia.",
    detalle: [
      "El personaje aumenta en 1 su puntuación en los atributos de Fuerza y Agilidad.",
      "Además, por el gasto de un punto de fatiga puede lanzar dos dados para una tirada en la que utilice el atributo de potencia y utilizar el resultado más alto.",
    ],
    rareza: "Poco Habitual",
    coste: 40000,
    requisitos: ["aum_integridad_osteotendinosa"],
    eleccion: null,
    repetible: false,
    modificadores: [{ tipo: "atributo", id: "fuerza", valor: 1 }, { tipo: "atributo", id: "agilidad", valor: 1 }],
    casillas: [
      {
        id: "aum_sincronizacion_potencia",
        tipo: "toggle",
        etiqueta: "Dos dados en Potencia",
        alcance: { tipo: "aplicado", aplicados: ["potencia"] },
        valorActivo: 0,
        ventaja: true,
        costeFatiga: 1,
      },
    ],
    motor: [
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "aplicado:potencia" }, mecanismo: "eleccion_jugador", estado: "construido" },
    ],
  },
  {
    familia: "operacionGenetica",
    id: "aum_hiperdensidad_propioceptiva",
    label: "Hiperdensidad Propioceptiva",
    resumen: "+1 Agilidad. Segunda reacción por ronda pagando 1 de fatiga.",
    detalle: [
      "El personaje aumenta en 1 su puntuación en el atributo de Agilidad.",
      "Además, gana una segunda reacción por ronda a cambio de un punto de fatiga.",
    ],
    rareza: "Poco Habitual",
    coste: 40000,
    requisitos: [],
    eleccion: null,
    repetible: false,
    modificadores: [{ tipo: "atributo", id: "agilidad", valor: 1 }],
    // La app no cuenta reacciones: texto en la defensa (Automatismo la deja gratis).
    textos: [
      {
        en: { tipo: "grupo", grupo: "Defensa" },
        texto: "Segunda reacción por ronda pagando 1 de fatiga (gratis con Automatismo Bulboespinal).",
      },
    ],
    motor: [
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "defensa" }, mecanismo: "nota_fija", estado: "construido" },
    ],
  },
  {
    familia: "operacionGenetica",
    id: "aum_automatismo_bulboespinal",
    label: "Automatismo Bulboespinal",
    resumen: "+1 Agilidad. La segunda reacción ya no cuesta fatiga y Sorprendido no te penaliza al defender.",
    detalle: [
      "El personaje aumenta en 1 su puntuación en el atributo de Agilidad.",
      "El personaje ya no tiene que emplear fatiga para obtener la segunda reacción por ronda, además, ya no recibe penalizador en tiradas defensivas por estar sorprendido.",
    ],
    rareza: "Extraño",
    coste: 40000,
    requisitos: ["aum_hiperdensidad_propioceptiva", "aum_integridad_osteotendinosa"],
    eleccion: null,
    repetible: false,
    modificadores: [{ tipo: "atributo", id: "agilidad", valor: 1 }],
    textos: [
      {
        en: { tipo: "grupo", grupo: "Defensa" },
        texto: "Estando Sorprendido no aplicas el −3 en la primera tirada defensiva (Desprevenido sigue igual).",
      },
      {
        en: { tipo: "grupo", grupo: "Defensa" },
        texto: "La segunda reacción por ronda (Hiperdensidad Propioceptiva) ya no cuesta fatiga.",
      },
    ],
    motor: [
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "defensa" }, mecanismo: "nota_fija", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "defensa" }, mecanismo: "nota_fija", estado: "construido" },
    ],
  },
  {
    familia: "operacionGenetica",
    id: "aum_bucle_de_realimentacion_motora",
    label: "Bucle de Realimentación Motora",
    resumen: "Tercera reacción por ronda pagando 1 de fatiga; dos dados en equilibrio para no caer derribado.",
    detalle: [
      "El personaje gana una tercera reacción por turno cambio de un punto de fatiga. Además, para cualquier tirada de equilibrio para evitar caer derribado, lanza dos dados y escoge el mejor resultado.",
    ],
    rareza: "Muy Extraño",
    coste: 25000,
    requisitos: ["aum_automatismo_bulboespinal"],
    eleccion: null,
    repetible: false,
    modificadores: [],
    casillas: [
      {
        id: "aum_bucle_equilibrio",
        tipo: "toggle",
        etiqueta: "Equilibrio para no caer derribado",
        alcance: { tipo: "habilidad", habilidad: "atletismo" },
        valorActivo: 0,
        ventaja: true,
      },
    ],
    // "Por turno" en la fuente; por ronda (errata resuelta, §11.3).
    textos: [
      {
        en: { tipo: "grupo", grupo: "Defensa" },
        texto: "Tercera reacción por ronda pagando 1 de fatiga.",
      },
    ],
    motor: [
      { tipo: "texto", afecta: { modo: "accion_existente", id: "defensa" }, mecanismo: "nota_fija", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "atletismo" }, mecanismo: "eleccion_jugador", estado: "construido" },
    ],
  },
  {
    familia: "operacionGenetica",
    id: "aum_biogenesis_mitocondrial",
    label: "Biogénesis Mitocondrial",
    resumen: "+1 Aguante. Los alimentos recuperan el doble de fatiga; por 1 de fatiga, dos dados contra asfixia, toxinas y venenos; aguantas el doble en hipoxia.",
    detalle: [
      "El personaje aumenta en 1 su puntuación en el atributo de Aguante.",
      "Además, duplica la efectividad de cualquier consumible o alimento empleado para recuperar puntos de fatiga. También permite emplear un punto de fatiga y lanzar dos dados en tiradas de salvación contra asfixia, toxinas y venenos, escogiendo el mejor resultado. Por último, duplica el tiempo en hipoxia que puede soportar el personaje.",
    ],
    rareza: "Poco Habitual",
    coste: 30000,
    requisitos: [],
    eleccion: null,
    repetible: false,
    modificadores: [{ tipo: "atributo", id: "aguante", valor: 1 }],
    salvaciones: [{ contra: ["asfixia", "toxinas", "venenos"], ventaja: "fatiga" }],
    motor: [
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
      { tipo: "texto", afecta: { modo: "ninguna" }, mecanismo: null, estado: "ad_hoc" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "eleccion_jugador", estado: "construido" },
    ],
  },
  {
    familia: "operacionGenetica",
    id: "aum_angiogenesis_sistemica",
    label: "Angiogénesis Sistémica",
    resumen: "+1 Aguante. Las hemorragias duran la mitad y las cortas pagando fatiga; sanas el doble al descansar.",
    detalle: [
      "El personaje aumenta en 1 su puntuación en el atributo de Aguante.",
      "Además, los efectos de hemorrogia solo duran la mitad del habitual, podrá emplear un punto de fatiga para interrumpir una hemorragia de forma automática. En caso de hemorragia exanguinante tendrá que emplear dos puntos de fatiga.",
      "También, el personaje sanará de forma natural el doble en descanso largo, pudiendo intercambiar dos niveles de daño no letal sanados por uno de daño letal. En descanso corto pasa también a sanar un nivel de daño no letal además de los efectos habituales.",
    ],
    rareza: "Extraño",
    coste: 40000,
    requisitos: ["aum_matriz_osea_adaptativa", "aum_biogenesis_mitocondrial"],
    eleccion: null,
    repetible: false,
    modificadores: [{ tipo: "atributo", id: "aguante", valor: 1 }],
    // A4a. Cortar es acción gratuita (§11.3, tercera ronda). La exanguinante no es un estado
    // del catálogo: solo cobra.
    acciones: [
      {
        id: "aumentos_cortar_hemorragia",
        label: "Cortar hemorragia",
        economia: "Acción gratuita",
        costeFatiga: 1,
        nota: "Interrumpes una hemorragia de forma automática. Si tienes el estado Hemorragia, se te quita.",
        efecto: { tipo: "estado", estadoId: "hemorragia", a: null },
      },
      {
        id: "aumentos_cortar_exanguinante",
        label: "Cortar exanguinante",
        economia: "Acción gratuita",
        costeFatiga: 2,
        nota: "Interrumpes una hemorragia exanguinante. La app no la lleva como estado: avisa al máster.",
      },
    ],
    motor: [
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
      { tipo: "texto", afecta: { modo: "ninguna" }, mecanismo: null, estado: "ad_hoc" },
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "aumentos_cortar_hemorragia" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "aumentos_cortar_exanguinante" }, mecanismo: "accion_equipo", estado: "construido" },
    ],
  },
  {
    familia: "operacionGenetica",
    id: "aum_resiliencia_homeostatica",
    label: "Resiliencia Homeostática",
    resumen: "+1 Aguante. Dos dados, sin pagar fatiga, contra enfermedad, toxinas, venenos, radiación, frío o calor extremos y asfixia.",
    detalle: [
      "El personaje aumenta en 1 su puntuación en el atributo de Aguante.",
      "Además, el personaje lanza dos dados en tiradas de salvación contra efectos de enfermedad, toxinas, venenos, radiación, efectos térmicos extremos y asfixia sin necesidad de gastar fatiga.",
    ],
    rareza: "Extraño",
    coste: 40000,
    requisitos: ["aum_angiogenesis_sistemica"],
    eleccion: null,
    repetible: false,
    modificadores: [{ tipo: "atributo", id: "aguante", valor: 1 }],
    salvaciones: [{ contra: ["enfermedad", "toxinas", "venenos", "radiacion", "termicos", "asfixia"], ventaja: "gratis" }],
    motor: [
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "eleccion_jugador", estado: "construido" },
    ],
  },
  {
    familia: "operacionGenetica",
    id: "aum_regeneracion_tisular_acelerada",
    label: "Regeneración Tisular Acelerada",
    resumen: "Regeneras daño no letal, letal y grave con el tiempo; inmune a la hemorragia.",
    detalle: [
      "El personaje podrá recuperar un nivel de salud de daño no letal por turno, uno de daño letal por minuto (10 turnos) y uno de daño grave por hora.",
      "Además, es inmune al estado de hemorragia, y en caso de hemorragia exanguinante podrá emplear un punto de fatiga para eliminar el efeco.",
      "Un personaje en estado de fatiga tarda el doble en regenerar y exhausto no regenera en absoluto.",
      "Durante el descanso corto recupera 2 niveles de daño letal en lugar de 1.",
    ],
    rareza: "Extraño",
    coste: 30000,
    requisitos: ["aum_angiogenesis_sistemica"],
    eleccion: null,
    repetible: false,
    modificadores: [],
    // A7: "inmune al estado de hemorragia". La exanguinante no es un estado: fuera.
    inmuneA: ["hemorragia"],
    // A4a. La exanguinante no es un estado del catálogo: solo cobra.
    acciones: [
      {
        id: "aumentos_eliminar_exanguinante",
        label: "Eliminar exanguinante",
        // El texto no dice qué acción cuesta: gratuita, como Cortar hemorragia (usuario,
        // 2026-10-22; pendiente de confirmar con Murillo).
        economia: "Acción gratuita",
        costeFatiga: 1,
        nota: "Eliminas el efecto de una hemorragia exanguinante. La app no la lleva como estado: avisa al máster.",
      },
    ],
    motor: [
      { tipo: "texto", afecta: { modo: "ninguna" }, mecanismo: null, estado: "ad_hoc" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "estado:hemorragia" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "construido" },
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "aumentos_eliminar_exanguinante" }, mecanismo: "accion_equipo", estado: "construido" },
    ],
  },
  {
    familia: "operacionGenetica",
    id: "aum_estabilizacion_autonomica",
    label: "Estabilización Autonómica",
    resumen: "−1 a los penalizadores por heridas y fatiga; +2 contra aturdimiento, confusión, shock y miedo.",
    detalle: [
      "El personaje reduce en 1 los penalizadores acumulados por heridas y fatiga. Además, gana un bonificador de +2 en tiradas de salvación contra efectos de aturdimiento, confusión, shock, y miedo.",
      "Si el personaje se encuentra en estado de asustado puede emplear una acción simple o una reacción para deshacerse del miedo. Si se encuentra aterrorizado puede realizar una acción estándar durante su turno para pasar a estar asustado.",
    ],
    rareza: "Poco Habitual",
    coste: 15000,
    requisitos: [],
    eleccion: null,
    repetible: false,
    modificadores: [],
    reducePenalizador: [
      { de: "heridas", valor: 1 },
      { de: "fatiga", valor: 1 },
    ],
    salvaciones: [
      { contra: ["aturdimiento", "shock"], bono: 2 },
      { contra: ["confusion", "miedo"], bono: 2 },
    ],
    // A4a: librarse del miedo es automático, gastando la acción (§11.3, tercera ronda).
    acciones: [
      {
        id: "aumentos_sacudir_miedo",
        label: "Sacudir miedo",
        economia: "Acción simple o reacción",
        nota: "Si estás Asustado, te deshaces del miedo: se te quita el estado.",
        efecto: { tipo: "estado", estadoId: "miedo", desde: "asustado", a: null },
      },
      {
        id: "aumentos_dominar_terror",
        label: "Dominar terror",
        economia: "Acción estándar en tu turno",
        nota: "Si estás Aterrorizado, pasas a Asustado.",
        efecto: { tipo: "estado", estadoId: "miedo", desde: "aterrorizado", a: "asustado" },
      },
    ],
    motor: [
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "siempre_activo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_voluntad" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "aumentos_sacudir_miedo" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "aumentos_dominar_terror" }, mecanismo: "accion_equipo", estado: "construido" },
    ],
  },
  {
    familia: "operacionGenetica",
    id: "aum_introgresion_sensorial_heterologa",
    label: "Introgresión Sensorial Heteróloga",
    resumen: "Un sentido nuevo a elegir: visión nocturna o térmica, campos electromagnéticos, ultravioleta, olfato químico o sónar.",
    detalle: [
      "El personaje puede escoger entre uno de los siguientes sentidos:",
      "Este aumento se puede escoger más veces para distintos sentidos.",
    ],
    rareza: "Extraño",
    coste: 15000,
    requisitos: [],
    eleccion: {
      id: "sentido",
      label: "Sentido",
      opciones: [
        {
          id: "vision_nocturna",
          label: "Visión Nocturna",
          detalle: [
            "La adaptación biológica procesa los fotones a nivel celular orgánico, permitiendo una visión nocturna natural que resiste mejor los destellos y explosiones intensas. La visión se adapta a espacios de escasa iluminación con la misma claridad que en espacios iluminados, aunque se podrá restringir a grandes distancias. Además otorga un bonificador de +2 en tiradas de salvación contra ceguera por detonaciones gracias a la rápida respuesta de obturación orgánica.",
          ],
          salvaciones: [{ contra: ["ceguera_detonacion"], bono: 2 }],
        },
        {
          id: "vision_termica",
          label: "Visión Térmica",
          detalle: [
            "La integración sináptica de sensores térmicos permite al sistema nervioso superponer el espectro infrarrojo a la visión óptica normal sin recurrir a abstracciones cromáticas digitales y sin perder detalle. Esto anula por completo cualquier penalizador en tiradas de percepción visual fuera del gradiente térmico a diferencia de los visores tecnológicos. El sientido adquirido no solo procesa la temperatura actual, sino que registra y resalta el rastro térmico reciente (como huellas de pisadas luminosas en el suelo, la estela de calor de un proyectil o el rastro residual de un objetivo que acaba de pasar), permitiendo rastrear rutas de movimiento recientes aunque el blanco ya no esté a la vista. El rastro más inmediato brilla con mayor intensidad, desvaneciéndose de forma progresiva a los 5 turnos, pero persistiendo de 10 a 15 minutos en condiciones ambientales estándar. En situaciones de frío extremo o alta ventilación, el calor se disipa con rapidez, reduciendo la duración del rastro a la mitad (2 turnos o 5 minutos). En superficies aislantes o interiores sellados, la huella térmica perdura ligeramente más tiempo al carecer de corrientes de aire que fuercen la convección.",
          ],
        },
        {
          id: "percepcion_electromagnetica",
          label: "Percepción Electromagnética",
          detalle: [
            "Este aumento dota al personaje de una capacidad de detección de campos electromagnéticos generados por motores, baterías, sintéticos y armamento energético a corta distancia a través de tabiques finos. Al ser un proceso orgánico, no emite pulsos rastreables, aunque muestra vulnerabilidad ante descargas eléctricas directas o campos magnéticos intensos. Su alcance pasivo es de 10 metros, pero con una tirada de perspicacia + exploración y una acción compleja se aumenta el área a 30 metros, si además emplea un punto de fatiga en la prueba, se aumenta el área a 60 metros.",
          ],
          // A4b (usuario, 2026-10-22): ampliar no tira; lo que se tira es la búsqueda. Las tres
          // juntas y en este orden.
          acciones: [
            {
              id: "aumentos_barrido_30",
              label: "Ampliar a 30 m",
              economia: "Acción compleja",
              nota: "El barrido electromagnético pasa de 10 m a 30 m. No tira: lo que se tira es encontrar o distinguir.",
            },
            {
              id: "aumentos_barrido_60",
              label: "Ampliar a 60 m",
              economia: "Acción compleja",
              costeFatiga: 1,
              nota: "El barrido electromagnético pasa de 10 m a 60 m. No tira: lo que se tira es encontrar o distinguir.",
            },
            {
              id: "aumentos_barrido_buscar",
              label: "Encontrar o distinguir",
              // TODO(revisar): el texto no separa la acción de ampliar de la de buscar; la
              // búsqueda no lleva economía propia (la acción compleja va en ampliar).
              economia: "",
              nota: "Dificultad: la pone el máster. Encuentras o distingues campos electromagnéticos (motores, baterías, sintéticos, armamento energético) en el área del barrido, también tras tabiques finos.",
              tirada: { aplicado: "perspicacia", habilidad: "exploracion" },
            },
          ],
        },
        {
          id: "espectro_ultravioleta",
          label: "Espectro Ultravioleta y Rastro Forense",
          detalle: [
            "La expansión de la visión hacia los ultravioletas permite identificar residuos químicos recientes, fluidos orgánicos, huellas de polímeros de ocultación, marcas de seguridad holográficas y la ionización residual del armamento energético. Proporciona un bonificador de +2 en tiradas de investigación de campo o búsqueda de accesos ocultos.",
          ],
          // R10 (2026-10-24): el +2 vale en investigación de campo y en buscar accesos ocultos.
          // Las dos son Buscar / percibir (Perspicacia + Exploración; la investigación, con su
          // especialidad): una casilla para las dos, el id se queda.
          casillas: [
            {
              id: "aum_introgresion_ultravioleta_accesos",
              tipo: "toggle",
              etiqueta: "¿Investigación de campo o buscas accesos ocultos?",
              alcance: { tipo: "tiradaId", id: "alerta_activa" },
              valorActivo: 2,
            },
          ],
        },
        {
          id: "deteccion_quimica",
          label: "Detección Química y de Feromonas",
          detalle: [
            "Es de carácter estrictamente olfativo, capaz de percibir trazas químicas de transpiración y emisiones hormonales en espacios confinados hasta un radio de 20 metros. Este sentido contrarresta las técnicas de camuflaje químico y otorga un bonificador para detectar objetivos ocultos a corta distancia de +2 (4 metros).",
          ],
          // Sube también la Alerta pasiva (§11.3), pero solo a 4 m o menos: allí va como nota.
          casillas: [
            {
              id: "aum_introgresion_quimica_cerca",
              tipo: "toggle",
              etiqueta: "¿Objetivo oculto a 4 m o menos?",
              alcance: { tipo: "tiradaId", id: "alerta_activa" },
              valorActivo: 2,
              nota: "Solo si puedes usar el olfato (en el vacío con traje, no).",
            },
          ],
          notaAlertaPasiva: "+2 contra ocultos a 4 m o menos, si puedes usar el olfato",
        },
        {
          id: "ecolocalizacion",
          label: "Ecolocalización y Sónar Orgánico",
          detalle: [
            "Funciona como un sistema de ecolocalización continuo y pasivo que opera de manera idéntica a un sónar de proximidad. Es totalmente imperceptible para escáneres electrónicos, inmune a pulsos de interferencia y permite mapear el entorno en la oscuridad absoluta o bajo el agua, sin requerir acciones manuales de activación. En medios terrestres el alcance efectivo es de hasta 20 metros para la detección precisa de contornos, obstáculos y el movimiento de blancos. Fuera de este radio, las ondas se atenúan con rapidez y pierden resolución táctica. En medios acuáticos o de alta densidad el alcance se duplica (40 metros) gracias a la excelente propagación del sonido a través del agua y fluidos densos. A corta distancia (4 metros), el sistema ofrece una precisión milimétrica capaz de percibir texturas de materiales, oquedades tras paneles delgados o la vibración de estructuras cercanas.",
          ],
        },
      ],
    },
    repetible: true,
    modificadores: [],
    motor: [
      { tipo: "narrativo", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "alerta_activa" }, mecanismo: "nota_fija", estado: "pendiente" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "aumentos_barrido_electromagnetico" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "alerta_activa" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "sigilo" }, mecanismo: "nota_fija", estado: "pendiente" },
    ],
  },
];

// MQE (A4a): Mensaje subvocal y Telemetría con el alcance y la capacidad del nivel (cada nivel
// sustituye al anterior, §11.3), y la defensa contra la intrusión de ese nivel, fila
// informativa en Acciones. Desde el nivel 2 los mensajes llegan a varias personas (decisión
// del usuario, 2026-10-22).
const CAPACIDAD_MQE_BASICA = "Un mensaje que quepa en un turno: 6 s de audio, una línea de texto o unas coordenadas GPS.";
function mensajeMqe(alcance: string, capacidad: string, varios: boolean): AccionAumentoCatalogo {
  return {
    id: "aumentos_mqe_comunicar",
    label: "Mensaje subvocal",
    economia: "Acción gratuita",
    nota: `Comunicación subvocal cifrada o enlace con terminales y radios tácticas, sin sonido ni dispositivos externos, ${
      varios ? "a varias personas a la vez" : "de uno en uno"
    }. ${capacidad} Alcance: ${alcance}.`,
  };
}
function telemetriaMqe(alcance: string): AccionAumentoCatalogo {
  return {
    id: "aumentos_mqe_telemetria",
    label: "Telemetría",
    economia: "Acción gratuita",
    nota: `Sincronizas hasta cuatro dispositivos del escuadrón (drones, miras inteligentes o pasarelas) y compartes telemetría táctica en tiempo real. Alcance: ${alcance}.`,
  };
}
const CONTRAGOLPE_MQE_1 = "1 nivel de daño letal y salvación de Voluntad (dificultad 10) contra aturdimiento.";

// Ojo Biónico (A2a): el bono a distancia (siempre activo) y el de percepción visual (casilla
// en Alerta activa y suma a la pasiva) no se apilan con miras ni gafas de visión aumentada:
// vale el mayor (grupo "vision_aumentada", también en la Mira Telescópica).
const DISTANCIA = { tipo: "grupoHabilidad", grupo: "Ataques", habilidad: "combate_distancia" } as const;

function casillaVisualOjo(valor: number): CondicionTirada {
  return {
    id: "aum_ojo_visual",
    tipo: "toggle",
    etiqueta: "¿Es percepción visual?",
    alcance: { tipo: "tiradaId", id: "alerta_activa" },
    valorActivo: valor,
    noApila: VISION_AUMENTADA,
  };
}

// Las dos casillas de cobertura de una pieza: ataques a distancia y Buscar/percibir. Las del
// Ojo llevan el mismo id en los niveles 2 y 4, para que el 4 sustituya al 2 (acumulaPorClave).
// Los alcances van escritos aquí (no DISTANCIA): Foveo la llama antes de que exista.
function casillasCobertura(prefijo: string, valor: number, cualquiera: boolean): CondicionTirada[] {
  const etiqueta = cualquiera ? "Objetivo con cobertura (física o visual)" : "Objetivo con cobertura visual";
  const comun = { tipo: "toggle", etiqueta, valorActivo: valor, noApila: NO_APILA_COBERTURA, nota: NOTA_COBERTURA } as const;
  return [
    { ...comun, id: `${prefijo}_cobertura_distancia`, alcance: { tipo: "grupoHabilidad", grupo: "Ataques", habilidad: "combate_distancia" } },
    { ...comun, id: `${prefijo}_cobertura_alerta`, alcance: { tipo: "tiradaId", id: "alerta_activa" } },
  ];
}

export const IMPLANTES: Implante[] = [
  {
    familia: "implante",
    id: "aum_implante_de_resonancia_metrica",
    label: "Implante de Resonancia Métrica",
    resumen: "Permite a una especie no psiónica entrenar la psiónica, con riesgo de sobreesfuerzo al usarla.",
    descripcion: "Las especies no psiónicas carecen de las vías neurosinápticas orgánicas necesarias para modular la dinámica métrica. El IRM lo resuelve con un nodo central biocompatible anclado a la región parietal-temporal y una red de microfilamentos superconductores por la médula espinal y el sistema nervioso central. Ante una orden de pensamiento enfocado intercepta el impulso, lo traduce con un coprocesador cuántico subdérmico y genera un campo de resonancia artificial; actúa como amplificador y disipador de calor sináptico. El usuario no adquiere de forma inmediata capacidad para la psiónica: debe entrenarla como un psiónico orgánico.",
    sabotaje: true,
    electronico: true,
    extraible: null,
    niveles: [
      {
        nivel: 1,
        rareza: "Poco Habitual",
        coste: 30000,
        detalle: [
          "Es el punto de entrada. Permite a una especie no psiónica empezar a desarrollar y manifestar sus primeros poderes básicos, pero el hardware es rudimentario y carece de filtros de seguridad avanzados.",
          "Sobreesfuerzo: Si el usuario activa el implante estando fatigado o emplea poderes de nivel 3 o más, debe superar una tirada de voluntad dificultad igual a 6 + nivel de poder empleado. En caso de éxito no tiene efecto, pero en caso de fracaso:",
          "Fracaso: El sistema sufre un pico de retroalimentación y el usuario sufre un nivel de daño letal.",
          "Fracaso Crítico: El daño recibido es grave y, además, el personaje queda aturdido por el colapso sináptico.",
          "Carga Crítica: Si el personaje se encuentra en estado exhausto, la protección del implante colapsa: el daño por fallo deja de ser seguro y pasa a ser grave y en caso de fracaso crítico provoca muerte cerebral automática.",
        ],
        modificadores: [],
        motor: [
          { tipo: "habilitador", afecta: { modo: "accion_existente", id: "psionica" }, mecanismo: "gate_instalacion", arbitraje: "pendiente", estado: "bloqueado", bloqueoPor: "§11.3: se modela pero no se conecta (tarea psiónico biológico)" },
          { tipo: "accion", afecta: { modo: "accion_nueva", id: "aumentos_sobreesfuerzo_irm" }, mecanismo: "accion_equipo", estado: "pendiente" },
          { tipo: "narrativo", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
        ],
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 60000,
        detalle: [
          "Optimiza los conductos y ofrece una disipación térmica superior, corrigiendo la extrema vulnerabilidad del modelo base.",
          "Sobreesfuerzo: Siempre que el personaje esté fatigado o emplee poderes de nivel 4 o más.",
          "Fallo: El daño se mitiga drásticamente y pasa a ser no letal.",
          "Fracaso Crítico: El daño es grave y causa aturdimiento.",
          "Carga Crítica: Si el personaje se encuentra en estado exhausto: el daño por fallo deja de ser seguro y pasa a ser letal y en caso de fracaso crítico provoca muerte cerebral automática.",
        ],
        modificadores: [],
        motor: [
          { tipo: "accion", afecta: { modo: "accion_existente", id: "aumentos_sobreesfuerzo_irm" }, mecanismo: "accion_equipo", estado: "pendiente" },
          { tipo: "narrativo", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
        ],
      },
      {
        nivel: 3,
        rareza: "Extraño",
        coste: 120000,
        detalle: [
          "Enlace profundo que soporta flujos energéticos masivos y ejecución simultánea, diseñado para entornos de alta exigencia táctica.",
          "Optimiza los conductos y ofrece una disipación térmica superior, corrigiendo la extrema vulnerabilidad del modelo base.",
          "Sobreesfuerzo: Los poderes de nivel 1 no generan sobreesfuerzo, si lo genera utilizar poderes estando fatigado o habilidades psiónicas de nivel 5 o más.",
          "Fallo: El daño se mitiga drásticamente y pasa a ser no letal.",
          "Fracaso Crítico: causa daño letal y deja al usuario aturdido.",
          "Carga Crítica: Si el personaje está exhausto, el margen de error desaparece: cualquier fallo provoca directamente daño letal, y un fracaso crítico escala a daño grave.",
        ],
        modificadores: [],
        motor: [
          { tipo: "accion", afecta: { modo: "accion_existente", id: "aumentos_sobreesfuerzo_irm" }, mecanismo: "accion_equipo", estado: "pendiente" },
          { tipo: "narrativo", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
        ],
      },
      {
        nivel: 4,
        rareza: "Muy Extraño",
        coste: 240000,
        detalle: [
          "El modo límite del implante. Los limitadores de seguridad se anulan por completo para desatar potencias destructivas o manipulación métrica de escala mayor.",
          "Sobreesfuerzo: Los poderes de nivel 2 o menos no generan sobreesfuerzo, si el personaje no está en fatiga ningún nivel de habilidad psiónica genera sobeesfuerzo. Durante fatiga se produce sobreesfuerzo en poderes de nivel 3 o más con una dificultad baja a 4 + nivel de poder empleado.",
          "Fallo: El daño base por fallo es no letal.",
          "Fracaso Crítico: El usuario tiene la opción táctica de escoger entre sufrir aturdimiento o recibir daño letal.",
          "Carga Crítica: el fallo causa daño letal y el fracaso crítico inflige daño grave además de provocar aturdimiento.",
        ],
        modificadores: [],
        motor: [
          { tipo: "accion", afecta: { modo: "accion_existente", id: "aumentos_sobreesfuerzo_irm" }, mecanismo: "accion_equipo", estado: "pendiente" },
          { tipo: "narrativo", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
        ],
      },
    ],
  },
  {
    familia: "implante",
    id: "aum_microprocesador_cuantico_de_enlace",
    label: "Microprocesador Cuántico de Enlace",
    resumen: "Comunicación subvocal cifrada; castiga al psiónico que intente infiltrarse.",
    descripcion: "Implante de perfil bajo, integrado de forma discreta en el tejido subdérmico o maxilar: un chip de comunicaciones cuánticas miniaturizado para el intercambio táctico de datos y voz a corta distancia. Usa una matriz de qubits de baja potencia y protocolos de Distribución de Claves Cuánticas (QKD): si alguien intercepta la transmisión, la perturbación se detecta al instante y la clave se anula. Cualquier psiónico que quiera forzar los cúbits en tránsito asume un riesgo letal. Diseñado exclusivamente para comunicaciones y transferencia cifrada, no para intrusión ni craqueo.",
    sabotaje: true,
    electronico: true,
    extraible: null,
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 1500,
        detalle: [
          "Permite la comunicación subvocal cifrada y el enlace directo con terminales locales o radios tácticas de corto alcance sin emitir sonido ni requerir dispositivos externos, pero solo de uno en uno. La capcidad de este implante de nivel 1 es muy baja y permite enviar un audio subvocal de seis segundos, una línea de texto o coordenadas GPS; es un canal tan estrecho que intentar meter una imagen o un documento pesado colapsa el búfer. La comunicación se resuelve como acción gratuita aunque debe ser un mensaje capaz de reproducir en la duración de un turno.",
          "Alcance: 50 metros.",
          "Dificultad de Infiltración Psiónica: 13 (12 + 1 del nivel del implante). El psiónico debe superar esta prueba cada turno, es una acción compleja que requiere concentración, además, la dificultad aumenta y con ello también el riesgo de contragolpe; cada turno aumenta en 1 la dificultad de infilitración psiónica.",
          "Mecanismo de Defensa: Colapso instantáneo del canal QKD al detectar la menor alteración probabilística en el flujo de cúbits, cortando la conexión de forma abrupta.",
          "Contragolpe: El psiónico recibe un nivel de daño letal y debe superar una voluntad dificultad 10 contra un efecto de aturdimiento.",
        ],
        modificadores: [],
        acciones: [mensajeMqe("50 m", CAPACIDAD_MQE_BASICA, false)],
        defensaIntrusion: {
          alcance: "50 m",
          dificultad: 13,
          defensa: "colapso instantáneo del canal QKD al detectar la menor alteración: corta la conexión de golpe.",
          contragolpe: CONTRAGOLPE_MQE_1,
        },
        motor: [
          { tipo: "accion", afecta: { modo: "accion_nueva", id: "aumentos_mqe_comunicar" }, mecanismo: "accion_equipo", estado: "construido" },
          { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "intrusion_psionica_mqe" }, mecanismo: "nota_fija", estado: "construido" },
        ],
      },
      {
        nivel: 2,
        rareza: "Común",
        coste: 3000,
        detalle: [
          "Sincroniza simultáneamente al usuario con hasta cuatro dispositivos del escuadrón (drones, miras inteligentes o pasarelas), permitiendo compartir telemetría táctica en tiempo real como acción gratuita.",
          "Alcance: 200 metros.",
          "Dificultad de Infiltración Psiónica: 14 (12 + 2 del nivel del implante).",
          "Mecanismo de Defensa: Doble capa de encriptación cuántica rotativa que cambia constantemente, desviando al psiónico hacia datos falsos y vacíos.",
          "Contragolpe: El psiónico recibe un nivel de daño letal y debe superar una voluntad dificultad 10 contra un efecto de aturdimiento",
        ],
        modificadores: [],
        acciones: [mensajeMqe("200 m", CAPACIDAD_MQE_BASICA, true), telemetriaMqe("200 m")],
        defensaIntrusion: {
          alcance: "200 m",
          dificultad: 14,
          defensa: "doble capa de encriptación cuántica rotativa que desvía al psiónico hacia datos falsos y vacíos.",
          contragolpe: CONTRAGOLPE_MQE_1,
        },
        motor: [
          { tipo: "accion", afecta: { modo: "accion_nueva", id: "aumentos_mqe_telemetria" }, mecanismo: "accion_equipo", estado: "construido" },
          { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "intrusion_psionica_mqe" }, mecanismo: "nota_fija", estado: "construido" },
        ],
      },
      {
        nivel: 3,
        rareza: "Poco Habitual",
        coste: 6000,
        detalle: [
          "Amplía el rango de conexión a repetidores lejanos, aislando el canal de radio frente a interferencias electromagnéticas y permitiendo gestionar flujos de datos pesados sin pérdida de velocidad. Podrías enviar planos arquitectónicos tridimensionales de un complejo entero, manuales de seguridad o bloques de archivos pesados casi al instante.",
          "Alcance: 500 metros.",
          "Dificultad de Infiltración Psiónica: 15 (12 + 3 del nivel del implante).",
          "Mecanismo de Defensa: Un cepo que finge un fallo de seguridad, atrapando la consciencia del psiónico en un bucle con una duración de 3 turnos. Cada turno el psiónico infiltrado puede tratar de escapar con una tirada de perspicacia + tecnociencia dificultad 10 que emplea una acción estándar.",
          "Contragolpe: Contragolpe de entropía focalizada; quema parcialmente las conexiones sinápticas de la interfaz métrica, infligiendo daño grave y efecto de aturdimiento (voluntad dificultad 10), cada turno atrapado en el cepo el psiónico recibe el contragolpe de nuevo.",
        ],
        modificadores: [],
        acciones: [
          mensajeMqe(
            "500 m",
            "Datos pesados (planos tridimensionales de un complejo, manuales, bloques de archivos) casi al instante, por repetidores lejanos y con el canal aislado de interferencias electromagnéticas (no protege del Shock).",
            true,
          ),
          telemetriaMqe("500 m"),
        ],
        defensaIntrusion: {
          alcance: "500 m",
          dificultad: 15,
          defensa:
            "cepo que finge un fallo de seguridad y atrapa al psiónico 3 turnos; cada turno puede intentar escapar con Perspicacia + Tecnociencia, dificultad 10, acción estándar.",
          contragolpe: "1 nivel de daño grave y salvación de Voluntad (dificultad 10) contra aturdimiento; se repite cada turno que siga en el cepo.",
        },
        motor: [
          { tipo: "texto", afecta: { modo: "accion_existente", id: "aumentos_mqe_comunicar" }, mecanismo: "nota_fija", estado: "construido" },
          { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "intrusion_psionica_mqe" }, mecanismo: "nota_fija", estado: "construido" },
        ],
      },
      {
        nivel: 4,
        rareza: "Extraño",
        coste: 12000,
        detalle: [
          "Enlace cuántico de grado militar con servidores corporativos centrales y nodos de alta seguridad; oculta por completo la firma digital del usuario y automatiza contramedidas en milisegundos. Volcados de servidores centrales, bases de datos de personal completas o paquetes de datos de grado militar sincronizados en un par de segundos.",
          "Alcance: 2 kilómetros.",
          "Dificultad de Infiltración Psiónica: 16 (12 + 4 del nivel del implante).",
          "Mecanismo de Defensa: Fortaleza cuántica con aislamiento de fase absoluta. El chip detecta la intención en la Métrica antes de que la información sea leída y sella herméticamente los puertos sinápticos locales. También se puede escoger el mecanismo de defensa de nivel 3.",
          "Contragolpe: Contragolpe catastrófico de inversión de fase; reinyecta un eco de colapso masivo a través del puente sináptico capaz de dejar al psiónico inconsciente de inmediato o provocarle hemorragias cerebrales críticas. El psiónico recibe 2 niveles de daño grave, aturdimiento (voluntad 12) y hemorragia durante 1d10 turnos. El usuario puede decidir escoger el contragolpe propio del cepo de nivel 3.",
        ],
        modificadores: [],
        acciones: [
          mensajeMqe(
            "2 km",
            "Enlace de grado militar con servidores y nodos de alta seguridad: volcados de servidores, bases de datos de personal o paquetes militares en un par de segundos. Tu firma digital queda oculta.",
            true,
          ),
          telemetriaMqe("2 km"),
        ],
        defensaIntrusion: {
          alcance: "2 km",
          dificultad: 16,
          defensa:
            "fortaleza cuántica: detecta la intención en la Métrica y sella los puertos sinápticos antes de que se lea nada. En cada intrusión puedes elegir en su lugar el cepo del nivel 3.",
          contragolpe:
            "2 niveles de daño grave, salvación de Voluntad (dificultad 12) contra aturdimiento y hemorragia durante 1d10 turnos. Con el cepo, el contragolpe del nivel 3.",
        },
        motor: [
          { tipo: "texto", afecta: { modo: "accion_existente", id: "aumentos_mqe_comunicar" }, mecanismo: "nota_fija", estado: "construido" },
          { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "tecnica" }, mecanismo: "nota_fija", estado: "pendiente" },
          { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "intrusion_psionica_mqe" }, mecanismo: "nota_fija", estado: "construido" },
        ],
      },
    ],
  },
  {
    familia: "implante",
    id: "aum_brazo_bionico",
    label: "Brazo Biónico",
    resumen: "Un brazo con su propia Fuerza y Agilidad, blindaje y arma incorporada. En los niveles 3 y 4 se elige modelo.",
    descripcion: "El brazo biónico sustituye la extremidad orgánica por una estructura de aleación de alta resistencia conectada directamente al sistema nervioso periférico y a los impulsos de la médula espinal. Utiliza un sistema de tendones de nanotubos de carbono y servomotores de respuesta ultrarrápida que traducen las órdenes motoras del usuario en una fuerza bruta o una agilidad sobresaliente, integrando además un chasis blindado y anclajes internos para alojar armamento táctico o herramientas de precisión.",
    sabotaje: true,
    electronico: true,
    extraible: null,
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 12500,
        detalle: [
          "El personaje reemplaza un brazo por uno biónico básico. Esta tiene su propia puntuación de fuerza y agilidad pero basada en los atributos del usuario. Estos valores se aplicarán cuando el personaje emplee una acción usando esta extremidad, la prótesis de primer nivel es más bien sustitutoria, iguala la fuerza del usuario pero se mueve más torpemente, la agilidad de la extremidad es 1 punto menor.",
          "Se puede incorporar un arma en su interior siempre que su uso sea a una mano, mientras esté incorporada, su desenfundado es gratuito y no puede ser desarmado. Para incorporar este arma, es preciso una acción extendida de 10 minutos y realizar una tirada de perspicacia + biónica dificultad 8 con el instrumental adecuado. Para desprendese del arma es preciso la misma acción, pero si esta quiere ser extraída de un cuerpo sin respetar su salud, se realiza como el resto de implantes cuando son saqueados.",
        ],
        modificadores: [],
        // A6a: iguala la Fuerza del usuario y tiene 1 menos de Agilidad. Ni bloquea ni hace letal.
        extremidad: { fuerza: { delta: 0 }, agilidad: { delta: -1 } },
        // A6a: la casilla "Con el brazo biónico" (una CondicionTirada, de ahí eleccion_jugador).
        // A6b: el arma incorporada (PiezaEquipada.armaIncorporada, selector en Equipo). Sus filas
        // van siempre con el brazo y llevan la nota de desenfundado gratis, sin desarme y carga
        // (solo texto), en el cuerpo a cuerpo y en el fuego.
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee_<instancia>" }, mecanismo: "eleccion_jugador", estado: "construido" },
          { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee_<instancia>" }, mecanismo: "nota_fija", estado: "construido" },
          { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego_<instancia>" }, mecanismo: "nota_fija", estado: "construido" },
          { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "desarmar" }, mecanismo: "nota_fija", estado: "construido" },
          { tipo: "accion", afecta: { modo: "accion_nueva", id: "aumentos_montar_arma_brazo" }, mecanismo: "accion_equipo", estado: "construido" },
        ],
        // A4b: solo la tirada (usuario, 2026-10-22). El vínculo del arma con el brazo se fija en
        // Equipo (A6b), sin exigir esta tirada.
        acciones: [
          {
            id: "aumentos_montar_arma_brazo",
            label: "Incorporar arma",
            economia: "Acción extendida de 10 minutos",
            nota: "Con el instrumental adecuado. El arma, de una mano (también de fuego). Si fallas, se repite con otros 10 minutos. Quitarla es la misma acción. Qué arma lleva el brazo se fija en Equipo, en la tarjeta del Brazo Biónico.",
            tirada: { aplicado: "perspicacia", habilidad: "biociencia", especialidad: "bionica", dificultad: 8 },
          },
        ],
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 25000,
        detalle: [
          "La fuerza del brazo es un punto superior a la del usuario pero con un límite máximo de 5 en su puntuación, su agilidad es idéntica a la del usuario.",
          "El brazo biónico de segundo nivel tiene un blindaje de 3 puntos y se puede utilizar como arma para bloquear. Además causa daño letal en sus ataques de pelea.",
        ],
        modificadores: [],
        // A6a: Fuerza +1 (tope 5), la misma Agilidad, blindaje 3, bloquea y letal en pelea.
        extremidad: { fuerza: { delta: 1, tope: 5 }, agilidad: { delta: 0 }, blindaje: 3, bloquea: true, peleaLetal: true },
        // A6a: casilla (Fuerza y Agilidad), blindaje en "Bloquear daño" (casilla), letal en la
        // casilla del Puñetazo y el codazo, y la fila "Bloquear con el brazo biónico" (con la dote
        // Bloqueo).
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee_<instancia>" }, mecanismo: "eleccion_jugador", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "aumentos_bloquear_brazo" }, mecanismo: "eleccion_jugador", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee_<instancia>" }, mecanismo: "eleccion_jugador", estado: "construido" },
          { tipo: "accion", afecta: { modo: "accion_nueva", id: "aumentos_bloquear_brazo" }, mecanismo: "accion_equipo", estado: "construido" },
        ],
      },
      {
        nivel: 3,
        rareza: "Extraño",
        coste: 50000,
        detalle: [
          "El usario puede escoger entre un modelo fuerte o ágil:",
        ],
        variantes: [
          {
            id: "fuerte",
            label: "Modelo Fuerte",
            detalle: ["+2 a puntuación de fuerza sobre la del usuario con límite máximo de 7, la agilidad es idéntica a la del usuario. El modelo fuerte tiene un blindaje de 6 puntos."],
            extremidad: { fuerza: { delta: 2, tope: 7 }, agilidad: { delta: 0 }, blindaje: 6, bloquea: true, peleaLetal: true },
          },
          // "Como el nivel 2": su Fuerza (+1, tope 5) y su blindaje (3), más la Agilidad (usuario, 2026-10-22).
          {
            id: "agil",
            label: "Modelo Ágil",
            detalle: ["Como el nivel 2 pero con un aumento de +1 en la agilidad sobre el usuario con límite de 5."],
            extremidad: { fuerza: { delta: 1, tope: 5 }, agilidad: { delta: 1, tope: 5 }, blindaje: 3, bloquea: true, peleaLetal: true },
          },
        ],
        modificadores: [],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee_<instancia>" }, mecanismo: "eleccion_jugador", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "aumentos_bloquear_brazo" }, mecanismo: "eleccion_jugador", estado: "construido" },
        ],
      },
      {
        nivel: 4,
        rareza: "Muy Extraño",
        coste: 100000,
        detalle: [
          "Tres modelos a elegir:",
        ],
        variantes: [
          {
            id: "fuerte",
            label: "Modelo Fuerte",
            detalle: ["+4 a puntuación de fuerza sobre la del usuario con límite máximo de 10, la agilidad es idéntica a la del usuario. El modelo fuerte tiene un blindaje de 8 puntos."],
            extremidad: { fuerza: { delta: 4, tope: 10 }, agilidad: { delta: 0 }, blindaje: 8, bloquea: true, peleaLetal: true },
          },
          {
            id: "equilibrado",
            label: "Modelo Equilibrado",
            detalle: ["+2 a puntuación de fuerza sobre la del usuario con límite de 7, la agilidad es de +2 en la agilidad sobre el usuario con límite de 6. El modelo equilibrado tiene un blindaje de 6 puntos."],
            extremidad: { fuerza: { delta: 2, tope: 7 }, agilidad: { delta: 2, tope: 6 }, blindaje: 6, bloquea: true, peleaLetal: true },
          },
          {
            id: "agil",
            label: "Modelo Ágil",
            detalle: ["La fuerza del brazo es +1 punto superior a la del usuario pero con límite de 5, aumento de +3 en la agilidad sobre el usuario con límite de 8. Su puntuación de blindaje es de 3 puntos."],
            extremidad: { fuerza: { delta: 1, tope: 5 }, agilidad: { delta: 3, tope: 8 }, blindaje: 3, bloquea: true, peleaLetal: true },
          },
        ],
        modificadores: [],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee_<instancia>" }, mecanismo: "eleccion_jugador", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "aumentos_bloquear_brazo" }, mecanismo: "eleccion_jugador", estado: "construido" },
        ],
      },
    ],
  },
  {
    familia: "implante",
    id: "aum_ojo_bionico",
    label: "Ojo Biónico",
    resumen: "Bonos a percepción visual y a distancia, visión nocturna y térmica, rayos X y, en niveles altos, inmunidad a la ceguera.",
    descripcion: "El Ojo Biónico reemplaza el globo ocular orgánico por un complejo ensamblaje optoelectrónico integrado directamente en el nervio óptico y el córtex visual. Utiliza microcristales de enfoque activo, sensores de espectro variable y un coprocesador gráfico dedicado que procesa la información en tiempo real, eliminando el temblor natural de la pupila biológica, filtrando destellos cegadores y superponiendo una interfaz de datos táctica directamente sobre el campo de visión del usuario.",
    sabotaje: true,
    electronico: true,
    extraible: null,
    niveles: [
      {
        nivel: 1,
        rareza: "Poco Habitual",
        coste: 16000,
        detalle: [
          "El personaje obtiene un bonificador de +1 a tiradas de percepción visual y a las de ataques a distancia.",
          "Además gana un bonificador de +2 en tiradas de salvación contra efectos de ceguera. La mejora no se apila con miras telescópicas u otros objetos de visión aumentada; en tal caso, usa siempre el mayor bonificador.",
          "Incluye visión nocturna y termo-óptica con un alcance de 500 metros.",
        ],
        modificadores: [
          { tipo: "tirada", alcance: DISTANCIA, valor: 1, noApila: VISION_AUMENTADA },
          { tipo: "derivado", id: "alerta", valor: 1, noApila: VISION_AUMENTADA },
        ],
        condiciones: [casillaVisualOjo(1)],
        salvaciones: [{ contra: ["ceguera"], bono: 2 }],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "alerta_activa" }, mecanismo: "eleccion_jugador", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "grupoHabilidad:Ataques+combate_distancia" }, mecanismo: "siempre_activo", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "eleccion_jugador", estado: "construido" },
          { tipo: "texto", afecta: { modo: "accion_existente", id: "alerta_activa" }, mecanismo: "eleccion_jugador", estado: "pendiente" },
        ],
      },
      {
        nivel: 2,
        rareza: "Extraño",
        coste: 32000,
        detalle: [
          "El implante aumenta el bonificador en tiradas de percepción visual a +2 y se hace inmune a efecto de ceguera.",
          "El ojo incluye un sistema de seguimiento predictivo que permite ignorar penalizadores menores por cobertura visual, reduciendo en 1 los niveles de cobertura visual y termo-óptica.",
        ],
        // El nivel 2 no sube el bono a distancia: sigue el +1 del nivel 1.
        modificadores: [
          { tipo: "derivado", id: "alerta", valor: 2, noApila: VISION_AUMENTADA },
        ],
        // A3: la cobertura visual (−1 nivel) llega en el nivel 2; el 1 no la trae.
        condiciones: [casillaVisualOjo(2), ...casillasCobertura("aum_ojo", 1, false)],
        // A7: "inmune a efecto de ceguera". Si cubre una ceguera física lo arbitra el máster con
        // "Aplicar igualmente" (pregunta a Murillo, §11.2).
        inmuneA: ["ceguera"],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "alerta_activa" }, mecanismo: "eleccion_jugador", estado: "construido" },
          { tipo: "habilitador", afecta: { modo: "accion_existente", id: "estado:ceguera" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "grupoHabilidad:Ataques+combate_distancia" }, mecanismo: "eleccion_jugador", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "alerta_activa" }, mecanismo: "eleccion_jugador", estado: "construido" },
        ],
      },
      {
        nivel: 3,
        rareza: "Muy Extraño",
        coste: 64000,
        detalle: [
          "El ojo aumenta sus bonificadores, otorga un bonificador de +3 a tiradas de percepción visual y otro de +2 a las de ataques a distancia.",
          "Incorpora visión de rayos X que permite ver a través de tejidos sencillos con un alcance de 10 metros.",
        ],
        modificadores: [
          { tipo: "tirada", alcance: DISTANCIA, valor: 2, noApila: VISION_AUMENTADA },
          { tipo: "derivado", id: "alerta", valor: 3, noApila: VISION_AUMENTADA },
        ],
        condiciones: [casillaVisualOjo(3)],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "alerta_activa" }, mecanismo: "eleccion_jugador", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "grupoHabilidad:Ataques+combate_distancia" }, mecanismo: "siempre_activo", estado: "construido" },
          { tipo: "texto", afecta: { modo: "accion_existente", id: "alerta_activa" }, mecanismo: "nota_fija", estado: "pendiente" },
        ],
      },
      {
        nivel: 4,
        rareza: "Muy Extraño",
        coste: 128000,
        detalle: [
          "El cenit de la tecnología optoelectrónica táctica. El personaje obtiene un bonificador de +4 a tiradas de percepción visual y un +3 a las de ataques a distancia, siendo completamente inmune a la ceguera.",
          "Integra un sistema de visión multi-espectro simultáneo (nocturna, térmica y rayos X con un alcance de 50 metros a través de paredes ligeras o blindajes no reforzados) y un procesador de seguimiento que reduce en dos niveles por completo los penalizadores por cobertura visual.",
        ],
        modificadores: [
          { tipo: "tirada", alcance: DISTANCIA, valor: 3, noApila: VISION_AUMENTADA },
          { tipo: "derivado", id: "alerta", valor: 4, noApila: VISION_AUMENTADA },
        ],
        // A3: −2 niveles de cualquier cobertura, física o visual (sustituye a la del nivel 2).
        condiciones: [casillaVisualOjo(4), ...casillasCobertura("aum_ojo", 2, true)],
        // A7: "completamente inmune a la ceguera" (ya la trae el 2; se repite por la fuente del texto).
        inmuneA: ["ceguera"],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "alerta_activa" }, mecanismo: "eleccion_jugador", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "grupoHabilidad:Ataques+combate_distancia" }, mecanismo: "siempre_activo", estado: "construido" },
          { tipo: "habilitador", afecta: { modo: "accion_existente", id: "estado:ceguera" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "construido" },
          { tipo: "texto", afecta: { modo: "accion_existente", id: "alerta_activa" }, mecanismo: "nota_fija", estado: "pendiente" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "grupoHabilidad:Ataques+combate_distancia" }, mecanismo: "eleccion_jugador", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "alerta_activa" }, mecanismo: "eleccion_jugador", estado: "construido" },
        ],
      },
    ],
  },
  {
    familia: "implante",
    id: "aum_neuroprotesis_simpatica",
    label: "Neuroprótesis Simpática",
    resumen: "Se activa pagando fatiga: más Fuerza, Agilidad y Percepción durante unos turnos, y reacciones y acciones extra.",
    descripcion: "Implante biotecnológico acoplado al sistema nervioso autónomo y a las glándulas suprarrenales que fuerza una respuesta de \"lucha o huida\" bajo demanda: microestimuladores sinápticos y microbombas de neuromoduladores aceleran reflejos, contracción muscular y agudeza sensorial a cambio de exprimir la resistencia biológica del usuario.",
    sabotaje: true,
    electronico: true,
    extraible: null,
    niveles: [
      {
        nivel: 1,
        rareza: "Poco Habitual",
        coste: 20000,
        detalle: [
          "Como acción gratuita durante su turno o reacción en cualquier momento del turno, el personaje puede emplear 2 puntos de fatiga y de forma temporal adquirir un aumento de 1 punto en los atributos de fuerza, agilidad y percepción así como reducir penalizadores por estado en 1, en contrapartida mientras dure este efecto recibe un penalizador de -1 a tiradas de salvación de fortaleza contra enfermedades, radiación, toxinas y venenos. El efecto dura tres turnos.",
        ],
        modificadores: [],
        // A5a: "tres turnos" = 3 rondas (R2). Las rondas solo corren en combate.
        acciones: [activarNeuroprotesis(false)],
        activo: ACTIVO_NEUROPROTESIS,
        motor: [
          { tipo: "accion", afecta: { modo: "accion_nueva", id: "aumentos_activar_neuroprotesis" }, mecanismo: "accion_equipo", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "atributo:fuerza" }, mecanismo: "suma_derivado", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "atributo:agilidad" }, mecanismo: "suma_derivado", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "atributo:percepcion" }, mecanismo: "suma_derivado", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "eleccion_jugador", estado: "construido" },
          { tipo: "texto", afecta: { modo: "accion_existente", id: "aumentos_activar_neuroprotesis" }, mecanismo: "nota_fija", estado: "construido" },
        ],
      },
      {
        nivel: 2,
        rareza: "Extraño",
        coste: 40000,
        detalle: [
          "Al activar el implante se recibe un aumento de 2 puntos en lugar de 1 en la fuerza o la agilidad, quedando a elección del usuario.",
        ],
        modificadores: [],
        // A5a: la misma acción, ahora con la elección; el +2 sustituye al +1 en el elegido.
        acciones: [activarNeuroprotesis(true)],
        activo: { ...ACTIVO_NEUROPROTESIS, mejora: { atributos: ["fuerza", "agilidad"], valor: 2 } },
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "atributo:fuerza|agilidad" }, mecanismo: "suma_derivado", estado: "construido" },
        ],
      },
      {
        nivel: 3,
        rareza: "Muy Extraño",
        coste: 80000,
        detalle: [
          "Mientras el implante esté activo, se obtiene una segunda reacción por turno.",
          "El personaje puede adquirir una única acción simple adicional durante su turno por el gasto de 2 puntos de fatiga. Una vez empleada esta habilidad, volver a usarla tendrá un coste de 3 puntos de fatiga, hasta que el personaje realice un descanso breve o largo.",
        ],
        modificadores: [],
        // A5b: la segunda reacción, texto mientras está activa; la acción adicional, sin activarla.
        acciones: [activarNeuroprotesis(true, true), accionAdicionalNeuroprotesis(false)],
        activo: ACTIVO_NEUROPROTESIS_3,
        motor: [
          { tipo: "texto", afecta: { modo: "accion_existente", id: "aumentos_activar_neuroprotesis" }, mecanismo: "nota_fija", estado: "construido" },
          { tipo: "accion", afecta: { modo: "accion_nueva", id: "aumentos_accion_simple_adicional" }, mecanismo: "accion_equipo", estado: "construido" },
        ],
      },
      {
        nivel: 4,
        rareza: "Muy Extraño",
        coste: 160000,
        detalle: [
          "Si el personaje emplea 3 puntos de fatiga para conseguir una acción simple adicional durante un turno además durante ese turno obtiene un aumento de +2 a fuerza, agilidad y percepción de forma simultánea y elimina por completo penalizadores por heridas o fatiga. Esta habilidad de nivel 4 no se puede volver a usar hasta que el personaje realice un descanso breve o largo.",
        ],
        modificadores: [],
        // A5b: la misma acción, ahora con el estado de 1 ronda al pagar 3.
        acciones: [accionAdicionalNeuroprotesis(true)],
        activos: [ACTIVO_NEUROPROTESIS_4],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "atributo:fuerza" }, mecanismo: "suma_derivado", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "atributo:agilidad" }, mecanismo: "suma_derivado", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "atributo:percepcion" }, mecanismo: "suma_derivado", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
          { tipo: "texto", afecta: { modo: "accion_existente", id: "aumentos_accion_simple_adicional" }, mecanismo: "nota_fija", estado: "construido" },
        ],
      },
    ],
  },
  {
    familia: "implante",
    id: "aum_enjambre_nanobot",
    label: "Enjambre Nanobot",
    resumen: "Nanobots: +3 con fármacos, regeneración, blindaje reactivo y, en nivel 4, Tempestad Nanobótica.",
    descripcion: "Colonia masiva de micro-máquinas programables integrada en el torrente sanguíneo, el tejido linfático y las capas subdérmicas. Concebido como quirófano móvil de emergencia, reestructura tejidos, purga toxinas, blinda el organismo y puede proyectarse de forma ofensiva o táctica.",
    sabotaje: true,
    electronico: true,
    extraible: null,
    niveles: [
      {
        nivel: 1,
        rareza: "Poco Habitual",
        coste: 25000,
        detalle: [
          "Gracias a este implante, el personaje puede utilizar drogas y medicamentos con un bonificador de +3 exclusivamente cuando las utilice de modo personal. Si un tercero utiliza medicinas para sanar al personaje con este implante, también gana el mismo bonificador.",
        ],
        modificadores: [],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "medicina" }, mecanismo: "eleccion_jugador", estado: "pendiente" },
          { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "medicina" }, mecanismo: "nota_fija", estado: "pendiente" },
        ],
      },
      {
        nivel: 2,
        rareza: "Extraño",
        coste: 50000,
        detalle: [
          "Gracias a unos nanobots de microcirugía, el personaje que adquiera este aumento biónico regenera un nivel de daño no letal por turno, uno letal por minuto (10 turnos) y uno grave por hora. Además si consume un nivel fatiga podrá sanar un nivel letal de forma automática, y si consume 5 a lo largo de un mínimo de 5 turnos, podrá sanar uno grave. Este implante en su función pasiva funciona siempre y cuando el personaje no tenga penalizadores por fatiga.",
        ],
        modificadores: [],
        // A4a. "Sin penalizadores por fatiga" es solo de la regeneración pasiva (que no entra
        // aquí), no de estas dos.
        acciones: [
          {
            id: "aumentos_enjambre_sanar_letal",
            label: "Sanar letal",
            economia: "Acción gratuita, una vez por ronda",
            costeFatiga: 1,
            nota: "Sanas un nivel de daño letal de forma automática: +1 a la vida actual, sin pasar del máximo.",
            efecto: { tipo: "vida", delta: 1 },
          },
          {
            id: "aumentos_enjambre_sanar_grave",
            label: "Sanar grave",
            economia: "Un punto por turno, pudiendo actuar",
            costeFatiga: 1,
            nota: "Cada pulsación cobra 1 de fatiga. 5 turnos seguidos; al quinto, súmate 1 de vida a mano.",
          },
        ],
        motor: [
          { tipo: "texto", afecta: { modo: "accion_existente", id: "ficha" }, mecanismo: "nota_fija", estado: "pendiente" },
          { tipo: "accion", afecta: { modo: "accion_nueva", id: "aumentos_enjambre_sanar_letal" }, mecanismo: "accion_equipo", estado: "construido" },
          { tipo: "accion", afecta: { modo: "accion_nueva", id: "aumentos_enjambre_sanar_grave" }, mecanismo: "accion_equipo", estado: "construido" },
        ],
      },
      {
        nivel: 3,
        rareza: "Muy Extraño",
        coste: 100000,
        detalle: [
          "El enjambre evoluciona hacia una red defensiva y de purga sistémica avanzada. El usuario obtiene un bonificador de +4 en tiradas de salvación contra toxinas, venenos y enfermedades.",
          "Además, como reacción y con el gasto de un punto de fatiga el enjambre puede densificarse de forma reactiva bajo la dermis, otorgando 3 puntos de blindaje contra un golpe específico. Si el impacto causa atudimiento el usuario recibe un bonificador de +3 contra el efecto.",
        ],
        modificadores: [],
        salvaciones: [{ contra: ["toxinas", "venenos", "enfermedad"], bono: 4 }],
        // A4b: casilla en "Bloquear daño" que cobra al marcarla. El +3 contra el aturdimiento de
        // ese golpe, como nota.
        blindajeReactivo: {
          etiqueta: "Densificar",
          valor: 3,
          costeFatiga: 1,
          nota: "Reacción, contra este golpe. Si te aturde, +3 a la salvación contra el aturdimiento (márcalo en el circunstancial).",
        },
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "eleccion_jugador", estado: "construido" },
          { tipo: "accion", afecta: { modo: "accion_nueva", id: "aumentos_enjambre_densificar" }, mecanismo: "accion_equipo", estado: "construido" },
        ],
      },
      {
        nivel: 4,
        rareza: "Muy Extraño",
        coste: 200000,
        detalle: [
          "El cénit de la simbiosis nanotecnológica. El enjambre rompe las limitaciones biológicas previas: la regeneración pasiva del implante funciona incluso si el personaje se encuentra fatigado o exhausto, y duplica su velocidad mientras no esté fatigado (regenera un nivel de daño no letal por acción, uno letal por turno y uno grave por cada 10 turnos).",
          "Además, introduce la capacidad de Tempestad Nanobótica: como acción estándar y gastando 2 puntos de fatiga, el usuario puede forzar al enjambre a desbordarse momentáneamente a través de la piel para atacar o sabotear el entorno inmediato. El ataque se resuelve como acción estándar, su alcance es melee y requiere de una tirada de reflejos + tecnociencia. Su daño básico es de 1 Grave, y es cuando acierta al blindaje destruye 1 punto por contacto físico. De la misma forma se puede emplear para sabotear objetos.",
        ],
        modificadores: [],
        // A4b (usuario, 2026-10-22): 1 grave fijo, sin sumar éxitos; dificultad 0 (la de un
        // ataque por defecto). Quitar blindaje y sabotear, como nota.
        acciones: [
          {
            id: "aumentos_tempestad_nanobotica",
            label: "Tempestad Nanobótica",
            economia: "Acción estándar, cuerpo a cuerpo",
            costeFatiga: 2,
            nota: "Daño 1 grave fijo: los éxitos no suman. También sirve para sabotear objetos (esa tirada no está definida: la decide el máster).",
            tirada: {
              aplicado: "reflejos",
              habilidad: "tecnociencia",
              dificultad: 0,
              ataque: { danio: 1, categoria: "Grave" },
              efectos: ["Cada acierto destruye 1 punto de blindaje del objetivo por contacto físico: que se lo reste a mano."],
            },
          },
        ],
        motor: [
          { tipo: "texto", afecta: { modo: "accion_existente", id: "ficha" }, mecanismo: "nota_fija", estado: "pendiente" },
          { tipo: "accion", afecta: { modo: "accion_nueva", id: "aumentos_tempestad_nanobotica" }, mecanismo: "accion_equipo", estado: "construido" },
          { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "blindaje_del_objetivo" }, mecanismo: "nota_fija", estado: "construido" },
        ],
      },
    ],
  },
];

export const AUMENTOS: Aumento[] = [...OPERACIONES_GENETICAS, ...IMPLANTES];
