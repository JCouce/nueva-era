// Reglas de permiso, puras y sin dependencias de Next/Auth.js — separadas de
// auth-helpers.ts (que sí las tiene, vía requireUser()) para que se puedan
// testear con node --test sin arrastrar next/navigation ni @/auth, que no
// resuelven fuera del bundler de Next. auth-helpers.ts reexporta todo esto,
// así que el resto de la app sigue importando de "@/lib/auth-helpers" como
// siempre.
type UsuarioConRol = { id: string; role: "PLAYER" | "MASTER" };

/** Regla central de permisos: el dueño o el máster pueden editar. */
export function canEditCharacter(
  user: UsuarioConRol,
  character: { ownerId: string },
): boolean {
  return user.role === "MASTER" || character.ownerId === user.id;
}

/**
 * Fase 6b (docs/fase-6b.md, subtarea 1.3): quién puede tocar el PG/fatiga de
 * un Combatiente en un combate. Decisión D2 del brainstorm: el máster
 * siempre puede; el jugador solo si el combatiente es su propio Character
 * (no un NPC ad-hoc ni de catálogo, que no tienen dueño). Misma regla que
 * canEditCharacter, extendida a "combatiente sin Character no tiene dueño".
 */
export function canAdjustCombatiente(
  user: UsuarioConRol,
  combatiente: { character: { ownerId: string } | null },
): boolean {
  if (!combatiente.character) return user.role === "MASTER";
  return canEditCharacter(user, combatiente.character);
}
