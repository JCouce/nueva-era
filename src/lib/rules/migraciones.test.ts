import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { migrar, MIGRACIONES } from "./migraciones";
import { parseSheet, SCHEMA_VERSION } from "./sheet";
import { ARMAS } from "../catalog/armasFuego";

describe("cadena de migraciones", () => {
  test("hay un paso por cada salto de versión, sin huecos", () => {
    for (let v = 1; v < SCHEMA_VERSION; v++) {
      const paso = MIGRACIONES.find((m) => m.desde === v);
      assert.ok(paso, `falta la migración desde la versión ${v}`);
      assert.equal(paso.hasta, v + 1, "las migraciones van de una en una");
    }
  });

  test("cada paso explica qué hace", () => {
    for (const m of MIGRACIONES) {
      assert.ok(m.descripcion.length > 20, `paso ${m.desde}→${m.hasta} sin explicar`);
    }
  });

  test("una ficha ya al día no se toca", () => {
    const alDia = { schemaVersion: SCHEMA_VERSION, especieId: "humano" };
    const { ficha, aplicadas } = migrar(alDia, SCHEMA_VERSION);
    assert.deepEqual(aplicadas, []);
    assert.equal(ficha.especieId, "humano");
  });

  test("basura no revienta", () => {
    for (const b of [null, undefined, 42, "texto"]) {
      assert.doesNotThrow(() => migrar(b, SCHEMA_VERSION));
    }
  });
});

describe("v1 → v2: la especie deja de ser texto libre", () => {
  test("un nombre conocido se convierte en su id", () => {
    const { ficha, aplicadas } = migrar({ schemaVersion: 1, especie: "Arkorü" }, 2);
    assert.equal(ficha.especieId, "arkoru");
    assert.equal(ficha.schemaVersion, 2);
    assert.equal(aplicadas.length, 1);
  });

  test("da igual cómo estuviera escrito: acentos y mayúsculas", () => {
    for (const escrito of ["arkoru", "ARKORÜ", "  Arkorü  ", "arkorü"]) {
      const { ficha } = migrar({ schemaVersion: 1, especie: escrito }, 2);
      assert.equal(ficha.especieId, "arkoru", `falló con "${escrito}"`);
    }
  });

  test("un nombre desconocido se queda sin asignar, no se inventa", () => {
    const { ficha } = migrar({ schemaVersion: 1, especie: "Marciano" }, 2);
    assert.equal(ficha.especieId, null);
  });

  test("el campo viejo desaparece", () => {
    const { ficha } = migrar({ schemaVersion: 1, especie: "Humano" }, 2);
    assert.ok(!("especie" in ficha));
  });

  test("no toca el resto de la ficha", () => {
    const original = {
      schemaVersion: 1,
      especie: "Humano",
      edad: 34,
      trasfondo: "una historia",
      atributos: { fuerza: 3 },
    };
    const { ficha } = migrar(original, 2);
    assert.equal(ficha.edad, 34);
    assert.equal(ficha.trasfondo, "una historia");
    assert.deepEqual(ficha.atributos, { fuerza: 3 });
  });

  test("una ficha sin número de versión se trata como v1 y se migra", () => {
    const { ficha } = migrar({ especie: "Arkorü" }, 2);
    assert.equal(ficha.especieId, "arkoru");
  });
});

describe("v2 → v3: se añade el equipo instalado", () => {
  test("una ficha sin campo equipo arranca con la lista vacía", () => {
    const { ficha } = migrar({ schemaVersion: 2, especieId: "humano" }, 3);
    assert.deepEqual(ficha.equipo, []);
    assert.equal(ficha.schemaVersion, 3);
  });

  test("no toca el resto de la ficha", () => {
    const { ficha } = migrar({ schemaVersion: 2, especieId: "arkoru", edad: 40 }, 3);
    assert.equal(ficha.especieId, "arkoru");
    assert.equal(ficha.edad, 40);
  });
});

