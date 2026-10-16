import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { HABILIDADES } from "./habilidades";
import { resolverFicha, VITALIDAD_DE_FICHA, type FichaResuelta } from "./fichaResuelta";
import { accionesDePsionica, type PoderDisponible } from "./poderes";
import { prepararPoder, usarPoder, efectosDelResultado, SELECCION_PODER_VACIA, type SeleccionPoder } from "./usoPoder";
import { DOTES } from "../catalog/dotes";
import { DESTINOS_DOTES, TANDAS_DOTES } from "../catalog/dotesDestinos";
import type { DoteComprada } from "./dotesCompradas";
import type { EspecialidadId } from "../catalog/especialidades";

// Atributos a 4, habilidades a 6 con la especialidad de Medicina y fatiga de sobra.
function ficha(dotes: DoteComprada[], psionica: Sheet["psionica"]): Sheet {
  const base = defaultSheet();
  return {
    ...base,
    atributos: Object.fromEntries(Object.keys(base.atributos).map((k) => [k, 4])) as Sheet["atributos"],
    habilidades: Object.fromEntries(
      HABILIDADES.map((h) => [h.id, { valor: 6, especialidades: h.id === "biociencia" ? (["medicina"] as EspecialidadId[]) : [] }]),
    ) as Sheet["habilidades"],
    psionica,
    fatigaActual: 20,
    fatigaTemporal: 0,
    dotes,
  };
}

const resolver = (s: Sheet, libre = false) => resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA, libre });
const IMPACTO = { id: "dote_impacto_metrico" };
const RELAMPAGO = { id: "dote_impacto_metrico_relampago" };
const SOBRECARGA = { id: "dote_sobrecarga_metrica" };
const ONDA = { id: "dote_onda_residual" };
const SINGULARIDAD_3 = { traslacion: 2, singularidad: 3 };

const poderDe = (f: FichaResuelta, id: string) => f.poderesDotes.find((p) => p.accion.id === id);
const preparar = (f: FichaResuelta, poder: PoderDisponible, s: Partial<SeleccionPoder> = {}, conTextos = true) =>
  prepararPoder({
    ficha: f.ficha,
    modificadores: f.modificadores,
    niveles: f.psionica.paraEfectos,
    poder,
    seleccion: { ...SELECCION_PODER_VACIA, ...s },
    ...(conTextos && { textos: f.textosTirada }),
  })!;

describe("catálogo: recuento de D2c-2", () => {
  const pendientes = (tanda: string) =>
    DOTES.reduce((n, d) => n + d.motor.filter((m) => m.estado === "pendiente" && m.bloqueoPor === tanda).length, 0);

  test("D2c-2 cerrada: sus 8 efectos, construidos", () => {
    assert.ok(TANDAS_DOTES.includes("D2c-2"));
    assert.equal(pendientes("D2c-2"), 0);
    const efectos = DOTES.filter((d) => [IMPACTO.id, RELAMPAGO.id, SOBRECARGA.id, ONDA.id].includes(d.id)).flatMap((d) => d.motor);
    assert.equal(efectos.length, 8);
    assert.ok(efectos.every((m) => m.estado === "construido"));
  });

  test("los destinos de poder ya no son tanda", () => {
    assert.deepEqual(DESTINOS_DOTES.dotes_impacto_metrico, { tipo: "poder", id: "dotes_impacto_metrico" });
    assert.deepEqual(DESTINOS_DOTES.psi_singularidad_expansion, { tipo: "poder", id: "psi_singularidad_expansion" });
  });
});

