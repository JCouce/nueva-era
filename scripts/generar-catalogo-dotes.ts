// Genera src/lib/catalog/dotes.ts a partir del borrador docs/modelado-dotes.json
// (compra y efectos) y de la transcripción literal docs/dotes.md (la prosa).
//
// Uso: npm run gen-dotes
//   (= node --import ./scripts/test-resolver.mjs scripts/generar-catalogo-dotes.ts)
//
// Qué hace, en orden, y por qué falla:
//   1. Lee el borrador y comprueba que cada dote solo trae claves de MODELO_DOTES v2.
//   2. Aplica la normalización v1 → v2 de compra y de efectos (abajo, "Normalización").
//   3. Clasifica cada efecto (MotorMetadata, abajo "Clasificación") contra la tabla de
//      destinos src/lib/catalog/dotesDestinos.ts. Un alcance/lugar que no esté en la
//      tabla, falla.
//   4. Valida cada dote contra doteCatalogoSchema (src/lib/catalog/dotesTipos.ts) y
//      falla con un mensaje por dote/efecto si algo no encaja.
//   5. Comprueba referencias (sustituye, requisito de dote previa), ids y nombres
//      únicos, y que salen exactamente 105.
//   6. Cruce barato contra deriva con docs/dotes.md (abajo, "Cruce"). Si no cuadra,
//      lista las dotes que fallan y NO escribe: una discrepancia real se decide a
//      mano en el borrador, no aquí.
//   7. Escribe el catálogo, con el recuento por tanda al final (también por consola).
//
// Normalización v1 → v2 de compra (solo transformaciones mecánicas):
//   - Biónica es especialidad de Biociencia (docs/tareas.md, "Dotes"): un requisito
//     de especialidad "bionica" con otra habilidad pasa a "biociencia" (se avisa).
//   - Especialidades: todo id de especialidad del borrador (requisitos, resolución de
//     acciones de dote, cambio de par) tiene que ser un id del catálogo
//     (src/lib/catalog/especialidades.ts) y, si trae habilidad, de esa habilidad; si no,
//     falla. Si el borrador usa otro id, se traduce con EQUIVALENCIAS_ESPECIALIDAD (hoy
//     vacía: los 24 ids del borrador ya son los del catálogo).
//   - Elección de lista cerrada: se añade `etiquetas` (id → texto legible) desde la
//     tabla ETIQUETAS_OPCION de aquí abajo, copiada de la prosa de la dote. Si una
//     opción no tiene etiqueta, falla.
//   - `texto`: el bloque "**Efecto:**" de docs/dotes.md (markdown tal cual, con sus
//     *(sic)*), casado por nombre exacto de la dote. Si un nombre no casa, falla.
//   - `subgrupo` ausente se omite. `limite` ausente → null (ninguna dote del borrador
//     trae límite propio fuera de su acción).
//
// Normalización v1 → v2 de efectos (D2a). Cada efecto lleva `borrador` = su índice en
// el borrador, para que el test de recuento case uno a uno aunque se parta o convierta:
//   - `motor` del borrador se DESCARTA: viene del v1 (regenerado desde los claims del
//     modelado, desalineado con `efectos` en 48 dotes). Se regenera aquí ("Clasificación").
//   - Valor `{ base, siAtributoMin: { atributo, min, valor } }` → `{ base, siMin: { tipo:
//     "atributo", id, min, valor } }` (Valor.siMin de v2).
//   - Bono con umbral de ficha (`siMin`): un solo efecto; rules/dotesEfectos.ts resuelve el
//     valor con la ficha al montar la casilla (D2d; hasta D2d se partía en dos, S38).
//   - `condicion` "<condición>:<opción>" (con " + en especialidad" opcional) →
//     `tramo: "<condición>:<opción>"`, `condicion: null` (y `soloEspecialidad: true`).
//     "tramo:larga" es la condición de distancia de los disparos; "movimiento_oculto:*"
//     no existe en la tirada y la pone la dote (OPCIONES_DE_TRAMO, dotesDestinos.ts).
//   - Texto cuya `condicion` es el crítico de la propia tirada (CONDICION_CRITICO) →
//     `grados: ["critico"]`, `condicion: null`.
//   - `porque: "capa_pendiente"` se descarta (§9.3: esos efectos se modelan como efecto
//     real): cada uno se convierte con la tabla CONVERSIONES de abajo. Uno sin
//     conversión, falla.
//   - CONVERSIONES también lleva Salto Evasivo y su Mejorado: el borrador los trae como
//     texto "sin_regla"; desde D2d son una casilla +1/+2 (decisión del usuario: bono normal,
//     aunque convierta un fallo justo en acierto), y la maniobra Derribo (Derribo Mejorado y
//     Brutal, efecto "maniobra").
//
// Normalización de acciones de dote (D2c-1, AJUSTES_ACCION de abajo): retoques a la AccionDote
// del borrador decididos con el usuario o leídos de la prosa (docs/dotes.md); cada uno con su
// porqué al lado. Pueden cambiar campos de la resolución (añadir la especialidad), sustituir
// una nota por índice, añadir notas o poner el grupo extra. Una acción de la tabla que no esté
// en el borrador, falla.
//
// Normalización de poderes de dote (D2c-2, normalizarPoder y AJUSTES_PODER de abajo): de la
// AccionPoder del borrador a la que resuelve poderes.ts; detalle junto al código.
//
// Normalización de efectos sobre tiradas de arma (D2b-1):
//   - Requisito por rama (§9.5: "Asesino, Desenfundado Rápido, Golpe Entorpecedor: cada
//     rama exige su requisito"). El borrador no trae `requisitoAlcance`; se deduce del
//     requisito de compra. Patrón: la dote tiene un requisito uno_de cuyas opciones son
//     exactamente "Combate Melee N" y "Combate a Distancia M" (habilidad). Entonces cada
//     efecto con alcance/lugar de familia de arma recibe `requisitoAlcance` = la opción de
//     su rama (RAMA_DE_FAMILIA: melee → Combate Melee N; disparo y pesado → Combate a
//     Distancia M), y solo sale en las tiradas de la rama que el personaje cumple
//     (rules/dotesEfectos.ts, con los valores de requisito). Una familia sin rama en la
//     tabla (lanzar, levantar escudo) falla: se decide a mano. Encajan hoy: Asesino,
//     Desenfundado Rápido y Golpe Entorpecedor (Crítico Mejorado también tiene el patrón,
//     pero su efecto va a la especialidad elegida, que ya se valida por rama al comprar).
//   - Filtro de arma (FILTROS_ARMA): la prosa limita la dote a armas de un empleo; se
//     añade `filtroArma` a sus efectos de familia de arma.
//
// Clasificación (MotorMetadata de cada efecto; docs/motor.md):
//   - Tanda = la más tardía (D2b-1 < D2b-2 < D2c < D2c-2 < D2d < tiradas-fijas) entre la del destino (tabla de
//     destinos: "tanda") y la del tipo de efecto (TANDA_DEL_TIPO); EXCEPCIONES_TANDA
//     (dotesDestinos.ts) manda sobre las dos. Con tanda → `pendiente`, `bloqueoPor`.
//   - Sin tanda → `construido`: bono con valor numérico o texto, sobre una tirada que
//     existe (casilla, bono fijo, bono por tramo o nota de rules/dotesEfectos.ts; también
//     las tiradas de una familia de arma, D2b-1), texto de la tarjeta (`lugar: "ficha"`,
//     ya visible en la prosa de la dote), o el crítico fijo de la especialidad elegida
//     (Crítico Mejorado). En D2b-2, también el habilitador de una familia de
//     FAMILIAS_SOLO_CON_DOTE (Bloqueo) y el cambio a Reflejos en una familia de arma
//     (Combate Sutil, el estilo Sutil). En D2c-2, los poderes de dote y los textos con destino
//     "poder" (Onda Residual en Expansión). En D2d, las casillas que hacen algo más que sumar
//     (ventaja, fracaso → éxito, margen de crítico, otro aplicado, daño, bono con umbral) y la
//     maniobra Derribo. Falla si algo construido no se sabe aplicar: casilla en «Levantar
//     escudo» (sin dado), filtro de arma fuera de una familia, solo en especialidad sin tramo.
//   - tipo/afecta/mecanismo salen del tipo de efecto (función clasificar()).
//
// Cruce (regla documentada): en docs/dotes.md cada requisito ocupa UNA línea de
// la lista "**Requisitos:**", y un "X o Y" (uno_de) también ocupa una sola. Así que,
// por dote, se compara:
//   - nº de líneas de requisito == nº de requisitos de primer nivel del borrador
//     (un uno_de cuenta 1);
//   - la clase de cada línea ("atributo", "atributo aplicado", "habilidad",
//     "especialidad (Grupo)", "dote previa", "(?) disciplina psiónica", "(?)") contra
//     el tipo del requisito (para un uno_de, el de sus opciones), como multiconjunto;
//     en las de especialidad, también la habilidad del paréntesis;
//   - el coste;
//   - el grupo (## de la transcripción; "Tecnociencia · Psiónica" = tecnociencia + subgrupo psionica).
import { readFileSync, writeFileSync } from "node:fs";
import { doteCatalogoSchema, type DoteCatalogo, type RequisitoDote } from "../src/lib/catalog/dotesTipos";
import {
  DESTINOS_DOTES,
  EXCEPCIONES_TANDA,
  FAMILIAS_SOLO_CON_DOTE,
  OPCIONES_DE_TRAMO,
  TANDAS_DOTES,
  type TandaDote,
} from "../src/lib/catalog/dotesDestinos";
import { HABILIDADES } from "../src/lib/rules/habilidades";
import { APLICADOS } from "../src/lib/rules/atributos";
import { resolverPoder } from "../src/lib/rules/poderes";
import type { AccionPoder } from "../src/lib/rules/psionica";
import { DISCIPLINAS } from "../src/lib/catalog/psionica";
import { especialidadPorId } from "../src/lib/catalog/especialidades";
import { erroresDeMotorMetadata, type MotorMetadata } from "../src/lib/rules/motor";

