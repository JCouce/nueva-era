// Tirada libre (T-007): aplicado + habilidad elegidos en el modal, con lo que casa por
// aplicado/habilidad (alcances todas, aplicado, habilidad) y sin especialidad.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { etiquetaTiradaLibre, tiradaLibre } from "./acciones";
import { aplicado } from "./derivados";
import { montarTirada, SIN_ELECCION, type FichaParaTirada } from "./montaje";
import { conExtrasDeFicha, resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";
import { defaultSheet, type Sheet } from "./sheet";
import type { AlcanceModificador, ModificadorConFuente } from "./modificadores";

const sheet = (): Sheet => {
  const s = defaultSheet();
  return {
    ...s,
    atributos: { fuerza: 2, agilidad: 1, aguante: 1, percepcion: 2, inteligencia: 1, caracter: 3 },
    habilidades: {
      ...s.habilidades,
      sigilo: { ...s.habilidades.sigilo, valor: 3 },
      biociencia: { valor: 4, especialidades: ["medicina"] },
    },
  };
};

const tirada = (alcance: AlcanceModificador, valor: number, fuente: string): ModificadorConFuente => ({
  tipo: "tirada",
  alcance,
  valor,
  origen: "estado",
  fuente,
});

const ficha = (mods: ModificadorConFuente[] = []): FichaParaTirada => ({ ficha: sheet(), modificadores: mods });

const montar = (f: FichaParaTirada, ...par: Parameters<typeof tiradaLibre>) => montarTirada(f, tiradaLibre(...par), SIN_ELECCION);
const fuentes = (m: ReturnType<typeof montar>) => m.desglose.map((l) => l.etiqueta);

describe("tirada libre", () => {
  test("con Ninguna y sin modificadores, solo el aplicado", () => {
    const m = montar(ficha());
    assert.equal(m.aplicado.id, "perspicacia");
    assert.equal(m.habilidad, null);
    assert.equal(m.total, aplicado(sheet(), "perspicacia", []));
    assert.equal(m.desglose.length, 1);
  });

  test("con habilidad, aplicado + habilidad entera (sin mitad por especialidad)", () => {
    const s = sheet();
    assert.equal(montar(ficha(), "reflejos", "sigilo").total, aplicado(s, "reflejos", []) + 3);
    const bio = montar(ficha(), "perspicacia", "biociencia");
    assert.equal(bio.total, aplicado(s, "perspicacia", []) + 4);
    assert.equal(bio.enEspecialidad, false);
    assert.deepEqual(fuentes(bio), ["Perspicacia", "Biociencia"]);
  });

  test("un penalizador a todas entra", () => {
    const base = montar(ficha()).total;
    assert.equal(montar(ficha([tirada({ tipo: "todas" }, -1, "Herido")])).total, base - 1);
  });

  test("uno por aplicado entra solo con ese aplicado", () => {
    const mods = [tirada({ tipo: "aplicado", aplicados: ["voluntad"] }, -2, "Miedo")];
    assert.equal(montar(ficha(mods), "voluntad").total, montar(ficha(), "voluntad").total - 2);
    assert.equal(montar(ficha(mods), "perspicacia").total, montar(ficha(), "perspicacia").total);
  });

  test("uno por habilidad entra solo con esa habilidad", () => {
    const mods = [tirada({ tipo: "habilidad", habilidad: "sigilo" }, 1, "Capa")];
    assert.equal(montar(ficha(mods), "reflejos", "sigilo").total, montar(ficha(), "reflejos", "sigilo").total + 1);
    assert.equal(montar(ficha(mods), "reflejos", null).total, montar(ficha(), "reflejos", null).total);
  });

  test("nada por grupo, grupo y habilidad, id de otra acción ni familia de arma", () => {
    const mods = [
      tirada({ tipo: "grupo", grupo: "Defensa" }, -2, "Aturdido"),
      tirada({ tipo: "grupo", grupo: "Acciones" }, -3, "Grupo Acciones"),
      tirada({ tipo: "tiradaId", id: "sigilo" }, -4, "Sigilo fijo"),
      tirada({ tipo: "grupoHabilidad", grupo: "Acciones", habilidad: "sigilo" }, -5, "Acciones con Sigilo"),
      tirada({ tipo: "familiaArma", familia: "ataque_melee" }, -6, "Melee"),
    ];
    for (const hab of ["sigilo", null] as const) {
      const m = montar(ficha(mods), "reflejos", hab);
      assert.equal(m.total, montar(ficha(), "reflejos", hab).total);
      assert.deepEqual(fuentes(m), hab ? ["Reflejos", "Sigilo"] : ["Reflejos"]);
    }
  });

  test("anulaPenalizadores con alcance todas deja a 0 el de todas", () => {
    const base = montar(ficha()).total;
    const mods: ModificadorConFuente[] = [
      tirada({ tipo: "todas" }, -1, "Herido"),
      { tipo: "anulaPenalizadores", alcance: { tipo: "todas" }, valor: 0, origen: "aumento", fuente: "Proyección" },
    ];
    assert.equal(montar(ficha(mods)).total, base);
  });

  test("la ficha no le añade casillas, textos ni extras", () => {
    const t = tiradaLibre("reflejos", "sigilo");
    const f = resolverFicha(sheet(), { estados: [], vitalidad: VITALIDAD_DE_FICHA });
    assert.equal(conExtrasDeFicha(f, t), t);
  });

  test("etiqueta para Acciones recientes", () => {
    assert.equal(etiquetaTiradaLibre("perspicacia", "sigilo"), "Tirada libre (Perspicacia + Sigilo)");
    assert.equal(etiquetaTiradaLibre("perspicacia", null), "Tirada libre (Perspicacia)");
  });
});
