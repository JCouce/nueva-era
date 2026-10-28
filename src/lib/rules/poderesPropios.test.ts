// P1 de psiónica (2026-10-28): lo que los poderes hacen a la ficha del propio psiónico.
// Casillas en otras tiradas (Leer Mente, Vínculo, Anclaje, Auto-proyección, Precognición,
// Estabilización) y estados propios (Contención al usarla, Aturdido del fracaso crítico de
// Retrocognición).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ACCIONES, type Accion } from "./acciones";
import { estadoInicial } from "./condiciones";
import { conExtrasDeFicha, resolverFicha, VITALIDAD_DE_FICHA, type FichaResuelta } from "./fichaResuelta";
import { eleccionSinTocar, montarTirada, type EleccionTirada } from "./montaje";
import { defaultSheet, type Sheet } from "./sheet";
import { accionesDePsionica } from "./poderes";
import { nivelesDePsionica, SIN_BONOS_DISCIPLINA } from "./psionica";
import { efectosDelResultado, estadoParaTerminar, estadosPropiosDeUso, prepararPoder, usarPoder, type SeleccionPoder } from "./usoPoder";
import { desgloseBlindaje } from "./blindaje";
import type { EstadoActivo } from "./estados";

function ficha(patch: Partial<Sheet> = {}): Sheet {
  const d = defaultSheet();
  return {
    ...d,
    atributos: { fuerza: 2, agilidad: 2, aguante: 2, percepcion: 1, inteligencia: 1, caracter: 2 },
    vidaActual: 10,
    fatigaActual: 10,
    fatigaTemporal: 0,
    ...patch,
  };
}

const resolver = (s: Sheet, estados: EstadoActivo[] = []) => resolverFicha(s, { estados, vitalidad: VITALIDAD_DE_FICHA });
const fija = (f: FichaResuelta, id: string): Accion => conExtrasDeFicha(f, ACCIONES.find((a) => a.id === id)!);
const condicion = (t: Accion, id: string) => (t.condiciones ?? []).find((c) => c.id === id);
const con = (t: Accion, estado: Record<string, string | boolean>): EleccionTirada => ({
  ...eleccionSinTocar(t),
  estadoCondiciones: { ...estadoInicial(t.condiciones ?? []), ...estado },
});
const total = (f: FichaResuelta, t: Accion, estado: Record<string, string | boolean> = {}) => montarTirada(f, t, con(t, estado)).total;

