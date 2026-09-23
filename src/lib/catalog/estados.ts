// Catálogo de estados de combate — fuente: docs/sistema-y-combate.md
// §"Efectos y estados" (fase 6b, docs/fase-6b.md bloque 0, subtarea 0.3).
//
// **Qué NO está aquí y por qué:**
// - **Fatiga** y **Heridas**: el propio documento las remite a "Puntos de
//   fatiga"/"Puntos de golpe" — son exactamente los umbrales
//   Herido/Malherido/Moribundo/Fatigado/Exhausto que ya se derivan solos en
//   `modificadoresDeUmbrales()` (subtarea 0.2a). No son un estado que el
//   máster aplique a mano, así que no duplican entrada aquí.
// - **Muerte**: no es un estado con duración que se lleve puesto, es un
//   marcador terminal del combatiente — vive en el modelo de `Combatiente`
//   (bloque 1: derrotado/fuera de combate), no en este catálogo.
// Con esas tres fuera, quedan **20**, el número que ya cita docs/sistema.md §7.
//
// **Metodología de transcripción (S16, docs/sistema.md):** cada grado
// (Fracaso crítico/Fracaso/Éxito/Éxito crítico, o nivel acumulado) se trata
// como autocontenido — no se suma al texto base salvo que el documento diga
// "además de lo anterior". Se mecaniza como `Modificador` un número que:
//   (a) reduce un **atributo básico directamente**, cuando el documento lo
//       dice así ("Fuerza y Aguante en 1"), o
//   (b) es un penalizador **plano a "todas las tiradas"** sin condición
//       (alcance "todas", subtarea 0.1).
// Se queda solo en `detalle` (texto, sin mecanizar):
//   - penalizadores a "tiradas que usen" un atributo o aplicado concreto
//     (p. ej. "tiradas de Perspicacia y Expresión", "tiradas que usen Fuerza
//     o Agilidad") — no hay alcance de modificador para eso todavía; sería
//     el siguiente hueco del motor si algún día compensa mecanizarlo,
//     mismo criterio que llevó a "todas" en la subtarea 0.1;
//   - reducción de velocidad/carga por umbral — mismo motivo que la 0.2b
//     aparcada: es un porcentaje o un tope fijo, no una resta plana;
//   - daño narrado (letal, grave, por fuego...) — se aplica con la acción de
//     delta de PG de la consola de máster (bloque 2), no como modificador
//     pasivo de personaje;
//   - fallos automáticos, probabilidades ("50% de posibilidades") y
//     cualquier condición que dependa de que el narrador decida algo
//     ("una casilla en la dirección que el atacante escoja") — mecanizarlo
//     sería inventar una regla que el documento no da como número.
//
// No le pongas un alcance a un modificador "para que haga algo": si el
// texto no da un número plano e incondicional, se queda en `detalle` y se
// aplica a criterio del máster, como ya se hace con Fármacos/VTF en el
// catálogo de equipo (docs/sistema.md §12).
import type { Modificador } from "../rules/modificadores";

export type GradoEstado = {
  id: string;
  label: string;
  modificadores: Modificador[];
  detalle: string[];
  // null cuando el documento no da una duración por defecto para este grado.
  duracionTurnos: number | null;
};

export type Estado = {
  id: string;
  label: string;
  // La frase/párrafo introductorio del estado, antes de cualquier grado.
  resumen: string;
  // Al menos un grado. Los estados sin grados de salvación tienen uno solo
  // (id "activo") con el efecto fijo mientras dure.
  grados: GradoEstado[];
};

