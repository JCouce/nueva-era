import type { CharacterStatus, Prisma } from "@/generated/prisma/client";

// Borrado de fichas: una ficha sin trabajo se borra de verdad y sin preguntar; una con
// trabajo pide confirmación y se marca con `deletedAt` (soft delete).

/** Filtro de las listas de fichas: las borradas no salen en ninguna. */
export const NO_BORRADA = { deletedAt: null } satisfies Prisma.CharacterWhereInput;

/**
 * Tocada = alguien ha escrito en ella después de crearla (jugador o máster, cualquier
 * campo), o ya salió de creación. Al crear, `createdAt` y `updatedAt` salen idénticos y
 * abrir la ficha no escribe nada; deshacer un cambio a mano no la devuelve a "virgen".
 */
export function fichaTocada(c: { createdAt: Date; updatedAt: Date; status: CharacterStatus }): boolean {
  return c.status !== "DRAFT" || c.updatedAt.getTime() > c.createdAt.getTime();
}

/**
 * Si el borrado tiene que ser soft. Una ficha que ha estado en algún combate también: el
 * borrado de verdad arrastra en cascada sus filas de combatiente.
 */
export function borradoSuave(
  c: { createdAt: Date; updatedAt: Date; status: CharacterStatus },
  enCombates: number,
): boolean {
  return fichaTocada(c) || enCombates > 0;
}
