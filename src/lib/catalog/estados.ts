// Catálogo de estados de combate — fuente: docs/sistema-y-combate.md
// §"Efectos y estados" (fase 6b, docs/fase-6b.md bloque 0, subtarea 0.3).
//
// **Qué NO está en `ESTADOS` y por qué:**
// - **Fatiga** y **Heridas**: el propio documento las remite a "Puntos de
//   fatiga"/"Puntos de golpe" — son los umbrales Herido/Malherido/Moribundo/
//   Fatigado/Exhausto. Viven abajo, en `ESTADOS_DERIVADOS`: los calcula
//   resolverFicha con la vida y la fatiga, nadie los pone ni los guarda.
// - **Muerte**: no es un estado con duración que se lleve puesto, es un
//   marcador terminal del combatiente — vive en el modelo de `Combatiente`
//   (bloque 1: derrotado/fuera de combate), no en este catálogo.
// Con esas tres fuera, quedan **20**, el número que ya cita docs/sistema.md §7. A esos se
// suman dos de la munición especial (cuestionario eq-22, usuario 2026-11-13): Supresores y
// Dosis acumulada, y el Shock en el equipo (S73, usuario 2026-11-14).
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
import { ESTADOS_DE_PODER } from "./psionica";

export type GradoEstado = {
  id: string;
  label: string;
  modificadores: Modificador[];
  detalle: string[];
  // null cuando el documento no da una duración por defecto para este grado.
  duracionTurnos: number | null;
  // Al acabársele las rondas, en vez de caerse pasa a este grado con estas rondas (mecanismo
  // general, descontarDuracion en rules/estados.ts): el fracaso crítico del Shock, que al turno
  // siguiente da los efectos del fracaso y luego se acaba (pl-01, usuario 2026-11-14).
  degrada?: { gradoId: string; rondas: number };
  // Lo que este grado le hace a las piezas que el estado afecta (Estado.afectaPiezas):
  // `apagadas`, no funcionan (FichaResuelta.piezasInutilizadas); `penaliza`, −N a cada bono
  // suyo (sin bajar de 0) y a las tiradas para usarlas, que aplica la app (pl-02, usuario
  // 2026-11-14; rules/shock.ts).
  piezas?: { apagadas: true } | { penaliza: number };
};

// Con qué se salva el estado cuando un efecto lo provoca (cuestionario eq-07, usuario
// 2026-11-13): el aviso del ataque lo lee de aquí ("El objetivo salva Fortaleza contra Shock,
// dificultad 5"). `tiradaId`: la tirada de la ficha que se usa, si existe una sola
// (Entorpecido, Reflejos + Atletismo, no tiene fila propia).
export type SalvacionEstado = { etiqueta: string; tiradaId?: string };

