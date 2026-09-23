import type { Modificador } from "../rules/modificadores";
import type { MotorMetadata } from "../rules/motor";
import type { Rareza } from "./equipo";

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
  // RECURSOS (docs/tareas.md, fase 6b): sin este campo, el arma usa el
  // recurso genérico "balas normales" — compatible con el cargador de balas
  // normales de la tienda. "energia" marca la familia Láser/Plasma/Rayo, que
  // necesita su propio recurso distinto (batería, no munición balística).
  tipoMunicion?: "energia";
  mejorasAdmitidas: number;
  especial: string | null;
  pesoKg: number;
  rareza: Rareza;
  coste: number;
  modificadores: Modificador[];
  motor?: MotorMetadata[]; // docs/motor.md
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
    // "ocultar arma": no hay tirada de ocultar un objeto en TIRADAS hoy — el
    // id es un marcador para cuando exista, no se aplica a nada mientras tanto.
    modificadores: [{ tipo: "tirada", alcance: { tipo: "tiradaId", id: "ocultar_objeto" }, valor: 2 }],
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ocultar_objeto" }, mecanismo: "siempre_activo", estado: "pendiente" }, // hay propuesta de diseño escrita para "Ocultar objeto" (equipo-efectos-especiales.md, 2026-09-12), solo falta construirla — no es una pregunta sin responder, así que "pendiente" y no "bloqueado"
    ],
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
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // selector de modo
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    tipoMunicion: "energia",
    mejorasAdmitidas: 2,
    especial: "Efecto Llamarada (9) · Crítico de Ceguera (10) · F. Auto (Esquiva 9)",
    pesoKg: 1,
    rareza: "Extraño",
    coste: 8000,
    modificadores: [],
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // selector de modo
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    tipoMunicion: "energia",
    mejorasAdmitidas: 2,
    especial: "Efecto Shock (5) · Crítico de Shock (12) · F. Auto (Esquiva 9)",
    pesoKg: 2,
    rareza: "Muy Extraño",
    coste: 30000,
    modificadores: [],
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // selector de modo
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
      // Hallazgo del barrido de motor (2026-09-22): el -6 al sigilo vive en
      // `descripcion`, no en `especial` — tiradaDeArmaFuego solo vuelca
      // `especial` a la nota, así que esto no llega a ningún sitio hoy, ni
      // siquiera como texto. Bloqueado por pregunta 25b (¿a qué tirada
      // concreta resta? depende del modelo de sigilo persistente propuesto
      // ahí mismo, sin validar con Murillo).
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "pregunta 25b" },
    ],
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
    tipoMunicion: "energia",
    mejorasAdmitidas: 2,
    especial: "Efecto Shock y Llamarada (7) · Crítico de Fusión (11) · F. Auto (Esquiva 9)",
    pesoKg: 3,
    rareza: "Muy Extraño",
    coste: 45000,
    modificadores: [],
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // selector de modo
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "pregunta 25b" }, // -6 sigilo en descripcion, no llega a ningún sitio (mismo hallazgo que Rayo Ligero)
    ],
  },
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
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // selector de modo
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    tipoMunicion: "energia",
    mejorasAdmitidas: 2,
    especial: "Efecto Shock y Llamarada (8) · Crítico de Fusión (12) · F. Auto (Esquiva 10)",
    pesoKg: 7.5,
    rareza: "Muy Extraño",
    coste: 56000,
    modificadores: [],
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // selector de modo
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "pregunta 25b" }, // -6 sigilo en descripcion, no llega a ningún sitio
    ],
  },
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
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // selector de modo
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // selector de modo
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // selector de modo
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // selector de modo
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    tipoMunicion: "energia",
    mejorasAdmitidas: 2,
    especial: "Efecto Shock y Llamarada (8) · Crítico de Fusión (12) · F. Auto (Esquiva 10)",
    pesoKg: 4.5,
    rareza: "Extraño",
    coste: 56000,
    modificadores: [],
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // selector de modo
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "pregunta 25b" }, // -5 sigilo en descripcion, no llega a ningún sitio
    ],
  },
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
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // selector de modo
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // selector de modo
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // selector de modo
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    tipoMunicion: "energia",
    mejorasAdmitidas: 3,
    especial: "Efecto Llamarada (8) · Crítico de Ceguera (10) · F. Auto (Esquiva 10)",
    pesoKg: 3.5,
    rareza: "Extraño",
    coste: 16000,
    modificadores: [],
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // selector de modo
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // selector de modo
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    tipoMunicion: "energia",
    mejorasAdmitidas: 3,
    especial: "Efecto Shock (6) · Crítico de Shock (11) · F. Auto (Esquiva 10)",
    pesoKg: 5.5,
    rareza: "Extraño",
    coste: 55000,
    modificadores: [],
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // selector de modo
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    tipoMunicion: "energia",
    mejorasAdmitidas: 2,
    especial: "Efecto Shock y Llamarada (6) · Crítico de Fusión (11) · F. Auto (Esquiva 10)",
    pesoKg: 6,
    rareza: "Extraño",
    coste: 60500,
    modificadores: [],
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // selector de modo
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "pregunta 25b" }, // -5 sigilo en descripcion, no llega a ningún sitio
    ],
  },
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
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // selector de modo
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    tipoMunicion: "energia",
    mejorasAdmitidas: 3,
    especial: "Efecto Llamarada (6) · Crítico de Ceguera (10)",
    pesoKg: 6,
    rareza: "Extraño",
    coste: 20000,
    modificadores: [],
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    tipoMunicion: "energia",
    mejorasAdmitidas: 3,
    especial: "Efecto Shock (6) · Crítico de Shock (11)",
    pesoKg: 7,
    rareza: "Muy Extraño",
    coste: 70000,
    modificadores: [],
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    tipoMunicion: "energia",
    mejorasAdmitidas: 2,
    especial: "Efecto Shock y Llamarada (8) · Crítico de Fusión (12) · F. Auto (Esquiva 9)",
    pesoKg: 9,
    rareza: "Muy Extraño",
    coste: 78000,
    modificadores: [],
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // selector de modo
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
  },
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
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // selector de modo
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // selector de modo
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // selector de modo
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // selector de modo
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // selector de modo
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
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
    tipoMunicion: "energia",
    mejorasAdmitidas: 2,
    especial: "Efecto Shock y Llamarada (8) · Crítico de Fusión (12) · F. Auto (Esquiva 11)",
    pesoKg: 10,
    rareza: "Muy Extraño",
    coste: 99000,
    modificadores: [],
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // selector de modo
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
    ],
  },
];

