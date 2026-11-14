import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { enlaceDeCombatiente, hayVueltaAlCombate } from "./navegacionCombate";

describe("hayVueltaAlCombate", () => {
  test("el máster, con un combate preparándose o en curso", () => {
    assert.equal(hayVueltaAlCombate("MASTER", "PREPARANDO"), true);
    assert.equal(hayVueltaAlCombate("MASTER", "EN_CURSO"), true);
  });

  test("sin combate abierto, o siendo jugador, no", () => {
    for (const estado of [null, undefined, "TERMINADO"] as const) assert.equal(hayVueltaAlCombate("MASTER", estado), false);
    for (const estado of ["PREPARANDO", "EN_CURSO"] as const) assert.equal(hayVueltaAlCombate("PLAYER", estado), false);
  });
});

describe("enlaceDeCombatiente", () => {
  test("un jugador va a su ficha", () => {
    assert.deepEqual(enlaceDeCombatiente({ characterId: "c1", npcTemplateId: null }), { href: "/characters/c1", label: "Ficha" });
  });

  test("un NPC, a su plantilla", () => {
    assert.deepEqual(enlaceDeCombatiente({ characterId: null, npcTemplateId: "n1" }), { href: "/master/npcs/n1", label: "Plantilla" });
  });

  test("sin ninguno, nada", () => {
    assert.equal(enlaceDeCombatiente({ characterId: null, npcTemplateId: null }), null);
  });
});
