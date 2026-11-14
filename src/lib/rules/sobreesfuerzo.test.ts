// T6a (es-01, au-04, au-05, ps-01…04, eq-27): el sobreesfuerzo psiónico y la salvación de sobrecarga.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { motivoDeBloqueo } from "./habilitacion";
import { resolverFicha, VITALIDAD_DE_FICHA, type FichaResuelta } from "./fichaResuelta";
import { defaultSheet, type Sheet } from "./sheet";
import { salud } from "./derivados";
import { poderesDeFicha } from "./poderes";
import {
  falloDeSobreesfuerzo,
  montarSalvacionSobrecarga,
  montarSobreesfuerzo,
  prepararPoder,
  tirarSobreesfuerzo,
  usarPoder,
  type SeleccionPoder,
} from "./usoPoder";
import {
  consecuenciaDeSobreesfuerzo,
  esMasSuave,
  libraPorMoneda,
  saltaSobreesfuerzo,
  sobreesfuerzoDeUso,
  textoResultadoSobreesfuerzo,
  type SobreesfuerzoDeFicha,
} from "./sobreesfuerzo";
import { SOBREESFUERZO_ARIANYI, SOBREESFUERZO_IRM, SOBREESFUERZO_MAOLHER, TABLA_MAESTRIA_PSIONICA } from "../catalog/sobreesfuerzos";

const MAOLHER: Partial<Sheet> = { especieId: "manduk", especieOpciones: { casta: "noble", linaje: "maolher" } };
const irm = (nivel: number) => ({ equipo: [{ instanciaId: "irm", catalogoId: "aum_implante_de_resonancia_metrica", nivel }] });

function ficha(patch: Partial<Sheet> = {}): Sheet {
  const d = defaultSheet();
  return {
    ...d,
    atributos: { fuerza: 2, agilidad: 2, aguante: 2, percepcion: 1, inteligencia: 1, caracter: 2 },
    vidaActual: 10,
    fatigaActual: 10,
    fatigaTemporal: 0,
    psionica: { traslacion: 3, singularidad: 3 },
    ...patch,
  };
}

const resolver = (s: Sheet, libre = false) => resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA, libre });
const conFatiga = (s: Sheet, fraccion: number): Sheet => {
  const max = salud(s, resolver(s).modificadores).fatiga;
  return { ...s, fatigaActual: Math.floor(max * fraccion) };
};

function preparar(f: FichaResuelta, accionId: string, seleccion: Partial<SeleccionPoder> = {}) {
  const poder = poderesDeFicha(f.ficha, f.psionica).find((p) => p.accion.id === accionId)!;
  return prepararPoder({
    ficha: f.ficha,
    modificadores: f.modificadores,
    niveles: f.psionica.paraEfectos,
    poder,
    seleccion: { elecciones: {}, casillas: [], puntosCargas: 0, ...seleccion },
  })!;
}

const solo = (fuente: string, s: (typeof SOBREESFUERZO_IRM)[1]): SobreesfuerzoDeFicha => ({
  fuentes: [{ ...s, fuente }],
  dotes: { inmune: null, tabla: null, moneda: null },
});

