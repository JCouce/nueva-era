import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { prepararPoder, usarPoder, efectosDelResultado, type SeleccionPoder } from "./usoPoder";
import { accionesDePsionica } from "./poderes";
import { defaultSheet, type Sheet } from "./sheet";
import type { ModificadorConFuente } from "./modificadores";

// Los números de estos casos son los que ya daba la app antes de sacar esta
// lógica de AccionesTab (docs/pruebas-psionica.md, flujos H8, M y N).

const ficha = (cambios: Partial<Sheet>): Sheet => ({ ...defaultSheet(), fatigaActual: 8, fatigaTemporal: 0, ...cambios });
const SINGULARIDAD_2 = { traslacion: 2, singularidad: 2 };
const sel = (s: Partial<SeleccionPoder> = {}): SeleccionPoder => ({ elecciones: {}, casillas: [], puntosCargas: 0, ...s });

function preparar(f: Sheet, accionId: string, s: Partial<SeleccionPoder> = {}, modificadores: ModificadorConFuente[] = []) {
  const poder = accionesDePsionica(f).find((p) => p.accion.id === accionId)!;
  return prepararPoder({ ficha: f, modificadores, poder, seleccion: sel(s) })!;
}

describe("prepararPoder", () => {
  const f = ficha({ psionica: SINGULARIDAD_2 });

  test("Impulso nivel 2: coste, tirada y las tres casillas externas", () => {
    const p = preparar(f, "psi_singularidad_impulso");
    assert.equal(p.coste?.total, 2);
    assert.ok(p.tirada);
    assert.deepEqual(p.casillas.map((c) => c.toggle), ["Bajo Xovromium", "Afectado por Munición Supresora", "Supresora, fallo crítico"]);
    assert.equal(p.bloqueo, null);
    assert.equal(p.cargas, null);
  });

  test("Xovromium: −1 de fatiga y +1 en la tirada", () => {
    const p = preparar(f, "psi_singularidad_impulso", { casillas: ["Bajo Xovromium"] });
    assert.equal(p.coste?.total, 1);
    assert.deepEqual(p.tirada?.ajustesFijos?.at(-1), { valor: 1, fuente: "Xovromium" });
  });

  test("sin fatiga suficiente, bloqueo", () => {
    const p = preparar(ficha({ psionica: SINGULARIDAD_2, fatigaActual: 1 }), "psi_singularidad_impulso");
    assert.match(p.bloqueo ?? "", /Te faltan 1 de fatiga/);
  });

  test("las elecciones no disponibles se corrigen", () => {
    const p = preparar(f, "psi_singularidad_impulso", { elecciones: { nivel: "n6" } });
    assert.equal(p.seleccion.elecciones.nivel, "n2");
  });

  test("los modificadores de fuera de la ficha (estados) cuentan en los aplicados", () => {
    // Proeza nivel 1: carga máxima 25 × Perspicacia. Con Perspicacia 0, no se puede.
    const t = ficha({ psionica: { traslacion: 1 } });
    assert.match(preparar(t, "psi_traslacion_proeza", { pesoKg: 60 }).bloqueo ?? "", /carga máxima es 0/);
    const estado: ModificadorConFuente[] = [
      { tipo: "atributo", id: "inteligencia", valor: 2, origen: "estado", fuente: "Prueba" },
      { tipo: "atributo", id: "percepcion", valor: 2, origen: "estado", fuente: "Prueba" },
    ];
    const p = preparar(t, "psi_traslacion_proeza", { pesoKg: 60 }, estado);
    assert.equal(p.bloqueo, null);
    assert.equal(p.extraProrroga, 2); // 60 kg sobre 50 = 120 % → +2
  });
});

