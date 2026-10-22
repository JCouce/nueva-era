import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { equipar } from "./equipo";
import { conExtrasDeFicha, notasDeEstado, resolverFicha, VITALIDAD_DE_FICHA, type FichaResuelta } from "./fichaResuelta";
import { ACCIONES, type Accion } from "./acciones";
import { accionesDeAtaque } from "./combate";
import { estadoInicial, type CondicionTirada, type EstadoCondiciones } from "./condiciones";
import { montarTirada, SIN_ELECCION, type TiradaMontada } from "./montaje";
import { desgloseBlindaje } from "./blindaje";
import { casillasDeAumentos, ID_SELECTOR_CONTRA } from "./aumentosTiradas";

let n = 0;
function con(sheet: Sheet, catalogoId: string, extra: { nivel?: number; eleccion?: string } = {}): Sheet {
  return { ...sheet, equipo: [...sheet.equipo, { instanciaId: `a${++n}`, catalogoId, ...extra }] };
}
const conTodas = (ids: string[], base = defaultSheet()) => ids.reduce((s, id) => con(s, id), base);

const BIOGENESIS = "aum_biogenesis_mitocondrial";
const MATRIZ_OSEA = "aum_matriz_osea_adaptativa";
const ANGIOGENESIS = "aum_angiogenesis_sistemica"; // pide Matriz Ósea y Biogénesis
const RESILIENCIA = "aum_resiliencia_homeostatica"; // pide Angiogénesis
const REGULACION = "aum_regulacion_limbico_prefrontal";
const PROYECCION = "aum_proyeccion_neuro_expresiva"; // pide Regulación
const MATRIZ_RED = "aum_matriz_de_red_predeterminada"; // pide Proyección
const ESTABILIZACION = "aum_estabilizacion_autonomica";
const FOVEO = "aum_optimizacion_foveo_sensorial";
const VESTIBULO = "aum_optimizacion_vestibulo_auditiva"; // pide Foveo
const OSTEO = "aum_integridad_osteotendinosa";
const INTROGRESION = "aum_introgresion_sensorial_heterologa";
const OJO = "aum_ojo_bionico";
const ENJAMBRE = "aum_enjambre_nanobot";

const resolver = (s: Sheet) => resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA });
const tiradaFija = (f: FichaResuelta, id: string): Accion => conExtrasDeFicha(f, ACCIONES.find((a) => a.id === id)!);

function montar(f: FichaResuelta, t: Accion, cambios: EstadoCondiciones = {}): TiradaMontada {
  return montarTirada(f, t, { ...SIN_ELECCION, estadoCondiciones: { ...estadoInicial(t.condiciones ?? []), ...cambios } });
}

function selector(t: Accion): Extract<CondicionTirada, { tipo: "opcion" }> {
  const c = t.condiciones?.find((x) => x.id.startsWith(ID_SELECTOR_CONTRA));
  assert.ok(c && c.tipo === "opcion", `sin selector en ${t.id}`);
  return c;
}

