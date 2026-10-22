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
};
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

  test("A0: ningún aumento aplica modificadores todavía", () => {
    for (const op of OPERACIONES_GENETICAS) assert.deepEqual(op.modificadores, [], op.id);
    for (const imp of IMPLANTES) for (const n of imp.niveles) assert.deepEqual(n.modificadores, [], `${imp.id} ${n.nivel}`);
  });

  test("A0: nada que dé números está marcado como construido", () => {
    const motores = [
      ...OPERACIONES_GENETICAS.flatMap((op) => op.motor),
      ...IMPLANTES.flatMap((imp) => imp.niveles.flatMap((n) => n.motor ?? [])),
    ];
    for (const m of motores) {
      if (m.estado === "construido") assert.equal(m.tipo, "narrativo", JSON.stringify(m));
    }
  });
});
