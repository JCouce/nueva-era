import type { NivelModulo } from "./equipo";
import type { MotorMetadata } from "../rules/motor";
import type { EfectoAlRecibir } from "../rules/resistirDanio";
import type { ModoOcultacion, Ocultacion } from "../rules/sigilo";
import type { EfectoArma } from "../rules/efectosArma";
import { enCritico, salva, texto } from "./efectosArma";
import { FALLA_RADIACION } from "./municion";

export type Subsistema = {
  familia: "subsistema";
  id: string;
  label: string;
  resumen: string;
  descripcion: string;
  ranurasQueConsume: number; // siempre 1: lo que varía es cuántas admite la armadura
  // "Modos" en sentido amplio: de uso (Activo/Pasivo del camuflaje) o de
  // ataque (las cuatro filas del Proyector de Pulso) — mismo shape, distinto
  // significado según la pieza.
  modos: { label: string; descripcion: string }[];
  accionActivacion: string;
  // Opcional: el Escudo Deflector no usa el sistema estándar de 10 cargas +
  // batería (es autorrecargable con el movimiento y los impactos), así que se
  // omite en vez de forzarlo a encajar.
  celula?: { cargas: number; recarga: string; bateriaCoste: number };
  notaApilamiento?: string;
  // Lo que sus ataques le hacen al objetivo (Proyector de Pulso, eq-23), por modo de ataque
  // (`soloEn.modo`, la etiqueta del modo) y por modo adicional (`soloEn.opcion` / `salvoEn`). Las
  // dificultades «N + Nivel» de la fuente van como N: el motor les suma el nivel instalado
  // (efectosDelProyector, combate.ts).
  efectosObjetivo?: EfectoArma[];
  niveles: NivelModulo[];
};

// Proyector de Pulso: el selector «Modo adicional» de sus ataques (eq-23, Murillo: se eligen
// libremente) y sus efectos sobre el objetivo, como dato (docs/fuente/equipamiento.md, tabla
// «Modo de Ataque» y niveles 2-4). Etiquetas de los modos de ataque, las de la tabla.
export const ID_MODO_ADICIONAL = "modo_adicional";
const PULSO = "Pulso";
const CARGADO = "Pulso Cargado";
const BARRIDO = "Barrido";
const AGUIJON = "Aguijón";
// «Shock (4 + Nivel)», «(6 + Nivel)», «(7 + Nivel)» y el Aguijón «(4 + Nivel)».
const SHOCK_POR_MODO: [string, number][] = [[PULSO, 4], [CARGADO, 6], [BARRIDO, 7], [AGUIJON, 4]];
// «Crítico: Hemorragia» en Pulso, Pulso Cargado y Aguijón; el Barrido no trae crítico, así que los
// modos adicionales («cambiando el efecto crítico convencional por…») no le ponen ninguno.
const CON_CRITICO = [PULSO, CARGADO, AGUIJON];
const conModo = (ids: string[]) => ({ condicion: ID_MODO_ADICIONAL, ids });
// TODO(revisar): la tabla no da duración a la Hemorragia del Proyector (las armas dicen 1dN turnos).
const HEMORRAGIA_PULSO: EfectoArma = {
  tipo: "estado",
  estadoId: "hemorragia",
  duracion: { tipo: "sinDuracion", motivo: "la tabla no da su duración (la decide el máster)" },
  cuando: "critico",
};
const EFECTOS_PROYECTOR_PULSO: EfectoArma[] = [
  // Lo convencional: el Shock de cada modo (Disrupción de Campo lo sube) y la Hemorragia de crítico
  // (los tres modos adicionales la sustituyen).
  ...SHOCK_POR_MODO.map(([m, d]): EfectoArma => ({ ...salva("shock", d), soloEn: { modo: [m] }, salvoEn: { opcion: conModo(["disrupcion"]) } })),
  { ...HEMORRAGIA_PULSO, soloEn: { modo: CON_CRITICO }, salvoEn: { opcion: conModo(["flux", "fotones", "disrupcion"]) } },
  // Flux Radiactivo: «Envenenamiento por Radiación (dificultad de resistencia: 8 + Nivel)» en vez
  // del crítico. Lo que pasa al fallarla, como la Munición Radiactiva (la fuente llama a lo de esa
  // munición «envenenado por radiación»). TODO(revisar): la fuente no da los grados aquí.
  { ...enCritico({ ...salva("envenenamiento", 8), tabla: FALLA_RADIACION }), soloEn: { modo: CON_CRITICO, opcion: conModo(["flux"]) } },
  // Fotones Coherentes: «causa el efecto de Llamarada (con salvación idéntica al shock)» y
  // «sustituye el crítico convencional por Ceguera (dificultad: 8 + Nivel)». El daño a Fuego, en el
  // modo (`danio`).
  ...SHOCK_POR_MODO.map(([m, d]): EfectoArma => ({ ...salva("llamarada", d), soloEn: { modo: [m], opcion: conModo(["fotones"]) } })),
  { ...enCritico(salva("ceguera", 8)), soloEn: { modo: CON_CRITICO, opcion: conModo(["fotones"]) } },
  // Disrupción de Campo: «El efecto de shock incrementa su dificultad en 1» y, en crítico, «destruye
  // el blindaje o armadura del objetivo, consumiendo 1 punto (si el objetivo carece de blindaje,
  // causa Hemorragia de forma normal)».
  ...SHOCK_POR_MODO.map(([m, d]): EfectoArma => ({ ...salva("shock", d + 1), soloEn: { modo: [m], opcion: conModo(["disrupcion"]) } })),
  {
    ...enCritico(texto("Destruye 1 punto de blindaje o armadura del objetivo (si no tiene blindaje, Hemorragia normal)")),
    soloEn: { modo: CON_CRITICO, opcion: conModo(["disrupcion"]) },
  },
];

