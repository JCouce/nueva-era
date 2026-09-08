import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet } from "./sheet";
import {
  equipar,
  desequipar,
  validarInstalacion,
  ranurasSubsistemaUsadas,
  modificadoresDeEquipo,
  type PiezaEquipada,
} from "./equipo";

// La Armadura Ligera del slice: 1 ranura de subsistema (ver
// src/lib/catalog/equipo.ts). Los ids de instancia son deterministas aquí
// para que los tests no dependan de crypto.randomUUID().
function conArmaduraPuesta() {
  const armadura: PiezaEquipada = { instanciaId: "armadura-1", catalogoId: "armadura_ligera" };
  return equipar(defaultSheet(), armadura);
}

describe("equipar", () => {
  test("un arma o una armadura no necesitan dónde instalarse", () => {
    const s = equipar(defaultSheet(), { instanciaId: "a1", catalogoId: "pistola_mosquito" });
    assert.equal(s.equipo.length, 1);
  });

  test("un subsistema sin instaladoEnId se rechaza", () => {
    const s = equipar(defaultSheet(), { instanciaId: "c1", catalogoId: "camuflaje_trifasico" });
    assert.equal(s.equipo.length, 0);
  });

  test("una pieza que no existe en el catálogo se rechaza", () => {
    const s = equipar(defaultSheet(), { instanciaId: "x1", catalogoId: "no_existe" });
    assert.equal(s.equipo.length, 0);
  });

  test("un subsistema con hueco libre se instala", () => {
    const s = equipar(conArmaduraPuesta(), {
      instanciaId: "c1",
      catalogoId: "camuflaje_trifasico",
      nivel: 1,
      instaladoEnId: "armadura-1",
    });
    assert.equal(s.equipo.length, 2);
  });

  test("una mejora estándar se instala aunque no queden ranuras de subsistema", () => {
    let s = conArmaduraPuesta();
    s = equipar(s, {
      instanciaId: "c1",
      catalogoId: "camuflaje_trifasico",
      nivel: 1,
      instaladoEnId: "armadura-1",
    }); // la Armadura Ligera ya se queda sin ranuras (solo tiene 1)
    s = equipar(s, {
      instanciaId: "sv1",
      catalogoId: "soporte_vital",
      nivel: 1,
      instaladoEnId: "armadura-1",
    });
    assert.equal(s.equipo.length, 3);
  });
});

describe("validarInstalacion", () => {
  test("sin armadura puesta, se bloquea explicando el motivo", () => {
    const v = validarInstalacion(defaultSheet(), "camuflaje_trifasico", "armadura-1");
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /armadura/i);
  });

  test("con la única ranura ocupada, un subsistema DISTINTO se bloquea por ranura", () => {
    let s = conArmaduraPuesta();
    s = equipar(s, {
      instanciaId: "c1",
      catalogoId: "camuflaje_trifasico",
      nivel: 1,
      instaladoEnId: "armadura-1",
    });
    const v = validarInstalacion(s, "escudo_deflector", "armadura-1");
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /ranura/i);
  });

  test("el mismo subsistema ya instalado se bloquea por duplicado, no por ranura", () => {
    let s = conArmaduraPuesta();
    s = equipar(s, {
      instanciaId: "c1",
      catalogoId: "camuflaje_trifasico",
      nivel: 1,
      instaladoEnId: "armadura-1",
    });
    const v = validarInstalacion(s, "camuflaje_trifasico", "armadura-1");
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /ya lleva/i);
  });

  test("un arma no se puede \"instalar\" en una armadura", () => {
    const v = validarInstalacion(conArmaduraPuesta(), "pistola_mosquito", "armadura-1");
    assert.equal(v.ok, false);
  });
});

