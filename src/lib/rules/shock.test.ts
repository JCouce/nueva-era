import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import type { PiezaEquipada } from "./equipo";
import { equipoPorId } from "../catalog/equipo";
import { ACCIONES, type Accion } from "./acciones";
import { accionesDeAtaque, accionesDirectasDeAtaque } from "./combate";
import { accionesDeAumentos, usoDeAccionAumento } from "./aumentosAcciones";
import { bloqueoDeAccionAumento, conExtrasDeFicha, conExtrasDirectaDeFicha, estadosParaPintar, resolverFicha, VITALIDAD_DE_FICHA, type FichaResuelta } from "./fichaResuelta";
import { resolverGolpe } from "./resistirDanio";
import { explicacionDeEstado } from "./explicacionEstado";
import { lineaAntes } from "./textosDeTirada";
import { estadoPorId } from "../catalog/estados";
import { eleccionSinTocar, montarTirada, type TiradaMontada } from "./montaje";
import { descontarDuracion, type EstadoActivo } from "./estados";
import { operacionesDe } from "./estadosFicha";
import { aplicarOperacionEstado } from "./vidaPorEstados";
import { planDeshacerEstados } from "./registro";
import {
  afectacionDePiezas,
  alShockDePieza,
  conShockEnModificadores,
  economiaSoloComplejaOReaccion,
  esComplejaOReaccion,
  esModoComplejo,
  shockDePieza,
  trozosDeEtiqueta,
} from "./shock";
import { casillaBlindajeBrazo, casillaBlindajeReactivo } from "./blindaje";
import { ID_BLOQUEAR_BRAZO } from "./brazoBionico";
import { accionesDeFarmacos, accionesDirectasDeFarmacos } from "./farmacos";
import { idSelectorTipoAccion } from "./tipoAccion";
import { consultaIndiceCondiciones } from "./equipo";
import { MEJORAS_ESTANDAR } from "../catalog/mejorasEstandar";
import type { ModificadorConFuente } from "./modificadores";
import type { Habilitacion } from "./habilitacion";

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
const bloqueadaPor = (motivo: string): Habilitacion => ({ estado: "bloqueada", motivo, arbitraje: "duro" });
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
        // «Ojo Biónico (shock)» a 0 (antes «Ojo Biónico: apagada por Shock»; usuario 2026-11-14).
        assert.match(l.etiqueta, / \(shock\)$/, `${t.label}: ${l.etiqueta}`);
        assert.equal(l.valor, 0);
      }
    }
  });

  test("el desglose dice por qué: el ataque del fusil pierde el Ojo y la Mira", () => {
    const antes = montar(sinShock, ataque(sinShock, "fusil"));
    const despues = montar(apagado, ataque(apagado, "fusil"));
    assert.ok(antes.desglose.some((l) => l.etiqueta.includes("Ojo Biónico") && l.valor > 0));
    assert.ok(despues.desglose.some((l) => l.etiqueta === "Ojo Biónico (shock)" && l.valor === 0));
    assert.ok(despues.desglose.some((l) => l.etiqueta === "Mira Telescópica (shock)" && l.valor === 0));
    assert.ok(despues.total < antes.total);
    // Igual que sin las piezas: la ficha sin ellas tira lo mismo.
    const sinPiezas = resolver({ ...ficha, equipo: ficha.equipo.filter((p) => !["ojo", "mira", "neuro"].includes(p.instanciaId)) }, []);
    assert.equal(despues.total, montar(sinPiezas, ataque(sinPiezas, "fusil")).total);
  });

  test("sus acciones propias salen bloqueadas con el motivo", () => {
    assert.deepEqual(ataque(apagado, "laser").habilitacion, bloqueadaPor("Apagada por Shock en el equipo."));
    assert.equal(ataque(sinShock, "laser").habilitacion, undefined);
    const camuflaje = accionesDirectasDeAtaque(apagado.ficha)
      .map((d) => conExtrasDirectaDeFicha(apagado, d))
      .find((d) => d.origen?.instanciaId === "cam");
    assert.deepEqual(camuflaje?.habilitacion, bloqueadaPor("Apagada por Shock en el equipo."));
    // El servidor (usarAccionAumentoAction) lee FichaResuelta.accionesAumentos: ahí ya sale bloqueada.
    const activar = apagado.accionesAumentos.directas.find((a) => a.origen?.instanciaId === "neuro");
    assert.deepEqual(activar?.habilitacion, bloqueadaPor("Apagada por Shock."));
    assert.equal(sinShock.accionesAumentos.directas.find((a) => a.origen?.instanciaId === "neuro")?.habilitacion, undefined);
    // La lista cruda no sabe del Shock: lo decide habilitacionEnFicha, en un solo sitio.
    assert.equal(accionesDeAumentos(ficha, [shock("fracaso_critico")]).directas.find((a) => a.origen?.instanciaId === "neuro")?.habilitacion, undefined);
  });

  test("una tirada que concede un implante apagado sale bloqueada con su motivo (Tempestad Nanobótica)", () => {
    const conEnjambre = con(base, { instanciaId: "enj", catalogoId: "aum_enjambre_nanobot", nivel: 4 });
    const tempestad = (f: FichaResuelta) => {
      const fila = f.accionesAumentos.filas.find((x) => x.tipo === "tirada" && x.accion.origen?.instanciaId === "enj");
      assert.ok(fila?.tipo === "tirada");
      return conExtrasDeFicha(f, fila.accion);
    };
    assert.equal(tempestad(resolver(conEnjambre, [])).habilitacion, undefined);
    const apagada = tempestad(resolver(conEnjambre, [shock("fracaso_critico")]));
    assert.deepEqual(apagada.habilitacion, bloqueadaPor("Apagada por Shock."));
    // El Shock gana al motivo que ya traía (sin fatiga), como antes.
    const sinFatiga = tempestad(resolver({ ...conEnjambre, fatigaActual: 1 }, [shock("fracaso_critico")]));
    assert.deepEqual(sinFatiga.habilitacion, bloqueadaPor("Apagada por Shock."));
  });
});

