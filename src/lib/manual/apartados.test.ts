import { test } from "node:test";
import assert from "node:assert/strict";
import { prepararDocumento } from "./encabezados";
import { analizarDocumento, apartado } from "./apartados";

const doc = (md: string) => analizarDocumento(prepararDocumento(md));

const MD = [
  "# Ojo Biónico (Nivel 1-4)",
  "",
  "Intro del ojo.",
  "",
  "# Nivel 1",
  "",
  "Ve en la oscuridad.",
  "",
  "# Nivel 2",
  "",
  "Ve más.",
  "",
  "# Neuroprótesis",
  "",
  "Otra pieza.",
  "",
  "### Linterna",
  "",
  "Luz.",
  "",
  "# Venenos",
  "",
  "Fin.",
].join("\n");

test("un encabezado se extiende sobre sus subdivisiones (Nivel N) y lo corta el siguiente hermano", () => {
  const a = apartado(doc(MD), "ojo-bionico-nivel-1-4")!;
  assert.equal(a.titulo, "Ojo Biónico (Nivel 1-4)");
  assert.ok(a.markdown.includes("Intro del ojo."));
  assert.ok(a.markdown.includes("Ve más."));
  assert.ok(!a.markdown.includes("Otra pieza."));
  assert.ok(!a.markdown.includes("<h2 id=\"ojo-bionico"), "sin el propio encabezado");
});

test("el ancla de otro elemento corta aunque sea de nivel inferior", () => {
  const d = doc(MD);
  assert.ok(apartado(d, "neuroprotesis")!.markdown.includes("Luz."));
  const conCorte = apartado(d, "neuroprotesis", new Set(["linterna"]))!;
  assert.ok(conCorte.markdown.includes("Otra pieza."));
  assert.ok(!conCorte.markdown.includes("Luz."));
});

test("una fila de tabla da la tabla con su cabecera y solo esa fila", () => {
  const d = doc(
    [
      "Texto.",
      "",
      "<table>",
      "<tbody>",
      "<tr><td><strong>Modelo</strong></td><td><strong>Daño</strong></td></tr>",
      "<tr><td><strong>Mosquito</strong></td><td>6 Letal</td></tr>",
      "<tr><td><strong>Bellum</strong></td><td>7 Letal</td></tr>",
      "</tbody>",
      "</table>",
    ].join("\n"),
  );
  assert.deepEqual(
    d.filas.map((f) => f.id),
    ["mosquito", "bellum"],
  );
  const a = apartado(d, "bellum")!;
  assert.equal(a.titulo, "Bellum");
  assert.ok(a.markdown.includes("<th><strong>Modelo</strong></th>"));
  assert.ok(a.markdown.includes("7 Letal"));
  assert.ok(!a.markdown.includes("Mosquito"));
  assert.ok(!/\n\s*\n/.test(a.markdown.trim()), "en una línea: un hueco cerraría el bloque HTML");
});

test("ancla que no existe → null", () => {
  assert.equal(apartado(doc(MD), "no-existe"), null);
});
