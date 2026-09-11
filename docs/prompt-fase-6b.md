# Encargo: seguir con el gestor de combate (fase 6b)

> Prompt listo para pegar entero en una sesión nueva (otro agente, o tú mismo más
> adelante) para retomar el gestor de combate — no el proyecto entero, para eso está
> `docs/prompt-relevo.md`. Este vive mientras dure la fase 6b; cuando cierre entera, se
> archiva igual que ya le pasó a `docs/prompt-equipo.md`.

## Antes de nada: lee esto, en este orden

1. **`docs/traspaso.md`** — normas de trabajo, trampas conocidas.
2. **`docs/tareas.md`** — estado global del proyecto, para no perder el panorama.
3. **`docs/fase-6b.md`, entero** — la hoja de ruta del gestor de combate: subtareas,
   decisiones D1-D5, y el estado exacto de los bloques 0-3 (cerrados, cada subtarea
   verificada en Chrome una por una, no solo compilada). Es la fuente de verdad de por
   dónde va esto — no lo repito aquí.
4. **`docs/pruebas-integrales.md`, entero** — checklist de pruebas manuales del bloque 2.
   Los 2 "hallazgos reales" que dejó un `/loop` de pruebas anterior **ya se reprodujeron
   a mano y se descartaron** (2026-09-10): eran artefactos de cómo esa sesión vaciaba los
   campos, no bugs — ver "Hallazgos originales — descartados" en ese documento. El bloque
   2 sigue cerrado sin hallazgos reales pendientes, salvo el hallazgo menor 3 (no-op
   silencioso al forzar una flecha en su extremo), que no bloquea nada.

## Dónde está la fase ahora mismo

No lo duplico — está todo en `docs/fase-6b.md` — pero el resumen de una línea: **bloques
0 (motor), 1 (datos y permisos), 2 (consola del máster, con la ampliación 2.7) y 3
(vista del jugador) cerrados**; 4.1 (polling) también hecho — solo queda 4.2, condicional
a probar en mesa real. Bloque 5 (catálogo de NPCs) es el siguiente trozo de trabajo real.

Dos ampliaciones sobre el diseño original del 2026-09-11, ambas decididas con el usuario
al construir (no estaban en el brainstorm inicial):

- **Bloque 3 (2026-09-10):** no solo una tira compacta con el propio combatiente, sino
  también una **tab "Combate"** con la cola completa (todos los combatientes, no solo el
  propio) — sin ver a los demás no hay contexto táctico. Detalle en la entrada de 3.1.
- **2.7 (2026-09-11, pedido explícito):** "Comenzar combate" separado de "Crear
  combate" — `EstadoCombate` gana `PREPARANDO` antes de `EN_CURSO`. El máster monta la
  escena (añade gente, iniciativa...) sin que el jugador vea nada, y solo cuando pulsa
  "Comenzar combate" el jugador empieza a verlo (D5). **Ojo con esto si tocas el polling
  o `characters/[id]/page.tsx`:** ahí se encontró un bug real — el polling estaba
  condicionado a `combate !== null`, pero esa prop es `null` mientras el jugador no ve
  el combate (`PREPARANDO`), así que nunca arrancaba y el jugador se quedaba colgado sin
  enterarse cuando el máster empezaba. Arreglado con un polling siempre activo en la
  ficha del jugador (intervalo largo mientras no hay nada que ver, corto en cuanto lo
  hay) — ver la entrada de 2.7 en `docs/fase-6b.md` antes de tocar esta zona otra vez.

D5 (sincronización de un solo sentido, combate → ficha) y D2 (el jugador toca su propio
combatiente) están verificados de punta a punta con UI real de jugador — antes solo
tenían cobertura de `permisos.test.ts`.

## El siguiente paso: bloque 5 — Catálogo de NPCs y plantillas de encuentro

- **5.1 — UI del máster para `NpcTemplate`.** Crear/editar/listar, mismo patrón de
  formulario que el resto del panel de máster. Al cerrarla, actualiza la sección "NPCs"
  de `CLAUDE.md` (hoy documenta `npm run seed-npcs` como atajo explícito porque esto no
  existe todavía).
- **5.2 — Añadir al combate desde catálogo**, en vez de solo ad-hoc (2.2).
  `agregarNpcDeCatalogoAction` existe desde la 1.3, sin UI.
- **5.3 — Clonar NPC en varias instancias numeradas** ("Goblin #1, #2, #3").
- **5.4 — Plantillas de encuentro.**

Después viene el bloque 6 (brillo — niebla, selección múltiple, log, avisos, historial),
después de validar el MVP en mesa real. Detalle de todas las subtareas en
`docs/fase-6b.md`. **4.2 (SSE si el polling se siente lento) sigue condicional** — no la
adelantes sin haber probado 4.1 en mesa de verdad.

## Cómo seguir cogiendo subtareas

Igual que el resto de la fase: marca `[x]` en `docs/fase-6b.md` al cerrar cada una, con
una línea de qué se hizo y cómo se verificó; comitea en español con el pie de coautoría;
verifica en Chrome de verdad (usuarios y datos de prueba, borrados al terminar —
`docs/traspaso.md` §4/§5). Si construyendo algo aparece un hueco del motor o una decisión
sin cerrar, decláralo explícito (un supuesto numerado en `docs/sistema.md` si es de
reglas, una nota en `docs/fase-6b.md` si es de la propia fase) — no lo rellenes en
silencio.
