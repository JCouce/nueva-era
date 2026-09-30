// Catálogo de psiónica. Prosa: docs/psionica.md; reglas: docs/sistema.md §10.6;
// borrador del que sale: docs/modelado-psionica.json (no se importa en runtime,
// es un borrador — esto es la transcripción revisada y tipada).
//
// Las 6 disciplinas con sus acciones.
import type { MotorMetadata } from "../rules/motor";
import type { AccionPoder, CambiosOpcion, CatalogoPsionica, Disciplina, Economia, EjePoder, Opcion } from "../rules/psionica";

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

function motorDeAccion(id: string, notas: { tercero?: string[]; propias?: boolean }): MotorMetadata[] {
  return [
    { tipo: "accion", afecta: { modo: "accion_nueva", id }, mecanismo: "accion_sin_equipo", estado: "construido" },
    ...(notas.propias
      ? [{ tipo: "texto", afecta: { modo: "accion_existente", id }, mecanismo: "nota_fija", estado: "construido" } as const]
      : []),
    ...(notas.tercero ?? []).map(
      (t) => ({ tipo: "texto", afecta: { modo: "objetivo_tercero", id: t }, mecanismo: "nota_fija", estado: "construido" }) as const,
    ),
  ];
}

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
  especialidad: "Física",
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
  motor: motorDeAccion("psi_singularidad_convergencia", { propias: true, tercero: ["defensa", "salv_fortaleza"] }),
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

