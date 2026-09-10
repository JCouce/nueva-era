# Fase 6b — Gestor de combate: hoja de ruta

Desglose en subtareas del diseño cerrado con el usuario (ver `docs/traspaso.md` §9 para
el "por qué" de las decisiones de fondo, y el chat de diseño del 2026-09-11 para el
contexto completo). Cada bloque es un paso con sentido propio: se puede coger uno,
cerrarlo, comitear, y dejar el resto para otra sesión sin dejar nada a medias.

> **Nombre del archivo:** el usuario pidió `combat_manager_progress`; lo dejo en español
> y kebab-case como el resto de `docs/` (`plan-app.md`, `prompt-relevo.md`) y con el
> mismo código de fase que ya usáis en todos lados (`Fase 6b`) para que sea reconocible
> al instante — si prefieres el nombre original, se renombra sin coste.

**Cuando la fase entera esté cerrada**, este archivo se resume en un par de líneas dentro
de `docs/tareas.md` (Fase 6b pasa de ⬜ a ✅) y este documento queda como histórico — mismo
criterio que se aplicó con `docs/prompt-equipo.md` al cerrar el catálogo de equipo.

---

## Cómo coger una tarea

1. Marca la casilla con tu firma y fecha: `- [~] 1.2 — cogida (sesión 2026-09-12)`.
2. Al cerrarla: `- [x] 1.2 — hecha (2026-09-12), commit abc1234`.
3. Sigue las normas de siempre (`docs/traspaso.md` §4): test al lado de cada fórmula,
   verificación en Chrome si toca UI, migración si toca el schema, nada de rellenar en
   silencio lo que el sistema no define.
4. Respeta el orden de bloques — 1 depende de 0, 2 depende de 0+1, etc. — salvo que la
   propia tarea diga lo contrario.

---

## Decisiones tomadas para no bloquear (revisable, no es dogma)

No estaban cerradas al terminar el brainstorm; para no frenar el arranque, quedan así por
defecto — cualquiera se puede reabrir si al construir algo no encaja:

- **D1 — Alcance de esta pasada.** El catálogo de NPCs (bloque 5) y el brillo (bloque 6,
  niebla incluida) van **después** de tener un combate funcional de punta a punta con
  NPCs ad-hoc. No bloquean el MVP.
- **D2 — Jugadores pueden tocar su propio PG/fatiga** durante combate (mismo criterio de
  permiso que ya usa el resto de la ficha: dueño o máster). El máster no tiene que hacer
  de teclado para cada golpe que reciba cada jugador.
- **D3 — Reactividad: polling inteligente para empezar** (bloque 4). Argumento completo
  en el chat de diseño: es mesa física, no hace falta latencia de videojuego online. SSE
  queda anotado como mejora si en mesa real se siente lento, no como parte del MVP.
- **D4 — Niebla sobre NPCs (ocultar nombre/PG al jugador) fuera del MVP.** Es la pieza de
  más "brillo" pero también la que más UI nueva pide; se añade sin rehacer nada porque el
  campo `oculto` ya está en el modelo de datos desde el bloque 1.
- **D5 — Sincronización de un solo sentido: combate → ficha, nunca al revés** (charla con
  el usuario, 2026-09-11). El jugador **ve** su estado de combate en su propia ficha
  (PG/fatiga, estados activos y sus modificadores reflejados en la pestaña Tiradas — si
  tiene Confusión con -4 a distancia, lo ve ahí antes de tirar). Lo único que el jugador
  puede **escribir** hacia el combate es su propio PG/fatiga (D2) — un número objetivo,
  sin juicio de por medio. Todo lo demás que se planteó y se descartó explícitamente por
  esto: que el jugador tire su Iniciativa y la mande al combate (era la 3.3 de más abajo,
  eliminada), o cualquier otra acción que necesite que alguien arbitre un resultado
  (resistir un efecto, declarar una reacción...) — eso sigue siendo del máster, mismo
  principio fundacional de `docs/plan-app.md` §1 ("la app asiste, no arbitra"), aplicado
  ahora también a la dirección del dato, no solo a qué se mecaniza.

---

## El motor de estados: la idea que lo sostiene todo