describe("mejoras de arma", () => {
  function conFusilAsaltoPuesto() {
    const arma: PiezaEquipada = { instanciaId: "arma-1", catalogoId: "fusil_asalto_impetus" };
    return equipar(defaultSheet(), arma);
  }

  test("sin arma equipada, se bloquea explicando el motivo", () => {
    const v = validarInstalacion(defaultSheet(), "mira_telescopica", "arma-1");
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /arma equipada/i);
  });

  test("compatible por tipo de arma: se instala en un fusil de asalto", () => {
    const s = equipar(conFusilAsaltoPuesto(), {
      instanciaId: "m1",
      catalogoId: "mira_telescopica",
      nivel: 1,
      instaladoEnId: "arma-1",
    });
    assert.equal(s.equipo.length, 2);
  });

  test("incompatible por tipo de arma: una pistola no admite Mira Telescópica", () => {
    const s = equipar(defaultSheet(), { instanciaId: "p1", catalogoId: "pistola_mosquito" });
    const v = validarInstalacion(s, "mira_telescopica", "p1");
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /compatible/i);
  });

  test("incompatible por categoría de daño: Sistema de Retroceso no va en armas de plasma", () => {
    const s = equipar(defaultSheet(), { instanciaId: "p1", catalogoId: "pistola_plasma_sd" });
    const v = validarInstalacion(s, "sistema_retroceso", "p1");
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /compatible/i);
  });

  test("un arma sin mejoras admitidas (0) rechaza cualquier mejora", () => {
    const s = equipar(defaultSheet(), { instanciaId: "p1", catalogoId: "pistola_mosquito" });
    const v = validarInstalacion(s, "silenciador", "p1"); // compatible con todas, pero Mosquito admite 0
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /no admite mejoras/i);
  });

  test("respeta el número de mejoras admitidas del arma", () => {
    // Impetus admite 3: caben Mira, Puntero y Silenciador, la cuarta se bloquea.
    let s = conFusilAsaltoPuesto();
    s = equipar(s, { instanciaId: "m1", catalogoId: "mira_telescopica", nivel: 1, instaladoEnId: "arma-1" });
    s = equipar(s, { instanciaId: "m2", catalogoId: "puntero_laser", nivel: 1, instaladoEnId: "arma-1" });
    s = equipar(s, { instanciaId: "m3", catalogoId: "silenciador", nivel: 1, instaladoEnId: "arma-1" });
    assert.equal(s.equipo.length, 4);
    const v = validarInstalacion(s, "bipode", "arma-1");
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /mejora\(s\) ocupadas/i);
  });

  test("la misma mejora no se puede instalar dos veces en la misma arma", () => {
    let s = conFusilAsaltoPuesto();
    s = equipar(s, { instanciaId: "m1", catalogoId: "mira_telescopica", nivel: 1, instaladoEnId: "arma-1" });
    const v = validarInstalacion(s, "mira_telescopica", "arma-1");
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /ya lleva/i);
  });

  test("quitar el arma se lleva las mejoras instaladas dentro", () => {
    let s = conFusilAsaltoPuesto();
    s = equipar(s, { instanciaId: "m1", catalogoId: "mira_telescopica", nivel: 1, instaladoEnId: "arma-1" });
    s = desequipar(s, "arma-1");
    assert.equal(s.equipo.length, 0);
  });

  test("Sistema de Retroceso aporta su modificador con origen \"equipo\"", () => {
    let s = conFusilAsaltoPuesto();
    s = equipar(s, {
      instanciaId: "sr1",
      catalogoId: "sistema_retroceso",
      nivel: 1,
      instaladoEnId: "arma-1",
    });
    const mods = modificadoresDeEquipo(s).filter((m) => m.fuente === "Sistema de Retroceso 1");
    assert.deepEqual(mods, [
      {
        tipo: "tirada",
        contexto: "ataque en modo automático",
        valor: 1,
        origen: "equipo",
        fuente: "Sistema de Retroceso 1",
      },
    ]);
  });
});

describe("movimiento", () => {
  function conRopaReforzadaPuesta() {
    // Ropa Reforzada: topeExoesqueleto y topeMovilidadAerea a null (no admite).
    const armadura: PiezaEquipada = { instanciaId: "armadura-1", catalogoId: "ropa_reforzada" };
    return equipar(defaultSheet(), armadura);
  }

  test("sin armadura puesta, se bloquea explicando el motivo", () => {
    const v = validarInstalacion(defaultSheet(), "exoesqueleto", "armadura-1", 1);
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /armadura/i);
  });

  test("una armadura que no admite el módulo (tope null) se bloquea", () => {
    const v = validarInstalacion(conRopaReforzadaPuesta(), "exoesqueleto", "armadura-1", 1);
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /no admite/i);
  });

  test("sin nivel, se pide elegir uno", () => {
    // Armadura Ligera: topeExoesqueleto 2, sí admite.
    const v = validarInstalacion(conArmaduraPuesta(), "exoesqueleto", "armadura-1");
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /nivel/i);
  });

  test("un nivel dentro del tope se instala", () => {
    const s = equipar(conArmaduraPuesta(), {
      instanciaId: "e1",
      catalogoId: "exoesqueleto",
      nivel: 2,
      instaladoEnId: "armadura-1",
    });
    assert.equal(s.equipo.length, 2);
  });

  test("un nivel por encima del tope se bloquea", () => {
    // Armadura Ligera admite exoesqueleto hasta nivel 2.
    const v = validarInstalacion(conArmaduraPuesta(), "exoesqueleto", "armadura-1", 3);
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /nivel 2/);
  });

  test("el mismo módulo ya instalado se bloquea por duplicado", () => {
    let s = conArmaduraPuesta();
    s = equipar(s, {
      instanciaId: "e1",
      catalogoId: "exoesqueleto",
      nivel: 1,
      instaladoEnId: "armadura-1",
    });
    const v = validarInstalacion(s, "exoesqueleto", "armadura-1", 2);
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /ya lleva/i);
  });

  test("exoesqueleto y movilidad aérea usan cada uno su propio tope", () => {
    // Armadura Ligera: topeExoesqueleto 2, topeMovilidadAerea 2 — pero son
    // ranuras/topes independientes, así que caben los dos a la vez.
    let s = conArmaduraPuesta();
    s = equipar(s, {
      instanciaId: "e1",
      catalogoId: "exoesqueleto",
      nivel: 2,
      instaladoEnId: "armadura-1",
    });
    s = equipar(s, {
      instanciaId: "m1",
      catalogoId: "movilidad_aerea",
      nivel: 2,
      instaladoEnId: "armadura-1",
    });
    assert.equal(s.equipo.length, 3);
  });

  test("el bono de Fuerza del exoesqueleto no está mecanizado (queda en texto)", () => {
    const s = equipar(conArmaduraPuesta(), {
      instanciaId: "e1",
      catalogoId: "exoesqueleto",
      nivel: 1,
      instaladoEnId: "armadura-1",
    });
    const delExo = modificadoresDeEquipo(s).filter((m) => m.fuente.startsWith("Exoesqueleto"));
    assert.deepEqual(delExo, []);
  });
});

