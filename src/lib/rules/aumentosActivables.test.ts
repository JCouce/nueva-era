import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { motivoDeBloqueo } from "./habilitacion";
import { defaultSheet, type Sheet } from "./sheet";
import { conExtrasDeFicha, resolverFicha, VITALIDAD_DE_FICHA, type FichaResuelta, type VitalidadActual } from "./fichaResuelta";
import { ACCIONES, type Accion } from "./acciones";
import { estadoInicial, resumenOpcion, type CondicionTirada, type EstadoCondiciones } from "./condiciones";
import { montarTirada, SIN_ELECCION, type TiradaMontada } from "./montaje";
import { accionesDeAumentos, ID_ACCION_REPETIDA, ID_ELECCION_ACTIVABLE, usoDeAccionAumento } from "./aumentosAcciones";
import { ID_SELECTOR_CONTRA } from "./aumentosTiradas";
import { descontarDuracion, describirEstadosActivos, type EstadoActivo } from "./estados";
import { ponerEstado } from "./estadosFicha";
import { fotoTrasCambioDeFicha, vidaTrasCambioDeEstados } from "./vidaPorEstados";
import { ajustarFatiga, ajustarVida, topesDeVida } from "./vitalidad";
import { parseSheet } from "./sheet";
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
    assert.match(motivoDeBloqueo(a.habilitacion)!, /cuesta 2 y te quedan 1/);
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

// Sync Drive 2026-11-14: el bono va a las tiradas de Potencia, Reflejos y Perspicacia (la
// Salvación de Reflejos incluida, usuario 2026-11-14), no a los atributos.
const TIRADA_DE: Record<"potencia" | "reflejos" | "perspicacia", string> = {
  potencia: "atletismo",
  reflejos: "salv_reflejos",
  perspicacia: "alerta_activa",
};
const subida = (s: Sheet, estados: EstadoActivo[]) =>
  (["potencia", "reflejos", "perspicacia"] as const).map(
    (a) => montar(resolver(s, estados), TIRADA_DE[a]).modificador - montar(resolver(s, []), TIRADA_DE[a]).modificador,
  );

