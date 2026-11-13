// «Resistir daño» (T2 del barrido del cuestionario, 2026-11-13): el golpe que entra, lo que
// dispara al recibirlo y aplicarlo a la vida (ficha o foto del combate) y al blindaje.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { blindajeDeArmadura, romperBlindaje } from "./blindaje";
import { danioVacio } from "./danio";
import { equipar } from "./equipo";
import { resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";
import { repararPieza, ajustarMaterial } from "./recursos";
import { pulsarTipoDanio, recibirGolpe, resolverGolpe, textoDelGolpe, tirarSalvacionAlRecibir, type EntradaResistir } from "./resistirDanio";
import { defaultSheet, type Sheet } from "./sheet";

function ficha(patch: Partial<Sheet> = {}): Sheet {
  const d = defaultSheet();
  return {
    ...d,
    atributos: { fuerza: 2, agilidad: 2, aguante: 2, percepcion: 0, inteligencia: 0, caracter: 2 },
    vidaActual: 10,
    fatigaActual: 10,
    fatigaTemporal: 0,
    ...patch,
  };
}

const NOBLE = (linaje: string): Partial<Sheet> => ({ especieId: "manduk", especieOpciones: { casta: "noble", linaje } });
const resolver = (s: Sheet, libre = false) => resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA, libre });
const conArmadura = (s: Sheet, catalogoId = "armadura_ligera") => equipar(s, { instanciaId: "arm1", catalogoId }); // ligera: 4

const entrada = (e: Partial<EntradaResistir> = {}): EntradaResistir => ({
  tipo: "cinetico",
  critico: false,
  danio: 0,
  reactivo: false,
  conBrazo: false,
  marcadas: [],
  rompeBlindaje: 0,
  categoria: null,
  ...e,
});

describe("resolverGolpe: lo que pasa del blindaje y su categoría", () => {
  test("pasa lo que sobra del blindaje; el golpe aplica eso con la categoría del tipo", () => {
    const g = resolverGolpe(resolver(conArmadura(ficha())), entrada({ tipo: "electrico", danio: 7 }));
    assert.equal(g.blindaje, 4);
    assert.equal(g.pasa, 3);
    assert.equal(g.entra, 3);
    assert.equal(g.categoria, "letal");
    assert.equal(g.eligeCategoria, false);
    assert.deepEqual(g.golpe, { categoria: "letal", cantidad: 3, rompeBlindaje: 0 });
    assert.equal(textoDelGolpe(g.golpe!), "Recibir 3 de daño letal");
  });

  test("Cinético no trae categoría: la elige el jugador (letal si no elige)", () => {
    const f = resolver(ficha());
    assert.equal(resolverGolpe(f, entrada({ danio: 2 })).categoria, "letal");
    const g = resolverGolpe(f, entrada({ danio: 2, categoria: "noLetal" }));
    assert.equal(g.eligeCategoria, true);
    assert.equal(g.categoria, "noLetal");
  });

  test("todo parado: nada que aplicar", () => {
    const g = resolverGolpe(resolver(conArmadura(ficha())), entrada({ danio: 3 }));
    assert.equal(g.entra, 0);
    assert.equal(g.golpe, null);
  });

  test("di-08: Mental y Fuego atraviesan el blindaje; Tóxico no", () => {
    const f = resolver(conArmadura(ficha()));
    assert.equal(resolverGolpe(f, entrada({ tipo: "mental", danio: 5 })).entra, 5);
    assert.equal(resolverGolpe(f, entrada({ tipo: "fuego", danio: 5 })).entra, 5);
    assert.equal(resolverGolpe(f, entrada({ tipo: "toxico", danio: 5 })).entra, 1);
  });
});

describe("es-03/es-04: Tensión ósea del Zimethroni", () => {
  const zim = resolver(conArmadura(ficha(NOBLE("zimethroni"))));

  test("la casilla solo sale con el rasgo", () => {
    assert.deepEqual(
      resolverGolpe(zim, entrada()).casillas.map((c) => c.id),
      ["tension_osea"],
    );
    assert.deepEqual(resolverGolpe(resolver(ficha(NOBLE("ilkrem"))), entrada()).casillas, []);
  });

  test("marcada: +1 por cada 4 que entran tras el blindaje", () => {
    const g = resolverGolpe(zim, entrada({ danio: 12, marcadas: ["tension_osea"] })); // 12 − 4 = 8 → +2
    assert.equal(g.pasa, 8);
    assert.deepEqual(g.extras, [{ etiqueta: "¿Te atacaron mientras te movías? · Tensión ósea", valor: 2 }]);
    assert.equal(g.entra, 10);
    assert.equal(g.golpe?.cantidad, 10);
  });

  test("si el blindaje lo para todo (o entra menos de 4), no hay extra", () => {
    assert.equal(resolverGolpe(zim, entrada({ danio: 4, marcadas: ["tension_osea"] })).entra, 0);
    assert.equal(resolverGolpe(zim, entrada({ danio: 7, marcadas: ["tension_osea"] })).entra, 3);
  });

  test("con daño mental la casilla no cuenta (no es un ataque físico)", () => {
    const g = resolverGolpe(zim, entrada({ tipo: "mental", danio: 8, marcadas: ["tension_osea"] }));
    assert.ok(g.casillas[0].bloqueada);
    assert.equal(g.entra, 8);
  });
});