Propuesta del usuario, y encaja mejor de lo esperado: **`OrigenModificador` ya tiene
`"estado"` como valor válido** (`lib/rules/modificadores.ts`), reservado desde que se
construyó el motor de modificadores en la fase 4 — hoy no lo produce nadie porque no hay
estado de combate en vivo. La fase 6b no inventa un sistema nuevo, **completa un enchufe
que ya estaba puesto**.

La forma: un catálogo estático `estados.ts` (como `especies.ts`, `equipo.ts`) donde cada
uno de los ~20 estados de `docs/sistema.md` §7 declara qué `Modificador[]` produce — los
mismos cuatro tipos que ya existen (`atributo`/`derivado`/`habilidad`/`tirada`), nada
nuevo que aprender. Un combatiente en combate guarda solo referencias ligeras
(`{estadoId, grado, rondasRestantes}`); una función `modificadoresDeEstados()` — calcada
de `modificadoresDeEquipo()` — las traduce a `ModificadorConFuente[]` con `origen:
"estado"`. Jugadores y NPCs comparten exactamente el mismo mecanismo: es agnóstico de
quién lo lleva puesto.

**Un matiz que hay que anotar, no resolver de más:** los NPCs del MVP son ligeros (nombre
+ PG + nota, sin atributos ni habilidades completas — ver bloque 1). Un estado con efecto
`tipo: "habilidad"` o `tipo: "tirada"` no tiene nada que modificar en un NPC así; solo
`tipo: "derivado"` (vida/fatiga) hace algo real. No es un bug: para un NPC, el resto del
efecto de un estado es información que el máster lee en la ficha del estado y arbitra a
ojo — coherente con "la app asiste, no arbitra". Si algún día los NPCs tienen ficha
completa, el resto de tipos empieza a aplicarles solo, gratis.

**Lo que sí hace falta añadir al motor:** hoy `AlcanceModificador` no tiene un "a todas
las tiradas" — los umbrales de salud (`-1/-3/-5 a todo` de Herido/Malherido/Moribundo,
`docs/sistema.md` §7) lo necesitan. Es el primer paso de construcción, bloque 0.

**Transcribir los 20 estados no es mecánico 1:1.** `docs/sistema-y-combate.md` mezcla
números limpios (`-4 en Perspicacia y Expresión`) con efectos narrativos que la app no
debe arbitrar (`50% de posibilidades`, `el narrador escoge una casilla`, `no puede
distinguir aliados de enemigos`). Mismo criterio que ya se aplicó a los Fármacos y a la
VTF del catálogo de equipo (`docs/sistema.md` §12): lo mecanizable se convierte en
`Modificador`, lo demás se queda en un campo de texto que la UI muestra como recordatorio
para el máster, sin intentar simularlo.

---

## Bloque 0 — Motor de estados (sin esto no hay nada que construir encima)

- [x] **0.1 — Alcance global en `AlcanceModificador`.** Hecha (2026-09-11). Caso
  `{ tipo: "todas" }` en `lib/rules/modificadores.ts` (`AlcanceModificador` + `alcanzaA`),
  documentado en `docs/modificadores-tiradas.md` §5 junto a los otros cuatro. Dos
  consumidores de UI (`PiezaDetalle.tsx`, `ResumenTab.tsx`) narrowaban el tipo asumiendo
  que "lo que no es tiradaId/grupo/habilidad es modo" — `tsc` los pilló solo, se les añadió
  el caso. Test en `modificadores.test.ts`. 256/256 tests, `tsc --noEmit` limpio.
- [x] **0.2a — Penalizador de tiradas por umbral de PG/fatiga.** Hecha (2026-09-11).
  `lib/rules/estados.ts` (nuevo, primera pieza — el resto llega en 0.3/0.4):
  `umbralSalud()`/`umbralFatiga()` clasifican PG/fatiga actual vs. máximo en
  normal/herido/malherido/moribundo (o normal/fatigado/exhausto), y
  `modificadoresDeUmbrales()` los traduce a `ModificadorConFuente[]` (`tipo: "tirada"`,
  `alcance: "todas"` de 0.1, `origen: "estado"`). Formalizados como supuestos S14 (los
  umbrales de un mismo recurso no se acumulan, solo el más profundo) y S15 (cómo se
  interpreta el "mínimo 1" de Moribundo/Exhausto) en `docs/sistema.md`. Test con las
  fronteras exactas (con PG máx=20: 10 normal, 9 herido, 5 herido, 4 malherido, 2
  malherido, 1 moribundo, 0 moribundo).
