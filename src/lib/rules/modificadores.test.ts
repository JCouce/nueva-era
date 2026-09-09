import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { setAtributoValue, setHabilidadValue, puntosAtributosDisponibles } from "./creacion";
import {
  modificadoresActivos,
  atributoEfectivo,
  aplicado,
  salud,
  valorEfectivo,
  movimiento,
} from "./derivados";
import {
  bonoAtributo,
  bonoAlcance,
  desgloseAlcance,
  porFuente,
  type ModificadorConFuente,
  type ContextoTirada,
} from "./modificadores";
import { ESPECIES, especiePorId } from "../catalog/especies";

const conEspecie = (id: string | null): Sheet => ({ ...defaultSheet(), especieId: id });

describe("catálogo de especies", () => {
  test("no hay ids repetidos y todas se pueden buscar", () => {
    const ids = ESPECIES.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.ok(especiePorId(id));
  });

  test("una especie desconocida no revienta", () => {
    assert.equal(especiePorId("dragon"), null);
    assert.equal(especiePorId(null), null);
    assert.deepEqual(modificadoresActivos(conEspecie("dragon")), []);
  });

  test("mientras sean provisionales, quedan marcadas", () => {
    for (const e of ESPECIES) {
      assert.equal(typeof e.provisional, "boolean");
    }
  });
});

describe("los modificadores de especie llegan a los números", () => {
  test("sin especie no hay modificadores", () => {
    assert.deepEqual(modificadoresActivos(conEspecie(null)), []);
    assert.equal(atributoEfectivo(conEspecie(null), "aguante"), 0);
  });

  test("el humano no cambia nada", () => {
    const s = conEspecie("humano");
    assert.equal(atributoEfectivo(s, "aguante"), 0);
    assert.deepEqual(salud(s), salud(conEspecie(null)));
  });

  test("el arkorü sube Aguante y baja Carácter", () => {
    const s = conEspecie("arkoru");
    assert.equal(atributoEfectivo(s, "aguante"), 1);
    assert.equal(atributoEfectivo(s, "caracter"), -1);
  });

  test("el bono de atributo arrastra a los aplicados y a la salud", () => {
    const s = conEspecie("arkoru");
    // Aguante +1 entra en Fortaleza (fue+agu) y en Voluntad (agu+car).
    assert.equal(aplicado(s, "fortaleza"), 1);
    assert.equal(salud(s).vida, 9); // 8 + 1
    // Voluntad = aguante +1 y carácter -1 → 0, la fatiga se queda igual.
    assert.equal(aplicado(s, "voluntad"), 0);
    assert.equal(salud(s).fatiga, 8);
  });

  test("el bono de habilidad se suma al valor efectivo", () => {
    let s = conEspecie("arkoru");
    s = setHabilidadValue(s, "tecnociencia", 2);
    // 2 entero + 1 de especie dentro de especialidad; ceil(2/2)=1 +1 fuera.
    assert.equal(valorEfectivo(s, "tecnociencia", true), 3);
    assert.equal(valorEfectivo(s, "tecnociencia", false), 2);
  });

  test("también se suma a una habilidad sin entrenar", () => {
    const s = conEspecie("arkoru");
    assert.equal(valorEfectivo(s, "tecnociencia", false), 0); // -1 + 1
  });
});

describe("los modificadores NO tocan el point-buy", () => {
  test("el bono de especie no gasta ni regala puntos de creación", () => {
    const sinEspecie = setAtributoValue(defaultSheet(), "aguante", 2);
    const conArkoru = { ...sinEspecie, especieId: "arkoru" };
    assert.equal(
      puntosAtributosDisponibles(conArkoru),
      puntosAtributosDisponibles(sinEspecie),
      "el pool se calcula sobre lo comprado, no sobre lo efectivo",
    );
    // Pero el valor en juego sí sube.
    assert.equal(conArkoru.atributos.aguante, 2);
    assert.equal(atributoEfectivo(conArkoru, "aguante"), 3);
  });
});

