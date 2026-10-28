import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { generarCatalogoDotes } from "../../../scripts/generar-catalogo-dotes";

// dotes.ts es la salida de `npm run gen-dotes`: si alguien lo edita a mano, o cambia el
// borrador/el generador sin regenerar, este test lo para.
test("dotes.ts coincide con lo que genera gen-dotes", () => {
  const enDisco = readFileSync(new URL("./dotes.ts", import.meta.url), "utf8");
  const generado = generarCatalogoDotes().texto;
  if (enDisco === generado) return;
  const a = enDisco.split("\n");
  const b = generado.split("\n");
  let linea = 0;
  while (a[linea] === b[linea]) linea++;
  assert.fail(
    "dotes.ts no coincide con lo que genera gen-dotes: regenera con npm run gen-dotes, no lo edites a mano.\n" +
      `Primera diferencia en la línea ${linea + 1}:\n  en disco:  ${a[linea] ?? "(fin)"}\n  generado:  ${b[linea] ?? "(fin)"}`,
  );
});