const RAIZ = new URL("..", import.meta.url);
const BORRADOR = new URL("docs/modelado-dotes.json", RAIZ);
const TRANSCRIPCION = new URL("docs/dotes.md", RAIZ);
const SALIDA = new URL("src/lib/catalog/dotes.ts", RAIZ);
// 105 de la foto del 2026-10-14 + Arquero Poderoso, Pistolero y Pistolero Infernal (foto del
// 2026-10-23, tanda de especialidades de Combate a Distancia).
const TOTAL_ESPERADO = 108;

const CLAVES_V2 = new Set([
  "id",
  "label",
  "grupo",
  "subgrupo",
  "coste",
  "requisitos",
  "eleccion",
  "repetible",
  "sustituye",
  "visible",
  "efectos",
  "limite",
  "candidataUX",
  "motor",
]);

// Texto de la propia dote (docs/dotes.md, Especialidad Médica: "aturdimiento y
// confusión, ceguera y sordera, envenenamiento y enfermedad, hemorragia y herida").
const ETIQUETAS_OPCION: Record<string, string> = {
  aturdimiento_confusion: "Aturdimiento y confusión",
  ceguera_sordera: "Ceguera y sordera",
  envenenamiento_enfermedad: "Envenenamiento y enfermedad",
  hemorragia_herida: "Hemorragia y herida",
};

const errores: string[] = [];
const avisos: string[] = [];
const falla = (id: string, msg: string) => errores.push(`  ${id}: ${msg}`);

// ── 1. Borrador ──────────────────────────────────────────────────────────
const crudo = JSON.parse(readFileSync(BORRADOR, "utf8")) as unknown;
const lista = (crudo as { dotes?: unknown }).dotes;
if (!Array.isArray(lista)) {
  console.error("docs/modelado-dotes.json no trae un array `dotes`");
  process.exit(1);
}

// ── Transcripción: secciones ### por dote ────────────────────────────────
type SeccionMd = { grupo: string; coste: number | null; requisitos: string[]; texto: string };
function leerTranscripcion(md: string): Map<string, SeccionMd> {
  const secciones = new Map<string, SeccionMd>();
  let grupo = "";
  let actual: (SeccionMd & { nombre: string; modo: "" | "req" | "efecto"; efecto: string[] }) | null = null;
  const cerrar = () => {
    if (!actual) return;
    const { nombre, modo: _m, efecto, ...resto } = actual;
    void _m;
    secciones.set(nombre, { ...resto, texto: efecto.join("\n").trim() });
    actual = null;
  };
  for (const linea of md.split("\n")) {
    if (linea.startsWith("## ")) {
      cerrar();
      grupo = linea.slice(3).trim();
      continue;
    }
    if (linea.startsWith("### ")) {
      cerrar();
      actual = { nombre: linea.slice(4).trim(), grupo, coste: null, requisitos: [], texto: "", modo: "", efecto: [] };
      continue;
    }
    if (!actual) continue;
    const coste = linea.match(/^\*\*Coste:\*\*\s*(\d+)/);
    if (coste) {
      actual.coste = Number(coste[1]);
      continue;
    }
    if (linea.startsWith("**Requisitos:**")) {
      actual.modo = "req";
      continue;
    }
    if (linea.startsWith("**Efecto:**")) {
      actual.modo = "efecto";
      continue;
    }
    if (actual.modo === "req" && linea.startsWith("- ")) actual.requisitos.push(linea.slice(2).trim());
    else if (actual.modo === "efecto") actual.efecto.push(linea);
  }
  cerrar();
  return secciones;
}
const md = leerTranscripcion(readFileSync(TRANSCRIPCION, "utf8"));

// ── 2-3. Normalizar y validar ─────────────────────────────────────────────
// Id de especialidad del borrador → id del catálogo, cuando no coinciden. Vacía a día de
// hoy (tanda ESP, 2026-10-15): se añade una fila si el borrador cambia de nombre a una.
const EQUIVALENCIAS_ESPECIALIDAD: Readonly<Record<string, string>> = {};

function normalizarRequisito(id: string, r: unknown): unknown {
  if (!r || typeof r !== "object") return r;
  let req = r as Record<string, unknown>;
  if (req.tipo === "uno_de" && Array.isArray(req.opciones)) {
    return { ...req, opciones: req.opciones.map((o) => normalizarRequisito(id, o)) };
  }
  if (req.tipo === "especialidad" && typeof req.id === "string" && EQUIVALENCIAS_ESPECIALIDAD[req.id]) {
    avisos.push(`  ${id}: especialidad "${req.id}" → "${EQUIVALENCIAS_ESPECIALIDAD[req.id]}"`);
    req = { ...req, id: EQUIVALENCIAS_ESPECIALIDAD[req.id] };
  }
  if (req.tipo === "especialidad" && req.id === "bionica" && req.habilidad !== "biociencia") {
    avisos.push(`  ${id}: Biónica estaba en ${String(req.habilidad)} → biociencia`);
    return { ...req, habilidad: "biociencia" };
  }
  return req;
}

function normalizarEleccion(id: string, e: unknown): unknown {
  if (!e || typeof e !== "object") return e;
  const el = e as Record<string, unknown>;
  if (!Array.isArray(el.opciones) || el.abierta === true) return el;
  const etiquetas: Record<string, string> = {};
  for (const o of el.opciones) {
    const etiqueta = typeof o === "string" ? ETIQUETAS_OPCION[o] : undefined;
    if (etiqueta) etiquetas[o as string] = etiqueta;
    else falla(id, `opción de elección sin etiqueta en ETIQUETAS_OPCION: ${JSON.stringify(o)}`);
  }
  return { ...el, etiquetas };
}

// ── Efectos: normalización ────────────────────────────────────────────────
type Efecto = Record<string, unknown> & { tipo?: unknown; borrador: number };

// Condiciones de texto que son el crítico de la propia tirada del lugar.
const CONDICION_CRITICO = new Set(["critico", "Éxito crítico en la esquiva"]);
// Y el crítico natural (sin la conversión éxito → crítico): Gran Puntería en Apuntar.
const CONDICION_CRITICO_NATURAL = new Set(["critico natural"]);

