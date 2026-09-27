import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet } from "./sheet";
import { equipar } from "./equipo";
import { accionesDeMovimiento } from "./movimiento";
import { capacidadDePieza } from "./recursos";
import { resolverVuelo, MARGEN_CRITICO } from "./acciones";

function equiparMovilidadAerea(nivel: number) {
  let s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_pesada" }); // tope 4
  s = equipar(s, { instanciaId: "m1", catalogoId: "movilidad_aerea", nivel, instaladoEnId: "arm1" });
  return s;
}

describe("accionesDeMovimiento", () => {
  test("sin nada equipado, ninguna tirada", () => {
    assert.deepEqual(accionesDeMovimiento(defaultSheet()), []);
  });

  test("Exoesqueleto (misma familia, no es Movilidad Aérea) no genera tirada", () => {
    let s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_pesada" });
    s = equipar(s, { instanciaId: "e1", catalogoId: "exoesqueleto", nivel: 1, instaladoEnId: "arm1" });
    assert.deepEqual(accionesDeMovimiento(s), []);
  });

  test("Movilidad Aérea nivel 1: Reflejos + Tecnociencia, ajuste fijo +3, grupo Acciones", () => {
    const sheet = equiparMovilidadAerea(1);
    const [accion] = accionesDeMovimiento(sheet);
    assert.equal(accion.label, "Volar");
    assert.equal(accion.grupo, "Acciones");
    assert.equal(accion.aplicado, "reflejos");
    assert.equal(accion.habilidad, "tecnociencia");
    assert.deepEqual(accion.ajustesFijos, [{ valor: 3, fuente: "Maniobrabilidad (Movilidad Aérea)" }]);
    assert.deepEqual(accion.vuelo, { velocidadBase: 50, bonusCritico: 25 });
  });

  test("Máxima Potencia vive como toggle en condiciones, no como acción aparte", () => {
    const sheet = equiparMovilidadAerea(1);
    const [accion] = accionesDeMovimiento(sheet);
    const toggle = accion.condiciones?.find((c) => c.id === "maxima_potencia");
    assert.ok(toggle);
    assert.equal(toggle?.tipo, "toggle");
    // No debe tocar el modificador de la tirada — solo cambia el payout.
    if (toggle?.tipo === "toggle") {
      assert.equal(toggle.valorActivo, 0);
      assert.equal(toggle.valorInactivo, 0);
    }
  });

  test("recursoInstanciaId apunta a la instancia de Movilidad Aérea", () => {
    const sheet = equiparMovilidadAerea(1);
    const [accion] = accionesDeMovimiento(sheet);
    assert.equal(accion.recursoInstanciaId, "m1");
  });

  test("Máxima Potencia gasta 2 cargas, normal gasta 1 (docs/prompt-gasto-recursos.md, Fase 1)", () => {
    const sheet = equiparMovilidadAerea(1);
    const [accion] = accionesDeMovimiento(sheet);
    const toggle = accion.condiciones?.find((c) => c.id === "maxima_potencia");
    assert.ok(toggle?.tipo === "toggle");
    if (toggle?.tipo === "toggle") {
      assert.equal(toggle.gastoInactivo, 1);
      assert.equal(toggle.gastoActivo, 2);
    }
  });

  test("nivel 4: ajuste +4, vuelo con los números de ese nivel", () => {
    const sheet = equiparMovilidadAerea(4);
    const [accion] = accionesDeMovimiento(sheet);
    assert.deepEqual(accion.ajustesFijos, [{ valor: 4, fuente: "Maniobrabilidad (Movilidad Aérea)" }]);
    assert.deepEqual(accion.vuelo, { velocidadBase: 140, bonusCritico: 70 });
  });
});

describe("resolverVuelo (nivel 1: base 50 m, bonus crítico 25 m)", () => {
  const vuelo = { velocidadBase: 50, bonusCritico: 25 };

  test("éxito normal, sin Máxima Potencia: la velocidad base", () => {
    assert.deepEqual(resolverVuelo(vuelo, 0, false), { metros: 50, descontrolado: false });
  });

  test("éxito con Máxima Potencia: el doble", () => {
    assert.deepEqual(resolverVuelo(vuelo, 0, true), { metros: 100, descontrolado: false });
  });

  test("éxito crítico sin Máxima Potencia: sin bonus (es propiedad de Máxima Potencia)", () => {
    assert.deepEqual(resolverVuelo(vuelo, MARGEN_CRITICO, false), { metros: 50, descontrolado: false });
  });

  test("éxito crítico con Máxima Potencia: el doble más el bonus", () => {
    assert.deepEqual(resolverVuelo(vuelo, MARGEN_CRITICO, true), { metros: 125, descontrolado: false });
  });

  test("fallo (no crítico): la mitad de la base que tocara", () => {
    assert.deepEqual(resolverVuelo(vuelo, -1, false), { metros: 25, descontrolado: false });
    assert.deepEqual(resolverVuelo(vuelo, -1, true), { metros: 50, descontrolado: false });
  });

  test("fracaso crítico: descontrolado, sin metros fijos, sea cual sea el modo", () => {
    assert.deepEqual(resolverVuelo(vuelo, -MARGEN_CRITICO, false), { metros: null, descontrolado: true });
    assert.deepEqual(resolverVuelo(vuelo, -MARGEN_CRITICO, true), { metros: null, descontrolado: true });
  });
});

describe("capacidadDePieza — Movilidad Aérea", () => {
  test("es un recurso tipo tope, con la célula de 10 cargas", () => {
    const cap = capacidadDePieza({ instanciaId: "m1", catalogoId: "movilidad_aerea", nivel: 1 });
    assert.deepEqual(cap, { max: 10, tipo: "tope" });
  });

  test("Exoesqueleto no tiene recurso (su célula no está poblada en el catálogo)", () => {
    const cap = capacidadDePieza({ instanciaId: "e1", catalogoId: "exoesqueleto", nivel: 1 });
    assert.equal(cap, null);
  });
});
