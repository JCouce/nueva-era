import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { conExtrasDeFicha, conExtrasDirectaDeFicha, resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";
import { accionesDeAtaque } from "./combate";
import { accionesDeFarmacos, accionesDirectasDeFarmacos } from "./farmacos";
import { equipar } from "./equipo";
import { lineaAntes } from "./textosDeTirada";
import type { Accion } from "./acciones";
import {
  idSelectorTipoAccion,
  rebajaTipoAccionSchema,
  resolverTipoAccion,
  selectorTipoAccion,
  textoTipoAccion,
  type RebajaConFuente,
} from "./tipoAccion";

const resolver = (s: Sheet) => resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA });

function ficha(...piezas: { catalogoId: string; nivel?: number; host?: string }[]): Sheet {
  let s: Sheet = {
    ...defaultSheet(),
    atributos: { ...defaultSheet().atributos, agilidad: 3 },
    habilidades: { ...defaultSheet().habilidades, combate_distancia: { valor: 3, especialidades: [] } },
  };
  piezas.forEach((p, i) => {
    const instaladoEnId = p.host ? s.equipo.find((x) => x.catalogoId === p.host)?.instanciaId : undefined;
    s = equipar(s, { instanciaId: `p${i}`, catalogoId: p.catalogoId, ...(p.nivel && { nivel: p.nivel }), ...(instaladoEnId && { instaladoEnId }) });
  });
  return s;
}
const conDote = (s: Sheet, id: string): Sheet => ({ ...s, dotes: [...s.dotes, { id }] });

function filas(s: Sheet): Accion[] {
  const f = resolver(s);
  return accionesDeAtaque(s, f.modificadores, f.extrasDotes.permisos).map((t) => conExtrasDeFicha(f, t));
}
const fila = (s: Sheet, catalogoId: string) => {
  const p = s.equipo.find((x) => x.catalogoId === catalogoId)!;
  return filas(s).find((t) => t.id.endsWith(`_${p.instanciaId}`) && t.grupo === "Ataques")!;
};
const tipo = (t: Accion, accion: string) => t.tiposDeAccion?.find((x) => x.accion === accion);

const RR: RebajaConFuente[] = [
  { accion: "recargar", op: "baja_un_paso", desde: ["compleja", "estandar"], soloArmaDeFuego: true, fuente: "Recarga Relámpago" },
  { accion: "recargar", op: "alternativa", a: ["gratuita", "reaccion"], limite: { veces: 1, por: "turno" }, desde: ["simple"], soloArmaDeFuego: true, fuente: "Recarga Relámpago" },
];

describe("resolverTipoAccion", () => {
  test("sin rebajas, el de la fuente; sin tipo en la fuente y sin nada que lo fije, no hay línea", () => {
    const t = resolverTipoAccion({ accion: "recargar", base: ["estandar"], armaDeFuego: true }, [])!;
    assert.equal(textoTipoAccion(t), "Recargar: acción estándar");
    assert.deepEqual(t.fuentes, []);
    assert.equal(resolverTipoAccion({ accion: "desenfundar", base: null, empleo: "una mano" }, []), null);
  });

  test("Recarga Relámpago baja un grado la compleja y la estándar, nunca por debajo de simple", () => {
    const compleja = resolverTipoAccion({ accion: "recargar", base: ["compleja"], armaDeFuego: true }, RR)!;
    assert.deepEqual(compleja.normal, ["estandar"]);
    assert.equal(compleja.limitadas.length, 0);
    // «Si la acción de recarga ya es simple»: la de la fuente, no la que la dote deja en simple.
    const estandar = resolverTipoAccion({ accion: "recargar", base: ["estandar"], armaDeFuego: true }, RR)!;
    assert.deepEqual(estandar.normal, ["simple"]);
    assert.equal(estandar.limitadas.length, 0);
  });

  test("ya simple: la alternativa gratuita o reacción una vez por turno, con selector frente a la simple", () => {
    const t = resolverTipoAccion({ accion: "recargar", base: ["simple"], armaDeFuego: true }, RR)!;
    assert.deepEqual(t.normal, ["simple"]);
    assert.equal(textoTipoAccion(t), "Recargar: acción simple, o acción gratuita o reacción, una vez por turno");
    const sel = selectorTipoAccion(t)!;
    assert.equal(sel.id, idSelectorTipoAccion("recargar"));
    assert.ok(sel.tipo === "opcion");
    assert.deepEqual(
      sel.opciones.map((o) => [o.id, o.etiqueta, o.valor]),
      [
        ["limitada_0", "Acción gratuita o reacción", 0],
        ["normal", "Acción simple", 0],
      ],
    );
    assert.equal(sel.porDefecto, "limitada_0");
  });

  test("Recarga Relámpago solo con armas de fuego; sin límite no hay selector", () => {
    assert.deepEqual(resolverTipoAccion({ accion: "recargar", base: ["estandar"] }, RR)!.normal, ["estandar"]);
    const sinLimite = resolverTipoAccion({ accion: "inyectarse", base: ["compleja"] }, [
      { accion: "inyectarse", op: "sustituye", a: ["simple"], fuente: "Inyector Hipodérmico 1" },
    ])!;
    assert.equal(selectorTipoAccion(sinLimite), null);
  });

  test("sustituir nunca encarece; la Funda 1 solo a una mano", () => {
    const funda: RebajaConFuente = { accion: "desenfundar", op: "sustituye", a: ["gratuita"], empleo: "una mano", fuente: "Funda Automática 1" };
    assert.deepEqual(resolverTipoAccion({ accion: "desenfundar", base: ["simple"], empleo: "una mano" }, [funda])!.normal, ["gratuita"]);
    assert.deepEqual(resolverTipoAccion({ accion: "desenfundar", base: ["simple"], empleo: "dos manos" }, [funda])!.normal, ["simple"]);
    const caro: RebajaConFuente = { accion: "inyectarse", op: "sustituye", a: ["compleja"], fuente: "x" };
    assert.deepEqual(resolverTipoAccion({ accion: "inyectarse", base: ["simple"] }, [caro])!.normal, ["simple"]);
  });

  test("el catálogo valida la forma de la rebaja", () => {
    assert.ok(rebajaTipoAccionSchema.safeParse({ accion: "recargar", op: "baja_un_paso" }).success);
    assert.equal(rebajaTipoAccionSchema.safeParse({ accion: "recargar", op: "baja_un_paso", a: ["simple"] }).success, false);
    assert.equal(rebajaTipoAccionSchema.safeParse({ accion: "recargar", op: "sustituye", a: ["simple"], limite: { veces: 1, por: "turno" } }).success, false);
  });
});

