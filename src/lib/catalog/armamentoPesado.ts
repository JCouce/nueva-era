// Catálogo de Armamento Pesado (bloque 3 de "Otras Armas a Distancia" —
// fuente: docs/equipamiento.md, sección "Armamento Pesado", líneas 806-820).
//
// No encaja en ArmaFuego: ahí la dificultad varía por TRAMO de distancia
// (corta/media/larga, mecanismo común a toda arma de fuego en combate.ts) y
// esta tabla da un único "Alcance" en metros y una única "Dif." fija por
// arma — no hay tramos que elegir. Tipo propio: una dificultad fija por
// arma, mecanizada en lib/rules/combate.ts como `ajustesFijos` (mecanismo 2
// de docs/modificadores-tiradas.md — automático, sin elección del jugador de
// por medio, así que NO es condicionModo/opción como los modos de disparo
// de un arma de fuego).
//
// "Características generales" del documento (empleo a dos manos,
// desenfundado y recarga como acción compleja, ataque en área) son iguales
// para las 5 y no dependen de ninguna pieza en concreto — el motor no
// modela economía de acciones (desenfundar/recargar) todavía, así que se
// quedan en `descripcion`, no en un campo por arma.
//
// `mejorasAdmitidas` es informativo (columna "Mejoras" del documento), NO
// está enganchado a validarInstalacion: el catálogo de Mejoras de Arma
// (MEJORAS_ARMA) filtra compatibilidad por TipoArma (fusil_asalto,
// ametralladora...) y armaPesada no es una de esas familias — extender el
// sistema de mejoras de arma a armamento pesado es una decisión de diseño
// aparte que este bloque no pedía, así que se deja documentado, no forzado.
//
// Lanzagranadas (pesado): igual que el Lanzagranadas Integrado (mejora de
// arma en catalog/equipo.ts) pero como arma independiente en vez de algo
// instalado dentro de un Fusil de Asalto — mismo tratamiento en combate.ts
// (daño según la granada cargada de MUNICION_GRANADA, dificultad fija).
import type { Modificador } from "../rules/modificadores";
import type { Rareza } from "./equipo";
import type { MotorMetadata } from "../rules/motor";

export type ArmaPesada = {
  familia: "armaPesada";
  id: string;
  label: string;
  resumen: string;
  descripcion: string;
  accion: string; // "Compleja" | "Estándar" — la acción para disparar
  dificultad: number;
  danio: number | null; // null: Lanzagranadas, el daño depende de la granada cargada
  categoriaDanio: string | null;
  alcanceM: number | null; // null: Lanzallamas Ligero, sin alcance en la tabla (arma de área, no de tiro)
  cargador: number;
  mejorasAdmitidas: number;
  efectos: string;
  pesoKg: number;
  pesoNota: string | null; // matiz que no cabe en un número, p.ej. "10 kg descargado"
  rareza: Rareza;
  coste: number;
  modificadores: Modificador[];
  motor?: MotorMetadata[]; // docs/motor.md
};

