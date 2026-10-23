---
id: T-006
titulo: Marcar acciones como favoritas y verlas en su pestaña, guardadas en la ficha
origen: manual
estado: hecho
vueltas: 0/2
rama: fabrica/T-006-acciones-favoritas
base: fabrica/T-005-acciones-en-pestanas
creado: 2026-10-23
inicio: 2026-10-23T13:23:10.827Z
operario: 0/6
fin: 2026-10-23T13:48:29.145Z
---

<!--
Fase 2 de 2 (la 1 es T-005, aprobado y sin mergear todavía: por eso la base es su rama, para no tocar main mientras
trabajan otros agentes; al mergear T-006 entra también T-005).
Decidido por el usuario (2026-10-23): en la ficha (stats Json), tiradas y básicas, orden Básicas · Tiradas · Favoritas
abriendo en Básicas, solo personajes.
-->

## Encargo
Fase 2 de 2 (la 1 es T-005). El usuario quiere poder marcar acciones como favoritas y tenerlas juntas en una
pestaña **Favoritas** dentro de Acciones, para ir directo a lo que usa siempre. Tienen que seguir ahí aunque se cierre
la app, así que se guardan en la ficha y valen en cualquier dispositivo. (usuario, 2026-10-23)

## Decisiones de reglas
| # | Duda | Decisión | Quién | Fundamento |
|---|---|---|---|---|
| — | Ninguna: es UI y no toca reglas | — | — | — |

## Spec
**Alcance:**
- **Dato:** la ficha guarda `favoritas`, una lista de ids de acción (sin repetidos, como mucho 100, cada id como mucho
  120 caracteres). `parseSheet` la lee tolerante (lo que no es texto, los repetidos y lo que sobra se descartan) y por
  defecto es `[]`. Sube `SCHEMA_VERSION` de 20 a 21 con su paso en `rules/migraciones.ts` (`favoritas: []`) y su
  comentario en la lista de versiones de `sheet.ts`.
- **Guardar:** server action nuevo en `src/app/characters/[id]/actions.ts` que marca o desmarca un id, validado con
  Zod y pasando por `loadEditable` (permisos y solo lectura como cualquier otro cambio).
- **Estrella:** cada fila de acción con botón (`FilaTirada`, bloqueadas incluidas; `FilaUsar`; `FilaPoder`; Bloquear
  daño; Reparar/Fabricar) lleva un botón estrella para marcar o desmarcar, con `aria-pressed` y `aria-label`
  "Añadir a favoritas" / "Quitar de favoritas", de al menos 40 px de alto. Las filas informativas (`FilaInfo`) no
  llevan. El id que se guarda es el de la acción de la fila; Bloquear daño y Reparar/Fabricar, que no tienen
  `Accion`, usan una clave fija.
- La estrella cambia al pulsarla, sin esperar al servidor, y si el guardado falla vuelve a como estaba.
- **Pestaña Favoritas:** tercera de la barra, en orden **Básicas · Tiradas · Favoritas**; se sigue abriendo en Básicas.
  Pinta las filas marcadas, de tirada y sin tirada, con los mismos subtítulos de sección y en el mismo orden que en
  las otras pestañas, sin subtítulos vacíos. Desde ahí la fila funciona igual (Tirar/Usar/Abrir) y se puede
  desmarcar. Sin ninguna favorita, un texto: "Marca con la estrella las acciones que más uses".
- Un id guardado cuya acción ya no existe (p. ej. el arma se vendió) no se pinta ni da error.
- **Solo personajes:** la estrella y la pestaña Favoritas salen solo si quien monta `AccionesTab` le pasa la función
  de marcar (lo hace `CharacterSheet.tsx`). En el editor de NPC y en el panel de combate del máster no salen.
- `docs/tareas.md`: en la sección "Pestaña Acciones: pestañas y favoritas", T-006 hecho.