// Malla Plasmática, devolver el golpe (eq-24 del cuestionario, usuario 2026-11-13): «Si el
// usuario es impactado por un golpe melee devuelve daño al objeto con el que es golpeado o al
// sujeto en caso de ser un golpe desarmado, el daño es de plasma y es igual al nivel de
// subsistema»; en el nivel 4, «además se causa los efectos de shock y llamarada (dificultad 8)».
// Casilla en Resistir daño que solo avisa: la app no calcula nada sobre el atacante.
// TODO(revisar): la prosa no dice si hace falta la Malla activa (el colchón sí lo dice); la
// casilla sale con la pieza puesta, esté activa o no.
function devolverGolpe(nivel: number): EfectoAlRecibir {
  return {
    tipo: "aviso",
    id: "malla_devuelve",
    etiqueta: "Golpe cuerpo a cuerpo",
    aviso:
      `Devuelves ${nivel} de plasma al objeto con el que te golpean (al atacante, si es desarmado)` +
      (nivel >= 4 ? ", y Shock y Llamarada (8)." : "."),
  };
}

const MALLA_DEVUELVE: MotorMetadata = {
  tipo: "texto",
  afecta: { modo: "objetivo_tercero", id: "ataque_melee" },
  mecanismo: "eleccion_jugador",
  estado: "construido",
};

// Camuflaje Trifásico como dato (T4 del cuestionario, eq-25 y eq-26, usuario 2026-11-13): por
// nivel, la duración y la cobertura (visual / térmica / acústica) de cada modo activo y la pasiva.
// «Activar camuflaje» pone el estado Camuflaje con el modo elegido y su duración (1 minuto = 10
// turnos, criterio de la psiónica); mientras dura, su cobertura se suma por sentido a tu Sigilo y
// la esquiva sale con «Tengo cobertura» marcada. La pasiva suma mientras le quede carga.
const modo = (id: "estatico" | "dinamico", turnos: number, duracion: string, [visual, termica, acustica]: [number, number, number]): ModoOcultacion => ({
  id,
  etiqueta: id === "estatico" ? "Estático" : "Dinámico",
  turnos,
  duracion,
  cobertura: { visual, termica, acustica },
});
const OCULTACION_CAMUFLAJE: Record<1 | 2 | 3 | 4, Ocultacion> = {
  1: { modos: [modo("estatico", 100, "10 minutos", [3, 3, 4]), modo("dinamico", 5, "5 turnos", [2, 1, 2])], pasiva: { termica: 1, acustica: 1 } },
  2: { modos: [modo("estatico", 200, "20 minutos", [4, 4, 4]), modo("dinamico", 10, "10 turnos", [2, 1, 2])], pasiva: { termica: 1, acustica: 1 } },
  3: { modos: [modo("estatico", 300, "30 minutos", [4, 4, 4]), modo("dinamico", 15, "15 turnos", [3, 2, 3])], pasiva: { termica: 2, acustica: 2 } },
  4: { modos: [modo("estatico", 600, "1 hora", [4, 4, 4]), modo("dinamico", 20, "20 turnos", [4, 3, 3])], pasiva: { termica: 3, acustica: 3 } },
};
const MOTOR_CAMUFLAJE: MotorMetadata[] = [
  // La cobertura por sentido, sumada a tu estado Sigilo al enseñarlo (rules/sigilo.ts).
  { tipo: "numerico", afecta: { modo: "accion_existente", id: "sigilo" }, mecanismo: "suma_derivado", estado: "construido" },
  // Activo: «Tengo cobertura» (+2) ya marcada en la esquiva (eq-26; Estado.marcaCasillas).
  { tipo: "numerico", afecta: { modo: "accion_existente", id: "defensa" }, mecanismo: "eleccion_jugador", estado: "construido" },
  // «Activar camuflaje», acción sin dado que gasta 1 carga y pone el estado (accionActivarCamuflaje, combate.ts).
  { tipo: "accion", afecta: { modo: "accion_nueva", id: "activar_camuflaje" }, mecanismo: "accion_equipo", estado: "construido" },
];

