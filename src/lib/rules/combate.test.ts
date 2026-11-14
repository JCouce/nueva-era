import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { motivoDeBloqueo } from "./habilitacion";
import { defaultSheet, parseSheet, type Sheet } from "./sheet";
import { equipar } from "./equipo";
import { ajustarRecurso, ajustarGranada, ajustarMunicionEspecial, comprarRecarga, dispararPulso, reconciliarRecursos, recursoDe } from "./recursos";
import { accionesDeAtaque as accionesDeAtaqueCon, accionesDirectasDeAtaque, generaAccionPropia, ID_MODO_CAMUFLAJE, MOTIVO_SIN_CARGAS, NOTA_MALLA_ANULA_CAMUFLAJE } from "./combate";
import { restaDeSigilo } from "./sigilo";
import { efectosQueSaltan, efectosSobreObjetivo, type EfectoEnTirada } from "./efectosArma";
import { valorBonosTramo, type CondicionTirada } from "./condiciones";
import { EQUIPO, type Equipo } from "../catalog/equipo";
import { MUNICION_GRANADA } from "../catalog/municion";
import type { MotorMetadata } from "./motor";
import { ACCIONES, modificadorAccion, gastoTotal, gastoMunicionEspecial, avisoInsuficiente, danioConMunicion, municionEspecialElegida, ignoraBlindajeDelGolpe, resolverDanio, type Accion } from "./acciones";
import { desgloseDanio } from "./armasModificadas";
import { aplicado, modificadoresActivos } from "./derivados";
import { permisosDeDotes } from "./dotesEfectos";
import { conExtrasDeFicha, resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";
import { montarTirada, SIN_ELECCION } from "./montaje";

// Los efectos sobre el objetivo de una tirada (T3a), en corto: «aturdido (8)», «hemorragia
// (1d6)», o el texto. `cuando`: los de crítico o los del acierto.
function resumenEfecto(e: EfectoEnTirada): string {
  if (e.tipo === "texto") return e.texto;
  if (e.tipo === "salvacion") return `${e.estadoId} (${e.dificultad})`;
  if (e.tipo === "ajusteSalvacion") return `ajuste ${e.contra}`;
  const d = e.duracion;
  const nombre = e.etiqueta ?? e.estadoId;
  return d.tipo === "dado" ? `${nombre} (1d${d.caras})` : d.tipo === "turnos" ? `${nombre} (${d.turnos} turnos)` : nombre;
}
const efectosEn = (t: Pick<Accion, "efectosObjetivo">, cuando: "acierto" | "critico"): string =>
  (t.efectosObjetivo ?? []).filter((e) => e.cuando === cuando).map(resumenEfecto).join(" · ");
const critico = (t: Pick<Accion, "efectosObjetivo">) => efectosEn(t, "critico");

// En reposo (especie + equipo): estos tests no llevan estados de combate. Los permisos de
// dotes (Bloquear, Sutil; D2b-2) salen de las dotes de la propia ficha, con sus requisitos.
const accionesDeAtaque = (s: Sheet) => accionesDeAtaqueCon(s, modificadoresActivos(s), permisosDeDotes(s));

// D2b-2: Bloquear solo con la dote Bloqueo y el estilo Sutil solo con Combate Sutil. Añade la
// dote y sube lo justo para cumplir su requisito (Combate Melee 1; Combate Sutil, también
// Agilidad 1), sin tocar nada más de la ficha.
type DoteDeArma = "dote_bloqueo" | "dote_combate_sutil";
function conDotes(s: Sheet, ...ids: DoteDeArma[]): Sheet {
  const cm = s.habilidades.combate_melee;
  return {
    ...s,
    atributos: ids.includes("dote_combate_sutil") ? { ...s.atributos, agilidad: Math.max(s.atributos.agilidad, 1) } : s.atributos,
    habilidades: { ...s.habilidades, combate_melee: { ...cm, valor: Math.max(cm.valor, 1) } },
    dotes: [...s.dotes, ...ids.map((id) => ({ id }))],
  };
}

// Ficha de trabajo: se parte de la de por defecto y se tocan atributos sueltos.
function ficha(patch: { atributos?: Partial<Sheet["atributos"]> }): Sheet {
  const s = defaultSheet();
  return { ...s, atributos: { ...s.atributos, ...patch.atributos } };
}

function opcion(c: CondicionTirada | undefined, id: string) {
  assert.ok(c && c.tipo === "opcion", "no es una condición de opción");
  const o = c.opciones.find((x) => x.id === id);
  assert.ok(o, `no existe la opción ${id}`);
  return o.valor;
}

function opcionNota(c: CondicionTirada | undefined, id: string) {
  assert.ok(c && c.tipo === "opcion", "no es una condición de opción");
  const o = c.opciones.find((x) => x.id === id);
  assert.ok(o, `no existe la opción ${id}`);
  return o.nota;
}

// Concede 1 unidad de cada tipo de granada del catálogo — para los tests de
// Lanzagranadas que quieren ver el selector completo, sin depender de cuáles
// concede cada test suelto.
function conTodasLasGranadas(sheet: Sheet): Sheet {
  return MUNICION_GRANADA.reduce((s, g) => ajustarGranada(s, g.id, 1), sheet);
}

describe("sin nada equipado", () => {
  test("no aparece ningún ataque, ni siquiera puñetazo o patada", () => {
    assert.deepEqual(accionesDeAtaque(defaultSheet()), []);
  });
});

describe("pelea (puñetazo, patada, codazo)", () => {
  test("solo aparece si el jugador la equipa, como cualquier otra arma", () => {
    let sheet = conDotes(defaultSheet(), "dote_bloqueo");
    sheet = equipar(sheet, { instanciaId: "p1", catalogoId: "pelea_punetazo" });
    const labels = accionesDeAtaque(sheet).map((t) => t.label);
    assert.deepEqual(labels, ["Golpear con Puñetazo", "Bloquear con Puñetazo"]);
  });

  test("el puñetazo tiene dos modos y su condición de modo", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "p1", catalogoId: "pelea_punetazo" });
    const [punetazo] = accionesDeAtaque(sheet);
    const modo = punetazo.condiciones?.find((c) => c.id === "modo");
    assert.equal(opcion(modo, "0"), 0); // Simple
    assert.equal(opcion(modo, "1"), 0); // Estándar
  });

  test("sin Malla Plasmática equipada, no hay toggle de sacrificio de colchón", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "p1", catalogoId: "pelea_punetazo" });
    const [punetazo] = accionesDeAtaque(sheet);
    assert.equal(punetazo.condiciones?.find((c) => c.id === "sacrificio_colchon_menor"), undefined);
  });

  // Subsistema: necesita host (armadura) para que equipar() no la descarte
  // en silencio — mismo patrón que conProyectorPulso() más abajo.
  function conMallaPlasmatica(sheet: Sheet, nivel: number) {
    let s = equipar(sheet, { instanciaId: "a1", catalogoId: "armadura_pesada" });
    s = equipar(s, { instanciaId: "mp1", catalogoId: "malla_plasmatica", nivel, instaladoEnId: "a1" });
    return s;
  }

  test("con Malla Plasmática nivel 1, el puñetazo y la patada ganan el sacrificio menor (no el mayor)", () => {
    let sheet = conMallaPlasmatica(defaultSheet(), 1);
    sheet = equipar(sheet, { instanciaId: "p1", catalogoId: "pelea_punetazo" });
    sheet = equipar(sheet, { instanciaId: "p2", catalogoId: "pelea_patada" });
    const golpes = accionesDeAtaque(sheet).filter((t) => t.label.startsWith("Golpear"));
    assert.equal(golpes.length, 2);
    for (const golpe of golpes) {
      const menor = golpe.condiciones?.find((c) => c.id === "sacrificio_colchon_menor");
      assert.equal(menor?.tipo, "toggle", `${golpe.label} debería tener el sacrificio menor`);
      if (menor?.tipo === "toggle") assert.match(menor.nota ?? "", /dificultad de absorción 7/);
      assert.equal(golpe.condiciones?.find((c) => c.id === "sacrificio_colchon_mayor"), undefined);
    }
  });

  test("con Malla Plasmática nivel 3+, se suma el sacrificio mayor", () => {
    let sheet = conMallaPlasmatica(defaultSheet(), 3);
    sheet = equipar(sheet, { instanciaId: "p1", catalogoId: "pelea_punetazo" });
    const [punetazo] = accionesDeAtaque(sheet);
    assert.ok(punetazo.condiciones?.find((c) => c.id === "sacrificio_colchon_menor"));
    assert.ok(punetazo.condiciones?.find((c) => c.id === "sacrificio_colchon_mayor"));
  });

  test("R7: desde el nivel 3, el plasma liberado causa shock y llamarada (5 + nivel) y en crítico fusión (7 + nivel)", () => {
    let sheet = conMallaPlasmatica(defaultSheet(), 4);
    sheet = equipar(sheet, { instanciaId: "p1", catalogoId: "pelea_punetazo" });
    const [punetazo] = accionesDeAtaque(sheet);
    for (const id of ["sacrificio_colchon_menor", "sacrificio_colchon_mayor"]) {
      const c = punetazo.condiciones?.find((x) => x.id === id);
      assert.ok(c?.tipo === "toggle");
      assert.match(c.nota ?? "", /Causa shock y llamarada \(dificultad 9\); en crítico, fusión \(dificultad 11\)\./, id);
      assert.doesNotMatch(c.nota ?? "", /dificultad de absorción/, id);
    }
  });

  test("un arma melee normal (no desarmada) no gana el sacrificio aunque haya Malla equipada", () => {
    let sheet = conMallaPlasmatica(defaultSheet(), 1);
    sheet = equipar(sheet, { instanciaId: "e1", catalogoId: "espada_cuchillo_combate" });
    const golpe = accionesDeAtaque(sheet).find((t) => t.label.startsWith("Golpear"));
    assert.equal(golpe?.condiciones?.find((c) => c.id === "sacrificio_colchon_menor"), undefined);
  });
});

describe("arma de fuego equipada", () => {
  test("genera una fila 'Disparar con...' con la distancia por defecto", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_precision_plaga" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Plaga");
    assert.ok(fila);
    assert.equal(fila!.ataque?.modos[0].danio, 16);
    assert.equal(fila!.ataque?.modos[0].categoriaDanio, "Plasma");
  });

  test("un fusil de precisión cambia el +2 de corta por -2", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_precision_plaga" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Plaga")!;
    const tramo = fila.condiciones?.find((c) => c.id === "tramo");
    assert.equal(opcion(tramo, "bocajarro"), 4);
    assert.equal(opcion(tramo, "corta"), -2);
    assert.equal(opcion(tramo, "media"), 0);
    assert.equal(opcion(tramo, "larga"), -2);
  });

  test("una escopeta suma +1 a corta y bocajarro", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "escopeta_feritas" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Feritas")!;
    const tramo = fila.condiciones?.find((c) => c.id === "tramo");
    assert.equal(opcion(tramo, "bocajarro"), 5);
    assert.equal(opcion(tramo, "corta"), 3);
    assert.equal(opcion(tramo, "media"), 0);
    assert.equal(opcion(tramo, "larga"), -2);
  });

  test("Derribo: nota condicionada a Corta/Bocajarro, no un texto siempre presente (Feritas)", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "escopeta_feritas" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Feritas")!;
    const tramo = fila.condiciones?.find((c) => c.id === "tramo");
    // T3a: la nota sale del efecto del catálogo (derriboCercano), con la salvación del estado.
    assert.match(opcionNota(tramo, "bocajarro")!, /Derribado: si aciertas, el objetivo salva Saltar, levantarse .* contra 9/);
    assert.match(opcionNota(tramo, "corta")!, /Derribado.*contra 9/);
    assert.equal(opcionNota(tramo, "media"), undefined);
    assert.equal(opcionNota(tramo, "larga"), undefined);
    assert.equal(fila.nota, "Crítico de Aturdimiento (12)");
  });

  // Cambió con el cuestionario eq-12 (usuario, 2026-11-13): manda la fila, que no trae Derribo.
  // Antes (2026-09-25) se les daba 9 y 11 por la regla de familia.
  test("Plasma SG y Plasma AAA no derriban (eq-12)", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "escopeta_plasma_sc" });
    sheet = equipar(sheet, { instanciaId: "arma2", catalogoId: "ametralladora_plasma_aaa" });
    const plasmaSg = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Plasma SG")!;
    const plasmaAaa = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Plasma AAA")!;
    assert.equal(opcionNota(plasmaSg.condiciones?.find((c) => c.id === "tramo"), "corta"), undefined);
    assert.doesNotMatch(opcionNota(plasmaAaa.condiciones?.find((c) => c.id === "tramo"), "bocajarro") ?? "", /Derrib/);
    assert.ok(!plasmaSg.efectosObjetivo?.some((e) => e.tipo === "salvacion" && e.estadoId === "derribado"));
  });

  test("un arma sin Derribo no lleva nota de Derribo en ningún tramo (Plaga)", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_precision_plaga" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Plaga")!;
    const tramo = fila.condiciones?.find((c) => c.id === "tramo");
    assert.equal(opcionNota(tramo, "bocajarro"), undefined);
    assert.equal(opcionNota(tramo, "corta"), undefined);
  });

  test("arma con F. Auto: a bocajarro avisa del +3 a la esquiva del objetivo; sin F. Auto, no (2026-10-24)", () => {
    let sheet = equipar(defaultSheet(), { instanciaId: "fa", catalogoId: "fusil_asalto_impetus" });
    sheet = equipar(sheet, { instanciaId: "fp", catalogoId: "fusil_precision_plaga" });
    const tramoDe = (label: string) => accionesDeAtaque(sheet).find((t) => t.label === label)!.condiciones?.find((c) => c.id === "tramo");
    assert.match(opcionNota(tramoDe("Disparar con Impetus"), "bocajarro")!, /F\. Auto, \+3 a la dificultad de esquiva/);
    assert.equal(opcionNota(tramoDe("Disparar con Impetus"), "corta"), undefined);
    assert.equal(opcionNota(tramoDe("Disparar con Plaga"), "bocajarro"), undefined);
  });

  test("Derribo y F. Auto a bocajarro van juntos en la misma nota", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "am", catalogoId: "ametralladora_asina" });
    const tramo = accionesDeAtaque(sheet).find((t) => t.id === "ataque_fuego_am")!.condiciones?.find((c) => c.id === "tramo");
    // T3a: la nota del Derribo sale del efecto («Derribado: si aciertas…»).
    assert.match(opcionNota(tramo, "bocajarro")!, /Derribado.*F\. Auto, \+3/);
  });

  // S96: «ocupando dos casillas adyacentes» (pistolas, escopetas, subfusiles, fusiles de asalto y
  // de precisión) y «4 casillas adyacentes» (ametralladoras), docs/fuente/equipamiento.md.
  test("el modo F. Auto lleva su área según el tipo de arma: 2 casillas, 4 en ametralladoras (S96)", () => {
    let sheet = equipar(defaultSheet(), { instanciaId: "pi", catalogoId: "pistola_sydiasi" });
    sheet = equipar(sheet, { instanciaId: "fa", catalogoId: "fusil_asalto_impetus" });
    sheet = equipar(sheet, { instanciaId: "am", catalogoId: "ametralladora_asina" });
    const modoDe = (id: string) => accionesDeAtaque(sheet).find((t) => t.id === id)!.condiciones?.find((c) => c.id === "modo");
    assert.equal(opcionNota(modoDe("ataque_fuego_pi"), "1"), "Ataque en área: 2 casillas adyacentes.");
    assert.equal(opcionNota(modoDe("ataque_fuego_fa"), "1"), "Ataque en área: 2 casillas adyacentes.");
    assert.equal(opcionNota(modoDe("ataque_fuego_am"), "1"), "Ataque en área: 4 casillas adyacentes.");
    assert.equal(opcionNota(modoDe("ataque_fuego_pi"), "0"), undefined); // el modo Simple, sin área
  });

  test("un arma con dos modos trae la condición de modo", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "pistola_sydiasi" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Sydiasi")!;
    const modo = fila.condiciones?.find((c) => c.id === "modo");
    assert.equal(opcion(modo, "0"), -3); // Simple
    assert.equal(opcion(modo, "1"), -4); // Estándar (F. Auto)
    assert.equal(fila.ataque?.modos[1].danio, 11);
  });
});

