import type { CondicionTirada } from "../rules/condiciones";
import type { NivelModulo } from "./equipo";
import { NO_APILA_COBERTURA, NOTA_COBERTURA } from "./cobertura";

export type MejoraEstandar = {
  familia: "mejoraEstandar";
  id: string;
  label: string;
  resumen: string;
  descripcion: string;
  niveles: NivelModulo[];
};

// Visor Nocturno 2: "reduce en 2 los niveles de cobertura visual descritos dentro de un alcance
// de 50 metros". Mismo par de casillas que el Ojo Biónico (catalog/aumentos.ts): ataques a
// distancia y Buscar/percibir, en el mismo grupo de no apilamiento (vale la mayor).
function casillasCoberturaVisor(): CondicionTirada[] {
  const comun = {
    tipo: "toggle",
    etiqueta: "Objetivo con cobertura visual a 50 m o menos (Visor Nocturno)",
    valorActivo: 2,
    noApila: NO_APILA_COBERTURA,
    nota: NOTA_COBERTURA,
  } as const;
  return [
    { ...comun, id: "visor_nocturno_cobertura_distancia", alcance: { tipo: "grupoHabilidad", grupo: "Ataques", habilidad: "combate_distancia" } },
    { ...comun, id: "visor_nocturno_cobertura_alerta", alcance: { tipo: "tiradaId", id: "alerta_activa" } },
  ];
}

// Soporte Vital, Blindaje Ambiental (S94, docs/fuente/equipamiento.md): "protege de la radiación
// externa y de intoxicaciones por inhalación o contacto en su totalidad. Sin embargo, si la
// armadura resulta dañada o el usuario sufre un ataque/evento que le genere daño directo en un
// ambiente tóxico, esta defensa total se degrada" al bono del nivel.
function notaBlindajeAmbiental(bono: number): string {
  return (
    "protección total contra radiación e intoxicación por inhalación o contacto: sin tirada. " +
    `El +${bono} solo si la armadura está dañada o sufres un ataque o evento que te haga daño directo ` +
    "en el ambiente tóxico"
  );
}

