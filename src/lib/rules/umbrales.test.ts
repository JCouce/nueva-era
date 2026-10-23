// M1b (docs/tareas.md, "M1 — Montaje único de tiradas"): umbrales de salud y fatiga de
// §7 dentro de la FichaResuelta. Tiradas (montarTirada, prepararPoder), vida/fatiga del
// combatiente o de la ficha, fatiga temporal de Proeza, media velocidad y carga
// reducida (supuestos S26-S29), notas de Estado y el daño melee/Sutil con estados.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ACCIONES, type Accion } from "./acciones";
import { accionesDeAtaque } from "./combate";
import { estadoInicial } from "./condiciones";
import { equipar } from "./equipo";
import type { EstadoActivo } from "./estados";
import { notasDeEstado, resolverFicha, VITALIDAD_DE_FICHA, type FichaResuelta, type VitalidadActual } from "./fichaResuelta";
import { eleccionSinTocar, montarTirada, SIN_ELECCION } from "./montaje";
import { accionesDePsionica } from "./poderes";
import { defaultSheet, type Sheet } from "./sheet";
import { prepararPoder, SELECCION_PODER_VACIA } from "./usoPoder";

// Fortaleza 2 y Voluntad 2: vida 10 y fatiga 10. Con 10 de máximo, Herido < 5,
// Malherido < 2,5, Moribundo < 2 (S15); Fatigado < 2,5, Exhausto < 2.
// Potencia 2 + Atletismo 2: carrera 20 m. Fuerza 2: carga 40 kg.
function ficha(patch: Partial<Sheet> = {}): Sheet {
  const d = defaultSheet();
  return {
    ...d,
    atributos: { fuerza: 2, agilidad: 2, aguante: 2, percepcion: 0, inteligencia: 0, caracter: 2 },
    habilidades: { ...d.habilidades, atletismo: { valor: 2, especialidades: [] } },
    vidaActual: 10,
    fatigaActual: 10,
    fatigaTemporal: 0,
    ...patch,
  };
}

const resolver = (s: Sheet, vitalidad: VitalidadActual = VITALIDAD_DE_FICHA, estadosCombate: EstadoActivo[] = []) =>
  resolverFicha(s, { estados: estadosCombate, vitalidad });

const enCombate = (pgActual: number, fatigaActual: number): VitalidadActual => ({
  origen: "combate",
  pgActual,
  pgMax: 10,
  fatigaActual,
  fatigaMax: 10,
});

const salvFortaleza = ACCIONES.find((a) => a.id === "salv_fortaleza")!;
const montar = (f: FichaResuelta, t: Accion = salvFortaleza) => montarTirada(f, t, eleccionSinTocar(t));
// Las líneas del desglose que no son la base (aplicado/habilidad).
const lineasUmbral = (f: FichaResuelta) =>
  montar(f).desglose.filter((l) => ["Herido", "Malherido", "Moribundo", "Fatigado", "Exhausto"].includes(l.etiqueta));

