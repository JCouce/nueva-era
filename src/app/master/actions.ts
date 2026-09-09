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

// Las tres vistas que pueden tener esta ficha en caché del lado del cliente:
// el panel, la lista general y la ficha en sí. Sin las tres, navegar entre
// ellas por link (sin recargar) enseña datos viejos hasta el siguiente F5.
function revalidateCharacterViews(id: string) {
  revalidatePath("/master");
  revalidatePath("/characters");
  revalidatePath(`/characters/${id}`);
}

export async function approveCharacterAction(formData: FormData) {
  if (!(await requireMaster())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.character.update({
    where: { id },
    data: { status: "APPROVED", approvedAt: new Date() },
  });
  revalidateCharacterViews(id);
}

export async function revertToDraftAction(formData: FormData) {
  if (!(await requireMaster())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.character.update({
    where: { id },
    data: { status: "DRAFT", approvedAt: null },
  });
  revalidateCharacterViews(id);
}

// xp y créditos son recursos que solo concede el máster — por eso viven aquí y
// no en el autosave de la ficha (@/app/characters/[id]/actions.ts), que el
// propio jugador puede disparar.
async function adjustResource(
  formData: FormData,
  field: "xp" | "creditos",
): Promise<void> {
  if (!(await requireMaster())) return;
  const id = String(formData.get("id") ?? "");
  const delta = Number(formData.get("delta") ?? "0");
  if (!id || !Number.isFinite(delta) || delta === 0) return;

  const character = await prisma.character.findUnique({
    where: { id },
    select: { [field]: true },
  });
  if (!character) return;

  const next = Math.max(0, character[field] + delta);
  await prisma.character.update({ where: { id }, data: { [field]: next } });
  revalidateCharacterViews(id);
}

export async function adjustXpAction(formData: FormData) {
  return adjustResource(formData, "xp");
}

export async function adjustCreditosAction(formData: FormData) {
  return adjustResource(formData, "creditos");
}
