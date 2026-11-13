// Registro del máster con deshacer (E1b): escribir xp/créditos con su entrada, deshacer
// una entrada y listar las últimas. No son server actions: quien llama ya ha comprobado
// que es el máster y validado la entrada. Qué se guarda y cuándo se puede deshacer
// vive en lib/rules/registro.ts; aquí solo se lee, se llama y se escribe.
import { prisma } from "@/lib/db";
import {
  entradaDeshacible,
  leerDatosRegistro,
  leerEstados,
  parseSheet,
  reconciliarVidaConEstados,
  planDeshacerEstados,
  planAjusteRecurso,
  planDeshacerRecurso,
  type DatosRegistro,
  type RecursoMaster,
} from "@/lib/rules";
import type { Prisma } from "@/generated/prisma/client";
import { COMBATE_ABIERTO, registrar, revalidarEstados, type Autoria } from "@/lib/estadosPersonaje";
import { deshacerVidaEnTx } from "@/lib/vidaMando";
import { conReintentos, escribirFicha } from "@/lib/escrituraFicha";

export type ResultadoRegistro = { ok: true } | { ok: false; error: string };

// Suma `cantidad` (negativa para quitar) a varios personajes, con una sola entrada. Si
// a alguien le dejaría en negativo, no toca a nadie y lo explica (planAjusteRecurso).
export async function ajustarRecursoDePersonajes(
  characterIds: string[],
  recurso: RecursoMaster,
  cantidad: number,
  autoria: Autoria,
): Promise<{ ok: true; registroId: string | null } | { ok: false; error: string }> {
  const ids = [...new Set(characterIds)];
  const res = await prisma.$transaction(async (tx) => {
    const filas = await tx.character.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, xp: true, creditos: true },
    });
    if (filas.length !== ids.length) return { ok: false as const, error: "Alguno de esos personajes no existe." };
    const plan = planAjusteRecurso(
      recurso,
      cantidad,
      filas.map((f) => ({ id: f.id, nombre: f.name, valor: f[recurso] })),
    );
    if (!plan.ok) return { ok: false as const, error: `${plan.error} No se ha quitado nada a nadie.` };
    for (const c of plan.plan) await tx.character.update({ where: { id: c.characterId }, data: { [recurso]: c.despues } });
    const registroId = plan.plan.length > 0 ? await registrar(tx, autoria, { tipo: recurso, cambios: plan.plan }) : null;
    return { ok: true as const, registroId };
  });
  if (res.ok) revalidarEstados(ids);
  return res;
}

// Error que deshace la transacción entera y llega al máster tal cual.
class NoSePuede extends Error {}

// Con la condición dentro del update: dos "deshacer" a la vez no lo aplican dos veces.
async function marcarDeshecha(tx: Prisma.TransactionClient, id: string) {
  const marcada = await tx.registroMaster.updateMany({ where: { id, deshechoAt: null }, data: { deshechoAt: new Date() } });
  if (marcada.count !== 1) throw new NoSePuede("Esa acción ya está deshecha.");
}

