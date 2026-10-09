import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, parseSheet, SCHEMA_VERSION, type Sheet } from "./sheet";
import { atributosEfectivos, desgloseAtributo, modificadoresActivos, salud } from "./derivados";
import { especieDeFicha, elegirEspecie, hayQuePerder, type ContextoEleccion } from "./especie";
import { setAtributoValue, setPrioridad } from "./creacion";
import { migrar } from "./migraciones";
import type { AtributoId } from "./atributos";

const ficha = (especieId: string | null, especieOpciones: Sheet["especieOpciones"] = {}): Sheet => ({
  ...defaultSheet(),
  especieId,
  especieOpciones,
});

const CEROS: Record<AtributoId, number> = {
  fuerza: 0,
  agilidad: 0,
  aguante: 0,
  percepcion: 0,
  inteligencia: 0,
  caracter: 0,
};
const efectivos = (s: Sheet) => atributosEfectivos(s, modificadoresActivos(s));
const con = (cambios: Partial<Record<AtributoId, number>>) => ({ ...CEROS, ...cambios });

describe("especieDeFicha: atributos de cada especie (sistema.md §14.4)", () => {
  test("sin especie o con una desconocida, nada", () => {
    assert.equal(especieDeFicha(ficha(null)), null);
    assert.equal(especieDeFicha(ficha("dragon")), null);
    assert.deepEqual(efectivos(ficha("dragon")), CEROS);
  });

  test("Humanos: sin modificadores", () => {
    assert.deepEqual(efectivos(ficha("humano")), CEROS);
  });

  test("Riux", () => {
    assert.deepEqual(
      efectivos(ficha("riux")),
      con({ agilidad: 1, aguante: 1, inteligencia: 1, caracter: -1, fuerza: -1 }),
    );
  });

  test("Arianyi", () => {
    assert.deepEqual(efectivos(ficha("arianyi")), con({ agilidad: 1, percepcion: 1, fuerza: -1 }));
  });

  test("Arköru", () => {
    assert.deepEqual(efectivos(ficha("arkoru")), con({ fuerza: 2, agilidad: -1 }));
  });

  test("Manduk sin casta: la especie sola no da nada", () => {
    assert.deepEqual(efectivos(ficha("manduk")), CEROS);
  });
});

describe("especieDeFicha: castas manduk", () => {
  const casos: [string, Partial<Record<AtributoId, number>>][] = [
    ["sabio", { inteligencia: 1, percepcion: 1, fuerza: -1, aguante: -1, caracter: -1 }],
    ["guerrero", { fuerza: 1, agilidad: 1, aguante: 1, caracter: -1, inteligencia: -1 }],
    ["siervo", { aguante: 1, percepcion: 1, caracter: -1, inteligencia: -1 }],
  ];
  for (const [casta, esperado] of casos) {
    test(casta, () => {
      assert.deepEqual(efectivos(ficha("manduk", { casta })), con(esperado));
    });
  }

  test("noble (sin linaje todavía): Carácter +1", () => {
    assert.deepEqual(efectivos(ficha("manduk", { casta: "noble" })), con({ caracter: 1 }));
  });
});

