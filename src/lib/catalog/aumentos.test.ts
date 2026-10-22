import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AUMENTOS, OPERACIONES_GENETICAS, IMPLANTES } from "./aumentos";
import { equipoPorId, RAREZA_ORDEN } from "./equipo";

// El catálogo se escribió a mano copiando docs/modelado-aumentos.json
// (docs/propuesta-aumentos.md §4): este test cruza lo que no puede desviarse.
type NivelJson = { nivel: number; rareza: string; coste: number; variantes: { id: string }[] | null };
type AumentoJson = {
  familia: "operacion_genetica" | "implante";
  id: string;
  label: string;
  rareza?: string;
  coste?: number;
  requisitos?: { tipo: string; id: string }[];
  eleccion?: { id: string; opciones: { id: string }[] } | null;
  repetible?: boolean;
  sabotaje?: boolean;
  electronico?: boolean;
  niveles?: NivelJson[];
  efectos?: EfectoJson[];
};
type EfectoJson =
  | { tipo: "atributo"; id: string; valor: number }
  | { tipo: "formula_salud"; multiplicaFortaleza: number }
  | { tipo: "coste_habilidad"; habilidades: string[] | "todas"; valor: number }
  | { tipo: "otro" };
const MODELADO = (
  JSON.parse(readFileSync(new URL("../../../docs/modelado-aumentos.json", import.meta.url), "utf8")) as {
    aumentos: AumentoJson[];
  }
).aumentos;

describe("catálogo de aumentos contra docs/modelado-aumentos.json", () => {
  test("mismas 32 piezas, mismos ids y en el mismo orden (26 operaciones y 6 implantes)", () => {
    assert.deepEqual(
      AUMENTOS.map((a) => a.id),
      MODELADO.map((a) => a.id),
    );
    assert.equal(OPERACIONES_GENETICAS.length, 26);
    assert.equal(IMPLANTES.length, 6);
  });

  test("operaciones: label, rareza, coste, requisitos, elección y repetible", () => {
    for (const op of OPERACIONES_GENETICAS) {
      const j = MODELADO.find((a) => a.id === op.id)!;
      assert.equal(j.familia, "operacion_genetica", op.id);
      assert.equal(op.label, j.label, op.id);
      assert.equal(op.rareza, j.rareza, op.id);
      assert.equal(op.coste, j.coste, op.id);
      assert.deepEqual(op.requisitos, (j.requisitos ?? []).map((r) => r.id), op.id);
      assert.equal(op.repetible, j.repetible, op.id);
      assert.deepEqual(
        op.eleccion?.opciones.map((o) => o.id) ?? null,
        j.eleccion ? j.eleccion.opciones.map((o) => o.id) : null,
        op.id,
      );
    }
  });

  test("implantes: niveles con rareza, coste y modelos; marcas de sabotaje y electrónico", () => {
    for (const imp of IMPLANTES) {
      const j = MODELADO.find((a) => a.id === imp.id)!;
      assert.equal(j.familia, "implante", imp.id);
      assert.equal(imp.label, j.label, imp.id);
      assert.equal(imp.sabotaje, j.sabotaje, imp.id);
      assert.equal(imp.electronico, j.electronico, imp.id);
      assert.deepEqual(
        imp.niveles.map((n) => [n.nivel, n.rareza, n.coste, n.variantes?.map((v) => v.id) ?? null]),
        j.niveles!.map((n) => [n.nivel, n.rareza, n.coste, n.variantes?.map((v) => v.id) ?? null]),
        imp.id,
      );
    }
  });
});

