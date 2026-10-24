"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, canEditCharacter } from "@/lib/auth-helpers";
import { characterCreateSchema } from "@/lib/validation";
import { borradoSuave } from "@/lib/borrado";
import { z } from "zod";

export async function createCharacter(formData: FormData) {
  const user = await requireUser();
  const parsed = characterCreateSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return;

  const character = await prisma.character.create({
    data: { name: parsed.data.name, ownerId: user.id },
  });
  redirect(`/characters/${character.id}`);
}

const borrarSchema = z.object({ id: z.string().min(1), confirmado: z.boolean() });

export type ResultadoBorrado = { ok: true } | { confirmar: true } | { error: true };

// Sin trabajo, se borra de verdad. Con trabajo (lib/borrado.ts) exige confirmación y se
// marca como borrada. El servidor lo decide siempre: el cliente solo pinta el modal.
export async function deleteCharacter(input: z.input<typeof borrarSchema>): Promise<ResultadoBorrado> {
  const user = await requireUser();
  const parsed = borrarSchema.safeParse(input);
  if (!parsed.success) return { error: true };
  const { id, confirmado } = parsed.data;

  const character = await prisma.character.findUnique({
    where: { id },
    include: { _count: { select: { combatientes: true } } },
  });
  if (!character || !canEditCharacter(user, character)) return { error: true };

  if (!borradoSuave(character, character._count.combatientes)) {
    await prisma.character.delete({ where: { id } });
  } else if (!confirmado) {
    return { confirmar: true };
  } else {
    await prisma.character.update({ where: { id }, data: { deletedAt: new Date() } });
  }
  revalidatePath("/characters");
  revalidatePath("/master");
  return { ok: true };
}
