// Genera src/lib/catalog/dotes.ts a partir del borrador docs/modelado-dotes.json
// (campos de compra) y de la transcripción literal docs/dotes.md (la prosa).
//
// Uso: npm run gen-dotes
//   (= node --import ./scripts/test-resolver.mjs scripts/generar-catalogo-dotes.ts)
//
// Qué hace, en orden, y por qué falla:
//   1. Lee el borrador y comprueba que cada dote solo trae claves de MODELO_DOTES v2.
//   2. Se queda con los campos de compra y aplica la normalización v1 → v2 (abajo,
//      "Normalización"). Nada más se toca.
//   3. Valida cada dote contra doteCatalogoSchema (src/lib/catalog/dotesTipos.ts) y
//      falla con un mensaje por dote si algo no encaja.
//   4. Comprueba referencias (sustituye, requisito de dote previa), ids y nombres
//      únicos, y que salen exactamente 105.
//   5. Cruce barato contra deriva con docs/dotes.md (abajo, "Cruce"). Si no cuadra,
//      lista las dotes que fallan y NO escribe: una discrepancia real se decide a
//      mano en el borrador, no aquí.
//   6. Escribe el catálogo.
//
// Normalización v1 → v2 (solo transformaciones mecánicas):
//   - Biónica es especialidad de Biociencia (docs/tareas.md, "Dotes"): un requisito
//     de especialidad "bionica" con otra habilidad pasa a "biociencia" (se avisa).
//   - Elección de lista cerrada: se añade `etiquetas` (id → texto legible) desde la
//     tabla ETIQUETAS_OPCION de aquí abajo, copiada de la prosa de la dote. Si una
//     opción no tiene etiqueta, falla.
//   - `texto`: el bloque "**Efecto:**" de docs/dotes.md (markdown tal cual, con sus
//     *(sic)*), casado por nombre exacto de la dote. Si un nombre no casa, falla.
//   - `subgrupo` ausente se omite; el resto de claves de v2 (efectos, limite,
//     candidataUX, motor) se ignoran: son de las tandas de efectos.
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
import { HABILIDADES } from "../src/lib/rules/habilidades";

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
function normalizarRequisito(id: string, r: unknown): unknown {
  if (!r || typeof r !== "object") return r;
  const req = r as Record<string, unknown>;
  if (req.tipo === "uno_de" && Array.isArray(req.opciones)) {
    return { ...req, opciones: req.opciones.map((o) => normalizarRequisito(id, o)) };
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
  const res = doteCatalogoSchema.safeParse(compra);
  if (!res.success) {
    for (const issue of res.error.issues) falla(id, `${issue.path.join(".") || "(raíz)"}: ${issue.message}`);
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
  }
  if (d.repetible && !d.eleccion) falla(d.id, "repetible sin elección: no habría forma de distinguir las copias");
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

// Nombre legible de cada especialidad citada en requisitos, sacado de las propias
// líneas de docs/dotes.md ("Empatía 1 o Liderazgo 1 · especialidad (Actitud)"): se
// parte por " o ", se quita el número (y el punto suelto, "Medicina 1.") y se casa
// con el id del borrador por nombre normalizado. Toda especialidad del borrador
// tiene que salir de aquí; si no, falla.
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
const especialidades: Record<string, string> = {};
for (const d of dotes) {
  for (const r of planos(d.requisitos)) {
    if (r.tipo !== "especialidad") continue;
    const nombre = nombresMd.get(r.id);
    if (nombre) especialidades[r.id] = nombre;
    else discrepancias.push(`  ${d.id}: la especialidad "${r.id}" no aparece con ese nombre en dotes.md`);
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

// ── 6. Escribir ───────────────────────────────────────────────────────────
const cabecera = `// GENERADO por scripts/generar-catalogo-dotes.ts (npm run gen-dotes). No editar a mano:
// se cambia el borrador (docs/modelado-dotes.json) o la transcripción (docs/dotes.md) y
// se regenera. Solo los campos de compra (docs/sistema.md §9.1); los efectos, en sus tandas.
import type { DoteCatalogo } from "./dotesTipos";

export const DOTES: readonly DoteCatalogo[] = `;
const especialidadesOrdenadas = Object.fromEntries(Object.entries(especialidades).sort(([a], [b]) => a.localeCompare(b)));
const pie = `
// Nombre legible de las especialidades citadas en requisitos (id → nombre de dotes.md).
// TODO(revisar): provisional hasta el catálogo de especialidades (docs/tareas.md, "Dotes").
export const NOMBRES_ESPECIALIDAD_DOTES: Readonly<Record<string, string>> = ${JSON.stringify(especialidadesOrdenadas, null, 2)};
`;
writeFileSync(SALIDA, `${cabecera}${JSON.stringify(dotes, null, 2)};\n${pie}`);
console.log(`${dotes.length} dotes escritas en src/lib/catalog/dotes.ts; cruce con docs/dotes.md sin discrepancias.`);
