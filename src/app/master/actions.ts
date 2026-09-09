"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";

// Aprobar/revertir es cosa del máster, no del dueño de la ficha — a diferencia
// de canEditCharacter(), aquí el dueño NO vale.
async function requireMaster() {
  const user = await requireUser();
  return user.role === "MASTER" ? user : null;
}

export async function approveCharacterAction(formData: FormData) {
  if (!(await requireMaster())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.character.update({
    where: { id },
    data: { status: "APPROVED", approvedAt: new Date() },
  });
  revalidatePath("/master");
  revalidatePath(`/characters/${id}`);
}

export async function revertToDraftAction(formData: FormData) {
  if (!(await requireMaster())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.character.update({
    where: { id },
    data: { status: "DRAFT", approvedAt: null },
  });
  revalidatePath("/master");
  revalidatePath(`/characters/${id}`);
}