describe("selector «Contra…» de las salvaciones", () => {
  test("sin aumentos no hay selector", () => {
    const t = tiradaFija(resolver(defaultSheet()), "salv_fortaleza");
    assert.equal(t.condiciones, undefined);
  });

  test("Biogénesis + Resiliencia contra venenos: ventaja sin coste", () => {
    const f = resolver(conTodas([BIOGENESIS, MATRIZ_OSEA, ANGIOGENESIS, RESILIENCIA]));
    const t = tiradaFija(f, "salv_fortaleza");
    const sel = selector(t);
    assert.equal(sel.porDefecto, "nada");
    assert.ok(!sel.opciones.some((o) => o.id === "venenos_fatiga"), "no se ofrece la de pago");
    const m = montar(f, t, { [sel.id]: "venenos" });
    assert.equal(m.ventaja, "Resiliencia Homeostática");
    assert.equal(m.costeFatiga, 0);
    // Térmicos solo los da Resiliencia; la de Voluntad no sale.
    assert.ok(sel.opciones.some((o) => o.id === "termicos"));
    assert.equal(tiradaFija(f, "salv_voluntad").condiciones, undefined);
  });

  test("solo Biogénesis contra venenos: ventaja pagando 1 de fatiga; sin elegirla, nada", () => {
    const f = resolver(conTodas([BIOGENESIS]));
    const t = tiradaFija(f, "salv_fortaleza");
    const sel = selector(t);
    assert.deepEqual(
      sel.opciones.map((o) => o.id),
      ["nada", "asfixia_fatiga", "toxinas_fatiga", "venenos_fatiga"],
    );
    const m = montar(f, t, { [sel.id]: "venenos_fatiga" });
    assert.equal(m.ventaja, "Biogénesis Mitocondrial");
    assert.equal(m.costeFatiga, 1);
    const sinTocar = montar(f, t);
    assert.equal(sinTocar.ventaja, null);
    assert.equal(sinTocar.costeFatiga, 0);
  });

  test("Biogénesis + Enjambre 3 contra venenos: +4 sin pagar, o +4 con ventaja pagando", () => {
    const f = resolver(con(conTodas([BIOGENESIS]), ENJAMBRE, { nivel: 3 }));
    const t = tiradaFija(f, "salv_fortaleza");
    const sel = selector(t);
    const base = montar(f, t);
    const sinPagar = montar(f, t, { [sel.id]: "venenos" });
    assert.equal(sinPagar.modificador - base.modificador, 4);
    assert.equal(sinPagar.ventaja, null);
    const pagando = montar(f, t, { [sel.id]: "venenos_fatiga" });
    assert.equal(pagando.modificador - base.modificador, 4);
    assert.equal(pagando.costeFatiga, 1);
    assert.ok(pagando.ventaja);
  });

  test("Regulación + Matriz de Red contra dominación: +3, una línea por fuente", () => {
    const f = resolver(conTodas([REGULACION, PROYECCION, MATRIZ_RED]));
    const t = tiradaFija(f, "salv_voluntad");
    const sel = selector(t);
    const base = montar(f, t);
    const m = montar(f, t, { [sel.id]: "dominacion_mental" });
    assert.equal(m.modificador - base.modificador, 3);
    const lineas = m.desglose.filter((l) => l.etiqueta.startsWith("Contra…"));
    assert.deepEqual(lineas, [
      { etiqueta: "Contra…: Dominación mental · Regulación Límbico-Prefrontal", valor: 1 },
      { etiqueta: "Contra…: Dominación mental · Matriz de Red Predeterminada", valor: 2 },
    ]);
    // Coerción solo la cubre Regulación.
    assert.equal(montar(f, t, { [sel.id]: "coercion" }).modificador - base.modificador, 1);
  });

  test("Regulación + Estabilización contra miedo: +3; la Matriz deja su nota en Voluntad", () => {
    const f = resolver(conTodas([REGULACION, ESTABILIZACION, PROYECCION, MATRIZ_RED]));
    const t = tiradaFija(f, "salv_voluntad");
    const base = montar(f, t);
    assert.equal(montar(f, t, { [selector(t).id]: "miedo" }).modificador - base.modificador, 3);
    assert.match(t.nota ?? "", /repetir la salvación al final de cada uno de sus turnos/);
    // Estabilización también en Fortaleza: aturdimiento y shock.
    const fort = tiradaFija(f, "salv_fortaleza");
    assert.deepEqual(selector(fort).opciones.map((o) => o.id), ["nada", "aturdimiento", "shock"]);
  });

  test("ceguera por detonación suma lo de la ceguera y lo de la visión nocturna", () => {
    const s = con(con(con(defaultSheet(), FOVEO), VESTIBULO), INTROGRESION, { eleccion: "vision_nocturna" });
    const f = resolver(con(s, OJO, { nivel: 1 }));
    const t = tiradaFija(f, "salv_fortaleza");
    const sel = selector(t);
    const base = montar(f, t);
    assert.equal(montar(f, t, { [sel.id]: "ceguera" }).modificador - base.modificador, 4);
    assert.equal(montar(f, t, { [sel.id]: "ceguera_detonacion" }).modificador - base.modificador, 6);
  });

  test("una operación con el requisito roto no aporta casillas ni opciones", () => {
    // Resiliencia sin Angiogénesis; Vestíbulo sin Foveo; Matriz de Red sin Proyección.
    const s = conTodas([RESILIENCIA, VESTIBULO, MATRIZ_RED]);
    assert.deepEqual(casillasDeAumentos(s), []);
    const f = resolver(s);
    assert.equal(tiradaFija(f, "salv_fortaleza").condiciones, undefined);
    assert.equal(tiradaFija(f, "alerta_activa").condiciones, undefined);
    assert.ok(!(tiradaFija(f, "salv_voluntad").nota ?? "").includes("dominado"));
  });
});

