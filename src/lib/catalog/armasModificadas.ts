// Armas Modificadas (fuente: docs/fuente/equipamiento.md, "Armas Modificadas"):
// Electrificantes, Térmicas, de Plasma y de Nanofilamento.
//
// No son piezas: no se instalan ni ocupan ranura, son "creaciones especiales sobre
// la base de un arma" (usuario, 2026-10-23, S87). Viven como
// `PiezaEquipada.modificaciones` del arma melee que transforman. Cada tabla de la
// fuente va por tramo de "Daño Modelo Básico" (2 / 3 a 6 / 7 o +); el tramo, el
// coste, la rareza, el peso y el daño resultantes los calcula
// lib/rules/armasModificadas.ts — aquí solo los datos tal cual.
import type { Rareza } from "./equipo";
import type { TipoDanio } from "./tiposDanio";
import type { MotorMetadata } from "../rules/motor";

export const MODIFICACIONES_ARMA_IDS = ["electrificante", "termica", "plasma", "nanofilamento"] as const;
export type ModificacionArmaId = (typeof MODIFICACIONES_ARMA_IDS)[number];

// Una fila de la tabla de la fuente, por tramo.
export type TramoModificacion = {
  // "+N <tipo>" de la columna Daño Adicional.
  danioAdicional: number;
  // Efecto al impactar (Shock, Llamarada, Hemorragia): a la nota del golpe.
  efecto: string;
  // "Crítico: …" de la misma columna: al efecto de crítico del golpe.
  efectoCritico?: string;
  // "Ignora N puntos de Blindaje" (Nanofilamento).
  ignoraBlindaje?: number;
  // "Básico x N".
  multiplicadorCoste: number;
  rareza: Rareza;
};

export type ModificacionArma = {
  id: ModificacionArmaId;
  label: string;
  // Cómo entra en el nombre del arma: "de Plasma" va detrás del nombre; los adjetivos
  // ("Térmica", "Electrificante") se juntan al final.
  nombre: { tipo: "de"; texto: string } | { tipo: "adjetivo"; masculino: string; femenino: string };
  descripcion: string;
  // Tipo del daño adicional. Null en Nanofilamento: su +1 es del mismo tipo que el golpe.
  tipoAdicional: TipoDanio | null;
  // "Convierten su daño básico en daño por …" (Térmica, Plasma).
  convierteBase?: TipoDanio;
  // "El daño completo … es grave" (Nanofilamento): categoría de todo el golpe.
  categoriaGolpe?: string;
  // "Exclusiva para armas de filo" (Nanofilamento): ArmaMelee.filo.
  soloFilo?: true;
  // No se combina con ninguna otra modificación (Plasma; usuario, 2026-10-23).
  exclusiva?: true;
  // "Peso Adicional", en % del peso del arma básica.
  pesoPorcentaje: number;
  // Índice 0: "2", 1: "3 a 6", 2: "7 o +".
  tramos: readonly [TramoModificacion, TramoModificacion, TramoModificacion];
  motor: MotorMetadata[];
};

