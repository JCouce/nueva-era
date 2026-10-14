// Baja los documentos de reglas que el diseñador sube a Drive, los pasa a Markdown
// y los deja en docs/fuente/. El diff contra la versión anterior es el de git:
// la foto commiteada es la referencia, y cada sync enseña qué ha cambiado desde ella.
//
// La carpeta es pública: se lista con embeddedfolderview y se baja con uc?export=download,
// sin OAuth. Si algo falla (listado vacío, descarga que no es un .odt, pandoc), no se
// escribe nada: mejor ningún sync que medio sync.
//
// Nunca hace add, commit ni push. Requiere pandoc (brew install pandoc), unzip y zip.
//
// Uso: npm run sync-drive
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CARPETA = "156Xu4utJA_WmoSml9S0dujnSqaooQ5Wd";
const MIME_ODT = "application/vnd.oasis.opendocument.text";
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEST = join(RAIZ, "docs/fuente");
const INDICE = join(DEST, "_indice.tsv");

const avisos = [];
const aviso = (m) => avisos.push(m);

function correr(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: opts.encoding ?? "utf8", maxBuffer: 64 * 1024 * 1024, ...opts });
  if (r.error) throw new Error(`${cmd}: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} salió con ${r.status}: ${r.stderr}`);
  return r.stdout;
}

function requisitos() {
  for (const cmd of ["pandoc", "unzip", "zip", "git"]) {
    if (spawnSync("which", [cmd]).status !== 0) {
      throw new Error(`Falta ${cmd}.${cmd === "pandoc" ? " Instálalo con: brew install pandoc" : ""}`);
    }
  }
  return correr("pandoc", ["--version"]).split("\n")[0].trim();
}

const slugDe = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const decodificar = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .normalize("NFC");

async function bajar(url) {
  let ultimo;
  for (let intento = 1; intento <= 3; intento++) {
    try {
      const r = await fetch(url, { redirect: "follow" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    } catch (e) {
      ultimo = e;
    }
  }
  throw new Error(`No se pudo bajar ${url}: ${ultimo.message}`);
}

async function listar() {
  const html = (await bajar(`https://drive.google.com/embeddedfolderview?id=${CARPETA}`)).toString("utf8");
  const entradas = [];
  for (const bloque of html.split('class="flip-entry"').slice(1)) {
    const id = bloque.match(/id="entry-([A-Za-z0-9_-]+)"/)?.[1];
    const nombre = bloque.match(/flip-entry-title">([^<]+)/)?.[1];
    const fecha = bloque.match(/flip-entry-last-modified"><div>([^<]+)/)?.[1] ?? "?";
    if (!id || !nombre) continue;
    const limpio = decodificar(nombre);
    if (!limpio.toLowerCase().endsWith(".odt")) {
      aviso(`Ignorado (no es .odt): ${limpio}`);
      continue;
    }
    entradas.push({ id, nombre: limpio.replace(/\.odt$/i, ""), fecha });
  }
  // Un listado vacío casi siempre es que Google cambió el HTML o la carpeta dejó de ser
  // pública, no que el diseñador lo borrase todo: abortar antes de marcar nada como retirado.
  if (entradas.length === 0) {
    throw new Error("El listado de Drive ha vuelto vacío: ¿ha cambiado el HTML de Google o la carpeta ya no es pública?");
  }
  return entradas;
}

function leerIndice() {
  const filas = new Map();
  let conversor = null;
  if (!existsSync(INDICE)) return { filas, conversor };
  for (const linea of readFileSync(INDICE, "utf8").split("\n")) {
    if (!linea.trim()) continue;
    if (linea.startsWith("# conversor: ")) conversor = linea.slice("# conversor: ".length);
    if (linea.startsWith("#")) continue;
    const [id, slug, nombre, estado] = linea.split("\t");
    filas.set(id, { slug, nombre, estado });
  }
  return { filas, conversor };
}

function escribirIndice(filas, conversor) {
  const lineas = [...filas.entries()]
    .sort((a, b) => a[1].slug.localeCompare(b[1].slug))
    .map(([id, f]) => [id, f.slug, f.nombre, f.estado].join("\t"));
  writeFileSync(
    INDICE,
    `# Generado por scripts/sync-drive.mjs. id de Drive → archivo en docs/fuente/.\n` +
      `# El slug no cambia aunque el diseñador renombre el documento.\n` +
      `# conversor: ${conversor}\n` +
      `# id\tslug\tnombre\testado\n` +
      lineas.join("\n") +
      "\n",
  );
}

// El diseñador deja en algunas tablas texto casi blanco (#eeeeee, #dddddd) que en pantalla
// no se ve pero pandoc sí extrae: un blindaje 1 salía como "11". Se quita el texto de esos
// spans; si solo son espacios se dejan, para no pegar palabras.
function quitarTextoInvisible(xml) {
  const invisibles = new Set();
  for (const [, nombre, cuerpo] of xml.matchAll(/<style:style style:name="([^"]+)" style:family="text"[^>]*>(.*?)<\/style:style>/gs)) {
    const color = cuerpo.match(/fo:color="#([0-9a-f]{6})"/i)?.[1];
    const casiBlanco = color && [0, 2, 4].every((i) => parseInt(color.slice(i, i + 2), 16) >= 0xd0);
    if (casiBlanco || /text:display="none"/.test(cuerpo)) invisibles.add(nombre);
  }
  let quitados = 0;
  const limpio = xml.replace(/<text:span text:style-name="([^"]+)">([^<]*)<\/text:span>/g, (todo, estilo, texto) => {
    if (!invisibles.has(estilo) || !texto.trim()) return todo;
    quitados++;
    return "";
  });
  return { limpio, quitados };
}

