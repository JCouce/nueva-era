import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet } from "./sheet";
import { setAtributoValue, setHabilidadValue, setPrioridad } from "./creacion";

// Sin letra de prioridad asignada, el pool de creación es 0 — para estos
// tests hace falta una ficha con presupuesto de sobra.
function conPresupuesto() {
  return setPrioridad(setPrioridad(defaultSheet(), "atributos", "A"), "habilidades", "B");
}
import {
  snapshotFromSheet,
  parseSnapshot,
  aplicarSueloAtributo,
  aplicarSueloHabilidad,
} from "./aprobacion";

describe("snapshot de aprobación", () => {
  test("congela los valores actuales de atributos y habilidades", () => {
    let s = conPresupuesto();
    s = setAtributoValue(s, "fuerza", 3);
    s = setHabilidadValue(s, "sigilo", 2);
    const snap = snapshotFromSheet(s);
    assert.equal(snap.atributos.fuerza, 3);
    assert.equal(snap.habilidades.sigilo, 2);
  });

  test("no incluye especialidades: no cuestan puntos, no son parte del suelo", () => {
    const s = defaultSheet();
    const snap = snapshotFromSheet(s);
    assert.equal("especialidades" in snap.habilidades, false);
  });
});

describe("parseSnapshot, tolerante como parseSheet", () => {
  test("acepta un snapshot bien formado", () => {
    const snap = snapshotFromSheet(defaultSheet());
    assert.deepEqual(parseSnapshot(snap), snap);
  });

  test("null, undefined o basura devuelven null en vez de reventar", () => {
    assert.equal(parseSnapshot(null), null);
    assert.equal(parseSnapshot(undefined), null);
    assert.equal(parseSnapshot({ atributos: "no" }), null);
    assert.equal(parseSnapshot(42), null);
  });
});

describe("aplicarSueloAtributo / aplicarSueloHabilidad", () => {
  test("sin snapshot, no hay suelo: el valor pasa tal cual", () => {
    assert.equal(aplicarSueloAtributo(-1, "fuerza", null), -1);
  });

  test("con snapshot, no deja bajar del valor congelado", () => {
    let s = conPresupuesto();
    s = setAtributoValue(s, "fuerza", 3);
    const snap = snapshotFromSheet(s);
    assert.equal(aplicarSueloAtributo(0, "fuerza", snap), 3, "sube al suelo");
    assert.equal(aplicarSueloAtributo(4, "fuerza", snap), 4, "subir por encima no se toca aquí");
  });

  test("mismo comportamiento para habilidades", () => {
    let s = conPresupuesto();
    s = setHabilidadValue(s, "sigilo", 2);
    const snap = snapshotFromSheet(s);
    assert.equal(aplicarSueloHabilidad(-1, "sigilo", snap), 2);
    assert.equal(aplicarSueloHabilidad(3, "sigilo", snap), 3);
  });

  test("un atributo que no estaba en el snapshot original no rompe (suelo 0 por defecto de sheet)", () => {
    const snap = snapshotFromSheet(defaultSheet());
    // aguante nunca se tocó: su suelo es el valor por defecto, 0.
    assert.equal(aplicarSueloAtributo(-1, "aguante", snap), 0);
  });
});
