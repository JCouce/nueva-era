// Tanda D2d de dotes (docs/sistema.md §9.3): las casillas que hacen algo más que sumar.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { ACCIONES, categoriaConAjuste, resolverDanio, tirarDado, type Accion } from "./acciones";
import { HABILIDADES } from "./habilidades";
import { resolverFicha, conExtrasDeFicha, VITALIDAD_DE_FICHA, type FichaResuelta } from "./fichaResuelta";
import { montarTirada, eleccionSinTocar, tirarMontada, type TiradaMontada } from "./montaje";
import { accionesDeAtaque } from "./combate";
import { equipar } from "./equipo";
import type { CondicionTirada } from "./condiciones";
import { DOTES } from "../catalog/dotes";
import type { EspecialidadId } from "../catalog/especialidades";
import type { DoteComprada } from "./dotesCompradas";

// Atributos a 4 y habilidades a 5 (Fuerza e Interpretación aparte); con todas las
// especialidades que piden los requisitos de dote.
function ficha(dotes: DoteComprada[], { fuerza = 4, interpretacion = 5 } = {}): Sheet {
  const base = defaultSheet();
  const esp: Record<string, EspecialidadId[]> = {};
  for (const d of DOTES)
    for (const r of d.requisitos.flatMap((x) => (x.tipo === "uno_de" ? x.opciones : [x])))
      if (r.tipo === "especialidad") (esp[r.habilidad] ??= []).push(r.id);
  const atributos = Object.fromEntries(Object.keys(base.atributos).map((k) => [k, 4])) as Sheet["atributos"];
  return {
    ...base,
    atributos: { ...atributos, fuerza },
    habilidades: Object.fromEntries(
      HABILIDADES.map((h) => [
        h.id,
        { valor: h.id === "interpretacion" ? interpretacion : 5, especialidades: [...new Set(esp[h.id] ?? [])] },
      ]),
    ) as Sheet["habilidades"],
    dotes,
  };
}

const resolver = (s: Sheet, libre = false) => resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA, libre });
const fija = (f: FichaResuelta, id: string) => conExtrasDeFicha(f, ACCIONES.find((a) => a.id === id)!);
const armado = (s: Sheet, ...ids: string[]) => ids.reduce((x, id, i) => equipar(x, { instanciaId: `a${i}`, catalogoId: id }), s);
const golpes = (f: FichaResuelta) =>
  accionesDeAtaque(f.ficha, f.modificadores, f.extrasDotes.permisos)
    .map((t) => conExtrasDeFicha(f, t))
    .filter((t) => t.familiaArma === "ataque_melee");
const golpe = (f: FichaResuelta, label: string) => golpes(f).find((t) => t.label === `Golpear con ${label}`)!;

type Toggle = Extract<CondicionTirada, { tipo: "toggle" }>;
const casilla = (t: Accion, pred: (c: Toggle) => boolean): Toggle | undefined =>
  (t.condiciones ?? []).find((c): c is Toggle => c.tipo === "toggle" && pred(c));
const montar = (f: FichaResuelta, t: Accion, marcadas: string[] = []): TiradaMontada => {
  const e = eleccionSinTocar(t);
  return montarTirada(f, t, { ...e, estadoCondiciones: { ...e.estadoCondiciones, ...Object.fromEntries(marcadas.map((id) => [id, true])) } });
};
// La dificultad que deja el total a `margen` del dado 6.
const tirarCon = (m: TiradaMontada, margen: number) => tirarMontada(m, 6, 6 + m.total - margen);

describe("D2d: recuento", () => {
  test("ningún efecto pendiente de D2d", () => {
    const pendientes = DOTES.flatMap((d) => d.motor.filter((m) => m.estado === "pendiente" && m.bloqueoPor === "D2d").map(() => d.id));
    assert.deepEqual(pendientes, []);
  });
});

