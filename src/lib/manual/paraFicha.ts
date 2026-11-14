import { apartado, type AnclasDocumento, type Apartado } from "./apartados";
import {
  elementosDelCatalogo,
  resolverReferencias,
  EXCEPCIONES,
  type ClaveManual,
  type ElementoManual,
  type Excepcion,
  type Referencia,
} from "./referencias";

// Lo que la ficha recibe del manual, ya resuelto en build: un índice pequeño (elemento
// → documento, ancla y título) y, por documento, el texto de cada ancla referenciada.
// Puro; lo sirven los route handlers estáticos de /api/manual.

export type IndiceManual = Partial<Record<ClaveManual, Referencia>>;
export type ApartadosDocumento = Record<string, Apartado>;

export type ManualFicha = {
  indice: IndiceManual;
  apartados: Record<string, ApartadosDocumento>;
};

export function montarManualFicha(
  documentos: ReadonlyMap<string, AnclasDocumento>,
  elementos: readonly ElementoManual[] = elementosDelCatalogo(),
  excepciones: Readonly<Partial<Record<ClaveManual, Excepcion>>> = EXCEPCIONES,
): ManualFicha {
  const referencias = resolverReferencias(elementos, documentos, excepciones);

  const cortes = new Map<string, Set<string>>();
  for (const r of referencias.values()) {
    if (!cortes.has(r.slug)) cortes.set(r.slug, new Set());
    cortes.get(r.slug)!.add(r.ancla);
  }

  const indice: IndiceManual = {};
  const apartados: Record<string, ApartadosDocumento> = {};
  for (const [clave, r] of referencias) {
    const ya = apartados[r.slug]?.[r.ancla];
    const trozo = ya ?? apartado(documentos.get(r.slug)!, r.ancla, cortes.get(r.slug));
    // Un encabezado sin cuerpo (Interpretación, en Habilidades) no lleva a nada útil.
    if (!trozo || trozo.markdown.trim() === "") continue;
    indice[clave] = r;
    (apartados[r.slug] ??= {})[r.ancla] = trozo;
  }
  return { indice, apartados };
}
