import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet } from "./sheet";
import {
  equipar,
  desequipar,
  validarInstalacion,
  ranurasSubsistemaUsadas,
  modificadoresDeEquipo,
  condicionesActivas,
  costeDePieza,
  costeDeRetirar,
  rarezaDePieza,
  rarezaPermitida,
  pesoDePieza,
  pesoEquipado,
  type PiezaEquipada,
} from "./equipo";

// La Armadura Ligera del slice: 1 ranura de subsistema (ver
// src/lib/catalog/equipo.ts). Los ids de instancia son deterministas aquí
// para que los tests no dependan de crypto.randomUUID().
function conArmaduraPuesta() {
  const armadura: PiezaEquipada = { instanciaId: "armadura-1", catalogoId: "armadura_ligera" };
  return equipar(defaultSheet(), armadura);
}

describe("equipar", () => {
  test("un arma o una armadura no necesitan dónde instalarse", () => {
    const s = equipar(defaultSheet(), { instanciaId: "a1", catalogoId: "pistola_mosquito" });
    assert.equal(s.equipo.length, 1);
  });

  test("un subsistema sin instaladoEnId se rechaza", () => {
    const s = equipar(defaultSheet(), { instanciaId: "c1", catalogoId: "camuflaje_trifasico" });
    assert.equal(s.equipo.length, 0);
  });

  test("una pieza que no existe en el catálogo se rechaza", () => {
    const s = equipar(defaultSheet(), { instanciaId: "x1", catalogoId: "no_existe" });
    assert.equal(s.equipo.length, 0);
  });

  test("un subsistema con hueco libre se instala", () => {
    const s = equipar(conArmaduraPuesta(), {
      instanciaId: "c1",
      catalogoId: "camuflaje_trifasico",
      nivel: 1,
      instaladoEnId: "armadura-1",
    });
    assert.equal(s.equipo.length, 2);
  });

  test("una mejora estándar se instala aunque no queden ranuras de subsistema", () => {
    let s = conArmaduraPuesta();
    s = equipar(s, {
      instanciaId: "c1",
      catalogoId: "camuflaje_trifasico",
      nivel: 1,
      instaladoEnId: "armadura-1",
    }); // la Armadura Ligera ya se queda sin ranuras (solo tiene 1)
    s = equipar(s, {
      instanciaId: "sv1",
      catalogoId: "soporte_vital",
      nivel: 1,
      instaladoEnId: "armadura-1",
    });
    assert.equal(s.equipo.length, 3);
  });
});

describe("validarInstalacion", () => {
  test("sin armadura puesta, se bloquea explicando el motivo", () => {
    const v = validarInstalacion(defaultSheet(), "camuflaje_trifasico", "armadura-1");
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /armadura/i);
  });

  test("con la única ranura ocupada, un subsistema DISTINTO se bloquea por ranura", () => {
    let s = conArmaduraPuesta();
    s = equipar(s, {
      instanciaId: "c1",
      catalogoId: "camuflaje_trifasico",
      nivel: 1,
      instaladoEnId: "armadura-1",
    });
    const v = validarInstalacion(s, "escudo_deflector", "armadura-1");
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /ranura/i);
  });

  test("el mismo subsistema ya instalado se bloquea por duplicado, no por ranura", () => {
    let s = conArmaduraPuesta();
    s = equipar(s, {
      instanciaId: "c1",
      catalogoId: "camuflaje_trifasico",
      nivel: 1,
      instaladoEnId: "armadura-1",
    });
    const v = validarInstalacion(s, "camuflaje_trifasico", "armadura-1");
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /ya lleva/i);
  });

  test("un arma no se puede \"instalar\" en una armadura", () => {
    const v = validarInstalacion(conArmaduraPuesta(), "pistola_mosquito", "armadura-1");
    assert.equal(v.ok, false);
  });
});

