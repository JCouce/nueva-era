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
// `Modificador` de personaje entero, aunque el documento dé números limpios
// para alguno (el +5 de Nano-Elixir, el "gran pureza" de una síntesis
// crítica): son bonos POR DOSIS, de un solo uso — tratarlos como "mientras
// está equipado" daría un bono permanente por poseer una sola dosis, que no
// es la regla. Se quedan en `detalle` para que el jugador/narrador los
// aplique a mano al usar la dosis, mismo criterio que ya sigue la nota de la
// propia tirada `medicina` ("Gel sanador y estabilizar tienen dificultad 4").
// El motor SÍ lleva inventario y consumo de dosis desde
// docs/prompt-gasto-recursos.md (Fase 2, 2026-09-28) — decisión revertida:
// ver `Farmacos` (rules/recursos.ts) y `rules/farmacos.ts` para la acción
// "Usar" y el gasto de 1 dosis al confirmar.
import type { Herramienta, Consumible } from "./equipo";
import type { MotorMetadata } from "../rules/motor";
import { DESCANSO } from "./descanso";
import type { AlcanceModificador, Modificador } from "../rules/modificadores";
import type { CondicionTirada, OpcionCondicion } from "../rules/condiciones";

// «No se apila con aumentos tecnológicos de nanomedicina» (Nano-Elixir; au-07, usuario
// 2026-11-14): grupo `noApila` del +5 de su fila «Usar Nano-Elixir» (rules/farmacos.ts) y de la
// casilla «Sobre ti mismo» del Enjambre Nanobot 1 (catalog/aumentos.ts). Vale el mayor.
export const NO_APILA_NANOMEDICINA = "nanomedicina";

// docs/motor.md: el bono de aplicación de la VTM ya está mecanizado como
// Modificador tipo "tirada" con alcance a la tirada fija "medicina" — mismo
// MotorMetadata en los 4 niveles, solo cambia `valor` (que no forma parte de
// la clasificación). El resto de `detalle` de cada nivel (diagnóstico +2 con
// 1 minuto, "cualquier éxito cuenta como crítico"...) es prosa todavía sin
// transcribir a ningún campo de datos — no lleva entrada propia hasta que se
// capture como Modificador/CondicionTirada real, igual que `descripcion`.
// R4 (2026-10-24): "al administrar cualquier compuesto a través del instrumental de la valija
// obtiene un bonificador ... a las tiradas de aplicación" — también en "Usar [fármaco]" (grupo
// Fármacos), no solo en Tratar heridas. Un Modificador por alcance (clave distinta), así cada
// nivel sustituye su valor en los dos (acumulaPorClave).
const MOTOR_BONO_APLICACION: MotorMetadata[] = [
  {
    tipo: "numerico",
    afecta: { modo: "accion_existente", id: "medicina" },
    mecanismo: "siempre_activo",
    estado: "construido",
  },
  {
    tipo: "numerico",
    afecta: { modo: "accion_existente", id: "grupo:Fármacos" },
    mecanismo: "siempre_activo",
    estado: "construido",
  },
];

const bonoAplicacion = (valor: number): Modificador[] => [
  { tipo: "tirada", alcance: { tipo: "tiradaId", id: "medicina" }, valor },
  { tipo: "tirada", alcance: { tipo: "grupo", grupo: "Fármacos" }, valor },
];

// Tratamientos de la valija (S94, docs/fuente/equipamiento.md, VTM): opciones de «Tratar
// heridas» con la dificultad que da el documento (el modal la pone al elegirlas). Un único
// selector `vtm_tratamiento` que cada nivel vuelve a declarar entero (acumulaPorClave: gana el
// del nivel más alto), así las opciones de los niveles bajos no se pierden. Nivel 4: los estados
// complejos que nombra (parálisis, ceguera, confusión, envenenamiento, enfermedad) y la
// estabilización/síntesis, con cualquier éxito como crítico; la congelación no la nombra.
const ID_VTM_TRATAMIENTO = "vtm_tratamiento";
const ALCANCE_TRATAR = { tipo: "tiradaId", id: "medicina" } as const;
const OPCION_HERIDA_NORMAL: OpcionCondicion = { id: "normal", etiqueta: "Herida normal", valor: 0, sinValor: true };
const CRITICO_VTM4 = { margenCriticoExito: 0, nota: "VTM nv4: cualquier éxito en esta tirada cuenta como crítico." };

