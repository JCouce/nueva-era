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
import type { CondicionTirada, BonoPorTramo, EstadoCondiciones } from "./condiciones";
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
  // Qué entrada de sheet.recursos gasta esta tirada al confirmarse
  // (docs/prompt-gasto-recursos.md, Fase 1) — ausente si no consume ningún
  // RECURSO (salvaciones, tiradas fijas, armas melee sin célula). No se
  // deduce del `id` (parsear `algo_${instanciaId}` es frágil): lo rellena
  // directamente el generador que ya conoce la instancia.
  recursoInstanciaId?: string;
  // Unidad del recurso de arriba, para el aviso de "no te llega" — "balas"
  // por defecto (armas de fuego), "cargas" para lo que tiene célula
  // (Proyector de Pulso, Movilidad Aérea). Solo tiene sentido junto a
  // recursoInstanciaId.
  recursoUnidad?: string;
  // Gasta 1 dosis de sheet.farmacos[farmacoId] al confirmar la tirada
  // (docs/prompt-gasto-recursos.md, Fase 2) — "1 dosis por uso, sin
  // excepciones", así que a diferencia de recursoInstanciaId/gastoTotal() no
  // hace falta calcular ningún número: el gasto es siempre 1, incondicional
  // al resultado. Pool distinto de sheet.recursos (por catalogoId, no por
  // instancia de equipo), de ahí el campo aparte en vez de reusar
  // recursoInstanciaId.
  farmacoId?: string;
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
      // Cuánto gasta este modo de sheet.recursos al confirmar la tirada
      // (docs/prompt-gasto-recursos.md, Fase 1) — dato, no recalculado de la
      // etiqueta en otro punto (gastoDelModo()/GASTO_MODO_PULSO en combate.ts
      // ya lo calculan; aquí solo se guarda el resultado). Ausente en armas
      // melee, que no consumen ningún RECURSO.
      gasto?: number;
    }[];
  };
  // Solo "Volar" (Movilidad Aérea, lib/rules/movimiento.ts): payout en
  // metros en vez de daño — campo hermano de `ataque` porque esa UI ya
  // asume categoriaDanio/"Tirar daño", que no aplica aquí (el resultado se
  // conoce en el momento, no en una segunda tirada). Máxima Potencia no es
  // un modo aparte (docs/tareas.md, "Movilidad Aérea"): es la condición
  // toggle "maxima_potencia" en `condiciones`, ver resolverVuelo() abajo.
  vuelo?: { velocidadBase: number; bonusCritico: number };
};

