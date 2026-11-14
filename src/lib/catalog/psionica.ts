// Catálogo de psiónica. Prosa: docs/psionica.md; reglas: docs/sistema.md §10.6;
// borrador del que sale: docs/modelado-psionica.json (no se importa en runtime,
// es un borrador — esto es la transcripción revisada y tipada).
//
// Las 6 disciplinas con sus acciones.
import type { MotorMetadata } from "../rules/motor";
import type { Estado } from "./estados";
import type { AlcanceModificador } from "../rules/modificadores";
import type {
  AccionPoder,
  CambiosOpcion,
  CatalogoPsionica,
  Disciplina,
  Economia,
  EjePoder,
  ModificadorFatiga,
  Opcion,
  ResultadoPoder,
  Valor,
} from "../rules/psionica";

export const DISCIPLINA_IDS = ["resonancia", "induccion", "hipercognicion", "traslacion", "contencion", "singularidad"] as const;
export type DisciplinaId = (typeof DISCIPLINA_IDS)[number];

const NIVELES = [1, 2, 3, 4, 5, 6] as const;

// Eje "Nivel empleado": una opción por nivel, cada una disponible desde ese nivel
// poseído (con nivel N se puede emplear cualquier nivel ≤ N).
function ejeNivelEmpleado(fila: (n: number) => CambiosOpcion): EjePoder {
  return {
    id: "nivel",
    label: "Nivel empleado",
    tipo: "nivel_empleado",
    opciones: NIVELES.map((n): Opcion => ({ id: `n${n}`, label: `Nivel ${n}`, desdeNivel: n, cambia: fila(n) })),
  };
}

// `extra`: entradas que no son ni la acción ni textos (Convergencia: ignorar media absorción y
// los escudos, como `ignoraBlindaje` de las armas: Resolución con nota fija).
function motorDeAccion(id: string, notas: { tercero?: string[]; propias?: boolean; extra?: MotorMetadata[] }): MotorMetadata[] {
  return [
    { tipo: "accion", afecta: { modo: "accion_nueva", id }, mecanismo: "accion_sin_equipo", estado: "construido" },
    ...(notas.propias
      ? [{ tipo: "texto", afecta: { modo: "accion_existente", id }, mecanismo: "nota_fija", estado: "construido" } as const]
      : []),
    ...(notas.tercero ?? []).map(
      (t) => ({ tipo: "texto", afecta: { modo: "objetivo_tercero", id: t }, mecanismo: "nota_fija", estado: "construido" }) as const,
    ),
    ...(notas.extra ?? []),
  ];
}

// MotorMetadata de una casilla de `casillasEnTiradas` (P1): un Ajuste (o una Resolución, si
// cambia cómo se resuelve) que el jugador marca al tirar, por cada blanco.
const motorDeCasilla = (tipo: "numerico" | "resolucion", ids: string[]): MotorMetadata[] =>
  ids.map((id) => ({ tipo, afecta: { modo: "accion_existente", id }, mecanismo: "eleccion_jugador", estado: "construido" }));

const grupo = (g: Extract<AlcanceModificador, { tipo: "grupo" }>["grupo"]): AlcanceModificador => ({ tipo: "grupo", grupo: g });
const tirada = (id: string): AlcanceModificador => ({ tipo: "tiradaId", id });

// Campos que ninguna acción de Singularidad usa: se rellenan una vez aquí.
const SIN_EXTRAS = {
  permiteFatigaTemporal: false,
  duracion: null,
  danioPropio: null,
  multiplesObjetivos: null,
  togglesPropios: [],
  bonosEnOtrasTiradas: [],
  movimientoOtorgado: null,
  ajustesPorNivelPoseido: [],
  manual: [],
} satisfies Partial<AccionPoder>;

// Las tres formas comparten ejecución: acción estándar, 1 de fatiga por nivel
// empleado, ataque de Perspicacia + Tecnociencia (Física si la tiene).
const ATAQUE_SINGULARIDAD = {
  tipo: "ataque",
  aplicado: "perspicacia",
  habilidad: "tecnociencia",
  especialidad: "fisica",
  danio: "tabla",
  categoria: "letal",
} as const;

const IMPULSO: AccionPoder = {
  ...SIN_EXTRAS,
  id: "psi_singularidad_impulso",
  label: "Impulso",
  desdeNivel: 1,
  economia: "estandar",
  fatiga: "tabla",
  alcance: "tabla",
  objetivo: { tipo: "unico" },
  desplazamiento: "tabla",
  resolucion: ATAQUE_SINGULARIDAD,
  objetivoTira: [],
  ejes: [
    ejeNivelEmpleado((n) => ({
      fatiga: n,
      alcance: 20 * n,
      resolucion: { danio: 9 + n },
      desplazamiento: 4 * n,
      objetivoTira: [
        { que: "Reacción defensiva (Defensa / esquiva) contra el ataque a distancia" },
        {
          que: "Si es golpeado: Fortaleza + Atletismo para evitar el desplazamiento",
          dificultad: 8 + n,
          grados: {
            critico: "No le afecta",
            exito: "Se desplaza la mitad ({desplazamiento/2} m) hacia atrás",
            fracaso: "Se desplaza {desplazamiento} m hacia atrás y cae derribado",
            fracasoCritico: "Se desplaza {desplazamiento} m hacia atrás, queda derribado y aturdido 1 turno",
          },
        },
      ],
    })),
    {
      id: "modo",
      label: "Forma",
      tipo: "opcion",
      opciones: [
        { id: "normal", label: "Impulso", cambia: {} },
        {
          id: "poderoso",
          label: "Impulso Poderoso",
          cambia: {
            economia: "compleja",
            // "8 × nivel de poder" a secas = nivel poseído (usuario, 2026-09-29).
            desplazamiento: { base: 0, porNivelPoseido: 8 },
            notas: [
              {
                texto: "Impulso Poderoso: +1 de fatiga, +2 al daño, +1 a la dificultad del empuje y empuje de 8 × tu nivel poseído en metros.",
                lugar: "tirada",
              },
            ],
          },
          suma: { fatiga: 1, "resolucion.danio": 2, "objetivoTira.1.dificultad": 1 },
        },
      ],
    },
  ],
  resultados: {
    exito: { texto: "Impacta: daño cinético letal; el objetivo tira Fortaleza + Atletismo contra el desplazamiento", estados: [] },
    fracaso: { texto: "No impacta", estados: [] },
  },
  notas: [{ texto: "Ignora la cobertura ligera (humo, follaje, neblina, una caja de cartón; a criterio del máster)", lugar: "tirada" }],
  motor: motorDeAccion("psi_singularidad_impulso", { propias: true, tercero: ["defensa", "resistir_empuje"] }),
};

const EXPANSION: AccionPoder = {
  ...SIN_EXTRAS,
  id: "psi_singularidad_expansion",
  label: "Expansión",
  desdeNivel: 1,
  economia: "estandar",
  fatiga: "tabla",
  alcance: "tabla",
  objetivo: { tipo: "casilla", area: "tabla" },
  desplazamiento: null,
  // Fallar solo la desvía una casilla por fallo: estalla igual (Murillo, 2026-09-29).
  resolucion: { ...ATAQUE_SINGULARIDAD, danioAlFallar: true },
  objetivoTira: [],
  ejes: [
    ejeNivelEmpleado((n) => ({
      fatiga: n,
      alcance: 20 * n,
      resolucion: { danio: 13 + n },
      objetivo: { tipo: "casilla", area: 4 + 2 * n },
      objetivoTira: [
        {
          que: "Esquiva con Reflejos + Atletismo: cada éxito permite moverse una casilla alejándose del área (máximo el movimiento del personaje) y reduce el daño en 4; si sale del área no recibe daño",
          dificultad: 6 + n,
        },
        {
          que: "Si no sale del área: Fortaleza + Atletismo o es expulsado con fuerza y puede caer derribado",
          dificultad: 8 + n,
          grados: {
            critico: "Ni se desplaza ni cae",
            exito: "Solo se desplaza 2 m hacia fuera",
            fracaso: `Empujado ${2 * n} m y cae derribado`,
            fracasoCritico: `Empujado ${2 * n} m, derribado y aturdido 1 turno`,
          },
        },
      ],
    })),
    {
      id: "modo",
      label: "Forma",
      tipo: "opcion",
      opciones: [
        { id: "normal", label: "Expansión", cambia: {} },
        {
          id: "poderoso",
          label: "Expansión Poderosa",
          cambia: {
            economia: "compleja",
            notas: [
              {
                texto: "Expansión Poderosa: +1 de fatiga, +1 al daño y +1 a la dificultad de la esquiva y de la prueba contra la expulsión.",
                lugar: "tirada",
              },
            ],
          },
          suma: { fatiga: 1, "resolucion.danio": 1, "objetivoTira.*.dificultad": 1 },
        },
      ],
    },
  ],
  resultados: {
    exito: { texto: "La singularidad estalla en la casilla elegida: todo lo que haya en el área recibe el daño y debe esquivar", estados: [] },
    fracaso: { texto: "Se desvía una casilla por cada fallo antes de estallar; afecta a lo que haya en el área donde cae", estados: [] },
  },
  notas: [{ texto: "Afecta a todo lo que haya en el área, aliados y el propio psiónico incluidos", lugar: "tirada" }],
  motor: motorDeAccion("psi_singularidad_expansion", { propias: true, tercero: ["defensa", "resistir_empuje"] }),
};

const CONVERGENCIA: AccionPoder = {
  ...SIN_EXTRAS,
  id: "psi_singularidad_convergencia",
  label: "Convergencia",
  desdeNivel: 1,
  economia: "estandar",
  fatiga: "tabla",
  alcance: "tabla",
  objetivo: { tipo: "unico" },
  desplazamiento: null,
  resolucion: ATAQUE_SINGULARIDAD,
  objetivoTira: [],
  ejes: [
    ejeNivelEmpleado((n) => ({
      fatiga: n,
      alcance: 15 * n,
      resolucion: { danio: 5 + n },
      objetivoTira: [
        { que: "Esquiva con Reflejos + Atletismo" },
        {
          que: "Si no esquiva: prueba de Fortaleza (daño de fuego adicional y llamarada)",
          dificultad: 6 + n,
          grados: {
            critico: "Sin efecto adicional",
            exito: "1 nivel de daño por fuego adicional; si lleva blindaje, pierde 1 punto de absorción (permanente)",
            fracaso:
              "Daño por fuego = mitad de la armadura del objetivo (mínimo 1); el blindaje pierde 2 puntos de absorción (permanente); llamarada 1d4 turnos, 1 nivel de fuego por turno, se extingue de forma normal",
            fracasoCritico: "El blindaje pierde 4 puntos de absorción; el daño de fuego no cesa hasta extinguir la llamarada",
          },
        },
      ],
    })),
    {
      id: "modo",
      label: "Forma",
      tipo: "opcion",
      opciones: [
        { id: "normal", label: "Convergencia", cambia: {} },
        {
          id: "poderoso",
          label: "Convergencia Poderosa",
          cambia: {
            economia: "compleja",
            notas: [{ texto: "Convergencia Poderosa: +1 de fatiga y +2 al daño.", lugar: "tirada" }],
          },
          suma: { fatiga: 1, "resolucion.danio": 2 },
        },
      ],
    },
  ],
  resultados: {
    exito: { texto: "Impacta: daño letal; si no esquiva, el objetivo hace la prueba de Fortaleza contra fuego y llamarada", estados: [] },
    fracaso: { texto: "No impacta", estados: [] },
  },
  notas: [
    { texto: "Ignora la mitad de la absorción de blindaje/armadura del objetivo", lugar: "danio" },
    { texto: "Ignora el Escudo Deflector y la Malla Plasmática", lugar: "danio" },
    { texto: "Las armaduras o blindajes (también de vehículos y sintéticos) pueden recibir daño; la pérdida de absorción es permanente", lugar: "danio" },
    { texto: "El daño de fuego ignora cualquier absorción", lugar: "danio" },
  ],
  // Las notas propias que se quedan en texto: las armaduras se dañan; el fuego ignora la absorción.
  motor: motorDeAccion("psi_singularidad_convergencia", {
    propias: true,
    tercero: ["defensa", "salv_fortaleza"],
    extra: [
      // Ignora la mitad de la absorción y los escudos: aviso junto al daño, se resta a mano.
      { tipo: "resolucion", afecta: { modo: "accion_existente", id: "psi_singularidad_convergencia" }, mecanismo: "nota_fija", estado: "construido" },
    ],
  }),
};

// ── Resonancia ────────────────────────────────────────────────────
// Todo poder elige alcance: Local (su coste propio, 1 km², cuenta como nivel
// empleado 1) o una fila de la tabla, que SUSTITUYE tipo de acción, fatiga y
// alcance (usuario, 2026-09-29). Desde nivel 3, el local puede usarse como
// reacción. Las rebajas por nivel poseído van en la disciplina.

// Va DESPUÉS de los ejes que fijan el coste local (el mensaje de Sincronía): una
// fila de la tabla tiene que poder pisarlo.
function ejeAlcanceResonancia(): EjePoder {
  const fila: CambiosOpcion = { economia: "tabla", fatiga: "tabla", alcance: "tabla" };
  return {
    id: "nivel",
    label: "Alcance (nivel empleado)",
    tipo: "nivel_empleado",
    porDefecto: "local",
    opciones: [
      { id: "local", label: "Local", nivel: 1, cambia: {} },
      { id: "local_reaccion", label: "Local, reacción", nivel: 1, desdeNivel: 3, cambia: { economia: "reaccion" } },
      ...NIVELES.map((n): Opcion => ({ id: `n${n}`, label: `Nivel ${n}`, desdeNivel: n, cambia: fila })),
    ],
  };
}

// Contra mentes sintéticas se resuena con Tecnociencia: con Informática donde la prosa la nombra
// (Superar la barrera, Rastreo); la Alerta dice "tecnociencia" a secas, entera (usuario,
// 2026-10-23: sin especialidad nombrada, la habilidad entera).
const receptor = (label: string, plural = false, informatica = true): EjePoder => ({
  id: "receptor",
  label,
  tipo: "opcion",
  opciones: [
    { id: "organico", label: plural ? "Orgánicas" : "Orgánico", cambia: {} },
    {
      id: "sintetico",
      label: plural ? "Sintéticas" : "Sintético",
      cambia: { resolucion: { habilidad: "tecnociencia", ...(informatica && { especialidad: "informatica" as const }) } },
    },
  ],
});
const RECEPTOR_SINTETICO = receptor("Objetivo");

const NOTA_RASTREO_PRIMERO = { texto: "Si no conoces al objetivo, primero encuéntralo con Rastreo.", lugar: "tirada" } as const;

