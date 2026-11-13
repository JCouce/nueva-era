// E5 (docs/sistema.md §14.9): nota de fármacos del Irota, "Activar visión" del Arianyi y la visión pasiva del Axadren.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { accionesDeFarmacos, accionesDirectasDeFarmacos } from "./farmacos";
import { resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";
import { defaultSheet, type Sheet } from "./sheet";
import { pagarFatiga } from "./vitalidad";

function ficha(patch: Partial<Sheet> = {}): Sheet {
  const d = defaultSheet();
  return {
    ...d,
    atributos: { fuerza: 2, agilidad: 2, aguante: 2, percepcion: 1, inteligencia: 0, caracter: 2 },
    vidaActual: 10,
    fatigaActual: 10,
    fatigaTemporal: 0,
    ...patch,
  };
}

const MAOLHER: Partial<Sheet> = { especieId: "manduk", especieOpciones: { casta: "noble", linaje: "maolher" } };
const IROTA: Partial<Sheet> = { especieId: "manduk", especieOpciones: { casta: "noble", linaje: "irota" } };
const AXADREN: Partial<Sheet> = { especieId: "manduk", especieOpciones: { casta: "noble", linaje: "axadren" } };

const resolver = (s: Sheet, libre = false) => resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA, libre });

describe("Irota: fármacos a la mitad (nota fija)", () => {
  const NOTA = "Irota: efectos a la mitad (duración, modificadores, vida y fatiga), hacia abajo, mínimo 1.";
  const farmacos = { farmaco_gel_sanador: 1, farmaco_analgesico: 1 };

  test("con el rasgo, la nota sale en la tirada de usar fármaco y en la fila sin dado", () => {
    const f = resolver(ficha({ ...IROTA, farmacos }));
    assert.deepEqual(f.notasFarmacos, [NOTA]);
    const [conDado] = accionesDeFarmacos(f.ficha, f.notasFarmacos);
    const [sinDado] = accionesDirectasDeFarmacos(f.ficha, f.notasFarmacos);
    assert.ok(conDado.nota?.endsWith(NOTA));
    assert.ok(sinDado.nota?.endsWith(NOTA));
  });

  test("sin el rasgo, ni rastro", () => {
    for (const s of [ficha({ ...MAOLHER, farmacos }), ficha({ especieId: "humano", farmacos })]) {
      const f = resolver(s);
      assert.deepEqual(f.notasFarmacos, []);
      assert.ok(accionesDeFarmacos(f.ficha, f.notasFarmacos).every((a) => !a.nota?.includes("Irota")));
    }
  });
});

describe("Activar visión (Arianyi); visión del Axadren, pasiva", () => {
  test("solo con su rasgo", () => {
    for (const s of [ficha({ especieId: "humano" }), ficha(MAOLHER), ficha({ especieId: "arkoru" })]) {
      assert.deepEqual(resolver(s).accionesEspecie, []);
    }
    const acciones = resolver(ficha({ especieId: "arianyi" })).accionesEspecie;
    assert.equal(acciones.length, 1);
    assert.equal(acciones[0].label, "Activar visión");
    assert.equal(acciones[0].grupo, "Acciones");
    assert.match(acciones[0].nota ?? "", /calor y las huellas químicas o eléctricas/);
  });

  test("Arianyi cobra 1 de fatiga por escena", () => {
    const arianyi = resolver(ficha({ especieId: "arianyi" }));
    const [vision] = arianyi.accionesEspecie;
    assert.equal(vision.costeFatiga, 1);
    assert.match(vision.nota ?? "", /dura la escena; en cada escena más, vuelve a activarla/);
    assert.equal(pagarFatiga(arianyi.ficha, vision.costeFatiga!, false).fatigaActual, 9);
  });

  // D3 del triaje (2026-10-28): pasiva y sin coste, sin acción de activar; nota en Buscar / percibir.
  test("Axadren: sin acción, nota en Buscar / percibir", () => {
    const f = resolver(ficha(AXADREN));
    assert.deepEqual(f.accionesEspecie, []);
    const vision = f.textosTirada.filter((t) => /Visión infrarroja/.test(t.texto));
    assert.equal(vision.length, 1);
    assert.deepEqual(vision[0].en, { tipo: "tiradaId", id: "alerta_activa" });
  });

  test("también al NPC en modo libre (es derivado)", () => {
    assert.equal(resolver(ficha({ especieId: "arianyi" }), true).accionesEspecie.length, 1);
  });
});
