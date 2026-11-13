import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { EQUIPO } from "./equipo";
import { MUNICION_ESPECIAL } from "./municion";
import { ARMAS_MODIFICADAS } from "./armasModificadas";
import { estadoPorId } from "./estados";
import type { EfectoArma } from "../rules/efectosArma";

// Los efectos de arma (T3a) son dato escrito a mano al lado de su texto de la fuente: un id de
// estado mal escrito, un modo que no existe o un número que no casa con la prosa se cuelan
// fácil. Esto no prueba que la lectura sea buena (eso es la auditoría), sí que es coherente.
type ConEfectos = { id: string; texto: string; efectos: EfectoArma[]; modos: string[] };

const piezas: ConEfectos[] = [
  ...EQUIPO.flatMap((e): ConEfectos[] => {
    if (e.familia === "arma")
      return [{ id: e.id, texto: e.especial ?? "", efectos: e.efectosObjetivo ?? [], modos: e.modos.map((m) => m.etiqueta) }];
    if (e.familia === "armaMelee")
      return [
        {
          id: e.id,
          texto: [e.efectos, e.efectoCritico].join(" · "),
          efectos: e.efectosObjetivo ?? [],
          modos: e.modos.map((m) => m.etiqueta),
        },
      ];
    return [];
  }),
  ...MUNICION_ESPECIAL.map((m) => ({ id: m.id, texto: m.efecto, efectos: m.efectosObjetivo, modos: [] })),
  ...ARMAS_MODIFICADAS.flatMap((mod) =>
    mod.tramos.map((t, i) => ({ id: `${mod.id}#${i}`, texto: [t.efecto, t.efectoCritico].join(" · "), efectos: t.efectosObjetivo, modos: [] })),
  ),
];

describe("efectos de arma del catálogo (T3a)", () => {
  test("cada estado nombrado existe; los que se salvan dicen con qué (eq-07)", () => {
    for (const p of piezas)
      for (const e of p.efectos) {
        if (e.tipo === "texto") continue;
        const id = e.tipo === "ajusteSalvacion" ? e.contra : e.estadoId;
        assert.ok(id, `${p.id}: efecto sin estado`);
        const estado = estadoPorId(id);
        assert.ok(estado, `${p.id}: estado ${id} no existe`);
        if (e.tipo === "salvacion") assert.ok(estado.salvacion, `${p.id}: ${id} no dice su salvación`);
      }
  });

  test("las tablas propias apuntan a estados y grados que existen", () => {
    for (const p of piezas)
      for (const e of p.efectos) {
        if (e.tipo !== "salvacion" || !e.tabla) continue;
        for (const r of Object.values(e.tabla)) {
          if (!r?.estado) continue;
          const estado = estadoPorId(r.estado.estadoId);
          assert.ok(estado?.grados.some((g) => g.id === r.estado!.gradoId), `${p.id}: ${r.estado.estadoId}/${r.estado.gradoId}`);
        }
      }
  });

  test("un efecto por modo nombra un modo de la tabla del arma", () => {
    for (const p of piezas)
      for (const e of p.efectos)
        for (const m of e.soloEn?.modo ?? []) assert.ok(p.modos.includes(m), `${p.id}: no tiene el modo ${m}`);
  });

  test("cada dificultad sale en el texto de la fuente", () => {
    for (const p of piezas)
      for (const e of p.efectos) {
        if (e.tipo !== "salvacion") continue;
        // El Derribo de escopetas y ametralladoras es regla de familia: no va en `especial`.
        if (e.soloEn?.tramo) continue;
        assert.match(p.texto, new RegExp(`\\(${e.dificultad}\\)`), `${p.id}: ${e.estadoId} ${e.dificultad}`);
      }
  });

  test("toda pieza con «Efecto», «Crítico», Hemorragia o Derribo en su texto los declara", () => {
    for (const p of piezas) {
      if (!/Efecto (?!.*Esquiva)|Crítico|Hemorragia|Derribo|Aturdimiento|Shock|Llamarada|Congelación|Corrosión|Envenenamiento|toxina/.test(p.texto)) continue;
      assert.ok(p.efectos.length > 0, `${p.id}: «${p.texto}» sin efectosObjetivo`);
    }
  });

  test("Plasma SG y Plasma AAA no derriban: manda la fila (eq-12)", () => {
    for (const id of ["escopeta_plasma_sc", "ametralladora_plasma_aaa"]) {
      const p = piezas.find((x) => x.id === id)!;
      assert.ok(!p.efectos.some((e) => e.tipo === "salvacion" && e.estadoId === "derribado"), id);
    }
  });

  test("el resto de escopetas y ametralladoras derriban en corta y a bocajarro", () => {
    const familia = EQUIPO.filter(
      (e) => e.familia === "arma" && (e.tipo === "escopeta" || e.tipo === "ametralladora") && !["escopeta_plasma_sc", "ametralladora_plasma_aaa"].includes(e.id),
    );
    assert.ok(familia.length > 0);
    for (const a of familia) {
      if (a.familia !== "arma") continue;
      const derribo = a.efectosObjetivo?.find((e) => e.tipo === "salvacion" && e.estadoId === "derribado");
      assert.deepEqual(derribo?.soloEn?.tramo, ["corta", "bocajarro"], a.id);
    }
  });
});
