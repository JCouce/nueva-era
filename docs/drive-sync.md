# Sincronizar las reglas del diseñador desde Drive

Murillo sube sus documentos (`.odt`) a una carpeta pública de Drive. `npm run sync-drive`
los baja, los pasa a Markdown y los deja en `docs/fuente/`. La foto commiteada es la
referencia: cada sync enseña qué ha cambiado desde el último commit de `docs/fuente/`.

## Qué hay en `docs/fuente/`

| Archivo | Qué es |
|---|---|
| `<slug>.md` | El documento convertido. **Generado: no se edita a mano ni se implementa desde aquí** — lo que vale para el código es `docs/sistema.md` |
| `odt/<slug>.odt` | El original tal cual lo bajó el sync, por si hay que reconvertir |
| `_indice.tsv` | id de Drive → slug, nombre actual y estado (`activo`/`retirado`), y la versión de pandoc |

El slug se fija la primera vez y no cambia aunque el documento se renombre en Drive. Un
documento que desaparece de Drive queda como `retirado` y su `.md` se conserva.

## Qué hace el script (`scripts/sync-drive.mjs`)

1. Lista la carpeta con `embeddedfolderview` (sin OAuth). Listado vacío → aborta.
2. Baja cada `.odt` a un temporal y comprueba que es un ODT de verdad (firma `PK` +
   `mimetype`). Si uno falla, aborta sin tocar `docs/fuente/`.
3. Quita el texto casi blanco o oculto que el diseñador deja en algunas tablas
   (en Equipamiento convertía un blindaje 1 en "11").
4. Convierte con `pandoc -t gfm --wrap=none` y normaliza espacios.
5. Escribe solo lo que ha cambiado y pinta una línea por documento (NUEVO, CAMBIADO,
   RENOMBRADO, BORRADO EN DRIVE, SIN CAMBIOS) más el diff por palabras.

Nunca hace add, commit ni push. Requiere `brew install pandoc`.

## Guion de análisis tras un sync con cambios (lo sigue Claude)

1. Leer el diff: `git diff --word-diff HEAD -- docs/fuente/*.md` (para un documento
   NUEVO, el archivo entero).
2. Clasificar cada cambio:
   - **Regla nueva** → propuesta de bloque nuevo en `docs/sistema.md`, con estado y fuente.
   - **Cambia algo `FIRME` ya implementado** → qué archivo de `src/lib/rules/` y qué test.
   - **Toca algo `INFERIDO`, `CONFLICTO` o una pregunta abierta** → qué supuesto o
     pregunta se cierra o se tumba.
   - **Solo redacción** → nada.
3. Entregarlo en un artifact; en el chat, solo el link.
4. Proponer las ediciones de `docs/sistema.md` y `docs/tareas.md` y esperar luz verde.
5. Commitear `docs/fuente/` con el mensaje `fuente: sync Drive AAAA-MM-DD`, para que
   `git log --grep "sync Drive"` liste todas las fotos con su fecha. Cada sync compara
   contra lo que hay en `docs/fuente/`, que siempre es la foto anterior: nunca hay que
   elegir contra qué commit comparar.

## Línea base (2026-10-14)

La primera foto se tomó el 2026-10-14 y no tiene diff: no hay versión anterior. Ponerse al
día con lo que el diseñador cambió antes de esa fecha es una **reconciliación por área**
(snapshot contra `docs/sistema.md` y `src/lib/rules/`, empezando por las tablas
numéricas), no un diff contra las transcripciones de los PDFs: tienen otro formato y
saldría todo como cambio. Estado en `docs/tareas.md`.

Excepción: `docs/Creación de Personaje.odt` (HOJA2) es la versión anterior del mismo
documento, así que ahí sí hay diff mecánico. Adelanto visto al montar el sync: Vida y
Fatiga pasan de 8 a 10 de base, las Dotes tienen ya presupuesto por prioridad
(18/15/12/9/6) y los topes de creación cambian de sitio.
