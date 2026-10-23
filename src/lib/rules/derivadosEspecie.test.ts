// E3 (docs/sistema.md §14.7): movimiento, carga y blindaje por especie.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { FORMULA_MOVIMIENTO_GENERAL } from "./formulaMovimiento";
import { defaultSheet, type Sheet } from "./sheet";
import { equipar } from "./equipo";
import { movimiento, cargaMaxima, modificadoresActivos } from "./derivados";
import { blindajeContra, desgloseBlindaje, SIN_ARMADURA_NATURAL } from "./blindaje";
import {
  armaduraNaturalDeEspecie,
  especieDeFicha,
  formulaMovimientoDeEspecie,
  FORMULA_MOVIMIENTO_NEUTRA,
  multiplicadorCargaDeEspecie,
  MULTIPLICADOR_CARGA_NEUTRO,
} from "./especie";
import { notasDeEstado, resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";

// Fuerza variable, Agilidad 2, Atletismo 2; con Armadura Pesada y, si `exo`,
// Exoesqueleto 2 (+4 a la base del movimiento y a la Fuerza de la carga).
function ficha(especieId: string | null, fuerza: number, exo: boolean, opciones: Sheet["especieOpciones"] = {}): Sheet {
  const d = defaultSheet();
  let s: Sheet = {
    ...d,
    especieId,
    especieOpciones: opciones,
    atributos: { ...d.atributos, fuerza, agilidad: 2 },
    habilidades: { ...d.habilidades, atletismo: { valor: 2, especialidades: [] } },
  };
  s = equipar(s, { instanciaId: "a", catalogoId: "armadura_pesada" });
  if (exo) s = equipar(s, { instanciaId: "e", catalogoId: "exoesqueleto", nivel: 2, instaladoEnId: "a" });
  return s;
}

// --- Caracterización: fijada con el código de antes de E3 --------------------
// Sin especie y especies sin efectos aquí (Riux, Humanos): estos números no se
// mueven con E3. Si uno cambia, es un bug.
// S11 (2026-10-23): los aplicados pasan a redondear hacia abajo. Potencia = ⌊(Fuerza + 2)/2⌋:
// Fuerza −1 → 0 (base 2), Fuerza 0 → 1 (base 3), Fuerza 3 → 2 (base 4). Con el ceil de
// antes, Fuerza −1 y 0 daban la misma Potencia 1 y compartían números.

const MOV_SIN_EXO_FM1 = { bonoExoesqueleto: 0, carrera: 18, saltoVertical: 30, saltoHorizontal: 140, escalada: 5, nado: 5 };
const MOV_SIN_EXO = { bonoExoesqueleto: 0, carrera: 19, saltoVertical: 45, saltoHorizontal: 160, escalada: 5, nado: 5 };
const MOV_SIN_EXO_F3 = { bonoExoesqueleto: 0, carrera: 20, saltoVertical: 60, saltoHorizontal: 180, escalada: 6, nado: 6 };
const MOV_EXO_FM1 = { bonoExoesqueleto: 4, carrera: 22, saltoVertical: 90, saltoHorizontal: 220, escalada: 7, nado: 7 };
const MOV_EXO = { bonoExoesqueleto: 4, carrera: 23, saltoVertical: 105, saltoHorizontal: 240, escalada: 7, nado: 7 };
const MOV_EXO_F3 = { bonoExoesqueleto: 4, carrera: 24, saltoVertical: 120, saltoHorizontal: 260, escalada: 8, nado: 8 };

const CARACTERIZACION: { especieId: string | null; fuerza: number; exo: boolean; mov: typeof MOV_EXO; carga: number }[] = [
  { especieId: null, fuerza: -1, exo: false, mov: MOV_SIN_EXO_FM1, carga: 10 },
  { especieId: null, fuerza: -1, exo: true, mov: MOV_EXO_FM1, carga: 60 },
  { especieId: null, fuerza: 0, exo: false, mov: MOV_SIN_EXO, carga: 15 },
  { especieId: null, fuerza: 0, exo: true, mov: MOV_EXO, carga: 80 },
  { especieId: null, fuerza: 3, exo: false, mov: MOV_SIN_EXO_F3, carga: 60 },
  { especieId: null, fuerza: 3, exo: true, mov: MOV_EXO_F3, carga: 140 },
  // Riux: Fuerza −1 y Agilidad +1 (la Potencia no cambia con estos números).
  { especieId: "riux", fuerza: -1, exo: false, mov: MOV_SIN_EXO_FM1, carga: 5 },
  { especieId: "riux", fuerza: -1, exo: true, mov: MOV_EXO_FM1, carga: 40 },
  { especieId: "riux", fuerza: 0, exo: false, mov: MOV_SIN_EXO, carga: 10 },
  { especieId: "riux", fuerza: 0, exo: true, mov: MOV_EXO, carga: 60 },
  { especieId: "riux", fuerza: 3, exo: false, mov: MOV_SIN_EXO_F3, carga: 40 },
  { especieId: "riux", fuerza: 3, exo: true, mov: MOV_EXO_F3, carga: 120 },
  { especieId: "humano", fuerza: -1, exo: false, mov: MOV_SIN_EXO_FM1, carga: 10 },
  { especieId: "humano", fuerza: 0, exo: true, mov: MOV_EXO, carga: 80 },
  { especieId: "humano", fuerza: 3, exo: false, mov: MOV_SIN_EXO_F3, carga: 60 },
];

describe("caracterización: movimiento, carga y blindaje sin efectos de especie", () => {
  for (const c of CARACTERIZACION) {
    test(`${c.especieId ?? "sin especie"}, Fuerza ${c.fuerza}${c.exo ? ", con exoesqueleto" : ""}`, () => {
      const s = ficha(c.especieId, c.fuerza, c.exo);
      const mods = modificadoresActivos(s);
      assert.deepEqual(movimiento(s, mods, FORMULA_MOVIMIENTO_GENERAL), c.mov);
      assert.equal(cargaMaxima(s, mods, 1), c.carga);
      assert.deepEqual(desgloseBlindaje(s, "cinetico", SIN_ARMADURA_NATURAL), [{ etiqueta: "Armadura Pesada", valor: 8 }]);
      assert.deepEqual(desgloseBlindaje(s, "fuego", SIN_ARMADURA_NATURAL), [{ etiqueta: "Fuego (falta Mejora Ignífuga)", valor: 0 }]);
      assert.deepEqual(desgloseBlindaje(s, "mental", SIN_ARMADURA_NATURAL), [{ etiqueta: "Mental omite blindaje", valor: 0 }]);
    });
  }

  test("base negativa: salto vertical en su mínimo de 15, el resto sin bajar de 0", () => {
    for (const especieId of [null, "riux"]) {
      const s: Sheet = { ...defaultSheet(), especieId }; // base −1
      const m = movimiento(s, modificadoresActivos(s), FORMULA_MOVIMIENTO_GENERAL);
      assert.deepEqual(m, { bonoExoesqueleto: 0, carrera: 15, saltoVertical: 15, saltoHorizontal: 80, escalada: 3, nado: 3 });
    }
  });

  test("sin armadura, desglose vacío", () => {
    for (const especieId of [null, "riux", "humano"]) {
      assert.deepEqual(desgloseBlindaje({ ...defaultSheet(), especieId }, "cinetico", SIN_ARMADURA_NATURAL), []);
    }
  });
});

// --- E3 ---------------------------------------------------------------------

const ZIME = { casta: "noble", linaje: "zimethroni" };
const resuelta = (s: Sheet, libre = false) => resolverFicha(s, { vitalidad: VITALIDAD_DE_FICHA, estados: [], libre });

describe("resolución de especie (especie.ts)", () => {
  test("sin especie y especies sin efectos aquí: neutros", () => {
    for (const especieId of [null, "riux", "humano"]) {
      const e = especieDeFicha({ especieId, especieOpciones: {} });
      assert.deepEqual(formulaMovimientoDeEspecie(e), FORMULA_MOVIMIENTO_NEUTRA);
      assert.deepEqual(multiplicadorCargaDeEspecie(e), MULTIPLICADOR_CARGA_NEUTRO);
      assert.deepEqual(armaduraNaturalDeEspecie(e), SIN_ARMADURA_NATURAL);
    }
    // Zimethroni suma con Modificador, no cambia de fórmula.
    assert.deepEqual(formulaMovimientoDeEspecie(especieDeFicha({ especieId: "manduk", especieOpciones: ZIME })), FORMULA_MOVIMIENTO_NEUTRA);
  });

  test("Arköru: fórmula completa, × 1,2 y armadura natural 1, con su fuente", () => {
    const e = especieDeFicha({ especieId: "arkoru", especieOpciones: {} });
    assert.deepEqual(formulaMovimientoDeEspecie(e), {
      formula: { saltoVerticalPorPunto: 18, saltoHorizontalPorPunto: 25, escaladaBase: 8, nadoBase: 2 },
      fuentes: { saltoVerticalPorPunto: "Arköru", saltoHorizontalPorPunto: "Arköru", escaladaBase: "Arköru", nadoBase: "Arköru" },
    });
    assert.deepEqual(multiplicadorCargaDeEspecie(e), { valor: 1.2, fuente: "Arköru" });
    assert.deepEqual(armaduraNaturalDeEspecie(e), { valor: 1, fuente: "Arköru" });
  });

  test("Arianyi: solo el nado, el resto de la general", () => {
    const e = especieDeFicha({ especieId: "arianyi", especieOpciones: {} });
    assert.deepEqual(formulaMovimientoDeEspecie(e), {
      formula: { ...FORMULA_MOVIMIENTO_GENERAL, nadoBase: 8 },
      fuentes: { nadoBase: "Arianyi" },
    });
  });
});

describe("movimiento por especie (§14.7)", () => {
  const CASOS: { nombre: string; s: Sheet; mov: ReturnType<typeof movimiento> }[] = [
    // Arköru: Fuerza 2, Agilidad 1 → Potencia ⌊3/2⌋ = 1; base 3 (7 con exoesqueleto).
    { nombre: "Arköru", s: ficha("arkoru", 0, false), mov: { bonoExoesqueleto: 0, carrera: 19, saltoVertical: 54, saltoHorizontal: 175, escalada: 9, nado: 3 } },
    { nombre: "Arköru con exoesqueleto", s: ficha("arkoru", 0, true), mov: { bonoExoesqueleto: 4, carrera: 23, saltoVertical: 126, saltoHorizontal: 275, escalada: 11, nado: 5 } },
    // Arianyi: Fuerza −1, Agilidad 3 → Potencia 1; base 3 (7).
    { nombre: "Arianyi", s: ficha("arianyi", 0, false), mov: { bonoExoesqueleto: 0, carrera: 19, saltoVertical: 45, saltoHorizontal: 160, escalada: 5, nado: 9 } },
    { nombre: "Arianyi con exoesqueleto", s: ficha("arianyi", 0, true), mov: { bonoExoesqueleto: 4, carrera: 23, saltoVertical: 105, saltoHorizontal: 240, escalada: 7, nado: 11 } },
    // Noble Zimethroni: Agilidad 3 → Potencia ⌊3/2⌋ = 1; base 3 (7). +4 / +200 / +200 / +2 / +2.
    { nombre: "Noble Zimethroni", s: ficha("manduk", 0, false, ZIME), mov: { bonoExoesqueleto: 0, carrera: 23, saltoVertical: 245, saltoHorizontal: 360, escalada: 7, nado: 7 } },
    { nombre: "Noble Zimethroni con exoesqueleto", s: ficha("manduk", 0, true, ZIME), mov: { bonoExoesqueleto: 4, carrera: 27, saltoVertical: 305, saltoHorizontal: 440, escalada: 9, nado: 9 } },
  ];
  for (const { nombre, s, mov } of CASOS) {
    test(nombre, () => assert.deepEqual(resuelta(s).movimiento, mov));
  }

  test("salto vertical: mínimo 15 con base 0 y negativa; Zimethroni suma el +200 después (215)", () => {
    const d = defaultSheet(); // Atletismo sin entrenar (−1)
    const conFuerza = (especieId: string, fuerza: number, opciones = {}): Sheet => ({
      ...d,
      especieId,
      especieOpciones: opciones,
      atributos: { ...d.atributos, fuerza },
    });
    // Arköru: Fuerza 1 comprada (3 con la especie) y Agilidad −1 → Potencia ⌊2/2⌋ = 1, base 0;
    // con Fuerza 0 comprada, Potencia ⌊1/2⌋ = 0, base −1.
    assert.deepEqual(resuelta(conFuerza("arkoru", 1)).movimiento, { bonoExoesqueleto: 0, carrera: 16, saltoVertical: 15, saltoHorizontal: 100, escalada: 8, nado: 2 });
    assert.deepEqual(resuelta(conFuerza("arkoru", 0)).movimiento, { bonoExoesqueleto: 0, carrera: 15, saltoVertical: 15, saltoHorizontal: 75, escalada: 7, nado: 1 });
    // Zimethroni: Fuerza 1 y Agilidad 1 → Potencia 1, base 0; con Fuerza 0, Potencia ⌊1/2⌋ = 0, base −1.
    assert.deepEqual(resuelta(conFuerza("manduk", 1, ZIME)).movimiento, { bonoExoesqueleto: 0, carrera: 20, saltoVertical: 215, saltoHorizontal: 300, escalada: 6, nado: 6 });
    assert.deepEqual(resuelta(conFuerza("manduk", 0, ZIME)).movimiento, { bonoExoesqueleto: 0, carrera: 19, saltoVertical: 215, saltoHorizontal: 280, escalada: 5, nado: 5 });
  });
});

describe("carga del Arköru × 1,2 (§14.7)", () => {
  // Fuerza comprada fuera del rango de creación a propósito, para llegar a cada tramo
  // con el +2 del Arköru.
  test("los tres tramos de §5.5, × 1,2", () => {
    assert.equal(resuelta(ficha("arkoru", 1, false)).cargaMaxima, 72); // Fuerza 3: 60 × 1,2
    assert.equal(resuelta(ficha("arkoru", -2, false)).cargaMaxima, 18); // Fuerza 0: 15 × 1,2
    assert.equal(resuelta(ficha("arkoru", -3, false)).cargaMaxima, 12); // Fuerza −1: 10 × 1,2
    assert.equal(resuelta(ficha("arkoru", -4, false)).cargaMaxima, 6); // Fuerza −2: 5 × 1,2
  });

  test("con exoesqueleto, sobre el total (exoesqueleto incluido)", () => {
    assert.equal(resuelta(ficha("arkoru", 0, true)).cargaMaxima, 144); // (2 + 4) × 20 × 1,2
  });

  test("todos los tramos dan entero: Fuerza × 24, 18, 12, 6, 0", () => {
    for (let fuerza = -8; fuerza <= 12; fuerza++) {
      const carga = resuelta(ficha("arkoru", fuerza - 2, false)).cargaMaxima;
      const esperada = fuerza > 0 ? fuerza * 24 : fuerza === 0 ? 18 : Math.max(0, 18 + fuerza * 6);
      assert.equal(carga, esperada, `Fuerza ${fuerza}`);
      assert.ok(Number.isInteger(carga), `Fuerza ${fuerza}: ${carga}`);
    }
  });
});

describe("armadura natural del Arköru (§14.7, M7)", () => {
  const LINEA = { etiqueta: "Armadura natural · Arköru", valor: 1 };

  test("contra cinético se suma a la armadura puesta, en línea propia", () => {
    const r = resuelta(ficha("arkoru", 0, false));
    const desglose = desgloseBlindaje(r.ficha, "cinetico", r.blindaje.armaduraNatural);
    assert.deepEqual(desglose, [{ etiqueta: "Armadura Pesada", valor: 8 }, LINEA]);
    assert.equal(blindajeContra(r.ficha, "cinetico", r.blindaje.armaduraNatural), 9);
  });

  test("sin armadura, solo la natural", () => {
    const r = resuelta({ ...defaultSheet(), especieId: "arkoru" });
    assert.deepEqual(desgloseBlindaje(r.ficha, "plasma", r.blindaje.armaduraNatural), [LINEA]);
  });

  test("no contra Fuego ni Mental", () => {
    const r = resuelta(ficha("arkoru", 0, false));
    assert.equal(blindajeContra(r.ficha, "fuego", r.blindaje.armaduraNatural), 0);
    assert.equal(blindajeContra(r.ficha, "mental", r.blindaje.armaduraNatural), 0);
  });

  test("las demás especies no la tienen", () => {
    for (const [especieId, opciones] of [["arianyi", {}], ["riux", {}], ["manduk", ZIME]] as const) {
      assert.deepEqual(resuelta(ficha(especieId, 0, false, opciones)).blindaje.armaduraNatural, SIN_ARMADURA_NATURAL);
    }
  });
});

describe("NPC en modo libre: le llegan los derivados de especie (§14.3)", () => {
  for (const [nombre, s] of [
    ["Arköru", ficha("arkoru", 0, true)],
    ["Arianyi", ficha("arianyi", 0, false)],
    ["Noble Zimethroni", ficha("manduk", 0, false, ZIME)],
  ] as const) {
    test(nombre, () => {
      const jugador = resuelta(s);
      const npc = resuelta(s, true);
      assert.deepEqual(npc.movimiento, jugador.movimiento);
      assert.equal(npc.cargaMaxima, jugador.cargaMaxima);
      assert.deepEqual(npc.blindaje.armaduraNatural, jugador.blindaje.armaduraNatural);
      assert.deepEqual(notasDeEstado(npc), notasDeEstado(jugador));
    });
  }

  test("el Arköru NPC recibe de verdad lo suyo", () => {
    const npc = resuelta(ficha("arkoru", 0, false), true);
    assert.equal(npc.movimiento.saltoVertical, 54);
    assert.equal(npc.cargaMaxima, 48);
    assert.deepEqual(npc.blindaje.armaduraNatural, { valor: 1, fuente: "Arköru" });
  });
});

describe("notas de Personaje → Estado", () => {
  const NADA = { alerta: undefined, carrera: undefined, saltoVertical: undefined, saltoHorizontal: undefined, escalada: undefined, nado: undefined, vuelo: undefined, levitacion: undefined, carga: undefined };

  test("sin especie ni exoesqueleto, ninguna; Riux y Humanos tampoco", () => {
    for (const especieId of [null, "riux", "humano"]) assert.deepEqual(notasDeEstado(resuelta(ficha(especieId, 0, false))), NADA);
  });

  test("solo exoesqueleto: la de siempre en las cinco de movimiento", () => {
    const exo = "+4 exoesqueleto";
    assert.deepEqual(notasDeEstado(resuelta(ficha(null, 0, true))), {
      ...NADA,
      carrera: exo,
      saltoVertical: exo,
      saltoHorizontal: exo,
      escalada: exo,
      nado: exo,
    });
  });

  test("Arköru: fórmula en saltos, escalada y nado, y × 1,2 en la carga", () => {
    const f = "fórmula · Arköru";
    assert.deepEqual(notasDeEstado(resuelta(ficha("arkoru", 0, false))), {
      ...NADA,
      saltoVertical: f,
      saltoHorizontal: f,
      escalada: f,
      nado: f,
      carga: "×1,2 · Arköru",
    });
  });

  test("Arköru con exoesqueleto: conviven las dos", () => {
    const n = notasDeEstado(resuelta(ficha("arkoru", 0, true)));
    assert.equal(n.carrera, "+4 exoesqueleto");
    assert.equal(n.saltoVertical, "+4 exoesqueleto, fórmula · Arköru");
    assert.equal(n.carga, "×1,2 · Arköru");
  });

  test("Arianyi: solo el nado", () => {
    assert.deepEqual(notasDeEstado(resuelta(ficha("arianyi", 0, false))), { ...NADA, nado: "fórmula · Arianyi" });
  });

  test("Noble Zimethroni: el +N con su fuente", () => {
    const c = "Casa de Zimethroni";
    assert.deepEqual(notasDeEstado(resuelta(ficha("manduk", 0, false, ZIME))), {
      ...NADA,
      carrera: `+4 · ${c}`,
      saltoVertical: `+200 · ${c}`,
      saltoHorizontal: `+200 · ${c}`,
      escalada: `+2 · ${c}`,
      nado: `+2 · ${c}`,
    });
  });
});

describe("resolverFicha da lo mismo que la caracterización sin efectos de especie", () => {
  for (const c of CARACTERIZACION) {
    test(`${c.especieId ?? "sin especie"}, Fuerza ${c.fuerza}${c.exo ? ", con exoesqueleto" : ""}`, () => {
      const r = resuelta(ficha(c.especieId, c.fuerza, c.exo));
      assert.deepEqual(r.movimiento, c.mov);
      assert.equal(r.cargaMaxima, c.carga);
      assert.deepEqual(r.blindaje.armaduraNatural, SIN_ARMADURA_NATURAL);
    });
  }
});
