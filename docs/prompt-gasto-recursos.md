# Encargo: automatizar el gasto de RECURSOS al confirmar una tirada/acción

> Prompt listo para pegar entero en una sesión nueva por si hace falta retomar algo.
> Arrancado en conversación el 2026-09-28. **Fase 1 y Fase 2 hechas y commiteadas el
> mismo día** — ver "Fase 1 — hecho" y "Fase 2 — hecho" más abajo. Documento cerrado,
> sin trabajo pendiente. **No es lo mismo que el resto de RECURSOS ya
> construido** (balas, baterías, colchón de Malla Plasmática, Materiales, Granadas —
> todo eso ya existe y funciona, `docs/tareas.md`): esto es la capa que falta encima,
> que hace que gastar ese recurso deje de ser un +/- manual en Recursos y pase a
> descontarse solo al confirmar la tirada que lo consume. Antes de tocar nada, lee
> `docs/tareas.md` (busca "RECURSOS") para el estado actual del sistema — este
> documento no lo repite.

## Qué es esto, en una frase

Hoy, tirar el dado (`AccionesTab.tsx`, función `tirar()`) es **100% cálculo en
cliente** — no toca el servidor ni la ficha en absoluto. El gasto de munición/
batería/dosis es un +/- manual que el jugador hace aparte, en la pestaña Recursos,
después de tirar (o antes, o nunca, si se le olvida). El aviso de "no te llega" ya
existe (`notaInsuficiente()`), pero es solo texto — nunca ha descontado nada.

**Decisión del usuario (2026-09-28), no la vuelvas a discutir:**
- El gasto se automatiza al confirmar la tirada/acción, no antes.
- **Nunca bloquea el botón de tirar.** Si no llega el recurso, se avisa (como ya se
  avisa hoy) pero se deja tirar igual, y se gasta lo que haya (clamp a 0) — mismo
  criterio que el resto de la app ("no hay infraestructura para que un resultado de
  tirada condicione una mutación de ficha", ya citado en `docs/tareas.md` sobre
  Fabricar/Reparar. Aquí no hace falta esa infraestructura porque el gasto NO
  depende del resultado, solo de haber tirado).
- Fármacos: **1 dosis por uso**, sin excepciones ni cálculo más fino.

## Diagnóstico de partida (verificado en código, no lo vuelvas a comprobar)

- `tirar()` en `AccionesTab.tsx` (busca la función que llama `setHistorial`/
  `setMemoria` al confirmar) no hace ningún `await` ni llama a ninguna server
  action — puro cliente. Automatizar el gasto significa añadirle un round-trip al
  servidor que hoy no existe ahí.
- `gastoDelModo()` (`recursos.ts`) y `GASTO_MODO_PULSO` (`combate.ts`) ya calculan
  el número exacto de gasto por modo (balas, cargas del Proyector de Pulso) — hoy
  solo alimentan `notaInsuficiente()`, nunca descuentan nada de `sheet.recursos`.
- `Accion` (`acciones.ts`) no tiene ningún campo que diga "esto consume la instancia
  X de `sheet.recursos`" — hace falta añadirlo, no hay forma fiable de deducirlo del
  `id` (parsear `algo_${instanciaId}` es frágil, no lo intentes).
- El coste de Máxima Potencia (Movilidad Aérea, `movimiento.ts`) vive **solo como
  texto** dentro de la etiqueta del toggle ("Máxima Potencia (acción Compleja, 2
  cargas)") — no hay ningún campo numérico. Hace falta uno nuevo.
- El primitivo de gasto YA EXISTE y no hay que reinventarlo: `ajustarRecurso()` /
  `ajustarRecursoAction()` ya clampan a `[0, max]` — "gasta lo que haya, nunca
  bloquea" sale gratis con solo llamarlos con un delta negativo.

## Fase 1 — armas de fuego y subsistemas con célula

**Por qué primero**: reutiliza infraestructura que ya existe entera
(`gastoDelModo`, `ajustarRecursoAction`), solo hace falta conectarla. Cubre: armas
de fuego (balas), Proyector de Pulso (cargas), Movilidad Aérea "Volar" (cargas,
incluida Máxima Potencia).

Piezas nuevas a construir:

