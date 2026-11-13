import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { equipar } from "./equipo";
import { ajustarMunicionEspecial } from "./recursos";
import { accionesDeAtaque as accionesDeAtaqueCon } from "./combate";
import { modificadoresActivos } from "./derivados";
import { permisosDeDotes } from "./dotesEfectos";
import { efectosQueSaltan, efectosSobreObjetivo, type EfectoEnTirada } from "./efectosArma";
import type { EstadoCondiciones } from "./condiciones";

const ataques = (s: Sheet) => accionesDeAtaqueCon(s, modificadoresActivos(s), permisosDeDotes(s));
const fila = (catalogoId: string, s: Sheet = defaultSheet()) =>
  ataques(equipar(s, { instanciaId: "a1", catalogoId })).find((t) => t.id === "ataque_fuego_a1" || t.id === "ataque_melee_a1")!;

const ACIERTA = { exito: true, critico: false, dificultad: 7 };
const CRITICO = { exito: true, critico: true, dificultad: 7 };
const FALLA = { exito: false, critico: false, dificultad: 7 };
const SIN_DIFICULTAD = { exito: null, critico: false, dificultad: null };

function corto(e: EfectoEnTirada): string {
  if (e.tipo === "texto") return e.texto;
  if (e.tipo === "salvacion") return `${e.estadoId} ${e.dificultad}`;
  if (e.tipo === "ajusteSalvacion") return `ajuste ${e.contra}`;
  return e.etiqueta ?? e.estadoId;
}
const saltan = (t: Parameters<typeof efectosQueSaltan>[0], estado: EstadoCondiciones, r: typeof ACIERTA | typeof SIN_DIFICULTAD) =>
  efectosQueSaltan(t, estado, r).map(corto);

describe("cuándo salta un efecto (eq-03, eq-04)", () => {
  // Rayo Ligero: «Efecto Shock (5) · Crítico de Shock (12)».
  test("con el acierto, el normal; en crítico, solo el del crítico", () => {
    const t = fila("pistola_rayo_ligero");
    assert.deepEqual(saltan(t, {}, ACIERTA), ["shock 5"]);
    assert.deepEqual(saltan(t, {}, CRITICO), ["shock 12"]);
  });

  test("sin acierto o sin dificultad elegida, nada", () => {
    const t = fila("pistola_rayo_ligero");
    assert.deepEqual(saltan(t, {}, FALLA), []);
    assert.deepEqual(saltan(t, {}, SIN_DIFICULTAD), []);
  });

  // Plasma SD: «Efecto Shock y Llamarada (7) · Crítico de Fusión (11)» → dos salvaciones (eq-06).
  test("Shock y Llamarada son dos salvaciones; el crítico de Fusión, de otro estado, se suma", () => {
    const t = fila("pistola_plasma_sd");
    assert.deepEqual(saltan(t, {}, ACIERTA), ["shock 7", "llamarada 7"]);
    assert.deepEqual(saltan(t, {}, CRITICO), ["shock 7", "llamarada 7", "fusion 11"]);
  });

  // Un arma con solo crítico (Bellum, Aturdimiento 8): nada al acertar, el crítico en crítico.
  test("un arma con solo crítico no avisa de nada en un acierto normal", () => {
    const t = fila("pistola_bellum");
    assert.deepEqual(saltan(t, {}, ACIERTA), []);
    assert.deepEqual(saltan(t, {}, CRITICO), ["aturdido 8"]);
  });
});

