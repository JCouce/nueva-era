#!/usr/bin/env node
// El juez de la fábrica. Sin LLM: reglas fijas sobre los veredictos por criterio.
//   - C1 lo vota el script (tests + tsc de revisar.mjs), C2 lo vota alcance.mjs, el resto el revisor.
//   - "script" (lint, ficha, prod de revisar.mjs) también vota; "bd" distinto de "no aplica" escala.
//   - Sin veredicto o sin evidencia, falla. Los hallazgos del revisor no votan (ni llegan aquí).
//   - Bloqueo del constructor o duda de diseño del revisor → escalado.
//   - Algo falla: vuelta < 2 → vuelve; en la vuelta 2 (tercer intento) → escalado. Nada falla → contigo.
// Escribe un bloque en la sección Juicio (sin borrar los de vueltas anteriores) y `estado`/`vueltas` del contrato.
//
// Uso: node fabrica/juez/juez.mjs <ruta-contrato> [--suma <hex>] [--operario <f>/<l>] [--entrada <archivo>]
//      (sin --entrada, stdin)
// Entrada: {"vuelta":0,"bloqueo":null,"dudaDiseno":null,"revisor":{"criterios":[{"id","veredicto","evidencia"}]}}
// La revisión por script la lee de fabrica/trabajos/.revision-T-xxx.json (la deja revision.mjs).
// --suma: FNV-1a de la entrada tal como la manda el guion; si no cuadra, el operario la ha copiado mal (código 3).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rutaRevision } from "../guion/revision.mjs";
import {
  anadirASeccion,
  anotarMarcas,
  celdas,
  criterios as leerCriterios,
  leerFrontmatter,
  leerSeccion,
  ponerCampo,
} from "../guion/contrato.mjs";

export const MAX_VUELTAS = 2;
const VEREDICTOS = new Set(["pasa", "falla", "no aplica"]);

// FNV-1a de 32 bits sobre las unidades UTF-16. El guion (linea.js) tiene una copia idéntica; un test las compara.
export function suma(texto) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

const v = (id, veredicto, evidencia, fuente) => ({ id, veredicto, evidencia, fuente });
const texto = (x) => (typeof x === "string" ? x.trim() : "");

function porId(resultados, id) {
  return resultados.find((r) => r.id === id) ?? null;
}

function veredictoC1(revision) {
  const res = revision?.revisar?.resultados;
  if (!res) return v("C1", "falla", texto(revision?.revisar?.error) || "sin resultado de revisar.mjs", "script");
  const partes = ["tests", "tsc"].map((id) => porId(res, id) ?? { id, estado: "falla", detalle: `revisar.mjs no dio "${id}"` });
  const falla = partes.find((p) => p.estado !== "pasa");
  return falla
    ? v("C1", "falla", `${falla.id}: ${falla.detalle}`, "script")
    : v("C1", "pasa", partes.map((p) => p.detalle).join("; "), "script");
}

function veredictoC2(revision) {
  const a = revision?.alcance;
  if (!a) return v("C2", "falla", "sin resultado de alcance.mjs", "alcance");
  return v("C2", a.estado === "pasa" ? "pasa" : "falla", texto(a.evidencia) || "alcance.mjs sin evidencia", "alcance");
}

function veredictoScript(revision) {
  const res = revision?.revisar?.resultados;
  if (!res) return v("script", "falla", "sin resultado de revisar.mjs", "script");
  const malos = res.filter((r) => ["lint", "ficha", "prod"].includes(r.id) && r.estado === "falla");
  if (malos.length) return v("script", "falla", malos.map((r) => `${r.id}: ${r.detalle}`).join("\n"), "script");
  const vistos = res.filter((r) => ["lint", "ficha", "prod"].includes(r.id)).map((r) => `${r.id}: ${r.estado}`);
  return v("script", "pasa", vistos.join("; ") || "sin comprobaciones de push seguro", "script");
}

