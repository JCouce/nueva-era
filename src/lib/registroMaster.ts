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
  planDeshacerEstados,
  planDeshacerRecurso,
  type CambioRecurso,
  type DatosRegistro,
  type RecursoMaster,
} from "@/lib/rules";
import { COMBATE_ABIERTO, registrar, revalidarEstados, type Autoria } from "@/lib/estadosPersonaje";

export type ResultadoRegistro = { ok: true } | { ok: false; error: string };

// Suma `cantidad` (negativa para quitar) a varios personajes, con suelo 0 como el
// panel de siempre, y una sola entrada con lo que de verdad se movió.
// TODO(revisar): quitar más de lo que tiene recorta a 0 en silencio (como
// adjustXpAction); ¿debería avisar en vez de recortar?
export async function ajustarRecursoDePersonajes(
  characterIds: string[],
  recurso: RecursoMaster,
  cantidad: number,
  autoria: Autoria,
): Promise<boolean> {
  const ids = [...new Set(characterIds)];
  const hecho = await prisma.$transaction(async (tx) => {
    const filas = await tx.character.findMany({ where: { id: { in: ids } }, select: { id: true, xp: true, creditos: true } });
    if (filas.length !== ids.length) return false;
    const cambios: CambioRecurso[] = [];
    for (const f of filas) {
      const antes = f[recurso];
      const despues = Math.max(0, antes + cantidad);
      if (despues === antes) continue;
      await tx.character.update({ where: { id: f.id }, data: { [recurso]: despues } });
      cambios.push({ characterId: f.id, antes, despues });
    }
    if (cambios.length > 0) await registrar(tx, autoria, { tipo: recurso, cambios });
    return true;
  });
  if (hecho) revalidarEstados(ids);
  return hecho;
}

// Error que deshace la transacción entera y llega al máster tal cual.
class NoSePuede extends Error {}

export async function deshacerRegistro(id: string): Promise<ResultadoRegistro> {
  try {
    const ids = await prisma.$transaction(async (tx) => {
      const entrada = await tx.registroMaster.findUnique({ where: { id } });
      if (!entrada) throw new NoSePuede("No existe esa entrada del registro.");
      const leida = entradaDeshacible(entrada);
      if (!leida.ok) throw new NoSePuede(leida.error);
      const datos = leida.plan;
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
        const posteriores = await tx.registroMaster.findMany({
          where: {
            id: { not: entrada.id },
            createdAt: { gte: entrada.createdAt },
            deshechoAt: null,
            characterIds: { hasSome: characterIds },
          },
          select: { tipo: true, datos: true },
        });
        const plan = planDeshacerEstados(
          datos,
          filas.map((f) => ({ id: f.id, nombre: f.name, sheet: parseSheet(f.stats), estados: leerEstados(f.estados) })),
          fotos.flatMap((f) => (f.characterId === null ? [] : [{ ...f, characterId: f.characterId }])),
          posteriores,
        );
        if (!plan.ok) throw new NoSePuede(plan.error);
        for (const p of plan.plan.personajes) {
          await tx.character.update({ where: { id: p.id }, data: { estados: p.estados, stats: p.sheet } });
        }
        for (const c of plan.plan.combatientes) {
          await tx.combatiente.update({
            where: { id: c.id },
            data: { pgActual: c.pgActual, pgMax: c.pgMax, fatigaActual: c.fatigaActual, fatigaMax: c.fatigaMax },
          });
        }
      }

      // Con la condición dentro del update: dos "deshacer" a la vez no lo aplican dos veces.
      const marcada = await tx.registroMaster.updateMany({ where: { id, deshechoAt: null }, data: { deshechoAt: new Date() } });
      if (marcada.count !== 1) throw new NoSePuede("Esa acción ya está deshecha.");
      return characterIds;
    });
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