describe("M1b: umbrales de salud y fatiga en montarTirada", () => {
  test("la ficha de prueba tiene 12 de vida y 12 de fatiga, y entera no tiene umbral", () => {
    const f = resolver(ficha());
    assert.deepEqual(f.salud, { vida: 12, fatiga: 12 });
    assert.deepEqual(lineasUmbral(f), []);
    assert.equal(montar(f).modificador, montar(f).base);
  });

  for (const [vida, etiqueta, valor] of [
    [4, "Herido", -1],
    [2, "Malherido", -3],
    [1, "Moribundo", -5],
  ] as const) {
    test(`vida ${vida}/10 → ${etiqueta} ${valor}, con su línea en el desglose`, () => {
      const f = resolver(ficha({ vidaActual: vida }));
      assert.deepEqual(lineasUmbral(f), [{ etiqueta, valor }]);
      const m = montar(f);
      assert.equal(m.modificador, m.base + valor);
    });
  }

  for (const [fatiga, etiqueta, valor] of [
    [2, "Fatigado", -1],
    [1, "Exhausto", -2],
  ] as const) {
    test(`fatiga ${fatiga}/10 → ${etiqueta} ${valor}`, () => {
      const f = resolver(ficha({ fatigaActual: fatiga }));
      assert.deepEqual(lineasUmbral(f), [{ etiqueta, valor }]);
    });
  }

  test("salud y fatiga suman entre sí; dentro de cada una, solo la banda más profunda (S14)", () => {
    const f = resolver(ficha({ vidaActual: 1, fatigaActual: 2 }));
    assert.deepEqual(lineasUmbral(f), [
      { etiqueta: "Moribundo", valor: -5 },
      { etiqueta: "Fatigado", valor: -1 },
    ]);
  });

  test("alcance «todas»: también llega a Defensa y a un ataque", () => {
    let s = ficha({ vidaActual: 4 });
    s = equipar(s, { instanciaId: "pu", catalogoId: "pelea_punetazo" });
    const f = resolver(s);
    const defensa = ACCIONES.find((a) => a.id === "defensa")!;
    const punetazo = accionesDeAtaque(f.ficha, f.modificadores, f.extrasDotes.permisos).find((t) => t.label === "Golpear con Puñetazo")!;
    for (const t of [defensa, punetazo]) assert.ok(montar(f, t).desglose.some((l) => l.etiqueta === "Herido" && l.valor === -1));
  });
});

describe("M1b: fatiga efectiva (la temporal de Proeza cuenta para el umbral)", () => {
  test("3 de fatiga sin temporal: normal; con 1 de temporal, efectiva 2 → Fatigado", () => {
    assert.equal(resolver(ficha({ fatigaActual: 3 })).umbrales.fatiga, "normal");
    const f = resolver(ficha({ fatigaActual: 3, fatigaTemporal: 1 }));
    assert.equal(f.umbrales.fatiga, "fatigado");
    assert.deepEqual(lineasUmbral(f), [{ etiqueta: "Fatigado", valor: -1 }]);
  });

  test("con 0 de fatiga y temporal acumulada, Exhausto", () => {
    assert.equal(resolver(ficha({ fatigaActual: 0, fatigaTemporal: 3 })).umbrales.fatiga, "exhausto");
  });

  test("en combate, la temporal de la ficha se resta de la fatiga del combatiente", () => {
    assert.equal(resolver(ficha({ fatigaTemporal: 1 }), enCombate(10, 3)).umbrales.fatiga, "fatigado");
  });
});

describe("M1b: en combate manda la vida/fatiga del combatiente, fuera la de la ficha", () => {
  test("ficha entera, combatiente con 4/10 → Herido", () => {
    const f = resolver(ficha(), enCombate(4, 10));
    assert.equal(f.umbrales.salud, "herido");
    assert.deepEqual(lineasUmbral(f), [{ etiqueta: "Herido", valor: -1 }]);
  });

  test("ficha con 1 de vida, combatiente entero → sin umbral", () => {
    const f = resolver(ficha({ vidaActual: 1, fatigaActual: 1 }), enCombate(10, 10));
    assert.deepEqual(lineasUmbral(f), []);
  });

  test("el umbral se calcula contra el máximo del combatiente, no el de la ficha", () => {
    const f = resolver(ficha(), { origen: "combate", pgActual: 9, pgMax: 20, fatigaActual: 10, fatigaMax: 10 });
    assert.equal(f.umbrales.salud, "herido");
  });

  test("NPC en la consola (modo libre): la vida de su fila, no la de la plantilla", () => {
    const plantilla = ficha(); // entera
    const enFila = resolverFicha(plantilla, { estados: [], vitalidad: enCombate(2, 10), libre: true });
    assert.equal(enFila.umbrales.salud, "malherido");
    assert.deepEqual(lineasUmbral(enFila), [{ etiqueta: "Malherido", valor: -3 }]);
    // Y al revés: plantilla malherida, fila entera → nada.
    const fila = resolverFicha(ficha({ vidaActual: 2 }), { estados: [], vitalidad: enCombate(10, 10), libre: true });
    assert.deepEqual(lineasUmbral(fila), []);
  });

  test("los umbrales no tocan los máximos de salud", () => {
    assert.deepEqual(resolver(ficha({ vidaActual: 1, fatigaActual: 1 })).salud, { vida: 12, fatiga: 12 });
  });
});

