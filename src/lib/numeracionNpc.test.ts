import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { nombresNumerados } from "./numeracionNpc";

const goblin = { id: "g", nombre: "Goblin" };
const orco = { id: "o", nombre: "Orco" };

describe("nombresNumerados", () => {
  test("el primero de una plantilla lleva número aunque sea el único", () => {
    assert.deepEqual(nombresNumerados([], [goblin]), ["Goblin 1"]);
  });

  test("sigue tras el máximo, sin rellenar huecos", () => {
    const existentes = [
      { nombre: "Goblin 1", npcTemplateId: "g" },
      { nombre: "Goblin 3", npcTemplateId: "g" },
    ];
    assert.deepEqual(nombresNumerados(existentes, [goblin]), ["Goblin 4"]);
  });

  test("en lote, consecutivos en el orden de inserción, también con repetidos", () => {
    const existentes = [{ nombre: "Goblin 2", npcTemplateId: "g" }];
    assert.deepEqual(nombresNumerados(existentes, [goblin, orco, goblin, goblin, orco]), [
      "Goblin 3",
      "Orco 1",
      "Goblin 4",
      "Goblin 5",
      "Orco 2",
    ]);
  });

  test("un nombre renombrado a mano no aporta número", () => {
    const existentes = [
      { nombre: "Goblin 2", npcTemplateId: "g" },
      { nombre: "Jefe goblin", npcTemplateId: "g" },
      { nombre: "Goblin 9 (herido)", npcTemplateId: "g" },
      { nombre: "Goblin", npcTemplateId: "g" },
    ];
    assert.deepEqual(nombresNumerados(existentes, [goblin]), ["Goblin 3"]);
  });

  test("cada plantilla lleva su cuenta, aunque compartan nombre", () => {
    const existentes = [
      { nombre: "Goblin 7", npcTemplateId: "otro-goblin" },
      { nombre: "Orco 2", npcTemplateId: "o" },
      { nombre: "Goblin 5", npcTemplateId: null },
    ];
    assert.deepEqual(nombresNumerados(existentes, [goblin, orco]), ["Goblin 1", "Orco 3"]);
  });

  test("una plantilla cuyo nombre ya acaba en número no se confunde", () => {
    const droide = { id: "d", nombre: "Droide K2" };
    assert.deepEqual(nombresNumerados([], [droide, droide]), ["Droide K2 1", "Droide K2 2"]);
    const existentes = [
      { nombre: "Droide K2", npcTemplateId: "d" },
      { nombre: "Droide K2 1", npcTemplateId: "d" },
    ];
    assert.deepEqual(nombresNumerados(existentes, [droide]), ["Droide K2 2"]);
  });

  test("caracteres de regex en el nombre de la plantilla se toman literales", () => {
    const raro = { id: "r", nombre: "Mk.II (x+)" };
    const existentes = [
      { nombre: "Mk.II (x+) 4", npcTemplateId: "r" },
      { nombre: "MkXII (x+) 9", npcTemplateId: "r" },
    ];
    assert.deepEqual(nombresNumerados(existentes, [raro]), ["Mk.II (x+) 5"]);
  });
});
