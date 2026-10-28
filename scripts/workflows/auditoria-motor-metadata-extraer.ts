// Extracción puntual para auditar si el MotorMetadata y lo que la app pone de verdad de
// cada ítem (docs/aportes/plan.md §1.1: equipo, dote, aumento, poder, rasgo de especie)
// coinciden con su prosa. NO es parte del build — alimenta el Workflow de auditoría
// (.claude/workflows/auditoria-motor-metadata.js, que trae su propio comentario con el
// cómo-se-usa y las mejores prácticas completas) vía `args`. Solo lectura del catálogo.
// `extraerItems` se exporta para el test (src/lib/catalog/auditoria-motor-metadata.test.ts).
//
// Uso: node --import ./scripts/test-resolver.mjs scripts/workflows/auditoria-motor-metadata-extraer.ts \
//        [salida.json] [--familia equipo|dote|aumento|poder|especie|todo] [--ids a,b,c] [--contar]
//        [--estado construido|pendiente] [--tanda D2a|D2b-1|D2b-2|D2c|D2d] [--en-tirada] [--sin-texto]
//
//   --familia  qué familia recorre (por defecto "todo": las cinco). Una sola familia o "todo".
//   --ids      solo esos ítems, separados por comas. Vale el `piezaId` del item (todos sus
//              niveles), `piezaId#nivel` (un nivel) o el id base de un ítem con elección o
//              modelo (`aum_introgresion` saca `aum_introgresion:<opción>` de cada opción).
//              Los rasgos de especie van como `especie/rasgo` o `especie/casta|linaje/rasgo`.
//   --contar   no escribe JSON: imprime cuántos items saldrían por familia con estos filtros.
//   --estado / --tanda  solo dotes: se queda con las dotes que tengan al menos un
//              efecto en ese estado / tanda. "D2a" = los efectos construidos. El item
//              lleva el MotorMetadata entero de la dote (contexto para el auditor).
//   --en-tirada  solo dotes: además, el efecto que casa con --estado/--tanda tiene que ir
//              a una tirada (afecta.modo distinto de "ninguna"): fuera las dotes cuyo único
//              efecto construido es texto de la tarjeta. Auditoría de D2a + D2b-1:
//              `--familia dote --estado construido --en-tirada`.
//   --sin-texto  solo dotes: el efecto que casa tiene que sumar números o poner casillas
//              (tipo distinto de texto/narrativo); los textos de tirada siguen en
//              `notaTirada` marcados "ya cubierto como texto, no auditar" (sin ellos el
//              auditor los da por ausentes) y se quitan sus MotorMetadata y efectos.
//              Auditoría barata de una tanda: `--familia dote --estado construido --sin-texto`.
//
// Forma de cada item (la que entiende el workflow): piezaId, piezaLabel, familia, nivel,
// `detalle` (la prosa), `motor`, y lo que la app pone de verdad en `modificadores`,
// `ajusteTramo`, `ajusteAtaque`, `condiciones`, `notaTirada` y `otros` (líneas sueltas: acciones
// propias, textos de tarjeta, derivados que cambian...). Campos añadidos: `origen` (el
// OrigenAporte del ítem, fase 2), `motorAusente` (por qué `motor` va vacío, si va) y
// `fuenteProsa` (de dónde sale `detalle` cuando no es un campo de prosa del catálogo).
//
// Equipo: como siempre, el catálogo pieza a pieza (o nivel a nivel); sin los aumentos, que
// son familia propia. Las granadas, fuera (sin prosa).
// Dotes (D2a): `detalle` = la prosa de docs/dotes.md; `modificadores`/`condiciones`/
// `notaTirada` = lo que la app pone de verdad en las tiradas, sacado de
// rules/dotesEfectos.ts con una ficha que solo tiene esa dote (sin mirar requisitos;
// con elección, la primera opción); `efectos` = todos los efectos del catálogo.
// D2b-1: los bonos por tramo van en `ajusteTramo` (con su alcance); el crítico fijo
// (Crítico Mejorado) y el requisito por rama de cada efecto, como líneas de `notaTirada`.
// Aumentos, poderes y especie: ver extraerAumentos / extraerPoderes / extraerEspecie.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { DOTES } from "../../src/lib/catalog/dotes";
import { TANDAS_DOTES } from "../../src/lib/catalog/dotesDestinos";
import { ESPECIALIDADES_ARMA } from "../../src/lib/catalog/especialidades";
import { ESPECIES, type Especie, type OpcionEspecie, type Rasgo } from "../../src/lib/catalog/especies";
import { estadoPorId } from "../../src/lib/catalog/estados";
import { FARMACOS } from "../../src/lib/catalog/medicina";
import { DISCIPLINAS } from "../../src/lib/catalog/psionica";
import { textoRequisitoDote } from "../../src/lib/rules/dotes";
import { dotesActivas, efectosDeDotes } from "../../src/lib/rules/dotesEfectos";
import { defaultSheet, type Sheet } from "../../src/lib/rules/sheet";
import { fuentesDeCapa1 } from "../../src/lib/rules/capa1";
import { resolverFicha, VITALIDAD_DE_FICHA, type FichaResuelta } from "../../src/lib/rules/fichaResuelta";
import { activosDeAumentos } from "../../src/lib/rules/aumentosActivables";
import { accionesDePsionica, generaAccionDePoder, resolverPoder, tiradaDePoder } from "../../src/lib/rules/poderes";
import type { MotorMetadata } from "../../src/lib/rules/motor";
import type { OrigenAporte, TipoOrigenAporte } from "../../src/lib/rules/origen";
import type { EstadoActivo } from "../../src/lib/rules/estados";
import type { PiezaEquipada } from "../../src/lib/rules/equipo";
import type { Disciplina } from "../../src/lib/rules/psionica";
import {
  EQUIPO,
  type Equipo,
  type MejoraEstandar,
  type Subsistema,
  type MejoraMovimiento,
  type MejoraDeArma,
  type Herramienta,
  type OperacionGenetica,
  type Implante,
} from "../../src/lib/catalog/equipo";

export const FAMILIAS = ["equipo", "dote", "aumento", "poder", "especie"] as const;
export type FamiliaAuditoria = (typeof FAMILIAS)[number];

