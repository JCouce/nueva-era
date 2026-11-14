// Armas Impulsoras (bloque "Otras Armas a Distancia" — fuente: docs/fuente/equipamiento.md,
// "Armas Impulsoras", foto de Drive 2026-10-23). Especialidad Armas Impulsoras (Combate a
// Distancia, catalog/especialidadesArma.ts).
//
// Forma de ArmaFuego (`tipo: "arma_impulsora"`), no un tipo propio como el Armamento Pesado:
// la tabla trae lo mismo que la de un arma de fuego (acción, dificultad, daño, alcance corto/
// medio/largo, munición, mejoras), así que el ataque, los tramos, la munición y las mejoras
// salen del mismo código (combate.ts, tiradaDeArmaFuego). Dos diferencias, en el motor:
//   - Daño del Arco "1/2 Fue + 8": `danioFuerza: "mitad"`, resuelto con la Fuerza efectiva.
//   - "La munición de las armas impulsoras puede llevar mejoras de munición especial sin que
//     el arma necesite estar adaptada": `municionEspecialSinAdaptar`. El selector de munición
//     sale con el stock de munición especial de la ficha, sin adaptador instalado (combate.ts,
//     municionesDeArma), y la Tienda deja comprarla (armasHabilitadasPara, recursos.ts).
//   - Munición propia (td-01, usuario 2026-11-14): flechas el Arco y virotes la Ballesta, al
//     precio de la Calibre Estándar (catalog/municion.ts), sin mezclarse con las balas.
//   - Mejoras (td-03, usuario 2026-11-14): solo miras, Puntero Láser y Linterna
//     (`mejorasPermitidas`). Fuera Silenciador (ya son silenciosas), Sistema de Retroceso y
//     adaptadores de munición (no les hacen falta). Una ya instalada que no se admite se queda,
//     sin aportar nada (mejorasNoAdmitidas, rules/equipo.ts).
//
// Características generales del bloque, iguales para las dos: empleo a dos manos (`empleo`),
// desenfundado como acción estándar y recarga especial (la de cada arma va en `recarga`). Las dos
// salen como líneas del ataque (T5c, rules/tipoAccion.ts).
//
// TODO(revisar): los tramos de distancia (+4/+2/0/−2) son los de "Armas de Fuego" en la fuente;
// se aplican igual a estas porque traen corta/media/larga, sin regla propia.
import type { ArmaFuego } from "./armasFuego";
import { enCritico, hemorragiaDado } from "./efectosArma";

// td-03: las miras (la Telescópica), el Puntero Láser y la Linterna.
const MEJORAS_IMPULSORAS = ["mira_telescopica", "puntero_laser", "linterna"] as const;

const DESCRIPCION_COMUN =
  "Empleo a dos manos. Desenfundar es acción estándar. Su munición admite munición especial " +
  "sin adaptar el arma.";

export const ARMAS_IMPULSORAS: ArmaFuego[] = [
  {
    familia: "arma",
    id: "arco_tactico",
    label: "Arco Táctico",
    resumen: "Arco silencioso que pega más cuanto más fuerte es quien lo tensa.",
    descripcion: `${DESCRIPCION_COMUN} Se recarga como reacción o acción simple.`,
    empleo: "dos manos",
    tipo: "arma_impulsora",
    // TODO(revisar): "1/2 Fue" sin redondeo en la fuente; va hacia abajo, como el resto de
    // mitades sin regla (S28, pregunta 39 de docs/sistema.md).
    modos: [{ etiqueta: "Simple", dificultad: -2, danio: 8, danioFuerza: "mitad", categoriaDanio: "Letal" }],
    alcance: { corta: 30, media: 120, larga: 260 },
    municion: 1,
    tipoMunicion: "flechas",
    municionEspecialSinAdaptar: true,
    mejorasAdmitidas: 2,
    mejorasPermitidas: MEJORAS_IMPULSORAS,
    especial: "Crítico de Hemorragia (1d6 turnos) · Silencioso",
    recarga: ["simple", "reaccion"],
    pesoKg: 1.8,
    rareza: "Poco Habitual",
    coste: 250,
    modificadores: [],
    efectosObjetivo: [enCritico(hemorragiaDado(6))],
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial (crítico, silencioso); la recarga, línea del ataque (T5c)
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // munición especial sin adaptador
      { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "hemorragia" }, mecanismo: "nota_fija", estado: "construido" }, // efectosObjetivo: aviso en el resultado (T3a)
    ],
  },
  {
    familia: "arma",
    id: "ballesta_pro_ue",
    label: "Ballesta Pro UE",
    resumen: "Ballesta silenciosa de largo alcance con cargador de seis virotes.",
    descripcion: `${DESCRIPCION_COMUN} Se recarga como acción estándar.`,
    empleo: "dos manos",
    tipo: "arma_impulsora",
    modos: [{ etiqueta: "Simple", dificultad: -2, danio: 10, categoriaDanio: "Letal" }],
    alcance: { corta: 40, media: 100, larga: 400 },
    municion: 6,
    tipoMunicion: "virotes",
    municionEspecialSinAdaptar: true,
    mejorasAdmitidas: 3,
    mejorasPermitidas: MEJORAS_IMPULSORAS,
    especial: "Crítico de Hemorragia (1d6 turnos) · Silencioso",
    recarga: ["estandar"],
    pesoKg: 3.2,
    rareza: "Poco Habitual",
    coste: 500,
    modificadores: [],
    efectosObjetivo: [enCritico(hemorragiaDado(6))],
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial (crítico, silencioso); la recarga, línea del ataque (T5c)
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // munición especial sin adaptador
      { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "hemorragia" }, mecanismo: "nota_fija", estado: "construido" }, // efectosObjetivo: aviso en el resultado (T3a)
    ],
  },
];
