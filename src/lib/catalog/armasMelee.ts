// Catálogo de combate melee (Fase E) — Pelea, Armas Básicas y Kerzul.
// Fuente: docs/equipamiento.md, sección "Combate Melee" y "Kerzul".
//
// Por qué es un tipo nuevo y no ArmaFuego: el daño no es un número fijo del
// catálogo, es una FÓRMULA sobre un atributo de la ficha ("Fue+2") — se
// calcula al golpear, no se guarda aquí. Tampoco hay alcance ni munición, y
// aparecen "Uso" repetidos como etiquetas (Sutil, Arrojadiza, Mano Libre,
// Arma a 1/2 manos) que no existían en armas de fuego. Los Escudos son un
// caso aparte: además de atacar, dan Cobertura/Blindaje/PG propios.
//
// Sutil (regla transversal, no por arma): con el estilo Sutil se tira
// Reflejos en vez de Potencia para el ataque, y el daño usa Potencia en vez
// de Fuerza. Es una elección del jugador en el momento de tirar, no un dato
// de esta pieza — por eso "Sutil" vive en `uso` como etiqueta, no se
// mecaniza aquí (mismo criterio que el resto del catálogo: nada que dependa
// de una elección en juego se convierte en modificador fijo).
//
// "I" en el peso: la leyenda de EQUIP lo dice en la cabecera del documento
// ("Peso I = insignificante") — no es un dato que falte, es un dato: pesa
// tan poco que no cuenta. Se transcribe como `pesoKg: 0`, no como `null`
// (Armas Cortas, el Cuchillo de Combate, el Látigo, la Rodela de
// Metamaterial). `null` se reserva para cuando el documento de verdad no da
// nada — casilla en blanco, o una familia entera sin columna de Peso (Armas
// de Asta) — no para "insignificante".
//
// Deliberadamente NO se incluyen las "Armas Modificadas" (Electrificantes,
// Térmicas, de Plasma, de Nanofilamento): su coste es un MULTIPLICADOR del
// precio del arma base ("Básico x 10") y el efecto depende del tramo de daño
// del arma que se modifica — es una transformación sobre un arma existente,
// no un objeto propio, con la misma forma de problema que Munición Especial
// en armas de fuego (ver catalog/equipo.ts). Añadirlas pide decidir cómo se
// modela "coste = precio de otra pieza × N" antes de tocar el catálogo.
import type { Rareza } from "./equipo";
import type { MotorMetadata } from "../rules/motor";

export type ModoAtaqueMelee = {
  etiqueta: string; // "Simple", "Estándar", "Estándar / Compleja"…
  dificultad: number;
  formulaDanio: string; // "Fue+2", "Fuerza", "Fue+11"… tal cual la da EQUIP
  categoriaDanio: string; // "Letal", "No Letal", "Grave"…
};

export type ArmaMelee = {
  familia: "armaMelee";
  id: string;
  label: string;
  resumen: string;
  descripcion: string;
  uso: string[]; // "Arma a 1 mano", "Sutil", "Arrojadiza", "Alcance 4"…
  modos: ModoAtaqueMelee[];
  efectos: string | null;
  // Piloto (Cuchillo de Combate, 2026-09-23): texto de crítico, separado de
  // `efectos` porque solo aplica si la tirada acaba en crítico — `efectos` se
  // muestra siempre, esté o no en crítico. Solo el Cuchillo lo usa por ahora;
  // el resto del catálogo sigue con el texto de crítico dentro de `efectos`
  // hasta que se migre pieza a pieza (fuera de alcance de este cambio).
  efectoCritico?: string;
  pesoKg: number | null;
  rareza: Rareza | null;
  coste: number | null;
  // Solo Escudos: cobertura y blindaje propios mientras se sostiene en alto.
  defensa: { cobertura: number; blindaje: number; puntosGolpe: number } | null;
  // Bloqueo (pregunta 31, resuelta 2026-09-24): toda arma melee genera su
  // propia acción de "Bloquear" además de "Golpear" (lib/rules/combate.ts),
  // con el mismo par atributo+habilidad que su ataque. Este campo es solo el
  // ajuste PROPIO de esta pieza sobre ese bloqueo genérico (el Mangual: -2) —
  // la mayoría de armas no tiene ninguno.
  bloqueoAjuste?: number;
  motor?: MotorMetadata[]; // docs/motor.md
};

// ── Pelea ── A mano vacía: no se compra, no tiene peso ni rareza.
export const PELEA: ArmaMelee[] = [
  {
    familia: "armaMelee",
    id: "pelea_punetazo",
    label: "Puñetazo",
    resumen: "El ataque más básico: a mano vacía, gratis, siempre disponible.",
    descripcion: "Golpe a mano vacía. No letal, disponible sin comprar nada.",
    uso: ["Mano Libre", "Sutil"],
    modos: [
      { etiqueta: "Simple", dificultad: 0, formulaDanio: "Fuerza", categoriaDanio: "No Letal" },
      { etiqueta: "Estándar", dificultad: 0, formulaDanio: "Fuerza+1", categoriaDanio: "No Letal" },
    ],
    efectos: "Crítico de Aturdimiento (6)",
    pesoKg: null,
    rareza: null,
    coste: null,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "sustitucion_aplicado", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
    ],
  },
  {
    familia: "armaMelee",
    id: "pelea_patada",
    label: "Patada",
    resumen: "Golpe a mano vacía con más alcance que el puñetazo, algo menos preciso.",
    descripcion: "Golpe a mano vacía. No letal, disponible sin comprar nada.",
    uso: ["Sutil"],
    modos: [
      { etiqueta: "Simple", dificultad: -1, formulaDanio: "Fuerza", categoriaDanio: "No Letal" },
      { etiqueta: "Estándar", dificultad: -1, formulaDanio: "Fuerza+1", categoriaDanio: "No Letal" },
    ],
    efectos: "Crítico de Aturdimiento (6)",
    pesoKg: null,
    rareza: null,
    coste: null,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "sustitucion_aplicado", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
    ],
  },
  {
    familia: "armaMelee",
    id: "pelea_codazo_rodillazo",
    label: "Codazo o Rodillazo",
    resumen: "Golpe a mano vacía a corta distancia, un único modo de ataque.",
    descripcion: "Golpe a mano vacía. No letal, disponible sin comprar nada.",
    uso: ["Sutil"],
    modos: [
      { etiqueta: "Simple", dificultad: -1, formulaDanio: "Fuerza", categoriaDanio: "No Letal" },
    ],
    efectos: "Crítico de Aturdimiento (6)",
    pesoKg: null,
    rareza: null,
    coste: null,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "sustitucion_aplicado", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
    ],
  },
];

