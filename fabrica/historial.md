# Historial de fallos de la fábrica

Fallos de la propia fábrica (la línea, los scripts, los agentes), no de los trabajos que fabrica. Son la materia prima
para mejorarla: cada entrada dice qué pasó, por qué, cómo se arregló y qué aprendimos.

Formato: `F-xxx · fecha · dónde · estado (abierto | arreglado | asumido)`.

---

### F-016 · 2026-10-23 · Jefe y parser de "Puede tocar" (T-007) · abierto
**Qué pasó:** T-007 escaló con todo en verde salvo C2. El Jefe puso varias rutas en un bullet de "Puede tocar" con
líneas de continuación sangradas, y `puedeTocar` (`guion/contrato.mjs`) corta en la primera línea que no empieza por
`-`: se quedó con 3 de las 11 rutas y marcó 6 archivos legítimos como fuera. El constructor no podía arreglarlo y paró
con bloqueo en la vuelta 2 (~470k tokens para un falso fallo).
**Causa:** formato del contrato que el parser no admite, sin aviso: ni el inspector ni el Jefe ven qué rutas extrae.
**Arreglo:** contrato de T-007 rehecho con una ruta por línea (`alcance.mjs` pasa: 9 archivos, todos dentro).
Pendiente: que `puedeTocar` admita líneas de continuación, o que el guion pinte las rutas extraídas antes de construir.
**Lección:** si un script lee el contrato, el contrato tiene un formato; o se valida al encolar o se documenta en la
plantilla.

### F-015 · 2026-10-23 · Jefe, criterio que choca con la spec (T-005) · abierto
**Qué pasó:** el inspector devolvió T-005: C4 prohibía el botón "Abrir" en Básicas y la spec mandaba ahí Bloquear
daño, que lo lleva; además, dos puntos del alcance (orden de secciones, targets táctiles) sin criterio, pese al repaso
de F-014. Al probarlo, el usuario esperaba ver Favoritas, que era la fase 2 (T-006).
**Causa:** el Jefe escribió los criterios de navegador sin comprobar el texto real de cada fila, y el repaso de F-014
se hizo de memoria, no punto por punto. El reparto en dos T se dijo en el cuerpo del contrato, no arriba.
**Arreglo:** pendiente. Propuesta: en `jefe.md`, el repaso de F-014 se hace como tabla alcance → criterio dentro del
propio contrato, y un encargo partido en varios T lo dice en la primera línea del Encargo.
**Lección:** un criterio de navegador que nombra textos de la UI se escribe mirando esos textos en el código.

### F-014 · 2026-10-19 · Jefe, alcance sin criterio (T-002, T-003, T-004) · arreglado
**Qué pasó:** tres contratos seguidos devueltos por el inspector porque un punto del alcance (docs o comentarios) no
tenía criterio que lo comprobara.
**Arreglo:** en `jefe.md`, antes de enseñar el contrato, el Jefe repasa que cada punto del alcance tenga su criterio.
**Lección:** el inspector lo pilla siempre, pero cada devolución es una vuelta; mejor que el Jefe se lo revise antes.

### F-013 · 2026-10-19 · Jefe, contrato de un estreno (T-003) · arreglado
**Qué pasó:** el Jefe escribió los oráculos de C3-C9 con `montarTirada`, la API de hoy, que no existía en la base del
estreno (c164eca). El inspector lo pilló y devolvió el contrato.
**Causa:** el Jefe redactó mirando el código de main y no el de la base.
**Arreglo:** en `jefe.md` (paso 2): Con `base` distinta de main, el Jefe lee el código con `git show <base>:<ruta>`; y los oráculos
describen qué se comprueba, sin nombrar funciones si no hace falta. Contrato del T-003 corregido
(oráculos sin `montarTirada` y C13 nuevo).
**Lección:** el inspector funciona como segunda red también para los errores del Jefe.

### F-012 · 2026-10-19 · revisor y sección Construcción (T-002) · arreglado
**Qué pasó:** la estación dice que el revisor juzga el diff sin leer antes la Construcción, pero las dos secciones
están en el mismo archivo y la leyó. Lo reconoció él mismo como hallazgo.
**Arreglo:** se quita la regla imposible. El revisor puede leer la Construcción, pero su evidencia sale siempre del
oráculo de cada criterio; lo que diga el constructor no prueba nada.
**Lección:** una regla que la estructura no permite cumplir no es una regla.

### F-011 · 2026-10-19 · navegador del revisor (T-002) · arreglado
**Qué pasó:** el MCP chrome-devtools tenía el perfil cogido por otra sesión de Claude (pasa a menudo: el usuario
trabaja con varias sesiones a la vez). El revisor improvisó con `playwright-core` y funcionó.
**Arreglo:** el MCP chrome-devtools se lanza con `--isolated` (config global del usuario, `~/.claude.json`): perfil
temporal por instancia, sin logins guardados. Sin probar aún con dos sesiones a la vez.
**Lección:** una herramienta compartida entre sesiones es un recurso con cerrojo; la fábrica no puede depender de
que esté libre.

### F-010 · 2026-10-19 · lector de criterios (T-002) · arreglado
**Qué pasó:** al corregir el contrato tras la inspección se añadió un criterio "C6b". El lector solo reconocía
`C<número>` y se saltó la fila sin avisar: ni el revisor ni el juez la habrían comprobado. Se vio en la salida al
relanzar y se paró la línea a mano.
**Arreglo:** una fila de criterios con otro id rompe con error en vez de saltarse. El criterio pasó a C10.
**Lección:** un lector que descarta en silencio lo que no entiende convierte un error de forma en un agujero de
control. Mejor fallar ruidoso.

### F-009 · 2026-10-19 · juez, tabla del Juicio (T-001) · arreglado
**Qué pasó:** la tabla corta la evidencia a 140 caracteres y algunas quedan a medias ("recursos.ts:312 (").
**Arreglo:** la tabla corta por palabra y marca el corte con "…". La evidencia completa sigue en la sección Revisión.

### F-008 · 2026-10-19 · alcance de `docs/tareas.md` (T-001) · arreglado
**Qué pasó:** el trabajo cambió un comportamiento que describe la entrada RECURSOS de `tareas.md`, pero "Puede tocar"
solo dejaba "su línea". El constructor y el revisor lo vieron (hallazgo) y la entrada quedó desfasada; el usuario, en
su commit real, sí la actualizó.
**Arreglo:** el Jefe, al escribir "Puede tocar", incluye las entradas de `tareas.md` que describen lo que el trabajo
cambia (jefe.md y plantilla), y el constructor las pone al día.
**Lección:** una regla pensada para limitar ("solo su línea") también puede impedir lo correcto.

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