const normalizar = (md) =>
  md
    .replace(/ /g, " ")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim() + "\n";

function convertir(odt, dir, nombre) {
  const mime = correr("unzip", ["-p", odt, "mimetype"]).trim();
  if (mime !== MIME_ODT) throw new Error(`${nombre}: no es un documento de texto ODT (mimetype "${mime}")`);

  const desplegado = join(dir, "desplegado");
  correr("unzip", ["-q", "-o", odt, "-d", desplegado]);
  const rutaContent = join(desplegado, "content.xml");
  const xml = readFileSync(rutaContent, "utf8");
  if (/<text:tracked-changes/.test(xml)) aviso(`${nombre}: tiene cambios con control de cambios sin aceptar; el texto puede mezclar versiones.`);
  if (/<office:annotation/.test(xml)) aviso(`${nombre}: tiene comentarios del diseñador; pandoc no los saca, míralos en Drive.`);

  const { limpio, quitados } = quitarTextoInvisible(xml);
  if (quitados) aviso(`${nombre}: quitados ${quitados} trozos de texto invisible.`);
  writeFileSync(rutaContent, limpio);

  // mimetype va primero y sin comprimir, o el .odt no es válido.
  const limpioOdt = join(dir, "limpio.odt");
  correr("zip", ["-X", "-0", "-q", limpioOdt, "mimetype"], { cwd: desplegado });
  correr("zip", ["-X", "-r", "-q", limpioOdt, ".", "-x", "mimetype"], { cwd: desplegado });

  const md = correr("pandoc", ["-f", "odt", "-t", "gfm", "--wrap=none", limpioOdt]);
  return `<!-- Generado por scripts/sync-drive.mjs desde "${nombre}" (Drive). No editar a mano. -->\n\n${normalizar(md)}`;
}

