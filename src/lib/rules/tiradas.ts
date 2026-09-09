// Resolución de acciones. Fuente: docs/sistema-y-combate.md.
//
//   tirada = 1d12 + atributo aplicado + habilidad + modificadores
//
// El dado entra como parámetro para que la resolución sea pura y testeable; el
// azar lo pone quien llama (ver `tirarD12`).
import type { AplicadoId } from "./atributos";
import type { HabilidadId } from "./habilidades";
import { aplicado, valorEfectivo } from "./derivados";
import type { Sheet } from "./sheet";
import type { CondicionTirada } from "./condiciones";

export const CARAS_DADO = 12;

export const DIFICULTADES = [
  { id: "muy_facil", label: "Muy Fácil", valor: 2 },
  { id: "facil", label: "Fácil", valor: 5 },
  { id: "normal", label: "Normal", valor: 7 },
  { id: "dificil", label: "Difícil", valor: 10 },
  { id: "muy_dificil", label: "Muy Difícil", valor: 13 },
  { id: "legendario", label: "Legendario", valor: 16 },
] as const;

// Margen de éxitos o fracasos acumulados que convierte un resultado en crítico.
export const MARGEN_CRITICO = 6;

export type Tirada = {
  id: string;
  label: string;
  // "Ataques" no vive en TIRADAS ni en GRUPOS_TIRADA: la generan las
  // funciones de combate.ts a partir del equipo, no este catálogo fijo.
  grupo: "Ataques" | "Defensa" | "Salvaciones" | "Iniciativa" | "Acciones";
  aplicado: AplicadoId;
  habilidad: HabilidadId | null; // las salvaciones van con el aplicado a secas
  nota?: string;
  // Cuando una tirada depende de algo que el sistema aún no define, se declara
  // en vez de inventársela: la UI la muestra apagada con el motivo.
  bloqueada?: string;
  // Controles del modal (ver condiciones.ts): tramo de distancia, apoyado con
  // bípode, atacantes adicionales... Las tiradas de ataque las llevan
  // calculadas al vuelo desde el equipo (ver combate.ts); las demás las
  // declaran aquí mismo, fijas.
  condiciones?: CondicionTirada[];
  // Solo las tiradas de ataque generadas por combate.ts: qué modo de disparo
  // o de golpe hay detrás de cada opción de la condición "modo" (si la
  // tirada tiene más de un modo), para poder encadenar la tirada de daño con
  // el modo que de verdad se usó.
  ataque?: {
    modos: {
      id: string;
      danio: number | null; // null en armas melee: el daño es una fórmula, no un número
      formulaDanio: string | null;
      categoriaDanio: string;
    }[];
  };
};

const FALTA_EXPLORACION =
  "El sistema tira Perspicacia + Exploración, pero Exploración no está entre las 10 habilidades (conflicto C4 de docs/sistema.md)";

// −1 acumulativo por cada atacante adicional en la ronda (sistema-y-combate.md).
// Un contador y no un toggle porque el penalizador escala con cuántos atacan,
// no con un sí/no.
const CONDICION_ATACANTES_ADICIONALES: CondicionTirada = {
  id: "atacantes_adicionales",
  tipo: "contador",
  etiqueta: "Atacantes adicionales esta ronda",
  valorPorUnidad: -1,
  min: 0,
  max: 6,
  porDefecto: 0,
};

export const TIRADAS: Tirada[] = [
  // ── Defensa ──
  {
    id: "defensa",
    label: "Defensa / esquiva",
    grupo: "Defensa",
    aplicado: "reflejos",
    habilidad: "atletismo",
    nota: "Reacción gratuita e ilimitada. Gastar la reacción normal del turno en defender limpia el penalizador acumulado",
    condiciones: [CONDICION_ATACANTES_ADICIONALES],
  },

  // ── Iniciativa ──
  {
    id: "iniciativa_arma",
    label: "Iniciativa (desenfundando)",
    grupo: "Iniciativa",
    aplicado: "reflejos",
    habilidad: "combate_distancia",
    nota: "La tirada depende de cómo entres al combate; esta es la de sacar el arma para atacar",
  },
  {
    id: "iniciativa_distraccion",
    label: "Iniciativa (distrayendo)",
    grupo: "Iniciativa",
    aplicado: "expresion",
    habilidad: "actitud",
    nota: "Para abrir con una distracción. El rival puede oponer Perspicacia + Empatía",
  },
  {
    id: "iniciativa",
    label: "Iniciativa (habitual)",
    grupo: "Iniciativa",
    aplicado: "perspicacia",
    habilidad: null,
    bloqueada: FALTA_EXPLORACION,
  },

  // ── Salvaciones ──
  {
    id: "salv_fortaleza",
    label: "Salvación de Fortaleza",
    grupo: "Salvaciones",
    aplicado: "fortaleza",
    habilidad: null,
    nota: "Veneno, enfermedad, congelación, corrosión, fusión, shock, sordera, aturdimiento",
  },
  {
    id: "salv_reflejos",
    label: "Salvación de Reflejos",
    grupo: "Salvaciones",
    aplicado: "reflejos",
    habilidad: null,
    nota: "Llamarada. Sacudirse o rodar por el suelo baja la dificultad en 5",
  },
  {
    id: "salv_voluntad",
    label: "Salvación de Voluntad",
    grupo: "Salvaciones",
    aplicado: "voluntad",
    habilidad: null,
    nota: "Confusión, miedo y efectos mentales",
  },

  // ── Acciones ──
  {
    id: "sigilo",
    label: "Sigilo",
    grupo: "Acciones",
    aplicado: "reflejos",
    habilidad: "sigilo",
    nota: "Se tira contra la Alerta del objetivo. En empate gana la alerta",
  },
  {
    id: "alerta_activa",
    label: "Buscar / percibir",
    grupo: "Acciones",
    aplicado: "perspicacia",
    habilidad: null,
    bloqueada: FALTA_EXPLORACION,
  },
  {
    id: "atletismo",
    label: "Saltar, escalar, levantarse",
    grupo: "Acciones",
    aplicado: "potencia",
    habilidad: "atletismo",
    nota: "También para escapar de un agarre, donde vale Fortaleza en lugar de Potencia",
  },
  {
    id: "medicina",
    label: "Tratar heridas",
    grupo: "Acciones",
    aplicado: "perspicacia",
    habilidad: "biociencia",
    nota: "Con la especialidad de Medicina. Gel sanador y estabilizar tienen dificultad 4",
  },
  {
    id: "tecnica",
    label: "Reparar / hackear / fabricar",
    grupo: "Acciones",
    aplicado: "perspicacia",
    habilidad: "tecnociencia",
    nota: "Fabricar: dificultad 7 para lo común, +2 por cada rango de rareza",
  },
  {
    id: "social",
    label: "Convencer / mentir",
    grupo: "Acciones",
    aplicado: "expresion",
    habilidad: "actitud",
    nota: "Con Empatía o Manipulación según la aproximación",
  },
];