describe("mejoras de arma", () => {
  function conFusilAsaltoPuesto() {
    const arma: PiezaEquipada = { instanciaId: "arma-1", catalogoId: "fusil_asalto_impetus" };
    return equipar(defaultSheet(), arma);
  }

  test("sin arma equipada, se bloquea explicando el motivo", () => {
    const v = validarInstalacion(defaultSheet(), "mira_telescopica", "arma-1");
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /arma equipada/i);
  });

  test("compatible por tipo de arma: se instala en un fusil de asalto", () => {
    const s = equipar(conFusilAsaltoPuesto(), {
      instanciaId: "m1",
      catalogoId: "mira_telescopica",
      nivel: 1,
      instaladoEnId: "arma-1",
    });
    assert.equal(s.equipo.length, 2);
  });

  test("incompatible por tipo de arma: una pistola no admite Mira Telescópica", () => {
    const s = equipar(defaultSheet(), { instanciaId: "p1", catalogoId: "pistola_mosquito" });
    const v = validarInstalacion(s, "mira_telescopica", "p1");
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /compatible/i);
  });

  test("incompatible por categoría de daño: Sistema de Retroceso no va en armas de plasma", () => {
    const s = equipar(defaultSheet(), { instanciaId: "p1", catalogoId: "pistola_plasma_sd" });
    const v = validarInstalacion(s, "sistema_retroceso", "p1");
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /compatible/i);
  });

  test("un arma sin mejoras admitidas (0) rechaza cualquier mejora", () => {
    const s = equipar(defaultSheet(), { instanciaId: "p1", catalogoId: "pistola_mosquito" });
    const v = validarInstalacion(s, "silenciador", "p1"); // compatible con todas, pero Mosquito admite 0
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /no admite mejoras/i);
  });

  test("respeta el número de mejoras admitidas del arma", () => {
    // Impetus admite 3: caben Mira, Puntero y Silenciador, la cuarta se bloquea.
    let s = conFusilAsaltoPuesto();
    s = equipar(s, { instanciaId: "m1", catalogoId: "mira_telescopica", nivel: 1, instaladoEnId: "arma-1" });
    s = equipar(s, { instanciaId: "m2", catalogoId: "puntero_laser", nivel: 1, instaladoEnId: "arma-1" });
    s = equipar(s, { instanciaId: "m3", catalogoId: "silenciador", nivel: 1, instaladoEnId: "arma-1" });
    assert.equal(s.equipo.length, 4);
    const v = validarInstalacion(s, "bipode", "arma-1");
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /mejora\(s\) ocupadas/i);
  });

  test("la misma mejora no se puede instalar dos veces en la misma arma", () => {
    let s = conFusilAsaltoPuesto();
    s = equipar(s, { instanciaId: "m1", catalogoId: "mira_telescopica", nivel: 1, instaladoEnId: "arma-1" });
    const v = validarInstalacion(s, "mira_telescopica", "arma-1");
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /ya lleva/i);
  });

  test("quitar el arma se lleva las mejoras instaladas dentro", () => {
    let s = conFusilAsaltoPuesto();
    s = equipar(s, { instanciaId: "m1", catalogoId: "mira_telescopica", nivel: 1, instaladoEnId: "arma-1" });
    s = desequipar(s, "arma-1");
    assert.equal(s.equipo.length, 0);
  });

  test("Sistema de Retroceso aporta su modificador con origen \"equipo\"", () => {
    let s = conFusilAsaltoPuesto();
    s = equipar(s, {
      instanciaId: "sr1",
      catalogoId: "sistema_retroceso",
      nivel: 1,
      instaladoEnId: "arma-1",
    });
    const mods = modificadoresDeEquipo(s).filter((m) => m.fuente === "Sistema de Retroceso 1");
    assert.deepEqual(mods, [
      {
        tipo: "tirada",
        alcance: { tipo: "modo", contieneEtiqueta: "F. Auto" },
        valor: 1,
        origen: "equipo",
        fuente: "Sistema de Retroceso 1",
      },
    ]);
  });
});

