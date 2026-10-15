import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { ACCIONES, CONDICION_ATACANTES_ADICIONALES, type Accion } from "./acciones";
import { HABILIDADES } from "./habilidades";
import { resolverFicha, conExtrasDeFicha, VITALIDAD_DE_FICHA, type FichaResuelta } from "./fichaResuelta";
import { montarTirada, eleccionSinTocar, type EleccionTirada } from "./montaje";
import { SIN_ACCIONES_DE_DOTES } from "./dotesAcciones";
import { DOTES } from "../catalog/dotes";
import { TANDAS_DOTES } from "../catalog/dotesDestinos";
import type { EspecialidadId } from "../catalog/especialidades";
import type { DoteComprada } from "./dotesCompradas";

// Atributos a 4 y habilidades a 6; especialidades: todas las que piden los requisitos de
// dote, salvo que se pasen otras.
function ficha(dotes: DoteComprada[], esp?: Partial<Record<string, EspecialidadId[]>>): Sheet {
  const base = defaultSheet();
  const todas: Record<string, EspecialidadId[]> = {};
  for (const d of DOTES)
    for (const r of d.requisitos.flatMap((x) => (x.tipo === "uno_de" ? x.opciones : [x])))
      if (r.tipo === "especialidad") (todas[r.habilidad] ??= []).push(r.id);
  const especialidades = { ...todas, ...esp };
  return {
    ...base,
    atributos: Object.fromEntries(Object.keys(base.atributos).map((k) => [k, 4])) as Sheet["atributos"],
    habilidades: Object.fromEntries(
      HABILIDADES.map((h) => [h.id, { valor: 6, especialidades: [...new Set(especialidades[h.id] ?? [])] }]),
    ) as Sheet["habilidades"],
    dotes,
  };
}

const resolver = (s: Sheet, libre = false) => resolverFicha(s, { estadosCombate: [], vitalidad: VITALIDAD_DE_FICHA, libre });
const tirada = (f: FichaResuelta, id: string): Accion | undefined => f.accionesDotes.tiradas.find((t) => t.id === id);
const montar = (f: FichaResuelta, t: Accion, estado: EleccionTirada["estadoCondiciones"] = {}) => {
  const e = eleccionSinTocar(t, false);
  return montarTirada(f, t, { ...e, estadoCondiciones: { ...e.estadoCondiciones, ...estado } });
};

describe("catálogo: recuento de D2c (D2c-1)", () => {
  const pendientes = (tanda: string) =>
    DOTES.reduce((n, d) => n + d.motor.filter((m) => m.estado === "pendiente" && m.bloqueoPor === tanda).length, 0);

  // D2c-2 (poderes de dote y sus textos), en dotesPoderes.test.ts.
  test("D2c cerrada", () => {
    assert.ok(TANDAS_DOTES.includes("D2c"));
    assert.equal(pendientes("D2c"), 0);
  });

  test("toda acción de dote está construida", () => {
    for (const d of DOTES)
      d.efectos.forEach((e, i) => {
        if (e.tipo === "accion") assert.equal(d.motor[i].estado, "construido", `${d.id}#${i}`);
      });
  });

  test("Apoyo trae Empatía o Liderazgo; Arrollar, Pelea; Traicionero, Iniciativa de grupo extra", () => {
    const accion = (doteId: string) => {
      const e = DOTES.find((d) => d.id === doteId)!.efectos.find((x) => x.tipo === "accion");
      assert.ok(e && e.tipo === "accion");
      return e.accion;
    };
    const apoyo = accion("dote_apoyo").resolucion;
    assert.ok(apoyo.tipo === "tirada" && JSON.stringify(apoyo.especialidad) === JSON.stringify(["empatia", "liderazgo"]));
    const arrollar = accion("dote_arrollar").resolucion;
    assert.ok(arrollar.tipo === "ataque" && arrollar.aplicado === "potencia" && arrollar.habilidad === "combate_melee" && arrollar.especialidad === "pelea");
    assert.equal(accion("dote_traicionero").grupoExtra, "Iniciativa");
  });
});

