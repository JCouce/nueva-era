// Tanda E5b del sync Drive 2026-11-14 (docs/plan-sync-2026-11-14.md, docs/sistema.md §11 y S111):
// Chasis Osteomuscular, probado a través del motor (resolverFicha, montarTirada, las filas de ataque,
// Resistir daño, las acciones de aumento y la compra).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { conExtrasDeFicha, conExtrasDirectaDeFicha, resolverFicha, VITALIDAD_DE_FICHA, type FichaResuelta } from "./fichaResuelta";
import { motivoDeBloqueo } from "./habilitacion";
import { ACCIONES } from "./acciones";
import { estadoInicial, type CondicionTirada, type EstadoCondiciones } from "./condiciones";
import { montarTirada, SIN_ELECCION, type TiradaMontada } from "./montaje";
import { ID_SELECTOR_CONTRA } from "./aumentosTiradas";
import { accionesDeAtaque, accionesDirectasDeAtaque } from "./combate";
import { permisosDeDotes } from "./dotesEfectos";
import { resolverGolpe, type EntradaResistir } from "./resistirDanio";
import type { EstadoActivo } from "./estados";
import { aumentosIncompatibles, planCompraAumento } from "./aumentos";
import { usoDeAccionAumento } from "./aumentosAcciones";

const CHASIS = "aum_chasis_osteomuscular";

let n = 0;
function con(sheet: Sheet, catalogoId: string, extra: { nivel?: number; eleccion?: string } = {}): Sheet {
  return { ...sheet, equipo: [...sheet.equipo, { instanciaId: `e5b${++n}`, catalogoId, ...extra }] };
}
const base = (): Sheet => ({ ...defaultSheet(), atributos: { ...defaultSheet().atributos, fuerza: 2 }, fatigaActual: 8, vidaActual: 8 });
// Con la dote Bloqueo (pide Combate Melee 1).
const conBloqueo = (s: Sheet): Sheet => ({
  ...s,
  habilidades: { ...s.habilidades, combate_melee: { ...s.habilidades.combate_melee, valor: 1 } },
  dotes: [...s.dotes, { id: "dote_bloqueo" }],
});
const conChasis = (nivel: number, s: Sheet = base()) => con(s, CHASIS, { nivel });

const resolver = (s: Sheet, estados: EstadoActivo[] = []) => resolverFicha(s, { estados, vitalidad: VITALIDAD_DE_FICHA });
const filas = (s: Sheet, estados: EstadoActivo[] = []) => {
  const f = resolver(s, estados);
  // Los permisos de las dotes sin mirar requisitos (Bloqueo pide Combate Melee). Con las piezas que el
  // Shock apaga o penaliza, como las pasa AccionesTab.
  return accionesDeAtaque(s, f.modificadores, permisosDeDotes(s), { inutilizadas: f.piezasInutilizadas, penalizadas: f.piezasPenalizadas });
};
const punetazo = (s: Sheet) => filas(con(s, "pelea_punetazo")).find((t) => t.label === "Golpear con Puñetazo")!;

const tiradaFija = (f: FichaResuelta, id: string) => conExtrasDeFicha(f, ACCIONES.find((a) => a.id === id)!);
function montar(f: FichaResuelta, id: string, cambios: EstadoCondiciones = {}): TiradaMontada {
  const t = tiradaFija(f, id);
  return montarTirada(f, t, { ...SIN_ELECCION, estadoCondiciones: { ...estadoInicial(t.condiciones ?? []), ...cambios } });
}
function selector(f: FichaResuelta, id: string): Extract<CondicionTirada, { tipo: "opcion" }> {
  const c = tiradaFija(f, id).condiciones?.find((x) => x.id.startsWith(ID_SELECTOR_CONTRA));
  assert.ok(c && c.tipo === "opcion", `sin selector en ${id}`);
  return c;
}
const linea = (m: TiradaMontada, re: RegExp) => m.desglose.filter((l) => re.test(l.etiqueta));
// Las líneas del Chasis sin la de su casilla de ventaja (nivel 4, a 0).
const SIN_VENTAJA = /^(?!Fuerza del chasis).*Chasis/;