export const SUBSISTEMAS: Subsistema[] = [
  {
    familia: "subsistema",
    id: "camuflaje_trifasico",
    label: "Camuflaje Trifásico",
    resumen: "Oculta al usuario en tres frentes a la vez: visual, térmico y acústico.",
    descripcion:
      "La tecnología de infiltración definitiva para trajes y armaduras avanzadas. Se divide en " +
      "tres fases de ocultación simultánea: Ocultación Visual (altera el índice de refracción de " +
      "la superficie), Ocultación Térmica (enmascara la firma de calor corporal) y Ocultación " +
      "Acústica (amortigua el sonido de los movimientos). El campo puede expandirse ligeramente " +
      "para ocultar objetos en contacto directo con el portador, de tamaño limitado.",
    ranurasQueConsume: 1,
    accionActivacion: "Activar el camuflaje es una acción gratuita y consume una carga.",
    celula: { cargas: 10, recarga: "1 hora con conector (1 carga cada 6 minutos)", bateriaCoste: 150 },
    modos: [
      {
        label: "Modo Activo",
        descripcion:
          "Máxima eficiencia de ocultación; permite una acción simple para esconderse. Estático " +
          "(inmóvil, rendimiento óptimo) o Dinámico (movimientos bruscos o ataques, menos eficiencia).",
      },
      {
        label: "Modo Pasivo",
        descripcion:
          "Protección básica continua contra sensores infrarrojos y sónar mientras el sistema " +
          "mantenga una carga mínima en espera. Se pierde si se agotan las baterías o se apaga.",
      },
    ],
    notaApilamiento:
      "El beneficio de cobertura se aúna con las coberturas convencionales. De entre ambas, la de " +
      "menor puntuación suma solo la mitad de su valor al penalizador total.",
    niveles: [
      {
        nivel: 1,
        rareza: "Poco Habitual",
        coste: 8000,
        detalle: [
          "Duración modo activo: 10 min estático / 5 turnos dinámico.",
          "Cobertura activa estático (Visual/Térmica/Acústica): 3 / 3 / 4.",
          "Cobertura activa dinámico (Visual/Térmica/Acústica): 2 / 1 / 2.",
          "Cobertura pasiva (Térmica/Acústica): 1 / 1.",
        ],
        // Sin modificadores: la cobertura depende del modo, va como dato en `ocultacion` (T4).
        modificadores: [],
        ocultacion: OCULTACION_CAMUFLAJE[1],
        motor: MOTOR_CAMUFLAJE,
      },
      {
        nivel: 2,
        rareza: "Extraño",
        coste: 48000,
        detalle: [
          "Duración modo activo: 20 min estático / 10 turnos dinámico.",
          "Cobertura activa estático (Visual/Térmica/Acústica): 4 / 4 / 4.",
          "Cobertura activa dinámico (Visual/Térmica/Acústica): 2 / 1 / 2.",
          "Cobertura pasiva (Térmica/Acústica): 1 / 1.",
        ],
        modificadores: [],
        ocultacion: OCULTACION_CAMUFLAJE[2],
        motor: MOTOR_CAMUFLAJE,
      },
      {
        nivel: 3,
        rareza: "Muy Extraño",
        coste: 96000,
        detalle: [
          "Duración modo activo: 30 min estático / 15 turnos dinámico.",
          "Cobertura activa estático (Visual/Térmica/Acústica): 4 / 4 / 4.",
          "Cobertura activa dinámico (Visual/Térmica/Acústica): 3 / 2 / 3.",
          "Cobertura pasiva (Térmica/Acústica): 2 / 2.",
        ],
        modificadores: [],
        ocultacion: OCULTACION_CAMUFLAJE[3],
        motor: MOTOR_CAMUFLAJE,
      },
      {
        nivel: 4,
        rareza: "Muy Extraño",
        coste: 144000,
        detalle: [
          "Duración modo activo: 1 hora estático / 20 turnos dinámico.",
          "Cobertura activa estático (Visual/Térmica/Acústica): 4 / 4 / 4.",
          "Cobertura activa dinámico (Visual/Térmica/Acústica): 4 / 3 / 3.",
          "Cobertura pasiva (Térmica/Acústica): 3 / 3.",
        ],
        modificadores: [],
        ocultacion: OCULTACION_CAMUFLAJE[4],
        motor: MOTOR_CAMUFLAJE,
      },
    ],
  },
  {
    familia: "subsistema",
    id: "derivacion_psionica",
    label: "Derivación Psiónica",
    resumen: "Absorbe la fatiga de manifestar poderes psiónicos desviándola a la batería.",
    descripcion:
      "Pieza de ingeniería avanzada para operadores psiónicos. Canalizar la energía de la mente " +
      "pura genera un estrés electroquímico y térmico devastador sobre el sistema nervioso " +
      "central, provocando fatiga extrema y colapsos sinápticos. Integra una red de filamentos " +
      "superconductores y micro-condensadores de resonancia cuántica en el forro interno, y actúa " +
      "como capacitor de desahogo mental: intercepta el exceso de la onda psiónica durante la " +
      "manifestación de poderes y lo deriva de forma segura a la batería principal.",
    ranurasQueConsume: 1,
    accionActivacion:
      "Gastar cargas de la célula para mitigar la fatiga psiónica acumulada se declara al usar el poder.",
    celula: { cargas: 10, recarga: "1 hora con conector (1 carga cada 6 minutos)", bateriaCoste: 150 },
    modos: [],
    niveles: [
      {
        nivel: 1,
        rareza: "Extraño",
        coste: 12000,
        detalle: [
          "Conversión Psiónica: 4 cargas para absorber 1 punto de fatiga psiónica.",
          "Ventaja Táctica — Estabilizador Neuronal Básico: +1 a las tiradas para resistir los " +
            "efectos del sobreesfuerzo por el uso de disciplinas psiónicas.",
        ],
        modificadores: [
          // Sync Drive 2026-11-14 (tumba eq-27): +1 a la salvación de Voluntad del sobreesfuerzo
          // (montarSobreesfuerzo, usoPoder.ts), como línea propia. Desde el nivel 1, acumulado (S9).
          { tipo: "tirada", alcance: { tipo: "tiradaId", id: "salv_sobreesfuerzo" }, valor: 1 },
        ],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "poderes_psionicos" }, mecanismo: "eleccion_jugador", estado: "construido" }, // Conversión Psiónica: contador "Pagar con cargas" en el modal de todo poder (derivacionDeFicha, poderes.ts)
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_sobreesfuerzo" }, mecanismo: "siempre_activo", estado: "construido" }, // Estabilizador Neuronal Básico
        ],
      },
      {
        nivel: 2,
        rareza: "Muy Extraño",
        coste: 72000,
        detalle: [
          "Conversión Psiónica: 3 cargas por 1 punto de fatiga.",
          "Ventaja Táctica — Canal de Alta Resonancia: +10% de alcance efectivo de los poderes " +
            "(mínimo 2 metros, redondeando a la baja).",
        ],
        // S9: la ventaja de nivel 1 ya llega acumulada (acumulaPorClave() en
        // equipo.ts) — repetirla aquí la duplicaría el día que Fase 5 la
        // desbloquee. El +10% de alcance no tiene número fijo que mecanizar.
        modificadores: [],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "poderes_psionicos" }, mecanismo: "eleccion_jugador", estado: "construido" }, // cambia la eficiencia (3 cargas), la acción ya se declaró en nivel 1
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_sobreesfuerzo" }, mecanismo: "siempre_activo", estado: "construido" }, // Estabilizador Neuronal, heredado (S9)
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "poderes_psionicos" }, mecanismo: "suma_derivado", estado: "construido" }, // Canal de Alta Resonancia: +10 % al alcance en metros, mínimo 2 m (bonoAlcanceDeFicha, poderes.ts; pregunta 33 cerrada)
        ],
      },
      {
        nivel: 3,
        rareza: "Muy Extraño",
        coste: 144000,
        detalle: [
          "Conversión Psiónica: 2 cargas por 1 punto de fatiga.",
          "Ventaja Táctica — Blindaje Psico-Reactivo: +1 para resistir efectos de poderes de " +
            "metasensoria contra el usuario.",
        ],
        // Solo lo NUEVO de este nivel — salv_sobreesfuerzo (nivel 1)
        // y el +10% de alcance (nivel 2, sin número) ya llegan acumulados.
        modificadores: [],
        // Resistir un poder de metasensoría es una salvación: casilla en las tres
        // (el jugador la marca cuando la salvación es contra metasensoría).
        condiciones: [
          {
            id: "derivacion_blindaje_psicoreactivo",
            tipo: "toggle",
            etiqueta: "Contra metasensoría: Blindaje Psico-Reactivo +1",
            alcance: { tipo: "grupo", grupo: "Salvaciones" },
            valorActivo: 1,
          },
        ],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "poderes_psionicos" }, mecanismo: "eleccion_jugador", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_sobreesfuerzo" }, mecanismo: "siempre_activo", estado: "construido" }, // heredado de nivel 1 (S9)
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "poderes_psionicos" }, mecanismo: "suma_derivado", estado: "construido" }, // Canal de Alta Resonancia, heredado
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "Salvaciones" }, mecanismo: "eleccion_jugador", estado: "construido" }, // Blindaje Psico-Reactivo
        ],
      },
      {
        nivel: 4,
        rareza: "Singular",
        coste: 216000,
        detalle: [
          "Conversión Psiónica: 1 carga por 1 punto de fatiga (máxima eficiencia).",
          "Ventaja Táctica — Simbiosis Sináptica Total: reduce en 1 los penalizadores por fatiga " +
            "al hacer una tirada relacionada con el empleo de un poder psiónico. Además, +2 a las " +
            "tiradas para resistir los efectos del sobreesfuerzo.",
        ],
        // resistir_metasensoria (n3) llega acumulado. El +2 al sobreesfuerzo (sync Drive
        // 2026-11-14) se suma al +1 del nivel 1: misma clave que la de nivel 1, así que este
        // nivel declara el total (+3) y la sustituye (acumulaPorClave, S9).
        // Simbiosis Sináptica Total (S94): "reduce en 1 los penalizadores por fatiga cuando vaya a
        // realizar una tirada relacionada con el empleo de un poder psiónico" — compensación del
        // umbral de fatiga en las tiradas del grupo Psiónica (modificadoresDeUmbrales), sin
        // pasar de 0. No es un +1: sin penalizador por fatiga, no suma nada.
        modificadores: [{ tipo: "tirada", alcance: { tipo: "tiradaId", id: "salv_sobreesfuerzo" }, valor: 3 }],
        reducePenalizador: { recurso: "fatiga", valor: 1, alcance: { tipo: "grupo", grupo: "Psiónica" } },
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "poderes_psionicos" }, mecanismo: "eleccion_jugador", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_sobreesfuerzo" }, mecanismo: "siempre_activo", estado: "construido" }, // +1 del nivel 1 y +2 de este: +3 en total
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "poderes_psionicos" }, mecanismo: "suma_derivado", estado: "construido" }, // Canal de Alta Resonancia, heredado
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "Salvaciones" }, mecanismo: "eleccion_jugador", estado: "construido" }, // heredado de nivel 3 (S9)
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "grupo:Psiónica" }, mecanismo: "siempre_activo", estado: "construido" }, // Simbiosis Sináptica Total: −1 al penalizador por fatiga
        ],
      },
    ],
  },
  {
    familia: "subsistema",
    id: "escudo_deflector",
    label: "Escudo Deflector",
    resumen: "Campo de contención magnética que absorbe golpes físicos y de energía.",
    descripcion:
      "Generador de campos de contención magnética de alta densidad diseñado para interceptar " +
      "tanto los golpes físicos como los de energía, disipando la carga cinética y energética " +
      "mediante la manipulación del campo electromagnético circundante. Invisible hasta que recibe " +
      "un impacto, momento en el que genera un destello de interferencia. A diferencia de otros " +
      "subsistemas, tiene batería autorrecargable con el movimiento del usuario y, con las últimas " +
      "mejoras, también con los impactos. Puede desactivarse si se desea; es igual de susceptible " +
      "a sabotaje y sobrecarga que el resto.",
    ranurasQueConsume: 1,
    accionActivacion: "Activo mientras esté encendido; no consume cargas por turno.",
    modos: [],
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 4000,
        detalle: ["Absorción de 1 punto de daño físico o energético mientras esté activo."],
        // H5 (docs/sistema.md pregunta 29) construido 2026-09-27: absorcion
        // alimenta blindajeContra() (blindaje.ts), leído por "Resistir daño".
        absorcion: 1,
        modificadores: [],
        motor: [
          {
            tipo: "numerico",
            afecta: { modo: "accion_existente", id: "bloquear_danio" },
            mecanismo: "suma_derivado",
            estado: "construido",
          },
        ],
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 20000,
        detalle: ["Absorción de 2 puntos."],
        absorcion: 2,
        modificadores: [],
        motor: [
          {
            tipo: "numerico",
            afecta: { modo: "accion_existente", id: "bloquear_danio" },
            mecanismo: "suma_derivado",
            estado: "construido",
          },
        ],
      },
      {
        nivel: 3,
        rareza: "Poco Habitual",
        coste: 40000,
        detalle: ["Absorción de 3 puntos."],
        absorcion: 3,
        modificadores: [],
        motor: [
          {
            tipo: "numerico",
            afecta: { modo: "accion_existente", id: "bloquear_danio" },
            mecanismo: "suma_derivado",
            estado: "construido",
          },
        ],
      },
      {
        nivel: 4,
        rareza: "Extraño",
        coste: 80000,
        detalle: ["Absorción de 4 puntos."],
        absorcion: 4,
        modificadores: [],
        motor: [
          {
            tipo: "numerico",
            afecta: { modo: "accion_existente", id: "bloquear_danio" },
            mecanismo: "suma_derivado",
            estado: "construido",
          },
        ],
      },
    ],
  },
  {
    familia: "subsistema",
    id: "malla_plasmatica",
    label: "Malla Plasmática",
    resumen: "Un colchón de plasma ionizado que absorbe daño y puede usarse para atacar.",
    descripcion:
      "Sistema de protección activo que genera un campo electromagnético pulsante y un escudo de " +
      "contención de gas ionizado que flota a milímetros de la armadura. Más bruto y volátil que el " +
      "escudo deflector, por eso es más raro. Actúa como colchón balístico y térmico de reacción " +
      "ultrarrápida, capaz de vaporizar pequeños proyectiles y disipar energía hasta agotar la " +
      "matriz. Por su naturaleza volátil, cualquier atacante melee que golpee al usuario sufre una " +
      "descarga reactiva, y la potencia puede canalizarse ofensivamente en golpes melee o colapsarse " +
      "en una detonación de pulso térmico en área.",
    ranurasQueConsume: 1,
    accionActivacion:
      "Reacción ante un ataque entrante o acción gratuita en el propio turno; cada activación " +
      "consume 1 carga y da 10 turnos de campo continuo.",
    celula: { cargas: 10, recarga: "1 hora con conector (1 carga cada 6 minutos)", bateriaCoste: 150 },
    modos: [],
    niveles: [
      {
        nivel: 1,
        rareza: "Poco Habitual",
        coste: 6000,
        detalle: [
          "Colchón de 10 puntos de golpe mientras esté activa, absorbe daño cinético y energético.",
          "Si recibe daño sin destruirse, regenera 1 punto por turno; destruida, tarda 4 turnos en " +
            "reactivarse.",
          "Sacrificando 2 puntos del colchón (acción gratuita, se declara antes de atacar), suma 1 " +
            "nivel de daño de plasma a un golpe melee desarmado; en crítico puede causar shock, " +
            "llamarada o fusión, a elección del personaje (dificultad 6 + nivel).",
          "Si el usuario recibe un golpe melee, devuelve daño de plasma igual al nivel del " +
            "subsistema.",
          "Al activarse: -8 al sigilo (percepción visual) y neutraliza por completo el camuflaje " +
            "trifásico activo.",
        ],
        // El colchón de PG en sí ya no está aquí: se resolvió como RECURSOS
        // estructural (docs/tareas.md, 2026-09-27), mismo patrón que la
        // célula/durabilidad — no pasa por Modificador ni CondicionTirada, así
        // que no le toca una entrada de MotorMetadata (ver `colchon` más
        // abajo y recursos.ts, capacidadDePieza()). "Regenera N por turno" y
        // el tiempo de reactivación tras destruirse siguen sin automatizar,
        // comunicación de mesa. Sigilo y neutralizar camuflaje: S96 (ver `condiciones` y motor).
        modificadores: [],
        colchon: 10,
        alRecibirDanio: [devolverGolpe(1)],
        // "Al activarse este subsistema el usuario recibe un penalizador de -8 al sigilo que solo
        // afecta a la percepción visual" (docs/fuente/equipamiento.md): la Malla no tiene tirada
        // propia donde colgar el aviso (se activa sin dado), así que va como casilla en las
        // tiradas de Sigilo (condicionesActivas, equipo.ts; S96). Los niveles 2-4 la heredan.
        condiciones: [
          {
            id: "malla_plasmatica_activa",
            tipo: "toggle",
            etiqueta: "Malla Plasmática activa (si te buscan con la vista)",
            alcance: { tipo: "habilidad", habilidad: "sigilo" },
            valorActivo: -8,
            valorInactivo: 0,
            nota: "Solo frente a la percepción visual. Activa, anula los beneficios activos del Camuflaje Trifásico.",
          },
        ],
        motor: [
          // ✅ Construido 2026-09-28 (docs/tareas.md): toggle informativo en
          // Puñetazo/Patada (condicionesSacrificioColchon(), combate.ts) —
          // valorActivo/valorInactivo 0, el motor no descuenta el colchón
          // solo, se ajusta a mano en Recursos como el resto de RECURSOS.
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
          // ✅ Construido junto al de arriba: el crítico (shock/llamarada/
          // fusión, dificultad 6+nivel) va en la MISMA nota del toggle, no en
          // una condición aparte.
          { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
          // Devuelve daño de plasma al atacante (un TERCERO: objetivo_tercero, siempre texto,
          // docs/motor.md). eq-24 del cuestionario (usuario, 2026-11-13): casilla «Golpe cuerpo a
          // cuerpo» en Resistir daño (`alRecibirDanio`); marcada, solo avisa de cuánto devuelves.
          MALLA_DEVUELVE,
          // -8 al sigilo al activarse: casilla "Malla Plasmática activa" en Sigilo (S96).
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "sigilo" }, mecanismo: "eleccion_jugador", estado: "construido" },
          // Neutraliza el Camuflaje Trifásico activo: la ficha no guarda si una ni otra están
          // activas (activar solo gasta la carga), así que no hay nada que apagar — aviso en
          // "Activar Camuflaje Trifásico" con la Malla equipada y en la casilla de Sigilo (S96).
          { tipo: "texto", afecta: { modo: "accion_existente", id: "activar_camuflaje" }, mecanismo: "nota_fija", estado: "construido" },
        ],
      },
      {
        nivel: 2,
        rareza: "Extraño",
        coste: 36000,
        detalle: [
          "Colchón de 12 puntos, regenera 2 por turno.",
          "Puede liberar el colchón en una detonación de pulso térmico en área 6x6 (esquiva 5 + " +
            "nivel): daño de plasma igual al colchón sacrificado, causa shock y llamarada " +
            "(dificultad 6 + nivel); con fallo crítico en la esquiva, también fusión.",
        ],
        modificadores: [],
        colchon: 12,
        alRecibirDanio: [devolverGolpe(2)],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
          { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
          MALLA_DEVUELVE,
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "sigilo" }, mecanismo: "eleccion_jugador", estado: "construido" },
          { tipo: "texto", afecta: { modo: "accion_existente", id: "activar_camuflaje" }, mecanismo: "nota_fija", estado: "construido" },
          // ✅ Construido 2026-09-28: "acción sin dado" (tiradaDetonacionPulsoTermico(),
          // combate.ts), no la tirada de ataque propia que este comentario
          // pedía — no hace falta rodar dado, el colchón sacrificado ES el
          // daño y el objetivo esquiva con su Esquivar de siempre.
          { tipo: "accion", afecta: { modo: "accion_nueva", id: "detonacion_pulso_termico" }, mecanismo: "accion_equipo", estado: "construido" },
        ],
      },
      {
        nivel: 3,
        rareza: "Extraño",
        coste: 72000,
        detalle: [
          "Colchón de 14 puntos, regenera 3 por turno; destruida, tarda 3 turnos en reactivarse.",
          "Los golpes melee con plasma liberado causan shock y llamarada (dificultad 5 + nivel) y, " +
            "en crítico, fusión (dificultad 7 + nivel).",
          "Pueden gastarse 4 puntos del colchón para sumar 2 al daño adicional de plasma.",
        ],
        modificadores: [],
        colchon: 14,
        alRecibirDanio: [devolverGolpe(3)],
        // Mismos 6 efectos que nivel 2 (solo cambian números: colchón,
        // dificultades de crítico, coste del sacrificio) — nada nuevo que
        // clasificar en este nivel. Todos construidos 2026-09-28, ver nivel 1.
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
          { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
          MALLA_DEVUELVE,
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "sigilo" }, mecanismo: "eleccion_jugador", estado: "construido" },
          { tipo: "texto", afecta: { modo: "accion_existente", id: "activar_camuflaje" }, mecanismo: "nota_fija", estado: "construido" },
          { tipo: "accion", afecta: { modo: "accion_existente", id: "detonacion_pulso_termico" }, mecanismo: "accion_equipo", estado: "construido" },
        ],
      },
      {
        nivel: 4,
        rareza: "Muy Extraño",
        coste: 108000,
        detalle: [
          "Colchón de 16 puntos, regenera 4 por turno.",
          "Al devolver daño contra ataques melee, también causa shock y llamarada (dificultad 8).",
          "La detonación de pulso térmico puede ampliarse a área 10x10.",
        ],
        modificadores: [],
        colchon: 16,
        alRecibirDanio: [devolverGolpe(4)],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
          { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
          MALLA_DEVUELVE,
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "sigilo" }, mecanismo: "eleccion_jugador", estado: "construido" },
          { tipo: "texto", afecta: { modo: "accion_existente", id: "activar_camuflaje" }, mecanismo: "nota_fija", estado: "construido" },
          { tipo: "accion", afecta: { modo: "accion_existente", id: "detonacion_pulso_termico" }, mecanismo: "accion_equipo", estado: "construido" },
        ],
      },
    ],
  },
  {
    familia: "subsistema",
    id: "proyector_pulso",
    label: "Proyector de Pulso",
    resumen: "Arma integrada en el brazalete: dispara sin desenfundar, con cuatro modos de ataque.",
    descripcion:
      "Sistema ofensivo modular de alta densidad energética integrado en el chasis de la armadura, " +
      "normalmente en el brazalete o el guante. Al no requerir munición cinética convencional, " +
      "canaliza energía almacenada para proyectar haces de partículas ionizadas o pulsos de plasma " +
      "confinado. Permite disparar sin desenfundar, aunque exige la mano correspondiente libre para " +
      "alinear el emisor. Completamente configurable: puede operarse con Tecnociencia en lugar de " +
      "Combate a Distancia (en ambos casos con el aplicado de Reflejos). El daño se clasifica como " +
      "grave.",
    ranurasQueConsume: 1,
    accionActivacion:
      "Cada ataque consume las cargas del modo elegido (el Pulso, 1 cada 3 disparos); se dispara como cualquier arma.",
    celula: { cargas: 10, recarga: "1 hora con conector (1 carga cada 6 minutos)", bateriaCoste: 150 },
    efectosObjetivo: EFECTOS_PROYECTOR_PULSO,
    // La tabla "Modo de Ataque" del documento no es de uso (activo/pasivo),
    // es de disparo: cuatro perfiles distintos, cada uno con su propio coste,
    // dificultad, daño y alcance (escalan con el Nivel instalado).
    modos: [
      {
        label: "Pulso",
        descripcion:
          "Acción simple, 1 carga cada 3 disparos, dificultad -2, daño 8 + Nivel, alcance corto 20 + (10 × Nivel), " +
          "medio 80 + (20 × Nivel), largo 160 + (20 × Nivel) metros. " +
          "Efecto: Shock (4 + Nivel); crítico: Hemorragia.",
      },
      {
        label: "Pulso Cargado",
        descripcion:
          "Acción compleja, 1 carga, dificultad -2, daño 11 + Nivel, alcance corto 30 + (10 × Nivel), " +
          "medio 100 + (20 × Nivel), largo 200 + (20 × Nivel) metros. " +
          "Efecto: Shock (6 + Nivel); crítico: Hemorragia.",
      },
      {
        label: "Barrido",
        descripcion:
          "Acción estándar, 2 cargas, dificultad -3, daño de área 10 + Nivel en 6x6, alcance corto " +
          "20 + (10 × Nivel), medio 80 + (20 × Nivel), largo 160 + (20 × Nivel) metros. " +
          "Efecto: Esquiva (7 + Nivel) y Shock (7 + Nivel).",
      },
      {
        label: "Aguijón",
        descripcion:
          "Acción simple, 1 carga lo mantiene Nivel turnos («Activar Aguijón»), dificultad 0, daño 4 + Fuerza + Nivel, " +
          "alcance melee, Sutil. Efecto: Shock (4 + Nivel); crítico: Hemorragia.",
      },
    ],
    niveles: [
      {
        nivel: 1,
        rareza: "Poco Habitual",
        coste: 6000,
        detalle: [
          "Configuración base del emisor.",
          "La ionización del aire al disparar impone -5 al sigilo (percepción visual) con " +
            "cualquier modo de ataque.",
        ],
        modificadores: [],
        // Te resta 5 del Sigilo al atacar con cualquier modo (T4: la app lo resta sola; antes,
        // aviso, S96). sigiloProyectorPulso, combate.ts.
        // TODO(revisar): «solo percepción visual»; se resta del número entero del estado.
        delataAlAtacar: { motivo: "ionización", valor: 5 },
        motor: [
          // Efectos sobre el objetivo de cada modo (Shock, Hemorragia de crítico), como dato
          // (`efectosObjetivo`): aviso en el resultado con los rangos desde tu total (eq-23).
          { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "shock" }, mecanismo: "nota_fija", estado: "construido" },
          // Hallazgo #1, construido 2026-09-23: tiradaDeProyectorPulso()
          // (combate.ts), registrado en REGISTRO_DE_ATAQUE bajo "subsistema".
          // Aguijón (melee-dentro-de-arma-a-distancia) y "elige habilidad" ya
          // no son ambigüedad: la propia descripción del subsistema dice que
          // el aplicado es Reflejos "en ambos casos" (Combate a Distancia o
          // Tecnociencia), así que se generan dos Acciones gemelas, una por
          // habilidad — sin inventar un mecanismo de "elige atributo/habilidad
          // dentro de la misma tirada" que no existe.
          { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_proyector_pulso" }, mecanismo: "accion_equipo", estado: "construido" },
          // "-5 al sigilo al disparar": resta de tu estado Sigilo al atacar (T4).
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "sigilo" }, mecanismo: "suma_derivado", estado: "construido" },
        ],
      },
      {
        nivel: 2,
        rareza: "Extraño",
        coste: 36000,
        detalle: [
          "Modo adicional — Emisor de Flux Radiactivo: cambia el crítico convencional por " +
            "Envenenamiento por Radiación (dificultad 8 + nivel).",
        ],
        modificadores: [],
        modoAdicional: {
          id: "flux",
          label: "Flux Radiactivo",
          nota: "El crítico es Envenenamiento por Radiación (dificultad 8 + nivel) en vez de Hemorragia.",
        },
        motor: [
          // Selector «Modo adicional» al tirar (eq-23): el crítico que pone va por efectosObjetivo.
          { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "envenenamiento" }, mecanismo: "eleccion_jugador", estado: "construido" },
        ],
      },
      {
        nivel: 3,
        rareza: "Extraño",
        coste: 72000,
        detalle: [
          "Modo adicional — Emisor de Fotones Coherentes: el daño pasa a Fuego y causa Llamarada " +
            "(misma salvación que el shock); el crítico pasa a Ceguera (dificultad 8 + nivel).",
        ],
        modificadores: [],
        modoAdicional: {
          id: "fotones",
          label: "Fotones Coherentes",
          nota: "Daño a Fuego y Llamarada (misma dificultad que el Shock); el crítico es Ceguera (dificultad 8 + nivel).",
          danio: { categoria: "Fuego" },
        },
        motor: [
          // Daño a Fuego: resolución del daño de la opción elegida (`danio.categoria`).
          { tipo: "resolucion", afecta: { modo: "accion_existente", id: "ataque_proyector_pulso" }, mecanismo: "eleccion_jugador", estado: "construido" },
          { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "llamarada" }, mecanismo: "eleccion_jugador", estado: "construido" },
        ],
      },
      {
        nivel: 4,
        rareza: "Muy Extraño",
        coste: 108000,
        detalle: [
          "Modo adicional — Módulo de Disrupción de Campo: el efecto de shock sube 1 de " +
            "dificultad. En crítico destruye 1 punto de blindaje del objetivo (sin blindaje, " +
            "Hemorragia normal).",
        ],
        modificadores: [],
        modoAdicional: {
          id: "disrupcion",
          label: "Disrupción de Campo",
          nota: "Shock +1 de dificultad; el crítico destruye 1 punto de blindaje del objetivo (sin blindaje, Hemorragia normal).",
        },
        motor: [
          { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "shock" }, mecanismo: "eleccion_jugador", estado: "construido" },
        ],
      },
    ],
  },
];
