import { ESPECIALIDADES, type EspecialidadId } from "@/lib/rules";

// Clases Tailwind por acento de arquetipo (literales para que el scanner las genere).
export type Accent = {
  text: string;
  border: string;
  glow: string;
  bg: string;
};

export const ACCENT: Record<string, Accent> = {
  danger: {
    text: "text-danger",
    border: "border-danger",
    glow: "shadow-glow-danger",
    bg: "bg-danger",
  },
  glitch: {
    text: "text-glitch",
    border: "border-glitch",
    glow: "shadow-glow-magenta",
    bg: "bg-glitch",
  },
  info: {
    text: "text-info",
    border: "border-info",
    glow: "shadow-glow-cyan",
    bg: "bg-info",
  },
};

export function accentFor(especialidad: EspecialidadId | null): Accent | null {
  const e = ESPECIALIDADES.find((x) => x.id === especialidad);
  return e ? ACCENT[e.accent] : null;
}