export const MEJORAS_ESTANDAR: MejoraEstandar[] = [
  {
    familia: "mejoraEstandar",
    id: "soporte_vital",
    label: "Soporte Vital",
    resumen: "El estándar industrial de habitabilidad: aísla del exterior. No gasta ranura.",
    descripcion:
      "Una red de micro-conductos de purificación, intercambiadores de calor de fase y membranas " +
      "de filtración osmótica tejida en las capas internas del traje. Aísla por completo al " +
      "usuario del exterior, reciclando el aire, neutralizando agentes químicos y disipando la " +
      "radiación ambiental. No es un módulo táctico opcional: se integra en la arquitectura " +
      "hermética de cualquier armadura de serie, sin consumir ranuras de personalización.",
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 4000,
        detalle: [
          "Duración: 24 horas continuas antes de agotarse (recarga con conector, ~30-60 min).",
          "Blindaje Ambiental: protección total contra radiación e intoxicación por inhalación o " +
            "contacto. Si la armadura resulta dañada o el usuario sufre un ataque o evento que le " +
            "haga daño directo en un ambiente tóxico, se degrada a +1 a la salvación.",
          "Resistencia Térmica: +1 contra congelación y calor extremo, acumulable con el bonificador " +
            "de la propia armadura.",
          "Vulnerabilidad al Shock: si hay un apagón, todos los bonificadores bajan a +1, salvo la " +
            "resistencia térmica, que se pierde por completo.",
        ],
        // Resistencia Térmica: un único +1 contra congelación y contra frío o calor extremos,
        // solo contra esas amenazas (selector «Contra…» de Fortaleza, 2026-10-24); se suma al de
        // la armadura. Blindaje Ambiental (S94): sin tirada mientras la protección es total; el
        // +1 (+2, +3 en los niveles 2 y 3, que lo sustituyen) va en el mismo selector, contra
        // toxinas y radiación, con la nota de cuándo vale. El apagón sigue en la pregunta 32.
        modificadores: [],
        salvaciones: [
          { contra: ["congelacion", "termicos"], bono: 1 },
          { contra: ["toxinas", "radiacion"], bono: 1, nota: notaBlindajeAmbiental(1) },
        ],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "eleccion_jugador", estado: "construido" }, // Resistencia Térmica
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "eleccion_jugador", estado: "construido" }, // Blindaje Ambiental: +1 en «Contra…» (toxinas, radiación), con la protección total como nota
          { tipo: "habilitador", afecta: { modo: "ninguna" }, mecanismo: null, arbitraje: "pendiente", estado: "bloqueado", bloqueoPor: "pregunta 32" }, // Vulnerabilidad al Shock (apagón): degrada/deshabilita los bonos de arriba, exacto comportamiento sin definir
        ],
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 12000,
        detalle: [
          "Duración: 72 horas de autonomía.",
          "Blindaje Ambiental Mejorado: +2 frente a efectos tóxicos cuando el traje o el usuario " +
            "reciben daño en ese entorno.",
        ],
        // Resistencia Térmica de nivel 1 (S9: se acumula, no se repite ni se
        // pierde). Antes de 2026-09-25 el código no acumulaba niveles, así que
        // aquí se copiaba el +1 a mano — ya no hace falta: acumulaPorClave()
        // (equipo.ts) lo trae solo desde nivel 1, y repetirlo aquí lo
        // duplicaría (nivel1 +1 + nivel2 +1 = +2 real, el bug que S9 quería
        // evitar). Solo lo que este nivel añade DE NUEVO va en su propio array.
        modificadores: [],
        salvaciones: [{ contra: ["toxinas", "radiacion"], bono: 2, nota: notaBlindajeAmbiental(2) }],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "eleccion_jugador", estado: "construido" }, // Blindaje Ambiental Mejorado
          { tipo: "habilitador", afecta: { modo: "ninguna" }, mecanismo: null, arbitraje: "pendiente", estado: "bloqueado", bloqueoPor: "pregunta 32" }, // Vulnerabilidad al Shock, heredada
        ],
      },
      {
        nivel: 3,
        rareza: "Extraño",
        coste: 24000,
        detalle: [
          "Duración: 144 horas de autonomía.",
          "Blindaje Ambiental Avanzado: +3 contra efectos tóxicos en las mismas condiciones.",
        ],
        // Mismo criterio que nivel 2: Resistencia Térmica ya llega acumulada
        // desde nivel 1, no se repite aquí.
        modificadores: [],
        salvaciones: [{ contra: ["toxinas", "radiacion"], bono: 3, nota: notaBlindajeAmbiental(3) }],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "eleccion_jugador", estado: "construido" }, // Blindaje Ambiental Avanzado
          { tipo: "habilitador", afecta: { modo: "ninguna" }, mecanismo: null, arbitraje: "pendiente", estado: "bloqueado", bloqueoPor: "pregunta 32" }, // Vulnerabilidad al Shock, heredada
        ],
      },
    ],
  },
  {
    familia: "mejoraEstandar",
    id: "compartimento_oculto",
    label: "Compartimento Oculto",
    resumen: "Un doble fondo sellado en la armadura para esconder algo pequeño.",
    descripcion:
      "Hueco de doble fondo con sellado hermético, revestimiento antirradiación y absorción de " +
      "emisiones electromagnéticas integrado en la arquitectura interna de la armadura.",
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 500,
        detalle: [
          "Oculta un objeto pequeño (una tarjeta de datos, una pistola ligera, un vial).",
          "Aumenta en 3 la dificultad para descubrirlo en cacheos físicos rutinarios o escáneres " +
            "de seguridad.",
        ],
        // La dificultad que sube es la de QUIEN TE REGISTRA, no una tirada propia:
        // no encaja en "tirada" (que hoy solo modela tiradas del portador).
        modificadores: [],
        motor: [
          // objetivo_tercero: sube la dificultad de un tercero (quien registra al
          // portador), nunca la del propio portador. mecanismo "nota_fija" es la
          // resolución ya aceptada (modificadores-tiradas.md: "se informa en la
          // tirada del propio portador, para que el máster lo aplique al de
          // enfrente") — pero AQUÍ no hay ninguna tirada del portador en la que
          // colgar esa nota (a diferencia de Visor Nocturno, que la cuelga de
          // Buscar/percibir): bloqueado hasta que se diseñe dónde vive.
          { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "deteccion_fisica" }, mecanismo: "nota_fija", estado: "bloqueado", bloqueoPor: "objetivo_tercero sin tirada de portador donde colgar la nota" },
        ],
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 4000,
        detalle: [
          "Admite objetos de tamaño medio: un arma corta estándar o herramientas de precisión.",
          "Sube la dificultad en 4 contra escáneres avanzados; indetectable en inspecciones " +
            "visuales o físicas superficiales.",
        ],
        modificadores: [],
        motor: [
          // Igual que nivel 1, pero el barrido de motor (2026-09-22) apunta que
          // esto "apunta parcialmente a una tirada real (Escáner Detector)" — no
          // suficientemente claro para comprometerme a un id concreto, lo marco
          // como caso inconcluso en vez de adivinar cuál.
          { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "deteccion_fisica_o_escaner" }, mecanismo: "nota_fija", estado: "bloqueado", bloqueoPor: "objetivo_tercero sin tirada de portador donde colgar la nota" },
        ],
      },
    ],
  },
  {
    familia: "mejoraEstandar",
    id: "funda_automatica",
    label: "Funda Automática",
    resumen: "Desenfunda el arma como acción gratuita en vez de gastar tu turno en ello.",
    descripcion:
      "Mecanismo integrado en la armadura o traje que expulsa el arma sujeta a él con solo " +
      "activarlo, sin necesidad de la acción normal de desenfundado.",
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 1200,
        detalle: [
          "Desenfundado como acción gratuita para un arma a una mano.",
          "Solo puede usarse con un arma a la vez; el enfundado sigue costando lo de siempre.",
        ],
        modificadores: [],
        // Cambia el COSTE de una acción (desenfundar gratis en vez de gastar
        // turno), no crea una acción ni suma un número a una tirada: el motor no
        // modela economía de acciones/turnos todavía. Resuelto como texto
        // informativo, sin forzar un sexto tipo (decisión ya cerrada).
        motor: [
          { tipo: "texto", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
        ],
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 3600,
        detalle: ["El desenfundado gratuito también funciona con armas a dos manos."],
        modificadores: [],
        motor: [
          { tipo: "texto", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
        ],
      },
    ],
  },
  {
    familia: "mejoraEstandar",
    id: "inyector_hipodermico",
    label: "Inyector Hipodérmico",
    resumen: "Te inyectas medicación como acción simple en vez de compleja.",
    descripcion:
      "Sistema de liberación por válvulas y muelles puramente mecánico integrado en el traje; no " +
      "es susceptible a shock ni a pirateo.",
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 250,
        detalle: ["Usar medicamentos o drogas sobre uno mismo pasa de acción compleja a simple."],
        modificadores: [],
        motor: [
          { tipo: "texto", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" }, // coste de acción, mismo caso que Funda Automática
        ],
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 1500,
        detalle: [
          "Tambor rotatorio con hasta 5 dosis distintas almacenadas.",
          "Inocula una dosis por turno como acción gratuita o reacción.",
          "Al llevar electrónica de selección, este nivel sí es susceptible a shock (a diferencia " +
            "del nivel 1).",
        ],
        modificadores: [],
        motor: [
          { tipo: "texto", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" }, // coste de acción
          { tipo: "habilitador", afecta: { modo: "ninguna" }, mecanismo: null, arbitraje: "pendiente", estado: "bloqueado", bloqueoPor: "pregunta 32" }, // susceptible a shock
        ],
      },
    ],
  },
  {
    familia: "mejoraEstandar",
    id: "mejora_ignifuga",
    label: "Mejora Ignífuga",
    resumen: "Fibras cerámicas y polímeros que absorben el calor: protección extra contra el fuego.",
    descripcion:
      "Red de micro-fibras cerámicas ablativas y polímeros endotérmicos entretejidos en la " +
      "estructura de la armadura, que absorben y disipan de forma extrema la energía térmica " +
      "directa.",
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 1000,
        detalle: ["El usuario puede usar la puntuación total de blindaje de su armadura contra daño de fuego."],
        modificadores: [],
        // Distinto del +1 de Tejido Conductor nv2 (suma_derivado, ya construido):
        // esto HABILITA que el blindaje de la armadura cuente contra Fuego (que por
        // defecto es 0, supuesto S19) en vez de sumar un extra — solo el de la
        // armadura que la lleva (S85, armaduraConIgnifuga en lib/rules/blindaje.ts).
        motor: [
          { tipo: "habilitador", afecta: { modo: "accion_existente", id: "bloquear_danio" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
        ],
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 5000,
        detalle: [
          "El daño por fuego se considera letal en vez de grave.",
          "Mejora el bonificador del traje o la armadura contra llamarada a +2.",
        ],
        // El +2 es el total del bono de LA ARMADURA contra llamarada, no uno aparte:
        // `subeLaDeLaArmadura` pone la diferencia (salvacionesDeEquipo, rules/equipo.ts).
        modificadores: [],
        salvaciones: [{ contra: ["llamarada"], bono: 2, subeLaDeLaArmadura: true }],
        recibeComoLetal: "fuego",
        motor: [
          // "Daño de fuego letal en vez de grave": la categoría del golpe recibido
          // (categoriaDelGolpe, lib/rules/blindaje.ts), que "Bloquear daño" enseña.
          { tipo: "texto", afecta: { modo: "accion_existente", id: "bloquear_danio" }, mecanismo: "nota_fija", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_reflejos" }, mecanismo: "eleccion_jugador", estado: "construido" },
        ],
      },
    ],
  },
  {
    familia: "mejoraEstandar",
    id: "polimero_anticorrosivo",
    label: "Polímero Anticorrosivo",
    resumen: "Revestimiento que repele ácidos y agentes químicos antes de que lleguen al chasis.",
    descripcion:
      "Revestimiento exterior de resinas fluoropoliméricas de alta densidad diseñado para " +
      "neutralizar y repeler agentes químicos y ácidos reactivos antes de que comprometan el " +
      "chasis.",
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 1000,
        detalle: ["+1 contra corrosión.", "Esta mejora no es susceptible a shock."],
        modificadores: [],
        salvaciones: [{ contra: ["corrosion"], bono: 1 }],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "eleccion_jugador", estado: "construido" },
        ],
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 5000,
        detalle: [
          "El daño corrosivo se considera letal en vez de grave.",
          "El bonificador contra corrosión sube a +2.",
        ],
        modificadores: [],
        // Sustituye al +1 del nivel 1 (mismas amenazas).
        salvaciones: [{ contra: ["corrosion"], bono: 2 }],
        recibeComoLetal: "corrosivo",
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "eleccion_jugador", estado: "construido" },
          // Corrosivo letal en vez de grave: mismo caso que Mejora Ignífuga nivel 2.
          { tipo: "texto", afecta: { modo: "accion_existente", id: "bloquear_danio" }, mecanismo: "nota_fija", estado: "construido" },
        ],
      },
    ],
  },
  {
    familia: "mejoraEstandar",
    id: "refuerzo_combate",
    label: "Refuerzo de Combate",
    resumen: "Refuerzos en la armadura que hacen letal el golpe desarmado.",
    descripcion:
      "Refuerzos integrados en la armadura que aumentan el daño de los golpes desarmados dados " +
      "con ella y lo convierten en letal.",
    // docs/fuente/equipamiento.md, "Refuerzo de Combate (Nivel 1-2)" (2026-10-24). Las dos
    // preguntas de docs/motor.md, por efecto:
    //   - +N al daño del golpe desarmado (Pelea) con la armadura: numérico, ataque_melee,
    //     sumado al daño de la fila (rules/golpeDesarmado.ts). Nivel 2 "en 2 más": total del
    //     nivel, no se suma al del 1 (como el resto del catálogo, S9).
    //   - el daño pasa a letal: numérico (categoría del daño), ataque_melee, mismo sitio.
    //   - crítico con aturdimiento de dificultad 7 (8 en el nivel 2): texto, el crítico de la fila.
    //   - bloquear desarmado sin el −3 ("si el ataque desarmado de quien bloquea causa daño
    //     letal no se considera desarmado", Bloqueo, docs/fuente/dotes.md): numérico,
    //     bloquear_melee, la casilla del −3 deja de salir.
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 500,
        detalle: [
          "Los golpes desarmados con la armadura hacen 1 más de daño, y el daño pasa a letal.",
          "En golpe crítico, el aturdimiento tiene dificultad 7.",
        ],
        modificadores: [],
        refuerzoDesarmado: { bonoDanio: 1, letal: true, aturdimiento: 7 },
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "suma_derivado", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "suma_derivado", estado: "construido" },
          { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "bloquear_melee" }, mecanismo: "eleccion_jugador", estado: "construido" },
        ],
      },
      {
        nivel: 2,
        rareza: "Común",
        coste: 3000,
        detalle: [
          "Los golpes desarmados con la armadura hacen 2 más de daño (en total, no se suma al nivel 1).",
          "En golpe crítico, el aturdimiento tiene dificultad 8.",
        ],
        modificadores: [],
        refuerzoDesarmado: { bonoDanio: 2, letal: true, aturdimiento: 8 },
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "suma_derivado", estado: "construido" },
          { tipo: "texto", afecta: { modo: "accion_existente", id: "ataque_melee" }, mecanismo: "nota_fija", estado: "construido" },
        ],
      },
    ],
  },
  {
    familia: "mejoraEstandar",
    id: "tejido_conductor",
    label: "Tejido Conductor",
    resumen: "Malla de hilos superconductores que desvía las sobrecargas eléctricas.",
    descripcion:
      "Malla interior de hilos superconductores integrada en el forro del traje para desviar y " +
      "disipar de forma segura cualquier sobrecarga eléctrica externa.",
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 1000,
        detalle: ["+1 contra shock.", "Esta mejora no es susceptible a su propio efecto."],
        modificadores: [],
        salvaciones: [{ contra: ["shock"], bono: 1 }],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "eleccion_jugador", estado: "construido" },
        ],
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 5000,
        detalle: [
          "Ignora el primer nivel de daño eléctrico.",
          "El bonificador contra shock sube a +2.",
        ],
        modificadores: [],
        // Sustituye al +1 del nivel 1 (mismas amenazas).
        salvaciones: [{ contra: ["shock"], bono: 2 }],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "eleccion_jugador", estado: "construido" },
          // H5 (docs/sistema.md pregunta 29) construido 2026-09-27: +1 de blindaje
          // específico contra Eléctrico, vía bonoTejidoConductor() (lib/rules/blindaje.ts).
          {
            tipo: "numerico",
            afecta: { modo: "accion_existente", id: "bloquear_danio" },
            mecanismo: "suma_derivado",
            estado: "construido",
          },
        ],
      },
    ],
  },
  {
    familia: "mejoraEstandar",
    id: "visor_nocturno",
    label: "Visor Nocturno",
    resumen: "Intensifica la poca luz disponible para ver en penumbra y oscuridad parcial.",
    descripcion:
      "Capta los pocos fotones de luz visible del ambiente y los multiplica miles de veces " +
      "mediante un tubo de intensificación de imagen. En oscuridad total sellada, sin infrarrojos " +
      "activos, no ve absolutamente nada.",
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 100,
        detalle: [
          "Visión en penumbra y oscuridad parcial.",
          "Un fogonazo o explosión puede cegar al usuario (dificultad de Fortaleza 8) al saturar " +
            "el sensor.",
        ],
        // El fogonazo sigue sin mecanizar a propósito: vulnerabilidad
        // narrativa que arbitra el máster, sin dato que tocar.
        modificadores: [],
        // Homogeneizado 2026-09-25 con Visor Térmico n1/Mira Telescópica n2
        // (mismo resultado de juego: capacidad sensorial sin matiz numérico,
        // recordatorio en Buscar/percibir) — antes era `narrativo/construido`
        // sin toggle ni nota, la única de las tres con esa forma distinta.
        condiciones: [
          {
            id: "visor_nocturno_n1_activo",
            tipo: "toggle",
            etiqueta: "Visor Nocturno activo",
            alcance: { tipo: "tiradaId", id: "alerta_activa" },
            valorActivo: 0,
            valorInactivo: 0,
            nota: "Ves en penumbra y oscuridad parcial.",
          },
        ],
        motor: [
          { tipo: "texto", afecta: { modo: "accion_existente", id: "alerta_activa" }, mecanismo: "eleccion_jugador", estado: "construido" },
        ],
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 1500,
        detalle: [
          "Ve a través de humo denso, niebla o partículas en suspensión.",
          "Reduce en 2 los niveles de cobertura visual dentro de 50 metros.",
          "+3 a la tirada contra ceguera provocada por destellos, al cortar el sensor antes de " +
            "saturarse.",
        ],
        // +3 contra la ceguera por destellos (detonación, granada de luz): la ceguera se salva
        // con Fortaleza (decidido; amenaza «ceguera por detonación», aumentosTiradas.ts).
        modificadores: [],
        salvaciones: [{ contra: ["ceguera_detonacion"], bono: 3 }],
        // Ve a través de humo/niebla: recordatorio en Buscar/percibir (toggle sin valor).
        // "Reduce en 2 los niveles de cobertura visual dentro de 50 m": casillas con valor en
        // ataques a distancia y Buscar/percibir, como el Ojo Biónico (A3) y sin apilarse con él
        // ni con Foveo (grupo NO_APILA_COBERTURA). 2026-10-24.
        condiciones: [
          {
            id: "visor_nocturno_n2_activo",
            tipo: "toggle",
            etiqueta: "Visor Nocturno activo",
            alcance: { tipo: "tiradaId", id: "alerta_activa" },
            valorActivo: 0,
            valorInactivo: 0,
            nota: "Ves a través de humo denso, niebla o partículas.",
          },
          ...casillasCoberturaVisor(),
        ],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "eleccion_jugador", estado: "construido" },
          // Cobertura visual −2 a 50 m o menos: casilla con valor (ataques a distancia y Buscar).
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "alerta_activa" }, mecanismo: "eleccion_jugador", estado: "construido" },
          { tipo: "texto", afecta: { modo: "accion_existente", id: "alerta_activa" }, mecanismo: "eleccion_jugador", estado: "construido" }, // toggle real (condiciones), no nota_fija
        ],
      },
    ],
  },
  {
    familia: "mejoraEstandar",
    id: "visor_termico",
    label: "Visor Térmico",
    resumen: "Ve el calor en vez de la luz: caza enemigos ocultos tras humo o vegetación.",
    descripcion:
      "Mapea la radiación infrarroja de onda larga que emiten cuerpos orgánicos, motores o sistemas " +
      "electrónicos activos, traduciéndola a una escala cromática de gradiente térmico.",
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 250,
        detalle: [
          "Detecta calor corporal a través de humo, maleza u oscuridad total.",
          "-3 en tiradas de percepción visual fuera del gradiente térmico mientras se usa el modo " +
            "térmico.",
        ],
        modificadores: [],
        // Mismo caso que Visor Nocturno n2 (ver ese comentario): el -3 depende
        // de si lo mirado está fuera del gradiente resaltado, algo que el
        // motor no sabe — se informa en Buscar/percibir, no se auto-aplica.
        condiciones: [
          {
            id: "visor_termico_n1_activo",
            tipo: "toggle",
            etiqueta: "Modo térmico activo",
            alcance: { tipo: "tiradaId", id: "alerta_activa" },
            valorActivo: 0,
            valorInactivo: 0,
            nota: "Ves en un gradiente de calor. -3 a lo que esté fuera del gradiente.",
          },
        ],
        motor: [
          { tipo: "texto", afecta: { modo: "accion_existente", id: "alerta_activa" }, mecanismo: "eleccion_jugador", estado: "construido" },
        ],
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 1500,
        detalle: [
          "Persistencia espectral: resalta el rastro térmico reciente (pisadas, estela de un " +
            "proyectil, paso de un vehículo o enemigo).",
          "El rastro se apaga a los 5 turnos pero persiste 10-15 minutos (la mitad con mucho frío " +
            "o ventilación; algo más en interiores sellados sin convección).",
        ],
        modificadores: [],
        // Sin número: el motor no lleva reloj de turnos por rastro. Desde que existe Rastreo
        // (usuario, 2026-10-26), casilla informativa allí, como el modo térmico del nivel 1.
        condiciones: [
          {
            id: "visor_termico_n2_rastro",
            tipo: "toggle",
            etiqueta: "Siguiendo un rastro térmico",
            alcance: { tipo: "tiradaId", id: "rastreo" },
            valorActivo: 0,
            valorInactivo: 0,
            nota: "El rastro de calor se apaga a los 5 turnos y persiste 10-15 min; la mitad con frío extremo o mucha ventilación.",
          },
        ],
        motor: [
          { tipo: "texto", afecta: { modo: "accion_existente", id: "rastreo" }, mecanismo: "eleccion_jugador", estado: "construido" },
        ],
      },
    ],
  },
];