// El aviso de "no te llega" ya no vive en `nota`/`opciones[].nota` (docs/
// prompt-gasto-recursos.md, feedback del usuario 2026-09-28: no se
// recalculaba si el jugador cambiaba de modo dentro del propio modal) — es
// avisoInsuficiente() (acciones.ts), reactivo al estado en vivo del modal.
// Aquí solo queda comprobar que combate.ts ya NO ensucia esos campos con
// texto de aviso — la lógica del aviso en sí se prueba en acciones.test.ts.
describe("nota limpia de aviso de munición (RECURSOS) — el aviso vive en avisoInsuficiente()", () => {
  test("con menos balas de las que pide F. Auto, ninguna opción lleva nota de aviso", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "pistola_sydiasi" });
    sheet = ajustarRecurso(sheet, "arma1", -15); // 5/20 — no llega a los 20 de F. Auto
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Sydiasi")!;
    const modo = fila.condiciones?.find((c) => c.id === "modo");
    assert.ok(modo?.tipo === "opcion");
    if (modo?.tipo === "opcion") {
      assert.equal(modo.opciones.find((o) => o.id === "0")?.nota, undefined);
      // Solo el área del F. Auto (S96), nada de aviso de munición.
      assert.equal(modo.opciones.find((o) => o.id === "1")?.nota, "Ataque en área: 2 casillas adyacentes.");
    }
  });

  test("un arma con un único modo, sin balas, no lleva ningún aviso en su nota general", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "pistola_mosquito" }); // sin F. Auto
    sheet = ajustarRecurso(sheet, "arma1", -7); // 0/7
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Mosquito")!;
    assert.doesNotMatch(fila.nota ?? "", /balas/);
  });

  test("sin selector de modo, la dificultad del único modo no se pierde: llega como ajustesFijos", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "pistola_mosquito" }); // Simple, dificultad -3
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Mosquito")!;
    assert.equal(fila.condiciones?.find((c) => c.id === "modo"), undefined);
    assert.deepEqual(fila.ajustesFijos, [{ valor: -3, fuente: "Mosquito" }]);
  });

  test("con selector de modo, la dificultad sigue viviendo en la condición, no se duplica en ajustesFijos", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "pistola_sydiasi" }); // Simple + F. Auto
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Sydiasi")!;
    assert.notEqual(fila.condiciones?.find((c) => c.id === "modo"), undefined);
    assert.deepEqual(fila.ajustesFijos, []);
  });
});

describe("gasto por modo (docs/prompt-gasto-recursos.md, Fase 1)", () => {
  test("recursoInstanciaId apunta a la instancia del arma", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "pistola_mosquito" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Mosquito")!;
    assert.equal(fila.recursoInstanciaId, "arma1");
  });

  test("un único modo (sin F. Auto) gasta 1 bala", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "pistola_mosquito" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Mosquito")!;
    assert.equal(fila.ataque?.modos[0].gasto, 1);
  });

  test("Sydiasi en F. Auto gasta sus 3 disparos, Simple sigue gastando 1", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "pistola_sydiasi" }); // 20 balas
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Sydiasi")!;
    assert.equal(fila.ataque?.modos[0].gasto, 1); // Simple
    assert.equal(fila.ataque?.modos[1].gasto, 3); // Estándar (F. Auto): "consume 3 disparos del cargador"
  });

  function conProyectorPulso(nivel: number) {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "a1", catalogoId: "armadura_pesada" });
    sheet = equipar(sheet, { instanciaId: "pp1", catalogoId: "proyector_pulso", nivel, instaladoEnId: "a1" });
    return sheet;
  }

  test("Proyector de Pulso: cada modo gasta las cargas de GASTO_MODO_PULSO", () => {
    const sheet = conProyectorPulso(1);
    const fila = accionesDeAtaque(sheet).find((t) => t.label.startsWith("Disparar Proyector de Pulso"))!;
    assert.equal(fila.recursoInstanciaId, "pp1");
    assert.equal(fila.ataque?.modos.find((m) => m.id === "pulso")?.gasto, 1);
    assert.equal(fila.ataque?.modos.find((m) => m.id === "pulso_cargado")?.gasto, 1); // sync Drive 2026-11-14 (antes 4)
    assert.equal(fila.ataque?.modos.find((m) => m.id === "barrido")?.gasto, 2); // sync Drive 2026-11-14 (antes 5)
  });

  // Sync Drive 2026-11-14: Pulso Cargado 1 carga y 11 + N; Barrido 2 cargas y área 10 + N.
  test("Pulso Cargado y Barrido: gasto al confirmar y daño por nivel", () => {
    const fila = accionesDeAtaque(conProyectorPulso(1)).find((t) => t.label.startsWith("Disparar Proyector de Pulso"))!;
    assert.equal(gastoTotal(fila, "pulso_cargado", {}), 1);
    assert.equal(gastoTotal(fila, "barrido", {}), 2);
    assert.equal(fila.ataque?.modos.find((m) => m.id === "pulso_cargado")?.danio, 12);
    assert.equal(fila.ataque?.modos.find((m) => m.id === "barrido")?.danio, 11);
    assert.equal(fila.ataque?.modos.find((m) => m.id === "pulso_cargado")?.disparoPulso, undefined);
  });

  // Sync Drive 2026-11-14: «1 carga × 3 disparos», con el contador en la pieza (usuario).
  test("Pulso: 1 carga cada 3 disparos — el primero la gasta, los dos siguientes no, el cuarto otra", () => {
    let sheet = reconciliarRecursos(conProyectorPulso(1));
    const carga = () => recursoDe(sheet, "pp1")!.actual;
    const pulso = () =>
      accionesDeAtaque(sheet).find((t) => t.label.startsWith("Disparar Proyector de Pulso"))!.ataque!.modos.find((m) => m.id === "pulso")!;
    assert.equal(carga(), 10);
    const gastos: number[] = [];
    for (let i = 0; i < 4; i++) {
      assert.equal(pulso().disparoPulso, true);
      gastos.push(pulso().gasto!);
      sheet = dispararPulso(sheet, "pp1");
    }
    assert.deepEqual(gastos, [1, 0, 0, 1]);
    assert.equal(carga(), 8);
    assert.equal(sheet.equipo.find((p) => p.instanciaId === "pp1")!.disparosPulso, 1);
  });

  test("Pulso: recargar pone el contador a 0 y el siguiente disparo vuelve a gastar", () => {
    let sheet = dispararPulso(reconciliarRecursos(conProyectorPulso(1)), "pp1");
    assert.equal(sheet.equipo.find((p) => p.instanciaId === "pp1")!.disparosPulso, 1);
    sheet = comprarRecarga(sheet, "pp1")!.sheet;
    assert.equal(sheet.equipo.find((p) => p.instanciaId === "pp1")!.disparosPulso, undefined);
    assert.equal(recursoDe(sheet, "pp1")!.actual, 10);
    sheet = dispararPulso(sheet, "pp1");
    assert.equal(recursoDe(sheet, "pp1")!.actual, 9);
  });

  test("Pulso: daño 8 + nivel", () => {
    const fila = accionesDeAtaque(conProyectorPulso(1)).find((t) => t.label.startsWith("Disparar Proyector de Pulso"))!;
    assert.equal(fila.ataque?.modos.find((m) => m.id === "pulso")?.danio, 9);
  });

  test("el contador se lee tolerante: fuera de rango se pierde, la pieza no", () => {
    const sheet = conProyectorPulso(1);
    const crudo = { ...sheet, equipo: sheet.equipo.map((p) => (p.instanciaId === "pp1" ? { ...p, disparosPulso: 7 } : p)) };
    const leida = parseSheet(JSON.parse(JSON.stringify(crudo)));
    const pieza = leida.equipo.find((p) => p.instanciaId === "pp1")!;
    assert.equal(pieza.catalogoId, "proyector_pulso");
    assert.equal(pieza.disparosPulso, undefined);
    const buena = { ...sheet, equipo: sheet.equipo.map((p) => (p.instanciaId === "pp1" ? { ...p, disparosPulso: 2 } : p)) };
    assert.equal(parseSheet(JSON.parse(JSON.stringify(buena))).equipo.find((p) => p.instanciaId === "pp1")!.disparosPulso, 2);
  });

  // Sync Drive 2026-11-14: «1 carga × nivel en turnos»; fuera la «Duración: Nivel».
  test("Aguijón: 1 carga lo mantiene N turnos (nivel), sin la duración de efecto de antes", () => {
    for (const nivel of [1, 3]) {
      const fila = accionesDeAtaque(conProyectorPulso(nivel)).find((t) => t.label === "Golpear con Proyector de Pulso (Aguijón)")!;
      assert.match(fila.nota ?? "", new RegExp(`1 carga lo mantiene ${nivel} turno\\(s\\)`));
      assert.doesNotMatch(fila.nota ?? "", /Duración/);
    }
  });

  test("Golpear con Proyector de Pulso (Aguijón) gasta 1 carga", () => {
    const sheet = conProyectorPulso(1);
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Golpear con Proyector de Pulso (Aguijón)")!;
    assert.equal(fila.recursoInstanciaId, "pp1");
    assert.equal(fila.ataque?.modos[0].gasto, 1);
  });

  test("Bloquear con Proyector de Pulso (Aguijón) es gratis: sin recursoInstanciaId", () => {
    const sheet = conDotes(conProyectorPulso(1), "dote_bloqueo");
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Bloquear con Proyector de Pulso (Aguijón)")!;
    assert.equal(fila.recursoInstanciaId, undefined);
  });
});

describe("ignora blindaje (aviso en el resultado del daño)", () => {
  test("el Puñal de Kerzul lleva ignoraBlindaje en Golpear y en Lanzar, fuera de la nota", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "p1", catalogoId: "kerzul_punal" });
    const acciones = accionesDeAtaque(sheet);
    for (const id of ["ataque_melee_p1", "lanzar_melee_p1"]) {
      const a = acciones.find((t) => t.id === id)!;
      assert.deepEqual(a.ignoraBlindaje, { valor: 2, fuente: "Puñal de Kerzul" });
      assert.doesNotMatch(a.nota ?? "", /Ignora/);
    }
  });

  test("las 10 armas de Kerzul, y solo ellas, ignoran blindaje", () => {
    const con = EQUIPO.filter((e) => e.familia === "armaMelee" && e.ignoraBlindaje !== undefined).map((e) => e.id);
    assert.equal(con.length, 10);
    assert.ok(con.every((id) => id.startsWith("kerzul_")));
  });

  test("un arma normal no lo lleva", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "e1", catalogoId: "espada" });
    assert.equal(accionesDeAtaque(sheet).find((t) => t.id === "ataque_melee_e1")!.ignoraBlindaje, undefined);
  });

  test("la munición perforante lo trae en su entrada de municionesEspeciales", () => {
    let sheet = equipar(defaultSheet(), { instanciaId: "s1", catalogoId: "pistola_sydiasi" });
    sheet = equipar(sheet, { instanciaId: "ad1", catalogoId: "municion_especial_perforante", nivel: 1, instaladoEnId: "s1" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Sydiasi")!;
    assert.equal(fila.municionesEspeciales?.[0].ignoraBlindaje, 2);
  });
});

