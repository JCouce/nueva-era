"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, canEditCharacter } from "@/lib/auth-helpers";
import { statsSchema } from "@/lib/validation";

export type SaveStatsState = { ok?: boolean; error?: string } | undefined;

export async function saveStats(
  characterId: string,
  _prev: SaveStatsState,
  formData: FormData,
): Promise<SaveStatsState> {
  const user = await requireUser();

  const character = await prisma.character.findUnique({
    where: { id: characterId },
  });
  if (!character) return { error: "Personaje no encontrado" };
  if (!canEditCharacter(user, character)) {
    return { error: "No tienes permiso para editar esta ficha" };
  }

  // Reconstruye el objeto stats desde pares key[]/value[] del form.
  const keys = formData.getAll("key").map(String);
  const values = formData.getAll("value").map(String);
  const raw: Record<string, number | string> = {};
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i].trim();
    if (!k) continue;
    const v = values[i] ?? "";
    const num = Number(v);
    raw[k] = v.trim() !== "" && !Number.isNaN(num) ? num : v;
  }

  const parsed = statsSchema.safeParse(raw);
  if (!parsed.success) return { error: "Estadísticas no válidas" };

  await prisma.character.update({
    where: { id: characterId },
    data: { stats: parsed.data },
  });

  revalidatePath(`/characters/${characterId}`);
  return { ok: true };
}
