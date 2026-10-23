---
id: T-005
titulo: La pestaña Acciones se separa en Básicas (sin tirada) y Tiradas (con tirada)
origen: manual
estado: hecho
vueltas: 0/2
rama: fabrica/T-005-acciones-en-pestanas
creado: 2026-10-23
inicio: 2026-10-23T12:20:49.212Z
operario: 0/6
fin: 2026-10-23T12:50:27.698Z
---

<!--
Fase 1 de 2. La fase 2 (T-006, favoritas guardadas en la ficha) sale de main cuando esté mergeado este.
Decidido ya para T-006 (usuario, 2026-10-23): las favoritas se guardan en la ficha (stats Json, sube SCHEMA_VERSION,
sin Prisma); se pueden marcar tiradas y básicas; orden final Básicas · Tiradas · Favoritas, abre en Básicas; solo
personajes, no NPCs (allí ni estrella ni pestaña Favoritas).
-->

## Encargo
El usuario quiere separar en pestañas la pestaña Acciones de la ficha: **Básicas** (acciones sin tirada) y
**Tiradas** (acciones con tirada), para no tener que buscar entre filas mezcladas. La tercera pestaña, Favoritas,
llega en la fase 2 (T-006), que es la que le da contenido. (usuario, 2026-10-23)

## Decisiones de reglas
| # | Duda | Decisión | Quién | Fundamento |
|---|---|---|---|---|
| — | Ninguna: es UI y no toca reglas | — | — | — |

## Spec
**Alcance:**
- Dentro de la pestaña Acciones, una barra con dos pestañas en este orden: **Básicas** y **Tiradas**. Al montarse
  la pestaña Acciones se abre siempre en Básicas.
- **Tiradas** pinta todas las filas que tiran dado: `FilaTirada` (bloqueadas incluidas, con su motivo), la fila
  de Reparar/Fabricar y los poderes (psiónicos y de dote) que tienen tirada.
- **Básicas** pinta todas las filas sin dado: `FilaUsar`, Bloquear daño, las filas informativas (`FilaInfo`) y los
  poderes sin tirada.
- Si un poder tiene tirada o no se decide como hoy lo enseña `FilaPoder`: con `prepararPoder` y la selección vacía
  (`SELECCION_PODER_VACIA`).
- Cada fila que hoy sale en Acciones aparece en exactamente una de las dos pestañas: no se pierde ninguna ni se
  duplica.
- Dentro de cada pestaña se mantienen los subtítulos de sección de hoy (Ataques, Psiónica con sus disciplinas,
  Herramientas, Fármacos, los grupos fijos, Dotes, Aumentos), en el mismo orden. Una sección o una disciplina que en
  esa pestaña no tiene filas no pinta su subtítulo (`h2` o `h3`).
- "Acciones recientes" (el historial) se queda arriba, fuera de las pestañas, y se ve con cualquiera de las dos.
- Como `AccionesTab` es el mismo componente, el editor de NPC (`/master/npcs/[id]`) y el panel de acciones del
  combate del máster tienen también las dos pestañas.
- La barra de pestañas sigue el lenguaje visual de las pestañas de la ficha (`TabButton` de `CharacterSheet.tsx`,
  tokens de `globals.css`, nada de colores literales nuevos) y cada pestaña mide al menos 40 px de alto.
- **Solo lectura (ficha en revisión):** la barra sigue navegable aunque la ficha sea de solo lectura; las filas siguen
  desactivadas como hoy. Mismo patrón que Personaje: `AccionesTab` lleva su propio `PanelFieldset` (que envuelve las
  filas, no la barra) y `CharacterSheet.tsx` deja de envolver Acciones en el suyo, pasándole `soloLectura`. Los demás
  usos de `AccionesTab` (NPC) no cambian de comportamiento.
- `docs/tareas.md`: sección nueva en Pendiente, "Pestaña Acciones: pestañas y favoritas", con T-005 hecho y T-006
  pendiente. La entrada de la épica del motor que dice que la parte de filas con y sin dado "sigue sin diseñar"
  (≈ línea 153) apunta a esta sección.

**Fuera de alcance:**
- Favoritas: la pestaña, la estrella y guardarlas (T-006).
- Cambiar qué filas genera cada pieza, sus textos (incluido el botón "Abrir" de Bloquear daño) o sus modales.
- Recordar la pestaña elegida entre montajes o recargas.
- Las pestañas de la ficha en sí: de `CharacterSheet.tsx` solo se toca lo del fieldset de Acciones.