describe("poderesDeDotes", () => {
  test("sin la dote: ningún poder de dote", () => {
    assert.deepEqual(resolver(ficha([], SINGULARIDAD_3)).poderesDotes, []);
  });

  test("Impacto Métrico con Singularidad 3: al nivel de la disciplina, 1 de fatiga por nivel empleado, sin tirada", () => {
    const f = resolver(ficha([IMPACTO], SINGULARIDAD_3));
    const p = poderDe(f, "dotes_impacto_metrico");
    assert.ok(p);
    assert.equal(p.nivelPoseido, 3);
    assert.equal(p.disciplina.id, "singularidad");
    assert.equal(p.bloqueo, null);
    const n3 = preparar(f, p);
    assert.equal(n3.coste?.total, 3);
    assert.equal(n3.tirada, null); // el ataque del arma se tira aparte (§9.3)
    assert.deepEqual(n3.resuelto.datos, [{ etiqueta: "Daño extra (letal)", valor: 5 }]);
    assert.match(n3.resuelto.notas[0].texto, /tira el ataque aparte/);
    const n1 = preparar(f, p, { elecciones: { nivel: "n1" } });
    assert.equal(n1.coste?.total, 1);
    assert.deepEqual(n1.resuelto.datos, [{ etiqueta: "Daño extra (letal)", valor: 3 }]);
    // Vector descendente: compresión de 1 por cada dos niveles empleados (mínimo 1), se suma.
    const desc = preparar(f, p, { elecciones: { nivel: "n3", vector: "descendente" } });
    assert.deepEqual(desc.resuelto.datos.map((d) => d.valor), [5, 1]);
    assert.equal(desc.resuelto.objetivoTira[0].dificultad, 12); // 8 + 3, +1 del vector
  });

  test("Sobrecarga Métrica con Traslación 2: tirada Perspicacia + Biociencia (Medicina), dificultad 5 + nivel", () => {
    const f = resolver(ficha([SOBRECARGA], { traslacion: 2 }));
    const p = poderDe(f, "dotes_sobrecarga_metrica");
    assert.ok(p);
    assert.equal(p.nivelPoseido, 2);
    const prep = preparar(f, p);
    assert.equal(prep.coste?.total, 2);
    assert.ok(prep.tirada);
    assert.equal(prep.tirada.aplicado, "perspicacia");
    assert.equal(prep.tirada.habilidad, "biociencia");
    assert.equal(prep.tirada.dificultadSugerida, 7);
    assert.equal(prep.enEspecialidad, true);
    assert.deepEqual(prep.resuelto.datos, [{ etiqueta: "Fuerza durante la sobrecarga", valor: 4 }]);
    // Éxito: 1 no letal por cada dos niveles empleados, mínimo 1; fracaso: 1 letal por nivel.
    assert.deepEqual(efectosDelResultado(prep, "exito").vida, 1);
    assert.deepEqual(efectosDelResultado(prep, "fracaso").vida, 2);
    assert.deepEqual(efectosDelResultado(prep, "critico").vida, 0);
  });

  test("requisito roto (Singularidad 1 para Impacto Métrico): el poder no sale", () => {
    assert.equal(poderDe(resolver(ficha([IMPACTO], { traslacion: 2, singularidad: 1 })), "dotes_impacto_metrico"), undefined);
  });

  test("sin la disciplina (NPC sin requisitos): el poder no sale", () => {
    assert.equal(poderDe(resolver(ficha([IMPACTO], { traslacion: 2 }), true), "dotes_impacto_metrico"), undefined);
    assert.ok(poderDe(resolver(ficha([IMPACTO], SINGULARIDAD_3), true), "dotes_impacto_metrico"));
  });

  test("usarlo paga la fatiga del nivel empleado, como un poder", () => {
    const f = resolver(ficha([IMPACTO], SINGULARIDAD_3));
    const prep = preparar(f, poderDe(f, "dotes_impacto_metrico")!, { elecciones: { nivel: "n2" } });
    const uso = usarPoder(f, prep);
    assert.deepEqual(uso.fatiga, { pagar: 2, temporal: false });
    assert.equal(uso.vida, 0);
  });
});

describe("prepararPoder: textos de la ficha en el poder", () => {
  const expansion = (f: FichaResuelta) =>
    accionesDePsionica(f.ficha, f.psionica.paraEfectos).find((p) => p.accion.id === "psi_singularidad_expansion")!;

  test("Onda Residual: sus 5 textos en la nota de Expansión, solo con la dote", () => {
    const con = resolver(ficha([ONDA], SINGULARIDAD_3));
    const nota = preparar(con, expansion(con)).tirada?.nota ?? "";
    assert.equal(nota.split("(Onda Residual)").length - 1, 5);
    const sin = resolver(ficha([], SINGULARIDAD_3));
    assert.doesNotMatch(preparar(sin, expansion(sin)).tirada?.nota ?? "", /Onda Residual/);
  });

  test("sin textos (llamada sin la lista): la tirada no cambia", () => {
    const f = resolver(ficha([ONDA], SINGULARIDAD_3));
    assert.equal(preparar(f, expansion(f), {}, false).tirada?.nota, undefined);
  });

  test("Impacto Métrico Relámpago: su texto en las notas de Impacto Métrico (no tira)", () => {
    const f = resolver(ficha([IMPACTO, RELAMPAGO], SINGULARIDAD_3));
    const notas = preparar(f, poderDe(f, "dotes_impacto_metrico")!).resuelto.notas.map((n) => n.texto);
    assert.ok(notas.some((t) => /acción estándar/.test(t) && t.endsWith("(Impacto Métrico Relámpago)")), notas.join("\n"));
    const sin = resolver(ficha([IMPACTO], SINGULARIDAD_3));
    assert.ok(!preparar(sin, poderDe(sin, "dotes_impacto_metrico")!).resuelto.notas.some((n) => /Relámpago/.test(n.texto)));
  });
});