export type ItemAuditoria = {
  piezaId: string;
  piezaLabel: string;
  familia: string;
  nivel: number | null;
  detalle: string[];
  modificadores: unknown[];
  ajusteTramo: unknown;
  ajusteAtaque: unknown;
  condiciones: unknown;
  notaTirada: unknown;
  motor: unknown[];
  efectos?: unknown[];
  origen?: { tipo: TipoOrigenAporte; id: string };
  otros?: string[];
  motorAusente?: string;
  fuenteProsa?: string;
};

export type OpcionesExtraccion = {
  familias: readonly FamiliaAuditoria[];
  estado?: string;
  tanda?: string;
  enTirada?: boolean;
  sinTexto?: boolean;
  ids?: readonly string[];
};

export type Extraccion = {
  items: ItemAuditoria[];
  porFamilia: Record<FamiliaAuditoria, number>;
  excluidas: string[];
  // Solo dotes: cuántas quedan fuera de --estado/--tanda/--en-tirada/--sin-texto.
  dotesFuera: number;
};

// --ids: el piezaId, piezaId#nivel o el id base de un ítem con elección (`id:opción`), con o sin
// #nivel (`aum_brazo_bionico#3` saca los modelos del nivel 3).
export function casaConIds(item: Pick<ItemAuditoria, "piezaId" | "nivel">, ids: readonly string[]): boolean {
  const base = item.piezaId.split(":")[0];
  return ids.some(
    (id) => id === item.piezaId || id === base || id === `${item.piezaId}#${item.nivel}` || id === `${base}#${item.nivel}`,
  );
}

export function extraerItems(op: OpcionesExtraccion): Extraccion {
  const excluidas: string[] = [];
  const porFamilia = Object.fromEntries(FAMILIAS.map((f) => [f, 0])) as Record<FamiliaAuditoria, number>;
  const items: ItemAuditoria[] = [];
  let dotesFuera = 0;
  const de = (familia: FamiliaAuditoria, lista: ItemAuditoria[]) => {
    const filtrada = op.ids ? lista.filter((i) => casaConIds(i, op.ids!)) : lista;
    porFamilia[familia] = filtrada.length;
    items.push(...filtrada);
  };
  if (op.familias.includes("equipo")) de("equipo", extraerEquipo(excluidas));
  if (op.familias.includes("dote")) {
    const dotes = extraerDotes(op);
    dotesFuera = dotes.fuera;
    de("dote", dotes.items);
  }
  if (op.familias.includes("aumento")) de("aumento", extraerAumentos());
  if (op.familias.includes("poder")) de("poder", extraerPoderes());
  if (op.familias.includes("especie")) de("especie", extraerEspecie());
  return { items, porFamilia, excluidas, dotesFuera };
}

// ── Equipo ─────────────────────────────────────────────────────────────

// Mismo type guard que catalog/motor.test.ts — las 5 familias con niveles.
type ConNiveles = MejoraEstandar | Subsistema | MejoraMovimiento | MejoraDeArma | Herramienta;

function tieneNiveles(pieza: Equipo): pieza is ConNiveles {
  return (
    pieza.familia === "mejoraEstandar" ||
    pieza.familia === "subsistema" ||
    pieza.familia === "movimiento" ||
    pieza.familia === "mejoraArma" ||
    pieza.familia === "herramienta"
  );
}

const IDS_FARMACOS = new Set(FARMACOS.map((f) => f.id));

function extraerEquipo(excluidas: string[]): ItemAuditoria[] {
  const items: ItemAuditoria[] = [];
  for (const pieza of EQUIPO) {
    // Los aumentos son familia propia (--familia aumento), con su prosa y su motor por nivel.
    if (pieza.familia === "operacionGenetica" || pieza.familia === "implante") continue;
    const origen = { tipo: IDS_FARMACOS.has(pieza.id) ? ("farmaco" as const) : ("equipo" as const), id: pieza.id };
    if (tieneNiveles(pieza)) {
      for (const nivel of pieza.niveles) {
        items.push({
          piezaId: pieza.id,
          piezaLabel: pieza.label,
          familia: pieza.familia,
          nivel: nivel.nivel,
          detalle: nivel.detalle ?? [],
          modificadores: nivel.modificadores ?? [],
          ajusteTramo: nivel.ajusteTramo ?? null,
          ajusteAtaque: nivel.ajusteAtaque ?? null,
          condiciones: nivel.condiciones ?? null,
          notaTirada: nivel.notaTirada ?? null,
          motor: nivel.motor ?? [],
          origen,
        });
      }
      continue;
    }

    if (pieza.familia === "granada") {
      // MunicionGranada no tiene campo de prosa (no hay `descripcion`): sus
      // campos (dificultadArrojada, danio, areaEfecto...) SON la regla, no una
      // frase a contrastar contra el motor. Las 14 granadas comparten además
      // el mismo MotorMetadata (MOTOR_GRANADA en municion.ts) — no hay nada
      // que un agente pueda "leer en prosa" para esta familia. Fuera del
      // alcance de esta auditoría a propósito, no un olvido.
      excluidas.push(`${pieza.id} (familia "granada": sin campo de prosa que auditar)`);
      continue;
    }

    const conDescripcion = pieza as Equipo & { descripcion?: string; especial?: string | null; modificadores?: unknown[]; motor?: unknown[] };
    if (typeof conDescripcion.descripcion !== "string") {
      excluidas.push(`${pieza.id} (familia "${pieza.familia}": sin campo "descripcion" reconocido)`);
      continue;
    }

    const especial = typeof conDescripcion.especial === "string" ? [conDescripcion.especial] : [];
    items.push({
      piezaId: pieza.id,
      piezaLabel: pieza.label,
      familia: pieza.familia,
      nivel: null,
      detalle: [conDescripcion.descripcion, ...especial],
      modificadores: conDescripcion.modificadores ?? [],
      ajusteTramo: null,
      ajusteAtaque: null,
      condiciones: null,
      notaTirada: null,
      motor: conDescripcion.motor ?? [],
      origen,
    });
  }
  return items;
}

// ── Dotes ──────────────────────────────────────────────────────────────

