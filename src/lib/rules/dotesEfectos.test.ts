import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { defaultSheet, type Sheet } from "./sheet";
import { ACCIONES, GRUPOS_ACCION, type Accion } from "./acciones";
import { HABILIDADES } from "./habilidades";
import { resolverFicha, conExtrasDeFicha, VITALIDAD_DE_FICHA, type FichaResuelta } from "./fichaResuelta";
import { montarTirada, eleccionSinTocar } from "./montaje";
import { motorMetadataSchema, erroresDeMotorMetadata } from "./motor";
import { dotesActivas, casillasDeDotes, textosDeDotes, modificadoresDeDotes } from "./dotesEfectos";
import { valoresRequisitoDeFicha } from "./dotes";
import { fuentesDeCapa1 } from "./capa1";
import { nivelesDePsionica, SIN_BONOS_DISCIPLINA } from "./psionica";
import type { AlcanceModificador, GrupoAccion } from "./modificadores";
import { DOTES, NOMBRES_ESPECIALIDAD_DOTES } from "../catalog/dotes";
import { DESTINOS_DOTES, EXCEPCIONES_TANDA, TANDAS_DOTES, type TandaDote } from "../catalog/dotesDestinos";
import type { DoteComprada } from "./dotesCompradas";

// ── Catálogo: todo efecto del borrador tiene destino ─────────────────────

type DoteBorrador = { id: string; efectos: unknown[] };
const BORRADOR = (JSON.parse(readFileSync(new URL("../../../docs/modelado-dotes.json", import.meta.url), "utf8")) as { dotes: DoteBorrador[] }).dotes;

describe("catálogo de dotes: efectos (D2a)", () => {
  test("cada efecto del borrador está en el catálogo (recuento por dote)", () => {
    const errores: string[] = [];
    assert.equal(DOTES.length, BORRADOR.length);
    for (const b of BORRADOR) {
      const d = DOTES.find((x) => x.id === b.id);
      if (!d) {
        errores.push(`${b.id}: no está en el catálogo`);
        continue;
      }
      const indices = [...new Set(d.efectos.map((e) => e.borrador))].sort((x, y) => x - y);
      const esperados = b.efectos.map((_, i) => i);
      if (indices.join(",") !== esperados.join(","))
        errores.push(`${b.id}: borrador ${b.efectos.length} efectos [${esperados}], catálogo cubre [${indices}]`);
    }
    assert.deepEqual(errores, []);
  });

  test("cada efecto está construido, es texto o está pendiente de una tanda D2b-1/D2b-2/D2c/D2d", () => {
    const errores: string[] = [];
    for (const d of DOTES) {
      if (d.motor.length !== d.efectos.length) errores.push(`${d.id}: ${d.motor.length} motor para ${d.efectos.length} efectos`);
      d.motor.forEach((m, i) => {
        const parsed = motorMetadataSchema.safeParse(m);
        if (!parsed.success) errores.push(`${d.id}#${i}: MotorMetadata inválido`);
        for (const e of erroresDeMotorMetadata(m)) errores.push(`${d.id}#${i}: ${e}`);
        const esTexto = m.tipo === "texto" || m.tipo === "narrativo";
        const pendienteDeTanda = m.estado === "pendiente" && TANDAS_DOTES.includes(m.bloqueoPor as TandaDote);
        if (m.estado !== "construido" && !esTexto && !pendienteDeTanda)
          errores.push(`${d.id}#${i}: ${m.estado} ${m.bloqueoPor ?? ""} (ni construido, ni texto, ni pendiente de tanda)`);
        if (m.estado === "pendiente" && !TANDAS_DOTES.includes(m.bloqueoPor as TandaDote))
          errores.push(`${d.id}#${i}: pendiente sin tanda (${m.bloqueoPor})`);
      });
    }
    assert.deepEqual(errores, []);
  });

  test("todo alcance/lugar del catálogo tiene destino en la tabla", () => {
    const sinDestino = DOTES.flatMap((d) =>
      d.efectos.flatMap((e) => {
        const clave = e.tipo === "texto" ? e.lugar : e.tipo === "habilita" ? e.accion : "alcance" in e ? e.alcance : null;
        return clave !== null && !DESTINOS_DOTES[clave] ? [`${d.id}: ${clave}`] : [];
      }),
    );
    assert.deepEqual(sinDestino, []);
  });

  test("todo destino de la tabla resuelve a una tirada, grupo o habilidad que existe", () => {
    const tiradas = new Set(ACCIONES.map((a) => a.id));
    const grupos = new Set<GrupoAccion>([...GRUPOS_ACCION, "Ataques", "Herramientas", "Fármacos", "Psiónica"]);
    const habilidades = new Set<string>(HABILIDADES.map((h) => h.id));
    const resuelve = (a: AlcanceModificador): boolean => {
      switch (a.tipo) {
        case "tiradaId":
          return tiradas.has(a.id);
        case "grupo":
          return grupos.has(a.grupo);
        case "habilidad":
          return habilidades.has(a.habilidad) && ACCIONES.some((t) => t.habilidad === a.habilidad);
        case "grupoHabilidad":
          return ACCIONES.some((t) => t.grupo === a.grupo && t.habilidad === a.habilidad);
        default:
          return false;
      }
    };
    const errores: string[] = [];
    for (const [clave, destino] of Object.entries(DESTINOS_DOTES)) {
      if (destino.tipo !== "tirada") continue;
      if (!resuelve(destino.alcance)) errores.push(`${clave}: alcance ${JSON.stringify(destino.alcance)} no existe`);
      for (const id of destino.textos) if (!tiradas.has(id)) errores.push(`${clave}: texto a "${id}", que no existe`);
      if (destino.textos.length === 0) errores.push(`${clave}: sin tiradas para los textos`);
    }
    assert.deepEqual(errores, []);
  });

  test("las excepciones de tanda apuntan a efectos que existen", () => {
    for (const clave of Object.keys(EXCEPCIONES_TANDA)) {
      const [id, n] = clave.split("#");
      const d = DOTES.find((x) => x.id === id);
      assert.ok(d?.efectos.some((e) => e.borrador === Number(n)), clave);
    }
  });
});

