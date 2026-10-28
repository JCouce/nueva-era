// Umbrales de salud y fatiga como estados automáticos (docs/tareas.md): Heridas y Fatiga con su
// nivel e Inconsciencia a 0, derivados en resolverFicha y nunca guardados. Que los números no
// cambian lo fija umbrales-caracterizacion.test.ts.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ESTADOS, ESTADOS_DERIVADOS, estadoPorId } from "../catalog/estados";
import { estadoAAplicarSchema } from "../validation";
import {
  describirEstados,
  estadosDerivados,
  modificadoresDeEstados,
  type EstadoActivo,
} from "./estados";
import { estadosAlCerrarVuelta, estadosDeNpcTras, leerEstados, sinEstados } from "./estadosFicha";
import { estadosParaPintar, resolverFicha, VITALIDAD_DE_FICHA, type VitalidadActual } from "./fichaResuelta";
import { defaultSheet, type Sheet } from "./sheet";

// Vida 12 y fatiga 12 en la ficha.
function ficha(patch: Partial<Sheet> = {}): Sheet {
  const d = defaultSheet();
  return {
    ...d,
    atributos: { fuerza: 2, agilidad: 2, aguante: 2, percepcion: 0, inteligencia: 0, caracter: 2 },
    vidaActual: 12,
    fatigaActual: 12,
    fatigaTemporal: 0,
    ...patch,
  };
}

const combate = (pgActual: number, fatigaActual: number, pgMax = 10, fatigaMax = 10): VitalidadActual => ({
  origen: "combate",
  pgActual,
  pgMax,
  fatigaActual,
  fatigaMax,
});

const derivados = (s: Sheet, v: VitalidadActual, estados: EstadoActivo[] = []) =>
  resolverFicha(s, { estados, vitalidad: v }).estadosDerivados;

const INCONSCIENTE = { estadoId: "inconsciencia", gradoId: "activo" };

describe("catálogo: Heridas y Fatiga solo como derivados", () => {
  test("dos estados con niveles: Heridas (Herido, Malherido, Moribundo) y Fatiga (Fatigado, Exhausto)", () => {
    assert.deepEqual(
      ESTADOS_DERIVADOS.map((e) => [e.id, e.grados.map((g) => g.label)]),
      [
        ["heridas", ["Herido", "Malherido", "Moribundo"]],
        ["fatiga", ["Fatigado", "Exhausto"]],
      ],
    );
  });

  test("sin modificadores propios: el −N lo pone la lógica de umbrales, una sola vez", () => {
    for (const e of ESTADOS_DERIVADOS) for (const g of e.grados) assert.deepEqual(g.modificadores, []);
  });

  test("no salen en el selector del máster (ESTADOS) ni los encuentra estadoPorId", () => {
    for (const id of ["heridas", "fatiga"]) {
      assert.ok(!ESTADOS.some((e) => e.id === id));
      assert.equal(estadoPorId(id), null);
    }
  });

  test("la validación del máster no deja ponerlos", () => {
    const r = estadoAAplicarSchema.safeParse({ estadoId: "heridas", gradoId: "malherido", duracion: { tipo: "escena" } });
    assert.equal(r.success, false);
  });
});

