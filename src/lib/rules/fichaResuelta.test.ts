// Caracterización de E1b (propuesta-especies §3.1): los números se fijaron con el
// código de antes de resolverFicha (derivados con `mods = modificadoresActivos(sheet)`
// por defecto, y Acciones sumando los estados de combate). resolverFicha tiene que dar
// exactamente lo mismo. Si uno de estos números cambia, es un bug, no un ajuste.
// Excepción a propósito: S11 (2026-10-23), los aplicados pasan a redondear hacia abajo;
// cada aplicado con suma impar de básicos bajó 1 y, con él, vida/fatiga/alerta/movimiento.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { FORMULA_MOVIMIENTO_GENERAL } from "./formulaMovimiento";
import { defaultSheet, type Sheet } from "./sheet";
import { equipar, consultaIndiceCondiciones } from "./equipo";
import type { ContextoAccion } from "./modificadores";
import {
  modificadoresActivos,
  atributosEfectivos,
  aplicados,
  salud,
  alerta,
  movimiento,
  cargaMaxima,
  desgloseAtributo,
  desgloseAplicado,
} from "./derivados";
import { modificadoresDeEstados, type EstadoActivo } from "./estados";
import { especieDeFicha } from "./especie";
import { resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";

const base = (): Sheet => {
  const s = defaultSheet();
  return {
    ...s,
    atributos: { fuerza: 2, agilidad: 1, aguante: 1, percepcion: 0, inteligencia: 1, caracter: -1 },
    habilidades: {
      ...s.habilidades,
      atletismo: { ...s.habilidades.atletismo, valor: 2 },
      exploracion: { ...s.habilidades.exploracion, valor: 3 },
    },
  };
};

// Armadura con Visor Nocturno (condiciones de alcance), Soporte Vital (modificador de
// tirada), Exoesqueleto (bono de Fuerza en movimiento y carga), fusil con mira
// integrada (condición de búsqueda) y rodela (escudo melee).
const conEquipo = (s: Sheet): Sheet => {
  s = equipar(s, { instanciaId: "arm", catalogoId: "armadura_ligera" });
  s = equipar(s, { instanciaId: "vn", catalogoId: "visor_nocturno", nivel: 2, instaladoEnId: "arm" });
  s = equipar(s, { instanciaId: "sv", catalogoId: "soporte_vital", nivel: 2, instaladoEnId: "arm" });
  s = equipar(s, { instanciaId: "exo", catalogoId: "exoesqueleto", nivel: 2, instaladoEnId: "arm" });
  s = equipar(s, { instanciaId: "fp", catalogoId: "fusil_precision_telum" });
  s = equipar(s, { instanciaId: "rod", catalogoId: "escudo_rodela" });
  return s;
};

const ENFERMO_Y_ATURDIDO: EstadoActivo[] = [
  { estadoId: "enfermedad", gradoId: "nivel_2", rondasRestantes: null },
  { estadoId: "aturdido", gradoId: "fracaso", rondasRestantes: 1 },
];

const CTX_ALERTA: ContextoAccion = { id: "alerta_activa", grupo: "Acciones", habilidad: "exploracion", modoElegido: null };
const CTX_SALV_FORTALEZA: ContextoAccion = { id: "salv_fortaleza", grupo: "Salvaciones", habilidad: null, modoElegido: null };
// La salvación de Fortaleza lleva el selector «Contra…» (2026-10-24): congelación (armadura y
// Soporte Vital), frío o calor extremos (Soporte Vital) y ceguera por detonación (Visor 2).
const CONDICIONES_EQUIPO = [
  ["visor_nocturno_n1_activo", "visor_nocturno_n2_activo", "visor_nocturno_cobertura_alerta", "mira_telescopica_busqueda"],
  ["aum_contra_salv_fortaleza"],
];

const CASILLAS_FORTALEZA_ARKORU = ["especie_adaptacion_termica_temperatura", "especie_sistemas_filtradores_filtracion"];

// Base = Potencia + Atletismo 2 (+ 4 de exoesqueleto).
const MOV_BASE_3 = { bonoExoesqueleto: 0, carrera: 19, saltoVertical: 45, saltoHorizontal: 160, escalada: 5, nado: 5 };
const MOV_BASE = { bonoExoesqueleto: 0, carrera: 20, saltoVertical: 60, saltoHorizontal: 180, escalada: 6, nado: 6 };
const MOV_EXO_7 = { bonoExoesqueleto: 4, carrera: 23, saltoVertical: 105, saltoHorizontal: 240, escalada: 7, nado: 7 };
const MOV_EXO = { bonoExoesqueleto: 4, carrera: 24, saltoVertical: 120, saltoHorizontal: 260, escalada: 8, nado: 8 };

type Esperado = {
  nMods: number;
  atributos: Sheet["atributos"];
  aplicados: Record<string, number>;
  salud: { vida: number; fatiga: number };
  alerta: number;
  movimiento: typeof MOV_BASE;
  carga: number;
  fuerza: { total: number; fuentes: { etiqueta: string; valor: number }[] };
  fortaleza: { total: number; fuentes: { etiqueta: string; valor: number }[] };
  escudo: boolean;
  condiciones: string[][];
  // E3 (§14.7): lo que resolverFicha da de más con la fórmula de especie. La
  // caracterización de arriba (derivados con el neutro) no cambia; resolverFicha sí,
  // a propósito.
  e3?: { movimiento: typeof MOV_BASE; carga: number };
  // E4 (§14.8): las casillas de especie entran en el mismo índice que las del equipo.
  e4?: { condiciones: string[][] };
};

const MUESTRAS: { nombre: string; sheet: Sheet; estados: EstadoActivo[]; esperado: Esperado }[] = [
  {
    nombre: "sin especie",
    sheet: base(),
    estados: [],
    esperado: {
      nMods: 0,
      atributos: { fuerza: 2, agilidad: 1, aguante: 1, percepcion: 0, inteligencia: 1, caracter: -1 },
      aplicados: { fortaleza: 1, potencia: 1, reflejos: 0, voluntad: 0, perspicacia: 0, expresion: 0 },
      salud: { vida: 11, fatiga: 10 },
      alerta: 9,
      movimiento: MOV_BASE_3,
      carga: 40,
      fuerza: { total: 2, fuentes: [{ etiqueta: "Base", valor: 2 }] },
      fortaleza: { total: 1, fuentes: [{ etiqueta: "Fuerza", valor: 2 }, { etiqueta: "Aguante", valor: 1 }] },
      escudo: false,
      condiciones: [[], []],
    },
  },
  {
    nombre: "Arköru",
    sheet: { ...base(), especieId: "arkoru" },
    estados: [],
    esperado: {
      nMods: 3, // atributos + −1 a distancia (E4)
      atributos: { fuerza: 4, agilidad: 0, aguante: 1, percepcion: 0, inteligencia: 1, caracter: -1 },
      aplicados: { fortaleza: 2, potencia: 2, reflejos: 0, voluntad: 0, perspicacia: 0, expresion: 0 },
      salud: { vida: 12, fatiga: 10 },
      alerta: 9,
      movimiento: MOV_BASE,
      carga: 80,
      fuerza: { total: 4, fuentes: [{ etiqueta: "Base", valor: 2 }, { etiqueta: "Arköru", valor: 2 }] },
      fortaleza: { total: 2, fuentes: [{ etiqueta: "Fuerza", valor: 4 }, { etiqueta: "Aguante", valor: 1 }] },
      escudo: false,
      condiciones: [[], []],
      // base 4: 18 × 4, 100 + 4 × 25, 8 + 2, 2 + 2; carga 80 × 1,2
      e3: { movimiento: { ...MOV_BASE, saltoVertical: 72, saltoHorizontal: 200, escalada: 10, nado: 4 }, carga: 96 },
      e4: { condiciones: [["especie_percepcion_sensorial_visual"], CASILLAS_FORTALEZA_ARKORU] },
    },
  },
  {
    nombre: "Manduk Noble Ílkrem",
    sheet: { ...base(), especieId: "manduk", especieOpciones: { casta: "noble", linaje: "ilkrem" } },
    estados: [],
    esperado: {
      nMods: 2,
      atributos: { fuerza: 3, agilidad: 1, aguante: 1, percepcion: 0, inteligencia: 1, caracter: 0 },
      aplicados: { fortaleza: 2, potencia: 2, reflejos: 0, voluntad: 0, perspicacia: 0, expresion: 0 },
      salud: { vida: 12, fatiga: 10 },
      alerta: 9,
      movimiento: MOV_BASE,
      carga: 60,
      fuerza: { total: 3, fuentes: [{ etiqueta: "Base", valor: 2 }, { etiqueta: "Casa de Ílkrem", valor: 1 }] },
      fortaleza: { total: 2, fuentes: [{ etiqueta: "Fuerza", valor: 3 }, { etiqueta: "Aguante", valor: 1 }] },
      escudo: false,
      condiciones: [[], []],
    },
  },
  {
    nombre: "humano con equipo (modificadores, condiciones, exoesqueleto, escudo)",
    sheet: conEquipo({ ...base(), especieId: "humano" }),
    estados: [],
    esperado: {
      // +1: el +2 a la Fuerza del Exoesqueleto 2 (sube Potencia y Fortaleza, no la vida,
      // el movimiento ni la carga, que ya lo cuentan doble aparte).
      // Sin los +1 de la armadura y Soporte Vital ni el +3 del Visor 2: van al «Contra…».
      nMods: 1,
      atributos: { fuerza: 4, agilidad: 1, aguante: 1, percepcion: 0, inteligencia: 1, caracter: -1 },
      aplicados: { fortaleza: 2, potencia: 2, reflejos: 0, voluntad: 0, perspicacia: 0, expresion: 0 },
      salud: { vida: 11, fatiga: 10 },
      alerta: 9,
      movimiento: MOV_EXO_7,
      carga: 120,
      fuerza: { total: 4, fuentes: [{ etiqueta: "Base", valor: 2 }, { etiqueta: "Exoesqueleto 2", valor: 2 }] },
      fortaleza: { total: 2, fuentes: [{ etiqueta: "Fuerza", valor: 4 }, { etiqueta: "Aguante", valor: 1 }] },
      escudo: true,
      condiciones: CONDICIONES_EQUIPO,
    },
  },
  {
    nombre: "Arianyi con psiónica",
    sheet: { ...base(), especieId: "arianyi", psionica: { singularidad: 3, resonancia: 2 } },
    estados: [],
    esperado: {
      nMods: 4, // 3 de atributos + Resonancia +1 (E2b: no toca ningún derivado de aquí)
      atributos: { fuerza: 1, agilidad: 2, aguante: 1, percepcion: 1, inteligencia: 1, caracter: -1 },
      aplicados: { fortaleza: 1, potencia: 1, reflejos: 1, voluntad: 0, perspicacia: 1, expresion: 0 },
      salud: { vida: 11, fatiga: 10 },
      alerta: 10,
      movimiento: MOV_BASE_3,
      carga: 20,
      fuerza: { total: 1, fuentes: [{ etiqueta: "Base", valor: 2 }, { etiqueta: "Arianyi", valor: -1 }] },
      fortaleza: { total: 1, fuentes: [{ etiqueta: "Fuerza", valor: 1 }, { etiqueta: "Aguante", valor: 1 }] },
      escudo: false,
      condiciones: [[], []],
      // Movimiento Acuático, base 3: nado 8 + 1
      e3: { movimiento: { ...MOV_BASE_3, nado: 9 }, carga: 20 },
      e4: { condiciones: [["especie_empatia_biologica_empatia"], []] },
    },
  },
  {
    // Lo que veía Acciones (estados sumados). Resumen veía `RESUMEN_SIN_ESTADOS`, abajo.
    nombre: "Arköru con equipo y estados de combate (Enfermedad 2, Aturdido)",
    sheet: conEquipo({ ...base(), especieId: "arkoru" }),
    estados: ENFERMO_Y_ATURDIDO,
    esperado: {
      nMods: 8, // E4: +1, el −1 a distancia del Arköru; +1, el +2 a la Fuerza del Exoesqueleto 2; −4, los bonos de salvación del equipo (van al «Contra…»)
      atributos: { fuerza: 4, agilidad: 0, aguante: -1, percepcion: 0, inteligencia: 1, caracter: -1 },
      aplicados: { fortaleza: 1, potencia: 2, reflejos: 0, voluntad: -1, perspicacia: 0, expresion: 0 },
      salud: { vida: 10, fatiga: 9 },
      alerta: 9,
      movimiento: MOV_EXO_7,
      carga: 120,
      fuerza: {
        total: 4,
        fuentes: [
          { etiqueta: "Base", valor: 2 },
          { etiqueta: "Arköru", valor: 2 },
          { etiqueta: "Exoesqueleto 2", valor: 2 },
          { etiqueta: "Enfermedad", valor: -2 },
        ],
      },
      fortaleza: { total: 1, fuentes: [{ etiqueta: "Fuerza", valor: 4 }, { etiqueta: "Aguante", valor: -1 }] },
      escudo: true,
      condiciones: CONDICIONES_EQUIPO,
      // base 7: 18 × 7, 100 + 7 × 25, 8 + 3, 2 + 3; carga 120 × 1,2
      e3: {
        movimiento: { bonoExoesqueleto: 4, carrera: 23, saltoVertical: 126, saltoHorizontal: 275, escalada: 11, nado: 5 },
        carga: 144,
      },
      e4: {
        condiciones: [
          [...CONDICIONES_EQUIPO[0], "especie_percepcion_sensorial_visual"],
          [...CASILLAS_FORTALEZA_ARKORU, ...CONDICIONES_EQUIPO[1]],
        ],
      },
    },
  },
];

// La misma ficha con estados, tal y como la enseñaba Resumen (sin estados). Con la
// FichaResuelta única, Resumen pasa a ver los de arriba: cambio intencionado (§3.1, 3).
const RESUMEN_SIN_ESTADOS = { salud: { vida: 12, fatiga: 10 }, movimiento: MOV_EXO, carga: 160, alerta: 9 };
// Lo mismo con E3 (Arköru, base 8): 18 × 8, 100 + 8 × 25, 8 + 4, 2 + 4; carga 160 × 1,2.
const RESUMEN_SIN_ESTADOS_E3 = {
  ...RESUMEN_SIN_ESTADOS,
  movimiento: { ...MOV_EXO, saltoVertical: 144, saltoHorizontal: 300, escalada: 12, nado: 6 },
  carga: 192,
};

describe("caracterización: los derivados de hoy con los modificadores montados a mano", () => {
  for (const { nombre, sheet, estados, esperado } of MUESTRAS) {
    test(nombre, () => {
      const mods = [...modificadoresActivos(sheet), ...modificadoresDeEstados(estados)];
      assert.equal(mods.length, esperado.nMods);
      assert.deepEqual(atributosEfectivos(sheet, mods), esperado.atributos);
      assert.deepEqual(aplicados(sheet, mods), esperado.aplicados);
      assert.deepEqual(salud(sheet, mods), esperado.salud);
      assert.equal(alerta(sheet, mods), esperado.alerta);
      assert.deepEqual(movimiento(sheet, mods, FORMULA_MOVIMIENTO_GENERAL), esperado.movimiento);
      assert.equal(cargaMaxima(sheet, mods, 1), esperado.carga);
      assert.deepEqual(desgloseAtributo(sheet, "fuerza", mods), esperado.fuerza);
      assert.deepEqual(desgloseAplicado(sheet, "fortaleza", mods), esperado.fortaleza);
    });
  }

  test("Resumen, hoy: la ficha con estados sin sumarlos", () => {
    const sheet = MUESTRAS.at(-1)!.sheet;
    const mods = modificadoresActivos(sheet);
    assert.deepEqual(
      { salud: salud(sheet, mods), movimiento: movimiento(sheet, mods, FORMULA_MOVIMIENTO_GENERAL), carga: cargaMaxima(sheet, mods, 1), alerta: alerta(sheet, mods) },
      RESUMEN_SIN_ESTADOS,
    );
  });
});

describe("resolverFicha da exactamente lo mismo", () => {
  for (const { nombre, sheet, estados, esperado } of MUESTRAS) {
    test(nombre, () => {
      const r = resolverFicha(sheet, { vitalidad: VITALIDAD_DE_FICHA, estados });
      assert.equal(r.ficha, sheet);
      assert.deepEqual(r.especie, especieDeFicha(sheet));
      assert.deepEqual(r.modificadores, [...modificadoresActivos(sheet), ...modificadoresDeEstados(estados)]);
      assert.equal(r.modificadores.length, esperado.nMods);
      assert.deepEqual(r.atributos, esperado.atributos);
      assert.deepEqual(r.aplicados, esperado.aplicados);
      assert.deepEqual(r.salud, esperado.salud);
      assert.equal(r.alerta, esperado.alerta);
      assert.deepEqual(r.movimiento, (esperado.e3 ?? esperado).movimiento);
      assert.equal(r.cargaMaxima, (esperado.e3 ?? esperado).carga);
      assert.deepEqual(r.desgloses.atributos.fuerza, esperado.fuerza);
      assert.deepEqual(r.desgloses.aplicados.fortaleza, esperado.fortaleza);
      assert.equal(r.blindaje.tieneEscudoMelee, esperado.escudo);
      assert.deepEqual(
        [CTX_ALERTA, CTX_SALV_FORTALEZA].map((ctx) => consultaIndiceCondiciones(r.indiceCondiciones, ctx).map((c) => c.id)),
        esperado.e4?.condiciones ?? esperado.condiciones,
      );
    });
  }

  test("sin estados de combate, la ficha en reposo (lo que veía Resumen)", () => {
    const r = resolverFicha(MUESTRAS.at(-1)!.sheet, { vitalidad: VITALIDAD_DE_FICHA, estados: [] });
    assert.deepEqual(
      { salud: r.salud, movimiento: r.movimiento, carga: r.cargaMaxima, alerta: r.alerta },
      RESUMEN_SIN_ESTADOS_E3,
    );
  });

  test("los desgloses cubren los 12 atributos y cuadran con los totales", () => {
    const r = resolverFicha(MUESTRAS.at(-1)!.sheet, { vitalidad: VITALIDAD_DE_FICHA, estados: ENFERMO_Y_ATURDIDO });
    for (const [id, d] of Object.entries(r.desgloses.atributos)) {
      assert.equal(d.total, r.atributos[id as keyof typeof r.atributos]);
    }
    for (const [id, d] of Object.entries(r.desgloses.aplicados)) {
      assert.equal(d.total, r.aplicados[id as keyof typeof r.aplicados]);
    }
  });
});

// S93 (usuario, 2026-10-24): el «Bonificador Máximo de Agilidad» de la armadura topa la
// Agilidad calculada mientras se lleva; con dos, el tope menor. S94 lo construye.
describe("tope de Agilidad de la armadura", () => {
  const resolver = (s: Sheet) => resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA });
  const conAgilidad = (agilidad: number): Sheet => {
    const s = defaultSheet();
    return { ...s, atributos: { ...s.atributos, fuerza: 2, agilidad, percepcion: 2 } };
  };
  const vestida = (s: Sheet, ...ids: string[]) =>
    ids.reduce((acc, catalogoId, i) => equipar(acc, { instanciaId: `arm${i}`, catalogoId }), s);

  test("Intermedia (tope 2) con Agilidad 4: la ficha juega con 2, y lo dice", () => {
    const f = resolver(vestida(conAgilidad(4), "armadura_intermedia"));
    assert.equal(f.atributos.agilidad, 2);
    assert.deepEqual(f.topeAgilidad && { sinTope: f.topeAgilidad.sinTope, tope: f.topeAgilidad.tope, armadura: f.topeAgilidad.armadura }, {
      sinTope: 4,
      tope: 2,
      armadura: "Armadura Intermedia",
    });
    assert.deepEqual(f.desgloses.atributos.agilidad.fuentes, [
      { etiqueta: "Base", valor: 4 },
      { etiqueta: "Tope de Agilidad (Armadura Intermedia)", valor: -2 },
    ]);
    // Lo que sale de la Agilidad, ya topado: Potencia ⌊(2+2)/2⌋, Reflejos ⌊(2+2)/2⌋.
    assert.equal(f.aplicados.potencia, 2);
    assert.equal(f.aplicados.reflejos, 2);
    const sinArmadura = resolver(conAgilidad(2));
    assert.deepEqual(f.movimiento, sinArmadura.movimiento);
  });

  test("por debajo del tope, o con armadura Ilimitada, no toca nada", () => {
    assert.equal(resolver(vestida(conAgilidad(2), "armadura_intermedia")).topeAgilidad, null);
    const ilimitada = resolver(vestida(conAgilidad(5), "traje_ultra_ligero"));
    assert.equal(ilimitada.topeAgilidad, null);
    assert.equal(ilimitada.atributos.agilidad, 5);
  });

  test("con la especie y el equipo dentro: topa la Agilidad calculada, no la comprada", () => {
    // Riux: Agilidad +1. Comprada 2 → 3, la Intermedia la deja en 2.
    const f = resolver({ ...vestida(conAgilidad(2), "armadura_intermedia"), especieId: "riux" });
    assert.equal(f.atributos.agilidad, 2);
    assert.equal(f.topeAgilidad?.sinTope, 3);
  });

  test("con dos armaduras vale el tope menor", () => {
    const f = resolver(vestida(conAgilidad(4), "armadura_ligera", "armadura_pesada_avanzada"));
    assert.equal(f.atributos.agilidad, 1);
    assert.equal(f.topeAgilidad?.armadura, "Armadura Pesada Avanzada");
  });
});

// S94: Soporte Vital, Blindaje Ambiental en el selector «Contra…» de Fortaleza.
describe("Soporte Vital en «Contra…: Toxinas»", () => {
  test("el +N del nivel con la nota de la protección total", () => {
    let s = equipar(defaultSheet(), { instanciaId: "a", catalogoId: "armadura_ligera" });
    s = equipar(s, { instanciaId: "sv", catalogoId: "soporte_vital", nivel: 2, instaladoEnId: "a" });
    const f = resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA });
    const ctx: ContextoAccion = { id: "salv_fortaleza", grupo: "Salvaciones", habilidad: null, modoElegido: null };
    const selector = consultaIndiceCondiciones(f.indiceCondiciones, ctx).find((c) => c.id === "aum_contra_salv_fortaleza");
    assert.ok(selector?.tipo === "opcion");
    const opciones = selector.opciones;
    for (const amenaza of ["toxinas", "radiacion"]) {
      const o = opciones.find((x) => x.id === amenaza)!;
      assert.equal(o.valor, 2, amenaza);
      assert.match(o.nota ?? "", /Soporte Vital 2: protección total contra radiación e intoxicación/);
    }
  });
});
