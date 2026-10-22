import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { conExtrasDeFicha, resolverFicha, VITALIDAD_DE_FICHA, type FichaResuelta, type VitalidadActual } from "./fichaResuelta";
import { ACCIONES, type Accion } from "./acciones";
import { estadoInicial, type CondicionTirada, type EstadoCondiciones } from "./condiciones";
import { montarTirada, SIN_ELECCION, type TiradaMontada } from "./montaje";
import { accionesDeAumentos, ID_ELECCION_ACTIVABLE, usoDeAccionAumento } from "./aumentosAcciones";
import { ID_SELECTOR_CONTRA } from "./aumentosTiradas";
import { descontarDuracion, describirEstadosActivos, type EstadoActivo } from "./estados";
import { ponerEstado } from "./estadosFicha";
import { vidaTrasCambioDeEstados } from "./vidaPorEstados";
import { ESTADOS } from "../catalog/estados";

let n = 0;
function con(sheet: Sheet, catalogoId: string, nivel?: number): Sheet {
  return { ...sheet, equipo: [...sheet.equipo, { instanciaId: `v${++n}`, catalogoId, ...(nivel !== undefined && { nivel }) }] };
}
const conRecursos = (s: Sheet, fatiga = 8): Sheet => ({ ...s, fatigaActual: fatiga, vidaActual: 8 });

const NEURO = "aum_neuroprotesis_simpatica";
const REGULACION = "aum_regulacion_limbico_prefrontal";
const PROYECCION = "aum_proyeccion_neuro_expresiva";
const MIELINIZACION = "aum_mielinizacion_central";
const NEUROGENESIS = "aum_neurogenesis_hipocampal"; // pide Mielinización

const ACTIVAR_NEURO = "aumentos_activar_neuroprotesis";
const ACTIVAR_PROYECCION = "aumentos_activar_proyeccion";
const DESACTIVAR_NEURO = "aumentos_desactivar_aum_neuroprotesis";

const neuro = (grado = "activo", rondas = 3): EstadoActivo => ({ estadoId: "aum_neuroprotesis", gradoId: grado, rondasRestantes: rondas });
const proyeccion: EstadoActivo = { estadoId: "aum_proyeccion", gradoId: "activo", rondasRestantes: null, finDeEscena: true };

const conNeuro = (nivel = 1) => conRecursos(con(defaultSheet(), NEURO, nivel));
const conProyeccion = () => conRecursos(con(con(defaultSheet(), REGULACION), PROYECCION));

// Malherido (4/20) y Fatigado (4/20), para ver los tramos sin tocar la ficha.
const HERIDO_Y_FATIGADO: VitalidadActual = { origen: "combate", pgActual: 4, pgMax: 20, fatigaActual: 4, fatigaMax: 20 };

const resolver = (s: Sheet, estados: EstadoActivo[], vitalidad: VitalidadActual = VITALIDAD_DE_FICHA) =>
  resolverFicha(s, { estados, vitalidad });
const tiradaFija = (f: FichaResuelta, id: string): Accion => conExtrasDeFicha(f, ACCIONES.find((a) => a.id === id)!);
function montar(f: FichaResuelta, id: string, cambios: EstadoCondiciones = {}): TiradaMontada {
  const t = tiradaFija(f, id);
  return montarTirada(f, t, { ...SIN_ELECCION, estadoCondiciones: { ...estadoInicial(t.condiciones ?? []), ...cambios } });
}
const linea = (m: TiradaMontada, re: RegExp) => m.desglose.filter((l) => re.test(l.etiqueta));
const directa = (s: Sheet, estados: EstadoActivo[], id: string) => accionesDeAumentos(s, estados).directas.find((a) => a.id === id);

