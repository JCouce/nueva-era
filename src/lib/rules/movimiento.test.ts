import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet } from "./sheet";
import { equipar } from "./equipo";
import { accionesDeMovimiento, accionesDirectasDeMovimiento, conEsquivaEnVuelo } from "./movimiento";
import { capacidadDePieza } from "./recursos";
import { resolverVuelo, MARGEN_CRITICO, ACCIONES, usarHabilidadAlternativa, gastoDeDirecta, gastoTotal } from "./acciones";
import { resolverFicha, conExtrasDeFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";
import { montarTirada, eleccionSinTocar } from "./montaje";
import { equipoPorId } from "../catalog/equipo";
import type { Sheet } from "./sheet";

function equiparMovilidadAerea(nivel: number) {
  let s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_pesada" }); // tope 4
  s = equipar(s, { instanciaId: "m1", catalogoId: "movilidad_aerea", nivel, instaladoEnId: "arm1" });
  return s;
}

describe("accionesDeMovimiento", () => {
  test("sin nada equipado, ninguna tirada", () => {
    assert.deepEqual(accionesDeMovimiento(defaultSheet()), []);
  });

  test("Exoesqueleto (misma familia, no es Movilidad Aérea) no genera tirada", () => {
    let s = equipar(defaultSheet(), { instanciaId: "arm1", catalogoId: "armadura_pesada" });
    s = equipar(s, { instanciaId: "e1", catalogoId: "exoesqueleto", nivel: 1, instaladoEnId: "arm1" });
    assert.deepEqual(accionesDeMovimiento(s), []);
  });

  test("Propulsión Aérea nivel 1: Reflejos + Pilotaje (Exoarmadura), maniobrabilidad −3, grupo Acciones", () => {
    const sheet = equiparMovilidadAerea(1);
    const [accion] = accionesDeMovimiento(sheet);
    assert.equal(accion.label, "Volar: maniobra compleja");
    assert.equal(accion.grupo, "Acciones");
    assert.equal(accion.aplicado, "reflejos");
    assert.equal(accion.habilidad, "pilotaje");
    assert.deepEqual(accion.especialidadesAccion, ["exoarmadura"]);
    assert.deepEqual(accion.ajustesFijos, [{ valor: -3, fuente: "Maniobrabilidad (Propulsión Aérea)" }]);
    assert.deepEqual(accion.vuelo, { velocidadBase: 50, bonusCritico: 25 });
  });

  test("Máxima Potencia vive como toggle en condiciones, no como acción aparte", () => {
    const sheet = equiparMovilidadAerea(1);
    const [accion] = accionesDeMovimiento(sheet);
    const toggle = accion.condiciones?.find((c) => c.id === "maxima_potencia");
    assert.ok(toggle);
    assert.equal(toggle?.tipo, "toggle");
    // No debe tocar el modificador de la tirada — solo cambia el payout.
    if (toggle?.tipo === "toggle") {
      assert.equal(toggle.valorActivo, 0);
      assert.equal(toggle.valorInactivo, 0);
    }
  });

  test("recursoInstanciaId apunta a la instancia de Movilidad Aérea", () => {
    const sheet = equiparMovilidadAerea(1);
    const [accion] = accionesDeMovimiento(sheet);
    assert.equal(accion.recursoInstanciaId, "m1");
  });

  test("Máxima Potencia gasta 2 cargas, normal gasta 1 (docs/prompt-gasto-recursos.md, Fase 1)", () => {
    const sheet = equiparMovilidadAerea(1);
    const [accion] = accionesDeMovimiento(sheet);
    const toggle = accion.condiciones?.find((c) => c.id === "maxima_potencia");
    assert.ok(toggle?.tipo === "toggle");
    if (toggle?.tipo === "toggle") {
      assert.equal(toggle.gastoInactivo, 1);
      assert.equal(toggle.gastoActivo, 2);
    }
  });

  test("nivel 4: ajuste −4, vuelo con los números de ese nivel", () => {
    const sheet = equiparMovilidadAerea(4);
    const [accion] = accionesDeMovimiento(sheet);
    assert.deepEqual(accion.ajustesFijos, [{ valor: -4, fuente: "Maniobrabilidad (Propulsión Aérea)" }]);
    assert.deepEqual(accion.vuelo, { velocidadBase: 140, bonusCritico: 70 });
  });
});

describe("Volar a media velocidad (Malherido/Exhausto, S26; td-26)", () => {
  test("con media velocidad, la base de la tirada es la mitad y la nota lo dice", () => {
    const [accion] = accionesDeMovimiento(equiparMovilidadAerea(1), { mediaVelocidad: ["Malherido"] });
    assert.deepEqual(accion.vuelo, { velocidadBase: 25, bonusCritico: 25 });
    assert.match(accion.nota ?? "", /Media velocidad \(Malherido\): 25 m en vez de 50 m\./);
  });

  test("sin umbrales, entera y sin nota de media velocidad", () => {
    const [accion] = accionesDeMovimiento(equiparMovilidadAerea(1), { mediaVelocidad: [] });
    assert.equal(accion.vuelo?.velocidadBase, 50);
    assert.doesNotMatch(accion.nota ?? "", /Media velocidad/);
  });

  test("la ficha resuelta da la misma velocidad en Estado y en la tirada", () => {
    // Exhausto por la fatiga del combate (la que manda en combate): 1 de 20.
    const ficha = resolverFicha(equiparMovilidadAerea(2), {
      estados: [],
      vitalidad: { origen: "combate", pgActual: 20, pgMax: 20, fatigaActual: 1, fatigaMax: 20 },
    });
    assert.ok(ficha.umbrales.movimiento.mediaVelocidad.length > 0);
    const [accion] = ficha.accionesMovimiento;
    assert.equal(accion.vuelo?.velocidadBase, ficha.vuelo?.velocidadM);
    assert.equal(accion.vuelo?.velocidadBase, 35);
  });
});

describe("resolverVuelo (nivel 1: base 50 m, bonus crítico 25 m)", () => {
  const vuelo = { velocidadBase: 50, bonusCritico: 25 };

  test("éxito normal, sin Máxima Potencia: la velocidad base", () => {
    assert.deepEqual(resolverVuelo(vuelo, 0, false), { metros: 50, descontrolado: false });
  });

  test("éxito con Máxima Potencia: el doble", () => {
    assert.deepEqual(resolverVuelo(vuelo, 0, true), { metros: 100, descontrolado: false });
  });

  test("éxito crítico sin Máxima Potencia: sin bonus (es propiedad de Máxima Potencia)", () => {
    assert.deepEqual(resolverVuelo(vuelo, MARGEN_CRITICO, false), { metros: 50, descontrolado: false });
  });

  test("éxito crítico con Máxima Potencia: el doble más el bonus", () => {
    assert.deepEqual(resolverVuelo(vuelo, MARGEN_CRITICO, true), { metros: 125, descontrolado: false });
  });

  test("fallo (no crítico): la mitad de la base que tocara", () => {
    assert.deepEqual(resolverVuelo(vuelo, -1, false), { metros: 25, descontrolado: false });
    assert.deepEqual(resolverVuelo(vuelo, -1, true), { metros: 50, descontrolado: false });
  });

  test("fracaso crítico: descontrolado, sin metros fijos, sea cual sea el modo", () => {
    assert.deepEqual(resolverVuelo(vuelo, -MARGEN_CRITICO, false), { metros: null, descontrolado: true });
    assert.deepEqual(resolverVuelo(vuelo, -MARGEN_CRITICO, true), { metros: null, descontrolado: true });
  });
});

describe("capacidadDePieza — Movilidad Aérea", () => {
  test("es un recurso tipo tope, con la célula de 10 cargas", () => {
    const cap = capacidadDePieza({ instanciaId: "m1", catalogoId: "movilidad_aerea", nivel: 1 });
    assert.deepEqual(cap, { max: 10, tipo: "tope" });
  });

  test("Exoesqueleto no tiene recurso (su célula no está poblada en el catálogo)", () => {
    const cap = capacidadDePieza({ instanciaId: "e1", catalogoId: "exoesqueleto", nivel: 1 });
    assert.equal(cap, null);
  });
});

describe("conEsquivaEnVuelo", () => {
  const defensa = ACCIONES.find((t) => t.id === "defensa")!;

  test("sin Movilidad Aérea, la esquiva no cambia", () => {
    assert.equal(conEsquivaEnVuelo(defaultSheet(), defensa), defensa);
  });

  test("con Propulsión Aérea 4, la casilla En vuelo esquiva con Pilotaje (Exoarmadura) y −4", () => {
    const t = conEsquivaEnVuelo(equiparMovilidadAerea(4), defensa);
    assert.equal(t.habilidadAlternativa?.etiqueta, "En vuelo: Exoarmadura, −4");
    const enVuelo = usarHabilidadAlternativa(t)!;
    assert.equal(enVuelo.habilidad, "pilotaje");
    assert.deepEqual(enVuelo.especialidadesAccion, ["exoarmadura"]);
    assert.deepEqual(enVuelo.ajustesFijos, [{ valor: -4, fuente: "Maniobrabilidad (Propulsión Aérea)" }]);
  });

  test("solo toca la esquiva", () => {
    const otra = ACCIONES.find((t) => t.id !== "defensa")!;
    assert.equal(conEsquivaEnVuelo(equiparMovilidadAerea(1), otra), otra);
  });
});

describe("Propulsión Aérea (foto de Drive 2026-11-14)", () => {
  const conPilotaje = (s: Sheet, especialidades: Sheet["habilidades"]["pilotaje"]["especialidades"]) => ({
    ...s,
    habilidades: { ...s.habilidades, pilotaje: { valor: 4, especialidades } },
  });
  const resolver = (s: Sheet) => resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA });

  test("la pieza se llama Propulsión Aérea; el id se queda", () => {
    const [accion] = accionesDeMovimiento(equiparMovilidadAerea(1));
    assert.equal(accion.origen?.label, "Propulsión Aérea");
    assert.equal(equipoPorId("movilidad_aerea")?.label, "Propulsión Aérea");
    assert.equal(accion.recursoInstanciaId, "m1");
  });

  // Maniobra simple sin tirada, como acción sin dado que gasta la carga; la compleja, la tirada
  // (usuario, 2026-11-14).
  test("maniobra simple: «Volar» sin dado, con la velocidad en la nota", () => {
    const f = resolver(equiparMovilidadAerea(1));
    const [simple] = f.directasMovimiento;
    assert.equal(simple.label, "Volar");
    assert.equal(simple.origen?.label, "Propulsión Aérea");
    assert.match(simple.nota ?? "", /Sin tirada: recorres 50 m/);
    // Una AccionDirecta: sin aplicado, habilidad ni dificultad que tirar.
    assert.equal("aplicado" in simple || "habilidad" in simple || "vuelo" in simple, false);
    // La compleja sigue siendo una tirada aparte, sin casilla de maniobra.
    const [compleja] = f.accionesMovimiento;
    assert.equal(compleja.label, "Volar: maniobra compleja");
    assert.deepEqual(compleja.condiciones?.map((c) => c.id), ["maxima_potencia"]);
  });

  test("maniobra simple: gasta 1 carga, 2 con Máxima Potencia (como la compleja)", () => {
    const [simple] = accionesDirectasDeMovimiento(equiparMovilidadAerea(1));
    assert.deepEqual(simple.gastoRecurso, { instanciaId: "m1", cantidad: 1 });
    assert.equal(gastoDeDirecta(simple, {}), 1);
    assert.equal(gastoDeDirecta(simple, { maxima_potencia: true }), 2);
    const [compleja] = accionesDeMovimiento(equiparMovilidadAerea(1));
    assert.equal(gastoTotal(compleja, null, {}), 1);
    assert.equal(gastoTotal(compleja, null, { maxima_potencia: true }), 2);
  });

  test("maniobra simple: a media velocidad con los umbrales, como la compleja", () => {
    const [simple] = accionesDirectasDeMovimiento(equiparMovilidadAerea(1), { mediaVelocidad: ["Malherido"] });
    assert.match(simple.nota ?? "", /recorres 25 m \(media velocidad: Malherido\)/);
  });

  test("maniobra compleja: Reflejos + Pilotaje entera con Exoarmadura, a la mitad sin ella, con la maniobrabilidad", () => {
    const base = equiparMovilidadAerea(1);
    const total = (s: Sheet) => {
      const f = resolver(s);
      const t = conExtrasDeFicha(f, f.accionesMovimiento[0]);
      return montarTirada(f, t, eleccionSinTocar(t)).total;
    };
    // Atributos a 0: Reflejos 0. Pilotaje 4 − 3 de maniobrabilidad.
    assert.equal(total(conPilotaje(base, ["exoarmadura"])), 1);
    assert.equal(total(conPilotaje(base, ["aereo"])), -1);
  });

  test("esquiva en vuelo: Pilotaje en Exoarmadura y el crítico da una reacción para moverte una casilla", () => {
    const defensa = ACCIONES.find((t) => t.id === "defensa")!;
    const enVuelo = usarHabilidadAlternativa(conEsquivaEnVuelo(equiparMovilidadAerea(1), defensa))!;
    assert.match(enVuelo.efectoCritico ?? "", /reacción para desplazarte una casilla/);
    const f = resolver(conPilotaje(equiparMovilidadAerea(1), ["exoarmadura"]));
    assert.equal(montarTirada(f, enVuelo, eleccionSinTocar(enVuelo)).habilidad?.valor, 4);
    // Sin la casilla, la esquiva de siempre: sin texto de crítico.
    assert.equal(defensa.efectoCritico, undefined);
  });
});

describe("E6: quien volaba con Tecnociencia (S110: sin compensación)", () => {
  test("con Tecnociencia y sin Pilotaje, Volar ya no usa Tecnociencia: Pilotaje sin entrenar", () => {
    const base = equiparMovilidadAerea(1);
    const s: Sheet = { ...base, habilidades: { ...base.habilidades, tecnociencia: { valor: 4, especialidades: ["mecanica"] } } };
    const f = resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA });
    const t = conExtrasDeFicha(f, f.accionesMovimiento[0]);
    const m = montarTirada(f, t, eleccionSinTocar(t));
    assert.deepEqual(m.habilidad, { id: "pilotaje", valor: -1 });
  });
});
