import { test } from "node:test";
import assert from "node:assert/strict";
import { decidir } from "./bloqueos.mjs";

const cwd = "/repo";
const bash = (command, agent_type) => ({ tool_name: "Bash", tool_input: { command }, agent_type, cwd });
const archivo = (tool_name, file_path, agent_type) => ({ tool_name, tool_input: { file_path }, agent_type, cwd });
const bloquea = (entrada) => decidir(entrada, { cwd }).bloquear;

test("sin agent_type, git push pasa (sesión del usuario)", () => {
  assert.equal(bloquea(bash("git push origin main")), false);
});

test("agent_type ajeno a la fábrica (Explore), git push pasa", () => {
  assert.equal(bloquea(bash("git push origin main", "Explore")), false);
});

test("fabrica-constructor: git push bloquea, npm test pasa", () => {
  const r = decidir(bash("git push origin x", "fabrica-constructor"), { cwd });
  assert.equal(r.bloquear, true);
  assert.match(r.motivo, /push/);
  assert.equal(bloquea(bash("npm test", "fabrica-constructor")), false);
});

test("fabrica-constructor: prisma migrate y compañía bloquean", () => {
  for (const c of [
    "npx prisma migrate dev",
    "npx prisma db push",
    "git -C ../wt push",
    "git remote -v",
    "npm run seed-npcs",
    "npm run db:migrate",
    "npm run build",
    "npm run make-master -- a@b.c",
    "node --import ./scripts/test-resolver.mjs scripts/reset-fichas-especies.ts --aplicar",
    "DATABASE_URL=postgres://x npm test",
    "cat .env",
    "cat ./.env.produccion",
  ]) {
    assert.equal(bloquea(bash(c, "fabrica-constructor")), true, c);
  }
});

test("fabrica-constructor: comandos legítimos pasan", () => {
  for (const c of [
    "npx tsc --noEmit",
    "npm run lint",
    "git log --oneline -5",
    "git commit -m 'feat(x): push de la ficha T-001'",
    `node -e "console.log(process.env.HOME)"`,
    "npx next dev -p 3101",
    "cat .envrc.ejemplo-que-no-existe",
  ]) {
    assert.equal(bloquea(bash(c, "fabrica-constructor")), false, c);
  }
});

test("fabrica-constructor: Read de .env bloquea", () => {
  assert.equal(bloquea(archivo("Read", ".env", "fabrica-constructor")), true);
  assert.equal(bloquea(archivo("Read", "/repo/.env.produccion", "fabrica-constructor")), true);
  assert.equal(bloquea(archivo("Read", "/repo/src/lib/env.ts", "fabrica-constructor")), false);
});

test("fabrica-revisor: Edit en src/ bloquea, en fabrica/trabajos/ pasa", () => {
  assert.equal(bloquea(archivo("Edit", "src/x.ts", "fabrica-revisor")), true);
  assert.equal(bloquea(archivo("Edit", "fabrica/trabajos/T-001.md", "fabrica-revisor")), false);
  assert.equal(bloquea(archivo("Edit", "/repo/fabrica/trabajos/T-001.md", "fabrica-revisor")), false);
  assert.equal(bloquea(archivo("Write", "fabrica/trabajos/../../src/x.ts", "fabrica-revisor")), true);
  assert.equal(bloquea(archivo("Read", "src/x.ts", "fabrica-revisor")), false);
});

test("fabrica-inspector: misma jaula que el revisor; el constructor no la tiene", () => {
  assert.equal(bloquea(archivo("Edit", "docs/tareas.md", "fabrica-inspector")), true);
  assert.equal(bloquea(archivo("Edit", "docs/tareas.md", "fabrica-constructor")), false);
});

test("Grep y Glob: no se buscan .env", () => {
  const c = (tool_name, tool_input) => decidir({ agent_type: "fabrica-constructor", tool_name, tool_input }).bloquear;
  assert.equal(c("Grep", { pattern: "SECRET", path: ".env" }), true);
  assert.equal(c("Grep", { pattern: "x", glob: ".env*" }), true);
  assert.equal(c("Glob", { pattern: "**/.env.produccion" }), true);
  assert.equal(c("Grep", { pattern: "process.env", path: "src" }), false);
  assert.equal(c("Glob", { pattern: "src/**/*.ts" }), false);
});
