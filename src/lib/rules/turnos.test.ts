import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  pasarTurno,
  segmentosDeVuelta,
  cambioDeTurno,
  relojDeTurno,
  resumenCombate,
  duracionLegible,
  vidaEnMesa,
  fotoEnMesa,
  type FotoDeJugador,
} from "./turnos";

describe("pasarTurno (E1d: la vuelta se cierra al pasar del último al primero)", () => {
  test("un turno normal avanza sin cerrar la vuelta", () => {
    assert.deepEqual(pasarTurno({ ronda: 3, turnoIndex: 1 }, 4), { ronda: 3, turnoIndex: 2, cierraVuelta: false });
  });
  test("del último al primero: sube la ronda y cierra la vuelta", () => {
    assert.deepEqual(pasarTurno({ ronda: 3, turnoIndex: 3 }, 4), { ronda: 4, turnoIndex: 0, cierraVuelta: true });
  });
  test("con uno solo en la cola, cada turno cierra la vuelta", () => {
    assert.deepEqual(pasarTurno({ ronda: 1, turnoIndex: 0 }, 1), { ronda: 2, turnoIndex: 0, cierraVuelta: true });
  });
  test("un índice fuera de rango (cola encogida) también cierra la vuelta", () => {
    assert.deepEqual(pasarTurno({ ronda: 2, turnoIndex: 5 }, 3), { ronda: 3, turnoIndex: 0, cierraVuelta: true });
  });
  test("cola vacía: no se mueve", () => {
    assert.deepEqual(pasarTurno({ ronda: 2, turnoIndex: 0 }, 0), { ronda: 2, turnoIndex: 0, cierraVuelta: false });
  });
});

describe("segmentosDeVuelta", () => {
  test("hechos, el actual y pendientes", () => {
    assert.deepEqual(segmentosDeVuelta(4, 1), ["hecho", "actual", "pendiente", "pendiente"]);
  });
  test("vacía sin cola", () => {
    assert.deepEqual(segmentosDeVuelta(0, 0), []);
  });
});

describe("cambioDeTurno: qué anima el contador", () => {
  test("primera pintada o sin cambio: nada", () => {
    assert.equal(cambioDeTurno(null, { ronda: 1, turnoIndex: 0 }), null);
    assert.equal(cambioDeTurno({ ronda: 2, turnoIndex: 1 }, { ronda: 2, turnoIndex: 1 }), null);
  });
  test("sube la ronda: vuelta", () => {
    assert.equal(cambioDeTurno({ ronda: 2, turnoIndex: 3 }, { ronda: 3, turnoIndex: 0 }), "vuelta");
  });
  test("mismo número de ronda, otro turno (también al reordenar): turno", () => {
    assert.equal(cambioDeTurno({ ronda: 2, turnoIndex: 1 }, { ronda: 2, turnoIndex: 2 }), "turno");
    assert.equal(cambioDeTurno({ ronda: 2, turnoIndex: 2 }, { ronda: 2, turnoIndex: 0 }), "turno");
  });
  test("un combate nuevo (vuelve a la ronda 1) no se celebra como vuelta", () => {
    assert.equal(cambioDeTurno({ ronda: 5, turnoIndex: 2 }, { ronda: 1, turnoIndex: 0 }), "turno");
  });
});

describe("relojDeTurno", () => {
  test("m:ss, naranja desde el minuto", () => {
    assert.deepEqual(relojDeTurno(0), { texto: "0:00", lento: false });
    assert.deepEqual(relojDeTurno(59_999), { texto: "0:59", lento: false });
    assert.deepEqual(relojDeTurno(60_000), { texto: "1:00", lento: true });
    assert.deepEqual(relojDeTurno(754_000), { texto: "12:34", lento: true });
  });
  test("un reloj del cliente que va atrás no da negativos", () => {
    assert.deepEqual(relojDeTurno(-3000), { texto: "0:00", lento: false });
  });
});

describe("resumenCombate", () => {
  const inicio = new Date("2026-10-16T20:00:00Z");
  test("cuenta jugadores distintos, NPC, derrotados y la duración", () => {
    const r = resumenCombate({
      ronda: 4,
      iniciadoAt: inicio,
      terminadoAt: new Date("2026-10-16T20:25:30Z"),
      combatientes: [
        { characterId: "kira", derrotado: true },
        { characterId: "kira", derrotado: false },
        { characterId: "tarsis", derrotado: false },
        { characterId: null, derrotado: true },
        { characterId: null, derrotado: false },
      ],
      acciones: 7,
    });
    assert.deepEqual(r, { rondas: 4, duracionMs: 1_530_000, jugadores: 2, npcs: 2, derrotados: 2, acciones: 7 });
  });
  test("sin hora de inicio (no llegó a comenzar), sin duración", () => {
    const r = resumenCombate({ ronda: 1, iniciadoAt: null, terminadoAt: inicio, combatientes: [], acciones: 0 });
    assert.equal(r.duracionMs, null);
  });
});

describe("duracionLegible", () => {
  test("minutos y horas", () => {
    assert.equal(duracionLegible(30_000), "menos de 1 min");
    assert.equal(duracionLegible(12 * 60_000 + 59_000), "12 min");
    assert.equal(duracionLegible(65 * 60_000), "1 h 05 min");
  });
});

describe("vidaEnMesa (E1d: con combate en curso, la vida del combate)", () => {
  const ficha = { vida: { actual: 20, max: 24 }, fatiga: { actual: 10, max: 12 } };
  const foto = (o: Partial<FotoDeJugador>): FotoDeJugador => ({
    orden: 0,
    derrotado: false,
    pgActual: 5,
    pgMax: 22,
    fatigaActual: 3,
    fatigaMax: 12,
    ...o,
  });
  test("sin foto: la de la ficha", () => {
    assert.deepEqual(vidaEnMesa(ficha, []), { ...ficha, deCombate: false });
  });
  test("con foto: la del combate, marcada", () => {
    assert.deepEqual(vidaEnMesa(ficha, [foto({})]), {
      vida: { actual: 5, max: 22 },
      fatiga: { actual: 3, max: 12 },
      deCombate: true,
    });
  });
  test("varias filas: la que sigue en pie aunque vaya antes en la cola", () => {
    const r = vidaEnMesa(ficha, [foto({ orden: 1, pgActual: 9 }), foto({ orden: 4, derrotado: true, pgActual: 0 })]);
    assert.equal(r.vida.actual, 9);
  });
  test("todas en pie o todas derrotadas: la última de la cola", () => {
    const r = vidaEnMesa(ficha, [foto({ orden: 4, pgActual: 2 }), foto({ orden: 1, pgActual: 9 })]);
    assert.equal(r.vida.actual, 2);
  });
});

describe("fotoEnMesa (la que ajusta la pestaña Vida en la Mesa)", () => {
  const f = (id: string, orden: number, derrotado = false) => ({ id, orden, derrotado, pgActual: 1, pgMax: 1, fatigaActual: 1, fatigaMax: 1 });
  test("sin fotos, null; si no, la misma que enseña vidaEnMesa", () => {
    assert.equal(fotoEnMesa([]), null);
    assert.equal(fotoEnMesa([f("a", 1), f("b", 4, true)])?.id, "a");
    assert.equal(fotoEnMesa([f("a", 1), f("b", 4)])?.id, "b");
  });
});
