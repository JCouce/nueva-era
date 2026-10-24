import type { Element, ElementContent, Root, RootContent } from "hast";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import { slugificar, type DocumentoPreparado, type Encabezado } from "./encabezados";
import { rehypeTablasManual, textoDe } from "./tablas";

// Anclas de un documento ya preparado (encabezados y filas de tabla) y el trozo de
// texto que cuelga de cada una. Puro: recibe el markdown, no lee disco. Las filas salen
// del mismo pipeline que pinta el manual (el de react-markdown), así que sus ids son
// los mismos que lleva la página /manual/<slug>.

export type FilaTabla = {
  id: string;
  // Slug de la primera celda sin desambiguar: con lo que casa el nombre de un elemento.
  base: string;
  titulo: string;
  // La tabla con su cabecera y solo esta fila (o entera, si es de las irregulares que
  // se pintan con scroll: ahí aislar una fila descuadra las celdas).
  html: string;
};

export type AnclasDocumento = {
  markdown: string;
  encabezados: Encabezado[];
  filas: FilaTabla[];
};

export type Apartado = { titulo: string; markdown: string };

const esElemento = (n: RootContent | ElementContent | Root): n is Element => n.type === "element";
const limpio = (t: string) => t.replace(/\s+/g, " ").trim();

function hijos(el: Element, tag: string): Element[] {
  return el.children.filter((c): c is Element => esElemento(c) && c.tagName === tag);
}

function escapar(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Serializador mínimo para tablas: solo hace falta la estructura y el texto; el resto
// de atributos (data-label, ids…) los vuelve a poner rehypeTablasManual al pintarla.
function aHtml(nodo: ElementContent): string {
  // En una línea: un hueco en blanco dentro cerraría el bloque HTML del markdown.
  if (nodo.type === "text") return escapar(nodo.value.replace(/\s+/g, " "));
  if (!esElemento(nodo)) return "";
  if (nodo.tagName === "br") return "<br />";
  const atributos = (["rowSpan", "colSpan"] as const)
    .filter((k) => Number(nodo.properties[k] ?? 1) > 1)
    .map((k) => ` ${k.toLowerCase()}="${Number(nodo.properties[k])}"`)
    .join("");
  return `<${nodo.tagName}${atributos}>${nodo.children.map(aHtml).join("")}</${nodo.tagName}>`;
}

function tablaCon(tabla: Element, filas: Element[]): string {
  const thead = hijos(tabla, "thead");
  const cuerpo: Element = { type: "element", tagName: "tbody", properties: {}, children: filas };
  return `<table>${[...thead, cuerpo].map(aHtml).join("")}</table>`;
}

function filasDe(arbol: Root): FilaTabla[] {
  const salida: FilaTabla[] = [];
  const recorrer = (nodo: Root | Element) => {
    for (const hijo of nodo.children) {
      if (!esElemento(hijo)) continue;
      if (hijo.tagName !== "table") {
        recorrer(hijo);
        continue;
      }
      const cuerpo = hijos(hijo, "tbody").flatMap((tb) => hijos(tb, "tr"));
      const entera = hijo.properties.dataModo !== "fichas" ? tablaCon(hijo, cuerpo) : null;
      for (const tr of cuerpo) {
        const id = tr.properties.id;
        if (typeof id !== "string") continue;
        const primera = tr.children.find(esElemento);
        const titulo = primera ? limpio(textoDe(primera)) : id;
        salida.push({ id, base: slugificar(titulo), titulo, html: entera ?? tablaCon(hijo, [tr]) });
      }
    }
  };
  recorrer(arbol);
  return salida;
}

export function analizarDocumento(doc: DocumentoPreparado): AnclasDocumento {
  const procesador = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeTablasManual);
  const arbol = procesador.runSync(procesador.parse(doc.markdown)) as Root;
  return { markdown: doc.markdown, encabezados: doc.encabezados, filas: filasDe(arbol) };
}

const ENCABEZADO_HTML = /^<h([2-4]) id="([^"]+)">/;

// Encabezados que parten un apartado sin cerrarlo ("Nivel 2", "Acciones", "3. Nivel
// de poder"). Hace falta porque los niveles inferidos son casi planos: en Aumentos,
// "Ojo Biónico (Nivel 1-4)" y su "Nivel 1" salen los dos h3.
// TODO(revisar): heurística por texto; si el diseñador usa otra palabra para
// subdividir, el apartado se corta antes de tiempo (se ve, no rompe nada).
const SUBDIVISION = /^(nivel|acciones)\b|^\d/i;

// Desde el encabezado hasta el siguiente que lo cierra: uno de nivel superior, uno del
// mismo nivel que no sea subdivisión, o el ancla de otro elemento (`cortes`: en
// Equipamiento, "Linterna" es h3 dentro del h2 "Puntero Láser" y es otra pieza).
// Sin el propio encabezado: la hoja de la ficha ya lo lleva de título.
function trozoDeEncabezado(
  doc: AnclasDocumento,
  id: string,
  cortes: ReadonlySet<string>,
): string | null {
  const lineas = doc.markdown.split("\n");
  const inicio = lineas.findIndex((l) => ENCABEZADO_HTML.exec(l)?.[2] === id);
  if (inicio === -1) return null;
  const nivel = Number(ENCABEZADO_HTML.exec(lineas[inicio])![1]);
  const porId = new Map(doc.encabezados.map((e) => [e.id, e]));
  let fin = lineas.length;
  for (let i = inicio + 1; i < lineas.length; i++) {
    const m = ENCABEZADO_HTML.exec(lineas[i]);
    if (!m) continue;
    const n = Number(m[1]);
    const texto = porId.get(m[2])?.texto ?? "";
    if (n < nivel || (n === nivel && !SUBDIVISION.test(texto)) || cortes.has(m[2])) {
      fin = i;
      break;
    }
  }
  return lineas.slice(inicio + 1, fin).join("\n").trim();
}

export function apartado(
  doc: AnclasDocumento,
  ancla: string,
  cortes: ReadonlySet<string> = new Set(),
): Apartado | null {
  const encabezado = doc.encabezados.find((e) => e.id === ancla);
  if (encabezado) {
    const markdown = trozoDeEncabezado(doc, ancla, cortes);
    return markdown === null ? null : { titulo: encabezado.texto, markdown };
  }
  const fila = doc.filas.find((f) => f.id === ancla);
  return fila ? { titulo: fila.titulo, markdown: `${fila.html}\n` } : null;
}
