// Tiradas fijas de docs/fuente/habilidades.md (Apuntar, Carrera, Discernir mentiras, Resistir
// distracción; Rastreo, Subsistencia, Trato con Animales e Investigación), el selector "Apuntado"
// de los ataques a distancia, el «Marcha» de Rastreo y las dotes que cuelgan de ellas (Velocista,
// Gran Puntería, Puntería Relámpago, Cazador Cazado, Vigilancia Táctica, Rastreo al Paso, Bioma
// Predilecto, Descartar Teoría).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { ACCIONES, CONDICION_MARCHA, ID_APUNTADO, ID_MARCHA, usarHabilidadAlternativa, elegirEspecialidad, type Accion } from "./acciones";
import { HABILIDADES } from "./habilidades";
import { resolverFicha, conExtrasDeFicha, tiradaFijaVisible, VITALIDAD_DE_FICHA, type FichaResuelta } from "./fichaResuelta";
import { montarTirada, eleccionSinTocar, tirarMontada, type TiradaMontada } from "./montaje";
import { accionesDeAtaque } from "./combate";
import { equipar } from "./equipo";
import type { CondicionTirada, EstadoCondiciones } from "./condiciones";
import { ID_CASILLA_ULTRA_FISICAS } from "./farmacos";
import { DOTES } from "../catalog/dotes";
import { especialidadesDe, type EspecialidadId } from "../catalog/especialidades";
import type { DoteComprada } from "./dotesCompradas";
import { SELECTORES_DE_TIRADA } from "../catalog/dotesDestinos";

// Atributos a 4 y habilidades a 5, con las especialidades que piden los requisitos de dote
// (Carrera, Manipulación, Táctica, Empatía…), menos las de `sin`.
function ficha(dotes: DoteComprada[], sin: EspecialidadId[] = []): Sheet {
  const base = defaultSheet();
  const esp: Record<string, EspecialidadId[]> = {};
  for (const d of DOTES)
    for (const r of d.requisitos.flatMap((x) => (x.tipo === "uno_de" ? x.opciones : [x])))
      if (r.tipo === "especialidad" && !sin.includes(r.id)) (esp[r.habilidad] ??= []).push(r.id);
  const atributos = Object.fromEntries(Object.keys(base.atributos).map((k) => [k, 4])) as Sheet["atributos"];
  return {
    ...base,
    atributos,
    habilidades: Object.fromEntries(
      HABILIDADES.map((h) => [h.id, { valor: 5, especialidades: [...new Set(esp[h.id] ?? [])] }]),
    ) as Sheet["habilidades"],
    dotes,
  };
}

const resolver = (s: Sheet) => resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA });
const fila = (id: string) => ACCIONES.find((a) => a.id === id)!;
const fija = (f: FichaResuelta, id: string) => conExtrasDeFicha(f, fila(id));
const montar = (f: FichaResuelta, t: Accion, cambios: EstadoCondiciones = {}): TiradaMontada => {
  const e = eleccionSinTocar(t);
  return montarTirada(f, t, { ...e, estadoCondiciones: { ...e.estadoCondiciones, ...cambios } });
};
// La dificultad que deja el total a `margen` del dado 6.
const tirarCon = (m: TiradaMontada, margen: number) => tirarMontada(m, 6, 6 + m.total - margen);

type Opcion = Extract<CondicionTirada, { tipo: "opcion" }>;
const apuntado = (t: Accion): Opcion => t.condiciones!.find((c): c is Opcion => c.id === ID_APUNTADO && c.tipo === "opcion")!;
const disparo = (f: FichaResuelta) =>
  conExtrasDeFicha(f, accionesDeAtaque(f.ficha, f.modificadores, f.extrasDotes.permisos).find((t) => t.label === "Disparar con Impetus")!);
const conFusil = (s: Sheet) => equipar(s, { instanciaId: "f1", catalogoId: "fusil_asalto_impetus" });

describe("Tiradas fijas: recuento", () => {
  test("ningún efecto de dote pendiente de tiradas-fijas", () => {
    const pendientes = DOTES.flatMap((d) => d.motor.filter((m) => m.bloqueoPor === "tiradas-fijas").map(() => d.id));
    assert.deepEqual(pendientes, []);
  });
});