describe("M1b: un personaje herido que usa un poder tira con −1 (prepararPoder)", () => {
  const psionico = (vidaActual: number) => resolver(ficha({ psionica: { traslacion: 2, singularidad: 2 }, vidaActual }));
  const preparar = (f: FichaResuelta) => {
    const poder = accionesDePsionica(f.ficha, f.psionica.paraEfectos).find((p) => p.accion.id === "psi_singularidad_impulso")!;
    return prepararPoder({
      ficha: f.ficha,
      modificadores: f.modificadores,
      niveles: f.psionica.paraEfectos,
      poder,
      seleccion: SELECCION_PODER_VACIA,
    })!;
  };

  test("Impulso con 4/10 de vida: −1 respecto al mismo poder entero, con «Herido» en el desglose", () => {
    const sano = preparar(psionico(10)).montada!;
    const herido = preparar(psionico(4)).montada!;
    assert.equal(herido.modificador, sano.modificador - 1);
    assert.equal(herido.base, sano.base);
    assert.ok(herido.desglose.some((l) => l.etiqueta === "Herido" && l.valor === -1));
  });

  test("la fila del poder (montada) coincide con el modal recién abierto", () => {
    const p = preparar(psionico(4));
    const t = p.tirada!;
    const modal = montarTirada(psionico(4), t, {
      ...SIN_ELECCION,
      estadoCondiciones: estadoInicial(t.condiciones ?? []),
    });
    assert.equal(p.montada!.modificador, modal.total);
  });
});

describe("M1b: la fila enseña el modificador completo, igual que el modal sin tocar", () => {
  test("salvación de Fortaleza con traje: la fila pasa de 2 (base) a 3 (+1 del traje)", () => {
    const f = resolver(equipar(ficha(), { instanciaId: "t", catalogoId: "traje_ultra_ligero" }));
    const m = montar(f);
    assert.equal(m.modificador, m.base + 1);
  });

  test("fusil con modo y tramo por defecto: la fila suma las casillas en su estado inicial", () => {
    const f = resolver(equipar(ficha(), { instanciaId: "fa", catalogoId: "fusil_asalto_impetus" }));
    const t = accionesDeAtaque(f.ficha, f.modificadores, f.extrasDotes.permisos).find((a) => a.label === "Disparar con Impetus")!;
    const fila = montarTirada(f, t, eleccionSinTocar(t));
    const modal = montarTirada(f, t, { ...SIN_ELECCION, estadoCondiciones: estadoInicial(t.condiciones ?? []) });
    assert.equal(fila.modificador, modal.total);
    assert.notEqual(fila.modificador, fila.base); // "Modo de disparo: Simple" −3
  });
});

