// Catálogo de equipo (fase 3, ver docs/handoff.md §6 y docs/plan-app.md).
//
// Fase A: catálogo completo de armaduras, mejoras estándar y subsistemas, más
// los datos (sin motor todavía) de las dos mejoras de movimiento. Empezó como
// un slice de 4 piezas para validar el patrón de datos y la interfaz antes de
// escalar — ese patrón es el que sigue todo lo demás.
//
// Fuente: docs/equipamiento.md (EQUIP). Los campos numéricos y el texto de
// `detalle`/`descripcion` son transcripción fiel; `resumen` es redacción
// nuestra para la card cerrada de la interfaz, no una regla.
//
// `modificadores` solo lleva los efectos numéricos SIN condición ("mientras
// lo lleves puesto, +N") — igual que especies.ts. Lo que depende de un modo,
// un contexto narrativo, de otra pieza (p.ej. "mejora el bono de LA ARMADURA
// a +2") o de un concepto que el motor no modela todavía (absorción de daño,
// alcance de vuelo...) se queda solo en `detalle`, en texto: forzarlo a un
// número sería inventarse una regla que el documento no da.
//
// Supuesto S9 (ver docs/sistema.md): cuando un nivel añade una ventaja nueva
// sin repetir ni anular las de niveles anteriores, se asume que se acumulan
// (nivel N conserva 1..N-1). Cuando el documento da un total explícito para
// ESE nivel ("mejora la bonificación a +2"), se usa ese total tal cual, sin
// sumarlo al de niveles inferiores.
import type { Modificador } from "../rules/modificadores";
import { ARMAS_MELEE, type ArmaMelee } from "./armasMelee";

export type Rareza = "Común" | "Poco Habitual" | "Extraño" | "Muy Extraño" | "Singular";

// ── Armaduras y trajes ──────────────────────────────────────────────────
export type Armadura = {
  familia: "armadura";
  id: string;
  label: string;
  resumen: string;
  descripcion: string;
  blindaje: number;
  bonifMaxAgilidad: number | null; // null = "Ilimitado"
  ranurasSubsistema: number;
  topeExoesqueleto: number | null; // null = no admite el módulo
  topeMovilidadAerea: number | null;
  rareza: Rareza;
  coste: number;
  modificadores: Modificador[];
};

// Las 4 "avanzadas" comparten un único párrafo de descripción en el
// documento (no hay uno distinto por modelo): prototipos caros, mejores en
// todo, con rendimiento añadido en subsistemas. No repite el bono de
// congelación/llamarada para ellas, así que no se le supone (a diferencia de
// los niveles de un mismo módulo, esto son modelos distintos — el supuesto S9
// no aplica entre modelos).
const DESCRIPCION_AVANZADA =
  "En fase de prototipo, con un alto coste de fabricación por el diseño y los metamateriales " +
  "avanzados que usa. Su mejoría es evidente en todos los aspectos, tanto a nivel defensivo como " +
  "en el movimiento, y saca un rendimiento añadido a los subsistemas integrados, permitiendo el " +
  "uso de varias baterías superconductoras de forma simultánea.";

export const ARMADURAS: Armadura[] = [
  {
    familia: "armadura",
    id: "ropa_reforzada",
    label: "Ropa Reforzada",
    resumen: "La opción más barata: blindaje mínimo, sin subsistemas ni extras.",
    descripcion:
      "El documento no da más detalle que la tabla: blindaje básico sin ranuras de personalización " +
      "ni soporte para exoesqueleto o movilidad aérea. La entrada de precio del catálogo.",
    blindaje: 1,
    bonifMaxAgilidad: 4,
    ranurasSubsistema: 0,
    topeExoesqueleto: null,
    topeMovilidadAerea: null,
    rareza: "Común",
    coste: 100,
    modificadores: [],
  },
  {
    familia: "armadura",
    id: "traje_ultra_ligero",
    label: "Traje Ultra Ligero",
    resumen: "Nanomateriales apilados, sellado térmico: defensa alta sin apenas estorbar.",
    descripcion:
      "Un sofisticado traje de nanomateriales apilados que forman pequeñas láminas, fabricado con " +
      "láser, sellado térmicamente para mejor adaptabilidad y cobertura. El traje otorga un " +
      "bonificador en tiradas de salvación contra congelación y llamarada de +1.",
    blindaje: 3,
    bonifMaxAgilidad: null,
    ranurasSubsistema: 1,
    topeExoesqueleto: 1,
    topeMovilidadAerea: null,
    rareza: "Común",
    coste: 4000,
    modificadores: [
      { tipo: "tirada", contexto: "salvación de congelación", valor: 1 },
      { tipo: "tirada", contexto: "salvación de llamarada", valor: 1 },
    ],
  },
  {
    familia: "armadura",
    id: "ropa_inteligente",
    label: "Ropa Inteligente",
    resumen: "Los mismos materiales que el traje ultra ligero, con pinta de ropa normal.",
    descripcion:
      "Usando los mismos materiales que el traje ultra ligero, ofrece una defensa casi tan óptima " +
      "pero con apariencia de conjunto de ropa normal — chaqueta, pantalón y calzado, de lo más " +
      "elegante a lo puramente casual. Al igual que el traje, otorga un bonificador en tiradas de " +
      "salvación contra congelación y llamarada de +1.",
    blindaje: 2,
    bonifMaxAgilidad: null,
    ranurasSubsistema: 1,
    topeExoesqueleto: 1,
    topeMovilidadAerea: null,
    rareza: "Poco Habitual",
    coste: 5000,
    modificadores: [
      { tipo: "tirada", contexto: "salvación de congelación", valor: 1 },
      { tipo: "tirada", contexto: "salvación de llamarada", valor: 1 },
    ],
  },
  {
    familia: "armadura",
    id: "armadura_ligera",
    label: "Armadura Ligera",
    resumen: "El término medio del mercado: protección sólida sin sacrificar mucha movilidad.",
    descripcion:
      "La armadura ligera añade al traje una coraza parcial y zonas blindadas en las extremidades. " +
      "Su estructura permite integrar exoesqueleto biomecánico para mejorar el rendimiento físico " +
      "del usuario. Su naturaleza aislante otorga un bonificador en tiradas de salvación contra " +
      "congelación y llamarada de +1. La relación de movilidad, defensa, versatilidad y por " +
      "supuesto, precio, la convierten en la estrella del mercado.",
    blindaje: 4,
    bonifMaxAgilidad: 4,
    ranurasSubsistema: 1,
    topeExoesqueleto: 2,
    topeMovilidadAerea: 2,
    rareza: "Común",
    coste: 6000,
    modificadores: [
      { tipo: "tirada", contexto: "salvación de congelación", valor: 1 },
      { tipo: "tirada", contexto: "salvación de llamarada", valor: 1 },
    ],
  },
  {
    familia: "armadura",
    id: "armadura_intermedia",
    label: "Armadura Intermedia",
    resumen: "Más protección, más limitación de movilidad, fabricación menos frecuente.",
    descripcion:
      "En pro de ofrecer una mayor protección, este modelo limita en mayor grado la movilidad y, " +
      "aunque su eficiencia es probada, su coste adicional hace que su fabricación sea más " +
      "infrecuente. Como su hermana menor, otorga el mismo bonificador contra congelación y " +
      "llamarada.",
    blindaje: 6,
    bonifMaxAgilidad: 2,
    ranurasSubsistema: 1,
    topeExoesqueleto: 3,
    topeMovilidadAerea: 3,
    rareza: "Poco Habitual",
    coste: 12000,
    modificadores: [
      { tipo: "tirada", contexto: "salvación de congelación", valor: 1 },
      { tipo: "tirada", contexto: "salvación de llamarada", valor: 1 },
    ],
  },
  {
    familia: "armadura",
    id: "armadura_pesada",
    label: "Armadura Pesada",
    resumen: "La más ambiciosa de las armaduras corrientes: casi una servoarmadura.",
    descripcion:
      "La más ambiciosa de los modelos de combate corrientes, con una eficiencia en defensa a la " +
      "par que muchas servoarmaduras. Posibilita incorporar grandes exoesqueletos biomecánicos y " +
      "propulsores de movilidad aérea, y tiene capacidad para varias baterías, permitiendo usar " +
      "varios subsistemas a la vez. Apenas la usan unidades de élite en misiones de asalto de alto " +
      "riesgo: su portentosa defensa limita mucho la agilidad, por lo que no es habitual en " +
      "infiltración. Confiere un bonificador de +1 en salvaciones contra congelación y llamarada.",
    blindaje: 8,
    bonifMaxAgilidad: 0,
    ranurasSubsistema: 2,
    topeExoesqueleto: 4,
    topeMovilidadAerea: 4,
    rareza: "Extraño",
    coste: 20000,
    modificadores: [
      { tipo: "tirada", contexto: "salvación de congelación", valor: 1 },
      { tipo: "tirada", contexto: "salvación de llamarada", valor: 1 },
    ],
  },
  {
    familia: "armadura",
    id: "ultra_ligero_avanzado",
    label: "Ultra Ligero Avanzado",
    resumen: "La versión prototipo del traje ultra ligero: mismo perfil, mejor en todo.",
    descripcion: DESCRIPCION_AVANZADA,
    blindaje: 4,
    bonifMaxAgilidad: null,
    ranurasSubsistema: 2,
    topeExoesqueleto: 1,
    topeMovilidadAerea: 1,
    rareza: "Muy Extraño",
    coste: 100000,
    modificadores: [],
  },
  {
    familia: "armadura",
    id: "armadura_ligera_avanzada",
    label: "Armadura Ligera Avanzada",
    resumen: "La versión prototipo de la armadura ligera: mismo perfil, mejor en todo.",
    descripcion: DESCRIPCION_AVANZADA,
    blindaje: 5,
    bonifMaxAgilidad: 4,
    ranurasSubsistema: 2,
    topeExoesqueleto: 3,
    topeMovilidadAerea: 2,
    rareza: "Muy Extraño",
    coste: 105000,
    modificadores: [],
  },
  {
    familia: "armadura",
    id: "armadura_intermedia_avanzada",
    label: "Armadura Intermedia Avanzada",
    resumen: "La versión prototipo de la armadura intermedia: mismo perfil, mejor en todo.",
    descripcion: DESCRIPCION_AVANZADA,
    blindaje: 6,
    bonifMaxAgilidad: 3,
    ranurasSubsistema: 2,
    topeExoesqueleto: 4,
    topeMovilidadAerea: 3,
    rareza: "Muy Extraño",
    coste: 120000,
    modificadores: [],
  },
  {
    familia: "armadura",
    id: "armadura_pesada_avanzada",
    label: "Armadura Pesada Avanzada",
    resumen: "La versión prototipo de la armadura pesada: mismo perfil, mejor en todo.",
    descripcion: DESCRIPCION_AVANZADA,
    blindaje: 8,
    bonifMaxAgilidad: 1,
    ranurasSubsistema: 3,
    topeExoesqueleto: 4,
    topeMovilidadAerea: 4,
    rareza: "Muy Extraño",
    coste: 200000,
    modificadores: [],
  },
];

