// Catálogo de Medicina y Farmacia — fuente: docs/equipamiento.md, sección
// "Medicina y Farmacia" (líneas 1207-1347). Primer bloque de los tres que
// quedaban sin transcribir del catálogo (ver docs/traspaso.md); Herramientas
// y Otras Armas a Distancia (armamento pesado + granadas) van después.
//
// Cómo conecta a tiradas (docs/modificadores-tiradas.md): la Valija Táctica
// Médica da un bono de personaje entero mientras se lleva encima ("+N a las
// tiradas de aplicación"), así que es un `Modificador` tipo "tirada" con
// alcance a la tirada fija `medicina` ("Tratar heridas") — no hace falta
// ninguna tirada nueva. Los fármacos, en cambio, NO llevan ningún
// modificador, aunque el documento dé números limpios para alguno (el +5 de
// Nano-Elixir, el "gran pureza" de una síntesis crítica): son bonos POR
// DOSIS, de un solo uso, y el motor no lleva inventario ni consumo de
// cargas — tratarlos como "mientras está equipado" daría un bono permanente
// por poseer una sola dosis, que no es la regla. Se quedan en `detalle`
// para que el jugador/narrador los aplique a mano al usar la dosis, mismo
// criterio que ya sigue la nota de la propia tirada `medicina`
// ("Gel sanador y estabilizar tienen dificultad 4").
import type { Herramienta, Consumible } from "./equipo";
import type { MotorMetadata } from "../rules/motor";

// docs/motor.md: el bono de aplicación de la VTM ya está mecanizado como
// Modificador tipo "tirada" con alcance a la tirada fija "medicina" — mismo
// MotorMetadata en los 4 niveles, solo cambia `valor` (que no forma parte de
// la clasificación). El resto de `detalle` de cada nivel (diagnóstico +2 con
// 1 minuto, "cualquier éxito cuenta como crítico"...) es prosa todavía sin
// transcribir a ningún campo de datos — no lleva entrada propia hasta que se
// capture como Modificador/CondicionTirada real, igual que `descripcion`.
const MOTOR_BONO_APLICACION: MotorMetadata[] = [
  {
    tipo: "numerico",
    afecta: { modo: "accion_existente", id: "medicina" },
    mecanismo: "siempre_activo",
    estado: "construido",
  },
];

export const VALIJA_TACTICA_MEDICA: Herramienta = {
  familia: "herramienta",
  id: "valija_tactica_medica",
  label: "Valija Táctica Médica (VTM)",
  resumen: "Quirófano y laboratorio biológico portátil: diagnostica, sintetiza y trata heridas.",
  descripcion:
    "Estuche acorazado desplegable, transportable a la espalda como mochila táctica. Combina un " +
    "bio-escáner de alta resolución con un sistema dual de asistencia clínica y síntesis " +
    "farmacológica capaz de procesar polímeros, fluidos y gases. Su software alberga protocolos " +
    "quirúrgicos y guías anatómicas para diagnósticos avanzados mediante bio-escaneos, análisis " +
    "de fluidos y biopsias virtuales.",
  niveles: [
    {
      nivel: 1,
      rareza: "Común",
      coste: 4000,
      detalle: [
        "Sin materiales no pasa de 3 kg; con cartuchos y componentes llenos, 4,5 o 5 kg. " +
          "Desenfundarla requiere una mano libre y acción compleja.",
        "Síntesis farmacéutica: dificultad base 7 para compuestos comunes, +2 por rango de rareza " +
          "superior. Éxito crítico da categoría de gran pureza (+1 de efectividad o doble duración). " +
          "Fabricar una dosis: Perspicacia + Biociencia (Bioquímica), acción compleja.",
        "Diagnóstico: bio-escáner de precisión clínica, 1 minuto como mínimo, Perspicacia + " +
          "Biociencia (Medicina), dificultad variable.",
        "Tratamientos: administrar cualquier compuesto con el instrumental de la valija da +1 a " +
          "las tiradas de aplicación. Incluye módulo físico de regulación térmica (revierte " +
          "congelación, -1 nivel por acción compleja exitosa de Perspicacia + Medicina dificultad " +
          "6; crítico, dos niveles) y depuración biológica (antitoxinas/antivirales, Perspicacia + " +
          "Bioquímica 1 minuto; aplicar con acción compleja y Perspicacia + Medicina dificultad 6 " +
          "para reducir un grado de envenenamiento o enfermedad, crítico dos grados).",
      ],
      // +1 a las tiradas de aplicación (nivel 1-2): bono de personaje entero
      // mientras se lleva la valija, va a la tirada fija "medicina".
      modificadores: [{ tipo: "tirada", alcance: { tipo: "tiradaId", id: "medicina" }, valor: 1 }],
      motor: MOTOR_BONO_APLICACION,
    },
    {
      nivel: 2,
      rareza: "Poco Habitual",
      coste: 24000,
      detalle: [
        "Sintetiza compuestos poco habituales con la dificultad de los comunes.",
        "Integra nano-dispositivos neuromusculares y bio-sensores que interactúan con implantes: " +
          "trata y revierte parálisis y ceguera temporal (-1 nivel por acción compleja exitosa " +
          "dificultad 7; crítico, dos niveles).",
        "Reversión de confusión: acción compleja dificultad 7; con crítico la elimina, con éxito la " +
          "revierte un grado.",
      ],
      // S9: el documento no repite el +1 de aplicación en este nivel, pero
      // tampoco dice que se pierda — se mantiene hasta que nivel 3 lo suba
      // a un total explícito.
      modificadores: [{ tipo: "tirada", alcance: { tipo: "tiradaId", id: "medicina" }, valor: 1 }],
      motor: MOTOR_BONO_APLICACION,
    },
    {
      nivel: 3,
      rareza: "Extraño",
      coste: 48000,
      detalle: [
        "Administrar fármacos o hacer tratamientos de urgencia pasa a acción simple.",
        "El bonificador de aplicación sube a +2 y los compuestos sintetizados duran un turno " +
          "adicional sin coste extra.",
        "El diagnóstico profundo pasa a acción compleja; dedicándole 1 minuto da +2. Desenfundar " +
          "la valija pasa a acción estándar.",
      ],
      modificadores: [{ tipo: "tirada", alcance: { tipo: "tiradaId", id: "medicina" }, valor: 2 }],
      motor: MOTOR_BONO_APLICACION,
    },
    {
      nivel: 4,
      rareza: "Muy Extraño",
      coste: 72000,
      detalle: [
        "Cualquier éxito en la tirada médica cuenta como crítico para tratamientos de estados " +
          "complejos (parálisis, ceguera, confusión, envenenamiento, enfermedad avanzada), " +
          "estabilización de daño letal/grave y síntesis farmacológica.",
        "El bonificador de aplicación llega a +3.",
        "Permite combinar dos tratamientos en una sola acción: dos fármacos, o un tratamiento y un " +
          "fármaco.",
      ],
      modificadores: [{ tipo: "tirada", alcance: { tipo: "tiradaId", id: "medicina" }, valor: 3 }],
      motor: MOTOR_BONO_APLICACION,
    },
  ],
};

