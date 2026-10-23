import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet } from "./sheet";
import { equipar } from "./equipo";
import { ajustarRecurso } from "./recursos";
import { blindajeContra, desgloseBlindaje, golpeAlEscudo, SIN_ARMADURA_NATURAL, tieneEscudoMelee, TIPOS_DANIO } from "./blindaje";

describe("blindajeContra", () => {
  test("sin nada equipado, blindaje 0 contra cualquier tipo", () => {
    const s = defaultSheet();
    for (const { id } of TIPOS_DANIO) {
      assert.equal(blindajeContra(s, id, SIN_ARMADURA_NATURAL), 0);
    }
  });

  test("armadura equipada aporta su blindaje", () => {
    const s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_ligera" }); // blindaje 4
    assert.equal(blindajeContra(s, "cinetico", SIN_ARMADURA_NATURAL), 4);
  });

  test("Mental y Fuego se quedan en 0 aunque haya blindaje de sobra", () => {
    let s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_pesada" }); // blindaje 8
    s = equipar(s, { instanciaId: "d1", catalogoId: "escudo_deflector", nivel: 4, instaladoEnId: "arm1" });
    assert.equal(blindajeContra(s, "mental", SIN_ARMADURA_NATURAL), 0);
    assert.equal(blindajeContra(s, "fuego", SIN_ARMADURA_NATURAL), 0);
  });

  test("Tóxico cuenta como cualquier otro tipo (solo el estado de Enfermedad/Envenenamiento se escapa, no el daño)", () => {
    const s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_ligera" }); // blindaje 4
    assert.equal(blindajeContra(s, "toxico", SIN_ARMADURA_NATURAL), 4);
  });

  test("Escudo Deflector suma su absorción a la de la armadura", () => {
    let s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_ligera" }); // 4
    s = equipar(s, { instanciaId: "d1", catalogoId: "escudo_deflector", nivel: 2, instaladoEnId: "arm1" }); // +2
    assert.equal(blindajeContra(s, "electrico", SIN_ARMADURA_NATURAL), 6);
  });

  test("Escudo Deflector: el nivel es un total, no se acumula con los anteriores (S9)", () => {
    let s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_ligera" }); // 4
    s = equipar(s, { instanciaId: "d1", catalogoId: "escudo_deflector", nivel: 3, instaladoEnId: "arm1" }); // 3, no 1+2+3
    assert.equal(blindajeContra(s, "sonico", SIN_ARMADURA_NATURAL), 7);
  });

  test("un escudo melee no suma su blindaje al portador, aunque lo lleve (Murillo, 2026-10-23)", () => {
    const s = equipar(defaultSheet(), { instanciaId: "e1", catalogoId: "escudo_rodela" }); // blindaje 4
    assert.equal(blindajeContra(s, "cinetico", SIN_ARMADURA_NATURAL), 0);
    assert.deepEqual(desgloseBlindaje(s, "cinetico", SIN_ARMADURA_NATURAL), []);
  });

  test("Tejido Conductor nivel 2 suma +1 SOLO contra Eléctrico", () => {
    let s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_ligera" }); // 4
    s = equipar(s, { instanciaId: "tc1", catalogoId: "tejido_conductor", nivel: 2, instaladoEnId: "arm1" });
    assert.equal(blindajeContra(s, "electrico", SIN_ARMADURA_NATURAL), 5);
    assert.equal(blindajeContra(s, "cinetico", SIN_ARMADURA_NATURAL), 4);
  });

  test("Tejido Conductor nivel 1 no aporta el bono (hace falta nivel 2)", () => {
    let s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_ligera" }); // 4
    s = equipar(s, { instanciaId: "tc1", catalogoId: "tejido_conductor", nivel: 1, instaladoEnId: "arm1" });
    assert.equal(blindajeContra(s, "electrico", SIN_ARMADURA_NATURAL), 4);
  });

  test("todas las fuentes se combinan a la vez", () => {
    let s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_ligera" }); // 4
    s = equipar(s, { instanciaId: "d1", catalogoId: "escudo_deflector", nivel: 1, instaladoEnId: "arm1" }); // +1
    s = equipar(s, { instanciaId: "e1", catalogoId: "escudo_rodela" }); // no suma al portador
    assert.equal(blindajeContra(s, "corrosivo", SIN_ARMADURA_NATURAL), 5);
  });
});