describe("movimiento", () => {
  function conRopaReforzadaPuesta() {
    // Ropa Reforzada: topeExoesqueleto y topeMovilidadAerea a null (no admite).
    const armadura: PiezaEquipada = { instanciaId: "armadura-1", catalogoId: "ropa_reforzada" };
    return equipar(defaultSheet(), armadura);
  }

  test("sin armadura puesta, se bloquea explicando el motivo", () => {
    const v = validarInstalacion(defaultSheet(), "exoesqueleto", "armadura-1", 1);
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /armadura/i);
  });

  test("una armadura que no admite el módulo (tope null) se bloquea", () => {
    const v = validarInstalacion(conRopaReforzadaPuesta(), "exoesqueleto", "armadura-1", 1);
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /no admite/i);
  });

  test("sin nivel, se pide elegir uno", () => {
    // Armadura Ligera: topeExoesqueleto 2, sí admite.
    const v = validarInstalacion(conArmaduraPuesta(), "exoesqueleto", "armadura-1");
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /nivel/i);
  });

  test("un nivel dentro del tope se instala", () => {
    const s = equipar(conArmaduraPuesta(), {
      instanciaId: "e1",
      catalogoId: "exoesqueleto",
      nivel: 2,
      instaladoEnId: "armadura-1",
    });
    assert.equal(s.equipo.length, 2);
  });

  test("un nivel por encima del tope se bloquea", () => {
    // Armadura Ligera admite exoesqueleto hasta nivel 2.
    const v = validarInstalacion(conArmaduraPuesta(), "exoesqueleto", "armadura-1", 3);
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /nivel 2/);
  });

  test("el mismo módulo ya instalado se bloquea por duplicado", () => {
    let s = conArmaduraPuesta();
    s = equipar(s, {
      instanciaId: "e1",
      catalogoId: "exoesqueleto",
      nivel: 1,
      instaladoEnId: "armadura-1",
    });
    const v = validarInstalacion(s, "exoesqueleto", "armadura-1", 2);
    assert.equal(v.ok, false);
    assert.match((v as { motivo: string }).motivo, /ya lleva/i);
  });

  test("exoesqueleto y movilidad aérea usan cada uno su propio tope", () => {
    // Armadura Ligera: topeExoesqueleto 2, topeMovilidadAerea 2 — pero son
    // ranuras/topes independientes, así que caben los dos a la vez.
    let s = conArmaduraPuesta();
    s = equipar(s, {
      instanciaId: "e1",
      catalogoId: "exoesqueleto",
      nivel: 2,
      instaladoEnId: "armadura-1",
    });
    s = equipar(s, {
      instanciaId: "m1",
      catalogoId: "movilidad_aerea",
      nivel: 2,
      instaladoEnId: "armadura-1",
    });
    assert.equal(s.equipo.length, 3);
  });

  test("el bono de Fuerza del exoesqueleto no está mecanizado (queda en texto)", () => {
    const s = equipar(conArmaduraPuesta(), {
      instanciaId: "e1",
      catalogoId: "exoesqueleto",
      nivel: 1,
      instaladoEnId: "armadura-1",
    });
    const delExo = modificadoresDeEquipo(s).filter((m) => m.fuente.startsWith("Exoesqueleto"));
    assert.deepEqual(delExo, []);
  });
});

describe("ranurasSubsistemaUsadas", () => {
  test("cuenta solo los subsistemas de esa armadura, no las mejoras estándar", () => {
    let s = conArmaduraPuesta();
    s = equipar(s, {
      instanciaId: "c1",
      catalogoId: "camuflaje_trifasico",
      nivel: 1,
      instaladoEnId: "armadura-1",
    });
    assert.equal(ranurasSubsistemaUsadas(s, "armadura-1"), 1);
  });
});

