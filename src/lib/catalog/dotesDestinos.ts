// Tabla de destinos de las dotes (tanda D2a, docs/sistema.md §9.3): a qué tirada real
// de la app va cada `alcance` / `lugar` del borrador (docs/modelado-dotes.json).
// Revisable a mano: el generador (scripts/generar-catalogo-dotes.ts) falla si el
// borrador trae un alcance que no está aquí, y el test (rules/dotesEfectos.test.ts)
// comprueba que cada destino resuelve a una tirada, grupo o habilidad que existe.
//
//   tirada → casillas y bonos van con `alcance` (AlcanceModificador, el mismo del
//            motor); los textos, a las tiradas fijas de `textos`, o, si el alcance es de
//            familia de arma (D2b-1), a las tiradas de esa familia (`textos` vacío). Con
//            alcance "especialidad" (Intimidación), solo en las tiradas que la nombran.
//   ficha  → texto que solo vive en la tarjeta de la dote (no hay tirada a la que colgarlo).
//   especialidadArmaElegida → los ataques con arma de la especialidad elegida al comprar
//            (Crítico Mejorado: crítico fijo, sin casilla; rules/dotesEfectos.ts).
//   accionDote → una acción propia de dote (D2c-1): sus textos van a la nota de la acción y
//            sus bonos a la casilla de opción de la acción (rules/dotesAcciones.ts). Solo
//            sale si la acción sale (la dote que la da está activa).
//   poder  → un poder, psiónico o de dote (D2c-2), por el id de su acción: solo textos, que
//            prepararPoder (rules/usoPoder.ts) pone en la nota o el crítico de la tirada del
//            poder, o en las notas de su ventana si no tira. Casillas y bonos no se saben
//            poner aquí (el poder no pasa por el índice de condiciones): el generador los rechaza.
//   tanda  → el destino aún no existe: el efecto queda pendiente de esa tanda.
import type { AlcanceModificador, FamiliaArma } from "../rules/modificadores";

// "tiradas-fijas" no es una tanda de dotes sino la tarea de docs/tareas.md "Tiradas fijas
// que faltan según habilidades.md": sin esas tiradas no había dónde colgar el efecto. Va la
// última para que gane a la tanda del tipo (un cambio de par sobre una tirada que no
// existe espera a la tirada, no a D2d). 0 pendientes desde 2026-10-23 (Apuntar, Carrera,
// Discernir mentiras y Resistir distracción); se queda en la lista como las demás cerradas.
// "D2c-2" (poderes de dote: Impacto Métrico, Sobrecarga Métrica, y los textos de dote en las
// tiradas de poder) se partió de D2c el 2026-10-15: va detrás de las acciones de dote (D2c).
// Cerrada (0 pendientes) desde D2c-2; se queda en la lista como las demás tandas cerradas.
// "D2d" (casillas que hacen algo más que sumar: ventaja, fracaso → éxito, crítico, otro
// aplicado, daño, bono con umbral y la maniobra Derribo), cerrada también.
export const TANDAS_DOTES = ["D2b-1", "D2b-2", "D2c", "D2c-2", "D2d", "tiradas-fijas"] as const;
export type TandaDote = (typeof TANDAS_DOTES)[number];

// Familias de tirada de arma que solo existen con una dote que las habilite (§9.2,
// arbitraje duro: sin la dote la fila no aparece). combate.ts quita sus filas si ninguna
// dote activa las habilita; el generador solo construye un `habilita` sobre estas.
export const FAMILIAS_SOLO_CON_DOTE: readonly FamiliaArma[] = ["bloquear_melee"];

export type DestinoDote =
  | { tipo: "tirada"; alcance: AlcanceModificador; textos: string[] }
  | { tipo: "ficha" }
  | { tipo: "especialidadArmaElegida" }
  | { tipo: "accionDote" }
  | { tipo: "poder"; id: string }
  | { tipo: "tanda"; tanda: TandaDote; motivo: string };

const tirada = (id: string): DestinoDote => ({ tipo: "tirada", alcance: { tipo: "tiradaId", id }, textos: [id] });
// Sin destinos { tipo: "tanda" } desde que existen las tiradas fijas (2026-10-23); el día que
// vuelva a hacer falta uno: { tipo: "tanda", tanda, motivo }.
// Tiradas generadas por arma de una familia (Accion.familiaArma, combate.ts).
const familia = (f: FamiliaArma): DestinoDote => ({ tipo: "tirada", alcance: { tipo: "familiaArma", familia: f }, textos: [] });

