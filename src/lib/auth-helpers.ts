import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Reglas de permiso puras — sin Next/Auth.js, con su propio test. Ver el
// comentario de cabecera de permisos.ts.
export * from "./permisos";

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
