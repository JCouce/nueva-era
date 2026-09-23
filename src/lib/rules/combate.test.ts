import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { equipar } from "./equipo";
import { ajustarRecurso } from "./recursos";
import { accionesDeAtaque, generaAccionPropia } from "./combate";
import { valorBonosTramo, type CondicionTirada } from "./condiciones";
import { EQUIPO, type Equipo } from "../catalog/equipo";
import type { MotorMetadata } from "./motor";

// Ficha de trabajo: se parte de la de por defecto y se tocan atributos sueltos.
function ficha(patch: { atributos?: Partial<Sheet["atributos"]> }): Sheet {
  const s = defaultSheet();
  return { ...s, atributos: { ...s.atributos, ...patch.atributos } };
}

function opcion(c: CondicionTirada | undefined, id: string) {
  assert.ok(c && c.tipo === "opcion", "no es una condición de opción");
  const o = c.opciones.find((x) => x.id === id);
  assert.ok(o, `no existe la opción ${id}`);
  return o.valor;
}

describe("sin nada equipado", () => {
  test("no aparece ningún ataque, ni siquiera puñetazo o patada", () => {
    assert.deepEqual(accionesDeAtaque(defaultSheet()), []);
  });
});

describe("pelea (puñetazo, patada, codazo)", () => {
  test("solo aparece si el jugador la equipa, como cualquier otra arma", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "p1", catalogoId: "pelea_punetazo" });
    const labels = accionesDeAtaque(sheet).map((t) => t.label);
    assert.deepEqual(labels, ["Golpear con Puñetazo (o Sutil)", "Bloquear con Puñetazo"]);
  });

  test("el puñetazo tiene dos modos y su condición de modo", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "p1", catalogoId: "pelea_punetazo" });
    const [punetazo] = accionesDeAtaque(sheet);
    const modo = punetazo.condiciones?.find((c) => c.id === "modo");
    assert.equal(opcion(modo, "0"), 0); // Simple
    assert.equal(opcion(modo, "1"), 0); // Estándar
  });
});

describe("arma de fuego equipada", () => {
  test("genera una fila 'Disparar con...' con la distancia por defecto", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_precision_plaga" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Plaga");
    assert.ok(fila);
    assert.equal(fila!.ataque?.modos[0].danio, 17);
    assert.equal(fila!.ataque?.modos[0].categoriaDanio, "Plasma");
  });

  test("un fusil de precisión cambia el +2 de corta por -2", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "fusil_precision_plaga" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Plaga")!;
    const tramo = fila.condiciones?.find((c) => c.id === "tramo");
    assert.equal(opcion(tramo, "bocajarro"), 4);
    assert.equal(opcion(tramo, "corta"), -2);
    assert.equal(opcion(tramo, "media"), 0);
    assert.equal(opcion(tramo, "larga"), -2);
  });

  test("una escopeta suma +1 a corta y bocajarro", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "escopeta_feritas" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Feritas")!;
    const tramo = fila.condiciones?.find((c) => c.id === "tramo");
    assert.equal(opcion(tramo, "bocajarro"), 5);
    assert.equal(opcion(tramo, "corta"), 3);
    assert.equal(opcion(tramo, "media"), 0);
    assert.equal(opcion(tramo, "larga"), -2);
  });

  test("un arma con dos modos trae la condición de modo", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "pistola_sydiasi" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Sydiasi")!;
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
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Sydiasi")!;
    const modo = fila.condiciones?.find((c) => c.id === "modo");
    assert.equal(opcionCompleta(modo, "0").nota, undefined); // Simple, gasta 1
    assert.equal(opcionCompleta(modo, "1").nota, undefined); // F. Auto, gasta 20 — justo llega
  });

  test("con menos balas que las que pide F. Auto, esa opción lleva nota — Simple no", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "pistola_sydiasi" });
    sheet = ajustarRecurso(sheet, "arma1", -15); // 5/20 — no llega a los 20 de F. Auto
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Sydiasi")!;
    const modo = fila.condiciones?.find((c) => c.id === "modo");
    assert.equal(opcionCompleta(modo, "0").nota, undefined);
    assert.match(opcionCompleta(modo, "1").nota ?? "", /5\/20/);
  });

  test("un arma con un único modo (sin selector) lleva el aviso en la nota general", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "arma1", catalogoId: "pistola_mosquito" }); // sin F. Auto
    sheet = ajustarRecurso(sheet, "arma1", -7); // 0/7
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Mosquito")!;
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
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Impetus")!;
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
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Impetus")!;
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
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Impetus")!;
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
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Impetus")!;
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
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Lanzagranadas (Impetus)")!;
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
    const labels = accionesDeAtaque(sheet).map((t) => t.label);
    assert.ok(!labels.some((l) => l.startsWith("Lanzagranadas")));
  });
});

