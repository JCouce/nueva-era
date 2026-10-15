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
//   - Bono con umbral de ficha (`siMin`): se parte en dos. A = el mismo bono con
//     `valor: base` (la casilla que D2a ya puede poner) y B = el bono entero con su
//     `siMin` (pendiente de D2d, capa valor_por_umbral_ficha). Cuando D2d exista, la
//     casilla de A desaparece y la pone B (Presencia Imponente, decisión del usuario).
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
//     texto "sin_regla", pero §9.3 aprueba la capa éxito extra para ellos.
//
// Clasificación (MotorMetadata de cada efecto; docs/motor.md):
//   - Tanda = la más tardía (D2b-1 < D2b-2 < D2c < D2d) entre la del destino (tabla de
//     destinos: "tanda") y la del tipo de efecto (TANDA_DEL_TIPO); EXCEPCIONES_TANDA
//     (dotesDestinos.ts) manda sobre las dos. Con tanda → `pendiente`, `bloqueoPor`.
//   - Sin tanda → `construido`: bono con valor numérico o texto, sobre una tirada que
//     existe (casilla, bono fijo o nota de rules/dotesEfectos.ts), o texto de la
//     tarjeta (`lugar: "ficha"`, ya visible en la prosa de la dote).
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
  OPCIONES_DE_TRAMO,
  TANDAS_DOTES,
  type TandaDote,
} from "../src/lib/catalog/dotesDestinos";
import { HABILIDADES } from "../src/lib/rules/habilidades";
import { especialidadPorId } from "../src/lib/catalog/especialidades";
import { erroresDeMotorMetadata, type MotorMetadata } from "../src/lib/rules/motor";

const RAIZ = new URL("..", import.meta.url);
const BORRADOR = new URL("docs/modelado-dotes.json", RAIZ);
const TRANSCRIPCION = new URL("docs/dotes.md", RAIZ);
const SALIDA = new URL("src/lib/catalog/dotes.ts", RAIZ);
const TOTAL_ESPERADO = 105;

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