function opcionesTratamientoVtm(nivel: number): OpcionCondicion[] {
  const nv4 = nivel >= 4;
  const conCritico = (o: OpcionCondicion): OpcionCondicion =>
    nv4 ? { ...o, margenCriticoExito: 0, nota: `${o.nota} ${CRITICO_VTM4.nota}` } : o;
  const opciones: OpcionCondicion[] = [
    OPCION_HERIDA_NORMAL,
    {
      id: "congelacion",
      etiqueta: "Congelación (regulación térmica)",
      valor: 0,
      sinValor: true,
      dificultad: 6,
      nota: "Acción compleja: baja un nivel de frío; con crítico, dos.",
    },
    conCritico({
      id: "depuracion",
      etiqueta: "Envenenamiento o enfermedad (depuración biológica)",
      valor: 0,
      sinValor: true,
      dificultad: 6,
      nota:
        "Antes, sintetizar la antitoxina o el antiviral: Perspicacia + Biociencia (Bioquímica), 1 minuto, " +
        "dificultad variable. Aplicarlo es acción compleja: reduce un grado de la afección; con crítico, dos.",
    }),
  ];
  if (nivel >= 2) {
    opciones.push(
      conCritico({
        id: "paralisis_ceguera",
        etiqueta: "Parálisis o ceguera temporal",
        valor: 0,
        sinValor: true,
        dificultad: 7,
        nota: "Acción compleja: baja un nivel del estado; con crítico, dos.",
      }),
      conCritico({
        id: "confusion",
        etiqueta: "Confusión",
        valor: 0,
        sinValor: true,
        dificultad: 7,
        nota: "Acción compleja: con éxito revierte un grado; con crítico, la elimina.",
      }),
    );
  }
  if (nv4) {
    opciones.push({
      id: "complejo",
      etiqueta: "Otro estado complejo / estabilización / síntesis",
      valor: 0,
      sinValor: true,
      ...CRITICO_VTM4,
      nota: "Cualquier éxito en esta tirada cuenta como crítico.",
    });
  }
  return opciones;
}

const NOTA_COMBINAR_VTM =
  "VTM nv4: combina dos tratamientos en una sola acción (dos fármacos, o un tratamiento y un fármaco); cada uno se tira aparte.";

function casillaCombinarVtm(id: string, alcance: AlcanceModificador): CondicionTirada {
  return { id, tipo: "toggle", etiqueta: "Combinar dos tratamientos (VTM nv4)", valorActivo: 0, valorInactivo: 0, nota: NOTA_COMBINAR_VTM, alcance };
}

function condicionTratamientoVtm(nivel: number): CondicionTirada {
  return {
    id: ID_VTM_TRATAMIENTO,
    tipo: "opcion",
    etiqueta: `Tratamiento (VTM nv${nivel})`,
    opciones: opcionesTratamientoVtm(nivel),
    porDefecto: "normal",
    alcance: ALCANCE_TRATAR,
  };
}

