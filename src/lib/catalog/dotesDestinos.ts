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
//            (Crítico Mejorado: crítico fijo, sin casilla; rules/dotesEfectos.ts). `familias`:
//            qué tiradas de esa arma cuentan como ataque (ni lanzarla ni bloquear con ella).
//   accionDote → una acción propia de dote (D2c-1): sus textos van a la nota de la acción,
//            sus bonos a la casilla de opción de la acción y sus efectos sobre el objetivo (T3c)
//            a «El objetivo» de su resultado (rules/dotesAcciones.ts). Solo sale si la acción
//            sale (la dote que la da está activa).
//   poder  → un poder, psiónico o de dote (D2c-2), por el id de su acción: solo textos, que
//            prepararPoder (rules/usoPoder.ts) pone en la nota o el crítico de la tirada del
//            poder, o en las notas de su ventana si no tira. Casillas y bonos no se saben
//            poner aquí (el poder no pasa por el índice de condiciones): el generador los rechaza.
//   sinDado → una acción fija sin dado (Resistir daño, id interno "bloquear_danio"): solo textos,
//            que van a sus notas (resolverGolpe, rules/resistirDanio.ts). Do-02 del cuestionario.
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
  | { tipo: "especialidadArmaElegida"; familias: readonly FamiliaArma[] }
  | { tipo: "accionDote" }
  | { tipo: "poder"; id: string }
  | { tipo: "sinDado"; id: string }
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
  // propia de imitar.
  // TODO(revisar): desde la foto del 2026-11-14 Imitación pide Mimetismo; ¿el bono va también (o
  // solo) a «Pasar desapercibido» (Mimetismo)? Se queda en Convencer / mentir.
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
  // Olfato de Investigador (sync Drive 2026-11-14): al analizar una pista, en Investigación y en
  // «Interrogar» de Interrogador Perspicaz («puede aplicar su uso en estos interrogatorios»):
  // las tiradas que nombran Investigación.
  analizar_pista: {
    tipo: "tirada",
    alcance: { tipo: "especialidad", especialidades: ["investigacion"] },
    textos: ["investigacion"],
  },
  rastreo: tirada("rastreo"),
  subsistencia: tirada("subsistencia"),

  // ── Habilidades enteras ──
  // Diagnóstico de Sistemas (sync Drive 2026-11-14): no hay tirada propia de diagnóstico, así
  // que la casilla va a toda tirada de Tecnociencia (hoy solo Hackeo: la tirada libre no lleva
  // casillas y Reparar no tira).
  // Aceptado así (usuario, 2026-11-14).
  "habilidad:tecnociencia": { tipo: "tirada", alcance: { tipo: "habilidad", habilidad: "tecnociencia" }, textos: ["tecnica"] },

  // ── Texto que solo vive en la tarjeta de la dote ──
  ficha: { tipo: "ficha" },

  // ── Acciones fijas sin dado ──
  // Resistir daño (do-02, usuario 2026-11-13): el daño de caída entra por ahí como cualquier
  // otro; Saber Caer y Caer Parado dejan su nota.
  bloquear_danio: { tipo: "sinDado", id: "bloquear_danio" },

  // ── Tiradas generadas por arma (D2b-1): por su familia, puesta al crearlas ──
  "familia:ataque_melee": familia("ataque_melee"),
  "familia:ataque_fuego": familia("ataque_fuego"),
  "familia:ataque_pesado": familia("ataque_pesado"),
  "familia:lanzar_melee": familia("lanzar_melee"),
  "familia:lanzar_granada": familia("lanzar_granada"),
  // Acción sin dado: solo textos, a su nota (el generador rechaza casillas aquí).
  "familia:levantar_escudo": familia("levantar_escudo"),
  // Crítico Mejorado: la especialidad de arma elegida al comprar.
  "especialidad:<elegida>": { tipo: "especialidadArmaElegida", familias: ["ataque_melee", "ataque_fuego", "ataque_pesado"] },

  // ── Habilitadas por dote (D2b-2) ──
  // «Bloquear con X» solo existe con la dote Bloqueo (§9.2, FAMILIAS_SOLO_CON_DOTE): su
  // habilitador, su casilla y sus textos van a las tiradas de bloqueo.
  "familia:bloquear_melee": familia("bloquear_melee"),
  // Ataque de oportunidad (§9.2, solo con la dote): acción de dote desde D2c-1; los textos de
  // Poderoso, Múltiple y Maestro Oportunista van a su nota.
  dotes_ataque_de_oportunidad: { tipo: "accionDote" },

  // ── Acciones propias de dote (D2c-1, rules/dotesAcciones.ts) ──
  // Apoyo y Violencia Aterradora: la ventaja con casilla (D2d, dotesAcciones.ts).
  dotes_apoyo: { tipo: "accionDote" },
  // Intimidar en combate (T3c, do-04): lo que le hacen al objetivo, en «El objetivo».
  dotes_violencia_aterradora: { tipo: "accionDote" },
  dotes_grito_de_guerra: { tipo: "accionDote" },
  dotes_mirada_desafiante: { tipo: "accionDote" },
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
// NO existe en la tirada destino: la dote pone su propia casilla de opción. Vacía desde T4
// (do-01, usuario 2026-11-13): «moverse oculto» pasó a ser el selector «¿Te mueves?» de Sigilo
// (SELECTORES_DE_TIRADA, abajo).
export const OPCIONES_DE_TRAMO: Readonly<
  Record<string, { etiqueta: string; ninguna: string; opciones: Readonly<Record<string, string>> }>
> = {};

// Selectores que ya trae la tirada (no los pone la dote, a diferencia de OPCIONES_DE_TRAMO):
// un bono con `tramo` "<selector>:<opción>" va como bono por opción de ese selector, y con
// condición, además, con su casilla (rules/dotesEfectos.ts). Los ids repiten los de la tirada
// (CONDICION_MARCHA, rules/acciones.ts; un test lo comprueba).
export const SELECTORES_DE_TIRADA: Readonly<Record<string, { etiqueta: string; opciones: readonly string[] }>> = {
  marcha: { etiqueta: "Marcha", opciones: ["normal_mitad", "normal_total", "adversa_tercio", "adversa_mitad", "adversa_total"] },
  // «¿Te mueves?» de Sigilo (CONDICION_MOVIMIENTO_OCULTO): las tres Movimiento Sigiloso reducen
  // el penalizador de cada ritmo con un bono por opción, sin casilla (do-01).
  movimiento_oculto: { etiqueta: "¿Te mueves?", opciones: ["quieto", "mitad", "total", "esprint"] },
};

// Excepciones por efecto ("<id de dote>#<índice en el borrador>"): su destino existe,
// pero la decisión del usuario lo deja para otra tanda. Vacía desde D2c-1 (Reflejos Felinos,
// la única, se construyó como descuento en el contador de atacantes).
export const EXCEPCIONES_TANDA: Readonly<Record<string, { tanda: TandaDote; motivo: string }>> = {};
