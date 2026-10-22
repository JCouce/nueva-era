import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { desequipar, equipar, costeDeRetirar, costeDePieza, rarezaDePieza, type PiezaEquipada } from "./equipo";
import { resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";
import { modificadoresDeEquipo } from "./equipo";
import { puntosAtributosGastados, puntosHabilidadesGastados } from "./creacion";
import { cumpleRequisitoDote, valoresRequisitoDeFicha } from "./dotes";
import { AJUSTE_NEUTRO, costeSiguienteNivel, costeSubidaXp } from "./progresion";
import { retirarPieza } from "./vitalidad";
import type { EstadoActivo } from "./estados";
import type { RequisitoDote } from "../catalog/dotesTipos";
import {
  ajusteCosteDeSubida,
  modificadoresDeAumentos,
  ajusteCosteConAumentos,
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

  test("con el requisito roto la operación no da efectos, en cadena (como una dote, S34)", () => {
    let s = compra(defaultSheet(), { catalogoId: MIELINIZACION });
    s = compra(s, { catalogoId: NEUROGENESIS });
    s = compra(s, { catalogoId: ENGRAMATICA });
    const intel = (sh: Sheet) => modificadoresDeAumentos(sh).filter((m) => m.tipo === "atributo" && m.id === "inteligencia").length;
    assert.equal(intel(s), 3);
    const sin = desequipar(s, s.equipo.find((p) => p.catalogoId === MIELINIZACION)!.instanciaId);
    // Neurogénesis pierde su requisito y Engramática, por ella, también se apaga.
    assert.equal(intel(sin), 0);
    assert.deepEqual(
      aumentosConRequisitoRoto(sin).map((r) => r.faltan),
      [["Mielinización Central"], ["Neurogénesis Hipocampal"]],
    );
    assert.deepEqual(ajusteCosteConAumentos(AJUSTE_NEUTRO, sin), AJUSTE_NEUTRO);
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

// ── A1: atributos, requisitos, coste de habilidad y vida ─────────────────────

const HIPERTROFIA = "aum_hipertrofia_miofibrilar"; // +1 Fuerza, vida con Fortaleza × 1,5; pide Matriz Ósea y Osteotendinosa
const SINCRONIZACION = "aum_sincronizacion_neuromotora_profunda"; // +1 Fuerza y Agilidad, pide Osteotendinosa
const OSTEOTENDINOSA = "aum_integridad_osteotendinosa"; // +1 Fuerza y Agilidad, sin requisitos
const MATRIZ_OSEA = "aum_matriz_osea_adaptativa"; // +1 Fuerza y Aguante, sin requisitos

const resuelta = (s: Sheet, aprobada = false, estados: EstadoActivo[] = []) =>
  resolverFicha(s, { estados, vitalidad: VITALIDAD_DE_FICHA, aprobada });
const conAtributos = (s: Sheet, atr: Partial<Sheet["atributos"]>): Sheet => ({ ...s, atributos: { ...s.atributos, ...atr } });
const comprarVarias = (s: Sheet, ids: string[]) => ids.reduce((acc, id) => compra(acc, { catalogoId: id }), s);

describe("A1: +1 a atributos desde los aumentos", () => {
  test("modificadoresDeAumentos: origen aumento y la pieza como fuente", () => {
    const s = compra(defaultSheet(), { catalogoId: OSTEOTENDINOSA });
    assert.deepEqual(modificadoresDeAumentos(s), [
      { tipo: "atributo", id: "fuerza", valor: 1, origen: "aumento", fuente: "Integridad Osteotendinosa" },
      { tipo: "atributo", id: "agilidad", valor: 1, origen: "aumento", fuente: "Integridad Osteotendinosa" },
    ]);
  });

  test("sin techo: el efectivo pasa de 6 y el point-buy solo mira lo comprado", () => {
    const base = conAtributos(defaultSheet(), { fuerza: 4 });
    const gastadosAntes = puntosAtributosGastados(base);
    const s = comprarVarias(base, [OSTEOTENDINOSA, MATRIZ_OSEA, SINCRONIZACION]);
    assert.equal(puntosAtributosGastados(s), gastadosAntes);
    const f = resuelta(conAtributos(s, { fuerza: 6 }));
    assert.equal(f.atributos.fuerza, 9);
    assert.equal(f.ficha.atributos.fuerza, 6);
  });

  test("el desglose del atributo lleva cada aumento con su nombre", () => {
    const s = comprarVarias(conAtributos(defaultSheet(), { fuerza: 2 }), [OSTEOTENDINOSA, SINCRONIZACION]);
    assert.deepEqual(resuelta(s).desgloses.atributos.fuerza, {
      total: 4,
      fuentes: [
        { etiqueta: "Base", valor: 2 },
        { etiqueta: "Integridad Osteotendinosa", valor: 1 },
        { etiqueta: "Sincronización Neuromotora Profunda", valor: 1 },
      ],
    });
    assert.ok(resuelta(s).modificadores.some((m) => m.origen === "aumento" && m.fuente === "Integridad Osteotendinosa"));
  });

  test("los aumentos ya no salen como equipo", () => {
    const s = compra(defaultSheet(), { catalogoId: OSTEOTENDINOSA });
    assert.deepEqual(modificadoresDeEquipo(s), []);
  });

  test("NPC (modo libre): sus aumentos dan los atributos igual", () => {
    const res = comprarAumento(defaultSheet(), { catalogoId: MIELINIZACION }, { libre: true, instanciaId: "npc1" });
    assert.ok(res.ok);
    const f = resolverFicha(res.sheet, { estados: [], vitalidad: VITALIDAD_DE_FICHA, libre: true });
    assert.equal(f.atributos.inteligencia, 1);
  });
});

describe("A1: requisitos de dote con aumentos", () => {
  const INT_1: RequisitoDote = { tipo: "atributo", id: "inteligencia", min: 1 };
  const FUE_1: RequisitoDote = { tipo: "atributo", id: "fuerza", min: 1 };

  test("un +1 de aumento cumple el requisito, en servidor y en la ficha", () => {
    const s = defaultSheet();
    assert.equal(cumpleRequisitoDote(INT_1, valoresRequisitoDeFicha(s), []), false);
    const con = compra(s, { catalogoId: MIELINIZACION });
    assert.equal(cumpleRequisitoDote(INT_1, valoresRequisitoDeFicha(con), []), true);
    assert.equal(resuelta(con).requisitosDotes.atributos.inteligencia, 1);
  });

  test("ni el equipo normal (exoesqueleto) ni los estados cuentan", () => {
    const exo = equipar(defaultSheet(), { instanciaId: "exo", catalogoId: "exoesqueleto", nivel: 2 });
    assert.equal(cumpleRequisitoDote(FUE_1, valoresRequisitoDeFicha(exo), []), false);
    const enfermo: EstadoActivo = { estadoId: "enfermedad", gradoId: "nivel_1", rondasRestantes: null };
    const s = compra(defaultSheet(), { catalogoId: OSTEOTENDINOSA });
    const f = resuelta(s, false, [enfermo]);
    assert.equal(f.atributos.fuerza, 0); // +1 del aumento, −1 de la enfermedad
    assert.equal(f.requisitosDotes.atributos.fuerza, 1);
  });
});

describe("A1: rebajas de coste de habilidad (solo aprobada)", () => {
  const manduk = (casta: string): Sheet => ({ ...defaultSheet(), especieId: "manduk", especieOpciones: { casta } });
  const cerebro = (s: Sheet) => comprarVarias(s, [MIELINIZACION, NEUROGENESIS, ENGRAMATICA]);
  const costeBio = (f: ReturnType<typeof resuelta>, valor: number) =>
    costeSiguienteNivel({ tipo: "habilidad", id: "biociencia" }, valor, f.ajusteCosteSubida);

  test("aprobada: Neurogénesis + Engramática rebajan 2 en Biociencia, mínimo 1", () => {
    const s = cerebro(defaultSheet());
    assert.deepEqual(costeBio(resuelta(s, true), 1), { nivel: 2, coste: 1, pista: "−2 aumentos" }); // 2 − 2 → mínimo 1
    assert.deepEqual(costeBio(resuelta(s, true), 3), { nivel: 4, coste: 2, pista: "−2 aumentos" });
    // Engramática vale para todas; Neurogénesis solo para sus tres.
    assert.equal(costeSiguienteNivel({ tipo: "habilidad", id: "atletismo" }, 3, resuelta(s, true).ajusteCosteSubida).coste, 3);
  });

  test("aprobada: se suman a la casta de Manduk (Sabio −1, Guerrero +1)", () => {
    assert.deepEqual(costeBio(resuelta(cerebro(manduk("sabio")), true), 4), { nivel: 5, coste: 2, pista: "−3 casta y aumentos" });
    assert.deepEqual(costeBio(resuelta(cerebro(manduk("guerrero")), true), 4), { nivel: 5, coste: 4, pista: "−1 casta y aumentos" });
  });

  test("en borrador no hay rebaja: el point-buy y el coste del + usan solo la especie", () => {
    const s = cerebro(manduk("sabio"));
    const f = resuelta(s);
    assert.deepEqual(f.ajusteCosteSubida, f.ajusteCoste);
    assert.deepEqual(costeBio(f, 4), { nivel: 5, coste: 4, pista: "−1 casta" });
    const conBio = { ...s, habilidades: { ...s.habilidades, biociencia: { valor: 3, especialidades: [] } } };
    assert.equal(puntosHabilidadesGastados(conBio, resuelta(conBio, true).ajusteCoste), 1 + 1 + 2);
  });

  test("XP del servidor: el ajuste de subida con aumentos cobra la rebaja", () => {
    const s = cerebro(defaultSheet());
    const ajuste = ajusteCosteDeSubida(AJUSTE_NEUTRO, s, true);
    assert.equal(costeSubidaXp({ tipo: "habilidad", id: "biociencia" }, 2, 4, ajuste), 1 + 2);
    assert.equal(costeSubidaXp({ tipo: "habilidad", id: "biociencia" }, 2, 4, ajusteCosteDeSubida(AJUSTE_NEUTRO, s, false)), 3 + 4);
  });
});

describe("A1: Hipertrofia Miofibrilar", () => {
  // Fortaleza = ⌈(Fuerza + Aguante) / 2⌉. Hipertrofia va con sus requisitos (sin ellos no
  // da efectos): Osteotendinosa, Matriz Ósea e Hipertrofia suman Fuerza +3 y Aguante +1.
  const conRequisitos = (s: Sheet): Sheet => ({
    ...s,
    equipo: [
      { instanciaId: "o", catalogoId: OSTEOTENDINOSA },
      { instanciaId: "m", catalogoId: MATRIZ_OSEA },
      { instanciaId: "h", catalogoId: HIPERTROFIA },
    ],
  });
  const vida = (fuerza: number, aguante: number) =>
    resuelta(conRequisitos(conAtributos(defaultSheet(), { fuerza, aguante }))).salud.vida;

  test("Fortaleza positiva par: × 1,5", () => {
    assert.equal(vida(1, 3), 8 + 6); // Fue 4, Agu 4 → For 4 → 6
  });

  test("Fortaleza impar: × 1,5 redondeado hacia abajo", () => {
    assert.equal(vida(0, 2), 8 + 4); // Fue 3, Agu 3 → For 3 → 4,5 → 4
    assert.equal(vida(-1, -1), 8 + 1); // Fue 2, Agu 0 → For 1 → 1,5 → 1
  });

  test("sin sus requisitos no multiplica (requisito roto)", () => {
    const sola: Sheet = { ...conAtributos(defaultSheet(), { fuerza: 3, aguante: 4 }), equipo: [{ instanciaId: "h", catalogoId: HIPERTROFIA }] };
    assert.equal(resuelta(sola).salud.vida, 8 + 4); // Fue 3, Agu 4 → For 4, sin × 1,5 ni +1
  });

  test("Fortaleza 0 o negativa: no se multiplica", () => {
    const muyDebil: EstadoActivo = { estadoId: "enfermedad", gradoId: "nivel_3", rondasRestantes: null };
    const s = conRequisitos(conAtributos(defaultSheet(), { fuerza: -1, aguante: -1 }));
    const f = resuelta(s, false, [muyDebil]); // Fue 2 − 3, Agu 0 − 3 → For ⌈−2⌉ = −2
    assert.equal(f.aplicados.fortaleza, -2);
    assert.equal(f.salud.vida, 8 - 2);
  });

  test("quitarla recorta la vida actual al máximo nuevo; ponerla no la sube", () => {
    // Con sus requisitos (Osteotendinosa y Matriz Ósea): Fue 1+2 = 3, Agu 3+1 = 4 → For 4 → 12.
    const base = comprarVarias(conAtributos(defaultSheet(), { fuerza: 1, aguante: 3 }), [OSTEOTENDINOSA, MATRIZ_OSEA]);
    assert.equal(resuelta(base).salud.vida, 12);
    const s = compra(base, { catalogoId: HIPERTROFIA }); // Fue 4 → For 4 → 8 + 6 = 14
    assert.equal(resuelta(s).salud.vida, 14);
    const llena = { ...s, vidaActual: 14 };
    const pieza = llena.equipo.find((p) => p.catalogoId === HIPERTROFIA)!;
    const sin = retirarPieza(llena, pieza.instanciaId);
    assert.equal(resuelta(sin).salud.vida, 12);
    assert.equal(sin.vidaActual, 12);
    assert.equal(retirarPieza({ ...s, vidaActual: 5 }, pieza.instanciaId).vidaActual, 5);
    assert.equal(compra({ ...base, vidaActual: 12 }, { catalogoId: HIPERTROFIA }).vidaActual, 12);
  });
});
