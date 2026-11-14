// Ir del combate a la ficha y volver (usuario, 2026-11-14): desde cada fila de la consola, a la
// ficha del jugador o a la plantilla del NPC; desde ellas, el máster vuelve a la consola mientras
// haya un combate abierto. Puro, sin Next, para poder testearlo con node --test.
export const RUTA_COMBATE = "/master/combate";

type Rol = "PLAYER" | "MASTER";
type EstadoCombate = "PREPARANDO" | "EN_CURSO" | "TERMINADO";

// «← Volver al combate»: solo el máster, y solo con un combate preparándose o en curso (la
// consola no tiene otro que enseñar).
export function hayVueltaAlCombate(role: Rol, estado: EstadoCombate | null | undefined): boolean {
  return role === "MASTER" && (estado === "PREPARANDO" || estado === "EN_CURSO");
}

export type EnlaceCombatiente = { href: string; label: string };

// Un jugador, a su ficha; un NPC, a su plantilla en el editor. Sin ninguna de las dos (NPC cuya
// plantilla se borró del todo: la relación queda en null), nada.
export function enlaceDeCombatiente(c: { characterId: string | null; npcTemplateId: string | null }): EnlaceCombatiente | null {
  if (c.characterId !== null) return { href: `/characters/${c.characterId}`, label: "Ficha" };
  if (c.npcTemplateId !== null) return { href: `/master/npcs/${c.npcTemplateId}`, label: "Plantilla" };
  return null;
}