// Efectos que el borrador trae como texto y §9.3 manda modelar como efecto real
// ("<id de dote>#<índice en el borrador>" → efecto v2, sin `borrador`).
// Un array parte el efecto en varios (mismo `borrador`), p.ej. un texto en dos destinos.
const CONVERSIONES: Record<string, Record<string, unknown> | Record<string, unknown>[]> = {
  // Velocista: "al correr como acción estándar o compleja" es toda tirada de Carrera (la fila
  // ya es eso), así que el éxito → crítico va sin casilla, como su fracaso → éxito (decisión
  // del usuario, tiradas fijas 2026-10-23).
  "dote_velocista#1": { tipo: "margen_critico", alcance: "carrera", valor: 0, condicion: null },
  // Imitación +2, +3 con Interpretación ≥ 3 (valor por umbral de ficha, D2d): una sola casilla
  // con el valor que toque (S38 resuelto). El texto capa_pendiente del umbral pasa a la tarjeta.
  "dote_imitacion#0": {
    tipo: "bono",
    alcance: "imitar",
    valor: { base: 2, siMin: { tipo: "habilidad", id: "interpretacion", min: 3, valor: 3 } },
    condicion: "Imitando a otra persona",
  },
  "dote_imitacion#1": {
    tipo: "texto",
    lugar: "ficha",
    texto: "Con Interpretación 3 o más el bono es +3: la casilla «Imitando a otra persona» ya lo pone.",
    condicion: null,
    porque: "sin_regla",
  },
  // Maniobra Derribo (habilidades.md, Combate Melee) solo con dote de derribo (decisión del
  // usuario, D2d): Derribo Mejorado pone la casilla «Derribo» (−2, daño básico) además de su texto.
  "dote_derribo_mejorado#0": [
    { tipo: "maniobra", maniobra: "derribo", alcance: "familia:ataque_melee" },
    {
      tipo: "texto",
      lugar: "familia:ataque_melee",
      texto: "Derribo con éxito: el objetivo pierde 1 punto de fatiga.",
      condicion: "Derribo",
      porque: "tercero",
    },
  ],
  // Derribo Brutal: "el aumento de dificultad para derribo causando daño se anula" → la casilla
  // «Derribo» sin −2 (antes, una casilla +2 que lo compensaba).
  "dote_derribo_brutal#0": { tipo: "maniobra", maniobra: "derribo", alcance: "familia:ataque_melee", sinPenalizador: true },
  // capa_pendiente: Derribo con acción estándar sin el tope de daño básico.
  "dote_derribo_brutal#1": { tipo: "danio_por_exitos", alcance: "familia:ataque_melee", condicion: "Derribo con acción estándar" },
  // capa_pendiente: golpe con escudo letal en vez de no letal (§9.3, va con las casillas del daño).
  // Solo con armas de la especialidad Escudos (FILTROS_ARMA).
  "dote_golpe_mejorado_con_escudo#0": {
    tipo: "categoria_danio",
    alcance: "familia:ataque_melee",
    a: "letal",
    condicion: "Golpe letal",
  },
  // capa_pendiente: −1 al daño del golpe fatigante (§9.5: siempre −1, mínimo 0; puñetazo y
  // patada son contundentes), solo con daño contundente o arma a dos manos.
  "dote_golpe_fatigante#0": {
    tipo: "bono",
    alcance: "familia:ataque_melee",
    valor: -1,
    condicion: "Golpe fatigante",
    sobre: "danio",
    filtroArma: { tipoDanio: ["contundente"], empleo: "dos manos" },
  },
  // Salto Evasivo: casilla «Esquivando un área» +1 (Mejorado +2, que sustituye a la básica: vale
  // la mejor). Decisión del usuario (D2d): bono normal, aunque convierta un fallo justo en
  // acierto (antes, §9.3: éxito extra que no convertía). El borrador lo traía como texto sin_regla.
  "dote_salto_evasivo#0": { tipo: "bono", alcance: "defensa", valor: 1, condicion: "Esquivando un área" },
  "dote_salto_evasivo_mejorado#0": { tipo: "bono", alcance: "defensa", valor: 2, condicion: "Esquivando un área" },
  // Bloqueo: "desarmado frente a atacante armado" (−3) y su excepción solo al bloquear
  // desarmado (Pelea), no con un arma (revisión de D2b-2, 2026-10-15).
  "dote_bloqueo#7": {
    tipo: "bono",
    alcance: "familia:bloquear_melee",
    valor: -3,
    condicion: "Desarmado frente a atacante armado",
    filtroArma: { desarmado: true },
  },
  "dote_bloqueo#8": {
    tipo: "texto",
    lugar: "familia:bloquear_melee",
    texto: "Si tu ataque natural o desarmado hace daño letal no cuentas como desarmado: no marques la casilla.",
    condicion: "Desarmado frente a atacante armado",
    porque: "tercero",
    filtroArma: { desarmado: true },
  },
  // §9.3 "Combinación → casilla −1 en el ataque, −1 a defensas como texto" (el borrador lo
  // traía como casilla). En Esquiva ya (tirada fija); en Bloquear, con su tanda (la
  // tirada la genera el arma).
  "dote_combinacion#2": [
    {
      tipo: "texto",
      lugar: "grupo:Defensa",
      texto: "Si este turno has usado Combinación: −1 a tus acciones defensivas hasta el comienzo de tu siguiente turno.",
      condicion: null,
      porque: "turno",
    },
    {
      tipo: "texto",
      lugar: "familia:bloquear_melee",
      texto: "Si este turno has usado Combinación: −1 a tus acciones defensivas hasta el comienzo de tu siguiente turno.",
      condicion: null,
      porque: "turno",
    },
  ],
  // TODO(revisar): S52, el texto sale aunque la ficha no tenga Combate Sutil (no es requisito
  // de la dote); es texto y no se oculta.
  "dote_combinacion_rapida#1": [
    {
      tipo: "texto",
      lugar: "grupo:Defensa",
      texto: "Combinación en modo sutil: sin el −1 a tus acciones defensivas.",
      condicion: null,
      porque: "turno",
    },
    {
      tipo: "texto",
      lugar: "familia:bloquear_melee",
      texto: "Combinación en modo sutil: sin el −1 a tus acciones defensivas.",
      condicion: null,
      porque: "turno",
    },
  ],
  // §9.3 UX propia: Reflejos Felinos resta un atacante al contador de atacantes adicionales de
  // la esquiva (mínimo 0), no una casilla +1 (el borrador lo traía como bono con condición).
  "dote_reflejos_felinos#0": { tipo: "descuento_contador", alcance: "defensa", contador: "atacantes_adicionales", unidades: 1 },
  // "Se mueve en sigilo sin penalizador": la Sigilo de la app no lleva el penalizador por
  // moverse oculto, así que no hay número que compensar (el borrador inventaba +2/+4/+8).
  // Texto en Sigilo; las otras dos velocidades, en la tarjeta.
  "dote_movimiento_sigiloso_constante#0": {
    tipo: "texto",
    lugar: "sigilo",
    texto: "Moviéndote oculto no tienes penalizador, vayas a la velocidad que vayas: no lo restes.",
    condicion: null,
    porque: "sin_regla",
  },
  "dote_movimiento_sigiloso_constante#1": {
    tipo: "texto",
    lugar: "ficha",
    texto: "A velocidad total, sin penalizador por moverte oculto.",
    condicion: null,
    porque: "sin_regla",
  },
  "dote_movimiento_sigiloso_constante#2": {
    tipo: "texto",
    lugar: "ficha",
    texto: "Esprintando, sin penalizador por moverte oculto.",
    condicion: null,
    porque: "sin_regla",
  },
};

// Retoques a las acciones de dote del borrador (D2c-1; ver cabecera). Por id de acción.
type AjusteAccion = {
  resolucion?: Record<string, unknown>;
  notas?: Record<number, { texto: string; condicion: string | null }>;
  notasExtra?: { texto: string; condicion: string | null }[];
  grupoExtra?: "Defensa" | "Salvaciones" | "Iniciativa" | "Acciones";
};
const AJUSTES_ACCION: Readonly<Record<string, AjusteAccion>> = {
  // Prosa: "expresión + empatía o liderazgo". El borrador no traía la especialidad en la
  // resolución (decisión del usuario, D2c-1): va en especialidad con cualquiera de las dos.
  // La ventaja por vínculo fuerte es una casilla de la acción (D2d, dotesAcciones.ts).
  dotes_apoyo: {
    resolucion: { especialidad: ["empatia", "liderazgo"] },
    notas: { 1: { texto: "Con Empatía o Liderazgo: va en especialidad con cualquiera de las dos.", condicion: null } },
  },
  // Violencia Aterradora: la ventaja tras un crítico también es casilla (D2d), sin ajuste.
  // Prosa: "tirada de ataque con el atributo de potencia", sin habilidad. Decisión del usuario
  // (D2c-1, supuesto S53): Combate Melee, en especialidad Pelea (el requisito de la dote).
  dotes_arrollar: { resolucion: { especialidad: "pelea" } },
  // §9.3: "pudiendo usarse como tirada de iniciativa" → también en Iniciativa.
  dotes_traicionero: { grupoExtra: "Iniciativa" },
  // §9.3: el −1 a defensas es texto (ya está en Esquiva y en Bloquear), no una casilla: la
  // nota del borrador mandaba marcar «Combinación este turno», que no existe.
  dotes_combinacion: {
    notas: {
      2: { texto: "Hasta el comienzo de tu siguiente turno, −1 en acciones defensivas (lo recuerda la nota de Esquiva y de Bloquear).", condicion: null },
    },
  },
};
// TODO(revisar): Agarre Rápido y Mirada Desafiante (pregunta a Murillo, tareas.md; Zafarse
// confirmado por el usuario: regla de Atrapado). Las tres: la prosa da la economía pero no
// la tirada; el borrador supone Reflejos + Atletismo (Escalada), Potencia + Atletismo
// (Escapismo; docs/fuente/sistema.md, Atrapado) y Expresión + Actitud (Intimidación), con la
// dificultad a criterio del máster. Se dejan así (no es un error evidente) hasta que Murillo
// lo aclare.
const ajustesUsados = new Set<string>();

