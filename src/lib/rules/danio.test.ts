import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, parseSheet, type Sheet } from "./sheet";
import {
  acotarDanio,
  ajustarDanioVital,
  categoriaDanioDeTexto,
  danioDeFoto,
  normalizarDanio,
  sumaDanio,
  type DanioVida,
} from "./danio";
import { ajustarDanioCategoria, ajustarVida, reconciliarVida, reconciliarVidaConEstados, topesDeVida } from "./vitalidad";
import { resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";
import type { EstadoActivo } from "./estados";

// defaultSheet(): todos los atributos a 0 → máximo de vida 10.
const MAX = 10;
const d = (noLetal: number, letal: number, grave: number): DanioVida => ({ noLetal, letal, grave });
const ficha = (vidaActual: number, danio: DanioVida = d(0, 0, 0)): Sheet => ({ ...defaultSheet(), vidaActual, danio });
const invariante = (s: Sheet, tope = MAX) => assert.equal(sumaDanio(s.danio), tope - s.vidaActual);

describe("normalizarDanio", () => {
  test("lo que falta del desglose va a letal", () => {
    assert.deepEqual(normalizarDanio(d(1, 0, 1), 5), d(1, 3, 1));
    assert.deepEqual(normalizarDanio(d(0, 0, 0), 4), d(0, 4, 0));
  });

  test("lo que sobra se quita de lo más leve: no letal, luego letal, luego grave", () => {
    assert.deepEqual(normalizarDanio(d(2, 3, 4), 8), d(1, 3, 4));
    assert.deepEqual(normalizarDanio(d(2, 3, 4), 5), d(0, 1, 4));
    assert.deepEqual(normalizarDanio(d(2, 3, 4), 2), d(0, 0, 2));
    assert.deepEqual(normalizarDanio(d(2, 3, 4), 0), d(0, 0, 0));
  });

  test("invariante: la suma es la pérdida; si ya cuadra, la misma referencia", () => {
    const x = d(1, 2, 3);
    assert.equal(normalizarDanio(x, 6), x);
    for (const p of [0, 1, 5, 6, 9, 20]) assert.equal(sumaDanio(normalizarDanio(x, p)), p);
  });

  test("acotarDanio solo toca lo que se sale del rango", () => {
    assert.deepEqual(acotarDanio(d(2, 0, 0), 1, 4), d(2, 0, 0));
    assert.deepEqual(acotarDanio(d(2, 0, 0), 3, 4), d(2, 1, 0));
    assert.deepEqual(acotarDanio(d(2, 3, 0), 1, 4), d(1, 3, 0));
  });
});

describe("ajustarDanioCategoria", () => {
  test("recibir baja la vida y sube esa categoría", () => {
    const s = ajustarDanioCategoria(ficha(10), "noLetal", 3);
    assert.equal(s.vidaActual, 7);
    assert.deepEqual(s.danio, d(3, 0, 0));
    invariante(s);
    const g = ajustarDanioCategoria(s, "grave", 2);
    assert.deepEqual(g.danio, d(3, 0, 2));
    invariante(g);
  });

  test("no pasa de 0 de vida", () => {
    const s = ajustarDanioCategoria(ficha(2, d(0, 8, 0)), "grave", 5);
    assert.equal(s.vidaActual, 0);
    assert.deepEqual(s.danio, d(0, 8, 2));
    invariante(s);
    assert.equal(ajustarDanioCategoria(s, "letal", 1), s);
  });

  test("curar sube la vida y baja solo esa categoría, no por debajo de 0", () => {
    const s = ajustarDanioCategoria(ficha(4, d(2, 1, 3)), "grave", -5);
    assert.equal(s.vidaActual, 7);
    assert.deepEqual(s.danio, d(2, 1, 0));
    invariante(s);
    const sinNada = ficha(4, d(2, 4, 0));
    assert.equal(ajustarDanioCategoria(sinNada, "grave", -1), sinNada);
  });

  test("normaliza antes: la vida perdida sin categoría cuenta como letal y se puede curar", () => {
    const s = ajustarDanioCategoria(ficha(7), "letal", -1);
    assert.equal(s.vidaActual, 8);
    assert.deepEqual(s.danio, d(0, 2, 0));
  });

  test("a tope no hay nada que curar", () => {
    const s = ficha(MAX);
    assert.equal(ajustarDanioCategoria(s, "noLetal", -1), s);
  });

  test("delta 0 o no finito no hace nada", () => {
    const s = ficha(5, d(5, 0, 0));
    assert.equal(ajustarDanioCategoria(s, "letal", 0), s);
    assert.equal(ajustarDanioCategoria(s, "letal", Number.NaN), s);
  });
});

describe("ajustarVida y reconciliarVida con el desglose", () => {
  test("el −/+ sin categoría: el daño entra como letal, la cura quita lo más leve", () => {
    const herido = ajustarVida(ficha(8, d(2, 0, 0)), -3);
    assert.deepEqual(herido.danio, d(2, 3, 0));
    const curado = ajustarVida(ficha(5, d(2, 1, 2)), 2);
    assert.deepEqual(curado.danio, d(0, 1, 2));
  });

  test("reconciliarVida deja el desglose igual a la vida perdida", () => {
    const r = reconciliarVida(ficha(6, d(1, 0, 0)));
    assert.deepEqual(r.danio, d(1, 3, 0));
    invariante(r);
    // Recorte por encima del máximo: no queda nada perdido.
    assert.deepEqual(reconciliarVida(ficha(20, d(1, 1, 1))).danio, d(0, 0, 0));
  });

  test("el centinela 999 se recorta antes de mirar el daño: una ficha nueva no ha perdido nada", () => {
    const s = parseSheet(defaultSheet());
    assert.equal(s.vidaActual, MAX);
    assert.deepEqual(s.danio, d(0, 0, 0));
  });

  test("FichaResuelta.danio cuadra con el máximo que pinta la barra", () => {
    const f = resolverFicha(ficha(6, d(1, 0, 0)), { estados: [], vitalidad: VITALIDAD_DE_FICHA });
    assert.deepEqual(f.danio, d(1, 3, 0));
  });
});

describe("parseSheet y el desglose", () => {
  test("lectura tolerante: valores raros caen a 0 o al rango", () => {
    const s = parseSheet({ ...defaultSheet(), vidaActual: 10, danio: { noLetal: -3, letal: "x", grave: 2.4 } });
    // grave 2 sobra (no ha perdido vida): se quita.
    assert.deepEqual(s.danio, d(0, 0, 0));
    const h = parseSheet({ ...defaultSheet(), vidaActual: 5, danio: { noLetal: 2, grave: 1 } });
    assert.deepEqual(h.danio, d(2, 2, 1));
  });

  test("con un activable equipado no se come el no letal (rango, no normalización contra el posible)", () => {
    // Neuroprótesis con Fuerza 2 y Aguante 1: +1 a la vida máxima mientras está puesta.
    const base = defaultSheet();
    const s: Sheet = {
      ...base,
      atributos: { ...base.atributos, fuerza: 2, aguante: 1 },
      equipo: [{ instanciaId: "n", catalogoId: "aum_neuroprotesis_simpatica", nivel: 1 }],
    };
    const neuro: EstadoActivo = { estadoId: "aum_neuroprotesis", gradoId: "activo", rondasRestantes: 3 };
    const reposo = topesDeVida(s, []).vida;
    assert.equal(topesDeVida(s, [neuro]).vida, reposo + 1);
    // Sin ella puesta: 2 de no letal perdidos de verdad.
    const leida = parseSheet(JSON.parse(JSON.stringify({ ...s, vidaActual: reposo - 2, danio: d(2, 0, 0) })));
    assert.deepEqual(leida.danio, d(2, 0, 0));
    assert.deepEqual(reconciliarVidaConEstados(leida, []).danio, d(2, 0, 0));
    // Con ella puesta el tope sube 1: ese punto que falta es letal.
    assert.deepEqual(reconciliarVidaConEstados(leida, [neuro]).danio, d(2, 1, 0));
  });
});

describe("categoriaDanioDeTexto", () => {
  test("los textos que ya usa el motor", () => {
    assert.equal(categoriaDanioDeTexto("no letal"), "noLetal");
    assert.equal(categoriaDanioDeTexto("letal"), "letal");
    assert.equal(categoriaDanioDeTexto("Letal no absorbible"), "letal");
    assert.equal(categoriaDanioDeTexto("Grave"), "grave");
    assert.equal(categoriaDanioDeTexto(null), null);
    assert.equal(categoriaDanioDeTexto("cinético"), null);
  });

  test("los tipos de daño específico llevan su gravedad", () => {
    assert.equal(categoriaDanioDeTexto("Fuego"), "grave");
    assert.equal(categoriaDanioDeTexto("Plasma"), "grave");
    assert.equal(categoriaDanioDeTexto("Corrosivo"), "grave");
    assert.equal(categoriaDanioDeTexto("Electrico"), "letal");
    assert.equal(categoriaDanioDeTexto("mental"), "letal");
    assert.equal(categoriaDanioDeTexto("Frío"), "noLetal");
  });
});

describe("ajustarDanioVital (foto de combate y panel de mando)", () => {
  test("recibir suma a la categoría, sin bajar de 0; curar solo de esa categoría", () => {
    assert.deepEqual(ajustarDanioVital({ actual: 8, tope: 10, danio: d(0, 2, 0) }, "grave", 3), { actual: 5, danio: d(0, 2, 3) });
    assert.deepEqual(ajustarDanioVital({ actual: 2, tope: 10, danio: d(0, 8, 0) }, "noLetal", 5), { actual: 0, danio: d(2, 8, 0) });
    assert.deepEqual(ajustarDanioVital({ actual: 5, tope: 10, danio: d(1, 2, 2) }, "grave", -5), { actual: 7, danio: d(1, 2, 0) });
    assert.deepEqual(ajustarDanioVital({ actual: 5, tope: 10, danio: d(1, 2, 2) }, "noLetal", 0), { actual: 5, danio: d(1, 2, 2) });
  });

  test("normaliza antes de ajustar: un desglose viejo que no cuadra entra como letal", () => {
    assert.deepEqual(ajustarDanioVital({ actual: 6, tope: 10, danio: d(0, 0, 0) }, "letal", -1), { actual: 7, danio: d(0, 3, 0) });
  });

  test("invariante actual + desglose === tope", () => {
    let v = { actual: 12, tope: 12, danio: d(0, 0, 0) };
    for (const [c, n] of [["grave", 3], ["noLetal", 4], ["letal", -2], ["noLetal", -9], ["letal", 20]] as const) {
      const r = ajustarDanioVital(v, c, n);
      v = { ...v, ...r };
      assert.equal(v.actual + sumaDanio(v.danio), v.tope);
    }
  });
});

describe("danioDeFoto", () => {
  test("una fila vieja (null) se lee todo letal; la guardada, normalizada", () => {
    assert.deepEqual(danioDeFoto(null, 7, 10), d(0, 3, 0));
    assert.deepEqual(danioDeFoto({ noLetal: 1, letal: 0, grave: 2 }, 7, 10), d(1, 0, 2));
    // Un estado bajó la vida después sin categoría: lo que falta, letal.
    assert.deepEqual(danioDeFoto({ noLetal: 1, letal: 0, grave: 2 }, 5, 10), d(1, 2, 2));
    assert.deepEqual(danioDeFoto("basura", 10, 10), d(0, 0, 0));
  });
});