const GOLPE: EntradaResistir = { tipo: "cinetico", critico: false, danio: 10, reactivo: false, conBrazo: false, marcadas: [], rompeBlindaje: 0, categoria: null };
const lineaChasis = (s: Sheet, estados: EstadoActivo[] = [], tipo: EntradaResistir["tipo"] = "cinetico") =>
  resolverGolpe(resolver(s, estados), { ...GOLPE, tipo }).desglose.filter((l) => /Chasis/.test(l.etiqueta));

describe("E5b · Chasis Osteomuscular, nivel 1", () => {
  test("Fuerza +1 en la ficha (atributo, como un aumento permanente)", () => {
    assert.equal(resolver(conChasis(1)).atributos.fuerza - resolver(base()).atributos.fuerza, 1);
    assert.equal(resolver(conChasis(1)).requisitosDotes.atributos.fuerza, 3, "cuenta para los requisitos de dote");
  });

  test("armadura natural 1 en Resistir daño, también contra Eléctrico; contra Mental, no", () => {
    assert.deepEqual(lineaChasis(conChasis(1)).map((l) => l.valor), [1]);
    assert.deepEqual(lineaChasis(conChasis(1), [], "electrico").map((l) => l.valor), [1]);
    assert.deepEqual(lineaChasis(conChasis(1), [], "mental"), []);
  });

  test("golpes desarmados letales, sin daño extra; bloquear desarmado sin el −3", () => {
    const sin = punetazo(base());
    const n1 = punetazo(conChasis(1));
    assert.equal(sin.ataque!.modos[0].categoriaDanio, "No Letal");
    assert.equal(n1.ataque!.modos[0].categoriaDanio, "Letal");
    assert.equal(n1.ataque!.modos[0].danio, sin.ataque!.modos[0].danio! + 1, "solo la Fuerza +1");
    assert.match(n1.nota ?? "", /Daño letal \(Chasis Osteomuscular 1\)/);
    const bloqueo = filas(conBloqueo(con(conChasis(1), "pelea_punetazo"))).find((t) => t.label === "Bloquear con Puñetazo");
    assert.equal(bloqueo?.sinPenalizadorDesarmado, "Chasis Osteomuscular 1");
  });
});

describe("E5b · Chasis Osteomuscular, niveles 2-4", () => {
  test("Fuerza +N y armadura natural N por nivel (el alto sustituye al bajo)", () => {
    const fuerza = resolver(base()).atributos.fuerza;
    for (const nivel of [1, 2, 3, 4]) {
      assert.equal(resolver(conChasis(nivel)).atributos.fuerza - fuerza, nivel, `nivel ${nivel}`);
      assert.deepEqual(lineaChasis(conChasis(nivel)).map((l) => l.valor), [nivel], `nivel ${nivel}`);
    }
  });

  test("daño desarmado +0/+1/+2/+3 sobre la Fuerza, letal en todos", () => {
    const sin = punetazo(base()).ataque!.modos[0].danio!;
    for (const [nivel, extra] of [[1, 0], [2, 1], [3, 2], [4, 3]] as const) {
      const fila = punetazo(conChasis(nivel));
      assert.equal(fila.ataque!.modos[0].danio, sin + nivel + extra, `nivel ${nivel}`);
      assert.equal(fila.ataque!.modos[0].categoriaDanio, "Letal");
      assert.equal(/Daño desarmado: Chasis Osteomuscular/.test(fila.nota ?? ""), extra > 0, `nivel ${nivel}`);
    }
  });

  test("se suma al de la armadura (Pesada +2)", () => {
    const pesada = con(base(), "armadura_pesada");
    const fila = punetazo(conChasis(3, pesada));
    assert.equal(fila.ataque!.modos[0].danio, punetazo(pesada).ataque!.modos[0].danio! + 3 + 2);
    assert.match(fila.nota ?? "", /Daño desarmado con la armadura: Armadura Pesada \+2/);
    assert.match(fila.nota ?? "", /Daño desarmado: Chasis Osteomuscular 3 \+2/);
  });

  test("salvaciones: +N contra el derribo (casilla en Saltar, levantarse) y contra el aturdimiento; el 1, nada", () => {
    for (const nivel of [2, 3, 4]) {
      const f = resolver(conChasis(nivel));
      const salto = montar(f, "atletismo", { aum_chasis_derribo: true });
      assert.deepEqual(linea(salto, /evitar un derribo/).map((l) => l.valor), [nivel], `derribo ${nivel}`);
      const aturdido = montar(f, "salv_fortaleza", { [selector(f, "salv_fortaleza").id]: "aturdimiento" });
      assert.deepEqual(linea(aturdido, SIN_VENTAJA).map((l) => l.valor), [nivel], `aturdimiento ${nivel}`);
      const shock = montar(f, "salv_fortaleza", { [selector(f, "salv_fortaleza").id]: "shock" });
      assert.deepEqual(linea(shock, SIN_VENTAJA), [], "solo el aturdimiento");
    }
    const n1 = resolver(conChasis(1));
    assert.equal(tiradaFija(n1, "atletismo").condiciones?.some((c) => c.id === "aum_chasis_derribo") ?? false, false);
  });
});

