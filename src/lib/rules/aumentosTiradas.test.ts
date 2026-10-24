import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { equipar } from "./equipo";
import { conExtrasDeFicha, notasDeEstado, resolverFicha, VITALIDAD_DE_FICHA, type FichaResuelta, type VitalidadActual } from "./fichaResuelta";
import { ACCIONES, type Accion } from "./acciones";
import { accionesDeAtaque } from "./combate";
import { estadoInicial, type CondicionTirada, type EstadoCondiciones } from "./condiciones";
import { montarTirada, SIN_ELECCION, type TiradaMontada } from "./montaje";
import { desgloseBlindaje } from "./blindaje";
import { casillasDeAumentos, ID_SELECTOR_CONTRA } from "./aumentosTiradas";
import { accionesDePsionica } from "./poderes";
import { prepararPoder, SELECCION_PODER_VACIA, usarPoder } from "./usoPoder";

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
    const cinetico = desgloseBlindaje(s, "cinetico", { valor: 0, fuente: null });
    assert.deepEqual(
      cinetico.map((l) => [l.etiqueta, l.valor]),
      [
        ["Armadura natural · Integridad Osteotendinosa", 1],
        ["Armadura natural · Matriz Ósea Adaptativa", 1],
      ],
    );
    assert.ok(cinetico.every((l) => l.nota));
    assert.deepEqual(desgloseBlindaje(s, "electrico", { valor: 0, fuente: null }), []);
  });
});

// ── A2b: alcance por aplicado, casillas de la rama cognitiva, ventaja fija y textos ──

const MIELINIZACION = "aum_mielinizacion_central";
const PREFRONTAL = "aum_prefrontal_aumentada"; // pide Mielinización
const CALLOSA = "aum_conectividad_callosa"; // pide Prefrontal
const RED_FRONTOPARIETAL = "aum_red_frontoparietal"; // pide Mielinización
const ASA = "aum_asa_estriatotalamica"; // pide Mielinización
const CONSCIENCIA = "aum_consciencia_omnidireccional"; // pide Foveo y Prefrontal
const SINCRONIZACION = "aum_sincronizacion_neuromotora_profunda"; // pide Osteotendinosa
const AUTOMATISMO = "aum_automatismo_bulboespinal"; // pide Hiperdensidad y Osteotendinosa
const HIPERDENSIDAD = "aum_hiperdensidad_propioceptiva";

const ids = (t: Accion) => (t.condiciones ?? []).map((c) => c.id);
const CONCENTRARSE_PREFRONTAL = "aum_prefrontal_concentrarse";
const AHORRO = "aum_mielinizacion_ahorro";