describe("activables: activar, reactivar y desactivar", () => {
  test("activar la Neuroprótesis cobra 2 de fatiga y pone el estado 3 rondas", () => {
    const s = conNeuro();
    const uso = usoDeAccionAumento(s, [], ACTIVAR_NEURO);
    assert.ok(uso.ok);
    assert.equal(uso.sheet.fatigaActual, 6);
    assert.deepEqual(uso.op, { tipo: "poner", estado: neuro() });
    assert.match(uso.mensaje, /−2 de fatiga\. Neuroprótesis Simpática \(Nivel 1\) activa: 3 rondas, en combate\./);
  });

  test("Proyección: 1 de fatiga, hasta el final de la escena", () => {
    const uso = usoDeAccionAumento(conProyeccion(), [], ACTIVAR_PROYECCION);
    assert.ok(uso.ok);
    assert.equal(uso.sheet.fatigaActual, 7);
    assert.deepEqual(uso.op, { tipo: "poner", estado: proyeccion });
    assert.match(uso.mensaje, /hasta el final de la escena/);
  });

  test("reactivar renueva la duración y no apila", () => {
    const s = conNeuro();
    const uso = usoDeAccionAumento(s, [neuro("activo", 1)], ACTIVAR_NEURO);
    assert.ok(uso.ok && uso.op?.tipo === "poner");
    assert.match(uso.mensaje, /renovada/);
    const tras = ponerEstado([neuro("activo", 1)], uso.op.estado);
    assert.deepEqual(tras, [neuro("activo", 3)]);
    assert.match(directa(s, [neuro("activo", 1)], ACTIVAR_NEURO)!.nota!, /Ya está activa \(1 ronda, en combate\)/);
  });

  test("sin fatiga suficiente, bloqueada con el motivo", () => {
    const s = conNeuro(1);
    const a = directa({ ...s, fatigaActual: 1 }, [], ACTIVAR_NEURO)!;
    assert.match(a.bloqueada!, /cuesta 2 y te quedan 1/);
    const uso = usoDeAccionAumento({ ...s, fatigaActual: 1 }, [], ACTIVAR_NEURO);
    assert.equal(uso.ok, false);
  });

  test("desactivar: solo con el estado puesto, sin coste, quita el estado y no devuelve fatiga", () => {
    const s = conNeuro();
    assert.equal(directa(s, [], DESACTIVAR_NEURO), undefined);
    const filas = accionesDeAumentos(s, [neuro()]).filas.map((f) => f.accion.id);
    assert.deepEqual(filas, [ACTIVAR_NEURO, DESACTIVAR_NEURO], "detrás de su Activar");
    const uso = usoDeAccionAumento(s, [neuro()], DESACTIVAR_NEURO);
    assert.ok(uso.ok);
    assert.deepEqual(uso.op, { tipo: "quitar", estadoId: "aum_neuroprotesis" });
    assert.equal(uso.sheet.fatigaActual, s.fatigaActual);
    assert.equal(uso.accion.costeFatiga, undefined);
  });

  test("desactivar sale aunque ya no se lleve la pieza", () => {
    const s = conRecursos(defaultSheet());
    const uso = usoDeAccionAumento(s, [neuro()], DESACTIVAR_NEURO);
    assert.ok(uso.ok);
    assert.equal(uso.op?.tipo, "quitar");
  });

  test("caduca sola con las rondas; la de escena no", () => {
    assert.deepEqual(descontarDuracion([neuro("activo", 1), proyeccion]), [proyeccion]);
  });

  test("los estados propios no salen en el selector del máster (ESTADOS)", () => {
    assert.ok(!ESTADOS.some((e) => e.id === "aum_neuroprotesis" || e.id === "aum_proyeccion"));
  });

  test("el chip dice la duración y que solo corre en combate", () => {
    const [n1, p] = describirEstadosActivos([neuro(), proyeccion]);
    assert.equal(n1.duracionActivable, "3 rondas, en combate");
    assert.equal(p.duracionActivable, "hasta el final de la escena");
    const [normal] = describirEstadosActivos([{ estadoId: "derribado", gradoId: "activo", rondasRestantes: 2 }]);
    assert.equal(normal.duracionActivable, undefined);
  });

  test("requisito roto: sin Regulación no hay Activar Proyección", () => {
    const s = conRecursos(con(defaultSheet(), PROYECCION));
    assert.equal(directa(s, [], ACTIVAR_PROYECCION), undefined);
    assert.equal(usoDeAccionAumento(s, [], ACTIVAR_PROYECCION).ok, false);
  });
});

