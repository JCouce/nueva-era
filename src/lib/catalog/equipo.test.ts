import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  EQUIPO,
  MEJORAS_ESTANDAR,
  SUBSISTEMAS,
  MOVIMIENTO,
  PIEZAS_FABRICABLES,
  equipoPorId,
  piezaFabricablePorId,
} from "./equipo";
import { MATERIALES } from "./herramientas";
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

describe("PIEZAS_FABRICABLES (docs/tareas.md, tarea 8)", () => {
  test("solo incluye las familias sueltas sin nivel", () => {
    const familiasPermitidas = new Set(["armadura", "arma", "armaMelee", "consumible", "armaPesada", "granada"]);
    for (const p of PIEZAS_FABRICABLES) {
      assert.ok(familiasPermitidas.has(p.familia), `${p.id} es de familia "${p.familia}", no debería fabricarse`);
    }
  });

  test("ninguna pieza fabricable tiene coste null (las armaMelee 'no se compran' quedan fuera)", () => {
    for (const p of PIEZAS_FABRICABLES) {
      assert.ok(p.coste !== null && p.coste > 0, `${p.id} no tiene coste válido para fabricar`);
    }
  });

  test("los Materiales no aparecen (fabricar materia prima con materia prima no tiene sentido)", () => {
    const ids = new Set(PIEZAS_FABRICABLES.map((p) => p.id));
    for (const m of MATERIALES) {
      assert.ok(!ids.has(m.id), `${m.id} no debería estar en PIEZAS_FABRICABLES`);
    }
  });

  test("Puñetazo (armaMelee sin coste, 'no se compra') no aparece", () => {
    const ids = new Set(PIEZAS_FABRICABLES.map((p) => p.id));
    assert.ok(!ids.has("pelea_punetazo"), "un arma melee sin coste se coló en fabricables");
  });

  test("piezaFabricablePorId encuentra un arma de fuego real", () => {
    assert.equal(piezaFabricablePorId("pistola_mosquito")?.id, "pistola_mosquito");
  });

  test("piezaFabricablePorId con algo no fabricable (mejora estándar) devuelve null", () => {
    assert.equal(piezaFabricablePorId("camuflaje_trifasico"), null);
  });

  test("piezaFabricablePorId con un id inexistente devuelve null", () => {
    assert.equal(piezaFabricablePorId("no-existe"), null);
  });
});
