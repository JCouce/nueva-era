import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { cerrar, leerDecision, mensajeCierre } from "./cerrar.mjs";
import { leerFrontmatter } from "./contrato.mjs";

const contrato = (decision, estado = "contigo") => `---
id: T-005
titulo: El selector se llama Modo de ataque
estado: ${estado}            # spec | encolado | ... | hecho | descartado
vueltas: 0/2
rama: fabrica/T-005-modo
---

## Juicio
### Intento 1 · contigo

## Decisión
<!-- usuario · aprobado | descartado | pide cambios, y por qué -->
${decision}

## Métricas y retro
| vueltas |
`;

test("leerDecision", () => {
  assert.equal(leerDecision(contrato("aprobado: queda bien")), "aprobado");
  assert.equal(leerDecision(contrato("**Descartado** — no hacía falta")), "descartado");
  assert.equal(leerDecision(contrato("Pide cambios: el texto")), "pide cambios");
  assert.equal(leerDecision(contrato("")), null);
  assert.equal(leerDecision(contrato("aprobadísimo")), null);
  assert.equal(leerDecision(contrato("creo que aprobado")), null);
});

test("mensajeCierre", () => {
  assert.equal(mensajeCierre({ id: "T-005", titulo: "X" }, "aprobado"), "docs(fabrica): T-005 X (aprobado)");
});

const git = (cwd, ...args) => execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8" });

function repoTemporal() {
  const raiz = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "fabrica-cerrar-")));
  git(raiz, "init", "-q", "-b", "main");
  git(raiz, "config", "user.email", "t@t");
  git(raiz, "config", "user.name", "t");
  git(raiz, "config", "commit.gpgsign", "false");
  fs.writeFileSync(path.join(raiz, "a.txt"), "a\n");
  git(raiz, "add", "a.txt");
  git(raiz, "commit", "-qm", "inicio");
  fs.mkdirSync(path.join(raiz, "fabrica/trabajos"), { recursive: true });
  return raiz;
}

test("aprobado: pasa a hecho y commitea solo el contrato, aunque haya otras cosas en el índice", () => {
  const raiz = repoTemporal();
  const ruta = path.join(raiz, "fabrica/trabajos/T-005-modo.md");
  fs.writeFileSync(ruta, contrato("aprobado"));
  fs.writeFileSync(path.join(raiz, "a.txt"), "cambio ajeno\n");
  git(raiz, "add", "a.txt");

  const r = cerrar(ruta);
  assert.equal(r.decision, "aprobado");
  assert.equal(r.estado, "hecho");
  assert.ok(r.commit);
  assert.equal(leerFrontmatter(fs.readFileSync(ruta, "utf8")).estado, "hecho");
  assert.equal(git(raiz, "log", "-1", "--format=%s"), "docs(fabrica): T-005 El selector se llama Modo de ataque (aprobado)\n");
  assert.equal(git(raiz, "show", "--name-only", "--format=", "HEAD").trim(), "fabrica/trabajos/T-005-modo.md");
  assert.equal(git(raiz, "diff", "--cached", "--name-only").trim(), "a.txt");

  assert.equal(cerrar(ruta).commit, null, "repetir el cierre no commitea otra vez");
});

test("descartado desde escalado: pasa a descartado", () => {
  const raiz = repoTemporal();
  const ruta = path.join(raiz, "fabrica/trabajos/T-005-modo.md");
  fs.writeFileSync(ruta, contrato("descartado: no compensa", "escalado"));
  assert.equal(cerrar(ruta).estado, "descartado");
  assert.match(git(raiz, "log", "-1", "--format=%s"), /\(descartado\)/);
});

test("pide cambios: no toca ni commitea nada", () => {
  const raiz = repoTemporal();
  const ruta = path.join(raiz, "fabrica/trabajos/T-005-modo.md");
  const texto = contrato("pide cambios: otra etiqueta");
  fs.writeFileSync(ruta, texto);
  const r = cerrar(ruta);
  assert.equal(r.commit, null);
  assert.match(r.siguiente, /trabajo nuevo/);
  assert.equal(fs.readFileSync(ruta, "utf8"), texto);
  assert.equal(git(raiz, "log", "--format=%s").trim(), "inicio");
});

test("Decisión vacía, estado no cerrable o fuera de main → error sin commitear", () => {
  const raiz = repoTemporal();
  const ruta = path.join(raiz, "fabrica/trabajos/T-005-modo.md");
  fs.writeFileSync(ruta, contrato(""));
  assert.throws(() => cerrar(ruta), /Decisión está vacía/);
  fs.writeFileSync(ruta, contrato("aprobado", "construyendo"));
  assert.throws(() => cerrar(ruta), /está en "construyendo"/);
  git(raiz, "checkout", "-qb", "otra");
  fs.writeFileSync(ruta, contrato("aprobado"));
  assert.throws(() => cerrar(ruta), /rama otra/);
  assert.equal(git(raiz, "log", "--format=%s").trim(), "inicio");
});
