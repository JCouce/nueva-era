---
id: T-007
titulo: Tirada libre en Acciones: aplicado + habilidad elegidos en el modal
origen: manual
estado: hecho
vueltas: 1/2
rama: fabrica/T-007-tirada-libre
base: fabrica/T-006-acciones-favoritas
creado: 2026-10-23
inicio: 2026-10-23T14:01:59.986Z
operario: 0/10
fin: 2026-10-23T14:26:48.861Z
---

<!--
Sale de la rama de T-006 (que lleva T-005), sin mergear todavía, para no chocar con AccionesTab ni tocar main mientras
trabajan otros agentes. Encargo pegado por el usuario (2026-10-23) como prompt de subagente; se adapta a la fábrica:
el constructor commitea en su rama y, ante ambigüedad, para con bloqueo en vez de dejar TODO(revisar).
-->

## Encargo
"Tirada libre" en la pestaña Acciones: el jugador elige un atributo aplicado y una habilidad (o ninguna) y tira
1d12 + aplicado + habilidad, sin que la tirada sea ninguna acción con nombre. Es para lo que el máster pide en mesa y
la app no tiene como fila. (usuario, 2026-10-23)

## Decisiones de reglas
| # | Duda | Decisión | Quién | Fundamento |
|---|---|---|---|---|
| R1 | ¿Qué se le aplica a una tirada que no es ninguna acción con nombre? | Lo que casa por (aplicado, habilidad): modificadores de tirada con alcance `todas`, `aplicado` y `habilidad`, incluido `anulaPenalizadores`. Nada con alcance `tiradaId` de otra acción (ningún modificador apunta al id de la tirada libre), `grupo`, `grupoHabilidad`, `familiaArma` ni de modo (`contieneEtiqueta`). Sin casillas, ventajas, textos, bonos por tramo, descuentos ni crítico fijo de dote o aumento | usuario | encargo del 2026-10-23 |
| R2 | ¿Especialidad? | No: la habilidad cuenta entera, como en Sigilo o Buscar | usuario | encargo del 2026-10-23 |

## Spec
**Alcance:**
- **Fila:** "Tirada libre", en la pestaña **Tiradas**, al final de la sección "Acciones", con botón "Tirar" que abre
  el modal de siempre (`AccionModal`). Como cualquier fila con botón en una ficha de personaje, lleva estrella de
  favorita (clave fija) y, marcada, sale en Favoritas. Al ser `AccionesTab`, sale también en el editor de NPC y en el
  panel de combate del máster (allí sin estrella).
- **Selectores en el modal, antes de la dificultad:** aplicado (los 6 de `APLICADOS`, `rules/atributos.ts`; por
  defecto Perspicacia) y habilidad (todas las de `HABILIDADES` más "Ninguna"; por defecto Ninguna). Al cambiar
  cualquiera, el desglose y el total se rehacen. Selects nativos o controles con target de al menos 40 px de alto.
- El resto del modal, igual que cualquier tirada: dificultad, circunstancial, desglose, resultado, críticos y
  "Tirar otra vez" (con el mismo par elegido).
- **Motor (`src/lib/rules/`):** la tirada se construye como un `Accion` con el par elegido, montado con
  `montarTirada`/`tirarMontada` (nada de totales en el componente). `Accion` gana un campo explícito y comentado que
  la marca como libre (el modal lo usa para pintar los selectores; nunca se deduce del id). Lleva un grupo propio que
  no es ninguno de los de hoy, para que ningún alcance por grupo case (se añade a `GrupoAccion`). Lo que se le aplica
  es lo de R1 y R2. Expuesto desde `@/lib/rules`.
- **Tests** en `src/lib/rules/` (junto a montaje): un penalizador `todas` entra; uno de `aplicado` entra solo si
  coincide el aplicado; uno de `grupo: "Defensa"` no entra; con habilidad "Ninguna" solo suma el aplicado.
- **Historial:** en "Acciones recientes" sale como "Tirada libre (Aplicado + Habilidad)", p. ej. "Tirada libre
  (Perspicacia + Sigilo)"; con "Ninguna", "Tirada libre (Perspicacia)".
