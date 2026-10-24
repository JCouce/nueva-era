import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  estadoInicial,
  valorCondiciones,
  desgloseCondiciones,
  notasCondiciones,
  valorBonosTramo,
  desgloseBonosTramo,
  dificultadDeCondiciones,
  dificultadTrasCambio,
  resumenOpcion,
  type CondicionTirada,
} from "./condiciones";

const TOGGLE: CondicionTirada = {
  id: "apoyado",
  tipo: "toggle",
  etiqueta: "Apoyado",
  valorActivo: 1,
  valorInactivo: -1,
};

const OPCION: CondicionTirada = {
  id: "tramo",
  tipo: "opcion",
  etiqueta: "Distancia",
  opciones: [
    { id: "corta", etiqueta: "Corta", valor: 2 },
    { id: "larga", etiqueta: "Larga", valor: -2 },
  ],
  porDefecto: "corta",
};

const CONTADOR: CondicionTirada = {
  id: "atacantes",
  tipo: "contador",
  etiqueta: "Atacantes adicionales",
  valorPorUnidad: -1,
  min: 0,
  max: 6,
  porDefecto: 0,
};

describe("estado inicial", () => {
  test("un toggle sin activaPorDefecto arranca inactivo", () => {
    const estado = estadoInicial([TOGGLE]);
    assert.equal(estado.apoyado, false);
  });

  test("una opción arranca en su porDefecto", () => {
    const estado = estadoInicial([OPCION]);
    assert.equal(estado.tramo, "corta");
  });

  test("un contador arranca en su porDefecto", () => {
    const estado = estadoInicial([CONTADOR]);
    assert.equal(estado.atacantes, 0);
  });
});

describe("valor de las condiciones", () => {
  test("toggle inactivo usa valorInactivo", () => {
    const estado = estadoInicial([TOGGLE]);
    assert.equal(valorCondiciones([TOGGLE], estado), -1);
  });

  test("toggle activo usa valorActivo", () => {
    assert.equal(valorCondiciones([TOGGLE], { apoyado: true }), 1);
  });

  test("un toggle sin valorInactivo no aporta nada si está apagado", () => {
    const sinInactivo: CondicionTirada = { ...TOGGLE, valorInactivo: undefined };
    assert.equal(valorCondiciones([sinInactivo], { apoyado: false }), 0);
  });

  test("opción elegida aporta su valor", () => {
    assert.equal(valorCondiciones([OPCION], { tramo: "larga" }), -2);
  });

  test("contador multiplica unidades por valorPorUnidad", () => {
    assert.equal(valorCondiciones([CONTADOR], { atacantes: 3 }), -3);
  });

  test("varias condiciones se suman", () => {
    const estado = { apoyado: true, tramo: "corta", atacantes: 2 };
    assert.equal(valorCondiciones([TOGGLE, OPCION, CONTADOR], estado), 1 + 2 - 2);
  });
});

describe("desglose de las condiciones", () => {
  test("un toggle inactivo se marca 'sin activar'", () => {
    const [linea] = desgloseCondiciones([TOGGLE], { apoyado: false });
    assert.match(linea.etiqueta, /sin activar/);
    assert.equal(linea.valor, -1);
  });

  test("una opción muestra la elegida en la etiqueta", () => {
    const [linea] = desgloseCondiciones([OPCION], { tramo: "larga" });
    assert.equal(linea.etiqueta, "Distancia: Larga");
    assert.equal(linea.valor, -2);
  });

  test("un contador muestra las unidades en la etiqueta", () => {
    const [linea] = desgloseCondiciones([CONTADOR], { atacantes: 3 });
    assert.equal(linea.etiqueta, "Atacantes adicionales ×3");
    assert.equal(linea.valor, -3);
  });

  test("una línea por condición, en el mismo orden", () => {
    const lineas = desgloseCondiciones([TOGGLE, OPCION, CONTADOR], {
      apoyado: true,
      tramo: "corta",
      atacantes: 1,
    });
    assert.equal(lineas.length, 3);
    assert.deepEqual(
      lineas.map((l) => l.valor),
      [1, 2, -1],
    );
  });
});