describe("desequipar", () => {
  test("quitar una armadura se lleva lo que tenía instalado dentro", () => {
    let s = conArmaduraPuesta();
    s = equipar(s, {
      instanciaId: "c1",
      catalogoId: "camuflaje_trifasico",
      nivel: 1,
      instaladoEnId: "armadura-1",
    });
    s = desequipar(s, "armadura-1");
    assert.equal(s.equipo.length, 0);
  });

  test("quitar un arma no toca el resto del equipo", () => {
    let s = equipar(defaultSheet(), { instanciaId: "a1", catalogoId: "pistola_mosquito" });
    s = equipar(s, { instanciaId: "a2", catalogoId: "pistola_mosquito" });
    s = desequipar(s, "a1");
    assert.deepEqual(
      s.equipo.map((p) => p.instanciaId),
      ["a2"],
    );
  });
});

describe("modificadores de equipo", () => {
  test("un arma equipada aporta sus modificadores con origen \"equipo\"", () => {
    const s = equipar(defaultSheet(), { instanciaId: "a1", catalogoId: "pistola_mosquito" });
    const mods = modificadoresDeEquipo(s);
    assert.deepEqual(mods, [
      {
        tipo: "tirada",
        alcance: { tipo: "tiradaId", id: "ocultar_objeto" },
        valor: 2,
        origen: "equipo",
        fuente: "Mosquito",
      },
    ]);
  });

  test("una armadura equipada aporta los suyos", () => {
    const mods = modificadoresDeEquipo(conArmaduraPuesta());
    assert.equal(mods.length, 2);
    assert.ok(mods.every((m) => m.origen === "equipo" && m.fuente === "Armadura Ligera"));
  });

  test("un subsistema sin modificadores mecanizados no aporta nada (queda en texto)", () => {
    let s = conArmaduraPuesta();
    s = equipar(s, {
      instanciaId: "c1",
      catalogoId: "camuflaje_trifasico",
      nivel: 1,
      instaladoEnId: "armadura-1",
    });
    const delCamuflaje = modificadoresDeEquipo(s).filter((m) => m.fuente.startsWith("Camuflaje"));
    assert.deepEqual(delCamuflaje, []);
  });

  test("una mejora estándar con nivel instalado aporta los modificadores de ESE nivel", () => {
    let s = conArmaduraPuesta();
    s = equipar(s, {
      instanciaId: "sv1",
      catalogoId: "soporte_vital",
      nivel: 2,
      instaladoEnId: "armadura-1",
    });
    // Un único +1 a salv_fortaleza (Resistencia Térmica, cubre congelación y calor
    // extremo con el mismo bono) — antes había un duplicado que sumaba +2 real.
    const delSoporte = modificadoresDeEquipo(s).filter((m) => m.fuente === "Soporte Vital 2");
    assert.equal(delSoporte.length, 1);
    assert.equal(delSoporte[0]?.valor, 1);
  });

  test("sin nada equipado no hay modificadores de equipo", () => {
    assert.deepEqual(modificadoresDeEquipo(defaultSheet()), []);
  });
});

