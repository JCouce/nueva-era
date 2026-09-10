import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { canEditCharacter, canAdjustCombatiente } from "./permisos";

const player = { id: "u1", role: "PLAYER" as const };
const otherPlayer = { id: "u2", role: "PLAYER" as const };
const master = { id: "u3", role: "MASTER" as const };

describe("canEditCharacter", () => {
  test("el dueño puede editar su propia ficha", () => {
    assert.equal(canEditCharacter(player, { ownerId: "u1" }), true);
  });

  test("otro jugador no puede editar una ficha ajena", () => {
    assert.equal(canEditCharacter(otherPlayer, { ownerId: "u1" }), false);
  });

  test("el máster puede editar cualquier ficha, sea o no el dueño", () => {
    assert.equal(canEditCharacter(master, { ownerId: "u1" }), true);
  });
});

describe("canAdjustCombatiente (fase 6b, D2: el jugador solo toca su propio combatiente)", () => {
  test("el dueño del Character puede ajustar su propio combatiente", () => {
    assert.equal(canAdjustCombatiente(player, { character: { ownerId: "u1" } }), true);
  });

  test("otro jugador no puede ajustar un combatiente que no es suyo", () => {
    assert.equal(canAdjustCombatiente(otherPlayer, { character: { ownerId: "u1" } }), false);
  });

  test("el máster puede ajustar cualquier combatiente ligado a un Character", () => {
    assert.equal(canAdjustCombatiente(master, { character: { ownerId: "u1" } }), true);
  });

  test("un combatiente sin Character (NPC ad-hoc o de catálogo) no tiene dueño: solo el máster", () => {
    assert.equal(canAdjustCombatiente(player, { character: null }), false);
    assert.equal(canAdjustCombatiente(master, { character: null }), true);
  });
});
