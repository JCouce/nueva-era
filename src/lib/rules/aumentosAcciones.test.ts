import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";
import { accionesDeAumentos, operacionDeEfecto, usoDeAccionAumento, type EfectoAccionAumento } from "./aumentosAcciones";
import { topesEnReposo } from "./vitalidad";
import type { EstadoActivo } from "./estados";

let n = 0;
function con(sheet: Sheet, catalogoId: string, nivel?: number): Sheet {
  return { ...sheet, equipo: [...sheet.equipo, { instanciaId: `x${++n}`, catalogoId, ...(nivel !== undefined && { nivel }) }] };
}
const conTodas = (ids: string[], base = defaultSheet()) => ids.reduce((s, id) => con(s, id), base);
// Fatiga y vida de sobra para que nada se bloquee (parseSheet no pasa por aquí).
const conRecursos = (s: Sheet, fatiga = 8, vida = 8): Sheet => ({ ...s, fatigaActual: fatiga, vidaActual: vida });

const MIELINIZACION = "aum_mielinizacion_central";
const RED = "aum_red_frontoparietal";
const ANGIOGENESIS = "aum_angiogenesis_sistemica";
const MATRIZ_OSEA = "aum_matriz_osea_adaptativa";
const BIOGENESIS = "aum_biogenesis_mitocondrial";
const REGENERACION = "aum_regeneracion_tisular_acelerada";
const ESTABILIZACION = "aum_estabilizacion_autonomica";
const MQE = "aum_microprocesador_cuantico_de_enlace";
const ENJAMBRE = "aum_enjambre_nanobot";

const porId = (s: Sheet) => new Map(accionesDeAumentos(s).directas.map((a) => [a.id, a]));
const asustado: EstadoActivo = { estadoId: "miedo", gradoId: "asustado", rondasRestantes: null };
const aterrorizado: EstadoActivo = { estadoId: "miedo", gradoId: "aterrorizado", rondasRestantes: 3 };
const hemorragia: EstadoActivo = { estadoId: "hemorragia", gradoId: "activo", rondasRestantes: null };

describe("acciones de aumento: cuáles salen y cuánto cuestan", () => {
  test("sin aumentos no hay sección", () => {
    const r = resolverFicha(defaultSheet(), { estados: [], vitalidad: VITALIDAD_DE_FICHA }).accionesAumentos;
    assert.deepEqual(r, { directas: [], informativas: [] });
  });

  test("coste por pieza", () => {
    const s = conRecursos(conTodas([MIELINIZACION, RED, MATRIZ_OSEA, BIOGENESIS, ANGIOGENESIS, REGENERACION, ESTABILIZACION]));
    const a = porId(s);
    const coste = (id: string) => a.get(id)?.costeFatiga ?? 0;
    assert.equal(coste("aumentos_accion_combinada"), 1);
    assert.equal(coste("aumentos_cortar_hemorragia"), 1);
    assert.equal(coste("aumentos_cortar_exanguinante"), 2);
    assert.equal(coste("aumentos_eliminar_exanguinante"), 1);
    assert.equal(coste("aumentos_sacudir_miedo"), 0);
    assert.equal(coste("aumentos_dominar_terror"), 0);
    for (const x of a.values()) assert.equal(x.grupo, "Aumentos");
    assert.match(a.get("aumentos_cortar_hemorragia")!.nota!, /^Acción gratuita, 1 de fatiga\./);
  });

  test("requisito roto: sin Mielinización no hay acción combinada; sin Angiogénesis, nada de hemorragias", () => {
    const a = porId(conRecursos(conTodas([RED, MATRIZ_OSEA, ANGIOGENESIS, REGENERACION])));
    assert.equal(a.size, 0);
  });

  test("MQE por nivel: el mensaje cambia de alcance y llega a varias personas desde el 2; Telemetría desde el 2", () => {
    const n1 = porId(con(defaultSheet(), MQE, 1));
    assert.deepEqual([...n1.keys()], ["aumentos_mqe_comunicar"]);
    assert.match(n1.get("aumentos_mqe_comunicar")!.nota!, /de uno en uno.*50 m/);
    const n3 = porId(con(defaultSheet(), MQE, 3));
    assert.deepEqual([...n3.keys()].sort(), ["aumentos_mqe_comunicar", "aumentos_mqe_telemetria"]);
    assert.match(n3.get("aumentos_mqe_comunicar")!.nota!, /varias personas.*500 m/);
    assert.equal(n3.get("aumentos_mqe_comunicar")!.costeFatiga, undefined);
  });

  test("defensa del MQE: la del nivel que se tiene, sin botón", () => {
    const info = (nivel: number) => accionesDeAumentos(con(defaultSheet(), MQE, nivel)).informativas;
    assert.equal(info(1).length, 1);
    assert.equal(info(1)[0].fuente, "Microprocesador Cuántico de Enlace 1");
    assert.ok(info(1)[0].lineas.includes("Dificultad de infiltración: 13 (+1 por turno)."));
    const cuatro = info(4)[0].lineas.join(" ");
    assert.match(cuatro, /Alcance: 2 km/);
    assert.match(cuatro, /16/);
    assert.match(cuatro, /cepo del nivel 3/);
  });

  test("Enjambre: las de sanar llegan con el nivel 2, no con el 1", () => {
    assert.equal(porId(conRecursos(con(defaultSheet(), ENJAMBRE, 1))).size, 0);
    const a = porId(conRecursos(con(defaultSheet(), ENJAMBRE, 4)));
    assert.equal(a.get("aumentos_enjambre_sanar_letal")?.costeFatiga, 1);
    assert.equal(a.get("aumentos_enjambre_sanar_grave")?.costeFatiga, 1);
  });

  test("sin fatiga suficiente, la acción sale bloqueada y el servidor la rechaza", () => {
    const s = conRecursos(conTodas([MATRIZ_OSEA, BIOGENESIS, ANGIOGENESIS]), 1);
    const a = porId(s);
    assert.equal(a.get("aumentos_cortar_hemorragia")!.bloqueada, undefined);
    assert.match(a.get("aumentos_cortar_exanguinante")!.bloqueada!, /cuesta 2 y te quedan 1/);
    const uso = usoDeAccionAumento(s, [], "aumentos_cortar_exanguinante");
    assert.equal(uso.ok, false);
  });
});

