import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { aplicado, aplicados, salud, movimiento, valorEfectivo } from "./derivados";

// Ficha de trabajo: se parte de la de por defecto y se tocan campos sueltos.
function ficha(patch: {
  atributos?: Partial<Sheet["atributos"]>;
  habilidades?: Partial<Sheet["habilidades"]>;
}): Sheet {
  const s = defaultSheet();
  return {
    ...s,
    atributos: { ...s.atributos, ...patch.atributos },
    habilidades: { ...s.habilidades, ...patch.habilidades },
  };
}

describe("atributos aplicados", () => {
  test("son la suma de sus dos básicos", () => {
    const s = ficha({ atributos: { fuerza: 3, aguante: 2, agilidad: 1 } });
    assert.equal(aplicado(s, "fortaleza"), 5); // fuerza + aguante
    assert.equal(aplicado(s, "potencia"), 4); // fuerza + agilidad
  });

  test("cada básico alimenta exactamente dos aplicados", () => {
    const solo = ficha({ atributos: { percepcion: 1 } });
    const d = aplicados(solo);
    const tocados = Object.entries(d).filter(([, v]) => v !== 0);
    assert.deepEqual(
      tocados.map(([k]) => k).sort(),
      ["perspicacia", "reflejos"], // percepción entra en estos dos
    );
  });

  test("un atributo a -1 arrastra a los aplicados", () => {
    const s = ficha({ atributos: { caracter: -1, aguante: 2 } });
    assert.equal(aplicado(s, "voluntad"), 1); // aguante 2 + carácter -1
    assert.equal(aplicado(s, "expresion"), -1); // carácter -1 + inteligencia 0
  });
});

describe("salud", () => {
  test("una ficha nueva tiene 8 y 8", () => {
    const s = defaultSheet();
    assert.deepEqual(salud(s), { vida: 8, fatiga: 8 });
  });

  test("vida = 8 + fortaleza, fatiga = 8 + voluntad", () => {
    const s = ficha({ atributos: { fuerza: 3, aguante: 2, caracter: 1 } });
    assert.equal(salud(s).vida, 13); // 8 + (3+2)
    assert.equal(salud(s).fatiga, 11); // 8 + (2+1)
  });

  test("con aplicados negativos la salud baja de 8", () => {
    const s = ficha({ atributos: { fuerza: -1, aguante: -1, caracter: -1 } });
    assert.equal(salud(s).vida, 6); // 8 + (-2)
    assert.equal(salud(s).fatiga, 6);
  });
});

describe("movimiento", () => {
  test("un personaje recién creado no se mueve hacia atrás", () => {
    // Potencia 0 y Atletismo sin entrenar (-1) dan base -1: las fórmulas
    // saldrían negativas y se cortan en 0 (supuesto S6 de docs/sistema.md).
    const m = movimiento(defaultSheet());
    assert.equal(m.saltoVertical, 0);
    assert.equal(m.carrera, 14); // 15 - 1
    for (const v of Object.values(m)) assert.ok(v >= 0, "ningún valor es negativo");
  });

  test("las cinco fórmulas con base 8", () => {
    const s = ficha({
      atributos: { fuerza: 3, agilidad: 2 }, // potencia 5
      habilidades: { atletismo: { valor: 3, especialidades: [] } },
    });
    const m = movimiento(s); // base = 5 + 3 = 8
    assert.equal(m.carrera, 23); // 15 + 8
    assert.equal(m.saltoVertical, 80); // 10 * 8
    assert.equal(m.saltoHorizontal, 630); // 150 + 8*60
    assert.equal(m.escalada, 9); // 5 + 8/2
    assert.equal(m.nado, 9);
  });

  test("la escalada redondea hacia abajo con base impar", () => {
    const s = ficha({
      atributos: { fuerza: 1, agilidad: 1 }, // potencia 2
      habilidades: { atletismo: { valor: 1, especialidades: [] } },
    });
    assert.equal(movimiento(s).escalada, 6); // 5 + floor(3/2)
  });
});

describe("valor efectivo de una habilidad", () => {
  test("dentro de la especialidad se usa el valor entero", () => {
    const s = ficha({ habilidades: { sigilo: { valor: 3, especialidades: ["Urbano"] } } });
    assert.equal(valorEfectivo(s, "sigilo", true), 3);
  });

  test("fuera de la especialidad, la mitad redondeando hacia arriba", () => {
    const s = ficha({ habilidades: { sigilo: { valor: 3, especialidades: ["Urbano"] } } });
    assert.equal(valorEfectivo(s, "sigilo", false), 2); // ceil(3/2)
  });

  test("sin entrenar siempre es -1, esté donde esté", () => {
    const s = defaultSheet();
    assert.equal(valorEfectivo(s, "cultura", true), -1);
    assert.equal(valorEfectivo(s, "cultura", false), -1);
  });
});