// Contra mentes sintéticas se resuena con Tecnociencia (Informática).
const receptor = (label: string, plural = false): EjePoder => ({
  id: "receptor",
  label,
  tipo: "opcion",
  opciones: [
    { id: "organico", label: plural ? "Orgánicas" : "Orgánico", cambia: {} },
    {
      id: "sintetico",
      label: plural ? "Sintéticas" : "Sintético",
      cambia: { resolucion: { habilidad: "tecnociencia", especialidad: "Informática" } },
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
      texto: "Lees sus pensamientos más vívidos y superficiales durante 1 minuto (10 turnos) sin gastar acción para mantenerlo, y +2 en tus tiradas enfrentadas contra él",
      estados: [],
    },
    exito: {
      texto: "Lees sus pensamientos más vívidos y superficiales durante 10 turnos (1 minuto); mantenerlo cuesta una reacción o una acción simple cada turno. +2 en tus tiradas enfrentadas contra él",
      estados: [],
    },
    fracaso: { texto: "Lo lees solo durante 1 turno (con el +2 en enfrentadas contra él ese turno)", estados: [] },
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
  motor: motorDeAccion(LEER_MENTE_ID, { propias: true, tercero: ["salv_voluntad"] }),
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
  ejes: [receptor("Amenazas", true)],
  resultados: RESULTADOS_ALERTA,
  togglesPropios: [MAS_2_RESONANCIA_4(ALERTA_PASIVA_ID)],
  notas: [
    { texto: "Hace de tu alerta ordinaria: tírala cuando el máster pida percibir amenazas.", lugar: "tirada" },
    { texto: "No funciona si estás exhausto (la app deja tirar: lo decide el máster).", lugar: "tirada" },
    ...NOTAS_ALERTA,
  ],
  motor: motorDeAccion(ALERTA_PASIVA_ID, { propias: true, tercero: ["sigilo"] }),
};

const ALERTA_ACTIVA: AccionPoder = {
  ...ALERTA_PASIVA,
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
    { texto: "Los vinculados tienen +1 a las salvaciones de Voluntad mientras dure (a mano).", lugar: "tirada" },
    { texto: "Se benefician de tu alerta pasiva contra las amenazas que los incluyan.", lugar: "tirada" },
    {
      texto: "Como reacción, quien encuentre a un objetivo escondido puede avisar por el vínculo: un ataque por sorpresa pasa a normal, o un aliado desprevenido pasa a sorprendido.",
      lugar: "tirada",
    },
  ],
  motor: motorDeAccion(VINCULO_ID, { propias: true }),
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
        resolucion: { aplicado: "perspicacia", habilidad: "tecnociencia", especialidad: "Informática" },
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

// Modulación: 1 de fatiga por nivel empleado, y en sus efectos "nivel de poder" =
// nivel EMPLEADO (excepción a la regla general, usuario 2026-09-30: si no, emplear
// más no serviría de nada). Qué efectos hay depende del nivel POSEÍDO ("adquiere").
// Grados desde el psiónico: su crítico = el fracaso crítico del objetivo.
const MODULACION_ID = "psi_induccion_modulacion";
const HIPOMANIA_ALIADO_ID = "psi_induccion_hipomania_aliado";

const RESISTE_ORGANICO = BASE_INDUCCION.objetivoTira[0];
const RESISTE_SINTETICO = { que: "Resiste con Perspicacia + Informática; escribe su total como dificultad" };
const SINTETICO: CambiosOpcion["resolucion"] = { aplicado: "perspicacia", habilidad: "tecnociencia", especialidad: "Informática" };
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
  fatiga: { base: 0, porNivel: 1 },
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
  fatiga: { base: 0, porNivel: 1 },
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
        { id: "mitigar", label: "Mitigar penalizadores", cambia: {} },
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
    { desdeNivel: 2, opcion: { eje: "uso", opcion: "mitigar" }, sobre: "duracion", op: "sustituye", valor: { manual: "10 minutos" } },
    { desdeNivel: 4, opcion: { eje: "uso", opcion: "mitigar" }, sobre: "duracion", op: "sustituye", valor: { manual: "30 minutos" } },
    {
      desdeNivel: 4,
      opcion: { eje: "uso", opcion: "mitigar" },
      sobre: "resultados.exito.texto",
      op: "sustituye",
      valor: "Reduces en 1 tus penalizadores por estados mientras dure y omites por completo los de daño y fatiga",
    },
    {
      desdeNivel: 4,
      opcion: { eje: "uso", opcion: "mitigar" },
      sobre: "resultados.critico.texto",
      op: "sustituye",
      valor: "Reduces en 2 tus penalizadores por estados mientras dure y omites por completo los de daño y fatiga",
    },
    {
      desdeNivel: 6,
      opcion: { eje: "uso", opcion: "mitigar" },
      sobre: "resultados.exito.texto",
      op: "sustituye",
      valor: "Eliminas por completo tus penalizadores por estados mientras dure (no los que llegues a sufrir después) y omites los de daño y fatiga",
    },
    {
      desdeNivel: 6,
      opcion: { eje: "uso", opcion: "mitigar" },
      sobre: "resultados.critico.texto",
      op: "sustituye",
      valor: "Eliminas por completo tus penalizadores por estados mientras dure (no los que llegues a sufrir después) y omites los de daño y fatiga",
    },
    {
      desdeNivel: 4,
      opcion: { eje: "uso", opcion: "salvacion" },
      sobre: "resultados.exito.texto",
      op: "sustituye",
      valor: "+3 a tu salvación: márcalo en la casilla «+3 por Estabilización» de la salvación",
    },
    {
      desdeNivel: 6,
      opcion: { eje: "uso", opcion: "salvacion" },
      sobre: "resultados.exito.texto",
      op: "sustituye",
      valor: "+4 a tu salvación: márcalo en la casilla «+4 por Estabilización» de la salvación",
    },
  ],
  resultados: {
    critico: { texto: "Reduces en 2 tus penalizadores por estados mientras dure", estados: [] },
    exito: { texto: "Reduces en 1 tus penalizadores por estados mientras dure", estados: [] },
    fracaso: { texto: "Sin efecto", estados: [] },
  },
  notas: [{ texto: "Los penalizadores de estado, a mano.", lugar: "tirada" }],
  motor: motorDeAccion(ESTABILIZACION_ID, { propias: true }),
};

