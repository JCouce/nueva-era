"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, canEditCharacter } from "@/lib/auth-helpers";
import { characterCreateSchema } from "@/lib/validation";

export async function createCharacter(formData: FormData) {
  const user = await requireUser();
  const parsed = characterCreateSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return;

  const character = await prisma.character.create({
    data: { name: parsed.data.name, ownerId: user.id },
  });
  redirect(`/characters/${character.id}`);
}

export async function deleteCharacter(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const character = await prisma.character.findUnique({ where: { id } });
  if (!character || !canEditCharacter(user, character)) return;

  await prisma.character.delete({ where: { id } });
  revalidatePath("/characters");
}