describe("arma melee equipada", () => {
  test("el daño se calcula solo desde la Fuerza del personaje (ya no 'a mano')", () => {
    let sheet = defaultSheet(); // Fuerza 0
    sheet = equipar(sheet, { instanciaId: "espada1", catalogoId: "espada" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Golpear con Espada")!;
    assert.equal(fila.ataque?.modos[0].danio, 3); // Fue(0) + 3
    assert.equal(fila.ataque?.modos[0].formulaDanio, "Fue+3");
  });

  test("el daño escala con la Fuerza efectiva del personaje", () => {
    let sheet = ficha({ atributos: { fuerza: 4 } });
    sheet = equipar(sheet, { instanciaId: "espada1", catalogoId: "espada" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Golpear con Espada")!;
    assert.equal(fila.ataque?.modos[0].danio, 7); // Fue(4) + 3
  });

  test("una fórmula sin '+N' (solo 'Fuerza' o 'Fue') usa la Fuerza tal cual", () => {
    let sheet = ficha({ atributos: { fuerza: 2 } });
    sheet = equipar(sheet, { instanciaId: "punetazo1", catalogoId: "pelea_punetazo" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Golpear con Puñetazo (o Sutil)")!;
    assert.equal(fila.ataque?.modos[0].danio, 2); // Fuerza(2) + 0
  });

  test("un arma Sutil lo indica en la etiqueta y la nota", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "espada1", catalogoId: "espada_ligera" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label.includes("Espada Ligera"))!;
    assert.match(fila.label, /Sutil/);
    assert.match(fila.nota ?? "", /Potencia en lugar de Fuerza/);
  });

  test("el 'efectos' del arma llega a la nota, igual que 'especial' en armas de fuego", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "tonfa1", catalogoId: "corta_tonfa_porra" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Golpear con Tonfa o Porra")!;
    assert.match(fila.nota ?? "", /Crítico de Aturdimiento \(7\)/);
  });

  test("Sutil y 'efectos' se combinan en la misma nota, sin pisarse", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "espada1", catalogoId: "espada_ligera" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label.includes("Espada Ligera"))!;
    assert.match(fila.nota ?? "", /Potencia en lugar de Fuerza/);
    assert.match(fila.nota ?? "", /Crítico de Hemorragia \(1d6 turnos\)/);
  });
});

describe("Bloqueo (otra forma de defensa, pregunta 31 resuelta)", () => {
  test("toda arma melee equipada genera también su 'Bloquear con...'", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "espada1", catalogoId: "espada" });
    const bloqueo = accionesDeAtaque(sheet).find((t) => t.label === "Bloquear con Espada")!;
    assert.ok(bloqueo);
    assert.equal(bloqueo.grupo, "Defensa");
    assert.equal(bloqueo.aplicado, "potencia");
    assert.equal(bloqueo.habilidad, "combate_melee");
    assert.deepEqual(bloqueo.ajustesFijos, []);
  });

  test("con un arma Sutil, el Bloqueo usa Reflejos en vez de Potencia", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "espada1", catalogoId: "espada_ligera" });
    const bloqueo = accionesDeAtaque(sheet).find((t) => t.label === "Bloquear con Espada Ligera")!;
    assert.equal(bloqueo.aplicado, "reflejos");
    assert.equal(bloqueo.habilidad, "combate_melee");
  });

  test("el Mangual trae su propio -2 al Bloqueo", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "mangual1", catalogoId: "flagelo_mangual" });
    const bloqueo = accionesDeAtaque(sheet).find((t) => t.label === "Bloquear con Mangual")!;
    assert.deepEqual(bloqueo.ajustesFijos, [{ valor: -2, fuente: "Mangual" }]);
  });

  test("mismo penalizador por atacante adicional que Esquivar", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "espada1", catalogoId: "espada" });
    const bloqueo = accionesDeAtaque(sheet).find((t) => t.label === "Bloquear con Espada")!;
    const contador = bloqueo.condiciones?.find((c) => c.id === "atacantes_adicionales");
    assert.ok(contador && contador.tipo === "contador");
    assert.equal(contador.valorPorUnidad, -1);
  });
});

