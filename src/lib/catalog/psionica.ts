// Catálogo de psiónica. Prosa: docs/psionica.md; reglas: docs/sistema.md §10.6;
// borrador del que sale: docs/modelado-psionica.json (no se importa en runtime,
// es un borrador — esto es la transcripción revisada y tipada).
//
// Piloto: están las 6 disciplinas (las necesita la compra), pero solo Singularidad
// tiene acciones. El resto entra disciplina a disciplina.
import type { MotorMetadata } from "../rules/motor";
import type { AccionPoder, CambiosOpcion, CatalogoPsionica, Disciplina, EjePoder, Opcion } from "../rules/psionica";

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

// Solo lo que la compra necesita; tablas, reglas y acciones llegan con cada disciplina.
function disciplinaVacia(d: Pick<Disciplina, "id" | "label" | "rama" | "requisito">): Disciplina {
  return {
    ...d,
    porNivel: [],
    reglas: [],
    modificadoresFatiga: [],
    modificadoresEconomia: [],
    bonosEnOtrasTiradas: [],
    ventajas: [],
    acciones: [],
  };
}

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

// Descuentos de la tabla: solo en las acciones que pagan la fila (no en
// Proyección, Auto-proyección ni Sensor).
const PAGAN_TABLA = [ANCLAJE_ID, TRASLADAR_ID];

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
  acciones: [ANCLAJE, TRASLADAR, PROYECCION, AUTO_PROYECCION, SENSOR],
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
    disciplinaVacia({ id: "resonancia", label: "Resonancia", rama: "metasensoria", requisito: null }),
    disciplinaVacia({ id: "induccion", label: "Inducción", rama: "metasensoria", requisito: { disciplina: "resonancia", nivel: 1 } }),
    disciplinaVacia({ id: "hipercognicion", label: "Hipercognición", rama: "metasensoria", requisito: { disciplina: "resonancia", nivel: 2 } }),
    TRASLACION,
    disciplinaVacia({ id: "contencion", label: "Contención", rama: "metrica", requisito: { disciplina: "traslacion", nivel: 1 } }),
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
