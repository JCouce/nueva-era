// Resolución de acciones. Fuente: docs/sistema-y-combate.md.
//
//   tirada = 1d12 + atributo aplicado + habilidad + modificadores
//
// El dado entra como parámetro para que la resolución sea pura y testeable; el
// azar lo pone quien llama (ver `tirarD12`).
import { APLICADOS, type AplicadoId } from "./atributos";
import { HABILIDADES, type HabilidadId } from "./habilidades";
import { aplicado, valorEfectivo } from "./derivados";
import type { Sheet } from "./sheet";
import type { AtributosExtremidad, CondicionTirada, BonoPorTramo, EstadoCondiciones } from "./condiciones";
import {
  alcanzaA,
  sinExceptoSaludYSalvaciones,
  type AlcanceModificador,
  type EmpleoArma,
  type FamiliaArma,
  type GrupoAccion,
  type ModificadorConFuente,
} from "./modificadores";
import type { DetallePoder } from "./poderes";
import type { TipoDanio } from "../catalog/tiposDanio";
import type { DanioExtra } from "./armasModificadas";
import { etiquetaEspecialidad, type EspecialidadId } from "../catalog/especialidades";

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
  // Golpe a mano vacía (Puñetazo, Patada; combate.ts): a estos ataques llegan los
  // textos de especie con destino "desarmado" (crítico letal del Arköru, §14.8).
  desarmado?: true;
  // Arma de daño contundente (ArmaMelee.contundente): la mira el filtro de arma de las dotes
  // (Golpe Fatigante, D2d).
  contundente?: true;
  // Efectos que NO se automatizan porque tocan una tirada distinta a esta —
  // la de un tercero (objetivo_tercero, docs/motor.md) o una tirada propia
  // pero distinta (Sigilo por el Puntero Láser). El motor no los aplica en
  // ningún sitio: solo se listan aquí, con quién los produce, para que el
  // jugador/máster los aplique a mano donde toque — decisión revisada
  // 2026-09-24 (docs/sistema.md, pregunta 25b). Se pintan en
  // ResultadoTirada.tsx tras resolver el daño, no en `nota` (que es
  // información sobre ESTA tirada, no un aviso para otra).
  efectos?: { fuente: string; texto: string }[];
  // Habilidad que el jugador puede usar en su lugar con una casilla de la fila
  // (Levitar: esquivar con Física). Mismo patrón que `aplicadoSutil`, pero sobre
  // la habilidad; la especialidad, si la nombra, se resuelve sola (ver
  // usarHabilidadAlternativa). Sin especialidad, entera (Sigilo en la distracción).
  // `ajuste`: se suma a la tirada al usarla (esquiva en vuelo: maniobrabilidad).
  habilidadAlternativa?: {
    habilidad: HabilidadId;
    especialidad?: EspecialidadId;
    etiqueta: string;
    ajuste?: { valor: number; fuente: string };
  };
  // Regla general (docs/sistema.md §3, usuario 2026-10-23): la tirada que no nombra
  // especialidad suma la habilidad entera; la que la nombra, entera si la ficha la tiene y a
  // la mitad si no (montaje.ts, habilidadEntera). Nunca la elige el jugador con una casilla.
  // Ataque con arma (combate.ts, catalog/especialidadesArma.ts): la especialidad del arma.
  especialidadArma?: EspecialidadId;
  // La de las demás tiradas que la nombran (Tratar heridas: Medicina; acciones de dote, D2c-1;
  // poderes): en especialidad si la ficha tiene cualquiera de estas (Apoyo: Empatía o
  // Liderazgo).
  especialidadesAccion?: readonly EspecialidadId[];
  // Fila fija que solo se pinta si la ficha tiene alguna de `especialidadesAccion` o algo de
  // capa 1 (dote, aumento, especie) le engancha algo por su id (Rastreo, Subsistencia, Trato
  // con Animales, Investigación; decisión del usuario 2026-10-26). Lo decide tiradaFijaVisible
  // (fichaResuelta.ts), nunca la UI.
  soloConEspecialidad?: true;
  // Tirada que obliga a elegir UNA de estas al tirar (Convencer / mentir): la fila no deja
  // tirar sin elegir; elegirEspecialidad la pasa a `especialidadesAccion`.
  especialidadAElegir?: readonly EspecialidadId[];
  // Tirada generada por arma (combate.ts): su familia y el empleo del arma, que miran las
  // casillas, bonos y textos de dote con alcance "familia:<f>" (D2b-1). Sin empleo: arma
  // que no se empuña (Proyector de Pulso).
  familiaArma?: FamiliaArma;
  empleoArma?: EmpleoArma;
  // Crítico con menos éxitos, fijo y sin casilla (Crítico Mejorado: 5 en vez de 6). Lo pone
  // conExtrasDeFicha (fichaResuelta.ts); montarTirada lo junta con los márgenes de las
  // casillas (gana el más bajo) y lo enseña en las notas del resultado.
  criticoFijo?: { margen: number; fuente: string };
  // Fallo → fallo crítico sin casilla, en las tiradas de ese alcance (Rigidez narcisista de
  // Elión: Empatía, Humor o Negociación). Lo pone conExtrasDeFicha con las especialidades
  // posibles; montarTirada lo vuelve a mirar con las de verdad (la elegida en Convencer).
  falloCritico?: { alcance: AlcanceModificador; fuente: string };
  // Fracaso → éxito fijo y sin casilla (Velocista en Carrera), con su fuente. Lo pone
  // conExtrasDeFicha; montarTirada lo pasa a TiradaMontada.subeGrado como el de una casilla.
  subeGradoFijo?: string;
  // Como `efectoCritico`, pero solo con crítico natural (margen ≥ MARGEN_CRITICO, sin contar el
  // que da una conversión éxito → crítico): Gran Puntería en Apuntar. Lo pinta
  // ResultadoTirada.tsx con `resultado.criticoNatural`.
  efectoCriticoNatural?: string;
  // Dificultad con la que se abre el modal si el jugador no ha escrito otra
  // antes (Auto-anclaje: 6). Sin ella, 7.
  dificultadSugerida?: number;
  // Ventaja (Alerta con Resonancia 4): se tiran dos d12 y vale el mejor. El
  // texto es la fuente, para enseñarla en el modal.
  ventaja?: string;
  // Poderes psiónicos (tiradaDePoder, poderes.ts) y acciones de dote (dotesAcciones.ts):
  // texto por grado propio y lo que tira el objetivo, para el panel de resultado.
  poder?: DetallePoder;
  // Cuando una tirada depende de algo que el sistema aún no define, se declara
  // en vez de inventársela: la UI la muestra apagada con el motivo. También una acción de
  // aumento con fatiga fija que no llega (A4b).
  bloqueada?: string;
  // La tirada se hace siempre con la Fuerza y la Agilidad de una extremidad propia, sin casilla
  // ("Bloquear con el brazo biónico", A6a): montarTirada recalcula el aplicado con ellas.
  extremidad?: AtributosExtremidad;
  // Fatiga fija que se paga al tirar (Tempestad Nanobótica, A4b), además de la de las
  // casillas: montarTirada la suma a TiradaMontada.costeFatiga.
  costeFatiga?: number;
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
  // Munición especial que esta arma puede disparar (adaptadores instalados en
  // ESTA instancia), con el stock del momento — docs/tareas.md, "Munición
  // Especial — fase 2". Acompaña a la condición "municion" (combate.ts): si
  // el jugador elige una, el gasto del modo sale de sheet.municionEspecial en
  // vez del cargador (ver gastoTotal/gastoMunicionEspecial) y su ajusteDanio
  // se suma al daño. Aquí y no releído del sheet para que modal y tirar()
  // trabajen con los mismos datos que la fila.
  municionesEspeciales?: {
    id: string;
    label: string;
    stock: number;
    ajusteDanio: number;
    tipoDanio?: TipoDanio;
    ignoraBlindaje?: number;
    efecto: string;
    efectoCritico?: string;
    sustituyeCritico?: boolean;
  }[];
  // "Ignora N puntos de blindaje" del arma (Kerzul): aviso en el resultado del
  // daño, con su fuente — el blindaje es del objetivo, se resta a mano.
  ignoraBlindaje?: { valor: number; fuente: string };
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
      // Etiqueta del modo ("Simple", "Ráfaga"…), para explicar la base del daño en el resultado.
      etiqueta?: string;
      danio: number | null; // null en armas melee: el daño es una fórmula, no un número
      // Daño de este mismo modo con el estilo Sutil activo (Potencia en vez de
      // Fuerza como base) — hermano de `danio`, presente solo si el arma
      // admite Sutil y la fórmula se pudo parsear (ver bonoFormulaFuerza en
      // combate.ts).
      danioSutil?: number | null;
      formulaDanio: string | null;
      categoriaDanio: string;
      // Armas Modificadas (S87): tipo del daño de `danio` (sin él, el de siempre, sin
      // desglose) y el daño extra de otros tipos, que va aparte en el resultado.
      tipoDanio?: TipoDanio;
      danioExtra?: DanioExtra[];
      // Cuánto gasta este modo de sheet.recursos al confirmar la tirada
      // (docs/prompt-gasto-recursos.md, Fase 1) — dato, no recalculado de la
      // etiqueta en otro punto (gastoDelModo()/GASTO_MODO_PULSO en combate.ts
      // ya lo calculan; aquí solo se guarda el resultado). Ausente en armas
      // melee, que no consumen ningún RECURSO.
      gasto?: number;
    }[];
    // Poderes que dañan aunque fallen (Expansión, poderes.ts): "Tirar daño"
    // también con fracaso, con el daño base sin bono por éxitos.
    danioAlFallar?: boolean;
    // Daño fijo, sin el +1 por cada dos éxitos (Tempestad Nanobótica, A4b): la fuente, que
    // montarTirada pasa a TiradaMontada.danio y enseña el resultado.
    sinBonoExitos?: string;
  };
  // Solo "Volar" (Movilidad Aérea, lib/rules/movimiento.ts): payout en
  // metros en vez de daño — campo hermano de `ataque` porque esa UI ya
  // asume categoriaDanio/"Tirar daño", que no aplica aquí (el resultado se
  // conoce en el momento, no en una segunda tirada). Máxima Potencia no es
  // un modo aparte (docs/tareas.md, "Movilidad Aérea"): es la condición
  // toggle "maxima_potencia" en `condiciones`, ver resolverVuelo() abajo.
  vuelo?: { velocidadBase: number; bonusCritico: number };
  // Tirada libre (T-007, tiradaLibre abajo): el jugador elige aplicado y habilidad en el modal.
  // El modal pinta los selectores por este campo, nunca por el id; no nombra especialidad (la
  // habilidad, entera) y conExtrasDeFicha no le añade casillas, textos ni extras de dote o aumento.
  libre?: true;
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
  // Como en Accion ("Levantar [escudo]": levantar_escudo), para los textos de dote.
  familiaArma?: FamiliaArma;
  empleoArma?: EmpleoArma;
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
  // Gasto FIJO de sheet.recursos al confirmar (Activar camuflaje trifásico: 1 carga), sin
  // contador: a diferencia de recursoInstanciaId, el jugador no elige cuánto.
  gastoRecurso?: { instanciaId: string; cantidad: number };
  // Fatiga que se cobra al confirmar (visión del Arianyi, §14.9), por el mismo camino
  // que la de un poder (onPagarFatiga → pagarFatiga, vitalidad.ts).
  costeFatiga?: number;
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

