// T3b del barrido (do-05): lo que las dotes le hacen al objetivo del ataque, de la ficha al aviso
// de «El objetivo» (rules/efectosArma.ts).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { HABILIDADES } from "./habilidades";
import { resolverFicha, conExtrasDeFicha, VITALIDAD_DE_FICHA, type FichaResuelta } from "./fichaResuelta";
import { accionesDeAtaque } from "./combate";
import { equipar } from "./equipo";
import { efectosQueSaltan, efectosSobreObjetivo, type EfectoEnTirada } from "./efectosArma";
import type { Accion } from "./acciones";
import type { CondicionTirada, EstadoCondiciones } from "./condiciones";
import { DOTES } from "../catalog/dotes";
import type { EspecialidadId } from "../catalog/especialidades";
import type { DoteComprada } from "./dotesCompradas";

function ficha(dotes: DoteComprada[]): Sheet {
  const base = defaultSheet();
  const esp: Record<string, EspecialidadId[]> = {};
  for (const d of DOTES)
    for (const r of d.requisitos.flatMap((x) => (x.tipo === "uno_de" ? x.opciones : [x])))
      if (r.tipo === "especialidad") (esp[r.habilidad] ??= []).push(r.id);
  const atributos = Object.fromEntries(Object.keys(base.atributos).map((k) => [k, 4])) as Sheet["atributos"];
  return {
    ...base,
    atributos,
    habilidades: Object.fromEntries(HABILIDADES.map((h) => [h.id, { valor: 5, especialidades: [...new Set(esp[h.id] ?? [])] }])) as Sheet["habilidades"],
    dotes,
  };
}
const resolver = (s: Sheet) => resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA });
const armado = (s: Sheet, ...ids: string[]) => ids.reduce((x, id, i) => equipar(x, { instanciaId: `a${i}`, catalogoId: id }), s);
const filas = (f: FichaResuelta) => accionesDeAtaque(f.ficha, f.modificadores, f.extrasDotes.permisos).map((t) => conExtrasDeFicha(f, t));
const ataque = (f: FichaResuelta, label: string) => filas(f).find((t) => t.label.endsWith(` ${label}`) && !t.id.startsWith("lanzar_"))!;
const casilla = (t: Accion, re: RegExp) =>
  (t.condiciones ?? []).find((c): c is Extract<CondicionTirada, { tipo: "toggle" }> => c.tipo === "toggle" && re.test(c.etiqueta))!;
const con = (...ids: string[]): EstadoCondiciones => Object.fromEntries(ids.map((id) => [id, true]));

const ACIERTA = { exito: true, critico: false, dificultad: 7, total: 14 };
const CRITICO = { exito: true, critico: true, dificultad: 7, total: 19 };
const FALLA = { exito: false, critico: false, dificultad: 7, total: 5 };