describe("P1: casillas de poder en otras tiradas", () => {
  test("Leer Mente: «Mente leída» +2 en las enfrentadas, con origen el poder; sin el poder no sale", () => {
    assert.equal(condicion(fija(resolver(ficha()), "social"), "psi_mente_leida"), undefined);
    const f = resolver(ficha({ psionica: { resonancia: 1 } }));
    for (const id of ["social", "defensa", "discernir_mentiras", "resistir_distraccion", "iniciativa_distraccion", "sigilo", "hurto"]) {
      const t = fija(f, id);
      const c = condicion(t, "psi_mente_leida");
      assert.ok(c, id);
      assert.deepEqual(c.origen, { tipo: "poder", id: "psi_resonancia_leer_mente", label: "Leer Mente" });
      assert.equal(total(f, t, { psi_mente_leida: true }) - total(f, t), 2, id);
    }
    assert.equal(condicion(fija(f, "salv_voluntad"), "psi_mente_leida"), undefined);
    assert.equal(condicion(fija(f, "iniciativa"), "psi_mente_leida"), undefined);
  });

  test("Leer Mente: también en la tirada de un poder (grupo Psiónica)", () => {
    const s = ficha({ psionica: { resonancia: 1, induccion: 1 } });
    const niveles = nivelesDePsionica(s, SIN_BONOS_DISCIPLINA).paraEfectos;
    const f = resolver(s);
    const poder = accionesDePsionica(s, niveles).find((p) => p.accion.id === "psi_induccion_comando")!;
    const p = prepararPoder({ ficha: s, modificadores: f.modificadores, niveles, poder, seleccion: SELECCION, indiceCondiciones: f.indiceCondiciones })!;
    assert.ok(condicion(p.tirada!, "psi_mente_leida"));
  });

  test("Vínculo: «Vínculo activo» +1 solo en la salvación de Voluntad", () => {
    const f = resolver(ficha({ psionica: { resonancia: 1 } }));
    const t = fija(f, "salv_voluntad");
    assert.equal(total(f, t, { psi_vinculo_activo: true }) - total(f, t), 1);
    assert.equal(condicion(fija(f, "salv_fortaleza"), "psi_vinculo_activo"), undefined);
  });

  test("Anclaje: «Manteniendo anclaje» −1 en cualquier tirada", () => {
    const f = resolver(ficha({ psionica: { traslacion: 1 } }));
    for (const id of ["salv_fortaleza", "defensa", "sigilo"]) {
      const t = fija(f, id);
      assert.equal(total(f, t, { psi_manteniendo_anclaje: true }) - total(f, t), -1, id);
    }
  });

  test("Auto-proyección: +1 en la esquiva, no en las salvaciones", () => {
    const f = resolver(ficha({ psionica: { traslacion: 1 } }));
    const t = fija(f, "defensa");
    assert.equal(total(f, t, { psi_auto_proyeccion: true }) - total(f, t), 1);
    assert.equal(condicion(fija(f, "salv_reflejos"), "psi_auto_proyeccion"), undefined);
  });

  test("Precognición: selector en Defensa con las cifras de la prosa; no en salvaciones", () => {
    const f = resolver(ficha({ psionica: { resonancia: 2, hipercognicion: 1 } }));
    const t = fija(f, "defensa");
    const c = condicion(t, "psi_precognicion");
    assert.ok(c && c.tipo === "opcion");
    const esperado: Record<string, number> = {
      no: 0,
      critico_dentro: 3,
      critico_fuera: 2,
      exito_dentro: 2,
      exito_fuera: 1,
      fracaso: -1,
      fracaso_critico: -2,
    };
    for (const [opcion, valor] of Object.entries(esperado)) {
      assert.equal(total(f, t, { psi_precognicion: opcion }) - total(f, t), valor, opcion);
    }
    assert.equal(condicion(fija(f, "salv_voluntad"), "psi_precognicion"), undefined);
  });

  test("sin marcar, ninguna casilla cambia la tirada (el total de siempre)", () => {
    const sin = resolver(ficha());
    const con = resolver(ficha({ psionica: { resonancia: 2, hipercognicion: 1, traslacion: 1 } }));
    for (const id of ["defensa", "salv_voluntad", "social", "sigilo"]) {
      assert.equal(total(con, fija(con, id)), total(sin, fija(sin, id)), id);
    }
  });
});

describe("P1: «Estabilizado» (Estabilización, mitigar)", () => {
  const ATURDIDO_LEVE: EstadoActivo = { estadoId: "aturdido", gradoId: "exito", rondasRestantes: 1 }; // −1 a todas
  const conInduccion = (nivel: number, patch: Partial<Sheet> = {}) => ficha({ psionica: { resonancia: 1, induccion: nivel }, ...patch });
  // Malherido (−3): por debajo del 25 % de la vida y por encima del 10 %.
  const malherida = (nivel: number) => {
    const s = conInduccion(nivel);
    return { ...s, vidaActual: Math.floor(resolver(s).salud.vida * 0.2) };
  };

  test("solo sale con algún penalizador", () => {
    assert.equal(condicion(fija(resolver(conInduccion(1)), "salv_fortaleza"), "psi_estabilizado"), undefined);
    assert.ok(condicion(fija(resolver(conInduccion(1), [ATURDIDO_LEVE]), "salv_fortaleza"), "psi_estabilizado"));
  });

  test("nv1-3: éxito −1 y crítico −2 a cada penalizador de estado, sin pasar de 0; heridas, no", () => {
    // Malherido (−3) y Aturdido (éxito, −1).
    const f = resolver(malherida(3), [ATURDIDO_LEVE]);
    assert.equal(f.umbrales.salud, "malherido");
    const t = fija(f, "salv_fortaleza");
    const base = total(f, t);
    assert.equal(total(f, t, { psi_estabilizado: "exito" }) - base, 1);
    assert.equal(total(f, t, { psi_estabilizado: "critico" }) - base, 1, "el −1 de Aturdido no pasa de 0");
    const m = montarTirada(f, t, con(t, { psi_estabilizado: "exito" }));
    assert.ok(m.desglose.some((l) => l.etiqueta === "Estabilizado (estados)" && l.valor === 1));
  });

  test("nv4-5: además fuera heridas y fatiga", () => {
    const f = resolver(malherida(4), [ATURDIDO_LEVE]);
    const t = fija(f, "salv_fortaleza");
    const malherido = 3;
    assert.equal(total(f, t, { psi_estabilizado: "exito" }) - total(f, t), 1 + malherido);
  });

  test("nv6: una sola opción que quita todos los de estado, heridas y fatiga", () => {
    const f = resolver(malherida(6), [{ estadoId: "aturdido", gradoId: "fracaso_critico", rondasRestantes: 1 }]);
    const t = fija(f, "defensa");
    const c = condicion(t, "psi_estabilizado");
    assert.ok(c && c.tipo === "opcion");
    assert.deepEqual(c.opciones.map((o) => o.id), ["no", "exito"]);
    // Aturdido (fracaso crítico) −2 a Defensa y Malherido −3: todo fuera.
    assert.equal(total(f, t, { psi_estabilizado: "exito" }) - total(f, t), 5);
  });

  test("convive con las casillas de la salvación (+2/+3 por Estabilización)", () => {
    const f = resolver(conInduccion(4), [ATURDIDO_LEVE]);
    const ids = (fija(f, "salv_voluntad").condiciones ?? []).map((c) => c.id);
    assert.ok(ids.includes("psi_estabilizado"));
  });
});