describe("por modo y por tramo (eq-09, eq-10)", () => {
  test("Guantelete de Pistón: en Estándar, Aturdimiento; en Compleja, Aturdimiento y Derribo", () => {
    const t = fila("mecanica_guantelete_piston");
    const compleja = t.ataque!.modos.find((m) => m.etiqueta === "Compleja")!.id;
    assert.deepEqual(saltan(t, { modo: t.ataque!.modos[0].id }, ACIERTA), ["aturdido 6"]);
    assert.deepEqual(saltan(t, { modo: compleja }, ACIERTA), ["aturdido 6", "derribado 8"]);
    // El crítico sustituye solo al Aturdimiento; el Derribo de la Compleja sigue.
    assert.deepEqual(saltan(t, { modo: compleja }, CRITICO), ["aturdido 10", "derribado 8"]);
  });

  test("Ariete: Derribo 6 en Estándar y 10 en Compleja", () => {
    const t = fila("mecanica_ariete_percusivo");
    const [estandar, compleja] = t.ataque!.modos.map((m) => m.id);
    assert.deepEqual(saltan(t, { modo: estandar }, ACIERTA), ["derribado 6"]);
    assert.deepEqual(saltan(t, { modo: compleja }, ACIERTA), ["derribado 10"]);
  });

  test("Kerzul: Derribo y Aturdimiento, sin modo (Maza)", () => {
    const t = fila("kerzul_maza");
    assert.deepEqual(saltan(t, { modo: t.ataque!.modos[0].id }, ACIERTA), ["derribado 11", "aturdido 9"]);
    // Su crítico es Impacto Estructural (texto): se suma, no quita nada.
    assert.equal(saltan(t, { modo: t.ataque!.modos[0].id }, CRITICO).length, 3);
  });

  test("escopeta: Derribo solo en corta y a bocajarro", () => {
    const t = fila("escopeta_feritas");
    assert.deepEqual(saltan(t, { tramo: "corta" }, ACIERTA), ["derribado 9"]);
    assert.deepEqual(saltan(t, { tramo: "bocajarro" }, ACIERTA), ["derribado 9"]);
    assert.deepEqual(saltan(t, { tramo: "media" }, ACIERTA), []);
  });
});

describe("munición especial (eq-05, eq-21)", () => {
  function conMunicion(tipo: string): Sheet {
    let s = equipar(defaultSheet(), { instanciaId: "a1", catalogoId: "pistola_sydiasi" });
    s = equipar(s, { instanciaId: "ad", catalogoId: `municion_especial_${tipo}`, nivel: 1, instaladoEnId: "a1" });
    return ajustarMunicionEspecial(s, tipo, 10);
  }
  const disparo = (tipo: string) => ataques(conMunicion(tipo)).find((t) => t.id === "ataque_fuego_a1")!;

  test("Incendiaria: Llamarada al acertar; en crítico, además el del arma y Ceguera", () => {
    const t = disparo("incendiaria");
    assert.deepEqual(saltan(t, { municion: "incendiaria" }, ACIERTA), ["llamarada 7"]);
    assert.deepEqual(saltan(t, { municion: "incendiaria" }, CRITICO), ["aturdido 8", "llamarada 7", "ceguera 10"]);
    assert.deepEqual(saltan(t, { municion: "normal" }, ACIERTA), []);
  });

  test("Criogénica (sin crítico propio): su Congelación sigue en crítico, junto al del arma", () => {
    const t = disparo("criogenica");
    assert.deepEqual(saltan(t, { municion: "criogenica" }, CRITICO), ["aturdido 8", "congelacion 7"]);
  });

  test("Perforante: su crítico sustituye al del arma", () => {
    const t = disparo("perforante");
    assert.deepEqual(saltan(t, { municion: "perforante" }, CRITICO), ["Consume 1 punto de blindaje del objetivo"]);
  });

  test("Tóxica: tabla propia, con el estado que pone cada grado", () => {
    const [aviso] = efectosSobreObjetivo(disparo("toxica"), { municion: "toxica" }, ACIERTA, () => 1);
    assert.equal(aviso.titulo, "El objetivo salva Fortaleza contra Envenenamiento, dificultad 7");
    assert.deepEqual(
      aviso.grados.map((g) => [g.label, g.estado?.estadoId, g.estado?.gradoId]),
      [
        ["Fracaso crítico", "envenenamiento", "nivel_2"],
        ["Fracaso", "envenenamiento", "nivel_1"],
        ["Éxito", "dosis_acumulada", "activo"],
        ["Éxito crítico", undefined, undefined],
      ],
    );
  });

  test("Radiactiva: Enfermedad 1 o 2", () => {
    const [aviso] = efectosSobreObjetivo(disparo("radiactiva"), { municion: "radiactiva" }, ACIERTA, () => 1);
    assert.deepEqual(aviso.grados.slice(0, 2).map((g) => g.estado), [
      { estadoId: "enfermedad", gradoId: "nivel_2" },
      { estadoId: "enfermedad", gradoId: "nivel_1" },
    ]);
    assert.match(aviso.grados[0].texto, /daño grave/);
  });

  test("Supresora: salvación contra los Supresores, solo si el golpe hace daño", () => {
    const [aviso] = efectosSobreObjetivo(disparo("supresora"), { municion: "supresora" }, ACIERTA, () => 1);
    assert.equal(aviso.titulo, "El objetivo salva Fortaleza contra Supresores, dificultad 8");
    assert.ok(aviso.notas.includes("Solo si el golpe le hace daño (tras el blindaje)."));
    assert.deepEqual(aviso.grados[1].estado, { estadoId: "supresores", gradoId: "fracaso" });
  });
});

