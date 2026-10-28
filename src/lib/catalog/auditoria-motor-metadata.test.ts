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
