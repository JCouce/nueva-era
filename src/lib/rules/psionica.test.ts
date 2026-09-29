import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, parseSheet, type Sheet } from "./sheet";
import { migrar } from "./migraciones";
import { motorMetadataSchema, erroresDeMotorMetadata } from "./motor";
import { ESPECIALIDADES_CONOCIDAS } from "./habilidades";
import {
  DISCIPLINA_MAX,
  nivelDisciplina,
  puntosPsionicaDisponibles,
  puntosPsionicaGastados,
  setDisciplinaValue,
  setNivelDisciplina,
  sueloPorRequisitos,
} from "./psionica";
import { resetBuild } from "./creacion";
import { DISCIPLINAS, DISCIPLINA_IDS, PSIONICA, disciplinaPorId } from "../catalog/psionica";

function conLetra(letra: Sheet["prioridades"]["psionica"]): Sheet {
  const s = defaultSheet();
  return { ...s, prioridades: { ...s.prioridades, psionica: letra } };
}

describe("catálogo de psiónica", () => {
  test("las 6 disciplinas, una por id y en el orden de DISCIPLINA_IDS", () => {
    assert.deepEqual(
      DISCIPLINAS.map((d) => d.id),
      [...DISCIPLINA_IDS],
    );
  });

  test("todo requisito apunta a otra disciplina existente", () => {
    for (const d of DISCIPLINAS) {
      if (!d.requisito) continue;
      assert.notEqual(d.requisito.disciplina, d.id);
      assert.doesNotThrow(() => disciplinaPorId(d.requisito!.disciplina));
    }
  });

  test("ids de acción únicos y con prefijo psi_<disciplina>_", () => {
    const ids = DISCIPLINAS.flatMap((d) => d.acciones.map((a) => a.id));
    assert.equal(new Set(ids).size, ids.length);
    for (const d of DISCIPLINAS) for (const a of d.acciones) assert.ok(a.id.startsWith(`psi_${d.id}_`), a.id);
  });

  test("cada eje de nivel empleado ofrece los niveles 1-6, cada uno desde su propio nivel", () => {
    for (const d of DISCIPLINAS)
      for (const a of d.acciones)
        for (const eje of a.ejes.filter((e) => e.tipo === "nivel_empleado")) {
          assert.deepEqual(
            eje.opciones.map((o) => o.desdeNivel),
            [1, 2, 3, 4, 5, 6],
            `${a.id}.${eje.id}`,
          );
        }
  });

  test("MotorMetadata válido en todas las acciones", () => {
    for (const d of DISCIPLINAS)
      for (const a of d.acciones) {
        assert.ok(a.motor.length > 0, a.id);
        for (const m of a.motor) {
          assert.ok(motorMetadataSchema.safeParse(m).success, a.id);
          assert.deepEqual(erroresDeMotorMetadata(m), [], a.id);
        }
      }
  });

  test("Singularidad: fórmulas de la prosa en sus filas de nivel", () => {
    const [impulso, expansion, convergencia] = disciplinaPorId("singularidad").acciones;
    const fila = (a: typeof impulso, n: number) => a.ejes[0].opciones[n - 1].cambia;
    // Impulso nivel 3: 20×3 m, daño 9+3, empuje 4×3, resistir empuje 8+3
    assert.equal(fila(impulso, 3).alcance, 60);
    assert.deepEqual(fila(impulso, 3).resolucion, { danio: 12 });
    assert.equal(fila(impulso, 3).desplazamiento, 12);
    assert.equal(fila(impulso, 3).objetivoTira?.[1].dificultad, 11);
    // Expansión nivel 2: área 4+2×2, daño 13+2, esquiva 6+2
    assert.deepEqual(fila(expansion, 2).objetivo, { tipo: "casilla", area: 8 });
    assert.deepEqual(fila(expansion, 2).resolucion, { danio: 15 });
    assert.equal(fila(expansion, 2).objetivoTira?.[0].dificultad, 8);
    // Convergencia nivel 6: 15×6 m, daño 5+6
    assert.equal(fila(convergencia, 6).alcance, 90);
    assert.deepEqual(fila(convergencia, 6).resolucion, { danio: 11 });
    // Fatiga: 1 por nivel empleado
    for (const a of [impulso, expansion, convergencia]) assert.equal(fila(a, 4).fatiga, 4);
  });

  test("el +1 de fatiga de la forma Poderosa se cobra una sola vez", () => {
    const d = disciplinaPorId("singularidad");
    assert.equal(d.modificadoresFatiga.length, 0);
    for (const a of d.acciones) {
      const poderosa = a.ejes.find((e) => e.id === "modo")!.opciones.find((o) => o.id === "poderoso")!;
      assert.equal(poderosa.suma?.fatiga, 1, a.id);
    }
  });

  test("sobrecarga: multiplicadores 0 / ½ / 1 / 2", () => {
    assert.deepEqual(PSIONICA.sobrecarga.multiplicadorPorGrado, { critico: 0, exito: 0.5, fracaso: 1, fracasoCritico: 2 });
  });

  test("Física, Informática y Biónica son especialidades de Tecnociencia", () => {
    for (const e of ["Física", "Informática", "Biónica"]) assert.ok(ESPECIALIDADES_CONOCIDAS.tecnociencia?.includes(e), e);
  });
});

