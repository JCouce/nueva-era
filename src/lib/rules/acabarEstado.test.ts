// T7c del barrido (fa-03, usuario 2026-11-14): el bajón del Ultra Estimulante y del Xovromium y el
// rechazo del Xovromium. Estados «Bajón del Ultra» (−1), «Bajón del Xovromium» (−2) y «Rechazo del
// Xovromium» (−1) sobre Voluntad, Perspicacia y Expresión; recordatorios «Bajo …» con su botón.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { ACCIONES, type Accion } from "./acciones";
import type { AplicadoId } from "./atributos";
import { conExtrasDeFicha, resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";
import { montarTirada, SIN_ELECCION } from "./montaje";
import { describirEstadosActivos, type EstadoActivo } from "./estados";
import { accionesDeFarmacos, accionesDirectasDeFarmacos } from "./farmacos";
import { estadoPorUso } from "./sigilo";
import { consecuenciaPropia, estadosActivosDe, textoDeConsecuencia } from "./consecuenciasPropias";
import { aplicarFinDeEstado, finDeEstado, textoFinDeEstado } from "./acabarEstado";
import { maximosConEstados } from "./vidaPorEstados";
import { leerDatosRegistro, planAjusteVida, planDeshacerEstados, datosParaGuardar } from "./registro";
import { textoEntradaRegistro } from "./textosRegistro";
import { explicacionDeEstado } from "./explicacionEstado";
import { estadoPorId, estadosDelPanel, loQuitaElJugador } from "../catalog/estados";

const activo = (estadoId: string): EstadoActivo => ({ estadoId, gradoId: "activo", rondasRestantes: null });
const BAJO_ULTRA = activo("bajo_ultra_estimulante");
const BAJO_XOV = activo("bajo_xovromium");
const BAJON_ULTRA = activo("bajon_ultra_estimulante");
const BAJON_XOV = activo("bajon_xovromium");
const RECHAZO = activo("rechazo_xovromium");

// Una tirada cualquiera con ese aplicado (la base, Buscar/percibir, no es salvación).
const BASE = ACCIONES.find((a) => a.aplicado === "perspicacia" && a.grupo !== "Salvaciones")!;
const tiradaCon = (aplicado: AplicadoId): Accion => ({ ...BASE, id: `prueba_${aplicado}`, aplicado });

function montar(estados: EstadoActivo[], aplicado: AplicadoId, t: Accion = tiradaCon(aplicado)) {
  const sheet = defaultSheet();
  const ficha = resolverFicha(sheet, { estados, vitalidad: VITALIDAD_DE_FICHA });
  return { con: montarTirada(ficha, conExtrasDeFicha(ficha, t), SIN_ELECCION), sin: montarTirada(resolverFicha(sheet, { estados: [], vitalidad: VITALIDAD_DE_FICHA }), t, SIN_ELECCION) };
}
const diferencia = (estados: EstadoActivo[], aplicado: AplicadoId, t?: Accion) => {
  const { con, sin } = montar(estados, aplicado, t);
  return con.total - sin.total;
};

const MENTALES: AplicadoId[] = ["voluntad", "perspicacia", "expresion"];
const FISICOS: AplicadoId[] = ["fortaleza", "potencia", "reflejos"];

describe("bajones y rechazo: tiradas con atributos mentales", () => {
  test("Bajón del Ultra: −1 a Voluntad, Perspicacia y Expresión, y nada a Fortaleza, Potencia y Reflejos", () => {
    for (const a of MENTALES) assert.equal(diferencia([BAJON_ULTRA], a), -1, a);
    for (const a of FISICOS) assert.equal(diferencia([BAJON_ULTRA], a), 0, a);
  });

  test("Bajón del Xovromium: −2; Rechazo del Xovromium: −1; solo mentales", () => {
    for (const a of MENTALES) {
      assert.equal(diferencia([BAJON_XOV], a), -2, a);
      assert.equal(diferencia([RECHAZO], a), -1, a);
    }
    for (const a of FISICOS) {
      assert.equal(diferencia([BAJON_XOV], a), 0, a);
      assert.equal(diferencia([RECHAZO], a), 0, a);
    }
  });

  test("también en la salvación de Voluntad", () => {
    const salv = ACCIONES.find((a) => a.id === "salv_voluntad")!;
    assert.equal(diferencia([BAJON_XOV], "voluntad", salv), -2);
  });

  test("se suman entre ellos, cada uno con su línea en el desglose", () => {
    assert.equal(diferencia([BAJON_ULTRA, BAJON_XOV, RECHAZO], "perspicacia"), -4);
    const { con } = montar([BAJON_ULTRA, BAJON_XOV, RECHAZO], "voluntad");
    const lineas = Object.fromEntries(con.desglose.map((l) => [l.etiqueta, l.valor]));
    assert.equal(lineas["Bajón del Ultra"], -1);
    assert.equal(lineas["Bajón del Xovromium"], -2);
    assert.equal(lineas["Rechazo del Xovromium"], -1);
  });

  // Fármacos como estados (2026-11-14): «Bajo Ultra» ya aplica sus bonos (+1 a las físicas); «Bajo
  // Xovromium», solo en los poderes. Ninguno toca las mentales.
  test("los estados «Bajo …» no tocan las mentales; el Ultra da +1 a las físicas", () => {
    // Fuera de Iniciativa (BASE es la iniciativa, donde el Ultra da +2).
    const atletismo = ACCIONES.find((a) => a.id === "atletismo")!;
    const con = (a: AplicadoId): Accion => ({ ...atletismo, id: `prueba_${a}`, aplicado: a });
    for (const a of MENTALES) assert.equal(diferencia([BAJO_ULTRA, BAJO_XOV], a, con(a)), 0, a);
    for (const a of FISICOS) assert.equal(diferencia([BAJO_ULTRA, BAJO_XOV], a, con(a)), 1, a);
    for (const a of FISICOS) assert.equal(diferencia([BAJO_XOV], a, con(a)), 0, a);
  });

  test("los recordatorios los quita el jugador; bajones y rechazo, solo el máster; solo los recordatorios llevan el botón de acabar", () => {
    for (const e of [BAJO_ULTRA, BAJO_XOV]) assert.ok(loQuitaElJugador(e.estadoId), e.estadoId);
    for (const e of [BAJON_ULTRA, BAJON_XOV, RECHAZO]) {
      assert.equal(loQuitaElJugador(e.estadoId), false, e.estadoId);
      assert.equal(describirEstadosActivos([e])[0].quitarJugador, undefined, e.estadoId);
    }
    // Fármacos como estados (2026-11-14): el máster los pone y quita desde su panel.
    assert.ok(estadosDelPanel([BAJON_ULTRA.estadoId]).some((x) => x.estado.id === BAJON_ULTRA.estadoId && !x.soloQuitar));
    const [bajo, bajon] = describirEstadosActivos([BAJO_ULTRA, BAJON_ULTRA]);
    assert.deepEqual(bajo.acabar, { etiqueta: "Se acabó: aplicar el bajón", fatiga: 2 });
    assert.equal(bajo.quitarJugador, "Quitar sin bajón");
    assert.equal(bajon.acabar, undefined);
    assert.deepEqual(explicacionDeEstado(bajon).efecto, ["−1 a las tiradas con Voluntad, Perspicacia o Expresión.", "Dura 1 hora."]);
    assert.match(explicacionDeEstado(describirEstadosActivos([RECHAZO])[0]).efecto.join(" "), /Dura 15 minutos/);
    assert.equal(explicacionDeEstado(bajo).duracion, "hasta quitarlo");
  });
});

const conFarmaco = (id: string, n: number): Sheet => ({ ...defaultSheet(), farmacos: { [id]: n } });

describe("el recordatorio al usar o tomar la dosis", () => {
  test("usar el Ultra Estimulante pone «Bajo Ultra Estimulante» hasta quitarlo", () => {
    const usar = accionesDirectasDeFarmacos(conFarmaco("farmaco_ultra_estimulante", 1), []).find((a) => a.farmacoId === "farmaco_ultra_estimulante")!;
    assert.deepEqual(estadoPorUso(usar, null), BAJO_ULTRA);
  });

  test("el servidor la encuentra aunque ya se haya gastado la última dosis (conAgotados)", () => {
    assert.equal(accionesDirectasDeFarmacos(defaultSheet(), []).length, 0);
    const usar = accionesDirectasDeFarmacos(defaultSheet(), [], true).find((a) => a.id === "farmaco_farmaco_ultra_estimulante")!;
    assert.deepEqual(estadoPorUso(usar, null), BAJO_ULTRA);
    assert.ok(accionesDeFarmacos(defaultSheet(), [], true).some((a) => a.id === "farmaco_farmaco_xovromium"));
  });

  test("el Analgésico y el Antipatógeno ponen su estado (fármacos como estados)", () => {
    for (const [id, estado] of [["farmaco_analgesico", "bajo_analgesico"], ["farmaco_antipatogeno", "antipatogeno"]] as const) {
      const [usar] = accionesDirectasDeFarmacos(conFarmaco(id, 1), []);
      assert.deepEqual(estadoPorUso(usar, null), activo(estado), id);
    }
  });

  const xovromium = () => {
    const sheet = conFarmaco("farmaco_xovromium", 1);
    const ficha = resolverFicha(sheet, { estados: [], vitalidad: VITALIDAD_DE_FICHA });
    return conExtrasDeFicha(ficha, accionesDeFarmacos(sheet, []).find((a) => a.farmacoId === "farmaco_xovromium")!);
  };

  test("superar la tirada del Xovromium (éxito o crítico) pone «Bajo Xovromium», sin fatiga", () => {
    const t = xovromium();
    for (const grado of ["exito", "critico"] as const) {
      const c = consecuenciaPropia(t, { tipo: "grado", grado });
      assert.ok(c, grado);
      assert.equal(c.fatiga, undefined);
      assert.equal(c.danio, undefined);
      assert.deepEqual(estadosActivosDe(c.estados), [BAJO_XOV]);
    }
  });

  test("fallarla (fracaso o fracaso crítico): 1 de fatiga y «Rechazo del Xovromium», sin el recordatorio", () => {
    const t = xovromium();
    for (const grado of ["fracaso", "fracasoCritico"] as const) {
      const c = consecuenciaPropia(t, { tipo: "grado", grado });
      assert.ok(c, grado);
      assert.equal(c.fatiga, 1);
      assert.deepEqual(estadosActivosDe(c.estados), [RECHAZO]);
      assert.equal(textoDeConsecuencia(c), "Pierdes 1 de fatiga. Te pones Rechazo del Xovromium.");
    }
  });

  test("las notas ya no dicen «a mano» del bajón; la sobredosis sí", () => {
    const nota = xovromium().nota!;
    assert.doesNotMatch(nota, /hora siguiente \(a mano\)/);
    assert.match(nota, /Una segunda dosis en 4 horas.*a mano/);
  });
});

describe("consecuencia propia con fatiga", () => {
  test("una consecuencia solo con fatiga cuenta (no se descarta como vacía)", () => {
    const t = { consecuenciasPropias: { fracaso: { texto: "x", fatiga: 2, estados: [] } } };
    assert.ok(consecuenciaPropia(t, { tipo: "grado", grado: "fracaso" }));
    assert.equal(textoDeConsecuencia({ texto: "x", fatiga: 2, estados: [] }), "Pierdes 2 de fatiga.");
  });

  test("se cobra como la pestaña Vida: a la ficha fuera de combate y a la foto en combate, sin bajar de 0", () => {
    // aplicarConsecuencia (servidor) la pasa a ajustarVidaDePersonajes con −fatiga: el objetivo es
    // la ficha o, con un combate en curso, la foto (fotoEnMesa). Esto es su plan.
    const ficha = { objetivo: "ficha" as const, id: "c1", nombre: "Kira", npc: false, actual: 5, tope: 10 };
    const foto = { objetivo: "combatiente" as const, id: "f1", nombre: "Kira", npc: false, actual: 0, tope: 10 };
    assert.deepEqual(planAjusteVida([ficha], -1), [{ objetivo: "ficha", id: "c1", nombre: "Kira", npc: false, antes: 5, despues: 4 }]);
    assert.deepEqual(planAjusteVida([{ ...foto, actual: 3 }], -1), [{ objetivo: "combatiente", id: "f1", nombre: "Kira", npc: false, antes: 3, despues: 2 }]);
    assert.deepEqual(planAjusteVida([foto], -1), []);
  });
});

describe("«Se acabó: aplicar el bajón» (acabarEstado)", () => {
  const base = defaultSheet();
  const max = maximosConEstados(base, []).fatiga;
  const sheet: Sheet = { ...base, fatigaActual: max };
  const personaje = (estados: EstadoActivo[], s: Sheet = sheet) => ({ id: "c1", sheet: s, estados });

  test("finDeEstado lee el catálogo: 2 de fatiga y el bajón que toca", () => {
    const u = finDeEstado([BAJO_ULTRA], "bajo_ultra_estimulante");
    assert.deepEqual(u, { ok: true, estadoId: "bajo_ultra_estimulante", fuente: "Bajo Ultra Estimulante", fatiga: 2, pone: [BAJON_ULTRA] });
    const x = finDeEstado([BAJO_XOV], "bajo_xovromium");
    assert.ok(x.ok);
    assert.deepEqual(x.pone, [BAJON_XOV]);
    assert.deepEqual(finDeEstado([], "bajo_xovromium"), { ok: false, error: "Ya no llevas Bajo Xovromium." });
    assert.equal(finDeEstado([BAJON_ULTRA], "bajon_ultra_estimulante").ok, false);
    assert.equal(estadoPorId("bajon_xovromium")?.alAcabar, undefined);
  });

  test("fuera de combate: quita el recordatorio, −2 de fatiga en la ficha y pone el bajón; el resto, igual", () => {
    const otro: EstadoActivo = { estadoId: "aturdido", gradoId: "exito", rondasRestantes: 1 };
    const fin = finDeEstado([otro, BAJO_ULTRA], "bajo_ultra_estimulante");
    assert.ok(fin.ok);
    const r = aplicarFinDeEstado(personaje([otro, BAJO_ULTRA]), fin)!;
    assert.deepEqual(r.estados, [otro, BAJON_ULTRA]);
    assert.equal(r.sheet.fatigaActual, max - 2);
    assert.equal(r.cobrado, 2);
    assert.equal(r.fatigaDespues, max - 2);
    assert.deepEqual(
      r.cambios.map((c) => [c.estadoId, c.antes, c.despues, c.restado]),
      [
        ["bajo_ultra_estimulante", BAJO_ULTRA, null, { vida: 0, fatiga: 0 }],
        ["bajon_ultra_estimulante", null, BAJON_ULTRA, { vida: 0, fatiga: 2 }],
      ],
    );
    assert.equal(textoFinDeEstado(fin, r), "Bajo Ultra Estimulante: se acabó. Pierdes 2 de fatiga y te pones Bajón del Ultra.");
  });

  test("una sola entrada del registro: se lee, se describe y Deshacer lo devuelve todo", () => {
    const fin = finDeEstado([BAJO_ULTRA], "bajo_ultra_estimulante");
    assert.ok(fin.ok);
    const r = aplicarFinDeEstado(personaje([BAJO_ULTRA]), fin)!;
    const leidos = leerDatosRegistro("estado_poner", JSON.parse(JSON.stringify(datosParaGuardar({ tipo: "estado_poner", cambios: r.cambios }))));
    assert.ok(leidos && leidos.tipo === "estado_poner");
    assert.equal(
      textoEntradaRegistro("estado_poner", leidos, [{ id: "c1", nombre: "Kira Vasq" }]),
      "Quitado Bajo Ultra Estimulante a Kira; Bajón del Ultra a Kira · hasta quitarlo",
    );
    const plan = planDeshacerEstados(leidos, [{ id: "c1", nombre: "Kira", sheet: r.sheet, estados: r.estados }], [], []);
    assert.ok(plan.ok);
    assert.deepEqual(plan.plan.personajes[0].estados, [BAJO_ULTRA]);
    assert.equal(plan.plan.personajes[0].sheet.fatigaActual, max);
  });

  test("con menos fatiga que el coste: se pierde la que quede (sin bloquear) y lo dice", () => {
    const fin = finDeEstado([BAJO_XOV], "bajo_xovromium");
    assert.ok(fin.ok);
    const r = aplicarFinDeEstado(personaje([BAJO_XOV], { ...sheet, fatigaActual: 1 }), fin)!;
    assert.equal(r.sheet.fatigaActual, 0);
    assert.equal(r.cobrado, 1);
    assert.deepEqual(r.estados, [BAJON_XOV]);
    assert.equal(r.cambios[1].restado.fatiga, 1);
    assert.equal(
      textoFinDeEstado(fin, r),
      "Bajo Xovromium: se acabó. Pierdes 1 de fatiga y te pones Bajón del Xovromium. No te quedaba fatiga para pagar 1 más. Te has quedado sin fatiga: quedas inconsciente.",
    );
    const cero = aplicarFinDeEstado(personaje([BAJO_XOV], { ...sheet, fatigaActual: 0 }), fin)!;
    assert.equal(cero.cobrado, 0);
    assert.deepEqual(cero.estados, [BAJON_XOV]);
  });

  test("en combate: la fatiga sale de la foto de la Mesa, no de la ficha; Deshacer se la devuelve", () => {
    const fin = finDeEstado([BAJO_ULTRA], "bajo_ultra_estimulante");
    assert.ok(fin.ok);
    const fotos = [
      { id: "f1", pgActual: 10, fatigaActual: 6 },
      { id: "f0", pgActual: 10, fatigaActual: 9 },
    ];
    const r = aplicarFinDeEstado(personaje([BAJO_ULTRA]), fin, fotos, "f1")!;
    assert.equal(r.sheet.fatigaActual, max);
    assert.deepEqual(
      r.combatientes.map((c) => [c.id, c.fatigaActual]),
      [
        ["f1", 4],
        ["f0", 9],
      ],
    );
    assert.equal(r.fatigaDespues, 4);
    assert.deepEqual(r.cambios[1].restado, { vida: 0, fatiga: 0 });
    assert.deepEqual(r.cambios[1].combatientes.find((c) => c.id === "f1")?.restado, { vida: 0, fatiga: 2 });
    const plan = planDeshacerEstados(
      { tipo: "estado_poner", cambios: r.cambios },
      [{ id: "c1", nombre: "Kira", sheet: r.sheet, estados: r.estados }],
      r.combatientes.map((c) => ({ id: c.id, characterId: "c1", pgActual: c.pgActual, fatigaActual: c.fatigaActual })),
      [],
    );
    assert.ok(plan.ok);
    assert.deepEqual(plan.plan.combatientes.map((c) => [c.id, c.fatigaActual]), [
      ["f1", 6],
      ["f0", 9],
    ]);
  });

  test("sin el recordatorio puesto, no hace nada", () => {
    const fin = finDeEstado([BAJO_ULTRA], "bajo_ultra_estimulante");
    assert.ok(fin.ok);
    assert.equal(aplicarFinDeEstado(personaje([]), fin), null);
  });
});
