# Nueva Era — Fichas de rol

App mobile-first para que el grupo lleve sus fichas de personaje. Login con
email+contraseña (Google se añade más adelante), lista de personajes y ficha con
tabs (v1: estadísticas). Sistema de rol **homebrew**: las stats son flexibles.

## Stack
- **Next.js 16** (App Router, React Server Components + Server Actions) — sin tRPC.
- **Prisma 7** + **Postgres** (Docker en local, Neon en prod).
- **Auth.js v5** (NextAuth) con sesión JWT en cookie (login recordado).
- **Tailwind v4**, TypeScript estricto, Zod para validación.

## Arranque local

```bash
cp .env.example .env          # rellena AUTH_SECRET: openssl rand -base64 33
npm install
npm run dev                   # http://localhost:3000
```

`npm run dev` se encarga de todo: levanta Postgres en Docker (puerto 5433),
espera a que esté sano, aplica migraciones y arranca Next. Solo necesitas Docker
corriendo.

Primer arranque: regístrate en `/login`. Para hacerte máster:

```bash
npm run make-master -- tu@email.com   # cierra y reabre sesión tras esto
```

## Roles y permisos
- **PLAYER**: ve y edita solo sus personajes.
- **MASTER**: ve y edita todas las fichas.

La regla vive en `canEditCharacter()` (`src/lib/auth-helpers.ts`) y se aplica en
**todos** los server actions y reads. El rol viaja en el JWT: un cambio de rol
requiere cerrar y reabrir sesión.

## Modelo de datos
`prisma/schema.prisma`. Las estadísticas se guardan en `Character.stats` (`Json`)
para crecer sin migrar en cada campo. Cuando una categoría se estabilice
(ataques, inventario, mascotas...), se promueve a su propio modelo con
`npm run db:migrate`.

## Scripts
| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `start` | Build y arranque de producción |
| `npm run db:up` / `db:down` | Levanta / para Postgres en Docker |
| `npm run db:migrate` | Crea y aplica migraciones |
| `npm run db:studio` | Prisma Studio (inspeccionar DB) |
| `npm run make-master -- <email>` | Asciende un usuario a MASTER |

## Deploy (Vercel + Neon)
1. Crea una base en [Neon](https://neon.tech) y copia la connection string.
2. En Vercel: importa el repo y configura las env vars:
   - `DATABASE_URL` → la de Neon (usa la **pooled connection**).
   - `AUTH_SECRET` → `openssl rand -base64 33`.
3. Las migraciones se aplican en el build (`prisma migrate deploy`); si no, lánzalo
   a mano una vez contra Neon.
4. `git push` y a iterar.

## Pendiente (siguientes versiones)
- Login con Google (modelos `Account`/`Session` ya listos; solo falta el provider
  y las credenciales de Google Cloud → `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`).
- PWA instalable.
- Nuevas tabs: ataques, defensas, inventario, build, mascotas, reglas...