// ── Armas Cortas ──
export const ARMAS_CORTAS: ArmaMelee[] = [
  {
    familia: "armaMelee",
    id: "corta_tonfa_porra",
    label: "Tonfa o Porra",
    resumen: "Arma corta no letal, la más barata de su familia.",
    descripcion: "Arma corta a una mano, pensada para reducir sin matar.",
    uso: ["Arma a 1 mano"],
    modos: [{ etiqueta: "Simple", dificultad: 0, formulaDanio: "Fue+2", categoriaDanio: "No Letal" }],
    efectos: "Crítico de Aturdimiento (7)",
    pesoKg: 0, // insignificante (I)
    rareza: "Común",
    coste: 40,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
    ],
  },
  {
    familia: "armaMelee",
    id: "corta_maza_armas",
    label: "Maza de Armas",
    resumen: "Arma corta contundente y letal, sencilla de conseguir.",
    descripcion: "Arma corta a una mano, de impacto letal.",
    uso: ["Arma a 1 mano"],
    modos: [{ etiqueta: "Simple", dificultad: -1, formulaDanio: "Fue+2", categoriaDanio: "Letal" }],
    efectos: "Crítico de Aturdimiento (8)",
    pesoKg: 0, // insignificante (I)
    rareza: "Común",
    coste: 50,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
    ],
  },
  {
    familia: "armaMelee",
    id: "corta_pico_cuervo",
    label: "Pico de Cuervo",
    resumen: "Arma corta perforante, causa hemorragia en vez de aturdir.",
    descripcion: "Arma corta a una mano, pensada para perforar.",
    uso: ["Arma a 1 mano"],
    modos: [{ etiqueta: "Simple", dificultad: -1, formulaDanio: "Fue+2", categoriaDanio: "Letal" }],
    efectos: "Crítico de Hemorragia (1d6 turnos)",
    pesoKg: 0, // insignificante (I)
    rareza: "Poco Habitual",
    coste: 50,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
    ],
  },
  {
    familia: "armaMelee",
    id: "corta_hacha_armas",
    label: "Hacha de Armas",
    resumen: "Arma corta de filo, la más barata de las que causan hemorragia.",
    descripcion: "Arma corta a una mano, de filo.",
    uso: ["Arma a 1 mano"],
    modos: [{ etiqueta: "Simple", dificultad: -1, formulaDanio: "Fue+2", categoriaDanio: "Letal" }],
    efectos: "Crítico de Hemorragia (1d6 turnos)",
    pesoKg: 0, // insignificante (I)
    rareza: "Común",
    coste: 30,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
    ],
  },
];

// ── Armas de Asta ── EQUIP no da columna de peso para esta familia.
export const ARMAS_DE_ASTA: ArmaMelee[] = [
  {
    familia: "armaMelee",
    id: "asta_baston_combate",
    label: "Bastón de Combate",
    resumen: "Arma de asta no letal, con alcance extra y dos manos.",
    descripcion: "Arma a dos manos con alcance, pensada para reducir sin matar.",
    uso: ["Arma a 2 manos", "Alcance 4"],
    modos: [
      { etiqueta: "Simple", dificultad: 0, formulaDanio: "Fue+1", categoriaDanio: "No Letal" },
      { etiqueta: "Estándar", dificultad: 0, formulaDanio: "Fue+3", categoriaDanio: "No Letal" },
    ],
    efectos: "Crítico de Aturdimiento (7)",
    pesoKg: null,
    rareza: "Común",
    coste: 40,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
    ],
  },
  {
    familia: "armaMelee",
    id: "asta_lanza_corta",
    label: "Lanza Corta",
    resumen: "Lanza a una mano, se puede arrojar y usar con estilo Sutil.",
    descripcion: "Arma de asta a una mano, arrojadiza.",
    uso: ["Arma a 1 mano", "Arrojadiza", "Sutil"],
    modos: [
      { etiqueta: "Simple", dificultad: -1, formulaDanio: "Fue+2", categoriaDanio: "Letal" },
      { etiqueta: "Estándar", dificultad: -1, formulaDanio: "Fue+4", categoriaDanio: "Letal" },
    ],
    efectos: "Crítico de Hemorragia (1d4 turnos)",
    pesoKg: null,
    rareza: "Común",
    coste: 80,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "sustitucion_aplicado", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
    ],
  },
  {
    familia: "armaMelee",
    id: "asta_lanza_larga",
    label: "Lanza Larga",
    resumen: "Lanza a dos manos con alcance extra.",
    descripcion: "Arma de asta a dos manos, con alcance.",
    uso: ["Arma a 2 manos", "Alcance 4"],
    modos: [
      { etiqueta: "Simple", dificultad: -1, formulaDanio: "Fue+2", categoriaDanio: "Letal" },
      { etiqueta: "Estándar", dificultad: -1, formulaDanio: "Fue+4", categoriaDanio: "Letal" },
    ],
    efectos: "Crítico de Hemorragia (1d6 turnos)",
    pesoKg: null,
    rareza: "Común",
    coste: 120,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
    ],
  },
  {
    familia: "armaMelee",
    id: "asta_hacha_guerra",
    label: "Hacha de Guerra",
    resumen: "Arma de asta pesada a dos manos, de filo.",
    descripcion: "Arma de asta a dos manos, de filo pesado.",
    uso: ["Arma a 2 manos"],
    modos: [
      { etiqueta: "Simple", dificultad: -2, formulaDanio: "Fue+4", categoriaDanio: "Letal" },
      { etiqueta: "Estándar", dificultad: -2, formulaDanio: "Fue+6", categoriaDanio: "Letal" },
    ],
    efectos: "Crítico de Hemorragia (1d10 turnos)",
    pesoKg: null,
    rareza: "Común",
    coste: 150,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
    ],
  },
  {
    familia: "armaMelee",
    id: "asta_martillo_enastado",
    label: "Martillo Enastado",
    resumen: "Arma de asta pesada a dos manos, contundente.",
    descripcion: "Arma de asta a dos manos, de impacto pesado.",
    uso: ["Arma a 2 manos"],
    modos: [
      { etiqueta: "Simple", dificultad: -2, formulaDanio: "Fue+4", categoriaDanio: "Letal" },
      { etiqueta: "Estándar", dificultad: -2, formulaDanio: "Fue+6", categoriaDanio: "Letal" },
    ],
    efectos: "Crítico de Aturdimiento (10)",
    pesoKg: null,
    rareza: "Común",
    coste: 150,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
    ],
  },
  {
    familia: "armaMelee",
    id: "asta_alabarda",
    label: "Alabarda",
    resumen: "Arma de asta a dos manos con alcance, de filo pesado.",
    descripcion: "Arma de asta a dos manos, con alcance y filo pesado.",
    uso: ["Arma a 2 manos", "Alcance 4"],
    modos: [
      { etiqueta: "Simple", dificultad: -2, formulaDanio: "Fue+3", categoriaDanio: "Letal" },
      { etiqueta: "Estándar", dificultad: -2, formulaDanio: "Fue+5", categoriaDanio: "Letal" },
    ],
    efectos: "Crítico de Hemorragia (1d10 turnos)",
    pesoKg: null,
    rareza: "Común",
    coste: 160,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
    ],
  },
];