describe("E5b · Chasis Osteomuscular, incompatibilidades", () => {
  const INCOMPATIBLES = [
    "aum_integridad_osteotendinosa",
    "aum_matriz_osea_adaptativa",
    "aum_hipertrofia_miofibrilar",
    "aum_sincronizacion_neuromotora_profunda",
    "aum_regeneracion_tisular_acelerada",
  ];

  test("no se compra con ninguna de las cinco operaciones, en los dos sentidos (también al subir de nivel)", () => {
    for (const op of INCOMPATIBLES) {
      const plan = planCompraAumento(con(base(), op), { catalogoId: CHASIS, nivel: 1 });
      assert.equal(plan.ok, false, op);
      assert.match(plan.ok ? "" : plan.motivo, /^Incompatible con /);
      assert.equal(planCompraAumento(conChasis(1), { catalogoId: op }).ok, false, `${op} tras el Chasis`);
      assert.equal(planCompraAumento(con(conChasis(1), op), { catalogoId: CHASIS, nivel: 2, eleccion: "proyector_pulso" }).ok, false, `subir con ${op}`);
    }
    assert.equal(planCompraAumento(base(), { catalogoId: CHASIS, nivel: 1 }).ok, true);
    assert.equal(planCompraAumento(conChasis(1), { catalogoId: "aum_mielinizacion_central" }).ok, true, "las demás, sí");
  });

  test("una ficha que ya tiene las dos solo lleva el aviso", () => {
    const s = con(conChasis(1), "aum_integridad_osteotendinosa");
    assert.equal(aumentosIncompatibles(s).length, 2);
    assert.equal(resolver(s).atributos.fuerza - resolver(base()).atributos.fuerza, 2, "las dos siguen dando su Fuerza");
  });
});