describe("armamento pesado equipado", () => {
  test("dificultad fija por arma, mecanizada como ajustesFijos", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "lac1", catalogoId: "lanzacohetes_rt" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Lanzacohetes RT")!;
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
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Lanzallamas Ligero")!;
    assert.doesNotMatch(fila.nota ?? "", /Alcance/);
    assert.equal(fila.ataque?.modos[0].danio, 10);
    assert.equal(fila.ataque?.modos[0].categoriaDanio, "Fuego");
  });

  test("el Lanzagranadas pesado tiene el daño según la granada elegida, como el integrado", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "lg1", catalogoId: "lanzagranadas_pesado" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Disparar con Lanzagranadas")!;
    assert.deepEqual(fila.ajustesFijos, [{ valor: -2, fuente: "Lanzagranadas" }]);
    const modo = fila.condiciones?.find((c) => c.id === "modo");
    assert.ok(modo && modo.tipo === "opcion");
    assert.equal(modo.opciones.length, 14);
    assert.equal(fila.ataque?.modos.find((m) => m.id === "granada_plasma")?.danio, 16);
  });
});

describe("Proyector de Pulso (subsistema con acción propia, Hallazgo #1)", () => {
  function conProyectorPulso(nivel: number) {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "a1", catalogoId: "armadura_pesada" });
    sheet = equipar(sheet, {
      instanciaId: "pp1",
      catalogoId: "proyector_pulso",
      nivel,
      instaladoEnId: "a1",
    });
    return sheet;
  }

  test("genera cuatro filas: dos a distancia (por habilidad) y dos con Aguijón (melee)", () => {
    const sheet = conProyectorPulso(1);
    const labels = accionesDeAtaque(sheet)
      .map((t) => t.label)
      .filter((l) => l.includes("Proyector de Pulso"));
    assert.deepEqual(labels, [
      "Disparar Proyector de Pulso (Combate a Distancia)",
      "Disparar Proyector de Pulso (Tecnociencia)",
      "Golpear con Proyector de Pulso (Aguijón)",
      "Bloquear con Proyector de Pulso (Aguijón)",
    ]);
  });

  test("las dos filas a distancia usan Reflejos, cada una con su propia habilidad", () => {
    const sheet = conProyectorPulso(1);
    const filas = accionesDeAtaque(sheet).filter((t) => t.label.startsWith("Disparar"));
    assert.deepEqual(
      filas.map((f) => [f.aplicado, f.habilidad]),
      [
        ["reflejos", "combate_distancia"],
        ["reflejos", "tecnociencia"],
      ],
    );
  });

  test("Aguijón (golpear y bloquear) es Reflejos + Combate Melee, no Combate a Distancia/Tecnociencia", () => {
    const sheet = conProyectorPulso(1);
    const golpe = accionesDeAtaque(sheet).find((t) => t.label === "Golpear con Proyector de Pulso (Aguijón)")!;
    const bloqueo = accionesDeAtaque(sheet).find((t) => t.label === "Bloquear con Proyector de Pulso (Aguijón)")!;
    assert.deepEqual([golpe.aplicado, golpe.habilidad], ["reflejos", "combate_melee"]);
    assert.deepEqual([bloqueo.aplicado, bloqueo.habilidad], ["reflejos", "combate_melee"]);
    assert.equal(golpe.grupo, "Ataques");
    assert.equal(bloqueo.grupo, "Defensa");
  });

  test("el daño y el modo de disparo escalan con el nivel instalado", () => {
    const fila = accionesDeAtaque(conProyectorPulso(2)).find((t) =>
      t.label.includes("Combate a Distancia"),
    )!;
    assert.equal(fila.ataque?.modos.find((m) => m.id === "pulso")?.danio, 10); // 8 + 2
    assert.equal(fila.ataque?.modos.find((m) => m.id === "pulso_cargado")?.danio, 13); // 11 + 2
    assert.equal(fila.ataque?.modos.find((m) => m.id === "barrido")?.danio, 12); // 10 + 2
    const modo = fila.condiciones?.find((c) => c.id === "modo");
    assert.equal(opcion(modo, "pulso"), -2);
    assert.equal(opcion(modo, "pulso_cargado"), -2);
    assert.equal(opcion(modo, "barrido"), -3);
  });

  test("Aguijón: daño calculado desde la Fuerza del personaje, escala con el nivel", () => {
    const fila = accionesDeAtaque(conProyectorPulso(3)).find(
      (t) => t.label === "Golpear con Proyector de Pulso (Aguijón)",
    )!;
    const aguijon = fila.ataque?.modos[0];
    assert.equal(aguijon?.danio, 5); // Fue(0) + 2 + nivel(3)
    assert.equal(aguijon?.formulaDanio, "Fue+5"); // 2 + nivel(3)
  });

  test("con nivel 1 la nota no menciona ninguna variante de crítico desbloqueada", () => {
    const fila = accionesDeAtaque(conProyectorPulso(1)).find((t) => t.label.includes("Combate a Distancia"))!;
    assert.doesNotMatch(fila.nota ?? "", /Nivel 2|Nivel 3|Nivel 4/);
  });

  test("con nivel 4 la nota lista las tres variantes de crítico desbloqueadas", () => {
    const fila = accionesDeAtaque(conProyectorPulso(4)).find((t) => t.label.includes("Combate a Distancia"))!;
    assert.match(fila.nota ?? "", /Nivel 2: crítico alternativo Envenenamiento por Radiación \(dificultad 12\)/);
    assert.match(fila.nota ?? "", /Nivel 3: crítico alternativo Ceguera \(dificultad 12\)/);
    assert.match(fila.nota ?? "", /Nivel 4: el Shock sube \+1/);
  });

  test("con las cargas del catálogo (10) nunca avisa de insuficiencia recién equipado", () => {
    const fila = accionesDeAtaque(conProyectorPulso(1)).find((t) => t.label.includes("Combate a Distancia"))!;
    const modo = fila.condiciones?.find((c) => c.id === "modo");
    assert.ok(modo && modo.tipo === "opcion");
    for (const o of modo.opciones) assert.doesNotMatch(o.nota ?? "", /Solo quedan/);
  });

  test("cada modo trae una breve descripción de sabor", () => {
    const fila = accionesDeAtaque(conProyectorPulso(1)).find((t) => t.label.includes("Combate a Distancia"))!;
    const modo = fila.condiciones?.find((c) => c.id === "modo");
    assert.ok(modo && modo.tipo === "opcion");
    for (const o of modo.opciones) assert.ok(o.nota && o.nota.length > 0, `sin descripción: ${o.id}`);
  });

  test("un subsistema sin acción propia construida (Camuflaje Trifásico) no genera ninguna fila", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "a1", catalogoId: "armadura_pesada" });
    sheet = equipar(sheet, {
      instanciaId: "ct1",
      catalogoId: "camuflaje_trifasico",
      nivel: 1,
      instaladoEnId: "a1",
    });
    assert.deepEqual(accionesDeAtaque(sheet), []);
  });
});