// ── Escudos ── Acción simple (Rodela) o estándar (Escudo) para levantarlo y
// beneficiarse de la cobertura; no se aplica si atacan por la espalda, y se
// benefician de escudo deflector / malla plasmática si el usuario los lleva.
export const ESCUDOS: ArmaMelee[] = [
  {
    familia: "armaMelee",
    id: "escudo_rodela",
    label: "Rodela",
    resumen: "Escudo ligero, sujeto al antebrazo: cobertura de nivel 1 sin ocupar la mano.",
    descripcion:
      "Puede llevarse sujeta al antebrazo sin obstaculizar el uso de la mano; solo exige levantarla " +
      "(acción simple) para buscar cobertura. No se aplica si atacan por la espalda.",
    uso: ["Arma a 1 mano"],
    modos: [{ etiqueta: "Simple", dificultad: 0, formulaDanio: "Fue+2", categoriaDanio: "No Letal" }],
    efectos: "Crítico de Aturdimiento (8)",
    pesoKg: 1,
    rareza: "Común",
    coste: 130,
    defensa: { cobertura: 1, blindaje: 4, puntosGolpe: 8 },
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
      // defensa.blindaje: se sumaría a la absorción de daño del portador — bloqueado por el
      // mismo hueco que el blindaje de armadura (no existe cálculo de absorción, pregunta 29).
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "pregunta 29" },
      // defensa.puntosGolpe: el escudo como objeto destructible (se le puede restar daño hasta
      // romperlo). No es el mismo hueco que pregunta 29 (esa es sobre el PG del PERSONAJE) — no
      // existe ningún mecanismo de "objeto con sus propios PG" en el motor, en ningún sitio.
      // Hallazgo nuevo, sin pregunta numerada que lo cubra — ver informe.
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
      // defensa.cobertura: regla FIRME (docs/sistema.md:271-273, "del 1 al 4 suma su valor a la
      // dificultad de ataques"), pero afecta a la tirada del ATACANTE, no a la del portador —
      // mismo patrón "objetivo_tercero" que Cobertura del Camuflaje Trifásico (motor.md, ya
      // identificado como listo para construir sin bloqueo real, solo falta la nota a mano).
      {
        tipo: "texto",
        afecta: { modo: "objetivo_tercero", id: "ataque_contra_portador_escudo" },
        mecanismo: "nota_fija",
        estado: "pendiente",
      },
    ],
  },
  {
    familia: "armaMelee",
    id: "escudo_estandar",
    label: "Escudo",
    resumen: "Escudo de cobertura mayor que la rodela, pero siempre ocupa la mano.",
    descripcion:
      "Requiere una acción estándar para levantarlo; a diferencia de la rodela, siempre ocupa la " +
      "mano. No se aplica si atacan por la espalda.",
    uso: ["Arma a 1 mano"],
    modos: [{ etiqueta: "Estándar", dificultad: 0, formulaDanio: "Fue+2", categoriaDanio: "No Letal" }],
    efectos: "Crítico de Aturdimiento (8)",
    pesoKg: 2,
    rareza: "Común",
    coste: 190,
    defensa: { cobertura: 2, blindaje: 4, puntosGolpe: 12 },
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "pregunta 29" },
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
      {
        tipo: "texto",
        afecta: { modo: "objetivo_tercero", id: "ataque_contra_portador_escudo" },
        mecanismo: "nota_fija",
        estado: "pendiente",
      },
    ],
  },
  {
    familia: "armaMelee",
    id: "escudo_rodela_metamaterial",
    label: "Rodela de Metamaterial",
    resumen: "Versión de metamateriales de la rodela: mismo tamaño, mucho más resistente.",
    descripcion: "Rodela de materiales avanzados: mismo manejo, blindaje y aguante muy superiores.",
    uso: ["Arma a 1 mano"],
    modos: [{ etiqueta: "Simple", dificultad: 0, formulaDanio: "Fue+2", categoriaDanio: "No Letal" }],
    efectos: "Crítico de Aturdimiento (8)",
    pesoKg: 0, // insignificante (I)
    rareza: "Poco Habitual",
    coste: 1200,
    defensa: { cobertura: 1, blindaje: 8, puntosGolpe: 16 },
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "pregunta 29" },
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
      {
        tipo: "texto",
        afecta: { modo: "objetivo_tercero", id: "ataque_contra_portador_escudo" },
        mecanismo: "nota_fija",
        estado: "pendiente",
      },
    ],
  },
  {
    familia: "armaMelee",
    id: "escudo_metamaterial",
    label: "Escudo de Metamaterial",
    resumen: "Versión de metamateriales del escudo: mucho más blindaje y aguante.",
    descripcion: "Escudo de materiales avanzados: blindaje y aguante muy superiores al estándar.",
    uso: ["Arma a 1 mano"],
    modos: [{ etiqueta: "Estándar", dificultad: 0, formulaDanio: "Fue+2", categoriaDanio: "No Letal" }],
    efectos: "Crítico de Aturdimiento (8)",
    pesoKg: 1,
    rareza: "Poco Habitual",
    coste: 2000,
    defensa: { cobertura: 2, blindaje: 8, puntosGolpe: 24 },
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "pregunta 29" },
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
      {
        tipo: "texto",
        afecta: { modo: "objetivo_tercero", id: "ataque_contra_portador_escudo" },
        mecanismo: "nota_fija",
        estado: "pendiente",
      },
    ],
  },
];