// Selector "Apuntado" de todos los ataques a distancia (Combate a Distancia; combate.ts): lo que
// salió en la acción Apuntar previa (fuente/habilidades.md: éxito +1 al siguiente ataque a
// distancia; crítico, además omite 1 nivel de cobertura). La cobertura se sigue restando a mano:
// la opción solo lo recuerda en su nota. Con Gran Puntería (conExtrasDeFicha) el éxito cuenta
// como crítico y el crítico natural deja la cobertura 2 niveles por debajo en total (supuesto
// S79 de docs/sistema.md: 2 en total, no 3; el selector para todos, S81).
export const ID_APUNTADO = "apuntado";
export const ID_APUNTAR = "apuntar";
const OMITE_UN_NIVEL = "Omites 1 nivel de cobertura del objetivo.";

export function condicionApuntado(granPunteria?: string): CondicionTirada {
  return {
    id: ID_APUNTADO,
    tipo: "opcion",
    etiqueta: granPunteria ? `Apuntado (${granPunteria})` : "Apuntado",
    porDefecto: "no",
    opciones: [
      { id: "no", etiqueta: "No", valor: 0 },
      {
        id: "exito",
        etiqueta: "Éxito",
        valor: 1,
        ...(granPunteria && { nota: `${OMITE_UN_NIVEL} El éxito al apuntar cuenta como crítico.` }),
      },
      {
        id: "critico",
        etiqueta: "Crítico",
        valor: 1,
        nota: granPunteria ? "La cobertura del objetivo baja 2 niveles en total (salvo cobertura total)." : OMITE_UN_NIVEL,
      },
    ],
  };
}

