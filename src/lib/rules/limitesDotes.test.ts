// Límites de las acciones de dote (usuario, 2026-10-28): "N por escena", "1 por aliado" (Apoyo)
// y "N por turno" en combate, con los contadores de la escena (usosEscena.ts).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, parseSheet, type Sheet } from "./sheet";
import { HABILIDADES } from "./habilidades";
import { resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";
import type { Accion } from "./acciones";
import { gastarUsoLimitado, ID_ALIADO_DOTE, type MesaDeFicha } from "./dotesAcciones";
import { claveDeTurno, conContador, contadorEscena, gastarUsosEscena, normalizarUsosEscena, usosEscenaDeFicha } from "./usosEscena";
import { terminarEscena } from "./vitalidad";
import { DOTES } from "../catalog/dotes";
import type { EspecialidadId } from "../catalog/especialidades";
import type { DoteComprada } from "./dotesCompradas";

function ficha(dotes: DoteComprada[]): Sheet {
  const base = defaultSheet();
  const todas: Record<string, EspecialidadId[]> = {};
  for (const d of DOTES)
    for (const r of d.requisitos.flatMap((x) => (x.tipo === "uno_de" ? x.opciones : [x])))
      if (r.tipo === "especialidad") (todas[r.habilidad] ??= []).push(r.id);
  return {
    ...base,
    atributos: Object.fromEntries(Object.keys(base.atributos).map((k) => [k, 4])) as Sheet["atributos"],
    habilidades: Object.fromEntries(HABILIDADES.map((h) => [h.id, { valor: 6, especialidades: [...new Set(todas[h.id] ?? [])] }])) as Sheet["habilidades"],
    dotes,
  };
}

const KIRA = { id: "ckira0000000000000000000a", nombre: "Kira" };
const ORU = { id: "coru00000000000000000000b", nombre: "Oru" };
const MESA: MesaDeFicha = { aliados: [KIRA, ORU], turno: null };

const tirada = (s: Sheet, id: string, mesa: MesaDeFicha | null = MESA): Accion =>
  resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA, mesa }).accionesDotes.tiradas.find((t) => t.id === id)!;

// Gasta un uso como lo hace el servidor: con el uso de la tirada resuelta.
function gastar(s: Sheet, id: string, aliado: string | null = null, mesa: MesaDeFicha = MESA): Sheet {
  const t = tirada(s, id, mesa);
  assert.ok(t.usoLimitado, id);
  const r = gastarUsoLimitado(s, t.usoLimitado, aliado, mesa.aliados);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.sheet;
}

describe("todas las acciones de dote con límite tienen un `por` contado o de texto", () => {
  test("hoy solo escena, aliado y turno", () => {
    const pors = new Set(DOTES.flatMap((d) => d.efectos.flatMap((e) => (e.tipo === "accion" && e.accion.limite ? [e.accion.limite].flat().map((l) => l.por) : []))));
    assert.deepEqual([...pors].sort(), ["aliado", "escena", "turno"]);
  });
});

describe("N veces por escena (Humor de afrontamiento)", () => {
  const ID = "dotes_humor_de_afrontamiento";
  const s = ficha([{ id: "dote_humor_de_afrontamiento" }]);

  test("sin mesa (NPC): solo texto, como antes", () => {
    const t = tirada(s, ID, null);
    assert.equal(t.usoLimitado, undefined);
    assert.equal(t.bloqueada, undefined);
    assert.match(t.nota ?? "", /una vez por escena/);
  });

  test("con mesa: se gasta al tirar, se bloquea agotada y se libera con Terminar escena", () => {
    assert.deepEqual(tirada(s, ID).usoLimitado, { accionId: ID, claves: [{ clave: ID, veces: 1 }] });
    const usada = gastar(s, ID);
    assert.equal(contadorEscena(usada.usosEscena, ID), 1);
    assert.equal(tirada(usada, ID).bloqueada, "Usada esta escena (1/1).");
    const r = gastarUsoLimitado(usada, tirada(usada, ID).usoLimitado!, null, MESA.aliados);
    assert.equal(r.ok, false);
    assert.equal(tirada(terminarEscena(usada), ID).bloqueada, undefined);
  });

  test("lo gastado sobrevive a guardar y leer la ficha, y sale en Recursos", () => {
    const usada = gastar(s, ID);
    assert.deepEqual(parseSheet(usada).usosEscena, usada.usosEscena);
    assert.deepEqual(usosEscenaDeFicha(usada), [{ id: `${ID}#1`, etiqueta: "Humor de afrontamiento (1)" }]);
  });
});

