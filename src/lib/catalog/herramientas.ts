// Catálogo de Herramientas y Accesorios — fuente: docs/equipamiento.md,
// sección "Herramientas y Accesorios" (líneas 1059-1206). Segundo de los
// tres bloques que quedaban sin transcribir (ver docs/traspaso.md); primero
// fue Medicina y Farmacia (catalog/medicina.ts), tercero es Armamento
// Pesado + Granadas.
//
// Cómo conecta a tiradas (docs/modificadores-tiradas.md): Radar, Escáner
// Detector y Disfraz Holográfico piden Perspicacia + Tecnociencia — pareja
// distinta de "Buscar/percibir" (Perspicacia + Exploración) — así que NO
// son un bono a esa tirada: son su propia acción, generada dinámicamente
// por tenerlos equipados (lib/rules/herramientas.ts, mismo patrón que
// combate.ts con las armas). Ninguno de los tres trae un bono numérico
// limpio que mecanizar: la "dificultad 7" o "dificultad 6 superficial, 8
// profundo" que da el documento es la dificultad que el jugador teclea en
// el modal, no un modificador — se transcribe en `notaTirada`, igual que
// ya hace `nota` en ACCIONES con "Gel sanador y estabilizar tienen
// dificultad 4". La Valija Táctica de Fabricación tampoco trae ningún
// número limpio (a diferencia de la Valija Médica, que sí daba "+N a las
// tiradas de aplicación"): su uso real es la acción sin dado "Reparar y
// Fabricar" (ReparaFabricaModal.tsx, docs/tareas.md tarea 8), sin modificador.
import type { Herramienta, Consumible } from "./equipo";
import type { MotorMetadata } from "../rules/motor";

// docs/motor.md — patrones compartidos por varios niveles de este archivo,
// para no repetir el mismo array literal en cada uno.

// VTF: sin ningún Modificador propio, a diferencia de la Valija Médica —
// "valija_tactica_fabricacion" no aparece en ETIQUETA_ACCION de
// lib/rules/herramientas.ts, no genera tirada propia. Pero SÍ es tipo 5
// (habilitador, docs/motor.md): tieneVtf() (lib/rules/equipo.ts) gatea la
// sección Fabricar de la acción sin dado "Reparar y Fabricar" — sin la VTF
// equipada, esa sección ni se pinta, bloqueo duro. `afecta.id` no es un
// tiradaId real: "Reparar y Fabricar" no vive en ACCIONES (no tira dado,
// ver "Acciones sin dado" en motor.md, sigue sin arquitectura genérica) — es
// el id informal de esa fila en AccionesTab.tsx/ReparaFabricaModal.tsx.
// `mecanismo: "gate_instalacion"` es el más parecido de los que existen,
// aunque ese mecanismo genérico para el tipo 5 sigue sin construirse de
// verdad (motor.md) — esto es una comprobación puntual (`tieneVtf`), no esa
// infraestructura; por eso `estado: "ad_hoc"`, no "construido" a secas.
const MOTOR_VTF: MotorMetadata[] = [
  {
    tipo: "habilitador",
    afecta: { modo: "accion_existente", id: "reparar_fabricar" },
    mecanismo: "gate_instalacion",
    arbitraje: "duro",
    estado: "ad_hoc",
  },
];

