import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { revalidarPanelMaster } from "@/lib/revalidarMaster";
import type { Prisma } from "@/generated/prisma/client";
import {
  aplicarOperacionEstado,
  datosParaGuardar,
  estadosDeNpcTras,
  idsDeRegistro,
  leerEstados,
  parseSheet,
  quitarEstadosDe,
  sinEstados,
  vaciarUsosEscena,
  type CambioEstadoPersonaje,
  type DatosRegistro,
  type OperacionEstado,
  type Sheet,
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
      ...idsDeRegistro(datos),
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
// `preparar`: cambio en la ficha que va en la misma transacción, antes del estado (el cobro
// de fatiga de las acciones de aumento, A4a).
export async function cambiarEstadosDePersonajes(
  characterIds: string[],
  op: OperacionEstado,
  autoria: Autoria | null,
  preparar?: (sheet: Sheet) => Sheet,
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
      const leida = parseSheet(f.stats);
      const sheet = preparar ? preparar(leida) : leida;
      const r = aplicarOperacionEstado(
        { id: f.id, sheet, estados: leerEstados(f.estados) },
        op,
        fotos.filter((c) => c.characterId === f.id),
      );
      if (!r) {
        if (sheet !== leida) await tx.character.update({ where: { id: f.id }, data: { stats: sheet } });
        continue;
      }
      await tx.character.update({
        where: { id: f.id },
        data: r.vida.sheet === leida ? { estados: r.estados } : { estados: r.estados, stats: r.vida.sheet },
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

// "Limpiar estados": quita TODOS los estados a los personajes indicados, en una
// transacción y con una sola entrada `limpiar_estados` en el registro. Quitar no resta vida
// (S75); las fotos de combate abiertas recalculan su máximo como al quitar uno a mano.
// Es el terminar escena del máster: vacía también los usos "una vez por escena" de los
// aumentos (A4a, usosEscena.ts), aunque no tengan estados. Eso no va al registro: deshacer no
// devuelve los usos (usuario, 2026-10-22).
export async function limpiarEstadosDeJugadores(
  donde: Prisma.CharacterWhereInput,
  autoria: Autoria,
): Promise<{ registroId: string | null; characterIds: string[] }> {
  const res = await prisma.$transaction(async (tx) => {
    const filas = await tx.character.findMany({
      where: donde,
      select: { id: true, stats: true, estados: true },
    });
    const ids = filas.map((f) => f.id);
    const fotos = await tx.combatiente.findMany({
      where: { characterId: { in: ids }, combate: COMBATE_ABIERTO },
      select: { id: true, characterId: true, pgActual: true, fatigaActual: true },
    });

    const cambios: CambioEstadoPersonaje[] = [];
    const tocados: string[] = [];
    // Fichas sin estados a las que solo se les han vaciado los usos: se revalidan, no cuentan.
    const soloUsos: string[] = [];
    for (const f of filas) {
      const sheet = parseSheet(f.stats);
      const r = quitarEstadosDe(
        { id: f.id, sheet, estados: leerEstados(f.estados) },
        fotos.filter((c) => c.characterId === f.id),
      );
      // TODO(revisar): reescribir stats aquí pisa una escritura del autosave del jugador que
      // entre entre esta lectura y la escritura (no hay bloqueo de fila); ya pasaba al restar
      // vida, ahora pasa también con cualquier ficha que tenga usos gastados.
      const final = vaciarUsosEscena(r?.sheet ?? sheet);
      if (!r) {
        if (final !== sheet) {
          await tx.character.update({ where: { id: f.id }, data: { stats: final } });
          soloUsos.push(f.id);
        }
        continue;
      }
      await tx.character.update({
        where: { id: f.id },
        data: final === sheet ? { estados: r.estados } : { estados: r.estados, stats: final },
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
    const registroId = cambios.length > 0 ? await registrar(tx, autoria, { tipo: "limpiar_estados", cambios }) : null;
    return { registroId, characterIds: tocados, soloUsos };
  });
  const revalidar = [...res.characterIds, ...res.soloUsos];
  if (revalidar.length > 0) revalidarEstados(revalidar);
  return { registroId: res.registroId, characterIds: res.characterIds };
}

// Estados de NPC (E1d): en su fila de combate (Combatiente.estados), sin vida que restar
// ni registro. Devuelve cuántas filas cambió. Las filas de jugador se ignoran: sus
// estados van por cambiarEstadosDePersonajes.
export async function cambiarEstadosDeNpcs(combatienteIds: string[], op: OperacionEstado): Promise<number> {
  const filas = await prisma.combatiente.findMany({
    where: { id: { in: [...new Set(combatienteIds)] }, characterId: null },
    select: { id: true, estados: true },
  });
  const cambios = filas.flatMap((f) => {
    const estados = estadosDeNpcTras(f.estados, op);
    return estados ? [{ id: f.id, estados }] : [];
  });
  if (cambios.length > 0) {
    await prisma.$transaction(cambios.map((c) => prisma.combatiente.update({ where: { id: c.id }, data: { estados: c.estados } })));
    revalidatePath("/master/combate");
  }
  return cambios.length;
}

// "Limpiar estados" sobre los NPC del combate abierto: les quita todos, sin registro (no
// se deshace). Devuelve cuántos tenían alguno.
export async function limpiarEstadosDeNpcs(): Promise<number> {
  const filas = await prisma.combatiente.findMany({
    where: { characterId: null, combate: COMBATE_ABIERTO },
    select: { id: true, estados: true },
  });
  const cambios = filas.flatMap((f) => {
    const estados = sinEstados(f.estados);
    return estados ? [{ id: f.id, estados }] : [];
  });
  if (cambios.length > 0) {
    await prisma.$transaction(cambios.map((c) => prisma.combatiente.update({ where: { id: c.id }, data: { estados: c.estados } })));
    revalidatePath("/master/combate");
  }
  return cambios.length;
}

// La ficha de cada uno, la consola de combate y el panel del máster.
export function revalidarEstados(characterIds: string[]) {
  for (const id of characterIds) revalidatePath(`/characters/${id}`);
  revalidarPanelMaster();
  revalidatePath("/master/combate");
}
