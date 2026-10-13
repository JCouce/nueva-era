// Reset general de las fichas al desplegar especies (docs/sistema.md §14.3).
// Cada Character: ficha migrada y reseteada (todo salvo la pestaña Personaje),
// créditos a los de su letra de Recursos, de vuelta a "En creación" y sin foto de
// aprobación. La XP se conserva. Los NPC (NpcTemplate) no se tocan.
//
// Sin --aplicar solo enseña lo que haría. Con --aplicar escribe en una transacción.
// Uso:  node --import ./scripts/test-resolver.mjs scripts/reset-fichas-especies.ts [--aplicar] [--env .env.produccion]
import { config } from "dotenv";
import pg from "pg";
import { parseSheet, resetearFicha, reconciliarVida, creditosDeLaLetra } from "../src/lib/rules";

const args = process.argv.slice(2);
const aplicar = args.includes("--aplicar");
const envFile = args.includes("--env") ? args[args.indexOf("--env") + 1] : ".env";
config({ path: envFile, override: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(`Falta DATABASE_URL en ${envFile}`);
  process.exit(1);
}
console.log(`Base: ${new URL(url).host} · ${aplicar ? "APLICANDO" : "solo lectura (sin --aplicar)"}`);

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const { rows } = await client.query<{ id: string; name: string; stats: unknown; status: string; creditos: number }>(
    `SELECT id, name, stats, status, creditos FROM "Character" ORDER BY name`,
  );
  const cambios = rows.map((c) => {
    const sheet = reconciliarVida(resetearFicha(parseSheet(c.stats)));
    return { ...c, sheet, creditosNuevos: creditosDeLaLetra(sheet.prioridades) };
  });
  for (const c of cambios) {
    console.log(
      `- ${c.name}: ${c.status} → DRAFT · especie ${c.sheet.especieId ?? "—"} · créditos ${c.creditos} → ${c.creditosNuevos}`,
    );
  }
  console.log(`${cambios.length} fichas.`);

  if (aplicar) {
    await client.query("BEGIN");
    for (const c of cambios) {
      await client.query(
        `UPDATE "Character" SET stats = $2, creditos = $3, status = 'DRAFT', "approvedAt" = NULL, "approvedSnapshot" = NULL WHERE id = $1`,
        [c.id, JSON.stringify(c.sheet), c.creditosNuevos],
      );
    }
    await client.query("COMMIT");
    console.log("Hecho.");
  }
} catch (e) {
  if (aplicar) await client.query("ROLLBACK");
  throw e;
} finally {
  await client.end();
}
