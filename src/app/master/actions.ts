"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth-helpers";
import { parseSheet, snapshotFromSheet, transicionRevision } from "@/lib/rules";
import { characterIdSchema, notaRevisionSchema } from "@/lib/validation";

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

// Las tres pasan por transicionRevision (revision.ts): aprobar vale desde creación o
// desde revisión; devolver solo desde revisión; revertir solo desde en juego.
async function cargarParaRevision(formData: FormData, accion: "aprobar" | "devolver" | "revertir") {
  const user = await requireMaster();
  if (!user) return null;
  const parsed = characterIdSchema.safeParse(formData.get("id") ?? "");
  if (!parsed.success) return null;
  const character = await prisma.character.findUnique({
    where: { id: parsed.data },
    select: { id: true, status: true, ownerId: true, stats: true },
  });
  if (!character) return null;
  const res = transicionRevision({
    estado: character.status,
    accion,
    esMaster: true,
    esDueno: character.ownerId === user.id,
  });
  return "error" in res ? null : { character, estado: res.estado };
}

export async function approveCharacterAction(formData: FormData) {
  const ctx = await cargarParaRevision(formData, "aprobar");
  if (!ctx) return;

  // Congela el suelo de Atributos/Habilidades en el momento exacto de
  // aprobar — de ahí en adelante solo se puede subir (aprobacion.ts).
  const snapshot = snapshotFromSheet(parseSheet(ctx.character.stats));
  await prisma.character.update({
    where: { id: ctx.character.id },
    data: {
      status: ctx.estado,
      approvedAt: new Date(),
      approvedSnapshot: snapshot,
      submittedAt: null,
      reviewNote: null,
    },
  });
  revalidateCharacterViews(ctx.character.id);
}

// Devuelve a creación una ficha en revisión, con nota opcional para el jugador.
export async function devolverAction(formData: FormData) {
  const nota = notaRevisionSchema.safeParse(formData.get("nota") ?? "");
  if (!nota.success) return;
  const ctx = await cargarParaRevision(formData, "devolver");
  if (!ctx) return;
  await prisma.character.update({
    where: { id: ctx.character.id },
    data: { status: ctx.estado, submittedAt: null, reviewNote: nota.data },
  });
  revalidateCharacterViews(ctx.character.id);
}

export async function revertToDraftAction(formData: FormData) {
  const ctx = await cargarParaRevision(formData, "revertir");
  if (!ctx) return;

  // Suelta el snapshot: mientras esté en DRAFT no hay guardarraíl, y si se
  // vuelve a aprobar se congela uno nuevo con los valores de ese momento.
  await prisma.character.update({
    where: { id: ctx.character.id },
    data: { status: ctx.estado, approvedAt: null, approvedSnapshot: Prisma.DbNull },
  });
  revalidateCharacterViews(ctx.character.id);
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
    select: { xp: true, creditos: true },
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
