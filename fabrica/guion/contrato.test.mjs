import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import {
  anadirASeccion,
  anotarMarcas,
  cambiarEstado,
  celdas,
  criterios,
  FINALES,
  fijarCampo,
  leerFrontmatter,
  leerSeccion,
  ponerCampo,
  puedeTocar,
  quitarCampo,
  reemplazarSeccion,
} from "./contrato.mjs";

const leer = (rel) => fs.readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const ejemplo = leer("../trabajos/T-000-ejemplo-modo-de-ataque.md");
const plantilla = leer("../contrato/plantilla.md");

test("frontmatter del ejemplo", () => {
  const fm = leerFrontmatter(ejemplo);
  assert.equal(fm.id, "T-000");
  assert.equal(fm.estado, "hecho");
  assert.equal(fm.vueltas, "0/2");
  assert.equal(fm.rama, "fabrica/T-000-modo-de-ataque");
});

test("frontmatter de la plantilla: el comentario no entra en el valor", () => {
  assert.equal(leerFrontmatter(plantilla).estado, "spec");
  assert.equal(leerFrontmatter(plantilla).origen, "manual");
});

test("ponerCampo cambia el valor y deja el comentario en su columna", () => {
  const nuevo = ponerCampo(plantilla, "estado", "construyendo");
  const linea = nuevo.split("\n").find((l) => l.startsWith("estado:"));
  const original = plantilla.split("\n").find((l) => l.startsWith("estado:"));
  assert.equal(leerFrontmatter(nuevo).estado, "construyendo");
  assert.equal(linea.indexOf("#"), original.indexOf("#"));
  assert.equal(nuevo.slice(nuevo.indexOf("## Encargo")), plantilla.slice(plantilla.indexOf("## Encargo")));
});

