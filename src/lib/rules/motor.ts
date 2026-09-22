// MotorMetadata: la clasificación de docs/motor.md ("El dato: MotorMetadata",
// 2026-09-23) hecha datos reales en vez de vivir solo en la cabeza de quien
// lee el código. Cada efecto de cada pieza del catálogo declara uno.
//
// Dos ejes deliberadamente separados (ver motor.md, no los mezcles):
//   tipo/afecta/mecanismo/arbitraje → clasificación semántica, no cambia
//     nunca una vez decidida, esté construido o no.
//   estado/bloqueoPor → estado de construcción, sí cambia con el tiempo.
import { z } from "zod";

export const TIPOS_MODIFICADOR = ["accion", "numerico", "texto", "narrativo", "habilitador"] as const;
export type TipoModificador = (typeof TIPOS_MODIFICADOR)[number];

export const MECANISMOS_MOTOR = [
  "eleccion_jugador", // CondicionTirada, el jugador elige al tirar
  "siempre_activo", // Modificador tipo "tirada" con alcance, solo por llevarlo puesto
  "ajuste_fijo", // ajustesFijos
  "bono_tramo", // bonosTramo
  "accion_sin_equipo", // genera su propia acción sin ser una pieza de equipo (poderes, dotes) — mecanismo que aún no existe
  "gate_instalacion", // bloquea/atenúa/avisa sobre una acción entera (tipo 5)
  // Los dos de abajo se añadieron el 2026-09-23 al rellenar MotorMetadata:
  // motor.md solo documentaba "hace falta generalizar" para el tipo 1 no-equipo
  // y el tipo 5, pero dos patrones YA CONSTRUIDOS se quedaron sin etiqueta.
  "accion_equipo", // genera su propia acción SIENDO equipo — función hardcodeada por familia/id en combate.ts / lib/rules/herramientas.ts (tiradaDeArmaFuego, tiradaDeArmaMelee, tiradaDeArmamentoPesado, tiradaDeGranada, tiradasDeHerramientas), sin mecanismo de datos genérico. A diferencia de accion_sin_equipo, este SÍ está construido — es el diseño permanente para equipo, no un hueco a rellenar.
  "nota_fija", // texto siempre presente, sin elección del jugador, leído directo de un campo del catálogo (arma.especial, arma.efectos, granada.areaEfecto, NivelModulo.notaTirada) y concatenado a Tirada.nota — docs/modificadores-tiradas.md lo llama "ad hoc" en su propio diagrama (la tercera caja, "Texto informativo"). Distinto de eleccion_jugador: aquí no hay ningún CondicionTirada de por medio, ni checkbox que activar/desactivar.
] as const;
export type MecanismoMotor = (typeof MECANISMOS_MOTOR)[number];

export const ARBITRAJES = ["duro", "blando", "pendiente"] as const;
export type Arbitraje = (typeof ARBITRAJES)[number];

export const ESTADOS_MOTOR = ["construido", "pendiente", "bloqueado", "ad_hoc"] as const;
export type EstadoMotor = (typeof ESTADOS_MOTOR)[number];

export type Afecta =
  | { modo: "accion_existente"; id: string } // tiradaId/accionId que modifica
  | { modo: "accion_nueva"; id: string } // genera esta acción nueva (tipo "accion")
  | { modo: "objetivo_tercero"; id: string } // toca la tirada de OTRO personaje — casi siempre tipo "texto"
  | { modo: "ninguna" }; // sin conexión, narrativo puro

export type MotorMetadata = {
  tipo: TipoModificador;
  afecta: Afecta;
  mecanismo: MecanismoMotor | null; // null solo si afecta.modo === "ninguna"
  arbitraje?: Arbitraje; // obligatorio si tipo === "habilitador", ver motorMetadataValida()
  estado: EstadoMotor;
  bloqueoPor?: string; // obligatorio si estado === "bloqueado", ver motorMetadataValida()
};

const afectaSchema = z.discriminatedUnion("modo", [
  z.object({ modo: z.literal("accion_existente"), id: z.string().min(1).max(80) }),
  z.object({ modo: z.literal("accion_nueva"), id: z.string().min(1).max(80) }),
  z.object({ modo: z.literal("objetivo_tercero"), id: z.string().min(1).max(80) }),
  z.object({ modo: z.literal("ninguna") }),
]);

export const motorMetadataSchema = z.object({
  tipo: z.enum(TIPOS_MODIFICADOR),
  afecta: afectaSchema,
  mecanismo: z.enum(MECANISMOS_MOTOR).nullable(),
  arbitraje: z.enum(ARBITRAJES).optional(),
  estado: z.enum(ESTADOS_MOTOR),
  bloqueoPor: z.string().min(1).max(200).optional(),
});

// Las dos reglas cruzadas de motor.md ("arbitraje obligatorio si tipo es
// habilitador", "bloqueoPor obligatorio si estado es bloqueado") se quedan
// fuera del schema a propósito (aquí no se usan refinamientos cruzados,
// igual que el resto de schemas del proyecto) y se comprueban aparte, en
// esta función, que consume el test de catalog/motor.test.ts.
export function erroresDeMotorMetadata(m: MotorMetadata): string[] {
  const errores: string[] = [];
  if (m.tipo === "habilitador" && !m.arbitraje) {
    errores.push('tipo "habilitador" exige "arbitraje"');
  }
  if (m.estado === "bloqueado" && !m.bloqueoPor) {
    errores.push('estado "bloqueado" exige "bloqueoPor"');
  }
  if (m.afecta.modo === "ninguna" && m.mecanismo !== null) {
    errores.push('afecta.modo "ninguna" exige "mecanismo: null"');
  }
  if (m.afecta.modo !== "ninguna" && m.mecanismo === null) {
    errores.push('"mecanismo: null" solo vale con afecta.modo "ninguna"');
  }
  return errores;
}