const SINCRONIA_ID = "psi_resonancia_sincronia";
const SINCRONIA: AccionPoder = {
  ...SIN_EXTRAS,
  id: SINCRONIA_ID,
  label: "Sincronía",
  desdeNivel: 1,
  economia: "gratuita",
  fatiga: 0,
  alcance: 1,
  unidades: { alcance: "km²" },
  objetivo: { tipo: "unico" },
  desplazamiento: null,
  resolucion: { tipo: "sin_dado" },
  objetivoTira: [],
  ejes: [
    {
      id: "mensaje",
      label: "Mensaje",
      tipo: "opcion",
      opciones: [
        { id: "simple", label: "Datos simples", cambia: {} },
        { id: "complejo", label: "Datos complejos", cambia: { economia: "estandar", fatiga: 1 } },
      ],
    },
    ejeAlcanceResonancia(),
  ],
  resultados: {},
  notas: [
    NOTA_RASTREO_PRIMERO,
    {
      texto: "Datos simples: una conversación o imágenes en tiempo real. Datos complejos: mucho contenido que el objetivo tardará en asimilar.",
      lugar: "tirada",
    },
    { texto: "Con barrera de idioma o de biología, tira «Superar la barrera».", lugar: "tirada" },
    {
      texto: "Por la Sincronía se pueden hacer acciones sociales (Actitud); una barrera de comunicación notable sube su dificultad.",
      lugar: "tirada",
    },
  ],
  motor: motorDeAccion(SINCRONIA_ID, { propias: true }),
};

// Mensaje agresivo: forma de ataque de la Sincronía, acción aparte porque tira
// y la Sincronía normal no. "1 de fatiga por nivel empleado": en local (nivel 1)
// es 1; con una fila, la fila sustituye.
const MENSAJE_AGRESIVO_ID = "psi_resonancia_mensaje_agresivo";
const MENSAJE_AGRESIVO: AccionPoder = {
  ...SIN_EXTRAS,
  id: MENSAJE_AGRESIVO_ID,
  label: "Mensaje agresivo",
  desdeNivel: 1,
  economia: "compleja",
  fatiga: 1,
  alcance: 1,
  unidades: { alcance: "km²" },
  objetivo: { tipo: "unico" },
  desplazamiento: null,
  resolucion: { tipo: "enfrentada", aplicado: "expresion", habilidad: ["biociencia", "actitud"] },
  danioPropio: { valor: 1, categoria: "mental" },
  objetivoTira: [
    {
      que: "Salvación de Voluntad + Actitud (o + Biociencia si es un psiónico entrenado); escribe su total como dificultad",
    },
  ],
  ejes: [ejeAlcanceResonancia()],
  // Al fallar no pasa nada (Murillo, 2026-09-29).
  resultados: {
    critico: { texto: "Confusión tantos turnos como nivel empleado ({nivel}) y {nivel} de daño mental", estados: [] },
    exito: { texto: "Confusión durante 1 turno", estados: [] },
    fracaso: { texto: "Sin efecto", estados: [] },
  },
  notas: [NOTA_RASTREO_PRIMERO, { texto: "Recibes 1 de daño mental al lanzarlo (se resta al usarlo).", lugar: "tirada" }],
  motor: motorDeAccion(MENSAJE_AGRESIVO_ID, { propias: true, tercero: ["salv_voluntad"] }),
};

// La prueba para que el mensaje se entienda pese a la barrera de idioma o de
// biología: va con la Sincronía, sin coste propio.
const SUPERAR_BARRERA_ID = "psi_resonancia_superar_barrera";
const SUPERAR_BARRERA: AccionPoder = {
  ...SIN_EXTRAS,
  id: SUPERAR_BARRERA_ID,
  label: "Superar la barrera",
  desdeNivel: 1,
  economia: { tiempo: "con la Sincronía" },
  fatiga: 0,
  alcance: null,
  objetivo: null,
  desplazamiento: null,
  resolucion: { tipo: "tirada", aplicado: "expresion", habilidad: "biociencia" },
  objetivoTira: [],
  ejes: [RECEPTOR_SINTETICO],
  // Fallida: el mensaje llega pero no se entiende (Murillo, 2026-09-29).
  resultados: {
    exito: { texto: "El mensaje se entiende pese a la barrera", estados: [] },
    fracaso: { texto: "El mensaje llega, pero no se entiende", estados: [] },
  },
  notas: [
    {
      texto: "Dificultad a criterio del máster. Referencias: 4 una sincronía sencilla, 7 conceptos o emociones extrañas, 10 un paquete complejo y extraño.",
      lugar: "tirada",
    },
    { texto: "Los códigos encriptados suben la dificultad y pueden pedir varias acciones.", lugar: "tirada" },
  ],
  motor: motorDeAccion(SUPERAR_BARRERA_ID, { propias: true }),
};

// Sin coste propio en local: cuesta 1, como la fila 1 (usuario, 2026-09-29), con
// la acción estándar del alcance local de la tabla.
const RASTREO_ID = "psi_resonancia_rastreo";
const RASTREO: AccionPoder = {
  ...SIN_EXTRAS,
  id: RASTREO_ID,
  label: "Rastreo",
  desdeNivel: 1,
  economia: "estandar",
  fatiga: 1,
  alcance: 1,
  unidades: { alcance: "km²" },
  objetivo: { tipo: "unico" },
  desplazamiento: null,
  resolucion: { tipo: "tirada", aplicado: "perspicacia", habilidad: "biociencia", dificultad: 6 },
  objetivoTira: [],
  ejes: [
    ejeAlcanceResonancia(),
    RECEPTOR_SINTETICO,
    {
      id: "conocimiento",
      label: "Lo conoces",
      tipo: "opcion",
      opciones: [
        { id: "conocido", label: "Conocido", cambia: {} },
        // ×2 / ×10 multiplica el tiempo de la fila usada (Murillo, 2026-09-29).
        { id: "vago", label: "Vagamente", cambia: { resolucion: { dificultad: 9 } }, suma: { fatiga: 1 }, multiplicaTiempo: 2 },
        {
          id: "desconocido",
          label: "Desconocido",
          cambia: {
            resolucion: { dificultad: 12 },
            notas: [{ texto: "No se rastrea a un individuo concreto: se hace un barrido.", lugar: "tirada" }],
          },
          suma: { fatiga: 4 },
          multiplicaTiempo: 10,
        },
      ],
    },
  ],
  resultados: {
    exito: { texto: "Localizas al objetivo (o a los objetivos)", estados: [] },
    fracaso: { texto: "No lo localizas", estados: [] },
  },
  notas: [
    {
      texto: "Zonas de interferencia suben la dificultad: apantallamiento electromagnético +2, instalación militar blindada +4, búnker con supresión cuántica +6. Algunas son infranqueables.",
      lugar: "tirada",
    },
  ],
  motor: motorDeAccion(RASTREO_ID, { propias: true }),
};

// Las tiradas enfrentadas a otro personaje en las que cabe el +2 de Leer Mente: ataques y
// defensas (reglas-base: "las acciones defensivas se resuelven de forma enfrentada a las de
// ataque"), las fijas que la fuente da como enfrentadas y, por sus datos (blancos de
// CasillaDePoder), los poderes y las acciones de dote con resolución "enfrentada" (Inducción,
// Duelo de Métrica, Finta, Burla…). La app no sabe contra quién se tira: el jugador la marca si
// es contra el leído.
const ENFRENTADAS_FIJAS = ["social", "discernir_mentiras", "resistir_distraccion", "iniciativa_distraccion", "sigilo", "mimetismo", "hurto"];
const ALCANCES_ENFRENTADAS: AlcanceModificador[] = [grupo("Ataques"), grupo("Defensa"), ...ENFRENTADAS_FIJAS.map(tirada)];

// Enfrentada: los grados van desde el punto de vista del psiónico (su fracaso =
// el objetivo salva con éxito, que aún deja 1 turno de lectura).
const LEER_MENTE_ID = "psi_resonancia_leer_mente";
const LEER_MENTE: AccionPoder = {
  ...SIN_EXTRAS,
  id: LEER_MENTE_ID,
  label: "Leer Mente",
  desdeNivel: 1,
  economia: "estandar",
  fatiga: 1,
  alcance: 1,
  unidades: { alcance: "km²" },
  objetivo: { tipo: "unico" },
  desplazamiento: null,
  resolucion: { tipo: "enfrentada", aplicado: "perspicacia", habilidad: "biociencia" },
  objetivoTira: [{ que: "Resiste con Voluntad + Actitud; escribe su total como dificultad" }],
  ejes: [ejeAlcanceResonancia()],
  resultados: {
    critico: {
      texto: "Lees sus pensamientos más vívidos y superficiales durante 1 minuto (10 turnos) sin gastar acción para mantenerlo, y +2 en tus tiradas enfrentadas contra él: márcalo en la casilla «Mente leída»",
      estados: [],
    },
    exito: {
      texto: "Lees sus pensamientos más vívidos y superficiales durante 10 turnos (1 minuto); mantenerlo cuesta una reacción o una acción simple cada turno. +2 en tus tiradas enfrentadas contra él: márcalo en la casilla «Mente leída»",
      estados: [],
    },
    fracaso: { texto: "Lo lees solo durante 1 turno (con el +2 en enfrentadas contra él ese turno: casilla «Mente leída»)", estados: [] },
    fracasoCritico: {
      texto: "No lees nada y percibe la anomalía: puede hacer una prueba libre, según sus conocimientos, para darse cuenta de que le han intentado leer la mente",
      estados: [],
    },
  },
  notas: [
    { texto: "El objetivo tiene que estar localizado; si no, primero Rastreo.", lugar: "tirada" },
    {
      texto: "En interacciones sociales puede valer +2 a Empatía, Manipulación o Negociación, o resolverse narrativamente (a criterio del máster).",
      lugar: "tirada",
    },
  ],
  casillasEnTiradas: [
    {
      alcances: ALCANCES_ENFRENTADAS,
      blancos: ["poderes_enfrentados", "dotes_enfrentadas"],
      condicion: { id: "psi_mente_leida", tipo: "toggle", etiqueta: "Mente leída (+2 contra el objetivo leído)", valorActivo: 2 },
    },
  ],
  motor: motorDeAccion(LEER_MENTE_ID, {
    propias: true,
    tercero: ["salv_voluntad"],
    extra: motorDeCasilla("numerico", ["grupo:Ataques", "grupo:Defensa", "poderes:enfrentada", "dotes:enfrentada", ...ENFRENTADAS_FIJAS]),
  }),
};

// Alerta: dos acciones (pasiva y activa) porque cambian alcance y unidades. Coste
// fijo, sin las rebajas de la tabla (Murillo: "mejorará en niveles altos, sin
// definir"; usuario, 2026-09-30). Desde nivel 4, ventaja y la casilla de +2 por
// combinarla con la alerta normal.
const ALERTA_PASIVA_ID = "psi_resonancia_alerta_pasiva";
const ALERTA_ACTIVA_ID = "psi_resonancia_alerta_activa";
const MAS_2_RESONANCIA_4 = (alcance: string) => ({
  etiqueta: "+2 por Resonancia 4 (combinada con tu alerta normal)",
  alcance,
  valor: 2,
  desdeNivelPoseido: 4,
});
const RESULTADOS_ALERTA: AccionPoder["resultados"] = {
  exito: {
    texto: "Reconoces la amenaza y sabes más o menos dónde está mientras siga en tu alcance: puede atacarte por sorpresa, pero nunca te pilla desprevenido",
    estados: [],
  },
  fracaso: { texto: "No percibes intenciones hostiles", estados: [] },
};
const OBJETIVO_TIRA_ALERTA = [
  { que: "Si está prevenido contra este tipo de alerta, opone Voluntad + Actitud como si fuera su sigilo" },
];
const NOTAS_ALERTA = [
  { texto: "Las zonas de interferencia suben la dificultad (+2, +4, +6).", lugar: "tirada" as const },
  { texto: "Localizado, puede seguir oculto con sigilo normal, pero ya no te pilla desprevenido.", lugar: "tirada" as const },
];

