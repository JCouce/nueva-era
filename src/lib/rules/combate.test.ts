import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet } from "./sheet";
import { equipar } from "./equipo";
import { ajustarRecurso } from "./recursos";
import { tiradasDeAtaque } from "./combate";
import { valorBonosTramo, type CondicionTirada } from "./condiciones";

function opcion(c: CondicionTirada | undefined, id: string) {
  assert.ok(c && c.tipo === "opcion", "no es una condición de opción");
  const o = c.opciones.find((x) => x.id === id);
  assert.ok(o, `no existe la opción ${id}`);
  return o.valor;
}

describe("sin nada equipado", () => {
  test("no aparece ningún ataque, ni siquiera puñetazo o patada", () => {
    assert.deepEqual(tiradasDeAtaque(defaultSheet()), []);
  });
});

describe("pelea (puñetazo, patada, codazo)", () => {
  test("solo aparece si el jugador la equipa, como cualquier otra arma", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "p1", catalogoId: "pelea_punetazo" });
    const labels = tiradasDeAtaque(sheet).map((t) => t.label);
    assert.deepEqual(labels, ["Golpear con Puñetazo (o Sutil)"]);
  });

  test("el puñetazo tiene dos modos y su condición de modo", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "p1", catalogoId: "pelea_punetazo" });
    const [punetazo] = tiradasDeAtaque(sheet);
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

describe("aviso de munición insuficiente (RECURSOS, docs/tareas.md)", () => {
  function opcionCompleta(c: CondicionTirada | undefined, id: string) {
    assert.ok(c && c.tipo === "opcion", "no es una condición de opción");
    const o = c.opciones.find((x) => x.id === id);
    assert.ok(o, `no existe la opción ${id}`);
    return o;
  }

  test("sin recurso rastreado (equipar auto-puebla) no hay ningún aviso al equipar", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "pistola_sydiasi" }); // 20/20
    const fila = tiradasDeAtaque(sheet).find((t) => t.label === "Disparar con Sydiasi")!;
    const modo = fila.condiciones?.find((c) => c.id === "modo");
    assert.equal(opcionCompleta(modo, "0").nota, undefined); // Simple, gasta 1
    assert.equal(opcionCompleta(modo, "1").nota, undefined); // F. Auto, gasta 20 — justo llega
  });

  test("con menos balas que las que pide F. Auto, esa opción lleva nota — Simple no", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "pistola_sydiasi" });
    sheet = ajustarRecurso(sheet, "arma1", -15); // 5/20 — no llega a los 20 de F. Auto
    const fila = tiradasDeAtaque(sheet).find((t) => t.label === "Disparar con Sydiasi")!;
    const modo = fila.condiciones?.find((c) => c.id === "modo");
    assert.equal(opcionCompleta(modo, "0").nota, undefined);
    assert.match(opcionCompleta(modo, "1").nota ?? "", /5\/20/);
  });

  test("un arma con un único modo (sin selector) lleva el aviso en la nota general", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "pistola_mosquito" }); // sin F. Auto
    sheet = ajustarRecurso(sheet, "arma1", -7); // 0/7
    const fila = tiradasDeAtaque(sheet).find((t) => t.label === "Disparar con Mosquito")!;
    assert.match(fila.nota ?? "", /0\/7/);
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

  test("el 'efectos' del arma llega a la nota, igual que 'especial' en armas de fuego", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "tonfa1", catalogoId: "corta_tonfa_porra" });
    const fila = tiradasDeAtaque(sheet).find((t) => t.label === "Golpear con Tonfa o Porra")!;
    assert.match(fila.nota ?? "", /Crítico de Aturdimiento \(7\)/);
  });

  test("Sutil y 'efectos' se combinan en la misma nota, sin pisarse", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "espada1", catalogoId: "espada_ligera" });
    const fila = tiradasDeAtaque(sheet).find((t) => t.label.includes("Espada Ligera"))!;
    assert.match(fila.nota ?? "", /Potencia en lugar de Fuerza/);
    assert.match(fila.nota ?? "", /Crítico de Hemorragia \(1d6 turnos\)/);
  });
});

