// Munición de granada — fuente: docs/equipamiento.md, sección "Granadas"
// (líneas 822-842). Familia equipable propia (bloque 3 de "Otras Armas a
// Distancia", junto con catalog/armamentoPesado.ts): se compra/equipa igual
// que un Consumible (precio plano, sin host) y genera su propia tirada de
// "Lanzar [Granada]" en lib/rules/combate.ts — Potencia + Atletismo,
// ajustesFijos con `dificultadArrojada` como único ajuste.
//
// `dificultadArrojada` y ALCANCE_ARROJADA son los de lanzarla A MANO (acción
// simple, propia); el Lanzagranadas Integrado y el Lanzagranadas pesado
// (catalog/equipo.ts / catalog/armamentoPesado.ts) NO usan ninguno de los
// dos — su propio texto fija su propia dificultad y alcance sea cual sea la
// granada cargada.
//
// `pesoKg: null` en todas: EQUIP marca la columna Peso con una "I" para las
// granadas, igual que varias armas melee (ver catalog/armasMelee.ts) — no se
// ha podido determinar qué significa, así que se transcribe como null en vez
// de inventarse un valor.
import type { Rareza } from "./equipo";
import type { MotorMetadata } from "../rules/motor";

export const ALCANCE_ARROJADA = "Potencia × 10 m";