**Fuera de alcance:**
- Favoritas en NPCs.
- Ordenar las favoritas a mano o arrastrando.
- Marcar favoritas con la ficha en revisión siendo jugador: se bloquea como cualquier otro cambio (la pestaña sí se ve).
- Limpiar de la lista los ids de acciones que ya no existen.
- Repensar qué va en Básicas y qué en Tiradas (lo hablará el usuario aparte).

**Puede tocar:**
- `src/lib/rules/sheet.ts`, `src/lib/rules/sheet.test.ts`
- `src/lib/rules/migraciones.ts`, `src/lib/rules/migraciones.test.ts`
- `src/app/characters/[id]/actions.ts` (solo el action nuevo)
- `src/app/characters/[id]/CharacterSheet.tsx` (pasar favoritas y la función de marcar a `AccionesTab`)
- `src/app/characters/[id]/_components/AccionesTab.tsx`
- `src/app/characters/[id]/_components/acciones/*`
- `docs/tareas.md` (la línea de T-006 en su sección)

## Criterios
Qué cuenta como **fila de acción**: igual que en T-005, cada etiqueta de fila (`span.font-display.text-base`) debajo de
la barra de pestañas, **más las filas de tirada bloqueadas** (su etiqueta es `span.font-display.text-sm`). El **botón
estrella** se reconoce por su `aria-label` ("Añadir a favoritas" o "Quitar de favoritas").

| # | Qué se tiene que cumplir | Oráculo |
|---|---|---|
| C1 | `npm test` y `npx tsc --noEmit` en verde | comando |
| C2 | Ningún cambio fuera de "Puede tocar" | `git diff --stat` contra la base |
| C3 | La comprobación "ficha" de `revisar.mjs` pasa: `SCHEMA_VERSION` sube de 20 a 21 con su paso | comando (`npm run fabrica:revisar -- --base fabrica/T-005-acciones-en-pestanas --solo-diff`) |
| C4 | `parseSheet` con una ficha v20 sin `favoritas` da `favoritas: []`; con `favoritas: ["a", "a", 7, "b"]` da `["a", "b"]`; con 150 ids distintos da 100; un id de 200 caracteres se descarta | comando: comprobación propia del revisor con `parseSheet` y `migrarFicha` (o equivalente), valores fijados aquí |
| C5 | Ficha de un personaje (login local `master`/`master`), Acciones: la barra dice "Básicas", "Tiradas", "Favoritas", en ese orden, y abre en Básicas | navegador |
| C6 | Sin favoritas, la pestaña Favoritas no tiene filas y enseña "Marca con la estrella las acciones que más uses" | navegador |
| C7 | Se marca la estrella de una fila de Tiradas y de una de Básicas: las dos salen en Favoritas, cada una bajo su subtítulo, y la estrella aparece con `aria-pressed="true"`. Los `h2` de Favoritas son solo los de secciones con alguna fila marcada y van en el orden de las otras pestañas (Ataques, Psiónica, Herramientas, Fármacos, grupos fijos, Dotes, Aumentos) | navegador (marcando filas de al menos dos secciones) |
| C8 | **Persistencia:** tras marcar dos, se recarga la página entera (y se abre en una pestaña de navegador nueva): Favoritas sigue enseñando esas dos. En la BD, `stats.favoritas` de ese personaje tiene sus dos ids | navegador + comando (consulta a la BD local, solo lectura) |
| C9 | Desde Favoritas, "Tirar" en una fila de tirada abre el mismo modal que desde Tiradas, y desmarcar la estrella la quita de Favoritas (y sigue tras recargar) | navegador |
| C10 | Las filas informativas (`FilaInfo`) no tienen estrella; todas las demás filas de acción de Básicas y Tiradas, bloqueadas incluidas, tienen exactamente una | navegador (por script: botones estrella = filas de acción − filas informativas, en un personaje con al menos una tirada bloqueada; si no hay ninguno en la BD local, esa parte no aplica y se dice) |
| C11 | Cada botón estrella mide al menos 40 px de alto | navegador (`getBoundingClientRect().height` por script) |
| C12 | Editor de NPC (`/master/npcs/<id>`) y panel de acciones del combate del máster: barra con solo "Básicas" y "Tiradas", ninguna estrella | navegador |
| C13 | Un id guardado de una acción que no existe (se mete a mano en `stats.favoritas` de un personaje de prueba, y se deja como estaba al acabar) no rompe la página ni se pinta en Favoritas | navegador + comando (escritura en la BD local, revertida) |
| C14 | Jugador con su ficha en revisión: la pestaña Favoritas se ve y enseña sus favoritas; la estrella está desactivada | navegador (ficha temporal en revisión, como en T-005, borrada al acabar) |
| C15 | Sin colores literales nuevos (mismo criterio que T-005: líneas añadidas que no solo se mueven) | diff (`--color-moved=plain` contra la base) |
| C16 | `docs/tareas.md`: T-006 marcado como hecho en "Pestaña Acciones: pestañas y favoritas"; y la lista de versiones de `sheet.ts` tiene la 21 con `favoritas` | diff |
| C17 | Con la red cortada (offline en DevTools), al pulsar una estrella cambia al momento y, cuando falla el guardado, vuelve a como estaba; al recargar con red, la lista guardada no ha cambiado | navegador |
| C18 | El action nuevo de `actions.ts` valida la entrada con un esquema Zod (id de texto, 1-120 caracteres) y llama a `loadEditable` antes de escribir; si `loadEditable` devuelve error, devuelve ese error y no escribe | diff |

