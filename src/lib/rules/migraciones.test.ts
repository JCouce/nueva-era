import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { migrar, MIGRACIONES } from "./migraciones";
import { parseSheet, SCHEMA_VERSION } from "./sheet";

describe("cadena de migraciones", () => {
  test("hay un paso por cada salto de versión, sin huecos", () => {
    for (let v = 1; v < SCHEMA_VERSION; v++) {
      const paso = MIGRACIONES.find((m) => m.desde === v);
      assert.ok(paso, `falta la migración desde la versión ${v}`);
      assert.equal(paso.hasta, v + 1, "las migraciones van de una en una");
    }
  });

  test("cada paso explica qué hace", () => {
    for (const m of MIGRACIONES) {
      assert.ok(m.descripcion.length > 20, `paso ${m.desde}→${m.hasta} sin explicar`);
    }
  });

  test("una ficha ya al día no se toca", () => {
    const alDia = { schemaVersion: SCHEMA_VERSION, especieId: "humano" };
    const { ficha, aplicadas } = migrar(alDia, SCHEMA_VERSION);
    assert.deepEqual(aplicadas, []);
    assert.equal(ficha.especieId, "humano");
  });

  test("basura no revienta", () => {
    for (const b of [null, undefined, 42, "texto"]) {
      assert.doesNotThrow(() => migrar(b, SCHEMA_VERSION));
    }
  });
});

describe("v1 → v2: la especie deja de ser texto libre", () => {
  test("un nombre conocido se convierte en su id", () => {
    const { ficha, aplicadas } = migrar({ schemaVersion: 1, especie: "Arkorü" }, 2);
    assert.equal(ficha.especieId, "arkoru");
    assert.equal(ficha.schemaVersion, 2);
    assert.equal(aplicadas.length, 1);
  });

  test("da igual cómo estuviera escrito: acentos y mayúsculas", () => {
    for (const escrito of ["arkoru", "ARKORÜ", "  Arkorü  ", "arkorü"]) {
      const { ficha } = migrar({ schemaVersion: 1, especie: escrito }, 2);
      assert.equal(ficha.especieId, "arkoru", `falló con "${escrito}"`);
    }
  });

  test("un nombre desconocido se queda sin asignar, no se inventa", () => {
    const { ficha } = migrar({ schemaVersion: 1, especie: "Marciano" }, 2);
    assert.equal(ficha.especieId, null);
  });

  test("el campo viejo desaparece", () => {
    const { ficha } = migrar({ schemaVersion: 1, especie: "Humano" }, 2);
    assert.ok(!("especie" in ficha));
  });

  test("no toca el resto de la ficha", () => {
    const original = {
      schemaVersion: 1,
      especie: "Humano",
      edad: 34,
      trasfondo: "una historia",
      atributos: { fuerza: 3 },
    };
    const { ficha } = migrar(original, 2);
    assert.equal(ficha.edad, 34);
    assert.equal(ficha.trasfondo, "una historia");
    assert.deepEqual(ficha.atributos, { fuerza: 3 });
  });

  test("una ficha sin número de versión se trata como v1 y se migra", () => {
    const { ficha } = migrar({ especie: "Arkorü" }, 2);
    assert.equal(ficha.especieId, "arkoru");
  });
});

describe("v2 → v3: se añade el equipo instalado", () => {
  test("una ficha sin campo equipo arranca con la lista vacía", () => {
    const { ficha } = migrar({ schemaVersion: 2, especieId: "humano" }, 3);
    assert.deepEqual(ficha.equipo, []);
    assert.equal(ficha.schemaVersion, 3);
  });

  test("no toca el resto de la ficha", () => {
    const { ficha } = migrar({ schemaVersion: 2, especieId: "arkoru", edad: 40 }, 3);
    assert.equal(ficha.especieId, "arkoru");
    assert.equal(ficha.edad, 40);
  });
});

