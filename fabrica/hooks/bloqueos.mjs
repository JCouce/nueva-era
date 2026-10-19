#!/usr/bin/env node
// Hook PreToolUse de la fábrica. Solo actúa sobre subagentes `fabrica-*`; la sesión del usuario y el resto de
// agentes pasan siempre. Bloquear = stderr + código 2 (Claude Code corta la llamada y le pasa stderr al modelo).
import path from "node:path";
import { fileURLToPath } from "node:url";

const COMANDOS_PROHIBIDOS = [
  { re: /\bgit\s+(?:-\S+(?:\s+\S+)?\s+)*push\b/, motivo: "git push: el push es siempre del usuario" },
  { re: /\bgit\s+(?:-\S+(?:\s+\S+)?\s+)*remote\b/, motivo: "git remote: la fábrica no toca remotos" },
  { re: /\bprisma\s+migrate\b/, motivo: "prisma migrate: la fábrica no migra ninguna BD" },
  { re: /\bprisma\s+db\s+(?:push|execute)\b/, motivo: "prisma db push/execute: la fábrica no toca la BD" },
  { re: /\bmigrate\s+reset\b/, motivo: "migrate reset: borra la BD" },
  // Estos scripts de npm llaman a `prisma migrate` por dentro (build, predev y db:migrate).
  { re: /\bnpm\s+run\s+(?:build|dev|db:migrate)\b/, motivo: "npm run build/dev/db:migrate: corren `prisma migrate` por dentro; usa `npx next dev -p <puerto>`" },
  { re: /\bnpm\s+run\s+seed-|\bseed-(?:npcs|preguntas)\b/, motivo: "seeds: la fábrica no siembra datos" },
  { re: /make-master/, motivo: "make-master: escribe en la BD" },
  { re: /reset-fichas/, motivo: "reset-fichas: escribe en la BD" },
  { re: /sync-drive/, motivo: "sync-drive: baja documentos del diseñador; lo lanza el usuario" },
  { re: /--aplicar\b/, motivo: "--aplicar: modo escritura de un script de datos" },
  { re: /\bDATABASE_URL=/, motivo: "DATABASE_URL=: la fábrica no elige base de datos" },
  { re: /neon\.tech/i, motivo: "neon.tech: producción" },
  // `.env` como archivo; `process.env` / `import.meta.env` llevan un carácter de identificador delante y pasan.
  { re: /(?<![\w$)\]])\.env(?=\.|\b)/, motivo: "archivo .env: la fábrica no lee ni escribe secretos" },
];

const SOLO_TRABAJOS = new Set(["fabrica-inspector", "fabrica-revisor"]);
const HERRAMIENTAS_ARCHIVO = new Set(["Read", "Edit", "Write", "NotebookEdit"]);
const HERRAMIENTAS_ESCRITURA = new Set(["Edit", "Write", "NotebookEdit"]);

export function esArchivoEnv(ruta) {
  const nombre = path.basename(ruta);
  return nombre === ".env" || nombre.startsWith(".env.");
}

// Tras normalizar (`..` incluidos), la ruta tiene que pasar por una carpeta `fabrica/trabajos/`. No se ata a la
// raíz del repo porque cada trabajo vive en su worktree.
export function dentroDeTrabajos(ruta, cwd) {
  const absoluta = path.resolve(cwd, ruta).split(path.sep).join("/");
  return /\/fabrica\/trabajos\/[^/]/.test(absoluta);
}

export function decidir(entrada, { cwd = process.cwd() } = {}) {
  const agente = entrada?.agent_type;
  if (typeof agente !== "string" || !agente.startsWith("fabrica-")) return { bloquear: false };

  const herramienta = entrada.tool_name;
  const datos = entrada.tool_input ?? {};
  const base = typeof entrada.cwd === "string" ? entrada.cwd : cwd;

  if (herramienta === "Bash") {
    const comando = String(datos.command ?? "");
    const prohibido = COMANDOS_PROHIBIDOS.find(({ re }) => re.test(comando));
    if (prohibido) return { bloquear: true, motivo: `Bloqueado por la fábrica (${agente}): ${prohibido.motivo}.` };
    return { bloquear: false };
  }

  if (herramienta === "Grep" || herramienta === "Glob") {
    const ruta = String(datos.path ?? "");
    const patron = `${datos.glob ?? ""} ${herramienta === "Glob" ? datos.pattern ?? "" : ""}`;
    if ((ruta && esArchivoEnv(ruta)) || /(?:^|[\s/*{,])\.env(?:[.*}\s,]|$)/.test(patron)) {
      return { bloquear: true, motivo: `Bloqueado por la fábrica (${agente}): no se buscan archivos .env.` };
    }
    return { bloquear: false };
  }

  if (HERRAMIENTAS_ARCHIVO.has(herramienta)) {
    const ruta = String(datos.file_path ?? datos.notebook_path ?? "");
    if (ruta && esArchivoEnv(ruta)) {
      return { bloquear: true, motivo: `Bloqueado por la fábrica (${agente}): ${ruta} es un .env.` };
    }
    if (SOLO_TRABAJOS.has(agente) && HERRAMIENTAS_ESCRITURA.has(herramienta) && !dentroDeTrabajos(ruta, base)) {
      return {
        bloquear: true,
        motivo: `Bloqueado por la fábrica (${agente}): solo puedes escribir en fabrica/trabajos/, no en ${ruta || "(sin ruta)"}.`,
      };
    }
  }
  return { bloquear: false };
}

async function main() {
  let texto = "";
  for await (const trozo of process.stdin) texto += trozo;
  let entrada;
  try {
    entrada = JSON.parse(texto);
  } catch (error) {
    // Un JSON roto no puede tumbar la sesión del usuario: se deja pasar y se deja rastro.
    process.stderr.write(`bloqueos.mjs: no puedo leer la entrada del hook (${error.message}); dejo pasar.\n`);
    process.exit(0);
  }
  const { bloquear, motivo } = decidir(entrada);
  if (bloquear) {
    process.stderr.write(`${motivo}\n`);
    process.exit(2);
  }
  process.exit(0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