const MOTOR_TRATAMIENTOS_VTM: MotorMetadata = {
  tipo: "numerico",
  afecta: { modo: "accion_existente", id: "medicina" },
  mecanismo: "eleccion_jugador",
  estado: "construido",
};

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
      modificadores: bonoAplicacion(1),
      condiciones: [condicionTratamientoVtm(1)],
      motor: [...MOTOR_BONO_APLICACION, MOTOR_TRATAMIENTOS_VTM],
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
      modificadores: bonoAplicacion(1),
      condiciones: [condicionTratamientoVtm(2)],
      motor: [...MOTOR_BONO_APLICACION, MOTOR_TRATAMIENTOS_VTM],
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
      modificadores: bonoAplicacion(2),
      // Diagnóstico profundo (docs/checklist-motor-vs-prosa-2026-09-24.md):
      // +2 declarado por el jugador, no un bono de personaje entero — mismo
      // criterio que Visor Nocturno/Bípode (toggle con alcance a la tirada
      // "medicina"), a diferencia de MOTOR_BONO_APLICACION (siempre activo
      // por llevar la valija puesta). Numérico puro: entra solo por
      // valorCondiciones()/desgloseCondiciones(), sin tocar tirar().
      condiciones: [
        {
          id: "vtm_diagnostico_profundo",
          tipo: "toggle",
          etiqueta: "Diagnóstico profundo (1 minuto, VTM nv3)",
          valorActivo: 2,
          valorInactivo: 0,
          nota: "Solo si dedicas 1 minuto completo a diagnosticar antes de tirar.",
          alcance: { tipo: "tiradaId", id: "medicina" },
        },
      ],
      motor: [
        ...MOTOR_BONO_APLICACION,
        {
          tipo: "numerico",
          afecta: { modo: "accion_existente", id: "medicina" },
          mecanismo: "eleccion_jugador",
          estado: "construido",
        },
        { tipo: "texto", afecta: { modo: "accion_existente", id: "grupo:Fármacos" }, mecanismo: "nota_fija", estado: "construido" },
      ],
      // «Administrar fármacos … como acción simple» (T5c): «Inyectarse» en «Usar [fármaco]».
      rebajasTipoAccion: [{ accion: "inyectarse", op: "sustituye", a: ["simple"] }],
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
      modificadores: bonoAplicacion(3),
      // Crítico parametrizable (docs/tareas.md, 2026-09-28): el motor no
      // puede distinguir por sí solo "herida normal" de "estado complejo/
      // estabilización/síntesis" en la misma tirada "Tratar heridas" — se
      // declara con un selector, mismo criterio que cualquier otra elección
      // del jugador al tirar (modo de disparo, tramo...). Solo esta tirada
      // (alcance tiradaId "medicina"), a propósito: no se extiende a las
      // tiradas de fármacos aunque la prosa también las mencione — eso
      // queda aparte si hace falta más adelante. El umbral va como dato de la
      // opción (`margenCriticoExito: 0`) y lo aplica montarTirada (montaje.ts).
      // "Combinar dos tratamientos en una sola acción": solo aviso, como el Visor Nocturno (casilla
      // sin número con su nota), en Tratar heridas y en los fármacos (auditoría tanda 1, usuario).
      condiciones: [
        condicionTratamientoVtm(4),
        casillaCombinarVtm("vtm_combinar_tratar", ALCANCE_TRATAR),
        casillaCombinarVtm("vtm_combinar_farmacos", { tipo: "grupo", grupo: "Fármacos" }),
      ],
      motor: [
        ...MOTOR_BONO_APLICACION,
        {
          tipo: "resolucion",
          afecta: { modo: "accion_existente", id: "medicina" },
          mecanismo: "eleccion_jugador",
          estado: "construido",
        },
        { tipo: "texto", afecta: { modo: "accion_existente", id: "medicina" }, mecanismo: "eleccion_jugador", estado: "construido" },
        { tipo: "texto", afecta: { modo: "accion_existente", id: "grupo:Fármacos" }, mecanismo: "eleccion_jugador", estado: "construido" },
      ],
    },
  ],
};

// Agregado, mismo motivo que HERRAMIENTAS_UNICAS en catalog/herramientas.ts:
// una sola pieza de por sí, pero como array para que el barrido de
// MotorMetadata (docs/motor.md) tenga un patrón de iteración uniforme.
export const MEDICINA_UNICAS: Herramienta[] = [VALIJA_TACTICA_MEDICA];

