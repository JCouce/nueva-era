// Caracterización de los costes ANTES de E2a (costes por especie): fija los números
// de una ficha sin especie y de una especie sin ajustes de coste (Riux). Tras meter
// los ajustes de casta y psiónicos, estos números no pueden moverse.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import {
  costeHabilidad,
  puntosHabilidadesDisponibles,
  puntosHabilidadesGastados,
  setHabilidadValue,
  addEspecialidad,
  setPrioridad,
} from "./creacion";
import { puntosPsionicaDisponibles, puntosPsionicaGastados, setDisciplinaValue } from "./psionica";
import { costeSubidaXp } from "./progresion";
import { avisosParaEnviar } from "./revision";
import { AJUSTE_NEUTRO } from "./progresion";
import { SIN_BONOS_DISCIPLINA } from "./psionica";

const base = (especieId: string | null): Sheet => {
  let s: Sheet = { ...defaultSheet(), especieId };
  s = setPrioridad(s, "habilidades", "A");
  s = setPrioridad(s, "psionica", "B");
  return s;
};

const conHabilidades = (s: Sheet) => {
  for (const n of [1, 2, 3]) s = setHabilidadValue(s, "atletismo", n, AJUSTE_NEUTRO); // 6
  s = addEspecialidad(s, "atletismo", "carrera", AJUSTE_NEUTRO); // gratis
  s = addEspecialidad(s, "atletismo", "salto", AJUSTE_NEUTRO); // +1
  s = setHabilidadValue(s, "tecnociencia", 2, AJUSTE_NEUTRO); // 3
  s = setHabilidadValue(s, "actitud", 1, AJUSTE_NEUTRO); // 1
  return s;
};

const conPsionica = (s: Sheet) => {
  s = setDisciplinaValue(s, "traslacion", 1, AJUSTE_NEUTRO, SIN_BONOS_DISCIPLINA);
  s = setDisciplinaValue(s, "traslacion", 2, AJUSTE_NEUTRO, SIN_BONOS_DISCIPLINA); // 9
  s = setDisciplinaValue(s, "resonancia", 1, AJUSTE_NEUTRO, SIN_BONOS_DISCIPLINA); // 3
  return s;
};

for (const [nombre, especieId] of [["sin especie", null], ["Riux", "riux"]] as const) {
  describe(`caracterización de costes: ${nombre}`, () => {
    test("habilidades con especialidades: 6 + 1 + 3 + 1 = 11 de 18", () => {
      const s = conHabilidades(base(especieId));
      assert.equal(s.habilidades.atletismo.valor, 3);
      assert.equal(puntosHabilidadesGastados(s, AJUSTE_NEUTRO), 11);
      assert.equal(puntosHabilidadesDisponibles(s, AJUSTE_NEUTRO), 7);
    });

    test("psiónica: Traslación 2 + Resonancia 1 = 12 de 12", () => {
      const s = conPsionica(base(especieId));
      assert.equal(puntosPsionicaGastados(s, AJUSTE_NEUTRO), 12);
      assert.equal(puntosPsionicaDisponibles(s, AJUSTE_NEUTRO), 0);
      // No cabe un punto más
      assert.equal(setDisciplinaValue(s, "resonancia", 2, AJUSTE_NEUTRO, SIN_BONOS_DISCIPLINA), s);
    });

    test("avisos al enviar: 7 de habilidades sin gastar", () => {
      const s = conPsionica(conHabilidades(base(especieId)));
      assert.deepEqual(
        avisosParaEnviar(s, AJUSTE_NEUTRO).filter((a) => !a.includes("atributos")),
        ["Te quedan 7 puntos de habilidades sin gastar"],
      );
    });
  });
}

describe("caracterización de costes: costeHabilidad", () => {
  test("triangular más especialidades a partir de la segunda", () => {
    assert.equal(costeHabilidad(-1, 0, undefined), 0);
    assert.equal(costeHabilidad(1, 1, undefined), 1);
    assert.equal(costeHabilidad(4, 1, undefined), 10);
    assert.equal(costeHabilidad(4, 3, undefined), 12);
    assert.equal(costeHabilidad(6, 2, undefined), 22);
  });
});

describe("caracterización de costes: subida con XP", () => {
  test("atributos N×2", () => {
    assert.equal(costeSubidaXp({ tipo: "atributo" }, -1, 0, AJUSTE_NEUTRO), 0);
    assert.equal(costeSubidaXp({ tipo: "atributo" }, 0, 1, AJUSTE_NEUTRO), 2);
    assert.equal(costeSubidaXp({ tipo: "atributo" }, 2, 4, AJUSTE_NEUTRO), 14);
    assert.equal(costeSubidaXp({ tipo: "atributo" }, 4, 6, AJUSTE_NEUTRO), 22);
    assert.equal(costeSubidaXp({ tipo: "atributo" }, 3, 3, AJUSTE_NEUTRO), 0);
  });

  test("habilidades N×1 (desde sin entrenar, el 0 no cuesta)", () => {
    assert.equal(costeSubidaXp({ tipo: "habilidad", id: "atletismo" }, -1, 1, AJUSTE_NEUTRO), 1);
    assert.equal(costeSubidaXp({ tipo: "habilidad", id: "tecnociencia" }, 1, 4, AJUSTE_NEUTRO), 9);
    assert.equal(costeSubidaXp({ tipo: "habilidad", id: "actitud" }, 4, 6, AJUSTE_NEUTRO), 11);
  });

  test("disciplinas N×3", () => {
    assert.equal(costeSubidaXp({ tipo: "disciplina", id: "resonancia" }, 0, 1, AJUSTE_NEUTRO), 3);
    assert.equal(costeSubidaXp({ tipo: "disciplina", id: "traslacion" }, 2, 5, AJUSTE_NEUTRO), 36);
    assert.equal(costeSubidaXp({ tipo: "disciplina", id: "singularidad" }, 5, 6, AJUSTE_NEUTRO), 18);
  });
});
