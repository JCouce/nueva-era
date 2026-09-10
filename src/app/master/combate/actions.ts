"use server";

// Fase 6b (docs/fase-6b.md, subtarea 1.3): server actions esqueleto del
// gestor de combate. Sin UI todavía (bloque 2) — esto es solo las acciones
// y sus guardas, para que 2.x tenga contra qué construir. Mismo patrón de
// retorno que characters/[id]/actions.ts (ok/error tipado) y no el de
// master/actions.ts (FormData + no-op silencioso): esto va a alimentar una
// consola interactiva, no formularios sueltos, y ahí conviene poder
// mostrarle al máster por qué falló una acción.
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, canAdjustCombatiente } from "@/lib/auth-helpers";
import { parseSheet, salud, estadoPorId, type EstadoActivo } from "@/lib/rules";

export type CombateResult = { ok: true } | { ok: false; error: string };

async function requireMaster() {
  const user = await requireUser();
  return user.role === "MASTER" ? user : null;
}

// Sin UI todavía que leer, así que solo /master (la cola) puede tener algo
// cacheado que enseñe de refilón que hay un combate en curso. Cuando llegue
// el bloque 2, esto gana la ruta de la consola.
function revalidateCombate() {
  revalidatePath("/master");
}

async function ordenSiguiente(combateId: string): Promise<number> {
  return prisma.combatiente.count({ where: { combateId } });
}

// --- Combate ---

// Una sola EN_CURSO a la vez (docs/fase-6b.md, D1) — se comprueba aquí, no
// en el schema: no hay forma limpia de expresarlo en Prisma sin SQL a mano.
export async function crearCombateAction(): Promise<CombateResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede crear un combate." };

  const enCurso = await prisma.combate.findFirst({ where: { estado: "EN_CURSO" } });
  if (enCurso) return { ok: false, error: "Ya hay un combate en curso." };

  await prisma.combate.create({ data: {} });
  revalidateCombate();
  return { ok: true };
}

export async function terminarCombateAction(combateId: string): Promise<CombateResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede terminar un combate." };

  await prisma.combate.update({
    where: { id: combateId },
    data: { estado: "TERMINADO", terminadoAt: new Date() },
  });
  revalidateCombate();
  return { ok: true };
}

// --- Combatientes: añadir ---

export async function agregarJugadorAction(
  combateId: string,
  characterId: string,
): Promise<CombateResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede añadir combatientes." };

  const yaEsta = await prisma.combatiente.findFirst({
    where: { combateId, characterId, derrotado: false },
  });
  if (yaEsta) return { ok: false, error: "Ese personaje ya está en este combate." };

  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { name: true, stats: true },
  });
  if (!character) return { ok: false, error: "No existe ese personaje." };

  // Foto del máximo actual (ver el comentario de Combatiente en
  // schema.prisma) — se copia aquí, no se vuelve a leer del Character.
  const { vida, fatiga } = salud(parseSheet(character.stats));

  await prisma.combatiente.create({
    data: {
      combateId,
      characterId,
      nombre: character.name,
      pgActual: vida,
      pgMax: vida,
      fatigaActual: fatiga,
      fatigaMax: fatiga,
      orden: await ordenSiguiente(combateId),
    },
  });
  revalidateCombate();
  return { ok: true };
}

export async function agregarNpcDeCatalogoAction(
  combateId: string,
  npcTemplateId: string,
): Promise<CombateResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede añadir combatientes." };

  const npc = await prisma.npcTemplate.findUnique({ where: { id: npcTemplateId } });
  if (!npc) return { ok: false, error: "No existe ese NPC." };

  await prisma.combatiente.create({
    data: {
      combateId,
      npcTemplateId,
      nombre: npc.nombre,
      pgActual: npc.pgBase,
      pgMax: npc.pgBase,
      // Los NPC ligeros no llevan fatiga (ver docs/fase-6b.md, "El motor de
      // estados"): sin ficha completa no hay Voluntad de la que derivarla.
      fatigaActual: 0,
      fatigaMax: 0,
      orden: await ordenSiguiente(combateId),
    },
  });
  revalidateCombate();
  return { ok: true };
}

export async function agregarAdHocAction(
  combateId: string,
  nombre: string,
  pgMax: number,
): Promise<CombateResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede añadir combatientes." };

  const nombreLimpio = nombre.trim();
  if (!nombreLimpio) return { ok: false, error: "Falta el nombre." };
  if (!Number.isFinite(pgMax) || pgMax <= 0) return { ok: false, error: "PG inválidos." };

  await prisma.combatiente.create({
    data: {
      combateId,
      nombre: nombreLimpio,
      pgActual: pgMax,
      pgMax,
      fatigaActual: 0,
      fatigaMax: 0,
      orden: await ordenSiguiente(combateId),
    },
  });
  revalidateCombate();
  return { ok: true };
}

