"use server";

// Fase 6b, catálogo de NPCs (rediseño 2026-09-11, docs/fase-6b.md): ficha
// obligatoria para todo NpcTemplate — mismo Sheet que un Character, así que
// estas acciones son un espejo deliberadamente simplificado de
// characters/[id]/actions.ts: sin XP, sin aprobación, sin point-buy, sin
// coste en créditos al equipar — el máster edita los números directos,
// nadie le pone techo (mismo criterio que ya tiene al editar la ficha de
// un jugador: el máster no tiene tope de rareza tampoco). Sin UI todavía
// (llega en 5.1) — esto es el esqueleto, verificado con smoke test manual,
// mismo patrón que combate/actions.ts en la subtarea 1.3.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import {
  type Sheet,
  defaultSheet,
  parseSheet,
  clampInt,
  addEspecialidad,
  removeEspecialidad,
  equipar,
  desequipar,
  piezaEquipadaSchema,
  ajustarRecurso,
  comprarRecarga,
  ATRIBUTO_MIN,
  ATRIBUTO_MAX,
  HABILIDAD_NO_ENTRENADA,
  HABILIDAD_MAX,
  type AtributoId,
  type HabilidadId,
  type PiezaEquipada,
} from "@/lib/rules";

export type NpcResult = { ok: true; sheet: Sheet } | { ok: false; error: string };
export type NpcCreadoResult = { ok: true; id: string } | { ok: false; error: string };

async function requireMaster() {
  const user = await requireUser();
  return user.role === "MASTER" ? user : null;
}

function revalidateNpcs() {
  revalidatePath("/master/npcs");
}

async function loadSheet(npcId: string): Promise<{ sheet: Sheet } | { error: string }> {
  if (!(await requireMaster())) return { error: "Solo el máster puede editar NPCs." };
  const npc = await prisma.npcTemplate.findUnique({ where: { id: npcId }, select: { stats: true } });
  if (!npc) return { error: "No existe ese NPC." };
  return { sheet: parseSheet(npc.stats) };
}

async function persist(npcId: string, sheet: Sheet): Promise<NpcResult> {
  await prisma.npcTemplate.update({ where: { id: npcId }, data: { stats: sheet } });
  revalidateNpcs();
  return { ok: true, sheet };
}

// --- Alta / baja / clonar ---

export async function crearNpcAction(nombre: string): Promise<NpcCreadoResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede crear NPCs." };
  const nombreLimpio = nombre.trim();
  if (!nombreLimpio) return { ok: false, error: "Falta el nombre." };

  const npc = await prisma.npcTemplate.create({
    data: { nombre: nombreLimpio, stats: defaultSheet() },
  });
  revalidateNpcs();
  return { ok: true, id: npc.id };
}

// Copia el Sheet entero con un nombre nuevo — la vía real para el "mook
// rápido de mesa" (decisión 2026-09-11): en vez de un modo ligero sin
// ficha, se clona una plantilla ya armada del catálogo. Adelanta media
// subtarea 5.3 (clonar en instancias numeradas), que además de esto añade
// la UI para clonar varias de golpe con nombres tipo "Goblin #1, #2, #3".
export async function clonarNpcAction(npcId: string, nuevoNombre: string): Promise<NpcCreadoResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede clonar NPCs." };
  const nombreLimpio = nuevoNombre.trim();
  if (!nombreLimpio) return { ok: false, error: "Falta el nombre." };

  const original = await prisma.npcTemplate.findUnique({ where: { id: npcId } });
  if (!original) return { ok: false, error: "No existe ese NPC." };

  const clon = await prisma.npcTemplate.create({
    data: { nombre: nombreLimpio, stats: original.stats as object, nota: original.nota },
  });
  revalidateNpcs();
  return { ok: true, id: clon.id };
}

// Envoltorios para <form action={...}> sin JS (5.1, mismo patrón que
// createCharacter/deleteCharacter en characters/actions.ts): las de arriba
// devuelven un resultado tipado para llamarse desde un client component,
// estas dos hablan FormData y navegan solas.
export async function crearNpcFormAction(formData: FormData) {
  const res = await crearNpcAction(String(formData.get("nombre") ?? ""));
  if (res.ok) redirect(`/master/npcs/${res.id}`);
}

export async function eliminarNpcFormAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await eliminarNpcAction(id);
}

export async function eliminarNpcAction(npcId: string): Promise<NpcResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede eliminar NPCs." };
  // onDelete: SetNull en Combatiente.npcTemplateId (schema.prisma) — borrar
  // una plantilla no revienta un combate histórico que ya la usó, solo
  // pierde el enlace; el combatiente conserva su `nombre`/`sheet` congelados.
  await prisma.npcTemplate.delete({ where: { id: npcId } });
  revalidateNpcs();
  return { ok: true, sheet: defaultSheet() };
}

