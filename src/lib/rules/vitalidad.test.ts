import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet } from "./sheet";
import { salud } from "./derivados";
import { reconciliarVida, ajustarVida, ajustarFatiga } from "./vitalidad";

// defaultSheet(): todos los atributos a 0 → salud() = { vida: 8, fatiga: 8 }.

describe("reconciliarVida", () => {
  test("una ficha nueva (centinela 999) se recorta al máximo real de salud()", () => {
    const s = reconciliarVida(defaultSheet());
    const { vida, fatiga } = salud(s);
    assert.equal(s.vidaActual, vida);
    assert.equal(s.fatigaActual, fatiga);
  });

  test("no toca un actual que ya está dentro de rango", () => {
    const s = { ...defaultSheet(), vidaActual: 3, fatigaActual: 5 };
    const r = reconciliarVida(s);
    assert.equal(r.vidaActual, 3);
    assert.equal(r.fatigaActual, 5);
  });

  test("recorta el actual si el máximo bajó por debajo (p. ej. perdió un bono)", () => {
    const s = { ...defaultSheet(), vidaActual: 20, fatigaActual: 20 };
    const r = reconciliarVida(s);
    assert.equal(r.vidaActual, 8);
    assert.equal(r.fatigaActual, 8);
  });

  test("es idempotente: si no cambia nada, devuelve la misma referencia", () => {
    const s = reconciliarVida(defaultSheet());
    assert.equal(reconciliarVida(s), s);
  });
});

describe("ajustarVida", () => {
  test("resta y suma dentro de rango", () => {
    const s = reconciliarVida(defaultSheet()); // vidaActual: 8
    const herido = ajustarVida(s, -3);
    assert.equal(herido.vidaActual, 5);
    assert.equal(ajustarVida(herido, 2).vidaActual, 7);
  });

  test("clampa en 0, nunca baja de ahí", () => {
    const s = reconciliarVida(defaultSheet());
    assert.equal(ajustarVida(s, -999).vidaActual, 0);
  });

  test("clampa en el máximo de salud(), nunca lo supera", () => {
    const s = reconciliarVida(defaultSheet());
    assert.equal(ajustarVida(s, 999).vidaActual, 8);
  });

  test("delta no finito no cambia nada", () => {
    const s = reconciliarVida(defaultSheet());
    assert.equal(ajustarVida(s, NaN), s);
  });
});

describe("ajustarFatiga", () => {
  test("resta y suma dentro de rango, clampada [0, máximo]", () => {
    const s = reconciliarVida(defaultSheet()); // fatigaActual: 8
    assert.equal(ajustarFatiga(s, -10).fatigaActual, 0);
    assert.equal(ajustarFatiga(s, 10).fatigaActual, 8);
    assert.equal(ajustarFatiga(s, -2).fatigaActual, 6);
  });
});