describe("armamento pesado equipado", () => {
  test("dificultad fija por arma, mecanizada como ajustesFijos", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "lac1", catalogoId: "lanzacohetes_rt" });
    const fila = tiradasDeAtaque(sheet).find((t) => t.label === "Disparar con Lanzacohetes RT")!;
    assert.equal(fila.grupo, "Ataques");
    assert.equal(fila.aplicado, "reflejos");
    assert.equal(fila.habilidad, "combate_distancia");
    assert.deepEqual(fila.ajustesFijos, [{ valor: -3, fuente: "Lanzacohetes RT" }]);
    assert.equal(fila.ataque?.modos[0].danio, 14);
    assert.equal(fila.ataque?.modos[0].categoriaDanio, "Letal");
    assert.match(fila.nota ?? "", /Alcance 450 m/);
  });

  test("el Lanzallamas Ligero no tiene alcance en metros, no aparece en la nota", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "lf1", catalogoId: "lanzallamas_ligero" });
    const fila = tiradasDeAtaque(sheet).find((t) => t.label === "Disparar con Lanzallamas Ligero")!;
    assert.doesNotMatch(fila.nota ?? "", /Alcance/);
    assert.equal(fila.ataque?.modos[0].danio, 10);
    assert.equal(fila.ataque?.modos[0].categoriaDanio, "Fuego");
  });

  test("el Lanzagranadas pesado tiene el daño según la granada elegida, como el integrado", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "lg1", catalogoId: "lanzagranadas_pesado" });
    const fila = tiradasDeAtaque(sheet).find((t) => t.label === "Disparar con Lanzagranadas")!;
    assert.deepEqual(fila.ajustesFijos, [{ valor: -2, fuente: "Lanzagranadas" }]);
    const modo = fila.condiciones?.find((c) => c.id === "modo");
    assert.ok(modo && modo.tipo === "opcion");
    assert.equal(modo.opciones.length, 14);
    assert.equal(fila.ataque?.modos.find((m) => m.id === "granada_plasma")?.danio, 16);
  });
});

describe("granada equipada", () => {
  test("genera 'Lanzar...' con Potencia + Atletismo y la dificultad de lanzarla a mano", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "g1", catalogoId: "granada_fragmentacion" });
    const fila = tiradasDeAtaque(sheet).find((t) => t.label === "Lanzar Granada de Fragmentación")!;
    assert.equal(fila.grupo, "Ataques");
    assert.equal(fila.aplicado, "potencia");
    assert.equal(fila.habilidad, "atletismo");
    assert.deepEqual(fila.ajustesFijos, [{ valor: -2, fuente: "Granada de Fragmentación" }]);
    assert.equal(fila.ataque?.modos[0].danio, 14);
    assert.equal(fila.ataque?.modos[0].categoriaDanio, "Letal");
    assert.match(fila.nota ?? "", /Potencia × 10 m/);
  });

  test("una granada de solo efecto (sin daño directo) lo indica en la categoría", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "g1", catalogoId: "granada_humo" });
    const fila = tiradasDeAtaque(sheet).find((t) => t.label === "Lanzar Granada de Humo")!;
    assert.equal(fila.ataque?.modos[0].categoriaDanio, "Efecto (sin daño directo)");
  });

  test("dos granadas equipadas dan dos filas independientes", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "g1", catalogoId: "granada_casera" });
    sheet = equipar(sheet, { instanciaId: "g2", catalogoId: "granada_plasma" });
    const labels = tiradasDeAtaque(sheet)
      .map((t) => t.label)
      .filter((l) => l.startsWith("Lanzar"));
    assert.deepEqual(labels, ["Lanzar Granada Casera", "Lanzar Granada de Plasma"]);
  });
});