describe("desgloseBlindaje", () => {
  test("Mental devuelve una única línea explicativa a 0", () => {
    const s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_pesada" });
    assert.deepEqual(desgloseBlindaje(s, "mental", SIN_ARMADURA_NATURAL), [{ etiqueta: "Mental omite blindaje", valor: 0 }]);
  });

  test("Fuego devuelve una única línea explicativa a 0", () => {
    const s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_pesada" });
    assert.deepEqual(desgloseBlindaje(s, "fuego", SIN_ARMADURA_NATURAL), [
      { etiqueta: "Fuego (falta Mejora Ignífuga)", valor: 0 },
    ]);
  });

  test("sin nada equipado, lista vacía", () => {
    assert.deepEqual(desgloseBlindaje(defaultSheet(), "cinetico", SIN_ARMADURA_NATURAL), []);
  });

  test("cada fuente aparece como su propia línea, y suman igual que blindajeContra", () => {
    let s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_ligera" });
    s = equipar(s, { instanciaId: "d1", catalogoId: "escudo_deflector", nivel: 2, instaladoEnId: "arm1" });
    s = equipar(s, { instanciaId: "tc1", catalogoId: "tejido_conductor", nivel: 2, instaladoEnId: "arm1" });
    s = equipar(s, { instanciaId: "e1", catalogoId: "escudo_rodela" });

    const desglose = desgloseBlindaje(s, "electrico", SIN_ARMADURA_NATURAL);
    assert.deepEqual(desglose, [
      { etiqueta: "Armadura Ligera", valor: 4 },
      { etiqueta: "Escudo Deflector", valor: 2 },
      { etiqueta: "Tejido Conductor", valor: 1 },
    ]);
    const total = desglose.reduce((t, l) => t + l.valor, 0);
    assert.equal(total, blindajeContra(s, "electrico", SIN_ARMADURA_NATURAL));
  });
});