describe("Tiradas fijas: las filas", () => {
  test("Apuntar: Perspicacia + Combate a Distancia, dificultad 6, sin especialidad fija", () => {
    const t = fila("apuntar");
    assert.deepEqual([t.grupo, t.aplicado, t.habilidad, t.dificultadSugerida], ["Acciones", "perspicacia", "combate_distancia", 6]);
    assert.equal(t.especialidadesAccion, undefined);
  });

  test("Carrera: Reflejos + Atletismo en Carrera, dificultad 6, con los metros en la nota", () => {
    const t = fila("carrera");
    assert.deepEqual([t.aplicado, t.habilidad, t.especialidadesAccion, t.dificultadSugerida], ["reflejos", "atletismo", ["carrera"], 6]);
    assert.match(t.nota!, /\+2 m.*\+4 m.*mitad/);
  });

  test("Discernir mentiras y Resistir distracción: Perspicacia + Actitud en Empatía", () => {
    for (const id of ["discernir_mentiras", "resistir_distraccion"]) {
      const t = fila(id);
      assert.deepEqual([t.aplicado, t.habilidad, t.especialidadesAccion], ["perspicacia", "actitud", ["empatia"]], id);
    }
    // Sin la especialidad, a la mitad.
    const f = resolver(ficha([], ["empatia"]));
    assert.equal(montar(f, fija(f, "discernir_mentiras")).habilidad?.valor, 2);
  });
});

describe("Velocista en Carrera: fracaso → éxito y éxito → crítico, sin encadenar", () => {
  const f = resolver(ficha([{ id: "dote_velocista" }]));
  const t = fija(f, "carrera");
  const m = montar(f, t);

  test("sin casilla: fijo en la tirada, con sus dos notas", () => {
    // Solo la de «Bajo Ultra Estimulante», que sale siempre en las físicas (S94).
    assert.deepEqual((t.condiciones ?? []).map((c) => c.id), [ID_CASILLA_ULTRA_FISICAS]);
    assert.equal(m.margenes.criticoExito, 0);
    assert.equal(m.subeGrado, "Velocista");
    assert.deepEqual(
      m.notas.map((n) => n.nota),
      ["Cualquier éxito es crítico.", "Un fracaso (no el crítico) cuenta como éxito."],
    );
  });

  test("éxito → crítico", () => {
    const r = tirarCon(m, 1);
    assert.deepEqual([r.exito, r.critico], [true, true]);
  });

  test("fracaso → éxito, sin llegar a crítico", () => {
    const r = tirarCon(m, -2);
    assert.deepEqual([r.exito, r.critico, r.margen], [true, false, 0]);
    assert.deepEqual(r.cambioGrado, { fuente: "Velocista", margenOriginal: -2 });
  });

  test("el fracaso crítico no cambia", () => {
    const r = tirarCon(m, -6);
    assert.deepEqual([r.exito, r.critico], [false, true]);
  });

  test("sin la dote, Carrera normal", () => {
    const g = resolver(ficha([]));
    const r = tirarCon(montar(g, fija(g, "carrera")), -2);
    assert.deepEqual([r.exito, r.critico], [false, false]);
  });
});

describe("Gran Puntería y las Puntería Relámpago en Apuntar", () => {
  const f = resolver(ficha([{ id: "dote_gran_punteria" }, { id: "dote_punteria_relampago" }]));
  const t = fija(f, "apuntar");
  const m = montar(f, t);

  test("éxito → crítico sin casilla; el texto de cobertura, solo con crítico natural", () => {
    assert.equal(m.margenes.criticoExito, 0);
    assert.equal(t.criticoFijo?.fuente, "Gran Puntería");
    const exito = tirarCon(m, 2);
    assert.deepEqual([exito.critico, exito.criticoNatural], [true, undefined]);
    const natural = tirarCon(m, 6);
    assert.deepEqual([natural.critico, natural.criticoNatural], [true, true]);
    assert.match(t.efectoCriticoNatural!, /baja 2 niveles.*\(Gran Puntería\)/);
    assert.equal(t.efectoCritico, undefined);
  });

  test("Puntería Relámpago: nota de reacción", () => {
    assert.match(t.nota!, /como reacción durante el turno\. \(Puntería Relámpago\)/);
  });

  test("Puntería Relámpago Mejorada: sus dos textos en la nota", () => {
    const g = resolver(
      ficha([{ id: "dote_gran_punteria" }, { id: "dote_punteria_relampago" }, { id: "dote_punteria_relampago_mejorada" }]),
    );
    const nota = fija(g, "apuntar").nota!;
    assert.match(nota, /acción gratuita por turno/);
    assert.match(nota, /Sigues pudiendo apuntar como reacción/);
  });

  test("sin la dote, crítico con 6 y sin texto", () => {
    const g = resolver(ficha([]));
    const s = fija(g, "apuntar");
    assert.equal(montar(g, s).margenes.criticoExito, 6);
    assert.equal(s.efectoCriticoNatural, undefined);
  });
});

