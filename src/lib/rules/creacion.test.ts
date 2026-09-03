import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet } from "./sheet";
import { PUNTOS_ATRIBUTOS, ATRIBUTO_MAX_CREACION } from "./atributos";
import { PUNTOS_HABILIDADES, HABILIDAD_MAX_CREACION } from "./habilidades";
import {
  puntosAtributosDisponibles,
  puntosHabilidadesDisponibles,
  costeHabilidad,
  setAtributoValue,
  setHabilidadValue,
  addEspecialidad,
  removeEspecialidad,
  resetBuild,
} from "./creacion";

describe("pool de atributos", () => {
  test("una ficha nueva tiene los 10 puntos intactos", () => {
    assert.equal(puntosAtributosDisponibles(defaultSheet()), PUNTOS_ATRIBUTOS);
  });

  test("el coste de un atributo es su propio valor", () => {
    let s = defaultSheet();
    s = setAtributoValue(s, "fuerza", 3);
    assert.equal(puntosAtributosDisponibles(s), 7);
  });

  test("bajar a -1 devuelve un punto al pool", () => {
    let s = defaultSheet();
    s = setAtributoValue(s, "caracter", -1);
    assert.equal(puntosAtributosDisponibles(s), PUNTOS_ATRIBUTOS + 1);
  });

  test("no se puede gastar más de lo que hay", () => {
    let s = defaultSheet();
    s = setAtributoValue(s, "fuerza", 4);
    s = setAtributoValue(s, "agilidad", 4);
    const antes = s.atributos.aguante;
    s = setAtributoValue(s, "aguante", 4); // 12 puntos: no cabe
    assert.equal(s.atributos.aguante, antes, "el cambio se rechaza entero");
    assert.ok(puntosAtributosDisponibles(s) >= 0);
  });

  test("no se pasa del máximo de creación", () => {
    const s = setAtributoValue(defaultSheet(), "fuerza", 9);
    assert.equal(s.atributos.fuerza, ATRIBUTO_MAX_CREACION);
  });

  test("bajar siempre vale: el respec es gratis", () => {
    let s = setAtributoValue(defaultSheet(), "fuerza", 4);
    s = setAtributoValue(s, "fuerza", 1);
    assert.equal(s.atributos.fuerza, 1);
    assert.equal(puntosAtributosDisponibles(s), 9);
  });
});

describe("pool de habilidades", () => {
  test("una habilidad sin entrenar no cuesta nada", () => {
    assert.equal(costeHabilidad(-1, 0), 0);
    assert.equal(puntosHabilidadesDisponibles(defaultSheet()), PUNTOS_HABILIDADES);
  });

  test("la primera especialidad va incluida; la segunda cuesta 1", () => {
    assert.equal(costeHabilidad(2, 1), 2);
    assert.equal(costeHabilidad(2, 2), 3);
    assert.equal(costeHabilidad(2, 3), 4);
  });

  test("entrenar descuenta el valor del pool", () => {
    const s = setHabilidadValue(defaultSheet(), "sigilo", 3);
    assert.equal(puntosHabilidadesDisponibles(s), PUNTOS_HABILIDADES - 3);
  });

  test("no se pasa del máximo de creación", () => {
    const s = setHabilidadValue(defaultSheet(), "sigilo", 5);
    assert.equal(s.habilidades.sigilo.valor, HABILIDAD_MAX_CREACION);
  });

  test("0 no es un estado válido: se cae a sin entrenar", () => {
    let s = setHabilidadValue(defaultSheet(), "sigilo", 2);
    s = setHabilidadValue(s, "sigilo", 0);
    assert.equal(s.habilidades.sigilo.valor, -1);
  });

  test("dejar de entrenar borra las especialidades", () => {
    let s = setHabilidadValue(defaultSheet(), "sigilo", 2);
    s = addEspecialidad(s, "sigilo", "Urbano");
    s = setHabilidadValue(s, "sigilo", -1);
    assert.deepEqual(s.habilidades.sigilo.especialidades, []);
    assert.equal(puntosHabilidadesDisponibles(s), PUNTOS_HABILIDADES);
  });
});

describe("especialidades", () => {
  test("no se pueden añadir a una habilidad sin entrenar", () => {
    const s = addEspecialidad(defaultSheet(), "cultura", "Historia");
    assert.deepEqual(s.habilidades.cultura.especialidades, []);
  });

  test("no se duplican, ignorando mayúsculas", () => {
    let s = setHabilidadValue(defaultSheet(), "biociencia", 2);
    s = addEspecialidad(s, "biociencia", "Medicina");
    s = addEspecialidad(s, "biociencia", "medicina");
    assert.deepEqual(s.habilidades.biociencia.especialidades, ["Medicina"]);
  });

  test("se rechazan si no quedan puntos para pagarlas", () => {
    let s = setHabilidadValue(defaultSheet(), "atletismo", 3);
    s = setHabilidadValue(s, "sigilo", 3);
    s = setHabilidadValue(s, "cultura", 3);
    s = addEspecialidad(s, "atletismo", "Carrera"); // gratis, la primera
    s = addEspecialidad(s, "sigilo", "Urbano"); // gratis
    s = addEspecialidad(s, "cultura", "Historia"); // gratis → 9 puntos gastados
    s = addEspecialidad(s, "atletismo", "Salto"); // cuesta 1 → 10, entra justa
    assert.equal(puntosHabilidadesDisponibles(s), 0);
    s = addEspecialidad(s, "sigilo", "Sombras"); // ya no cabe
    assert.deepEqual(s.habilidades.sigilo.especialidades, ["Urbano"]);
  });

  test("quitar una especialidad devuelve su punto", () => {
    let s = setHabilidadValue(defaultSheet(), "biociencia", 2);
    s = addEspecialidad(s, "biociencia", "Medicina");
    s = addEspecialidad(s, "biociencia", "Química");
    assert.equal(puntosHabilidadesDisponibles(s), PUNTOS_HABILIDADES - 3);
    s = removeEspecialidad(s, "biociencia", "Química");
    assert.equal(puntosHabilidadesDisponibles(s), PUNTOS_HABILIDADES - 2);
  });
});

describe("reset", () => {
  test("devuelve los dos pools y conserva la identidad", () => {
    let s = defaultSheet();
    s = { ...s, especie: "Arkorü", trasfondo: "algo", edad: 40 };
    s = setAtributoValue(s, "fuerza", 3);
    s = setHabilidadValue(s, "sigilo", 2);
    const r = resetBuild(s);
    assert.equal(puntosAtributosDisponibles(r), PUNTOS_ATRIBUTOS);
    assert.equal(puntosHabilidadesDisponibles(r), PUNTOS_HABILIDADES);
    assert.equal(r.especie, "Arkorü");
    assert.equal(r.trasfondo, "algo");
    assert.equal(r.edad, 40);
  });
});
