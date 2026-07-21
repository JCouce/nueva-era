# Nueva Era — guía del proyecto

App mobile-first para que un grupo de rol (≈10 jugadores) lleve sus fichas de
personaje. Sistema **homebrew** (reglas propias), así que el modelo de datos es
flexible. v1: login, lista de personajes y ficha con tab de estadísticas. El
modelo crecerá (ataques, defensas, inventario, build, mascotas, reglas...).

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
| `npm start` | Arranque de producción. |
| `npm run lint` | ESLint. |
| `npm run db:up` / `db:down` | Levanta / para Postgres en Docker (sueltos). |
| `npm run db:migrate` | `prisma migrate dev` — crear migración nueva al cambiar el schema. |
| `npm run db:studio` | Prisma Studio. |
| `npm run make-master -- <email>` | Asciende un usuario a MASTER. |

## Arquitectura y archivos clave
```
src/
├─ auth.ts              # Auth.js: Credentials provider (bcrypt) + PrismaAdapter. Exporta handlers/auth/signIn/signOut.
├─ auth.config.ts       # Config edge-safe (sin Prisma/bcrypt): pages, session jwt, callbacks (jwt/session/authorized).
├─ proxy.ts             # Middleware de Next 16 (¡NO middleware.ts!). Protege rutas vía callback authorized.
├─ lib/
│  ├─ db.ts             # Singleton PrismaClient con driver adapter PrismaPg.
│  ├─ validation.ts     # Esquemas Zod (login, register, character, stats).
│  └─ auth-helpers.ts   # requireUser() y canEditCharacter() — regla central de permisos.
├─ generated/prisma/    # Cliente Prisma generado (gitignored, lo crea `prisma generate`).
├─ components/AppHeader.tsx
└─ app/
   ├─ page.tsx                       # redirige a /characters
   ├─ login/                         # page + LoginForm (cliente) + actions (login/register)
   ├─ characters/                    # lista (RSC) + actions (crear/borrar)
   ├─ characters/[id]/               # detalle (RSC) + CharacterTabs (cliente) + actions (saveStats)
   └─ api/auth/[...nextauth]/route.ts
prisma/schema.prisma · prisma.config.ts · docker-compose.yml · scripts/make-master.mjs
```

## Modelo de datos (`prisma/schema.prisma`)
- **User**: `email`, `passwordHash` (bcrypt, nullable para Google futuro), `role`
  (`PLAYER`|`MASTER`). Incluye `Account`/`Session`/`VerificationToken` del adapter
  de Auth.js (listos para Google, hoy sin uso porque la sesión es JWT).
- **Character**: `name`, `ownerId`, y **`stats` (`Json`)** — las estadísticas
  homebrew viven aquí para crecer sin migrar en cada campo. Cuando una categoría
  se estabilice (ataques, inventario, mascotas...), se promueve a su propio modelo
  con `npm run db:migrate`.
- En `saveStats` (`app/characters/[id]/actions.ts`) los valores numéricos se
  coaccionan a number y el resto se quedan como string; se validan con `statsSchema` (Zod).

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
- Mobile-first: layout de una columna, targets táctiles grandes. Tema oscuro fijo
  (variables en `globals.css`: `--background`, `--card`, `--border`, `--accent`).
- Comentarios solo cuando el WHY no es obvio.

## Pendiente
- Login con Google (modelos `Account`/`Session` listos; falta el provider en
  `auth.ts` + credenciales `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`).
- PWA instalable. Nuevas tabs: ataques, defensas, inventario, build, mascotas, reglas.

## Deploy — "¿cómo hago deploy?"
**Un `git push origin main` es el deploy completo. No hay pasos manuales aparte.**

Hay dos paneles de administración:
- **Vercel** → la app (hosting, deploys, env vars, logs). URL pública: https://nueva-era-ochre.vercel.app
- **Neon** → la base de datos en vivo (datos, roles/passwords, backups).

Vercel está conectado al repo `JCouce/nueva-era`: **cada push a `main` dispara un
deploy automático**. El `build` es `prisma migrate deploy && next build`, así que
Vercel **primero aplica las migraciones pendientes en Neon y luego construye la app**,
en el mismo paso. Las migraciones NO se aplican a mano contra prod.

Flujo según lo que cambies:

| Cambias... | Qué haces |
|---|---|
| Solo código (UI, lógica, sin tocar el modelo) | `git push` y ya |
| El modelo de datos (`prisma/schema.prisma`) | `npm run db:migrate` (crea el archivo de migración en local) → `git add` + commit → `git push` |

Clave: una migración es un **archivo versionado** que vive en `prisma/migrations/`.
Lo generas en local con `npm run db:migrate`, se commitea junto al schema, y el build
de Vercel lo aplica solo en Neon al deployar. Nunca ejecutas migraciones contra la
base de prod manualmente.

Env vars en Vercel (ya configuradas): `DATABASE_URL` (connection string **directa**
de Neon, sin `-pooler`) y `AUTH_SECRET` (`openssl rand -base64 33`).

@AGENTS.md
