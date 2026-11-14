// Aumentos en la ficha (docs/sistema.md §11.3, tandas A0 y A1 de docs/propuesta-aumentos.md):
// comprar, subir de nivel, pagar con la bolsa del humano y marcar requisitos rotos (A0);
// los +1 a atributos, la vida de Hipertrofia y las rebajas de coste de habilidad (A1).
// Lo que ponen en tiradas y blindaje (A2a, A2b y la cobertura de A3) vive en
// aumentosTiradas.ts; las reducciones de penalizador (A3), aquí abajo; el resto, A4-A7.
//
// Viven en sheet.equipo como cualquier pieza, pero no se compran con equipar(): las
// operaciones piden otras operaciones, los implantes suben de nivel pagando la
// diferencia, algunas piezas piden una elección y el humano paga primero con su bolsa.
// Quitarlos es desequipar() de siempre. En creación se devuelve lo pagado, la bolsa a
// la bolsa y el resto a créditos (devolucionAumento); aprobada la ficha, nada.
import { z } from "zod";
import { equipoPorId } from "../catalog/equipo";
import { AUMENTOS, type Aumento, type Implante, type NivelImplante, type OperacionGenetica, type ReduccionPenalizadorAumento } from "../catalog/aumentos";
import { acumulaPorClave, claveModificador, costeDePieza, nivelesHasta, ultimoQueDefine, type PiezaEquipada } from "./equipo";
import type { FuenteConNombre } from "./sobreesfuerzo";
import { HABILIDADES, type HabilidadId } from "./habilidades";
import { ATRIBUTOS, type AtributoId } from "./atributos";
import { SIN_AJUSTE_UMBRALES, type AjusteUmbral, type AjusteUmbrales, type ReduccionPorAplicado } from "./estados";
import type { ModificadorConFuente } from "./modificadores";
import { origenDePieza } from "./origen";
import type { AjusteCoste, AjusteHabilidad } from "./progresion";
import type { Sheet } from "./sheet";

export type CompraAumento = { catalogoId: string; nivel?: number; eleccion?: string };

export const compraAumentoSchema = z.object({
  catalogoId: z.string().min(1).max(60),
  nivel: z.number().int().min(1).max(4).optional(),
  eleccion: z.string().min(1).max(40).optional(),
});

export function aumentoPorId(id: string): Aumento | null {
  const cat = equipoPorId(id);
  return cat?.familia === "operacionGenetica" || cat?.familia === "implante" ? cat : null;
}

export function esPiezaAumento(pieza: PiezaEquipada): boolean {
  return aumentoPorId(pieza.catalogoId) !== null;
}

// ── Requisitos de las operaciones ─────────────────────────────────────────

// Labels de las operaciones requeridas que no están equipadas (hacen falta todas, §11.1).
export function requisitosQueFaltan(sheet: Pick<Sheet, "equipo">, op: OperacionGenetica): string[] {
  return op.requisitos
    .filter((id) => !sheet.equipo.some((p) => p.catalogoId === id))
    .map((id) => aumentoPorId(id)?.label ?? id);
}

export type AumentoRoto = { instanciaId: string; faltan: string[] };

// Ids de las operaciones equipadas que funcionan: todos sus requisitos equipados y
// funcionando, en cadena (quitar Mielinización apaga Neurogénesis y, por ella,
// Engramática). Con el requisito roto la operación no da efectos, como una dote sin
// su requisito (S34; usuario, 2026-10-22).
export function operacionesActivas(sheet: Pick<Sheet, "equipo">): Set<string> {
  const equipadas = new Set(sheet.equipo.map((p) => p.catalogoId));
  const activas = new Set<string>();
  let cambio = true;
  while (cambio) {
    cambio = false;
    for (const id of equipadas) {
      const cat = aumentoPorId(id);
      if (cat?.familia !== "operacionGenetica" || activas.has(id)) continue;
      if (cat.requisitos.every((r) => activas.has(r))) {
        activas.add(id);
        cambio = true;
      }
    }
  }
  return activas;
}