describe("v3 → v4: creación por prioridad (HOJA2)", () => {
  test("una ficha vieja arranca con las 5 letras sin asignar", () => {
    const { ficha } = migrar({ schemaVersion: 3, especieId: "humano" }, 4);
    assert.deepEqual(ficha.prioridades, {
      atributos: null,
      habilidades: null,
      dotes: null,
      psionica: null,
      recursos: null,
    });
    assert.equal(ficha.altura, null);
    assert.equal(ficha.peso, null);
    assert.equal(ficha.schemaVersion, 4);
  });

  test("no toca el resto de la ficha", () => {
    const { ficha } = migrar({ schemaVersion: 3, especieId: "arkoru", edad: 40 }, 4);
    assert.equal(ficha.especieId, "arkoru");
    assert.equal(ficha.edad, 40);
  });
});

describe("v4 → v5: Exploración sustituye a Supervivencia (C4/C12)", () => {
  test("lo comprado en Supervivencia pasa tal cual a Exploración", () => {
    const { ficha } = migrar(
      {
        schemaVersion: 4,
        habilidades: { supervivencia: { valor: 2, especialidades: ["Rastreo"] } },
      },
      5,
    );
    const habilidades = ficha.habilidades as Record<string, unknown>;
    assert.deepEqual(habilidades.exploracion, { valor: 2, especialidades: ["Rastreo"] });
    assert.equal("supervivencia" in habilidades, false);
    assert.equal(ficha.schemaVersion, 5);
  });

  test("una ficha sin Supervivencia no revienta", () => {
    const { ficha } = migrar({ schemaVersion: 4, habilidades: { sigilo: { valor: 1, especialidades: [] } } }, 5);
    const habilidades = ficha.habilidades as Record<string, unknown>;
    assert.deepEqual(habilidades.sigilo, { valor: 1, especialidades: [] });
    assert.equal("exploracion" in habilidades, false);
  });

  test("no toca el resto de la ficha", () => {
    const { ficha } = migrar({ schemaVersion: 4, especieId: "arkoru" }, 5);
    assert.equal(ficha.especieId, "arkoru");
  });
});

describe("v5 → v6: se añade RECURSOS", () => {
  test("una ficha sin campo recursos arranca con la lista vacía", () => {
    const { ficha } = migrar({ schemaVersion: 5, especieId: "humano" }, 6);
    assert.deepEqual(ficha.recursos, []);
    assert.equal(ficha.schemaVersion, 6);
  });

  test("no toca el resto de la ficha", () => {
    const { ficha } = migrar({ schemaVersion: 5, especieId: "arkoru", edad: 40 }, 6);
    assert.equal(ficha.especieId, "arkoru");
    assert.equal(ficha.edad, 40);
  });
});

describe("v6 → v7: se añade el pool de Materiales", () => {
  test("una ficha sin campo materiales arranca a 0 en los 3 tiers", () => {
    const { ficha } = migrar({ schemaVersion: 6, especieId: "humano" }, 7);
    assert.deepEqual(ficha.materiales, { sencillos: 0, sofisticados: 0, avanzados: 0 });
    assert.equal(ficha.schemaVersion, 7);
  });

  test("no toca el resto de la ficha", () => {
    const { ficha } = migrar({ schemaVersion: 6, especieId: "arkoru", edad: 40 }, 7);
    assert.equal(ficha.especieId, "arkoru");
    assert.equal(ficha.edad, 40);
  });
});

