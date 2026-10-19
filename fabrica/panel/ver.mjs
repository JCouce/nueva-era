#!/usr/bin/env node
// Visor de terminal de un trabajo de la fábrica. Ábrelo en un split de Ghostty mientras corre la línea.
// Uso: npm run fabrica:ver [-- <ruta-contrato | T-xxx>] [--una-vez] [--ancho <n>]
//   Sin contrato: el activo (encolado…juicio) modificado más recientemente; si no hay, el último modificado.
//   --una-vez: pinta una vez, sin control de pantalla, y sale (tests, o para pegarlo en un chat).
//   q o Ctrl+C para salir. Respeta NO_COLOR.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { leerFrontmatter } from "../guion/contrato.mjs";
import { rutaRevision } from "../guion/revision.mjs";
import { ACTIVOS, dibujar } from "./dibujo.mjs";

const TRABAJOS = fileURLToPath(new URL("../trabajos/", import.meta.url));
const TICK_MS = 120;
const DEBOUNCE_MS = 60;

function contratos() {
  return fs
    .readdirSync(TRABAJOS)
    .filter((f) => /^T-\d{3,}.*\.md$/.test(f))
    .map((f) => {
      const ruta = path.join(TRABAJOS, f);
      return { ruta, mtime: fs.statSync(ruta).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

function estadoDe(ruta) {
  try {
    return leerFrontmatter(fs.readFileSync(ruta, "utf8")).estado;
  } catch {
    return null;
  }
}

function elegir(arg) {
  if (arg) {
    if (/^T-\d{3,}$/i.test(arg)) {
      const id = arg.toUpperCase();
      const c = contratos().find((x) => path.basename(x.ruta).startsWith(`${id}-`) || path.basename(x.ruta) === `${id}.md`);
      if (!c) throw new Error(`no hay contrato ${id} en ${TRABAJOS}`);
      return c.ruta;
    }
    return path.resolve(arg);
  }
  const todos = contratos();
  if (!todos.length) throw new Error(`no hay contratos en ${TRABAJOS}`);
  return (todos.find((c) => ACTIVOS.includes(estadoDe(c.ruta))) ?? todos[0]).ruta;
}

function leerJson(ruta) {
  try {
    return JSON.parse(fs.readFileSync(ruta, "utf8"));
  } catch {
    return null;
  }
}

function cargar(ruta) {
  const texto = fs.readFileSync(ruta, "utf8");
  const { id } = leerFrontmatter(texto);
  return { texto, revision: id ? leerJson(rutaRevision(ruta, id)) : null };
}

function pintar(ruta, datos, { ancho, color, cuadro, pie }) {
  try {
    return dibujar({ ...datos, ahora: Date.now(), ancho, color, cuadro, pie });
  } catch (error) {
    return [` No puedo pintar ${path.basename(ruta)}: ${error.message}`];
  }
}

function parsearArgs(argv) {
  const opts = { unaVez: false, ancho: null, contrato: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--una-vez") opts.unaVez = true;
    else if (a === "--ancho") opts.ancho = Number(argv[++i]);
    else if (!a.startsWith("--")) opts.contrato = a;
    else throw new Error(`opción desconocida: ${a}`);
  }
  if (opts.ancho !== null && !(opts.ancho > 0)) throw new Error("--ancho tiene que ser un número");
  return opts;
}

function unaVez(opts) {
  const ruta = elegir(opts.contrato);
  const color = !process.env.NO_COLOR && process.stdout.isTTY;
  const ancho = opts.ancho ?? process.stdout.columns ?? 80;
  process.stdout.write(`${pintar(ruta, cargar(ruta), { ancho, color, cuadro: 0 }).join("\n")}\n`);
}

function vivo(opts) {
  const out = process.stdout;
  const entrada = process.stdin;
  const color = !process.env.NO_COLOR;
  let ruta = elegir(opts.contrato);
  let datos = null;
  let error = null;
  let cuadro = 0;
  let anterior = "";
  let restaurado = false;
  let debounce = null;

  const recargar = () => {
    try {
      if (!opts.contrato) ruta = elegir(null);
      datos = cargar(ruta);
      error = null;
    } catch (e) {
      error = e.message;
    }
  };

  const redibujar = () => {
    const ancho = opts.ancho ?? out.columns ?? 80;
    const alto = out.rows ?? 24;
    const pie = `q para salir · ${path.relative(process.cwd(), ruta)}`;
    const lineas = error || !datos ? [` ${error ?? "cargando…"}`] : pintar(ruta, datos, { ancho, color, cuadro, pie });
    const marco = `\x1b[H${lineas.slice(0, alto).map((l) => `${l}\x1b[K`).join("\r\n")}\x1b[J`;
    if (marco !== anterior) out.write(marco);
    anterior = marco;
  };

  // Todos los caminos de salida pasan por aquí: q, Ctrl+C (en raw llega como \x03), señales, excepción y exit.
  const restaurar = () => {
    if (restaurado) return;
    restaurado = true;
    try {
      if (entrada.isTTY) entrada.setRawMode(false);
    } catch { /* la terminal ya no está */ }
    out.write("\x1b[0m\x1b[?25h\x1b[?1049l");
  };
  const salir = (codigo = 0) => {
    restaurar();
    process.exit(codigo);
  };

  // fs.watch del directorio (el contrato se reescribe entero y el JSON de revisión se crea de nuevo), con debounce,
  // y una relectura cada segundo por si el watch se pierde algo. Va antes de tocar la pantalla: si falla, se ve.
  fs.watch(TRABAJOS, () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      recargar();
      redibujar();
    }, DEBOUNCE_MS);
  });

  process.on("exit", restaurar);
  for (const s of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(s, () => salir(0));
  process.on("uncaughtException", (e) => {
    restaurar();
    console.error(e);
    process.exit(1);
  });

  out.write("\x1b[?1049h\x1b[?25l\x1b[H\x1b[2J");
  if (entrada.isTTY) {
    entrada.setRawMode(true);
    entrada.resume();
    entrada.setEncoding("utf8");
    entrada.on("data", (k) => {
      if (k === "q" || k === "Q" || k === "\x03" || k === "\x04") salir(0);
    });
  }

  out.on("resize", () => {
    anterior = "";
    out.write("\x1b[2J");
    redibujar();
  });

  setInterval(recargar, 1000);
  setInterval(() => {
    cuadro++;
    redibujar();
  }, TICK_MS);

  recargar();
  redibujar();
}

try {
  const opts = parsearArgs(process.argv.slice(2));
  if (opts.unaVez || !process.stdout.isTTY) unaVez(opts);
  else vivo(opts);
} catch (error) {
  console.error(`fabrica:ver: ${error.message}`);
  process.exit(1);
}
