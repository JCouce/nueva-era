// Catálogo de especies (docs/sistema.md §14; prosa literal en docs/especies.md).
//
// La ficha solo guarda la ELECCIÓN (especieId + especieOpciones: casta y linaje);
// todo lo que sigue se recalcula en cada render (§14.2). Cambiar un número aquí
// mueve todas las fichas de esa especie, aprobadas incluidas: avisar al máster
// antes del deploy.
//
// Cada rasgo declara su MotorMetadata (docs/motor.md). Los que se construyen en
// tandas posteriores ya están aquí con su clasificación y `estado` pendiente/bloqueado;
// sus datos operativos se añaden al rasgo cuando la tanda que los consume los
// necesite, no antes. Los de creación (costes, bolsa) ya están (E2a), la Resonancia
// +1 y el kerzul (E2b), movimiento, carga y armadura natural (E3), las casillas,
// bonos, textos y umbrales de las tiradas (E4), la nota de fármacos del Irota y la visión (E5),
// y quién es psiónico, con su sobreesfuerzo (T6a).
import type { AlcanceModificador, Modificador } from "../rules/modificadores";
import type { CondicionTirada } from "../rules/condiciones";
import type { MotorMetadata } from "../rules/motor";
import type { FormulaMovimiento } from "../rules/formulaMovimiento";
import { ATRIBUTOS, type AtributoId } from "../rules/atributos";
import type { HabilidadId } from "../rules/habilidades";
import type { EspecialidadId } from "./especialidades";
import type { MaterialPieza } from "./equipo";
import type { EfectoAlRecibir } from "../rules/resistirDanio";
import { TIPOS_FISICOS } from "./tiposDanio";
import type { EfectoSalvacion } from "../rules/aumentosTiradas";
import type { FuentePsionica } from "../rules/sobreesfuerzo";
import { SOBREESFUERZO_ARIANYI, SOBREESFUERZO_MAOLHER } from "./sobreesfuerzos";

// Peso/altura de referencia (§14.5): solo se enseña junto a los campos libres de
// Identidad, no se valida. Peso = min-max + porFuerza × Fuerza con especie (M21).
export type ReferenciaFisica = {
  pesoKg: { min: number; max: number; porFuerza: number };
  alturaCm: { min: number; max: number };
};

export type Rasgo = {
  id: string;
  label: string;
  texto: string; // la regla en una frase, para la ficha
  modificadores?: Modificador[]; // lo que ya entra en modificadoresActivos
  // Regla de creación/economía (costes de casta, descuentos psiónicos, bolsa de
  // aumentos): motor.md, "Lo que queda fuera del modelo" — coste y rareza no son
  // ninguno de los cinco tipos, así que estos rasgos no llevan MotorMetadata.
  // TODO(revisar): confirmar con el usuario que es así y no un tipo nuevo.
  creacion?: true;
  // Datos de los rasgos de creación (§14.6). Los lee ajustesDeCoste / bolsaDeAumentos
  // (rules/especie.ts); el resto del motor no los mira.
  costes?: CostesRasgo;
  bolsaAumentos?: number; // créditos aparte, solo para aumentos (Humanos, M3)
  // Piezas de ese material sin tope de rareza, en creación (Acceso al Kerzul, M9).
  // Lo lee excepcionesRareza (rules/especie.ts) → puedeEquiparSinRareza (rules/equipo.ts).
  excepcionRareza?: ExcepcionRareza;
  // Derivados que cambian de fórmula con la especie (§14.7). Los resuelve especie.ts
  // (formulaMovimientoDeEspecie, multiplicadorCargaDeEspecie, armaduraNaturalDeEspecie)
  // una vez en la FichaResuelta. Lo que se SUMA a un derivado (Zimethroni) no va
  // aquí: es un Modificador "derivado".
  formulaMovimiento?: Partial<FormulaMovimiento>; // sustituye esas constantes de la general
  multiplicadorCarga?: number; // sobre el total de la carga sin penalizador (§5.5)
  armaduraNatural?: number; // línea propia en el blindaje, sumada a la armadura puesta
  // Tiradas (§14.8, E4). Los resuelve especie.ts una vez en la FichaResuelta:
  // casillasDeEspecie (al mismo índice que las del equipo), textosDeEspecie (nota fija
  // en la tirada) y ajusteUmbralesDeEspecie (modificadoresDeUmbrales). Un bono fijo a
  // una tirada no va aquí: es un Modificador "tirada" con alcance.
  casillas?: CasillaRasgo[];
  textos?: TextoRasgo[];
  // Fallo → fallo crítico, sin casilla, en las tiradas que nombran alguna de estas
  // especialidades (Rigidez narcisista). Lo resuelve fallosCriticosDeEspecie.
  falloCritico?: { especialidades: EspecialidadId[] };
  // Puntos menos de penalizador en cada tramo de heridas o de fatiga (§7; M12).
  ajusteUmbrales?: { salud?: number; fatiga?: number };
  // Otras áreas (§14.9, E5). Los resuelve especie.ts una vez en la FichaResuelta:
  // fuentesPsionicasDeEspecie (au-04 y el sobreesfuerzo, T6a), notasFarmacosDeEspecie (nota
  // fija en las filas de fármaco) y accionesSinDadoDeEspecie (fila "Usar" en Acciones).
  // `fuentePsionica`: la especie (o la casa) puede tener poderes, con este sobreesfuerzo.
  fuentePsionica?: FuentePsionica;
  notaFarmacos?: string;
  accionSinDado?: AccionSinDadoRasgo;
  // Lo que pasa al recibir un golpe (T2 del cuestionario): casillas y salvaciones de «Resistir
  // daño». Lo resuelve efectosAlRecibir (rules/resistirDanio.ts).
  alRecibirDanio?: EfectoAlRecibir[];
  // Opciones del selector «Contra…» de las salvaciones (como las de los aumentos y el equipo):
  // las recoge salvacionesDeEspecie (rules/especie.ts).
  salvaciones?: EfectoSalvacion[];
  motor: MotorMetadata[];
};

