import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ACCIONES } from "./acciones";
import {
  MAX_TIRADAS_COMBATE,
  agruparTiradasPorRonda,
  anadirTirada,
  anotarDanioTirada,
  bloqueDeGrupo,
  leerTiradasCombate,
  resumenDeTirada,
  textoContra,
  tiradasDeFila,
  tiradasDeRonda,
  type TiradaCombate,
  type TiradaNueva,
} from "./tiradasCombate";

const nueva = (id: string, bloque: TiradaNueva["bloque"] = "accion"): TiradaNueva => ({
  id,
  bloque,
  etiqueta: `Tirada ${id}`,
  total: 10,
  dificultad: 7,
  veredicto: "exito",
});

const r = (over: Partial<{ total: number; dificultad: number | null; exito: boolean | null; critico: boolean; contraEsquiva: true }>) => ({
  total: 12,
  dificultad: 8,
  exito: true,
  critico: false,
  ...over,
});

describe("resumenDeTirada", () => {
  test("la esquiva va al bloque de esquivas; un ataque, al de acciones", () => {
    const esquiva = ACCIONES.find((a) => a.id === "defensa")!;
    assert.equal(resumenDeTirada("a", esquiva, esquiva.label, r({})).bloque, "esquiva");
    assert.equal(resumenDeTirada("b", { grupo: "Ataques" }, "Golpear", r({})).bloque, "accion");
    assert.equal(bloqueDeGrupo("Defensa"), "esquiva");
    assert.equal(bloqueDeGrupo("Psiónica"), "accion");
  });

  test("veredicto por grado, y sin dificultad cuando no hay", () => {
    const v = (over: Parameters<typeof r>[0]) => resumenDeTirada("x", { grupo: "Acciones" }, "X", r(over)).veredicto;
    assert.equal(v({}), "exito");
    assert.equal(v({ critico: true }), "critico");
    assert.equal(v({ exito: false }), "fracaso");
    assert.equal(v({ exito: false, critico: true }), "fracasoCritico");
    assert.equal(v({ exito: null, dificultad: null }), "sinDificultad");
  });

  test("contra la esquiva del objetivo queda marcado", () => {
    const t = resumenDeTirada("x", { grupo: "Ataques" }, "Disparar", r({ contraEsquiva: true, dificultad: 11 }));
    assert.equal(t.contraEsquiva, true);
    assert.equal(textoContra(t), "contra esquiva 11");
    assert.equal(textoContra({ dificultad: 7 }), "contra 7");
    assert.equal(textoContra({ dificultad: null }), null);
  });
});

describe("anadirTirada y anotarDanioTirada", () => {
  test("la ronda y la hora las pone quien guarda; no duplica un id", () => {
    const una = anadirTirada([], nueva("a"), 3, 1000);
    assert.deepEqual(una, [{ ...nueva("a"), ronda: 3, at: 1000 }]);
    assert.equal(anadirTirada(una, nueva("a"), 4, 2000), una);
  });

  test("se queda con las últimas MAX_TIRADAS_COMBATE", () => {
    let lista: TiradaCombate[] = [];
    for (let i = 0; i < MAX_TIRADAS_COMBATE + 5; i++) lista = anadirTirada(lista, nueva(String(i)), 1, i);
    assert.equal(lista.length, MAX_TIRADAS_COMBATE);
    assert.equal(lista[0].id, "5");
    assert.equal(lista.at(-1)?.id, String(MAX_TIRADAS_COMBATE + 4));
  });

  test("el daño se anota en la misma entrada, sin línea nueva", () => {
    const lista = anadirTirada(anadirTirada([], nueva("a"), 1, 1), nueva("b"), 1, 2);
    const con = anotarDanioTirada(lista, "a", { total: 9, categoria: "Letal" });
    assert.equal(con.length, 2);
    assert.deepEqual(con[0].danio, { total: 9, categoria: "Letal" });
    assert.equal(con[1].danio, undefined);
    assert.equal(anotarDanioTirada(lista, "zzz", { total: 1, categoria: "Letal" }), lista);
  });
});

describe("leerTiradasCombate", () => {
  test("descarta lo que no entiende y conserva lo válido", () => {
    const buena = { ...nueva("a"), ronda: 2, at: 5 };
    const leidas = leerTiradasCombate([buena, null, { id: "b" }, { ...buena, id: "c", veredicto: "raro" }, "x"]);
    assert.deepEqual(leidas, [buena]);
    assert.deepEqual(leerTiradasCombate(null), []);
    assert.deepEqual(leerTiradasCombate({}), []);
  });
});

describe("agrupar por ronda", () => {
  const lista = [
    anadirTirada([], nueva("a"), 1, 1)[0],
    anadirTirada([], nueva("b", "esquiva"), 1, 2)[0],
    anadirTirada([], nueva("c"), 3, 3)[0],
    anadirTirada([], nueva("d", "esquiva"), 3, 4)[0],
    anadirTirada([], nueva("e"), 3, 5)[0],
  ];

  test("la ronda actual, en sus dos bloques", () => {
    const r3 = tiradasDeRonda(lista, 3);
    assert.deepEqual(r3.acciones.map((t) => t.id), ["c", "e"]);
    assert.deepEqual(r3.esquivas.map((t) => t.id), ["d"]);
    const r2 = tiradasDeRonda(lista, 2);
    assert.equal(r2.acciones.length + r2.esquivas.length, 0);
  });

  test("el historial va de la ronda más reciente a la primera", () => {
    const g = agruparTiradasPorRonda(lista);
    assert.deepEqual(g.map((x) => x.ronda), [3, 1]);
    assert.deepEqual(g[1].acciones.map((t) => t.id), ["a"]);
    assert.deepEqual(g[1].esquivas.map((t) => t.id), ["b"]);
  });
});

describe("tiradasDeFila", () => {
  const lista = [anadirTirada([], nueva("a"), 1, 1)[0], anadirTirada([], nueva("b", "esquiva"), 2, 2)[0]];

  test("solo la ronda actual, y si hubo algo antes", () => {
    const f = tiradasDeFila(lista, 2);
    assert.deepEqual(f.tiradasRonda.esquivas.map((t) => t.id), ["b"]);
    assert.equal(f.tiradasRonda.acciones.length, 0);
    assert.equal(f.hayTiradasAnteriores, true);
  });

  test("al cambiar de ronda la fila se vacía; Json vacío o roto, nada", () => {
    const f = tiradasDeFila(lista, 3);
    assert.equal(f.tiradasRonda.acciones.length + f.tiradasRonda.esquivas.length, 0);
    assert.equal(f.hayTiradasAnteriores, true);
    assert.deepEqual(tiradasDeFila(null, 1), { tiradasRonda: { ronda: 1, acciones: [], esquivas: [] }, hayTiradasAnteriores: false });
    assert.equal(tiradasDeFila("basura", 1).hayTiradasAnteriores, false);
  });
});
