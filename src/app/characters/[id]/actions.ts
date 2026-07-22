"use server";

import { prisma } from "@/lib/db";
import { requireUser, canEditCharacter } from "@/lib/auth-helpers";
import { characterCreateSchema, type BuildSheet } from "@/lib/validation";
import {
  parseSheet,
  setAttributeValue,
  setSkillValue,
  ESPECIALIDADES,
  type AttributeId,
  type SkillId,
  type EspecialidadId,
} from "@/lib/rules";

export type SaveResult =
  | { ok: true; sheet: BuildSheet }
  | { ok: false; error: string };

// Carga la ficha comprobando permisos. Base de todas las acciones de autosave.
async function loadEditable(
  characterId: string,
): Promise<{ sheet: BuildSheet } | { error: string }> {
  const user = await requireUser();
  const character = await prisma.character.findUnique({
    where: { id: characterId },
  });
  if (!character) return { error: "Personaje no encontrado" };
  if (!canEditCharacter(user, character)) {
    return { error: "No tienes permiso para editar esta ficha" };
  }
  return { sheet: parseSheet(character.stats) };
}

async function persist(
  characterId: string,
  sheet: BuildSheet,
  name?: string,
): Promise<SaveResult> {
  await prisma.character.update({
    where: { id: characterId },
    data: name === undefined ? { stats: sheet } : { name, stats: sheet },
  });
  return { ok: true, sheet };
}

export async function setAttributeAction(
  characterId: string,
  attrId: AttributeId,
  value: number,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(characterId, setAttributeValue(ctx.sheet, attrId, value));
}

export async function setSkillAction(
  characterId: string,
  skillId: SkillId,
  value: number,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(characterId, setSkillValue(ctx.sheet, skillId, value));
}

export async function setEspecialidadAction(
  characterId: string,
  value: EspecialidadId | null,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const valid = value === null || ESPECIALIDADES.some((e) => e.id === value);
  if (!valid) return { ok: false, error: "Arquetipo no válido" };
  return persist(characterId, { ...ctx.sheet, especialidad: value });
}

// Editable por cualquiera en fase de testing; se restringirá al máster luego.
export async function grantResourcesAction(
  characterId: string,
  patch: { xpGanado: number; dineroGanado: number },
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const xpGanado = clampInt(patch.xpGanado, 0, 1_000_000);
  const dineroGanado = clampInt(patch.dineroGanado, 0, 1_000_000_000);
  return persist(characterId, { ...ctx.sheet, xpGanado, dineroGanado });
}

export async function saveIdentityAction(
  characterId: string,
  patch: { name: string; edad: number | null; trasfondo: string },
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const nameParsed = characterCreateSchema.safeParse({ name: patch.name });
  if (!nameParsed.success) return { ok: false, error: "El nombre no es válido" };

  const edad =
    patch.edad === null ? null : clampInt(patch.edad, 0, 999);
  const trasfondo = String(patch.trasfondo ?? "").slice(0, 2000);

  return persist(
    characterId,
    { ...ctx.sheet, edad, trasfondo },
    nameParsed.data.name,
  );
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}