export const VALIJA_TACTICA_FABRICACION: Herramienta = {
  familia: "herramienta",
  id: "valija_tactica_fabricacion",
  label: "Valija Táctica de Fabricación (VTF)",
  resumen: "Taller y laboratorio portátil: fabrica, repara y recicla en el campo.",
  descripcion:
    "Estuche acorazado desplegable, transportable a la espalda como mochila táctica. Combina un " +
    "escáner de alta resolución con un sistema de síntesis integral capaz de procesar sólidos, " +
    "fluidos y gases presurizados. Su software es actualizable y alberga un catálogo exhaustivo " +
    "de herramientas, componentes y microsubsistemas industriales.",
  niveles: [
    {
      nivel: 1,
      rareza: "Común",
      coste: 5000,
      detalle: [
        "Sin materiales no pasa de 3 kg; con los cartuchos llenos, 4,5 o 5 kg.",
        "Fabricación, análisis, reparación y reciclaje de campo: dificultad base 7 para lo común, " +
          "+2 por cada rango de rareza superior. Éxito crítico da gran calidad (+1 a resistencia " +
          "frente a corrosión y shock, +2 puntos de estructura).",
        "Sintetizar exige materia prima adecuada a la rareza. Acción compleja y Perspicacia + " +
          "Tecnociencia o Biociencia (Mecánica, Química o Bioquímica según lo que se fabrique). " +
          "1 minuto por kilogramo (redondeando al alza).",
        "Reparaciones: acción compleja y Perspicacia + la habilidad técnica aplicable, con -4 a " +
          "la dificultad. Cada dos éxitos repara un nivel de daño no grave; con cuatro, uno grave. " +
          "También purga estados de shock con Perspicacia + Tecnociencia.",
        "Recuperación de materia prima: acción compleja por kilogramo, dificultad igual a la de " +
          "fabricación. Éxito crítico recupera el 50% del precio base; éxito normal, el 25%.",
      ],
      modificadores: [],
      motor: MOTOR_VTF,
    },
    {
      nivel: 2,
      rareza: "Poco Habitual",
      coste: 30000,
      detalle: [
        "Fabrica objetos poco habituales con la dificultad de los comunes.",
        "Reparar un objeto dañado o en shock pasa a acción estándar.",
      ],
      modificadores: [],
      motor: MOTOR_VTF,
    },
    {
      nivel: 3,
      rareza: "Extraño",
      coste: 60000,
      detalle: [
        "La recuperación de materia prima sube a 75% con crítico y 50% con éxito normal.",
        "Reparar un objeto en shock pasa a acción simple. Desenfundar la valija pasa a acción " +
          "estándar.",
      ],
      modificadores: [],
      motor: MOTOR_VTF,
    },
    {
      nivel: 4,
      rareza: "Muy Extraño",
      coste: 90000,
      detalle: [
        "Cada kilogramo por encima del insignificante consume una acción compleja en vez de " +
          "1 minuto.",
        "En recuperación de materia prima, cualquier éxito cuenta como crítico. En reparaciones, " +
          "los daños graves se consideran de categoría ordinaria.",
      ],
      modificadores: [],
      motor: MOTOR_VTF,
    },
  ],
};

// Las 3 herramientas activas (Radar, Escáner Detector, Disfraz Holográfico)
// generan su propia tirada vía accionesDeHerramientas() (lib/rules/herramientas.ts)
// SOLO en los niveles que traen `notaTirada` — hoy son todos los niveles de
// las 3, pero el motor por id, no por familia entera (comentario de cabecera
// de lib/rules/herramientas.ts: "no hay una fórmula común, cada herramienta
// tiene su propia mecánica"). Dos efectos por nivel: la acción en sí, y el
// propio notaTirada volcado como nota — mismo patrón que arma.especial.
function motorHerramientaActiva(idAccion: string): MotorMetadata[] {
  return [
    { tipo: "accion", afecta: { modo: "accion_nueva", id: idAccion }, mecanismo: "accion_equipo", estado: "construido" },
    { tipo: "texto", afecta: { modo: "accion_existente", id: idAccion }, mecanismo: "nota_fija", estado: "ad_hoc" },
  ];
}
const MOTOR_RADAR = motorHerramientaActiva("herramienta_radar");
const MOTOR_DISFRAZ = motorHerramientaActiva("herramienta_disfraz_holografico");
const MOTOR_ESCANER = motorHerramientaActiva("herramienta_escaner_detector");