// ── Armas de fuego ────────────────────────────────────────────────────
// Un modo de disparo: acción, dificultad propia y daño. La mayoría de las
// armas tienen uno solo; las que llevan fuego automático tienen dos (semi y
// automático), con su propia dificultad y su propio daño — nunca comparten
// alcance, munición, mejoras admitidas ni peso, que son del arma entera.
export type ModoDisparo = {
  etiqueta: string; // "Simple", "Estándar (F. Auto)"…
  dificultad: number; // penalizador propio del modo; se suma a la tirada de ataque
  danio: number;
  categoriaDanio: string; // "Letal", "Fuego", "Grave", "Plasma"…
};

// Categoría del arma — la usa la compatibilidad de las mejoras de arma
// ("solo fusiles de asalto y de precisión", "solo Fusil de Asalto"…).
export type TipoArma =
  | "pistola"
  | "escopeta"
  | "subfusil"
  | "fusil_asalto"
  | "fusil_precision"
  | "ametralladora";

export type ArmaFuego = {
  familia: "arma";
  id: string;
  label: string;
  resumen: string;
  descripcion: string;
  empleo: "una mano" | "dos manos";
  tipo: TipoArma;
  modos: ModoDisparo[];
  // Metros a los que EMPIEZA cada tramo (ver "Distancia de disparo" en EQUIP:
  // a bocajarro +4, corta +2, media +0, larga -2 — modificador común a toda arma de fuego).
  alcance: { corta: number; media: number; larga: number };
  municion: number;
  mejorasAdmitidas: number;
  especial: string | null;
  pesoKg: number;
  rareza: Rareza;
  coste: number;
  modificadores: Modificador[];
};