- No se guarda en la ficha la última elección (no es estado de partida). Mientras el modal no se cierre, se mantiene.
- Colores solo con tokens de `globals.css`; mobile-first.
- `docs/sistema.md`, en "Supuestos tomados al implementar": supuesto nuevo, "tirada libre: aplica lo que casa por
  aplicado/habilidad (alcances `todas`, `aplicado`, `habilidad`), sin casillas ni extras de dote o aumento, y sin
  especialidad", citando al usuario (2026-10-23).
- `docs/tareas.md`: entrada nueva, hecha, en la sección "Pestaña Acciones: pestañas y favoritas".

**Fuera de alcance:**
- Recordar el último par elegido entre aperturas del modal o en la ficha.
- Especialidades, casillas o Sutil en la tirada libre.
- Cambiar cómo se montan las demás tiradas o el modal para ellas.
- Repensar la categorización de Básicas/Tiradas.

**Puede tocar:**
- `src/lib/rules/acciones.ts`
- `src/lib/rules/modificadores.ts` (solo `GrupoAccion`)
- `src/lib/rules/montaje.ts`
- `src/lib/rules/fichaResuelta.ts`
- `src/lib/rules/index.ts`
- `src/lib/rules/*.test.ts` (el test nuevo de la tirada libre; ningún test existente cambia sus valores esperados)
- `src/components/AccionModal.tsx`
- `src/app/characters/[id]/_components/AccionesTab.tsx`
- `src/app/characters/[id]/_components/acciones/*`
- `docs/sistema.md` (el supuesto nuevo)
- `docs/tareas.md` (la entrada nueva)

## Criterios
| # | Qué se tiene que cumplir | Oráculo |
|---|---|---|
| C1 | `npm test` y `npx tsc --noEmit` en verde | comando |
| C2 | Ningún cambio fuera de "Puede tocar" | `git diff --stat` contra la base |
| C3 | Con una ficha cualquiera y modificadores sintéticos, la tirada libre montada (`montarTirada`): con un `tirada` `todas` −1, el total lleva −1; con un `tirada` `aplicado: ["voluntad"]` −2, lo lleva con Voluntad y no con Perspicacia; con un `tirada` `habilidad: sigilo` +1, lo lleva con Sigilo y no con Ninguna; con uno `grupo: "Defensa"` −2, `grupo: "Acciones"` −3, `tiradaId: "sigilo"` −4 (el de la acción fija Sigilo, no el de la tirada libre), `grupoHabilidad` (Acciones, sigilo) −5 o `familiaArma` cualquiera −6, no los lleva (tampoco con Sigilo elegido); con `anulaPenalizadores` `todas`, el −1 de `todas` queda anulado | comando: comprobación propia del revisor, valores fijados aquí |
| C4 | Con habilidad "Ninguna" y sin modificadores, total = aplicado de la ficha; con habilidad X, total = aplicado + valor de X en la ficha (entera, sin mitad por especialidad) | comando: ídem |
| C5 | Ningún test existente cambia sus valores esperados | diff (líneas `assert` quitadas o cambiadas en `*.test.ts` de la base) |
| C6 | Existe un test nuevo en `src/lib/rules/` que cubre los cuatro casos del alcance (todas, aplicado sí/no, grupo Defensa no, Ninguna) | diff |
| C7 | `Accion` tiene un campo nuevo, comentado, que marca la tirada libre, y el modal decide pintar los selectores con ese campo, no mirando el id | diff |
| C8 | Ficha de un personaje (login local `master`/`master`), Acciones → Tiradas: la última fila de la sección "Acciones" es "Tirada libre" con botón "Tirar"; no sale en Básicas | navegador |
| C9 | Al abrirla, el modal enseña antes de la dificultad un selector de aplicado con los 6 aplicados (Perspicacia elegida) y uno de habilidad con "Ninguna" (elegida) y todas las habilidades | navegador |
| C10 | Cambiar aplicado a Reflejos y habilidad a Sigilo: el desglose enseña Reflejos y Sigilo con los valores de la ficha (pestañas Atributos y Habilidades) y el total cuadra | navegador |
| C11 | Con el estado Aturdido en grado "Fracaso" (−1 a Defensa) puesto al personaje, el desglose de la tirada libre no lleva línea de Aturdido; con Aturdido "Éxito" (−1 a todas), sí la lleva con −1. El estado se quita al acabar | navegador (estados desde el centro de mando del máster) |
| C12 | Tras tirar, "Acciones recientes" enseña "Tirada libre (Reflejos + Sigilo)"; con "Ninguna", "Tirada libre (Perspicacia)". "Tirar otra vez" repite con el mismo par | navegador |
| C13 | Un personaje con alguna casilla o texto de dote/aumento que alcance por aplicado o habilidad (si no hay en la BD local, uno de prueba revertido al acabar): en la tirada libre con ese aplicado/habilidad no sale ninguna casilla, texto, ventaja ni crítico mejorado | navegador |
| C14 | La estrella de "Tirada libre" la manda a Favoritas y sigue tras recargar | navegador |
| C15 | Editor de NPC (`/master/npcs/<id>`) y panel de acciones de un NPC en `/master/combate`: la fila "Tirada libre" sale en Tiradas, sin estrella, y abre el modal con los selectores (si hace falta un combate local, se crea y se borra al acabar) | navegador |
| C16 | Los selectores miden al menos 40 px de alto y no hay scroll horizontal a 390 px de ancho | navegador |
| C17 | Sin colores literales nuevos (líneas añadidas que no solo se mueven) | diff (`--color-moved=plain` contra la base) |
| C18 | `docs/sistema.md` tiene en "Supuestos tomados al implementar" el de la tirada libre con lo de R1 y R2 y la cita al usuario (2026-10-23) | prosa fuente |
| C19 | `docs/tareas.md`: entrada de la tirada libre, hecha, en "Pestaña Acciones: pestañas y favoritas" | diff |
| C20 | `npm run lint` en verde (ESLint prohíbe importar piezas sueltas de `rules/` desde la UI), y en el diff de `AccionesTab.tsx`, `acciones/*` y `AccionModal.tsx` no hay sumas de aplicado, habilidad o modificadores: el total y el desglose salen de `montarTirada` | comando + diff |