describe("helpers de modificadores", () => {
  const mods: ModificadorConFuente[] = [
    { tipo: "atributo", id: "fuerza", valor: 2, origen: "especie", fuente: "X" },
    { tipo: "atributo", id: "fuerza", valor: -1, origen: "estado", fuente: "Malherido" },
    {
      tipo: "tirada",
      alcance: { tipo: "tiradaId", id: "salv_fortaleza" },
      valor: 1,
      origen: "equipo",
      fuente: "Traje",
    },
  ];

  test("los bonos del mismo destino se acumulan", () => {
    assert.equal(bonoAtributo(mods, "fuerza"), 1); // +2 -1
    assert.equal(bonoAtributo(mods, "agilidad"), 0);
  });

  test("se pueden agrupar por procedencia para mostrarlos", () => {
    const grupos = porFuente(mods);
    assert.equal(grupos.length, 3);
    assert.ok(grupos.find((g) => g.fuente === "Malherido" && g.origen === "estado"));
  });
});

describe("alcance de un modificador de tirada", () => {
  const ctx = (over: Partial<ContextoTirada> = {}): ContextoTirada => ({
    id: "salv_fortaleza",
    grupo: "Salvaciones",
    habilidad: null,
    modoElegido: null,
    ...over,
  });

  test("tiradaId casa por id exacto", () => {
    const mods: ModificadorConFuente[] = [
      { tipo: "tirada", alcance: { tipo: "tiradaId", id: "salv_fortaleza" }, valor: 1, origen: "equipo", fuente: "Traje" },
    ];
    assert.equal(bonoAlcance(mods, ctx()), 1);
    assert.equal(bonoAlcance(mods, ctx({ id: "salv_reflejos" })), 0);
  });

  test("grupo casa cualquier tirada de ese grupo", () => {
    const mods: ModificadorConFuente[] = [
      { tipo: "tirada", alcance: { tipo: "grupo", grupo: "Salvaciones" }, valor: 2, origen: "especie", fuente: "Arkorü" },
    ];
    assert.equal(bonoAlcance(mods, ctx({ id: "salv_voluntad" })), 2);
    assert.equal(bonoAlcance(mods, ctx({ id: "sigilo", grupo: "Acciones" })), 0);
  });

  test("habilidad casa cualquier tirada que la use", () => {
    const mods: ModificadorConFuente[] = [
      { tipo: "tirada", alcance: { tipo: "habilidad", habilidad: "sigilo" }, valor: 1, origen: "equipo", fuente: "Silenciador" },
    ];
    assert.equal(bonoAlcance(mods, ctx({ habilidad: "sigilo" })), 1);
    assert.equal(bonoAlcance(mods, ctx({ habilidad: "atletismo" })), 0);
  });

  test("modo solo casa si el modo elegido contiene el texto", () => {
    const mods: ModificadorConFuente[] = [
      { tipo: "tirada", alcance: { tipo: "modo", contieneEtiqueta: "F. Auto" }, valor: 1, origen: "equipo", fuente: "Sistema de Retroceso" },
    ];
    assert.equal(bonoAlcance(mods, ctx({ modoElegido: "Estándar (F. Auto)" })), 1);
    assert.equal(bonoAlcance(mods, ctx({ modoElegido: "Simple" })), 0);
    assert.equal(bonoAlcance(mods, ctx({ modoElegido: null })), 0);
  });

  test("el desglose lleva la fuente de cada uno", () => {
    const mods: ModificadorConFuente[] = [
      { tipo: "tirada", alcance: { tipo: "tiradaId", id: "salv_fortaleza" }, valor: 1, origen: "equipo", fuente: "Traje" },
      { tipo: "atributo", id: "fuerza", valor: 1, origen: "especie", fuente: "Arkorü" }, // no debe aparecer
    ];
    const desglose = desgloseAlcance(mods, ctx());
    assert.deepEqual(desglose, [{ etiqueta: "Traje", valor: 1 }]);
  });
});

describe("el movimiento recoge los bonos de Atletismo", () => {
  test("un bono de habilidad mueve la base de las fórmulas", () => {
    const base = movimiento(conEspecie(null));
    const conBono = movimiento({
      ...conEspecie(null),
      // Simula el efecto de +1 en atletismo comprándolo, para comparar escalas.
      habilidades: {
        ...defaultSheet().habilidades,
        atletismo: { valor: 1, especialidades: [] },
      },
    });
    assert.ok(conBono.carrera > base.carrera);
  });
});
