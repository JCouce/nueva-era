import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import {
  aplicado,
  aplicados,
  salud,
  movimiento,
  vuelo,
  cargaMaxima,
  valorEfectivo,
  desgloseAtributo,
  desgloseAplicado,
} from "./derivados";
import { equipar } from "./equipo";

// Ficha de trabajo: se parte de la de por defecto y se tocan campos sueltos.
function ficha(patch: {
  atributos?: Partial<Sheet["atributos"]>;
  habilidades?: Partial<Sheet["habilidades"]>;
  especieId?: string | null;
}): Sheet {
  const s = defaultSheet();
  return {
    ...s,
    atributos: { ...s.atributos, ...patch.atributos },
    habilidades: { ...s.habilidades, ...patch.habilidades },
    ...(patch.especieId !== undefined ? { especieId: patch.especieId } : {}),
  };
}

describe("atributos aplicados", () => {
  test("son la media de sus dos básicos, redondeando hacia arriba (HOJA2)", () => {
    const s = ficha({ atributos: { fuerza: 3, aguante: 2, agilidad: 1 } });
    assert.equal(aplicado(s, "fortaleza"), 3); // ceil((3+2)/2)
    assert.equal(aplicado(s, "potencia"), 2); // ceil((3+1)/2)
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
    assert.equal(aplicado(s, "voluntad"), 1); // ceil((2-1)/2)
    assert.equal(aplicado(s, "expresion"), 0); // ceil((-1+0)/2)
  });
});

describe("desglose de un atributo", () => {
  test("sin modificadores, la única fuente es la base", () => {
    const s = ficha({ atributos: { fuerza: 3 } });
    assert.deepEqual(desgloseAtributo(s, "fuerza"), {
      total: 3,
      fuentes: [{ etiqueta: "Base", valor: 3 }],
    });
  });

  test("con especie, cada modificador aparece como su propia fuente", () => {
    // Arkorü: +1 aguante, -1 carácter (ver src/lib/catalog/especies.ts)
    const s = ficha({ atributos: { aguante: 2 }, especieId: "arkoru" });
    assert.deepEqual(desgloseAtributo(s, "aguante"), {
      total: 3,
      fuentes: [
        { etiqueta: "Base", valor: 2 },
        { etiqueta: "Arkorü", valor: 1 },
      ],
    });
  });

  test("un atributo que la especie no toca no arrastra fuentes de más", () => {
    const s = ficha({ atributos: { fuerza: 2 }, especieId: "arkoru" });
    assert.deepEqual(desgloseAtributo(s, "fuerza"), {
      total: 2,
      fuentes: [{ etiqueta: "Base", valor: 2 }],
    });
  });
});

describe("desglose de un aplicado", () => {
  test("total es la media de los dos básicos efectivos, ya con sus modificadores dentro", () => {
    const s = ficha({ atributos: { fuerza: 3, aguante: 2 }, especieId: "arkoru" });
    // Fortaleza = media(Fuerza, Aguante); Aguante ya lleva el +1 de Arkorü
    assert.deepEqual(desgloseAplicado(s, "fortaleza"), {
      total: 3, // ceil((3+3)/2)
      fuentes: [
        { etiqueta: "Fuerza", valor: 3 },
        { etiqueta: "Aguante", valor: 3 },
      ],
    });
  });
});

describe("salud", () => {
  test("una ficha nueva tiene 8 y 8", () => {
    const s = defaultSheet();
    assert.deepEqual(salud(s), { vida: 8, fatiga: 8 });
  });

  test("vida = 8 + fortaleza, fatiga = 8 + voluntad", () => {
    const s = ficha({ atributos: { fuerza: 3, aguante: 2, caracter: 1 } });
    assert.equal(salud(s).vida, 11); // 8 + ceil((3+2)/2)
    assert.equal(salud(s).fatiga, 10); // 8 + ceil((2+1)/2)
  });

  test("con aplicados negativos la salud baja de 8", () => {
    const s = ficha({ atributos: { fuerza: -1, aguante: -1, caracter: -1 } });
    assert.equal(salud(s).vida, 7); // 8 + ceil((-1-1)/2)
    assert.equal(salud(s).fatiga, 7);
  });
});

