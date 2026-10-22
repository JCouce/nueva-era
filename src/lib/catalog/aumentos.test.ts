import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AUMENTOS, OPERACIONES_GENETICAS, IMPLANTES } from "./aumentos";
import { equipoPorId, RAREZA_ORDEN } from "./equipo";

// El catálogo se escribió a mano copiando docs/modelado-aumentos.json
// (docs/propuesta-aumentos.md §4): este test cruza lo que no puede desviarse.
type NivelJson = { nivel: number; rareza: string; coste: number; variantes: { id: string }[] | null };
type AumentoJson = {
  familia: "operacion_genetica" | "implante";
  id: string;
  label: string;
  rareza?: string;
  coste?: number;
  requisitos?: { tipo: string; id: string }[];
  eleccion?: { id: string; opciones: { id: string }[] } | null;
  repetible?: boolean;
  sabotaje?: boolean;
  electronico?: boolean;
  niveles?: NivelJson[];
  efectos?: EfectoJson[];
};
type EfectoJson =
  | { tipo: "atributo"; id: string; valor: number }
  | { tipo: "formula_salud"; multiplicaFortaleza: number }
  | { tipo: "coste_habilidad"; habilidades: string[] | "todas"; valor: number }
  | { tipo: "otro" };
const MODELADO = (
  JSON.parse(readFileSync(new URL("../../../docs/modelado-aumentos.json", import.meta.url), "utf8")) as {
    aumentos: AumentoJson[];
  }
).aumentos;

describe("catálogo de aumentos contra docs/modelado-aumentos.json", () => {
  test("mismas 32 piezas, mismos ids y en el mismo orden (26 operaciones y 6 implantes)", () => {
    assert.deepEqual(
      AUMENTOS.map((a) => a.id),
      MODELADO.map((a) => a.id),
    );
    assert.equal(OPERACIONES_GENETICAS.length, 26);
    assert.equal(IMPLANTES.length, 6);
  });

  test("operaciones: label, rareza, coste, requisitos, elección y repetible", () => {
    for (const op of OPERACIONES_GENETICAS) {
      const j = MODELADO.find((a) => a.id === op.id)!;
      assert.equal(j.familia, "operacion_genetica", op.id);
      assert.equal(op.label, j.label, op.id);
      assert.equal(op.rareza, j.rareza, op.id);
      assert.equal(op.coste, j.coste, op.id);
      assert.deepEqual(op.requisitos, (j.requisitos ?? []).map((r) => r.id), op.id);
      assert.equal(op.repetible, j.repetible, op.id);
      assert.deepEqual(
        op.eleccion?.opciones.map((o) => o.id) ?? null,
        j.eleccion ? j.eleccion.opciones.map((o) => o.id) : null,
        op.id,
      );
    }
  });

  test("implantes: niveles con rareza, coste y modelos; marcas de sabotaje y electrónico", () => {
    for (const imp of IMPLANTES) {
      const j = MODELADO.find((a) => a.id === imp.id)!;
      assert.equal(j.familia, "implante", imp.id);
      assert.equal(imp.label, j.label, imp.id);
      assert.equal(imp.sabotaje, j.sabotaje, imp.id);
      assert.equal(imp.electronico, j.electronico, imp.id);
      assert.deepEqual(
        imp.niveles.map((n) => [n.nivel, n.rareza, n.coste, n.variantes?.map((v) => v.id) ?? null]),
        j.niveles!.map((n) => [n.nivel, n.rareza, n.coste, n.variantes?.map((v) => v.id) ?? null]),
        imp.id,
      );
    }
  });
});

describe("integridad del catálogo de aumentos", () => {
  test("los requisitos apuntan a operaciones del catálogo", () => {
    for (const op of OPERACIONES_GENETICAS) {
      for (const id of op.requisitos) assert.equal(equipoPorId(id)?.familia, "operacionGenetica", `${op.id} → ${id}`);
    }
  });

  test("las rarezas son las del equipo y los niveles van de 1 a N", () => {
    for (const op of OPERACIONES_GENETICAS) assert.ok(RAREZA_ORDEN.includes(op.rareza), op.id);
    for (const imp of IMPLANTES) {
      assert.deepEqual(
        imp.niveles.map((n) => n.nivel),
        imp.niveles.map((_, i) => i + 1),
        imp.id,
      );
      for (const n of imp.niveles) assert.ok(RAREZA_ORDEN.includes(n.rareza), `${imp.id} ${n.nivel}`);
    }
  });

  test("A1: los modificadores de las operaciones son los +1 y la vida del modelado", () => {
    for (const op of OPERACIONES_GENETICAS) {
      const j = MODELADO.find((a) => a.id === op.id)!;
      const esperados = (j.efectos ?? []).flatMap((e) =>
        e.tipo === "atributo"
          ? [{ tipo: "atributo", id: e.id, valor: e.valor }]
          : e.tipo === "formula_salud"
            ? [{ tipo: "multiplicadorVida", valor: e.multiplicaFortaleza }]
            : [],
      );
      assert.deepEqual(op.modificadores, esperados, op.id);
      const coste = (j.efectos ?? []).find((e) => e.tipo === "coste_habilidad");
      assert.deepEqual(
        op.rebajaCosteHabilidad ?? null,
        coste ? { habilidades: coste.habilidades, valor: coste.valor } : null,
        op.id,
      );
    }
  });

  test("A1: ningún implante trae modificadores permanentes (los activables llegan en A5)", () => {
    for (const imp of IMPLANTES) for (const n of imp.niveles) assert.deepEqual(n.modificadores, [], `${imp.id} ${n.nivel}`);
  });

  test("A1: solo lo construido en A1 (atributo, coste de habilidad, vida) o lo narrativo está marcado como construido", () => {
    for (const op of OPERACIONES_GENETICAS) {
      const construidos = op.motor.filter((m) => m.estado === "construido" && m.tipo !== "narrativo");
      const esperados =
        (op.modificadores.some((m) => m.tipo === "atributo") ? 1 : 0) +
        (op.rebajaCosteHabilidad ? 1 : 0) +
        (op.modificadores.some((m) => m.tipo === "multiplicadorVida") ? 1 : 0);
      assert.equal(construidos.length, esperados, op.id);
    }
    for (const m of IMPLANTES.flatMap((imp) => imp.niveles.flatMap((n) => n.motor ?? []))) {
      if (m.estado === "construido") assert.equal(m.tipo, "narrativo", JSON.stringify(m));
    }
  });
});