function ajustarAccion(id: string, e: Efecto): Efecto {
  if (e.tipo !== "accion") return e;
  const accion = e.accion as Record<string, unknown> & { id: string; resolucion: Record<string, unknown>; notas: unknown[] };
  const ajuste = AJUSTES_ACCION[accion.id];
  if (!ajuste) return e;
  ajustesUsados.add(accion.id);
  const notas = [...accion.notas];
  for (const [i, nota] of Object.entries(ajuste.notas ?? {})) {
    if (notas[Number(i)] === undefined) falla(id, `AJUSTES_ACCION ${accion.id}: no hay nota ${i}`);
    notas[Number(i)] = nota;
  }
  notas.push(...(ajuste.notasExtra ?? []));
  avisos.push(`  ${id}: acción ${accion.id} ajustada (${Object.keys(ajuste).join(", ")})`);
  return {
    ...e,
    accion: {
      ...accion,
      resolucion: { ...accion.resolucion, ...ajuste.resolucion },
      notas,
      ...(ajuste.grupoExtra && { grupoExtra: ajuste.grupoExtra }),
    },
  };
}

// Normalización de los poderes de dote (D2c-2): el borrador trae una AccionPoder del modelo de
// psiónica con extensiones que poderes.ts no conoce. Se traducen, en este orden:
//   - Economía con varias opciones (["simple", "reaccion"]) → la primera, y la lista en una nota.
//   - Eje de nivel empleado con `opciones` en texto ("n1..n6 hasta el nivel de X") → n1..n6,
//     cada una desde su nivel poseído (como ejeNivelEmpleado en catalog/psionica.ts).
//   - `resolucion.danioExtra` → un dato del poder ("Daño extra (letal)"), por nivel empleado.
//   - `danioExtraVector` de una opción (Impacto Métrico descendente) → un dato más en esa
//     opción ("Daño por compresión"), con Valor.porCadaNiveles; §9.5: letal y se suma.
//   - `resolucion.sobreArma` (poder sobre el ataque de un arma) → sin dado: §9.3 lo deja como
//     texto ("la app cobra la fatiga y enseña el daño extra"). La tirada de ataque y lo que pasa
//     si impacta o falla van a las notas; el jugador tira el ataque aparte, en Ataques.
//   - Categoría de daño "no_letal" → "no letal" (la que usan los avisos de daño propio).
//   - `manual` → notas de la ventana (CabeceraPoder no pinta `manual`).
//   - `motor`: una acción construida (la tanda la decide el efecto de la dote, no la acción).
// Y los retoques por poder de AJUSTES_PODER, cada uno con su porqué. Después se resuelve el
// poder con poderes.ts en todos los niveles y opciones: si algo revienta, falla.
const NIVELES_PODER = [1, 2, 3, 4, 5, 6] as const;
const AJUSTES_PODER: Readonly<Record<string, (a: Record<string, unknown>) => void>> = {
  // TODO(revisar): el borrador pone `desplazamiento: null` en el vector descendente, pero la
  // tirada del objetivo que vuela usa {desplazamiento} ("si lo supera con éxito se desplaza 4 m ×
  // nivel empleado", prosa del vector descendente) y reventaba al rellenar. Se deja el
  // desplazamiento y la nota del vector dice que sobre firme no se desplaza.
  dotes_impacto_metrico: (a) => {
    const vector = (a.ejes as { id: string; opciones: { id: string; cambia: Record<string, unknown> }[] }[]).find((e) => e.id === "vector");
    const desc = vector?.opciones.find((o) => o.id === "descendente");
    if (!desc || !("desplazamiento" in desc.cambia)) throw new Error("sin vector descendente con desplazamiento");
    delete desc.cambia.desplazamiento;
    desc.cambia.notas = [
      ...((desc.cambia.notas as unknown[]) ?? []),
      { texto: "Descendente: los metros de las tiradas del objetivo solo cuentan si estaba volando.", lugar: "tirada" },
    ];
  },
};
const ajustesPoderUsados = new Set<string>();

const ETIQUETA_ECONOMIA_PODER: Record<string, string> = {
  gratuita: "acción gratuita",
  simple: "acción simple",
  estandar: "acción estándar",
  compleja: "acción compleja",
  reaccion: "reacción",
};
const nombreAplicado = (id: unknown) => APLICADOS.find((x) => x.id === id)?.label ?? String(id);
const nombreHabilidad = (id: unknown) => HABILIDADES.find((x) => x.id === id)?.label ?? String(id);

function normalizarPoder(id: string, e: Efecto): Efecto {
  if (e.tipo !== "poder") return e;
  const a = structuredClone(e.accion) as Record<string, unknown> & { id: string };
  const notas = [...((a.notas as { texto: string; lugar: string }[]) ?? [])];
  const datos = [...((a.datos as { etiqueta: string; valor: unknown }[]) ?? [])];

  if (Array.isArray(a.economia)) {
    const lista = a.economia as string[];
    notas.push({ texto: `Se usa como ${lista.map((x) => ETIQUETA_ECONOMIA_PODER[x] ?? x).join(" o ")}.`, lugar: "tirada" });
    a.economia = lista[0];
  }

  const ejes = (a.ejes as Record<string, unknown>[]) ?? [];
  for (const eje of ejes) {
    if (eje.tipo === "nivel_empleado" && typeof eje.opciones === "string") {
      if (!/^n1\.\.n6\b/.test(eje.opciones)) falla(id, `poder ${a.id}: eje de nivel "${eje.opciones}" que no sé expandir`);
      eje.opciones = NIVELES_PODER.map((n) => ({ id: `n${n}`, label: `Nivel ${n}`, desdeNivel: n, cambia: {} }));
    }
  }

  const res = a.resolucion as Record<string, unknown>;
  const extra = res.danioExtra as { valor: unknown; categoria: string } | undefined;
  if (extra) {
    datos.push({ etiqueta: `Daño extra (${extra.categoria})`, valor: extra.valor });
    delete res.danioExtra;
  }
  for (const eje of ejes) {
    for (const o of (Array.isArray(eje.opciones) ? eje.opciones : []) as Record<string, unknown>[]) {
      const v = o.danioExtraVector as { porCadaNiveles: number; minimo: number } | undefined;
      if (!v) continue;
      const cambia = (o.cambia ?? {}) as Record<string, unknown>;
      // `cambia` sustituye los datos: van los de la acción más el suyo.
      cambia.datos = [
        ...datos,
        { etiqueta: "Daño por compresión (letal, se suma)", valor: { base: 0, porCadaNiveles: { cada: v.porCadaNiveles, minimo: v.minimo } } },
      ];
      o.cambia = cambia;
      delete o.danioExtraVector;
    }
  }

  if (res.sobreArma !== undefined) {
    const especialidad = res.especialidad ? ` (${String(res.especialidad)})` : "";
    notas.unshift({
      texto: `Va sobre un ataque cuerpo a cuerpo: tira el ataque aparte, en Ataques, con el arma o el golpe de Pelea (${nombreAplicado(res.aplicado)} + ${nombreHabilidad(res.habilidad)}${especialidad}). Aquí solo se cobra la fatiga, que se paga aunque falle.`,
      lugar: "tirada",
    });
    const resultados = (a.resultados ?? {}) as Record<string, { texto: string }>;
    // Ya empiezan por "Impacta" / "No impacta".
    for (const g of ["exito", "fracaso"]) if (resultados[g]) notas.push({ texto: `${resultados[g].texto}.`, lugar: "tirada" });
    a.resolucion = { tipo: "sin_dado" };
  }

  const categoria = (d: Record<string, unknown> | null | undefined) => {
    if (d && d.categoria === "no_letal") d.categoria = "no letal";
  };
  for (const r of Object.values((a.resultados ?? {}) as Record<string, Record<string, unknown>>)) categoria(r.danio as Record<string, unknown>);
  categoria(a.danioPropio as Record<string, unknown> | null);

  for (const m of (a.manual as string[]) ?? []) notas.push({ texto: m, lugar: "tirada" });
  a.manual = [];
  a.notas = notas;
  a.datos = datos;
  a.motor = [{ tipo: "accion", afecta: { modo: "accion_nueva", id: a.id }, mecanismo: "accion_sin_equipo", estado: "construido" }];

  const ajuste = AJUSTES_PODER[a.id];
  if (ajuste) {
    try {
      ajuste(a);
      ajustesPoderUsados.add(a.id);
      avisos.push(`  ${id}: poder ${a.id} ajustado (AJUSTES_PODER)`);
    } catch (err) {
      falla(id, `AJUSTES_PODER ${a.id}: ${(err as Error).message}`);
    }
  }
  validarPoder(id, a as unknown as AccionPoder);
  return { ...e, accion: a };
}