// ── Reglas: lo que una dote pone en la tirada ─────────────────────────────

// Una ficha que cumple los requisitos de las dotes de estos tests: atributos y
// habilidades a 5, con todas las especialidades que piden los requisitos.
function fichaCapaz(dotes: DoteComprada[]): Sheet {
  const base = defaultSheet();
  const especialidades: Record<string, string[]> = {};
  for (const d of DOTES)
    for (const r of d.requisitos.flatMap((x) => (x.tipo === "uno_de" ? x.opciones : [x])))
      if (r.tipo === "especialidad") (especialidades[r.habilidad] ??= []).push(NOMBRES_ESPECIALIDAD_DOTES[r.id] ?? r.id);
  return {
    ...base,
    atributos: Object.fromEntries(Object.keys(base.atributos).map((k) => [k, 5])) as Sheet["atributos"],
    habilidades: Object.fromEntries(
      HABILIDADES.map((h) => [h.id, { valor: 5, especialidades: [...new Set(especialidades[h.id] ?? [])] }]),
    ) as Sheet["habilidades"],
    dotes,
  };
}

const resolver = (s: Sheet, libre = false) => resolverFicha(s, { estadosCombate: [], vitalidad: VITALIDAD_DE_FICHA, libre });
const tirada = (id: string): Accion => ACCIONES.find((a) => a.id === id)!;
const conExtras = (f: FichaResuelta, id: string) => conExtrasDeFicha(f, tirada(id));
const idsDeCasillas = (t: Accion) => (t.condiciones ?? []).map((c) => c.id);

