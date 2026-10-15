import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { defaultSheet, type Sheet } from "./sheet";
import { ACCIONES, GRUPOS_ACCION, type Accion } from "./acciones";
import { HABILIDADES } from "./habilidades";
import { resolverFicha, conExtrasDeFicha, conExtrasDirectaDeFicha, VITALIDAD_DE_FICHA, type FichaResuelta } from "./fichaResuelta";
import { montarTirada, eleccionSinTocar, tirarMontada } from "./montaje";
import { motorMetadataSchema, erroresDeMotorMetadata } from "./motor";
import { dotesActivas, casillasDeDotes, textosDeDotes, modificadoresDeDotes, permisosDeDotes } from "./dotesEfectos";
import { valoresRequisitoDeFicha, comprarDote, CONTEXTO_LIBRE } from "./dotes";
import { fuentesDeCapa1 } from "./capa1";
import { nivelesDePsionica, SIN_BONOS_DISCIPLINA } from "./psionica";
import { alcanzaA, FAMILIAS_ARMA, type AlcanceModificador, type ContextoAccion, type GrupoAccion } from "./modificadores";
import { equipar } from "./equipo";
import { ajustarGranada } from "./recursos";
import { accionesDeAtaque, accionesDirectasDeAtaque } from "./combate";
import { ARMAS } from "../catalog/armasFuego";
import { ARMAS_MELEE } from "../catalog/armasMelee";
import { ARMAMENTO_PESADO } from "../catalog/armamentoPesado";
import { MUNICION_GRANADA } from "../catalog/municion";
import { DOTES } from "../catalog/dotes";
import { DISCIPLINAS } from "../catalog/psionica";
import { especialidadPorId, type EspecialidadId } from "../catalog/especialidades";
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

  test("cada efecto está construido, es texto o está pendiente de una tanda D2b-1/D2b-2/D2c/D2c-2/D2d", () => {
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
        case "familiaArma":
          return FAMILIAS_ARMA.includes(a.familia);
        default:
          return false;
      }
    };
    const errores: string[] = [];
    for (const [clave, destino] of Object.entries(DESTINOS_DOTES)) {
      if (destino.tipo !== "tirada") continue;
      if (!resuelve(destino.alcance)) errores.push(`${clave}: alcance ${JSON.stringify(destino.alcance)} no existe`);
      for (const id of destino.textos) if (!tiradas.has(id)) errores.push(`${clave}: texto a "${id}", que no existe`);
      // Las de familia de arma llevan los textos por familia, no por id.
      if (destino.textos.length === 0 && destino.alcance.tipo !== "familiaArma") errores.push(`${clave}: sin tiradas para los textos`);
    }
    assert.deepEqual(errores, []);
  });

  test("todo destino de poder es una acción de psiónica o un poder de dote (D2c-2)", () => {
    const poderes = new Set([
      ...DISCIPLINAS.flatMap((d) => d.acciones.map((a) => a.id)),
      ...DOTES.flatMap((d) => d.efectos.flatMap((e) => (e.tipo === "poder" ? [e.accion.id] : []))),
    ]);
    for (const [clave, destino] of Object.entries(DESTINOS_DOTES))
      if (destino.tipo === "poder") assert.ok(poderes.has(destino.id), `${clave}: ${destino.id}`);
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

  test("Presencia Imponente: una casilla en Actitud con Intimidación, con el valor según la Fuerza (D2d)", () => {
    // fichaCapaz: Fuerza 5 → +2, y la etiqueta lo dice.
    const f = resolver(fichaCapaz([{ id: "dote_presencia_imponente" }]));
    for (const id of ["social", "iniciativa_distraccion"]) {
      const cs = (conExtras(f, id).condiciones ?? []).filter((x) => x.id.startsWith("dote_presencia_imponente"));
      assert.equal(cs.length, 1, id);
      const c = cs[0];
      assert.ok(c.tipo === "toggle", id);
      assert.equal(c.valorActivo, 2);
      assert.match(c.etiqueta, /Intimidación/);
      assert.match(c.etiqueta, /Fuerza ≥ 5/);
      assert.doesNotMatch(c.etiqueta, /súmalo a mano/);
    }
    const dote = DOTES.find((d) => d.id === "dote_presencia_imponente")!;
    assert.ok(dote.motor.every((m) => m.estado === "construido"));
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

// ── D2b-1: tiradas generadas por arma ─────────────────────────────────────

const ctxDe = (t: { id: string; grupo: GrupoAccion; habilidad?: Accion["habilidad"]; familiaArma?: Accion["familiaArma"]; empleoArma?: Accion["empleoArma"] }): ContextoAccion => ({
  id: t.id,
  grupo: t.grupo,
  habilidad: t.habilidad ?? null,
  modoElegido: null,
  familiaArma: t.familiaArma,
  empleoArma: t.empleoArma,
});

// Cada fila que la ficha puede generar con el catálogo entero: cada arma sola (con todas
// las granadas en Recursos), más Bayoneta, Lanzagranadas Integrado y Proyector de Pulso.
// Con Bloqueo y Combate Sutil (D2b-2), para que salgan también los bloqueos.
function fichaConBloqueo(): Sheet {
  const d = defaultSheet();
  return {
    ...d,
    atributos: { ...d.atributos, agilidad: 1 },
    habilidades: { ...d.habilidades, combate_melee: { valor: 1, especialidades: [] } },
    dotes: [{ id: "dote_bloqueo" }, { id: "dote_combate_sutil" }],
  };
}
function todasLasFilasDeArma(): { acciones: Accion[]; directas: ReturnType<typeof accionesDirectasDeAtaque> } {
  const acciones: Accion[] = [];
  const directas: ReturnType<typeof accionesDirectasDeAtaque> = [];
  const conGranadas = (s: Sheet) => MUNICION_GRANADA.reduce((x, g) => ajustarGranada(x, g.id, 1), s);
  const sumar = (s: Sheet) => {
    acciones.push(...accionesDeAtaque(s, [], permisosDeDotes(s)));
    directas.push(...accionesDirectasDeAtaque(s));
  };
  for (const arma of [...ARMAS, ...ARMAS_MELEE, ...ARMAMENTO_PESADO]) sumar(conGranadas(equipar(fichaConBloqueo(), { instanciaId: "x", catalogoId: arma.id })));
  let s = equipar(fichaConBloqueo(), { instanciaId: "f", catalogoId: "fusil_asalto_impetus" });
  s = equipar(s, { instanciaId: "b", catalogoId: "bayoneta", nivel: 1, instaladoEnId: "f" });
  s = conGranadas(equipar(s, { instanciaId: "l", catalogoId: "lanzagranadas_integrado", nivel: 1, instaladoEnId: "f" }));
  s = equipar(s, { instanciaId: "a", catalogoId: "armadura_pesada" });
  s = equipar(s, { instanciaId: "pp", catalogoId: "proyector_pulso", nivel: 1, instaladoEnId: "a" });
  sumar(s);
  return { acciones, directas };
}

describe("familia de arma (D2b-1): cada tirada generada por arma, en exactamente una", () => {
  const { acciones, directas } = todasLasFilasDeArma();
  const familias = (t: Parameters<typeof ctxDe>[0]) => FAMILIAS_ARMA.filter((f) => alcanzaA({ tipo: "familiaArma", familia: f }, ctxDe(t)));

  test("todo ataque, lanzamiento y bloqueo del catálogo casa con una sola familia", () => {
    assert.ok(acciones.length > 100);
    const errores = acciones.filter((t) => familias(t).length !== 1).map((t) => `${t.id}: ${familias(t).join(", ") || "ninguna"}`);
    assert.deepEqual(errores, []);
    // Las siete salen en algún sitio.
    const vistas = new Set([...acciones, ...directas].flatMap((t) => (t.familiaArma ? [t.familiaArma] : [])));
    assert.deepEqual([...vistas].sort(), [...FAMILIAS_ARMA].sort());
  });

  test("los bloqueos son bloquear_melee y nada más del grupo Defensa", () => {
    for (const t of acciones) assert.equal(t.grupo === "Defensa", t.familiaArma === "bloquear_melee", t.id);
  });

  test("Levantar escudo: levantar_escudo; la detonación de la Malla no es de arma", () => {
    const escudos = directas.filter((d) => d.label.startsWith("Levantar "));
    assert.equal(escudos.length, ARMAS_MELEE.filter((a) => a.defensa).length);
    for (const d of escudos) assert.deepEqual(familias(d), ["levantar_escudo"], d.id);
    for (const d of directas.filter((x) => !x.label.startsWith("Levantar "))) assert.deepEqual(familias(d), [], d.id);
  });

  test("Proyector de Pulso por su tipo, Bayoneta melee, lanzagranadas integrado pesado", () => {
    const de = (prefijo: string) => acciones.filter((t) => t.id.startsWith(prefijo)).map((t) => t.familiaArma);
    assert.deepEqual(de("ataque_proyector_pulso_aguijon_"), ["ataque_melee"]);
    assert.deepEqual(de("bloquear_proyector_pulso_aguijon_"), ["bloquear_melee"]);
    assert.deepEqual(de("ataque_proyector_pulso_combate_distancia_"), ["ataque_fuego"]);
    assert.deepEqual(de("ataque_proyector_pulso_tecnociencia_"), ["ataque_fuego"]);
    assert.deepEqual(de("golpear_bayoneta_"), ["ataque_melee"]);
    assert.deepEqual(de("bloquear_bayoneta_"), ["bloquear_melee"]);
    assert.deepEqual(de("lanzagranadas_"), ["ataque_pesado"]);
  });

  test("todo arma empuñada lleva su empleo (sin empleo solo el Proyector de Pulso)", () => {
    const sin = acciones.filter((t) => !t.empleoArma).map((t) => t.id);
    assert.ok(sin.every((id) => id.includes("proyector_pulso")), sin.join(", "));
  });
});

// Ficha de combate: Combate Melee y a Distancia a `cm`/`cd`, con especialidades a elegir.
function fichaCombate(dotes: DoteComprada[], { cm = 5, cd = 5, esp = [] as EspecialidadId[] } = {}): Sheet {
  const base = fichaCapaz(dotes);
  const de = (h: "combate_melee" | "combate_distancia", valor: number) => ({
    valor,
    especialidades: [...new Set([...base.habilidades[h].especialidades, ...esp.filter((e) => especialidadPorId(e)?.habilidad === h)])],
  });
  return { ...base, habilidades: { ...base.habilidades, combate_melee: de("combate_melee", cm), combate_distancia: de("combate_distancia", cd) } };
}
const armado = (s: Sheet, ...ids: string[]) => ids.reduce((x, id, i) => equipar(x, { instanciaId: `a${i}`, catalogoId: id }), s);
const filasDe = (f: FichaResuelta) => accionesDeAtaque(f.ficha, f.modificadores, f.extrasDotes.permisos).map((t) => conExtrasDeFicha(f, t));
const fila = (f: FichaResuelta, prefijo: string) => filasDe(f).find((t) => t.id.startsWith(prefijo))!;

describe("efectos de dotes en las tiradas de arma (D2b-1)", () => {
  test("Dominio Elevado: casilla +1 en los golpes melee, no en los disparos ni al lanzar", () => {
    const f = resolver(armado(fichaCombate([{ id: "dote_dominio_elevado" }, { id: "dote_bloqueo" }]), "espada_cuchillo_combate", "pistola_mosquito"));
    const golpe = fila(f, "ataque_melee_");
    const c = golpe.condiciones?.find((x) => x.id.startsWith("dote_dominio_elevado"));
    assert.ok(c && c.tipo === "toggle" && c.valorActivo === 1);
    assert.match(golpe.nota ?? "", /salvación para mantener el equilibrio.*\(Dominio Elevado\)/);
    for (const p of ["ataque_fuego_", "lanzar_melee_", "bloquear_melee_"])
      assert.ok(!(fila(f, p).condiciones ?? []).some((x) => x.id.startsWith("dote_dominio_elevado")), p);
  });

  test("casilla marcada en un ataque suma al total (Combinación −1)", () => {
    const f = resolver(armado(fichaCombate([{ id: "dote_combinacion" }]), "espada"));
    const t = fila(f, "ataque_melee_");
    const c = t.condiciones!.find((x) => x.id.startsWith("dote_combinacion"))!;
    const sin = montarTirada(f, t, eleccionSinTocar(t, false));
    const con = montarTirada(f, t, { ...eleccionSinTocar(t, false), estadoCondiciones: { ...eleccionSinTocar(t, false).estadoCondiciones, [c.id]: true } });
    assert.equal(con.modificador - sin.modificador, -1);
  });

  test("Levantar escudo: los textos de dote van a su nota", () => {
    const s = armado(fichaCombate([{ id: "dote_defensa_con_escudo_rapida" }]), "escudo_rodela");
    const f = resolver(s);
    const [levantar] = accionesDirectasDeAtaque(s).map((d) => conExtrasDirectaDeFicha(f, d));
    assert.match(levantar.nota ?? "", /con una reacción en vez de una acción simple\. \(Defensa con Escudo Rápida\)/);
  });

  test("requisito por rama (Asesino): solo en la rama que la ficha cumple", () => {
    const dotes = [{ id: "dote_asesino" }];
    const soloMelee = resolver(armado(fichaCombate(dotes, { cm: 2, cd: 0 }), "espada", "pistola_mosquito"));
    assert.match(fila(soloMelee, "ataque_melee_").nota ?? "", /\(Asesino\)/);
    assert.doesNotMatch(fila(soloMelee, "ataque_fuego_").nota ?? "", /Asesino/);
    const soloDistancia = resolver(armado(fichaCombate(dotes, { cm: 0, cd: 2 }), "espada", "pistola_mosquito"));
    assert.doesNotMatch(fila(soloDistancia, "ataque_melee_").nota ?? "", /Asesino/);
    assert.match(fila(soloDistancia, "ataque_fuego_").nota ?? "", /\(Asesino\)/);
    // NPC del máster: sin mirar requisitos, las dos ramas.
    const npc = resolver(armado(fichaCombate(dotes, { cm: 0, cd: 2 }), "espada"), true);
    assert.match(fila(npc, "ataque_melee_").nota ?? "", /\(Asesino\)/);
  });

  test("requisito por rama (Golpe Entorpecedor): las casillas, solo en la rama que cumple", () => {
    const f = resolver(armado(fichaCombate([{ id: "dote_golpe_entorpecedor" }], { cm: 1, cd: 0 }), "espada", "pistola_mosquito"));
    assert.ok(fila(f, "ataque_melee_").condiciones?.some((c) => c.id.startsWith("dote_golpe_entorpecedor")));
    assert.ok(!(fila(f, "ataque_fuego_").condiciones ?? []).some((c) => c.id.startsWith("dote_golpe_entorpecedor")));
  });

  test("filtro de arma (Desenfundado Rápido): solo en armas a una mano", () => {
    const f = resolver(armado(fichaCombate([{ id: "dote_desenfundado_rapido" }]), "pistola_mosquito", "fusil_asalto_impetus", "espada", "espada_montante"));
    const notas = filasDe(f).filter((t) => t.grupo === "Ataques" && !t.id.startsWith("lanzar_")).map((t) => [t.empleoArma, /Desenfundado Rápido/.test(t.nota ?? "")]);
    assert.ok(notas.length >= 4);
    for (const [empleo, tiene] of notas) assert.equal(tiene, empleo === "una mano", String(empleo));
  });

  describe("Tirador de Larga Distancia y su Avanzado (bono por tramo)", () => {
    const enLarga = (f: FichaResuelta, t: Accion) =>
      montarTirada(f, t, { ...eleccionSinTocar(t, false), estadoCondiciones: { ...eleccionSinTocar(t, false).estadoCondiciones, tramo: "larga" } });
    const sinDotes = (esp: EspecialidadId[]) => {
      const f = resolver(armado(fichaCombate([], { esp }), "fusil_asalto_impetus"));
      return enLarga(f, fila(f, "ataque_fuego_")).modificador;
    };
    const conDotes = (dotes: DoteComprada[], esp: EspecialidadId[]) => {
      const f = resolver(armado(fichaCombate(dotes, { esp }), "fusil_asalto_impetus"));
      const m = enLarga(f, fila(f, "ataque_fuego_"));
      return { delta: m.modificador - sinDotes(esp), desglose: m.desglose };
    };
    const conLargas: EspecialidadId[] = ["armas_de_fuego_largas"];

    test("básica: +1 en larga, vaya o no en especialidad; nada en media", () => {
      assert.equal(conDotes([{ id: "dote_tirador_de_larga_distancia" }], []).delta, 1);
      assert.equal(conDotes([{ id: "dote_tirador_de_larga_distancia" }], conLargas).delta, 1);
      const f = resolver(armado(fichaCombate([{ id: "dote_tirador_de_larga_distancia" }]), "fusil_asalto_impetus"));
      const t = fila(f, "ataque_fuego_");
      const media = montarTirada(f, t, eleccionSinTocar(t, false));
      assert.ok(!media.desglose.some((l) => l.etiqueta === "Tirador de Larga Distancia" && l.valor !== 0));
    });

    test("Avanzado: +2 (sin penalizador) solo si el ataque va en especialidad", () => {
      const con = conDotes([{ id: "dote_tirador_de_larga_distancia_avanzado" }], conLargas);
      assert.equal(con.delta, 2);
      assert.ok(con.desglose.some((l) => l.etiqueta === "Tirador de Larga Distancia Avanzado" && l.valor === 2));
      assert.equal(conDotes([{ id: "dote_tirador_de_larga_distancia_avanzado" }], []).delta, 0);
    });

    test("con las dos vale la mejor: +2 en especialidad, +1 fuera; nunca +3", () => {
      const dos = [{ id: "dote_tirador_de_larga_distancia" }, { id: "dote_tirador_de_larga_distancia_avanzado" }];
      assert.equal(conDotes(dos, conLargas).delta, 2);
      assert.equal(conDotes(dos, []).delta, 1);
    });

    test("no llega a los golpes melee", () => {
      const f = resolver(armado(fichaCombate([{ id: "dote_tirador_de_larga_distancia" }]), "espada"));
      assert.equal(fila(f, "ataque_melee_").bonosTramo, undefined);
    });
  });

  describe("Crítico Mejorado: crítico con 5, fijo y sin casilla, en su especialidad", () => {
    const f = resolver(
      armado(
        fichaCombate([{ id: "dote_critico_mejorado", eleccion: "espadas_y_dagas" }, { id: "dote_bloqueo" }], { esp: ["espadas_y_dagas", "armas_de_fuego_cortas"] }),
        "espada_cuchillo_combate",
        "pistola_mosquito",
      ),
    );
    const montar = (t: Accion) => montarTirada(f, t, eleccionSinTocar(t, false));

    test("en el golpe con un arma de la especialidad: margen 5, con su línea en las notas", () => {
      const t = fila(f, "ataque_melee_");
      assert.deepEqual(t.criticoFijo, { margen: 5, fuente: "Crítico Mejorado: Espadas y Dagas" });
      assert.ok(!(t.condiciones ?? []).some((c) => c.id.startsWith("dote_critico")));
      const m = montar(t);
      assert.equal(m.margenes.criticoExito, 5);
      assert.deepEqual(m.notas[0], { etiqueta: "Crítico Mejorado: Espadas y Dagas", nota: "Crítico con 5 éxitos en vez de 6." });
      const r = tirarMontada(m, 1, 1 + m.modificador - 5);
      assert.equal(r.critico, true);
    });

    test("no en otra especialidad, ni al lanzar el arma, ni al bloquear con ella", () => {
      for (const p of ["ataque_fuego_", "lanzar_melee_", "bloquear_melee_"]) {
        const t = fila(f, p);
        assert.equal(t.criticoFijo, undefined, p);
        assert.equal(montar(t).margenes.criticoExito, 6, p);
      }
    });
  });
});

describe("bloqueos con la especialidad del arma (S40, D2b-1)", () => {
  const bloqueo = (esp: EspecialidadId[], prefijo: string, ...ids: string[]) => {
    let s = fichaCombate([{ id: "dote_bloqueo" }], { cm: 4, esp }); // sin Bloqueo no hay fila (D2b-2)
    s = armado(s, ...ids);
    const f = resolver(s);
    const t = filasDe(f).find((x) => x.id.startsWith(prefijo))!;
    return montarTirada(f, t, eleccionSinTocar(t, true));
  };

  test("Bloquear con X: con la especialidad del arma, entero; sin ella, la mitad (aunque la fila dijera que sí)", () => {
    assert.equal(bloqueo(["espadas_y_dagas"], "bloquear_melee_", "espada").habilidad?.valor, 4);
    const sin = bloqueo([], "bloquear_melee_", "espada");
    assert.equal(sin.habilidad?.valor, 2);
    assert.deepEqual(sin.especialidadArma, { id: "espadas_y_dagas", label: "Espadas y Dagas", tiene: false });
  });

  test("Bayoneta y Aguijón también llevan la especialidad de su arma", () => {
    const { acciones } = todasLasFilasDeArma();
    for (const p of ["bloquear_bayoneta_", "bloquear_proyector_pulso_aguijon_", "bloquear_melee_"])
      for (const t of acciones.filter((x) => x.id.startsWith(p))) assert.ok(t.especialidadArma, t.id);
  });
});

describe("D2b-2: Bloqueo y Combate Sutil habilitan sus filas (§9.2)", () => {
  const bloquear = (f: FichaResuelta) => filasDe(f).find((t) => t.id.startsWith("bloquear_melee_"));

  test("los permisos salen de las dotes activas: Bloqueo habilita bloquear_melee; Combate Sutil, el Sutil en golpes y bloqueos", () => {
    assert.deepEqual(resolver(fichaCombate([])).extrasDotes.permisos, { familias: [], sutil: [] });
    const f = resolver(fichaCombate([{ id: "dote_bloqueo" }, { id: "dote_combate_sutil" }]));
    assert.deepEqual(f.extrasDotes.permisos.familias, ["bloquear_melee"]);
    assert.deepEqual([...f.extrasDotes.permisos.sutil].sort(), ["ataque_melee", "bloquear_melee"]);
  });

  test("requisito roto (S34): con las dotes marcadas pero sin Combate Melee, ni Bloquear ni Sutil", () => {
    const f = resolver(armado(fichaCombate([{ id: "dote_bloqueo" }, { id: "dote_combate_sutil" }], { cm: 0 }), "espada_ligera"));
    assert.deepEqual(f.extrasDotes.permisos, { familias: [], sutil: [] });
    assert.equal(bloquear(f), undefined);
    assert.equal(fila(f, "ataque_melee_").aplicadoSutil, undefined);
  });

  test("NPC (modo libre) sin dotes: tampoco bloquea ni tiene Sutil", () => {
    const f = resolver(armado(fichaCombate([]), "espada_ligera"), true);
    assert.equal(bloquear(f), undefined);
    assert.equal(fila(f, "ataque_melee_").aplicadoSutil, undefined);
  });

  // Lo que hace el editor de NPC: ponerDoteNpcAction = comprarDote con CONTEXTO_LIBRE, y la
  // FichaResuelta en libre (editor y panel de combate).
  const npcCon = (s: Sheet, ...ids: string[]): Sheet =>
    ids.reduce((x, id) => {
      const r = comprarDote(x, { id }, CONTEXTO_LIBRE);
      assert.ok(r.ok, r.ok ? "" : r.error);
      return r.sheet;
    }, s);

  test("NPC puesto desde el editor (libre): con espada y Bloqueo tiene «Bloquear con Espada»; sin Bloqueo no", () => {
    const base = armado(fichaCombate([], { cm: 0 }), "espada");
    assert.equal(bloquear(resolver(base, true)), undefined);
    const f = resolver(npcCon(base, "dote_bloqueo"), true);
    const t = bloquear(f);
    assert.ok(t);
    assert.match(t.label, /^Bloquear con Espada/);
  });

  test("NPC puesto desde el editor (libre): con Combate Sutil y un arma sutil tiene aplicadoSutil", () => {
    const base = armado(fichaCombate([], { cm: 0 }), "espada_ligera");
    assert.equal(fila(resolver(base, true), "ataque_melee_").aplicadoSutil, undefined);
    const f = resolver(npcCon(base, "dote_combate_sutil"), true);
    assert.ok(fila(f, "ataque_melee_").aplicadoSutil);
  });

  test("NPC (modo libre) con la dote puesta a mano: bloquea aunque no cumpla el requisito (§9.4)", () => {
    const f = resolver(armado(fichaCombate([{ id: "dote_bloqueo" }], { cm: 0 }), "espada"), true);
    assert.ok(bloquear(f));
  });

  test("con un arma, Bloquear no lleva la casilla «Desarmado frente a atacante armado» ni su excepción", () => {
    const t = bloquear(resolver(armado(fichaCombate([{ id: "dote_bloqueo" }]), "espada")))!;
    assert.ok(!(t.condiciones ?? []).some((x) => x.id.startsWith("dote_bloqueo")));
    assert.doesNotMatch(t.nota ?? "", /Desarmado frente a atacante armado/);
    assert.match(t.nota ?? "", /Solo vale contra ataques melee\. \(Bloqueo\)/);
  });

  test("bloqueando desarmado (Pelea), la fila lleva la casilla «Desarmado frente a atacante armado» (−3) y los textos de Bloqueo", () => {
    const f = resolver(armado(fichaCombate([{ id: "dote_bloqueo" }]), "pelea_punetazo"));
    const t = bloquear(f)!;
    const c = t.condiciones?.find((x) => x.id.startsWith("dote_bloqueo"));
    assert.ok(c && c.tipo === "toggle" && c.valorActivo === -3);
    assert.match(c.etiqueta, /^Desarmado frente a atacante armado \(Bloqueo\)$/);
    assert.match(t.nota ?? "", /Solo vale contra ataques melee\. \(Bloqueo\)/);
    assert.match(t.nota ?? "", /Atacante más grande: −2 por cada tamaño de diferencia\. \(Bloqueo\)/);
    assert.match(t.nota ?? "", /Desarmado frente a atacante armado: Si tu ataque natural o desarmado hace daño letal/);
    assert.match(t.efectoCritico ?? "", /puedes contraatacarle como reacción\. \(Bloqueo\)/);
    // Marcar la casilla resta 3 al total.
    const sin = montarTirada(f, t, eleccionSinTocar(t, false));
    const con = montarTirada(f, t, { ...eleccionSinTocar(t, false), estadoCondiciones: { ...eleccionSinTocar(t, false).estadoCondiciones, [c.id]: true } });
    assert.equal(con.modificador - sin.modificador, -3);
    // Solo en Bloquear: ni en el golpe ni en la esquiva.
    assert.ok(!(fila(f, "ataque_melee_").condiciones ?? []).some((x) => x.id.startsWith("dote_bloqueo")));
    assert.doesNotMatch(fila(f, "ataque_melee_").nota ?? "", /Bloqueo/);
  });

  test("Contraataque Rápido y Maestro en Contraataque: texto de crítico en Bloquear", () => {
    const rapido = bloquear(resolver(armado(fichaCombate([{ id: "dote_bloqueo" }, { id: "dote_contraataque_rapido" }]), "espada")))!;
    assert.match(rapido.efectoCritico ?? "", /acción gratuita en vez de reacción, una vez por turno\. \(Contraataque Rápido\)/);
    // Maestro pide Contraataque Rápido (y Combate Melee 6) y lo sustituye: vale la mejor (§9.1).
    const maestro = bloquear(
      resolver(armado(fichaCombate([{ id: "dote_bloqueo" }, { id: "dote_contraataque_rapido" }, { id: "dote_maestro_en_contraataque" }], { cm: 6 }), "espada")),
    )!;
    assert.match(maestro.efectoCritico ?? "", /sin límite por turno\. \(Maestro en Contraataque\)/);
    assert.doesNotMatch(maestro.efectoCritico ?? "", /Contraataque Rápido/);
  });

  test("Combinación y Combinación Rápida: su texto también en Bloquear", () => {
    const t = bloquear(resolver(armado(fichaCombate([{ id: "dote_bloqueo" }, { id: "dote_combinacion" }, { id: "dote_combinacion_rapida" }]), "espada")))!;
    assert.match(t.nota ?? "", /Si este turno has usado Combinación: −1 a tus acciones defensivas.*\(Combinación\)/);
    assert.match(t.nota ?? "", /Combinación en modo sutil: sin el −1 a tus acciones defensivas\. \(Combinación Rápida\)/);
  });

  test("sin Bloqueo, los textos de bloqueo de otras dotes no tienen dónde ir (no hay fila)", () => {
    const f = resolver(armado(fichaCombate([{ id: "dote_contraataque_rapido" }, { id: "dote_combinacion" }]), "espada"));
    assert.equal(bloquear(f), undefined);
  });
});
