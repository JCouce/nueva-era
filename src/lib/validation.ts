import { z } from "zod";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(1).max(60).optional(),
});

export const characterCreateSchema = z.object({
  name: z.string().trim().min(1, "Pon un nombre").max(80),
});

// Estadísticas homebrew: pares clave -> número o texto. Flexible para crecer sin migración.
export const statsSchema = z.record(
  z.string().min(1),
  z.union([z.number(), z.string()]),
);

export type Stats = z.infer<typeof statsSchema>;
