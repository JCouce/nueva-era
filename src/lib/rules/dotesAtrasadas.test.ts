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
import { ajustarGranada } from "./recursos";
import { lineaAntes } from "./textosDeTirada";
import { motivoDeBloqueo } from "./habilitacion";
import { gastarUsoLimitado, type MesaDeFicha } from "./dotesAcciones";
import { montarTirada, eleccionSinTocar } from "./montaje";
import { efectosSobreObjetivo } from "./efectosArma";
import { resolverDanio, type Accion } from "./acciones";
import { DOTES } from "../catalog/dotes";
import { MUNICION_GRANADA } from "../catalog/municion";
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
type Toggle = Extract<NonNullable<Accion["condiciones"]>[number], { tipo: "toggle" }>;
const total = (f: FichaResuelta, t: Accion, marcadas: string[] = []) => {
  const e = eleccionSinTocar(t);
  return montarTirada(f, t, { ...e, estadoCondiciones: { ...e.estadoCondiciones, ...Object.fromEntries(marcadas.map((id) => [id, true])) } })
    .total;
};
const ACIERTA = { exito: true, critico: false, dificultad: 7, total: 14 };
const FALLA = { exito: false, critico: false, dificultad: 7, total: 5 };

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

describe("Disparo de Interdicción", () => {
  const f = resolver(armado(ficha([{ id: "dote_disparo_de_interdiccion" }]), "pistola_mosquito", "espada"));
  const casilla = (t: Accion) =>
    (t.condiciones ?? []).find((c): c is Toggle => c.tipo === "toggle" && c.id.startsWith("dote_disparo_de_interdiccion"));

  test("casilla −2 en los disparos, no en los golpes", () => {
    const t = fila(f, "ataque_fuego_");
    const c = casilla(t)!;
    assert.match(c.etiqueta, /^Disparo de interdicción/);
    assert.equal(total(f, t, [c.id]) - total(f, t), -2);
    assert.equal(casilla(fila(f, "ataque_melee_")), undefined);
  });

  test("con la casilla y acierto: Entorpecido (grado de acierto) 1d6 turnos, tirados por la app", () => {
    const t = fila(f, "ataque_fuego_");
    const c = casilla(t)!;
    const caras: number[] = [];
    const avisos = efectosSobreObjetivo(t, { [c.id]: true }, ACIERTA, (n) => (caras.push(n), 5));
    assert.deepEqual(caras, [6]);
    assert.equal(avisos.length, 1);
    assert.equal(avisos[0].titulo, "El objetivo sufre Entorpecido durante 5 turnos (1d6)");
    assert.equal(avisos[0].fuente, "Disparo de Interdicción");
    assert.equal(avisos[0].grado?.id, "fallo");
  });

  test("sin la casilla o fallando, nada", () => {
    const t = fila(f, "ataque_fuego_");
    assert.deepEqual(efectosSobreObjetivo(t, {}, ACIERTA, () => 1), []);
    assert.deepEqual(efectosSobreObjetivo(t, { [casilla(t)!.id]: true }, FALLA, () => 1), []);
  });
});

describe("Fuego de Saturación", () => {
  const f = resolver(armado(ficha([{ id: "dote_fuego_de_saturacion" }]), "fusil_asalto_impetus"));
  const t = () => fila(f, "ataque_fuego_");
  const casilla = (x: Accion) =>
    (x.condiciones ?? []).find((c): c is Toggle => c.tipo === "toggle" && c.id.startsWith("dote_fuego_de_saturacion"))!;
  const montar = (x: Accion, marcadas: string[] = []) => {
    const e = eleccionSinTocar(x);
    return montarTirada(f, x, { ...e, estadoCondiciones: { ...e.estadoCondiciones, ...Object.fromEntries(marcadas.map((id) => [id, true])) } });
  };
  const modoFAuto = (x: Accion) => x.ataque!.modos.find((m) => m.etiqueta?.includes("F. Auto"))!.id;

  test("casilla en los disparos: +1 al daño, sin tocar la tirada", () => {
    const c = casilla(t());
    assert.match(c.etiqueta, /^Fuego automático concentrado en una sola casilla/);
    const con = montar(t(), [c.id]);
    const sin = montar(t());
    assert.equal(con.modificador, sin.modificador);
    assert.equal(resolverDanio(10, 2, "Letal", con.danio).total - resolverDanio(10, 2, "Letal", sin.danio).total, 1);
  });

  test("la dificultad de esquiva +1, aviso a «El objetivo» solo en fuego automático y con la casilla", () => {
    const c = casilla(t());
    const avisa = (estado: Record<string, string | boolean>) =>
      efectosSobreObjetivo(t(), estado, ACIERTA, () => 1).some((a) => /dificultad para esquivar este ataque sube 1/.test(a.titulo));
    assert.equal(avisa({ [c.id]: true, modo: modoFAuto(t()) }), true);
    assert.equal(avisa({ [c.id]: true, modo: t().ataque!.modos[0].id }), false);
    assert.equal(avisa({ modo: modoFAuto(t()) }), false);
  });
});

describe("Fuego de Supresión", () => {
  const f = resolver(armado(ficha([{ id: "dote_fuego_de_supresion" }]), "fusil_asalto_impetus"));
  const t = () => fila(f, "ataque_fuego_");
  const avisa = (modo: string, resultado = ACIERTA) =>
    efectosSobreObjetivo(t(), { modo }, resultado, () => 1).some((a) => /esquivarlo sin tirar gastando una reacción.*−2 en sus ataques a distancia/.test(a.titulo));

  test("en fuego automático, aviso a «El objetivo» (acierte o no): esquivar con reacción a cambio de −2", () => {
    const fAuto = t().ataque!.modos.find((m) => m.etiqueta?.includes("F. Auto"))!.id;
    assert.equal(avisa(fAuto), true);
    assert.equal(avisa(fAuto, FALLA), true);
    assert.equal(avisa(t().ataque!.modos[0].id), false);
  });

  test("sin casilla: no cambia la tirada", () => {
    assert.equal((t().condiciones ?? []).some((c) => c.id.startsWith("dote_fuego_de_supresion")), false);
  });
});