export const DESTINOS_DOTES: Readonly<Record<string, DestinoDote>> = {
  // ── Tiradas fijas (ACCIONES) ──
  defensa: tirada("defensa"),
  atletismo: tirada("atletismo"),
  escalar: tirada("escalar"),
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

  // ── Especialidades ──
  // Intimidación: las tiradas que la nombran (hoy, Convencer / mentir con ella elegida). No
  // Iniciativa (distrayendo), que es Manipulación (usuario, 2026-10-24).
  "especialidad:intimidacion": {
    tipo: "tirada",
    alcance: { tipo: "especialidad", especialidades: ["intimidacion"] },
    textos: ["social"],
  },
  // Tiradas de Exploración propias desde 2026-10-26 (antes, apaño S36 en "Buscar / percibir"):
  // Descartar Teoría a Investigación; Rastreo al Paso y Bioma Predilecto a Rastreo (bonos por
  // opción de «Marcha», SELECTORES_DE_TIRADA); la ventaja de Bioma Predilecto, a Subsistencia.
  "especialidad:investigacion": tirada("investigacion"),
  rastreo: tirada("rastreo"),
  subsistencia: tirada("subsistencia"),

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
  // Ataque de oportunidad (§9.2, solo con la dote): acción de dote desde D2c-1; los textos de
  // Poderoso, Múltiple y Maestro Oportunista van a su nota.
  dotes_ataque_de_oportunidad: { tipo: "accionDote" },

  // ── Acciones propias de dote (D2c-1, rules/dotesAcciones.ts) ──
  // Apoyo y Violencia Aterradora: solo los usa la ventaja con casilla (D2d, dotesAcciones.ts).
  dotes_apoyo: { tipo: "accionDote" },
  dotes_violencia_aterradora: { tipo: "accionDote" },
  // Finta: casilla «Finta repetida» (§9.3), con la opción de Maestro de Fintas.
  dotes_finta: { tipo: "accionDote" },

  // ── Poderes (D2c-2): textos de dote en la ventana o la tirada de un poder ──
  // Impacto Métrico Relámpago → el poder de dote Impacto Métrico (rules/dotesPoderes.ts).
  dotes_impacto_metrico: { tipo: "poder", id: "dotes_impacto_metrico" },
  // Onda Residual → Expansión (Singularidad).
  psi_singularidad_expansion: { tipo: "poder", id: "psi_singularidad_expansion" },

  // ── Tiradas fijas de docs/fuente/habilidades.md (tarea "Tiradas fijas que faltan",
  // docs/tareas.md), en ACCIONES desde 2026-10-23 ──
  // Apuntar (§9.5: Gran Puntería = la acción Apuntar): Gran Puntería y las Puntería Relámpago.
  apuntar: tirada("apuntar"),
  // Velocista.
  carrera: tirada("carrera"),
  // Cazador Cazado: Manipulación en lugar de Empatía.
  detectar_mentiras: tirada("discernir_mentiras"),
  // Vigilancia Táctica: Exploración (Táctica) en lugar de Actitud (Empatía).
  resistir_distraccion: tirada("resistir_distraccion"),
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

// Selectores que ya trae la tirada (no los pone la dote, a diferencia de OPCIONES_DE_TRAMO):
// un bono con `tramo` "<selector>:<opción>" va como bono por opción de ese selector, y con
// condición, además, con su casilla (rules/dotesEfectos.ts). Los ids repiten los de la tirada
// (CONDICION_MARCHA, rules/acciones.ts; un test lo comprueba).
export const SELECTORES_DE_TIRADA: Readonly<Record<string, { etiqueta: string; opciones: readonly string[] }>> = {
  marcha: { etiqueta: "Marcha", opciones: ["normal_mitad", "normal_total", "adversa_tercio", "adversa_mitad", "adversa_total"] },
};

// Excepciones por efecto ("<id de dote>#<índice en el borrador>"): su destino existe,
// pero la decisión del usuario lo deja para otra tanda. Vacía desde D2c-1 (Reflejos Felinos,
// la única, se construyó como descuento en el contador de atacantes).
export const EXCEPCIONES_TANDA: Readonly<Record<string, { tanda: TandaDote; motivo: string }>> = {};
