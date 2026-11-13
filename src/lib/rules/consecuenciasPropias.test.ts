// T3c del barrido: lo que una acción le hace a quien la hace. Retroceso entrópico del Kerzul
// (eq-18, eq-19) e intimidar en combate con Grito de Guerra y compañía (do-04).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { HABILIDADES } from "./habilidades";
import { resolverFicha, conExtrasDeFicha, VITALIDAD_DE_FICHA, type FichaResuelta } from "./fichaResuelta";
import { accionesDeAtaque } from "./combate";
import { equipar } from "./equipo";
import { efectosSobreObjetivo } from "./efectosArma";
import { consecuenciaPropia, estadosActivosDe, salvacionPropiaDe, textoDeConsecuencia } from "./consecuenciasPropias";
import type { Accion } from "./acciones";
import { DOTES } from "../catalog/dotes";
import type { EspecialidadId } from "../catalog/especialidades";
import type { DoteComprada } from "./dotesCompradas";

function ficha(fuerza: number, dotes: DoteComprada[] = []): Sheet {
  const base = defaultSheet();
  const esp: Record<string, EspecialidadId[]> = {};
  for (const d of DOTES)
    for (const r of d.requisitos.flatMap((x) => (x.tipo === "uno_de" ? x.opciones : [x])))
      if (r.tipo === "especialidad") (esp[r.habilidad] ??= []).push(r.id);
  const atributos = Object.fromEntries(Object.keys(base.atributos).map((k) => [k, 4])) as Sheet["atributos"];
  return {
    ...base,
    atributos: { ...atributos, fuerza },
    habilidades: Object.fromEntries(HABILIDADES.map((h) => [h.id, { valor: 5, especialidades: [...new Set(esp[h.id] ?? [])] }])) as Sheet["habilidades"],
    dotes,
  };
}
const resolver = (s: Sheet) => resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA });
const armado = (s: Sheet, id: string) => equipar(s, { instanciaId: "k", catalogoId: id });
const golpe = (f: FichaResuelta): Accion =>
  accionesDeAtaque(f.ficha, f.modificadores, f.extrasDotes.permisos)
    .map((t) => conExtrasDeFicha(f, t))
    .find((t) => t.id === "ataque_melee_k")!;

describe("Retroceso entrópico del Kerzul (eq-18, eq-19)", () => {
  const espada = golpe(resolver(armado(ficha(3), "kerzul_espada_hacha_pico")));

  test("Estándar: dificultad el daño básico con tu Fuerza (Fue+7, Fuerza 3 = 10); daño la mitad, no letal", () => {
    const s = salvacionPropiaDe(espada, "0")!;
    assert.equal(s.tiradaId, "salv_fortaleza");
    assert.equal(s.dificultad, 10);
    assert.equal(s.etiqueta, "Salvar retroceso");
    assert.deepEqual(s.grados.fracaso?.danio, { valor: 5, categoria: "noLetal" });
  });

  test("Compleja: Fue+9 = 12, daño 6", () => {
    const s = salvacionPropiaDe(espada, "1")!;
    assert.equal(s.dificultad, 12);
    assert.equal(s.grados.fracasoCritico?.danio?.valor, 6);
  });

  test("la mitad se redondea abajo (Espadón Estándar, Fue+9 con Fuerza 2 = 11 → 5)", () => {
    const espadon = golpe(resolver(armado(ficha(2), "kerzul_espadon_hacha_armas")));
    const s = salvacionPropiaDe(espadon, "0")!;
    assert.equal(s.dificultad, 11);
    assert.equal(s.grados.fracaso?.danio?.valor, 5);
  });

  test("fallo: daño y Entorpecido 1 turno (grado fallo); fracaso crítico: grado fracaso_critico y Derribado; éxito: nada", () => {
    const op = (grado: "exito" | "fracaso" | "fracasoCritico" | "critico") => ({ tipo: "salvacion" as const, modoId: "0", grado });
    assert.equal(consecuenciaPropia(espada, op("exito")), null);
    assert.equal(consecuenciaPropia(espada, op("critico")), null);
    const fallo = consecuenciaPropia(espada, op("fracaso"))!;
    assert.deepEqual(estadosActivosDe(fallo.estados), [{ estadoId: "entorpecido", gradoId: "fallo", rondasRestantes: 1 }]);
    assert.equal(textoDeConsecuencia(fallo), "Recibes 5 de daño no letal. Te pones Entorpecido.");
    const critico = consecuenciaPropia(espada, op("fracasoCritico"))!;
    assert.deepEqual(estadosActivosDe(critico.estados), [
      { estadoId: "entorpecido", gradoId: "fracaso_critico", rondasRestantes: 1 },
      { estadoId: "derribado", gradoId: "activo", rondasRestantes: null },
    ]);
    assert.equal(textoDeConsecuencia(critico), "Recibes 5 de daño no letal. Te pones Entorpecido y Derribado.");
  });

  test("Puñal (solo Simple): sin retroceso; Lanza Corta: solo en su modo Estándar", () => {
    assert.equal(golpe(resolver(armado(ficha(3), "kerzul_punal"))).salvacionesPropias, undefined);
    const lanza = golpe(resolver(armado(ficha(3), "kerzul_lanza_corta")));
    assert.equal(salvacionPropiaDe(lanza, "0"), null);
    assert.equal(salvacionPropiaDe(lanza, "1")?.dificultad, 10);
  });

  test("Escudo de Kerzul (un solo modo, Estándar): también", () => {
    const escudo = golpe(resolver(armado(ficha(3), "kerzul_escudo")));
    assert.equal(salvacionPropiaDe(escudo, "0")?.dificultad, 8);
  });

  test("un arma que no es de Kerzul, sin retroceso", () => {
    assert.equal(golpe(resolver(armado(ficha(3), "espada"))).salvacionesPropias, undefined);
  });
});

