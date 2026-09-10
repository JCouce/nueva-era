# Encargo: seguir con el gestor de combate (fase 6b)

> Prompt listo para pegar entero en una sesión nueva (otro agente, o tú mismo más
> adelante) para retomar el gestor de combate — no el proyecto entero, para eso está
> `docs/prompt-relevo.md`. Este vive mientras dure la fase 6b; cuando cierre entera, se
> archiva igual que ya le pasó a `docs/prompt-equipo.md`.

## Antes de nada: lee esto, en este orden

1. **`docs/traspaso.md`** — normas de trabajo, trampas conocidas (incluida una nueva
   sobre `border-accent` y Tailwind v4, encontrada construyendo esta misma fase).
2. **`docs/tareas.md`** — estado global del proyecto, para no perder el panorama.
3. **`docs/fase-6b.md`, entero** — la hoja de ruta del gestor de combate: subtareas,
   decisiones D1-D5, y el estado exacto de los bloques 0-2 (cerrados, cada subtarea
   verificada en Chrome una por una, no solo compilada). Es la fuente de verdad de por
   dónde va esto — no lo repito aquí.
4. **`docs/pruebas-integrales.md`, entero** — checklist de pruebas manuales del bloque 2:
   una sesión autónoma (`/loop`) lo pasó entero y encontró 2 hallazgos reales más uno
   menor, y hay una revisión crítica posterior (mía, no del agente que hizo las pruebas)
   que rebaja la confianza en uno de los dos. **No des esos hallazgos por confirmados
   sin leer esa nota primero.**

## Dónde está la fase ahora mismo

No lo duplico — está todo en `docs/fase-6b.md` — pero el resumen de una línea: **bloques
0 (motor), 1 (datos y permisos) y 2 (consola del máster) cerrados**; bloque 3 (vista del
jugador) es el siguiente, y quedó **repensado** en una charla de diseño el 2026-09-11
después de probar la consola de verdad, no solo construirla:

- **D5** (la decisión más reciente, junto a D1-D4): sincronización de **un solo
  sentido**. El jugador **ve** su combate en su ficha (PG/fatiga, estados con sus
  modificadores reflejados en Tiradas). Lo único que puede **escribir** hacia el combate
  es su propio PG/fatiga (D2) — se planteó y se descartó explícitamente que tirara su
  Iniciativa y la mandara, por el mismo principio de siempre: la app asiste, no arbitra,
  aplicado ahora a la dirección del dato, no solo a qué se mecaniza.
- El **bloque 3** quedó así: **3.1** (tira de combate — y el detalle de un estado tiene
  que verse de verdad, no en un `title` de hover, que en móvil no existe: es un fallo de
  UX real que se encontró usando la consola, no una idea nueva), **3.1b** (nueva — los
  modificadores de los estados activos entran en el cálculo de la pestaña Tiradas del
  jugador; el motor ya existe desde la fase 0, falta enchufarlo), **3.2** (autogestión
  de PG/fatiga propio, la única vía ficha → combate que queda).

## Lo primero que toca, antes de escribir código del bloque 3

**Reproduce a mano los dos hallazgos abiertos de `docs/pruebas-integrales.md`** (sección
"Hallazgos reales", con la nota de revisión justo encima de cada uno) — con teclado de
verdad en el navegador, no con una herramienta de automatización, porque la sospecha es
que uno de los dos ni siquiera es un bug de la app:

1. **Rondas vacías no guarda `null`** (bloque 2.5) — sospecha alta de que es un
   artefacto de cómo la automatización "vacía" un campo controlado por React (misma
   familia de trampa que ya documenta `docs/traspaso.md` §5 sobre `fill_form`). Antes de
   tocar `CombateConsole.tsx`, confirma que pasa de verdad tecleando tú.
2. **Iniciativa vacía no guarda `null`** (bloque 2.3) — más probable que sea real (ese
   campo lee el DOM directo, no depende de React). Confírmalo también, pero con más
   sospecha de que haga falta arreglar algo.

Si alguno se confirma real, arréglalo antes de seguir — son del bloque 2, ya cerrado, y
dejarlo así ensucia lo que ya se dio por bueno.

## Después: bloque 3, en orden

3.1 → 3.1b → 3.2, tal como están descritas en `docs/fase-6b.md`. Verifica cada una en
Chrome **con una sesión de jugador real**, no solo de máster — es la primera vez en toda
la fase que hay UI para el lado del jugador, así que es la primera vez que D2 (el dueño
del `Character` puede tocar su propio combatiente) se puede probar de punta a punta en
vez de confiar solo en `permisos.test.ts`.

## Cómo seguir cogiendo subtareas

Igual que el resto de la fase: marca `[x]` en `docs/fase-6b.md` al cerrar cada una, con
una línea de qué se hizo y cómo se verificó; comitea en español con el pie de coautoría;
verifica en Chrome de verdad (usuarios y datos de prueba, borrados al terminar —
`docs/traspaso.md` §4/§5). Si construyendo algo aparece un hueco del motor o una decisión
sin cerrar, decláralo explícito (un supuesto numerado en `docs/sistema.md` si es de
reglas, una nota en `docs/fase-6b.md` si es de la propia fase) — no lo rellenes en
silencio.