describe("granada equipada", () => {
  test("genera 'Lanzar...' con Potencia + Atletismo y la dificultad de lanzarla a mano", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "g1", catalogoId: "granada_fragmentacion" });
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Lanzar Granada de Fragmentación")!;
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
    const fila = accionesDeAtaque(sheet).find((t) => t.label === "Lanzar Granada de Humo")!;
    assert.equal(fila.ataque?.modos[0].categoriaDanio, "Efecto (sin daño directo)");
  });

  test("dos granadas equipadas dan dos filas independientes", () => {
    let sheet = defaultSheet();
    sheet = equipar(sheet, { instanciaId: "g1", catalogoId: "granada_casera" });
    sheet = equipar(sheet, { instanciaId: "g2", catalogoId: "granada_plasma" });
    const labels = accionesDeAtaque(sheet)
      .map((t) => t.label)
      .filter((l) => l.startsWith("Lanzar"));
    assert.deepEqual(labels, ["Lanzar Granada Casera", "Lanzar Granada de Plasma"]);
  });
});

// N4 (artifact de escalabilidad): fija qué familias debe cubrir
// REGISTRO_DE_ATAQUE (combate.ts) — si alguien borra o rompe una entrada sin
// querer, esto se pone en rojo en vez de fallar en silencio. No recorre las
// 11 familias de Equipo: la mayoría (mejoraEstandar, subsistema, movimiento,
// mejoraArma) necesitan un host válido para poder equiparse siquiera
// (equipar() las rechaza sin uno, ver lib/rules/equipo.ts) y nunca llegan a
// sheet.equipo sin él, así que no hace falta comprobarlas aparte — quedan
// fuera por construcción, no por omisión de este test.
describe("REGISTRO_DE_ATAQUE (combate.ts) cubre exactamente las familias esperadas", () => {
  const FAMILIAS_QUE_GENERAN_ATAQUE: Equipo["familia"][] = ["arma", "armaMelee", "armaPesada", "granada"];
  const FAMILIAS_SIN_ATAQUE_SIN_HOST: Equipo["familia"][] = ["armadura", "herramienta", "consumible"];

  function primerIdDe(familia: Equipo["familia"]): string {
    const pieza = EQUIPO.find((p) => p.familia === familia);
    assert.ok(pieza, `no hay ninguna pieza de familia "${familia}" en EQUIPO`);
    return pieza!.id;
  }

  for (const familia of FAMILIAS_QUE_GENERAN_ATAQUE) {
    test(`"${familia}" genera al menos una fila en accionesDeAtaque()`, () => {
      let sheet = defaultSheet();
      sheet = equipar(sheet, { instanciaId: "x1", catalogoId: primerIdDe(familia) });
      assert.ok(accionesDeAtaque(sheet).length > 0, `familia "${familia}" no generó ninguna fila`);
    });
  }

  for (const familia of FAMILIAS_SIN_ATAQUE_SIN_HOST) {
    test(`"${familia}" no genera ninguna fila en accionesDeAtaque()`, () => {
      let sheet = defaultSheet();
      sheet = equipar(sheet, { instanciaId: "x1", catalogoId: primerIdDe(familia) });
      assert.deepEqual(accionesDeAtaque(sheet), []);
    });
  }
});