// ── Pistolas ── Empleo: una mano. Desenfundado: acción simple. Algunas
// tienen fuego automático en área de dos casillas adyacentes, consumiendo el cargador completo.
export const ARMAS: ArmaFuego[] = [
  {
    familia: "arma",
    id: "pistola_mosquito",
    label: "Mosquito",
    resumen: "La pistola más ligera y barata del catálogo: poco daño, muy fácil de esconder.",
    descripcion:
      "El arma de fuego más ligera fabricada en serie. Sus posibilidades son limitadas, pero es " +
      "muy sencilla de usar y más fácil de ocultar: +2 a tiradas relacionadas con su ocultación " +
      "respecto al resto de pistolas. Además sus piezas usan polímeros especiales para evitar " +
      "detectores convencionales.",
    empleo: "una mano",
    tipo: "pistola",
    modos: [{ etiqueta: "Simple", dificultad: -2, danio: 7, categoriaDanio: "Letal" }],
    alcance: { corta: 6, media: 20, larga: 40 },
    municion: 7,
    mejorasAdmitidas: 0,
    especial: "Bonificador de +2 para esconder el arma",
    pesoKg: 0.5,
    rareza: "Común",
    coste: 100,
    modificadores: [{ tipo: "tirada", contexto: "ocultar arma", valor: 2 }],
  },
  {
    familia: "arma",
    id: "pistola_bellum",
    label: "Bellum",
    resumen: "Pistola humana de gran poder de parada para lo barata que es.",
    descripcion: "Pistola de manufactura humana con gran poder de parada en relación a su coste.",
    empleo: "una mano",
    tipo: "pistola",
    modos: [{ etiqueta: "Simple", dificultad: -4, danio: 10, categoriaDanio: "Letal" }],
    alcance: { corta: 10, media: 30, larga: 60 },
    municion: 10,
    mejorasAdmitidas: 2,
    especial: "Crítico de Aturdimiento (8)",
    pesoKg: 1,
    rareza: "Común",
    coste: 150,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "pistola_dragon",
    label: "Dragon",
    resumen: "Tecnología de la confederación: cargador corto, calibre grande, mucho daño.",
    descripcion:
      "Tecnología de la confederación, cargador limitado con 6 disparos, cartucho especial con " +
      "bala de 13 mm; uno de los modelos que más daño produce.",
    empleo: "una mano",
    tipo: "pistola",
    modos: [{ etiqueta: "Estándar", dificultad: -4, danio: 12, categoriaDanio: "Letal" }],
    alcance: { corta: 8, media: 24, larga: 48 },
    municion: 6,
    mejorasAdmitidas: 3,
    especial: "Crítico de Aturdimiento (9)",
    pesoKg: 1,
    rareza: "Común",
    coste: 300,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "pistola_sydiasi",
    label: "Sydiasi",
    resumen: "Pistola ametralladora arianyi de dos modos, con penalizador por retroceso en automático.",
    descripcion:
      "Pistola ametralladora de diseño arianyi con dos modos de disparo. El automático se " +
      "desarrolla como acción estándar, tiene penalizador por retroceso y consume 3 disparos del " +
      "cargador por ataque. Puede usarse a dos manos para eliminar ese penalizador.",
    empleo: "una mano",
    tipo: "pistola",
    modos: [
      { etiqueta: "Simple", dificultad: -3, danio: 9, categoriaDanio: "Letal" },
      { etiqueta: "Estándar (F. Auto)", dificultad: -4, danio: 12, categoriaDanio: "Letal" },
    ],
    alcance: { corta: 10, media: 30, larga: 60 },
    municion: 20,
    mejorasAdmitidas: 4,
    especial: "Crítico de Aturdimiento (8) · F. Auto (Esquiva 8)",
    pesoKg: 1.5,
    rareza: "Poco Habitual",
    coste: 500,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "pistola_norgul",
    label: "Norgul",
    resumen: "La hermana mayor arkorü de la Bellum: más sutil, más cara, admite más mejoras.",
    descripcion:
      "Diseñada de la forma más sutil y ligera posible por técnicos arkorü, considerada la hermana " +
      "mayor de la Bellum humana; más costosa de fabricar pero admite numerosas aplicaciones extra.",
    empleo: "una mano",
    tipo: "pistola",
    modos: [{ etiqueta: "Simple", dificultad: -4, danio: 11, categoriaDanio: "Letal" }],
    alcance: { corta: 10, media: 30, larga: 60 },
    municion: 7,
    mejorasAdmitidas: 4,
    especial: "Crítico de Aturdimiento (9)",
    pesoKg: 2,
    rareza: "Extraño",
    coste: 5000,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "pistola_laser",
    label: "Pistola Láser",
    resumen: "Daño de fuego a larga distancia, con modo automático incluido.",
    descripcion:
      "Arma de energía que dispara pulsos láser; causa daño de fuego con posibilidad de llamarada " +
      "y ceguera en crítico.",
    empleo: "una mano",
    tipo: "pistola",
    modos: [
      { etiqueta: "Simple", dificultad: -2, danio: 8, categoriaDanio: "Fuego" },
      { etiqueta: "Estándar (F. Auto)", dificultad: -2, danio: 11, categoriaDanio: "Fuego" },
    ],
    alcance: { corta: 16, media: 60, larga: 120 },
    municion: 80,
    mejorasAdmitidas: 2,
    especial: "Efecto Llamarada (9) · Crítico de Ceguera (10) · F. Auto (Esquiva 9)",
    pesoKg: 1,
    rareza: "Extraño",
    coste: 8000,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "pistola_rayo_ligero",
    label: "Rayo Ligero",
    resumen: "Rayo de partículas que causa daño grave; su luminiscencia delata al usuario.",
    descripcion:
      "Potente rayo de partículas con dos modos de disparo. Por la luminiscencia del rayo, -6 al " +
      "sigilo al dispararla (solo percepción visual).",
    empleo: "una mano",
    tipo: "pistola",
    modos: [
      { etiqueta: "Simple", dificultad: -3, danio: 9, categoriaDanio: "Grave" },
      { etiqueta: "Estándar (F. Auto)", dificultad: -4, danio: 12, categoriaDanio: "Grave" },
    ],
    alcance: { corta: 12, media: 40, larga: 80 },
    municion: 26,
    mejorasAdmitidas: 2,
    especial: "Efecto Shock (5) · Crítico de Shock (12) · F. Auto (Esquiva 9)",
    pesoKg: 2,
    rareza: "Muy Extraño",
    coste: 30000,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "pistola_plasma_sd",
    label: "Plasma SD",
    resumen: "Prototipo de última generación: proyectiles de plasma que pueden causar fusión.",
    descripcion:
      "Arma de última generación en fase de prototipo, fabricación limitada. Lanza proyectiles de " +
      "plasma supercaliente que causan daño grave. Por la luminiscencia del proyectil, -6 al " +
      "sigilo al dispararla (solo percepción visual).",
    empleo: "una mano",
    tipo: "pistola",
    modos: [
      { etiqueta: "Simple", dificultad: -3, danio: 12, categoriaDanio: "Plasma" },
      { etiqueta: "Estándar (F. Auto)", dificultad: -3, danio: 16, categoriaDanio: "Plasma" },
    ],
    alcance: { corta: 10, media: 30, larga: 60 },
    municion: 13,
    mejorasAdmitidas: 2,
    especial: "Efecto Shock y Llamarada (7) · Crítico de Fusión (11) · F. Auto (Esquiva 9)",
    pesoKg: 3,
    rareza: "Muy Extraño",
    coste: 45000,
    modificadores: [],
  },

  // ── Escopetas ── Empleo: dos manos. Desenfundado: acción simple. +1 al
  // ataque en Corta Distancia y A Bocajarro (acumulativo), y a esas
  // distancias el arma causa Derribo. Las que tienen F. Auto disparan en
  // área de dos casillas adyacentes, consumiendo el cargador completo.
  {
    familia: "arma",
    id: "escopeta_feritas",
    label: "Feritas",
    resumen: "Calibre 12 estándar: la escopeta que se usa para todo.",
    descripcion:
      "Calibre estándar del 12; \"se usa para todo\", como anuncian sus fabricantes. Como toda " +
      "escopeta, +1 al ataque y Derribo en Corta Distancia y a Bocajarro.",
    empleo: "dos manos",
    tipo: "escopeta",
    modos: [{ etiqueta: "Estándar", dificultad: -4, danio: 13, categoriaDanio: "Letal" }],
    alcance: { corta: 12, media: 32, larga: 58 },
    municion: 7,
    mejorasAdmitidas: 2,
    especial: "Efecto Derribo a Corta Distancia (9) · Crítico de Aturdimiento (12)",
    pesoKg: 4,
    rareza: "Común",
    coste: 250,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "escopeta_azra",
    label: "Azra",
    resumen: "Escopeta de corredera arianyi con buen equilibrio entre alcance y letalidad.",
    descripcion:
      "Modelo arianyi de corredera, buena relación entre distancia y letalidad gracias a su calibre " +
      "intermedio. Como toda escopeta, +1 al ataque y Derribo en Corta Distancia y a Bocajarro.",
    empleo: "dos manos",
    tipo: "escopeta",
    modos: [{ etiqueta: "Estándar", dificultad: -3, danio: 12, categoriaDanio: "Letal" }],
    alcance: { corta: 16, media: 40, larga: 74 },
    municion: 8,
    mejorasAdmitidas: 3,
    especial: "Efecto Derribo a Corta Distancia (8) · Crítico de Aturdimiento (11)",
    pesoKg: 4,
    rareza: "Común",
    coste: 400,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "escopeta_sa79",
    label: "S.A.79",
    resumen: "Escopeta semiautomática o automática con tambor de 20 cartuchos.",
    descripcion:
      "Selector de fuego semiautomático o automático, alimentada con tambor extraíble de 20 " +
      "cartuchos. Como toda escopeta, +1 al ataque y Derribo en Corta Distancia y a Bocajarro.",
    empleo: "dos manos",
    tipo: "escopeta",
    modos: [
      { etiqueta: "Estándar", dificultad: -3, danio: 12, categoriaDanio: "Letal" },
      { etiqueta: "Compleja (F. Auto)", dificultad: -4, danio: 16, categoriaDanio: "Letal" },
    ],
    alcance: { corta: 14, media: 36, larga: 68 },
    municion: 24,
    mejorasAdmitidas: 4,
    especial: "Efecto Derribo a Corta Distancia (8) · Crítico de Aturdimiento (11) · F. Auto (Esquiva 8)",
    pesoKg: 6.5,
    rareza: "Poco Habitual",
    coste: 1200,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "escopeta_gong",
    label: "Gong",
    resumen: "Fabricación arkorü de calibre único; escasa por su coste y su poder devastador.",
    descripcion:
      "Fabricación arkorü con calibre único diseñado para el modelo y un diseño que evita el " +
      "retroceso pese a su tamaño. Tambor giratorio de 12 cartuchos, similar al de un revólver. " +
      "Apenas se fabrica por su alto coste; su efecto devastador provocó movilizaciones para " +
      "impedir su distribución. Como toda escopeta, +1 al ataque y Derribo en Corta Distancia y a " +
      "Bocajarro.",
    empleo: "dos manos",
    tipo: "escopeta",
    modos: [{ etiqueta: "Estándar", dificultad: -4, danio: 14, categoriaDanio: "Letal" }],
    alcance: { corta: 14, media: 36, larga: 68 },
    municion: 12,
    mejorasAdmitidas: 4,
    especial: "Efecto Derribo a Corta Distancia (9) · Crítico de Aturdimiento (14)",
    pesoKg: 6,
    rareza: "Muy Extraño",
    coste: 12500,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "escopeta_plasma_sc",
    label: "Plasma SG",
    resumen: "Escopeta de plasma: sin retroceso, pero delata al usuario por su luminiscencia.",
    descripcion:
      // (sic) el documento la llama "Plasma SG" en la descripción y "Plasma SC" en la tabla.
      "Proyectiles de plasma supercaliente que causan daño grave. Además de tener modo automático, " +
      "las armas de plasma no acumulan retroceso gracias a su sistema de electroimanes. Por la " +
      "luminiscencia del proyectil, -6 al sigilo al dispararla (solo percepción visual). Como toda " +
      "escopeta, +1 al ataque y Derribo en Corta Distancia y a Bocajarro.",
    empleo: "dos manos",
    tipo: "escopeta",
    modos: [
      { etiqueta: "Estándar", dificultad: -4, danio: 14, categoriaDanio: "Plasma" },
      { etiqueta: "Compleja (F. Auto)", dificultad: -4, danio: 18, categoriaDanio: "Plasma" },
    ],
    alcance: { corta: 16, media: 40, larga: 74 },
    municion: 18,
    mejorasAdmitidas: 2,
    especial: "Efecto Shock y Llamarada (8) · Crítico de Fusión (12) · F. Auto (Esquiva 10)",
    pesoKg: 7.5,
    rareza: "Muy Extraño",
    coste: 56000,
    modificadores: [],
  },

  // ── Subfusiles ── Empleo: dos manos. Desenfundado: acción simple. Todos
  // tienen fuego automático en área de dos casillas adyacentes, consumiendo
  // el cargador completo.
  {
    familia: "arma",
    id: "subfusil_nova",
    label: "Nova",
    resumen: "Subfusil de referencia, sin nada que lo distinga del resto del catálogo.",
    descripcion: "Subfusil estándar del catálogo, base de comparación de sus variantes mejoradas.",
    empleo: "dos manos",
    tipo: "subfusil",
    modos: [
      { etiqueta: "Simple", dificultad: -3, danio: 11, categoriaDanio: "Letal" },
      { etiqueta: "Estándar (F. Auto)", dificultad: -4, danio: 14, categoriaDanio: "Letal" },
    ],
    alcance: { corta: 26, media: 74, larga: 150 },
    municion: 24,
    mejorasAdmitidas: 3,
    especial: "Crítico de Aturdimiento (10) · F. Auto (Esquiva 8)",
    pesoKg: 3,
    rareza: "Común",
    coste: 350,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "subfusil_vrekoy",
    label: "Vrekoy",
    resumen: "Cargador enorme para un subfusil: 53 proyectiles antes de recargar.",
    descripcion: "Subfusil con un cargador muy por encima de la media de su clase.",
    empleo: "dos manos",
    tipo: "subfusil",
    modos: [
      { etiqueta: "Simple", dificultad: -3, danio: 10, categoriaDanio: "Letal" },
      { etiqueta: "Estándar (F. Auto)", dificultad: -4, danio: 13, categoriaDanio: "Letal" },
    ],
    alcance: { corta: 30, media: 100, larga: 200 },
    municion: 53,
    mejorasAdmitidas: 3,
    especial: "Crítico de Aturdimiento (10) · F. Auto (Esquiva 8)",
    pesoKg: 2.5,
    rareza: "Común",
    coste: 500,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "subfusil_fas300",
    label: "FAS 300",
    resumen: "Subfusil de gama algo más alta, con más alcance que el Nova.",
    descripcion: "Evolución del subfusil estándar, con más alcance y algo más de coste.",
    empleo: "dos manos",
    tipo: "subfusil",
    modos: [
      { etiqueta: "Simple", dificultad: -3, danio: 11, categoriaDanio: "Letal" },
      { etiqueta: "Estándar (F. Auto)", dificultad: -4, danio: 14, categoriaDanio: "Letal" },
    ],
    alcance: { corta: 30, media: 100, larga: 200 },
    municion: 24,
    mejorasAdmitidas: 3,
    especial: "Crítico de Aturdimiento (11) · F. Auto (Esquiva 8)",
    pesoKg: 3,
    rareza: "Poco Habitual",
    coste: 900,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "subfusil_victoria",
    label: "Victoria",
    resumen: "Versión mejorada de la Nova: más ligera y resistente con metamateriales.",
    descripcion:
      "Versión mejorada de la Nova, más ligera y a la vez resistente gracias a los metamateriales; " +
      "diseño optimizado para más aplicaciones.",
    empleo: "dos manos",
    tipo: "subfusil",
    modos: [
      { etiqueta: "Simple", dificultad: -2, danio: 11, categoriaDanio: "Letal" },
      { etiqueta: "Estándar (F. Auto)", dificultad: -3, danio: 14, categoriaDanio: "Letal" },
    ],
    alcance: { corta: 26, media: 74, larga: 150 },
    municion: 20,
    mejorasAdmitidas: 4,
    especial: "Crítico de Aturdimiento (11) · F. Auto (Esquiva 9)",
    pesoKg: 2,
    rareza: "Extraño",
    coste: 25500,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "subfusil_plasma_sb",
    label: "Plasma SB",
    resumen: "Subfusil de plasma en fase de prototipo: daño grave, sin retroceso.",
    descripcion:
      "En fase de prototipo. Daño grave, sin retroceso por el sistema de electroimanes. Al atacar, " +
      "-5 al sigilo (solo percepción visual).",
    empleo: "dos manos",
    tipo: "subfusil",
    modos: [
      { etiqueta: "Simple", dificultad: -3, danio: 13, categoriaDanio: "Plasma" },
      { etiqueta: "Estándar (F. Auto)", dificultad: -3, danio: 17, categoriaDanio: "Plasma" },
    ],
    alcance: { corta: 40, media: 120, larga: 240 },
    municion: 26,
    mejorasAdmitidas: 2,
    especial: "Efecto Shock y Llamarada (8) · Crítico de Fusión (12) · F. Auto (Esquiva 10)",
    pesoKg: 4.5,
    rareza: "Extraño",
    coste: 56000,
    modificadores: [],
  },

  // ── Fusiles de Asalto ── Empleo: dos manos. Desenfundado: acción simple.
  // Todos tienen fuego automático en área de dos casillas adyacentes,
  // consumiendo el cargador completo.
  {
    familia: "arma",
    id: "fusil_asalto_impetus",
    label: "Impetus",
    resumen: "El fusil de asalto de entrada: barato, común, sin sorpresas.",
    descripcion: "Fusil de asalto de referencia, el más barato y común de su clase.",
    empleo: "dos manos",
    tipo: "fusil_asalto",
    modos: [
      { etiqueta: "Simple", dificultad: -3, danio: 10, categoriaDanio: "Letal" },
      { etiqueta: "Estándar (F. Auto)", dificultad: -4, danio: 13, categoriaDanio: "Letal" },
    ],
    alcance: { corta: 40, media: 200, larga: 400 },
    municion: 28,
    mejorasAdmitidas: 3,
    especial: "Crítico de Aturdimiento (10) · F. Auto (Esquiva 8)",
    pesoKg: 5.5,
    rareza: "Común",
    coste: 500,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "fusil_asalto_davray",
    label: "Davray",
    resumen: "Más alcance que el Impetus, algo menos de daño por disparo.",
    descripcion: "Variante de fusil de asalto con más alcance a cambio de algo menos de daño.",
    empleo: "dos manos",
    tipo: "fusil_asalto",
    modos: [
      { etiqueta: "Simple", dificultad: -3, danio: 9, categoriaDanio: "Letal" },
      { etiqueta: "Estándar (F. Auto)", dificultad: -4, danio: 12, categoriaDanio: "Letal" },
    ],
    alcance: { corta: 44, media: 260, larga: 520 },
    municion: 24,
    mejorasAdmitidas: 3,
    especial: "Crítico de Aturdimiento (10) · F. Auto (Esquiva 8)",
    pesoKg: 4,
    rareza: "Común",
    coste: 750,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "fusil_asalto_b12",
    label: "B12",
    resumen: "Fusil de asalto de gama algo más alta, con más alcance todavía.",
    descripcion: "Evolución del Davray con algo más de alcance y cargador.",
    empleo: "dos manos",
    tipo: "fusil_asalto",
    modos: [
      { etiqueta: "Simple", dificultad: -3, danio: 9, categoriaDanio: "Letal" },
      { etiqueta: "Estándar (F. Auto)", dificultad: -4, danio: 12, categoriaDanio: "Letal" },
    ],
    alcance: { corta: 48, media: 290, larga: 580 },
    municion: 30,
    mejorasAdmitidas: 3,
    especial: "Crítico de Aturdimiento (10) · F. Auto (Esquiva 8)",
    pesoKg: 4,
    rareza: "Poco Habitual",
    coste: 1100,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "fusil_asalto_laser",
    label: "Fusil Láser",
    resumen: "Alcance enorme y munición casi ilimitada: daño de fuego a distancia.",
    descripcion:
      "Arma de energía de gran alcance, con un cargador de 800 disparos. Causa daño de fuego con " +
      "posibilidad de llamarada y ceguera en crítico.",
    empleo: "dos manos",
    tipo: "fusil_asalto",
    modos: [
      { etiqueta: "Simple", dificultad: -2, danio: 8, categoriaDanio: "Fuego" },
      { etiqueta: "Estándar (F. Auto)", dificultad: -2, danio: 10, categoriaDanio: "Fuego" },
    ],
    alcance: { corta: 60, media: 450, larga: 900 },
    municion: 800,
    mejorasAdmitidas: 3,
    especial: "Efecto Llamarada (8) · Crítico de Ceguera (10) · F. Auto (Esquiva 10)",
    pesoKg: 3.5,
    rareza: "Extraño",
    coste: 16000,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "fusil_asalto_yojimbo",
    label: "Yojimbo",
    resumen: "Fusil de asalto de gama alta, con hasta 5 mejoras admitidas.",
    descripcion: "Modelo de gama alta, con más alcance, daño y mejoras admitidas que el resto de su clase.",
    empleo: "dos manos",
    tipo: "fusil_asalto",
    modos: [
      { etiqueta: "Simple", dificultad: -3, danio: 10, categoriaDanio: "Letal" },
      { etiqueta: "Estándar (F. Auto)", dificultad: -4, danio: 13, categoriaDanio: "Letal" },
    ],
    alcance: { corta: 50, media: 300, larga: 600 },
    municion: 30,
    mejorasAdmitidas: 5,
    especial: "Crítico de Aturdimiento (10) · F. Auto (Esquiva 9)",
    pesoKg: 3.5,
    rareza: "Extraño",
    coste: 18500,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "fusil_asalto_rayo_particulas",
    label: "Rayo de Partículas",
    resumen: "Fusil de asalto de energía, recién comercializado: daño grave con posible shock.",
    descripcion:
      "Recién comercializado, en versión estándar como fusil de asalto. Lanza un rayo de " +
      "partículas o haz de energía con dos modos de disparo. El ataque es de tipo cinético y puede " +
      "causar shock.",
    empleo: "dos manos",
    tipo: "fusil_asalto",
    modos: [
      { etiqueta: "Simple", dificultad: -3, danio: 9, categoriaDanio: "Grave" },
      { etiqueta: "Estándar (F. Auto)", dificultad: -4, danio: 12, categoriaDanio: "Grave" },
    ],
    alcance: { corta: 50, media: 400, larga: 800 },
    municion: 66,
    mejorasAdmitidas: 3,
    especial: "Efecto Shock (6) · Crítico de Shock (11) · F. Auto (Esquiva 10)",
    pesoKg: 5.5,
    rareza: "Extraño",
    coste: 55000,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "fusil_asalto_plasma_sa",
    label: "Plasma AR",
    resumen: "Fusil de asalto de plasma en fase de prototipo: daño agravado, sin retroceso.",
    descripcion:
      // (sic) el documento la llama "Plasma AR" en la descripción y "Plasma SA" en la tabla.
      "En fase de prototipo. Daño agravado además de Llamarada y Shock. Sin retroceso por los " +
      "electroimanes. Al emplearse, -5 al sigilo (solo percepción visual).",
    empleo: "dos manos",
    tipo: "fusil_asalto",
    modos: [
      { etiqueta: "Simple", dificultad: -3, danio: 12, categoriaDanio: "Plasma" },
      { etiqueta: "Estándar (F. Auto)", dificultad: -3, danio: 16, categoriaDanio: "Plasma" },
    ],
    alcance: { corta: 46, media: 280, larga: 560 },
    municion: 30,
    mejorasAdmitidas: 2,
    especial: "Efecto Shock y Llamarada (6) · Crítico de Fusión (11) · F. Auto (Esquiva 10)",
    pesoKg: 6,
    rareza: "Extraño",
    coste: 60500,
    modificadores: [],
  },

  // ── Fusiles de Precisión ── Empleo: dos manos. Desenfundado: acción
  // estándar. Todos llevan integrada la Mira Telescópica de nivel 1 (ya
  // contabilizada en la dificultad y en las mejoras admitidas). En Corta
  // Distancia reciben -2 en vez del bonificador habitual de distancia.
  {
    familia: "arma",
    id: "fusil_precision_telum",
    label: "Telum",
    resumen: "Fusil de precisión de entrada, con la Mira Telescópica ya integrada.",
    descripcion:
      "Fusil de precisión de referencia. Como todos los de su clase, lleva integrada la Mira " +
      "Telescópica de nivel 1 y en Corta Distancia recibe -2 en vez del bonificador habitual.",
    empleo: "dos manos",
    tipo: "fusil_precision",
    modos: [{ etiqueta: "Compleja", dificultad: -2, danio: 11, categoriaDanio: "Letal" }],
    alcance: { corta: 40, media: 500, larga: 1000 },
    municion: 5,
    mejorasAdmitidas: 2,
    especial: "Crítico de Aturdimiento (10)",
    pesoKg: 7.5,
    rareza: "Común",
    coste: 3700,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "fusil_precision_yivrem",
    label: "Yivrem",
    resumen: "Fusil de precisión más rápido de desenfundar y disparar que el Telum.",
    descripcion:
      "Variante del fusil de precisión estándar, con acción de disparo más rápida (Estándar en vez " +
      "de Compleja). Lleva integrada la Mira Telescópica de nivel 1.",
    empleo: "dos manos",
    tipo: "fusil_precision",
    modos: [{ etiqueta: "Estándar", dificultad: -2, danio: 11, categoriaDanio: "Letal" }],
    alcance: { corta: 50, media: 600, larga: 1200 },
    municion: 10,
    mejorasAdmitidas: 2,
    especial: "Crítico de Aturdimiento (10)",
    pesoKg: 6.5,
    rareza: "Común",
    coste: 4900,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "fusil_precision_k9k",
    label: "K9K",
    resumen: "El único fusil de precisión con modo automático.",
    descripcion:
      "Fusil de precisión con selector de fuego automático, algo inusual en su clase. Lleva " +
      "integrada la Mira Telescópica de nivel 1.",
    empleo: "dos manos",
    tipo: "fusil_precision",
    modos: [
      { etiqueta: "Estándar", dificultad: -2, danio: 10, categoriaDanio: "Letal" },
      { etiqueta: "Compleja (F. Auto)", dificultad: -3, danio: 13, categoriaDanio: "Letal" },
    ],
    alcance: { corta: 50, media: 700, larga: 1400 },
    municion: 15,
    mejorasAdmitidas: 3,
    especial: "Crítico de Aturdimiento (9) · F. Auto (Esquiva 9)",
    pesoKg: 6,
    rareza: "Poco Habitual",
    coste: 6500,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "fusil_precision_tshulok",
    label: "Tshulok",
    resumen: "Fusil de precisión pesado, el que más daño hace de los convencionales.",
    descripcion:
      "El más pesado de los fusiles de precisión convencionales, con el mayor daño de su categoría. " +
      "Lleva integrada la Mira Telescópica de nivel 1.",
    empleo: "dos manos",
    tipo: "fusil_precision",
    modos: [{ etiqueta: "Compleja", dificultad: -2, danio: 15, categoriaDanio: "Letal" }],
    alcance: { corta: 50, media: 800, larga: 1600 },
    municion: 10,
    mejorasAdmitidas: 4,
    especial: "Crítico de Aturdimiento (12)",
    pesoKg: 14,
    rareza: "Extraño",
    coste: 11000,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "fusil_precision_laser_largo_alcance",
    label: "Láser de Largo Alcance",
    resumen: "Versión de largo alcance de la pistola láser: fuego a 2 kilómetros.",
    descripcion:
      "Arma de energía de altísimo alcance, hasta 2000 metros. Causa daño de fuego con posibilidad " +
      "de llamarada y ceguera en crítico. Lleva integrada la Mira Telescópica de nivel 1.",
    empleo: "dos manos",
    tipo: "fusil_precision",
    modos: [{ etiqueta: "Estándar", dificultad: -2, danio: 9, categoriaDanio: "Fuego" }],
    alcance: { corta: 50, media: 1000, larga: 2000 },
    municion: 60,
    mejorasAdmitidas: 3,
    especial: "Efecto Llamarada (6) · Crítico de Ceguera (10)",
    pesoKg: 6,
    rareza: "Extraño",
    coste: 20000,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "fusil_precision_rayo_largo_alcance",
    label: "Rayo de Largo Alcance",
    resumen: "Versión de largo alcance del rayo de partículas: daño grave hasta 2400 metros.",
    descripcion:
      "Rayo de partículas de largo alcance, hasta 2400 metros. Daño grave con posibilidad de shock. " +
      "Lleva integrada la Mira Telescópica de nivel 1.",
    empleo: "dos manos",
    tipo: "fusil_precision",
    modos: [{ etiqueta: "Estándar", dificultad: -2, danio: 11, categoriaDanio: "Grave" }],
    alcance: { corta: 50, media: 1200, larga: 2400 },
    municion: 30,
    mejorasAdmitidas: 3,
    especial: "Efecto Shock (6) · Crítico de Shock (11)",
    pesoKg: 7,
    rareza: "Muy Extraño",
    coste: 70000,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "fusil_precision_plasma_ss",
    label: "Plasma SS",
    resumen: "Fusil de precisión de plasma, con modo automático incluido.",
    descripcion:
      "Fusil de precisión de plasma, capaz de disparo automático — poco habitual en su clase. Lleva " +
      "integrada la Mira Telescópica de nivel 1.",
    empleo: "dos manos",
    tipo: "fusil_precision",
    modos: [
      { etiqueta: "Estándar", dificultad: -2, danio: 13, categoriaDanio: "Plasma" },
      { etiqueta: "Compleja (F. Auto)", dificultad: -2, danio: 17, categoriaDanio: "Plasma" },
    ],
    alcance: { corta: 50, media: 600, larga: 1200 },
    municion: 15,
    mejorasAdmitidas: 2,
    especial: "Efecto Shock y Llamarada (8) · Crítico de Fusión (12) · F. Auto (Esquiva 9)",
    pesoKg: 9,
    rareza: "Muy Extraño",
    coste: 78000,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "fusil_precision_plaga",
    label: "Plaga",
    resumen: "El fusil de precisión más caro y pesado del catálogo: puro daño de plasma.",
    descripcion:
      "El fusil de precisión más singular y caro del catálogo, con el mayor daño de plasma de su " +
      "clase. Lleva integrada la Mira Telescópica de nivel 1.",
    empleo: "dos manos",
    tipo: "fusil_precision",
    modos: [{ etiqueta: "Compleja", dificultad: -2, danio: 17, categoriaDanio: "Plasma" }],
    alcance: { corta: 50, media: 1000, larga: 2000 },
    municion: 5,
    mejorasAdmitidas: 2,
    especial: "Efecto Shock y Llamarada (8) · Crítico de Fusión (14)",
    pesoKg: 19,
    rareza: "Singular",
    coste: 156000,
    modificadores: [],
  },

  // ── Ametralladoras ── Empleo: dos manos. Desenfundado: acción estándar.
  // En Corta Distancia y a Bocajarro causan Derribo. Todas tienen fuego
  // automático en área de 4 casillas adyacentes, consumiendo 100 proyectiles
  // por ataque.
  {
    familia: "arma",
    id: "ametralladora_asina",
    label: "Asina",
    resumen: "Ametralladora ligera de entrada, la más barata de su clase.",
    descripcion:
      "Ametralladora de referencia, la más barata y común de su clase. Como toda ametralladora, " +
      "causa Derribo en Corta Distancia y a Bocajarro.",
    empleo: "dos manos",
    tipo: "ametralladora",
    modos: [
      { etiqueta: "Estándar", dificultad: -5, danio: 13, categoriaDanio: "Letal" },
      { etiqueta: "Compleja (F. Auto)", dificultad: -5, danio: 17, categoriaDanio: "Letal" },
    ],
    alcance: { corta: 150, media: 450, larga: 900 },
    municion: 150,
    mejorasAdmitidas: 2,
    especial: "Efecto Derribo a Corta Distancia (10) · Crítico de Aturdimiento (12) · F. Auto (Esquiva 9)",
    pesoKg: 10,
    rareza: "Común",
    coste: 4500,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "ametralladora_graviter",
    label: "Graviter",
    resumen: "Más daño y cargador que la Asina, a cambio de menos alcance.",
    descripcion:
      "Variante de ametralladora con más daño y cargador que la Asina, pero menos alcance. Como " +
      "toda ametralladora, causa Derribo en Corta Distancia y a Bocajarro.",
    empleo: "dos manos",
    tipo: "ametralladora",
    modos: [
      { etiqueta: "Estándar", dificultad: -5, danio: 14, categoriaDanio: "Letal" },
      { etiqueta: "Compleja (F. Auto)", dificultad: -5, danio: 18, categoriaDanio: "Letal" },
    ],
    alcance: { corta: 100, media: 300, larga: 600 },
    municion: 180,
    mejorasAdmitidas: 3,
    especial: "Efecto Derribo a Corta Distancia (10) · Crítico de Aturdimiento (12) · F. Auto (Esquiva 9)",
    pesoKg: 12,
    rareza: "Poco Habitual",
    coste: 6000,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "ametralladora_zotrex",
    label: "Zotrex",
    resumen: "Ametralladora más ligera que la Graviter, con más alcance y mejoras admitidas.",
    descripcion:
      "Variante más ligera, con más alcance y mejoras admitidas que la Graviter. Como toda " +
      "ametralladora, causa Derribo en Corta Distancia y a Bocajarro.",
    empleo: "dos manos",
    tipo: "ametralladora",
    modos: [
      { etiqueta: "Estándar", dificultad: -5, danio: 13, categoriaDanio: "Letal" },
      { etiqueta: "Compleja (F. Auto)", dificultad: -5, danio: 17, categoriaDanio: "Letal" },
    ],
    alcance: { corta: 166, media: 500, larga: 1000 },
    municion: 150,
    mejorasAdmitidas: 4,
    especial: "Efecto Derribo a Corta Distancia (10) · Crítico de Aturdimiento (12) · F. Auto (Esquiva 9)",
    pesoKg: 9,
    rareza: "Poco Habitual",
    coste: 7000,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "ametralladora_matanza",
    label: "Matanza",
    resumen: "Ametralladora de gama alta, con el mayor cargador de daño letal del catálogo.",
    descripcion:
      "Modelo de gama alta con más daño, cargador y mejoras admitidas que el resto de su clase. " +
      "Como toda ametralladora, causa Derribo en Corta Distancia y a Bocajarro.",
    empleo: "dos manos",
    tipo: "ametralladora",
    modos: [
      { etiqueta: "Estándar", dificultad: -5, danio: 14, categoriaDanio: "Letal" },
      { etiqueta: "Compleja (F. Auto)", dificultad: -5, danio: 18, categoriaDanio: "Letal" },
    ],
    alcance: { corta: 150, media: 450, larga: 900 },
    municion: 200,
    mejorasAdmitidas: 4,
    especial: "Efecto Derribo a Corta Distancia (11) · Crítico de Aturdimiento (13) · F. Auto (Esquiva 10)",
    pesoKg: 11.5,
    rareza: "Extraño",
    coste: 22000,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "ametralladora_electro_tk",
    label: "Electro TK",
    resumen: "Ametralladora de daño grave con crítico de llamarada, y el mayor alcance de su clase.",
    descripcion:
      "Ametralladora de energía con daño grave y el mayor alcance de su clase, cuyo crítico causa " +
      "Llamarada en vez de Aturdimiento. Como toda ametralladora, causa Derribo en Corta Distancia " +
      "y a Bocajarro.",
    empleo: "dos manos",
    tipo: "ametralladora",
    modos: [
      { etiqueta: "Estándar", dificultad: -4, danio: 13, categoriaDanio: "Grave" },
      { etiqueta: "Compleja (F. Auto)", dificultad: -4, danio: 17, categoriaDanio: "Grave" },
    ],
    alcance: { corta: 200, media: 600, larga: 1200 },
    municion: 120,
    mejorasAdmitidas: 2,
    especial: "Efecto Derribo a Corta Distancia (10) · Crítico de Llamarada (12) · F. Auto (Esquiva 10)",
    pesoKg: 16,
    rareza: "Muy Extraño",
    coste: 55000,
    modificadores: [],
  },
  {
    familia: "arma",
    id: "ametralladora_plasma_aaa",
    label: "Plasma AAA",
    resumen: "La ametralladora más cara del catálogo: plasma con el mayor cargador de todas.",
    descripcion:
      "Ametralladora de plasma con el cargador más grande del catálogo (300 proyectiles) y el mayor " +
      "coste. Como toda ametralladora, causa Derribo en Corta Distancia y a Bocajarro.",
    empleo: "dos manos",
    tipo: "ametralladora",
    modos: [
      { etiqueta: "Estándar", dificultad: -5, danio: 15, categoriaDanio: "Plasma" },
      { etiqueta: "Compleja (F. Auto)", dificultad: -5, danio: 18, categoriaDanio: "Plasma" },
    ],
    alcance: { corta: 150, media: 450, larga: 900 },
    municion: 300,
    mejorasAdmitidas: 2,
    especial: "Efecto Shock y Llamarada (8) · Crítico de Fusión (12) · F. Auto (Esquiva 11)",
    pesoKg: 10,
    rareza: "Muy Extraño",
    coste: 99000,
    modificadores: [],
  },
];