**Puede tocar:**
- `src/app/characters/[id]/_components/AccionesTab.tsx`
- `src/app/characters/[id]/_components/acciones/*` (nuevo, si conviene sacar la barra o las secciones)
- `src/app/characters/[id]/CharacterSheet.tsx` (solo el fieldset de Acciones y la prop `soloLectura`)
- `docs/tareas.md` (la sección nueva y la entrada de la épica del motor ≈ línea 153)

## Criterios
Qué cuenta como **fila de acción** (C4, C6, C7, C12): cada etiqueta de fila (`span.font-display.text-base`) que queda
debajo de la barra de pestañas; el historial y su tarjeta "sin tiradas" quedan encima y no cuentan. Se cuenta igual en
la rama y en `main`.

| # | Qué se tiene que cumplir | Oráculo |
|---|---|---|
| C1 | `npm test` y `npx tsc --noEmit` en verde | comando |
| C2 | Ningún cambio fuera de "Puede tocar" | `git diff --stat` |
| C3 | Ficha de un personaje (login local `master`/`master`), pestaña Acciones: hay una barra con "Básicas" y "Tiradas", en ese orden, y al entrar está seleccionada Básicas. Al salir a otra pestaña de la ficha y volver, vuelve a Básicas | navegador |
| C4 | En Básicas ninguna fila tiene botón "Tirar", y la única con "Abrir" es Bloquear daño. En Tiradas no hay ninguna `FilaUsar`: toda fila con botón "Usar" en Tiradas es de poder y enseña el modificador grande `+N`/`−N` junto al botón | navegador, en un personaje con arma melee, algún fármaco o herramienta y psiónica |
| C5 | Un personaje con un poder psiónico sin tirada y otro con tirada: el primero sale en Básicas y el segundo en Tiradas, cada uno bajo su subtítulo de disciplina | navegador |
| C6 | Ninguna fila se pierde ni se duplica: filas de Básicas + filas de Tiradas = filas de la pestaña Acciones de `main` para el mismo personaje, y ninguna etiqueta sale en las dos | navegador (contando por script en la rama y en `main`; `main` en un worktree temporal o con la app de `main` si está levantada) o, si no se puede levantar `main`, diff: cada `<FilaTirada`, `<FilaUsar`, `<FilaInfo`, `<FilaPoder`, `<FilaReparaFabrica` y `<FilaBloquearDanio` de `main` tiene su sitio en una sola pestaña |
| C7 | Ningún subtítulo vacío: en cada pestaña, cada `h2` de sección y cada `h3` de disciplina tiene al menos una fila debajo | navegador (por script) |
| C8 | "Acciones recientes" se ve encima de la barra con las dos pestañas, y tras tirar algo en Tiradas sigue ahí al pasar a Básicas | navegador |
| C9 | El editor de NPC (`/master/npcs/<id>`, pestaña de acciones) y el panel de acciones del combate del máster enseñan también "Básicas" y "Tiradas" | navegador |
| C10 | Sin colores literales nuevos: ninguna línea añadida en el diff contra `main` con `#xxx`, `rgb(` o clase de color de Tailwind sin token, **salvo las que ya estaban en `main` y solo se mueven** (p. ej. el `text-black` de los botones de fila) | diff (`git diff main --color-moved=plain` o comparando cada aparición con `main`) |
| C11 | `docs/tareas.md` tiene la sección "Pestaña Acciones: pestañas y favoritas" con T-005 hecho y T-006 pendiente, y la entrada de la épica del motor ya no dice solo "sigue sin diseñar" sin apuntar a ella | diff |
| C12 | El orden de los subtítulos `h2` de cada pestaña es el de `main` quitando los que no salen en ella | navegador (por script, mismo personaje en rama y `main`) o, si no se puede levantar `main`, diff: el orden de las secciones en el JSX no cambia |
| C13 | Cada pestaña de la barra mide al menos 40 px de alto | navegador (`getBoundingClientRect().height` por script) |
| C14 | Ficha de un jugador en revisión (`IN_REVIEW`, vista de jugador): se puede pasar de Básicas a Tiradas y volver, y los botones de las filas siguen desactivados | navegador (si no hay ficha en revisión en la BD local, se envía una a revisión desde la UI con su jugador y se retira al acabar) |

