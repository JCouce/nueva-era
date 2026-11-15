// En combate hay una sola vida, la de la foto (usuario, 2026-11-15): dónde caen los ajustes de la
// ficha, sus topes y que al terminar el combate la ficha conserva lo ajustado dentro.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { reconciliarVida, topesDeVida, vitalidadAlEntrarEnCombate, vitalidadAlSalirDeCombate } from "./vitalidad";
import { ajustarVitalEnJuego, type VitalDeFoto } from "./vidaEnJuego";
import { resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";
import { usoDeAccionAumento } from "./aumentosAcciones";

// defaultSheet(): todos los atributos a 0 → máximos de vida y fatiga 10.
const entera = (): Sheet => reconciliarVida(defaultSheet());
const foto = (f: Partial<VitalDeFoto> = {}): VitalDeFoto => ({
  pgActual: 6,
  pgMax: 10,
  fatigaActual: 4,
  fatigaMax: 10,
  danio: { noLetal: 0, letal: 4, grave: 0 },
  ...f,
});

describe("ajustarVitalEnJuego fuera de combate: la ficha", () => {
  test("−/+ vida, por categoría y fatiga van a la ficha, como siempre", () => {
    const s = entera();
    const vida = ajustarVitalEnJuego(s, [], null, { recurso: "vida", delta: -3 });
    assert.equal(vida.foto, null);
    assert.equal(vida.sheet.vidaActual, 7);
    assert.deepEqual(vida.sheet.danio, { noLetal: 0, letal: 3, grave: 0 });
    const grave = ajustarVitalEnJuego(s, [], null, { recurso: "vida", categoria: "grave", delta: -2 });
    assert.deepEqual(grave.sheet.danio, { noLetal: 0, letal: 0, grave: 2 });
    assert.equal(ajustarVitalEnJuego(s, [], null, { recurso: "fatiga", delta: -4 }).sheet.fatigaActual, 6);
  });
});

describe("ajustarVitalEnJuego en combate: la foto", () => {
  test("el daño cae en la foto y la ficha no se toca", () => {
    const s = entera();
    const r = ajustarVitalEnJuego(s, [], foto(), { recurso: "vida", delta: -2 });
    assert.equal(r.sheet, s);
    assert.equal(r.foto?.pgActual, 4);
    assert.deepEqual(r.foto?.danio, { noLetal: 0, letal: 6, grave: 0 });
  });

  test("respeta los topes de la foto: suelo 0 y la cura no pasa de pgMax", () => {
    const s = entera();
    assert.equal(ajustarVitalEnJuego(s, [], foto(), { recurso: "vida", delta: -99 }).foto?.pgActual, 0);
    const curada = ajustarVitalEnJuego(s, [], foto({ pgMax: 8, danio: { noLetal: 0, letal: 2, grave: 0 } }), { recurso: "vida", delta: 99 });
    assert.equal(curada.foto?.pgActual, 8);
    assert.deepEqual(curada.foto?.danio, { noLetal: 0, letal: 0, grave: 0 });
  });

  test("la fatiga, también en la foto y con sus topes", () => {
    const s = entera();
    const gasta = ajustarVitalEnJuego(s, [], foto(), { recurso: "fatiga", delta: -9 });
    assert.equal(gasta.sheet, s);
    assert.equal(gasta.foto?.fatigaActual, 0);
    assert.equal(gasta.foto?.pgActual, 6);
    assert.equal(ajustarVitalEnJuego(s, [], foto({ fatigaMax: 5 }), { recurso: "fatiga", delta: 9 }).foto?.fatigaActual, 5);
  });

  test("curar por categoría en combate: sale solo de esa categoría de la foto", () => {
    const f = foto({ pgActual: 5, danio: { noLetal: 2, letal: 3, grave: 0 } });
    const r = ajustarVitalEnJuego(entera(), [], f, { recurso: "vida", categoria: "noLetal", delta: 5 });
    assert.equal(r.foto?.pgActual, 7);
    assert.deepEqual(r.foto?.danio, { noLetal: 0, letal: 3, grave: 0 });
    const golpe = ajustarVitalEnJuego(entera(), [], f, { recurso: "vida", categoria: "grave", delta: -2 });
    assert.equal(golpe.foto?.pgActual, 3);
    assert.deepEqual(golpe.foto?.danio, { noLetal: 2, letal: 3, grave: 2 });
  });

  test("sin cambio, la misma foto (no hay nada que escribir)", () => {
    const f = foto({ pgActual: 10, danio: { noLetal: 0, letal: 0, grave: 0 } });
    assert.equal(ajustarVitalEnJuego(entera(), [], f, { recurso: "vida", delta: 3 }).foto, f);
    assert.equal(ajustarVitalEnJuego(entera(), [], f, { recurso: "vida", categoria: "letal", delta: 3 }).foto, f);
  });
});

describe("de extremo a extremo: lo ajustado en combate vuelve a la ficha", () => {
  test("herido 7, recibe 4 en combate, se cura +2 → al terminar la ficha queda en 5", () => {
    const ficha = { ...entera(), vidaActual: 7, danio: { noLetal: 0, letal: 3, grave: 0 } };
    const topes = topesDeVida(ficha);
    const entrada = vitalidadAlEntrarEnCombate(ficha, topes);
    let f: VitalDeFoto = { ...entrada, pgMax: topes.vida, fatigaMax: topes.fatiga };
    let s = ficha;
    for (const ajuste of [
      { recurso: "vida", categoria: "grave", delta: -4 },
      { recurso: "vida", delta: 2 },
    ] as const) {
      const r = ajustarVitalEnJuego(s, [], f, ajuste);
      s = r.sheet;
      f = r.foto ?? f;
    }
    assert.equal(s, ficha, "la ficha no se toca durante el combate");
    assert.equal(f.pgActual, 5);
    const tras = vitalidadAlSalirDeCombate(s, f, topes);
    assert.equal(tras.vidaActual, 5);
    // La cura sin categoría quita de lo más leve: el letal antes que el grave.
    assert.deepEqual(tras.danio, { noLetal: 0, letal: 1, grave: 4 });
  });
});

describe("FichaResuelta.vital: lo que enseña la ficha", () => {
  test("fuera de combate, la ficha; en combate, la foto con su desglose", () => {
    const s = { ...entera(), vidaActual: 8, fatigaActual: 9 };
    const fuera = resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA }).vital;
    assert.deepEqual(fuera, {
      vida: { actual: 8, max: 10 },
      fatiga: { actual: 9, max: 10 },
      danio: { noLetal: 0, letal: 2, grave: 0 },
      deCombate: false,
    });
    const dentro = resolverFicha(s, {
      estados: [],
      vitalidad: { origen: "combate", pgActual: 3, pgMax: 12, fatigaActual: 2, fatigaMax: 11, danio: { noLetal: 4, letal: 0, grave: 5 } },
    }).vital;
    assert.deepEqual(dentro, {
      vida: { actual: 3, max: 12 },
      fatiga: { actual: 2, max: 11 },
      danio: { noLetal: 4, letal: 0, grave: 5 },
      deCombate: true,
    });
  });
});

