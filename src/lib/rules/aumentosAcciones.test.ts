import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";
import { accionesDeAumentos, operacionDeEfecto, usoDeAccionAumento, type EfectoAccionAumento } from "./aumentosAcciones";
import { topesDeVida } from "./vitalidad";
import type { EstadoActivo } from "./estados";
import { montarTirada, SIN_ELECCION } from "./montaje";
import { resolverDanio, type Accion } from "./acciones";
import { casillaBlindajeReactivo, desgloseBlindaje, SIN_ARMADURA_NATURAL, type TipoDanio } from "./blindaje";
import type { EspecialidadId } from "../catalog/especialidades";

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
    assert.deepEqual(r, { filas: [], directas: [], informativas: [] });
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
    const max = topesDeVida(base).vida;
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

// ── A4b ──────────────────────────────────────────────────────────────

const INTROGRESION = "aum_introgresion_sensorial_heterologa";
const BRAZO = "aum_brazo_bionico";
const RED_SIN_MIELINIZACION = RED; // requisito roto: no da nada

function conEleccion(sheet: Sheet, catalogoId: string, eleccion: string): Sheet {
  return { ...sheet, equipo: [...sheet.equipo, { instanciaId: `x${++n}`, catalogoId, eleccion }] };
}
const filas = (s: Sheet) => accionesDeAumentos(s).filas;
const tiradaDe = (s: Sheet, id: string): Accion | undefined => {
  const f = filas(s).find((x) => x.accion.id === id);
  return f?.tipo === "tirada" ? f.accion : undefined;
};
const resolver = (s: Sheet) => resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA });

describe("A4b: Barrido electromagnético", () => {
  test("tres filas, juntas y en orden: ampliar a 30 m, a 60 m (1 de fatiga) y la tirada de buscar", () => {
    const s = conRecursos(conEleccion(defaultSheet(), INTROGRESION, "percepcion_electromagnetica"));
    const f = filas(s);
    assert.deepEqual(
      f.map((x) => [x.tipo, x.accion.id]),
      [
        ["directa", "aumentos_barrido_30"],
        ["directa", "aumentos_barrido_60"],
        ["tirada", "aumentos_barrido_buscar"],
      ],
    );
    const [a30, a60] = accionesDeAumentos(s).directas;
    assert.equal(a30.costeFatiga, undefined);
    assert.match(a30.nota!, /^Acción compleja, sin coste\./);
    assert.equal(a60.costeFatiga, 1);
    const buscar = tiradaDe(s, "aumentos_barrido_buscar")!;
    assert.equal(buscar.aplicado, "perspicacia");
    assert.equal(buscar.habilidad, "exploracion");
    assert.equal(buscar.dificultadSugerida, undefined);
    assert.equal(buscar.costeFatiga, undefined);
    assert.match(buscar.nota!, /^Dificultad: la pone el máster\./);
    assert.match(buscar.nota!, /\(Introgresión Sensorial Heteróloga \(Percepción Electromagnética\)\)$/);
  });

  test("solo con el sentido electromagnético", () => {
    for (const otro of ["vision_nocturna", "vision_termica", "espectro_ultravioleta", "deteccion_quimica", "ecolocalizacion"]) {
      assert.equal(filas(conRecursos(conEleccion(defaultSheet(), INTROGRESION, otro))).length, 0, otro);
    }
  });

  test("ampliar a 60 m: sin fatiga sale bloqueada y el servidor la rechaza; ampliar a 30 m se usa igual", () => {
    const s = conRecursos(conEleccion(defaultSheet(), INTROGRESION, "percepcion_electromagnetica"), 0);
    assert.match(porId(s).get("aumentos_barrido_60")!.bloqueada!, /cuesta 1 y te quedan 0/);
    assert.equal(usoDeAccionAumento(s, [], "aumentos_barrido_60").ok, false);
    const uso = usoDeAccionAumento(conRecursos(s, 3), [], "aumentos_barrido_60");
    assert.ok(uso.ok);
    assert.equal(uso.sheet.fatigaActual, 2);
    assert.ok(usoDeAccionAumento(s, [], "aumentos_barrido_30").ok);
  });
});

