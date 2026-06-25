import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type SessionUser = {
  id: string;
  role: "PLAYER" | "MASTER";
  name?: string | null;
  email?: string | null;
};

/** Devuelve el usuario logueado o redirige a /login. Úsalo en RSC y server actions. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user as SessionUser;
}

/** Regla central de permisos: el dueño o el máster pueden editar. */
export function canEditCharacter(
  user: Pick<SessionUser, "id" | "role">,
  character: { ownerId: string },
): boolean {
  return user.role === "MASTER" || character.ownerId === user.id;
}