// ── Mejoras estándar y subsistemas ───────────────────────────────────
// Comparten la misma forma de nivel: cada subsistema tiene su propia tabla
// de columnas (duración, cobertura, cargas, ventajas…) y forzar una forma
// numérica común inventaría estructura que el documento no tiene. `detalle`
// son líneas de texto libres, una por efecto del nivel — es justo lo que se
// decidió para los módulos "medio objeto, medio poder" (ver docs/handoff.md).
export type NivelModulo = {
  nivel: number;
  rareza: Rareza;
  coste: number;
  detalle: string[];
  modificadores: Modificador[];
  // Solo lo usa Movilidad Aérea: la velocidad base de vuelo de ese nivel, en
  // metros, para poder mostrarla en el card de Movimiento sin parsear el
  // texto de `detalle`. No incluye la mejora opcional de +20 m (Progresión
  // de nivel 3): esa elección no se guarda todavía en la ficha, se queda en
  // `detalle` como texto.
  velocidadM?: number;
};

export type MejoraEstandar = {
  familia: "mejoraEstandar";
  id: string;
  label: string;
  resumen: string;
  descripcion: string;
  niveles: NivelModulo[];
};

export const MEJORAS_ESTANDAR: MejoraEstandar[] = [
  {
    familia: "mejoraEstandar",
    id: "soporte_vital",
    label: "Soporte Vital",
    resumen: "El estándar industrial de habitabilidad: aísla del exterior. No gasta ranura.",
    descripcion:
      "Una red de micro-conductos de purificación, intercambiadores de calor de fase y membranas " +
      "de filtración osmótica tejida en las capas internas del traje. Aísla por completo al " +
      "usuario del exterior, reciclando el aire, neutralizando agentes químicos y disipando la " +
      "radiación ambiental. No es un módulo táctico opcional: se integra en la arquitectura " +
      "hermética de cualquier armadura de serie, sin consumir ranuras de personalización.",
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 4000,
        detalle: [
          "Duración: 24 horas continuas antes de agotarse (recarga con conector, ~30-60 min).",
          "Blindaje Ambiental: protección total contra radiación e intoxicación por inhalación o " +
            "contacto. Si la armadura sufre daño en un ambiente tóxico, se degrada a +1 a la salvación.",
          "Resistencia Térmica: +1 contra congelación y calor extremo, acumulable con el bonificador " +
            "de la propia armadura.",
          "Vulnerabilidad al Shock: si hay un apagón, todos los bonificadores bajan a +1, salvo la " +
            "resistencia térmica, que se pierde por completo.",
        ],
        // Resistencia Térmica es el único bono incondicional (el Blindaje
        // Ambiental depende de sufrir daño en un ambiente tóxico, así que se
        // queda solo en `detalle`, sin mecanizar).
        modificadores: [
          { tipo: "tirada", contexto: "salvación de congelación", valor: 1 },
          { tipo: "tirada", contexto: "salvación de calor extremo", valor: 1 },
        ],
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 12000,
        detalle: [
          "Duración: 72 horas de autonomía.",
          "Blindaje Ambiental Mejorado: +2 frente a efectos tóxicos cuando el traje o el usuario " +
            "reciben daño en ese entorno.",
        ],
        // Supuesto: el documento no repite la Resistencia Térmica de nivel 1 en
        // los niveles 2-3, pero tampoco dice que se pierda al subir de nivel —
        // se asume que se mantiene. Si Murillo confirma lo contrario, se corrige aquí.
        modificadores: [
          { tipo: "tirada", contexto: "salvación de congelación", valor: 1 },
          { tipo: "tirada", contexto: "salvación de calor extremo", valor: 1 },
        ],
      },
      {
        nivel: 3,
        rareza: "Extraño",
        coste: 24000,
        detalle: [
          "Duración: 144 horas de autonomía.",
          "Blindaje Ambiental Avanzado: +3 contra efectos tóxicos en las mismas condiciones.",
        ],
        modificadores: [
          { tipo: "tirada", contexto: "salvación de congelación", valor: 1 },
          { tipo: "tirada", contexto: "salvación de calor extremo", valor: 1 },
        ],
      },
    ],
  },
  {
    familia: "mejoraEstandar",
    id: "compartimento_oculto",
    label: "Compartimento Oculto",
    resumen: "Un doble fondo sellado en la armadura para esconder algo pequeño.",
    descripcion:
      "Hueco de doble fondo con sellado hermético, revestimiento antirradiación y absorción de " +
      "emisiones electromagnéticas integrado en la arquitectura interna de la armadura.",
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 500,
        detalle: [
          "Oculta un objeto pequeño (una tarjeta de datos, una pistola ligera, un vial).",
          "Aumenta en 3 la dificultad para descubrirlo en cacheos físicos rutinarios o escáneres " +
            "de seguridad.",
        ],
        // La dificultad que sube es la de QUIEN TE REGISTRA, no una tirada propia:
        // no encaja en "tirada" (que hoy solo modela tiradas del portador).
        modificadores: [],
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 4000,
        detalle: [
          "Admite objetos de tamaño medio: un arma corta estándar o herramientas de precisión.",
          "Sube la dificultad a 4 contra escáneres avanzados; indetectable en inspecciones " +
            "visuales o físicas superficiales.",
        ],
        modificadores: [],
      },
    ],
  },
  {
    familia: "mejoraEstandar",
    id: "funda_automatica",
    label: "Funda Automática",
    resumen: "Desenfunda el arma como acción gratuita en vez de gastar tu turno en ello.",
    descripcion:
      "Mecanismo integrado en la armadura o traje que expulsa el arma sujeta a él con solo " +
      "activarlo, sin necesidad de la acción normal de desenfundado.",
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 1200,
        detalle: [
          "Desenfundado como acción gratuita para un arma a una mano.",
          "Solo puede usarse con un arma a la vez; el enfundado sigue costando lo de siempre.",
        ],
        modificadores: [],
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 3600,
        detalle: ["El desenfundado gratuito también funciona con armas a dos manos."],
        modificadores: [],
      },
    ],
  },
  {
    familia: "mejoraEstandar",
    id: "inyector_hipodermico",
    label: "Inyector Hipodérmico",
    resumen: "Te inyectas medicación como acción simple en vez de compleja.",
    descripcion:
      "Sistema de liberación por válvulas y muelles puramente mecánico integrado en el traje; no " +
      "es susceptible a shock ni a pirateo.",
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 250,
        detalle: ["Usar medicamentos o drogas sobre uno mismo pasa de acción compleja a simple."],
        modificadores: [],
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 1500,
        detalle: [
          "Tambor rotatorio con hasta 5 dosis distintas almacenadas.",
          "Inocula una dosis por turno como acción gratuita o reacción.",
          "Al llevar electrónica de selección, este nivel sí es susceptible a shock (a diferencia " +
            "del nivel 1).",
        ],
        modificadores: [],
      },
    ],
  },
  {
    familia: "mejoraEstandar",
    id: "mejora_ignifuga",
    label: "Mejora Ignífuga",
    resumen: "Fibras cerámicas y polímeros que absorben el calor: protección extra contra el fuego.",
    descripcion:
      "Red de micro-fibras cerámicas ablativas y polímeros endotérmicos entretejidos en la " +
      "estructura de la armadura, que absorben y disipan de forma extrema la energía térmica " +
      "directa.",
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 1000,
        detalle: ["El usuario puede usar la puntuación total de blindaje de su armadura contra daño de fuego."],
        modificadores: [],
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 5000,
        detalle: [
          "El daño por fuego se considera letal en vez de grave.",
          "Mejora el bonificador del traje o la armadura contra llamarada a +2.",
        ],
        // El +2 mejora el bono de LA ARMADURA (otra pieza), no aporta uno propio
        // independiente: no hay forma limpia de modelarlo sin acoplar ambas piezas.
        modificadores: [],
      },
    ],
  },
  {
    familia: "mejoraEstandar",
    id: "polimero_anticorrosivo",
    label: "Polímero Anticorrosivo",
    resumen: "Revestimiento que repele ácidos y agentes químicos antes de que lleguen al chasis.",
    descripcion:
      "Revestimiento exterior de resinas fluoropoliméricas de alta densidad diseñado para " +
      "neutralizar y repeler agentes químicos y ácidos reactivos antes de que comprometan el " +
      "chasis.",
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 1000,
        detalle: ["+1 contra corrosión.", "Esta mejora no es susceptible a shock."],
        modificadores: [{ tipo: "tirada", contexto: "salvación de corrosión", valor: 1 }],
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 5000,
        detalle: [
          "El daño corrosivo se considera letal en vez de grave.",
          "El bonificador contra corrosión sube a +2.",
        ],
        modificadores: [{ tipo: "tirada", contexto: "salvación de corrosión", valor: 2 }],
      },
    ],
  },
  {
    familia: "mejoraEstandar",
    id: "tejido_conductor",
    label: "Tejido Conductor",
    resumen: "Malla de hilos superconductores que desvía las sobrecargas eléctricas.",
    descripcion:
      "Malla interior de hilos superconductores integrada en el forro del traje para desviar y " +
      "disipar de forma segura cualquier sobrecarga eléctrica externa.",
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 1000,
        detalle: ["+1 contra shock.", "Esta mejora no es susceptible a su propio efecto."],
        modificadores: [{ tipo: "tirada", contexto: "salvación de shock", valor: 1 }],
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 5000,
        detalle: [
          "Ignora el primer nivel de daño eléctrico.",
          "El bonificador contra shock sube a +2.",
        ],
        modificadores: [{ tipo: "tirada", contexto: "salvación de shock", valor: 2 }],
      },
    ],
  },
  {
    familia: "mejoraEstandar",
    id: "visor_nocturno",
    label: "Visor Nocturno",
    resumen: "Intensifica la poca luz disponible para ver en penumbra y oscuridad parcial.",
    descripcion:
      "Capta los pocos fotones de luz visible del ambiente y los multiplica miles de veces " +
      "mediante un tubo de intensificación de imagen. En oscuridad total sellada, sin infrarrojos " +
      "activos, no ve absolutamente nada.",
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 100,
        detalle: [
          "Visión en penumbra y oscuridad parcial.",
          "Un fogonazo o explosión puede cegar al usuario (dificultad de Fortaleza 8) al saturar " +
            "el sensor.",
        ],
        modificadores: [],
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 1500,
        detalle: [
          "Ve a través de humo denso, niebla o partículas en suspensión.",
          "Reduce en 2 los niveles de cobertura visual dentro de 50 metros.",
          "+3 a la tirada contra ceguera provocada por destellos, al cortar el sensor antes de " +
            "saturarse.",
        ],
        modificadores: [
          { tipo: "tirada", contexto: "salvación de ceguera por destello", valor: 3 },
        ],
      },
    ],
  },
  {
    familia: "mejoraEstandar",
    id: "visor_termico",
    label: "Visor Térmico",
    resumen: "Ve el calor en vez de la luz: caza enemigos ocultos tras humo o vegetación.",
    descripcion:
      "Mapea la radiación infrarroja de onda larga que emiten cuerpos orgánicos, motores o sistemas " +
      "electrónicos activos, traduciéndola a una escala cromática de gradiente térmico.",
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 250,
        detalle: [
          "Detecta calor corporal a través de humo, maleza u oscuridad total.",
          "-3 en tiradas de percepción visual fuera del gradiente térmico mientras se usa el modo " +
            "térmico.",
        ],
        modificadores: [],
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 1500,
        detalle: [
          "Persistencia espectral: resalta el rastro térmico reciente (pisadas, estela de un " +
            "proyectil, paso de un vehículo o enemigo).",
          "El rastro se apaga a los 5 turnos pero persiste 10-15 minutos (la mitad con mucho frío " +
            "o ventilación; algo más en interiores sellados sin convección).",
        ],
        modificadores: [],
      },
    ],
  },
];

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
  niveles: NivelModulo[];
};

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
          "Duración modo activo: 1 min estático / 1 turno dinámico.",
          "Cobertura activa estático (Visual/Térmica/Acústica): 3 / 3 / 4.",
          "Cobertura activa dinámico (Visual/Térmica/Acústica): 2 / 1 / 2.",
          "Cobertura pasiva (Térmica/Acústica): 1 / 1.",
        ],
        // Sin modificadores: la cobertura depende del modo y de si el usuario
        // está quieto o en movimiento, así que no hay un número único que
        // aplique "mientras se lleva puesto" (ver docs/handoff.md §6).
        modificadores: [],
      },
      {
        nivel: 2,
        rareza: "Extraño",
        coste: 48000,
        detalle: [
          "Duración modo activo: 5 min estático / 2 turnos dinámico.",
          "Cobertura activa estático (Visual/Térmica/Acústica): 4 / 4 / 4.",
          "Cobertura activa dinámico (Visual/Térmica/Acústica): 2 / 1 / 2.",
          "Cobertura pasiva (Térmica/Acústica): 1 / 1.",
        ],
        modificadores: [],
      },
      {
        nivel: 3,
        rareza: "Muy Extraño",
        coste: 96000,
        detalle: [
          "Duración modo activo: 10 min estático / 4 turnos dinámico.",
          "Cobertura activa estático (Visual/Térmica/Acústica): 4 / 4 / 4.",
          "Cobertura activa dinámico (Visual/Térmica/Acústica): 3 / 2 / 3.",
          "Cobertura pasiva (Térmica/Acústica): 2 / 2.",
        ],
        modificadores: [],
      },
      {
        nivel: 4,
        rareza: "Muy Extraño",
        coste: 144000,
        detalle: [
          "Duración modo activo: 20 min estático / 6 turnos dinámico.",
          "Cobertura activa estático (Visual/Térmica/Acústica): 4 / 4 / 4.",
          "Cobertura activa dinámico (Visual/Térmica/Acústica): 4 / 3 / 3.",
          "Cobertura pasiva (Térmica/Acústica): 3 / 3.",
        ],
        modificadores: [],
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
          "Ventaja Táctica — Estabilizador Neuronal Básico: +1 a las tiradas para resistir el " +
            "retroceso o la desorientación por el uso prolongado de disciplinas psiónicas.",
        ],
        modificadores: [
          { tipo: "tirada", contexto: "resistir retroceso o desorientación psiónica", valor: 1 },
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
        // S9: se mantiene la ventaja de nivel 1 (no se repite ni se anula); el
        // +10% de alcance no tiene número fijo que mecanizar.
        modificadores: [
          { tipo: "tirada", contexto: "resistir retroceso o desorientación psiónica", valor: 1 },
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
        modificadores: [
          { tipo: "tirada", contexto: "resistir retroceso o desorientación psiónica", valor: 1 },
          { tipo: "tirada", contexto: "resistir metasensoria", valor: 1 },
        ],
      },
      {
        nivel: 4,
        rareza: "Singular",
        coste: 216000,
        detalle: [
          "Conversión Psiónica: 1 carga por 1 punto de fatiga (máxima eficiencia).",
          "Ventaja Táctica — Simbiosis Sináptica Total: reduce en 1 los penalizadores por fatiga " +
            "al hacer una tirada relacionada con el empleo de un poder psiónico.",
        ],
        modificadores: [
          { tipo: "tirada", contexto: "resistir retroceso o desorientación psiónica", valor: 1 },
          { tipo: "tirada", contexto: "resistir metasensoria", valor: 1 },
          { tipo: "tirada", contexto: "tiradas de poder psiónico", valor: 1 },
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
        coste: 5000,
        detalle: ["Absorción de 1 punto de daño físico o energético mientras esté activo."],
        // "Absorción de daño" no tiene un concepto equivalente en el motor hoy
        // (ni derivado ni tirada): no se mecaniza, ver cabecera del fichero.
        modificadores: [],
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 30000,
        detalle: ["Absorción de 2 puntos."],
        modificadores: [],
      },
      {
        nivel: 3,
        rareza: "Poco Habitual",
        coste: 60000,
        detalle: ["Absorción de 3 puntos."],
        modificadores: [],
      },
      {
        nivel: 4,
        rareza: "Extraño",
        coste: 90000,
        detalle: ["Absorción de 4 puntos."],
        modificadores: [],
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
            "llamarada o fusión (dificultad 6 + nivel).",
          "Si el usuario recibe un golpe melee, devuelve daño de plasma igual al nivel del " +
            "subsistema.",
          "Al activarse: -8 al sigilo (percepción visual) y neutraliza por completo el camuflaje " +
            "trifásico activo.",
        ],
        // Todo aquí es condicional (se activa, se sacrifica, depende del ataque
        // recibido) o un recurso propio (colchón de PG) sin equivalente en el
        // motor: no se mecaniza.
        modificadores: [],
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
    accionActivacion: "Cada ataque consume las cargas del modo elegido; se dispara como cualquier arma.",
    celula: { cargas: 10, recarga: "1 hora con conector (1 carga cada 6 minutos)", bateriaCoste: 150 },
    // La tabla "Modo de Ataque" del documento no es de uso (activo/pasivo),
    // es de disparo: cuatro perfiles distintos, cada uno con su propio coste,
    // dificultad, daño y alcance (escalan con el Nivel instalado).
    modos: [
      {
        label: "Pulso",
        descripcion:
          "Acción simple, 1 carga, dificultad -2, daño 8 + Nivel, alcance 40 × Nivel metros. " +
          "Efecto: Shock (4 + Nivel); crítico: Hemorragia.",
      },
      {
        label: "Pulso Cargado",
        descripcion:
          "Acción compleja, 4 cargas, dificultad -2, daño 11 + Nivel, alcance 60 × Nivel metros. " +
          "Efecto: Shock (6 + Nivel); crítico: Hemorragia.",
      },
      {
        label: "Barrido",
        descripcion:
          "Acción estándar, 5 cargas, dificultad -3, daño de área 10 + Nivel en 6x6 a 40 × Nivel " +
          "metros. Efecto: Esquiva (7 + Nivel) y Shock (7 + Nivel).",
      },
      {
        label: "Aguijón",
        descripcion:
          "Acción simple, 1 carga, dificultad 0, daño 2 + Fuerza + Nivel, alcance melee, Sutil. " +
          "Duración del efecto: Nivel turnos. Efecto: Shock (4 + Nivel); crítico: Hemorragia.",
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
      },
    ],
  },
];