- [~] **0.2b — Velocidad y carga reducidas por umbral (mecanismo distinto a 0.2a).**
  Aparcada a propósito (usuario, 2026-09-11): Carga Transportable en general sigue
  `[PENDIENTE]` de penalizadores (ver `docs/tareas.md`), no tiene sentido mecanizar la
  mitad de ese hueco aquí antes de que esté cerrado del todo. Retomar cuando se
  desbloquee esa pieza, no antes.
  **Hallazgo al construir 0.2a:** "velocidad básica a la mitad" y "capacidad de carga
  -25%/-50%" (Malherido, Moribundo, Exhausto) **no son deltas planas** — son porcentajes
  sobre un valor ya calculado, y `Modificador` (0.1) solo suma/resta, no multiplica.
  Forzarlo ahí rompería el "un único tipo de efecto" de la fase 4. Pendiente decidir el
  mecanismo: lo más probable es que `movimiento()`/`cargaMaxima()`
  (`lib/rules/derivados.ts`) acepten el umbral ya calculado por 0.2a y apliquen el
  multiplicador al final de la función, fuera del pipeline de `Modificador` — a
  confirmar al cogerla. La reducción de Moribundo ("una casilla por turno") es aún más
  especial: no es ni delta ni porcentaje, es un tope fijo que ignora las fórmulas.
- [x] **0.3 — Catálogo `src/lib/catalog/estados.ts`.** Hecha (2026-09-11). Los 20 estados
  de `docs/sistema.md` §7 (Fatiga y Heridas no cuentan aparte: son los umbrales que ya
  deriva 0.2a; Muerte tampoco: es un marcador del `Combatiente`, no un estado con
  duración — ver el comentario de cabecera del catálogo). Metodología fijada como **S16**
  en `docs/sistema.md`: se mecaniza un número que reduce un atributo básico directamente
  o penaliza "todas las tiradas" sin condición; el resto (penalizadores a "tiradas que
  usen" un atributo/aplicado concreto, daño narrado, velocidad/carga, condiciones que
  dependen del narrador) se queda en `detalle`. **Segundo hueco del motor encontrado al
  transcribir** (el primero fue "todas" en 0.1): no hay alcance de modificador para
  "cualquier tirada que use tal atributo/aplicado" — aparcado igual que 0.2b, anotado en
  el catálogo y en S16 por si algún día compensa cerrarlo. 10 tests de integridad +
  contenido (`estados.test.ts`). 282/282 en total, `tsc`/`lint` limpios.
- [x] **0.4 — `lib/rules/estados.ts`: `modificadoresDeEstados()`.** Hecha (2026-09-11).
  Tipo `EstadoActivo = {estadoId, gradoId, rondasRestantes}` (la forma que necesitará
  `Combatiente.estados` en el bloque 1, sin comprometerse todavía al schema exacto de
  Prisma) + `modificadoresDeEstados()`, calcada de `modificadoresDeEquipo()`: un
  `estadoId`/`gradoId` que no exista en el catálogo se ignora sin reventar, igual que un
  `catalogoId` huérfano. `fuente` es el `label` del estado (no del grado — un combatiente
  solo lleva un grado de cada estado a la vez, no hace falta distinguir más en el
  desglose). 6 tests nuevos. 288/288 en total, `tsc`/`lint` limpios.
  **Con esto se cierra el bloque 0** — el motor de estados está completo y probado, listo
  para que el bloque 1 le dé un sitio donde vivir de verdad (hoy sigue desconectado de
  cualquier ficha, ver la respuesta a "¿se puede aplicar un estado ahora?" del
  2026-09-11).

## Bloque 1 — Modelo de datos y permisos

