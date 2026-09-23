# Tareas — Nueva Era

Qué está hecho y qué falta, en un solo sitio. Antes esto vivía repetido y desincronizado
entre `docs/traspaso.md`, `docs/plan-app.md` y el `## Pendiente` de `CLAUDE.md` — de hecho
`docs/prompt-relevo.md` llegó a dar por pendiente algo que ya estaba cerrado. Este archivo
sustituye a todo eso para el estado: **si vas a escribir "esto está pendiente" o "esto ya
está hecho" en cualquier otro documento del proyecto, para — va aquí, no allí.**

`docs/traspaso.md` explica cómo se trabaja (normas, trampas, mapa de archivos).
`docs/sistema.md` manda en las reglas del juego. `docs/motor.md` manda en la
arquitectura — el modelo obligatorio para pasar cualquier elemento nuevo (equipo,
razas, poderes, dotes, aumentos) de prosa a motor. Este archivo manda en el estado.

**Última actualización:** 2026-09-24.

## Ahora mismo

La partida empieza el 23 de septiembre de 2026. Lo imprescindible del día uno — crear
personaje, saber a cuánto tiras, consultar el equipo — está hecho. Lo siguiente con más
valor: cerrar el diseño de la fase 6b (combate en vivo) o llevarle al diseñador las
preguntas abiertas de más impacto (ver el final de este documento).

---

## Hecho

### Fase 0 — Cimientos ✅
`schemaVersion`, tests del motor, reorganización de `lib/rules/`, cadena de migraciones
de ficha.

### Fase 1 — Motor de tiradas ✅ (completo, con Alerta incluida)
Tabla de dificultades, pares atributo+habilidad, chuleta de tiradas, lanzador de d12. La
Alerta se desbloqueó el 2026-09-10 al resolverse que Exploración sustituye a Supervivencia
(`C4` en `docs/sistema.md`).

**UX corregida 2026-09-23 (feedback del usuario probando el §8 de arriba):** pulsar
"Tirar" cerraba el modal de golpe — si la tirada estaba lejos en la lista (scroll
hecho), el jugador se quedaba mirando la lista de botones sin ver el resultado, que
solo se actualizaba arriba del todo (`Marcador`, fuera de la vista). El resultado
ahora se muestra **dentro del propio modal**, sustituyendo a los controles tras
pulsar Tirar, con un botón "Cerrar" explícito — nuevo componente compartido
`ContenidoResultado` (`src/components/ResultadoTirada.tsx`) que usan tanto
`TiradaModal` como el `Marcador` de `TiradasTab` (que se queda como log rápido, ya
no como única fuente del resultado). El usuario probará el feeling antes de decidir
si hace falta más (p. ej. un atajo de "tirar otra vez" en la misma pantalla).

### Fase 4 — Modificadores y especies ✅ (con especies provisionales)
Motor de modificadores (`Modificador` + `Fuente`, un único tipo de efecto para razas,
dotes, aumentos y equipo) y dos especies placeholder: Humano y Arkorü. Las especies reales
siguen bloqueadas por el diseñador — ver Pendiente.

### Fase 3 — Equipo ✅ catálogo cerrado (2026-09-11)
- **Tienda con presupuesto real.** `equiparAction`/`desequiparAction` cobran y devuelven
  `Character.creditos`; el precio se recalcula siempre en servidor (`costeDePieza`,
  `lib/rules/equipo.ts`), nunca se fía del cliente.
- **Tope de rareza por letra de Recursos** en creación (la ficha `DRAFT`); no aplica al
  máster, que puede equipar cualquier rareza en cualquier ficha.
- **Ranuras validadas en servidor**: subsistemas por armadura, compatibilidad de mejoras
  por tipo de arma (`puedeInstalar` en `lib/rules/equipo.ts`).
- **Equipo enganchado al resto del motor**: un arma equipada genera su propia tirada de
  ataque (`lib/rules/combate.ts`); armaduras y módulos aportan `ModificadorConFuente`.
