import { test } from "node:test";
import assert from "node:assert/strict";
import { documentosDelManual, parsearIndice } from "./indice";

const TSV = [
  "# comentario",
  "# id\tslug\tnombre\testado",
  "a1\tzeta\tZeta\tactivo",
  "a2\tequipamiento\tEquipamiento\tactivo",
  "a3\tneos-plouton\tNeos Plouton\tactivo",
  "a4\tviejo\tViejo\tretirado",
  "a5\treglas-base\tSistema\tactivo",
  "a6\talfa\tAlfa\tactivo",
  "",
].join("\n");

test("parsearIndice ignora comentarios y líneas vacías", () => {
  assert.deepEqual(
    parsearIndice(TSV).map((e) => e.slug),
    ["zeta", "equipamiento", "neos-plouton", "viejo", "reglas-base", "alfa"],
  );
});

test("documentosDelManual: solo activos, sin excluidos, orden de lectura y el resto al final", () => {
  assert.deepEqual(
    documentosDelManual(parsearIndice(TSV)).map((e) => e.nombre),
    ["Sistema", "Equipamiento", "Alfa", "Zeta"],
  );
});