describe("cuándo salta (es-01, au-05, ps-02)", () => {
  const casos: [string, (typeof SOBREESFUERZO_IRM)[1], number, boolean, boolean][] = [
    // fuente, nivel del poder, fatigado, salta
    ["Maolher", SOBREESFUERZO_MAOLHER, 1, false, false],
    ["Maolher", SOBREESFUERZO_MAOLHER, 2, false, true],
    ["Maolher", SOBREESFUERZO_MAOLHER, 1, true, true],
    ["Arianyi", SOBREESFUERZO_ARIANYI, 2, false, false],
    ["Arianyi", SOBREESFUERZO_ARIANYI, 3, false, true],
    ["Arianyi", SOBREESFUERZO_ARIANYI, 1, true, true],
    ["IRM 1", SOBREESFUERZO_IRM[1], 3, false, true],
    ["IRM 2", SOBREESFUERZO_IRM[2], 3, false, false],
    ["IRM 2", SOBREESFUERZO_IRM[2], 4, false, true],
    ["IRM 3", SOBREESFUERZO_IRM[3], 4, false, false],
    ["IRM 3", SOBREESFUERZO_IRM[3], 5, false, true],
    ["IRM 3", SOBREESFUERZO_IRM[3], 1, true, false],
    ["IRM 3", SOBREESFUERZO_IRM[3], 2, true, true],
    ["IRM 4", SOBREESFUERZO_IRM[4], 6, false, false],
    ["IRM 4", SOBREESFUERZO_IRM[4], 2, true, false],
    ["IRM 4", SOBREESFUERZO_IRM[4], 3, true, true],
  ];
  for (const [nombre, s, nivel, fatigado, salta] of casos) {
    test(`${nombre}, poder de nivel ${nivel}${fatigado ? ", fatigado" : ""}: ${salta ? "salta" : "no salta"}`, () => {
      assert.equal(saltaSobreesfuerzo(s, nivel, fatigado), salta);
    });
  }

  test("dificultad: Maolher 8 + nivel, Arianyi e implante 1–3 6 + nivel, implante 4 4 + nivel", () => {
    assert.equal(sobreesfuerzoDeUso(solo("M", SOBREESFUERZO_MAOLHER), 2, "normal")?.dificultad, 10);
    assert.equal(sobreesfuerzoDeUso(solo("A", SOBREESFUERZO_ARIANYI), 3, "normal")?.dificultad, 9);
    for (const n of [1, 2, 3] as const) assert.equal(sobreesfuerzoDeUso(solo("I", SOBREESFUERZO_IRM[n]), 5, "normal")?.dificultad, 11);
    assert.equal(sobreesfuerzoDeUso(solo("I", SOBREESFUERZO_IRM[4]), 3, "fatigado")?.dificultad, 7);
  });

  test("exhausto: la tabla dura (Maolher, fracaso: 1 grave y Aturdido)", () => {
    const normal = sobreesfuerzoDeUso(solo("M", SOBREESFUERZO_MAOLHER), 2, "fatigado")!;
    const exhausto = sobreesfuerzoDeUso(solo("M", SOBREESFUERZO_MAOLHER), 2, "exhausto")!;
    assert.equal(normal.umbral, "fatigado");
    assert.equal(textoResultadoSobreesfuerzo(normal.fallos.fracaso.casilla[0], 2), "1 de daño letal y Aturdido 1 turno");
    assert.equal(textoResultadoSobreesfuerzo(exhausto.fallos.fracaso.casilla[0], 2), "1 de daño grave y Aturdido 1 turno");
    assert.equal(
      textoResultadoSobreesfuerzo(exhausto.fallos.fracasoCritico.casilla[0], 3),
      "2 de daño grave y Aturdido 1 turno y Confusión 3 turnos",
    );
  });

  test("solo por estar fatigado: el nivel no llega", () => {
    assert.equal(sobreesfuerzoDeUso(solo("M", SOBREESFUERZO_MAOLHER), 1, "fatigado")?.soloPorFatiga, true);
    assert.equal(sobreesfuerzoDeUso(solo("M", SOBREESFUERZO_MAOLHER), 2, "fatigado")?.soloPorFatiga, false);
    assert.equal(sobreesfuerzoDeUso(solo("I", SOBREESFUERZO_IRM[4]), 6, "fatigado")?.soloPorFatiga, true);
  });
});