function veredictoRevisor(id, revisor) {
  const suyos = (revisor?.criterios ?? []).filter((c) => c?.id === id);
  if (!suyos.length) return v(id, "falla", "el revisor no dio veredicto", "revisor");
  const malo = suyos.find((c) => !VEREDICTOS.has(c.veredicto) || !texto(c.evidencia));
  if (malo) {
    const motivo = !VEREDICTOS.has(malo.veredicto) ? `veredicto no válido: "${malo.veredicto}"` : "sin evidencia";
    return v(id, "falla", `${motivo}${texto(malo.evidencia) ? ` (${texto(malo.evidencia)})` : ""}`, "revisor");
  }
  const falla = suyos.find((c) => c.veredicto === "falla");
  const elegido = falla ?? suyos[0];
  return v(id, elegido.veredicto, texto(elegido.evidencia), "revisor");
}

export function juzgar({ criterios, vuelta, bloqueo = null, dudaDiseno = null, revision = null, revisor = null }) {
  if (!Number.isInteger(vuelta) || vuelta < 0 || vuelta > MAX_VUELTAS) throw new Error(`vuelta no válida: ${vuelta}`);
  const veredictos = criterios.map(({ id }) =>
    id === "C1" ? veredictoC1(revision) : id === "C2" ? veredictoC2(revision) : veredictoRevisor(id, revisor),
  );
  veredictos.push(veredictoScript(revision));
  const fallan = veredictos.filter((x) => x.veredicto === "falla").map((x) => x.id);
  const bd = porId(revision?.revisar?.resultados ?? [], "bd");

  let decision;
  let motivo;
  if (texto(bloqueo)) {
    decision = "escalado";
    motivo = `el constructor declaró bloqueo: ${texto(bloqueo)}`;
  } else if (bd && bd.estado !== "no aplica") {
    decision = "escalado";
    motivo = `toca la BD (${bd.detalle}): en el N1 los worktrees comparten la BD local y eso lo decide el usuario`;
  } else if (texto(dudaDiseno)) {
    decision = "escalado";
    motivo = `el revisor marcó duda de diseño: ${texto(dudaDiseno)}`;
  } else if (fallan.length) {
    decision = vuelta < MAX_VUELTAS ? "vuelve" : "escalado";
    motivo = vuelta < MAX_VUELTAS
      ? `falla ${fallan.join(", ")}; vuelve al constructor (vuelta ${vuelta + 1}/${MAX_VUELTAS})`
      : `falla ${fallan.join(", ")} en el tercer intento: se acabaron las vueltas`;
  } else {
    decision = "contigo";
    motivo = "todos los criterios pasan con evidencia";
  }
  const vueltas = decision === "vuelve" ? vuelta + 1 : vuelta;
  const estado = decision === "vuelve" ? "construyendo" : decision;
  return { decision, motivo, vuelta, vueltas, estado, fallan, veredictos };
}

const celda = (s) => s.split("\n")[0].replace(/\|/g, "\\|").slice(0, 140);
const recortar = (s, n = 1200) => (s.length > n ? `${s.slice(0, n)}…` : s);

export function bloqueJuicio(r, { rama } = {}) {
  const lineas = [
    `### Intento ${r.vuelta + 1} · ${r.decision}`,
    `**Motivo:** ${r.motivo}`,
    "",
    "| # | veredicto | vota | evidencia |",
    "|---|---|---|---|",
    ...r.veredictos.map((x) => `| ${x.id} | ${x.veredicto} | ${x.fuente} | ${celda(x.evidencia)} |`),
  ];
  const malos = r.veredictos.filter((x) => x.veredicto === "falla");
  if (malos.length) {
    lineas.push("", "**Qué falla:**");
    for (const x of malos) lineas.push(`- **${x.id}** (${x.fuente}):`, "  ```", ...recortar(x.evidencia).split("\n").map((l) => `  ${l}`), "  ```");
  }
  const paraTi = {
    contigo: `Todo pasa. La rama ${rama ?? ""} está lista para que la mires; el push es tuyo.`,
    vuelve: `Vuelve al constructor para arreglar ${r.fallan.join(", ")}.`,
    escalado: "Necesita tu decisión: la línea se para aquí.",
  }[r.decision];
  lineas.push("", `**Para el usuario:** ${paraTi}`);
  return lineas.join("\n");
}

