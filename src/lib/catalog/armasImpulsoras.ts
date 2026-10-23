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
//     el arma necesite estar adaptada": el selector de munición sale con el stock de munición
//     especial de la ficha, sin adaptador instalado (combate.ts, municionesDeArma).
//
// Características generales del bloque, iguales para las dos: empleo a dos manos (`empleo`),
// desenfundado como acción estándar y recarga especial (la de cada arma va en `especial`). El
// motor no modela desenfundar ni recargar (como en el resto de armas): van como texto.
//
// TODO(revisar): la fuente no trae munición propia (flechas, virotes) ni su precio; "Munición
// Calibre Estándar" es "para todas las armas de fuego y ametralladoras". Hasta que Murillo la
// dé, usan el recurso genérico de balas y su cargador de la Tienda (recursos.ts).
// TODO(revisar): los tramos de distancia (+4/+2/0/−2) son los de "Armas de Fuego" en la fuente;
// se aplican igual a estas porque traen corta/media/larga, sin regla propia.
// TODO(revisar): qué mejoras de arma admiten (columna "Mejoras": 2 y 3). Hoy entran las de
// compatibilidad "todas" y las que solo excluyen Plasma (Puntero Láser, Linterna, Silenciador,
// Sistema de Retroceso, adaptadores de munición), aunque alguna no tenga sentido en un arco.
import type { ArmaFuego } from "./armasFuego";

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
    mejorasAdmitidas: 2,
    especial: "Recarga: reacción o acción simple · Crítico de Hemorragia (1d6 turnos) · Silencioso",
    pesoKg: 1.8,
    rareza: "Poco Habitual",
    coste: 250,
    modificadores: [],
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial (recarga, crítico, silencioso)
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // munición especial sin adaptador
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
    mejorasAdmitidas: 3,
    especial: "Recarga: acción estándar · Crítico de Hemorragia (1d6 turnos) · Silencioso",
    pesoKg: 3.2,
    rareza: "Poco Habitual",
    coste: 500,
    modificadores: [],
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_fuego" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // tramo de distancia
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "nota_fija", estado: "ad_hoc" }, // arma.especial (recarga, crítico, silencioso)
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "gate_instalacion", arbitraje: "blando", estado: "ad_hoc" }, // aviso de munición insuficiente
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" }, // munición especial sin adaptador
    ],
  },
];