## Inspección

```
C1  ok
C2  ok
C3  problema: "`tiradaId` cualquiera −4" no fija el id. `alcanzaA` (modificadores.ts:279) casa `tiradaId` por
    `ctx.id`, así que si el revisor escoge el id de la propia tirada libre, la regla R1 ("nada con alcance tiradaId")
    exige que se filtre por tipo de alcance, y si escoge otro (p. ej. `salv_fortaleza`) no se comprueba nada de eso.
    Según qué id escoja el revisor, la misma construcción pasa o no pasa: el oráculo no es determinista
    → propuesta: fijar los dos casos, `tiradaId: "salv_fortaleza"` −4 y `tiradaId` = id de la tirada libre −4, o
    fijar solo el primero y quitar de R1 el "nada con tiradaId" para el id propio.
C4  ok
C5  ok
C6  ok
C7  ok
C8  ok
C9  ok
C10 ok
C11 ok (catalog/estados.ts: Aturdido "Fracaso" = grupo Defensa −1, "Éxito" = todas −1)
C12 ok
C13 ok
C14 ok
C15 ok
C16 ok
C17 ok
C18 ok
C19 ok (la sección existe en docs/tareas.md:831)
Contrato: problema:
  (a) El alcance dice que la fila sale en el panel de combate del máster "allí sin estrella", y ningún criterio lo
      cubre: C15 solo mira el editor de NPC
      → propuesta: añadir un criterio de navegador. En el centro de mando, panel de acciones de un NPC
        (NpcAccionesPanel), sale "Tirada libre" en Tiradas, sin estrella, y abre el modal con los selectores.
  (b) "nada de totales en el componente" y "expuesto desde `@/lib/rules`" no los comprueba nadie. La regla de ESLint
      del proyecto, que prohíbe importar piezas sueltas de rules desde src/app y src/components, es justo el oráculo,
      y C1 no corre lint
      → propuesta: añadir `npm run lint` en verde a C1, o como criterio aparte.
  "Puede tocar" alcanza (favoritas por clave fija e historial viven en AccionesTab; las casillas llegan por
  conExtrasDeFicha en fichaResuelta.ts, que está permitido) y no abre de más. Ningún "fuera de alcance" choca con un
  criterio. Tamaño: un área, sin schema.

Veredicto: vuelve al jefe
```

### Pasada 2