// ── Espadas y Dagas ── EQUIP deja Peso y Rareza en blanco salvo el cuchillo.
export const ESPADAS_Y_DAGAS: ArmaMelee[] = [
  {
    familia: "armaMelee",
    id: "espada_cuchillo_combate",
    label: "Cuchillo de Combate",
    resumen: "Arma corta, arrojadiza, ideal para el estilo Sutil.",
    descripcion: "Daga a una mano, ligera y fácil de arrojar.",
    uso: ["Arma a 1 mano", "Sutil", "Arrojadizo"],
    modos: [{ etiqueta: "Simple", dificultad: 0, formulaDanio: "Fue+2", categoriaDanio: "Letal" }],
    efectos: null,
    efectoCritico: "Hemorragia (1d6 turnos)",
    pesoKg: 0, // insignificante (I)
    rareza: "Común",
    coste: 30,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "sustitucion_aplicado", estado: "construido" },
      // efectoCritico: ya no es un volcado de texto sin lógica — solo se
      // pinta cuando resultado.critico es true (ResultadoTirada.tsx), así
      // que pasa a "construido" (piloto, 2026-09-23).
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "construido" },
    ],
  },
  {
    familia: "armaMelee",
    id: "espada_ligera",
    label: "Espada Ligera",
    resumen: "Espada a una mano pensada para el estilo Sutil.",
    descripcion: "Espada a una mano, ligera, apta para el estilo Sutil.",
    uso: ["Arma a 1 mano", "Sutil"],
    modos: [
      { etiqueta: "Simple", dificultad: -1, formulaDanio: "Fue+2", categoriaDanio: "Letal" },
      { etiqueta: "Estándar", dificultad: -1, formulaDanio: "Fue+4", categoriaDanio: "Letal" },
    ],
    efectos: "Crítico de Hemorragia (1d6 turnos)",
    pesoKg: null,
    // Rareza en blanco en EQUIP (a diferencia de Pelea, esta sí tiene coste):
    // Común, coherente con su precio — ver S13 en docs/sistema.md.
    rareza: "Común",
    coste: 100,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "sustitucion_aplicado", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
    ],
  },
  {
    familia: "armaMelee",
    id: "espada",
    label: "Espada",
    resumen: "Espada estándar a una mano, más daño que la ligera.",
    descripcion: "Espada a una mano, de filo estándar.",
    uso: ["Arma a 1 mano"],
    modos: [
      { etiqueta: "Simple", dificultad: -1, formulaDanio: "Fue+3", categoriaDanio: "Letal" },
      { etiqueta: "Estándar", dificultad: -1, formulaDanio: "Fue+5", categoriaDanio: "Letal" },
    ],
    efectos: "Crítico de Hemorragia (1d8 turnos)",
    pesoKg: null,
    // Ver S13 en docs/sistema.md.
    rareza: "Común",
    coste: 100,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
    ],
  },
  {
    familia: "armaMelee",
    id: "espada_montante",
    label: "Montante",
    resumen: "Espada grande a dos manos, la más pesada de su familia.",
    descripcion: "Espada a dos manos, de gran tamaño.",
    uso: ["Arma a 2 manos"],
    modos: [
      { etiqueta: "Simple", dificultad: -2, formulaDanio: "Fue+4", categoriaDanio: "Letal" },
      { etiqueta: "Estándar", dificultad: -2, formulaDanio: "Fue+6", categoriaDanio: "Letal" },
    ],
    efectos: "Crítico de Hemorragia (1d10 turnos)",
    pesoKg: null,
    // Ver S13 en docs/sistema.md.
    rareza: "Común",
    coste: 150,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
    ],
  },
];

// ── Flagelos ──
export const FLAGELOS: ArmaMelee[] = [
  {
    familia: "armaMelee",
    id: "flagelo_latigo",
    label: "Látigo",
    resumen: "Arma flexible a una mano, apta para Sutil, con crítico que derriba o entorpece.",
    descripcion: "Arma flexible a una mano.",
    uso: ["Arma a 1 mano", "Sutil"],
    modos: [{ etiqueta: "Simple", dificultad: -2, formulaDanio: "Fue+2", categoriaDanio: "Letal" }],
    efectos: "Crítico Derribado o Entorpecido (10)",
    pesoKg: 0, // insignificante (I)
    rareza: "Común",
    coste: 50,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "sustitucion_aplicado", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
    ],
  },
  {
    familia: "armaMelee",
    id: "flagelo_mangual",
    label: "Mangual",
    resumen: "Arma flexible pesada; en modo estándar ignora parte de la cobertura, pero penaliza al bloqueo.",
    descripcion: "Arma flexible a una mano, pesada.",
    uso: [
      "Arma a 1 mano",
      "Acción Estándar ignora 2 niveles de Cobertura física",
      "Bloqueo -2",
    ],
    modos: [
      { etiqueta: "Simple", dificultad: -2, formulaDanio: "Fue+3", categoriaDanio: "Letal" },
      { etiqueta: "Estándar", dificultad: -2, formulaDanio: "Fue+5", categoriaDanio: "Letal" },
    ],
    efectos: "Crítico de Aturdimiento (9)",
    pesoKg: null,
    rareza: "Poco Habitual",
    coste: 100,
    defensa: null,
    bloqueoAjuste: -2,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
      // uso: "Bloqueo -2" — pregunta 31 resuelta (2026-09-24): Bloqueo es una
      // acción de defensa activa más, generada para cualquier arma melee
      // (bloquear_melee_<instancia>, ver combate.ts), con el mismo par que su
      // ataque. Este -2 es el ajuste propio del Mangual sobre esa acción.
      { tipo: "numerico", afecta: { modo: "accion_nueva", id: "bloquear_melee" }, mecanismo: "ajuste_fijo", estado: "construido" },
      // uso: "Acción Estándar ignora 2 niveles de Cobertura física" — condicionado al modo
      // Estándar, mismo mecanismo que el selector de arriba, pero la cobertura en sí (afectada
      // aquí desde el punto de vista del ATACANTE, no de quien se cubre) no tiene ningún cálculo
      // implementado en ningún sitio del motor todavía, aunque la regla es FIRME (sistema.md:271).
      {
        tipo: "numerico",
        afecta: { modo: "accion_existente", id: "ataque_melee" },
        mecanismo: "eleccion_jugador",
        estado: "pendiente",
      },
    ],
  },
  {
    familia: "armaMelee",
    id: "flagelo_cadena_armada",
    label: "Cadena Armada",
    resumen: "Arma flexible a dos manos con alcance extra, apta para Sutil.",
    descripcion: "Arma flexible a dos manos, con alcance.",
    uso: ["Arma a 2 manos", "Alcance 4", "Sutil"],
    modos: [
      { etiqueta: "Simple", dificultad: -2, formulaDanio: "Fue+2", categoriaDanio: "Letal" },
      { etiqueta: "Estándar", dificultad: -2, formulaDanio: "Fue+4", categoriaDanio: "Letal" },
    ],
    efectos: "Crítico Derribado o Entorpecido (12)",
    pesoKg: null,
    rareza: "Poco Habitual",
    coste: 150,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "sustitucion_aplicado", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
    ],
  },
];