describe("v3 → v4: creación por prioridad (HOJA2)", () => {
  test("una ficha vieja arranca con las 5 letras sin asignar", () => {
    const { ficha } = migrar({ schemaVersion: 3, especieId: "humano" }, 4);
    assert.deepEqual(ficha.prioridades, {
      atributos: null,
      habilidades: null,
      dotes: null,
      psionica: null,
      recursos: null,
    });
    assert.equal(ficha.altura, null);
    assert.equal(ficha.peso, null);
    assert.equal(ficha.schemaVersion, 4);
  });

  test("no toca el resto de la ficha", () => {
    const { ficha } = migrar({ schemaVersion: 3, especieId: "arkoru", edad: 40 }, 4);
    assert.equal(ficha.especieId, "arkoru");
    assert.equal(ficha.edad, 40);
  });
});

describe("v4 → v5: Exploración sustituye a Supervivencia (C4/C12)", () => {
  test("lo comprado en Supervivencia pasa tal cual a Exploración", () => {
    const { ficha } = migrar(
      {
        schemaVersion: 4,
        habilidades: { supervivencia: { valor: 2, especialidades: ["Rastreo"] } },
      },
      5,
    );
    const habilidades = ficha.habilidades as Record<string, unknown>;
    assert.deepEqual(habilidades.exploracion, { valor: 2, especialidades: ["Rastreo"] });
    assert.equal("supervivencia" in habilidades, false);
    assert.equal(ficha.schemaVersion, 5);
  });

  test("una ficha sin Supervivencia no revienta", () => {
    const { ficha } = migrar({ schemaVersion: 4, habilidades: { sigilo: { valor: 1, especialidades: [] } } }, 5);
    const habilidades = ficha.habilidades as Record<string, unknown>;
    assert.deepEqual(habilidades.sigilo, { valor: 1, especialidades: [] });
    assert.equal("exploracion" in habilidades, false);
  });

  test("no toca el resto de la ficha", () => {
    const { ficha } = migrar({ schemaVersion: 4, especieId: "arkoru" }, 5);
    assert.equal(ficha.especieId, "arkoru");
  });
});

describe("v5 → v6: se añade RECURSOS", () => {
  test("una ficha sin campo recursos arranca con la lista vacía", () => {
    const { ficha } = migrar({ schemaVersion: 5, especieId: "humano" }, 6);
    assert.deepEqual(ficha.recursos, []);
    assert.equal(ficha.schemaVersion, 6);
  });

  test("no toca el resto de la ficha", () => {
    const { ficha } = migrar({ schemaVersion: 5, especieId: "arkoru", edad: 40 }, 6);
    assert.equal(ficha.especieId, "arkoru");
    assert.equal(ficha.edad, 40);
  });
});

describe("v6 → v7: se añade el pool de Materiales", () => {
  test("una ficha sin campo materiales arranca a 0 en los 3 tiers", () => {
    const { ficha } = migrar({ schemaVersion: 6, especieId: "humano" }, 7);
    assert.deepEqual(ficha.materiales, { sencillos: 0, sofisticados: 0, avanzados: 0 });
    assert.equal(ficha.schemaVersion, 7);
  });

  test("no toca el resto de la ficha", () => {
    const { ficha } = migrar({ schemaVersion: 6, especieId: "arkoru", edad: 40 }, 7);
    assert.equal(ficha.especieId, "arkoru");
    assert.equal(ficha.edad, 40);
  });
});

