import type { Element, ElementContent, Root, RootContent } from "hast";

// Plugin rehype: prepara las tablas del manual para pintarse como fichas en móvil.
//
// Las tablas del diseñador tienen la primera fila de cabecera (a veces `<td><strong>`
// en vez de `<th>`) y la primera columna de nombre. Se reestructuran a thead/tbody y
// cada celda de datos lleva `data-label` con su cabecera: el CSS del manual las apila
// en tarjetas en pantalla estrecha. Con rowspan/colspan o filas de distinto ancho no
// hay forma fiable de emparejar celda y cabecera: `data-modo="scroll"` (tabla con
// scroll horizontal y primera columna fija).

export type ModoTabla = "fichas" | "scroll";

const esElemento = (n: RootContent | ElementContent | Root): n is Element =>
  n.type === "element";

function hijosConTag(el: Element, tags: string[]): Element[] {
  return el.children.filter((c): c is Element => esElemento(c) && tags.includes(c.tagName));
}

function filasDe(tabla: Element): Element[] {
  return tabla.children.flatMap((c) => {
    if (!esElemento(c)) return [];
    if (c.tagName === "tr") return [c];
    if (["thead", "tbody", "tfoot"].includes(c.tagName)) return hijosConTag(c, ["tr"]);
    return [];
  });
}

const celdasDe = (fila: Element) => hijosConTag(fila, ["td", "th"]);

export function textoDe(nodo: Element | ElementContent): string {
  if (nodo.type === "text") return nodo.value;
  if (!esElemento(nodo)) return "";
  if (nodo.tagName === "br") return " ";
  return nodo.children.map(textoDe).join("");
}

const limpio = (t: string) => t.replace(/\s+/g, " ").trim();
const vacia = (celda: Element) => limpio(textoDe(celda)) === "";

function esFilaDeCabecera(fila: Element): boolean {
  const celdas = celdasDe(fila);
  return (
    celdas.length > 0 &&
    celdas.every((c) => {
      if (c.tagName === "th") return true;
      const conContenido = c.children.filter(
        (h) => !(h.type === "text" && h.value.trim() === ""),
      );
      return (
        conContenido.length === 1 &&
        esElemento(conContenido[0]) &&
        conContenido[0].tagName === "strong"
      );
    })
  );
}

function abarca(celda: Element): boolean {
  const n = (v: unknown) => Number(v ?? 1);
  return n(celda.properties.rowSpan) > 1 || n(celda.properties.colSpan) > 1;
}

function procesarTabla(tabla: Element, cabeceraAnterior: string[] | null): string[] | null {
  const filas = filasDe(tabla).filter((f) => !celdasDe(f).every(vacia));
  if (filas.length === 0) return cabeceraAnterior;

  const anchos = new Set(filas.map((f) => celdasDe(f).length));
  const irregular = anchos.size > 1 || filas.some((f) => celdasDe(f).some(abarca));

  let cabecera: Element | null = esFilaDeCabecera(filas[0]) ? filas[0] : null;
  let etiquetas = cabecera ? celdasDe(cabecera).map((c) => limpio(textoDe(c))) : null;
  const cuerpo = cabecera ? filas.slice(1) : filas;

  // TODO(revisar): una tabla sin cabecera que sigue a otra del mismo ancho se trata
  // como su continuación (en Equipamiento, las armaduras avanzadas tras las básicas).
  if (!etiquetas && !irregular && cabeceraAnterior?.length === celdasDe(filas[0]).length) {
    etiquetas = cabeceraAnterior;
    cabecera = {
      type: "element",
      tagName: "tr",
      properties: {},
      children: etiquetas.map((t) => ({
        type: "element",
        tagName: "th",
        properties: {},
        children: [{ type: "text", value: t }],
      })),
    };
  }

  const modo: ModoTabla = irregular || !etiquetas ? "scroll" : "fichas";

  if (cabecera) {
    cabecera.properties = { ...cabecera.properties, dataCabecera: "1" };
    for (const c of celdasDe(cabecera)) {
      c.tagName = "th";
      c.properties = { ...c.properties, scope: "col" };
    }
  }

  if (modo === "fichas" && etiquetas) {
    for (const fila of cuerpo) {
      celdasDe(fila).forEach((celda, i) => {
        celda.properties = {
          ...celda.properties,
          dataLabel: etiquetas[i] ?? "",
          ...(i === 0 ? { dataTitulo: "1" } : {}),
          ...(vacia(celda) ? { dataVacia: "1" } : {}),
        };
      });
    }
  }

  tabla.properties = { ...tabla.properties, dataModo: modo };
  tabla.children = [
    ...(cabecera
      ? [{ type: "element", tagName: "thead", properties: {}, children: [cabecera] } as Element]
      : []),
    { type: "element", tagName: "tbody", properties: {}, children: cuerpo },
  ];

  return modo === "fichas" ? etiquetas : cabeceraAnterior;
}

export function rehypeTablasManual() {
  return (arbol: Root) => {
    let cabeceraAnterior: string[] | null = null;
    const recorrer = (nodo: Root | Element) => {
      for (const hijo of nodo.children) {
        if (!esElemento(hijo)) continue;
        if (hijo.tagName === "table") cabeceraAnterior = procesarTabla(hijo, cabeceraAnterior);
        else recorrer(hijo);
      }
    };
    recorrer(arbol);
  };
}
