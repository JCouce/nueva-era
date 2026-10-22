// Aumentos en la ficha (docs/sistema.md §11.3, tanda A0 de docs/propuesta-aumentos.md):
// comprar, subir de nivel, pagar con la bolsa del humano y marcar requisitos rotos.
// Sin efectos de reglas todavía (A1-A7).
//
// Viven en sheet.equipo como cualquier pieza, pero no se compran con equipar(): las
// operaciones piden otras operaciones, los implantes suben de nivel pagando la
// diferencia, algunas piezas piden una elección y el humano paga primero con su bolsa.
// Quitarlos es desequipar() de siempre. En creación se devuelve lo pagado, la bolsa a
// la bolsa y el resto a créditos (devolucionAumento); aprobada la ficha, nada.
import { z } from "zod";
import { equipoPorId } from "../catalog/equipo";
import type { Aumento, Implante, NivelImplante, OperacionGenetica } from "../catalog/aumentos";
import { costeDePieza, type PiezaEquipada } from "./equipo";
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

// Operaciones equipadas cuyo requisito se ha quitado después (igual que las dotes:
// no se borra nada, la ficha lo marca).
export function aumentosConRequisitoRoto(sheet: Pick<Sheet, "equipo">): AumentoRoto[] {
  return sheet.equipo.flatMap((p) => {
    const cat = aumentoPorId(p.catalogoId);
    if (cat?.familia !== "operacionGenetica") return [];
    const faltan = requisitosQueFaltan(sheet, cat);
    return faltan.length ? [{ instanciaId: p.instanciaId, faltan }] : [];
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
export function planCompraAumento(sheet: Pick<Sheet, "equipo">, compra: CompraAumento): PlanCompraAumento {
  const cat = aumentoPorId(compra.catalogoId);
  if (!cat) return { ok: false, motivo: "No es un aumento del catálogo." };
  return cat.familia === "operacionGenetica" ? planOperacion(sheet, cat, compra) : planImplante(sheet, cat, compra);
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

function planImplante(sheet: Pick<Sheet, "equipo">, imp: Implante, compra: CompraAumento): PlanCompraAumento {
  if (compra.nivel === undefined) return { ok: false, motivo: "Elige un nivel." };
  const nivel = nivelDeImplante(imp, compra.nivel);
  if (!nivel) return { ok: false, motivo: `${imp.label} no tiene nivel ${compra.nivel}.` };
  if (nivel.variantes?.length) {
    if (!compra.eleccion) return { ok: false, motivo: "Elige modelo." };
    if (!nivel.variantes.some((v) => v.id === compra.eleccion)) return { ok: false, motivo: "Modelo no válido." };
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

export type ContextoCompraAumento =
  | {
      libre: false;
      instanciaId: string;
      // Bolsa de la especie (FichaResuelta.bolsaAumentos.total / bolsaDeAumentos), o null.
      bolsaTotal: number | null;
      creditos: number;
    }
  // NPC (§14.3): sin cartera ni bolsa; las reglas de la compra, las mismas.
  | { libre: true; instanciaId: string };

export type ResultadoCompraAumento =
  | { ok: true; sheet: Sheet; precio: number; pago: RepartoPago }
  | { ok: false; error: string };

export function comprarAumento(sheet: Sheet, compra: CompraAumento, ctx: ContextoCompraAumento): ResultadoCompraAumento {
  const plan = planCompraAumento(sheet, compra);
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
