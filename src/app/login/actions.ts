"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { prisma } from "@/lib/db";
import { loginSchema, registerSchema } from "@/lib/validation";

export type AuthState = { error?: string } | undefined;

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Email o contraseña no válidos" };

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/characters" });
  } catch (error) {
    // El redirect de éxito NO es AuthError: se repropaga abajo.
    if (error instanceof AuthError) return { error: "Credenciales incorrectas" };
    throw error;
  }
}

export async function registerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const { email, password, name } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "Ese email ya está registrado" };

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { email, name, passwordHash } });

  try {
    await signIn("credentials", { email, password, redirectTo: "/characters" });
  } catch (error) {
    if (error instanceof AuthError) return { error: "No se pudo iniciar sesión" };
    throw error;
  }
}
