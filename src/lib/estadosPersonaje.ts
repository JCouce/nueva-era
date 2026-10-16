import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { revalidarPanelMaster } from "@/lib/revalidarMaster";
import type { Prisma } from "@/generated/prisma/client";
import {
  aplicarOperacionEstado,
  datosParaGuardar,
  leerEstados,
  parseSheet,
  quitarEstadosDeEscena,
  type CambioEstadoPersonaje,
  type DatosRegistro,
  type OperacionEstado,
} from "@/lib/rules";

// Quién y por qué, para el registro del máster (E1b). null = no se registra.
export type Autoria = { userId: string; motivo?: string | null };

// Las fotos de jugador que siguen vivas: las de un combate abierto (PREPARANDO o EN_CURSO).
export const COMBATE_ABIERTO = { estado: { in: ["PREPARANDO", "EN_CURSO"] } } satisfies Prisma.CombateWhereInput;

// Devuelve el id de la entrada (para el "Deshacer" del aviso en el centro de mando).
export async function registrar(tx: Prisma.TransactionClient, autoria: Autoria, datos: DatosRegistro): Promise<string> {
  const entrada = await tx.registroMaster.create({
    data: {
      userId: autoria.userId,
      tipo: datos.tipo,
      characterIds: [...new Set(datos.cambios.map((c) => c.characterId))],
      datos: datosParaGuardar(datos),
      motivo: autoria.motivo || null,
    },
    select: { id: true },
  });
  return entrada.id;
}

// Escritura de Character.estados, compartida por las acciones del máster
// (app/master/actions.ts) y la consola de combate (app/master/combate/actions.ts).
// No es un server action: quien llama ya ha comprobado que es el máster y validado
// la entrada. En una transacción: los estados, la vida que se pierde al bajar el
// máximo (S75) en la ficha y en sus fotos de combate abiertas, y una sola entrada de
// registro para todos. null si alguno de los personajes no existe (y no escribe nada);
// registroId null si no cambió nada o no se registra.
export async function cambiarEstadosDePersonajes(
  characterIds: string[],
  op: OperacionEstado,
  autoria: Autoria | null,
): Promise<{ registroId: string | null } | null> {
  const ids = [...new Set(characterIds)];
  const hecho = await prisma.$transaction(async (tx) => {
    const filas = await tx.character.findMany({
      where: { id: { in: ids } },
      select: { id: true, stats: true, estados: true },
    });
    if (filas.length !== ids.length) return null;
    const fotos = await tx.combatiente.findMany({
      where: { characterId: { in: ids }, combate: COMBATE_ABIERTO },
      select: { id: true, characterId: true, pgActual: true, fatigaActual: true },
    });

    const cambios: CambioEstadoPersonaje[] = [];
    for (const f of filas) {
      const sheet = parseSheet(f.stats);
      const r = aplicarOperacionEstado(
        { id: f.id, sheet, estados: leerEstados(f.estados) },
        op,
        fotos.filter((c) => c.characterId === f.id),
      );
      if (!r) continue;
      await tx.character.update({
        where: { id: f.id },
        data: r.vida.sheet === sheet ? { estados: r.estados } : { estados: r.estados, stats: r.vida.sheet },
      });
      for (const c of r.vida.combatientes) {
        await tx.combatiente.update({
          where: { id: c.id },
          data: { pgActual: c.pgActual, pgMax: c.pgMax, fatigaActual: c.fatigaActual, fatigaMax: c.fatigaMax },
        });
      }
      cambios.push(r.cambio);
    }
    const registroId =
      autoria && cambios.length > 0
        ? await registrar(tx, autoria, { tipo: op.tipo === "poner" ? "estado_poner" : "estado_quitar", cambios })
        : null;
    return { registroId };
  });
  if (hecho) revalidarEstados(ids);
  return hecho;
}

// "Terminar escena" (E1c): quita a todos los personajes en juego los estados que duran
// hasta el fin de escena, en una transacción y con una sola entrada `fin_escena` en el
// registro. Quitar no resta vida (S75); las fotos de combate abiertas recalculan su
// máximo como al quitar uno a mano.
// TODO(revisar): solo los personajes en juego (APPROVED), como la Mesa; los NPC de un
// combate abierto con estados de escena no se tocan (llega con E1d).
export async function terminarEscenaDeJugadores(
  autoria: Autoria,
): Promise<{ registroId: string | null; characterIds: string[] }> {
  const res = await prisma.$transaction(async (tx) => {
    const filas = await tx.character.findMany({
      where: { status: "APPROVED" },
      select: { id: true, stats: true, estados: true },
    });
    const ids = filas.map((f) => f.id);
    const fotos = await tx.combatiente.findMany({
      where: { characterId: { in: ids }, combate: COMBATE_ABIERTO },
      select: { id: true, characterId: true, pgActual: true, fatigaActual: true },
    });

    const cambios: CambioEstadoPersonaje[] = [];
    const tocados: string[] = [];
    for (const f of filas) {
      const sheet = parseSheet(f.stats);
      const r = quitarEstadosDeEscena(
        { id: f.id, sheet, estados: leerEstados(f.estados) },
        fotos.filter((c) => c.characterId === f.id),
      );
      if (!r) continue;
      await tx.character.update({
        where: { id: f.id },
        data: r.sheet === sheet ? { estados: r.estados } : { estados: r.estados, stats: r.sheet },
      });
      for (const c of r.combatientes) {
        await tx.combatiente.update({
          where: { id: c.id },
          data: { pgActual: c.pgActual, pgMax: c.pgMax, fatigaActual: c.fatigaActual, fatigaMax: c.fatigaMax },
        });
      }
      cambios.push(...r.cambios);
      tocados.push(f.id);
    }
    const registroId = cambios.length > 0 ? await registrar(tx, autoria, { tipo: "fin_escena", cambios }) : null;
    return { registroId, characterIds: tocados };
  });
  if (res.characterIds.length > 0) revalidarEstados(res.characterIds);
  return res;
}

// La ficha de cada uno, la consola de combate y el panel del máster.
export function revalidarEstados(characterIds: string[]) {
  for (const id of characterIds) revalidatePath(`/characters/${id}`);
  revalidarPanelMaster();
  revalidatePath("/master/combate");
}
