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
import { municionEspecialPorId } from "./municion";
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

describe("armas de energía", () => {
  test("toda arma de fuego de plasma lleva tipoMunicion energía (Plaga faltaba, 2026-10-24)", () => {
    const plasma = EQUIPO.filter(
      (e) => e.familia === "arma" && e.modos.every((m) => m.categoriaDanio === "Plasma"),
    );
    assert.ok(plasma.some((a) => a.id === "fusil_precision_plaga"));
    for (const a of plasma) assert.equal(a.familia === "arma" && a.tipoMunicion, "bateria_plasma", a.id);
  });

  test("láser, rayo de partículas y plasma, cada uno con su munición; Electro TK, partículas (S93, S95)", () => {
    const tipoDe = (id: string) => {
      const a = EQUIPO.find((e) => e.id === id);
      return a?.familia === "arma" ? a.tipoMunicion : "no es arma";
    };
    assert.equal(tipoDe("pistola_laser"), "bateria_laser");
    assert.equal(tipoDe("fusil_precision_laser_largo_alcance"), "bateria_laser");
    assert.equal(tipoDe("pistola_rayo_ligero"), "celula_particulas");
    assert.equal(tipoDe("fusil_asalto_rayo_particulas"), "celula_particulas");
    assert.equal(tipoDe("ametralladora_electro_tk"), "celula_particulas");
    assert.equal(tipoDe("pistola_mosquito"), undefined);
  });
});

describe("retroceso entrópico (Kerzul)", () => {
  test("solo lo declaran las armas de Kerzul con algún ataque Estándar o Compleja (Puñal fuera, 2026-10-24)", () => {
    for (const a of EQUIPO) {
      if (a.familia !== "armaMelee" || a.material !== "kerzul") continue;
      const declara = (a.motor ?? []).some((m) => m.afecta.modo === "accion_nueva" && m.afecta.id === "salvacion_retroceso_entropico");
      const tiene = a.modos.some((m) => m.etiqueta !== "Simple");
      assert.equal(declara, tiene, a.id);
    }
  });
});

describe("munición especial: textos del documento (S95)", () => {
  test("Radiactiva: relanza si ya está envenenado por radiación; con crítico, sin efecto", () => {
    const t = municionEspecialPorId("radiactiva")!.efecto;
    assert.match(t, /ya envenenado por radiación, relanza y puede agravarse un nivel/);
    assert.match(t, /con crítico, sin ningún efecto/);
  });

  test("Supresora: con crítico sin efecto; acumular fallos pasa a fallo crítico y prolonga", () => {
    const t = municionEspecialPorId("supresora")!.efecto;
    assert.match(t, /con crítico, sin efecto/);
    assert.match(t, /Acumular fallos pasa a fallo crítico y prolonga la duración/);
  });
});
