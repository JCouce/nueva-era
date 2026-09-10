import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet } from "./sheet";
import { HABILIDAD_MAX_CREACION } from "./habilidades";
import { PUNTOS_ATRIBUTOS_POR_LETRA, PUNTOS_HABILIDADES_POR_LETRA } from "./prioridad";
import {
  puntosAtributosDisponibles,
  puntosHabilidadesDisponibles,
  costeHabilidad,
  setAtributoValue,
  setHabilidadValue,
  addEspecialidad,
  removeEspecialidad,
  resetBuild,
  setPrioridad,
} from "./creacion";

// Atajos para no repetir setPrioridad en cada test.
const conLetraAtributos = (letra: "A" | "B" | "C" | "D" | "E") =>
  setPrioridad(defaultSheet(), "atributos", letra);
const conLetraHabilidades = (letra: "A" | "B" | "C" | "D" | "E") =>
  setPrioridad(defaultSheet(), "habilidades", letra);

describe("pool de atributos: depende de la letra de prioridad", () => {
  test("sin letra asignada, el pool es 0 — no hay nada que gastar todavía", () => {
    assert.equal(puntosAtributosDisponibles(defaultSheet()), 0);
  });

  test("la letra fija el presupuesto, no un pool plano de 10", () => {
    assert.equal(puntosAtributosDisponibles(conLetraAtributos("D")), PUNTOS_ATRIBUTOS_POR_LETRA.D);
    assert.equal(puntosAtributosDisponibles(conLetraAtributos("A")), 18);
    assert.equal(puntosAtributosDisponibles(conLetraAtributos("E")), 8);
  });
});

describe("coste de un atributo: triangular, Nivel × 2 (docs/sistema.md, Coste y progresión)", () => {
  test("subir a 1 cuesta 2; a 2, 6 en total; a 3, 12 en total", () => {
    let s = conLetraAtributos("A"); // 18 pts, de sobra para este recorrido
    s = setAtributoValue(s, "fuerza", 1);
    assert.equal(puntosAtributosDisponibles(s), 16); // 18 - 2
    s = setAtributoValue(s, "fuerza", 2);
    assert.equal(puntosAtributosDisponibles(s), 12); // 18 - 6
    s = setAtributoValue(s, "fuerza", 3);
    assert.equal(puntosAtributosDisponibles(s), 6); // 18 - 12
  });

  test("bajar a -1 sigue devolviendo 1 punto (regla de HOJA, sin tocar por HOJA2)", () => {
    const s = setAtributoValue(conLetraAtributos("D"), "caracter", -1);
    assert.equal(puntosAtributosDisponibles(s), PUNTOS_ATRIBUTOS_POR_LETRA.D + 1);
  });

  test("no se puede gastar más de lo que da la letra", () => {
    let s = conLetraAtributos("E"); // 8 pts: no llega a los 12 que cuesta un 3
    s = setAtributoValue(s, "fuerza", 3);
    assert.equal(s.atributos.fuerza, 0, "el cambio se rechaza entero");
    assert.ok(puntosAtributosDisponibles(s) >= 0);
  });

  test("bajar siempre vale: el respec es gratis", () => {
    let s = setAtributoValue(conLetraAtributos("A"), "fuerza", 3); // cuesta 12
    s = setAtributoValue(s, "fuerza", 1); // vuelve a costar solo 2
    assert.equal(s.atributos.fuerza, 1);
    assert.equal(puntosAtributosDisponibles(s), 16);
  });
});

describe("pool de habilidades: misma idea, factor × 1", () => {
  test("sin letra, pool 0; con letra, el presupuesto de la tabla", () => {
    assert.equal(puntosHabilidadesDisponibles(defaultSheet()), 0);
    assert.equal(
      puntosHabilidadesDisponibles(conLetraHabilidades("D")),
      PUNTOS_HABILIDADES_POR_LETRA.D,
    );
  });

  test("una habilidad sin entrenar no cuesta nada", () => {
    assert.equal(costeHabilidad(-1, 0), 0);
  });

  test("coste triangular: 1 cuesta 1, 2 cuesta 3 en total, 3 cuesta 6", () => {
    assert.equal(costeHabilidad(1, 1), 1);
    assert.equal(costeHabilidad(2, 1), 3);
    assert.equal(costeHabilidad(3, 1), 6);
  });

  test("la primera especialidad va incluida; a partir de la segunda cuesta 1 más", () => {
    assert.equal(costeHabilidad(2, 1), 3); // solo el triangular, la 1ª no suma
    assert.equal(costeHabilidad(2, 2), 4); // +1 por la 2ª
    assert.equal(costeHabilidad(2, 3), 5); // +1 por la 3ª
  });

  test("entrenar descuenta el coste triangular del pool", () => {
    const s = setHabilidadValue(conLetraHabilidades("D"), "sigilo", 3); // cuesta 6
    assert.equal(puntosHabilidadesDisponibles(s), PUNTOS_HABILIDADES_POR_LETRA.D - 6);
  });

  test("no se pasa del máximo de creación (4, HOJA2)", () => {
    const s = setHabilidadValue(conLetraHabilidades("A"), "sigilo", 9);
    assert.equal(s.habilidades.sigilo.valor, HABILIDAD_MAX_CREACION);
  });

  test("0 no es un estado válido: se cae a sin entrenar", () => {
    let s = setHabilidadValue(conLetraHabilidades("D"), "sigilo", 2);
    s = setHabilidadValue(s, "sigilo", 0);
    assert.equal(s.habilidades.sigilo.valor, -1);
  });

  test("dejar de entrenar borra las especialidades y libera el pool entero", () => {
    let s = setHabilidadValue(conLetraHabilidades("D"), "sigilo", 2);
    s = addEspecialidad(s, "sigilo", "Urbano");
    s = setHabilidadValue(s, "sigilo", -1);
    assert.deepEqual(s.habilidades.sigilo.especialidades, []);
    assert.equal(puntosHabilidadesDisponibles(s), PUNTOS_HABILIDADES_POR_LETRA.D);
  });
});