// Resuelve el poder en cada nivel poseído, con cada nivel empleado y cada opción de los demás
// ejes, como lo haría la ventana del poder: lo que reviente aquí reventaría en la ficha.
function validarPoder(id: string, accion: AccionPoder) {
  const disciplina = DISCIPLINAS.find((d) => d.id === (accion as { disciplinaNivel?: string }).disciplinaNivel);
  if (!disciplina) {
    falla(id, `poder ${accion.id}: disciplinaNivel desconocida`);
    return;
  }
  for (const nivelPoseido of NIVELES_PODER) {
    const combinaciones: Record<string, string>[] = [{}];
    for (const eje of accion.ejes) {
      if (!Array.isArray(eje.opciones)) {
        falla(id, `poder ${accion.id}: eje ${eje.id} sin opciones`);
        return;
      }
      const copia = [...combinaciones];
      combinaciones.length = 0;
      for (const c of copia) for (const o of eje.opciones) combinaciones.push({ ...c, [eje.id]: o.id });
    }
    for (const elecciones of combinaciones) {
      try {
        const r = resolverPoder(accion, { nivelPoseido, elecciones, disciplina });
        if (r && typeof r.fatiga !== "number") falla(id, `poder ${accion.id}: fatiga no numérica`);
      } catch (err) {
        falla(id, `poder ${accion.id} (nivel ${nivelPoseido}, ${JSON.stringify(elecciones)}): ${(err as Error).message}`);
        return;
      }
    }
  }
}

// Requisito por rama: qué habilidad de "Combate Melee N o Combate a Distancia M" exige cada
// familia de arma (ver cabecera). Lanzar y Levantar escudo no están: si una dote del patrón
// los toca, el generador falla y se decide a mano.
const RAMA_DE_FAMILIA: Readonly<Record<string, "combate_melee" | "combate_distancia">> = {
  "familia:ataque_melee": "combate_melee",
  "familia:bloquear_melee": "combate_melee",
  "familia:ataque_fuego": "combate_distancia",
  "familia:ataque_pesado": "combate_distancia",
};

// Filtro de arma por dote, de su prosa (docs/dotes.md):
//   Desenfundado Rápido: "La dote sirve para armas que se puedan utilizar a una mano".
//   Apresar y Apuñalar: "llevando un arma de una sola mano se gana una reacción para
//     atacar con esta" (el texto solo tiene sentido en armas a una mano).
//   Golpe Fatigante (D2d): "un ataque que provoque daño contundente o con un arma a dos manos"
//     (empleo y tipo de daño: vale cualquiera de los dos), también para su texto.
//   Golpe Mejorado con Escudo (D2d): "al golpear con el escudo" → especialidad Escudos.
//   Pistolero y Pistolero Infernal: "una pistola en cada mano" → especialidad Pistolas y a una
//     mano (deja fuera el disparo del Proyector de Pulso, que va en Pistolas pero no se empuña).
//   Arquero Poderoso: "un ataque con arco" → especialidad Armas Impulsoras.
type FiltroArmaDote = { empleo?: "una mano" | "dos manos"; tipoDanio?: "contundente"[]; especialidad?: string };
const FILTROS_ARMA: Readonly<Record<string, FiltroArmaDote>> = {
  dote_desenfundado_rapido: { empleo: "una mano" },
  dote_apresar_y_apunalar: { empleo: "una mano" },
  dote_golpe_fatigante: { tipoDanio: ["contundente"], empleo: "dos manos" },
  dote_golpe_mejorado_con_escudo: { especialidad: "escudos" },
  // TODO(revisar): "cada ataque aumenta su dificultad en 1" se lee como la casilla −1 de
  // Pistolero (como el −2 "por dificultad" de Disparo a la Carrera). Pistolero Infernal no dice
  // si ese +1 sigue, ni si cada ráfaga gasta su cargador: solo texto.
  dote_pistolero: { especialidad: "pistolas", empleo: "una mano" },
  dote_pistolero_infernal: { especialidad: "pistolas", empleo: "una mano" },
  // TODO(revisar): "sumando su total de puntuación de fuerza" — ¿el daño del Arco pasa de
  // 1/2 Fue + 8 a Fue + 8, o la Fuerza se suma a la tirada de ataque? ¿Vale la Ballesta ("con
  // arco")? Hasta que Murillo lo aclare, texto con la prosa en todas las Armas Impulsoras; ni
  // la fatiga ni el daño se calculan.
  dote_arquero_poderoso: { especialidad: "armas_impulsoras" },
};

const claveDeEfecto = (e: Efecto) =>
  (e.tipo === "texto" ? e.lugar : e.tipo === "habilita" ? e.accion : e.tipo === "accion" ? undefined : e.alcance) as string | undefined;

function aplicarRamaYFiltro(id: string, requisitos: unknown, efectos: Efecto[]): Efecto[] {
  const reqs = Array.isArray(requisitos) ? (requisitos as RequisitoDote[]) : [];
  const rama = reqs.find(
    (r): r is Extract<RequisitoDote, { tipo: "uno_de" }> =>
      r.tipo === "uno_de" &&
      r.opciones.length === 2 &&
      r.opciones.every((o) => o.tipo === "habilidad") &&
      ["combate_melee", "combate_distancia"].every((h) => r.opciones.some((o) => o.tipo === "habilidad" && o.id === h)),
  );
  const filtro = FILTROS_ARMA[id];
  if (!rama && !filtro) return efectos;
  let conRama = 0;
  const salida = efectos.map((e) => {
    const clave = claveDeEfecto(e);
    if (!esFamilia(clave)) return e;
    let nuevo: Efecto = filtro ? { ...e, filtroArma: { ...(e.filtroArma as object | undefined), ...filtro } } : e;
    if (rama && e.requisitoAlcance === undefined) {
      const habilidad = RAMA_DE_FAMILIA[clave!];
      const opcion = rama.opciones.find((o) => o.tipo === "habilidad" && o.id === habilidad);
      if (!opcion) {
        falla(id, `efecto ${e.borrador}: requisito por rama sin rama para "${clave}" (RAMA_DE_FAMILIA)`);
        return e;
      }
      nuevo = { ...nuevo, requisitoAlcance: opcion };
      conRama++;
    }
    return nuevo;
  });
  if (conRama) avisos.push(`  ${id}: requisito por rama en ${conRama} efectos`);
  if (filtro) avisos.push(`  ${id}: filtro de arma ${JSON.stringify(filtro)}`);
  return salida;
}

function normalizarEfectos(id: string, efectos: unknown): Efecto[] {
  if (!Array.isArray(efectos)) {
    falla(id, "`efectos` no es un array");
    return [];
  }
  const salida: Efecto[] = [];
  efectos.forEach((crudo, borrador) => {
    if (!crudo || typeof crudo !== "object") {
      falla(id, `efecto ${borrador}: no es un objeto`);
      return;
    }
    const conversion = CONVERSIONES[`${id}#${borrador}`];
    if (conversion) {
      for (const c of [conversion].flat()) salida.push({ ...c, borrador });
      return;
    }
    const e: Efecto = normalizarPoder(id, ajustarAccion(id, { ...(crudo as Record<string, unknown>), borrador }));
    if (e.tipo === "texto" && e.porque === "capa_pendiente") {
      falla(id, `efecto ${borrador}: texto "capa_pendiente" sin conversión en CONVERSIONES`);
      return;
    }
    if (e.tipo === "texto" && typeof e.condicion === "string" && CONDICION_CRITICO.has(e.condicion)) {
      e.grados = ["critico"];
      e.condicion = null;
    }
    if (e.tipo === "texto" && typeof e.condicion === "string" && CONDICION_CRITICO_NATURAL.has(e.condicion)) {
      e.grados = ["critico"];
      e.criticoNatural = true;
      e.condicion = null;
    }
    if (e.tipo === "bono" && typeof e.condicion === "string") {
      const m = e.condicion.match(/^([a-z_]+):([a-z_]+)( \+ en especialidad)?$/);
      if (m) {
        e.tramo = `${m[1]}:${m[2]}`;
        e.condicion = null;
        if (m[3]) e.soloEspecialidad = true;
      }
    }
    const v = e.valor as Record<string, unknown> | undefined;
    if (e.tipo === "bono" && v && typeof v === "object" && "siAtributoMin" in v) {
      const s = v.siAtributoMin as { atributo: string; min: number; valor: number };
      e.valor = { base: v.base, siMin: { tipo: "atributo", id: s.atributo, min: s.min, valor: s.valor } };
    }
    salida.push(e);
  });
  return salida;
}

