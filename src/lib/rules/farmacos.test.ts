import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { accionesDeFarmacos, accionesDirectasDeFarmacos, ID_CASILLA_ANTIPATOGENO } from "./farmacos";
import { ACCIONES, type Accion } from "./acciones";
import { dificultadTrasCambio, estadoInicial } from "./condiciones";
import { equipar } from "./equipo";
import { conExtrasDeFicha, resolverFicha, VITALIDAD_DE_FICHA, type FichaResuelta, type VitalidadActual } from "./fichaResuelta";
import { montarTirada, SIN_ELECCION, type TiradaMontada } from "./montaje";
import type { EstadoActivo } from "./estados";
import { ponerEstado } from "./estadosFicha";
import { estadoPorUso } from "./sigilo";
import { cambiosDeEstadoDe, consecuenciaPropia, estadosActivosDe, textoDeCambiosDeEstado } from "./consecuenciasPropias";

function conFarmaco(catalogoId: string, cantidad: number): Sheet {
  return { ...defaultSheet(), farmacos: { [catalogoId]: cantidad } };
}

describe("sin ningún fármaco en el pool", () => {
  test("ninguna fila con dado", () => {
    assert.deepEqual(accionesDeFarmacos(defaultSheet(), []), []);
  });

  test("tampoco ninguna acción sin dado", () => {
    assert.deepEqual(accionesDirectasDeFarmacos(defaultSheet(), []), []);
  });
});

describe("fármacos sin tirada (Analgésico, Antipatógeno, Ultra Estimulante)", () => {
  test("Analgésico: acción sin dado, con farmacoId y confirmarLabel 'Usar'", () => {
    const sheet = conFarmaco("farmaco_analgesico", 2);
    const [fila] = accionesDirectasDeFarmacos(sheet, []);
    assert.equal(fila.label, "Usar Analgésico");
    assert.equal(fila.grupo, "Fármacos");
    assert.equal(fila.confirmarLabel, "Usar");
    assert.equal(fila.farmacoId, "farmaco_analgesico");
    assert.match(fila.nota ?? "", /Quedan 2\./);
  });

  test("no genera ninguna fila con dado para el mismo fármaco", () => {
    const sheet = conFarmaco("farmaco_analgesico", 2);
    assert.deepEqual(accionesDeFarmacos(sheet, []), []);
  });
});

describe("fármacos con tirada", () => {
  test("Gel Sanador: Perspicacia + Biociencia, dificultad en la nota, sin ajustesFijos", () => {
    const sheet = conFarmaco("farmaco_gel_sanador", 1);
    const [fila] = accionesDeFarmacos(sheet, []);
    assert.equal(fila.label, "Usar Gel Sanador");
    assert.equal(fila.grupo, "Fármacos");
    assert.equal(fila.aplicado, "perspicacia");
    assert.equal(fila.habilidad, "biociencia");
    assert.equal(fila.farmacoId, "farmaco_gel_sanador");
    assert.match(fila.nota ?? "", /dificultad 4/i);
    assert.equal(fila.ajustesFijos, undefined);
  });

  test("Nano-Elixir: +5 real a la tirada, vía ajustesFijos (no es una dificultad)", () => {
    const sheet = conFarmaco("farmaco_nano_elixir", 1);
    const [fila] = accionesDeFarmacos(sheet, []);
    // au-07: con su grupo de no apilamiento frente al Enjambre Nanobot (vale el mayor).
    assert.deepEqual(fila.ajustesFijos, [{ valor: 5, fuente: "Nano-Elixir", noApila: "nanomedicina" }]);
  });

  test("Agentes Hemostáticos: los dos valores de dificultad viven en la nota", () => {
    const sheet = conFarmaco("farmaco_hemostaticos", 1);
    const [fila] = accionesDeFarmacos(sheet, []);
    assert.match(fila.nota ?? "", /7 normal/);
    assert.match(fila.nota ?? "", /9 en hemorragia exanguinante/);
  });

  test("no genera ninguna acción sin dado para el mismo fármaco", () => {
    const sheet = conFarmaco("farmaco_gel_sanador", 1);
    assert.deepEqual(accionesDirectasDeFarmacos(sheet, []), []);
  });
});

