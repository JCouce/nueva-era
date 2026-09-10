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
  piezaEquipadaSchema,
  type AtributoId,
  type HabilidadId,
  type PiezaEquipada,
  type AprobacionSnapshot,
  parseSnapshot,
  setPrioridad,
  RECURSOS_POR_LETRA,
  type CategoriaPrioridad,
  type LetraPrioridad,
} from "@/lib/rules";

export type SaveResult =
  | { ok: true; sheet: Sheet }
  | { ok: false; error: string };

type Editable = { sheet: Sheet; aprobada: boolean; snapshot: AprobacionSnapshot | null };

// Carga la ficha comprobando permisos. Base de todas las acciones de autosave.
// Trae también el estado de aprobación: aprobacion.ts lo necesita para el
// guardarraíl de solo-comprar (ver setAtributoAction/setHabilidadAction).
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
  };
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

// Aprobada: congelado del todo, ni subir ni bajar. El guardarraíl de
// solo-comprar (aprobacion.ts, aplicarSueloAtributo/Habilidad) se queda listo
// para cuando exista "subir con XP" — hasta entonces, tocar el pool de
// creación tras aprobar sería colarse la progresión gratis con puntos que
// sobraron sin gastar. `snapshot` en Editable queda ahí para esa fase.
export async function setAtributoAction(
  characterId: string,
  atributoId: AtributoId,
  value: number,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  if (ctx.aprobada) return { ok: false, error: "La ficha ya está aprobada" };
  return persist(characterId, setAtributoValue(ctx.sheet, atributoId, value));
}

export async function setHabilidadAction(
  characterId: string,
  habilidadId: HabilidadId,
  value: number,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  if (ctx.aprobada) return { ok: false, error: "La ficha ya está aprobada" };
  return persist(characterId, setHabilidadValue(ctx.sheet, habilidadId, value));
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
    // quedan con el valor viejo hasta un F5.
    revalidatePath(`/characters/${characterId}`);
    revalidatePath("/master");
    return { ok: true, sheet };
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
  return persist(characterId, equipar(ctx.sheet, parsed.data));
}

export async function desequiparAction(
  characterId: string,
  instanciaId: string,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(characterId, desequipar(ctx.sheet, instanciaId));
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
