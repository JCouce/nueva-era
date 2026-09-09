import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { estadoInicial, valorCondiciones, type CondicionTirada } from "./condiciones";

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
