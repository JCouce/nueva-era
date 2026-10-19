#!/usr/bin/env node
// Revisión por script de la fábrica: tests, tsc, lint y push seguro sobre un rango base...head.
// Uso: node fabrica/comprobaciones/revisar.mjs [--base <ref>] [--head <ref>] [--solo-diff] [--json]
import { spawnSync } from "node:child_process";
import {
  RUTA_MIGRACIONES,
  RUTA_SHEET,
  comprobarBd,
  comprobarFicha,
  comprobarProd,
  migracionesNuevas,
  rutaVigiladaProd,
} from "./pushSeguro.mjs";

const LINEAS_COLA = 20;

function leerArgs(argv) {
  const opciones = { base: null, head: "HEAD", soloDiff: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--base") opciones.base = argv[++i];
    else if (a === "--head") opciones.head = argv[++i];
    else if (a === "--solo-diff") opciones.soloDiff = true;
    else if (a === "--json") opciones.json = true;
    else {
      console.error(`Opción desconocida: ${a}`);
      process.exit(2);
    }
  }
  if (opciones.base === undefined || opciones.head === undefined) {
    console.error("--base y --head necesitan una ref");
    process.exit(2);
  }
  return opciones;
}

function ejecutar(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { codigo: r.status ?? 1, salida: `${r.stdout ?? ""}${r.stderr ?? ""}`, error: r.error };
}

function git(...args) {
  const r = ejecutar("git", args);
  if (r.codigo !== 0) throw new Error(`git ${args.join(" ")}: ${r.salida.trim()}`);
  return r.salida;
}

function existeRef(ref) {
  return ejecutar("git", ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]).codigo === 0;
}

function mostrar(ref, ruta) {
  const r = ejecutar("git", ["show", `${ref}:${ruta}`]);
  return r.codigo === 0 ? r.salida : null;
}

function cola(texto) {
  return texto.trimEnd().split("\n").slice(-LINEAS_COLA).join("\n");
}

function leerCambios(base, head) {
  return git("diff", "--name-status", `${base}...${head}`)
    .split("\n")
    .filter(Boolean)
    .map((linea) => {
      const partes = linea.split("\t");
      return { estado: partes[0], ruta: partes[partes.length - 1] };
    });
}

function comprobacionEjecucion(id, cmd, args, etiqueta = `${cmd} ${args.join(" ")}`) {
  const r = ejecutar(cmd, args);
  if (r.error) return { id, estado: "falla", detalle: `no se pudo ejecutar ${cmd}: ${r.error.message}` };
  if (r.codigo === 0) return { id, estado: "pasa", detalle: etiqueta };
  return { id, estado: "falla", detalle: `${etiqueta} → código ${r.codigo}\n${cola(r.salida)}` };
}

function comprobacionesEjecucion(cambios) {
  const resultados = [
    comprobacionEjecucion("tests", "npm", ["test"]),
    comprobacionEjecucion("tsc", "npx", ["tsc", "--noEmit"]),
  ];
  const lintables = cambios
    .filter((c) => !c.estado.startsWith("D") && c.ruta.startsWith("src/") && /\.(ts|tsx|mjs)$/.test(c.ruta))
    .map((c) => c.ruta);
  resultados.push(
    lintables.length
      ? comprobacionEjecucion("lint", "npx", ["eslint", ...lintables], `npx eslint (${lintables.length} archivos de src/)`)
      : { id: "lint", estado: "no aplica", detalle: "ningún .ts/.tsx/.mjs de src/ cambiado en el rango" },
  );
  return resultados;
}

function comprobacionesDiff(base, head, cambios) {
  const rutas = new Set(cambios.map((c) => c.ruta));
  const ficha = rutas.has(RUTA_SHEET)
    ? comprobarFicha({
        sheetBase: mostrar(base, RUTA_SHEET),
        sheetHead: mostrar(head, RUTA_SHEET),
        migracionesHead: mostrar(head, RUTA_MIGRACIONES),
      })
    : [{ id: "ficha", estado: "no aplica", detalle: "sheet.ts no cambia" }];

  const migraciones = migracionesNuevas(cambios).map((carpeta) => ({
    carpeta,
    sql: mostrar(head, `prisma/migrations/${carpeta}/migration.sql`) ?? "",
  }));
  const bd = comprobarBd({
    cambios,
    sqlPorCarpeta: Object.fromEntries(migraciones.map((m) => [m.carpeta, m.sql])),
  });

  const diffs = {};
  for (const c of cambios) {
    if (rutaVigiladaProd(c.ruta)) diffs[c.ruta] = git("diff", `${base}...${head}`, "--", c.ruta);
  }
  const prod = comprobarProd({ diffs });

  return { resultados: [...ficha, ...bd, ...prod], migraciones };
}

function tabla(resultados) {
  const filas = resultados.map((r) => [r.id, r.estado, r.detalle.split("\n")[0]]);
  const ancho = [0, 1].map((i) => Math.max(...filas.map((f) => f[i].length), i ? 6 : 12));
  const pad = (s, n) => s + " ".repeat(n - s.length);
  return [
    `${pad("comprobación", ancho[0])}  ${pad("estado", ancho[1])}  detalle`,
    ...filas.map((f) => `${pad(f[0], ancho[0])}  ${pad(f[1], ancho[1])}  ${f[2]}`),
  ].join("\n");
}

function main() {
  const opciones = leerArgs(process.argv.slice(2));
  const base = opciones.base ?? (existeRef("origin/main") ? "origin/main" : "main");
  const head = opciones.head;
  for (const ref of [base, head]) {
    if (!existeRef(ref)) {
      console.error(`No existe la ref ${ref}`);
      process.exit(2);
    }
  }

  const cambios = leerCambios(base, head);
  const ejecucion = opciones.soloDiff ? [] : comprobacionesEjecucion(cambios);
  const { resultados: diff, migraciones } = comprobacionesDiff(base, head, cambios);
  const resultados = [...ejecucion, ...diff];
  const ok = !resultados.some((r) => r.estado === "falla");

  if (opciones.json) {
    console.log(JSON.stringify({ base, head, soloDiff: opciones.soloDiff, ok, resultados, migraciones }, null, 2));
  } else {
    console.log(`Revisión ${base}...${head}${opciones.soloDiff ? " (solo diff)" : ""}  ·  ${cambios.length} archivos\n`);
    console.log(tabla(resultados));
    for (const r of resultados) {
      if (r.estado === "falla" && r.detalle.includes("\n")) console.log(`\n--- ${r.id} ---\n${r.detalle}`);
    }
    for (const m of migraciones) console.log(`\n--- SQL ${m.carpeta} ---\n${m.sql.trimEnd()}`);
    console.log(`\n${ok ? "OK: nada falla." : "FALLA: hay comprobaciones en rojo."}`);
  }
  process.exit(ok ? 0 : 1);
}

main();
