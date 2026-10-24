// Qué documentos de docs/fuente/ salen en el manual y en qué orden. Puro: lee el texto
// de _indice.tsv (lo escribe scripts/sync-drive.mjs), no el disco.

export type EntradaIndice = {
  slug: string;
  nombre: string;
  estado: "activo" | "retirado";
};

// Orden de lectura para un jugador nuevo. Los que no estén aquí van al final, por nombre.
export const ORDEN_MANUAL = [
  "creacion-de-personaje",
  "reglas-base",
  "habilidades",
  "especies",
  "dotes",
  "aumentos",
  "psionica",
  "equipamiento",
  "puntos-heroicos",
];

// neos-plouton es el trasfondo de la campaña: se hará algo aparte con él, no va
// mezclado con las reglas.
export const EXCLUIDOS_MANUAL = ["neos-plouton"];

export function parsearIndice(tsv: string): EntradaIndice[] {
  return tsv
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "" && !l.startsWith("#"))
    .flatMap((l) => {
      const [, slug, nombre, estado] = l.split("\t");
      if (!slug || !nombre || (estado !== "activo" && estado !== "retirado")) return [];
      return [{ slug: slug.trim(), nombre: nombre.trim(), estado }];
    });
}

export function documentosDelManual(entradas: EntradaIndice[]): EntradaIndice[] {
  const posicion = (slug: string) => {
    const i = ORDEN_MANUAL.indexOf(slug);
    return i === -1 ? ORDEN_MANUAL.length : i;
  };
  return entradas
    .filter((e) => e.estado === "activo" && !EXCLUIDOS_MANUAL.includes(e.slug))
    .sort((a, b) => posicion(a.slug) - posicion(b.slug) || a.nombre.localeCompare(b.nombre, "es"));
}
