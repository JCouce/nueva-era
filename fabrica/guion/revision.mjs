#!/usr/bin/env node
// Revisión por script de un trabajo: revisar.mjs (tests, tsc, lint, push seguro) DENTRO del worktree y alcance.mjs.
// El resultado completo va a fabrica/trabajos/.revision-T-xxx.json (gitignored), que lee el juez; por stdout sale
// solo un resumen corto, para que el operario no tenga que copiar salidas largas.
// Uso: node fabrica/guion/revision.mjs <ruta-contrato> <worktree> --vuelta <n>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evidenciaAlcance, leerAlcance } from "./alcance.mjs";
import { ejecutar, esPrincipal, git, salir } from "./comun.mjs";
import { baseDe, leerFrontmatter } from "./contrato.mjs";

const REVISAR = fileURLToPath(new URL("../comprobaciones/revisar.mjs", import.meta.url));

export function rutaRevision(rutaContrato, id) {
  return path.join(path.dirname(rutaContrato), `.revision-${id}.json`);
}

// La salida de revisar.mjs --json es un objeto que ocupa varias líneas; se busca desde la primera `{` de línea.
export function parsearRevisar(stdout) {
  const i = stdout.search(/^\{/m);
  if (i === -1) return null;
  try {
    return JSON.parse(stdout.slice(i));
  } catch {
    return null;
  }
}

export function revisar(rutaContrato, worktree, vuelta) {
  const fm = leerFrontmatter(fs.readFileSync(rutaContrato, "utf8"));
  const { id, rama } = fm;
  const head = git(worktree, "rev-parse", rama).trim();
  // cwd = worktree: revisar.mjs corre npm test y tsc sobre el árbol en el que se ejecuta.
  const r = ejecutar("node", [REVISAR, "--base", baseDe(fm), "--head", rama, "--json"], { cwd: worktree });
  const salidaRevisar = parsearRevisar(r.stdout);
  let alcance;
  try {
    alcance = leerAlcance(rutaContrato, worktree);
    alcance.evidencia = evidenciaAlcance(alcance);
  } catch (error) {
    alcance = { estado: "falla", evidencia: `alcance.mjs no pudo comprobarlo: ${error.message}` };
  }
  const revision = {
    id,
    rama,
    head,
    vuelta,
    revisar: salidaRevisar ?? { error: `revisar.mjs no devolvió JSON (código ${r.codigo}): ${r.salida.trim().slice(-1500)}` },
    alcance,
  };
  const archivo = rutaRevision(rutaContrato, id);
  fs.writeFileSync(archivo, `${JSON.stringify(revision, null, 2)}\n`);
  return { archivo, revision };
}

export function resumirRevision(revision) {
  const resultados = revision.revisar?.resultados ?? [];
  return {
    head: revision.head,
    revisar: revision.revisar?.error ? "error" : resultados.map((r) => `${r.id}:${r.estado}`).join(" "),
    alcance: revision.alcance.estado,
    fuera: revision.alcance.fuera ?? [],
  };
}

if (esPrincipal(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const k = args.indexOf("--vuelta");
    const vuelta = k === -1 ? NaN : Number(args[k + 1]);
    const [contrato, worktree] = args.filter((_, i) => i !== k && i !== k + 1);
    if (!contrato || !worktree || !Number.isInteger(vuelta)) {
      throw new Error("uso: revision.mjs <ruta-contrato> <worktree> --vuelta <n>");
    }
    const { archivo, revision } = revisar(path.resolve(contrato), path.resolve(worktree), vuelta);
    salir({ ok: true, archivo, ...resumirRevision(revision) });
  } catch (error) {
    salir({ ok: false, error: error.message }, 1);
  }
}