// Operaciones equipadas con algún requisito que falta o que tampoco funciona (igual que
// las dotes: no se borra nada, la ficha lo marca y la operación no da efectos).
export function aumentosConRequisitoRoto(sheet: Pick<Sheet, "equipo">): AumentoRoto[] {
  const activas = operacionesActivas(sheet);
  return sheet.equipo.flatMap((p) => {
    const cat = aumentoPorId(p.catalogoId);
    if (cat?.familia !== "operacionGenetica" || activas.has(cat.id)) return [];
    const faltan = cat.requisitos.filter((r) => !activas.has(r)).map((r) => aumentoPorId(r)?.label ?? r);
    return faltan.length ? [{ instanciaId: p.instanciaId, faltan }] : [];
  });
}

// ── Incompatibilidades (E4, sync Drive 2026-11-14) ───────────────────────

// Ids de los aumentos incompatibles con `catalogoId`, en los dos sentidos: lo que declara él y
// los que lo declaran a él (cada pareja se escribe en un solo lado del catálogo).
export function incompatiblesCon(catalogoId: string): string[] {
  const propios = aumentoPorId(catalogoId)?.incompatibleCon ?? [];
  const ajenos = AUMENTOS.filter((a) => a.incompatibleCon?.includes(catalogoId)).map((a) => a.id);
  return [...new Set([...propios, ...ajenos])].filter((id) => id !== catalogoId);
}

// Labels de lo equipado que es incompatible con `catalogoId`.
export function incompatiblesEquipados(sheet: Pick<Sheet, "equipo">, catalogoId: string): string[] {
  const ids = incompatiblesCon(catalogoId);
  return [...new Set(sheet.equipo.filter((p) => ids.includes(p.catalogoId)).map((p) => p.catalogoId))].map(
    (id) => aumentoPorId(id)?.label ?? id,
  );
}

export type AumentoIncompatible = { instanciaId: string; con: string[] };

// Aumentos equipados junto a otro incompatible (fichas de antes de E4, o compradas a mano por
// el máster): solo aviso, como el requisito roto; no se quita ni se apaga nada (usuario,
// 2026-11-14).
export function aumentosIncompatibles(sheet: Pick<Sheet, "equipo">): AumentoIncompatible[] {
  return sheet.equipo.flatMap((p) => {
    if (!esPiezaAumento(p)) return [];
    const con = incompatiblesEquipados(sheet, p.catalogoId);
    return con.length ? [{ instanciaId: p.instanciaId, con }] : [];
  });
}

// ── Elección (sentido de Introgresión, modelo del Brazo) ──────────────────

export function nivelDeImplante(imp: Implante, nivel: number): NivelImplante | null {
  return imp.niveles.find((n) => n.nivel === nivel) ?? null;
}

// Etiqueta legible de lo elegido en una pieza equipada, o null si no lleva elección.
export function etiquetaEleccionAumento(pieza: PiezaEquipada): string | null {
  const cat = aumentoPorId(pieza.catalogoId);
  if (!cat || !pieza.eleccion) return null;
  if (cat.familia === "operacionGenetica") {
    return cat.eleccion?.opciones.find((o) => o.id === pieza.eleccion)?.label ?? null;
  }
  const nivel = pieza.nivel ? nivelDeImplante(cat, pieza.nivel) : null;
  return nivel?.variantes?.find((v) => v.id === pieza.eleccion)?.label ?? null;
}

// Elecciones de una operación repetible que ya tiene la ficha (no se repiten).
export function eleccionesTomadas(sheet: Pick<Sheet, "equipo">, catalogoId: string): string[] {
  return sheet.equipo.flatMap((p) => (p.catalogoId === catalogoId && p.eleccion ? [p.eleccion] : []));
}

// ── Plan de compra ─────────────────────────────────────────────────────

export type PlanCompraAumento =
  | {
      ok: true;
      // Precio a pagar: el del catálogo, o la diferencia si es subir un implante.
      precio: number;
      // Instancia que se sube de nivel, o null si es una pieza nueva.
      subeDe: { instanciaId: string; nivel: number } | null;
    }
  | { ok: false; motivo: string };