describe("cantidad 0 o ausente", () => {
  test("con cantidad 0 explícita, no genera fila", () => {
    const sheet = conFarmaco("farmaco_analgesico", 0);
    assert.deepEqual(accionesDeFarmacos(sheet, []), []);
    assert.deepEqual(accionesDirectasDeFarmacos(sheet, []), []);
  });
});

describe("Xovromium", () => {
  test("fila con tirada de Voluntad + la más alta de Biociencia o Actitud, dificultad 6", () => {
    const sheet = conFarmaco("farmaco_xovromium", 3);
    const [fila] = accionesDeFarmacos(sheet, []);
    assert.equal(fila.aplicado, "voluntad");
    assert.equal(fila.habilidad, "biociencia");
    assert.equal(fila.dificultadSugerida, 6);
    assert.equal(fila.farmacoId, "farmaco_xovromium");
    assert.deepEqual(accionesDirectasDeFarmacos(sheet, []), []);
    const conActitud: Sheet = { ...sheet, habilidades: { ...sheet.habilidades, actitud: { valor: 2, especialidades: [] } } };
    assert.equal(accionesDeFarmacos(conActitud, [])[0].habilidad, "actitud");
  });
});

describe("varios fármacos a la vez", () => {
  test("cada uno genera su propia fila, sin mezclarse", () => {
    const sheet: Sheet = {
      ...defaultSheet(),
      farmacos: { farmaco_analgesico: 1, farmaco_calmante: 3, farmaco_nano_elixir: 1 },
    };
    const conDado = accionesDeFarmacos(sheet, []).map((f) => f.label);
    const sinDado = accionesDirectasDeFarmacos(sheet, []).map((f) => f.label);
    assert.deepEqual(new Set(conDado), new Set(["Usar Calmante", "Usar Nano-Elixir"]));
    assert.deepEqual(sinDado, ["Usar Analgésico"]);
  });
});

// Regla general de especialidades (docs/sistema.md §3, usuario 2026-10-23).
describe("especialidad de los fármacos con tirada", () => {
  test("todos con Medicina fija, salvo el Xovromium, que no la nombra", () => {
    for (const id of [
      "farmaco_hemostaticos",
      "farmaco_estabilizadores_neurales",
      "farmaco_calmante",
      "farmaco_gel_sanador",
      "farmaco_gel_sanador_avanzado",
      "farmaco_nano_elixir",
    ]) {
      const [fila] = accionesDeFarmacos(conFarmaco(id, 1), []);
      assert.deepEqual(fila.especialidadesAccion, ["medicina"], id);
    }
    const [xovromium] = accionesDeFarmacos(conFarmaco("farmaco_xovromium", 1), []);
    assert.equal(xovromium.especialidadesAccion, undefined);
  });
});