describe("D2d: ventaja con casilla", () => {
  test("Ojo Clínico: sin marcar un dado; marcada, dos y vale el mejor, y cuesta 1 de fatiga", () => {
    const f = resolver(ficha([{ id: "dote_ojo_clinico" }]));
    const t = fija(f, "medicina");
    const c = casilla(t, (x) => x.ventaja === true)!;
    assert.match(c.etiqueta, /Prueba de diagnóstico \(Ojo Clínico\)/);
    const sin = montar(f, t);
    const con = montar(f, t, [c.id]);
    assert.equal(sin.ventaja, null);
    assert.equal(sin.costeFatiga, 0);
    assert.equal(con.ventaja, c.etiqueta);
    assert.equal(con.costeFatiga, 1);
    assert.equal(con.modificador, sin.modificador);
    const caras = [3, 9];
    const dado = () => caras.shift()!;
    assert.deepEqual(tirarDado(Boolean(sin.ventaja), () => 4), { dado: 4 });
    assert.deepEqual(tirarDado(Boolean(con.ventaja), dado), { dado: 9, dados: [3, 9] });
  });

  test("Bioma Predilecto: ventaja en Iniciativa y en Subsistencia (Buscar / percibir)", () => {
    const f = resolver(ficha([{ id: "dote_bioma_predilecto", eleccion: "Selva densa" }]));
    for (const id of ["iniciativa", "iniciativa_arma", "iniciativa_distraccion"])
      assert.ok(casilla(fija(f, id), (c) => c.ventaja === true && /bioma predilecto/.test(c.etiqueta)), id);
    const buscar = casilla(fija(f, "alerta_activa"), (c) => c.ventaja === true)!;
    assert.match(buscar.etiqueta, /^Subsistencia: Dentro de tu bioma predilecto/);
  });

  test("Violencia Aterradora: casilla de ventaja en su acción, sin la nota de «a mano»", () => {
    const f = resolver(ficha([{ id: "dote_mirada_desafiante" }, { id: "dote_violencia_aterradora" }]));
    const t = f.accionesDotes.tiradas.find((x) => x.id === "dotes_violencia_aterradora")!;
    const c = casilla(t, (x) => x.ventaja === true)!;
    assert.match(c.etiqueta, /crítico/);
    assert.doesNotMatch(t.nota ?? "", /aplícala a mano/);
    assert.ok(montar(f, t, [c.id]).ventaja);
  });
});

describe("D2d: bono según la ficha (umbral)", () => {
  const presencia = (fuerza: number, libre = false) => {
    const f = resolver(ficha([{ id: "dote_presencia_imponente" }], { fuerza }), libre);
    return (fija(f, "social").condiciones ?? []).filter((c): c is Toggle => c.tipo === "toggle" && c.id.startsWith("dote_presencia_imponente"));
  };

  test("Presencia Imponente: Fuerza 4 → +1, Fuerza 5 → +2; una sola casilla", () => {
    const cuatro = presencia(4);
    const cinco = presencia(5);
    assert.equal(cuatro.length, 1);
    assert.equal(cinco.length, 1);
    assert.equal(cuatro[0].valorActivo, 1);
    assert.equal(cinco[0].valorActivo, 2);
    assert.doesNotMatch(cuatro[0].etiqueta, /Fuerza ≥ 5/);
    assert.match(cinco[0].etiqueta, /Fuerza ≥ 5/);
  });

  test("NPC (modo libre): también mira su Fuerza", () => {
    assert.equal(presencia(5, true)[0].valorActivo, 2);
    assert.equal(presencia(3, true)[0].valorActivo, 1);
  });

  test("Imitación: Interpretación 2 → +2, 3 → +3 en Convencer / mentir", () => {
    const valor = (interpretacion: number) => {
      const f = resolver(ficha([{ id: "dote_imitacion" }], { interpretacion }));
      const cs = (fija(f, "social").condiciones ?? []).filter((c): c is Toggle => c.tipo === "toggle" && c.id.startsWith("dote_imitacion"));
      assert.equal(cs.length, 1);
      return cs[0].valorActivo;
    };
    assert.equal(valor(2), 2);
    assert.equal(valor(3), 3);
  });
});

describe("D2d: fracaso → éxito con casilla", () => {
  const f = resolver(ficha([{ id: "dote_balanceo" }]));
  const t = fija(f, "atletismo");
  const c = casilla(t, (x) => x.subeGrado === true)!;

  test("Balanceo: sin marcar el fracaso se queda; marcada cuenta como éxito, con su línea", () => {
    assert.match(c.etiqueta, /superficie inestable o resbaladiza \(Balanceo\)/);
    const sin = tirarCon(montar(f, t), -2);
    assert.equal(sin.exito, false);
    assert.equal(sin.cambioGrado, undefined);
    const con = tirarCon(montar(f, t, [c.id]), -2);
    assert.equal(con.exito, true);
    assert.equal(con.critico, false);
    assert.equal(con.margen, 0);
    assert.deepEqual(con.cambioGrado, { fuente: c.etiqueta, margenOriginal: -2 });
  });

  test("el fracaso crítico no cambia; el éxito tampoco", () => {
    const critico = tirarCon(montar(f, t, [c.id]), -6);
    assert.equal(critico.exito, false);
    assert.equal(critico.critico, true);
    const exito = tirarCon(montar(f, t, [c.id]), 2);
    assert.equal(exito.margen, 2);
    assert.equal(exito.cambioGrado, undefined);
  });

  test("Como Pez en el Agua: su casilla en Atletismo", () => {
    const g = resolver(ficha([{ id: "dote_como_pez_en_el_agua" }]));
    assert.match(casilla(fija(g, "atletismo"), (x) => x.subeGrado === true)?.etiqueta ?? "", /aguas turbulentas/);
  });
});

