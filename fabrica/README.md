# La fábrica

Cadena de montaje para los cambios de Nueva Era: entra un encargo y sale una rama verificada que el usuario aprueba y
sube él. Todo lo de la fábrica vive en esta carpeta. En `.claude/` solo hay envoltorios finos que apuntan aquí, porque
Claude Code solo descubre skills, agentes y workflows en `.claude/`.

Mapa visual y decisiones: artifact "Dosier de mantenimiento", pestaña Fábrica
(https://claude.ai/artifact/RRrCuBcYGau6F7shAvWQ5m). Estado y plan: `docs/tareas.md`, épica "La fábrica".

## El recorrido

```
Tú ⇄ Jefe ──(tu ok)──▶ cola ─▶ inspector ─▶ constructor ─▶ revisión ─▶ juez ─▶ tú (push)
                                   │            ▲          script + LLM    │
                                   │            └── falla un criterio ─────┘   (máx. 2 vueltas)
                                   └─ criterio sin oráculo: vuelve al Jefe
                                                       duda de diseño: escala ─▶ tú
```

| Pieza | Qué hace | Archivo | Estado |
|---|---|---|---|
| Jefe de fábrica | Convierte la conversación en contrato con el usuario, lanza la línea e informa. No juzga | `jefe.md` | escrito |
| Contrato | Una ficha por trabajo; cada estación escribe solo su sección | `contrato/plantilla.md` | escrito |
| Inspector | Comprueba que cada criterio es observable y tiene un oráculo independiente | `estaciones/inspector.md` | escrito |
| Constructor | Implementa la spec en un worktree, rama `fabrica/T-xxx-<slug>` | `estaciones/constructor.md` | escrito |
| Revisión, script | Tests, tsc, lint y push seguro | `comprobaciones/` | escrito (tanda 2) |
| Revisión, LLM | Criterios que no son comandos, y la UI en el navegador | `estaciones/revisor.md` | escrito |
| Bloqueos | Hook que corta push, `prisma migrate`, seeds y `.env` (también en Grep y Glob) | `hooks/` | escrito (tanda 2) |
| Agentes | Envoltorios finos: herramientas en lista blanca y "lee tu estación" | `.claude/agents/fabrica-*.md` | escrito (tanda 2) |
| Orquestador | Guion de Workflow: orden, puertas y vueltas en código | `guion/` | tanda 3 |
| Juez | Reglas fijas: un "falla" devuelve; a la tercera o ante diseño, escala | `juez/` | tanda 3 |
| Panel | Un único artifact con todos los trabajos, que mantiene el Jefe | — | tanda 5 |
| Trabajos | Los contratos; llegan a main con la rama de cada trabajo | `trabajos/` | `T-000` es el ejemplo |

## Reglas que no se negocian

- El push es siempre del usuario. Nada de la fábrica hace push, migra contra una BD, lanza seeds ni toca `.env`.
- Quien construye no se pone la nota, y quien propone (el Jefe) tampoco.
- Los criterios se congelan con el ok del usuario. Cada uno lleva su oráculo, y ese oráculo no puede depender del
  constructor.
- Sin evidencia, el veredicto es "falla". Un revisor sin oráculo puede anotar, pero no vota.
- Como mucho 2 vueltas y 3 trabajos abiertos a la vez.
- Los límites van en las herramientas de cada agente y en el hook, no en el prompt.
- Un trabajo que cambie `prisma/schema.prisma` escala al usuario: en el N1 los worktrees comparten la BD local.
- Hay un solo proceso y no tiene excepciones, aunque el trabajo sea mínimo (incluida su línea en `docs/tareas.md`).
  Si algún tipo de trabajo necesita otro camino, se crea como un proceso nuevo de la fábrica.

## Cómo se usa

Hoy, hasta la tanda 3, se usa a mano: el Jefe es la sesión de Claude con la que hablas, y las estaciones se lanzan una
a una con sus prompts. Con la tanda 3, la skill `/fabrica` carga `jefe.md` y el guion mueve la línea.

## Usarlo tú antes de un push

```
npm run fabrica:revisar                    # tests, tsc, lint de lo tocado y push seguro, contra origin/main
npm run fabrica:revisar -- --solo-diff     # solo las reglas de push seguro (ficha, bd, prod)
npm run fabrica:test                       # tests de la propia fábrica
```

Sale con código 1 si algo falla. `--base`, `--head` y `--json` para otros rangos o para el juez.

## Construcción por tandas

1. Los papeles: contrato, prompts y este mapa. **Hecha.**
2. Las barreras: comprobaciones y bloqueos. **Hecha.**
3. La línea: el guion que mueve un trabajo.
4. El estreno: repetir un trabajo pasado y compararlo con el del usuario.
5. El panel: ver qué hizo cada trabajador.
6. El rodaje: los primeros trabajos reales.
