import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ESTADOS, estadoPorId } from "./estados";

// Mismo motivo que equipo.test.ts: con 20 estados y hasta 4 grados cada uno,
// un id duplicado o un grado sin modificadores por descuido se cuela fácil.
describe("integridad del catálogo de estados", () => {
  // 20 del documento + Supresores y Dosis acumulada, de la munición especial (cuestionario eq-22),
  // + Shock en el equipo (S73: el Shock del documento se parte en cuerpo y equipo, pl-01).
  test("son los 20 que cita docs/sistema.md §7 (Fatiga/Heridas/Muerte no cuentan aparte) más los 2 de munición y el Shock en el equipo", () => {
    assert.equal(ESTADOS.length, 23);
  });

  test("lo que degrada, lo que arrastra y lo que toca a las piezas apunta a algo que existe", () => {
    for (const e of ESTADOS) {
      for (const g of e.grados) {
        if (g.degrada) assert.ok(e.grados.some((x) => x.id === g.degrada!.gradoId), `${e.label} / ${g.label} degrada a un grado que no existe`);
        if (g.piezas) assert.ok(e.afectaPiezas, `${e.label} / ${g.label} toca piezas sin decir cuáles`);
      }
      if (e.arrastra) {
        const otro = estadoPorId(e.arrastra.estadoId);
        assert.ok(otro, `${e.label} arrastra un estado que no existe`);
        for (const [de, a] of Object.entries(e.arrastra.grados)) {
          assert.ok(e.grados.some((g) => g.id === de), `${e.label} arrastra desde un grado suyo que no existe`);
          assert.ok(otro.grados.some((g) => g.id === a), `${e.label} arrastra a un grado de ${otro.label} que no existe`);
        }
      }
    }
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