describe("A2b: alcance por aplicado", () => {
  const f = resolver(conTodas([MIELINIZACION, PREFRONTAL]));

  test("Prefrontal sale en habilidades y salvaciones de perspicacia, voluntad o expresión, y en ninguna otra", () => {
    for (const id of ["iniciativa", "social", "salv_voluntad", "alerta_activa"]) {
      assert.ok(ids(tiradaFija(f, id)).includes(CONCENTRARSE_PREFRONTAL), id);
    }
    for (const id of ["defensa", "salv_fortaleza", "salv_reflejos", "atletismo"]) {
      assert.ok(!ids(tiradaFija(f, id)).includes(CONCENTRARSE_PREFRONTAL), id);
    }
  });

  test("marcada: ventaja y 1 de fatiga cobrada, con la nota de la acción compleja", () => {
    const t = tiradaFija(f, "salv_voluntad");
    const m = montar(f, t, { [CONCENTRARSE_PREFRONTAL]: true });
    assert.equal(m.ventaja, "Concentrarse · Prefrontal Aumentada");
    assert.equal(m.costeFatiga, 1);
    assert.ok(m.notas.some((n) => n.nota.includes("se resuelve como compleja")));
    assert.equal(montar(f, t).costeFatiga, 0);
  });

  test("vale el aplicado con el que se tira: una casilla que lo cambia la enciende o la apaga", () => {
    const cambia: CondicionTirada = { id: "a_perspicacia", tipo: "toggle", etiqueta: "Con Perspicacia", valorActivo: 0, aplicado: "perspicacia" };
    const base: Accion = { id: "prueba", label: "Prueba", grupo: "Acciones", aplicado: "reflejos", habilidad: null, condiciones: [cambia] };
    const t = conExtrasDeFicha(f, base);
    // Se recoge porque puede tirarse con Perspicacia…
    assert.ok(ids(t).includes(CONCENTRARSE_PREFRONTAL));
    // …pero con Reflejos no hace nada aunque se marque.
    const sinCambiar = montar(f, t, { [CONCENTRARSE_PREFRONTAL]: true });
    assert.equal(sinCambiar.ventaja, null);
    assert.equal(sinCambiar.costeFatiga, 0);
    assert.equal(sinCambiar.casillasSinEfecto[CONCENTRARSE_PREFRONTAL], "no aplica tirando con Reflejos");
    const cambiada = montar(f, t, { [CONCENTRARSE_PREFRONTAL]: true, a_perspicacia: true });
    assert.equal(cambiada.aplicado.id, "perspicacia");
    assert.equal(cambiada.ventaja, "Concentrarse · Prefrontal Aumentada");
    assert.equal(cambiada.costeFatiga, 1);
    assert.deepEqual(cambiada.casillasSinEfecto, {});
  });

  test("y al revés: Sincronización (Potencia) deja de valer si la casilla cambia el aplicado", () => {
    const fs = resolver(conTodas([OSTEO, SINCRONIZACION]));
    const cambia: CondicionTirada = { id: "a_fortaleza", tipo: "toggle", etiqueta: "Con Fortaleza", valorActivo: 0, aplicado: "fortaleza" };
    const atletismo = ACCIONES.find((a) => a.id === "atletismo")!;
    const t = conExtrasDeFicha(fs, { ...atletismo, condiciones: [cambia] });
    assert.equal(montar(fs, t, { aum_sincronizacion_potencia: true }).ventaja, "Dos dados en Potencia · Sincronización Neuromotora Profunda");
    const m = montar(fs, t, { aum_sincronizacion_potencia: true, a_fortaleza: true });
    assert.equal(m.ventaja, null);
    assert.equal(m.costeFatiga, 0);
  });

  test("en un poder de Perspicacia: la casilla llega con el índice, y el ahorro baja el coste del poder", () => {
    const sheet = { ...conTodas([MIELINIZACION, PREFRONTAL]), psionica: { traslacion: 2, singularidad: 2 }, fatigaActual: 8 };
    const fp = resolver(sheet);
    const poder = accionesDePsionica(sheet, fp.psionica.paraEfectos).find((p) => p.accion.id === "psi_singularidad_impulso")!;
    const entrada = { ficha: sheet, modificadores: fp.modificadores, niveles: fp.psionica.paraEfectos, poder, seleccion: SELECCION_PODER_VACIA };
    assert.ok(!ids(prepararPoder(entrada)!.tirada!).includes(CONCENTRARSE_PREFRONTAL), "sin índice, como antes");
    const p = prepararPoder({ ...entrada, indiceCondiciones: fp.indiceCondiciones })!;
    assert.ok(ids(p.tirada!).includes(CONCENTRARSE_PREFRONTAL));
    assert.ok(ids(p.tirada!).includes(AHORRO));
    const m = montar(fp, p.tirada!, { [CONCENTRARSE_PREFRONTAL]: true });
    assert.equal(m.ventaja, "Concentrarse · Prefrontal Aumentada");
    assert.equal(m.costeFatiga, 1);
    // Ahorro solo: nada que ahorrar en casillas, sobra 1 para el poder (2 → 1).
    const conAhorro = montar(fp, p.tirada!, { [AHORRO]: true });
    assert.equal(conAhorro.costeFatiga, 0);
    assert.equal(conAhorro.ahorroSinUsar, 1);
    const uso = { ficha: sheet, modificadores: fp.modificadores, peajeNeurologico: null };
    assert.equal(p.coste?.total, 2);
    assert.equal(usarPoder(uso, p, "uso", conAhorro.ahorroSinUsar).fatiga.pagar, 1);
    assert.equal(usarPoder(uso, p).fatiga.pagar, 2);
  });
});