// Lo que comparten las cuatro: el daño extra (y la conversión de tipo o de categoría)
// lo calcula tiradaDeArmaMelee/tiradaLanzarArmaMelee al montar el golpe y sale
// desglosado por tipo en el resultado; el efecto al impactar va a la nota del golpe.
const MOTOR_DANIO_Y_EFECTO: MotorMetadata[] = [
  { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
  { tipo: "numerico", afecta: { modo: "accion_existente", id: "lanzar_arma_melee" }, mecanismo: "accion_equipo", estado: "construido" },
  { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "construido" },
];

export const ARMAS_MODIFICADAS: readonly ModificacionArma[] = [
  {
    id: "electrificante",
    label: "Electrificante",
    nombre: { tipo: "adjetivo", masculino: "Electrificante", femenino: "Electrificante" },
    descripcion:
      "Supercondensadores en la empuñadura y microfilamentos superconductores en la superficie de impacto: al contacto, descarga de arcos voltaicos. Daño adicional eléctrico y efecto de shock.",
    tipoAdicional: "electrico",
    pesoPorcentaje: 25,
    tramos: [
      { danioAdicional: 1, efecto: "Shock (6)", multiplicadorCoste: 5, rareza: "Común" },
      { danioAdicional: 2, efecto: "Shock (7)", multiplicadorCoste: 10, rareza: "Poco Habitual" },
      { danioAdicional: 3, efecto: "Shock (8)", multiplicadorCoste: 15, rareza: "Extraño" },
    ],
    motor: MOTOR_DANIO_Y_EFECTO,
  },
  {
    id: "termica",
    label: "Térmica",
    nombre: { tipo: "adjetivo", masculino: "Térmico", femenino: "Térmica" },
    descripcion:
      "Micro-resistencias de tungsteno en el área de impacto que llevan el filo a la incandescencia. Convierten su daño básico en daño por fuego.",
    tipoAdicional: "fuego",
    convierteBase: "fuego",
    pesoPorcentaje: 35,
    tramos: [
      { danioAdicional: 1, efecto: "Llamarada (6)", multiplicadorCoste: 100, rareza: "Extraño" },
      { danioAdicional: 2, efecto: "Llamarada (7)", multiplicadorCoste: 125, rareza: "Extraño" },
      { danioAdicional: 3, efecto: "Llamarada (8)", multiplicadorCoste: 150, rareza: "Muy Extraño" },
    ],
    motor: MOTOR_DANIO_Y_EFECTO,
  },
  {
    id: "plasma",
    label: "Plasma",
    nombre: { tipo: "de", texto: "de Plasma" },
    descripcion:
      "Un haz de gas ionizado supercaliente, contenido magnéticamente, envuelve la superficie de impacto. Convierten su daño básico en daño por plasma y causan shock y llamarada.",
    tipoAdicional: "plasma",
    convierteBase: "plasma",
    exclusiva: true,
    pesoPorcentaje: 40,
    tramos: [
      { danioAdicional: 1, efecto: "Shock y Llamarada (5)", efectoCritico: "Fusión (9)", multiplicadorCoste: 200, rareza: "Muy Extraño" },
      { danioAdicional: 2, efecto: "Shock y Llamarada (6)", efectoCritico: "Fusión (11)", multiplicadorCoste: 225, rareza: "Muy Extraño" },
      { danioAdicional: 3, efecto: "Shock y Llamarada (7)", efectoCritico: "Fusión (13)", multiplicadorCoste: 250, rareza: "Muy Extraño" },
    ],
    motor: [
      ...MOTOR_DANIO_Y_EFECTO,
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "construido" },
    ],
  },
  {
    id: "nanofilamento",
    label: "Nanofilamento",
    nombre: { tipo: "de", texto: "de Nanofilamento" },
    descripcion:
      "Borde de corte de aleaciones de alta tensión a escala nanométrica: separa los enlaces de la materia. Exclusiva para armas de filo. Daño completo grave, hemorragia y crítico de hemorragia exanguinante; ignora parte del blindaje.",
    tipoAdicional: null,
    categoriaGolpe: "Grave",
    soloFilo: true,
    pesoPorcentaje: 0,
    tramos: [
      {
        danioAdicional: 1,
        efecto: "Hemorragia (1d6 turnos)",
        efectoCritico: "Hemorragia Exanguinante",
        ignoraBlindaje: 2,
        multiplicadorCoste: 250,
        rareza: "Extraño",
      },
      {
        danioAdicional: 1,
        efecto: "Hemorragia (1d8 turnos)",
        efectoCritico: "Hemorragia Exanguinante",
        ignoraBlindaje: 3,
        multiplicadorCoste: 300,
        rareza: "Muy Extraño",
      },
      {
        danioAdicional: 1,
        efecto: "Hemorragia (1d10 turnos)",
        efectoCritico: "Hemorragia Exanguinante",
        ignoraBlindaje: 4,
        multiplicadorCoste: 350,
        rareza: "Muy Extraño",
      },
    ],
    motor: [
      ...MOTOR_DANIO_Y_EFECTO,
      // Crítico de Hemorragia Exanguinante: al efecto de crítico del golpe.
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "construido" },
      // "Ignora N puntos de blindaje": aviso en el resultado del daño, como el kerzul.
      { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "construido" },
    ],
  },
];

const POR_ID = new Map<ModificacionArmaId, ModificacionArma>(ARMAS_MODIFICADAS.map((m) => [m.id, m]));

export function modificacionArmaPorId(id: ModificacionArmaId): ModificacionArma {
  return POR_ID.get(id)!;
}
