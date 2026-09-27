import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  elegirBuildNpcAleatorio,
  aplicarBuildNpcAleatorio,
  generarNpcAleatorio,
  ATRIBUTO_MAX_NPC_ALEATORIO,
  NOMBRES_NPC_ALEATORIO,
  type BuildNpcAleatorio,
} from "./npcAleatorio";
import { ATRIBUTOS, ATRIBUTO_MIN } from "./atributos";
import { HABILIDADES, HABILIDAD_NO_ENTRENADA, HABILIDAD_MIN_ENTRENADA, HABILIDAD_MAX_CREACION } from "./habilidades";
import { equipoPorId } from "../catalog/equipo";

function familiasDe(sheet: ReturnType<typeof aplicarBuildNpcAleatorio>, familia: string) {
  return sheet.equipo.filter((p) => equipoPorId(p.catalogoId)?.familia === familia);
}

describe("aplicarBuildNpcAleatorio", () => {
  test("instala exactamente un arma con su mejora y una armadura con la suya", () => {
    const build: BuildNpcAleatorio = {
      nombre: "Prueba",
      atributos: Object.fromEntries(ATRIBUTOS.map((a) => [a.id, 2])) as BuildNpcAleatorio["atributos"],
      habilidades: Object.fromEntries(HABILIDADES.map((h) => [h.id, 2])) as BuildNpcAleatorio["habilidades"],
      armaId: "pistola_bellum", // mejorasAdmitidas: 2 (pistola_mosquito es 0, no sirve para este test)
      armaduraId: "ropa_reforzada",
      mejoraArmaCandidatos: ["puntero_laser"],
      mejoraEstandarCandidatos: ["soporte_vital"],
    };

    const sheet = aplicarBuildNpcAleatorio(build);

    const armas = familiasDe(sheet, "arma");
    const armaduras = familiasDe(sheet, "armadura");
    const mejorasArma = familiasDe(sheet, "mejoraArma");
    const mejorasEstandar = familiasDe(sheet, "mejoraEstandar");

    assert.equal(armas.length, 1);
    assert.equal(armaduras.length, 1);
    assert.equal(mejorasArma.length, 1);
    assert.equal(mejorasEstandar.length, 1);
    assert.equal(mejorasArma[0].instaladoEnId, armas[0].instanciaId);
    assert.equal(mejorasEstandar[0].instaladoEnId, armaduras[0].instanciaId);
    assert.deepEqual(sheet.atributos, build.atributos);
  });

  test("si ningún candidato de mejora encaja, deja el host sin mejora en vez de reventar", () => {
    const build: BuildNpcAleatorio = {
      nombre: "Prueba",
      atributos: Object.fromEntries(ATRIBUTOS.map((a) => [a.id, 0])) as BuildNpcAleatorio["atributos"],
      habilidades: Object.fromEntries(HABILIDADES.map((h) => [h.id, HABILIDAD_NO_ENTRENADA])) as BuildNpcAleatorio["habilidades"],
      armaId: "pistola_mosquito",
      armaduraId: "ropa_reforzada",
      mejoraArmaCandidatos: ["catalogo_id_inexistente"],
      mejoraEstandarCandidatos: ["catalogo_id_inexistente"],
    };

    const sheet = aplicarBuildNpcAleatorio(build);
    assert.equal(familiasDe(sheet, "arma").length, 1);
    assert.equal(familiasDe(sheet, "armadura").length, 1);
    assert.equal(familiasDe(sheet, "mejoraArma").length, 0);
    assert.equal(familiasDe(sheet, "mejoraEstandar").length, 0);
  });
});

describe("elegirBuildNpcAleatorio", () => {
  test("respeta los topes pedidos y siempre produce un arma y una armadura instalables con mejora", () => {
    for (let i = 0; i < 200; i++) {
      const build = elegirBuildNpcAleatorio();

      for (const a of ATRIBUTOS) {
        const v = build.atributos[a.id];
        assert.ok(v >= ATRIBUTO_MIN && v <= ATRIBUTO_MAX_NPC_ALEATORIO, `atributo ${a.id}=${v} fuera de tope`);
      }
      for (const h of HABILIDADES) {
        const v = build.habilidades[h.id];
        const valido = v === HABILIDAD_NO_ENTRENADA || (v >= HABILIDAD_MIN_ENTRENADA && v <= HABILIDAD_MAX_CREACION);
        assert.ok(valido, `habilidad ${h.id}=${v} fuera de dominio`);
      }
      assert.ok(NOMBRES_NPC_ALEATORIO.includes(build.nombre));

      const sheet = aplicarBuildNpcAleatorio(build);
      assert.equal(familiasDe(sheet, "arma").length, 1);
      assert.equal(familiasDe(sheet, "armadura").length, 1);
      assert.equal(familiasDe(sheet, "mejoraArma").length, 1, "toda arma sorteada debe admitir alguna mejora compatible");
      assert.equal(familiasDe(sheet, "mejoraEstandar").length, 1);
    }
  });
});

describe("generarNpcAleatorio", () => {
  test("devuelve un nombre del pool y una ficha jugable", () => {
    const { nombre, sheet } = generarNpcAleatorio();
    assert.ok(NOMBRES_NPC_ALEATORIO.includes(nombre));
    assert.equal(familiasDe(sheet, "arma").length, 1);
    assert.equal(familiasDe(sheet, "armadura").length, 1);
  });
});
