import { readFile } from "node:fs/promises";
import path from "node:path";
import { documentosDelManual, parsearIndice, type EntradaIndice } from "./indice";
import { prepararDocumento, type DocumentoPreparado } from "./encabezados";
import { analizarDocumento, type AnclasDocumento } from "./apartados";
import { montarManualFicha, type ManualFicha } from "./paraFicha";

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

let manualFicha: Promise<ManualFicha> | null = null;

// Una sola lectura y análisis por proceso de build (lo piden el índice y cada documento).
export function manualDeLaFicha(): Promise<ManualFicha> {
  manualFicha ??= (async () => {
    const documentos = new Map<string, AnclasDocumento>();
    for (const { slug } of await listarDocumentos()) {
      const doc = await leerDocumento(slug);
      if (doc) documentos.set(slug, analizarDocumento(doc));
    }
    return montarManualFicha(documentos);
  })();
  return manualFicha;
}