describe("especieDeFicha: noble de cada linaje (casta + linaje se suman)", () => {
  const casos: [string, Partial<Record<AtributoId, number>>][] = [
    ["ilkrem", { caracter: 1, fuerza: 1 }],
    ["zimethroni", { caracter: 1, agilidad: 1 }],
    ["irota", { caracter: 1, aguante: 1 }],
    ["maolher", { caracter: 1, inteligencia: 1 }],
    ["axadren", { caracter: 1, percepcion: 1 }],
    ["elion", { caracter: 2 }],
  ];
  for (const [linaje, esperado] of casos) {
    test(linaje, () => {
      assert.deepEqual(efectivos(ficha("manduk", { casta: "noble", linaje })), con(esperado));
    });
  }

  test("el desglose nombra casta y casa por separado", () => {
    const s = { ...ficha("manduk", { casta: "noble", linaje: "elion" }), atributos: { ...CEROS, caracter: 1 } };
    assert.deepEqual(desgloseAtributo(s, "caracter", modificadoresActivos(s)), {
      total: 3,
      fuentes: [
        { etiqueta: "Base", valor: 1 },
        { etiqueta: "Manduk · Noble", valor: 1 },
        { etiqueta: "Casa de Elión", valor: 1 },
      ],
    });
  });

  test("el bono llega a la salud: Ílkrem Fuerza +1 sube Fortaleza", () => {
    // Fortaleza = ceil((1 + 0)/2) = 1 → vida 9.
    const ilkrem = ficha("manduk", { casta: "noble", linaje: "ilkrem" });
    assert.equal(salud(ilkrem, modificadoresActivos(ilkrem)).vida, 9);
  });

  test("un linaje sin casta noble no cuenta (opción vieja en la ficha)", () => {
    assert.deepEqual(efectivos(ficha("manduk", { casta: "sabio", linaje: "ilkrem" })), efectivos(ficha("manduk", { casta: "sabio" })));
  });

  test("rasgos con su fuente y referencia física de la casta", () => {
    const r = especieDeFicha(ficha("manduk", { casta: "noble", linaje: "maolher" }))!;
    assert.equal(r.casta?.id, "noble");
    assert.equal(r.linaje?.id, "maolher");
    assert.ok(r.rasgos.some((x) => x.id === "peaje_neurologico" && x.fuente === "Casa de Maolher"));
    assert.deepEqual(r.referencia, { pesoKg: { min: 50, max: 70, porFuerza: 10 }, alturaCm: { min: 170, max: 200 } });
    assert.equal(especieDeFicha(ficha("humano"))!.referencia, null);
    assert.deepEqual(especieDeFicha(ficha("arkoru"))!.referencia?.pesoKg, { min: 80, max: 120, porFuerza: 15 });
  });
});

const BORRADOR: ContextoEleccion = { aprobada: false, esMaster: false, libre: false };

describe("elegirEspecie: validación", () => {
  const error = (s: Sheet, e: Parameters<typeof elegirEspecie>[1]) => {
    const r = elegirEspecie(s, e, BORRADOR);
    assert.ok("error" in r, `debería fallar: ${JSON.stringify(e)}`);
  };

  test("especie desconocida", () => error(defaultSheet(), { especieId: "dragon" }));
  test("casta en una especie sin castas", () => error(defaultSheet(), { especieId: "riux", casta: "noble" }));
  test("linaje en una especie sin castas", () => error(defaultSheet(), { especieId: "riux", linaje: "ilkrem" }));
  test("Manduk sin casta", () => error(defaultSheet(), { especieId: "manduk" }));
  test("casta desconocida", () => error(defaultSheet(), { especieId: "manduk", casta: "rey" }));
  test("linaje con casta no noble", () => error(defaultSheet(), { especieId: "manduk", casta: "sabio", linaje: "ilkrem" }));
  test("noble sin linaje", () => error(defaultSheet(), { especieId: "manduk", casta: "noble" }));
  test("linaje desconocido", () => error(defaultSheet(), { especieId: "manduk", casta: "noble", linaje: "otra" }));
  test("sin especie pero con casta", () => error(defaultSheet(), { especieId: null, casta: "noble" }));

  test("elecciones válidas", () => {
    for (const e of [
      { especieId: "riux" },
      { especieId: "manduk", casta: "guerrero" },
      { especieId: "manduk", casta: "noble", linaje: "axadren" },
      { especieId: null },
    ]) {
      const r = elegirEspecie(ficha("humano"), e, BORRADOR);
      assert.ok(!("error" in r), JSON.stringify(e));
    }
  });

  test("casta/linaje a null equivalen a no darlos", () => {
    const r = elegirEspecie(defaultSheet(), { especieId: "riux", casta: null, linaje: null }, BORRADOR);
    assert.ok(!("error" in r));
    assert.deepEqual(r.sheet.especieOpciones, {});
  });
});