describe("A2b: casillas de la rama cognitiva", () => {
  test("con Conectividad Callosa funcionando, la casilla de Prefrontal no sale; salen las dos de Callosa en cualquier tirada", () => {
    const f = resolver(conTodas([MIELINIZACION, PREFRONTAL, CALLOSA]));
    for (const id of ["salv_voluntad", "defensa", "salv_fortaleza"]) {
      const t = tiradaFija(f, id);
      assert.ok(!ids(t).includes(CONCENTRARSE_PREFRONTAL), id);
      assert.ok(ids(t).includes("aum_callosa_concentrarse"), id);
      assert.ok(ids(t).includes("aum_callosa_dos_turnos"), id);
    }
  });

  test("requisito roto: sin Mielinización, ni Prefrontal ni Callosa (que pide Prefrontal) ponen casillas", () => {
    // Callosa solo pide Prefrontal: con su requisito roto, Prefrontal tampoco funciona, así que
    // la casilla de Prefrontal no puede salir sola (no hay caso "Callosa rota y Prefrontal viva").
    const f = resolver(conTodas([PREFRONTAL, CALLOSA]));
    const t = tiradaFija(f, "salv_voluntad");
    assert.equal(t.condiciones, undefined);
  });

  test("Ahorro de Mielinización: −1 al coste total, mínimo 0", () => {
    const f = resolver(conTodas([MIELINIZACION, PREFRONTAL, CALLOSA]));
    const t = tiradaFija(f, "salv_voluntad");
    // La ventaja no se acumula: con las dos casillas de Callosa solo se cobra una.
    const dos = { aum_callosa_concentrarse: true, aum_callosa_dos_turnos: true };
    assert.equal(montar(f, t, dos).costeFatiga, 1);
    const conAhorro = montar(f, t, { ...dos, [AHORRO]: true });
    assert.equal(conAhorro.costeFatiga, 0);
    assert.equal(conAhorro.ahorroSinUsar, 0);
    const uno = montar(f, t, { aum_callosa_concentrarse: true, [AHORRO]: true });
    assert.equal(uno.costeFatiga, 0);
    assert.equal(uno.ahorroSinUsar, 0);
    const solo = montar(f, t, { [AHORRO]: true });
    assert.equal(solo.costeFatiga, 0);
    assert.equal(solo.ahorroSinUsar, 1);
    // Solo en pruebas mentales.
    assert.ok(!ids(tiradaFija(f, "defensa")).includes(AHORRO));
  });

  test("ventaja de pago con ventaja gratis ya puesta: no cobra (Callosa en Iniciativa con Red Frontoparietal)", () => {
    const f = resolver(conTodas([MIELINIZACION, RED_FRONTOPARIETAL, PREFRONTAL, CALLOSA]));
    const t = tiradaFija(f, "iniciativa");
    const m = montar(f, t, { aum_callosa_concentrarse: true });
    assert.ok(m.ventaja);
    assert.equal(m.costeFatiga, 0);
  });

  test("Consciencia: ventaja pagando 1 en la esquiva, y el flanqueo como texto en Defensa", () => {
    const f = resolver(conTodas([MIELINIZACION, PREFRONTAL, FOVEO, CONSCIENCIA]));
    const t = tiradaFija(f, "defensa");
    const m = montar(f, t, { aum_consciencia_esquiva: true });
    assert.equal(m.ventaja, "Esquivar con dos dados · Consciencia Omnidireccional");
    assert.equal(m.costeFatiga, 1);
    assert.ok(t.nota?.includes("No te pueden flanquear"));
  });

  test("Foveo: +1 en el ataque a distancia con «Apuntado» en Éxito o Crítico, sin casilla propia", () => {
    const sheet = equipar(conTodas([FOVEO]), { instanciaId: "f1", catalogoId: "fusil_asalto_impetus" });
    const f = resolver(sheet);
    const ataque = conExtrasDeFicha(f, accionesDeAtaque(sheet, f.modificadores, f.extrasDotes.permisos).find((t) => t.label === "Disparar con Impetus")!);
    assert.ok(!ids(ataque).includes("aum_foveo_apuntar"));
    const sinApuntar = montar(f, ataque).modificador;
    // Apuntado Éxito: +1 de Apuntar y +1 de Foveo; Crítico, igual.
    assert.equal(montar(f, ataque, { apuntado: "exito" }).modificador - sinApuntar, 2);
    assert.equal(montar(f, ataque, { apuntado: "critico" }).modificador - sinApuntar, 2);
    const m = montar(f, ataque, { apuntado: "exito" });
    assert.ok(m.desglose.some((l) => l.etiqueta === "Optimización Foveo-Sensorial" && l.valor === 1));
    // Sin Foveo, solo el +1 de Apuntar.
    const sinFoveo = equipar(defaultSheet(), { instanciaId: "f1", catalogoId: "fusil_asalto_impetus" });
    const g = resolver(sinFoveo);
    const otro = conExtrasDeFicha(g, accionesDeAtaque(sinFoveo, g.modificadores, g.extrasDotes.permisos).find((t) => t.label === "Disparar con Impetus")!);
    assert.equal(montar(g, otro, { apuntado: "exito" }).modificador - montar(g, otro).modificador, 1);
    // Iniciativa desenfundando no tiene selector ni bono.
    assert.ok(!ids(tiradaFija(f, "iniciativa_arma")).includes("apuntado"));
    assert.equal(tiradaFija(f, "iniciativa_arma").bonosTramo, undefined);
  });

  test("Proyección y Matriz de Red: ventaja en Actitud, cada una con su nota", () => {
    const f = resolver(conTodas([REGULACION, PROYECCION, MATRIZ_RED]));
    const t = tiradaFija(f, "social");
    assert.ok(ids(t).includes("aum_proyeccion_lenguaje"));
    assert.ok(ids(t).includes("aum_matriz_red_repetir"));
    const m = montar(f, t, { aum_matriz_red_repetir: true });
    assert.equal(m.ventaja, "Repetir tras fallar · Matriz de Red Predeterminada");
    assert.equal(m.costeFatiga, 0);
    assert.ok(m.notas.some((n) => n.nota.includes("una vez por escena")));
    assert.ok(!ids(tiradaFija(f, "salv_voluntad")).includes("aum_proyeccion_lenguaje"));
  });
});

