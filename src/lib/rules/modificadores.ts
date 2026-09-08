// Modificadores: la vía única por la que cualquier cosa altera los números de
// un personaje.
//
// Razas, dotes, aumentos, equipo y estados hacen todos lo mismo —subir un
// atributo, cambiar un derivado, regalar habilidad, afectar a un tipo de
// tirada—, así que comparten un solo tipo. Cuando lleguen los poderes o los
// aumentos reales, serán datos nuevos en el catálogo, no código nuevo.
import type { AtributoId } from "./atributos";
import type { HabilidadId } from "./habilidades";

// Valores derivados que algo puede modificar directamente.
export const DERIVADOS_MODIFICABLES = [
  "vida",
  "fatiga",
  "alerta",
  "carrera",
  "carga",
] as const;
export type DerivadoId = (typeof DERIVADOS_MODIFICABLES)[number];

export type Modificador =
  | { tipo: "atributo"; id: AtributoId; valor: number }
  | { tipo: "derivado"; id: DerivadoId; valor: number }
  | { tipo: "habilidad"; id: HabilidadId; valor: number }
  // Contexto libre mientras no exista un catálogo cerrado de situaciones:
  // "salvaciones de fortaleza", "tiradas de sigilo", "ataques a distancia"…
  | { tipo: "tirada"; contexto: string; valor: number };

export type OrigenModificador =
  | "especie"
  | "dote"
  | "aumento"
  | "equipo"
  | "estado";

// Un modificador con su procedencia, para que la ficha pueda explicar de dónde
// sale cada número en vez de mostrar un total opaco.
export type ModificadorConFuente = Modificador & {
  origen: OrigenModificador;
  fuente: string; // etiqueta legible: "Arkorü", "Malherido", "Exoesqueleto 2"…
};

export function bonoAtributo(
  mods: ModificadorConFuente[],
  id: AtributoId,
): number {
  return mods.reduce(
    (t, m) => (m.tipo === "atributo" && m.id === id ? t + m.valor : t),
    0,
  );
}

export function bonoDerivado(
  mods: ModificadorConFuente[],
  id: DerivadoId,
): number {
  return mods.reduce(
    (t, m) => (m.tipo === "derivado" && m.id === id ? t + m.valor : t),
    0,
  );
}

export function bonoHabilidad(
  mods: ModificadorConFuente[],
  id: HabilidadId,
): number {
  return mods.reduce(
    (t, m) => (m.tipo === "habilidad" && m.id === id ? t + m.valor : t),
    0,
  );
}

// Los contextos se comparan en minúsculas y sin exigir coincidencia exacta, para
// que "salvaciones" case con "salvaciones de fortaleza" mientras no haya catálogo.
export function bonoTirada(
  mods: ModificadorConFuente[],
  contexto: string,
): number {
  const c = contexto.toLowerCase();
  return mods.reduce((t, m) => {
    if (m.tipo !== "tirada") return t;
    const suyo = m.contexto.toLowerCase();
    return c.includes(suyo) || suyo.includes(c) ? t + m.valor : t;
  }, 0);
}

// Agrupa por fuente para poder mostrar "Arkorü: +1 Aguante" en la ficha.
export function porFuente(
  mods: ModificadorConFuente[],
): { fuente: string; origen: OrigenModificador; mods: ModificadorConFuente[] }[] {
  const mapa = new Map<string, ModificadorConFuente[]>();
  for (const m of mods) {
    const lista = mapa.get(m.fuente) ?? [];
    lista.push(m);
    mapa.set(m.fuente, lista);
  }
  return [...mapa.entries()].map(([fuente, lista]) => ({
    fuente,
    origen: lista[0].origen,
    mods: lista,
  }));
}