describe("condicionesActivas", () => {
  const ctxAlertaActiva = { id: "alerta_activa", grupo: "Acciones" as const, habilidad: "exploracion" as const, modoElegido: null };

  test("un Visor Nocturno n2 equipado aporta su toggle con alcance a alerta_activa", () => {
    let s = conArmaduraPuesta();
    s = equipar(s, {
      instanciaId: "vn1",
      catalogoId: "visor_nocturno",
      nivel: 2,
      instaladoEnId: "armadura-1",
    });
    const cs = condicionesActivas(s, ctxAlertaActiva);
    assert.equal(cs.length, 1);
    assert.equal(cs[0]?.id, "visor_nocturno_n2_activo");
  });

  test("nivel 1 del Visor Nocturno no aporta la condición de nivel 2", () => {
    let s = conArmaduraPuesta();
    s = equipar(s, {
      instanciaId: "vn1",
      catalogoId: "visor_nocturno",
      nivel: 1,
      instaladoEnId: "armadura-1",
    });
    assert.deepEqual(condicionesActivas(s, ctxAlertaActiva), []);
  });

  test("una tirada con otro id no recibe la condición del Visor Nocturno", () => {
    let s = conArmaduraPuesta();
    s = equipar(s, {
      instanciaId: "vn1",
      catalogoId: "visor_nocturno",
      nivel: 2,
      instaladoEnId: "armadura-1",
    });
    assert.deepEqual(
      condicionesActivas(s, { ...ctxAlertaActiva, id: "sigilo", habilidad: "sigilo" }),
      [],
    );
  });

  test("sin nada equipado no hay condiciones activas", () => {
    assert.deepEqual(condicionesActivas(defaultSheet(), ctxAlertaActiva), []);
  });

  test("una mejora de arma (Bípode) no se recoge aquí — vive en condicionesDeMejoras", () => {
    // Bípode no declara alcance hoy, así que ni haría falta este filtro —
    // pero confirma que mejoraArma queda fuera de condicionesActivas incluso
    // si algún día alguien le añadiera alcance por error.
    let s = equipar(defaultSheet(), { instanciaId: "a1", catalogoId: "fusil_asalto_impetus" });
    s = equipar(s, {
      instanciaId: "b1",
      catalogoId: "bipode",
      nivel: 1,
      instaladoEnId: "a1",
    });
    assert.deepEqual(
      condicionesActivas(s, { id: "x", grupo: "Ataques", habilidad: "combate_distancia", modoElegido: null }),
      [],
    );
  });
});

describe("costeDePieza", () => {
  test("armadura o arma: el coste del catálogo tal cual", () => {
    assert.equal(costeDePieza({ instanciaId: "a1", catalogoId: "armadura_ligera" }), 6000);
    assert.equal(costeDePieza({ instanciaId: "a2", catalogoId: "pistola_mosquito" }), 100);
  });

  test("instalable: el coste del nivel elegido, no el del primero", () => {
    assert.equal(
      costeDePieza({
        instanciaId: "c1",
        catalogoId: "camuflaje_trifasico",
        nivel: 1,
        instaladoEnId: "armadura-1",
      }),
      8000,
    );
  });

  test("arma melee sin coste en el catálogo (a mano vacía) cuesta 0", () => {
    assert.equal(costeDePieza({ instanciaId: "p1", catalogoId: "pelea_punetazo" }), 0);
  });

  test("pieza que no existe en el catálogo cuesta 0", () => {
    assert.equal(costeDePieza({ instanciaId: "x1", catalogoId: "no_existe" }), 0);
  });
});

describe("costeDeRetirar", () => {
  test("una armadura sola devuelve su propio coste", () => {
    assert.equal(costeDeRetirar(conArmaduraPuesta(), "armadura-1"), 6000);
  });

  test("una armadura con un subsistema instalado devuelve la suma de ambos", () => {
    let s = conArmaduraPuesta();
    s = equipar(s, {
      instanciaId: "c1",
      catalogoId: "camuflaje_trifasico",
      nivel: 1,
      instaladoEnId: "armadura-1",
    });
    assert.equal(costeDeRetirar(s, "armadura-1"), 6000 + 8000);
  });

  test("una instancia que no existe no devuelve nada", () => {
    assert.equal(costeDeRetirar(defaultSheet(), "no-existe"), 0);
  });
});

describe("rarezaDePieza", () => {
  test("armadura o arma: la rareza del catálogo tal cual", () => {
    assert.equal(rarezaDePieza({ instanciaId: "a1", catalogoId: "armadura_ligera" }), "Común");
    assert.equal(rarezaDePieza({ instanciaId: "a2", catalogoId: "pistola_mosquito" }), "Común");
  });

  test("instalable: la rareza del nivel elegido, no la del primero", () => {
    assert.equal(
      rarezaDePieza({
        instanciaId: "c1",
        catalogoId: "camuflaje_trifasico",
        nivel: 2,
        instaladoEnId: "armadura-1",
      }),
      "Extraño",
    );
  });

  test("pieza que no existe en el catálogo no tiene rareza", () => {
    assert.equal(rarezaDePieza({ instanciaId: "x1", catalogoId: "no_existe" }), null);
  });
});

