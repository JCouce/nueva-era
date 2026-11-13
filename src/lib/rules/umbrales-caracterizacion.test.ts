// Caracterización de los umbrales de §7 (tarea "Umbrales de salud y fatiga como estados
// automáticos", docs/tareas.md): fija lo que da resolverFicha antes de convertir los umbrales
// en estados derivados. Los esperados se generaron con el código de antes del cambio y no se
// tocan: si uno cambia, el cambio ha movido un número (S14, S15, S26-S29, reducciones).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ACCIONES } from "./acciones";
import { equipar } from "./equipo";
import type { EstadoActivo } from "./estados";
import { resolverFicha, VITALIDAD_DE_FICHA, type FichaResuelta, type VitalidadActual } from "./fichaResuelta";
import { montarTirada, SIN_ELECCION } from "./montaje";
import { defaultSheet, type Sheet } from "./sheet";

let n = 0;
const con = (s: Sheet, catalogoId: string, nivel?: number): Sheet => ({
  ...s,
  equipo: [...s.equipo, { instanciaId: `c${++n}`, catalogoId, ...(nivel !== undefined && { nivel }) }],
});

// Vida 12 y fatiga 12 (ficha), carrera 20 m, carga 40 kg.
function ficha(patch: Partial<Sheet> = {}): Sheet {
  const d = defaultSheet();
  return {
    ...d,
    atributos: { fuerza: 2, agilidad: 2, aguante: 2, percepcion: 0, inteligencia: 0, caracter: 2 },
    habilidades: { ...d.habilidades, atletismo: { valor: 2, especialidades: [] } },
    vidaActual: 12,
    fatigaActual: 12,
    fatigaTemporal: 0,
    ...patch,
  };
}

const combate = (pgActual: number, fatigaActual: number, pgMax = 10, fatigaMax = 10): VitalidadActual => ({
  origen: "combate",
  pgActual,
  pgMax,
  fatigaActual,
  fatigaMax,
});

const GUERRERO: Partial<Sheet> = { especieId: "manduk", especieOpciones: { casta: "guerrero" } };
const SIERVO: Partial<Sheet> = { especieId: "manduk", especieOpciones: { casta: "siervo" } };
const ESTABILIZACION = "aum_estabilizacion_autonomica";
const MIELINIZACION = "aum_mielinizacion_central";
const NEUROGENESIS = "aum_neurogenesis_hipocampal";
const REGULACION = "aum_regulacion_limbico_prefrontal";
const PROYECCION = "aum_proyeccion_neuro_expresiva";
const NEURO = "aum_neuroprotesis_simpatica";

const neuro: EstadoActivo = { estadoId: "aum_neuroprotesis", gradoId: "activo", rondasRestantes: 3 };
const neuro4: EstadoActivo = { estadoId: "aum_neuroprotesis_4", gradoId: "activo", rondasRestantes: 1 };
const proyeccion: EstadoActivo = { estadoId: "aum_proyeccion", gradoId: "activo", rondasRestantes: null, finDeEscena: true };
const aturdido: EstadoActivo = { estadoId: "aturdido", gradoId: "exito", rondasRestantes: 1 };

const volador = () => {
  let s = equipar(ficha({ psionica: { traslacion: 2 } }), { instanciaId: "a", catalogoId: "armadura_pesada" });
  s = equipar(s, { instanciaId: "ma", catalogoId: "movilidad_aerea", nivel: 1, instaladoEnId: "a" });
  return s;
};

type Caso = { sheet: () => Sheet; vitalidad: VitalidadActual; estados?: EstadoActivo[] };