const ALERTA_PASIVA: AccionPoder = {
  ...SIN_EXTRAS,
  id: ALERTA_PASIVA_ID,
  label: "Alerta pasiva",
  desdeNivel: 1,
  economia: { tiempo: "Pasiva" },
  fatiga: 0,
  alcance: { base: 0, porNivelPoseido: 20 },
  objetivo: null,
  desplazamiento: null,
  resolucion: { tipo: "tirada", aplicado: "perspicacia", habilidad: "biociencia", dificultad: 6 },
  objetivoTira: OBJETIVO_TIRA_ALERTA,
  ejes: [receptor("Amenazas", true, false)],
  resultados: RESULTADOS_ALERTA,
  togglesPropios: [MAS_2_RESONANCIA_4(ALERTA_PASIVA_ID)],
  notas: [
    { texto: "Hace de tu alerta ordinaria: tírala cuando el máster pida percibir amenazas.", lugar: "tirada" },
    ...NOTAS_ALERTA,
  ],
  // «Funciona siempre y cuando el psiónico no se encuentre exhausto» (ps-06, usuario 2026-11-13:
  // atenuada y sin tirar).
  noFuncionaConFatiga: { umbral: "exhausto", motivo: "Exhausto: no funciona" },
  motor: motorDeAccion(ALERTA_PASIVA_ID, {
    propias: true,
    tercero: ["sigilo"],
    extra: [{ tipo: "habilitador", afecta: { modo: "accion_existente", id: ALERTA_PASIVA_ID }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" }],
  }),
};

const ALERTA_ACTIVA: AccionPoder = {
  ...ALERTA_PASIVA,
  // Solo la pasiva deja de funcionar exhausto.
  noFuncionaConFatiga: undefined,
  id: ALERTA_ACTIVA_ID,
  label: "Alerta activa",
  economia: "estandar",
  fatiga: 1,
  alcance: 1,
  unidades: { alcance: "km²" },
  resolucion: { tipo: "tirada", aplicado: "perspicacia", habilidad: "biociencia", dificultad: 8 },
  togglesPropios: [MAS_2_RESONANCIA_4(ALERTA_ACTIVA_ID)],
  notas: [
    { texto: "Amplía tu alerta a 1 km²; la dificultad 8 es para lo que queda fuera del alcance de la pasiva.", lugar: "tirada" },
    ...NOTAS_ALERTA,
  ],
  motor: motorDeAccion(ALERTA_ACTIVA_ID, { propias: true, tercero: ["sigilo"] }),
};

// Vínculo: sin tirada. "Punto de poder" = nivel en Resonancia (nivel 5 = 5 km²) y
// tantos aliados como fatiga se tenga (Murillo, 2026-09-29): 1 por aliado.
const VINCULO_ID = "psi_resonancia_vinculo";
const VINCULO: AccionPoder = {
  ...SIN_EXTRAS,
  id: VINCULO_ID,
  label: "Vínculo",
  desdeNivel: 1,
  economia: "compleja",
  fatiga: 1,
  alcance: { base: 0, porNivelPoseido: 1 },
  duracion: { base: 0, porNivelPoseido: 1 },
  unidades: { alcance: "km²", duracion: "minutos" },
  objetivo: { tipo: "aliado" },
  desplazamiento: null,
  resolucion: { tipo: "sin_dado" },
  objetivoTira: [],
  ejes: [],
  resultados: {},
  multiplesObjetivos: { texto: "Tantos aliados como fatiga tengas.", fatigaPorObjetivo: 1 },
  notas: [
    {
      texto: "Mientras dure, +1 a las salvaciones de Voluntad de todos los vinculados: tú, con la casilla «Vínculo activo» de tu salvación de Voluntad; los demás, díselo.",
      lugar: "tirada",
    },
    { texto: "Se benefician de tu alerta pasiva contra las amenazas que los incluyan.", lugar: "tirada" },
    {
      texto: "Como reacción, quien encuentre a un objetivo escondido puede avisar por el vínculo: un ataque por sorpresa pasa a normal, o un aliado desprevenido pasa a sorprendido.",
      lugar: "tirada",
    },
  ],
  casillasEnTiradas: [{ alcances: [tirada("salv_voluntad")], condicion: { id: "psi_vinculo_activo", tipo: "toggle", etiqueta: "Vínculo activo (+1)", valorActivo: 1 } }],
  // El +1 de los aliados es texto (objetivo_tercero, cerrado 2026-09-24).
  motor: motorDeAccion(VINCULO_ID, { propias: true, tercero: ["salv_voluntad"], extra: motorDeCasilla("numerico", ["salv_voluntad"]) }),
};

const RESONANCIA: Disciplina = {
  id: "resonancia",
  label: "Resonancia",
  rama: "metasensoria",
  requisito: null,
  porNivel: [
    { nivel: 1, alcance: 10, economia: "compleja", fatiga: 1 },
    { nivel: 2, alcance: 100, economia: { tiempo: "1 minuto" }, fatiga: 2 },
    { nivel: 3, alcance: 2000, economia: { tiempo: "1 minuto" }, fatiga: 3 },
    { nivel: 4, alcance: 10000, economia: { tiempo: "10 minutos" }, fatiga: 4 },
    { nivel: 5, alcance: 200000, economia: { tiempo: "10 minutos" }, fatiga: 6 },
    { nivel: 6, alcance: 1000000, economia: { tiempo: "1 hora" }, fatiga: 8 },
  ],
  reglas: [
    {
      id: "tabla_sustituye",
      texto: "El coste propio de cada acción es el del alcance local (1 km², nivel empleado 1); una fila de la tabla sustituye tipo de acción, fatiga y alcance.",
      aplica: "todas",
    },
    { id: "local_induccion", texto: "En alcance local se puede usar Inducción.", aplica: "todas" },
    {
      id: "barreras",
      texto: "Barreras de lenguaje o de biología y códigos encriptados suben la dificultad (la dice el máster).",
      aplica: "todas",
    },
  ],
  // Se acumulan hasta 0 (nivel 4 con Resonancia 6: 4 − 1 − 1 = 2).
  modificadoresFatiga: [
    { fuente: "Resonancia 3: niveles 1-2", alcance: { nivelEmpleadoMax: 2 }, desdeNivelPoseido: 3, op: "suma", valor: -1 },
    { fuente: "Resonancia 5: niveles 3-4", alcance: { nivelEmpleadoMin: 3, nivelEmpleadoMax: 4 }, desdeNivelPoseido: 5, op: "suma", valor: -1 },
    { fuente: "Resonancia 6: niveles 4-5", alcance: { nivelEmpleadoMin: 4, nivelEmpleadoMax: 5 }, desdeNivelPoseido: 6, op: "suma", valor: -1 },
  ],
  // Nivel 2: lo usado a nivel 1, incluido el local, baja un paso; nivel 4: el
  // nivel 2 pasa de 1 minuto a compleja; nivel 6: el nivel 4 dura 1 minuto.
  modificadoresEconomia: [
    { fuente: "Resonancia 2", desdeNivelPoseido: 2, alcance: { nivelEmpleado: 1 }, op: "baja_un_paso" },
    { fuente: "Resonancia 4", desdeNivelPoseido: 4, alcance: { nivelEmpleado: 2 }, op: "sustituye", valor: "compleja" },
    { fuente: "Resonancia 6", desdeNivelPoseido: 6, alcance: { nivelEmpleado: 4 }, op: "sustituye", valor: { tiempo: "1 minuto" } },
    { fuente: "Resonancia 4: Vínculo", desdeNivelPoseido: 4, alcance: { accion: VINCULO_ID }, op: "sustituye", valor: "estandar" },
  ],
  // Nivel 4: ventaja en toda tirada de alerta, también la normal ("Buscar /
  // percibir"), y +2 al combinarla con la alerta psiónica (usuario, 2026-09-29).
  bonosEnOtrasTiradas: [
    { etiqueta: "+2 por Resonancia 4 (combinada con tu alerta psiónica)", alcance: "alerta_activa", valor: 2, desdeNivelPoseido: 4 },
  ],
  ventajas: [
    {
      desdeNivelPoseido: 4,
      acciones: [ALERTA_PASIVA_ID, ALERTA_ACTIVA_ID, "alerta_activa"],
      condicion: "si puedes usar Resonancia sin impedimentos",
    },
  ],
  acciones: [SINCRONIA, MENSAJE_AGRESIVO, SUPERAR_BARRERA, RASTREO, LEER_MENTE, ALERTA_PASIVA, ALERTA_ACTIVA, VINCULO],
};

// ── Inducción ─────────────────────────────────────────────────────
// Prueba base según el objetivo: orgánico Expresión + Biociencia, sintético
// Perspicacia + Informática; siempre enfrentada, con los grados vistos desde el
// psiónico (si gana por 6+, el "fracaso crítico" del objetivo). Alcance 20 m ×
// nivel poseído, combinable con el alcance local de Resonancia; desde nivel 5,
// fuera de ese alcance con −4 (casilla).

const OBJETIVO_INDUCCION: EjePoder = {
  id: "receptor",
  label: "Objetivo",
  tipo: "opcion",
  opciones: [
    { id: "organico", label: "Orgánico", cambia: {} },
    {
      id: "sintetico",
      label: "Sintético",
      cambia: {
        resolucion: { aplicado: "perspicacia", habilidad: "tecnociencia", especialidad: "informatica" },
        objetivoTira: [{ que: "Resiste con Perspicacia + Informática; escribe su total como dificultad" }],
      },
    },
  ],
};

// Lo común a toda acción de Inducción con tirada; cada una pone coste, acción y grados.
const BASE_INDUCCION = {
  ...SIN_EXTRAS,
  desdeNivel: 1,
  alcance: { base: 0, porNivelPoseido: 20 },
  objetivo: { tipo: "unico" },
  desplazamiento: null,
  resolucion: { tipo: "enfrentada", aplicado: "expresion", habilidad: "biociencia" },
  objetivoTira: [
    { que: "Resiste con Voluntad + Actitud (o Voluntad + Biociencia si es un psiónico entrenado); escribe su total como dificultad" },
  ],
} satisfies Partial<AccionPoder>;

const NOTA_ALCANCE_INDUCCION = {
  texto: "Puedes combinarlo con el alcance local de Resonancia (1 km²).",
  lugar: "tirada",
} as const;

const fueraDeAlcanceLocal = (accion: string) => ({
  etiqueta: "Fuera del alcance local de Resonancia (−4)",
  alcance: accion,
  valor: -4,
  desdeNivelPoseido: 5,
});

const COMANDO_ID = "psi_induccion_comando";
const COMANDO: AccionPoder = {
  ...BASE_INDUCCION,
  id: COMANDO_ID,
  label: "Comando",
  economia: "estandar",
  fatiga: 1,
  ejes: [
    OBJETIVO_INDUCCION,
    {
      id: "uso",
      label: "Uso",
      tipo: "opcion",
      opciones: [
        { id: "orden", label: "Dar una orden", cambia: {} },
        {
          // Nivel 2: cuesta 1 y usa la prueba base (Murillo, 2026-09-29).
          id: "evitar_ataque",
          label: "Evitar un ataque",
          desdeNivel: 2,
          cambia: {
            economia: "reaccion",
            resultados: {
              critico: { texto: "No puede hacer ningún ataque en todo el turno", estados: [] },
              exito: { texto: "No hace ese ataque y lo pierde", estados: [] },
              fracaso: { texto: "Ataca, pero con −2 a la tirada", estados: [] },
              fracasoCritico: { texto: "Ataca sin impedimentos", estados: [] },
            },
            notas: [{ texto: "La orden solo puede servir para evitar una acción de ataque.", lugar: "tirada" }],
          },
        },
      ],
    },
    {
      id: "objetivos",
      label: "Objetivos",
      tipo: "opcion",
      opciones: [
        { id: "uno", label: "Uno", cambia: {} },
        {
          id: "varios",
          label: "Varios",
          desdeNivel: 3,
          cambia: { multiplesObjetivos: { texto: "La orden tiene que ser idéntica para todos.", fatigaPorObjetivo: 1 } },
        },
      ],
    },
  ],
  resultados: {
    critico: { texto: "Actúa bajo tu orden durante los próximos 10 turnos", estados: [] },
    exito: {
      texto: "Intenta cumplir la orden en su siguiente turno. Al acabar recupera el control sin ser del todo consciente de la manipulación; pasado 1 minuto lo recuerda (con posible confusión), y un estímulo que lo evoque se lo hace comprender al instante",
      estados: [],
    },
    fracaso: { texto: "Actúa libremente, pero con −2 a su siguiente tirada", estados: [] },
    fracasoCritico: { texto: "Actúa con total libertad, sin impedimentos", estados: [] },
  },
  togglesPropios: [fueraDeAlcanceLocal(COMANDO_ID)],
  notas: [
    NOTA_ALCANCE_INDUCCION,
    {
      texto: "Acciones extremas: si la orden atenta contra su supervivencia o la de un aliado, cada vez que vaya a cumplirla repite su salvación con +2 (+4 en casos drásticos); con éxito no la hace, con éxito crítico se libera.",
      lugar: "tirada",
    },
  ],
  motor: motorDeAccion(COMANDO_ID, { propias: true, tercero: ["salv_voluntad"] }),
};

// "Basta la acción compleja; los cambios profundos piden acción mantenida con
// concentración, incluso horas" (Murillo, 2026-09-29).
const RECONFIGURACION_ID = "psi_induccion_reconfiguracion";
const RECONFIGURACION: AccionPoder = {
  ...BASE_INDUCCION,
  id: RECONFIGURACION_ID,
  label: "Reconfiguración Mnemónica",
  desdeNivel: 3,
  economia: "compleja",
  fatiga: 2,
  ejes: [OBJETIVO_INDUCCION],
  resultados: {
    critico: {
      texto: "Reescritura parcial profunda: asume como verdaderos los recuerdos o datos falsos que implantas, de forma permanente o hasta recuperarlos con terapia o análisis técnico avanzado; puede cambiar notablemente su lealtad, cómo ve a un aliado o sus directrices básicas",
      estados: [],
    },
    exito: {
      texto: "Reescribes o emborronas un evento reciente (hasta 1 hora en orgánicos; los registros de las últimas 24 horas en sintéticos) y puedes implantar recuerdos falsos",
      estados: [],
    },
    fracaso: {
      texto: "Resiste la alteración profunda: solo nota una ligera desorientación y pierde el recuerdo del último minuto (con el estímulo adecuado, lo recupera)",
      estados: [],
    },
    fracasoCritico: { texto: "Sin efecto", estados: [] },
  },
  togglesPropios: [fueraDeAlcanceLocal(RECONFIGURACION_ID)],
  notas: [
    NOTA_ALCANCE_INDUCCION,
    { texto: "Los cambios profundos piden una acción mantenida con concentración, incluso de horas (a criterio del máster).", lugar: "tirada" },
  ],
  motor: motorDeAccion(RECONFIGURACION_ID, { propias: true, tercero: ["salv_voluntad"] }),
};

// Modulación: 1 de fatiga fijo (toda Inducción cuesta 1 salvo que diga otra cosa,
// usuario 2026-11-14), y en sus efectos "nivel de poder" = nivel EMPLEADO
// (excepción a la regla general, usuario 2026-09-30; el selector se mantiene). Qué efectos hay depende del nivel POSEÍDO ("adquiere").
// Grados desde el psiónico: su crítico = el fracaso crítico del objetivo.
const MODULACION_ID = "psi_induccion_modulacion";
const HIPOMANIA_ALIADO_ID = "psi_induccion_hipomania_aliado";

const RESISTE_ORGANICO = BASE_INDUCCION.objetivoTira[0];
const RESISTE_SINTETICO = { que: "Resiste con Perspicacia + Informática; escribe su total como dificultad" };
const SINTETICO: CambiosOpcion["resolucion"] = { aplicado: "perspicacia", habilidad: "tecnociencia", especialidad: "informatica" };
const SIN_EFECTO = { texto: "Sin efecto", estados: [] };
const grados = (critico: string, exito: string, fracaso: string): AccionPoder["resultados"] => ({
  critico: { texto: critico, estados: [] },
  exito: { texto: exito, estados: [] },
  fracaso: { texto: fracaso, estados: [] },
  fracasoCritico: SIN_EFECTO,
});

const EFECTOS_MODULACION: Opcion[] = [
  {
    id: "sopor",
    label: "Sopor",
    cambia: {
      resultados: grados(
        "Cae inconsciente. Despertarlo pide una acción física (zarandearlo, acción estándar), recibir daño o un estímulo potente; al volver en sí queda exhausto y confuso 1 turno y fatigado {nivel} turnos. Si nadie lo despierta, duerme hasta recuperarse u 8 horas. Si ya estaba exhausto, entra en coma",
        "Exhausto hasta el final de su próximo turno y fatigado 1d4 turnos",
        "Fatigado hasta el final de su próximo turno (exhausto si ya estaba fatigado; inconsciente si ya estaba exhausto)",
      ),
    },
  },
  {
    id: "miedo",
    label: "Miedo",
    cambia: {
      resultados: grados(
        "Paro cardíaco: tira Fortaleza para evitarlo. Si la supera, aterrorizado el próximo turno, asustado {nivel} turnos y confuso 1 turno; si falla, cae inconsciente y muere en 10 minutos si nadie lo estabiliza con primeros auxilios",
        "Aterrorizado el próximo turno y asustado {nivel} turnos",
        "Asustado hasta el final de su próximo turno (aterrorizado si ya lo estaba)",
      ),
      objetivoTira: [
        RESISTE_ORGANICO,
        { que: "Con tu crítico, salvación de Fortaleza contra el paro cardíaco", dificultad: { base: 5, porNivel: 1 } },
      ],
      notas: [{ texto: "Elige hacia qué dirige el miedo: tú, un objeto, un acceso o un aliado.", lugar: "tirada" }],
    },
  },
  {
    // Sin críticos en la prosa: el "fracaso crítico" del objetivo va dentro de su
    // fracaso (50 % y −4); su éxito crítico, sin texto, es como su éxito.
    id: "hipomania",
    label: "Hipomanía",
    cambia: {
      resultados: {
        critico: {
          texto: "1 turno con −1 a sus penalizadores por fatiga y +1 a salvaciones de Fortaleza, pero −4 en tiradas contra efectos emocionales y 50 % de fallo automático en acciones de concentración",
          estados: [],
        },
        exito: {
          texto: "1 turno con −1 a sus penalizadores por fatiga y +1 a salvaciones de Fortaleza, pero −2 en tiradas contra efectos emocionales y 20 % de fallo automático en acciones de concentración",
          estados: [],
        },
        fracaso: { texto: "−1 a sus penalizadores por fatiga y +1 a salvaciones de Fortaleza durante {nivel} turnos", estados: [] },
      },
      objetivoTira: [{ que: `${RESISTE_ORGANICO.que}. Si ya sufre estrés o excitación emocional, −1 a esta salvación` }],
    },
  },
  {
    id: "delirio",
    label: "Delirio",
    desdeNivel: 3,
    cambia: {
      resultados: grados(
        "Confuso crítico y con miedo {nivel*2} turnos: ve a todos como enemigos y, si no queda aterrorizado en su turno, ataca al más cercano. Pierde 1 de fatiga por turno",
        "Confusión y miedo durante {nivel} turnos",
        "Confusión y miedo hasta el final de su próximo turno",
      ),
    },
  },
  {
    id: "mania",
    label: "Manía",
    desdeNivel: 3,
    cambia: {
      resultados: grados(
        "Se abalanza furioso contra el blanco más cercano, ignorando órdenes complejas, {nivel*2} turnos; no puede esquivar ni bloquear y pierde 1 de fatiga por turno",
        "Se abalanza furioso contra el blanco más cercano, ignorando órdenes complejas, {nivel} turnos; no puede esquivar ni bloquear",
        "Pico de agresividad en su próximo turno: +1 al daño cuerpo a cuerpo, −2 a acciones defensivas y a salvaciones de Voluntad",
      ),
    },
  },
  {
    id: "cautiverio",
    label: "Cautiverio",
    desdeNivel: 5,
    cambia: {
      resultados: grados(
        "No puede hacer nada que implique movimiento durante {nivel*2} turnos y sufre un conato de fallo respiratorio: tira Fortaleza para evitar la asfixia",
        "−4 a Fuerza y Agilidad y movimiento básico de una casilla durante {nivel} turnos",
        "−1 a Fuerza o Agilidad y velocidad básica de 4 m hasta el final de su siguiente turno",
      ),
      objetivoTira: [
        RESISTE_ORGANICO,
        { que: "Con tu crítico, salvación de Fortaleza contra la asfixia", dificultad: { base: 6, porNivel: 1 } },
      ],
    },
  },
  {
    id: "latencia",
    label: "Latencia (sintético)",
    cambia: {
      resolucion: SINTETICO,
      resultados: grados(
        "Apagado de emergencia. Reactivarlo pide manipular su panel de arranque (acción compleja); al reiniciar, 1 turno como con tu éxito y después −1 operativo durante {nivel} turnos",
        "−2 a acciones físicas y de procesamiento; el primer turno solo puede hacer una acción simple o estándar y pierde la reacción; después, −1 durante {nivel} turnos",
        "−2 a acciones físicas y de procesamiento hasta el final de su próximo turno",
      ),
      objetivoTira: [RESISTE_SINTETICO],
    },
  },
  {
    id: "cisma",
    label: "Cisma Lógico (sintético)",
    cambia: {
      resolucion: SINTETICO,
      resultados: grados(
        "Bloqueo total: paralizado e indefenso {nivel} turnos. Cada turno puede tirar para salir del bucle; si lo consigue, o al acabarse el tiempo, pasa un turno como con tu éxito",
        "Descoordinado 1 turno: −6 a la iniciativa, mitad de velocidad y solo una acción simple o estándar por turno",
        "−6 a la iniciativa y sin acciones complejas en su turno",
      ),
      objetivoTira: [
        RESISTE_SINTETICO,
        { que: "Con tu crítico, cada turno: Perspicacia + Informática para salir del bloqueo", dificultad: { base: 6, porNivel: 1 } },
      ],
    },
  },
];

const MODULACION: AccionPoder = {
  ...BASE_INDUCCION,
  id: MODULACION_ID,
  label: "Modulación",
  economia: "compleja",
  fatiga: 1,
  ejes: [
    ejeNivelEmpleado(() => ({})),
    // "modo": la opción da nombre a la tirada ("Sopor (nivel 3)").
    { id: "modo", label: "Efecto", tipo: "opcion", opciones: EFECTOS_MODULACION },
    {
      id: "objetivos",
      label: "Objetivos",
      tipo: "opcion",
      opciones: [
        { id: "uno", label: "Uno", cambia: {} },
        {
          // "Como parte de una acción compleja", aunque ya tenga la rebaja a estándar.
          id: "varios",
          label: "Varios",
          desdeNivel: 4,
          cambia: { economia: "compleja", multiplesObjetivos: { texto: "El mismo estado para todos.", fatigaPorObjetivo: 1 } },
        },
      ],
    },
  ],
  ajustesPorNivelPoseido: [
    {
      desdeNivel: 6,
      opcion: { eje: "objetivos", opcion: "varios" },
      sobre: "multiplesObjetivos.texto",
      op: "sustituye",
      valor: "El mismo estado para todos. Con Inducción 6, hasta 6 víctimas no pagan fatiga extra: solo las que pasen de ahí.",
    },
  ],
  resultados: {},
  togglesPropios: [fueraDeAlcanceLocal(MODULACION_ID)],
  notas: [
    NOTA_ALCANCE_INDUCCION,
    { texto: "El objetivo tiene que poder percibir tu presencia de algún modo (o recibir tu enlace de red).", lugar: "tirada" },
  ],
  motor: motorDeAccion(MODULACION_ID, { propias: true, tercero: ["salv_voluntad"] }),
};

// Hipomanía sobre un aliado dispuesto: no tira, se aplica el éxito (usuario,
// 2026-09-29) — el de la prosa, que es el fracaso desde el lado del psiónico.
const HIPOMANIA_ALIADO: AccionPoder = {
  ...SIN_EXTRAS,
  id: HIPOMANIA_ALIADO_ID,
  label: "Hipomanía a un aliado",
  desdeNivel: 1,
  economia: "compleja",
  fatiga: 1,
  alcance: { base: 0, porNivelPoseido: 20 },
  objetivo: { tipo: "aliado" },
  desplazamiento: null,
  resolucion: { tipo: "sin_dado" },
  objetivoTira: [],
  ejes: [ejeNivelEmpleado(() => ({}))],
  resultados: {},
  notas: [
    { texto: "Aliado dispuesto, sin tirada: durante {nivel} turnos, −1 a sus penalizadores por fatiga y +1 a sus salvaciones de Fortaleza.", lugar: "tirada" },
    NOTA_ALCANCE_INDUCCION,
  ],
  motor: motorDeAccion(HIPOMANIA_ALIADO_ID, { propias: true }),
};

// Supresión: tirada normal de la prueba base contra 10 (no enfrentada: suele ir
// sobre un aliado). La duración del alivio depende del nivel poseído: 1 minuto;
// 10 × nivel minutos desde el 2; 30 × nivel desde el 4 (Murillo, 2026-09-29).
const SUPRESION_ID = "psi_induccion_supresion";
const ESTABILIZACION_ID = "psi_induccion_estabilizacion";

const OBJETIVO_SUPRESION: EjePoder = {
  id: "receptor",
  label: "Objetivo",
  tipo: "opcion",
  opciones: [
    { id: "organico", label: "Orgánico", cambia: {} },
    { id: "sintetico", label: "Sintético", cambia: { resolucion: SINTETICO } },
  ],
};

const SUPRESION: AccionPoder = {
  ...SIN_EXTRAS,
  id: SUPRESION_ID,
  label: "Supresión",
  desdeNivel: 1,
  economia: "compleja",
  fatiga: 1,
  alcance: { base: 0, porNivelPoseido: 20 },
  duracion: { manual: "1 minuto" },
  unidades: { duracion: "minutos" },
  objetivo: { tipo: "unico" },
  desplazamiento: null,
  resolucion: { tipo: "tirada", aplicado: "expresion", habilidad: "biociencia", dificultad: 10 },
  objetivoTira: [],
  ejes: [
    OBJETIVO_SUPRESION,
    {
      id: "uso",
      label: "Uso",
      tipo: "opcion",
      opciones: [
        { id: "reducir", label: "Reducir penalizadores", cambia: {} },
        {
          id: "salvacion",
          label: "+2 a una salvación",
          cambia: {
            duracion: null,
            resultados: {
              exito: { texto: "+2 a su salvación para frenar el empeoramiento de la afección o del fallo técnico", estados: [] },
              fracaso: { texto: "Sin efecto", estados: [] },
            },
          },
        },
        {
          id: "liberar",
          label: "Liberar del todo",
          desdeNivel: 2,
          cambia: {
            duracion: { manual: "este turno" },
            resultados: {
              exito: {
                texto: "Queda libre de todos los penalizadores por efectos durante este turno; al acabarlo, los recupera todos",
                estados: [],
              },
              fracaso: { texto: "Sin efecto", estados: [] },
            },
          },
        },
      ],
    },
  ],
  ajustesPorNivelPoseido: [
    { desdeNivel: 2, opcion: { eje: "uso", opcion: "reducir" }, sobre: "duracion", op: "sustituye", valor: { base: 0, porNivelPoseido: 10 } },
    { desdeNivel: 4, opcion: { eje: "uso", opcion: "reducir" }, sobre: "duracion", op: "sustituye", valor: { base: 0, porNivelPoseido: 30 } },
  ],
  resultados: {
    critico: { texto: "Reduce en 2 sus penalizadores por estados mientras dure", estados: [] },
    exito: { texto: "Reduce en 1 sus penalizadores por estados mientras dure", estados: [] },
    fracaso: { texto: "Sin efecto", estados: [] },
  },
  togglesPropios: [fueraDeAlcanceLocal(SUPRESION_ID)],
  notas: [
    { texto: "Sobre los circuitos del dolor de un orgánico o los búferes de diagnóstico de un sintético. Los penalizadores, a mano.", lugar: "tirada" },
    NOTA_ALCANCE_INDUCCION,
  ],
  motor: motorDeAccion(SUPRESION_ID, { propias: true }),
};

// Estado «Estabilizado» (Estabilización, mitigar; usuario 2026-10-28): la tirada tiene
// dificultad fija, así que la app conoce el resultado y, al superarla, lo pone sobre el
// psiónico (estadosDelResultado, usoPoder.ts) con el grado del resultado y del tramo de nivel.
// Reduce los penalizadores de tirada de los estados que el psiónico tenía al usarla
// (EstadoActivo.cubre), cada uno por separado y sin pasar de 0; los que lleguen después, no
// (prosa de nv6). Desde nv4, además fuera heridas y fatiga. Lo aplica resolverFicha
// (estabilizacionPuesta, estados.ts).
export const ESTADO_ESTABILIZADO_ID = "psi_estabilizado";
// `porEstado` 99 = todos (nv6).
const GRADOS_ESTABILIZADO = [
  { id: "exito", label: "Éxito", porEstado: 1, umbrales: false },
  { id: "critico", label: "Crítico", porEstado: 2, umbrales: false },
  { id: "exito_nv4", label: "Éxito, nivel 4", porEstado: 1, umbrales: true },
  { id: "critico_nv4", label: "Crítico, nivel 4", porEstado: 2, umbrales: true },
  { id: "exito_nv6", label: "Éxito, nivel 6", porEstado: 99, umbrales: true },
  { id: "critico_nv6", label: "Crítico, nivel 6", porEstado: 99, umbrales: true },
] as const;

export function reduccionDeGradoEstabilizado(gradoId: string): { porEstado: number; umbrales: boolean } | null {
  const g = GRADOS_ESTABILIZADO.find((x) => x.id === gradoId);
  return g ? { porEstado: g.porEstado, umbrales: g.umbrales } : null;
}

const ESTADO_ESTABILIZADO: Estado = {
  id: ESTADO_ESTABILIZADO_ID,
  label: "Estabilizado",
  resumen: "Estabilización sobre uno mismo: menos penalizadores de los estados que tenías al usarla, mientras dure.",
  grados: GRADOS_ESTABILIZADO.map((g) => ({
    id: g.id,
    label: g.label,
    modificadores: [],
    detalle: [
      (g.porEstado >= 99
        ? "Sin penalizadores de los estados que tenías al usarla"
        : `−${g.porEstado} a cada penalizador de los estados que tenías al usarla (sin pasar de 0)`) +
        (g.umbrales ? ", y sin los de heridas ni fatiga." : "."),
      "Los estados que te pongan después penalizan entero.",
    ],
    duracionTurnos: null,
  })),
};

// El estado de cada resultado de mitigar, por tramo de nivel poseído. Duración de la prosa: nv1
// "1 minuto" (10 turnos, 1 minuto = 10 turnos como en Leer Mente o la Regeneración), nv2-3 "10
// minutos por nivel de poder" (100 turnos por nivel poseído), nv4+ "30 minutos", que es una
// escena (una hora = una escena; usuario, 2026-10-28).
const estabilizadoAlSuperar = (grado: string, duracion: Valor, escena = false): ResultadoPoder["estados"] => [
  { estado: ESTADO_ESTABILIZADO_ID, grado, duracion, sobre: "propio", apuntaEstados: true, ...(escena && { escena: true as const }) },
];
const ajusteEstabilizado = (desdeNivel: number, grado: "exito" | "critico", sufijo: string, duracion: Valor, escena = false) => ({
  desdeNivel,
  opcion: { eje: "uso", opcion: "mitigar" },
  sobre: `resultados.${grado}.estados`,
  op: "sustituye" as const,
  valor: estabilizadoAlSuperar(`${grado}${sufijo}`, duracion, escena),
});

// Estabilización: la Supresión sobre uno mismo, dificultad 6, 1 de fatiga
// (usuario, 2026-09-29). Duraciones tal cual la prosa (10 y 30 minutos, sin "×
// nivel"). El bonificador a la salvación va en dos pasos (usuario, 2026-09-30): se
// tira esta acción y, si sale, se marca la casilla de las salvaciones
// (`bonosEnOtrasTiradas` de la disciplina), que no cobra nada.
const ESTABILIZACION: AccionPoder = {
  ...SIN_EXTRAS,
  id: ESTABILIZACION_ID,
  label: "Estabilización",
  desdeNivel: 1,
  economia: "reaccion",
  fatiga: 1,
  alcance: null,
  duracion: { manual: "1 minuto" },
  objetivo: { tipo: "propio" },
  desplazamiento: null,
  resolucion: { tipo: "tirada", aplicado: "expresion", habilidad: "biociencia", dificultad: 6 },
  objetivoTira: [],
  ejes: [
    {
      id: "economia",
      label: "Acción",
      tipo: "opcion",
      opciones: [
        { id: "reaccion", label: "Reacción", cambia: {} },
        { id: "simple", label: "Simple", cambia: { economia: "simple" } },
      ],
    },
    {
      id: "uso",
      label: "Uso",
      tipo: "opcion",
      opciones: [
        {
          id: "mitigar",
          label: "Mitigar penalizadores",
          cambia: {
            notas: [
              {
                texto: "Si la superas, se te pone el estado «Estabilizado»: reduce los penalizadores de los estados que tienes ahora, no los que te pongan después.",
                lugar: "tirada",
              },
            ],
          },
        },
        {
          id: "salvacion",
          label: "Bonificador a una salvación",
          cambia: {
            duracion: null,
            resultados: {
              exito: { texto: "+2 a tu salvación: márcalo en la casilla «+2 por Estabilización» de la salvación", estados: [] },
              fracaso: { texto: "Sin bonificador", estados: [] },
            },
          },
        },
      ],
    },
  ],
  ajustesPorNivelPoseido: [
    { desdeNivel: 2, opcion: { eje: "uso", opcion: "mitigar" }, sobre: "duracion", op: "sustituye", valor: { manual: "10 minutos por nivel" } },
    { desdeNivel: 4, opcion: { eje: "uso", opcion: "mitigar" }, sobre: "duracion", op: "sustituye", valor: { manual: "30 minutos (una escena)" } },
    // El estado «Estabilizado» de cada tramo (grado y duración); en salvación no hay estado.
    ajusteEstabilizado(2, "exito", "", { base: 0, porNivelPoseido: 100 }),
    ajusteEstabilizado(2, "critico", "", { base: 0, porNivelPoseido: 100 }),
    ajusteEstabilizado(4, "exito", "_nv4", 0, true),
    ajusteEstabilizado(4, "critico", "_nv4", 0, true),
    ajusteEstabilizado(6, "exito", "_nv6", 0, true),
    ajusteEstabilizado(6, "critico", "_nv6", 0, true),
    {
      desdeNivel: 4,
      opcion: { eje: "uso", opcion: "mitigar" },
      sobre: "resultados.exito.texto",
      op: "sustituye",
      valor: "Reduces en 1 tus penalizadores por estados mientras dure y omites por completo los de daño y fatiga (se te pone «Estabilizado»)",
    },
    {
      desdeNivel: 4,
      opcion: { eje: "uso", opcion: "mitigar" },
      sobre: "resultados.critico.texto",
      op: "sustituye",
      valor: "Reduces en 2 tus penalizadores por estados mientras dure y omites por completo los de daño y fatiga (se te pone «Estabilizado»)",
    },
    {
      desdeNivel: 6,
      opcion: { eje: "uso", opcion: "mitigar" },
      sobre: "resultados.exito.texto",
      op: "sustituye",
      valor: "Eliminas por completo tus penalizadores por estados mientras dure (no los que llegues a sufrir después) y omites los de daño y fatiga (se te pone «Estabilizado»)",
    },
    {
      desdeNivel: 6,
      opcion: { eje: "uso", opcion: "mitigar" },
      sobre: "resultados.critico.texto",
      op: "sustituye",
      valor: "Eliminas por completo tus penalizadores por estados mientras dure (no los que llegues a sufrir después) y omites los de daño y fatiga (se te pone «Estabilizado»)",
    },
    // El +3/+4 solo como reacción (prosa de nv4 y nv6); como acción simple sigue el +2.
    {
      desdeNivel: 4,
      opcion: [
        { eje: "uso", opcion: "salvacion" },
        { eje: "economia", opcion: "reaccion" },
      ],
      sobre: "resultados.exito.texto",
      op: "sustituye",
      valor: "+3 a tu salvación: márcalo en la casilla «+3 por Estabilización» de la salvación",
    },
    {
      desdeNivel: 6,
      opcion: [
        { eje: "uso", opcion: "salvacion" },
        { eje: "economia", opcion: "reaccion" },
      ],
      sobre: "resultados.exito.texto",
      op: "sustituye",
      valor: "+4 a tu salvación: márcalo en la casilla «+4 por Estabilización» de la salvación",
    },
  ],
  // Mitigar: al superarla, el estado «Estabilizado» sobre el psiónico (se pone solo; ver
  // ESTADO_ESTABILIZADO). Éxito −1 y crítico −2 a cada penalizador de los estados que tenía;
  // desde nv4 además fuera heridas y fatiga; en nv6 fuera todos. El +2/+3/+4 a la salvación
  // sigue en `bonosEnOtrasTiradas`.
  resultados: {
    critico: { texto: "Reduces en 2 tus penalizadores por estados mientras dure (se te pone «Estabilizado»)", estados: estabilizadoAlSuperar("critico", 10) },
    exito: { texto: "Reduces en 1 tus penalizadores por estados mientras dure (se te pone «Estabilizado»)", estados: estabilizadoAlSuperar("exito", 10) },
    fracaso: { texto: "Sin efecto", estados: [] },
  },
  notas: [],
  motor: motorDeAccion(ESTABILIZACION_ID, {
    propias: true,
    extra: [{ tipo: "resolucion", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "siempre_activo", estado: "construido" }],
  }),
};

const estabilizacionEnSalvacion = (valor: number, desde: number, hasta?: number, como?: string) => ({
  etiqueta: `+${valor} por Estabilización (${como ? `${como}, ` : ""}si la superaste)`,
  alcance: "Salvaciones",
  valor,
  desdeNivelPoseido: desde,
  hastaNivelPoseido: hasta,
});

const INDUCCION: Disciplina = {
  id: "induccion",
  label: "Inducción",
  rama: "metasensoria",
  requisito: { disciplina: "resonancia", nivel: 1 },
  porNivel: [],
  reglas: [
    {
      id: "prueba_base",
      texto: "Prueba base: orgánico Expresión + Biociencia, contra Voluntad + Actitud (o + Biociencia si es psiónico entrenado); sintético Perspicacia + Informática, contra Perspicacia + Informática.",
      aplica: "todas",
    },
  ],
  modificadoresFatiga: [],
  // Nivel 2: Modulación como estándar (la de un objetivo; varios sigue compleja).
  modificadoresEconomia: [
    {
      fuente: "Inducción 2",
      desdeNivelPoseido: 2,
      alcance: { accion: MODULACION_ID, opcion: { eje: "objetivos", opcion: "uno" } },
      op: "sustituye",
      valor: "estandar",
    },
    { fuente: "Inducción 2", desdeNivelPoseido: 2, alcance: { accion: HIPOMANIA_ALIADO_ID }, op: "sustituye", valor: "estandar" },
  ],
  bonosEnOtrasTiradas: [
    // Desde nv4, el +3/+4 es solo como reacción; como acción simple sigue el +2. Dos casillas
    // excluyentes (la exclusión, solo en la etiqueta: modelado-psionica.md, error #20).
    estabilizacionEnSalvacion(2, 1, 3),
    estabilizacionEnSalvacion(2, 4, undefined, "como acción simple"),
    estabilizacionEnSalvacion(3, 4, 5, "como reacción"),
    estabilizacionEnSalvacion(4, 6, undefined, "como reacción"),
  ],
  ventajas: [],
  acciones: [COMANDO, MODULACION, HIPOMANIA_ALIADO, RECONFIGURACION, SUPRESION, ESTABILIZACION],
};

// ── Hipercognición ────────────────────────────────────────────────
// Perspicacia + Tecnociencia (Física). Sondeo y Retrocognición: el tramo
// (distancia / tiempo transcurrido) fija tiempo, fatiga y dificultad sugerida (el
// valor bajo del rango; usuario, 2026-09-30); la interferencia se suma. El nivel
// poseído solo rebaja: −1 de dificultad en nivel 4 y −2 en nivel 6 (Murillo: el 2
// no rebaja) y un paso de tiempo en los niveles 3 y 5. "Nivel de poder" = poseído.
const SONDEO_ID = "psi_hipercognicion_sondeo";
const RETROCOGNICION_ID = "psi_hipercognicion_retrocognicion";
const PRECOGNICION_ID = "psi_hipercognicion_precognicion";

const TIRADA_HIPERCOGNICION = { tipo: "tirada", aplicado: "perspicacia", habilidad: "tecnociencia", especialidad: "fisica" } as const;

const ejeInterferencia = (etiquetas: [string, string, string, string]): EjePoder => ({
  id: "interferencia",
  label: "Interferencia",
  tipo: "opcion",
  opciones: etiquetas.map((label, i): Opcion => ({
    id: `i${i * 2}`,
    label,
    cambia: {},
    ...(i > 0 && { suma: { "resolucion.dificultad": i * 2 } }),
  })),
});

const REBAJA_DIFICULTAD_HIPERCOGNICION: AccionPoder["ajustesPorNivelPoseido"] = [
  { desdeNivel: 4, sobre: "resolucion.dificultad", op: "suma", valor: -1 },
  { desdeNivel: 6, sobre: "resolucion.dificultad", op: "suma", valor: -1 },
];

// Crítico del Sondeo (ps-07, usuario 2026-11-13): la visión es un estado propio visible en la
// ficha («Sondeo No-Local»), que dura lo que el poder y guarda la fatiga del uso; su botón
// «Prolongar un turno» la vuelve a cobrar y suma un turno (prolongarEstado).
export const ESTADO_SONDEO_ID = "psi_sondeo_no_local";
const ESTADO_SONDEO: Estado = {
  id: ESTADO_SONDEO_ID,
  label: "Sondeo No-Local",
  resumen:
    "Visión remota del crítico del Sondeo No-Local: información perfecta y nítida (audio, visual, térmico) mientras dure, " +
    "ignorando coberturas o interferencias ópticas de baja intensidad.",
  quitarJugador: "Terminar sondeo",
  prolongable: { etiqueta: "Prolongar un turno", turnos: 1 },
  grados: [
    {
      id: "activo",
      label: "Sondeo No-Local",
      modificadores: [],
      detalle: ["Para alargarla un turno, «Prolongar un turno»: pagas la misma fatiga que el sondeo, sin volver a tirar."],
      duracionTurnos: null,
    },
  ],
};

// Fracaso crítico del Sondeo: 1 de daño mental por punto de fatiga empleado; cada
// tramo pone el suyo.
const resultadosSondeo = (fatiga: number): AccionPoder["resultados"] => ({
  critico: {
    texto: "Información perfecta y nítida (audio, visual, térmico) mientras dure, ignorando coberturas o interferencias ópticas de baja intensidad. Se te pone «Sondeo No-Local»: desde ese estado puedes prolongarla pagando la misma fatiga cada turno, sin volver a tirar",
    // La duración es la del poder (nivel turnos; 10 desde nivel 3: ajustesPorNivelPoseido).
    estados: [{ estado: ESTADO_SONDEO_ID, duracion: { base: 0, porNivelPoseido: 1 }, sobre: "propio", valor: "fatiga" }],
  },
  exito: {
    texto: "Imagen general precisa (distribución de enemigos, accesos, elementos clave) mientras dure, sin poder prolongarla; con un leve desfase de segundos y parpadeos que pueden alterar el orden de lo que ves",
    estados: [],
  },
  fracaso: { texto: "No consigues ver nada y puedes quedar aturdido: salvación de Fortaleza contra 8", estados: [] },
  fracasoCritico: {
    texto: `Desorientación dimensional: recibes ${fatiga} de daño mental y salvación de Fortaleza contra la dificultad de la prueba o quedas aturdido`,
    estados: [],
    danio: { valor: fatiga, categoria: "mental", sobre: "propio" },
  },
});

const tramoSondeo = (
  id: string,
  label: string,
  dificultad: number,
  economia: Economia,
  fatiga: number,
  fraccion: number,
): Opcion => ({
  id,
  label,
  cambia: {
    economia,
    fatiga,
    alcance: { alcanceDe: "resonancia", fraccion },
    resolucion: { dificultad },
    resultados: resultadosSondeo(fatiga),
  },
});

// Duración (errata de Murillo): nivel turnos; desde nivel 3, 1 minuto = 10 turnos (usuario,
// 2026-09-30: la línea de nivel 3 alarga la duración). Solo el crítico se prolonga.
const SONDEO: AccionPoder = {
  ...SIN_EXTRAS,
  id: SONDEO_ID,
  label: "Sondeo No-Local",
  desdeNivel: 1,
  economia: "compleja",
  fatiga: 1,
  alcance: 1,
  duracion: { base: 0, porNivelPoseido: 1 },
  unidades: { alcance: "km²", duracion: "turnos" },
  objetivo: null,
  desplazamiento: null,
  resolucion: { ...TIRADA_HIPERCOGNICION, dificultad: 6 },
  objetivoTira: [],
  ejes: [
    {
      id: "distancia",
      label: "Distancia",
      tipo: "opcion",
      opciones: [
        { id: "local", label: "Local de Resonancia", cambia: {} },
        tramoSondeo("cuarto", "¼ de tu Resonancia", 8, { tiempo: "1 minuto" }, 1, 0.25),
        tramoSondeo("mitad", "½ de tu Resonancia", 10, { tiempo: "10 minutos" }, 2, 0.5),
        tramoSondeo("maximo", "Todo tu alcance", 12, { tiempo: "1 hora" }, 4, 1),
      ],
    },
    ejeInterferencia(["Abierto o civil", "Apantallado +2", "Militar +4", "Supresión cuántica +6"]),
  ],
  ajustesPorNivelPoseido: [
    ...REBAJA_DIFICULTAD_HIPERCOGNICION,
    { desdeNivel: 3, sobre: "duracion", op: "sustituye", valor: 10 },
    { desdeNivel: 3, sobre: "resultados.critico.estados.0.duracion", op: "sustituye", valor: 10 },
  ],
  resultados: resultadosSondeo(1),
  notas: [
    { texto: "Requiere concentración. Dificultad sugerida: el valor bajo del tramo (6-7, 8-9, 10-11, 12+); súbela si el máster dice más.", lugar: "tirada" },
    { texto: "La supresión cuántica activa puede dejar el objetivo bloqueado sin una brecha previa.", lugar: "tirada" },
  ],
  motor: motorDeAccion(SONDEO_ID, {
    propias: true,
    // «Prolongar un turno» en el estado del crítico: cobra la fatiga del uso, sin tirar.
    extra: [{ tipo: "coste", afecta: { modo: "accion_existente", id: SONDEO_ID }, mecanismo: "accion_sin_equipo", estado: "construido" }],
  }),
};

const tramoRetro = (id: string, label: string, dificultad: number, economia: Economia, fatiga: number): Opcion => ({
  id,
  label,
  cambia: { economia, fatiga, resolucion: { dificultad } },
});

const RETROCOGNICION: AccionPoder = {
  ...SIN_EXTRAS,
  id: RETROCOGNICION_ID,
  label: "Retrocognición",
  desdeNivel: 1,
  economia: "compleja",
  fatiga: 1,
  alcance: null,
  unidades: { area: "m de radio" },
  objetivo: { tipo: "propio", area: { base: 0, porNivelPoseido: 10 } },
  desplazamiento: null,
  resolucion: { ...TIRADA_HIPERCOGNICION, dificultad: 6 },
  objetivoTira: [],
  ejes: [
    {
      id: "tiempo",
      label: "Tiempo transcurrido",
      tipo: "opcion",
      opciones: [
        { id: "hora", label: "Menos de 1 hora", cambia: {} },
        tramoRetro("dia", "Últimas 24 horas", 9, { tiempo: "1 minuto" }, 1),
        tramoRetro("semana", "Hasta 1 semana", 12, { tiempo: "10 minutos" }, 2),
        tramoRetro("mas", "Más de una semana", 15, { tiempo: "1 hora" }, 4),
      ],
    },
    ejeInterferencia(["Sellado", "Tránsito +2", "Alterado +4", "Arrasado +6"]),
  ],
  ajustesPorNivelPoseido: REBAJA_DIFICULTAD_HIPERCOGNICION,
  resultados: {
    critico: {
      texto: "El eco llega con máxima precisión: puedes pausar, rebobinar y examinar la secuencia fotograma a fotograma, con identidades, palabras exactas, códigos y detalles nítidos",
      estados: [],
    },
    exito: {
      texto: "Ves el flujo principal de lo que pasó (quiénes estuvieron, hacia dónde fueron, las acciones clave), con lagunas o estática en detalles y audio",
      estados: [],
    },
    fracaso: { texto: "Eco difuso: poca información útil y un leve mareo; salvación de Voluntad contra 6 o quedas aturdido", estados: [] },
    // Aturdido sin salvación: el grado "fracaso" del estado; sin salvación cuenta como
    // fallarla (usuario, 2026-10-28).
    fracasoCritico: {
      texto: "Contaminación mnemónica: tomas por cierta una superposición errónea de datos y quedas aturdido 1 turno (se te pone solo)",
      estados: [{ estado: "aturdido", grado: "fracaso", duracion: 1, sobre: "propio" }],
    },
  },
  notas: [
    { texto: "Solo lo que pasó dentro de la burbuja. Dificultad sugerida: el valor bajo del tramo (6-8, 9-11, 12-14, 15+).", lugar: "tirada" },
    { texto: "Con el escenario arrasado, el rastro puede estar disipado del todo (a criterio del máster).", lugar: "tirada" },
  ],
  // El Aturdido del fracaso crítico: estado propio que pone la app (efectosDelResultado).
  motor: motorDeAccion(RETROCOGNICION_ID, {
    propias: true,
    extra: [{ tipo: "numerico", afecta: { modo: "accion_existente", id: "grupo:Defensa" }, mecanismo: "siempre_activo", estado: "construido" }],
  }),
};

// Precognición: los bonos y penalizadores, con el selector «Precognición» de ataques y
// defensas (P1, 2026-10-28; antes a mano). Las salvaciones no cuentan como tiradas
// defensivas; el fracaso crítico dura 1 turno (Murillo, 2026-09-29).
const PRECOGNICION: AccionPoder = {
  ...SIN_EXTRAS,
  id: PRECOGNICION_ID,
  label: "Precognición",
  desdeNivel: 1,
  economia: "estandar",
  fatiga: 1,
  alcance: null,
  duracion: { base: 0, porNivelPoseido: 1 },
  unidades: { area: "m de radio", duracion: "turnos" },
  objetivo: { tipo: "propio", area: { base: 0, porNivelPoseido: 10 } },
  desplazamiento: null,
  resolucion: { ...TIRADA_HIPERCOGNICION, dificultad: 8 },
  objetivoTira: [],
  ejes: [],
  resultados: {
    critico: {
      texto: "+3 en tiradas defensivas contra ataques hechos dentro de la burbuja y en ofensivas contra objetivos dentro; +2 fuera. Ignoras el primer nivel de cobertura (salvo total) y tienes una segunda reacción por turno",
      estados: [],
    },
    exito: { texto: "+2 en tiradas defensivas y ofensivas dentro de la burbuja; +1 fuera", estados: [] },
    fracaso: { texto: "Dudas entre futuros: −1 en tus acciones defensivas y ofensivas el siguiente turno", estados: [] },
    fracasoCritico: {
      texto: "Parálisis por exceso de futuros durante 1 turno: −2 en defensivas y ofensivas, sin reacción y a mitad de velocidad. Al acabar el turno recibes 1 de daño mental y tiras Voluntad contra 8 o quedas confuso",
      estados: [],
      danio: { valor: 1, categoria: "mental", sobre: "propio" },
    },
  },
  notas: [
    {
      texto: "Mientras dure, marca el resultado en el selector «Precognición» de tus ataques, poderes de ataque y defensas (el fracaso, solo el turno siguiente). Las salvaciones no cuentan como tiradas defensivas.",
      lugar: "tirada",
    },
    { texto: "Interferencias físicas o electromagnéticas masivas suben la dificultad (la dice el máster).", lugar: "tirada" },
  ],
  casillasEnTiradas: [
    {
      alcances: [grupo("Ataques"), grupo("Defensa")],
      blancos: ["poderes_de_ataque"],
      condicion: {
        id: "psi_precognicion",
        tipo: "opcion",
        etiqueta: "Precognición",
        porDefecto: "no",
        opciones: [
          { id: "no", etiqueta: "No", valor: 0, sinValor: true },
          { id: "critico_dentro", etiqueta: "Crítico, dentro de la burbuja", valor: 3 },
          { id: "critico_fuera", etiqueta: "Crítico, fuera", valor: 2 },
          { id: "exito_dentro", etiqueta: "Éxito, dentro de la burbuja", valor: 2 },
          { id: "exito_fuera", etiqueta: "Éxito, fuera", valor: 1 },
          { id: "fracaso", etiqueta: "Fracaso (turno siguiente)", valor: -1 },
          { id: "fracaso_critico", etiqueta: "Fracaso crítico (1 turno)", valor: -2 },
        ],
      },
    },
  ],
  // Los poderes de ataque (blanco "poderes_de_ataque": Proyección, Singularidad, Anclaje) son
  // tiradas ofensivas: también llevan el selector.
  motor: motorDeAccion(PRECOGNICION_ID, { propias: true, extra: motorDeCasilla("numerico", ["grupo:Ataques", "grupo:Defensa", "poderes:ataque"]) }),
};

const HIPERCOGNICION: Disciplina = {
  id: "hipercognicion",
  label: "Hipercognición",
  rama: "metasensoria",
  requisito: { disciplina: "resonancia", nivel: 2 },
  porNivel: [],
  reglas: [
    {
      id: "tramos",
      texto: "En Sondeo y Retrocognición el tramo fija tiempo, fatiga y dificultad; el nivel solo rebaja tiempos y dificultad.",
      aplica: [SONDEO_ID, RETROCOGNICION_ID],
    },
  ],
  modificadoresFatiga: [],
  // Niveles 3 y 5: un paso de tiempo cada uno (1 hora → 10 minutos → 1 minuto →
  // compleja → estándar → simple; Murillo: el local llega a simple en el 5, pero solo en
  // Sondeo). Retrocognición se queda en estándar: «de compleja a estándar (mínimo tiempo
  // posible)» (modelado-psionica.md, error #4).
  modificadoresEconomia: [
    { accion: SONDEO_ID, minimo: undefined },
    { accion: RETROCOGNICION_ID, minimo: "estandar" as const },
  ].flatMap(({ accion, minimo }) => [
    { fuente: "Hipercognición 3", desdeNivelPoseido: 3, alcance: { accion }, op: "baja_un_paso" as const, ...(minimo && { minimo }) },
    { fuente: "Hipercognición 5", desdeNivelPoseido: 5, alcance: { accion }, op: "baja_un_paso" as const, ...(minimo && { minimo }) },
  ]),
  bonosEnOtrasTiradas: [],
  ventajas: [],
  acciones: [SONDEO, PRECOGNICION, RETROCOGNICION],
};

// ── Traslación ────────────────────────────────────────────────────
// La fatiga de Anclaje y Trasladar no depende del movimiento sino de la carga o
// el alcance: se paga la fila del nivel empleado de la tabla (porNivel). "Nivel
// de poder" a secas (duraciones, velocidades, Proyección, Sensor) = poseído.

const ANCLAJE_ID = "psi_traslacion_anclaje";
const TRASLADAR_ID = "psi_traslacion_trasladar";

const ANCLAJE: AccionPoder = {
  ...SIN_EXTRAS,
  id: ANCLAJE_ID,
  label: "Anclaje",
  desdeNivel: 1,
  economia: "estandar",
  fatiga: "tabla",
  alcance: "tabla",
  duracion: { base: 0, porNivelPoseido: 1 },
  unidades: { duracion: "turnos" },
  objetivo: { tipo: "unico" },
  desplazamiento: null,
  // La prosa lo trata como ataque a distancia sin daño (usuario, 2026-09-30): el
  // objetivo esquiva; lo enfrentado es luego el escape. Ofensivo (Precognición).
  resolucion: { tipo: "tirada", aplicado: "perspicacia", habilidad: "tecnociencia", especialidad: "fisica" },
  contraLaDefensa: true,
  objetivoTira: [
    { que: "Esquiva con Reflejos + Atletismo contra el ataque a distancia" },
    {
      que: "Si queda anclado, para escapar: reacción o acción simple con Fortaleza + Atletismo, enfrentada a tu Perspicacia + Física (oponerte no te cuesta fatiga)",
    },
    {
      que: "Si tiene Traslación, puede resistir con Duelo de Métrica: Perspicacia + Física enfrentada como reacción o acción simple, por 1 de fatiga (gratis si su Traslación es 2 niveles mayor que la tuya)",
    },
  ],
  ejes: [
    ejeNivelEmpleado(() => ({})),
    {
      id: "objetivos",
      label: "Objetivos",
      tipo: "opcion",
      opciones: [
        { id: "uno", label: "Uno", cambia: {} },
        {
          id: "varios",
          label: "Varios a la vez",
          cambia: {
            economia: "compleja",
            multiplesObjetivos: {
              texto: "Todos dentro de tu alcance y de la carga máxima, contada como carga total.",
            },
          },
        },
        {
          id: "anadir",
          label: "Añadir uno más",
          cambia: {
            notas: [{ texto: "Añades un objetivo a los que ya mantienes anclados; mantener a varios cuesta una acción estándar por turno.", lugar: "tirada" }],
          },
        },
      ],
    },
  ],
  resultados: {
    exito: {
      texto: "Anclado: queda paralizado {duracion} turnos o hasta que se libere; solo puede hacer acciones mentales o intentar escapar",
      estados: [],
    },
    fracaso: { texto: "No queda anclado", estados: [] },
  },
  notas: [
    {
      texto: "Mantenerlo: una acción simple por turno (estándar si son varios) y −1 al resto de tus acciones por la concentración: marca «Manteniendo anclaje» en ellas.",
      lugar: "tirada",
    },
    { texto: "Pasada la duración, renovarlo es volver a usar Anclaje (acción estándar y su fatiga).", lugar: "tirada" },
  ],
  casillasEnTiradas: [
    { alcances: [{ tipo: "todas" }], condicion: { id: "psi_manteniendo_anclaje", tipo: "toggle", etiqueta: "Manteniendo anclaje (−1)", valorActivo: -1 } },
  ],
  motor: motorDeAccion(ANCLAJE_ID, { propias: true, tercero: ["defensa", "salv_fortaleza"], extra: motorDeCasilla("numerico", ["todas"]) }),
};

const TRASLADAR: AccionPoder = {
  ...SIN_EXTRAS,
  id: TRASLADAR_ID,
  label: "Trasladar",
  desdeNivel: 1,
  economia: "simple",
  fatiga: "tabla",
  alcance: "tabla",
  objetivo: { tipo: "unico" },
  desplazamiento: { base: 0, porNivelPoseido: 10 },
  unidades: { desplazamiento: "m/turno" },
  resolucion: { tipo: "sin_dado" },
  objetivoTira: [],
  ejes: [
    ejeNivelEmpleado(() => ({})),
    {
      id: "objetivos",
      label: "Objetivos",
      tipo: "opcion",
      opciones: [
        { id: "uno", label: "Uno", cambia: {} },
        {
          id: "varios",
          label: "Varios",
          cambia: {
            economia: "estandar",
            multiplesObjetivos: { texto: "Todos en la misma dirección, hacia la casilla elegida." },
          },
        },
      ],
    },
    {
      id: "control",
      label: "Al terminar",
      tipo: "opcion",
      opciones: [
        { id: "soltar", label: "Soltar", cambia: {} },
        {
          id: "mantener",
          label: "Mantener el control",
          cambia: {
            objetivoTira: [
              { que: "Para liberarse: Fortaleza + Atletismo enfrentada a tu Perspicacia + Física, como reacción gratuita; si gana, queda libre" },
            ],
          },
        },
      ],
    },
  ],
  resultados: {},
  notas: [
    { texto: "Requiere un objetivo ya anclado.", lugar: "tirada" },
    { texto: "Se mueve por la ruta más directa hacia la casilla elegida; al terminar pierdes el control salvo que lo mantengas.", lugar: "tirada" },
    { texto: "Si al terminar queda fuera de tu alcance, se libera solo.", lugar: "tirada" },
  ],
  motor: motorDeAccion(TRASLADAR_ID, { propias: true, tercero: ["salv_fortaleza"] }),
};

const PROYECCION: AccionPoder = {
  ...SIN_EXTRAS,
  id: "psi_traslacion_proyeccion",
  label: "Proyección",
  desdeNivel: 1,
  economia: "simple",
  fatiga: 1,
  alcance: { base: 0, porNivelPoseido: 20 },
  objetivo: { tipo: "unico" },
  desplazamiento: null,
  resolucion: {
    tipo: "ataque",
    aplicado: "reflejos",
    habilidad: "tecnociencia",
    especialidad: "fisica",
    modificador: -2,
    danio: { base: 4, porNivelPoseido: 1 },
    categoria: "letal",
  },
  objetivoTira: [{ que: "Reacción defensiva (Defensa / esquiva) contra el ataque a distancia" }],
  ejes: [
    {
      id: "economia",
      label: "Acción",
      tipo: "opcion",
      opciones: [
        { id: "simple", label: "Simple", cambia: {} },
        { id: "reaccion", label: "Reacción", cambia: { economia: "reaccion" } },
      ],
    },
  ],
  resultados: {
    exito: { texto: "Impacta con el objeto proyectado", estados: [] },
    fracaso: { texto: "No impacta", estados: [] },
  },
  notas: [
    { texto: "Requiere un objeto o criatura ya anclado; queda libre al final del trayecto.", lugar: "tirada" },
    { texto: "Puntería: −2 ya incluido en la tirada.", lugar: "tirada" },
    { texto: "Escribe el peso del objeto: por encima de 100 kg, +1 al daño letal por cada 200 kg completos (ya sumado).", lugar: "tirada" },
    { texto: "El objeto lanzado recibe el mismo daño que el blanco.", lugar: "danio" },
    { texto: "Si también hay daño por caída, se usa el mayor, sin sumarlos.", lugar: "danio" },
  ],
  // TODO(revisar) (S105): por tramos de 200 kg completos; sin peso escrito, hasta 100 kg.
  danioPorPeso: { hastaKg: 100, cadaKg: 200, suma: 1 },
  motor: motorDeAccion("psi_traslacion_proyeccion", {
    propias: true,
    tercero: ["defensa"],
    // El peso que escribe el jugador sube el daño (ps-08): regla del daño, no del total.
    extra: [{ tipo: "resolucion", afecta: { modo: "accion_existente", id: "psi_traslacion_proyeccion" }, mecanismo: "bono_tramo", estado: "construido" }],
  }),
};

// "Doblando su velocidad" = la de traslación psiónica, 10 m × nivel de poder (ps-05, usuario
// 2026-11-13): ×2 con acción estándar, ×4 con compleja. Nivel 3: 60 o 120 m.
const TRASLACION_PSIONICA_M = 10;

// Auto-proyección va aparte de Proyección: no hay tirada ni objetivo, así que no
// cabe como forma de un ataque.
const AUTO_PROYECCION: AccionPoder = {
  ...SIN_EXTRAS,
  id: "psi_traslacion_auto_proyeccion",
  label: "Auto-proyección",
  desdeNivel: 1,
  economia: "estandar",
  fatiga: 1,
  alcance: null,
  objetivo: { tipo: "propio" },
  desplazamiento: { base: 0, porNivelPoseido: 2 * TRASLACION_PSIONICA_M },
  unidades: { desplazamiento: "m/turno" },
  resolucion: { tipo: "sin_dado" },
  objetivoTira: [],
  ejes: [
    {
      id: "velocidad",
      label: "Velocidad",
      tipo: "opcion",
      opciones: [
        { id: "doble", label: "×2 (estándar)", cambia: {} },
        {
          id: "cuadruple",
          label: "×4 (compleja)",
          cambia: { economia: "compleja", desplazamiento: { base: 0, porNivelPoseido: 4 * TRASLACION_PSIONICA_M } },
        },
      ],
    },
  ],
  resultados: {},
  notas: [
    { texto: "Te proyectas a tu velocidad de traslación psiónica (10 m × nivel) multiplicada: {desplazamiento} m este turno.", lugar: "tirada" },
    { texto: "Por la inercia, +1 a tus esquivas hasta el inicio de tu siguiente turno: marca «Auto-proyección» en la esquiva.", lugar: "tirada" },
  ],
  // La esquiva es la fila "Defensa / esquiva"; los bloqueos del grupo Defensa no son esquivas.
  casillasEnTiradas: [
    { alcances: [tirada("defensa")], condicion: { id: "psi_auto_proyeccion", tipo: "toggle", etiqueta: "Auto-proyección (+1)", valorActivo: 1 } },
  ],
  motor: motorDeAccion("psi_traslacion_auto_proyeccion", { propias: true, extra: motorDeCasilla("numerico", ["defensa"]) }),
};

const SENSOR: AccionPoder = {
  ...SIN_EXTRAS,
  id: "psi_traslacion_sensor",
  label: "Sensor",
  desdeNivel: 1,
  economia: "estandar",
  fatiga: 1,
  alcance: null,
  duracion: { base: 0, porNivelPoseido: 1 },
  // La prosa da el radio (nivel × 2) sin unidad; enviado a Murillo.
  unidades: { duracion: "turnos", area: "(radio, unidad a criterio del máster)" },
  objetivo: { tipo: "propio", area: { base: 0, porNivelPoseido: 2 } },
  desplazamiento: null,
  resolucion: { tipo: "sin_dado" },
  objetivoTira: [],
  ejes: [
    {
      id: "economia",
      label: "Acción",
      tipo: "opcion",
      opciones: [
        { id: "estandar", label: "Estándar", cambia: {} },
        { id: "simple", label: "Simple", desdeNivel: 5, cambia: { economia: "simple" } },
        { id: "reaccion", label: "Reacción", desdeNivel: 5, cambia: { economia: "reaccion" } },
      ],
    },
  ],
  resultados: {},
  notas: [
    { texto: "Detectas vibraciones, densidades y formas ocultas en el radio, ignorando coberturas visuales y sigilo convencional.", lugar: "tirada" },
    {
      texto: "Puedes interactuar con lo que no ves (el mecanismo de una cerradura, cables tras un muro) con Perspicacia y la habilidad de cada caso (Mecánica, Informática, Medicina, Biónica).",
      lugar: "tirada",
    },
    { texto: "Si lo percibido es poco habitual, identificarlo puede pedir una tirada de habilidad como acción gratuita.", lugar: "tirada" },
    { texto: "Mientras dure, lo que percibes cuenta como objetivo válido para Traslación.", lugar: "tirada" },
  ],
  motor: motorDeAccion("psi_traslacion_sensor", { propias: true }),
};

// Levitación (Auto-traslación): 1 de fatiga por periodo, sin la fila de la
// tabla ni sus descuentos (usuario, 2026-09-29). El periodo crece con el nivel
// POSEÍDO: 1 minuto, 10 en nivel 4, 1 hora en nivel 6.
const LEVITAR: AccionPoder = {
  ...SIN_EXTRAS,
  id: "psi_traslacion_levitar",
  label: "Levitar",
  desdeNivel: 2,
  economia: "simple",
  fatiga: 1,
  alcance: null,
  duracion: { manual: "1 minuto" },
  ajustesPorNivelPoseido: [
    { desdeNivel: 4, sobre: "duracion", op: "sustituye", valor: { manual: "10 minutos" } },
    { desdeNivel: 6, sobre: "duracion", op: "sustituye", valor: { manual: "1 hora" } },
  ],
  objetivo: { tipo: "propio" },
  desplazamiento: { base: 0, porNivelPoseido: 10 },
  unidades: { desplazamiento: "m/turno" },
  movimientoOtorgado: { tipo: "levitar", velocidad: { base: 0, porNivelPoseido: 10 } },
  resolucion: { tipo: "sin_dado" },
  objetivoTira: [],
  ejes: [],
  resultados: {},
  notas: [
    { texto: "El punto de fatiga cubre la duración indicada; para seguir levitando, vuelve a pulsar Usar.", lugar: "tirada" },
    { texto: "Cada turno, quieto o desplazándote, es una acción simple.", lugar: "tirada" },
    { texto: "Mientras levitas, esquivas con Física: marca \"Levitando: Física\" en Defensa / esquiva. Las maniobras, a mano.", lugar: "tirada" },
  ],
  motor: motorDeAccion("psi_traslacion_levitar", { propias: true }),
};

// Auto-anclaje: siempre con tirada (usuario, 2026-09-28), dificultad 6. "El gasto
// apropiado de fatiga" = la fila de la tabla, con tu propio peso como carga
// (usuario, 2026-09-30).
const AUTO_ANCLAJE_ID = "psi_traslacion_auto_anclaje";
const AUTO_ANCLAJE: AccionPoder = {
  ...SIN_EXTRAS,
  id: AUTO_ANCLAJE_ID,
  label: "Auto-anclaje",
  desdeNivel: 1,
  economia: "reaccion",
  fatiga: "tabla",
  alcance: null,
  objetivo: { tipo: "propio" },
  desplazamiento: null,
  resolucion: { tipo: "tirada", aplicado: "reflejos", habilidad: "tecnociencia", especialidad: "fisica", dificultad: 6 },
  objetivoTira: [],
  ejes: [ejeNivelEmpleado(() => ({}))],
  resultados: {
    exito: { texto: "Te anclas: detienes la caída o te quedas fijo en el sitio", estados: [] },
    fracaso: { texto: "No logras anclarte", estados: [] },
  },
  notas: [{ texto: "Tu propio peso, con lo que lleves encima, cuenta como la carga.", lugar: "tirada" }],
  motor: motorDeAccion(AUTO_ANCLAJE_ID, { propias: true }),
};

// Duelo de Métrica: reacción de quien tiene Traslación contra un Anclaje. Cuesta
// 1, gratis si su Traslación es 2 niveles mayor que la del atacante (casilla).
const DUELO_ID = "psi_traslacion_duelo_metrica";
const DUELO_METRICA: AccionPoder = {
  ...SIN_EXTRAS,
  id: DUELO_ID,
  label: "Duelo de Métrica",
  desdeNivel: 1,
  economia: "reaccion",
  fatiga: 1,
  alcance: null,
  objetivo: { tipo: "propio" },
  desplazamiento: null,
  resolucion: { tipo: "enfrentada", aplicado: "perspicacia", habilidad: "tecnociencia", especialidad: "fisica" },
  objetivoTira: [],
  ejes: [
    {
      id: "economia",
      label: "Acción",
      tipo: "opcion",
      opciones: [
        { id: "reaccion", label: "Reacción", cambia: {} },
        { id: "simple", label: "Simple", cambia: { economia: "simple" } },
      ],
    },
  ],
  resultados: {
    exito: { texto: "Resistes: el anclaje no te sujeta", estados: [] },
    fracaso: { texto: "Quedas anclado", estados: [] },
  },
  notas: [{ texto: "Como dificultad, escribe el total de la tirada de quien te ancla (Perspicacia + Física).", lugar: "tirada" }],
  motor: motorDeAccion(DUELO_ID, { propias: true }),
};

// Proeza: manipular un único objetivo por encima de la carga máxima del nivel.
// Paga la fila del nivel empleado (sin las casillas de carga: siempre va por
// encima de la máxima) y es la única acción que puede gastar más fatiga de la que
// se tiene: el exceso va a fatiga temporal (vitalidad.ts). El extra por % de
// peso sale del peso que escribe el jugador (excesoDeCarga).
const PROEZA: AccionPoder = {
  ...SIN_EXTRAS,
  id: "psi_traslacion_proeza",
  label: "Proeza",
  desdeNivel: 1,
  economia: "compleja",
  fatiga: "tabla",
  permiteFatigaTemporal: true,
  alcance: "tabla",
  objetivo: { tipo: "unico" },
  desplazamiento: null,
  resolucion: { tipo: "tirada", aplicado: "potencia", habilidad: "atletismo", dificultad: 10 },
  objetivoTira: [],
  ejes: [
    ejeNivelEmpleado(() => ({})),
    {
      id: "maniobra",
      label: "Maniobra",
      tipo: "opcion",
      opciones: [
        { id: "anclar", label: "Anclar", cambia: {} },
        {
          id: "trasladar",
          label: "Trasladar a mitad",
          cambia: { notas: [{ texto: "Lo trasladas a la mitad de tu velocidad de Trasladar.", lugar: "tirada" }] },
        },
      ],
    },
  ],
  resultados: {
    exito: { texto: "Lo consigues: solo puedes anclarlo o trasladarlo a mitad de velocidad, nunca proyectarlo", estados: [] },
    fracaso: { texto: "No consigues moverlo", estados: [] },
  },
  // "+1 nivel de fatiga por cada 10 % de peso extra (mínimo +1)"; límite del 200 % de
  // la carga máxima (usuario, 2026-09-30: por cada 10 % completo; por encima del
  // 200 %, no se puede).
  excesoDeCarga: {
    fatigaPorCada10: 1,
    minimo: 1,
    limitePorcentaje: 200,
    danioAlLimite: { valor: 1, categoria: "mental" },
  },
  notas: [
    { texto: "Cada turno que prolongues el control, pulsa «Prolongar un turno» tras tirar: vuelves a pagar el extra por exceso de carga.", lugar: "tirada" },
    { texto: "Puedes gastar más fatiga de la que tienes: el exceso se apunta como fatiga temporal y se devuelve al terminar la escena.", lugar: "tirada" },
  ],
  motor: motorDeAccion("psi_traslacion_proeza", { propias: true }),
};

// Descuentos de la tabla: solo en las acciones que pagan la fila (no en
// Proyección, Auto-proyección ni Sensor).
const PAGAN_TABLA = [ANCLAJE_ID, TRASLADAR_ID, AUTO_ANCLAJE_ID];

const TRASLACION: Disciplina = {
  id: "traslacion",
  label: "Traslación",
  rama: "metrica",
  requisito: null,
  porNivel: [1, 2, 3, 4, 5, 6].map((nivel) => ({
    nivel,
    alcance: 15 * nivel,
    fatiga: [1, 2, 2, 3, 3, 4][nivel - 1],
    carga: { base: 0, porAplicado: { aplicado: "perspicacia", valor: [25, 50, 125, 250, 375, 500][nivel - 1] } },
  })),
  reglas: [
    {
      id: "fatiga_por_carga_alcance",
      texto: "La fatiga no depende del movimiento sino de la carga total o el alcance: se paga la fila del nivel empleado.",
      aplica: PAGAN_TABLA,
    },
  ],
  modificadoresFatiga: [
    {
      fuente: "Duelo de Métrica: 2 niveles superior",
      alcance: { accion: DUELO_ID },
      condicion: { toggle: "Soy 2 niveles superior en Traslación" },
      op: "multiplica",
      valor: 0,
    },
    {
      fuente: "Traslación 3: carga < 10 kg",
      alcance: { accion: PAGAN_TABLA },
      desdeNivelPoseido: 3,
      condicion: { toggle: "Carga < 10 kg", grupo: "carga" },
      op: "multiplica",
      valor: 0,
    },
    {
      fuente: "Traslación 6: carga por debajo de la máxima",
      alcance: { accion: PAGAN_TABLA },
      desdeNivelPoseido: 6,
      condicion: { toggle: "Carga por debajo de la máxima del nivel", grupo: "carga" },
      op: "suma",
      valor: -1,
    },
    {
      fuente: "Traslación 6: mínimo",
      alcance: { accion: PAGAN_TABLA },
      desdeNivelPoseido: 6,
      condicion: { toggle: "Carga por debajo de la máxima del nivel", grupo: "carga" },
      op: "minimo",
      valor: 1,
    },
  ],
  // Nivel 4: "Anclaje pasa a ser acción simple" — la de un objetivo; anclar a
  // varios a la vez pasa de compleja a estándar (Murillo, 2026-09-29: "anclaje
  // colectivo pasa a acción estándar (nv4)"). Añadir un objetivo no cambia.
  modificadoresEconomia: [
    {
      fuente: "Traslación 4",
      desdeNivelPoseido: 4,
      alcance: { accion: ANCLAJE_ID, opcion: { eje: "objetivos", opcion: "uno" } },
      op: "baja_un_paso",
    },
    {
      fuente: "Traslación 4: anclaje colectivo",
      desdeNivelPoseido: 4,
      alcance: { accion: ANCLAJE_ID, opcion: { eje: "objetivos", opcion: "varios" } },
      op: "baja_un_paso",
    },
  ],
  bonosEnOtrasTiradas: [],
  ventajas: [],
  acciones: [ANCLAJE, AUTO_ANCLAJE, TRASLADAR, LEVITAR, PROYECCION, AUTO_PROYECCION, PROEZA, SENSOR, DUELO_METRICA],
};

// ── Contención ────────────────────────────────────────────────────
// Un único poder sin tirada. La tabla va por nivel EMPLEADO (nivel 2 personal =
// nivel 1); las duraciones largas y rebajas de −Agilidad dependen además del
// POSEÍDO (ajustesPorNivelPoseido filtrados por nivel empleado). Absorción y
// −Agilidad, con el estado propio «Contención» al usarla; el área de la ampliada, calculada
// (P1, 2026-10-28; antes a mano y en el manual por decisión del 2026-09-28/29).
const CONTENCION_ID = "psi_contencion_contencion";
const ABS = [1, 1, 2, 3, 4, 5];
const QUIETO = [3, 3, 5, 7, 9, 11];
const AGILIDAD = [-1, -1, -2, -2, -3, -3];
const I_AGILIDAD = 3; // índice de "Agilidad" en `datos`

const duracionPor = (desdeNivel: number, nivelEmpleado: number, turnos: number) =>
  ({ desdeNivel, nivelEmpleado, sobre: "duracion", op: "sustituye", valor: turnos }) as const;
const agilidadPor = (desdeNivel: number, nivelEmpleado: number, valor: number) =>
  ({ desdeNivel, nivelEmpleado, sobre: `datos.${I_AGILIDAD}.valor`, op: "sustituye", valor }) as const;
// Nivel 6: la Agilidad que queda al emplear estos niveles (agilidadPor). Lo usan los ajustes y
// los grados del estado «Contención».
const AGILIDAD_NV6: [nivelEmpleado: number, valor: number][] = [
  [1, 0],
  [3, -1],
  [4, -1],
  [5, -2],
];
// Área de la forma colectiva (P1, antes "mira el manual"): 1 casilla adyacente por nivel
// empleado, ×2 o ×3 según el nivel poseído (prosa de nv4, nv5 y nv6). Para la ampliada y el foco.
const AREA_COLECTIVA: [desdeNivel: number, nivelEmpleado: number, factor: number][] = [
  [4, 1, 2],
  [5, 1, 3],
  [5, 3, 2],
  [6, 3, 3],
  [6, 4, 2],
];
const FORMAS_COLECTIVAS = ["ampliada", "foco"] as const;
const areaPor = ([desdeNivel, nivelEmpleado, factor]: (typeof AREA_COLECTIVA)[number]) =>
  FORMAS_COLECTIVAS.map(
    (forma) =>
      ({ desdeNivel, nivelEmpleado, opcion: { eje: "forma", opcion: forma }, sobre: "objetivo.area", op: "sustituye", valor: nivelEmpleado * factor }) as const,
  );

// Estado propio «Contención» (P1, 2026-10-28): lo pone la app al usarla (estadoAlUsar) y se va
// al acabar la duración, con «Terminar contención» o con "Limpiar estados". Un grado por
// absorción y −Agilidad posibles (los de la tabla y los de nv6), con id "absorción_agilidad"
// ("2_-1"). La −Agilidad va como modificador del estado; la absorción la lee el blindaje
// (absorcionDeContencion, rules/blindaje.ts), que no es un Modificador.
export const ESTADO_CONTENCION_ID = "psi_contencion";
const GRADOS_CONTENCION: { absorcion: number; agilidad: number }[] = [
  ...NIVELES.map((n) => ({ absorcion: ABS[n - 1], agilidad: AGILIDAD[n - 1] })),
  ...AGILIDAD_NV6.map(([n, agilidad]) => ({ absorcion: ABS[n - 1], agilidad })),
].filter((g, i, todos) => todos.findIndex((x) => x.absorcion === g.absorcion && x.agilidad === g.agilidad) === i);

export const gradoContencion = (absorcion: number, agilidad: number) => `${absorcion}_${agilidad}`;

export function absorcionDeGradoContencion(gradoId: string): number | null {
  return GRADOS_CONTENCION.find((g) => gradoContencion(g.absorcion, g.agilidad) === gradoId)?.absorcion ?? null;
}

export const ESTADOS_DE_PODER: Estado[] = [
  ESTADO_ESTABILIZADO,
  ESTADO_SONDEO,
  {
    id: ESTADO_CONTENCION_ID,
    label: "Contención",
    resumen: "Discontinuidad gravitatoria propia: absorción de daño a cambio de Agilidad, mientras dure.",
    grados: GRADOS_CONTENCION.map(({ absorcion, agilidad }) => ({
      id: gradoContencion(absorcion, agilidad),
      label: `Absorción ${absorcion}${agilidad < 0 ? ` · Agilidad ${agilidad}` : ""}`,
      modificadores: agilidad < 0 ? [{ tipo: "atributo", id: "agilidad", valor: agilidad }] : [],
      detalle: [
        `Absorción ${absorcion} contra todo daño menos el mental (en Resistir daño); no la reducen los efectos antiblindaje.` +
          (agilidad < 0 ? ` Agilidad ${agilidad}.` : ""),
        "Quieto o contra el ataque, la absorción es otra: mira la Contención en Acciones.",
      ],
      duracionTurnos: null,
    })),
  },
];

const CONTENCION: AccionPoder = {
  ...SIN_EXTRAS,
  id: CONTENCION_ID,
  label: "Contención",
  desdeNivel: 1,
  economia: "simple",
  fatiga: "tabla",
  alcance: null,
  duracion: 10,
  unidades: { duracion: "turnos", area: "casillas adyacentes" },
  objetivo: { tipo: "propio" },
  desplazamiento: null,
  resolucion: { tipo: "sin_dado" },
  objetivoTira: [],
  ejes: [
    ejeNivelEmpleado((n) => ({
      fatiga: [1, 1, 2, 3, 3, 4][n - 1],
      datos: [
        { etiqueta: "Absorción", valor: ABS[n - 1] },
        { etiqueta: "Absorción quieto", valor: QUIETO[n - 1] },
        { etiqueta: "Contra el ataque", valor: 2 * QUIETO[n - 1] },
        { etiqueta: "Agilidad", valor: AGILIDAD[n - 1] },
        { etiqueta: "Daño al objeto", valor: n },
      ],
    })),
    {
      id: "forma",
      label: "Forma",
      tipo: "opcion",
      opciones: [
        { id: "personal", label: "Personal", cambia: {} },
        {
          id: "ampliada",
          label: "Ampliada",
          desdeNivel: 2,
          cambia: {
            economia: "estandar",
            objetivo: { tipo: "varios", area: { base: 0, porNivel: 1 } },
            notas: [
              {
                texto: "Protege {area} casillas adyacentes y se mueve contigo; quien sale del área pierde la protección.",
                lugar: "tirada",
              },
              { texto: "Mantenerla: concentración y una acción simple por turno (reacción desde tu nivel 4).", lugar: "tirada" },
              { texto: "Los protegidos pueden quedarse quietos, ir contra el ataque o esquivar, con su coste normal.", lugar: "tirada" },
              { texto: "Puedes retirar la protección a alguien como reacción o acción gratuita en tu turno.", lugar: "tirada" },
            ],
          },
        },
        {
          id: "foco",
          label: "Ampliada, soy el foco",
          desdeNivel: 2,
          cambia: {
            economia: "estandar",
            objetivo: { tipo: "varios", area: { base: 0, porNivel: 1 } },
            notas: [
              {
                texto: "Con colaboradores: pagas lo normal (sin ×2); cada colaborador paga 1 por la casilla que añade. Si uno cae inconsciente o sale del área, su casilla desaparece.",
                lugar: "tirada",
              },
              { texto: "Mantenerla: concentración y una acción simple por turno (reacción desde tu nivel 4).", lugar: "tirada" },
            ],
          },
        },
      ],
    },
  ],
  ajustesPorNivelPoseido: [
    duracionPor(3, 1, 20),
    duracionPor(4, 1, 30),
    duracionPor(4, 3, 20),
    duracionPor(5, 1, 40),
    duracionPor(5, 3, 30),
    duracionPor(5, 4, 20),
    duracionPor(6, 3, 40),
    duracionPor(6, 4, 30),
    duracionPor(6, 5, 20),
    // Nivel 6: el nivel 1 personal es gratis la primera hora y ya no quita Agilidad.
    { desdeNivel: 6, nivelEmpleado: 1, opcion: { eje: "forma", opcion: "personal" }, sobre: "fatiga", op: "sustituye", valor: 0 },
    {
      desdeNivel: 6,
      nivelEmpleado: 1,
      opcion: { eje: "forma", opcion: "personal" },
      sobre: "duracion",
      op: "sustituye",
      valor: { manual: "1 hora gratis; después, 1 de fatiga por hora" },
    },
    ...AGILIDAD_NV6.map(([n, valor]) => agilidadPor(6, n, valor)),
    ...AREA_COLECTIVA.flatMap(areaPor),
  ],
  resultados: {},
  notas: [
    {
      texto: "Al usarla te pones el estado «Contención», con su absorción (en Resistir daño) y su −Agilidad. Se va al acabar la duración o con «Terminar contención».",
      lugar: "tirada",
    },
    { texto: "Quieto (sin esquivar): la absorción de quieto sustituye a la normal.", lugar: "tirada" },
    {
      texto: "Contra el ataque: con tu reacción doblas la absorción de quieto; el objeto bloqueado recibe daño igual al nivel empleado (letal si es un orgánico con golpe desarmado).",
      lugar: "tirada",
    },
    { texto: "Cubre todo daño menos el mental y no se reduce con efectos antiblindaje.", lugar: "tirada" },
    { texto: "No se apila con otras contenciones: se usa la mejor.", lugar: "tirada" },
  ],
  estadoAlUsar: { estadoId: ESTADO_CONTENCION_ID, gradoDeDatos: ["Absorción", "Agilidad"] },
  motor: motorDeAccion(CONTENCION_ID, {
    propias: true,
    extra: [
      // Estado propio al usarla: la absorción (Resistir daño) y la −Agilidad.
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "bloquear_danio" }, mecanismo: "suma_derivado", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "atributo:agilidad" }, mecanismo: "suma_derivado", estado: "construido" },
      // Área de la forma colectiva, calculada (objetivo.area): texto en la ventana del poder.
      { tipo: "texto", afecta: { modo: "accion_existente", id: CONTENCION_ID }, mecanismo: "nota_fija", estado: "construido" },
    ],
  }),
};

