// RECURSOS: cargas de batería, munición, dosis gastadas y recargadas en
// partida (docs/tareas.md, entrada "RECURSOS — extensión de Fase 6b").
// Diseño acordado en conversación 2026-09-22 — vive dentro del `Sheet`
// (Character.stats / NpcTemplate.stats), NO como snapshot de `Combatiente`:
// PG/fatiga son una foto que se pierde al cerrar el combate (ver el
// comentario de `Combatiente` en schema.prisma), pero nadie espera que sus
// balas se rellenen solas al cerrar la consola — recursos necesita lo
// contrario, persistir igual que el equipo.
//
// Dos comportamientos de recarga, según de dónde salga el recurso — no uno
// solo (primer intento de unificarlos, corregido en conversación):
//   "stock" (ArmaFuego.municion): sin cargadores físicos que rastrear — se
//     ignora cuál está puesto, igual que en mesa. Un único total. Recargar
//     SUMA una carga más al máximo Y al actual (sin tope superior: la Carga
//     Transportable es el límite natural, aunque sus penalizadores siguen
//     sin mecanizar).
//   "tope" (Subsistema.célula): el máximo es fijo (la capacidad de la
//     célula) y no cambia nunca. Recargar restaura el actual al máximo, sin
//     más — como cargar un móvil, no como comprar cargadores de más.
import { z } from "zod";
import { equipoPorId } from "../catalog/equipo";
import type { PiezaEquipada } from "./equipo";
import type { Sheet } from "./sheet";

export type RecursoInstancia = { instanciaId: string; actual: number; max: number };

export const recursoSchema = z.object({
  instanciaId: z.string().min(1).max(60),
  actual: z.number().int().min(0),
  max: z.number().int().min(0),
});

export type TipoRecarga = "stock" | "tope";

// Precios fijos, sin depender de la capacidad de la pieza (docs/sistema.md
// S17/S18) — decisión explícita del usuario, sin base en `EQUIP`.
export const PRECIO_CARGADOR_BALAS = 50; // S18
export const PRECIO_BATERIA_PORTATIL = 150; // S17

// Capacidad y comportamiento de recarga de una pieza equipada, o null si esa
// pieza no aporta ningún recurso: familias fuera de alcance de este primer
// pase (armaPesada, granada, armaMelee...) y Subsistemas sin `célula` (el
// Escudo Deflector es autorrecargable, ver catalog/equipo.ts) devuelven null
// a propósito — no es un hueco, es la pieza sin recurso que rastrear.
export function capacidadDePieza(pieza: PiezaEquipada): { max: number; tipo: TipoRecarga } | null {
  const cat = equipoPorId(pieza.catalogoId);
  if (!cat) return null;
  if (cat.familia === "arma") return { max: cat.municion, tipo: "stock" };
  if (cat.familia === "subsistema" && cat.celula) return { max: cat.celula.cargas, tipo: "tope" };
  return null;
}

// Reconcilia sheet.recursos con sheet.equipo: añade una entrada a tope por
// cada pieza equipada que aporte recurso y todavía no la tuviera, y quita
// las que ya no están equipadas. Nunca toca `actual` ni `max` de una entrada
// que ya existe — el stock de balas comprado de más (`max` por encima de la
// capacidad de catálogo, tras comprar cargadores) tiene que sobrevivir a
// esto igual que el propio gasto, mismo cuidado que la reconciliación de
// atributos/habilidades (CharacterSheet.tsx, 2026-09-22: no pisar un cambio
// más nuevo con una foto vieja).
export function reconciliarRecursos(sheet: Sheet): Sheet {
  const existentes = new Map(sheet.recursos.map((r) => [r.instanciaId, r]));
  const recursos: RecursoInstancia[] = [];
  for (const pieza of sheet.equipo) {
    const cap = capacidadDePieza(pieza);
    if (!cap) continue;
    const previo = existentes.get(pieza.instanciaId);
    recursos.push(previo ?? { instanciaId: pieza.instanciaId, actual: cap.max, max: cap.max });
  }
  const sinCambios =
    recursos.length === sheet.recursos.length && recursos.every((r, i) => r === sheet.recursos[i]);
  return sinCambios ? sheet : { ...sheet, recursos };
}

export function recursoDe(sheet: Sheet, instanciaId: string): RecursoInstancia | undefined {
  return sheet.recursos.find((r) => r.instanciaId === instanciaId);
}

// Delta manual (+/-), clamp [0, max] — mismo patrón que ajustarRecurso() de
// PG/fatiga en master/combate/actions.ts, pero sobre la ficha persistente en
// vez de sobre el snapshot de un Combatiente.
export function ajustarRecurso(sheet: Sheet, instanciaId: string, delta: number): Sheet {
  const recurso = recursoDe(sheet, instanciaId);
  if (!recurso || !Number.isFinite(delta)) return sheet;
  const actual = Math.max(0, Math.min(recurso.max, recurso.actual + Math.round(delta)));
  if (actual === recurso.actual) return sheet;
  return {
    ...sheet,
    recursos: sheet.recursos.map((r) => (r.instanciaId === instanciaId ? { ...r, actual } : r)),
  };
}

// "Comprar cargador"/"comprar batería": aplica el comportamiento que toque
// según el tipo de recurso, con su precio fijo (S17/S18). null si la pieza
// no tiene recurso que recargar — no debería llegar aquí, la UI no ofrece el
// botón en ese caso, pero el servidor no confía en el cliente.
export function comprarRecarga(
  sheet: Sheet,
  instanciaId: string,
): { sheet: Sheet; coste: number } | null {
  const pieza = sheet.equipo.find((p) => p.instanciaId === instanciaId);
  const recurso = recursoDe(sheet, instanciaId);
  if (!pieza || !recurso) return null;
  const cap = capacidadDePieza(pieza);
  if (!cap) return null;

  const nuevo: RecursoInstancia =
    cap.tipo === "stock"
      ? { ...recurso, actual: recurso.actual + cap.max, max: recurso.max + cap.max }
      : { ...recurso, actual: recurso.max };
  const coste = cap.tipo === "stock" ? PRECIO_CARGADOR_BALAS : PRECIO_BATERIA_PORTATIL;

  return {
    sheet: { ...sheet, recursos: sheet.recursos.map((r) => (r.instanciaId === instanciaId ? nuevo : r)) },
    coste,
  };
}

// Gasto de munición de un modo de disparo (docs/tareas.md, RECURSOS): un
// modo sin "F. Auto" gasta 1; con "F. Auto" gasta fijo = la capacidad del
// cargador del arma (`municion`), sea cual sea el stock que quede — no hay
// cargadores físicos que rastrear, así que el número no cambia aunque
// queden más balas sueltas en el total. Confirmado en conversación: no
// existe un modo "Ráfaga" separado en el catálogo.
export function gastoDelModo(etiqueta: string, municionArma: number): number {
  return etiqueta.includes("F. Auto") ? municionArma : 1;
}