// Una ficha con de todo: lo de Resumen y lo que se va con el reset.
function fichaLlena(): Sheet {
  let s = setPrioridad(setPrioridad(defaultSheet(), "atributos", "A"), "recursos", "B");
  s = setAtributoValue(s, "fuerza", 2);
  return {
    ...s,
    especieId: "arkoru",
    edad: 40,
    altura: 210,
    peso: 140,
    trasfondo: "Forjador",
    motivacion: "Venganza",
    habilidades: { ...s.habilidades, atletismo: { valor: 2, especialidades: ["Trepar"] } },
    psionica: { resonancia: 2 },
    materiales: { sencillos: 3, sofisticados: 0, avanzados: 0 },
    vidaActual: 4,
    fatigaActual: 2,
    fatigaTemporal: 1,
  };
}

describe("elegirEspecie: reset al cambiar (sistema.md §14.3)", () => {
  test("conserva Resumen y la nueva elección; el resto vuelve a por defecto", () => {
    const antes = fichaLlena();
    const r = elegirEspecie(antes, { especieId: "manduk", casta: "noble", linaje: "ilkrem" }, BORRADOR);
    assert.ok(!("error" in r));
    assert.equal(r.reseteada, true);
    const d = defaultSheet();
    const s = r.sheet;
    // Se conserva
    assert.equal(s.edad, 40);
    assert.equal(s.altura, 210);
    assert.equal(s.peso, 140);
    assert.equal(s.trasfondo, "Forjador");
    assert.equal(s.motivacion, "Venganza");
    assert.deepEqual(s.prioridades, antes.prioridades);
    assert.equal(s.especieId, "manduk");
    assert.deepEqual(s.especieOpciones, { casta: "noble", linaje: "ilkrem" });
    // Se va
    assert.deepEqual(s.atributos, d.atributos);
    assert.deepEqual(s.habilidades, d.habilidades);
    assert.deepEqual(s.psionica, {});
    assert.deepEqual(s.equipo, []);
    assert.deepEqual(s.recursos, []);
    assert.deepEqual(s.materiales, d.materiales);
    assert.deepEqual(s.granadas, {});
    assert.deepEqual(s.farmacos, {});
    assert.deepEqual(s.municionEspecial, {});
    assert.equal(s.fatigaTemporal, 0);
    // Vida y fatiga al centinela de máximo
    assert.equal(s.vidaActual, 999);
    assert.equal(s.fatigaActual, 999);
    // No muta la entrada
    assert.equal(antes.especieId, "arkoru");
  });

  test("cambiar solo el linaje también resetea", () => {
    const antes = { ...fichaLlena(), especieId: "manduk", especieOpciones: { casta: "noble", linaje: "ilkrem" } };
    const r = elegirEspecie(antes, { especieId: "manduk", casta: "noble", linaje: "elion" }, BORRADOR);
    assert.ok(!("error" in r));
    assert.equal(r.reseteada, true);
    assert.equal(r.sheet.atributos.fuerza, 0);
  });

  test("repetir la misma elección no toca nada", () => {
    const antes = fichaLlena();
    const r = elegirEspecie(antes, { especieId: "arkoru" }, BORRADOR);
    assert.ok(!("error" in r));
    assert.equal(r.reseteada, false);
    assert.equal(r.sheet, antes);
  });
});

describe("elegirEspecie: aprobada y modo libre", () => {
  test("aprobada: el jugador no puede cambiarla", () => {
    const r = elegirEspecie(fichaLlena(), { especieId: "riux" }, { aprobada: true, esMaster: false, libre: false });
    assert.ok("error" in r);
  });

  test("aprobada: el máster sí, y sin reset", () => {
    const antes = fichaLlena();
    const r = elegirEspecie(antes, { especieId: "riux" }, { aprobada: true, esMaster: true, libre: false });
    assert.ok(!("error" in r));
    assert.equal(r.reseteada, false);
    assert.equal(r.sheet.especieId, "riux");
    assert.equal(r.sheet.atributos.fuerza, 2);
  });

  test("libre (NPC): sin reset y sin bloqueo, pero sí valida", () => {
    const antes = fichaLlena();
    for (const ctx of [
      { aprobada: false, esMaster: true, libre: true },
      { aprobada: true, esMaster: false, libre: true },
    ]) {
      const r = elegirEspecie(antes, { especieId: "manduk", casta: "guerrero" }, ctx);
      assert.ok(!("error" in r));
      assert.equal(r.reseteada, false);
      assert.deepEqual(r.sheet, { ...antes, especieId: "manduk", especieOpciones: { casta: "guerrero" } });
    }
    assert.ok("error" in elegirEspecie(antes, { especieId: "manduk" }, { aprobada: false, esMaster: true, libre: true }));
  });
});

