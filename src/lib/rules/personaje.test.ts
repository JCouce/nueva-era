import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import {
  pasosPersonaje,
  subPestanaInicial,
  etiquetaRasgo,
  esRasgoDeAtributos,
  resumenRasgos,
  identidadPorDefecto,
  type EtiquetaRasgo,
} from "./personaje";
import { especieDeFicha, faltaEnEleccion, rangoReferencia } from "./especie";
import { ESPECIES, type Rasgo } from "../catalog/especies";
import type { Prioridades } from "./prioridad";

const ficha = (especieId: string | null, especieOpciones: Sheet["especieOpciones"] = {}, prioridades?: Prioridades): Sheet => ({
  ...defaultSheet(),
  especieId,
  especieOpciones,
  ...(prioridades ? { prioridades } : {}),
});
const REPARTO: Prioridades = { atributos: "A", habilidades: "B", dotes: "C", psionica: "D", recursos: "E" };

describe("pasosPersonaje", () => {
  test("ficha vacía en creación: los tres primeros pendientes, Estado sin marca", () => {
    const pasos = pasosPersonaje({ sheet: ficha(null), nombre: "", aprobada: false });
    assert.deepEqual(pasos, [
      { id: "origen", estado: "pendiente", falta: ["Elige especie"] },
      { id: "prioridades", estado: "pendiente", falta: ["Reparte las 5 letras de prioridad"] },
      { id: "identidad", estado: "pendiente", falta: ["Ponle nombre"] },
      { id: "estado", estado: null, falta: [] },
    ]);
  });

  test("Manduk sin casta y Manduk Noble sin linaje: Origen pendiente con lo que falta", () => {
    const sinCasta = pasosPersonaje({ sheet: ficha("manduk"), nombre: "K", aprobada: false });
    assert.deepEqual(sinCasta[0], { id: "origen", estado: "pendiente", falta: ["Elige casta"] });
    const nobleSinLinaje = pasosPersonaje({ sheet: ficha("manduk", { casta: "noble" }), nombre: "K", aprobada: false });
    assert.deepEqual(nobleSinLinaje[0], { id: "origen", estado: "pendiente", falta: ["Elige casa"] });
  });

  test("todo hecho: Manduk Noble Ílkrem, letras repartidas, con nombre", () => {
    const pasos = pasosPersonaje({
      sheet: ficha("manduk", { casta: "noble", linaje: "ilkrem" }, REPARTO),
      nombre: "Korr",
      aprobada: false,
    });
    assert.deepEqual(
      pasos.map((p) => [p.id, p.estado]),
      [
        ["origen", "hecho"],
        ["prioridades", "hecho"],
        ["identidad", "hecho"],
        ["estado", null],
      ],
    );
    assert.ok(pasos.every((p) => p.falta.length === 0));
  });

  test("Identidad solo exige nombre, y no vale uno en blanco", () => {
    const sheet = { ...ficha("humano"), edad: null, altura: null, peso: null, trasfondo: "", motivacion: "" };
    assert.equal(pasosPersonaje({ sheet, nombre: "Ana", aprobada: false })[2].estado, "hecho");
    assert.equal(pasosPersonaje({ sheet, nombre: "   ", aprobada: false })[2].estado, "pendiente");
  });

  test("especie desconocida: Origen pendiente", () => {
    assert.deepEqual(pasosPersonaje({ sheet: ficha("dragon"), nombre: "x", aprobada: false })[0].falta, ["Elige especie"]);
  });

  test("aprobada: sin Prioridades, Origen fijado, nada pendiente", () => {
    const pasos = pasosPersonaje({ sheet: ficha(null), nombre: "", aprobada: true });
    assert.deepEqual(pasos, [
      { id: "origen", estado: "fijado", falta: [] },
      { id: "identidad", estado: null, falta: [] },
      { id: "estado", estado: null, falta: [] },
    ]);
  });
});

describe("subPestanaInicial", () => {
  test("aprobada: Estado", () => {
    assert.equal(subPestanaInicial(pasosPersonaje({ sheet: ficha(null), nombre: "", aprobada: true }), true), "estado");
  });
  test("en creación: el primer pendiente", () => {
    assert.equal(subPestanaInicial(pasosPersonaje({ sheet: ficha(null), nombre: "", aprobada: false }), false), "origen");
    assert.equal(
      subPestanaInicial(pasosPersonaje({ sheet: ficha("riux"), nombre: "", aprobada: false }), false),
      "prioridades",
    );
    assert.equal(
      subPestanaInicial(pasosPersonaje({ sheet: ficha("riux", {}, REPARTO), nombre: "", aprobada: false }), false),
      "identidad",
    );
  });
  test("en creación con todo hecho: Identidad", () => {
    assert.equal(
      subPestanaInicial(pasosPersonaje({ sheet: ficha("riux", {}, REPARTO), nombre: "R", aprobada: false }), false),
      "identidad",
    );
  });
});