export async function deshacerRegistro(id: string): Promise<ResultadoRegistro> {
  try {
    const ids = await conReintentos(() => prisma.$transaction(async (tx) => {
      const entrada = await tx.registroMaster.findUnique({ where: { id } });
      if (!entrada) throw new NoSePuede("No existe esa entrada del registro.");
      const leida = entradaDeshacible(entrada);
      if (!leida.ok) throw new NoSePuede(leida.error);
      const datos = leida.plan;
      if (datos.tipo === "vida") {
        const tocados = await deshacerVidaEnTx(tx, datos, (error) => new NoSePuede(error));
        await marcarDeshecha(tx, id);
        return tocados;
      }
      const characterIds = [...new Set(datos.cambios.map((c) => c.characterId))];

      if (datos.tipo === "xp" || datos.tipo === "creditos") {
        const recurso = datos.tipo;
        const filas = await tx.character.findMany({
          where: { id: { in: characterIds } },
          select: { id: true, name: true, xp: true, creditos: true },
        });
        const plan = planDeshacerRecurso(
          recurso,
          datos.cambios,
          filas.map((f) => ({ id: f.id, nombre: f.name, valor: f[recurso] })),
        );
        if (!plan.ok) throw new NoSePuede(plan.error);
        for (const v of plan.plan) await tx.character.update({ where: { id: v.id }, data: { [recurso]: v.valor } });
      } else {
        const filas = await tx.character.findMany({
          where: { id: { in: characterIds } },
          select: { id: true, name: true, stats: true, estados: true },
        });
        const fotos = await tx.combatiente.findMany({
          where: { characterId: { in: characterIds }, combate: COMBATE_ABIERTO },
          select: { id: true, characterId: true, pgActual: true, fatigaActual: true },
        });
        // Los NPC de la entrada (td-20) que siguen en un combate abierto.
        const npcIds = entrada.combatienteIds;
        const npcs = await tx.combatiente.findMany({
          where: { id: { in: npcIds }, characterId: null, combate: COMBATE_ABIERTO },
          select: { id: true, nombre: true, estados: true },
        });
        const posteriores = await tx.registroMaster.findMany({
          where: {
            id: { not: entrada.id },
            createdAt: { gte: entrada.createdAt },
            deshechoAt: null,
            OR: [{ characterIds: { hasSome: characterIds } }, { combatienteIds: { hasSome: npcIds } }],
          },
          select: { tipo: true, datos: true },
        });
        const plan = planDeshacerEstados(
          datos,
          filas.map((f) => {
            const estados = leerEstados(f.estados);
            return { id: f.id, nombre: f.name, sheet: reconciliarVidaConEstados(parseSheet(f.stats), estados), estados };
          }),
          fotos.flatMap((f) => (f.characterId === null ? [] : [{ ...f, characterId: f.characterId }])),
          posteriores,
          npcs.map((n) => ({ id: n.id, nombre: n.nombre, estados: leerEstados(n.estados) })),
        );
        if (!plan.ok) throw new NoSePuede(plan.error);
        const leidas = new Map(filas.map((f) => [f.id, f.stats]));
        for (const p of plan.plan.personajes) {
          // escribirFicha (td-22): si el jugador guarda a la vez, se repite el deshacer entero.
          await escribirFicha(tx, p.id, { stats: leidas.get(p.id) ?? null }, { estados: p.estados, stats: p.sheet });
        }
        for (const n of plan.plan.npcs) {
          await tx.combatiente.update({ where: { id: n.id }, data: { estados: n.estados } });
        }
        for (const c of plan.plan.combatientes) {
          await tx.combatiente.update({
            where: { id: c.id },
            data: { pgActual: c.pgActual, pgMax: c.pgMax, fatigaActual: c.fatigaActual, fatigaMax: c.fatigaMax },
          });
        }
      }

      await marcarDeshecha(tx, id);
      return characterIds;
    }));
    revalidarEstados(ids);
    return { ok: true };
  } catch (e) {
    if (e instanceof NoSePuede) return { ok: false, error: e.message };
    throw e;
  }
}

export type EntradaRegistro = {
  id: string;
  createdAt: Date;
  tipo: string;
  motivo: string | null;
  deshechoAt: Date | null;
  autor: string | null;
  // nombre null: el personaje se borró después.
  personajes: { id: string; nombre: string | null }[];
  // null si no se entiende (formato viejo): se lista igual, no se puede deshacer.
  datos: DatosRegistro | null;
};

// Las últimas `n`, de la más nueva a la más vieja (la pantalla de E1c).
export async function listarRegistro(n = 50): Promise<EntradaRegistro[]> {
  const filas = await prisma.registroMaster.findMany({
    orderBy: { createdAt: "desc" },
    take: n,
    include: { user: { select: { name: true, email: true } } },
  });
  const ids = [...new Set(filas.flatMap((f) => f.characterIds))];
  const nombres = new Map(
    (await prisma.character.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })).map((c) => [
      c.id,
      c.name,
    ]),
  );
  return filas.map((f) => ({
    id: f.id,
    createdAt: f.createdAt,
    tipo: f.tipo,
    motivo: f.motivo,
    deshechoAt: f.deshechoAt,
    autor: f.user ? (f.user.name ?? f.user.email) : null,
    personajes: f.characterIds.map((id) => ({ id, nombre: nombres.get(id) ?? null })),
    datos: leerDatosRegistro(f.tipo, f.datos),
  }));
}
