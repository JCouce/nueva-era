import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, parseSheet, type Sheet } from "./sheet";
import { inmunidadesDe, operacionConInmunidad, textoInmuneAlAplicar } from "./inmunidades";
import { describirEstadosActivos, estadosConEfecto, modificadoresDeEstados, type EstadoActivo } from "./estados";
import { estadosDeNpcTras, leerEstados } from "./estadosFicha";
import { aplicarOperacionEstado, maximosConEstados, vidaTrasCambioDeEstados, type OperacionEstado } from "./vidaPorEstados";
import { leerDatosRegistro, planDeshacerEstados } from "./registro";
import { textoEntradaRegistro } from "./textosRegistro";
import { resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";
import { casillasDeAumentos, ID_SELECTOR_CONTRA } from "./aumentosTiradas";

let n = 0;
function con(sheet: Sheet, catalogoId: string, nivel?: number): Sheet {
  return { ...sheet, equipo: [...sheet.equipo, { instanciaId: `i${++n}`, catalogoId, ...(nivel !== undefined && { nivel }) }] };
}

const OJO = "aum_ojo_bionico";
const REGENERACION = "aum_regeneracion_tisular_acelerada";
const base = parseSheet({ ...defaultSheet(), atributos: { ...defaultSheet().atributos, fuerza: 3, aguante: 3, caracter: 3 } });
const conRegeneracion = (s: Sheet) =>
  con(con(con(con(s, "aum_matriz_osea_adaptativa"), "aum_biogenesis_mitocondrial"), "aum_angiogenesis_sistemica"), REGENERACION);

const CEGUERA: EstadoActivo = { estadoId: "ceguera", gradoId: "fracaso", rondasRestantes: 1 };
const HEMORRAGIA: EstadoActivo = { estadoId: "hemorragia", gradoId: "activo", rondasRestantes: null };
const ENF2: EstadoActivo = { estadoId: "enfermedad", gradoId: "nivel_2", rondasRestantes: null };
const poner = (estado: EstadoActivo): OperacionEstado => ({ tipo: "poner", estado });

describe("inmunidadesDe (A7)", () => {
  test("Ojo Biónico 1: nada; 2, 3 y 4: ceguera, con el nivel en la fuente", () => {
    assert.deepEqual(inmunidadesDe(con(base, OJO, 1)), []);
    assert.deepEqual(inmunidadesDe(con(base, OJO, 2)), [{ estadoId: "ceguera", fuente: "Ojo Biónico 2" }]);
    assert.deepEqual(inmunidadesDe(con(base, OJO, 3)), [{ estadoId: "ceguera", fuente: "Ojo Biónico 3" }]);
    assert.deepEqual(inmunidadesDe(con(base, OJO, 4)), [{ estadoId: "ceguera", fuente: "Ojo Biónico 4" }]);
  });

  test("Regeneración funcionando: hemorragia; con el requisito roto, nada", () => {
    assert.deepEqual(inmunidadesDe(conRegeneracion(base)), [{ estadoId: "hemorragia", fuente: "Regeneración Tisular Acelerada" }]);
    assert.deepEqual(inmunidadesDe(con(base, REGENERACION)), []);
  });

  test("sin aumentos, ninguna", () => {
    assert.deepEqual(inmunidadesDe(base), []);
  });
});

describe("poner un estado a un inmune", () => {
  const ojo2 = con(base, OJO, 2);

  test("a varios: el inmune se salta y el otro lo recibe", () => {
    const personajes = [
      { id: "javi", sheet: ojo2, estados: [] as EstadoActivo[] },
      { id: "kira", sheet: base, estados: [] as EstadoActivo[] },
    ];
    const res = personajes.map((p) => {
      const tras = operacionConInmunidad(p.sheet, poner(CEGUERA), false);
      return tras.tipo === "inmune" ? { id: p.id, inmune: tras.inmunidad } : { id: p.id, r: aplicarOperacionEstado(p, tras.op) };
    });
    assert.deepEqual(res[0], { id: "javi", inmune: { estadoId: "ceguera", fuente: "Ojo Biónico 2" } });
    assert.deepEqual("r" in res[1] && res[1].r?.estados, [CEGUERA]);
    assert.equal(
      textoInmuneAlAplicar({ id: "javi", nombre: "Javi", estadoId: "ceguera", fuente: "Ojo Biónico 2" }),
      "Javi es inmune a Ceguera (Ojo Biónico 2)",
    );
  });

  test("forzado: se pone marcado solo a quien es inmune; quitar no mira la inmunidad", () => {
    assert.deepEqual(operacionConInmunidad(ojo2, poner(CEGUERA), true), { tipo: "aplicar", op: poner({ ...CEGUERA, forzado: true }) });
    assert.deepEqual(operacionConInmunidad(base, poner(CEGUERA), true), { tipo: "aplicar", op: poner(CEGUERA) });
    const quitar: OperacionEstado = { tipo: "quitar", estadoId: "ceguera" };
    assert.deepEqual(operacionConInmunidad(ojo2, quitar, false), { tipo: "aplicar", op: quitar });
    // Un forzado que llega a alguien no inmune se guarda limpio.
    assert.deepEqual(operacionConInmunidad(base, poner({ ...CEGUERA, forzado: true }), false), { tipo: "aplicar", op: poner(CEGUERA) });
  });

  test("NPC: la misma inmunidad con la ficha de su fila; sin ficha, no es inmune", () => {
    const tras = operacionConInmunidad(conRegeneracion(base), poner(HEMORRAGIA), false);
    assert.equal(tras.tipo, "inmune");
    const forzado = operacionConInmunidad(conRegeneracion(base), poner(HEMORRAGIA), true);
    assert.ok(forzado.tipo === "aplicar");
    assert.deepEqual(estadosDeNpcTras([], forzado.op), [{ ...HEMORRAGIA, forzado: true }]);
    assert.equal(operacionConInmunidad(null, poner(HEMORRAGIA), false).tipo, "aplicar");
  });
});

describe("estado con inmunidad: sin efecto salvo forzado", () => {
  // El mecanismo, con un estado que sí tiene números (Enfermedad baja atributos y la vida máxima).
  const inmuneEnf = [{ estadoId: "enfermedad", fuente: "Prueba" }];

  test("estadosConEfecto quita el anulado y deja el forzado", () => {
    assert.deepEqual(estadosConEfecto([ENF2, CEGUERA], inmuneEnf), [CEGUERA]);
    assert.deepEqual(estadosConEfecto([{ ...ENF2, forzado: true }], inmuneEnf), [{ ...ENF2, forzado: true }]);
    assert.equal(modificadoresDeEstados(estadosConEfecto([ENF2], inmuneEnf)).length, 0);
    assert.ok(modificadoresDeEstados(estadosConEfecto([{ ...ENF2, forzado: true }], inmuneEnf)).length > 0);
  });

  test("el chip lo dice: inmune con la fuente; forzado, no", () => {
    const [d] = describirEstadosActivos([CEGUERA], [{ estadoId: "ceguera", fuente: "Ojo Biónico 2" }]);
    assert.equal(d.inmune, "Ojo Biónico 2");
    const [f] = describirEstadosActivos([{ ...CEGUERA, forzado: true }], [{ estadoId: "ceguera", fuente: "Ojo Biónico 2" }]);
    assert.equal(f.inmune, undefined);
    assert.equal(f.forzado, true);
  });

  test("ganar la inmunidad con la ceguera puesta no toca la vida; quitarla luego tampoco", () => {
    const ojo2 = con(base, OJO, 2);
    assert.deepEqual(maximosConEstados(ojo2, [CEGUERA]), maximosConEstados(ojo2, []));
    const r = vidaTrasCambioDeEstados(ojo2, [CEGUERA], []);
    assert.deepEqual(r.restado, { vida: 0, fatiga: 0 });
    assert.equal(r.sheet, ojo2);
    const f = resolverFicha(ojo2, { estados: [CEGUERA], vitalidad: VITALIDAD_DE_FICHA });
    assert.deepEqual(f.inmunidades, [{ estadoId: "ceguera", fuente: "Ojo Biónico 2" }]);
    assert.deepEqual(f.estados, [CEGUERA]);
  });

  test("leerEstados conserva el forzado (y solo si es true)", () => {
    assert.deepEqual(leerEstados([{ ...CEGUERA, forzado: true }]), [{ ...CEGUERA, forzado: true }]);
    assert.deepEqual(leerEstados([{ ...CEGUERA, forzado: "si" }]), [CEGUERA]);
  });
});

describe("registro y deshacer con un forzado", () => {
  const ojo2 = con(base, OJO, 2);
  const forzado: EstadoActivo = { ...CEGUERA, forzado: true };

  test("se registra como un poner, el texto lo marca y deshacer lo quita", () => {
    const r = aplicarOperacionEstado({ id: "javi", sheet: ojo2, estados: [] }, poner(forzado))!;
    assert.deepEqual(r.estados, [forzado]);
    const datos = leerDatosRegistro("estado_poner", JSON.parse(JSON.stringify({ cambios: [r.cambio] })));
    assert.ok(datos && datos.tipo === "estado_poner");
    assert.deepEqual(datos.cambios[0].despues, forzado);
    assert.match(textoEntradaRegistro("estado_poner", datos, [{ id: "javi", nombre: "Javi" }]), /^Ceguera \(Fracaso\) forzado \(inmune\) a Javi/);
    const plan = planDeshacerEstados(datos, [{ id: "javi", nombre: "Javi", sheet: ojo2, estados: r.estados }], [], []);
    assert.ok(plan.ok);
    assert.deepEqual(plan.plan.personajes[0].estados, []);
  });
});

describe("selector \"Contra…\" con inmunidad a la ceguera", () => {
  const selector = (s: Sheet) => casillasDeAumentos(s).find((c) => c.id === `${ID_SELECTOR_CONTRA}_salv_fortaleza`);

  test("Ojo 2: ceguera y ceguera por detonación dicen que eres inmune", () => {
    const sel = selector(con(base, OJO, 2));
    assert.ok(sel && sel.tipo === "opcion");
    const ceguera = sel.opciones.find((o) => o.id === "ceguera")!;
    const detonacion = sel.opciones.find((o) => o.id === "ceguera_detonacion")!;
    assert.match(ceguera.nota!, /^Inmune \(Ojo Biónico 2\): no hace falta tirar/);
    assert.match(detonacion.nota!, /^Inmune \(Ojo Biónico 2\)/);
    assert.equal(ceguera.valor, 2);
  });

  test("Ojo 1: sin aviso ni opción de detonación", () => {
    const sel = selector(con(base, OJO, 1));
    assert.ok(sel && sel.tipo === "opcion");
    assert.doesNotMatch(sel.opciones.find((o) => o.id === "ceguera")!.nota ?? "", /Inmune/);
    assert.equal(sel.opciones.find((o) => o.id === "ceguera_detonacion"), undefined);
  });
});
