// Caracterización de E1b (propuesta-especies §3.1): los números se fijaron con el
// código de antes de resolverFicha (derivados con `mods = modificadoresActivos(sheet)`
// por defecto, y Acciones sumando los estados de combate). resolverFicha tiene que dar
// exactamente lo mismo. Si uno de estos números cambia, es un bug, no un ajuste.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
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
import { resolverFicha } from "./fichaResuelta";

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
const CONDICIONES_EQUIPO = [["visor_nocturno_n1_activo", "visor_nocturno_n2_activo", "mira_telescopica_busqueda"], []];

const MOV_BASE = { bonoExoesqueleto: 0, carrera: 20, saltoVertical: 60, saltoHorizontal: 180, escalada: 6, nado: 6 };
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
};

const MUESTRAS: { nombre: string; sheet: Sheet; estados: EstadoActivo[]; esperado: Esperado }[] = [
  {
    nombre: "sin especie",
    sheet: base(),
    estados: [],
    esperado: {
      nMods: 0,
      atributos: { fuerza: 2, agilidad: 1, aguante: 1, percepcion: 0, inteligencia: 1, caracter: -1 },
      aplicados: { fortaleza: 2, potencia: 2, reflejos: 1, voluntad: 0, perspicacia: 1, expresion: 0 },
      salud: { vida: 10, fatiga: 8 },
      alerta: 10,
      movimiento: MOV_BASE,
      carga: 40,
      fuerza: { total: 2, fuentes: [{ etiqueta: "Base", valor: 2 }] },
      fortaleza: { total: 2, fuentes: [{ etiqueta: "Fuerza", valor: 2 }, { etiqueta: "Aguante", valor: 1 }] },
      escudo: false,
      condiciones: [[], []],
    },
  },
  {
    nombre: "Arköru",
    sheet: { ...base(), especieId: "arkoru" },
    estados: [],
    esperado: {
      nMods: 2,
      atributos: { fuerza: 4, agilidad: 0, aguante: 1, percepcion: 0, inteligencia: 1, caracter: -1 },
      aplicados: { fortaleza: 3, potencia: 2, reflejos: 0, voluntad: 0, perspicacia: 1, expresion: 0 },
      salud: { vida: 11, fatiga: 8 },
      alerta: 10,
      movimiento: MOV_BASE,
      carga: 80,
      fuerza: { total: 4, fuentes: [{ etiqueta: "Base", valor: 2 }, { etiqueta: "Arköru", valor: 2 }] },
      fortaleza: { total: 3, fuentes: [{ etiqueta: "Fuerza", valor: 4 }, { etiqueta: "Aguante", valor: 1 }] },
      escudo: false,
      condiciones: [[], []],
    },
  },
  {
    nombre: "Manduk Noble Ílkrem",
    sheet: { ...base(), especieId: "manduk", especieOpciones: { casta: "noble", linaje: "ilkrem" } },
    estados: [],
    esperado: {
      nMods: 2,
      atributos: { fuerza: 3, agilidad: 1, aguante: 1, percepcion: 0, inteligencia: 1, caracter: 0 },
      aplicados: { fortaleza: 2, potencia: 2, reflejos: 1, voluntad: 1, perspicacia: 1, expresion: 1 },
      salud: { vida: 10, fatiga: 9 },
      alerta: 10,
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
      nMods: 4,
      atributos: { fuerza: 2, agilidad: 1, aguante: 1, percepcion: 0, inteligencia: 1, caracter: -1 },
      aplicados: { fortaleza: 2, potencia: 2, reflejos: 1, voluntad: 0, perspicacia: 1, expresion: 0 },
      salud: { vida: 10, fatiga: 8 },
      alerta: 10,
      movimiento: MOV_EXO,
      carga: 120,
      fuerza: { total: 2, fuentes: [{ etiqueta: "Base", valor: 2 }] },
      fortaleza: { total: 2, fuentes: [{ etiqueta: "Fuerza", valor: 2 }, { etiqueta: "Aguante", valor: 1 }] },
      escudo: true,
      condiciones: CONDICIONES_EQUIPO,
    },
  },
  {
    nombre: "Arianyi con psiónica",
    sheet: { ...base(), especieId: "arianyi", psionica: { singularidad: 3, resonancia: 2 } },
    estados: [],
    esperado: {
      nMods: 3,
      atributos: { fuerza: 1, agilidad: 2, aguante: 1, percepcion: 1, inteligencia: 1, caracter: -1 },
      aplicados: { fortaleza: 1, potencia: 2, reflejos: 2, voluntad: 0, perspicacia: 1, expresion: 0 },
      salud: { vida: 9, fatiga: 8 },
      alerta: 10,
      movimiento: MOV_BASE,
      carga: 20,
      fuerza: { total: 1, fuentes: [{ etiqueta: "Base", valor: 2 }, { etiqueta: "Arianyi", valor: -1 }] },
      fortaleza: { total: 1, fuentes: [{ etiqueta: "Fuerza", valor: 1 }, { etiqueta: "Aguante", valor: 1 }] },
      escudo: false,
      condiciones: [[], []],
    },
  },
  {
    // Lo que veía Acciones (estados sumados). Resumen veía `RESUMEN_SIN_ESTADOS`, abajo.
    nombre: "Arköru con equipo y estados de combate (Enfermedad 2, Aturdido)",
    sheet: conEquipo({ ...base(), especieId: "arkoru" }),
    estados: ENFERMO_Y_ATURDIDO,
    esperado: {
      nMods: 10,
      atributos: { fuerza: 2, agilidad: 0, aguante: -1, percepcion: 0, inteligencia: 1, caracter: -1 },
      aplicados: { fortaleza: 1, potencia: 1, reflejos: 0, voluntad: -1, perspicacia: 1, expresion: 0 },
      salud: { vida: 9, fatiga: 7 },
      alerta: 10,
      movimiento: { bonoExoesqueleto: 4, carrera: 23, saltoVertical: 105, saltoHorizontal: 240, escalada: 7, nado: 7 },
      carga: 120,
      fuerza: {
        total: 2,
        fuentes: [
          { etiqueta: "Base", valor: 2 },
          { etiqueta: "Arköru", valor: 2 },
          { etiqueta: "Enfermedad", valor: -2 },
        ],
      },
      fortaleza: { total: 1, fuentes: [{ etiqueta: "Fuerza", valor: 2 }, { etiqueta: "Aguante", valor: -1 }] },
      escudo: true,
      condiciones: CONDICIONES_EQUIPO,
    },
  },
];