describe("rarezaPermitida", () => {
  test("sin rareza asignada, siempre cabe", () => {
    assert.equal(rarezaPermitida(null, "Común"), true);
  });

  test("una rareza igual al tope cabe", () => {
    assert.equal(rarezaPermitida("Extraño", "Extraño"), true);
  });

  test("una rareza por debajo del tope cabe", () => {
    assert.equal(rarezaPermitida("Común", "Extraño"), true);
  });

  test("una rareza por encima del tope no cabe", () => {
    assert.equal(rarezaPermitida("Muy Extraño", "Extraño"), false);
  });
});

describe("pesoDePieza", () => {
  test("un arma de fuego suma su pesoKg", () => {
    assert.equal(pesoDePieza({ instanciaId: "a1", catalogoId: "pistola_mosquito" }), 0.5);
  });

  test("un arma melee con pesoKg suma su pesoKg", () => {
    assert.equal(pesoDePieza({ instanciaId: "e1", catalogoId: "escudo_rodela" }), 1);
  });

  test("un arma melee sin pesoKg (Pelea, no tiene el dato) pesa 0", () => {
    assert.equal(pesoDePieza({ instanciaId: "p1", catalogoId: "pelea_punetazo" }), 0);
  });

  test("un arma melee con Peso 'I' (insignificante) pesa 0, con dato", () => {
    // corta_tonfa_porra: EQUIP marca su Peso como "I" (leyenda del documento:
    // insignificante), no en blanco como Pelea — pesoKg es 0, no null.
    assert.equal(pesoDePieza({ instanciaId: "t1", catalogoId: "corta_tonfa_porra" }), 0);
  });

  test("una armadura pesa 0: el catálogo no tiene columna de Peso para ellas", () => {
    assert.equal(pesoDePieza({ instanciaId: "a1", catalogoId: "armadura_ligera" }), 0);
  });

  test("pieza que no existe en el catálogo pesa 0", () => {
    assert.equal(pesoDePieza({ instanciaId: "x1", catalogoId: "no_existe" }), 0);
  });
});

describe("pesoEquipado", () => {
  test("sin nada equipado, 0 kg", () => {
    assert.equal(pesoEquipado(defaultSheet()), 0);
  });

  test("suma el peso de cada pieza equipada", () => {
    let s = equipar(defaultSheet(), { instanciaId: "a1", catalogoId: "pistola_mosquito" });
    s = equipar(s, { instanciaId: "e1", catalogoId: "escudo_rodela" });
    assert.equal(pesoEquipado(s), 0.5 + 1);
  });

  test("una armadura equipada no suma nada, el resto sigue contando", () => {
    let s = equipar(defaultSheet(), { instanciaId: "a1", catalogoId: "armadura_ligera" });
    s = equipar(s, { instanciaId: "p1", catalogoId: "pistola_mosquito" });
    assert.equal(pesoEquipado(s), 0.5);
  });
});