// Valida la compra contra la ficha y dice cuánto cuesta. Sin dinero de por medio: eso
// es repartoPago. La UI lo usa para pintar precio y motivo; el servidor, para cobrar.
// `atributos`: los permanentes de la ficha (los de los requisitos de dote: especie y aumentos,
// ValoresRequisito.atributos), para el requisito de atributo de un modelo (Brazo 4 Fuerte,
// Fuerza 2; sync Drive 2026-11-14). Sin ellos, una compra que lo pide no se valida.
export function planCompraAumento(
  sheet: Pick<Sheet, "equipo">,
  compra: CompraAumento,
  atributos?: Readonly<Record<AtributoId, number>>,
): PlanCompraAumento {
  const cat = aumentoPorId(compra.catalogoId);
  if (!cat) return { ok: false, motivo: "No es un aumento del catálogo." };
  // También al subir de nivel una pieza que ya convive con su incompatible: es comprar.
  const incompatibles = incompatiblesEquipados(sheet, cat.id);
  if (incompatibles.length) return { ok: false, motivo: `Incompatible con ${incompatibles.join(", ")}.` };
  return cat.familia === "operacionGenetica" ? planOperacion(sheet, cat, compra) : planImplante(sheet, cat, compra, atributos);
}

// El atributo que pide un modelo para instalarse, si falta: "Requiere Fuerza 2 (tienes 1)."
export function requisitoAtributoQueFalta(
  req: { id: AtributoId; min: number } | undefined,
  atributos: Readonly<Record<AtributoId, number>> | undefined,
): string | null {
  if (!req) return null;
  const label = ATRIBUTOS.find((a) => a.id === req.id)?.label ?? req.id;
  if (!atributos) return `Requiere ${label} ${req.min}.`;
  const tienes = atributos[req.id];
  return tienes >= req.min ? null : `Requiere ${label} ${req.min} (tienes ${tienes}).`;
}

function planOperacion(sheet: Pick<Sheet, "equipo">, op: OperacionGenetica, compra: CompraAumento): PlanCompraAumento {
  if (compra.nivel !== undefined) return { ok: false, motivo: "Las operaciones no tienen nivel." };
  const yaTiene = sheet.equipo.some((p) => p.catalogoId === op.id);
  if (op.eleccion) {
    if (!compra.eleccion) return { ok: false, motivo: `Elige ${op.eleccion.label.toLowerCase()}.` };
    const opcion = op.eleccion.opciones.find((o) => o.id === compra.eleccion);
    if (!opcion) return { ok: false, motivo: `${op.eleccion.label} no válido.` };
    if (eleccionesTomadas(sheet, op.id).includes(opcion.id)) {
      return { ok: false, motivo: `Ya tienes ${op.label} con ${opcion.label}.` };
    }
    if (yaTiene && !op.repetible) return { ok: false, motivo: `Ya tienes ${op.label}.` };
  } else {
    if (compra.eleccion !== undefined) return { ok: false, motivo: `${op.label} no pide elección.` };
    if (yaTiene) return { ok: false, motivo: `Ya tienes ${op.label}.` };
  }
  const faltan = requisitosQueFaltan(sheet, op);
  if (faltan.length) return { ok: false, motivo: `Falta: ${faltan.join(", ")}.` };
  return { ok: true, precio: op.coste, subeDe: null };
}

