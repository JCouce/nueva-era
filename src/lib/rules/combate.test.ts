import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet } from "./sheet";
import { equipar } from "./equipo";
import { tiradasDeAtaque } from "./combate";
import { valorBonosTramo, type CondicionTirada } from "./condiciones";

function opcion(c: CondicionTirada | undefined, id: string) {
  assert.ok(c && c.tipo === "opcion", "no es una condición de opción");
  const o = c.opciones.find((x) => x.id === id);
  assert.ok(o, `no existe la opción ${id}`);
  return o.valor;
}

describe("sin nada equipado", () => {
  test("solo aparecen las tres de pelea", () => {
    const tiradas = tiradasDeAtaque(defaultSheet());
    const labels = tiradas.map((t) => t.label);
    assert.deepEqual(labels, [
      "Golpear con Puñetazo (o Sutil)",
      "Golpear con Patada (o Sutil)",
      "Golpear con Codazo o Rodillazo (o Sutil)",
    ]);
  });

  test("el puñetazo tiene dos modos y su condición de modo", () => {
    const [punetazo] = tiradasDeAtaque(defaultSheet());
    const modo = punetazo.condiciones?.find((c) => c.id === "modo");
    assert.equal(opcion(modo, "0"), 0); // Simple
    assert.equal(opcion(modo, "1"), 0); // Estándar
  });
});

describe("arma de fuego equipada", () => {
  test("genera una fila 'Disparar con...' con la distancia por defecto", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_precision_plaga" });
    const fila = tiradasDeAtaque(sheet).find((t) => t.label === "Disparar con Plaga");
    assert.ok(fila);
    assert.equal(fila!.ataque?.modos[0].danio, 17);
    assert.equal(fila!.ataque?.modos[0].categoriaDanio, "Plasma");
  });

  test("un fusil de precisión cambia el +2 de corta por -2", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_precision_plaga" });
    const fila = tiradasDeAtaque(sheet).find((t) => t.label === "Disparar con Plaga")!;
    const tramo = fila.condiciones?.find((c) => c.id === "tramo");
    assert.equal(opcion(tramo, "bocajarro"), 4);
    assert.equal(opcion(tramo, "corta"), -2);
    assert.equal(opcion(tramo, "media"), 0);
    assert.equal(opcion(tramo, "larga"), -2);
  });

  test("una escopeta suma +1 a corta y bocajarro", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "escopeta_feritas" });
    const fila = tiradasDeAtaque(sheet).find((t) => t.label === "Disparar con Feritas")!;
    const tramo = fila.condiciones?.find((c) => c.id === "tramo");
    assert.equal(opcion(tramo, "bocajarro"), 5);
    assert.equal(opcion(tramo, "corta"), 3);
    assert.equal(opcion(tramo, "media"), 0);
    assert.equal(opcion(tramo, "larga"), -2);
  });

  test("un arma con dos modos trae la condición de modo", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "pistola_sydiasi" });
    const fila = tiradasDeAtaque(sheet).find((t) => t.label === "Disparar con Sydiasi")!;
    const modo = fila.condiciones?.find((c) => c.id === "modo");
    assert.equal(opcion(modo, "0"), -3); // Simple
    assert.equal(opcion(modo, "1"), -4); // Estándar (F. Auto)
    assert.equal(fila.ataque?.modos[1].danio, 12);
  });
});

