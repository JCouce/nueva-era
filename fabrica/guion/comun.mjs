// Utilidades de los scripts del guion: ejecutar comandos y sacar una línea de JSON por stdout.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function ejecutar(cmd, args, opciones = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...opciones });
  return {
    codigo: r.status ?? 1,
    stdout: r.stdout ?? "",
    salida: `${r.stdout ?? ""}${r.stderr ?? ""}`,
    error: r.error,
  };
}

export function git(cwd, ...args) {
  const r = ejecutar("git", ["-C", cwd, ...args]);
  if (r.codigo !== 0) throw new Error(`git ${args.join(" ")}: ${r.salida.trim()}`);
  return r.stdout;
}

// Raíz del árbol principal (no la de un worktree), a partir de cualquier ruta dentro del repo.
export function raizPrincipal(desde) {
  const comun = git(desde, "rev-parse", "--path-format=absolute", "--git-common-dir").trim();
  return path.dirname(comun);
}

// Los scripts del guion acaban siempre con UNA línea de JSON: es lo que el operario copia y el guion parsea.
export function salir(objeto, codigo = 0) {
  console.log(JSON.stringify(objeto));
  process.exit(codigo);
}

export function esPrincipal(metaUrl) {
  return Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(metaUrl);
}
