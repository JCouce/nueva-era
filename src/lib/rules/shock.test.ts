import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import type { PiezaEquipada } from "./equipo";
import { equipoPorId } from "../catalog/equipo";
import { ACCIONES, type Accion } from "./acciones";
import { accionesDeAtaque, accionesDirectasDeAtaque } from "./combate";
import { accionesDeAumentos } from "./aumentosAcciones";
import { conExtrasDeFicha, conExtrasDirectaDeFicha, resolverFicha, VITALIDAD_DE_FICHA, type FichaResuelta } from "./fichaResuelta";
import { eleccionSinTocar, montarTirada, type TiradaMontada } from "./montaje";
import { descontarDuracion, type EstadoActivo } from "./estados";
import { operacionesDe } from "./estadosFicha";
import { aplicarOperacionEstado } from "./vidaPorEstados";
import { planDeshacerEstados } from "./registro";
import { afectacionDePiezas, shockDePieza } from "./shock";

// Las piezas van directas a sheet.equipo (los implantes no pasan por equipar).
const con = (s: Sheet, ...piezas: PiezaEquipada[]): Sheet => ({ ...s, equipo: [...s.equipo, ...piezas] });
const OJO: PiezaEquipada = { instanciaId: "ojo", catalogoId: "aum_ojo_bionico", nivel: 3 };
const NEURO: PiezaEquipada = { instanciaId: "neuro", catalogoId: "aum_neuroprotesis_simpatica", nivel: 1 };
const ARMADURA: PiezaEquipada = { instanciaId: "a1", catalogoId: "armadura_pesada" };
const CAMUFLAJE: PiezaEquipada = { instanciaId: "cam", catalogoId: "camuflaje_trifasico", nivel: 1, instaladoEnId: "a1" };
const LASER: PiezaEquipada = { instanciaId: "laser", catalogoId: "pistola_laser" };
const FUSIL: PiezaEquipada = { instanciaId: "fusil", catalogoId: "fusil_asalto_impetus" };
const MIRA: PiezaEquipada = { instanciaId: "mira", catalogoId: "mira_telescopica", nivel: 2, instaladoEnId: "fusil" };

const base: Sheet = { ...defaultSheet(), fatigaActual: 10, vidaActual: 10 };
const ficha = con(base, OJO, NEURO, ARMADURA, CAMUFLAJE, LASER, FUSIL, MIRA);

const shock = (gradoId: string, rondas = 1): EstadoActivo => ({ estadoId: "shock", gradoId, rondasRestantes: rondas });
const shockEquipo = (gradoId: string, rondas = 1): EstadoActivo => ({ estadoId: "shock_equipo", gradoId, rondasRestantes: rondas });
const resolver = (s: Sheet, estados: EstadoActivo[]) => resolverFicha(s, { estados, vitalidad: VITALIDAD_DE_FICHA });

// Todas las tiradas de la ficha: las fijas y las de sus armas, con lo de la ficha encima.
function tiradas(f: FichaResuelta): Accion[] {
  return [...ACCIONES.filter((a) => !a.libre), ...accionesDeAtaque(f.ficha, f.modificadores, f.extrasDotes.permisos)].map((t) => conExtrasDeFicha(f, t));
}
const montar = (f: FichaResuelta, t: Accion): TiradaMontada => montarTirada(f, t, eleccionSinTocar(t));
const ataque = (f: FichaResuelta, instanciaId: string) => tiradas(f).find((t) => t.origen?.instanciaId === instanciaId && t.grupo === "Ataques")!;

// Todos los orígenes de aporte que lleva una tirada ya con lo de la ficha.
function origenesDe(t: Accion): (string | undefined)[] {
  return [
    ...(t.condiciones ?? []).map((c) => c.origen?.instanciaId),
    ...(t.ajustesFijos ?? []).map((a) => a.origen?.instanciaId),
    ...(t.bonosTramo ?? []).map((b) => b.origen?.instanciaId),
    ...(t.efectos ?? []).map((e) => e.origen?.instanciaId),
    ...(t.textosDeFicha ?? []).map((x) => x.origen?.instanciaId),
    t.extremidad?.origen?.instanciaId,
    t.origenVentaja?.instanciaId,
    t.criticoFijo?.origen?.instanciaId,
  ];
}