describe("faltaEnEleccion", () => {
  test("cada caso", () => {
    assert.equal(faltaEnEleccion({ especieId: null }), "Elige especie");
    assert.equal(faltaEnEleccion({ especieId: "riux" }), null);
    assert.equal(faltaEnEleccion({ especieId: "manduk" }), "Elige casta");
    assert.equal(faltaEnEleccion({ especieId: "manduk", casta: "sabio" }), null);
    assert.equal(faltaEnEleccion({ especieId: "manduk", casta: "noble" }), "Elige casa");
    assert.equal(faltaEnEleccion({ especieId: "manduk", casta: "noble", linaje: "elion" }), null);
  });
});

// Todos los rasgos del catálogo (especies, castas y linajes) salvo los de atributos,
// con la etiqueta que les toca leyendo su prosa. Si se añade un rasgo, este test
// obliga a decidir su etiqueta.
const ESPERADAS: Record<string, EtiquetaRasgo> = {
  "humano/bolsa_aumentos": "creacion",
  "riux/ciclo_cerrado": "siempre", // pasivo de descanso, sin mecanizar
  "riux/piel_irisada": "tirada",
  "riux/estasis": "texto",
  "arianyi/resonancia_extra": "siempre",
  "arianyi/coste_psionico_nivel1": "creacion",
  "arianyi/vision_uv_ir": "texto", // TODO(revisar): acción nueva (activar visión), ninguna de las cuatro etiquetas encaja
  "arianyi/empatia_biologica": "tirada",
  "arianyi/movimiento_acuatico": "siempre",
  "arianyi/apnea": "texto",
  "arkoru/movilidad": "siempre",
  "arkoru/carga": "siempre",
  "arkoru/inamovibles": "tirada",
  "arkoru/matriz_biometalica": "siempre",
  "arkoru/percepcion_sensorial": "tirada",
  "arkoru/adaptacion_termica": "tirada",
  "arkoru/sistemas_filtradores": "tirada",
  "arkoru/acceso_kerzul": "creacion",
  "manduk.noble/contra_miedo": "tirada",
  "manduk.noble/coste_habilidad": "creacion",
  "manduk.sabio/coste_habilidad": "creacion",
  "manduk.guerrero/umbral_heridas": "siempre",
  "manduk.guerrero/coste_habilidad": "creacion",
  "manduk.siervo/umbral_fatiga": "siempre",
  "manduk.siervo/frugal": "siempre",
  "manduk.ilkrem/regeneracion": "siempre",
  "manduk.ilkrem/falla_metabolica": "texto", // TODO(revisar): la prosa pide una salvación de Fortaleza; el catálogo la tiene como nota_fija (en Salvación de Fortaleza, E4)
  "manduk.zimethroni/movimiento": "siempre",
  "manduk.zimethroni/tras_esquivar": "texto", // TODO(revisar): nota_fija en Defensa
  "manduk.zimethroni/hiperactividad": "texto", // TODO(revisar): nota_fija en Defensa (E4)
  "manduk.irota/contra_toxinas": "tirada",
  "manduk.irota/farmacos_mitad": "tirada", // TODO(revisar): ajuste_fijo sobre usar_farmaco; por prosa es más SIEMPRE que TIRADA
  "manduk.maolher/coste_psionico": "creacion",
  "manduk.maolher/peaje_neurologico": "texto", // TODO(revisar): acción nueva con tirada de Fortaleza propia
  "manduk.axadren/vision_infrarroja": "texto",
  "manduk.axadren/contra_ocultos": "tirada",
  "manduk.axadren/deslumbramiento": "texto", // TODO(revisar): la prosa pide tirada de ceguera; el catálogo la tiene como nota_fija
  "manduk.elion/contra_sugestion": "tirada",
  "manduk.elion/rigidez_narcisista": "tirada",
};

function todosLosRasgos(): { clave: string; rasgo: Rasgo }[] {
  return ESPECIES.flatMap((e) => [
    ...e.rasgos.map((rasgo) => ({ clave: `${e.id}/${rasgo.id}`, rasgo })),
    ...(e.castas ?? []).flatMap((c) => c.rasgos.map((rasgo) => ({ clave: `${e.id}.${c.id}/${rasgo.id}`, rasgo }))),
    ...(e.linajes?.opciones ?? []).flatMap((l) => l.rasgos.map((rasgo) => ({ clave: `${e.id}.${l.id}/${rasgo.id}`, rasgo }))),
  ]);
}