describe("Selector «Apuntado» en los ataques a distancia", () => {
  test("todos los ataques con Combate a Distancia lo llevan; los melee no", () => {
    const s = equipar(conFusil(ficha([])), { instanciaId: "m1", catalogoId: "espada_cuchillo_combate" });
    const f = resolver(s);
    for (const t of accionesDeAtaque(f.ficha, f.modificadores, f.extrasDotes.permisos)) {
      const tiene = (t.condiciones ?? []).some((c) => c.id === ID_APUNTADO);
      assert.equal(tiene, t.habilidad === "combate_distancia", t.label);
    }
  });

  test("No 0 · Éxito +1 · Crítico +1 y omite 1 nivel de cobertura", () => {
    const f = resolver(conFusil(ficha([])));
    const t = disparo(f);
    const sel = apuntado(t);
    assert.equal(sel.etiqueta, "Apuntado");
    assert.deepEqual(sel.opciones.map((o) => [o.id, o.valor]), [["no", 0], ["exito", 1], ["critico", 1]]);
    const base = montar(f, t).modificador;
    assert.equal(montar(f, t, { apuntado: "exito" }).modificador - base, 1);
    const critico = montar(f, t, { apuntado: "critico" });
    assert.equal(critico.modificador - base, 1);
    assert.deepEqual(critico.notas, [{ etiqueta: "Apuntado", nota: "Omites 1 nivel de cobertura del objetivo." }]);
    assert.deepEqual(montar(f, t, { apuntado: "exito" }).notas, []);
  });

  test("con Gran Puntería: el éxito cuenta como crítico y el crítico baja la cobertura 2 niveles en total", () => {
    const f = resolver(conFusil(ficha([{ id: "dote_gran_punteria" }])));
    const t = disparo(f);
    const sel = apuntado(t);
    assert.equal(sel.etiqueta, "Apuntado (Gran Puntería)");
    assert.equal(t.condiciones!.filter((c) => c.id === ID_APUNTADO).length, 1);
    assert.match(sel.opciones.find((o) => o.id === "exito")!.nota!, /^Omites 1 nivel de cobertura/);
    assert.equal(
      sel.opciones.find((o) => o.id === "critico")!.nota,
      "La cobertura del objetivo baja 2 niveles en total (salvo cobertura total).",
    );
    assert.deepEqual(sel.opciones.map((o) => o.valor), [0, 1, 1]);
  });
});

describe("Cambio de par con casilla en la fila", () => {
  test("Cazador Cazado: Discernir mentiras con Manipulación, entera si la tiene", () => {
    const f = resolver(ficha([{ id: "dote_cazador_cazado" }]));
    const t = fija(f, "discernir_mentiras");
    assert.deepEqual(t.habilidadAlternativa, {
      habilidad: "actitud",
      especialidad: "manipulacion",
      etiqueta: "Con Manipulación (Cazador Cazado)",
    });
    const alt = usarHabilidadAlternativa(t)!;
    assert.deepEqual(alt.especialidadesAccion, ["manipulacion"]);
    const m = montarTirada(f, alt, eleccionSinTocar(alt));
    assert.deepEqual([m.aplicado.id, m.habilidad?.id, m.habilidad?.valor, m.enEspecialidad], ["perspicacia", "actitud", 5, true]);
    // Sin Manipulación en la ficha (NPC sin requisitos o especialidad perdida): a la mitad.
    const sinManip = { ...f.ficha, habilidades: { ...f.ficha.habilidades, actitud: { valor: 5, especialidades: ["empatia" as const] } } };
    const otra = montarTirada({ ...f, ficha: sinManip }, alt, eleccionSinTocar(alt));
    assert.deepEqual([otra.enEspecialidad, otra.habilidad?.valor], [false, 2]);
  });

  test("Vigilancia Táctica: Resistir distracción con Exploración (Táctica)", () => {
    const f = resolver(ficha([{ id: "dote_vigilancia_tactica" }]));
    const t = fija(f, "resistir_distraccion");
    assert.equal(t.habilidadAlternativa?.etiqueta, "Con Táctica (Vigilancia Táctica)");
    const alt = usarHabilidadAlternativa(t)!;
    const m = montarTirada(f, alt, eleccionSinTocar(alt));
    assert.deepEqual([m.aplicado.id, m.habilidad?.id, m.enEspecialidad], ["perspicacia", "exploracion", true]);
    assert.equal(alt.label, "Resistir distracción (Táctica)");
    // No sale en Discernir mentiras.
    assert.equal(fija(f, "discernir_mentiras").habilidadAlternativa, undefined);
  });
});