describe("cómo le afecta el Shock a cada pieza (shockDePieza)", () => {
  const de = (id: string, nivel?: number) => shockDePieza(equipoPorId(id)!, nivel);

  test("valores por defecto de familia", () => {
    assert.equal(de("aum_ojo_bionico", 1), "cuerpo");
    assert.equal(de("aum_hipertrofia_miofibrilar"), "inmune");
    assert.equal(de("camuflaje_trifasico", 1), "equipo");
    assert.equal(de("soporte_vital", 1), "equipo");
    assert.equal(de("exoesqueleto", 1), "equipo");
    assert.equal(de("radar", 1), "equipo");
    assert.equal(de("armadura_pesada"), "inmune");
    assert.equal(de("espada"), "inmune");
    assert.equal(de("bipode", 1), "inmune");
  });

  test("las armas de energía, sí; las de bala, no", () => {
    for (const id of ["pistola_laser", "pistola_rayo_ligero", "escopeta_plasma_sc", "ametralladora_electro_tk", "canon_plasma"]) assert.equal(de(id), "equipo", id);
    for (const id of ["pistola_bellum", "fusil_asalto_impetus", "arco_tactico", "lanzallamas_ligero"]) assert.equal(de(id), "inmune", id);
  });

  test("lo que dice la pieza, por nivel", () => {
    assert.equal(de("inyector_hipodermico", 1), "inmune");
    assert.equal(de("inyector_hipodermico", 2), "equipo");
    assert.equal(de("polimero_anticorrosivo", 2), "inmune");
    assert.equal(de("tejido_conductor", 1), "inmune");
    assert.equal(de("mira_telescopica", 1), "inmune");
    assert.equal(de("mira_telescopica", 3), "equipo");
    assert.equal(de("puntero_laser", 1), "equipo");
  });
});

describe("qué apaga y qué penaliza cada grado (afectacionDePiezas)", () => {
  test("Shock del cuerpo, fracaso crítico: apaga los implantes, no el equipo", () => {
    const a = afectacionDePiezas(ficha, [shock("fracaso_critico")]);
    assert.deepEqual([...a.inutilizadas], [["ojo", "Shock"], ["neuro", "Shock"]]);
    assert.equal(a.penalizadas.size, 0);
  });

  test("Shock en el equipo, fracaso crítico: todo el equipo electrónico a la vez", () => {
    const a = afectacionDePiezas(ficha, [shockEquipo("fracaso_critico")]);
    assert.deepEqual([...a.inutilizadas.keys()].sort(), ["cam", "laser", "mira"]);
  });

  test("fracaso y éxito penalizan −2 y −1; el éxito crítico, nada", () => {
    assert.equal(afectacionDePiezas(ficha, [shock("fracaso")]).penalizadas.get("ojo")?.valor, 2);
    assert.equal(afectacionDePiezas(ficha, [shockEquipo("exito")]).penalizadas.get("laser")?.valor, 1);
    const ec = afectacionDePiezas(ficha, [shock("exito_critico"), shockEquipo("exito_critico")]);
    assert.equal(ec.inutilizadas.size + ec.penalizadas.size, 0);
  });
});

describe("pieza apagada: ninguno de sus aportes llega a ninguna tirada", () => {
  const sinShock = resolver(ficha, []);
  const apagado = resolver(ficha, [shock("fracaso_critico"), shockEquipo("fracaso_critico")]);

  test("piezasInutilizadas trae las apagadas con su motivo", () => {
    assert.equal(apagado.piezasInutilizadas.get("ojo"), "Shock");
    assert.equal(apagado.piezasInutilizadas.get("mira"), "Shock en el equipo");
    assert.equal(apagado.piezasInutilizadas.has("fusil"), false);
  });

  test("en ninguna tirada queda un aporte de una pieza apagada, ni un bono suyo en el desglose", () => {
    const apagadas = new Set(apagado.piezasInutilizadas.keys());
    assert.ok(!apagado.modificadores.some((m) => m.item?.instanciaId && apagadas.has(m.item.instanciaId)));
    for (const t of tiradas(apagado)) {
      for (const o of origenesDe(t)) assert.ok(!o || !apagadas.has(o), `${t.label} lleva un aporte de ${o}`);
      const m = montar(apagado, t);
      for (const l of m.desglose.filter((l) => /Ojo Biónico|Mira Telescópica|Neuroprótesis/.test(l.etiqueta))) {
        assert.match(l.etiqueta, /: apagada por /, `${t.label}: ${l.etiqueta}`);
        assert.equal(l.valor, 0);
      }
    }
  });

  test("el desglose dice por qué: el ataque del fusil pierde el Ojo y la Mira", () => {
    const antes = montar(sinShock, ataque(sinShock, "fusil"));
    const despues = montar(apagado, ataque(apagado, "fusil"));
    assert.ok(antes.desglose.some((l) => l.etiqueta.includes("Ojo Biónico") && l.valor > 0));
    assert.ok(despues.desglose.some((l) => l.etiqueta === "Ojo Biónico: apagada por Shock" && l.valor === 0));
    assert.ok(despues.desglose.some((l) => l.etiqueta === "Mira Telescópica: apagada por Shock en el equipo"));
    assert.ok(despues.total < antes.total);
    // Igual que sin las piezas: la ficha sin ellas tira lo mismo.
    const sinPiezas = resolver({ ...ficha, equipo: ficha.equipo.filter((p) => !["ojo", "mira", "neuro"].includes(p.instanciaId)) }, []);
    assert.equal(despues.total, montar(sinPiezas, ataque(sinPiezas, "fusil")).total);
  });

  test("sus acciones propias salen bloqueadas con el motivo", () => {
    assert.equal(ataque(apagado, "laser").bloqueada, "Apagada por Shock en el equipo.");
    assert.equal(ataque(sinShock, "laser").bloqueada, undefined);
    const camuflaje = accionesDirectasDeAtaque(apagado.ficha)
      .map((d) => conExtrasDirectaDeFicha(apagado, d))
      .find((d) => d.origen?.instanciaId === "cam");
    assert.equal(camuflaje?.bloqueada, "Apagada por Shock en el equipo.");
    const activar = apagado.accionesAumentos.directas.find((a) => a.origen?.instanciaId === "neuro");
    assert.equal(activar?.bloqueada, "Apagada por Shock.");
    // También en el servidor, que lee accionesDeAumentos.
    assert.equal(accionesDeAumentos(ficha, [shock("fracaso_critico")]).directas.find((a) => a.origen?.instanciaId === "neuro")?.bloqueada, "Apagada por Shock.");
  });
});

