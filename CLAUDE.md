# Nueva Era — guía del proyecto

App mobile-first para que un grupo de rol (≈10 jugadores) lleve sus fichas de
personaje. Sistema **propio, y todavía en diseño**: el diseñador va soltando las
reglas a cuentagotas, así que el modelo de datos es flexible a propósito.

**Si acabas de llegar al proyecto, lee `docs/traspaso.md` primero**: cómo se trabaja
aquí, mapa de archivos y trampas conocidas. Para qué está hecho y qué falta,
`docs/tareas.md` — la única fuente de estado del proyecto; no lo dupliques aquí.

**`docs/sistema.md` es la fuente de verdad de las reglas.** Lo que no esté ahí no
existe para el código. Cada bloque lleva estado (`FIRME`, `INFERIDO`, `PARCIAL`,
`PENDIENTE`) y fuente, y al final hay una lista de supuestos tomados al implementar
y de preguntas abiertas. Antes de tocar reglas, léelo; después de tocarlas,
actualízalo.

**`docs/motor.md` es de lectura obligatoria antes de dar de alta cualquier elemento
nuevo en el catálogo** — equipo, especies, poderes psiónicos, dotes, aumentos,
cualquier cosa que se transcriba de prosa a motor. Define el análisis de dos
preguntas (a qué acción afecta, de cuál de los cinco tipos de modificador es) que
todo elemento nuevo tiene que responder antes de darse por transcrito.

## Stack
- **Next.js 16** — App Router, React Server Components + Server Actions. **Sin tRPC**:
  los reads van directos a Prisma en componentes servidor; las mutaciones son server actions.
- **Prisma 7** + **Postgres** (Docker en local, Neon en prod).
- **Auth.js v5** (NextAuth) — Credentials (email+contraseña, bcrypt), sesión JWT en
  cookie (login recordado). Google OAuth pendiente.
- **Tailwind v4** (mobile-first), **TypeScript estricto**, **Zod** para validación.

## Comandos
| Comando | Qué hace |
|---|---|
| `npm run dev` | **Único comando para arrancar.** `predev` levanta Postgres (`docker compose up -d --wait`), espera al healthcheck, corre `prisma migrate deploy` y arranca Next. Solo requiere Docker corriendo. |
| `npm run build` | `prisma migrate deploy && next build` (deploy aplica migraciones automáticamente). |
| `npm test` | Tests del motor de reglas (`node --test`, sin dependencias, ~1 s). Corre antes de dar por buena cualquier fórmula. |
| `npm run db:migrate` | `prisma migrate dev` — crear migración nueva al cambiar el schema. |
| `npm run make-master -- <email>` | Asciende un usuario a MASTER. |
| `npm run seed-npcs` | Crea/actualiza NPCs de ejemplo (`NpcTemplate`) por código, upsert por `nombre`. Los NPCs normales se crean desde `/master/npcs`. |
| `npm run sync-drive` | Baja los documentos del diseñador de Drive a `docs/fuente/` (Markdown) y enseña qué ha cambiado desde la última foto. Nunca commitea; la foto se commitea como `fuente: sync Drive AAAA-MM-DD`. Requiere `brew install pandoc`. Qué hacer después: `docs/drive-sync.md`. |
| `npm run seed-preguntas -- <json>` | Siembra/actualiza las preguntas al diseñador de `/preguntas` (página pública, sin login) desde `scripts/data/*.json`. Nunca pisa respuestas. En prod: `DATABASE_URL=<Neon> npm run seed-preguntas -- <json>`. |

## Arquitectura: lo que no se ve leyendo el árbol
- `src/lib/rules/` es **el sistema**, espejo de `docs/sistema.md`. Importar siempre de
  `"@/lib/rules"`. Al tocar una fórmula, se toca su `*.test.ts` al lado.
- `src/lib/catalog/` son datos puros (especies, equipo, psiónica).
- La UI no calcula reglas por su cuenta; ESLint (`eslint.config.mjs`) prohíbe importar
  las piezas sueltas desde `src/app`, `src/components` y `src/hooks`:
  - Ficha (modificadores, aplicados, salud, movimiento) → `useFichaResuelta` /
    `resolverFicha` (`rules/fichaResuelta.ts`).
  - Tiradas (total, desglose, críticos) → `montarTirada` / `tirarMontada` (`rules/montaje.ts`).
  - Poderes → `prepararPoder` / `usarPoder` / `efectosDelResultado` (`rules/usoPoder.ts`).
