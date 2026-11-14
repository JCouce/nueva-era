import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ETIQUETAS_MAX,
  ETIQUETA_MAX_LARGO,
  filtrarNpcs,
  normalizarEtiquetas,
  recuentoEtiquetas,
  tieneTodas,
} from "./npcEtiquetas";

describe("normalizarEtiquetas", () => {
  test("recorta, colapsa espacios y quita vacías", () => {
    assert.deepEqual(normalizarEtiquetas(["  Escena   3 ", "", "   "]), ["Escena 3"]);
  });

  test("repetidas por mayúsculas o tildes: gana la primera grafía", () => {
    assert.deepEqual(normalizarEtiquetas(["Jefe", "jefe", "JEFE ", "Corporación", "corporacion"]), [
      "Jefe",
      "Corporación",
    ]);
  });

  test("topes de largo y de cantidad", () => {
    assert.equal(normalizarEtiquetas(["x".repeat(100)])[0].length, ETIQUETA_MAX_LARGO);
    const muchas = Array.from({ length: 50 }, (_, i) => `e${i}`);
    assert.equal(normalizarEtiquetas(muchas).length, ETIQUETAS_MAX);
  });
});

describe("tieneTodas", () => {
  test("sin marcadas pasa cualquiera", () => {
    assert.equal(tieneTodas([], []), true);
  });

  test("filtro Y, sin mirar mayúsculas ni tildes", () => {
    assert.equal(tieneTodas(["Jefe", "Corporación"], ["corporacion", "JEFE"]), true);
    assert.equal(tieneTodas(["Jefe"], ["Jefe", "Escena 3"]), false);
  });
});

describe("recuentoEtiquetas", () => {
  test("cuenta por NPC, junta grafías y ordena por uso", () => {
    const r = recuentoEtiquetas([
      { etiquetas: ["Jefe", "Escena 3"] },
      { etiquetas: ["jefe", "jefe"] },
      { etiquetas: ["Banda"] },
    ]);
    assert.deepEqual(r, [
      { etiqueta: "Jefe", n: 2 },
      { etiqueta: "Banda", n: 1 },
      { etiqueta: "Escena 3", n: 1 },
    ]);
  });
});

describe("filtrarNpcs", () => {
  const npcs = [
    { nombre: "Guardia", nota: "Arma reglamentaria", etiquetas: ["Corporación", "Escena 3"] },
    { nombre: "Merodeador", nota: null, etiquetas: ["Banda", "Escena 3"] },
    { nombre: "Dron", nota: "Sintético", etiquetas: [] },
  ];
  const nombres = (r: { nombre: string }[]) => r.map((n) => n.nombre);

  test("sin filtros devuelve todos", () => {
    assert.deepEqual(nombres(filtrarNpcs(npcs, "  ", [])), ["Guardia", "Merodeador", "Dron"]);
  });

  test("busca en nombre, nota y etiquetas sin tildes", () => {
    assert.deepEqual(nombres(filtrarNpcs(npcs, "sintetico", [])), ["Dron"]);
    assert.deepEqual(nombres(filtrarNpcs(npcs, "corporacion", [])), ["Guardia"]);
  });

  test("etiquetas en Y combinadas con la búsqueda", () => {
    assert.deepEqual(nombres(filtrarNpcs(npcs, "", ["escena 3"])), ["Guardia", "Merodeador"]);
    assert.deepEqual(nombres(filtrarNpcs(npcs, "", ["Escena 3", "Banda"])), ["Merodeador"]);
    assert.deepEqual(nombres(filtrarNpcs(npcs, "guar", ["Banda"])), []);
  });
});
