import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  parseSheet,
  defaultSheet,
  sheetSchema,
  SCHEMA_VERSION,
} from "./sheet";
import { ATRIBUTOS } from "./atributos";
import { HABILIDADES } from "./habilidades";

describe("parseSheet aguanta cualquier cosa", () => {
  test("null, undefined y basura devuelven la ficha por defecto", () => {
    for (const basura of [null, undefined, 42, "texto", [], true]) {
      assert.deepEqual(parseSheet(basura), defaultSheet());
    }
  });

  test("una ficha vacía se rellena entera", () => {
    const s = parseSheet({});
    assert.equal(Object.keys(s.atributos).length, ATRIBUTOS.length);
    assert.equal(Object.keys(s.habilidades).length, HABILIDADES.length);
  });

  test("los valores fuera de rango se recortan", () => {
    const s = parseSheet({ atributos: { fuerza: 99, agilidad: -50 } });
    assert.equal(s.atributos.fuerza, 5); // ATRIBUTO_MAX
    assert.equal(s.atributos.agilidad, -1); // ATRIBUTO_MIN
  });

  test("una habilidad sin entrenar no conserva especialidades", () => {
    const s = parseSheet({
      habilidades: { sigilo: { valor: -1, especialidades: ["Urbano"] } },
    });
    assert.deepEqual(s.habilidades.sigilo.especialidades, []);
  });

  test("se descartan las especialidades vacías y se recorta el exceso", () => {
    const s = parseSheet({
      habilidades: {
        sigilo: { valor: 2, especialidades: ["  ", "A", "B", "C", "D", 7, null] },
      },
    });
    assert.deepEqual(s.habilidades.sigilo.especialidades, ["A", "B", "C"]);
  });

  test("el texto largo se trunca en lugar de reventar la validación", () => {
    const s = parseSheet({ trasfondo: "x".repeat(5000), especie: "y".repeat(200) });
    assert.equal(s.trasfondo.length, 2000);
    assert.equal(s.especie.length, 60);
  });

  test("lo que sale de parseSheet siempre valida contra el esquema", () => {
    const casos: unknown[] = [
      null,
      {},
      { atributos: { fuerza: "tres" } },
      { habilidades: { sigilo: { valor: 99, especialidades: "no es lista" } } },
      { edad: -5, schemaVersion: 0 },
    ];
    for (const c of casos) {
      assert.doesNotThrow(() => sheetSchema.parse(parseSheet(c)));
    }
  });
});

describe("versión del esquema", () => {
  test("una ficha nueva nace con la versión actual", () => {
    assert.equal(defaultSheet().schemaVersion, SCHEMA_VERSION);
  });

  test("una ficha sin versión (anterior al versionado) recibe la actual", () => {
    // Provisional: mientras no haya migraciones, se asume que las fichas viejas
    // ya tienen la forma actual. Al añadir la primera migración esto cambia.
    assert.equal(parseSheet({}).schemaVersion, SCHEMA_VERSION);
  });

  test("no se acepta una versión del futuro", () => {
    assert.equal(parseSheet({ schemaVersion: 99 }).schemaVersion, SCHEMA_VERSION);
  });
});
