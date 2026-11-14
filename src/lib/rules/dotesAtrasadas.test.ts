// Dotes atrasadas (plan de sync del 2026-11-14, «Después del sync»): estaban en Drive desde fotos
// anteriores y no se habían transcrito. Todo a través del motor: la ficha resuelta, las filas de
// arma y la tirada montada.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { HABILIDADES } from "./habilidades";
import { resolverFicha, conExtrasDeFicha, VITALIDAD_DE_FICHA, type FichaResuelta } from "./fichaResuelta";
import { accionesDeAtaque } from "./combate";
import { equipar } from "./equipo";
import { lineaAntes } from "./textosDeTirada";
import type { Accion } from "./acciones";
import { DOTES } from "../catalog/dotes";
import type { EspecialidadId } from "../catalog/especialidades";
import type { DoteComprada } from "./dotesCompradas";

// Atributos a 4 y habilidades a 5, con las especialidades que piden los requisitos de dote.
function ficha(dotes: DoteComprada[]): Sheet {
  const base = defaultSheet();
  const esp: Record<string, EspecialidadId[]> = {};
  for (const d of DOTES)
    for (const r of d.requisitos.flatMap((x) => (x.tipo === "uno_de" ? x.opciones : [x])))
      if (r.tipo === "especialidad") (esp[r.habilidad] ??= []).push(r.id);
  return {
    ...base,
    atributos: Object.fromEntries(Object.keys(base.atributos).map((k) => [k, 4])) as Sheet["atributos"],
    habilidades: Object.fromEntries(
      HABILIDADES.map((h) => [h.id, { valor: 5, especialidades: [...new Set(esp[h.id] ?? [])] }]),
    ) as Sheet["habilidades"],
    dotes,
  };
}
const resolver = (s: Sheet) => resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA });
const armado = (s: Sheet, ...ids: string[]) => ids.reduce((x, id, i) => equipar(x, { instanciaId: `a${i}`, catalogoId: id }), s);
const filas = (f: FichaResuelta) => accionesDeAtaque(f.ficha, f.modificadores, f.extrasDotes.permisos).map((t) => conExtrasDeFicha(f, t));
const fila = (f: FichaResuelta, prefijo: string): Accion => filas(f).find((t) => t.id.startsWith(prefijo))!;

describe("Disparo Relámpago", () => {
  test("aviso en los disparos: atacar como reacción a quien se mueve, si el ataque es de acción simple", () => {
    const f = resolver(armado(ficha([{ id: "dote_disparo_relampago" }]), "pistola_mosquito", "espada"));
    assert.match(lineaAntes(fila(f, "ataque_fuego_")), /Como reacción, puedes disparar a un enemigo a tu alcance que haga una acción de movimiento/);
    assert.doesNotMatch(lineaAntes(fila(f, "ataque_melee_")), /Como reacción, puedes disparar/);
  });

  test("pide Combate a Distancia 2 y Reflejos 2", () => {
    const d = DOTES.find((x) => x.id === "dote_disparo_relampago")!;
    assert.deepEqual([d.coste, d.grupo, d.requisitos], [4, "combate_distancia", [
      { tipo: "habilidad", id: "combate_distancia", min: 2 },
      { tipo: "aplicado", id: "reflejos", min: 2 },
    ]]);
  });
});
