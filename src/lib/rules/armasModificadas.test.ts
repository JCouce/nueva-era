import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, parseSheet, type Sheet } from "./sheet";
import { equipar, costeDePieza, costeDeRetirar, rarezaDePieza, pesoDePieza, fabricar, encargoFabricacion, piezaEquipadaEntradaSchema } from "./equipo";
import {
  tramoDanioBasico,
  admiteModificaciones,
  validarModificaciones,
  opcionesModificacion,
  alternarModificacion,
  precioArmaModificada,
  rarezaArmaModificada,
  pesoArmaModificada,
  nombreArmaModificada,
  perfilGolpe,
  resumenArmaModificada,
  desgloseDanio,
  conversionDeArma,
  convertirArma,
  nombreDePieza,
} from "./armasModificadas";
import { accionesDeAtaque as accionesDeAtaqueCon } from "./combate";
import { modificadoresActivos } from "./derivados";
import { permisosDeDotes } from "./dotesEfectos";
import { ajustarMaterial } from "./recursos";
import { equipoPorId } from "../catalog/equipo";
import type { ArmaMelee } from "../catalog/armasMelee";
import type { ModificacionArmaId } from "../catalog/armasModificadas";

const accionesDeAtaque = (s: Sheet) => accionesDeAtaqueCon(s, modificadoresActivos(s), permisosDeDotes(s));

function arma(id: string): ArmaMelee {
  const cat = equipoPorId(id);
  assert.ok(cat?.familia === "armaMelee", id);
  return cat;
}

const ESPADA = arma("espada"); // Fue+4 / Fue+6, 100 cr., Común
const CUCHILLO = arma("espada_cuchillo_combate"); // Fue+3, 30 cr., Común, arrojadizo
const RODELA = arma("escudo_rodela"); // Fue+2, 130 cr., Común, 1 kg
const HOJA_DENTADA = arma("mecanica_hoja_dentada"); // Fue+4, 700 cr., 5 kg, no es de filo

describe("tramo de daño básico", () => {
  test("sale del +N del primer modo: 2 o menos / 3 a 6 / 7 o más", () => {
    assert.equal(tramoDanioBasico(arma("asta_baston_combate")), 0); // Fue+2
    assert.equal(tramoDanioBasico(RODELA), 0); // Fue+2
    assert.equal(tramoDanioBasico(CUCHILLO), 1); // Fue+3
    assert.equal(tramoDanioBasico(ESPADA), 1); // Fue+4 (el segundo modo, Fue+6, no cuenta)
    assert.equal(tramoDanioBasico(arma("asta_hacha_guerra")), 1); // Fue+5
    const pesada: ArmaMelee = { ...ESPADA, modos: [{ ...ESPADA.modos[0], formulaDanio: "Fue+7" }] };
    assert.equal(tramoDanioBasico(pesada), 2);
    const aPelo: ArmaMelee = { ...ESPADA, modos: [{ ...ESPADA.modos[0], formulaDanio: "Fuerza" }] };
    assert.equal(tramoDanioBasico(aPelo), 0);
  });

  test("todas las modificaciones usan el tramo del arma sin modificar", () => {
    // Térmica suma +2 de fuego al básico de la Espada, pero Electrificante sigue en la
    // fila "3 a 6" (+2, ×10), no sube.
    const perfil = perfilGolpe(ESPADA, ["termica", "electrificante"]);
    assert.deepEqual(perfil?.extras, [{ tipo: "electrico", valor: 2, fuente: "Electrificante" }]);
    assert.equal(precioArmaModificada(ESPADA, ["termica", "electrificante"]), 100 * 125 * 10);
  });
});