- Permisos en `src/lib/auth-helpers.ts`; middleware en `src/proxy.ts` (ver Gotchas).

## Modelo de datos (`prisma/schema.prisma`)
- **Character**: `name`, `ownerId`, y **`stats` (`Json`)** — la ficha entera vive
  aquí. Es lo que permite que el sistema cambie de arriba abajo sin una sola
  migración; mientras las reglas no se estabilicen, no promuevas nada a tabla.
  `parseSheet` (`lib/rules/sheet.ts`) lee ese Json de forma tolerante: valores fuera de
  rango se recortan y lo que no reconoce se descarta con el valor por defecto, así
  que una ficha vieja nunca revienta la página. Al cambiar la forma de la ficha se sube
  `SCHEMA_VERSION` (`sheet.ts`) y se añade su paso en `rules/migraciones.ts`.
- **No se guarda nada derivable.** Se guarda lo que el jugador decide (atributos
  básicos, habilidades, equipo, disciplinas, fármacos…) y el estado de partida que no se
  puede recalcular (vida y fatiga actuales). Aplicados, puntos gastados, máximos de
  vida/fatiga y movimiento se recalculan en cada render, para que no se desincronicen
  ni se pueda falsear el saldo de puntos.

## Permisos
Regla central en `canEditCharacter(user, character)` = `role === 'MASTER' || ownerId === user.id`.
- **PLAYER**: ve y edita solo sus personajes. **MASTER**: ve y edita todas las fichas.
- Se aplica en **todos** los server actions y en los reads del detalle. Nunca confiar en el cliente.
- El `role` viaja en el **JWT** (se fija al loguear): cambiarlo requiere cerrar y
  reabrir sesión. Para ascender: `npm run make-master -- <email>`.

## Gotchas (no obvios)
- **Postgres en el puerto 5433**, no el 5432 (el 5432 lo ocupa `nimbus-postgres`,
  otro proyecto local). Está en `docker-compose.yml` y en `DATABASE_URL`.
- **Prisma 7 usa driver adapters obligatorios**: el cliente se construye con
  `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })` (ver `src/lib/db.ts`).
  El cliente se genera en `src/generated/prisma` (import `@/generated/prisma/client`), no en `node_modules`.
- **Next 16 deprecó `middleware.ts`**: el middleware es `src/proxy.ts` con `export default auth`.
- `prisma.config.ts` carga el `.env` vía `dotenv/config`; Prisma no lee `.env` solo.

## Convenciones
- TypeScript estricto, evita `any`. Validación de entrada con Zod en cada server action.
- Mobile-first: layout de una columna, targets táctiles grandes. Tema oscuro fijo con
  paleta neón: los colores son tokens de `src/app/globals.css` (`--color-neon-*`,
  `--color-night`, `--color-surface`…), nunca literales en los componentes.

## Deploy — "¿cómo hago deploy?"
**Un `git push origin main` es el deploy completo. No hay pasos manuales aparte.**

Hay dos paneles de administración:
- **Vercel** → la app (hosting, deploys, env vars, logs). URL pública: https://nueva-era-ochre.vercel.app
- **Neon** → la base de datos en vivo (datos, roles/passwords, backups).

Vercel (repo `JCouce/nueva-era`) aplica las migraciones pendientes en Neon y luego
construye, en el mismo `build`. **Nunca se ejecutan migraciones a mano contra prod.**

| Cambias... | Qué haces |
|---|---|
| Solo código (UI, lógica, sin tocar el modelo) | `git push` y ya |
| El modelo de datos (`prisma/schema.prisma`) | `npm run db:migrate` (crea el archivo de migración en `prisma/migrations/`) → commit junto al schema → `git push` |

Env vars en Vercel (ya configuradas): `DATABASE_URL` (connection string **directa**
de Neon, sin `-pooler`) y `AUTH_SECRET` (`openssl rand -base64 33`).

@AGENTS.md