describe("Mejora Ignífuga nivel 1 (S85)", () => {
  const conIgnifuga = () => {
    let s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_pesada" }); // blindaje 8
    s = equipar(s, { instanciaId: "ig1", catalogoId: "mejora_ignifuga", nivel: 1, instaladoEnId: "arm1" });
    return s;
  };

  test("instalada en la armadura, contra Fuego cuenta su blindaje", () => {
    const s = conIgnifuga();
    assert.deepEqual(desgloseBlindaje(s, "fuego", SIN_ARMADURA_NATURAL), [
      { etiqueta: "Armadura Pesada · Mejora Ignífuga", valor: 8 },
    ]);
    assert.equal(blindajeContra(s, "fuego", SIN_ARMADURA_NATURAL), 8);
  });

  test("instalada en otra armadura que no es la que cuenta, Fuego sigue a 0", () => {
    let s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_pesada" });
    s = equipar(s, { instanciaId: "arm2", catalogoId: "armadura_ligera" });
    s = equipar(s, { instanciaId: "ig1", catalogoId: "mejora_ignifuga", nivel: 1, instaladoEnId: "arm2" });
    assert.equal(blindajeContra(s, "fuego", SIN_ARMADURA_NATURAL), 0);
  });

  test("sin Ignífuga, Fuego sigue a 0", () => {
    const s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_pesada" });
    assert.equal(blindajeContra(s, "fuego", SIN_ARMADURA_NATURAL), 0);
  });

  test("contra Fuego solo suma la armadura: ni natural, ni deflector, ni escudo", () => {
    let s = conIgnifuga();
    s = equipar(s, { instanciaId: "d1", catalogoId: "escudo_deflector", nivel: 2, instaladoEnId: "arm1" });
    s = equipar(s, { instanciaId: "e1", catalogoId: "escudo_rodela" });
    const natural = { valor: 1, fuente: "Arköru" };
    assert.deepEqual(desgloseBlindaje(s, "fuego", natural, true, true), [
      { etiqueta: "Armadura Pesada · Mejora Ignífuga", valor: 8 },
    ]);
    assert.equal(blindajeContra(s, "fuego", natural), 8);
  });

  test("contra Cinético no cambia nada", () => {
    const s = conIgnifuga();
    assert.deepEqual(desgloseBlindaje(s, "cinetico", SIN_ARMADURA_NATURAL), [
      { etiqueta: "Armadura Pesada", valor: 8 },
    ]);
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

describe("golpeAlEscudo (Murillo, 2026-10-23; S86)", () => {
  // Rodela: blindaje 4, durabilidad 8.
  const conRodela = () => equipar(defaultSheet(), { instanciaId: "e1", catalogoId: "escudo_rodela" });

  test("sin escudo, null", () => {
    assert.equal(golpeAlEscudo(defaultSheet(), "cinetico", 10), null);
  });

  test("el escudo resta su blindaje y el resto pasa a su durabilidad", () => {
    assert.deepEqual(golpeAlEscudo(conRodela(), "cinetico", 7), {
      instanciaId: "e1",
      etiqueta: "Rodela",
      blindaje: { etiqueta: "Rodela", valor: 4 },
      aDurabilidad: 3,
      durabilidadActual: 8,
      durabilidadMax: 8,
      durabilidadResultante: 5,
      seRompe: false,
      bloqueada: null,
    });
  });

  test("daño por debajo del blindaje: no pasa nada a la durabilidad", () => {
    const g = golpeAlEscudo(conRodela(), "cinetico", 3)!;
    assert.equal(g.aDurabilidad, 0);
    assert.equal(g.durabilidadResultante, 8);
    assert.equal(g.seRompe, false);
  });

  test("se rompe justo en 0", () => {
    const g = golpeAlEscudo(conRodela(), "cinetico", 12)!; // 12 − 4 = 8
    assert.equal(g.aDurabilidad, 8);
    assert.equal(g.durabilidadResultante, 0);
    assert.equal(g.seRompe, true);
  });

  test("se rompe con sobrante, y la durabilidad no baja de 0", () => {
    const g = golpeAlEscudo(conRodela(), "cinetico", 20)!; // 16 a durabilidad, quedan 8
    assert.equal(g.aDurabilidad, 16);
    assert.equal(g.durabilidadResultante, 0);
    assert.equal(g.seRompe, true);
  });

  test("parte de la durabilidad actual, no de la máxima", () => {
    const s = ajustarRecurso(conRodela(), "e1", -5); // 3/8
    const g = golpeAlEscudo(s, "cinetico", 6)!; // 2 a durabilidad
    assert.equal(g.durabilidadActual, 3);
    assert.equal(g.durabilidadResultante, 1);
    assert.equal(g.seRompe, false);
  });

  test("contra Fuego el blindaje del escudo vale 0: todo va a la durabilidad", () => {
    const g = golpeAlEscudo(conRodela(), "fuego", 5)!;
    assert.equal(g.blindaje.valor, 0);
    assert.equal(g.aDurabilidad, 5);
    assert.equal(g.durabilidadResultante, 3);
    assert.equal(g.bloqueada, null);
  });

  test("contra Mental no aplica: bloqueada con su motivo", () => {
    assert.match(golpeAlEscudo(conRodela(), "mental", 5)!.bloqueada ?? "", /Mental/);
  });

  test("con el escudo roto, bloqueada: «Escudo roto: repáralo»", () => {
    const s = ajustarRecurso(conRodela(), "e1", -8);
    const g = golpeAlEscudo(s, "cinetico", 5)!;
    assert.equal(g.bloqueada, "Escudo roto: repáralo");
    assert.equal(g.seRompe, false);
  });
});
