"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";

// Sin requireUser a propósito: /preguntas es pública (ver model Pregunta).
// Lo único que se puede tocar desde aquí es el texto de la respuesta de una
// pregunta que ya existe — crear o editar preguntas solo lo hace el seed.
const respuestaSchema = z.object({
  id: z.string().min(1).max(200),
  respuesta: z.string().max(4000),
});

export type RespuestaResult = { ok: true; respondidaAt: string | null } | { ok: false; error: string };

export async function responderPregunta(id: string, respuesta: string): Promise<RespuestaResult> {
  const parsed = respuestaSchema.safeParse({ id, respuesta });
  if (!parsed.success) return { ok: false, error: "Respuesta no válida (máximo 4000 caracteres)." };

  const texto = parsed.data.respuesta.trim();
  const respondidaAt = texto ? new Date() : null;
  const { count } = await prisma.pregunta.updateMany({
    where: { id: parsed.data.id },
    data: { respuesta: texto, respondidaAt },
  });
  if (count === 0) return { ok: false, error: "Esa pregunta ya no existe." };
  return { ok: true, respondidaAt: respondidaAt?.toISOString() ?? null };
}