// ── Mejoras de movimiento ─────────────────────────────────────────────
// Fase D: no consumen ranura de subsistema, la armadura les pone un TOPE DE
// NIVEL propio (topeExoesqueleto/topeMovilidadAerea) en vez de contarlas
// como plaza ocupada. `tope` dice a qué columna de la armadura mirar, para
// no comparar por id a pelo en el motor.
//
// El bono de Fuerza del exoesqueleto se queda sin mecanizar a propósito: la
// regla lo excluye de vida y de varias salvaciones, y nuestro modificador de
// "atributo" no sabe hacer esa excepción sin inventarse un sistema de
// exclusiones a partir de una muestra de uno. Se queda en `detalle`, en
// texto, hasta que aparezca un segundo caso que justifique generalizarlo.
export type MejoraMovimiento = {
  familia: "movimiento";
  id: string;
  label: string;
  resumen: string;
  descripcion: string;
  tope: "exoesqueleto" | "movilidadAerea";
  niveles: NivelModulo[];
};

export const MOVIMIENTO: MejoraMovimiento[] = [
  {
    familia: "movimiento",
    id: "exoesqueleto",
    label: "Exoesqueleto",
    resumen: "Armazón externo que da más Fuerza a costa de peso y de limitar la agilidad.",
    tope: "exoesqueleto",
    descripcion:
      "Armazón externo que se instala mecánicamente en trajes y armaduras. No mejora las defensas " +
      "más que la propia armadura, pero da capacidades sin igual de potencia y de movimiento. Se ve " +
      "limitado al tamaño de la armadura: cuanta más fuerza da, más pesado es y más limita la " +
      "movilidad articular, así que los de mayor nivel solo caben en armaduras pesadas. Usa una " +
      "batería de 10 cargas (1 hora de funcionamiento cada una); recarga de una hora con conector " +
      "(1 carga cada 6 minutos), batería nueva 150 créditos, acción compleja con una mano libre.",
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 4000,
        detalle: [
          "+1 a la Fuerza en tiradas y atributos, pero NO en salvaciones contra efectos " +
            "ambientales, tóxicos o de fatiga, ni al calcular puntos de salud.",
          "Duplica el bonificador al calcular la carga transportable y en proezas de fuerza.",
          "Tan ligero que puede usarse sin armadura, oculto bajo ropa abultada.",
        ],
        // El bono de Fuerza excluye vida y varias salvaciones a propósito: si se
        // mecaniza como modificador de "atributo" tal cual, el motor lo aplicaría
        // también ahí, que es incorrecto. Se deja sin mecanizar hasta decidir
        // cómo modelar esa excepción (Fase D).
        modificadores: [],
      },
      {
        nivel: 2,
        rareza: "Común",
        coste: 24000,
        detalle: ["+2 a la Fuerza en las mismas tiradas."],
        modificadores: [],
      },
      {
        nivel: 3,
        rareza: "Poco Habitual",
        coste: 48000,
        detalle: ["+3 a la Fuerza en las mismas tiradas."],
        modificadores: [],
      },
      {
        nivel: 4,
        rareza: "Extraño",
        coste: 72000,
        detalle: ["+4 a la Fuerza en las mismas tiradas."],
        modificadores: [],
      },
    ],
  },
  {
    familia: "movimiento",
    id: "movilidad_aerea",
    label: "Movilidad Aérea",
    resumen: "Propulsores vectoriales para volar; -1 a los ataques mientras estás en el aire.",
    tope: "movilidadAerea",
    descripcion:
      "Propulsores vectoriales de alta potencia colocados en la armadura o el traje que permiten " +
      "impulsarse y desplazarse en vuelo controlado. Volar cuesta una acción simple con una tirada " +
      "de Reflejos + Tecnociencia en cada maniobra: si falla, solo se recorre la mitad del " +
      "movimiento; con fallo crítico, el desplazamiento es descontrolado en dirección aleatoria. En " +
      "vuelo hay -1 a los ataques, y las esquivas usan Tecnociencia en vez de Atletismo. Célula " +
      "interna de 10 cargas (mínimo 1 para volar); recarga de una hora con conector (1 carga cada 6 " +
      "minutos), batería nueva 150 créditos, acción compleja con una mano libre.",
    niveles: [
      {
        nivel: 1,
        rareza: "Poco Habitual",
        coste: 6000,
        detalle: [
          "Consumo: 1 carga por acción de vuelo.",
          "Dificultad de maniobrabilidad: -3. Velocidad: 50 m.",
          "Máxima potencia (acción compleja, 2 cargas): dobla el desplazamiento; en crítico, +25 m.",
        ],
        modificadores: [],
        velocidadM: 50,
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 36000,
        detalle: [
          "Consumo: 1 carga cada 2 acciones.",
          "Dificultad de maniobrabilidad: -3. Velocidad: 70 m.",
          "Máxima potencia: crítico +35 m.",
        ],
        modificadores: [],
        velocidadM: 70,
      },
      {
        nivel: 3,
        rareza: "Extraño",
        coste: 72000,
        detalle: [
          "Consumo: 1 carga cada 3 acciones.",
          "Dificultad de maniobrabilidad: -3. Velocidad: 100 m.",
          "Máxima potencia: crítico +50 m.",
          "Progresión: al llegar aquí se elige Velocidad (+20 m de velocidad base, crítico de " +
            "máxima potencia +60 m) o Maniobrabilidad (-1 a la dificultad de maniobra) — la " +
            "elección compromete el nivel 4.",
        ],
        modificadores: [],
        velocidadM: 100,
      },
      {
        nivel: 4,
        rareza: "Muy Extraño",
        coste: 108000,
        detalle: [
          "Consumo: 1 carga cada 4 acciones.",
          "Dificultad de maniobrabilidad: -4 (o mejor, según lo elegido en nivel 3).",
          "Velocidad: 140 m (160 con la mejora de Velocidad).",
          "Máxima potencia: crítico +70 m (+80 con la mejora de Velocidad).",
        ],
        modificadores: [],
        velocidadM: 140,
      },
    ],
  },
];

