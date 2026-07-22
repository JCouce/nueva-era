"use server";

import { prisma } from "@/lib/db";
import { requireUser, canEditCharacter } from "@/lib/auth-helpers";
import { characterCreateSchema, type BuildSheet } from "@/lib/validation";
import {
  parseSheet,
  setAttributeValue,
  setSkillValue,
  setDisciplineValue,
  dineroDisponible,
  ESPECIALIDADES,
  SKILLS,
  ATTR_MIN,
  SKILL_MIN,
  type AttributeId,
  type SkillId,
  type EspecialidadId,
} from "@/lib/rules";
import { weaponById } from "@/lib/weapons";

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

export async function setDisciplineAction(
  characterId: string,
  nodeId: string,
  value: number,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(characterId, setDisciplineValue(ctx.sheet, nodeId, value));
}

export async function buyWeaponAction(
  characterId: string,
  weaponId: string,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const weapon = weaponById(weaponId);
  if (!weapon) return { ok: false, error: "Arma no válida" };
  if (ctx.sheet.weapons.some((w) => w.id === weaponId)) return { ok: true, sheet: ctx.sheet };
  if (dineroDisponible(ctx.sheet) < weapon.precio) {
    return { ok: false, error: "Sin €$ suficientes" };
  }
  return persist(characterId, {
    ...ctx.sheet,
    weapons: [...ctx.sheet.weapons, { id: weaponId, costePagado: weapon.precio }],
  });
}

export async function sellWeaponAction(
  characterId: string,
  weaponId: string,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(characterId, {
    ...ctx.sheet,
    weapons: ctx.sheet.weapons.filter((w) => w.id !== weaponId),
  });
}

// Resetea el BUILD (para probar rutas): vuelve a 0 lo gastado y conserva lo
// ganado, el arquetipo y la identidad. El respec es gratis por el modelo derivado.
export async function resetBuildAction(characterId: string): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const s = ctx.sheet;
  return persist(characterId, {
    ...s,
    attributes: { fuerza: ATTR_MIN, destreza: ATTR_MIN, inteligencia: ATTR_MIN },
    skills: Object.fromEntries(SKILLS.map((sk) => [sk.id, SKILL_MIN])) as BuildSheet["skills"],
    disciplinas: {},
    weapons: [],
    cyberware: [],
  });
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
