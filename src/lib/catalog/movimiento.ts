import type { NivelModulo } from "./equipo";

// ── Mejoras de movimiento ─────────────────────────────────────────────
// Fase D: no consumen ranura de subsistema, la armadura les pone un TOPE DE
// NIVEL propio (topeExoesqueleto/topeMovilidadAerea) en vez de contarlas
// como plaza ocupada. `tope` dice a qué columna de la armadura mirar, para
// no comparar por id a pelo en el motor.
//
// El bono de Fuerza del exoesqueleto se queda sin mecanizar a propósito: la
// regla lo excluye de vida y de varias salvaciones, y nuestro modificador de
// "atributo" no sabe hacer esa excepción sin inventarse un sistema de
// exclusiones a partir de una muestra de uno. Se queda en `detalle`, en
// texto, hasta que aparezca un segundo caso que justifique generalizarlo.
export type MejoraMovimiento = {
  familia: "movimiento";
  id: string;
  label: string;
  resumen: string;
  descripcion: string;
  tope: "exoesqueleto" | "movilidadAerea";
  niveles: NivelModulo[];
};

export const MOVIMIENTO: MejoraMovimiento[] = [
  {
    familia: "movimiento",
    id: "exoesqueleto",
    label: "Exoesqueleto",
    resumen: "Armazón externo que da más Fuerza a costa de peso y de limitar la agilidad.",
    tope: "exoesqueleto",
    descripcion:
      "Armazón externo que se instala mecánicamente en trajes y armaduras. No mejora las defensas " +
      "más que la propia armadura, pero da capacidades sin igual de potencia y de movimiento. Se ve " +
      "limitado al tamaño de la armadura: cuanta más fuerza da, más pesado es y más limita la " +
      "movilidad articular, así que los de mayor nivel solo caben en armaduras pesadas. Usa una " +
      "batería de 10 cargas (1 hora de funcionamiento cada una); recarga de una hora con conector " +
      "(1 carga cada 6 minutos), batería nueva 150 créditos, acción compleja con una mano libre.",
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 4000,
        detalle: [
          "+1 a la Fuerza en tiradas y atributos, pero NO en salvaciones contra efectos " +
            "ambientales, tóxicos o de fatiga, ni al calcular puntos de salud.",
          "Duplica el bonificador al calcular la carga transportable y en proezas de fuerza.",
          "Tan ligero que puede usarse sin armadura, oculto bajo ropa abultada.",
        ],
        // El bono de Fuerza excluye vida y varias salvaciones a propósito: si se
        // mecaniza como modificador de "atributo" tal cual, el motor lo aplicaría
        // también ahí, que es incorrecto. Se deja sin mecanizar hasta decidir
        // cómo modelar esa excepción (Fase D).
        modificadores: [],
        motor: [
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" }, // +1 Fuerza con excepciones, sin forma de modelar el carve-out hoy
        ],
      },
      {
        nivel: 2,
        rareza: "Común",
        coste: 24000,
        detalle: ["+2 a la Fuerza en las mismas tiradas."],
        modificadores: [],
        motor: [
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
        ],
      },
      {
        nivel: 3,
        rareza: "Poco Habitual",
        coste: 48000,
        detalle: ["+3 a la Fuerza en las mismas tiradas."],
        modificadores: [],
        motor: [
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
        ],
      },
      {
        nivel: 4,
        rareza: "Extraño",
        coste: 72000,
        detalle: ["+4 a la Fuerza en las mismas tiradas."],
        modificadores: [],
        motor: [
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
        ],
      },
    ],
  },
  {
    familia: "movimiento",
    id: "movilidad_aerea",
    label: "Movilidad Aérea",
    resumen: "Propulsores vectoriales para volar; -1 a los ataques mientras estás en el aire.",
    tope: "movilidadAerea",
    descripcion:
      "Propulsores vectoriales de alta potencia colocados en la armadura o el traje que permiten " +
      "impulsarse y desplazarse en vuelo controlado. Volar cuesta una acción simple con una tirada " +
      "de Reflejos + Tecnociencia en cada maniobra: si falla, solo se recorre la mitad del " +
      "movimiento; con fallo crítico, el desplazamiento es descontrolado en dirección aleatoria. En " +
      "vuelo hay -1 a los ataques, y las esquivas usan Tecnociencia en vez de Atletismo. Célula " +
      "interna de 10 cargas (mínimo 1 para volar); recarga de una hora con conector (1 carga cada 6 " +
      "minutos), batería nueva 150 créditos, acción compleja con una mano libre.",
    niveles: [
      {
        nivel: 1,
        rareza: "Poco Habitual",
        coste: 6000,
        detalle: [
          "Consumo: 1 carga por acción de vuelo.",
          "Dificultad de maniobrabilidad: -3. Velocidad: 50 m.",
          "Máxima potencia (acción compleja, 2 cargas): dobla el desplazamiento; en crítico, +25 m.",
        ],
        modificadores: [],
        velocidadM: 50,
        motor: [
          // velocidadM: derivado ya construido (lib/rules/derivados.ts::vuelo,
          // mostrado en ResumenTab) — Capa 1 → Derivado, sin Accion todavía
          // (no hay tirada "volar" en el motor), mismo patrón que el peso de
          // un arma en docs/motor.md. No es un hueco: el derivado en sí SÍ
          // está construido.
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
          // Dificultad de maniobrabilidad: apunta a una tirada "volar" que no
          // existe en ningún catálogo de tiradas (comprobado, no hay match en
          // tiradas.ts/derivados.ts) — a diferencia de velocidadM, esto ni
          // siquiera tiene un derivado que lo use.
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
          // -1 a los ataques mientras se está en vuelo, y las esquivas usan
          // Tecnociencia en vez de Atletismo mientras se vuela (descripcion de
          // la pieza, mismo texto para los 4 niveles) — corregido 2026-09-24
          // (auditoría, faltaban enteros). No hay estado "en vuelo" rastreado
          // en la ficha/Combatiente, así que ninguno de los dos puede engancharse
          // a una tirada concreta todavía.
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
          { tipo: "texto", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
        ],
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 36000,
        detalle: [
          "Consumo: 1 carga cada 2 acciones.",
          "Dificultad de maniobrabilidad: -3. Velocidad: 70 m.",
          "Máxima potencia: crítico +35 m.",
        ],
        modificadores: [],
        velocidadM: 70,
        motor: [
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
          // -1 a los ataques mientras se está en vuelo, y las esquivas usan
          // Tecnociencia en vez de Atletismo mientras se vuela (descripcion de
          // la pieza, mismo texto para los 4 niveles) — corregido 2026-09-24
          // (auditoría, faltaban enteros). No hay estado "en vuelo" rastreado
          // en la ficha/Combatiente, así que ninguno de los dos puede engancharse
          // a una tirada concreta todavía.
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
          { tipo: "texto", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
        ],
      },
      {
        nivel: 3,
        rareza: "Extraño",
        coste: 72000,
        detalle: [
          "Consumo: 1 carga cada 3 acciones.",
          "Dificultad de maniobrabilidad: -3. Velocidad: 100 m.",
          "Máxima potencia: crítico +50 m.",
          "Progresión: al llegar aquí se elige Velocidad (+20 m de velocidad base, crítico de " +
            "máxima potencia +60 m) o Maniobrabilidad (-1 a la dificultad de maniobra) — la " +
            "elección compromete el nivel 4.",
        ],
        modificadores: [],
        velocidadM: 100,
        motor: [
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
          // -1 a los ataques mientras se está en vuelo, y las esquivas usan
          // Tecnociencia en vez de Atletismo mientras se vuela (descripcion de
          // la pieza, mismo texto para los 4 niveles) — corregido 2026-09-24
          // (auditoría, faltaban enteros). No hay estado "en vuelo" rastreado
          // en la ficha/Combatiente, así que ninguno de los dos puede engancharse
          // a una tirada concreta todavía.
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
          { tipo: "texto", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
          // La elección Velocidad/Maniobrabilidad no se guarda en la ficha
          // todavía (comentario de NivelModulo.velocidadM) — texto puro hoy.
          { tipo: "texto", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
        ],
      },
      {
        nivel: 4,
        rareza: "Muy Extraño",
        coste: 108000,
        detalle: [
          "Consumo: 1 carga cada 4 acciones.",
          "Dificultad de maniobrabilidad: -4 (o mejor, según lo elegido en nivel 3).",
          "Velocidad: 140 m (160 con la mejora de Velocidad).",
          "Máxima potencia: crítico +70 m (+80 con la mejora de Velocidad).",
        ],
        modificadores: [],
        velocidadM: 140,
        motor: [
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
          // -1 a los ataques mientras se está en vuelo, y las esquivas usan
          // Tecnociencia en vez de Atletismo mientras se vuela (descripcion de
          // la pieza, mismo texto para los 4 niveles) — corregido 2026-09-24
          // (auditoría, faltaban enteros). No hay estado "en vuelo" rastreado
          // en la ficha/Combatiente, así que ninguno de los dos puede engancharse
          // a una tirada concreta todavía.
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
          { tipo: "texto", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
        ],
      },
    ],
  },
];