- [x] **1.1 — Schema: `Combate` y `Combatiente`.** Hecha (2026-09-11). `Combate` (estado
  `EN_CURSO`/`TERMINADO`, ronda, `turnoIndex`, timestamps). `Combatiente` (`combateId`,
  `characterId` opcional — null es NPC ad-hoc por ahora, `NpcTemplate` llega en 1.2 —,
  `nombre` copiado al añadir, `pgActual`/`pgMax`/`fatigaActual`/`fatigaMax` como **foto**
  del momento de añadir, no derivado en vivo, `iniciativa`, `orden` para reordenar a mano,
  `estados Json` con `EstadoActivo[]` de `lib/rules/estados.ts`, `oculto` para la niebla
  de 6.1, `derrotado` en vez de borrar la fila). Ni uno ni otro viven en `Character.stats`
  — mismo motivo que `xp`/`creditos`. Migración `20260910154742_combate_combatiente`
  aplicada en local. Sin "una sola EN_CURSO a la vez" en el schema — se valida en el
  server action de 1.3, no hay forma limpia de expresarlo en Prisma sin SQL a mano.
  **Efecto colateral corregido de paso:** el `select` dinámico de `adjustResource`
  (`app/master/actions.ts`) dejó de tipar bien al crecer `Character` con la relación
  nueva — cambiado a un `select` fijo. `tsc`, 288/288 tests y lint limpios.
- [x] **1.2 — Schema: `NpcTemplate`.** Hecha (2026-09-11). `nombre`/`pgBase`/`nota`
  (opcional), en base de datos y no en `catalog/` como TypeScript — a diferencia de
  especies/equipo, esto no son reglas del diseñador, son los PNJs de esta mesa, así que
  los crea el máster, no un desarrollador. `Combatiente.npcTemplateId` (opcional, junto a
  `characterId`) enchufado de paso — cierra los tres orígenes posibles de un combatiente
  (jugador / NPC de catálogo / NPC ad-hoc) que quedaron abiertos en 1.1. Migración
  `20260910155125_npc_template`.
  **Para crear samples e iterar sin esperar a la UI del máster (subtarea 5.1):**
  `npm run seed-npcs` (`scripts/seed-npcs.mjs`, mismo patrón que `make-master.mjs` —
  `pg` a pelo, sin pasar por el cliente de Prisma). Hace upsert por nombre, así que
  edita `SAMPLES` en el script y vuelve a correrlo cuando quieras probar otros NPC;
  verificado con 3 de ejemplo, creados la primera vez y actualizados la segunda.
  `tsc`, 288/288 tests y lint limpios.
- [x] **1.3 — Permisos y server actions esqueleto.** Hecha (2026-09-11).
  `app/master/combate/actions.ts`: `crearCombateAction`/`terminarCombateAction`,
  `agregarJugadorAction`/`agregarNpcDeCatalogoAction`/`agregarAdHocAction`,
  `marcarDerrotadoAction`, `avanzarTurnoAction` (sube ronda al dar la vuelta a la cola,
  sin saltar derrotados — eso es UX de la 2.3), `ajustarPgAction`/`ajustarFatigaAction`
  (D2: el dueño del Character también puede, no solo el máster), `aplicarEstadoAction`/
  `quitarEstadoAction` (valida contra el catálogo de 0.3; aplicar de nuevo un estado
  sustituye el grado, no lo acumula — mismo criterio que `modificadoresDeEstados()`).
  Patrón de retorno tipado `{ok:true} | {ok:false, error}`, como
  `characters/[id]/actions.ts`, no el FormData+no-op de `master/actions.ts` — esto
  alimentará una consola interactiva (bloque 2), no formularios sueltos.
  **Refactor de paso:** `canEditCharacter` no tenía test — vivía en `auth-helpers.ts`,
  que importa `next/navigation`/`@/auth` y no carga bajo `node --test`. Se extrajo (junto
  al nuevo `canAdjustCombatiente`) a `lib/permisos.ts`, puro y sin esas dependencias;
  `auth-helpers.ts` lo reexporta, así que ningún import existente se rompe. 8 tests
  nuevos de permisos.
  **Verificado con un smoke test manual** (no commiteado, borrado al terminar) contra
  Postgres real: crear combate, añadir NPC de catálogo y ad-hoc, aplicar delta de PG con
  clave calculada, aplicar/sustituir estado en el Json, avanzar turno con vuelta de
  ronda, marcar derrotado, terminar combate — los 10 pasos correctos, sin dejar basura en
  la base. No hay UI que verificar en Chrome todavía (eso es 2.x).
  `tsc`, 295/295 tests y lint limpios.