function planImplante(
  sheet: Pick<Sheet, "equipo">,
  imp: Implante,
  compra: CompraAumento,
  atributos: Readonly<Record<AtributoId, number>> | undefined,
): PlanCompraAumento {
  if (compra.nivel === undefined) return { ok: false, motivo: "Elige un nivel." };
  const nivel = nivelDeImplante(imp, compra.nivel);
  if (!nivel) return { ok: false, motivo: `${imp.label} no tiene nivel ${compra.nivel}.` };
  if (nivel.variantes?.length) {
    const que = nivel.etiquetaVariantes?.toLowerCase() ?? "modelo";
    if (!compra.eleccion) return { ok: false, motivo: `Elige ${que}.` };
    const variante = nivel.variantes.find((v) => v.id === compra.eleccion);
    if (!variante) return { ok: false, motivo: `${nivel.etiquetaVariantes ?? "Modelo"} no válido.` };
    const falta = requisitoAtributoQueFalta(variante.requisitoAtributo, atributos);
    if (falta) return { ok: false, motivo: falta };
  } else if (compra.eleccion !== undefined) {
    return { ok: false, motivo: `El nivel ${nivel.nivel} no tiene modelos.` };
  }

  // Un solo implante de cada: el que ya hay solo puede subir (§11.3). Cambiar de modelo
  // al mismo nivel es comprar otro brazo: hay que quitar el que llevas.
  const actual = sheet.equipo.find((p) => p.catalogoId === imp.id);
  if (!actual) return { ok: true, precio: nivel.coste, subeDe: null };
  const nivelActual = actual.nivel ?? 0;
  if (nivel.nivel <= nivelActual) {
    return {
      ok: false,
      motivo: `Ya tienes ${imp.label} de nivel ${nivelActual}: solo se puede subir.`,
    };
  }
  // Al subir el Brazo de 3 a 4 se elige cualquier modelo del nivel 4, aunque no
  // "corresponda" al del 3: los modelos de cada nivel son distintos (usuario, 2026-10-22).
  const pagado = nivelDeImplante(imp, nivelActual)?.coste ?? 0;
  return { ok: true, precio: Math.max(0, nivel.coste - pagado), subeDe: { instanciaId: actual.instanciaId, nivel: nivelActual } };
}

// ── Pago: bolsa del humano primero, luego créditos ────────────────────────

// Saldo de la bolsa: la de la especie menos lo gastado. Lo que no se gasta se pierde
// (nunca se convierte en créditos).
export function saldoBolsaAumentos(bolsaTotal: number | null, gastada: number): number {
  return Math.max(0, (bolsaTotal ?? 0) - gastada);
}

export type RepartoPago = { deBolsa: number; deCreditos: number };

// null si entre la bolsa y los créditos no llega.
export function repartoPago(precio: number, saldoBolsa: number, creditos: number): RepartoPago | null {
  const deBolsa = Math.min(precio, Math.max(0, saldoBolsa));
  const deCreditos = precio - deBolsa;
  return deCreditos > creditos ? null : { deBolsa, deCreditos };
}

// Aplica una compra ya validada a la ficha: añade la pieza o sube la que había.
function aplicarPlan(
  sheet: Sheet,
  compra: CompraAumento,
  subeDe: { instanciaId: string } | null,
  instanciaId: string,
  deBolsa: number,
): Sheet {
  if (subeDe) {
    return {
      ...sheet,
      equipo: sheet.equipo.map((p) => {
        if (p.instanciaId !== subeDe.instanciaId) return p;
        const pagoBolsa = (p.pagoBolsa ?? 0) + deBolsa;
        return { ...p, nivel: compra.nivel, eleccion: compra.eleccion, ...(pagoBolsa > 0 ? { pagoBolsa } : {}) };
      }),
    };
  }
  const pieza: PiezaEquipada = {
    instanciaId,
    catalogoId: compra.catalogoId,
    ...(compra.nivel !== undefined ? { nivel: compra.nivel } : {}),
    ...(compra.eleccion !== undefined ? { eleccion: compra.eleccion } : {}),
    ...(deBolsa > 0 ? { pagoBolsa: deBolsa } : {}),
  };
  return { ...sheet, equipo: [...sheet.equipo, pieza] };
}

// `atributos`: los permanentes (ValoresRequisito.atributos), para el requisito de atributo de
// un modelo (planCompraAumento). Sin ellos, esa compra se rechaza.
export type ContextoCompraAumento =
  | {
      libre: false;
      instanciaId: string;
      // Bolsa de la especie (FichaResuelta.bolsaAumentos.total / bolsaDeAumentos), o null.
      bolsaTotal: number | null;
      creditos: number;
      atributos?: Readonly<Record<AtributoId, number>>;
    }
  // NPC (§14.3): sin cartera ni bolsa; las reglas de la compra, las mismas.
  | { libre: true; instanciaId: string; atributos?: Readonly<Record<AtributoId, number>> };

export type ResultadoCompraAumento =
  | { ok: true; sheet: Sheet; precio: number; pago: RepartoPago }
  | { ok: false; error: string };