describe("dotes (ps-01, ps-03, ps-04)", () => {
  const conDotes = (s: Sheet, ...ids: string[]) => resolver({ ...s, dotes: ids.map((id) => ({ id })) }, true);

  test("Potencia, Maestría y Gran Maestría: nunca salta hasta el nivel 1, 2 o 3, ni fatigado", () => {
    const sin = resolver(ficha(MAOLHER));
    assert.ok(sobreesfuerzoDeUso(sin.sobreesfuerzo, 2, "normal"));
    const potencia = conDotes(ficha(MAOLHER), "dote_potencia_psionica");
    assert.equal(sobreesfuerzoDeUso(potencia.sobreesfuerzo, 1, "fatigado"), null);
    assert.ok(sobreesfuerzoDeUso(potencia.sobreesfuerzo, 2, "normal"));
    const maestria = conDotes(ficha(MAOLHER), "dote_potencia_psionica", "dote_maestria_psionica");
    assert.equal(sobreesfuerzoDeUso(maestria.sobreesfuerzo, 2, "exhausto"), null);
    assert.ok(sobreesfuerzoDeUso(maestria.sobreesfuerzo, 3, "normal"));
    const gran = conDotes(ficha(MAOLHER), "dote_potencia_psionica", "dote_maestria_psionica", "dote_gran_maestria_psionica");
    assert.equal(sobreesfuerzoDeUso(gran.sobreesfuerzo, 3, "fatigado"), null);
    assert.ok(sobreesfuerzoDeUso(gran.sobreesfuerzo, 4, "normal"));
  });

  test("Maestría: vale la casilla más suave entre su tabla y la del origen", () => {
    const maestria = conDotes(ficha(MAOLHER), "dote_potencia_psionica", "dote_maestria_psionica");
    const uso = sobreesfuerzoDeUso(maestria.sobreesfuerzo, 3, "normal")!;
    // Maolher, fracaso: 1 letal y Aturdido → Maestría: 1 no letal.
    assert.deepEqual(uso.fallos.fracaso, { casilla: TABLA_MAESTRIA_PSIONICA.base.fracaso, fuente: "Maestría Psiónica" });
    assert.equal(uso.fallos.fracasoCritico.fuente, "Maestría Psiónica");

    // Implante 2 exhausto, fracaso: 1 letal frente a 1 letal y Aturdido → el del implante.
    const implante = { fuentes: [{ ...SOBREESFUERZO_IRM[2], fuente: "IRM 2" }], dotes: maestria.sobreesfuerzo!.dotes };
    const exhausto = sobreesfuerzoDeUso(implante, 4, "exhausto")!;
    assert.equal(exhausto.fallos.fracaso.fuente, "IRM 2");
    // Fracaso crítico exhausto del implante 2: muerte cerebral → Maestría.
    assert.equal(exhausto.fallos.fracasoCritico.fuente, "Maestría Psiónica");
    // Implante 4, fracaso crítico: elegir Aturdido o 1 letal frente a las dos cosas → el implante.
    const cuatro = sobreesfuerzoDeUso({ ...implante, fuentes: [{ ...SOBREESFUERZO_IRM[4], fuente: "IRM 4" }] }, 3, "fatigado")!;
    assert.equal(cuatro.fallos.fracasoCritico.fuente, "IRM 4");
    assert.equal(cuatro.fallos.fracasoCritico.casilla.length, 2);
  });

  test("más suave: muerte, categoría, niveles y turnos, por ese orden", () => {
    const t = SOBREESFUERZO_IRM[1].tabla;
    assert.ok(esMasSuave(t.base.fracaso, t.exhausto.fracaso)); // letal < grave
    assert.ok(esMasSuave(t.exhausto.fracaso, t.exhausto.fracasoCritico)); // grave < muerte
    assert.ok(!esMasSuave(t.base.fracaso, t.base.fracaso));
  });

  test("Saber es Poder: moneda solo si salta por estar fatigado", () => {
    const saber = conDotes(ficha(MAOLHER), "dote_saber_es_poder");
    assert.deepEqual(sobreesfuerzoDeUso(saber.sobreesfuerzo, 1, "fatigado")?.moneda, { fuente: "Saber es Poder" });
    assert.equal(sobreesfuerzoDeUso(saber.sobreesfuerzo, 2, "fatigado")?.moneda, null, "salta también por el nivel");
    assert.equal(libraPorMoneda(1), true);
    assert.equal(libraPorMoneda(2), false);
  });
});

describe("usar un poder (ps-01)", () => {
  const impulso = (n: number) => ({ elecciones: { nivel: `n${n}` } });

  test("Maolher, Impulso a nivel 2: sobreesfuerzo de la Casa de Maolher, Voluntad 10", () => {
    const f = resolver(ficha(MAOLHER));
    const e = usarPoder(f, preparar(f, "psi_singularidad_impulso", impulso(2)));
    assert.equal(e.sobreesfuerzo?.fuente, "Casa de Maolher");
    assert.equal(e.sobreesfuerzo?.dificultad, 10);
    assert.equal(e.sobreesfuerzo?.umbral, null);
    assert.equal(usarPoder(f, preparar(f, "psi_singularidad_impulso", impulso(1))).sobreesfuerzo, null);
  });

  test("Arianyi fatigado: salta con un poder de nivel 1, solo por la fatiga", () => {
    const f = resolver(conFatiga(ficha({ especieId: "arianyi" }), 0.2));
    assert.equal(f.umbrales.fatiga, "fatigado");
    const s = usarPoder(f, preparar(f, "psi_singularidad_impulso", impulso(1))).sobreesfuerzo;
    assert.equal(s?.fuente, "Arianyi");
    assert.equal(s?.soloPorFatiga, true);
    assert.equal(s?.dificultad, 7);
  });

  test("el umbral es el de después de pagar: el gasto que te deja fatigado lo dispara", () => {
    const s0 = ficha({ especieId: "arianyi" });
    const max = salud(s0, resolver(s0).modificadores).fatiga;
    const f = resolver({ ...s0, fatigaActual: Math.floor(max * 0.25) + 1 });
    assert.equal(f.umbrales.fatiga, "normal");
    assert.equal(usarPoder(f, preparar(f, "psi_singularidad_impulso", impulso(2))).sobreesfuerzo?.umbral, "fatigado");
  });

  test("sin fuente psiónica, los poderes salen bloqueados y no hay sobreesfuerzo", () => {
    const f = resolver(ficha({ especieId: "humano" }));
    assert.equal(f.sobreesfuerzo, null);
    assert.ok(poderesDeFicha(f.ficha, f.psionica).every((p) => motivoDeBloqueo(p.habilitacion)));
  });

  test("con el implante 1, nivel 3 salta (6 + 3); prolongar Proeza no vuelve a tirarlo", () => {
    const f = resolver(ficha({ especieId: "humano", ...irm(1) }));
    assert.equal(usarPoder(f, preparar(f, "psi_singularidad_impulso", impulso(3))).sobreesfuerzo?.dificultad, 9);
    const p = preparar(f, "psi_traslacion_proeza", { elecciones: { nivel: "n3" }, pesoKg: 30 });
    assert.equal(usarPoder(f, p, "prolongar").sobreesfuerzo, null);
  });
});