// --- Combatientes: fuera de la cola de turnos, sin borrar la fila ---

export async function marcarDerrotadoAction(
  combatienteId: string,
  derrotado: boolean,
): Promise<CombateResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede marcar un combatiente." };

  await prisma.combatiente.update({ where: { id: combatienteId }, data: { derrotado } });
  revalidateCombate();
  return { ok: true };
}

// --- Turno ---

// No salta a los derrotados todavía — es una decisión de UX (¿se saltan
// solos, o el máster los deja en la cola a propósito?) que le toca a la
// 2.3, no a este esqueleto.
export async function avanzarTurnoAction(combateId: string): Promise<CombateResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede mover el turno." };

  const combate = await prisma.combate.findUnique({
    where: { id: combateId },
    include: { combatientes: { orderBy: { orden: "asc" } } },
  });
  if (!combate) return { ok: false, error: "No existe ese combate." };
  if (combate.combatientes.length === 0) return { ok: false, error: "No hay combatientes en la cola." };

  const siguiente = combate.turnoIndex + 1;
  const daLaVuelta = siguiente >= combate.combatientes.length;

  await prisma.combate.update({
    where: { id: combateId },
    data: {
      turnoIndex: daLaVuelta ? 0 : siguiente,
      ronda: daLaVuelta ? combate.ronda + 1 : combate.ronda,
    },
  });
  revalidateCombate();
  return { ok: true };
}

// --- PG / fatiga (D2: el dueño del Character también puede, no solo el máster) ---

async function ajustarRecurso(
  combatienteId: string,
  delta: number,
  campo: "pgActual" | "fatigaActual",
  campoMax: "pgMax" | "fatigaMax",
): Promise<CombateResult> {
  const user = await requireUser();
  if (!Number.isFinite(delta) || delta === 0) return { ok: false, error: "Delta inválido." };

  const combatiente = await prisma.combatiente.findUnique({
    where: { id: combatienteId },
    include: { character: { select: { ownerId: true } } },
  });
  if (!combatiente) return { ok: false, error: "No existe ese combatiente." };
  if (!canAdjustCombatiente(user, combatiente)) {
    return { ok: false, error: "No puedes tocar a ese combatiente." };
  }

  const actual = Math.max(0, Math.min(combatiente[campoMax], combatiente[campo] + delta));
  await prisma.combatiente.update({ where: { id: combatienteId }, data: { [campo]: actual } });
  revalidateCombate();
  return { ok: true };
}

export async function ajustarPgAction(combatienteId: string, delta: number): Promise<CombateResult> {
  return ajustarRecurso(combatienteId, delta, "pgActual", "pgMax");
}

export async function ajustarFatigaAction(combatienteId: string, delta: number): Promise<CombateResult> {
  return ajustarRecurso(combatienteId, delta, "fatigaActual", "fatigaMax");
}

// --- Estados ---

// Un combatiente solo lleva un grado de cada estado a la vez (mismo
// criterio que modificadoresDeEstados(), lib/rules/estados.ts): aplicar de
// nuevo un estado que ya tenía puesto sustituye el grado, no lo acumula.
export async function aplicarEstadoAction(
  combatienteId: string,
  estadoId: string,
  gradoId: string,
  rondasRestantes: number | null,
): Promise<CombateResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede aplicar un estado." };

  const estado = estadoPorId(estadoId);
  const grado = estado?.grados.find((g) => g.id === gradoId);
  if (!estado || !grado) return { ok: false, error: "Ese estado o grado no existe en el catálogo." };

  const combatiente = await prisma.combatiente.findUnique({
    where: { id: combatienteId },
    select: { estados: true },
  });
  if (!combatiente) return { ok: false, error: "No existe ese combatiente." };

  // `estados` es Json escrito solo por estas dos acciones, nunca por el
  // cliente — un cast basta; si algún día un formulario lo postea directo,
  // esto necesita el mismo tratamiento tolerante que parseSheet.
  const activos = (combatiente.estados as unknown as EstadoActivo[]).filter(
    (e) => e.estadoId !== estadoId,
  );
  activos.push({ estadoId, gradoId, rondasRestantes });

  await prisma.combatiente.update({ where: { id: combatienteId }, data: { estados: activos } });
  revalidateCombate();
  return { ok: true };
}

export async function quitarEstadoAction(
  combatienteId: string,
  estadoId: string,
): Promise<CombateResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede quitar un estado." };

  const combatiente = await prisma.combatiente.findUnique({
    where: { id: combatienteId },
    select: { estados: true },
  });
  if (!combatiente) return { ok: false, error: "No existe ese combatiente." };

  const activos = (combatiente.estados as unknown as EstadoActivo[]).filter(
    (e) => e.estadoId !== estadoId,
  );
  await prisma.combatiente.update({ where: { id: combatienteId }, data: { estados: activos } });
  revalidateCombate();
  return { ok: true };
}
