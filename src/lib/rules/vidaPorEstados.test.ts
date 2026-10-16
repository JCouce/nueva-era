import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  aplicarOperacionEstado,
  bajadaDeMaximos,
  devolverVida,
  maximosConEstados,
  vidaTrasCambioDeEstados,
} from "./vidaPorEstados";
import { defaultSheet, parseSheet, type Sheet } from "./sheet";
import type { EstadoActivo } from "./estados";

const base = defaultSheet();
const SHEET: Sheet = parseSheet({ ...base, atributos: { ...base.atributos, fuerza: 3, aguante: 3, caracter: 3 } });
const ENF2: EstadoActivo = { estadoId: "enfermedad", gradoId: "nivel_2", rondasRestantes: null };
const ENF3: EstadoActivo = { estadoId: "enfermedad", gradoId: "nivel_3", rondasRestantes: 4 };
const ATRAPADO: EstadoActivo = { estadoId: "atrapado", gradoId: "activo", rondasRestantes: 3 };

const reposo = maximosConEstados(SHEET, []);
const conEnf2 = maximosConEstados(SHEET, [ENF2]);
const conEnf3 = maximosConEstados(SHEET, [ENF3]);

describe("vidaTrasCambioDeEstados (S75: lo que baja el máximo se pierde)", () => {
  test("los datos de prueba: Enfermedad baja vida y fatiga máximas, más con más grado", () => {
    assert.ok(conEnf2.vida < reposo.vida && conEnf2.fatiga < reposo.fatiga);
    assert.ok(conEnf3.vida < conEnf2.vida);
    assert.equal(SHEET.vidaActual, reposo.vida);
  });

  test("poner un estado que baja el máximo baja la actual lo mismo", () => {
    const r = vidaTrasCambioDeEstados(SHEET, [], [ENF2]);
    const bajada = bajadaDeMaximos(reposo, conEnf2);
    assert.equal(r.sheet.vidaActual, SHEET.vidaActual - bajada.vida);
    assert.equal(r.sheet.fatigaActual, SHEET.fatigaActual - bajada.fatiga);
    assert.deepEqual(r.restado, bajada);
    assert.deepEqual(r.maximos, conEnf2);
  });

  test("también con la vida ya baja: resta lo mismo, no recorta al máximo", () => {
    const herido = { ...SHEET, vidaActual: 5 };
    const r = vidaTrasCambioDeEstados(herido, [], [ENF2]);
    assert.equal(r.sheet.vidaActual, 5 - (reposo.vida - conEnf2.vida));
  });

  test("subir de grado resta solo la diferencia; bajar de grado no devuelve nada", () => {
    const sube = vidaTrasCambioDeEstados(SHEET, [ENF2], [ENF3]);
    assert.equal(sube.restado.vida, conEnf2.vida - conEnf3.vida);
    const baja = vidaTrasCambioDeEstados(SHEET, [ENF3], [ENF2]);
    assert.equal(baja.sheet, SHEET);
    assert.deepEqual(baja.restado, { vida: 0, fatiga: 0 });
  });

  test("quitarlo o un estado que no toca la vida: la actual no se mueve", () => {
    assert.equal(vidaTrasCambioDeEstados(SHEET, [ENF2], []).sheet, SHEET);
    assert.equal(vidaTrasCambioDeEstados(SHEET, [], [ATRAPADO]).sheet, SHEET);
  });

  test("suelo en 0, y lo restado es lo que de verdad se quitó", () => {
    const casi = { ...SHEET, vidaActual: 1, fatigaActual: 0 };
    const r = vidaTrasCambioDeEstados(casi, [], [ENF3]);
    assert.equal(r.sheet.vidaActual, 0);
    assert.equal(r.sheet.fatigaActual, 0);
    assert.deepEqual(r.restado, { vida: 1, fatiga: 0 });
  });

  test("en combate: la foto baja igual y su máximo se recalcula; al quitar sube el máximo, no la actual", () => {
    const fotos = [{ id: "c1", pgActual: 6, fatigaActual: 2 }];
    const puesto = vidaTrasCambioDeEstados(SHEET, [], [ENF2], fotos);
    const bajada = bajadaDeMaximos(reposo, conEnf2);
    assert.deepEqual(puesto.combatientes, [
      {
        id: "c1",
        pgActual: 6 - bajada.vida,
        pgMax: conEnf2.vida,
        fatigaActual: Math.max(0, 2 - bajada.fatiga),
        fatigaMax: conEnf2.fatiga,
        restado: { vida: bajada.vida, fatiga: Math.min(2, bajada.fatiga) },
      },
    ]);
    const quitado = vidaTrasCambioDeEstados(SHEET, [ENF2], [], [{ id: "c1", pgActual: 3, fatigaActual: 1 }]);
    assert.deepEqual(quitado.combatientes[0], {
      id: "c1",
      pgActual: 3,
      pgMax: reposo.vida,
      fatigaActual: 1,
      fatigaMax: reposo.fatiga,
      restado: { vida: 0, fatiga: 0 },
    });
  });
});

describe("devolverVida (deshacer)", () => {
  test("sube hasta el máximo y nunca baja", () => {
    assert.equal(devolverVida(5, 3, 10), 8);
    assert.equal(devolverVida(9, 3, 10), 10);
    assert.equal(devolverVida(12, 3, 10), 12);
  });
});

describe("aplicarOperacionEstado", () => {
  const pj = { id: "pj1", sheet: SHEET, estados: [ENF2] };

  test("poner: guarda el de antes, el nuevo y lo restado", () => {
    const r = aplicarOperacionEstado(pj, { tipo: "poner", estado: ENF3 }, [{ id: "c1", pgActual: 9, fatigaActual: 9 }]);
    assert.ok(r);
    assert.deepEqual(r.estados, [ENF3]);
    assert.equal(r.cambio.antes, ENF2);
    assert.equal(r.cambio.despues, ENF3);
    assert.equal(r.cambio.restado.vida, conEnf2.vida - conEnf3.vida);
    assert.deepEqual(r.cambio.combatientes, [{ id: "c1", restado: r.vida.combatientes[0].restado }]);
  });

  test("quitar uno que tiene: después null; uno que no tiene: null (nada que registrar)", () => {
    const r = aplicarOperacionEstado(pj, { tipo: "quitar", estadoId: "enfermedad" });
    assert.ok(r);
    assert.deepEqual(r.estados, []);
    assert.equal(r.cambio.despues, null);
    assert.deepEqual(r.cambio.restado, { vida: 0, fatiga: 0 });
    assert.equal(aplicarOperacionEstado(pj, { tipo: "quitar", estadoId: "atrapado" }), null);
  });
});