describe("Neuroprótesis: atributos y elección del nivel 2", () => {
  test("+1 a Fuerza, Agilidad y Percepción solo con el estado y la pieza", () => {
    const base = resolver(conNeuro(), []).atributos;
    const activa = resolver(conNeuro(), [neuro()]).atributos;
    assert.equal(activa.fuerza - base.fuerza, 1);
    assert.equal(activa.agilidad - base.agilidad, 1);
    assert.equal(activa.percepcion - base.percepcion, 1);
    assert.equal(activa.aguante, base.aguante);
    // Estado sin la pieza: no hace nada.
    const sinPieza = resolver(conRecursos(defaultSheet()), [neuro()]).atributos;
    assert.equal(sinPieza.fuerza, base.fuerza);
  });

  test("no cuenta para los requisitos de dote", () => {
    const base = resolver(conNeuro(), []);
    const activa = resolver(conNeuro(), [neuro()]);
    assert.deepEqual(activa.requisitosDotes, base.requisitosDotes);
  });

  test("nivel 2: se elige al activar; el +2 sustituye al +1 en el elegido", () => {
    const s = conNeuro(2);
    const a = directa(s, [], ACTIVAR_NEURO)!;
    const sel = a.condiciones?.find((c): c is Extract<CondicionTirada, { tipo: "opcion" }> => c.id === ID_ELECCION_ACTIVABLE);
    assert.deepEqual(sel?.opciones.map((o) => o.id), ["fuerza", "agilidad"]);
    assert.equal(usoDeAccionAumento(s, [], ACTIVAR_NEURO).ok, false, "sin elección no se activa");
    const uso = usoDeAccionAumento(s, [], ACTIVAR_NEURO, "agilidad");
    assert.ok(uso.ok && uso.op?.tipo === "poner");
    assert.equal(uso.op.estado.gradoId, "agilidad");

    const base = resolver(s, []).atributos;
    const agi = resolver(s, [neuro("agilidad")]).atributos;
    assert.deepEqual(
      [agi.fuerza - base.fuerza, agi.agilidad - base.agilidad, agi.percepcion - base.percepcion],
      [1, 2, 1],
    );
    const fue = resolver(s, [neuro("fuerza")]).atributos;
    assert.deepEqual([fue.fuerza - base.fuerza, fue.agilidad - base.agilidad], [2, 1]);
  });

  test("nivel 1: un único grado, sin selector", () => {
    const a = directa(conNeuro(1), [], ACTIVAR_NEURO)!;
    assert.equal(a.condiciones, undefined);
  });
});

describe("Neuroprótesis: −1 a cada penalizador sin pasar de 0", () => {
  test("heridas y fatiga: se suma al ajuste de umbrales", () => {
    const f = resolver(conNeuro(), [neuro()], HERIDO_Y_FATIGADO);
    const m = montar(f, "atletismo");
    assert.deepEqual(linea(m, /^Malherido/), [{ etiqueta: "Malherido (Neuroprótesis Simpática 1)", valor: -2 }]);
    assert.deepEqual(linea(m, /^Fatigado/), [], "−1 + 1: a 0, sin línea");
    const sin = montar(resolver(conNeuro(), [], HERIDO_Y_FATIGADO), "atletismo");
    assert.deepEqual(linea(sin, /^(Malherido|Fatigado)/).map((l) => l.valor), [-3, -1]);
  });

  test("estados: cada penalizador de tirada, con su línea; sin pasar de 0", () => {
    // Aturdido (Fracaso crítico): −2 a la Defensa. Aturdido (Éxito): −1 a todo.
    const aturdido = (grado: string): EstadoActivo => ({ estadoId: "aturdido", gradoId: grado, rondasRestantes: 1 });
    const fc = montar(resolver(conNeuro(), [aturdido("fracaso_critico"), neuro()]), "defensa");
    assert.deepEqual(linea(fc, /Aturdido/), [
      { etiqueta: "Aturdido", valor: -2 },
      { etiqueta: "Neuroprótesis Simpática 1 (Aturdido)", valor: 1 },
    ]);
    const ex = montar(resolver(conNeuro(), [aturdido("exito"), neuro()]), "atletismo");
    assert.equal(linea(ex, /Aturdido/).reduce((t, l) => t + l.valor, 0), 0);
  });

  test("el −1 de las salvaciones de Fortaleza va en «Contra…» y no se reduce", () => {
    const f = resolver(conNeuro(), [neuro()]);
    const t = tiradaFija(f, "salv_fortaleza");
    const sel = t.condiciones?.find((c) => c.id.startsWith(ID_SELECTOR_CONTRA));
    assert.ok(sel && sel.tipo === "opcion");
    assert.deepEqual(sel.opciones.map((o) => o.id), ["nada", "toxinas", "venenos", "enfermedad", "radiacion"]);
    const m = montar(f, "salv_fortaleza", { [sel.id]: "enfermedad" });
    assert.deepEqual(linea(m, /Neuroprótesis/), [{ etiqueta: "Contra…: Enfermedad · Neuroprótesis Simpática 1 (activa)", valor: -1 }]);
    assert.match(sel.opciones.find((o) => o.id === "venenos")!.nota!, /Neuroprótesis Simpática 1 \(activa\) −1/);
    // Sin el estado, no hay selector.
    assert.equal(tiradaFija(resolver(conNeuro(), []), "salv_fortaleza").condiciones, undefined);
  });
});

