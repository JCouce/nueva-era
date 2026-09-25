import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet } from "./sheet";
import { equipar } from "./equipo";
import {
  capacidadDePieza,
  reconciliarRecursos,
  recursoDe,
  ajustarRecurso,
  comprarRecarga,
  gastoDelModo,
  ajustarMaterial,
  comprarMaterial,
  precioMaterial,
  PRECIO_CARGADOR_BALAS,
  PRECIO_BATERIA_PORTATIL,
} from "./recursos";

// Mosquito: municion 7, sin F. Auto (tipo "stock").
// Sydiasi: municion 20, con F. Auto (tipo "stock").
// Camuflaje Trifásico: célula 10 cargas (tipo "tope").
// Escudo Deflector: subsistema SIN célula — autorrecargable, sin recurso.

describe("capacidadDePieza", () => {
  test("un arma de fuego es tipo stock, con la munición como máximo", () => {
    const cap = capacidadDePieza({ instanciaId: "a1", catalogoId: "pistola_mosquito" });
    assert.deepEqual(cap, { max: 7, tipo: "stock" });
  });

  test("un subsistema con célula es tipo tope", () => {
    const cap = capacidadDePieza({ instanciaId: "c1", catalogoId: "camuflaje_trifasico" });
    assert.deepEqual(cap, { max: 10, tipo: "tope" });
  });

  test("un subsistema sin célula (autorrecargable) no tiene recurso", () => {
    const cap = capacidadDePieza({ instanciaId: "e1", catalogoId: "escudo_deflector" });
    assert.equal(cap, null);
  });

  test("una pieza que no existe en el catálogo no tiene recurso", () => {
    const cap = capacidadDePieza({ instanciaId: "x1", catalogoId: "no_existe" });
    assert.equal(cap, null);
  });

  test("una armadura no tiene recurso (fuera de alcance de este primer pase)", () => {
    const cap = capacidadDePieza({ instanciaId: "arm1", catalogoId: "armadura_ligera" });
    assert.equal(cap, null);
  });
});

describe("reconciliarRecursos (vía equipar/desequipar)", () => {
  test("equipar un arma auto-puebla su recurso a tope", () => {
    const s = equipar(defaultSheet(), { instanciaId: "a1", catalogoId: "pistola_mosquito" });
    assert.deepEqual(recursoDe(s, "a1"), { instanciaId: "a1", actual: 7, max: 7 });
  });

  test("equipar algo sin recurso (una armadura) no añade nada a recursos", () => {
    const s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_ligera" });
    assert.equal(s.recursos.length, 0);
  });

  test("desequipar retira su entrada de recursos", () => {
    let s = equipar(defaultSheet(), { instanciaId: "a1", catalogoId: "pistola_mosquito" });
    assert.equal(s.recursos.length, 1);
    s = { ...s, equipo: [] }; // simula desequipar() sin depender de su propia lógica de host
    s = reconciliarRecursos(s);
    assert.equal(s.recursos.length, 0);
  });

  test("reconciliar no pisa un actual ya gastado ni un max ya crecido por compra", () => {
    let s = equipar(defaultSheet(), { instanciaId: "a1", catalogoId: "pistola_mosquito" });
    s = ajustarRecurso(s, "a1", -3); // 4/7
    const conCompra = comprarRecarga(s, "a1"); // 11/14
    assert.ok(conCompra);
    s = conCompra.sheet;
    assert.deepEqual(recursoDe(s, "a1"), { instanciaId: "a1", actual: 11, max: 14 });

    // Reconciliar de nuevo (como hace equipar() en cualquier otra compra) no
    // debe resetear ni actual ni max de esta instancia.
    s = reconciliarRecursos(s);
    assert.deepEqual(recursoDe(s, "a1"), { instanciaId: "a1", actual: 11, max: 14 });
  });

  test("dos armas iguales llevan cada una su propio total, independiente", () => {
    let s = equipar(defaultSheet(), { instanciaId: "a1", catalogoId: "pistola_mosquito" });
    s = equipar(s, { instanciaId: "a2", catalogoId: "pistola_mosquito" });
    s = ajustarRecurso(s, "a1", -5); // a1: 2/7
    assert.deepEqual(recursoDe(s, "a1"), { instanciaId: "a1", actual: 2, max: 7 });
    assert.deepEqual(recursoDe(s, "a2"), { instanciaId: "a2", actual: 7, max: 7 });
  });
});

