import { z } from "zod";
import {
  ATTR_MIN,
  ATTR_MAX,
  SKILL_MIN,
  SKILL_MAX,
  SKILLS,
} from "./rules";

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

// Ficha de personaje (BUILD). Vive en Character.stats (Json) hasta que se estabilice.
const attrValue = z.number().int().min(ATTR_MIN).max(ATTR_MAX);
const skillValue = z.number().int().min(SKILL_MIN).max(SKILL_MAX);

const skillsShape = Object.fromEntries(
  SKILLS.map((s) => [s.id, skillValue]),
) as Record<(typeof SKILLS)[number]["id"], typeof skillValue>;

// Adquisición discreta (disciplina o cyberware): guarda el coste pagado como foto
// del momento. costePagado 0 = regalo del máster. Base de la economía derivada.
export const acquisitionSchema = z.object({
  id: z.string().min(1),
  costePagado: z.number().int().min(0),
});

export const buildSheetSchema = z.object({
  especialidad: z.enum(["merc", "cazatalentos", "netrunner"]).nullable(),
  edad: z.number().int().min(0).max(999).nullable(),
  trasfondo: z.string().max(2000),
  // Solo se guarda lo GANADO; el disponible se deriva restando lo gastado.
  xpGanado: z.number().int().min(0),
  dineroGanado: z.number().int().min(0),
  attributes: z.object({
    fuerza: attrValue,
    destreza: attrValue,
    inteligencia: attrValue,
  }),
  skills: z.object(skillsShape),
  // Disciplinas: rango 0–5 por nodo del árbol. Gasto derivado por fórmula.
  disciplinas: z.record(z.string(), z.number().int().min(0).max(5)),
  // Compras con €$ (foto del coste). Cyberware reservado para su rebanada.
  weapons: z.array(acquisitionSchema),
  cyberware: z.array(acquisitionSchema),
});

export type BuildSheet = z.infer<typeof buildSheetSchema>;
export type Acquisition = z.infer<typeof acquisitionSchema>;
