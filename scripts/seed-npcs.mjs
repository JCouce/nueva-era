// Siembra (o actualiza) unos NPC de ejemplo en NpcTemplate — para poder
// crear samples e iterar el catálogo de NPCs (fase 6b, docs/fase-6b.md)
// sin esperar a que exista la UI del máster (subtarea 5.1).
//
// Ficha obligatoria (2026-09-11): cada NPC lleva un Sheet, igual que un
// Character. Este script no importa lib/rules (es un script standalone con
// `pg` a pelo, como make-master.mjs — Node normal no resuelve los imports
// sin extensión ni los alias @/ que sí entiende el bundler de Next), así
// que la forma del Sheet se construye a mano aquí: si sheet.ts cambia de
// forma (SCHEMA_VERSION, ids de atributos/habilidades...), este script
// también hay que actualizarlo.
//
// Reejecutable: hace upsert por nombre. Edita SAMPLES de abajo y vuelve a
// correr el script tantas veces como quieras mientras pruebas.
// Uso: npm run seed-npcs
import "dotenv/config";
import pg from "pg";
import { randomUUID } from "node:crypto";

const SCHEMA_VERSION = 5;
const ATRIBUTOS = ["fuerza", "agilidad", "aguante", "percepcion", "inteligencia", "caracter"];
const HABILIDADES = [
  "actitud",
  "atletismo",
  "biociencia",
  "combate_distancia",
  "combate_melee",
  "cultura",
  "interpretacion",
  "sigilo",
  "exploracion",
  "tecnociencia",
];
const HABILIDAD_NO_ENTRENADA = -1;

// `atributos`/`habilidades` solo listan lo que se sale del default (0 y sin
// entrenar) — sheet() rellena el resto.
function sheet({ atributos = {}, habilidades = {} } = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    edad: null,
    altura: null,
    peso: null,
    especieId: null,
    trasfondo: "",
    motivacion: "",
    atributos: Object.fromEntries(ATRIBUTOS.map((a) => [a, atributos[a] ?? 0])),
    habilidades: Object.fromEntries(
      HABILIDADES.map((h) => [
        h,
        { valor: habilidades[h] ?? HABILIDAD_NO_ENTRENADA, especialidades: [] },
      ]),
    ),
    prioridades: { atributos: null, habilidades: null, dotes: null, psionica: null, recursos: null },
    equipo: [],
  };
}

const SAMPLES = [
  {
    nombre: "Guardia de seguridad",
    nota: "Arma reglamentaria, sin entrenamiento especial.",
    stats: sheet({
      atributos: { fuerza: 1, agilidad: 1, aguante: 1, percepcion: 1 },
      habilidades: { combate_distancia: 1, exploracion: 0 },
    }),
  },
  {
    nombre: "Merodeador Kerzul",
    nota: "Espada ligera y armadura ligera de placas.",
    stats: sheet({
      atributos: { fuerza: 2, agilidad: 1, aguante: 2 },
      habilidades: { combate_melee: 2, atletismo: 1 },
    }),
  },
  {
    nombre: "Dron de vigilancia",
    nota: "Sintético, vuela. Sin armamento cuerpo a cuerpo.",
    stats: sheet({
      atributos: { percepcion: 2, inteligencia: 1 },
      habilidades: { exploracion: 2 },
    }),
  },
];

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

let creados = 0;
let actualizados = 0;
for (const npc of SAMPLES) {
  const res = await client.query(
    `UPDATE "NpcTemplate" SET stats = $2, nota = $3, "updatedAt" = now() WHERE nombre = $1`,
    [npc.nombre, JSON.stringify(npc.stats), npc.nota],
  );
  if (res.rowCount === 0) {
    await client.query(
      `INSERT INTO "NpcTemplate" (id, nombre, stats, nota, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, now(), now())`,
      [randomUUID(), npc.nombre, JSON.stringify(npc.stats), npc.nota],
    );
    creados++;
  } else {
    actualizados++;
  }
}

await client.end();
console.log(`NPC de ejemplo: ${creados} creados, ${actualizados} actualizados.`);
