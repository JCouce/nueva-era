// Promueve un usuario a MASTER por email.
// Uso: npm run make-master -- alguien@email.com
import "dotenv/config";
import pg from "pg";

const email = process.argv[2];
if (!email) {
  console.error("Uso: npm run make-master -- <email>");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const res = await client.query(
  `UPDATE "User" SET role = 'MASTER' WHERE email = $1`,
  [email],
);
await client.end();

if (res.rowCount === 0) {
  console.error(`No existe ningún usuario con email ${email}`);
  process.exit(1);
}
console.log(`${email} es ahora MASTER. (Debe cerrar y reabrir sesión para aplicarlo.)`);