describe("A2b: ventaja fija y textos", () => {
  test("Red Frontoparietal: ventaja sin casilla en las tres de Iniciativa, en ninguna más", () => {
    const f = resolver(conTodas([MIELINIZACION, RED_FRONTOPARIETAL]));
    for (const id of ["iniciativa", "iniciativa_arma", "iniciativa_distraccion"]) {
      assert.equal(montar(f, tiradaFija(f, id)).ventaja, "Red Frontoparietal", id);
    }
    assert.equal(montar(f, tiradaFija(f, "defensa")).ventaja, null);
    // Con el requisito roto, nada.
    assert.equal(montar(resolver(conTodas([RED_FRONTOPARIETAL])), tiradaFija(resolver(conTodas([RED_FRONTOPARIETAL])), "iniciativa")).ventaja, null);
  });

  test("Asa en las pruebas mentales (con la exclusión); Automatismo en Defensa", () => {
    const f = resolver(conTodas([MIELINIZACION, ASA, HIPERDENSIDAD, OSTEO, AUTOMATISMO]));
    assert.ok(tiradaFija(f, "salv_voluntad").nota?.includes("baja un paso"));
    assert.ok(tiradaFija(f, "social").nota?.includes("No a la vez que Conectividad Callosa"));
    assert.ok(!tiradaFija(f, "defensa").nota?.includes("baja un paso"));
    assert.ok(tiradaFija(f, "defensa").nota?.includes("Sorprendido"));
    assert.ok(!tiradaFija(f, "salv_voluntad").nota?.includes("Sorprendido"));
  });
});

