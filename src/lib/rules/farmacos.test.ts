import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import {
  accionesDeFarmacos,
  accionesDirectasDeFarmacos,
  ID_CASILLA_ANTIPATOGENO,
  ID_CASILLA_ULTRA_FISICAS,
  ID_CASILLA_ULTRA_INICIATIVA,
  PREFIJO_CASILLA_UMBRAL,
} from "./farmacos";
import { ACCIONES, type Accion } from "./acciones";
import { dificultadTrasCambio, estadoInicial } from "./condiciones";
import { equipar } from "./equipo";
import { conExtrasDeFicha, resolverFicha, VITALIDAD_DE_FICHA, type FichaResuelta, type VitalidadActual } from "./fichaResuelta";
import { montarTirada, SIN_ELECCION, type TiradaMontada } from "./montaje";
import type { EstadoActivo } from "./estados";

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

  test("Antipatógeno: casilla +3 en la salvación de Fortaleza mientras quede una dosis (o un Gel)", () => {
    const fila = (s: Sheet) => conExtrasDeFicha(resolver(s), ACCIONES.find((a) => a.id === "salv_fortaleza")!);
    assert.ok(!(fila(defaultSheet()).condiciones ?? []).some((c) => c.id === ID_CASILLA_ANTIPATOGENO));
    for (const id of ["farmaco_antipatogeno", "farmaco_gel_sanador"]) {
      const c = fila(conFarmaco(id, 1)).condiciones?.find((x) => x.id === ID_CASILLA_ANTIPATOGENO);
      assert.ok(c && c.tipo === "toggle" && c.valorActivo === 3, id);
    }
    assert.ok(!(fila(conFarmaco("farmaco_antipatogeno", 0)).condiciones ?? []).some((c) => c.id === ID_CASILLA_ANTIPATOGENO));
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

// S94: Ultra Estimulante, "+2 a la iniciativa y +1 a las acciones físicas basadas en Agilidad o
// Fuerza". Casilla siempre visible, como la de Xovromium.
describe("casilla «Bajo Ultra Estimulante»", () => {
  const resolver = (s: Sheet) => resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA });
  const f = resolver(defaultSheet());
  const accion = (id: string) => conExtrasDeFicha(f, ACCIONES.find((a) => a.id === id)!);
  const ids = (id: string) => (accion(id).condiciones ?? []).map((c) => c.id);
  const conUltra = (id: string, marcadas: string[]) => {
    const t = accion(id);
    const estado = { ...estadoInicial(t.condiciones ?? []), ...Object.fromEntries(marcadas.map((m) => [m, true])) };
    return montarTirada(f, t, { ...SIN_ELECCION, estadoCondiciones: estado }).total - montarTirada(f, t, { ...SIN_ELECCION, estadoCondiciones: estadoInicial(t.condiciones ?? []) }).total;
  };

  test("sale sin tener la dosis (como la de Xovromium)", () => {
    assert.ok(ids("carrera").includes(ID_CASILLA_ULTRA_FISICAS));
    assert.ok(ids("iniciativa").includes(ID_CASILLA_ULTRA_INICIATIVA));
  });

  test("+2 en la iniciativa, +1 en una tirada física (Carrera, con Reflejos)", () => {
    assert.equal(conUltra("iniciativa", [ID_CASILLA_ULTRA_INICIATIVA]), 2);
    assert.equal(conUltra("carrera", [ID_CASILLA_ULTRA_FISICAS]), 1);
  });

  test("no en las salvaciones ni en las tiradas mentales", () => {
    assert.ok(!ids("salv_reflejos").includes(ID_CASILLA_ULTRA_FISICAS));
    assert.ok(!ids("salv_fortaleza").includes(ID_CASILLA_ULTRA_FISICAS));
    assert.ok(!ids("discernir_mentiras").includes(ID_CASILLA_ULTRA_FISICAS));
  });

  test("una iniciativa con Reflejos lleva las dos, pero no se apilan: +2", () => {
    const t: Accion = { ...ACCIONES.find((a) => a.id === "iniciativa")!, aplicado: "reflejos" };
    const conExtras = conExtrasDeFicha(f, t);
    const cs = conExtras.condiciones ?? [];
    assert.ok(cs.some((c) => c.id === ID_CASILLA_ULTRA_FISICAS) && cs.some((c) => c.id === ID_CASILLA_ULTRA_INICIATIVA));
    const estado = { ...estadoInicial(cs), [ID_CASILLA_ULTRA_FISICAS]: true, [ID_CASILLA_ULTRA_INICIATIVA]: true };
    const sin = montarTirada(f, conExtras, { ...SIN_ELECCION, estadoCondiciones: estadoInicial(cs) }).total;
    assert.equal(montarTirada(f, conExtras, { ...SIN_ELECCION, estadoCondiciones: estado }).total - sin, 2);
  });
});