// R4/R9/R10 (2026-10-24, docs/fuente/equipamiento.md, Medicina y Farmacia).
describe("Valija Médica, Antipatógeno y Estabilizadores Neurales", () => {
  const resolver = (s: Sheet) => resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA });
  const usar = (f: ReturnType<typeof resolver>, id: string) => {
    const t = conExtrasDeFicha(f, accionesDeFarmacos(f.ficha, []).find((a) => a.farmacoId === id)!);
    return montarTirada(f, t, { ...SIN_ELECCION, estadoCondiciones: estadoInicial(t.condiciones ?? []) });
  };

  test("la Valija suma su bono de aplicación al usar un fármaco (+1 a nivel 1, +3 a nivel 4)", () => {
    const sin = usar(resolver(conFarmaco("farmaco_gel_sanador", 1)), "farmaco_gel_sanador");
    for (const [nivel, bono] of [[1, 1], [4, 3]] as const) {
      const s = equipar(conFarmaco("farmaco_gel_sanador", 1), { instanciaId: "v", catalogoId: "valija_tactica_medica", nivel });
      const con = usar(resolver(s), "farmaco_gel_sanador");
      assert.equal(con.total - sin.total, bono);
      assert.ok(con.desglose.some((l) => l.etiqueta === `Valija Táctica Médica (VTM) ${nivel}` && l.valor === bono));
    }
  });

  // Oportunidad puntual (fármacos como estados, 2026-11-14): la casilla sale con el estado, no
  // con la dosis, y tirar con ella marcada lo gasta.
  test("Antipatógeno: casilla +3 en la salvación de Fortaleza solo con el estado «Antipatógeno»", () => {
    const ANTI: EstadoActivo = { estadoId: "antipatogeno", gradoId: "activo", rondasRestantes: null };
    const ficha = (s: Sheet, estados: EstadoActivo[]) => resolverFicha(s, { estados, vitalidad: VITALIDAD_DE_FICHA });
    const fila = (f: FichaResuelta) => conExtrasDeFicha(f, ACCIONES.find((a) => a.id === "salv_fortaleza")!);
    const casilla = (f: FichaResuelta) => fila(f).condiciones?.find((x) => x.id === ID_CASILLA_ANTIPATOGENO);
    // Con dosis y sin estado, nada.
    for (const id of ["farmaco_antipatogeno", "farmaco_gel_sanador"]) assert.equal(casilla(ficha(conFarmaco(id, 2), [])), undefined, id);
    const f = ficha(defaultSheet(), [ANTI]);
    const c = casilla(f);
    assert.ok(c && c.tipo === "toggle" && c.valorActivo === 3);
    const t = fila(f);
    const marcada = montarTirada(f, t, { ...SIN_ELECCION, estadoCondiciones: { ...estadoInicial(t.condiciones ?? []), [ID_CASILLA_ANTIPATOGENO]: true } });
    const sinMarcar = montarTirada(f, t, { ...SIN_ELECCION, estadoCondiciones: estadoInicial(t.condiciones ?? []) });
    assert.equal(marcada.total - sinMarcar.total, 3);
    assert.deepEqual(marcada.estadosGastados, ["antipatogeno"]);
    assert.deepEqual(sinMarcar.estadosGastados, []);
  });

  test("Estabilizadores Neurales purga un grado, no todo, salvo con crítico", () => {
    const [fila] = accionesDeFarmacos(conFarmaco("farmaco_estabilizadores_neurales", 1), []);
    assert.match(fila.nota ?? "", /purga un grado del aturdimiento; con éxito crítico, el estado entero/);
  });
});

// S94 (2026-10-24, docs/fuente/equipamiento.md, Fármacos): dificultades que ya da el documento.
describe("dificultad con la que se abre cada fármaco", () => {
  const sugerida = (id: string) => accionesDeFarmacos(conFarmaco(id, 1), [])[0].dificultadSugerida;

  test("Geles, Nano-Elixir y Calmante a 4; Estabilizadores Neurales a 6; Hemostáticos a 7", () => {
    for (const id of ["farmaco_gel_sanador", "farmaco_gel_sanador_avanzado", "farmaco_nano_elixir", "farmaco_calmante"]) {
      assert.equal(sugerida(id), 4, id);
    }
    assert.equal(sugerida("farmaco_estabilizadores_neurales"), 6);
    assert.equal(sugerida("farmaco_hemostaticos"), 7);
  });

  test("Hemostáticos: la hemorragia exanguinante pone 9, y la normal vuelve a 7", () => {
    const [fila] = accionesDeFarmacos(conFarmaco("farmaco_hemostaticos", 1), []);
    const cs = fila.condiciones ?? [];
    const estado = estadoInicial(cs);
    assert.equal(estado.hemostaticos_hemorragia, "normal");
    assert.equal(dificultadTrasCambio(cs, { ...estado, hemostaticos_hemorragia: "exanguinante" }, "hemostaticos_hemorragia", 7), 9);
    assert.equal(dificultadTrasCambio(cs, { ...estado, hemostaticos_hemorragia: "normal" }, "hemostaticos_hemorragia", 7), 7);
  });
});