describe("munición especial en el disparo (fase 2)", () => {
  // Sydiasi: Simple (1 bala) / Estándar F. Auto (20).
  function conSydiasiIncendiaria(stock: number) {
    let sheet = equipar(defaultSheet(), { instanciaId: "s1", catalogoId: "pistola_sydiasi" });
    sheet = equipar(sheet, { instanciaId: "ad1", catalogoId: "municion_especial_incendiaria", nivel: 1, instaladoEnId: "s1" });
    return ajustarMunicionEspecial(sheet, "incendiaria", stock);
  }
  const disparo = (sheet: Sheet) => accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Sydiasi")!;

  // T3a: el crítico ya no es texto sacado de `especial` (criticoDeEspecial, retirado): es dato.
  test("crítico de arma de fuego: va como efecto sobre el objetivo, no como texto", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "s1", catalogoId: "pistola_sydiasi" });
    assert.equal(disparo(sheet).efectoCritico, undefined);
    assert.equal(critico(disparo(sheet)), "aturdido (8)");
    assert.equal(disparo(sheet).efectosObjetivo?.[0].fuente, "Sydiasi");
  });

  // eq-05: con munición especial, el crítico del arma y el de la munición; la Perforante sustituye.
  test("crítico con munición especial: el del arma y el de la munición, o solo el de la Perforante", () => {
    const fila = disparo(conSydiasiIncendiaria(10));
    const exito = { exito: true, critico: true, dificultad: 7 };
    const saltan = (municion: string) => efectosQueSaltan(fila, { municion }, exito).map(resumenEfecto);
    assert.deepEqual(saltan("incendiaria"), ["aturdido (8)", "llamarada (7)", "ceguera (10)"]);
    assert.deepEqual(saltan("normal"), ["aturdido (8)"]);
    const perforante = {
      id: "perforante",
      label: "Munición Perforante",
      stock: 1,
      ajusteDanio: -1,
      efecto: "",
      efectosObjetivo: [{ tipo: "texto" as const, texto: "Consume 1 punto de blindaje del objetivo", cuando: "critico" as const, fuente: "Munición Perforante" }],
      sustituyeCritico: true,
    };
    const conPerforante = { ...fila, municionesEspeciales: [perforante] };
    assert.deepEqual(efectosQueSaltan(conPerforante, { municion: "perforante" }, exito).map(resumenEfecto), ["Consume 1 punto de blindaje del objetivo"]);
  });

  test("sin adaptador no hay selector de munición", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "s1", catalogoId: "pistola_sydiasi" });
    assert.equal(disparo(sheet).condiciones?.some((c) => c.id === "municion"), false);
    assert.equal(disparo(sheet).municionesEspeciales, undefined);
  });

  test("con adaptador: selector Normal + el tipo, con su stock y su efecto en la nota", () => {
    const fila = disparo(conSydiasiIncendiaria(10));
    const c = fila.condiciones?.find((x) => x.id === "municion");
    assert.ok(c && c.tipo === "opcion");
    assert.equal(c.porDefecto, "normal");
    const inc = c.opciones.find((o) => o.id === "incendiaria")!;
    assert.equal(inc.etiqueta, "Incendiaria (10)");
    assert.equal(inc.valor, 0);
    assert.match(inc.nota ?? "", /^\+1 daño Fuego\. .*Llamarada \(7\)/);
    assert.deepEqual(fila.municionesEspeciales?.map((m) => [m.id, m.stock, m.ajusteDanio]), [["incendiaria", 10, 1]]);
    assert.equal(fila.municionesEspeciales?.[0].tipoDanio, "fuego");
  });

  test("D2: el +1 Fuego va aparte del daño del arma, con su gravedad (2026-10-24)", () => {
    const fila = disparo(conSydiasiIncendiaria(10));
    const modo = fila.ataque!.modos[0];
    const inc = municionEspecialElegida(fila, { municion: "incendiaria" });
    const r = danioConMunicion(modo, inc);
    assert.equal(r.sumaBase, 0);
    assert.deepEqual(r.danioExtra, [{ tipo: "fuego", valor: 1, fuente: "Munición Incendiaria", gravedadPropia: true }]);
    const d = desgloseDanio(8, modo.tipoDanio, r.danioExtra)!;
    assert.deepEqual(d.partes, [
      { tipo: "cinetico", label: "Cinético", valor: 8 },
      { tipo: "fuego", label: "Fuego", valor: 1, categoria: "Grave" },
    ]);
    assert.equal(d.total, 9);
  });

  test("D2: sin tipo propio (Perforante) o munición normal, se suma al básico como antes", () => {
    let sheet = equipar(defaultSheet(), { instanciaId: "s1", catalogoId: "pistola_sydiasi" });
    sheet = equipar(sheet, { instanciaId: "ad1", catalogoId: "municion_especial_perforante", nivel: 1, instaladoEnId: "s1" });
    const fila = disparo(ajustarMunicionEspecial(sheet, "perforante", 5));
    const modo = fila.ataque!.modos[0];
    assert.deepEqual(danioConMunicion(modo, municionEspecialElegida(fila, { municion: "perforante" })), { sumaBase: -1, danioExtra: undefined });
    assert.deepEqual(danioConMunicion(modo, municionEspecialElegida(fila, { municion: "normal" })), { sumaBase: 0, danioExtra: undefined });
  });

  test("D2: criogénica en crítico, el Frío pasa a Letal (categoriaCritico)", () => {
    const frio = [{ tipo: "frio" as const, valor: 1, fuente: "Munición Criogénica", gravedadPropia: true as const }];
    assert.equal(desgloseDanio(8, undefined, frio)!.partes[1].categoria, "No Letal");
    assert.equal(desgloseDanio(8, undefined, frio, true)!.partes[1].categoria, "Letal");
  });

  test("munición normal: gasta del cargador, nada del stock especial", () => {
    const fila = disparo(conSydiasiIncendiaria(10));
    const estado = { municion: "normal", modo: "0" };
    assert.equal(gastoTotal(fila, "0", estado), 1);
    assert.equal(gastoMunicionEspecial(fila, "0", estado), null);
  });

  test("munición especial: el cargador no se toca, el modo gasta del stock (F. Auto de la Sydiasi = 3)", () => {
    const fila = disparo(conSydiasiIncendiaria(30));
    assert.equal(gastoTotal(fila, "0", { municion: "incendiaria" }), 0);
    assert.deepEqual(gastoMunicionEspecial(fila, "0", { municion: "incendiaria" }), { id: "incendiaria", cantidad: 1 });
    assert.deepEqual(gastoMunicionEspecial(fila, "1", { municion: "incendiaria" }), { id: "incendiaria", cantidad: 3 });
  });

  test("aviso si el stock especial no llega, contra el stock y no contra el cargador", () => {
    const fila = disparo(conSydiasiIncendiaria(2));
    const recurso = { actual: 20, max: 20 };
    assert.equal(avisoInsuficiente(fila, "0", { municion: "incendiaria" }, recurso), undefined);
    assert.match(
      avisoInsuficiente(fila, "1", { municion: "incendiaria" }, recurso) ?? "",
      /Solo quedan 2 de munición incendiaria — esto gasta 3/,
    );
  });
});

describe("mejoras que afectan a la distancia", () => {
  test("fusil de precisión: la mira integrada no suma bono aparte (ya está en la dificultad)", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "f1", catalogoId: "fusil_precision_telum" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Telum")!;
    assert.deepEqual(fila.bonosTramo, []);
  });

  // td-06 (2026-11-13): la integrada ya no se resta a mano de la mira instalada; va en
  // `yaIncluidos` y montarTirada deja que todo su grupo (mira, Ojo Biónico) aporte solo lo que la
  // supera. Antes estos dos tests miraban los bonos ya restados; ahora, la tirada montada.
  const tiradaTelum = (sheet: Sheet, tramo: string) => {
    const f = resolverFicha(sheet, { estados: [], vitalidad: VITALIDAD_DE_FICHA });
    const t = conExtrasDeFicha(f, accionesDeAtaqueCon(sheet, f.modificadores, f.extrasDotes.permisos).find((x) => x.label === "Disparar con Telum")!);
    return montarTirada(f, t, { ...SIN_ELECCION, estadoCondiciones: { tramo, modo: "0" } });
  };
  const visionEn = (m: ReturnType<typeof tiradaTelum>) => m.desglose.filter((l) => /Mira Telescópica|Ojo Biónico/.test(l.etiqueta));

  test("fusil de precisión con mira nv3: solo el +1 que supera a la integrada nv1", () => {
    let sheet = equipar(defaultSheet(), { instanciaId: "f1", catalogoId: "fusil_precision_telum" });
    sheet = equipar(sheet, { instanciaId: "m1", catalogoId: "mira_telescopica", nivel: 3, instaladoEnId: "f1" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Telum")!;
    assert.deepEqual(fila.yaIncluidos, [{ fuente: "la Mira Telescópica 1 integrada", porTramo: { media: 1, larga: 1 }, noApila: "vision_aumentada" }]);
    assert.deepEqual(visionEn(tiradaTelum(sheet, "media")), [
      { etiqueta: "Mira Telescópica (solo lo que supera a la Mira Telescópica 1 integrada)", valor: 1 },
    ]);
  });

  test("fusil de precisión con mira nv2: sin bono de tramo extra (nv2 no mejora el +1)", () => {
    let sheet = equipar(defaultSheet(), { instanciaId: "f1", catalogoId: "fusil_precision_telum" });
    sheet = equipar(sheet, { instanciaId: "m1", catalogoId: "mira_telescopica", nivel: 2, instaladoEnId: "f1" });
    const m = tiradaTelum(sheet, "media");
    assert.equal(visionEn(m).reduce((t, l) => t + l.valor, 0), 0);
    assert.match(visionEn(m)[0].etiqueta, /no supera a la Mira Telescópica 1 integrada/);
  });

  test("td-06: el Ojo Biónico solo suma lo que supera a la mira integrada (a media y larga)", () => {
    // Los aumentos no pasan por equipar (Tienda): van directos al equipo, como en el resto de tests.
    const conAumento = (s: Sheet, nivel: number): Sheet => ({ ...s, equipo: [...s.equipo, { instanciaId: "o1", catalogoId: "aum_ojo_bionico", nivel }] });
    const conOjo = (nivel: number) => conAumento(equipar(defaultSheet(), { instanciaId: "f1", catalogoId: "fusil_precision_telum" }), nivel);
    // Ojo 1 (+1) no supera a la integrada (+1) a media; a corta la mira no da nada y el Ojo suma entero.
    assert.equal(visionEn(tiradaTelum(conOjo(1), "media")).reduce((t, l) => t + l.valor, 0), 0);
    assert.equal(visionEn(tiradaTelum(conOjo(1), "corta")).reduce((t, l) => t + l.valor, 0), 1);
    // Ojo 3 (+2): +1 a media.
    const m = tiradaTelum(conOjo(3), "media");
    assert.equal(visionEn(m).reduce((t, l) => t + l.valor, 0), 1);
    assert.ok(visionEn(m).some((l) => /^Ojo Biónico.*solo lo que supera a la Mira Telescópica 1 integrada/.test(l.etiqueta)));
    // En un fusil sin mira integrada, el Ojo 3 suma su +2 entero.
    const asalto = conAumento(equipar(defaultSheet(), { instanciaId: "f1", catalogoId: "fusil_asalto_impetus" }), 3);
    const f = resolverFicha(asalto, { estados: [], vitalidad: VITALIDAD_DE_FICHA });
    const t = accionesDeAtaqueCon(asalto, f.modificadores, f.extrasDotes.permisos).find((x) => x.label === "Disparar con Impetus")!;
    const montada = montarTirada(f, t, { ...SIN_ELECCION, estadoCondiciones: { tramo: "media", modo: "0" } });
    assert.equal(montada.desglose.filter((l) => /Ojo Biónico/.test(l.etiqueta)).reduce((s, l) => s + l.valor, 0), 2);
  });

  test("la mira telescópica nivel 1 no toca el tramo: sale como bono aparte, con su fuente", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_asalto_impetus" });
    sheet = equipar(sheet, {
      instanciaId: "mira1",
      catalogoId: "mira_telescopica",
      nivel: 1,
      instaladoEnId: "arma1",
    });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Impetus")!;
    const tramo = fila.condiciones?.find((c) => c.id === "tramo");
    assert.equal(opcion(tramo, "corta"), 2);
    assert.equal(opcion(tramo, "media"), 0);
    assert.equal(opcion(tramo, "larga"), -2);
    assert.deepEqual(fila.bonosTramo, [
      { fuente: "Mira Telescópica", porTramo: { media: 1, larga: 1 }, noApila: "vision_aumentada", origen: { tipo: "equipo", id: "mira_telescopica", label: "Mira Telescópica", instanciaId: "mira1" } },
    ]);
  });

  test("la mira telescópica nivel 3 da +2, no +1 encima del nivel 1", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_asalto_impetus" });
    sheet = equipar(sheet, {
      instanciaId: "mira1",
      catalogoId: "mira_telescopica",
      nivel: 3,
      instaladoEnId: "arma1",
    });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Impetus")!;
    assert.deepEqual(fila.bonosTramo, [
      { fuente: "Mira Telescópica", porTramo: { media: 2, larga: 2 }, noApila: "vision_aumentada", origen: { tipo: "equipo", id: "mira_telescopica", label: "Mira Telescópica", instanciaId: "mira1" } },
    ]);
  });

  test("el bono de la mira solo cuenta en el tramo elegido", () => {
    const bonos = [{ fuente: "Mira Telescópica", porTramo: { media: 1, larga: 1 } }];
    assert.equal(valorBonosTramo(bonos, { tramo: "corta" }), 0);
    assert.equal(valorBonosTramo(bonos, { tramo: "media" }), 1);
    assert.equal(valorBonosTramo(bonos, { tramo: "larga" }), 1);
  });

  test("el bípode aparece como toggle 'apoyado'", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_asalto_impetus" });
    sheet = equipar(sheet, {
      instanciaId: "bipode1",
      catalogoId: "bipode",
      nivel: 1,
      instaladoEnId: "arma1",
    });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Impetus")!;
    const apoyado = fila.condiciones?.find((c) => c.id === "apoyado");
    assert.ok(apoyado && apoyado.tipo === "toggle");
    assert.equal(apoyado.valorActivo, 1);
    assert.equal(apoyado.valorInactivo, -1);
  });
});

describe("Accion.efectos (objetivo_tercero / tirada propia distinta, docs/sistema.md 25b revertida 2026-09-24)", () => {
  test("Puntero Láser: el -2 sigilo es un efecto listado, no un toggle que se cuele en la tirada de ataque", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_asalto_impetus" });
    sheet = equipar(sheet, {
      instanciaId: "p1",
      catalogoId: "puntero_laser",
      nivel: 1,
      instaladoEnId: "arma1",
    });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Impetus")!;
    // Solo queda el toggle del +1 al ataque — el de -2 sigilo (con alcance)
    // ya no existe como condición, así que no puede colarse aquí.
    assert.equal(fila.condiciones?.filter((c) => c.id.startsWith("activo")).length, 1);
    assert.deepEqual(fila.efectos, [
      {
        fuente: "Puntero Láser",
        texto: "Con el puntero activo: -2 a tu Sigilo (percepción visual).",
        origen: { tipo: "equipo", id: "puntero_laser", label: "Puntero Láser", instanciaId: "p1" },
      },
    ]);
    assert.doesNotMatch(fila.nota ?? "", /Sigilo/);
  });

  test("Puntero Láser 2 con Ojo Biónico o Mira 3 en el arma: sin aviso de -2 al Sigilo (2026-10-24)", () => {
    const base = () => {
      const s = equipar(defaultSheet(), { instanciaId: "arma1", catalogoId: "fusil_asalto_impetus" });
      return equipar(s, { instanciaId: "p1", catalogoId: "puntero_laser", nivel: 2, instaladoEnId: "arma1" });
    };
    const efectos = (s: Sheet) => accionesDeAtaque(s).find((t) => t.label === "Disparar con Impetus")!.efectos ?? [];
    assert.equal(efectos(base()).length, 1); // nivel 2 sin ojo ni mira 3: sigue penalizando

    const conMira = equipar(base(), { instanciaId: "m1", catalogoId: "mira_telescopica", nivel: 3, instaladoEnId: "arma1" });
    assert.deepEqual(efectos(conMira), []);

    const conOjo: Sheet = { ...base(), equipo: [...base().equipo, { instanciaId: "o1", catalogoId: "aum_ojo_bionico", nivel: 1 }] };
    assert.deepEqual(efectos(conOjo), []);
  });

  // T4 (di-09): el disparo te resta del estado Sigilo; el Silenciador fija el ruido en 2 y la
  // luminiscencia se suma. Antes eran avisos a la Alerta Activa de quien te detecta (25b).
  test("Silenciador: amortigua el ruido del disparo a 2 y lo avisa en la tirada, no en la nota", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_asalto_impetus" });
    const sin = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Impetus")!;
    assert.equal(restaDeSigilo(sin.sigiloAlAtacar!).total, 6);
    assert.equal(sin.efectos, undefined);
    sheet = equipar(sheet, {
      instanciaId: "s1",
      catalogoId: "silenciador",
      nivel: 1,
      instaladoEnId: "arma1",
    });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Impetus")!;
    assert.equal(restaDeSigilo(fila.sigiloAlAtacar!).total, 2);
    assert.deepEqual(fila.efectos, [
      {
        fuente: "Silenciador",
        texto: "En sigilo, atacar con esta arma te resta 2: 2 de ruido, con Silenciador.",
        origen: { tipo: "equipo", id: "silenciador", label: "Silenciador", instanciaId: "s1" },
      },
    ]);
    assert.doesNotMatch(fila.nota ?? "", /sigilo/i);
  });

  test("Rayo Ligero: la luminiscencia se suma al ruido (−12; con silenciador, −8)", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "r1", catalogoId: "pistola_rayo_ligero" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Rayo Ligero")!;
    assert.equal(restaDeSigilo(fila.sigiloAlAtacar!).total, 12);
    assert.deepEqual(fila.efectos, [
      { fuente: "Rayo Ligero", texto: "En sigilo, atacar con esta arma te resta 12: 6 de ruido, 6 de luminiscencia (Rayo Ligero)." },
    ]);
    assert.match(fila.nota ?? "", /Crítico de Shock/);
    sheet = equipar(sheet, { instanciaId: "s1", catalogoId: "silenciador", nivel: 1, instaladoEnId: "r1" });
    const con = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Rayo Ligero")!;
    assert.equal(restaDeSigilo(con.sigiloAlAtacar!).total, 8);
  });

  test("Sistema de Retroceso nv2: la subida de dificultad de Esquiva del objetivo cuelga de la tirada de disparo", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_asalto_impetus" });
    sheet = equipar(sheet, {
      instanciaId: "r1",
      catalogoId: "sistema_retroceso",
      nivel: 2,
      instaladoEnId: "arma1",
    });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Impetus")!;
    assert.deepEqual(fila.efectos, [
      {
        fuente: "Sistema de Retroceso",
        texto: "En modo automático: +1 a la dificultad de Esquiva de quien recibe el disparo.",
        origen: { tipo: "equipo", id: "sistema_retroceso", label: "Sistema de Retroceso", instanciaId: "r1" },
      },
    ]);
    assert.doesNotMatch(fila.nota ?? "", /dificultad de Esquiva/);
  });
});