const esTexto = (m: { tipo: string }) => m.tipo === "texto" || m.tipo === "narrativo";

function extraerDotes(op: OpcionesExtraccion): { items: ItemAuditoria[]; fuera: number } {
  const { estado, tanda, enTirada, sinTexto } = op;
  const items: ItemAuditoria[] = [];
  let fuera = 0;
  for (const dote of DOTES) {
    const casa = dote.motor.some(
      (m) =>
        (!estado || m.estado === estado) &&
        (!tanda || (tanda === "D2a" ? m.estado === "construido" : m.estado === "pendiente" && m.bloqueoPor === tanda)) &&
        (!enTirada || m.afecta.modo !== "ninguna") &&
        (!sinTexto || !esTexto(m)),
    );
    if (!casa || dote.efectos.length === 0) {
      fuera++;
      continue;
    }
    const el = dote.eleccion;
    const eleccion = !el ? undefined : el.opciones === "especialidades_arma" ? ESPECIALIDADES_ARMA[0].id : el.opciones[0];
    const sheet = { ...defaultSheet(), dotes: [{ id: dote.id, ...(eleccion && { eleccion }) }] };
    const { casillas, modificadores, textos, bonosTramo, criticos } = efectosDeDotes(dotesActivas(sheet, null), null);
    const destinoTexto = (t: (typeof textos)[number]) =>
      t.en.tipo === "tiradaId" ? t.en.id : t.en.tipo === "familiaArma" ? `familia:${t.en.familia}${t.en.empleo ? ` (arma a ${t.en.empleo})` : ""}` : t.en.tipo;
    const lineas = [
      // Con --sin-texto los textos no se auditan, pero el auditor tiene que verlos: si no,
      // un efecto que la app ya da como texto (−1 a defensas de Combinación) sale como
      // "falta en código" (falsos positivos de la auditoría D2a + D2b-1, 2026-10-15).
      ...textos.map((t) => `${sinTexto ? "[ya cubierto como texto, no auditar] " : ""}${destinoTexto(t)}${t.soloEnCritico ? " (crítico)" : ""}: ${t.texto}`),
      ...criticos.map((c) => `crítico fijo en los ataques con la especialidad elegida (${c.especialidad} de ejemplo): con ${c.margen} éxitos`),
      ...dote.efectos.flatMap((e) =>
        "requisitoAlcance" in e && e.requisitoAlcance && !(sinTexto && e.tipo === "texto")
          ? [`requisito por rama: el efecto ${e.borrador} (${e.tipo === "texto" ? e.lugar : "alcance" in e ? e.alcance : "?"}) solo con ${textoRequisitoDote(e.requisitoAlcance)}`]
          : [],
      ),
    ];
    items.push({
      piezaId: dote.id,
      piezaLabel: dote.label,
      familia: "dote",
      nivel: null,
      detalle: [dote.texto],
      modificadores,
      ajusteTramo: bonosTramo.length ? bonosTramo : null,
      ajusteAtaque: null,
      condiciones: casillas.length ? casillas : null,
      notaTirada: lineas.length ? lineas.join(" | ") : null,
      // Con --sin-texto, MotorMetadata y efectos en paralelo (mismo índice) sin los de texto.
      motor: sinTexto ? dote.motor.filter((m) => !esTexto(m)) : dote.motor,
      efectos: sinTexto ? dote.efectos.filter((_, i) => !esTexto(dote.motor[i])) : dote.efectos,
      origen: { tipo: "dote", id: dote.id },
    });
  }
  return { items, fuera };
}

// ── Lo que la app pone, leído de la ficha resuelta por `origen` ─────────
//
// Aumentos y especie: se resuelve una ficha con el ítem (resolverFicha, la vista común) y se
// recogen todos los nodos cuyo `origen`/`item` (fase 2) es ese ítem, estén donde estén. Lo
// que la ficha resuelta todavía no etiqueta con origen (umbrales, coste, fórmula de
// movimiento...) sale por diferencia contra la misma ficha sin el ítem.

type Nodo = { ruta: string; nodo: Record<string, unknown> };

const PRIMERO = new Set(["modificadores", "indiceCondiciones", "extrasDotes", "textosTirada"]);

const esOrigen = (x: unknown): x is OrigenAporte =>
  typeof x === "object" && x !== null && typeof (x as { tipo?: unknown }).tipo === "string" && typeof (x as { id?: unknown }).id === "string";

function origenesDe(nodo: Record<string, unknown>): OrigenAporte[] {
  const sueltos = [nodo.origen, nodo.item].filter(esOrigen);
  const lista = Array.isArray(nodo.origenes) ? nodo.origenes.filter(esOrigen) : [];
  return [...sueltos, ...lista];
}

function nodosDelItem(raiz: unknown, coincide: (o: OrigenAporte) => boolean): Nodo[] {
  const out: Nodo[] = [];
  const vistos = new WeakSet<object>();
  const recorrer = (valor: unknown, ruta: string) => {
    if (typeof valor !== "object" || valor === null || vistos.has(valor)) return;
    vistos.add(valor);
    if (valor instanceof Map) return valor.forEach((v) => recorrer(v, ruta));
    if (Array.isArray(valor)) return valor.forEach((v) => recorrer(v, ruta));
    const nodo = valor as Record<string, unknown>;
    if (origenesDe(nodo).some(coincide)) return void out.push({ ruta, nodo });
    // El mismo objeto cuelga de varios sitios (los modificadores de la especie, también de
    // `especie`): primero los campos que clasificar() reconoce.
    const entradas = Object.entries(nodo).sort(([a], [b]) => (ruta ? 0 : Number(!PRIMERO.has(a)) - Number(!PRIMERO.has(b))));
    for (const [k, v] of entradas) recorrer(v, ruta ? `${ruta}.${k}` : k);
  };
  recorrer(raiz, "");
  return out;
}

// JSON sin el origen (ya se sabe de quién es) y con los Map como objeto.
const json = (v: unknown) =>
  JSON.stringify(v, (k, x) => ((k === "origen" || k === "item") && esOrigen(x) ? undefined : x instanceof Map ? Object.fromEntries(x) : x)) ?? "null";