describe("el aviso (eq-01, eq-07, eq-08)", () => {
  test("salvación con los grados del catálogo de estados", () => {
    const [aviso] = efectosSobreObjetivo(fila("pistola_rayo_ligero"), {}, ACIERTA, () => 1);
    assert.equal(aviso.titulo, "El objetivo salva Fortaleza contra Shock, dificultad 5");
    assert.deepEqual(aviso.salvacion, { etiqueta: "Fortaleza", tiradaId: "salv_fortaleza", dificultad: 5 });
    assert.equal(aviso.fuente, "Rayo Ligero");
    assert.equal(aviso.enCritico, false);
    assert.deepEqual(aviso.grados.map((g) => g.label), ["Fracaso crítico", "Fracaso", "Éxito", "Éxito crítico"]);
  });

  test("Derribo: salva con «Saltar, levantarse»", () => {
    const [aviso] = efectosSobreObjetivo(fila("escopeta_feritas"), { tramo: "corta" }, ACIERTA, () => 1);
    assert.equal(aviso.titulo, "El objetivo salva Saltar, levantarse (Potencia + Atletismo) contra Derribado, dificultad 9");
    assert.equal(aviso.salvacion?.tiradaId, "atletismo");
  });

  test("Llamarada se salva con Reflejos", () => {
    const avisos = efectosSobreObjetivo(fila("pistola_plasma_sd"), {}, ACIERTA, () => 1);
    assert.equal(avisos[1].titulo, "El objetivo salva Reflejos contra Llamarada, dificultad 7");
  });

  test("Hemorragia (1d6 turnos): la app tira la duración al avisar", () => {
    const tiradas: number[] = [];
    const [aviso] = efectosSobreObjetivo(fila("espada_cuchillo_combate", defaultSheet()), {}, CRITICO, (caras) => {
      tiradas.push(caras);
      return 4;
    });
    assert.deepEqual(tiradas, [6]);
    assert.equal(aviso.titulo, "El objetivo sufre Hemorragia durante 4 turnos (1d6)");
    assert.equal(aviso.duracion?.turnos, 4);
    assert.equal(aviso.enCritico, true);
    assert.equal(aviso.salvacion, undefined);
  });

  test("Hemorragia 1 turno y Exanguinante (sin duración)", () => {
    const t = fila("mecanica_hoja_dentada");
    const [normal] = efectosSobreObjetivo(t, {}, ACIERTA, () => 9);
    assert.equal(normal.titulo, "El objetivo sufre Hemorragia durante 1 turno");
    const [exanguinante] = efectosSobreObjetivo(t, {}, CRITICO, () => 9);
    assert.equal(exanguinante.duracion?.turnos, null);
    assert.match(exanguinante.titulo, /^El objetivo sufre Hemorragia Exanguinante: no cesa hasta recibir sanación/);
  });

  test("Látigo: el crítico es texto (lo decide el máster, eq-11)", () => {
    const [aviso] = efectosSobreObjetivo(fila("flagelo_latigo"), {}, CRITICO, () => 1);
    assert.equal(aviso.estadoId, null);
    assert.match(aviso.titulo, /^Derribado o Entorpecido, dificultad 10: el máster elige/);
  });
});
