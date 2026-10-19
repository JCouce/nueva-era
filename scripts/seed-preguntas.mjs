// Siembra (o actualiza) las preguntas al diseñador que se responden en
// /preguntas. Lee un JSON de scripts/data/ con forma
//   { area, grupos: [{ grupo, errata?, preguntas: string[] | {texto, contexto?, recomendada?, errata?}[] }] }
//
// Reejecutable: el id es `<area>.<grupo>.<n>`, estable mientras no cambie el
// orden dentro de su grupo. Actualiza texto/contexto/orden pero NUNCA la
// respuesta — re-sembrar no borra lo que ya contestó el diseñador. `errata`
// solo se enciende desde el JSON, nunca se apaga: lo marcado en la página se
// queda, y `corregidaAt` no se toca. Tampoco
// borra preguntas que desaparezcan del JSON (se quitan a mano si hace falta).
//
// Uso: npm run seed-preguntas -- scripts/data/preguntas-psionica.json
// En producción: DATABASE_URL=<la de Neon> npm run seed-preguntas -- <json>
import "dotenv/config";
import pg from "pg";
import { readFileSync } from "node:fs";

const ruta = process.argv[2];
if (!ruta) {
  console.error("Uso: npm run seed-preguntas -- <ruta del JSON>");
  process.exit(1);
}

const slug = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const { area, grupos } = JSON.parse(readFileSync(ruta, "utf8"));
const filas = [];
let orden = 0;
for (const { grupo, errata: errataGrupo = false, preguntas } of grupos) {
  preguntas.forEach((p, i) => {
    const { texto, contexto = null, recomendada = null, errata = errataGrupo } = typeof p === "string" ? { texto: p } : p;
    filas.push({ id: `${area}.${slug(grupo)}.${i + 1}`, area, grupo, orden: orden++, texto, contexto, recomendada, errata });
  });
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
let nuevas = 0;
for (const f of filas) {
  const res = await client.query(
    `INSERT INTO "Pregunta" (id, area, grupo, orden, texto, contexto, recomendada, errata, "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
     ON CONFLICT (id) DO UPDATE
       SET area = EXCLUDED.area, grupo = EXCLUDED.grupo, orden = EXCLUDED.orden,
           texto = EXCLUDED.texto, contexto = EXCLUDED.contexto, recomendada = EXCLUDED.recomendada,
           errata = "Pregunta".errata OR EXCLUDED.errata, "updatedAt" = now()
     RETURNING (xmax = 0) AS insertada`,
    [f.id, f.area, f.grupo, f.orden, f.texto, f.contexto, f.recomendada, f.errata],
  );
  if (res.rows[0].insertada) nuevas++;
}
await client.end();
console.log(`${filas.length} preguntas de "${area}": ${nuevas} nuevas, ${filas.length - nuevas} actualizadas (respuestas intactas).`);