// ── A3: penalizadores por heridas y fatiga, Neurogénesis, cobertura y carga ──

const NEUROGENESIS = "aum_neurogenesis_hipocampal"; // pide Mielinización

describe("A3: ajuste de umbrales = especie + aumentos (R8)", () => {
  // Vida y fatiga 10: Herido 4, Malherido 2, Moribundo 1; Fatigado 2, Exhausto 1.
  const enCombate = (pgActual: number, fatigaActual: number): VitalidadActual => ({
    origen: "combate",
    pgActual,
    pgMax: 10,
    fatigaActual,
    fatigaMax: 10,
  });
  const GUERRERO: Partial<Sheet> = { especieId: "manduk", especieOpciones: { casta: "guerrero" } };
  const SIERVO: Partial<Sheet> = { especieId: "manduk", especieOpciones: { casta: "siervo" } };
  const UMBRALES = /^(Herido|Malherido|Moribundo|Fatigado|Exhausto|Neurogénesis)/;
  const lineas = (s: Sheet, v: VitalidadActual, tiradaId = "salv_voluntad") => {
    const f = resolverFicha(s, { estados: [], vitalidad: v });
    const t = ACCIONES.find((a) => a.id === tiradaId)!;
    return montarTirada(f, t, SIN_ELECCION).desglose.filter((l) => UMBRALES.test(l.etiqueta));
  };
  const ficha = (patch: Partial<Sheet>, aumentos: string[]) => conTodas(aumentos, { ...defaultSheet(), ...patch });

  test("Estabilización sola: Herido 0, Malherido −2, Moribundo −4; Fatigado 0, Exhausto −1", () => {
    const s = ficha({}, [ESTABILIZACION]);
    assert.deepEqual(lineas(s, enCombate(4, 10)), []);
    assert.deepEqual(lineas(s, enCombate(2, 10)), [{ etiqueta: "Malherido (Estabilización Autonómica)", valor: -2 }]);
    assert.deepEqual(lineas(s, enCombate(1, 10)), [{ etiqueta: "Moribundo (Estabilización Autonómica)", valor: -4 }]);
    assert.deepEqual(lineas(s, enCombate(10, 2)), []);
    assert.deepEqual(lineas(s, enCombate(10, 1)), [{ etiqueta: "Exhausto (Estabilización Autonómica)", valor: -1 }]);
  });

  test("Guerrero + Estabilización en heridas: −1 → 0, −3 → −1, −5 → −3, con las dos fuentes", () => {
    const s = ficha(GUERRERO, [ESTABILIZACION]);
    assert.deepEqual(lineas(s, enCombate(4, 10)), []);
    assert.deepEqual(lineas(s, enCombate(2, 10)), [{ etiqueta: "Malherido (Manduk · Guerrero y Estabilización Autonómica)", valor: -1 }]);
    assert.deepEqual(lineas(s, enCombate(1, 10)), [{ etiqueta: "Moribundo (Manduk · Guerrero y Estabilización Autonómica)", valor: -3 }]);
    const f = resolverFicha(s, { estados: [], vitalidad: enCombate(1, 10) });
    assert.deepEqual(f.ajusteUmbrales.salud, { valor: 2, fuente: "Manduk · Guerrero y Estabilización Autonómica" });
    assert.deepEqual(f.ajusteUmbrales.fatiga, { valor: 1, fuente: "Estabilización Autonómica" });
  });

  test("Siervo + Estabilización en fatiga: −1 y −2 se quedan en 0, sin línea", () => {
    const s = ficha(SIERVO, [ESTABILIZACION]);
    assert.deepEqual(lineas(s, enCombate(10, 2)), []);
    assert.deepEqual(lineas(s, enCombate(10, 1)), []);
  });

  test("Estabilización no toca la velocidad: Malherido sigue a media velocidad", () => {
    const f = resolverFicha(ficha({}, [ESTABILIZACION]), { estados: [], vitalidad: enCombate(2, 10) });
    assert.deepEqual(f.umbrales.movimiento.mediaVelocidad, ["Malherido"]);
  });

  test("Neurogénesis con el requisito roto (sin Mielinización): no compensa nada", () => {
    assert.deepEqual(lineas(ficha({}, [NEUROGENESIS]), enCombate(10, 2)), [{ etiqueta: "Fatigado", valor: -1 }]);
  });

  test("Neurogénesis: +1 en las pruebas mentales mientras la fatiga penalice; en Reflejos, nada", () => {
    const s = ficha({}, [MIELINIZACION, NEUROGENESIS]);
    assert.deepEqual(lineas(s, enCombate(10, 2)), [
      { etiqueta: "Fatigado", valor: -1 },
      { etiqueta: "Neurogénesis Hipocampal (Fatigado)", valor: 1 },
    ]);
    assert.deepEqual(lineas(s, enCombate(10, 1)), [
      { etiqueta: "Exhausto", valor: -2 },
      { etiqueta: "Neurogénesis Hipocampal (Exhausto)", valor: 1 },
    ]);
    assert.deepEqual(lineas(s, enCombate(10, 2), "salv_reflejos"), [{ etiqueta: "Fatigado", valor: -1 }]);
    // Sin fatiga penalizada no aparece; las heridas no las toca.
    assert.deepEqual(lineas(s, enCombate(10, 10)), []);
    assert.deepEqual(lineas(s, enCombate(4, 10)), [{ etiqueta: "Herido", valor: -1 }]);
  });

  test("Neurogénesis nunca deja la fatiga por encima de 0 (Siervo, Estabilización)", () => {
    // Siervo Fatigado: ya en 0, no suma.
    assert.deepEqual(lineas(ficha(SIERVO, [MIELINIZACION, NEUROGENESIS]), enCombate(10, 2)), []);
    // Siervo Exhausto: −1 y +1.
    assert.deepEqual(lineas(ficha(SIERVO, [MIELINIZACION, NEUROGENESIS]), enCombate(10, 1)), [
      { etiqueta: "Exhausto (Manduk · Siervo)", valor: -1 },
      { etiqueta: "Neurogénesis Hipocampal (Exhausto)", valor: 1 },
    ]);
    // Siervo + Estabilización Exhausto: 0, no suma.
    assert.deepEqual(lineas(ficha(SIERVO, [ESTABILIZACION, MIELINIZACION, NEUROGENESIS]), enCombate(10, 1)), []);
  });

  test("Neurogénesis vale con el aplicado con el que se tira (casilla que cambia a Perspicacia)", () => {
    const f = resolverFicha(ficha({}, [MIELINIZACION, NEUROGENESIS]), { estados: [], vitalidad: enCombate(10, 2) });
    const cambia: CondicionTirada = { id: "a_perspicacia", tipo: "toggle", etiqueta: "Con Perspicacia", valorActivo: 0, aplicado: "perspicacia" };
    const t: Accion = { id: "prueba", label: "Prueba", grupo: "Acciones", aplicado: "reflejos", habilidad: null, condiciones: [cambia] };
    const neuro = (m: TiradaMontada) => m.desglose.filter((l) => l.etiqueta.startsWith("Neurogénesis"));
    assert.deepEqual(neuro(montar(f, t)), []);
    assert.deepEqual(neuro(montar(f, t, { a_perspicacia: true })), [{ etiqueta: "Neurogénesis Hipocampal (Fatigado)", valor: 1 }]);
  });
});