describe("pieza penalizada: aviso a mano, sin tocar el número", () => {
  test("fracaso: el ataque donde aporta el Ojo avisa del −2 y suma lo mismo", () => {
    const sin = resolver(ficha, []);
    const con = resolver(ficha, [shock("fracaso")]);
    const t = ataque(con, "fusil");
    const aviso = t.textosDeFicha?.find((x) => x.fuente === "Shock (fracaso)");
    assert.equal(aviso?.texto, "−2 al bono de Ojo Biónico y a usarla, a mano");
    assert.equal(montar(con, t).total, montar(sin, ataque(sin, "fusil")).total);
  });

  test("éxito en el equipo: la pistola láser avisa del −1 al usarla", () => {
    const f = resolver(ficha, [shockEquipo("exito")]);
    const t = ataque(f, "laser");
    assert.equal(t.bloqueada, undefined);
    assert.ok(t.textosDeFicha?.some((x) => x.texto === "−1 al bono de Pistola Láser y a usarla, a mano" && x.fuente === "Shock en el equipo (éxito)"));
  });
});

describe("degradación y parálisis", () => {
  test("el fracaso crítico pasa a fracaso un turno al acabar y luego se acaba", () => {
    const tras1 = descontarDuracion([shock("fracaso_critico")]);
    assert.deepEqual(tras1, [shock("fracaso", 1)]);
    assert.deepEqual(descontarDuracion(tras1), []);
    assert.deepEqual(descontarDuracion([shockEquipo("fracaso_critico", 2)]), [shockEquipo("fracaso_critico", 1)]);
  });

  test("poner el Shock pone también la Parálisis del grado equivalente, 1 ronda", () => {
    const ops = operacionesDe({ tipo: "poner", estado: shock("fracaso_critico", 1) });
    assert.deepEqual(ops[1], { tipo: "poner", estado: { estadoId: "paralisis", gradoId: "fracaso_critico", rondasRestantes: 1 } });
    assert.equal(operacionesDe({ tipo: "poner", estado: shock("exito") })[1]?.tipo, "poner");
    assert.equal(operacionesDe({ tipo: "poner", estado: shock("exito_critico") }).length, 1);
    assert.equal(operacionesDe({ tipo: "poner", estado: shockEquipo("fracaso_critico") }).length, 1);
    assert.equal(operacionesDe({ tipo: "quitar", estadoId: "shock" }).length, 1);
  });

  test("las dos van a la misma entrada y deshacerla quita las dos", () => {
    const p = { id: "c1", sheet: ficha, estados: [] as EstadoActivo[] };
    const [a, b] = operacionesDe({ tipo: "poner", estado: shock("fracaso") });
    const r1 = aplicarOperacionEstado(p, a)!;
    const r2 = aplicarOperacionEstado({ ...p, sheet: r1.vida.sheet, estados: r1.estados }, b)!;
    assert.deepEqual(r2.estados.map((e) => e.estadoId), ["shock", "paralisis"]);
    const plan = planDeshacerEstados(
      { tipo: "estado_poner", cambios: [r1.cambio, r2.cambio] },
      [{ id: "c1", nombre: "Ilkrem", sheet: r2.vida.sheet, estados: r2.estados }],
      [],
      [],
    );
    assert.ok(plan.ok);
    if (plan.ok) assert.deepEqual(plan.plan.personajes[0].estados, []);
  });
});