describe("accionesDeDotes: qué acciones salen", () => {
  test("sin dotes: nada", () => {
    assert.equal(resolver(ficha([])).accionesDotes, SIN_ACCIONES_DE_DOTES);
  });

  test("dote sin acción propia (Paso Defensivo): nada", () => {
    assert.equal(resolver(ficha([{ id: "dote_paso_defensivo" }])).accionesDotes, SIN_ACCIONES_DE_DOTES);
  });

  test("requisito roto (S34): Burla sin la especialidad Humor no sale", () => {
    assert.ok(tirada(resolver(ficha([{ id: "dote_burla" }])), "dotes_burla"));
    assert.equal(tirada(resolver(ficha([{ id: "dote_burla" }], { actitud: ["empatia"] })), "dotes_burla"), undefined);
  });

  test("Paso Atrás (sin dado) sale con Paso Defensivo y desaparece si se quita", () => {
    const con = resolver(ficha([{ id: "dote_paso_defensivo" }, { id: "dote_paso_atras" }]));
    const paso = con.accionesDotes.directas.find((d) => d.id === "dotes_paso_atras");
    assert.ok(paso);
    assert.equal(paso.grupo, "Dotes");
    assert.match(paso.nota ?? "", /^Reacción · Solo contra un ataque melee/);
    const sin = resolver(ficha([{ id: "dote_paso_atras" }]));
    assert.equal(sin.accionesDotes.directas.find((d) => d.id === "dotes_paso_atras"), undefined);
  });

  test("el NPC (modo libre) no mira requisitos", () => {
    assert.ok(resolver(ficha([{ id: "dote_paso_atras" }]), true).accionesDotes.directas.some((d) => d.id === "dotes_paso_atras"));
  });

  test("Combinación: Usar con sus notas, sin casillas nuevas", () => {
    const f = resolver(ficha([{ id: "dote_combinacion" }]));
    const c = f.accionesDotes.directas.find((d) => d.id === "dotes_combinacion")!;
    assert.match(c.nota ?? "", /^Compleja · Tres ataques melee/);
    assert.match(c.nota ?? "", /lo recuerda la nota de Esquiva y de Bloquear/);
    assert.equal(c.condiciones, undefined);
  });

  test("gasto de materiales como texto (Optimización Biotecnológica, Potenciar Veneno)", () => {
    const f = resolver(ficha([{ id: "dote_optimizacion_biotecnologica_de_traje" }, { id: "dote_potenciar_veneno" }]));
    assert.match(tirada(f, "dotes_optimizar_soporte_vital")!.nota ?? "", /Gasta material común biológico/);
    const veneno = tirada(f, "dotes_potenciar_veneno")!;
    assert.match(veneno.nota ?? "", /Gasta material común biológico/);
    assert.match(veneno.nota ?? "", /Dificultad: 5 \+ nivel de la toxina\./);
    assert.equal(veneno.dificultadSugerida, undefined);
  });

  test("tirada con dificultad: la trae puesta, con el texto por grado (Alentar: el crítico suma al éxito)", () => {
    const t = tirada(resolver(ficha([{ id: "dote_alentar" }])), "dotes_alentar")!;
    assert.equal(t.dificultadSugerida, 7);
    assert.equal(t.aplicado, "expresion");
    assert.equal(t.habilidad, "actitud");
    assert.match(t.poder!.resultados.exito!, /^Los aliados que puedan oírte: \+1/);
    assert.match(t.poder!.resultados.critico!, /^Los aliados que puedan oírte: \+1.*Además, los aliados reducen su miedo/);
  });
});