describe("1 por aliado (Apoyo)", () => {
  const ID = "dotes_apoyo";
  const s = ficha([{ id: "dote_apoyo" }]);
  const aliados = (t: Accion) => {
    const c = (t.condiciones ?? []).find((x) => x.id === ID_ALIADO_DOTE);
    return c?.tipo === "opcion" ? c.opciones.map((o) => o.etiqueta) : null;
  };

  test("selector con los aliados de la mesa; cada uso gasta el del elegido", () => {
    assert.deepEqual(aliados(tirada(s, ID)), ["Kira", "Oru"]);
    const conKira = gastar(s, ID, KIRA.id);
    assert.deepEqual(aliados(tirada(conKira, ID)), ["Oru"]);
    assert.equal(tirada(conKira, ID).bloqueada, undefined);
    const conLosDos = gastar(conKira, ID, ORU.id);
    assert.equal(tirada(conLosDos, ID).bloqueada, "Ya la has usado con todos tus aliados esta escena.");
    assert.deepEqual(usosEscenaDeFicha(conLosDos, MESA.aliados).map((u) => u.etiqueta), ["Apoyo · con Kira (1)", "Apoyo · con Oru (1)"]);
  });

  test("un aliado que no es de la mesa, o repetido, no gasta", () => {
    const uso = tirada(s, ID).usoLimitado!;
    assert.equal(gastarUsoLimitado(s, uso, "cotro0000000000000000000c", MESA.aliados).ok, false);
    assert.equal(gastarUsoLimitado(s, uso, null, MESA.aliados).ok, false);
    assert.equal(gastarUsoLimitado(gastar(s, ID, KIRA.id), uso, KIRA.id, MESA.aliados).ok, false);
  });

  test("sin aliados en la mesa, bloqueada", () => {
    assert.equal(tirada(s, ID, { aliados: [], turno: null }).bloqueada, "No hay aliados en la mesa.");
  });

  test("el selector no cambia la tirada", () => {
    const t = tirada(s, ID);
    const sin = tirada(s, ID, null);
    assert.equal(t.aplicado, sin.aplicado);
    assert.equal(t.habilidad, sin.habilidad);
  });
});

describe("N por turno, solo en combate (Mirada desafiante)", () => {
  const ID = "dotes_mirada_desafiante";
  const s = ficha([{ id: "dote_mirada_desafiante" }]);
  const enRonda = (ronda: number): MesaDeFicha => ({ ...MESA, turno: claveDeTurno({ id: "cmbte00000000000000000001", ronda }) });

  test("fuera de combate no se cuenta", () => {
    assert.equal(tirada(s, ID).usoLimitado, undefined);
  });

  test("en combate: agotada este turno; en la ronda siguiente, libre (y la entrada vieja se va)", () => {
    const usada = gastar(s, ID, null, enRonda(1));
    assert.equal(tirada(usada, ID, enRonda(1)).bloqueada, "Usada este turno (1/1).");
    assert.equal(tirada(usada, ID, enRonda(2)).bloqueada, undefined);
    const otra = gastar(usada, ID, null, enRonda(2));
    assert.equal(otra.usosEscena.length, 1);
  });
});

describe("contadores en sheet.usosEscena", () => {
  test("lectura tolerante: contadores del catálogo sí, inventados no", () => {
    assert.deepEqual(normalizarUsosEscena(["dotes_apoyo@ckira#1", "dotes_inventada#1", "dotes_apoyo#0", "aumentos_enjambre_sanar_grave#3"]), [
      "dotes_apoyo@ckira#1",
      "aumentos_enjambre_sanar_grave#3",
    ]);
  });

  test("gastarUsosEscena (casillas por escena) no admite contadores", () => {
    const s = defaultSheet();
    assert.equal(gastarUsosEscena(s, ["dotes_humor_de_afrontamiento#1"]), s);
  });

  test("conContador: a 0 quita la entrada; una clave que no es del catálogo no hace nada", () => {
    const s = conContador(defaultSheet(), "aumentos_enjambre_sanar_grave", 2);
    assert.deepEqual(s.usosEscena, ["aumentos_enjambre_sanar_grave#2"]);
    assert.deepEqual(conContador(s, "aumentos_enjambre_sanar_grave", 0).usosEscena, []);
    assert.equal(conContador(s, "inventada", 1), s);
  });
});