// ── Armas Mecánicas ── Motorizadas: acción estándar o compleja (más daño,
// con un efecto extra al gastar la compleja).
export const ARMAS_MECANICAS: ArmaMelee[] = [
  {
    familia: "armaMelee",
    id: "mecanica_hoja_dentada",
    label: "Hoja Dentada",
    resumen: "Sierra motorizada a una mano; en modo compleja ignora blindaje.",
    descripcion: "Hoja motorizada a una mano.",
    uso: ["Arma a 1 mano"],
    modos: [
      { etiqueta: "Estándar", dificultad: -2, formulaDanio: "Fue+3", categoriaDanio: "Letal" },
      { etiqueta: "Compleja", dificultad: -2, formulaDanio: "Fue+6", categoriaDanio: "Letal" },
    ],
    efectos:
      "Hemorragia 1 turno · Crítico de Hemorragia Exanguinante · Acción Compleja: ignora 1 nivel de armadura",
    pesoKg: 5,
    rareza: "Poco Habitual",
    coste: 700,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
      // "Hemorragia 1 turno · Crítico de Hemorragia Exanguinante" — funciona igual que el resto.
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
      // "Acción Compleja: ignora 1 nivel de armadura" — bloqueado por el mismo hueco que
      // blindaje de armadura (pregunta 29, no existe cálculo de absorción por niveles).
      {
        tipo: "numerico",
        afecta: { modo: "accion_existente", id: "ataque_melee" },
        mecanismo: "eleccion_jugador",
        estado: "bloqueado",
        bloqueoPor: "pregunta 29",
      },
    ],
  },
  {
    familia: "armaMelee",
    id: "mecanica_guantelete_piston",
    label: "Guantelete de Pistón",
    resumen: "Puño motorizado a una mano; en modo compleja derriba.",
    descripcion: "Guantelete de impacto motorizado, a una mano.",
    uso: ["Arma a 1 mano"],
    modos: [
      { etiqueta: "Estándar", dificultad: -2, formulaDanio: "Fue+3", categoriaDanio: "Letal" },
      { etiqueta: "Compleja", dificultad: -2, formulaDanio: "Fue+6", categoriaDanio: "Letal" },
    ],
    efectos: "Aturdimiento (6) · Crítico: Aturdimiento (10) · Acción Compleja: Derribo (8)",
    pesoKg: 7,
    rareza: "Poco Habitual",
    coste: 700,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
      // "Aturdimiento (6) · Crítico: Aturdimiento (10)" — funciona igual que el resto.
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
      // "Acción Compleja: Derribo (8)" — no es un simple ajuste numérico ni una nota: dispara
      // el estado Derribado, que SÍ existe en el catálogo (estados.ts:312) pero hoy nada en
      // combate.ts lo conecta a un crítico de arma — corregido 2026-09-24, la auditoría había
      // marcado el estado como "sin catalogar", que era falso; el hueco real es el trigger.
      // Tipo dudoso entre "accion" (genera su propia salvación) y "numerico" (penalizador si
      // falla) — sigue marcado inconcluso.
      {
        tipo: "accion",
        afecta: { modo: "accion_nueva", id: "derribo_arma_mecanica" },
        mecanismo: "accion_equipo",
        estado: "bloqueado",
        bloqueoPor: "Derribado existe (estados.ts:312) pero ningún crítico de arma lo dispara — falta el mecanismo de trigger, no el estado",
      },
    ],
  },
  {
    familia: "armaMelee",
    id: "mecanica_sierra_circular",
    label: "Sierra Circular",
    resumen: "Sierra motorizada a dos manos; en modo compleja ignora blindaje.",
    descripcion: "Sierra motorizada a dos manos.",
    uso: ["Arma a 2 manos"],
    modos: [
      {
        etiqueta: "Estándar",
        dificultad: -2,
        formulaDanio: "Fue+5",
        categoriaDanio: "(sin especificar en la fuente)",
      },
      {
        etiqueta: "Compleja",
        dificultad: -2,
        formulaDanio: "Fue+7",
        categoriaDanio: "(sin especificar en la fuente)",
      },
    ],
    efectos:
      "Hemorragia 1 turno · Crítico de Hemorragia Exanguinante · Acción Compleja: ignora 1 nivel de armadura",
    pesoKg: 12,
    rareza: "Extraño",
    coste: 1500,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
      {
        tipo: "numerico",
        afecta: { modo: "accion_existente", id: "ataque_melee" },
        mecanismo: "eleccion_jugador",
        estado: "bloqueado",
        bloqueoPor: "pregunta 29",
      },
    ],
  },
  {
    familia: "armaMelee",
    id: "mecanica_martillo_piston",
    label: "Martillo de Pistón",
    resumen: "Martillo motorizado a dos manos; en modo compleja derriba.",
    descripcion: "Martillo de impacto motorizado, a dos manos.",
    uso: ["Arma a 2 manos"],
    modos: [
      { etiqueta: "Estándar", dificultad: -3, formulaDanio: "Fue+6", categoriaDanio: "Letal" },
      { etiqueta: "Compleja", dificultad: -3, formulaDanio: "Fue+8", categoriaDanio: "Letal" },
    ],
    efectos: "Aturdimiento (6) · Crítico: Aturdimiento (12) · Acción Compleja: Derribo (8)",
    pesoKg: 18,
    rareza: "Extraño",
    coste: 2100,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
      {
        tipo: "accion",
        afecta: { modo: "accion_nueva", id: "derribo_arma_mecanica" },
        mecanismo: "accion_equipo",
        estado: "bloqueado",
        bloqueoPor: "Derribado existe (estados.ts:312) pero ningún crítico de arma lo dispara — falta el mecanismo de trigger, no el estado",
      },
    ],
  },
  {
    familia: "armaMelee",
    id: "mecanica_ariete_percusivo",
    label: "Ariete Percusivo",
    resumen: "El arma mecánica más pesada: derriba y hace el doble contra estructuras.",
    descripcion: "Ariete motorizado a dos manos, con alcance.",
    uso: ["Arma a 2 manos", "Alcance 4"],
    modos: [
      { etiqueta: "Estándar", dificultad: -3, formulaDanio: "Fue+5", categoriaDanio: "Letal" },
      { etiqueta: "Compleja", dificultad: -3, formulaDanio: "Fue+7", categoriaDanio: "Letal" },
    ],
    efectos:
      "Derribo (6) · Crítico: Aturdimiento (12) · Acción Compleja: Derribo (10) · " +
      "Doble daño contra puertas, muros y estructuras",
    pesoKg: 30,
    rareza: "Extraño",
    coste: 2500,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
      // Solo "Crítico: Aturdimiento (12)" — el resto del string se desglosa aparte abajo.
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
      // "Derribo (6)" en modo base y "Derribo (10)" en Compleja: mismo hueco que las otras
      // Armas Mecánicas (falta el trigger al estado Derribado, no el estado en sí — ver
      // corrección 2026-09-24 más abajo en el archivo), un único efecto con dos valores según
      // el modo.
      {
        tipo: "accion",
        afecta: { modo: "accion_nueva", id: "derribo_arma_mecanica" },
        mecanismo: "accion_equipo",
        estado: "bloqueado",
        bloqueoPor: "Derribado existe (estados.ts:312) pero ningún crítico de arma lo dispara — falta el mecanismo de trigger, no el estado",
      },
      // "Doble daño contra puertas, muros y estructuras" — no hay concepto de "objetivo
      // estructura" en el motor (todo objetivo es un Combatiente). Sin acción a la que apuntar
      // todavía, pero la regla en sí es clara — pendiente, no bloqueada por una pregunta abierta.
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
    ],
  },
];

