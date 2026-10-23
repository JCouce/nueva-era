import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { FORMULA_MOVIMIENTO_GENERAL } from "./formulaMovimiento";
import { defaultSheet, type Sheet } from "./sheet";
import {
  setAtributoValue,
  setHabilidadValue,
  puntosAtributosDisponibles,
  setPrioridad,
} from "./creacion";
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
  type ContextoAccion,
} from "./modificadores";
import { ESPECIES, especiePorId } from "../catalog/especies";
import { AJUSTE_NEUTRO } from "./progresion";

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

  test("están las cinco especies de docs/sistema.md §14.1", () => {
    assert.deepEqual(
      ESPECIES.map((e) => e.id),
      ["humano", "riux", "arianyi", "arkoru", "manduk"],
    );
  });
});

describe("los modificadores de especie llegan a los números", () => {
  test("sin especie no hay modificadores", () => {
    assert.deepEqual(modificadoresActivos(conEspecie(null)), []);
    assert.equal(atributoEfectivo(conEspecie(null), "aguante", modificadoresActivos(conEspecie(null))), 0);
  });

  test("el humano no cambia nada", () => {
    const s = conEspecie("humano");
    assert.equal(atributoEfectivo(s, "aguante", modificadoresActivos(s)), 0);
    assert.deepEqual(salud(s, modificadoresActivos(s)), salud(conEspecie(null), modificadoresActivos(conEspecie(null))));
  });

  test("el arköru sube Fuerza y baja Agilidad", () => {
    const s = conEspecie("arkoru");
    assert.equal(atributoEfectivo(s, "fuerza", modificadoresActivos(s)), 2);
    assert.equal(atributoEfectivo(s, "agilidad", modificadoresActivos(s)), -1);
  });

  test("el bono de atributo arrastra a los aplicados y a la salud", () => {
    const s = conEspecie("arkoru");
    // Fuerza +2 entra en Fortaleza (fue+agu): floor(2/2) = 1.
    assert.equal(aplicado(s, "fortaleza", modificadoresActivos(s)), 1);
    assert.equal(salud(s, modificadoresActivos(s)).vida, 11); // 10 + 1
    // Voluntad (agu+car) no la toca: la fatiga se queda igual.
    assert.equal(aplicado(s, "voluntad", modificadoresActivos(s)), 0);
    assert.equal(salud(s, modificadoresActivos(s)).fatiga, 10);
  });

  test("un bono de habilidad se suma al valor efectivo, también sin entrenar", () => {
    // Ninguna especie real da habilidad: se prueba con un modificador suelto.
    let s = setPrioridad(defaultSheet(), "habilidades", "A");
    s = setHabilidadValue(s, "tecnociencia", 2, AJUSTE_NEUTRO);
    const mods: ModificadorConFuente[] = [
      { tipo: "habilidad", id: "tecnociencia", valor: 1, origen: "especie", fuente: "X" },
    ];
    assert.equal(valorEfectivo(s, "tecnociencia", true, mods), 3);
    assert.equal(valorEfectivo(s, "tecnociencia", false, mods), 2);
    assert.equal(valorEfectivo(defaultSheet(), "tecnociencia", false, mods), 0); // -1 + 1
  });
});

describe("los modificadores NO tocan el point-buy", () => {
  test("el bono de especie no gasta ni regala puntos de creación", () => {
    const sinEspecie = setAtributoValue(
      setPrioridad(defaultSheet(), "atributos", "A"),
      "fuerza",
      2,
    );
    const conArkoru = { ...sinEspecie, especieId: "arkoru" };
    assert.equal(
      puntosAtributosDisponibles(conArkoru),
      puntosAtributosDisponibles(sinEspecie),
      "el pool se calcula sobre lo comprado, no sobre lo efectivo",
    );
    // Pero el valor en juego sí sube.
    assert.equal(conArkoru.atributos.fuerza, 2);
    assert.equal(atributoEfectivo(conArkoru, "fuerza", modificadoresActivos(conArkoru)), 4);
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
  const ctx = (over: Partial<ContextoAccion> = {}): ContextoAccion => ({
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

  test("todas casa cualquier tirada, sin importar id, grupo o habilidad", () => {
    const mods: ModificadorConFuente[] = [
      { tipo: "tirada", alcance: { tipo: "todas" }, valor: -3, origen: "estado", fuente: "Malherido" },
    ];
    assert.equal(bonoAlcance(mods, ctx()), -3);
    assert.equal(bonoAlcance(mods, ctx({ id: "sigilo", grupo: "Acciones", habilidad: "sigilo" })), -3);
    assert.equal(bonoAlcance(mods, ctx({ modoElegido: "F. Auto" })), -3);
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
    const base = movimiento(conEspecie(null), modificadoresActivos(conEspecie(null)), FORMULA_MOVIMIENTO_GENERAL);
    const fichaConBono: Sheet = {
      ...conEspecie(null),
      // Simula el efecto de +1 en atletismo comprándolo, para comparar escalas.
      habilidades: {
        ...defaultSheet().habilidades,
        atletismo: { valor: 1, especialidades: [] },
      },
    };
    const conBono = movimiento(fichaConBono, modificadoresActivos(fichaConBono), FORMULA_MOVIMIENTO_GENERAL);
    assert.ok(conBono.carrera > base.carrera);
  });
});
