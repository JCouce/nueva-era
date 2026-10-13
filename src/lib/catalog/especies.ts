// Catálogo de especies (docs/sistema.md §14; prosa literal en docs/especies.md).
//
// La ficha solo guarda la ELECCIÓN (especieId + especieOpciones: casta y linaje);
// todo lo que sigue se recalcula en cada render (§14.2). Cambiar un número aquí
// mueve todas las fichas de esa especie, aprobadas incluidas: avisar al máster
// antes del deploy.
//
// Cada rasgo declara su MotorMetadata (docs/motor.md). Los que se construyen en
// tandas posteriores (E2 creación, E3 derivados, M1/E4 tiradas, E5 otras áreas)
// ya están aquí con su clasificación y `estado` pendiente/bloqueado; sus datos
// operativos (constantes de movimiento, casillas…) se añaden al rasgo cuando la
// tanda que los consume los necesite, no antes. Los de creación (costes, bolsa)
// ya están (E2a), y la Resonancia +1 y el kerzul también (E2b).
import type { Modificador } from "../rules/modificadores";
import type { MotorMetadata } from "../rules/motor";
import { ATRIBUTOS, type AtributoId } from "../rules/atributos";
import type { HabilidadId } from "../rules/habilidades";
import type { MaterialPieza } from "./equipo";

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
  motor: MotorMetadata[];
};

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
};

export type EspecieOpciones = { casta?: string; linaje?: string };

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

// Casilla en una tirada que solo aparece si la ficha tiene el rasgo (§14.8):
// depende del punto único de montaje.
const casilla = (id: string): MotorMetadata => ({
  tipo: "numerico",
  afecta: { modo: "accion_existente", id },
  mecanismo: "eleccion_jugador",
  estado: "bloqueado",
  bloqueoPor: "M1 (montarTirada: casillas de especie)",
});

// Fórmula de un derivado (movimiento, carga) que no toca ninguna acción todavía.
const derivadoPendiente = (tanda: string): MotorMetadata => ({
  tipo: "numerico",
  afecta: { modo: "ninguna" },
  mecanismo: null,
  estado: "pendiente",
  bloqueoPor: tanda,
});

