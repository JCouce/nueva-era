import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { ACCIONES, type Accion, type Resultado } from "./acciones";
import { HABILIDADES } from "./habilidades";
import { resolverFicha, conExtrasDeFicha, VITALIDAD_DE_FICHA, type FichaResuelta } from "./fichaResuelta";
import { accionesDeAtaque } from "./combate";
import { equipar } from "./equipo";
import { montarTirada, eleccionSinTocar } from "./montaje";
import { DOTES } from "../catalog/dotes";
import type { EspecialidadId } from "../catalog/especialidades";
import type { TextoEnTirada } from "./especie";
import { textoTipoAccion } from "./tipoAccion";
import {
  enLinea,
  lineaAntes,
  sinFuenteRepetida,
  textosAntes,
  textosDelResultado,
  textosDeTirada,
  textosPorOrigen,
  type TextoDeTirada,
} from "./textosDeTirada";

const resolver = (s: Sheet) => resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA });

// Ficha capaz de todo (como en dotesEfectos.test.ts): 5 en atributos y habilidades, con las
// especialidades que piden los requisitos de las dotes.
function capaz(patch: Partial<Sheet> = {}): Sheet {
  const base = defaultSheet();
  const especialidades: Record<string, EspecialidadId[]> = {};
  for (const d of DOTES)
    for (const r of d.requisitos.flatMap((x) => (x.tipo === "uno_de" ? x.opciones : [x])))
      if (r.tipo === "especialidad") (especialidades[r.habilidad] ??= []).push(r.id);
  return {
    ...base,
    atributos: Object.fromEntries(Object.keys(base.atributos).map((k) => [k, 5])) as Sheet["atributos"],
    habilidades: Object.fromEntries(
      HABILIDADES.map((h) => [h.id, { valor: 5, especialidades: [...new Set(especialidades[h.id] ?? [])] }]),
    ) as Sheet["habilidades"],
    ...patch,
  };
}

// Los aumentos van a `equipo` tal cual (como conAumento en tiradasFijas.test.ts).
const conPiezas = (s: Sheet, ...piezas: { catalogoId: string; nivel?: number; eleccion?: string }[]): Sheet => ({
  ...s,
  equipo: [...s.equipo, ...piezas.map((p, i) => ({ instanciaId: `aum${i}`, ...p }))],
});
const ARMAS = ["pelea_punetazo", "espada_cuchillo_combate", "pistola_bellum", "arco_tactico", "fusil_asalto_impetus"];
const armado = (s: Sheet) => ARMAS.reduce((x, catalogoId, i) => equipar(x, { instanciaId: `a${i}`, catalogoId }), s);
const INTROGRESION = "aum_introgresion_sensorial_heterologa";
const SENTIDOS = ["vision_nocturna", "vision_termica", "percepcion_electromagnetica", "espectro_ultravioleta", "deteccion_quimica", "ecolocalizacion"];

// El conjunto de caracterización: las especies con textos, todas las dotes, los sentidos de la
// Introgresión y el Ojo Biónico 4, con armas para que lleguen los textos por familia.
const FICHAS: Record<string, Sheet> = {
  zimethroni: armado(capaz({ especieId: "manduk", especieOpciones: { casta: "noble", linaje: "zimethroni" } })),
  axadren: capaz({ especieId: "manduk", especieOpciones: { casta: "noble", linaje: "axadren" } }),
  arkoru: armado(capaz({ especieId: "arkoru" })),
  riux: capaz({ especieId: "riux" }),
  arianyi: capaz({ especieId: "arianyi" }),
  todasLasDotes: armado(capaz({ dotes: DOTES.map((d) => ({ id: d.id })) })),
  sentidos: conPiezas(
    capaz(),
    ...SENTIDOS.map((eleccion) => ({ catalogoId: INTROGRESION, eleccion })),
    { catalogoId: "aum_ojo_bionico", nivel: 4 },
  ),
};

const tiradas = (f: FichaResuelta): Accion[] =>
  [...ACCIONES, ...accionesDeAtaque(f.ficha, f.modificadores, f.extrasDotes.permisos)].map((t) => conExtrasDeFicha(f, t));

// Réplica de lo que se leía antes de la fase 4 (conTextosEnTirada, textosTirada.ts hasta 2026-11-13):
// los textos de ítem se pegaban a la nota (los que no son de crítico) o al texto de crítico, con
// «(fuente)»; los efectos salían aparte.
const conFuente = (x: TextoEnTirada) => `${sinFuenteRepetida(x.texto, x.fuente)} (${x.fuente})`;
function deAntes(t: Accion): string[] {
  const ficha = t.textosDeFicha ?? [];
  return [
    ...(t.nota ? [t.nota] : []),
    ...ficha.filter((x) => !x.soloEnCritico).map(conFuente),
    ...(t.efectoCritico ? [t.efectoCritico] : []),
    ...ficha.filter((x) => x.soloEnCritico && !x.soloEnCriticoNatural).map(conFuente),
    ...(t.efectoCriticoNatural ? [t.efectoCriticoNatural] : []),
    ...ficha.filter((x) => x.soloEnCriticoNatural).map(conFuente),
    ...(t.efectos ?? []).map((e) => e.texto),
    // T5c: las líneas de tipo de acción (desenfundar, recargar) son nuevas, no salían de nada.
    ...(t.tiposDeAccion ?? []).map((x) => (x.fuentes.length > 0 ? `${textoTipoAccion(x)} (${x.fuentes.map((f) => f.fuente).join(", ")})` : textoTipoAccion(x))),
  ];
}
const pieza = (x: TextoDeTirada) => enLinea([x]);