describe("A3: cobertura (casillas, sin apilar)", () => {
  const conFusil = (aumentos: [string, number?][]) => {
    let s = equipar(defaultSheet(), { instanciaId: "f1", catalogoId: "fusil_asalto_impetus" });
    for (const [id, nivel] of aumentos) s = con(s, id, nivel === undefined ? {} : { nivel });
    return resolver(s);
  };
  const disparo = (f: FichaResuelta) =>
    conExtrasDeFicha(f, accionesDeAtaque(f.ficha, f.modificadores, f.extrasDotes.permisos).find((t) => t.label === "Disparar con Impetus")!);
  const cobertura = (t: Accion) => ids(t).filter((id) => id.includes("_cobertura_"));
  const suma = (f: FichaResuelta, t: Accion, marcar: string[]) =>
    montar(f, t, Object.fromEntries(marcar.map((id) => [id, true]))).modificador - montar(f, t).modificador;

  test("Foveo: +1 por cobertura visual en ataques a distancia y en Buscar/percibir; no en Iniciativa ni Defensa", () => {
    const f = conFusil([[FOVEO]]);
    assert.deepEqual(cobertura(disparo(f)), ["aum_foveo_cobertura_distancia"]);
    assert.equal(suma(f, disparo(f), ["aum_foveo_cobertura_distancia"]), 1);
    const buscar = tiradaFija(f, "alerta_activa");
    assert.deepEqual(cobertura(buscar), ["aum_foveo_cobertura_alerta"]);
    assert.equal(suma(f, buscar, ["aum_foveo_cobertura_alerta"]), 1);
    const c = buscar.condiciones!.find((x) => x.id === "aum_foveo_cobertura_alerta")!;
    assert.equal(c.etiqueta, "Objetivo con cobertura visual · Optimización Foveo-Sensorial");
    assert.ok(c.tipo === "toggle" && c.nota?.includes("La cobertura total no se reduce"));
    for (const id of ["iniciativa_arma", "defensa"]) assert.deepEqual(cobertura(tiradaFija(f, id)), [], id);
  });

  test("Ojo: el 1 no trae cobertura; el 2 y el 3, +1 visual; el 4, +2 a cualquier cobertura", () => {
    assert.deepEqual(cobertura(disparo(conFusil([[OJO, 1]]))), []);
    for (const nivel of [2, 3]) {
      const f = conFusil([[OJO, nivel]]);
      assert.equal(suma(f, disparo(f), ["aum_ojo_cobertura_distancia"]), 1, `nivel ${nivel}`);
    }
    const f4 = conFusil([[OJO, 4]]);
    const t4 = disparo(f4);
    assert.deepEqual(cobertura(t4), ["aum_ojo_cobertura_distancia"]);
    assert.equal(t4.condiciones!.find((c) => c.id === "aum_ojo_cobertura_distancia")!.etiqueta, "Objetivo con cobertura (física o visual) · Ojo Biónico 4");
    assert.equal(suma(f4, t4, ["aum_ojo_cobertura_distancia"]), 2);
    assert.equal(suma(f4, tiradaFija(f4, "alerta_activa"), ["aum_ojo_cobertura_alerta"]), 2);
  });

  test("Foveo + Ojo 4 marcadas: solo la mayor (+2); Foveo sale a 0 diciendo por qué", () => {
    const f = conFusil([[FOVEO], [OJO, 4]]);
    const t = disparo(f);
    const marcar = ["aum_foveo_cobertura_distancia", "aum_ojo_cobertura_distancia"];
    assert.equal(suma(f, t, marcar), 2);
    const m = montar(f, t, Object.fromEntries(marcar.map((id) => [id, true])));
    assert.ok(m.desglose.some((l) => l.etiqueta.startsWith("Objetivo con cobertura visual · Optimización Foveo-Sensorial (no se suma con") && l.valor === 0));
  });

  test("Foveo + Ojo 2 marcadas: +1, no +2", () => {
    const f = conFusil([[FOVEO], [OJO, 2]]);
    const t = tiradaFija(f, "alerta_activa");
    assert.equal(suma(f, t, ["aum_foveo_cobertura_alerta", "aum_ojo_cobertura_alerta"]), 1);
  });
});