// docs/motor.md: decisión de diseño ya cerrada (ver cabecera del archivo),
// no un hueco — un fármaco no lleva `modificadores` a propósito (bono POR
// DOSIS de un solo uso, no un bono de personaje entero). Su `detalle` sigue
// sin volcarse a ningún `Accion.nota` de forma automática: rules/farmacos.ts
// lo cita como texto fijo en la nota de "Usar [fármaco]" (Fase 2), pero el
// efecto en sí (cuánto cura, qué purga) sigue sin mecanizar. Narrativo, sin
// conexión al cálculo, construido tal cual está — no "pendiente".
//
// Vale para 7 de los 10 — Analgésico, Ultra Estimulante y Xovromium sí traen
// un número real en su `detalle` (no solo prosa), corregido 2026-09-24
// (auditoría): esos tres llevan su propio `motor` en vez de esta constante.
const MOTOR_FARMACO: MotorMetadata[] = [
  { tipo: "narrativo", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
];

// «Reduce en 1 el penalizador por heridas» (y fatiga, el Ultra): fármacos como estados (usuario,
// 2026-11-14; sustituye a la casilla de fa-01). Usar la dosis pone su estado («Bajo Analgésico»,
// «Bajo Calmante», «Bajo Ultra Estimulante»; los Geles, el del Analgésico), que rebaja el umbral
// mientras dura (Estado.reduceUmbral; entre fármacos, el mayor: ajusteUmbralesDeEstados).
const MOTOR_CONTRA_DOLOR: MotorMetadata = {
  tipo: "numerico",
  afecta: { modo: "accion_existente", id: "todas" },
  mecanismo: "siempre_activo",
  estado: "construido",
};

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
    aplicacion: { base: "estandar", conArmadura: "compleja" },
    modificadores: [],
    // "Reduce en 1 el penalizador por heridas": «Usar» pone «Bajo Analgésico» (rules/farmacos.ts).
    motor: [MOTOR_CONTRA_DOLOR],
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
    aplicacion: { base: "compleja" },
    modificadores: [],
    motor: MOTOR_FARMACO,
  },
  {
    familia: "consumible",
    id: "farmaco_estabilizadores_neurales",
    label: "Estabilizadores Neurales",
    resumen: "Purga un grado del aturdimiento al instante. Consume un cartucho de reactivo.",
    descripcion: "Solución inyectable que suprime la sobrecarga o cortocircuito sináptico del aturdimiento.",
    detalle: [
      "Acción estándar y Perspicacia + Biociencia (Medicina), dificultad 6: purga instantáneamente " +
        "un grado del aturdimiento. Con éxito crítico elimina por completo el estado.",
    ],
    pesoKg: null,
    rareza: "Común",
    coste: 10,
    aplicacion: { base: "estandar" },
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
    aplicacion: { base: "estandar", conArmadura: "compleja" },
    modificadores: [],
    // "Reduce en 1 el penalizador por herida": superar su tirada pone «Bajo Calmante»; varias
    // dosis no suman (fa-02: entre fármacos vale el mayor).
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "farmaco_farmaco_calmante" }, mecanismo: "accion_equipo", estado: "construido" },
      MOTOR_CONTRA_DOLOR,
    ],
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
    aplicacion: { base: "estandar", conArmadura: "compleja" },
    modificadores: [],
    // R9 (2026-10-24): la segunda salvación con +3, casilla en la salvación de Fortaleza
    // mientras quede una dosis (casillasDeFarmacos, rules/farmacos.ts).
    motor: [
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "eleccion_jugador", estado: "construido" },
    ],
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
    aplicacion: { base: "estandar", conArmadura: "compleja" },
    modificadores: [],
    // Fármacos como estados (usuario, 2026-11-14; antes, casillas: S94, fa-01): usar la dosis pone
    // «Bajo Ultra Estimulante», que mientras dura da +2 en las iniciativas y +1 en las tiradas con
    // Fortaleza, Potencia o Reflejos que no son salvación (sin sumarse entre sí) y −1 a los
    // penalizadores por heridas y fatiga (catalog/estados.ts). Su botón, al acabarse, resta 2 de
    // fatiga y pone «Bajón del Ultra» (−1 a Voluntad, Perspicacia y Expresión; fa-03,
    // rules/acabarEstado.ts). El colapso por doble dosis sigue en `detalle`, a mano (fa-04).
    motor: [
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "grupo:Iniciativa" }, mecanismo: "siempre_activo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "aplicado:fortaleza/potencia/reflejos" }, mecanismo: "siempre_activo", estado: "construido" },
      MOTOR_CONTRA_DOLOR, // −1 a los penalizadores por heridas y fatiga
      // El bajón: estado «Bajón del Ultra», puesto desde el recordatorio.
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "aplicado:perspicacia|voluntad|expresion" }, mecanismo: "siempre_activo", estado: "construido" },
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
    aplicacion: { base: "compleja" },
    modificadores: [],
    // Incluye el efecto del Analgésico: superar su tirada pone «Bajo Analgésico».
    motor: [...MOTOR_FARMACO, MOTOR_CONTRA_DOLOR],
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
    aplicacion: { base: "compleja" },
    modificadores: [],
    // Incluye el efecto del Analgésico: superar su tirada pone «Bajo Analgésico».
    motor: [...MOTOR_FARMACO, MOTOR_CONTRA_DOLOR],
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
        "la dosis, no del personaje — ya viene sumado en la propia tirada de \"Usar Nano-Elixir\", " +
        "no hay que aplicarlo a mano).",
      "No se apila con aumentos tecnológicos de nanomedicina. Bajo interferencia electromagnética " +
        "o sabotaje activo se degrada a Gel Sanador Avanzado convencional.",
    ],
    pesoKg: null,
    rareza: "Extraño",
    coste: 750,
    aplicacion: { base: "compleja" },
    modificadores: [],
    // R9 (2026-10-24): el +5 ya va sumado en su fila "Usar Nano-Elixir" (ajustesFijos,
    // rules/farmacos.ts) — numérico construido, no narrativo. au-07: con el grupo
    // NO_APILA_NANOMEDICINA, así que con la casilla del Enjambre Nanobot vale el mayor.
    motor: [
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "farmaco_farmaco_nano_elixir" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "farmaco_farmaco_nano_elixir" }, mecanismo: "ajuste_fijo", estado: "construido" },
      MOTOR_CONTRA_DOLOR, // como el Gel, el efecto del Analgésico («Bajo Analgésico»)
    ],
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
      "Requiere Voluntad + Biociencia o Actitud (dificultad 6), en su fila «Usar Xovromium».",
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
    aplicacion: { base: "estandar", conArmadura: "compleja" },
    modificadores: [],
    motor: [
      // La tirada de tomarlo es su fila en Fármacos; superarla pone «Bajo Xovromium», que aplica
      // solo su efecto en los poderes (FUENTES_EXTERNAS_FATIGA, catalog/psionica.ts).
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "farmaco_farmaco_xovromium" }, mecanismo: "accion_equipo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "psionica" }, mecanismo: "siempre_activo", estado: "construido" },
      // fa-03: el rechazo (fallar la tirada: 1 de fatiga y «Rechazo del Xovromium», −1) y el bajón
      // (desde el recordatorio «Bajo Xovromium»: 2 de fatiga y «Bajón del Xovromium», −2), como
      // estados sobre Voluntad, Perspicacia y Expresión (rules/farmacos.ts, rules/acabarEstado.ts).
      // La sobredosis sigue en `detalle`, a mano (fa-04).
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "aplicado:perspicacia|voluntad|expresion" }, mecanismo: "siempre_activo", estado: "construido" },
    ],
  },
];

