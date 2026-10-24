import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet } from "./sheet";
import { equipar } from "./equipo";
import { accionesDeHerramientas, accionesDirectasDeHerramientas } from "./herramientas";
import { dificultadTrasCambio, estadoInicial } from "./condiciones";

describe("sin nada equipado", () => {
  test("no aparece ninguna herramienta", () => {
    assert.deepEqual(accionesDeHerramientas(defaultSheet()), []);
  });

  test("tampoco ninguna acción sin dado", () => {
    assert.deepEqual(accionesDirectasDeHerramientas(defaultSheet()), []);
  });
});

describe("Valija Táctica de Fabricación", () => {
  test("equipada, no genera ninguna tirada propia (sin bono limpio que mecanizar)", () => {
    const sheet = equipar(defaultSheet(), {
      instanciaId: "v1",
      catalogoId: "valija_tactica_fabricacion",
      nivel: 1,
    });
    assert.deepEqual(accionesDeHerramientas(sheet), []);
  });
});

describe("Radar", () => {
  test("equipado, genera su propia fila con Perspicacia + Tecnociencia", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "r1", catalogoId: "radar", nivel: 1 });
    const [fila] = accionesDeHerramientas(sheet);
    assert.equal(fila.label, "Escanear con Radar");
    assert.equal(fila.grupo, "Herramientas");
    assert.equal(fila.aplicado, "perspicacia");
    assert.equal(fila.habilidad, "tecnociencia");
    assert.match(fila.nota ?? "", /dificultad 7/i);
  });

  test("sin nivel 4, no aparece 'Marcar objetivo'", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "r1", catalogoId: "radar", nivel: 3 });
    assert.deepEqual(accionesDirectasDeHerramientas(sheet), []);
  });

  test("con nivel 4, aparece 'Marcar objetivo' como acción sin dado", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "r1", catalogoId: "radar", nivel: 4 });
    const [accion] = accionesDirectasDeHerramientas(sheet);
    assert.equal(accion.label, "Marcar objetivo");
    assert.equal(accion.grupo, "Herramientas");
    assert.match(accion.nota ?? "", /-1 a sus defensas de cobertura/i);
    // Sigue generando también su tirada normal de barrido — las dos conviven.
    assert.equal(accionesDeHerramientas(sheet)[0]?.label, "Escanear con Radar");
  });

  test("la nota cambia con el nivel equipado", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "r1", catalogoId: "radar", nivel: 3 });
    const [fila] = accionesDeHerramientas(sheet);
    assert.match(fila.nota ?? "", /dificultad 8/i);
  });
});

describe("Escáner Detector y Disfraz Holográfico", () => {
  test("cada uno aparece como su propia fila si está equipado", () => {
    let sheet = equipar(defaultSheet(), {
      instanciaId: "e1",
      catalogoId: "escaner_detector",
      nivel: 1,
    });
    sheet = equipar(sheet, {
      instanciaId: "d1",
      catalogoId: "disfraz_holografico",
      nivel: 1,
    });
    const labels = accionesDeHerramientas(sheet).map((t) => t.label);
    assert.deepEqual(labels, ["Usar Escáner Detector", "Activar Disfraz Holográfico"]);
  });
});

describe("no confunde con Buscar/percibir", () => {
  test("la habilidad de Radar/Escáner es Tecnociencia, no Exploración", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "r1", catalogoId: "radar", nivel: 1 });
    const [fila] = accionesDeHerramientas(sheet);
    assert.notEqual(fila.habilidad, "exploracion");
  });
});

// "Perspicacia + Tecnociencia (o Biociencia para peritaje orgánico/químico)", docs/fuente/
// equipamiento.md: la más alta de las dos, sin especialidad (entera).
describe("Escáner Detector: con qué habilidad tira", () => {
  const conHabilidades = (nivel: number, tecnociencia: number, biociencia: number) => {
    const s = defaultSheet();
    return equipar(
      {
        ...s,
        habilidades: {
          ...s.habilidades,
          tecnociencia: { valor: tecnociencia, especialidades: [] },
          biociencia: { valor: biociencia, especialidades: [] },
        },
      },
      { instanciaId: "e1", catalogoId: "escaner_detector", nivel },
    );
  };

  test("nivel 2: la más alta de Tecnociencia o Biociencia; nivel 1, solo Tecnociencia", () => {
    assert.equal(accionesDeHerramientas(conHabilidades(2, 1, 3))[0].habilidad, "biociencia");
    assert.equal(accionesDeHerramientas(conHabilidades(2, 3, 1))[0].habilidad, "tecnociencia");
    assert.equal(accionesDeHerramientas(conHabilidades(1, 1, 3))[0].habilidad, "tecnociencia");
  });

  test("sin especialidad nombrada", () => {
    const [fila] = accionesDeHerramientas(conHabilidades(2, 1, 3));
    assert.equal(fila.especialidadesAccion, undefined);
  });
});

// S94 (docs/fuente/equipamiento.md, Herramientas): la tirada se abre en la dificultad del
// documento y las variantes son un selector de la fila con la suya.
describe("dificultades del Escáner Detector y el Radar", () => {
  const fila = (catalogoId: string, nivel: number) =>
    accionesDeHerramientas(equipar(defaultSheet(), { instanciaId: "h1", catalogoId, nivel }))[0];
  const variantes = (catalogoId: string, nivel: number, id: string) => {
    const c = (fila(catalogoId, nivel).condiciones ?? []).find((x) => x.id === id);
    assert.ok(c?.tipo === "opcion");
    return c.opciones.map((o) => [o.id, o.dificultad]);
  };

  test("Escáner 1: dificultad 6, sin selector", () => {
    assert.equal(fila("escaner_detector", 1).dificultadSugerida, 6);
    assert.equal(fila("escaner_detector", 1).condiciones, undefined);
  });

  test("Escáner 2: 6 superficial, 8 profundo", () => {
    const t = fila("escaner_detector", 2);
    assert.equal(t.dificultadSugerida, 6);
    assert.deepEqual(variantes("escaner_detector", 2, "escaner_profundidad"), [["superficial", 6], ["profundo", 8]]);
    const cs = t.condiciones ?? [];
    assert.equal(dificultadTrasCambio(cs, { ...estadoInicial(cs), escaner_profundidad: "profundo" }, "escaner_profundidad", 6), 8);
  });

  test("Radar 1-2: dificultad 7, sin selector", () => {
    for (const nivel of [1, 2]) {
      assert.equal(fila("radar", nivel).dificultadSugerida, 7);
      assert.equal(fila("radar", nivel).condiciones, undefined);
    }
  });

  test("Radar 3 y 4: penetración de obstáculos a 8 (20 m en el 3, 100 m en el 4)", () => {
    for (const [nivel, alcance] of [[3, "20 m"], [4, "100 m"]] as const) {
      assert.equal(fila("radar", nivel).dificultadSugerida, 7);
      assert.deepEqual(variantes("radar", nivel, "radar_barrido"), [["habitual", 7], ["penetracion", 8]]);
      const c = (fila("radar", nivel).condiciones ?? []).find((x) => x.id === "radar_barrido");
      assert.ok(c?.tipo === "opcion");
      assert.match(c.opciones[1].nota ?? "", new RegExp(`alcance ${alcance}`));
      assert.equal((fila("radar", nivel).condiciones ?? []).length, 1);
    }
  });
});