1. **`Accion` gana `recursoInstanciaId?: string`** (`acciones.ts`) — qué entrada de
   `sheet.recursos` consume esta tirada. Lo rellena el generador que ya construye la
   `Accion` (`tiradaDeArmaFuego`/`tiradaDeProyectorPulso`/`accionesDeMovimiento`,
   que ya conocen la instancia).
2. **Cada `modo` gana `gasto?: number`** — el número que hoy calculan
   `gastoDelModo()`/`GASTO_MODO_PULSO`, guardado como dato en el propio modo en vez
   de recalculado de texto en otro punto.
3. **`CondicionTirada` (rama `toggle`) gana `gastoActivo?`/`gastoInactivo?: number`**
   (`condiciones.ts`) — mismo patrón que `valorActivo`/`valorInactivo`, pero para
   coste de recurso. Resuelve Máxima Potencia (1 carga normal, 2 si el toggle está
   activo) sin inventar un mecanismo aparte.
4. **`gastoTotal(accion, modoId, estadoCondiciones)`** (función pura nueva, mismo
   sitio que `valorCondiciones()`) — suma el gasto del modo elegido más el de las
   condiciones activas. Espejo exacto de cómo ya se calcula el modificador numérico.
5. **En `tirar()` (`AccionesTab.tsx`)**, al confirmar: si `accion.recursoInstanciaId`
   existe, calcular `gastoTotal()` y llamar a `ajustarRecursoAction(characterId,
   recursoInstanciaId, -gasto)` **en segundo plano** (mismo patrón fire-and-forget
   que el resto del autosave de la app) — la tirada tiene que seguir sintiéndose
   instantánea, sin esperar al servidor para pintar el resultado del dado.
6. `notaInsuficiente()` se queda tal cual (sigue avisando antes de tirar); ahora el
   aviso corresponde a un gasto real, no a uno manual pendiente.

**Fuera de esta fase, a propósito**: Movilidad Aérea nivel 3 gasta "1 carga cada 3
acciones", no 1 por tirada — no encaja en "gasto fijo por modo/condición". Se queda
manual como hoy; no fuerces un contador de turnos nuevo solo para esto.

### Fase 1 — hecho (2026-09-28)

Construida tal como está descrita arriba, con un ajuste de diseño respecto al punto
2 original: **el `gasto` vive en `Accion.ataque.modos[]`** (junto a `danio`/
`formulaDanio`, poblado en combate.ts con `gastoDelModo()`/`GASTO_MODO_PULSO`), no en
`OpcionCondicion` — así una tirada con un único modo (sin selector, p. ej. la
Mosquito) también tiene de dónde sacar su gasto de 1 bala. `gastoTotal(accion,
modoId, estado)` vive en **acciones.ts**, no en condiciones.ts (evita un import
circular de `Accion`). De propina, también se enganchó el gasto de **Golpear con
Proyector de Pulso (Aguijón)** (mismo mecanismo, antes solo avisaba con
`notaInsuficiente` sin descontar nunca) — `tiradaBloqueoAguijon` se queda gratis a
propósito (reacción ilimitada) y Lanzagranadas fuera de alcance (usa
`sheet.granadas`, no `sheet.recursos`).

Piezas nuevas: `Accion.recursoInstanciaId`, `Accion.ataque.modos[].gasto`,
`CondicionTirada` (toggle) `gastoActivo`/`gastoInactivo`, `gastoTotal()`
(acciones.ts), prop `onGastarRecurso` en `AccionesTab.tsx` cableado a
`commitAjustarRecurso` (ya existía) en `CharacterSheet.tsx`/`NpcEditor.tsx` — ausente
en `NpcAccionesPanel.tsx` (combate en vivo, sin characterId). Tests en
`acciones.test.ts` (gastoTotal puro), `combate.test.ts` y `movimiento.test.ts`.
568/568 en verde, typecheck y lint limpios.

## Fase 2 — fármacos ("1 dosis por uso")

**Por qué es más grande de lo que parece**: hoy un fármaco es una **pieza equipada
suelta, sin cantidad** (`familia: "consumible"`, `FARMACOS` en
`src/lib/catalog/medicina.ts`) — mismo modelo que tenían Materiales y Granadas
ANTES de su refactor a pool con cantidad. Y **no existe ninguna acción "usar X"**
en la app — cero resultados en `herramientas.ts`/`combate.ts`/`acciones.ts`. Así
que "1 dosis por uso" necesita construir dos cosas de cero, en este orden, antes de
que el gasto automático tenga algo que enganchar.