// Efectos que el borrador trae como texto y §9.3 manda modelar como efecto real
// ("<id de dote>#<índice en el borrador>" → efecto v2, sin `borrador`).
// Un array parte el efecto en varios (mismo `borrador`), p.ej. un texto en dos destinos.
const CONVERSIONES: Record<string, Record<string, unknown> | Record<string, unknown>[]> = {
  // capa_pendiente: Imitación +3 con Interpretación ≥ 3 (valor por umbral de ficha).
  "dote_imitacion#1": {
    tipo: "bono",
    alcance: "imitar",
    valor: { base: 2, siMin: { tipo: "habilidad", id: "interpretacion", min: 3, valor: 3 } },
    condicion: "Imitando a otra persona",
  },
  // capa_pendiente: Derribo con acción estándar sin el tope de daño básico.
  "dote_derribo_brutal#1": { tipo: "danio_por_exitos", alcance: "familia:ataque_melee", condicion: "Derribo con acción estándar" },
  // capa_pendiente: golpe con escudo letal en vez de no letal (§9.3, va con las casillas del daño).
  "dote_golpe_mejorado_con_escudo#0": {
    tipo: "categoria_danio",
    alcance: "familia:ataque_melee",
    a: "letal",
    condicion: "Golpe letal con escudo",
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
  // §9.3 "éxito extra (Salto Evasivo: con la casilla «esquivando un área», si la esquiva
  // acierta suma +1 éxito; +2 en la Mejorada)". El borrador lo traía como texto sin_regla.
  "dote_salto_evasivo#0": { tipo: "exito_extra", alcance: "defensa", exitos: 1, condicion: "Esquivando un área" },
  "dote_salto_evasivo_mejorado#0": { tipo: "exito_extra", alcance: "defensa", exitos: 2, condicion: "Esquivando un área" },
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
    const e: Efecto = { ...(crudo as Record<string, unknown>), borrador };
    if (e.tipo === "texto" && e.porque === "capa_pendiente") {
      falla(id, `efecto ${borrador}: texto "capa_pendiente" sin conversión en CONVERSIONES`);
      return;
    }
    if (e.tipo === "texto" && typeof e.condicion === "string" && CONDICION_CRITICO.has(e.condicion)) {
      e.grados = ["critico"];
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
  // Bono con umbral → A (valor base, ya construible) + B (umbral entero, D2d).
  return salida.flatMap((e) => {
    const v = e.valor as { base?: number; siMin?: unknown } | undefined;
    if (e.tipo === "bono" && v && typeof v === "object" && v.siMin !== undefined && typeof v.base === "number") {
      const yaTieneBase = salida.some(
        (o) => o !== e && o.tipo === "bono" && o.alcance === e.alcance && o.condicion === e.condicion && typeof o.valor === "number",
      );
      return yaTieneBase ? [e] : [{ ...e, valor: v.base }, e];
    }
    return [e];
  });
}

// ── Efectos: clasificación ────────────────────────────────────────────────
const ordenTanda = (t: TandaDote | null) => (t === null ? -1 : TANDAS_DOTES.indexOf(t));
const masTardia = (a: TandaDote | null, b: TandaDote | null) => (ordenTanda(a) >= ordenTanda(b) ? a : b);
const esFamilia = (a: unknown) => typeof a === "string" && a.startsWith("familia:");

// La tanda que pide el propio tipo de efecto, aunque su destino exista (§9.3 y encargo D2a).
function tandaDelTipo(e: Efecto): TandaDote | null {
  switch (e.tipo) {
    case "accion": {
      const accionId = (e.accion as { id: string }).id;
      // Arrollar y Ataque de oportunidad: solo con su dote (§9.2) → habilita.
      return accionId === "dotes_arrollar" || accionId === "dotes_ataque_de_oportunidad" ? "D2b-2" : "D2c";
    }
    case "poder":
      // TODO(revisar): Impacto Métrico y Sobrecarga Métrica van con las acciones de dote
      // (D2c), aunque Impacto Métrico necesita además el daño modificable (D2d).
      return "D2c";
    case "habilita":
      return "D2b-2";
    case "cambia_par":
      // Combate Sutil (§9.2, ataques y bloqueos melee) es el habilita de Sutil. Los demás
      // (Negociación Analítica, Cazador Cazado, Vigilancia Táctica) son la capa "cambio de
      // par" de D2d (sistema.md §9.3); si su tirada no existe, gana "tiradas-fijas".
      return esFamilia(e.alcance) ? "D2b-2" : "D2d";
    case "margen_critico":
      // Crítico Mejorado (crítico fijo con su especialidad de arma) → D2b-1; el resto de
      // márgenes, capa de D2d.
      return esFamilia(e.alcance) || e.alcance === "especialidad:<elegida>" ? "D2b-1" : "D2d";
    case "sube_grado":
    case "ventaja":
    case "exito_extra":
    case "danio_por_exitos":
    case "categoria_danio":
      return "D2d";
    case "economia":
      // TODO(revisar): ningún efecto del borrador lo usa hoy; coste en acciones = texto
      // hasta el registro de acciones (§9.3). Se supone con las acciones de dote.
      return "D2c";
    case "bono":
      if (e.sobre === "danio" || typeof e.valor !== "number") return "D2d";
      return null;
    default:
      return null;
  }
}

function clasificar(id: string, e: Efecto): MotorMetadata | null {
  const clave = (e.tipo === "texto" ? e.lugar : e.tipo === "habilita" ? e.accion : e.alcance) as string | undefined;
  const destino = clave === undefined ? undefined : DESTINOS_DOTES[clave];
  if (clave !== undefined && !destino) {
    falla(id, `efecto ${e.borrador} (${String(e.tipo)}): alcance/lugar "${clave}" sin entrada en DESTINOS_DOTES (dotesDestinos.ts)`);
    return null;
  }
  const excepcion = EXCEPCIONES_TANDA[`${id}#${e.borrador}`];
  const tanda = excepcion?.tanda ?? masTardia(destino?.tipo === "tanda" ? destino.tanda : null, tandaDelTipo(e));
  const estado = tanda ? { estado: "pendiente" as const, bloqueoPor: tanda } : { estado: "construido" as const };

  if (!tanda) {
    // Lo único que D2a sabe construir: bonos numéricos y textos sobre una tirada que
    // existe, y textos de tarjeta.
    const construible =
      (e.tipo === "bono" && destino?.tipo === "tirada") ||
      (e.tipo === "texto" && (destino?.tipo === "tirada" || destino?.tipo === "ficha"));
    if (!construible) {
      falla(id, `efecto ${e.borrador} (${String(e.tipo)}): sin tanda y sin forma de construirlo en D2a`);
      return null;
    }
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
  const efectos = normalizarEfectos(id, d.efectos);
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
