// aportesDeTirada (docs/aportes/plan.md, fase 2): de qué ítem viene cada cosa que la ficha pone en
// una tirada, leído del `origen` que dejó quien la generó.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ACCIONES, type Accion } from "./acciones";
import { aportesDeTirada } from "./aportes";
import { accionesDeAtaque } from "./combate";
import { equipar } from "./equipo";
import { conExtrasDeFicha, resolverFicha, VITALIDAD_DE_FICHA, type FichaResuelta } from "./fichaResuelta";
import { eleccionSinTocar, montarTirada } from "./montaje";
import { defaultSheet, type Sheet } from "./sheet";

// Arköru (−1 a distancia, texto en el desarmado), fusil con Lanzagranadas y Mira, Puñetazo, Gran
// Puntería, Ojo Clínico y Reflejos Felinos. Vida 3: herido (umbral §7, un estado derivado).
function ficha(): FichaResuelta {
  let s: Sheet = {
    ...defaultSheet(),
    especieId: "arkoru",
    vidaActual: 3,
    dotes: [{ id: "dote_gran_punteria" }, { id: "dote_ojo_clinico" }, { id: "dote_reflejos_felinos" }],
  };
  s = equipar(s, { instanciaId: "fa", catalogoId: "fusil_asalto_impetus" });
  s = equipar(s, { instanciaId: "lg", catalogoId: "lanzagranadas_integrado", nivel: 1, instaladoEnId: "fa" });
  s = equipar(s, { instanciaId: "mt", catalogoId: "mira_telescopica", nivel: 1, instaladoEnId: "fa" });
  s = equipar(s, { instanciaId: "pu", catalogoId: "pelea_punetazo" });
  return resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA, libre: true });
}

const F = ficha();
const tirada = (id: string): Accion => {
  const t = [...accionesDeAtaque(F.ficha, F.modificadores, F.extrasDotes.permisos), ...ACCIONES].find((x) => x.id === id)!;
  return conExtrasDeFicha(F, t);
};
const aportes = (id: string) => {
  const t = tirada(id);
  return aportesDeTirada(F, t, montarTirada(F, t, eleccionSinTocar(t)));
};

describe("aportesDeTirada", () => {
  test("disparo: especie, mejoras de ESTA arma con su instancia y Gran Puntería en «Apuntado»", () => {
    assert.deepEqual(aportes("ataque_fuego_fa"), [
      { tipo: "ajuste", origen: { tipo: "especie", id: "percepcion_sensorial", label: "Percepción sensorial" }, etiqueta: "Arköru" },
      {
        tipo: "ajuste",
        origen: { tipo: "equipo", id: "mira_telescopica", label: "Mira Telescópica", instanciaId: "mt" },
        etiqueta: "Mira Telescópica",
      },
      { tipo: "resolucion", origen: { tipo: "dote", id: "dote_gran_punteria", label: "Gran Puntería" }, etiqueta: "Apuntado (Gran Puntería)" },
      {
        tipo: "ajuste",
        origen: { tipo: "equipo", id: "lanzagranadas_integrado", label: "Lanzagranadas Integrado", instanciaId: "lg" },
        etiqueta: "Lanzagranadas Integrado",
      },
    ]);
  });

  test("la acción lleva el ítem que la crea: lo del propio fusil no es un aporte de otro ítem", () => {
    assert.deepEqual(tirada("ataque_fuego_fa").origen, {
      tipo: "equipo",
      id: "fusil_asalto_impetus",
      label: "Impetus",
      instanciaId: "fa",
    });
    assert.ok(aportes("ataque_fuego_fa").every((a) => a.origen.instanciaId !== "fa"));
  });

  test("una casilla con varios aportes da uno por tipo, con el mismo ítem (Ojo Clínico: ventaja y fatiga)", () => {
    assert.deepEqual(
      aportes("medicina").map((a) => [a.tipo, a.origen.id]),
      [
        ["resolucion", "dote_ojo_clinico"],
        ["coste", "dote_ojo_clinico"],
      ],
    );
  });

  test("descuento en un contador: el ítem que lo da (Reflejos Felinos en la esquiva)", () => {
    assert.deepEqual(aportes("defensa"), [
      { tipo: "ajuste", origen: { tipo: "dote", id: "dote_reflejos_felinos", label: "Reflejos Felinos" }, etiqueta: "Reflejos Felinos" },
    ]);
  });

  test("los textos de ítem llegan con su origen, no pegados con «(fuente)»", () => {
    const t = tirada("ataque_melee_pu");
    assert.deepEqual(t.textosDeFicha?.map((x) => x.origen), [{ tipo: "especie", id: "matriz_biometalica", label: "Matriz Biometálica" }]);
    assert.deepEqual(aportes("ataque_melee_pu"), [
      { tipo: "texto", origen: { tipo: "especie", id: "matriz_biometalica", label: "Matriz Biometálica" }, etiqueta: "Daño letal." },
    ]);
  });

  test("lo general no entra: el umbral de heridas (alcance todas, estado derivado)", () => {
    assert.ok(F.modificadores.some((m) => m.tipo === "tirada" && m.alcance.tipo === "todas"));
    assert.ok([...aportes("medicina"), ...aportes("defensa")].every((a) => a.origen.tipo !== "estado"));
  });

  test("sin nada de la ficha, ningún aporte", () => {
    const vacia = resolverFicha(defaultSheet(), { estados: [], vitalidad: VITALIDAD_DE_FICHA });
    const t = conExtrasDeFicha(vacia, ACCIONES.find((a) => a.id === "medicina")!);
    assert.deepEqual(aportesDeTirada(vacia, t, montarTirada(vacia, t, eleccionSinTocar(t))), []);
  });
});