// ── Mejoras de arma ──────────────────────────────────────────────────
// Fase C: la primera familia con COMPATIBILIDAD (no todo cabe en cualquier
// arma) además de ranura (mejorasAdmitidas, ya en ArmaFuego). La
// compatibilidad tiene dos formas distintas en el documento: por tipo de
// arma ("solo fusiles de asalto y de precisión") o por categoría de daño
// ("las armas de plasma no pueden instalarla") — de ahí la unión.
//
// Se deja fuera **Munición Especial (mejora de arma)**: su coste depende de
// qué munición elijas instalar, y munición entera está aparcada hasta
// Murillo (ver docs/sistema.md pregunta 7). Añadirla es incoherente sin esa
// pieza resuelta.
export type CompatibilidadArma =
  | { tipo: "todas" }
  | { tipo: "porTipoArma"; tiposPermitidos: TipoArma[] }
  | { tipo: "excluyeCategoriaDanio"; categoriasExcluidas: string[] };

export type MejoraDeArma = {
  familia: "mejoraArma";
  id: string;
  label: string;
  resumen: string;
  descripcion: string;
  compatibilidad: CompatibilidadArma;
  niveles: NivelModulo[]; // los que no tienen nivel en EQUIP llevan un único nivel 1
};

export const MEJORAS_ARMA: MejoraDeArma[] = [
  {
    familia: "mejoraArma",
    id: "mira_telescopica",
    label: "Mira Telescópica",
    resumen: "+1 al ataque a media y larga distancia. Solo fusiles.",
    descripcion:
      "Solo compatible con fusiles de asalto y fusiles de precisión.",
    compatibilidad: { tipo: "porTipoArma", tiposPermitidos: ["fusil_asalto", "fusil_precision"] },
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 100,
        detalle: [
          "+1 al ataque a distancia, solo en media y larga distancia.",
          "El mismo bonificador sirve para tiradas de búsqueda (percepción visual).",
        ],
        // El bono solo aplica a media/larga distancia: es condicional al tramo
        // de la tirada, no un +1 incondicional — se queda en texto.
        modificadores: [],
      },
      {
        nivel: 2,
        rareza: "Común",
        coste: 700,
        detalle: ["Aporta visión nocturna y térmica, como un visor de nivel 1, hasta 500 metros."],
        modificadores: [],
      },
      {
        nivel: 3,
        rareza: "Poco Habitual",
        coste: 7000,
        detalle: [
          "Sistema inteligente que corrige el ángulo: el bonificador de ataque y percepción " +
            "visual sube a +2 (mismas condiciones de distancia que el nivel 1).",
        ],
        modificadores: [],
      },
    ],
  },
  {
    familia: "mejoraArma",
    id: "puntero_laser",
    label: "Puntero Láser",
    resumen: "+1 al ataque activo, a cambio de -2 al sigilo visual.",
    descripcion: "Compatible con cualquier arma de fuego.",
    compatibilidad: { tipo: "todas" },
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 150,
        detalle: ["Mientras esté activo: +1 al modificador de ataque, -2 al sigilo (visual)."],
        // Condicionado a tenerlo activo (es un toggle, como el camuflaje): no
        // se mecaniza como un +1 permanente.
        modificadores: [],
      },
      {
        nivel: 2,
        rareza: "Extraño",
        coste: 3500,
        detalle: [
          "Con ojo biónico o Mira Telescópica de nivel 3, el puntero deja de penalizar el sigilo.",
        ],
        modificadores: [],
      },
    ],
  },
  {
    familia: "mejoraArma",
    id: "linterna",
    label: "Linterna",
    resumen: "Luz de alta potencia, uso gratuito.",
    descripcion:
      "Linterna de alta potencia utilizable de forma gratuita: visibilidad lumínica perfecta a 50 " +
      "metros y visibilidad en penumbra a 250 metros.",
    compatibilidad: { tipo: "todas" },
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 120,
        detalle: ["Sin dificultad ni acción asociada: se enciende y apaga cuando se quiera."],
        modificadores: [],
      },
    ],
  },
  {
    familia: "mejoraArma",
    id: "bipode",
    label: "Bípode",
    resumen: "+1 al ataque apoyado; sin apoyar, penaliza por el peso. Solo armas pesadas.",
    descripcion:
      "Solo para fusiles de asalto, fusiles de precisión y ametralladoras (el documento también " +
      "cita lanzagranadas, que todavía no está en el catálogo).",
    compatibilidad: {
      tipo: "porTipoArma",
      tiposPermitidos: ["fusil_asalto", "fusil_precision", "ametralladora"],
    },
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 200,
        detalle: [
          "+1 al ataque si el personaje se tumba (acción simple) o apoya el arma en una cobertura " +
            "parcial a media altura.",
          "Suma 5 kg de carga al arma: sin apoyar, -1 al ataque.",
        ],
        // El +1 y el -1 son condicionales (apoyado o no): no hay un número
        // incondicional que aplique siempre mientras está instalado.
        modificadores: [],
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 4500,
        detalle: ["Materiales sofisticados: pierde el penalizador de peso y no suma carga."],
        modificadores: [],
      },
    ],
  },
  {
    familia: "mejoraArma",
    id: "silenciador",
    label: "Silenciador",
    resumen: "Elimina el sonido del disparo; reduce el penalizador de sigilo al -2.",
    descripcion:
      "Elimina el sonido del disparo. Reduce a -2 el penalizador al Sigilo al realizar ataques " +
      "sorpresivos con el arma.",
    compatibilidad: { tipo: "todas" },
    niveles: [
      {
        nivel: 1,
        rareza: "Poco Habitual",
        coste: 1000,
        detalle: ["Reduce a -2 (en vez del habitual) el penalizador de Sigilo en ataques sorpresivos."],
        // Fija un penalizador a un valor concreto en vez de sumar un bono
        // propio: no encaja como modificador simple de "+N".
        modificadores: [],
      },
    ],
  },
  {
    familia: "mejoraArma",
    id: "sistema_retroceso",
    label: "Sistema de Retroceso",
    resumen: "Reduce 1 el penalizador de dificultad en modo automático. No en armas de plasma.",
    descripcion: "No funciona en armas de plasma.",
    compatibilidad: { tipo: "excluyeCategoriaDanio", categoriasExcluidas: ["Plasma"] },
    niveles: [
      {
        nivel: 1,
        rareza: "Poco Habitual",
        coste: 500,
        detalle: [
          "Reduce en 1 el penalizador de dificultad en tiradas de ataque en modo automático.",
          "En ametralladoras, mejora el ataque en cualquiera de sus modos.",
        ],
        modificadores: [
          { tipo: "tirada", contexto: "ataque en modo automático", valor: 1 },
        ],
      },
      {
        nivel: 2,
        rareza: "Extraño",
        coste: 5000,
        detalle: ["La dificultad de esquiva contra ataques en modo automático sube en 1."],
        // S9: se mantiene el +1 de nivel 1. La subida de dificultad de esquiva
        // es un efecto sobre la tirada de OTRO personaje (el que esquiva), no
        // del portador: se queda en texto.
        modificadores: [
          { tipo: "tirada", contexto: "ataque en modo automático", valor: 1 },
        ],
      },
    ],
  },
  {
    familia: "mejoraArma",
    id: "bayoneta",
    label: "Bayoneta",
    resumen: "Convierte el arma en cuchillo de combate a dos manos cuando hace falta.",
    descripcion:
      "Equipa un Fusil de Asalto o una Escopeta con un cuchillo de combate. Admite cuchillos de " +
      "distintas tecnologías; el precio del cuchillo se suma al de la mejora.",
    compatibilidad: { tipo: "porTipoArma", tiposPermitidos: ["fusil_asalto", "escopeta"] },
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 50,
        detalle: [
          "Dificultad de ataque -1, mismo daño que un cuchillo de combate.",
          "El arma pasa a considerarse arma a dos manos mientras se usa como bayoneta.",
        ],
        // Es un perfil de arma melee propio (daño, dificultad, uso a dos
        // manos), no un modificador sobre el personaje: encaja mejor cuando
        // exista el tipo ArmaMelee (Fase E) que como Modificador suelto.
        modificadores: [],
      },
    ],
  },
  {
    familia: "mejoraArma",
    id: "lanzagranadas_integrado",
    label: "Lanzagranadas Integrado",
    resumen: "Añade un lanzagranadas al arma; penaliza el disparo normal por el peso.",
    descripcion: "Solo para Fusil de Asalto.",
    compatibilidad: { tipo: "porTipoArma", tiposPermitidos: ["fusil_asalto"] },
    niveles: [
      {
        nivel: 1,
        rareza: "Poco Habitual",
        coste: 2000,
        detalle: [
          "-1 al modificador de ataque habitual del arma por el peso añadido (1,5 kg).",
          "Lanzagranadas acoplado: acción estándar, dificultad -2, daño según munición, cargador " +
            "1, alcance 200 m, área y efecto según la munición empleada.",
        ],
        // El -1 es al ataque de ESTA arma en concreto, y el lanzagranadas es
        // un perfil de disparo aparte (con su propia munición, aparcada): no
        // hay un modificador de personaje limpio que sacar de aquí.
        modificadores: [],
      },
    ],
  },
];

export type Equipo =
  | Armadura
  | ArmaFuego
  | MejoraEstandar
  | Subsistema
  | MejoraMovimiento
  | MejoraDeArma
  | ArmaMelee;

export const EQUIPO: Equipo[] = [
  ...ARMADURAS,
  ...ARMAS,
  ...MEJORAS_ESTANDAR,
  ...SUBSISTEMAS,
  ...MOVIMIENTO,
  ...MEJORAS_ARMA,
  ...ARMAS_MELEE,
];

export function equipoPorId(id: string): Equipo | null {
  return EQUIPO.find((e) => e.id === id) ?? null;
}