describe("Fuego de Barrera", () => {
  const f = resolver(armado(ficha([{ id: "dote_fuego_de_barrera" }]), "fusil_asalto_impetus"));
  const t = () => fila(f, "ataque_fuego_");
  const avisa = (modo: string, resultado = ACIERTA) =>
    efectosSobreObjetivo(t(), { modo }, resultado, () => 1).some((a) => /velocidad baja a la mitad en su primera acción de movimiento/.test(a.titulo));

  test("en fuego automático y con acierto, aviso a «El objetivo»: media velocidad en su primer movimiento", () => {
    const fAuto = t().ataque!.modos.find((m) => m.etiqueta?.includes("F. Auto"))!.id;
    assert.equal(avisa(fAuto), true);
    assert.equal(avisa(fAuto, FALLA), false);
    assert.equal(avisa(t().ataque!.modos[0].id), false);
  });
});

describe("Lanzamiento Doble", () => {
  const f = resolver(ajustarGranada(ficha([{ id: "dote_lanzamiento_doble" }]), MUNICION_GRANADA[0].id, 2));
  const t = () => fila(f, "lanzar_granada_");
  const casilla = (x: Accion) =>
    (x.condiciones ?? []).find((c): c is Toggle => c.tipo === "toggle" && c.id.startsWith("dote_lanzamiento_doble"));

  test("casilla −2 al lanzar granadas, con el aviso de las dos granadas", () => {
    const c = casilla(t())!;
    assert.match(c.etiqueta, /^Lanzamiento doble \(dos granadas a la vez\)/);
    assert.equal(total(f, t(), [c.id]) - total(f, t()), -2);
    assert.match(lineaAntes(t()), /Lanzas dos granadas a la vez como una acción estándar. Gastas las dos/);
  });

  test("sin Lanzamiento 2, nada", () => {
    const s = ficha([{ id: "dote_lanzamiento_doble" }]);
    const sin = resolver(ajustarGranada({ ...s, habilidades: { ...s.habilidades, atletismo: { valor: 1, especialidades: ["lanzamiento"] } } }, MUNICION_GRANADA[0].id, 1));
    assert.equal(casilla(fila(sin, "lanzar_granada_")), undefined);
  });
});

describe("Políglota", () => {
  test("texto de la tarjeta, sin tocar ninguna tirada: la app no lleva idiomas", () => {
    const d = DOTES.find((x) => x.id === "dote_poliglota")!;
    assert.deepEqual([d.coste, d.grupo, d.requisitos], [2, "cultura", [{ tipo: "especialidad", habilidad: "cultura", id: "linguistica", min: 1 }]]);
    assert.deepEqual(d.efectos.map((e) => e.tipo === "texto" && e.lugar), ["ficha"]);
    assert.deepEqual(d.motor.map((m) => [m.tipo, m.afecta.modo]), [["texto", "ninguna"]]);
    const f = resolver(ficha([{ id: "dote_poliglota" }]));
    assert.equal(f.textosTirada.some((x) => x.fuente === "Políglota"), false);
  });
});

describe("Mente Enciclopédica", () => {
  const ID = "dotes_mente_enciclopedica";
  const MESA: MesaDeFicha = { aliados: [], turno: null };
  const s = ficha([{ id: "dote_mente_enciclopedica" }]);
  const deDote = (x: Sheet, mesa: MesaDeFicha | null = MESA) =>
    resolverFicha(x, { estados: [], vitalidad: VITALIDAD_DE_FICHA, mesa }).accionesDotes.tiradas.find((t) => t.id === ID);

  test("acción de dote: Perspicacia + Cultura, en especialidad con cualquiera de las cuatro", () => {
    const t = deDote(s)!;
    assert.deepEqual([t.grupo, t.aplicado, t.habilidad], ["Dotes", "perspicacia", "cultura"]);
    assert.deepEqual(t.especialidadesAccion, ["economia", "historia", "linguistica", "sociedad"]);
    assert.match(t.nota ?? "", /prueba de conocimiento/);
    // Perspicacia (Inteligencia 4 + Percepción 4, a la mitad) + Cultura 5 entera.
    const f = resolver(s);
    assert.equal(total(f, t), total(f, { ...t, especialidadesAccion: undefined, habilidad: null }) + 5);
  });

  test("con ventaja: la casilla de la ventaja de las acciones de dote", () => {
    const c = (deDote(s)!.condiciones ?? []).find((x): x is Toggle => x.tipo === "toggle" && x.ventaja === true)!;
    assert.match(c.etiqueta, /Con ventaja \(dos dados, el mejor\) \(Mente Enciclopédica\)/);
  });

  test("una vez por escena: se gasta al tirar y se bloquea agotada", () => {
    const t = deDote(s)!;
    assert.deepEqual(t.usoLimitado, { accionId: ID, claves: [{ clave: ID, veces: 1 }] });
    const r = gastarUsoLimitado(s, t.usoLimitado!, null, []);
    assert.ok(r.ok);
    if (r.ok) assert.equal(motivoDeBloqueo(deDote(r.sheet)!.habilitacion), "Usada esta escena (1/1).");
  });

  test("sin Cultura 3, no sale", () => {
    assert.equal(deDote({ ...s, habilidades: { ...s.habilidades, cultura: { valor: 2, especialidades: [] } } }), undefined);
  });
});