describe("M1b: media velocidad y carga reducida (§7, S26-S29)", () => {
  const sano = resolver(ficha());

  test("referencia: carrera 20, carga 40", () => {
    assert.equal(sano.movimiento.carrera, 20);
    assert.equal(sano.cargaMaxima, 40);
  });

  test("Herido y Fatigado: ni velocidad ni carga", () => {
    const f = resolver(ficha({ vidaActual: 4, fatigaActual: 2 }));
    assert.deepEqual(f.movimiento, sano.movimiento);
    assert.equal(f.cargaMaxima, 40);
  });

  test("Malherido: media carrera, saltos/escalada/nado igual, −25 % de carga", () => {
    const f = resolver(ficha({ vidaActual: 2 }));
    assert.deepEqual(f.movimiento, { ...sano.movimiento, carrera: 10 });
    assert.equal(f.cargaMaxima, 30);
  });

  test("Exhausto: lo mismo que Malherido", () => {
    const f = resolver(ficha({ fatigaActual: 1 }));
    assert.equal(f.movimiento.carrera, 10);
    assert.equal(f.cargaMaxima, 30);
  });

  test("Moribundo: carrera sin tocar (una casilla por turno es solo nota) y −50 % de carga", () => {
    const f = resolver(ficha({ vidaActual: 1 }));
    assert.equal(f.movimiento.carrera, 20);
    assert.equal(f.cargaMaxima, 20);
  });

  test("Malherido + Exhausto no se acumulan: media velocidad una vez, −25 % (S27)", () => {
    const f = resolver(ficha({ vidaActual: 2, fatigaActual: 1 }));
    assert.equal(f.movimiento.carrera, 10);
    assert.equal(f.cargaMaxima, 30);
  });

  test("Moribundo + Exhausto: media velocidad (de Exhausto) y la mayor reducción, −50 %", () => {
    const f = resolver(ficha({ vidaActual: 1, fatigaActual: 1 }));
    assert.equal(f.movimiento.carrera, 10);
    assert.equal(f.cargaMaxima, 20);
  });

  test("redondeo hacia abajo (S28): carrera 21 → 10", () => {
    const s = ficha({ vidaActual: 2, habilidades: { ...ficha().habilidades, atletismo: { valor: 3, especialidades: [] } } });
    assert.equal(resolver({ ...s, vidaActual: 10 }).movimiento.carrera, 21);
    assert.equal(resolver(s).movimiento.carrera, 10);
  });

  test("Arköru: la reducción va sobre la carga ya multiplicada ×1,2 (S29)", () => {
    const s = ficha({ especieId: "arkoru" }); // Fuerza 2 + 2 de especie = 4 → 80 × 1,2 = 96
    assert.equal(resolver(s).cargaMaxima, 96);
    assert.equal(resolver({ ...s, vidaActual: 2 }).cargaMaxima, 72); // −25 %
    assert.equal(resolver({ ...s, vidaActual: 1 }).cargaMaxima, 48); // −50 %
  });

  test("vuelo y levitación también a la mitad (S26)", () => {
    let s = equipar(ficha({ psionica: { traslacion: 2 } }), { instanciaId: "a", catalogoId: "armadura_pesada" });
    s = equipar(s, { instanciaId: "ma", catalogoId: "movilidad_aerea", nivel: 1, instaladoEnId: "a" });
    const entero = resolver(s);
    assert.equal(entero.vuelo?.velocidadM, 50);
    assert.equal(entero.levitacion?.velocidadM, 20);
    const malherido = resolver({ ...s, vidaActual: 2 });
    assert.equal(malherido.vuelo?.velocidadM, 25);
    assert.equal(malherido.levitacion?.velocidadM, 10);
  });

  test("en combate, con la vida del combatiente", () => {
    assert.equal(resolver(ficha(), enCombate(2, 10)).movimiento.carrera, 10);
  });
});