export function comprarAumento(sheet: Sheet, compra: CompraAumento, ctx: ContextoCompraAumento): ResultadoCompraAumento {
  const plan = planCompraAumento(sheet, compra, ctx.atributos);
  if (!plan.ok) return { ok: false, error: plan.motivo };
  if (ctx.libre) {
    return { ok: true, sheet: aplicarPlan(sheet, compra, plan.subeDe, ctx.instanciaId, 0), precio: 0, pago: { deBolsa: 0, deCreditos: 0 } };
  }
  const saldo = saldoBolsaAumentos(ctx.bolsaTotal, sheet.bolsaAumentosGastada);
  const pago = repartoPago(plan.precio, saldo, ctx.creditos);
  if (!pago) return { ok: false, error: "No tienes créditos suficientes" };
  const conPieza = aplicarPlan(sheet, compra, plan.subeDe, ctx.instanciaId, pago.deBolsa);
  return {
    ok: true,
    sheet: { ...conPieza, bolsaAumentosGastada: sheet.bolsaAumentosGastada + pago.deBolsa },
    precio: plan.precio,
    pago,
  };
}

// ── Devolución al quitar (solo en creación, usuario 2026-10-22) ──────────────

// Lo que vuelve al quitar un aumento con la ficha en creación: lo pagado con la bolsa,
// a la bolsa; el resto del precio (el del nivel actual: subir cobraba la diferencia), a
// créditos. null si la instancia no es un aumento. Aprobada la ficha no se llama.
export function devolucionAumento(sheet: Sheet, instanciaId: string): RepartoPago | null {
  const pieza = sheet.equipo.find((p) => p.instanciaId === instanciaId);
  if (!pieza || !esPiezaAumento(pieza)) return null;
  const precio = costeDePieza(pieza);
  const deBolsa = Math.min(precio, pieza.pagoBolsa ?? 0, sheet.bolsaAumentosGastada);
  return { deBolsa, deCreditos: precio - deBolsa };
}

// ── Efectos permanentes (A1) ───────────────────────────────────────────

// Los modificadores permanentes de los aumentos equipados, con origen "aumento" y la
// pieza como fuente: +1 a atributos básicos y el multiplicador de vida de Hipertrofia.
// Cuentan para los atributos efectivos, los derivados y los requisitos de dote (§11.3:
// "el aumento es parte del cuerpo, como la especie"), y no tienen techo (R7, S7): el 4
// de creación y el 6 miran solo lo comprado. Los activables (Neuroprótesis, A5) no
// pasan por aquí: llegarán como estado propio y no cuentan para requisitos (R3).
// Implantes: sus niveles se acumulan como los del equipo (acumulaPorClave).
// Una operación con el requisito roto no da efectos (operacionesActivas).
// `atributosNoApilanConGeneticos` (E5a, Control Sensorial: «no apilable con aumentos genéticos»):
// el +N del implante a un atributo solo suma lo que pase de lo que ya dan las operaciones que
// funcionan a ese atributo; si no pasa, su línea queda a 0 diciendo con qué no se suma.
export function modificadoresDeAumentos(sheet: Pick<Sheet, "equipo">): ModificadorConFuente[] {
  const activas = operacionesActivas(sheet);
  const deOperaciones = new Map<AtributoId, { valor: number; fuentes: string[] }>();
  for (const pieza of sheet.equipo) {
    const cat = aumentoPorId(pieza.catalogoId);
    if (cat?.familia !== "operacionGenetica" || !activas.has(cat.id)) continue;
    for (const m of cat.modificadores) {
      if (m.tipo !== "atributo") continue;
      const previo = deOperaciones.get(m.id) ?? { valor: 0, fuentes: [] };
      deOperaciones.set(m.id, { valor: previo.valor + m.valor, fuentes: [...previo.fuentes, cat.label] });
    }
  }
  return sheet.equipo.flatMap((pieza): ModificadorConFuente[] => {
    const cat = aumentoPorId(pieza.catalogoId);
    if (!cat) return [];
    if (cat.familia === "operacionGenetica") {
      if (!activas.has(cat.id)) return [];
      return cat.modificadores.map((m) => ({ ...m, origen: "aumento" as const, fuente: cat.label, item: origenDePieza("aumento", cat, pieza.instanciaId) }));
    }
    if (pieza.nivel === undefined) return [];
    const mods = acumulaPorClave(
      nivelesHasta(cat.niveles, pieza.nivel).map((n) => n.modificadores),
      claveModificador,
    );
    const fuente = `${cat.label} ${pieza.nivel}`;
    const item = origenDePieza("aumento", cat, pieza.instanciaId);
    return mods.map((m): ModificadorConFuente => {
      const genetico = m.tipo === "atributo" && cat.atributosNoApilanConGeneticos ? deOperaciones.get(m.id) : undefined;
      if (m.tipo !== "atributo" || !genetico) return { ...m, origen: "aumento", fuente, item };
      return {
        ...m,
        valor: Math.max(0, m.valor - genetico.valor),
        origen: "aumento",
        fuente: `${fuente} (no se apila con ${genetico.fuentes.join(" y ")})`,
        item,
      };
    });
  });
}