// Sumarse a la contención ampliada de otro psiónico: no usa tu nivel ni tus datos
// (el bonificador es el del foco), así que va como acción aparte.
const COLABORAR: AccionPoder = {
  ...SIN_EXTRAS,
  id: "psi_contencion_colaborar",
  label: "Colaborar en una contención",
  desdeNivel: 1,
  economia: { tiempo: "a criterio del máster" },
  fatiga: 1,
  alcance: null,
  objetivo: { tipo: "propio" },
  desplazamiento: null,
  resolucion: { tipo: "sin_dado" },
  objetivoTira: [],
  ejes: [],
  resultados: {},
  notas: [
    { texto: "Amplías en una casilla la contención ampliada de otro psiónico (el foco); el bonificador es el suyo.", lugar: "tirada" },
    { texto: "Si quedas inconsciente o sales del área, tu casilla desaparece.", lugar: "tirada" },
  ],
  motor: motorDeAccion("psi_contencion_colaborar", { propias: true }),
};

const CONTENCION_DISCIPLINA: Disciplina = {
  id: "contencion",
  label: "Contención",
  rama: "metrica",
  requisito: { disciplina: "traslacion", nivel: 1 },
  porNivel: [],
  reglas: [],
  modificadoresFatiga: [
    {
      fuente: "Contención ampliada",
      alcance: { accion: CONTENCION_ID, opcion: { eje: "forma", opcion: "ampliada" } },
      op: "multiplica",
      valor: 2,
    },
  ],
  modificadoresEconomia: [],
  bonosEnOtrasTiradas: [],
  ventajas: [],
  acciones: [CONTENCION, COLABORAR],
};

