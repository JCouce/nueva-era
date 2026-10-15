// Tabla de destinos de las dotes (tanda D2a, docs/sistema.md §9.3): a qué tirada real
// de la app va cada `alcance` / `lugar` del borrador (docs/modelado-dotes.json).
// Revisable a mano: el generador (scripts/generar-catalogo-dotes.ts) falla si el
// borrador trae un alcance que no está aquí, y el test (rules/dotesEfectos.test.ts)
// comprueba que cada destino resuelve a una tirada, grupo o habilidad que existe.
//
//   tirada → casillas y bonos van con `alcance` (AlcanceModificador, el mismo del
//            motor); los textos, a las tiradas fijas de `textos`, o, si el alcance es de
//            familia de arma (D2b-1), a las tiradas de esa familia (`textos` vacío). `especialidad`: la tirada solo sabe si vas en especialidad, no
//            en cuál (decisión del usuario, D2a), así que el efecto va como casilla en
//            la habilidad con la especialidad en la etiqueta, y la marca el jugador. Es
//            texto de etiqueta (el nombre del catálogo de especialidades, o el de la
//            acción en Rastreo/Subsistencia); se sustituye cuando la tirada sepa qué
//            especialidad se usa (docs/tareas.md, "La tirada sabe qué especialidad se usa").
//   ficha  → texto que solo vive en la tarjeta de la dote (no hay tirada a la que colgarlo).
//   especialidadArmaElegida → los ataques con arma de la especialidad elegida al comprar
//            (Crítico Mejorado: crítico fijo, sin casilla; rules/dotesEfectos.ts).
//   tanda  → el destino aún no existe: el efecto queda pendiente de esa tanda.
import type { AlcanceModificador, FamiliaArma } from "../rules/modificadores";
import { etiquetaEspecialidad } from "./especialidades";

// "tiradas-fijas" no es una tanda de dotes sino la tarea de docs/tareas.md "Tiradas fijas
// que faltan según habilidades.md": sin esas tiradas no hay dónde colgar el efecto. Va la
// última para que gane a la tanda del tipo (un cambio de par sobre una tirada que no
// existe espera a la tirada, no a D2d).
export const TANDAS_DOTES = ["D2b-1", "D2b-2", "D2c", "D2d", "tiradas-fijas"] as const;
export type TandaDote = (typeof TANDAS_DOTES)[number];

// Familias de tirada de arma que solo existen con una dote que las habilite (§9.2,
// arbitraje duro: sin la dote la fila no aparece). combate.ts quita sus filas si ninguna
// dote activa las habilita; el generador solo construye un `habilita` sobre estas.
export const FAMILIAS_SOLO_CON_DOTE: readonly FamiliaArma[] = ["bloquear_melee"];

export type DestinoDote =
  | { tipo: "tirada"; alcance: AlcanceModificador; textos: string[]; especialidad?: string }
  | { tipo: "ficha" }
  | { tipo: "especialidadArmaElegida" }
  | { tipo: "tanda"; tanda: TandaDote; motivo: string };

const tirada = (id: string, especialidad?: string): DestinoDote => ({
  tipo: "tirada",
  alcance: { tipo: "tiradaId", id },
  textos: [id],
  ...(especialidad && { especialidad }),
});
const tanda = (t: TandaDote, motivo: string): DestinoDote => ({ tipo: "tanda", tanda: t, motivo });
// Tiradas generadas por arma de una familia (Accion.familiaArma, combate.ts).
const familia = (f: FamiliaArma): DestinoDote => ({ tipo: "tirada", alcance: { tipo: "familiaArma", familia: f }, textos: [] });

// Las tiradas de Exploración del grupo Acciones (hoy solo "Buscar / percibir"). Sin
// "Iniciativa (habitual)", que también usa Exploración pero no es rastrear ni investigar.
const exploracionEnAcciones: AlcanceModificador = { tipo: "grupoHabilidad", grupo: "Acciones", habilidad: "exploracion" };