describe("Sanar letal en combate", () => {
  test("cura la vida de la foto, no la de la ficha, y cobra igual", () => {
    const base: Sheet = {
      ...entera(),
      equipo: [{ instanciaId: "enj", catalogoId: "aum_enjambre_nanobot", nivel: 2 }],
      fatigaActual: 5,
    };
    const f = foto({ pgActual: 4, pgMax: topesDeVida(base).vida, danio: { noLetal: 0, letal: 6, grave: 0 } });
    const r = usoDeAccionAumento(base, [], "aumentos_enjambre_sanar_letal", {}, f.fatigaActual, f);
    assert.ok(r.ok);
    assert.equal(r.sheet.vidaActual, base.vidaActual);
    assert.equal(r.foto?.pgActual, 5);
    assert.equal(r.coste, 2);
    assert.match(r.mensaje, /\+1 de vida \(5\//);
    const llena = usoDeAccionAumento(base, [], "aumentos_enjambre_sanar_letal", {}, 5, foto({ pgActual: f.pgMax, pgMax: f.pgMax, danio: { noLetal: 0, letal: 0, grave: 0 } }));
    assert.ok(llena.ok);
    assert.equal(llena.foto, undefined);
    assert.match(llena.mensaje, /Ya estabas al máximo/);
  });
});
