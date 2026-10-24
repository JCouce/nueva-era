import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { listarDocumentos, leerDocumento } from "./documentos";
import { analizarDocumento, type AnclasDocumento } from "./apartados";
import {
  casar,
  elementosDelCatalogo,
  resolverReferencias,
  tituloDeAncla,
  EXCEPCIONES,
  type ClaveManual,
} from "./referencias";
import { montarManualFicha } from "./paraFicha";

const documentos = new Map<string, AnclasDocumento>();

before(async () => {
  for (const { slug } of await listarDocumentos()) {
    const doc = await leerDocumento(slug);
    if (doc) documentos.set(slug, analizarDocumento(doc));
  }
});

describe("casar (puro)", () => {
  const doc = {
    encabezados: [
      { id: "escudo-deflector-nivel-1-4", texto: "Escudo Deflector (Nivel 1-4)" },
      { id: "burla-coste-2", texto: "Burla (Coste 2)" },
      { id: "burla", texto: "Burla" },
    ],
    filas: [
      { id: "mosquito", base: "mosquito", titulo: "Mosquito" },
      { id: "escudo", base: "escudo", titulo: "Escudo" },
    ],
  };

  test("encabezado exacto antes que por prefijo", () => {
    assert.equal(casar("Burla", doc)?.ancla, "burla");
  });
  test("por prefijo: «Burla (Coste 2)», «Escudo Deflector (Nivel 1-4)»", () => {
    assert.equal(casar("Escudo Deflector", doc)?.ancla, "escudo-deflector-nivel-1-4");
  });
  test("fila de tabla", () => {
    assert.deepEqual(casar("Mosquito", doc), { ancla: "mosquito", titulo: "Mosquito" });
  });
  test("sin nada → null", () => {
    assert.equal(casar("Hipercognición", doc), null);
  });
  test("una excepción manda sobre el casado automático; null lo suprime", () => {
    const elementos = [
      { clave: "equipo:a" as const, label: "Escudo", documentos: ["d"] },
      { clave: "equipo:b" as const, label: "Mosquito", documentos: ["d"] },
    ];
    const r = resolverReferencias(elementos, new Map([["d", doc]]), {
      "equipo:a": { documento: "d", ancla: "escudo" },
      "equipo:b": null,
    });
    assert.equal(r.get("equipo:a")?.ancla, "escudo");
    assert.equal(r.has("equipo:b"), false);
  });
});

describe("contra los documentos de hoy (docs/fuente)", () => {
  test("toda excepción apunta a un elemento del catálogo y a un ancla que existe", () => {
    const claves = new Set(elementosDelCatalogo().map((e) => e.clave));
    for (const [clave, ex] of Object.entries(EXCEPCIONES)) {
      assert.ok(claves.has(clave as ClaveManual), `${clave}: no está en el catálogo`);
      if (!ex) continue;
      const doc = documentos.get(ex.documento);
      assert.ok(doc, `${clave}: no hay documento ${ex.documento}`);
      assert.notEqual(tituloDeAncla(doc, ex.ancla), null, `${clave}: no hay ancla ${ex.documento}#${ex.ancla}`);
    }
  });

  test("las claves del catálogo no se repiten", () => {
    const claves = elementosDelCatalogo().map((e) => e.clave);
    assert.equal(new Set(claves).size, claves.length);
  });

  test("casado automático representativo", () => {
    const { indice } = montarManualFicha(documentos);
    const esperado: [ClaveManual, string, string][] = [
      ["dote:dote_burla", "dotes", "burla-coste-2"],
      ["equipo:pistola_mosquito", "equipamiento", "mosquito"],
      ["equipo:armadura_ligera", "equipamiento", "armadura-ligera"],
      ["equipo:camuflaje_trifasico", "equipamiento", "camuflaje-trifasico-nivel-1-4"],
      ["equipo:municion_especial_perforante", "equipamiento", "municion-perforante"],
      ["equipo:aum_ojo_bionico", "aumentos", "ojo-bionico-nivel-1-4"],
      ["especie:riux", "especies", "riux"],
      ["disciplina:resonancia", "psionica", "resonancia"],
      ["habilidad:atletismo", "habilidades", "atletismo"],
    ];
    for (const [clave, slug, ancla] of esperado) {
      assert.deepEqual(
        indice[clave] && { slug: indice[clave].slug, ancla: indice[clave].ancla },
        { slug, ancla },
        clave,
      );
    }
  });

  test("encabezado sin cuerpo → sin referencia (Interpretación)", () => {
    const { indice } = montarManualFicha(documentos);
    assert.equal(indice["habilidad:interpretacion"], undefined);
  });

  // Informativo: nunca falla. Que falte una referencia no es un error.
  test("cobertura (informativo)", (t) => {
    const { indice, apartados } = montarManualFicha(documentos);
    const porTipo = new Map<string, { con: number; total: number; sin: string[] }>();
    for (const e of elementosDelCatalogo()) {
      const tipo = `${e.clave.split(":")[0]}→${e.documentos.join(",")}`;
      const fila = porTipo.get(tipo) ?? { con: 0, total: 0, sin: [] };
      fila.total++;
      if (indice[e.clave]) fila.con++;
      else fila.sin.push(e.label);
      porTipo.set(tipo, fila);
    }
    for (const [tipo, { con, total, sin }] of porTipo) {
      t.diagnostic(`${tipo}: ${con}/${total}${sin.length ? ` — sin referencia: ${sin.join(", ")}` : ""}`);
    }
    const bytes = Object.entries(apartados).map(([s, a]) => `${s} ${JSON.stringify(a).length} B`);
    t.diagnostic(`apartados por documento: ${bytes.join(", ")}`);
    t.diagnostic(`índice: ${JSON.stringify(indice).length} B`);
  });
});
