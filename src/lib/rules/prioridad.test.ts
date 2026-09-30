import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  prioridadesVacias,
  setLetra,
  letrasDisponibles,
  letrasUsadas,
  repartoCompleto,
  costeMarginal,
  costeTotal,
  CATEGORIAS_PRIORIDAD,
  PUNTOS_ATRIBUTOS_POR_LETRA,
} from "./prioridad";

describe("reparto de letras", () => {
  test("vacío: todas las letras están disponibles en cualquier categoría", () => {
    const p = prioridadesVacias();
    assert.deepEqual(letrasDisponibles(p, "atributos"), ["A", "B", "C", "D", "E", "S+"]);
    assert.equal(repartoCompleto(p), false);
  });

  test("S+ (pruebas) se repite en todas las categorías y completa el reparto", () => {
    let p = prioridadesVacias();
    for (const c of CATEGORIAS_PRIORIDAD) p = setLetra(p, c, "S+");
    assert.ok(CATEGORIAS_PRIORIDAD.every((c) => p[c] === "S+"));
    assert.ok(letrasDisponibles(p, "atributos").includes("S+"));
    assert.equal(repartoCompleto(p), true);
    assert.equal(PUNTOS_ATRIBUTOS_POR_LETRA["S+"], Infinity);
  });

  test("asignar una letra la quita de las demás categorías", () => {
    let p = prioridadesVacias();
    p = setLetra(p, "atributos", "A");
    p = setLetra(p, "habilidades", "A"); // la reclama aquí...
    assert.equal(p.atributos, null); // ...y se suelta de donde estaba
    assert.equal(p.habilidades, "A");
  });

  test("letrasDisponibles incluye la propia letra actual de la categoría", () => {
    let p = prioridadesVacias();
    p = setLetra(p, "recursos", "C");
    assert.ok(letrasDisponibles(p, "recursos").includes("C"));
  });

  test("reparto completo: las 5 categorías con las 5 letras, sin repetir", () => {
    let p = prioridadesVacias();
    const letras = ["A", "B", "C", "D", "E"] as const;
    CATEGORIAS_PRIORIDAD.forEach((cat, i) => {
      p = setLetra(p, cat, letras[i]);
    });
    assert.equal(repartoCompleto(p), true);
    assert.equal(letrasUsadas(p).length, 5);
  });
});

describe("coste por nivel (docs/sistema.md, Coste y progresión)", () => {
  test("coste marginal de subir a nivel N es N × factor", () => {
    assert.equal(costeMarginal(1, 2), 2);
    assert.equal(costeMarginal(5, 2), 10);
    assert.equal(costeMarginal(3, 1), 3);
    assert.equal(costeMarginal(0, 2), 0);
  });

  test("coste total triangular hasta nivel 5, atributos (factor 2) = 30", () => {
    assert.equal(costeTotal(5, 2), 30); // 2+4+6+8+10
  });

  test("coste total triangular hasta nivel 5, habilidades (factor 1) = 15", () => {
    assert.equal(costeTotal(5, 1), 15); // 1+2+3+4+5
  });

  test("coste total triangular hasta nivel 5, psiónica (factor 3) = 45", () => {
    assert.equal(costeTotal(5, 3), 45); // 3+6+9+12+15
  });

  test("valor 0 o negativo no cuesta nada", () => {
    assert.equal(costeTotal(0, 2), 0);
    assert.equal(costeTotal(-1, 2), 0);
  });
});