// La misma ficha con estados, tal y como la enseñaba Resumen (sin estados). Con la
// FichaResuelta única, Resumen pasa a ver los de arriba: cambio intencionado (§3.1, 3).
const RESUMEN_SIN_ESTADOS = { salud: { vida: 11, fatiga: 8 }, movimiento: MOV_EXO, carga: 160, alerta: 10 };

describe("caracterización: los derivados de hoy con los modificadores montados a mano", () => {
  for (const { nombre, sheet, estados, esperado } of MUESTRAS) {
    test(nombre, () => {
      const mods = [...modificadoresActivos(sheet), ...modificadoresDeEstados(estados)];
      assert.equal(mods.length, esperado.nMods);
      assert.deepEqual(atributosEfectivos(sheet, mods), esperado.atributos);
      assert.deepEqual(aplicados(sheet, mods), esperado.aplicados);
      assert.deepEqual(salud(sheet, mods), esperado.salud);
      assert.equal(alerta(sheet, mods), esperado.alerta);
      assert.deepEqual(movimiento(sheet, mods), esperado.movimiento);
      assert.equal(cargaMaxima(sheet, mods), esperado.carga);
      assert.deepEqual(desgloseAtributo(sheet, "fuerza", mods), esperado.fuerza);
      assert.deepEqual(desgloseAplicado(sheet, "fortaleza", mods), esperado.fortaleza);
    });
  }

  test("Resumen, hoy: la ficha con estados sin sumarlos", () => {
    const sheet = MUESTRAS.at(-1)!.sheet;
    const mods = modificadoresActivos(sheet);
    assert.deepEqual(
      { salud: salud(sheet, mods), movimiento: movimiento(sheet, mods), carga: cargaMaxima(sheet, mods), alerta: alerta(sheet, mods) },
      RESUMEN_SIN_ESTADOS,
    );
  });
});

describe("resolverFicha da exactamente lo mismo", () => {
  for (const { nombre, sheet, estados, esperado } of MUESTRAS) {
    test(nombre, () => {
      const r = resolverFicha(sheet, { estadosCombate: estados });
      assert.equal(r.ficha, sheet);
      assert.deepEqual(r.especie, especieDeFicha(sheet));
      assert.deepEqual(r.modificadores, [...modificadoresActivos(sheet), ...modificadoresDeEstados(estados)]);
      assert.equal(r.modificadores.length, esperado.nMods);
      assert.deepEqual(r.atributos, esperado.atributos);
      assert.deepEqual(r.aplicados, esperado.aplicados);
      assert.deepEqual(r.salud, esperado.salud);
      assert.equal(r.alerta, esperado.alerta);
      assert.deepEqual(r.movimiento, esperado.movimiento);
      assert.equal(r.cargaMaxima, esperado.carga);
      assert.deepEqual(r.desgloses.atributos.fuerza, esperado.fuerza);
      assert.deepEqual(r.desgloses.aplicados.fortaleza, esperado.fortaleza);
      assert.equal(r.blindaje.tieneEscudoMelee, esperado.escudo);
      assert.deepEqual(
        [CTX_ALERTA, CTX_SALV_FORTALEZA].map((ctx) => consultaIndiceCondiciones(r.indiceCondiciones, ctx).map((c) => c.id)),
        esperado.condiciones,
      );
    });
  }

  test("sin estados de combate, la ficha en reposo (lo que veía Resumen)", () => {
    const r = resolverFicha(MUESTRAS.at(-1)!.sheet, { estadosCombate: [] });
    assert.deepEqual(
      { salud: r.salud, movimiento: r.movimiento, carga: r.cargaMaxima, alerta: r.alerta },
      RESUMEN_SIN_ESTADOS,
    );
  });

  test("los desgloses cubren los 12 atributos y cuadran con los totales", () => {
    const r = resolverFicha(MUESTRAS.at(-1)!.sheet, { estadosCombate: ENFERMO_Y_ATURDIDO });
    for (const [id, d] of Object.entries(r.desgloses.atributos)) {
      assert.equal(d.total, r.atributos[id as keyof typeof r.atributos]);
    }
    for (const [id, d] of Object.entries(r.desgloses.aplicados)) {
      assert.equal(d.total, r.aplicados[id as keyof typeof r.aplicados]);
    }
  });
});
