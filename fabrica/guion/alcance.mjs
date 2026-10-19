#!/usr/bin/env node
// Criterio C2 por código: lo que cambia la rama frente a main tiene que caber en "Puede tocar".
// Uso: node fabrica/guion/alcance.mjs <ruta-contrato> <worktree>
// Salida: {"estado":"pasa"|"falla","fuera":[...],"sinCommitear":[...],"cambiados":[...],"puedeTocar":[...]}
import fs from "node:fs";
import { esPrincipal, git, salir } from "./comun.mjs";
import { baseDe, leerFrontmatter, puedeTocar } from "./contrato.mjs";

// `**` cruza carpetas, `*` y `?` no. Sin comodines: ruta exacta, o carpeta si acaba en `/`.
export function globARegex(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      const barra = glob[i + 2] === "/";
      re += barra ? "(?:.*/)?" : ".*";
      i += barra ? 2 : 1;
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  if (glob.endsWith("/")) re += ".*";
  return new RegExp(`^${re}$`);
}

export function dentroDeAlcance(ruta, globs) {
  return globs.some((g) => globARegex(g.replace(/^\.\//, "")).test(ruta));
}

export function evaluarAlcance({ cambiados, globs, sinCommitear = [] }) {
  const fuera = cambiados.filter((r) => !dentroDeAlcance(r, globs));
  const estado = fuera.length || sinCommitear.length ? "falla" : "pasa";
  return { estado, fuera, sinCommitear, cambiados, puedeTocar: globs };
}

export function evidenciaAlcance(r) {
  if (r.estado === "pasa") return `${r.cambiados.length} archivos cambiados, todos dentro de "Puede tocar"`;
  const partes = [];
  if (r.fuera.length) partes.push(`fuera de "Puede tocar": ${r.fuera.join(", ")}`);
  if (r.sinCommitear.length) partes.push(`cambios sin commitear en el worktree: ${r.sinCommitear.join(", ")}`);
  return partes.join("; ");
}

export function leerAlcance(rutaContrato, worktree) {
  const texto = fs.readFileSync(rutaContrato, "utf8");
  const fm = leerFrontmatter(texto);
  const { rama } = fm;
  if (!rama) throw new Error("el contrato no tiene rama");
  // --no-renames: un renombrado cuenta como borrar el viejo y crear el nuevo, y los dos tienen que caber.
  const cambiados = git(worktree, "diff", "--name-only", "--no-renames", `${baseDe(fm)}...${rama}`).split("\n").filter(Boolean);
  const sinCommitear = git(worktree, "status", "--porcelain", "--untracked-files=all")
    .split("\n")
    .filter(Boolean)
    .map((l) => l.slice(3));
  return evaluarAlcance({ cambiados, globs: puedeTocar(texto), sinCommitear });
}

if (esPrincipal(import.meta.url)) {
  const [contrato, worktree] = process.argv.slice(2);
  try {
    if (!contrato || !worktree) throw new Error("uso: alcance.mjs <ruta-contrato> <worktree>");
    const r = leerAlcance(contrato, worktree);
    salir({ ...r, evidencia: evidenciaAlcance(r) });
  } catch (error) {
    salir({ estado: "falla", error: error.message, evidencia: `alcance.mjs no pudo comprobarlo: ${error.message}` }, 1);
  }
}