describe("usarPoder", () => {
  test("uso normal: paga la fatiga y reinicia la sobrecarga pendiente", () => {
    const f = ficha({ psionica: SINGULARIDAD_2 });
    const e = usarPoder(f, [], preparar(f, "psi_singularidad_impulso"));
    assert.deepEqual(e, { fatiga: { pagar: 2, temporal: false }, cargas: null, vida: 0, sobrecarga: { tipo: "reiniciar" }, avisos: [] });
  });

  test("Supresora con fallo crítico y Derivación: ×2, paga 2 con cargas y 2 de daño por lo que sí paga", () => {
    const f = ficha({
      psionica: SINGULARIDAD_2,
      equipo: [{ instanciaId: "der1", catalogoId: "derivacion_psionica", nivel: 3 }],
      recursos: [{ instanciaId: "der1", actual: 10, max: 10 }],
    });
    const p = preparar(f, "psi_singularidad_impulso", { casillas: ["Supresora, fallo crítico"], puntosCargas: 2 });
    assert.equal(p.coste?.total, 2);
    assert.deepEqual(p.cargas && { puntos: p.cargas.puntos, gastar: p.cargas.gastar, max: p.cargas.max }, { puntos: 2, gastar: 4, max: 4 });
    const e = usarPoder(f, [], p);
    assert.deepEqual(e.fatiga, { pagar: 2, temporal: false });
    assert.deepEqual(e.cargas, { instanciaId: "der1", gastar: 4 });
    assert.equal(e.vida, 2);
    assert.deepEqual(e.avisos, ["Munición Supresora: recibes 2 de daño letal (ya restado)."]);
  });

  test("sobrecarga: salta al cruzar el umbral de exhausto", () => {
    const f = ficha({ psionica: SINGULARIDAD_2, fatigaActual: 3 });
    const e = usarPoder(f, [], preparar(f, "psi_singularidad_impulso"));
    assert.deepEqual(e.sobrecarga, { tipo: "salta", nivel: 2 });
    assert.deepEqual(e.avisos, []);
  });

  test("ya exhausto y a 0: aviso de inconsciencia, sin sobrecarga nueva", () => {
    const f = ficha({ psionica: SINGULARIDAD_2, fatigaActual: 1 });
    const p = preparar(f, "psi_singularidad_impulso", { elecciones: { nivel: "n1" } });
    const e = usarPoder(f, [], p);
    assert.deepEqual(e.sobrecarga, { tipo: "reiniciar" });
    assert.deepEqual(e.avisos, ["Te has quedado sin fatiga: quedas inconsciente al terminar la acción."]);
  });

  test("el máximo de fatiga de la sobrecarga usa los modificadores (estados incluidos)", () => {
    const f = ficha({ psionica: SINGULARIDAD_2 });
    const p = preparar(f, "psi_singularidad_impulso");
    assert.deepEqual(usarPoder(f, [], p).sobrecarga, { tipo: "reiniciar" });
    // Fatiga máxima 80: el umbral de exhausto sube a 8, y pasar de 8 a 6 lo cruza.
    const estado: ModificadorConFuente[] = [{ tipo: "derivado", id: "fatiga", valor: 72, origen: "estado", fuente: "Prueba" }];
    assert.deepEqual(usarPoder(f, estado, p).sobrecarga, { tipo: "salta", nivel: 2 });
  });

  describe("Proeza", () => {
    const f = ficha({ psionica: { traslacion: 3 }, atributos: { ...defaultSheet().atributos, inteligencia: 1, percepcion: 1 } });
    // Nivel 1: carga 25 × Perspicacia 1 = 25 kg.

    test("paga la fila más el extra, a fatiga temporal si no llega", () => {
      const p = preparar(f, "psi_traslacion_proeza", { elecciones: { nivel: "n1" }, pesoKg: 30 });
      assert.equal(p.extraProrroga, 2); // 120 %
      const e = usarPoder(f, [], p);
      assert.deepEqual(e.fatiga, { pagar: 3, temporal: true });
    });

    test("prolongar cobra solo el extra, sin cargas ni daño propio, y no borra una sobrecarga pendiente", () => {
      const p = preparar(f, "psi_traslacion_proeza", { elecciones: { nivel: "n1" }, pesoKg: 30 });
      const e = usarPoder(f, [], p, "prolongar");
      assert.equal(e.fatiga.pagar, p.extraProrroga);
      assert.equal(e.vida, 0);
      assert.equal(e.cargas, null);
      assert.deepEqual(e.sobrecarga, { tipo: "mantener" });
      // Si prolongar sí cruza el umbral, salta (al 200 % el extra es 10).
      const limite = preparar(f, "psi_traslacion_proeza", { elecciones: { nivel: "n1" }, pesoKg: 50 });
      assert.deepEqual(usarPoder(f, [], limite, "prolongar").sobrecarga, { tipo: "salta", nivel: 1 });
    });

    test("al 200 %: 1 de daño mental y aviso de inconsciencia", () => {
      const p = preparar(f, "psi_traslacion_proeza", { elecciones: { nivel: "n1" }, pesoKg: 50 });
      const e = usarPoder(f, [], p);
      assert.equal(e.vida, 1);
      assert.ok(e.avisos.some((a) => a === "Recibes 1 de daño mental (ya restado) y quedas inconsciente al terminar la acción."));
    });
  });
});

describe("efectosDelResultado", () => {
  const f = ficha({ psionica: { resonancia: 3, hipercognicion: 1 } });
  const p = preparar(f, "psi_hipercognicion_sondeo", { elecciones: { distancia: "mitad" } });

  test("fracaso crítico del Sondeo: 1 de daño mental por punto de fatiga", () => {
    assert.deepEqual(efectosDelResultado(p, "fracasoCritico"), { vida: 2, avisos: ["Recibes 2 de daño mental (ya restado)."] });
  });

  test("otros grados o sin grado: nada", () => {
    assert.deepEqual(efectosDelResultado(p, "fracaso"), { vida: 0, avisos: [] });
    assert.deepEqual(efectosDelResultado(p, null), { vida: 0, avisos: [] });
  });
});