## Bloque 2 — Consola del máster (MVP funcional de punta a punta)

- [x] **2.1 — Crear combate + añadir jugadores.** Hecha (2026-09-11).
  `/master/combate` (`page.tsx` + `CombateConsole.tsx`, cliente): sin combate en curso,
  botón "Crear combate"; con uno activo, ronda, lista de combatientes con PG actual/máximo
  y lista de personajes que faltan por añadir (excluye a los que ya están en fila no
  derrotados, mismo criterio que valida el server action). Enlazado desde `/master` con
  una tarjeta "Gestor de combate". No usa el patrón FormData+no-op de
  `MasterControls.tsx`: llama directo a las acciones tipadas de `combate/actions.ts` y
  refresca con `router.refresh()`, como ya hace `CharacterSheet.tsx` con las suyas.
  **Verificado en Chrome con datos reales** (usuario MASTER, personajes "villa"/"gordo"
  ya existentes): crear combate → ronda 1, cola vacía → añadir "villa" → aparece con
  PG 9/9 (actual = máximo) y desaparece de "añadir" → terminar combate → vuelve al
  estado inicial. Limpieza confirmada, sin tocar los personajes reales.
  **Trampa real encontrada:** el dev server llevaba corriendo desde antes de los modelos
  `Combate`/`Combatiente`/`NpcTemplate` (bloque 1) — su cliente de Prisma en memoria no
  los tenía, `/master/combate` caía con `Cannot read properties of undefined (reading
  'findFirst')`. Exactamente la trampa ya anotada en `docs/traspaso.md` §5 ("reinicia el
  dev server"); confirma que ese aviso sigue vigente y hay que seguirlo al pie de la
  letra tras cualquier migración.
- [x] **2.2 — Añadir NPC ad-hoc.** Hecha (2026-09-11). Formulario nombre + PG dentro de
  `CombateConsole.tsx`, llama a `agregarAdHocAction` (ya existía desde 1.3). Botón
  deshabilitado hasta que los dos campos tienen algo; se vacían solos tras añadir, para
  meter varios de seguido sin tocar el ratón de más. Verificado en Chrome: dos NPC
  distintos añadidos uno detrás de otro sin pisarse (15/15 y 8/8 PG cada uno).
- [x] **2.3 — Cola de iniciativa.** Hecha (2026-09-11). Tres acciones nuevas en
  `combate/actions.ts` (no estaban en el esqueleto de 1.3, hacían falta para esto):
  `establecerIniciativaAction`, `ordenarPorIniciativaAction` (descendente, `sort()` estable
  — un empate lo desempata quien ya iba primero) y `moverCombatienteAction` (flechas
  ▲/▼, intercambia `orden` con el vecino). Las tres recalculan `Combate.turnoIndex` para
  que el turno siga al **mismo combatiente**, no a la posición numérica — el riesgo que ya
  avisaba el comentario de `turnoIndex` en `schema.prisma` desde el bloque 1.
  **Verificado en Chrome con el caso que de verdad importa**: turno en Alfa → ordenar por
  iniciativa (Alfa acaba último) → seguía diciendo "Turno de: Alfa", no saltó a quien
  ocupa ahora su posición vieja. Turno en Beta → bajar a Beta un puesto con la flecha →
  seguía diciendo "Turno de: Beta". Iniciativa persiste tras F5. Flechas de los extremos
  deshabilitadas correctamente.
  **Bug real encontrado y arreglado en la propia verificación** (no a ojo — con
  `getComputedStyle` en el DOM): el resaltado del turno activo (`border-accent` sobre
  `HudCard`) no se veía — `border-border`, ya presente en `HudCard`, le ganaba el cascade
  a igual especificidad en Tailwind v4. Arreglado con `!border-accent`. **El mismo patrón
  sin el `!` ya existía antes en `TiradasTab.tsx` y `TiendaTab.tsx`** — no revisado si ahí
  también falla, anotado como trampa en `docs/traspaso.md` §5.
  `tsc`, 295/295 tests y lint limpios.
- [x] **2.4 — Delta de PG/fatiga.** Hecha (2026-09-11). Un input `±N` por combatiente
  (sin `useState` — se lee del DOM al aplicar y se limpia a mano; con la cola llena, un
  input controlado por fila fuerza re-render de toda la lista en cada tecla) + dos
  botones grandes ("Aplicar a PG"/"Aplicar a fatiga"), reutilizando
  `ajustarPgAction`/`ajustarFatigaAction` de la 1.3 (ya clampaban a `[0, máximo]`, nada
  nuevo que tocar ahí).
  **Recorte deliberado sobre lo escrito originalmente aquí:** sin selector de categoría
  de daño (no letal/letal/grave). `docs/sistema.md` §7 dice que las tres restan el mismo
  número de los mismos PG — solo cambia cómo se cura, y eso no está mecanizado. Un
  selector que no mueve ningún cálculo sería decorativo, y aquí no se hace eso (S16).
  **Verificado en Chrome**, clamps en los dos extremos confirmados (-50 a un 20/20 deja
  0/20, no negativo; +100 a un 20/20 deja 20/20, no se pasa) y un caso borde a propósito:
  aplicar delta de fatiga a un NPC con fatiga máxima 0 (los NPC ligeros no la llevan) no
  revienta, se queda en 0/0 sin error — mismo `Math.max(0, Math.min(máx, actual+delta))`
  que ya cubre PG. Probado también con un personaje real (villa, PG 9/9 → 6/9).
  `tsc`, 295/295 tests y lint limpios.
- [x] **2.5 — Aplicar/quitar estado del catálogo.** Hecha (2026-09-11). Nuevo componente
  `CombatienteRow` (antes vivía inline en el `.map()`): las filas ganaron suficiente
  estado propio — qué estado/grado está elegido ahora mismo en el desplegable, cuya
  duración depende del grado — que ya no cabía en el patrón de refs sin control del
  delta de PG/fatiga (2.4), donde nunca hacía falta reaccionar a una elección a medias.
  Desplegable de estado (los 20 de 0.3), desplegable de grado que solo aparece si el
  estado tiene más de uno, campo de rondas precargado con el valor por defecto de ese
  grado y editable, botón "Aplicar estado" (enchufa con `aplicarEstadoAction` de la 1.3).
  Insignias con "×" para quitarlo (`quitarEstadoAction`), con el grado entre paréntesis
  solo cuando el estado tiene más de uno (para no repetir "Atrapado (Atrapado)").
  **Bug propio encontrado y arreglado antes de verificar** (releyendo el código, no en
  Chrome): el cálculo de esa condición usaba `grados.length` (los grados del
  desplegable, el estado que se está a punto de elegir) en vez de `estado.grados.length`
  (los del estado real de esa insignia) — un desajuste sutil entre "lo que se está
  editando" y "lo que ya está aplicado" en el mismo componente.
  **Verificado en Chrome**, con el caso exacto que motivó el arreglo: insignia de
  Aturdido (4 grados) → `"ATURDIDO (ÉXITO) · 1R"`; insignia de Atrapado (1 grado) →
  `"ATRAPADO"`, sin paréntesis. Duración se recalcula sola al cambiar de grado. Catálogo
  del desplegable confirmado: los 20, sin Fatiga/Heridas/Muerte.
  `tsc`, 295/295 tests y lint limpios.
- [x] **2.6 — Descuento automático de duración.** Hecha (2026-09-11).
  `descontarDuracion()` (nuevo, `lib/rules/estados.ts` — pura, con test, calcada del
  resto del motor de estados) descuenta una ronda a cada estado activo con duración
  conocida y filtra los que llegan a 0; `rondasRestantes: null` ("sin límite", varios
  estados del catálogo no dan una por defecto) no se toca. `avanzarTurnoAction` (1.3) la
  aplica a todos los combatientes en la misma transacción que mueve el turno — "un turno
  que pasa" descuenta para cualquiera, no solo para quien tiene el estado puesto.
  **Bug propio corregido antes de escribir el test:** el primer filtro de qué filas
  escribir comparaba longitudes de array ("¿se cayó algún estado?") en vez de "¿había
  algo que descontar?" — con eso, una duración que baja de 3 a 2 rondas (sigue en la
  lista, no se cae) nunca se habría guardado, y el contador se habría quedado congelado
  hasta el último tick. Corregido a "escribe si el combatiente tenía algo antes",
  independientemente de si algo se cae en este paso.
  **Verificado en Chrome con los tres casos que importaban**: duración 2 → "· 1R" tras
  un turno → insignia desaparece del todo tras el siguiente; un estado sin duración
  (Atrapado) sobrevive intacto a tres avances de turno seguidos.
  5 tests nuevos. `tsc`, 300/300 tests y lint limpios.

