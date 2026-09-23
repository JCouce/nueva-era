import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { EQUIPO, MEJORAS_ESTANDAR, SUBSISTEMAS, MOVIMIENTO, equipoPorId } from "./equipo";
import type { NivelModulo } from "./equipo";

// No son fórmulas, pero con ~40 piezas de datos a mano un id duplicado o un
// hueco en los niveles se cuela fácil y rompe equipoPorId/modificadoresDeEquipo
// en silencio. Barato de comprobar, caro de depurar si no está.
describe("integridad del catálogo de equipo", () => {
  test("no hay ids repetidos", () => {
    const ids = EQUIPO.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length, "hay un id de equipo duplicado");
  });

  test("equipoPorId encuentra cada pieza por su propio id", () => {
    for (const e of EQUIPO) {
      assert.equal(equipoPorId(e.id)?.id, e.id);
    }
  });

  test("equipoPorId con un id que no existe no revienta", () => {
    assert.equal(equipoPorId("esto-no-existe"), null);
  });

  // equipoPorId pasó de EQUIPO.find(...) a un Map construido una vez (docs/motor.md,
  // escalabilidad) — mismo resultado exacto para cada id, comparado contra un .find()
  // de control independiente del índice.
  test("equipoPorId coincide con un .find() de control para cada id de EQUIPO", () => {
    for (const e of EQUIPO) {
      const control = EQUIPO.find((x) => x.id === e.id) ?? null;
      assert.equal(equipoPorId(e.id), control);
    }
  });

  function niveles(mod: { label: string; niveles: NivelModulo[] }) {
    return mod.niveles;
  }

  test("los niveles de cada mejora/subsistema van de 1 a N sin huecos", () => {
    for (const mod of [...MEJORAS_ESTANDAR, ...SUBSISTEMAS, ...MOVIMIENTO]) {
      const nums = niveles(mod)
        .map((n) => n.nivel)
        .sort((a, b) => a - b);
      const esperado = nums.map((_, i) => i + 1);
      assert.deepEqual(nums, esperado, `${mod.label} tiene niveles mal numerados: ${nums}`);
    }
  });
});
