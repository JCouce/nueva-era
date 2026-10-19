# La fábrica

Cadena de montaje para los cambios de Nueva Era: entra un encargo y sale una rama verificada que el usuario aprueba y
sube él. Todo lo de la fábrica vive en esta carpeta. En `.claude/` solo hay envoltorios finos que apuntan aquí, porque
Claude Code solo descubre skills, agentes y workflows en `.claude/`.

Este README es **la foto** de la fábrica: si cambia un proceso, cambia aquí (mapa y "Cambios de proceso"). El
artifact "Dosier de mantenimiento", pestaña Fábrica (https://claude.ai/artifact/RRrCuBcYGau6F7shAvWQ5m), es la
versión visual y se regenera desde aquí en cada hito. Estado y plan: `docs/tareas.md`, épica "La fábrica".

## Mapa de procesos

```
 encargo ─▶ [P1 Contrato] ─(tu ok)─▶ [P2 Línea] ─▶ contigo / escalado / error ─▶ [P3 Cierre] ─▶ contrato en main
                 ▲      │                 │
                 │      └─ duda de reglas ─▶ tú o Murillo
                 └──── inspección devuelve ┘
 cualquier fallo de la fábrica ─▶ [P5 Historial]          repetir un trabajo pasado ─▶ [P4 Estreno] (P1-P3 con `base`)
```

| Proceso | Qué lo dispara | Quién | Qué deja escrito |
|---|---|---|---|
| **P1 Contrato** | Un encargo tuyo (2-4 frases) a `/fabrica` | Jefe, dos árbitros de reglas y tú | `trabajos/T-xxx.md` en `spec`; con tu ok, `encolado`. El Jefe lee el código y las reglas; las dudas de reglas van antes a dos árbitros (lentes precedentes y fuente): si coinciden con cita, se aplican y las ves en "Decisiones de reglas"; si no, te llegan a ti o a Murillo (`jefe.md`, `estaciones/arbitro.md`) |
| **P2 Línea** | Tu ok al contrato | Guion de Workflow: inspector → constructor → revisión (script + revisor) → juez, hasta 2 vueltas | La rama `fabrica/T-xxx-<slug>` (solo código), las secciones de cada estación en el contrato y las entregas JSON. Detalle en "Cómo se usa" |
| **P3 Cierre** | Tu Decisión (`aprobado`, `descartado` o `pide cambios`) | Jefe y tú | Métricas y retro en el contrato; `cerrar.mjs` lo commitea en main. El worktree y la rama, solo si tú lo dices |
| **P4 Estreno** | Querer medir la fábrica con un trabajo que ya hiciste | Jefe y tú | Un contrato con `base: <commit anterior>`: la rama sale de antes del arreglo y a los agentes se les prohíbe mirar main. Se cierra como `descartado` y la rama se conserva para comparar |
| **P5 Historial** | Cualquier fallo de la fábrica (no del trabajo), aunque la línea acabe bien | Quien lo vea | Una entrada `F-xxx` en `historial.md`: qué pasó, causa, arreglo y lección |

## La línea por dentro

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
| Árbitros de reglas | Resuelven dudas de reglas con cita (precedente o texto fuente) antes de preguntar; dos lentes, si discrepan escala | `estaciones/arbitro.md` | examinado (2026-10-19) |
| Inspector | Comprueba que cada criterio es observable y tiene un oráculo independiente | `estaciones/inspector.md` | escrito |
| Constructor | Implementa la spec en un worktree, rama `fabrica/T-xxx-<slug>` | `estaciones/constructor.md` | escrito |
| Revisión, script | Tests, tsc, lint y push seguro | `comprobaciones/` | escrito (tanda 2) |
| Revisión, LLM | Criterios que no son comandos, y la UI en el navegador | `estaciones/revisor.md` | escrito |
| Bloqueos | Hook que corta push, `prisma migrate`, seeds y `.env` (también en Grep y Glob) | `hooks/` | escrito (tanda 2) |
| Agentes | Envoltorios finos: herramientas en lista blanca y "lee tu estación" | `.claude/agents/fabrica-*.md` | escrito (tanda 2) |
| Orquestador | Guion de Workflow: orden, puertas y vueltas en código | `guion/linea.js` | hecho (tanda 3) |
| Scripts de la línea | Estado del contrato, worktree, revisión por script, alcance (C2) y cierre del trabajo | `guion/*.mjs` | hecho (tanda 3) |
| Juez | Reglas fijas, sin LLM: un "falla" devuelve; a la tercera o ante diseño, escala | `juez/juez.mjs` | hecho (tanda 3) |
| Entregas | Lo que decide cada estación, en JSON junto al contrato (`.revision`, `.votos`, `.obra`) | `guion/entregas.mjs` | hecho |
| Operario | Agente que ejecuta tal cual los scripts deterministas del guion (un guion no tiene shell) | `.claude/agents/fabrica-operario.md` | hecho (tanda 3) |
| Skill | `/fabrica`: carga `jefe.md` y lanza el guion | `.claude/skills/fabrica/SKILL.md` | hecho (tanda 3) |
| Visor | Un trabajo en vivo en la terminal: estaciones, criterios, juez, cronómetro y fallos del operario | `panel/ver.mjs` | hecho |
| Panel | Un único artifact con todos los trabajos, que mantiene el Jefe | — | tanda 5 |
| Trabajos | Los contratos; viven en main y se commitean al cerrar | `trabajos/` | `T-000` es el ejemplo |
| Historial | Los fallos de la propia fábrica y qué aprendimos de cada uno | `historial.md` | abierto |

## Reglas que no se negocian

- El push es siempre del usuario. Nada de la fábrica hace push, migra contra una BD, lanza seeds ni toca `.env`.
- Quien construye no se pone la nota, y quien propone (el Jefe) tampoco.
- Los criterios se congelan con el ok del usuario. Cada uno lleva su oráculo, y ese oráculo no puede depender del
  constructor.
- Sin evidencia, el veredicto es "falla". Un revisor sin oráculo puede anotar, pero no vota.
- Como mucho 2 vueltas y 3 trabajos abiertos a la vez.
- Los límites van en las herramientas de cada agente y en el hook, no en el prompt.
- Lo que decide va en un archivo estructurado; lo que explica, en el md. Ningún LLM lleva datos de un paso a otro:
  cada estación escribe su resultado en un JSON junto al contrato (`guion/entregas.mjs`) y el código lo lee de ahí.
  Los comandos que teclea el operario son fijos y cortos (rutas y números), nunca llevan datos.
- Un trabajo que cambie `prisma/schema.prisma` escala al usuario: en el N1 los worktrees comparten la BD local.
- Hay un solo proceso y no tiene excepciones, aunque el trabajo sea mínimo (incluida su línea en `docs/tareas.md`).
  Si algún tipo de trabajo necesita otro camino, se crea como un proceso nuevo de la fábrica.

## Cómo se usa

`/fabrica` en la sesión principal: carga `jefe.md` y esa sesión pasa a ser el Jefe. Con tu ok al contrato, el Jefe
lanza el guion (`Workflow({ scriptPath: 'fabrica/guion/linea.js', args: { contrato: '<ruta absoluta>' } })`). El
guion no sale en la lista de workflows: `.claude/workflows/` no admite envoltorios (sin imports), y duplicarlo no
compensa.

Qué hace el guion, en orden:

1. Contrato a `inspeccion` (solo si estaba en `encolado`) y `preparar.mjs`: worktree en `../nuevaEra-trabajos/T-xxx`
   con la rama del contrato, `node_modules` clonado (APFS; Turbopack no acepta un enlace que salga del proyecto), el
   cliente de Prisma generado y `.env` enlazado al del repo (nunca copiado; si apunta a `neon.tech`, no se enlaza y lo
   avisa). Idempotente.
2. Inspector, que lee el código de la base en ese worktree (no tiene shell). Si devuelve, el contrato vuelve a `spec`,
   el worktree se queda y la línea acaba en `vuelve al jefe`.
3. Hasta 3 intentos (2 vueltas): contrato a `construyendo` (borra las entregas del intento anterior) → constructor en
   el worktree → `revision.mjs` (`revisar.mjs` dentro del worktree + `alcance.mjs`, a `trabajos/.revision-T-xxx.json`)
   → revisor, para los criterios que no son C1 ni C2, que escribe sus votos en `trabajos/.votos-T-xxx.json` → juez,
   con un comando fijo (`juez.mjs <contrato> --vuelta N --operario f/l`) que lo lee todo de esos archivos.
   Si el constructor para, deja `trabajos/.obra-T-xxx.json` con el bloqueo: `revision.mjs` se salta la revisión y el
   juez escala.
4. `contigo`, `escalado` o `error`: se para y el Jefe te lo cuenta.

Para verlo mientras corre, abre un split de Ghostty y deja ahí `npm run fabrica:ver` (sin argumento coge el trabajo
activo más reciente; si no, `-- T-xxx` o la ruta del contrato). Se redibuja solo al cambiar el contrato o su
`.revision-T-xxx.json`; `q` o Ctrl+C para salir. `-- --una-vez` lo pinta una vez en texto plano, para pegarlo en un
chat. El cronómetro y los fallos del operario salen de `inicio`, `fin` y `operario` del frontmatter, que escriben
`contrato.mjs estado` y el juez (el guion les pasa `--operario <fallos>/<llamadas>`).

Quién vota qué: C1 lo vota el script (tests y tsc), C2 el alcance, el resto el revisor, y "script" (lint, ficha y
prod) también vota. Si se toca la BD (`bd` de `revisar.mjs`), escala.

El contrato vive en main (`fabrica/trabajos/`) y todas las estaciones escriben en esa copia. La rama lleva solo
código, así que su merge es limpio. Con tu Decisión escrita, el Jefe cierra el trabajo con `cerrar.mjs`, que pone
`hecho` o `descartado` y commitea en main solo el contrato (`git commit --only`, sin arrastrar lo que haya en el
índice). Después te ofrece quitar el worktree y, si se descartó, la rama.

## Usarlo tú antes de un push

```
npm run fabrica:revisar                    # tests, tsc, lint de lo tocado y push seguro, contra origin/main
npm run fabrica:revisar -- --solo-diff     # solo las reglas de push seguro (ficha, bd, prod)
npm run fabrica:test                       # tests de la propia fábrica
npm run fabrica:ver -- --una-vez T-001     # cómo va un trabajo, una vez y sin colores de pantalla
```

Sale con código 1 si algo falla. `--base`, `--head` y `--json` para otros rangos o para el juez.

## Construcción por tandas

1. Los papeles: contrato, prompts y este mapa. **Hecha.**
2. Las barreras: comprobaciones y bloqueos. **Hecha.**
3. La línea: el guion que mueve un trabajo. **Hecha** (probada con un arnés; con agentes reales, en el estreno).
4. El estreno: repetir un trabajo pasado y compararlo con el del usuario. **En curso** (T-001 y T-002 cerrados, T-003 en
   marcha).
5. El panel: ver qué hizo cada trabajador.
6. El rodaje: los primeros trabajos reales.

## Cambios de proceso

Las decisiones que cambian cómo funciona la fábrica, con su porqué. Los fallos van en `historial.md`.

| Fecha | Cambio | Por qué |
|---|---|---|
| 2026-10-16 | Nace la fábrica: contrato, Jefe, inspector, constructor y revisor (tanda 1) | Automatizar el desarrollo con una línea verificable |
| 2026-10-16 | Un solo proceso, sin excepciones, aunque el trabajo sea mínimo | No saltarse las reglas cuando conviene; lo distinto será un proceso nuevo |
| 2026-10-19 | Barreras: `revisar.mjs` y hook de bloqueos por agente (tanda 2) | Los límites en las herramientas, no en el prompt |
| 2026-10-19 | La línea como guion de Workflow, con juez de reglas fijas y operario (tanda 3) | Orden y puertas en código; el juez no es un LLM |
| 2026-10-19 | El contrato vive en main y se commitea al cerrar; la rama lleva solo código (P3) | Merge limpio y se guardan también los descartados (F-004) |
| 2026-10-19 | El operario se queda, pero se mide su ratio de fallos | Si pasa del 5 %, scripts más gordos o salir del Workflow |
| 2026-10-19 | Campo `base` en el contrato (P4) | Repetir trabajos pasados para medir la fábrica |
| 2026-10-19 | Lo que decide va en JSON junto al contrato; ningún LLM lleva datos entre pasos | F-006: los datos en un comando se corrompían |
| 2026-10-19 | El worktree se prepara antes de la inspección | F-005: el inspector no podía leer el código |
| 2026-10-19 | Visor de terminal `fabrica:ver` | Seguir un trabajo en vivo |
| 2026-10-19 | "Puede tocar" incluye las entradas de `tareas.md` que el trabajo deja desfasadas | F-008 |
| 2026-10-19 | El revisor puede leer la Construcción, pero solo vota con oráculo | F-012: la regla anterior no se podía cumplir |
| 2026-10-19 | El Jefe busca precedente en `sistema.md` antes de preguntar y lee el código de la `base` | 1 de 3 preguntas del T-003 ya tenía respuesta (S9); F-013 |
| 2026-10-19 | La UI la juzga el usuario en la Decisión; el revisor da evidencia y opina como hallazgo | Lo subjetivo no tiene oráculo |
| 2026-10-19 | Árbitros de reglas en P1: dos agentes (precedentes y fuente) resuelven las dudas lógicas; si discrepan o es gusto o diseño, al usuario o a Murillo | La mayoría de las dudas son lógicas; el usuario solo debería decidir las suyas |
| 2026-10-19 | Examen de los árbitros (12 dudas con respuesta conocida + 4 de Murillo): con la regla de las dos lentes, 3 de 4 aplicadas bien, 0 inventadas; lo que hace el código ya no cuenta como precedente | El único fallo grave (S23) tomó lo construido por lo decidido |