const estabilizacionEnSalvacion = (valor: number, desde: number, hasta?: number) => ({
  etiqueta: `+${valor} por Estabilización (si la superaste)`,
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
    estabilizacionEnSalvacion(2, 1, 3),
    estabilizacionEnSalvacion(3, 4, 5),
    estabilizacionEnSalvacion(4, 6),
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

const TIRADA_HIPERCOGNICION = { tipo: "tirada", aplicado: "perspicacia", habilidad: "tecnociencia", especialidad: "Física" } as const;

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

// Fracaso crítico del Sondeo: 1 de daño mental por punto de fatiga empleado; cada
// tramo pone el suyo.
const resultadosSondeo = (fatiga: number): AccionPoder["resultados"] => ({
  critico: {
    texto: "Información perfecta y nítida (audio, visual, térmico) mientras dure, ignorando coberturas o interferencias ópticas de baja intensidad. Puedes prolongarla pagando la misma fatiga cada turno, sin volver a tirar (a mano en Recursos)",
    estados: [],
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

// Duración (errata de Murillo): nivel turnos; desde nivel 3, 1 minuto (usuario,
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
    { desdeNivel: 3, sobre: "duracion", op: "sustituye", valor: { manual: "1 minuto (10 turnos)" } },
  ],
  resultados: resultadosSondeo(1),
  notas: [
    { texto: "Requiere concentración. Dificultad sugerida: el valor bajo del tramo (6-7, 8-9, 10-11, 12+); súbela si el máster dice más.", lugar: "tirada" },
    { texto: "La supresión cuántica activa puede dejar el objetivo bloqueado sin una brecha previa.", lugar: "tirada" },
  ],
  motor: motorDeAccion(SONDEO_ID, { propias: true }),
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
    fracasoCritico: { texto: "Contaminación mnemónica: tomas por cierta una superposición errónea de datos y quedas aturdido 1 turno", estados: [] },
  },
  notas: [
    { texto: "Solo lo que pasó dentro de la burbuja. Dificultad sugerida: el valor bajo del tramo (6-8, 9-11, 12-14, 15+).", lugar: "tirada" },
    { texto: "Con el escenario arrasado, el rastro puede estar disipado del todo (a criterio del máster).", lugar: "tirada" },
  ],
  motor: motorDeAccion(RETROCOGNICION_ID, { propias: true }),
};

// Precognición: los bonos son un efecto activo sobre uno mismo, a mano. Las
// salvaciones no cuentan como tiradas defensivas; el fracaso crítico dura 1 turno
// (Murillo, 2026-09-29).
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
    { texto: "Los bonos los llevas a mano mientras dure. Las salvaciones no cuentan como tiradas defensivas.", lugar: "tirada" },
    { texto: "Interferencias físicas o electromagnéticas masivas suben la dificultad (la dice el máster).", lugar: "tirada" },
  ],
  motor: motorDeAccion(PRECOGNICION_ID, { propias: true }),
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
  // compleja → estándar → simple; Murillo: el local llega a simple en el 5).
  modificadoresEconomia: [SONDEO_ID, RETROCOGNICION_ID].flatMap((accion) => [
    { fuente: "Hipercognición 3", desdeNivelPoseido: 3, alcance: { accion }, op: "baja_un_paso" as const },
    { fuente: "Hipercognición 5", desdeNivelPoseido: 5, alcance: { accion }, op: "baja_un_paso" as const },
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
  // objetivo esquiva; lo enfrentado es luego el escape.
  resolucion: { tipo: "tirada", aplicado: "perspicacia", habilidad: "tecnociencia", especialidad: "Física" },
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
    { texto: "Mantenerlo: una acción simple por turno (estándar si son varios) y −1 al resto de tus acciones por la concentración.", lugar: "tirada" },
    { texto: "Pasada la duración, renovarlo es volver a usar Anclaje (acción estándar y su fatiga).", lugar: "tirada" },
  ],
  motor: motorDeAccion(ANCLAJE_ID, { propias: true, tercero: ["defensa", "salv_fortaleza"] }),
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
    especialidad: "Física",
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
    { texto: "Daño para objetos de hasta 100 kg; +1 por cada 200 kg adicionales (a mano).", lugar: "danio" },
    { texto: "El objeto lanzado recibe el mismo daño que el blanco.", lugar: "danio" },
    { texto: "Si también hay daño por caída, se usa el mayor, sin sumarlos.", lugar: "danio" },
  ],
  motor: motorDeAccion("psi_traslacion_proyeccion", { propias: true, tercero: ["defensa"] }),
};