// "Ataques" va primero pero no es un grupo de TIRADAS: TiradasTab lo pinta
// aparte, con las filas que genera combate.ts a partir del equipo.
export const GRUPOS_TIRADA = ["Defensa", "Salvaciones", "Iniciativa", "Acciones"] as const;

// Modificador fijo de una tirada: lo que se suma al dado antes de nada más.
export function modificadorTirada(
  sheet: Sheet,
  tirada: Tirada,
  enEspecialidad = false,
): { total: number; aplicado: number; habilidad: number | null } {
  const modAplicado = aplicado(sheet, tirada.aplicado);
  const modHabilidad = tirada.habilidad
    ? valorEfectivo(sheet, tirada.habilidad, enEspecialidad)
    : null;
  return {
    total: modAplicado + (modHabilidad ?? 0),
    aplicado: modAplicado,
    habilidad: modHabilidad,
  };
}

export type Resultado = {
  dado: number;
  modificador: number;
  circunstancial: number;
  total: number;
  dificultad: number | null;
  // Éxitos acumulados sobre la dificultad; negativo si son fracasos.
  margen: number | null;
  exito: boolean | null;
  critico: boolean;
};

// Un éxito se consigue igualando la dificultad. El crítico llega al superarla
// por 6; el fracaso crítico, al quedarse a 6 o más.
export function resolverTirada({
  dado,
  modificador,
  circunstancial = 0,
  dificultad = null,
}: {
  dado: number;
  modificador: number;
  circunstancial?: number;
  dificultad?: number | null;
}): Resultado {
  const total = dado + modificador + circunstancial;
  if (dificultad === null) {
    return {
      dado,
      modificador,
      circunstancial,
      total,
      dificultad: null,
      margen: null,
      exito: null,
      critico: false,
    };
  }
  const margen = total - dificultad;
  return {
    dado,
    modificador,
    circunstancial,
    total,
    dificultad,
    margen,
    exito: margen >= 0,
    // Crítico en los dos sentidos: superar por 6 o quedarse a 6 o más.
    critico: Math.abs(margen) >= MARGEN_CRITICO,
  };
}

export type ResultadoDanio = {
  base: number;
  bonoExitos: number;
  total: number;
  categoria: string;
};

// Fuente: sistema-y-combate.md — "por cada dos éxitos acumulados en la
// tirada, +1 al daño". El margen es el de la tirada de ataque YA resuelta
// (después de la acción defensiva del objetivo, si la hubo): esta función no
// vuelve a tirar el dado, solo aplica la regla sobre un resultado que ya
// existe. Un margen negativo (fracaso) no debería llegar aquí — la UI solo
// ofrece "tirar daño" tras un ataque con éxito — pero por si acaso no resta
// daño, se queda en la base.
export function resolverDanio(danioBase: number, margen: number, categoria: string): ResultadoDanio {
  const bonoExitos = margen > 0 ? Math.floor(margen / 2) : 0;
  return { base: danioBase, bonoExitos, total: danioBase + bonoExitos, categoria };
}

// Dado honesto: getRandomValues con descarte del resto, para que las 12 caras
// tengan exactamente la misma probabilidad (el módulo a secas sesga las bajas).
export function tirarD12(): number {
  const limite = Math.floor(0xffffffff / CARAS_DADO) * CARAS_DADO;
  const buf = new Uint32Array(1);
  let n: number;
  do {
    crypto.getRandomValues(buf);
    n = buf[0];
  } while (n >= limite);
  return (n % CARAS_DADO) + 1;
}