const VITALIDADES: [string, VitalidadActual][] = [
  ["entero", combate(10, 10)],
  ["herido", combate(4, 10)],
  ["malherido", combate(2, 10)],
  ["moribundo", combate(1, 10)],
  ["vida 0", combate(0, 10)],
  ["fatigado", combate(10, 2)],
  ["exhausto", combate(10, 1)],
  ["fatiga 0", combate(10, 0)],
  ["herido y fatigado", combate(4, 2)],
  ["malherido y exhausto", combate(2, 1)],
  ["moribundo y exhausto", combate(1, 1)],
  ["moribundo y fatigado", combate(1, 2)],
  ["S15 PGmáx 5, vida 1", combate(1, 5, 5, 5)],
  ["S15 PGmáx 5, fatiga 1", combate(5, 1, 5, 5)],
  ["S15 PGmáx 5, vida 2", combate(2, 5, 5, 5)],
];

const CASOS: Record<string, Caso> = {
  ...Object.fromEntries(VITALIDADES.map(([k, v]) => [`base · ${k}`, { sheet: () => ficha(), vitalidad: v }])),
  "ficha · vida 5/12": { sheet: () => ficha({ vidaActual: 5 }), vitalidad: VITALIDAD_DE_FICHA },
  "ficha · fatiga 3 con temporal 1": { sheet: () => ficha({ fatigaActual: 3, fatigaTemporal: 1 }), vitalidad: VITALIDAD_DE_FICHA },
  "ficha · vida 0, fatiga 0": { sheet: () => ficha({ vidaActual: 0, fatigaActual: 0 }), vitalidad: VITALIDAD_DE_FICHA },
  "combate · temporal 1, fatiga 3": { sheet: () => ficha({ fatigaTemporal: 1 }), vitalidad: combate(10, 3) },
  "con aturdido · malherido": { sheet: () => ficha(), vitalidad: combate(2, 10), estados: [aturdido] },
  ...Object.fromEntries(
    [combate(4, 2), combate(2, 1), combate(1, 1)].flatMap((v, i) => [
      [`guerrero · ${i}`, { sheet: () => ficha(GUERRERO), vitalidad: v }],
      [`siervo · ${i}`, { sheet: () => ficha(SIERVO), vitalidad: v }],
      [`estabilizacion · ${i}`, { sheet: () => con(ficha(), ESTABILIZACION), vitalidad: v }],
      [`guerrero + estabilizacion · ${i}`, { sheet: () => con(ficha(GUERRERO), ESTABILIZACION), vitalidad: v }],
      [`neurogenesis · ${i}`, { sheet: () => con(con(ficha(), MIELINIZACION), NEUROGENESIS), vitalidad: v }],
      [`neuroprotesis activa · ${i}`, { sheet: () => con(ficha(), NEURO, 1), vitalidad: v, estados: [neuro] }],
      [`neuroprotesis 4 · ${i}`, { sheet: () => con(ficha(), NEURO, 4), vitalidad: v, estados: [neuro, neuro4] }],
      [`proyeccion activa · ${i}`, { sheet: () => con(con(ficha(), REGULACION), PROYECCION), vitalidad: v, estados: [proyeccion] }],
      [`volador · ${i}`, { sheet: volador, vitalidad: v }],
      [`arkoru · ${i}`, { sheet: () => ficha({ especieId: "arkoru" }), vitalidad: v }],
    ]),
  ),
};

const TIRADAS = ["salv_voluntad", "salv_reflejos", "defensa", "iniciativa_distraccion"];

function foto(f: FichaResuelta) {
  return {
    umbral: f.modificadores
      .filter((m) => m.tipo === "tirada" && /Herido|Malherido|Moribundo|Fatigado|Exhausto/.test(m.fuente))
      .map((m) => `${m.fuente} ${m.valor}${m.tipo === "tirada" && m.compensa ? " (compensa)" : ""}`),
    tiradas: Object.fromEntries(
      TIRADAS.map((id) => {
        const t = ACCIONES.find((a) => a.id === id)!;
        return [id, montarTirada(f, t, SIN_ELECCION).modificador];
      }),
    ),
    carrera: f.movimiento.carrera,
    vuelo: f.vuelo?.velocidadM ?? null,
    levitacion: f.levitacion?.velocidadM ?? null,
    carga: f.cargaMaxima,
  };
}

