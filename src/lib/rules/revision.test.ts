import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { setAtributoValue, setHabilidadValue, setPrioridad } from "./creacion";
import { pasosPersonaje } from "./personaje";
import type { Prioridades } from "./prioridad";
import {
  transicionRevision,
  fichaSoloLectura,
  faltaParaEnviar,
  avisosParaEnviar,
  excesosDePuntos,
  ESTADOS_FICHA,
  type AccionRevision,
  type EstadoFicha,
} from "./revision";
import { AJUSTE_NEUTRO } from "./progresion";

const conPrioridades = (prioridades: Prioridades, especieId: string | null = "humano"): Sheet => ({
  ...defaultSheet(),
  especieId,
  prioridades,
});

describe("transicionRevision", () => {
  const JUGADOR = { esMaster: false, esDueno: true };
  const MASTER = { esMaster: true, esDueno: false };
  const MASTER_DUENO = { esMaster: true, esDueno: true };
  const AJENO = { esMaster: false, esDueno: false };

  const validas: [AccionRevision, EstadoFicha, typeof JUGADOR, EstadoFicha][] = [
    ["enviar", "DRAFT", JUGADOR, "IN_REVIEW"],
    ["enviar", "DRAFT", MASTER_DUENO, "IN_REVIEW"],
    ["retirar", "IN_REVIEW", JUGADOR, "DRAFT"],
    ["retirar", "IN_REVIEW", MASTER_DUENO, "DRAFT"],
    ["aprobar", "DRAFT", MASTER, "APPROVED"],
    ["aprobar", "IN_REVIEW", MASTER, "APPROVED"],
    ["devolver", "IN_REVIEW", MASTER, "DRAFT"],
    ["revertir", "APPROVED", MASTER, "DRAFT"],
  ];
  for (const [accion, estado, quien, hasta] of validas) {
    test(`${accion} desde ${estado} (máster=${quien.esMaster}, dueño=${quien.esDueno}) → ${hasta}`, () => {
      assert.deepEqual(transicionRevision({ estado, accion, ...quien }), { estado: hasta });
    });
  }

  test("cualquier otra combinación de acción y estado da error, también al máster dueño", () => {
    const esValida = (accion: AccionRevision, estado: EstadoFicha) =>
      validas.some(([a, e]) => a === accion && e === estado);
    const acciones: AccionRevision[] = ["enviar", "retirar", "aprobar", "devolver", "revertir"];
    for (const accion of acciones) {
      for (const estado of ESTADOS_FICHA) {
        if (esValida(accion, estado)) continue;
        const res = transicionRevision({ estado, accion, ...MASTER_DUENO });
        assert.ok("error" in res, `${accion} desde ${estado} debería fallar`);
      }
    }
  });

  test("el jugador no puede aprobar, devolver ni revertir", () => {
    for (const [accion, estado] of [
      ["aprobar", "DRAFT"],
      ["aprobar", "IN_REVIEW"],
      ["devolver", "IN_REVIEW"],
      ["revertir", "APPROVED"],
    ] as const) {
      assert.deepEqual(transicionRevision({ estado, accion, ...JUGADOR }), { error: "Solo el máster puede hacer eso" });
    }
  });

  test("el máster que no es dueño no puede enviar ni retirar; nadie ajeno tampoco", () => {
    assert.ok("error" in transicionRevision({ estado: "DRAFT", accion: "enviar", ...MASTER }));
    assert.ok("error" in transicionRevision({ estado: "IN_REVIEW", accion: "retirar", ...MASTER }));
    assert.ok("error" in transicionRevision({ estado: "DRAFT", accion: "enviar", ...AJENO }));
  });

  test("el error explica el estado en palabras del jugador", () => {
    assert.deepEqual(transicionRevision({ estado: "APPROVED", accion: "enviar", ...JUGADOR }), {
      error: "No se puede enviar una ficha en juego",
    });
  });
});

describe("fichaSoloLectura", () => {
  test("solo el jugador en revisión; el máster puede editar", () => {
    assert.equal(fichaSoloLectura({ estado: "IN_REVIEW", esMaster: false }), true);
    assert.equal(fichaSoloLectura({ estado: "IN_REVIEW", esMaster: true }), false);
    assert.equal(fichaSoloLectura({ estado: "DRAFT", esMaster: false }), false);
    assert.equal(fichaSoloLectura({ estado: "APPROVED", esMaster: false }), false);
  });
});

describe("faltaParaEnviar", () => {
  test("ficha vacía: especie, prioridades y nombre, en ese orden", () => {
    const pasos = pasosPersonaje({ sheet: defaultSheet(), nombre: " ", aprobada: false });
    assert.deepEqual(faltaParaEnviar(pasos, [], []), ["Elige especie", "Reparte las 5 letras de prioridad", "Ponle nombre"]);
  });

  test("Manduk sin casta con todo lo demás hecho: solo la casta", () => {
    const sheet = conPrioridades({ atributos: "A", habilidades: "B", dotes: "C", psionica: "D", recursos: "E" }, "manduk");
    assert.deepEqual(faltaParaEnviar(pasosPersonaje({ sheet, nombre: "Krag", aprobada: false }), [], []), ["Elige casta"]);
  });

  test("humano con reparto y nombre: solo falta el atributo libre", () => {
    const sheet = conPrioridades({ atributos: "A", habilidades: "B", dotes: "C", psionica: "D", recursos: "E" });
    assert.deepEqual(faltaParaEnviar(pasosPersonaje({ sheet, nombre: "Ana", aprobada: false }), [], []), ["Elige el atributo +1"]);
    const conAtributo = { ...sheet, especieOpciones: { atributo: "fuerza" as const } };
    assert.deepEqual(faltaParaEnviar(pasosPersonaje({ sheet: conAtributo, nombre: "Ana", aprobada: false }), [], []), []);
  });
});

