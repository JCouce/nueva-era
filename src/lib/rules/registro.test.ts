import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  datosParaGuardar,
  entradaDeshacible,
  leerDatosRegistro,
  planDeshacerEstados,
  planAjusteRecurso,
  planDeshacerRecurso,
  planAjusteVida,
  planDeshacerVida,
  idsDeRegistro,
  type DatosRegistro,
} from "./registro";
import { aplicarOperacionEstado, maximosConEstados, quitarEstadosDe } from "./vidaPorEstados";
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

describe("limpiar estados", () => {
  const MIEDO: EstadoActivo = { estadoId: "miedo", gradoId: "asustado", rondasRestantes: null, finDeEscena: true };
  const ATRAPADO: EstadoActivo = { estadoId: "atrapado", gradoId: "activo", rondasRestantes: 4 };
  const conEscena = { id: "pj1", nombre: "Pepa", sheet: SHEET, estados: [ATRAPADO, { ...ENF2, finDeEscena: true as const }, MIEDO] };

  test("quita todos, uno por cambio, sin tocar la vida", () => {
    const r = quitarEstadosDe(conEscena);
    assert.ok(r);
    assert.deepEqual(r.estados, []);
    assert.equal(r.cambios.length, 3);
    assert.equal(r.sheet.vidaActual, SHEET.vidaActual);
    assert.equal(quitarEstadosDe({ ...conEscena, estados: [] }), null);
  });

  test("con filtro, solo los que lo pasan", () => {
    const r = quitarEstadosDe(conEscena, [], (e) => e.finDeEscena === true);
    assert.ok(r);
    assert.deepEqual(r.estados, [ATRAPADO]);
    assert.equal(quitarEstadosDe({ ...conEscena, estados: [ATRAPADO] }, [], (e) => e.finDeEscena === true), null);
  });

  test("la foto de combate recalcula el máximo con todos quitados", () => {
    const foto = { id: "c1", characterId: "pj1", pgActual: 3, fatigaActual: 2 };
    const r = quitarEstadosDe({ ...conEscena, estados: [{ ...ENF2, finDeEscena: true }] }, [foto]);
    assert.ok(r);
    assert.deepEqual(r.combatientes.map((c) => [c.pgActual, c.pgMax]), [[3, reposo.vida]]);
  });

  test("deshacer devuelve todos; si uno ha vuelto a ponerse, ninguno", () => {
    const r = quitarEstadosDe(conEscena);
    assert.ok(r);
    const datos = guardadoYLeido({ tipo: "limpiar_estados", cambios: r.cambios });
    assert.ok(datos.tipo === "limpiar_estados");
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

  test("un limpiar estados posterior bloquea deshacer el poner de antes", () => {
    const puesto = aplicarOperacionEstado({ ...pjVacio(), estados: [] }, { tipo: "poner", estado: MIEDO });
    assert.ok(puesto);
    const datos = guardadoYLeido({ tipo: "estado_poner", cambios: [puesto.cambio] });
    assert.ok(datos.tipo === "estado_poner");
    const fin = quitarEstadosDe({ ...pjVacio(), estados: puesto.estados });
    assert.ok(fin);
    const posterior = { tipo: "limpiar_estados", datos: datosParaGuardar({ tipo: "limpiar_estados", cambios: fin.cambios }) };
    const plan = planDeshacerEstados(datos, [{ ...pjVacio(), estados: puesto.estados }], [], [posterior]);
    assert.equal(plan.ok, false);
  });
});

function cambio(o: { objetivo: "ficha" | "combatiente"; id: string; nombre: string; npc: boolean; actual: number }, despues: number) {
  return { objetivo: o.objetivo, id: o.id, nombre: o.nombre, npc: o.npc, antes: o.actual, despues };
}

function pjVacio() {
  return { id: "pj1", nombre: "Pepa", sheet: SHEET, estados: [] as EstadoActivo[] };
}

describe("vida (pestaña Vida del máster)", () => {
  const javi = { objetivo: "ficha" as const, id: "c1", nombre: "Javi Pérez", npc: false, actual: 6, tope: 8 };
  const guardia = { objetivo: "combatiente" as const, id: "k1", nombre: "Guardia corporativo", npc: true, actual: 2, tope: 12 };

  test("planAjusteVida: suelo 0, tope, y quien no cambia no sale", () => {
    assert.deepEqual(planAjusteVida([javi, guardia], -3), [
      { objetivo: "ficha", id: "c1", nombre: "Javi Pérez", npc: false, antes: 6, despues: 3 },
      { objetivo: "combatiente", id: "k1", nombre: "Guardia corporativo", npc: true, antes: 2, despues: 0 },
    ]);
    assert.deepEqual(planAjusteVida([{ ...javi, actual: 8 }], 2), []);
  });

  test("se guarda y se lee igual, con sus ids por columna", () => {
    const d: DatosRegistro = { tipo: "vida", recurso: "vida", delta: -3, cambios: planAjusteVida([javi, guardia], -3) };
    assert.deepEqual(guardadoYLeido(d), d);
    assert.deepEqual(idsDeRegistro(d), { characterIds: ["c1"], combatienteIds: ["k1"] });
  });

  test("deshacer vuelve al antes, recortado al tope de hoy", () => {
    const d = { tipo: "vida" as const, recurso: "vida" as const, delta: -3, cambios: planAjusteVida([javi, guardia], -3) };
    const r = planDeshacerVida(d, [
      { ...javi, actual: 3, tope: 5 },
      { ...guardia, actual: 0 },
    ]);
    assert.deepEqual(r, {
      ok: true,
      plan: [
        { objetivo: "ficha", id: "c1", valor: 5 },
        { objetivo: "combatiente", id: "k1", valor: 2 },
      ],
    });
  });

  test("no se puede si alguien lo cambió después; no toca a nadie", () => {
    const d = { tipo: "vida" as const, recurso: "fatiga" as const, delta: -3, cambios: planAjusteVida([javi, guardia], -3) };
    const r = planDeshacerVida(d, [
      { ...javi, actual: 3 },
      { ...guardia, actual: 1 },
    ]);
    assert.equal(r.ok, false);
    assert.match(!r.ok ? r.error : "", /Guardia corporativo ya no tiene 0 de fatiga \(ahora 1\)/);
  });

  test("un objetivo que ya no existe se salta", () => {
    const d = { tipo: "vida" as const, recurso: "vida" as const, delta: 2, cambios: planAjusteVida([{ ...javi, actual: 4 }, guardia], 2) };
    assert.deepEqual(planDeshacerVida(d, [{ ...javi, actual: 6 }]), { ok: true, plan: [{ objetivo: "ficha", id: "c1", valor: 4 }] });
  });

  describe("con categoría (desglose de la vida)", () => {
    const D = (noLetal: number, letal: number, grave: number) => ({ noLetal, letal, grave });
    const kira = { ...javi, actual: 6, tope: 10, danio: D(1, 3, 0) };
    const npc = { ...guardia, actual: 12, tope: 12, danio: D(0, 0, 0) };

    test("el daño entra en la categoría y guarda el desglose de antes y después", () => {
      assert.deepEqual(planAjusteVida([kira, npc], -2, "grave"), [
        { ...cambio(kira, 4), danioAntes: D(1, 3, 0), danioDespues: D(1, 3, 2) },
        { ...cambio(npc, 10), danioAntes: D(0, 0, 0), danioDespues: D(0, 0, 2) },
      ]);
    });

    test("curar una categoría solo quita de ella; quien no tiene de esa no sale", () => {
      assert.deepEqual(planAjusteVida([kira, npc], 5, "noLetal"), [
        { ...cambio(kira, 7), danioAntes: D(1, 3, 0), danioDespues: D(0, 3, 0) },
      ]);
    });

    test("sin categoría, el de siempre, con el desglose normalizado", () => {
      assert.deepEqual(planAjusteVida([kira], 2), [{ ...cambio(kira, 8), danioAntes: D(1, 3, 0), danioDespues: D(0, 2, 0) }]);
    });

    test("se guarda y se lee igual, con la categoría", () => {
      const d: DatosRegistro = { tipo: "vida", recurso: "vida", delta: -2, categoria: "grave", cambios: planAjusteVida([kira, npc], -2, "grave") };
      assert.deepEqual(guardadoYLeido(d), d);
    });

    test("deshacer devuelve exactamente el desglose de antes", () => {
      const d: DatosRegistro = { tipo: "vida", recurso: "vida", delta: -2, categoria: "grave", cambios: planAjusteVida([kira, npc], -2, "grave") };
      const r = planDeshacerVida(d, [
        { ...kira, actual: 4, danio: D(1, 3, 2) },
        { ...npc, actual: 10, danio: D(0, 0, 2) },
      ]);
      assert.deepEqual(r, {
        ok: true,
        plan: [
          { objetivo: "ficha", id: "c1", valor: 6, danio: D(1, 3, 0) },
          { objetivo: "combatiente", id: "k1", valor: 12, danio: D(0, 0, 0) },
        ],
      });
    });

    test("no se puede si cambió el tipo de daño aunque la vida sea la misma", () => {
      const d: DatosRegistro = { tipo: "vida", recurso: "vida", delta: -2, categoria: "grave", cambios: planAjusteVida([kira], -2, "grave") };
      const r = planDeshacerVida(d, [{ ...kira, actual: 4, danio: D(2, 2, 2) }]);
      assert.equal(r.ok, false);
      assert.match(!r.ok ? r.error : "", /tipo de daño/);
    });

    test("una entrada vieja sin desglose vuelve al número y normaliza el de ahora", () => {
      const viejo: DatosRegistro = { tipo: "vida", recurso: "vida", delta: -2, cambios: [cambio(kira, 4)] };
      const leido = leerDatosRegistro("vida", JSON.parse(JSON.stringify(datosParaGuardar(viejo))));
      assert.ok(leido && leido.tipo === "vida");
      assert.deepEqual(planDeshacerVida(leido, [{ ...kira, actual: 4, danio: D(1, 3, 2) }]), {
        ok: true,
        plan: [{ objetivo: "ficha", id: "c1", valor: 6, danio: D(0, 2, 2) }],
      });
    });
  });

  test("una entrada de vida no bloquea deshacer un estado del mismo personaje", () => {
    const poner = aplicarOperacionEstado({ id: "c1", sheet: SHEET, estados: [] }, { tipo: "poner", estado: ENF2 });
    assert.ok(poner);
    const vida: DatosRegistro = { tipo: "vida", recurso: "vida", delta: -1, cambios: planAjusteVida([javi], -1) };
    const r = planDeshacerEstados(
      { tipo: "estado_poner", cambios: [poner.cambio] },
      [{ id: "c1", nombre: "Javi", sheet: poner.vida.sheet, estados: poner.estados }],
      [],
      [{ tipo: "vida", datos: JSON.parse(JSON.stringify(datosParaGuardar(vida))) }],
    );
    assert.equal(r.ok, true);
  });
});