// ── Efectos: clasificación ────────────────────────────────────────────────
const ordenTanda = (t: TandaDote | null) => (t === null ? -1 : TANDAS_DOTES.indexOf(t));
const masTardia = (a: TandaDote | null, b: TandaDote | null) => (ordenTanda(a) >= ordenTanda(b) ? a : b);
const esFamilia = (a: unknown) => typeof a === "string" && a.startsWith("familia:");

// La tanda que pide el propio tipo de efecto, aunque su destino exista (§9.3 y encargo D2a).
function tandaDelTipo(e: Efecto): TandaDote | null {
  switch (e.tipo) {
    case "accion":
      // Acciones de dote (D2c-1), también Arrollar y Ataque de oportunidad (§9.2: solo con su
      // dote): rules/dotesAcciones.ts.
      return null;
    case "descuento_contador":
      // Reflejos Felinos (D2c-1): descuento en el contador de atacantes de la esquiva.
      return null;
    case "poder":
      // Poderes de dote (D2c-2): rules/dotesPoderes.ts. Impacto Métrico va sin dado (§9.3: el
      // ataque del arma se tira aparte y la app solo cobra la fatiga y enseña el daño extra).
      return null;
    case "habilita":
      // Bloqueo (D2b-2): se construye si su familia está en FAMILIAS_SOLO_CON_DOTE (abajo).
      return null;
    case "cambia_par":
    case "margen_critico":
    case "sube_grado":
    case "ventaja":
    case "exito_extra":
    case "danio_por_exitos":
    case "categoria_danio":
    case "maniobra":
      // D2d (cerrada): Combate Sutil desde D2b-2, Crítico Mejorado desde D2b-1; el resto, casillas
      // de D2d. Un cambio de par sobre una tirada que no existe espera a "tiradas-fijas" (destino).
      return null;
    case "economia":
      // TODO(revisar): ningún efecto del borrador lo usa hoy; coste en acciones = texto
      // hasta el registro de acciones (§9.3). Se supone con las acciones de dote.
      return "D2c";
    case "bono":
      // Daño (Golpe Fatigante) y valor por umbral de ficha: D2d, construidos.
      return null;
    default:
      return null;
  }
}

function clasificar(id: string, e: Efecto): MotorMetadata | null {
  const clave = claveDeEfecto(e);
  const destino = clave === undefined ? undefined : DESTINOS_DOTES[clave];
  if (clave !== undefined && !destino) {
    falla(id, `efecto ${e.borrador} (${String(e.tipo)}): alcance/lugar "${clave}" sin entrada en DESTINOS_DOTES (dotesDestinos.ts)`);
    return null;
  }
  const excepcion = EXCEPCIONES_TANDA[`${id}#${e.borrador}`];
  const tanda = excepcion?.tanda ?? masTardia(destino?.tipo === "tanda" ? destino.tanda : null, tandaDelTipo(e));
  const estado = tanda ? { estado: "pendiente" as const, bloqueoPor: tanda } : { estado: "construido" as const };

  if (!tanda) {
    // Lo que se sabe construir: bonos numéricos y textos sobre una tirada que existe,
    // textos de tarjeta, el crítico de la especialidad elegida (D2b-1), y en D2b-2 el
    // habilitador de una familia que solo existe con dote (Bloqueo) y el estilo Sutil
    // (cambio a Reflejos en una familia de arma, Combate Sutil).
    const alcanceDestino = destino?.tipo === "tirada" ? destino.alcance : null;
    const familiaDestino = alcanceDestino?.tipo === "familiaArma" ? alcanceDestino.familia : null;
    const construible =
      e.tipo === "accion" ||
      e.tipo === "poder" ||
      // Sobre un poder (D2c-2): solo textos, a la nota/crítico de su tirada o a su ventana.
      (e.tipo === "texto" && destino?.tipo === "poder") ||
      (e.tipo === "bono" && destino?.tipo === "tirada") ||
      // Sobre una acción de dote (D2c-1): bono con casilla (Finta repetida) y textos a su nota.
      (e.tipo === "bono" && destino?.tipo === "accionDote" && typeof e.valor === "number" && typeof e.condicion === "string") ||
      (e.tipo === "texto" && destino?.tipo === "accionDote" && !e.grados) ||
      (e.tipo === "descuento_contador" && alcanceDestino?.tipo === "tiradaId") ||
      (e.tipo === "texto" && (destino?.tipo === "tirada" || destino?.tipo === "ficha")) ||
      (e.tipo === "margen_critico" && destino?.tipo === "especialidadArmaElegida") ||
      (e.tipo === "habilita" && familiaDestino !== null && FAMILIAS_SOLO_CON_DOTE.includes(familiaDestino)) ||
      (e.tipo === "cambia_par" &&
        familiaDestino !== null &&
        e.aplicado === "reflejos" &&
        e.habilidad === undefined &&
        e.especialidad === undefined) ||
      // Tiradas fijas: cambio de grado sin casilla sobre una tirada fija sin especialidad en la
      // etiqueta (Velocista, Gran Puntería; dotesEfectos.ts, `grados`).
      (alcanceDestino?.tipo === "tiradaId" &&
        destino?.tipo === "tirada" &&
        !destino.especialidad &&
        e.condicion === null &&
        ((e.tipo === "sube_grado" && ((e.de === "fracaso" && e.a === "exito") || (e.de === "exito" && e.a === "critico"))) ||
          e.tipo === "margen_critico")) ||
      // Tiradas fijas: otra habilidad y especialidad con casilla en la fila (Cazador Cazado,
      // Vigilancia Táctica; dotesEfectos.ts, `alternativas`).
      (e.tipo === "cambia_par" &&
        alcanceDestino?.tipo === "tiradaId" &&
        typeof e.condicion === "string" &&
        e.habilidad !== undefined &&
        e.especialidad !== undefined) ||
      // D2d: casillas sobre una tirada que existe (rules/dotesEfectos.ts), con condición.
      (destino?.tipo === "tirada" &&
        typeof e.condicion === "string" &&
        (e.tipo === "ventaja" ||
          (e.tipo === "sube_grado" && e.de === "fracaso" && e.a === "exito") ||
          (e.tipo === "margen_critico" && familiaDestino === null) ||
          (e.tipo === "cambia_par" &&
            familiaDestino === null &&
            e.aplicado !== undefined &&
            e.habilidad === undefined &&
            e.especialidad === undefined))) ||
      // Daño con casilla (D2d): solo en golpes de arma.
      (familiaDestino !== null &&
        typeof e.condicion === "string" &&
        (e.tipo === "danio_por_exitos" || e.tipo === "categoria_danio" || (e.tipo === "bono" && e.sobre === "danio"))) ||
      // Ventaja con casilla en una acción de dote (Apoyo, Violencia Aterradora; dotesAcciones.ts).
      (e.tipo === "ventaja" && destino?.tipo === "accionDote" && typeof e.condicion === "string") ||
      // Maniobra Derribo (D2d): casilla propia en los golpes melee.
      (e.tipo === "maniobra" && familiaDestino === "ataque_melee");
    if (!construible) {
      falla(id, `efecto ${e.borrador} (${String(e.tipo)}): sin tanda y sin forma de construirlo (D2a, D2b-1, D2b-2, D2c-1, D2c-2, D2d)`);
      return null;
    }
    if (e.tipo !== "texto" && alcanceDestino?.tipo === "familiaArma" && alcanceDestino.familia === "levantar_escudo")
      falla(id, `efecto ${e.borrador}: «Levantar escudo» no tiene dado, solo admite textos`);
    const filtro = e.filtroArma as object | undefined;
    if (filtro && alcanceDestino?.tipo !== "familiaArma")
      falla(id, `efecto ${e.borrador}: filtro de arma fuera de una familia de arma`);
    const v = e.valor as { porNivelEmpleado?: unknown; manual?: unknown } | undefined;
    if (e.tipo === "bono" && v && typeof v === "object" && ("porNivelEmpleado" in v || "manual" in v))
      falla(id, `efecto ${e.borrador}: bono sin valor numérico ni umbral de ficha`);
    if (e.tipo === "bono" && e.sobre === "danio" && (typeof e.condicion !== "string" || alcanceDestino?.tipo !== "familiaArma"))
      falla(id, `efecto ${e.borrador}: bono al daño sin casilla o fuera de una familia de arma`);
    if (e.soloEspecialidad && !String(e.tramo ?? "").startsWith("tramo:"))
      falla(id, `efecto ${e.borrador}: "solo en especialidad" sin bono por tramo de distancia`);
    const grados = e.grados as string[] | undefined;
    if (e.tipo === "texto" && grados && (grados.length !== 1 || grados[0] !== "critico")) {
      falla(id, `efecto ${e.borrador}: texto con grados ${JSON.stringify(grados)}: solo se sabe pintar el crítico`);
    }
    const tramo = e.tramo as string | undefined;
    if (tramo && !tramo.startsWith("tramo:") && !OPCIONES_DE_TRAMO[tramo.split(":")[0]]) {
      falla(id, `efecto ${e.borrador}: tramo "${tramo}" sin OPCIONES_DE_TRAMO`);
    }
  }

  const mecanismoCasilla = e.condicion === null || e.condicion === undefined ? "siempre_activo" : "eleccion_jugador";
  switch (e.tipo) {
    case "texto": {
      const narrativo = e.porque === "narrativo";
      if (clave === "ficha") return { tipo: narrativo ? "narrativo" : "texto", afecta: { modo: "ninguna" }, mecanismo: null, ...estado };
      const afecta = e.porque === "tercero" ? { modo: "objetivo_tercero" as const, id: clave! } : { modo: "accion_existente" as const, id: clave! };
      return { tipo: narrativo ? "narrativo" : "texto", afecta, mecanismo: "nota_fija", ...estado };
    }
    case "bono": {
      const tramo = e.tramo as string | undefined;
      // Casilla aunque sea siempre activo si va a una especialidad (la marca el jugador).
      const enEspecialidad = destino?.tipo === "tirada" && destino.especialidad !== undefined;
      const mecanismo = tramo?.startsWith("tramo:")
        ? "bono_tramo"
        : tramo || enEspecialidad
          ? "eleccion_jugador"
          : mecanismoCasilla;
      return { tipo: "numerico", afecta: { modo: "accion_existente", id: clave! }, mecanismo, ...estado };
    }
    case "cambia_par":
      return { tipo: "numerico", afecta: { modo: "accion_existente", id: clave! }, mecanismo: "sustitucion_aplicado", ...estado };
    case "descuento_contador":
      // Cambia lo que vale el contador que pone el jugador al tirar.
      return { tipo: "numerico", afecta: { modo: "accion_existente", id: clave! }, mecanismo: "eleccion_jugador", ...estado };
    case "margen_critico":
    case "sube_grado":
    case "ventaja":
    case "exito_extra":
    case "danio_por_exitos":
    case "categoria_danio":
      return { tipo: "numerico", afecta: { modo: "accion_existente", id: clave! }, mecanismo: mecanismoCasilla, ...estado };
    case "economia":
      return { tipo: "texto", afecta: { modo: "accion_existente", id: clave! }, mecanismo: "nota_fija", ...estado };
    case "habilita":
      // §9.2: sin la dote la acción "no aparece" → arbitraje duro.
      return {
        tipo: "habilitador",
        afecta: { modo: "accion_existente", id: clave! },
        mecanismo: "gate_instalacion",
        arbitraje: "duro",
        ...estado,
      };
    case "maniobra":
      // Sin dote de derribo la casilla no existe (habilitador, duro); Brutal le quita el −2.
      return e.sinPenalizador
        ? { tipo: "numerico", afecta: { modo: "accion_existente", id: clave! }, mecanismo: "eleccion_jugador", ...estado }
        : {
            tipo: "habilitador",
            afecta: { modo: "accion_existente", id: clave! },
            mecanismo: "eleccion_jugador",
            arbitraje: "duro",
            ...estado,
          };
    case "accion":
    case "poder":
      return {
        tipo: "accion",
        afecta: { modo: "accion_nueva", id: (e.accion as { id: string }).id },
        mecanismo: "accion_sin_equipo",
        ...estado,
      };
    default:
      falla(id, `efecto ${e.borrador}: tipo desconocido ${JSON.stringify(e.tipo)}`);
      return null;
  }
}

