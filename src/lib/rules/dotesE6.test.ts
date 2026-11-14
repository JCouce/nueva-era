// Dotes de la foto de Drive del 2026-11-14 que cuelgan de las habilidades nuevas (E6 del plan de
// sync): Ocultación, Mimetismo, Juego de Manos (Sigilo) y Exoarmadura (Pilotaje). Todo a través
// del motor: la ficha resuelta y la tirada montada.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { ACCIONES, usarHabilidadAlternativa, type Accion } from "./acciones";
import { equipar } from "./equipo";
import { conEsquivaEnVuelo } from "./movimiento";
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

describe("Fundido Evasivo", () => {
  const f = resolver(ficha([{ id: "dote_fundido_evasivo" }]));
  const t = fija(f, "defensa");

  test("casilla en la esquiva: +1 contra un ataque a distancia en penumbra, cobertura o camuflaje", () => {
    const [c] = casillasDe(t, "dote_fundido_evasivo");
    assert.match(c.etiqueta, /penumbra, cobertura parcial o camuflaje.*una vez por turno/);
    assert.equal(total(f, t, [c.id]) - total(f, t), 1);
  });

  test("el nivel de cobertura de más, como aviso; una vez por turno, en la dote", () => {
    assert.match(lineaAntes(t), /cobertura efectiva contra ese ataque sube 1 nivel/);
    assert.deepEqual(DOTES.find((d) => d.id === "dote_fundido_evasivo")!.limite, { veces: 1, por: "turno" });
  });
});

describe("Perfil Bajo", () => {
  test("aviso en Pasar desapercibido: quien te vio tira contra 6 + tu Mimetismo para recordarte", () => {
    const t = fija(resolver(ficha([{ id: "dote_perfil_bajo" }])), "mimetismo");
    assert.match(lineaAntes(t), /Perspicacia \+ Exploración contra dificultad 6 \+ tu Mimetismo/);
  });

  test("sin la dote, no", () => {
    assert.doesNotMatch(lineaAntes(fija(resolver(ficha([])), "mimetismo")), /dificultad 6 \+ tu Mimetismo/);
  });
});

describe("Sustracción Rápida", () => {
  test("aviso en Juego de manos: hurtar o dejar algo moviéndote, en la misma acción de movimiento", () => {
    const t = fija(resolver(ficha([{ id: "dote_sustraccion_rapida" }])), "hurto");
    assert.match(lineaAntes(t), /mientras te mueves, como parte de la misma acción de movimiento/);
  });
});

describe("Finta de Manos", () => {
  const deDote = (f: FichaResuelta, id: string) => f.accionesDotes.tiradas.find((t) => t.id === id);

  test("acción de dote: simple o reacción, Reflejos + Sigilo en Juego de Manos, enfrentada", () => {
    const f = resolver(ficha([{ id: "dote_finta_de_manos" }]));
    const t = deDote(f, "dotes_finta_de_manos")!;
    assert.deepEqual([t.grupo, t.aplicado, t.habilidad, t.especialidadesAccion], ["Dotes", "reflejos", "sigilo", ["juego_de_manos"]]);
    assert.match(t.nota ?? "", /arma sutil/);
    assert.match(t.nota ?? "", /se puede repetir contra el mismo objetivo sin penalizador/);
    // Atributos a 4 (Reflejos 4) + Sigilo 4 entera, en especialidad.
    assert.equal(total(f, t), 8);
  });

  test("solo tu tirada: lo que tira el enemigo y lo que pasa por grado, como texto", () => {
    const t = deDote(resolver(ficha([{ id: "dote_finta_de_manos" }])), "dotes_finta_de_manos")!;
    assert.match(t.poder!.resultados.exito!, /estará sorprendido/);
    assert.match(t.poder!.resultados.critico!, /desprevenido/);
    assert.match(t.poder!.objetivoTira[0].que, /Perspicacia \+ Exploración/);
  });

  test("sin Juego de Manos no sale", () => {
    const s = ficha([{ id: "dote_finta_de_manos" }]);
    const sin = { ...s, habilidades: { ...s.habilidades, sigilo: { valor: 4, especialidades: ["ocultacion" as const] } } };
    assert.equal(deDote(resolver(sin), "dotes_finta_de_manos"), undefined);
  });
});

describe("Piloto de Exoarmadura", () => {
  test("casilla en la esquiva: +2 esquivando en vuelo con la propulsión (compensa la dificultad de maniobra)", () => {
    const f = resolver(ficha([{ id: "dote_piloto_de_exoarmadura" }]));
    const t = fija(f, "defensa");
    const [c] = casillasDe(t, "dote_piloto_de_exoarmadura");
    assert.match(c.etiqueta, /Esquivando en vuelo con la propulsión aérea/);
    assert.equal(total(f, t, [c.id]) - total(f, t), 2);
  });

  test("en vuelo con Propulsión Aérea 1 (−3): la casilla sale también ahí y deja la maniobra en −1", () => {
    let s = ficha([{ id: "dote_piloto_de_exoarmadura" }]);
    s = equipar(equipar(s, { instanciaId: "a1", catalogoId: "armadura_pesada" }), { instanciaId: "m1", catalogoId: "movilidad_aerea", nivel: 1, instaladoEnId: "a1" });
    const f = resolver(s);
    const enVuelo = usarHabilidadAlternativa(conEsquivaEnVuelo(s, fija(f, "defensa")))!;
    const [c] = casillasDe(enVuelo, "dote_piloto_de_exoarmadura");
    // La maniobrabilidad (−3) sigue en la esquiva en vuelo; la casilla le quita 2.
    assert.deepEqual(enVuelo.ajustesFijos, [{ valor: -3, fuente: "Maniobrabilidad (Propulsión Aérea)" }]);
    assert.equal(total(f, enVuelo, [c.id]) - total(f, enVuelo), 2);
  });

  test("sin Exoarmadura, nada", () => {
    const s = ficha([{ id: "dote_piloto_de_exoarmadura" }]);
    const sin = resolver({ ...s, habilidades: { ...s.habilidades, pilotaje: { valor: 4, especialidades: ["aereo"] } } });
    assert.deepEqual(casillasDe(fija(sin, "defensa"), "dote_piloto_de_exoarmadura"), []);
  });
});