describe("E5b · Integración táctica: Proyector de Pulso", () => {
  const conProyector = (nivel: number, s: Sheet = base()) => con(s, CHASIS, { nivel, eleccion: "proyector_pulso" });
  const disparo = (s: Sheet) => filas(s).find((t) => t.label === "Disparar Proyector de Pulso integrado (Combate a Distancia)");

  test("se elige al comprar el nivel 2+ (Proyector), no en el 1", () => {
    assert.equal(planCompraAumento(conChasis(1), { catalogoId: CHASIS, nivel: 2 }).ok, false);
    const sin = planCompraAumento(conChasis(1), { catalogoId: CHASIS, nivel: 2 });
    assert.match(sin.ok ? "" : sin.motivo, /Elige subsistema integrado/);
    assert.equal(planCompraAumento(conChasis(1), { catalogoId: CHASIS, nivel: 2, eleccion: "proyector_pulso" }).ok, true);
    assert.equal(planCompraAumento(base(), { catalogoId: CHASIS, nivel: 1, eleccion: "proyector_pulso" }).ok, false);
    assert.equal(disparo(conChasis(1)), undefined);
  });

  test("el disparo cobra 2 de fatiga y no gasta cargas (sin recurso ni contador de disparos)", () => {
    const s = conProyector(2);
    const f = resolver(s);
    const t = conExtrasDeFicha(f, disparo(s)!);
    assert.equal(t.recursoInstanciaId, undefined);
    assert.ok(t.ataque!.modos.every((m) => m.gasto === undefined && !m.disparoPulso));
    for (const modo of ["pulso", "pulso_cargado", "barrido"]) {
      const m = montarTirada(f, t, { ...SIN_ELECCION, estadoCondiciones: { ...estadoInicial(t.condiciones ?? []), modo } });
      assert.equal(m.costeFatiga, 2, modo);
    }
    assert.equal(t.origen?.id, CHASIS, "el origen es el implante");
    assert.match(t.nota ?? "", /Integrado en Chasis Osteomuscular 2 \(nivel 2\): cada disparo cuesta 2 de fatiga, sin cargas/);
  });

  test("Activar Aguijón cobra 2 de fatiga, sin carga; golpear con el Aguijón pide el estado", () => {
    const s = conProyector(3);
    const activar = accionesDirectasDeAtaque(s).find((a) => a.label === "Activar Aguijón (Proyector de Pulso integrado)")!;
    assert.equal(activar.costeFatiga, 2);
    assert.equal(activar.gastoRecurso, undefined);
    assert.equal(activar.habilitacion, undefined, "sin cargas que mirar");
    assert.deepEqual(activar.estadoAlUsar, { estadoId: "aguijon_activo", fijo: { gradoId: "activo", turnos: 3 } });
    const golpe = filas(s).find((t) => t.label === "Golpear con Proyector de Pulso integrado (Aguijón)")!;
    assert.match(golpe.requiereEstado?.motivo ?? "", /2 de fatiga/);
  });

  test("el nivel del subsistema es el del Chasis: daño 8 + N y modos adicionales hasta el suyo", () => {
    for (const nivel of [2, 3, 4]) {
      const t = disparo(conProyector(nivel))!;
      assert.equal(t.ataque!.modos.find((m) => m.id === "pulso")!.danio, 8 + nivel, `nivel ${nivel}`);
      const adicional = t.condiciones?.find((c) => c.id === "modo_adicional");
      const modos = adicional?.tipo === "opcion" ? adicional.opciones.length - 1 : 0;
      assert.equal(modos, nivel - 1, `modos adicionales del nivel ${nivel}`);
    }
  });

  test("no ocupa ranura ni pide armadura: sale sin armadura y no cuenta como subsistema instalado", () => {
    const s = conProyector(2);
    assert.ok(disparo(s));
    assert.equal(s.equipo.some((p) => p.instaladoEnId), false);
  });
});