```
C1  ok
C2  ok
C3  ok (ahora fija `tiradaId: "sigilo"`, id real de la acción fija Sigilo, grupo "Acciones" en acciones.ts:315;
    casa con R1 reescrita. `grupoHabilidad` (Acciones, sigilo) y `grupo: "Acciones"` solo quedan fuera si el grupo
    propio de la tirada libre es nuevo, como pide la spec)
C4  ok
C5  ok
C6  ok
C7  ok
C8  ok
C9  ok
C10 ok
C11 ok
C12 ok
C13 ok
C14 ok
C15 ok (cubre ya NpcAccionesPanel, que monta el mismo AccionesTab)
C16 ok
C17 ok
C18 ok
C19 ok
C20 ok (cubre lo de "nada de totales en el componente" y la regla de ESLint)
Contrato: ok. Los dos problemas de la pasada 1 quedan resueltos (C15 y C20). "Puede tocar" alcanza y no abre de
  más (NpcEditor y NpcAccionesPanel no hace falta tocarlos: usan AccionesTab). Ningún "fuera de alcance" choca con un
  criterio. Tamaño: un área, sin schema.

Veredicto: pasa
```

## Construcción

Commit `7a9092a` en `fabrica/T-007-tirada-libre`. `npm test` (1708/1708), `npx tsc --noEmit` y `npm run lint` en verde.

```
src/lib/rules/acciones.ts → campo `Accion.libre?: true` comentado; `TIRADA_LIBRE_ID`, `tiradaLibre(aplicado = "perspicacia",
    habilidad = null)` (grupo "Libre") y `etiquetaTiradaLibre(aplicado, habilidad)` para el historial   (C3, C4, C7, C12)
src/lib/rules/modificadores.ts → `GrupoAccion` gana "Libre": no casa ningún alcance `grupo`/`grupoHabilidad`   (C3)
src/lib/rules/montaje.ts → con `libre`, `enEspecialidadEfectiva` da false y la habilidad se calcula entera
    (`valorEfectivo` con entera), sin "(especialidad)" en el desglose   (C4, R2)
src/lib/rules/fichaResuelta.ts → `conExtrasDeFicha` devuelve la tirada libre tal cual: sin casillas, textos, ventajas,
    bonos por tramo, descuentos ni crítico fijo   (C13, R1)
src/lib/rules/tiradaLibre.test.ts → test nuevo: Ninguna = solo aplicado; habilidad entera (Biociencia con
    especialidad, sin mitad); todas −1 entra; aplicado voluntad −2 sí/no; habilidad sigilo +1 sí/no; grupo Defensa,
    grupo Acciones, tiradaId sigilo, grupoHabilidad y familiaArma no entran (con Sigilo y con Ninguna);
    anulaPenalizadores todas; conExtrasDeFicha no añade nada; etiquetas   (C3, C4, C6)
src/components/AccionModal.tsx → con `tirada.libre`, dos `<select>` nativos (min-h-10) antes de Activaciones/Dificultad:
    los 6 de APLICADOS y "Ninguna" + HABILIDADES. El estado vive en el modal (repite el par en "Tirar otra vez")
    y monta `{ ...tirada, aplicado, habilidad }` con `montarTirada`. Solo tokens   (C9, C10, C16, C17, C20)
src/app/characters/[id]/_components/AccionesTab.tsx → `FilaTiradaLibre` (botón "Tirar", estrella con clave
    `fija:tirada_libre`), última de la sección "Acciones" vía `verTirada`, así que solo en Tiradas/Favoritas; abre
    `tiradaLibre()`. En `tirar()`, label del historial con `etiquetaTiradaLibre(montada.aplicado.id,
    montada.habilidad?.id)`. Sin `onMarcarFavorita` (NPC, combate) sale sin estrella   (C8, C12, C14, C15)
docs/sistema.md → supuesto S79 con R1, R2 y la cita al usuario (2026-10-23)   (C18)
docs/tareas.md → entrada T-007 hecha en "Pestaña Acciones: pestañas y favoritas" (y cabecera con T-007)   (C19)
```

Notas para el revisor:
- Una habilidad sin entrenar vale −1 (regla general de `valorEfectivo`, S2), también en la tirada libre. Para C4/C10,
  mejor una habilidad entrenada.
- La fila no enseña número (el par se elige en el modal). La dificultad que se recuerda va por id (`tirada_libre`),
  como en las demás. El par no se recuerda.

No hecho: las comprobaciones de navegador (C8–C16). Son de revisión; la estación no me deja más que tests, tsc y lint.
Tests existentes cambiados: ninguno