// Fuentes psiónicas de los implantes (au-04, T6a): el Implante de Resonancia Métrica deja tener
// poderes, con el sobreesfuerzo de su nivel (el del nivel más alto que lo trae).
export function fuentesPsionicasDeAumentos(sheet: Pick<Sheet, "equipo">): FuenteConNombre[] {
  return sheet.equipo.flatMap((pieza): FuenteConNombre[] => {
    const cat = aumentoPorId(pieza.catalogoId);
    if (cat?.familia !== "implante" || pieza.nivel === undefined) return [];
    const nivel = ultimoQueDefine(nivelesHasta(cat.niveles, pieza.nivel), "fuentePsionica");
    return nivel?.fuentePsionica ? [{ ...nivel.fuentePsionica.sobreesfuerzo, fuente: `${cat.label} ${pieza.nivel}` }] : [];
  });
}

// Rebaja de coste de habilidad (Neurogénesis, Engramática) por habilidad: la suma de
// las operaciones equipadas, en positivo.
function rebajasDeCoste(sheet: Pick<Sheet, "equipo">): Partial<Record<HabilidadId, number>> {
  const rebajas: Partial<Record<HabilidadId, number>> = {};
  const activas = operacionesActivas(sheet);
  for (const pieza of sheet.equipo) {
    const cat = aumentoPorId(pieza.catalogoId);
    if (cat?.familia !== "operacionGenetica" || !cat.rebajaCosteHabilidad || !activas.has(cat.id)) continue;
    const { habilidades, valor } = cat.rebajaCosteHabilidad;
    const ids = habilidades === "todas" ? HABILIDADES.map((h) => h.id) : habilidades;
    for (const id of ids) rebajas[id] = (rebajas[id] ?? 0) + valor;
  }
  return rebajas;
}

// El ajuste de coste para subir habilidades con XP con la ficha aprobada: el de la
// especie (casta de Manduk) más las rebajas de los aumentos, sumados en un único delta
// por nivel (el mínimo de 1 lo pone costeNivelHabilidad). Solo con la ficha aprobada
// (usuario, 2026-10-22): en creación el point-buy usa el de la especie a secas. Vale
// para lo que se compra después de tener la operación (§11.3) porque el coste se
// calcula al comprar. Psiónica y atributos, sin tocar.
export function ajusteCosteConAumentos(base: AjusteCoste, sheet: Pick<Sheet, "equipo">): AjusteCoste {
  const rebajas = Object.entries(rebajasDeCoste(sheet)) as [HabilidadId, number][];
  if (rebajas.length === 0) return base;
  const habilidades: Partial<Record<HabilidadId, AjusteHabilidad>> = { ...base.habilidades };
  for (const [id, rebaja] of rebajas) {
    const previo = habilidades[id];
    habilidades[id] = previo
      ? { delta: previo.delta - rebaja, etiqueta: `${previo.etiqueta} y aumentos` }
      : { delta: -rebaja, etiqueta: "aumentos" };
  }
  return { ...base, habilidades };
}