// Selector «Marcha» de Rastreo (fuente/habilidades.md, Rastreo): condiciones y ritmo en un solo
// selector, cada opción con el penalizador por marcha forzada de la fuente. Adversas: rastro de
// más de 24 h, meteorología desfavorable u objetivo que oculta sus huellas. Las dotes no cambian
// los valores de las opciones: Rastreo al Paso y Bioma Predilecto ponen bonos por opción encima
// (dotesEfectos.ts; S97 de docs/sistema.md). Los ids los repite SELECTORES_DE_TIRADA
// (catalog/dotesDestinos.ts), y un test comprueba que coinciden.
export const ID_MARCHA = "marcha";
export const ID_RASTREO = "rastreo";
export const CONDICION_MARCHA: CondicionTirada = {
  id: ID_MARCHA,
  tipo: "opcion",
  etiqueta: "Marcha",
  porDefecto: "normal_mitad",
  opciones: [
    { id: "normal_mitad", etiqueta: "Normal · mitad de carrera", valor: 0 },
    { id: "normal_total", etiqueta: "Normal · velocidad total", valor: -3 },
    { id: "adversa_tercio", etiqueta: "Adversa · un tercio", valor: 0 },
    { id: "adversa_mitad", etiqueta: "Adversa · mitad", valor: -3 },
    { id: "adversa_total", etiqueta: "Adversa · velocidad total", valor: -6 },
  ],
};

