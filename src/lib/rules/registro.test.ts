import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  datosParaGuardar,
  entradaDeshacible,
  leerDatosRegistro,
  planDeshacerEstados,
  planAjusteRecurso,
  planDeshacerRecurso,
  type DatosRegistro,
} from "./registro";
import { aplicarOperacionEstado, maximosConEstados, quitarEstadosDeEscena } from "./vidaPorEstados";
import { defaultSheet, parseSheet, type Sheet } from "./sheet";
import type { EstadoActivo } from "./estados";

const base = defaultSheet();
const SHEET: Sheet = parseSheet({ ...base, atributos: { ...base.atributos, fuerza: 3, aguante: 3, caracter: 3 } });
const ENF2: EstadoActivo = { estadoId: "enfermedad", gradoId: "nivel_2", rondasRestantes: null };
const ENF3: EstadoActivo = { estadoId: "enfermedad", gradoId: "nivel_3", rondasRestantes: 4 };
const reposo = maximosConEstados(SHEET, []);

// Vuelta completa a través de la base: lo que se guarda se lee igual.
function guardadoYLeido(d: DatosRegistro): DatosRegistro {
  const leido = leerDatosRegistro(d.tipo, JSON.parse(JSON.stringify(datosParaGuardar(d))));
  assert.ok(leido);
  return leido;
}

describe("entradaDeshacible", () => {
  test("ya deshecha o datos rotos: no", () => {
    const datos = { cambios: [{ characterId: "a", antes: 0, despues: 5 }] };
    assert.equal(entradaDeshacible({ tipo: "xp", datos, deshechoAt: new Date() }).ok, false);
    assert.equal(entradaDeshacible({ tipo: "xp", datos: { cambios: "x" }, deshechoAt: null }).ok, false);
    assert.equal(entradaDeshacible({ tipo: "fin_escena", datos, deshechoAt: null }).ok, false);
    assert.equal(entradaDeshacible({ tipo: "xp", datos, deshechoAt: null }).ok, true);
  });
});

describe("planAjusteRecurso", () => {
  const pjs = [
    { id: "a", nombre: "Ana", valor: 300 },
    { id: "b", nombre: "Bea", valor: 50 },
  ];

  test("dar o quitar lo mismo a todos", () => {
    assert.deepEqual(planAjusteRecurso("creditos", 100, pjs), {
      ok: true,
      plan: [{ characterId: "a", antes: 300, despues: 400 }, { characterId: "b", antes: 50, despues: 150 }],
    });
    assert.deepEqual(planAjusteRecurso("xp", -50, pjs), {
      ok: true,
      plan: [{ characterId: "a", antes: 300, despues: 250 }, { characterId: "b", antes: 50, despues: 0 }],
    });
  });

  test("si a alguien le dejaría en negativo, no se mueve nada y dice a quién", () => {
    const r = planAjusteRecurso("creditos", -100, pjs);
    assert.equal(r.ok, false);
    assert.match(!r.ok ? r.error : "", /Bea \(50\) no tiene 100 créditos/);
    assert.doesNotMatch(!r.ok ? r.error : "", /Ana/);
    const dos = planAjusteRecurso("xp", -500, pjs);
    assert.match(!dos.ok ? dos.error : "", /Ana \(300\) y Bea \(50\) no tienen 500 XP/);
  });
});

describe("planDeshacerRecurso", () => {
  const cambios = [
    { characterId: "a", antes: 10, despues: 60 },
    { characterId: "b", antes: 0, despues: 50 },
  ];

  test("resta lo que se movió, respetando lo que pasó después", () => {
    const r = planDeshacerRecurso("creditos", cambios, [
      { id: "a", nombre: "Ana", valor: 80 },
      { id: "b", nombre: "Bea", valor: 50 },
    ]);
    assert.deepEqual(r, { ok: true, plan: [{ id: "a", valor: 30 }, { id: "b", valor: 0 }] });
  });

  test("si alguien ya lo gastó, no se deshace para nadie", () => {
    const r = planDeshacerRecurso("creditos", cambios, [
      { id: "a", nombre: "Ana", valor: 80 },
      { id: "b", nombre: "Bea", valor: 20 },
    ]);
    assert.equal(r.ok, false);
    assert.match(!r.ok ? r.error : "", /Bea/);
  });

  test("deshacer un quitar devuelve; un personaje borrado se salta", () => {
    const r = planDeshacerRecurso("xp", [{ characterId: "a", antes: 10, despues: 4 }, { characterId: "z", antes: 0, despues: 3 }], [
      { id: "a", nombre: "Ana", valor: 4 },
    ]);
    assert.deepEqual(r, { ok: true, plan: [{ id: "a", valor: 10 }] });
  });
});

