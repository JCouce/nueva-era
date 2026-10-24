import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { prepararDocumento, slugificar } from "./encabezados";

const textos = (md: string, titulo?: string) =>
  prepararDocumento(md, { titulo }).encabezados.map((e) => `h${e.nivel} ${e.texto}`);

describe("slugificar", () => {
  test("quita tildes y signos", () => {
    assert.equal(slugificar("Humor Negro (Coste 4)"), "humor-negro-coste-4");
    assert.equal(slugificar("Psiónica"), "psionica");
    assert.equal(slugificar("¡!"), "seccion");
  });
});

describe("prepararDocumento", () => {
  test("quita la línea de comentario del sync", () => {
    const { markdown } = prepararDocumento("<!-- Generado por x. -->\n\nHola\n");
    assert.equal(markdown, "Hola\n");
  });

  test("párrafo solo en negrita con salto final es encabezado", () => {
    assert.deepEqual(textos("**Burla (Coste 2)**\\\nRequisito: Humor 1\\\nTexto."), [
      "h3 Burla (Coste 2)",
    ]);
  });

  test("tolera el salto metido dentro del cierre (`Texto\\**`)", () => {
    const r = prepararDocumento("**Humor Negro (Coste 4)\\**\nRequisito: Humor 2\\\nCuerpo.");
    assert.deepEqual(
      r.encabezados.map((e) => e.texto),
      ["Humor Negro (Coste 4)"],
    );
    assert.ok(r.markdown.includes('<h3 id="humor-negro-coste-4">Humor Negro (Coste 4)</h3>'));
    assert.ok(!r.markdown.includes("\\**"));
  });

  test("negrita partida en varias líneas: un encabezado por línea, agrupadores en h2", () => {
    const md = "**Dotes\\\n\\\nActitud\\\n\\\nApoyo (Coste 2)\\**\nRequisito: Empatía 1\\\nCuerpo.";
    assert.deepEqual(textos(md), ["h2 Dotes", "h2 Actitud", "h3 Apoyo (Coste 2)"]);
  });

  test("descarta el primer encabezado si repite el título", () => {
    const md = "**Dotes\\\n\\\nActitud\\\n\\\nApoyo (Coste 2)\\**\nCuerpo.";
    assert.deepEqual(textos(md, "Dotes"), ["h2 Actitud", "h3 Apoyo (Coste 2)"]);
  });

  test("negrita anidada de pandoc (`****X**\\**`)", () => {
    assert.deepEqual(textos("****Componentes de la Ficha**\\**\n\nNombre:\\\nEdad:"), [
      "h3 Componentes de la Ficha",
    ]);
  });

  test("respeta los # reales, recortados a h2–h4", () => {
    assert.deepEqual(textos("# Uno\n\n##### 1. Distancia\n\ncuerpo"), [
      "h2 Uno",
      "h4 1. Distancia",
    ]);
  });

  test("no convierte negritas mezcladas con texto normal", () => {
    assert.deepEqual(textos("**· Lingüística:** Estudio de las lenguas.\\\nOtra línea."), []);
    assert.deepEqual(textos("Haz una prueba de **expresión + humor** con dificultad 7."), []);
  });

  test("descarta frases de cuerpo, líneas de dato y viñetas", () => {
    assert.deepEqual(textos("**Además, gana una segunda reacción.**\\\nTexto"), []);
    assert.deepEqual(textos("**Requisito: Humor 1, Carácter 1**\\\nTexto"), []);
    assert.deepEqual(textos("**Objeto Extraño: 25000 créditos**\n"), []);
    assert.deepEqual(textos("**· Modelo Fuerte**\\\nTexto"), []);
    assert.deepEqual(textos(`**${"palabra ".repeat(20)}**\n`), []);
  });

  test("quita los dos puntos finales del texto del encabezado", () => {
    assert.deepEqual(textos("**Básicos:\\**\n\\\n· Fuerza\\\n· Agilidad"), ["h3 Básicos"]);
  });

  test("ids estables y desambiguados", () => {
    const r = prepararDocumento("**Nivel 1**\\\na\n\n**Nivel 1**\\\nb\n\n**Nivel 1**\\\nc");
    assert.deepEqual(
      r.encabezados.map((e) => e.id),
      ["nivel-1", "nivel-1-2", "nivel-1-3"],
    );
  });

  test("limpia los saltos duros que cierran un bloque y las líneas que solo eran `\\`", () => {
    const { markdown } = prepararDocumento("Línea uno\\\nLínea dos\\\n\\\nOtro párrafo.\\\n");
    assert.equal(markdown, "Línea uno\\\nLínea dos\n\nOtro párrafo.\n");
  });

  test("cierra la cursiva que pandoc deja en la línea siguiente (`\\*`)", () => {
    const { markdown } = prepararDocumento("*Requisito: Resonancia Nivel 2.\\\n\\*\nCuerpo.");
    assert.equal(markdown, "*Requisito: Resonancia Nivel 2.*\n\nCuerpo.\n");
  });

  test("deja intactas las tablas HTML y las de tuberías", () => {
    const tabla = "<table>\n<tr>\n<td><strong>A</strong></td>\n</tr>\n</table>";
    const tuberias = "| **A** | **B** |\n|---|---|\n| 1 | 2 |";
    const { markdown, encabezados } = prepararDocumento(`${tabla}\n\n${tuberias}\n`);
    assert.equal(encabezados.length, 0);
    assert.ok(markdown.includes(tabla));
    assert.ok(markdown.includes(tuberias));
  });

  test("apertura que pandoc deja al final de la línea anterior (`texto.**\\`)", () => {
    const md = "en lugar de **expresión**.**\\\n\\\nAtletismo**\\\n**\\\nPaso Defensivo (Coste 2)**\\\nRequisito: Atletismo 1";
    const r = prepararDocumento(md);
    assert.deepEqual(
      r.encabezados.map((e) => `h${e.nivel} ${e.texto}`),
      ["h2 Atletismo", "h3 Paso Defensivo (Coste 2)"],
    );
    assert.ok(r.markdown.startsWith("en lugar de **expresión**.\n"));
  });

  test("cierre que reabre en el mismo punto (`X*****\\`)", () => {
    const md = "***Aumentos\\\n\\**\n**Ingeniería Genética*****\\\n\\\nMielinización Central \\\n\\**\nCuerpo.";
    assert.deepEqual(textos(md), ["h2 Aumentos", "h2 Ingeniería Genética", "h3 Mielinización Central"]);
  });

  test("`****` a mitad de línea es una negrita vacía", () => {
    const md = "Requisito: Gran Puntería, ****Combate a Distancia 2\\\nSe puede emplear una reacción.";
    assert.equal(
      prepararDocumento(md).markdown,
      "Requisito: Gran Puntería, Combate a Distancia 2\\\nSe puede emplear una reacción.\n",
    );
  });

  test("separa la negrita que acaba en puntuación pegada a una letra", () => {
    assert.equal(
      prepararDocumento("**Muerte:**Se produce cuando").markdown,
      "**Muerte:** Se produce cuando\n",
    );
  });

  test("quita el salto duro antes de un elemento de lista", () => {
    assert.equal(
      prepararDocumento("- **Mecánica:** Acción.\\\n- **Limitación:** Otra.").markdown,
      "- **Mecánica:** Acción.\n- **Limitación:** Otra.\n",
    );
  });

  test("escapa el HTML del texto del encabezado", () => {
    const { markdown } = prepararDocumento("**A <b> & C**\n\ncuerpo");
    assert.ok(markdown.includes(">A &lt;b&gt; &amp; C</h3>"));
  });
});
