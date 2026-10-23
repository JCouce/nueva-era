#!/usr/bin/env node
// Leer y escribir un contrato de la fábrica: frontmatter, "Puede tocar", tabla de Criterios y secciones.
// Lógica pura exportada; el CLI es lo mínimo que necesita el guion.
// Uso:
//   node fabrica/guion/contrato.mjs leer <ruta>
//   node fabrica/guion/contrato.mjs estado <ruta> <estado> [--desde <estado>[,<estado>...]] [--operario <fallos>/<llamadas>]
// Pasar a "construyendo" empieza un intento: borra las entregas del anterior (.revision, .votos, .obra; ver entregas.mjs).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { limpiarEntregas } from "./entregas.mjs";

export const ESTADOS = [
  "spec", "encolado", "inspeccion", "construyendo", "revision", "juicio",
  "contigo", "escalado", "hecho", "descartado",
];

// ---------- frontmatter ----------

function partirFrontmatter(texto) {
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) throw new Error("el contrato no tiene frontmatter (--- ... ---)");
  return { bloque: m[1], inicio: 4, fin: m[0].length };
}

export function leerFrontmatter(texto) {
  const { bloque } = partirFrontmatter(texto);
  const datos = {};
  for (const linea of bloque.split(/\r?\n/)) {
    const m = linea.match(/^([A-Za-z_][\w-]*):(.*)$/);
    if (!m) continue;
    datos[m[1]] = m[2].replace(/\s+#.*$/, "").trim();
  }
  return datos;
}

// Cambia el valor de un campo y deja el comentario de la línea (`# spec | encolado ...`) en su columna.
export function ponerCampo(texto, clave, valor) {
  const { bloque, fin } = partirFrontmatter(texto);
  const lineas = bloque.split("\n");
  const i = lineas.findIndex((l) => l.startsWith(`${clave}:`));
  if (i === -1) throw new Error(`el frontmatter no tiene el campo "${clave}"`);
  const original = lineas[i];
  const comentario = original.match(/(\s+)(#.*)$/);
  let nueva = `${clave}: ${valor}`;
  if (comentario) {
    const columna = original.length - comentario[2].length;
    nueva = `${nueva.padEnd(Math.max(columna, nueva.length + 1))}${comentario[2]}`;
  }
  lineas[i] = nueva;
  return `---\n${lineas.join("\n")}\n---\n${texto.slice(fin)}`;
}

// Como ponerCampo, pero si el campo no existe lo añade al final del frontmatter.
export function fijarCampo(texto, clave, valor) {
  const { bloque, fin } = partirFrontmatter(texto);
  if (bloque.split("\n").some((l) => l.startsWith(`${clave}:`))) return ponerCampo(texto, clave, valor);
  return `---\n${bloque}\n${clave}: ${valor}\n---\n${texto.slice(fin)}`;
}

export function quitarCampo(texto, clave) {
  const { bloque, fin } = partirFrontmatter(texto);
  const lineas = bloque.split("\n").filter((l) => !l.startsWith(`${clave}:`));
  return `---\n${lineas.join("\n")}\n---\n${texto.slice(fin)}`;
}

// ---------- secciones ----------

// Índices de las líneas `## Nombre` fuera de bloques de código.
function cabeceras(lineas) {
  const res = [];
  let enCodigo = false;
  lineas.forEach((l, i) => {
    if (/^\s*```/.test(l)) enCodigo = !enCodigo;
    else if (!enCodigo && /^## (?!#)/.test(l)) res.push({ i, nombre: l.slice(3).trim() });
  });
  return res;
}

function localizar(texto, nombre) {
  const lineas = texto.split("\n");
  const cabs = cabeceras(lineas);
  const k = cabs.findIndex((c) => c.nombre.toLowerCase() === nombre.toLowerCase());
  if (k === -1) throw new Error(`el contrato no tiene la sección "## ${nombre}"`);
  const desde = cabs[k].i + 1;
  const hasta = k + 1 < cabs.length ? cabs[k + 1].i : lineas.length;
  return { lineas, desde, hasta };
}

// Separa el comentario guía (`<!-- ... -->`) del principio de la sección, que se conserva siempre.
function separarGuia(cuerpo) {
  const m = cuerpo.match(/^(\s*<!--[\s\S]*?-->[ \t]*\n?)/);
  return m ? { guia: m[1].trim(), resto: cuerpo.slice(m[1].length) } : { guia: null, resto: cuerpo };
}

export function leerSeccion(texto, nombre) {
  const { lineas, desde, hasta } = localizar(texto, nombre);
  return separarGuia(lineas.slice(desde, hasta).join("\n")).resto.trim();
}

export function reemplazarSeccion(texto, nombre, cuerpo) {
  const { lineas, desde, hasta } = localizar(texto, nombre);
  const { guia } = separarGuia(lineas.slice(desde, hasta).join("\n"));
  const hayMas = hasta < lineas.length;
  const nuevo = [guia, cuerpo.trim()].filter(Boolean).join("\n");
  const bloque = nuevo ? [...nuevo.split("\n"), ...(hayMas ? [""] : [])] : hayMas ? [""] : [];
  const resultado = [...lineas.slice(0, desde), ...bloque, ...lineas.slice(hasta)].join("\n");
  return hayMas ? resultado : `${resultado.trimEnd()}\n`;
}

// Añade un bloque al final de la sección sin tocar lo que ya había (historial de vueltas).
export function anadirASeccion(texto, nombre, bloque) {
  const actual = leerSeccion(texto, nombre);
  return reemplazarSeccion(texto, nombre, actual ? `${actual}\n\n${bloque.trim()}` : bloque);
}

// ---------- Spec y Criterios ----------

export function puedeTocar(texto) {
  const lineas = leerSeccion(texto, "Spec").split("\n");
  const i = lineas.findIndex((l) => /^\*\*Puede tocar:?\*\*/i.test(l.trim()));
  if (i === -1) return [];
  const globs = [];
  let enPunto = false;
  for (const l of lineas.slice(i + 1)) {
    const t = l.trim();
    if (!t) continue;
    if (/^\*\*/.test(t)) break;
    const esPunto = t.startsWith("-") || t.startsWith("*");
    // Una línea sangrada justo tras un punto es su continuación (F-016: se comía las rutas de la segunda línea).
    const esContinuacion = !esPunto && enPunto && /^[ \t]/.test(l);
    if (!esPunto && !esContinuacion) break;
    enPunto = true;
    // Solo es ruta lo que parece ruta: `GrupoAccion` o `npm test` no.
    for (const m of t.matchAll(/`([^`]+)`/g)) if (!/\s/.test(m[1]) && /[/.*]/.test(m[1])) globs.push(m[1]);
  }
  return globs;
}

// Parte una fila de tabla por `|`, respetando `\|` y los `|` dentro de backticks.
export function celdas(fila) {
  const res = [];
  let actual = "";
  let enCodigo = false;
  const t = fila.trim().replace(/^\|/, "").replace(/\|$/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === "\\" && t[i + 1] === "|") { actual += "|"; i++; continue; }
    if (c === "`") enCodigo = !enCodigo;
    if (c === "|" && !enCodigo) { res.push(actual.trim()); actual = ""; continue; }
    actual += c;
  }
  res.push(actual.trim());
  return res;
}

export function criterios(texto) {
  const res = [];
  for (const l of leerSeccion(texto, "Criterios").split("\n")) {
    if (!l.trim().startsWith("|")) continue;
    const [id, que = "", oraculo = ""] = celdas(l);
    if (id === "#" || /^:?-+:?$/.test(id)) continue;
    // Una fila con otro id (C6b, c3…) no se puede saltar en silencio: nadie la comprobaría (F-010).
    if (!/^C\d+$/.test(id)) throw new Error(`criterio con id no válido: "${id}" (tiene que ser C<número>)`);
    if (!que) continue;
    res.push({ id, texto: que, oraculo });
  }
  return res;
}

// Commit del que sale la rama y contra el que se compara. Por defecto main; otro valor sirve para repetir un trabajo
// pasado (el estreno) desde el commit anterior a él.
export const baseDe = (fm) => fm.base || "main";

export function resumen(texto) {
  const fm = leerFrontmatter(texto);
  return {
    id: fm.id,
    estado: fm.estado,
    vueltas: fm.vueltas,
    rama: fm.rama,
    base: baseDe(fm),
    puedeTocar: puedeTocar(texto),
    criterios: criterios(texto),
  };
}

// Estados en los que la línea se para; desde ellos el cronómetro del visor deja de correr.
export const FINALES = ["contigo", "escalado", "spec"];

// Lo que el visor necesita y no se puede deducir del contrato: cuándo entró en la línea, cuándo paró y cómo va el
// operario. `ahora` es un ISO que pone quien llama (el guion no tiene reloj).
export function anotarMarcas(texto, { anterior, estado, ahora = null, operario = null }) {
  const fm = leerFrontmatter(texto);
  let t = texto;
  if (ahora && anterior === "encolado" && estado === "inspeccion") {
    if (!fm.inicio) t = fijarCampo(t, "inicio", ahora);
    if (fm.fin) t = quitarCampo(t, "fin");
  } else if (ahora && FINALES.includes(estado) && fm.inicio) {
    t = fijarCampo(t, "fin", ahora);
  }
  if (operario && /^\d+\/\d+$/.test(operario)) t = fijarCampo(t, "operario", operario);
  return t;
}

export function cambiarEstado(texto, estado, desde = null, { ahora = null, operario = null } = {}) {
  if (!ESTADOS.includes(estado)) throw new Error(`estado desconocido: ${estado}`);
  const anterior = leerFrontmatter(texto).estado;
  if (desde && !desde.includes(anterior)) {
    throw new Error(`el contrato está en "${anterior}" y este paso espera ${desde.map((d) => `"${d}"`).join(" o ")}`);
  }
  const nuevo = anotarMarcas(ponerCampo(texto, "estado", estado), { anterior, estado, ahora, operario });
  return { texto: nuevo, anterior };
}

// ---------- CLI ----------

function salir(objeto, codigo = 0) {
  console.log(JSON.stringify(objeto));
  process.exit(codigo);
}

function main(argv) {
  const [orden, ruta, ...resto] = argv;
  try {
    if (!ruta) throw new Error("uso: contrato.mjs leer|estado <ruta> ...");
    const texto = fs.readFileSync(ruta, "utf8");
    if (orden === "leer") salir({ ok: true, ...resumen(texto) });
    if (orden === "estado") {
      const estado = resto[0];
      const k = resto.indexOf("--desde");
      const desde = k === -1 ? null : String(resto[k + 1] ?? "").split(",").filter(Boolean);
      const o = resto.indexOf("--operario");
      const operario = o === -1 ? null : resto[o + 1];
      const r = cambiarEstado(texto, estado, desde, { ahora: new Date().toISOString(), operario });
      fs.writeFileSync(ruta, r.texto);
      if (estado === "construyendo") limpiarEntregas(path.resolve(ruta), leerFrontmatter(r.texto).id);
      // Salida corta: la copia el operario.
      const { id, vueltas, rama, base, criterios: cs } = resumen(r.texto);
      salir({ ok: true, anterior: r.anterior, estado, id, vueltas, rama, base, criterios: cs.map((c) => c.id) });
    }
    throw new Error(`orden desconocida: ${orden}`);
  } catch (error) {
    salir({ ok: false, error: error.message }, 1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