describe("hayQuePerder", () => {
  test("ficha por defecto y créditos de la letra: nada que perder", () => {
    assert.equal(hayQuePerder(defaultSheet(), 0, 0), false);
    // También leída de la base (vida/fatiga ya recortadas al máximo real).
    assert.equal(hayQuePerder(parseSheet(defaultSheet()), 0, 0), false);
  });

  test("solo Resumen relleno: nada que perder", () => {
    const s = { ...setPrioridad(defaultSheet(), "recursos", "B"), edad: 30, trasfondo: "x", especieId: "riux" };
    assert.equal(hayQuePerder(s, 41000, 41000), false);
  });

  test("vida o fatiga gastadas no cuentan", () => {
    assert.equal(hayQuePerder({ ...defaultSheet(), vidaActual: 2, fatigaActual: 1 }, 0, 0), false);
  });

  test("créditos distintos de los de la letra: hay que avisar", () => {
    assert.equal(hayQuePerder(defaultSheet(), 500, 1500), true);
  });

  test("algo comprado: hay que avisar", () => {
    assert.equal(hayQuePerder(fichaLlena(), 41000, 41000), true);
    assert.equal(hayQuePerder({ ...defaultSheet(), psionica: { resonancia: 1 } }, 0, 0), true);
    assert.equal(hayQuePerder({ ...defaultSheet(), fatigaTemporal: 1 }, 0, 0), true);
  });
});

describe("ficha v14: especieOpciones", () => {
  test("migración 13 → 14: empieza sin opciones", () => {
    const { ficha: f } = migrar({ schemaVersion: 13, especieId: "arkoru", fatigaTemporal: 0 }, 14);
    assert.equal(f.schemaVersion, 14);
    assert.deepEqual(f.especieOpciones, {});
    assert.equal(f.especieId, "arkoru");
    assert.equal(SCHEMA_VERSION, 14);
  });

  test("una ficha vieja de Arkorü se lee con los números nuevos", () => {
    const s = parseSheet({ schemaVersion: 13, especieId: "arkoru", atributos: { fuerza: 1 } });
    assert.deepEqual(s.especieOpciones, {});
    assert.equal(atributosEfectivos(s, modificadoresActivos(s)).fuerza, 3);
  });

  test("parseSheet conserva opciones válidas", () => {
    const s = parseSheet({ schemaVersion: 14, especieId: "manduk", especieOpciones: { casta: "noble", linaje: "irota" } });
    assert.deepEqual(s.especieOpciones, { casta: "noble", linaje: "irota" });
  });

  test("parseSheet descarta opciones basura", () => {
    const casos: [string | null, unknown, Sheet["especieOpciones"]][] = [
      ["manduk", "noble", {}],
      ["manduk", [1, 2], {}],
      ["manduk", null, {}],
      ["manduk", { casta: 42 }, {}],
      ["manduk", { casta: "rey", linaje: "ilkrem" }, {}],
      ["manduk", { casta: "sabio", linaje: "ilkrem" }, { casta: "sabio" }],
      ["manduk", { casta: "noble", linaje: "otra" }, { casta: "noble" }],
      ["riux", { casta: "noble", linaje: "ilkrem" }, {}],
      [null, { casta: "noble" }, {}],
      ["dragon", { casta: "noble" }, {}],
    ];
    for (const [especieId, especieOpciones, esperado] of casos) {
      const s = parseSheet({ schemaVersion: 14, especieId, especieOpciones });
      assert.deepEqual(s.especieOpciones, esperado, JSON.stringify({ especieId, especieOpciones }));
    }
  });
});
