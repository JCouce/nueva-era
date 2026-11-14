// Tanda E5a del sync Drive 2026-11-14 (docs/plan-sync-2026-11-14.md, docs/sistema.md §11 y S109):
// Metabolismo Sintético, Control Anímico y Control Sensorial, probados a través del motor
// (resolverFicha, montarTirada, las acciones de aumento y la compra).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { conExtrasDeFicha, resolverFicha, VITALIDAD_DE_FICHA, type FichaResuelta, type VitalidadActual } from "./fichaResuelta";
import { ACCIONES, type Accion } from "./acciones";
import { estadoInicial, type CondicionTirada, type EstadoCondiciones } from "./condiciones";
import { montarTirada, SIN_ELECCION, type TiradaMontada } from "./montaje";
import { ID_SELECTOR_CONTRA } from "./aumentosTiradas";
import { usoDeAccionAumento } from "./aumentosAcciones";
import { planCompraAumento } from "./aumentos";
import type { EstadoActivo } from "./estados";

let n = 0;
function con(sheet: Sheet, catalogoId: string, nivel?: number): Sheet {
  return { ...sheet, equipo: [...sheet.equipo, { instanciaId: `e5a${++n}`, catalogoId, ...(nivel !== undefined && { nivel }) }] };
}
const conRecursos = (s: Sheet, fatiga = 8): Sheet => ({ ...s, fatigaActual: fatiga, vidaActual: 8 });

const resolver = (s: Sheet, estados: EstadoActivo[] = [], vitalidad: VitalidadActual = VITALIDAD_DE_FICHA) => resolverFicha(s, { estados, vitalidad });
const tiradaFija = (f: FichaResuelta, id: string): Accion => conExtrasDeFicha(f, ACCIONES.find((a) => a.id === id)!);
function montar(f: FichaResuelta, id: string, cambios: EstadoCondiciones = {}): TiradaMontada {
  const t = tiradaFija(f, id);
  return montarTirada(f, t, { ...SIN_ELECCION, estadoCondiciones: { ...estadoInicial(t.condiciones ?? []), ...cambios } });
}
function selector(f: FichaResuelta, id: string): Extract<CondicionTirada, { tipo: "opcion" }> {
  const c = tiradaFija(f, id).condiciones?.find((x) => x.id.startsWith(ID_SELECTOR_CONTRA));
  assert.ok(c && c.tipo === "opcion", `sin selector en ${id}`);
  return c;
}
const opcion = (f: FichaResuelta, id: string, amenaza: string) => selector(f, id).opciones.find((o) => o.id === amenaza);
const linea = (m: TiradaMontada, re: RegExp) => m.desglose.filter((l) => re.test(l.etiqueta));

// Malherido (4/20) y Fatigado (4/20): −3 y −1. Exhausto de fatiga (1/20) para ver más tramo.
const HERIDO_Y_FATIGADO: VitalidadActual = { origen: "combate", pgActual: 4, pgMax: 20, fatigaActual: 4, fatigaMax: 20 };
const MUY_FATIGADO: VitalidadActual = { origen: "combate", pgActual: 20, pgMax: 20, fatigaActual: 1, fatigaMax: 20 };

const METABOLISMO = "aum_metabolismo_sintetico";