describe("A4b: Tempestad Nanobótica", () => {
  test("solo con Enjambre 4", () => {
    for (const nivel of [1, 2, 3]) assert.equal(tiradaDe(conRecursos(con(defaultSheet(), ENJAMBRE, nivel)), "aumentos_tempestad_nanobotica"), undefined);
    assert.ok(tiradaDe(conRecursos(con(defaultSheet(), ENJAMBRE, 4)), "aumentos_tempestad_nanobotica"));
  });

  test("Reflejos + Tecnociencia, dificultad 0, 2 de fatiga al tirar y 1 grave fijo sin bono por éxitos", () => {
    const s = conRecursos(con(defaultSheet(), ENJAMBRE, 4));
    const t = tiradaDe(s, "aumentos_tempestad_nanobotica")!;
    assert.equal(t.aplicado, "reflejos");
    assert.equal(t.habilidad, "tecnociencia");
    assert.equal(t.dificultadSugerida, 0);
    assert.equal(t.costeFatiga, 2);
    assert.equal(t.bloqueada, undefined);
    assert.deepEqual(t.ataque!.modos.map((m) => [m.danio, m.categoriaDanio]), [[1, "Grave"]]);
    assert.match(t.efectos![0].texto, /blindaje del objetivo/);
    const m = montarTirada(resolver(s), t, SIN_ELECCION);
    assert.equal(m.costeFatiga, 2);
    assert.equal(m.danio.sinBonoExitos, "Tempestad Nanobótica");
    // Con 7 éxitos un ataque normal sumaría +3: aquí se queda en 1.
    const d = resolverDanio(1, 7, "Grave", m.danio);
    assert.equal(d.total, 1);
    assert.equal(d.bonoExitos, 0);
  });

  test("sin 2 de fatiga sale bloqueada", () => {
    const t = tiradaDe(conRecursos(con(defaultSheet(), ENJAMBRE, 4), 1), "aumentos_tempestad_nanobotica")!;
    assert.match(t.bloqueada!, /cuesta 2 y te quedan 1/);
  });
});

describe("A4b: Densificar", () => {
  const enj = (nivel: number, fatiga = 3) => conRecursos(con(defaultSheet(), ENJAMBRE, nivel), fatiga);
  const conTipos: TipoDanio[] = ["cinetico", "electrico", "frio", "corrosivo", "plasma", "sonico", "toxico"];

  test("marcada: +3 en los tipos en los que cuenta el blindaje", () => {
    for (const tipo of conTipos) {
      const d = desgloseBlindaje(enj(3), tipo, false, SIN_ARMADURA_NATURAL, true);
      assert.deepEqual(d, [{ etiqueta: "Densificar · Enjambre Nanobot 3", valor: 3 }], tipo);
      assert.equal(casillaBlindajeReactivo(enj(3), tipo, false)!.bloqueada, null, tipo);
    }
    assert.deepEqual(desgloseBlindaje(enj(3), "cinetico", false, SIN_ARMADURA_NATURAL, false), []);
  });

  test("nada contra Mental ni Fuego sin Ignífuga: la casilla sale apagada con el motivo", () => {
    assert.deepEqual(desgloseBlindaje(enj(4), "mental", false, SIN_ARMADURA_NATURAL, true), [{ etiqueta: "Mental omite blindaje", valor: 0 }]);
    assert.deepEqual(desgloseBlindaje(enj(4), "fuego", false, SIN_ARMADURA_NATURAL, true), [
      { etiqueta: "Fuego (falta Mejora Ignífuga)", valor: 0 },
    ]);
    assert.match(casillaBlindajeReactivo(enj(4), "mental", false)!.bloqueada!, /mental/);
    assert.match(casillaBlindajeReactivo(enj(4), "fuego", true)!.bloqueada!, /Ignífuga/);
  });

  test("solo con Enjambre 3+", () => {
    for (const nivel of [1, 2]) {
      assert.equal(casillaBlindajeReactivo(enj(nivel), "cinetico", false), null);
      assert.deepEqual(desgloseBlindaje(enj(nivel), "cinetico", false, SIN_ARMADURA_NATURAL, true), []);
    }
    const c = casillaBlindajeReactivo(enj(4), "cinetico", false)!;
    assert.equal(c.etiqueta, "Densificar (Enjambre Nanobot, 1 fatiga)");
    assert.equal(c.costeFatiga, 1);
    assert.match(c.nota, /\+3 a la salvación contra el aturdimiento/);
  });

  test("sin fatiga no se puede marcar; ya marcada (pagada), sí se desmarca", () => {
    assert.match(casillaBlindajeReactivo(enj(3, 0), "cinetico", false)!.bloqueada!, /cuesta 1 y te quedan 0/);
    assert.equal(casillaBlindajeReactivo(enj(3, 0), "cinetico", true)!.bloqueada, null);
  });
});