const SINGULARIDAD: Disciplina = {
  id: "singularidad",
  label: "Singularidad",
  rama: "metrica",
  requisito: { disciplina: "traslacion", nivel: 2 },
  porNivel: [],
  reglas: [
    { id: "coste_metrica", texto: "Coste: 1 punto de fatiga por nivel de poder empleado", aplica: "todas" },
    {
      id: "ejecucion_comun",
      texto: "Impulso, Expansión y Convergencia comparten coste base y ejecución: acción estándar, tirada de ataque Perspicacia + Tecnociencia (Física si la tiene)",
      aplica: "todas",
    },
    {
      id: "poderosa",
      texto: "Forma Poderosa: acción compleja y +1 de fatiga plano, sube daño y dificultad del objetivo según la forma",
      aplica: ["psi_singularidad_impulso", "psi_singularidad_expansion", "psi_singularidad_convergencia"],
    },
  ],
  // El +1 de la forma Poderosa va en el `suma` de la opción, no aquí: el borrador
  // lo tenía en los dos sitios y se habría cobrado dos veces.
  modificadoresFatiga: [],
  modificadoresEconomia: [],
  bonosEnOtrasTiradas: [],
  ventajas: [],
  acciones: [IMPULSO, EXPANSION, CONVERGENCIA],
};