// Regla general de especialidades (docs/sistema.md §3, usuario 2026-10-23): sin especialidad
// nombrada, la habilidad entera; nombrada, entera si la ficha la tiene y a la mitad si no.
const ESPECIALIDADES_DE: Record<string, string[]> = Object.fromEntries(
  HABILIDADES.map((h) => [h.id, especialidadesDe(h.id).map((e) => e.id)]),
);

describe("especialidad de las tiradas fijas: la decide la tirada", () => {
  // Habilidades a 5 con solo estas especialidades; atributos a 0.
  const con = (esp: EspecialidadId[] = []): FichaResuelta => {
    const base = defaultSheet();
    const habilidades = Object.fromEntries(
      HABILIDADES.map((h) => [h.id, { valor: 5, especialidades: esp.filter((e) => ESPECIALIDADES_DE[h.id]?.includes(e)) }]),
    ) as Sheet["habilidades"];
    return resolver({ ...base, habilidades });
  };
  const habilidad = (f: FichaResuelta, t: Accion) => {
    const m = montar(f, t);
    return [m.habilidad?.valor, m.enEspecialidad];
  };

  test("sin especialidad nombrada, entera aunque la ficha tenga otras", () => {
    for (const id of ["defensa", "iniciativa", "iniciativa_arma", "apuntar", "alerta_activa", "atletismo"]) {
      assert.deepEqual(habilidad(con(["carrera", "pistolas", "tactica"]), fila(id)), [5, false], id);
      assert.equal(fila(id).especialidadesAccion, undefined, id);
    }
  });

  test("especialidad fija: entera con ella, la mitad sin ella", () => {
    const casos: [string, EspecialidadId][] = [
      ["medicina", "medicina"],
      ["tecnica", "informatica"],
      ["escalar", "escalada"],
      ["sigilo", "esconderse"],
      ["hurto", "hurto"],
      ["iniciativa_distraccion", "manipulacion"],
    ];
    for (const [id, esp] of casos) {
      assert.deepEqual(fila(id).especialidadesAccion, [esp], id);
      assert.deepEqual(habilidad(con([esp]), fila(id)), [5, true], id);
      assert.deepEqual(habilidad(con(), fila(id)), [2, false], id);
    }
  });

  test("Saltar, levantarse y Escalar son filas aparte, con su par de la fuente", () => {
    const [saltar, escalar] = [fila("atletismo"), fila("escalar")];
    assert.deepEqual([saltar.aplicado, saltar.habilidad, escalar.aplicado, escalar.habilidad], ["potencia", "atletismo", "potencia", "atletismo"]);
    assert.equal(saltar.label, "Saltar, levantarse");
  });

  test("Iniciativa distrayendo: con Sigilo (alternativa) va entera, tenga o no especialidad de Sigilo", () => {
    const t = fila("iniciativa_distraccion");
    const alt = usarHabilidadAlternativa(t)!;
    assert.deepEqual([alt.habilidad, alt.especialidadesAccion, alt.label], ["sigilo", undefined, "Iniciativa (distrayendo) (Sigilo)"]);
    assert.deepEqual(habilidad(con(), alt), [5, false]);
  });

  test("Convencer / mentir: hay que elegir especialidad; la elegida va entera si se tiene, si no a la mitad", () => {
    const t = fila("social");
    assert.deepEqual(t.especialidadAElegir, ["empatia", "humor", "intimidacion", "liderazgo", "manipulacion", "negociacion"]);
    const empatia = elegirEspecialidad(t, "empatia");
    assert.deepEqual([empatia.especialidadesAccion, empatia.especialidadAElegir, empatia.label], [["empatia"], undefined, "Convencer / mentir (Empatía)"]);
    assert.deepEqual(habilidad(con(["empatia"]), empatia), [5, true]);
    // Con Humor en la ficha, elegir Empatía no vale: a la mitad.
    assert.deepEqual(habilidad(con(["humor"]), empatia), [2, false]);
  });
});