describe("Golpe Entorpecedor: Entorpecido 1d4 turnos, lo tira la app", () => {
  const f = resolver(armado(ficha([{ id: "dote_golpe_entorpecedor" }]), "espada", "pistola_mosquito"));

  test("con la casilla y acierto: el grado de acierto, 1d4 tirado", () => {
    const t = ataque(f, "Espada");
    const c = casilla(t, /^Golpe entorpecedor \(debilidad/);
    const tiradas: number[] = [];
    const avisos = efectosSobreObjetivo(t, con(c.id), ACIERTA, (caras) => (tiradas.push(caras), 3));
    assert.deepEqual(tiradas, [4]);
    assert.equal(avisos.length, 1);
    assert.equal(avisos[0].titulo, "El objetivo sufre Entorpecido durante 3 turnos (1d4)");
    assert.equal(avisos[0].fuente, "Golpe Entorpecedor");
    assert.equal(avisos[0].grado?.id, "fallo");
    assert.deepEqual(avisos[0].grados.map((g) => g.id), ["fallo"]);
  });

  test("en crítico, el efecto crítico en lugar del normal, el mismo 1d4", () => {
    const t = ataque(f, "Espada");
    const c = casilla(t, /^Golpe entorpecedor \(debilidad/);
    // La Espada trae su propio crítico; el de la dote es uno solo.
    const avisos = efectosSobreObjetivo(t, con(c.id), CRITICO, () => 2).filter((a) => a.fuente === "Golpe Entorpecedor");
    assert.equal(avisos.length, 1);
    assert.equal(avisos[0].titulo, "El objetivo sufre Entorpecido (efecto crítico) durante 2 turnos (1d4)");
    assert.equal(avisos[0].grado?.id, "fracaso_critico");
    assert.equal(avisos[0].enCritico, true);
  });

  test("sin la casilla o fallando, nada; también en los disparos", () => {
    const t = ataque(f, "Espada");
    assert.deepEqual(efectosSobreObjetivo(t, {}, ACIERTA, () => 1), []);
    assert.deepEqual(efectosSobreObjetivo(t, con(casilla(t, /^Golpe entorpecedor \(debilidad/).id), FALLA, () => 1), []);
    const disparo = filas(f).find((x) => x.id.startsWith("ataque_fuego_"))!;
    const c = casilla(disparo, /^Golpe entorpecedor \(debilidad/);
    assert.equal(efectosSobreObjetivo(disparo, con(c.id), ACIERTA, () => 1).length, 1);
  });
});

describe("Golpe Fatigante: salva Fortaleza + Atletismo contra tu ataque", () => {
  const f = resolver(armado(ficha([{ id: "dote_golpe_fatigante" }]), "corta_maza_armas", "espada"));

  test("con la casilla y acierto: dificultad el total, fatiga en la tabla", () => {
    const t = ataque(f, "Maza de Armas");
    const c = casilla(t, /^Golpe fatigante/);
    const [aviso, ...resto] = efectosSobreObjetivo(t, con(c.id), ACIERTA, () => 1);
    assert.equal(resto.length, 0);
    assert.equal(aviso.titulo, "El objetivo salva Fortaleza + Atletismo contra Golpe Fatigante, dificultad 14 (el total de tu ataque)");
    assert.equal(aviso.estadoId, null);
    assert.deepEqual(aviso.grados.map((g) => [g.id, g.fatiga]), [
      ["fracasoCritico", 1],
      ["fracaso", 1],
      ["exito", undefined],
    ]);
    assert.match(aviso.grados[0].texto, /asfixia grado 1/);
  });

  test("ni la casilla ni el aviso con un arma de filo a una mano", () => {
    const t = ataque(f, "Espada");
    assert.equal(casilla(t, /^Golpe fatigante/), undefined);
    assert.equal(t.efectosObjetivoDeFicha, undefined);
  });
});

describe("Derribo (maniobra), Derribo Mejorado y Dominio Elevado", () => {
  const f = resolver(armado(ficha([{ id: "dote_derribo_mejorado" }, { id: "dote_dominio_elevado" }]), "espada", "mecanica_guantelete_piston"));
  const espada = () => ataque(f, "Espada");
  const dominio = (t: Accion) => casilla(t, /^Objetivo en posición inferior/).id;

  test("la maniobra pone la salvación del objetivo; Derribo Mejorado le añade fatiga y aturdido", () => {
    const t = espada();
    const [aviso, ...resto] = efectosSobreObjetivo(t, con("maniobra_derribo"), ACIERTA, () => 1);
    assert.equal(resto.length, 0);
    assert.equal(aviso.fuente, "Derribo (maniobra)");
    assert.match(aviso.titulo, /^El objetivo salva Potencia \+ Atletismo o Combate Melee contra Derribado, necesita tantos éxitos/);
    const [fc, fr, ex] = aviso.grados;
    assert.equal(fc.fatiga, 2);
    assert.deepEqual(fc.anadidos?.map((a) => [a.fuente, a.estado?.estadoId, a.estado?.turnos]), [["Derribo Mejorado", "aturdido", 1]]);
    assert.match(fc.texto, /Derribo Mejorado: Pierde 1 punto de fatiga\. Queda aturdido/);
    assert.equal(fr.fatiga, 1);
    assert.equal(ex.anadidos, undefined);
  });

  test("sin marcar el Derribo, nada", () => {
    assert.deepEqual(efectosSobreObjetivo(espada(), {}, ACIERTA, () => 1), []);
  });

  test("Dominio Elevado: −2 a la salvación contra el derribo; sin derribo, no avisa", () => {
    const t = espada();
    const [aviso] = efectosSobreObjetivo(t, con("maniobra_derribo", dominio(t)), ACIERTA, () => 1);
    assert.match(aviso.titulo, /; −2 a su tirada \(Dominio Elevado\)$/);
    assert.deepEqual(aviso.salvacion?.ajustes, [{ valor: -2, fuente: "Dominio Elevado" }]);
    assert.deepEqual(efectosSobreObjetivo(t, con(dominio(t)), ACIERTA, () => 1), []);
  });

  test("Dominio Elevado también en el Derribo (N) de un arma", () => {
    const t = ataque(f, "Guantelete de Pistón");
    const compleja = t.ataque!.modos.find((m) => m.etiqueta === "Compleja")!.id;
    const avisos = efectosSobreObjetivo(t, { ...con(dominio(t)), modo: compleja }, ACIERTA, () => 1);
    const derribo = avisos.find((a) => a.estadoId === "derribado")!;
    assert.match(derribo.titulo, /dificultad 8; −2 a su tirada \(Dominio Elevado\)$/);
    assert.equal(avisos.find((a) => a.estadoId === "aturdido")?.salvacion?.ajustes, undefined);
  });
});

describe("Asesino: el objetivo sigue sorprendido", () => {
  test("con la casilla, acierte o no; la casilla no suma", () => {
    const f = resolver(armado(ficha([{ id: "dote_asesino" }]), "espada"));
    const t = ataque(f, "Espada");
    const c = casilla(t, /^Objetivo sorprendido o desprevenido/);
    assert.equal(c.valorActivo, 0);
    assert.equal(c.resumen, "aviso al objetivo");
    for (const r of [ACIERTA, FALLA]) {
      const [aviso] = efectosSobreObjetivo(t, con(c.id), r, () => 1);
      assert.equal(aviso.estadoId, "sorprendido_desprevenido");
      assert.match(aviso.titulo, /^El objetivo sufre Sorprendido o desprevenido: lo sigue estando/);
    }
    assert.deepEqual(efectosSobreObjetivo(t, {}, ACIERTA, () => 1), []);
  });
});

describe("la munición que sustituye el crítico del arma no toca los de la ficha", () => {
  test("con sustituyeCritico, el crítico de la dote sigue", () => {
    const deArma: EfectoEnTirada = { tipo: "salvacion", estadoId: "aturdido", dificultad: 8, cuando: "critico", fuente: "Arma" };
    const deDote: EfectoEnTirada = {
      tipo: "estado",
      estadoId: "entorpecido",
      duracion: { tipo: "dado", caras: 4 },
      cuando: "critico",
      fuente: "Dote",
    };
    const t = {
      efectosObjetivo: [deArma],
      efectosObjetivoDeFicha: [deDote],
      municionesEspeciales: [{ id: "perforante", label: "Perforante", efectosObjetivo: [], sustituyeCritico: true }],
    };
    assert.deepEqual(efectosQueSaltan(t, { municion: "perforante" }, CRITICO).map((e) => e.fuente), ["Dote"]);
  });
});
