import { test } from "node:test";
import assert from "node:assert/strict";
import { comprobarBd, comprobarFicha, comprobarProd, operacionesDestructivas } from "./pushSeguro.mjs";

const sheet = (v) => `export const SCHEMA_VERSION = ${v};\n`;
const paso = (d, h) => `  {\n    desde: ${d},\n    hasta: ${h},\n    descripcion: "x",\n  },\n`;
const migraciones = (...pasos) => `export const MIGRACIONES = [\n${pasos.map(([d, h]) => paso(d, h)).join("")}];\n`;

test("ficha: sube versión con su paso → pasa", () => {
  const [r] = comprobarFicha({ sheetBase: sheet(16), sheetHead: sheet(17), migracionesHead: migraciones([15, 16], [16, 17]) });
  assert.equal(r.estado, "pasa");
});

test("ficha: sube versión sin paso → falla", () => {
  const [r] = comprobarFicha({ sheetBase: sheet(16), sheetHead: sheet(17), migracionesHead: migraciones([15, 16]) });
  assert.equal(r.estado, "falla");
  assert.match(r.detalle, /16→17/);
});

test("ficha: salta 2 versiones con un solo paso → falla con el que falta", () => {
  const [r] = comprobarFicha({ sheetBase: sheet(16), sheetHead: sheet(18), migracionesHead: migraciones([16, 17]) });
  assert.equal(r.estado, "falla");
  assert.match(r.detalle, /17→18/);
  assert.doesNotMatch(r.detalle, /16→17/);
});

test("ficha: baja versión → falla", () => {
  const [r] = comprobarFicha({ sheetBase: sheet(17), sheetHead: sheet(16), migracionesHead: migraciones([16, 17]) });
  assert.equal(r.estado, "falla");
});

test("ficha: misma versión → no aplica", () => {
  const [r] = comprobarFicha({ sheetBase: sheet(17), sheetHead: sheet(17), migracionesHead: "" });
  assert.equal(r.estado, "no aplica");
});

test("bd: schema sin migración → falla", () => {
  const [r] = comprobarBd({ cambios: [{ estado: "M", ruta: "prisma/schema.prisma" }] });
  assert.equal(r.estado, "falla");
});

test("bd: schema con migración aditiva → pasa", () => {
  const carpeta = "20261016000000_x";
  const [r] = comprobarBd({
    cambios: [
      { estado: "M", ruta: "prisma/schema.prisma" },
      { estado: "A", ruta: `prisma/migrations/${carpeta}/migration.sql` },
    ],
    sqlPorCarpeta: { [carpeta]: '-- AlterTable\nALTER TABLE "Character" ADD COLUMN "x" JSONB;\n' },
  });
  assert.equal(r.estado, "pasa");
  assert.match(r.detalle, new RegExp(carpeta));
});

test("bd: migración con DROP COLUMN → falla avisando de Neon", () => {
  const carpeta = "20261016000000_quitar";
  const [r] = comprobarBd({
    cambios: [
      { estado: "M", ruta: "prisma/schema.prisma" },
      { estado: "A", ruta: `prisma/migrations/${carpeta}/migration.sql` },
    ],
    sqlPorCarpeta: { [carpeta]: 'ALTER TABLE "NpcTemplate" DROP COLUMN "pgBase",\nADD COLUMN "ficha" JSONB;\n' },
  });
  assert.equal(r.estado, "falla");
  assert.match(r.detalle, /NEON/);
  assert.match(r.detalle, /DROP COLUMN/);
});

test("bd: DROP CONSTRAINT y comentarios de Prisma no cuentan como pérdida de datos", () => {
  const sql = '-- DropForeignKey\nALTER TABLE "A" DROP CONSTRAINT "A_b_fkey";\n-- DropTable lo dice el comentario\n';
  assert.deepEqual(operacionesDestructivas(sql), []);
  assert.deepEqual(operacionesDestructivas('ALTER TABLE "A" ADD COLUMN "c" INT, DROP "d";'), ["ALTER TABLE ... DROP"]);
  assert.deepEqual(operacionesDestructivas("TRUNCATE \"A\";"), ["TRUNCATE"]);
});

test("prod: script con neon.tech añadido → aviso", () => {
  const diff = "--- a/scripts/x.mjs\n+++ b/scripts/x.mjs\n@@ -1 +1,2 @@\n const a = 1;\n+const url = 'postgres://u:p@ep-x.neon.tech/db';\n";
  const [r] = comprobarProd({ diffs: { "scripts/x.mjs": diff } });
  assert.equal(r.estado, "aviso");
  assert.match(r.detalle, /neon\.tech/);
});

test("prod: script con neon.tech eliminado → pasa", () => {
  const diff = "--- a/scripts/x.mjs\n+++ b/scripts/x.mjs\n@@ -1,2 +1 @@\n const a = 1;\n-const url = 'postgres://u:p@ep-x.neon.tech/db';\n";
  const [r] = comprobarProd({ diffs: { "scripts/x.mjs": diff } });
  assert.equal(r.estado, "pasa");
});

test("prod: DATABASE_URL= literal avisa, el marcador de la documentación no", () => {
  const diff = (l) => `+++ b/package.json\n+${l}\n`;
  assert.equal(comprobarProd({ diffs: { "package.json": diff('"x": "DATABASE_URL=postgres://h/db node a"') } })[0].estado, "aviso");
  assert.equal(comprobarProd({ diffs: { "package.json": diff("// DATABASE_URL=<la de Neon> npm run x") } })[0].estado, "pasa");
  assert.equal(comprobarProd({ diffs: { "src/x.ts": diff("neon.tech") } })[0].estado, "pasa");
});