## Inspección

```
C1  ok
C2  ok
C3  ok (SCHEMA_VERSION está en 20 en la base, sheet.ts:75; revisar.mjs compara base y cabeza con su paso en migraciones.ts)
C4  ok (valores fijados en el contrato; ojo: la función de migración es `migrar`, migraciones.ts:302, no `migrarFicha`; el "o equivalente" lo cubre)
C5  ok
C6  ok
C7  ok
C8  ok
C9  ok
C10 problema: la fórmula no cuadra con la spec. La spec pone estrella en las FilaTirada bloqueadas, pero la fila
    bloqueada pinta su etiqueta con `font-display text-sm` (AccionesTab.tsx:183), no `text-base`, así que según la
    definición de "fila de acción" del contrato no cuenta. Con un personaje que tenga alguna tirada bloqueada, un
    constructor que cumpla la spec da más estrellas que "filas de acción − informativas" y suspende C10; uno que se
    salte las bloqueadas, aprueba. Además no dice cómo reconoce el script un "botón estrella".
    → propuesta: estrellas = filas de acción − FilaInfo + filas bloqueadas (o ampliar la definición de fila a la
    etiqueta de la bloqueada), reconocer la estrella por `aria-label` "Añadir a favoritas"/"Quitar de favoritas"
    (así se comprueba también el texto de la spec), y pedir que el personaje de prueba tenga al menos una bloqueada
    o dejar dicho que si no tiene esa parte no aplica.
C11 ok
C12 ok (el panel de combate necesita un combate con NPC en la BD local; crearlo es local y no toca datos reales)
C13 ok
C14 ok (mismo procedimiento que T-005 C14, trabajoso pero factible; la Favoritas tiene que caer dentro del PanelFieldset o desactivar la estrella aparte, decisión del constructor)
C15 ok
C16 ok
C17 ok
Contrato: problema: el punto "Guardar" pide que el action valide con Zod y pase por `loadEditable` (permisos y solo
  lectura en el servidor), y ningún criterio lo comprueba: C14 solo mira la estrella desactivada en el cliente, así
  que un action sin `loadEditable` aprueba todo. Es justo la regla de "nunca confiar en el cliente" del proyecto.
  → propuesta: criterio nuevo por diff: "el action nuevo de actions.ts valida la entrada con un esquema Zod (id string
  1-120) y llama a `loadEditable` antes de escribir; si devuelve error, no escribe". Menor, en el mismo arreglo: la
  spec pide en Favoritas "el mismo orden que en las otras pestañas, sin subtítulos vacíos" y C7 solo pide "cada una
  bajo su subtítulo" → añadir a C7 que los h2 de Favoritas son solo los de las filas marcadas y van en el orden de
  T-005 (Ataques, Psiónica, Herramientas, Fármacos, grupos, Dotes, Aumentos).
  Lo demás ok: "Puede tocar" alcanza (la carpeta `_components/acciones/` todavía no existe, se crea si hace falta),
  "fuera de alcance" no choca con ningún criterio, unos 7 archivos de una sola área y sin schema.prisma.

Veredicto: vuelve al jefe
```