**Con esto se cierra el bloque 2 — hay un gestor de combate funcional de punta a punta,
verificado en Chrome paso a paso: crear combate, añadir jugadores y NPC ad-hoc, cola de
iniciativa con turno que sobrevive a reordenar, daño y curación con clamps correctos,
aplicar/quitar estados del catálogo con su duración descontándose sola.** Checklist de
pruebas manuales exhaustivas (no solo el camino feliz de cada subtarea) en
`docs/pruebas-integrales.md`. Añadir NPC
*desde* el catálogo de `NpcTemplate` (en vez de solo ad-hoc) sigue siendo la 5.2, no se
adelantó aquí — `agregarNpcDeCatalogoAction` existe desde la 1.3 pero no tiene UI todavía.

## Bloque 3 — Vista del jugador

- [x] **3.1 — Tira de combate en la ficha.** Hecha (2026-09-10, sesión de relevo).
  Cuando hay un `Combate EN_CURSO` con el
  jugador dentro: su PG/fatiga actual, sus estados activos con su `detalle` **visible de
  verdad, no en un tooltip** (hallazgo real de uso: la consola del máster lo esconde en
  un `title`, que en móvil no existe — arreglarlo ahí también, no hace falta esperar a
  este bloque), de quién es el turno, número de ronda. Mobile-first estricto, como el
  resto de la ficha.
  **Ampliación decidida con el usuario (2026-09-10, sesión de relevo), no estaba en el
  diseño cerrado del 2026-09-11 tal como estaba escrito arriba:** dos piezas, no una —
  una tira compacta (mini-HUD, junto al de especie/PV/fatiga que ya existe) visible en
  **todos** los tabs de la ficha con lo esencial (PG/fatiga propios, ronda, si es mi
  turno), y una **tab nueva "Combate"** con la cola completa — todos los combatientes,
  no solo el propio, con su PG/fatiga y sus estados con detalle. Motivo: sin ver a los
  demás no hay contexto táctico (si el enemigo está aturdido, por ejemplo) antes de
  actuar. No choca con D4 (niebla sobre NPCs, bloque 6, todavía sin construir): hoy
  "todo visible" es lo coherente porque no hay niebla que aplicar — el día que 6.1 se
  construya, se le pone un filtro encima a esta misma vista, no hace falta rehacerla.
  Solo aparece (tira y tab) si el `Combatiente` del jugador existe en el combate
  `EN_CURSO` actual — si su personaje no está metido en el combate, no hay "su combate"
  que mostrar (mismo criterio que ya fijaba la redacción original).
  **Implementación:** `lib/rules/estados.ts` gana `describirEstadosActivos()` (con
  test), que traduce `EstadoActivo[]` a `{label, detalle, rondasRestantes}` — antes vivía
  inline en `CombateConsole.tsx`, ahora compartida con la ficha del jugador y con el
  fix del `title`. `characters/[id]/page.tsx` consulta el `Combate EN_CURSO` (mismo
  patrón que `master/combate/page.tsx`) y decide si el personaje tiene fila dentro;
  `CharacterSheet.tsx` recibe `combate: CombateView | null`, pinta la tira compacta
  junto al HUD existente (fuera del switch de tabs, visible en todos) y añade
  condicionalmente el tab "Combate" (`_components/CombateTab.tsx`, solo lectura, cola
  completa). El tab activo se deriva en render (`activeEfectivo`), no con un `useEffect`
  + `setState` (el linter de React lo rechaza — "you might not need an effect"), para el
  caso borde de que el combate termine con el tab "Combate" todavía abierto.
  **Verificado en Chrome con una sesión de jugador real** (primera vez en toda la fase
  que hay UI de jugador — hasta ahora D2 solo se probaba por test unitario): cuenta y
  personaje de prueba nuevos (`qa-player-31@test.local` / "QA Combatiente", borrados al
  terminar), metido en un combate real junto a `villa` desde la consola de máster (otra
  pestaña, contexto de Chrome aislado), con un delta de PG (8→5) y "Aturdido (Fracaso
  crítico)" aplicados. En la ficha del jugador: tira compacta con "RONDA 1", "TU TURNO"
  en accent, PG 5/8, el estado con su detalle en texto plano (no title); tab "Combate"
  con las dos filas (la propia marcada "(TÚ)", la de villa sin estados), turno y ronda
  correctos. Sin combate, ni la tira ni el tab aparecen. Captura de pantalla a 390px
  confirma el layout mobile-first sin overflow. Mismo detalle visible confirmado también
  en `CombateConsole.tsx` (el fix de la consola del máster). `tsc`, 305/305 tests y lint
  limpios.
