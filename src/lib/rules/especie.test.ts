import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, parseSheet, SCHEMA_VERSION, type Sheet } from "./sheet";
import { atributosEfectivos, desgloseAtributo, modificadoresActivos, salud } from "./derivados";
import {
  especieDeFicha,
  elegirEspecie,
  hayQuePerder,
  hayQueAvisar,
  bloqueoDeEspecie,
  eleccionCompleta,
  eleccionDeFicha,
  eleccionesIguales,
  rangoReferencia,
  excepcionesRareza,
  type ContextoEleccion,
} from "./especie";
import { resolverFicha } from "./fichaResuelta";
import { accionesDePsionica } from "./poderes";
import {
  cumpleRequisito,
  nivelDisciplina,
  requisitosRotos,
  setDisciplinaValue,
  setNivelDisciplina,
  SIN_BONOS_DISCIPLINA,
  sueloPorRequisitos,
  textoNivelDisciplina,
} from "./psionica";
import { AJUSTE_NEUTRO } from "./progresion";
import {
  desequipar,
  equipar,
  materialDePieza,
  piezaEquipadaEntradaSchema,
  puedeEquiparSinRareza,
  topeRarezaDeCompra,
} from "./equipo";
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

// Una ficha con de todo: lo de Personaje y lo que se va con el reset.
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
  test("conserva Personaje y la nueva elección; el resto vuelve a por defecto", () => {
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

  test("solo Personaje relleno: nada que perder", () => {
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

describe("hayQueAvisar: solo si el cambio resetea", () => {
  const conCompra = { ...setPrioridad(defaultSheet(), "recursos", "B"), psionica: { resonancia: 1 } };
  test("borrador con algo que perder: avisa", () => {
    assert.equal(hayQueAvisar(conCompra, 41000, { aprobada: false, esMaster: false, libre: false }), true);
  });
  test("borrador sin nada que perder: directo", () => {
    const s = setPrioridad(defaultSheet(), "recursos", "B");
    assert.equal(hayQueAvisar(s, 41000, { aprobada: false, esMaster: false, libre: false }), false);
  });
  test("créditos distintos de los de la letra: avisa", () => {
    const s = setPrioridad(defaultSheet(), "recursos", "B");
    assert.equal(hayQueAvisar(s, 40000, { aprobada: false, esMaster: false, libre: false }), true);
    // Sin letra, la letra da 0.
    assert.equal(hayQueAvisar(defaultSheet(), 10, { aprobada: false, esMaster: false, libre: false }), true);
  });
  test("aprobada (máster) o libre (NPC): no resetea, no avisa", () => {
    assert.equal(hayQueAvisar(conCompra, 0, { aprobada: true, esMaster: true, libre: false }), false);
    assert.equal(hayQueAvisar(conCompra, 0, { aprobada: false, esMaster: true, libre: true }), false);
  });
});

describe("bloqueoDeEspecie", () => {
  test("solo bloquea al jugador con la ficha aprobada", () => {
    assert.equal(bloqueoDeEspecie({ aprobada: false, esMaster: false, libre: false }), null);
    assert.equal(bloqueoDeEspecie({ aprobada: true, esMaster: true, libre: false }), null);
    assert.equal(bloqueoDeEspecie({ aprobada: true, esMaster: false, libre: true }), null);
    const motivo = bloqueoDeEspecie({ aprobada: true, esMaster: false, libre: false });
    assert.ok(motivo);
    const r = elegirEspecie(defaultSheet(), { especieId: "riux" }, { aprobada: true, esMaster: false, libre: false });
    assert.deepEqual(r, { error: motivo });
  });
});

describe("borrador del selector", () => {
  test("eleccionCompleta: casta y linaje obligatorios donde tocan", () => {
    assert.equal(eleccionCompleta({ especieId: null }), true);
    assert.equal(eleccionCompleta({ especieId: "riux" }), true);
    assert.equal(eleccionCompleta({ especieId: "manduk" }), false);
    assert.equal(eleccionCompleta({ especieId: "manduk", casta: "sabio" }), true);
    assert.equal(eleccionCompleta({ especieId: "manduk", casta: "noble" }), false);
    assert.equal(eleccionCompleta({ especieId: "manduk", casta: "noble", linaje: "irota" }), true);
    assert.equal(eleccionCompleta({ especieId: "dragon" }), false);
  });
  test("eleccionDeFicha y eleccionesIguales (null y ausente valen lo mismo)", () => {
    const e = eleccionDeFicha(ficha("manduk", { casta: "noble", linaje: "elion" }));
    assert.deepEqual(e, { especieId: "manduk", casta: "noble", linaje: "elion" });
    assert.deepEqual(eleccionDeFicha(ficha("riux")), { especieId: "riux", casta: null, linaje: null });
    assert.equal(eleccionesIguales({ especieId: "riux" }, { especieId: "riux", casta: null, linaje: null }), true);
    assert.equal(eleccionesIguales(e, { ...e, linaje: "irota" }), false);
  });
});

describe("rangoReferencia (sistema.md §14.5)", () => {
  test("sin especie o Humanos: nada", () => {
    assert.equal(rangoReferencia(especieDeFicha(ficha(null)), 0), null);
    assert.equal(rangoReferencia(especieDeFicha(ficha("humano")), 3), null);
  });
  test("Manduk sin casta: nada; con casta, la de la casta", () => {
    assert.equal(rangoReferencia(especieDeFicha(ficha("manduk")), 0), null);
    // Guerrero: 70-110 + 15 × Fuerza, 180-220. Fuerza 2 comprada + 1 de casta = 3.
    assert.deepEqual(rangoReferencia(especieDeFicha(ficha("manduk", { casta: "guerrero" })), 2), {
      fuente: "Manduk · Guerrero",
      pesoKg: { min: 115, max: 155 },
      alturaCm: { min: 180, max: 220 },
    });
  });
  test("Arköru: Fuerza con especie (comprada 1 + 2)", () => {
    // 80-120 + 15 × 3
    const r = rangoReferencia(especieDeFicha(ficha("arkoru")), 1);
    assert.deepEqual(r?.pesoKg, { min: 125, max: 165 });
    assert.equal(r?.fuente, "Arköru");
  });
  test("Riux con Fuerza negativa: resta, sin bajar de 0", () => {
    // 40-60 + 10 × (−1 − 1)
    assert.deepEqual(rangoReferencia(especieDeFicha(ficha("riux")), -1)?.pesoKg, { min: 20, max: 40 });
  });
});

describe("ficha v14: especieOpciones", () => {
  test("migración 13 → 14: empieza sin opciones", () => {
    const { ficha: f } = migrar({ schemaVersion: 13, especieId: "arkoru", fatigaTemporal: 0 }, 14);
    assert.equal(f.schemaVersion, 14);
    assert.deepEqual(f.especieOpciones, {});
    assert.equal(f.especieId, "arkoru");
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

// --- E2b: Resonancia +1 del Arianyi (§14.6) ----------------------------------

const resuelta = (s: Sheet, libre = false) => resolverFicha(s, { estadosCombate: [], libre });
const conPsionica = (s: Sheet, psionica: Sheet["psionica"], letra: Sheet["prioridades"]["psionica"] = null): Sheet => ({
  ...s,
  psionica,
  prioridades: { ...s.prioridades, psionica: letra },
});

describe("Resonancia +1 del Arianyi: nivel efectivo (sistema.md §14.6)", () => {
  test("con 0 comprado (letra E) juega con Resonancia 1 y cumple el requisito de Inducción 1", () => {
    const s = conPsionica(ficha("arianyi"), {}, "E");
    const r = resuelta(s);
    assert.deepEqual(r.psionica.disciplinas.resonancia, { comprado: 0, bono: 1, efectivo: 1, paraEfectos: 1 });
    assert.equal(r.psionica.paraEfectos.resonancia, 1);
    assert.equal(cumpleRequisito(s, "induccion", r.psionica.bonos), true);
    assert.equal(cumpleRequisito(s, "induccion", SIN_BONOS_DISCIPLINA), false);
    // Sin puntos no compra nada, pero ya tiene los poderes de Resonancia 1.
    assert.ok(accionesDePsionica(s, r.psionica.paraEfectos).some((p) => p.disciplina.id === "resonancia"));
  });

  test("Inducción se compra con Resonancia comprada 0 gracias al +1", () => {
    const s = conPsionica(ficha("arianyi"), {}, "C");
    const r = resuelta(s);
    const conInduccion = setDisciplinaValue(s, "induccion", 1, r.ajusteCoste, r.psionica.bonos);
    assert.deepEqual(conInduccion.psionica, { induccion: 1 });
    assert.equal(setDisciplinaValue(s, "induccion", 1, AJUSTE_NEUTRO, SIN_BONOS_DISCIPLINA), s);
  });

  test("comprado 6 → efectivo 7: cumple requisitos y los efectos usan la fila del 6", () => {
    const arianyi = conPsionica(ficha("arianyi"), { resonancia: 6 });
    const humano = conPsionica(ficha("humano"), { resonancia: 6 });
    const ra = resuelta(arianyi);
    assert.deepEqual(ra.psionica.disciplinas.resonancia, { comprado: 6, bono: 1, efectivo: 7, paraEfectos: 6 });
    assert.equal(cumpleRequisito(arianyi, "hipercognicion", ra.psionica.bonos), true);

    const poderes7 = accionesDePsionica(arianyi, ra.psionica.paraEfectos).filter((p) => p.disciplina.id === "resonancia");
    const poderes6 = accionesDePsionica(humano, resuelta(humano).psionica.paraEfectos).filter(
      (p) => p.disciplina.id === "resonancia",
    );
    assert.ok(poderes7.length > 0);
    assert.deepEqual(
      poderes7.map((p) => p.porDefecto),
      poderes6.map((p) => p.porDefecto),
    );
    // Alerta pasiva: alcance 20 × nivel poseído → 120 con el 6 y con el 7, no 140.
    assert.ok(poderes7.every((p) => p.nivelPoseido === 6));
    const alerta = (ps: typeof poderes7) => ps.find((p) => p.accion.id === "psi_resonancia_alerta_pasiva")!.porDefecto.alcance;
    assert.equal(alerta(poderes7), 120);
    assert.equal(alerta(poderes6), 120);
  });

  test("la compra (tope de 6) sigue mirando lo comprado", () => {
    const s = conPsionica(ficha("arianyi"), { resonancia: 6 });
    const { bonos } = resuelta(s).psionica;
    assert.equal(nivelDisciplina(setNivelDisciplina(s, "resonancia", 7, bonos), "resonancia"), 6);
  });

  test("sin especie, el nivel efectivo es el comprado", () => {
    const r = resuelta(conPsionica(ficha(null), { resonancia: 2, induccion: 1 }));
    assert.deepEqual(r.psionica.disciplinas.resonancia, { comprado: 2, bono: 0, efectivo: 2, paraEfectos: 2 });
    assert.deepEqual(r.psionica.bonos, {});
    assert.deepEqual(r.psionica.requisitosRotos, []);
  });

  test("bajar Resonancia comprada de 1 a 0 con Inducción comprada vale: el efectivo queda en 1", () => {
    const s = conPsionica(ficha("arianyi"), { resonancia: 1, induccion: 1 });
    const { bonos } = resuelta(s).psionica;
    assert.equal(sueloPorRequisitos(s, "resonancia", bonos), 0);
    assert.deepEqual(setNivelDisciplina(s, "resonancia", 0, bonos).psionica, { induccion: 1 });
    // Sin el +1, el suelo es 1 y no deja bajar.
    const humano = conPsionica(ficha("humano"), { resonancia: 1, induccion: 1 });
    assert.equal(sueloPorRequisitos(humano, "resonancia", SIN_BONOS_DISCIPLINA), 1);
    assert.equal(setNivelDisciplina(humano, "resonancia", 0, SIN_BONOS_DISCIPLINA), humano);
  });

  test("NPC en modo libre: también le llega el +1 (es derivado)", () => {
    const r = resuelta(conPsionica(ficha("arianyi"), {}), true);
    assert.equal(r.psionica.disciplinas.resonancia.efectivo, 1);
  });

  test("textoNivelDisciplina: '2 (1 + 1 especie)' con bono, el nivel a secas sin él", () => {
    const r = resuelta(conPsionica(ficha("arianyi"), { resonancia: 1 }));
    assert.equal(textoNivelDisciplina(r.psionica.disciplinas.resonancia, r.modificadores, "resonancia"), "2 (1 + 1 especie)");
    assert.equal(textoNivelDisciplina(r.psionica.disciplinas.induccion, r.modificadores, "induccion"), "0");
  });
});

describe("requisito roto tras cambiar de especie sin reset", () => {
  const exArianyi = conPsionica(ficha("arianyi"), { induccion: 2 });

  test("el máster con la ficha aprobada pasa de Arianyi a Humano: no se borra nada, se marca", () => {
    const r = elegirEspecie(exArianyi, { especieId: "humano" }, { aprobada: true, esMaster: true, libre: false });
    assert.ok(!("error" in r));
    assert.equal(r.reseteada, false);
    assert.deepEqual(r.sheet.psionica, { induccion: 2 });
    assert.deepEqual(resuelta(r.sheet).psionica.requisitosRotos, ["induccion"]);
    assert.deepEqual(requisitosRotos(r.sheet, SIN_BONOS_DISCIPLINA), ["induccion"]);
  });

  test("NPC en modo libre: lo mismo", () => {
    const r = elegirEspecie(exArianyi, { especieId: "riux" }, { aprobada: false, esMaster: true, libre: true });
    assert.ok(!("error" in r));
    assert.deepEqual(resuelta(r.sheet, true).psionica.requisitosRotos, ["induccion"]);
  });

  test("siendo Arianyi no hay nada roto; con el requisito roto se puede bajar pero no subir", () => {
    assert.deepEqual(resuelta(exArianyi).psionica.requisitosRotos, []);
    const humano = { ...exArianyi, especieId: "humano" };
    assert.deepEqual(setNivelDisciplina(humano, "induccion", 1, SIN_BONOS_DISCIPLINA).psionica, { induccion: 1 });
    assert.equal(setNivelDisciplina(humano, "induccion", 3, SIN_BONOS_DISCIPLINA), humano);
  });
});

// --- E2b: Acceso al Kerzul del Arköru (§14.6) --------------------------------

const KERZUL_IDS = [
  "kerzul_punal",
  "kerzul_espada_hacha_pico",
  "kerzul_espadon_hacha_armas",
  "kerzul_maza",
  "kerzul_baston_combate",
  "kerzul_lanza_corta",
  "kerzul_lanza_larga",
  "kerzul_martillo_enastado",
  "kerzul_alabarda",
  "kerzul_escudo",
];

describe("Acceso al Kerzul: puedeEquiparSinRareza", () => {
  const arkoru = ficha("arkoru");
  const excepciones = excepcionesRareza(especieDeFicha(arkoru));
  const ctx = { estado: "DRAFT", esMaster: false, excepciones } as const;

  test("el material sale del catálogo: las 10 piezas de kerzul, escudo incluido, y nada más", () => {
    for (const id of KERZUL_IDS) assert.equal(materialDePieza(id), "kerzul", id);
    assert.equal(materialDePieza("espada_cuchillo_combate"), null);
    assert.equal(materialDePieza("no_existe"), null);
    assert.deepEqual(excepciones, [{ material: "kerzul", maxPiezas: 1 }]);
    assert.deepEqual(excepcionesRareza(especieDeFicha(ficha("humano"))), []);
  });

  test("Arköru, en creación, jugador, pieza de kerzul y hueco libre: permitida", () => {
    assert.deepEqual(puedeEquiparSinRareza(arkoru, "kerzul_escudo", ctx), { permitida: true, material: "kerzul" });
  });

  test("los demás casos dan el motivo", () => {
    const motivo = (r: ReturnType<typeof puedeEquiparSinRareza>) => (r.permitida ? null : r.motivo);
    assert.equal(motivo(puedeEquiparSinRareza(arkoru, "kerzul_maza", { ...ctx, estado: "IN_REVIEW" })), "Solo en creación");
    assert.equal(motivo(puedeEquiparSinRareza(arkoru, "kerzul_maza", { ...ctx, estado: "APPROVED" })), "Solo en creación");
    assert.equal(
      motivo(puedeEquiparSinRareza(arkoru, "kerzul_maza", { ...ctx, esMaster: true })),
      "El máster no tiene tope de rareza",
    );
    assert.equal(
      motivo(puedeEquiparSinRareza(arkoru, "kerzul_maza", { ...ctx, excepciones: [] })),
      "Tu especie no tiene acceso a esta pieza sin rareza",
    );
    assert.equal(
      motivo(puedeEquiparSinRareza(arkoru, "espada_cuchillo_combate", ctx)),
      "Tu especie no tiene acceso a esta pieza sin rareza",
    );
  });

  test("una sola pieza vía especie; quitarla libera el hueco", () => {
    const conUna = equipar(arkoru, { instanciaId: "k1", catalogoId: "kerzul_punal", viaEspecie: true });
    assert.deepEqual(puedeEquiparSinRareza(conUna, "kerzul_escudo", ctx), {
      permitida: false,
      agotada: true,
      motivo: "Ya tienes tu pieza de kerzul vía especie",
    });
    // Una pieza de kerzul sin la marca (la equipó el máster) no gasta el hueco.
    const delMaster = equipar(arkoru, { instanciaId: "k2", catalogoId: "kerzul_punal" });
    assert.equal(puedeEquiparSinRareza(delMaster, "kerzul_escudo", ctx).permitida, true);
    assert.equal(puedeEquiparSinRareza(desequipar(conUna, "k1"), "kerzul_escudo", ctx).permitida, true);
  });

  test("topeRarezaDeCompra: vía especie si el tope bloquea, el motivo si no hay hueco", () => {
    assert.deepEqual(topeRarezaDeCompra(arkoru, "kerzul_maza", "Singular", "Muy Extraño", ctx), { tipo: "viaEspecie" });
    assert.deepEqual(topeRarezaDeCompra(arkoru, "kerzul_maza", "Singular", null, ctx), { tipo: "permitida" });
    assert.deepEqual(topeRarezaDeCompra(ficha("humano"), "kerzul_maza", "Singular", "Común", null), {
      tipo: "bloqueada",
      motivo: "Tu letra de Recursos no llega a Singular: tope Común.",
    });
    const conUna = equipar(arkoru, { instanciaId: "k1", catalogoId: "kerzul_punal", viaEspecie: true });
    assert.deepEqual(topeRarezaDeCompra(conUna, "kerzul_maza", "Singular", "Común", ctx), {
      tipo: "bloqueada",
      motivo: "Ya tienes tu pieza de kerzul vía especie",
    });
  });

  test("el NPC (modo libre) no recibe la excepción: es de creación", () => {
    assert.deepEqual(resuelta(arkoru, true).excepcionesRareza, []);
    assert.deepEqual(resuelta(arkoru).excepcionesRareza, excepciones);
  });

  test("viaEspecie no se acepta del cliente y sí sobrevive en la ficha", () => {
    const entrada = piezaEquipadaEntradaSchema.parse({ instanciaId: "k1", catalogoId: "kerzul_maza", viaEspecie: true });
    assert.deepEqual(entrada, { instanciaId: "k1", catalogoId: "kerzul_maza" });
    const s = parseSheet({
      schemaVersion: SCHEMA_VERSION,
      especieId: "arkoru",
      equipo: [{ instanciaId: "k1", catalogoId: "kerzul_maza", viaEspecie: true }],
    });
    assert.equal(s.equipo[0].viaEspecie, true);
  });
});
