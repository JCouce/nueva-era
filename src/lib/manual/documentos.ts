import { readFile } from "node:fs/promises";
import path from "node:path";
import { documentosDelManual, parsearIndice, type EntradaIndice } from "./indice";
import { prepararDocumento, type DocumentoPreparado } from "./encabezados";

// Se lee en build (las páginas del manual son estáticas). Si alguna pasa a dinámica,
// next.config.ts ya incluye docs/fuente en el trazado de archivos para Vercel.
const CARPETA = path.join(process.cwd(), "docs", "fuente");

export async function listarDocumentos(): Promise<EntradaIndice[]> {
  const tsv = await readFile(path.join(CARPETA, "_indice.tsv"), "utf8");
  return documentosDelManual(parsearIndice(tsv));
}

export async function leerDocumento(
  slug: string,
): Promise<(DocumentoPreparado & { nombre: string }) | null> {
  const entrada = (await listarDocumentos()).find((d) => d.slug === slug);
  if (!entrada) return null;
  const md = await readFile(path.join(CARPETA, `${entrada.slug}.md`), "utf8");
  return { nombre: entrada.nombre, ...prepararDocumento(md, { titulo: entrada.nombre }) };
}
