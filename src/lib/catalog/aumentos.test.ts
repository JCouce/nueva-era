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
  // E5a (sync Drive 2026-11-14): + Metabolismo Sintético, Control Anímico y Control Sensorial.
  // E5b: + Chasis Osteomuscular.
  test("mismas 36 piezas, mismos ids y en el mismo orden (26 operaciones y 10 implantes)", () => {
    assert.deepEqual(
      AUMENTOS.map((a) => a.id),
      MODELADO.map((a) => a.id),
    );
    assert.equal(OPERACIONES_GENETICAS.length, 26);
    assert.equal(IMPLANTES.length, 10);
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
      // `electronico` del modelado pasó a `shock` (T7a): electrónico = lo toca el Shock del cuerpo.
      assert.equal(imp.shock === "cuerpo", j.electronico, imp.id);
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

  // E4: cada pareja, en un solo lado (rules/aumentos.ts la lee en los dos).
  test("incompatibleCon apunta a otros aumentos y cada pareja se declara una vez", () => {
    for (const a of AUMENTOS) {
      for (const id of a.incompatibleCon ?? []) {
        assert.ok(AUMENTOS.some((b) => b.id === id && b.id !== a.id), `${a.id} → ${id}`);
        assert.ok(!AUMENTOS.find((b) => b.id === id)?.incompatibleCon?.includes(a.id), `${a.id} ↔ ${id} repetida`);
      }
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

  // Lo que el modelado no trae y es un bono permanente a una tirada, uno a uno.
  const TIRADA_FUERA_DEL_MODELADO: Record<string, unknown[]> = {
    // Sync Drive 2026-11-14: +1 a todo ataque a distancia, sin la condición de apuntar.
    aum_optimizacion_foveo_sensorial: [
      { tipo: "tirada", alcance: { tipo: "grupoHabilidad", grupo: "Ataques", habilidad: "combate_distancia" }, valor: 1 },
    ],
  };

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
      assert.deepEqual(op.modificadores, [...esperados, ...(TIRADA_FUERA_DEL_MODELADO[op.id] ?? [])], op.id);
      const coste = (j.efectos ?? []).find((e) => e.tipo === "coste_habilidad");
      assert.deepEqual(
        op.rebajaCosteHabilidad ?? null,
        coste ? { habilidades: coste.habilidades, valor: coste.valor } : null,
        op.id,
      );
    }
  });

  test("A2a y E5a: modificadores de los implantes (Ojo: distancia y Alerta pasiva, sin apilarse con miras; Metabolismo, Control Anímico y Control Sensorial)", () => {
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
    const fatiga = (valor: number) => ({ tipo: "derivado", id: "fatiga", valor });
    const esperados: Record<string, Record<number, object[]>> = {
      aum_ojo_bionico: ojo,
      // E5a: la fatiga máxima sube 1 por nivel (usuario, 2026-11-14).
      aum_metabolismo_sintetico: { 1: [fatiga(1)], 2: [fatiga(2)], 3: [fatiga(3)], 4: [fatiga(4)] },
      aum_control_animico: { 1: [{ tipo: "tirada", alcance: { tipo: "habilidad", habilidad: "actitud" }, valor: 1 }], 2: [] },
      aum_control_sensorial: { 1: [{ tipo: "atributo", id: "percepcion", valor: 1 }], 2: [] },
      // E5b: Fuerza +N por nivel (el alto sustituye al bajo).
      aum_chasis_osteomuscular: Object.fromEntries([1, 2, 3, 4].map((n) => [n, [{ tipo: "atributo", id: "fuerza", valor: n }]])),
    };
    for (const imp of IMPLANTES) {
      for (const n of imp.niveles) {
        assert.deepEqual(n.modificadores, esperados[imp.id]?.[n.nivel] ?? [], `${imp.id} ${n.nivel}`);
      }
    }
  });

  // Efectos de motor construidos en A2a (casillas, selector "Contra…", textos y armadura
  // natural), por pieza o por "pieza nivel"; el resto, los de A1.
  const CONSTRUIDOS_A2A: Record<string, number> = {
    aum_optimizacion_vestibulo_auditiva: 3, // 2 de A2a y la ventaja al rastrear por el sonido (tiradas fijas)
    aum_regulacion_limbico_prefrontal: 1,
    aum_matriz_de_red_predeterminada: 4, // 2 de A2a y 2 de A2b
    aum_integridad_osteotendinosa: 1,
    aum_matriz_osea_adaptativa: 2, // armadura natural (A2a) y la nota de carga (A3)
    aum_biogenesis_mitocondrial: 2, // +1: Coste partido de la casilla de ventaja, fase 1b
    aum_resiliencia_homeostatica: 1,
    aum_estabilizacion_autonomica: 5, // 2 de A2a, el ajuste de umbrales (A3) y Sacudir/Dominar (A4a)
    aum_introgresion_sensorial_heterologa: 5, // 2 de A2a, el barrido electromagnético (A4b), la UV en Investigación y los sentidos en Buscar (au-06)
    // Sync Drive 2026-11-14 (M3.4): +2 por nivel, la casilla de ventaja (Resolución y Coste).
    "aum_ojo_bionico 1": 6, // + lo que ve en Buscar (au-06)
    "aum_ojo_bionico 2": 6, // 1 de A2a, la cobertura visual en distancia y Buscar (A3) y la inmunidad (A7)
    "aum_ojo_bionico 3": 5, // + rayos X en Buscar (au-06)
    // Sync Drive 2026-11-14 (M3.3): sin su propia inmunidad (viene del 2).
    "aum_ojo_bionico 4": 7, // 2 de A2a, cualquier cobertura en distancia y Buscar (A3) y rayos X en Buscar (au-06)
    "aum_enjambre_nanobot 3": 4, // salvaciones (A2a) y Densificar (A4b), partido en Ajuste y Coste (triaje 2026-10-28, #20); +1: el +3 contra el aturdimiento tras Densificar (#21)
    // A2b: casillas por aplicado y de cualquier tirada, ventaja fija y textos.
    aum_mielinizacion_central: 1,
    aum_red_frontoparietal: 2, // ventaja en Iniciativa (A2b) y la acción combinada (A4a)
    aum_prefrontal_aumentada: 3, // +1: Coste partido de la casilla de ventaja, fase 1b
    aum_optimizacion_foveo_sensorial: 3, // +1 con «Apuntado» (bono por opción) y cobertura visual (A3)
    // A3: compensación de fatiga en las pruebas mentales.
    aum_neurogenesis_hipocampal: 1,
    aum_consciencia_omnidireccional: 3, // +1: Coste partido de la casilla de ventaja, fase 1b
    aum_asa_estriatotalamica: 3, // casilla «Simplificar» (triaje 2026-10-28, #2-3): Coste, Resolución y la exclusión como Texto
    aum_conectividad_callosa: 4, // +1: Coste partido de la casilla de ventaja, fase 1b
    aum_proyeccion_neuro_expresiva: 5, // ventaja en Actitud (A2b) y el activable (A5a); +1: Coste partido de la casilla de ventaja, fase 1b; +2: el activable partido en Acción, Resolución y Coste (auditoría tanda 1)
    aum_sincronizacion_neuromotora_profunda: 2, // +1: Coste partido de la casilla de ventaja, fase 1b
    aum_automatismo_bulboespinal: 2,
    aum_hiperdensidad_propioceptiva: 1,
    aum_bucle_de_realimentacion_motora: 2,
    // A4a: acciones propias y la defensa del MQE (con el alcance de cada nivel en su nota).
    aum_angiogenesis_sistemica: 2,
    aum_regeneracion_tisular_acelerada: 2, // Eliminar exanguinante (A4a) e inmunidad a la hemorragia (A7)
    "aum_microprocesador_cuantico_de_enlace 1": 2,
    "aum_microprocesador_cuantico_de_enlace 2": 2,
    "aum_microprocesador_cuantico_de_enlace 3": 2,
    "aum_microprocesador_cuantico_de_enlace 4": 2,
    // au-07: la casilla «Sobre ti mismo» en Tratar heridas y en los fármacos, y la nota para quien te cura.
    // Sync Drive 2026-11-14 (M4.1): +1 por nivel, la purga (+1/+2/+3/+4) desde el 1.
    "aum_enjambre_nanobot 1": 4,
    "aum_enjambre_nanobot 2": 3, // Sanar letal y Sanar grave (contador de 5 pulsaciones, usuario 2026-10-28) y la purga
    // A4b: Incorporar arma, Tempestad Nanobótica y su nota del blindaje del objetivo.
    "aum_enjambre_nanobot 4": 3,
    // A5a: activables. Neuroprótesis 1 entera (activar, +1 a las tiradas de los tres aplicados
    // —una entrada desde el sync Drive 2026-11-14, antes una por atributo—, −1 a los
    // penalizadores, −1 en "Contra…" y la nota) y la elección del 2.
    "aum_neuroprotesis_simpatica 1": 5,
    "aum_neuroprotesis_simpatica 2": 1,
    // A5b: segunda reacción y acción adicional (3); el estado de 1 ronda con sus +2, la
    // eliminación de heridas y fatiga y la nota (4).
    "aum_neuroprotesis_simpatica 3": 2,
    "aum_neuroprotesis_simpatica 4": 3,
    // A6a: la casilla del brazo (1-4), el blindaje y el bloqueo (2-4), el letal en pelea (2) y la
    // fila "Bloquear con el brazo biónico" (2). El nivel 1 suma la casilla a Incorporar arma.
    // A6b: las notas del arma incorporada (cuerpo a cuerpo, fuego y desarme) en el nivel 1.
    // Sync Drive 2026-11-14 (M2.7): +2 por nivel, la casilla de ventaja (Resolución y Coste).
    "aum_brazo_bionico 1": 7,
    "aum_brazo_bionico 2": 6,
    "aum_brazo_bionico 3": 4,
    "aum_brazo_bionico 4": 4,
    // T6a (au-04, au-05): el 1 habilita la psiónica y añade la salvación de sobreesfuerzo; cada
    // nivel, cuándo salta y su tabla.
    "aum_implante_de_resonancia_metrica 1": 2,
    "aum_implante_de_resonancia_metrica 2": 2,
    "aum_implante_de_resonancia_metrica 3": 2,
    "aum_implante_de_resonancia_metrica 4": 2,
    // E5a (sync Drive 2026-11-14). Metabolismo: fatiga máxima, salvaciones y la nota de la apnea por
    // nivel; el 2, −1 a la fatiga; el 4, la sobrecarga (acción, coste, sin fatiga y ventaja).
    "aum_metabolismo_sintetico 1": 3,
    "aum_metabolismo_sintetico 2": 4,
    "aum_metabolismo_sintetico 3": 3,
    "aum_metabolismo_sintetico 4": 7,
    // Control Anímico: +1 en Actitud y en «Contra…»; casilla de Inteligencia (Resolución y Coste),
    // activar y la inmunidad al miedo.
    "aum_control_animico 1": 2,
    "aum_control_animico 2": 4,
    // Control Sensorial: Percepción, «Contra…» y la reducción; el 2, los dos doblados.
    "aum_control_sensorial 1": 3,
    "aum_control_sensorial 2": 2,
    // E5b. Chasis Osteomuscular: Fuerza, armadura natural, desarmado letal y bloquear sin el −3.
    "aum_chasis_osteomuscular 1": 4,
    // 2-4: lo del 1 con su N, más la casilla contra el derribo y el «Contra…» del aturdimiento, y el
    // Proyector integrado (Acción y Coste) y Camuflaje integrado (Acción, Coste, el bloqueo por
    // armadura y la cobertura en el Sigilo).
    "aum_chasis_osteomuscular 2": 12,
    "aum_chasis_osteomuscular 3": 12,
    "aum_chasis_osteomuscular 4": 12,
  };

  test("A1, A2a, A2b, A3, A4a, A4b, A5a, A5b, A6a, A6b y A7: solo lo construido (o lo narrativo) está marcado como construido", () => {
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

// Sync Drive 2026-11-14: la fuente dice «ventaja» donde antes decía «dos dados». Los textos
// cortos de la app (resúmenes y etiquetas de casillas) lo dicen igual; el detalle copia la fuente.
describe("«ventaja», no «dos dados», en resúmenes y etiquetas", () => {
  test("ninguna pieza de aumentos dice «dos dados» en su resumen ni en una etiqueta", () => {
    const textos: string[] = [];
    const recoger = (x: unknown, clave?: string): void => {
      if (typeof x === "string") {
        if (clave === "resumen" || clave === "etiqueta") textos.push(x);
      } else if (Array.isArray(x)) {
        for (const y of x) recoger(y);
      } else if (x && typeof x === "object") {
        for (const [k, v] of Object.entries(x)) recoger(v, k);
      }
    };
    recoger(AUMENTOS);
    assert.ok(textos.length > 40);
    assert.deepEqual(textos.filter((t) => /dos dados/i.test(t)), []);
  });
});