describe("ranurasSubsistemaUsadas", () => {
  test("cuenta solo los subsistemas de esa armadura, no las mejoras estándar", () => {
    let s = conArmaduraPuesta();
    s = equipar(s, {
      instanciaId: "c1",
      catalogoId: "camuflaje_trifasico",
      nivel: 1,
      instaladoEnId: "armadura-1",
    });
    assert.equal(ranurasSubsistemaUsadas(s, "armadura-1"), 1);
  });
});

describe("desequipar", () => {
  test("quitar una armadura se lleva lo que tenía instalado dentro", () => {
    let s = conArmaduraPuesta();
    s = equipar(s, {
      instanciaId: "c1",
      catalogoId: "camuflaje_trifasico",
      nivel: 1,
      instaladoEnId: "armadura-1",
    });
    s = desequipar(s, "armadura-1");
    assert.equal(s.equipo.length, 0);
  });

  test("quitar un arma no toca el resto del equipo", () => {
    let s = equipar(defaultSheet(), { instanciaId: "a1", catalogoId: "pistola_mosquito" });
    s = equipar(s, { instanciaId: "a2", catalogoId: "pistola_mosquito" });
    s = desequipar(s, "a1");
    assert.deepEqual(
      s.equipo.map((p) => p.instanciaId),
      ["a2"],
    );
  });
});

describe("modificadores de equipo", () => {
  test("un arma equipada aporta sus modificadores con origen \"equipo\"", () => {
    const s = equipar(defaultSheet(), { instanciaId: "a1", catalogoId: "pistola_mosquito" });
    const mods = modificadoresDeEquipo(s);
    assert.deepEqual(mods, [
      { tipo: "tirada", contexto: "ocultar arma", valor: 2, origen: "equipo", fuente: "Mosquito" },
    ]);
  });

  test("una armadura equipada aporta los suyos", () => {
    const mods = modificadoresDeEquipo(conArmaduraPuesta());
    assert.equal(mods.length, 2);
    assert.ok(mods.every((m) => m.origen === "equipo" && m.fuente === "Armadura Ligera"));
  });

  test("un subsistema sin modificadores mecanizados no aporta nada (queda en texto)", () => {
    let s = conArmaduraPuesta();
    s = equipar(s, {
      instanciaId: "c1",
      catalogoId: "camuflaje_trifasico",
      nivel: 1,
      instaladoEnId: "armadura-1",
    });
    const delCamuflaje = modificadoresDeEquipo(s).filter((m) => m.fuente.startsWith("Camuflaje"));
    assert.deepEqual(delCamuflaje, []);
  });

  test("una mejora estándar con nivel instalado aporta los modificadores de ESE nivel", () => {
    let s = conArmaduraPuesta();
    s = equipar(s, {
      instanciaId: "sv1",
      catalogoId: "soporte_vital",
      nivel: 2,
      instaladoEnId: "armadura-1",
    });
    const delSoporte = modificadoresDeEquipo(s).filter((m) => m.fuente === "Soporte Vital 2");
    assert.equal(delSoporte.length, 2);
  });

  test("sin nada equipado no hay modificadores de equipo", () => {
    assert.deepEqual(modificadoresDeEquipo(defaultSheet()), []);
  });
});