describe("v7 → v8: las granadas pasan de pieza equipada a recurso con cantidad", () => {
  test("suma las instancias equipadas de granada al recurso, agrupadas por tipo", () => {
    const { ficha } = migrar(
      {
        schemaVersion: 7,
        especieId: "humano",
        equipo: [
          { instanciaId: "g1", catalogoId: "granada_casera" },
          { instanciaId: "g2", catalogoId: "granada_casera" },
          { instanciaId: "g3", catalogoId: "granada_plasma" },
        ],
      },
      8,
    );
    assert.deepEqual(ficha.granadas, { granada_casera: 2, granada_plasma: 1 });
    assert.equal(ficha.schemaVersion, 8);
  });

  test("las retira de equipo, sin tocar el resto de piezas equipadas", () => {
    const { ficha } = migrar(
      {
        schemaVersion: 7,
        equipo: [
          { instanciaId: "a1", catalogoId: "fusil_asalto_impetus" },
          { instanciaId: "g1", catalogoId: "granada_casera" },
        ],
      },
      8,
    );
    assert.deepEqual(ficha.equipo, [{ instanciaId: "a1", catalogoId: "fusil_asalto_impetus" }]);
  });

  test("una ficha sin ninguna granada equipada arranca con el recurso vacío", () => {
    const { ficha } = migrar({ schemaVersion: 7, especieId: "humano" }, 8);
    assert.deepEqual(ficha.granadas, {});
    assert.equal(ficha.schemaVersion, 8);
  });

  test("no toca el resto de la ficha", () => {
    const { ficha } = migrar({ schemaVersion: 7, especieId: "arkoru", edad: 40 }, 8);
    assert.equal(ficha.especieId, "arkoru");
    assert.equal(ficha.edad, 40);
  });
});

describe("v8 → v9: vida y fatiga pasan a recurso persistente", () => {
  test("una ficha vieja arranca con el centinela (parseSheet lo recorta al máximo real)", () => {
    const { ficha } = migrar({ schemaVersion: 8, especieId: "humano" }, 9);
    assert.equal(ficha.vidaActual, 999);
    assert.equal(ficha.fatigaActual, 999);
    assert.equal(ficha.schemaVersion, 9);
  });
});

describe("v9 → v10: los fármacos pasan de pieza equipada a recurso con cantidad", () => {
  test("suma las instancias equipadas de fármaco al recurso, agrupadas por tipo", () => {
    const { ficha } = migrar(
      {
        schemaVersion: 9,
        especieId: "humano",
        equipo: [
          { instanciaId: "f1", catalogoId: "farmaco_analgesico" },
          { instanciaId: "f2", catalogoId: "farmaco_analgesico" },
          { instanciaId: "f3", catalogoId: "farmaco_calmante" },
        ],
      },
      10,
    );
    assert.deepEqual(ficha.farmacos, { farmaco_analgesico: 2, farmaco_calmante: 1 });
    assert.equal(ficha.schemaVersion, 10);
  });

  test("las retira de equipo, sin tocar el resto de piezas equipadas", () => {
    const { ficha } = migrar(
      {
        schemaVersion: 9,
        equipo: [
          { instanciaId: "a1", catalogoId: "fusil_asalto_impetus" },
          { instanciaId: "f1", catalogoId: "farmaco_analgesico" },
        ],
      },
      10,
    );
    assert.deepEqual(ficha.equipo, [{ instanciaId: "a1", catalogoId: "fusil_asalto_impetus" }]);
  });

  test("una ficha sin ningún fármaco equipado arranca con el recurso vacío", () => {
    const { ficha } = migrar({ schemaVersion: 9, especieId: "humano" }, 10);
    assert.deepEqual(ficha.farmacos, {});
    assert.equal(ficha.schemaVersion, 10);
  });

  test("no toca el resto de la ficha", () => {
    const { ficha } = migrar({ schemaVersion: 9, especieId: "arkoru", edad: 40 }, 10);
    assert.equal(ficha.especieId, "arkoru");
    assert.equal(ficha.edad, 40);
  });
});