// ── Exploración: Rastreo, Subsistencia, Trato con Animales e Investigación (2026-10-26) ──

const EXPLORACION = ["rastreo", "subsistencia", "trato_animales_lectura", "trato_animales_interaccion", "investigacion"];
const SUPERVIVENCIA = ["rastreo", "subsistencia", "trato_animales_lectura", "trato_animales_interaccion"];
const visibles = (f: FichaResuelta) => EXPLORACION.filter((id) => tiradaFijaVisible(f, fila(id)));
// Ficha con Exploración 5 y solo estas especialidades de Exploración (el resto, las de dotes).
const conExploracion = (esp: EspecialidadId[], dotes: DoteComprada[] = []): Sheet => {
  const s = ficha(dotes, ["supervivencia", "investigacion", "tactica"]);
  return { ...s, habilidades: { ...s.habilidades, exploracion: { valor: 5, especialidades: esp } } };
};
let n = 0;
const conAumento = (s: Sheet, catalogoId: string, eleccion?: string): Sheet => ({
  ...s,
  equipo: [...s.equipo, { instanciaId: `aum${++n}`, catalogoId, ...(eleccion && { eleccion }) }],
});
const marcha = (t: Accion) => t.condiciones!.find((c): c is Opcion => c.id === ID_MARCHA && c.tipo === "opcion")!;
// Lo que la marcha (y lo que le cuelga) suma a la tirada en cada opción, contra «Normal · mitad».
const penalizadores = (f: FichaResuelta, cambios: EstadoCondiciones = {}) => {
  const t = fija(f, "rastreo");
  const base = montar(f, t, cambios).modificador;
  return Object.fromEntries(marcha(t).opciones.map((o) => [o.id, montar(f, t, { ...cambios, marcha: o.id }).modificador - base]));
};

describe("Exploración: las filas", () => {
  test("Perspicacia + Exploración con Supervivencia; interactuar con un animal, con Expresión", () => {
    for (const id of SUPERVIVENCIA) {
      const t = fila(id);
      assert.deepEqual([t.grupo, t.habilidad, t.especialidadesAccion, t.soloConEspecialidad], ["Acciones", "exploracion", ["supervivencia"], true], id);
      assert.equal(t.aplicado, id === "trato_animales_interaccion" ? "expresion" : "perspicacia", id);
    }
    const inv = fila("investigacion");
    assert.deepEqual([inv.aplicado, inv.habilidad, inv.especialidadesAccion], ["perspicacia", "exploracion", ["investigacion"]]);
    assert.match(inv.nota!, /Inspección de Escena.*Análisis de Pistas.*Búsqueda Documental/);
  });

  test("con la especialidad, entera; sin ella (pintada por una dote), a la mitad", () => {
    const f = resolver(conExploracion(["supervivencia", "investigacion"]));
    for (const id of EXPLORACION) assert.deepEqual([montar(f, fija(f, id)).habilidad?.valor, montar(f, fija(f, id)).enEspecialidad], [5, true], id);
    const g = resolver(conExploracion([]));
    for (const id of EXPLORACION) assert.equal(montar(g, fija(g, id)).habilidad?.valor, 2, id);
  });

  test("«Marcha» de las dotes repite los ids del selector de la tirada", () => {
    assert.deepEqual(SELECTORES_DE_TIRADA[ID_MARCHA].opciones, (CONDICION_MARCHA as Opcion).opciones.map((o) => o.id));
  });
});