describe("notasCondiciones", () => {
  const TOGGLE_CON_NOTA: CondicionTirada = {
    id: "visor",
    tipo: "toggle",
    etiqueta: "Visor Nocturno activo",
    valorActivo: 0,
    valorInactivo: 0,
    nota: "Ves a través del humo.",
  };
  const OPCION_CON_NOTA: CondicionTirada = {
    id: "modo",
    tipo: "opcion",
    etiqueta: "Modo",
    opciones: [
      { id: "simple", etiqueta: "Simple", valor: 0 },
      { id: "rafaga", etiqueta: "Ráfaga", valor: -2, nota: "Consume 3 balas." },
    ],
    porDefecto: "simple",
  };

  test("un toggle inactivo no aporta nota, aunque la tenga declarada", () => {
    assert.deepEqual(notasCondiciones([TOGGLE_CON_NOTA], { visor: false }), []);
  });

  test("un toggle activo con nota la incluye, con la etiqueta de la condición", () => {
    assert.deepEqual(notasCondiciones([TOGGLE_CON_NOTA], { visor: true }), [
      { etiqueta: "Visor Nocturno activo", nota: "Ves a través del humo." },
    ]);
  });

  test("una opción sin nota (la elegida) no aporta nada", () => {
    assert.deepEqual(notasCondiciones([OPCION_CON_NOTA], { modo: "simple" }), []);
  });

  test("la opción elegida con nota la incluye, con la etiqueta de la condición (no de la opción)", () => {
    assert.deepEqual(notasCondiciones([OPCION_CON_NOTA], { modo: "rafaga" }), [
      { etiqueta: "Modo", nota: "Consume 3 balas." },
    ]);
  });

  test("un contador nunca aporta nota", () => {
    assert.deepEqual(notasCondiciones([CONTADOR], { atacantes: 2 }), []);
  });

  test("se acumulan varias notas activas a la vez, en orden", () => {
    const notas = notasCondiciones([TOGGLE_CON_NOTA, OPCION_CON_NOTA], {
      visor: true,
      modo: "rafaga",
    });
    assert.deepEqual(notas, [
      { etiqueta: "Visor Nocturno activo", nota: "Ves a través del humo." },
      { etiqueta: "Modo", nota: "Consume 3 balas." },
    ]);
  });
});

describe("bonos por tramo", () => {
  const MIRA = { fuente: "Mira Telescópica", porTramo: { media: 1, larga: 1 } };

  test("no aporta nada si el tramo no está entre los suyos", () => {
    assert.equal(valorBonosTramo([MIRA], { tramo: "corta" }), 0);
  });

  test("aporta su valor en el tramo que sí cubre", () => {
    assert.equal(valorBonosTramo([MIRA], { tramo: "media" }), 1);
  });

  test("sin tramo elegido en el estado, no aporta nada", () => {
    assert.equal(valorBonosTramo([MIRA], {}), 0);
  });

  test("el desglose no pinta una fila a 0 en un tramo que el bono no cubre (2026-10-24)", () => {
    assert.deepEqual(desgloseBonosTramo([MIRA], { tramo: "corta" }), []);
    assert.deepEqual(desgloseBonosTramo([MIRA], { tramo: "media" }), [{ etiqueta: "Mira Telescópica", valor: 1 }]);
  });

  test("un 0 explícito del tramo elegido (descartado por no apilar) sí sale", () => {
    const descartado = { fuente: "Mira Telescópica (no se suma con Ojo Biónico)", porTramo: { media: 0 } };
    assert.deepEqual(desgloseBonosTramo([descartado], { tramo: "media" }), [{ etiqueta: descartado.fuente, valor: 0 }]);
  });

  test("varios bonos se listan cada uno con su fuente", () => {
    const otro = { fuente: "Otra Mejora", porTramo: { larga: 2 } };
    const lineas = desgloseBonosTramo([MIRA, otro], { tramo: "larga" });
    assert.deepEqual(
      lineas.map((l) => l.valor),
      [1, 2],
    );
  });
});

// S94: opciones que fijan la dificultad (Hemostáticos, tratamientos de la VTM, Escáner, Radar).
describe("opciones con dificultad", () => {
  const SELECTOR: CondicionTirada = {
    id: "trat",
    tipo: "opcion",
    etiqueta: "Tratamiento",
    opciones: [
      { id: "normal", etiqueta: "Normal", valor: 0, sinValor: true },
      { id: "frio", etiqueta: "Congelación", valor: 0, sinValor: true, dificultad: 6 },
      { id: "confusion", etiqueta: "Confusión", valor: 0, sinValor: true, dificultad: 7 },
    ],
    porDefecto: "normal",
  };

  test("la opción elegida fija la dificultad; sin ella, undefined", () => {
    assert.equal(dificultadDeCondiciones([SELECTOR], { trat: "normal" }), undefined);
    assert.equal(dificultadDeCondiciones([SELECTOR], { trat: "frio" }), 6);
  });

  test("al cambiar el selector: la de la opción, o la base si no trae ninguna", () => {
    assert.equal(dificultadTrasCambio([SELECTOR], { trat: "confusion" }, "trat", 7), 7);
    assert.equal(dificultadTrasCambio([SELECTOR], { trat: "frio" }, "trat", 9), 6);
    assert.equal(dificultadTrasCambio([SELECTOR], { trat: "normal" }, "trat", 9), 9);
  });

  test("un cambio en otra condición sin dificultades no la toca", () => {
    assert.equal(dificultadTrasCambio([SELECTOR, TOGGLE], { trat: "frio", apoyado: true }, "apoyado", 7), undefined);
  });

  test("el botón enseña la dificultad", () => {
    assert.equal(resumenOpcion({ id: "x", etiqueta: "X", valor: 0, sinValor: true, dificultad: 9 }), "dif. 9");
  });
});