describe("v10 → v11: se añade el stock de munición especial", () => {
  test("una ficha v10 arranca sin munición especial y sin tocar el resto", () => {
    const { ficha } = migrar({ schemaVersion: 10, especieId: "arkoru", farmacos: { farmaco_analgesico: 2 } }, 11);
    assert.deepEqual(ficha.municionEspecial, {});
    assert.deepEqual(ficha.farmacos, { farmaco_analgesico: 2 });
    assert.equal(ficha.schemaVersion, 11);
  });

  test("parseSheet descarta tipos desconocidos y cantidades a 0", () => {
    const s = parseSheet({ schemaVersion: 11, municionEspecial: { incendiaria: 10, inventada: 5, toxica: 0 } });
    assert.deepEqual(s.municionEspecial, { incendiaria: 10 });
  });
});

describe("v14 → v15: viaEspecie en las piezas equipadas", () => {
  test("no mueve nada: ninguna pieza existente lleva la marca", () => {
    const equipo = [{ instanciaId: "a1", catalogoId: "kerzul_maza" }];
    const { ficha, aplicadas } = migrar({ schemaVersion: 14, especieId: "arkoru", equipo }, 15);
    assert.equal(ficha.schemaVersion, 15);
    assert.equal(aplicadas.length, 1);
    assert.deepEqual(ficha.equipo, equipo);
    assert.equal(parseSheet(ficha).equipo[0].viaEspecie, undefined);
  });

  test("parseSheet conserva la marca; una pieza con la marca mal formada se descarta entera, como cualquier pieza inválida", () => {
    const s = parseSheet({
      schemaVersion: 15,
      equipo: [
        { instanciaId: "a1", catalogoId: "kerzul_maza", viaEspecie: true },
        { instanciaId: "a2", catalogoId: "kerzul_punal", viaEspecie: "si" },
      ],
    });
    assert.equal(s.equipo[0].viaEspecie, true);
    assert.equal(s.equipo.length, 1);
  });
});

describe("parseSheet migra antes de normalizar", () => {
  test("una ficha v1 entra por la puerta y sale al día", () => {
    const s = parseSheet({ schemaVersion: 1, especie: "Arkorü", edad: 40 });
    assert.equal(s.schemaVersion, SCHEMA_VERSION);
    assert.equal(s.especieId, "arkoru");
    assert.equal(s.edad, 40);
  });

  test("y sigue validando contra el esquema", () => {
    assert.doesNotThrow(() =>
      parseSheet({ schemaVersion: 1, especie: "loquesea", atributos: { fuerza: 99 } }),
    );
  });
});

describe("v17 → v18: aumentos (eleccion en las piezas y bolsa gastada)", () => {
  test("arranca con la bolsa sin gastar y no toca el equipo", () => {
    const equipo = [{ instanciaId: "a1", catalogoId: "pistola_mosquito" }];
    const { ficha, aplicadas } = migrar({ schemaVersion: 17, especieId: "humano", equipo }, 18);
    assert.equal(ficha.schemaVersion, 18);
    assert.equal(aplicadas.length, 1);
    assert.equal(ficha.bolsaAumentosGastada, 0);
    assert.deepEqual(ficha.equipo, equipo);
  });

  test("parseSheet conserva la elección y recorta lo gastado", () => {
    const s = parseSheet({
      schemaVersion: 18,
      equipo: [{ instanciaId: "a1", catalogoId: "aum_brazo_bionico", nivel: 3, eleccion: "fuerte" }],
      bolsaAumentosGastada: -5,
    });
    assert.equal(s.equipo[0].eleccion, "fuerte");
    assert.equal(s.bolsaAumentosGastada, 0);
  });
});

describe("v18 → v19: usos por escena de los aumentos", () => {
  test("todas las fichas empiezan sin usos gastados y no se toca nada más", () => {
    const { ficha, aplicadas } = migrar({ schemaVersion: 18, bolsaAumentosGastada: 5, fatigaTemporal: 2 }, 19);
    assert.equal(ficha.schemaVersion, 19);
    assert.equal(aplicadas.length, 1);
    assert.deepEqual(ficha.usosEscena, []);
    assert.equal(ficha.bolsaAumentosGastada, 5);
    assert.equal(ficha.fatigaTemporal, 2);
  });

  test("una ficha v18 leída con parseSheet sale con la lista vacía", () => {
    assert.deepEqual(parseSheet({ schemaVersion: 18 }).usosEscena, []);
  });
});