describe("servidor: bloqueoDeAccionAumento (usarAccionAumentoAction)", () => {
  const activarNeuro = (f: FichaResuelta) => f.accionesAumentos.directas.find((a) => a.origen?.instanciaId === "neuro")!;

  test("implante apagado: rechaza con el motivo", () => {
    const f = resolver(ficha, [shock("fracaso_critico")]);
    assert.equal(bloqueoDeAccionAumento(f, activarNeuro(f).id), "Apagada por Shock.");
  });

  test("sin Shock, pasa", () => {
    const f = resolver(ficha, []);
    assert.equal(bloqueoDeAccionAumento(f, activarNeuro(f).id), null);
    assert.equal(usoDeAccionAumento(ficha, [], activarNeuro(f).id).ok, true);
  });

  test("sin fatiga no es cosa suya: lo sigue diciendo usoDeAccionAumento", () => {
    const sinFatiga = { ...ficha, fatigaActual: 0 };
    const f = resolver(sinFatiga, []);
    const id = activarNeuro(f).id;
    assert.equal(bloqueoDeAccionAumento(f, id), null);
    const uso = usoDeAccionAumento(sinFatiga, [], id);
    assert.ok(!uso.ok);
    assert.match(uso.error, /No te llega la fatiga/);
  });
});

