import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet } from "./sheet";
import { modificadoresActivos, salud } from "./derivados";
import {
  reconciliarVida,
  ajustarVida,
  ajustarFatiga,
  vitalidadAlEntrarEnCombate,
  vitalidadAlSalirDeCombate,
  fatigaEnJuego,
  cobroDeFatiga,
  pagarFatiga,
} from "./vitalidad";

// defaultSheet(): todos los atributos a 0 → salud() = { vida: 10, fatiga: 10 }.

describe("reconciliarVida", () => {
  test("una ficha nueva (centinela 999) se recorta al máximo real de salud()", () => {
    const s = reconciliarVida(defaultSheet());
    const { vida, fatiga } = salud(s, modificadoresActivos(s));
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
    assert.equal(r.vidaActual, 10);
    assert.equal(r.fatigaActual, 10);
  });

  test("es idempotente: si no cambia nada, devuelve la misma referencia", () => {
    const s = reconciliarVida(defaultSheet());
    assert.equal(reconciliarVida(s), s);
  });
});

describe("ajustarVida", () => {
  test("resta y suma dentro de rango", () => {
    const s = reconciliarVida(defaultSheet()); // vidaActual: 10
    const herido = ajustarVida(s, -3);
    assert.equal(herido.vidaActual, 7);
    assert.equal(ajustarVida(herido, 2).vidaActual, 9);
  });

  test("clampa en 0, nunca baja de ahí", () => {
    const s = reconciliarVida(defaultSheet());
    assert.equal(ajustarVida(s, -999).vidaActual, 0);
  });

  test("clampa en el máximo de salud(), nunca lo supera", () => {
    const s = reconciliarVida(defaultSheet());
    assert.equal(ajustarVida(s, 999).vidaActual, 10);
  });

  test("delta no finito no cambia nada", () => {
    const s = reconciliarVida(defaultSheet());
    assert.equal(ajustarVida(s, NaN), s);
  });
});

describe("ajustarFatiga", () => {
  test("resta y suma dentro de rango, clampada [0, máximo]", () => {
    const s = reconciliarVida(defaultSheet()); // fatigaActual: 10
    assert.equal(ajustarFatiga(s, -10).fatigaActual, 0);
    assert.equal(ajustarFatiga(s, 10).fatigaActual, 10);
    assert.equal(ajustarFatiga(s, -2).fatigaActual, 8);
  });
});

describe("vitalidadAlEntrarEnCombate", () => {
  test("el jugador entra con su vida y fatiga de la ficha, no a tope", () => {
    const s = { ...defaultSheet(), vidaActual: 3, fatigaActual: 5 };
    assert.deepEqual(vitalidadAlEntrarEnCombate(s, { vida: 10, fatiga: 10 }), {
      pgActual: 3,
      fatigaActual: 5,
      danio: { noLetal: 0, letal: 7, grave: 0 },
    });
  });
  test("recortado a [0, máximo]", () => {
    const s = { ...defaultSheet(), vidaActual: 999, fatigaActual: -2 };
    assert.deepEqual(vitalidadAlEntrarEnCombate(s, { vida: 10, fatiga: 10 }), {
      pgActual: 10,
      fatigaActual: 0,
      danio: { noLetal: 0, letal: 0, grave: 0 },
    });
  });
  test("la foto se lleva el desglose de la ficha, contra su máximo", () => {
    const s = { ...defaultSheet(), vidaActual: 6, danio: { noLetal: 1, letal: 1, grave: 2 } };
    assert.deepEqual(vitalidadAlEntrarEnCombate(s, { vida: 10, fatiga: 10 }).danio, { noLetal: 1, letal: 1, grave: 2 });
    // Con un máximo más bajo en combate (un estado), lo que sobra sale de lo más leve.
    assert.deepEqual(vitalidadAlEntrarEnCombate(s, { vida: 8, fatiga: 10 }).danio, { noLetal: 0, letal: 0, grave: 2 });
  });
});