const SELECCION: SeleccionPoder = { elecciones: {}, casillas: [], puntosCargas: 0 };

function preparar(s: Sheet, accionId: string, elecciones: Record<string, string> = {}) {
  const niveles = nivelesDePsionica(s, SIN_BONOS_DISCIPLINA).paraEfectos;
  const poder = accionesDePsionica(s, niveles).find((p) => p.accion.id === accionId)!;
  return prepararPoder({ ficha: s, modificadores: [], niveles, poder, seleccion: { ...SELECCION, elecciones } })!;
}
const fr = (s: Sheet) => ({ ficha: s, modificadores: [], peajeNeurologico: null });

describe("P1: Contención pone su estado propio", () => {
  const conContencion = (nivel: number) => ficha({ psionica: { traslacion: 1, contencion: nivel } });

  test("nivel 1: absorción 1 y Agilidad −1, 10 turnos", () => {
    const s = conContencion(1);
    const e = usarPoder(fr(s), preparar(s, "psi_contencion_contencion"));
    assert.deepEqual(e.estadoPropio, { estadoId: "psi_contencion", gradoId: "1_-1", rondasRestantes: 10 });
  });

  test("nivel 5 empleando el 3: absorción 2, Agilidad −2, 30 turnos; nivel 6 el 1 personal, sin Agilidad y hasta quitarlo", () => {
    const s5 = conContencion(5);
    assert.deepEqual(usarPoder(fr(s5), preparar(s5, "psi_contencion_contencion", { nivel: "n3" })).estadoPropio, {
      estadoId: "psi_contencion",
      gradoId: "2_-2",
      rondasRestantes: 30,
    });
    const s6 = conContencion(6);
    assert.deepEqual(usarPoder(fr(s6), preparar(s6, "psi_contencion_contencion", { nivel: "n1" })).estadoPropio, {
      estadoId: "psi_contencion",
      gradoId: "1_0",
      rondasRestantes: null,
    });
  });

  test("prolongar o un poder sin estado no ponen nada (la forma de siempre, sin el campo)", () => {
    const s = conContencion(1);
    assert.equal("estadoPropio" in usarPoder(fr(s), preparar(s, "psi_contencion_contencion"), "prolongar"), false);
    const t = ficha({ psionica: { traslacion: 1 } });
    assert.equal("estadoPropio" in usarPoder(fr(t), preparar(t, "psi_traslacion_auto_proyeccion")), false);
  });

  test("con el estado puesto: −Agilidad en la ficha y absorción en Bloquear daño (también contra fuego, no mental)", () => {
    const s = conContencion(3);
    const sin = resolver(s);
    const f = resolver(s, [{ estadoId: "psi_contencion", gradoId: "2_-2", rondasRestantes: 10 }]);
    assert.equal(f.atributos.agilidad, sin.atributos.agilidad - 2);
    assert.deepEqual(f.blindaje.contencion, { valor: 2, fuente: "Contención" });
    assert.equal(sin.blindaje.contencion, null);
    const linea = (tipo: Parameters<typeof desgloseBlindaje>[1]) =>
      desgloseBlindaje(s, tipo, f.blindaje.armaduraNatural, false, false, f.blindaje.contencion).find((l) => l.etiqueta === "Absorción · Contención");
    assert.equal(linea("cinetico")?.valor, 2);
    assert.equal(linea("fuego")?.valor, 2);
    assert.equal(linea("mental"), undefined);
  });

  test("«Terminar contención» solo con el estado puesto", () => {
    const s = conContencion(1);
    const accion = preparar(s, "psi_contencion_contencion").poder.accion;
    assert.equal(estadoParaTerminar(accion, []), null);
    assert.deepEqual(estadoParaTerminar(accion, [{ estadoId: "psi_contencion", gradoId: "1_-1", rondasRestantes: 4 }]), {
      estadoId: "psi_contencion",
      etiqueta: "Terminar contención",
    });
  });

  test("área de la forma colectiva calculada: 1 casilla por nivel empleado, ×2/×3 según el poseído", () => {
    const area = (nivel: number, empleado: string) =>
      preparar(conContencion(nivel), "psi_contencion_contencion", { nivel: empleado, forma: "ampliada" }).resuelto.objetivo?.area;
    assert.equal(area(2, "n2"), 2);
    assert.equal(area(4, "n1"), 2);
    assert.equal(area(5, "n1"), 3);
    assert.equal(area(5, "n3"), 6);
    assert.equal(area(6, "n3"), 9);
    assert.equal(area(6, "n4"), 8);
    assert.equal(area(6, "n6"), 6);
    assert.equal(preparar(conContencion(5), "psi_contencion_contencion", { nivel: "n1", forma: "personal" }).resuelto.objetivo?.area, undefined);
  });

  test("el servidor lo vuelve a calcular con la ficha: mismo estado; sin el poder, nada", () => {
    const s = conContencion(5);
    const niveles = nivelesDePsionica(s, SIN_BONOS_DISCIPLINA).paraEfectos;
    assert.deepEqual(estadosPropiosDeUso(s, niveles, "psi_contencion_contencion", { nivel: "n3" }, null), [
      { estadoId: "psi_contencion", gradoId: "2_-2", rondasRestantes: 30 },
    ]);
    const sinPoder = ficha();
    assert.deepEqual(estadosPropiosDeUso(sinPoder, nivelesDePsionica(sinPoder, SIN_BONOS_DISCIPLINA).paraEfectos, "psi_contencion_contencion", {}, null), []);
  });
});