// Las 14 granadas comparten exactamente el mismo MotorMetadata (docs/motor.md):
// solo cambian los valores de sus propios campos (dificultadArrojada, danio,
// areaEfecto...), nunca la clasificación. `tiradaDeGranada` (combate.ts) genera
// la tirada "Lanzar X" y vuelca areaEfecto a su nota — construido. Cuando la
// misma granada se carga en un Lanzagranadas (integrado o pesado),
// `tiradaDeLanzagranadas`/`tiradaDeArmamentoPesado` leen danio/categoriaDanio
// para el modo de esa tirada, y desde 2026-09-27 también areaEfecto — vuelca
// a la `nota` de la opción elegida en el selector "Modo de disparo"
// (condicionModo, combate.ts), no a un texto fijo de la Accion: por eso el
// mecanismo es eleccion_jugador, no nota_fija (el jugador elige qué granada
// carga al tirar, y ESA nota es la que se pinta).
const MOTOR_GRANADA: MotorMetadata[] = [
  { tipo: "accion", afecta: { modo: "accion_nueva", id: "lanzar_granada" }, mecanismo: "accion_equipo", estado: "construido" },
  { tipo: "numerico", afecta: { modo: "accion_existente", id: "lanzar_granada" }, mecanismo: "ajuste_fijo", estado: "construido" },
  { tipo: "texto", afecta: { modo: "accion_existente", id: "lanzar_granada" }, mecanismo: "nota_fija", estado: "ad_hoc" },
  { tipo: "texto", afecta: { modo: "accion_existente", id: "lanzagranadas_integrado" }, mecanismo: "eleccion_jugador", estado: "construido" },
  { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_pesado" }, mecanismo: "eleccion_jugador", estado: "construido" },
];

export type MunicionGranada = {
  familia: "granada";
  id: string;
  label: string;
  dificultadArrojada: number;
  danio: number;
  categoriaDanio: string | null; // null: la granada no hace daño directo, solo área/efecto
  areaEfecto: string;
  pesoKg: null;
  rareza: Rareza;
  coste: number;
  motor?: MotorMetadata[]; // docs/motor.md
};

export const MUNICION_GRANADA: MunicionGranada[] = [
  {
    familia: "granada",
    id: "granada_casera",
    label: "Granada Casera",
    dificultadArrojada: -2,
    danio: 12,
    categoriaDanio: "Letal",
    areaEfecto: "Área 4x4 (Esquiva 8)",
    pesoKg: null,
    rareza: "Común",
    coste: 20,
    motor: MOTOR_GRANADA,
  },
  {
    familia: "granada",
    id: "granada_fragmentacion",
    label: "Granada de Fragmentación",
    dificultadArrojada: -2,
    danio: 14,
    categoriaDanio: "Letal",
    areaEfecto: "Área 6x6 (Esquiva 8) · Efecto Aturdimiento (6)",
    pesoKg: null,
    rareza: "Común",
    coste: 50,
    motor: MOTOR_GRANADA,
  },
  {
    familia: "granada",
    id: "granada_aturdidora",
    label: "Granada Aturdidora",
    dificultadArrojada: -2,
    danio: 0,
    categoriaDanio: null,
    areaEfecto: "Área 6x6 (Esquiva 8) · Efecto Aturdimiento (10)",
    pesoKg: null,
    rareza: "Común",
    coste: 100,
    motor: MOTOR_GRANADA,
  },
  {
    familia: "granada",
    id: "granada_cegadora",
    label: "Granada Cegadora",
    dificultadArrojada: -2,
    danio: 0,
    categoriaDanio: null,
    areaEfecto: "Área 6x6 (Esquiva 8) · Efecto Ceguera (11)",
    pesoKg: null,
    rareza: "Común",
    coste: 100,
    motor: MOTOR_GRANADA,
  },
  {
    familia: "granada",
    id: "granada_humo",
    label: "Granada de Humo",
    dificultadArrojada: -2,
    danio: 0,
    categoriaDanio: null,
    areaEfecto: "Área 8x8 · 10 turnos · Cobertura nivel 2",
    pesoKg: null,
    rareza: "Común",
    coste: 30,
    motor: MOTOR_GRANADA,
  },
  {
    familia: "granada",
    id: "granada_pem",
    label: "Granada PEM",
    dificultadArrojada: -2,
    danio: 0,
    categoriaDanio: null,
    areaEfecto: "Área 6x6 (Esquiva 8) · Efecto Shock (11): solo afecta a sistemas y sintéticos",
    pesoKg: null,
    rareza: "Común",
    coste: 100,
    motor: MOTOR_GRANADA,
  },
  {
    familia: "granada",
    id: "granada_gas_toxico",
    label: "Granada Gas Tóxico",
    dificultadArrojada: -2,
    danio: 0,
    categoriaDanio: null,
    areaEfecto: "Área 8x8 (Esquiva 8) · 10 turnos · Cobertura nivel 1 · Efecto Veneno (11) o Parálisis (11)",
    pesoKg: null,
    rareza: "Poco Habitual",
    coste: 150,
    motor: MOTOR_GRANADA,
  },
  {
    familia: "granada",
    id: "bomba_sonica",
    label: "Bomba Sónica",
    dificultadArrojada: -2,
    danio: 12,
    categoriaDanio: "Sónico",
    areaEfecto: "Área 6x6 (Esquiva 8) · Efecto Sordera y Aturdimiento (9)",
    pesoKg: null,
    rareza: "Poco Habitual",
    coste: 150,
    motor: MOTOR_GRANADA,
  },
  {
    familia: "granada",
    id: "granada_incendiaria",
    label: "Granada Incendiaria",
    dificultadArrojada: -2,
    danio: 14,
    categoriaDanio: "Fuego",
    areaEfecto: "Área 6x6 (Esquiva 8) · Efecto Llamarada (8)",
    pesoKg: null,
    rareza: "Poco Habitual",
    coste: 150,
    motor: MOTOR_GRANADA,
  },
  {
    familia: "granada",
    id: "granada_fragmentacion_toxica",
    label: "Granada de Fragmentación Tóxica",
    dificultadArrojada: -2,
    danio: 14,
    categoriaDanio: "Letal",
    areaEfecto: "Área 6x6 (Esquiva 8) · Efecto Veneno (9) o Parálisis (9)",
    pesoKg: null,
    rareza: "Poco Habitual",
    coste: 250,
    motor: MOTOR_GRANADA,
  },
  {
    familia: "granada",
    id: "electro_granada",
    label: "Electro Granada",
    dificultadArrojada: -1,
    danio: 14,
    categoriaDanio: "Eléctrico",
    areaEfecto: "Área 6x6 (Esquiva 8) · Efecto Shock (9)",
    pesoKg: null,
    rareza: "Poco Habitual",
    coste: 250,
    motor: MOTOR_GRANADA,
  },
  {
    familia: "granada",
    id: "granada_corrosiva",
    label: "Granada Corrosiva",
    dificultadArrojada: -2,
    danio: 14,
    categoriaDanio: "Corrosivo",
    areaEfecto: "Área 6x6 (Esquiva 8) · Efecto Corrosión (9)",
    pesoKg: null,
    rareza: "Extraño",
    coste: 350,
    motor: MOTOR_GRANADA,
  },
  {
    familia: "granada",
    id: "crio_granada",
    label: "Crio Granada",
    dificultadArrojada: -2,
    danio: 14,
    categoriaDanio: "Frío",
    areaEfecto: "Área 6x6 (Esquiva 8) · Efecto Congelación (9)",
    pesoKg: null,
    rareza: "Extraño",
    coste: 350,
    motor: MOTOR_GRANADA,
  },
  {
    familia: "granada",
    id: "granada_plasma",
    label: "Granada de Plasma",
    dificultadArrojada: -2,
    danio: 16,
    categoriaDanio: "Plasma",
    areaEfecto: "Área 6x6 (Esquiva 9) · Efecto Shock (8) · Efecto Llamarada (8) · Crítico: Fusión (12)",
    pesoKg: null,
    rareza: "Extraño",
    coste: 2000,
    motor: MOTOR_GRANADA,
  },
];

export function municionGranadaPorId(id: string): MunicionGranada | null {
  return MUNICION_GRANADA.find((m) => m.id === id) ?? null;
}

// ── Munición especial ── docs/equipamiento.md, "Munición Especial". No es una
// pieza equipable (fuera de EQUIPO): es un stock de proyectiles por tipo,
// compartido entre armas (sheet.municionEspecial, recursos.ts), igual que las
// granadas. Para comprarla, alguna arma equipada tiene que llevar instalada
// la mejora "Adaptador: munición <tipo>" (mejorasArma.ts). Fase 1 (2026-09-28):
// comprar y ajustar a mano. Fase 2 (mismo día): se elige al disparar
// (condición "municion", combate.ts), suma `ajusteDanio` y gasta del stock.
export type MunicionEspecial = {
  id: string;
  label: string;
  rareza: Rareza;
  costeProyectil: number;
  // Niveles de daño que suma (o resta) al daño del arma al dispararla — 1 nivel
  // = 1 punto (C11, docs/sistema.md). El tipo ("+1 Fuego") se queda en `efecto`:
  // se suma al total, sin partir el daño en dos categorías (usuario, 2026-09-28).
  ajusteDanio: number;
  // Mismo aviso que ArmaMelee.ignoraBlindaje (solo la perforante).
  ignoraBlindaje?: number;
  efecto: string;
};

// Se compra por lotes: a 4 cr. la bala, de una en una no tiene sentido.
// Decisión del usuario 2026-09-28; el +/- de Recursos ajusta sueltas.
export const LOTE_MUNICION_ESPECIAL = 10;

export const MUNICION_ESPECIAL: MunicionEspecial[] = [
  {
    id: "perforante",
    label: "Munición Perforante",
    rareza: "Común",
    costeProyectil: 4,
    ajusteDanio: -1,
    ignoraBlindaje: 2,
    efecto:
      "Un nivel menos de daño, pero ignora los 2 primeros puntos de blindaje. Su crítico consume " +
      "un punto de blindaje del objetivo en lugar del crítico habitual.",
  },
  {
    id: "incendiaria",
    label: "Munición Incendiaria",
    rareza: "Poco Habitual",
    costeProyectil: 6,
    ajusteDanio: 1,
    efecto: "+1 nivel de daño por Fuego y Llamarada (7); en crítico, Ceguera (10).",
  },
  {
    id: "electrizante",
    label: "Munición Electrizante",
    rareza: "Poco Habitual",
    costeProyectil: 8,
    ajusteDanio: 1,
    efecto: "+1 nivel de daño Eléctrico y Shock (7); en crítico, Shock (10).",
  },
  {
    id: "toxica",
    label: "Munición Tóxica",
    rareza: "Extraño",
    costeProyectil: 10,
    ajusteDanio: 0,
    efecto:
      "Envenenamiento (7): al fallar, envenenado 1; con fallo crítico, envenenado 2. Superándola, " +
      "-1 durante un turno a salvaciones contra lo mismo; con crítico, sin efecto. Si vuelve a " +
      "recibir daño ya envenenado, relanza y puede agravarse un nivel.",
  },
  {
    id: "criogenica",
    label: "Munición Criogénica",
    rareza: "Extraño",
    costeProyectil: 10,
    ajusteDanio: 1,
    efecto: "+1 nivel de daño por Frío y Congelación (7).",
  },
  {
    id: "corrosiva",
    label: "Munición Corrosiva",
    rareza: "Extraño",
    costeProyectil: 10,
    ajusteDanio: 1,
    efecto: "+1 nivel de daño Corrosivo y Corrosión (7).",
  },
  {
    id: "radiactiva",
    label: "Munición Radiactiva",
    rareza: "Muy Extraño",
    costeProyectil: 20,
    ajusteDanio: 0,
    efecto:
      "Envenenamiento (7): al fallar, enfermo 1; con fallo crítico, enfermo 2 y un nivel de daño " +
      "agravado. Superándola, -1 durante un turno contra envenenamiento. Sin tratamiento médico " +
      "relanza la salvación a los 10 turnos (basta un éxito). Afecta a sintéticos, con +2 a su salvación.",
  },
  {
    id: "supresora",
    label: "Munición Supresora",
    rareza: "Muy Extraño",
    costeProyectil: 150,
    ajusteDanio: 0,
    efecto:
      "Daño normal y salvación contra la toxina (8) si recibe daño. Al fallar, un psiónico gasta el " +
      "doble de fatiga y sufre -2 a su empleo durante 1 minuto; con fallo crítico, además un nivel de " +
      "daño letal por punto de fatiga empleado. Superándola, -1 durante un turno contra la misma toxina.",
  },
];

export function municionEspecialPorId(id: string): MunicionEspecial | null {
  return MUNICION_ESPECIAL.find((m) => m.id === id) ?? null;
}