export const ESTADOS: Estado[] = [
  {
    id: "atrapado",
    label: "Atrapado",
    resumen: "No puede moverse de su casilla.",
    grados: [
      {
        id: "activo",
        label: "Atrapado",
        modificadores: [],
        detalle: [
          "No puede emplear acciones que requieran ambas manos y sufre -2 al usar acciones con una " +
            "sola mano.",
          "Liberarse: normalmente Potencia o Fortaleza + Atletismo, o una maniobra de pelea " +
            "enfrentada si es un agarre enemigo.",
        ],
        duracionTurnos: null,
      },
    ],
  },
  {
    id: "aturdido",
    label: "Aturdido",
    resumen:
      "No puede tomar acciones salvo moverse una casilla o defenderse. Debe superar Fortaleza " +
      "(dificultad 8) o suelta todo lo que sujete.",
    grados: [
      {
        id: "fracaso_critico",
        label: "Fracaso crítico",
        modificadores: [{ tipo: "tirada", alcance: { tipo: "grupo", grupo: "Defensa" }, valor: -2 }],
        detalle: [
          "Solo puede moverse una casilla o defenderse, con -2 a la defensa.",
          "Suelta automáticamente lo que sujetara.",
        ],
        duracionTurnos: 1,
      },
      {
        id: "fracaso",
        label: "Fracaso",
        modificadores: [{ tipo: "tirada", alcance: { tipo: "grupo", grupo: "Defensa" }, valor: -1 }],
        detalle: [
          "Solo puede moverse una casilla o defenderse, con -1 a la defensa.",
          "-4 en tiradas de Perspicacia y Expresión (no mecanizado: son aplicados, no un grupo ni " +
            "una habilidad — aplícalo a mano).",
          "Debe superar Fortaleza (dificultad 8) o suelta lo que sujete.",
        ],
        duracionTurnos: 1,
      },
      {
        id: "exito",
        label: "Éxito",
        modificadores: [{ tipo: "tirada", alcance: { tipo: "todas" }, valor: -1 }],
        detalle: [
          "-2 en Perspicacia y Expresión (no mecanizado, mismo motivo que el fracaso).",
          "Puede actuar libremente: no está limitado a moverse o defenderse.",
        ],
        duracionTurnos: 1,
      },
      {
        id: "exito_critico",
        label: "Éxito crítico",
        modificadores: [],
        detalle: ["Ningún efecto."],
        duracionTurnos: 0,
      },
    ],
  },
  {
    id: "ceguera",
    label: "Ceguera",
    resumen:
      "Falla automáticamente percepción visual y ataques a distancia, y no puede emprender " +
      "acciones defensivas. En melee o movimiento, 50% de posibilidades (sic) de fallar.",
    grados: [
      {
        id: "fracaso",
        label: "Fracaso",
        modificadores: [],
        detalle: [
          "Fallo automático en percepción visual y ataques a distancia; sin acciones defensivas.",
          "En ataque melee o movimiento, 50% de posibilidades de fallar; si falla el movimiento, el " +
            "narrador escoge la casilla donde se interrumpe.",
          "Dura 1 turno; después, -2 a percepción visual y ataques a distancia durante 5 turnos más " +
            "(no mecanizado: no hay alcance de modificador solo para ataques a distancia todavía).",
        ],
        duracionTurnos: 1,
      },
      {
        id: "fracaso_critico",
        label: "Fracaso crítico",
        modificadores: [],
        detalle: ["Queda permanentemente ciego — mismos efectos que el fracaso, para siempre."],
        duracionTurnos: null,
      },
      {
        id: "exito",
        label: "Éxito",
        modificadores: [],
        detalle: ["-2 a percepción visual y ataques a distancia durante un turno."],
        duracionTurnos: 1,
      },
      {
        id: "exito_critico",
        label: "Éxito crítico",
        modificadores: [],
        detalle: ["Ningún penalizador."],
        duracionTurnos: 0,
      },
    ],
  },
  {
    id: "confusion",
    label: "Confusión",
    resumen: "No es capaz de distinguir lo que percibe.",
    grados: [
      {
        id: "fallo",
        label: "Fallo",
        modificadores: [{ tipo: "tirada", alcance: { tipo: "todas" }, valor: -1 }],
        detalle: [
          "-4 en Perspicacia y Expresión en vez del -1 general (no mecanizado por separado: son " +
            "aplicados, aplícalo a mano en lugar del -1 si la tirada es de esas dos).",
          "No puede emplear acciones complejas.",
          "Cada turno, 50% de no distinguir aliados de enemigos ni entender códigos lingüísticos.",
        ],
        duracionTurnos: null,
      },
      {
        id: "fracaso_critico",
        label: "Fracaso crítico",
        modificadores: [{ tipo: "tirada", alcance: { tipo: "todas" }, valor: -2 }],
        detalle: [
          "Cada turno debe salvar Voluntad (dificultad 8) o pasa a estar también aterrorizado " +
            "(ver el estado Miedo).",
        ],
        duracionTurnos: null,
      },
      {
        id: "exito",
        label: "Éxito",
        modificadores: [],
        detalle: ["-1 en Perspicacia y Expresión durante un turno (no mecanizado, son aplicados)."],
        duracionTurnos: 1,
      },
      {
        id: "exito_critico",
        label: "Éxito crítico",
        modificadores: [],
        detalle: ["Ningún efecto."],
        duracionTurnos: 0,
      },
    ],
  },
  {
    id: "congelacion",
    label: "Congelación",
    resumen:
      "Salvación habitual de Fortaleza. Al fallar, un nivel de daño letal sin absorción, más " +
      "penalizadores que escalan con los niveles acumulados (docs/sistema-y-combate.md).",
    grados: [
      {
        id: "nivel_1",
        label: "Nivel 1",
        modificadores: [],
        detalle: [
          "-1 a todas las tiradas que usen Fuerza o Agilidad (no mecanizado: penaliza la tirada, " +
            "no el atributo — aplícalo a mano).",
          "Reduce la velocidad habitual (mínimo 2 metros); el efecto aumenta por cada nivel " +
            "adicional (no mecanizado, mismo motivo que la 0.2b aparcada: es un tope, no un delta).",
        ],
        duracionTurnos: null,
      },
      {
        id: "nivel_2",
        label: "Nivel 2",
        modificadores: [],
        detalle: ["Solo la mitad de su movimiento."],
        duracionTurnos: null,
      },
      {
        id: "nivel_3",
        label: "Nivel 3",
        modificadores: [],
        detalle: ["Una casilla de movimiento."],
        duracionTurnos: null,
      },
      {
        id: "nivel_4",
        label: "Nivel 4",
        modificadores: [],
        detalle: ["Paralizado (ver el estado Parálisis)."],
        duracionTurnos: null,
      },
      {
        id: "nivel_5",
        label: "Nivel 5",
        modificadores: [],
        detalle: ["Cae inconsciente aunque conserve PG positivos."],
        duracionTurnos: null,
      },
    ],
  },
  {
    id: "corrosion",
    label: "Corrosión",
    resumen:
      "Destruye materiales y tejido. Accion de Fortaleza; al fracasar, dos niveles de daño grave " +
      "y el equipamiento arriesga su estructura o blindaje.",
    grados: [
      {
        id: "fracaso",
        label: "Fracaso",
        modificadores: [],
        detalle: [
          "Dos niveles de daño grave.",
          "El equipamiento debe superar una tirada de estructura (misma dificultad) o recibe dos " +
            "niveles de daño y pierde tanta estructura/blindaje como daño recibido.",
        ],
        duracionTurnos: null,
      },
      {
        id: "fracaso_critico",
        label: "Fracaso crítico",
        modificadores: [],
        detalle: ["El agente corrosivo sigue actuando en los turnos siguientes hasta obtener éxito."],
        duracionTurnos: null,
      },
      {
        id: "exito",
        label: "Éxito",
        modificadores: [],
        detalle: [
          "Un nivel de daño letal; el equipamiento recibe un nivel de daño sin perder estructura " +
            "ni blindaje.",
        ],
        duracionTurnos: null,
      },
      {
        id: "exito_critico",
        label: "Éxito crítico",
        modificadores: [],
        detalle: ["Libre de todo efecto."],
        duracionTurnos: 0,
      },
    ],
  },
  {
    id: "derribado",
    label: "Derribado",
    resumen:
      "-2 a la defensa contra ataques melee. Debe emplear una acción de movimiento como acción " +
      "simple para levantarse. Salvación por defecto: Potencia + Atletismo.",
    grados: [
      {
        id: "activo",
        label: "Derribado",
        modificadores: [],
        detalle: [
          "-2 a la defensa contra ataques melee (no mecanizado: el grupo Defensa del motor no " +
            "distingue melee de distancia, y aplicarlo a las dos sería más severo de lo que dice " +
            "la regla).",
        ],
        duracionTurnos: null,
      },
    ],
  },
  {
    id: "enfermedad",
    label: "Enfermedad",
    resumen:
      "Algunas enfermedades imponen penalizadores propios; si no, escala por niveles acumulados. " +
      "Puede requerir varias salvaciones para contagiarse o para frenar su avance.",
    grados: [
      {
        id: "nivel_1",
        label: "Nivel 1",
        modificadores: [
          { tipo: "atributo", id: "fuerza", valor: -1 },
          { tipo: "atributo", id: "aguante", valor: -1 },
        ],
        detalle: ["Fuerza y Aguante -1 (afecta a PG, fatiga, movimiento, carga y daño melee)."],
        duracionTurnos: null,
      },
      {
        id: "nivel_2",
        label: "Nivel 2",
        modificadores: [
          { tipo: "atributo", id: "fuerza", valor: -2 },
          { tipo: "atributo", id: "aguante", valor: -2 },
          { tipo: "tirada", alcance: { tipo: "todas" }, valor: -1 },
        ],
        detalle: ["Fuerza y Aguante -2, y -1 a todas las tiradas."],
        duracionTurnos: null,
      },
      {
        id: "nivel_3",
        label: "Nivel 3",
        modificadores: [
          { tipo: "atributo", id: "fuerza", valor: -3 },
          { tipo: "atributo", id: "aguante", valor: -3 },
          { tipo: "tirada", alcance: { tipo: "todas" }, valor: -2 },
        ],
        detalle: ["Fuerza y Aguante -3, y -2 a todas las tiradas."],
        duracionTurnos: null,
      },
      {
        id: "nivel_4",
        label: "Nivel 4",
        modificadores: [
          { tipo: "atributo", id: "fuerza", valor: -4 },
          { tipo: "atributo", id: "aguante", valor: -4 },
          { tipo: "tirada", alcance: { tipo: "todas" }, valor: -3 },
        ],
        detalle: ["Fuerza y Aguante -4, y -3 a todas las tiradas."],
        duracionTurnos: null,
      },
      {
        id: "nivel_5",
        label: "Nivel 5",
        modificadores: [],
        detalle: ["Muerte."],
        duracionTurnos: null,
      },
    ],
  },
  {
    id: "entorpecido",
    label: "Entorpecido",
    resumen: "Suele salvarse con Reflejos + Atletismo. Salvo indicación, dura 1 turno.",
    grados: [
      {
        id: "fallo",
        label: "Fallo (o acierto del atacante)",
        modificadores: [],
        detalle: [
          "-1 a todas las tiradas que usen Fuerza, Agilidad y Percepción mientras dure (no " +
            "mecanizado: penaliza la tirada, no el atributo — aplícalo a mano).",
        ],
        duracionTurnos: 1,
      },
      {
        id: "fracaso_critico",
        label: "Fracaso crítico (o crítico del atacante)",
        modificadores: [],
        detalle: [
          "Además del -1 de arriba, velocidad de movimiento básico a la mitad, en la casilla que " +
            "el atacante escoja.",
        ],
        duracionTurnos: 1,
      },
      {
        id: "exito",
        label: "Éxito",
        modificadores: [],
        detalle: ["-1 solo a la próxima tirada que use Fuerza, Agilidad o Percepción."],
        duracionTurnos: 1,
      },
      {
        id: "exito_critico",
        label: "Éxito crítico",
        modificadores: [],
        detalle: ["Ningún efecto."],
        duracionTurnos: 0,
      },
    ],
  },
  {
    id: "envenenamiento",
    label: "Envenenamiento",
    resumen: "Accion casi siempre de Fortaleza. Algunos venenos imponen penalizadores propios.",
    grados: [
      {
        id: "nivel_1",
        label: "Nivel 1",
        modificadores: [{ tipo: "tirada", alcance: { tipo: "todas" }, valor: -1 }],
        detalle: ["-1 a todas las tiradas y un nivel de daño letal."],
        duracionTurnos: null,
      },
      {
        id: "nivel_2",
        label: "Nivel 2",
        modificadores: [{ tipo: "tirada", alcance: { tipo: "todas" }, valor: -2 }],
        detalle: ["-2 y otro nivel de daño letal."],
        duracionTurnos: null,
      },
      {
        id: "nivel_3",
        label: "Nivel 3",
        modificadores: [{ tipo: "tirada", alcance: { tipo: "todas" }, valor: -3 }],
        detalle: ["-3 y otro nivel de daño letal."],
        duracionTurnos: null,
      },
      {
        id: "nivel_4",
        label: "Nivel 4",
        modificadores: [{ tipo: "tirada", alcance: { tipo: "todas" }, valor: -4 }],
        detalle: ["-4 y otro nivel de daño letal."],
        duracionTurnos: null,
      },
      {
        id: "nivel_5",
        label: "Nivel 5",
        modificadores: [],
        detalle: ["Muerte."],
        duracionTurnos: null,
      },
    ],
  },
  {
    id: "fusion",
    label: "Fusión",
    resumen:
      "Somete tejido y equipamiento a temperaturas extremas. Accion de Fortaleza; al fracasar, " +
      "dos niveles de daño grave y el equipamiento arriesga estructura o blindaje.",
    grados: [
      {
        id: "fracaso",
        label: "Fracaso",
        modificadores: [],
        detalle: [
          "Dos niveles de daño grave.",
          "El equipamiento debe superar una tirada de estructura (misma dificultad) o recibe dos " +
            "niveles de daño, pierde estructura/blindaje, y sus piezas móviles se bloquean o funden.",
        ],
        duracionTurnos: null,
      },
      {
        id: "fracaso_critico",
        label: "Fracaso crítico",
        modificadores: [],
        detalle: [
          "La energía residual de plasma sigue fundiendo el entorno y los componentes en los " +
            "turnos siguientes hasta obtener éxito.",
        ],
        duracionTurnos: null,
      },
      {
        id: "exito",
        label: "Éxito",
        modificadores: [],
        detalle: [
          "Un nivel de daño grave; el equipamiento recibe un nivel de daño sin perder estructura " +
            "ni blindaje.",
        ],
        duracionTurnos: null,
      },
      {
        id: "exito_critico",
        label: "Éxito crítico",
        modificadores: [],
        detalle: ["Disipa el exceso térmico y libera de todo efecto."],
        duracionTurnos: 0,
      },
    ],
  },
  {
    id: "hemorragia",
    label: "Hemorragia",
    resumen: "Solo afecta a orgánicos.",
    grados: [
      {
        id: "activo",
        label: "Hemorragia",
        modificadores: [],
        detalle: [
          "Un nivel de daño letal sin posibilidad de absorción cada turno que dure el estado.",
          "La medicina puede interrumpir el desangramiento con la acción adecuada.",
        ],
        duracionTurnos: null,
      },
    ],
  },
  {
    id: "inmovilizado",
    label: "Inmovilizado",
    resumen: "No puede emplear ninguna acción física que no sea tratar de liberarse.",
    grados: [
      {
        id: "activo",
        label: "Inmovilizado",
        modificadores: [],
        detalle: [
          "Con éxito al tratar de liberarse pasa a estar atrapado; con éxito crítico, se libera " +
            "por completo.",
        ],
        duracionTurnos: null,
      },
    ],
  },
  {
    id: "llamarada",
    label: "Llamarada",
    resumen:
      "Salvación habitual de Reflejos. Al fallar, arde: cada turno recibe daño de fuego, por " +
      "defecto 2 niveles con posibilidad de absorción.",
    grados: [
      {
        id: "fracaso",
        label: "Fracaso",
        modificadores: [],
        detalle: [
          "2 niveles de daño por fuego cada turno (por defecto, con posibilidad de absorción).",
          "Una acción simple para sacudirse o rodar reduce la dificultad de la salvación en 5; " +
            "otro personaje puede asistir con una acción simple de la misma dificultad.",
        ],
        duracionTurnos: null,
      },
      {
        id: "fracaso_critico",
        label: "Fracaso crítico",
        modificadores: [],
        detalle: [
          "El doble de niveles ese turno y sigue en llamas.",
          "En orgánicos, espasmo respiratorio: se aplican automáticamente los efectos de aturdido " +
            "durante un turno.",
        ],
        duracionTurnos: null,
      },
      {
        id: "exito",
        label: "Éxito",
        modificadores: [],
        detalle: [
          "No recibe daño, pero sigue envuelto en llamas: repite la tirada cada turno hasta un " +
            "éxito crítico, que lo libra por completo.",
        ],
        duracionTurnos: null,
      },
    ],
  },
  {
    id: "miedo",
    label: "Miedo",
    resumen:
      "Otro personaje puede liberarle con una acción estándar y Expresión + Actitud enfrentada a " +
      "quien lo aterrorizó. Con la especialidad de Liderazgo, puede contrarrestarse a todos los " +
      "afectados en 30 metros de una vez.",
    grados: [
      {
        id: "asustado",
        label: "Asustado",
        modificadores: [{ tipo: "tirada", alcance: { tipo: "todas" }, valor: -1 }],
        detalle: [
          "El penalizador se dobla en cualquier tirada contra el objeto de su miedo (no " +
            "mecanizado: no hay alcance por objetivo — aplícalo a mano cuando corresponda).",
        ],
        duracionTurnos: null,
      },
      {
        id: "aterrorizado",
        label: "Aterrorizado",
        modificadores: [{ tipo: "tirada", alcance: { tipo: "todas" }, valor: -1 }],
        detalle: [
          "Mantiene el -1 de Asustado (doblado contra el objeto de su miedo).",
          "No puede emplear acciones contra el objeto de su miedo, salvo defenderse o huir.",
        ],
        duracionTurnos: null,
      },
    ],
  },
  {
    id: "paralisis",
    label: "Parálisis",
    resumen:
      "El cuerpo no responde, pero la mente y los sentidos sí. Duración por defecto 1 turno; al " +
      "terminar, sufre los efectos del grado inmediatamente superior de salvación, y así cada " +
      "turno hasta no sufrir efecto alguno. Medicina (acción compleja, misma dificultad) reduce " +
      "un nivel; con éxito crítico, libera de todo efecto.",
    grados: [
      {
        id: "fracaso_critico",
        label: "Fracaso crítico",
        modificadores: [],
        detalle: ["No puede realizar ninguna acción que implique movimiento."],
        duracionTurnos: 1,
      },
      {
        id: "fracaso",
        label: "Fracaso",
        modificadores: [
          { tipo: "atributo", id: "fuerza", valor: -4 },
          { tipo: "atributo", id: "agilidad", valor: -4 },
        ],
        detalle: ["Fuerza y Agilidad -4, y velocidad reducida a una casilla."],
        duracionTurnos: 1,
      },
      {
        id: "exito",
        label: "Éxito",
        modificadores: [
          { tipo: "atributo", id: "fuerza", valor: -1 },
          { tipo: "atributo", id: "agilidad", valor: -1 },
        ],
        detalle: ["Fuerza y Agilidad -1, y -4 metros de velocidad."],
        duracionTurnos: 1,
      },
      {
        id: "exito_critico",
        label: "Éxito crítico",
        modificadores: [],
        detalle: ["Ningún efecto."],
        duracionTurnos: 0,
      },
    ],
  },
  {
    id: "shock",
    label: "Shock",
    resumen:
      "Resistencia: Fortaleza en orgánicos, Resiliencia en sintéticos, Estructura en equipamiento " +
      "o armadura tecnológica. Duración habitual 1 turno. Los grados de abajo son la tabla de " +
      "orgánicos e implantes — sintéticos y armadura tienen su propia tabla en " +
      "docs/sistema-y-combate.md, sin mecanizar aquí (hoy sin sintéticos ni aumentos en la ficha, " +
      "no hay nada que un modificador pudiera tocar todavía).",
    grados: [
      {
        id: "fracaso_critico",
        label: "Fracaso crítico",
        modificadores: [],
        detalle: [
          "Los implantes quedan totalmente inutilizados mientras dure el estado (salvo " +
            "excepciones) y sufre parálisis con parámetros de fracaso crítico durante 1 turno.",
        ],
        duracionTurnos: 1,
      },
      {
        id: "fracaso",
        label: "Fracaso",
        modificadores: [],
        detalle: [
          "Los bonificadores de los implantes se reducen en 2 y -2 en tiradas destinadas a su uso.",
          "Además, parálisis con parámetros de fracaso durante 1 turno.",
        ],
        duracionTurnos: 1,
      },
      {
        id: "exito",
        label: "Éxito",
        modificadores: [],
        detalle: [
          "Igual que el fracaso, pero el beneficio del implante se reduce en 1 y el penalizador " +
            "es de -1.",
        ],
        duracionTurnos: 1,
      },
      {
        id: "exito_critico",
        label: "Éxito crítico",
        modificadores: [],
        detalle: ["Ningún efecto."],
        duracionTurnos: 0,
      },
    ],
  },
  {
    id: "sordera",
    label: "Sordera",
    resumen:
      "Salvación normalmente de Fortaleza. Medicina (Perspicacia), acción compleja con " +
      "instrumental, misma dificultad que la salvación: con éxito reduce un nivel, con éxito " +
      "crítico libera de todo efecto.",
    grados: [
      {
        id: "fracaso_critico",
        label: "Fracaso crítico",
        modificadores: [],
        detalle: [
          "Pierde la audición de forma permanente: fallo automático en percepción auditiva y -3 " +
            "en tiradas de equilibrio o para evitar derribos.",
        ],
        duracionTurnos: null,
      },
      {
        id: "fracaso",
        label: "Fracaso",
        modificadores: [],
        detalle: [
          "Sordo por completo durante un turno; después, -4 en percepción auditiva y -2 en " +
            "equilibrio o para evitar derribos durante otro turno más.",
        ],
        duracionTurnos: 2,
      },
      {
        id: "exito_critico",
        label: "Éxito crítico",
        modificadores: [],
        detalle: ["Ningún efecto."],
        duracionTurnos: 0,
      },
    ],
  },
  {
    id: "sorprendido_desprevenido",
    label: "Sorprendido y desprevenido",
    resumen:
      "Otro personaje que haya percibido la amenaza puede usar una reacción para señalar al " +
      "enemigo cuando ataque, reduciendo un grado el nivel de sorpresa (no acumulable contra el " +
      "mismo enemigo).",
    grados: [
      {
        id: "sorprendido",
        label: "Sorprendido",
        modificadores: [],
        detalle: [
          "-3 en la primera tirada defensiva contra un enemigo oculto (no mecanizado: es solo la " +
            "primera tirada, no un penalizador continuo — quítalo tras usarlo).",
        ],
        duracionTurnos: null,
      },
      {
        id: "desprevenido",
        label: "Desprevenido",
        modificadores: [],
        detalle: [
          "Si el atacante oculto sacó éxito crítico en sigilo, se considera indetectable: no puede " +
            "efectuar ninguna acción defensiva contra su primer ataque.",
        ],
        duracionTurnos: null,
      },
    ],
  },
  {
    id: "inconsciencia",
    label: "Inconsciencia",
    resumen:
      "Cae inconsciente al perder todos sus puntos de golpe (necesita medicina para " +
      "estabilizarse) o al agotar por completo sus puntos de fatiga (necesita descansar para " +
      "recuperar al menos un punto y despertar).",
    grados: [
      {
        id: "activo",
        label: "Inconsciente",
        modificadores: [],
        detalle: ["No puede actuar de ninguna forma mientras dure."],
        duracionTurnos: null,
      },
    ],
  },
];

export function estadoPorId(id: string): Estado | null {
  return ESTADOS.find((e) => e.id === id) ?? null;
}