describe("no apilamiento de la visión aumentada (Ojo Biónico y mira)", () => {
  function fusilConMira(nivelMira: number, nivelOjo: number): FichaResuelta {
    let s = equipar(defaultSheet(), { instanciaId: "f1", catalogoId: "fusil_asalto_impetus" });
    s = equipar(s, { instanciaId: "m1", catalogoId: "mira_telescopica", nivel: nivelMira, instaladoEnId: "f1" });
    return resolver(con(s, OJO, { nivel: nivelOjo }));
  }
  const disparo = (f: FichaResuelta) =>
    accionesDeAtaque(f.ficha, f.modificadores, f.extrasDotes.permisos).find((t) => t.label === "Disparar con Impetus")!;
  const sinOjo = (nivelMira: number) => {
    let s = equipar(defaultSheet(), { instanciaId: "f1", catalogoId: "fusil_asalto_impetus" });
    s = equipar(s, { instanciaId: "m1", catalogoId: "mira_telescopica", nivel: nivelMira, instaladoEnId: "f1" });
    return resolver(s);
  };

  test("Ojo 1 (+1) con mira 3 (+2) a media: vale la mira; el Ojo sale a 0 diciendo por qué", () => {
    const f = fusilConMira(3, 1);
    const m = montar(f, disparo(f), { tramo: "media" });
    const ref = montar(sinOjo(3), disparo(sinOjo(3)), { tramo: "media" });
    assert.equal(m.modificador, ref.modificador);
    assert.ok(m.desglose.some((l) => l.etiqueta === "Ojo Biónico 1 (no se suma con Mira Telescópica)" && l.valor === 0));
  });

  test("Ojo 4 (+3) con mira 1 (+1) a media: vale el Ojo; a corta (la mira no da nada), el Ojo también", () => {
    const f = fusilConMira(1, 4);
    const ref = sinOjo(1);
    const media = montar(f, disparo(f), { tramo: "media" });
    assert.equal(media.modificador - montar(ref, disparo(ref), { tramo: "media" }).modificador, 2);
    const corta = montar(f, disparo(f), { tramo: "corta" });
    assert.equal(corta.modificador - montar(ref, disparo(ref), { tramo: "corta" }).modificador, 3);
  });

  test("Ojo 2 sigue con el +1 a distancia del nivel 1", () => {
    const f = resolver(con(defaultSheet(), OJO, { nivel: 2 }));
    const distancia = f.modificadores.filter((m) => m.tipo === "tirada" && m.fuente === "Ojo Biónico 2");
    assert.deepEqual(distancia.map((m) => m.valor), [1]);
  });

  test("en Alerta activa: la casilla visual del Ojo 3 (+3) y buscar con mira 1 (+1) dan +3", () => {
    const f = fusilConMira(1, 3);
    const t = tiradaFija(f, "alerta_activa");
    const base = montar(f, t);
    const ambas = montar(f, t, { aum_ojo_visual: true, mira_telescopica_busqueda: true });
    assert.equal(ambas.modificador - base.modificador, 3);
  });
});

describe("Alerta pasiva y activa", () => {
  test("el Ojo sube la pasiva con su nivel y lo dice la nota", () => {
    const sin = resolver(defaultSheet());
    const f = resolver(con(defaultSheet(), OJO, { nivel: 2 }));
    assert.equal(f.alerta - sin.alerta, 2);
    assert.equal(notasDeEstado(f).alerta, "+2 · Ojo Biónico 2");
  });

  test("Detección Química: nota en la pasiva sin sumar, casilla de +2 en la activa", () => {
    const sin = resolver(defaultSheet());
    const f = resolver(con(defaultSheet(), INTROGRESION, { eleccion: "deteccion_quimica" }));
    assert.equal(f.alerta, sin.alerta);
    assert.match(notasDeEstado(f).alerta ?? "", /4 m o menos/);
    const t = tiradaFija(f, "alerta_activa");
    const base = montar(f, t);
    assert.equal(montar(f, t, { aum_introgresion_quimica_cerca: true }).modificador - base.modificador, 2);
  });

  test("Vestíbulo: ventaja al buscar por el oído, solo en la activa", () => {
    const f = resolver(con(con(defaultSheet(), FOVEO), VESTIBULO));
    assert.equal(notasDeEstado(f).alerta, undefined); // la pasiva no la nota
    const t = tiradaFija(f, "alerta_activa");
    const m = montar(f, t, { aum_vestibulo_auditiva: true });
    assert.ok(m.ventaja?.includes("Optimización Vestíbulo-Auditiva"));
  });
});

describe("armadura natural de los aumentos (R6)", () => {
  test("Osteotendinosa y Matriz Ósea: +1 cada una contra Cinético, con su nota; contra otros tipos, nada", () => {
    const s = conTodas([OSTEO, MATRIZ_OSEA]);
    const cinetico = desgloseBlindaje(s, "cinetico", false, { valor: 0, fuente: null });
    assert.deepEqual(
      cinetico.map((l) => [l.etiqueta, l.valor]),
      [
        ["Armadura natural · Integridad Osteotendinosa", 1],
        ["Armadura natural · Matriz Ósea Adaptativa", 1],
      ],
    );
    assert.ok(cinetico.every((l) => l.nota));
    assert.deepEqual(desgloseBlindaje(s, "electrico", false, { valor: 0, fuente: null }), []);
  });
});
