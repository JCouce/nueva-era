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
  resolucion: ATAQUE_SINGULARIDAD,
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
    disciplinaVacia({ id: "traslacion", label: "Traslación", rama: "metrica", requisito: null }),
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