// Fármacos como estados (usuario, 2026-11-14): el efecto con duración lo aplica su estado mientras
// dura, sin casillas. Sustituye a las casillas «contra dolor» (fa-01) y «Bajo Ultra Estimulante»
// (S94/td-14). Entre fármacos, contra el penalizador, vale el mayor (fa-02).
describe("fármacos con duración: el estado aplica el efecto", () => {
  // Malherido (4/20, −3) y Fatigado (4/20, −1).
  const HERIDO_Y_FATIGADO: VitalidadActual = { origen: "combate", pgActual: 4, pgMax: 20, fatigaActual: 4, fatigaMax: 20 };
  const activo = (estadoId: string): EstadoActivo => ({ estadoId, gradoId: "activo", rondasRestantes: null });
  const ANALGESICO = activo("bajo_analgesico");
  const CALMANTE = activo("bajo_calmante");
  const ULTRA = activo("bajo_ultra_estimulante");
  const resolver = (s: Sheet, estados: EstadoActivo[] = [], vitalidad: VitalidadActual = HERIDO_Y_FATIGADO) => resolverFicha(s, { estados, vitalidad });
  const tirada = (f: FichaResuelta, id: string, aplicado?: Accion["aplicado"]) => {
    const base = ACCIONES.find((a) => a.id === id)!;
    return conExtrasDeFicha(f, aplicado ? { ...base, aplicado } : base);
  };
  const montar = (f: FichaResuelta, id: string, aplicado?: Accion["aplicado"]): TiradaMontada => {
    const t = tirada(f, id, aplicado);
    return montarTirada(f, t, { ...SIN_ELECCION, estadoCondiciones: estadoInicial(t.condiciones ?? []) });
  };
  const umbral = (m: TiradaMontada) => m.desglose.filter((l) => /^(Malherido|Fatigado)/.test(l.etiqueta)).reduce((t, l) => t + l.valor, 0);
  const conTodos = conFarmaco("farmaco_analgesico", 3);
  const directa = (id: string) => accionesDirectasDeFarmacos(conFarmaco(id, 1), []).find((a) => a.farmacoId === id)!;
  const conTirada = (id: string) => accionesDeFarmacos(conFarmaco(id, 1), []).find((a) => a.farmacoId === id)!;

  test("usar el Analgésico o el Ultra pone su estado, hasta quitarlo", () => {
    assert.deepEqual(estadoPorUso(directa("farmaco_analgesico"), null), ANALGESICO);
    assert.deepEqual(estadoPorUso(directa("farmaco_ultra_estimulante"), null), ULTRA);
  });

  test("Calmante y Geles: superar la tirada pone su estado (los Geles, también el Antipatógeno); fallarla, nada", () => {
    const ANTI = activo("antipatogeno");
    const casos = [
      ["farmaco_calmante", [CALMANTE]],
      ["farmaco_gel_sanador", [ANALGESICO, ANTI]],
      ["farmaco_gel_sanador_avanzado", [ANALGESICO, ANTI]],
      ["farmaco_nano_elixir", [ANALGESICO, ANTI]],
    ] as const;
    for (const [id, estados] of casos) {
      for (const grado of ["exito", "critico"] as const) {
        const c = consecuenciaPropia(conTirada(id), { tipo: "grado", grado });
        assert.deepEqual(estadosActivosDe(c?.estados ?? []), estados, `${id} ${grado}`);
      }
      for (const grado of ["fracaso", "fracasoCritico"] as const) assert.equal(consecuenciaPropia(conTirada(id), { tipo: "grado", grado }), null, `${id} ${grado}`);
    }
  });

  test("con «Bajo Analgésico», Malherido −3 → −2 en cualquier tirada, sin casilla y con su fuente", () => {
    const f = resolver(conTodos, [ANALGESICO]);
    const m = montar(f, "atletismo");
    assert.equal(umbral(m), -3);
    assert.ok(m.desglose.some((l) => l.etiqueta === "Malherido (Bajo Analgésico)" && l.valor === -2));
    assert.ok(!(tirada(f, "atletismo").condiciones ?? []).some((c) => c.id.startsWith("farmaco_")));
  });

  test("sin el estado no hay bono, aunque queden dosis", () => {
    const f = resolver({ ...defaultSheet(), farmacos: { farmaco_analgesico: 2, farmaco_calmante: 2, farmaco_ultra_estimulante: 2, farmaco_gel_sanador: 2 } });
    assert.equal(umbral(montar(f, "atletismo")), -4);
    assert.equal(montar(f, "iniciativa").total, montar(resolver(defaultSheet()), "iniciativa").total);
    assert.ok(!(tirada(f, "atletismo").condiciones ?? []).some((c) => c.id.startsWith("farmaco_umbral_")));
  });

  test("renovar no acumula: ponerlo otra vez deja uno y el mismo −1", () => {
    const dos = ponerEstado([ANALGESICO], ANALGESICO);
    assert.deepEqual(dos, [ANALGESICO]);
    assert.equal(umbral(montar(resolver(conTodos, dos), "atletismo")), -3);
  });

  test("fa-02: dos fármacos con el mismo −1 no apilan (Analgésico y Calmante: −1, no −2)", () => {
    const f = resolver(conTodos, [ANALGESICO, CALMANTE]);
    assert.equal(umbral(montar(f, "atletismo")), -3);
    assert.ok(montar(f, "atletismo").desglose.some((l) => l.etiqueta === "Malherido (Bajo Analgésico o Bajo Calmante)"));
    // Con el Ultra, las heridas siguen con 1 menos y la fatiga baja aparte (Fatigado −1 → 0).
    assert.equal(umbral(montar(resolver(conTodos, [ANALGESICO, ULTRA]), "atletismo")), -2);
  });

  test("se suma a los aumentos y no pasa de 0", () => {
    const neuro: Sheet = { ...conTodos, equipo: [{ instanciaId: "n1", catalogoId: "aum_neuroprotesis_simpatica", nivel: 1 }] };
    const neuroActiva: EstadoActivo = { estadoId: "aum_neuroprotesis", gradoId: "activo", rondasRestantes: 3 };
    // Malherido −3 + 1 (Neuroprótesis) + 1 (Analgésico) = −1; Fatigado −1 + 1 + 1 se queda en 0.
    const f = resolver(neuro, [neuroActiva, ULTRA]);
    const m = montar(f, "atletismo");
    assert.equal(m.desglose.filter((l) => /^Malherido/.test(l.etiqueta)).reduce((t, l) => t + l.valor, 0), -1);
    assert.ok(!m.desglose.some((l) => /^Fatigado/.test(l.etiqueta)));
  });

  test("Bajo Ultra Estimulante: +2 en la iniciativa y +1 en una física (Carrera), sin casillas", () => {
    const sin = resolver(defaultSheet(), [], VITALIDAD_DE_FICHA);
    const con = resolver(defaultSheet(), [ULTRA], VITALIDAD_DE_FICHA);
    assert.equal(montar(con, "iniciativa").total - montar(sin, "iniciativa").total, 2);
    assert.equal(montar(con, "carrera").total - montar(sin, "carrera").total, 1);
    assert.deepEqual(tirada(con, "carrera").condiciones ?? [], []);
  });

  test("Bajo Ultra Estimulante: nada en las salvaciones ni en las tiradas mentales", () => {
    const sin = resolver(defaultSheet(), [], VITALIDAD_DE_FICHA);
    const con = resolver(defaultSheet(), [ULTRA], VITALIDAD_DE_FICHA);
    for (const id of ["salv_reflejos", "salv_fortaleza", "discernir_mentiras"]) {
      assert.equal(montar(con, id).total, montar(sin, id).total, id);
    }
  });

  test("Bajo Ultra Estimulante: una iniciativa con Reflejos se queda en +2 (no se apilan)", () => {
    const sin = resolver(defaultSheet(), [], VITALIDAD_DE_FICHA);
    const con = resolver(defaultSheet(), [ULTRA], VITALIDAD_DE_FICHA);
    assert.equal(montar(con, "iniciativa", "reflejos").total - montar(sin, "iniciativa", "reflejos").total, 2);
  });

  test("Bajo Ultra Estimulante: −1 a heridas y −1 a fatiga", () => {
    assert.equal(umbral(montar(resolver(conTodos, [ULTRA]), "atletismo")), -2);
  });
});