describe("herramienta y consumible (Medicina, docs/traspaso.md §6)", () => {
  test("una herramienta se equipa sin host, eligiendo nivel", () => {
    const s = equipar(defaultSheet(), {
      instanciaId: "v1",
      catalogoId: "valija_tactica_medica",
      nivel: 1,
    });
    assert.equal(s.equipo.length, 1);
  });

  test("un consumible se equipa sin host ni nivel", () => {
    const s = equipar(defaultSheet(), { instanciaId: "f1", catalogoId: "farmaco_analgesico" });
    assert.equal(s.equipo.length, 1);
  });

  test("costeDePieza: herramienta cotiza por el nivel elegido", () => {
    assert.equal(
      costeDePieza({ instanciaId: "v1", catalogoId: "valija_tactica_medica", nivel: 1 }),
      4000,
    );
    assert.equal(
      costeDePieza({ instanciaId: "v1", catalogoId: "valija_tactica_medica", nivel: 3 }),
      48000,
    );
  });

  test("costeDePieza: consumible cotiza plano, como un arma", () => {
    assert.equal(costeDePieza({ instanciaId: "f1", catalogoId: "farmaco_analgesico" }), 5);
  });

  test("rarezaDePieza: herramienta y consumible, mismo criterio que el coste", () => {
    assert.equal(
      rarezaDePieza({ instanciaId: "v1", catalogoId: "valija_tactica_medica", nivel: 2 }),
      "Poco Habitual",
    );
    assert.equal(rarezaDePieza({ instanciaId: "f1", catalogoId: "farmaco_xovromium" }), "Extraño");
  });

  test("pesoDePieza: un consumible sin pesoKg (Medicina no trae columna de Peso) pesa 0", () => {
    assert.equal(pesoDePieza({ instanciaId: "f1", catalogoId: "farmaco_analgesico" }), 0);
  });

  test("modificadoresDeEquipo: la Valija Táctica Médica da su bono a la tirada de Medicina", () => {
    const s = equipar(defaultSheet(), {
      instanciaId: "v1",
      catalogoId: "valija_tactica_medica",
      nivel: 1,
    });
    assert.deepEqual(modificadoresDeEquipo(s), [
      {
        tipo: "tirada",
        alcance: { tipo: "tiradaId", id: "medicina" },
        valor: 1,
        origen: "equipo",
        fuente: "Valija Táctica Médica (VTM) 1",
      },
    ]);
  });

  test("modificadoresDeEquipo: en nivel 3 el bono sube a +2, no se suma al de nivel 1", () => {
    const s = equipar(defaultSheet(), {
      instanciaId: "v1",
      catalogoId: "valija_tactica_medica",
      nivel: 3,
    });
    const mods = modificadoresDeEquipo(s);
    assert.equal(mods.length, 1);
    assert.equal(mods[0].valor, 2);
  });

  test("modificadoresDeEquipo: los fármacos no aportan ningún modificador (bonos por dosis, no de personaje)", () => {
    const s = equipar(defaultSheet(), { instanciaId: "f1", catalogoId: "farmaco_nano_elixir" });
    assert.deepEqual(modificadoresDeEquipo(s), []);
  });
});

describe("armaPesada y granada (Armamento Pesado, bloque 3 del catálogo pendiente)", () => {
  test("se equipan sin host ni nivel, como un arma o un consumible", () => {
    let s = equipar(defaultSheet(), { instanciaId: "lg1", catalogoId: "lanzallamas_ligero" });
    s = equipar(s, { instanciaId: "g1", catalogoId: "granada_casera" });
    assert.equal(s.equipo.length, 2);
  });

  test("costeDePieza y rarezaDePieza: cotizan plano, como un arma", () => {
    assert.equal(costeDePieza({ instanciaId: "cp1", catalogoId: "canon_plasma" }), 210000);
    assert.equal(rarezaDePieza({ instanciaId: "cp1", catalogoId: "canon_plasma" }), "Muy Extraño");
    assert.equal(costeDePieza({ instanciaId: "g1", catalogoId: "granada_plasma" }), 2000);
    assert.equal(rarezaDePieza({ instanciaId: "g1", catalogoId: "granada_plasma" }), "Extraño");
  });

  test("pesoDePieza: armaPesada suma su pesoKg, granada pesa 0 (columna 'I' sin determinar)", () => {
    assert.equal(pesoDePieza({ instanciaId: "cp1", catalogoId: "canon_plasma" }), 9);
    assert.equal(pesoDePieza({ instanciaId: "g1", catalogoId: "granada_plasma" }), 0);
  });

  test("modificadoresDeEquipo: ninguna de las dos aporta bono de personaje (su número va en la tirada, no aquí)", () => {
    let s = equipar(defaultSheet(), { instanciaId: "cp1", catalogoId: "canon_plasma" });
    s = equipar(s, { instanciaId: "g1", catalogoId: "granada_plasma" });
    assert.deepEqual(modificadoresDeEquipo(s), []);
  });
});