describe("es-02: Falla metabólica del Ílkrem", () => {
  const ilk = resolver(ficha(NOBLE("ilkrem")));

  test("con fuego o plasma que entra, la salvación de Fortaleza a dificultad 9", () => {
    for (const tipo of ["fuego", "plasma"] as const) {
      const [s] = resolverGolpe(ilk, entrada({ tipo, danio: 2 })).salvaciones;
      assert.equal(s.etiqueta, "Falla metabólica");
      assert.equal(s.salvacion, "salv_fortaleza");
      assert.equal(s.dificultad, 9);
    }
  });

  test("sin daño que entre, u otro tipo, o sin el rasgo: nada", () => {
    assert.deepEqual(resolverGolpe(ilk, entrada({ tipo: "fuego", danio: 0 })).salvaciones, []);
    assert.deepEqual(resolverGolpe(ilk, entrada({ tipo: "electrico", danio: 5 })).salvaciones, []);
    assert.deepEqual(resolverGolpe(resolver(ficha(NOBLE("irota"))), entrada({ tipo: "fuego", danio: 5 })).salvaciones, []);
  });

  test("se tira la Salvación de Fortaleza contra 9", () => {
    const [s] = resolverGolpe(ilk, entrada({ tipo: "plasma", danio: 3 })).salvaciones;
    const r = tirarSalvacionAlRecibir(ilk, s, 12);
    assert.equal(r.dificultad, 9);
    assert.equal(r.dado, 12);
  });
});

describe("eq-24: Malla Plasmática devuelve el golpe", () => {
  const conMalla = (nivel: number) =>
    resolver(equipar(conArmadura(ficha(), "armadura_pesada"), { instanciaId: "mp", catalogoId: "malla_plasmatica", nivel, instaladoEnId: "arm1" }));

  test("casilla «Golpe cuerpo a cuerpo» solo con la malla; marcada, avisa sin calcular", () => {
    const g = resolverGolpe(conMalla(2), entrada({ danio: 3 }));
    assert.deepEqual(g.casillas.map((c) => c.etiqueta), ["Golpe cuerpo a cuerpo"]);
    assert.deepEqual(g.avisos, []);
    const marcada = resolverGolpe(conMalla(2), entrada({ danio: 3, marcadas: ["malla_devuelve"] }));
    assert.equal(marcada.avisos.length, 1);
    assert.match(marcada.avisos[0], /^Devuelves 2 de plasma/);
    assert.doesNotMatch(marcada.avisos[0], /Shock/);
    assert.equal(marcada.entra, 0);
  });

  test("nivel 4: también Shock y Llamarada (8)", () => {
    const g = resolverGolpe(conMalla(4), entrada({ marcadas: ["malla_devuelve"] }));
    assert.match(g.avisos[0], /^Devuelves 4 de plasma.*Shock y Llamarada \(8\)/);
  });
});

describe("do-02: Saber Caer y Caer Parado dejan su nota en Resistir daño", () => {
  test("solo con la dote", () => {
    assert.deepEqual(resolverGolpe(resolver(ficha()), entrada()).notas, []);
    const saber = resolverGolpe(resolver(ficha({ dotes: [{ id: "dote_saber_caer" }] }), true), entrada());
    assert.equal(saber.notas.length, 1);
    assert.match(saber.notas[0], /se reduce en 4 m.*\(Saber Caer\)/);
    const parado = resolverGolpe(resolver(ficha({ dotes: [{ id: "dote_caer_parado" }] }), true), entrada());
    assert.match(parado.notas[0], /se reduce en 8 m/);
  });
});

describe("eq-20: blindaje perdido para siempre", () => {
  test("la casilla solo con armadura y blindaje que perder; hasta 2", () => {
    assert.equal(resolverGolpe(resolver(ficha()), entrada()).rompeBlindaje, null);
    const g = resolverGolpe(resolver(conArmadura(ficha())), entrada({ rompeBlindaje: 5 }));
    assert.deepEqual(g.rompeBlindaje, { max: 2, elegido: 2, armadura: "Armadura Ligera" });
    assert.deepEqual(g.golpe, { categoria: "letal", cantidad: 0, rompeBlindaje: 2 });
  });

  test("lo perdido se descuenta del blindaje, con su nota, y reparar lo devuelve", () => {
    let s = romperBlindaje(conArmadura(ficha()), 1);
    assert.deepEqual(blindajeDeArmadura(s), { instanciaId: "arm1", etiqueta: "Armadura Ligera", base: 4, perdido: 1, actual: 3 });
    const g = resolverGolpe(resolver(s), entrada({ danio: 5 }));
    assert.equal(g.blindaje, 3);
    assert.match(g.desglose[0].nota ?? "", /1 de 4 perdido/);
    s = repararPieza(ajustarMaterial(s, "sencillos", 1), "arm1", "sencillos", true);
    assert.equal(blindajeDeArmadura(s)?.actual, 4);
  });

  test("no baja de 0", () => {
    const s = romperBlindaje(romperBlindaje(romperBlindaje(conArmadura(ficha()), 2), 2), 2);
    assert.equal(blindajeDeArmadura(s)?.actual, 0);
    assert.equal(resolverGolpe(resolver(s), entrada()).rompeBlindaje, null);
  });
});

