// Dotes de la foto de Drive del 2026-11-14 que cuelgan de las habilidades nuevas (E6 del plan de
// sync): Ocultación, Mimetismo, Juego de Manos (Sigilo) y Exoarmadura (Pilotaje). Todo a través
// del motor: la ficha resuelta y la tirada montada.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { ACCIONES, usarHabilidadAlternativa, type Accion } from "./acciones";
import { equipar } from "./equipo";
import { conEsquivaEnVuelo } from "./movimiento";
import { fijarEleccionDeNivel } from "./eleccionNivel";
import { resolverGolpe } from "./resistirDanio";
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
      HABILIDADES.map((h) => [h.id, { valor: 4, especialidades: [...new Set(esp[h.id] ?? [])] }]),
    ) as Sheet["habilidades"],
    dotes,
  };
}

const resolver = (s: Sheet) => resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA });
const fija = (f: FichaResuelta, id: string) => conExtrasDeFicha(f, ACCIONES.find((a) => a.id === id)!);
type Toggle = Extract<NonNullable<Accion["condiciones"]>[number], { tipo: "toggle" }>;
type Opcion = Extract<NonNullable<Accion["condiciones"]>[number], { tipo: "opcion" }>;
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

  // Solo anula el penalizador del terreno, hasta 3: nunca deja bono positivo (usuario, 2026-11-14).
  test("selector del penalizador por terreno difícil o ruidoso en Ocultarse: lo anula hasta 3", () => {
    const c = (t.condiciones ?? []).find((x): x is Opcion => x.tipo === "opcion" && x.id.startsWith("dote_paso_de_fantasma"))!;
    assert.match(c.etiqueta, /Terreno difícil o ruidoso: anula hasta 3/);
    assert.deepEqual(
      c.opciones.map((o) => [o.id, o.valor]),
      [["ninguna", 0], ["uno", 1], ["dos", 2], ["tres", 3]],
    );
    const con = (opcion: string) => {
      const e = eleccionSinTocar(t);
      return montarTirada(f, t, { ...e, estadoCondiciones: { ...e.estadoCondiciones, [c.id]: opcion } }).total;
    };
    assert.equal(con("ninguna"), total(f, t));
    assert.equal(con("dos") - con("ninguna"), 2);
    assert.equal(con("tres") - con("ninguna"), 3);
    assert.deepEqual(casillasDe(t, "dote_paso_de_fantasma"), []);
  });

  test("el −3 a la alerta sísmica o auditiva de quien te busca, como aviso en Ocultarse", () => {
    assert.match(lineaAntes(t), /medios sísmicos, de vibración o auditivos pasivos sufre −3 en su tirada de alerta/);
  });

  test("sin Ocultación 2 no hace nada", () => {
    const s = ficha([{ id: "dote_paso_de_fantasma" }]);
    const sin = resolver({ ...s, habilidades: { ...s.habilidades, sigilo: { valor: 4, especialidades: ["mimetismo"] } } });
    assert.equal(fija(sin, "sigilo").condiciones?.some((c) => c.id.startsWith("dote_paso_de_fantasma")), false);
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

// Solo anulan la dificultad de maniobra de la esquiva en vuelo, sin dejar bono positivo (usuario,
// 2026-11-14): van con la casilla «En vuelo» de la esquiva y se topan en la maniobrabilidad.
function conPropulsion(dotes: DoteComprada[], nivel: number, eleccion?: string): Sheet {
  const s = equipar(equipar(ficha(dotes), { instanciaId: "a1", catalogoId: "armadura_pesada" }), {
    instanciaId: "m1",
    catalogoId: "movilidad_aerea",
    nivel,
    instaladoEnId: "a1",
  });
  if (eleccion === undefined) return s;
  const r = fijarEleccionDeNivel(s, "m1", eleccion);
  assert.ok(r.ok);
  return r.sheet;
}
const esquivaEnVuelo = (s: Sheet) => {
  const f = resolver(s);
  return { f, t: usarHabilidadAlternativa(conEsquivaEnVuelo(s, fija(f, "defensa"), f.compensaManiobraVuelo))! };
};
const sinCompensar = (s: Sheet) => {
  const f = resolver(s);
  return { f, t: usarHabilidadAlternativa(conEsquivaEnVuelo(s, fija(f, "defensa")))! };
};

describe("Piloto de Exoarmadura", () => {
  const piloto = { id: "dote_piloto_de_exoarmadura" };

  test("en vuelo con Propulsión Aérea 1 (−3): anula 2 y la maniobra queda en −1", () => {
    const { f, t } = esquivaEnVuelo(conPropulsion([piloto], 1));
    assert.deepEqual(t.ajustesFijos?.map((a) => [a.valor, a.fuente]), [
      [-3, "Maniobrabilidad (Propulsión Aérea)"],
      [2, "Piloto de Exoarmadura"],
    ]);
    const base = sinCompensar(conPropulsion([], 1));
    assert.equal(montarTirada(f, t, eleccionSinTocar(t)).total - montarTirada(base.f, base.t, eleccionSinTocar(base.t)).total, 2);
  });

  test("sin vuelo no hay nada que anular: ni casilla ni bono en la esquiva en tierra", () => {
    const f = resolver(ficha([piloto]));
    const t = fija(f, "defensa");
    assert.deepEqual(casillasDe(t, "dote_piloto_de_exoarmadura"), []);
    assert.equal(total(f, t), total(resolver(ficha([])), fija(resolver(ficha([])), "defensa")));
    assert.equal(conEsquivaEnVuelo(ficha([piloto]), t, f.compensaManiobraVuelo), t);
  });

  test("sin Exoarmadura, nada", () => {
    const s = conPropulsion([piloto], 1);
    const sin = { ...s, habilidades: { ...s.habilidades, pilotaje: { valor: 4, especialidades: ["aereo" as const] } } };
    assert.equal(resolver(sin).compensaManiobraVuelo, null);
  });
});

describe("As de Exoarmadura", () => {
  const piloto = { id: "dote_piloto_de_exoarmadura" };
  const as = { id: "dote_as_de_exoarmadura" };

  test("con Piloto, vale la mejor: anula 3 de los −3 y la maniobra queda en 0", () => {
    const { t } = esquivaEnVuelo(conPropulsion([piloto, as], 1));
    assert.deepEqual(t.ajustesFijos?.map((a) => a.valor), [-3, 3]);
    assert.match(t.label, /Exoarmadura/);
  });

  test("tope: con la Progresión de Maniobrabilidad (−2) solo anula 2, sin bono positivo", () => {
    const { t } = esquivaEnVuelo(conPropulsion([piloto, as], 3, "maniobrabilidad"));
    assert.deepEqual(t.ajustesFijos?.map((a) => [a.valor, a.fuente]), [
      [-2, "Maniobrabilidad (Propulsión Aérea)"],
      [2, "As de Exoarmadura"],
    ]);
    const s = conPropulsion([piloto, as], 3, "maniobrabilidad");
    const f = resolver(s);
    assert.equal(conEsquivaEnVuelo(s, fija(f, "defensa"), f.compensaManiobraVuelo).habilidadAlternativa?.etiqueta, "En vuelo: Exoarmadura, 0");
  });

  test("pide Piloto de Exoarmadura: sin ella, no hace nada", () => {
    assert.equal(resolver(conPropulsion([as], 1)).compensaManiobraVuelo, null);
  });

  test("el −1 a los ataques en vuelo no se aplica en la app: la anulación va en la tarjeta", () => {
    const dote = DOTES.find((d) => d.id === "dote_as_de_exoarmadura")!;
    assert.ok(dote.efectos.some((e) => e.tipo === "texto" && e.lugar === "ficha" && /no sufres el −1 a los ataques/.test(e.texto)));
  });
});

describe("Salto Servoasistido", () => {
  const f = resolver(ficha([{ id: "dote_salto_servoasistido" }]));

  // S10 ya lo cuenta doble en el salto: la dote no lo vuelve a duplicar (usuario, 2026-11-14).
  test("aviso en Saltar: el bono de Fuerza del exoesqueleto, doble, ya en tu movimiento", () => {
    assert.match(lineaAntes(fija(f, "atletismo")), /exoesqueleto en marcha, su bono de Fuerza cuenta doble.*no se vuelve a duplicar/);
  });

  test("y en Resistir daño: 2 m menos de caída con el exoesqueleto", () => {
    const g = resolverGolpe(f, {
      tipo: "cinetico",
      critico: false,
      danio: 0,
      reactivo: false,
      conBrazo: false,
      marcadas: [],
      rompeBlindaje: 0,
      categoria: null,
    });
    assert.ok(g.notas.some((n) => /la altura efectiva se reduce en 2 m.*\(Salto Servoasistido\)/.test(n)));
  });
});
