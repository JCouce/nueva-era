import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";
import { accionesDeAtaque } from "./combate";
import { montarTirada, eleccionSinTocar, type EleccionTirada } from "./montaje";
import { resolverDanio, type Accion } from "./acciones";
import { brazoBionico, ID_BLOQUEAR_BRAZO, ID_CASILLA_BRAZO } from "./brazoBionico";
import { casillaBlindajeBrazo, desgloseBlindaje, SIN_ARMADURA_NATURAL } from "./blindaje";
import type { EstadoActivo } from "./estados";
import { armaIncorporadaEntradaSchema, armasIncorporables, desequipar, fijarArmaIncorporada } from "./equipo";
import { parseSheet } from "./sheet";

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

  test("nivel 1: la misma Fuerza y 1 menos de Agilidad; ni blindaje, ni bloqueo, ni letal", () => {
    assert.deepEqual(valores(conBrazo(ficha({ fuerza: 2, agilidad: 3 }), 1)), {
      fuerza: 2,
      agilidad: 2,
      blindaje: null,
      bloquea: false,
      peleaLetal: false,
    });
    // Por debajo de la base también con Agilidad negativa.
    assert.equal(valores(conBrazo(ficha({ agilidad: -1 }), 1)).agilidad, -2);
  });

  test("nivel 2: Fuerza +1 con tope 5, la misma Agilidad, blindaje 3", () => {
    assert.deepEqual(valores(conBrazo(ficha({ fuerza: 2, agilidad: 3 }), 2)), {
      fuerza: 3,
      agilidad: 3,
      blindaje: 3,
      bloquea: true,
      peleaLetal: true,
    });
    assert.equal(valores(conBrazo(ficha({ fuerza: 4 }), 2)).fuerza, 5);
    assert.equal(valores(conBrazo(ficha({ fuerza: 5 }), 2)).fuerza, 5);
    // La base ya pasa el tope: vale el tope ("con límite máximo"), aunque sea menos.
    assert.equal(valores(conBrazo(ficha({ fuerza: 6 }), 2)).fuerza, 5);
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
    assert.equal(valores(conBrazo(ficha({ agilidad: 6 }), 3, "agil")).agilidad, 5);
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
    assert.equal(valores(conBrazo(alta, 4, "agil")).fuerza, 5);
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

  test("nivel 1: marcada, la Potencia baja con la Agilidad del brazo; el daño no cambia (misma Fuerza) y sigue no letal", () => {
    // Agilidad 4: con la media hacia abajo, el −1 del brazo solo se nota si la suma tuya es par.
    const s = con(conBrazo(ficha({ fuerza: 2, agilidad: 4 }), 1), "pelea_punetazo");
    const t = fila(s, "Golpear con Puñetazo")!;
    const sin = montar(s, t, false);
    const conB = montar(s, t, true);
    assert.equal(sin.aplicado.valor, 3); // ⌊(2+4)/2⌋
    assert.equal(conB.aplicado.valor, 2); // ⌊(2+3)/2⌋, aunque sea menor (R4)
    assert.equal(conB.modificador, sin.modificador - 1);
    assert.equal(conB.desglose[0].etiqueta, "Potencia · Brazo Biónico 1: Fuerza 2 (tuya 2), Agilidad 3 (tuya 4)");
    assert.deepEqual(conB.danio.ajustes, []);
    assert.equal(conB.danio.categoria, null);
  });

  test("con Exoesqueleto: sin marcar, la Potencia lo lleva; marcada, el brazo usa su Fuerza, sin el exo", () => {
    let s = con(conBrazo(ficha({ fuerza: 2, agilidad: 4 }), 1), "pelea_punetazo");
    s = { ...s, equipo: [...s.equipo, { instanciaId: "arm", catalogoId: "armadura_pesada" }, { instanciaId: "exo", catalogoId: "exoesqueleto", nivel: 2, instaladoEnId: "arm" }] };
    const t = fila(s, "Golpear con Puñetazo")!;
    assert.equal(montar(s, t, false).aplicado.valor, 4); // ⌊(2+2+4)/2⌋
    assert.equal(montar(s, t, true).aplicado.valor, 2); // brazo: ⌊(2+3)/2⌋
  });

  test("nivel 4 Fuerte: más Potencia, más daño (ajuste con su fuente) y letal", () => {
    const s = con(conBrazo(ficha({ fuerza: 2, agilidad: 3 }), 4, "fuerte"), "pelea_punetazo");
    const t = fila(s, "Golpear con Puñetazo")!;
    const m = montar(s, t, true);
    assert.equal(m.aplicado.valor, 4); // ⌊(6+3)/2⌋; la tuya, ⌊(2+3)/2⌋ = 2
    assert.deepEqual(m.danio.ajustes, [{ valor: 4, fuente: "Brazo Biónico 4 (Modelo Fuerte): Fuerza 6 (tuya 2)" }]);
    assert.equal(m.danio.categoria?.a, "Letal");
    // Base del Puñetazo simple: Fuerza del usuario (2) + 4 del brazo = 6, letal.
    const d = resolverDanio(t.ataque!.modos[0].danio!, 0, t.ataque!.modos[0].categoriaDanio, m.danio);
    assert.equal(d.total, 6);
    assert.equal(d.categoria, "Letal");
    // Sin marcar, el de siempre.
    assert.equal(montar(s, t, false).danio.categoria, null);
  });

  test("el daño baja si la Fuerza del brazo es menor (tope del nivel 2)", () => {
    const s = con(conBrazo(ficha({ fuerza: 6, agilidad: 0 }), 2), "corta_tonfa_porra");
    const t = fila(s, "Golpear con Tonfa o Porra")!;
    const m = montar(s, t, true);
    assert.deepEqual(m.danio.ajustes, [{ valor: -1, fuente: "Brazo Biónico 2: Fuerza 5 (tuya 6)" }]);
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
    assert.deepEqual(m.danio.ajustes, [{ valor: 2, fuente: "Brazo Biónico 4 (Modelo Fuerte): Potencia 3 (tuya 1)" }]);
  });

  test("fuego de una mano: Reflejos con la Agilidad del brazo, sin tocar el daño", () => {
    const s = con(conBrazo(ficha({ agilidad: 2, percepcion: 2 }), 4, "agil"), "pistola_mosquito");
    const t = ataques(s).find((x) => x.id.startsWith("ataque_fuego_"))!;
    const m = montar(s, t, true);
    assert.equal(montar(s, t, false).aplicado.valor, 2);
    assert.equal(m.aplicado.valor, 3); // ⌊(5+2)/2⌋
    assert.deepEqual(m.danio.ajustes, []);
  });

  test("con un activable puesto, el brazo parte de la base permanente: puede quedar por debajo", () => {
    const s = con(conBrazo(con(ficha({ fuerza: 2, agilidad: 2 }), "aum_neuroprotesis_simpatica", 1), 1), "pelea_punetazo");
    const neuro: EstadoActivo = { estadoId: "aum_neuroprotesis", gradoId: "activo", rondasRestantes: 3 };
    const t = fila(s, "Golpear con Puñetazo", [neuro])!;
    assert.equal(montar(s, t, false, false, [neuro]).aplicado.valor, 3); // 3 y 3 con la Neuroprótesis
    const m = montar(s, t, true, false, [neuro]);
    assert.equal(m.aplicado.valor, 1); // brazo: Fuerza 2, Agilidad 1 → ⌊3/2⌋, por debajo hasta de la base sin activable (2)
    assert.deepEqual(m.danio.ajustes, [{ valor: -1, fuente: "Brazo Biónico 1: Fuerza 2 (tuya 3)" }]);
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
    assert.match(golpe.nota!, /Incorporada en el Brazo Biónico: desenfundado gratis, no te la pueden desarmar, cuenta para la carga\./);
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