describe("D2d: crítico más fácil con casilla", () => {
  test("Equilibrista: marcada, cualquier éxito es crítico", () => {
    const f = resolver(ficha([{ id: "dote_equilibrista" }]));
    const t = fija(f, "atletismo");
    const c = casilla(t, (x) => x.margenCriticoExito !== undefined)!;
    assert.equal(c.margenCriticoExito, 0);
    assert.equal(montar(f, t).margenes.criticoExito, 6);
    const m = montar(f, t, [c.id]);
    assert.equal(m.margenes.criticoExito, 0);
    assert.equal(tirarCon(m, 0).critico, true);
  });

  test("Especialidad Médica: la casilla de cada pareja lleva el +1 y el crítico con 5", () => {
    const f = resolver(
      ficha([
        { id: "dote_especialidad_medica", eleccion: "ceguera_sordera" },
        { id: "dote_especialidad_medica", eleccion: "hemorragia_herida" },
      ]),
    );
    const t = fija(f, "medicina");
    const cs = (t.condiciones ?? []).filter((c): c is Toggle => c.tipo === "toggle" && c.id.startsWith("dote_especialidad_medica"));
    assert.equal(cs.length, 2);
    for (const c of cs) {
      assert.equal(c.valorActivo, 1);
      assert.equal(c.margenCriticoExito, 5);
    }
    const m = montar(f, t, [cs[0].id]);
    assert.equal(tirarCon(m, 5).critico, true);
    assert.equal(tirarCon(montar(f, t), 5).critico, false);
  });
});

describe("D2d: Salto Evasivo, bono normal", () => {
  const salto = (dotes: DoteComprada[]) =>
    (fija(resolver(ficha(dotes)), "defensa").condiciones ?? []).filter(
      (c): c is Toggle => c.tipo === "toggle" && /Esquivando un área/.test(c.etiqueta),
    );

  test("básica +1, Mejorado +2; con las dos vale la mejor", () => {
    assert.deepEqual(salto([{ id: "dote_salto_evasivo" }]).map((c) => c.valorActivo), [1]);
    assert.deepEqual(salto([{ id: "dote_salto_evasivo_mejorado" }]).map((c) => c.valorActivo), [2]);
    assert.deepEqual(salto([{ id: "dote_salto_evasivo" }, { id: "dote_salto_evasivo_mejorado" }]).map((c) => c.valorActivo), [2]);
  });
});

