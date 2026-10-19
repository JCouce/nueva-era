# Historial de fallos de la fábrica

Fallos de la propia fábrica (la línea, los scripts, los agentes), no de los trabajos que fabrica. Son la materia prima
para mejorarla: cada entrada dice qué pasó, por qué, cómo se arregló y qué aprendimos.

Formato: `F-xxx · fecha · dónde · estado (abierto | arreglado | asumido)`.

---

### F-007 · 2026-10-19 · juez, relanzar un trabajo · arreglado
**Qué pasó:** visto al arreglar F-006, sin que llegara a ocurrir. El juez daba por buena `.revision-T-xxx.json` si
era de la misma vuelta y rama. Al relanzar un trabajo (tras un escalado o un `error`), la vuelta vuelve a 0: si
`revision.mjs` no llegaba a escribir, se juzgaba con la de la ejecución anterior. Con `.votos` pasaría lo mismo.
**Arreglo:** `contrato.mjs estado construyendo` borra `.revision`, `.votos` y `.obra` al empezar cada intento.
**Lección:** un archivo de entrega vale para un intento; quien empieza el intento limpia los del anterior.

### F-006 · 2026-10-19 · juez (T-001, estreno) · arreglado
**Qué pasó:** la línea abortó en el juez con `suma` dos veces seguidas. El trabajo estaba bien (script, alcance y
revisor en verde).
**Causa:** los veredictos del revisor iban como JSON dentro de un heredoc en el comando del operario, con
espacio/punto/=/guion escritos como `\uXXXX` para no disparar el hook de bloqueos. El operario copió el comando
exacto (su suma era la esperada), pero a bash le llegaron los `\uXXXX` ya decodificados. El arnés de pruebas
ejecutaba bash directo y no pasaba por ese camino.
**Arreglo:** los datos ya no viajan en comandos. El revisor escribe sus votos en `trabajos/.votos-T-xxx.json` y el
constructor, si para, `trabajos/.obra-T-xxx.json`; el juez los lee y valida (un `.votos` ausente o mal formado hace
fallar los criterios del revisor con el motivo, sin abortar). El comando del juez es fijo y sin datos. Fuera la suma.
**Lección:** pasar datos por el texto de un comando que teclea un LLM es frágil por dos lados (la transcripción y las
capas que tocan el comando antes de bash). Y un arnés que se salta el camino real no prueba ese camino.

### F-005 · 2026-10-19 · inspector (T-001, estreno) · arreglado
**Qué pasó:** el guion le dijo al inspector que leyera el código de la base con `git show`, pero el inspector no tiene
Bash. Juzgó solo el contrato, sin mirar el código.
**Causa:** el prompt del guion pide algo que las herramientas del agente no permiten.
**Arreglo:** `preparar.mjs` va antes de la inspección y el inspector lee la base en el worktree con Read (rutas
absolutas). Revisados los demás prompts contra sus herramientas: al revisor le faltaba Write para crear `.votos`.
**Lección:** cada instrucción del guion tiene que poder cumplirse con las herramientas de ese agente.

### F-004 · 2026-10-19 · contrato y merge (tanda 3) · arreglado
**Qué pasó:** el contrato estaba sin commitear en main y commiteado en la rama; al traer la rama, Git se negaba a pisarlo.
**Arreglo:** opción C: la rama lleva solo código y el contrato se commitea en main al cerrar (`cerrar.mjs`).
**Lección:** cada archivo tiene que tener una sola casa.

### F-003 · 2026-10-19 · worktree sin `.env` (tanda 3) · arreglado
**Qué pasó:** el revisor no podía levantar la app en el worktree (sin `AUTH_SECRET` ni BD).
**Arreglo:** `preparar.mjs` enlaza el `.env` del repo, salvo que apunte a Neon. Ningún agente lo lee.

### F-002 · 2026-10-19 · worktree y Turbopack (tanda 3) · arreglado
**Qué pasó:** con `node_modules` enlazado, Turbopack revienta ("points out of the filesystem root").
**Arreglo:** `node_modules` clonado con `cp -cR` (APFS, instantáneo).

### F-001 · 2026-10-16 · agentes nuevos (tanda 2) · asumido
**Qué pasó:** una sesión abierta antes de crear los agentes `fabrica-*` no los ve ("Agent type not found").
**Arreglo:** reiniciar la sesión tras crear agentes, skills o workflows.