// "Doblando su velocidad": la prosa no dice cuál (carrera o traslación). Pregunta
// a Murillo en /preguntas (Traslación); mientras, a criterio del máster.
const VELOCIDAD_AMBIGUA = (factor: string) =>
  `Te mueves al ${factor} de tu velocidad (la prosa no dice cuál: carrera o traslación de 10 × nivel; a criterio del máster).`;

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
  desplazamiento: null,
  resolucion: { tipo: "sin_dado" },
  objetivoTira: [],
  ejes: [
    {
      id: "velocidad",
      label: "Velocidad",
      tipo: "opcion",
      opciones: [
        { id: "doble", label: "×2 (estándar)", cambia: { notas: [{ texto: VELOCIDAD_AMBIGUA("doble"), lugar: "tirada" }] } },
        {
          id: "cuadruple",
          label: "×4 (compleja)",
          cambia: { economia: "compleja", notas: [{ texto: VELOCIDAD_AMBIGUA("cuádruple"), lugar: "tirada" }] },
        },
      ],
    },
  ],
  resultados: {},
  notas: [{ texto: "Por la inercia, +1 a tus esquivas hasta el inicio de tu siguiente turno (a mano).", lugar: "tirada" }],
  motor: motorDeAccion("psi_traslacion_auto_proyeccion", { propias: true }),
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
  resolucion: { tipo: "tirada", aplicado: "reflejos", habilidad: "tecnociencia", especialidad: "Física", dificultad: 6 },
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
  resolucion: { tipo: "enfrentada", aplicado: "perspicacia", habilidad: "tecnociencia", especialidad: "Física" },
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
  // varios a la vez sigue siendo compleja.
  modificadoresEconomia: [
    {
      fuente: "Traslación 4",
      desdeNivelPoseido: 4,
      alcance: { accion: ANCLAJE_ID, opcion: { eje: "objetivos", opcion: "uno" } },
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
// −Agilidad se aplican a mano; área de la ampliada, en el manual (usuario,
// 2026-09-28/29).
const CONTENCION_ID = "psi_contencion_contencion";
const ABS = [1, 1, 2, 3, 4, 5];
const QUIETO = [3, 3, 5, 7, 9, 11];
const AGILIDAD = [-1, -1, -2, -2, -3, -3];
const I_AGILIDAD = 3; // índice de "Agilidad" en `datos`

const duracionPor = (desdeNivel: number, nivelEmpleado: number, turnos: number) =>
  ({ desdeNivel, nivelEmpleado, sobre: "duracion", op: "sustituye", valor: turnos }) as const;
const agilidadPor = (desdeNivel: number, nivelEmpleado: number, valor: number) =>
  ({ desdeNivel, nivelEmpleado, sobre: `datos.${I_AGILIDAD}.valor`, op: "sustituye", valor }) as const;

const CONTENCION: AccionPoder = {
  ...SIN_EXTRAS,
  id: CONTENCION_ID,
  label: "Contención",
  desdeNivel: 1,
  economia: "simple",
  fatiga: "tabla",
  alcance: null,
  duracion: 10,
  unidades: { duracion: "turnos" },
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
            objetivo: { tipo: "varios" },
            notas: [
              {
                texto: "Protege una casilla adyacente por nivel empleado (×2 o ×3 según tu nivel: mira el manual) y se mueve contigo; quien sale del área pierde la protección.",
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
            objetivo: { tipo: "varios" },
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
    agilidadPor(6, 1, 0),
    agilidadPor(6, 3, -1),
    agilidadPor(6, 4, -1),
    agilidadPor(6, 5, -2),
  ],
  resultados: {},
  notas: [
    { texto: "Absorción y −Agilidad duran lo que la contención: apúntalos a mano.", lugar: "tirada" },
    { texto: "Quieto (sin esquivar): la absorción de quieto sustituye a la normal.", lugar: "tirada" },
    {
      texto: "Contra el ataque: con tu reacción doblas la absorción de quieto; el objeto bloqueado recibe daño igual al nivel empleado (letal si es un orgánico con golpe desarmado).",
      lugar: "tirada",
    },
    { texto: "Cubre todo daño menos el mental y no se reduce con efectos antiblindaje.", lugar: "tirada" },
    { texto: "No se apila con otras contenciones: se usa la mejor.", lugar: "tirada" },
  ],
  motor: motorDeAccion(CONTENCION_ID, { propias: true }),
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