## Inspección

```
C1  ok
C2  ok
C3  ok (CharacterSheet.tsx:827 desmonta AccionesTab al cambiar de pestaña, así que un useState local vuelve a Básicas sin tocar nada fuera de alcance)
C4  problema: choca con la spec. La spec manda "Bloquear daño" a Básicas, pero FilaBloquearDanio (AccionesTab.tsx:338-360) tiene botón "Abrir", y C4 dice que en Básicas ninguna fila tiene "Tirar" ni "Abrir". Cambiar ese texto está fuera de alcance, así que C4 no se puede cumplir tal cual → propuesta: "en Básicas ninguna fila tiene botón 'Tirar', y la única con 'Abrir' es Bloquear daño". Y, para que lo de "Usar" se pueda observar, decir cómo se distingue en el navegador una fila de poder con tirada de una FilaUsar (la de poder enseña el modificador grande `+N` junto al botón).
C5  ok (que la clasificación de un poder dependa de su forma sí abre una duda: ver Contrato)
C6  problema: "filas de acción" no está definido para el conteo por script. Las HudCard de la pestaña incluyen la tarjeta del historial y la de "sin tiradas", que no son filas → propuesta: fijar qué se cuenta, p. ej. las HudCard que quedan debajo de la barra de pestañas, o las etiquetas `span.font-display.text-base` de cada fila, igual en `main` y en la rama
C7  problema: solo mira los `h2`. Los subtítulos de disciplina de Psiónica son `h3` (AccionesTab.tsx:1181), y la spec también los cubre ("una sección que en esa pestaña no tiene filas no pinta su subtítulo"): una disciplina con todos sus poderes sin tirada dejaría un `h3` vacío en Tiradas → propuesta: "cada `h2` y cada `h3` de disciplina tiene al menos una fila debajo"
C8  ok
C9  ok
C10 problema: falso fallo casi seguro. Todos los botones de fila usan `text-black` (AccionesTab.tsx:220, 325, 353, 385, 483), que es clase de color de Tailwind sin token. "Puede tocar" permite sacar las filas a `acciones/*`, y entonces esas líneas salen como añadidas en el diff y el grep las caza → propuesta: limitar el grep a líneas que no existían en `main` (excluir las que solo se mueven, p. ej. comparando contra las apariciones de `main` o con `git diff --color-moved`), o prohibir mover los componentes Fila*
C11 ok
Contrato: problema.
  1. Hay alcance sin criterio. "Mismo orden de secciones que hoy" no lo comprueba nadie (C7 solo mira que no haya vacías) → propuesta: criterio de navegador que compare el orden de los `h2` de cada pestaña con el orden de `main`, quitando los que falten. "Targets táctiles grandes" de la barra tampoco tiene criterio → propuesta: fijar un mínimo observable (p. ej. alto ≥ 40 px por script, o el mismo `py-2` que TabButton de CharacterSheet.tsx:153).
  2. Hueco de spec: en revisión (IN_REVIEW, jugador) la pestaña va dentro de `<fieldset disabled>` (CharacterSheet.tsx:791, revision.ts:65). Si la barra es de `<button>`, el jugador se queda clavado en Básicas y deja de ver Tiradas, que hoy sí ve en solo lectura → propuesta: que la spec diga que la barra sigue navegable en solo lectura (fuera del fieldset no se puede, porque CharacterSheet está fuera de alcance; habría que hacerla con algo que el fieldset no desactive) y añadir un criterio para eso.
  3. Duda menor: hoy el que un poder tenga tirada sale de prepararPoder con SELECCION_PODER_VACIA (usoPoder.ts:133, tiradaDePoder depende de la selección) → propuesta: que la spec diga explícitamente que se clasifica con la selección vacía, que es lo que enseña hoy FilaPoder.
  El tamaño está bien: un área, 1-2 archivos de código más docs, sin schema.

Veredicto: vuelve al jefe
```

### Pasada 2

```
C1  ok
C2  ok
C3  ok
C4  ok (cuadra con el código: FilaBloquearDanio es la única "Abrir" sin dado; FilaReparaFabrica también dice "Abrir" pero la spec la manda a Tiradas; FilaPoder pinta el `+N` solo cuando `montada`, que sale de `tirada` en prepararPoder, usoPoder.ts:174, así que el oráculo y la clasificación coinciden)
C5  ok
C6  ok (la definición de fila de acción vale: las seis Fila* usan `span.font-display.text-base`, AccionesTab.tsx:194-459, y el historial queda encima de la barra. Fármacos con y sin tirada no comparten etiqueta: cada fármaco está en uno solo de CON_TIRADA/SIN_TIRADA)
C7  ok
C8  ok
C9  ok
C10 ok
C11 ok (la entrada de la épica está en tareas.md:154, no 153; el "≈" lo cubre)
C12 ok
C13 ok (TabButton es `py-2 text-sm`, por debajo de 40 px; el constructor tendrá que subirlo en la barra nueva, cosa que la spec permite)
C14 ok (el login de la base local solo tiene `master`; el jugador se puede registrar desde /login, pero enviar a revisión exige ficha completa. Es trabajoso, no imposible, y no toca datos reales)
Contrato: ok. Los tres puntos de la pasada 1 están resueltos (orden con C12, tamaño con C13, solo lectura con la spec + C14, selección vacía en la spec). El cambio de CharacterSheet.tsx (sacar Acciones del PanelFieldset de :791 y pasarle soloLectura) entra en "Puede tocar" y en la spec. Nota menor sin bloqueo: el aviso `avisoAumento` (AccionesTab.tsx:1316) no es fila ni subtítulo y la spec no dice en qué pestaña va; lo más natural es que salga con la sección Aumentos donde se pinte. Tamaño: un área, 2-3 archivos de código más docs, sin schema.

Veredicto: pasa
```

## Construcción

```
Commit e7c1e26 en fabrica/T-005-acciones-en-pestanas.

src/app/characters/[id]/_components/AccionesTab.tsx → barra Básicas/Tiradas (estado local `pestana`, arranca en
  "basicas"; botones con el estilo de TabButton, tokens border-accent/text-foreground/text-muted, `min-h-10` = 40 px)
  entre el historial y las filas (C3, C8, C13). Cada sección decide sus filas por pestaña y no pinta su h2 si no le
  queda ninguna (C4, C6, C7, C12):
    Ataques: FilaTirada → Tiradas, FilaUsar (detonación) → Básicas.
    Psiónica / poderes de Dotes: `poderEnPestana` clasifica con prepararPoder + SELECCION_PODER_VACIA (tirada !== null
      → Tiradas); las disciplinas salen de los poderes de la pestaña, así que no queda h3 vacío (C5, C7). Los poderes
      que prepararPoder no resuelve (FilaPoder devuelve null) no entran en ninguna, como hoy no se pintan.
    Herramientas / Fármacos: FilaTirada → Tiradas, FilaUsar → Básicas.
    Grupos fijos: ACCIONES + Bloqueo/Volar generados + dotes en grupo → Tiradas, más Reparar/Fabricar en Acciones;
      Levantar escudo, directas de dote en grupo y acciones de especie → Básicas, más Bloquear daño en Defensa.
      Mismo orden relativo que en main.
    Dotes: poderes de dote primero (repartidos), luego dotesTiradas → Tiradas, dotesDirectas → Básicas.
    Aumentos: filas tirada/directa repartidas en su orden de catálogo, informativas → Básicas; el aviso `avisoAumento`
      sale con Básicas (solo lo produce usar una acción directa de aumento).
  Prop nueva `soloLectura` (por defecto false): `PanelFieldset` (importado de personaje/PersonajeTab) envuelve filas y
  modales, no la barra ni el historial (C14). Dentro, un div gap-3 para conservar el espaciado de antes.
src/app/characters/[id]/CharacterSheet.tsx → AccionesTab sale del PanelFieldset general (que ahora excluye
  "acciones", como ya excluía "personaje") y recibe `soloLectura={soloLectura}`. Nada más (C2, C14).
docs/tareas.md → sección nueva en Pendiente "Pestaña Acciones: pestañas y favoritas" con T-005 [x] y T-006 [ ]; la
  entrada de la épica del motor (línea 154) ya no dice solo "sigue sin diseñar" y apunta a esa sección (C11).

C1: npm test (1695 pass), npx tsc --noEmit y npm run lint en verde. C10: grep de colores literales sobre las líneas
añadidas no movidas (git diff --color-moved=plain), cero coincidencias.
No hecho: verificación en navegador (C3-C9, C12-C14). La estación no me deja levantar la app (`npm run dev` corre
  `prisma migrate deploy`); queda para el revisor.
Tests existentes cambiados: ninguno
```

## Revisión

```
Revisor, vuelta 0. App de la rama en :3007 contra la BD local; main en :3000 para comparar.

C3  pasa
    evidencia: barra [Básicas, Tiradas]; al entrar Básicas tiene border-accent. Paso a Tiradas → Equipo → Acciones y vuelve a Básicas
C4  pasa
    evidencia: qa-motor-test (melee, psiónica y dos fármacos añadidos para la prueba). Básicas: 4 poderes, Usar Analgésico y
              Levantar Rodela con [Usar], más Bloquear daño [Abrir]; ningún Tirar. Tiradas: las 8 filas con Usar son poderes
              y todas tienen +N (Anclaje +2, Proyección +0…). Ninguna FilaUsar
C5  pasa
    evidencia: Trasladar (sin tirada) en Básicas y Anclaje (con tirada) en Tiradas, los dos bajo "Traslación · nivel 4";
              Impulso, Expansión y Convergencia bajo "Singularidad · nivel 3"
C6  pasa
    evidencia: rama 7 + 30 = 37 filas, ninguna en las dos pestañas. main da 41 = esas 37 + Apuntar, Carrera, Discernir
              mentiras y Resistir distracción, que entran con 5b8a877 (posterior a la base de la rama; son ACCIONES fijas
              y en la rama irían a Tiradas). En el diff, cada Fila* de main cae en un solo lado de enTiradas
C7  pasa
    evidencia: por script, en qa-motor-test, QA-ARROJAR y Atom Zomon no queda ningún h2/h3 sin filas en ninguna pestaña
C8  pasa
    evidencia: "Acciones recientes" queda encima de la nav. Tras dos tiradas de Sigilo en Tiradas, en Básicas siguen las dos
C9  pasa
    evidencia: /master/npcs/<psionico> y el panel de acciones de un NPC en /master/combate (Guardia, añadido y luego borrado)
              enseñan Básicas/Tiradas, y abren en Básicas
C10 pasa
    evidencia: en las líneas añadidas (--color-moved=plain) no hay ningún #hex, rgb( ni clase de color de Tailwind sin
              token. La barra usa border-accent, text-foreground, text-muted y border-border
C11 pasa
    evidencia: la sección "Pestaña Acciones: pestañas y favoritas" tiene T-005 [x] y T-006 [ ], y la entrada de la épica
              (≈154) apunta a ella
C12 pasa
    evidencia: main: Ataques, Psiónica, Fármacos, Defensa, Salvaciones, Iniciativa, Acciones. Básicas: Psiónica, Fármacos,
              Defensa. Tiradas: las siete. Las dos son subsecuencias en el orden de main
C13 pasa
    evidencia: getBoundingClientRect().height = 40 en las dos pestañas
C14 pasa
    evidencia: jugador temporal qa-revisor-t005 con una copia de qa-motor-test en IN_REVIEW, vista de jugador. La barra no
              está disabled; Básicas → Tiradas → Básicas funciona, con 7/7 y 40/40 botones de fila desactivados. La ficha y
              el usuario se borraron al acabar

Hallazgos (no votan):
- La rama sale de 24993fc y main ya va por 5b8a877 (toca AccionesTab.tsx y tareas.md); git merge-tree da merge limpio.
- Los modales quedan dentro del PanelFieldset nuevo. En NPC/combate es disabled=false y no cambia nada; en revisión ya
  estaban dentro del fieldset de CharacterSheet.
- Ataques ya no pinta su h2 vacío en personajes sin armas (en main salía siempre). Es lo que pide la spec, pero se ve
  distinto respecto a hoy.
- Datos locales de prueba restaurados: farmacos de qa-motor-test, el Combatiente Guardia y el usuario/ficha qa-revisor-t005.
```

## Juicio
### Intento 1 · contigo
**Motivo:** todos los criterios pasan con evidencia

| # | veredicto | vota | evidencia |
|---|---|---|---|
| C1 | pasa | script | npm test; npx tsc --noEmit |
| C2 | pasa | alcance | 3 archivos cambiados, todos dentro de "Puede tocar" |
| C3 | pasa | revisor | navegador (rama :3007, qa-motor-test): barra nav con botones ['Básicas','Tiradas'] en ese orden; al entrar Básicas lleva border-accent y Tiradas no. Se pasó a… |
| C4 | pasa | revisor | navegador, qa-motor-test (6 melee + rodela, psiónica traslación 4 / singularidad 3, se le añadieron temporalmente farmaco_analgesico y farmaco_hemostaticos)… |
| C5 | pasa | revisor | navegador, qa-motor-test: Trasladar (sin tirada) en Básicas bajo h3 'Traslación · nivel 4'; Anclaje (con tirada) en Tiradas bajo h3 'Traslación · nivel 4'… |
| C6 | pasa | revisor | conteo por script de span.font-display.text-base bajo la barra: rama Básicas 7 + Tiradas 30 = 37, sin etiquetas repetidas entre pestañas; main (:3000, mismo… |
| C7 | pasa | revisor | script en qa-motor-test, QA-ARROJAR y Atom Zomon: lista de h2/h3 bajo la barra sin fila span.font-display.text-base en su contenedor = [] en Básicas y en… |
| C8 | pasa | revisor | navegador: h2 'Acciones recientes' antes de la nav (compareDocumentPosition). Tras tirar Sigilo en Tiradas (11 éxitos y 6 éxitos), al pulsar Básicas el… |
| C9 | pasa | revisor | navegador: /master/npcs/cmun6hf8o000audyuj5s33qml pestaña Acciones con nav ['Básicas','Tiradas']; /master/combate, NPC Guardia de seguridad añadido… |
| C10 | pasa | revisor | git diff main...rama --color-moved=plain -- src, líneas añadidas no movidas filtradas con grep de #hex, rgb( y… |
| C11 | pasa | revisor | docs/tareas.md: sección '### Pestaña Acciones: pestañas y favoritas' en Pendiente con '- [x] **T-005**' y '- [ ] **T-006**'; la entrada de la épica (≈154)… |
| C12 | pasa | revisor | main qa-motor-test h2: Ataques, Psiónica, Fármacos, Defensa, Salvaciones, Iniciativa, Acciones. Rama Básicas: Psiónica, Fármacos, Defensa; Tiradas: Ataques… |
| C13 | pasa | revisor | getBoundingClientRect().height = 40 para 'Básicas' y para 'Tiradas' (clase min-h-10) |
| C14 | pasa | revisor | jugador temporal qa-revisor-t005 registrado desde /login, con copia de qa-motor-test en IN_REVIEW ('EN REVISIÓN' en la cabecera), vista de jugador: botones de… |
| script | pasa | script | lint: pasa; ficha: no aplica; prod: pasa |

**Para el usuario:** Todo pasa. La rama fabrica/T-005-acciones-en-pestanas está lista para que la mires; el push es tuyo.

## Decisión
aprobado: el usuario lo probó en local (rama en :3007) y lo da por bueno. Echó de menos Favoritas, que es T-006 por
diseño, y vio una sola fila en Básicas: la categorización se repensará aparte (qué acciones sin dado deberían existir).
Sin mergear todavía: T-006 sale de esta rama (`base`) para no tocar main mientras trabajan otros agentes. Merge y push,
del usuario.

## Métricas y retro
| vueltas | minutos | tokens | operario (fallos/llamadas) | ¿retocado antes del push? |
|---|---|---|---|---|
| 0/2 | 14 (+2,5 de la inspección devuelta) | ~460k (13 agentes en total) | 0/6 (+0/3 de la inspección devuelta) | no |

**Preguntas de reglas:** 0.
**Fue bien:** pasó a la primera tras la inspección. El inspector cazó un hueco real (en revisión el fieldset dejaba
al jugador clavado en Básicas) y el revisor comparó la rama contra main levantando las dos apps.
**Cambiaríamos:** la inspección devolvió por un criterio que chocaba con la propia spec (C4 y el "Abrir" de Bloquear
daño) y por puntos del alcance sin criterio (orden de secciones, targets táctiles): F-014 otra vez, el repaso del Jefe
no bastó. Y el usuario esperaba ver Favoritas en la fase 1: al partir un encargo en varios T, decirlo en la primera
línea del contrato y no solo en el cuerpo.
**Rama que se conserva:** `fabrica/T-005-acciones-en-pestanas`, hasta que se mergee: es la base de T-006.