// T6 (artifact de escalabilidad): generaAccionPropia() es lo que hace que
// accionesDeAtaque() consulte MotorMetadata además del registro por familia.
// No hay ninguna pieza real hoy en arma/armaMelee/armaPesada/granada cuya
// ÚNICA entrada "accion"/"accion_equipo" sea pendiente/bloqueada (todas
// tienen al menos una construida para su acción principal) — se prueba la
// función pura en aislado, con piezas sintéticas, en vez de depender de que
// el catálogo real tenga un caso así.
describe("generaAccionPropia() — el filtro de T6", () => {
  function piezaCon(motor: MotorMetadata[]): Equipo {
    return { familia: "arma", motor } as unknown as Equipo;
  }

  test("con una entrada accion/accion_equipo construida, genera", () => {
    const pieza = piezaCon([
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "x" }, mecanismo: "accion_equipo", estado: "construido" },
    ]);
    assert.equal(generaAccionPropia(pieza), true);
  });

  test("con esa misma entrada en 'pendiente', no genera", () => {
    const pieza = piezaCon([
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "x" }, mecanismo: "accion_equipo", estado: "pendiente" },
    ]);
    assert.equal(generaAccionPropia(pieza), false);
  });

  test("con esa misma entrada en 'bloqueado', no genera", () => {
    const pieza = piezaCon([
      {
        tipo: "accion",
        afecta: { modo: "accion_nueva", id: "x" },
        mecanismo: "accion_equipo",
        estado: "bloqueado",
        bloqueoPor: "pregunta de prueba",
      },
    ]);
    assert.equal(generaAccionPropia(pieza), false);
  });

  test("sin ninguna entrada accion/accion_equipo, no genera", () => {
    const pieza = piezaCon([{ tipo: "numerico", afecta: { modo: "ninguna" }, mecanismo: null, estado: "construido" }]);
    assert.equal(generaAccionPropia(pieza), false);
  });

  test("sin motor en absoluto (undefined), no genera y no revienta", () => {
    const pieza = { familia: "arma" } as unknown as Equipo;
    assert.equal(generaAccionPropia(pieza), false);
  });

  test("una construida y otra bloqueada a la vez (patrón Kerzul/Armas Mecánicas) — basta con que una lo esté", () => {
    const pieza = piezaCon([
      { tipo: "accion", afecta: { modo: "accion_nueva", id: "ataque_melee" }, mecanismo: "accion_equipo", estado: "construido" },
      {
        tipo: "accion",
        afecta: { modo: "accion_nueva", id: "derribo_arma_mecanica" },
        mecanismo: "accion_equipo",
        estado: "bloqueado",
        bloqueoPor: "pregunta de prueba",
      },
    ]);
    assert.equal(generaAccionPropia(pieza), true);
  });
});
