// Resolución de acciones. Fuente: docs/sistema-y-combate.md.
//
//   tirada = 1d12 + atributo aplicado + habilidad + modificadores
//
// El dado entra como parámetro para que la resolución sea pura y testeable; el
// azar lo pone quien llama (ver `tirarD12`).
import type { AplicadoId } from "./atributos";
import type { HabilidadId } from "./habilidades";
import { aplicado, valorEfectivo, modificadoresActivos } from "./derivados";
import type { Sheet } from "./sheet";
import type { CondicionTirada, BonoPorTramo } from "./condiciones";
import type { GrupoAccion, ModificadorConFuente } from "./modificadores";

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

export type Accion = {
  id: string;
  label: string;
  // "Ataques" y "Herramientas" no viven en ACCIONES ni en GRUPOS_ACCION: los
  // generan combate.ts y herramientas.ts a partir del equipo, no este
  // catálogo fijo.
  grupo: GrupoAccion;
  aplicado: AplicadoId;
  // Estilo Sutil (docs/equipamiento.md:848-850): solo presente si el arma
  // admite Sutil. Es una ELECCIÓN del jugador al tirar (toggle en
  // FilaTirada/AccionesTab.tsx), no un dato fijo — por eso vive aparte de
  // `aplicado` en vez de sustituirlo. La habilidad NO cambia con Sutil, solo
  // el aplicado (ver `modificadorAccion`).
  aplicadoSutil?: AplicadoId;
  habilidad: HabilidadId | null; // las salvaciones van con el aplicado a secas
  nota?: string;
  // Texto que solo aplica si la tirada acaba en crítico (Feature 2, piloto en
  // el Cuchillo de Combate) — a diferencia de `nota`, que se muestra siempre.
  // Se pinta en ResultadoTirada.tsx solo cuando `resultado.critico` es true.
  efectoCritico?: string;
  // Efectos que NO se automatizan porque tocan una tirada distinta a esta —
  // la de un tercero (objetivo_tercero, docs/motor.md) o una tirada propia
  // pero distinta (Sigilo por el Puntero Láser). El motor no los aplica en
  // ningún sitio: solo se listan aquí, con quién los produce, para que el
  // jugador/máster los aplique a mano donde toque — decisión revisada
  // 2026-09-24 (docs/sistema.md, pregunta 25b). Se pintan en
  // ResultadoTirada.tsx tras resolver el daño, no en `nota` (que es
  // información sobre ESTA tirada, no un aviso para otra).
  efectos?: { fuente: string; texto: string }[];
  // Cuando una tirada depende de algo que el sistema aún no define, se declara
  // en vez de inventársela: la UI la muestra apagada con el motivo.
  bloqueada?: string;
  // Controles del modal (ver condiciones.ts): tramo de distancia, apoyado con
  // bípode, atacantes adicionales... Las tiradas de ataque las llevan
  // calculadas al vuelo desde el equipo (ver combate.ts); las demás las
  // declaran aquí mismo, fijas.
  condiciones?: CondicionTirada[];
  // Ajustes fijos de la tirada, cada uno con su fuente: sin elección del
  // jugador de por medio (a diferencia de las condiciones), pero tampoco
  // números fantasma — el peso del Lanzagranadas Integrado en el arma que lo
  // lleva, la dificultad -2 fija de su propio disparo... Se suman al
  // modificador base y se pintan como una línea más del desglose.
  ajustesFijos?: { valor: number; fuente: string }[];
  // Bonos que dependen del tramo ya elegido en la condición "tramo" (la mira
  // telescópica solo ayuda a media y larga): no se funden en el valor de esa
  // opción, salen como su propia línea del desglose — ver condiciones.ts.
  bonosTramo?: BonoPorTramo[];
  // Solo las tiradas de ataque generadas por combate.ts: qué modo de disparo
  // o de golpe hay detrás de cada opción de la condición "modo" (si la
  // tirada tiene más de un modo), para poder encadenar la tirada de daño con
  // el modo que de verdad se usó.
  ataque?: {
    modos: {
      id: string;
      danio: number | null; // null en armas melee: el daño es una fórmula, no un número
      // Daño de este mismo modo con el estilo Sutil activo (Potencia en vez de
      // Fuerza como base) — hermano de `danio`, presente solo si el arma
      // admite Sutil y la fórmula se pudo parsear (ver bonoFormulaFuerza en
      // combate.ts).
      danioSutil?: number | null;
      formulaDanio: string | null;
      categoriaDanio: string;
    }[];
  };
};

// −1 acumulativo por cada atacante adicional en la ronda (sistema-y-combate.md).
// Un contador y no un toggle porque el penalizador escala con cuántos atacan,
// no con un sí/no. Exportada porque combate.ts la reutiliza en "Bloquear con
// X" (pregunta 31, Bloqueo confirmado como otra forma de defensa activa —
// misma reacción gratuita, mismo penalizador por atacante adicional).
export const CONDICION_ATACANTES_ADICIONALES: CondicionTirada = {
  id: "atacantes_adicionales",
  tipo: "contador",
  etiqueta: "Atacantes adicionales esta ronda",
  valorPorUnidad: -1,
  min: 0,
  max: 6,
  porDefecto: 0,
};

export const ACCIONES: Accion[] = [
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
    habilidad: "exploracion",
    nota: "La entrada por defecto al combate, si no hay arma ni distracción de por medio",
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
    habilidad: "exploracion",
    nota: "Acción simple o reacción para buscar objetivos ocultos. En empate, alerta gana a sigilo",
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

// "Ataques" va primero pero no es un grupo de ACCIONES: AccionesTab lo pinta
// aparte, con las filas que genera combate.ts a partir del equipo.
export const GRUPOS_ACCION = ["Defensa", "Salvaciones", "Iniciativa", "Acciones"] as const;

// Modificador fijo de una tirada: lo que se suma al dado antes de nada más.
// `mods` opcional (fase 6b bloque 3.1b): quien alimenta AccionesTab puede
// sumarle aquí los modificadores de tipo "atributo"/"habilidad" que traigan
// los estados de combate activos del jugador (p. ej. Parálisis restando
// Fuerza/Agilidad directamente) — sin esto, la ficha derivaría siempre de la
// ficha "en reposo", ignorando el combate en curso. Los de tipo "tirada"
// (el -1/-3/-5 "a todas" de los umbrales, el -2 a Defensa de Aturdido...) no
// entran aquí: esos se aplican más tarde, en el modal, vía bonoAlcance — este
// número es la base que se ve en la fila antes de abrir nada.
export function modificadorAccion(
  sheet: Sheet,
  tirada: Accion,
  enEspecialidad = false,
  mods: ModificadorConFuente[] = modificadoresActivos(sheet),
  // Estilo Sutil elegido (ver `Accion.aplicadoSutil`): la habilidad no cambia
  // en ningún caso, solo qué aplicado se usa para calcular el ataque.
  sutilActivo = false,
): { total: number; aplicado: number; habilidad: number | null } {
  const aplicadoId = sutilActivo && tirada.aplicadoSutil ? tirada.aplicadoSutil : tirada.aplicado;
  const modAplicado = aplicado(sheet, aplicadoId, mods);
  const modHabilidad = tirada.habilidad
    ? valorEfectivo(sheet, tirada.habilidad, enEspecialidad, mods)
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