describe("especialidad en las acciones de dote", () => {
  const apoyo = (esp: EspecialidadId[], libre = false) => {
    const f = resolver(ficha([{ id: "dote_apoyo" }], { actitud: esp }), libre);
    const t = tirada(f, "dotes_apoyo")!;
    return { t, m: montar(f, t) };
  };

  test("Apoyo con Empatía o con Liderazgo: entera, sin selector", () => {
    for (const esp of [["empatia"], ["liderazgo"], ["empatia", "liderazgo"]] as EspecialidadId[][]) {
      const { t, m } = apoyo(esp);
      assert.deepEqual(t.especialidadesAccion, ["empatia", "liderazgo"]);
      assert.equal(m.enEspecialidad, true, esp.join());
      assert.equal(m.habilidad?.valor, 6, esp.join());
      assert.equal(m.especialidadArma?.tiene, true);
    }
    assert.equal(apoyo(["liderazgo"]).m.especialidadArma?.label, "Liderazgo");
  });

  test("Apoyo sin ninguna (NPC, sin requisitos): la mitad", () => {
    const { m } = apoyo(["humor"], true);
    assert.equal(m.enEspecialidad, false);
    assert.equal(m.habilidad?.valor, 3);
    assert.deepEqual(m.especialidadArma, { id: "empatia", label: "Empatía o Liderazgo", tiene: false });
  });

  test("Apoyo: la ventaja por vínculo fuerte, como texto en la nota", () => {
    assert.match(apoyo(["empatia"]).t.nota ?? "", /vínculo de afecto con el aliado es fuerte, tienes ventaja/);
  });

  test("Traicionero: Expresión + Actitud en Manipulación; el rival tira Perspicacia + Empatía", () => {
    const f = resolver(ficha([{ id: "dote_traicionero" }]));
    const t = tirada(f, "dotes_traicionero")!;
    assert.equal(t.aplicado, "expresion");
    assert.equal(t.habilidad, "actitud");
    assert.deepEqual(t.especialidadesAccion, ["manipulacion"]);
    assert.equal(montar(f, t).enEspecialidad, true);
    assert.deepEqual(t.poder?.objetivoTira, [{ que: "Perspicacia + Empatía" }]);
    assert.match(t.nota ?? "", /Enfrentada: la dificultad es el total del rival\./);
  });

  test("Traicionero también en Iniciativa (grupo extra), con los bonos de Iniciativa", () => {
    const f = resolver(ficha([{ id: "dote_traicionero" }, { id: "dote_vigilancia_tactica" }]));
    const ini = f.accionesDotes.tiradas.find((t) => t.grupo === "Iniciativa");
    assert.ok(ini);
    assert.equal(ini.id, "dotes_traicionero__iniciativa");
    assert.equal(ini.label, "Traicionero (distracción)");
    const enDotes = tirada(f, "dotes_traicionero")!;
    assert.equal(enDotes.grupo, "Dotes");
    // Vigilancia Táctica: +2 fijo en Iniciativa.
    assert.equal(montar(f, ini).modificador - montar(f, enDotes).modificador, 2);
  });

  test("enfrentada con lo que tira el rival (Burla: Voluntad + Actitud)", () => {
    const t = tirada(resolver(ficha([{ id: "dote_burla" }])), "dotes_burla")!;
    assert.deepEqual(t.poder?.objetivoTira, [{ que: "Voluntad + Actitud" }]);
    assert.match(t.poder!.resultados.critico!, /−2/);
  });

  test("Arrollar: ataque Potencia + Combate Melee en Pelea; sin Pelea (NPC), la mitad", () => {
    const f = resolver(ficha([{ id: "dote_arrollar" }]));
    const t = tirada(f, "dotes_arrollar")!;
    assert.equal(t.aplicado, "potencia");
    assert.equal(t.habilidad, "combate_melee");
    assert.deepEqual(t.especialidadesAccion, ["pelea"]);
    assert.equal(montar(f, t).habilidad?.valor, 6);
    assert.equal(t.poder?.objetivoTira.length, 2);
    assert.match(t.nota ?? "", /^Compleja · Necesitas poder recorrer al menos 10 m/);
    const npc = resolver(ficha([{ id: "dote_arrollar" }], { combate_melee: [] }), true);
    assert.equal(montar(npc, tirada(npc, "dotes_arrollar")!).habilidad?.valor, 3);
  });

  test("sin especialidad en la resolución (Finta): selector normal", () => {
    const t = tirada(resolver(ficha([{ id: "dote_finta" }])), "dotes_finta")!;
    assert.equal(t.especialidadesAccion, undefined);
  });
});