describe("movimiento (HOJA2: constantes nuevas)", () => {
  test("un personaje recién creado no se mueve hacia atrás", () => {
    // Potencia 0 y Atletismo sin entrenar (-1) dan base -1: las fórmulas
    // saldrían negativas y se cortan en 0 (supuesto S6 de docs/sistema.md).
    const m = movimiento(defaultSheet());
    assert.equal(m.saltoVertical, 0);
    assert.equal(m.carrera, 15); // 16 - 1
    for (const v of Object.values(m)) assert.ok(v >= 0, "ningún valor es negativo");
  });

  test("las cinco fórmulas con base 8", () => {
    const s = ficha({
      atributos: { fuerza: 4, agilidad: 4 }, // potencia = ceil((4+4)/2) = 4
      habilidades: { atletismo: { valor: 4, especialidades: [] } },
    });
    const m = movimiento(s); // base = 4 + 4 = 8
    assert.equal(m.carrera, 24); // 16 + 8
    assert.equal(m.saltoVertical, 120); // 15 * 8
    assert.equal(m.saltoHorizontal, 260); // 100 + 8*20
    assert.equal(m.escalada, 8); // 4 + floor(8/2)
    assert.equal(m.nado, 8);
  });

  test("la escalada redondea hacia abajo con base impar", () => {
    const s = ficha({
      atributos: { fuerza: 1, agilidad: 2 }, // potencia = ceil((1+2)/2) = 2
      habilidades: { atletismo: { valor: 1, especialidades: [] } },
    });
    assert.equal(movimiento(s).escalada, 5); // 4 + floor(3/2)
  });

  test("el exoesqueleto duplica su bono en las 5 fórmulas (supuesto S10)", () => {
    // Armadura Pesada admite exoesqueleto hasta nivel 4.
    let s = ficha({
      atributos: { fuerza: 3, agilidad: 2 }, // potencia = ceil((3+2)/2) = 3
      habilidades: { atletismo: { valor: 3, especialidades: [] } },
    });
    s = equipar(s, { instanciaId: "a1", catalogoId: "armadura_pesada" });
    s = equipar(s, {
      instanciaId: "e1",
      catalogoId: "exoesqueleto",
      nivel: 2,
      instaladoEnId: "a1",
    });
    const m = movimiento(s); // base = 3 (potencia) + 4 (2×nivel 2) + 3 (atletismo) = 10
    assert.equal(m.carrera, 26); // 16 + 10
    assert.equal(m.saltoVertical, 150); // 15 * 10
    assert.equal(m.saltoHorizontal, 300); // 100 + 10*20
    assert.equal(m.escalada, 9); // 4 + floor(10/2)
    assert.equal(m.nado, 9);

    // El bono no debe filtrarse a ningún otro sitio: ni a la Fuerza que se
    // muestra en Atributos, ni a Fortaleza/Vida.
    assert.deepEqual(desgloseAtributo(s, "fuerza"), {
      total: 3,
      fuentes: [{ etiqueta: "Base", valor: 3 }],
    });
    assert.equal(salud(s).vida, 8 + 2); // Fortaleza = ceil((3+0)/2), sin exoesqueleto
  });

  test("sin exoesqueleto no cambia nada (regresión)", () => {
    const s = ficha({
      atributos: { fuerza: 3, agilidad: 2 },
      habilidades: { atletismo: { valor: 3, especialidades: [] } },
    });
    assert.equal(movimiento(s).carrera, 22); // 16 + 6 (potencia 3 + atletismo 3)
  });
});

describe("cargaMaxima (docs/sistema.md §5.5)", () => {
  test("Fuerza 0 son 15 kg, no 0 (caso especial)", () => {
    assert.equal(cargaMaxima(defaultSheet()), 15);
  });

  test("Fuerza positiva es Fuerza × 20", () => {
    const s = ficha({ atributos: { fuerza: 3 } });
    assert.equal(cargaMaxima(s), 60);
  });

  test("Fuerza negativa resta 5 por punto por debajo de 0", () => {
    const s = ficha({ atributos: { fuerza: -1 } });
    assert.equal(cargaMaxima(s), 10);
  });

  test("el exoesqueleto duplica su bono también aquí (cierra el hueco de S10)", () => {
    // Mismo montaje que el test de movimiento: Armadura Pesada + Exoesqueleto
    // nivel 2 → +4 a la Fuerza que entra en la fórmula.
    let s = ficha({ atributos: { fuerza: 3 } });
    s = equipar(s, { instanciaId: "a1", catalogoId: "armadura_pesada" });
    s = equipar(s, {
      instanciaId: "e1",
      catalogoId: "exoesqueleto",
      nivel: 2,
      instaladoEnId: "a1",
    });
    assert.equal(cargaMaxima(s), (3 + 4) * 20); // 140

    // El bono no se filtra a la Fuerza que se ve en Atributos.
    assert.deepEqual(desgloseAtributo(s, "fuerza"), {
      total: 3,
      fuentes: [{ etiqueta: "Base", valor: 3 }],
    });
  });
});

describe("vuelo", () => {
  test("sin Movilidad Aérea equipada, no hay vuelo", () => {
    assert.equal(vuelo(defaultSheet()), null);
  });

  test("con Movilidad Aérea instalada, la velocidad sale del nivel equipado", () => {
    // Armadura Ligera admite Movilidad Aérea hasta nivel 2 (ver catalog/equipo.ts).
    let s = equipar(defaultSheet(), { instanciaId: "a1", catalogoId: "armadura_ligera" });
    s = equipar(s, {
      instanciaId: "m1",
      catalogoId: "movilidad_aerea",
      nivel: 2,
      instaladoEnId: "a1",
    });
    assert.deepEqual(vuelo(s), { velocidadM: 70, nivel: 2 });
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
