// Concurrencia optimista sobre la ficha (td-22). Varias acciones leen `Character.stats`, lo
// cambian y lo reescriben entero: el autoguardado del jugador y lo que hace el máster (estados,
// terminar escena, vida, siguiente turno, terminar combate). Si dos se cruzan, la segunda pisaba
// a la primera sin enterarse. Ahora toda reescritura de `stats` va condicionada a que siga siendo
// el que se leyó (comparar y escribir en un solo UPDATE): si alguien lo cambió entremedias, no
// escribe y lanza FichaCambiada. El máster lo reintenta solo (conReintentos, relee y recalcula);
// el jugador recibe el error marcado `conflicto` y su cola de autoguardado lo reintenta una vez.
// Comparar el Json entero en vez de una columna de versión: no hace falta que cada escritor se
// acuerde de subirla, cualquier cambio de la ficha cuenta.
import type { Prisma } from "@/generated/prisma/client";
import type { prisma } from "@/lib/db";

type Db = Prisma.TransactionClient | typeof prisma;

// Lo leído de la fila: el Json crudo de `stats` (no el ya pasado por parseSheet) y, si la
// escritura los recalcula a partir de lo leído, la XP y los créditos.
export type FichaLeida = { stats: Prisma.JsonValue; xp?: number; creditos?: number };

export class FichaCambiada extends Error {
  constructor() {
    super("La ficha ha cambiado mientras se guardaba.");
  }
}

export const MENSAJE_FICHA_CAMBIADA = "La ficha ha cambiado mientras guardabas (otro cambio a la vez, p. ej. del máster). Vuelve a intentarlo.";

export async function escribirFicha(
  db: Db,
  id: string,
  leida: FichaLeida,
  data: Prisma.CharacterUpdateManyMutationInput,
): Promise<void> {
  const r = await db.character.updateMany({
    where: {
      id,
      // `stats` nunca es null en la base (default "{}"): lo leído siempre es un valor Json.
      stats: { equals: leida.stats as Prisma.InputJsonValue },
      ...(leida.xp !== undefined && { xp: leida.xp }),
      ...(leida.creditos !== undefined && { creditos: leida.creditos }),
    },
    data,
  });
  if (r.count === 0) throw new FichaCambiada();
}

// Para las operaciones que leen dentro de su transacción (las del máster): si otra escritura se
// cuela, se repite entera con lo nuevo. Tres intentos bastan: la ventana es de milisegundos.
export async function conReintentos<T>(fn: () => Promise<T>, intentos = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (!(e instanceof FichaCambiada) || i >= intentos) throw e;
    }
  }
}
