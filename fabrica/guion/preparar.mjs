#!/usr/bin/env node
// Crea (o reutiliza) el worktree de un trabajo, fuera del repo: <padre>/<repo>-trabajos/T-xxx, con la rama del
// contrato. Lo deja listo para `npm test`, `npx tsc --noEmit` y `npx next dev` (con el .env del repo enlazado).
// Idempotente.
// Uso: node fabrica/guion/preparar.mjs <ruta-contrato>
// Salida: {"worktree":"...","rama":"...","creado":true|false,"nodeModules":"...","prisma":"...","env":"..."}
import fs from "node:fs";
import path from "node:path";
import { ejecutar, esPrincipal, git, raizPrincipal, salir } from "./comun.mjs";
import { leerFrontmatter } from "./contrato.mjs";

export function rutaWorktree(raiz, id) {
  return path.join(path.dirname(raiz), `${path.basename(raiz)}-trabajos`, id);
}

export function validarContrato({ id, rama }) {
  if (!/^T-\d{3,}$/.test(id ?? "")) throw new Error(`id de contrato no válido: "${id}" (se espera T-xxx)`);
  if (!rama || !rama.startsWith(`fabrica/${id}-`)) {
    throw new Error(`rama no válida: "${rama}" (se espera fabrica/${id}-<slug>)`);
  }
}

// `git worktree list --porcelain` → [{ ruta, rama }].
export function parsearWorktrees(texto) {
  return texto.split(/\n\n+/).filter(Boolean).map((bloque) => {
    const ruta = bloque.match(/^worktree (.+)$/m)?.[1] ?? null;
    const rama = bloque.match(/^branch refs\/heads\/(.+)$/m)?.[1] ?? null;
    return { ruta, rama };
  });
}

// Qué hacer según lo que ya hay. Devuelve { accion: "reutilizar"|"crear-rama"|"usar-rama" } o lanza.
export function planificar({ destino, rama, worktrees, existeRama, existeDestino }) {
  const aqui = worktrees.find((w) => w.ruta === destino);
  if (aqui) {
    if (aqui.rama !== rama) throw new Error(`${destino} ya es un worktree, pero de la rama ${aqui.rama}`);
    return { accion: "reutilizar" };
  }
  if (existeDestino) throw new Error(`${destino} existe y no es un worktree de este repo`);
  const otro = worktrees.find((w) => w.rama === rama);
  if (otro) throw new Error(`la rama ${rama} ya está en otro worktree: ${otro.ruta}`);
  return { accion: existeRama ? "usar-rama" : "crear-rama" };
}

// Turbopack no sigue un node_modules enlazado fuera de la raíz del proyecto ("Symlink ... points out of the
// filesystem root"), así que se clona con clonefile (APFS: copia instantánea que no ocupa disco). Si el disco no
// lo permite, se enlaza y `next dev` tendrá que ir con `--webpack`.
function prepararNodeModules(raiz, destino) {
  const dst = path.join(destino, "node_modules");
  if (fs.existsSync(dst)) return "ya estaba";
  const src = path.join(raiz, "node_modules");
  if (!fs.existsSync(src)) throw new Error(`no hay node_modules en ${raiz}: corre npm install allí`);
  if (ejecutar("cp", ["-cR", src, dst]).codigo === 0) return "clon";
  fs.symlinkSync(src, dst, "dir");
  return "enlace (next dev necesita --webpack)";
}

// `next dev` en el worktree necesita AUTH_SECRET y DATABASE_URL: se enlaza el .env del repo (nunca se copia ni se
// imprime). Salvaguarda: si apunta a producción (neon.tech), no se enlaza. El contenido solo se lee aquí, en proceso.
export function decidirEnv({ existeDestino, existeOrigen, contenido }) {
  if (existeDestino) return { enlazar: false, env: "ya estaba" };
  if (!existeOrigen) return { enlazar: false, env: "sin enlazar: el repo no tiene .env (next dev no tendrá AUTH_SECRET ni BD)" };
  if (/neon\.tech/i.test(contenido ?? "")) {
    return { enlazar: false, env: "sin enlazar: el .env del repo apunta a neon.tech (producción); arréglalo a mano" };
  }
  return { enlazar: true, env: "enlazado" };
}

export function prepararEnv(raiz, destino) {
  const origen = path.join(raiz, ".env");
  const dst = path.join(destino, ".env");
  let existeDestino = true;
  try { fs.lstatSync(dst); } catch { existeDestino = false; }
  const existeOrigen = fs.existsSync(origen);
  const contenido = !existeDestino && existeOrigen ? fs.readFileSync(origen, "utf8") : "";
  const { enlazar, env } = decidirEnv({ existeDestino, existeOrigen, contenido });
  if (enlazar) fs.symlinkSync(origen, dst);
  return env;
}

// El cliente se genera en src/generated (gitignored). `prisma generate` no necesita el .env ni toca la BD.
function prepararPrisma(destino) {
  if (fs.existsSync(path.join(destino, "src/generated/prisma/client.ts"))) return "ya estaba";
  const r = ejecutar("npx", ["prisma", "generate"], { cwd: destino });
  if (r.codigo !== 0) throw new Error(`prisma generate falló en ${destino}:\n${r.salida.trim().split("\n").slice(-10).join("\n")}`);
  return "generado";
}

export function preparar(rutaContrato) {
  const { id, rama } = leerFrontmatter(fs.readFileSync(rutaContrato, "utf8"));
  validarContrato({ id, rama });
  const raiz = raizPrincipal(path.dirname(path.resolve(rutaContrato)));
  const destino = rutaWorktree(raiz, id);
  const worktrees = parsearWorktrees(git(raiz, "worktree", "list", "--porcelain"));
  const existeRama = ejecutar("git", ["-C", raiz, "rev-parse", "--verify", "--quiet", `refs/heads/${rama}`]).codigo === 0;
  const { accion } = planificar({ destino, rama, worktrees, existeRama, existeDestino: fs.existsSync(destino) });

  if (accion !== "reutilizar") {
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    if (accion === "crear-rama") git(raiz, "worktree", "add", "-b", rama, destino, "main");
    else git(raiz, "worktree", "add", destino, rama);
  }
  return {
    worktree: destino,
    rama,
    creado: accion !== "reutilizar",
    ramaNueva: accion === "crear-rama",
    nodeModules: prepararNodeModules(raiz, destino),
    prisma: prepararPrisma(destino),
    env: prepararEnv(raiz, destino),
  };
}

if (esPrincipal(import.meta.url)) {
  try {
    const [contrato] = process.argv.slice(2);
    if (!contrato) throw new Error("uso: preparar.mjs <ruta-contrato>");
    salir({ ok: true, ...preparar(contrato) });
  } catch (error) {
    salir({ ok: false, error: error.message }, 1);
  }
}