- **Carga Transportable, primer pase.** `cargaMaxima()`/`pesoEquipado()` se muestran en
  Resumen. **Los penalizadores por exceso de carga y la Proeza de Fuerza siguen sin
  mecanizar** — hoy el peso solo se enseña, no penaliza. Ver Pendiente.
- Las tres tandas que faltaban por transcribir del catálogo (Medicina y Farmacia,
  Herramientas y Accesorios, Armamento Pesado + Granadas) están hechas, cada una
  enganchada a una tirada real donde `docs/equipamiento.md` daba un bono limpio que
  mecanizar. Detalle completo: `docs/sistema.md` §12.
- **Fuera del catálogo a propósito** (no son huecos por descuido) — ver Pendiente:
  Munición Especial y Armas Modificadas.

**Fix de rendimiento (2026-09-23, detectado por el usuario en producción):** cada
clic en el stepper de un atributo/habilidad durante la creación disparaba un
server action inmediato (`SELECT` + `UPDATE` a Postgres por clic, sin fusionar) —
subir una habilidad de 0 a 4 eran 4 round-trips en fila. `CharacterSheet.tsx` ya
tenía el patrón correcto para identidad (`scheduleIdentity`, debounce 500ms); se
generalizó a un helper `scheduleCommit(key, fn, onOk)` con un timer por campo
(`atributo:id`/`habilidad:id`), reutilizable cuando existan dotes/poderes (Fase 5).
Delay centralizado en `AUTOSAVE_DEBOUNCE_MS`. Sin riesgo de guardarraíl: durante
creación, cliente y servidor validan el pool de puntos con la misma función pura
(`creacion.ts`). **Sin test automatizado** — el proyecto no tiene infraestructura
de test de componentes React (`npm test` solo cubre `lib/rules/*.test.ts`);
verificado con `tsc --noEmit` y `lint` limpios más revisión manual del código,
no con un check en navegador.

### Fase 6a — Panel de máster ✅
- Schema: `status` (`DRAFT`/`APPROVED`), `approvedAt`, `xp`, `creditos` en `Character`,
  como columnas propias — no dentro de `stats`, porque los concede el máster, no el
  jugador, y compartir el JSON del autosave abriría una vía para que el jugador los
  tocara.
- Ruta `/master`: cola de fichas (`DRAFT` arriba, `APPROVED` abajo) con xp/créditos
  editables inline; tira solo-máster dentro de `characters/[id]`.
- Aprobar congela un snapshot de Atributos/Habilidades (`Character.approvedSnapshot`) que
  actúa de suelo: el jugador no puede bajar de ahí, solo comprar más. Revertir a `DRAFT`
  suelta el snapshot.
- Sin notificación en vivo — decisión explícita para esta fase, no un hueco: el jugador ve
  el cambio la próxima vez que entra a su ficha.

### Creación por prioridad — HOJA2 ✅ (no estaba en el plan original)
Llegó a mitad de la fase 6a y sustituye buena parte del motor de creación viejo: reparto
de letras A-E (`prioridad.ts`), coste triangular por nivel, Aplicados como media, Recursos
→ créditos iniciales, Altura/Peso. **Progresión con XP tras aprobar**: subir un
atributo/habilidad cuesta XP al mismo coste que en creación, nunca se puede bajar, y el
techo pasa a ser el del sistema (6) en vez del de creación (4). Fresh start hecho el
2026-09-10: no quedan personajes de prueba viejos que evitar tocar.

### El motor — MotorMetadata + arquitectura escalable ✅ (2026-09-23/24)
**El modelo entero vive en `docs/motor.md` — léelo antes de dar de alta cualquier
elemento nuevo (equipo, razas, poderes, dotes, aumentos), es de lectura obligatoria.**
Dos partes, las dos cerradas:

1. **Barrido de metadatos**: las 550 entradas `MotorMetadata` de las 215 piezas/niveles
   del catálogo de equipo (`src/lib/rules/motor.ts` + `src/lib/catalog/motor.test.ts`,
   en verde). Hecho por 4 forks en paralelo, uno por archivo — **una auditoría
   adversarial posterior encontró errores reales pese al test en verde** (una pieza
   "construida" que apuntaba a un id de tirada inexistente, una justificación de
   bloqueo copiada sin revalidar en 8 piezas, un campo entero sin declarar en 10
   armaduras, 3 fármacos mal tipados) — los 5 corregidos y commiteados. Lección para la
   próxima vez que se reparta trabajo de datos-con-juicio en paralelo: el test en verde
   prueba forma, no contenido, hace falta la auditoría después.
2. **Arquitectura escalable, construida y probada en vivo** (no solo propuesta): con
   ~300 elementos de capa 1 en camino (Poderes/Dotes/Ciberware, Fase 5) el proceso de
   generar la pestaña de Acciones tenía un cuello de botella real — `condicionesActivas()`
   se reescaneaba el equipo entero por cada fila mostrada, y `TiradasTab.tsx` no
   memoizaba nada. Construido: índice `Map` para `equipoPorId()`, un índice de
   condiciones construido una sola vez (`indiceDeCondiciones`/`consultaIndiceCondiciones`),
   memoización real en la pestaña, un registro `familia → generador` que sustituye los
   bucles hardcodeados de `combate.ts`, y el propio registro ya consulta
   `MotorMetadata.mecanismo` para decidir si genera una acción — `MotorMetadata` dejó de
   ser solo documentación. `src/lib/rules/capa1.ts` (`fuentesDeCapa1`) es el punto de
   extensión para cuando exista una segunda fuente de capa 1, todavía sin consumidores.
   Además, rename completo "Tiradas" → "Acciones" en código y UI (`docs/motor.md`
   §Escalabilidad, `docs/modificadores-tiradas.md` actualizado a la par) — el nombre ya
   encaja con que la pestaña vaya a acabar teniendo filas con y sin dado, pero esa parte
   (Acciones sin dado en sí) **sigue sin diseñar**, el rename no la adelanta.

**Catálogo dividido**, de paso: `src/lib/catalog/equipo.ts` pasó de 3222 a 190 líneas,
las 6 familias que vivían ahí (armaduras, armas de fuego, mejoras estándar, subsistemas,
movimiento, mejoras de arma) están en sus propios archivos, mismo patrón que ya usaban
`armasMelee.ts`/`armamentoPesado.ts`/`municion.ts`.

---

## Pendiente

### Fase 2 — Ficha viva (PG y fatiga en partida) ⬜
Ya no está bloqueada por la pregunta de si se lleva en vivo — se resolvió que sí. La
implementación (daño por categoría, estados activos con penalizadores automáticos, gasto
de fatiga, descanso) va dentro de la fase 6b, de la que es dependencia.

### Fase 6b — Panel de combate en vivo ⬜ (MVP funcional cerrado 2026-09-11, pausada)
**Hoja de ruta con subtareas, para ir cogiéndolas una a una: `docs/fase-6b.md`.** No
dupliques su detalle aquí — actualiza ese archivo al cerrar cada pieza y, cuando la fase
entera esté hecha, esta entrada pasa a ✅ con un resumen de dos líneas.

El camino completo funciona de punta a punta: crear/editar NPCs con ficha en un
catálogo propio, montar un combate, meter jugadores y NPCs, llevar la cola de turnos e
iniciativa, aplicar estados, y que un NPC ataque de verdad (tirada real, no PG a ojo).
Pausada aquí a propósito — lo que queda (clonar NPC en instancias numeradas, plantillas
de encuentro, y el bloque 6 de brillo: niebla, selección múltiple, log, aviso de turno,
historial) es todo azúcar sobre un MVP que ya sirve, y el bloque 6 en concreto está
pensado para después de probarlo en mesa real, no antes.

