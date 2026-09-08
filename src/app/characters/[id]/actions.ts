"use server";

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
} from "@/lib/rules";

export type SaveResult =
  | { ok: true; sheet: Sheet }
  | { ok: false; error: string };

// Carga la ficha comprobando permisos. Base de todas las acciones de autosave.
async function loadEditable(
  characterId: string,
): Promise<{ sheet: Sheet } | { error: string }> {
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
  sheet: Sheet,
  name?: string,
): Promise<SaveResult> {
  await prisma.character.update({
    where: { id: characterId },
    data: name === undefined ? { stats: sheet } : { name, stats: sheet },
  });
  return { ok: true, sheet };
}

export async function setAtributoAction(
  characterId: string,
  atributoId: AtributoId,
  value: number,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(characterId, setAtributoValue(ctx.sheet, atributoId, value));
}

export async function setHabilidadAction(
  characterId: string,
  habilidadId: HabilidadId,
  value: number,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(characterId, setHabilidadValue(ctx.sheet, habilidadId, value));
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
export async function resetBuildAction(characterId: string): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(characterId, resetBuild(ctx.sheet));
}

export async function saveIdentityAction(
  characterId: string,
  patch: {
    name: string;
    edad: number | null;
    especieId: string | null;
    trasfondo: string;
    motivacion: string;
  },
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const nameParsed = characterCreateSchema.safeParse({ name: patch.name });
  if (!nameParsed.success) return { ok: false, error: "El nombre no es válido" };

  const edad = patch.edad === null ? null : clampInt(patch.edad, 0, 999);

  return persist(
    characterId,
    {
      ...ctx.sheet,
      edad,
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
