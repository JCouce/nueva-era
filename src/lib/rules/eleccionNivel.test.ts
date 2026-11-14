import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { equipar } from "./equipo";
import { eleccionDePieza, eleccionNivelEntradaSchema, fijarEleccionDeNivel } from "./eleccionNivel";
import { accionesDeMovimiento, conEsquivaEnVuelo } from "./movimiento";
import { vuelo } from "./derivados";
import { ACCIONES } from "./acciones";
import { resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";

// eq-36: Movilidad Aérea 3, Progresión Velocidad o Maniobrabilidad (docs/fuente/equipamiento.md).
function conVuelo(nivel: number, eleccion?: string): Sheet {
  let s = equipar(defaultSheet(), { instanciaId: "arm", catalogoId: "armadura_pesada" }); // tope 4
  s = equipar(s, { instanciaId: "ma", catalogoId: "movilidad_aerea", nivel, instaladoEnId: "arm" });
  if (eleccion === undefined) return s;
  const r = fijarEleccionDeNivel(s, "ma", eleccion);
  assert.ok(r.ok);
  return r.sheet;
}
const volar = (s: Sheet) => accionesDeMovimiento(s)[0];
const pieza = (s: Sheet) => s.equipo.find((p) => p.instanciaId === "ma")!;
const esquivaEnVuelo = (s: Sheet) => conEsquivaEnVuelo(s, ACCIONES.find((a) => a.id === "defensa")!).habilidadAlternativa?.ajuste?.valor;

describe("eq-36: la Progresión de Movilidad Aérea 3", () => {
  test("solo desde el nivel 3: los niveles 1 y 2 no tienen nada que elegir", () => {
    assert.equal(eleccionDePieza(pieza(conVuelo(2))), null);
    const e = eleccionDePieza(pieza(conVuelo(3)));
    assert.deepEqual(e?.opciones.map((o) => o.id), ["velocidad", "maniobrabilidad"]);
    assert.equal(e?.elegida, null);
    // El 4 la hereda (S9).
    assert.ok(eleccionDePieza(pieza(conVuelo(4))));
  });

  test("sin elegir: los valores base de la tabla y el aviso, en la pieza y en Volar", () => {
    for (const [nivel, metros, critico, maniobra] of [[3, 100, 50, -3], [4, 140, 70, -4]] as const) {
      const s = conVuelo(nivel);
      assert.match(eleccionDePieza(pieza(s))?.aviso ?? "", /Progresión de Propulsión Aérea sin elegir .*Velocidad o Maniobrabilidad/);
      assert.deepEqual(volar(s).vuelo, { velocidadBase: metros, bonusCritico: critico });
      assert.equal(volar(s).ajustesFijos?.[0].valor, maniobra);
      assert.match(volar(s).nota ?? "", /sin elegir/);
      assert.equal(vuelo(s)?.velocidadM, metros);
    }
  });

  test("Velocidad: +20 m y crítico de Máxima Potencia a 60 m (nivel 4: 160 m y 80 m)", () => {
    for (const [nivel, metros, critico, maniobra] of [[3, 120, 60, -3], [4, 160, 80, -4]] as const) {
      const s = conVuelo(nivel, "velocidad");
      assert.deepEqual(volar(s).vuelo, { velocidadBase: metros, bonusCritico: critico });
      assert.equal(volar(s).ajustesFijos?.[0].valor, maniobra);
      assert.doesNotMatch(volar(s).nota ?? "", /sin elegir/);
      assert.equal(vuelo(s)?.velocidadM, metros);
      assert.equal(resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA }).vuelo?.velocidadM, metros);
    }
  });

  test("Maniobrabilidad: 1 menos de dificultad de maniobra (−2 en el 3, −3 en el 4), en Volar y en la esquiva en vuelo", () => {
    for (const [nivel, metros, maniobra] of [[3, 100, -2], [4, 140, -3]] as const) {
      const s = conVuelo(nivel, "maniobrabilidad");
      assert.equal(volar(s).ajustesFijos?.[0].valor, maniobra);
      assert.equal(volar(s).vuelo?.velocidadBase, metros);
      assert.equal(esquivaEnVuelo(s), maniobra);
    }
  });

  test("fijarEleccionDeNivel valida la pieza y la opción; null la quita", () => {
    const s = conVuelo(3);
    assert.deepEqual(fijarEleccionDeNivel(s, "nada", "velocidad"), { ok: false, error: "No llevas esa pieza" });
    assert.equal(fijarEleccionDeNivel(s, "ma", "turbo").ok, false);
    assert.equal(fijarEleccionDeNivel(conVuelo(2), "ma", "velocidad").ok, false);
    const quitada = fijarEleccionDeNivel(conVuelo(3, "velocidad"), "ma", null);
    assert.ok(quitada.ok && pieza(quitada.sheet).eleccion === undefined);
    assert.equal(eleccionNivelEntradaSchema.safeParse({ instanciaId: "ma", eleccion: "" }).success, false);
    assert.equal(eleccionNivelEntradaSchema.safeParse({ instanciaId: "ma", eleccion: null }).success, true);
  });

  test("al equipar, una elección que no es de la pieza no se guarda", () => {
    let s = equipar(defaultSheet(), { instanciaId: "arm", catalogoId: "armadura_pesada" });
    s = equipar(s, { instanciaId: "ma", catalogoId: "movilidad_aerea", nivel: 2, instaladoEnId: "arm", eleccion: "velocidad" });
    assert.equal(pieza(s).eleccion, undefined);
    s = equipar(defaultSheet(), { instanciaId: "arm", catalogoId: "armadura_pesada" });
    s = equipar(s, { instanciaId: "ma", catalogoId: "movilidad_aerea", nivel: 3, instaladoEnId: "arm", eleccion: "velocidad" });
    assert.equal(pieza(s).eleccion, "velocidad");
  });
});
