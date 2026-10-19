import { test } from "node:test";
import assert from "node:assert/strict";
import { parsearRevisar, resumirRevision, rutaRevision } from "./revision.mjs";

test("rutaRevision va junto al contrato y empieza por punto", () => {
  assert.equal(rutaRevision("/r/fabrica/trabajos/T-001-x.md", "T-001"), "/r/fabrica/trabajos/.revision-T-001.json");
});

test("parsearRevisar lee el JSON multilínea aunque haya ruido delante", () => {
  const json = JSON.stringify({ ok: true, resultados: [{ id: "tests", estado: "pasa" }] }, null, 2);
  assert.deepEqual(parsearRevisar(`> npm warn algo\n${json}\n`).resultados[0].id, "tests");
  assert.equal(parsearRevisar("No existe la ref x"), null);
  assert.equal(parsearRevisar("{roto"), null);
});

test("resumirRevision", () => {
  const r = resumirRevision({
    head: "abc",
    revisar: { resultados: [{ id: "tests", estado: "pasa" }, { id: "lint", estado: "no aplica" }] },
    alcance: { estado: "falla", fuera: ["x"] },
  });
  assert.deepEqual(r, { head: "abc", revisar: "tests:pasa lint:no aplica", alcance: "falla", fuera: ["x"] });
  assert.equal(resumirRevision({ head: "a", revisar: { error: "x" }, alcance: { estado: "pasa" } }).revisar, "error");
});