describe("usar una acción de aumento", () => {
  const angio = conRecursos(conTodas([MATRIZ_OSEA, BIOGENESIS, ANGIOGENESIS]), 5);
  const estab = conRecursos(con(defaultSheet(), ESTABILIZACION));

  test("Cortar hemorragia: cobra 1 y quita la hemorragia", () => {
    const uso = usoDeAccionAumento(angio, [hemorragia], "aumentos_cortar_hemorragia");
    assert.ok(uso.ok);
    assert.equal(uso.sheet.fatigaActual, 4);
    assert.deepEqual(uso.op, { tipo: "quitar", estadoId: "hemorragia" });
    assert.match(uso.mensaje, /Se te quita Hemorragia/);
  });

  test("sin el estado, cobra igual y no cambia nada", () => {
    const uso = usoDeAccionAumento(angio, [], "aumentos_cortar_hemorragia");
    assert.ok(uso.ok);
    assert.equal(uso.sheet.fatigaActual, 4);
    assert.equal(uso.op, null);
    assert.match(uso.mensaje, /No tienes Hemorragia/);
  });

  test("Cortar exanguinante: solo cobra 2", () => {
    const uso = usoDeAccionAumento(angio, [hemorragia], "aumentos_cortar_exanguinante");
    assert.ok(uso.ok);
    assert.equal(uso.sheet.fatigaActual, 3);
    assert.equal(uso.op, null);
  });

  test("una acción que la ficha no tiene se rechaza", () => {
    assert.equal(usoDeAccionAumento(estab, [hemorragia], "aumentos_cortar_hemorragia").ok, false);
  });

  test("Dominar terror: de Aterrorizado a Asustado, conservando la duración; Sacudir miedo, de Asustado a nada", () => {
    const dominar = usoDeAccionAumento(estab, [aterrorizado], "aumentos_dominar_terror");
    assert.ok(dominar.ok);
    assert.deepEqual(dominar.op, { tipo: "poner", estado: { ...aterrorizado, gradoId: "asustado" } });
    assert.equal(dominar.sheet.fatigaActual, 8);
    assert.match(dominar.mensaje, /Pasas de Aterrorizado a Asustado/);
    const sacudir = usoDeAccionAumento(estab, [asustado], "aumentos_sacudir_miedo");
    assert.ok(sacudir.ok);
    assert.deepEqual(sacudir.op, { tipo: "quitar", estadoId: "miedo" });
  });

  test("en el grado que no toca, no cambia nada", () => {
    assert.equal(operacionDeEfecto({ tipo: "estado", estadoId: "miedo", desde: "asustado", a: null }, [aterrorizado]), null);
    assert.equal(operacionDeEfecto({ tipo: "estado", estadoId: "miedo", desde: "aterrorizado", a: "asustado" }, [asustado]), null);
    const vida: EfectoAccionAumento = { tipo: "vida", delta: 1 };
    assert.equal(operacionDeEfecto(vida, [asustado]), null);
  });

  test("Sanar letal: 1 de fatiga y +1 de vida, topado al máximo", () => {
    const base = con(defaultSheet(), ENJAMBRE, 2);
    const max = topesEnReposo(base).vida;
    const herido = usoDeAccionAumento(conRecursos(base, 3, max - 1), [], "aumentos_enjambre_sanar_letal");
    assert.ok(herido.ok);
    assert.equal(herido.sheet.vidaActual, max);
    assert.equal(herido.sheet.fatigaActual, 2);
    const entero = usoDeAccionAumento(conRecursos(base, 3, max), [], "aumentos_enjambre_sanar_letal");
    assert.ok(entero.ok);
    assert.equal(entero.sheet.vidaActual, max);
    assert.equal(entero.sheet.fatigaActual, 2);
    assert.match(entero.mensaje, /Ya estabas al máximo/);
  });

  test("Sanar grave: cada pulsación cobra 1, sin tocar la vida", () => {
    const s = conRecursos(con(defaultSheet(), ENJAMBRE, 2), 3, 4);
    const uso = usoDeAccionAumento(s, [], "aumentos_enjambre_sanar_grave");
    assert.ok(uso.ok);
    assert.equal(uso.sheet.fatigaActual, 2);
    assert.equal(uso.sheet.vidaActual, 4);
  });
});