describe("lanzagranadas integrado", () => {
  test("el -1 por el peso no toca el tramo: sale como su propia línea con fuente", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_asalto_impetus" });
    sheet = equipar(sheet, {
      instanciaId: "lanza1",
      catalogoId: "lanzagranadas_integrado",
      nivel: 1,
      instaladoEnId: "arma1",
    });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Impetus")!;
    const tramo = fila.condiciones?.find((c) => c.id === "tramo");
    assert.equal(opcion(tramo, "bocajarro"), 4);
    assert.equal(opcion(tramo, "corta"), 2);
    assert.equal(opcion(tramo, "media"), 0);
    assert.equal(opcion(tramo, "larga"), -2);
    assert.deepEqual(fila.ajustesFijos, [
      {
        valor: -1,
        fuente: "Lanzagranadas Integrado",
        origen: { tipo: "equipo", id: "lanzagranadas_integrado", label: "Lanzagranadas Integrado", instanciaId: "lanza1" },
      },
    ]);
  });

  test("aparece como tirada aparte, con dificultad fija -2 y selector de granada", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_asalto_impetus" });
    sheet = equipar(sheet, {
      instanciaId: "lanza1",
      catalogoId: "lanzagranadas_integrado",
      nivel: 1,
      instaladoEnId: "arma1",
    });
    sheet = conTodasLasGranadas(sheet);
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Lanzagranadas (Impetus)")!;
    assert.ok(fila);
    assert.equal(fila.habilitacion, undefined);
    assert.deepEqual(fila.ajustesFijos, [{ valor: -2, fuente: "Lanzagranadas acoplado" }]);
    const modo = fila.condiciones?.find((c) => c.id === "modo");
    assert.ok(modo && modo.tipo === "opcion");
    assert.equal(modo.opciones.length, 14);
    assert.equal(fila.ataque?.modos.find((m) => m.id === "granada_plasma")?.danio, 15);
    assert.equal(fila.ataque?.modos.find((m) => m.id === "granada_plasma")?.categoriaDanio, "Plasma");
    assert.equal(fila.ataque?.modos.find((m) => m.id === "granada_aturdidora")?.categoriaDanio, "Efecto (sin daño directo)");
  });

  test("la nota de cada granada interpola su areaEfecto real, no un texto genérico", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_asalto_impetus" });
    sheet = equipar(sheet, {
      instanciaId: "lanza1",
      catalogoId: "lanzagranadas_integrado",
      nivel: 1,
      instaladoEnId: "arma1",
    });
    sheet = conTodasLasGranadas(sheet);
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Lanzagranadas (Impetus)")!;
    const modo = fila.condiciones?.find((c) => c.id === "modo");
    const plasma = MUNICION_GRANADA.find((m) => m.id === "granada_plasma")!;
    assert.equal(opcionNota(modo, "granada_plasma"), plasma.areaEfecto);
    assert.doesNotMatch(fila.nota ?? "", /según la granada elegida/i);
  });

  test("sin lanzagranadas instalado, no aparece esa fila", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_asalto_impetus" });
    const labels = accionesDeAtaque(sheet).map((t) => t.label);
    assert.ok(!labels.some((l) => l.startsWith("Lanzagranadas")));
  });

  // docs/tareas.md, 2026-09-27: sin nada en RECURSOS, tampoco hay fila —
  // aunque el lanzagranadas esté instalado, no hay nada que disparar.
  test("con lanzagranadas instalado pero sin granadas en el inventario, no aparece esa fila", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_asalto_impetus" });
    sheet = equipar(sheet, {
      instanciaId: "lanza1",
      catalogoId: "lanzagranadas_integrado",
      nivel: 1,
      instaladoEnId: "arma1",
    });
    const labels = accionesDeAtaque(sheet).map((t) => t.label);
    assert.ok(!labels.some((l) => l.startsWith("Lanzagranadas")));
  });

  test("con un único tipo en el inventario, no hay selector de modo pero sí la tirada", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_asalto_impetus" });
    sheet = equipar(sheet, {
      instanciaId: "lanza1",
      catalogoId: "lanzagranadas_integrado",
      nivel: 1,
      instaladoEnId: "arma1",
    });
    sheet = ajustarGranada(sheet, "granada_casera", 1);
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Lanzagranadas (Impetus)")!;
    assert.ok(fila);
    assert.equal(fila.condiciones?.find((c) => c.id === "modo"), undefined);
    assert.equal(fila.ataque?.modos.length, 1);
    assert.equal(fila.ataque?.modos[0].id, "granada_casera");
  });
});

describe("Sistema de Retroceso (por arma, 2026-10-24)", () => {
  const retroceso = (s: Sheet, en: string, nivel = 1) =>
    equipar(s, { instanciaId: `sr_${en}`, catalogoId: "sistema_retroceso", nivel, instaladoEnId: en });

  test("fusil de asalto: +1 solo en el modo F. Auto", () => {
    let s = equipar(defaultSheet(), { instanciaId: "fa", catalogoId: "fusil_asalto_impetus" });
    s = retroceso(s, "fa");
    const fila = accionesDeAtaque(s).find((t) => t.label === "Disparar con Impetus")!;
    assert.deepEqual(fila.bonosTramo, [
      {
        fuente: "Sistema de Retroceso",
        condicion: "modo",
        porTramo: { "1": 1 },
        origen: { tipo: "equipo", id: "sistema_retroceso", label: "Sistema de Retroceso", instanciaId: "sr_fa" },
      },
    ]);
    assert.equal(valorBonosTramo(fila.bonosTramo!, { modo: "0" }), 0);
    assert.equal(valorBonosTramo(fila.bonosTramo!, { modo: "1" }), 1);
  });

  test("ametralladora: «en cualquiera de sus modos» (docs/fuente/equipamiento.md, Sistema de Retroceso)", () => {
    let s = equipar(defaultSheet(), { instanciaId: "am", catalogoId: "ametralladora_asina" });
    s = retroceso(s, "am", 2);
    const fila = accionesDeAtaque(s).find((t) => t.id === "ataque_fuego_am")!;
    assert.equal(valorBonosTramo(fila.bonosTramo!, { modo: "0" }), 1);
    assert.equal(valorBonosTramo(fila.bonosTramo!, { modo: "1" }), 1);
  });

  test("no se cuela en el F. Auto de otra arma sin la mejora", () => {
    let s = equipar(defaultSheet(), { instanciaId: "fa", catalogoId: "fusil_asalto_impetus" });
    s = equipar(s, { instanciaId: "am", catalogoId: "ametralladora_asina" });
    s = retroceso(s, "fa");
    const otra = accionesDeAtaque(s).find((t) => t.id === "ataque_fuego_am")!;
    assert.deepEqual(otra.bonosTramo, []);
  });
});

describe("Impacto Estructural (Kerzul, 2026-10-24)", () => {
  const criticoDe = (id: string) => {
    const sheet = equipar(defaultSheet(), { instanciaId: "k1", catalogoId: id });
    return critico(accionesDeAtaque(sheet).find((t) => t.grupo === "Ataques" && t.id.includes("k1") && !t.id.startsWith("lanzar"))!);
  };

  test("una mano: el crítico explica que reduce 1 punto de blindaje de forma permanente", () => {
    assert.equal(criticoDe("kerzul_punal"), "Impacto Estructural (10): reduce de forma permanente el blindaje del objetivo en 1 punto");
  });

  test("dos manos: 2 puntos", () => {
    const dosManos = EQUIPO.find((e) => e.familia === "armaMelee" && e.material === "kerzul" && e.empleo === "dos manos")!;
    assert.match(criticoDe(dosManos.id) ?? "", /en 2 puntos$/);
  });
});

describe("bayoneta", () => {
  test("genera Golpear+Bloquear con el mismo daño y crítico que el Cuchillo de Combate", () => {
    let sheet = conDotes(ficha({ atributos: { fuerza: 4 } }), "dote_bloqueo");
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_asalto_impetus" });
    sheet = equipar(sheet, { instanciaId: "bay1", catalogoId: "bayoneta", nivel: 1, instaladoEnId: "arma1" });
    const golpe = accionesDeAtaque(sheet).find((t) => t.label === "Bayoneta (Impetus)")!;
    assert.ok(golpe);
    assert.equal(golpe.aplicado, "potencia");
    assert.equal(golpe.aplicadoSutil, undefined);
    assert.deepEqual(golpe.ajustesFijos, [{ valor: -1, fuente: "Bayoneta" }]);
    // «El daño será idéntico» al del Cuchillo de Combate (Fue+3), leído del catálogo (2026-10-24).
    assert.equal(golpe.ataque?.modos[0].danio, 7); // Fue(4) + 3
    assert.equal(golpe.ataque?.modos[0].formulaDanio, "Fue+3");
    assert.equal(golpe.ataque?.modos[0].categoriaDanio, "Letal");
    assert.equal(critico(golpe), "hemorragia (1d6)");
    assert.equal(golpe.efectosObjetivo?.[0].fuente, "Bayoneta");

    const bloqueo = accionesDeAtaque(sheet).find((t) => t.label === "Bloquear con Bayoneta (Impetus)")!;
    assert.ok(bloqueo);
    assert.equal(bloqueo.grupo, "Defensa");
  });

  test("sin bayoneta instalada, no aparecen esas filas", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_asalto_impetus" });
    const labels = accionesDeAtaque(sheet).map((t) => t.label);
    assert.ok(!labels.some((l) => l.includes("Bayoneta")));
  });
});

describe("arma melee equipada", () => {
  test("el daño se calcula solo desde la Fuerza del personaje (ya no 'a mano')", () => {
    let sheet = defaultSheet(); // Fuerza 0
    sheet = equipar(sheet, { instanciaId: "espada1", catalogoId: "espada" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Golpear con Espada")!;
    assert.equal(fila.ataque?.modos[0].danio, 4); // Fue(0) + 4
    assert.equal(fila.ataque?.modos[0].formulaDanio, "Fue+4");
  });

  test("el daño escala con la Fuerza efectiva del personaje", () => {
    let sheet = ficha({ atributos: { fuerza: 4 } });
    sheet = equipar(sheet, { instanciaId: "espada1", catalogoId: "espada" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Golpear con Espada")!;
    assert.equal(fila.ataque?.modos[0].danio, 8); // Fue(4) + 4
  });

  test("una fórmula sin '+N' (solo 'Fuerza' o 'Fue') usa la Fuerza tal cual", () => {
    let sheet = ficha({ atributos: { fuerza: 2 } });
    sheet = equipar(sheet, { instanciaId: "punetazo1", catalogoId: "pelea_punetazo" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Golpear con Puñetazo")!;
    assert.equal(fila.ataque?.modos[0].danio, 2); // Fuerza(2) + 0
  });

  test("un arma Sutil ya no lo indica en la etiqueta (el toggle lo comunica solo)", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "espada1", catalogoId: "espada_ligera" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label.includes("Espada Ligera"))!;
    assert.equal(fila.label, "Golpear con Espada Ligera");
    assert.doesNotMatch(fila.nota ?? "", /Sutil/);
  });

  test("el 'efectos' del arma llega a la nota, igual que 'especial' en armas de fuego", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "mangual1", catalogoId: "flagelo_mangual" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Golpear con Mangual")!;
    assert.match(fila.nota ?? "", /Acción Estándar ignora 2 niveles de Cobertura física/);
  });

  test("el crítico del arma va en sus efectos sobre el objetivo, no en la nota", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "tonfa1", catalogoId: "corta_tonfa_porra" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Golpear con Tonfa o Porra")!;
    assert.equal(critico(fila), "aturdido (7)");
    assert.doesNotMatch(fila.nota ?? "", /Crítico/);
  });

  test("un arma Sutil sigue llevando su crítico, sin el texto de Sutil en la nota", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "espada1", catalogoId: "espada_ligera" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label.includes("Espada Ligera"))!;
    assert.equal(critico(fila), "hemorragia (1d6)");
    assert.doesNotMatch(fila.nota ?? "", /Sutil/);
  });

  // Sin selector de modo, la dificultad del único modo no se pierde: llega como
  // ajuste fijo al golpe (antes el Escudo de Kerzul tiraba +6 en vez de +4).
  test("un arma de un solo modo con dificultad lleva ese ajuste al total del golpe", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "esc1", catalogoId: "kerzul_escudo" });
    const golpe = accionesDeAtaque(sheet).find((t) => t.id === "ataque_melee_esc1")!;
    assert.equal(golpe.condiciones?.find((c) => c.id === "modo"), undefined);
    assert.deepEqual(golpe.ajustesFijos, [{ valor: -2, fuente: "Escudo de Kerzul" }]);
    const resuelta = resolverFicha(sheet, { estados: [], vitalidad: VITALIDAD_DE_FICHA });
    const sinAjuste = montarTirada(resuelta, { ...golpe, ajustesFijos: [] }, SIN_ELECCION);
    const conAjuste = montarTirada(resuelta, golpe, SIN_ELECCION);
    assert.equal(conAjuste.total, sinAjuste.total - 2);
  });

  test("un arma de un solo modo con dificultad 0 no gana ajuste fijo", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "c1", catalogoId: "espada_cuchillo_combate" });
    const golpe = accionesDeAtaque(sheet).find((t) => t.id === "ataque_melee_c1")!;
    assert.deepEqual(golpe.ajustesFijos, []);
  });

  test("la dificultad del modo único es del golpe: el bloqueo no la hereda", () => {
    const sheet = equipar(conDotes(defaultSheet(), "dote_bloqueo"), { instanciaId: "esc1", catalogoId: "kerzul_escudo" });
    const bloqueo = accionesDeAtaque(sheet).find((t) => t.id === "bloquear_melee_esc1")!;
    assert.deepEqual(bloqueo.ajustesFijos, []);
  });
});