describe("v19 → v20: arma incorporada del Brazo Biónico", () => {
  const equipo = [
    { instanciaId: "b", catalogoId: "aum_brazo_bionico", nivel: 2 },
    { instanciaId: "p", catalogoId: "pistola_mosquito" },
  ];

  test("las fichas viejas no traen vínculo y no se toca nada más", () => {
    const { ficha, aplicadas } = migrar({ schemaVersion: 19, equipo, usosEscena: [] }, 20);
    assert.equal(ficha.schemaVersion, 20);
    assert.equal(aplicadas.length, 1);
    assert.deepEqual(ficha.equipo, equipo);
    assert.deepEqual(ficha.usosEscena, []);
  });

  test("una ficha v19 leída con parseSheet sale sin arma incorporada", () => {
    const s = parseSheet({ schemaVersion: 19, equipo });
    assert.equal(s.schemaVersion, SCHEMA_VERSION);
    assert.equal(s.equipo.find((p) => p.instanciaId === "b")?.armaIncorporada, undefined);
  });
});

describe("v20 → v21: acciones favoritas", () => {
  test("todas las fichas empiezan sin favoritas y no se toca nada más", () => {
    const { ficha, aplicadas } = migrar({ schemaVersion: 20, usosEscena: ["x"], fatigaTemporal: 2 }, 21);
    assert.equal(ficha.schemaVersion, 21);
    assert.equal(aplicadas.length, 1);
    assert.deepEqual(ficha.favoritas, []);
    assert.deepEqual(ficha.usosEscena, ["x"]);
    assert.equal(ficha.fatigaTemporal, 2);
  });

  test("una ficha v20 leída con parseSheet sale sin favoritas", () => {
    const s = parseSheet({ schemaVersion: 20 });
    assert.equal(s.schemaVersion, SCHEMA_VERSION);
    assert.deepEqual(s.favoritas, []);
  });
});

