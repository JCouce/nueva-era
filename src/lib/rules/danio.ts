// Daño de vida por categoría (docs/sistema.md §7, pregunta 24): la vida perdida
// (máximo − vidaActual) se desglosa en no letal, letal y grave. `vidaActual` sigue
// siendo la verdad; esto es solo su desglose, y se normaliza contra ella en cada
// lectura (vitalidad.ts). Decisiones del usuario, 2026-10-24:
//   - lo que falte del desglose (daño sin categoría: S75, panel de mando, −/+ de
//     vida) es letal;
//   - lo que sobre (curas sin categoría) se quita de lo más leve: no letal, letal,
//     grave.
// Sin imports de otras reglas a propósito: sheet.ts lo usa al construir su schema.
import { z } from "zod";
import { TIPOS_DANIO } from "../catalog/tiposDanio";

export const CATEGORIAS_DANIO = ["noLetal", "letal", "grave"] as const;
export type CategoriaDanio = (typeof CATEGORIAS_DANIO)[number];

export const MAX_DANIO = 999;

const puntos = z.number().int().min(0).max(MAX_DANIO);
export const danioSchema = z.object({ noLetal: puntos, letal: puntos, grave: puntos });
export type DanioVida = z.infer<typeof danioSchema>;

export const danioVacio = (): DanioVida => ({ noLetal: 0, letal: 0, grave: 0 });

export const sumaDanio = (d: DanioVida): number => d.noLetal + d.letal + d.grave;

export const danioIgual = (a: DanioVida, b: DanioVida): boolean =>
  a.noLetal === b.noLetal && a.letal === b.letal && a.grave === b.grave;

// Lectura tolerante del Json: cada categoría por separado, entera y en [0, MAX_DANIO].
export function leerDanio(raw: unknown): DanioVida {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const leer = (v: unknown) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(MAX_DANIO, Math.round(n))) : 0;
  };
  return { noLetal: leer(r.noLetal), letal: leer(r.letal), grave: leer(r.grave) };
}

// Lleva la suma del desglose a [minimo, maximo]: lo que falte, a letal; lo que sobre, de lo
// más leve. Con minimo === maximo es normalizarDanio. parseSheet lo usa con un rango porque no
// conoce los estados del personaje y no sabe el máximo exacto (vitalidad.ts).
export function acotarDanio(danio: DanioVida, minimo: number, maximo: number): DanioVida {
  const min = Math.max(0, Math.round(minimo));
  const max = Math.max(min, Math.round(maximo));
  const suma = sumaDanio(danio);
  if (suma < min) return { ...danio, letal: danio.letal + (min - suma) };
  if (suma <= max) return danio;
  let sobra = suma - max;
  const out = { ...danio };
  for (const c of CATEGORIAS_DANIO) {
    const quita = Math.min(sobra, out[c]);
    out[c] -= quita;
    sobra -= quita;
  }
  return out;
}

// Invariante tras normalizar: noLetal + letal + grave === perdida (si perdida ≥ 0).
export function normalizarDanio(danio: DanioVida, perdida: number): DanioVida {
  return acotarDanio(danio, perdida, perdida);
}

const sinAcentos = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Categoría de los textos de daño que ya existen ("no letal", "Letal no absorbible", "grave"…)
// y de los tipos de daño específico ("Fuego" → grave, "Frío" → no letal; docs/fuente/sistema.md,
// "Daño Específico"). Null si no es ninguno, y quien llama lo resta sin categoría.
export function categoriaDanioDeTexto(texto: string | null | undefined): CategoriaDanio | null {
  const t = sinAcentos((texto ?? "").trim().toLowerCase());
  if (t.startsWith("no letal")) return "noLetal";
  if (t.startsWith("letal")) return "letal";
  if (t.startsWith("grave")) return "grave";
  const tipo = TIPOS_DANIO.find((x) => x.categoria && t.startsWith(sinAcentos(x.label.toLowerCase())));
  return tipo?.categoria ? categoriaDanioDeTexto(tipo.categoria) : null;
}