describe("la salvación y el fallo", () => {
  const f = resolver(ficha(MAOLHER));
  const uso = sobreesfuerzoDeUso(f.sobreesfuerzo, 2, "normal")!;

  test("la salvación es de Voluntad, con su propio id", () => {
    const m = montarSobreesfuerzo(f);
    assert.equal(m.aplicado.id, "voluntad");
    for (const dado of [1, 6, 12]) {
      const t = tirarSobreesfuerzo(f, uso, dado);
      assert.equal(t.resultado.dificultad, 10);
      assert.equal(t.opciones.length, t.grado === "fracaso" || t.grado === "fracasoCritico" ? 1 : 0);
    }
  });

  test("el servidor lo recalcula con la ficha: nivel empleado de las elecciones y opción del grado", () => {
    const op = { poderId: "psi_singularidad_impulso", elecciones: { nivel: "n2" }, grado: "fracasoCritico" as const, opcion: 0 };
    const r = falloDeSobreesfuerzo(f, "normal", op)!;
    assert.equal(r.uso.dificultad, 10);
    const c = consecuenciaDeSobreesfuerzo(r.resultado, r.uso.nivel, r.uso.fuente);
    assert.deepEqual(c.danio, { valor: 1, categoria: "grave" });
    assert.deepEqual(c.estados, [
      { estadoId: "aturdido", gradoId: "fracaso", turnos: 1 },
      { estadoId: "confusion", gradoId: "fallo", turnos: 2 },
    ]);
    assert.equal(falloDeSobreesfuerzo(f, "normal", { ...op, elecciones: { nivel: "n1" } }), null, "a nivel 1 no salta");
    assert.equal(falloDeSobreesfuerzo(f, "normal", { ...op, grado: "exito" }), null);
    assert.equal(falloDeSobreesfuerzo(f, "normal", { ...op, opcion: 1 }), null);
    assert.equal(falloDeSobreesfuerzo(f, "normal", { ...op, poderId: "no_existe" }), null);
    // Sin fuente psiónica (humano sin implante): nada.
    assert.equal(falloDeSobreesfuerzo(resolver(ficha({ especieId: "humano" })), "normal", op), null);
  });

  test("muerte cerebral: no se aplica, se avisa", () => {
    const c = consecuenciaDeSobreesfuerzo(SOBREESFUERZO_IRM[1].tabla.exhausto.fracasoCritico[0], 3, "Implante de Resonancia Métrica 1");
    assert.equal(c.danio, undefined);
    assert.deepEqual(c.estados, []);
    assert.match(c.texto, /muerte cerebral/);
  });
});

describe("salvación de sobrecarga: Derivación Psiónica +1 (eq-27)", () => {
  test("una línea propia de la Derivación, desde el nivel 1", () => {
    const sin = montarSalvacionSobrecarga(resolver(ficha(MAOLHER)));
    const conDerivacion = (nivel: number) =>
      montarSalvacionSobrecarga(
        resolver(
          ficha({
            ...MAOLHER,
            equipo: [
              { instanciaId: "a", catalogoId: "armadura_pesada" },
              { instanciaId: "d", catalogoId: "derivacion_psionica", nivel, instaladoEnId: "a" },
            ],
          }),
        ),
      );
    assert.equal(sin.aplicado.id, "fortaleza");
    for (const nivel of [1, 4]) {
      const m = conDerivacion(nivel);
      assert.ok(m.desglose.some((l) => l.etiqueta.includes("Derivación Psiónica") && l.valor === 1), `nivel ${nivel}`);
    }
    // La salvación de Fortaleza normal no lo lleva.
    assert.ok(!resolver(ficha({ ...MAOLHER, equipo: [{ instanciaId: "a", catalogoId: "armadura_pesada" }, { instanciaId: "d", catalogoId: "derivacion_psionica", nivel: 1, instaladoEnId: "a" }] })).modificadores.some(
      (m) => m.tipo === "tirada" && m.alcance.tipo === "tiradaId" && m.alcance.id === "salv_fortaleza",
    ));
  });
});