describe("estados derivados por banda (con la vida/fatiga de resolverFicha)", () => {
  for (const [pg, fatiga, esperado] of [
    [10, 10, []],
    [5, 10, []],
    [4, 10, [{ estadoId: "heridas", gradoId: "herido" }]],
    [2, 10, [{ estadoId: "heridas", gradoId: "malherido" }]],
    [1, 10, [{ estadoId: "heridas", gradoId: "moribundo" }]],
    [10, 3, []],
    [10, 2, [{ estadoId: "fatiga", gradoId: "fatigado" }]],
    [10, 1, [{ estadoId: "fatiga", gradoId: "exhausto" }]],
    [
      4,
      2,
      [
        { estadoId: "heridas", gradoId: "herido" },
        { estadoId: "fatiga", gradoId: "fatigado" },
      ],
    ],
    [
      1,
      1,
      [
        { estadoId: "heridas", gradoId: "moribundo" },
        { estadoId: "fatiga", gradoId: "exhausto" },
      ],
    ],
  ] as const) {
    test(`vida ${pg}/10, fatiga ${fatiga}/10`, () => {
      assert.deepEqual(derivados(ficha(), combate(pg, fatiga)), esperado);
    });
  }

  test("un nivel por estado (S14): Moribundo sustituye a Malherido y Herido", () => {
    const d = derivados(ficha(), combate(1, 10));
    assert.equal(d.filter((e) => e.estadoId === "heridas").length, 1);
  });

  test("S15: con PGmáx 5, 1 de vida ya es Moribundo y 1 de fatiga Exhausto", () => {
    assert.deepEqual(derivados(ficha(), combate(1, 1, 5, 5)), [
      { estadoId: "heridas", gradoId: "moribundo" },
      { estadoId: "fatiga", gradoId: "exhausto" },
    ]);
  });

  test("fuera de combate, la vida y la fatiga de la ficha (fatiga efectiva con la temporal de Proeza)", () => {
    assert.deepEqual(derivados(ficha({ vidaActual: 5 }), VITALIDAD_DE_FICHA), [{ estadoId: "heridas", gradoId: "herido" }]);
    // 12 de máximo: Fatigado < 3. Con 3 no; con 1 de temporal, efectiva 3 − 1 = 2, sí.
    assert.deepEqual(derivados(ficha({ fatigaActual: 3 }), VITALIDAD_DE_FICHA), []);
    assert.deepEqual(derivados(ficha({ fatigaActual: 3, fatigaTemporal: 1 }), VITALIDAD_DE_FICHA), [
      { estadoId: "fatiga", gradoId: "fatigado" },
    ]);
  });

  test("los derivados coinciden con `umbrales` de la misma ficha", () => {
    const f = resolverFicha(ficha(), { estados: [], vitalidad: combate(2, 1) });
    assert.deepEqual(f.umbrales.salud, "malherido");
    assert.deepEqual(f.umbrales.fatiga, "exhausto");
    assert.deepEqual(f.estadosDerivados, [
      { estadoId: "heridas", gradoId: "malherido" },
      { estadoId: "fatiga", gradoId: "exhausto" },
    ]);
  });

  test("las reducciones (Guerrero) no quitan el estado: el estado es el nivel, el número va aparte", () => {
    const s = ficha({ especieId: "manduk", especieOpciones: { casta: "guerrero" } });
    assert.deepEqual(derivados(s, combate(4, 10)), [{ estadoId: "heridas", gradoId: "herido" }]);
  });
});

describe("Inconsciencia automática a 0", () => {
  test("vida 0: Moribundo e Inconsciencia", () => {
    assert.deepEqual(derivados(ficha(), combate(0, 10)), [{ estadoId: "heridas", gradoId: "moribundo" }, INCONSCIENTE]);
  });

  test("fatiga 0: Exhausto e Inconsciencia", () => {
    assert.deepEqual(derivados(ficha(), combate(10, 0)), [{ estadoId: "fatiga", gradoId: "exhausto" }, INCONSCIENTE]);
  });

  test("fatiga efectiva 0 (la temporal de Proeza se resta): inconsciente", () => {
    assert.deepEqual(derivados(ficha({ fatigaActual: 1, fatigaTemporal: 1 }), VITALIDAD_DE_FICHA), [
      { estadoId: "fatiga", gradoId: "exhausto" },
      INCONSCIENTE,
    ]);
  });

  test("vida y fatiga a 0: una sola Inconsciencia", () => {
    const d = derivados(ficha(), combate(0, 0));
    assert.equal(d.filter((e) => e.estadoId === "inconsciencia").length, 1);
  });

  test("con 1 de vida no: la de sobrecarga psiónica la pone el máster", () => {
    assert.ok(!derivados(ficha(), combate(1, 1)).some((e) => e.estadoId === "inconsciencia"));
  });

  test("sin máximo no hay nada que derivar", () => {
    assert.deepEqual(estadosDerivados(0, 0, 0, 0), []);
  });
});

