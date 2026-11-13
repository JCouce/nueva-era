import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { prolongarEstado } from "./prolongarEstado";
import { describirEstadosActivos, type EstadoActivo } from "./estados";

const sondeo = (cambios: Partial<EstadoActivo> = {}): EstadoActivo => ({
  estadoId: "psi_sondeo_no_local",
  gradoId: "activo",
  rondasRestantes: 2,
  valor: 2,
  ...cambios,
});
const F = { efectiva: 8, max: 10 };

describe("prolongarEstado (ps-07)", () => {
  test("cobra la fatiga que guarda el estado y suma un turno", () => {
    const p = prolongarEstado([sondeo()], "psi_sondeo_no_local", F);
    assert.ok(p.ok);
    assert.equal(p.coste, 2);
    assert.deepEqual(p.estado, sondeo({ rondasRestantes: 3 }));
    assert.equal(p.fuente, "Sondeo No-Local");
    assert.deepEqual(p.avisos, []);
  });

  test("sin rondas (fuera de combate), sigue sin rondas y cobra igual", () => {
    const p = prolongarEstado([sondeo({ rondasRestantes: null })], "psi_sondeo_no_local", F);
    assert.ok(p.ok);
    assert.equal(p.estado.rondasRestantes, null);
    assert.equal(p.coste, 2);
  });

  test("sin fatiga suficiente no deja", () => {
    const p = prolongarEstado([sondeo()], "psi_sondeo_no_local", { efectiva: 1, max: 10 });
    assert.deepEqual(p, { ok: false, error: "Te faltan 1 de fatiga (tienes 1, cuesta 2)." });
  });

  test("cruzar a exhausto avisa de la sobrecarga; quedarse a 0 ya exhausto, de la inconsciencia", () => {
    const cruza = prolongarEstado([sondeo()], "psi_sondeo_no_local", { efectiva: 3, max: 10 });
    assert.ok(cruza.ok);
    assert.match(cruza.avisos.join(" "), /sobrecarga/);
    const cero = prolongarEstado([sondeo()], "psi_sondeo_no_local", { efectiva: 2, max: 30 });
    assert.ok(cero.ok);
    assert.deepEqual(cero.avisos, ["Te has quedado sin fatiga: quedas inconsciente al terminar la acción."]);
  });

  test("sin el estado puesto, sin número o con un estado no prolongable, error", () => {
    assert.equal(prolongarEstado([], "psi_sondeo_no_local", F).ok, false);
    assert.equal(prolongarEstado([sondeo({ valor: undefined })], "psi_sondeo_no_local", F).ok, false);
    const sigilo: EstadoActivo = { estadoId: "sigilo", gradoId: "activo", rondasRestantes: null, valor: 12 };
    assert.deepEqual(prolongarEstado([sigilo], "sigilo", F), { ok: false, error: "Ese estado no se puede prolongar." });
  });
});

describe("el chip del estado prolongable", () => {
  test("lleva el botón con su coste, el de quitarlo y no enseña el número suelto", () => {
    const [d] = describirEstadosActivos([sondeo()]);
    assert.deepEqual(d.prolongar, { etiqueta: "Prolongar un turno", coste: 2 });
    assert.equal(d.quitarJugador, "Terminar sondeo");
    assert.equal(d.valorTexto, undefined);
    assert.equal(d.label, "Sondeo No-Local");
  });
});