describe("A4b: Incorporar arma", () => {
  const brazo = (nivel: number, especialidades: EspecialidadId[] = []) => {
    const base = con(defaultSheet(), BRAZO, nivel);
    const s: Sheet = { ...base, habilidades: { ...base.habilidades, biociencia: { valor: 4, especialidades } } };
    return conRecursos(s);
  };

  test("en cualquier nivel: Perspicacia + Biociencia, dificultad 8, sin coste", () => {
    for (const nivel of [1, 2, 3, 4]) {
      const t = tiradaDe(brazo(nivel), "aumentos_montar_arma_brazo");
      assert.ok(t, `nivel ${nivel}`);
      assert.equal(t.aplicado, "perspicacia");
      assert.equal(t.habilidad, "biociencia");
      assert.equal(t.dificultadSugerida, 8);
      assert.equal(t.costeFatiga, undefined);
      assert.deepEqual(t.especialidadesAccion, ["bionica"]);
      assert.match(t.nota!, /^Acción extendida de 10 minutos\./);
    }
  });

  test("con Biónica va en especialidad; sin ella, a la mitad", () => {
    const con_ = brazo(1, ["bionica"]);
    const m = montarTirada(resolver(con_), tiradaDe(con_, "aumentos_montar_arma_brazo")!, SIN_ELECCION);
    assert.equal(m.enEspecialidad, true);
    assert.equal(m.habilidad?.valor, 4);
    const sin = brazo(1);
    const m2 = montarTirada(resolver(sin), tiradaDe(sin, "aumentos_montar_arma_brazo")!, SIN_ELECCION);
    assert.equal(m2.enEspecialidad, false);
    assert.equal(m2.habilidad?.valor, 2);
    assert.deepEqual(m2.especialidadArma, { id: "bionica", label: "Biónica", tiene: false });
  });
});

describe("A4b: con un requisito roto no hay nada", () => {
  test("una operación con requisito roto junto a las piezas no añade filas; las piezas siguen dando las suyas", () => {
    const s = conRecursos(
      conEleccion(con(con(con(defaultSheet(), RED_SIN_MIELINIZACION), ENJAMBRE, 4), BRAZO, 1), INTROGRESION, "percepcion_electromagnetica"),
    );
    const ids = filas(s).map((f) => f.accion.id);
    assert.ok(!ids.includes("aumentos_accion_combinada"));
    assert.deepEqual(ids.filter((id) => /barrido|tempestad|montar_arma/.test(id)).sort(), [
      "aumentos_barrido_30",
      "aumentos_barrido_60",
      "aumentos_barrido_buscar",
      "aumentos_montar_arma_brazo",
      "aumentos_tempestad_nanobotica",
    ]);
  });
});