describe("planDeshacerEstados", () => {
  const pj = { id: "pj1", nombre: "Pepa", sheet: SHEET, estados: [] as EstadoActivo[] };
  const foto = { id: "c1", characterId: "pj1", pgActual: reposo.vida, fatigaActual: reposo.fatiga };

  function poner(estado: EstadoActivo, desde = pj) {
    const r = aplicarOperacionEstado(desde, { tipo: "poner", estado }, [foto]);
    assert.ok(r);
    const datos = guardadoYLeido({ tipo: "estado_poner", cambios: [r.cambio] });
    assert.ok(datos.tipo === "estado_poner");
    return { r, datos, despues: { ...desde, sheet: r.vida.sheet, estados: r.estados } };
  }

  test("poner y deshacer: vuelve el estado de antes y la vida restada, en ficha y en foto", () => {
    const { r, datos, despues } = poner(ENF2);
    const fotoTras = { ...foto, pgActual: r.vida.combatientes[0].pgActual, fatigaActual: r.vida.combatientes[0].fatigaActual };
    const plan = planDeshacerEstados(datos, [despues], [fotoTras], []);
    assert.ok(plan.ok);
    assert.deepEqual(plan.plan.personajes[0].estados, []);
    assert.equal(plan.plan.personajes[0].sheet.vidaActual, SHEET.vidaActual);
    assert.equal(plan.plan.personajes[0].sheet.fatigaActual, SHEET.fatigaActual);
    assert.deepEqual(plan.plan.combatientes, [
      { id: "c1", pgActual: reposo.vida, pgMax: reposo.vida, fatigaActual: reposo.fatiga, fatigaMax: reposo.fatiga },
    ]);
  });

  test("deshacer un cambio de grado vuelve al grado de antes", () => {
    const primero = poner(ENF2).despues;
    const { datos, despues } = poner(ENF3, primero);
    const plan = planDeshacerEstados(datos, [despues], [], []);
    assert.ok(plan.ok);
    assert.deepEqual(plan.plan.personajes[0].estados, [ENF2]);
    assert.equal(plan.plan.personajes[0].sheet.vidaActual, primero.sheet.vidaActual);
  });

  test("las rondas pueden haber bajado; si se cayó o cambió de grado, no", () => {
    const { datos, despues } = poner(ENF3);
    const bajadas = { ...despues, estados: [{ ...ENF3, rondasRestantes: 1 }] };
    assert.equal(planDeshacerEstados(datos, [bajadas], [], []).ok, true);
    const caido = planDeshacerEstados(datos, [{ ...despues, estados: [] }], [], []);
    assert.equal(caido.ok, false);
    assert.match(!caido.ok ? caido.error : "", /ya no tiene/);
    assert.equal(planDeshacerEstados(datos, [{ ...despues, estados: [ENF2] }], [], []).ok, false);
  });

  test("una entrada posterior sobre el mismo estado lo bloquea; sobre otro, no", () => {
    const { datos, despues } = poner(ENF2);
    const posterior = { tipo: "estado_poner", datos: datosParaGuardar(datos) };
    assert.equal(planDeshacerEstados(datos, [despues], [], [posterior]).ok, false);
    const otro = { tipo: "estado_poner", datos: { cambios: [{ ...datos.cambios[0], estadoId: "atrapado" }] } };
    assert.equal(planDeshacerEstados(datos, [despues], [], [otro]).ok, true);
  });

  test("deshacer un quitar lo vuelve a poner sin volver a restar vida; si ya está puesto, no", () => {
    const conEnf = { ...pj, estados: [ENF2], sheet: { ...SHEET, vidaActual: 4 } };
    const r = aplicarOperacionEstado(conEnf, { tipo: "quitar", estadoId: "enfermedad" });
    assert.ok(r);
    const datos = guardadoYLeido({ tipo: "estado_quitar", cambios: [r.cambio] });
    assert.ok(datos.tipo === "estado_quitar");
    const plan = planDeshacerEstados(datos, [{ ...conEnf, estados: r.estados }], [], []);
    assert.ok(plan.ok);
    assert.deepEqual(plan.plan.personajes[0].estados, [ENF2]);
    assert.equal(plan.plan.personajes[0].sheet.vidaActual, 4);
    assert.equal(planDeshacerEstados(datos, [conEnf], [], []).ok, false);
  });

  test("la vida devuelta no pasa del máximo (si curó entretanto)", () => {
    const { datos, despues } = poner(ENF2);
    const curado = { ...despues, sheet: { ...despues.sheet, vidaActual: reposo.vida } };
    const plan = planDeshacerEstados(datos, [curado], [], []);
    assert.ok(plan.ok);
    assert.equal(plan.plan.personajes[0].sheet.vidaActual, reposo.vida);
  });
});

