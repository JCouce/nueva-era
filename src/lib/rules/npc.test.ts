import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { creditosInvertidos, experienciaInvertida, poder } from "./npc";

// Sin point-buy: un NPC se edita directo (docs/fase-6b.md, "Catálogo de NPCs
// — rediseño"), así que estos tests mutan el Sheet a mano en vez de pasar
// por setAtributoValue/setHabilidadValue (que respetan el pool de creación
// y no sirven aquí — ver el hallazgo real anotado en la subtarea 5.0).
function conAtributo(id: keyof Sheet["atributos"], valor: number): Sheet {
  const s = defaultSheet();
  return { ...s, atributos: { ...s.atributos, [id]: valor } };
}
function conHabilidad(id: keyof Sheet["habilidades"], valor: number): Sheet {
  const s = defaultSheet();
  return { ...s, habilidades: { ...s.habilidades, [id]: { valor, especialidades: [] } } };
}

describe("experienciaInvertida: coste triangular, mismo que el point-buy de creación", () => {
  test("ficha por defecto (todo en base), sin experiencia invertida", () => {
    assert.equal(experienciaInvertida(defaultSheet()), 0);
  });

  test("un atributo en 2 cuesta su triangular ×2 (factor de atributo)", () => {
    assert.equal(experienciaInvertida(conAtributo("fuerza", 2)), 6); // (1+2)×2
  });

  test("una habilidad entrenada a 2 cuesta su triangular ×1 (factor de habilidad)", () => {
    assert.equal(experienciaInvertida(conHabilidad("atletismo", 2)), 3); // (1+2)×1
  });

  test("un atributo bajado a su mínimo (-1) no resta — cuenta como 0, no como negativo", () => {
    assert.equal(experienciaInvertida(conAtributo("fuerza", -1)), 0);
  });

  test("una habilidad sin entrenar (-1, el default) no aporta nada", () => {
    assert.equal(experienciaInvertida(defaultSheet()), 0);
  });
});

describe("creditosInvertidos: suma el coste de cada pieza equipada", () => {
  test("sin equipo, cero", () => {
    assert.equal(creditosInvertidos(defaultSheet()), 0);
  });

  test("una pieza real del catálogo suma su coste", () => {
    const s = defaultSheet();
    const conArma: Sheet = {
      ...s,
      equipo: [{ instanciaId: "a1", catalogoId: "pistola_mosquito" }],
    };
    assert.equal(creditosInvertidos(conArma), 100);
  });
});

describe("poder: experiencia + créditos/100", () => {
  test("ficha por defecto, poder 0", () => {
    assert.equal(poder(defaultSheet()), 0);
  });

  test("combina atributos, habilidades y equipo", () => {
    let s = conAtributo("fuerza", 2); // 6 puntos
    s = { ...s, habilidades: conHabilidad("atletismo", 2).habilidades }; // 3 puntos
    s = { ...s, equipo: [{ instanciaId: "a1", catalogoId: "pistola_mosquito" }] }; // 100 créditos = 1
    assert.equal(poder(s), 10); // 6 + 3 + 1
  });
});
