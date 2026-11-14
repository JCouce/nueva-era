import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { equipar, mejorasArmaInstaladas, validarInstalacion, type PiezaEquipada } from "./equipo";
import { MOTIVO_NO_ADMITIDA, mejorasNoAdmitidas, motivoNoAdmitida, sinMejorasNoAdmitidas } from "./compatibilidadArma";
import { accionesDeAtaque } from "./combate";
import { armasHabilitadasPara, comprarMunicionEspecial, ajustarGranada } from "./recursos";
import { modificadoresActivos } from "./derivados";
import { permisosDeDotes } from "./dotesEfectos";
import { resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";
import { MEJORAS_ARMA, MEJORAS_MUNICION_ESPECIAL } from "../catalog/mejorasArma";

// td-03 (usuario 2026-11-14): Arco y Ballesta solo admiten miras, Puntero Láser y Linterna.
const ADMITIDAS_IMPULSORAS = ["mira_telescopica", "puntero_laser", "linterna"];

const conArma = (catalogoId: string): Sheet => equipar(defaultSheet(), { instanciaId: "a", catalogoId });
// Una mejora ya instalada antes de que cambiara la regla: se mete a mano, sin pasar por equipar.
const conInstalada = (s: Sheet, catalogoId: string, nivel = 1): Sheet => ({
  ...s,
  equipo: [...s.equipo, { instanciaId: `m_${catalogoId}`, catalogoId, nivel, instaladoEnId: "a" } satisfies PiezaEquipada],
});
const ataques = (s: Sheet) => accionesDeAtaque(s, modificadoresActivos(s), permisosDeDotes(s));

describe("td-03: qué mejoras admiten Arco Táctico y Ballesta", () => {
  for (const arma of ["arco_tactico", "ballesta_pro_ue"]) {
    test(`${arma}: solo miras, Puntero Láser y Linterna, como dato del catálogo`, () => {
      const s = conArma(arma);
      const ok = [...MEJORAS_ARMA, ...MEJORAS_MUNICION_ESPECIAL]
        .filter((m) => m.niveles.some((n) => validarInstalacion(s, m.id, "a", n.nivel).ok))
        .map((m) => m.id);
      assert.deepEqual(ok.sort(), [...ADMITIDAS_IMPULSORAS].sort());
      assert.match(
        (validarInstalacion(s, "silenciador", "a", 1) as { motivo: string }).motivo,
        /no es compatible/,
      );
    });
  }

  test("el resto de armas, como antes: una pistola sigue admitiendo Silenciador y adaptadores", () => {
    const s = conArma("pistola_sydiasi");
    for (const id of ["silenciador", "sistema_retroceso", "municion_especial_incendiaria"]) {
      assert.ok(validarInstalacion(s, id, "a", 1).ok, id);
    }
    assert.equal(validarInstalacion(s, "mira_telescopica", "a", 1).ok, false);
  });
});

describe("td-03: una mejora ya instalada que el arma no admite", () => {
  const arco = conArma("arco_tactico");

  test("se queda, ocupa su ranura y sale marcada «No compatible con este arma»", () => {
    const s = conInstalada(arco, "silenciador");
    const pieza = s.equipo.find((p) => p.catalogoId === "silenciador")!;
    assert.equal(motivoNoAdmitida(s, pieza), MOTIVO_NO_ADMITIDA);
    assert.deepEqual([...mejorasNoAdmitidas(s)], ["m_silenciador"]);
    assert.equal(mejorasArmaInstaladas(s, "a"), 1);
    assert.equal(sinMejorasNoAdmitidas(s).equipo.length, 1);
    // Una admitida no se marca.
    const conMira = conInstalada(arco, "mira_telescopica");
    assert.equal(motivoNoAdmitida(conMira, conMira.equipo[1]), null);
  });

  test("no aporta nada: el disparo y la ficha resuelta, iguales que sin ella", () => {
    for (const [id, nivel] of [["sistema_retroceso", 2], ["silenciador", 1], ["municion_especial_incendiaria", 1], ["bipode", 2]] as const) {
      const s = conInstalada(arco, id, nivel);
      assert.deepEqual(ataques(s), ataques(arco), id);
      const con = resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA });
      const sin = resolverFicha(arco, { estados: [], vitalidad: VITALIDAD_DE_FICHA });
      assert.deepEqual(con.modificadores, sin.modificadores, id);
      assert.deepEqual(con.indiceCondiciones, sin.indiceCondiciones, id);
      assert.deepEqual(con.fichaSinApagadas.equipo, sin.fichaSinApagadas.equipo, id);
    }
  });

  test("ni acciones: la Bayoneta o el Lanzagranadas en un arco no generan fila", () => {
    let s = conInstalada(conInstalada(arco, "bayoneta"), "lanzagranadas_integrado");
    s = ajustarGranada(s, "granada_fragmentacion", 2);
    const labels = ataques(s).map((t) => t.label);
    assert.ok(!labels.some((l) => /Bayoneta|Lanzagranadas/.test(l)), labels.join(", "));
  });

  test("el Shock no la toca (no funciona): ni apagada ni penalizada", () => {
    // La Mira 2 es electrónica y solo cabe en fusiles: forzada en una pistola, el Shock la ignora.
    const shock = (gradoId: string) => [{ estadoId: "shock_equipo", gradoId, rondasRestantes: null }];
    const pistola = conInstalada(conArma("pistola_sydiasi"), "mira_telescopica", 2);
    const apaga = resolverFicha(pistola, { estados: shock("fracaso_critico"), vitalidad: VITALIDAD_DE_FICHA });
    assert.equal(apaga.piezasInutilizadas.has("m_mira_telescopica"), false);
    const penaliza = resolverFicha(pistola, { estados: shock("fracaso"), vitalidad: VITALIDAD_DE_FICHA });
    assert.equal(penaliza.piezasPenalizadas.has("m_mira_telescopica"), false);
    // En un arco sí se admite: el mismo grado la apaga.
    const arcoConMira = conInstalada(arco, "mira_telescopica", 2);
    const f = resolverFicha(arcoConMira, { estados: shock("fracaso_critico"), vitalidad: VITALIDAD_DE_FICHA });
    assert.ok(f.piezasInutilizadas.has("m_mira_telescopica"));
  });
});

describe("munición especial sin adaptador (Arco y Ballesta)", () => {
  test("la Tienda deja comprarla con un arco equipado, sin adaptador", () => {
    const s = conArma("arco_tactico");
    assert.deepEqual(armasHabilitadasPara(s, "incendiaria").map((p) => p.instanciaId), ["a"]);
    assert.ok(comprarMunicionEspecial(s, "incendiaria"));
    assert.equal(comprarMunicionEspecial(conArma("pistola_sydiasi"), "incendiaria"), null);
  });

  test("un adaptador que el arma no admite no habilita nada", () => {
    // Ningún arma normal lo tiene hoy; se fuerza en una pistola de plasma, que no lo admite.
    const s = conInstalada(conArma("pistola_plasma_sd"), "municion_especial_incendiaria");
    assert.deepEqual(armasHabilitadasPara(s, "incendiaria"), []);
  });
});
