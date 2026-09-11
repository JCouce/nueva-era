# Encargo: seguir con el gestor de combate (fase 6b)

> Prompt listo para pegar entero en una sesión nueva (otro agente, o tú mismo más
> adelante) para retomar el gestor de combate — no el proyecto entero, para eso está
> `docs/prompt-relevo.md`. Este vive mientras dure la fase 6b; cuando cierre entera, se
> archiva igual que ya le pasó a `docs/prompt-equipo.md`.

## Antes de nada: lee esto, en este orden

1. **`docs/traspaso.md`** — normas de trabajo, trampas conocidas.
2. **`docs/tareas.md`** — estado global del proyecto, para no perder el panorama.
3. **`docs/fase-6b.md`, entero** — la hoja de ruta del gestor de combate: subtareas,
   decisiones D1-D6, y el estado exacto de los bloques 0-4 y del rediseño del bloque 5.
   Es la fuente de verdad de por dónde va esto — no lo repito todo aquí, solo lo
   suficiente para no tener que leerlo de cabo a rabo antes de arrancar.
4. **`docs/pruebas-integrales.md`** — checklist de pruebas manuales del bloque 2. Sin
   hallazgos reales pendientes (los 2 que dejó un `/loop` anterior se reprodujeron a
   mano y se descartaron; el bloque 2.2 completo quedó revertido, ver más abajo).

## Estado de git: hay trabajo sin pushear

**2 commits en local sin subir a `origin/main`** (`97272e3` y `4fc6534`, el backend del
catálogo de NPCs). El resto de la fase (hasta `4f12d09`, "Comenzar combate") ya está en
producción. **No hagas push sin que el usuario lo pida explícitamente en el momento** —
norma del proyecto, un push a `main` despliega a Vercel. Comprueba `git log --oneline
origin/main..HEAD` al arrancar para confirmar qué hay sin subir en el momento en que
retomes esto (puede haber cambiado si el usuario pusheó él mismo).

## Dónde está la fase ahora mismo

**Bloques 0 (motor), 1 (datos y permisos), 2 (consola del máster, con la ampliación
2.7), 3 (vista del jugador) y 4.1 (polling) cerrados.** 4.2 (SSE) sigue condicional, no
la adelantes sin probar 4.1 en mesa real primero. El bloque 5 (catálogo de NPCs) está
**rediseñado a fondo** y con el backend ya cerrado (5.0, 5.0b) — lo que sigue es UX
(5.1 en adelante). Ese rediseño es el grueso de lo que hay que saber para continuar,
detallado más abajo.

Tres ampliaciones sobre el diseño original del 2026-09-11, todas decididas con el
usuario al construir (no estaban en el brainstorm inicial):

- **Bloque 3 (2026-09-10):** no solo una tira compacta con el propio combatiente, sino
  también una **tab "Combate"** con la cola completa (todos los combatientes, no solo el
  propio) — sin ver a los demás no hay contexto táctico. Detalle en la entrada de 3.1.
- **2.7 (2026-09-11):** "Comenzar combate" separado de "Crear combate" —
  `EstadoCombate` gana `PREPARANDO` antes de `EN_CURSO`. El máster monta la escena sin
  que el jugador vea nada, y solo al pulsar "Comenzar combate" el jugador empieza a
  verlo (D5). **Ojo si tocas el polling o `characters/[id]/page.tsx`:** ahí se encontró
  un bug real — el polling estaba condicionado a `combate !== null`, pero esa prop es
  `null` mientras el jugador no ve el combate (`PREPARANDO`), así que nunca arrancaba y
  el jugador se quedaba colgado sin enterarse. Arreglado con un polling siempre activo
  en la ficha del jugador (intervalo largo mientras no hay nada que ver, corto en cuanto
  lo hay).
- **Bloque 5 (2026-09-11): rediseño completo del catálogo de NPCs**, ver la sección
  siguiente — es la pieza grande pendiente de UX ahora mismo.

D5 (sincronización de un solo sentido, combate → ficha) y D2 (el jugador toca su propio
combatiente) están verificados de punta a punta con UI real de jugador — antes solo
tenían cobertura de `permisos.test.ts`.

## El siguiente paso: bloque 5 — Catálogo de NPCs, backend cerrado, falta la UX

### Por qué cambió (contexto, no repetible sin leerlo)