**Ojo con un comentario ya existente que hay que actualizar, no ignorar**: la
cabecera de `medicina.ts` dice explícitamente hoy "los fármacos NO llevan ningún
modificador... el motor no lleva inventario ni consumo de cargas" y el `detalle` de
Nano-Elixir dice "el motor no lleva inventario de dosis consumidas" — son
decisiones documentadas que esta tarea **revierte a propósito**. Cuando se
construya, hay que corregir esos comentarios (y el de Nano-Elixir), no dejarlos
contradiciendo el código nuevo.

### Paso 1 — pool de fármacos con cantidad

Mismo patrón exacto que Granadas (`docs/tareas.md`, "Granadas → recurso con
cantidad, 2026-09-27" — cópialo, no lo rediseñes):

- `Sheet.farmacos: Record<catalogoId, cantidad>` — campo nuevo, `SCHEMA_VERSION`
  +1, con su migración (una instancia equipada de un fármaco concreto = 1 unidad,
  igual de inequívoco que fue para Granadas — no tiene la ambigüedad que sí tuvo
  Materiales).
- `recursos.ts`: `sumarFarmaco`/`comprarFarmaco`/`ajustarFarmaco`, calcando
  `sumarGranada`/`comprarGranada`/`ajustarGranada` — precio real por fármaco (ya
  está en el catálogo, `coste`), no un precio fijo como Materiales.
- `parseSheet`: default `{}`, filtra por `catalogoId` real + cantidad > 0, igual
  que granadas.
- Server actions: `comprarFarmacoAction`/`ajustarFarmacoAction` (jugador) +
  `comprarFarmacoNpcAction`/`ajustarFarmacoNpcAction` (NPC, edición libre sin
  créditos) — calcar los cuatro de granadas.
- UI: `TiendaTab.tsx` — los fármacos pasan de "Equipar" a "Comprar"
  (`AccionComprarGranada` ya es genérico, revisa si sirve tal cual o hace falta
  una copia). `EquipoTab.tsx` pierde la sección de consumibles (ya no son piezas
  equipadas). `RecursosTab.tsx` gana una sección "Fármacos" (mismo patrón que
  "Granadas": `GranadaCard`, cantidad + −/+, sin "/max", sin botón comprar ahí).

### Paso 2 — acción "Usar [fármaco]" + gasto de 1 dosis

**No mecanices el efecto completo de cada fármaco** — la mayoría tiene mecánicas
narrativas complejas (penalizadores acumulados, colapsos, curación por niveles)
que dependen de sistemas que todavía no existen (daño por categorías, Fase 2 de
`docs/tareas.md`; poderes psiónicos, Fase 5). El alcance de esta tarea es: generar
la fila, tirar si corresponde con la dificultad ya conocida, mostrar el efecto como
texto (igual que hoy vive en `detalle`), y gastar 1 dosis al confirmar — el resto
sigue igual de sin mecanizar que hoy, "comunicación de mesa".

Tabla de qué necesita tirada y cuál no (ya está en la prosa del catálogo, no hace
falta preguntarle al usuario esto pieza por pieza):

| Fármaco | Tirada | Aplicado + Habilidad | Dificultad |
|---|---|---|---|
| Analgésico | No | — | — |
| Antipatógeno | No | — | — |
| Ultra Estimulante | No | — | — |
| Agentes Hemostáticos | Sí | Perspicacia + Biociencia (Medicina) | 7 normal / 9 exanguinante (selector) |
| Estabilizadores Neurales | Sí | Perspicacia + Biociencia (Medicina) | 6 |
| Calmante | Sí | Perspicacia + Medicina | 4 |
| Gel Sanador | Sí | Perspicacia + Medicina | 4 |
| Gel Sanador Avanzado | Sí | Perspicacia + Medicina | 4 |
| Nano-Elixir | Sí | Igual que Gel Sanador Avanzado | 4, con +5 fijo a esa tirada |
| Xovromium | **Excluido de esta fase** — bloqueado por Fase 5 (poderes psiónicos no existen), ya marcado `bloqueado` en su `motor[]`. No lo toques. | | |

- Las que **no llevan tirada** son `AccionDirecta` (mismo patrón que Radar nv4
  "Marcar objetivo") — el nota explica el efecto, el botón "Usar" gasta la dosis,
  sin `onUsar` que mute nada más.
- Las que **sí llevan tirada** son `Accion` normales (grupo probablemente
  "Herramientas" o uno nuevo "Fármacos" — decidir con el usuario en qué sección de
  `AccionesTab.tsx` encajan mejor antes de construir) con `aplicado`/`habilidad`
  fijos y la dificultad como `ajustesFijos`, igual que cualquier tirada fija — el
  resultado (éxito/fracaso) se muestra, pero qué cura o qué purga se sigue
  aplicando a mano.
- Dónde vive el generador: nuevo archivo `src/lib/rules/farmacos.ts` (no lo metas
  en `herramientas.ts`, son conceptualmente distintos — herramientas son equipo
  con nivel, fármacos son consumibles de cantidad) con una función tipo
  `accionesDeFarmacos(sheet)` que combina las de dado y las directas, consultadas
  aparte en `AccionesTab.tsx` igual que ya se hace con `accionesDeHerramientas()`/
  `accionesDirectasDeHerramientas()`.
- Gasto: al confirmar (con o sin dado), llamar a `ajustarFarmacoAction(characterId,
  catalogoId, -1)` en segundo plano — mismo criterio que la Fase 1.

### Fase 2 — hecho (2026-09-28)

Construida en dos pasos, tal como está descrita arriba, con una corrección real de
diseño respecto al punto de la dificultad: **la dificultad conocida (7, 9, 6, 4...)
vive como texto en `nota`, NUNCA en `ajustesFijos`.** `ajustesFijos` es un modificador
que se SUMA al resultado de la tirada (el -2 fijo de un modo de disparo, por
ejemplo) — no es el número objetivo que el jugador elige a mano en el modal
(DIFICULTADES). Confirmado contra el precedente real del catálogo: la tirada fija
`medicina` (ACCIONES, `acciones.ts`) ya documenta "Gel sanador y estabilizar tienen
dificultad 4" como texto en `nota`, sin mecanizar el número. `ajustesFijos` solo se
usa para el +5 REAL de Nano-Elixir (un bono a la propia tirada, no una dificultad).
Agentes Hemostáticos (7 normal / 9 exanguinante) tampoco lleva selector interactivo:
los dos valores van como texto en `nota`, mismo criterio.

Piezas nuevas: `Sheet.farmacos: Record<catalogoId, cantidad>` (SCHEMA_VERSION 10,
migración 9→10 calcada de la de Granadas en la v8), `sumarFarmaco`/`comprarFarmaco`/
`ajustarFarmaco` (`recursos.ts`), `comprarFarmacoAction`/`ajustarFarmacoAction` +
`comprarFarmacoNpcAction`/`ajustarFarmacoNpcAction`, `GrupoAccion` gana `"Fármacos"`,
`Accion.farmacoId?`/`AccionDirecta.farmacoId?` (gasta 1 dosis, incondicional),
`rules/farmacos.ts` (`accionesDeFarmacos`/`accionesDirectasDeFarmacos`, Xovromium
excluido a propósito), sección "Fármacos" nueva en `AccionesTab.tsx` con prop
`onAjustarFarmaco`. TiendaTab: fármacos pasan de "Equipar" a "Comprar"
(`AccionComprarGranada` renombrado a `AccionComprarConCantidad`, ahora también sirve
a `Consumible`). EquipoTab pierde la sección de consumibles (ya no son piezas
equipadas). RecursosTab gana sección "Fármacos" (reutiliza `GranadaCard` tal cual).
Comentarios de `medicina.ts` corregidos (la decisión "el motor no lleva inventario"
queda documentada como revertida, no borrada en silencio). Tests nuevos en
`farmacos.test.ts`, `recursos.test.ts`, `sheet.test.ts`, `migraciones.test.ts`.
593/593 en verde, typecheck y lint limpios.

## Estado final

Documento cerrado: Fase 1 y Fase 2 hechas, commiteadas por separado el 2026-09-28,
sin ningún paso pendiente. Si el sistema añade un nuevo tipo de RECURSOS gastable en
el futuro (otra célula, otro consumible de cantidad), el patrón a copiar es el de
Fase 1 (`gastoTotal()`, `Accion.recursoInstanciaId`) si el gasto varía por modo/
condición, o el de Fase 2 (`Accion.farmacoId`, gasto fijo de 1) si es siempre la
misma cantidad por uso — no hace falta un tercer mecanismo genérico para eso.
