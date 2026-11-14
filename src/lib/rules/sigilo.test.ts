import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { equipar } from "./equipo";
import { ajustarRecurso } from "./recursos";
import { ACCIONES, CONDICION_MOVIMIENTO_OCULTO, ID_ARMA_A_ESCONDER, ID_EN_COMPARTIMENTO, ID_MOVIMIENTO_OCULTO, ID_SIGILO, ID_TENGO_COBERTURA, type Accion } from "./acciones";
import { accionesDeAtaque, accionesDirectasDeAtaque } from "./combate";
import { accionesDeHerramientas } from "./herramientas";
import { modificadoresActivos } from "./derivados";
import { permisosDeDotes } from "./dotesEfectos";
import { conExtrasDeFicha, estadosParaPintar, resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";
import { montarTirada, eleccionSinTocar } from "./montaje";
import { estadoInicial } from "./condiciones";
import { leerEstados } from "./estadosFicha";
import { describirEstadosActivos, type EstadoActivo } from "./estados";
import {
  accionEsconderArma,
  estadoPorTirada,
  estadoPorUso,
  ocultacionDeFicha,
  sigiloTrasAtacar,
  textoEstadoPuesto,
  textoSigiloPorSentido,
  seTiraSinDificultad,
} from "./sigilo";
import {
  ESTADO_ARMA_ESCONDIDA_ID,
  ESTADO_CAMUFLAJE_ID,
  ESTADO_DISFRAZADO_ID,
  ESTADO_SIGILO_ID,
  estadoPorId,
  loQuitaElJugador,
  TURNOS_DISFRAZ,
} from "../catalog/estados";
import { SELECTORES_DE_TIRADA } from "../catalog/dotesDestinos";

const sigiloCon = (valor: number): EstadoActivo => ({ estadoId: ESTADO_SIGILO_ID, gradoId: "activo", rondasRestantes: null, valor });
const camuflado = (modo: "estatico" | "dinamico"): EstadoActivo => ({ estadoId: ESTADO_CAMUFLAJE_ID, gradoId: modo, rondasRestantes: 10 });
const conCamuflaje = (nivel: number, s: Sheet = defaultSheet()) =>
  equipar(equipar(s, { instanciaId: "a1", catalogoId: "armadura_pesada" }), {
    instanciaId: "cam",
    catalogoId: "camuflaje_trifasico",
    nivel,
    instaladoEnId: "a1",
  });
const sigilo = () => ACCIONES.find((a) => a.id === ID_SIGILO)!;

describe("estado con número (T4)", () => {
  test("leerEstados guarda valor y nota; descarta lo que no encaja", () => {
    const [bien] = leerEstados([{ estadoId: "arma_escondida", gradoId: "activo", rondasRestantes: null, valor: 12, nota: "Mosquito" }]);
    assert.equal(bien.valor, 12);
    assert.equal(bien.nota, "Mosquito");
    const [mal] = leerEstados([{ estadoId: "sigilo", gradoId: "activo", rondasRestantes: null, valor: 3.5, nota: 7 }]);
    assert.equal(mal.valor, undefined);
    assert.equal(mal.nota, undefined);
  });

  test("el chip enseña el número con su etiqueta y la nota", () => {
    const [d] = describirEstadosActivos([{ estadoId: ESTADO_ARMA_ESCONDIDA_ID, gradoId: "activo", rondasRestantes: null, valor: 12, nota: "Mosquito" }]);
    assert.equal(d.valorTexto, "dificultad 12 · Mosquito");
    assert.equal(d.label, "Arma escondida dificultad 12 · Mosquito");
    assert.equal(d.quitarJugador, "Sacar el arma");
  });

  test("los de ocultación los quita el jugador; los del máster, no", () => {
    for (const id of [ESTADO_SIGILO_ID, ESTADO_CAMUFLAJE_ID, ESTADO_ARMA_ESCONDIDA_ID, ESTADO_DISFRAZADO_ID]) assert.ok(loQuitaElJugador(id), id);
    assert.ok(!loQuitaElJugador("aturdido"));
  });

  test("los ids que repiten otros sitios coinciden", () => {
    assert.equal(sigilo().estadoAlTirar?.estadoId, ESTADO_SIGILO_ID);
    assert.deepEqual(estadoPorId(ESTADO_CAMUFLAJE_ID)?.marcaCasillas, [ID_TENGO_COBERTURA]);
    const mov = CONDICION_MOVIMIENTO_OCULTO.tipo === "opcion" ? CONDICION_MOVIMIENTO_OCULTO.opciones.map((o) => o.id) : [];
    assert.deepEqual(SELECTORES_DE_TIRADA[ID_MOVIMIENTO_OCULTO].opciones, mov);
  });
});

describe("tirar Sigilo (eq-25, di-09, do-01)", () => {
  const f = resolverFicha(defaultSheet(), { estados: [], vitalidad: VITALIDAD_DE_FICHA });
  const t = conExtrasDeFicha(f, sigilo());
  const mod = (estado: Record<string, string | boolean>) =>
    montarTirada(f, t, { ...eleccionSinTocar(t), estadoCondiciones: { ...estadoInicial(t.condiciones ?? []), ...estado } }).modificador;

  test("moverse escondido penaliza: mitad −2, total −4, esprint −8; observado, −6", () => {
    const quieto = mod({});
    assert.equal(mod({ [ID_MOVIMIENTO_OCULTO]: "mitad" }) - quieto, -2);
    assert.equal(mod({ [ID_MOVIMIENTO_OCULTO]: "total" }) - quieto, -4);
    assert.equal(mod({ [ID_MOVIMIENTO_OCULTO]: "esprint" }) - quieto, -8);
    assert.equal(mod({ escondes_observado: true }) - quieto, -6);
  });

  test("el total queda como «Sigilo» sin duración; tirar otra vez lo sustituye (mismo id); con 0 o menos, nada", () => {
    const e = estadoPorTirada(sigilo(), 14, null)!;
    assert.deepEqual(e, { estadoId: ESTADO_SIGILO_ID, gradoId: "activo", rondasRestantes: null, valor: 14 });
    assert.equal(textoEstadoPuesto(e), "Sigilo: 14.");
    assert.equal(estadoPorTirada(sigilo(), 0, null), null);
  });
});

describe("atacar estando en Sigilo (di-09)", () => {
  const disparo = (s: Sheet, label: string) =>
    accionesDeAtaque(s, modificadoresActivos(s), permisosDeDotes(s)).find((a) => a.label === label)!;
  const conArma = (catalogoId: string) => equipar(defaultSheet(), { instanciaId: "arma", catalogoId });

  test("disparar resta 6; con silenciador, 2", () => {
    const s = conArma("fusil_asalto_impetus");
    const tras = sigiloTrasAtacar([sigiloCon(14)], disparo(s, "Disparar con Impetus").sigiloAlAtacar)!;
    assert.deepEqual(tras.op, { tipo: "poner", estado: sigiloCon(8) });
    assert.match(tras.mensaje, /^Sigilo 14 → 8 \(−6: 6 de ruido\)\.$/);
    const conSil = equipar(s, { instanciaId: "sil", catalogoId: "silenciador", nivel: 1, instaladoEnId: "arma" });
    const tras2 = sigiloTrasAtacar([sigiloCon(14)], disparo(conSil, "Disparar con Impetus").sigiloAlAtacar)!;
    assert.equal(tras2.op.tipo === "poner" && tras2.op.estado.valor, 12);
  });

  test("a 0 o menos se quita: «Ya no estás en sigilo»", () => {
    const s = conArma("pistola_rayo_ligero");
    const tras = sigiloTrasAtacar([sigiloCon(12)], disparo(s, "Disparar con Rayo Ligero").sigiloAlAtacar)!;
    assert.deepEqual(tras.op, { tipo: "quitar", estadoId: ESTADO_SIGILO_ID });
    assert.match(tras.mensaje, /^Ya no estás en sigilo/);
  });

  test("el cuerpo a cuerpo no resta; sin Sigilo no pasa nada", () => {
    const s = conArma("espada");
    const golpe = disparo(s, "Golpear con Espada");
    assert.equal(golpe.sigiloAlAtacar, undefined);
    assert.equal(sigiloTrasAtacar([sigiloCon(10)], golpe.sigiloAlAtacar), null);
    assert.equal(sigiloTrasAtacar([], disparo(conArma("fusil_asalto_impetus"), "Disparar con Impetus").sigiloAlAtacar), null);
  });
});

describe("Camuflaje Trifásico (eq-25, eq-26)", () => {
  test("«Activar» pone Camuflaje con el modo y la duración de su nivel", () => {
    const a = accionesDirectasDeAtaque(conCamuflaje(1)).find((x) => x.id === "activar_camuflaje_cam")!;
    assert.deepEqual(estadoPorUso(a, "estatico"), { estadoId: ESTADO_CAMUFLAJE_ID, gradoId: "estatico", rondasRestantes: 100 });
    assert.deepEqual(estadoPorUso(a, "dinamico"), { estadoId: ESTADO_CAMUFLAJE_ID, gradoId: "dinamico", rondasRestantes: 5 });
    assert.equal(estadoPorUso(a, "otro"), null);
  });

  test("duración por nivel (sync Drive 2026-11-14): 10/20/30 min y 1 h en estático; 5/10/15/20 turnos en dinámico", () => {
    const esperado: [1 | 2 | 3 | 4, number, number][] = [[1, 100, 5], [2, 200, 10], [3, 300, 15], [4, 600, 20]];
    for (const [nivel, estatico, dinamico] of esperado) {
      const a = accionesDirectasDeAtaque(conCamuflaje(nivel)).find((x) => x.id === "activar_camuflaje_cam")!;
      assert.equal(estadoPorUso(a, "estatico")?.rondasRestantes, estatico, `nivel ${nivel} estático`);
      assert.equal(estadoPorUso(a, "dinamico")?.rondasRestantes, dinamico, `nivel ${nivel} dinámico`);
    }
  });

  test("su cobertura se suma por sentido al Sigilo: activo; si no, la pasiva con carga", () => {
    const s = conCamuflaje(1);
    assert.equal(textoSigiloPorSentido(14, ocultacionDeFicha(s, [camuflado("estatico")])), "14 · visual 17 · térmica 17 · acústica 18");
    assert.equal(textoSigiloPorSentido(14, ocultacionDeFicha(s, [])), "14 · visual 14 · térmica 15 · acústica 15");
    assert.equal(textoSigiloPorSentido(14, ocultacionDeFicha(ajustarRecurso(s, "cam", -10), [])), "14");
    assert.equal(textoSigiloPorSentido(14, null), "14");
  });

  test("en la ficha: el chip de Sigilo por sentido y el de Camuflaje con su nivel", () => {
    const f = resolverFicha(conCamuflaje(2), { estados: [sigiloCon(14), camuflado("dinamico")], vitalidad: VITALIDAD_DE_FICHA });
    const chips = estadosParaPintar(f);
    assert.equal(chips.find((e) => e.estadoId === ESTADO_SIGILO_ID)?.valorTexto, "14 · visual 16 · térmica 15 · acústica 16");
    assert.equal(chips.find((e) => e.estadoId === ESTADO_CAMUFLAJE_ID)?.valorTexto, "nivel 2");
  });

  test("activo, la esquiva sale con «Tengo cobertura» marcada (+2); sin él, no", () => {
    const defensa = ACCIONES.find((a) => a.id === "defensa")!;
    const marcada = (estados: EstadoActivo[]) => {
      const f = resolverFicha(conCamuflaje(1), { estados, vitalidad: VITALIDAD_DE_FICHA });
      return estadoInicial(conExtrasDeFicha(f, defensa).condiciones ?? [])[ID_TENGO_COBERTURA];
    };
    assert.equal(marcada([camuflado("estatico")]), true);
    assert.equal(marcada([]), false);
  });
});

describe("Esconder arma (eq-30, eq-31)", () => {
  const opciones = (t: Accion) => {
    const c = t.condiciones!.find((x) => x.id === ID_ARMA_A_ESCONDER);
    return c?.tipo === "opcion" ? c.opciones.map((o) => [o.etiqueta, o.valor]) : [];
  };

  test("sin nada que esconder no hay fila", () => {
    assert.equal(accionEsconderArma(defaultSheet()), null);
    assert.equal(accionEsconderArma(equipar(defaultSheet(), { instanciaId: "f", catalogoId: "fusil_asalto_impetus" })), null);
  });

  test("tus armas de una mano, con el +2 del Mosquito en su opción; Reflejos + Sigilo con Juego de Manos", () => {
    let s = equipar(defaultSheet(), { instanciaId: "m", catalogoId: "pistola_mosquito" });
    s = equipar(s, { instanciaId: "c", catalogoId: "espada_cuchillo_combate" });
    s = equipar(s, { instanciaId: "f", catalogoId: "fusil_asalto_impetus" });
    s = equipar(s, { instanciaId: "p", catalogoId: "pelea_punetazo" });
    s = equipar(s, { instanciaId: "r", catalogoId: "escudo_rodela" });
    const t = accionEsconderArma(s)!;
    assert.deepEqual([t.aplicado, t.habilidad, t.especialidadesAccion], ["reflejos", "sigilo", ["juego_de_manos"]]);
    assert.deepEqual(opciones(t), [["Mosquito", 2], ["Cuchillo de Combate", 0]]);
    const e = estadoPorTirada(t, 12, "m")!;
    assert.deepEqual(e, { estadoId: ESTADO_ARMA_ESCONDIDA_ID, gradoId: "activo", rondasRestantes: null, valor: 12, nota: "Mosquito" });
  });

  test("Compartimento Oculto: casilla +3 (nivel 2, +4) y otro objeto", () => {
    const con = (nivel: number) =>
      accionEsconderArma(
        equipar(equipar(defaultSheet(), { instanciaId: "a1", catalogoId: "armadura_pesada" }), {
          instanciaId: "co",
          catalogoId: "compartimento_oculto",
          nivel,
          instaladoEnId: "a1",
        }),
      )!;
    const casilla = (t: Accion) => t.condiciones!.find((c) => c.id === ID_EN_COMPARTIMENTO);
    assert.deepEqual(opciones(con(1)), [["Otro objeto", 0]]);
    const c1 = casilla(con(1));
    const c2 = casilla(con(2));
    assert.equal(c1?.tipo === "toggle" && c1.valorActivo, 3);
    assert.equal(c2?.tipo === "toggle" && c2.valorActivo, 4);
  });
});

describe("Disfraz Holográfico (eq-33)", () => {
  test("su tirada deja «Disfrazado» con el total, 1 hora (600 turnos)", () => {
    const t = accionesDeHerramientas(equipar(defaultSheet(), { instanciaId: "d", catalogoId: "disfraz_holografico", nivel: 2 }))[0];
    assert.deepEqual(estadoPorTirada(t, 11, null), {
      estadoId: ESTADO_DISFRAZADO_ID,
      gradoId: "activo",
      rondasRestantes: TURNOS_DISFRAZ,
      valor: 11,
    });
    assert.equal(TURNOS_DISFRAZ, 600);
  });
});

describe("tiradas que guardan tu total", () => {
  test("se tiran sin dificultad: el número es tuyo y lo compara el máster", () => {
    assert.equal(seTiraSinDificultad({ estadoAlTirar: { estadoId: "sigilo" } }), true);
    assert.equal(seTiraSinDificultad({}), false);
  });
});
