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
0 (motor), 1 (datos y permisos), 2 (consola del máster) y 3 (vista del jugador)
cerrados**; bloque 4 (reactividad) es el siguiente.

El bloque 3 quedó **ampliado** sobre el diseño original del 2026-09-11, en una charla con
el usuario al construirlo (2026-09-10): no solo una tira compacta con el propio
combatiente, sino también una **tab "Combate"** con la cola completa (todos los
combatientes, no solo el propio) — sin ver a los demás no hay contexto táctico. Detalle
completo de por qué y cómo, en la entrada de 3.1 de `docs/fase-6b.md`.

D5 (sincronización de un solo sentido, combate → ficha) y D2 (el jugador toca su propio
combatiente) están verificados de punta a punta con UI real de jugador — antes solo
tenían cobertura de `permisos.test.ts`.

## El siguiente paso: bloque 4 — Reactividad

- **4.1 — Polling inteligente.** Hoy cada acción hace `router.refresh()`, así que quien
  pulsa el botón ve su propio cambio al instante — pero otra pestaña o dispositivo
  mirando el mismo combate no se entera hasta que recarga a mano. D3 (decisión ya
  cerrada): un hook compartido que haga polling corto (3-5s) contra el mismo endpoint de
  siempre, activo **solo** mientras hay un `Combate EN_CURSO`, pausado si la pestaña está
  en background (`document.visibilitychange`), con refresco manual como red de
  seguridad. Nada de websockets ni infraestructura nueva — es mesa física, no hace falta
  latencia de videojuego online.
- **4.2 — (Evaluar después de probar en mesa) Migrar a SSE si el polling se siente
  lento.** No es parte del MVP — no la adelantes sin que 4.1 ya esté en mesa real y se
  haya notado el problema.

Después del bloque 4 viene el 5 (catálogo de NPCs y plantillas de encuentro) y el 6
(brillo — niebla, selección múltiple, log, avisos, historial), en ese orden. Detalle de
sus subtareas en `docs/fase-6b.md`.

## Cómo seguir cogiendo subtareas

Igual que el resto de la fase: marca `[x]` en `docs/fase-6b.md` al cerrar cada una, con
una línea de qué se hizo y cómo se verificó; comitea en español con el pie de coautoría;
verifica en Chrome de verdad (usuarios y datos de prueba, borrados al terminar —
`docs/traspaso.md` §4/§5). Si construyendo algo aparece un hueco del motor o una decisión
sin cerrar, decláralo explícito (un supuesto numerado en `docs/sistema.md` si es de
reglas, una nota en `docs/fase-6b.md` si es de la propia fase) — no lo rellenes en
silencio.
