"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, canEditCharacter } from "@/lib/auth-helpers";
import { characterCreateSchema } from "@/lib/validation";
import {
  type Sheet,
  parseSheet,
  setAtributoValue,
  setHabilidadValue,
  addEspecialidad,
  removeEspecialidad,
  resetBuild,
  equipar,
  desequipar,
  costeDePieza,
  costeDeRetirar,
  piezaEquipadaSchema,
  type AtributoId,
  type HabilidadId,
  type PiezaEquipada,
  type AprobacionSnapshot,
  parseSnapshot,
  setPrioridad,
  RECURSOS_POR_LETRA,
  costeMarginal,
  COSTE_FACTOR_ATRIBUTO,
  COSTE_FACTOR_HABILIDAD,
  ATRIBUTO_MAX,
  HABILIDAD_MAX,
  type CategoriaPrioridad,
  type LetraPrioridad,
} from "@/lib/rules";

export type SaveResult =
  | { ok: true; sheet: Sheet; xp?: number; creditos?: number }
  | { ok: false; error: string };

type Editable = {
  sheet: Sheet;
  aprobada: boolean;
  snapshot: AprobacionSnapshot | null;
  xp: number;
  creditos: number;
};

// Carga la ficha comprobando permisos. Base de todas las acciones de autosave.
// Trae también el estado de aprobación y la XP disponible: aprobada + subir
// de nivel se paga con XP (ver setAtributoAction/setHabilidadAction), al
// mismo coste por nivel que en creación (docs/sistema.md, "Coste y progresión").
async function loadEditable(characterId: string): Promise<Editable | { error: string }> {
  const user = await requireUser();
  const character = await prisma.character.findUnique({
    where: { id: characterId },
  });
  if (!character) return { error: "Personaje no encontrado" };
  if (!canEditCharacter(user, character)) {
    return { error: "No tienes permiso para editar esta ficha" };
  }
  return {
    sheet: parseSheet(character.stats),
    aprobada: character.status === "APPROVED",
    snapshot: parseSnapshot(character.approvedSnapshot),
    xp: character.xp,
    creditos: character.creditos,
  };
}

// Coste total en XP para subir de `desde` a `hasta` (ambos inclusive del
// lado alto), sumando el coste marginal de cada nivel intermedio.
function costeSubidaXp(desde: number, hasta: number, factor: number): number {
  let total = 0;
  for (let nivel = desde + 1; nivel <= hasta; nivel++) total += costeMarginal(nivel, factor);
  return total;
}

async function persist(
  characterId: string,
  sheet: Sheet,
  name?: string,
): Promise<SaveResult> {
  await prisma.character.update({
    where: { id: characterId },
    data: name === undefined ? { stats: sheet } : { name, stats: sheet },
  });
  return { ok: true, sheet };
}

// Aprobada: ya no es el pool de creación, es progresión con XP. Solo se
// puede subir (nunca bajar del valor actual — "comprado" con XP es tan
// firme como comprado en creación) y el techo pasa a ser el del sistema
// (6), no el de creación (4). El coste es el mismo Nivel×factor de
// "Coste y progresión" (docs/sistema.md), sumado nivel a nivel desde el
// valor actual hasta el pedido.
export async function setAtributoAction(
  characterId: string,
  atributoId: AtributoId,
  value: number,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  if (!ctx.aprobada) {
    return persist(characterId, setAtributoValue(ctx.sheet, atributoId, value));
  }

  const actual = ctx.sheet.atributos[atributoId];
  const objetivo = Math.max(actual, Math.min(ATRIBUTO_MAX, Math.round(value)));
  if (objetivo === actual) return { ok: true, sheet: ctx.sheet, xp: ctx.xp };

  const coste = costeSubidaXp(actual, objetivo, COSTE_FACTOR_ATRIBUTO);
  if (coste > ctx.xp) return { ok: false, error: "No tienes XP suficiente" };

  const sheet: Sheet = { ...ctx.sheet, atributos: { ...ctx.sheet.atributos, [atributoId]: objetivo } };
  const xp = ctx.xp - coste;
  await prisma.character.update({ where: { id: characterId }, data: { stats: sheet, xp } });
  revalidatePath(`/characters/${characterId}`);
  revalidatePath("/master");
  return { ok: true, sheet, xp };
}

export async function setHabilidadAction(
  characterId: string,
  habilidadId: HabilidadId,
  value: number,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  if (!ctx.aprobada) {
    return persist(characterId, setHabilidadValue(ctx.sheet, habilidadId, value));
  }

  const actual = ctx.sheet.habilidades[habilidadId].valor;
  const objetivo = Math.max(actual, Math.min(HABILIDAD_MAX, Math.round(value)));
  if (objetivo === actual) return { ok: true, sheet: ctx.sheet, xp: ctx.xp };

  const coste = costeSubidaXp(actual, objetivo, COSTE_FACTOR_HABILIDAD);
  if (coste > ctx.xp) return { ok: false, error: "No tienes XP suficiente" };

  const sheet: Sheet = {
    ...ctx.sheet,
    habilidades: {
      ...ctx.sheet.habilidades,
      [habilidadId]: { ...ctx.sheet.habilidades[habilidadId], valor: objetivo },
    },
  };
  const xp = ctx.xp - coste;
  await prisma.character.update({ where: { id: characterId }, data: { stats: sheet, xp } });
  revalidatePath(`/characters/${characterId}`);
  revalidatePath("/master");
  return { ok: true, sheet, xp };
}