describe("efectos de dotes en las tiradas (D2a)", () => {
  test("dote no comprada: nada", () => {
    const f = resolver(fichaCapaz([]));
    assert.equal(conExtras(f, "sigilo").condiciones, undefined);
    assert.ok(!f.modificadores.some((m) => m.origen === "dote"));
  });

  test("Vigilancia Táctica: +2 fijo en Iniciativa, sin casilla, en el desglose", () => {
    const f = resolver(fichaCapaz([{ id: "dote_vigilancia_tactica" }]));
    for (const id of ["iniciativa", "iniciativa_arma", "iniciativa_distraccion"]) {
      const t = conExtras(f, id);
      assert.ok(!idsDeCasillas(t).some((c) => c.startsWith("dote_vigilancia")), id);
      const m = montarTirada(f, t, eleccionSinTocar(t, false));
      assert.deepEqual(m.desglose.find((l) => l.etiqueta === "Vigilancia Táctica"), { etiqueta: "Vigilancia Táctica", valor: 2 }, id);
    }
    // No llega fuera de Iniciativa.
    const s = montarTirada(f, conExtras(f, "sigilo"), eleccionSinTocar(tirada("sigilo"), false));
    assert.ok(!s.desglose.some((l) => l.etiqueta === "Vigilancia Táctica"));
  });

  test("Movimiento Sigiloso: casilla de opción en Sigilo; con la Mejorada vale la mejor", () => {
    const basica = conExtras(resolver(fichaCapaz([{ id: "dote_movimiento_sigiloso" }])), "sigilo");
    const c = basica.condiciones!.find((x) => x.id === "dote_movimiento_sigiloso_movimiento_oculto");
    assert.ok(c && c.tipo === "opcion");
    assert.deepEqual(c.opciones.map((o) => [o.id, o.valor]), [["ninguna", 0], ["mitad", 2], ["total", 2], ["esprint", 2]]);
    assert.match(c.etiqueta, /Movimiento Sigiloso/);

    const f = resolver(fichaCapaz([{ id: "dote_movimiento_sigiloso" }, { id: "dote_movimiento_sigiloso_mejorado" }]));
    const t = conExtras(f, "sigilo");
    assert.deepEqual(idsDeCasillas(t), ["dote_movimiento_sigiloso_mejorado_movimiento_oculto"]);
    const m = montarTirada(f, t, { ...eleccionSinTocar(t, false), estadoCondiciones: { dote_movimiento_sigiloso_mejorado_movimiento_oculto: "total" } });
    const sinDote = montarTirada(f, tirada("sigilo"), eleccionSinTocar(tirada("sigilo"), false));
    assert.equal(m.modificador - sinDote.modificador, 4); // −4 → 0, no 2 + 4
  });

  test("Paso Defensivo: texto en el crítico de la esquiva, no en la nota", () => {
    const t = conExtras(resolver(fichaCapaz([{ id: "dote_paso_defensivo" }])), "defensa");
    assert.match(t.efectoCritico ?? "", /desplazarte una casilla como acción gratuita\. \(Paso Defensivo\)/);
    assert.match(t.efectoCritico ?? "", /una vez por turno/);
    assert.equal(t.nota, tirada("defensa").nota);
  });

  test("Presencia Imponente: casilla +1 en Actitud con Intimidación y el aviso del umbral", () => {
    const f = resolver(fichaCapaz([{ id: "dote_presencia_imponente" }]));
    for (const id of ["social", "iniciativa_distraccion"]) {
      const c = conExtras(f, id).condiciones?.find((x) => x.id.startsWith("dote_presencia_imponente"));
      assert.ok(c && c.tipo === "toggle", id);
      assert.equal(c.valorActivo, 1);
      assert.match(c.etiqueta, /Intimidación/);
      assert.match(c.etiqueta, /\+2 con Fuerza ≥ 5, súmalo a mano/);
    }
    // La parte del umbral sigue pendiente de D2d.
    const dote = DOTES.find((d) => d.id === "dote_presencia_imponente")!;
    assert.ok(dote.motor.some((m) => m.estado === "pendiente" && m.bloqueoPor === "D2d"));
  });

  test("texto en la nota de la tirada (Asalto Sigiloso en Sigilo)", () => {
    const t = conExtras(resolver(fichaCapaz([{ id: "dote_asalto_sigiloso" }])), "sigilo");
    assert.match(t.nota ?? "", /gastando tu reacción\. \(Asalto Sigiloso\)/);
    assert.equal(t.efectoCritico, undefined);
  });

  test("casilla marcada suma al total (Autocuidados en la Salvación de Fortaleza)", () => {
    const f = resolver(fichaCapaz([{ id: "dote_autocuidados" }]));
    const t = conExtras(f, "salv_fortaleza");
    const c = t.condiciones!.find((x) => x.id.startsWith("dote_autocuidados"))!;
    const sin = montarTirada(f, t, eleccionSinTocar(t, false));
    const con = montarTirada(f, t, { ...eleccionSinTocar(t, false), estadoCondiciones: { [c.id]: true } });
    assert.equal(con.modificador - sin.modificador, 1);
  });

  test("repetible: Especialidad Médica pone una casilla por pareja comprada", () => {
    const f = resolver(
      fichaCapaz([
        { id: "dote_especialidad_medica", eleccion: "ceguera_sordera" },
        { id: "dote_especialidad_medica", eleccion: "hemorragia_herida" },
      ]),
    );
    const casillas = (conExtras(f, "medicina").condiciones ?? []).filter((c) => c.id.startsWith("dote_especialidad_medica"));
    assert.equal(casillas.length, 2);
    assert.equal(new Set(casillas.map((c) => c.id)).size, 2);
    assert.ok(casillas.some((c) => c.etiqueta.includes("Ceguera y sordera")));
    assert.ok(casillas.some((c) => c.etiqueta.includes("Hemorragia y herida")));
  });

  test("requisito no cumplido: la dote no da efecto; el NPC (modo libre) no mira requisitos", () => {
    const s: Sheet = { ...defaultSheet(), dotes: [{ id: "dote_vigilancia_tactica" }, { id: "dote_paso_defensivo" }] };
    assert.deepEqual(dotesActivas(s, valoresRequisitoDeFicha(s)), []);
    assert.deepEqual(modificadoresDeDotes(s), []);
    assert.deepEqual(textosDeDotes(s), []);
    const f = resolver(s);
    assert.ok(!f.modificadores.some((m) => m.origen === "dote"));
    assert.equal(conExtras(f, "defensa").efectoCritico, undefined);

    const npc = resolver(s, true);
    assert.ok(npc.modificadores.some((m) => m.origen === "dote" && m.fuente === "Vigilancia Táctica"));
  });

  test("una mejorada con el requisito roto deja valer la básica", () => {
    // Sigilo 2: cumple la básica (2) y no la Mejorada (3).
    const s = fichaCapaz([{ id: "dote_movimiento_sigiloso" }, { id: "dote_movimiento_sigiloso_mejorado" }]);
    const conSigilo2 = { ...s, habilidades: { ...s.habilidades, sigilo: { valor: 2, especialidades: [] } } };
    assert.deepEqual(casillasDeDotes(conSigilo2).map((c) => c.id), ["dote_movimiento_sigiloso_movimiento_oculto"]);
  });

  test("las dotes activas entran en fuentesDeCapa1 con su motor", () => {
    const s = fichaCapaz([{ id: "dote_vigilancia_tactica" }, { id: "dote_especialidad_medica", eleccion: "ceguera_sordera" }]);
    const fuentes = fuentesDeCapa1(s, nivelesDePsionica(s, SIN_BONOS_DISCIPLINA).paraEfectos).filter((x) => x.familia === "dote");
    assert.deepEqual(fuentes.map((x) => x.instanciaId).sort(), ["dote_especialidad_medica:ceguera_sordera", "dote_vigilancia_tactica"]);
    assert.ok(fuentes.every((x) => x.motor.length > 0));
  });
});