// Acción sin dado que da el rasgo (activar la visión). `costeFatiga`: lo que se cobra al
// confirmar, por el mismo camino que la fatiga de un poder.
export type AccionSinDadoRasgo = { label: string; nota: string; costeFatiga?: number };

// Casilla en el modal de la tirada, visible solo con el rasgo. `acciones`: ids de las
// tiradas fijas de ACCIONES (acciones.ts) donde aparece; un test comprueba que existen.
// El id y el alcance de la condición los pone casillasDeEspecie.
export type CasillaRasgo = { acciones: string[]; condicion: CondicionTirada };

// Dónde cuelga un texto sin mecanizar: una tirada fija por id, los ataques
// desarmados (Puñetazo y Patada, Accion.desarmado en combate.ts) o las tiradas de una
// familia de arma, con su empleo si lo filtra (textos de dote, D2b-1; mismo alcance que
// AlcanceModificador "familiaArma"). `soloEnCritico`: solo con éxito crítico; `grado`: solo con
// éxito o con fallo (Tras esquivar del Zimethroni). Los dos salen con el resultado, no antes de
// tirar (fase 4, textosDeTirada.ts).
// Desde A2b de aumentos, también un grupo entero (Defensa: flanqueo de Consciencia) o las tiradas
// de unos aplicados (Asa Estriatotalámica: perspicacia, voluntad o expresión).
export type DestinoTexto =
  | { tipo: "tiradaId"; id: string }
  | { tipo: "desarmado" }
  | Extract<AlcanceModificador, { tipo: "familiaArma" } | { tipo: "grupo" } | { tipo: "aplicado" }>;
export type TextoRasgo = { en: DestinoTexto[]; texto: string; soloEnCritico?: true; grado?: "exito" | "fallo" };

// `etiqueta`: palabra corta para la pista junto al coste ("−1 casta").
export type CostesRasgo = {
  etiqueta: string;
  // −1 (mínimo 1) o +1 al coste de cada nivel de esa habilidad, creación y XP (M11).
  habilidades?: Partial<Record<HabilidadId, -1 | 1>>;
  psionicaNivel1?: number; // coste del nivel 1 de cada disciplina, en vez de 3 (M4)
  psionicaPorNivel?: number; // se suma al coste de cada nivel de cualquier disciplina (M11)
};

export type ExcepcionRareza = { material: MaterialPieza; maxPiezas: number };

// Casta o linaje: se suman a la especie (§14.1, Noble Ílkrem = Carácter +1 y Fuerza +1).
export type OpcionEspecie = {
  id: string;
  label: string;
  fuente: string; // etiqueta para el desglose: "Manduk · Noble", "Casa de Ílkrem"
  referencia?: ReferenciaFisica; // por casta en Manduk
  rasgos: Rasgo[];
};

export type Especie = {
  id: string;
  label: string;
  descripcion: string;
  referencia: ReferenciaFisica | null; // null: Humanos no trae; Manduk va por casta
  rasgos: Rasgo[];
  // Si existe, elegir casta es obligatorio (Manduk).
  castas?: OpcionEspecie[];
  // Linaje: solo con esa casta, y entonces obligatorio (M10).
  linajes?: { casta: string; opciones: OpcionEspecie[] };
  // +N a un atributo que elige el jugador (Humanos, `docs/fuente/especies.md`). Se guarda
  // en especieOpciones.atributo y lo materializa especieDeFicha; cambiarlo no resetea.
  atributoLibre?: number;
};

export type EspecieOpciones = { casta?: string; linaje?: string; atributo?: AtributoId };

// --- Ayudas para declarar rasgos ------------------------------------------

// Los atributos no apuntan a una acción concreta: alimentan aplicados, salud y
// movimiento, que alimentan todas las tiradas (motor.md, "Derivados estáticos").
// TODO(revisar): "todas" + suma_derivado es la etiqueta más cercana; no hay
// precedente de atributo con MotorMetadata en el catálogo de equipo.
function atributos(valores: Partial<Record<AtributoId, number>>): Rasgo {
  const modificadores = Object.entries(valores).map(([id, valor]) => ({
    tipo: "atributo" as const,
    id: id as AtributoId,
    valor: valor!,
  }));
  return {
    id: "atributos",
    label: "Atributos",
    texto: modificadores
      .map((m) => `${ATRIBUTOS.find((a) => a.id === m.id)!.label} ${m.valor > 0 ? "+" : ""}${m.valor}`)
      .join(", "),
    modificadores,
    motor: [
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
    ],
  };
}