// El ajuste con el que se paga la siguiente subida: con la ficha aprobada (XP) lleva
// las rebajas de los aumentos; en borrador, el de la especie solo. Lo usan el servidor
// (setHabilidadAction) y resolverFicha (FichaResuelta.ajusteCosteSubida).
export function ajusteCosteDeSubida(base: AjusteCoste, sheet: Pick<Sheet, "equipo">, aprobada: boolean): AjusteCoste {
  return aprobada ? ajusteCosteConAumentos(base, sheet) : base;
}

// ── Penalizadores (A3) ─────────────────────────────────────────────────

// Las reducciones de penalizador de las operaciones que funcionan, con su pieza. Implantes (E5a:
// Metabolismo Sintético 2+, Control Sensorial): la del nivel más alto que la trae (total del nivel).
function reduccionesDeAumentos(sheet: Pick<Sheet, "equipo">): { fuente: string; r: ReduccionPenalizadorAumento }[] {
  const activas = operacionesActivas(sheet);
  return sheet.equipo.flatMap((pieza) => {
    const cat = aumentoPorId(pieza.catalogoId);
    if (cat?.familia === "implante") {
      if (pieza.nivel === undefined) return [];
      const nivel = ultimoQueDefine(nivelesHasta(cat.niveles, pieza.nivel), "reduceUmbrales");
      return (nivel?.reduceUmbrales ?? []).map((r) => ({ fuente: `${cat.label} ${pieza.nivel}`, r }));
    }
    if (cat?.familia !== "operacionGenetica" || !activas.has(cat.id)) return [];
    return (cat.reducePenalizador ?? []).map((r) => ({ fuente: cat.label, r }));
  });
}

const RECURSO_DE = { heridas: "salud", fatiga: "fatiga" } as const;

// Lo que los aumentos quitan a los penalizadores por heridas y fatiga en cualquier tirada
// (Estabilización Autonómica). Se suma al de la especie con sumaAjustesUmbrales (R8).
export function ajusteUmbralesDeAumentos(sheet: Pick<Sheet, "equipo">): AjusteUmbrales {
  const generales = reduccionesDeAumentos(sheet).filter(({ r }) => r.de !== "carga" && !r.aplicados);
  const ajuste = (recurso: keyof AjusteUmbrales): AjusteUmbral | null => {
    const con = generales.filter(({ r }) => r.de !== "carga" && RECURSO_DE[r.de] === recurso);
    if (con.length === 0) return null;
    return { valor: con.reduce((t, { r }) => t + r.valor, 0), fuente: [...new Set(con.map((c) => c.fuente))].join(" y ") };
  };
  const salud = ajuste("salud");
  const fatiga = ajuste("fatiga");
  return salud || fatiga ? { salud, fatiga } : SIN_AJUSTE_UMBRALES;
}

// Las que solo valen con ciertos aplicados (Neurogénesis Hipocampal), para
// modificadoresDeUmbrales: una compensación propia en el desglose, sin pasar de 0.
export function reduccionesPorAplicadoDeAumentos(sheet: Pick<Sheet, "equipo">): ReduccionPorAplicado[] {
  return reduccionesDeAumentos(sheet).flatMap(({ fuente, r }): ReduccionPorAplicado[] =>
    r.de !== "carga" && r.aplicados
      ? [{ recurso: RECURSO_DE[r.de], valor: r.valor, alcance: { tipo: "aplicado", aplicados: r.aplicados }, fuente, origen: "aumento" }]
      : [],
  );
}

// Matriz Ósea: los penalizadores por carga no están mecanizados (§5.5), así que su −1 va como
// nota junto a la carga (notasDeEstado).
// TODO(au-08): cuando haya penalizadores por carga, su reducción sale de aquí: la suma de las
// `reduccionesDeAumentos` con `de: "carga"` (con su fuente), restada al penalizador sin pasar de 0,
// como hace ajusteUmbralesDeAumentos con heridas y fatiga. Entonces esta nota sobra.
export function notasCargaDeAumentos(sheet: Pick<Sheet, "equipo">): string[] {
  return reduccionesDeAumentos(sheet).flatMap(({ fuente, r }) =>
    r.de === "carga" ? [`−${r.valor} a los penalizadores por carga (sin mecanizar) · ${fuente}`] : [],
  );
}