### Intento 2

bloqueo: el C2 que falla viene del parser `puedeTocar` (`fabrica/guion/contrato.mjs:119`), no del diff de la rama, y
arreglarlo exige tocar la Spec o `fabrica/guion/`, que no están en "Puede tocar".

```
Diagnóstico (sin tocar código; rama sin cambios desde 7a9092a, worktree limpio):
- `git diff --stat fabrica/T-006-acciones-favoritas...HEAD`: 9 archivos, todos listados en "Puede tocar" del contrato
  (acciones.ts, modificadores.ts, montaje.ts, fichaResuelta.ts, *.test.ts, AccionModal.tsx, AccionesTab.tsx,
  docs/sistema.md, docs/tareas.md). index.ts no se toca.
- `puedeTocar(contrato)` devuelve solo ['src/lib/rules/acciones.ts', 'src/lib/rules/modificadores.ts', 'GrupoAccion',
  'src/lib/rules/montaje.ts']: el bucle hace `break` en la primera línea que no empieza por "-" o "*", y la línea de
  continuación sangrada del primer bullet ("  `src/lib/rules/fichaResuelta.ts`, ...") empieza por backtick. Todo lo
  que va detrás (fichaResuelta.ts y los bullets siguientes) se pierde. De ahí los seis "fuera" del juez.
- Desde la rama no hay salida: quitar fichaResuelta.ts, AccionModal.tsx, AccionesTab.tsx, el test o los docs rompería
  C6–C20.
Arreglo posible (no es mío): que el jefe reescriba "Puede tocar" sin líneas de continuación (un bullet por línea),
  o que `puedeTocar` acepte las líneas sangradas de continuación de un bullet.
```

No hecho: nada nuevo en la rama; el trabajo del intento 1 sigue tal cual.
Tests existentes cambiados: ninguno

## Revisión

Revisor, intento 1 (vuelta 0). C1, C2 y push seguro los vota el script. Votos en `.votos-T-007.json`.

```
C3  pasa   evidencia: test propio (montarTirada sobre tiradaLibre, ficha sintética): todas −1 entra; aplicado voluntad −2
           solo con Voluntad; habilidad sigilo +1 solo con Sigilo; grupo Defensa −2, grupo Acciones −3, tiradaId sigilo −4,
           grupoHabilidad (Acciones, sigilo) −5, familiaArma −6 no entran (ni con Sigilo); anulaPenalizadores todas anula el −1
C4  pasa   evidencia: mismo test: Ninguna = aplicado; Reflejos + Biociencia 5 (con especialidad) = aplicado + 5 entera
C5  pasa   evidencia: 0 líneas quitadas en *.test.ts; solo se añade tiradaLibre.test.ts
C6  pasa   evidencia: tiradaLibre.test.ts cubre todas, aplicado sí/no, grupo Defensa no y Ninguna
C7  pasa   evidencia: `Accion.libre?: true` comentado (acciones.ts); el modal decide por `tirada.libre`, nunca por el id
C8  pasa   evidencia: navegador, qa-motor-test: última fila de "Acciones" en Tiradas = Tirada libre con TIRAR y ☆; no en Básicas
C9  pasa   evidencia: navegador: selects antes de Dificultad; 6 aplicados (Perspicacia), Ninguna (elegida) + 10 habilidades
C10 pasa   evidencia: navegador: Reflejos +3, Sigilo +3, TOTAL +6 (Atributos REFLEJOS 3, Habilidades SIGILO 3)
C11 pasa   evidencia: navegador: Aturdido Fracaso (Defensa baja a +4) → la libre sin línea de Aturdido; Aturdido Éxito →
           "Aturdido −1" en la libre (+2 / +5). Estado quitado al acabar
C12 pasa   evidencia: navegador: "Tirada libre (Reflejos + Sigilo)", "Tirar otra vez" repite con mod +6, y
           "Tirada libre (Perspicacia)" con Ninguna (el par vuelve al defecto al reabrir)
C13 pasa   evidencia: navegador: Convencer/Mentir enseña la activación de Presencia Imponente y Tratar heridas la de Ojo
           Clínico (ventaja); la libre con Expresión + Actitud o Perspicacia + Biociencia no enseña activaciones ni casillas
C14 pasa   evidencia: navegador: ★ → sale en Favoritas y sigue tras recargar; desmarcada al acabar
C15 pasa   evidencia: navegador: editor del NPC Guardia de seguridad y su panel ACCIONES en /master/combate: Tiradas sin
           Favoritas, Tirada libre última de "Acciones" sin estrella, modal con los dos selects. NPC de prueba quitado del
           combate al acabar
C16 pasa   evidencia: navegador 390 px: selects de 40 px, scrollWidth 390 en página y modal
C17 pasa   evidencia: sin hex/rgb/hsl ni paletas Tailwind nuevas; `text-black` del botón es la misma clase literal que las
           filas existentes
C18 pasa   evidencia: docs/sistema.md S79 con R1, R2 y "Usuario, 2026-10-23"
C19 pasa   evidencia: docs/tareas.md, "- [x] **T-007**" en "Pestaña Acciones: pestañas y favoritas"
C20 pasa   evidencia: `npm run lint` limpio; la UI monta con `montarTirada(ficha, tiradaEfectiva, …)` y la etiqueta sale de
           `montada`, sin sumas en el componente
```

