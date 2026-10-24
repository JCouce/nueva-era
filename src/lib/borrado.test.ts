import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { borradoSuave, fichaTocada } from "./borrado";

const creada = new Date("2026-10-24T12:00:00.000Z");
const despues = new Date("2026-10-24T12:05:00.000Z");

describe("fichaTocada", () => {
  test("recién creada y en creación: virgen", () => {
    assert.equal(fichaTocada({ createdAt: creada, updatedAt: creada, status: "DRAFT" }), false);
  });

  test("cualquier escritura posterior la marca como tocada", () => {
    assert.equal(fichaTocada({ createdAt: creada, updatedAt: despues, status: "DRAFT" }), true);
  });

  test("enviada a revisión o aprobada: siempre tocada", () => {
    assert.equal(fichaTocada({ createdAt: creada, updatedAt: creada, status: "IN_REVIEW" }), true);
    assert.equal(fichaTocada({ createdAt: creada, updatedAt: creada, status: "APPROVED" }), true);
  });
});

describe("borradoSuave", () => {
  const virgen = { createdAt: creada, updatedAt: creada, status: "DRAFT" as const };

  test("virgen y sin combates: borrado de verdad", () => {
    assert.equal(borradoSuave(virgen, 0), false);
  });

  test("virgen pero metida en un combate: soft, para no arrastrar sus combatientes", () => {
    assert.equal(borradoSuave(virgen, 1), true);
  });
});