describe("D2d: casillas que tocan el daño", () => {
  test("Golpe Mejorado con Escudo: «Golpe letal» solo en el golpe con escudo; el daño pasa a letal", () => {
    const f = resolver(armado(ficha([{ id: "dote_golpe_mejorado_con_escudo" }]), "escudo_estandar", "espada"));
    const conEscudo = golpe(f, "Escudo");
    const c = casilla(conEscudo, (x) => x.danio?.categoria !== undefined)!;
    assert.match(c.etiqueta, /^Golpe letal \(Golpe Mejorado con Escudo\)/);
    assert.equal(casilla(golpe(f, "Espada"), (x) => x.danio?.categoria !== undefined), undefined);
    const m = montar(f, conEscudo, [c.id]);
    assert.equal(m.danio.categoria?.a, "Letal");
    assert.equal(categoriaConAjuste("No Letal", m.danio), "Letal");
    const d = resolverDanio(6, 4, "No Letal", m.danio);
    assert.equal(d.categoria, "Letal");
    assert.equal(d.total, 8);
    assert.equal(categoriaConAjuste("No Letal", montar(f, conEscudo).danio), "No Letal");
  });

  test("Golpe Fatigante: −1 al daño (mínimo 0) solo con contundentes o a dos manos", () => {
    const f = resolver(
      armado(ficha([{ id: "dote_golpe_fatigante" }]), "corta_maza_armas", "asta_martillo_enastado", "espada_montante", "espada", "corta_hacha_armas", "pelea_punetazo"),
    );
    const tiene = (label: string) => casilla(golpe(f, label), (x) => x.danio?.ajuste !== undefined);
    assert.ok(tiene("Maza de Armas"), "maza (contundente, una mano)");
    assert.ok(tiene("Martillo Enastado"), "martillo (dos manos)");
    assert.ok(tiene("Montante"), "montante (dos manos, de filo)");
    assert.ok(tiene("Puñetazo"), "puñetazo (contundente)");
    assert.equal(tiene("Espada"), undefined);
    assert.equal(tiene("Hacha de Armas"), undefined);
    // Su texto tampoco sale con la espada.
    assert.doesNotMatch(golpe(f, "Espada").nota ?? "", /Golpe Fatigante/);
    const t = golpe(f, "Maza de Armas");
    const m = montar(f, t, [tiene("Maza de Armas")!.id]);
    assert.equal(m.modificador, montar(f, t).modificador);
    assert.equal(resolverDanio(6, 4, "Letal", m.danio).total, 7);
    assert.equal(resolverDanio(0, 0, "Letal", m.danio).total, 0);
  });

  describe("Derribo (maniobra de habilidades.md)", () => {
    const derribo = (dotes: DoteComprada[]) => {
      const f = resolver(armado(ficha(dotes), "espada"));
      const t = golpe(f, "Espada");
      return { f, t, c: casilla(t, (x) => x.id === "maniobra_derribo") };
    };

    test("sin dote de derribo no hay casilla", () => {
      assert.equal(derribo([]).c, undefined);
      assert.equal(derribo([{ id: "dote_arrollar" }]).c, undefined);
    });

    test("con Derribo Mejorado: −2 al ataque y daño básico, sin bono por éxitos", () => {
      const { f, t, c } = derribo([{ id: "dote_derribo_mejorado" }]);
      assert.ok(c);
      assert.equal(c.valorActivo, -2);
      assert.match(c.nota ?? "", /Potencia \+ Atletismo o Combate Melee/);
      const m = montar(f, t, [c.id]);
      assert.equal(m.modificador - montar(f, t).modificador, -2);
      const d = resolverDanio(7, 6, "Letal", m.danio);
      assert.equal(d.bonoExitos, 0);
      assert.equal(d.total, 7);
      assert.equal(d.sinBonoExitos, c.etiqueta);
    });

    test("con Derribo Brutal: sin −2, y «Derribo con acción estándar» devuelve el daño con éxitos", () => {
      const { f, t, c } = derribo([{ id: "dote_derribo_mejorado" }, { id: "dote_derribo_brutal" }]);
      assert.ok(c);
      assert.equal(c.valorActivo, 0);
      assert.equal((t.condiciones ?? []).filter((x) => x.id === "maniobra_derribo").length, 1);
      const estandar = casilla(t, (x) => x.danio?.conBonoExitos === true)!;
      assert.match(estandar.etiqueta, /Derribo con acción estándar \(Derribo Brutal\)/);
      const soloDerribo = montar(f, t, [c.id]);
      assert.equal(soloDerribo.modificador, montar(f, t).modificador);
      assert.equal(resolverDanio(7, 6, "Letal", soloDerribo.danio).total, 7);
      const conEstandar = montar(f, t, [c.id, estandar.id]);
      assert.equal(resolverDanio(7, 6, "Letal", conEstandar.danio).total, 10);
    });
  });
});

describe("D2d: otro aplicado con casilla (Negociación Analítica)", () => {
  test("Convencer / mentir: marcada, Perspicacia en vez de Expresión", () => {
    const base = ficha([{ id: "dote_negociacion_analitica" }]);
    const f = resolver({ ...base, atributos: { ...base.atributos, inteligencia: 6 } });
    const t = fija(f, "social");
    const c = casilla(t, (x) => x.aplicado === "perspicacia")!;
    assert.match(c.etiqueta, /Perspicacia en lugar de Expresión \(Negociación Analítica\)/);
    const sin = montar(f, t);
    const con = montar(f, t, [c.id]);
    assert.equal(sin.aplicado.id, "expresion");
    assert.equal(con.aplicado.id, "perspicacia");
    assert.equal(con.aplicado.valor, f.aplicados.perspicacia);
    assert.equal(sin.aplicado.valor, f.aplicados.expresion);
    assert.equal(con.desglose[0].etiqueta, "Perspicacia");
  });

  test("sin la dote no hay selector", () => {
    const f = resolver(ficha([]));
    assert.equal(casilla(fija(f, "social"), (x) => x.aplicado !== undefined), undefined);
  });
});
