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
  },
];

export function municionGranadaPorId(id: string): MunicionGranada | null {
  return MUNICION_GRANADA.find((m) => m.id === id) ?? null;
}