describe("líneas en los ataques (combate.ts + conExtrasDeFicha)", () => {
  test("arma de fuego: desenfundar y recargar de su tipo", () => {
    const precision = fila(ficha({ catalogoId: "fusil_precision_telum" }), "fusil_precision_telum");
    assert.match(lineaAntes(precision), /Desenfundar: acción estándar/);
    assert.match(lineaAntes(precision), /Recargar: acción compleja/);
  });

  test("Impetus (fusil de asalto): con Recarga Relámpago recarga simple; Mosquito (pistola), selector", () => {
    const s = conDote(ficha({ catalogoId: "fusil_asalto_impetus" }, { catalogoId: "pistola_mosquito" }), "dote_recarga_relampago");
    const impetus = fila(s, "fusil_asalto_impetus");
    assert.match(lineaAntes(impetus), /Desenfundar: acción simple/);
    assert.match(lineaAntes(impetus), /Recargar: acción simple \(Recarga Relámpago\)/);
    assert.equal(impetus.condiciones?.some((c) => c.id === idSelectorTipoAccion("recargar")), false);
    const mosquito = fila(s, "pistola_mosquito");
    assert.match(lineaAntes(mosquito), /Recargar: acción simple, o acción gratuita o reacción, una vez por turno \(Recarga Relámpago\)/);
    assert.equal(mosquito.condiciones?.filter((c) => c.id === idSelectorTipoAccion("recargar")).length, 1);
    // Volver a pasar por conExtrasDeFicha no duplica el selector.
    const otraVez = conExtrasDeFicha(resolver(s), mosquito);
    assert.equal(otraVez.condiciones?.filter((c) => c.id === idSelectorTipoAccion("recargar")).length, 1);
  });

  test("el arco recarga como simple o reacción y Recarga Relámpago no lo toca (no es arma de fuego)", () => {
    const arco = fila(conDote(ficha({ catalogoId: "arco_tactico" }), "dote_recarga_relampago"), "arco_tactico");
    assert.equal(textoTipoAccion(tipo(arco, "recargar")!), "Recargar: acción simple o reacción");
    assert.deepEqual(tipo(arco, "recargar")!.fuentes, []);
    assert.doesNotMatch(arco.nota ?? "", /Recarga:/);
  });

  test("Funda Automática: gratuita a una mano (nivel 1), también a dos manos (nivel 2), con su fuente", () => {
    const base = [{ catalogoId: "armadura_ligera" }, { catalogoId: "fusil_asalto_impetus" }, { catalogoId: "pistola_mosquito" }];
    const n1 = ficha(...base, { catalogoId: "funda_automatica", nivel: 1, host: "armadura_ligera" });
    assert.match(lineaAntes(fila(n1, "pistola_mosquito")), /Desenfundar: acción gratuita\. Solo el arma que lleves en la funda\. \(Funda Automática 1\)/);
    assert.match(lineaAntes(fila(n1, "fusil_asalto_impetus")), /Desenfundar: acción simple(?! \()/);
    const n2 = ficha(...base, { catalogoId: "funda_automatica", nivel: 2, host: "armadura_ligera" });
    assert.match(lineaAntes(fila(n2, "fusil_asalto_impetus")), /Desenfundar: acción gratuita\. .*\(Funda Automática 2\)/);
    assert.equal(tipo(fila(n2, "fusil_asalto_impetus"), "desenfundar")!.fuentes[0].origen?.id, "funda_automatica");
  });

  test("armas melee: sin tipo en la fuente, solo sale con la Funda; la Pelea no se desenfunda", () => {
    const sin = ficha({ catalogoId: "espada_cuchillo_combate" }, { catalogoId: "pelea_punetazo" });
    assert.equal(tipo(fila(sin, "espada_cuchillo_combate"), "desenfundar"), undefined);
    const con = ficha(
      { catalogoId: "armadura_ligera" },
      { catalogoId: "espada_cuchillo_combate" },
      { catalogoId: "pelea_punetazo" },
      { catalogoId: "funda_automatica", nivel: 1, host: "armadura_ligera" },
    );
    assert.match(lineaAntes(fila(con, "espada_cuchillo_combate")), /Desenfundar: acción gratuita/);
    assert.equal(fila(con, "pelea_punetazo").tiposDeAccionBase, undefined);
  });

  test("sin pasar por la ficha, textosDeTirada enseña el tipo de la fuente", () => {
    const s = ficha({ catalogoId: "pistola_mosquito" });
    const f = resolver(s);
    const cruda = accionesDeAtaque(s, f.modificadores, f.extrasDotes.permisos).find((t) => t.grupo === "Ataques")!;
    assert.equal(cruda.tiposDeAccion, undefined);
    assert.match(lineaAntes(cruda), /Desenfundar: acción simple · Recargar: acción simple/);
  });
});

describe("Inyectarse en «Usar [fármaco]»", () => {
  const conFarmacos = (s: Sheet): Sheet => ({ ...s, farmacos: { ...s.farmacos, farmaco_gel_sanador: 2, farmaco_analgesico: 1 } });

  test("de base, el de la fuente; con armadura, el de quien la viste", () => {
    const sin = conFarmacos(ficha());
    const gel = accionesDeFarmacos(sin, []).find((t) => t.farmacoId === "farmaco_gel_sanador")!;
    assert.match(lineaAntes(conExtrasDeFicha(resolver(sin), gel)), /Inyectarse: acción compleja/);
    const analgesico = accionesDirectasDeFarmacos(sin, []).find((d) => d.farmacoId === "farmaco_analgesico")!;
    assert.match(conExtrasDirectaDeFicha(resolver(sin), analgesico).nota!, /Inyectarse: acción estándar/);
    const conArmadura = conFarmacos(ficha({ catalogoId: "armadura_ligera" }));
    const analgesico2 = accionesDirectasDeFarmacos(conArmadura, []).find((d) => d.farmacoId === "farmaco_analgesico")!;
    assert.match(conExtrasDirectaDeFicha(resolver(conArmadura), analgesico2).nota!, /Inyectarse: acción compleja/);
  });

  test("Inyector 1: simple; Inyector 2: además gratuita o reacción una vez por turno, con selector", () => {
    const n1 = conFarmacos(ficha({ catalogoId: "armadura_ligera" }, { catalogoId: "inyector_hipodermico", nivel: 1, host: "armadura_ligera" }));
    const gel1 = conExtrasDeFicha(resolver(n1), accionesDeFarmacos(n1, []).find((t) => t.farmacoId === "farmaco_gel_sanador")!);
    assert.match(lineaAntes(gel1), /Inyectarse: acción simple\. Solo sobre ti\. \(Inyector Hipodérmico 1\)/);
    assert.equal(gel1.condiciones?.some((c) => c.id === idSelectorTipoAccion("inyectarse")) ?? false, false);

    const n2 = conFarmacos(ficha({ catalogoId: "armadura_ligera" }, { catalogoId: "inyector_hipodermico", nivel: 2, host: "armadura_ligera" }));
    const gel2 = conExtrasDeFicha(resolver(n2), accionesDeFarmacos(n2, []).find((t) => t.farmacoId === "farmaco_gel_sanador")!);
    assert.match(lineaAntes(gel2), /Inyectarse: acción simple, o acción gratuita o reacción, una vez por turno\. Solo sobre ti\. \(Inyector Hipodérmico 2\)/);
    const sel = gel2.condiciones?.find((c) => c.id === idSelectorTipoAccion("inyectarse"));
    assert.ok(sel?.tipo === "opcion");
    assert.deepEqual(sel.opciones.map((o) => o.id), ["limitada_0", "normal"]);
    const analgesico = accionesDirectasDeFarmacos(n2, []).find((d) => d.farmacoId === "farmaco_analgesico")!;
    const directa = conExtrasDirectaDeFicha(resolver(n2), analgesico);
    assert.match(directa.nota!, /Inyectarse: acción simple, o acción gratuita o reacción, una vez por turno/);
    assert.ok(directa.condiciones?.some((c) => c.id === idSelectorTipoAccion("inyectarse")));
  });

  test("Valija Táctica Médica 3: administrar como acción simple", () => {
    const s = conFarmacos(ficha({ catalogoId: "valija_tactica_medica", nivel: 3 }));
    const gel = conExtrasDeFicha(resolver(s), accionesDeFarmacos(s, []).find((t) => t.farmacoId === "farmaco_gel_sanador")!);
    assert.match(lineaAntes(gel), /Inyectarse: acción simple \(Valija Táctica Médica \(VTM\) 3\)/);
  });
});