// pl-02 cambiado (usuario 2026-11-14): ya no es «a mano». Cada bono positivo de la pieza pierde N
// sin bajar de 0, por separado; los negativos no cambian; la tirada que la usa lleva −N.
describe("pieza penalizada: −N a cada bono (suelo 0) y −N al usarla", () => {
  test("fracaso: el bono del Ojo en el ataque del fusil baja 2, sin avisos «a mano»", () => {
    const sin = resolver(ficha, []);
    const con = resolver(ficha, [shock("fracaso")]);
    const t = ataque(con, "fusil");
    assert.ok(!t.textosDeFicha?.some((x) => /a mano/.test(x.texto)));
    // El +2 del Ojo 3 al ataque a distancia (modificador con `item`) pasa a +0.
    assert.ok(montar(sin, ataque(sin, "fusil")).desglose.some((l) => l.etiqueta === "Ojo Biónico 3" && l.valor === 2));
    assert.ok(montar(con, t).desglose.some((l) => l.etiqueta === "Ojo Biónico (shock)" && l.valor === 0));
    // Menos que sin Shock (no −2 justo: la Mira, que no se apila con el Ojo, recupera su sitio).
    assert.ok(montar(con, t).total < montar(sin, ataque(sin, "fusil")).total);
    // Su casilla de cobertura (+1) pasa a +0, y lo dice.
    // Por id: desde el sync Drive 2026-11-14 el Ojo trae además su casilla de ventaja en el ataque.
    const casilla = (f: FichaResuelta) =>
      ataque(f, "fusil").condiciones!.find((c) => c.origen?.instanciaId === "ojo" && c.tipo === "toggle" && c.id === "aum_ojo_cobertura_distancia");
    const antes = casilla(sin);
    assert.ok(antes?.tipo === "toggle" && antes.valorActivo === 1);
    const tocada = casilla(con)!;
    assert.ok(tocada.tipo === "toggle" && tocada.valorActivo === 0);
    assert.match(tocada.etiqueta, /Ojo Biónico 3 \(shock\)$/);
  });

  test("conShockEnModificadores: cada bono por separado, suelo 0; negativos y factores intactos", () => {
    const item = { tipo: "equipo" as const, id: "x", label: "Pieza X", instanciaId: "px" };
    const p = new Map([["px", { origen: item, valor: 2, fuente: "Shock en el equipo (fracaso)", estado: { tipo: "estado" as const, id: "shock_equipo", label: "Shock en el equipo" } }]]);
    const mods: ModificadorConFuente[] = [
      { tipo: "atributo", id: "fuerza", valor: 3, origen: "equipo", fuente: "Pieza X 3", item },
      { tipo: "tirada", alcance: { tipo: "todas" }, valor: 1, origen: "equipo", fuente: "Pieza X 3", item },
      { tipo: "derivado", id: "carrera", valor: -3, origen: "equipo", fuente: "Pieza X 3", item },
      { tipo: "multiplicadorVida", valor: 1.5, origen: "equipo", fuente: "Pieza X 3", item },
      { tipo: "atributo", id: "agilidad", valor: 2, origen: "equipo", fuente: "Otra" },
    ];
    assert.deepEqual(
      conShockEnModificadores(mods, p).map((m) => [m.valor, m.fuente]),
      [
        [1, "Pieza X (shock)"],
        [0, "Pieza X (shock)"],
        [-3, "Pieza X 3"],
        [1.5, "Pieza X 3"],
        [2, "Otra"],
      ],
    );
  });

  test("éxito en el equipo: la pistola láser lleva «Pistola Láser (shock) −1» al dispararla", () => {
    const sin = resolver(ficha, []);
    const f = resolver(ficha, [shockEquipo("exito")]);
    const t = ataque(f, "laser");
    assert.equal(t.habilitacion, undefined);
    const m = montar(f, t);
    assert.ok(m.desglose.some((l) => l.etiqueta === "Pistola Láser (shock)" && l.valor === -1));
    assert.equal(m.total, montar(sin, ataque(sin, "laser")).total - 1);
    assert.ok(!t.textosDeFicha?.some((x) => /a mano/.test(x.texto)));
  });

  test("atributo: el +Fuerza del Exoesqueleto pierde N sin bajar de 0 y baja la Fuerza en toda la ficha", () => {
    const exo = (nivel: number): Sheet => con(base, { instanciaId: "exo", catalogoId: "exoesqueleto", nivel });
    const sin1 = resolver(exo(1), []);
    const fr1 = resolver(exo(1), [shockEquipo("fracaso")]);
    assert.equal(fr1.atributos.fuerza, sin1.atributos.fuerza - 1); // +1 → +0, no −1
    assert.ok(fr1.desgloses.atributos.fuerza.fuentes.some((x) => x.etiqueta === "Exoesqueleto (shock)" && x.valor === 0));
    assert.equal(fr1.movimiento.bonoExoesqueleto, 0); // el doble de movimiento y carga baja con él
    assert.ok(fr1.aplicados.potencia <= sin1.aplicados.potencia);
    const sin3 = resolver(exo(3), []);
    const ex3 = resolver(exo(3), [shockEquipo("exito")]);
    assert.equal(ex3.atributos.fuerza, sin3.atributos.fuerza - 1); // +3 → +2
    assert.equal(ex3.movimiento.bonoExoesqueleto, 4);
    assert.equal(ex3.cargaMaxima, sin3.cargaMaxima - 2 * 20);
  });

  test("Volar: la Maniobrabilidad −3 (negativa) no cambia y lleva «Movilidad Aérea (shock) −2»", () => {
    const s = con(base, { instanciaId: "vuelo", catalogoId: "movilidad_aerea", nivel: 1 });
    const sin = resolver(s, []);
    const f = resolver(s, [shockEquipo("fracaso")]);
    const volar = (x: FichaResuelta) => conExtrasDeFicha(x, x.accionesMovimiento[0]);
    const m = montar(f, volar(f));
    assert.ok(m.desglose.some((l) => l.etiqueta === "Maniobrabilidad (Movilidad Aérea)" && l.valor === -3));
    assert.ok(m.desglose.some((l) => l.etiqueta === "Movilidad Aérea (shock)" && l.valor === -2));
    assert.equal(m.total, montar(sin, volar(sin)).total - 2);
  });

  test("bono por tramo de la Mira Telescópica 3: cada tramo pierde N por separado, sin bajar de 0", () => {
    const s = con(base, FUSIL, { instanciaId: "mira3", catalogoId: "mira_telescopica", nivel: 3, instaladoEnId: "fusil" });
    const sin = ataque(resolver(s, []), "fusil").bonosTramo!.find((b) => b.origen?.instanciaId === "mira3")!;
    const con2 = ataque(resolver(s, [shockEquipo("fracaso")]), "fusil").bonosTramo!.find((b) => b.origen?.instanciaId === "mira3")!;
    assert.equal(con2.fuente, "Mira Telescópica (shock)");
    for (const [tramo, v] of Object.entries(sin.porTramo)) assert.equal(con2.porTramo[tramo], v! > 0 ? Math.max(0, v! - 2) : v, tramo);
  });

  test("Resistir daño: «Escudo Deflector (shock)» con lo que absorbe de verdad (apagado 0, penalizado −N)", () => {
    const s = con(base, ARMADURA, { instanciaId: "def", catalogoId: "escudo_deflector", nivel: 3, instaladoEnId: "a1" });
    const linea = (estados: EstadoActivo[]) =>
      resolverGolpe(resolver(s, estados), { tipo: "cinetico", critico: false, danio: 10, reactivo: false, conBrazo: false, marcadas: [], rompeBlindaje: 0, categoria: null }).desglose.find((l) =>
        l.etiqueta.startsWith("Escudo Deflector"),
      );
    assert.deepEqual([linea([])?.etiqueta, linea([])?.valor], ["Escudo Deflector", 3]);
    assert.deepEqual([linea([shockEquipo("exito")])?.etiqueta, linea([shockEquipo("exito")])?.valor], ["Escudo Deflector (shock)", 2]);
    assert.deepEqual([linea([shockEquipo("fracaso")])?.etiqueta, linea([shockEquipo("fracaso")])?.valor], ["Escudo Deflector (shock)", 1]);
    assert.deepEqual([linea([shockEquipo("fracaso_critico")])?.etiqueta, linea([shockEquipo("fracaso_critico")])?.valor], ["Escudo Deflector (shock)", 0]);
    // La armadura (inmune) no cambia.
    const armadura = (estados: EstadoActivo[]) =>
      resolverGolpe(resolver(s, estados), { tipo: "cinetico", critico: false, danio: 10, reactivo: false, conBrazo: false, marcadas: [], rompeBlindaje: 0, categoria: null }).desglose[0];
    assert.deepEqual(armadura([shockEquipo("fracaso_critico")]), armadura([]));
  });
});

