// Reglas de "push seguro". Lógica pura: recibe textos y diffs ya leídos, no ejecuta git.
// Cada regla devuelve una lista de { id, estado: "pasa"|"falla"|"aviso"|"no aplica", detalle }.

export const RUTA_SHEET = "src/lib/rules/sheet.ts";
export const RUTA_MIGRACIONES = "src/lib/rules/migraciones.ts";
export const RUTA_SCHEMA = "prisma/schema.prisma";
const PREFIJO_MIGRACIONES_BD = "prisma/migrations/";

const resultado = (id, estado, detalle) => ({ id, estado, detalle });

// ---------- ficha ----------

export function versionDeSheet(texto) {
  if (typeof texto !== "string") return null;
  const m = texto.match(/export\s+const\s+SCHEMA_VERSION\s*=\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

export function pasosDeMigracion(texto) {
  const pasos = new Set();
  if (typeof texto !== "string") return pasos;
  for (const m of texto.matchAll(/desde:\s*(\d+)\s*,\s*hasta:\s*(\d+)/g)) {
    pasos.add(`${m[1]}>${m[2]}`);
  }
  return pasos;
}

export function comprobarFicha({ sheetBase, sheetHead, migracionesHead }) {
  const id = "ficha";
  const antes = versionDeSheet(sheetBase);
  const despues = versionDeSheet(sheetHead);
  if (despues === null) {
    return [resultado(id, sheetHead == null ? "no aplica" : "aviso",
      sheetHead == null ? `${RUTA_SHEET} no existe en la cabeza` : "no encuentro SCHEMA_VERSION en la cabeza")];
  }
  if (antes === null) {
    return [resultado(id, "aviso", `no encuentro SCHEMA_VERSION en la base (cabeza: ${despues})`)];
  }
  if (antes === despues) return [resultado(id, "no aplica", `SCHEMA_VERSION sigue en ${despues}`)];
  if (despues < antes) {
    return [resultado(id, "falla", `SCHEMA_VERSION baja de ${antes} a ${despues}: las fichas guardadas quedarían por delante del código`)];
  }
  const pasos = pasosDeMigracion(migracionesHead);
  const faltan = [];
  for (let v = antes; v < despues; v++) if (!pasos.has(`${v}>${v + 1}`)) faltan.push(`${v}→${v + 1}`);
  if (faltan.length) {
    return [resultado(id, "falla", `SCHEMA_VERSION ${antes}→${despues} sin paso en ${RUTA_MIGRACIONES}: falta ${faltan.join(", ")}`)];
  }
  return [resultado(id, "pasa", `SCHEMA_VERSION ${antes}→${despues}, con paso en migraciones.ts`)];
}

// ---------- bd ----------

// `cambios`: [{ estado: "A"|"M"|"D"|"R"..., ruta }] tal como sale de `git diff --name-status`.
export function migracionesNuevas(cambios) {
  const carpetas = new Set();
  for (const { estado, ruta } of cambios) {
    if (!estado.startsWith("A") && !estado.startsWith("R") && !estado.startsWith("C")) continue;
    if (!ruta.startsWith(PREFIJO_MIGRACIONES_BD)) continue;
    const carpeta = ruta.slice(PREFIJO_MIGRACIONES_BD.length).split("/")[0];
    if (carpeta && ruta.split("/").length > 3) carpetas.add(carpeta);
  }
  return [...carpetas].sort();
}

const DESTRUCTIVAS = [
  { re: /\bDROP\s+TABLE\b/i, nombre: "DROP TABLE" },
  { re: /\bDROP\s+COLUMN\b/i, nombre: "DROP COLUMN" },
  { re: /\bTRUNCATE\b/i, nombre: "TRUNCATE" },
  { re: /\bDELETE\s+FROM\b/i, nombre: "DELETE FROM" },
];
// DROP COLUMN ya se cuenta aparte. CONSTRAINT/DEFAULT/NOT NULL los genera Prisma al tocar claves: no borran filas.
const DROP_INOFENSIVO = /^DROP\s+(COLUMN|CONSTRAINT|DEFAULT|NOT\s+NULL)\b/i;

function sinComentarios(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");
}

export function operacionesDestructivas(sql) {
  const limpio = sinComentarios(sql);
  const halladas = new Set();
  for (const { re, nombre } of DESTRUCTIVAS) if (re.test(limpio)) halladas.add(nombre);
  for (const sentencia of limpio.split(";")) {
    if (!/^\s*ALTER\s+TABLE\b/i.test(sentencia)) continue;
    // Cada cláusula de un ALTER TABLE va separada por coma; nos quedamos con las que empiezan por DROP.
    for (const m of sentencia.matchAll(/(?:^|,)\s*(?:ALTER\s+TABLE\s+\S+\s+)?(DROP\b[^,]*)/gi)) {
      if (!DROP_INOFENSIVO.test(m[1].trim())) halladas.add("ALTER TABLE ... DROP");
    }
  }
  return [...halladas];
}

// `sqlPorCarpeta`: { carpeta: sql } de las migraciones nuevas, leído de la cabeza.
export function comprobarBd({ cambios, sqlPorCarpeta = {} }) {
  const id = "bd";
  const tocaSchema = cambios.some((c) => c.ruta === RUTA_SCHEMA);
  const nuevas = migracionesNuevas(cambios);
  if (!tocaSchema && nuevas.length === 0) return [resultado(id, "no aplica", "ni schema.prisma ni migraciones nuevas")];
  if (tocaSchema && nuevas.length === 0) {
    return [resultado(id, "falla", "schema.prisma cambia sin carpeta nueva en prisma/migrations/ (falta `npm run db:migrate`)")];
  }
  const peligros = [];
  for (const carpeta of nuevas) {
    const ops = operacionesDestructivas(sqlPorCarpeta[carpeta] ?? "");
    if (ops.length) peligros.push(`${carpeta}: ${ops.join(", ")}`);
  }
  const lista = nuevas.join(", ");
  if (peligros.length) {
    return [resultado(id, "falla",
      `PÉRDIDA DE DATOS EN NEON: el deploy aplica esto en prod sin preguntar. ${peligros.join("; ")}`)];
  }
  const sinSchema = tocaSchema ? "" : " (ojo: sin cambio en schema.prisma)";
  return [resultado(id, tocaSchema ? "pasa" : "aviso", `migraciones nuevas: ${lista}${sinSchema}`)];
}

// ---------- prod ----------

const SEÑALES_PROD = [
  { re: /neon\.tech/i, nombre: "neon.tech" },
  { re: /\.env\.produccion/, nombre: ".env.produccion" },
  { re: /--aplicar\b/, nombre: "--aplicar" },
  // Valor literal, no un marcador (`<la de Neon>`) ni una variable (`$X`).
  { re: /\bDATABASE_URL=["'`]?(?![\s$<]|$)/, nombre: "DATABASE_URL=<literal>" },
];

export function rutaVigiladaProd(ruta) {
  return ruta === "package.json" || ruta.startsWith("scripts/");
}

// `diffs`: { ruta: textoDelDiffUnificado }.
export function comprobarProd({ diffs }) {
  const id = "prod";
  const hallazgos = [];
  for (const [ruta, diff] of Object.entries(diffs)) {
    if (!rutaVigiladaProd(ruta)) continue;
    for (const linea of diff.split("\n")) {
      if (!linea.startsWith("+") || linea.startsWith("+++")) continue;
      for (const { re, nombre } of SEÑALES_PROD) {
        if (re.test(linea)) hallazgos.push(`${ruta}: ${nombre} → ${linea.slice(1).trim().slice(0, 100)}`);
      }
    }
  }
  if (!hallazgos.length) return [resultado(id, "pasa", "nada que apunte a producción en scripts/ ni package.json")];
  return [resultado(id, "aviso", `líneas añadidas que apuntan a prod: ${hallazgos.join(" | ")}`)];
}
