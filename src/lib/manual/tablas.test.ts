import { test } from "node:test";
import assert from "node:assert/strict";
import type { Element, ElementContent, Root } from "hast";
import { rehypeTablasManual } from "./tablas";

const el = (tagName: string, children: ElementContent[] = [], properties = {}): Element => ({
  type: "element",
  tagName,
  properties,
  children,
});
const txt = (value: string): ElementContent => ({ type: "text", value });
const fila = (...celdas: Element[]) => el("tr", celdas);
const td = (t: string, props = {}) => el("td", [txt(t)], props);
const tdFuerte = (t: string) => el("td", [el("strong", [txt(t)])]);

function procesar(...tablas: Element[]): Element[] {
  const arbol: Root = { type: "root", children: tablas };
  rehypeTablasManual()(arbol);
  return tablas;
}

const celdas = (t: Element, parte: "thead" | "tbody") => {
  const seccion = t.children.find((c): c is Element => c.type === "element" && c.tagName === parte);
  return (seccion?.children ?? []).map((f) => (f as Element).children as Element[]);
};

test("cabecera con <td><strong>: fichas, th en thead y data-label en las celdas", () => {
  const [t] = procesar(
    el("table", [el("tbody", [fila(tdFuerte("Modelo"), tdFuerte("Daño")), fila(tdFuerte("Pistola"), td(""))])]),
  );
  assert.equal(t.properties.dataModo, "fichas");
  assert.deepEqual(celdas(t, "thead")[0].map((c) => c.tagName), ["th", "th"]);
  const [titulo, dato] = celdas(t, "tbody")[0];
  assert.equal(titulo.properties.dataLabel, "Modelo");
  assert.equal(titulo.properties.dataTitulo, "1");
  assert.equal(dato.properties.dataLabel, "Daño");
  assert.equal(dato.properties.dataVacia, "1");
});

test("filas vacías (cabecera vacía de las tablas de tuberías) se descartan", () => {
  const [t] = procesar(
    el("table", [
      el("thead", [fila(el("th", []), el("th", []))]),
      el("tbody", [fila(tdFuerte("A"), tdFuerte("B")), fila(td("1"), td("2"))]),
    ]),
  );
  assert.equal(t.properties.dataModo, "fichas");
  assert.equal(celdas(t, "tbody").length, 1);
});

test("colspan o filas de distinto ancho → scroll", () => {
  const [a, b] = procesar(
    el("table", [fila(tdFuerte("A"), tdFuerte("B")), fila(td("1", { colSpan: 2 }))]),
    el("table", [fila(tdFuerte("A"), tdFuerte("B")), fila(td("1"), td("2"), td("3"))]),
  );
  assert.equal(a.properties.dataModo, "scroll");
  assert.equal(b.properties.dataModo, "scroll");
});

test("tabla sin cabecera tras otra del mismo ancho hereda su cabecera", () => {
  const [, t, u] = procesar(
    el("table", [fila(tdFuerte("Modelo"), tdFuerte("Blindaje")), fila(tdFuerte("Ropa"), td("1"))]),
    el("table", [fila(tdFuerte("Ultra"), td("4"))]),
    el("table", [fila(tdFuerte("X"), td("4"), td("5"))]),
  );
  assert.equal(t.properties.dataModo, "fichas");
  assert.equal(celdas(t, "tbody")[0][1].properties.dataLabel, "Blindaje");
  assert.equal(u.properties.dataModo, "scroll");
});