Los NPCs del MVP (bloque 1) eran "ligeros" (nombre+PG+nota, sin ficha) — no podían
tirar. Con encuentros de hasta 30-50 combatientes en mente, el máster no puede hacer
que un enemigo ataque de verdad, solo llevarle la cuenta del PG a ojo. Charla larga con
el usuario, decisiones en orden:

1. **`NpcTemplate` gana el mismo tipo `Sheet` que `Character`** (no la misma tabla —
   ownership y ciclo de vida distintos, ver el razonamiento completo en
   `docs/fase-6b.md` "Catálogo de NPCs — rediseño"), para que `lib/rules` y
   `TiradasTab.tsx` funcionen idénticos sin duplicar el motor.
2. **Ficha obligatoria, sin modo "ligero".** El caso del mook rápido de mesa (donde un
   modo sin ficha sería más cómodo) se resuelve **clonando una plantilla ya del
   catálogo** (`clonarNpcAction`), no rebajando el modelo — decisión explícita del
   usuario, "para tenerlo todo organizado".
3. **Desapareció el NPC ad-hoc por completo** (nombre+PG sueltos en la consola,
   subtarea 2.2 — queda **revertida**, ver la nota en `docs/pruebas-integrales.md`).
   Todo NPC sale de una plantilla del catálogo, sin excepción. Consecuencia aceptada a
   propósito: hasta que la 5.2 tenga UI, la consola de combate no tiene NINGUNA forma
   de añadir un NPC (ni ad-hoc ni catálogo) — solo jugadores.
4. **Diseño de UI ya decidido** (detalle abajo): header bifurcado, panel de máster en
   tabs, catálogo en cards con "Poder".

### Lo que YA está hecho (backend completo, sin UI)

- **[x] 5.0 — Modelo y motor.** `NpcTemplate.stats: Json` obligatorio (reemplaza a
  `pgBase`); `Combatiente.sheet: Json?` — foto del `Sheet` del NPC al añadirlo al
  combate (mismo criterio que el resto de fotos de `Combatiente`: editar la plantilla
  después no debe afectar a un combate en marcha). Migración
  `20260911091153_npc_ficha_obligatoria`. `agregarNpcDeCatalogoAction`
  (`combate/actions.ts`) deriva PG/fatiga de `salud(parseSheet(npc.stats))` y congela
  la foto; `agregarAdHocAction` eliminada entera. Nuevo `master/npcs/actions.ts`:
  crear/editar (identidad, atributos, habilidades, especialidades, equipo)/clonar/
  eliminar, espejo simplificado de `characters/[id]/actions.ts` — sin XP, sin
  aprobación, sin coste en créditos al equipar.
  **Hallazgo real que hay que recordar si tocas esto:** `setAtributoValue`/
  `setHabilidadValue` (`lib/rules/creacion.ts`) NO son una asignación directa —
  respetan el pool de creación (`puntosAtributosDisponibles`) y sin letra de prioridad
  asignada ese pool es 0, así que rechazan en silencio cualquier cambio. Las acciones de
  NPC clampan directo contra los límites del sistema (`ATRIBUTO_MIN`/`MAX`,
  `HABILIDAD_NO_ENTRENADA`/`MAX`), sin pool y sin la restricción de "solo subir" que sí
  tiene un PJ en progresión con XP.
  `scripts/seed-npcs.mjs` actualizado para generar un `Sheet` real por sample.
  `CombateConsole.tsx` sin el formulario ad-hoc (aviso de "pendiente, 5.2" en su
  lugar). Verificado con smoke test manual contra Postgres real (7/7 pasos, borrado al
  terminar) y en Chrome que `/master/combate` sigue funcionando.
- **[x] 5.0b — "Poder": métrica de catálogo.** `poder(sheet) = experienciaInvertida(sheet)
  + creditosInvertidos(sheet) / 100` — fórmula **del propio usuario, no del sistema del
  diseñador**, pensada para calibrarse más adelante con una herramienta de balance
  (mencionada esa sesión, sin construir todavía — no la trates como definitiva si
  aparece una revisión). Nuevo módulo `lib/rules/npc.ts`, reutiliza el motor de coste ya
  existente (`creacion.ts`, `equipo.ts`) sin duplicar fórmulas. Función pura, sin server
  action — el futuro `page.tsx` de `/master/npcs` la llama directo al listar.

Ambas verificadas: `tsc` limpio, 315/315 tests, lint limpio.