describe("ajustarRecurso", () => {
  function conMosquito() {
    return equipar(defaultSheet(), { instanciaId: "a1", catalogoId: "pistola_mosquito" });
  }

  test("un delta negativo no baja de 0", () => {
    const s = ajustarRecurso(conMosquito(), "a1", -100);
    assert.equal(recursoDe(s, "a1")?.actual, 0);
  });

  test("un delta positivo no sube del máximo", () => {
    let s = ajustarRecurso(conMosquito(), "a1", -5); // 2/7
    s = ajustarRecurso(s, "a1", 100);
    assert.equal(recursoDe(s, "a1")?.actual, 7);
  });

  test("una instancia sin recurso rastreado no cambia nada", () => {
    const s = conMosquito();
    const s2 = ajustarRecurso(s, "no-existe", -1);
    assert.equal(s2, s);
  });
});

describe("comprarRecarga", () => {
  test("un recurso tipo stock (arma) suma la capacidad tanto a max como a actual", () => {
    let s = equipar(defaultSheet(), { instanciaId: "a1", catalogoId: "pistola_mosquito" });
    s = ajustarRecurso(s, "a1", -2); // 5/7
    const res = comprarRecarga(s, "a1");
    assert.ok(res);
    assert.deepEqual(recursoDe(res.sheet, "a1"), { instanciaId: "a1", actual: 12, max: 14 });
    assert.equal(res.coste, PRECIO_CARGADOR_BALAS);
  });

  test("un recurso tipo tope (batería) solo restaura actual, el máximo no cambia", () => {
    // Orden real: la armadura primero, para que validarInstalacion no
    // rechace el subsistema por falta de host.
    let s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_ligera" });
    s = equipar(s, {
      instanciaId: "c1",
      catalogoId: "camuflaje_trifasico",
      nivel: 1,
      instaladoEnId: "arm1",
    });
    s = ajustarRecurso(s, "c1", -6); // 4/10
    const res = comprarRecarga(s, "c1");
    assert.ok(res);
    assert.deepEqual(recursoDe(res.sheet, "c1"), { instanciaId: "c1", actual: 10, max: 10 });
    assert.equal(res.coste, PRECIO_BATERIA_PORTATIL);
  });

  test("una instancia sin recurso devuelve null", () => {
    const s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_ligera" });
    assert.equal(comprarRecarga(s, "arm1"), null);
  });

  test("una instancia que no existe devuelve null", () => {
    assert.equal(comprarRecarga(defaultSheet(), "no-existe"), null);
  });
});

describe("precioMaterial", () => {
  test("los 3 tiers cotizan el precio ya transcrito del catálogo", () => {
    assert.equal(precioMaterial("sencillos"), 250);
    assert.equal(precioMaterial("sofisticados"), 500);
    assert.equal(precioMaterial("avanzados"), 750);
  });
});

describe("ajustarMaterial", () => {
  test("un delta negativo no baja de 0", () => {
    const s = ajustarMaterial(defaultSheet(), "sencillos", -5);
    assert.equal(s.materiales.sencillos, 0);
  });

  test("un delta positivo suma sin tope superior", () => {
    let s = ajustarMaterial(defaultSheet(), "avanzados", 3);
    s = ajustarMaterial(s, "avanzados", 10);
    assert.equal(s.materiales.avanzados, 13);
  });

  test("no toca los otros tiers", () => {
    const s = ajustarMaterial(defaultSheet(), "sofisticados", 2);
    assert.equal(s.materiales.sencillos, 0);
    assert.equal(s.materiales.avanzados, 0);
  });
});

describe("comprarMaterial", () => {
  test("suma 1 unidad al tier y devuelve su precio de catálogo", () => {
    const res = comprarMaterial(defaultSheet(), "sofisticados");
    assert.equal(res.sheet.materiales.sofisticados, 1);
    assert.equal(res.coste, 500);
  });

  test("comprar dos veces acumula", () => {
    let s = defaultSheet();
    s = comprarMaterial(s, "sencillos").sheet;
    s = comprarMaterial(s, "sencillos").sheet;
    assert.equal(s.materiales.sencillos, 2);
  });
});

describe("gastoDelModo", () => {
  test("un modo sin F. Auto gasta 1", () => {
    assert.equal(gastoDelModo("Simple", 20), 1);
    assert.equal(gastoDelModo("Estándar", 20), 1);
  });

  test("un modo con F. Auto gasta fijo la capacidad del cargador del arma", () => {
    assert.equal(gastoDelModo("Estándar (F. Auto)", 20), 20);
    assert.equal(gastoDelModo("Compleja (F. Auto)", 100), 100);
  });
});
