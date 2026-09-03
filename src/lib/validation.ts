// Validación de entrada de la app (no del sistema de juego). Los esquemas de la
// ficha viven en "@/lib/rules" porque dependen de las reglas.
import { z } from "zod";

// Login flexible para el grupo: acepta usuario simple (no hace falta email) y
// contraseñas cortas. El campo se llama `email` porque mapea a User.email.
export const loginSchema = z.object({
  email: z.string().trim().min(1, "Pon un usuario"),
  password: z.string().min(1, "Pon una contraseña"),
});

export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(1).max(60).optional(),
});

export const characterCreateSchema = z.object({
  name: z.string().trim().min(1, "Pon un nombre").max(80),
});
