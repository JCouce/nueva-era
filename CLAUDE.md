# Nueva Era — guía del proyecto

App mobile-first para que un grupo de rol (≈10 jugadores) lleve sus fichas de
personaje. Sistema **propio, y todavía en diseño**: el diseñador va soltando las
reglas a cuentagotas, así que el modelo de datos es flexible a propósito.

**`docs/sistema.md` es la fuente de verdad de las reglas.** Lo que no esté ahí no
existe para el código. Cada bloque lleva estado (`FIRME`, `INFERIDO`, `PARCIAL`,
`PENDIENTE`) y fuente, y al final hay una lista de supuestos tomados al implementar
y de preguntas abiertas. Antes de tocar reglas, léelo; después de tocarlas,
actualízalo.

Hoy la ficha cubre identidad, atributos (6 básicos + 6 aplicados derivados),
habilidades con especialidades, salud y movimiento. Dotes, poderes psiónicos,
aumentos y equipo están declarados como tabs vacías porque el sistema aún no los
define.

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
| `npm test` | Tests del motor de reglas (`node --test`, sin dependencias). Rápidos: ~120 ms. Corre antes de dar por buena cualquier fórmula. |
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
│  ├─ rules/            # EL SISTEMA. Espejo de docs/sistema.md. Importar siempre de "@/lib/rules".
│  │  ├─ atributos.ts   #   6 básicos + 6 aplicados, con sus límites
│  │  ├─ habilidades.ts #   las 10 habilidades y las reglas de especialidad
│  │  ├─ sheet.ts       #   forma de la ficha, Zod, SCHEMA_VERSION y parseSheet tolerante
│  │  ├─ derivados.ts   #   lo que se calcula y nunca se guarda (aplicados, salud, movimiento)
│  │  ├─ creacion.ts    #   point-buy: costes, pools y operaciones puras sobre la ficha
│  │  └─ *.test.ts      #   39 tests. Al tocar una fórmula, se toca su test.
│  ├─ validation.ts     # Zod de entrada de la app (login, register, character). NO la ficha.
│  └─ auth-helpers.ts   # requireUser() y canEditCharacter() — regla central de permisos.
├─ generated/prisma/    # Cliente Prisma generado (gitignored, lo crea `prisma generate`).
├─ components/AppHeader.tsx
└─ app/
   ├─ page.tsx                       # redirige a /characters
   ├─ login/                         # page + LoginForm (cliente) + actions (login/register)
   ├─ characters/                    # lista (RSC) + actions (crear/borrar)
   ├─ characters/[id]/               # detalle (RSC) + CharacterSheet (cliente) + actions (autosave)
   └─ api/auth/[...nextauth]/route.ts
prisma/schema.prisma · prisma.config.ts · docker-compose.yml · scripts/make-master.mjs
```

## Modelo de datos (`prisma/schema.prisma`)
- **User**: `email`, `passwordHash` (bcrypt, nullable para Google futuro), `role`
  (`PLAYER`|`MASTER`). Incluye `Account`/`Session`/`VerificationToken` del adapter
  de Auth.js (listos para Google, hoy sin uso porque la sesión es JWT).
- **Character**: `name`, `ownerId`, y **`stats` (`Json`)** — la ficha entera vive
  aquí. Es lo que permite que el sistema cambie de arriba abajo sin una sola
  migración; mientras las reglas no se estabilicen, no promuevas nada a tabla.
  `parseSheet` (`lib/rules.ts`) lee ese Json de forma tolerante: valores fuera de
  rango se recortan y lo que no reconoce se descarta con el valor por defecto, así
  que una ficha vieja nunca revienta la página.
- **Solo se guarda lo que el jugador decide** (atributos básicos y habilidades).
  Todo lo derivable —aplicados, puntos gastados, vida, fatiga, movimiento— se
  recalcula en cada render. Así no hay estados que se desincronicen ni forma de
  falsear el saldo de puntos.

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
- PWA instalable.
- Bloques de ficha a la espera de que el diseñador los cierre: **dotes**, **poderes
  psiónicos**, **aumentos** (biónicos y genéticos) y **equipo**. El catálogo de equipo
  ya está transcrito en `docs/equipamiento.md`; falta decidir cómo se compra.
- Progresión post-creación: hoy solo existen los 10+10 puntos de creación.

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
