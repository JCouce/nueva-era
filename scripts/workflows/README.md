# scripts/workflows/ — scripts de apoyo para los Workflows de `.claude/workflows/`

## Por qué existe esta carpeta

Un Workflow (`.claude/workflows/*.js`) corre en un runtime sandboxeado: sin
acceso a filesystem, sin `Date.now()`/`Math.random()`, sin `import` de módulos
del proyecto — solo los primitivos del propio tool (`agent()`, `pipeline()`,
`parallel()`, `log()`). Eso es perfecto para orquestar agentes, pero inútil
para preparar los datos que el workflow necesita como `args`: leer el
catálogo real, transformarlo, escribirlo a un `.json`.

Esa preparación tiene que vivir fuera del sandbox, como script de Node
normal. Aquí es donde va — separado de `.claude/workflows/` porque no puede
vivir ahí (el tool no lo dejaría), y en su propia carpeta dentro de `scripts/`
(no sueltos junto a `make-master.mjs`/`seed-npcs.mjs`) para que se note de un
vistazo qué scripts pertenecen a qué workflow.

## Convención de nombres

Cada script de aquí comparte el prefijo con el Workflow al que sirve, más un
sufijo que dice qué hace:

| Workflow (`.claude/workflows/`) | Script de apoyo (aquí) | Qué hace |
|---|---|---|
| `auditoria-motor-metadata.js` | `auditoria-motor-metadata-extraer.ts` | Extrae el catálogo de equipo (`EQUIPO`) a JSON — eso es lo que se pasa como `args` al workflow. |
| `modelar-area.js` | `modelar-area-extraer.ts` | Trocea la transcripción de un área (`docs/psionica.md`...) en lotes por disciplina e items por acción, con el contexto cerrado del motor (tipos, mecanismos, acciones). `--calibracion` vuelca piezas de equipo auditadas con su `MotorMetadata` real como referencia. |

Un grep del nombre del workflow encuentra todo lo suyo, esté donde esté.

## Cómo se ejecutan

Todos necesitan el mismo loader que usan los tests, porque el código del
catálogo usa imports sin extensión (`"./armasFuego"`) que Node no resuelve
solo:

```
node --import ./scripts/test-resolver.mjs scripts/workflows/<script>.ts [argumentos]
```

## Objetivo de la carpeta

Crece con cada Workflow nuevo que necesite un paso de preparación de datos —
no todos lo necesitan (un Workflow que solo orquesta agentes sobre algo que
ya le pasas a mano no necesita nada de aquí). Cuando se añada uno:

1. El Workflow en sí va a `.claude/workflows/<nombre>.js`.
2. Su script de apoyo (si hace falta) va aquí, `scripts/workflows/<nombre>-<rol>.ts`.
3. Se añade una fila a la tabla de arriba.

No es un sitio para scripts sueltos sin Workflow asociado — esos siguen
yendo directos en `scripts/` (como `make-master.mjs`/`seed-npcs.mjs`).