const recorta = (s: string, max = 1200) => (s.length > max ? `${s.slice(0, max)}…` : s);

type LoQuePone = Pick<ItemAuditoria, "modificadores" | "ajusteTramo" | "condiciones" | "notaTirada"> & { otros: string[] };

function destino(en: unknown): string {
  const d = en as { tipo?: string; id?: string; familia?: string; grupo?: string; aplicados?: string[] };
  if (d.tipo === "tiradaId") return d.id ?? "?";
  if (d.tipo === "familiaArma") return `familia:${d.familia}`;
  if (d.tipo === "grupo") return `grupo:${d.grupo}`;
  return d.tipo ?? json(en);
}

function clasificar(nodos: Nodo[]): LoQuePone {
  const modificadores: unknown[] = [];
  const condiciones: unknown[] = [];
  const tramos: unknown[] = [];
  const textos: string[] = [];
  const otros: string[] = [];
  const vistos = new Set<string>();
  for (const { ruta, nodo } of nodos) {
    const clave = `${ruta}|${json(nodo)}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    if (ruta === "modificadores") modificadores.push(JSON.parse(json(nodo)));
    else if (ruta.startsWith("indiceCondiciones")) condiciones.push(JSON.parse(json(nodo)));
    else if (ruta.startsWith("extrasDotes.bonosTramo")) tramos.push(JSON.parse(json(nodo)));
    else if (ruta === "textosTirada") textos.push(`${destino(nodo.en)}${nodo.soloEnCritico ? " (crítico)" : ""}: ${String(nodo.texto)}`);
    else otros.push(recorta(`${ruta}: ${json(nodo)}`));
  }
  return {
    modificadores,
    ajusteTramo: tramos.length ? tramos : null,
    condiciones: condiciones.length ? condiciones : null,
    notaTirada: textos.length ? textos.join(" | ") : null,
    otros,
  };
}

// Consecuencias de otros campos (atributos → aplicados → salud...) o ya recogidos por origen:
// no se listan por diferencia.
const SIN_DIFERENCIA = new Set<string>([
  "ficha", "estados", "estadosDerivados", "modificadores", "atributos", "topeAgilidad", "aplicados", "desgloses",
  "salud", "danio", "alerta", "umbrales", "movimiento", "vuelo", "levitacion", "cargaMaxima", "indiceCondiciones",
  "requisitosDotes",
]);

function diferencias(con: FichaResuelta, sin: FichaResuelta, yaConOrigen: Set<string>, campos?: ReadonlySet<string>): string[] {
  return Object.keys(con).flatMap((k) => {
    if (SIN_DIFERENCIA.has(k) || yaConOrigen.has(k) || (campos && !campos.has(k))) return [];
    const a = json(con[k as keyof FichaResuelta]);
    return a === json(sin[k as keyof FichaResuelta]) ? [] : [recorta(`${k} (sin origen; cambia con el ítem): ${a}`)];
  });
}

// Casillas que la ficha junta de varias fuentes sin origen propio (el selector «Contra…» de las
// salvaciones): las que aparecen con el ítem y no estaban sin él.
function casillasNuevasSinOrigen(con: FichaResuelta, sin: FichaResuelta): unknown[] {
  const de = (f: FichaResuelta) => {
    const i = f.indiceCondiciones;
    const todas = [i.porTiradaId, i.porGrupo, i.porHabilidad, i.porFamiliaArma, i.porEspecialidad].flatMap((m) => [...m.values()].flat());
    return new Set([...todas, ...i.porAplicado, ...i.todas].filter((c) => !c.condicion.origen).map((c) => json(c.condicion)));
  };
  const antes = de(sin);
  return [...de(con)].filter((k) => !antes.has(k)).map((k): unknown => JSON.parse(k));
}

const resolver = (sheet: Sheet, estados: EstadoActivo[] = [], aprobada = false) =>
  resolverFicha(sheet, { estados, vitalidad: VITALIDAD_DE_FICHA, aprobada });

// ── Aumentos ───────────────────────────────────────────────────────────
//
// Uno por operación genética (uno por opción si tiene elección: `id:opción`) y uno por nivel
// de implante (uno por modelo si el nivel los tiene: `id:modelo`). Prosa: `detalle` del
// catálogo (literal de docs/aumentos.md). Motor: fuentesDeCapa1 (capa1.ts) sobre la ficha con
// la pieza. Lo que pone la app: la ficha resuelta con la pieza (y las operaciones que pide
// como requisito), ya aprobada para que salgan las rebajas de coste, por origen; lo de sus
// activables, con su estado propio puesto, marcado "[activable encendido]".

const OPERACIONES = EQUIPO.filter((e): e is OperacionGenetica => e.familia === "operacionGenetica");
const IMPLANTES_CAT = EQUIPO.filter((e): e is Implante => e.familia === "implante");

function conRequisitos(op: OperacionGenetica, acc = new Map<string, PiezaEquipada>()): Map<string, PiezaEquipada> {
  for (const id of op.requisitos) {
    const req = OPERACIONES.find((o) => o.id === id);
    if (!req || acc.has(id)) continue;
    acc.set(id, { instanciaId: `req_${id}`, catalogoId: id, ...(req.eleccion && { eleccion: req.eleccion.opciones[0].id }) });
    conRequisitos(req, acc);
  }
  return acc;
}

function itemDeAumento(
  base: Pick<ItemAuditoria, "piezaId" | "piezaLabel" | "familia" | "nivel" | "detalle">,
  pieza: PiezaEquipada,
  requisitos: PiezaEquipada[],
): ItemAuditoria {
  const sin: Sheet = { ...defaultSheet(), equipo: requisitos };
  const con: Sheet = { ...sin, equipo: [...requisitos, pieza] };
  const coincide = (o: OrigenAporte) => o.tipo === "aumento" && o.id === pieza.catalogoId && (!o.instanciaId || o.instanciaId === pieza.instanciaId);
  const fichaCon = resolver(con, [], true);
  const nodos = nodosDelItem(fichaCon, coincide);
  // Activables: con su estado propio puesto (primer grado), solo lo que no estaba ya.
  const estados: EstadoActivo[] = activosDeAumentos({ equipo: [pieza] }).flatMap(({ activo }) => {
    const gradoId = estadoPorId(activo.estadoId)?.grados[0]?.id;
    return gradoId ? [{ estadoId: activo.estadoId, gradoId, rondasRestantes: null }] : [];
  });
  const apagados = new Set(nodos.map((n) => `${n.ruta}|${json(n.nodo)}`));
  const encendidos = estados.length
    ? nodosDelItem(resolver(con, estados, true), coincide).filter((n) => !apagados.has(`${n.ruta}|${json(n.nodo)}`))
    : [];
  const pone = clasificar(nodos);
  // Solo valen con el activable encendido: como líneas sueltas, para que no pasen por permanentes.
  const conEncendido = encendidos.map(({ ruta, nodo }) => recorta(`[activable encendido] ${ruta}: ${json(nodo)}`));
  const yaConOrigen = new Set([...nodos, ...encendidos].map((n) => n.ruta.split(".")[0]));
  const fuente = fuentesDeCapa1(con, fichaCon.psionica.paraEfectos).find((f) => f.instanciaId === pieza.instanciaId);
  const motor: MotorMetadata[] = fuente?.motor ?? [];
  const fichaSin = resolver(sin, [], true);
  const condiciones = [...((pone.condiciones as unknown[] | null) ?? []), ...casillasNuevasSinOrigen(fichaCon, fichaSin)];
  return {
    ...base,
    modificadores: pone.modificadores,
    ajusteTramo: pone.ajusteTramo,
    ajusteAtaque: null,
    condiciones: condiciones.length ? condiciones : null,
    notaTirada: pone.notaTirada,
    otros: [...pone.otros, ...conEncendido, ...diferencias(fichaCon, fichaSin, yaConOrigen)],
    motor,
    ...(motor.length === 0 && { motorAusente: "fuentesDeCapa1 no devuelve MotorMetadata para esta pieza y nivel" }),
    origen: { tipo: "aumento", id: pieza.catalogoId },
  };
}

function extraerAumentos(): ItemAuditoria[] {
  const items: ItemAuditoria[] = [];
  for (const op of OPERACIONES) {
    const requisitos = [...conRequisitos(op).values()];
    const opciones = op.eleccion?.opciones ?? [null];
    for (const opcion of opciones) {
      items.push(
        itemDeAumento(
          {
            piezaId: opcion ? `${op.id}:${opcion.id}` : op.id,
            piezaLabel: opcion ? `${op.label}: ${opcion.label}` : op.label,
            familia: op.familia,
            nivel: null,
            detalle: [...op.detalle, ...(opcion ? opcion.detalle.map((d) => `${opcion.label}: ${d}`) : [])],
          },
          { instanciaId: "item", catalogoId: op.id, ...(opcion && { eleccion: opcion.id }) },
          requisitos,
        ),
      );
    }
  }
  for (const imp of IMPLANTES_CAT) {
    for (const nivel of imp.niveles) {
      const variantes = nivel.variantes?.length ? nivel.variantes : [null];
      for (const v of variantes) {
        items.push(
          itemDeAumento(
            {
              piezaId: v ? `${imp.id}:${v.id}` : imp.id,
              piezaLabel: v ? `${imp.label}: ${v.label}` : imp.label,
              familia: imp.familia,
              nivel: nivel.nivel,
              detalle: [...nivel.detalle, ...(v ? v.detalle.map((d) => `${v.label}: ${d}`) : [])],
            },
            { instanciaId: "item", catalogoId: imp.id, nivel: nivel.nivel, ...(v && { eleccion: v.id }) },
            [],
          ),
        );
      }
    }
  }
  return items;
}

// ── Prosa en Markdown (docs/psionica.md, docs/especies.md) ───────────────

type Seccion = { nivel: number; titulo: string; linea: number; finPropio: number; fin: number };

const norm = (s: string) =>
  s.replace(/\*\(sic\)\*/g, "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

function leerMd(ruta: string): { lineas: string[]; secciones: Seccion[] } {
  const lineas = readFileSync(new URL(`../../${ruta}`, import.meta.url), "utf8").split("\n");
  const cabeceras = lineas.flatMap((l, i) => {
    const m = /^(#{1,6})\s+(.*)$/.exec(l);
    return m ? [{ nivel: m[1].length, titulo: m[2].trim(), linea: i }] : [];
  });
  const secciones = cabeceras.map((c, k) => ({
    ...c,
    finPropio: cabeceras[k + 1]?.linea ?? lineas.length,
    fin: cabeceras.slice(k + 1).find((d) => d.nivel <= c.nivel)?.linea ?? lineas.length,
  }));
  return { lineas, secciones };
}

// Párrafos (una entrada por línea no vacía), sin las líneas de cabecera.
const parrafos = (lineas: string[], desde: number, hasta: number) =>
  lineas.slice(desde, hasta).map((l) => l.trim()).filter((l) => l && !l.startsWith("#") && !l.startsWith(">"));

// Mismo título, o el título es el principio del nombre ("Alerta" → "Alerta pasiva"), o el
// nombre sin "Auto-" ("Auto-anclaje" → "Anclaje").
const casaTitulo = (titulo: string, nombre: string) => {
  const t = norm(titulo);
  const n = norm(nombre);
  return t === n || n.startsWith(`${t} `) || t.startsWith(`${n} `) || n.replace(/^auto-/, "") === t;
};

// ── Poderes psiónicos ──────────────────────────────────────────────────
//
// Uno por acción de poder, resuelta con la disciplina a 6 (todas las opciones a mano), y uno
// por disciplina (familia "disciplina": lo que da por nivel en otras tiradas, fatiga y
// economía). Prosa: docs/psionica.md — el apartado con el nombre de la acción dentro de su
// disciplina (todos, si sale en varios niveles); sin apartado propio, la disciplina entera.
// Motor: fuentesDeCapa1 (o el catálogo si la acción no genera fila). Lo que pone la app: la
// tirada que genera (tiradaDePoder), el poder resuelto y sus ejes.

const NIVEL_PODERES = 6;

function seccionDisciplina(md: ReturnType<typeof leerMd>, d: Disciplina): Seccion | undefined {
  const delNivel3 = md.secciones.filter((s) => s.nivel === 3);
  // "Hipercongnición" en la fuente: basta con el mismo principio.
  return delNivel3.find((s) => norm(s.titulo) === norm(d.label)) ?? delNivel3.find((s) => norm(s.titulo).slice(0, 6) === norm(d.label).slice(0, 6));
}

const compacto = (v: unknown) => recorta(json(v), 400);

function extraerPoderes(): ItemAuditoria[] {
  const md = leerMd("docs/psionica.md");
  const items: ItemAuditoria[] = [];
  for (const d of DISCIPLINAS) {
    const sheet: Sheet = {
      ...defaultSheet(),
      psionica: { ...(d.requisito && { [d.requisito.disciplina]: d.requisito.nivel }), [d.id]: NIVEL_PODERES },
    };
    const niveles = resolver(sheet).psionica.paraEfectos;
    const fuentes = fuentesDeCapa1(sheet, niveles);
    const disponibles = accionesDePsionica(sheet, niveles);
    const sec = seccionDisciplina(md, d);
    const enDisciplina = sec ? md.secciones.filter((s) => s.linea > sec.linea && s.linea < sec.fin) : [];
    const deLaDisciplina = sec ? parrafos(md.lineas, sec.linea + 1, sec.fin) : [];
    const sinFuente = "sin apartado de la disciplina en docs/psionica.md";

    // La disciplina: su introducción y su apartado "Niveles de …", si lo tiene.
    const niv = enDisciplina.find((s) => norm(s.titulo).startsWith("niveles de"));
    items.push({
      piezaId: d.id,
      piezaLabel: d.label,
      familia: "disciplina",
      nivel: null,
      detalle: sec ? [...parrafos(md.lineas, sec.linea + 1, sec.finPropio), ...(niv ? parrafos(md.lineas, niv.linea + 1, niv.fin) : [])] : [],
      modificadores: [],
      ajusteTramo: null,
      ajusteAtaque: null,
      condiciones: null,
      notaTirada: null,
      otros: [
        `requisito: ${compacto(d.requisito)}`,
        `porNivel: ${compacto(d.porNivel)}`,
        ...d.reglas.map((r) => `regla (${compacto(r.aplica)}): ${r.texto}`),
        ...d.modificadoresFatiga.map((m) => `modificador de fatiga: ${compacto(m)}`),
        ...d.modificadoresEconomia.map((m) => `modificador de economía: ${compacto(m)}`),
        ...d.ventajas.map((v) => `ventaja (2d12) desde nivel ${v.desdeNivelPoseido} en ${v.acciones.join(", ")}${v.condicion ? ` (${v.condicion})` : ""}`),
        ...d.bonosEnOtrasTiradas.map((b) => `casilla en otras tiradas: ${compacto(b)}`),
      ],
      motor: [],
      motorAusente: "la disciplina no lleva MotorMetadata (lo llevan sus acciones); sus aportes van por nivel",
      fuenteProsa: sec ? `docs/psionica.md: introducción de «${sec.titulo}»${niv ? ` y «${niv.titulo}»` : ""}` : sinFuente,
      origen: { tipo: "poder", id: d.id },
    });

    for (const accion of d.acciones) {
      const propios = enDisciplina.filter((s) => casaTitulo(s.titulo, accion.label));
      const detalle = propios.flatMap((s) => {
        const padre = enDisciplina.filter((p) => p.nivel < s.nivel && p.linea < s.linea && s.linea < p.fin).at(-1);
        const marca = padre && /^nivel \d/.test(norm(padre.titulo)) ? `[${padre.titulo}] ` : "";
        return parrafos(md.lineas, s.linea + 1, s.fin).map((p) => marca + p);
      });
      const disp = disponibles.find((p) => p.accion.id === accion.id);
      const p = disp?.porDefecto ?? resolverPoder(accion, { nivelPoseido: NIVEL_PODERES, disciplina: d, niveles });
      const tirada = p ? tiradaDePoder(accion, p) : null;
      const fuente = fuentes.find((f) => f.familia === "poder" && f.catalogoId === accion.id);
      const notasTirada = (p?.notas ?? []).filter((n) => n.lugar === "tirada").map((n) => n.texto);
      const deFatiga = d.modificadoresFatiga.filter((m) => [m.alcance.accion].flat().includes(accion.id));
      items.push({
        piezaId: accion.id,
        piezaLabel: `${d.label}: ${accion.label}`,
        familia: "poder",
        nivel: null,
        detalle: detalle.length ? detalle : deLaDisciplina,
        modificadores: [],
        ajusteTramo: null,
        ajusteAtaque: null,
        condiciones: tirada?.condiciones ?? null,
        notaTirada: notasTirada.length ? notasTirada.join(" | ") : null,
        otros: [
          `genera fila en Acciones: ${generaAccionDePoder(accion) ? "sí" : "no (sin MotorMetadata de acción construida)"}; desde nivel ${accion.desdeNivel}`,
          ...(p
            ? [
                `resuelto con nivel ${NIVEL_PODERES} y opciones por defecto: ${compacto({ economia: p.economia, fatiga: p.fatiga, alcance: p.alcance, duracion: p.duracion, objetivo: p.objetivo, desplazamiento: p.desplazamiento, carga: p.carga })}`,
                `resolución: ${compacto(p.resolucion)}${p.habilidadesAElegir ? ` (elige entre ${p.habilidadesAElegir.join(", ")})` : ""}`,
                ...Object.entries(p.resultados).map(([g, r]) => `resultado ${g}: ${r.texto}${r.estados.length || r.danio ? ` ${compacto({ estados: r.estados, danio: r.danio })}` : ""}`),
                ...p.objetivoTira.map((t) => `el objetivo tira (texto): ${compacto(t)}`),
                ...p.notas.filter((n) => n.lugar === "danio").map((n) => `nota junto al daño: ${n.texto}`),
                ...(p.danioPropio ? [`daño propio: ${compacto(p.danioPropio)}`] : []),
                ...(p.multiplesObjetivos ? [`varios objetivos: ${compacto(p.multiplesObjetivos)}`] : []),
                ...p.datos.map((x) => `dato: ${compacto(x)}`),
                ...p.manual.map((m) => `a mano: ${m}`),
                ...(p.ventaja ? [`ventaja: ${p.ventaja}`] : []),
                ...p.bonosEnOtrasTiradas.map((b) => `casilla en otras tiradas: ${compacto(b)}`),
                ...(p.movimientoOtorgado ? [`movimiento: ${compacto(p.movimientoOtorgado)}`] : []),
              ]
            : [`no se resuelve a nivel ${NIVEL_PODERES}`]),
          ...(tirada?.ajustesFijos ?? []).map((a) => `ajuste fijo: ${a.valor} (${a.fuente})`),
          ...(tirada?.ataque ? [`ataque: ${compacto(tirada.ataque)}`] : []),
          ...accion.ejes.flatMap((e) =>
            e.opciones.map((o) => `eje «${e.label}», opción «${o.label}»${o.desdeNivel ? ` (desde ${o.desdeNivel})` : ""}: ${compacto({ cambia: o.cambia, suma: o.suma, multiplicaTiempo: o.multiplicaTiempo })}`),
          ),
          ...accion.ajustesPorNivelPoseido.map((a) => `ajuste por nivel poseído: ${compacto(a)}`),
          ...(accion.porObjetivo ? [`por objetivo: ${compacto(accion.porObjetivo)}`] : []),
          ...(accion.excesoDeCarga ? [`exceso de carga: ${compacto(accion.excesoDeCarga)}`] : []),
          ...deFatiga.map((m) => `modificador de fatiga de la disciplina: ${compacto(m)}`),
        ],
        motor: fuente?.motor ?? accion.motor,
        ...(accion.motor.length === 0 && { motorAusente: "la acción no declara MotorMetadata" }),
        ...(detalle.length === 0 && { fuenteProsa: sec ? `docs/psionica.md: «${sec.titulo}» entera (la acción no tiene apartado propio): audita solo lo que toca a «${accion.label}»` : sinFuente }),
        origen: { tipo: "poder", id: accion.id },
      });
    }
  }
  return items;
}

// ── Rasgos de especie ──────────────────────────────────────────────────
//
// Uno por rasgo de especie, casta y linaje (piezaId `especie/rasgo` o `especie/opción/rasgo`:
// los ids de rasgo se repiten entre especies). Prosa: el apartado de docs/especies.md con el
// nombre del rasgo; en una casta, su viñeta del apartado (o de "Clase Social"); en un linaje,
// la casa entera. Sin apartado, `Rasgo.texto` (resumen nuestro), avisado en `fuenteProsa`.
// Motor: `Rasgo.motor` (las especies no están en fuentesDeCapa1); los rasgos de creación no
// lo llevan por diseño. Lo que pone la app: la ficha con esa especie (y casta/linaje) por
// origen, más lo que cambia sin origen en los campos que alimenta el rasgo.

// Campo del rasgo → campo de la ficha resuelta que alimenta y que aún no lleva origen.
const CAMPOS_SIN_ORIGEN: Partial<Record<keyof Rasgo, (keyof FichaResuelta)[]>> = {
  costes: ["ajusteCoste", "ajusteCosteSubida"],
  bolsaAumentos: ["bolsaAumentos"],
  excepcionRareza: ["excepcionesRareza"],
  formulaMovimiento: ["formulaMovimiento"],
  multiplicadorCarga: ["multiplicadorCarga"],
  armaduraNatural: ["blindaje"],
  ajusteUmbrales: ["ajusteUmbrales"],
  peajeNeurologico: ["peajeNeurologico"],
  notaFarmacos: ["notasFarmacos"],
};

type Capa = { tipo: "base" } | { tipo: "casta" | "linaje"; opcion: OpcionEspecie };

function prosaDeRasgo(md: ReturnType<typeof leerMd>, especie: Especie, capa: Capa, rasgo: Rasgo): { detalle: string[]; fuenteProsa?: string } {
  const sec = md.secciones.find((s) => s.nivel === 2 && (norm(especie.label).startsWith(norm(s.titulo)) || norm(s.titulo).startsWith(norm(especie.label))));
  const dentro = sec ? md.secciones.filter((s) => s.linea > sec.linea && s.linea < sec.fin) : [];
  if (capa.tipo === "linaje") {
    const casa = dentro.find((s) => norm(s.titulo) === norm(capa.opcion.fuente));
    if (casa) return { detalle: parrafos(md.lineas, casa.linea + 1, casa.fin), fuenteProsa: `docs/especies.md: «${casa.titulo}» entera, con todos los rasgos de la casa: audita solo lo que toca a «${rasgo.label}»` };
  } else {
    const propio = dentro.find((s) => s.nivel === 3 && casaTitulo(s.titulo, rasgo.label));
    if (capa.tipo === "base" && propio) return { detalle: parrafos(md.lineas, propio.linea + 1, propio.fin) };
    if (capa.tipo === "casta") {
      const vineta = (s: Seccion | undefined) =>
        s ? parrafos(md.lineas, s.linea + 1, s.fin).filter((p) => norm(p).startsWith(norm(`- **${capa.opcion.label}:**`))) : [];
      const deApartado = vineta(propio);
      const clase = dentro.find((s) => norm(s.titulo) === "clase social");
      const detalle = deApartado.length ? deApartado : vineta(clase);
      if (detalle.length) return { detalle, fuenteProsa: `docs/especies.md: viñeta de ${capa.opcion.label} en «${deApartado.length ? propio?.titulo : clase?.titulo}» (puede traer más de un rasgo): audita solo lo que toca a «${rasgo.label}»` };
    }
  }
  return { detalle: [rasgo.texto], fuenteProsa: "Rasgo.texto (resumen de la app: sin apartado propio en docs/especies.md)" };
}

function extraerEspecie(): ItemAuditoria[] {
  const md = leerMd("docs/especies.md");
  const items: ItemAuditoria[] = [];
  for (const especie of ESPECIES) {
    const capas: { capa: Capa; sheet: Sheet; anterior: Sheet; prefijo: string; fuente: string }[] = [];
    const sinEspecie = defaultSheet();
    const soloEspecie: Sheet = { ...sinEspecie, especieId: especie.id };
    capas.push({ capa: { tipo: "base" }, sheet: soloEspecie, anterior: sinEspecie, prefijo: especie.id, fuente: especie.label });
    for (const casta of especie.castas ?? []) {
      const conCasta: Sheet = { ...soloEspecie, especieOpciones: { casta: casta.id } };
      capas.push({ capa: { tipo: "casta", opcion: casta }, sheet: conCasta, anterior: soloEspecie, prefijo: `${especie.id}/${casta.id}`, fuente: casta.fuente });
      if (especie.linajes?.casta !== casta.id) continue;
      for (const linaje of especie.linajes.opciones) {
        const conLinaje: Sheet = { ...conCasta, especieOpciones: { casta: casta.id, linaje: linaje.id } };
        capas.push({ capa: { tipo: "linaje", opcion: linaje }, sheet: conLinaje, anterior: conCasta, prefijo: `${especie.id}/${linaje.id}`, fuente: linaje.fuente });
      }
    }
    for (const { capa, sheet, anterior, prefijo, fuente } of capas) {
      const rasgos = capa.tipo === "base" ? especie.rasgos : capa.opcion.rasgos;
      const ficha = resolver(sheet);
      const fichaAnterior = resolver(anterior);
      for (const rasgo of rasgos) {
        // El mismo id de rasgo en otra capa de la ficha (Atributos del Noble y de Ílkrem): se
        // separa por la fuente de la capa cuando el nodo la trae.
        const repetido = (ficha.especie?.rasgos ?? []).filter((r) => r.id === rasgo.id).length > 1;
        const nodos = nodosDelItem(ficha, (o) => o.tipo === "especie" && o.id === rasgo.id).filter(
          ({ nodo }) => !repetido || typeof nodo.fuente !== "string" || nodo.fuente.includes(fuente),
        );
        const pone = clasificar(nodos);
        const campos = new Set(Object.entries(CAMPOS_SIN_ORIGEN).flatMap(([k, v]) => (rasgo[k as keyof Rasgo] !== undefined ? v : [])));
        const yaConOrigen = new Set(nodos.map((n) => n.ruta.split(".")[0]));
        const prosa = prosaDeRasgo(md, especie, capa, rasgo);
        items.push({
          piezaId: `${prefijo}/${rasgo.id}`,
          piezaLabel: `${fuente}: ${rasgo.label}`,
          familia: "especie",
          nivel: null,
          detalle: prosa.detalle,
          modificadores: pone.modificadores,
          ajusteTramo: pone.ajusteTramo,
          ajusteAtaque: null,
          condiciones: pone.condiciones,
          notaTirada: pone.notaTirada,
          otros: [`resumen de la app: ${rasgo.texto}`, ...pone.otros, ...diferencias(ficha, fichaAnterior, yaConOrigen, campos)],
          motor: rasgo.motor,
          ...(rasgo.motor.length === 0 && {
            motorAusente: rasgo.creacion
              ? "rasgo de creación (coste, bolsa, rareza): sin MotorMetadata por diseño (catalog/especies.ts, Rasgo.creacion)"
              : "el rasgo no declara MotorMetadata",
          }),
          ...(prosa.fuenteProsa && { fuenteProsa: prosa.fuenteProsa }),
          origen: { tipo: "especie", id: rasgo.id },
        });
      }
    }
  }
  return items;
}

// ── CLI ────────────────────────────────────────────────────────────────

function main() {
  const argv = process.argv.slice(2);
  const opcion = (nombre: string) => {
    const i = argv.indexOf(`--${nombre}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const familia = opcion("familia") ?? "todo";
  const estado = opcion("estado");
  const tanda = opcion("tanda");
  const ids = opcion("ids")?.split(",").map((s) => s.trim()).filter(Boolean);
  const enTirada = argv.includes("--en-tirada");
  const sinTexto = argv.includes("--sin-texto");
  const contar = argv.includes("--contar");
  if (familia !== "todo" && !(FAMILIAS as readonly string[]).includes(familia)) throw new Error(`--familia ${familia}: ${FAMILIAS.join(" | ")} | todo`);
  if (estado && !["construido", "pendiente"].includes(estado)) throw new Error(`--estado ${estado}: construido | pendiente`);
  if (tanda && tanda !== "D2a" && !(TANDAS_DOTES as readonly string[]).includes(tanda))
    throw new Error(`--tanda ${tanda}: D2a | ${TANDAS_DOTES.join(" | ")}`);
  if (ids && ids.length === 0) throw new Error("--ids: lista vacía");

  const familias = familia === "todo" ? FAMILIAS : [familia as FamiliaAuditoria];
  const { items, porFamilia, excluidas, dotesFuera } = extraerItems({ familias, estado, tanda, enTirada, sinTexto, ids });

  console.log(
    `Filtro: familia ${familia}${estado ? `, estado ${estado}` : ""}${tanda ? `, tanda ${tanda}` : ""}${enTirada ? ", en tirada" : ""}${sinTexto ? ", sin texto" : ""}${ids ? `, ${ids.length} ids` : ""}.`,
  );
  for (const f of familias) console.log(`  ${f}: ${porFamilia[f]} items${f === "dote" ? ` (${dotesFuera} dotes fuera del filtro)` : ""}`);
  console.log(`${items.length} items de auditoría en total.`);
  if (ids) {
    const sinCasar = ids.filter((id) => !items.some((i) => casaConIds(i, [id])));
    if (sinCasar.length) console.log(`Ids sin ningún item: ${sinCasar.join(", ")}`);
  }
  if (contar) return;

  const sinMotor = items.filter((i) => i.motor.length === 0);
  const salida = argv[0] && !argv[0].startsWith("--") ? argv[0] : "catalogo-motor.json";
  writeFileSync(salida, JSON.stringify(items, null, 2));
  console.log(`${sinMotor.length} sin "motor" definido: ${sinMotor.map((i) => `${i.piezaId}${i.nivel ? "#" + i.nivel : ""}`).join(", ") || "(ninguno)"}`);
  console.log(`${excluidas.length} piezas excluidas del alcance:`);
  for (const e of excluidas) console.log(`  - ${e}`);
  console.log(`Escrito en ${salida}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
