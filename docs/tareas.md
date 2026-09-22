# Tareas — Nueva Era

Qué está hecho y qué falta, en un solo sitio. Antes esto vivía repetido y desincronizado
entre `docs/traspaso.md`, `docs/plan-app.md` y el `## Pendiente` de `CLAUDE.md` — de hecho
`docs/prompt-relevo.md` llegó a dar por pendiente algo que ya estaba cerrado. Este archivo
sustituye a todo eso para el estado: **si vas a escribir "esto está pendiente" o "esto ya
está hecho" en cualquier otro documento del proyecto, para — va aquí, no allí.**

`docs/traspaso.md` explica cómo se trabaja (normas, trampas, mapa de archivos).
`docs/sistema.md` manda en las reglas del juego. Este archivo manda en el estado.

**Última actualización:** 2026-09-11.

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

**Extensión propuesta (2026-09-22, repaso de efectos especiales de equipo — idea del
usuario, corregida en conversación): RECURSOS — cargas de batería, munición, dosis,
gastadas y recargadas en partida.** No está en el MVP cerrado. Un personaje puede
llegar a llevar **6+ recursos distintos a la vez** (batería del Camuflaje, batería de
la Malla Plasmática, cargador de cada arma con capacidad propia, pilas del Visor
Nocturno, dosis del Inyector...) — no son dos campos más, es una lista de N recursos
por personaje, cada uno atado a una instancia de equipo concreta.
- **Precedente parcial, no la solución entera**: `ajustarRecurso()`
  (`master/combate/actions.ts:323-345`) ya resuelve el patrón de UI para PG/fatiga —
  delta manual, clamp a `[0, max]`, permiso para dueño del personaje **y** máster —
  pero hoy son dos columnas fijas del schema (`pgActual`/`fatigaActual`), no una
  lista dinámica. Habría que generalizar a algo tipo
  `recursos: { instanciaId, actual, max }[]`.
- **Candidatos reales ya en el catálogo, sin unificar entre sí**: `célula`
  (Subsistema: cargas/recarga/coste — Camuflaje Trifásico, Derivación Psiónica) y
  `cargador` (ArmaFuego: solo un número).
- **Dos formas de "automático" que NO son lo mismo, y las dos aportan valor sin
  romper "la app informa, no arbitra":**
  1. **Auto-poblar la lista de recursos desde el equipo** (al comprar una batería,
     aparece sola) — esto no es arbitrar nada, es lo mismo que ya hace toda la ficha
     hoy: derivar de lo que llevas equipado, no dar de alta a mano.
  2. **Avisos proactivos de insuficiencia** ("no tienes balas para F. Auto, pero sí
     para Ráfaga") — es información, no un bloqueo automático de la tirada. Encaja
     directo en el mecanismo del §8 de `docs/modificadores-tiradas.md`: un
     `CondicionTirada` de modo que lea el recurso restante y muestre el aviso, misma
     idea que el resto del texto informativo de esta tarea, con el recurso como
     fuente del número en vez de una dificultad fija.
  Lo único que sigue sin automatizarse es **el gasto en sí** — eso se queda manual
  (botones +/-), igual que PG/fatiga hoy.
- Sin diseñar del todo, sin construir.

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
El diseñador (Murillo) aún no ha escrito estos documentos. No hay nada que adelantar del
lado del código.

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
