// Costes de creación y progresión por especie (docs/sistema.md §14.6, tanda E2a).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { HABILIDADES, type HabilidadId } from "./habilidades";
import { costeHabilidad, puntosHabilidadesGastados, setHabilidadValue, addEspecialidad, setPrioridad } from "./creacion";
import { costeDisciplina, puntosPsionicaGastados, setDisciplinaValue, nivelDisciplina } from "./psionica";
import { AJUSTE_NEUTRO, costeSiguienteNivel, costeSubidaXp, type AjusteCoste } from "./progresion";
import { ajustesDeCoste, bolsaDeAumentos, especieDeFicha } from "./especie";
import { resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";
import { experienciaInvertida } from "./npc";
import { avisosParaEnviar } from "./revision";
import { DISCIPLINAS } from "../catalog/psionica";
import { ESPECIES } from "../catalog/especies";
import { SIN_BONOS_DISCIPLINA } from "./psionica";

const ficha = (especieId: string | null, casta?: string, linaje?: string): Sheet => ({
  ...defaultSheet(),
  especieId,
  especieOpciones: { ...(casta ? { casta } : {}), ...(linaje ? { linaje } : {}) },
});
const ajusteDe = (especieId: string | null, casta?: string, linaje?: string): AjusteCoste =>
  ajustesDeCoste(especieDeFicha(ficha(especieId, casta, linaje)));

const SABIO = ajusteDe("manduk", "sabio");
const GUERRERO = ajusteDe("manduk", "guerrero");
const NOBLE = ajusteDe("manduk", "noble", "elion");
const ARIANYI = ajusteDe("arianyi");
const MAOLHER = ajusteDe("manduk", "noble", "maolher");

// Coste de llegar a `valor` con una especialidad (incluida) y por XP desde sin entrenar.
const creacion = (a: AjusteCoste, id: HabilidadId, valor: number) => costeHabilidad(valor, 1, a.habilidades[id]);
const xp = (a: AjusteCoste, id: HabilidadId, desde: number, hasta: number) =>
  costeSubidaXp({ tipo: "habilidad", id }, desde, hasta, a);

describe("coste de habilidad por casta (M11)", () => {
  const TABLA: { casta: string; a: AjusteCoste; menos: HabilidadId[]; mas: HabilidadId[] }[] = [
    { casta: "Noble", a: NOBLE, menos: ["actitud"], mas: [] },
    { casta: "Sabio", a: SABIO, menos: ["biociencia", "cultura", "tecnociencia"], mas: ["atletismo", "combate_melee", "combate_distancia"] },
    { casta: "Guerrero", a: GUERRERO, menos: ["atletismo", "combate_distancia", "combate_melee"], mas: ["biociencia", "cultura", "tecnociencia"] },
    { casta: "Siervo", a: ajusteDe("manduk", "siervo"), menos: [], mas: [] },
  ];

  for (const { casta, a, menos, mas } of TABLA) {
    test(`${casta}: −1 (mínimo 1) en ${menos.join(", ") || "nada"}; +1 en ${mas.join(", ") || "nada"}; el resto, sin ajuste`, () => {
      for (const h of HABILIDADES) {
        const [c4, x24] = [creacion(a, h.id, 4), xp(a, h.id, 2, 4)];
        if (menos.includes(h.id)) {
          assert.equal(c4, 1 + 1 + 2 + 3, `${h.id} creación`);
          assert.equal(xp(a, h.id, -1, 4), c4, `${h.id} XP desde sin entrenar = creación`);
          assert.equal(x24, 2 + 3, `${h.id} XP 2→4`);
        } else if (mas.includes(h.id)) {
          assert.equal(c4, 2 + 3 + 4 + 5, `${h.id} creación`);
          assert.equal(xp(a, h.id, -1, 4), c4, `${h.id} XP desde sin entrenar = creación`);
          assert.equal(x24, 4 + 5, `${h.id} XP 2→4`);
        } else {
          assert.equal(c4, 10, `${h.id} creación`);
          assert.equal(x24, 3 + 4, `${h.id} XP 2→4`);
        }
      }
    });
  }

  test("Siervo, Riux, Humanos y sin especie: ajuste neutro", () => {
    assert.deepEqual(ajusteDe("manduk", "siervo"), AJUSTE_NEUTRO);
    assert.deepEqual(ajusteDe("riux"), AJUSTE_NEUTRO);
    assert.deepEqual(ajusteDe("humano"), AJUSTE_NEUTRO);
    assert.deepEqual(ajusteDe(null), AJUSTE_NEUTRO);
  });

  test("ejemplo de sistema.md: Sabio con Tecnociencia 4 paga 7 en vez de 10", () => {
    assert.equal(creacion(SABIO, "tecnociencia", 4), 7);
    assert.equal(creacion(AJUSTE_NEUTRO, "tecnociencia", 4), 10);
  });

  test("mínimo 1: con −1, los niveles 1 y 2 cuestan 1 cada uno", () => {
    assert.equal(xp(NOBLE, "actitud", -1, 1), 1);
    assert.equal(xp(NOBLE, "actitud", 1, 2), 1);
    assert.equal(xp(NOBLE, "actitud", 2, 3), 2);
    assert.equal(xp(NOBLE, "actitud", 5, 6), 5); // hasta el techo de XP
  });

  test("especialidades sin ajuste: a partir de la segunda, 1 punto con cualquier casta", () => {
    // Tecnociencia 2 con 3 especialidades: Sabio 1+1 +2; neutro 1+2 +2; Guerrero 2+3 +2
    assert.equal(costeHabilidad(2, 3, SABIO.habilidades.tecnociencia), 4);
    assert.equal(costeHabilidad(2, 3, undefined), 5);
    assert.equal(costeHabilidad(2, 3, GUERRERO.habilidades.tecnociencia), 7);
  });

  test("pool de creación: con letra D (9), el Sabio llega a Tecnociencia 4; sin casta, no", () => {
    const s = setPrioridad(ficha("manduk", "sabio"), "habilidades", "D");
    const conCasta = setHabilidadValue(s, "tecnociencia", 4, SABIO);
    assert.equal(conCasta.habilidades.tecnociencia.valor, 4);
    assert.equal(puntosHabilidadesGastados(conCasta, SABIO), 7);
    assert.equal(setHabilidadValue(s, "tecnociencia", 4, AJUSTE_NEUTRO), s);
    // La 2ª especialidad cuesta 1, sin ajuste: 7 + 1 de 9
    const conEsp = addEspecialidad(addEspecialidad(conCasta, "tecnociencia", "mecanica", SABIO), "tecnociencia", "fisica", SABIO);
    assert.equal(puntosHabilidadesGastados(conEsp, SABIO), 8);
    assert.deepEqual(avisosParaEnviar(conEsp, SABIO).filter((x) => x.includes("habilidades")), [
      "Te queda 1 punto de habilidades sin gastar",
    ]);
  });
});

describe("descuentos psiónicos", () => {
  test("Arianyi: el nivel 1 de cada disciplina cuesta 2, Resonancia incluida; el resto, N×3", () => {
    for (const d of DISCIPLINAS) {
      assert.equal(costeDisciplina(1, ARIANYI), 2, d.id);
      assert.equal(costeDisciplina(3, ARIANYI), 2 + 6 + 9, d.id);
      assert.equal(costeSubidaXp({ tipo: "disciplina", id: d.id }, 0, 1, ARIANYI), 2, `${d.id} XP 0→1`);
      assert.equal(costeSubidaXp({ tipo: "disciplina", id: d.id }, 1, 3, ARIANYI), 6 + 9, `${d.id} XP 1→3`);
    }
  });

  test("Arianyi con letra D (3): Resonancia 1 gasta 2, no 3", () => {
    const s = setDisciplinaValue(setPrioridad(ficha("arianyi"), "psionica", "D"), "resonancia", 1, ARIANYI, SIN_BONOS_DISCIPLINA);
    assert.equal(nivelDisciplina(s, "resonancia"), 1);
    assert.equal(puntosPsionicaGastados(s, ARIANYI), 2);
    assert.equal(puntosPsionicaGastados(s, AJUSTE_NEUTRO), 3);
  });

  test("Maolher: cada nivel cuesta N×3 − 1, en creación y con XP", () => {
    assert.equal(costeDisciplina(1, MAOLHER), 2);
    assert.equal(costeDisciplina(3, MAOLHER), 2 + 5 + 8);
    assert.equal(costeSubidaXp({ tipo: "disciplina", id: "traslacion" }, 2, 4, MAOLHER), 8 + 11);
    const s = setDisciplinaValue(
      setDisciplinaValue(setPrioridad(ficha("manduk", "noble", "maolher"), "psionica", "C"), "traslacion", 1, MAOLHER, SIN_BONOS_DISCIPLINA),
      "traslacion",
      2,
      MAOLHER, SIN_BONOS_DISCIPLINA,
    );
    assert.equal(puntosPsionicaGastados(s, MAOLHER), 7);
  });

  test("Noble sin Maolher (Elión, Ílkrem): psiónica sin descuento", () => {
    for (const a of [NOBLE, ajusteDe("manduk", "noble", "ilkrem")]) {
      assert.equal(a.psionicaPorNivel, null);
      assert.equal(costeDisciplina(3, a), 18);
    }
  });

  test("atributos: sin ajuste por especie (§14.2)", () => {
    for (const a of [SABIO, ARIANYI, MAOLHER]) assert.equal(costeSubidaXp({ tipo: "atributo" }, 2, 4, a), 14);
  });
});

describe("costeSiguienteNivel: coste y pista", () => {
  test("habilidad: sin entrenar salta a 1; pista de casta", () => {
    assert.deepEqual(costeSiguienteNivel({ tipo: "habilidad", id: "tecnociencia" }, -1, SABIO), {
      nivel: 1,
      coste: 1,
      pista: "−1 casta",
    });
    assert.deepEqual(costeSiguienteNivel({ tipo: "habilidad", id: "tecnociencia" }, 3, SABIO), {
      nivel: 4,
      coste: 3,
      pista: "−1 casta",
    });
    assert.deepEqual(costeSiguienteNivel({ tipo: "habilidad", id: "atletismo" }, 2, SABIO), {
      nivel: 3,
      coste: 4,
      pista: "+1 casta",
    });
    assert.deepEqual(costeSiguienteNivel({ tipo: "habilidad", id: "sigilo" }, 2, SABIO), { nivel: 3, coste: 3, pista: null });
    assert.deepEqual(costeSiguienteNivel({ tipo: "habilidad", id: "tecnociencia" }, 3, AJUSTE_NEUTRO), {
      nivel: 4,
      coste: 4,
      pista: null,
    });
  });

  test("disciplina: Arianyi solo en el nivel 1; Maolher en todos", () => {
    assert.deepEqual(costeSiguienteNivel({ tipo: "disciplina", id: "resonancia" }, 0, ARIANYI), {
      nivel: 1,
      coste: 2,
      pista: "nivel 1 a 2 (arianyi)",
    });
    assert.deepEqual(costeSiguienteNivel({ tipo: "disciplina", id: "resonancia" }, 1, ARIANYI), {
      nivel: 2,
      coste: 6,
      pista: null,
    });
    assert.deepEqual(costeSiguienteNivel({ tipo: "disciplina", id: "traslacion" }, 3, MAOLHER), {
      nivel: 4,
      coste: 11,
      pista: "−1 Maolher",
    });
    assert.deepEqual(costeSiguienteNivel({ tipo: "disciplina", id: "traslacion" }, 0, AJUSTE_NEUTRO), {
      nivel: 1,
      coste: 3,
      pista: null,
    });
  });

  test("atributo: sin pista", () => {
    assert.deepEqual(costeSiguienteNivel({ tipo: "atributo" }, 1, SABIO), { nivel: 2, coste: 4, pista: null });
  });
});

describe("FichaResuelta: ajuste y bolsa", () => {
  test("el jugador recibe el ajuste de su especie", () => {
    assert.deepEqual(resolverFicha(ficha("manduk", "sabio"), { vitalidad: VITALIDAD_DE_FICHA, estados: [] }).ajusteCoste, SABIO);
  });

  test("NPC (libre): ajuste neutro y sin bolsa, aunque la especie los traiga", () => {
    const sabio = { ...ficha("manduk", "sabio"), habilidades: { ...defaultSheet().habilidades, tecnociencia: { valor: 4, especialidades: [] } } };
    assert.deepEqual(resolverFicha(sabio, { vitalidad: VITALIDAD_DE_FICHA, estados: [], libre: true }).ajusteCoste, AJUSTE_NEUTRO);
    assert.equal(resolverFicha(ficha("humano"), { vitalidad: VITALIDAD_DE_FICHA, estados: [], libre: true }).bolsaAumentos, null);
    assert.equal(experienciaInvertida(sabio), 10); // "Poder" del NPC, sin descuento de casta
  });

  test("bolsa de 60.000 solo para Humanos", () => {
    assert.equal(resolverFicha(ficha("humano"), { vitalidad: VITALIDAD_DE_FICHA, estados: [] }).bolsaAumentos, 60_000);
    assert.equal(bolsaDeAumentos(null), null);
    for (const e of ESPECIES.filter((x) => x.id !== "humano")) {
      const opciones = e.castas ? e.castas.map((c) => ficha(e.id, c.id, e.linajes?.casta === c.id ? e.linajes.opciones[0].id : undefined)) : [ficha(e.id)];
      for (const s of opciones) assert.equal(bolsaDeAumentos(especieDeFicha(s)), null, `${e.id}/${s.especieOpciones.casta ?? ""}`);
    }
  });
});