// ── Kerzul ── Aleación arkorü: el 100% de la energía cinética se transfiere
// al objetivo, atravesando armadura y escudos. Con acción Estándar o
// Compleja, quien la usa arriesga "retroceso entrópico": tirada de
// Fortaleza (dificultad = daño básico del arma) o daño no letal + entorpecido
// (derribado con fracaso crítico). El crítico de Impacto Estructural reduce
// el blindaje del objetivo 1 punto (2 en armas a dos manos), de forma
// permanente — no está en el catálogo de 23 estados de COMBATE (conflicto
// C13 de docs/sistema.md), así que se queda como texto en `efectos`.
export const ARMAS_MELEE_KERZUL: ArmaMelee[] = [
  {
    familia: "armaMelee",
    id: "kerzul_punal",
    label: "Puñal de Kerzul",
    resumen: "Daga de kerzul, arrojadiza, ignora blindaje.",
    descripcion: "Daga de kerzul a una mano; toda su energía cinética atraviesa la defensa del objetivo.",
    uso: ["Arma a 1 mano", "Arrojadizo"],
    modos: [{ etiqueta: "Simple", dificultad: -1, formulaDanio: "Fue+4", categoriaDanio: "Letal" }],
    efectos: "Ignora 2 puntos de blindaje · Hemorragia (1d8 turnos) · Crítico: Impacto Estructural (10)",
    pesoKg: 2,
    rareza: "Singular",
    coste: 12000,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      // Solo "Hemorragia (1d8 turnos)" — Ignora blindaje e Impacto Estructural van aparte abajo.
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
      // "Ignora N puntos de blindaje": bloqueado por el mismo hueco que blindaje de armadura.
      {
        tipo: "numerico",
        afecta: { modo: "accion_existente", id: "ataque_melee" },
        mecanismo: "ajuste_fijo",
        estado: "bloqueado",
        bloqueoPor: "pregunta 29",
      },
      // "Crítico: Impacto Estructural (N)": reduce el blindaje del objetivo de forma PERMANENTE —
      // no está en el catálogo de 23 estados (conflicto C13 de sistema.md).
      {
        tipo: "texto",
        afecta: { modo: "accion_existente", id: "ataque_melee" },
        mecanismo: "nota_fija",
        estado: "bloqueado",
        bloqueoPor: "C13",
      },
      // Retroceso entrópico (comentario de cabecera del archivo): compartido por las 10 armas
      // Kerzul. Regla clara (Fortaleza vs. daño básico del arma), pero hoy ni siquiera se
      // muestra en la UI — no está bloqueado por ninguna pregunta, solo sin construir.
      {
        tipo: "accion",
        afecta: { modo: "accion_nueva", id: "salvacion_retroceso_entropico" },
        mecanismo: "accion_equipo",
        estado: "pendiente",
      },
    ],
  },
  {
    familia: "armaMelee",
    id: "kerzul_espada_hacha_pico",
    label: "Espada, Hacha o Pico de Guerra de Kerzul",
    resumen: "Arma de filo de kerzul a una mano; el modo Compleja arriesga retroceso entrópico.",
    descripcion: "Arma de filo de kerzul a una mano.",
    uso: ["Arma a 1 mano"],
    modos: [
      { etiqueta: "Estándar", dificultad: -2, formulaDanio: "Fue+6", categoriaDanio: "Letal" },
      { etiqueta: "Compleja", dificultad: -2, formulaDanio: "Fue+8", categoriaDanio: "Letal" },
    ],
    efectos: "Ignora 4 puntos de blindaje · Hemorragia (1d12 turnos) · Crítico: Impacto Estructural (12)",
    pesoKg: 6,
    rareza: "Singular",
    coste: 24000,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
      {
        tipo: "numerico",
        afecta: { modo: "accion_existente", id: "ataque_melee" },
        mecanismo: "ajuste_fijo",
        estado: "bloqueado",
        bloqueoPor: "pregunta 29",
      },
      {
        tipo: "texto",
        afecta: { modo: "accion_existente", id: "ataque_melee" },
        mecanismo: "nota_fija",
        estado: "bloqueado",
        bloqueoPor: "C13",
      },
      {
        tipo: "accion",
        afecta: { modo: "accion_nueva", id: "salvacion_retroceso_entropico" },
        mecanismo: "accion_equipo",
        estado: "pendiente",
      },
    ],
  },
  {
    familia: "armaMelee",
    id: "kerzul_espadon_hacha_armas",
    label: "Espadón o Hacha de Armas de Kerzul",
    resumen: "Arma de filo de kerzul a dos manos, la más devastadora de la familia.",
    descripcion: "Arma de filo de kerzul a dos manos, de gran tamaño.",
    uso: ["Arma a 2 manos"],
    modos: [
      { etiqueta: "Estándar", dificultad: -4, formulaDanio: "Fue+8", categoriaDanio: "Letal" },
      { etiqueta: "Compleja", dificultad: -4, formulaDanio: "Fue+11", categoriaDanio: "Letal" },
    ],
    efectos:
      "Ignora 8 puntos de blindaje · Hemorragia Exanguinante · Derribo (12) · " +
      "Crítico: Impacto Estructural (16)",
    pesoKg: 14,
    rareza: "Singular",
    coste: 42000,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
      // "Hemorragia Exanguinante" funciona igual que el resto; "Derribo (12)" es el mismo hueco
      // que el Derribo de las Armas Mecánicas (estado sin catalogar) — se desglosa aparte.
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
      {
        tipo: "accion",
        afecta: { modo: "accion_nueva", id: "derribo_arma_mecanica" },
        mecanismo: "accion_equipo",
        estado: "bloqueado",
        bloqueoPor: "Derribado existe (estados.ts:312) pero ningún crítico de arma lo dispara — falta el mecanismo de trigger, no el estado",
      },
      {
        tipo: "numerico",
        afecta: { modo: "accion_existente", id: "ataque_melee" },
        mecanismo: "ajuste_fijo",
        estado: "bloqueado",
        bloqueoPor: "pregunta 29",
      },
      {
        tipo: "texto",
        afecta: { modo: "accion_existente", id: "ataque_melee" },
        mecanismo: "nota_fija",
        estado: "bloqueado",
        bloqueoPor: "C13",
      },
      {
        tipo: "accion",
        afecta: { modo: "accion_nueva", id: "salvacion_retroceso_entropico" },
        mecanismo: "accion_equipo",
        estado: "pendiente",
      },
    ],
  },
  {
    familia: "armaMelee",
    id: "kerzul_maza",
    label: "Maza de Kerzul",
    resumen: "Maza de kerzul a una mano: derriba y aturde además de herir.",
    descripcion: "Maza de kerzul a una mano, contundente.",
    uso: ["Arma a 1 mano"],
    modos: [
      { etiqueta: "Estándar", dificultad: -2, formulaDanio: "Fue+6", categoriaDanio: "Letal" },
      { etiqueta: "Compleja", dificultad: -2, formulaDanio: "Fue+8", categoriaDanio: "Letal" },
    ],
    efectos: "Ignora 2 puntos de blindaje · Derribo (11) · Aturdimiento (9) · Crítico: Impacto Estructural (10)",
    pesoKg: 9,
    rareza: "Singular",
    coste: 26000,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
      {
        tipo: "accion",
        afecta: { modo: "accion_nueva", id: "derribo_arma_mecanica" },
        mecanismo: "accion_equipo",
        estado: "bloqueado",
        bloqueoPor: "Derribado existe (estados.ts:312) pero ningún crítico de arma lo dispara — falta el mecanismo de trigger, no el estado",
      },
      {
        tipo: "numerico",
        afecta: { modo: "accion_existente", id: "ataque_melee" },
        mecanismo: "ajuste_fijo",
        estado: "bloqueado",
        bloqueoPor: "pregunta 29",
      },
      {
        tipo: "texto",
        afecta: { modo: "accion_existente", id: "ataque_melee" },
        mecanismo: "nota_fija",
        estado: "bloqueado",
        bloqueoPor: "C13",
      },
      {
        tipo: "accion",
        afecta: { modo: "accion_nueva", id: "salvacion_retroceso_entropico" },
        mecanismo: "accion_equipo",
        estado: "pendiente",
      },
    ],
  },
  {
    familia: "armaMelee",
    id: "kerzul_baston_combate",
    label: "Bastón de Combate de Kerzul",
    resumen: "Bastón de kerzul a dos manos con alcance; derriba y aturde.",
    descripcion: "Bastón de kerzul a dos manos, con alcance.",
    uso: ["Arma a 2 manos", "Alcance 4"],
    modos: [
      { etiqueta: "Estándar", dificultad: -1, formulaDanio: "Fue+5", categoriaDanio: "Letal" },
      { etiqueta: "Compleja", dificultad: -1, formulaDanio: "Fue+7", categoriaDanio: "Letal" },
    ],
    efectos: "Ignora 2 puntos de blindaje · Derribo (11) · Aturdimiento (9) · Crítico: Impacto Estructural (11)",
    pesoKg: 7,
    rareza: "Singular",
    coste: 20000,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
      {
        tipo: "accion",
        afecta: { modo: "accion_nueva", id: "derribo_arma_mecanica" },
        mecanismo: "accion_equipo",
        estado: "bloqueado",
        bloqueoPor: "Derribado existe (estados.ts:312) pero ningún crítico de arma lo dispara — falta el mecanismo de trigger, no el estado",
      },
      {
        tipo: "numerico",
        afecta: { modo: "accion_existente", id: "ataque_melee" },
        mecanismo: "ajuste_fijo",
        estado: "bloqueado",
        bloqueoPor: "pregunta 29",
      },
      {
        tipo: "texto",
        afecta: { modo: "accion_existente", id: "ataque_melee" },
        mecanismo: "nota_fija",
        estado: "bloqueado",
        bloqueoPor: "C13",
      },
      {
        tipo: "accion",
        afecta: { modo: "accion_nueva", id: "salvacion_retroceso_entropico" },
        mecanismo: "accion_equipo",
        estado: "pendiente",
      },
    ],
  },
  {
    familia: "armaMelee",
    id: "kerzul_lanza_corta",
    label: "Lanza Corta de Kerzul",
    resumen: "Lanza de kerzul a una mano, arrojadiza.",
    descripcion: "Lanza de kerzul a una mano, arrojadiza.",
    uso: ["Arma a 1 mano", "Arrojadiza"],
    modos: [
      { etiqueta: "Simple", dificultad: -2, formulaDanio: "Fue+4", categoriaDanio: "Letal" },
      { etiqueta: "Estándar", dificultad: -2, formulaDanio: "Fue+6", categoriaDanio: "Letal" },
    ],
    efectos: "Ignora 2 puntos de blindaje · Hemorragia (1d8 turnos) · Crítico: Impacto Estructural (10)",
    pesoKg: 5,
    rareza: "Singular",
    coste: 18000,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
      {
        tipo: "numerico",
        afecta: { modo: "accion_existente", id: "ataque_melee" },
        mecanismo: "ajuste_fijo",
        estado: "bloqueado",
        bloqueoPor: "pregunta 29",
      },
      {
        tipo: "texto",
        afecta: { modo: "accion_existente", id: "ataque_melee" },
        mecanismo: "nota_fija",
        estado: "bloqueado",
        bloqueoPor: "C13",
      },
      {
        tipo: "accion",
        afecta: { modo: "accion_nueva", id: "salvacion_retroceso_entropico" },
        mecanismo: "accion_equipo",
        estado: "pendiente",
      },
    ],
  },
  {
    familia: "armaMelee",
    id: "kerzul_lanza_larga",
    label: "Lanza Larga de Kerzul",
    resumen: "Lanza de kerzul a dos manos, con alcance.",
    descripcion: "Lanza de kerzul a dos manos, con alcance.",
    uso: ["Arma a 2 manos", "Alcance 4"],
    modos: [
      { etiqueta: "Simple", dificultad: -2, formulaDanio: "Fue+4", categoriaDanio: "Letal" },
      { etiqueta: "Estándar", dificultad: -2, formulaDanio: "Fue+6", categoriaDanio: "Letal" },
    ],
    efectos: "Ignora 2 puntos de blindaje · Hemorragia (1d8 turnos) · Crítico: Impacto Estructural (10)",
    pesoKg: 9,
    rareza: "Singular",
    coste: 22000,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
      {
        tipo: "numerico",
        afecta: { modo: "accion_existente", id: "ataque_melee" },
        mecanismo: "ajuste_fijo",
        estado: "bloqueado",
        bloqueoPor: "pregunta 29",
      },
      {
        tipo: "texto",
        afecta: { modo: "accion_existente", id: "ataque_melee" },
        mecanismo: "nota_fija",
        estado: "bloqueado",
        bloqueoPor: "C13",
      },
      {
        tipo: "accion",
        afecta: { modo: "accion_nueva", id: "salvacion_retroceso_entropico" },
        mecanismo: "accion_equipo",
        estado: "pendiente",
      },
    ],
  },
  {
    familia: "armaMelee",
    id: "kerzul_martillo_enastado",
    label: "Martillo Enastado de Kerzul",
    resumen: "Martillo de kerzul a dos manos, el que más derriba y aturde.",
    descripcion: "Martillo de kerzul a dos manos, de gran tamaño.",
    uso: ["Arma a 2 manos"],
    modos: [
      { etiqueta: "Estándar", dificultad: -4, formulaDanio: "Fue+8", categoriaDanio: "Letal" },
      { etiqueta: "Compleja", dificultad: -4, formulaDanio: "Fue+11", categoriaDanio: "Letal" },
    ],
    efectos: "Ignora 4 puntos de blindaje · Derribo (14) · Aturdimiento (12) · Crítico: Impacto Estructural (16)",
    pesoKg: 18,
    rareza: "Singular",
    coste: 48000,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
      {
        tipo: "accion",
        afecta: { modo: "accion_nueva", id: "derribo_arma_mecanica" },
        mecanismo: "accion_equipo",
        estado: "bloqueado",
        bloqueoPor: "Derribado existe (estados.ts:312) pero ningún crítico de arma lo dispara — falta el mecanismo de trigger, no el estado",
      },
      {
        tipo: "numerico",
        afecta: { modo: "accion_existente", id: "ataque_melee" },
        mecanismo: "ajuste_fijo",
        estado: "bloqueado",
        bloqueoPor: "pregunta 29",
      },
      {
        tipo: "texto",
        afecta: { modo: "accion_existente", id: "ataque_melee" },
        mecanismo: "nota_fija",
        estado: "bloqueado",
        bloqueoPor: "C13",
      },
      {
        tipo: "accion",
        afecta: { modo: "accion_nueva", id: "salvacion_retroceso_entropico" },
        mecanismo: "accion_equipo",
        estado: "pendiente",
      },
    ],
  },
  {
    familia: "armaMelee",
    id: "kerzul_alabarda",
    label: "Alabarda de Kerzul",
    resumen: "Alabarda de kerzul a dos manos, con alcance.",
    descripcion: "Alabarda de kerzul a dos manos, con alcance y filo pesado.",
    uso: ["Arma a 2 manos", "Alcance 4"],
    modos: [
      { etiqueta: "Estándar", dificultad: -3, formulaDanio: "Fue+6", categoriaDanio: "Letal" },
      { etiqueta: "Compleja", dificultad: -3, formulaDanio: "Fue+8", categoriaDanio: "Letal" },
    ],
    efectos: "Ignora 4 puntos de blindaje · Hemorragia (1d12 turnos) · Crítico: Impacto Estructural (12)",
    pesoKg: 12,
    rareza: "Singular",
    coste: 38000,
    defensa: null,
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
      {
        tipo: "numerico",
        afecta: { modo: "accion_existente", id: "ataque_melee" },
        mecanismo: "ajuste_fijo",
        estado: "bloqueado",
        bloqueoPor: "pregunta 29",
      },
      {
        tipo: "texto",
        afecta: { modo: "accion_existente", id: "ataque_melee" },
        mecanismo: "nota_fija",
        estado: "bloqueado",
        bloqueoPor: "C13",
      },
      {
        tipo: "accion",
        afecta: { modo: "accion_nueva", id: "salvacion_retroceso_entropico" },
        mecanismo: "accion_equipo",
        estado: "pendiente",
      },
    ],
  },
  {
    familia: "armaMelee",
    id: "kerzul_escudo",
    label: "Escudo de Kerzul",
    resumen: "El único escudo de kerzul: blindaje y aguante muy por encima de los convencionales.",
    descripcion: "Escudo de kerzul a una mano, con la misma resistencia extrema del material.",
    uso: ["Arma a 1 mano"],
    modos: [{ etiqueta: "Estándar", dificultad: -2, formulaDanio: "Fue+4", categoriaDanio: "Letal" }],
    efectos: "Ignora 2 puntos de blindaje · Derribo (11) · Aturdimiento (9) · Crítico: Impacto Estructural (12)",
    pesoKg: 4,
    rareza: "Singular",
    coste: 37000,
    defensa: { cobertura: 2, blindaje: 16, puntosGolpe: 60 },
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "ad_hoc" },
      {
        tipo: "accion",
        afecta: { modo: "accion_nueva", id: "derribo_arma_mecanica" },
        mecanismo: "accion_equipo",
        estado: "bloqueado",
        bloqueoPor: "Derribado existe (estados.ts:312) pero ningún crítico de arma lo dispara — falta el mecanismo de trigger, no el estado",
      },
      {
        tipo: "numerico",
        afecta: { modo: "accion_existente", id: "ataque_melee" },
        mecanismo: "ajuste_fijo",
        estado: "bloqueado",
        bloqueoPor: "pregunta 29",
      },
      {
        tipo: "texto",
        afecta: { modo: "accion_existente", id: "ataque_melee" },
        mecanismo: "nota_fija",
        estado: "bloqueado",
        bloqueoPor: "C13",
      },
      {
        tipo: "accion",
        afecta: { modo: "accion_nueva", id: "salvacion_retroceso_entropico" },
        mecanismo: "accion_equipo",
        estado: "pendiente",
      },
      // Hereda la misma duda de defensa que los Escudos normales.
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "pregunta 29" },
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
      {
        tipo: "texto",
        afecta: { modo: "objetivo_tercero", id: "ataque_contra_portador_escudo" },
        mecanismo: "nota_fija",
        estado: "pendiente",
      },
    ],
  },
];

export const ARMAS_MELEE: ArmaMelee[] = [
  ...PELEA,
  ...ARMAS_CORTAS,
  ...ARMAS_DE_ASTA,
  ...ESCUDOS,
  ...ESPADAS_Y_DAGAS,
  ...FLAGELOS,
  ...ARMAS_MECANICAS,
  ...ARMAS_MELEE_KERZUL,
];