// fa-01 / fa-02 (usuario, 2026-11-13): Analgésico, Calmante y Gel Sanador −1 al penalizador por
// heridas; el Ultra, por heridas y fatiga. Casilla solo herido y con la dosis, solo esa tirada;
// entre fármacos vale el mayor; se suma a especie y aumentos.
describe("fármacos contra el penalizador por heridas y fatiga", () => {
  // Malherido (4/20, −3) y Fatigado (4/20, −1).
  const HERIDO_Y_FATIGADO: VitalidadActual = { origen: "combate", pgActual: 4, pgMax: 20, fatigaActual: 4, fatigaMax: 20 };
  const SOLO_FATIGADO: VitalidadActual = { origen: "combate", pgActual: 20, pgMax: 20, fatigaActual: 4, fatigaMax: 20 };
  const casilla = (id: string) => `${PREFIJO_CASILLA_UMBRAL}${id}`;
  const conDosis = (...ids: string[]): Sheet => ({ ...defaultSheet(), farmacos: Object.fromEntries(ids.map((i) => [i, 1])) });
  const atletismo = (f: FichaResuelta) => conExtrasDeFicha(f, ACCIONES.find((a) => a.id === "atletismo")!);
  const montar = (f: FichaResuelta, marcadas: string[]) => {
    const t = atletismo(f);
    const estado = { ...estadoInicial(t.condiciones ?? []), ...Object.fromEntries(marcadas.map((m) => [m, true])) };
    return montarTirada(f, t, { ...SIN_ELECCION, estadoCondiciones: estado });
  };
  const umbral = (m: TiradaMontada) =>
    m.desglose.filter((l) => /^(Malherido|Fatigado)|contra el penalizador/.test(l.etiqueta)).reduce((t, l) => t + l.valor, 0);
  const resolver = (s: Sheet, vitalidad: VitalidadActual, estados: EstadoActivo[] = []) => resolverFicha(s, { estados, vitalidad });
  const deFarmaco = (f: FichaResuelta) => (atletismo(f).condiciones ?? []).map((c) => c.id).filter((i) => i.startsWith(PREFIJO_CASILLA_UMBRAL));

  test("sin herida, o sin la dosis, no sale", () => {
    assert.deepEqual(deFarmaco(resolver(conDosis("farmaco_analgesico"), VITALIDAD_DE_FICHA)), []);
    assert.deepEqual(deFarmaco(resolver(defaultSheet(), HERIDO_Y_FATIGADO)), []);
    // El Analgésico es de heridas: solo con fatiga no sale; el Ultra sí.
    const fatigado = resolver(conDosis("farmaco_analgesico", "farmaco_ultra_estimulante"), SOLO_FATIGADO);
    assert.deepEqual(deFarmaco(fatigado), [casilla("farmaco_ultra_estimulante")]);
  });

  test("Analgésico marcado: Malherido −3 → −2, solo en esa tirada y sin gastar nada", () => {
    const f = resolver(conDosis("farmaco_analgesico"), HERIDO_Y_FATIGADO);
    assert.equal(umbral(montar(f, [])), -4);
    const m = montar(f, [casilla("farmaco_analgesico")]);
    assert.equal(umbral(m), -3);
    assert.deepEqual(
      m.desglose.filter((l) => /contra el penalizador/.test(l.etiqueta)),
      [{ etiqueta: "Analgésico contra el penalizador por heridas", valor: 1 }],
    );
    assert.equal(m.costeFatiga, 0);
  });

  test("Ultra: 1 menos de heridas y 1 de fatiga (Fatigado −1 → 0)", () => {
    const f = resolver(conDosis("farmaco_ultra_estimulante"), HERIDO_Y_FATIGADO);
    assert.equal(umbral(montar(f, [casilla("farmaco_ultra_estimulante")])), -2);
  });

  test("fa-02: entre fármacos solo vale el mayor; el que no suma lo dice", () => {
    const f = resolver(conDosis("farmaco_analgesico", "farmaco_gel_sanador", "farmaco_ultra_estimulante"), HERIDO_Y_FATIGADO);
    const dos = montar(f, [casilla("farmaco_analgesico"), casilla("farmaco_gel_sanador")]);
    assert.equal(umbral(dos), -3);
    assert.ok(dos.desglose.some((l) => /^Gel Sanador .*no se suma con Analgésico/.test(l.etiqueta) && l.valor === 0));
    // Con el Ultra, las heridas siguen con 1 menos y la fatiga baja aparte.
    assert.equal(umbral(montar(f, [casilla("farmaco_analgesico"), casilla("farmaco_ultra_estimulante")])), -2);
  });

  test("se suma a los aumentos y no pasa de 0", () => {
    const neuro: Sheet = {
      ...conDosis("farmaco_analgesico", "farmaco_ultra_estimulante"),
      equipo: [{ instanciaId: "n1", catalogoId: "aum_neuroprotesis_simpatica", nivel: 1 }],
    };
    const activa: EstadoActivo = { estadoId: "aum_neuroprotesis", gradoId: "activo", rondasRestantes: 3 };
    const f = resolver(neuro, HERIDO_Y_FATIGADO, [activa]);
    // Malherido −3 + 1 (Neuroprótesis) + 1 (Analgésico) = −1.
    const m = montar(f, [casilla("farmaco_analgesico")]);
    assert.equal(m.desglose.filter((l) => /^Malherido|^Analgésico/.test(l.etiqueta)).reduce((t, l) => t + l.valor, 0), -1);
    // Fatigado −1 + 1 ya es 0: el Ultra solo compensa el de heridas.
    const ultra = montar(f, [casilla("farmaco_ultra_estimulante")]);
    assert.equal(ultra.desglose.find((l) => /^Ultra Estimulante contra/.test(l.etiqueta))?.valor, 1);
  });

  test("Calmante y los Geles Avanzado y Nano-Elixir también; los demás fármacos, no", () => {
    const f = resolver(conDosis("farmaco_calmante", "farmaco_gel_sanador_avanzado", "farmaco_nano_elixir", "farmaco_hemostaticos"), HERIDO_Y_FATIGADO);
    assert.deepEqual(deFarmaco(f).sort(), [casilla("farmaco_calmante"), casilla("farmaco_gel_sanador_avanzado"), casilla("farmaco_nano_elixir")].sort());
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