const dotes: DoteCatalogo[] = [];
for (const [i, entrada] of lista.entries()) {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
    falla(`#${i}`, "no es un objeto");
    continue;
  }
  const d = entrada as Record<string, unknown>;
  const id = typeof d.id === "string" ? d.id : `#${i}`;
  const raras = Object.keys(d).filter((k) => !CLAVES_V2.has(k));
  if (raras.length) falla(id, `claves fuera de MODELO_DOTES v2: ${raras.join(", ")}`);

  const seccion = typeof d.label === "string" ? md.get(d.label) : undefined;
  if (!seccion) falla(id, `no casa con ningún ### de docs/dotes.md (label ${JSON.stringify(d.label)})`);

  const compra = {
    id: d.id,
    label: d.label,
    grupo: d.grupo,
    ...(d.subgrupo !== undefined && { subgrupo: d.subgrupo }),
    coste: d.coste,
    requisitos: Array.isArray(d.requisitos) ? d.requisitos.map((r) => normalizarRequisito(id, r)) : d.requisitos,
    eleccion: normalizarEleccion(id, d.eleccion),
    repetible: d.repetible,
    sustituye: d.sustituye,
    visible: d.visible,
    texto: seccion?.texto ?? "",
  };
  const efectos = aplicarRamaYFiltro(
    id,
    Array.isArray(d.requisitos) ? d.requisitos.map((r) => normalizarRequisito(id, r)) : d.requisitos,
    normalizarEfectos(id, d.efectos),
  );
  const motor = efectos.map((e) => clasificar(id, e));
  const completa = {
    ...compra,
    efectos,
    limite: d.limite ?? null,
    candidataUX: d.candidataUX ?? null,
    motor,
  };
  const res = doteCatalogoSchema.safeParse(completa);
  if (!res.success) {
    for (const issue of res.error.issues) {
      const [campo, n] = issue.path;
      const donde = (campo === "efectos" || campo === "motor") && typeof n === "number" ? ` (efecto ${n}, borrador #${efectos[n]?.borrador})` : "";
      falla(id, `${issue.path.join(".") || "(raíz)"}${donde}: ${issue.message}`);
    }
    continue;
  }
  dotes.push(res.data);
}

// ── 4. Referencias y recuento ─────────────────────────────────────────────
const porId = new Map<string, DoteCatalogo>();
const labels = new Set<string>();
for (const d of dotes) {
  if (porId.has(d.id)) falla(d.id, "id repetido");
  if (labels.has(d.label)) falla(d.id, `nombre repetido: ${d.label}`);
  porId.set(d.id, d);
  labels.add(d.label);
}
const planos = (rs: RequisitoDote[]) => rs.flatMap((r) => (r.tipo === "uno_de" ? r.opciones : [r]));
for (const d of dotes) {
  if (d.sustituye && !porId.has(d.sustituye)) falla(d.id, `sustituye a una dote que no existe: ${d.sustituye}`);
  for (const r of planos(d.requisitos)) {
    if (r.tipo === "dote" && !porId.has(r.id)) falla(d.id, `requisito de dote previa inexistente: ${r.id}`);
    if (r.tipo === "dote" && r.id === d.id) falla(d.id, "se tiene de requisito a sí misma");
    if (r.tipo === "especialidad" && especialidadPorId(r.id)?.habilidad !== r.habilidad)
      falla(d.id, `requisito de especialidad "${r.id}" que no es de ${r.habilidad} en el catálogo de especialidades`);
  }
  // Especialidades en efectos: resolución de acciones de dote y cambio de par.
  for (const e of d.efectos) {
    const pares: { habilidad?: string; especialidad?: string | string[] }[] = [];
    if (e.tipo === "accion") pares.push(e.accion.resolucion as { habilidad?: string; especialidad?: string | string[] });
    if (e.tipo === "cambia_par") pares.push(e);
    for (const p of pares) {
      for (const esp of [p.especialidad ?? []].flat()) {
        const cat = especialidadPorId(esp);
        if (!cat) falla(d.id, `especialidad "${esp}" que no está en el catálogo de especialidades`);
        else if (p.habilidad && cat.habilidad !== p.habilidad) falla(d.id, `especialidad "${esp}" que no es de ${p.habilidad}`);
      }
    }
  }
  if (d.repetible && !d.eleccion) falla(d.id, "repetible sin elección: no habría forma de distinguir las copias");
  if (d.motor.length !== d.efectos.length) falla(d.id, `${d.motor.length} MotorMetadata para ${d.efectos.length} efectos`);
  d.motor.forEach((m, n) => {
    for (const e of erroresDeMotorMetadata(m)) falla(d.id, `motor ${n}: ${e}`);
  });
}
// Destino "accionDote": la acción tiene que existir en el catálogo (D2c-1).
const accionesDeCatalogo = new Set(dotes.flatMap((d) => d.efectos.flatMap((e) => (e.tipo === "accion" ? [e.accion.id] : []))));
for (const [clave, destino] of Object.entries(DESTINOS_DOTES))
  if (destino.tipo === "accionDote" && !accionesDeCatalogo.has(clave)) falla("(destinos)", `accionDote "${clave}" sin acción en el catálogo`);