const narrativo: MotorMetadata = { tipo: "narrativo", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" };

const sinDescanso: MotorMetadata = {
  tipo: "numerico",
  afecta: { modo: "ninguna" },
  mecanismo: null,
  estado: "bloqueado",
  bloqueoPor: "no hay descanso ni raciones en la app (sistema.md §14.10)",
};

const textoBloqueado = (id: string, por: string): MotorMetadata => ({
  tipo: "texto",
  afecta: { modo: "accion_existente", id },
  mecanismo: "nota_fija",
  estado: "bloqueado",
  bloqueoPor: por,
});

const ESTADOS_DEFINIDOS = "estados bien definidos (sistema.md §14.10)";

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
        motor: [casilla("salv_voluntad")],
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
        motor: [
          {
            tipo: "numerico",
            afecta: { modo: "accion_existente", id: "todas" },
            mecanismo: "siempre_activo",
            estado: "bloqueado",
            bloqueoPor: "M1 (los umbrales de salud no se aplican a las tiradas)",
          },
        ],
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
        motor: [
          {
            tipo: "numerico",
            afecta: { modo: "accion_existente", id: "todas" },
            mecanismo: "siempre_activo",
            estado: "bloqueado",
            bloqueoPor: "M1 (los umbrales de fatiga no se aplican a las tiradas)",
          },
        ],
      },
      {
        id: "frugal",
        label: "Frugal",
        texto: "Media ración para recuperar la misma fatiga; Descanso Largo de 6 horas.",
        motor: [sinDescanso],
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
        motor: [
          {
            tipo: "numerico",
            afecta: { modo: "ninguna" },
            mecanismo: null,
            estado: "bloqueado",
            bloqueoPor: "la app no lleva el paso del tiempo (sistema.md §14.10)",
          },
        ],
      },
      {
        id: "falla_metabolica",
        label: "Falla metabólica",
        texto: "Al recibir daño de plasma o fuego, Fortaleza (dificultad 9) contra aturdimiento.",
        motor: [textoBloqueado("salv_fortaleza", ESTADOS_DEFINIDOS)],
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
        motor: [derivadoPendiente("E3 (movimiento por especie)")],
      },
      {
        id: "tras_esquivar",
        label: "Tras esquivar",
        texto: "Una esquiva con éxito permite moverse una casilla como acción gratuita, una vez por turno.",
        motor: [{ tipo: "texto", afecta: { modo: "accion_existente", id: "defensa" }, mecanismo: "nota_fija", estado: "pendiente" }],
      },
      {
        id: "hiperactividad",
        label: "Tensión ósea",
        texto: "Si recibe un ataque físico mientras se mueve, +1 al daño recibido por cada 4 niveles.",
        motor: [textoBloqueado("bloquear_danio", ESTADOS_DEFINIDOS)],
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
        motor: [casilla("salv_fortaleza")],
      },
      {
        id: "farmacos_mitad",
        label: "Metabolismo resistente",
        texto:
          "Fármacos y drogas, a la mitad: duración, modificadores y efectos sobre vida o fatiga (hacia abajo, mínimo 1).",
        // TODO(revisar): reducir a la mitad no es un +N; ningún mecanismo encaja
        // del todo. Se decide al construirlo en E5 (farmacos.ts).
        motor: [{ tipo: "numerico", afecta: { modo: "accion_existente", id: "usar_farmaco" }, mecanismo: "ajuste_fijo", estado: "pendiente" }],
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
        id: "peaje_neurologico",
        label: "Peaje neurológico",
        texto:
          "Al usar un poder que consuma fatiga, Fortaleza (dificultad 5 + nivel): fracaso, 1 nivel no letal por punto de fatiga; fracaso crítico, letal. No lo absorbe el blindaje.",
        motor: [{ tipo: "accion", afecta: { modo: "accion_nueva", id: "peaje_maolher" }, mecanismo: "accion_sin_equipo", estado: "pendiente" }],
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
        motor: [{ tipo: "texto", afecta: { modo: "accion_existente", id: "alerta_activa" }, mecanismo: "nota_fija", estado: "pendiente" }],
      },
      {
        id: "contra_ocultos",
        label: "Ojo avizor",
        texto: "Un éxito cuenta como crítico en alerta contra enemigos ocultos (casilla en Buscar / percibir).",
        motor: [casilla("alerta_activa")],
      },
      {
        id: "deslumbramiento",
        label: "Deslumbramiento",
        texto:
          "Explosión de plasma, destello intenso o PEM: ceguera (dificultad 9); otras cegueras similares, dificultad +3.",
        motor: [textoBloqueado("salv_ceguera_destello", ESTADOS_DEFINIDOS)],
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
        motor: [casilla("salv_voluntad")],
      },
      {
        id: "rigidez_narcisista",
        label: "Rigidez narcisista",
        texto: "Un fallo en Empatía, Humor o Negociación es fallo crítico (cualquier tirada con una especialidad de ese nombre).",
        motor: [casilla("todas")],
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
    rasgos: [
      {
        id: "bolsa_aumentos",
        label: "Civilización Aumentada",
        texto:
          "60.000 créditos aparte, solo para aumentos; se gastan antes que los créditos normales y lo que sobre al aprobar se pierde.",
        creacion: true,
        bolsaAumentos: 60_000,
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
        motor: [sinDescanso],
      },
      {
        id: "piel_irisada",
        label: "Piel Irisada",
        texto: "+2 para resistir la radiación astral o ambiental (casilla en Salvación de Fortaleza).",
        motor: [casilla("salv_fortaleza")],
      },
      {
        id: "estasis",
        label: "Estasis",
        texto: "Entran y salen de estasis sin apenas daño celular.",
        motor: [narrativo],
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
        id: "vision_uv_ir",
        label: "Visión UV e Infrarroja",
        texto: "Ve el calor y las huellas químicas o eléctricas; cuesta 1 punto de fatiga por hora.",
        motor: [{ tipo: "accion", afecta: { modo: "accion_nueva", id: "activar_vision" }, mecanismo: "accion_sin_equipo", estado: "pendiente" }],
      },
      {
        id: "empatia_biologica",
        label: "Empatía Biológica",
        texto:
          "+2 a la tirada pertinente tocando o muy cerca; requiere concentración, en combate es acción compleja (casilla en Buscar / percibir y Tratar heridas).",
        motor: [casilla("alerta_activa"), casilla("medicina")],
      },
      {
        id: "movimiento_acuatico",
        label: "Movimiento Acuático",
        texto: "Nado: 8 + (Potencia + Atletismo)/2 m, sustituye al general.",
        motor: [derivadoPendiente("E3 (movimiento por especie)")],
      },
      {
        id: "apnea",
        label: "Apnea",
        texto: "Aguantan el doble que un humano sin respirar.",
        motor: [narrativo],
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
        motor: [derivadoPendiente("E3 (movimiento por especie)")],
      },
      {
        id: "carga",
        label: "Capacidad de Carga",
        texto: "Carga total × 1,2.",
        motor: [derivadoPendiente("E3 (carga por especie)")],
      },
      {
        id: "inamovibles",
        label: "Inamovibles",
        texto: "+2 para evitar derribos (casilla en Saltar, escalar, levantarse).",
        motor: [casilla("atletismo")],
      },
      {
        id: "matriz_biometalica",
        label: "Matriz Biometálica",
        texto: "Armadura natural 1, se suma a la puesta (no contra Fuego ni Mental). Crítico desarmado: daño letal.",
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "bloquear_danio" }, mecanismo: "suma_derivado", estado: "pendiente" },
          { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "pendiente" },
        ],
      },
      {
        id: "percepcion_sensorial",
        label: "Percepción sensorial",
        texto: "−1 en ataques a distancia (no granadas ni arrojadizas) y en percepción visual (no en Alerta pasiva).",
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "siempre_activo", estado: "pendiente" },
          casilla("alerta_activa"),
        ],
      },
      {
        id: "adaptacion_termica",
        label: "Adaptación Térmica",
        texto: "+2 contra efectos de temperatura (casilla en Salvación de Fortaleza).",
        motor: [casilla("salv_fortaleza")],
      },
      {
        id: "sistemas_filtradores",
        label: "Sistemas Filtradores",
        texto: "+2 contra efectos de filtración en el aire (casilla en Salvación de Fortaleza).",
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
  const casta = especie.castas?.find((c) => c.id === r.casta);
  if (!casta) return {};
  const linaje =
    especie.linajes && especie.linajes.casta === casta.id
      ? especie.linajes.opciones.find((l) => l.id === r.linaje)
      : undefined;
  return linaje ? { casta: casta.id, linaje: linaje.id } : { casta: casta.id };
}