Hallazgos (no votan):
- El "alcance falla" del script parece cosa del parser: su `puedeTocar` solo pilla la primera línea del bullet de
  "Puede tocar" y se come las de continuación. Los seis archivos que marca como "fuera" están todos en la lista del
  contrato.
- `index.ts` no se toca: lo nuevo sale por el `export * from "./acciones"` que ya existía.
- C13: en la BD local nadie tiene una casilla o texto de alcance `aplicado` a secas (p. ej. Asa Estriatotalámica);
  se probó con las de habilidad.
- La consola de combate no tiene botón para quitar un combatiente: el NPC de prueba se borró por SQL en local.

## Juicio
### Intento 1 · vuelve
**Motivo:** falla C2; vuelve al constructor (vuelta 1/2)

| # | veredicto | vota | evidencia |
|---|---|---|---|
| C1 | pasa | script | npm test; npx tsc --noEmit |
| C2 | falla | alcance | fuera de "Puede tocar": docs/sistema.md, docs/tareas.md, src/app/characters/[id]/_components/AccionesTab.tsx, src/components/AccionModal.tsx… |
| C3 | pasa | revisor | test propio del revisor (scratchpad/c3.test.ts, node --test con el resolver del worktree): todas -1 entra; aplicado voluntad -2 entra con Voluntad y no con… |
| C4 | pasa | revisor | mismo test propio: con Ninguna total = aplicado(sheet) para perspicacia/reflejos/voluntad; Perspicacia+Sigilo(3) = aplicado+3; Reflejos+Biociencia(5, con… |
| C5 | pasa | revisor | git diff -U0 base...rama -- '*.test.ts' \| grep '^-' (sin '---'): 0 líneas; solo se añade src/lib/rules/tiradaLibre.test.ts |
| C6 | pasa | revisor | src/lib/rules/tiradaLibre.test.ts nuevo: 'un penalizador a todas entra', 'uno por aplicado entra solo con ese aplicado' (sí/no), 'nada por grupo...' (grupo… |
| C7 | pasa | revisor | acciones.ts: campo `libre?: true` en Accion con comentario de 3 líneas; AccionModal.tsx pinta los selects con `tirada.libre &&` y monta tiradaEfectiva con… |
| C8 | pasa | revisor | navegador, qa-motor-test, Acciones → Tiradas: última fila del bloque 'ACCIONES' = 'TIRADA LIBRE \| APLICADO + HABILIDAD, A ELEGIR \| TIRAR \| ☆' (la anterior… |
| C9 | pasa | revisor | navegador: modal 'TIRADA LIBRE' con '// APLICADO' (Fortaleza, Potencia, Reflejos, Voluntad, Perspicacia, Expresión; elegida Perspicacia) y '// HABILIDAD'… |
| C10 | pasa | revisor | navegador: Reflejos+Sigilo → desglose 'Reflejos +3 \| Sigilo +3 \| TOTAL +6'; ficha: Atributos REFLEJOS 3, Habilidades SIGILO 3 |
| C11 | pasa | revisor | navegador: Aturdido Fracaso puesto desde /master (Defensa/Esquiva baja de +5 a +4) → tirada libre 'Perspicacia +3 \| TOTAL +3' y 'Reflejos +3 \| Sigilo +3 \|… |
| C12 | pasa | revisor | navegador: Acciones recientes 'Tirada libre (Reflejos + Sigilo)'; 'Tirar otra vez' tira con 'mod +6' y añade otra 'Tirada libre (Reflejos + Sigilo)'; al… |
| C13 | pasa | revisor | navegador, qa-motor-test (Presencia Imponente, Ojo Clínico): Convencer/Mentir (EXP+Actitud) enseña activación 'Intimidación: ¿Tu físico influye...? (Presencia… |
| C14 | pasa | revisor | navegador: estrella ☆→★, sale en Favoritas; tras recargar sigue en Favoritas con ★. Desmarcada al acabar (favoritas de qa-motor-test en BD sin… |
| C15 | pasa | revisor | navegador: /master/npcs/<Guardia de seguridad> → Acciones: pestañas BÁSICAS/TIRADAS (sin Favoritas), Tirada libre última de ACCIONES con botones ['TIRAR']… |
| C16 | pasa | revisor | navegador a 390x844 mobile: selects de 40 px de alto (17-191 y 199-373 px), documentElement.scrollWidth 390 y modal scrollWidth 390 con 'Combate a Distancia'… |
| C17 | pasa | revisor | grep de líneas añadidas por #hex, rgb(, hsl( y paletas Tailwind con nombre: 0. Única clase no-token es `text-black` del botón TIRAR de FilaTiradaLibre, misma… |
| C18 | pasa | revisor | docs/sistema.md S79 en la tabla de supuestos: alcances todas/aplicado/habilidad + anulaPenalizadores, fuera tiradaId de otra, grupo, grupoHabilidad… |
| C19 | pasa | revisor | docs/tareas.md: '- [x] **T-007** — Tirada libre (2026-10-23)...' dentro de '### Pestaña Acciones: pestañas y favoritas' |
| C20 | pasa | revisor | npm run lint en el worktree sin errores; diff de AccionesTab.tsx y AccionModal.tsx sin sumas: el modal hace `montarTirada(ficha, tiradaEfectiva, ...)` y el… |
| script | pasa | script | lint: pasa; ficha: no aplica; prod: pasa |

**Qué falla:**
- **C2** (alcance):
  ```
  fuera de "Puede tocar": docs/sistema.md, docs/tareas.md, src/app/characters/[id]/_components/AccionesTab.tsx, src/components/AccionModal.tsx, src/lib/rules/fichaResuelta.ts, src/lib/rules/tiradaLibre.test.ts
  ```

**Para el usuario:** Vuelve al constructor para arreglar C2.

### Intento 2 · escalado
**Motivo:** el constructor declaró bloqueo: El C2 falla porque puedeTocar (fabrica/guion/contrato.mjs) corta en las líneas de continuación del bullet de Puede tocar; el diff está dentro del alcance y arreglarlo exige tocar la Spec o el guion, fuera de lo que puedo tocar.

| # | veredicto | vota | evidencia |
|---|---|---|---|
| C1 | falla | script | sin resultado de revisar.mjs |
| C2 | falla | alcance | sin resultado de alcance.mjs |
| C3 | falla | revisor | el revisor no dejó sus votos en .votos-T-007.json |
| C4 | falla | revisor | el revisor no dejó sus votos en .votos-T-007.json |
| C5 | falla | revisor | el revisor no dejó sus votos en .votos-T-007.json |
| C6 | falla | revisor | el revisor no dejó sus votos en .votos-T-007.json |
| C7 | falla | revisor | el revisor no dejó sus votos en .votos-T-007.json |
| C8 | falla | revisor | el revisor no dejó sus votos en .votos-T-007.json |
| C9 | falla | revisor | el revisor no dejó sus votos en .votos-T-007.json |
| C10 | falla | revisor | el revisor no dejó sus votos en .votos-T-007.json |
| C11 | falla | revisor | el revisor no dejó sus votos en .votos-T-007.json |
| C12 | falla | revisor | el revisor no dejó sus votos en .votos-T-007.json |
| C13 | falla | revisor | el revisor no dejó sus votos en .votos-T-007.json |
| C14 | falla | revisor | el revisor no dejó sus votos en .votos-T-007.json |
| C15 | falla | revisor | el revisor no dejó sus votos en .votos-T-007.json |
| C16 | falla | revisor | el revisor no dejó sus votos en .votos-T-007.json |
| C17 | falla | revisor | el revisor no dejó sus votos en .votos-T-007.json |
| C18 | falla | revisor | el revisor no dejó sus votos en .votos-T-007.json |
| C19 | falla | revisor | el revisor no dejó sus votos en .votos-T-007.json |
| C20 | falla | revisor | el revisor no dejó sus votos en .votos-T-007.json |
| script | falla | script | sin resultado de revisar.mjs |

**Qué falla:**
- **C1** (script):
  ```
  sin resultado de revisar.mjs
  ```
- **C2** (alcance):
  ```
  sin resultado de alcance.mjs
  ```
- **C3** (revisor):
  ```
  el revisor no dejó sus votos en .votos-T-007.json
  ```
- **C4** (revisor):
  ```
  el revisor no dejó sus votos en .votos-T-007.json
  ```
- **C5** (revisor):
  ```
  el revisor no dejó sus votos en .votos-T-007.json
  ```
- **C6** (revisor):
  ```
  el revisor no dejó sus votos en .votos-T-007.json
  ```
- **C7** (revisor):
  ```
  el revisor no dejó sus votos en .votos-T-007.json
  ```
- **C8** (revisor):
  ```
  el revisor no dejó sus votos en .votos-T-007.json
  ```
- **C9** (revisor):
  ```
  el revisor no dejó sus votos en .votos-T-007.json
  ```
- **C10** (revisor):
  ```
  el revisor no dejó sus votos en .votos-T-007.json
  ```
- **C11** (revisor):
  ```
  el revisor no dejó sus votos en .votos-T-007.json
  ```
- **C12** (revisor):
  ```
  el revisor no dejó sus votos en .votos-T-007.json
  ```
- **C13** (revisor):
  ```
  el revisor no dejó sus votos en .votos-T-007.json
  ```
- **C14** (revisor):
  ```
  el revisor no dejó sus votos en .votos-T-007.json
  ```
- **C15** (revisor):
  ```
  el revisor no dejó sus votos en .votos-T-007.json
  ```
- **C16** (revisor):
  ```
  el revisor no dejó sus votos en .votos-T-007.json
  ```
- **C17** (revisor):
  ```
  el revisor no dejó sus votos en .votos-T-007.json
  ```
- **C18** (revisor):
  ```
  el revisor no dejó sus votos en .votos-T-007.json
  ```
- **C19** (revisor):
  ```
  el revisor no dejó sus votos en .votos-T-007.json
  ```
- **C20** (revisor):
  ```
  el revisor no dejó sus votos en .votos-T-007.json
  ```
- **script** (script):
  ```
  sin resultado de revisar.mjs
  ```

**Para el usuario:** Necesita tu decisión: la línea se para aquí.

## Decisión
aprobado: escaló solo por C2, un falso fallo del parser de "Puede tocar" (F-016): todos los demás criterios pasaron en
el intento 1 y, con el contrato en una ruta por línea, `alcance.mjs` pasa (9 archivos, todos dentro). El Jefe lo probó
además en el navegador (selectores, desglose Reflejos + Sigilo = +6, tirada, "Tirar otra vez" e historial). El usuario
lo da por bueno. Sin mergear: la rama lleva T-005, T-006 y T-007; merge y push, del usuario.

## Métricas y retro
| vueltas | minutos | tokens | operario (fallos/llamadas) | ¿retocado antes del push? |
|---|---|---|---|---|
| 1/2 (falsa, por F-016) | 19 (+3 de la inspección devuelta) | ~570k (18 agentes en total; ~470k el intento perdido) | 0/10 (+0/3 de la inspección devuelta) | no |

**Preguntas de reglas:** 0; R1 y R2 las dictó el usuario en el encargo.
**Fue bien:** el código salió bien a la primera; el revisor probó estados, casillas, NPC y combate de verdad.
**Cambiaríamos:** el formato de "Puede tocar" del Jefe rompió el parser sin aviso y costó una vuelta entera (F-016;
se arregla en T-008). Y otra devolución de la inspección por un oráculo sin fijar (C3, F-015).
**Rama que se conserva:** `fabrica/T-007-tirada-libre` (lleva T-005, T-006 y T-007), hasta que el usuario la mergee.
