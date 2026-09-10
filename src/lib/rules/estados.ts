// El motor de estados de combate (fase 6b, docs/fase-6b.md bloque 0).
//
// Dos familias de estado, que comparten el mismo mecanismo de salida
// (ModificadorConFuente con origen "estado", el socket que ya existía
// reservado en modificadores.ts desde la fase 4) pero llegan por caminos
// distintos:
//
//   - Los umbrales de PG/fatiga (este fichero, más abajo) se DERIVAN solos
//     del número actual frente al máximo — nadie los "aplica", igual que hoy
//     se derivan los aplicados o la salud máxima.
//   - Los ~20 estados del catálogo (docs/sistema.md §7) los aplica el máster
//     a mano en un combate — llegan en 0.3/0.4, con su propio catálogo y su
//     propia función `modificadoresDeEstados()`.
//
// Fuente de los umbrales: docs/sistema.md §7 y docs/sistema-y-combate.md
// "Puntos de salud". Dos supuestos numerados en docs/sistema.md cubren lo
// que el documento no dice explícitamente: S14 (los umbrales de un mismo
// recurso no se acumulan, solo el más profundo aporta su penalizador) y S15
// (cómo se interpreta el "mínimo 1" de Moribundo/Exhausto).
import type { ModificadorConFuente } from "./modificadores";
import { estadoPorId } from "../catalog/estados";

export type UmbralSalud = "normal" | "herido" | "malherido" | "moribundo";
export type UmbralFatiga = "normal" | "fatigado" | "exhausto";

// Cruza un valor actual con su máximo y una banda de umbrales, de la más
// profunda a la más superficial (S14: gana la primera que se cumpla). El
// `limiteMinimo` opcional es el "(mínimo 1)" de Moribundo/Exhausto (S15):
// sin él, un personaje con máximo bajo podría no cruzar nunca ese 10% antes
// de llegar a 0 PG, que ya es un estado distinto (inconsciente).
function pasaUmbral(actual: number, max: number, fraccion: number, limiteMinimo = 0): boolean {
  if (max <= 0) return false;
  return actual < Math.max(limiteMinimo, max * fraccion);
}

export function umbralSalud(pgActual: number, pgMax: number): UmbralSalud {
  if (pasaUmbral(pgActual, pgMax, 0.1, 2)) return "moribundo";
  if (pasaUmbral(pgActual, pgMax, 0.25)) return "malherido";
  if (pasaUmbral(pgActual, pgMax, 0.5)) return "herido";
  return "normal";
}

export function umbralFatiga(fatigaActual: number, fatigaMax: number): UmbralFatiga {
  if (pasaUmbral(fatigaActual, fatigaMax, 0.1, 2)) return "exhausto";
  if (pasaUmbral(fatigaActual, fatigaMax, 0.25)) return "fatigado";
  return "normal";
}

const PENALIZADOR_SALUD: Record<Exclude<UmbralSalud, "normal">, number> = {
  herido: -1,
  malherido: -3,
  moribundo: -5,
};

const PENALIZADOR_FATIGA: Record<Exclude<UmbralFatiga, "normal">, number> = {
  fatigado: -1,
  exhausto: -2,
};

const ETIQUETA_UMBRAL: Record<Exclude<UmbralSalud, "normal"> | Exclude<UmbralFatiga, "normal">, string> = {
  herido: "Herido",
  malherido: "Malherido",
  moribundo: "Moribundo",
  fatigado: "Fatigado",
  exhausto: "Exhausto",
};

// El "-1/-3/-5 a todo" de PG y el "-1/-2 a todo" de fatiga (docs/sistema.md
// §7), listos para sumarse al resto de modificadores de la ficha. Lo que NO
// cubre esto: "velocidad a la mitad" y "carga -25%/-50%" no son deltas
// planas (son un porcentaje sobre un valor ya calculado) y no encajan en
// Modificador — quedan para 0.2b, con un mecanismo propio en
// movimiento()/cargaMaxima() (derivados.ts).
export function modificadoresDeUmbrales(
  pgActual: number,
  pgMax: number,
  fatigaActual: number,
  fatigaMax: number,
): ModificadorConFuente[] {
  const mods: ModificadorConFuente[] = [];

  const salud = umbralSalud(pgActual, pgMax);
  if (salud !== "normal") {
    mods.push({
      tipo: "tirada",
      alcance: { tipo: "todas" },
      valor: PENALIZADOR_SALUD[salud],
      origen: "estado",
      fuente: ETIQUETA_UMBRAL[salud],
    });
  }

  const fatiga = umbralFatiga(fatigaActual, fatigaMax);
  if (fatiga !== "normal") {
    mods.push({
      tipo: "tirada",
      alcance: { tipo: "todas" },
      valor: PENALIZADOR_FATIGA[fatiga],
      origen: "estado",
      fuente: ETIQUETA_UMBRAL[fatiga],
    });
  }

  return mods;
}

// Un estado del catálogo (0.3) puesto en un combatiente concreto: qué grado
// le tocó y cuántas rondas le quedan. Vive aquí, no en el schema de Prisma
// del bloque 1 todavía — esa forma se decide al construir Combatiente, esto
// es solo lo que necesita la función de abajo para hacer su trabajo.
export type EstadoActivo = {
  estadoId: string;
  gradoId: string;
  // null = sin límite de rondas conocido (algunos estados no dan uno, ver
  // catalog/estados.ts); un número que descuenta el bloque 2 al avanzar
  // turno.
  rondasRestantes: number | null;
};

// Traduce los estados que el máster ha aplicado a un combatiente en
// ModificadorConFuente[] — calcado de modificadoresDeEquipo()
// (lib/rules/equipo.ts): un estadoId o gradoId que ya no exista en el
// catálogo (dato viejo, typo) se ignora sin reventar el resto del cálculo,
// igual que equipoPorId con un catalogoId huérfano.
export function modificadoresDeEstados(activos: EstadoActivo[]): ModificadorConFuente[] {
  return activos.flatMap((activo): ModificadorConFuente[] => {
    const estado = estadoPorId(activo.estadoId);
    if (!estado) return [];
    const grado = estado.grados.find((g) => g.id === activo.gradoId);
    if (!grado) return [];
    return grado.modificadores.map((m) => ({
      ...m,
      origen: "estado" as const,
      fuente: estado.label,
    }));
  });
}