### Pasada 2

```
C1  ok
C2  ok
C3  ok
C4  ok (la función es `migrar`, migraciones.ts; el "o equivalente" lo cubre)
C5  ok
C6  ok
C7  ok (arreglado: h2 solo de secciones con fila marcada y en el orden de las otras pestañas)
C8  ok
C9  ok
C10 ok (arreglado: la definición de fila de acción incluye la etiqueta `span.font-display.text-sm` de la bloqueada,
    AccionesTab.tsx:183, que es el único span con esas clases bajo la barra; las pestañas son `button` y los subtítulos
    `h2`, no se cuelan. La estrella se reconoce por `aria-label` y está dicho qué pasa si no hay bloqueadas)
C11 ok
C12 ok
C13 ok
C14 ok
C15 ok
C16 ok
C17 ok
C18 ok (nuevo: cubre Zod + `loadEditable`, que devuelve `{ error }` en permisos y revisión, actions.ts:148-160)
Contrato: ok. Cada punto del alcance tiene criterio (Guardar → C18 + C8/C17), "Puede tocar" alcanza, "fuera de
  alcance" no choca, ~7 archivos de un área y sin schema.prisma.

Veredicto: pasa
```

## Construcción

```
src/lib/rules/sheet.ts → `favoritas` en sheetSchema (string 1-120, máx. 100) y en defaultSheet ([]);
  `normalizarFavoritas` (descarta no-texto, vacíos, >120 caracteres y repetidos; corta a 100) que usa parseSheet;
  `marcarFavorita(sheet, id, marcada)` pura (añade al final sin repetir, respeta el tope). SCHEMA_VERSION 20→21 y
  línea 21 en la lista de versiones.                                              (C3, C4, C16)
src/lib/rules/migraciones.ts → paso 20→21 que pone `favoritas: []`.                (C3, C4)
src/lib/rules/sheet.test.ts → tests de parseSheet con los valores de C4 y de marcarFavorita.    (C1, C4)
src/lib/rules/migraciones.test.ts → describe v20→v21 (migrar y parseSheet de una v20).          (C1, C4)
src/app/characters/[id]/actions.ts → `marcarFavoritaAction(characterId, { id, marcada })`: Zod
  (id string 1-120, marcada boolean) antes de nada, luego `loadEditable` y si devuelve error lo devuelve sin
  escribir; persist con marcarFavorita. Con la lista llena devuelve error. Fija el valor en vez de alternar, para
  que un reintento no lo invierta. Única línea extra: `marcarFavorita` en el import de "@/lib/rules".   (C18)
src/app/characters/[id]/CharacterSheet.tsx → `commitMarcarFavorita`: setSheet optimista y runSave; el fn convierte
  el rechazo de red en `{ ok: false }` para que llegue al onError de runSave, que deshace solo ese id. En éxito no
  pisa la ficha (dos estrellas seguidas no parpadean). Se pasa como `onMarcarFavorita` a AccionesTab; las
  favoritas las lee AccionesTab de `ficha.ficha.favoritas` (es el mismo `sheet`).   (C8, C14, C17)
src/app/characters/[id]/_components/AccionesTab.tsx → pestaña "favoritas" (Básicas · Tiradas · Favoritas, abre en
  Básicas), solo si llega `onMarcarFavorita`. Las secciones se filtran con dos predicados (`verTirada`,
  `verDirecta`): Básicas = sin dado, Tiradas = con dado, Favoritas = id marcado de cualquiera de las dos; mismo JSX,
  orden y subtítulos para las tres, y los grupos fijos se precalculan (`gruposPestana`) para saber si hay filas.
  `BotonEstrella` (aria-pressed, aria-label "Añadir a/Quitar de favoritas", min-h-10/min-w-10 = 40 px, tokens
  text-accent/text-muted) en FilaTirada (también la bloqueada), FilaUsar, FilaPoder, Bloquear daño y
  Reparar/Fabricar (claves fijas `fija:bloquear_danio`, `fija:reparar_fabricar`); FilaInfo sin estrella y solo en
  Básicas. Sin filas en Favoritas: "Marca con la estrella las acciones que más uses". Un id sin acción no casa con
  ninguna fila y no se pinta. La estrella va dentro del PanelFieldset: en revisión se apaga y la pestaña se ve.
                                                             (C5, C6, C7, C9, C10, C11, C12, C13, C14, C15)
docs/tareas.md → línea de T-006 marcada [x] con lo hecho.                         (C16)
No hecho: verificación en navegador (no es de esta estación: C5-C14 y C17 quedan para la revisión). La
  cabecera de la sección de tareas.md ("⬜ ... fase 1 hecha") no se toca: "Puede tocar" abre solo la línea de T-006.
Tests existentes cambiados: migraciones.test.ts, "una ficha v19 leída con parseSheet sale sin arma incorporada":
  `s.schemaVersion` esperado 20 → 21, porque parseSheet lleva siempre la ficha a SCHEMA_VERSION, que ahora es 21;
  lo que comprueba ese test (sin armaIncorporada) no cambia.
```