describe("lo que otras dotes ponen en las acciones de dote", () => {
  test("Finta repetida: −2; con Maestro de Fintas, la opción «ya engañado» sin penalizador", () => {
    const f = resolver(ficha([{ id: "dote_finta" }]));
    const t = tirada(f, "dotes_finta")!;
    const c = t.condiciones?.[0];
    assert.ok(c && c.tipo === "opcion");
    assert.equal(c.etiqueta, "Finta repetida");
    assert.deepEqual(c.opciones.map((o) => o.valor), [0, -2]);
    assert.equal(montar(f, t, { [c.id]: "dote_finta" }).modificador - montar(f, t).modificador, -2);

    const fm = resolver(ficha([{ id: "dote_finta" }, { id: "dote_maestro_de_fintas" }]));
    const tm = tirada(fm, "dotes_finta")!;
    const cm = tm.condiciones?.[0];
    assert.ok(cm && cm.tipo === "opcion");
    assert.deepEqual(cm.opciones.map((o) => [o.id, o.valor]), [["no", 0], ["dote_finta", -2], ["dote_maestro_de_fintas", 0]]);
    assert.match(cm.opciones[2].etiqueta, /Maestro de Fintas/);
  });

  test("Ataque de oportunidad: textos de Poderoso y Múltiple; con Maestro Oportunista, vale la mejor", () => {
    const nota = (dotes: DoteComprada[]) =>
      resolver(ficha(dotes)).accionesDotes.directas.find((d) => d.id === "dotes_ataque_de_oportunidad")?.nota ?? "";
    assert.doesNotMatch(nota([{ id: "dote_ataque_de_oportunidad" }]), /Poderoso|Múltiple/);
    const dos = nota([{ id: "dote_ataque_de_oportunidad" }, { id: "dote_ataque_de_oportunidad_poderoso" }, { id: "dote_ataque_de_oportunidad_multiple" }]);
    assert.match(dos, /modo Estándar.*\(Ataque de Oportunidad Poderoso\)/);
    assert.match(dos, /sin gastar la reacción\. \(Ataque de Oportunidad Múltiple\)/);
    const maestro = nota([
      { id: "dote_ataque_de_oportunidad" },
      { id: "dote_ataque_de_oportunidad_multiple" },
      { id: "dote_maestro_oportunista" },
    ]);
    assert.match(maestro, /sin límite\. \(Maestro Oportunista\)/);
    assert.doesNotMatch(maestro, /Múltiple/);
    // Sin la dote base no hay acción donde ponerlos.
    assert.equal(nota([{ id: "dote_ataque_de_oportunidad_poderoso" }]), "");
  });
});

describe("Reflejos Felinos: un atacante adicional menos en la esquiva", () => {
  const esquiva = ACCIONES.find((a) => a.id === "defensa")!;
  // Bloquear usa la misma condición (combate.ts); su id no es "defensa".
  const bloquear: Accion = {
    id: "bloquear_melee_prueba",
    label: "Bloquear con prueba",
    grupo: "Defensa",
    aplicado: "reflejos",
    habilidad: "combate_melee",
    familiaArma: "bloquear_melee",
    condiciones: [CONDICION_ATACANTES_ADICIONALES],
  };
  const penal = (f: FichaResuelta, t: Accion, n: number) => {
    const conExtras = conExtrasDeFicha(f, t);
    return montar(f, conExtras, { atacantes_adicionales: n }).modificador - montar(f, conExtras, { atacantes_adicionales: 0 }).modificador;
  };
  const sin = resolver(ficha([]));
  const con = resolver(ficha([{ id: "dote_reflejos_felinos" }]));

  test("0/1/2/3 atacantes: sin la dote −0/−1/−2/−3; con ella 0/0/−1/−2 (nunca positivo)", () => {
    assert.deepEqual([0, 1, 2, 3].map((n) => penal(sin, esquiva, n) + 0), [0, -1, -2, -3]);
    assert.deepEqual([0, 1, 2, 3].map((n) => penal(con, esquiva, n) + 0), [0, 0, -1, -2]);
  });

  test("se ve en el desglose", () => {
    const t = conExtrasDeFicha(con, esquiva);
    const linea = montar(con, t, { atacantes_adicionales: 2 }).desglose.find((l) => l.etiqueta.startsWith("Atacantes adicionales"));
    assert.deepEqual(linea, { etiqueta: "Atacantes adicionales esta ronda ×2 (uno menos: Reflejos Felinos)", valor: -1 });
  });

  test("no toca Bloquear", () => {
    assert.deepEqual([0, 1, 2, 3].map((n) => penal(con, bloquear, n) + 0), [0, -1, -2, -3]);
  });

  test("requisito roto: sin efecto", () => {
    const roto = resolver({ ...ficha([{ id: "dote_reflejos_felinos" }]), habilidades: { ...ficha([]).habilidades, atletismo: { valor: 1, especialidades: [] } } });
    assert.equal(penal(roto, esquiva, 2) + 0, -2);
  });
});