describe("compatibilidad", () => {
  test("ni la Pelea ni el kerzul admiten modificaciones", () => {
    assert.equal(admiteModificaciones(arma("pelea_punetazo")), false);
    assert.equal(admiteModificaciones(arma("kerzul_punal")), false);
    assert.equal(validarModificaciones(arma("kerzul_maza"), ["electrificante"]).ok, false);
    assert.equal(admiteModificaciones(ESPADA), true);
  });

  test("los escudos solo admiten Electrificante", () => {
    assert.equal(validarModificaciones(RODELA, ["electrificante"]).ok, true);
    assert.equal(validarModificaciones(RODELA, ["termica"]).ok, false);
    assert.equal(validarModificaciones(RODELA, ["plasma"]).ok, false);
  });

  test("Nanofilamento solo en armas de filo", () => {
    assert.equal(validarModificaciones(ESPADA, ["nanofilamento"]).ok, true);
    assert.equal(validarModificaciones(arma("corta_pico_cuervo"), ["nanofilamento"]).ok, true);
    assert.equal(validarModificaciones(HOJA_DENTADA, ["nanofilamento"]).ok, false);
    assert.equal(validarModificaciones(arma("corta_maza_armas"), ["nanofilamento"]).ok, false);
    assert.equal(validarModificaciones(arma("flagelo_latigo"), ["nanofilamento"]).ok, false);
  });

  test("Plasma no se combina; las otras tres, sí", () => {
    assert.equal(validarModificaciones(ESPADA, ["plasma"]).ok, true);
    assert.equal(validarModificaciones(ESPADA, ["plasma", "electrificante"]).ok, false);
    assert.equal(validarModificaciones(ESPADA, ["nanofilamento", "termica", "electrificante"]).ok, true);
    assert.equal(validarModificaciones(ESPADA, ["electrificante", "electrificante"]).ok, false);
  });

  test("el selector dice por qué no se puede marcar y alternar respeta las fijas", () => {
    const op = opcionesModificacion(ESPADA, ["electrificante"]);
    assert.equal(op.find((o) => o.id === "plasma")?.motivo, "Plasma no se combina con otras modificaciones.");
    assert.equal(op.find((o) => o.id === "termica")?.motivo, null);
    assert.deepEqual(alternarModificacion(ESPADA, ["electrificante"], "plasma"), ["electrificante"]);
    assert.deepEqual(alternarModificacion(ESPADA, ["electrificante"], "nanofilamento"), ["electrificante", "nanofilamento"]);
    assert.deepEqual(alternarModificacion(ESPADA, ["electrificante"], "electrificante", ["electrificante"]), ["electrificante"]);
  });
});

describe("coste, rareza, peso y nombre", () => {
  test("coste multiplicativo y total", () => {
    assert.equal(precioArmaModificada(CUCHILLO, ["nanofilamento"]), 30 * 300);
    assert.equal(precioArmaModificada(CUCHILLO, ["nanofilamento", "electrificante"]), 30 * 300 * 10);
    assert.equal(precioArmaModificada(ESPADA, []), 100);
  });

  test("rareza: la mayor entre el arma y sus modificaciones", () => {
    assert.equal(rarezaArmaModificada(ESPADA, ["electrificante"]), "Poco Habitual");
    assert.equal(rarezaArmaModificada(arma("corta_pico_cuervo"), ["electrificante"]), "Poco Habitual"); // el arma manda
    assert.equal(rarezaArmaModificada(ESPADA, ["electrificante", "nanofilamento"]), "Muy Extraño");
    assert.equal(rarezaArmaModificada(CUCHILLO, ["nanofilamento"]), "Muy Extraño");
  });

  test("peso: el % sobre el básico", () => {
    assert.equal(pesoArmaModificada(HOJA_DENTADA, ["electrificante"]), 6.25);
    assert.equal(pesoArmaModificada(HOJA_DENTADA, ["termica", "electrificante"]), 8);
    assert.equal(pesoArmaModificada(ESPADA, ["electrificante"]), 1.25);
    assert.equal(pesoArmaModificada(CUCHILLO, ["nanofilamento"]), 0.3);
  });

  test("nombre legible, con el adjetivo concordado", () => {
    assert.equal(nombreArmaModificada(ESPADA, ["electrificante"]), "Espada Electrificante");
    assert.equal(nombreArmaModificada(ESPADA, ["electrificante", "termica", "nanofilamento"]), "Espada de Nanofilamento Electrificante y Térmica");
    assert.equal(nombreArmaModificada(CUCHILLO, ["nanofilamento", "electrificante"]), "Cuchillo de Combate de Nanofilamento Electrificante");
    assert.equal(nombreArmaModificada(arma("espada_montante"), ["termica"]), "Montante Térmico");
    assert.equal(nombreArmaModificada(arma("asta_hacha_guerra"), ["plasma"]), "Hacha de Guerra de Plasma");
    assert.equal(nombreArmaModificada(ESPADA, []), "Espada");
  });
});