export const RADAR: Herramienta = {
  familia: "herramienta",
  id: "radar",
  label: "Radar",
  resumen: "Pulsos electromagnéticos que localizan movimiento, calor y masas a distancia.",
  descripcion:
    "Emite pulsos de ondas electromagnéticas o milimétricas optimizadas para rebotar en " +
    "superficies, objetos y organismos, proyectando una representación digital en tiempo real " +
    "sobre el visor. Formatos variados: dispositivos de mano, pantallas de antebrazo, visores " +
    "integrados en cascos o equipos pesados.",
  niveles: [
    {
      nivel: 1,
      rareza: "Común",
      coste: 500,
      detalle: ["Localiza movimiento, calor, masas inanimadas y firmas biológicas."],
      modificadores: [],
      notaTirada: "Acción simple para barrido rápido. Dificultad 7. Alcance 20 m.",
      motor: MOTOR_RADAR,
    },
    {
      nivel: 2,
      rareza: "Poco Habitual",
      coste: 5000,
      detalle: [
        "Distingue automáticamente entre firmas biológicas, maquinaria y objetos inanimados, " +
          "filtrando falsos positivos.",
      ],
      modificadores: [],
      notaTirada:
        "Acción simple, dificultad 7. Alcance 100 m; distingue orgánicos/maquinaria/sintéticos " +
        "con crítico, y a 20 m o menos el éxito normal cuenta como crítico a ese efecto.",
      motor: MOTOR_RADAR,
    },
    {
      nivel: 3,
      rareza: "Extraño",
      coste: 25000,
      detalle: [
        "Barrido estructural con ondas de baja frecuencia: ve a través de coberturas ligeras y " +
          "tabiques.",
      ],
      modificadores: [],
      notaTirada:
        "Penetración parcial: acción estándar, dificultad 8, alcance 20 m. En función habitual, " +
        "alcance 500 m, distinguiendo tipos hasta 100 m.",
      motor: MOTOR_RADAR,
    },
    {
      nivel: 4,
      rareza: "Muy Extraño",
      coste: 62500,
      detalle: [
        "Sincronizado por micro-enlaces cuánticos: procesa y predice trayectorias en tiempo real.",
        "Marcar un objetivo (acción simple) le reduce en 1 sus defensas de cobertura y " +
          "bonificaciones de camuflaje mientras siga en alcance y a la vista.",
      ],
      modificadores: [],
      notaTirada:
        "Alcance habitual 1 km, distinguiendo tipos en todo el alcance; penetra coberturas " +
        "ligeras hasta 100 m.",
      motor: MOTOR_RADAR,
    },
  ],
};

export const DISFRAZ_HOLOGRAFICO: Herramienta = {
  familia: "herramienta",
  id: "disfraz_holografico",
  label: "Disfraz Holográfico",
  resumen: "Proyecta una apariencia falsa; altera la luz, no la masa.",
  descripcion:
    "Red de micro-emisores flexibles adheridos a puntos críticos del cuerpo. Proyecta un " +
    "entramado fotónico tridimensional basado en archivos digitales, fotografías o vídeo en " +
    "tiempo real, superponiendo una apariencia falsa. Limitado por la envergadura del usuario.",
  niveles: [
    {
      nivel: 1,
      rareza: "Poco Habitual",
      coste: 4000,
      detalle: [
        "Diseñar un disfraz desde cero lleva unos 10 minutos de calibración.",
        "Duración 1 hora; recarga 10 minutos a batería completa (o gastando una carga de " +
          "subsistema, si el traje o armadura la tiene).",
        "Mantener la farsa en distancias cortas depende de las habilidades sociales y de " +
          "subterfugio del personaje.",
      ],
      modificadores: [],
      notaTirada:
        "Activar es acción simple. El resultado de la tirada marca la dificultad para ser " +
        "descubierto.",
      motor: MOTOR_DISFRAZ,
    },
    {
      nivel: 2,
      rareza: "Extraño",
      coste: 20000,
      detalle: [
        "Incorpora micro-almohadas de distorsión neumática o campos de luz dura y software de " +
          "IA facial en tiempo real: altera moderadamente silueta y volumen corporal, mitigando " +
          "en parte las penalizaciones por envergadura.",
        "Reduce el rediseño o cambio de perfil guardado a 1 minuto.",
      ],
      modificadores: [],
      notaTirada:
        "Activar es acción simple. El resultado de la tirada marca la dificultad para ser " +
        "descubierto.",
      motor: MOTOR_DISFRAZ,
    },
  ],
};

export const ESCANER_DETECTOR: Herramienta = {
  familia: "herramienta",
  id: "escaner_detector",
  label: "Escáner Detector",
  resumen: "Ultrasonido y rayos X de baja intensidad para inspeccionar sin contacto.",
  descripcion:
    "Dispositivo manual o acoplado que emite ultrasonido focalizado de baja intensidad y rayos X " +
    "de retrodispersión segura, penetrando ropa y tejido superficial para analizar densidades " +
    "sin contacto. Ideal para inspección rápida de pasajeros o detección de armas ocultas.",
  niveles: [
    {
      nivel: 1,
      rareza: "Común",
      coste: 500,
      detalle: [],
      modificadores: [],
      notaTirada: "Dificultad 6.",
      motor: MOTOR_ESCANER,
    },
    {
      nivel: 2,
      rareza: "Poco Habitual",
      coste: 5000,
      detalle: [
        "Versión de grado médico-militar: atraviesa ropa y blindajes ligeros, analiza la " +
          "composición química a nivel molecular (sustancias, drogas, explosivos, agentes " +
          "biológicos) e identifica implantes cibernéticos, marcapasos o modificaciones " +
          "sintéticas.",
      ],
      modificadores: [],
      notaTirada:
        "Perspicacia + Tecnociencia, o Biociencia para peritaje orgánico/químico. Acción " +
        "compleja. Dificultad 6 superficial, 8 escáner profundo.",
      motor: MOTOR_ESCANER,
    },
  ],
};