export const DESTINOS_DOTES: Readonly<Record<string, DestinoDote>> = {
  // ── Tiradas fijas (ACCIONES) ──
  defensa: tirada("defensa"),
  atletismo: tirada("atletismo"),
  sigilo: tirada("sigilo"),
  medicina: tirada("medicina"),
  social: tirada("social"),
  salv_fortaleza: tirada("salv_fortaleza"),
  salv_voluntad: tirada("salv_voluntad"),
  // §9.5: "Imitación: casilla «Imitando a alguien» en Convencer / mentir". No hay tirada
  // propia de imitar (Interpretación no tiene contenido en la fuente).
  imitar: tirada("social"),
  "grupo:Defensa": {
    tipo: "tirada",
    alcance: { tipo: "grupo", grupo: "Defensa" },
    // Esquiva; "Bloquear con X" se genera por arma y no admite texto fijo por id.
    textos: ["defensa"],
  },
  "grupo:Iniciativa": {
    tipo: "tirada",
    alcance: { tipo: "grupo", grupo: "Iniciativa" },
    textos: ["iniciativa_arma", "iniciativa_distraccion", "iniciativa"],
  },

  // ── Especialidades: casilla en la habilidad, la especialidad en la etiqueta ──
  // Intimidación (Actitud): "Convencer / mentir" e "Iniciativa (distrayendo)".
  "especialidad:intimidacion": {
    tipo: "tirada",
    alcance: { tipo: "habilidad", habilidad: "actitud" },
    textos: ["social", "iniciativa_distraccion"],
    especialidad: etiquetaEspecialidad("intimidacion"),
  },
  // Apaño (supuesto S36): Investigación, Rastreo y Subsistencia no tienen tirada propia y
  // van a "Buscar / percibir", la única de Exploración en Acciones, con la especialidad
  // en la etiqueta. Se mueven cuando existan sus tiradas (tarea "Tiradas fijas…").
  "especialidad:investigacion": {
    tipo: "tirada",
    alcance: exploracionEnAcciones,
    textos: ["alerta_activa"],
    especialidad: etiquetaEspecialidad("investigacion"),
  },
  rastreo: { tipo: "tirada", alcance: exploracionEnAcciones, textos: ["alerta_activa"], especialidad: "Rastreo" },
  // Hoy solo lo usa una ventaja (D2d), así que no pinta nada todavía.
  subsistencia: { tipo: "tirada", alcance: exploracionEnAcciones, textos: ["alerta_activa"], especialidad: "Subsistencia" },

  // ── Texto que solo vive en la tarjeta de la dote ──
  ficha: { tipo: "ficha" },

  // ── Tiradas generadas por arma (D2b-1): por su familia, puesta al crearlas ──
  "familia:ataque_melee": familia("ataque_melee"),
  "familia:ataque_fuego": familia("ataque_fuego"),
  "familia:ataque_pesado": familia("ataque_pesado"),
  "familia:lanzar_melee": familia("lanzar_melee"),
  "familia:lanzar_granada": familia("lanzar_granada"),
  // Acción sin dado: solo textos, a su nota (el generador rechaza casillas aquí).
  "familia:levantar_escudo": familia("levantar_escudo"),
  // Crítico Mejorado: la especialidad de arma elegida al comprar.
  "especialidad:<elegida>": { tipo: "especialidadArmaElegida" },

  // ── Habilitadas por dote (D2b-2) ──
  // «Bloquear con X» solo existe con la dote Bloqueo (§9.2, FAMILIAS_SOLO_CON_DOTE): su
  // habilitador, su casilla y sus textos van a las tiradas de bloqueo.
  "familia:bloquear_melee": familia("bloquear_melee"),
  // Ataque de oportunidad: la acción de dote no existe todavía (pasa a D2c con Arrollar,
  // decisión del usuario en D2b-2); sus textos esperan a la acción.
  dotes_ataque_de_oportunidad: tanda("D2c", "el ataque de oportunidad es una acción de dote que aún no existe (§9.2)"),

  // ── Acciones propias de dote ──
  dotes_apoyo: tanda("D2c", "acción de dote Apoyo"),
  dotes_violencia_aterradora: tanda("D2c", "acción de dote Violencia Aterradora"),
  dotes_finta: tanda("D2c", "acción de dote Finta"),
  dotes_impacto_metrico: tanda("D2c", "poder de dote Impacto Métrico"),
  // TODO(revisar): la tirada del poder existe (Expansión, Singularidad), pero el poder se
  // monta en prepararPoder, que no recibe los textos de la ficha; se cablea con los
  // poderes de dote.
  psi_singularidad_expansion: tanda("D2c", "los textos de dote no llegan todavía a las tiradas de poder"),

  // ── Tiradas que no existen: definidas en docs/fuente/habilidades.md, pendientes de la
  // tarea "Tiradas fijas que faltan según habilidades.md" (docs/tareas.md) ──
  apuntar: tanda("tiradas-fijas", "no existe la acción Apuntar (§9.5: Gran Puntería)"),
  carrera: tanda("tiradas-fijas", "no existe la tirada de Carrera (Reflejos + Atletismo)"),
  detectar_mentiras: tanda("tiradas-fijas", "no existe la tirada de discernir mentiras (Perspicacia + Empatía)"),
  resistir_distraccion: tanda("tiradas-fijas", "no existe la tirada de resistir una distracción"),
};

// Bonos por opción de otra condición (`tramo` = "<condición>:<opción>") cuya condición
// NO existe en la tirada destino: la dote pone su propia casilla de opción. La Sigilo de
// la app no lleva los penalizadores por moverse oculto (−2/−4/−8, fuente/habilidades.md),
// así que la casilla dice lo que la dote reduce y el penalizador sigue a mano.
// TODO(revisar): si Sigilo gana la opción "moverse oculto", esto pasa a bono por tramo.
export const OPCIONES_DE_TRAMO: Readonly<
  Record<string, { etiqueta: string; ninguna: string; opciones: Readonly<Record<string, string>> }>
> = {
  movimiento_oculto: {
    // dotesEfectos.ts le añade cuánto: "… reduce 2", "… reduce hasta 4".
    etiqueta: "Moviéndome oculto: reduce",
    ninguna: "Sin moverte",
    opciones: { mitad: "A mitad de velocidad", total: "A velocidad total", esprint: "Esprintando" },
  },
};

// Excepciones por efecto ("<id de dote>#<índice en el borrador>"): su destino existe,
// pero la decisión del usuario lo deja para otra tanda.
export const EXCEPCIONES_TANDA: Readonly<Record<string, { tanda: TandaDote; motivo: string }>> = {
  // §9.3: Reflejos Felinos resta uno al contador de atacantes adicionales (UX propia).
  "dote_reflejos_felinos#0": { tanda: "D2c", motivo: "Reflejos Felinos actúa sobre el contador de atacantes, no como casilla" },
};