const RESULTADOS: Pick<Resultado, "exito" | "critico" | "criticoNatural">[] = [
  { exito: true, critico: true, criticoNatural: true },
  { exito: true, critico: true },
  { exito: true, critico: false },
  { exito: false, critico: false },
  { exito: false, critico: true },
  { exito: null, critico: false },
];

describe("fase 4: ningún texto se pierde (conjunto de caracterización)", () => {
  for (const [nombre, sheet] of Object.entries(FICHAS)) {
    test(nombre, () => {
      const f = resolver(sheet);
      let conTextosDeFicha = 0;
      for (const t of tiradas(f)) {
        const textos = textosDeTirada(t);
        if ((t.textosDeFicha ?? []).length > 0) conTextosDeFicha++;
        // Los mismos textos que antes, ni uno más ni uno menos.
        assert.deepEqual(textos.map(pieza).sort(), deAntes(t).sort(), t.id);
        // Antes + después = todos.
        const despues = textos.filter((x) => x.momento !== "antes");
        assert.equal(new Set([...textosAntes(textos), ...despues]).size, textos.length, t.id);
        // Algún resultado los enseña todos (con el daño ya tirado).
        const enAlgunResultado = new Set(RESULTADOS.flatMap((r) => textosDelResultado(textos, r)));
        assert.equal(enAlgunResultado.size, textos.length, t.id);
        // Las notas de la tirada montada también llegan, con su etiqueta.
        const m = montarTirada(f, t, eleccionSinTocar(t));
        const conNotas = textosDeTirada(t, m.notas);
        for (const n of m.notas) assert.ok(conNotas.some((x) => x.etiqueta === n.etiqueta && x.texto === n.nota), `${t.id}: ${n.etiqueta}`);
      }
      assert.ok(conTextosDeFicha > 0, `${nombre}: ningún texto de ficha en sus tiradas`);
    });
  }
});

describe("fase 4: momento y grado de cada texto", () => {
  test("la nota sale antes y después; el crítico, solo después y con el éxito crítico", () => {
    const t = tiradas(resolver(FICHAS.arkoru)).find((x) => x.label === "Golpear con Puñetazo")!;
    const textos = textosDeTirada(t);
    const letal = textos.find((x) => x.texto === "Daño letal.")!;
    assert.deepEqual([letal.momento, letal.grado, letal.fuente], ["despues", "critico", "Matriz Biometálica · Arköru"]);
    assert.ok(!textosAntes(textos).includes(letal));
    // El fracaso crítico no es un éxito crítico.
    assert.ok(!textosDelResultado(textos, { exito: false, critico: true }).includes(letal));
    assert.ok(textosDelResultado(textos, { exito: true, critico: true }).includes(letal));
  });

  test("Zimethroni (es-05): la casilla gratis tras esquivar sale con el éxito, no antes", () => {
    const t = conExtrasDeFicha(resolver(FICHAS.zimethroni), ACCIONES.find((a) => a.id === "defensa")!);
    const textos = textosDeTirada(t);
    const tras = textos.find((x) => /una casilla de movimiento gratis/.test(x.texto))!;
    assert.deepEqual([tras.momento, tras.grado, tras.origen.label], ["despues", "exito", "Tras esquivar"]);
    assert.doesNotMatch(lineaAntes(t), /movimiento gratis/);
    assert.ok(textosDelResultado(textos, { exito: true, critico: false }).includes(tras));
    assert.ok(!textosDelResultado(textos, { exito: false, critico: false }).includes(tras));
    // Sin dificultad no hay grado: sale, para que se aplique si el máster dice que ha salido.
    assert.ok(textosDelResultado(textos, { exito: null, critico: false }).includes(tras));
  });

  test("los efectos de un ataque esperan al daño; los de una tirada sin daño, no", () => {
    const efecto = (ataque: boolean): Accion => ({
      id: "x",
      label: "X",
      grupo: "Acciones",
      aplicado: "reflejos",
      habilidad: null,
      efectos: [{ fuente: "Puntero Láser", texto: "−2 a tu Sigilo." }],
      ...(ataque && { ataque: { modos: [{ id: "m", danio: 1, formulaDanio: null, categoriaDanio: "letal" }] } }),
    }) as Accion;
    const exito = { exito: true, critico: false };
    assert.equal(textosDelResultado(textosDeTirada(efecto(true)), exito, true).length, 0);
    assert.equal(textosDelResultado(textosDeTirada(efecto(true)), exito, false).length, 1);
    assert.equal(textosDelResultado(textosDeTirada(efecto(false)), exito, true).length, 1);
    const [x] = textosDeTirada(efecto(false));
    assert.deepEqual([x.momento, x.etiqueta], ["despues", "Puntero Láser"]);
  });

  test("casillas marcadas: antes, con su etiqueta; resolución (crítico fijo): después", () => {
    const base = capaz({ dotes: [{ id: "dote_critico_mejorado", eleccion: "espadas_y_dagas" }] });
    const conEsp = { ...base, habilidades: { ...base.habilidades, combate_melee: { valor: 5, especialidades: ["espadas_y_dagas" as EspecialidadId] } } };
    const f = resolver(armado(conEsp));
    const t = tiradas(f).find((x) => x.criticoFijo)!;
    const m = montarTirada(f, t, eleccionSinTocar(t));
    const critico = textosDeTirada(t, m.notas).find((x) => x.etiqueta === "Crítico Mejorado: Espadas y Dagas")!;
    assert.equal(critico.momento, "despues");
    assert.equal(critico.origen.tipo, "dote");
    // La casilla de Empatía Biológica (Arianyi) marcada: su nota, antes y con el rasgo de origen.
    const a = resolver(FICHAS.arianyi);
    const buscar = conExtrasDeFicha(a, ACCIONES.find((x) => x.id === "alerta_activa")!);
    const casilla = buscar.condiciones!.find((c) => c.id.includes("empatia"))!;
    const eleccion = eleccionSinTocar(buscar);
    const marcada = montarTirada(a, buscar, { ...eleccion, estadoCondiciones: { ...eleccion.estadoCondiciones, [casilla.id]: true } });
    const nota = textosDeTirada(buscar, marcada.notas).find((x) => x.etiqueta === casilla.etiqueta)!;
    assert.deepEqual([nota.momento, nota.texto, nota.origen.tipo], ["antes", "Requiere concentración; en combate, acción compleja.", "especie"]);
  });

  test("agrupados por el ítem que los trae, en orden de aparición", () => {
    const t = conExtrasDeFicha(resolver(FICHAS.zimethroni), ACCIONES.find((a) => a.id === "defensa")!);
    assert.deepEqual(
      textosPorOrigen(textosDeTirada(t)).map((g) => g.origen.label),
      ["Defensa / esquiva", "Tensión ósea", "Tras esquivar"],
    );
  });
});

