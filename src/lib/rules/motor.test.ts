import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { motorMetadataSchema, erroresDeMotorMetadata, type MotorMetadata } from "./motor";

const BASE: MotorMetadata = {
  tipo: "numerico",
  afecta: { modo: "accion_existente", id: "ataque_fuego" },
  mecanismo: "siempre_activo",
  estado: "construido",
};

describe("motorMetadataSchema", () => {
  test("acepta un MotorMetadata construido, sin arbitraje ni bloqueoPor", () => {
    assert.equal(motorMetadataSchema.safeParse(BASE).success, true);
  });

  test("acepta afecta.modo 'ninguna' sin id", () => {
    const m: MotorMetadata = { ...BASE, afecta: { modo: "ninguna" }, mecanismo: null };
    assert.equal(motorMetadataSchema.safeParse(m).success, true);
  });

  test("rechaza un tipo/mecanismo fuera de los cerrados", () => {
    assert.equal(motorMetadataSchema.safeParse({ ...BASE, tipo: "otro" }).success, false);
    assert.equal(motorMetadataSchema.safeParse({ ...BASE, mecanismo: "otro" }).success, false);
  });
});

describe("erroresDeMotorMetadata", () => {
  test("un habilitador sin arbitraje da error", () => {
    const m: MotorMetadata = { ...BASE, tipo: "habilitador" };
    assert.deepEqual(erroresDeMotorMetadata(m), ['tipo "habilitador" exige "arbitraje"']);
  });

  test("un habilitador con arbitraje no da error", () => {
    const m: MotorMetadata = { ...BASE, tipo: "habilitador", arbitraje: "blando" };
    assert.deepEqual(erroresDeMotorMetadata(m), []);
  });

  test("estado bloqueado sin bloqueoPor da error", () => {
    const m: MotorMetadata = { ...BASE, estado: "bloqueado" };
    assert.deepEqual(erroresDeMotorMetadata(m), ['estado "bloqueado" exige "bloqueoPor"']);
  });

  test("afecta 'ninguna' con mecanismo no null da error", () => {
    const m: MotorMetadata = { ...BASE, afecta: { modo: "ninguna" }, mecanismo: "ajuste_fijo" };
    assert.deepEqual(erroresDeMotorMetadata(m), ['afecta.modo "ninguna" exige "mecanismo: null"']);
  });

  test("afecta distinto de 'ninguna' con mecanismo null da error", () => {
    const m: MotorMetadata = { ...BASE, mecanismo: null };
    assert.deepEqual(erroresDeMotorMetadata(m), ['"mecanismo: null" solo vale con afecta.modo "ninguna"']);
  });

  test("un MotorMetadata válido no da ningún error", () => {
    assert.deepEqual(erroresDeMotorMetadata(BASE), []);
  });
});