Comprobado: `npm test` (1699 en verde), `npx tsc --noEmit`, `npm run lint` y `npm run fabrica:revisar -- --base
fabrica/T-005-acciones-en-pestanas --solo-diff` (ficha: 20→21 con su paso). Commit en la rama, worktree limpio.

## Revisión

```
C3  pasa
    evidencia: fabrica:revisar --base fabrica/T-005-acciones-en-pestanas --solo-diff → ficha pasa, SCHEMA_VERSION 20→21 con paso
C4  pasa
    evidencia: script propio (parseSheet/migrar del worktree): v20 sin favoritas → [] (v21); ["a","a",7,"b"] → ["a","b"];
              150 ids → 100; id de 200 caracteres descartado (["y"×200,"z"] → ["z"])
C5  pasa
    evidencia: navegador, QA-TIRADAS-FIJAS > Acciones: Básicas* · Tiradas · Favoritas, abre en Básicas
C6  pasa
    evidencia: sin favoritas: 0 filas, 0 h2 y el texto "Marca con la estrella las acciones que más uses"
C7  pasa
    evidencia: QA-TIRADAS-FIJAS (Hackeo, Fusil Láser, Bloquear daño) → h2 Ataques, Defensa, Acciones; qa-motor-test marcando
              en orden inverso → h2 Ataques, Psiónica, Defensa, Iniciativa; estrellas aria-pressed=true
C8  pasa
    evidencia: pestaña de navegador nueva y recarga: siguen las marcadas; BD stats.favoritas = ['ataque_fuego_8357…',
              'fija:bloquear_danio'] (v21)
C9  pasa
    evidencia: Tirar de Hackeo en Favoritas abre el mismo modal que en Tiradas (innerText igual; elementFromPoint en
              Cerrar cae en el modal); desmarcar lo quita y tras recargar sigue fuera
C10 pasa
    evidencia: estrellas = filas en las 3 fichas (1/1, 15/15, 6/6, 29/29), ninguna doble. Sin tiradas bloqueadas ni FilaInfo
              en la BD local: esa parte no aplica en navegador (en el diff: bloqueada con estrella AccionesTab.tsx:216,
              FilaInfo :442 sin ella)
C11 pasa
    evidencia: altura 40 px en todas las estrellas (min-h-10, AccionesTab.tsx:101)
C12 pasa
    evidencia: editor NPC Tatiana Sokolova y panel ACCIONES de un NPC en /master/combate: solo Básicas · Tiradas, 0 estrellas
C13 pasa
    evidencia: id falso en stats.favoritas de qa-tiradas-fijas: no se pinta, sin errores en consola; stats restaurado
C14 pasa
    evidencia: jugador temporal con copia de qa-motor-test en IN_REVIEW: Favoritas visible con sus 4, 4/4 estrellas
              desactivadas, 29/29 en Tiradas; ficha y usuario borrados al acabar
C15 pasa
    evidencia: --color-moved=plain: 0 literales; solo text-accent/text-muted/text-danger (tokens, globals.css:35-39)
C16 pasa
    evidencia: tareas.md "[x] **T-006** — Favoritas" en su sección; sheet.ts:75 "21 → … favoritas"
C17 pasa
    evidencia: offline: la estrella cambia al momento y vuelve al fallar (marcar y desmarcar); BD y recarga sin cambios
C18 pasa
    evidencia: actions.ts:619 z.string().min(1).max(120); :621-631 safeParse → loadEditable → devuelve ctx.error sin persist
```