describe("fin de escena", () => {
  const MIEDO: EstadoActivo = { estadoId: "miedo", gradoId: "asustado", rondasRestantes: null, finDeEscena: true };
  const ATRAPADO: EstadoActivo = { estadoId: "atrapado", gradoId: "activo", rondasRestantes: 4 };
  const conEscena = { id: "pj1", nombre: "Pepa", sheet: SHEET, estados: [ATRAPADO, { ...ENF2, finDeEscena: true as const }, MIEDO] };

  test("quita solo los de escena, uno por cambio, sin tocar la vida", () => {
    const r = quitarEstadosDeEscena(conEscena);
    assert.ok(r);
    assert.deepEqual(r.estados, [ATRAPADO]);
    assert.equal(r.cambios.length, 2);
    assert.equal(r.sheet.vidaActual, SHEET.vidaActual);
    assert.equal(quitarEstadosDeEscena({ ...conEscena, estados: [ATRAPADO] }), null);
  });

  test("la foto de combate recalcula el máximo con todos quitados", () => {
    const foto = { id: "c1", characterId: "pj1", pgActual: 3, fatigaActual: 2 };
    const r = quitarEstadosDeEscena({ ...conEscena, estados: [{ ...ENF2, finDeEscena: true }] }, [foto]);
    assert.ok(r);
    assert.deepEqual(r.combatientes.map((c) => [c.pgActual, c.pgMax]), [[3, reposo.vida]]);
  });

  test("deshacer devuelve todos los de escena; si uno ha vuelto a ponerse, ninguno", () => {
    const r = quitarEstadosDeEscena(conEscena);
    assert.ok(r);
    const datos = guardadoYLeido({ tipo: "fin_escena", cambios: r.cambios });
    assert.ok(datos.tipo === "fin_escena");
    const tras = { ...conEscena, estados: r.estados };
    const plan = planDeshacerEstados(datos, [tras], [], []);
    assert.ok(plan.ok);
    assert.equal(plan.plan.personajes.length, 1);
    assert.deepEqual(
      new Set(plan.plan.personajes[0].estados.map((e) => e.estadoId)),
      new Set(["atrapado", "enfermedad", "miedo"]),
    );
    assert.equal(plan.plan.personajes[0].estados.find((e) => e.estadoId === "enfermedad")?.gradoId, "nivel_2");
    const repuesto = planDeshacerEstados(datos, [{ ...tras, estados: [...r.estados, MIEDO] }], [], []);
    assert.equal(repuesto.ok, false);
  });

  test("un fin de escena posterior bloquea deshacer el poner de antes", () => {
    const puesto = aplicarOperacionEstado({ ...pjVacio(), estados: [] }, { tipo: "poner", estado: MIEDO });
    assert.ok(puesto);
    const datos = guardadoYLeido({ tipo: "estado_poner", cambios: [puesto.cambio] });
    assert.ok(datos.tipo === "estado_poner");
    const fin = quitarEstadosDeEscena({ ...pjVacio(), estados: puesto.estados });
    assert.ok(fin);
    const posterior = { tipo: "fin_escena", datos: datosParaGuardar({ tipo: "fin_escena", cambios: fin.cambios }) };
    const plan = planDeshacerEstados(datos, [{ ...pjVacio(), estados: puesto.estados }], [], [posterior]);
    assert.equal(plan.ok, false);
  });
});

function pjVacio() {
  return { id: "pj1", nombre: "Pepa", sheet: SHEET, estados: [] as EstadoActivo[] };
}