describe("especialidades", () => {
  test("no se pueden añadir a una habilidad sin entrenar", () => {
    const s = addEspecialidad(conLetraHabilidades("A"), "cultura", "Historia");
    assert.deepEqual(s.habilidades.cultura.especialidades, []);
  });

  test("no se duplican, ignorando mayúsculas", () => {
    let s = setHabilidadValue(conLetraHabilidades("A"), "biociencia", 2);
    s = addEspecialidad(s, "biociencia", "Medicina");
    s = addEspecialidad(s, "biociencia", "medicina");
    assert.deepEqual(s.habilidades.biociencia.especialidades, ["Medicina"]);
  });

  test("se rechazan si no quedan puntos para pagarlas", () => {
    let s = conLetraHabilidades("E"); // 6 pts: presupuesto ajustado a propósito
    s = setHabilidadValue(s, "atletismo", 1); // -1
    s = setHabilidadValue(s, "sigilo", 1); // -1
    s = setHabilidadValue(s, "cultura", 1); // -1 → 3 disponibles
    s = addEspecialidad(s, "atletismo", "Carrera"); // gratis, la primera
    s = addEspecialidad(s, "sigilo", "Urbano"); // gratis
    s = addEspecialidad(s, "cultura", "Historia"); // gratis → siguen 3 disponibles
    s = addEspecialidad(s, "atletismo", "Salto"); // -1 → 2
    s = addEspecialidad(s, "sigilo", "Sombras"); // -1 → 1
    s = addEspecialidad(s, "cultura", "Geografía"); // -1 → 0, entra justa
    assert.equal(puntosHabilidadesDisponibles(s), 0);
    s = addEspecialidad(s, "atletismo", "Trepa"); // ya no cabe
    assert.deepEqual(s.habilidades.atletismo.especialidades, ["Carrera", "Salto"]);
  });

  test("quitar una especialidad devuelve su punto", () => {
    let s = setHabilidadValue(conLetraHabilidades("D"), "biociencia", 2); // cuesta 3
    s = addEspecialidad(s, "biociencia", "Medicina"); // gratis
    s = addEspecialidad(s, "biociencia", "Química"); // -1
    assert.equal(puntosHabilidadesDisponibles(s), PUNTOS_HABILIDADES_POR_LETRA.D - 4);
    s = removeEspecialidad(s, "biociencia", "Química");
    assert.equal(puntosHabilidadesDisponibles(s), PUNTOS_HABILIDADES_POR_LETRA.D - 3);
  });
});

describe("reset", () => {
  test("devuelve los dos pools enteros (la letra no se toca) y conserva la identidad", () => {
    // Letras distintas a propósito: no se pueden repetir entre categorías.
    let s = setPrioridad(setPrioridad(defaultSheet(), "atributos", "A"), "habilidades", "B");
    s = { ...s, especieId: "arkoru", trasfondo: "algo", edad: 40 };
    s = setAtributoValue(s, "fuerza", 3);
    s = setHabilidadValue(s, "sigilo", 2);
    const r = resetBuild(s);
    assert.equal(puntosAtributosDisponibles(r), PUNTOS_ATRIBUTOS_POR_LETRA.A);
    assert.equal(puntosHabilidadesDisponibles(r), PUNTOS_HABILIDADES_POR_LETRA.B);
    assert.equal(r.prioridades.atributos, "A", "resetear el build no toca las letras");
    assert.equal(r.especieId, "arkoru");
    assert.equal(r.trasfondo, "algo");
    assert.equal(r.edad, 40);
  });
});
