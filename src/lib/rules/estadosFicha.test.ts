import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { leerEstados, ponerEstado, quitarEstado, estadosTrasTurno, estadosDeCombatiente } from "./estadosFicha";
import { duracionDe, estadoActivoCon, describirEstadosActivos, type EstadoActivo } from "./estados";
import { defaultSheet } from "./sheet";
import { resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";

const ATRAPADO: EstadoActivo = { estadoId: "atrapado", gradoId: "activo", rondasRestantes: 3 };
const ENFERMO: EstadoActivo = { estadoId: "enfermedad", gradoId: "nivel_2", rondasRestantes: null, finDeEscena: true };
const DERRIBADO: EstadoActivo = { estadoId: "derribado", gradoId: "activo", rondasRestantes: null };

describe("leerEstados (E1a: lector tolerante de Character.estados y Combatiente.estados)", () => {
  test("lo que no es una lista da []", () => {
    for (const json of [null, undefined, {}, "[]", 3, { estados: [ATRAPADO] }]) {
      assert.deepEqual(leerEstados(json), []);
    }
  });

  test("las tres duraciones pasan tal cual", () => {
    assert.deepEqual(leerEstados([ATRAPADO, ENFERMO, DERRIBADO]), [ATRAPADO, ENFERMO, DERRIBADO]);
  });

  test("entradas rotas, o con estado o grado que ya no existe, se descartan", () => {
    assert.deepEqual(
      leerEstados([
        null,
        "atrapado",
        { gradoId: "activo", rondasRestantes: 1 },
        { estadoId: "atrapado", rondasRestantes: 1 },
        { estadoId: "volando", gradoId: "activo", rondasRestantes: 1 },
        { estadoId: "enfermedad", gradoId: "nivel_99", rondasRestantes: 1 },
        ATRAPADO,
      ]),
      [ATRAPADO],
    );
  });

  test("una duración rara queda como hasta quitarlo", () => {
    const raras = [-1, 1.5, "3", Number.NaN, 10_000, true, { n: 2 }];
    for (const rondasRestantes of raras) {
      assert.deepEqual(leerEstados([{ estadoId: "atrapado", gradoId: "activo", rondasRestantes }]), [
        { estadoId: "atrapado", gradoId: "activo", rondasRestantes: null },
      ]);
    }
    // finDeEscena solo cuenta sin rondas, y solo si es true.
    assert.deepEqual(leerEstados([{ ...ATRAPADO, finDeEscena: true }]), [ATRAPADO]);
    assert.deepEqual(leerEstados([{ estadoId: "atrapado", gradoId: "activo", finDeEscena: "sí" }]), [
      { estadoId: "atrapado", gradoId: "activo", rondasRestantes: null },
    ]);
  });

  test("0 rondas vale (el catálogo lo usa: dura lo que queda de esta ronda)", () => {
    assert.deepEqual(leerEstados([{ ...ATRAPADO, rondasRestantes: 0 }]), [{ ...ATRAPADO, rondasRestantes: 0 }]);
  });

  test("un estadoId repetido se queda con la última entrada", () => {
    const otro: EstadoActivo = { estadoId: "enfermedad", gradoId: "nivel_1", rondasRestantes: 2 };
    assert.deepEqual(leerEstados([ENFERMO, ATRAPADO, otro]), [ATRAPADO, otro]);
  });

  test("las claves que no conoce no pasan", () => {
    assert.deepEqual(leerEstados([{ ...ATRAPADO, extra: 1 }]), [ATRAPADO]);
  });
});

describe("duración (E1a: rondas, fin de escena, hasta quitarlo)", () => {
  test("estadoActivoCon y duracionDe son inversas", () => {
    for (const d of [{ tipo: "rondas", rondas: 2 }, { tipo: "escena" }, { tipo: "hastaQuitarlo" }] as const) {
      assert.deepEqual(duracionDe(estadoActivoCon("atrapado", "activo", d)), d);
    }
  });

  test("describirEstadosActivos trae la duración", () => {
    assert.deepEqual(
      describirEstadosActivos([ATRAPADO, ENFERMO, DERRIBADO]).map((d) => d.duracion),
      [{ tipo: "rondas", rondas: 3 }, { tipo: "escena" }, { tipo: "hastaQuitarlo" }],
    );
  });
});

describe("ponerEstado / quitarEstado", () => {
  test("aplicar el mismo estado sustituye al anterior", () => {
    const nuevo: EstadoActivo = { estadoId: "enfermedad", gradoId: "nivel_1", rondasRestantes: 1 };
    assert.deepEqual(ponerEstado([ENFERMO, ATRAPADO], nuevo), [ATRAPADO, nuevo]);
  });

  test("quitar solo toca ese estado", () => {
    assert.deepEqual(quitarEstado([ENFERMO, ATRAPADO], "enfermedad"), [ATRAPADO]);
    assert.deepEqual(quitarEstado([ATRAPADO], "enfermedad"), [ATRAPADO]);
  });
});

describe("estadosTrasTurno (E1a: Siguiente turno descuenta también en la ficha)", () => {
  test("sin estados, nada que escribir", () => {
    assert.equal(estadosTrasTurno([]), null);
    assert.equal(estadosTrasTurno("basura"), null);
  });

  test("las rondas bajan y se caen al llegar a 0; escena y hasta quitarlo no se tocan", () => {
    const uno: EstadoActivo = { estadoId: "aturdido", gradoId: "fracaso", rondasRestantes: 1 };
    assert.deepEqual(estadosTrasTurno([ATRAPADO, uno, ENFERMO, DERRIBADO]), [
      { ...ATRAPADO, rondasRestantes: 2 },
      ENFERMO,
      DERRIBADO,
    ]);
  });

  test("solo con escena / hasta quitarlo devuelve la misma lista (se escribe, sin cambios)", () => {
    assert.deepEqual(estadosTrasTurno([ENFERMO, DERRIBADO]), [ENFERMO, DERRIBADO]);
  });
});

describe("estadosDeCombatiente (E1a: un solo sitio para los estados de un jugador)", () => {
  test("un jugador lleva los de su ficha; los de su fila no se suman", () => {
    assert.deepEqual(estadosDeCombatiente({ characterId: "pj1", estados: [ATRAPADO], character: { estados: [ENFERMO] } }),
      [ENFERMO],);
  });

  test("un jugador sin estados en la ficha no lleva ninguno, aunque su fila tenga", () => {
    assert.deepEqual(estadosDeCombatiente({ characterId: "pj2", estados: [ATRAPADO], character: { estados: [] } }), []);
    assert.deepEqual(estadosDeCombatiente({ characterId: "pj2", estados: [ATRAPADO], character: null }), []);
  });

  test("un NPC lleva los de su fila, leídos con el lector tolerante", () => {
    assert.deepEqual(
      estadosDeCombatiente({ characterId: null, estados: [ATRAPADO, { estadoId: "volando" }], character: null }),
      [ATRAPADO],
    );
  });
});

describe("resolverFicha con los estados de la ficha (E1a)", () => {
  const sheet = { ...defaultSheet(), atributos: { ...defaultSheet().atributos, fuerza: 3, aguante: 3 } };

  test("los estados entran en la ficha resuelta y mueven la vida máxima", () => {
    const sin = resolverFicha(sheet, { estados: [], vitalidad: VITALIDAD_DE_FICHA });
    const con = resolverFicha(sheet, { estados: [ENFERMO], vitalidad: VITALIDAD_DE_FICHA });
    assert.deepEqual(con.estados, [ENFERMO]);
    assert.ok(con.salud.vida < sin.salud.vida, `${con.salud.vida} < ${sin.salud.vida}`);
    // La vida actual guardada no se recorta.
    assert.equal(con.ficha.vidaActual, sheet.vidaActual);
  });

  test("piezasInutilizadas existe y está vacío", () => {
    const f = resolverFicha(sheet, { estados: [ENFERMO], vitalidad: VITALIDAD_DE_FICHA });
    assert.equal(f.piezasInutilizadas.size, 0);
  });
});