describe("Neuroprótesis: bono a las tiradas y elección del nivel 2", () => {
  test("+1 a las tiradas de Potencia, Reflejos (también la salvación) y Perspicacia, solo con el estado y la pieza", () => {
    assert.deepEqual(subida(conNeuro(), [neuro()]), [1, 1, 1]);
    const m = montar(resolver(conNeuro(), [neuro()]), "salv_reflejos");
    assert.deepEqual(linea(m, /^Neuroprótesis/), [{ etiqueta: "Neuroprótesis Simpática 1", valor: 1 }]);
    // Ni Fortaleza ni Voluntad.
    assert.equal(montar(resolver(conNeuro(), [neuro()]), "salv_fortaleza").modificador, montar(resolver(conNeuro(), []), "salv_fortaleza").modificador);
    assert.equal(montar(resolver(conNeuro(), [neuro()]), "salv_voluntad").modificador, montar(resolver(conNeuro(), []), "salv_voluntad").modificador);
    // Estado sin la pieza: no hace nada.
    const sinPieza = conRecursos(defaultSheet());
    assert.deepEqual(subida(sinPieza, [neuro()]), [0, 0, 0]);
  });

  test("no toca atributos, vida, fatiga, carga, movimiento ni Alerta pasiva", () => {
    const s = { ...conNeuro(), atributos: { ...conNeuro().atributos, fuerza: 2, aguante: 1 } };
    const base = resolver(s, []);
    const activa = resolver(s, [neuro()]);
    assert.deepEqual(activa.atributos, base.atributos);
    assert.deepEqual(activa.aplicados, base.aplicados);
    assert.deepEqual(activa.salud, base.salud);
    assert.deepEqual(activa.movimiento, base.movimiento);
    assert.equal(activa.cargaMaxima, base.cargaMaxima);
    assert.deepEqual(activa.requisitosDotes, base.requisitosDotes);
  });

  test("nivel 2: se elige al activar entre los tres; el +2 sustituye al +1 en el elegido", () => {
    const s = conNeuro(2);
    const a = directa(s, [], ACTIVAR_NEURO)!;
    const sel = a.condiciones?.find((c): c is Extract<CondicionTirada, { tipo: "opcion" }> => c.id === ID_ELECCION_ACTIVABLE);
    assert.deepEqual(sel?.opciones.map((o) => o.id), ["potencia", "reflejos", "perspicacia"]);
    assert.equal(usoDeAccionAumento(s, [], ACTIVAR_NEURO).ok, false, "sin elección no se activa");
    const uso = usoDeAccionAumento(s, [], ACTIVAR_NEURO, { eleccion: "reflejos" });
    assert.ok(uso.ok && uso.op?.tipo === "poner");
    assert.equal(uso.op.estado.gradoId, "reflejos");

    assert.deepEqual(subida(s, [neuro("potencia")]), [2, 1, 1]);
    assert.deepEqual(subida(s, [neuro("reflejos")]), [1, 2, 1]);
    assert.deepEqual(subida(s, [neuro("perspicacia")]), [1, 1, 2]);
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

  // Sync Drive 2026-11-14: «−1 a los penalizadores por heridas y fatiga», en todos los niveles.
  test("heridas y fatiga −1 con la activa, en los cuatro niveles", () => {
    for (const nivel of [1, 2, 3, 4]) {
      const grado = nivel === 1 ? "activo" : "potencia";
      const m = montar(resolver(conNeuro(nivel), [neuro(grado)], HERIDO_Y_FATIGADO), "atletismo");
      assert.deepEqual(linea(m, /^Malherido/), [{ etiqueta: `Malherido (Neuroprótesis Simpática ${nivel})`, valor: -2 }], `nivel ${nivel}`);
      assert.deepEqual(linea(m, /^Fatigado/), [], `nivel ${nivel}`);
    }
  });

  // Sync Drive 2026-11-14: los penalizadores de los estados ya no se rebajan (td-11 cae).
  test("los estados, enteros: ni su −N de tirada ni el de atributo", () => {
    const aturdido: EstadoActivo = { estadoId: "aturdido", gradoId: "fracaso_critico", rondasRestantes: 1 };
    const fc = montar(resolver(conNeuro(), [aturdido, neuro()]), "defensa");
    assert.deepEqual(linea(fc, /Aturdido/), [{ etiqueta: "Aturdido", valor: -2 }]);
    const paralisis: EstadoActivo = { estadoId: "paralisis", gradoId: "fracaso", rondasRestantes: 1 };
    const s = conNeuro();
    const f = resolver(s, [paralisis, neuro()]);
    assert.equal(f.atributos.agilidad - resolver(s, [neuro()]).atributos.agilidad, -4);
    assert.ok(!f.modificadores.some((m) => m.fuente.startsWith("Neuroprótesis Simpática 1 (")));
  });

  test("td-10: la reducción de 1 no quita la media velocidad ni el recorte de carga", () => {
    const f = resolver(conNeuro(), [neuro()], HERIDO_Y_FATIGADO);
    assert.deepEqual(f.umbrales.movimiento.mediaVelocidad, ["Malherido"]);
    assert.equal(f.umbrales.movimiento.reduccionCarga?.fraccion, 0.25);
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

// --- A5b: Neuroprótesis 3 y 4 -----------------------------------------------

const ADICIONAL = "aumentos_accion_simple_adicional";
const neuro4: EstadoActivo = { estadoId: "aum_neuroprotesis_4", gradoId: "activo", rondasRestantes: 1 };
const casilla = (s: Sheet, estados: EstadoActivo[] = []) =>
  directa(s, estados, ADICIONAL)?.condiciones?.find(
    (c): c is Extract<CondicionTirada, { tipo: "toggle" }> => c.id === ID_ACCION_REPETIDA && c.tipo === "toggle",
  );

describe("A5b: acción simple adicional (Neuroprótesis 3)", () => {
  test("solo desde el nivel 3, y sin tener la Neuroprótesis activada", () => {
    assert.equal(directa(conNeuro(2), [], ADICIONAL), undefined);
    assert.ok(directa(conNeuro(3), [], ADICIONAL));
  });

  test("cuesta 2; con la casilla «ya usada», 3; sin estado con el nivel 3", () => {
    const s = conNeuro(3);
    const una = usoDeAccionAumento(s, [], ADICIONAL);
    assert.ok(una.ok);
    assert.equal(una.coste, 2);
    assert.equal(una.sheet.fatigaActual, 6);
    assert.equal(una.op, null);
    const otra = usoDeAccionAumento(s, [], ADICIONAL, { repetida: true });
    assert.ok(otra.ok);
    assert.equal(otra.coste, 3);
    assert.equal(otra.sheet.fatigaActual, 5);
    assert.equal(otra.op, null, "con el nivel 3 no hay estado");
  });

  test("sin fatiga: bloqueada a 1; a 2, la casilla de 3 sale apagada y el servidor la rechaza", () => {
    const s = conNeuro(3);
    assert.match(motivoDeBloqueo(directa({ ...s, fatigaActual: 1 }, [], ADICIONAL)!.habilitacion)!, /cuesta 2 y te quedan 1/);
    assert.equal(usoDeAccionAumento({ ...s, fatigaActual: 1 }, [], ADICIONAL).ok, false);
    const dos = { ...s, fatigaActual: 2 };
    assert.equal(directa(dos, [], ADICIONAL)!.habilitacion, undefined);
    assert.match(casilla(dos)!.bloqueada!, /cuesta 3 y te quedan 2/);
    const r = usoDeAccionAumento(dos, [], ADICIONAL, { repetida: true });
    assert.ok(!r.ok);
    assert.match(r.error, /cuesta 3 y te quedan 2/);
    assert.equal(casilla(s)!.bloqueada, undefined);
  });

  test("segunda reacción: texto en Defensa solo con la Neuroprótesis activa", () => {
    const reaccion = (f: FichaResuelta) => f.textosTirada.filter((t) => /Segunda reacción por ronda mientras/.test(t.texto));
    assert.equal(reaccion(resolver(conNeuro(3), [])).length, 0);
    const [t] = reaccion(resolver(conNeuro(3), [neuro("potencia")]));
    assert.deepEqual(t.en, { tipo: "grupo", grupo: "Defensa" });
    assert.match(t.texto, /no se apila con la de otros aumentos/); // sync Drive 2026-11-14
    assert.equal(t.fuente, "Neuroprótesis Simpática 3");
    assert.equal(reaccion(resolver(conNeuro(2), [neuro("potencia")])).length, 0);
  });

  test("el selector de activar no enseña «+0»", () => {
    const sel = directa(conNeuro(2), [], ACTIVAR_NEURO)!.condiciones![0];
    assert.ok(sel.tipo === "opcion");
    assert.deepEqual(sel.opciones.map(resumenOpcion), ["", "", ""]);
  });
});

describe("A5b: Neuroprótesis 4", () => {
  test("pagar 3 con el nivel 4 pone su estado de 1 ronda; pagar 2, no", () => {
    const s = conNeuro(4);
    const r = usoDeAccionAumento(s, [neuro("potencia")], ADICIONAL, { repetida: true });
    assert.ok(r.ok);
    assert.equal(r.coste, 3);
    assert.deepEqual(r.op, { tipo: "poner", estado: neuro4 });
    assert.match(r.mensaje, /Neuroprótesis Simpática 4 activa: 1 ronda, en combate/);
    const dos = usoDeAccionAumento(s, [], ADICIONAL);
    assert.ok(dos.ok);
    assert.equal(dos.op, null);
  });

  test("convive con la activa: otro estado, y al caerse el de 1 ronda sigue la de 3", () => {
    const tras = ponerEstado([neuro("potencia", 3)], neuro4);
    assert.deepEqual(tras, [neuro("potencia", 3), neuro4]);
    assert.deepEqual(descontarDuracion(tras), [neuro("potencia", 2)]);
    const [, chip] = describirEstadosActivos(tras);
    assert.equal(chip.duracionActivable, "1 ronda, en combate");
  });

  test("+2 a las tiradas de los tres sustituyendo al +1/+2 de la activa, sin sumar", () => {
    const s = conNeuro(4);
    assert.deepEqual(subida(s, [neuro("potencia")]), [2, 1, 1]);
    assert.deepEqual(subida(s, [neuro("potencia"), neuro4]), [2, 2, 2]);
    assert.deepEqual(subida(s, [neuro4]), [2, 2, 2], "sin la activa, también");
    assert.deepEqual(resolver(s, [neuro("potencia"), neuro4]).atributos, resolver(s, []).atributos, "los atributos, quietos");
  });

  test("heridas y fatiga a 0 mientras dura; los estados, enteros", () => {
    const s = conNeuro(4);
    const m = montar(resolver(s, [neuro("potencia"), neuro4], HERIDO_Y_FATIGADO), "atletismo");
    assert.deepEqual(linea(m, /^(Malherido|Fatigado)/), []);
    const sin = montar(resolver(s, [neuro("potencia")], HERIDO_Y_FATIGADO), "atletismo");
    assert.deepEqual(linea(sin, /^Malherido/).map((l) => l.valor), [-2]);
    const aturdido: EstadoActivo = { estadoId: "aturdido", gradoId: "fracaso_critico", rondasRestantes: 1 };
    const conEstado = montar(resolver(s, [aturdido, neuro("potencia"), neuro4]), "defensa");
    assert.equal(linea(conEstado, /Aturdido/).reduce((t, l) => t + l.valor, 0), -2);
  });

  test("td-10: «elimina por completo» quita también la media velocidad y el recorte de carga", () => {
    const s = conNeuro(4);
    const con4 = resolver(s, [neuro("potencia"), neuro4], HERIDO_Y_FATIGADO);
    assert.deepEqual(con4.umbrales.movimiento.mediaVelocidad, []);
    assert.equal(con4.umbrales.movimiento.reduccionCarga, null);
    assert.equal(con4.umbrales.salud, "malherido", "el umbral sigue ahí: solo se quitan sus penalizadores");
    const sin4 = resolver(s, [neuro("potencia")], HERIDO_Y_FATIGADO);
    assert.deepEqual(sin4.umbrales.movimiento.mediaVelocidad, ["Malherido"]);
    assert.ok(con4.movimiento.carrera > sin4.movimiento.carrera);
    assert.ok(con4.cargaMaxima > sin4.cargaMaxima);
  });

  test("no cuenta para los requisitos de dote", () => {
    const s = conNeuro(4);
    assert.deepEqual(resolver(s, [neuro("potencia"), neuro4]).requisitosDotes, resolver(s, []).requisitosDotes);
  });

  test("Desactivar sale detrás de la acción adicional", () => {
    const filas = accionesDeAumentos(conNeuro(4), [neuro4]).filas.map((f) => f.accion.id);
    assert.equal(filas[filas.indexOf(ADICIONAL) + 1], "aumentos_desactivar_aum_neuroprotesis_4");
  });
});

// Sync Drive 2026-11-14: ningún activable mueve ya la vida ni la fatiga máximas (la Neuroprótesis
// sube tiradas). Se fue el recorte al caerse uno y el tope «posible» de parseSheet (A5b).
describe("activables y vida", () => {
  const s = { ...conNeuro(2), atributos: { ...conNeuro(2).atributos, fuerza: 2, aguante: 1 } };
  const max = resolver(s, []).salud.vida;

  test("con la Neuroprótesis puesta, en cualquier grado, el máximo es el de siempre", () => {
    for (const grado of ["potencia", "reflejos", "perspicacia"]) {
      assert.deepEqual(topesDeVida(s, [neuro(grado)]), topesDeVida(s, []), grado);
    }
    assert.equal(ajustarVida({ ...s, vidaActual: max - 1 }, 5, [neuro("potencia")]).vidaActual, max);
  });

  test("activarla o que se caiga no toca la vida", () => {
    const llena = { ...s, vidaActual: max };
    for (const [antes, despues] of [[[], [neuro("potencia")]], [[neuro("potencia")], []]] as EstadoActivo[][][]) {
      const r = vidaTrasCambioDeEstados(llena, antes, despues);
      assert.equal(r.sheet.vidaActual, max);
      assert.deepEqual(r.restado, { vida: 0, fatiga: 0 });
    }
  });

  test("un estado que no baja el máximo no recorta (S74 sigue igual)", () => {
    const encima = { ...s, vidaActual: max + 3 };
    const atrapado: EstadoActivo = { estadoId: "atrapado", gradoId: "activo", rondasRestantes: 3 };
    assert.equal(vidaTrasCambioDeEstados(encima, [atrapado], []).sheet.vidaActual, max + 3);
  });

  test("parseSheet recorta al máximo en reposo", () => {
    const leida = parseSheet(JSON.parse(JSON.stringify({ ...s, vidaActual: 99 })));
    assert.equal(leida.vidaActual, max);
    assert.equal(ajustarFatiga({ ...leida, fatigaActual: 0 }, 99).fatigaActual, resolver(s, []).salud.fatiga);
  });
});

describe("A5b: lo que la ficha cobra en combate llega a la foto", () => {
  const foto = { id: "c1", pgActual: 6, pgMax: 10, fatigaActual: 5, fatigaMax: 8 };
  const ficha = { vidaActual: 9, fatigaActual: 7 };

  test("cobrar fatiga la resta de la foto, con suelo 0", () => {
    assert.deepEqual(fotoTrasCambioDeFicha(foto, ficha, { ...ficha, fatigaActual: 4 }), { ...foto, fatigaActual: 2 });
    assert.equal(fotoTrasCambioDeFicha(foto, ficha, { ...ficha, fatigaActual: 0 }).fatigaActual, 0);
  });

  test("sumar (Sanar letal, devolver Densificar) topa en el máximo de la foto", () => {
    assert.equal(fotoTrasCambioDeFicha(foto, ficha, { ...ficha, vidaActual: 10 }).pgActual, 7);
    assert.equal(fotoTrasCambioDeFicha(foto, ficha, { ...ficha, fatigaActual: 12 }).fatigaActual, 8);
  });

  test("sin cambio en la ficha, la misma foto", () => {
    assert.equal(fotoTrasCambioDeFicha(foto, ficha, { ...ficha }), foto);
  });

  test("td-25: con la fatiga cobrada de la foto, se resta esa y no la diferencia de la ficha", () => {
    // La ficha (1) solo baja 1 al cobrar 3 contra la foto (5): la foto baja 3.
    assert.equal(fotoTrasCambioDeFicha(foto, { vidaActual: 9, fatigaActual: 1 }, { vidaActual: 9, fatigaActual: 0 }, 3).fatigaActual, 2);
  });
});
