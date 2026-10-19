import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { decidirEnv, parsearWorktrees, planificar, prepararEnv, rutaWorktree, validarContrato } from "./preparar.mjs";

test("el worktree va fuera del repo, en <repo>-trabajos/T-xxx", () => {
  assert.equal(rutaWorktree("/a/rol/nuevaEra", "T-007"), "/a/rol/nuevaEra-trabajos/T-007");
});

test("validarContrato exige id T-xxx y rama fabrica/T-xxx-slug", () => {
  assert.doesNotThrow(() => validarContrato({ id: "T-001", rama: "fabrica/T-001-algo" }));
  assert.throws(() => validarContrato({ id: "T-xxx", rama: "fabrica/T-xxx-algo" }), /id/);
  assert.throws(() => validarContrato({ id: "T-001", rama: "main" }), /rama/);
  assert.throws(() => validarContrato({ id: "T-001", rama: "fabrica/T-002-otro" }), /rama/);
});

const porcelana = `worktree /a/nuevaEra
HEAD abc
branch refs/heads/main

worktree /a/nuevaEra-trabajos/T-001
HEAD def
branch refs/heads/fabrica/T-001-x

worktree /a/suelto
HEAD 123
detached
`;

test("parsearWorktrees", () => {
  assert.deepEqual(parsearWorktrees(porcelana), [
    { ruta: "/a/nuevaEra", rama: "main" },
    { ruta: "/a/nuevaEra-trabajos/T-001", rama: "fabrica/T-001-x" },
    { ruta: "/a/suelto", rama: null },
  ]);
});

const worktrees = parsearWorktrees(porcelana);
const base = { worktrees, existeRama: false, existeDestino: false };

test("planificar: worktree ya creado con su rama → reutilizar", () => {
  const p = planificar({ ...base, destino: "/a/nuevaEra-trabajos/T-001", rama: "fabrica/T-001-x", existeRama: true, existeDestino: true });
  assert.equal(p.accion, "reutilizar");
});

test("planificar: worktree de otra rama → error", () => {
  assert.throws(() => planificar({ ...base, destino: "/a/nuevaEra-trabajos/T-001", rama: "fabrica/T-001-y" }), /de la rama/);
});

test("planificar: rama nueva o rama existente (vuelta 2)", () => {
  assert.equal(planificar({ ...base, destino: "/a/nuevaEra-trabajos/T-002", rama: "fabrica/T-002-z" }).accion, "crear-rama");
  assert.equal(planificar({ ...base, destino: "/a/nuevaEra-trabajos/T-002", rama: "fabrica/T-002-z", existeRama: true }).accion, "usar-rama");
});

test("planificar: carpeta ocupada o rama en otro worktree → error", () => {
  assert.throws(() => planificar({ ...base, destino: "/a/x", rama: "fabrica/T-002-z", existeDestino: true }), /no es un worktree/);
  assert.throws(() => planificar({ ...base, destino: "/a/x", rama: "fabrica/T-001-x", existeRama: true }), /otro worktree/);
});

test("decidirEnv: enlaza solo si hay .env, no hay ya uno y no apunta a neon.tech", () => {
  assert.deepEqual(decidirEnv({ existeDestino: true, existeOrigen: true, contenido: "" }), { enlazar: false, env: "ya estaba" });
  assert.equal(decidirEnv({ existeDestino: false, existeOrigen: false }).enlazar, false);
  assert.match(decidirEnv({ existeDestino: false, existeOrigen: false }).env, /no tiene \.env/);
  const prod = decidirEnv({ existeDestino: false, existeOrigen: true, contenido: "DATABASE_URL=postgres://u@ep-x.NEON.tech/db" });
  assert.equal(prod.enlazar, false);
  assert.match(prod.env, /neon\.tech/);
  assert.doesNotMatch(prod.env, /postgres:/);
  assert.deepEqual(decidirEnv({ existeDestino: false, existeOrigen: true, contenido: "DATABASE_URL=postgres://localhost:5433/x" }), { enlazar: true, env: "enlazado" });
});

test("prepararEnv con un .env falso: enlaza, es idempotente, y no enlaza uno de producción", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fabrica-env-"));
  const repo = path.join(tmp, "repo");
  const wt = path.join(tmp, "wt");
  fs.mkdirSync(repo);
  fs.mkdirSync(wt);
  fs.writeFileSync(path.join(repo, ".env"), "AUTH_SECRET=falso\nDATABASE_URL=postgres://localhost:5433/x\n");
  assert.equal(prepararEnv(repo, wt), "enlazado");
  assert.equal(fs.readlinkSync(path.join(wt, ".env")), path.join(repo, ".env"));
  assert.equal(prepararEnv(repo, wt), "ya estaba");

  const wt2 = path.join(tmp, "wt2");
  fs.mkdirSync(wt2);
  fs.writeFileSync(path.join(repo, ".env"), "DATABASE_URL=postgres://u@ep-x.neon.tech/db\n");
  assert.match(prepararEnv(repo, wt2), /neon\.tech/);
  assert.equal(fs.existsSync(path.join(wt2, ".env")), false);

  const wt3 = path.join(tmp, "wt3");
  fs.mkdirSync(wt3);
  assert.match(prepararEnv(path.join(tmp, "sin-env"), wt3), /no tiene \.env/);
});