Resumen de la forma que tomó el diseño: instancias de `Combate` con `Combatiente`s
(jugador o NPC de catálogo — el NPC ad-hoc suelto se probó y se quitó, ver
`docs/fase-6b.md` "Catálogo de NPCs — rediseño"), motor de estados que reutiliza el
`OrigenModificador: "estado"` que ya existía reservado en `lib/rules/modificadores.ts`
desde la fase 4, y reactividad por polling inteligente para empezar (es mesa física, no
hace falta latencia de videojuego online) con SSE como mejora si hace falta.

**RECURSOS — cargas de batería, munición, dosis, gastadas y recargadas en partida.**
Propuesta 2026-09-22, **diseñado y construido 2026-09-22.** No estaba en el MVP
cerrado de fase 6b — se añade como extensión aparte. Un personaje puede llegar a llevar
**6+ recursos distintos a la vez** (batería del Camuflaje, batería de la Malla
Plasmática, cargador de cada arma con capacidad propia, pilas del Visor Nocturno,
dosis del Inyector...) — no son dos campos más, es una lista de N recursos por
personaje, cada uno atado a una instancia de equipo concreta.

- **Precedente parcial, no la solución entera**: `ajustarRecurso()`
  (`master/combate/actions.ts:323-345`) resuelve el patrón de UI para PG/fatiga —
  delta manual, clamp a `[0, max]`, permiso para dueño del personaje **y** máster —
  pero PG/fatiga son una **foto snapshot dentro de `Combatiente`** (se pierde al
  cerrar el combate, confirmado en el propio schema). RECURSOS necesita lo
  contrario: persistir fuera de combate, igual que el equipo.
- **Dónde vive**: dentro del `Sheet` (`Character.stats` y `NpcTemplate.stats`), NO en
  `Combatiente`. Como `Character` y `NpcTemplate` comparten el mismo `Sheet`, el
  panel de NPC lo hereda gratis — sin trabajo aparte, incluida la edición manual
  fuera de combate (mismo patrón que atributos/habilidades del NPC hoy).
- **Estructura**: `recursos: { instanciaId, actual, max }[]` en el `Sheet`, por
  instancia de pieza equipada (dos armas iguales = dos totales independientes).
  Se auto-puebla al equipar una pieza con `célula` (Subsistema) o `municion`
  (ArmaFuego), y desaparece al desequiparla.
- **Dos comportamientos de recarga distintos, no uno solo** (corrección en
  conversación tras un primer intento de unificarlos):
  1. **Balas** (`ArmaFuego.municion`): recurso tipo **stock**, sin cargadores
     individuales que rastrear (se ignora cuál está puesto, igual que en mesa) —
     un único total. Empieza en `actual = max = municion` al equipar el arma.
     Comprar "cargador de balas normales" **suma** `municion` tanto a `max` como a
     `actual` (sin tope superior — la Carga Transportable es el límite natural,
     aunque sus penalizadores siguen sin mecanizar). Precio fijo: **50 créditos**,
     válido para cualquier arma (no depende de su capacidad).
  2. **Batería** (`Subsistema.célula`): recurso tipo **tope fijo** — el máximo es
     la capacidad de la célula y no cambia nunca. Comprar "batería portátil"
     **recarga** `actual` a `max`, sin más. Precio fijo: **150 créditos**.
  Los dos ítems de prueba para testear esto: **batería portátil** (150 cr.) y
  **cargador de balas normales** (50 cr.) — comprar es una acción de tienda de
  efecto inmediato, no dejan objeto en el inventario ni ocupan ranura. Solo se
  pueden comprar para piezas que el personaje ya tiene equipadas (mismo patrón de
  compatibilidad que mejoras de arma/`puedeInstalar`).
- **Compatibilidad de "balas normales"**: genérico para toda `ArmaFuego` balística,
  con excepción explícita de la familia de energía (Láser/Plasma/Rayo — 12 piezas
  marcadas `tipoMunicion: "energia"` en `equipo.ts`), que necesita su propio tipo de
  recurso. El Cañón de Plasma (`armamentoPesado.ts`) queda fuera a propósito —
  `ArmaPesada` no entra en este primer pase de RECURSOS (ver más abajo).
