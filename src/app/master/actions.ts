"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth-helpers";
import {
  estadoActivoCon,
  parseSheet,
  snapshotFromSheet,
  transicionRevision,
  type DuracionEstado,
  type RecursoMaster,
} from "@/lib/rules";
import {
  aplicarEstadoAPersonajesSchema,
  characterIdSchema,
  darRecursoSchema,
  motivoSchema,
  notaRevisionSchema,
  quitarEstadoAPersonajesSchema,
  quitarEstadoSchema,
  registroIdSchema,
  terminarEscenaSchema,
} from "@/lib/validation";
import { cambiarEstadosDePersonajes, terminarEscenaDeJugadores } from "@/lib/estadosPersonaje";
import { revalidarPanelMaster } from "@/lib/revalidarMaster";
import { ajustarRecursoDePersonajes, deshacerRegistro } from "@/lib/registroMaster";

// Aprobar/revertir es cosa del máster, no del dueño de la ficha — a diferencia
// de canEditCharacter(), aquí el dueño NO vale.
async function requireMaster() {
  const user = await requireUser();
  return user.role === "MASTER" ? user : null;
}

// Las vistas que pueden tener esta ficha en caché del lado del cliente: la Mesa y
// la lista de fichas del máster, la lista general y la ficha en sí. Sin todas,
// navegar entre ellas por link (sin recargar) enseña datos viejos hasta el siguiente F5.
function revalidateCharacterViews(id: string) {
  revalidarPanelMaster();
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
// propio jugador puede disparar. Los botones de siempre (MasterControls), con su
// entrada en el registro (E1b) como las acciones tipadas de abajo. Quitar más de lo
// que tiene no hace nada (aquí no hay dónde enseñar el porqué; la Mesa sí lo dice).
async function adjustResource(
  formData: FormData,
  field: "xp" | "creditos",
): Promise<void> {
  const user = await requireMaster();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  const delta = Number(formData.get("delta") ?? "0");
  if (!id || !Number.isInteger(delta) || delta === 0) return;

  await ajustarRecursoDePersonajes([id], field, delta, { userId: user.id });
  revalidateCharacterViews(id);
}

export async function adjustXpAction(formData: FormData) {
  return adjustResource(formData, "xp");
}

export async function adjustCreditosAction(formData: FormData) {
  return adjustResource(formData, "creditos");
}

// --- Registro del máster (E1b) ---

export type RegistroResult = { ok: true } | { ok: false; error: string };
// Lo que devuelven las acciones del centro de mando: el id de la entrada del registro
// para el "Deshacer" del aviso (null si no cambió nada).
export type MandoResult = { ok: true; registroId: string | null } | { ok: false; error: string };

// Para el centro de mando (E1c): la misma cantidad a varios personajes, con motivo, y
// una sola entrada en el registro. Negativa para quitar; si a alguien le dejaría en
// negativo, error y no se toca a nadie.
async function darRecurso(recurso: RecursoMaster, input: unknown): Promise<MandoResult> {
  const user = await requireMaster();
  if (!user) return { ok: false, error: "Solo el máster puede dar XP o créditos." };
  const parsed = darRecursoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Entrada inválida." };

  const { characterIds, cantidad, motivo } = parsed.data;
  const res = await ajustarRecursoDePersonajes(characterIds, recurso, cantidad, { userId: user.id, motivo });
  if (res.ok) revalidatePath("/characters");
  return res;
}

export async function darXpAction(input: { characterIds: string[]; cantidad: number; motivo?: string }) {
  return darRecurso("xp", input);
}

export async function darCreditosAction(input: { characterIds: string[]; cantidad: number; motivo?: string }) {
  return darRecurso("creditos", input);
}

// "Terminar escena" (E1c): limpia los estados de escena de todos los personajes en juego.
// Una sola entrada `fin_escena` en el registro, que se deshace como cualquier otra.
export async function terminarEscenaAction(
  input: { motivo?: string } = {},
): Promise<{ ok: true; registroId: string | null; personajes: number } | { ok: false; error: string }> {
  const user = await requireMaster();
  if (!user) return { ok: false, error: "Solo el máster puede terminar la escena." };
  const parsed = terminarEscenaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Entrada inválida." };

  const res = await terminarEscenaDeJugadores({ userId: user.id, motivo: parsed.data.motivo });
  return { ok: true, registroId: res.registroId, personajes: res.characterIds.length };
}

// Deshace una entrada del registro si todavía se puede (criterios en lib/rules/registro.ts).
export async function deshacerRegistroAction(id: string): Promise<RegistroResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede deshacer." };
  const parsed = registroIdSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Entrada inválida." };
  const res = await deshacerRegistro(parsed.data);
  if (res.ok) revalidatePath("/characters");
  return res;
}

