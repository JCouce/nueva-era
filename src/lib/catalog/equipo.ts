// Catálogo de equipo (fase 3, ver docs/traspaso.md §6 y docs/plan-app.md).
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

// 2026-09-24: partido en varios archivos por familia (armaduras.ts,
// armasFuego.ts, mejorasEstandar.ts, subsistemas.ts, movimiento.ts,
// mejorasArma.ts) — este archivo queda como agregador: reexporta cada
// familia para que ningún import externo tenga que cambiar, y se queda con
// los tipos compartidos por varias familias (Rareza, NivelModulo,
// Herramienta, Consumible) más el tipo unión Equipo y equipoPorId.
import type { Modificador } from "../rules/modificadores";
import type { CondicionTirada, TramoDistancia } from "../rules/condiciones";
import type { MotorMetadata } from "../rules/motor";
import { ARMAS_MELEE, type ArmaMelee } from "./armasMelee";
import { VALIJA_TACTICA_MEDICA, FARMACOS } from "./medicina";
import {
  VALIJA_TACTICA_FABRICACION,
  RADAR,
  DISFRAZ_HOLOGRAFICO,
  ESCANER_DETECTOR,
  MATERIALES,
} from "./herramientas";
import { ARMAMENTO_PESADO, type ArmaPesada } from "./armamentoPesado";
import { MUNICION_GRANADA, type MunicionGranada } from "./municion";
import { ARMADURAS, type Armadura } from "./armaduras";
import { ARMAS, type ArmaFuego, type ModoDisparo, type TipoArma } from "./armasFuego";
import { MEJORAS_ESTANDAR, type MejoraEstandar } from "./mejorasEstandar";
import { SUBSISTEMAS, type Subsistema } from "./subsistemas";
import { MOVIMIENTO, type MejoraMovimiento } from "./movimiento";
import { MEJORAS_ARMA, type MejoraDeArma, type CompatibilidadArma } from "./mejorasArma";

// Reexports — ningún archivo externo necesita cambiar su import tras el split.
export { ARMADURAS, type Armadura };
export { ARMAS, type ArmaFuego, type ModoDisparo, type TipoArma };
export { MEJORAS_ESTANDAR, type MejoraEstandar };
export { SUBSISTEMAS, type Subsistema };
export { MOVIMIENTO, type MejoraMovimiento };
export { MEJORAS_ARMA, type MejoraDeArma, type CompatibilidadArma };

export type Rareza = "Común" | "Poco Habitual" | "Extraño" | "Muy Extraño" | "Singular";

// De más a menos accesible: el índice es el rango que usa rarezaPermitida()
// (lib/rules/equipo.ts) para comparar contra el tope de la letra de Recursos.
export const RAREZA_ORDEN: readonly Rareza[] = [
  "Común",
  "Poco Habitual",
  "Extraño",
  "Muy Extraño",
  "Singular",
];

// NivelModulo: compartido por MejoraEstandar, Subsistema, MejoraMovimiento y
// MejoraDeArma (cada una en su propio archivo desde el split de 2026-09-24)
// y por Herramienta, aquí abajo. Cada familia tiene su propia tabla de
// columnas (duración, cobertura, cargas, ventajas…) y forzar una forma
// numérica común inventaría estructura que el documento no tiene. `detalle`
// son líneas de texto libres, una por efecto del nivel — es justo lo que se
// decidió para los módulos "medio objeto, medio poder" (ver docs/traspaso.md).
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
  // Efectos condicionados a una elección del jugador EN el momento de tirar
  // (apoyar el bípode, activar el puntero…): a diferencia de `modificadores`,
  // que es incondicional mientras se lleva puesto, esto solo se pinta en el
  // modal de la tirada de ataque del arma que aloja esta mejora. Ver
  // lib/rules/condiciones.ts.
  condiciones?: CondicionTirada[];
  // Caso particular de condición, reservado a mejoras de arma que alteran el
  // bono por tramo de distancia (mira telescópica y las que lleguen después):
  // se fusiona en la opción de tramo de la propia tirada de ataque en vez de
  // pintarse como control aparte — ver combate.ts. Las claves ausentes no
  // tocan ese tramo.
  ajusteTramo?: Partial<Record<TramoDistancia, number>>;
  // Igual que ajusteTramo, pero incondicional: se suma a los cuatro tramos
  // por igual mientras la pieza está instalada (el -1 del Lanzagranadas
  // Integrado por el peso, por ejemplo). No es una condición porque no hay
  // elección del jugador de por medio.
  ajusteAtaque?: number;
  // Solo lo usan las Herramientas activas (Radar, Escáner Detector, Disfraz
  // Holográfico): la nota de la tirada propia que ese nivel habilita —
  // aplicado y habilidad los pone lib/rules/herramientas.ts (siempre
  // Perspicacia + Tecnociencia, es la pareja que da el documento para las
  // tres), esto es solo la dificultad/alcance/detalle de ESE nivel, texto
  // libre igual que `nota` en ACCIONES. Ninguna trae un bono numérico que
  // mecanizar — la dificultad que citan es la que el jugador teclea en el
  // modal, no un modificador; por eso no hay `modificadores` para esto.
  notaTirada?: string;
  motor?: MotorMetadata[]; // docs/motor.md — un MotorMetadata por efecto DE ESTE NIVEL
};