// Para el atributo libre (especieDeFicha), con el mismo rasgo que los fijos.
export const rasgoDeAtributos = atributos;

// Casilla en una tirada que solo aparece si la ficha tiene el rasgo (§14.8): la
// declara `casillas` y la suma montarTirada como cualquier casilla del equipo.
const casilla = (id: string): MotorMetadata => ({
  tipo: "numerico",
  afecta: { modo: "accion_existente", id },
  mecanismo: "eleccion_jugador",
  estado: "construido",
});

// La misma casilla cuando no suma: "éxito cuenta como crítico" (exitoCritico) cambia cómo se
// resuelve la tirada, no su total (Resolución, docs/motor.md).
const casillaResolucion = (id: string): MotorMetadata => ({ ...casilla(id), tipo: "resolucion" });

// Texto fijo en una tirada, solo con el rasgo (§14.10): lo declara `textos`.
const textoEn = (id: string): MotorMetadata => ({
  tipo: "texto",
  afecta: { modo: "accion_existente", id },
  mecanismo: "nota_fija",
  estado: "construido",
});

// "Éxito → crítico" (§14.8): casilla sin número que baja el margen de crítico a 0.
const exitoCritico = (id: string, etiqueta: string): CondicionTirada => ({
  id,
  tipo: "toggle",
  etiqueta,
  valorActivo: 0,
  margenCriticoExito: 0,
  nota: "Si sale éxito, cuenta como crítico.",
});

// Acción propia del rasgo, sin equipo (sobreesfuerzo psiónico, activar la visión; §14.9).
const accionDeEspecie = (id: string): MotorMetadata => ({
  tipo: "accion",
  afecta: { modo: "accion_nueva", id },
  mecanismo: "accion_sin_equipo",
  estado: "construido",
});

// au-04: solo con una fuente psiónica (Arianyi, Casa de Maolher, Implante de Resonancia Métrica)
// se pueden tener poderes; sin ella, la psiónica comprada queda «requisito no cumplido».
const HABILITA_PSIONICA: MotorMetadata = {
  tipo: "habilitador",
  afecta: { modo: "accion_existente", id: "psionica" },
  mecanismo: "gate_instalacion",
  arbitraje: "duro",
  estado: "construido",
};

const tiradaFija = (id: string): DestinoTexto => ({ tipo: "tiradaId", id });

// Fórmula de un derivado (movimiento, carga): se ve en Personaje → Estado, pero no
// la lee ninguna acción (motor.md, "Derivados estáticos"), así que no tiene
// mecanismo. suma_derivado no encaja: exige una acción fija que consulte el número
// (como Resistir daño con el blindaje), y el movimiento y la carga no los consulta
// ninguna. El día que los penalizadores de carga toquen tiradas, se reclasifica.
const derivadoEstatico: MotorMetadata = {
  tipo: "numerico",
  afecta: { modo: "ninguna" },
  mecanismo: null,
  estado: "construido",
};

// Descanso y raciones (Riux, Siervo): la ración es lo que se gasta (Coste); la duración y el
// número de descansos, cómo se resuelve el descanso (Resolución). Ninguno tiene dónde engancharse.
const SIN_DESCANSO = "no hay descanso ni raciones en la app (sistema.md §14.10)";
const racionBloqueada: MotorMetadata = { tipo: "coste", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: SIN_DESCANSO };
const descansoBloqueado: MotorMetadata = { tipo: "resolucion", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: SIN_DESCANSO };

const textoBloqueado = (id: string, por: string): MotorMetadata => ({
  tipo: "texto",
  afecta: { modo: "accion_existente", id },
  mecanismo: "nota_fija",
  estado: "bloqueado",
  bloqueoPor: por,
});

const ref = (pMin: number, pMax: number, porFuerza: number, aMin: number, aMax: number): ReferenciaFisica => ({
  pesoKg: { min: pMin, max: pMax, porFuerza },
  alturaCm: { min: aMin, max: aMax },
});

// --- Manduk: castas y linajes ---------------------------------------------

const costeCasta = (texto: string, habilidades: Partial<Record<HabilidadId, -1 | 1>>): Rasgo => ({
  id: "coste_habilidad",
  label: "Coste de habilidades",
  texto,
  creacion: true,
  costes: { etiqueta: "casta", habilidades },
  motor: [],
});

