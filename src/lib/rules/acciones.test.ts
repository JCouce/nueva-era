import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { setAtributoValue, setHabilidadValue, addEspecialidad, setPrioridad } from "./creacion";

// Sin letra de prioridad, el pool de creación es 0 — estos tests necesitan
// presupuesto para poder fijar valores con setAtributoValue/setHabilidadValue.
function conPresupuesto(): Sheet {
  return setPrioridad(setPrioridad(defaultSheet(), "atributos", "A"), "habilidades", "B");
}
import {
  ACCIONES,
  DIFICULTADES,
  CARAS_DADO,
  MARGEN_CRITICO,
  modificadorAccion,
  resolverTirada,
  resolverDanio,
  tirarD12,
} from "./acciones";
import { modificadoresDeEstados } from "./estados";

function buscar(id: string) {
  const t = ACCIONES.find((x) => x.id === id);
  assert.ok(t, `no existe la tirada ${id}`);
  return t;
}

describe("catálogo de tiradas", () => {
  test("no hay ids repetidos", () => {
    const ids = ACCIONES.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test("las bloqueadas declaran el motivo y no tienen habilidad", () => {
    for (const t of ACCIONES.filter((x) => x.bloqueada)) {
      assert.ok(t.bloqueada && t.bloqueada.length > 10, `${t.id} sin motivo`);
      assert.equal(t.habilidad, null);
    }
  });

  test("las salvaciones van con el aplicado a secas", () => {
    for (const t of ACCIONES.filter((x) => x.grupo === "Salvaciones")) {
      assert.equal(t.habilidad, null);
    }
  });

  test("iniciativa y buscar/percibir ya no están bloqueadas (C4 resuelto)", () => {
    const iniciativa = buscar("iniciativa");
    const buscarPercibir = buscar("alerta_activa");
    assert.equal(iniciativa.bloqueada, undefined);
    assert.equal(iniciativa.habilidad, "exploracion");
    assert.equal(buscarPercibir.bloqueada, undefined);
    assert.equal(buscarPercibir.habilidad, "exploracion");
  });
});

describe("modificador de una tirada", () => {
  const ficha = (): Sheet => {
    let s = conPresupuesto();
    s = setAtributoValue(s, "agilidad", 2);
    s = setAtributoValue(s, "percepcion", 2); // reflejos = ceil((2+2)/2) = 2
    s = setHabilidadValue(s, "combate_distancia", 3);
    return s;
  };

  test("suma el aplicado y la habilidad", () => {
    const m = modificadorAccion(ficha(), buscar("iniciativa_arma"), true);
    assert.equal(m.aplicado, 2);
    assert.equal(m.habilidad, 3);
    assert.equal(m.total, 5);
  });

  test("fuera de especialidad la habilidad cuenta la mitad", () => {
    const m = modificadorAccion(ficha(), buscar("iniciativa_arma"), false);
    assert.equal(m.habilidad, 2); // ceil(3/2)
    assert.equal(m.total, 4);
  });

  test("una habilidad sin entrenar resta 1", () => {
    const s = setAtributoValue(conPresupuesto(), "agilidad", 2); // reflejos ceil((2+0)/2)=1
    const m = modificadorAccion(s, buscar("sigilo"), false);
    assert.equal(m.habilidad, -1);
    assert.equal(m.total, 0);
  });

  test("una salvación solo usa el aplicado", () => {
    let s = conPresupuesto();
    s = setAtributoValue(s, "fuerza", 3);
    s = setAtributoValue(s, "aguante", 2); // fortaleza = ceil((3+2)/2) = 3
    const m = modificadorAccion(s, buscar("salv_fortaleza"));
    assert.equal(m.habilidad, null);
    assert.equal(m.total, 3);
  });

  test("la especialidad declarada se refleja en el modificador", () => {
    let s = setHabilidadValue(conPresupuesto(), "biociencia", 2);
    s = addEspecialidad(s, "biociencia", "Medicina");
    const dentro = modificadorAccion(s, buscar("medicina"), true);
    const fuera = modificadorAccion(s, buscar("medicina"), false);
    assert.equal(dentro.habilidad, 2);
    assert.equal(fuera.habilidad, 1); // ceil(2/2)
  });

  // Fase 6b, 3.1b (D5: combate → ficha): un mods extra (aquí, el de un
  // estado de combate activo) tiene que llegar hasta el aplicado, no solo
  // vivir en el modal — sin esto, la fila de la tirada mostraría un número
  // que ni siquiera coincide con lo que el jugador acaba tirando.
  test("un mods extra (p. ej. estados de combate activos) se suma al aplicado", () => {
    let s = conPresupuesto();
    s = setAtributoValue(s, "fuerza", 2);
    s = setAtributoValue(s, "agilidad", 1); // potencia = ceil((2+1)/2) = 2
    const sinEstado = modificadorAccion(s, buscar("atletismo"), false);
    assert.equal(sinEstado.aplicado, 2);

    const mods = modificadoresDeEstados([
      { estadoId: "enfermedad", gradoId: "nivel_1", rondasRestantes: null }, // Fuerza -1
    ]);
    const conEstado = modificadorAccion(s, buscar("atletismo"), false, mods);
    assert.equal(conEstado.aplicado, 1); // potencia = ceil((1+1)/2) = 1
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