export type Estado = {
  id: string;
  label: string;
  // La frase/párrafo introductorio del estado, antes de cualquier grado.
  resumen: string;
  // Sin ella, el estado no se salva (Hemorragia) o nadie lo provoca con un efecto de arma.
  salvacion?: SalvacionEstado;
  // Al menos un grado. Los estados sin grados de salvación tienen uno solo
  // (id "activo") con el efecto fijo mientras dure.
  grados: GradoEstado[];
  // El estado guarda un número (EstadoActivo.valor, T4): cómo se lee. `porSentido`: además, lo
  // que la ocultación activa suma a cada sentido (Sigilo con el camuflaje, rules/sigilo.ts).
  valor?: { etiqueta?: string; porSentido?: true };
  // Lo puede quitar el propio jugador desde su ficha, con este botón (los de ocultación).
  quitarJugador?: string;
  // El jugador lo alarga `turnos` desde su ficha pagando de fatiga el número que guarda
  // (EstadoActivo.valor): el Sondeo No-Local con crítico (ps-07, rules/prolongarEstado.ts).
  prolongable?: { etiqueta: string; turnos: number };
  // Casillas que salen ya marcadas en las tiradas mientras dure (el camuflaje activo y la
  // cobertura de la esquiva, eq-26). Id de la CondicionTirada.
  marcaCasillas?: string[];
  // Qué piezas toca (rules/shock.ts): las que declaran ese tipo de afectación (`shock` del
  // catálogo de equipo). Lo que les hace, el `piezas` de cada grado.
  afectaPiezas?: "cuerpo" | "equipo";
  // Ponerlo pone también este otro estado, con el grado que diga `grados` (por el id del grado
  // puesto; sin entrada, nada) y estas rondas, en la misma acción del registro
  // (operacionesDe, rules/estadosFicha.ts): el Shock del cuerpo pone la Parálisis (pl-01).
  arrastra?: { estadoId: string; grados: Partial<Record<string, string>>; rondas: number };
  // Estado recordatorio de algo que se acaba con un coste (fa-03, usuario 2026-11-14: «Bajo Ultra
  // Estimulante», «Bajo Xovromium»): el jugador pulsa `etiqueta` en el modal del estado cuando se
  // acaba y la app, en una sola entrada del registro, se lo quita, le resta `fatiga` y le pone
  // `pone` (rules/acabarEstado.ts). Quitarlo con la × no hace nada de esto.
  alAcabar?: { etiqueta: string; fatiga: number; pone: { estadoId: string; gradoId: string }[] };
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
    salvacion: { etiqueta: "Fortaleza", tiradaId: "salv_fortaleza" },
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
    salvacion: { etiqueta: "Fortaleza", tiradaId: "salv_fortaleza" },
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
    salvacion: { etiqueta: "Fortaleza", tiradaId: "salv_fortaleza" },
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
    salvacion: { etiqueta: "Fortaleza", tiradaId: "salv_fortaleza" },
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
    salvacion: { etiqueta: "Saltar, levantarse (Potencia + Atletismo)", tiradaId: "atletismo" },
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
    salvacion: { etiqueta: "Reflejos + Atletismo" },
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
    salvacion: { etiqueta: "Fortaleza", tiradaId: "salv_fortaleza" },
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
    salvacion: { etiqueta: "Fortaleza", tiradaId: "salv_fortaleza" },
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
    salvacion: { etiqueta: "Reflejos", tiradaId: "salv_reflejos" },
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
    salvacion: { etiqueta: "Fortaleza", tiradaId: "salv_fortaleza" },
    resumen:
      "El cuerpo y los implantes (Fortaleza; Resiliencia en sintéticos, solo NPC). Duración " +
      "habitual 1 turno. Pone también Parálisis del mismo grado 1 turno. El equipo tecnológico " +
      "se salva aparte: «Shock en el equipo».",
    afectaPiezas: "cuerpo",
    arrastra: {
      estadoId: "paralisis",
      grados: { fracaso_critico: "fracaso_critico", fracaso: "fracaso", exito: "exito" },
      rondas: 1,
    },
    grados: [
      {
        id: "fracaso_critico",
        label: "Fracaso crítico",
        modificadores: [],
        detalle: [
          "Tus implantes se apagan: no funcionan mientras dure.",
          "Parálisis de fracaso crítico durante 1 turno.",
          "Al turno siguiente pasa a los efectos del fracaso; después se acaba.",
        ],
        duracionTurnos: 1,
        degrada: { gradoId: "fracaso", rondas: 1 },
        piezas: { apagadas: true },
      },
      {
        id: "fracaso",
        label: "Fracaso",
        modificadores: [],
        detalle: [
          "Tus implantes funcionan peor: −2 a su bono y −2 al usarlos.",
          "Parálisis de fracaso durante 1 turno.",
        ],
        duracionTurnos: 1,
        piezas: { penaliza: 2 },
      },
      {
        id: "exito",
        label: "Éxito",
        modificadores: [],
        detalle: [
          "Tus implantes funcionan peor: −1 a su bono y −1 al usarlos.",
          "Parálisis de éxito durante 1 turno.",
        ],
        duracionTurnos: 1,
        piezas: { penaliza: 1 },
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
  // S73 (pl-01, usuario 2026-11-14): el equipo tecnológico salva aparte, con Estructura (o el
  // blindaje), y el grado vale para todo lo que lleva a la vez, no pieza a pieza. Sin parálisis.
  {
    id: "shock_equipo",
    label: "Shock en el equipo",
    salvacion: { etiqueta: "Estructura (o blindaje) del equipo" },
    resumen:
      "Todo el equipo tecnológico que lleva a la vez (armadura tecnológica, mejoras y subsistemas " +
      "electrónicos, armas de energía), con un solo grado. Se salva con Estructura o el " +
      "blindaje. Duración habitual 1 turno.",
    afectaPiezas: "equipo",
    grados: [
      {
        id: "fracaso_critico",
        label: "Fracaso crítico",
        modificadores: [],
        detalle: [
          "Tus piezas electrónicas se apagan: no funcionan mientras dure.",
          "Al turno siguiente pasa a los efectos del fracaso; después se acaba.",
        ],
        duracionTurnos: 1,
        degrada: { gradoId: "fracaso", rondas: 1 },
        piezas: { apagadas: true },
      },
      {
        id: "fracaso",
        label: "Fracaso",
        modificadores: [],
        detalle: ["Tus piezas electrónicas funcionan peor: −2 a su bono y −2 al usarlas."],
        duracionTurnos: 1,
        piezas: { penaliza: 2 },
      },
      {
        id: "exito",
        label: "Éxito",
        modificadores: [],
        detalle: ["Tus piezas electrónicas funcionan peor: −1 a su bono y −1 al usarlas."],
        duracionTurnos: 1,
        piezas: { penaliza: 1 },
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
  // Munición Supresora (docs/fuente/equipamiento.md, Munición Especial; cuestionario eq-22,
  // usuario 2026-11-13): estado nuevo. Lo que hace a la fatiga de los poderes no es un
  // Modificador: lo cobra costeFatiga con FUENTES_EXTERNAS_FATIGA (catalog/psionica.ts), que
  // mira si el personaje tiene puesto este estado y en qué grado. Por eso aquí no lleva
  // `modificadores` (el −2 a la tirada del poder va en ese mismo sitio, para no contarlo dos
  // veces). 1 minuto = 10 turnos (el criterio de la psiónica, docs/sistema.md §10.6).
  {
    id: "supresores",
    label: "Supresores",
    // La fuente dice «salvación contra la toxina» sin nombrar el aplicado; va con Fortaleza, como
    // las toxinas del selector «Contra…» (usuario, 2026-11-13).
    salvacion: { etiqueta: "Fortaleza", tiradaId: "salv_fortaleza" },
    resumen:
      "Dosis de supresores en el cuerpo (Munición Supresora). Salvación contra la toxina. Afecta a " +
      "quien quiera usar habilidades psiónicas. Acumular fallos pasa a fallo crítico y prolonga la " +
      "duración.",
    grados: [
      {
        id: "fracaso_critico",
        label: "Fracaso crítico",
        modificadores: [],
        detalle: [
          "Sus poderes psiónicos cuestan el doble de fatiga y tienen -2 a la tirada.",
          "Además, recibe un nivel de daño letal por cada punto de fatiga que gaste en ellos.",
        ],
        duracionTurnos: 10,
      },
      {
        id: "fracaso",
        label: "Fracaso",
        modificadores: [],
        detalle: ["Sus poderes psiónicos cuestan el doble de fatiga y tienen -2 a la tirada."],
        duracionTurnos: 10,
      },
    ],
  },
  // "Aunque el objetivo supere la tirada recibirá un penalizador de -1 durante un turno en
  // tiradas de salvación contra mismos efectos (…) por aumento de la dosis" (Munición Tóxica,
  // Radiactiva y Supresora): el "estado corto de 1 turno" del cuestionario eq-22.
  // El nombre es nuestro (la fuente no le da ninguno); el usuario lo da por bueno (2026-11-13).
  {
    id: "dosis_acumulada",
    label: "Dosis acumulada",
    resumen:
      "Superó la salvación contra una toxina, pero la dosis le pesa: -1 a las salvaciones contra " +
      "esa misma toxina durante un turno.",
    grados: [
      {
        id: "activo",
        label: "Dosis acumulada",
        modificadores: [],
        detalle: [
          "-1 a las salvaciones contra la misma toxina (no mecanizado: la salvación no sabe de qué " +
            "toxina viene — aplícalo a mano).",
        ],
        duracionTurnos: 1,
      },
    ],
  },
];

// Estados propios de los aumentos activables (A5a, docs/propuesta-aumentos.md §A5): los pone
// el jugador desde Acciones → Aumentos (usarAccionAumentoAction) y viven en Character.estados
// como cualquier otro, para que caduquen con "Siguiente turno" y se vayan con "Limpiar estados".
// No están en ESTADOS, así que no salen en el selector del máster (PanelEstados). Sus
// `modificadores` van vacíos a propósito: los efectos los calcula aumentosActivables.ts con el
// estado Y la pieza equipada (sin la pieza, el estado no hace nada).
// TODO(revisar): el máster podría ponerlos por la API (validation.ts los acepta porque
// estadoPorId los encuentra); no hay botón para ello y no hace daño.
function gradoNeuroprotesis2(id: string, elegido: string, otros: string) {
  return {
    id,
    label: `+2 ${elegido}`,
    modificadores: [],
    detalle: [
      `+2 a las tiradas de ${elegido} y +1 a las de ${otros}. −1 a los penalizadores por ` +
        "heridas y fatiga, sin pasar de 0. −1 a las salvaciones de Fortaleza contra enfermedad, " +
        "radiación, toxinas y venenos.",
    ],
    duracionTurnos: 3,
  };
}

export const ESTADOS_DE_AUMENTO: Estado[] = [
  {
    id: "aum_neuroprotesis",
    label: "Neuroprótesis Simpática",
    resumen: "Implante activado: lucha o huida bajo demanda.",
    grados: [
      {
        id: "activo",
        label: "Nivel 1",
        modificadores: [],
        detalle: [
          "+1 a las tiradas de Potencia, Reflejos y Perspicacia. −1 a los " +
            "penalizadores por heridas y fatiga, sin pasar de 0. −1 a las salvaciones de " +
            "Fortaleza contra enfermedad, radiación, toxinas y venenos.",
        ],
        duracionTurnos: 3,
      },
      // Nivel 2: +2 a las tiradas del aplicado elegido (sync Drive 2026-11-14; antes, +2 a Fuerza o
      // Agilidad, grados «fuerza» y «agilidad»).
      gradoNeuroprotesis2("potencia", "Potencia", "Reflejos y Perspicacia"),
      gradoNeuroprotesis2("reflejos", "Reflejos", "Potencia y Perspicacia"),
      gradoNeuroprotesis2("perspicacia", "Perspicacia", "Potencia y Reflejos"),
    ],
  },
  // A5b: la acción simple adicional pagada a 3 con el nivel 4. Va aparte de aum_neuroprotesis
  // para no pisarla: al caerse este (1 ronda), la activa sigue con lo que le quede.
  {
    id: "aum_neuroprotesis_4",
    label: "Neuroprótesis Simpática 4",
    resumen: "Acción simple adicional a 3 de fatiga: +2 a las tiradas de Potencia, Reflejos y Perspicacia esta ronda.",
    grados: [
      {
        id: "activo",
        label: "Nivel 4",
        modificadores: [],
        detalle: [
          "+2 a las tiradas de Potencia, Reflejos y Perspicacia, que sustituye al +1/+2 de la " +
            "Neuroprótesis activa (no se suman). Sin penalizadores por heridas ni fatiga. No " +
            "se puede volver a usar hasta un descanso corto o largo.",
        ],
        duracionTurnos: 1,
      },
    ],
  },
  {
    id: "aum_proyeccion",
    label: "Proyección Neuro-Expresiva",
    resumen: "Interacciones sociales sin penalizadores.",
    grados: [
      {
        id: "activo",
        label: "Activa",
        modificadores: [],
        detalle: [
          "Sin penalizadores por heridas, fatiga ni estados en las tiradas de Actitud (sin pasar " +
            "de 0; el circunstancial no cambia).",
        ],
        duracionTurnos: null,
      },
    ],
  },
];

// Estados de ocultación (T4 del cuestionario, usuario 2026-11-13: eq-25, eq-26, eq-30, eq-31,
// eq-33, di-09). Los pone la app tras la tirada o la acción de quien se esconde
// (aplicarConsecuenciaPropiaAction), con su número en EstadoActivo.valor: la dificultad para
// detectarte. Nada los compara con la Alerta de nadie: el máster lo hace a ojo. Los quita el
// jugador (su botón) o el máster. No están en ESTADOS: sin número no tienen sentido, así que no
// salen en el selector del máster.
export const ESTADO_SIGILO_ID = "sigilo";
export const ESTADO_CAMUFLAJE_ID = "camuflaje";
export const ESTADO_ARMA_ESCONDIDA_ID = "arma_escondida";
export const ESTADO_DISFRAZADO_ID = "disfrazado";
// Una hora: 600 turnos de 6 segundos (criterio de la psiónica, 1 minuto = 10 turnos).
export const TURNOS_DISFRAZ = 600;

export const ESTADOS_DE_OCULTACION: Estado[] = [
  {
    id: ESTADO_SIGILO_ID,
    label: "Sigilo",
    resumen:
      "Escondido. El número es tu total de Sigilo: la dificultad para detectarte. Quien te busca lo " +
      "compara con su Alerta (en empate, gana la alerta). Disparar te lo baja.",
    valor: { porSentido: true },
    quitarJugador: "Salir del sigilo",
    grados: [{ id: "activo", label: "Sigilo", modificadores: [], detalle: [], duracionTurnos: null }],
  },
  {
    id: ESTADO_CAMUFLAJE_ID,
    label: "Camuflaje",
    resumen:
      "Camuflaje Trifásico en modo activo: su cobertura por sentido se suma a tu Sigilo y en la " +
      "esquiva cuenta como cobertura. La Malla Plasmática activa lo anula.",
    quitarJugador: "Apagar el camuflaje",
    // "Tengo cobertura" de la esquiva (ID_TENGO_COBERTURA, rules/acciones.ts; un test lo comprueba).
    marcaCasillas: ["tengo_cobertura"],
    grados: [
      {
        id: "estatico",
        label: "Estático",
        modificadores: [],
        detalle: ["Inmóvil: rendimiento óptimo del camuflaje."],
        duracionTurnos: null,
      },
      {
        id: "dinamico",
        label: "Dinámico",
        modificadores: [],
        detalle: ["En movimiento o atacando: menos cobertura y menos duración."],
        duracionTurnos: null,
      },
    ],
  },
  {
    id: ESTADO_ARMA_ESCONDIDA_ID,
    label: "Arma escondida",
    resumen: "Llevas un arma escondida. El número es la dificultad para descubrirla.",
    valor: { etiqueta: "dificultad" },
    quitarJugador: "Sacar el arma",
    grados: [{ id: "activo", label: "Arma escondida", modificadores: [], detalle: [], duracionTurnos: null }],
  },
  {
    id: ESTADO_DISFRAZADO_ID,
    label: "Disfrazado",
    resumen:
      "Disfraz Holográfico activo. El número es la dificultad para descubrirte; de cerca, la farsa " +
      "depende de tus habilidades sociales.",
    valor: { etiqueta: "dificultad" },
    quitarJugador: "Quitar el disfraz",
    grados: [{ id: "activo", label: "Disfrazado", modificadores: [], detalle: [], duracionTurnos: TURNOS_DISFRAZ }],
  },
];

// Fármacos con bajón (fa-03, usuario 2026-11-14). El Ultra Estimulante y el Xovromium dejan un
// recordatorio sin efecto mecánico («Bajo …»: sus bonos siguen en las casillas de las tiradas,
// td-14) que se acaba con su botón: 2 de fatiga y el bajón. El Rechazo lo pone la tirada fallada
// del Xovromium (rules/farmacos.ts). «Tiradas con atributos mentales» = las de Voluntad,
// Perspicacia y Expresión, salvaciones incluidas. Se suman entre ellos (cada uno es su fuente).
// La app no tiene reloj: duran hasta quitarlos y el texto dice cuánto. Los recordatorios los quita
// también el jugador (sin bajón); los bajones y el rechazo, solo el máster (usuario, 2026-11-14).
// No están en ESTADOS: no salen en el selector del máster (sí en su panel, para quitarlos).
export const ESTADO_BAJO_ULTRA_ID = "bajo_ultra_estimulante";
export const ESTADO_BAJO_XOVROMIUM_ID = "bajo_xovromium";
export const ESTADO_BAJON_ULTRA_ID = "bajon_ultra_estimulante";
export const ESTADO_BAJON_XOVROMIUM_ID = "bajon_xovromium";
export const ESTADO_RECHAZO_XOVROMIUM_ID = "rechazo_xovromium";

const MENTALES = ["voluntad", "perspicacia", "expresion"] as const;
const contraMentales = (valor: number): Modificador => ({ tipo: "tirada", alcance: { tipo: "aplicado", aplicados: [...MENTALES] }, valor });

export const ESTADOS_DE_FARMACO: Estado[] = [
  {
    id: ESTADO_BAJO_ULTRA_ID,
    label: "Bajo Ultra Estimulante",
    resumen:
      "Recordatorio de la dosis: sus efectos se marcan a mano en las casillas de cada tirada («Bajo " +
      "Ultra Estimulante» y «Ultra Estimulante contra el penalizador por heridas y fatiga»). Cuando se " +
      "acabe, aplica el bajón.",
    quitarJugador: "Quitar sin bajón",
    alAcabar: { etiqueta: "Se acabó: aplicar el bajón", fatiga: 2, pone: [{ estadoId: ESTADO_BAJON_ULTRA_ID, gradoId: "activo" }] },
    grados: [
      {
        id: "activo",
        label: "Bajo Ultra Estimulante",
        modificadores: [],
        detalle: ["Sin efecto propio: es un recordatorio.", "Dura 30 minutos. Al acabar: 2 de fatiga y «Bajón del Ultra»."],
        duracionTurnos: null,
      },
    ],
  },
  {
    id: ESTADO_BAJO_XOVROMIUM_ID,
    label: "Bajo Xovromium",
    resumen:
      "Recordatorio de la dosis: su efecto se marca a mano en la casilla «Bajo Xovromium» de tus poderes. " +
      "Cuando se acabe, aplica el bajón.",
    quitarJugador: "Quitar sin bajón",
    alAcabar: { etiqueta: "Se acabó: aplicar el bajón", fatiga: 2, pone: [{ estadoId: ESTADO_BAJON_XOVROMIUM_ID, gradoId: "activo" }] },
    grados: [
      {
        id: "activo",
        label: "Bajo Xovromium",
        modificadores: [],
        detalle: ["Sin efecto propio: es un recordatorio.", "Dura 1 hora. Al acabar: 2 de fatiga y «Bajón del Xovromium»."],
        duracionTurnos: null,
      },
    ],
  },
  {
    id: ESTADO_BAJON_ULTRA_ID,
    label: "Bajón del Ultra",
    resumen: "Depresión metabólica tras el Ultra Estimulante.",
    grados: [
      {
        id: "activo",
        label: "Bajón del Ultra",
        modificadores: [contraMentales(-1)],
        detalle: ["−1 a las tiradas con Voluntad, Perspicacia o Expresión.", "Dura 1 hora."],
        duracionTurnos: null,
      },
    ],
  },
  {
    id: ESTADO_BAJON_XOVROMIUM_ID,
    label: "Bajón del Xovromium",
    resumen: "Retroceso sináptico tras el Xovromium.",
    grados: [
      {
        id: "activo",
        label: "Bajón del Xovromium",
        modificadores: [contraMentales(-2)],
        detalle: ["−2 a las tiradas con Voluntad, Perspicacia o Expresión.", "Dura 1 hora."],
        duracionTurnos: null,
      },
    ],
  },
  {
    id: ESTADO_RECHAZO_XOVROMIUM_ID,
    label: "Rechazo del Xovromium",
    resumen: "Rechazo psioneuronal: la dosis no llegó a estabilizarse.",
    grados: [
      {
        id: "activo",
        label: "Rechazo del Xovromium",
        modificadores: [contraMentales(-1)],
        detalle: ["−1 a las tiradas con Voluntad, Perspicacia o Expresión.", "Dura 15 minutos."],
        duracionTurnos: null,
      },
    ],
  },
];

// Los umbrales de §7 como estados (usuario, 2026-10-28): Heridas y Fatiga, un nivel por estado
// (S14). Derivados, nunca guardados: los calcula resolverFicha con la vida y la fatiga
// (estadosDerivados, rules/estados.ts) y se van solos al volver por encima del umbral. Fuera de
// estadoPorId a propósito: así no los acepta la validación del máster (validation.ts), ni el
// lector de lo guardado (leerEstados), ni el selector (PanelEstados, que lista ESTADOS). Sus
// `modificadores` van vacíos: el −N, la media velocidad y la carga los sigue poniendo la lógica
// de umbrales (modificadoresDeUmbrales, movimientoPorUmbrales) con sus reducciones; aquí solo el
// texto para pintarlos. Los ids de grado son los de UmbralSalud/UmbralFatiga.
export const ESTADOS_DERIVADOS: Estado[] = [
  {
    id: "heridas",
    label: "Heridas",
    resumen:
      "Puntos de golpe por debajo de la mitad. Lo pone y lo quita la vida: sale solo al bajar del " +
      "umbral y se va al curarse por encima.",
    grados: [
      {
        id: "herido",
        label: "Herido",
        modificadores: [],
        detalle: ["Menos del 50 % de los puntos de golpe: −1 a todas las tiradas."],
        duracionTurnos: null,
      },
      {
        id: "malherido",
        label: "Malherido",
        modificadores: [],
        detalle: ["Menos del 25 % de los puntos de golpe: −3 a todas las tiradas, media velocidad y −25 % de carga."],
        duracionTurnos: null,
      },
      {
        id: "moribundo",
        label: "Moribundo",
        modificadores: [],
        detalle: [
          "Menos del 10 % de los puntos de golpe (mínimo 1): −5 a todas las tiradas, una casilla por " +
            "turno y −50 % de carga.",
        ],
        duracionTurnos: null,
      },
    ],
  },
  {
    id: "fatiga",
    label: "Fatiga",
    resumen:
      "Puntos de fatiga por debajo de la cuarta parte. Lo pone y lo quita la fatiga: sale solo al " +
      "bajar del umbral y se va al recuperarla.",
    grados: [
      {
        id: "fatigado",
        label: "Fatigado",
        modificadores: [],
        detalle: ["Menos del 25 % de los puntos de fatiga: −1 a todas las tiradas."],
        duracionTurnos: null,
      },
      {
        id: "exhausto",
        label: "Exhausto",
        modificadores: [],
        detalle: [
          "Menos del 10 % de los puntos de fatiga (mínimo 1): −2 a todas las tiradas, media velocidad " +
            "y −25 % de carga.",
        ],
        duracionTurnos: null,
      },
    ],
  },
];

// Los estados que se pueden poner y guardar (los del máster, los de los activables, los propios
// de los poderes: Contención, catalog/psionica.ts, los de ocultación, T4, y los de fármaco, fa-03). Los derivados no: ver ESTADOS_DERIVADOS.
// Los de poder, como los de aumento, no están en ESTADOS: no salen en el selector del máster.
export function estadoPorId(id: string): Estado | null {
  return (
    ESTADOS.find((e) => e.id === id) ??
    ESTADOS_DE_AUMENTO.find((e) => e.id === id) ??
    ESTADOS_DE_PODER.find((e) => e.id === id) ??
    ESTADOS_DE_OCULTACION.find((e) => e.id === id) ??
    ESTADOS_DE_FARMACO.find((e) => e.id === id) ??
    null
  );
}

// Para pintar: cualquiera, derivados incluidos.
export function estadoParaPintar(id: string): Estado | null {
  return estadoPorId(id) ?? ESTADOS_DERIVADOS.find((e) => e.id === id) ?? null;
}

export function esEstadoDeAumento(id: string): boolean {
  return ESTADOS_DE_AUMENTO.some((e) => e.id === id);
}

// La rejilla del panel de estados del máster: el catálogo que pone (ESTADOS) y, detrás, los que
// llevan puestos sus objetivos aunque no los ponga él (de ocultación, de aumento, de poder), solo
// para quitarlos (T4: el máster quita el Sigilo de un jugador).
export function estadosDelPanel(puestos: readonly string[]): { estado: Estado; soloQuitar: boolean }[] {
  const aparte = [...new Set(puestos)].flatMap((id) => {
    const e = ESTADOS.some((x) => x.id === id) ? null : estadoPorId(id);
    return e ? [{ estado: e, soloQuitar: true }] : [];
  });
  return [...ESTADOS.map((estado) => ({ estado, soloQuitar: false })), ...aparte];
}

// Los que el propio jugador puede quitarse desde su ficha: los de poder, los de ocultación y los
// de fármaco (los que llevan `quitarJugador`).
export function loQuitaElJugador(id: string): boolean {
  return esEstadoDePoder(id) || !!estadoPorId(id)?.quitarJugador;
}

// Estado propio de un poder (P1 de psiónica): el jugador lo pone al usar el poder y lo quita él.
export function esEstadoDePoder(id: string): boolean {
  return ESTADOS_DE_PODER.some((e) => e.id === id);
}
