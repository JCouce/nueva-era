// Pestaña Vida del máster: vista previa (tope, suelo y umbral que cruza).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { deltaDeModo, previaAjusteVida, textoUmbral } from "./ajusteVida";
import { textoAjusteVida } from "./textosRegistro";
import { umbralVital } from "./estados";

describe("previaAjusteVida", () => {
  test("daño: baja y dice el umbral que cruza (8 de máximo, Herido < 4)", () => {
    const p = previaAjusteVida({ actual: 6, max: 8, tope: 8 }, "vida", -3);
    assert.equal(p.despues, 3);
    assert.equal(p.umbralAntes, null);
    assert.equal(p.umbralDespues?.id, "herido");
    assert.equal(p.cambiaUmbral, true);
    assert.equal(textoUmbral(p.umbralDespues), "Herido (−1)");
  });
  test("daño no baja de 0", () => {
    assert.equal(previaAjusteVida({ actual: 2, max: 8, tope: 8 }, "vida", -5).despues, 0);
  });
  test("curación topa en el tope, aunque el máximo enseñado sea menor (S74)", () => {
    const p = previaAjusteVida({ actual: 5, max: 6, tope: 10 }, "vida", 9);
    assert.equal(p.despues, 10);
    assert.equal(p.max, 6);
  });
  test("curar saca del umbral", () => {
    const p = previaAjusteVida({ actual: 1, max: 10, tope: 10 }, "vida", 8);
    assert.equal(p.umbralAntes?.id, "moribundo");
    assert.equal(p.umbralDespues, null);
    assert.equal(p.cambiaUmbral, true);
    assert.equal(textoUmbral(p.umbralDespues), "sin penalizador");
  });
  test("dentro del mismo umbral no cambia", () => {
    assert.equal(previaAjusteVida({ actual: 4, max: 10, tope: 10 }, "vida", -1).cambiaUmbral, false);
  });
  test("la fatiga usa sus umbrales (Fatigado −1, Exhausto −2)", () => {
    const p = previaAjusteVida({ actual: 5, max: 10, tope: 10 }, "fatiga", -4);
    assert.equal(p.umbralDespues?.id, "exhausto");
    assert.equal(textoUmbral(p.umbralDespues), "Exhausto (−2)");
    assert.equal(umbralVital("fatiga", 2, 10)?.id, "fatigado");
  });
  test("el modo pone el signo", () => {
    assert.equal(deltaDeModo("danio", 3), -3);
    assert.equal(deltaDeModo("curacion", 3), 3);
  });
});

describe("previaAjusteVida con categoría", () => {
  const v = { actual: 6, max: 10, tope: 10, danio: { noLetal: 1, letal: 3, grave: 0 } };
  test("el daño va a la categoría y la vista previa trae el desglose", () => {
    const p = previaAjusteVida(v, "vida", -2, "grave");
    assert.equal(p.despues, 4);
    assert.deepEqual(p.danioDespues, { noLetal: 1, letal: 3, grave: 2 });
  });
  test("curar una categoría vacía no cambia nada", () => {
    assert.equal(previaAjusteVida(v, "vida", 3, "grave").despues, 6);
  });
  test("la fatiga ignora la categoría", () => {
    const p = previaAjusteVida(v, "fatiga", 3, "grave");
    assert.equal(p.despues, 9);
    assert.equal(p.danioDespues, undefined);
  });
});

describe("textoAjusteVida", () => {
  test("con categoría, la nombra detrás del recurso (solo en la vida)", () => {
    assert.equal(textoAjusteVida("vida", -2, [{ nombre: "Kira", npc: false }], "grave"), "−2 vida grave a Kira");
    assert.equal(textoAjusteVida("vida", 1, [{ nombre: "Kira", npc: false }], "noLetal"), "+1 vida no letal a Kira");
    assert.equal(textoAjusteVida("fatiga", 1, [{ nombre: "Kira", npc: false }], "noLetal"), "+1 fatiga a Kira");
  });
});