for (const a of Object.keys(AJUSTES_ACCION)) if (!ajustesUsados.has(a)) falla("(AJUSTES_ACCION)", `"${a}" no es una acción del borrador`);
for (const a of Object.keys(AJUSTES_PODER)) if (!ajustesPoderUsados.has(a)) falla("(AJUSTES_PODER)", `"${a}" no es un poder del borrador`);
// Destino "poder" (D2c-2): el id es una acción de psiónica o un poder de dote del catálogo.
const poderesConocidos = new Set([
  ...DISCIPLINAS.flatMap((d) => d.acciones.map((a) => a.id)),
  ...dotes.flatMap((d) => d.efectos.flatMap((e) => (e.tipo === "poder" ? [e.accion.id] : []))),
]);
for (const [clave, destino] of Object.entries(DESTINOS_DOTES))
  if (destino.tipo === "poder" && !poderesConocidos.has(destino.id)) falla("(destinos)", `poder "${destino.id}" (${clave}) que no existe`);
if (lista.length !== TOTAL_ESPERADO) falla("(catálogo)", `el borrador trae ${lista.length} dotes, se esperaban ${TOTAL_ESPERADO}`);
if (md.size !== TOTAL_ESPERADO) falla("(catálogo)", `docs/dotes.md trae ${md.size} dotes, se esperaban ${TOTAL_ESPERADO}`);

// ── 5. Cruce contra docs/dotes.md ─────────────────────────────────────────
const grupoMd = (g: string): { grupo: string; subgrupo?: string } | null => {
  if (g === "Tecnociencia · Psiónica") return { grupo: "tecnociencia", subgrupo: "psionica" };
  const h = HABILIDADES.find((x) => x.label === g);
  return h ? { grupo: h.id } : null;
};
const claseDeTipo = (r: RequisitoDote): string => {
  const base = r.tipo === "uno_de" ? r.opciones[0] : r;
  if (r.tipo === "uno_de" && r.opciones.some((o) => o.tipo !== base.tipo)) return "uno_de mixto";
  switch (base.tipo) {
    case "atributo":
      return "atributo";
    case "aplicado":
      return "atributo aplicado";
    case "habilidad":
      return "habilidad";
    case "especialidad":
      return `especialidad (${HABILIDADES.find((h) => h.id === base.habilidad)!.label})`;
    case "dote":
      return "dote previa";
    case "disciplina":
      return "(?) disciplina psiónica";
    case "psionico":
      return "(?)";
  }
};
const discrepancias: string[] = [];
for (const d of dotes) {
  const s = md.get(d.label);
  if (!s) continue;
  const problemas: string[] = [];
  if (s.requisitos.length !== d.requisitos.length)
    problemas.push(`${s.requisitos.length} líneas de requisito en dotes.md, ${d.requisitos.length} en el borrador`);
  const clasesMd = s.requisitos.map((l) => l.split(" · ").at(-1)!.trim()).sort();
  const clasesJson = d.requisitos.map(claseDeTipo).sort();
  if (clasesMd.join("|") !== clasesJson.join("|"))
    problemas.push(`clases ${JSON.stringify(clasesMd)} en dotes.md frente a ${JSON.stringify(clasesJson)}`);
  if (s.coste !== d.coste) problemas.push(`coste ${s.coste} en dotes.md, ${d.coste} en el borrador`);
  const g = grupoMd(s.grupo);
  if (!g || g.grupo !== d.grupo || g.subgrupo !== d.subgrupo) problemas.push(`grupo "${s.grupo}" en dotes.md, ${d.grupo}/${d.subgrupo ?? "-"} en el borrador`);
  if (problemas.length) discrepancias.push(`  ${d.id}: ${problemas.join("; ")}`);
}

// Cruce de nombres: cada especialidad citada en requisitos tiene que aparecer con el
// nombre de su catálogo en las líneas de docs/dotes.md ("Empatía 1 o Liderazgo 1 ·
// especialidad (Actitud)"): se parte por " o ", se quita el número (y el punto suelto,
// "Medicina 1.") y se casa con el id por nombre normalizado. Si no, falla. Los nombres
// legibles salen del catálogo de especialidades, no de aquí.
const claveEspecialidad = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/[\s_-]+/g, "_");
const nombresMd = new Map<string, string>();
for (const s of md.values()) {
  for (const l of s.requisitos) {
    const [texto, clase] = l.split(" · ");
    if (!clase?.startsWith("especialidad")) continue;
    for (const parte of texto.split(" o ")) {
      const nombre = parte.replace(/\s+\d+\.?\s*$/, "").trim();
      nombresMd.set(claveEspecialidad(nombre), nombre);
    }
  }
}
for (const d of dotes) {
  for (const r of planos(d.requisitos)) {
    if (r.tipo !== "especialidad") continue;
    const nombre = nombresMd.get(r.id);
    const cat = especialidadPorId(r.id);
    if (!nombre) discrepancias.push(`  ${d.id}: la especialidad "${r.id}" no aparece con ese nombre en dotes.md`);
    else if (cat && claveEspecialidad(cat.label) !== claveEspecialidad(nombre))
      discrepancias.push(`  ${d.id}: "${nombre}" en dotes.md, "${cat.label}" en el catálogo de especialidades`);
  }
}

// ── Informe ───────────────────────────────────────────────────────────────
if (avisos.length) console.log(`Normalización v1 → v2:\n${avisos.join("\n")}`);
if (errores.length) {
  console.error(`El borrador no encaja con MODELO_DOTES v2 (${errores.length}):\n${errores.join("\n")}`);
  process.exit(1);
}
if (discrepancias.length) {
  console.error(`Cruce con docs/dotes.md: ${discrepancias.length} dotes no cuadran:\n${discrepancias.join("\n")}`);
  process.exit(1);
}

// ── 7. Recuento por tanda y escribir ─────────────────────────────────────
// construido = efecto numérico que la app aplica; texto = texto o narrativo construido
// (nota en una tirada o en la tarjeta); pendiente = por tanda (bloqueoPor). Una tanda se
// cierra cuando sus pendientes llegan a 0 (docs/tareas.md, "Dotes").
const recuento = { construido: 0, texto: 0, pendiente: Object.fromEntries(TANDAS_DOTES.map((t) => [t, 0])) as Record<TandaDote, number> };
for (const d of dotes) {
  for (const m of d.motor) {
    if (m.estado === "construido") {
      if (m.tipo === "texto" || m.tipo === "narrativo") recuento.texto++;
      else recuento.construido++;
    } else recuento.pendiente[m.bloqueoPor as TandaDote]++;
  }
}
const totalEfectos = dotes.reduce((t, d) => t + d.efectos.length, 0);
const lineasRecuento = [
  `${totalEfectos} efectos (${lista.reduce((t: number, d: { efectos?: unknown[] }) => t + (d.efectos?.length ?? 0), 0)} en el borrador)`,
  `construidos: ${recuento.construido}`,
  `texto: ${recuento.texto}`,
  ...TANDAS_DOTES.map((t) => `pendientes ${t}: ${recuento.pendiente[t]}`),
];

const cabecera = `// GENERADO por scripts/generar-catalogo-dotes.ts (npm run gen-dotes). No editar a mano:
// se cambia el borrador (docs/modelado-dotes.json), la transcripción (docs/dotes.md) o la
// tabla de destinos (dotesDestinos.ts) y se regenera. Compra (docs/sistema.md §9.1) y
// efectos con su MotorMetadata (§9.3); qué se aplica ya, rules/dotesEfectos.ts.
import type { DoteCatalogo } from "./dotesTipos";

export const DOTES: readonly DoteCatalogo[] = `;
const pie = `
// Recuento por tanda (lo escribe el generador):
${lineasRecuento.map((l) => `//   ${l}`).join("\n")}
`;
writeFileSync(SALIDA, `${cabecera}${JSON.stringify(dotes, null, 2)};\n${pie}`);
console.log(`${dotes.length} dotes escritas en src/lib/catalog/dotes.ts; cruce con docs/dotes.md sin discrepancias.`);
console.log(`Recuento por tanda:\n${lineasRecuento.map((l) => `  ${l}`).join("\n")}`);