- [ ] **3.1b — Los modificadores de los estados activos entran en la pestaña Tiradas**
  (D5: la mitad "combate → ficha" de la sincronización). Si el máster le aplica Confusión
  con -4 a distancia, el jugador lo ve reflejado ahí antes de tirar, no solo como
  insignia informativa. El motor ya existe entero (`modificadoresDeEstados()`, fase 0) —
  lo que falta es que `modificadoresActivos(sheet)` (o quien alimenta `TiradasTab`) sume
  también los estados del `Combatiente` del jugador cuando hay un combate activo, no solo
  los de la ficha en sí.
- [ ] **3.2 — Autogestión de daño propio** (D2). Mismo guardarraíl de permisos que el
  resto de acciones del jugador sobre su propia ficha. Es la única vía "ficha → combate"
  que existe — todo lo demás que se planteó (que el jugador tire su Iniciativa y la
  mande al combate) se descartó explícitamente por D5: sincronización de un solo
  sentido, ver la decisión arriba.

## Bloque 4 — Reactividad

- [ ] **4.1 — Polling inteligente.** Hook compartido: activo solo mientras hay un
  `Combate EN_CURSO`, se pausa si la pestaña está en background
  (`document.visibilitychange` o el equivalente de la librería de fetching que se elija),
  intervalo corto (3-5s), refresco manual como red de seguridad.
