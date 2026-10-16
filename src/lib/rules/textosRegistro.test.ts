import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { etiquetaDuracion, etiquetaDuracionCorta, haceCuanto, textoEntradaRegistro } from "./textosRegistro";
import { listaLegible } from "./registro";
import type { EstadoActivo } from "./estados";
import type { CambioEstadoPersonaje } from "./vidaPorEstados";

const PJS = [
  { id: "k", nombre: "Kira Vasq" },
  { id: "t", nombre: "Tarsis Vol" },
  { id: "d", nombre: null },
];

const cambioEstado = (characterId: string, antes: EstadoActivo | null, despues: EstadoActivo | null): CambioEstadoPersonaje => ({
  characterId,
  estadoId: (despues ?? antes)?.estadoId ?? "x",
  antes,
  despues,
  restado: { vida: 0, fatiga: 0 },
  combatientes: [],
});

const ATURDIDO: EstadoActivo = { estadoId: "aturdido", gradoId: "fracaso", rondasRestantes: 1 };

describe("listaLegible", () => {
  test("uno, dos y tres", () => {
    assert.equal(listaLegible(["A"]), "A");
    assert.equal(listaLegible(["A", "B"]), "A y B");
    assert.equal(listaLegible(["A", "B", "C"]), "A, B y C");
  });
});

describe("textoEntradaRegistro", () => {
  test("poner un estado a varios, con grado y duración", () => {
    const datos = { tipo: "estado_poner" as const, cambios: [cambioEstado("k", null, ATURDIDO), cambioEstado("t", null, ATURDIDO)] };
    assert.equal(textoEntradaRegistro("estado_poner", datos, PJS), "Aturdido (Fracaso) a Kira y Tarsis · 1 ronda");
  });

  test("un estado de un solo grado no repite el grado; fin de escena", () => {
    const derribado: EstadoActivo = { estadoId: "derribado", gradoId: "activo", rondasRestantes: null, finDeEscena: true };
    const datos = { tipo: "estado_poner" as const, cambios: [cambioEstado("k", null, derribado)] };
    assert.match(textoEntradaRegistro("estado_poner", datos, PJS), /^Derribado a Kira · hasta fin de escena$/);
  });

  test("quitar y fin de escena", () => {
    const quitar = { tipo: "estado_quitar" as const, cambios: [cambioEstado("t", ATURDIDO, null)] };
    assert.equal(textoEntradaRegistro("estado_quitar", quitar, PJS), "Quitado Aturdido (Fracaso) a Tarsis");
    const fin = { tipo: "fin_escena" as const, cambios: [cambioEstado("k", ATURDIDO, null), cambioEstado("k", ATURDIDO, null), cambioEstado("t", ATURDIDO, null)] };
    assert.equal(textoEntradaRegistro("fin_escena", fin, PJS), "Fin de escena: limpiados los estados de Kira y Tarsis");
    const limpiar = { ...fin, tipo: "limpiar_estados" as const };
    assert.equal(textoEntradaRegistro("limpiar_estados", limpiar, PJS), "Estados limpiados: Kira y Tarsis");
  });

  test("xp y créditos, con signo y miles; un personaje borrado", () => {
    const xp = { tipo: "xp" as const, cambios: [{ characterId: "k", antes: 10, despues: 60 }] };
    assert.equal(textoEntradaRegistro("xp", xp, PJS), "+50 XP a Kira");
    const cr = { tipo: "creditos" as const, cambios: [{ characterId: "k", antes: 20_000, despues: 7_500 }, { characterId: "d", antes: 12_500, despues: 0 }] };
    assert.equal(textoEntradaRegistro("creditos", cr, PJS), "−12.500 créditos a Kira y (borrado)");
    const desigual = { tipo: "xp" as const, cambios: [{ characterId: "k", antes: 10, despues: 0 }, { characterId: "t", antes: 50, despues: 30 }] };
    assert.equal(textoEntradaRegistro("xp", desigual, PJS), "XP: Kira −10, Tarsis −20");
  });

  test("datos que no se entienden", () => {
    assert.match(textoEntradaRegistro("xp", null, PJS), /formato antiguo/);
  });

  test("vida: jugador con nombre corto, NPC con el entero", () => {
    const cambios = [
      { objetivo: "ficha" as const, id: "j", nombre: "Javi Pérez", npc: false, antes: 6, despues: 3 },
      { objetivo: "combatiente" as const, id: "g", nombre: "Guardia corporativo", npc: true, antes: 9, despues: 6 },
    ];
    assert.equal(
      textoEntradaRegistro("vida", { tipo: "vida", recurso: "vida", delta: -3, cambios }, []),
      "−3 vida a Javi y Guardia corporativo",
    );
    assert.equal(
      textoEntradaRegistro("vida", { tipo: "vida", recurso: "fatiga", delta: 2, cambios: cambios.slice(0, 1) }, []),
      "+2 fatiga a Javi",
    );
  });
});

describe("duraciones y hora", () => {
  test("etiquetas", () => {
    assert.equal(etiquetaDuracion({ tipo: "rondas", rondas: 3 }), "3 rondas");
    assert.equal(etiquetaDuracion({ tipo: "hastaQuitarlo" }), "hasta quitarlo");
    assert.equal(etiquetaDuracionCorta({ tipo: "rondas", rondas: 2 }), "2r");
    assert.equal(etiquetaDuracionCorta({ tipo: "escena" }), "escena");
    assert.equal(etiquetaDuracionCorta({ tipo: "hastaQuitarlo" }), null);
  });

  test("haceCuanto", () => {
    const t = 1_000_000_000;
    assert.equal(haceCuanto(t, t + 10_000), "Ahora");
    assert.equal(haceCuanto(t, t + 5 * 60_000), "Hace 5 min");
    assert.equal(haceCuanto(t, t + 3 * 3_600_000), "Hace 3 h");
    assert.equal(haceCuanto(t, t + 26 * 3_600_000), "Hace 1 día");
    assert.equal(haceCuanto(t + 5000, t), "Ahora");
  });
});
