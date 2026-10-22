import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { desequipar, equipar, costeDeRetirar, costeDePieza, rarezaDePieza, type PiezaEquipada } from "./equipo";
import { resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";
import {
  aumentosConRequisitoRoto,
  comprarAumento,
  devolucionAumento,
  etiquetaEleccionAumento,
  planCompraAumento,
  repartoPago,
  saldoBolsaAumentos,
  type CompraAumento,
  type ContextoCompraAumento,
} from "./aumentos";

const MIELINIZACION = "aum_mielinizacion_central"; // 30.000, sin requisitos
const NEUROGENESIS = "aum_neurogenesis_hipocampal"; // 45.000, pide Mielinización
const ENGRAMATICA = "aum_estabilizacion_engramatica"; // 45.000, pide Neurogénesis
const CONSCIENCIA = "aum_consciencia_omnidireccional"; // pide Foveo y Prefrontal
const FOVEO = "aum_optimizacion_foveo_sensorial";
const PREFRONTAL = "aum_prefrontal_aumentada";
const INTROGRESION = "aum_introgresion_sensorial_heterologa"; // 15.000, repetible con sentido
const OJO = "aum_ojo_bionico"; // 16.000 / 32.000 / 64.000 / 128.000
const BRAZO = "aum_brazo_bionico"; // modelos en 3 y 4

let n = 0;
const ctx = (over: Partial<Extract<ContextoCompraAumento, { libre: false }>> = {}): ContextoCompraAumento => ({
  libre: false,
  instanciaId: `i${++n}`,
  bolsaTotal: null,
  creditos: 1_000_000,
  ...over,
});

function compra(sheet: Sheet, c: CompraAumento, contexto = ctx()): Sheet {
  const res = comprarAumento(sheet, c, contexto);
  assert.ok(res.ok, res.ok ? "" : res.error);
  return res.sheet;
}

describe("requisitos de las operaciones", () => {
  test("sin el requisito sale bloqueada y dice qué falta", () => {
    const plan = planCompraAumento(defaultSheet(), { catalogoId: NEUROGENESIS });
    assert.deepEqual(plan, { ok: false, motivo: "Falta: Mielinización Central." });
  });

  test("encadenados: Mielinización → Neurogénesis → Engramática", () => {
    let s = defaultSheet();
    assert.equal(planCompraAumento(s, { catalogoId: ENGRAMATICA }).ok, false);
    s = compra(s, { catalogoId: MIELINIZACION });
    assert.deepEqual(planCompraAumento(s, { catalogoId: ENGRAMATICA }), { ok: false, motivo: "Falta: Neurogénesis Hipocampal." });
    s = compra(s, { catalogoId: NEUROGENESIS });
    assert.deepEqual(planCompraAumento(s, { catalogoId: ENGRAMATICA }), { ok: true, precio: 45_000, subeDe: null });
  });

  test("varios requisitos: hacen falta todos", () => {
    let s = compra(defaultSheet(), { catalogoId: FOVEO });
    assert.deepEqual(planCompraAumento(s, { catalogoId: CONSCIENCIA }), { ok: false, motivo: "Falta: Prefrontal Aumentada." });
    s = compra(compra(s, { catalogoId: MIELINIZACION }), { catalogoId: PREFRONTAL });
    assert.equal(planCompraAumento(s, { catalogoId: CONSCIENCIA }).ok, true);
  });

  test("una operación no repetible no se compra dos veces", () => {
    const s = compra(defaultSheet(), { catalogoId: MIELINIZACION });
    assert.deepEqual(planCompraAumento(s, { catalogoId: MIELINIZACION }), { ok: false, motivo: "Ya tienes Mielinización Central." });
  });

  test("quitar un requisito marca la dependiente como requisito roto (no se borra nada)", () => {
    let s = compra(defaultSheet(), { catalogoId: MIELINIZACION });
    s = compra(s, { catalogoId: NEUROGENESIS });
    const mielina = s.equipo.find((p) => p.catalogoId === MIELINIZACION)!;
    const neuro = s.equipo.find((p) => p.catalogoId === NEUROGENESIS)!;
    assert.deepEqual(aumentosConRequisitoRoto(s), []);
    const sin = desequipar(s, mielina.instanciaId);
    assert.deepEqual(aumentosConRequisitoRoto(sin), [{ instanciaId: neuro.instanciaId, faltan: ["Mielinización Central"] }]);
    assert.ok(sin.equipo.some((p) => p.catalogoId === NEUROGENESIS));
  });
});

describe("Introgresión: elección del sentido y compra repetida", () => {
  test("pide sentido, y uno válido", () => {
    assert.deepEqual(planCompraAumento(defaultSheet(), { catalogoId: INTROGRESION }), { ok: false, motivo: "Elige sentido." });
    assert.equal(planCompraAumento(defaultSheet(), { catalogoId: INTROGRESION, eleccion: "telepatia" }).ok, false);
  });

  test("otro sentido sí; el mismo dos veces, no", () => {
    let s = compra(defaultSheet(), { catalogoId: INTROGRESION, eleccion: "vision_nocturna" });
    assert.deepEqual(planCompraAumento(s, { catalogoId: INTROGRESION, eleccion: "vision_nocturna" }), {
      ok: false,
      motivo: "Ya tienes Introgresión Sensorial Heteróloga con Visión Nocturna.",
    });
    s = compra(s, { catalogoId: INTROGRESION, eleccion: "ecolocalizacion" });
    const piezas = s.equipo.filter((p) => p.catalogoId === INTROGRESION);
    assert.deepEqual(
      piezas.map((p) => p.eleccion),
      ["vision_nocturna", "ecolocalizacion"],
    );
    assert.equal(etiquetaEleccionAumento(piezas[1]), "Ecolocalización y Sónar Orgánico");
  });

  test("una operación sin elección no acepta una", () => {
    assert.equal(planCompraAumento(defaultSheet(), { catalogoId: MIELINIZACION, eleccion: "x" }).ok, false);
  });
});

describe("implantes: cualquier nivel directo y subir paga la diferencia", () => {
  test("se compra cualquier nivel directamente", () => {
    assert.deepEqual(planCompraAumento(defaultSheet(), { catalogoId: OJO, nivel: 3 }), { ok: true, precio: 64_000, subeDe: null });
    assert.equal(planCompraAumento(defaultSheet(), { catalogoId: OJO }).ok, false);
    assert.equal(planCompraAumento(defaultSheet(), { catalogoId: OJO, nivel: 5 }).ok, false);
  });

  test("subir de 1 a 3 cuesta 64.000 − 16.000 y sube la misma instancia", () => {
    const s = compra(defaultSheet(), { catalogoId: OJO, nivel: 1 });
    const inst = s.equipo[0].instanciaId;
    assert.deepEqual(planCompraAumento(s, { catalogoId: OJO, nivel: 3 }), {
      ok: true,
      precio: 48_000,
      subeDe: { instanciaId: inst, nivel: 1 },
    });
    const res = comprarAumento(s, { catalogoId: OJO, nivel: 3 }, ctx({ creditos: 48_000 }));
    assert.ok(res.ok);
    assert.equal(res.pago.deCreditos, 48_000);
    assert.deepEqual(res.sheet.equipo, [{ instanciaId: inst, catalogoId: OJO, nivel: 3, eleccion: undefined }]);
  });

  test("no se puede bajar ni repetir nivel (ni tener dos del mismo implante)", () => {
    const s = compra(defaultSheet(), { catalogoId: OJO, nivel: 2 });
    for (const nivel of [1, 2]) {
      assert.deepEqual(planCompraAumento(s, { catalogoId: OJO, nivel }), {
        ok: false,
        motivo: "Ya tienes Ojo Biónico de nivel 2: solo se puede subir.",
      });
    }
  });

  test("Brazo: modelo obligatorio en 3 y 4, prohibido en 1 y 2", () => {
    const s = defaultSheet();
    assert.deepEqual(planCompraAumento(s, { catalogoId: BRAZO, nivel: 3 }), { ok: false, motivo: "Elige modelo." });
    assert.equal(planCompraAumento(s, { catalogoId: BRAZO, nivel: 3, eleccion: "equilibrado" }).ok, false); // solo en el 4
    assert.equal(planCompraAumento(s, { catalogoId: BRAZO, nivel: 4, eleccion: "equilibrado" }).ok, true);
    assert.equal(planCompraAumento(s, { catalogoId: BRAZO, nivel: 1, eleccion: "fuerte" }).ok, false);
    const con = compra(s, { catalogoId: BRAZO, nivel: 3, eleccion: "fuerte" });
    assert.equal(etiquetaEleccionAumento(con.equipo[0]), "Modelo Fuerte");
    const subido = compra(con, { catalogoId: BRAZO, nivel: 4, eleccion: "agil" });
    assert.equal(subido.equipo[0].nivel, 4);
    assert.equal(subido.equipo[0].eleccion, "agil");
  });
});

describe("pago: primero la bolsa del humano, luego los créditos", () => {
  test("repartoPago", () => {
    assert.deepEqual(repartoPago(30_000, 70_000, 0), { deBolsa: 30_000, deCreditos: 0 });
    assert.deepEqual(repartoPago(45_000, 10_000, 40_000), { deBolsa: 10_000, deCreditos: 35_000 });
    assert.equal(repartoPago(45_000, 10_000, 34_999), null);
    assert.deepEqual(repartoPago(16_000, 0, 20_000), { deBolsa: 0, deCreditos: 16_000 });
  });

  test("saldo = bolsa − gastado, nunca negativo; sin bolsa, 0", () => {
    assert.equal(saldoBolsaAumentos(70_000, 30_000), 40_000);
    assert.equal(saldoBolsaAumentos(70_000, 90_000), 0);
    assert.equal(saldoBolsaAumentos(null, 0), 0);
  });

  test("un humano con 70.000: la compra va a la bolsa y lo que falta a créditos", () => {
    const humano: Sheet = { ...defaultSheet(), especieId: "humano" };
    const r1 = comprarAumento(humano, { catalogoId: MIELINIZACION }, ctx({ bolsaTotal: 70_000, creditos: 5_000 }));
    assert.ok(r1.ok);
    assert.deepEqual(r1.pago, { deBolsa: 30_000, deCreditos: 0 });
    assert.equal(r1.sheet.bolsaAumentosGastada, 30_000);

    const r2 = comprarAumento(r1.sheet, { catalogoId: NEUROGENESIS }, ctx({ bolsaTotal: 70_000, creditos: 5_000 }));
    assert.ok(r2.ok);
    assert.deepEqual(r2.pago, { deBolsa: 40_000, deCreditos: 5_000 });
    assert.equal(r2.sheet.bolsaAumentosGastada, 70_000);
    assert.equal(resolverFicha(r2.sheet, { vitalidad: VITALIDAD_DE_FICHA, estados: [] }).bolsaAumentos?.saldo, 0);

    const r3 = comprarAumento(r2.sheet, { catalogoId: FOVEO }, ctx({ bolsaTotal: 70_000, creditos: 0 }));
    assert.deepEqual(r3, { ok: false, error: "No tienes créditos suficientes" });
  });

  test("aprobada: costeDeRetirar no cuenta los aumentos (el resto del equipo sí)", () => {
    const s = compra(defaultSheet(), { catalogoId: OJO, nivel: 2 });
    assert.equal(costeDeRetirar(s, s.equipo[0].instanciaId), 0);
    assert.equal(costeDePieza(s.equipo[0]), 32_000);
    assert.equal(rarezaDePieza(s.equipo[0]), "Extraño");
  });

  test("en creación se devuelve lo pagado: la bolsa a la bolsa y el resto a créditos", () => {
    const bolsa = ctx({ bolsaTotal: 70_000 });
    // Mielinización 30.000 de bolsa; Neurogénesis 40.000 de bolsa + 5.000 de créditos.
    let s = compra(defaultSheet(), { catalogoId: MIELINIZACION }, bolsa);
    s = compra(s, { catalogoId: NEUROGENESIS }, ctx({ bolsaTotal: 70_000 }));
    assert.equal(s.bolsaAumentosGastada, 70_000);
    assert.equal(s.equipo[1].pagoBolsa, 40_000);
    assert.deepEqual(devolucionAumento(s, s.equipo[1].instanciaId), { deBolsa: 40_000, deCreditos: 5_000 });
    assert.deepEqual(devolucionAumento(s, s.equipo[0].instanciaId), { deBolsa: 30_000, deCreditos: 0 });
  });

  test("subir de nivel acumula lo pagado con la bolsa y devuelve el precio del nivel actual", () => {
    // Ojo 1 (16.000) con bolsa; subir a 3 (48.000): quedan 54.000 de bolsa, todo de bolsa.
    let s = compra(defaultSheet(), { catalogoId: OJO, nivel: 1 }, ctx({ bolsaTotal: 70_000 }));
    s = compra(s, { catalogoId: OJO, nivel: 3 }, ctx({ bolsaTotal: 70_000 }));
    assert.equal(s.equipo[0].pagoBolsa, 64_000);
    assert.deepEqual(devolucionAumento(s, s.equipo[0].instanciaId), { deBolsa: 64_000, deCreditos: 0 });
  });

  test("sin bolsa todo vuelve a créditos; lo que no es aumento da null", () => {
    const s = compra(defaultSheet(), { catalogoId: OJO, nivel: 2 });
    assert.equal(s.equipo[0].pagoBolsa, undefined);
    assert.deepEqual(devolucionAumento(s, s.equipo[0].instanciaId), { deBolsa: 0, deCreditos: 32_000 });
    assert.equal(devolucionAumento(s, "no-existe"), null);
  });

  test("NPC (libre): sin coste, mismas reglas de compra", () => {
    const libre: ContextoCompraAumento = { libre: true, instanciaId: "npc1" };
    assert.equal(comprarAumento(defaultSheet(), { catalogoId: NEUROGENESIS }, libre).ok, false);
    const res = comprarAumento(defaultSheet(), { catalogoId: OJO, nivel: 4 }, libre);
    assert.ok(res.ok);
    assert.equal(res.sheet.bolsaAumentosGastada, 0);
  });
});

describe("equipar() no compra aumentos", () => {
  test("la vía de siempre los rechaza: tienen su propia compra", () => {
    const pieza: PiezaEquipada = { instanciaId: "x", catalogoId: MIELINIZACION };
    const s = defaultSheet();
    assert.equal(equipar(s, pieza), s);
  });
});