describe("compra de disciplinas", () => {
  test("coste triangular N×3: nivel 2 cuesta 3+6", () => {
    const s = setDisciplinaValue(setDisciplinaValue(conLetra("A"), "traslacion", 1), "traslacion", 2);
    assert.equal(nivelDisciplina(s, "traslacion"), 2);
    assert.equal(puntosPsionicaGastados(s), 9);
    assert.equal(puntosPsionicaDisponibles(s), 18 - 9);
  });

  test("sin pool no se compra", () => {
    const s = setDisciplinaValue(conLetra(null), "traslacion", 1);
    assert.equal(nivelDisciplina(s, "traslacion"), 0);
  });

  test("letra A llega a nivel 3 en una disciplina pero no a 4", () => {
    let s = conLetra("A");
    for (const n of [1, 2, 3, 4]) s = setDisciplinaValue(s, "resonancia", n);
    assert.equal(nivelDisciplina(s, "resonancia"), 3);
  });

  test("requisito: Singularidad no se compra sin Traslación 2", () => {
    let s = setDisciplinaValue(conLetra("A"), "singularidad", 1);
    assert.equal(nivelDisciplina(s, "singularidad"), 0);
    s = setDisciplinaValue(setDisciplinaValue(s, "traslacion", 1), "traslacion", 2);
    s = setDisciplinaValue(s, "singularidad", 1);
    assert.equal(nivelDisciplina(s, "singularidad"), 1);
    assert.equal(puntosPsionicaDisponibles(s), 18 - 9 - 3);
  });

  test("no se baja una disciplina por debajo de lo que otra comprada requiere", () => {
    let s = setDisciplinaValue(setDisciplinaValue(conLetra("A"), "traslacion", 1), "traslacion", 2);
    s = setDisciplinaValue(s, "singularidad", 1);
    assert.equal(sueloPorRequisitos(s, "traslacion"), 2);
    assert.equal(nivelDisciplina(setDisciplinaValue(s, "traslacion", 1), "traslacion"), 2);
    // Quitando antes Singularidad, ya se puede bajar
    s = setDisciplinaValue(s, "singularidad", 0);
    assert.equal(nivelDisciplina(setDisciplinaValue(s, "traslacion", 1), "traslacion"), 1);
  });

  test("nivel 0 no deja clave en la ficha; tope del sistema 6", () => {
    let s = setNivelDisciplina(defaultSheet(), "resonancia", 9);
    assert.equal(nivelDisciplina(s, "resonancia"), DISCIPLINA_MAX);
    s = setNivelDisciplina(s, "resonancia", 0);
    assert.deepEqual(s.psionica, {});
  });

  test("resetBuild vacía la psiónica", () => {
    const s = setDisciplinaValue(conLetra("A"), "traslacion", 1);
    assert.deepEqual(resetBuild(s).psionica, {});
  });
});

describe("v11 → v12: niveles de disciplina psiónica", () => {
  test("una ficha v11 arranca sin psiónica y sin tocar el resto", () => {
    const { ficha } = migrar({ schemaVersion: 11, especieId: "arkoru", municionEspecial: { incendiaria: 3 } }, 12);
    assert.deepEqual(ficha.psionica, {});
    assert.deepEqual(ficha.municionEspecial, { incendiaria: 3 });
    assert.equal(ficha.schemaVersion, 12);
  });

  test("parseSheet recorta a 0-6 y descarta ids desconocidos y niveles 0", () => {
    const s = parseSheet({ schemaVersion: 12, psionica: { traslacion: 9, singularidad: 2, inventada: 3, resonancia: 0 } });
    assert.deepEqual(s.psionica, { traslacion: 6, singularidad: 2 });
  });
});