### Diseño de UI ya decidido (2026-09-11), para no tener que volver a discutirlo

- **Header bifurcado**: "Nueva Era" pasa a "Nueva Era **Master**" (Master en naranja)
  cuando `role === "MASTER"`. A decidir al construirlo si el badge "MÁSTER" que ya
  existe en `AppHeader.tsx` se queda o el título ya basta (no duplicar la misma
  información dos veces).
- **Panel de máster en tabs horizontales**, mismo patrón visual que ya usa
  `CharacterSheet.tsx`: **Jugadores** (la cola de aprobación que hoy vive en `/master`
  a secas), **Combate** (`/master/combate`, ya existe), **NPC** (`/master/npcs`, el
  catálogo — la 5.1, sin construir).
- **Catálogo de NPCs**: botón "+" siempre visible → crear ficha nueva. Lista de cards
  (una por NPC): nombre, y más adelante "Poder" (5.0b, ya lista) y "especialización"
  (sin definir, no bloquea nada — no es lo mismo que las "especialidades" de una
  habilidad, que ya existen). Click en una card → abre su ficha para editar, los
  cambios se reflejan solos en el catálogo (`revalidateNpcs()` ya lo cubre desde 5.0).
  Filtros/orden sobre esos mismos valores — con 30-50 NPCs como mucho, se resuelve
  entero en cliente sobre los datos ya cargados, sin query parametrizada al servidor.

### Lo que falta — subtareas, en orden

- **5.1 — UI del máster para `NpcTemplate` con ficha.** El diseño de arriba. Crear/
  editar/listar la ficha en sí reutilizando lo que tenga sentido de
  `characters/[id]/_components/*Tab.tsx` (`AtributosTab`/`HabilidadesTab`/`EquipoTab`
  en modo "edición directa", sin point-buy ni tope de rareza) en vez de construir un
  editor desde cero. **Al cerrarla, actualiza la sección "NPCs" de `CLAUDE.md`** (ya
  actualizada una vez el 2026-09-11 para reflejar el nuevo formato con `Sheet`, pero
  sigue diciendo "todavía no hay UI" — hay que quitar eso cuando ya la haya).
- **5.2 — Añadir al combate desde catálogo.** Ahora es la **única** vía para meter un
  NPC en un combate — sin esto, la consola no puede añadir NPCs en absoluto.
  `agregarNpcDeCatalogoAction` ya está lista (5.0).
- **5.3 — Clonar NPC en varias instancias numeradas** ("Goblin #1, #2, #3"), cada una
  con su propio PG. La mitad del trabajo ya está (`clonarNpcAction`, 5.0); falta la UI
  que clona varias de golpe con nombres numerados.
- **5.4 — Plantillas de encuentro.** Guardar un grupo de `NpcTemplate` ya montado y
  añadirlo entero a un combate de un tap.
- **5.5 — Tirar por un NPC en combate** (el motivo original de todo este rediseño). Un
  control en la fila de un combatiente NPC dentro de la consola que abre sus tiradas —
  mismo `TiradasTab.tsx` que ya usa el jugador, alimentado por el `sheet` congelado del
  `Combatiente` (no el de la plantilla) y sus estados activos (mismo patrón que 3.1b).
  Con 30-50 combatientes en la cola, probablemente un panel/modal que se abre bajo
  demanda para uno a la vez, no 50 `TiradasTab` renderizados de golpe.

Después viene el bloque 6 (brillo — niebla, selección múltiple, log, avisos,
historial), después de validar el MVP en mesa real.

## Cómo seguir cogiendo subtareas

Igual que el resto de la fase: marca `[x]` en `docs/fase-6b.md` al cerrar cada una, con
una línea de qué se hizo y cómo se verificó; comitea en español con el pie de coautoría;
verifica en Chrome de verdad (usuarios y datos de prueba, borrados al terminar —
`docs/traspaso.md` §4/§5). Si construyendo algo aparece un hueco del motor o una
decisión sin cerrar, decláralo explícito (un supuesto numerado en `docs/sistema.md` si
es de reglas, una nota en `docs/fase-6b.md` si es de la propia fase) — no lo rellenes en
silencio. Recuerda reiniciar el dev server tras cualquier migración de Prisma
(`docs/traspaso.md` §5) — esta ronda ya dejó una migración nueva aplicada en local.
