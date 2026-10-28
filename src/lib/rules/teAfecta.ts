// "te afecta: A, B, C" de una hoja de tirada (HojaTirada, ArbolHabilidades.tsx): los nombres (sin
// números) de los ítems que pone la ficha en ESTA tirada — dotes, aumentos, equipo y mejoras de
// arma, especie, fármacos, poderes —, para recordarlo y comprobar que se aplica. Uno por ítem, en
// el orden de aportesDeTirada (aportes.ts), y sin lo que ya nombra la propia tirada (el arma con
// la que se dispara).
import type { Accion } from "./acciones";
import { aportesDeTirada } from "./aportes";
import type { FichaResuelta } from "./fichaResuelta";
import type { TiradaMontada } from "./montaje";
import { claveOrigen } from "./origen";

export function teAfecta(
  ficha: Pick<FichaResuelta, "modificadores">,
  t: Accion,
  montada: Pick<TiradaMontada, "aplicado">,
): string[] {
  const items = new Set<string>();
  const nombres = new Set<string>();
  for (const { origen } of aportesDeTirada(ficha, t, montada)) {
    const item = claveOrigen(origen);
    if (items.has(item)) continue;
    items.add(item);
    nombres.add(origen.label);
  }
  const label = t.label.toLowerCase();
  return [...nombres].filter((n) => !label.includes(n.toLowerCase()));
}