// Lee de vuelta los bloques que escribe bloqueJuicio (lo usa el visor, fabrica/panel).
export function leerJuicios(textoContrato) {
  let seccion;
  try {
    seccion = leerSeccion(textoContrato, "Juicio");
  } catch {
    return [];
  }
  const res = [];
  for (const linea of seccion.split("\n")) {
    const cab = linea.match(/^### Intento (\d+) · (\S+)/);
    if (cab) {
      res.push({ intento: Number(cab[1]), decision: cab[2], motivo: "", veredictos: [] });
      continue;
    }
    const actual = res.at(-1);
    if (!actual) continue;
    const motivo = linea.match(/^\*\*Motivo:\*\* (.*)$/);
    if (motivo) actual.motivo = motivo[1].trim();
    else if (linea.startsWith("|")) {
      const [id, veredicto, fuente, evidencia = ""] = celdas(linea);
      if (VEREDICTOS.has(veredicto)) actual.veredictos.push({ id, veredicto, fuente, evidencia });
    }
  }
  return res;
}

// marcas: {ahora, operario} para el frontmatter (fin del cronómetro y fallos del operario); ver anotarMarcas.
export function aplicarJuicio(textoContrato, r, marcas = {}) {
  const { rama, estado: anterior } = leerFrontmatter(textoContrato);
  let t = anadirASeccion(textoContrato, "Juicio", bloqueJuicio(r, { rama }));
  t = ponerCampo(t, "estado", r.estado);
  t = ponerCampo(t, "vueltas", `${r.vueltas}/${MAX_VUELTAS}`);
  return anotarMarcas(t, { anterior, estado: r.estado, ...marcas });
}

// La revisión vale solo si es de esta vuelta y de esta rama: si revision.mjs no llegó a escribir, no se juzga con
// la de la vuelta anterior.
export function revisionValida(revision, { vuelta, rama }) {
  return Boolean(revision) && revision.vuelta === vuelta && revision.rama === rama;
}

function leerJson(ruta) {
  try {
    return JSON.parse(fs.readFileSync(ruta, "utf8"));
  } catch {
    return null;
  }
}

function salir(objeto, codigo = 0) {
  console.log(JSON.stringify(objeto));
  process.exit(codigo);
}

async function main(argv) {
  const opcion = (n) => { const k = argv.indexOf(n); return k === -1 ? null : argv[k + 1]; };
  const contrato = argv.find((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));
  try {
    if (!contrato) throw new Error("uso: juez.mjs <ruta-contrato> [--suma <hex>] [--entrada <archivo>]");
    let crudo = "";
    if (opcion("--entrada")) crudo = fs.readFileSync(opcion("--entrada"), "utf8");
    else for await (const trozo of process.stdin) crudo += trozo;
    crudo = crudo.trim();
    const esperada = opcion("--suma");
    if (esperada && suma(crudo) !== esperada) {
      salir({ ok: false, error: "suma", esperada, calculada: suma(crudo) }, 3);
    }
    const entrada = JSON.parse(crudo);
    const textoContrato = fs.readFileSync(contrato, "utf8");
    const { id, rama } = leerFrontmatter(textoContrato);
    const revision = leerJson(rutaRevision(path.resolve(contrato), id));
    const r = juzgar({
      criterios: leerCriterios(textoContrato),
      vuelta: entrada.vuelta,
      bloqueo: entrada.bloqueo,
      dudaDiseno: entrada.dudaDiseno,
      revisor: entrada.revisor,
      revision: revisionValida(revision, { vuelta: entrada.vuelta, rama }) ? revision : null,
    });
    fs.writeFileSync(contrato, aplicarJuicio(textoContrato, r, { ahora: new Date().toISOString(), operario: opcion("--operario") }));
    salir({
      ok: true,
      decision: r.decision,
      motivo: r.motivo,
      estado: r.estado,
      vueltas: `${r.vueltas}/${MAX_VUELTAS}`,
      fallan: r.fallan,
      veredictos: r.veredictos.map((x) => ({ id: x.id, veredicto: x.veredicto })),
    });
  } catch (error) {
    salir({ ok: false, error: error.message }, 1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