describe("recibirGolpe: aplicar y deshacer", () => {
  test("fuera de combate: a la vida de la ficha con su categoría, y el blindaje a la armadura", () => {
    const s = conArmadura(ficha());
    const r = recibirGolpe(s, { categoria: "grave", cantidad: 3, rompeBlindaje: 1 }, [], null);
    assert.equal(r.sheet.vidaActual, s.vidaActual - 3);
    assert.equal(r.sheet.danio.grave, 3);
    assert.equal(r.foto, null);
    assert.deepEqual(r.aplicado, { categoria: "grave", vida: 3, blindaje: 1 });
    assert.equal(blindajeDeArmadura(r.sheet)?.perdido, 1);
    const d = recibirGolpe(r.sheet, { categoria: "grave", cantidad: 3, rompeBlindaje: 1 }, [], null, true);
    assert.equal(d.sheet.vidaActual, s.vidaActual);
    assert.equal(d.sheet.danio.grave, 0);
    assert.equal(blindajeDeArmadura(d.sheet)?.perdido, 0);
  });

  test("lo aplicado no pasa de la vida que queda (deshacer devuelve solo eso)", () => {
    const s = { ...ficha(), vidaActual: 2 };
    const r = recibirGolpe(s, { categoria: "letal", cantidad: 5, rompeBlindaje: 0 }, [], null);
    assert.equal(r.sheet.vidaActual, 0);
    assert.equal(r.aplicado.vida, 2);
  });

  test("en combate: a la foto; la vida de la ficha no se toca, el blindaje sí", () => {
    const s = conArmadura(ficha());
    const foto = { pgActual: 8, pgMax: 10, danio: { ...danioVacio(), letal: 2 } };
    const r = recibirGolpe(s, { categoria: "noLetal", cantidad: 3, rompeBlindaje: 2 }, [], foto);
    assert.deepEqual(r.foto, { pgActual: 5, danio: { noLetal: 3, letal: 2, grave: 0 } });
    assert.equal(r.sheet.vidaActual, s.vidaActual);
    assert.equal(blindajeDeArmadura(r.sheet)?.perdido, 2);
    assert.deepEqual(r.aplicado, { categoria: "noLetal", vida: 3, blindaje: 2 });
    const d = recibirGolpe(r.sheet, { categoria: "noLetal", cantidad: 3, rompeBlindaje: 2 }, [], { ...foto, ...r.foto! }, true);
    assert.deepEqual(d.foto, { pgActual: 8, danio: { noLetal: 0, letal: 2, grave: 0 } });
    assert.equal(blindajeDeArmadura(d.sheet)?.perdido, 0);
  });
});

describe("crítico: categoría y selector de tipo (usuario, 2026-11-13)", () => {
  const f = () => resolver(ficha());

  test("Eléctrico, Frío y Sónico entran con la categoría de crítico", () => {
    assert.equal(resolverGolpe(f(), entrada({ tipo: "electrico", danio: 4, critico: true })).categoria, "grave");
    assert.equal(resolverGolpe(f(), entrada({ tipo: "frio", danio: 4, critico: true })).categoria, "letal");
    assert.equal(resolverGolpe(f(), entrada({ tipo: "sonico", danio: 4, critico: true })).categoria, "letal");
    assert.equal(resolverGolpe(f(), entrada({ tipo: "frio", danio: 4 })).categoria, "noLetal");
  });

  test("en los demás tipos el crítico no cambia la categoría", () => {
    assert.equal(resolverGolpe(f(), entrada({ tipo: "fuego", danio: 4, critico: true })).categoria, "grave");
  });

  test("pulsaciones: normal → crítico → sin tipo en los que cambian; normal → sin tipo en los demás", () => {
    const a = pulsarTipoDanio(null, "frio");
    assert.deepEqual(a, { tipo: "frio", critico: false });
    const b = pulsarTipoDanio(a, "frio");
    assert.deepEqual(b, { tipo: "frio", critico: true });
    assert.equal(pulsarTipoDanio(b, "frio"), null);
    assert.equal(pulsarTipoDanio({ tipo: "fuego", critico: false }, "fuego"), null);
    assert.deepEqual(pulsarTipoDanio(b, "plasma"), { tipo: "plasma", critico: false });
  });
});
