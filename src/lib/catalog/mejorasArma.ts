import type { NivelModulo } from "./equipo";
import type { TipoArma } from "./armasFuego";

// ── Mejoras de arma ──────────────────────────────────────────────────
// Fase C: la primera familia con COMPATIBILIDAD (no todo cabe en cualquier
// arma) además de ranura (mejorasAdmitidas, ya en ArmaFuego). La
// compatibilidad tiene dos formas distintas en el documento: por tipo de
// arma ("solo fusiles de asalto y de precisión") o por categoría de daño
// ("las armas de plasma no pueden instalarla") — de ahí la unión.
//
// Se deja fuera **Munición Especial (mejora de arma)**: su coste depende de
// qué munición elijas instalar, y munición entera está aparcada hasta
// Murillo (ver docs/sistema.md pregunta 7). Añadirla es incoherente sin esa
// pieza resuelta.
export type CompatibilidadArma =
  | { tipo: "todas" }
  | { tipo: "porTipoArma"; tiposPermitidos: TipoArma[] }
  | { tipo: "excluyeCategoriaDanio"; categoriasExcluidas: string[] };

export type MejoraDeArma = {
  familia: "mejoraArma";
  id: string;
  label: string;
  resumen: string;
  descripcion: string;
  compatibilidad: CompatibilidadArma;
  niveles: NivelModulo[]; // los que no tienen nivel en EQUIP llevan un único nivel 1
};

