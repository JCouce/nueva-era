// Siembra (o actualiza) unos NPC de ejemplo en NpcTemplate — para poder
// crear samples e iterar el catálogo de NPCs (fase 6b, docs/fase-6b.md
// subtarea 1.2) sin esperar a que exista la UI del máster (subtarea 5.1).
//
// Reejecutable: hace upsert por nombre. Edita SAMPLES de abajo y vuelve a
// correr el script tantas veces como quieras mientras pruebas.
// Uso: npm run seed-npcs
import "dotenv/config";
import pg from "pg";
import { randomUUID } from "node:crypto";

const SAMPLES = [
  { nombre: "Guardia de seguridad", pgBase: 12, nota: "Arma reglamentaria, sin entrenamiento especial." },
  { nombre: "Merodeador Kerzul", pgBase: 18, nota: "Espada ligera y armadura ligera de placas." },
  { nombre: "Dron de vigilancia", pgBase: 6, nota: "Sintético, vuela. Sin armamento cuerpo a cuerpo." },
];

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

let creados = 0;
let actualizados = 0;
for (const npc of SAMPLES) {
  const res = await client.query(
    `UPDATE "NpcTemplate" SET "pgBase" = $2, "nota" = $3, "updatedAt" = now() WHERE "nombre" = $1`,
    [npc.nombre, npc.pgBase, npc.nota],
  );
  if (res.rowCount === 0) {
    await client.query(
      `INSERT INTO "NpcTemplate" (id, nombre, "pgBase", nota, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, now(), now())`,
      [randomUUID(), npc.nombre, npc.pgBase, npc.nota],
    );
    creados++;
  } else {
    actualizados++;
  }
}

await client.end();
console.log(`NPC de ejemplo: ${creados} creados, ${actualizados} actualizados.`);