describe("arma incorporada en un Brazo Biónico apagado (usuario 2026-11-14)", () => {
  const s = con(
    base,
    { instanciaId: "brazo", catalogoId: "aum_brazo_bionico", nivel: 4, eleccion: "fuerte", armaIncorporada: "esp" },
    { instanciaId: "esp", catalogoId: "espada_ligera" },
  );
  const golpe = (f: FichaResuelta) => tiradas(f).find((t) => t.origen?.instanciaId === "esp" && t.grupo === "Ataques")!;

  test("bloqueada con el motivo de la pieza; sin el brazo encendido, activa", () => {
    assert.equal(golpe(resolver(s, [])).habilitacion, undefined);
    assert.deepEqual(golpe(resolver(s, [shock("fracaso_critico")])).habilitacion, bloqueadaPor("Apagada por Shock (Brazo Biónico)."));
  });

  test("sin textos que digan lo contrario: ni los atributos del brazo ni desenfundar gratis", () => {
    const encendido = golpe(resolver(s, []));
    assert.ok(encendido.textosDeFicha?.some((x) => /Fuerza \d+ y la Agilidad \d+ del brazo/.test(x.texto)));
    assert.match(lineaAntes(encendido), /Desenfundar: acción gratuita \(Brazo Biónico 4/);
    const apagado = golpe(resolver(s, [shock("fracaso_critico")]));
    assert.ok(!apagado.textosDeFicha?.some((x) => /del brazo/.test(x.texto)));
    assert.equal(apagado.extremidad, undefined);
    assert.doesNotMatch(lineaAntes(apagado), /gratuita/);
    assert.doesNotMatch(apagado.nota ?? "", /del brazo/);
  });
});

describe("explicacionDeEstado: lo que dice el modal del chip", () => {
  test("las piezas con regla propia, con lo que hacen; detrás de las apagadas o penalizadas", () => {
    const s = con(ficha, INYECTOR, soporte(3));
    const de2 = (estados: EstadoActivo[]) => explicacionDeEstado(estadosParaPintar(resolver(s, estados)).find((e) => e.estadoId === "shock_equipo")!).piezas;
    const propias = "Inyector Hipodérmico: funciona como nivel 1. Soporte Vital: salvaciones a +1; pierde la resistencia a congelación y a frío o calor extremos.";
    assert.equal(de2([shockEquipo("fracaso")]), `Funcionan peor (−2 a su bono y −2 al usarlas): Camuflaje Trifásico, Pistola Láser, Mira Telescópica. ${propias}`);
    assert.equal(de2([shockEquipo("fracaso_critico")]), `Apagadas: Camuflaje Trifásico, Pistola Láser, Mira Telescópica. ${propias}`);
    // Solo las dos: sin «No llevas nada…».
    const solo = con(base, ARMADURA, INYECTOR, soporte(1));
    assert.equal(explicacionDeEstado(estadosParaPintar(resolver(solo, [shockEquipo("exito")])).find((e) => e.estadoId === "shock_equipo")!).piezas, propias);
  });

  const de = (s: Sheet, estados: EstadoActivo[], id: string) => explicacionDeEstado(estadosParaPintar(resolver(s, estados)).find((e) => e.estadoId === id)!);

  test("Shock en el equipo, fracaso: las piezas de esta ficha que funcionan peor", () => {
    const x = de(ficha, [shockEquipo("fracaso")], "shock_equipo");
    assert.equal(x.titulo, "Shock en el equipo");
    assert.equal(x.grado, "Fracaso");
    assert.deepEqual(x.efecto, ["Tus piezas electrónicas funcionan peor: −2 a su bono y −2 al usarlas."]);
    assert.equal(x.duracion, "1 ronda");
    assert.equal(x.piezas, "Funcionan peor (−2 a su bono y −2 al usarlas): Camuflaje Trifásico, Pistola Láser, Mira Telescópica.");
  });

  test("Shock del cuerpo, fracaso crítico: las apagadas", () => {
    assert.equal(de(ficha, [shock("fracaso_critico")], "shock").piezas, "Apagadas: Ojo Biónico, Neuroprótesis Simpática.");
  });

  test("sin nada a lo que le afecte, lo dice; con éxito crítico, sin lista", () => {
    assert.equal(de(base, [shockEquipo("fracaso")], "shock_equipo").piezas, "No llevas nada a lo que le afecte.");
    assert.equal(de(ficha, [shockEquipo("exito_critico")], "shock_equipo").piezas, null);
  });

  test("un estado que no toca piezas: solo su explicación", () => {
    const x = de(base, [{ estadoId: "aturdido", gradoId: "fracaso", rondasRestantes: 2 }], "aturdido");
    assert.equal(x.titulo, "Aturdido");
    assert.equal(x.piezas, null);
    assert.ok(x.efecto.length > 0);
    assert.equal(x.duracion, "2 rondas");
  });

  test("los textos de los grados ya no dicen «a mano»", () => {
    for (const id of ["shock", "shock_equipo"]) {
      for (const g of estadoPorId(id)!.grados) for (const d of g.detalle) assert.doesNotMatch(d, /a mano/, `${id}/${g.id}`);
    }
  });
});

// T7b (eq-29, decisiones del usuario 2026-11-14): regla propia en todos los grados con efecto, en
// vez de la general (ni se apaga ni lleva −N). Éxito crítico: nada.
const GRADOS_CON_EFECTO = ["fracaso_critico", "fracaso", "exito"] as const;
const INYECTOR: PiezaEquipada = { instanciaId: "iny", catalogoId: "inyector_hipodermico", nivel: 2, instaladoEnId: "a1" };
const soporte = (nivel: number): PiezaEquipada => ({ instanciaId: "sv", catalogoId: "soporte_vital", nivel, instaladoEnId: "a1" });
const conFarmacos = (s: Sheet): Sheet => ({ ...s, farmacos: { ...s.farmacos, farmaco_gel_sanador: 2, farmaco_analgesico: 1 } });

// Una opción del selector «Contra…» de una salvación (undefined si no sale o no hay selector).
function opcion(f: FichaResuelta, salvacion: string, amenaza: string) {
  const c = consultaIndiceCondiciones(f.indiceCondiciones, { id: salvacion, grupo: "Salvaciones", habilidad: null, modoElegido: null }).find(
    (x) => x.id === `aum_contra_${salvacion}`,
  );
  return c?.tipo === "opcion" ? c.opciones.find((o) => o.id === amenaza) : undefined;
}
// El desglose de la salvación con una opción del «Contra…» elegida.
function desgloseContra(f: FichaResuelta, salvacion: string, amenaza: string) {
  const t = conExtrasDeFicha(f, ACCIONES.find((a) => a.id === salvacion)!);
  const eleccion = eleccionSinTocar(t);
  return montarTirada(f, t, { ...eleccion, estadoCondiciones: { ...eleccion.estadoCondiciones, [`aum_contra_${salvacion}`]: amenaza } }).desglose;
}

describe("regla propia al Shock (alShock): datos del catálogo", () => {
  test("Inyector 2 como el nivel 1; Soporte Vital, desde el 1 y heredada en el 2 y el 3", () => {
    assert.equal(alShockDePieza(equipoPorId("inyector_hipodermico")!, 1), undefined);
    assert.deepEqual(alShockDePieza(equipoPorId("inyector_hipodermico")!, 2), { tipo: "comoNivel", nivel: 1 });
    for (const n of [1, 2, 3]) {
      assert.deepEqual(alShockDePieza(equipoPorId("soporte_vital")!, n), { tipo: "salvacionesA", valor: 1, pierde: ["congelacion", "termicos"] });
    }
  });

  test("un `comoNivel` siempre apunta a un nivel inferior que existe", () => {
    for (const m of MEJORAS_ESTANDAR) {
      for (const n of m.niveles) {
        const r = n.alShock;
        if (r?.tipo !== "comoNivel") continue;
        assert.ok(r.nivel < n.nivel, `${m.id} ${n.nivel}`);
        assert.ok(m.niveles.some((x) => x.nivel === r.nivel), `${m.id} ${n.nivel}`);
      }
    }
  });

  test("ninguna entrada `motor` sigue bloqueada por la pregunta 32", () => {
    for (const m of MEJORAS_ESTANDAR) for (const n of m.niveles) for (const x of n.motor ?? []) assert.notEqual(x.bloqueoPor, "pregunta 32", `${m.id} ${n.nivel}`);
  });
});

describe("Inyector Hipodérmico 2 con el Shock: funciona como el nivel 1", () => {
  const s = conFarmacos(con(base, ARMADURA, INYECTOR));
  const gel = (f: FichaResuelta) => conExtrasDeFicha(f, accionesDeFarmacos(f.ficha, []).find((t) => t.farmacoId === "farmaco_gel_sanador")!);
  const analgesico = (f: FichaResuelta) => conExtrasDirectaDeFicha(f, accionesDirectasDeFarmacos(f.ficha, []).find((d) => d.farmacoId === "farmaco_analgesico")!);

  for (const grado of GRADOS_CON_EFECTO) {
    test(`${grado}: ni apagado ni penalizado; inyectarse simple con la marca, sin la gratuita/reacción`, () => {
      const f = resolver(s, [shockEquipo(grado)]);
      assert.equal(f.piezasInutilizadas.has("iny"), false);
      assert.equal(f.piezasPenalizadas.has("iny"), false);
      assert.deepEqual(f.piezasConReglaPropia.get("iny")?.regla, { tipo: "comoNivel", nivel: 1 });
      const g = gel(f);
      assert.equal(g.habilitacion, undefined);
      assert.match(lineaAntes(g), /Inyectarse: acción simple\. Solo sobre ti\. \(Inyector Hipodérmico \(shock\)\)/);
      assert.doesNotMatch(lineaAntes(g), /gratuita|reacción/);
      assert.equal(g.condiciones?.some((c) => c.id === idSelectorTipoAccion("inyectarse")) ?? false, false);
      // Ni −N a nada: la tirada del fármaco no lleva línea del Inyector.
      assert.ok(!(g.ajustesFijos ?? []).some((a) => /Inyector/.test(a.fuente)));
      const d = analgesico(f);
      assert.match(d.nota!, /Inyectarse: acción simple\. Solo sobre ti/);
      assert.ok(!d.condiciones?.some((c) => c.id === idSelectorTipoAccion("inyectarse")));
    });
  }

  test("éxito crítico (y sin Shock): el nivel 2 entero", () => {
    for (const estados of [[], [shockEquipo("exito_critico")]]) {
      const f = resolver(s, estados);
      assert.equal(f.piezasConReglaPropia.size, 0);
      const g = gel(f);
      assert.match(lineaAntes(g), /Inyectarse: acción simple, o acción gratuita o reacción, una vez por turno\. Solo sobre ti\. \(Inyector Hipodérmico 2\)/);
      assert.ok(g.condiciones?.some((c) => c.id === idSelectorTipoAccion("inyectarse")));
    }
  });

  test("el Shock del cuerpo no lo toca (es equipo)", () => {
    assert.equal(resolver(s, [shock("fracaso_critico")]).piezasConReglaPropia.size, 0);
  });
});

describe("Soporte Vital con el Shock: salvaciones a +1, la resistencia térmica fuera", () => {
  for (const nivel of [1, 2, 3]) {
    const s = con(base, ARMADURA, soporte(nivel));

    test(`nivel ${nivel}, sin Shock: el Blindaje Ambiental +${nivel} con su nota y la térmica +1`, () => {
      const f = resolver(s, []);
      for (const amenaza of ["toxinas", "radiacion"]) {
        const o = opcion(f, "salv_fortaleza", amenaza)!;
        assert.equal(o.valor, nivel);
        assert.match(o.nota ?? "", /protección total/);
      }
      assert.equal(opcion(f, "salv_fortaleza", "termicos")?.valor, 1);
      assert.ok(opcion(f, "salv_fortaleza", "congelacion")!.partes!.some((p) => p.fuente === `Soporte Vital ${nivel}` && p.valor === 1));
    });

    for (const grado of GRADOS_CON_EFECTO) {
      test(`nivel ${nivel}, ${grado}: toxinas y radiación a +1 sin la protección total; congelación y térmicos sin él`, () => {
        const f = resolver(s, [shockEquipo(grado)]);
        assert.equal(f.piezasInutilizadas.has("sv"), false);
        assert.equal(f.piezasPenalizadas.has("sv"), false);
        assert.ok(f.piezasConReglaPropia.has("sv"));
        for (const amenaza of ["toxinas", "radiacion"]) {
          const o = opcion(f, "salv_fortaleza", amenaza)!;
          assert.equal(o.valor, 1, amenaza);
          assert.deepEqual(o.partes, [{ fuente: "Soporte Vital (shock)", valor: 1, origen: { tipo: "equipo", id: "soporte_vital", label: "Soporte Vital", instanciaId: "sv" } }]);
          assert.doesNotMatch(o.nota ?? "", /protección total/);
        }
        // Frío o calor extremos solo los cubría él: la opción desaparece.
        assert.equal(opcion(f, "salv_fortaleza", "termicos"), undefined);
        // La congelación sigue por la armadura, sin línea del Soporte.
        const cong = opcion(f, "salv_fortaleza", "congelacion")!;
        assert.ok(!cong.partes!.some((p) => /Soporte/.test(p.fuente)));
        // En el desglose: «… · Soporte Vital (shock)» +1, con la marca aparte (en azul).
        const linea = desgloseContra(f, "salv_fortaleza", "toxinas").find((l) => /Soporte Vital/.test(l.etiqueta))!;
        assert.match(linea.etiqueta, /Contra…: Toxinas · Soporte Vital \(shock\)$/);
        assert.equal(linea.valor, 1);
        assert.ok(trozosDeEtiqueta(linea.etiqueta).some((t) => t.shock));
        // Ninguna línea «(shock)» a 0 por apagado.
        assert.ok(!desgloseContra(f, "salv_fortaleza", "toxinas").some((l) => /Soporte Vital/.test(l.etiqueta) && l.valor === 0));
      });
    }

    test(`nivel ${nivel}, éxito crítico: intacto`, () => {
      const f = resolver(s, [shockEquipo("exito_critico")]);
      assert.equal(opcion(f, "salv_fortaleza", "toxinas")?.valor, nivel);
      assert.equal(opcion(f, "salv_fortaleza", "termicos")?.valor, 1);
    });
  }
});

// Ojo 1: +3 contra la ceguera desde el sync Drive 2026-11-14 (M3.1; antes +2).
describe("bonos «Contra…» de otra pieza con la regla general (Ojo Biónico 3: +3 contra la ceguera)", () => {
  const s = con(base, OJO);
  const contraCeguera = (f: FichaResuelta) => opcion(f, "salv_fortaleza", "ceguera");

  test("sin Shock, +3 con su pieza en las partes", () => {
    const o = contraCeguera(resolver(s, []))!;
    assert.equal(o.valor, 3);
    assert.deepEqual(o.partes, [{ fuente: "Ojo Biónico 3", valor: 3, origen: { tipo: "aumento", id: "aum_ojo_bionico", label: "Ojo Biónico", instanciaId: "ojo" } }]);
  });

  test("penalizada: −2 sin bajar de 0 (fracaso) y −1 (éxito), con «(shock)» en su línea", () => {
    const fracaso = resolver(s, [shock("fracaso")]);
    assert.deepEqual(contraCeguera(fracaso)!.partes?.map((p) => [p.fuente, p.valor]), [["Ojo Biónico (shock)", 1]]);
    assert.equal(contraCeguera(fracaso)!.valor, 1);
    assert.equal(contraCeguera(resolver(s, [shock("exito")]))!.valor, 2);
    const linea = desgloseContra(fracaso, "salv_fortaleza", "ceguera").find((l) => /Ojo Biónico/.test(l.etiqueta))!;
    // La inmunidad del Ojo 3 (no numérica) sigue: «Ceguera · inmune».
    assert.match(linea.etiqueta, /^Contra…: Ceguera · inmune · Ojo Biónico \(shock\)$/);
    assert.equal(linea.valor, 1);
  });

  test("apagada: su bono no llega y la salvación lo dice con «Ojo Biónico (shock)» a 0", () => {
    const f = resolver(s, [shock("fracaso_critico")]);
    assert.equal(contraCeguera(f), undefined);
    const t = conExtrasDeFicha(f, ACCIONES.find((a) => a.id === "salv_fortaleza")!);
    const linea = montar(f, t).desglose.find((l) => /Ojo Biónico/.test(l.etiqueta))!;
    assert.equal(linea.etiqueta, "Ojo Biónico (shock)");
    assert.equal(linea.valor, 0);
  });

  test("los negativos no cambian: el −1 de la Neuroprótesis activa (activable), con su pieza", () => {
    const conNeuro = con(base, NEURO);
    const activa: EstadoActivo = { estadoId: "aum_neuroprotesis", gradoId: "activo", rondasRestantes: 3 };
    const o = opcion(resolver(conNeuro, [activa, shock("fracaso")]), "salv_fortaleza", "toxinas")!;
    assert.equal(o.valor, -1);
    assert.equal(o.partes?.[0].origen?.instanciaId, "neuro");
    assert.doesNotMatch(o.partes![0].fuente, /shock/);
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

describe("trozosDeEtiqueta: la marca «(shock)» aparte, para resaltarla", () => {
  test("al final, en medio y sin marca", () => {
    assert.deepEqual(trozosDeEtiqueta("Mira Telescópica (shock)"), [{ texto: "Mira Telescópica " }, { texto: "(shock)", shock: true }]);
    assert.deepEqual(trozosDeEtiqueta("Cobertura (shock) · Ojo"), [{ texto: "Cobertura " }, { texto: "(shock)", shock: true }, { texto: " · Ojo" }]);
    assert.deepEqual(trozosDeEtiqueta("Reflejos"), [{ texto: "Reflejos" }]);
  });
});

// Fracaso del Shock sobre los implantes (fuente aumentos.md «Implantes», sync Drive 2026-11-14):
// además del −2, «no podrá ejecutar acciones complejas ni reacciones con el implante».
describe("Shock (fracaso): sin acciones complejas ni reacciones con los implantes", () => {
  const MOTIVO_BRAZO = "Shock (fracaso): sin acciones complejas ni reacciones con Brazo Biónico.";
  const MOTIVO_ENJAMBRE = "Shock (fracaso): sin acciones complejas ni reacciones con Enjambre Nanobot.";
  // Brazo 4 (Fuerte: bloquea) con la Maza de Kerzul incorporada (Estándar y Compleja), Bloqueo, el
  // Enjambre 4 (Densificar y Tempestad) y la Neuroprótesis 1.
  const s: Sheet = (() => {
    const b = con(
      ficha,
      { instanciaId: "brazo", catalogoId: "aum_brazo_bionico", nivel: 4, eleccion: "fuerte", armaIncorporada: "maza" },
      { instanciaId: "maza", catalogoId: "kerzul_maza" },
      { instanciaId: "enj", catalogoId: "aum_enjambre_nanobot", nivel: 4 },
    );
    const cm = b.habilidades.combate_melee;
    return { ...b, habilidades: { ...b.habilidades, combate_melee: { ...cm, valor: Math.max(cm.valor, 1) } }, dotes: [...b.dotes, { id: "dote_bloqueo" }] };
  })();
  const bloquearBrazo = (f: FichaResuelta) => tiradas(f).find((t) => t.id === ID_BLOQUEAR_BRAZO)!;
  const golpeMaza = (f: FichaResuelta) => tiradas(f).find((t) => t.origen?.instanciaId === "maza" && t.grupo === "Ataques")!;
  const bloquearMaza = (f: FichaResuelta) => tiradas(f).find((t) => t.origen?.instanciaId === "maza" && t.grupo === "Defensa")!;
  const activarNeuro = (f: FichaResuelta) => f.accionesAumentos.directas.find((a) => a.origen?.instanciaId === "neuro")!;
  const tempestad = (f: FichaResuelta) => {
    const fila = f.accionesAumentos.filas.find((x) => x.tipo === "tirada" && x.accion.origen?.instanciaId === "enj");
    assert.ok(fila?.tipo === "tirada");
    return conExtrasDeFicha(f, fila.accion);
  };
  const densificar = (f: FichaResuelta) => casillaBlindajeReactivo(f.ficha, "cinetico", false, f.fatigaEnJuego.actual, f.piezasPenalizadas)!;
  const opcionesDeModo = (t: Accion) => {
    const m = t.condiciones?.find((c) => c.id === "modo");
    return m?.tipo === "opcion" ? m.opciones.map((o) => o.etiqueta) : [];
  };

  test("el grado fracaso del Shock del cuerpo lo marca y lo dice; el del equipo, no", () => {
    const fracaso = estadoPorId("shock")!.grados.find((g) => g.id === "fracaso")!;
    assert.deepEqual(fracaso.piezas, { penaliza: 2, sinComplejasNiReacciones: true });
    assert.ok(fracaso.detalle.includes("No puedes hacer acciones complejas ni reacciones con los implantes."));
    assert.deepEqual(estadoPorId("shock_equipo")!.grados.find((g) => g.id === "fracaso")!.piezas, { penaliza: 2 });
    assert.deepEqual(estadoPorId("shock")!.grados.find((g) => g.id === "exito")!.piezas, { penaliza: 1 });
    assert.equal(afectacionDePiezas(s, [shock("fracaso")]).penalizadas.get("brazo")?.sinComplejasNiReacciones, true);
    assert.equal(afectacionDePiezas(s, [shock("exito")]).penalizadas.get("brazo")?.sinComplejasNiReacciones, undefined);
  });

  test("fracaso: Bloquear con el brazo biónico y bloquear con el arma incorporada, bloqueadas", () => {
    const f = resolver(s, [shock("fracaso")]);
    assert.deepEqual(bloquearBrazo(f).habilitacion, bloqueadaPor(MOTIVO_BRAZO));
    assert.deepEqual(bloquearMaza(f).habilitacion, bloqueadaPor(MOTIVO_BRAZO));
    // Sin Shock, activas.
    const sin = resolver(s, []);
    assert.equal(bloquearBrazo(sin).habilitacion, undefined);
    assert.equal(bloquearMaza(sin).habilitacion, undefined);
  });

  test("fracaso: Densificar (reacción del Enjambre) bloqueada en Resistir daño y no suma aunque venga marcada", () => {
    const f = resolver(s, [shock("fracaso")]);
    assert.equal(densificar(f).bloqueada, MOTIVO_ENJAMBRE);
    assert.equal(casillaBlindajeBrazo(f.ficha, "cinetico", f.piezasPenalizadas)?.bloqueada, MOTIVO_BRAZO);
    const golpe = { tipo: "cinetico" as const, critico: false, danio: 10, reactivo: true, conBrazo: true, marcadas: [], rompeBlindaje: 0, categoria: null };
    const r = resolverGolpe(f, golpe);
    assert.ok(!r.desglose.some((l) => /Densificar|Bloqueado con el brazo/.test(l.etiqueta)));
    const sin = resolver(s, []);
    assert.equal(densificar(sin).bloqueada, null);
    assert.ok(resolverGolpe(sin, golpe).desglose.some((l) => /Densificar/.test(l.etiqueta)));
  });

  test("fracaso: lo que admite otra vía o no es complejo sigue (Activar Neuroprótesis, Tempestad, el golpe Estándar)", () => {
    const f = resolver(s, [shock("fracaso")]);
    // «Acción gratuita en tu turno o reacción»: queda la gratuita.
    assert.equal(activarNeuro(f).habilitacion, undefined);
    assert.equal(bloqueoDeAccionAumento(f, activarNeuro(f).id), null);
    assert.equal(tempestad(f).habilitacion, undefined);
    // El golpe con la maza incorporada: sin el modo Compleja en el selector.
    const golpe = golpeMaza(f);
    assert.equal(golpe.habilitacion, undefined);
    assert.deepEqual(opcionesDeModo(golpe), ["Estándar"]);
    assert.deepEqual(opcionesDeModo(golpeMaza(resolver(s, []))), ["Estándar", "Compleja"]);
  });

  test("éxito del Shock y fracaso del Shock en el equipo: nada de esto se bloquea", () => {
    for (const estados of [[shock("exito")], [shockEquipo("fracaso")]]) {
      const f = resolver(s, estados);
      assert.equal(bloquearBrazo(f).habilitacion, undefined);
      assert.equal(bloquearMaza(f).habilitacion, undefined);
      assert.equal(densificar(f).bloqueada, null);
      assert.equal(activarNeuro(f).habilitacion, undefined);
      assert.equal(tempestad(f).habilitacion, undefined);
      assert.deepEqual(opcionesDeModo(golpeMaza(f)), ["Estándar", "Compleja"]);
    }
  });

  test("economiaSoloComplejaOReaccion: todas las vías complejas o reacción", () => {
    for (const e of ["Acción compleja", "Reacción", "reaccion", "compleja", "Acción compleja o reacción"]) assert.equal(economiaSoloComplejaOReaccion(e), true, e);
    for (const e of [
      "Acción gratuita en tu turno o reacción",
      "Acción simple o reacción",
      "Acción simple o estándar (cuenta la más compleja)",
      "Acción estándar, cuerpo a cuerpo",
      "Acción extendida de 10 minutos",
      "",
    ])
      assert.equal(economiaSoloComplejaOReaccion(e), false, e);
  });

  test("esModoComplejo y esComplejaOReaccion", () => {
    assert.equal(esModoComplejo("Compleja"), true);
    assert.equal(esModoComplejo("Compleja (F. Auto)"), true);
    assert.equal(esModoComplejo("Estándar / Compleja"), false);
    assert.equal(esModoComplejo(undefined), false);
    const hoja = (x: Partial<Accion>): Accion => ({ id: "x", label: "x", grupo: "Ataques", aplicado: "potencia", habilidad: null, ...x });
    assert.equal(esComplejaOReaccion(hoja({ grupo: "Defensa" })), true);
    assert.equal(esComplejaOReaccion({ id: "e", label: "Levantar", grupo: "Defensa", familiaArma: "levantar_escudo" }), false);
    assert.equal(esComplejaOReaccion(hoja({ economia: "Acción compleja" })), true);
    const modo = (etiqueta: string) => ({ id: etiqueta, etiqueta, danio: 1, formulaDanio: null, categoriaDanio: "Letal" });
    assert.equal(esComplejaOReaccion(hoja({ ataque: { modos: [modo("Compleja")] } })), true);
    assert.equal(esComplejaOReaccion(hoja({ ataque: { modos: [modo("Estándar"), modo("Compleja")] } })), false);
    assert.equal(esComplejaOReaccion(hoja({})), false);
  });
});
