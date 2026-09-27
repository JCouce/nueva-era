import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet } from "./sheet";
import { equipar } from "./equipo";
import { accionesDeHerramientas, accionesDirectasDeHerramientas } from "./herramientas";

describe("sin nada equipado", () => {
  test("no aparece ninguna herramienta", () => {
    assert.deepEqual(accionesDeHerramientas(defaultSheet()), []);
  });

  test("tampoco ninguna acción sin dado", () => {
    assert.deepEqual(accionesDirectasDeHerramientas(defaultSheet()), []);
  });
});

describe("Valija Táctica de Fabricación", () => {
  test("equipada, no genera ninguna tirada propia (sin bono limpio que mecanizar)", () => {
    const sheet = equipar(defaultSheet(), {
      instanciaId: "v1",
      catalogoId: "valija_tactica_fabricacion",
      nivel: 1,
    });
    assert.deepEqual(accionesDeHerramientas(sheet), []);
  });
});

describe("Radar", () => {
  test("equipado, genera su propia fila con Perspicacia + Tecnociencia", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "r1", catalogoId: "radar", nivel: 1 });
    const [fila] = accionesDeHerramientas(sheet);
    assert.equal(fila.label, "Escanear con Radar");
    assert.equal(fila.grupo, "Herramientas");
    assert.equal(fila.aplicado, "perspicacia");
    assert.equal(fila.habilidad, "tecnociencia");
    assert.match(fila.nota ?? "", /dificultad 7/i);
  });

  test("sin nivel 4, no aparece 'Marcar objetivo'", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "r1", catalogoId: "radar", nivel: 3 });
    assert.deepEqual(accionesDirectasDeHerramientas(sheet), []);
  });

  test("con nivel 4, aparece 'Marcar objetivo' como acción sin dado", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "r1", catalogoId: "radar", nivel: 4 });
    const [accion] = accionesDirectasDeHerramientas(sheet);
    assert.equal(accion.label, "Marcar objetivo");
    assert.equal(accion.grupo, "Herramientas");
    assert.match(accion.nota ?? "", /-1 a sus defensas de cobertura/i);
    // Sigue generando también su tirada normal de barrido — las dos conviven.
    assert.equal(accionesDeHerramientas(sheet)[0]?.label, "Escanear con Radar");
  });

  test("la nota cambia con el nivel equipado", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "r1", catalogoId: "radar", nivel: 3 });
    const [fila] = accionesDeHerramientas(sheet);
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
    const labels = accionesDeHerramientas(sheet).map((t) => t.label);
    assert.deepEqual(labels, ["Usar Escáner Detector", "Activar Disfraz Holográfico"]);
  });
});

describe("no confunde con Buscar/percibir", () => {
  test("la habilidad de Radar/Escáner es Tecnociencia, no Exploración", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "r1", catalogoId: "radar", nivel: 1 });
    const [fila] = accionesDeHerramientas(sheet);
    assert.notEqual(fila.habilidad, "exploracion");
  });
});