// Casilla "Tengo cobertura" de la esquiva, para cualquier ficha y cualquier cobertura (escudo
// en alto, un muro...): +2 fijo, sin mirar el nivel (S86, decisión del usuario). Si el ataque
// supera la defensa pero falla por la cobertura, golpea la cobertura (Bloquear daño).
export const ID_TENGO_COBERTURA = "tengo_cobertura";
const CONDICION_TENGO_COBERTURA: CondicionTirada = {
  id: ID_TENGO_COBERTURA,
  tipo: "toggle",
  etiqueta: "Tengo cobertura (+2)",
  valorActivo: 2,
  nota: "Si el ataque supera tu defensa pero falla por la cobertura, golpea la cobertura: elígelo en Bloquear daño.",
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
    condiciones: [CONDICION_ATACANTES_ADICIONALES, CONDICION_TENGO_COBERTURA],
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
  // "expresión + manipulación o sigilo" (fuente/reglas-base.md): Manipulación fija y Sigilo, que
  // la fuente da a secas, como alternativa entera (docs/sistema.md §3, usuario 2026-10-23).
  {
    id: "iniciativa_distraccion",
    label: "Iniciativa (distrayendo)",
    grupo: "Iniciativa",
    aplicado: "expresion",
    habilidad: "actitud",
    especialidadesAccion: ["manipulacion"],
    habilidadAlternativa: { habilidad: "sigilo", etiqueta: "Con Sigilo" },
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
  // "reflejos + esconderse" (fuente/habilidades.md, Sigilo).
  {
    id: "sigilo",
    label: "Sigilo",
    grupo: "Acciones",
    aplicado: "reflejos",
    habilidad: "sigilo",
    especialidadesAccion: ["esconderse"],
    nota: "Se tira contra la Alerta del objetivo. En empate gana la alerta",
  },
  {
    id: "hurto",
    label: "Hurto",
    grupo: "Acciones",
    aplicado: "reflejos",
    habilidad: "sigilo",
    especialidadesAccion: ["hurto"],
    nota:
      "Acción simple o reacción, enfrentada a Perspicacia + Exploración del objetivo, con penalizador según lo que se quite y lo difícil que sea llegar a ello",
  },
  {
    id: "alerta_activa",
    label: "Buscar / percibir",
    grupo: "Acciones",
    aplicado: "perspicacia",
    habilidad: "exploracion",
    nota: "Acción simple o reacción para buscar objetivos ocultos. En empate, alerta gana a sigilo",
  },
  // Saltar y levantarse: "potencia + atletismo" (fuente/habilidades.md, Salto; fuente/reglas-base.md,
  // Derribado), entera. El id se queda: de él cuelgan equilibrio, nado y derribo (dotes, especie).
  {
    id: "atletismo",
    label: "Saltar, levantarse",
    grupo: "Acciones",
    aplicado: "potencia",
    habilidad: "atletismo",
    nota:
      "Salto horizontal o vertical: dificultad 6; éxito +50 cm (vertical +15 cm), crítico +100 cm (vertical +30 cm). Levantarse o resistir un derribo. También para escapar de un agarre, donde vale Fortaleza en lugar de Potencia",
  },
  // "potencia + escalada" (fuente/habilidades.md, Escalada).
  {
    id: "escalar",
    label: "Escalar",
    grupo: "Acciones",
    aplicado: "potencia",
    habilidad: "atletismo",
    especialidadesAccion: ["escalada"],
    nota:
      "Acción simple, dificultad variable. Éxito: avanzas a tu velocidad de escalada; fracaso: no avanzas; fracaso crítico: te precipitas",
  },
  {
    id: "medicina",
    label: "Tratar heridas",
    grupo: "Acciones",
    aplicado: "perspicacia",
    habilidad: "biociencia",
    especialidadesAccion: ["medicina"],
    nota: "Gel sanador y estabilizar tienen dificultad 4",
  },
  // Reparar y Fabricar ya no viven aquí: tienen su propia acción sin dado
  // (docs/tareas.md, tarea 8) en vez de una tirada de `tecnica` con
  // dificultad tecleada a mano — ver ReparaFabricaModal.tsx. `tecnica`
  // (Perspicacia + Tecnociencia) se queda solo para Hackeo, sin nota: la
  // mecánica de hackear sigue sin resolver (docs/sistema.md, pregunta 16 —
  // dualidad hackeo digital/psiónico), inventarse una dificultad aquí sería
  // una regla que el documento no da.
  // Tiradas fijas de docs/fuente/habilidades.md (tarea "Tiradas fijas que faltan", tareas.md).
  // Apuntar: la fuente no nombra especialidad, así que Combate a Distancia va entera.
  {
    id: ID_APUNTAR,
    label: "Apuntar",
    grupo: "Acciones",
    aplicado: "perspicacia",
    habilidad: "combate_distancia",
    dificultadSugerida: 6,
    nota:
      "Acción simple. Dificultad 6 contra un objetivo mediano, con sus penalizadores de cobertura y visibilidad; +1 por cada tamaño mayor y −1 por cada tamaño menor. Éxito: +1 al siguiente ataque a distancia; crítico: además omite 1 nivel de cobertura. Márcalo en «Apuntado» al disparar, antes del final de tu próximo turno",
  },
  {
    id: "carrera",
    label: "Carrera",
    grupo: "Acciones",
    aplicado: "reflejos",
    habilidad: "atletismo",
    especialidadesAccion: ["carrera"],
    dificultadSugerida: 6,
    nota:
      "Acción estándar o compleja. Éxito: +2 m; crítico: +4 m; fallo: sin metros de más; fallo crítico: tropiezas y mueves la mitad. Con acción compleja, el resultado total se dobla",
  },
  {
    id: "discernir_mentiras",
    label: "Discernir mentiras",
    grupo: "Acciones",
    aplicado: "perspicacia",
    habilidad: "actitud",
    especialidadesAccion: ["empatia"],
    nota: "Acción gratuita, para calar si alguien miente, finge u oculta sus intenciones. La dificultad depende del contexto",
  },
  {
    id: "resistir_distraccion",
    label: "Resistir distracción",
    grupo: "Acciones",
    aplicado: "perspicacia",
    habilidad: "actitud",
    especialidadesAccion: ["empatia"],
    nota:
      "Enfrentada a la distracción del rival antes del combate (Expresión + Manipulación). Si gana, quedas sorprendido contra su primer ataque; con crítico, desprevenido",
  },
  // Exploración (fuente/habilidades.md): Rastreo, Subsistencia y Trato con Animales van con
  // Supervivencia; Investigación, con la suya. Solo salen con la especialidad o con algo que les
  // enganche (soloConEspecialidad). Antes colgaban de "Buscar / percibir" (S36, sustituido).
  {
    id: ID_RASTREO,
    label: "Rastreo",
    grupo: "Acciones",
    aplicado: "perspicacia",
    habilidad: "exploracion",
    especialidadesAccion: ["supervivencia"],
    soloConEspecialidad: true,
    condiciones: [CONDICION_MARCHA],
    nota:
      "Seguir huellas, ramas rotas, restos o perturbaciones del terreno. La dificultad depende de lo evidente del rastro, la superficie y el tiempo transcurrido. Ritmo estándar: mitad de la velocidad de carrera; en condiciones adversas (rastro de más de 24 h, meteorología desfavorable u objetivo que oculta sus huellas), un tercio. Elige en «Marcha» a qué ritmo vas",
  },
  {
    id: "subsistencia",
    label: "Subsistencia",
    grupo: "Acciones",
    aplicado: "perspicacia",
    habilidad: "exploracion",
    especialidadesAccion: ["supervivencia"],
    soloConEspecialidad: true,
    nota:
      "Localizar, extraer o purificar recursos para mantenerse con vida y asegurar un emplazamiento frente a las inclemencias del bioma. La dificultad depende de la hostilidad del terreno",
  },
  // Lectura e interacción tienen aplicado distinto: dos filas (S98).
  {
    id: "trato_animales_lectura",
    label: "Trato con animales: leer",
    grupo: "Acciones",
    aplicado: "perspicacia",
    habilidad: "exploracion",
    especialidadesAccion: ["supervivencia"],
    soloConEspecialidad: true,
    nota:
      "Interpretar el lenguaje corporal, los instintos y el estado emocional de un animal, autóctono o adiestrado. La dificultad depende de la naturaleza, agresividad e inteligencia de la especie",
  },
  {
    id: "trato_animales_interaccion",
    label: "Trato con animales: interactuar",
    grupo: "Acciones",
    aplicado: "expresion",
    habilidad: "exploracion",
    especialidadesAccion: ["supervivencia"],
    soloConEspecialidad: true,
    nota:
      "Pacificar, intimidar o manejar (animales domésticos) para evitar agresiones, calmarlo o dirigir su comportamiento. La dificultad depende de la naturaleza, agresividad e inteligencia de la especie. Con trato continuado y favorable puede llegar a domesticarse o adiestrarse",
  },
  {
    id: "investigacion",
    label: "Investigación",
    grupo: "Acciones",
    aplicado: "perspicacia",
    habilidad: "exploracion",
    especialidadesAccion: ["investigacion"],
    soloConEspecialidad: true,
    nota:
      "Búsqueda metódica, análisis e interconexión de datos y pistas: Inspección de Escena, Análisis de Pistas y Búsqueda Documental",
  },
  // Hackeo con Informática (usuario, 2026-10-23).
  {
    id: "tecnica",
    label: "Hackeo",
    grupo: "Acciones",
    aplicado: "perspicacia",
    habilidad: "tecnociencia",
    especialidadesAccion: ["informatica"],
  },
  // Las de Actitud con "expresión + X" en fuente/habilidades.md: el jugador elige cuál al tirar
  // (usuario, 2026-10-23).
  {
    id: "social",
    label: "Convencer / mentir",
    grupo: "Acciones",
    aplicado: "expresion",
    habilidad: "actitud",
    especialidadAElegir: ["empatia", "humor", "intimidacion", "liderazgo", "manipulacion", "negociacion"],
    nota: "Elige la especialidad según la aproximación",
  },
];

// "Ataques" va primero pero no es un grupo de ACCIONES: AccionesTab lo pinta
// aparte, con las filas que genera combate.ts a partir del equipo.
export const GRUPOS_ACCION = ["Defensa", "Salvaciones", "Iniciativa", "Acciones"] as const;

// Tirada libre (T-007): 1d12 + el aplicado + la habilidad que elija el jugador, para lo que el
// máster pide en mesa y no es ninguna acción con nombre. Grupo propio ("Libre") para que ningún
// alcance por grupo le case: solo le llega lo de alcance `todas`, `aplicado` y `habilidad`
// (docs/sistema.md, supuestos: tirada libre).
export const TIRADA_LIBRE_ID = "tirada_libre";
export const TIRADA_LIBRE_LABEL = "Tirada libre";

export function tiradaLibre(aplicado: AplicadoId = "perspicacia", habilidad: HabilidadId | null = null): Accion {
  return { id: TIRADA_LIBRE_ID, label: TIRADA_LIBRE_LABEL, grupo: "Libre", aplicado, habilidad, libre: true };
}

// "Tirada libre (Perspicacia + Sigilo)", o "Tirada libre (Perspicacia)" sin habilidad: el
// nombre en Acciones recientes.
export function etiquetaTiradaLibre(aplicado: AplicadoId, habilidad: HabilidadId | null): string {
  const a = APLICADOS.find((x) => x.id === aplicado)!.label;
  const h = habilidad ? HABILIDADES.find((x) => x.id === habilidad)!.label : null;
  return `${TIRADA_LIBRE_LABEL} (${h ? `${a} + ${h}` : a})`;
}

// Modificador fijo de una tirada: lo que se suma al dado antes de nada más.
// `mods` obligatorio: los de la FichaResuelta (especie, equipo y estados de
// combate, fase 6b bloque 3.1b) — así entran aquí los de tipo "atributo"/
// "habilidad" que traigan los estados de combate activos del jugador (p. ej. Parálisis restando
// Fuerza/Agilidad directamente) — sin esto, la ficha derivaría siempre de la
// ficha "en reposo", ignorando el combate en curso. Los de tipo "tirada"
// (el -1/-3/-5 "a todas" de los umbrales, el -2 a Defensa de Aturdido...) no
// entran aquí: esos se aplican más tarde, en el modal, vía bonoAlcance — este
// número es la base que se ve en la fila antes de abrir nada.
export function modificadorAccion(
  sheet: Sheet,
  tirada: Accion,
  enEspecialidad: boolean,
  mods: ModificadorConFuente[],
  // Estilo Sutil elegido (ver `Accion.aplicadoSutil`): la habilidad no cambia
  // en ningún caso, solo qué aplicado se usa para calcular el ataque.
  sutilActivo = false,
): { total: number; aplicado: number; habilidad: number | null } {
  const aplicadoId = sutilActivo && tirada.aplicadoSutil ? tirada.aplicadoSutil : tirada.aplicado;
  // El +Fuerza del Exoesqueleto no cuenta en salvaciones (docs/sistema.md S10).
  const modsAplicado = tirada.grupo === "Salvaciones" ? sinExceptoSaludYSalvaciones(mods) : mods;
  const modAplicado = aplicado(sheet, aplicadoId, modsAplicado);
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
  // Crítico de éxito con el margen general (MARGEN_CRITICO), aunque la tirada lo tenga más bajo
  // (Gran Puntería: cualquier éxito al apuntar es crítico, pero el "natural" hace más).
  criticoNatural?: true;
  // Un fracaso que cuenta como éxito por una casilla marcada (Balanceo, D2d): lo pone
  // tirarMontada (montaje.ts), con el margen que sacó de verdad; el margen pasa a 0.
  cambioGrado?: { fuente: string; margenOriginal: number };
};

// Un éxito se consigue igualando la dificultad. El crítico llega al superarla
// por 6; el fracaso crítico, al quedarse a 6 o más.
export function resolverTirada({
  dado,
  modificador,
  circunstancial = 0,
  dificultad = null,
  margenCriticoExito = MARGEN_CRITICO,
  margenCriticoFallo = MARGEN_CRITICO,
}: {
  dado: number;
  modificador: number;
  circunstancial?: number;
  dificultad?: number | null;
  // Umbrales de crítico distintos del general (MARGEN_CRITICO). Los decide
  // montarTirada (montaje.ts) a partir de las casillas marcadas: la VTM nivel 4
  // ("complejo", medicina.ts) y los "éxito → crítico" de especie bajan el de éxito
  // a 0; la Rigidez narcisista de Elión baja el de fallo a 1 (`falloCritico`).
  margenCriticoExito?: number;
  margenCriticoFallo?: number;
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
    critico: margen >= margenCriticoExito || margen <= -margenCriticoFallo,
    ...(margen >= MARGEN_CRITICO && { criticoNatural: true as const }),
  };
}

export type ResultadoDanio = {
  base: number;
  bonoExitos: number;
  total: number;
  categoria: string;
  // Lo que cambiaron las casillas del ataque (D2d), con su fuente, para enseñarlo junto al
  // daño. Ausentes si ninguna lo tocó.
  ajustes?: { valor: number; fuente: string }[];
  sinBonoExitos?: string;
  categoriaPor?: string;
};

// Cambios al daño de las casillas marcadas en el ataque, ya juntados por montarTirada
// (montaje.ts, TiradaMontada.danio): se guardan con la tirada y se aplican al tirar daño.
export type AjusteDanio = {
  ajustes: { valor: number; fuente: string }[];
  categoria: { a: string; fuente: string } | null;
  // Fuente de la casilla que deja el daño en el básico (Derribo), si sigue en pie.
  sinBonoExitos: string | null;
};

// Fuente: sistema-y-combate.md — "por cada dos éxitos acumulados en la
// tirada, +1 al daño". El margen es el de la tirada de ataque YA resuelta
// (después de la acción defensiva del objetivo, si la hubo): esta función no
// vuelve a tirar el dado, solo aplica la regla sobre un resultado que ya
// existe. Un margen negativo (fracaso) no debería llegar aquí — la UI solo
// ofrece "tirar daño" tras un ataque con éxito — pero por si acaso no resta
// daño, se queda en la base.
//
// La categoría con la que se anuncia el daño antes de tirarlo (golpe letal con escudo).
export const categoriaConAjuste = (categoria: string, ajuste?: AjusteDanio): string => ajuste?.categoria?.a ?? categoria;
//
// `ajuste` (D2d): las casillas del ataque. Sin bono por éxitos (Derribo), los ajustes al
// total con mínimo 0 (Golpe Fatigante −1) y la categoría que cambie (golpe letal con escudo).
export function resolverDanio(danioBase: number, margen: number, categoria: string, ajuste?: AjusteDanio): ResultadoDanio {
  const bono = margen > 0 ? Math.floor(margen / 2) : 0;
  if (!ajuste || (ajuste.ajustes.length === 0 && !ajuste.categoria && !ajuste.sinBonoExitos))
    return { base: danioBase, bonoExitos: bono, total: danioBase + bono, categoria };
  const bonoExitos = ajuste.sinBonoExitos ? 0 : bono;
  const suma = ajuste.ajustes.reduce((t, a) => t + a.valor, 0);
  return {
    base: danioBase,
    bonoExitos,
    total: Math.max(0, danioBase + bonoExitos + suma),
    categoria: ajuste.categoria?.a ?? categoria,
    ...(ajuste.ajustes.length > 0 && { ajustes: ajuste.ajustes }),
    ...(ajuste.sinBonoExitos && { sinBonoExitos: ajuste.sinBonoExitos }),
    ...(ajuste.categoria && { categoriaPor: ajuste.categoria.fuente }),
  };
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
// La munición especial elegida en el selector "municion", o null si se
// dispara munición normal (o la tirada no tiene selector).
export function municionEspecialElegida(
  accion: Accion,
  estado: EstadoCondiciones,
): NonNullable<Accion["municionesEspeciales"]>[number] | null {
  const id = estado.municion;
  if (typeof id !== "string") return null;
  return accion.municionesEspeciales?.find((m) => m.id === id) ?? null;
}

// El crítico de la tirada con la munición especial elegida: el del arma más el de la
// munición ("en crítico, Ceguera (10)"), o solo el de la munición si lo sustituye (Perforante).
export function efectoCriticoConMunicion(
  accion: Pick<Accion, "efectoCritico">,
  municion: NonNullable<Accion["municionesEspeciales"]>[number] | null,
): string | undefined {
  if (!municion?.efectoCritico) return accion.efectoCritico;
  const delaMunicion = `${municion.efectoCritico} (${municion.label})`;
  if (municion.sustituyeCritico || !accion.efectoCritico) return delaMunicion;
  return `${accion.efectoCritico} · ${delaMunicion}`;
}

// Lo que la munición especial elegida hace al daño del modo: lo que es del tipo del arma
// (o sin tipo, la Perforante) se suma al daño básico; lo de otro tipo ("+1 Fuego") va
// aparte como daño extra, con su gravedad, igual que en las Armas Modificadas (2026-10-24).
type ModoAtaque = NonNullable<Accion["ataque"]>["modos"][number];

export function danioConMunicion(
  modo: Pick<ModoAtaque, "tipoDanio" | "danioExtra">,
  municion: NonNullable<Accion["municionesEspeciales"]>[number] | null,
): { sumaBase: number; danioExtra: DanioExtra[] | undefined } {
  const extras = modo.danioExtra ?? [];
  if (!municion || municion.ajusteDanio === 0) return { sumaBase: 0, danioExtra: modo.danioExtra };
  const tipo = municion.tipoDanio;
  if (!tipo || tipo === (modo.tipoDanio ?? "cinetico")) return { sumaBase: municion.ajusteDanio, danioExtra: modo.danioExtra };
  const previo = extras.find((e) => e.tipo === tipo);
  return {
    sumaBase: 0,
    danioExtra: previo
      ? extras.map((e) => (e === previo ? { ...e, valor: e.valor + municion.ajusteDanio } : e))
      : [...extras, { tipo, valor: municion.ajusteDanio, fuente: municion.label, gravedadPropia: true as const }],
  };
}

// Proyectiles especiales que gasta el disparo: lo mismo que el modo gastaría
// del cargador (F. Auto = capacidad del cargador, decisión del usuario
// 2026-09-28), pero del stock de ese tipo.
export function gastoMunicionEspecial(
  accion: Accion,
  modoId: string | null,
  estado: EstadoCondiciones,
): { id: string; cantidad: number } | null {
  const municion = municionEspecialElegida(accion, estado);
  if (!municion) return null;
  const modo = accion.ataque?.modos.find((m) => m.id === modoId);
  return { id: municion.id, cantidad: modo?.gasto ?? 0 };
}

// Gasto sobre sheet.recursos (el cargador). Con munición especial elegida, el
// modo no toca el cargador — ese gasto va por gastoMunicionEspecial().
export function gastoTotal(accion: Accion, modoId: string | null, estado: EstadoCondiciones): number {
  const modo = accion.ataque?.modos.find((m) => m.id === modoId);
  const gastoModo = municionEspecialElegida(accion, estado) ? 0 : (modo?.gasto ?? 0);
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
  const especial = gastoMunicionEspecial(accion, modoId, estado);
  if (especial) {
    const municion = municionEspecialElegida(accion, estado)!;
    if (municion.stock >= especial.cantidad) return undefined;
    return `Solo quedan ${municion.stock} de ${municion.label.toLowerCase()} — esto gasta ${especial.cantidad}.`;
  }
  if (!accion.recursoInstanciaId || !recurso) return undefined;
  const gasto = gastoTotal(accion, modoId, estado);
  if (recurso.actual >= gasto) return undefined;
  const unidad = accion.recursoUnidad ?? "balas";
  return `Solo quedan ${recurso.actual}/${recurso.max} ${unidad} — esto gasta ${gasto}.`;
}

// Con ventaja, dos dados y vale el mejor; `dados` guarda los dos para enseñarlos.
export function tirarDado(ventaja: boolean, tirar: () => number = tirarD12): { dado: number; dados?: [number, number] } {
  if (!ventaja) return { dado: tirar() };
  const dados: [number, number] = [tirar(), tirar()];
  return { dado: Math.max(...dados), dados };
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

// ¿Tiene la ficha esa especialidad (id) en esa habilidad?
export function tieneEspecialidad(sheet: Sheet, habilidad: HabilidadId, especialidad: EspecialidadId): boolean {
  return sheet.habilidades[habilidad].especialidades.includes(especialidad);
}

// La tirada con la habilidad alternativa ya puesta, con su especialidad si la nombra (entera
// con ella, la mitad sin ella) o sin ninguna (entera: la regla general de especialidades).
// La especialidad fija de la tirada (Discernir mentiras: Empatía) deja de contar: manda la de
// la alternativa (Cazador Cazado: Manipulación).
export function usarHabilidadAlternativa(t: Accion): Accion | null {
  const alt = t.habilidadAlternativa;
  if (!alt) return null;
  const nombre = alt.especialidad
    ? etiquetaEspecialidad(alt.especialidad)
    : HABILIDADES.find((h) => h.id === alt.habilidad)!.label;
  return sinCasillasDeOtraEspecialidad({
    ...t,
    habilidad: alt.habilidad,
    label: `${t.label} (${nombre})`,
    especialidadesAccion: alt.especialidad ? [alt.especialidad] : undefined,
    especialidadAElegir: undefined,
    ...(alt.ajuste && { ajustesFijos: [...(t.ajustesFijos ?? []), alt.ajuste] }),
  });
}

// La tirada con la especialidad elegida (Convencer / mentir): pasa a nombrarla, como una fija.
export function elegirEspecialidad(t: Accion, especialidad: EspecialidadId): Accion {
  return sinCasillasDeOtraEspecialidad({
    ...t,
    label: `${t.label} (${etiquetaEspecialidad(especialidad)})`,
    especialidadesAccion: [especialidad],
    especialidadAElegir: undefined,
  });
}

// Las especialidades que nombra la tirada: la del arma o las de la acción. Con `candidatas`,
// también las de `especialidadAElegir` mientras no se elija.
export function especialidadesDeTirada(
  t: Pick<Accion, "especialidadArma" | "especialidadesAccion" | "especialidadAElegir">,
  candidatas = false,
): readonly EspecialidadId[] {
  if (t.especialidadArma) return [t.especialidadArma];
  return t.especialidadesAccion ?? (candidatas ? t.especialidadAElegir : undefined) ?? [];
}

// Las casillas con alcance de especialidad entran en la tirada con las candidatas de Convencer
// (contextoDe); al elegir una, o al cambiar de habilidad, se quedan solo las de la nueva.
function sinCasillasDeOtraEspecialidad(t: Accion): Accion {
  if (!t.condiciones) return t;
  const especialidades = especialidadesDeTirada(t);
  const condiciones = t.condiciones.filter(
    (c) => c.alcance?.tipo !== "especialidad" || alcanzaA(c.alcance, { id: t.id, grupo: t.grupo, habilidad: t.habilidad, modoElegido: null, especialidades }),
  );
  return condiciones.length === t.condiciones.length ? t : { ...t, condiciones };
}