test("ponerCampo con un valor más largo que la columna deja un espacio", () => {
  const nuevo = ponerCampo("---\nestado: a  # x\n---\ncuerpo\n", "estado", "construyendo");
  assert.match(nuevo, /^---\nestado: construyendo #/);
});

test("puedeTocar del ejemplo", () => {
  assert.deepEqual(puedeTocar(ejemplo), ["src/lib/rules/combate.ts", "src/lib/rules/*.test.ts", "docs/tareas.md"]);
});

test("puedeTocar ignora backticks con espacios y se corta en el siguiente bloque", () => {
  const t = `---\nid: T-1\n---\n## Spec\n**Puede tocar:**\n- \`a.ts\` (ver \`npm test\`)\n\n- \`b/**\`\n**Otra cosa:**\n- \`c.ts\`\n## Criterios\n`;
  assert.deepEqual(puedeTocar(t), ["a.ts", "b/**"]);
});

test("criterios del ejemplo", () => {
  const cs = criterios(ejemplo);
  assert.deepEqual(cs.map((c) => c.id), ["C1", "C2", "C3", "C4"]);
  assert.equal(cs[1].oraculo, "`git diff --stat`");
});

test("criterios: un id que no es C<número> rompe en vez de saltarse (F-010)", () => {
  const texto = "## Criterios\n| # | Qué | Oráculo |\n|---|---|---|\n| C1 | algo | comando |\n| C6b | otra cosa | navegador |\n";
  assert.throws(() => criterios(texto), /C6b/);
});

test("criterios de la plantilla: la fila vacía C3 no cuenta", () => {
  assert.deepEqual(criterios(plantilla).map((c) => c.id), ["C1", "C2"]);
});

test("celdas respeta | dentro de backticks y \\|", () => {
  assert.deepEqual(celdas("| C5 | `git diff | grep x` | a \\| b |"), ["C5", "`git diff | grep x`", "a | b"]);
});

test("leerSeccion quita el comentario guía y no corta en ## dentro de código", () => {
  const t = "---\nid: x\n---\n## Uno\n<!-- guía -->\n```\n## no es cabecera\n```\nhola\n## Dos\nadiós\n";
  assert.equal(leerSeccion(t, "Uno"), "```\n## no es cabecera\n```\nhola");
  assert.equal(leerSeccion(t, "Dos"), "adiós");
});

test("reemplazarSeccion toca solo esa sección y conserva la guía", () => {
  const nuevo = reemplazarSeccion(plantilla, "Juicio", "decisión: contigo");
  assert.equal(leerSeccion(nuevo, "Juicio"), "decisión: contigo");
  assert.match(nuevo, /## Juicio\n<!-- juez ·[^\n]*-->\ndecisión: contigo\n\n## Decisión/);
  for (const s of ["Encargo", "Spec", "Criterios", "Revisión", "Decisión", "Métricas y retro"]) {
    assert.equal(leerSeccion(nuevo, s), leerSeccion(plantilla, s), s);
  }
});

test("reemplazarSeccion en la última sección deja un salto final", () => {
  const t = "---\nid: x\n---\n## A\nuno\n## B\nviejo\n";
  assert.equal(reemplazarSeccion(t, "B", "nuevo"), "---\nid: x\n---\n## A\nuno\n## B\nnuevo\n");
});

test("anadirASeccion acumula bloques", () => {
  let t = anadirASeccion(plantilla, "Juicio", "### Intento 1");
  t = anadirASeccion(t, "Juicio", "### Intento 2");
  assert.equal(leerSeccion(t, "Juicio"), "### Intento 1\n\n### Intento 2");
});

test("sección inexistente lanza", () => {
  assert.throws(() => leerSeccion(plantilla, "Nada"), /no tiene la sección/);
});

test("cambiarEstado valida el estado y el de partida", () => {
  assert.throws(() => cambiarEstado(plantilla, "volando"), /desconocido/);
  assert.throws(() => cambiarEstado(plantilla, "inspeccion", ["encolado"]), /está en "spec"/);
  const r = cambiarEstado(plantilla, "encolado", ["spec"]);
  assert.equal(r.anterior, "spec");
  assert.equal(leerFrontmatter(r.texto).estado, "encolado");
});

// --- marcas para el visor: inicio, fin y operario ---
const conEstado = (t, estado) => ponerCampo(t, "estado", estado);
const H0 = "2026-10-19T10:00:00.000Z";
const H1 = "2026-10-19T10:06:12.000Z";

test("fijarCampo añade el campo si falta y lo cambia si está; quitarCampo lo quita", () => {
  let t = fijarCampo(plantilla, "inicio", H0);
  assert.equal(leerFrontmatter(t).inicio, H0);
  assert.equal(leerFrontmatter(t).estado, "spec");
  t = fijarCampo(t, "inicio", H1);
  assert.equal(leerFrontmatter(t).inicio, H1);
  assert.equal(t.match(/^inicio:/gm).length, 1);
  t = quitarCampo(t, "inicio");
  assert.equal(leerFrontmatter(t).inicio, undefined);
  assert.equal(t, plantilla);
});

test("encolado → inspeccion escribe inicio, sin pisar uno que ya hubiera, y quita un fin viejo", () => {
  const r = cambiarEstado(conEstado(plantilla, "encolado"), "inspeccion", ["encolado"], { ahora: H0 });
  assert.equal(leerFrontmatter(r.texto).inicio, H0);
  const viejo = fijarCampo(fijarCampo(conEstado(plantilla, "encolado"), "inicio", H0), "fin", H1);
  const otra = leerFrontmatter(cambiarEstado(viejo, "inspeccion", null, { ahora: H1 }).texto);
  assert.equal(otra.inicio, H0);
  assert.equal(otra.fin, undefined);
});

test("sin ahora (uso antiguo) no escribe marcas", () => {
  const r = cambiarEstado(conEstado(plantilla, "encolado"), "inspeccion");
  assert.equal(leerFrontmatter(r.texto).inicio, undefined);
});

test("los estados finales escriben fin, pero solo si el trabajo entró en la línea", () => {
  const enLinea = fijarCampo(conEstado(plantilla, "revision"), "inicio", H0);
  for (const final of FINALES) {
    assert.equal(leerFrontmatter(cambiarEstado(enLinea, final, null, { ahora: H1 }).texto).fin, H1, final);
  }
  assert.equal(leerFrontmatter(cambiarEstado(enLinea, "construyendo", null, { ahora: H1 }).texto).fin, undefined);
  assert.equal(leerFrontmatter(cambiarEstado(plantilla, "spec", null, { ahora: H1 }).texto).fin, undefined);
});

test("operario se guarda como fallos/llamadas; un valor raro se ignora", () => {
  const t = cambiarEstado(plantilla, "encolado", null, { operario: "1/7" }).texto;
  assert.equal(leerFrontmatter(t).operario, "1/7");
  assert.equal(leerFrontmatter(anotarMarcas(t, { estado: "encolado", operario: "2/9" })).operario, "2/9");
  assert.equal(leerFrontmatter(anotarMarcas(t, { estado: "encolado", operario: "x; rm" })).operario, "1/7");
});