const ESPERADO: Record<string, ReturnType<typeof foto>> = {
  "base · entero": {"umbral":[],"tiradas":{"salv_voluntad":2,"salv_reflejos":1,"defensa":3,"iniciativa_distraccion":0},"carrera":20,"vuelo":null,"levitacion":null,"carga":40},
  "base · herido": {"umbral":["Herido -1"],"tiradas":{"salv_voluntad":1,"salv_reflejos":0,"defensa":2,"iniciativa_distraccion":-1},"carrera":20,"vuelo":null,"levitacion":null,"carga":40},
  "base · malherido": {"umbral":["Malherido -3"],"tiradas":{"salv_voluntad":-1,"salv_reflejos":-2,"defensa":0,"iniciativa_distraccion":-3},"carrera":10,"vuelo":null,"levitacion":null,"carga":30},
  "base · moribundo": {"umbral":["Moribundo -5"],"tiradas":{"salv_voluntad":-3,"salv_reflejos":-4,"defensa":-2,"iniciativa_distraccion":-5},"carrera":20,"vuelo":null,"levitacion":null,"carga":20},
  "base · vida 0": {"umbral":["Moribundo -5"],"tiradas":{"salv_voluntad":-3,"salv_reflejos":-4,"defensa":-2,"iniciativa_distraccion":-5},"carrera":20,"vuelo":null,"levitacion":null,"carga":20},
  "base · fatigado": {"umbral":["Fatigado -1"],"tiradas":{"salv_voluntad":1,"salv_reflejos":0,"defensa":2,"iniciativa_distraccion":-1},"carrera":20,"vuelo":null,"levitacion":null,"carga":40},
  "base · exhausto": {"umbral":["Exhausto -2"],"tiradas":{"salv_voluntad":0,"salv_reflejos":-1,"defensa":1,"iniciativa_distraccion":-2},"carrera":10,"vuelo":null,"levitacion":null,"carga":30},
  "base · fatiga 0": {"umbral":["Exhausto -2"],"tiradas":{"salv_voluntad":0,"salv_reflejos":-1,"defensa":1,"iniciativa_distraccion":-2},"carrera":10,"vuelo":null,"levitacion":null,"carga":30},
  "base · herido y fatigado": {"umbral":["Herido -1","Fatigado -1"],"tiradas":{"salv_voluntad":0,"salv_reflejos":-1,"defensa":1,"iniciativa_distraccion":-2},"carrera":20,"vuelo":null,"levitacion":null,"carga":40},
  "base · malherido y exhausto": {"umbral":["Malherido -3","Exhausto -2"],"tiradas":{"salv_voluntad":-3,"salv_reflejos":-4,"defensa":-2,"iniciativa_distraccion":-5},"carrera":10,"vuelo":null,"levitacion":null,"carga":30},
  "base · moribundo y exhausto": {"umbral":["Moribundo -5","Exhausto -2"],"tiradas":{"salv_voluntad":-5,"salv_reflejos":-6,"defensa":-4,"iniciativa_distraccion":-7},"carrera":10,"vuelo":null,"levitacion":null,"carga":20},
  "base · moribundo y fatigado": {"umbral":["Moribundo -5","Fatigado -1"],"tiradas":{"salv_voluntad":-4,"salv_reflejos":-5,"defensa":-3,"iniciativa_distraccion":-6},"carrera":20,"vuelo":null,"levitacion":null,"carga":20},
  "base · S15 PGmáx 5, vida 1": {"umbral":["Moribundo -5"],"tiradas":{"salv_voluntad":-3,"salv_reflejos":-4,"defensa":-2,"iniciativa_distraccion":-5},"carrera":20,"vuelo":null,"levitacion":null,"carga":20},
  "base · S15 PGmáx 5, fatiga 1": {"umbral":["Exhausto -2"],"tiradas":{"salv_voluntad":0,"salv_reflejos":-1,"defensa":1,"iniciativa_distraccion":-2},"carrera":10,"vuelo":null,"levitacion":null,"carga":30},
  "base · S15 PGmáx 5, vida 2": {"umbral":["Herido -1"],"tiradas":{"salv_voluntad":1,"salv_reflejos":0,"defensa":2,"iniciativa_distraccion":-1},"carrera":20,"vuelo":null,"levitacion":null,"carga":40},
  "ficha · vida 5/12": {"umbral":["Herido -1"],"tiradas":{"salv_voluntad":1,"salv_reflejos":0,"defensa":2,"iniciativa_distraccion":-1},"carrera":20,"vuelo":null,"levitacion":null,"carga":40},
  "ficha · fatiga 3 con temporal 1": {"umbral":["Fatigado -1"],"tiradas":{"salv_voluntad":1,"salv_reflejos":0,"defensa":2,"iniciativa_distraccion":-1},"carrera":20,"vuelo":null,"levitacion":null,"carga":40},
  "ficha · vida 0, fatiga 0": {"umbral":["Moribundo -5","Exhausto -2"],"tiradas":{"salv_voluntad":-5,"salv_reflejos":-6,"defensa":-4,"iniciativa_distraccion":-7},"carrera":10,"vuelo":null,"levitacion":null,"carga":20},
  "combate · temporal 1, fatiga 3": {"umbral":["Fatigado -1"],"tiradas":{"salv_voluntad":1,"salv_reflejos":0,"defensa":2,"iniciativa_distraccion":-1},"carrera":20,"vuelo":null,"levitacion":null,"carga":40},
  "con aturdido · malherido": {"umbral":["Malherido -3"],"tiradas":{"salv_voluntad":-2,"salv_reflejos":-3,"defensa":-1,"iniciativa_distraccion":-4},"carrera":10,"vuelo":null,"levitacion":null,"carga":30},
  "guerrero · 0": {"umbral":["Fatigado -1"],"tiradas":{"salv_voluntad":1,"salv_reflejos":0,"defensa":2,"iniciativa_distraccion":-2},"carrera":21,"vuelo":null,"levitacion":null,"carga":60},
  "siervo · 0": {"umbral":["Herido -1"],"tiradas":{"salv_voluntad":1,"salv_reflejos":0,"defensa":2,"iniciativa_distraccion":-2},"carrera":20,"vuelo":null,"levitacion":null,"carga":40},
  "estabilizacion · 0": {"umbral":[],"tiradas":{"salv_voluntad":2,"salv_reflejos":1,"defensa":3,"iniciativa_distraccion":0},"carrera":20,"vuelo":null,"levitacion":null,"carga":40},
  "guerrero + estabilizacion · 0": {"umbral":[],"tiradas":{"salv_voluntad":2,"salv_reflejos":1,"defensa":3,"iniciativa_distraccion":-1},"carrera":21,"vuelo":null,"levitacion":null,"carga":60},
  "neurogenesis · 0": {"umbral":["Herido -1","Fatigado -1","Neurogénesis Hipocampal (Fatigado) 1 (compensa)"],"tiradas":{"salv_voluntad":1,"salv_reflejos":-1,"defensa":1,"iniciativa_distraccion":0},"carrera":20,"vuelo":null,"levitacion":null,"carga":40},
  "neuroprotesis activa · 0": {"umbral":[],"tiradas":{"salv_voluntad":2,"salv_reflejos":2,"defensa":4,"iniciativa_distraccion":0},"carrera":21,"vuelo":null,"levitacion":null,"carga":60},
  "neuroprotesis 4 · 0": {"umbral":[],"tiradas":{"salv_voluntad":2,"salv_reflejos":3,"defensa":5,"iniciativa_distraccion":0},"carrera":22,"vuelo":null,"levitacion":null,"carga":80},
  "proyeccion activa · 0": {"umbral":["Herido -1","Fatigado -1"],"tiradas":{"salv_voluntad":1,"salv_reflejos":-1,"defensa":1,"iniciativa_distraccion":1},"carrera":20,"vuelo":null,"levitacion":null,"carga":40},
  "volador · 0": {"umbral":["Herido -1","Fatigado -1"],"tiradas":{"salv_voluntad":0,"salv_reflejos":-2,"defensa":0,"iniciativa_distraccion":-2},"carrera":19,"vuelo":50,"levitacion":20,"carga":40},
  "arkoru · 0": {"umbral":["Herido -1","Fatigado -1"],"tiradas":{"salv_voluntad":0,"salv_reflejos":-2,"defensa":0,"iniciativa_distraccion":-2},"carrera":20,"vuelo":null,"levitacion":null,"carga":96},
  "guerrero · 1": {"umbral":["Malherido (Manduk · Guerrero) -2","Exhausto -2"],"tiradas":{"salv_voluntad":-2,"salv_reflejos":-3,"defensa":-1,"iniciativa_distraccion":-5},"carrera":10,"vuelo":null,"levitacion":null,"carga":45},
  "siervo · 1": {"umbral":["Malherido -3","Exhausto (Manduk · Siervo) -1"],"tiradas":{"salv_voluntad":-2,"salv_reflejos":-3,"defensa":-1,"iniciativa_distraccion":-5},"carrera":10,"vuelo":null,"levitacion":null,"carga":30},
  "estabilizacion · 1": {"umbral":["Malherido (Estabilización Autonómica) -2","Exhausto (Estabilización Autonómica) -1"],"tiradas":{"salv_voluntad":-1,"salv_reflejos":-2,"defensa":0,"iniciativa_distraccion":-3},"carrera":10,"vuelo":null,"levitacion":null,"carga":30},
  "guerrero + estabilizacion · 1": {"umbral":["Malherido (Manduk · Guerrero y Estabilización Autonómica) -1","Exhausto (Estabilización Autonómica) -1"],"tiradas":{"salv_voluntad":0,"salv_reflejos":-1,"defensa":1,"iniciativa_distraccion":-3},"carrera":10,"vuelo":null,"levitacion":null,"carga":45},
  "neurogenesis · 1": {"umbral":["Malherido -3","Exhausto -2","Neurogénesis Hipocampal (Exhausto) 1 (compensa)"],"tiradas":{"salv_voluntad":-2,"salv_reflejos":-4,"defensa":-2,"iniciativa_distraccion":-3},"carrera":10,"vuelo":null,"levitacion":null,"carga":30},
  "neuroprotesis activa · 1": {"umbral":["Malherido (Neuroprótesis Simpática 1) -2","Exhausto (Neuroprótesis Simpática 1) -1"],"tiradas":{"salv_voluntad":-1,"salv_reflejos":-1,"defensa":1,"iniciativa_distraccion":-3},"carrera":10,"vuelo":null,"levitacion":null,"carga":45},
  // td-10 (usuario, 2026-11-13): la Neuroprótesis 4 quita también media velocidad y recorte de carga.
  "neuroprotesis 4 · 1": {"umbral":[],"tiradas":{"salv_voluntad":2,"salv_reflejos":3,"defensa":5,"iniciativa_distraccion":0},"carrera":22,"vuelo":null,"levitacion":null,"carga":80},
  "proyeccion activa · 1": {"umbral":["Malherido -3","Exhausto -2"],"tiradas":{"salv_voluntad":-2,"salv_reflejos":-4,"defensa":-2,"iniciativa_distraccion":1},"carrera":10,"vuelo":null,"levitacion":null,"carga":30},
  "volador · 1": {"umbral":["Malherido -3","Exhausto -2"],"tiradas":{"salv_voluntad":-3,"salv_reflejos":-5,"defensa":-3,"iniciativa_distraccion":-5},"carrera":9,"vuelo":25,"levitacion":10,"carga":30},
  "arkoru · 1": {"umbral":["Malherido -3","Exhausto -2"],"tiradas":{"salv_voluntad":-3,"salv_reflejos":-5,"defensa":-3,"iniciativa_distraccion":-5},"carrera":10,"vuelo":null,"levitacion":null,"carga":72},
  "guerrero · 2": {"umbral":["Moribundo (Manduk · Guerrero) -4","Exhausto -2"],"tiradas":{"salv_voluntad":-4,"salv_reflejos":-5,"defensa":-3,"iniciativa_distraccion":-7},"carrera":10,"vuelo":null,"levitacion":null,"carga":30},
  "siervo · 2": {"umbral":["Moribundo -5","Exhausto (Manduk · Siervo) -1"],"tiradas":{"salv_voluntad":-4,"salv_reflejos":-5,"defensa":-3,"iniciativa_distraccion":-7},"carrera":10,"vuelo":null,"levitacion":null,"carga":20},
  "estabilizacion · 2": {"umbral":["Moribundo (Estabilización Autonómica) -4","Exhausto (Estabilización Autonómica) -1"],"tiradas":{"salv_voluntad":-3,"salv_reflejos":-4,"defensa":-2,"iniciativa_distraccion":-5},"carrera":10,"vuelo":null,"levitacion":null,"carga":20},
  "guerrero + estabilizacion · 2": {"umbral":["Moribundo (Manduk · Guerrero y Estabilización Autonómica) -3","Exhausto (Estabilización Autonómica) -1"],"tiradas":{"salv_voluntad":-2,"salv_reflejos":-3,"defensa":-1,"iniciativa_distraccion":-5},"carrera":10,"vuelo":null,"levitacion":null,"carga":30},
  "neurogenesis · 2": {"umbral":["Moribundo -5","Exhausto -2","Neurogénesis Hipocampal (Exhausto) 1 (compensa)"],"tiradas":{"salv_voluntad":-4,"salv_reflejos":-6,"defensa":-4,"iniciativa_distraccion":-5},"carrera":10,"vuelo":null,"levitacion":null,"carga":20},
  "neuroprotesis activa · 2": {"umbral":["Moribundo (Neuroprótesis Simpática 1) -4","Exhausto (Neuroprótesis Simpática 1) -1"],"tiradas":{"salv_voluntad":-3,"salv_reflejos":-3,"defensa":-1,"iniciativa_distraccion":-5},"carrera":10,"vuelo":null,"levitacion":null,"carga":30},
  "neuroprotesis 4 · 2": {"umbral":[],"tiradas":{"salv_voluntad":2,"salv_reflejos":3,"defensa":5,"iniciativa_distraccion":0},"carrera":22,"vuelo":null,"levitacion":null,"carga":80},
  "proyeccion activa · 2": {"umbral":["Moribundo -5","Exhausto -2"],"tiradas":{"salv_voluntad":-4,"salv_reflejos":-6,"defensa":-4,"iniciativa_distraccion":1},"carrera":10,"vuelo":null,"levitacion":null,"carga":20},
  "volador · 2": {"umbral":["Moribundo -5","Exhausto -2"],"tiradas":{"salv_voluntad":-5,"salv_reflejos":-7,"defensa":-5,"iniciativa_distraccion":-7},"carrera":9,"vuelo":25,"levitacion":10,"carga":20},
  "arkoru · 2": {"umbral":["Moribundo -5","Exhausto -2"],"tiradas":{"salv_voluntad":-5,"salv_reflejos":-7,"defensa":-5,"iniciativa_distraccion":-7},"carrera":10,"vuelo":null,"levitacion":null,"carga":48},
};

describe("caracterización de los umbrales de §7 en resolverFicha", () => {
  for (const [k, c] of Object.entries(CASOS)) {
    test(k, () => {
      const f = resolverFicha(c.sheet(), { estados: c.estados ?? [], vitalidad: c.vitalidad });
      assert.deepEqual(foto(f), ESPERADO[k]);
    });
  }
});
