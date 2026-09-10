import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet } from "./sheet";
import { equipar } from "./equipo";
import { tiradasDeHerramientas } from "./herramientas";

describe("sin nada equipado", () => {
  test("no aparece ninguna herramienta", () => {
    assert.deepEqual(tiradasDeHerramientas(defaultSheet()), []);
  });
});

describe("Valija Táctica de Fabricación", () => {
  test("equipada, no genera ninguna tirada propia (sin bono limpio que mecanizar)", () => {
    const sheet = equipar(defaultSheet(), {
      instanciaId: "v1",
      catalogoId: "valija_tactica_fabricacion",
      nivel: 1,
    });
    assert.deepEqual(tiradasDeHerramientas(sheet), []);
  });
});

describe("Radar", () => {
  test("equipado, genera su propia fila con Perspicacia + Tecnociencia", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "r1", catalogoId: "radar", nivel: 1 });
    const [fila] = tiradasDeHerramientas(sheet);
    assert.equal(fila.label, "Escanear con Radar");
    assert.equal(fila.grupo, "Herramientas");
    assert.equal(fila.aplicado, "perspicacia");
    assert.equal(fila.habilidad, "tecnociencia");
    assert.match(fila.nota ?? "", /dificultad 7/i);
  });

  test("la nota cambia con el nivel equipado", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "r1", catalogoId: "radar", nivel: 3 });
    const [fila] = tiradasDeHerramientas(sheet);
    assert.match(fila.nota ?? "", /dificultad 8/i);
  });
});

describe("Escáner Detector y Disfraz Holográfico", () => {
  test("cada uno aparece como su propia fila si está equipado", () => {
    let sheet = equipar(defaultSheet(), {
      instanciaId: "e1",
      catalogoId: "escaner_detector",
      nivel: 1,
    });
    sheet = equipar(sheet, {
      instanciaId: "d1",
      catalogoId: "disfraz_holografico",
      nivel: 1,
    });
    const labels = tiradasDeHerramientas(sheet).map((t) => t.label);
    assert.deepEqual(labels, ["Usar Escáner Detector", "Activar Disfraz Holográfico"]);
  });
});

describe("no confunde con Buscar/percibir", () => {
  test("la habilidad de Radar/Escáner es Tecnociencia, no Exploración", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "r1", catalogoId: "radar", nivel: 1 });
    const [fila] = tiradasDeHerramientas(sheet);
    assert.notEqual(fila.habilidad, "exploracion");
  });
});