describe("el golpe", () => {
  test("Electrificante: básico cinético y el extra eléctrico aparte, en todos los modos", () => {
    const r = resumenArmaModificada(ESPADA, ["electrificante"]);
    assert.ok(r);
    assert.deepEqual(
      r.modos.map((m) => [m.formulaDanio, m.categoriaDanio, m.tipoBase, m.extras.map((e) => `${e.valor} ${e.tipo}`)]),
      [
        ["Fue+4", "Letal", "cinetico", ["2 electrico"]],
        ["Fue+6", "Letal", "cinetico", ["2 electrico"]],
      ],
    );
    assert.deepEqual(r.efectos, ["Shock (7)"]);
  });

  test("Térmica y Plasma convierten el básico y le suman su extra", () => {
    assert.deepEqual(perfilGolpe(ESPADA, ["termica"]), {
      tipoBase: "fuego",
      sumaBase: 2,
      extras: [],
      categoria: "Grave",
      efectos: ["Llamarada (7)"],
      efectosCritico: [],
      ignoraBlindaje: null,
      fuente: "Térmica",
    });
    const plasma = perfilGolpe(ESPADA, ["plasma"]);
    assert.equal(plasma?.tipoBase, "plasma");
    assert.equal(plasma?.sumaBase, 2);
    assert.equal(plasma?.categoria, "Grave");
    assert.deepEqual(plasma?.efectosCritico, ["Fusión (11)"]);
  });

  test("Nanofilamento + Térmica: golpe grave y de fuego, ignora blindaje", () => {
    const p = perfilGolpe(CUCHILLO, ["nanofilamento", "termica"]);
    assert.equal(p?.tipoBase, "fuego");
    assert.equal(p?.sumaBase, 3); // +1 grave (nano) + 2 fuego (térmica, tramo "3 a 6")
    assert.equal(p?.categoria, "Grave");
    assert.equal(p?.ignoraBlindaje, 3);
    assert.deepEqual(p?.efectos, ["Llamarada (7)", "Hemorragia (1d8 turnos)"]);
  });

  test("la tirada de golpear y la de lanzar llevan el daño, la nota y el crítico", () => {
    const base = equipar(defaultSheet(), { instanciaId: "c0", catalogoId: "espada_cuchillo_combate" });
    const mod = equipar(defaultSheet(), {
      instanciaId: "c1",
      catalogoId: "espada_cuchillo_combate",
      modificaciones: ["nanofilamento", "electrificante"],
    });
    const golpe0 = accionesDeAtaque(base).find((a) => a.id === "ataque_melee_c0")!;
    const golpe = accionesDeAtaque(mod).find((a) => a.id === "ataque_melee_c1")!;
    assert.equal(golpe.label, "Golpear con Cuchillo de Combate de Nanofilamento Electrificante");
    const m0 = golpe0.ataque!.modos[0];
    const m = golpe.ataque!.modos[0];
    assert.equal(m.danio, (m0.danio ?? 0) + 1);
    assert.equal(m.categoriaDanio, "Grave");
    assert.equal(m.tipoDanio, "cinetico");
    assert.deepEqual(m.danioExtra, [{ tipo: "electrico", valor: 2, fuente: "Electrificante" }]);
    assert.match(golpe.nota ?? "", /Shock \(7\).*Hemorragia \(1d8 turnos\)/);
    assert.equal(golpe.efectoCritico, "Hemorragia (1d6 turnos) · Hemorragia Exanguinante");
    assert.deepEqual(golpe.ignoraBlindaje, { valor: 3, fuente: "Cuchillo de Combate de Nanofilamento Electrificante" });

    const lanzar = accionesDeAtaque(mod).find((a) => a.id === "lanzar_melee_c1")!;
    assert.equal(lanzar.ataque!.modos[0].categoriaDanio, "Grave");
    assert.deepEqual(lanzar.ataque!.modos[0].danioExtra, m.danioExtra);
    assert.ok(lanzar.nota?.includes("Shock (7)"));
    assert.equal(lanzar.ignoraBlindaje?.valor, 3);

  });

  test("un arma sin modificar no cambia", () => {
    assert.equal(perfilGolpe(ESPADA, undefined), null);
    const s = equipar(defaultSheet(), { instanciaId: "e", catalogoId: "espada" });
    const m = accionesDeAtaque(s).find((a) => a.id === "ataque_melee_e")!.ataque!.modos[0];
    assert.equal(m.tipoDanio, undefined);
    assert.equal(m.danioExtra, undefined);
  });

  test("desglose del daño tirado por tipo", () => {
    assert.deepEqual(desgloseDanio(7, "cinetico", [{ tipo: "electrico", valor: 2, fuente: "Electrificante" }]), {
      partes: [
        { tipo: "cinetico", label: "Cinético", valor: 7 },
        { tipo: "electrico", label: "Eléctrico", valor: 2 },
      ],
      total: 9,
    });
    assert.equal(desgloseDanio(5, undefined, undefined), null);
  });
});

