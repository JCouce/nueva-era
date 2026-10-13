// E5 (docs/sistema.md §14.9): peaje neurológico del Maolher al usar un poder, nota de
// fármacos del Irota y "Activar visión" del Arianyi y del Axadren.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { accionesDeFarmacos, accionesDirectasDeFarmacos } from "./farmacos";
import { resolverFicha, VITALIDAD_DE_FICHA, type FichaResuelta } from "./fichaResuelta";
import { accionesDePsionica, gradoDeTirada } from "./poderes";
import { defaultSheet, type Sheet } from "./sheet";
import { danioDePeaje, montarPeaje, prepararPoder, tirarPeaje, usarPoder, type SeleccionPoder } from "./usoPoder";
import { pagarFatiga } from "./vitalidad";

function ficha(patch: Partial<Sheet> = {}): Sheet {
  const d = defaultSheet();
  return {
    ...d,
    atributos: { fuerza: 2, agilidad: 2, aguante: 2, percepcion: 1, inteligencia: 0, caracter: 2 },
    vidaActual: 10,
    fatigaActual: 10,
    fatigaTemporal: 0,
    ...patch,
  };
}

const MAOLHER: Partial<Sheet> = { especieId: "manduk", especieOpciones: { casta: "noble", linaje: "maolher" } };
const IROTA: Partial<Sheet> = { especieId: "manduk", especieOpciones: { casta: "noble", linaje: "irota" } };
const AXADREN: Partial<Sheet> = { especieId: "manduk", especieOpciones: { casta: "noble", linaje: "axadren" } };

const resolver = (s: Sheet, libre = false) => resolverFicha(s, { estadosCombate: [], vitalidad: VITALIDAD_DE_FICHA, libre });

function preparar(f: FichaResuelta, accionId: string, seleccion: Partial<SeleccionPoder> = {}) {
  const poder = accionesDePsionica(f.ficha, f.psionica.paraEfectos).find((p) => p.accion.id === accionId)!;
  return prepararPoder({
    ficha: f.ficha,
    modificadores: f.modificadores,
    niveles: f.psionica.paraEfectos,
    poder,
    seleccion: { elecciones: {}, casillas: [], puntosCargas: 0, ...seleccion },
  })!;
}

const SINGULARIDAD_3 = { psionica: { traslacion: 3, singularidad: 3 } };
const IMPULSO_3 = { elecciones: { nivel: "n3" } };

describe("Maolher: peaje neurológico al usar un poder", () => {
  const maolher = resolver(ficha({ ...MAOLHER, ...SINGULARIDAD_3 }));

  test("paga 3 de fatiga: peaje con dificultad 5 + nivel empleado y 3 puntos", () => {
    const p = preparar(maolher, "psi_singularidad_impulso", IMPULSO_3);
    assert.equal(p.coste?.total, 3);
    assert.equal(p.resuelto.nivelEmpleado, 3);
    assert.deepEqual(usarPoder(maolher, p).peaje, { dificultad: 8, puntos: 3 });
  });

  test("el nivel empleado manda, no el poseído", () => {
    const p = preparar(maolher, "psi_singularidad_impulso", { elecciones: { nivel: "n1" } });
    assert.deepEqual(usarPoder(maolher, p).peaje, { dificultad: 6, puntos: p.coste!.total });
  });

  test("sin Maolher, peaje null", () => {
    const humano = resolver(ficha({ especieId: "humano", ...SINGULARIDAD_3 }));
    assert.equal(humano.peajeNeurologico, null);
    assert.equal(usarPoder(humano, preparar(humano, "psi_singularidad_impulso", IMPULSO_3)).peaje, null);
  });

  describe("con cargas de Derivación", () => {
    const conDerivacion = resolver(
      ficha({
        ...MAOLHER,
        ...SINGULARIDAD_3,
        equipo: [{ instanciaId: "der1", catalogoId: "derivacion_psionica", nivel: 4 }],
        recursos: [{ instanciaId: "der1", actual: 10, max: 10 }],
      }),
    );

    test("todo pagado con cargas: sin peaje", () => {
      const p = preparar(conDerivacion, "psi_singularidad_impulso", { ...IMPULSO_3, puntosCargas: 3 });
      assert.equal(p.coste?.total, 0);
      assert.equal(usarPoder(conDerivacion, p).peaje, null);
    });

    test("parte con cargas: peaje por lo pagado en fatiga", () => {
      const p = preparar(conDerivacion, "psi_singularidad_impulso", { ...IMPULSO_3, puntosCargas: 1 });
      assert.equal(p.coste?.total, 2);
      assert.deepEqual(usarPoder(conDerivacion, p).peaje, { dificultad: 8, puntos: 2 });
    });
  });

  test("prolongar un turno de Proeza: peaje por el extra, con el nivel empleado", () => {
    // Perspicacia 1 (Inteligencia 0 + 1 de Maolher, Percepción 1): nivel 1 carga 25 kg.
    const f = resolver(ficha({ ...MAOLHER, psionica: { traslacion: 3 } }));
    const p = preparar(f, "psi_traslacion_proeza", { elecciones: { nivel: "n1" }, pesoKg: 30 });
    assert.ok(p.extraProrroga > 0);
    assert.deepEqual(usarPoder(f, p, "prolongar").peaje, { dificultad: 6, puntos: p.extraProrroga });
    // El uso entero también, con la parte que va a fatiga temporal incluida.
    const uso = usarPoder(f, p);
    assert.deepEqual(uso.peaje, { dificultad: 6, puntos: uso.fatiga.pagar });
  });

  test("NPC en modo libre: también lo paga (es efecto, no creación)", () => {
    const npc = resolver(ficha({ ...MAOLHER, ...SINGULARIDAD_3 }), true);
    assert.deepEqual(npc.peajeNeurologico, { dificultadBase: 5, fuente: "Casa de Maolher" });
    assert.deepEqual(usarPoder(npc, preparar(npc, "psi_singularidad_impulso", IMPULSO_3)).peaje, { dificultad: 8, puntos: 3 });
  });
});