// El pool de la letra C entero (6 + 6): solo cuenta el coste, no los requisitos.
const TODAS_LAS_DOTES_DE_C = [{ id: "dote_accion_inspiradora" }, { id: "dote_autocuidados" }];

describe("avisosParaEnviar", () => {
  test("nada gastado: avisa de los cuatro pools con presupuesto", () => {
    const sheet = conPrioridades({ atributos: "E", habilidades: "D", dotes: "C", psionica: "B", recursos: "A" });
    assert.deepEqual(avisosParaEnviar(sheet, AJUSTE_NEUTRO), [
      "Te quedan 8 puntos de atributos sin gastar",
      "Te quedan 9 puntos de habilidades sin gastar",
      "Te quedan 12 puntos de psiónica sin gastar",
      "Te quedan 12 puntos de dotes sin gastar",
    ]);
  });

  test("todo gastado y psiónica E (0): sin avisos", () => {
    let sheet = conPrioridades({ atributos: "D", habilidades: "E", dotes: "C", psionica: "E", recursos: "A" });
    sheet = setAtributoValue(sheet, "fuerza", 2); // 6
    sheet = setAtributoValue(sheet, "agilidad", 1); // 2 → 8 de 10
    sheet = setAtributoValue(sheet, "aguante", 1); // 2 → 10
    sheet = setHabilidadValue(sheet, "atletismo", 3, AJUSTE_NEUTRO); // 6 de 6
    sheet = { ...sheet, dotes: TODAS_LAS_DOTES_DE_C }; // 12 de 12
    assert.deepEqual(avisosParaEnviar(sheet, AJUSTE_NEUTRO), []);
  });

  test("singular con 1 punto", () => {
    let sheet = conPrioridades({ atributos: "E", habilidades: "E", dotes: "C", psionica: "E", recursos: "A" });
    // Atributos ya no pueden dejar 1 suelto (costes y presupuestos pares, el -1 devuelve 2):
    // el singular se prueba con habilidades.
    sheet = setAtributoValue(sheet, "fuerza", 2); // 6 de 8
    sheet = setAtributoValue(sheet, "caracter", -1); // devuelve 2 → 4 de 8
    sheet = setAtributoValue(sheet, "agilidad", 1); // 6 de 8
    sheet = setAtributoValue(sheet, "aguante", 1); // 8 de 8
    sheet = setHabilidadValue(sheet, "atletismo", 2, AJUSTE_NEUTRO); // 3 de 6
    sheet = setHabilidadValue(sheet, "actitud", 1, AJUSTE_NEUTRO); // 4
    sheet = setHabilidadValue(sheet, "cultura", 1, AJUSTE_NEUTRO); // 5 de 6, queda 1
    sheet = { ...sheet, dotes: TODAS_LAS_DOTES_DE_C };
    assert.deepEqual(avisosParaEnviar(sheet, AJUSTE_NEUTRO), ["Te queda 1 punto de habilidades sin gastar"]);
  });

  test("S+ (presupuesto infinito, pruebas): no avisa de infinito sin gastar", () => {
    const sheet = conPrioridades({ atributos: "S+", habilidades: "S+", dotes: "S+", psionica: "S+", recursos: "S+" });
    assert.deepEqual(avisosParaEnviar(sheet, AJUSTE_NEUTRO), []);
  });
});

describe("excesosDePuntos", () => {
  test("bajar la letra tras gastar deja el pool en negativo y bloquea el envío", () => {
    let sheet = conPrioridades({ atributos: "A", habilidades: "B", dotes: "C", psionica: "D", recursos: "E" });
    sheet = setAtributoValue(sheet, "fuerza", 3); // 12
    sheet = setPrioridad(sheet, "atributos", "E"); // 8: 4 de más; "E" se la quita a recursos
    assert.deepEqual(excesosDePuntos(sheet, AJUSTE_NEUTRO), ["Te has pasado 4 puntos en atributos"]);
    const pasos = pasosPersonaje({ sheet, nombre: "Ana", aprobada: false });
    assert.ok(faltaParaEnviar(pasos, [], excesosDePuntos(sheet, AJUSTE_NEUTRO)).includes("Te has pasado 4 puntos en atributos"));
    assert.ok(!avisosParaEnviar(sheet, AJUSTE_NEUTRO).some((a) => a.includes("atributos")));
  });

  test("la letra robada por otra categoría deja la suya a 0", () => {
    let sheet = conPrioridades({ atributos: "A", habilidades: "B", dotes: "C", psionica: "D", recursos: "E" });
    sheet = setHabilidadValue(sheet, "atletismo", 1, AJUSTE_NEUTRO); // 1
    sheet = setPrioridad(sheet, "recursos", "B"); // habilidades sin letra → presupuesto 0
    assert.deepEqual(excesosDePuntos(sheet, AJUSTE_NEUTRO), ["Te has pasado 1 punto en habilidades"]);
  });

  test("saldo justo o sobrante: nada", () => {
    let sheet = conPrioridades({ atributos: "D", habilidades: "E", dotes: "C", psionica: "E", recursos: "A" });
    sheet = setAtributoValue(sheet, "fuerza", 2); // 6 de 10
    assert.deepEqual(excesosDePuntos(sheet, AJUSTE_NEUTRO), []);
  });
});
