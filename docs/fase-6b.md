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
- [ ] **1.3 — Permisos y server actions esqueleto.** Extender el criterio ya usado en
  `app/master/actions.ts` (rol `MASTER`, o dueño para lo que le corresponda al jugador
  según D2) a: crear/cerrar combate, añadir/quitar combatiente, mover turno, aplicar
  delta de PG/fatiga, aplicar/quitar estado. Sin UI todavía — solo las acciones y sus
  guardas, con algún test de permisos si el patrón lo pide.

## Bloque 2 — Consola del máster (MVP funcional de punta a punta)

- [ ] **2.1 — Crear combate + añadir jugadores.** Ruta dentro de `/master`. Elegir de la
  lista de `Character` existentes, copiar su `salud()` máxima calculada como punto de
  partida de "actual".
- [ ] **2.2 — Añadir NPC ad-hoc.** Nombre + PG sueltos, sin depender aún de 1.2/bloque 5.
- [ ] **2.3 — Cola de iniciativa.** Input manual de iniciativa por combatiente, ordenar
  automático, turno actual resaltado, botón "siguiente turno" (sube ronda al dar la
  vuelta), reordenar manual con flechas (nada de drag-and-drop, ver el brainstorm sobre
  por qué en móvil es mala idea).
- [ ] **2.4 — Delta de PG/fatiga.** Input rápido +N/-N con categoría de daño (no
  letal/letal/grave), target táctil grande. Enchufa con 0.2: los umbrales aparecen solos
  en cuanto baja el número, cero lógica nueva de UI para eso.
- [ ] **2.5 — Aplicar/quitar estado del catálogo.** Selector del catálogo de 0.3, grado si
  el estado lo tiene, duración en rondas (con el valor por defecto de 0.3 precargado,
  editable). Enchufa con 0.4.
- [ ] **2.6 — Descuento automático de duración.** Al avanzar turno/ronda (2.3), las
  `rondasRestantes` de cada estado activo bajan solas y el estado se cae a 0 sin que
  nadie lo quite a mano.

## Bloque 3 — Vista del jugador

- [ ] **3.1 — Tira de combate en la ficha.** Cuando hay un `Combate EN_CURSO` con el
  jugador dentro: su PG/fatiga actual, sus estados activos con su `detalle`, de quién es
  el turno, número de ronda. Mobile-first estricto, como el resto de la ficha.
- [ ] **3.2 — Autogestión de daño propio** (según D2). Mismo guardarraíl de permisos que
  el resto de acciones del jugador sobre su propia ficha.

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