describe("Exploración: solo se pintan con la especialidad o con algo que les enganche (S99)", () => {
  test("sin Supervivencia ni Investigación, ninguna; Buscar / percibir, siempre", () => {
    const f = resolver(conExploracion([]));
    assert.deepEqual(visibles(f), []);
    assert.ok(tiradaFijaVisible(f, fila("alerta_activa")));
  });

  test("Supervivencia pinta Rastreo, Subsistencia y Trato; Investigación, la suya", () => {
    assert.deepEqual(visibles(resolver(conExploracion(["supervivencia"]))), SUPERVIVENCIA);
    assert.deepEqual(visibles(resolver(conExploracion(["investigacion"]))), ["investigacion"]);
  });

  test("una dote que engancha pinta su fila aunque falte la especialidad (NPC, sin requisitos)", () => {
    const s = conExploracion([], [{ id: "dote_bioma_predilecto", eleccion: "Selva densa" }]);
    const npc = resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA, libre: true });
    assert.deepEqual(visibles(npc), ["rastreo", "subsistencia"]);
  });

  test("un aumento también: UV en Investigación, oído biónico en Rastreo", () => {
    const uv = resolver(conAumento(conExploracion([]), "aum_introgresion_sensorial_heterologa", "espectro_ultravioleta"));
    assert.deepEqual(visibles(uv), ["investigacion"]);
    const oido = resolver(conAumento(conAumento(conExploracion([]), "aum_optimizacion_foveo_sensorial"), "aum_optimizacion_vestibulo_auditiva"));
    assert.deepEqual(visibles(oido), ["rastreo"]);
  });
});

describe("Rastreo: selector «Marcha» y sus dotes", () => {
  test("sin dotes: normal mitad 0 · total −3; adversa tercio 0 · mitad −3 · total −6", () => {
    const f = resolver(conExploracion(["supervivencia"]));
    assert.equal(marcha(fija(f, "rastreo")).porDefecto, "normal_mitad");
    assert.deepEqual(penalizadores(f), { normal_mitad: 0, normal_total: -3, adversa_tercio: 0, adversa_mitad: -3, adversa_total: -6 });
  });

  test("Rastreo al Paso: 3 menos en las que penalizan, sin casilla", () => {
    const f = resolver(conExploracion(["supervivencia"], [{ id: "dote_rastreo_al_paso" }]));
    const t = fija(f, "rastreo");
    assert.deepEqual(t.condiciones!.map((c) => c.id), [ID_MARCHA]);
    assert.deepEqual(penalizadores(f), { normal_mitad: 0, normal_total: 0, adversa_tercio: 0, adversa_mitad: 0, adversa_total: -3 });
    assert.deepEqual(montar(f, t, { marcha: "adversa_total" }).desglose.filter((l) => /Rastreo al Paso/.test(l.etiqueta)).map((l) => l.valor), [3]);
  });

  test("Bioma Predilecto: con «En tu bioma predilecto», lo adverso cuenta como normal", () => {
    const f = resolver(conExploracion(["supervivencia"], [{ id: "dote_bioma_predilecto", eleccion: "Selva densa" }]));
    const t = fija(f, "rastreo");
    const c = casillaToggle(t, /^En tu bioma predilecto/)!;
    assert.equal(c.resumen, "cambia «Marcha»");
    assert.deepEqual(penalizadores(f), { normal_mitad: 0, normal_total: -3, adversa_tercio: 0, adversa_mitad: -3, adversa_total: -6 });
    assert.deepEqual(penalizadores(f, { [c.id]: true }), { normal_mitad: 0, normal_total: -3, adversa_tercio: 0, adversa_mitad: 0, adversa_total: -3 });
    assert.match(t.nota!, /En tu bioma predilecto: Lo adverso cuenta como normal/);
  });

  // S97: el bioma pasa lo adverso a normal y Rastreo al Paso quita 3 encima (adversa total → 0);
  // en adversa a mitad no apilan, que con cualquiera ya está en 0.
  test("Rastreo al Paso y Bioma Predilecto se encadenan", () => {
    const f = resolver(
      conExploracion(["supervivencia"], [{ id: "dote_rastreo_al_paso" }, { id: "dote_bioma_predilecto", eleccion: "Selva densa" }]),
    );
    const c = casillaToggle(fija(f, "rastreo"), /^En tu bioma predilecto/)!;
    assert.deepEqual(penalizadores(f, { [c.id]: true }), { normal_mitad: 0, normal_total: 0, adversa_tercio: 0, adversa_mitad: 0, adversa_total: 0 });
    assert.deepEqual(penalizadores(f, {}), { normal_mitad: 0, normal_total: 0, adversa_tercio: 0, adversa_mitad: 0, adversa_total: -3 });
  });

  test("rastro térmico: nota en Rastreo con Visión Térmica, aunque no haya Supervivencia", () => {
    const f = resolver(conAumento(conExploracion([]), "aum_introgresion_sensorial_heterologa", "vision_termica"));
    assert.ok(tiradaFijaVisible(f, fija(f, "rastreo")));
    assert.match(fija(f, "rastreo").nota!, /Visión Térmica: ves el rastro de calor reciente/);
  });

  test("oído biónico: ventaja al rastrear por el sonido; en Buscar, solo detectar ocultos", () => {
    const f = resolver(conAumento(conAumento(conExploracion(["supervivencia"]), "aum_optimizacion_foveo_sensorial"), "aum_optimizacion_vestibulo_auditiva"));
    const r = casillaToggle(fija(f, "rastreo"), /sonido/)!;
    assert.ok(r.ventaja);
    assert.ok(montar(f, fija(f, "rastreo"), { [r.id]: true }).ventaja);
    assert.match(casillaToggle(fija(f, "alerta_activa"), /Percepción auditiva/)!.etiqueta, /^¿Percepción auditiva\? \(detectar ocultos\) ·/);
  });
});