describe("estilo Sutil — toggle en vez de fila duplicada (docs/equipamiento.md:848-850)", () => {
  test("un arma Sutil expone aplicadoSutil (Reflejos) y danioSutil (base Potencia) por modo", () => {
    let sheet = conDotes(ficha({ atributos: { fuerza: 4, agilidad: 2 } }), "dote_combate_sutil"); // potencia = media(4,2) = 3
    sheet = equipar(sheet, { instanciaId: "espada1", catalogoId: "espada_ligera" });
    const golpe = accionesDeAtaque(sheet).find((t) => t.label === "Golpear con Espada Ligera")!;
    assert.equal(golpe.aplicado, "potencia");
    assert.equal(golpe.aplicadoSutil, "reflejos");
    assert.equal(golpe.ataque?.modos[0].danio, 7); // Fue(4) + 3
    assert.equal(golpe.ataque?.modos[0].danioSutil, 6); // Potencia(3) + 3
  });

  test("un arma no Sutil no lleva aplicadoSutil ni danioSutil", () => {
    let sheet = conDotes(defaultSheet(), "dote_combate_sutil");
    sheet = equipar(sheet, { instanciaId: "espada1", catalogoId: "espada" });
    const golpe = accionesDeAtaque(sheet).find((t) => t.label === "Golpear con Espada")!;
    assert.equal(golpe.aplicadoSutil, undefined);
    assert.equal(golpe.ataque?.modos[0].danioSutil, undefined);
  });

  test("modificadorAccion: el toggle sutilActivo cambia el aplicado usado, la habilidad no cambia", () => {
    // Combate Sutil sube Agilidad a 1 (su requisito): potencia < reflejos igualmente.
    let sheet = conDotes(ficha({ atributos: { fuerza: 2, agilidad: 0, percepcion: 4 } }), "dote_combate_sutil");
    sheet = equipar(sheet, { instanciaId: "espada1", catalogoId: "espada_ligera" });
    const golpe = accionesDeAtaque(sheet).find((t) => t.label === "Golpear con Espada Ligera")!;
    const normal = modificadorAccion(sheet, golpe, false, modificadoresActivos(sheet), false);
    const sutil = modificadorAccion(sheet, golpe, false, modificadoresActivos(sheet), true);
    assert.equal(normal.aplicado, aplicado(sheet, "potencia", modificadoresActivos(sheet)));
    assert.equal(sutil.aplicado, aplicado(sheet, "reflejos", modificadoresActivos(sheet)));
    assert.equal(normal.habilidad, sutil.habilidad);
  });

  test("preselección: con más Potencia que Reflejos, el estilo normal gana el bonificador de ataque", () => {
    const sheet = ficha({ atributos: { fuerza: 4, agilidad: 0, percepcion: -1 } }); // potencia=2, reflejos=0
    assert.ok(aplicado(sheet, "potencia", modificadoresActivos(sheet)) > aplicado(sheet, "reflejos", modificadoresActivos(sheet)));
  });

  test("preselección: con más Reflejos que Potencia, el estilo Sutil gana el bonificador de ataque", () => {
    const sheet = ficha({ atributos: { fuerza: -1, agilidad: 4, percepcion: 4 } }); // potencia=2, reflejos=4
    assert.ok(aplicado(sheet, "reflejos", modificadoresActivos(sheet)) > aplicado(sheet, "potencia", modificadoresActivos(sheet)));
  });
});

describe("arma melee arrojadiza — Lanzar (INFERIDO, mismo par que una granada)", () => {
  test("la Lanza Corta genera Lanzar con Potencia + Atletismo, dificultad y daño del modo Simple", () => {
    let sheet = ficha({ atributos: { fuerza: 3 } });
    sheet = equipar(sheet, { instanciaId: "lanza1", catalogoId: "asta_lanza_corta" });
    const lanzar = accionesDeAtaque(sheet).find((t) => t.id === "lanzar_melee_lanza1")!;
    assert.equal(lanzar.label, "Lanzar Lanza Corta");
    assert.equal(lanzar.aplicado, "potencia");
    assert.equal(lanzar.habilidad, "atletismo");
    assert.equal(lanzar.aplicadoSutil, undefined);
    assert.deepEqual(lanzar.ajustesFijos, [{ valor: -1, fuente: "Lanza Corta" }]);
    assert.equal(lanzar.ataque?.modos.length, 1);
    assert.equal(lanzar.ataque?.modos[0].danio, 6); // Fue(3) + 3
    assert.match(lanzar.nota ?? "", /Alcance Potencia × 12 m/); // "Arrojadiza: Potencia x 12" (EQUIP)
    assert.equal(critico(lanzar), "hemorragia (1d4)");
  });

  test("cada arrojadiza con su alcance del documento (S20, 2026-10-24)", () => {
    const alcances: [string, number][] = [
      ["asta_lanza_corta", 12],
      ["espada_cuchillo_combate", 6],
      ["kerzul_punal", 6],
      ["kerzul_lanza_corta", 12],
    ];
    for (const [id, x] of alcances) {
      const sheet = equipar(defaultSheet(), { instanciaId: "a1", catalogoId: id });
      const lanzar = accionesDeAtaque(sheet).find((t) => t.id === "lanzar_melee_a1")!;
      assert.match(lanzar.nota ?? "", new RegExp(`Alcance Potencia × ${x} m`), id);
    }
  });

  test("el Cuchillo de Combate (dificultad 0) no lleva ajuste fijo y conserva su crítico", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "c1", catalogoId: "espada_cuchillo_combate" });
    const lanzar = accionesDeAtaque(sheet).find((t) => t.id === "lanzar_melee_c1")!;
    assert.deepEqual(lanzar.ajustesFijos, []);
    assert.equal(critico(lanzar), "hemorragia (1d6)");
  });

  test("un arma no arrojadiza no genera Lanzar", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "e1", catalogoId: "espada" });
    assert.equal(accionesDeAtaque(sheet).some((t) => t.id.startsWith("lanzar_melee_")), false);
  });

  test("las 4 arrojadizas del catálogo, y solo ellas, declaran la acción lanzar_arma_melee en su motor", () => {
    const arrojadizas = EQUIPO.filter((e) => e.familia === "armaMelee" && e.arrojadiza).map((e) => e.id).sort();
    const conMotor = EQUIPO.filter(
      (e) =>
        "motor" in e &&
        e.motor?.some((m: MotorMetadata) => m.afecta.modo === "accion_nueva" && m.afecta.id === "lanzar_arma_melee"),
    ).map((e) => e.id).sort();
    assert.deepEqual(arrojadizas, ["asta_lanza_corta", "espada_cuchillo_combate", "kerzul_lanza_corta", "kerzul_punal"]);
    assert.deepEqual(conMotor, arrojadizas);
  });
});

// T3a: el crítico pasó de texto (efectoCritico) a dato (efectosObjetivo); estos tests siguen
// comprobando lo mismo, que el crítico del catálogo llega a la tirada y no a la nota.
describe("crítico del arma (Feature 2, piloto Cuchillo de Combate)", () => {
  test("el Cuchillo de Combate propaga su crítico a la Accion generada, fuera de 'nota'", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "cuchillo1", catalogoId: "espada_cuchillo_combate" });
    const golpe = accionesDeAtaque(sheet).find((t) => t.label === "Golpear con Cuchillo de Combate")!;
    assert.equal(critico(golpe), "hemorragia (1d6)");
    assert.equal(golpe.efectoCritico, undefined);
    assert.equal(golpe.nota, undefined);
  });

  // Desde 2026-10-23 todas las armas melee del catálogo tienen su crítico declarado.
  test("cada arma melee propaga el crítico de su catálogo", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "espada1", catalogoId: "espada" });
    const golpe = accionesDeAtaque(sheet).find((t) => t.label === "Golpear con Espada")!;
    assert.equal(critico(golpe), "hemorragia (1d8)");
    assert.doesNotMatch(golpe.nota ?? "", /Crítico/);
  });
});

describe("Bloqueo (otra forma de defensa, pregunta 31 resuelta)", () => {
  test("toda arma melee equipada genera también su 'Bloquear con...'", () => {
    let sheet = conDotes(defaultSheet(), "dote_bloqueo");
    sheet = equipar(sheet, { instanciaId: "espada1", catalogoId: "espada" });
    const bloqueo = accionesDeAtaque(sheet).find((t) => t.label === "Bloquear con Espada")!;
    assert.ok(bloqueo);
    assert.equal(bloqueo.grupo, "Defensa");
    assert.equal(bloqueo.aplicado, "potencia");
    assert.equal(bloqueo.aplicadoSutil, undefined);
    assert.equal(bloqueo.habilidad, "combate_melee");
    assert.deepEqual(bloqueo.ajustesFijos, [{ valor: -1, fuente: "Espada" }]); // la dificultad del arma, como al golpear
  });

  test("los escudos bloquean sin la dificultad del arma, aunque golpeen con ella (Escudo de Kerzul)", () => {
    let sheet = conDotes(defaultSheet(), "dote_bloqueo");
    sheet = equipar(sheet, { instanciaId: "rodela1", catalogoId: "escudo_rodela" });
    sheet = equipar(sheet, { instanciaId: "kz1", catalogoId: "kerzul_escudo" });
    const ataques = accionesDeAtaque(sheet);
    assert.deepEqual(ataques.find((t) => t.id === "bloquear_melee_rodela1")!.ajustesFijos, []);
    assert.deepEqual(ataques.find((t) => t.id === "bloquear_melee_kz1")!.ajustesFijos, []);
    assert.deepEqual(ataques.find((t) => t.id === "ataque_melee_kz1")!.ajustesFijos, [{ valor: -2, fuente: "Escudo de Kerzul" }]);
  });

  test("con un arma Sutil, el Bloqueo expone Reflejos como opción, sin asumirlo (elección del jugador)", () => {
    let sheet = conDotes(defaultSheet(), "dote_bloqueo", "dote_combate_sutil");
    sheet = equipar(sheet, { instanciaId: "espada1", catalogoId: "espada_ligera" });
    const bloqueo = accionesDeAtaque(sheet).find((t) => t.label === "Bloquear con Espada Ligera")!;
    assert.equal(bloqueo.aplicado, "potencia");
    assert.equal(bloqueo.aplicadoSutil, "reflejos");
    assert.equal(bloqueo.habilidad, "combate_melee");
  });

  test("el Mangual suma su propio -2 al Bloqueo encima de su dificultad: -4", () => {
    let sheet = conDotes(defaultSheet(), "dote_bloqueo");
    sheet = equipar(sheet, { instanciaId: "mangual1", catalogoId: "flagelo_mangual" });
    const bloqueo = accionesDeAtaque(sheet).find((t) => t.label === "Bloquear con Mangual")!;
    assert.deepEqual(bloqueo.ajustesFijos, [
      { valor: -2, fuente: "Mangual" },
      { valor: -2, fuente: "Mangual (bloqueo)" },
    ]);
  });

  test("mismo penalizador por atacante adicional que Esquivar", () => {
    let sheet = conDotes(defaultSheet(), "dote_bloqueo");
    sheet = equipar(sheet, { instanciaId: "espada1", catalogoId: "espada" });
    const bloqueo = accionesDeAtaque(sheet).find((t) => t.label === "Bloquear con Espada")!;
    const contador = bloqueo.condiciones?.find((c) => c.id === "atacantes_adicionales");
    assert.ok(contador && contador.tipo === "contador");
    assert.equal(contador.valorPorUnidad, -1);
  });
});

describe("D2b-2: Bloquear y el estilo Sutil solo con su dote (§9.2, §9.5)", () => {
  function armado(s: Sheet): Sheet {
    s = equipar(s, { instanciaId: "el", catalogoId: "espada_ligera" });
    s = equipar(s, { instanciaId: "fa", catalogoId: "fusil_asalto_impetus" });
    s = equipar(s, { instanciaId: "bay", catalogoId: "bayoneta", nivel: 1, instaladoEnId: "fa" });
    s = equipar(s, { instanciaId: "arm", catalogoId: "armadura_pesada" });
    return equipar(s, { instanciaId: "pp", catalogoId: "proyector_pulso", nivel: 2, instaladoEnId: "arm" });
  }
  const BASE = ficha({ atributos: { fuerza: 3, agilidad: 2, percepcion: 2 } });
  const bloqueos = (s: Sheet) => accionesDeAtaque(s).filter((t) => t.label.startsWith("Bloquear"));
  const fila = (s: Sheet, label: string) => accionesDeAtaque(s).find((t) => t.label === label)!;
  const AGUIJON = "Golpear con Proyector de Pulso (Aguijón)";
  const BLOQUEO_AGUIJON = "Bloquear con Proyector de Pulso (Aguijón)";

  test("sin Bloqueo no hay ningún «Bloquear con X» (arma melee, Bayoneta ni Aguijón); los golpes siguen", () => {
    const s = armado(conDotes(BASE, "dote_combate_sutil"));
    assert.deepEqual(bloqueos(s), []);
    assert.ok(accionesDeAtaque(s).every((t) => t.grupo !== "Defensa"));
    for (const l of ["Golpear con Espada Ligera", "Bayoneta (Impetus)", AGUIJON]) assert.ok(fila(s, l), l);
  });

  test("con Bloqueo salen los tres", () => {
    const labels = bloqueos(armado(conDotes(BASE, "dote_bloqueo"))).map((t) => t.label).sort();
    assert.deepEqual(labels, ["Bloquear con Bayoneta (Impetus)", "Bloquear con Espada Ligera", BLOQUEO_AGUIJON].sort());
  });

  test("sin Combate Sutil, un arma Sutil no trae interruptor: Potencia al tirar y Fuerza al daño", () => {
    const s = armado(conDotes(BASE, "dote_bloqueo"));
    const golpe = fila(s, "Golpear con Espada Ligera");
    assert.equal(golpe.aplicado, "potencia");
    assert.equal(golpe.aplicadoSutil, undefined);
    assert.equal(golpe.ataque?.modos[0].danioSutil, undefined);
    assert.equal(golpe.ataque?.modos[0].danio, 6); // Fue(3) + 3
    assert.equal(fila(s, "Bloquear con Espada Ligera").aplicadoSutil, undefined);
  });

  test("sin Combate Sutil, el Aguijón golpea y bloquea con Potencia; el daño (Fuerza) no cambia", () => {
    const sin = armado(conDotes(BASE, "dote_bloqueo"));
    const con = armado(conDotes(BASE, "dote_bloqueo", "dote_combate_sutil"));
    assert.deepEqual([fila(sin, AGUIJON).aplicado, fila(sin, AGUIJON).habilidad], ["potencia", "combate_melee"]);
    assert.equal(fila(sin, BLOQUEO_AGUIJON).aplicado, "potencia");
    assert.equal(fila(con, AGUIJON).aplicado, "reflejos");
    assert.equal(fila(con, BLOQUEO_AGUIJON).aplicado, "reflejos");
    assert.equal(fila(sin, AGUIJON).ataque?.modos[0].danio, 9); // Fue(3) + 4 + nivel 2
    assert.equal(fila(con, AGUIJON).ataque?.modos[0].danio, 9);
  });

  test("con el requisito roto (Combate Melee sin entrenar), igual que sin la dote", () => {
    const roto = armado({ ...BASE, dotes: [{ id: "dote_bloqueo" }, { id: "dote_combate_sutil" }] });
    assert.ok(roto.habilidades.combate_melee.valor < 1);
    assert.deepEqual(bloqueos(roto), []);
    assert.equal(fila(roto, "Golpear con Espada Ligera").aplicadoSutil, undefined);
    assert.equal(fila(roto, AGUIJON).aplicado, "potencia");
  });
});