describe("E5b · Integración táctica: Camuflaje Trifásico", () => {
  const conCamuflaje = (nivel: number, s: Sheet = base()) => con(s, CHASIS, { nivel, eleccion: "camuflaje_trifasico" });
  const activar = (s: Sheet) => {
    const a = accionesDirectasDeAtaque(s).find((x) => x.label === "Activar Camuflaje Trifásico integrado");
    return a && conExtrasDirectaDeFicha(resolver(s), a);
  };
  const ESTATICO: EstadoActivo = { estadoId: "camuflaje", gradoId: "estatico", rondasRestantes: 10 };

  test("activarlo cobra 2 de fatiga, sin carga; sus modos, con el nivel del Chasis", () => {
    const a = activar(conCamuflaje(3))!;
    assert.equal(a.costeFatiga, 2);
    assert.equal(a.gastoRecurso, undefined);
    assert.equal(a.origen?.id, CHASIS);
    assert.equal(a.habilitacion, undefined);
    const modo = a.condiciones?.find((c) => c.id === "modo_camuflaje");
    assert.ok(modo?.tipo === "opcion");
    assert.match(modo.opciones[0].etiqueta, /30 minutos/, "estático del nivel 3");
  });

  test("con Traje Ultra Ligero (o Ropa Inteligente, Reforzada o nada) funciona; con Armadura Ligera, bloqueado con motivo", () => {
    for (const armadura of [null, "traje_ultra_ligero", "ropa_inteligente", "ropa_reforzada"]) {
      const s = conCamuflaje(2, armadura ? con(base(), armadura) : base());
      assert.equal(activar(s)!.habilitacion?.estado ?? "activa", "activa", String(armadura));
      assert.ok(resolver(s).ocultacion, `${armadura}: ocultación`);
    }
    const ligera = conCamuflaje(2, con(base(), "armadura_ligera"));
    const a = activar(ligera)!;
    assert.equal(a.habilitacion?.estado, "bloqueada");
    assert.match(motivoDeBloqueo(a.habilitacion) ?? "", /Armadura Ligera bloquea el camuflaje integrado/);
    assert.equal(resolver(ligera).ocultacion, null, "ni la pasiva ni la activa");
  });

  test("la cobertura se suma al Sigilo: activo, el modo del nivel; sin activar, la pasiva (sin batería)", () => {
    const s = conCamuflaje(4);
    const o = resolver(s, [ESTATICO]).ocultacion!;
    assert.equal(o.nivel, 4);
    assert.equal(o.activo?.id, "estatico");
    assert.deepEqual(o.activo?.cobertura, { visual: 4, termica: 4, acustica: 4 });
    assert.deepEqual(resolver(s).ocultacion?.pasiva, { termica: 3, acustica: 3 });
    assert.equal(resolver(s).ocultacion?.fuente, "Camuflaje Trifásico integrado");
  });

  test("el Proyector no sale con el Camuflaje elegido, ni al revés", () => {
    assert.equal(filas(conCamuflaje(2)).some((t) => /Proyector/.test(t.label)), false);
    assert.equal(activar(con(base(), CHASIS, { nivel: 2, eleccion: "proyector_pulso" })), undefined);
  });
});

describe("E5b · Chasis Osteomuscular, nivel 4", () => {
  const n4 = () => con(base(), CHASIS, { nivel: 4, eleccion: "proyector_pulso" });

  test("casilla de ventaja por 2 de fatiga en Potencia y Fortaleza (salvaciones incluidas), no en Reflejos", () => {
    const f = resolver(n4());
    const salto = montar(f, "atletismo", { aum_chasis_ventaja: true });
    assert.match(salto.ventaja ?? "", /^Fuerza del chasis \(ventaja, 2 de fatiga\)/);
    assert.equal(salto.costeFatiga, 2);
    const salv = montar(f, "salv_fortaleza", { aum_chasis_ventaja: true });
    assert.ok(salv.ventaja);
    assert.equal(tiradaFija(f, "salv_reflejos").condiciones?.some((c) => c.id === "aum_chasis_ventaja") ?? false, false);
    assert.equal(tiradaFija(resolver(con(base(), CHASIS, { nivel: 3, eleccion: "proyector_pulso" })), "atletismo").condiciones?.some((c) => c.id === "aum_chasis_ventaja") ?? false, false, "solo el 4");
  });

  test("Duplicar la capacidad de carga cobra 2 de fatiga (la carga, a mano)", () => {
    const uso = usoDeAccionAumento(n4(), [], "aumentos_chasis_carga");
    assert.ok(uso.ok);
    assert.equal(uso.sheet.fatigaActual, 6);
    const fila = resolver(n4()).accionesAumentos.directas.find((a) => a.id === "aumentos_chasis_carga");
    assert.match(fila?.nota ?? "", /Una vez por descanso/);
    assert.equal(resolver(conChasis(1)).accionesAumentos.directas.some((a) => a.id === "aumentos_chasis_carga"), false);
  });
});

