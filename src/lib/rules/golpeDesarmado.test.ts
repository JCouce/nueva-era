import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { equipar } from "./equipo";
import { accionesDeAtaque } from "./combate";
import { modificadoresActivos } from "./derivados";
import { permisosDeDotes } from "./dotesEfectos";
import { criticoDesarmado, golpeDesarmadoConArmadura } from "./golpeDesarmado";

// R3/F1 (2026-10-24, docs/fuente/equipamiento.md): golpe desarmado con armadura y Refuerzo de Combate.
const base = (): Sheet =>
  equipar({ ...defaultSheet(), atributos: { ...defaultSheet().atributos, fuerza: 3 } }, { instanciaId: "pu", catalogoId: "pelea_punetazo" });
const con = (...piezas: Parameters<typeof equipar>[1][]) => piezas.reduce((s, p) => equipar(s, p), base());
const punetazo = (s: Sheet) =>
  accionesDeAtaque(s, modificadoresActivos(s), permisosDeDotes(s)).find((t) => t.label === "Golpear con Puñetazo")!;

describe("golpe desarmado con armadura", () => {
  test("Ligera e Intermedia +1, Pesada +2; el traje y las avanzadas, nada", () => {
    for (const [id, bono] of [["armadura_ligera", 1], ["armadura_intermedia", 1], ["armadura_pesada", 2]] as const) {
      assert.equal(golpeDesarmadoConArmadura(con({ instanciaId: "a", catalogoId: id }))?.bonoDanio, bono, id);
    }
    assert.equal(golpeDesarmadoConArmadura(con({ instanciaId: "a", catalogoId: "traje_ultra_ligero" })), null);
    assert.equal(golpeDesarmadoConArmadura(con({ instanciaId: "a", catalogoId: "armadura_pesada_avanzada" })), null);
  });

  test("Refuerzo de Combate: +1 más y letal (nivel 1), +2 más en total (nivel 2, no se suman)", () => {
    const n1 = golpeDesarmadoConArmadura(
      con({ instanciaId: "a", catalogoId: "armadura_pesada" }, { instanciaId: "r", catalogoId: "refuerzo_combate", nivel: 1, instaladoEnId: "a" }),
    )!;
    assert.equal(n1.bonoDanio, 3);
    assert.equal(n1.letal, "Refuerzo de Combate 1");
    assert.deepEqual(n1.aturdimiento, { dificultad: 7, fuente: "Refuerzo de Combate 1" });
    const n2 = golpeDesarmadoConArmadura(
      con({ instanciaId: "a", catalogoId: "traje_ultra_ligero" }, { instanciaId: "r", catalogoId: "refuerzo_combate", nivel: 2, instaladoEnId: "a" }),
    )!;
    assert.equal(n2.bonoDanio, 2);
    assert.equal(n2.aturdimiento?.dificultad, 8);
    assert.equal(n2.bloqueoSinPenalizador, "Refuerzo de Combate 2");
  });

  test("el Refuerzo solo cuenta instalado en la armadura que cuenta (la primera)", () => {
    const s = con(
      { instanciaId: "a", catalogoId: "traje_ultra_ligero" },
      { instanciaId: "b", catalogoId: "ropa_inteligente" },
      { instanciaId: "r", catalogoId: "refuerzo_combate", nivel: 1, instaladoEnId: "b" },
    );
    assert.equal(golpeDesarmadoConArmadura(s), null);
  });

  test("la fila del Puñetazo: daño, fórmula, categoría y crítico", () => {
    const sin = punetazo(base());
    assert.equal(sin.ataque?.modos[0].danio, 3);
    assert.equal(sin.ataque?.modos[0].categoriaDanio, "No Letal");
    const pesada = punetazo(con({ instanciaId: "a", catalogoId: "armadura_pesada" }));
    assert.equal(pesada.ataque?.modos[0].danio, 5); // Fue 3 + 2
    assert.equal(pesada.ataque?.modos[0].formulaDanio, "Fue+2");
    assert.equal(pesada.ataque?.modos[1].danio, 6); // Fuerza+1 + 2
    assert.equal(pesada.ataque?.modos[0].categoriaDanio, "No Letal");
    assert.match(pesada.nota ?? "", /Daño desarmado con la armadura: Armadura Pesada \+2/);
    const reforzada = punetazo(
      con({ instanciaId: "a", catalogoId: "armadura_ligera" }, { instanciaId: "r", catalogoId: "refuerzo_combate", nivel: 1, instaladoEnId: "a" }),
    );
    assert.equal(reforzada.ataque?.modos[0].danio, 5); // Fue 3 + 1 + 1
    assert.equal(reforzada.ataque?.modos[0].categoriaDanio, "Letal");
    assert.equal(reforzada.efectoCritico, "Aturdimiento (7, Refuerzo de Combate 1)");
  });

  test("un arma melee normal no gana nada con la armadura", () => {
    const s = con({ instanciaId: "a", catalogoId: "armadura_pesada" }, { instanciaId: "e", catalogoId: "espada_ligera" });
    const espada = accionesDeAtaque(s, modificadoresActivos(s), permisosDeDotes(s)).find((t) => t.label === "Golpear con Espada Ligera")!;
    const sola = con({ instanciaId: "e", catalogoId: "espada_ligera" });
    assert.equal(
      espada.ataque?.modos[0].danio,
      accionesDeAtaque(sola, modificadoresActivos(sola), permisosDeDotes(sola)).find((t) => t.label === "Golpear con Espada Ligera")!.ataque?.modos[0].danio,
    );
  });

  test("criticoDesarmado sustituye la dificultad del aturdimiento o lo añade", () => {
    const golpe = { bonoDanio: 1, fuentes: [], letal: "R", aturdimiento: { dificultad: 8, fuente: "R" }, bloqueoSinPenalizador: "R" };
    assert.equal(criticoDesarmado("Aturdimiento (6)", golpe), "Aturdimiento (8, R)");
    assert.equal(criticoDesarmado(undefined, golpe), "Aturdimiento (8, R)");
    assert.equal(criticoDesarmado("Aturdimiento (6)", null), "Aturdimiento (6)");
  });
});
