import type { Modificador } from "../rules/modificadores";
import type { MotorMetadata } from "../rules/motor";
import type { Rareza } from "./equipo";

// ── Armaduras y trajes ──────────────────────────────────────────────────
export type Armadura = {
  familia: "armadura";
  id: string;
  label: string;
  resumen: string;
  descripcion: string;
  blindaje: number;
  bonifMaxAgilidad: number | null; // null = "Ilimitado"
  ranurasSubsistema: number;
  topeExoesqueleto: number | null; // null = no admite el módulo
  topeMovilidadAerea: number | null;
  rareza: Rareza;
  coste: number;
  modificadores: Modificador[];
  // docs/motor.md: un MotorMetadata por efecto de la pieza. Opcional para
  // que el barrido sea incremental — catalog/motor.test.ts es quien exige
  // que acabe estando completo, no el tipo.
  motor?: MotorMetadata[];
};

// Las 4 "avanzadas" comparten un único párrafo de descripción en el
// documento (no hay uno distinto por modelo): prototipos caros, mejores en
// todo, con rendimiento añadido en subsistemas. No repite el bono de
// congelación/llamarada para ellas, así que no se le supone (a diferencia de
// los niveles de un mismo módulo, esto son modelos distintos — el supuesto S9
// no aplica entre modelos).
const DESCRIPCION_AVANZADA =
  "En fase de prototipo, con un alto coste de fabricación por el diseño y los metamateriales " +
  "avanzados que usa. Su mejoría es evidente en todos los aspectos, tanto a nivel defensivo como " +
  "en el movimiento, y saca un rendimiento añadido a los subsistemas integrados, permitiendo el " +
  "uso de varias baterías superconductoras de forma simultánea.";