describe("Subsistencia e Investigación: lo que antes colgaba de Buscar / percibir", () => {
  test("Bioma Predilecto: ventaja en Subsistencia con su casilla", () => {
    const f = resolver(conExploracion(["supervivencia"], [{ id: "dote_bioma_predilecto", eleccion: "Zona árida" }]));
    const t = fija(f, "subsistencia");
    const c = casillaToggle(t, /^Dentro de tu bioma predilecto \(Bioma Predilecto: Zona árida\)$/)!;
    assert.equal(montar(f, t).ventaja, null);
    assert.ok(montar(f, t, { [c.id]: true }).ventaja);
  });

  test("Descartar Teoría: texto en la nota de Investigación y su casilla −2; nada en Buscar", () => {
    const f = resolver(conExploracion(["investigacion"], [{ id: "dote_descartar_teoria" }]));
    const t = fija(f, "investigacion");
    assert.match(t.nota!, /repetir la prueba con −2.*\(Descartar Teoría\)/);
    const c = casillaToggle(t, /Descartar Teoría/)!;
    assert.equal(montar(f, t, { [c.id]: true }).modificador - montar(f, t).modificador, -2);
    const buscar = fija(f, "alerta_activa");
    assert.doesNotMatch(buscar.nota ?? "", /Descartar Teoría/);
    assert.equal(casillaToggle(buscar, /Descartar Teoría/), undefined);
  });

  test("UV partida: +2 a accesos ocultos en Buscar y +2 a investigación de campo en Investigación", () => {
    const f = resolver(conAumento(conExploracion(["investigacion"]), "aum_introgresion_sensorial_heterologa", "espectro_ultravioleta"));
    const buscar = fija(f, "alerta_activa");
    const inv = fija(f, "investigacion");
    const accesos = casillaToggle(buscar, /accesos ocultos/)!;
    const campo = casillaToggle(inv, /Investigación de campo/)!;
    assert.match(accesos.etiqueta, /^¿Buscas accesos ocultos\? ·/);
    assert.equal(casillaToggle(buscar, /Investigación de campo/), undefined);
    assert.equal(casillaToggle(inv, /accesos/), undefined);
    assert.equal(montar(f, buscar, { [accesos.id]: true }).modificador - montar(f, buscar).modificador, 2);
    assert.equal(montar(f, inv, { [campo.id]: true }).modificador - montar(f, inv).modificador, 2);
  });
});

type Toggle = Extract<CondicionTirada, { tipo: "toggle" }>;
function casillaToggle(t: Accion, etiqueta: RegExp): Toggle | undefined {
  return t.condiciones?.find((c): c is Toggle => c.tipo === "toggle" && etiqueta.test(c.etiqueta));
}
