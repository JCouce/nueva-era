// Dotes de la foto de Drive del 2026-11-14 que cuelgan de las habilidades nuevas (E6 del plan de
// sync): Ocultación, Mimetismo, Juego de Manos (Sigilo) y Exoarmadura (Pilotaje). Todo a través
// del motor: la ficha resuelta y la tirada montada.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { ACCIONES, type Accion } from "./acciones";
import { HABILIDADES } from "./habilidades";
import { resolverFicha, conExtrasDeFicha, VITALIDAD_DE_FICHA, type FichaResuelta } from "./fichaResuelta";
import { montarTirada, eleccionSinTocar } from "./montaje";
import { lineaAntes } from "./textosDeTirada";
import { DOTES } from "../catalog/dotes";
import type { EspecialidadId } from "../catalog/especialidades";
import type { DoteComprada } from "./dotesCompradas";

// Atributos a 4 y habilidades a 4, con las especialidades que piden los requisitos de dote.
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
      HABILIDADES.map((h) => [h.id, { valor: 4, especialidades: [...new Set(esp[h.id] ?? [])].slice(0, 3) }]),
    ) as Sheet["habilidades"],
    dotes,
  };
}

const resolver = (s: Sheet) => resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA });
const fija = (f: FichaResuelta, id: string) => conExtrasDeFicha(f, ACCIONES.find((a) => a.id === id)!);
type Toggle = Extract<NonNullable<Accion["condiciones"]>[number], { tipo: "toggle" }>;
const casillasDe = (t: Accion, dote: string): Toggle[] =>
  (t.condiciones ?? []).filter((c): c is Toggle => c.tipo === "toggle" && c.id.startsWith(dote));
const total = (f: FichaResuelta, t: Accion, marcadas: string[] = []) => {
  const e = eleccionSinTocar(t);
  return montarTirada(f, t, { ...e, estadoCondiciones: { ...e.estadoCondiciones, ...Object.fromEntries(marcadas.map((id) => [id, true])) } })
    .total;
};

describe("Paso de Fantasma", () => {
  const f = resolver(ficha([{ id: "dote_paso_de_fantasma" }]));
  const t = fija(f, "sigilo");

  test("casilla de terreno difícil o ruidoso en Ocultarse: +3 marcada, nada sin marcar", () => {
    const [c] = casillasDe(t, "dote_paso_de_fantasma");
    assert.match(c.etiqueta, /terreno difícil o ruidoso/);
    assert.equal(total(f, t, [c.id]) - total(f, t), 3);
  });

  test("el −3 a la alerta sísmica o auditiva de quien te busca, como aviso en Ocultarse", () => {
    assert.match(lineaAntes(t), /medios sísmicos, de vibración o auditivos pasivos sufre −3 en su tirada de alerta/);
  });

  test("sin Ocultación 2 no hace nada", () => {
    const s = ficha([{ id: "dote_paso_de_fantasma" }]);
    const sin = resolver({ ...s, habilidades: { ...s.habilidades, sigilo: { valor: 4, especialidades: ["mimetismo"] } } });
    assert.deepEqual(casillasDe(fija(sin, "sigilo"), "dote_paso_de_fantasma"), []);
  });
});