const CASTAS_MANDUK: OpcionEspecie[] = [
  {
    id: "noble",
    label: "Noble",
    fuente: "Manduk · Noble",
    referencia: ref(50, 70, 10, 170, 200),
    rasgos: [
      atributos({ caracter: 1 }),
      {
        id: "contra_miedo",
        label: "Contra el miedo",
        texto: "Un éxito cuenta como crítico en tiradas contra intimidación y miedo (casilla en Salvación de Voluntad).",
        casillas: [{ acciones: ["salv_voluntad"], condicion: exitoCritico("miedo", "¿Es contra miedo o intimidación?") }],
        motor: [casillaResolucion("salv_voluntad")],
      },
      costeCasta("Actitud cuesta 1 menos por nivel (mínimo 1).", { actitud: -1 }),
    ],
  },
  {
    id: "sabio",
    label: "Sabio",
    fuente: "Manduk · Sabio",
    referencia: ref(40, 60, 10, 165, 185),
    rasgos: [
      atributos({ inteligencia: 1, percepcion: 1, fuerza: -1, aguante: -1, caracter: -1 }),
      costeCasta(
        "Biociencia, Cultura y Tecnociencia cuestan 1 menos por nivel (mínimo 1); Atletismo, Combate Melee y Combate a Distancia, 1 más.",
        { biociencia: -1, cultura: -1, tecnociencia: -1, atletismo: 1, combate_melee: 1, combate_distancia: 1 },
      ),
    ],
  },
  {
    id: "guerrero",
    label: "Guerrero",
    fuente: "Manduk · Guerrero",
    referencia: ref(70, 110, 15, 180, 220),
    rasgos: [
      atributos({ fuerza: 1, agilidad: 1, aguante: 1, caracter: -1, inteligencia: -1 }),
      {
        id: "umbral_heridas",
        label: "Curtido",
        texto: "Los penalizadores por heridas son un punto menores: −1/−3/−5 pasan a 0/−2/−4.",
        ajusteUmbrales: { salud: 1 },
        motor: [{ tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "siempre_activo", estado: "construido" }],
      },
      costeCasta(
        "Atletismo, Combate a Distancia y Combate Melee cuestan 1 menos por nivel (mínimo 1); Biociencia, Cultura y Tecnociencia, 1 más.",
        { atletismo: -1, combate_distancia: -1, combate_melee: -1, biociencia: 1, cultura: 1, tecnociencia: 1 },
      ),
    ],
  },
  {
    id: "siervo",
    label: "Siervo",
    fuente: "Manduk · Siervo",
    referencia: ref(40, 60, 10, 140, 165),
    rasgos: [
      atributos({ aguante: 1, percepcion: 1, caracter: -1, inteligencia: -1 }),
      {
        id: "umbral_fatiga",
        label: "Incansable",
        texto: "Los penalizadores por fatiga son un punto menores: −1/−2 pasan a 0/−1.",
        ajusteUmbrales: { fatiga: 1 },
        motor: [{ tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "siempre_activo", estado: "construido" }],
      },
      {
        id: "frugal",
        label: "Frugal",
        texto: "Media ración para recuperar la misma fatiga; Descanso Largo de 6 horas.",
        motor: [racionBloqueada, descansoBloqueado],
      },
    ],
  },
];