// ── Herramientas ── Objetos con niveles que, a diferencia de las mejoras y
// subsistemas de arriba, no se instalan en nada: se equipan directos, como
// una armadura (Valija Táctica Médica, y lo que llegue después — VTF,
// Radar, Disfraz Holográfico, Escáner Detector). Comparten `NivelModulo`
// por el mismo motivo que las mejoras: cada una trae su propia tabla de
// efectos por nivel, y forzar una forma numérica común inventaría
// estructura que el documento no tiene.
export type Herramienta = {
  familia: "herramienta";
  id: string;
  label: string;
  resumen: string;
  descripcion: string;
  niveles: NivelModulo[];
};

// ── Consumibles ── Objetos sueltos de precio fijo, sin niveles: fármacos,
// materiales... Mismo perfil que Armadura/ArmaFuego (rareza y coste en la
// propia pieza), sin las columnas de combate que no les aplican. `detalle`
// son líneas de texto libres — mismo criterio que NivelModulo para lo que
// no se mecaniza (una dificultad concreta de una tirada ya existente, un
// efecto narrativo sin número limpio que modelar).
export type Consumible = {
  familia: "consumible";
  id: string;
  label: string;
  resumen: string;
  descripcion: string;
  detalle: string[];
  pesoKg: number | null;
  rareza: Rareza;
  coste: number;
  modificadores: Modificador[];
  motor?: MotorMetadata[]; // docs/motor.md
};

export type Equipo =
  | Armadura
  | ArmaFuego
  | MejoraEstandar
  | Subsistema
  | MejoraMovimiento
  | MejoraDeArma
  | ArmaMelee
  | Herramienta
  | Consumible
  | ArmaPesada
  | MunicionGranada;

export const EQUIPO: Equipo[] = [
  ...ARMADURAS,
  ...ARMAS,
  ...MEJORAS_ESTANDAR,
  ...SUBSISTEMAS,
  ...MOVIMIENTO,
  ...MEJORAS_ARMA,
  ...ARMAS_MELEE,
  VALIJA_TACTICA_MEDICA,
  ...FARMACOS,
  VALIJA_TACTICA_FABRICACION,
  RADAR,
  DISFRAZ_HOLOGRAFICO,
  ESCANER_DETECTOR,
  ...MATERIALES,
  ...ARMAMENTO_PESADO,
  ...MUNICION_GRANADA,
];

// Índice O(1), construido una sola vez a partir de EQUIPO (ya evaluado por
// completo en este punto). Sustituye el .find() lineal de antes — misma
// firma pública, mismo comportamiento, sin que ningún caller cambie.
const EQUIPO_POR_ID = new Map<string, Equipo>(EQUIPO.map((e) => [e.id, e]));

export function equipoPorId(id: string): Equipo | null {
  return EQUIPO_POR_ID.get(id) ?? null;
}

// Fabricar (docs/tareas.md, tarea 8): mismo conjunto de familias "sueltas"
// (coste y rareza fijos en la propia pieza, sin niveles ni host) que ya usan
// costeDePieza()/rarezaDePieza() en lib/rules/equipo.ts — alcance v1,
// deliberadamente sin instalables (mejoraEstandar/subsistema/mejoraArma/
// movimiento, necesitan elegir host) ni Herramientas con nivel (VTF, Radar).
// Se excluyen además los propios Materiales (fabricar materia prima con
// materia prima no tiene sentido) y las armaMelee sin coste — Puñetazo,
// Patada, Codazo o Rodillazo, "no se compran".
// La intersección fuerza coste/rareza a no-nulos en los miembros de la unión
// que los declaran opcionales (solo ArmaMelee: Puñetazo, Patada... ya
// filtrados fuera en tiempo de ejecución, ver PIEZAS_FABRICABLES).
export type PiezaFabricable = (Armadura | ArmaFuego | ArmaMelee | Consumible | ArmaPesada | MunicionGranada) & {
  coste: number;
  rareza: Rareza;
};

const FAMILIAS_FABRICABLES = new Set<Equipo["familia"]>([
  "armadura",
  "arma",
  "armaMelee",
  "consumible",
  "armaPesada",
  "granada",
]);

const IDS_MATERIALES = new Set(MATERIALES.map((m) => m.id));

export const PIEZAS_FABRICABLES: PiezaFabricable[] = EQUIPO.filter(
  (e): e is PiezaFabricable =>
    FAMILIAS_FABRICABLES.has(e.familia) && !IDS_MATERIALES.has(e.id) && "coste" in e && e.coste !== null,
);

const PIEZAS_FABRICABLES_POR_ID = new Map<string, PiezaFabricable>(
  PIEZAS_FABRICABLES.map((e) => [e.id, e]),
);

export function piezaFabricablePorId(id: string): PiezaFabricable | null {
  return PIEZAS_FABRICABLES_POR_ID.get(id) ?? null;
}
