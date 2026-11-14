import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { conExtrasDeFicha, resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";
import { accionesDeAtaque } from "./combate";
import { montarTirada, eleccionSinTocar, type EleccionTirada } from "./montaje";
import { ACCIONES, resolverDanio, type Accion } from "./acciones";
import { brazoBionico, ID_BLOQUEAR_BRAZO, ID_CASILLA_BRAZO } from "./brazoBionico";
import { casillaBlindajeBrazo, desgloseBlindaje, SIN_ARMADURA_NATURAL } from "./blindaje";
import type { EstadoActivo } from "./estados";
import { lineaAntes, lineaDeGrado } from "./textosDeTirada";
import { armaIncorporadaEntradaSchema, armasIncorporables, desequipar, fijarArmaIncorporada } from "./equipo";
import { parseSheet } from "./sheet";
import { efectosSobreObjetivo } from "./efectosArma";

const BRAZO = "aum_brazo_bionico";
const OSTEO = "aum_integridad_osteotendinosa"; // +1 Fuerza y +1 Agilidad permanentes

let n = 0;
function con(s: Sheet, catalogoId: string, nivel?: number, eleccion?: string): Sheet {
  return {
    ...s,
    equipo: [...s.equipo, { instanciaId: `b${++n}`, catalogoId, ...(nivel !== undefined && { nivel }), ...(eleccion && { eleccion }) }],
  };
}
function ficha(atributos: Partial<Sheet["atributos"]> = {}): Sheet {
  const s = defaultSheet();
  return { ...s, atributos: { ...s.atributos, ...atributos } };
}
const conBrazo = (s: Sheet, nivel: number, modelo?: string) => con(s, BRAZO, nivel, modelo);
// Bloqueo y Combate Sutil con lo justo de requisitos (Combate Melee 1; Sutil, Agilidad 1).
function conDotes(s: Sheet, ...ids: ("dote_bloqueo" | "dote_combate_sutil")[]): Sheet {
  const cm = s.habilidades.combate_melee;
  return {
    ...s,
    atributos: ids.includes("dote_combate_sutil") ? { ...s.atributos, agilidad: Math.max(s.atributos.agilidad, 1) } : s.atributos,
    habilidades: { ...s.habilidades, combate_melee: { ...cm, valor: Math.max(cm.valor, 1) } },
    dotes: [...s.dotes, ...ids.map((id) => ({ id }))],
  };
}

const resolver = (s: Sheet, estados: EstadoActivo[] = []) => resolverFicha(s, { estados, vitalidad: VITALIDAD_DE_FICHA });
function ataques(s: Sheet, estados: EstadoActivo[] = []): Accion[] {
  const f = resolver(s, estados);
  return accionesDeAtaque(s, f.modificadores, f.extrasDotes.permisos);
}
const fila = (s: Sheet, label: string, estados: EstadoActivo[] = []) => ataques(s, estados).find((t) => t.label === label);
const casillaDe = (t: Accion | undefined) => t?.condiciones?.find((c) => c.id === ID_CASILLA_BRAZO);

function montar(s: Sheet, t: Accion, marcada: boolean, sutil = false, estados: EstadoActivo[] = []) {
  const base = eleccionSinTocar(t, sutil);
  const eleccion: EleccionTirada = { ...base, estadoCondiciones: { ...base.estadoCondiciones, [ID_CASILLA_BRAZO]: marcada } };
  return montarTirada(resolver(s, estados), t, eleccion);
}

describe("Brazo Biónico: Fuerza y Agilidad por nivel y modelo", () => {
  const valores = (s: Sheet) => {
    const b = brazoBionico(s)!;
    return { fuerza: b.fuerza, agilidad: b.agilidad, blindaje: b.blindaje, bloquea: b.bloquea, peleaLetal: b.peleaLetal };
  };

  test("sin el brazo, nada", () => {
    assert.equal(brazoBionico(ficha({ fuerza: 3 })), null);
  });

  // Sync Drive 2026-11-14 (M2.2): sustitutoria, iguala Fuerza y Agilidad (antes, Agilidad −1).
  test("nivel 1: la misma Fuerza y la misma Agilidad; ni blindaje, ni bloqueo, ni letal", () => {
    assert.deepEqual(valores(conBrazo(ficha({ fuerza: 2, agilidad: 3 }), 1)), {
      fuerza: 2,
      agilidad: 3,
      blindaje: null,
      bloquea: false,
      peleaLetal: false,
    });
    assert.equal(valores(conBrazo(ficha({ agilidad: -1 }), 1)).agilidad, -1);
  });

  test("nivel 2: Fuerza +1 con tope 5 (sin bajar de la tuya), la misma Agilidad, blindaje 3", () => {
    assert.deepEqual(valores(conBrazo(ficha({ fuerza: 2, agilidad: 3 }), 2)), {
      fuerza: 3,
      agilidad: 3,
      blindaje: 3,
      bloquea: true,
      peleaLetal: true,
    });
    assert.equal(valores(conBrazo(ficha({ fuerza: 4 }), 2)).fuerza, 5);
    assert.equal(valores(conBrazo(ficha({ fuerza: 5 }), 2)).fuerza, 5);
    // Sync Drive 2026-11-14 (M2.1): el tope limita el bono, nunca baja de tu atributo. Antes, 5.
    assert.equal(valores(conBrazo(ficha({ fuerza: 6 }), 2)).fuerza, 6);
  });

  test("nivel 3: Fuerte (+2, tope 7; blindaje 6) y Ágil (como el 2 y Agilidad +1, tope 5)", () => {
    assert.deepEqual(valores(conBrazo(ficha({ fuerza: 2, agilidad: 3 }), 3, "fuerte")), {
      fuerza: 4,
      agilidad: 3,
      blindaje: 6,
      bloquea: true,
      peleaLetal: true,
    });
    assert.equal(valores(conBrazo(ficha({ fuerza: 6 }), 3, "fuerte")).fuerza, 7);
    assert.deepEqual(valores(conBrazo(ficha({ fuerza: 2, agilidad: 3 }), 3, "agil")), {
      fuerza: 3,
      agilidad: 4,
      blindaje: 3,
      bloquea: true,
      peleaLetal: true,
    });
    assert.equal(valores(conBrazo(ficha({ fuerza: 5, agilidad: 5 }), 3, "agil")).fuerza, 5);
    assert.equal(valores(conBrazo(ficha({ fuerza: 5, agilidad: 5 }), 3, "agil")).agilidad, 5);
    assert.equal(valores(conBrazo(ficha({ agilidad: 6 }), 3, "agil")).agilidad, 6);
  });

  test("nivel 4: Fuerte, Equilibrado y Ágil", () => {
    const s = ficha({ fuerza: 3, agilidad: 2 });
    assert.deepEqual(valores(conBrazo(s, 4, "fuerte")), { fuerza: 7, agilidad: 2, blindaje: 8, bloquea: true, peleaLetal: true });
    assert.deepEqual(valores(conBrazo(s, 4, "equilibrado")), { fuerza: 5, agilidad: 4, blindaje: 6, bloquea: true, peleaLetal: true });
    assert.deepEqual(valores(conBrazo(s, 4, "agil")), { fuerza: 4, agilidad: 5, blindaje: 3, bloquea: true, peleaLetal: true });
    const alta = ficha({ fuerza: 6, agilidad: 6 });
    assert.equal(valores(conBrazo(alta, 4, "fuerte")).fuerza, 10);
    assert.equal(valores(conBrazo(alta, 4, "equilibrado")).fuerza, 7);
    assert.equal(valores(conBrazo(alta, 4, "equilibrado")).agilidad, 6);
    assert.equal(valores(conBrazo(alta, 4, "agil")).fuerza, 6);
    assert.equal(valores(conBrazo(alta, 4, "agil")).agilidad, 8);
  });

  test("la base es la permanente: suma los aumentos, no los activables", () => {
    const s = conBrazo(con(ficha({ fuerza: 2, agilidad: 2 }), OSTEO), 2);
    assert.deepEqual(brazoBionico(s)!.base, { fuerza: 3, agilidad: 3 });
    assert.equal(brazoBionico(s)!.fuerza, 4);
  });
});

describe("Brazo Biónico: casilla «Con el brazo biónico»", () => {
  test("sale en Puñetazo, codazo, cuerpo a cuerpo de una mano y fuego de una mano; no en la Patada ni a dos manos", () => {
    let s = conBrazo(ficha(), 1);
    for (const id of ["pelea_punetazo", "pelea_patada", "pelea_codazo_rodillazo", "corta_tonfa_porra", "asta_baston_combate", "pistola_mosquito"])
      s = con(s, id);
    assert.ok(casillaDe(fila(s, "Golpear con Puñetazo")));
    assert.ok(casillaDe(fila(s, "Golpear con Tonfa o Porra")));
    assert.ok(casillaDe(ataques(s).find((t) => t.id.startsWith("ataque_fuego_"))));
    assert.ok(fila(s, "Golpear con Patada"));
    assert.equal(casillaDe(fila(s, "Golpear con Patada")), undefined);
    const dosManos = ataques(s).find((t) => t.familiaArma === "ataque_melee" && t.empleoArma === "dos manos");
    assert.ok(dosManos);
    assert.equal(casillaDe(dosManos), undefined);
    const codazo = casillaDe(fila(s, "Golpear con Codazo o Rodillazo"));
    assert.ok(codazo && codazo.tipo === "toggle");
    assert.match(codazo.nota!, /Solo si es codazo/);
  });

  test("sin el brazo no hay casilla", () => {
    const s = con(ficha(), "pelea_punetazo");
    assert.equal(casillaDe(fila(s, "Golpear con Puñetazo")), undefined);
  });

  // Sync Drive 2026-11-14 (M2.2): el nivel 1 ya no resta Agilidad.
  test("nivel 1: marcada, la Potencia es la tuya (misma Fuerza y Agilidad); el daño no cambia y sigue no letal", () => {
    const s = con(conBrazo(ficha({ fuerza: 2, agilidad: 4 }), 1), "pelea_punetazo");
    const t = fila(s, "Golpear con Puñetazo")!;
    const sin = montar(s, t, false);
    const conB = montar(s, t, true);
    assert.equal(sin.aplicado.valor, 3); // ⌊(2+4)/2⌋
    assert.equal(conB.aplicado.valor, 3);
    assert.equal(conB.modificador, sin.modificador);
    assert.equal(conB.desglose[0].etiqueta, "Potencia · Brazo Biónico 1: Fuerza 2 (tuya 2), Agilidad 4 (tuya 4)");
    assert.deepEqual(conB.danio.ajustes, []);
    assert.equal(conB.danio.categoria, null);
  });

  test("con Exoesqueleto: el brazo parte de la Fuerza con el exo (se apilan)", () => {
    let s = con(conBrazo(ficha({ fuerza: 2, agilidad: 4 }), 1), "pelea_punetazo");
    // Ligera: admite el exoesqueleto 2 y su tope de Agilidad (4, S93) no toca la de la ficha.
    s = { ...s, equipo: [...s.equipo, { instanciaId: "arm", catalogoId: "armadura_ligera" }, { instanciaId: "exo", catalogoId: "exoesqueleto", nivel: 2, instaladoEnId: "arm" }] };
    const t = fila(s, "Golpear con Puñetazo")!;
    assert.equal(montar(s, t, false).aplicado.valor, 4); // ⌊(2+2+4)/2⌋
    assert.equal(montar(s, t, true).aplicado.valor, 4); // brazo: Fuerza 2+2, Agilidad 4 → ⌊(4+4)/2⌋
  });

  test("el tope de Agilidad de la armadura (S93) también topa la del brazo; la base no", () => {
    // Brazo 1: Agilidad 4 (la tuya); con la Intermedia (tope 2), 2.
    const sinArmadura = conBrazo(ficha({ fuerza: 2, agilidad: 4 }), 1);
    const conArmadura = con(sinArmadura, "armadura_intermedia");
    assert.equal(brazoBionico(sinArmadura)!.agilidad, 4);
    assert.equal(brazoBionico(conArmadura)!.agilidad, 2);
    assert.equal(brazoBionico(conArmadura)!.base.agilidad, 4);
  });

  test("nivel 4 Fuerte: más Potencia, más daño (ajuste con su fuente) y letal", () => {
    const s = con(conBrazo(ficha({ fuerza: 2, agilidad: 3 }), 4, "fuerte"), "pelea_punetazo");
    const t = fila(s, "Golpear con Puñetazo")!;
    const m = montar(s, t, true);
    assert.equal(m.aplicado.valor, 4); // ⌊(6+3)/2⌋; la tuya, ⌊(2+3)/2⌋ = 2
    // Sync Drive 2026-11-14 (M2.3): el Fuerte 4 suma además +3 al daño de pelea.
    assert.deepEqual(m.danio.ajustes, [
      { valor: 3, fuente: "Con el brazo biónico" },
      { valor: 4, fuente: "Brazo Biónico 4 (Modelo Fuerte): Fuerza 6 (tuya 2)" },
    ]);
    assert.equal(m.danio.categoria?.a, "Letal");
    // Base del Puñetazo simple: Fuerza del usuario (2) + 4 del brazo + 3 de pelea = 9, letal.
    const d = resolverDanio(t.ataque!.modos[0].danio!, 0, t.ataque!.modos[0].categoriaDanio, m.danio);
    assert.equal(d.total, 9);
    assert.equal(d.categoria, "Letal");
    // Sin marcar, el de siempre.
    assert.equal(montar(s, t, false).danio.categoria, null);
  });

  // Sync Drive 2026-11-14 (M2.1): antes el tope del nivel 2 dejaba el brazo en 5 y el daño bajaba 1.
  test("el tope no baja la Fuerza del brazo por debajo de la tuya: el daño no cambia", () => {
    const s = con(conBrazo(ficha({ fuerza: 6, agilidad: 0 }), 2), "corta_tonfa_porra");
    const t = fila(s, "Golpear con Tonfa o Porra")!;
    const m = montar(s, t, true);
    assert.deepEqual(m.danio.ajustes, []);
    // Un arma, no pelea: el nivel 2 no la vuelve letal.
    assert.equal(m.danio.categoria, null);
  });

  test("Sutil: el daño sale de la Potencia del brazo", () => {
    const s = conDotes(con(conBrazo(ficha({ fuerza: 1, agilidad: 1, percepcion: 1 }), 4, "fuerte"), "pelea_punetazo"), "dote_combate_sutil");
    const t = fila(s, "Golpear con Puñetazo")!;
    const m = montar(s, t, true, true);
    assert.equal(m.aplicado.id, "reflejos");
    assert.equal(m.aplicado.valor, 1); // Agilidad del brazo 1 (igual) + Percepción 1
    // Potencia: tuya ⌊(1+1)/2⌋ = 1; del brazo ⌊(5+1)/2⌋ = 3.
    assert.deepEqual(m.danio.ajustes, [
      { valor: 3, fuente: "Con el brazo biónico" },
      { valor: 2, fuente: "Brazo Biónico 4 (Modelo Fuerte): Potencia 3 (tuya 1)" },
    ]);
  });

  test("fuego de una mano: Reflejos con la Agilidad del brazo, sin tocar el daño", () => {
    const s = con(conBrazo(ficha({ agilidad: 2, percepcion: 2 }), 4, "agil"), "pistola_mosquito");
    const t = ataques(s).find((x) => x.id.startsWith("ataque_fuego_"))!;
    const m = montar(s, t, true);
    assert.equal(montar(s, t, false).aplicado.valor, 2);
    assert.equal(m.aplicado.valor, 3); // ⌊(5+2)/2⌋
    assert.deepEqual(m.danio.ajustes, []);
  });

  // Sync Drive 2026-11-14: la Neuroprótesis ya no sube atributos, sino la tirada; con el brazo y
  // sin él suma lo mismo, y el brazo sale de la misma base.
  test("con la Neuroprótesis activa, su +1 va a la tirada, con el brazo y sin él; el brazo no cambia", () => {
    const s = con(conBrazo(con(ficha({ fuerza: 2, agilidad: 2 }), "aum_neuroprotesis_simpatica", 1), 1), "pelea_punetazo");
    const neuro: EstadoActivo = { estadoId: "aum_neuroprotesis", gradoId: "activo", rondasRestantes: 3 };
    const t = fila(s, "Golpear con Puñetazo", [neuro])!;
    for (const marcada of [false, true]) {
      const sin = montar(s, t, marcada);
      const conNeuro = montar(s, t, marcada, false, [neuro]);
      assert.equal(conNeuro.aplicado.valor, sin.aplicado.valor, `brazo ${marcada}`);
      assert.equal(conNeuro.modificador - sin.modificador, 1, `brazo ${marcada}`);
      assert.deepEqual(conNeuro.danio.ajustes, sin.danio.ajustes, `brazo ${marcada}`);
    }
  });
});

// Sync Drive 2026-11-14 (M2.3): «aumenta en N el daño de sus golpes [de pelea] y la dificultad de
// aturdimiento por crítico». N2 +1/+1; N3 Fuerte +2/+2, Ágil +1/+1; N4 Fuerte +3/+2, Equilibrado
// +2/+2, Ágil +1/+1. Con la casilla marcada, en el Puñetazo y el codazo.
describe("Brazo Biónico: golpe de pelea, +N al daño y al aturdimiento del crítico", () => {
  const CRITICO = { exito: true, critico: true, dificultad: 7, total: 19 };
  const golpe = (nivel: number, modelo?: string) => {
    const s = con(conBrazo(ficha({ fuerza: 3, agilidad: 3 }), nivel, modelo), "pelea_punetazo");
    return { s, t: fila(s, "Golpear con Puñetazo")! };
  };
  const masDanio = (nivel: number, modelo?: string) => {
    const { s, t } = golpe(nivel, modelo);
    return montar(s, t, true).danio.ajustes.find((a) => a.fuente === "Con el brazo biónico")?.valor ?? 0;
  };
  const aturdimiento = (nivel: number, modelo?: string, marcada = true) => {
    const { t } = golpe(nivel, modelo);
    const aviso = efectosSobreObjetivo(t, { [ID_CASILLA_BRAZO]: marcada }, CRITICO, () => 1).find((a) => a.estadoId === "aturdido");
    return aviso?.salvacion?.ajustes ?? [];
  };

  test("daño por nivel y modelo", () => {
    assert.equal(masDanio(1), 0);
    assert.equal(masDanio(2), 1);
    assert.equal(masDanio(3, "fuerte"), 2);
    assert.equal(masDanio(3, "agil"), 1);
    assert.equal(masDanio(4, "fuerte"), 3);
    assert.equal(masDanio(4, "equilibrado"), 2);
    assert.equal(masDanio(4, "agil"), 1);
  });

  test("el daño entra en el golpe: Puñetazo simple con el brazo 2 (Fuerza 4) = 4 + 1, letal", () => {
    const { s, t } = golpe(2);
    const m = montar(s, t, true);
    const d = resolverDanio(t.ataque!.modos[0].danio!, 0, t.ataque!.modos[0].categoriaDanio, m.danio);
    assert.equal(d.total, 5);
    assert.equal(d.categoria, "Letal");
    // Sin marcar, el de siempre: Fuerza 3, no letal.
    const sin = resolverDanio(t.ataque!.modos[0].danio!, 0, t.ataque!.modos[0].categoriaDanio, montar(s, t, false).danio);
    assert.equal(sin.total, 3);
  });

  test("aturdimiento del crítico: −N a la salvación del objetivo (la dificultad sube N)", () => {
    assert.deepEqual(aturdimiento(1), []);
    assert.deepEqual(aturdimiento(2), [{ valor: -1, fuente: "Brazo Biónico 2" }]);
    assert.deepEqual(aturdimiento(3, "fuerte"), [{ valor: -2, fuente: "Brazo Biónico 3 (Modelo Fuerte)" }]);
    assert.deepEqual(aturdimiento(4, "fuerte"), [{ valor: -2, fuente: "Brazo Biónico 4 (Modelo Fuerte)" }]);
    assert.deepEqual(aturdimiento(4, "equilibrado"), [{ valor: -2, fuente: "Brazo Biónico 4 (Modelo Equilibrado)" }]);
    assert.deepEqual(aturdimiento(4, "agil"), [{ valor: -1, fuente: "Brazo Biónico 4 (Modelo Ágil)" }]);
    // Sin la casilla, no.
    assert.deepEqual(aturdimiento(4, "fuerte", false), []);
  });

  test("un arma no es pelea: ni daño ni aturdimiento de más", () => {
    const s = con(conBrazo(ficha({ fuerza: 3, agilidad: 3 }), 4, "fuerte"), "corta_tonfa_porra");
    const t = fila(s, "Golpear con Tonfa o Porra")!;
    assert.equal(montar(s, t, true).danio.ajustes.some((a) => a.fuente === "Con el brazo biónico"), false);
    assert.ok(!(t.efectosObjetivo ?? []).some((e) => e.tipo === "ajusteSalvacion"));
  });
});

// Sync Drive 2026-11-14 (M2.7): ventaja por 2 de fatiga en una prueba solo con el brazo. Límite:
// 1 por descanso largo, 2 y descansos cortos (texto), 3 por escena (usoPorEscena), 4 sin límite.
describe("Brazo Biónico: casilla de ventaja por 2 de fatiga", () => {
  const VENTAJA = "aum_brazo_ventaja";
  const fija = (s: Sheet, id: string) => conExtrasDeFicha(resolver(s), ACCIONES.find((a) => a.id === id)!);
  const casillaV = (t: Accion) => t.condiciones?.find((c) => c.id === VENTAJA);

  test("en las pruebas de Potencia, Fortaleza o Reflejos; no en las salvaciones ni en otras", () => {
    const s = conBrazo(ficha(), 1);
    assert.ok(casillaV(fija(s, "atletismo")));
    assert.ok(casillaV(fija(s, "escalar")));
    assert.equal(casillaV(fija(s, "salv_fortaleza")), undefined);
    assert.equal(casillaV(fija(s, "investigacion")), undefined);
    assert.equal(casillaV(fija(ficha(), "atletismo")), undefined);
  });

  test("marcada: ventaja y 2 de fatiga", () => {
    const s = conBrazo(ficha({ fuerza: 2, agilidad: 2 }), 2);
    const f = resolver(s);
    const t = fija(s, "atletismo");
    const c = casillaV(t)!;
    const e = eleccionSinTocar(t);
    const sin = montarTirada(f, t, e);
    const con = montarTirada(f, t, { ...e, estadoCondiciones: { ...e.estadoCondiciones, [VENTAJA]: true } });
    assert.equal(sin.ventaja, null);
    assert.equal(sin.costeFatiga, 0);
    assert.equal(con.ventaja, c.etiqueta);
    assert.equal(con.costeFatiga, 2);
    assert.equal(con.modificador, sin.modificador);
  });

  test("límite por nivel: texto en el 1 y el 2, por escena en el 3, sin límite en el 4", () => {
    const de = (nivel: number, modelo?: string) => {
      const c = casillaV(fija(conBrazo(ficha(), nivel, modelo), "atletismo"));
      assert.ok(c && c.tipo === "toggle");
      return c;
    };
    assert.match(de(1).nota ?? "", /Una vez por descanso largo\./);
    assert.equal(de(1).usoPorEscena, undefined);
    assert.match(de(2).nota ?? "", /descanso corto/);
    assert.equal(de(2).usoPorEscena, undefined);
    assert.equal(de(3, "fuerte").usoPorEscena, true);
    assert.match(de(4, "agil").nota ?? "", /Sin límite de uso\./);
    assert.equal(de(4, "agil").usoPorEscena, undefined);
  });
});

describe("Brazo Biónico: «Bloquear con el brazo biónico»", () => {
  const bloqueo = (s: Sheet) => ataques(s).find((t) => t.id === ID_BLOQUEAR_BRAZO);

  test("solo con nivel 2+ y la dote Bloqueo", () => {
    assert.equal(bloqueo(conDotes(conBrazo(ficha(), 1), "dote_bloqueo")), undefined);
    assert.equal(bloqueo(conBrazo(ficha(), 2)), undefined);
    assert.equal(bloqueo(conBrazo(ficha(), 4, "agil")), undefined);
    const t = bloqueo(conDotes(conBrazo(ficha(), 2), "dote_bloqueo"));
    assert.ok(t);
    assert.equal(t.grupo, "Defensa");
    assert.equal(t.familiaArma, "bloquear_melee");
    assert.equal(t.label, "Bloquear con el brazo biónico");
  });

  test("tira siempre con los atributos del brazo, sin casilla", () => {
    const s = conDotes(conBrazo(ficha({ fuerza: 1, agilidad: 1 }), 4, "fuerte"), "dote_bloqueo");
    const t = bloqueo(s)!;
    assert.equal(casillaDe(t), undefined);
    const m = montarTirada(resolver(s), t, eleccionSinTocar(t));
    assert.equal(m.aplicado.valor, 3); // ⌊(5+1)/2⌋; la tuya, 1
    assert.equal(m.desglose[0].etiqueta, "Potencia · Brazo Biónico 4 (Modelo Fuerte): Fuerza 5 (tuya 1), Agilidad 1 (tuya 1)");
  });

  // td-08 (usuario, 2026-11-13): cuenta como desarmado, pero su golpe es letal, así que no lleva
  // el −3 de Bloqueo («no se considera desarmado»).
  test("td-08: cuenta como desarmado (le llega lo de desarmado) y sin la casilla del −3", () => {
    const s = conDotes(conBrazo({ ...ficha(), especieId: "arkoru" }, 2), "dote_bloqueo");
    const f = resolver(s);
    const t = conExtrasDeFicha(f, bloqueo(s)!);
    assert.equal(t.desarmado, true);
    assert.equal(t.sinPenalizadorDesarmado, "Brazo Biónico 2");
    assert.ok(!(t.condiciones ?? []).some((c) => c.id.startsWith("dote_bloqueo")), "sin «Desarmado frente a atacante armado»");
    assert.doesNotMatch(lineaAntes(t), /Desarmado frente a atacante armado/);
    // El crítico desarmado letal del Arköru (texto con destino «desarmado») le llega.
    assert.match(lineaDeGrado(t, "critico"), /Daño letal/);
    assert.match(lineaAntes(t), /Cuenta como desarmado, sin el −3 de bloquear desarmado \(Brazo Biónico 2\)/);
  });
});

describe("Brazo Biónico: blindaje del golpe bloqueado (R12)", () => {
  test("la casilla solo sale con nivel 2+", () => {
    assert.equal(casillaBlindajeBrazo(conBrazo(ficha(), 1), "cinetico"), null);
    assert.equal(casillaBlindajeBrazo(ficha(), "cinetico"), null);
    assert.equal(casillaBlindajeBrazo(conBrazo(ficha(), 2), "cinetico")!.valor, 3);
    assert.equal(casillaBlindajeBrazo(conBrazo(ficha(), 3, "fuerte"), "cinetico")!.valor, 6);
    assert.equal(casillaBlindajeBrazo(conBrazo(ficha(), 3, "agil"), "cinetico")!.valor, 3);
    assert.equal(casillaBlindajeBrazo(conBrazo(ficha(), 4, "fuerte"), "cinetico")!.valor, 8);
    assert.equal(casillaBlindajeBrazo(conBrazo(ficha(), 4, "equilibrado"), "cinetico")!.valor, 6);
  });

  test("suma solo marcada y donde cuenta el blindaje", () => {
    const s = conBrazo(ficha(), 4, "fuerte");
    const total = (tipo: Parameters<typeof desgloseBlindaje>[1], marcada: boolean) =>
      desgloseBlindaje(s, tipo, SIN_ARMADURA_NATURAL, false, marcada).reduce((t, l) => t + l.valor, 0);
    assert.equal(total("cinetico", false), 0);
    assert.equal(total("cinetico", true), 8);
    assert.equal(total("plasma", true), 8);
    assert.equal(total("mental", true), 0);
    assert.equal(total("fuego", true), 0);
    assert.ok(casillaBlindajeBrazo(s, "mental")!.bloqueada);
    assert.ok(casillaBlindajeBrazo(s, "fuego")!.bloqueada);
    assert.equal(casillaBlindajeBrazo(s, "cinetico")!.bloqueada, null);
    // Con el nivel 1, marcada no suma.
    assert.equal(desgloseBlindaje(conBrazo(ficha(), 1), "cinetico", SIN_ARMADURA_NATURAL, false, true).length, 0);
  });
  // Sync Drive 2026-11-14 (M2.4, lectura A): «no se apila con armaduras ni con otros aumentos (se
  // aplica el mayor)». Compite con armadura + armadura natural; aporta lo que les falte.
  describe("no se apila con la armadura ni con la armadura natural: cuenta el mayor", () => {
    const total = (s: Sheet, natural = SIN_ARMADURA_NATURAL) =>
      desgloseBlindaje(s, "cinetico", natural, false, true).reduce((t, l) => t + l.valor, 0);
    const lineaBrazo = (s: Sheet) => desgloseBlindaje(s, "cinetico", SIN_ARMADURA_NATURAL, false, true).find((l) => l.etiqueta.startsWith("Bloqueado con el brazo"))!;

    test("armadura 4 + Osteotendinosa 1 con brazo 3 → 5 (el brazo aporta 0)", () => {
      const s = con(con(conBrazo(ficha(), 2), "armadura_ligera"), OSTEO);
      assert.equal(total(s), 5);
      assert.equal(lineaBrazo(s).valor, 0);
      assert.match(lineaBrazo(s).nota ?? "", /Blindaje 3: no se apila .*\(5\), cuenta el mayor/);
    });

    test("Ropa Reforzada 1 + Osteotendinosa 1 con brazo 3 → 3 (aporta +1)", () => {
      const s = con(con(conBrazo(ficha(), 2), "ropa_reforzada"), OSTEO);
      assert.equal(total(s), 3);
      assert.equal(lineaBrazo(s).valor, 1);
    });

    test("también contra la armadura natural de especie", () => {
      assert.equal(total(conBrazo(ficha(), 2), { valor: 2, fuente: "Arköru" }), 3);
      assert.equal(total(conBrazo(ficha(), 4, "fuerte"), { valor: 2, fuente: "Arköru" }), 8);
    });

    test("el Escudo Deflector suma encima", () => {
      const s = con(con(con(conBrazo(ficha(), 2), "ropa_reforzada"), OSTEO), "escudo_deflector", 1);
      assert.equal(total(s), 4);
      const armado = con(con(con(conBrazo(ficha(), 2), "armadura_ligera"), OSTEO), "escudo_deflector", 1);
      assert.equal(total(armado), 6);
    });

    test("sin nada más, el brazo entero", () => {
      assert.equal(lineaBrazo(conBrazo(ficha(), 3, "fuerte")).valor, 6);
      assert.equal(lineaBrazo(conBrazo(ficha(), 3, "fuerte")).nota, undefined);
    });
  });
});

describe("Brazo Biónico: no toca la ficha", () => {
  test("atributos, aplicados, vida y requisitos iguales con y sin el brazo", () => {
    const s = ficha({ fuerza: 2, agilidad: 3, aguante: 1 });
    for (const [nivel, modelo] of [[1], [2], [4, "fuerte"], [4, "agil"]] as [number, string?][]) {
      const sin = resolver(s);
      const conB = resolver(conBrazo(s, nivel, modelo));
      assert.deepEqual(conB.atributos, sin.atributos);
      assert.deepEqual(conB.aplicados, sin.aplicados);
      assert.deepEqual(conB.salud, sin.salud);
      assert.deepEqual(conB.requisitosDotes.atributos, sin.requisitosDotes.atributos);
    }
  });
});

// ── A6b ──────────────────────────────────────────────────────────────

// La última pieza añadida con `con` (para coger su instanciaId).
const ultima = (s: Sheet) => s.equipo[s.equipo.length - 1].instanciaId;
const idBrazo = (s: Sheet) => s.equipo.find((p) => p.catalogoId === BRAZO)!.instanciaId;
function incorporar(s: Sheet, armaId: string): Sheet {
  const res = fijarArmaIncorporada(s, idBrazo(s), armaId);
  assert.ok(res.ok);
  return res.sheet;
}
const bloqueoDe = (s: Sheet, instanciaId: string) => ataques(s).find((t) => t.id === `bloquear_melee_${instanciaId}`);

describe("Brazo Biónico: casilla en «Bloquear con X» (A6b)", () => {
  test("con un arma de una mano (escudo incluido) sí; a dos manos no; Pelea no (es «Bloquear con el brazo biónico»)", () => {
    let s = conDotes(conBrazo(ficha(), 2), "dote_bloqueo");
    s = con(s, "corta_tonfa_porra");
    const tonfa = ultima(s);
    s = con(s, "asta_baston_combate");
    const baston = ultima(s);
    s = con(s, "escudo_rodela");
    const rodela = ultima(s);
    s = con(s, "pelea_punetazo");
    const punetazo = ultima(s);
    s = con(s, "pelea_patada");
    const patada = ultima(s);
    assert.ok(casillaDe(bloqueoDe(s, tonfa)));
    assert.ok(casillaDe(bloqueoDe(s, rodela)));
    assert.ok(bloqueoDe(s, baston));
    assert.equal(casillaDe(bloqueoDe(s, baston)), undefined);
    assert.ok(bloqueoDe(s, punetazo));
    assert.equal(casillaDe(bloqueoDe(s, punetazo)), undefined);
    assert.equal(casillaDe(bloqueoDe(s, patada)), undefined);
  });

  test("marcada, el bloqueo tira con los atributos del brazo", () => {
    let s = conDotes(conBrazo(ficha({ fuerza: 1, agilidad: 1 }), 4, "fuerte"), "dote_bloqueo");
    s = con(s, "corta_tonfa_porra");
    const t = bloqueoDe(s, ultima(s))!;
    assert.equal(montar(s, t, false).aplicado.valor, 1); // ⌊(1+1)/2⌋
    assert.equal(montar(s, t, true).aplicado.valor, 3); // ⌊(5+1)/2⌋
  });

  test("lanzar un arma arrojadiza sigue sin casilla", () => {
    const s = con(conBrazo(ficha(), 2), "espada_cuchillo_combate");
    const lanzar = ataques(s).find((t) => t.familiaArma === "lanzar_melee");
    assert.ok(lanzar);
    assert.equal(casillaDe(lanzar), undefined);
  });
});

describe("Brazo Biónico: arma incorporada (A6b)", () => {
  test("opciones: armas de una mano equipadas, de cuerpo a cuerpo y de fuego; sin Pelea, dos manos ni escudos", () => {
    let s = conBrazo(ficha(), 1);
    for (const id of ["pelea_punetazo", "corta_tonfa_porra", "asta_baston_combate", "pistola_mosquito", "escopeta_feritas", "escudo_rodela"]) s = con(s, id);
    assert.deepEqual(
      armasIncorporables(s).map((p) => p.catalogoId),
      ["corta_tonfa_porra", "pistola_mosquito"],
    );
  });

  test("validación: brazo de la ficha y arma equipada de una mano; null la quita", () => {
    let s = conBrazo(ficha(), 1);
    s = con(s, "corta_tonfa_porra");
    const tonfa = ultima(s);
    s = con(s, "asta_baston_combate");
    const baston = ultima(s);
    s = con(s, "pelea_punetazo");
    const punetazo = ultima(s);
    assert.equal(fijarArmaIncorporada(s, idBrazo(s), baston).ok, false);
    assert.equal(fijarArmaIncorporada(s, idBrazo(s), punetazo).ok, false);
    assert.equal(fijarArmaIncorporada(s, idBrazo(s), "no-existe").ok, false);
    assert.equal(fijarArmaIncorporada(s, tonfa, tonfa).ok, false); // la tonfa no es el brazo
    const conArma = incorporar(s, tonfa);
    assert.equal(conArma.equipo.find((p) => p.catalogoId === BRAZO)!.armaIncorporada, tonfa);
    const res = fijarArmaIncorporada(conArma, idBrazo(conArma), null);
    assert.ok(res.ok);
    assert.equal(res.sheet.equipo.find((p) => p.catalogoId === BRAZO)!.armaIncorporada, undefined);
  });

  test("la entrada del cliente: ids de texto, el arma puede ser null", () => {
    assert.ok(armaIncorporadaEntradaSchema.safeParse({ brazoInstanciaId: "b", armaInstanciaId: null }).success);
    assert.ok(armaIncorporadaEntradaSchema.safeParse({ brazoInstanciaId: "b", armaInstanciaId: "a" }).success);
    assert.equal(armaIncorporadaEntradaSchema.safeParse({ brazoInstanciaId: "", armaInstanciaId: "a" }).success, false);
    assert.equal(armaIncorporadaEntradaSchema.safeParse({ brazoInstanciaId: "b" }).success, false);
    assert.equal(armaIncorporadaEntradaSchema.safeParse({ brazoInstanciaId: "b", armaInstanciaId: 3 }).success, false);
  });

  test("ataque y bloqueo del arma incorporada: siempre con el brazo, sin casilla y con la nota", () => {
    let s = conDotes(conBrazo(ficha({ fuerza: 1, agilidad: 1 }), 4, "fuerte"), "dote_bloqueo");
    s = con(s, "corta_tonfa_porra");
    const tonfa = ultima(s);
    s = incorporar(s, tonfa);
    const golpe = ataques(s).find((t) => t.id === `ataque_melee_${tonfa}`)!;
    assert.equal(casillaDe(golpe), undefined);
    assert.ok(golpe.extremidad);
    assert.match(golpe.nota!, /Incorporada en el Brazo Biónico: no te la pueden desarmar con maniobras, cuenta para la carga\./);
    // El desenfundado gratis es la línea «Desenfundar» (T5c), no la nota.
    assert.match(lineaAntes(golpe), /Desenfundar: acción gratuita \(Brazo Biónico 4/);
    const m = montarTirada(resolver(s), golpe, eleccionSinTocar(golpe));
    assert.equal(m.aplicado.valor, 3); // ⌊(5+1)/2⌋, sin marcar nada
    assert.equal(m.danio.ajustes.length, 1); // Fuerza 5 del brazo frente a la tuya 1
    assert.equal(m.danio.ajustes[0].valor, 4);
    const bloqueo = bloqueoDe(s, tonfa)!;
    assert.equal(casillaDe(bloqueo), undefined);
    assert.equal(montarTirada(resolver(s), bloqueo, eleccionSinTocar(bloqueo)).aplicado.valor, 3);
  });

  test("un arma de fuego incorporada dispara con la Agilidad del brazo, sin casilla", () => {
    let s = con(conBrazo(ficha({ agilidad: 2, percepcion: 2 }), 4, "agil"), "pistola_mosquito");
    const pistola = ultima(s);
    s = incorporar(s, pistola);
    const t = ataques(s).find((x) => x.id === `ataque_fuego_${pistola}`)!;
    assert.equal(casillaDe(t), undefined);
    assert.equal(t.extremidad?.agilidad, 5);
  });

  test("las demás armas siguen con su casilla", () => {
    let s = con(conBrazo(ficha(), 1), "corta_tonfa_porra");
    const tonfa = ultima(s);
    s = con(s, "pistola_mosquito");
    s = incorporar(s, tonfa);
    assert.ok(casillaDe(ataques(s).find((t) => t.id.startsWith("ataque_fuego_"))));
  });

  test("al desequipar el arma, el vínculo cae; al quitar otra, no", () => {
    let s = con(conBrazo(ficha(), 1), "corta_tonfa_porra");
    const tonfa = ultima(s);
    s = con(s, "pistola_mosquito");
    const pistola = ultima(s);
    s = incorporar(s, tonfa);
    const brazoDe = (x: Sheet) => x.equipo.find((p) => p.catalogoId === BRAZO)!;
    assert.equal(brazoDe(desequipar(s, pistola)).armaIncorporada, tonfa);
    assert.equal(brazoDe(desequipar(s, tonfa)).armaIncorporada, undefined);
  });

  test("parseSheet descarta el vínculo inválido: arma no equipada, de dos manos o Pelea", () => {
    const base = (arma: string, catalogoId: string | null) => ({
      ...defaultSheet(),
      equipo: [
        { instanciaId: "brazo", catalogoId: BRAZO, nivel: 1, armaIncorporada: arma },
        ...(catalogoId ? [{ instanciaId: arma, catalogoId }] : []),
      ],
    });
    const vinculo = (raw: unknown) => parseSheet(raw).equipo.find((p) => p.catalogoId === BRAZO)!.armaIncorporada;
    assert.equal(vinculo(base("x", "corta_tonfa_porra")), "x");
    assert.equal(vinculo(base("x", null)), undefined);
    assert.equal(vinculo(base("x", "asta_baston_combate")), undefined);
    assert.equal(vinculo(base("x", "pelea_punetazo")), undefined);
    // Solo vale en la pieza del brazo.
    const enOtra = parseSheet({
      ...defaultSheet(),
      equipo: [
        { instanciaId: "t", catalogoId: "corta_tonfa_porra", armaIncorporada: "p" },
        { instanciaId: "p", catalogoId: "pistola_mosquito" },
      ],
    });
    assert.equal(enOtra.equipo[0].armaIncorporada, undefined);
  });
});
