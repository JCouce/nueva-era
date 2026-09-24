import type { NivelModulo } from "./equipo";

export type MejoraEstandar = {
  familia: "mejoraEstandar";
  id: string;
  label: string;
  resumen: string;
  descripcion: string;
  niveles: NivelModulo[];
};

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
            "contacto. Si la armadura sufre daño en un ambiente tóxico, se degrada a +1 a la salvación.",
          "Resistencia Térmica: +1 contra congelación y calor extremo, acumulable con el bonificador " +
            "de la propia armadura.",
          "Vulnerabilidad al Shock: si hay un apagón, todos los bonificadores bajan a +1, salvo la " +
            "resistencia térmica, que se pierde por completo.",
        ],
        // Resistencia Térmica es el único bono incondicional (el Blindaje
        // Ambiental depende de sufrir daño en un ambiente tóxico, así que se
        // queda solo en `detalle`, sin mecanizar). Un único +1: cubre
        // congelación y calor extremo a la vez (ninguno tiene salvación propia,
        // los dos caen en salv_fortaleza — no son dos bonos, es el mismo +1
        // aplicable a dos disparadores distintos). Bug corregido 2026-09-23:
        // antes había dos entradas idénticas, sumando +2 real en vez de +1
        // (ver docs/equipo-efectos-especiales.md §Mejoras Estándar, `me1`).
        modificadores: [
          { tipo: "tirada", alcance: { tipo: "tiradaId", id: "salv_fortaleza" }, valor: 1 },
        ],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "siempre_activo", estado: "construido" }, // Resistencia Térmica
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" }, // Blindaje Ambiental: condicional a daño en ambiente tóxico, sin CondicionTirada ni Modificador que lo represente hoy
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
        motor: [
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" }, // Blindaje Ambiental Mejorado
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
        motor: [
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" }, // Blindaje Ambiental Avanzado
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
          "Sube la dificultad a 4 contra escáneres avanzados; indetectable en inspecciones " +
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
        motor: [
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "H5" },
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
        // El +2 mejora el bono de LA ARMADURA (otra pieza), no aporta uno propio
        // independiente: no hay forma limpia de modelarlo sin acoplar ambas piezas.
        modificadores: [],
        motor: [
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "H5" }, // daño de fuego letal en vez de grave
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" }, // mejora el bono de OTRA pieza (la armadura), sin forma de modelar el acoplamiento hoy
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
        modificadores: [
          { tipo: "tirada", alcance: { tipo: "tiradaId", id: "salv_fortaleza" }, valor: 1 },
        ],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "siempre_activo", estado: "construido" },
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
        modificadores: [
          { tipo: "tirada", alcance: { tipo: "tiradaId", id: "salv_fortaleza" }, valor: 2 },
        ],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "siempre_activo", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "H5" }, // daño corrosivo letal en vez de grave
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
        modificadores: [
          { tipo: "tirada", alcance: { tipo: "tiradaId", id: "salv_fortaleza" }, valor: 1 },
        ],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "siempre_activo", estado: "construido" },
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
        modificadores: [
          { tipo: "tirada", alcance: { tipo: "tiradaId", id: "salv_fortaleza" }, valor: 2 },
        ],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "siempre_activo", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "H5" }, // ignora el primer nivel de daño eléctrico
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
        modificadores: [
          // El estado Ceguera (sistema-y-combate.md) no declara qué atributo la
          // salva — a diferencia de Congelación/Corrosión/Fusión/Llamarada, que sí
          // dicen "salvación habitual de X". No se le asigna una al azar: el id
          // queda como marcador para cuando se aclare, sin aplicarse a nada.
          { tipo: "tirada", alcance: { tipo: "tiradaId", id: "salv_ceguera_destello" }, valor: 3 },
        ],
        // Primer caso real del mecanismo de docs/modificadores-tiradas.md §8:
        // "ve a través de humo/cobertura -2 dentro de 50m" no se puede
        // auto-aplicar (el motor no rastrea distancia real ni cobertura, ver
        // el Camuflaje Trifásico) — pero sí informar en la propia tirada de
        // Buscar/percibir del portador, para que el máster lo aplique a mano
        // contra quien busca al personaje. Sin valor numérico (0/0): solo la
        // nota. docs/equipo-efectos-especiales.md §Mejoras Estándar.
        condiciones: [
          {
            id: "visor_nocturno_n2_activo",
            tipo: "toggle",
            etiqueta: "Visor Nocturno activo",
            alcance: { tipo: "tiradaId", id: "alerta_activa" },
            valorActivo: 0,
            valorInactivo: 0,
            nota: "Ves a través de humo denso, niebla o partículas. Cobertura visual -2 dentro de 50 m (aplícalo a mano).",
          },
        ],
        motor: [
          // NO "construido": el propio comentario de `modificadores` (arriba) dice
          // que "salv_ceguera_destello" es un id marcador sin tirada real detrás —
          // el +3 nunca se aplica a nada hasta que se sepa qué atributo salva
          // Ceguera. Corregido en revisión 2026-09-23 (estaba mal como "construido").
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_ceguera_destello" }, mecanismo: "siempre_activo", estado: "bloqueado", bloqueoPor: "qué salva Ceguera (sin definir, sistema-y-combate.md §Ceguera)" },
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
        // Narrativo puro, correctamente sin mecanizar: el motor no lleva reloj
        // de turnos por rastro ni mapa de posiciones pasadas.
        motor: [
          { tipo: "narrativo", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
        ],
      },
    ],
  },
];
