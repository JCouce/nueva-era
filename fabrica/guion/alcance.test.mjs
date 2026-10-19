import { test } from "node:test";
import assert from "node:assert/strict";
import { dentroDeAlcance, evaluarAlcance, evidenciaAlcance, globARegex } from "./alcance.mjs";

test("ruta exacta", () => {
  assert.equal(dentroDeAlcance("docs/tareas.md", ["docs/tareas.md"]), true);
  assert.equal(dentroDeAlcance("docs/tareas.md.bak", ["docs/tareas.md"]), false);
  assert.equal(dentroDeAlcance("docs/sistema.md", ["docs/tareas.md"]), false);
});

test("* no cruza carpetas", () => {
  assert.equal(dentroDeAlcance("src/lib/rules/combate.test.ts", ["src/lib/rules/*.test.ts"]), true);
  assert.equal(dentroDeAlcance("src/lib/rules/x/combate.test.ts", ["src/lib/rules/*.test.ts"]), false);
});

test("** cruza carpetas, también cero", () => {
  assert.equal(dentroDeAlcance("src/app/a/b/page.tsx", ["src/app/**"]), true);
  assert.equal(dentroDeAlcance("src/lib/x.test.ts", ["src/**/*.test.ts"]), true);
  assert.equal(dentroDeAlcance("src/a/b/x.test.ts", ["src/**/*.test.ts"]), true);
  assert.equal(dentroDeAlcance("srcx/x.test.ts", ["src/**/*.test.ts"]), false);
});

test("carpeta con barra final", () => {
  assert.equal(dentroDeAlcance("src/components/hud/Card.tsx", ["src/components/"]), true);
  assert.equal(dentroDeAlcance("src/componentsX.tsx", ["src/components/"]), false);
});

test("los puntos y prefijo ./ no son comodines", () => {
  assert.equal(globARegex("a.ts").test("abts"), false);
  assert.equal(dentroDeAlcance("a.ts", ["./a.ts"]), true);
});

test("evaluarAlcance: pasa, fuera y sin commitear", () => {
  const globs = ["src/lib/rules/combate.ts", "docs/tareas.md"];
  const ok = evaluarAlcance({ cambiados: ["docs/tareas.md"], globs });
  assert.equal(ok.estado, "pasa");
  assert.match(evidenciaAlcance(ok), /1 archivos/);

  const mal = evaluarAlcance({ cambiados: ["docs/tareas.md", "prisma/schema.prisma"], globs });
  assert.equal(mal.estado, "falla");
  assert.deepEqual(mal.fuera, ["prisma/schema.prisma"]);
  assert.match(evidenciaAlcance(mal), /schema\.prisma/);

  const sucio = evaluarAlcance({ cambiados: [], globs, sinCommitear: ["src/x.ts"] });
  assert.equal(sucio.estado, "falla");
  assert.match(evidenciaAlcance(sucio), /sin commitear/);
});

test("sin 'Puede tocar', todo está fuera", () => {
  assert.deepEqual(evaluarAlcance({ cambiados: ["a"], globs: [] }).fuera, ["a"]);
});