describe("estadosParaPintar: derivados marcados automáticos, delante de los guardados", () => {
  const aturdido: EstadoActivo = { estadoId: "aturdido", gradoId: "exito", rondasRestantes: 2 };

  test("Heridas (Malherido) automático, sin duración, y el guardado detrás con la suya", () => {
    const f = resolverFicha(ficha(), { estados: [aturdido], vitalidad: combate(2, 10) });
    const pintados = estadosParaPintar(f);
    assert.deepEqual(
      pintados.map((e) => [e.label, e.automatico ?? false, e.duracion.tipo]),
      [
        ["Heridas (Malherido)", true, "hastaQuitarlo"],
        ["Aturdido (Éxito)", false, "rondas"],
      ],
    );
    assert.equal(pintados[0].nombre, "Heridas");
    assert.equal(pintados[0].grado, "Malherido");
    assert.ok(pintados[0].detalle.join(" ").includes("−3 a todas las tiradas"));
  });

  test("Inconsciencia puesta a mano y derivada: se enseña una vez, la puesta (con su duración)", () => {
    const aMano: EstadoActivo = { estadoId: "inconsciencia", gradoId: "activo", rondasRestantes: null, finDeEscena: true };
    const f = resolverFicha(ficha(), { estados: [aMano], vitalidad: combate(0, 10) });
    const pintados = estadosParaPintar(f);
    const inconsciencias = pintados.filter((e) => e.estadoId === "inconsciencia");
    assert.equal(inconsciencias.length, 1);
    assert.equal(inconsciencias[0].automatico, undefined);
    assert.deepEqual(inconsciencias[0].duracion, { tipo: "escena" });
    // Heridas sigue saliendo automática.
    assert.ok(pintados.some((e) => e.estadoId === "heridas" && e.automatico));
  });

  test("Inconsciencia solo derivada: automática", () => {
    const f = resolverFicha(ficha(), { estados: [], vitalidad: combate(0, 10) });
    const i = estadosParaPintar(f).find((e) => e.estadoId === "inconsciencia");
    assert.equal(i?.automatico, true);
    assert.equal(i?.label, "Inconsciencia");
  });

  test("las inmunidades no tocan a los derivados", () => {
    const pintados = describirEstados([], [{ estadoId: "heridas", gradoId: "herido" }], [{ estadoId: "heridas", fuente: "Prueba" }]);
    assert.equal(pintados[0].inmune, undefined);
  });

  test("sin umbral, la lista es la de siempre", () => {
    const f = resolverFicha(ficha(), { estados: [aturdido], vitalidad: combate(10, 10) });
    assert.deepEqual(
      estadosParaPintar(f).map((e) => e.estadoId),
      ["aturdido"],
    );
  });
});

describe("nunca se guardan", () => {
  test("FichaResuelta.estados son solo los guardados", () => {
    const f = resolverFicha(ficha(), { estados: [], vitalidad: combate(0, 0) });
    assert.deepEqual(f.estados, []);
    assert.equal(f.estadosDerivados.length, 3);
  });

  test("las funciones de estadosFicha no ven Heridas ni Fatiga aunque alguien las escriba", () => {
    const json = [
      { estadoId: "heridas", gradoId: "malherido", rondasRestantes: null },
      { estadoId: "fatiga", gradoId: "exhausto", rondasRestantes: null },
    ];
    assert.deepEqual(leerEstados(json), []);
    assert.equal(sinEstados(json), null);
    assert.equal(estadosAlCerrarVuelta(json), null);
    assert.equal(estadosDeNpcTras(json, { tipo: "quitar", estadoId: "heridas" }), null);
  });

  test("modificadoresDeEstados no suma un derivado aunque le llegue como guardado", () => {
    const comoGuardado: EstadoActivo = { estadoId: "heridas", gradoId: "moribundo", rondasRestantes: null };
    assert.deepEqual(modificadoresDeEstados([comoGuardado]), []);
  });

  test("el −N de Malherido sale una vez en los modificadores", () => {
    const f = resolverFicha(ficha(), { estados: [], vitalidad: combate(2, 10) });
    const lineas = f.modificadores.filter((m) => m.tipo === "tirada" && m.fuente.includes("Malherido"));
    assert.equal(lineas.length, 1);
    assert.equal(lineas[0].valor, -3);
    assert.equal(lineas[0].origen, "estado");
  });
});

describe("NPC y combatiente: con la vida de su fila", () => {
  test("NPC (modo libre) con su foto de combate, no la de su plantilla", () => {
    const plantilla = ficha();
    const f = resolverFicha(plantilla, { estados: [], vitalidad: combate(2, 1), libre: true });
    assert.deepEqual(f.estadosDerivados, [
      { estadoId: "heridas", gradoId: "malherido" },
      { estadoId: "fatiga", gradoId: "exhausto" },
    ]);
    assert.deepEqual(resolverFicha(plantilla, { estados: [], vitalidad: VITALIDAD_DE_FICHA, libre: true }).estadosDerivados, []);
  });

  test("jugador en combate: su fila manda aunque la ficha esté entera", () => {
    assert.deepEqual(derivados(ficha(), combate(4, 10)), [{ estadoId: "heridas", gradoId: "herido" }]);
  });
});
