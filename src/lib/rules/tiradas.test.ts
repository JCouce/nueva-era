import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { setAtributoValue, setHabilidadValue, addEspecialidad } from "./creacion";
import {
  TIRADAS,
  DIFICULTADES,
  CARAS_DADO,
  MARGEN_CRITICO,
  modificadorTirada,
  resolverTirada,
  resolverDanio,
  tirarD12,
} from "./tiradas";

function buscar(id: string) {
  const t = TIRADAS.find((x) => x.id === id);
  assert.ok(t, `no existe la tirada ${id}`);
  return t;
}

describe("catálogo de tiradas", () => {
  test("no hay ids repetidos", () => {
    const ids = TIRADAS.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test("las bloqueadas declaran el motivo y no tienen habilidad", () => {
    for (const t of TIRADAS.filter((x) => x.bloqueada)) {
      assert.ok(t.bloqueada && t.bloqueada.length > 10, `${t.id} sin motivo`);
      assert.equal(t.habilidad, null);
    }
  });

  test("las salvaciones van con el aplicado a secas", () => {
    for (const t of TIRADAS.filter((x) => x.grupo === "Salvaciones")) {
      assert.equal(t.habilidad, null);
    }
  });
});

describe("modificador de una tirada", () => {
  const ficha = (): Sheet => {
    let s = defaultSheet();
    s = setAtributoValue(s, "agilidad", 2);
    s = setAtributoValue(s, "percepcion", 2); // reflejos = 4
    s = setHabilidadValue(s, "combate_distancia", 3);
    return s;
  };

  test("suma el aplicado y la habilidad", () => {
    const m = modificadorTirada(ficha(), buscar("iniciativa_arma"), true);
    assert.equal(m.aplicado, 4);
    assert.equal(m.habilidad, 3);
    assert.equal(m.total, 7);
  });

  test("fuera de especialidad la habilidad cuenta la mitad", () => {
    const m = modificadorTirada(ficha(), buscar("iniciativa_arma"), false);
    assert.equal(m.habilidad, 2); // ceil(3/2)
    assert.equal(m.total, 6);
  });

  test("una habilidad sin entrenar resta 1", () => {
    const s = setAtributoValue(defaultSheet(), "agilidad", 2); // reflejos 2
    const m = modificadorTirada(s, buscar("sigilo"), false);
    assert.equal(m.habilidad, -1);
    assert.equal(m.total, 1);
  });

  test("una salvación solo usa el aplicado", () => {
    let s = defaultSheet();
    s = setAtributoValue(s, "fuerza", 3);
    s = setAtributoValue(s, "aguante", 2); // fortaleza 5
    const m = modificadorTirada(s, buscar("salv_fortaleza"));
    assert.equal(m.habilidad, null);
    assert.equal(m.total, 5);
  });

  test("la especialidad declarada se refleja en el modificador", () => {
    let s = setHabilidadValue(defaultSheet(), "biociencia", 2);
    s = addEspecialidad(s, "biociencia", "Medicina");
    const dentro = modificadorTirada(s, buscar("medicina"), true);
    const fuera = modificadorTirada(s, buscar("medicina"), false);
    assert.equal(dentro.habilidad, 2);
    assert.equal(fuera.habilidad, 1); // ceil(2/2)
  });
});

describe("resolución contra dificultad", () => {
  test("igualar la dificultad ya es éxito", () => {
    const r = resolverTirada({ dado: 5, modificador: 2, dificultad: 7 });
    assert.equal(r.total, 7);
    assert.equal(r.exito, true);
    assert.equal(r.margen, 0);
    assert.equal(r.critico, false);
  });

  test("quedarse a uno es fracaso", () => {
    const r = resolverTirada({ dado: 4, modificador: 2, dificultad: 7 });
    assert.equal(r.exito, false);
    assert.equal(r.margen, -1);
  });

  test("superar por 6 es crítico", () => {
    const r = resolverTirada({ dado: 11, modificador: 2, dificultad: 7 });
    assert.equal(r.margen, MARGEN_CRITICO);
    assert.equal(r.exito, true);
    assert.equal(r.critico, true);
  });

  test("superar por 5 todavía no lo es", () => {
    const r = resolverTirada({ dado: 10, modificador: 2, dificultad: 7 });
    assert.equal(r.critico, false);
  });

  test("quedarse a 6 o más es fracaso crítico", () => {
    const r = resolverTirada({ dado: 1, modificador: 0, dificultad: 7 });
    assert.equal(r.margen, -6);
    assert.equal(r.exito, false);
    assert.equal(r.critico, true);
  });

  test("el modificador circunstancial entra en el total", () => {
    const r = resolverTirada({ dado: 5, modificador: 2, circunstancial: -3, dificultad: 7 });
    assert.equal(r.total, 4);
    assert.equal(r.exito, false);
  });

  test("sin dificultad solo se informa del total", () => {
    const r = resolverTirada({ dado: 8, modificador: 3 });
    assert.equal(r.total, 11);
    assert.equal(r.exito, null);
    assert.equal(r.margen, null);
    assert.equal(r.critico, false);
  });

  test("un modificador negativo puede dejar el total bajo cero", () => {
    const r = resolverTirada({ dado: 1, modificador: -3, dificultad: 2 });
    assert.equal(r.total, -2);
    assert.equal(r.exito, false);
  });
});

describe("daño por éxitos", () => {
  test("sin éxitos de sobra, solo el daño base", () => {
    const d = resolverDanio(10, 0, "Letal");
    assert.equal(d.bonoExitos, 0);
    assert.equal(d.total, 10);
  });

  test("por cada dos éxitos, +1 al daño", () => {
    assert.equal(resolverDanio(10, 2, "Letal").total, 11);
    assert.equal(resolverDanio(10, 3, "Letal").total, 11); // floor(3/2) = 1
    assert.equal(resolverDanio(10, 4, "Letal").total, 12);
  });

  test("un margen negativo no resta daño", () => {
    const d = resolverDanio(10, -3, "Letal");
    assert.equal(d.bonoExitos, 0);
    assert.equal(d.total, 10);
  });

  test("conserva la categoría de daño", () => {
    assert.equal(resolverDanio(10, 6, "Plasma").categoria, "Plasma");
  });
});

describe("tabla de dificultades", () => {
  test("va de Muy Fácil 2 a Legendario 16, en orden", () => {
    const valores = DIFICULTADES.map((d) => d.valor);
    assert.deepEqual(valores, [2, 5, 7, 10, 13, 16]);
    assert.deepEqual(valores, [...valores].sort((a, b) => a - b));
  });
});

describe("el dado", () => {
  test("siempre cae entre 1 y 12", () => {
    for (let i = 0; i < 2000; i++) {
      const d = tirarD12();
      assert.ok(Number.isInteger(d) && d >= 1 && d <= CARAS_DADO, `salió ${d}`);
    }
  });

  test("con 12.000 tiradas salen las doce caras", () => {
    const vistas = new Set<number>();
    for (let i = 0; i < 12000; i++) vistas.add(tirarD12());
    assert.equal(vistas.size, CARAS_DADO);
  });
});