- [ ] **4.2 — (Evaluar después de probar en mesa) Migrar a SSE si el polling se siente
  lento.** No es parte del MVP (D3) — anotado aquí para que no se pierda si hace falta.

## Bloque 5 — Catálogo de NPCs y plantillas de encuentro

- [ ] **5.1 — UI del máster para `NpcTemplate`.** Crear/editar/listar, mismo patrón de
  formulario que el resto del panel de máster. **Al cerrarla, actualiza la sección "NPCs"
  de `CLAUDE.md`** — hoy documenta `npm run seed-npcs` como atajo explícito porque esto
  no existe; que no se quede diciendo eso cuando ya haya UI de verdad.
- [ ] **5.2 — Añadir al combate desde catálogo**, en vez de solo ad-hoc (2.2).
- [ ] **5.3 — Clonar NPC en varias instancias numeradas** ("Goblin #1, #2, #3"), cada una
  con su propio PG — el ahorro de tiempo real de Combat Manager, según el brainstorm.
- [ ] **5.4 — Plantillas de encuentro.** Guardar un grupo de `NpcTemplate` ya montado y
  añadirlo entero a un combate de un tap.

## Bloque 6 — Brillo (después de validar el MVP en mesa real)

- [ ] **6.1 — Niebla sobre NPCs** (D4): el jugador ve "Enemigo A" sin nombre/PG exacto
  hasta que el máster lo revela. El campo `oculto` de 1.1 ya está listo para esto.
- [ ] **6.2 — Selección múltiple** para aplicar daño/estado a varios combatientes a la vez
  (áreas de efecto).
- [ ] **6.3 — Log de acciones** en texto plano ("El Máster aplicó Aturdido a Kai").
- [ ] **6.4 — Aviso de turno.** Vibración (solo Android, iOS Safari no soporta la
  Vibration API) o notificación push si para entonces hay PWA instalable — la pieza que
  le daría sentido de verdad a esa tarea pendiente.
- [ ] **6.5 — Historial de combates archivados**, consultable, no se borran al terminar.