const LINAJES_MANDUK: OpcionEspecie[] = [
  {
    id: "ilkrem",
    label: "Ílkrem",
    fuente: "Casa de Ílkrem",
    rasgos: [
      atributos({ fuerza: 1 }),
      {
        id: "regeneracion",
        label: "Regeneración",
        texto:
          "1 nivel no letal por turno, 1 letal por minuto (10 turnos), 1 grave por hora; fatigado, el doble de lento; exhausto, nada.",
        // Como la regeneración pasiva del Enjambre Nanobot: texto en la ficha, sin tiempo que lo mueva.
        motor: [textoBloqueado("ficha", "la app no lleva el paso del tiempo (sistema.md §14.10)")],
      },
      {
        id: "falla_metabolica",
        label: "Falla metabólica",
        texto: "Al recibir daño de plasma o fuego, Fortaleza (dificultad 9) contra aturdimiento.",
        // es-02 del cuestionario (usuario, 2026-11-13): al pulsar «Recibir» en Resistir daño con
        // fuego o plasma y daño que entra, panel con la salvación (como el sobreesfuerzo del Maolher).
        // Recibir el daño es lo que la dispara: ya no hace falta la nota en la Salvación de
        // Fortaleza.
        alRecibirDanio: [
          {
            tipo: "salvacion",
            id: "falla_metabolica",
            etiqueta: "Falla metabólica",
            tipos: ["plasma", "fuego"],
            salvacion: "salv_fortaleza",
            dificultad: 9,
            contra: "aturdimiento",
            fracaso: "Fracaso: quedas aturdido (díselo al máster, que te pone el estado).",
          },
        ],
        motor: [accionDeEspecie("salv_falla_metabolica")],
      },
    ],
  },
  {
    id: "zimethroni",
    label: "Zimethroni",
    fuente: "Casa de Zimethroni",
    rasgos: [
      atributos({ agilidad: 1 }),
      {
        id: "movimiento",
        label: "Hiperactivo",
        texto: "+4 m de carrera; +200 cm de salto vertical y horizontal; +2 m de nado y escalada.",
        modificadores: [
          { tipo: "derivado", id: "carrera", valor: 4 },
          { tipo: "derivado", id: "saltoVertical", valor: 200 },
          { tipo: "derivado", id: "saltoHorizontal", valor: 200 },
          { tipo: "derivado", id: "nado", valor: 2 },
          { tipo: "derivado", id: "escalada", valor: 2 },
        ],
        motor: [derivadoEstatico],
      },
      {
        id: "tras_esquivar",
        label: "Tras esquivar",
        texto: "Una esquiva con éxito permite moverse una casilla como acción gratuita, una vez por turno.",
        // es-05: sale con el éxito de la esquiva, en el resultado (fase 4).
        textos: [{ en: [tiradaFija("defensa")], texto: "Con éxito, una casilla de movimiento gratis (una vez por turno).", grado: "exito" }],
        motor: [textoEn("defensa")],
      },
      {
        id: "hiperactividad",
        label: "Tensión ósea",
        texto: "Si recibe un ataque físico mientras se mueve, +1 al daño recibido por cada 4 niveles.",
        // es-03/es-04 del cuestionario (usuario, 2026-11-13): casilla en Resistir daño, solo con
        // el rasgo; marcada, +1 por cada 4 puntos que entran tras el blindaje (si lo para todo,
        // nada). La nota de Defensa se queda (es donde te atacan) y manda allí.
        // TODO(revisar): «ataque físico» no lo define ninguna fuente (sistema.md, tiposDanio.ts):
        // la casilla vale con todo tipo de daño salvo el mental.
        textos: [{ en: [tiradaFija("defensa")], texto: "Atacado físicamente mientras te mueves: marca «¿Te atacaron mientras te movías?» en Resistir daño (+1 al daño que te entra por cada 4)." }],
        alRecibirDanio: [
          {
            tipo: "danioExtra",
            id: "tension_osea",
            etiqueta: "¿Te atacaron mientras te movías?",
            nota: "Ataque físico durante una acción de movimiento: +1 por cada 4 puntos de daño que te entran tras el blindaje.",
            tipos: TIPOS_FISICOS,
            cada: 4,
          },
        ],
        motor: [textoEn("defensa"), casilla("bloquear_danio")],
      },
    ],
  },
  {
    id: "irota",
    label: "Irota",
    fuente: "Casa de Irota",
    rasgos: [
      atributos({ aguante: 1 }),
      {
        id: "contra_toxinas",
        label: "Inmunidad",
        texto: "Un éxito cuenta como crítico en salvaciones contra toxinas, venenos y enfermedades (casilla en Salvación de Fortaleza).",
        casillas: [{ acciones: ["salv_fortaleza"], condicion: exitoCritico("toxinas", "¿Contra toxinas, venenos o enfermedad?") }],
        motor: [casillaResolucion("salv_fortaleza")],
      },
      {
        id: "farmacos_mitad",
        label: "Metabolismo resistente",
        texto:
          "Fármacos y drogas, a la mitad: duración, modificadores y efectos sobre vida o fatiga (hacia abajo, mínimo 1).",
        // La app no mecaniza los efectos de los fármacos (farmacos.ts): la mitad va como
        // nota fija en cada fila de fármaco (decisión del usuario, E5).
        notaFarmacos: "Irota: efectos a la mitad (duración, modificadores, vida y fatiga), hacia abajo, mínimo 1.",
        motor: [textoEn("usar_farmaco")],
      },
    ],
  },
  {
    id: "maolher",
    label: "Maolher",
    fuente: "Casa de Maolher",
    rasgos: [
      atributos({ inteligencia: 1 }),
      {
        id: "coste_psionico",
        label: "Acceso psiónico",
        texto: "Cada nivel de cualquier disciplina cuesta 1 menos (N × 3 − 1), en creación y con XP.",
        creacion: true,
        costes: { etiqueta: "Maolher", psionicaPorNivel: -1 },
        motor: [],
      },
      {
        id: "sobreesfuerzo",
        label: "Peaje neurológico",
        texto:
          "Psiónico de nacimiento. Sobreesfuerzo con poderes de nivel 2 o más, o fatigado: Voluntad (dificultad 8 + nivel). Fracaso: 1 letal y Aturdido 1 turno; fracaso crítico: 1 grave, Aturdido 1 turno y Confusión tantos turnos como el nivel. Exhausto: fracaso, 1 grave y Aturdido; fracaso crítico, 2 graves, Aturdido y Confusión.",
        fuentePsionica: { sobreesfuerzo: SOBREESFUERZO_MAOLHER },
        // Genera su propia tirada (salvación de Voluntad tras usar el poder, como la
        // sobrecarga), no modifica la del poder: acción nueva sin equipo. Además habilita la
        // psiónica (au-04).
        motor: [accionDeEspecie("sobreesfuerzo_psionico"), HABILITA_PSIONICA],
      },
    ],
  },
  {
    id: "axadren",
    label: "Axadren",
    fuente: "Casa de Axadren",
    rasgos: [
      atributos({ percepcion: 1 }),
      {
        id: "vision_infrarroja",
        label: "Visión infrarroja",
        texto: "Ve el calor y las huellas químicas o eléctricas.",
        // Pasiva y sin coste en la prosa (a diferencia del Arianyi): nota en Buscar / percibir,
        // sin acción de activar (usuario, D3 del triaje 2026-10-28).
        textos: [{ en: [tiradaFija("alerta_activa")], texto: "Visión infrarroja: ves el calor y las huellas químicas o eléctricas." }],
        motor: [textoEn("alerta_activa")],
      },
      {
        id: "contra_ocultos",
        label: "Ojo avizor",
        texto: "Un éxito cuenta como crítico en alerta contra enemigos ocultos (casilla en Buscar / percibir).",
        // Buscar / percibir es la Alerta activa (M22); la pasiva no tira dado.
        casillas: [{ acciones: ["alerta_activa"], condicion: exitoCritico("oculto", "¿Enemigo oculto?") }],
        motor: [casillaResolucion("alerta_activa")],
      },
      {
        id: "deslumbramiento",
        label: "Deslumbramiento",
        texto:
          "Explosión de plasma, destello intenso o PEM: ceguera (dificultad 9); otras cegueras similares, dificultad +3.",
        // es-02 del cuestionario (usuario, 2026-11-13): en el selector «Contra…» de la Salvación
        // de Fortaleza, «Ceguera por destello, plasma o PEM» abre con dificultad 9 y la ceguera
        // normal recuerda el +3 a la dificultad.
        salvaciones: [
          { contra: ["ceguera_destello"], dificultad: 9, nota: "explosión de plasma, destello intenso o PEM: dificultad 9" },
          {
            contra: ["ceguera"],
            soloDirecta: true,
            nota: "si te ciega algo parecido (luz, plasma, PEM), +3 a la dificultad",
          },
        ],
        // Opción del selector que cambia la dificultad, no el total: Resolución.
        motor: [casillaResolucion("salv_fortaleza")],
      },
    ],
  },
  {
    id: "elion",
    label: "Elión",
    fuente: "Casa de Elión",
    rasgos: [
      atributos({ caracter: 1 }),
      {
        id: "contra_sugestion",
        label: "Voluntad férrea",
        texto: "Un éxito cuenta como crítico contra efectos sugestivos (casilla en Salvación de Voluntad).",
        casillas: [{ acciones: ["salv_voluntad"], condicion: exitoCritico("sugestion", "¿Contra un efecto sugestivo?") }],
        motor: [casillaResolucion("salv_voluntad")],
      },
      {
        id: "rigidez_narcisista",
        label: "Rigidez narcisista",
        texto: "Un fallo en Empatía, Humor o Negociación es fallo crítico (cualquier tirada con una especialidad de ese nombre).",
        // Vale la especialidad que nombra la tirada, la tenga o no la ficha (usuario,
        // 2026-10-24); en Convencer / mentir, la elegida al tirar.
        falloCritico: { especialidades: ["empatia", "humor", "negociacion"] },
        // Automático por especialidad, sin casilla: cambia el umbral de fallo (Resolución).
        motor: [
          {
            tipo: "resolucion",
            afecta: { modo: "accion_existente", id: "todas" },
            mecanismo: "siempre_activo",
            estado: "construido",
          },
        ],
      },
    ],
  },
];

