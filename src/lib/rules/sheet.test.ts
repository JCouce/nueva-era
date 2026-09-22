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
    assert.equal(s.atributos.fuerza, 6); // ATRIBUTO_MAX (HOJA2: 6, no 5)
    assert.equal(s.atributos.agilidad, -1); // ATRIBUTO_MIN
  });

  test("una letra de prioridad inválida se ignora, no revienta", () => {
    const s = parseSheet({
      schemaVersion: SCHEMA_VERSION,
      prioridades: { atributos: "Z", habilidades: "A" },
    });
    assert.equal(s.prioridades.atributos, null);
    assert.equal(s.prioridades.habilidades, "A");
  });

  test("altura y peso fuera de rango se recortan igual que la edad", () => {
    const s = parseSheet({ schemaVersion: SCHEMA_VERSION, altura: -5, peso: 9999 });
    assert.equal(s.altura, 0);
    assert.equal(s.peso, 999);
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
    const s = parseSheet({ trasfondo: "x".repeat(5000) });
    assert.equal(s.trasfondo.length, 2000);
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

  test("un recurso corrupto se descarta sin tirar el resto por la borda", () => {
    const s = parseSheet({
      schemaVersion: SCHEMA_VERSION,
      // Con una pieza equipada de verdad para "a1" — si no, la reconciliación
      // de RECURSOS (ver recursos.ts) lo descartaría por huérfano, que es el
      // comportamiento correcto pero no lo que este test quiere comprobar.
      equipo: [{ instanciaId: "a1", catalogoId: "pistola_mosquito" }],
      recursos: [
        { instanciaId: "a1", actual: 5, max: 7 },
        { instanciaId: "a1" }, // sin actual/max: inválido
        { actual: -1, max: 10 }, // sin instanciaId: inválido
        "basura",
      ],
    });
    assert.deepEqual(s.recursos, [{ instanciaId: "a1", actual: 5, max: 7 }]);
  });

  test("un recurso huérfano (sin pieza equipada que lo respalde) se limpia solo", () => {
    const s = parseSheet({
      schemaVersion: SCHEMA_VERSION,
      recursos: [{ instanciaId: "ya-no-existe", actual: 3, max: 10 }],
    });
    assert.deepEqual(s.recursos, []);
  });

  test("un arma equipada antes de que existiera RECURSOS se auto-puebla en la primera lectura", () => {
    const s = parseSheet({
      schemaVersion: 5,
      equipo: [{ instanciaId: "vieja", catalogoId: "pistola_mosquito" }],
      // sin campo `recursos` en absoluto — ficha de antes de v6
    });
    assert.deepEqual(s.recursos, [{ instanciaId: "vieja", actual: 7, max: 7 }]);
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
