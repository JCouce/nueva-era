#!/usr/bin/env node
// Cierra un trabajo: lo ejecuta el Jefe después de escribir con el usuario la sección Decisión.
//   aprobado → estado "hecho"; descartado → "descartado"; y commitea SOLO el contrato en main.
//   pide cambios → no toca nada: hay que rehacer el contrato o abrir un trabajo nuevo.
// La rama del trabajo lleva solo código; el contrato vive y se commitea en main, aquí.
// Uso: node fabrica/guion/cerrar.mjs <ruta-contrato>
import fs from "node:fs";
import path from "node:path";
import { esPrincipal, git, salir } from "./comun.mjs";
import { cambiarEstado, leerFrontmatter, leerSeccion } from "./contrato.mjs";

const ESTADO_FINAL = { aprobado: "hecho", descartado: "descartado" };
// Se puede cerrar lo que la línea entregó o escaló; repetir el cierre no cambia nada.
const DESDE = ["contigo", "escalado", "hecho", "descartado"];

// Primera línea con texto de la sección Decisión: "aprobado", "descartado" o "pide cambios" (con o sin negrita).
export function leerDecision(texto) {
  const primera = leerSeccion(texto, "Decisión").split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  const m = primera.toLowerCase().match(/^[*_\s]*(aprobado|descartado|pide cambios)(?![\p{L}\d])/u);
  return m ? m[1] : null;
}

export function mensajeCierre({ id, titulo }, decision) {
  return `docs(fabrica): ${id} ${titulo} (${decision})`;
}

export function cerrar(rutaContrato) {
  const ruta = path.resolve(rutaContrato);
  const texto = fs.readFileSync(ruta, "utf8");
  const fm = leerFrontmatter(texto);
  const decision = leerDecision(texto);
  if (!decision) {
    throw new Error('la sección Decisión está vacía o no empieza por "aprobado", "descartado" o "pide cambios"');
  }
  if (decision === "pide cambios") {
    return { decision, estado: fm.estado, commit: null, siguiente: "rehacer el contrato con el usuario o abrir un trabajo nuevo" };
  }

  const dir = path.dirname(ruta);
  const raiz = git(dir, "rev-parse", "--show-toplevel").trim();
  const rama = git(raiz, "rev-parse", "--abbrev-ref", "HEAD").trim();
  if (rama !== "main") throw new Error(`el árbol del contrato está en la rama ${rama}; el cierre se commitea en main`);

  const { texto: nuevo } = cambiarEstado(texto, ESTADO_FINAL[decision], DESDE);
  fs.writeFileSync(ruta, nuevo);
  const relativa = path.relative(raiz, ruta);
  if (!git(raiz, "status", "--porcelain", "--", relativa).trim()) {
    return { decision, estado: ESTADO_FINAL[decision], commit: null, ruta: relativa };
  }
  git(raiz, "add", "--", relativa);
  // --only: entra solo este archivo, aunque haya otras cosas en el índice.
  git(raiz, "commit", "--only", "-m", mensajeCierre(fm, decision), "--", relativa);
  return { decision, estado: ESTADO_FINAL[decision], commit: git(raiz, "rev-parse", "--short", "HEAD").trim(), ruta: relativa };
}

if (esPrincipal(import.meta.url)) {
  try {
    const [contrato] = process.argv.slice(2);
    if (!contrato) throw new Error("uso: cerrar.mjs <ruta-contrato>");
    salir({ ok: true, ...cerrar(contrato) });
  } catch (error) {
    salir({ ok: false, error: error.message }, 1);
  }
}