export const ARMADURAS: Armadura[] = [
  {
    familia: "armadura",
    id: "ropa_reforzada",
    label: "Ropa Reforzada",
    resumen: "La opción más barata: blindaje mínimo, sin subsistemas ni extras.",
    descripcion:
      "El documento no da más detalle que la tabla: blindaje básico sin ranuras de personalización " +
      "ni soporte para exoesqueleto o movilidad aérea. La entrada de precio del catálogo.",
    blindaje: 1,
    bonifMaxAgilidad: 4,
    ranurasSubsistema: 0,
    topeExoesqueleto: null,
    topeMovilidadAerea: null,
    rareza: "Común",
    coste: 100,
    modificadores: [],
    motor: [
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "pregunta 29" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "instalar_subsistema" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "exoesqueleto" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "movilidadAerea" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
    ],
  },
  {
    familia: "armadura",
    id: "traje_ultra_ligero",
    label: "Traje Ultra Ligero",
    resumen: "Nanomateriales apilados, sellado térmico: defensa alta sin apenas estorbar.",
    descripcion:
      "Un sofisticado traje de nanomateriales apilados que forman pequeñas láminas, fabricado con " +
      "láser, sellado térmicamente para mejor adaptabilidad y cobertura. El traje otorga un " +
      "bonificador en tiradas de salvación contra congelación y llamarada de +1.",
    blindaje: 3,
    bonifMaxAgilidad: null,
    ranurasSubsistema: 1,
    topeExoesqueleto: 1,
    topeMovilidadAerea: null,
    rareza: "Común",
    coste: 4000,
    modificadores: [
      { tipo: "tirada", alcance: { tipo: "tiradaId", id: "salv_fortaleza" }, valor: 1 },
      { tipo: "tirada", alcance: { tipo: "tiradaId", id: "salv_reflejos" }, valor: 1 },
    ],
    motor: [
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "pregunta 29" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "instalar_subsistema" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "exoesqueleto" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "movilidadAerea" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "siempre_activo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_reflejos" }, mecanismo: "siempre_activo", estado: "construido" },
    ],
  },
  {
    familia: "armadura",
    id: "ropa_inteligente",
    label: "Ropa Inteligente",
    resumen: "Los mismos materiales que el traje ultra ligero, con pinta de ropa normal.",
    descripcion:
      "Usando los mismos materiales que el traje ultra ligero, ofrece una defensa casi tan óptima " +
      "pero con apariencia de conjunto de ropa normal — chaqueta, pantalón y calzado, de lo más " +
      "elegante a lo puramente casual. Al igual que el traje, otorga un bonificador en tiradas de " +
      "salvación contra congelación y llamarada de +1.",
    blindaje: 2,
    bonifMaxAgilidad: null,
    ranurasSubsistema: 1,
    topeExoesqueleto: 1,
    topeMovilidadAerea: null,
    rareza: "Poco Habitual",
    coste: 5000,
    modificadores: [
      { tipo: "tirada", alcance: { tipo: "tiradaId", id: "salv_fortaleza" }, valor: 1 },
      { tipo: "tirada", alcance: { tipo: "tiradaId", id: "salv_reflejos" }, valor: 1 },
    ],
    motor: [
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "pregunta 29" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "instalar_subsistema" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "exoesqueleto" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "movilidadAerea" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "siempre_activo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_reflejos" }, mecanismo: "siempre_activo", estado: "construido" },
    ],
  },
  {
    familia: "armadura",
    id: "armadura_ligera",
    label: "Armadura Ligera",
    resumen: "El término medio del mercado: protección sólida sin sacrificar mucha movilidad.",
    descripcion:
      "La armadura ligera añade al traje una coraza parcial y zonas blindadas en las extremidades. " +
      "Su estructura permite integrar exoesqueleto biomecánico para mejorar el rendimiento físico " +
      "del usuario. Su naturaleza aislante otorga un bonificador en tiradas de salvación contra " +
      "congelación y llamarada de +1. La relación de movilidad, defensa, versatilidad y por " +
      "supuesto, precio, la convierten en la estrella del mercado.",
    blindaje: 4,
    bonifMaxAgilidad: 4,
    ranurasSubsistema: 1,
    topeExoesqueleto: 2,
    topeMovilidadAerea: 2,
    rareza: "Común",
    coste: 6000,
    modificadores: [
      { tipo: "tirada", alcance: { tipo: "tiradaId", id: "salv_fortaleza" }, valor: 1 },
      { tipo: "tirada", alcance: { tipo: "tiradaId", id: "salv_reflejos" }, valor: 1 },
    ],
    motor: [
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "pregunta 29" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "instalar_subsistema" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "exoesqueleto" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "movilidadAerea" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "siempre_activo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_reflejos" }, mecanismo: "siempre_activo", estado: "construido" },
    ],
  },
  {
    familia: "armadura",
    id: "armadura_intermedia",
    label: "Armadura Intermedia",
    resumen: "Más protección, más limitación de movilidad, fabricación menos frecuente.",
    descripcion:
      "En pro de ofrecer una mayor protección, este modelo limita en mayor grado la movilidad y, " +
      "aunque su eficiencia es probada, su coste adicional hace que su fabricación sea más " +
      "infrecuente. Como su hermana menor, otorga el mismo bonificador contra congelación y " +
      "llamarada.",
    blindaje: 6,
    bonifMaxAgilidad: 2,
    ranurasSubsistema: 1,
    topeExoesqueleto: 3,
    topeMovilidadAerea: 3,
    rareza: "Poco Habitual",
    coste: 12000,
    modificadores: [
      { tipo: "tirada", alcance: { tipo: "tiradaId", id: "salv_fortaleza" }, valor: 1 },
      { tipo: "tirada", alcance: { tipo: "tiradaId", id: "salv_reflejos" }, valor: 1 },
    ],
    motor: [
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "pregunta 29" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "instalar_subsistema" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "exoesqueleto" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "movilidadAerea" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "siempre_activo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_reflejos" }, mecanismo: "siempre_activo", estado: "construido" },
    ],
  },
  {
    familia: "armadura",
    id: "armadura_pesada",
    label: "Armadura Pesada",
    resumen: "La más ambiciosa de las armaduras corrientes: casi una servoarmadura.",
    descripcion:
      "La más ambiciosa de los modelos de combate corrientes, con una eficiencia en defensa a la " +
      "par que muchas servoarmaduras. Posibilita incorporar grandes exoesqueletos biomecánicos y " +
      "propulsores de movilidad aérea, y tiene capacidad para varias baterías, permitiendo usar " +
      "varios subsistemas a la vez. Apenas la usan unidades de élite en misiones de asalto de alto " +
      "riesgo: su portentosa defensa limita mucho la agilidad, por lo que no es habitual en " +
      "infiltración. Confiere un bonificador de +1 en salvaciones contra congelación y llamarada.",
    blindaje: 8,
    bonifMaxAgilidad: 0,
    ranurasSubsistema: 2,
    topeExoesqueleto: 4,
    topeMovilidadAerea: 4,
    rareza: "Extraño",
    coste: 20000,
    modificadores: [
      { tipo: "tirada", alcance: { tipo: "tiradaId", id: "salv_fortaleza" }, valor: 1 },
      { tipo: "tirada", alcance: { tipo: "tiradaId", id: "salv_reflejos" }, valor: 1 },
    ],
    motor: [
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "pregunta 29" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "instalar_subsistema" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "exoesqueleto" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "movilidadAerea" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_fortaleza" }, mecanismo: "siempre_activo", estado: "construido" },
      { tipo: "numerico", afecta: { modo: "accion_existente", id: "salv_reflejos" }, mecanismo: "siempre_activo", estado: "construido" },
    ],
  },
  {
    familia: "armadura",
    id: "ultra_ligero_avanzado",
    label: "Ultra Ligero Avanzado",
    resumen: "La versión prototipo del traje ultra ligero: mismo perfil, mejor en todo.",
    descripcion: DESCRIPCION_AVANZADA,
    blindaje: 4,
    bonifMaxAgilidad: null,
    ranurasSubsistema: 2,
    topeExoesqueleto: 1,
    topeMovilidadAerea: 1,
    rareza: "Muy Extraño",
    coste: 100000,
    modificadores: [],
    motor: [
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "pregunta 29" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "instalar_subsistema" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "exoesqueleto" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "movilidadAerea" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
    ],
  },
  {
    familia: "armadura",
    id: "armadura_ligera_avanzada",
    label: "Armadura Ligera Avanzada",
    resumen: "La versión prototipo de la armadura ligera: mismo perfil, mejor en todo.",
    descripcion: DESCRIPCION_AVANZADA,
    blindaje: 5,
    bonifMaxAgilidad: 4,
    ranurasSubsistema: 2,
    topeExoesqueleto: 3,
    topeMovilidadAerea: 2,
    rareza: "Muy Extraño",
    coste: 105000,
    modificadores: [],
    motor: [
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "pregunta 29" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "instalar_subsistema" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "exoesqueleto" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "movilidadAerea" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
    ],
  },
  {
    familia: "armadura",
    id: "armadura_intermedia_avanzada",
    label: "Armadura Intermedia Avanzada",
    resumen: "La versión prototipo de la armadura intermedia: mismo perfil, mejor en todo.",
    descripcion: DESCRIPCION_AVANZADA,
    blindaje: 6,
    bonifMaxAgilidad: 3,
    ranurasSubsistema: 2,
    topeExoesqueleto: 4,
    topeMovilidadAerea: 3,
    rareza: "Muy Extraño",
    coste: 120000,
    modificadores: [],
    motor: [
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "pregunta 29" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "instalar_subsistema" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "exoesqueleto" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "movilidadAerea" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
    ],
  },
  {
    familia: "armadura",
    id: "armadura_pesada_avanzada",
    label: "Armadura Pesada Avanzada",
    resumen: "La versión prototipo de la armadura pesada: mismo perfil, mejor en todo.",
    descripcion: DESCRIPCION_AVANZADA,
    blindaje: 8,
    bonifMaxAgilidad: 1,
    ranurasSubsistema: 3,
    topeExoesqueleto: 4,
    topeMovilidadAerea: 4,
    rareza: "Muy Extraño",
    coste: 200000,
    modificadores: [],
    motor: [
      { tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "bloqueado", bloqueoPor: "pregunta 29" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "instalar_subsistema" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "exoesqueleto" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
      { tipo: "habilitador", afecta: { modo: "accion_existente", id: "movilidadAerea" }, mecanismo: "gate_instalacion", arbitraje: "duro", estado: "construido" },
    ],
  },
];

