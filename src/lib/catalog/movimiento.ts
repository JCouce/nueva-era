import type { NivelModulo } from "./equipo";

// ── Mejoras de movimiento ─────────────────────────────────────────────
// Fase D: no consumen ranura de subsistema, la armadura les pone un TOPE DE
// NIVEL propio (topeExoesqueleto/topeMovilidadAerea) en vez de contarlas
// como plaza ocupada. `tope` dice a qué columna de la armadura mirar, para
// no comparar por id a pelo en el motor.
//
// El bono de Fuerza del exoesqueleto está mecanizado: Modificador "atributo" con
// `exceptoSaludYSalvaciones` (no cuenta en la vida ni en las salvaciones, como dice la
// regla), y en movimiento y carga cuenta doble aparte (bonoFuerzaExoesqueleto,
// derivados.ts). Cabecera corregida 2026-10-24: antes decía que seguía en texto.
export type MejoraMovimiento = {
  familia: "movimiento";
  id: string;
  label: string;
  resumen: string;
  descripcion: string;
  tope: "exoesqueleto" | "movilidadAerea";
  // Solo Movilidad Aérea la declara hoy (docs/tareas.md, "Movilidad Aérea"):
  // el Exoesqueleto también menciona una batería de 10 cargas en su propia
  // `descripcion`, pero no se popula aquí — no hay ninguna acción que la
  // consuma todavía, añadirla sin uso real sería un recurso fantasma en la
  // pestaña Recursos. Mismo shape que Subsistema.celula a propósito, para
  // que capacidadDePieza() (recursos.ts) trate ambas familias igual.
  celula?: { cargas: number; recarga: string; bateriaCoste: number };
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
        // Sin vida ni salvaciones (exceptoSaludYSalvaciones); en movimiento y carga cuenta
        // doble aparte (bonoFuerzaExoesqueleto, derivados.ts). Cada nivel sustituye al anterior.
        modificadores: [{ tipo: "atributo", id: "fuerza", valor: 1, exceptoSaludYSalvaciones: true }],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
        ],
      },
      {
        nivel: 2,
        rareza: "Común",
        coste: 24000,
        detalle: ["+2 a la Fuerza en las mismas tiradas."],
        modificadores: [{ tipo: "atributo", id: "fuerza", valor: 2, exceptoSaludYSalvaciones: true }],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
        ],
      },
      {
        nivel: 3,
        rareza: "Poco Habitual",
        coste: 48000,
        detalle: ["+3 a la Fuerza en las mismas tiradas."],
        modificadores: [{ tipo: "atributo", id: "fuerza", valor: 3, exceptoSaludYSalvaciones: true }],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
        ],
      },
      {
        nivel: 4,
        rareza: "Extraño",
        coste: 72000,
        detalle: ["+4 a la Fuerza en las mismas tiradas."],
        modificadores: [{ tipo: "atributo", id: "fuerza", valor: 4, exceptoSaludYSalvaciones: true }],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "todas" }, mecanismo: "suma_derivado", estado: "construido" },
        ],
      },
    ],
  },
  {
    familia: "movimiento",
    // Propulsión Aérea desde la foto de Drive del 2026-11-14 (antes Movilidad Aérea): el id y
    // `topeMovilidadAerea` de las armaduras se quedan, para no migrar fichas.
    id: "movilidad_aerea",
    label: "Propulsión Aérea",
    resumen: "Propulsores vectoriales para volar; -1 a los ataques mientras estás en el aire.",
    tope: "movilidadAerea",
    descripcion:
      "Propulsores vectoriales de alta potencia colocados en la armadura o el traje que permiten " +
      "impulsarse y desplazarse en vuelo controlado. Volar cuesta una acción simple. Las maniobras " +
      "simples (línea recta, subir o bajar en vertical sin cambios bruscos) no tiran; las complejas " +
      "(virajes cerrados, curvas pronunciadas, cambios de rasante, esquivar obstáculos) piden Reflejos " +
      "+ Pilotaje (Exoarmadura). El mal tiempo o un entorno confinado pueden volver compleja una " +
      "maniobra simple. Si la maniobra falla, solo se recorre la mitad; con fracaso crítico, el " +
      "desplazamiento es descontrolado en dirección aleatoria, con riesgo de chocar. En vuelo hay -1 " +
      "a los ataques, y las esquivas usan Pilotaje (Exoarmadura) en vez de Atletismo, con la " +
      "dificultad de maniobra; un éxito crítico en esa esquiva da una reacción para desplazarse una " +
      "casilla. Célula interna de 10 cargas (mínimo 1 para volar); recarga de una hora con conector " +
      "(1 carga cada 6 minutos), batería nueva 150 créditos, acción compleja con una mano libre.",
    // Construido 2026-09-27 (docs/tareas.md, "Movilidad Aérea"): mismo shape
    // que Subsistema.celula, consumida por capacidadDePieza() (recursos.ts).
    celula: { cargas: 10, recarga: "1 hora con conector (1 carga cada 6 minutos)", bateriaCoste: 150 },
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
        maniobrabilidad: -3,
        notaTirada:
          "Acción simple, 1 carga por acción de vuelo. Solo se tira en maniobra compleja: fallo, recorres " +
          "la mitad; fracaso crítico, desplazamiento descontrolado en dirección aleatoria — resuélvelo " +
          "a mano. Activa Máxima Potencia (abajo) para declarar acción Compleja y 2 cargas en vez de " +
          "Simple y 1.",
        bonusCriticoM: 25,
        motor: [
          // "Volar" construido 2026-09-27 (docs/tareas.md, "Movilidad Aérea"):
          // accionesDeMovimiento() (lib/rules/movimiento.ts). Máxima Potencia
          // NO es una acción aparte — es la MISMA tirada jugada a lo grande
          // (toggle "maxima_potencia" en Accion.condiciones, resuelto por
          // resolverVuelo()), no un segundo tipo "acción sin dado".
          { tipo: "accion", afecta: { modo: "accion_nueva", id: "volar" }, mecanismo: "accion_equipo", estado: "construido" },
          // Maniobra simple sin tirada (usuario, 2026-11-14): «Volar», acción sin dado que gasta la
          // carga (accionesDirectasDeMovimiento); la compleja, «Volar: maniobra compleja», con
          // Reflejos + Pilotaje (Exoarmadura).
          { tipo: "accion", afecta: { modo: "accion_nueva", id: "volar_simple" }, mecanismo: "accion_equipo", estado: "construido" },
          // Crítico en la esquiva en vuelo: reacción para desplazarse una casilla (texto del
          // crítico de la casilla "En vuelo", conEsquivaEnVuelo).
          { tipo: "texto", afecta: { modo: "accion_existente", id: "defensa" }, mecanismo: "eleccion_jugador", estado: "construido" },
          // velocidadM: derivado ya construido (lib/rules/derivados.ts::vuelo,
          // mostrado en EstadosYDatos, en Recursos) — Capa 1 → Derivado, además de alimentar
          // ahora la nota de "Volar".
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
          // Dificultad de maniobrabilidad: penalizador (Murillo, 2026-10-26, pregunta 42) como
          // ajuste fijo al modificador de "Volar" y de la esquiva en vuelo (conEsquivaEnVuelo).
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "volar" }, mecanismo: "ajuste_fijo", estado: "construido" },
          // -1 a los ataques mientras se vuela (mismo texto en los 4 niveles): se lleva en mesa
          // (usuario, 2026-09-28; S94). La esquiva en vuelo y la maniobrabilidad sí
          // están: casilla "En vuelo" de la esquiva, con Pilotaje (Exoarmadura) desde 2026-11-14 (conEsquivaEnVuelo, S101).
          { tipo: "texto", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
          { tipo: "texto", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
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
        maniobrabilidad: -3,
        notaTirada:
          "Acción simple, 1 carga cada 2 acciones de vuelo. Solo se tira en maniobra compleja: fallo, " +
          "recorres la mitad; fracaso crítico, desplazamiento descontrolado. Máxima Potencia declara " +
          "acción Compleja y 2 cargas.",
        bonusCriticoM: 35,
        motor: [
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "volar" }, mecanismo: "ajuste_fijo", estado: "construido" },
          // -1 a los ataques mientras se vuela (mismo texto en los 4 niveles): se lleva en mesa
          // (usuario, 2026-09-28; S94). La esquiva en vuelo y la maniobrabilidad sí
          // están: casilla "En vuelo" de la esquiva, con Pilotaje (Exoarmadura) desde 2026-11-14 (conEsquivaEnVuelo, S101).
          { tipo: "texto", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
          { tipo: "texto", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
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
        maniobrabilidad: -3,
        notaTirada:
          "Acción simple, 1 carga cada 3 acciones de vuelo. Solo se tira en maniobra compleja: fallo, " +
          "recorres la mitad; fracaso crítico, desplazamiento descontrolado. Máxima Potencia declara " +
          "acción Compleja y 2 cargas.",
        bonusCriticoM: 50,
        // «El usuario debe elegir una de dos opciones de mejora (la cual comprometerá el siguiente
        // nivel)» (eq-36): se elige en Equipo; cambia los metros y la dificultad de «Volar», la
        // velocidad de vuelo de la ficha y la esquiva en vuelo (rules/eleccionNivel.ts).
        eleccion: {
          etiqueta: "Progresión",
          opciones: [
            { id: "velocidad", label: "Velocidad", detalle: "+20 m de velocidad base; el crítico de Máxima Potencia, +60 m (nivel 4: 160 m y +80 m)." },
            { id: "maniobrabilidad", label: "Maniobrabilidad", detalle: "1 menos de dificultad de maniobra (nivel 3: −2; nivel 4: −3)." },
          ],
        },
        porEleccion: {
          velocidad: { velocidadM: 120, bonusCriticoM: 60 },
          maniobrabilidad: { maniobrabilidad: -2 },
        },
        motor: [
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "volar" }, mecanismo: "ajuste_fijo", estado: "construido" },
          // -1 a los ataques mientras se vuela (mismo texto en los 4 niveles): se lleva en mesa
          // (usuario, 2026-09-28; S94). La esquiva en vuelo y la maniobrabilidad sí
          // están: casilla "En vuelo" de la esquiva, con Pilotaje (Exoarmadura) desde 2026-11-14 (conEsquivaEnVuelo, S101).
          { tipo: "texto", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
          { tipo: "texto", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
          // La Progresión (eq-36): la elección guardada en la pieza cambia el ajuste fijo de
          // maniobrabilidad de «Volar» (y su velocidad, el derivado de arriba).
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "volar" }, mecanismo: "ajuste_fijo", estado: "construido" },
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
        maniobrabilidad: -4,
        notaTirada:
          "Acción simple, 1 carga cada 4 acciones de vuelo. Solo se tira en maniobra compleja: fallo, " +
          "recorres la mitad; fracaso crítico, desplazamiento descontrolado. Máxima Potencia declara " +
          "acción Compleja y 2 cargas.",
        bonusCriticoM: 70,
        // La Progresión elegida en el nivel 3: «velocidad 140 metros (o 160 si eligió la progresión
        // de Velocidad)», «70 metros adicionales (u 80…)», «dificultad base -4 (modificada según la
        // elección)».
        porEleccion: {
          velocidad: { velocidadM: 160, bonusCriticoM: 80 },
          maniobrabilidad: { maniobrabilidad: -3 },
        },
        motor: [
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "volar" }, mecanismo: "ajuste_fijo", estado: "construido" },
          // -1 a los ataques mientras se vuela (mismo texto en los 4 niveles): se lleva en mesa
          // (usuario, 2026-09-28; S94). La esquiva en vuelo y la maniobrabilidad sí
          // están: casilla "En vuelo" de la esquiva, con Pilotaje (Exoarmadura) desde 2026-11-14 (conEsquivaEnVuelo, S101).
          { tipo: "texto", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
          { tipo: "texto", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
        ],
      },
    ],
  },
];