// Fuentes de fuera de las disciplinas que tocan la fatiga de cualquier poder. Xovromium, por el
// estado «Bajo Xovromium» puesto (fármacos como estados, usuario 2026-11-14; antes, casilla que
// declaraba el jugador): +1 a la tirada e ignora el primer punto. Munición Supresora: por el estado
// «Supresores» puesto (cuestionario eq-22, usuario 2026-11-13; antes eran dos casillas): ×2 y
// −2; con fallo crítico, además 1 de daño letal por punto de fatiga gastado.
export const FUENTES_EXTERNAS_FATIGA: ModificadorFatiga[] = [
  // Irota (fármacos a la mitad, hacia abajo, mínimo 1; sistema.md §14.9): la mitad de 1
  // con mínimo 1 sigue siendo 1, así que el +1 y el −1 no cambian para él.
  {
    fuente: "Xovromium",
    alcance: {},
    condicion: { estado: "bajo_xovromium", grado: "activo" },
    op: "ignora_primero",
    valor: 1,
    ademas: { tirada: 1 },
  },
  {
    fuente: "Supresores",
    alcance: {},
    condicion: { estado: "supresores", grado: "fracaso" },
    op: "multiplica",
    valor: 2,
    ademas: { tirada: -2 },
  },
  {
    fuente: "Supresores (fallo crítico)",
    alcance: {},
    condicion: { estado: "supresores", grado: "fracaso_critico" },
    op: "multiplica",
    valor: 2,
    ademas: { tirada: -2, danioPorPunto: "letal" },
  },
];

export const PSIONICA: CatalogoPsionica = {
  sobrecarga: {
    umbral: "exhausto",
    inconsciencia: "automatica",
    // Nivel empleado; en poderes sin eje de nivel, el poseído (usuario, 2026-09-29).
    salvacion: { aplicado: "fortaleza", dificultad: { base: 5, porNivel: 1 } },
    danio: { valor: { base: 0, porNivel: 1 }, categoria: "letal", absorbible: false },
    multiplicadorPorGrado: { critico: 0, exito: 0.5, fracaso: 1, fracasoCritico: 2 },
  },
  disciplinas: [
    RESONANCIA,
    INDUCCION,
    HIPERCOGNICION,
    TRASLACION,
    CONTENCION_DISCIPLINA,
    SINGULARIDAD,
  ],
};

export const DISCIPLINAS = PSIONICA.disciplinas;

export function disciplinaPorId(id: DisciplinaId): Disciplina {
  const d = DISCIPLINAS.find((x) => x.id === id);
  if (!d) throw new Error(`Disciplina desconocida: ${id}`);
  return d;
}

export function esDisciplinaId(id: string): id is DisciplinaId {
  return (DISCIPLINA_IDS as readonly string[]).includes(id);
}