describe("armamento pesado equipado", () => {
  test("dificultad fija por arma, mecanizada como ajustesFijos", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "lac1", catalogoId: "lanzacohetes_rt" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Lanzacohetes RT")!;
    assert.equal(fila.grupo, "Ataques");
    assert.equal(fila.aplicado, "reflejos");
    assert.equal(fila.habilidad, "combate_distancia");
    assert.deepEqual(fila.ajustesFijos, [{ valor: -3, fuente: "Lanzacohetes RT" }]);
    assert.equal(fila.ataque?.modos[0].danio, 14);
    assert.equal(fila.ataque?.modos[0].categoriaDanio, "Letal");
    assert.match(fila.nota ?? "", /Alcance 450 m/);
  });

  test("cada disparo gasta 1 de su cargador, con aviso si no llega (S95)", () => {
    let sheet = reconciliarRecursos(equipar(defaultSheet(), { instanciaId: "lac1", catalogoId: "lanzacohetes_rt" }));
    const fila = () => accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Lanzacohetes RT")!;
    assert.equal(fila().recursoInstanciaId, "lac1");
    assert.equal(gastoTotal(fila(), "0", {}), 1);
    assert.equal(avisoInsuficiente(fila(), "0", {}, { actual: 1, max: 1 }), undefined);
    sheet = ajustarRecurso(sheet, "lac1", -1);
    assert.equal(avisoInsuficiente(fila(), "0", {}, { actual: 0, max: 1 }), "Solo quedan 0/1 cohetes — esto gasta 1.");
    const lanzagranadas = conTodasLasGranadas(equipar(defaultSheet(), { instanciaId: "lg1", catalogoId: "lanzagranadas_pesado" }));
    const lg = accionesDeAtaque(lanzagranadas).find((t) => t.label === "Disparar con Lanzagranadas")!;
    assert.equal(lg.recursoInstanciaId, undefined);
  });

  test("el Lanzallamas Ligero no tiene alcance en metros, no aparece en la nota", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "lf1", catalogoId: "lanzallamas_ligero" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Lanzallamas Ligero")!;
    assert.doesNotMatch(fila.nota ?? "", /Alcance/);
    assert.equal(fila.ataque?.modos[0].danio, 10);
    assert.equal(fila.ataque?.modos[0].categoriaDanio, "Fuego");
  });

  test("el Lanzagranadas pesado tiene el daño según la granada elegida, como el integrado", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "lg1", catalogoId: "lanzagranadas_pesado" });
    sheet = conTodasLasGranadas(sheet);
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Lanzagranadas")!;
    assert.deepEqual(fila.ajustesFijos, [{ valor: -2, fuente: "Lanzagranadas" }]);
    const modo = fila.condiciones?.find((c) => c.id === "modo");
    assert.ok(modo && modo.tipo === "opcion");
    assert.equal(modo.opciones.length, 14);
    assert.equal(fila.ataque?.modos.find((m) => m.id === "granada_plasma")?.danio, 15);
    const plasma = MUNICION_GRANADA.find((m) => m.id === "granada_plasma")!;
    assert.equal(opcionNota(modo, "granada_plasma"), plasma.areaEfecto);
    assert.doesNotMatch(fila.nota ?? "", /según la granada elegida/i);
  });

  // docs/tareas.md, 2026-09-27: mismo criterio que el Lanzagranadas
  // Integrado — sin nada en RECURSOS, no hay nada que disparar.
  test("el Lanzagranadas pesado sin granadas en el inventario no genera fila", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "lg1", catalogoId: "lanzagranadas_pesado" });
    const labels = accionesDeAtaque(sheet).map((t) => t.label);
    assert.ok(!labels.includes("Disparar con Lanzagranadas"));
  });
});

describe("Proyector de Pulso (subsistema con acción propia, Hallazgo #1)", () => {
  function conProyectorPulso(nivel: number) {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "a1", catalogoId: "armadura_pesada" });
    sheet = equipar(sheet, {
      instanciaId: "pp1",
      catalogoId: "proyector_pulso",
      nivel,
      instaladoEnId: "a1",
    });
    return sheet;
  }

  test("genera cuatro filas: dos a distancia (por habilidad) y dos con Aguijón (melee)", () => {
    const sheet = conDotes(conProyectorPulso(1), "dote_bloqueo");
    const labels = accionesDeAtaque(sheet)
      .map((t) => t.label)
      .filter((l) => l.includes("Proyector de Pulso"));
    assert.deepEqual(labels, [
      "Disparar Proyector de Pulso (Combate a Distancia)",
      "Disparar Proyector de Pulso (Tecnociencia)",
      "Golpear con Proyector de Pulso (Aguijón)",
      "Bloquear con Proyector de Pulso (Aguijón)",
    ]);
  });

  test("las dos filas a distancia usan Reflejos, cada una con su propia habilidad", () => {
    const sheet = conProyectorPulso(1);
    const filas = accionesDeAtaque(sheet).filter((t) => t.label.startsWith("Disparar"));
    assert.deepEqual(
      filas.map((f) => [f.aplicado, f.habilidad]),
      [
        ["reflejos", "combate_distancia"],
        ["reflejos", "tecnociencia"],
      ],
    );
  });

  test("Aguijón (golpear y bloquear) es Reflejos + Combate Melee, no Combate a Distancia/Tecnociencia", () => {
    const sheet = conDotes(conProyectorPulso(1), "dote_bloqueo", "dote_combate_sutil");
    const golpe = accionesDeAtaque(sheet).find((t) => t.label === "Golpear con Proyector de Pulso (Aguijón)")!;
    const bloqueo = accionesDeAtaque(sheet).find((t) => t.label === "Bloquear con Proyector de Pulso (Aguijón)")!;
    assert.deepEqual([golpe.aplicado, golpe.habilidad], ["reflejos", "combate_melee"]);
    assert.deepEqual([bloqueo.aplicado, bloqueo.habilidad], ["reflejos", "combate_melee"]);
    assert.equal(golpe.grupo, "Ataques");
    assert.equal(bloqueo.grupo, "Defensa");
  });

  test("el daño y el modo de disparo escalan con el nivel instalado", () => {
    const fila = accionesDeAtaque(conProyectorPulso(2)).find((t) =>
      t.label.includes("Combate a Distancia"),
    )!;
    assert.equal(fila.ataque?.modos.find((m) => m.id === "pulso")?.danio, 10); // 8 + 2 (sync Drive 2026-11-14)
    assert.equal(fila.ataque?.modos.find((m) => m.id === "pulso_cargado")?.danio, 13); // 11 + 2 (sync Drive 2026-11-14)
    assert.equal(fila.ataque?.modos.find((m) => m.id === "barrido")?.danio, 12); // 10 + 2 (sync Drive 2026-11-14)
    const modo = fila.condiciones?.find((c) => c.id === "modo");
    assert.equal(opcion(modo, "pulso"), -2);
    assert.equal(opcion(modo, "pulso_cargado"), -2);
    assert.equal(opcion(modo, "barrido"), -3);
  });

  test("Aguijón: daño calculado desde la Fuerza del personaje, escala con el nivel", () => {
    const fila = accionesDeAtaque(conProyectorPulso(3)).find(
      (t) => t.label === "Golpear con Proyector de Pulso (Aguijón)",
    )!;
    const aguijon = fila.ataque?.modos[0];
    assert.equal(aguijon?.danio, 7); // Fue(0) + 4 + nivel(3)
    assert.equal(aguijon?.formulaDanio, "Fue+7"); // 4 + nivel(3)
  });

  test("distancia: el modificador general (+4/+2/0/-2) con los tramos del documento por nivel", () => {
    const fila = accionesDeAtaque(conProyectorPulso(2)).find((t) => t.label.includes("Combate a Distancia"))!;
    const tramo = fila.condiciones?.find((c) => c.id === "tramo");
    assert.ok(tramo && tramo.tipo === "opcion");
    assert.deepEqual(
      tramo.opciones.map((o) => [o.id, o.valor]),
      [["bocajarro", 4], ["corta", 2], ["media", 0], ["larga", -2]],
    );
    // Pulso/Barrido: 20+10n, 80+20n, 160+20n; Cargado: 30+10n, 100+20n, 200+20n (n = 2).
    assert.equal(tramo.opciones.find((o) => o.id === "corta")?.etiqueta, "Corta (40-120 m; Cargado 50-140 m)");
    assert.equal(tramo.porDefecto, "media");
  });

  // eq-23 (T9): los efectos sobre el objetivo dejan de ser texto (antes `efectoCritico` y la nota,
  // S96) y van como dato (`efectosObjetivo` de la pieza), con el selector «Modo adicional». Los
  // tres tests de S96 que miraban el texto del crítico se sustituyen por estos.
  const disparoPulso = (nivel: number) => accionesDeAtaque(conProyectorPulso(nivel)).find((t) => t.label.includes("Combate a Distancia"))!;
  const aguijonPulso = (nivel: number) =>
    accionesDeAtaque(conProyectorPulso(nivel)).find((t) => t.label === "Golpear con Proyector de Pulso (Aguijón)")!;
  const saltanPulso = (t: Accion, modo: string, modoAdicional: string | null, critico: boolean) =>
    efectosQueSaltan(t, { modo, ...(modoAdicional && { modo_adicional: modoAdicional }) }, { exito: true, critico, dificultad: 7 }).map(resumenEfecto);

  test("nivel 1: sin selector de modo adicional; Shock por modo (+ nivel) y Hemorragia de crítico, nada en efectoCritico", () => {
    const t = disparoPulso(1);
    assert.equal(t.condiciones?.some((c) => c.id === "modo_adicional"), false);
    assert.equal(t.efectoCritico, undefined);
    assert.deepEqual(saltanPulso(t, "pulso", null, false), ["shock (5)"]);
    assert.deepEqual(saltanPulso(t, "pulso_cargado", null, true), ["shock (7)", "hemorragia"]);
    // El Barrido no trae crítico.
    assert.deepEqual(saltanPulso(t, "barrido", null, true), ["shock (8)"]);
    assert.doesNotMatch(t.nota ?? "", /Hemorragia|Nivel 2/);
  });

  test("el selector «Modo adicional» ofrece los modos que da el nivel (2: Flux; 4: los tres)", () => {
    const opciones = (nivel: number) => {
      const c = disparoPulso(nivel).condiciones?.find((x) => x.id === "modo_adicional");
      assert.ok(c && c.tipo === "opcion");
      assert.equal(c.porDefecto, "ninguno");
      return c.opciones.map((o) => o.id);
    };
    assert.deepEqual(opciones(2), ["ninguno", "flux"]);
    assert.deepEqual(opciones(3), ["ninguno", "flux", "fotones"]);
    assert.deepEqual(opciones(4), ["ninguno", "flux", "fotones", "disrupcion"]);
    // También en el Aguijón (los modos son del subsistema entero).
    assert.ok(aguijonPulso(2).condiciones?.some((c) => c.id === "modo_adicional"));
  });

  test("Flux Radiactivo: el crítico es Envenenamiento por Radiación (8 + nivel) en vez de Hemorragia", () => {
    const t = disparoPulso(4);
    assert.deepEqual(saltanPulso(t, "pulso", "flux", true), ["shock (8)", "envenenamiento (12)"]);
    assert.deepEqual(saltanPulso(t, "pulso", "ninguno", true), ["shock (8)", "hemorragia"]);
    const radiacion = t.efectosObjetivo?.find((e) => e.tipo === "salvacion" && e.estadoId === "envenenamiento");
    assert.ok(radiacion?.tipo === "salvacion" && radiacion.tabla?.fracaso?.estado?.estadoId === "enfermedad");
  });

  test("Fotones Coherentes: Llamarada con la dificultad del Shock, crítico Ceguera (8 + nivel) y daño a Fuego", () => {
    const t = disparoPulso(3);
    assert.deepEqual(saltanPulso(t, "pulso", "fotones", false), ["shock (7)", "llamarada (7)"]);
    assert.deepEqual(saltanPulso(t, "barrido", "fotones", false), ["shock (10)", "llamarada (10)"]);
    assert.deepEqual(saltanPulso(t, "pulso", "fotones", true), ["shock (7)", "llamarada (7)", "ceguera (11)"]);
    const ficha = resolverFicha(conProyectorPulso(3), { estados: [], vitalidad: VITALIDAD_DE_FICHA });
    const montada = montarTirada(ficha, t, { ...SIN_ELECCION, estadoCondiciones: { tramo: "media", modo: "pulso", modo_adicional: "fotones" } });
    assert.deepEqual(montada.danio.categoria, { a: "Fuego", fuente: "Fotones Coherentes" });
    const sin = montarTirada(ficha, t, { ...SIN_ELECCION, estadoCondiciones: { tramo: "media", modo: "pulso", modo_adicional: "ninguno" } });
    assert.equal(sin.danio.categoria, null);
  });

  test("Disrupción de Campo: Shock +1 y crítico que destruye blindaje, en el Aguijón también", () => {
    const t = disparoPulso(4);
    assert.deepEqual(saltanPulso(t, "pulso_cargado", "disrupcion", false), ["shock (11)"]);
    assert.deepEqual(saltanPulso(t, "pulso_cargado", "disrupcion", true), [
      "shock (11)",
      "Destruye 1 punto de blindaje o armadura del objetivo (si no tiene blindaje, Hemorragia normal)",
    ]);
    assert.deepEqual(saltanPulso(aguijonPulso(4), "0", "disrupcion", false), ["shock (9)"]);
    assert.deepEqual(saltanPulso(aguijonPulso(4), "0", "ninguno", true), ["shock (8)", "hemorragia"]);
  });

  test("el aviso del resultado da los rangos desde tu propio total (dificultad conocida)", () => {
    const avisos = efectosSobreObjetivo(disparoPulso(2), { modo: "pulso", modo_adicional: "flux" }, { exito: true, critico: true, dificultad: 7 }, () => 1);
    const radiacion = avisos.find((a) => a.estadoId === "envenenamiento")!;
    assert.equal(radiacion.salvacion?.dificultad, 10);
    assert.deepEqual(radiacion.grados.map((g) => g.rango), ["4 o menos", "5 a 9", "10 a 15", "16 o más"]);
  });

  // T4: el −5 pasa de aviso a dato (`delataAlAtacar`) que la app resta de tu Sigilo; el aviso
  // dice ahora cuánto te resta cada ataque (el disparo, además, el ruido).
  test("el -5 al Sigilo del nivel 1: lo resta la app en el disparo (con ruido) y en el Aguijón (sin él)", () => {
    const filas = accionesDeAtaque(conProyectorPulso(3)).filter(
      (t) => t.label.startsWith("Disparar Proyector") || t.label === "Golpear con Proyector de Pulso (Aguijón)",
    );
    assert.equal(filas.length, 3);
    for (const f of filas) {
      const disparo = f.label.startsWith("Disparar");
      assert.equal(restaDeSigilo(f.sigiloAlAtacar!).total, disparo ? 11 : 5);
      assert.match(f.efectos?.[0].texto ?? "", disparo ? /te resta 11: 6 de ruido, 5 de ionización/ : /te resta 5: 5 de ionización/);
    }
  });

  test("con las cargas del catálogo (10) nunca avisa de insuficiencia recién equipado", () => {
    const fila = accionesDeAtaque(conProyectorPulso(1)).find((t) => t.label.includes("Combate a Distancia"))!;
    const modo = fila.condiciones?.find((c) => c.id === "modo");
    assert.ok(modo && modo.tipo === "opcion");
    for (const o of modo.opciones) assert.doesNotMatch(o.nota ?? "", /Solo quedan/);
  });

  test("cada modo trae una breve descripción de sabor", () => {
    const fila = accionesDeAtaque(conProyectorPulso(1)).find((t) => t.label.includes("Combate a Distancia"))!;
    const modo = fila.condiciones?.find((c) => c.id === "modo");
    assert.ok(modo && modo.tipo === "opcion");
    for (const o of modo.opciones) assert.ok(o.nota && o.nota.length > 0, `sin descripción: ${o.id}`);
  });

  test("un subsistema sin acción propia construida (Camuflaje Trifásico) no genera ninguna fila", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "a1", catalogoId: "armadura_pesada" });
    sheet = equipar(sheet, {
      instanciaId: "ct1",
      catalogoId: "camuflaje_trifasico",
      nivel: 1,
      instaladoEnId: "a1",
    });
    assert.deepEqual(accionesDeAtaque(sheet), []);
  });
});

