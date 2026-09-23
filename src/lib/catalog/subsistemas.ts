import type { NivelModulo } from "./equipo";

export type Subsistema = {
  familia: "subsistema";
  id: string;
  label: string;
  resumen: string;
  descripcion: string;
  ranurasQueConsume: number; // siempre 1: lo que varía es cuántas admite la armadura
  // "Modos" en sentido amplio: de uso (Activo/Pasivo del camuflaje) o de
  // ataque (las cuatro filas del Proyector de Pulso) — mismo shape, distinto
  // significado según la pieza.
  modos: { label: string; descripcion: string }[];
  accionActivacion: string;
  // Opcional: el Escudo Deflector no usa el sistema estándar de 10 cargas +
  // batería (es autorrecargable con el movimiento y los impactos), así que se
  // omite en vez de forzarlo a encajar.
  celula?: { cargas: number; recarga: string; bateriaCoste: number };
  notaApilamiento?: string;
  niveles: NivelModulo[];
};

export const SUBSISTEMAS: Subsistema[] = [
  {
    familia: "subsistema",
    id: "camuflaje_trifasico",
    label: "Camuflaje Trifásico",
    resumen: "Oculta al usuario en tres frentes a la vez: visual, térmico y acústico.",
    descripcion:
      "La tecnología de infiltración definitiva para trajes y armaduras avanzadas. Se divide en " +
      "tres fases de ocultación simultánea: Ocultación Visual (altera el índice de refracción de " +
      "la superficie), Ocultación Térmica (enmascara la firma de calor corporal) y Ocultación " +
      "Acústica (amortigua el sonido de los movimientos). El campo puede expandirse ligeramente " +
      "para ocultar objetos en contacto directo con el portador, de tamaño limitado.",
    ranurasQueConsume: 1,
    accionActivacion: "Activar el camuflaje es una acción gratuita y consume una carga.",
    celula: { cargas: 10, recarga: "1 hora con conector (1 carga cada 6 minutos)", bateriaCoste: 150 },
    modos: [
      {
        label: "Modo Activo",
        descripcion:
          "Máxima eficiencia de ocultación; permite una acción simple para esconderse. Estático " +
          "(inmóvil, rendimiento óptimo) o Dinámico (movimientos bruscos o ataques, menos eficiencia).",
      },
      {
        label: "Modo Pasivo",
        descripcion:
          "Protección básica continua contra sensores infrarrojos y sónar mientras el sistema " +
          "mantenga una carga mínima en espera. Se pierde si se agotan las baterías o se apaga.",
      },
    ],
    notaApilamiento:
      "El beneficio de cobertura se aúna con las coberturas convencionales. De entre ambas, la de " +
      "menor puntuación suma solo la mitad de su valor al penalizador total.",
    niveles: [
      {
        nivel: 1,
        rareza: "Poco Habitual",
        coste: 8000,
        detalle: [
          "Duración modo activo: 1 min estático / 1 turno dinámico.",
          "Cobertura activa estático (Visual/Térmica/Acústica): 3 / 3 / 4.",
          "Cobertura activa dinámico (Visual/Térmica/Acústica): 2 / 1 / 2.",
          "Cobertura pasiva (Térmica/Acústica): 1 / 1.",
        ],
        // Sin modificadores: la cobertura depende del modo y de si el usuario
        // está quieto o en movimiento, así que no hay un número único que
        // aplique "mientras se lleva puesto" (ver docs/traspaso.md §6).
        modificadores: [],
        // Cobertura: sube la dificultad de QUIEN busca/detecta/dispara al
        // portador, nunca una tirada propia — mismo problema estructural que
        // Compartimento Oculto (objetivo_tercero, mecanismo nota_fija ya
        // aceptado en conversación, sin tirada de portador donde colgarlo
        // todavía). Un único efecto por nivel aunque `detalle` liste varios
        // números (activo estático/dinámico, pasivo): son variantes del mismo
        // concepto según modo/movimiento, no efectos distintos.
        motor: [
          { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "buscar_percibir" }, mecanismo: "nota_fija", estado: "bloqueado", bloqueoPor: "objetivo_tercero sin tirada de portador donde colgar la nota" },
        ],
      },
      {
        nivel: 2,
        rareza: "Extraño",
        coste: 48000,
        detalle: [
          "Duración modo activo: 5 min estático / 2 turnos dinámico.",
          "Cobertura activa estático (Visual/Térmica/Acústica): 4 / 4 / 4.",
          "Cobertura activa dinámico (Visual/Térmica/Acústica): 2 / 1 / 2.",
          "Cobertura pasiva (Térmica/Acústica): 1 / 1.",
        ],
        modificadores: [],
        motor: [
          { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "buscar_percibir" }, mecanismo: "nota_fija", estado: "bloqueado", bloqueoPor: "objetivo_tercero sin tirada de portador donde colgar la nota" },
        ],
      },
      {
        nivel: 3,
        rareza: "Muy Extraño",
        coste: 96000,
        detalle: [
          "Duración modo activo: 10 min estático / 4 turnos dinámico.",
          "Cobertura activa estático (Visual/Térmica/Acústica): 4 / 4 / 4.",
          "Cobertura activa dinámico (Visual/Térmica/Acústica): 3 / 2 / 3.",
          "Cobertura pasiva (Térmica/Acústica): 2 / 2.",
        ],
        modificadores: [],
        motor: [
          { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "buscar_percibir" }, mecanismo: "nota_fija", estado: "bloqueado", bloqueoPor: "objetivo_tercero sin tirada de portador donde colgar la nota" },
        ],
      },
      {
        nivel: 4,
        rareza: "Muy Extraño",
        coste: 144000,
        detalle: [
          "Duración modo activo: 20 min estático / 6 turnos dinámico.",
          "Cobertura activa estático (Visual/Térmica/Acústica): 4 / 4 / 4.",
          "Cobertura activa dinámico (Visual/Térmica/Acústica): 4 / 3 / 3.",
          "Cobertura pasiva (Térmica/Acústica): 3 / 3.",
        ],
        modificadores: [],
        motor: [
          { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "buscar_percibir" }, mecanismo: "nota_fija", estado: "bloqueado", bloqueoPor: "objetivo_tercero sin tirada de portador donde colgar la nota" },
        ],
      },
    ],
  },
  {
    familia: "subsistema",
    id: "derivacion_psionica",
    label: "Derivación Psiónica",
    resumen: "Absorbe la fatiga de manifestar poderes psiónicos desviándola a la batería.",
    descripcion:
      "Pieza de ingeniería avanzada para operadores psiónicos. Canalizar la energía de la mente " +
      "pura genera un estrés electroquímico y térmico devastador sobre el sistema nervioso " +
      "central, provocando fatiga extrema y colapsos sinápticos. Integra una red de filamentos " +
      "superconductores y micro-condensadores de resonancia cuántica en el forro interno, y actúa " +
      "como capacitor de desahogo mental: intercepta el exceso de la onda psiónica durante la " +
      "manifestación de poderes y lo deriva de forma segura a la batería principal.",
    ranurasQueConsume: 1,
    accionActivacion:
      "Gastar cargas de la célula para mitigar la fatiga psiónica acumulada se declara al usar el poder.",
    celula: { cargas: 10, recarga: "1 hora con conector (1 carga cada 6 minutos)", bateriaCoste: 150 },
    modos: [],
    niveles: [
      {
        nivel: 1,
        rareza: "Extraño",
        coste: 12000,
        detalle: [
          "Conversión Psiónica: 4 cargas para absorber 1 punto de fatiga psiónica.",
          "Ventaja Táctica — Estabilizador Neuronal Básico: +1 a las tiradas para resistir el " +
            "retroceso o la desorientación por el uso prolongado de disciplinas psiónicas.",
        ],
        modificadores: [
          // Los poderes psiónicos están PENDIENTE en sistema.md: no hay tirada
          // de resistir retroceso psiónico todavía. El id queda como marcador
          // para cuando exista — no se aplica a nada mientras tanto.
          { tipo: "tirada", alcance: { tipo: "tiradaId", id: "resistir_retroceso_psionico" }, valor: 1 },
        ],
        motor: [
          { tipo: "accion", afecta: { modo: "accion_nueva", id: "conversion_psionica" }, mecanismo: "accion_equipo", estado: "bloqueado", bloqueoPor: "Acciones sin dado" }, // Conversión Psiónica: acción sin dado, motor.md ya la cita como ejemplo del hueco
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "resistir_retroceso_psionico" }, mecanismo: "siempre_activo", estado: "bloqueado", bloqueoPor: "Fase 5" }, // Estabilizador Neuronal Básico
        ],
      },
      {
        nivel: 2,
        rareza: "Muy Extraño",
        coste: 72000,
        detalle: [
          "Conversión Psiónica: 3 cargas por 1 punto de fatiga.",
          "Ventaja Táctica — Canal de Alta Resonancia: +10% de alcance efectivo de los poderes " +
            "(mínimo 2 metros, redondeando a la baja).",
        ],
        // S9: se mantiene la ventaja de nivel 1 (no se repite ni se anula); el
        // +10% de alcance no tiene número fijo que mecanizar.
        modificadores: [
          // Los poderes psiónicos están PENDIENTE en sistema.md: no hay tirada
          // de resistir retroceso psiónico todavía. El id queda como marcador
          // para cuando exista — no se aplica a nada mientras tanto.
          { tipo: "tirada", alcance: { tipo: "tiradaId", id: "resistir_retroceso_psionico" }, valor: 1 },
        ],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "conversion_psionica" }, mecanismo: "accion_equipo", estado: "bloqueado", bloqueoPor: "Acciones sin dado" }, // cambia la eficiencia (3 cargas), la acción ya se declaró en nivel 1
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "resistir_retroceso_psionico" }, mecanismo: "siempre_activo", estado: "bloqueado", bloqueoPor: "Fase 5" }, // Estabilizador Neuronal, heredado (S9)
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "pregunta 33" }, // Canal de Alta Resonancia, +10% sin número fijo que mecanizar
        ],
      },
      {
        nivel: 3,
        rareza: "Muy Extraño",
        coste: 144000,
        detalle: [
          "Conversión Psiónica: 2 cargas por 1 punto de fatiga.",
          "Ventaja Táctica — Blindaje Psico-Reactivo: +1 para resistir efectos de poderes de " +
            "metasensoria contra el usuario.",
        ],
        modificadores: [
          // Los poderes psiónicos están PENDIENTE en sistema.md: no hay tirada
          // de resistir retroceso psiónico todavía. El id queda como marcador
          // para cuando exista — no se aplica a nada mientras tanto.
          { tipo: "tirada", alcance: { tipo: "tiradaId", id: "resistir_retroceso_psionico" }, valor: 1 },
          { tipo: "tirada", alcance: { tipo: "tiradaId", id: "resistir_metasensoria" }, valor: 1 },
        ],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "conversion_psionica" }, mecanismo: "accion_equipo", estado: "bloqueado", bloqueoPor: "Acciones sin dado" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "resistir_retroceso_psionico" }, mecanismo: "siempre_activo", estado: "bloqueado", bloqueoPor: "Fase 5" },
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "pregunta 33" }, // Canal de Alta Resonancia, heredado
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "resistir_metasensoria" }, mecanismo: "siempre_activo", estado: "bloqueado", bloqueoPor: "Fase 5" }, // Blindaje Psico-Reactivo
        ],
      },
      {
        nivel: 4,
        rareza: "Singular",
        coste: 216000,
        detalle: [
          "Conversión Psiónica: 1 carga por 1 punto de fatiga (máxima eficiencia).",
          "Ventaja Táctica — Simbiosis Sináptica Total: reduce en 1 los penalizadores por fatiga " +
            "al hacer una tirada relacionada con el empleo de un poder psiónico.",
        ],
        modificadores: [
          // Los poderes psiónicos están PENDIENTE en sistema.md: no hay tirada
          // de resistir retroceso psiónico todavía. El id queda como marcador
          // para cuando exista — no se aplica a nada mientras tanto.
          { tipo: "tirada", alcance: { tipo: "tiradaId", id: "resistir_retroceso_psionico" }, valor: 1 },
          { tipo: "tirada", alcance: { tipo: "tiradaId", id: "resistir_metasensoria" }, valor: 1 },
          { tipo: "tirada", alcance: { tipo: "tiradaId", id: "poder_psionico" }, valor: 1 },
        ],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "conversion_psionica" }, mecanismo: "accion_equipo", estado: "bloqueado", bloqueoPor: "Acciones sin dado" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "resistir_retroceso_psionico" }, mecanismo: "siempre_activo", estado: "bloqueado", bloqueoPor: "Fase 5" },
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "pregunta 33" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "resistir_metasensoria" }, mecanismo: "siempre_activo", estado: "bloqueado", bloqueoPor: "Fase 5" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "poder_psionico" }, mecanismo: "siempre_activo", estado: "bloqueado", bloqueoPor: "Fase 5" }, // Simbiosis Sináptica Total
        ],
      },
    ],
  },
  {
    familia: "subsistema",
    id: "escudo_deflector",
    label: "Escudo Deflector",
    resumen: "Campo de contención magnética que absorbe golpes físicos y de energía.",
    descripcion:
      "Generador de campos de contención magnética de alta densidad diseñado para interceptar " +
      "tanto los golpes físicos como los de energía, disipando la carga cinética y energética " +
      "mediante la manipulación del campo electromagnético circundante. Invisible hasta que recibe " +
      "un impacto, momento en el que genera un destello de interferencia. A diferencia de otros " +
      "subsistemas, tiene batería autorrecargable con el movimiento del usuario y, con las últimas " +
      "mejoras, también con los impactos. Puede desactivarse si se desea; es igual de susceptible " +
      "a sabotaje y sobrecarga que el resto.",
    ranurasQueConsume: 1,
    accionActivacion: "Activo mientras esté encendido; no consume cargas por turno.",
    modos: [],
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 5000,
        detalle: ["Absorción de 1 punto de daño físico o energético mientras esté activo."],
        // "Absorción de daño" no tiene un concepto equivalente en el motor hoy
        // (ni derivado ni tirada): no se mecaniza, ver cabecera del fichero.
        modificadores: [],
        motor: [
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "H5" },
        ],
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 30000,
        detalle: ["Absorción de 2 puntos."],
        modificadores: [],
        motor: [
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "H5" },
        ],
      },
      {
        nivel: 3,
        rareza: "Poco Habitual",
        coste: 60000,
        detalle: ["Absorción de 3 puntos."],
        modificadores: [],
        motor: [
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "H5" },
        ],
      },
      {
        nivel: 4,
        rareza: "Extraño",
        coste: 90000,
        detalle: ["Absorción de 4 puntos."],
        modificadores: [],
        motor: [
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "H5" },
        ],
      },
    ],
  },
  {
    familia: "subsistema",
    id: "malla_plasmatica",
    label: "Malla Plasmática",
    resumen: "Un colchón de plasma ionizado que absorbe daño y puede usarse para atacar.",
    descripcion:
      "Sistema de protección activo que genera un campo electromagnético pulsante y un escudo de " +
      "contención de gas ionizado que flota a milímetros de la armadura. Más bruto y volátil que el " +
      "escudo deflector, por eso es más raro. Actúa como colchón balístico y térmico de reacción " +
      "ultrarrápida, capaz de vaporizar pequeños proyectiles y disipar energía hasta agotar la " +
      "matriz. Por su naturaleza volátil, cualquier atacante melee que golpee al usuario sufre una " +
      "descarga reactiva, y la potencia puede canalizarse ofensivamente en golpes melee o colapsarse " +
      "en una detonación de pulso térmico en área.",
    ranurasQueConsume: 1,
    accionActivacion:
      "Reacción ante un ataque entrante o acción gratuita en el propio turno; cada activación " +
      "consume 1 carga y da 10 turnos de campo continuo.",
    celula: { cargas: 10, recarga: "1 hora con conector (1 carga cada 6 minutos)", bateriaCoste: 150 },
    modos: [],
    niveles: [
      {
        nivel: 1,
        rareza: "Poco Habitual",
        coste: 6000,
        detalle: [
          "Colchón de 10 puntos de golpe mientras esté activa, absorbe daño cinético y energético.",
          "Si recibe daño sin destruirse, regenera 1 punto por turno; destruida, tarda 4 turnos en " +
            "reactivarse.",
          "Sacrificando 2 puntos del colchón (acción gratuita, se declara antes de atacar), suma 1 " +
            "nivel de daño de plasma a un golpe melee desarmado; en crítico puede causar shock, " +
            "llamarada o fusión (dificultad 6 + nivel).",
          "Si el usuario recibe un golpe melee, devuelve daño de plasma igual al nivel del " +
            "subsistema.",
          "Al activarse: -8 al sigilo (percepción visual) y neutraliza por completo el camuflaje " +
            "trifásico activo.",
        ],
        // Todo aquí es condicional (se activa, se sacrifica, depende del ataque
        // recibido) o un recurso propio (colchón de PG) sin equivalente en el
        // motor: no se mecaniza.
        modificadores: [],
        motor: [
          // Colchón de PG: buffer temporal ligado a "estar activo", con su
          // propia mini-máquina de estados (destruido → tiempo de
          // reactivación). No es RECURSOS de instancia (no tiene actual/max
          // recargable por compra) ni un derivado de personaje (PG/fatiga) —
          // caso límite sin nombre todavía en capa 2 y media, ver informe final.
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "buffer temporal sin nombre en capa 2 y media" },
          // Sacrificar PG del colchón → +N daño de plasma en golpe melee: acción
          // del jugador declarada antes de atacar, más cercano a eleccion_jugador
          // que a nada más, aunque hoy no hay CondicionTirada real.
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "pendiente" },
          // Crítico melee con plasma (shock/llamarada/fusión condicional): mismo
          // patrón que Visor Nocturno (toggle con nota), "ya propuesto, sin
          // construir" según el barrido de motor — no es duda, es pendiente.
          { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "pendiente" },
          // Devuelve daño de plasma al atacante: tirada/daño de un TERCERO (quien
          // golpea al portador), mismo problema estructural que Compartimento
          // Oculto/Cobertura del Camuflaje.
          { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "bloqueado", bloqueoPor: "objetivo_tercero sin tirada de portador donde colgar la nota" },
          // -8 al sigilo al activarse: numérico condicionado a "está activa", sin
          // CondicionTirada construida todavía.
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "sigilo" }, mecanismo: "eleccion_jugador", estado: "pendiente" },
          // Neutraliza el Camuflaje Trifásico activo: una pieza deshabilita el
          // efecto de OTRA pieza — no hay precedente de esto en el motor hoy
          // (gate_instalacion es el mecanismo más cercano, pero siempre se ha
          // usado pieza-sobre-sí-misma, nunca pieza-sobre-otra-pieza). Caso
          // inconcluso, ver informe final.
          { tipo: "habilitador", afecta: { modo: "accion_existente", id: "camuflaje_trifasico" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "pendiente" },
        ],
      },
      {
        nivel: 2,
        rareza: "Extraño",
        coste: 36000,
        detalle: [
          "Colchón de 12 puntos, regenera 2 por turno.",
          "Puede liberar el colchón en una detonación de pulso térmico en área 6x6 (esquiva 5 + " +
            "nivel): daño de plasma igual al colchón sacrificado, causa shock y llamarada " +
            "(dificultad 6 + nivel); con fallo crítico en la esquiva, también fusión.",
        ],
        modificadores: [],
        motor: [
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "buffer temporal sin nombre en capa 2 y media" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "pendiente" },
          { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "pendiente" },
          { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "bloqueado", bloqueoPor: "objetivo_tercero sin tirada de portador donde colgar la nota" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "sigilo" }, mecanismo: "eleccion_jugador", estado: "pendiente" },
          { tipo: "habilitador", afecta: { modo: "accion_existente", id: "camuflaje_trifasico" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "pendiente" },
          // Detonación de pulso térmico en área: necesita una tirada de ataque
          // propia que no existe — amplía el Hallazgo #1 (igual que el
          // Proyector de Pulso), no se re-abre la duda, solo se cita.
          { tipo: "accion", afecta: { modo: "accion_nueva", id: "detonacion_pulso_termico" }, mecanismo: "accion_equipo", estado: "bloqueado", bloqueoPor: "H1" },
        ],
      },
      {
        nivel: 3,
        rareza: "Extraño",
        coste: 72000,
        detalle: [
          "Colchón de 14 puntos, regenera 3 por turno; destruida, tarda 3 turnos en reactivarse.",
          "Los golpes melee con plasma liberado causan shock y llamarada (dificultad 5 + nivel) y, " +
            "en crítico, fusión (dificultad 7 + nivel).",
          "Pueden gastarse 4 puntos del colchón para sumar 2 al daño adicional de plasma.",
        ],
        modificadores: [],
        // Mismos 7 efectos que nivel 2 (solo cambian números: colchón,
        // dificultades de crítico, coste del sacrificio) — nada nuevo que
        // clasificar en este nivel.
        motor: [
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "buffer temporal sin nombre en capa 2 y media" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "pendiente" },
          { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "pendiente" },
          { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "bloqueado", bloqueoPor: "objetivo_tercero sin tirada de portador donde colgar la nota" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "sigilo" }, mecanismo: "eleccion_jugador", estado: "pendiente" },
          { tipo: "habilitador", afecta: { modo: "accion_existente", id: "camuflaje_trifasico" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "pendiente" },
          { tipo: "accion", afecta: { modo: "accion_existente", id: "detonacion_pulso_termico" }, mecanismo: "accion_equipo", estado: "bloqueado", bloqueoPor: "H1" },
        ],
      },
      {
        nivel: 4,
        rareza: "Muy Extraño",
        coste: 108000,
        detalle: [
          "Colchón de 16 puntos, regenera 4 por turno.",
          "Al devolver daño contra ataques melee, también causa shock y llamarada (dificultad 8).",
          "La detonación de pulso térmico puede ampliarse a área 10x10.",
        ],
        modificadores: [],
        motor: [
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "buffer temporal sin nombre en capa 2 y media" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "pendiente" },
          { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "eleccion_jugador", estado: "pendiente" },
          { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "bloqueado", bloqueoPor: "objetivo_tercero sin tirada de portador donde colgar la nota" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "sigilo" }, mecanismo: "eleccion_jugador", estado: "pendiente" },
          { tipo: "habilitador", afecta: { modo: "accion_existente", id: "camuflaje_trifasico" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "pendiente" },
          { tipo: "accion", afecta: { modo: "accion_existente", id: "detonacion_pulso_termico" }, mecanismo: "accion_equipo", estado: "bloqueado", bloqueoPor: "H1" },
        ],
      },
    ],
  },
  {
    familia: "subsistema",
    id: "proyector_pulso",
    label: "Proyector de Pulso",
    resumen: "Arma integrada en el brazalete: dispara sin desenfundar, con cuatro modos de ataque.",
    descripcion:
      "Sistema ofensivo modular de alta densidad energética integrado en el chasis de la armadura, " +
      "normalmente en el brazalete o el guante. Al no requerir munición cinética convencional, " +
      "canaliza energía almacenada para proyectar haces de partículas ionizadas o pulsos de plasma " +
      "confinado. Permite disparar sin desenfundar, aunque exige la mano correspondiente libre para " +
      "alinear el emisor. Completamente configurable: puede operarse con Tecnociencia en lugar de " +
      "Combate a Distancia (en ambos casos con el aplicado de Reflejos). El daño se clasifica como " +
      "grave.",
    ranurasQueConsume: 1,
    accionActivacion: "Cada ataque consume las cargas del modo elegido; se dispara como cualquier arma.",
    celula: { cargas: 10, recarga: "1 hora con conector (1 carga cada 6 minutos)", bateriaCoste: 150 },
    // La tabla "Modo de Ataque" del documento no es de uso (activo/pasivo),
    // es de disparo: cuatro perfiles distintos, cada uno con su propio coste,
    // dificultad, daño y alcance (escalan con el Nivel instalado).
    modos: [
      {
        label: "Pulso",
        descripcion:
          "Acción simple, 1 carga, dificultad -2, daño 8 + Nivel, alcance 40 × Nivel metros. " +
          "Efecto: Shock (4 + Nivel); crítico: Hemorragia.",
      },
      {
        label: "Pulso Cargado",
        descripcion:
          "Acción compleja, 4 cargas, dificultad -2, daño 11 + Nivel, alcance 60 × Nivel metros. " +
          "Efecto: Shock (6 + Nivel); crítico: Hemorragia.",
      },
      {
        label: "Barrido",
        descripcion:
          "Acción estándar, 5 cargas, dificultad -3, daño de área 10 + Nivel en 6x6 a 40 × Nivel " +
          "metros. Efecto: Esquiva (7 + Nivel) y Shock (7 + Nivel).",
      },
      {
        label: "Aguijón",
        descripcion:
          "Acción simple, 1 carga, dificultad 0, daño 2 + Fuerza + Nivel, alcance melee, Sutil. " +
          "Duración del efecto: Nivel turnos. Efecto: Shock (4 + Nivel); crítico: Hemorragia.",
      },
    ],
    niveles: [
      {
        nivel: 1,
        rareza: "Poco Habitual",
        coste: 6000,
        detalle: [
          "Configuración base del emisor.",
          "La ionización del aire al disparar impone -5 al sigilo (percepción visual) con " +
            "cualquier modo de ataque.",
        ],
        modificadores: [],
        motor: [
          // Hallazgo #1, construido 2026-09-23: tiradaDeProyectorPulso()
          // (combate.ts), registrado en REGISTRO_DE_ATAQUE bajo "subsistema".
          // Aguijón (melee-dentro-de-arma-a-distancia) y "elige habilidad" ya
          // no son ambigüedad: la propia descripción del subsistema dice que
          // el aplicado es Reflejos "en ambos casos" (Combate a Distancia o
          // Tecnociencia), así que se generan dos Acciones gemelas, una por
          // habilidad — sin inventar un mecanismo de "elige atributo/habilidad
          // dentro de la misma tirada" que no existe.
          { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_proyector_pulso" }, mecanismo: "accion_equipo", estado: "construido" },
          // "-5 al sigilo al disparar": mismo caso que la pregunta 25b
          // (armasFuego.ts) — decisión de producto (2026-09-23) de no
          // avisarlo en la UI. Se queda en `detalle`, sin más.
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
        ],
      },
      {
        nivel: 2,
        rareza: "Extraño",
        coste: 36000,
        detalle: [
          "Modo adicional — Emisor de Flux Radiactivo: cambia el crítico convencional por " +
            "Envenenamiento por Radiación (dificultad 8 + nivel).",
        ],
        modificadores: [],
        motor: [
          // Texto informativo en la nota de la tirada (mismo criterio "app
          // informa, no arbitra" que el resto del catálogo) — el jugador
          // elige entre los críticos desbloqueados en el momento de tirar,
          // sin mecanismo estructurado (el mecanismo genérico de impacto/
          // crítico sigue sin construir, ver equipo-efectos-especiales.md).
          { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_proyector_pulso" }, mecanismo: "nota_fija", estado: "ad_hoc" },
        ],
      },
      {
        nivel: 3,
        rareza: "Extraño",
        coste: 72000,
        detalle: [
          "Modo adicional — Emisor de Fotones Coherentes: el daño pasa a Fuego y causa Llamarada " +
            "(misma salvación que el shock); el crítico pasa a Ceguera (dificultad 8 + nivel).",
        ],
        modificadores: [],
        motor: [
          { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_proyector_pulso" }, mecanismo: "nota_fija", estado: "ad_hoc" },
        ],
      },
      {
        nivel: 4,
        rareza: "Muy Extraño",
        coste: 108000,
        detalle: [
          "Modo adicional — Módulo de Disrupción de Campo: el efecto de shock sube 1 de " +
            "dificultad. En crítico destruye 1 punto de blindaje del objetivo (sin blindaje, " +
            "Hemorragia normal).",
        ],
        modificadores: [],
        motor: [
          { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_proyector_pulso" }, mecanismo: "nota_fija", estado: "ad_hoc" },
        ],
      },
    ],
  },
];
