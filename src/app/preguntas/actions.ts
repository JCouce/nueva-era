"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";

// Sin requireUser a propósito: /preguntas es pública (ver model Pregunta).
// Lo único que se puede tocar desde aquí es la respuesta de una pregunta que ya
// existe y su marca de errata (y si está corregida) — crear o editar preguntas
// solo lo hace el seed.
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

const errataSchema = z.object({ id: z.string().min(1).max(200), valor: z.boolean() });

export type ErrataResult = { ok: true; errata: boolean; corregidaAt: string | null } | { ok: false; error: string };

// Desmarcar una errata también quita su "corregida": si vuelve a marcarse, empieza sin tachar.
export async function marcarErrata(id: string, errata: boolean): Promise<ErrataResult> {
  const parsed = errataSchema.safeParse({ id, valor: errata });
  if (!parsed.success) return { ok: false, error: "Petición no válida." };
  const { count } = await prisma.pregunta.updateMany({
    where: { id: parsed.data.id },
    data: parsed.data.valor ? { errata: true } : { errata: false, corregidaAt: null },
  });
  if (count === 0) return { ok: false, error: "Esa pregunta ya no existe." };
  const p = await prisma.pregunta.findUnique({ where: { id: parsed.data.id }, select: { corregidaAt: true } });
  return { ok: true, errata: parsed.data.valor, corregidaAt: p?.corregidaAt?.toISOString() ?? null };
}

export async function marcarCorregida(id: string, corregida: boolean): Promise<ErrataResult> {
  const parsed = errataSchema.safeParse({ id, valor: corregida });
  if (!parsed.success) return { ok: false, error: "Petición no válida." };
  const corregidaAt = parsed.data.valor ? new Date() : null;
  const { count } = await prisma.pregunta.updateMany({
    where: { id: parsed.data.id, errata: true },
    data: { corregidaAt },
  });
  if (count === 0) return { ok: false, error: "Esa pregunta ya no está marcada como errata." };
  return { ok: true, errata: true, corregidaAt: corregidaAt?.toISOString() ?? null };
}
