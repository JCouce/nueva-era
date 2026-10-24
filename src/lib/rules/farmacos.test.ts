import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { accionesDeFarmacos, accionesDirectasDeFarmacos, ID_CASILLA_ANTIPATOGENO } from "./farmacos";
import { ACCIONES } from "./acciones";
import { estadoInicial } from "./condiciones";
import { equipar } from "./equipo";
import { conExtrasDeFicha, resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";
import { montarTirada, SIN_ELECCION } from "./montaje";

function conFarmaco(catalogoId: string, cantidad: number): Sheet {
  return { ...defaultSheet(), farmacos: { [catalogoId]: cantidad } };
}

describe("sin ningún fármaco en el pool", () => {
  test("ninguna fila con dado", () => {
    assert.deepEqual(accionesDeFarmacos(defaultSheet(), []), []);
  });

  test("tampoco ninguna acción sin dado", () => {
    assert.deepEqual(accionesDirectasDeFarmacos(defaultSheet(), []), []);
  });
});

describe("fármacos sin tirada (Analgésico, Antipatógeno, Ultra Estimulante)", () => {
  test("Analgésico: acción sin dado, con farmacoId y confirmarLabel 'Usar'", () => {
    const sheet = conFarmaco("farmaco_analgesico", 2);
    const [fila] = accionesDirectasDeFarmacos(sheet, []);
    assert.equal(fila.label, "Usar Analgésico");
    assert.equal(fila.grupo, "Fármacos");
    assert.equal(fila.confirmarLabel, "Usar");
    assert.equal(fila.farmacoId, "farmaco_analgesico");
    assert.match(fila.nota ?? "", /Quedan 2\./);
  });

  test("no genera ninguna fila con dado para el mismo fármaco", () => {
    const sheet = conFarmaco("farmaco_analgesico", 2);
    assert.deepEqual(accionesDeFarmacos(sheet, []), []);
  });
});

describe("fármacos con tirada", () => {
  test("Gel Sanador: Perspicacia + Biociencia, dificultad en la nota, sin ajustesFijos", () => {
    const sheet = conFarmaco("farmaco_gel_sanador", 1);
    const [fila] = accionesDeFarmacos(sheet, []);
    assert.equal(fila.label, "Usar Gel Sanador");
    assert.equal(fila.grupo, "Fármacos");
    assert.equal(fila.aplicado, "perspicacia");
    assert.equal(fila.habilidad, "biociencia");
    assert.equal(fila.farmacoId, "farmaco_gel_sanador");
    assert.match(fila.nota ?? "", /dificultad 4/i);
    assert.equal(fila.ajustesFijos, undefined);
  });

  test("Nano-Elixir: +5 real a la tirada, vía ajustesFijos (no es una dificultad)", () => {
    const sheet = conFarmaco("farmaco_nano_elixir", 1);
    const [fila] = accionesDeFarmacos(sheet, []);
    assert.deepEqual(fila.ajustesFijos, [{ valor: 5, fuente: "Nano-Elixir" }]);
  });

  test("Agentes Hemostáticos: los dos valores de dificultad viven en la nota", () => {
    const sheet = conFarmaco("farmaco_hemostaticos", 1);
    const [fila] = accionesDeFarmacos(sheet, []);
    assert.match(fila.nota ?? "", /7 normal/);
    assert.match(fila.nota ?? "", /9 en hemorragia exanguinante/);
  });

  test("no genera ninguna acción sin dado para el mismo fármaco", () => {
    const sheet = conFarmaco("farmaco_gel_sanador", 1);
    assert.deepEqual(accionesDirectasDeFarmacos(sheet, []), []);
  });
});

describe("cantidad 0 o ausente", () => {
  test("con cantidad 0 explícita, no genera fila", () => {
    const sheet = conFarmaco("farmaco_analgesico", 0);
    assert.deepEqual(accionesDeFarmacos(sheet, []), []);
    assert.deepEqual(accionesDirectasDeFarmacos(sheet, []), []);
  });
});

describe("Xovromium", () => {
  test("fila con tirada de Voluntad + la más alta de Biociencia o Actitud, dificultad 6", () => {
    const sheet = conFarmaco("farmaco_xovromium", 3);
    const [fila] = accionesDeFarmacos(sheet, []);
    assert.equal(fila.aplicado, "voluntad");
    assert.equal(fila.habilidad, "biociencia");
    assert.equal(fila.dificultadSugerida, 6);
    assert.equal(fila.farmacoId, "farmaco_xovromium");
    assert.deepEqual(accionesDirectasDeFarmacos(sheet, []), []);
    const conActitud: Sheet = { ...sheet, habilidades: { ...sheet.habilidades, actitud: { valor: 2, especialidades: [] } } };
    assert.equal(accionesDeFarmacos(conActitud, [])[0].habilidad, "actitud");
  });
});

describe("varios fármacos a la vez", () => {
  test("cada uno genera su propia fila, sin mezclarse", () => {
    const sheet: Sheet = {
      ...defaultSheet(),
      farmacos: { farmaco_analgesico: 1, farmaco_calmante: 3, farmaco_nano_elixir: 1 },
    };
    const conDado = accionesDeFarmacos(sheet, []).map((f) => f.label);
    const sinDado = accionesDirectasDeFarmacos(sheet, []).map((f) => f.label);
    assert.deepEqual(new Set(conDado), new Set(["Usar Calmante", "Usar Nano-Elixir"]));
    assert.deepEqual(sinDado, ["Usar Analgésico"]);
  });
});

// Regla general de especialidades (docs/sistema.md §3, usuario 2026-10-23).
describe("especialidad de los fármacos con tirada", () => {
  test("todos con Medicina fija, salvo el Xovromium, que no la nombra", () => {
    for (const id of [
      "farmaco_hemostaticos",
      "farmaco_estabilizadores_neurales",
      "farmaco_calmante",
      "farmaco_gel_sanador",
      "farmaco_gel_sanador_avanzado",
      "farmaco_nano_elixir",
    ]) {
      const [fila] = accionesDeFarmacos(conFarmaco(id, 1), []);
      assert.deepEqual(fila.especialidadesAccion, ["medicina"], id);
    }
    const [xovromium] = accionesDeFarmacos(conFarmaco("farmaco_xovromium", 1), []);
    assert.equal(xovromium.especialidadesAccion, undefined);
  });
});

// R4/R9/R10 (2026-10-24, docs/fuente/equipamiento.md, Medicina y Farmacia).
describe("Valija Médica, Antipatógeno y Estabilizadores Neurales", () => {
  const resolver = (s: Sheet) => resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA });
  const usar = (f: ReturnType<typeof resolver>, id: string) => {
    const t = conExtrasDeFicha(f, accionesDeFarmacos(f.ficha, []).find((a) => a.farmacoId === id)!);
    return montarTirada(f, t, { ...SIN_ELECCION, estadoCondiciones: estadoInicial(t.condiciones ?? []) });
  };

  test("la Valija suma su bono de aplicación al usar un fármaco (+1 a nivel 1, +3 a nivel 4)", () => {
    const sin = usar(resolver(conFarmaco("farmaco_gel_sanador", 1)), "farmaco_gel_sanador");
    for (const [nivel, bono] of [[1, 1], [4, 3]] as const) {
      const s = equipar(conFarmaco("farmaco_gel_sanador", 1), { instanciaId: "v", catalogoId: "valija_tactica_medica", nivel });
      const con = usar(resolver(s), "farmaco_gel_sanador");
      assert.equal(con.total - sin.total, bono);
      assert.ok(con.desglose.some((l) => l.etiqueta === `Valija Táctica Médica (VTM) ${nivel}` && l.valor === bono));
    }
  });

  test("Antipatógeno: casilla +3 en la salvación de Fortaleza mientras quede una dosis (o un Gel)", () => {
    const fila = (s: Sheet) => conExtrasDeFicha(resolver(s), ACCIONES.find((a) => a.id === "salv_fortaleza")!);
    assert.ok(!(fila(defaultSheet()).condiciones ?? []).some((c) => c.id === ID_CASILLA_ANTIPATOGENO));
    for (const id of ["farmaco_antipatogeno", "farmaco_gel_sanador"]) {
      const c = fila(conFarmaco(id, 1)).condiciones?.find((x) => x.id === ID_CASILLA_ANTIPATOGENO);
      assert.ok(c && c.tipo === "toggle" && c.valorActivo === 3, id);
    }
    assert.ok(!(fila(conFarmaco("farmaco_antipatogeno", 0)).condiciones ?? []).some((c) => c.id === ID_CASILLA_ANTIPATOGENO));
  });

  test("Estabilizadores Neurales purga un grado, no todo, salvo con crítico", () => {
    const [fila] = accionesDeFarmacos(conFarmaco("farmaco_estabilizadores_neurales", 1), []);
    assert.match(fila.nota ?? "", /purga un grado del aturdimiento; con éxito crítico, el estado entero/);
  });
});