// Granadas dejaron de equiparse (docs/tareas.md, 2026-09-27): una fila por
// tipo en sheet.granadas con cantidad > 0, no por instancia comprada.
describe("granada en RECURSOS", () => {
  test("genera 'Lanzar...' con Potencia + Atletismo y la dificultad de lanzarla a mano", () => {
    let sheet = defaultSheet();
    sheet = ajustarGranada(sheet, "granada_fragmentacion", 1);
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Lanzar Granada de Fragmentación")!;
    assert.equal(fila.grupo, "Ataques");
    assert.equal(fila.aplicado, "potencia");
    assert.equal(fila.habilidad, "atletismo");
    assert.deepEqual(fila.ajustesFijos, [{ valor: -2, fuente: "Granada de Fragmentación" }]);
    assert.equal(fila.ataque?.modos[0].danio, 13);
    assert.equal(fila.ataque?.modos[0].categoriaDanio, "Letal");
    assert.match(fila.nota ?? "", /Potencia × 14 m/); // "Potencia x 14" (EQUIP, Granadas)
  });

  test("Granada de Plasma: 500 créditos y Fusión (12) como efecto, no de crítico (2026-10-24)", () => {
    const plasma = MUNICION_GRANADA.find((m) => m.id === "granada_plasma")!;
    assert.equal(plasma.coste, 500);
    assert.match(plasma.areaEfecto, /· Efecto Fusión \(12\)$/);
    assert.doesNotMatch(plasma.areaEfecto, /Crítico/);
  });

  test("una granada de solo efecto (sin daño directo) lo indica en la categoría", () => {
    let sheet = defaultSheet();
    sheet = ajustarGranada(sheet, "granada_humo", 1);
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Lanzar Granada de Humo")!;
    assert.equal(fila.ataque?.modos[0].categoriaDanio, "Efecto (sin daño directo)");
  });

  test("dos tipos en stock dan dos filas independientes, sin importar la cantidad", () => {
    let sheet = defaultSheet();
    sheet = ajustarGranada(sheet, "granada_casera", 3);
    sheet = ajustarGranada(sheet, "granada_plasma", 1);
    const labels = accionesDeAtaque(sheet)
      .map((t) => t.label)
      .filter((l) => l.startsWith("Lanzar"));
    assert.deepEqual(labels, ["Lanzar Granada Casera", "Lanzar Granada de Plasma"]);
  });

  test("sin ninguna granada en stock, no aparece ninguna fila 'Lanzar...'", () => {
    const labels = accionesDeAtaque(defaultSheet())
      .map((t) => t.label)
      .filter((l) => l.startsWith("Lanzar"));
    assert.deepEqual(labels, []);
  });

  test("bajar la cantidad a 0 quita la fila", () => {
    let sheet = defaultSheet();
    sheet = ajustarGranada(sheet, "granada_casera", 1);
    sheet = ajustarGranada(sheet, "granada_casera", -1);
    assert.equal(sheet.granadas.granada_casera, undefined);
    const labels = accionesDeAtaque(sheet).map((t) => t.label);
    assert.ok(!labels.includes("Lanzar Granada Casera"));
  });
});

// N4 (artifact de escalabilidad): fija qué familias debe cubrir
// REGISTRO_DE_ATAQUE (combate.ts) — si alguien borra o rompe una entrada sin
// querer, esto se pone en rojo en vez de fallar en silencio. No recorre las
// 11 familias de Equipo: la mayoría (mejoraEstandar, subsistema, movimiento,
// mejoraArma) necesitan un host válido para poder equiparse siquiera
// (equipar() las rechaza sin uno, ver lib/rules/equipo.ts) y nunca llegan a
// sheet.equipo sin él, así que no hace falta comprobarlas aparte — quedan
// fuera por construcción, no por omisión de este test. "granada" tampoco
// entra aquí desde 2026-09-27: dejó de ser sheet.equipo (recurso con
// cantidad), su cobertura vive en el describe "granada en RECURSOS".
describe("REGISTRO_DE_ATAQUE (combate.ts) cubre exactamente las familias esperadas", () => {
  const FAMILIAS_QUE_GENERAN_ATAQUE: Equipo["familia"][] = ["arma", "armaMelee", "armaPesada"];
  const FAMILIAS_SIN_ATAQUE_SIN_HOST: Equipo["familia"][] = ["armadura", "herramienta", "consumible"];

  function primerIdDe(familia: Equipo["familia"]): string {
    const pieza = EQUIPO.find((p) => p.familia === familia);
    assert.ok(pieza, `no hay ninguna pieza de familia "${familia}" en EQUIPO`);
    return pieza!.id;
  }

  for (const familia of FAMILIAS_QUE_GENERAN_ATAQUE) {
    test(`"${familia}" genera al menos una fila en accionesDeAtaque()`, () => {
      let sheet = defaultSheet();
      sheet = equipar(sheet, { instanciaId: "x1", catalogoId: primerIdDe(familia) });
      assert.ok(accionesDeAtaque(sheet).length > 0, `familia "${familia}" no generó ninguna fila`);
    });
  }

  for (const familia of FAMILIAS_SIN_ATAQUE_SIN_HOST) {
    test(`"${familia}" no genera ninguna fila en accionesDeAtaque()`, () => {
      let sheet = defaultSheet();
      sheet = equipar(sheet, { instanciaId: "x1", catalogoId: primerIdDe(familia) });
      assert.deepEqual(accionesDeAtaque(sheet), []);
    });
  }
});

// T6 (artifact de escalabilidad): generaAccionPropia() es lo que hace que
// accionesDeAtaque() consulte MotorMetadata además del registro por familia.
// No hay ninguna pieza real hoy en arma/armaMelee/armaPesada/granada cuya
// ÚNICA entrada "accion"/"accion_equipo" sea pendiente/bloqueada (todas
// tienen al menos una construida para su acción principal) — se prueba la
// función pura en aislado, con piezas sintéticas, en vez de depender de que
// el catálogo real tenga un caso así.
describe("generaAccionPropia() — el filtro de T6", () => {
  function piezaCon(motor: MotorMetadata[]): Equipo {
    return { familia: "arma", motor } as unknown as Equipo;
  }

  test("con una entrada accion/accion_equipo construida, genera", () => {
    const pieza = piezaCon([
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "x" }, mecanismo: "accion_equipo", estado: "construido" },
    ]);
    assert.equal(generaAccionPropia(pieza), true);
  });

  test("con esa misma entrada en 'pendiente', no genera", () => {
    const pieza = piezaCon([
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "x" }, mecanismo: "accion_equipo", estado: "pendiente" },
    ]);
    assert.equal(generaAccionPropia(pieza), false);
  });

  test("con esa misma entrada en 'bloqueado', no genera", () => {
    const pieza = piezaCon([
      {
        tipo: "accion",
        afecta: { modo: "accion_nueva", id: "x" },
        mecanismo: "accion_equipo",
        estado: "bloqueado",
        bloqueoPor: "pregunta de prueba",
      },
    ]);
    assert.equal(generaAccionPropia(pieza), false);
  });

  test("sin ninguna entrada accion/accion_equipo, no genera", () => {
    const pieza = piezaCon([{ tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" }]);
    assert.equal(generaAccionPropia(pieza), false);
  });

  test("sin motor en absoluto (undefined), no genera y no revienta", () => {
    const pieza = { familia: "arma" } as unknown as Equipo;
    assert.equal(generaAccionPropia(pieza), false);
  });

  test("una construida y otra bloqueada a la vez (patrón Kerzul/Armas Mecánicas) — basta con que una lo esté", () => {
    const pieza = piezaCon([
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      {
        tipo: "accion",
        afecta: { modo: "accion_nueva", id: "derribo_arma_mecanica" },
        mecanismo: "accion_equipo",
        estado: "bloqueado",
        bloqueoPor: "pregunta de prueba",
      },
    ]);
    assert.equal(generaAccionPropia(pieza), true);
  });
});

describe("accionesDirectasDeAtaque", () => {
  test("sin nada equipado, ninguna acción sin dado", () => {
    assert.deepEqual(accionesDirectasDeAtaque(defaultSheet()), []);
  });

  test("un arma melee sin defensa (no es escudo) no genera nada", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "m1", catalogoId: "espada_cuchillo_combate" });
    assert.deepEqual(accionesDirectasDeAtaque(sheet), []);
  });

  test("Rodela (acción Simple): 'Levantar Rodela', coste y cobertura/blindaje en la nota", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "e1", catalogoId: "escudo_rodela" });
    const [accion] = accionesDirectasDeAtaque(sheet);
    assert.equal(accion.label, "Levantar Rodela");
    assert.equal(accion.grupo, "Defensa");
    assert.match(accion.nota ?? "", /acción simple/i);
    assert.match(accion.nota ?? "", /Cobertura Nivel 1/);
    // El blindaje del escudo ya no protege al portador (Murillo, 2026-10-23).
    assert.doesNotMatch(accion.nota ?? "", /blindaje/);
  });

  test("levantar es Acción Simple en todos los escudos, aunque el golpe sea Estándar (2026-10-24)", () => {
    for (const id of ["escudo_estandar", "escudo_metamaterial", "kerzul_escudo"]) {
      const sheet = equipar(defaultSheet(), { instanciaId: "e1", catalogoId: id });
      const [accion] = accionesDirectasDeAtaque(sheet);
      assert.match(accion.nota ?? "", /acción simple/i, id);
      assert.doesNotMatch(accion.nota ?? "", /estándar/i, id);
    }
  });

  test("la nota de levantar recuerda que el escudo se beneficia del Escudo Deflector y la Malla (A12)", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "e1", catalogoId: "escudo_rodela" });
    const [accion] = accionesDirectasDeAtaque(sheet);
    assert.match(accion.nota ?? "", /Escudo Deflector y la Malla Plasmática/);
  });

  test("Escudo de Kerzul también genera su fila", () => {
    const sheet = equipar(defaultSheet(), { instanciaId: "e1", catalogoId: "kerzul_escudo" });
    const [accion] = accionesDirectasDeAtaque(sheet);
    assert.equal(accion.label, "Levantar Escudo de Kerzul");
  });

  test("dos escudos equipados a la vez generan dos filas independientes", () => {
    let sheet = equipar(defaultSheet(), { instanciaId: "e1", catalogoId: "escudo_rodela" });
    sheet = equipar(sheet, { instanciaId: "e2", catalogoId: "escudo_estandar" });
    const acciones = accionesDirectasDeAtaque(sheet);
    assert.equal(acciones.length, 2);
    assert.deepEqual(
      acciones.map((a) => a.id).sort(),
      ["levantar_escudo_e1", "levantar_escudo_e2"].sort(),
    );
  });

  // Subsistema: necesita host (armadura) para que equipar() no la descarte
  // en silencio.
  function conMallaPlasmatica(nivel: number) {
    let sheet = equipar(defaultSheet(), { instanciaId: "a1", catalogoId: "armadura_pesada" });
    sheet = equipar(sheet, { instanciaId: "mp1", catalogoId: "malla_plasmatica", nivel, instaladoEnId: "a1" });
    return sheet;
  }

  test("Malla Plasmática nivel 1 no genera detonación de pulso térmico", () => {
    const sheet = conMallaPlasmatica(1);
    assert.deepEqual(accionesDirectasDeAtaque(sheet), []);
  });

  test("Malla Plasmática nivel 2: detonación en área 6x6, dificultades con nivel 2", () => {
    const sheet = conMallaPlasmatica(2);
    const [accion] = accionesDirectasDeAtaque(sheet);
    assert.equal(accion.label, "Detonar pulso térmico (Malla Plasmática)");
    assert.equal(accion.grupo, "Ataques");
    assert.match(accion.nota ?? "", /área 6x6/);
    assert.match(accion.nota ?? "", /Esquiva dificultad 7/);
    assert.match(accion.nota ?? "", /Shock y Llamarada dificultad 8/);
  });

  test("Malla Plasmática nivel 4: el área pasa a 10x10", () => {
    const sheet = conMallaPlasmatica(4);
    const [accion] = accionesDirectasDeAtaque(sheet);
    assert.match(accion.nota ?? "", /área 10x10/);
  });

  // El colchón actual/máximo ya no se lee de la nota (2026-09-28): el
  // jugador lo elige en vivo en SacrificioRecursoModal.tsx, acotado a
  // recursoDe(sheet, recursoInstanciaId) — de ahí que la Accion solo declare
  // qué instancia gasta, no un número ya calculado.
  test("recursoInstanciaId apunta a la instancia de Malla Plasmática, y la nota no lleva ningún número de colchón", () => {
    const sheet = ajustarRecurso(conMallaPlasmatica(2), "mp1", -5); // 7/12
    const [accion] = accionesDirectasDeAtaque(sheet);
    assert.equal(accion.recursoInstanciaId, "mp1");
    assert.equal(accion.categoriaDanio, "Plasma");
    assert.doesNotMatch(accion.nota ?? "", /\d+\/\d+/);
  });
});