describe("Enjambre Nanobot 1: +3 a las medicinas sobre ti mismo (au-07)", () => {
  const ENJAMBRE = { instanciaId: "enj", catalogoId: "aum_enjambre_nanobot", nivel: 1 };
  const base: Sheet = {
    ...defaultSheet(),
    farmacos: { farmaco_gel_sanador: 1, farmaco_nano_elixir: 1, farmaco_analgesico: 1 },
    vidaActual: 10,
    fatigaActual: 10,
  };
  const conEnjambre = (nivel = 1): Sheet => ({ ...base, equipo: [{ ...ENJAMBRE, nivel }] });
  const ficha = (s: Sheet, estados: EstadoActivo[] = []) => resolverFicha(s, { estados, vitalidad: VITALIDAD_DE_FICHA });
  const filas = (f: FichaResuelta): Accion[] =>
    [ACCIONES.find((a) => a.id === "medicina")!, ...accionesDeFarmacos(f.ficha, [])].map((t) => conExtrasDeFicha(f, t));
  const fila = (f: FichaResuelta, id: string) => filas(f).find((t) => t.id === id)!;
  const casilla = (t: Accion) => (t.condiciones ?? []).find((c) => c.id.startsWith("aum_enjambre_sobre_ti"));
  const marcada = (f: FichaResuelta, t: Accion): TiradaMontada => {
    const c = casilla(t);
    assert.ok(c, t.id);
    return montarTirada(f, t, { ...SIN_ELECCION, estadoCondiciones: { ...estadoInicial(t.condiciones ?? []), [c.id]: true } });
  };
  const sinMarcar = (f: FichaResuelta, t: Accion): TiradaMontada =>
    montarTirada(f, t, { ...SIN_ELECCION, estadoCondiciones: estadoInicial(t.condiciones ?? []) });

  test("casilla en Tratar heridas y en los fármacos con tirada, con el origen de la pieza", () => {
    const f = ficha(conEnjambre());
    for (const id of ["medicina", "farmaco_farmaco_gel_sanador", "farmaco_farmaco_nano_elixir"]) {
      const c = casilla(fila(f, id));
      assert.ok(c, id);
      assert.equal(c.tipo, "toggle");
      assert.match(c.etiqueta, /^Sobre ti mismo · Enjambre Nanobot 1/);
      assert.equal(c.origen?.instanciaId, "enj");
    }
    // Los fármacos sin tirada no tiran: nada que marcar.
    assert.ok(accionesDirectasDeFarmacos(f.ficha, []).some((a) => a.farmacoId === "farmaco_analgesico"));
  });

  test("marcada suma +3 en Tratar heridas y en el Gel", () => {
    const f = ficha(conEnjambre());
    for (const id of ["medicina", "farmaco_farmaco_gel_sanador"]) {
      const t = fila(f, id);
      assert.equal(marcada(f, t).total - sinMarcar(f, t).total, 3, id);
    }
  });

  // Sync Drive 2026-11-14 (M4.2): «+3 en pruebas» con fármacos, «también se aplica» si te los da
  // otro. Eso último es un aviso: la app no toca la tirada de quien te cura.
  test("+3 en el Gel también con un nivel alto, y la nota avisa de que vale si te los aplica otro", () => {
    const f = ficha(conEnjambre(3));
    const t = fila(f, "farmaco_farmaco_gel_sanador");
    assert.equal(marcada(f, t).total - sinMarcar(f, t).total, 3);
    const c = casilla(t);
    assert.ok(c && c.tipo === "toggle");
    assert.match(c.nota ?? "", /Si te los aplica otro, también se aplica el \+3: díselo y que lo sume en su tirada/);
  });

  test("con el Nano-Elixir no se suma: vale el +5 y la casilla queda a 0 diciendo por qué", () => {
    const f = ficha(conEnjambre());
    const t = fila(f, "farmaco_farmaco_nano_elixir");
    const m = marcada(f, t);
    assert.equal(m.total, sinMarcar(f, t).total);
    assert.ok(m.desglose.some((l) => l.etiqueta === "Nano-Elixir" && l.valor === 5));
    assert.ok(m.desglose.some((l) => /Sobre ti mismo .*no se suma con Nano-Elixir/.test(l.etiqueta) && l.valor === 0));
  });

  test("los niveles altos la conservan (se acumulan por id)", () => {
    const f = ficha(conEnjambre(4));
    assert.equal(casilla(fila(f, "medicina"))?.tipo, "toggle");
  });

  test("solo en la ficha de quien lo lleva", () => {
    const f = ficha(base);
    for (const t of filas(f)) assert.equal(casilla(t), undefined, t.id);
  });

  test("el Shock del cuerpo la ve: fracaso, +1; fracaso crítico, fuera", () => {
    const shock = (gradoId: string): EstadoActivo => ({ estadoId: "shock", gradoId, rondasRestantes: 1 });
    const pen = ficha(conEnjambre(), [shock("fracaso")]);
    const t = fila(pen, "medicina");
    assert.equal(marcada(pen, t).total - sinMarcar(pen, t).total, 1);
    const apagada = ficha(conEnjambre(), [shock("fracaso_critico")]);
    assert.equal(casilla(fila(apagada, "medicina")), undefined);
  });
});