export async function renombrarNpcAction(npcId: string, nombre: string): Promise<NpcResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede editar NPCs." };
  const nombreLimpio = nombre.trim();
  if (!nombreLimpio) return { ok: false, error: "El nombre no puede quedar vacío." };

  const npc = await prisma.npcTemplate.update({
    where: { id: npcId },
    data: { nombre: nombreLimpio },
  });
  revalidateNpcs();
  return { ok: true, sheet: parseSheet(npc.stats) };
}

export async function setNotaNpcAction(npcId: string, nota: string): Promise<NpcResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede editar NPCs." };
  const npc = await prisma.npcTemplate.update({
    where: { id: npcId },
    data: { nota: nota.slice(0, 2000) || null },
  });
  revalidateNpcs();
  return { ok: true, sheet: parseSheet(npc.stats) };
}

// --- Atributos / habilidades / equipo: directo, sin point-buy ni coste ---
// (el máster no tiene pool que gastar ni créditos que cobrar al equipar a
// un NPC — mismo criterio que ya rige cuando el máster edita a un jugador:
// sin tope de rareza, aquí llevado un paso más allá porque tampoco hay
// ficha "aprobada" de la que protegerse).
//
// OJO, hallazgo real haciendo el smoke test: `setAtributoValue`/
// `setHabilidadValue` (lib/rules/creacion.ts) NO son una asignación directa
// — respetan el pool de creación (puntosAtributosDisponibles) y rechazan en
// silencio cualquier subida que lo deje negativo. Sin ninguna letra de
// prioridad asignada (el caso de un NpcTemplate, que no pasa por prioridad),
// el pool es 0, así que esas funciones no mueven el número NUNCA. Aquí se
// clampa directo contra los límites del sistema (ATRIBUTO_MIN/MAX,
// HABILIDAD_NO_ENTRENADA/MAX), sin pool y sin la restricción de "solo
// subir" que sí tiene un PJ en progresión con XP — un NPC se edita libre en
// las dos direcciones.

export async function setAtributoNpcAction(
  npcId: string,
  atributoId: AtributoId,
  value: number,
): Promise<NpcResult> {
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const v = clampInt(value, ATRIBUTO_MIN, ATRIBUTO_MAX, ctx.sheet.atributos[atributoId]);
  return persist(npcId, { ...ctx.sheet, atributos: { ...ctx.sheet.atributos, [atributoId]: v } });
}

export async function setHabilidadNpcAction(
  npcId: string,
  habilidadId: HabilidadId,
  value: number,
): Promise<NpcResult> {
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const actual = ctx.sheet.habilidades[habilidadId];
  const v = clampInt(value, HABILIDAD_NO_ENTRENADA, HABILIDAD_MAX, actual.valor);
  return persist(npcId, {
    ...ctx.sheet,
    habilidades: { ...ctx.sheet.habilidades, [habilidadId]: { ...actual, valor: v } },
  });
}

export async function addEspecialidadNpcAction(
  npcId: string,
  habilidadId: HabilidadId,
  nombre: string,
): Promise<NpcResult> {
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(npcId, addEspecialidad(ctx.sheet, habilidadId, nombre));
}

export async function removeEspecialidadNpcAction(
  npcId: string,
  habilidadId: HabilidadId,
  nombre: string,
): Promise<NpcResult> {
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(npcId, removeEspecialidad(ctx.sheet, habilidadId, nombre));
}

export async function equiparNpcAction(npcId: string, pieza: PiezaEquipada): Promise<NpcResult> {
  const parsed = piezaEquipadaSchema.safeParse(pieza);
  if (!parsed.success) return { ok: false, error: "Pieza de equipo inválida" };
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const sheet = equipar(ctx.sheet, parsed.data);
  if (sheet === ctx.sheet) return { ok: false, error: "Pieza de equipo inválida" };
  return persist(npcId, sheet);
}

export async function desequiparNpcAction(npcId: string, instanciaId: string): Promise<NpcResult> {
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(npcId, desequipar(ctx.sheet, instanciaId));
}

// RECURSOS: mismo criterio "libre" que el resto de la ficha del NPC — sin
// créditos que cobrar al recargar, el máster ajusta el número directo.
export async function ajustarRecursoNpcAction(
  npcId: string,
  instanciaId: string,
  delta: number,
): Promise<NpcResult> {
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(npcId, ajustarRecurso(ctx.sheet, instanciaId, delta));
}

export async function comprarRecargaNpcAction(npcId: string, instanciaId: string): Promise<NpcResult> {
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const resultado = comprarRecarga(ctx.sheet, instanciaId);
  if (!resultado) return { ok: false, error: "No hay ningún recurso que recargar ahí." };
  return persist(npcId, resultado.sheet);
}