describe("A3: Matriz Ósea, −1 a la carga como nota", () => {
  test("nota junto a la carga, sin tocar el número", () => {
    const sin = resolver(defaultSheet());
    const f = resolver(conTodas([MATRIZ_OSEA]));
    assert.match(notasDeEstado(f).carga ?? "", /−1 a los penalizadores por carga \(sin mecanizar\) · Matriz Ósea Adaptativa/);
    assert.equal(notasDeEstado(sin).carga, undefined);
  });
});

// R2/R5 (2026-10-24): los bonos de salvación del equipo cuentan solo contra su amenaza, por el
// mismo selector «Contra…» que los aumentos (docs/fuente/equipamiento.md).
describe("«Contra…» con los bonos del equipo", () => {
  const vestido = (...mejoras: [string, number][]) =>
    mejoras.reduce(
      (s, [id, nivel], i) => equipar(s, { instanciaId: `m${i}`, catalogoId: id, nivel, instaladoEnId: "arm" }),
      equipar(defaultSheet(), { instanciaId: "arm", catalogoId: "armadura_ligera" }),
    );
  const contra = (f: FichaResuelta, salv: string) =>
    tiradaFija(f, salv).condiciones?.find((c) => c.id === `${ID_SELECTOR_CONTRA}_${salv}`);
  const valor = (c: CondicionTirada | undefined, id: string) =>
    c?.tipo === "opcion" ? c.opciones.find((o) => o.id === id)?.valor : undefined;

  test("la armadura: +1 contra congelación (Fortaleza) y llamarada (Reflejos), nada más", () => {
    const f = resolver(vestido());
    const fort = contra(f, "salv_fortaleza");
    assert.equal(valor(fort, "congelacion"), 1);
    assert.equal(valor(fort, "shock"), undefined);
    assert.equal(valor(contra(f, "salv_reflejos"), "llamarada"), 1);
    // Sin elegir amenaza, la salvación es la de siempre.
    const t = tiradaFija(f, "salv_fortaleza");
    assert.equal(montar(f, t).total, montar(resolver(defaultSheet()), tiradaFija(resolver(defaultSheet()), "salv_fortaleza")).total);
  });

  test("Polímero 2, Tejido 1, Soporte Vital y Mejora Ignífuga 2, cada uno contra lo suyo", () => {
    const f = resolver(vestido(["polimero_anticorrosivo", 2], ["tejido_conductor", 1], ["soporte_vital", 1], ["mejora_ignifuga", 2]));
    const fort = contra(f, "salv_fortaleza");
    assert.equal(valor(fort, "corrosion"), 2);
    assert.equal(valor(fort, "shock"), 1);
    assert.equal(valor(fort, "congelacion"), 2); // armadura +1 y Soporte Vital +1
    assert.equal(valor(fort, "termicos"), 1);
    assert.equal(valor(contra(f, "salv_reflejos"), "llamarada"), 2); // Ignífuga 2 la sube a +2
  });

  test("Visor Nocturno 2: +3 contra la ceguera por detonación, no contra cualquier ceguera", () => {
    const f = resolver(vestido(["visor_nocturno", 2]));
    const fort = contra(f, "salv_fortaleza");
    assert.equal(valor(fort, "ceguera_detonacion"), 3);
    assert.equal(valor(fort, "ceguera"), undefined);
    const t = tiradaFija(f, "salv_fortaleza");
    assert.equal(montar(f, t, { [`${ID_SELECTOR_CONTRA}_salv_fortaleza`]: "ceguera_detonacion" }).total - montar(f, t).total, 3);
  });
});