describe("sobre la ficha", () => {
  test("equipar valida las modificaciones; coste, rareza y peso las cuentan", () => {
    const s0 = defaultSheet();
    assert.equal(equipar(s0, { instanciaId: "r", catalogoId: "escudo_rodela", modificaciones: ["termica"] }), s0);
    assert.equal(equipar(s0, { instanciaId: "p", catalogoId: "pistola_mosquito", modificaciones: ["electrificante"] }), s0);
    const pieza = { instanciaId: "h", catalogoId: "mecanica_hoja_dentada", modificaciones: ["electrificante"] as ModificacionArmaId[] };
    const s = equipar(s0, pieza);
    assert.equal(costeDePieza(pieza), 700 * 10);
    assert.equal(costeDeRetirar(s, "h"), 7000);
    assert.equal(rarezaDePieza(pieza), "Poco Habitual");
    assert.equal(pesoDePieza(pieza), 6.25);
    assert.equal(nombreDePieza(pieza), "Hoja Dentada Electrificante");
  });

  test("equipar guarda las modificaciones en orden fijo", () => {
    const s = equipar(defaultSheet(), { instanciaId: "e", catalogoId: "espada", modificaciones: ["electrificante", "nanofilamento"] });
    assert.deepEqual(s.equipo[0].modificaciones, ["electrificante", "nanofilamento"]);
    const s2 = equipar(defaultSheet(), { instanciaId: "e", catalogoId: "espada", modificaciones: ["nanofilamento", "electrificante"] });
    assert.deepEqual(s2.equipo[0].modificaciones, ["electrificante", "nanofilamento"]);
  });

  test("parseSheet: una lista que ya no vale se pierde, el arma se queda", () => {
    const raw = {
      ...defaultSheet(),
      equipo: [
        { instanciaId: "r", catalogoId: "escudo_rodela", modificaciones: ["termica"] },
        { instanciaId: "e", catalogoId: "espada", modificaciones: ["laser"] },
        { instanciaId: "c", catalogoId: "espada_cuchillo_combate", modificaciones: ["nanofilamento"] },
      ],
    };
    const s = parseSheet(raw);
    assert.equal(s.equipo.length, 3);
    assert.equal(s.equipo[0].modificaciones, undefined);
    assert.equal(s.equipo[1].modificaciones, undefined);
    assert.deepEqual(s.equipo[2].modificaciones, ["nanofilamento"]);
  });

  test("la entrada del cliente rechaza una modificación desconocida", () => {
    assert.equal(piezaEquipadaEntradaSchema.safeParse({ instanciaId: "a", catalogoId: "espada", modificaciones: ["laser"] }).success, false);
    assert.equal(piezaEquipadaEntradaSchema.safeParse({ instanciaId: "a", catalogoId: "espada", modificaciones: ["plasma"] }).success, true);
  });

  test("convertir un arma que ya tienes cuesta la diferencia, y no deja quitar ni combinar Plasma", () => {
    const s = equipar(defaultSheet(), { instanciaId: "c", catalogoId: "espada_cuchillo_combate", modificaciones: ["nanofilamento"] });
    const conv = conversionDeArma(s, "c", ["nanofilamento", "electrificante"]);
    assert.ok(conv.ok);
    assert.equal(conv.coste, 30 * 300 * 10 - 30 * 300);
    assert.equal(conv.rareza, "Muy Extraño");
    assert.equal(conversionDeArma(s, "c", ["electrificante"]).ok, false); // quita nano
    assert.equal(conversionDeArma(s, "c", ["nanofilamento"]).ok, false); // nada nuevo
    assert.equal(conversionDeArma(s, "c", ["nanofilamento", "plasma"]).ok, false);
    const convertida = convertirArma(s, "c", ["nanofilamento", "electrificante"]);
    assert.deepEqual(convertida.equipo[0].modificaciones, ["electrificante", "nanofilamento"]);
    assert.equal(convertirArma(s, "c", ["plasma"]), s);
  });

  test("Fabricar: un arma nueva ya modificada, o la modificación sobre una tuya pagando la diferencia", () => {
    // Rodela 130 cr. × 5 (Electrificante, tramo "2") = 650 → 3 unidades de 250.
    let s = ajustarMaterial(defaultSheet(), "sencillos", 6);
    const encargo = encargoFabricacion(s, "escudo_rodela", { modificaciones: ["electrificante"] });
    assert.deepEqual(encargo, { ok: true, coste: 650, rareza: "Común", nombre: "Rodela Electrificante" });
    s = fabricar(s, "escudo_rodela", "sencillos", true, { modificaciones: ["electrificante"] });
    assert.equal(s.materiales.sencillos, 3);
    assert.deepEqual(s.equipo[0].modificaciones, ["electrificante"]);
    assert.equal(encargoFabricacion(s, "escudo_rodela", { modificaciones: ["termica"] }).ok, false);

    // Sobre una Rodela sin modificar: 650 − 130 = 520 → 3 unidades.
    let t = equipar(ajustarMaterial(defaultSheet(), "sencillos", 3), { instanciaId: "r", catalogoId: "escudo_rodela" });
    const sobre = { modificaciones: ["electrificante"] as ModificacionArmaId[], sobreInstanciaId: "r" };
    assert.equal((encargoFabricacion(t, "escudo_rodela", sobre) as { coste: number }).coste, 520);
    t = fabricar(t, "escudo_rodela", "sencillos", true, sobre);
    assert.equal(t.materiales.sencillos, 0);
    assert.equal(t.equipo.length, 1);
    assert.deepEqual(t.equipo[0].modificaciones, ["electrificante"]);
  });
});