// Hermano discriminado de Accion para lo que docs/motor.md llama "acciones
// sin dado" — activar algo, declarar un gasto, sin resolución de d12 de por
// medio (Radar nv4 "Marcar objetivo" es el primer caso real). Sin
// aplicado/habilidad/dificultad/ataque a propósito: forzar ese tipo aquí
// dejaría media docena de campos que no significan nada para esta forma.
// `onUsar` vive en la UI (AccionesTab.tsx), no aquí: cada pieza resuelve su
// propio efecto con su propio callback, mismo criterio que Reparar/Fabricar
// (docs/tareas.md, tarea 8) — no hay un motor de efectos genérico todavía,
// y no se inventa uno para un solo caso real.
export type AccionDirecta = {
  id: string;
  label: string;
  grupo: GrupoAccion;
  nota?: string;
  condiciones?: CondicionTirada[];
  // Texto del botón que confirma dentro del modal — "Usar" por defecto; la
  // fila en sí siempre dice "Usar", este es el de dentro ("Marcar", "Activar"...).
  confirmarLabel?: string;
  bloqueada?: string;
  // Mismo campo y mismo criterio que en Accion arriba: gasta 1 dosis al
  // confirmar (los fármacos sin tirada, docs/prompt-gasto-recursos.md Fase 2).
  farmacoId?: string;
  // Sacrifica una cantidad ELEGIDA por el jugador de sheet.recursos al
  // confirmar (Malla Plasmática, "Detonar pulso térmico", 2026-09-28) — a
  // diferencia de recursoInstanciaId en Accion (gasto fijo por modo/toggle) o
  // farmacoId (siempre 1), aquí el número lo decide el jugador en el propio
  // modal (SacrificioRecursoModal.tsx), acotado a lo que tenga disponible.
  // `categoriaDanio` es la categoría de ESE daño para el registro en
  // Acciones recientes (mismo campo que ya usa Accion.ataque.modos).
  recursoInstanciaId?: string;
  categoriaDanio?: string;
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
  // Reparar y Fabricar ya no viven aquí: tienen su propia acción sin dado
  // (docs/tareas.md, tarea 8) en vez de una tirada de `tecnica` con
  // dificultad tecleada a mano — ver ReparaFabricaModal.tsx. `tecnica`
  // (Perspicacia + Tecnociencia) se queda solo para Hackeo, sin nota: la
  // mecánica de hackear sigue sin resolver (docs/sistema.md, pregunta 16 —
  // dualidad hackeo digital/psiónico), inventarse una dificultad aquí sería
  // una regla que el documento no da.
  {
    id: "tecnica",
    label: "Hackeo",
    grupo: "Acciones",
    aplicado: "perspicacia",
    habilidad: "tecnociencia",
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
  margenCriticoExito = MARGEN_CRITICO,
}: {
  dado: number;
  modificador: number;
  circunstancial?: number;
  dificultad?: number | null;
  // Umbral de crítico por el lado de ÉXITO, distinto del general
  // (MARGEN_CRITICO) — hoy solo lo usa la VTM nivel 4 ("Tratar heridas" con
  // el selector "Estado complejo/estabilización/síntesis", medicina.ts +
  // AccionesTab.tsx): 0 hace que cualquier éxito cuente como crítico. El
  // lado de PIFIA nunca cambia, sigue siempre en MARGEN_CRITICO — la VTM no
  // promete nada sobre fracasos.
  margenCriticoExito?: number;
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
    critico: margen >= margenCriticoExito || margen <= -MARGEN_CRITICO,
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

export type ResultadoVuelo = { metros: number | null; descontrolado: boolean };

// Payout de "Volar" (Movilidad Aérea) a partir del margen ya resuelto —
// mismo espíritu que resolverDanio(), pero en metros. Máxima Potencia dobla
// la base y solo con ella el crítico suma el bonus (docs/equipamiento.md:
// "Máxima potencia... en crítico, +N m" — el bonus es propiedad de Máxima
// Potencia, no del vuelo normal). Fracaso crítico no tiene metros fijos:
// "desplazamiento descontrolado en dirección aleatoria" se resuelve a mano.
export function resolverVuelo(
  vuelo: { velocidadBase: number; bonusCritico: number },
  margen: number,
  maximaPotencia: boolean,
): ResultadoVuelo {
  if (margen <= -MARGEN_CRITICO) return { metros: null, descontrolado: true };
  const base = maximaPotencia ? vuelo.velocidadBase * 2 : vuelo.velocidadBase;
  if (margen < 0) return { metros: Math.floor(base / 2), descontrolado: false };
  const bonus = margen >= MARGEN_CRITICO && maximaPotencia ? vuelo.bonusCritico : 0;
  return { metros: base + bonus, descontrolado: false };
}

// Cuánto gasta confirmar esta tirada, en unidades de sheet.recursos
// (docs/prompt-gasto-recursos.md, Fase 1) — espejo de valorCondiciones() pero
// para gasto en vez de modificador: suma el gasto del modo elegido
// (accion.ataque.modos, ausente en tiradas sin ataque como "Volar") más el de
// cualquier toggle activo con gastoActivo/gastoInactivo (Máxima Potencia).
// Vive aquí y no junto a valorCondiciones() (condiciones.ts) porque necesita
// el Accion entero para leer `ataque` — condiciones.ts no conoce ese tipo.
export function gastoTotal(accion: Accion, modoId: string | null, estado: EstadoCondiciones): number {
  const modo = accion.ataque?.modos.find((m) => m.id === modoId);
  const gastoModo = modo?.gasto ?? 0;
  const gastoCondiciones = (accion.condiciones ?? []).reduce((total, c) => {
    if (c.tipo !== "toggle") return total;
    if (c.gastoActivo === undefined && c.gastoInactivo === undefined) return total;
    const activo = Boolean(estado[c.id]);
    return total + (activo ? (c.gastoActivo ?? 0) : (c.gastoInactivo ?? 0));
  }, 0);
  return gastoModo + gastoCondiciones;
}

// Aviso de "no te llega" (docs/tareas.md, RECURSOS) — informativo, no
// bloquea la tirada (§8 de docs/modificadores-tiradas.md, "la app avisa, no
// arbitra"). Antes vivía embebido a mano dentro de `nota`/`opciones[].nota`
// en combate.ts, mezclado con texto decorativo y sin recalcularse si el
// jugador cambiaba de modo dentro del propio modal (docs/prompt-gasto-recursos.md,
// feedback del usuario 2026-09-28) — ahora es una función pura, reactiva al
// `estado` en vivo del modal (AccionModal.tsx la llama en cada render), con
// un único sitio donde se pinta en vez de repartido por dos o tres campos.
// Sin `recurso` rastreado (arma equipada antes de que existiera RECURSOS) no
// hay nada que avisar.
export function avisoInsuficiente(
  accion: Accion,
  modoId: string | null,
  estado: EstadoCondiciones,
  recurso: { actual: number; max: number } | undefined,
): string | undefined {
  if (!accion.recursoInstanciaId || !recurso) return undefined;
  const gasto = gastoTotal(accion, modoId, estado);
  if (recurso.actual >= gasto) return undefined;
  const unidad = accion.recursoUnidad ?? "balas";
  return `Solo quedan ${recurso.actual}/${recurso.max} ${unidad} — esto gasta ${gasto}.`;
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