describe("Intimidar en combate: Grito de Guerra, Violencia Aterradora y Mirada Desafiante (do-04)", () => {
  const f = resolver(
    ficha(3, [{ id: "dote_mirada_desafiante" }, { id: "dote_grito_de_guerra" }, { id: "dote_violencia_aterradora" }]),
  );
  const accion = (id: string) => conExtrasDeFicha(f, f.accionesDotes.tiradas.find((t) => t.id === id)!);
  const SIN_DIFICULTAD = { exito: null, critico: false, dificultad: null, total: 15 };

  test("Grito: cada enemigo a 40 m salva Voluntad + Actitud contra Miedo con tu total, aunque no haya dificultad", () => {
    const [aviso, ...resto] = efectosSobreObjetivo(accion("dotes_grito_de_guerra"), {}, SIN_DIFICULTAD, () => 1);
    assert.equal(resto.length, 0);
    assert.equal(aviso.titulo, "Cada enemigo a 40 m salva Voluntad + Actitud contra Miedo, dificultad 15 (tu total)");
    assert.equal(aviso.fuente, "Grito de Guerra");
    assert.deepEqual(
      aviso.grados.map((g) => [g.id, g.estado?.gradoId, g.estado?.turnos]),
      [
        ["fracasoCritico", "aterrorizado", 1],
        ["fracaso", "asustado", 1],
        ["exito", undefined, undefined],
        ["critico", undefined, undefined],
      ],
    );
  });

  test("Violencia: a los que lo presencien; Mirada: un objetivo, y ya es enfrentada", () => {
    const violencia = efectosSobreObjetivo(accion("dotes_violencia_aterradora"), {}, SIN_DIFICULTAD, () => 1);
    assert.match(violencia[0].titulo, /^Cada enemigo a 40 m que lo presencie salva Voluntad \+ Actitud contra Miedo/);
    const mirada = accion("dotes_mirada_desafiante");
    assert.equal(mirada.dificultadSugerida, undefined);
    assert.match(mirada.nota ?? "", /Enfrentada/);
    assert.match(efectosSobreObjetivo(mirada, {}, SIN_DIFICULTAD, () => 1)[0].titulo, /^El objetivo salva Voluntad \+ Actitud contra Miedo, dificultad 15/);
  });

  // Tu fracaso crítico depende de la tirada del enemigo, que la app no conoce (regla dura del
  // usuario, 2026-11-13): nada automático sobre ti; lo dice el tramo de su éxito crítico.
  test("nada automático sobre ti: tu Miedo sale en el tramo de su éxito crítico, lo pone el máster", () => {
    for (const id of ["dotes_grito_de_guerra", "dotes_violencia_aterradora", "dotes_mirada_desafiante"]) {
      const t = accion(id);
      for (const g of ["fracasoCritico", "fracaso", "exito", "critico"] as const) assert.equal(consecuenciaPropia(t, { tipo: "grado", grado: g }), null, id);
      assert.deepEqual(t.poder?.objetivoTira, []);
      const [aviso] = efectosSobreObjetivo(t, {}, SIN_DIFICULTAD, () => 1);
      assert.deepEqual(aviso.grados.map((g) => g.rango), ["9 o menos", "10 a 14", "15 a 20", "21 o más"], id);
      assert.match(aviso.grados[3].texto, /tú sufres Miedo 1 turno/);
    }
  });

  test("sin la dote no hay acción ni aviso", () => {
    assert.equal(resolver(ficha(3)).accionesDotes.tiradas.some((t) => t.id === "dotes_grito_de_guerra"), false);
  });
});