describe("es-05 y au-06: rasgos y sentidos en la tirada donde se usan", () => {
  const fija = (s: Sheet, id: string) => conExtrasDeFicha(resolver(s), ACCIONES.find((a) => a.id === id)!);

  // La Apnea va con la salvación de la asfixia, que es de Voluntad desde el sync Drive 2026-11-14.
  test("Riux (Estasis) en la Salvación de Fortaleza y Arianyi (Apnea) en la de Voluntad, solo con el rasgo", () => {
    assert.match(lineaAntes(fija(FICHAS.riux, "salv_fortaleza")), /^.*Estasis: entras y sales de estasis/);
    assert.match(lineaAntes(fija(FICHAS.arianyi, "salv_voluntad")), /Apnea: aguantas el doble que un humano sin respirar/);
    assert.doesNotMatch(lineaAntes(fija(FICHAS.arianyi, "salv_fortaleza")), /Apnea/);
    assert.doesNotMatch(lineaAntes(fija(capaz(), "salv_fortaleza")), /Estasis|Apnea/);
    assert.doesNotMatch(lineaAntes(fija(capaz(), "salv_voluntad")), /Apnea/);
  });

  test("Axadren: visión infrarroja en Buscar / percibir", () => {
    assert.match(lineaAntes(fija(FICHAS.axadren, "alerta_activa")), /Visión infrarroja: ves el calor/);
  });

  test("una línea por sentido en Buscar / percibir: los seis de la Introgresión y el Ojo Biónico", () => {
    const linea = lineaAntes(fija(FICHAS.sentidos, "alerta_activa"));
    for (const sentido of [
      /Visión Nocturna: /,
      /Visión Térmica: ves el infrarrojo/,
      /Percepción Electromagnética: detectas campos/,
      /Espectro Ultravioleta: /,
      /Detección Química: /,
      /Ecolocalización: mapeas a oscuras o bajo el agua hasta 20 m \(40 m en agua\)/,
      /Visión nocturna y termo-óptica: hasta 500 m/,
    ])
      assert.match(linea, sentido);
    // El Ojo 4 sustituye los rayos X del 3 (10 m → 50 m).
    assert.match(linea, /Rayos X: ves a través de paredes ligeras o blindajes no reforzados, hasta 50 m/);
    assert.doesNotMatch(linea, /tejidos sencillos, hasta 10 m/);
    const ojo3 = lineaAntes(fija(conPiezas(capaz(), { catalogoId: "aum_ojo_bionico", nivel: 3 }), "alerta_activa"));
    assert.match(ojo3, /Rayos X: ves a través de tejidos sencillos, hasta 10 m/);
    assert.match(ojo3, /Visión nocturna y termo-óptica/);
    // Sin sentidos, nada.
    assert.doesNotMatch(lineaAntes(fija(capaz(), "alerta_activa")), /Ecolocalización|Rayos X/);
  });
});
