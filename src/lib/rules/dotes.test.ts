import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, parseSheet, SCHEMA_VERSION, type Sheet } from "./sheet";
import { migrar } from "./migraciones";
import { setPrioridad } from "./creacion";
import { elegirEspecie } from "./especie";
import { snapshotFromSheet, parseSnapshot } from "./aprobacion";
import { faltaParaEnviar } from "./revision";
import { resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";
import { PUNTOS_DOTES_POR_LETRA } from "./prioridad";
import {
  comprarDote,
  cumpleRequisitoDote,
  dotesConRequisitoRoto,
  estadoRequisitos,
  faltasDeDotes,
  motivoNoComprable,
  motivoNoQuitable,
  presupuestoDotes,
  puntosDotesDisponibles,
  puntosDotesGastados,
  opcionesDeEleccion,
  quitarDote,
  SECCIONES_DOTES,
  textoRequisitoDote,
  valoresRequisitoDeFicha,
  type ContextoCompraDote,
  CONTEXTO_LIBRE,
} from "./dotes";
import { dotePorId, normalizarDotes } from "./dotesCompradas";
import { DOTES } from "../catalog/dotes";
import type { EspecialidadId } from "../catalog/especialidades";

// ── Fichas de prueba ───────────────────────────────────────────────────

function ficha(cambios: Partial<Sheet> = {}): Sheet {
  return { ...setPrioridad(defaultSheet(), "dotes", "A"), ...cambios };
}

function conHabilidad(s: Sheet, id: keyof Sheet["habilidades"], valor: number, especialidades: EspecialidadId[] = []): Sheet {
  return { ...s, habilidades: { ...s.habilidades, [id]: { valor, especialidades } } };
}

function conAtributos(s: Sheet, atributos: Partial<Sheet["atributos"]>): Sheet {
  return { ...s, atributos: { ...s.atributos, ...atributos } };
}

const creacion = (s: Sheet): ContextoCompraDote => ({ valores: valoresRequisitoDeFicha(s), aprobada: false, xp: 0 });
const conXp = (s: Sheet, xp: number): ContextoCompraDote => ({ valores: valoresRequisitoDeFicha(s), aprobada: true, xp });

function compra(s: Sheet, id: string, eleccion?: string, ctx = creacion(s)): Sheet {
  const r = comprarDote(s, { id, ...(eleccion !== undefined && { eleccion }) }, ctx);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.sheet;
}

const requisitos = (id: string) => dotePorId(id)!.requisitos;
const cumple = (s: Sheet, id: string, i = 0) =>
  cumpleRequisitoDote(requisitos(id)[i], valoresRequisitoDeFicha(s), s.dotes);

// ── Catálogo ───────────────────────────────────────────────────────────

describe("catálogo generado", () => {
  test("105 dotes, ids únicos", () => {
    assert.equal(DOTES.length, 105);
    assert.equal(new Set(DOTES.map((d) => d.id)).size, 105);
  });

  test("Olfato de Investigador no aparece en las secciones y no se compra", () => {
    assert.equal(dotePorId("dote_olfato_de_investigador")!.visible, false);
    assert.ok(!SECCIONES_DOTES.some((s) => s.dotes.some((d) => d.id === "dote_olfato_de_investigador")));
    assert.equal(SECCIONES_DOTES.reduce((t, s) => t + s.dotes.length, 0), 104);
    let s = conHabilidad(ficha(), "exploracion", 4, ["investigacion"]);
    s = conAtributos(s, { inteligencia: 2, percepcion: 2 });
    assert.match(motivoNoComprable(s, { id: "dote_olfato_de_investigador" }, creacion(s)) ?? "", /no tiene efecto/);
  });

  test("Biónica es especialidad de Biociencia", () => {
    const req = requisitos("dote_artesano_bionico")[0];
    assert.equal(req.tipo === "especialidad" && req.habilidad, "biociencia");
  });

  test("la prosa viene de docs/dotes.md", () => {
    assert.match(dotePorId("dote_bloqueo")!.texto, /^El bloqueo es una acción defensiva/);
  });
});

// ── Requisitos ─────────────────────────────────────────────────────────

describe("requisitos", () => {
  test("atributo: el básico con la especie", () => {
    // Burla: Carácter 1 (requisito 1). Manduk noble suma Carácter +1.
    const sin = ficha();
    assert.equal(cumple(sin, "dote_burla", 1), false);
    const manduk = ficha({ especieId: "manduk", especieOpciones: { casta: "noble", linaje: "ilkrem" } });
    assert.equal(cumple(manduk, "dote_burla", 1), true);
  });

  test("aplicado: la media de los dos básicos", () => {
    // Apoyo: Expresión 1 (Carácter + Inteligencia, media hacia arriba).
    assert.equal(cumple(ficha(), "dote_apoyo", 1), false);
    assert.equal(cumple(conAtributos(ficha(), { caracter: 1 }), "dote_apoyo", 1), true);
  });

  test("habilidad: el nivel entero, no la mitad fuera de especialidad", () => {
    // Paso Defensivo: Atletismo 1.
    assert.equal(cumple(ficha(), "dote_paso_defensivo"), false);
    assert.equal(cumple(conHabilidad(ficha(), "atletismo", 1), "dote_paso_defensivo"), true);
  });

  test("especialidad: habilidad a N y la especialidad, por id del catálogo", () => {
    // Burla: Humor 1 (Actitud).
    assert.equal(cumple(conHabilidad(ficha(), "actitud", 3), "dote_burla"), false, "sin la especialidad");
    assert.equal(cumple(conHabilidad(ficha(), "actitud", 1, ["humor"]), "dote_burla"), true);
    // Humor Negro: Humor 2 — la habilidad a 1 no llega aunque tenga la especialidad.
    assert.equal(cumple(conHabilidad(ficha(), "actitud", 1, ["humor"]), "dote_humor_negro"), false);
    assert.equal(cumple(conHabilidad(ficha(), "biociencia", 3, ["ingenieria_genetica"]), "dote_genio_genetista"), true);
    // La especialidad tiene que estar en SU habilidad.
    assert.equal(cumple(conHabilidad(ficha(), "tecnociencia", 3, ["bionica"]), "dote_artesano_bionico"), false);
    assert.equal(cumple(conHabilidad(ficha(), "biociencia", 3, ["bionica"]), "dote_artesano_bionico"), true);
  });

  test("el texto del requisito usa el nombre del catálogo de especialidades", () => {
    const req = requisitos("dote_genio_genetista").find((r) => r.tipo === "especialidad")!;
    assert.match(textoRequisitoDote(req), /^Ingeniería Genética \d \(Biociencia\)$/);
  });

  test("uno_de: basta una de las opciones", () => {
    // Apoyo: Empatía 1 o Liderazgo 1.
    assert.equal(cumple(ficha(), "dote_apoyo"), false);
    assert.equal(cumple(conHabilidad(ficha(), "actitud", 1, ["liderazgo"]), "dote_apoyo"), true);
    assert.equal(cumple(conHabilidad(ficha(), "actitud", 1, ["empatia"]), "dote_apoyo"), true);
    // Crítico Mejorado: Combate Melee 3 o Combate a Distancia 3.
    assert.equal(cumple(conHabilidad(ficha(), "combate_distancia", 3), "dote_critico_mejorado"), true);
  });

  test("dote previa", () => {
    let s = conAtributos(conHabilidad(ficha(), "actitud", 3, ["intimidacion"]), { caracter: 1 });
    assert.equal(cumple(s, "dote_violencia_aterradora", 2), false);
    s = compra(s, "dote_mirada_desafiante");
    assert.equal(cumple(s, "dote_violencia_aterradora", 2), true);
  });

  test("disciplina concreta y «cualquiera»", () => {
    // Onda Residual: Singularidad 3. Potencia Psiónica: cualquier disciplina 3.
    const s = ficha({ psionica: { resonancia: 3, singularidad: 2 } });
    assert.equal(cumple(s, "dote_onda_residual"), false);
    assert.equal(cumple(s, "dote_potencia_psionica", 1), true, "la mayor (Resonancia 3) cumple");
    assert.equal(cumple(ficha({ psionica: { singularidad: 3 } }), "dote_onda_residual"), true);
  });

  test("psionico: alguna disciplina > 0, comprada o por especie", () => {
    assert.equal(cumple(ficha(), "dote_potencia_psionica"), false);
    assert.equal(cumple(ficha({ psionica: { induccion: 1 } }), "dote_potencia_psionica"), true);
    // Arianyi: Resonancia +1 de especie, sin comprar nada.
    assert.equal(cumple(ficha({ especieId: "arianyi" }), "dote_potencia_psionica"), true);
  });

  test("estadoRequisitos: texto legible y si se cumple", () => {
    const estado = estadoRequisitos(dotePorId("dote_apoyo")!, valoresRequisitoDeFicha(ficha()), []);
    assert.deepEqual(estado, [
      { texto: "Empatía 1 (Actitud) o Liderazgo 1 (Actitud)", cumple: false },
      { texto: "Expresión 1", cumple: false },
    ]);
  });
});

// ── Pool ───────────────────────────────────────────────────────────────

describe("pool por letra", () => {
  test("A 18 · B 15 · C 12 · D 9 · E 6, S+ infinito, sin letra 0", () => {
    assert.deepEqual(
      { A: 18, B: 15, C: 12, D: 9, E: 6 },
      Object.fromEntries((["A", "B", "C", "D", "E"] as const).map((l) => [l, PUNTOS_DOTES_POR_LETRA[l]])),
    );
    assert.equal(presupuestoDotes(setPrioridad(defaultSheet(), "dotes", "S+")), Infinity);
    assert.equal(presupuestoDotes(defaultSheet()), 0);
  });

  test("gastar descuenta el coste; no se puede pasar del pool", () => {
    // Letra E (6): Combate Melee 6 abre casi todo Combate Melee.
    let s = conAtributos(conHabilidad(setPrioridad(defaultSheet(), "dotes", "E"), "combate_melee", 3), { agilidad: 1 });
    s = compra(s, "dote_bloqueo"); // 2
    s = compra(s, "dote_contraataque_rapido"); // 4 → 6 de 6
    assert.equal(puntosDotesGastados(s), 6);
    assert.equal(puntosDotesDisponibles(s), 0);
    assert.equal(motivoNoComprable(s, { id: "dote_finta" }, creacion(s)), "No te quedan puntos de dotes");
  });

  test("sin letra no se compra", () => {
    const s = conHabilidad(defaultSheet(), "combate_melee", 1);
    assert.equal(motivoNoComprable(s, { id: "dote_bloqueo" }, creacion(s)), "Asigna una letra de prioridad a Dotes");
  });

  test("requisitos sin cumplir: no se compra, con el porqué", () => {
    const s = ficha();
    assert.equal(motivoNoComprable(s, { id: "dote_bloqueo" }, creacion(s)), "No cumples: Combate Melee 1");
  });
});

// ── Repetible y elección ───────────────────────────────────────────────

describe("elección y repetible", () => {
  const medico = () => conAtributos(conHabilidad(ficha(), "biociencia", 2, ["medicina"]), { inteligencia: 1 });

  test("Especialidad Médica: varias veces con elección distinta, nunca dos con la misma", () => {
    let s = medico();
    assert.match(motivoNoComprable(s, { id: "dote_especialidad_medica" }, creacion(s)) ?? "", /^Elige/);
    assert.match(motivoNoComprable(s, { id: "dote_especialidad_medica", eleccion: "inventada" }, creacion(s)) ?? "", /^Elige/);
    s = compra(s, "dote_especialidad_medica", "ceguera_sordera");
    s = compra(s, "dote_especialidad_medica", "hemorragia_herida");
    assert.equal(s.dotes.length, 2);
    assert.equal(
      motivoNoComprable(s, { id: "dote_especialidad_medica", eleccion: "ceguera_sordera" }, creacion(s)),
      "Ya la tienes con esa elección",
    );
  });

  test("no repetible: una sola vez", () => {
    let s = conHabilidad(ficha(), "combate_melee", 1);
    s = compra(s, "dote_bloqueo");
    assert.equal(motivoNoComprable(s, { id: "dote_bloqueo" }, creacion(s)), "Ya tienes esta dote");
  });

  test("elección abierta: texto libre recortado (Bioma Predilecto)", () => {
    let s = conHabilidad(ficha(), "exploracion", 3, ["supervivencia"]);
    s = compra(s, "dote_bioma_predilecto", "  Pantano tóxico ");
    assert.deepEqual(s.dotes, [{ id: "dote_bioma_predilecto", eleccion: "Pantano tóxico" }]);
  });

  test("una dote sin elección ignora la que le manden", () => {
    let s = conHabilidad(ficha(), "combate_melee", 1);
    s = compra(s, "dote_bloqueo", "lo que sea");
    assert.deepEqual(s.dotes, [{ id: "dote_bloqueo" }]);
  });
});

// ── Ficha aprobada: XP y nada se vende ─────────────────────────────────

describe("ficha aprobada", () => {
  test("compra con XP al mismo coste, sin pool", () => {
    // Sin letra: aprobada no recibe pool, compra con XP igual.
    const s = conHabilidad(defaultSheet(), "combate_melee", 1);
    const r = comprarDote(s, { id: "dote_bloqueo" }, conXp(s, 5));
    assert.ok(r.ok);
    assert.equal(r.ok && r.costeXp, 2);
    assert.equal(motivoNoComprable(s, { id: "dote_bloqueo" }, conXp(s, 1)), "No tienes XP suficiente");
  });

  test("creación no cobra XP", () => {
    const s = conHabilidad(ficha(), "combate_melee", 1);
    const r = comprarDote(s, { id: "dote_bloqueo" }, creacion(s));
    assert.equal(r.ok && r.costeXp, 0);
  });

  test("una dote de la foto no se quita", () => {
    const s = compra(conHabilidad(ficha(), "combate_melee", 1), "dote_bloqueo");
    const foto = snapshotFromSheet(s).dotes!;
    assert.match(motivoNoQuitable(s, { id: "dote_bloqueo" }, { aprobada: true, foto }) ?? "", /foto de aprobación/);
    assert.equal(quitarDote(s, { id: "dote_bloqueo" }, { aprobada: true, foto }).ok, false);
  });

  test("tampoco la comprada con XP después (solo comprar)", () => {
    const s = compra(conHabilidad(ficha(), "combate_melee", 1), "dote_bloqueo");
    assert.match(motivoNoQuitable(s, { id: "dote_bloqueo" }, { aprobada: true, foto: [] }) ?? "", /aprobada/);
  });
});

// ── Quitar ─────────────────────────────────────────────────────────────

describe("quitar en creación", () => {
  test("se quita y devuelve el pool", () => {
    let s = compra(conHabilidad(ficha(), "combate_melee", 1), "dote_bloqueo");
    const r = quitarDote(s, { id: "dote_bloqueo" }, { aprobada: false, foto: null });
    assert.ok(r.ok);
    s = r.ok ? r.sheet : s;
    assert.equal(s.dotes.length, 0);
    assert.equal(puntosDotesDisponibles(s), 18);
  });

  test("no se quita una dote que es requisito de otra comprada", () => {
    let s = conAtributos(conHabilidad(ficha(), "combate_melee", 3), { agilidad: 1 });
    s = compra(s, "dote_bloqueo");
    s = compra(s, "dote_contraataque_rapido");
    assert.equal(
      motivoNoQuitable(s, { id: "dote_bloqueo" }, { aprobada: false, foto: null }),
      "Es requisito de Contraataque Rápido: quita esa antes",
    );
    // Quitando antes la que depende, ya se puede.
    const r = quitarDote(s, { id: "dote_contraataque_rapido" }, { aprobada: false, foto: null });
    assert.ok(r.ok);
    assert.equal(r.ok && motivoNoQuitable(r.sheet, { id: "dote_bloqueo" }, { aprobada: false, foto: null }), null);
  });

  test("una copia de una repetible se quita por su elección", () => {
    let s = conAtributos(conHabilidad(ficha(), "biociencia", 2, ["medicina"]), { inteligencia: 1 });
    s = compra(s, "dote_especialidad_medica", "ceguera_sordera");
    s = compra(s, "dote_especialidad_medica", "hemorragia_herida");
    const r = quitarDote(s, { id: "dote_especialidad_medica", eleccion: "ceguera_sordera" }, { aprobada: false, foto: null });
    assert.ok(r.ok);
    assert.deepEqual(r.ok && r.sheet.dotes, [{ id: "dote_especialidad_medica", eleccion: "hemorragia_herida" }]);
  });
});

// ── Requisito no cumplido ──────────────────────────────────────────────

describe("requisito que deja de cumplirse", () => {
  test("la dote se queda, marcada, y bloquea el envío a revisión", () => {
    let s = compra(conHabilidad(ficha(), "combate_melee", 1), "dote_bloqueo");
    s = conHabilidad(s, "combate_melee", -1); // baja la habilidad
    assert.deepEqual(s.dotes, [{ id: "dote_bloqueo" }], "no se borra");
    const rotas = dotesConRequisitoRoto(s, valoresRequisitoDeFicha(s));
    assert.deepEqual(rotas.map((r) => [r.label, r.faltan]), [["Bloqueo", ["Combate Melee 1"]]]);
    const faltas = faltasDeDotes(s, valoresRequisitoDeFicha(s));
    assert.deepEqual(faltas, ["Requisito no cumplido en la dote Bloqueo"]);
    assert.deepEqual(faltaParaEnviar([], faltas), faltas);
  });

  test("lo mismo leyendo de la ficha resuelta (pantalla)", () => {
    const s = conHabilidad(compra(conHabilidad(ficha(), "combate_melee", 1), "dote_bloqueo"), "combate_melee", -1);
    const resuelta = resolverFicha(s, { estadosCombate: [], vitalidad: VITALIDAD_DE_FICHA });
    assert.deepEqual(faltasDeDotes(s, resuelta.requisitosDotes), faltasDeDotes(s, valoresRequisitoDeFicha(s)));
  });

  test("con todo cumplido no hay faltas", () => {
    const s = compra(conHabilidad(ficha(), "combate_melee", 1), "dote_bloqueo");
    assert.deepEqual(faltasDeDotes(s, valoresRequisitoDeFicha(s)), []);
  });
});

// ── Ficha: lectura tolerante, migración, reset, foto ───────────────────

describe("sheet.dotes", () => {
  test("parseSheet descarta ids desconocidos, elecciones que no encajan y duplicados", () => {
    const dotes = normalizarDotes([
      { id: "dote_bloqueo" },
      { id: "dote_bloqueo" }, // duplicada, no repetible
      { id: "dote_inventada" },
      "basura",
      { id: "dote_especialidad_medica" }, // le falta la elección
      { id: "dote_especialidad_medica", eleccion: "gripe" }, // fuera de la lista cerrada
      { id: "dote_especialidad_medica", eleccion: "ceguera_sordera" },
      { id: "dote_especialidad_medica", eleccion: "ceguera_sordera" }, // misma elección
      { id: "dote_especialidad_medica", eleccion: "hemorragia_herida" },
      { id: "dote_bioma_predilecto", eleccion: "x".repeat(200) }, // abierta: se recorta
      { id: "dote_critico_mejorado", eleccion: "Espadas" }, // especialidad de arma: id del catálogo
      { id: "dote_critico_mejorado", eleccion: "medicina" }, // id, pero no de arma
      { id: "dote_critico_mejorado", eleccion: "espadas_y_dagas" },
      { id: "dote_paso_defensivo", eleccion: "sobra" }, // sin elección en el catálogo
    ]);
    assert.deepEqual(dotes, [
      { id: "dote_bloqueo" },
      { id: "dote_especialidad_medica", eleccion: "ceguera_sordera" },
      { id: "dote_especialidad_medica", eleccion: "hemorragia_herida" },
      { id: "dote_bioma_predilecto", eleccion: "x".repeat(60) },
      { id: "dote_critico_mejorado", eleccion: "espadas_y_dagas" },
      { id: "dote_paso_defensivo" },
    ]);
    assert.deepEqual(parseSheet({ schemaVersion: SCHEMA_VERSION, dotes: "no es un array" }).dotes, []);
  });

  test("parseSheet no revalida requisitos (es gate de compra, no de lectura)", () => {
    assert.deepEqual(parseSheet({ schemaVersion: SCHEMA_VERSION, dotes: [{ id: "dote_maestro_oportunista" }] }).dotes, [
      { id: "dote_maestro_oportunista" },
    ]);
  });

  test("migración v15 → v16: las fichas antiguas empiezan sin dotes", () => {
    const { ficha: f, aplicadas } = migrar({ schemaVersion: 15, especieId: "humano" }, 16);
    assert.equal(f.schemaVersion, 16);
    assert.equal(aplicadas.length, 1);
    assert.deepEqual(f.dotes, []);
    assert.deepEqual(parseSheet({ schemaVersion: 15 }).dotes, []);
  });

  test("cambiar de especie en creación vacía también las dotes (§14.3)", () => {
    const s = compra(conHabilidad(ficha({ especieId: "humano" }), "combate_melee", 1), "dote_bloqueo");
    const r = elegirEspecie(s, { especieId: "riux" }, { aprobada: false, esMaster: false, libre: false });
    assert.ok(!("error" in r) && r.reseteada);
    assert.deepEqual(!("error" in r) && r.sheet.dotes, []);
  });

  test("la foto de aprobación guarda las dotes; una foto vieja sin ellas sigue valiendo", () => {
    const s = compra(conHabilidad(ficha(), "combate_melee", 1), "dote_bloqueo");
    const snap = snapshotFromSheet(s);
    assert.deepEqual(snap.dotes, [{ id: "dote_bloqueo" }]);
    assert.deepEqual(parseSnapshot(snap), snap);
    const vieja = { atributos: snap.atributos, habilidades: snap.habilidades };
    assert.deepEqual(parseSnapshot(vieja), vieja);
  });
});

describe("Crítico Mejorado: especialidad de arma de lista cerrada", () => {
  const dote = dotePorId("dote_critico_mejorado")!;
  const conDos = () =>
    conHabilidad(conHabilidad(ficha(), "combate_melee", 3, ["espadas_y_dagas", "pelea"]), "combate_distancia", 1, ["armas_pesadas"]);

  test("ofrece solo las especialidades de arma que tiene, en la habilidad que cumple el requisito", () => {
    const s = conDos();
    const op = opcionesDeEleccion(dote, s, valoresRequisitoDeFicha(s))!;
    assert.equal(op.cerrada, true);
    // Armas Pesadas no: Combate a Distancia está a 1 y el requisito pide 3.
    assert.deepEqual(op.opciones, [
      { valor: "espadas_y_dagas", etiqueta: "Espadas y Dagas" },
      { valor: "pelea", etiqueta: "Pelea" },
    ]);
  });

  test("comprar con una que no tiene o de una habilidad que no cumple, no", () => {
    const s = setPrioridad(conDos(), "dotes", "A");
    const ctx = creacion(s);
    assert.match(motivoNoComprable(s, { id: dote.id, eleccion: "flagelos" }, ctx) ?? "", /especialidad de arma que tengas/);
    assert.match(motivoNoComprable(s, { id: dote.id, eleccion: "armas_pesadas" }, ctx) ?? "", /especialidad de arma que tengas/);
    assert.equal(motivoNoComprable(s, { id: dote.id, eleccion: "pelea" }, ctx), null);
  });
});

// ── Modo libre: NPC del máster (§9.4) ──────────────────────────────────

describe("modo libre (NPC del máster, §9.4)", () => {
  // Un NPC: sin letra de Dotes, sin XP, y sin Combate Melee (no cumpliría Bloqueo).
  const npc = () => defaultSheet();
  const poner = (s: Sheet, id: string, eleccion?: string): Sheet => compra(s, id, eleccion, CONTEXTO_LIBRE);

  test("pone una dote sin cumplir requisitos, sin letra ni XP, y no cuesta nada", () => {
    const s = npc();
    assert.equal(s.prioridades.dotes, null);
    assert.equal(cumple(s, "dote_bloqueo"), false);
    const r = comprarDote(s, { id: "dote_bloqueo" }, CONTEXTO_LIBRE);
    assert.ok(r.ok);
    assert.deepEqual(r.ok && r.sheet.dotes, [{ id: "dote_bloqueo" }]);
    assert.equal(r.ok && r.costeXp, 0);
    // Una dote con otra dote de requisito, sin tenerla.
    assert.deepEqual(poner(s, "dote_contraataque_rapido").dotes, [{ id: "dote_contraataque_rapido" }]);
  });

  test("Olfato de Investigador tampoco se pone", () => {
    assert.match(motivoNoComprable(npc(), { id: "dote_olfato_de_investigador" }, CONTEXTO_LIBRE) ?? "", /no se puede comprar/);
    assert.equal(motivoNoComprable(npc(), { id: "dote_inventada" }, CONTEXTO_LIBRE), "Dote desconocida");
  });

  test("elección obligatoria igual que en personaje: cerrada, abierta y repetible", () => {
    let s = npc();
    assert.match(motivoNoComprable(s, { id: "dote_especialidad_medica" }, CONTEXTO_LIBRE) ?? "", /^Elige/);
    assert.match(motivoNoComprable(s, { id: "dote_especialidad_medica", eleccion: "inventada" }, CONTEXTO_LIBRE) ?? "", /^Elige/);
    s = poner(s, "dote_especialidad_medica", "ceguera_sordera");
    s = poner(s, "dote_especialidad_medica", "hemorragia_herida");
    assert.equal(
      motivoNoComprable(s, { id: "dote_especialidad_medica", eleccion: "ceguera_sordera" }, CONTEXTO_LIBRE),
      "Ya la tienes con esa elección",
    );
    assert.match(motivoNoComprable(s, { id: "dote_bioma_predilecto" }, CONTEXTO_LIBRE) ?? "", /^Elige/);
    s = poner(s, "dote_bioma_predilecto", "  Pantano tóxico ");
    assert.deepEqual(s.dotes.at(-1), { id: "dote_bioma_predilecto", eleccion: "Pantano tóxico" });
    // No repetible: una vez.
    s = poner(s, "dote_bloqueo");
    assert.equal(motivoNoComprable(s, { id: "dote_bloqueo" }, CONTEXTO_LIBRE), "Ya tienes esta dote");
  });

  test("Crítico Mejorado: las especialidades de arma que tenga, sin mirar la habilidad del requisito", () => {
    const dote = dotePorId("dote_critico_mejorado")!;
    // Combate a Distancia a 1: en personaje Armas Pesadas no saldría (pide 3).
    const s = conHabilidad(conHabilidad(npc(), "combate_melee", 0, ["pelea"]), "combate_distancia", 1, ["armas_pesadas"]);
    const op = opcionesDeEleccion(dote, s, null)!;
    assert.equal(op.cerrada, true);
    assert.deepEqual(op.opciones.map((o) => o.valor).sort(), ["armas_pesadas", "pelea"]);
    assert.equal(motivoNoComprable(s, { id: dote.id, eleccion: "armas_pesadas" }, CONTEXTO_LIBRE), null);
    assert.match(motivoNoComprable(s, { id: dote.id, eleccion: "flagelos" }, CONTEXTO_LIBRE) ?? "", /que tenga el NPC/);
  });

  test("quitar siempre: también si es requisito de otra", () => {
    let s = poner(poner(npc(), "dote_bloqueo"), "dote_contraataque_rapido");
    assert.equal(motivoNoQuitable(s, { id: "dote_bloqueo" }, CONTEXTO_LIBRE), null);
    const r = quitarDote(s, { id: "dote_bloqueo" }, CONTEXTO_LIBRE);
    assert.ok(r.ok);
    s = r.ok ? r.sheet : s;
    assert.deepEqual(s.dotes, [{ id: "dote_contraataque_rapido" }]);
    assert.equal(motivoNoQuitable(s, { id: "dote_bloqueo" }, CONTEXTO_LIBRE), "No tienes esa dote");
  });

  test("quitar una copia de una repetible por su elección", () => {
    let s = poner(poner(npc(), "dote_especialidad_medica", "ceguera_sordera"), "dote_especialidad_medica", "hemorragia_herida");
    const r = quitarDote(s, { id: "dote_especialidad_medica", eleccion: "ceguera_sordera" }, CONTEXTO_LIBRE);
    assert.ok(r.ok);
    s = r.ok ? r.sheet : s;
    assert.deepEqual(s.dotes, [{ id: "dote_especialidad_medica", eleccion: "hemorragia_herida" }]);
  });
});
