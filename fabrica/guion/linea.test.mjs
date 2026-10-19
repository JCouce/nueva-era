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
  assert.equal(marca({ llamadas: 0, sinRespuesta: 0, sinJson: 0, sumaMal: 0 }), "0/1");
  assert.equal(marca({ llamadas: 9, sinRespuesta: 1, sinJson: 1, sumaMal: 1 }), "3/10");
});

test("ponerEstado y el juez pasan --operario, y el comando pasa el hook", () => {
  assert.ok(guion.includes("${desde ? ` --desde ${desde}` : ''} --operario ${marcaOperario()}`"), "ponerEstado sin --operario");
  assert.ok(guion.includes("--suma ${suma(entrada)} --operario ${marcaOperario()}"), "el juez sin --operario");
  const comando = "node '/r/fabrica/guion/contrato.mjs' estado '/r/fabrica/trabajos/T-001-x.md' inspeccion --desde encolado --operario 0/1";
  const r = decidir({ tool_name: "Bash", tool_input: { command: comando }, agent_type: "fabrica-operario", cwd: "/r" });
  assert.equal(r.bloquear, false, r.motivo);
});