describe("M1b: notas de Personaje → Estado por umbral", () => {
  test("Malherido: media velocidad en carrera, vuelo y levitación; −25 % en la carga", () => {
    const n = notasDeEstado(resolver(ficha({ vidaActual: 2 })));
    assert.equal(n.carrera, "media velocidad · Malherido");
    assert.equal(n.vuelo, "media velocidad · Malherido");
    assert.equal(n.levitacion, "media velocidad · Malherido");
    assert.equal(n.saltoVertical, undefined);
    assert.equal(n.nado, undefined);
    assert.equal(n.carga, "−25 % · Malherido");
  });

  test("Moribundo: una casilla por turno, −50 %", () => {
    const n = notasDeEstado(resolver(ficha({ vidaActual: 1 })));
    assert.equal(n.carrera, "una casilla por turno · Moribundo");
    assert.equal(n.carga, "−50 % · Moribundo");
  });

  test("Malherido y Exhausto a la vez: las dos fuentes en una nota", () => {
    const n = notasDeEstado(resolver(ficha({ vidaActual: 2, fatigaActual: 1 })));
    assert.equal(n.carrera, "media velocidad · Malherido y Exhausto");
    assert.equal(n.carga, "−25 % · Malherido y Exhausto");
  });

  test("Moribundo y Exhausto: media velocidad (Exhausto), una casilla (Moribundo), −50 % (Moribundo)", () => {
    const n = notasDeEstado(resolver(ficha({ vidaActual: 1, fatigaActual: 1 })));
    assert.equal(n.carrera, "media velocidad · Exhausto, una casilla por turno · Moribundo");
    assert.equal(n.carga, "−50 % · Moribundo");
  });

  test("Arköru Exhausto: conviven el ×1,2 y el −25 %", () => {
    assert.equal(notasDeEstado(resolver(ficha({ especieId: "arkoru", fatigaActual: 1 }))).carga, "×1,2 · Arköru, −25 % · Exhausto");
  });
});

describe("M1b: daño melee, bayoneta y Sutil desde la ficha resuelta", () => {
  // Enfermedad nivel 2: Fuerza −2 (y −1 a todo). Fuerza 2 → 0; Potencia media(2,2)=2 → media(0,2)=1.
  const ENFERMO: EstadoActivo[] = [{ estadoId: "enfermedad", gradoId: "nivel_2", rondasRestantes: null }];
  // Con Combate Sutil (y Combate Melee 1, su requisito): sin la dote no hay daño Sutil (D2b-2).
  const base = ficha();
  let s = equipar(
    {
      ...base,
      habilidades: { ...base.habilidades, combate_melee: { valor: 1, especialidades: [] } },
      dotes: [{ id: "dote_combate_sutil" }],
    },
    { instanciaId: "pu", catalogoId: "pelea_punetazo" },
  );
  s = equipar(s, { instanciaId: "el", catalogoId: "espada_ligera" });
  s = equipar(s, { instanciaId: "fa", catalogoId: "fusil_asalto_impetus" });
  s = equipar(s, { instanciaId: "bay", catalogoId: "bayoneta", instaladoEnId: "fa" });
  const ataques = (f: FichaResuelta) => accionesDeAtaque(f.ficha, f.modificadores, f.extrasDotes.permisos);
  const danio = (f: FichaResuelta, label: string) => ataques(f).find((t) => t.label === label)!.ataque!.modos[0];

  test("puñetazo (Fuerza): 2 en reposo, 0 con un estado que baja Fuerza 2", () => {
    assert.equal(danio(resolver(s), "Golpear con Puñetazo").danio, 2);
    assert.equal(danio(resolver(s, VITALIDAD_DE_FICHA, ENFERMO), "Golpear con Puñetazo").danio, 0);
  });

  test("bayoneta: también baja", () => {
    const antes = danio(resolver(s), "Bayoneta (Impetus)").danio!;
    assert.equal(danio(resolver(s, VITALIDAD_DE_FICHA, ENFERMO), "Bayoneta (Impetus)").danio, antes - 2);
  });

  test("Sutil (Potencia): la Espada Ligera pasa de Potencia 2 a 1", () => {
    const antes = danio(resolver(s), "Golpear con Espada Ligera");
    const despues = danio(resolver(s, VITALIDAD_DE_FICHA, ENFERMO), "Golpear con Espada Ligera");
    assert.equal(despues.danio, antes.danio! - 2);
    assert.equal(despues.danioSutil, antes.danioSutil! - 1);
  });

  test("la especie también cuenta (Arköru, Fuerza +2)", () => {
    assert.equal(danio(resolver({ ...s, especieId: "arkoru" }), "Golpear con Puñetazo").danio, 4);
  });
});