describe("etiquetaRasgo: todo el catálogo de especies", () => {
  const todos = todosLosRasgos();
  const sinAtributos = todos.filter(({ rasgo }) => !esRasgoDeAtributos(rasgo));

  test("los rasgos de atributos son exactamente los del helper `atributos`", () => {
    assert.ok(todos.filter(({ rasgo }) => esRasgoDeAtributos(rasgo)).every(({ rasgo }) => rasgo.id === "atributos"));
    assert.ok(sinAtributos.every(({ rasgo }) => rasgo.id !== "atributos"));
  });

  test("cada rasgo tiene etiqueta esperada (ni sobra ni falta)", () => {
    assert.deepEqual(sinAtributos.map((r) => r.clave).sort(), Object.keys(ESPERADAS).sort());
  });

  for (const { clave, rasgo } of sinAtributos) {
    test(`${clave} → ${ESPERADAS[clave]}`, () => {
      assert.equal(etiquetaRasgo(rasgo), ESPERADAS[clave]);
    });
  }

  test("creacion manda sobre el motor", () => {
    assert.equal(
      etiquetaRasgo({
        creacion: true,
        motor: [{ tipo: "numerico", afecta: { modo: "accion_existente", id: "x" }, mecanismo: "ajuste_fijo", estado: "construido" }],
      }),
      "creacion",
    );
  });
});

describe("resumenRasgos", () => {
  test("Riux: chips de atributos aparte, el resto etiquetado en orden del catálogo", () => {
    const { atributos, rasgos } = resumenRasgos(ESPECIES.find((e) => e.id === "riux")!.rasgos);
    assert.deepEqual(
      atributos.map((a) => [a.label, a.valor]),
      [
        ["Agilidad", 1],
        ["Aguante", 1],
        ["Inteligencia", 1],
        ["Carácter", -1],
        ["Fuerza", -1],
      ],
    );
    assert.deepEqual(
      rasgos.map((r) => [r.id, r.etiqueta]),
      [
        ["ciclo_cerrado", "siempre"],
        ["piel_irisada", "tirada"],
        ["estasis", "texto"],
      ],
    );
  });
  test("Humanos y Manduk (especie): sin chips", () => {
    assert.deepEqual(resumenRasgos(ESPECIES.find((e) => e.id === "humano")!.rasgos).atributos, []);
    assert.deepEqual(resumenRasgos(ESPECIES.find((e) => e.id === "manduk")!.rasgos), { atributos: [], rasgos: [] });
  });
});

describe("identidadPorDefecto", () => {
  const rango = (s: Sheet, fuerza = 0) => rangoReferencia(especieDeFicha(s), fuerza);

  test("sin rango (Humanos o sin especie): null", () => {
    assert.deepEqual(identidadPorDefecto(rango(ficha("humano"))), { alturaCm: null, pesoKg: null });
    assert.deepEqual(identidadPorDefecto(null), { alturaCm: null, pesoKg: null });
  });

  test("Riux con Fuerza comprada 0 (−1 de especie): 195 cm, 40 kg", () => {
    // Peso 40-60 + 10 × (−1) = 30-50 → 40; altura 170-220 → 195.
    assert.deepEqual(identidadPorDefecto(rango(ficha("riux"))), { alturaCm: 195, pesoKg: 40 });
  });

  test("Arianyi redondea: 140-190 → 165; 30-55 − 10 = 20-45 → 33 (32,5 hacia arriba)", () => {
    assert.deepEqual(identidadPorDefecto(rango(ficha("arianyi"))), { alturaCm: 165, pesoKg: 33 });
  });

  test("Manduk Noble sin linaje: usa la casta y sigue a la Fuerza", () => {
    // Noble: 50-70 kg + 10 × Fuerza, 170-200 cm.
    assert.deepEqual(identidadPorDefecto(rango(ficha("manduk", { casta: "noble" }), 2)), { alturaCm: 185, pesoKg: 80 });
    // Ílkrem suma Fuerza +1.
    assert.deepEqual(identidadPorDefecto(rango(ficha("manduk", { casta: "noble", linaje: "ilkrem" }), 2)), {
      alturaCm: 185,
      pesoKg: 90,
    });
  });

  test("Manduk sin casta: sin rango", () => {
    assert.deepEqual(identidadPorDefecto(rango(ficha("manduk"))), { alturaCm: null, pesoKg: null });
  });
});