// Reparto de letras (creación por prioridad, docs/sistema.md §2). Congelado
// tras aprobar, igual que atributos/habilidades. El caso de Recursos es
// especial: la letra fija los créditos iniciales (Character.creditos), un
// campo que normalmente solo toca el máster — aquí es seguro porque el valor
// sale de una tabla fija (RECURSOS_POR_LETRA), el jugador nunca escribe el
// número a mano.
export async function setPrioridadAction(
  characterId: string,
  categoria: CategoriaPrioridad,
  letra: LetraPrioridad | null,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  if (ctx.aprobada) return { ok: false, error: "La ficha ya está aprobada" };

  const sheet = setPrioridad(ctx.sheet, categoria, letra);
  if (categoria === "recursos") {
    const creditos = sheet.prioridades.recursos
      ? RECURSOS_POR_LETRA[sheet.prioridades.recursos].creditos
      : 0;
    await prisma.character.update({
      where: { id: characterId },
      data: { stats: sheet, creditos },
    });
    // El creditos que se acaba de fijar lo lee la tira de máster de esta
    // misma página (server component) y el panel /master — sin esto se
    // quedan con el valor viejo hasta un F5. Por el mismo motivo va también
    // en la respuesta: es lo que CharacterSheet reconcilia para que la
    // Tienda no siga mostrando el saldo de antes de elegir la letra.
    revalidatePath(`/characters/${characterId}`);
    revalidatePath("/master");
    return { ok: true, sheet, creditos };
  }
  return persist(characterId, sheet);
}

export async function addEspecialidadAction(
  characterId: string,
  habilidadId: HabilidadId,
  nombre: string,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(characterId, addEspecialidad(ctx.sheet, habilidadId, nombre));
}

export async function removeEspecialidadAction(
  characterId: string,
  habilidadId: HabilidadId,
  nombre: string,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(characterId, removeEspecialidad(ctx.sheet, habilidadId, nombre));
}

// Comprar = equipar: no hay inventario aparte (ver lib/rules/equipo.ts), así
// que el coste se cobra en el mismo golpe que se añade la pieza. El precio
// se recalcula aquí con el catálogo — no se confía en lo que mande el
// cliente — y si no llega a cubrirlo, se rechaza sin tocar ni la ficha ni
// los créditos.
export async function equiparAction(
  characterId: string,
  pieza: PiezaEquipada,
): Promise<SaveResult> {
  // El shape llega del cliente sin garantías: se valida aquí, no solo se confía
  // en que `equipar` recorte lo que no reconoce.
  const parsed = piezaEquipadaSchema.safeParse(pieza);
  if (!parsed.success) return { ok: false, error: "Pieza de equipo inválida" };
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const coste = costeDePieza(parsed.data);
  if (coste > ctx.creditos) return { ok: false, error: "No tienes créditos suficientes" };

  const sheet = equipar(ctx.sheet, parsed.data);
  if (sheet === ctx.sheet) return { ok: false, error: "Pieza de equipo inválida" };

  const creditos = ctx.creditos - coste;
  await prisma.character.update({ where: { id: characterId }, data: { stats: sheet, creditos } });
  revalidatePath(`/characters/${characterId}`);
  revalidatePath("/master");
  return { ok: true, sheet, creditos };
}

// Desequipar devuelve el coste íntegro de lo retirado (decisión del usuario,
// 2026-09-10) — incluida cualquier mejora o subsistema que colgara de la
// pieza, porque desequipar() se los lleva por delante en el mismo golpe.
export async function desequiparAction(
  characterId: string,
  instanciaId: string,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const refund = costeDeRetirar(ctx.sheet, instanciaId);
  const sheet = desequipar(ctx.sheet, instanciaId);
  const creditos = ctx.creditos + refund;
  await prisma.character.update({ where: { id: characterId }, data: { stats: sheet, creditos } });
  revalidatePath(`/characters/${characterId}`);
  revalidatePath("/master");
  return { ok: true, sheet, creditos };
}

// Devuelve atributos y habilidades a cero. La identidad se conserva.
// Bloqueado en fichas aprobadas: resetear es vender todo de golpe.
export async function resetBuildAction(characterId: string): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  if (ctx.aprobada) return { ok: false, error: "La ficha ya está aprobada" };
  return persist(characterId, resetBuild(ctx.sheet));
}

export async function saveIdentityAction(
  characterId: string,
  patch: {
    name: string;
    edad: number | null;
    altura: number | null;
    peso: number | null;
    especieId: string | null;
    trasfondo: string;
    motivacion: string;
  },
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const nameParsed = characterCreateSchema.safeParse({ name: patch.name });
  if (!nameParsed.success) return { ok: false, error: "El nombre no es válido" };

  const numeroOpcional = (v: number | null) => (v === null ? null : clampInt(v, 0, 999));

  return persist(
    characterId,
    {
      ...ctx.sheet,
      edad: numeroOpcional(patch.edad),
      altura: numeroOpcional(patch.altura),
      peso: numeroOpcional(patch.peso),
      especieId: patch.especieId ? String(patch.especieId).slice(0, 40) : null,
      trasfondo: String(patch.trasfondo ?? "").slice(0, 2000),
      motivacion: String(patch.motivacion ?? "").slice(0, 500),
    },
    nameParsed.data.name,
  );
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}