// --- Las cinco especies -----------------------------------------------------

export const ESPECIES: Especie[] = [
  {
    id: "humano",
    label: "Humanos",
    descripcion:
      "Una Federación transhumanista, aumentada en más de un 90 %, pieza clave de la Confederación y a la vez origen de los tecno-oligarcas de la Liga del Gran Cisma.",
    referencia: null,
    atributoLibre: 1,
    rasgos: [
      {
        id: "bolsa_aumentos",
        label: "Civilización Aumentada",
        texto:
          "70.000 créditos aparte, solo para aumentos; se gastan antes que los créditos normales y lo que no se gaste se pierde (nunca se convierte en créditos).",
        creacion: true,
        bolsaAumentos: 70_000,
        motor: [],
      },
    ],
  },
  {
    id: "riux",
    label: "Riux",
    descripcion:
      "Nómadas del espacio desde que arrasaron su mundo: longevos, distantes y serenos, adaptados a la microgravedad y fundadores de la Confederación junto a los arianyi.",
    referencia: ref(40, 60, 10, 170, 220),
    rasgos: [
      atributos({ agilidad: 1, aguante: 1, inteligencia: 1, caracter: -1, fuerza: -1 }),
      {
        id: "ciclo_cerrado",
        label: "Metabolismo de Ciclo Cerrado",
        texto: "Media ración para recuperar la misma fatiga; Descanso Largo de 4 horas; 4 Descansos Breves al día en vez de 2.",
        // Ración; horas del Descanso Largo; número de Descansos Breves.
        motor: [racionBloqueada, descansoBloqueado, descansoBloqueado],
      },
      {
        id: "piel_irisada",
        label: "Piel Irisada",
        texto: "+2 para resistir la radiación astral o ambiental (casilla en Salvación de Fortaleza).",
        casillas: [
          {
            acciones: ["salv_fortaleza"],
            condicion: { id: "radiacion", tipo: "toggle", etiqueta: "¿Contra radiación astral o ambiental?", valorActivo: 2 },
          },
        ],
        motor: [casilla("salv_fortaleza")],
      },
      {
        id: "estasis",
        label: "Estasis",
        texto: "Entran y salen de estasis sin apenas daño celular.",
        // es-05 (usuario, 2026-11-13): texto en la tirada donde se usa. TODO(revisar): no hay regla
        // de estasis; va en la Salvación de Fortaleza, la que se tira contra el daño al cuerpo.
        textos: [{ en: [tiradaFija("salv_fortaleza")], texto: "Estasis: entras y sales de estasis sin apenas daño celular." }],
        motor: [textoEn("salv_fortaleza")],
      },
    ],
  },
  {
    id: "arianyi",
    label: "Arianyi",
    descripcion:
      "Maestros de la psiónica y la física vibratoria, de mundos oceánicos de neblina; una sociedad colectivista y tecnócrata regida por la Síntesis.",
    referencia: ref(30, 55, 10, 140, 190),
    rasgos: [
      atributos({ agilidad: 1, percepcion: 1, fuerza: -1 }),
      {
        id: "resonancia_extra",
        label: "Evolución Psiónica",
        texto: "Resonancia +1 sobre lo comprado (puede pasar de 6 y cuenta como requisito).",
        modificadores: [{ tipo: "disciplina", id: "resonancia", valor: 1 }],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "poderes_psionicos" }, mecanismo: "suma_derivado", estado: "construido" },
        ],
      },
      {
        id: "coste_psionico_nivel1",
        label: "Evolución Psiónica (coste)",
        texto: "El nivel 1 de cada disciplina, Resonancia incluida, cuesta 2 en vez de 3.",
        creacion: true,
        costes: { etiqueta: "arianyi", psionicaNivel1: 2 },
        motor: [],
      },
      {
        id: "sobreesfuerzo",
        label: "Sobreesfuerzo",
        texto:
          "Psiónico de nacimiento. Sobreesfuerzo con poderes de nivel 3 o más, o fatigado: Voluntad (dificultad 6 + nivel). Fracaso: 1 no letal; fracaso crítico: 1 letal y Aturdido 1 turno. Exhausto: fracaso, 1 letal y Aturdido; fracaso crítico, 1 grave.",
        fuentePsionica: { sobreesfuerzo: SOBREESFUERZO_ARIANYI },
        motor: [accionDeEspecie("sobreesfuerzo_psionico"), HABILITA_PSIONICA],
      },
      {
        id: "vision_uv_ir",
        label: "Visión UV e Infrarroja",
        texto: "Ve el calor y las huellas químicas o eléctricas; cuesta 1 punto de fatiga por hora.",
        // Una hora = una escena (usuario, triaje 2026-10-28): se cobra al activarla y se vuelve
        // a activar en cada escena (la app no lleva el paso del tiempo).
        accionSinDado: {
          label: "Activar visión",
          nota:
            "Visión UV e infrarroja: ves el calor y las huellas químicas o eléctricas (lees el estado de una máquina o el rastro de una persona). Activarla cobra 1 punto de fatiga y dura la escena; en cada escena más, vuelve a activarla.",
          costeFatiga: 1,
        },
        motor: [
          accionDeEspecie("activar_vision"),
          { tipo: "coste", afecta: { modo: "accion_existente", id: "activar_vision" }, mecanismo: "accion_sin_equipo", estado: "construido" },
        ],
      },
      {
        id: "empatia_biologica",
        label: "Empatía Biológica",
        texto:
          "+2 a la tirada pertinente tocando o muy cerca; requiere concentración, en combate es acción compleja (casilla en Buscar / percibir y Tratar heridas).",
        // No en Convencer / mentir: esa es la tirada del que miente (§14.8).
        casillas: [
          {
            acciones: ["alerta_activa", "medicina"],
            condicion: {
              id: "empatia",
              tipo: "toggle",
              etiqueta: "¿Tocando o muy cerca? (nervios, mentiras, metabolismo)",
              valorActivo: 2,
              nota: "Requiere concentración; en combate, acción compleja.",
            },
          },
        ],
        motor: [casilla("alerta_activa"), casilla("medicina")],
      },
      {
        id: "movimiento_acuatico",
        label: "Movimiento Acuático",
        texto: "Nado: 8 + (Potencia + Atletismo)/2 m, sustituye al general.",
        formulaMovimiento: { nadoBase: 8 },
        motor: [derivadoEstatico],
      },
      {
        id: "apnea",
        label: "Apnea",
        texto: "Aguantan el doble que un humano sin respirar.",
        // es-05 (usuario, 2026-11-13): en la Salvación de Fortaleza, la de la asfixia (selector
        // «Contra…»). Sin regla de apnea: el doble lo cuenta el máster.
        textos: [{ en: [tiradaFija("salv_fortaleza")], texto: "Apnea: aguantas el doble que un humano sin respirar." }],
        motor: [textoEn("salv_fortaleza")],
      },
    ],
  },
  {
    id: "arkoru",
    label: "Arköru",
    descripcion:
      "Grandes humanoides de pelaje claro nacidos en la línea del crepúsculo de un mundo sin rotación; francos, duros y forjadores del kerzul.",
    referencia: ref(80, 120, 15, 180, 230),
    rasgos: [
      atributos({ fuerza: 2, agilidad: -1 }),
      {
        id: "movilidad",
        label: "Movilidad",
        texto:
          "Salto vertical 18 × (Pot + Atl) cm (mínimo 15); horizontal 100 + (Pot + Atl) × 25 cm; escalada 8 + (Pot + Atl)/2 m; nado 2 + (Pot + Atl)/2 m.",
        formulaMovimiento: { saltoVerticalPorPunto: 18, saltoHorizontalPorPunto: 25, escaladaBase: 8, nadoBase: 2 },
        motor: [derivadoEstatico],
      },
      {
        id: "carga",
        label: "Capacidad de Carga",
        texto: "Carga total × 1,2.",
        multiplicadorCarga: 1.2,
        motor: [derivadoEstatico],
      },
      {
        id: "inamovibles",
        label: "Inamovibles",
        texto: "+2 para evitar derribos (casilla en Saltar, levantarse).",
        // TODO(revisar): solo en "Saltar, levantarse". El derribo de las armas
        // (notaDerribo, combate.ts) pide "su propia salvación" sin decir cuál; si se
        // define, la casilla va también ahí.
        casillas: [
          { acciones: ["atletismo"], condicion: { id: "derribo", tipo: "toggle", etiqueta: "¿Para evitar un derribo?", valorActivo: 2 } },
        ],
        motor: [casilla("atletismo")],
      },
      {
        id: "matriz_biometalica",
        label: "Matriz Biometálica",
        texto: "Armadura natural 1, se suma a la puesta (no contra Fuego ni Mental). Crítico desarmado: daño letal.",
        armaduraNatural: 1,
        // TODO(revisar): "desarmado" es Puñetazo y Patada, la misma lectura que el
        // sacrificio de la Malla Plasmática (combate.ts); Codazo o Rodillazo se queda
        // fuera.
        textos: [{ en: [{ tipo: "desarmado" }], texto: "Daño letal.", soloEnCritico: true }],
        motor: [
          // Mismo mecanismo que el blindaje de una armadura: alimenta desgloseBlindaje,
          // que lee Resistir daño.
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "bloquear_danio" }, mecanismo: "suma_derivado", estado: "construido" },
          // Crítico desarmado letal: cambia una regla del daño y se entrega como nota (mismo
          // criterio que `ignoraBlindaje` de las armas melee).
          { tipo: "resolucion", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "construido" },
        ],
      },
      {
        id: "percepcion_sensorial",
        label: "Percepción sensorial",
        texto: "−1 en ataques a distancia (no granadas ni arrojadizas) y en percepción visual (no en Alerta pasiva).",
        // Fijo en los ataques de Combate a Distancia: lanzar granadas y armas
        // arrojadizas va con Atletismo, así que se quedan fuera solas (M8). Los
        // lanzagranadas sí lo llevan: disparan con Combate a Distancia. Iniciativa
        // desenfundando usa la misma habilidad pero no es un ataque: no lo lleva.
        modificadores: [
          { tipo: "tirada", alcance: { tipo: "grupoHabilidad", grupo: "Ataques", habilidad: "combate_distancia" }, valor: -1 },
        ],
        // Percepción visual: Buscar / percibir es la Alerta activa; la pasiva no tira (M8).
        casillas: [
          { acciones: ["alerta_activa"], condicion: { id: "visual", tipo: "toggle", etiqueta: "¿Es percepción visual?", valorActivo: -1 } },
        ],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "siempre_activo", estado: "construido" },
          casilla("alerta_activa"),
        ],
      },
      {
        id: "adaptacion_termica",
        label: "Adaptación Térmica",
        texto: "+2 contra efectos de temperatura (casilla en Salvación de Fortaleza).",
        casillas: [
          {
            acciones: ["salv_fortaleza"],
            condicion: { id: "temperatura", tipo: "toggle", etiqueta: "¿Contra efectos de temperatura?", valorActivo: 2 },
          },
        ],
        motor: [casilla("salv_fortaleza")],
      },
      {
        id: "sistemas_filtradores",
        label: "Sistemas Filtradores",
        texto: "+2 contra efectos de filtración en el aire (casilla en Salvación de Fortaleza).",
        casillas: [
          {
            acciones: ["salv_fortaleza"],
            condicion: { id: "filtracion", tipo: "toggle", etiqueta: "¿Contra filtración en el aire?", valorActivo: 2 },
          },
        ],
        motor: [casilla("salv_fortaleza")],
      },
      {
        id: "acceso_kerzul",
        label: "Acceso al Kerzul",
        texto: "Una pieza de kerzul sin tope de rareza, solo en creación; paga su precio.",
        creacion: true,
        excepcionRareza: { material: "kerzul", maxPiezas: 1 },
        motor: [],
      },
    ],
  },
  {
    id: "manduk",
    label: "Manduk",
    descripcion:
      "Humanoides de piel roja moldeados por las Guerras Morfogenéticas en castas genéticas cerradas; sus Casas nobles se disputan el trono vacante del Imperio.",
    referencia: null,
    rasgos: [],
    castas: CASTAS_MANDUK,
    linajes: { casta: "noble", opciones: LINAJES_MANDUK },
  },
];

export function especiePorId(id: string | null): Especie | null {
  if (!id) return null;
  return ESPECIES.find((e) => e.id === id) ?? null;
}

// Lectura tolerante de las opciones (parseSheet): se queda solo con lo que
// encaja en el catálogo. Una casta que la especie no tiene, o un linaje sin la
// casta que lo admite, se descartan. No exige completitud (un Manduk sin casta
// se lee igual): eso lo exige elegirEspecie al cambiar, no la lectura.
export function normalizarOpciones(especieId: string | null, raw: unknown): EspecieOpciones {
  const especie = especiePorId(especieId);
  if (!especie || !raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const r = raw as Record<string, unknown>;
  const atributo = especie.atributoLibre ? ATRIBUTOS.find((a) => a.id === r.atributo)?.id : undefined;
  const conAtributo = atributo ? { atributo } : {};
  const casta = especie.castas?.find((c) => c.id === r.casta);
  if (!casta) return conAtributo;
  const linaje =
    especie.linajes && especie.linajes.casta === casta.id
      ? especie.linajes.opciones.find((l) => l.id === r.linaje)
      : undefined;
  return linaje ? { casta: casta.id, linaje: linaje.id, ...conAtributo } : { casta: casta.id, ...conAtributo };
}
