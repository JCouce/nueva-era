import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ESTADOS, estadoPorId } from "./estados";

// Mismo motivo que equipo.test.ts: con 20 estados y hasta 4 grados cada uno,
// un id duplicado o un grado sin modificadores por descuido se cuela fácil.
describe("integridad del catálogo de estados", () => {
  test("son los 20 que cita docs/sistema.md §7 (Fatiga/Heridas/Muerte no cuentan aparte)", () => {
    assert.equal(ESTADOS.length, 20);
  });

  test("no hay ids de estado repetidos", () => {
    const ids = ESTADOS.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length, "hay un id de estado duplicado");
  });

  test("estadoPorId encuentra cada estado por su propio id", () => {
    for (const e of ESTADOS) {
      assert.equal(estadoPorId(e.id)?.id, e.id);
    }
  });

  test("estadoPorId con un id que no existe no revienta", () => {
    assert.equal(estadoPorId("esto-no-existe"), null);
  });

  test("todo estado tiene al menos un grado", () => {
    for (const e of ESTADOS) {
      assert.ok(e.grados.length > 0, `${e.label} no tiene ningún grado`);
    }
  });

  test("no hay ids de grado repetidos dentro del mismo estado", () => {
    for (const e of ESTADOS) {
      const ids = e.grados.map((g) => g.id);
      assert.equal(new Set(ids).size, ids.length, `${e.label} tiene un grado con id duplicado`);
    }
  });

  test("todo grado trae detalle (nunca se queda mudo)", () => {
    for (const e of ESTADOS) {
      for (const g of e.grados) {
        assert.ok(g.detalle.length > 0, `${e.label} / ${g.label} no tiene detalle`);
      }
    }
  });
});

describe("un par de estados a mano, para pillar un typo en los modificadores", () => {
  test("parálisis: fracaso baja Fuerza y Agilidad -4, éxito crítico no baja nada", () => {
    const paralisis = estadoPorId("paralisis")!;
    const fracaso = paralisis.grados.find((g) => g.id === "fracaso")!;
    assert.deepEqual(fracaso.modificadores, [
      { tipo: "atributo", id: "fuerza", valor: -4 },
      { tipo: "atributo", id: "agilidad", valor: -4 },
    ]);
    const exitoCritico = paralisis.grados.find((g) => g.id === "exito_critico")!;
    assert.deepEqual(exitoCritico.modificadores, []);
  });

  test("enfermedad: nivel 5 es muerte, sin modificador que aplicar", () => {
    const enfermedad = estadoPorId("enfermedad")!;
    const nivel5 = enfermedad.grados.find((g) => g.id === "nivel_5")!;
    assert.deepEqual(nivel5.modificadores, []);
    assert.deepEqual(nivel5.detalle, ["Muerte."]);
  });

  test("envenenamiento: el penalizador a todas las tiradas escala con el nivel", () => {
    const veneno = estadoPorId("envenenamiento")!;
    const valores = ["nivel_1", "nivel_2", "nivel_3", "nivel_4"].map((id) => {
      const g = veneno.grados.find((gr) => gr.id === id)!;
      assert.equal(g.modificadores.length, 1);
      return g.modificadores[0].valor;
    });
    assert.deepEqual(valores, [-1, -2, -3, -4]);
  });
});