// Instantáneos (fármacos como estados, usuario 2026-11-14): lo que hacen se aplica en el acto,
// según el grado de su tirada, sobre lo que lleva quien tira.
describe("fármacos instantáneos: Hemostáticos y Estabilizadores Neurales", () => {
  const fila = (id: string) => accionesDeFarmacos(conFarmaco(id, 1), []).find((a) => a.farmacoId === id)!;
  const puesto = (estadoId: string, gradoId = "activo"): EstadoActivo => ({ estadoId, gradoId, rondasRestantes: 2 });
  const cambios = (id: string, grado: "critico" | "exito" | "fracaso" | "fracasoCritico", actuales: EstadoActivo[]) => {
    const c = consecuenciaPropia(fila(id), { tipo: "grado", grado });
    return c ? cambiosDeEstadoDe(c, actuales) : null;
  };

  test("Hemostáticos: con éxito o crítico te quita la Hemorragia; fallando, nada", () => {
    for (const grado of ["exito", "critico"] as const) {
      assert.deepEqual(cambios("farmaco_hemostaticos", grado, [puesto("hemorragia"), puesto("derribado")]), [{ tipo: "quitar", estadoId: "hemorragia" }], grado);
    }
    for (const grado of ["fracaso", "fracasoCritico"] as const) assert.equal(cambios("farmaco_hemostaticos", grado, [puesto("hemorragia")]), null, grado);
  });

  test("Hemostáticos sin Hemorragia puesta: nada que quitar, y lo dice", () => {
    const c = consecuenciaPropia(fila("farmaco_hemostaticos"), { tipo: "grado", grado: "exito" })!;
    assert.deepEqual(cambiosDeEstadoDe(c, []), []);
    assert.equal(textoDeCambiosDeEstado(c, []), "No llevas Hemorragia: nada que quitar.");
  });

  test("Estabilizadores: el éxito baja un grado el Aturdido (fracaso crítico → fracaso → éxito → fuera)", () => {
    const baja = (gradoId: string) => cambios("farmaco_estabilizadores_neurales", "exito", [puesto("aturdido", gradoId)]);
    assert.deepEqual(baja("fracaso_critico"), [{ tipo: "poner", estado: puesto("aturdido", "fracaso") }]);
    assert.deepEqual(baja("fracaso"), [{ tipo: "poner", estado: puesto("aturdido", "exito") }]);
    assert.deepEqual(baja("exito"), [{ tipo: "quitar", estadoId: "aturdido" }]);
    const c = consecuenciaPropia(fila("farmaco_estabilizadores_neurales"), { tipo: "grado", grado: "exito" })!;
    assert.equal(textoDeCambiosDeEstado(c, baja("fracaso_critico")!), "Aturdido baja a Fracaso.");
  });

  test("Estabilizadores: el crítico quita el Aturdido entero; fallando, nada", () => {
    assert.deepEqual(cambios("farmaco_estabilizadores_neurales", "critico", [puesto("aturdido", "fracaso_critico")]), [{ tipo: "quitar", estadoId: "aturdido" }]);
    for (const grado of ["fracaso", "fracasoCritico"] as const) assert.equal(cambios("farmaco_estabilizadores_neurales", grado, [puesto("aturdido", "fracaso")]), null, grado);
  });
});