describe("Maolher: resolución del peaje", () => {
  test("éxito o crítico: nada", () => {
    assert.deepEqual(danioDePeaje(3, "exito"), { danio: 0, categoria: null, aviso: null });
    assert.deepEqual(danioDePeaje(3, "critico"), { danio: 0, categoria: null, aviso: null });
  });

  test("fracaso: 3 niveles no letales", () => {
    assert.deepEqual(danioDePeaje(3, "fracaso"), {
      danio: 3,
      categoria: "no letal",
      aviso: "Peaje neurológico: recibes 3 de daño no letal.",
    });
  });

  test("fracaso crítico: 3 niveles letales", () => {
    assert.deepEqual(danioDePeaje(3, "fracasoCritico"), {
      danio: 3,
      categoria: "letal",
      aviso: "Peaje neurológico: recibes 3 de daño letal.",
    });
  });

  test("tirarPeaje: el daño sale del grado de la Salvación de Fortaleza contra la dificultad", () => {
    const f = resolver(ficha(MAOLHER));
    for (const dado of [1, 6, 12]) {
      const t = tirarPeaje(f, { dificultad: 8, puntos: 3 }, dado);
      assert.equal(t.resultado.dificultad, 8);
      const { resultado, ...danio } = t;
      assert.deepEqual(danio, danioDePeaje(3, gradoDeTirada(resultado)!));
    }
  });

  test("la tirada del peaje es la Salvación de Fortaleza con los umbrales: −1 de Herido", () => {
    const sano = montarPeaje(resolver(ficha(MAOLHER)));
    const herido = montarPeaje(resolver(ficha({ ...MAOLHER, vidaActual: 4 })));
    assert.equal(herido.aplicado.id, "fortaleza");
    assert.equal(herido.modificador, sano.modificador - 1);
    assert.ok(herido.desglose.some((l) => l.etiqueta === "Herido" && l.valor === -1));
  });
});

describe("Irota: fármacos a la mitad (nota fija)", () => {
  const NOTA = "Irota: efectos a la mitad (duración, modificadores, vida y fatiga), hacia abajo, mínimo 1.";
  const farmacos = { farmaco_gel_sanador: 1, farmaco_analgesico: 1 };

  test("con el rasgo, la nota sale en la tirada de usar fármaco y en la fila sin dado", () => {
    const f = resolver(ficha({ ...IROTA, farmacos }));
    assert.deepEqual(f.notasFarmacos, [NOTA]);
    const [conDado] = accionesDeFarmacos(f.ficha, f.notasFarmacos);
    const [sinDado] = accionesDirectasDeFarmacos(f.ficha, f.notasFarmacos);
    assert.ok(conDado.nota?.endsWith(NOTA));
    assert.ok(sinDado.nota?.endsWith(NOTA));
  });

  test("sin el rasgo, ni rastro", () => {
    for (const s of [ficha({ ...MAOLHER, farmacos }), ficha({ especieId: "humano", farmacos })]) {
      const f = resolver(s);
      assert.deepEqual(f.notasFarmacos, []);
      assert.ok(accionesDeFarmacos(f.ficha, f.notasFarmacos).every((a) => !a.nota?.includes("Irota")));
    }
  });
});

describe("Activar visión (Arianyi y Axadren)", () => {
  test("solo con su rasgo", () => {
    for (const s of [ficha({ especieId: "humano" }), ficha(MAOLHER), ficha({ especieId: "arkoru" })]) {
      assert.deepEqual(resolver(s).accionesEspecie, []);
    }
    for (const s of [ficha({ especieId: "arianyi" }), ficha(AXADREN)]) {
      const acciones = resolver(s).accionesEspecie;
      assert.equal(acciones.length, 1);
      assert.equal(acciones[0].label, "Activar visión");
      assert.equal(acciones[0].grupo, "Acciones");
      assert.match(acciones[0].nota ?? "", /calor y las huellas químicas o eléctricas/);
    }
  });

  test("Arianyi cobra 1 de fatiga (la primera hora); Axadren, nada", () => {
    const arianyi = resolver(ficha({ especieId: "arianyi" }));
    const [vision] = arianyi.accionesEspecie;
    assert.equal(vision.costeFatiga, 1);
    assert.match(vision.nota ?? "", /cada hora más, 1 punto a mano/);
    assert.equal(pagarFatiga(arianyi.ficha, vision.costeFatiga!, false).fatigaActual, 9);

    const [axadren] = resolver(ficha(AXADREN)).accionesEspecie;
    assert.equal(axadren.costeFatiga, undefined);
  });

  test("también al NPC en modo libre (es derivado)", () => {
    assert.equal(resolver(ficha({ especieId: "arianyi" }), true).accionesEspecie.length, 1);
  });
});
