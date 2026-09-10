import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { umbralSalud, umbralFatiga, modificadoresDeUmbrales, modificadoresDeEstados } from "./estados";

// PG/fatiga máx = 20 da fronteras limpias: 50%→10, 25%→5, 10%→2 (el "mínimo
// 1" de S15 solo entra en juego con máximos bajos, ver el describe de abajo).
describe("umbralSalud: las fronteras exactas (PG máx = 20)", () => {
  test("10/20 — exacto en el 50%, todavía normal (la banda es estricta)", () => {
    assert.equal(umbralSalud(10, 20), "normal");
  });
  test("9/20 — cruza el 50%, herido", () => {
    assert.equal(umbralSalud(9, 20), "herido");
  });
  test("5/20 — exacto en el 25%, todavía solo herido", () => {
    assert.equal(umbralSalud(5, 20), "herido");
  });
  test("4/20 — cruza el 25%, malherido", () => {
    assert.equal(umbralSalud(4, 20), "malherido");
  });
  test("2/20 — exacto en el 10%, todavía solo malherido", () => {
    assert.equal(umbralSalud(2, 20), "malherido");
  });
  test("1/20 — cruza el 10%, moribundo", () => {
    assert.equal(umbralSalud(1, 20), "moribundo");
  });
  test("0/20 — sin PG, sigue clasificando como moribundo (inconsciente es otro estado, fuera de este motor)", () => {
    assert.equal(umbralSalud(0, 20), "moribundo");
  });
});

describe("umbralSalud: el 'mínimo 1' (S15) con un máximo bajo", () => {
  // PG máx = 8: el 10% son 0,8 puntos. Sin el mínimo, la banda de Moribundo
  // nunca se cruzaría antes de llegar a 0 (que es un estado distinto).
  test("con PG máx = 8, entra en moribundo con 1 punto, no hace falta llegar a 0", () => {
    assert.equal(umbralSalud(1, 8), "moribundo");
  });
});

describe("umbralFatiga: mismas fronteras, fatiga máx = 20", () => {
  test("5/20 — todavía normal", () => assert.equal(umbralFatiga(5, 20), "normal"));
  test("4/20 — fatigado", () => assert.equal(umbralFatiga(4, 20), "fatigado"));
  test("2/20 — todavía solo fatigado", () => assert.equal(umbralFatiga(2, 20), "fatigado"));
  test("1/20 — exhausto", () => assert.equal(umbralFatiga(1, 20), "exhausto"));
});

describe("casos borde", () => {
  test("máximo 0 nunca revienta, siempre normal", () => {
    assert.equal(umbralSalud(0, 0), "normal");
    assert.equal(umbralFatiga(0, 0), "normal");
  });
});

describe("modificadoresDeUmbrales (S14: no se acumulan dentro del mismo recurso)", () => {
  test("a full PG y fatiga, no hay penalizador", () => {
    assert.deepEqual(modificadoresDeUmbrales(20, 20, 20, 20), []);
  });

  test("malherido da solo su -3, no se suma al -1 de herido", () => {
    const mods = modificadoresDeUmbrales(4, 20, 20, 20);
    assert.equal(mods.length, 1);
    assert.deepEqual(mods[0], {
      tipo: "tirada",
      alcance: { tipo: "todas" },
      valor: -3,
      origen: "estado",
      fuente: "Malherido",
    });
  });

  test("PG y fatiga son independientes: herido + fatigado suman sus dos penalizadores", () => {
    const mods = modificadoresDeUmbrales(9, 20, 4, 20);
    assert.equal(mods.length, 2);
    assert.ok(mods.find((m) => m.fuente === "Herido" && m.valor === -1));
    assert.ok(mods.find((m) => m.fuente === "Fatigado" && m.valor === -1));
  });
});

describe("modificadoresDeEstados: estados del catálogo aplicados a un combatiente", () => {
  test("sin estados activos, sin modificadores", () => {
    assert.deepEqual(modificadoresDeEstados([]), []);
  });

  test("un estado real con grado real trae sus modificadores, con origen 'estado'", () => {
    const mods = modificadoresDeEstados([
      { estadoId: "aturdido", gradoId: "exito", rondasRestantes: 1 },
    ]);
    assert.deepEqual(mods, [
      {
        tipo: "tirada",
        alcance: { tipo: "todas" },
        valor: -1,
        origen: "estado",
        fuente: "Aturdido",
      },
    ]);
  });

  test("varios estados activos se combinan", () => {
    const mods = modificadoresDeEstados([
      { estadoId: "aturdido", gradoId: "exito", rondasRestantes: 1 },
      { estadoId: "paralisis", gradoId: "fracaso", rondasRestantes: 1 },
    ]);
    // -1 a todas (aturdido) + fuerza -4 + agilidad -4 (parálisis)
    assert.equal(mods.length, 3);
    assert.ok(mods.some((m) => m.fuente === "Aturdido" && m.valor === -1));
    assert.ok(mods.filter((m) => m.fuente === "Parálisis").length === 2);
  });

  test("un estadoId que no existe en el catálogo se ignora, no revienta", () => {
    assert.deepEqual(
      modificadoresDeEstados([{ estadoId: "esto-no-existe", gradoId: "fracaso", rondasRestantes: null }]),
      [],
    );
  });

  test("un gradoId que no existe para ese estado se ignora, no revienta", () => {
    assert.deepEqual(
      modificadoresDeEstados([{ estadoId: "aturdido", gradoId: "grado-inventado", rondasRestantes: null }]),
      [],
    );
  });

  test("un estado sin modificadores mecanizados (p. ej. Corrosión) no aporta nada, pero tampoco revienta", () => {
    assert.deepEqual(
      modificadoresDeEstados([{ estadoId: "corrosion", gradoId: "fracaso", rondasRestantes: null }]),
      [],
    );
  });
});
