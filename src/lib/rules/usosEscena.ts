// "Una vez por escena" (tanda A4a de docs/propuesta-aumentos.md, §11.3 de docs/sistema.md):
// las casillas con `usoPorEscena` (Mielinización "Ahorro de fatiga", Proyección "Con
// lenguaje", Matriz de Red "Repetir tras fallar") se gastan al tirar con ellas marcadas y con
// efecto (montarTirada las devuelve en `usosEscena`), no al marcarlas. Lo gastado se guarda en
// sheet.usosEscena (ids de casilla) y no se puede volver a marcar hasta "Terminar escena"
// (terminarEscena, vitalidad.ts; también el del máster). En Recursos se puede liberar uno a
// mano, para los errores.
// "Hasta un descanso" (Neuroprótesis 3 y 4) no pasa por aquí: sigue como texto.
import { AUMENTOS } from "../catalog/aumentos";
import type { CondicionTirada } from "./condiciones";
import type { Sheet } from "./sheet";

export const MAX_USOS_ESCENA = 20;
export const MOTIVO_USADA_ESCENA = "Usada esta escena";

let cache: ReadonlyMap<string, string> | null = null;

// Id de casilla → "Etiqueta · Aumento", de las casillas por escena del catálogo (operaciones,
// opciones de elección y niveles de implante). Perezoso: el catálogo se lee al usarlo, no al
// cargar el módulo (sheet.ts lo importa).
function usosDelCatalogo(): ReadonlyMap<string, string> {
  if (cache) return cache;
  const mapa = new Map<string, string>();
  const anota = (casillas: readonly CondicionTirada[] | undefined, fuente: string) => {
    for (const c of casillas ?? []) if (c.tipo === "toggle" && c.usoPorEscena) mapa.set(c.id, `${c.etiqueta} · ${fuente}`);
  };
  for (const a of AUMENTOS) {
    if (a.familia === "operacionGenetica") {
      anota(a.casillas, a.label);
      for (const o of a.eleccion?.opciones ?? []) anota(o.casillas, a.label);
    } else for (const n of a.niveles) anota(n.condiciones, a.label);
  }
  cache = mapa;
  return mapa;
}

export function esUsoEscena(id: string): boolean {
  return usosDelCatalogo().has(id);
}

// Lectura tolerante (parseSheet): solo ids del catálogo, sin repetir y hasta el tope.
export function normalizarUsosEscena(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((x): x is string => typeof x === "string" && esUsoEscena(x)))].slice(0, MAX_USOS_ESCENA);
}

// Apunta los usos gastados al tirar. Los que ya estaban, o no son del catálogo, no cambian nada.
export function gastarUsosEscena(sheet: Sheet, ids: readonly string[]): Sheet {
  const nuevos = ids.filter((id) => esUsoEscena(id) && !sheet.usosEscena.includes(id));
  if (nuevos.length === 0) return sheet;
  return { ...sheet, usosEscena: [...new Set([...sheet.usosEscena, ...nuevos])].slice(0, MAX_USOS_ESCENA) };
}

// "Liberar" en Recursos: devuelve un uso (para los errores).
export function liberarUsoEscena(sheet: Sheet, id: string): Sheet {
  return sheet.usosEscena.includes(id) ? { ...sheet, usosEscena: sheet.usosEscena.filter((u) => u !== id) } : sheet;
}

export function vaciarUsosEscena(sheet: Sheet): Sheet {
  return sheet.usosEscena.length === 0 ? sheet : { ...sheet, usosEscena: [] };
}

// Lo gastado esta escena, con su etiqueta, para la lista de Recursos.
export function usosEscenaDeFicha(sheet: Pick<Sheet, "usosEscena">): { id: string; etiqueta: string }[] {
  const mapa = usosDelCatalogo();
  return sheet.usosEscena.map((id) => ({ id, etiqueta: mapa.get(id) ?? id }));
}

// Las casillas por escena ya gastadas salen bloqueadas, con el motivo (resolverFicha, al
// índice de condiciones: llegan así a las tiradas fijas, generadas y de poder).
export function conUsosEscena(casillas: CondicionTirada[], usados: readonly string[]): CondicionTirada[] {
  if (usados.length === 0) return casillas;
  return casillas.map((c) =>
    c.tipo === "toggle" && c.usoPorEscena && usados.includes(c.id) ? { ...c, bloqueada: MOTIVO_USADA_ESCENA } : c,
  );
}
