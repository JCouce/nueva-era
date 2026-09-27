import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet } from "./sheet";
import { equipar } from "./equipo";
import { blindajeContra, desgloseBlindaje, tieneEscudoMelee, TIPOS_DANIO } from "./blindaje";

describe("blindajeContra", () => {
  test("sin nada equipado, blindaje 0 contra cualquier tipo", () => {
    const s = defaultSheet();
    for (const { id } of TIPOS_DANIO) {
      assert.equal(blindajeContra(s, id, false), 0);
    }
  });

  test("armadura equipada aporta su blindaje", () => {
    const s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_ligera" }); // blindaje 4
    assert.equal(blindajeContra(s, "cinetico", false), 4);
  });

  test("Mental y Fuego se quedan en 0 aunque haya blindaje de sobra", () => {
    let s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_pesada" }); // blindaje 8
    s = equipar(s, { instanciaId: "d1", catalogoId: "escudo_deflector", nivel: 4, instaladoEnId: "arm1" });
    assert.equal(blindajeContra(s, "mental", false), 0);
    assert.equal(blindajeContra(s, "fuego", false), 0);
  });

  test("Tóxico cuenta como cualquier otro tipo (solo el estado de Enfermedad/Envenenamiento se escapa, no el daño)", () => {
    const s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_ligera" }); // blindaje 4
    assert.equal(blindajeContra(s, "toxico", false), 4);
  });

  test("Escudo Deflector suma su absorción a la de la armadura", () => {
    let s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_ligera" }); // 4
    s = equipar(s, { instanciaId: "d1", catalogoId: "escudo_deflector", nivel: 2, instaladoEnId: "arm1" }); // +2
    assert.equal(blindajeContra(s, "electrico", false), 6);
  });

  test("Escudo Deflector: el nivel es un total, no se acumula con los anteriores (S9)", () => {
    let s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_ligera" }); // 4
    s = equipar(s, { instanciaId: "d1", catalogoId: "escudo_deflector", nivel: 3, instaladoEnId: "arm1" }); // 3, no 1+2+3
    assert.equal(blindajeContra(s, "sonico", false), 7);
  });

  test("un escudo melee solo suma su blindaje si está en alto", () => {
    const s = equipar(defaultSheet(), { instanciaId: "e1", catalogoId: "escudo_rodela" }); // blindaje 4
    assert.equal(blindajeContra(s, "cinetico", false), 0);
    assert.equal(blindajeContra(s, "cinetico", true), 4);
  });

  test("Tejido Conductor nivel 2 suma +1 SOLO contra Eléctrico", () => {
    let s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_ligera" }); // 4
    s = equipar(s, { instanciaId: "tc1", catalogoId: "tejido_conductor", nivel: 2, instaladoEnId: "arm1" });
    assert.equal(blindajeContra(s, "electrico", false), 5);
    assert.equal(blindajeContra(s, "cinetico", false), 4);
  });

  test("Tejido Conductor nivel 1 no aporta el bono (hace falta nivel 2)", () => {
    let s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_ligera" }); // 4
    s = equipar(s, { instanciaId: "tc1", catalogoId: "tejido_conductor", nivel: 1, instaladoEnId: "arm1" });
    assert.equal(blindajeContra(s, "electrico", false), 4);
  });

  test("todas las fuentes se combinan a la vez", () => {
    let s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_ligera" }); // 4
    s = equipar(s, { instanciaId: "d1", catalogoId: "escudo_deflector", nivel: 1, instaladoEnId: "arm1" }); // +1
    s = equipar(s, { instanciaId: "e1", catalogoId: "escudo_rodela" }); // +4 si está en alto
    assert.equal(blindajeContra(s, "corrosivo", false), 5);
    assert.equal(blindajeContra(s, "corrosivo", true), 9);
  });
});

describe("desgloseBlindaje", () => {
  test("Mental devuelve una única línea explicativa a 0", () => {
    const s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_pesada" });
    assert.deepEqual(desgloseBlindaje(s, "mental", false), [{ etiqueta: "Mental omite blindaje", valor: 0 }]);
  });

  test("Fuego devuelve una única línea explicativa a 0", () => {
    const s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_pesada" });
    assert.deepEqual(desgloseBlindaje(s, "fuego", false), [
      { etiqueta: "Fuego (falta Mejora Ignífuga)", valor: 0 },
    ]);
  });

  test("sin nada equipado, lista vacía", () => {
    assert.deepEqual(desgloseBlindaje(defaultSheet(), "cinetico", false), []);
  });

  test("cada fuente aparece como su propia línea, y suman igual que blindajeContra", () => {
    let s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_ligera" });
    s = equipar(s, { instanciaId: "d1", catalogoId: "escudo_deflector", nivel: 2, instaladoEnId: "arm1" });
    s = equipar(s, { instanciaId: "tc1", catalogoId: "tejido_conductor", nivel: 2, instaladoEnId: "arm1" });
    s = equipar(s, { instanciaId: "e1", catalogoId: "escudo_rodela" });

    const desglose = desgloseBlindaje(s, "electrico", true);
    assert.deepEqual(desglose, [
      { etiqueta: "Armadura Ligera", valor: 4 },
      { etiqueta: "Escudo Deflector", valor: 2 },
      { etiqueta: "Tejido Conductor", valor: 1 },
      { etiqueta: "Rodela (en alto)", valor: 4 },
    ]);
    const total = desglose.reduce((t, l) => t + l.valor, 0);
    assert.equal(total, blindajeContra(s, "electrico", true));
  });
});

describe("tieneEscudoMelee", () => {
  test("false sin ningún escudo equipado", () => {
    assert.equal(tieneEscudoMelee(defaultSheet()), false);
  });

  test("true con un escudo equipado", () => {
    const s = equipar(defaultSheet(), { instanciaId: "e1", catalogoId: "escudo_rodela" });
    assert.equal(tieneEscudoMelee(s), true);
  });

  test("un arma melee sin defensa no cuenta como escudo", () => {
    const s = equipar(defaultSheet(), { instanciaId: "m1", catalogoId: "espada_cuchillo_combate" });
    assert.equal(tieneEscudoMelee(s), false);
  });
});