export const MEJORAS_ARMA: MejoraDeArma[] = [
  {
    familia: "mejoraArma",
    id: "mira_telescopica",
    label: "Mira Telescópica",
    resumen: "+1 al ataque a media y larga distancia. Solo fusiles.",
    descripcion:
      "Solo compatible con fusiles de asalto y fusiles de precisión.",
    compatibilidad: { tipo: "porTipoArma", tiposPermitidos: ["fusil_asalto", "fusil_precision"] },
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 100,
        detalle: [
          "+1 al ataque a distancia, solo en media y larga distancia.",
          "El mismo bonificador sirve para tiradas de búsqueda (percepción visual).",
        ],
        // El bono solo aplica a media/larga distancia: se fusiona en la
        // opción de tramo de la tirada de ataque, no es un +1 incondicional.
        modificadores: [],
        ajusteTramo: { media: 1, larga: 1 },
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "bono_tramo", estado: "construido" },
          // "El mismo bonificador sirve para tiradas de búsqueda" no está
          // construido: ajusteTramo solo alimenta la tirada de ataque del arma
          // huésped, no ninguna tirada de percepción. Caso inconcluso: no está
          // claro si el destino es "alerta_activa"/Buscar-percibir u otra —
          // ver informe final.
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
        ],
      },
      {
        nivel: 2,
        rareza: "Común",
        coste: 700,
        detalle: ["Aporta visión nocturna y térmica, como un visor de nivel 1, hasta 500 metros."],
        modificadores: [],
        // Mismo patrón exacto que Visor Nocturno/Visor Térmico n1 (toggle con
        // nota, mecanismo eleccion_jugador del §8) pero sin aplicar aquí —
        // "hallazgo real, no duda" según el barrido de motor: falta trabajo de
        // datos, no de diseño. Uno de los "quick wins" ya identificados.
        motor: [
          { tipo: "texto", afecta: { modo: "accion_existente", id: "alerta_activa" }, mecanismo: "eleccion_jugador", estado: "pendiente" },
        ],
      },
      {
        nivel: 3,
        rareza: "Poco Habitual",
        coste: 7000,
        detalle: [
          "Sistema inteligente que corrige el ángulo: el bonificador de ataque y percepción " +
            "visual sube a +2 (mismas condiciones de distancia que el nivel 1).",
        ],
        modificadores: [],
        // Total explícito del nivel, no +1 adicional sobre el del nivel 1
        // (supuesto S9: solo aplica dentro de la MISMA pieza instalada).
        ajusteTramo: { media: 2, larga: 2 },
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "bono_tramo", estado: "construido" },
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" }, // percepción visual, mismo caso inconcluso que nivel 1
        ],
      },
    ],
  },
  {
    familia: "mejoraArma",
    id: "puntero_laser",
    label: "Puntero Láser",
    resumen: "+1 al ataque activo, a cambio de -2 al sigilo visual.",
    descripcion: "Compatible con cualquier arma de fuego.",
    compatibilidad: { tipo: "todas" },
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 150,
        detalle: ["Mientras esté activo: +1 al modificador de ataque, -2 al sigilo (visual)."],
        // Condicionado a tenerlo activo (es un toggle, como el camuflaje): no
        // se mecaniza como un +1 permanente.
        modificadores: [],
        // El propio comentario dice "es un toggle, como el camuflaje" pero
        // nunca se construyó — a diferencia del Bípode, que sí lo tiene. Otro
        // de los "quick wins" ya identificados (mismo patrón que Bípode).
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "pendiente" },
        ],
      },
      {
        nivel: 2,
        rareza: "Extraño",
        coste: 3500,
        detalle: [
          "Con ojo biónico o Mira Telescópica de nivel 3, el puntero deja de penalizar el sigilo.",
        ],
        modificadores: [],
        // Depende de que nivel 1 se construya primero, y "ojo biónico" no
        // existe en el catálogo (Fase 5, aumentos).
        motor: [
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "Fase 5" },
        ],
      },
    ],
  },
  {
    familia: "mejoraArma",
    id: "linterna",
    label: "Linterna",
    resumen: "Luz de alta potencia, uso gratuito.",
    descripcion:
      "Linterna de alta potencia utilizable de forma gratuita: visibilidad lumínica perfecta a 50 " +
      "metros y visibilidad en penumbra a 250 metros.",
    compatibilidad: { tipo: "todas" },
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 120,
        detalle: ["Sin dificultad ni acción asociada: se enciende y apaga cuando se quiera."],
        modificadores: [],
        // El propio catálogo dice "sin dificultad ni acción asociada": no hay
        // número que mecanizar. Correctamente narrativo por ahora — no un
        // hueco (podría pasar a tipo 3 el día que exista una acción de "ver
        // en la oscuridad" con tramos, pero hoy no hay ninguna a la que
        // engancharlo).
        motor: [
          { tipo: "narrativo", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
        ],
      },
    ],
  },
  {
    familia: "mejoraArma",
    id: "bipode",
    label: "Bípode",
    resumen: "+1 al ataque apoyado; sin apoyar, penaliza por el peso. Solo armas pesadas.",
    descripcion:
      "Solo para fusiles de asalto, fusiles de precisión y ametralladoras (el documento también " +
      "cita lanzagranadas, que todavía no está en el catálogo).",
    compatibilidad: {
      tipo: "porTipoArma",
      tiposPermitidos: ["fusil_asalto", "fusil_precision", "ametralladora"],
    },
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 200,
        detalle: [
          "+1 al ataque si el personaje se tumba (acción simple) o apoya el arma en una cobertura " +
            "parcial a media altura.",
          "Suma 5 kg de carga al arma: sin apoyar, -1 al ataque.",
        ],
        // El +1 y el -1 son condicionales (apoyado o no): se pintan como
        // toggle en el modal de la tirada de ataque, no como modificador fijo.
        modificadores: [],
        condiciones: [
          {
            id: "apoyado",
            tipo: "toggle",
            etiqueta: "Apoyado / tumbado (bípode)",
            valorActivo: 1,
            valorInactivo: -1,
          },
        ],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" },
        ],
      },
      {
        nivel: 2,
        rareza: "Poco Habitual",
        coste: 4500,
        detalle: ["Materiales sofisticados: pierde el penalizador de peso y no suma carga."],
        modificadores: [],
        condiciones: [
          {
            id: "apoyado",
            tipo: "toggle",
            etiqueta: "Apoyado / tumbado (bípode)",
            valorActivo: 1,
            valorInactivo: 0,
          },
        ],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "eleccion_jugador", estado: "construido" },
        ],
      },
    ],
  },
  {
    familia: "mejoraArma",
    id: "silenciador",
    label: "Silenciador",
    resumen: "Elimina el sonido del disparo; reduce el penalizador de sigilo al -2.",
    descripcion:
      "Elimina el sonido del disparo. Reduce a -2 el penalizador al Sigilo al realizar ataques " +
      "sorpresivos con el arma.",
    compatibilidad: { tipo: "todas" },
    niveles: [
      {
        nivel: 1,
        rareza: "Poco Habitual",
        coste: 1000,
        detalle: ["Reduce a -2 (en vez del habitual) el penalizador de Sigilo en ataques sorpresivos."],
        // Fija un penalizador a un valor concreto en vez de sumar un bono
        // propio: no encaja como modificador simple de "+N".
        modificadores: [],
        // Mismo bloqueo que el sigilo de las armas de plasma: sin saber a qué
        // tirada concreta resta el "penalizador habitual" (pregunta 25b), no
        // se puede fijar esto a -2 de algo que no existe todavía como número.
        motor: [
          { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "pregunta 25b" },
        ],
      },
    ],
  },
  {
    familia: "mejoraArma",
    id: "sistema_retroceso",
    label: "Sistema de Retroceso",
    resumen: "Reduce 1 el penalizador de dificultad en modo automático. No en armas de plasma.",
    descripcion: "No funciona en armas de plasma.",
    compatibilidad: { tipo: "excluyeCategoriaDanio", categoriasExcluidas: ["Plasma"] },
    niveles: [
      {
        nivel: 1,
        rareza: "Poco Habitual",
        coste: 500,
        detalle: [
          "Reduce en 1 el penalizador de dificultad en tiradas de ataque en modo automático.",
          "En ametralladoras, mejora el ataque en cualquiera de sus modos.",
        ],
        // "En ametralladoras, mejora el ataque en cualquiera de sus modos" es
        // una excepción de familia que este alcance no distingue (no sabe qué
        // tipo de arma es, solo qué modo está elegido): con una ametralladora
        // en modo Estándar (no automático), este +1 no se aplicaría, aunque el
        // documento diga que debería. Pendiente de un alcance más fino si hace
        // falta — ver docs/modificadores-tiradas.md.
        modificadores: [
          { tipo: "tirada", alcance: { tipo: "modo", contieneEtiqueta: "F. Auto" }, valor: 1 },
        ],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "siempre_activo", estado: "construido" },
        ],
      },
      {
        nivel: 2,
        rareza: "Extraño",
        coste: 5000,
        detalle: ["La dificultad de esquiva contra ataques en modo automático sube en 1."],
        // S9: se mantiene el +1 de nivel 1. La subida de dificultad de esquiva
        // es un efecto sobre la tirada de OTRO personaje (el que esquiva), no
        // del portador: se queda en texto.
        modificadores: [
          { tipo: "tirada", alcance: { tipo: "modo", contieneEtiqueta: "F. Auto" }, valor: 1 },
        ],
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "siempre_activo", estado: "construido" }, // heredado de nivel 1 (S9)
          { tipo: "texto", afecta: { modo: "objetivo_tercero", id: "esquiva" }, mecanismo: "nota_fija", estado: "bloqueado", bloqueoPor: "objetivo_tercero sin tirada de portador donde colgar la nota" }, // sube la esquiva de QUIEN te dispara, no una tirada propia
        ],
      },
    ],
  },
  {
    familia: "mejoraArma",
    id: "bayoneta",
    label: "Bayoneta",
    resumen: "Convierte el arma en cuchillo de combate a dos manos cuando hace falta.",
    descripcion:
      "Equipa un Fusil de Asalto o una Escopeta con un cuchillo de combate. Admite cuchillos de " +
      "distintas tecnologías; el precio del cuchillo se suma al de la mejora.",
    compatibilidad: { tipo: "porTipoArma", tiposPermitidos: ["fusil_asalto", "escopeta"] },
    niveles: [
      {
        nivel: 1,
        rareza: "Común",
        coste: 50,
        detalle: [
          "Dificultad de ataque -1, mismo daño que un cuchillo de combate.",
          "El arma pasa a considerarse arma a dos manos mientras se usa como bayoneta.",
        ],
        // Es un perfil de arma melee propio (daño, dificultad, uso a dos
        // manos), no un modificador sobre el personaje: encaja mejor cuando
        // exista el tipo ArmaMelee (Fase E) que como Modificador suelto.
        modificadores: [],
        // El bloqueo original ("encaja mejor cuando exista ArmaMelee") está
        // desfasado: ArmaMelee ya existe (39 piezas en armasMelee.ts). Es el
        // hallazgo más accionable del barrido — falta generar una segunda
        // Accion (perfil de cuchillo de combate), mismo patrón que
        // tiradaDeLanzagranadas.
        motor: [
          { tipo: "accion", afecta: { modo: "accion_nueva", id: "golpear_bayoneta" }, mecanismo: "accion_equipo", estado: "pendiente" },
        ],
      },
    ],
  },
  {
    familia: "mejoraArma",
    id: "lanzagranadas_integrado",
    label: "Lanzagranadas Integrado",
    resumen: "Añade un lanzagranadas al arma; penaliza el disparo normal por el peso.",
    descripcion: "Solo para Fusil de Asalto.",
    compatibilidad: { tipo: "porTipoArma", tiposPermitidos: ["fusil_asalto"] },
    niveles: [
      {
        nivel: 1,
        rareza: "Poco Habitual",
        coste: 2000,
        detalle: [
          "-1 al modificador de ataque habitual del arma por el peso añadido (1,5 kg).",
          "Lanzagranadas acoplado: acción estándar, dificultad -2, daño según munición, cargador " +
            "1, alcance 200 m, área y efecto según la munición empleada.",
        ],
        // El -1 es al ataque de ESTA arma en concreto: se mecaniza como
        // ajusteAtaque. El lanzagranadas en sí es un perfil de disparo
        // aparte (con su propia munición): combate.ts genera su propia
        // tirada usando MUNICION_GRANADA (catalog/municion.ts) para el daño.
        modificadores: [],
        ajusteAtaque: -1,
        motor: [
          { tipo: "numerico", afecta: { modo: "accion_existente", id: "ataque_fuego" }, mecanismo: "ajuste_fijo", estado: "construido" }, // -1 al arma huésped
          { tipo: "accion", afecta: { modo: "accion_nueva", id: "lanzagranadas_integrado" }, mecanismo: "accion_equipo", estado: "construido" }, // tiradaDeLanzagranadas, combate.ts
        ],
      },
    ],
  },
];