// Nutrición (sync Drive 2026-11-14, «Medicina, Farmacia y Nutrición»). Se compran con cantidad,
// en el mismo pool que los fármacos (sheet.farmacos, por catalogoId), pero sin acción: no hay
// «Comer» (usuario, 2026-11-14); comer se narra y la fatiga se ajusta a mano, con la cantidad
// de cada comida (DESCANSO.comida, catalog/descanso.ts).
const MOTOR_NUTRICION: MotorMetadata[] = [
  { tipo: "narrativo", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" },
];

// Lo que no hace la app al comer, y quién cambia la cifra (texto de la pieza, usuario 2026-11-14).
const NOTA_COMER =
  `Comer se narra: la app no tiene acción de comer. Cada comida recupera ${DESCANSO.comida.fatiga} de fatiga ` +
  `(${DESCANSO.comida.porDia} al día); ajústala a mano en Recursos y descuenta la unidad.`;
const NOTA_DUPLICAN =
  "Biogénesis Mitocondrial duplica la efectividad de cualquier consumible o alimento que recupere " +
  "fatiga; Metabolismo Sintético 3 duplica la fatiga recuperada por comida.";

export const NUTRICION: Consumible[] = [
  {
    familia: "consumible",
    id: "nutricion_racion_viaje",
    label: "Ración de Viaje",
    resumen: "Bloque deshidratado de larga conservación: una comida.",
    descripcion:
      "Bloque alimentario deshidratado de larga conservación que aporta los nutrientes y las " +
      "calorías necesarias para aguantar la jornada. La ración es la cantidad estándar para cada comida.",
    detalle: ["Una ración es una comida.", NOTA_COMER, NOTA_DUPLICAN],
    pesoKg: null,
    rareza: "Común",
    coste: 4,
    modificadores: [],
    motor: MOTOR_NUTRICION,
  },
  {
    familia: "consumible",
    id: "nutricion_gel",
    label: "Gel Nutricional",
    resumen: "Pasta hipercalórica en tubo: una ración que se toma en plena acción.",
    descripcion:
      "Pasta hipercalórica de absorción inmediata empaquetada en un tubo exprés para chutar energía " +
      "en mitad de la acción.",
    detalle: ["Equivale a una ración, pero se puede tomar como acción compleja.", NOTA_COMER, NOTA_DUPLICAN],
    pesoKg: null,
    rareza: "Común",
    coste: 15,
    modificadores: [],
    motor: MOTOR_NUTRICION,
  },
  {
    familia: "consumible",
    id: "nutricion_super_alimentos",
    label: "Súper Alimentos",
    resumen: "Compuesto sintético que acelera la recuperación: +1 a la fatiga de la comida.",
    descripcion:
      "Compuesto nutricional sintético de vanguardia enriquecido con electrolitos y moduladores " +
      "metabólicos para acelerar la recuperación física.",
    detalle: ["Aumenta en 1 la fatiga recuperada al ingerirlos.", NOTA_COMER, NOTA_DUPLICAN],
    pesoKg: null,
    rareza: "Poco Habitual",
    coste: 50,
    modificadores: [],
    motor: MOTOR_NUTRICION,
  },
];