export const ARMAMENTO_PESADO: ArmaPesada[] = [
  {
    familia: "armaPesada",
    id: "lanzallamas_ligero",
    label: "Lanzallamas Ligero",
    resumen: "Cono de fuego de área: sin alcance de tiro, quema todo lo que pilla cerca.",
    descripcion:
      "Empleo a dos manos. Desenfundar y recargar son acción compleja. Ataque en área: a diferencia " +
      "del resto de armamento pesado no tiene un alcance de tiro en metros, su daño cubre la zona " +
      "frente al personaje.",
    accion: "Compleja",
    dificultad: 0,
    danio: 10,
    categoriaDanio: "Fuego",
    alcanceM: null,
    cargador: 30,
    mejorasAdmitidas: 0,
    efectos: "Área 2x20 (Esquiva 9) · Efecto Llamarada (12)",
    pesoKg: 20,
    pesoNota: "10 kg descargado",
    rareza: "Común",
    coste: 1000,
    modificadores: [],
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_pesado" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_pesado" }, mecanismo: "ajuste_fijo", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_pesado" }, mecanismo: "nota_fija", estado: "ad_hoc" },
    ],
  },
  {
    familia: "armaPesada",
    id: "lanzacohetes_rt",
    label: "Lanzacohetes RT",
    resumen: "Cohetes de área a media-larga distancia, con un solo cohete en cargador.",
    descripcion: "Empleo a dos manos. Desenfundar y recargar son acción compleja. Ataque en área.",
    accion: "Compleja",
    dificultad: -3,
    danio: 14,
    categoriaDanio: "Letal",
    alcanceM: 450,
    cargador: 1,
    mejorasAdmitidas: 2,
    efectos: "Área 6x6 (Esquiva 9) · Efecto Aturdimiento (9)",
    pesoKg: 10,
    pesoNota: "7 kg descargado",
    rareza: "Común",
    coste: 3000,
    modificadores: [],
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_pesado" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_pesado" }, mecanismo: "ajuste_fijo", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_pesado" }, mecanismo: "nota_fija", estado: "ad_hoc" },
    ],
  },
  {
    familia: "armaPesada",
    id: "lanzagranadas_pesado",
    label: "Lanzagranadas",
    resumen: "Versión independiente del lanzagranadas: carga cualquier granada del catálogo.",
    descripcion:
      "Empleo a dos manos. Desenfundar y recargar son acción compleja. Ataque en área. A diferencia " +
      "del Lanzagranadas Integrado (mejora de Fusil de Asalto, ver catalog/equipo.ts) es un arma " +
      "independiente con cargador propio — mismo criterio de daño según la granada elegida.",
    accion: "Estándar",
    dificultad: -2,
    danio: null,
    categoriaDanio: null,
    alcanceM: 250,
    cargador: 6,
    mejorasAdmitidas: 2,
    efectos: "Según la granada cargada — área y efecto de MUNICION_GRANADA",
    pesoKg: 8,
    pesoNota: null,
    rareza: "Poco Habitual",
    coste: 12000,
    modificadores: [],
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_pesado" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_pesado" }, mecanismo: "ajuste_fijo", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_pesado" }, mecanismo: "nota_fija", estado: "ad_hoc" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_pesado" }, mecanismo: "eleccion_jugador", estado: "construido" },
    ],
  },
  {
    familia: "armaPesada",
    id: "lanzamisiles_at",
    label: "Lanzamisiles AT",
    resumen: "El de mayor alcance y coste: pensado contra blindaje pesado.",
    descripcion: "Empleo a dos manos. Desenfundar y recargar son acción compleja. Ataque en área.",
    accion: "Compleja",
    dificultad: -3,
    danio: 16,
    categoriaDanio: "Letal",
    alcanceM: 1500,
    cargador: 1,
    mejorasAdmitidas: 2,
    efectos: "Área 8x8 (Esquiva 9) · Efecto Aturdimiento (9)",
    pesoKg: 18,
    pesoNota: "8 kg sin misil",
    rareza: "Extraño",
    coste: 105000,
    modificadores: [],
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_pesado" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_pesado" }, mecanismo: "ajuste_fijo", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_pesado" }, mecanismo: "nota_fija", estado: "ad_hoc" },
    ],
  },
  {
    familia: "armaPesada",
    id: "canon_plasma",
    label: "Cañón de Plasma",
    resumen: "El armamento pesado más raro y caro: daño de plasma con doble efecto de área.",
    descripcion: "Empleo a dos manos. Desenfundar y recargar son acción compleja. Ataque en área.",
    accion: "Estándar",
    dificultad: -2,
    danio: 20,
    categoriaDanio: "Plasma",
    alcanceM: 400,
    cargador: 12,
    mejorasAdmitidas: 2,
    efectos: "Área 8x8 (Esquiva 9) · Efecto Shock (10) · Efecto Llamarada (10)",
    pesoKg: 9,
    pesoNota: null,
    rareza: "Muy Extraño",
    coste: 210000,
    modificadores: [],
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_pesado" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_pesado" }, mecanismo: "ajuste_fijo", estado: "construido" },
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_pesado" }, mecanismo: "nota_fija", estado: "ad_hoc" },
    ],
  },
];

export function armaPesadaPorId(id: string): ArmaPesada | null {
  return ARMAMENTO_PESADO.find((a) => a.id === id) ?? null;
}