Hallazgos (no votan):
- La migración 20→21 pone `favoritas: []` sin mirar lo que trae la ficha (es lo que dice la spec; una v20 no debería tenerlas).
- La cabecera de la sección de tareas.md sigue en "⬜ … fase 1 hecha" (fuera de "Puede tocar").
- Al deshacer un desmarcado fallido, el id vuelve al final de la lista; no cambia lo que se pinta.
- Las fichas de prueba (qa-tiradas-fijas, qa-motor-test) se restauraron desde copia; el NPC añadido al combate local, borrado.

## Juicio
### Intento 1 · contigo
**Motivo:** todos los criterios pasan con evidencia

| # | veredicto | vota | evidencia |
|---|---|---|---|
| C1 | pasa | script | npm test; npx tsc --noEmit |
| C2 | pasa | alcance | 8 archivos cambiados, todos dentro de "Puede tocar" |
| C3 | pasa | revisor | npm run fabrica:revisar -- --base fabrica/T-005-acciones-en-pestanas --solo-diff (en el worktree): 'ficha pasa SCHEMA_VERSION 20→21, con paso en… |
| C4 | pasa | revisor | script propio con parseSheet/migrar del worktree: parseSheet({schemaVersion:20}).favoritas = [] (schemaVersion 21), migrar v20→21 da []… |
| C5 | pasa | revisor | navegador, master/master, ficha QA-TIRADAS-FIJAS > Acciones: barra ['Básicas*','Tiradas','Favoritas'] (activa = border-accent en Básicas al abrir); igual al… |
| C6 | pasa | revisor | navegador, QA-TIRADAS-FIJAS sin favoritas: pestaña Favoritas con 0 filas, 0 h2, 0 estrellas y el texto 'Marca con la estrella las acciones que más uses'… |
| C7 | pasa | revisor | navegador: QA-TIRADAS-FIJAS marcando Hackeo y Disparar con Fusil Láser (Tiradas) y Bloquear daño (Básicas) → Favoritas h2 ['Ataques','Defensa','Acciones']… |
| C8 | pasa | revisor | navegador: tras marcar, pestaña de navegador nueva (new_page) y recarga → Favoritas sigue con las marcadas; con dos (Disparar con Fusil Láser, Bloquear daño)… |
| C9 | pasa | revisor | navegador: 'Tirar' de Hackeo en Favoritas abre el modal (div.fixed.inset-0) con el mismo innerText que desde Tiradas (igual=true; Perspicacia +1, Tecnociencia… |
| C10 | pasa | revisor | navegador por script (estrellas por aria-label, filas = span.font-display.text-base/.text-sm bajo la barra): QA-TIRADAS-FIJAS Básicas 1/1, Tiradas 15/15… |
| C11 | pasa | revisor | navegador: getBoundingClientRect().height de todos los botones estrella = 40 en las tres fichas y pestañas probadas (clase min-h-10, AccionesTab.tsx:101) |
| C12 | pasa | revisor | navegador: /master/npcs/cmuhfcyoz000467yuaesf1nz6 (Tatiana Sokolova) > Acciones: barra ['Básicas','Tiradas'], 0 estrellas en ambas (1 y 15 filas).… |
| C13 | pasa | revisor | BD local: añadido 'ataque_fuego_no-existe-vendida' a stats.favoritas de qa-tiradas-fijas; recarga → Favoritas pinta solo Disparar con Fusil Láser y Bloquear… |
| C14 | pasa | revisor | navegador: jugador temporal qa-revisor-t006 (registrado en /login) con copia de qa-motor-test en IN_REVIEW ('EN REVISIÓN' en la página), vista de jugador… |
| C15 | pasa | revisor | git diff --color-moved=plain contra la base: 0 coincidencias de #hex/rgb()/[#…] o paleta Tailwind en líneas añadidas; clases de color nuevas solo text-accent… |
| C16 | pasa | revisor | docs/tareas.md: '- [x] **T-006** — Favoritas (2026-10-23)…' dentro de '### Pestaña Acciones: pestañas y favoritas'; src/lib/rules/sheet.ts:75 '//   21 → se… |
| C17 | pasa | revisor | navegador con emulate networkConditions Offline: estrella de Hackeo pasa a aria-pressed=true al siguiente frame y vuelve a false al fallar; desmarcar Bloquear… |
| C18 | pasa | revisor | src/app/characters/[id]/actions.ts:619 favoritaSchema = z.object({ id: z.string().min(1).max(120), marcada: z.boolean() }); :621-631 safeParse primero, luego… |
| script | pasa | script | lint: pasa; ficha: pasa; prod: pasa |

**Para el usuario:** Todo pasa. La rama fabrica/T-006-acciones-favoritas está lista para que la mires; el push es tuyo.

## Decisión
aprobado: el usuario pidió que lo probara el Jefe en el navegador (marcar en las dos pestañas, recarga, BD, Tirar desde
Favoritas, desmarcar, sin red, móvil y NPC: todo bien) y lo dio por bueno. El Jefe arregló aparte la cabecera de la
sección en `tareas.md` (6ac0750, en la rama). Sin mergear: la rama lleva T-005 y T-006; merge y push, del usuario.

## Métricas y retro
| vueltas | minutos | tokens | operario (fallos/llamadas) | ¿retocado antes del push? |
|---|---|---|---|---|
| 0/2 | 25 (+2 de la inspección devuelta) | ~440k (13 agentes en total) | 0/6 (+0/3 de la inspección devuelta) | sí: cabecera de `tareas.md` (fuera de "Puede tocar") |

**Preguntas de reglas:** 0.
**Fue bien:** a la primera tras la inspección; `base` sobre una rama sin mergear funcionó para no tocar main.
**Cambiaríamos:** la inspección devolvió otra vez por un criterio de navegador que no casaba con el DOM real (las
bloqueadas usan `text-sm`) y por un punto del alcance sin criterio (Zod + `loadEditable`): F-015 sigue abierto. Y
"Puede tocar" debió incluir la cabecera de la sección de `tareas.md`.
**Rama que se conserva:** `fabrica/T-006-acciones-favoritas` (lleva T-005), hasta que el usuario la mergee.