async function main() {
  const conversor = requisitos();
  const entradas = await listar();
  const { filas, conversor: conversorPrevio } = leerIndice();
  if (conversorPrevio && conversorPrevio !== conversor) {
    aviso(`Cambió el conversor (${conversorPrevio} → ${conversor}): parte del diff puede ser solo formato.`);
  }

  const tmp = mkdtempSync(join(tmpdir(), "sync-drive-"));
  try {
    // Fase 1: todo en temporal. Si algo revienta aquí, docs/fuente no se toca.
    const nuevos = [];
    for (const e of entradas) {
      const dir = join(tmp, e.id);
      mkdirSync(dir);
      const odt = await bajar(`https://drive.google.com/uc?export=download&id=${e.id}`);
      // Una página de login o de aviso de Google vuelve con 200: se caza por la firma del zip.
      if (odt.subarray(0, 2).toString() !== "PK") throw new Error(`${e.nombre}: la descarga no es un .odt (¿página de Google?)`);
      const rutaOdt = join(dir, "original.odt");
      writeFileSync(rutaOdt, odt);
      nuevos.push({ ...e, odt, md: convertir(rutaOdt, dir, e.nombre) });
    }

    // Fase 2: comparar y escribir.
    const slugsUsados = new Map([...filas].map(([id, f]) => [f.slug, id]));
    const informe = [];
    const cambiados = [];
    for (const n of nuevos) {
      const previa = filas.get(n.id);
      let slug = previa?.slug;
      if (!slug) {
        slug = slugDe(n.nombre);
        const dueño = slugsUsados.get(slug);
        if (dueño && dueño !== n.id) {
          aviso(`"${n.nombre}" es un documento nuevo en Drive con el nombre de otro que ya conocíamos: ¿lo ha vuelto a subir? Se guarda aparte, no se mezcla su historial.`);
          slug = `${slug}-${n.id.slice(0, 6)}`;
        }
        slugsUsados.set(slug, n.id);
      }
      const rutaMd = join(DEST, `${slug}.md`);
      const antes = existsSync(rutaMd) ? readFileSync(rutaMd, "utf8") : null;
      const etiquetas = [];
      if (!previa) etiquetas.push("NUEVO");
      else {
        if (previa.estado === "retirado") etiquetas.push("REAPARECE");
        if (previa.nombre !== n.nombre) etiquetas.push(`RENOMBRADO (antes "${previa.nombre}")`);
        if (antes !== n.md) etiquetas.push("CAMBIADO");
      }
      if (antes !== n.md) {
        mkdirSync(join(DEST, "odt"), { recursive: true });
        if (antes !== null) {
          const rutaAntes = join(tmp, `${slug}.antes.md`);
          writeFileSync(rutaAntes, antes);
          cambiados.push({ nombre: n.nombre, antes: rutaAntes, ahora: rutaMd });
        }
        writeFileSync(rutaMd, n.md);
        // El .odt solo se reescribe si cambió el texto: un reguardado sin cambios no ensucia el árbol.
        writeFileSync(join(DEST, "odt", `${slug}.odt`), n.odt);
      }
      filas.set(n.id, { slug, nombre: n.nombre, estado: "activo" });
      informe.push({ etiqueta: etiquetas.join(" · ") || "SIN CAMBIOS", nombre: n.nombre, fecha: n.fecha });
    }

    const vistos = new Set(nuevos.map((n) => n.id));
    for (const [id, f] of filas) {
      if (vistos.has(id) || f.estado === "retirado") continue;
      f.estado = "retirado";
      informe.push({ etiqueta: "BORRADO EN DRIVE", nombre: `${f.nombre} (se conserva docs/fuente/${f.slug}.md)`, fecha: "" });
    }
    escribirIndice(filas, conversor);

    // Salida
    const ancho = Math.max(...informe.map((i) => i.etiqueta.length));
    console.log("");
    for (const i of informe) console.log(`${i.etiqueta.padEnd(ancho)}  ${i.nombre}${i.fecha ? `  (Drive: ${i.fecha})` : ""}`);
    for (const a of avisos) console.log(`\n! ${a}`);
    for (const c of cambiados) {
      console.log(`\n━━━ ${c.nombre} ━━━`);
      const r = spawnSync("git", ["diff", "--no-index", "--word-diff=color", "--color=always", c.antes, c.ahora], { encoding: "utf8" });
      console.log(r.stdout.split("\n").slice(4).join("\n"));
    }
    const hayNovedad = informe.some((i) => i.etiqueta !== "SIN CAMBIOS");
    console.log(hayNovedad ? "\nRevisa y commitea docs/fuente/ cuando quieras: esa será la referencia del próximo sync." : "\nNada nuevo en Drive.");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(`\nsync-drive: ${e.message}\nNo se ha tocado docs/fuente/.`);
  process.exit(1);
});