describe("escudo roto (durabilidad a 0, S86)", () => {
  const conRodela = () =>
    equipar(conDotes(defaultSheet(), "dote_bloqueo"), { instanciaId: "e1", catalogoId: "escudo_rodela" });
  const filas = (s: Sheet) => {
    const ataque = accionesDeAtaque(s);
    return {
      golpe: ataque.find((t) => t.id === "ataque_melee_e1")!,
      bloqueo: ataque.find((t) => t.id === "bloquear_melee_e1")!,
      levantar: accionesDirectasDeAtaque(s).find((a) => a.id === "levantar_escudo_e1")!,
    };
  };

  test("con durabilidad > 0, ni golpear, ni bloquear, ni levantar salen bloqueadas", () => {
    const { golpe, bloqueo, levantar } = filas(ajustarRecurso(conRodela(), "e1", -7)); // 1/8
    assert.equal(golpe.habilitacion, undefined);
    assert.equal(bloqueo.habilitacion, undefined);
    assert.equal(levantar.habilitacion, undefined);
  });

  test("a 0, las tres salen bloqueadas con «Escudo roto: repáralo»", () => {
    const { golpe, bloqueo, levantar } = filas(ajustarRecurso(conRodela(), "e1", -8));
    for (const fila of [golpe, bloqueo, levantar]) assert.equal(motivoDeBloqueo(fila.habilitacion), "Escudo roto: repáralo");
  });

  test("reparado (durabilidad > 0 otra vez), vuelven solas", () => {
    const roto = ajustarRecurso(conRodela(), "e1", -8);
    const { golpe, bloqueo, levantar } = filas(ajustarRecurso(roto, "e1", 8));
    for (const fila of [golpe, bloqueo, levantar]) assert.equal(fila.habilitacion, undefined);
  });

  test("un arma melee sin defensa con su recurso inexistente no se bloquea", () => {
    const s = equipar(defaultSheet(), { instanciaId: "c1", catalogoId: "espada_cuchillo_combate" });
    assert.equal(accionesDeAtaque(s).find((t) => t.id === "ataque_melee_c1")!.habilitacion, undefined);
  });

  test("el bloqueo sigue llegando bloqueado a la ficha resuelta (conExtrasDeFicha no lo pierde)", () => {
    const s = ajustarRecurso(conRodela(), "e1", -8);
    const resuelta = resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA });
    const bloqueo = accionesDeAtaqueCon(s, resuelta.modificadores, resuelta.extrasDotes.permisos)
      .map((t) => conExtrasDeFicha(resuelta, t))
      .find((t) => t.id === "bloquear_melee_e1");
    assert.equal(motivoDeBloqueo(bloqueo?.habilitacion), "Escudo roto: repáralo");
  });
});

// Armas Impulsoras (foto de Drive 2026-10-23, catalog/armasImpulsoras.ts).
describe("Arco Táctico y Ballesta", () => {
  const disparo = (s: Sheet) => accionesDeAtaque(s).find((t) => t.id === "ataque_fuego_x")!;

  test("el Arco hace 1/2 Fue + 8 (la mitad hacia abajo) con la Fuerza de la ficha", () => {
    for (const [fuerza, danio] of [[3, 9], [4, 10], [0, 8]] as const) {
      const t = disparo(equipar(ficha({ atributos: { fuerza } }), { instanciaId: "x", catalogoId: "arco_tactico" }));
      assert.equal(t.ataque?.modos[0].danio, danio, `Fuerza ${fuerza}`);
      assert.equal(t.ataque?.modos[0].formulaDanio, "1/2 Fue + 8");
    }
  });

  test("la Ballesta tiene daño fijo; las dos van con Combate a Distancia en Armas Impulsoras", () => {
    const t = disparo(equipar(ficha({ atributos: { fuerza: 4 } }), { instanciaId: "x", catalogoId: "ballesta_pro_ue" }));
    assert.equal(t.ataque?.modos[0].danio, 10);
    assert.equal(t.ataque?.modos[0].formulaDanio, null);
    assert.equal(t.habilidad, "combate_distancia");
    assert.equal(t.especialidadArma, "armas_impulsoras");
    assert.deepEqual(t.ajustesFijos, [{ valor: -2, fuente: "Ballesta Pro UE" }]);
    assert.ok(t.condiciones?.some((c) => c.id === "tramo"));
  });

  test("munición especial sin adaptador: el selector sale con los tipos de los que hay stock", () => {
    const sin = disparo(equipar(defaultSheet(), { instanciaId: "x", catalogoId: "arco_tactico" }));
    assert.ok(!sin.condiciones?.some((c) => c.id === "municion"));
    const s = ajustarMunicionEspecial(equipar(defaultSheet(), { instanciaId: "x", catalogoId: "arco_tactico" }), "incendiaria", 3);
    const t = disparo(s);
    assert.deepEqual(t.municionesEspeciales?.map((m) => [m.id, m.stock]), [["incendiaria", 3]]);
    assert.ok(t.condiciones?.some((c) => c.id === "municion"));
  });

  test("un arma de fuego sigue necesitando el adaptador", () => {
    const s = ajustarMunicionEspecial(equipar(defaultSheet(), { instanciaId: "x", catalogoId: "pistola_bellum" }), "incendiaria", 3);
    assert.equal(disparo(s).municionesEspeciales, undefined);
  });
});

describe("Exoesqueleto: +N a la Fuerza en tiradas, no en salvaciones (S10)", () => {
  // Fuerza 2, Aguante 1, Agilidad 2; Armadura Pesada con Exoesqueleto 2 → Fuerza 4 en tiradas.
  const base = ficha({ atributos: { fuerza: 2, aguante: 1, agilidad: 2 } });
  const conExo = (s: Sheet) =>
    equipar(equipar(s, { instanciaId: "a1", catalogoId: "armadura_pesada" }), {
      instanciaId: "e1",
      catalogoId: "exoesqueleto",
      nivel: 2,
      instaladoEnId: "a1",
    });

  test("el golpe melee sube la Potencia y el daño Fue+N", () => {
    const golpe = (s: Sheet) => accionesDeAtaque(equipar(s, { instanciaId: "esp", catalogoId: "espada" })).find((t) => t.label === "Golpear con Espada")!;
    const sin = base;
    const con = conExo(base);
    assert.equal(modificadorAccion(sin, golpe(sin), true, modificadoresActivos(sin)).aplicado, 2); // floor((2+2)/2)
    assert.equal(modificadorAccion(con, golpe(con), true, modificadoresActivos(con)).aplicado, 3); // floor((4+2)/2)
    assert.equal(golpe(con).ataque!.modos[0].danio! - golpe(sin).ataque!.modos[0].danio!, 2);
  });

  test("la salvación de Fortaleza va sin el exoesqueleto", () => {
    const salv = ACCIONES.find((a) => a.id === "salv_fortaleza")!;
    const con = conExo(base);
    assert.equal(aplicado(con, "fortaleza", modificadoresActivos(con)), 2); // floor((4+1)/2) en la ficha
    assert.equal(modificadorAccion(con, salv, false, modificadoresActivos(con)).aplicado, 1); // floor((2+1)/2)
  });
});

describe("Activar camuflaje trifásico (acción sin dado, 1 carga)", () => {
  const conCamuflaje = (nivel: number) =>
    reconciliarRecursos(
      equipar(equipar(defaultSheet(), { instanciaId: "a1", catalogoId: "armadura_pesada" }), {
        instanciaId: "cam",
        catalogoId: "camuflaje_trifasico",
        nivel,
        instaladoEnId: "a1",
      }),
    );
  const activar = (s: Sheet) => accionesDirectasDeAtaque(s).find((a) => a.id === "activar_camuflaje_cam");

  test("existe con el camuflaje equipado, gasta 1 carga de su célula y la nota trae los números de su nivel", () => {
    const s = conCamuflaje(2);
    const a = activar(s)!;
    assert.equal(a.label, "Activar Camuflaje Trifásico");
    assert.deepEqual(a.gastoRecurso, { instanciaId: "cam", cantidad: 1 });
    assert.equal(a.habilitacion, undefined);
    assert.match(a.nota!, /quedan 10\/10/);
    // T4 (eq-25): los números de su nivel van en el selector de modo, no en la nota.
    const modo = a.condiciones?.find((c) => c.id === ID_MODO_CAMUFLAJE);
    assert.ok(modo?.tipo === "opcion");
    assert.deepEqual(modo.opciones.map((o) => o.etiqueta), ["Estático (20 minutos)", "Dinámico (10 turnos)"]);
    assert.equal(modo.opciones[0].nota, "Cobertura visual 4 · térmica 4 · acústica 4.");
    const alUsar = a.estadoAlUsar;
    assert.ok(alUsar && "opciones" in alUsar);
    assert.deepEqual(alUsar.opciones, { estatico: { gradoId: "estatico", turnos: 200 }, dinamico: { gradoId: "dinamico", turnos: 10 } });
  });

  test("sin cargas sale bloqueada", () => {
    const s = conCamuflaje(1);
    const vacio = ajustarRecurso(s, "cam", -10);
    assert.equal(motivoDeBloqueo(activar(vacio)!.habilitacion), MOTIVO_SIN_CARGAS);
  });

  test("sin camuflaje no hay acción", () => {
    assert.equal(activar(defaultSheet()), undefined);
  });

  test("con la Malla Plasmática equipada avisa de que anula el modo activo; sin ella, no (S96)", () => {
    const s = conCamuflaje(1);
    assert.ok(!activar(s)!.nota!.includes(NOTA_MALLA_ANULA_CAMUFLAJE));
    const conMalla = equipar(s, { instanciaId: "mp", catalogoId: "malla_plasmatica", nivel: 1, instaladoEnId: "a1" });
    assert.ok(activar(conMalla)!.nota!.includes(NOTA_MALLA_ANULA_CAMUFLAJE));
  });
});

// «Al activarse este subsistema el usuario recibe un penalizador de -8 al sigilo que solo afecta
// a la percepción visual» (docs/fuente/equipamiento.md, Malla Plasmática): casilla en las
// tiradas de Sigilo, que la Malla no tiene tirada propia donde avisarlo (S96).
describe("Malla Plasmática: -8 al Sigilo con la malla activa (S96)", () => {
  const conMalla = (nivel: number) =>
    equipar(equipar(defaultSheet(), { instanciaId: "a1", catalogoId: "armadura_pesada" }), {
      instanciaId: "mp",
      catalogoId: "malla_plasmatica",
      nivel,
      instaladoEnId: "a1",
    });
  const fija = (s: Sheet, id: string) => {
    const resuelta = resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA });
    return conExtrasDeFicha(resuelta, ACCIONES.find((a) => a.id === id)!);
  };

  test("Sigilo y Hurto traen la casilla (-8 activa, 0 si no); también en nivel 4", () => {
    for (const [nivel, id] of [[1, "sigilo"], [4, "sigilo"], [1, "hurto"]] as const) {
      const c = fija(conMalla(nivel), id).condiciones?.find((x) => x.id === "malla_plasmatica_activa");
      assert.ok(c && c.tipo === "toggle", `${id} nivel ${nivel}`);
      assert.equal(c.valorActivo, -8);
      assert.equal(c.valorInactivo, 0);
      assert.match(c.nota ?? "", /Camuflaje Trifásico/);
    }
  });

  test("no llega a tiradas que no son de Sigilo, ni sin la malla", () => {
    assert.equal(fija(conMalla(1), "alerta_activa").condiciones?.find((x) => x.id === "malla_plasmatica_activa"), undefined);
    assert.equal(fija(defaultSheet(), "sigilo").condiciones?.find((x) => x.id === "malla_plasmatica_activa"), undefined);
  });
});

// T3a del cuestionario de cierre (usuario, 2026-11-13): lo que las armas cuerpo a cuerpo hacen
// por modo y sus casillas propias.
describe("armas melee: ignora blindaje por modo, cobertura y estructuras (eq-14, eq-15, eq-16)", () => {
  const golpe = (catalogoId: string) => {
    const sheet = equipar(defaultSheet(), { instanciaId: "m1", catalogoId });
    return { sheet, t: accionesDeAtaque(sheet).find((x) => x.id === "ataque_melee_m1")! };
  };
  const montar = (sheet: Sheet, t: Accion, estado: Record<string, string | boolean>) =>
    montarTirada(resolverFicha(sheet, { estados: [], vitalidad: VITALIDAD_DE_FICHA }), t, { ...SIN_ELECCION, estadoCondiciones: estado });

  test("Hoja Dentada y Sierra Circular: «Ignora 1» solo en el golpe en Compleja", () => {
    for (const id of ["mecanica_hoja_dentada", "mecanica_sierra_circular"]) {
      const { t } = golpe(id);
      const [estandar, compleja] = t.ataque!.modos;
      assert.equal(estandar.ignoraBlindaje, undefined, id);
      assert.equal(compleja.ignoraBlindaje?.valor, 1, id);
      assert.deepEqual(ignoraBlindajeDelGolpe(t, compleja, null).map((b) => b.valor), [1]);
      assert.deepEqual(ignoraBlindajeDelGolpe(t, estandar, null), []);
    }
  });

  test("Mangual: «El objetivo tiene cobertura» suma +2 solo en Estándar", () => {
    const { sheet, t } = golpe("flagelo_mangual");
    const casilla = t.condiciones?.find((c) => c.id === "objetivo_con_cobertura");
    assert.ok(casilla);
    const [simple, estandar] = t.ataque!.modos.map((m) => m.id);
    const sin = montar(sheet, t, { modo: estandar }).total;
    assert.equal(montar(sheet, t, { modo: estandar, objetivo_con_cobertura: true }).total, sin + 2);
    assert.equal(montar(sheet, t, { modo: simple, objetivo_con_cobertura: true }).total, montar(sheet, t, { modo: simple }).total);
  });

  test("Ariete: «Contra una puerta, muro o estructura» dobla todo el daño", () => {
    const { sheet, t } = golpe("mecanica_ariete_percusivo");
    const montada = montar(sheet, t, { modo: t.ataque!.modos[0].id, contra_estructura: true });
    assert.deepEqual(montada.danio.multiplica, { valor: 2, fuente: "Contra una puerta, muro o estructura" });
    // 10 de base y 5 éxitos (+2): (10 + 2) × 2.
    const r = resolverDanio(10, 5, "Letal", montada.danio);
    assert.equal(r.total, 24);
    assert.equal(montar(sheet, t, { modo: t.ataque!.modos[0].id }).danio.multiplica, undefined);
  });
});