describe("v7 → v8: las granadas pasan de pieza equipada a recurso con cantidad", () => {
  test("suma las instancias equipadas de granada al recurso, agrupadas por tipo", () => {
    const { ficha } = migrar(
      {
        schemaVersion: 7,
        especieId: "humano",
        equipo: [
          { instanciaId: "g1", catalogoId: "granada_casera" },
          { instanciaId: "g2", catalogoId: "granada_casera" },
          { instanciaId: "g3", catalogoId: "granada_plasma" },
        ],
      },
      8,
    );
    assert.deepEqual(ficha.granadas, { granada_casera: 2, granada_plasma: 1 });
    assert.equal(ficha.schemaVersion, 8);
  });

  test("las retira de equipo, sin tocar el resto de piezas equipadas", () => {
    const { ficha } = migrar(
      {
        schemaVersion: 7,
        equipo: [
          { instanciaId: "a1", catalogoId: "fusil_asalto_impetus" },
          { instanciaId: "g1", catalogoId: "granada_casera" },
        ],
      },
      8,
    );
    assert.deepEqual(ficha.equipo, [{ instanciaId: "a1", catalogoId: "fusil_asalto_impetus" }]);
  });

  test("una ficha sin ninguna granada equipada arranca con el recurso vacío", () => {
    const { ficha } = migrar({ schemaVersion: 7, especieId: "humano" }, 8);
    assert.deepEqual(ficha.granadas, {});
    assert.equal(ficha.schemaVersion, 8);
  });

  test("no toca el resto de la ficha", () => {
    const { ficha } = migrar({ schemaVersion: 7, especieId: "arkoru", edad: 40 }, 8);
    assert.equal(ficha.especieId, "arkoru");
    assert.equal(ficha.edad, 40);
  });
});

describe("v8 → v9: vida y fatiga pasan a recurso persistente", () => {
  test("una ficha vieja arranca con el centinela (parseSheet lo recorta al máximo real)", () => {
    const { ficha } = migrar({ schemaVersion: 8, especieId: "humano" }, 9);
    assert.equal(ficha.vidaActual, 999);
    assert.equal(ficha.fatigaActual, 999);
    assert.equal(ficha.schemaVersion, 9);
  });
});

describe("v9 → v10: los fármacos pasan de pieza equipada a recurso con cantidad", () => {
  test("suma las instancias equipadas de fármaco al recurso, agrupadas por tipo", () => {
    const { ficha } = migrar(
      {
        schemaVersion: 9,
        especieId: "humano",
        equipo: [
          { instanciaId: "f1", catalogoId: "farmaco_analgesico" },
          { instanciaId: "f2", catalogoId: "farmaco_analgesico" },
          { instanciaId: "f3", catalogoId: "farmaco_calmante" },
        ],
      },
      10,
    );
    assert.deepEqual(ficha.farmacos, { farmaco_analgesico: 2, farmaco_calmante: 1 });
    assert.equal(ficha.schemaVersion, 10);
  });

  test("las retira de equipo, sin tocar el resto de piezas equipadas", () => {
    const { ficha } = migrar(
      {
        schemaVersion: 9,
        equipo: [
          { instanciaId: "a1", catalogoId: "fusil_asalto_impetus" },
          { instanciaId: "f1", catalogoId: "farmaco_analgesico" },
        ],
      },
      10,
    );
    assert.deepEqual(ficha.equipo, [{ instanciaId: "a1", catalogoId: "fusil_asalto_impetus" }]);
  });

  test("una ficha sin ningún fármaco equipado arranca con el recurso vacío", () => {
    const { ficha } = migrar({ schemaVersion: 9, especieId: "humano" }, 10);
    assert.deepEqual(ficha.farmacos, {});
    assert.equal(ficha.schemaVersion, 10);
  });

  test("no toca el resto de la ficha", () => {
    const { ficha } = migrar({ schemaVersion: 9, especieId: "arkoru", edad: 40 }, 10);
    assert.equal(ficha.especieId, "arkoru");
    assert.equal(ficha.edad, 40);
  });
});

describe("parseSheet migra antes de normalizar", () => {
  test("una ficha v1 entra por la puerta y sale al día", () => {
    const s = parseSheet({ schemaVersion: 1, especie: "Arkorü", edad: 40 });
    assert.equal(s.schemaVersion, SCHEMA_VERSION);
    assert.equal(s.especieId, "arkoru");
    assert.equal(s.edad, 40);
  });

  test("y sigue validando contra el esquema", () => {
    assert.doesNotThrow(() =>
      parseSheet({ schemaVersion: 1, especie: "loquesea", atributos: { fuerza: 99 } }),
    );
  });
});