describe("P1: Retrocognición, Aturdido en el fracaso crítico", () => {
  const s = ficha({ psionica: { resonancia: 2, hipercognicion: 1 } });
  const p = preparar(s, "psi_hipercognicion_retrocognicion");

  test("fracaso crítico: Aturdido (fracaso) 1 turno sobre el psiónico", () => {
    assert.deepEqual(efectosDelResultado(p, "fracasoCritico"), {
      vida: 0,
      avisos: [],
      estadosPropios: [{ estadoId: "aturdido", gradoId: "fracaso", rondasRestantes: 1 }],
    });
  });

  test("otros grados: nada", () => {
    for (const g of ["critico", "exito", "fracaso"] as const) assert.deepEqual(efectosDelResultado(p, g), { vida: 0, avisos: [] });
  });

  test("el servidor, con el grado: el mismo Aturdido", () => {
    const niveles = nivelesDePsionica(s, SIN_BONOS_DISCIPLINA).paraEfectos;
    assert.deepEqual(estadosPropiosDeUso(s, niveles, "psi_hipercognicion_retrocognicion", {}, "fracasoCritico"), [
      { estadoId: "aturdido", gradoId: "fracaso", rondasRestantes: 1 },
    ]);
    assert.deepEqual(estadosPropiosDeUso(s, niveles, "psi_hipercognicion_retrocognicion", {}, "fracaso"), []);
  });
});
