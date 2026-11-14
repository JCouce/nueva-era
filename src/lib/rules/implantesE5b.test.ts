// Tanda E5b del sync Drive 2026-11-14 (docs/plan-sync-2026-11-14.md, docs/sistema.md §11 y S111):
// Chasis Osteomuscular, probado a través del motor (resolverFicha, montarTirada, las filas de ataque,
// Resistir daño, las acciones de aumento y la compra).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";
import { accionesDeAtaque } from "./combate";
import { permisosDeDotes } from "./dotesEfectos";
import { resolverGolpe, type EntradaResistir } from "./resistirDanio";
import type { EstadoActivo } from "./estados";

const CHASIS = "aum_chasis_osteomuscular";

let n = 0;
function con(sheet: Sheet, catalogoId: string, extra: { nivel?: number; eleccion?: string } = {}): Sheet {
  return { ...sheet, equipo: [...sheet.equipo, { instanciaId: `e5b${++n}`, catalogoId, ...extra }] };
}
const base = (): Sheet => ({ ...defaultSheet(), atributos: { ...defaultSheet().atributos, fuerza: 2 }, fatigaActual: 8, vidaActual: 8 });
// Con la dote Bloqueo (pide Combate Melee 1).
const conBloqueo = (s: Sheet): Sheet => ({
  ...s,
  habilidades: { ...s.habilidades, combate_melee: { ...s.habilidades.combate_melee, valor: 1 } },
  dotes: [...s.dotes, { id: "dote_bloqueo" }],
});
const conChasis = (nivel: number, s: Sheet = base()) => con(s, CHASIS, { nivel });

const resolver = (s: Sheet, estados: EstadoActivo[] = []) => resolverFicha(s, { estados, vitalidad: VITALIDAD_DE_FICHA });
const filas = (s: Sheet, estados: EstadoActivo[] = []) => {
  const f = resolver(s, estados);
  // Los permisos de las dotes sin mirar requisitos (Bloqueo pide Combate Melee).
  return accionesDeAtaque(s, f.modificadores, permisosDeDotes(s));
};
const punetazo = (s: Sheet) => filas(con(s, "pelea_punetazo")).find((t) => t.label === "Golpear con Puñetazo")!;

const GOLPE: EntradaResistir = { tipo: "cinetico", critico: false, danio: 10, reactivo: false, conBrazo: false, marcadas: [], rompeBlindaje: 0, categoria: null };
const lineaChasis = (s: Sheet, estados: EstadoActivo[] = [], tipo: EntradaResistir["tipo"] = "cinetico") =>
  resolverGolpe(resolver(s, estados), { ...GOLPE, tipo }).desglose.filter((l) => /Chasis/.test(l.etiqueta));

describe("E5b · Chasis Osteomuscular, nivel 1", () => {
  test("Fuerza +1 en la ficha (atributo, como un aumento permanente)", () => {
    assert.equal(resolver(conChasis(1)).atributos.fuerza - resolver(base()).atributos.fuerza, 1);
    assert.equal(resolver(conChasis(1)).requisitosDotes.atributos.fuerza, 3, "cuenta para los requisitos de dote");
  });

  test("armadura natural 1 en Resistir daño, también contra Eléctrico; contra Mental, no", () => {
    assert.deepEqual(lineaChasis(conChasis(1)).map((l) => l.valor), [1]);
    assert.deepEqual(lineaChasis(conChasis(1), [], "electrico").map((l) => l.valor), [1]);
    assert.deepEqual(lineaChasis(conChasis(1), [], "mental"), []);
  });

  test("golpes desarmados letales, sin daño extra; bloquear desarmado sin el −3", () => {
    const sin = punetazo(base());
    const n1 = punetazo(conChasis(1));
    assert.equal(sin.ataque!.modos[0].categoriaDanio, "No Letal");
    assert.equal(n1.ataque!.modos[0].categoriaDanio, "Letal");
    assert.equal(n1.ataque!.modos[0].danio, sin.ataque!.modos[0].danio! + 1, "solo la Fuerza +1");
    assert.match(n1.nota ?? "", /Daño letal \(Chasis Osteomuscular 1\)/);
    const bloqueo = filas(conBloqueo(con(conChasis(1), "pelea_punetazo"))).find((t) => t.label === "Bloquear con Puñetazo");
    assert.equal(bloqueo?.sinPenalizadorDesarmado, "Chasis Osteomuscular 1");
  });
});