describe("mejoras que afectan a la distancia", () => {
  test("la mira telescópica nivel 1 no toca el tramo: sale como bono aparte, con su fuente", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_asalto_impetus" });
    sheet = equipar(sheet, {
      instanciaId: "mira1",
      catalogoId: "mira_telescopica",
      nivel: 1,
      instaladoEnId: "arma1",
    });
    const fila = tiradasDeAtaque(sheet).find((t) => t.label === "Disparar con Impetus")!;
    const tramo = fila.condiciones?.find((c) => c.id === "tramo");
    assert.equal(opcion(tramo, "corta"), 2);
    assert.equal(opcion(tramo, "media"), 0);
    assert.equal(opcion(tramo, "larga"), -2);
    assert.deepEqual(fila.bonosTramo, [
      { fuente: "Mira Telescópica", porTramo: { media: 1, larga: 1 } },
    ]);
  });

  test("la mira telescópica nivel 3 da +2, no +1 encima del nivel 1", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_asalto_impetus" });
    sheet = equipar(sheet, {
      instanciaId: "mira1",
      catalogoId: "mira_telescopica",
      nivel: 3,
      instaladoEnId: "arma1",
    });
    const fila = tiradasDeAtaque(sheet).find((t) => t.label === "Disparar con Impetus")!;
    assert.deepEqual(fila.bonosTramo, [
      { fuente: "Mira Telescópica", porTramo: { media: 2, larga: 2 } },
    ]);
  });

  test("el bono de la mira solo cuenta en el tramo elegido", () => {
    const bonos = [{ fuente: "Mira Telescópica", porTramo: { media: 1, larga: 1 } }];
    assert.equal(valorBonosTramo(bonos, { tramo: "corta" }), 0);
    assert.equal(valorBonosTramo(bonos, { tramo: "media" }), 1);
    assert.equal(valorBonosTramo(bonos, { tramo: "larga" }), 1);
  });

  test("el bípode aparece como toggle 'apoyado'", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_asalto_impetus" });
    sheet = equipar(sheet, {
      instanciaId: "bipode1",
      catalogoId: "bipode",
      nivel: 1,
      instaladoEnId: "arma1",
    });
    const fila = tiradasDeAtaque(sheet).find((t) => t.label === "Disparar con Impetus")!;
    const apoyado = fila.condiciones?.find((c) => c.id === "apoyado");
    assert.ok(apoyado && apoyado.tipo === "toggle");
    assert.equal(apoyado.valorActivo, 1);
    assert.equal(apoyado.valorInactivo, -1);
  });
});

describe("lanzagranadas integrado", () => {
  test("el -1 por el peso no toca el tramo: sale como su propia línea con fuente", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_asalto_impetus" });
    sheet = equipar(sheet, {
      instanciaId: "lanza1",
      catalogoId: "lanzagranadas_integrado",
      nivel: 1,
      instaladoEnId: "arma1",
    });
    const fila = tiradasDeAtaque(sheet).find((t) => t.label === "Disparar con Impetus")!;
    const tramo = fila.condiciones?.find((c) => c.id === "tramo");
    assert.equal(opcion(tramo, "bocajarro"), 4);
    assert.equal(opcion(tramo, "corta"), 2);
    assert.equal(opcion(tramo, "media"), 0);
    assert.equal(opcion(tramo, "larga"), -2);
    assert.deepEqual(fila.ajustesFijos, [{ valor: -1, fuente: "Lanzagranadas Integrado" }]);
  });

  test("aparece como tirada aparte, con dificultad fija -2 y selector de granada", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_asalto_impetus" });
    sheet = equipar(sheet, {
      instanciaId: "lanza1",
      catalogoId: "lanzagranadas_integrado",
      nivel: 1,
      instaladoEnId: "arma1",
    });
    const fila = tiradasDeAtaque(sheet).find((t) => t.label === "Lanzagranadas (Impetus)")!;
    assert.ok(fila);
    assert.equal(fila.bloqueada, undefined);
    assert.deepEqual(fila.ajustesFijos, [{ valor: -2, fuente: "Lanzagranadas acoplado" }]);
    const modo = fila.condiciones?.find((c) => c.id === "modo");
    assert.ok(modo && modo.tipo === "opcion");
    assert.equal(modo.opciones.length, 14);
    assert.equal(fila.ataque?.modos.find((m) => m.id === "granada_plasma")?.danio, 16);
    assert.equal(fila.ataque?.modos.find((m) => m.id === "granada_plasma")?.categoriaDanio, "Plasma");
    assert.equal(fila.ataque?.modos.find((m) => m.id === "granada_aturdidora")?.categoriaDanio, "Efecto (sin daño directo)");
  });

  test("sin lanzagranadas instalado, no aparece esa fila", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_asalto_impetus" });
    const labels = tiradasDeAtaque(sheet).map((t) => t.label);
    assert.ok(!labels.some((l) => l.startsWith("Lanzagranadas")));
  });
});

describe("arma melee equipada", () => {
  test("genera 'Golpear con...' con la fórmula de daño, no un número", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "espada1", catalogoId: "espada" });
    const fila = tiradasDeAtaque(sheet).find((t) => t.label === "Golpear con Espada")!;
    assert.equal(fila.ataque?.modos[0].danio, null);
    assert.equal(fila.ataque?.modos[0].formulaDanio, "Fue+3");
  });

  test("un arma Sutil lo indica en la etiqueta y la nota", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "espada1", catalogoId: "espada_ligera" });
    const fila = tiradasDeAtaque(sheet).find((t) => t.label.includes("Espada Ligera"))!;
    assert.match(fila.label, /Sutil/);
    assert.match(fila.nota ?? "", /Potencia en lugar de Fuerza/);
  });
});