describe("E5a · Metabolismo Sintético", () => {
  const conMeta = (nivel: number) => conRecursos(con(defaultSheet(), METABOLISMO, nivel));

  test("la fatiga máxima sube 1 por nivel (+1 … +4); la vida no", () => {
    const base = resolver(defaultSheet()).salud;
    for (const nivel of [1, 2, 3, 4]) {
      const s = resolver(conMeta(nivel)).salud;
      assert.equal(s.fatiga - base.fatiga, nivel, `nivel ${nivel}`);
      assert.equal(s.vida, base.vida, `nivel ${nivel}`);
    }
  });

  test("salvaciones +1 … +4 contra congelación, enfermedad, toxinas, venenos, fatiga inducida, parálisis y shock", () => {
    for (const nivel of [1, 2, 3, 4]) {
      const f = resolver(conMeta(nivel));
      for (const amenaza of ["congelacion", "enfermedad", "toxinas", "venenos", "fatiga", "paralisis", "shock"]) {
        const m = montar(f, "salv_fortaleza", { [selector(f, "salv_fortaleza").id]: amenaza });
        assert.deepEqual(linea(m, /Metabolismo/).map((l) => l.valor), [nivel], `${amenaza} ${nivel}`);
      }
      assert.equal(opcion(f, "salv_fortaleza", "radiacion"), undefined, "la radiación no la nombra");
    }
  });

  test("apnea ×2 … ×5: nota en la opción «Asfixia» de la Salvación de Voluntad, sin bono; el 3 ignora el gasto de la asfixia 1", () => {
    for (const nivel of [1, 2, 3, 4]) {
      const asfixia = opcion(resolver(conMeta(nivel)), "salv_voluntad", "asfixia");
      assert.ok(asfixia, `nivel ${nivel}`);
      assert.equal(asfixia.valor, 0);
      assert.match(asfixia.nota ?? "", new RegExp(`×${nivel + 1} el tiempo en apnea`));
      assert.equal(/asfixia de grado 1/.test(asfixia.nota ?? ""), nivel >= 3, `nivel ${nivel}`);
    }
  });

  test("nivel 2+: −1 a los penalizadores por fatiga, no a los de heridas", () => {
    const sin = montar(resolver(conMeta(1), [], MUY_FATIGADO), "atletismo");
    const con2 = montar(resolver(conMeta(2), [], MUY_FATIGADO), "atletismo");
    const fatiga = (m: TiradaMontada) => linea(m, /^(Fatigado|Exhausto|Agotado)/).reduce((t, l) => t + l.valor, 0);
    assert.ok(fatiga(sin) < 0);
    assert.equal(fatiga(con2) - fatiga(sin), 1);
    const herido = montar(resolver(conMeta(4), [], HERIDO_Y_FATIGADO), "atletismo");
    assert.deepEqual(linea(herido, /^Malherido/).map((l) => l.valor), [-3]);
    assert.deepEqual(linea(herido, /^Fatigado/), [], "−1 + 1: a 0");
  });

  test("nivel 4: la sobrecarga cobra 2 de fatiga y pone su estado 3 rondas", () => {
    const uso = usoDeAccionAumento(conMeta(4), [], "aumentos_activar_metabolismo");
    assert.ok(uso.ok);
    assert.equal(uso.sheet.fatigaActual, 6);
    assert.deepEqual(uso.op, { tipo: "poner", estado: { estadoId: "aum_metabolismo_sobrecarga", gradoId: "activo", rondasRestantes: 3 } });
    assert.equal(resolver(conMeta(3)).accionesAumentos.directas.some((a) => a.id === "aumentos_activar_metabolismo"), false, "solo el 4");
  });

  test("nivel 4 activo: sin penalizadores por fatiga (los de heridas siguen) y ventaja en la Salvación de Fortaleza", () => {
    const sobrecarga: EstadoActivo = { estadoId: "aum_metabolismo_sobrecarga", gradoId: "activo", rondasRestantes: 3 };
    const f = resolver(conMeta(4), [sobrecarga], MUY_FATIGADO);
    assert.deepEqual(linea(montar(f, "atletismo"), /^(Fatigado|Exhausto|Agotado)/), []);
    assert.equal(montar(f, "salv_fortaleza").ventaja, "Metabolismo Sintético 4");
    assert.equal(montar(f, "salv_voluntad").ventaja, null);
    const herido = resolver(conMeta(4), [sobrecarga], HERIDO_Y_FATIGADO);
    assert.deepEqual(linea(montar(herido, "atletismo"), /^Malherido/).map((l) => l.valor), [-3]);
    const apagado = resolver(conMeta(4), [], MUY_FATIGADO);
    assert.equal(montar(apagado, "salv_fortaleza").ventaja, null);
  });

  test("incompatible con Biogénesis, Angiogénesis y Regeneración Tisular, en los dos sentidos", () => {
    for (const op of ["aum_biogenesis_mitocondrial", "aum_angiogenesis_sistemica", "aum_regeneracion_tisular_acelerada"]) {
      const conOp = con(defaultSheet(), op);
      const plan = planCompraAumento(conOp, { catalogoId: METABOLISMO, nivel: 1 });
      assert.equal(plan.ok, false, op);
      assert.match(plan.ok ? "" : plan.motivo, /^Incompatible con /);
      assert.equal(planCompraAumento(con(defaultSheet(), METABOLISMO, 1), { catalogoId: op }).ok, false, `${op} tras Metabolismo`);
    }
    assert.equal(planCompraAumento(defaultSheet(), { catalogoId: METABOLISMO, nivel: 1 }).ok, true);
  });
});