describe("Proyección: anula los penalizadores en Actitud", () => {
  const ACTITUD = ["social", "iniciativa_distraccion"];

  test("heridas, fatiga y estados a 0 en Actitud, con su línea; el resto de tiradas igual", () => {
    const aturdido: EstadoActivo = { estadoId: "aturdido", gradoId: "exito", rondasRestantes: 1 };
    const f = resolver(conProyeccion(), [aturdido, proyeccion], HERIDO_Y_FATIGADO);
    for (const id of ACTITUD) {
      const m = montar(f, id);
      const anula = linea(m, /anula penalizadores/);
      assert.deepEqual(anula, [{ etiqueta: "Proyección Neuro-Expresiva (anula penalizadores)", valor: 5 }], id);
      const penal = linea(m, /^(Malherido|Fatigado|Aturdido|Proyección)/).reduce((t, l) => t + l.valor, 0);
      assert.equal(penal, 0, id);
    }
    assert.deepEqual(linea(montar(f, "atletismo"), /anula/), []);
  });

  test("sin penalizadores no añade nada; no toca el circunstancial", () => {
    const f = resolver(conProyeccion(), [proyeccion]);
    const t = tiradaFija(f, "social");
    const m = montarTirada(f, t, { ...SIN_ELECCION, circunstancial: -2 });
    assert.deepEqual(linea(m, /anula/), []);
    assert.equal(m.total, m.modificador - 2);
  });

  test("con Neurogénesis no pasa de 0", () => {
    let s = conProyeccion();
    s = con(con(s, MIELINIZACION), NEUROGENESIS);
    const f = resolver(s, [proyeccion], HERIDO_Y_FATIGADO);
    const m = montar(f, "social");
    const penal = linea(m, /(Malherido|Fatigado|anula)/).reduce((t, l) => t + l.valor, 0);
    assert.equal(penal, 0);
  });

  test("con el estado pero sin Regulación (requisito roto), no anula nada", () => {
    const s = conRecursos(con(defaultSheet(), PROYECCION));
    const m = montar(resolver(s, [proyeccion], HERIDO_Y_FATIGADO), "social");
    assert.deepEqual(linea(m, /anula/), []);
  });
});

describe("activables y vida", () => {
  test("que caduque la Neuroprótesis no resta vida aunque baje el máximo", () => {
    // Fuerza 1 y Aguante 0: Fortaleza 1 (media hacia arriba); con +1 a Fuerza, 1 igual. Con
    // Aguante 1, Fortaleza 1 → 2 (+1 de vida máxima).
    const s = { ...conNeuro(), atributos: { ...conNeuro().atributos, fuerza: 1, aguante: 1 } };
    const max = resolver(s, []).salud.vida;
    assert.equal(resolver(s, [neuro()]).salud.vida, max + 1, "sube el máximo mientras dura");
    const llena = { ...s, vidaActual: max };
    const r = vidaTrasCambioDeEstados(llena, [neuro()], []);
    assert.equal(r.sheet.vidaActual, max);
    assert.deepEqual(r.restado, { vida: 0, fatiga: 0 });
  });
});