describe("fatiga en juego (td-25)", () => {
  test("fuera de combate, la de la ficha; con foto, la de la foto", () => {
    const s = { ...defaultSheet(), fatigaActual: 6 };
    assert.equal(fatigaEnJuego(s, null), 6);
    assert.equal(fatigaEnJuego(s, { fatigaActual: 2 }), 2);
  });

  test("cobroDeFatiga: lo que no llega de la fatiga en juego va a temporal solo con Proeza", () => {
    assert.deepEqual(cobroDeFatiga(5, 2, true), { pagado: 2, temporal: 3 });
    assert.deepEqual(cobroDeFatiga(5, 2, false), { pagado: 2, temporal: 0 });
    assert.deepEqual(cobroDeFatiga(0, 2, true), { pagado: 0, temporal: 0 });
  });

  test("Proeza en combate: la temporal sale contra la fatiga de la foto, no la de la ficha", () => {
    const s = { ...defaultSheet(), fatigaActual: 8, fatigaTemporal: 0 };
    const r = pagarFatiga(s, 5, true, 2);
    assert.equal(r.fatigaTemporal, 3);
    assert.equal(r.fatigaActual, 6);
  });

  test("sin fatiga en juego, igual que antes (la de la ficha)", () => {
    const s = { ...defaultSheet(), fatigaActual: 2, fatigaTemporal: 0 };
    assert.deepEqual(pagarFatiga(s, 5, true), { ...s, fatigaActual: 0, fatigaTemporal: 3 });
  });

  test("la ficha no baja de 0 aunque la foto pague más", () => {
    const s = { ...defaultSheet(), fatigaActual: 1, fatigaTemporal: 0 };
    assert.equal(pagarFatiga(s, 3, false, 5).fatigaActual, 0);
  });
});

describe("vitalidadAlSalirDeCombate (td-13)", () => {
  const topes = { vida: 10, fatiga: 10 };

  test("copia vida, fatiga y desglose de la foto a la ficha", () => {
    const s = { ...defaultSheet(), vidaActual: 10, fatigaActual: 10 };
    const r = vitalidadAlSalirDeCombate(s, { pgActual: 6, pgMax: 10, fatigaActual: 3, fatigaMax: 10, danio: { noLetal: 1, letal: 1, grave: 2 } }, topes);
    assert.equal(r.vidaActual, 6);
    assert.equal(r.fatigaActual, 3);
    assert.deepEqual(r.danio, { noLetal: 1, letal: 1, grave: 2 });
  });

  test("con otro máximo en la ficha, copia el daño recibido, no el valor", () => {
    // Foto 3/8 (5 perdidos), ficha con tope 10: sale 5/10, no 3/10.
    const s = { ...defaultSheet(), vidaActual: 10, fatigaActual: 10 };
    const r = vitalidadAlSalirDeCombate(s, { pgActual: 3, pgMax: 8, fatigaActual: 6, fatigaMax: 8, danio: { noLetal: 0, letal: 5, grave: 0 } }, topes);
    assert.equal(r.vidaActual, 5);
    assert.equal(r.fatigaActual, 8);
    assert.deepEqual(r.danio, { noLetal: 0, letal: 5, grave: 0 });
  });

  test("si el tope de la ficha es menor que lo perdido, se queda en 0", () => {
    const s = { ...defaultSheet(), vidaActual: 10, fatigaActual: 10 };
    const r = vitalidadAlSalirDeCombate(s, { pgActual: 2, pgMax: 12, fatigaActual: 1, fatigaMax: 12, danio: { noLetal: 0, letal: 0, grave: 10 } }, { vida: 8, fatiga: 5 });
    assert.equal(r.vidaActual, 0);
    assert.equal(r.fatigaActual, 0);
  });

  test("sin cambios, la misma ficha", () => {
    const s = { ...defaultSheet(), vidaActual: 7, fatigaActual: 4, danio: { noLetal: 0, letal: 3, grave: 0 } };
    assert.equal(vitalidadAlSalirDeCombate(s, { pgActual: 7, pgMax: 10, fatigaActual: 4, fatigaMax: 10, danio: { noLetal: 0, letal: 3, grave: 0 } }, topes), s);
  });
});