// Agregado, mismo motivo que HERRAMIENTAS_UNICAS en catalog/herramientas.ts:
// una sola pieza de por sí, pero como array para que el barrido de
// MotorMetadata (docs/motor.md) tenga un patrón de iteración uniforme.
export const MEDICINA_UNICAS: Herramienta[] = [VALIJA_TACTICA_MEDICA];

// docs/motor.md: decisión de diseño ya cerrada (ver cabecera del archivo),
// no un hueco — un fármaco no lleva `modificadores` a propósito (bono POR
// DOSIS de un solo uso, el motor no rastrea inventario) y su `detalle` no se
// vuelca a ningún `Accion.nota` en ningún sitio del código (comprobado:
// FARMACOS solo se usa en TiendaTab.tsx). Narrativo, sin conexión, construido
// tal cual está — no "pendiente".
//
// Vale para 7 de los 10 — Analgésico, Ultra Estimulante y Xovromium sí traen
// un número real en su `detalle` (no solo prosa), corregido 2026-09-24
// (auditoría): esos tres llevan su propio `motor` en vez de esta constante.
const MOTOR_FARMACO: MotorMetadata[] = [
  { tipo: "narrativo", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
];

export const FARMACOS: Consumible[] = [
  {
    familia: "consumible",
    id: "farmaco_analgesico",
    label: "Analgésico",
    resumen: "Adormece el dolor agudo en campo. No precisa tirada.",
    descripcion: "Compuesto de rápida absorción que adormece las terminaciones nerviosas.",
    detalle: [
      "No precisa tirada. Reduce en 1 el penalizador por heridas.",
      "No hay sobredosis: tomar más no acumula beneficios. Duración: 1 hora.",
    ],
    pesoKg: null,
    rareza: "Común",
    coste: 5,
    modificadores: [],
    // Corregido 2026-09-24 (auditoría del catálogo): a diferencia del resto de
    // FARMACOS, este SÍ trae un número real ("reduce en 1 el penalizador por
    // heridas") — no es narrativo puro. `afecta: ninguna` porque el penalizador
    // por heridas es un ajuste de sistema (derivados.ts), no una tirada
    // concreta a la que apuntar; `pendiente` porque el motor no lleva bonos
    // temporales de dosis consumida, ni conecta con el cálculo de heridas.
    motor: [
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
    ],
  },
  {
    familia: "consumible",
    id: "farmaco_hemostaticos",
    label: "Agentes Hemostáticos y Polímeros Tisulares",
    resumen: "Sella heridas abiertas y detiene la hemorragia de inmediato.",
    descripcion: "Compuesto sintético para el sellado rápido de heridas abiertas.",
    detalle: [
      "Acción compleja con instrumental médico y Perspicacia + Biociencia (Medicina).",
      "Dificultad 7 en hemorragias normales, 9 en exanguinantes.",
    ],
    pesoKg: null,
    rareza: "Común",
    coste: 10,
    modificadores: [],
    motor: MOTOR_FARMACO,
  },
  {
    familia: "consumible",
    id: "farmaco_estabilizadores_neurales",
    label: "Estabilizadores Neurales",
    resumen: "Purga el aturdimiento al instante. Consume un cartucho de reactivo.",
    descripcion: "Solución inyectable que suprime la sobrecarga o cortocircuito sináptico del aturdimiento.",
    detalle: [
      "Acción estándar y Perspicacia + Biociencia (Medicina), dificultad 6: purga instantáneamente " +
        "el aturdimiento.",
    ],
    pesoKg: null,
    rareza: "Común",
    coste: 10,
    modificadores: [],
    motor: MOTOR_FARMACO,
  },
  {
    familia: "consumible",
    id: "farmaco_calmante",
    label: "Calmante",
    resumen: "Sedante profundo que enmascara dolores severos.",
    descripcion: "Sedante profundo para frenar la hiperventilación, calmar el pulso y enmascarar dolores.",
    detalle: [
      "Perspicacia + Medicina (dificultad 4) fija la duración: éxito 1 hora, +1 hora por cada 4 " +
        "éxitos acumulados. Reduce en 1 el penalizador por herida.",
      "Varias dosis reducen un penalizador mayor, pero cada dosis adicional produce 4 niveles de " +
        "fatiga; desde la tercera, salvación de Fortaleza (dificultad 8, +2 por dosis extra) o cae " +
        "inconsciente (fallo crítico: muere, con posibilidad de reanimación).",
    ],
    pesoKg: null,
    rareza: "Común",
    coste: 20,
    modificadores: [],
    motor: MOTOR_FARMACO,
  },
  {
    familia: "consumible",
    id: "farmaco_antipatogeno",
    label: "Antipatógeno",
    resumen: "Cóctel de anticuerpos contra agentes biológicos. No precisa tirada.",
    descripcion: "Cóctel de anticuerpos sintéticos y agentes de amplio espectro contra patógenos y toxinas.",
    detalle: [
      "No precisa tirada; solo actúa si el personaje está envenenado, enfermo o intoxicado.",
      "Permite una segunda salvación con +3 y revierte un nivel de gravedad, eliminando el " +
        "problema si revierte el primer estadio. Uno cada 8 horas.",
    ],
    pesoKg: null,
    rareza: "Común",
    coste: 50,
    modificadores: [],
    motor: MOTOR_FARMACO,
  },
  {
    familia: "consumible",
    id: "farmaco_ultra_estimulante",
    label: "Ultra Estimulante",
    resumen: "Adrenalina y aceleradores sinápticos para combate extremo. No precisa tirada.",
    descripcion: "Neuroestimulantes sintéticos de liberación rápida de adrenalina.",
    detalle: [
      "No precisa tirada. Durante 30 minutos: reduce en 1 el penalizador por heridas y fatiga, " +
        "+2 a la iniciativa y +1 a las acciones físicas de Agilidad o Fuerza.",
      "Al terminar: 2 niveles de fatiga y -1 en tiradas con atributos mentales durante la hora " +
        "siguiente. Un segundo uso dentro de 4 horas exige Fortaleza (dificultad 8, +2 por dosis " +
        "extra) o colapso nervioso: aturdido 1 minuto con fallo, inconsciente con fallo crítico.",
    ],
    pesoKg: null,
    rareza: "Común",
    coste: 50,
    modificadores: [],
    // Corregido 2026-09-24 (auditoría): dos números reales, dos entradas — el
    // resto del texto (penalizador por heridas/fatiga, el peaje al terminar,
    // el colapso por doble dosis) se queda sin transcribir a propósito, mismo
    // criterio que el resto del catálogo para prosa sin campo de datos propio.
    motor: [
      // +2 a la iniciativa: "iniciativa" es una tiradaId real (tiradas.ts),
      // pero el bono es temporal (30 min de la dosis) — no existe mecanismo
      // de bono temporal, así que pendiente aunque el objetivo sí sea real.
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "iniciativa" }, mecanismo: "ajuste_fijo", estado: "pendiente" },
      // +1 a las acciones físicas de Agilidad o Fuerza: no hay un grupo/tirada
      // único al que apunte ("acciones físicas" no es una categoría del motor).
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "pendiente" },
    ],
  },
  {
    familia: "consumible",
    id: "farmaco_gel_sanador",
    label: "Gel Sanador",
    resumen: "Biopolímeros y colágeno sintético para sanar heridas, a costa de fatiga.",
    descripcion:
      "Biopolímeros y andamios de colágeno sintético con factores de crecimiento acelerado; al no " +
      "traer nutrientes propios, obliga al organismo a sacrificar sus reservas energéticas.",
    detalle: [
      "Aplicación: acción compleja (salvo medios facilitadores) y Perspicacia + Medicina " +
        "(dificultad 4).",
      "Curación: cada éxito sana un nivel no letal; cada dos éxitos, uno letal; cada cuatro, uno " +
        "grave. Incluye los efectos del Analgésico y el Antipatógeno.",
      "Peaje metabólico: 1 punto de fatiga por nivel no letal sanado, 2 por letal, 4 por grave.",
    ],
    pesoKg: null,
    rareza: "Común",
    coste: 50,
    modificadores: [],
    motor: MOTOR_FARMACO,
  },
  {
    familia: "consumible",
    id: "farmaco_gel_sanador_avanzado",
    label: "Gel Sanador Avanzado",
    resumen: "Igual que el Gel Sanador, pero sin el peaje de fatiga.",
    descripcion:
      "Incorpora suspensión hipernutritiva de alta densidad energética y andamios moleculares " +
      "avanzados, aportando el 'combustible' desde fuera.",
    detalle: [
      "Misma aplicación y mismo efecto de curación que el Gel Sanador, eliminando el desgaste " +
        "por fatiga.",
    ],
    pesoKg: null,
    rareza: "Poco Habitual",
    coste: 250,
    modificadores: [],
    motor: MOTOR_FARMACO,
  },
  {
    familia: "consumible",
    id: "farmaco_nano_elixir",
    label: "Nano-Elixir",
    resumen: "Gel avanzado con nanobots: +5 a la tirada de curación de esa dosis.",
    descripcion:
      "Los principios activos del gel avanzado más una legión de nanobots que buscan, cierran y " +
      "reparan el deterioro celular por el torrente sanguíneo.",
    detalle: [
      "Funciona como el Gel Sanador Avanzado pero con +5 a la tirada de esa aplicación (bono de " +
        "la dosis, no del personaje — se suma a mano al tirar, el motor no lleva inventario de " +
        "dosis consumidas).",
      "No se apila con aumentos tecnológicos de nanomedicina. Bajo interferencia electromagnética " +
        "o sabotaje activo se degrada a Gel Sanador Avanzado convencional.",
    ],
    pesoKg: null,
    rareza: "Extraño",
    coste: 750,
    modificadores: [],
    motor: MOTOR_FARMACO,
  },
  {
    familia: "consumible",
    id: "farmaco_xovromium",
    label: "Xovromium",
    resumen: "Psicoactivo que sobrecarga la conexión psiónica: +1 a manifestaciones, 1 hora.",
    descripcion:
      "Psicoactivo sintético concentrado de moduladores sinápticos exóticos y catalizadores " +
      "neuronales inestables. Sobrecarga temporalmente las vías de conexión psiónica.",
    detalle: [
      "Requiere Voluntad + Biociencia o Actitud (dificultad 6) — no hay tirada fija en el catálogo " +
        "para esta pareja; se resuelve con dificultad libre en el modal de la tirada que " +
        "corresponda mientras no exista una propia.",
      "Con éxito dura 1 hora: +1 a las manifestaciones psiónicas e ignora el primer nivel de " +
        "fatiga por uso de poderes (docs/sistema.md §10.4 ya cita este efecto).",
      "Si falla, la dosis se pierde: 1 nivel de fatiga y -1 en tiradas con atributos mentales " +
        "durante 15 minutos.",
      "Al terminar el efecto: 2 niveles de fatiga y -2 en tiradas mentales durante la hora " +
        "siguiente. Un segundo uso dentro de 4 horas exige Fortaleza (dificultad 8, +2 por dosis " +
        "extra) o colapso psicosomático: aturdido 1 minuto con fallo, inconsciente con fallo " +
        "crítico.",
    ],
    pesoKg: null,
    rareza: "Extraño",
    coste: 1000,
    modificadores: [],
    // Corregido 2026-09-24 (auditoría): "+1 a las manifestaciones psiónicas"
    // es un número real, no narrativo — pero "manifestaciones psiónicas" no
    // existe como mecánica todavía (Fase 5, poderes psiónicos sin catálogo).
    // Bloqueado por Fase 5, no "pendiente" — no es solo que falte construir
    // el enganche, es que el propio objetivo no existe.
    motor: [
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "Fase 5" },
    ],
  },
];