describe("integridad del catálogo de aumentos", () => {
  test("los requisitos apuntan a operaciones del catálogo", () => {
    for (const op of OPERACIONES_GENETICAS) {
      for (const id of op.requisitos) assert.equal(equipoPorId(id)?.familia, "operacionGenetica", `${op.id} → ${id}`);
    }
  });

  test("las rarezas son las del equipo y los niveles van de 1 a N", () => {
    for (const op of OPERACIONES_GENETICAS) assert.ok(RAREZA_ORDEN.includes(op.rareza), op.id);
    for (const imp of IMPLANTES) {
      assert.deepEqual(
        imp.niveles.map((n) => n.nivel),
        imp.niveles.map((_, i) => i + 1),
        imp.id,
      );
      for (const n of imp.niveles) assert.ok(RAREZA_ORDEN.includes(n.rareza), `${imp.id} ${n.nivel}`);
    }
  });

  test("A1: los modificadores de las operaciones son los +1 y la vida del modelado", () => {
    for (const op of OPERACIONES_GENETICAS) {
      const j = MODELADO.find((a) => a.id === op.id)!;
      const esperados = (j.efectos ?? []).flatMap((e) =>
        e.tipo === "atributo"
          ? [{ tipo: "atributo", id: e.id, valor: e.valor }]
          : e.tipo === "formula_salud"
            ? [{ tipo: "multiplicadorVida", valor: e.multiplicaFortaleza }]
            : [],
      );
      assert.deepEqual(op.modificadores, esperados, op.id);
      const coste = (j.efectos ?? []).find((e) => e.tipo === "coste_habilidad");
      assert.deepEqual(
        op.rebajaCosteHabilidad ?? null,
        coste ? { habilidades: coste.habilidades, valor: coste.valor } : null,
        op.id,
      );
    }
  });

  test("A2a: de los implantes, solo el Ojo trae modificadores: distancia y Alerta pasiva, sin apilarse con miras", () => {
    const distancia = (valor: number) => ({
      tipo: "tirada",
      alcance: { tipo: "grupoHabilidad", grupo: "Ataques", habilidad: "combate_distancia" },
      valor,
      noApila: "vision_aumentada",
    });
    const alerta = (valor: number) => ({ tipo: "derivado", id: "alerta", valor, noApila: "vision_aumentada" });
    const ojo: Record<number, object[]> = {
      1: [distancia(1), alerta(1)],
      2: [alerta(2)],
      3: [distancia(2), alerta(3)],
      4: [distancia(3), alerta(4)],
    };
    for (const imp of IMPLANTES) {
      for (const n of imp.niveles) {
        assert.deepEqual(n.modificadores, imp.id === "aum_ojo_bionico" ? ojo[n.nivel] : [], `${imp.id} ${n.nivel}`);
      }
    }
  });

  // Efectos de motor construidos en A2a (casillas, selector "Contra…", textos y armadura
  // natural), por pieza o por "pieza nivel"; el resto, los de A1.
  const CONSTRUIDOS_A2A: Record<string, number> = {
    aum_optimizacion_vestibulo_auditiva: 2,
    aum_regulacion_limbico_prefrontal: 1,
    aum_matriz_de_red_predeterminada: 4, // 2 de A2a y 2 de A2b
    aum_integridad_osteotendinosa: 1,
    aum_matriz_osea_adaptativa: 2, // armadura natural (A2a) y la nota de carga (A3)
    aum_biogenesis_mitocondrial: 1,
    aum_resiliencia_homeostatica: 1,
    aum_estabilizacion_autonomica: 5, // 2 de A2a, el ajuste de umbrales (A3) y Sacudir/Dominar (A4a)
    aum_introgresion_sensorial_heterologa: 3, // 2 de A2a y el barrido electromagnético (A4b)
    "aum_ojo_bionico 1": 3,
    "aum_ojo_bionico 2": 3, // 1 de A2a y la cobertura visual en distancia y Buscar (A3)
    "aum_ojo_bionico 3": 2,
    "aum_ojo_bionico 4": 4, // 2 de A2a y cualquier cobertura en distancia y Buscar (A3)
    "aum_enjambre_nanobot 3": 2, // salvaciones (A2a) y Densificar (A4b)
    // A2b: casillas por aplicado y de cualquier tirada, ventaja fija y textos.
    aum_mielinizacion_central: 1,
    aum_red_frontoparietal: 2, // ventaja en Iniciativa (A2b) y la acción combinada (A4a)
    aum_prefrontal_aumentada: 2,
    aum_optimizacion_foveo_sensorial: 3, // Tras Apuntar (A2b) y cobertura visual (A3)
    // A3: compensación de fatiga en las pruebas mentales.
    aum_neurogenesis_hipocampal: 1,
    aum_consciencia_omnidireccional: 2,
    aum_asa_estriatotalamica: 1,
    aum_conectividad_callosa: 3,
    aum_proyeccion_neuro_expresiva: 2, // ventaja en Actitud (A2b) y el activable (A5a)
    aum_sincronizacion_neuromotora_profunda: 1,
    aum_automatismo_bulboespinal: 2,
    aum_hiperdensidad_propioceptiva: 1,
    aum_bucle_de_realimentacion_motora: 2,
    // A4a: acciones propias y la defensa del MQE (con el alcance de cada nivel en su nota).
    aum_angiogenesis_sistemica: 2,
    aum_regeneracion_tisular_acelerada: 1,
    "aum_microprocesador_cuantico_de_enlace 1": 2,
    "aum_microprocesador_cuantico_de_enlace 2": 2,
    "aum_microprocesador_cuantico_de_enlace 3": 2,
    "aum_microprocesador_cuantico_de_enlace 4": 2,
    "aum_enjambre_nanobot 2": 2,
    // A4b: Incorporar arma, Tempestad Nanobótica y su nota del blindaje del objetivo.
    "aum_enjambre_nanobot 4": 2,
    // A5a: activables. Neuroprótesis 1 entera (activar, +1 a los tres, −1 a los penalizadores,
    // −1 en "Contra…" y la nota) y la elección del 2.
    "aum_neuroprotesis_simpatica 1": 7,
    "aum_neuroprotesis_simpatica 2": 1,
    // A5b: segunda reacción y acción adicional (3); el estado de 1 ronda con sus +2, la
    // eliminación de heridas y fatiga y la nota (4).
    "aum_neuroprotesis_simpatica 3": 2,
    "aum_neuroprotesis_simpatica 4": 5,
    // A6a: la casilla del brazo (1-4), el blindaje y el bloqueo (2-4), el letal en pelea (2) y la
    // fila "Bloquear con el brazo biónico" (2). El nivel 1 suma la casilla a Incorporar arma.
    "aum_brazo_bionico 1": 2,
    "aum_brazo_bionico 2": 4,
    "aum_brazo_bionico 3": 2,
    "aum_brazo_bionico 4": 2,
  };

  test("A1, A2a, A2b, A3, A4a, A4b, A5a, A5b y A6a: solo lo construido (o lo narrativo) está marcado como construido", () => {
    for (const op of OPERACIONES_GENETICAS) {
      const construidos = op.motor.filter((m) => m.estado === "construido" && m.tipo !== "narrativo");
      const esperados =
        (op.modificadores.some((m) => m.tipo === "atributo") ? 1 : 0) +
        (op.rebajaCosteHabilidad ? 1 : 0) +
        (op.modificadores.some((m) => m.tipo === "multiplicadorVida") ? 1 : 0) +
        (CONSTRUIDOS_A2A[op.id] ?? 0);
      assert.equal(construidos.length, esperados, op.id);
    }
    for (const imp of IMPLANTES) {
      for (const n of imp.niveles) {
        const construidos = (n.motor ?? []).filter((m) => m.estado === "construido" && m.tipo !== "narrativo");
        assert.equal(construidos.length, CONSTRUIDOS_A2A[`${imp.id} ${n.nivel}`] ?? 0, `${imp.id} ${n.nivel}`);
      }
    }
  });
});
