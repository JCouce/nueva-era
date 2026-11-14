// Etiquetas libres de los NPCs del máster: sin catálogo cerrado, así que la única
// regla es que no se dupliquen por mayúsculas, tildes o espacios de más.

export const ETIQUETA_MAX_LARGO = 40;
export const ETIQUETAS_MAX = 20;

export const normalizarClave = (t: string) =>
  t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

/** Limpia una lista entera: recorta, colapsa espacios, quita vacías y repetidas (gana la primera grafía). */
export function normalizarEtiquetas(lista: readonly string[]): string[] {
  const vistas = new Set<string>();
  const out: string[] = [];
  for (const cruda of lista) {
    const limpia = cruda.replace(/\s+/g, " ").trim().slice(0, ETIQUETA_MAX_LARGO).trim();
    const clave = normalizarClave(limpia);
    if (!clave || vistas.has(clave)) continue;
    vistas.add(clave);
    out.push(limpia);
    if (out.length === ETIQUETAS_MAX) break;
  }
  return out;
}

/** El NPC tiene todas las etiquetas marcadas (filtro Y). Sin marcadas, pasa cualquiera. */
export function tieneTodas(etiquetas: readonly string[], marcadas: readonly string[]): boolean {
  if (marcadas.length === 0) return true;
  const propias = new Set(etiquetas.map(normalizarClave));
  return marcadas.every((m) => propias.has(normalizarClave(m)));
}

/** Etiquetas del catálogo con cuántos NPCs las llevan, ordenadas por uso y luego por nombre. */
export function recuentoEtiquetas(npcs: readonly { etiquetas: readonly string[] }[]): { etiqueta: string; n: number }[] {
  const porClave = new Map<string, { etiqueta: string; n: number }>();
  for (const npc of npcs) {
    for (const e of normalizarEtiquetas(npc.etiquetas)) {
      const clave = normalizarClave(e);
      const actual = porClave.get(clave);
      if (actual) actual.n++;
      else porClave.set(clave, { etiqueta: e, n: 1 });
    }
  }
  return [...porClave.values()].sort((a, b) => b.n - a.n || a.etiqueta.localeCompare(b.etiqueta, "es"));
}

/** Búsqueda (nombre, nota y etiquetas, sin tildes ni mayúsculas) más filtro Y por etiquetas. Catálogo y combate. */
export function filtrarNpcs<T extends { nombre: string; nota: string | null; etiquetas: readonly string[] }>(
  npcs: readonly T[],
  busqueda: string,
  marcadas: readonly string[],
): T[] {
  const q = normalizarClave(busqueda);
  return npcs.filter(
    (n) =>
      tieneTodas(n.etiquetas, marcadas) &&
      (!q || normalizarClave(`${n.nombre} ${n.nota ?? ""} ${n.etiquetas.join(" ")}`).includes(q)),
  );
}
