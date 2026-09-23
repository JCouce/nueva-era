import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet } from "./sheet";
import { equipar } from "./equipo";
import { fuentesDeCapa1 } from "./capa1";

describe("fuentesDeCapa1", () => {
  test("una ficha sin equipo no aporta ninguna fuente", () => {
    assert.deepEqual(fuentesDeCapa1(defaultSheet()), []);
  });

  test("cada pieza equipada aporta una entrada, con su familia y su motor", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "a1", catalogoId: "pistola_mosquito" });
    const fuentes = fuentesDeCapa1(sheet);
    assert.equal(fuentes.length, 1);
    assert.equal(fuentes[0].instanciaId, "a1");
    assert.equal(fuentes[0].catalogoId, "pistola_mosquito");
    assert.equal(fuentes[0].familia, "arma");
    assert.ok(Array.isArray(fuentes[0].motor));
    assert.ok(fuentes[0].motor.length > 0);
  });

  test("una pieza con nivel (mejora/subsistema) resuelve el motor DE ESE NIVEL, no de otro", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_ligera" });
    const conMejora = equipar(sheet, {
      instanciaId: "m1",
      catalogoId: "soporte_vital",
      nivel: 1,
      instaladoEnId: "arm1",
    });
    const fuente = fuentesDeCapa1(conMejora).find((f) => f.instanciaId === "m1");
    assert.ok(fuente);
    assert.equal(fuente!.familia, "mejoraEstandar");
    assert.ok(Array.isArray(fuente!.motor));
  });

  test("una pieza equipada que no existe en el catálogo se ignora, no revienta", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "x1", catalogoId: "no_existe" });
    assert.deepEqual(fuentesDeCapa1(sheet), []);
  });
});