describe("v21 → v22: especialidades de Combate a Distancia (foto de Drive 2026-10-23)", () => {
  const distancia = (ficha: Record<string, unknown>) =>
    (ficha.habilidades as Record<string, { valor: number; especialidades: string[] }>).combate_distancia;

  test("Cortas → Pistolas y Elásticas → Impulsoras; el resto se queda, sin duplicados", () => {
    const { ficha, aplicadas } = migrar(
      {
        schemaVersion: 21,
        habilidades: {
          combate_distancia: { valor: 3, especialidades: ["armas_de_fuego_cortas", "armas_elasticas", "armas_pesadas", "pistolas"] },
          combate_melee: { valor: 1, especialidades: ["pelea"] },
        },
      },
      22,
    );
    assert.equal(ficha.schemaVersion, 22);
    assert.equal(aplicadas.length, 1);
    assert.deepEqual(distancia(ficha), { valor: 3, especialidades: ["pistolas", "armas_impulsoras", "armas_pesadas"] });
    assert.deepEqual((ficha.habilidades as Record<string, unknown>).combate_melee, { valor: 1, especialidades: ["pelea"] });
    assert.deepEqual(ficha.avisoEspecialidades, []);
  });

  test("Largas → la del primer arma de fuego a dos manos equipada, por su tipo", () => {
    const equipo = [
      { instanciaId: "p", catalogoId: "pistola_bellum" },
      { instanciaId: "a", catalogoId: "armadura_pesada" },
      { instanciaId: "f", catalogoId: "fusil_asalto_impetus" },
      { instanciaId: "e", catalogoId: ARMAS.find((a) => a.tipo === "escopeta")!.id },
    ];
    const { ficha } = migrar(
      { schemaVersion: 21, equipo, habilidades: { combate_distancia: { valor: 2, especialidades: ["armas_de_fuego_largas"] } } },
      22,
    );
    assert.deepEqual(distancia(ficha).especialidades, ["fusiles_de_asalto"]);
    assert.deepEqual(ficha.equipo, equipo);
  });

  test("Largas sin arma de fuego a dos manos: se quita y queda en el aviso", () => {
    const { ficha } = migrar(
      {
        schemaVersion: 21,
        equipo: [{ instanciaId: "p", catalogoId: "pistola_bellum" }],
        avisoEspecialidades: ["Sigilo: Urbano"],
        habilidades: { combate_distancia: { valor: 2, especialidades: ["armas_de_fuego_largas", "armas_arrojadizas"] } },
      },
      22,
    );
    assert.deepEqual(distancia(ficha).especialidades, ["armas_arrojadizas"]);
    assert.deepEqual(ficha.avisoEspecialidades, [
      "Sigilo: Urbano",
      "Combate a Distancia: Armas de Fuego Largas (sin arma de fuego a dos manos equipada)",
    ]);
  });

  test("Crítico Mejorado sigue a su especialidad; sin arma a dos manos, la dote se quita", () => {
    const dotes = [
      { id: "dote_critico_mejorado", eleccion: "armas_de_fuego_cortas" },
      { id: "dote_critico_mejorado", eleccion: "armas_de_fuego_largas" },
      { id: "dote_critico_mejorado", eleccion: "pelea" },
    ];
    const conFusil = migrar({ schemaVersion: 21, dotes, equipo: [{ instanciaId: "f", catalogoId: "fusil_asalto_impetus" }] }, 22).ficha;
    assert.deepEqual(conFusil.dotes, [
      { id: "dote_critico_mejorado", eleccion: "pistolas" },
      { id: "dote_critico_mejorado", eleccion: "fusiles_de_asalto" },
      { id: "dote_critico_mejorado", eleccion: "pelea" },
    ]);
    const sinArma = migrar({ schemaVersion: 21, dotes }, 22).ficha;
    assert.deepEqual(sinArma.dotes, [
      { id: "dote_critico_mejorado", eleccion: "pistolas" },
      { id: "dote_critico_mejorado", eleccion: "pelea" },
    ]);
    assert.deepEqual(sinArma.avisoEspecialidades, ["Crítico Mejorado: Armas de Fuego Largas (dote quitada)"]);
  });

  test("una ficha v16 con texto viejo llega a la especialidad nueva pasando por la v17", () => {
    const s = parseSheet({
      schemaVersion: 16,
      equipo: [{ instanciaId: "f", catalogoId: "fusil_asalto_impetus" }],
      habilidades: { combate_distancia: { valor: 2, especialidades: ["Armas de Fuego Larga", "Armas de Fuego Cortas"] } },
    });
    assert.equal(s.schemaVersion, SCHEMA_VERSION);
    assert.deepEqual(s.habilidades.combate_distancia.especialidades, ["fusiles_de_asalto", "pistolas"]);
    assert.deepEqual(s.avisoEspecialidades, []);
  });
});

describe("v22 → v23: daño de vida por categoría", () => {
  test("añade el desglose a 0", () => {
    const { ficha } = migrar({ schemaVersion: 22, vidaActual: 4 }, 23);
    assert.equal(ficha.schemaVersion, 23);
    assert.deepEqual(ficha.danio, { noLetal: 0, letal: 0, grave: 0 });
  });

  test("una ficha vieja con vida perdida la lee como letal", () => {
    // Atributos a 0: vida máxima 10.
    const s = parseSheet({ schemaVersion: 22, vidaActual: 4 });
    assert.equal(s.schemaVersion, SCHEMA_VERSION);
    assert.equal(s.vidaActual, 4);
    assert.deepEqual(s.danio, { noLetal: 0, letal: 6, grave: 0 });
  });

  test("una ficha vieja a tope no ha perdido nada", () => {
    assert.deepEqual(parseSheet({ schemaVersion: 22 }).danio, { noLetal: 0, letal: 0, grave: 0 });
  });
});