// Agregado — las 4 de arriba son piezas únicas (no una familia con niveles
// de rareza como armas/armaduras), así que se exportaban sueltas. Este array
// existe solo para que el código que recorre "todas las piezas de un
// catálogo" (el test de MotorMetadata, docs/motor.md) tenga un único patrón
// de iteración en vez de tener que distinguir objeto-suelto de array. Los
// exports individuales de arriba siguen igual para quien ya los use por nombre.
export const HERRAMIENTAS_UNICAS: Herramienta[] = [
  VALIJA_TACTICA_FABRICACION,
  RADAR,
  DISFRAZ_HOLOGRAFICO,
  ESCANER_DETECTOR,
];

// "Permite construir hasta rareza X" y "+N a la tirada al reparar con la
// valija" (columna Extra): ninguno de los dos se mecaniza como Modificador
// numérico — decisión del usuario 2026-09-25 (docs/tareas.md, tarea 8,
// "Fabricar y Reparar"): la rareza del material es la CAPACIDAD para
// fabricar/reparar objetos de esa rareza, no un bono a una tirada existente.
// Materiales deja de equiparse como pieza (ver MATERIALES más abajo) y pasa
// a ser un recurso con cantidad; `rareza`/`coste` los lee directo
// rarezaMaterial()/precioMaterial() (recursos.ts) para las acciones
// Fabricar/Reparar — igual que "Coste y rareza" ya queda fuera del modelo
// de los cinco tipos en motor.md ("metadatos de creación/economía, no
// efecto de la pieza"), `narrativo` aquí es eso, no "sin código que lo use".
const MOTOR_MATERIAL_RAREZA: MotorMetadata[] = [
  { tipo: "narrativo", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
];

export const MATERIALES: Consumible[] = [
  {
    familia: "consumible",
    id: "materiales_sencillos",
    label: "Materiales Sencillos",
    resumen: "Permiten fabricar objetos comunes y poco habituales con la VTF.",
    descripcion: "Materia prima para la Valija Táctica de Fabricación.",
    detalle: [
      "Permite construir objetos de rareza Común y Poco Habitual, y reparar armaduras y " +
        "sintéticos.",
      "Para fabricar hay que emplear material suficiente para igualar el precio del objeto.",
    ],
    pesoKg: null,
    rareza: "Poco Habitual",
    coste: 250,
    modificadores: [],
    motor: MOTOR_MATERIAL_RAREZA,
  },
  {
    familia: "consumible",
    id: "materiales_sofisticados",
    label: "Materiales Sofisticados",
    resumen: "Permiten fabricar hasta rareza Extraño con la VTF, con bono al reparar.",
    descripcion: "Materia prima para la Valija Táctica de Fabricación.",
    detalle: [
      "Permite construir objetos de rareza Común, Poco Habitual y Extraña, y reparar armaduras " +
        "y sintéticos.",
      "+2 a la tirada al reparar objetos comunes y poco habituales con la valija.",
    ],
    pesoKg: null,
    rareza: "Extraño",
    coste: 500,
    modificadores: [],
    motor: MOTOR_MATERIAL_RAREZA,
  },
  {
    familia: "consumible",
    id: "materiales_avanzados",
    label: "Materiales Avanzados",
    resumen: "Permiten fabricar hasta rareza Muy Extraño con la VTF, con bono al reparar.",
    descripcion: "Materia prima para la Valija Táctica de Fabricación.",
    detalle: [
      "Permite construir objetos de rareza Común, Poco Habitual, Extraña y Muy Extraña, y " +
        "reparar armaduras y sintéticos.",
      "+4 a la tirada al reparar objetos de hasta rareza extraña.",
    ],
    pesoKg: null,
    rareza: "Muy Extraño",
    coste: 750,
    modificadores: [],
    motor: MOTOR_MATERIAL_RAREZA,
  },
];