describe("E5b · Chasis Osteomuscular y el Shock", () => {
  const shock = (gradoId: string): EstadoActivo[] => [{ estadoId: "shock", gradoId, rondasRestantes: 1 }];
  const golpe = (s: Sheet, estados: EstadoActivo[] = []) => filas(con(s, "pelea_punetazo"), estados).find((t) => t.label === "Golpear con Puñetazo")!;

  test("golpe desarmado: apagado (fracaso crítico) ni letal ni +N; penalizado, +N con −2/−1 y sigue letal", () => {
    const chasis4 = conChasis(4);
    const normal = golpe(chasis4);
    assert.equal(normal.ataque!.modos[0].categoriaDanio, "Letal");
    // Apagado: el golpe de la ficha sin el Chasis (la Fuerza tampoco sube).
    const sinChasis = golpe(base());
    const apagado = golpe(chasis4, shock("fracaso_critico"));
    assert.equal(apagado.ataque!.modos[0].categoriaDanio, sinChasis.ataque!.modos[0].categoriaDanio);
    assert.equal(apagado.ataque!.modos[0].danio, sinChasis.ataque!.modos[0].danio);
    assert.equal(/Chasis/.test(apagado.nota ?? ""), false);
    // Fracaso: Fuerza +4 → +2 y el +3 del golpe → +1 (4 menos que sin Shock); el letal se queda.
    const penalizado = golpe(chasis4, shock("fracaso"));
    assert.equal(penalizado.ataque!.modos[0].categoriaDanio, "Letal");
    assert.equal(penalizado.ataque!.modos[0].danio, normal.ataque!.modos[0].danio! - 4);
    assert.match(penalizado.nota ?? "", /Chasis Osteomuscular 4 \(shock\) \+1/);
    // Éxito: −1 a cada bono (Fuerza y golpe).
    assert.equal(golpe(chasis4, shock("exito")).ataque!.modos[0].danio, normal.ataque!.modos[0].danio! - 2);
  });

  test("Refuerzo de Combate: inmune al Shock (placas del traje), sigue letal y con su +1", () => {
    const a = con(base(), "armadura_pesada");
    const armadura = a.equipo[a.equipo.length - 1].instanciaId;
    const conRefuerzo: Sheet = { ...a, equipo: [...a.equipo, { instanciaId: "rc5b", catalogoId: "refuerzo_combate", nivel: 1, instaladoEnId: armadura }] };
    const normal = golpe(conRefuerzo);
    assert.equal(normal.ataque!.modos[0].categoriaDanio, "Letal");
    const equipo: EstadoActivo[] = [{ estadoId: "shock_equipo", gradoId: "fracaso_critico", rondasRestantes: 1 }];
    for (const estados of [equipo, shock("fracaso_critico")]) {
      const g = golpe(conRefuerzo, estados);
      assert.equal(g.ataque!.modos[0].categoriaDanio, "Letal");
      assert.equal(g.ataque!.modos[0].danio, normal.ataque!.modos[0].danio);
    }
  });

  const s = () => con(base(), CHASIS, { nivel: 3, eleccion: "proyector_pulso" });

  test("en fracaso pierde 2 de cada bono: Fuerza +1, armadura natural 1 y +1 contra el aturdimiento", () => {
    const fuerza = resolver(base()).atributos.fuerza;
    const f = resolver(s(), shock("fracaso"));
    assert.equal(f.atributos.fuerza - fuerza, 1);
    assert.deepEqual(lineaChasis(s(), shock("fracaso")).map((l) => l.valor), [1]);
    const aturdido = montar(f, "salv_fortaleza", { [selector(f, "salv_fortaleza").id]: "aturdimiento" });
    assert.deepEqual(linea(aturdido, /Chasis/).map((l) => l.valor), [1]);
  });

  test("en fracaso crítico se apaga: sin Fuerza ni armadura, y el Proyector integrado sale bloqueado", () => {
    const fuerza = resolver(base()).atributos.fuerza;
    const ficha = s();
    const f = resolver(ficha, shock("fracaso_critico"));
    assert.equal(f.atributos.fuerza, fuerza);
    assert.deepEqual(lineaChasis(ficha, shock("fracaso_critico")).map((l) => l.valor), [0]);
    const disparo = filas(ficha, shock("fracaso_critico")).find((t) => t.label === "Disparar Proyector de Pulso integrado (Combate a Distancia)")!;
    assert.equal(conExtrasDeFicha(f, disparo).habilitacion?.estado, "bloqueada");
  });

  test("el Camuflaje integrado se apaga con el Chasis", () => {
    const cam = con(base(), CHASIS, { nivel: 2, eleccion: "camuflaje_trifasico" });
    assert.ok(resolver(cam).ocultacion);
    assert.equal(resolver(cam, shock("fracaso_critico")).ocultacion, null);
  });
});