// --- Estados en la ficha (E1a) ---
//
// Aquí sí con resultado tipado, no FormData + no-op: las va a llamar un componente
// interactivo (el centro de mando, E1c) que tiene que poder decir por qué falló.
// Character.estados solo lo escribe el máster (columna propia, como xp/créditos).

export type EstadosResult = MandoResult;

// El mismo estado a varios personajes; a quien ya lo tuviera se le sustituye el grado
// y la duración (ponerEstado).
export async function aplicarEstadoAPersonajesAction(input: {
  characterIds: string[];
  estado: { estadoId: string; gradoId: string; duracion: DuracionEstado };
  motivo?: string;
}): Promise<EstadosResult> {
  const user = await requireMaster();
  if (!user) return { ok: false, error: "Solo el máster puede aplicar un estado." };
  const parsed = aplicarEstadoAPersonajesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Entrada inválida." };

  const { characterIds, estado, motivo } = parsed.data;
  const nuevo = estadoActivoCon(estado.estadoId, estado.gradoId, estado.duracion);
  const hecho = await cambiarEstadosDePersonajes(characterIds, { tipo: "poner", estado: nuevo }, { userId: user.id, motivo });
  return hecho ? { ok: true, registroId: hecho.registroId } : { ok: false, error: "Alguno de esos personajes no existe." };
}

// Quitar un estado a varios a la vez (Mesa, E1c), con una sola entrada en el registro.
// A quien no lo tenga no le pasa nada.
export async function quitarEstadoAPersonajesAction(input: {
  characterIds: string[];
  estadoId: string;
  motivo?: string;
}): Promise<EstadosResult> {
  const user = await requireMaster();
  if (!user) return { ok: false, error: "Solo el máster puede quitar un estado." };
  const parsed = quitarEstadoAPersonajesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Entrada inválida." };

  const { characterIds, estadoId, motivo } = parsed.data;
  const hecho = await cambiarEstadosDePersonajes(characterIds, { tipo: "quitar", estadoId }, { userId: user.id, motivo });
  return hecho ? { ok: true, registroId: hecho.registroId } : { ok: false, error: "Alguno de esos personajes no existe." };
}

export async function quitarEstadoDePersonajeAction(
  characterId: string,
  estadoId: string,
  motivo?: string,
): Promise<EstadosResult> {
  const user = await requireMaster();
  if (!user) return { ok: false, error: "Solo el máster puede quitar un estado." };
  const parsed = quitarEstadoSchema.safeParse({ id: characterId, estadoId });
  const motivoOk = motivoSchema.safeParse(motivo);
  if (!parsed.success || !motivoOk.success) return { ok: false, error: "Entrada inválida." };

  const hecho = await cambiarEstadosDePersonajes(
    [parsed.data.id],
    { tipo: "quitar", estadoId: parsed.data.estadoId },
    { userId: user.id, motivo: motivoOk.data },
  );
  return hecho ? { ok: true, registroId: hecho.registroId } : { ok: false, error: "No existe ese personaje." };
}
