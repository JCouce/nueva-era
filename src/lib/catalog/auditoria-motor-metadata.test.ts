import { test } from "node:test";
import assert from "node:assert/strict";
import { FAMILIAS, extraerItems } from "../../../scripts/workflows/auditoria-motor-metadata-extraer";

// El extractor de la auditoría MotorMetadata (scripts/workflows/): cada familia saca items con
// prosa, y --ids filtra.
test("cada familia de la auditoría saca al menos un item con prosa", () => {
  for (const familia of FAMILIAS) {
    const { items } = extraerItems({ familias: [familia] });
    assert.ok(items.length > 0, `${familia}: sin items`);
    const conProsa = items.filter((i) => i.detalle.some((d) => d.trim() !== ""));
    assert.ok(conProsa.length > 0, `${familia}: ningún item con prosa`);
  }
});

test("--ids se queda con esos ítems: piezaId, piezaId#nivel e id base con elección", () => {
  const ids = ["aum_ojo_bionico#2", "aum_brazo_bionico", "psi_singularidad_impulso", "manduk/ilkrem/atributos"];
  const { items, porFamilia } = extraerItems({ familias: FAMILIAS, ids });
  const claves = items.map((i) => `${i.piezaId}#${i.nivel}`);
  assert.ok(claves.includes("aum_ojo_bionico#2"));
  assert.ok(!claves.includes("aum_ojo_bionico#1"));
  assert.ok(claves.includes("aum_brazo_bionico#1") && claves.some((c) => c.startsWith("aum_brazo_bionico:")));
  assert.ok(claves.includes("psi_singularidad_impulso#null"));
  assert.ok(claves.includes("manduk/ilkrem/atributos#null"));
  assert.equal(porFamilia.equipo, 0);
  assert.equal(porFamilia.dote, 0);
  assert.ok(items.every((i) => ids.some((id) => i.piezaId.startsWith(id.split("#")[0]))));
});

// P5 del triaje 2026-10-28: lo que la app pone fuera de la ficha resuelta sale en `otros`, para
// que el auditor no lo dé por ausente.
test("aumentos: armadura natural, reducePenalizador con aplicados, defensa del MQE, Densificar y salvaciones de activables", () => {
  const otros = (id: string, nivel: number | null = null) =>
    (extraerItems({ familias: ["aumento"], ids: [id] }).items.find((i) => i.nivel === nivel)?.otros ?? []).join("\n");
  assert.match(otros("aum_integridad_osteotendinosa"), /^armaduraNatural \(blindaje\.ts/m);
  assert.match(otros("aum_neurogenesis_hipocampal"), /^reducePenalizador con aplicados .*"aplicados":\["perspicacia","voluntad","expresion"\]/m);
  assert.match(otros("aum_microprocesador_cuantico_de_enlace", 3), /^defensaIntrusion .*"dificultad":15/m);
  assert.match(otros("aum_enjambre_nanobot", 3), /^blindajeReactivo .*"etiqueta":"Densificar"/m);
  assert.doesNotMatch(otros("aum_enjambre_nanobot", 2), /blindajeReactivo/);
  assert.match(otros("aum_neuroprotesis_simpatica", 1), /^\[activable encendido\] salvación en el selector «Contra…».*"bono":-1/m);
});

test("aumentos con elección: la nota dice que el motor es de la operación entera", () => {
  const { items } = extraerItems({ familias: ["aumento"], ids: ["aum_introgresion_sensorial_heterologa", "aum_integridad_osteotendinosa"] });
  const opciones = items.filter((i) => i.piezaId.startsWith("aum_introgresion_sensorial_heterologa:"));
  assert.ok(opciones.length > 1);
  for (const i of opciones) assert.match(i.fuenteProsa ?? "", /es el de la operación «Introgresión Sensorial Heteróloga» entero/);
  assert.equal(items.find((i) => i.piezaId === "aum_integridad_osteotendinosa")?.fuenteProsa, undefined);
});

test("poderes: tiradas del objetivo por opción con su dificultad y la nota de cambia.resultados", () => {
  const [modulacion] = extraerItems({ familias: ["poder"], ids: ["psi_induccion_modulacion"] }).items;
  const otros = (modulacion.otros ?? []).join("\n");
  // Miedo: 5 + nivel, resuelto a nivel 6.
  assert.match(otros, /^con «Efecto: Miedo», el objetivo tira \(texto, nivel 6\): .*paro cardíaco","dificultad":11/m);
  assert.match(otros, /^con «Efecto: Miedo»: cambia\.resultados SUSTITUYE/m);
  const [estab] = extraerItems({ familias: ["poder"], ids: ["psi_induccion_estabilizacion"] }).items;
  assert.match((estab.otros ?? []).join("\n"), /Bonificador a una salvación»: cambia\.resultados SUSTITUYE.*sin «critico», un éxito crítico enseña el texto de éxito/);
});