- **Gasto por disparo**: confirmado que no existe una tabla "Ráfaga" separada en el
  catálogo — solo `"Simple"/"Estándar"/"Compleja"` (un disparo) frente a
  `"... (F. Auto)"` (automático). Regla: modo sin "F. Auto" gasta **1**; modo con
  "F. Auto" gasta **fijo = `municion` del arma** (el "cargador completo" ya
  documentado en `equipamiento.md`, ahora sin cargadores físicos que rastrear — el
  número no cambia aunque queden más balas sueltas en el stock).
- **Avisos proactivos de insuficiencia** ("no tienes balas para F. Auto, pero sí para
  disparo simple") — información, no bloqueo. Amplía el mecanismo del §8 de
  `docs/modificadores-tiradas.md` a `arma`/`armaMelee`, que hoy lo excluye a
  propósito (`condicionesActivas` solo recorre `mejoraEstandar`/`subsistema`/
  `herramienta`).
- **El gasto en sí sigue sin automatizarse** — se queda manual (botones +/-), igual
  que PG/fatiga hoy.
- **Gasto de recurso de un NPC durante un combate: escribe sobre `NpcTemplate.stats`
  en vivo, no sobre el `sheet` congelado de `Combatiente`.** Decisión explícita del
  usuario (2026-09-22), a sabiendas de que esto rompe el aislamiento que ese snapshot
  busca a propósito (`master/combate/page.tsx:29-33`: "editar la plantilla después no
  afecte a un combate en marcha") — si el máster edita la ficha del NPC a mitad de
  pelea, se mezcla con lo que pasa en el combate. Aceptado sin más: es el máster
  quien lo tocaría, y el efecto es menor que el de otros campos ya mutables en vivo.
  Sin problema equivalente para jugadores: un `Combatiente`-jugador nunca lleva
  `sheet` propio, siempre lee/escribe su `Character.stats` en vivo.
- Precios de los dos ítems de prueba, decisión del usuario sin base en `EQUIP`
  (`sistema.md` S17/S18).

**Construido 2026-09-22.** `lib/rules/recursos.ts` (nuevo, funciones puras: capacidad
por pieza, reconciliación, delta manual, comprar recarga, gasto por modo de disparo),
`sheet.ts` (`SCHEMA_VERSION` 5→6, migración 5→6 en `migraciones.ts`),
`equipo.ts` (rules: `equipar()`/`desequipar()` reconcilian; catalog: `tipoMunicion` en
`ArmaFuego`), `combate.ts` (aviso de insuficiencia en `tiradaDeArmaFuego`),
`characters/[id]/actions.ts` + `master/npcs/actions.ts` (`ajustarRecursoAction`/
`comprarRecargaAction` y sus gemelas NPC), `RecursosTab.tsx` (nuevo, compartido entre
ficha de jugador y editor de NPC). 27 tests nuevos (`recursos.test.ts` + casos en
`sheet.test.ts`/`migraciones.test.ts`/`combate.test.ts`), 355 en total, lint y
`tsc --noEmit` limpios. Probado en navegador con cuentas nuevas de jugador y máster:
auto-poblado al equipar, gasto manual, aviso de insuficiencia en el modal de tirada,
recarga tipo stock (balas) y tipo tope (batería) por separado, bloqueo por fondos
insuficientes, y — hallazgo corregido en el propio testing — una pieza YA equipada
antes de que existiera RECURSOS no se auto-poblaba hasta tocar el equipo; arreglado
moviendo la reconciliación también a `parseSheet()`, no solo a `equipar()`/
`desequipar()`, para que cualquier ficha vieja se ponga al día en la primera lectura.

**Fuera de alcance de este primer pase, a propósito:**
- `ArmaPesada`, `ArmaMelee` y `MunicionGranada` no aportan recurso — solo
  `ArmaFuego.municion` y `Subsistema.célula`. El Cañón de Plasma y el resto de
  Armamento Pesado se quedan para una extensión futura si hace falta.
- El gasto por modo usa la regla genérica confirmada en conversación (sin "F. Auto" =
  1, con "F. Auto" = `municion` fija), no el dato real por arma que da
  `equipamiento.md` en algunos casos — la Sydiasi, por ejemplo, documenta "consume 3
  disparos del cargador por ataque" en automático, no el cargador completo (20). Con
  la regla genérica se le cobran 20 en vez de 3. Decisión consciente tomada en el
  diseño (`docs/tareas.md`, "Gasto por disparo" arriba); un barrido pieza a pieza como
  el de `docs/equipo-efectos-especiales.md` lo afinaría si algún día compensa.
- No hay ningún atajo de +/- de recursos dentro de la consola de combate
  (`CombateConsole.tsx`) — el gasto de un NPC en plena pelea se hace desde su propia
  ficha (`master/npcs/[id]`), abierta aparte, no desde la fila del combatiente. La
  consola de combate no se tocó en absoluto en esta tarea.

### Equipo — mecanizar efectos especiales por pieza ⬜ (arrancada 2026-09-11)
**Hoja de ruta pieza a pieza: `docs/equipo-efectos-especiales.md`.** El catálogo de
equipo (fase 3) transcribió fielmente el texto de cada pieza, pero columnas como
"Crítico de Fusión (11)" son hoy decorativas — no mueven ningún número ni avisan de
nada al tirar. La tarea: un mecanismo genérico en `TiradasTab` (aviso, no
auto-aplicación — la app no arbitra) más el barrido pieza a pieza para poblarlo con
datos correctos. Sin empezar la implementación todavía, solo el diseño y el primer
mapeo (familia de armas de plasma).

**Consolidación, actualizada 2026-09-23** (arrancó 2026-09-22 porque el barrido
llevaba `docs/equipo-efectos-especiales.md`, `docs/modificadores-tiradas.md` §8 y
`docs/sistema.md` acumulando hallazgos sin orden de prioridad claro). Resumen
priorizado — la fuente detallada de cada uno sigue viviendo en su documento.

1. **✅ Hechos 2026-09-23:**
   - 🐛 Bug: Soporte Vital duplicaba su +1 a `salv_fortaleza` (aplicaba +2 real) —
     corregido, un modificador por nivel.
   - Fix: `tiradaDeArmaMelee` ahora vuelca `arma.efectos` al `nota`, igual que
     `tiradaDeArmaFuego` — visible en Tiradas todo el "Crítico de X" de Combate
     Melee que antes solo se veía en la ficha de Equipo.
   - Perf: debounce por campo (`scheduleCommit`, `AUTOSAVE_DEBOUNCE_MS`) en
     atributos/habilidades — antes cada clic de un stepper disparaba un
     round-trip completo a la DB, detectado por el usuario en producción.
   - **§8 de `docs/modificadores-tiradas.md` construido entero**:
     `condicionesActivas(sheet, ctx)` + `alcance`/`nota` en `CondicionTirada` +
     enganche en `TiradasTab`/`TiradaModal`. Dos casos reales migrados (Visor
     Nocturno n2, Visor Térmico n1). Desbloquea Fase 5 y el resto del barrido de
     equipo que solo necesitaba texto informativo (Mangual, Camuflaje
     Trifásico — ahora son migración de datos, no arquitectura).
   - Barrido de Subsistemas terminado entero (Escudo Deflector, Malla
     Plasmática, Proyector de Pulso) — ver `docs/equipo-efectos-especiales.md`.
   - 322 tests pasan, lint y `tsc --noEmit` limpios en todo lo anterior. Push a
     `main` hecho hasta el commit de los quick-wins y el fix de rendimiento —
     el commit del §8 pendiente de que el usuario pida el push.

2. **Preguntas para Murillo, ya redactadas, listas para soltar en tanda — coste es
   enviarlas, no construir nada:** preguntas 31 (Bloqueo del Mangual), 32
   ("susceptible a shock"/"apagón" sin definir), 33 (Canal de Alta Resonancia,
   %→+N) en `docs/sistema.md`. Ver "Preguntas al diseñador" al final de este
   documento para la lista completa por impacto, con la 29 (blindaje) incluida.

3. **Diseño pendiente que bloquea construcción real:**
   - **Hallazgo #5 — absorción de daño por blindaje** (prioridad alta, el usuario
     lo marca explícitamente). No existe cálculo en todo el motor; `sistema.md`
     pregunta 29/C11 sigue sin fórmula. Bloquea Mejora Ignífuga, Anticorrosivo n2,
     Tejido Conductor n2. Detalle: `docs/equipo-efectos-especiales.md`, hallazgo #5.
   - **RECURSOS — extensión de Fase 6b** (ver entrada de arriba). Bloquea
     Conversión Psiónica (Derivación Psiónica) y previsiblemente poderes/dotes que
     gasten cargas o fatiga en Fase 5.
   - **Hallazgo #3 — salvaciones sin especificidad** ("¿contra qué resistes?").
     Bloquea `arm2`/`me1`/`me5` y Munición Especial en cuanto se dé de alta
     (hallazgo #2). Detalle: `docs/equipo-efectos-especiales.md`, hallazgo #3.

4. **El barrido pieza a pieza en sí sigue mereciendo terminarse** (quedan ma2/ma4
   de Mejoras en Armas de Fuego, Munición, Otras Armas a Distancia, Armas
   Modificadas) — barato (lectura + anotación), da el mapa completo. La mayoría de
   lo ya marcado `✅ IMPLEMENTAR` con texto informativo ya se puede construir de
   verdad (el §8 existe); lo bloqueado por Hallazgo #3/#5 sigue esperando diseño.

### Fase 5 — Poderes, dotes, aumentos, especies reales ⬜ (bloqueado por el diseñador)
El diseñador (Murillo) aún no ha escrito estos documentos. No hay reglas que adelantar,
pero sí se adelantó la arquitectura que las va a recibir (ver "El motor — MotorMetadata +
arquitectura escalable" en Hecho): `fuentesDeCapa1` (`src/lib/rules/capa1.ts`) es el punto
de extensión ya construido para cuando exista una segunda fuente de capa 1, y el registro
`familia → generador` de `combate.ts` ya consulta `MotorMetadata.mecanismo` en vez de
tener familias hardcodeadas — dar de alta Poderes/Dotes/Ciberware el día que lleguen es,
en teoría, sumarlos a `fuentesDeCapa1` + registrar su generador, no rediseñar el proceso.

**Dependencia detectada (2026-09-21, repaso de efectos especiales de equipo):** el
estado `Shock` (`src/lib/catalog/estados.ts:670-678`) ya prevé una rama para
"equipamiento o armadura tecnológica" (resistencia = Estructura, no Fortaleza),
explícitamente sin mecanizar hoy porque no hay sintéticos ni aumentos en la ficha.
En cuanto arranque la Fase 5, revisar esto junto con la pregunta 32 de `sistema.md`
("susceptible a shock"/"apagón" sin definir, detectado en Inyector Hipodérmico/
Soporte Vital/Anticorrosivo/Tejido Conductor — `docs/equipo-efectos-especiales.md`
§Mejoras Estándar) — es la misma pieza de motor vista desde dos tareas distintas.

**Segunda dependencia, más grande (2026-09-21, mismo repaso — propuesta del usuario
de tratarla como mini épica propia):** antes de construir dotes/poderes/aumentos,
conviene resolver cómo llegan `CondicionTirada` (opciones seleccionables) y texto
informativo a **tiradas fijas** de `TIRADAS` (hoy solo funciona por arma concreta) —
problema completo en `docs/modificadores-tiradas.md` §8. Los modificadores numéricos
ya están resueltos y son extensibles sin cambios (`modificadoresActivos`); lo que
falta es específico de condiciones/texto, no de números. Sin diseñar, sin construir.

### Munición Especial ⬜
Mejora de arma (perforante, incendiaria, tóxica, electrizante, criogénica, corrosiva,
radiactiva, supresora). Su coste depende de qué munición cargues en el arma, y la munición
en general sigue aparcada hasta que el diseñador conteste la pregunta 7 de economía
(`docs/sistema.md`). Ver el comentario en `src/lib/catalog/equipo.ts` antes de
`MEJORAS_ARMA`.

### Armas Modificadas ⬜
Electrificantes, Térmicas, de Plasma, de Nanofilamento. Su coste es un **multiplicador**
sobre el precio de otra arma ya comprada ("Básico × 10"), no un objeto con precio propio —
no encaja en el patrón del catálogo (`coste: number` plano o por nivel) sin decidir antes
cómo modelar "coste = precio de otra pieza × N". Ver comentario de cabecera en
`src/lib/catalog/armasMelee.ts`.

### Penalizadores de Carga Transportable ⬜
La fórmula y el dato en pantalla ya están (Fase 3); falta aplicar los penalizadores por
exceso de carga (−25% malherido, −50% moribundo, −25% exhausto) y la Proeza de Fuerza.

### Sigilo / Visibilidad en combate ⬜ (idea sin construir, 2026-09-12)
Salió de revisar los penalizadores "al sigilo" de varias armas (`docs/
equipo-efectos-especiales.md`). Modelo propuesto por el usuario, pendiente de validar
con el diseñador — ver `docs/sistema.md` pregunta 25b: el sigilo no se re-tira en cada
instante, se tira una vez al esconderse y el margen queda como un valor persistente
("Escondido: X éxitos") hasta que ocurre un evento de alerta (disparo, alarma...), que
es lo que dispara el derecho a tirada de quien podría notarlo. Si se confirma, hace
falta un campo nuevo tipo **Visible / Escondido (X éxitos)** por combatiente — no
existe hoy ni en la ficha ni en la consola de combate. Sin empezar: es una pregunta de
reglas sin cerrar, no una tarea de implementación todavía.

### Búsqueda por texto en la Tienda ⬜
`TiendaTab` agrupa por familia y filtra "solo compatible ahora", pero no hay campo de
búsqueda libre. Con cientos de piezas en una pantalla estrecha, puede hacer falta antes de
que el grupo use la Tienda a fondo en mesa.

### Login con Google ⬜
Modelos `Account`/`Session` de Auth.js ya listos (adapter incluido); falta añadir el
provider en `src/auth.ts` y las credenciales `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`.

### PWA instalable ⬜
Sin empezar. Gana peso si la fase 6b lleva la app a mesa sin cobertura garantizada.

### Chat máster-jugador ⬜ (sin fecha)
Pedido por el usuario, pero es un modelo de mensajes y una UI nuevos, sin relación directa
con la ficha. No se diseña hasta que 6a y 6b estén cerradas.

---

## Preguntas al diseñador

Las 33 preguntas completas, numeradas, viven en `docs/sistema.md` → "Preguntas abiertas
para el diseñador". Por impacto:

1. **Notación de las tiradas** (`C8`): si "Perspicacia + Medicina" significa Biociencia
   con la especialidad Medicina, cambia el cálculo de media docena de tiradas.
2. **Capacidad de carga** (pregunta 26, parcialmente resuelta — ver Fase 3 y los
   penalizadores pendientes arriba).
3. **Especies, poderes, dotes y aumentos**: fases enteras esperando a que el diseñador las
   escriba.
4. **Absorción de daño por blindaje** (pregunta 29/`C11`, añadido 2026-09-22): sin
   fórmula, bloquea el Hallazgo #5 completo (`docs/equipo-efectos-especiales.md`) —
   Mejora Ignífuga, Anticorrosivo, Tejido Conductor, y cualquier futuro poder que
   ignore niveles de daño. El propio usuario la marca prioridad alta.
