import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import * as acorn from "acorn";
import { decidir } from "../hooks/bloqueos.mjs";

const guion = fs.readFileSync(fileURLToPath(new URL("./linea.js", import.meta.url)), "utf8");

test("linea.js parsea como guion de Workflow (return y await en lo alto)", () => {
  assert.doesNotThrow(() =>
    acorn.parse(guion, {
      ecmaVersion: "latest",
      sourceType: "module",
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
    }),
  );
});

test("marcaOperario cuenta fallos/llamadas incluyendo la que la lleva", () => {
  const m = guion.match(/function marcaOperario\(\) \{[\s\S]*?\n\}/);
  assert.ok(m, "linea.js no tiene function marcaOperario");
  const marca = new Function("OPERARIO", `${m[0]}; return marcaOperario();`);
  assert.equal(marca({ llamadas: 0, sinRespuesta: 0, sinJson: 0 }), "0/1");
  assert.equal(marca({ llamadas: 9, sinRespuesta: 1, sinJson: 1 }), "2/10");
});

test("ponerEstado y el juez pasan --operario, y el comando pasa el hook", () => {
  assert.ok(guion.includes("${desde ? ` --desde ${desde}` : ''} --operario ${marcaOperario()}`"), "ponerEstado sin --operario");
  for (const comando of [
    "node '/r/fabrica/guion/contrato.mjs' estado '/r/fabrica/trabajos/T-001-x.md' inspeccion --desde encolado --operario 0/1",
    "node '/r/fabrica/juez/juez.mjs' '/r/fabrica/trabajos/T-001-x.md' --vuelta 2 --operario 1/14",
  ]) {
    const r = decidir({ tool_name: "Bash", tool_input: { command: comando }, agent_type: "fabrica-operario", cwd: "/r" });
    assert.equal(r.bloquear, false, r.motivo);
  }
});

test("el comando del juez es fijo y sin datos: contrato, vuelta y operario", () => {
  const llamadas = [...guion.matchAll(/`node \$\{q\(JUEZ\)\}[^`]*`/g)].map((m) => m[0]);
  assert.deepEqual(llamadas, ["`node ${q(JUEZ)} ${q(CONTRATO)} --vuelta ${vuelta} --operario ${marcaOperario()}`"]);
  assert.ok(!/(?<!<)<<-?\s*'?[A-Z_]+'?\s*\\n/.test(guion), "linea.js no pasa datos por heredoc");
  assert.ok(!/--suma|jsonParaShell|sumaMal/.test(guion), "quedan restos de la suma");
});
