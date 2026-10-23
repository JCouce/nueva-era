---
id: T-008
titulo: El parser de "Puede tocar" lee también las líneas de continuación de un punto
origen: manual
estado: hecho
vueltas: 0/2
rama: fabrica/T-008-parser-puede-tocar
creado: 2026-10-23
inicio: 2026-10-23T14:43:54.842Z
operario: 0/6
fin: 2026-10-23T14:52:16.336Z
---

## Encargo
Arreglar el fallo F-016: `puedeTocar` (`fabrica/guion/contrato.mjs`) se corta en la primera línea sangrada que sigue a
un punto de "Puede tocar" y se come las rutas de las líneas de continuación. En T-007 eso dio un C2 falso y costó una
vuelta entera. Que no vuelva a pasar. (usuario, 2026-10-23: "abre el trabajo para arreglar el parser")

## Decisiones de reglas
| # | Duda | Decisión | Quién | Fundamento |
|---|---|---|---|---|
| — | Ninguna: es la fábrica, no el juego | — | — | — |

## Spec
**Alcance:**
- `puedeTocar` toma como parte del mismo punto cada línea sangrada (empieza por espacio o tabulador) que va justo
  después de un punto de la lista, y saca también las rutas entre backticks de esas líneas.
- Solo cuenta como ruta un texto entre backticks sin espacios que tenga `/`, `.` o `*` (así `GrupoAccion` o
  `soloLectura`, que son nombres de código, dejan de salir como rutas).
- Lo demás no cambia: la lista empieza tras `**Puede tocar:**`, las líneas en blanco se saltan, y se corta en la
  primera línea sin sangrar que no es un punto o en la siguiente etiqueta en negrita.
- Tests nuevos en `fabrica/guion/contrato.test.mjs` para las líneas de continuación y para los nombres sin `/`, `.`
  ni `*`. Los dos tests de `puedeTocar` que ya hay siguen dando lo mismo.
- `fabrica/contrato/plantilla.md`: en la misma línea que `**Puede tocar:**`, detrás, un comentario HTML que diga "una ruta o glob entre backticks por
  punto; se admiten líneas de continuación sangradas".
- `docs/tareas.md`, épica "La fábrica", "Ideas del rodaje": la línea de T-008, hecha.

**Fuera de alcance:**
- Que la línea enseñe las rutas leídas antes de construir.
- Cualquier otro cambio en `alcance.mjs`, `linea.js` o el resto del guion.
- `fabrica/historial.md`: F-016 lo marca el Jefe como arreglado al cerrar.

**Puede tocar:**
- `fabrica/guion/contrato.mjs`
- `fabrica/guion/contrato.test.mjs`
- `fabrica/contrato/plantilla.md`
- `docs/tareas.md`

## Criterios
| # | Qué se tiene que cumplir | Oráculo |
|---|---|---|
| C1 | `npm test`, `npx tsc --noEmit` y `npm run fabrica:test` en verde | comando |
| C2 | Ningún cambio fuera de "Puede tocar" | `git diff --stat` |
| C3 | Con la Spec del **ejemplo A** (abajo), `puedeTocar` devuelve `["a/b.ts", "a/c.ts", "a/d.ts", "a/e/*", "docs/x.md"]` | comando: comprobación propia del revisor, valor fijado aquí |
| C4 | El ejemplo A con un tabulador en vez de dos espacios al principio de la línea de `a/e/*`: el mismo resultado que C3 | comando: ídem |
| C5 | Con la Spec del **ejemplo B** (el "Puede tocar" de T-007 tal como escaló), `puedeTocar` devuelve estas 11, en este orden: `src/lib/rules/acciones.ts`, `src/lib/rules/modificadores.ts`, `src/lib/rules/montaje.ts`, `src/lib/rules/fichaResuelta.ts`, `src/lib/rules/index.ts`, `src/lib/rules/*.test.ts`, `src/components/AccionModal.tsx`, `src/app/characters/[id]/_components/AccionesTab.tsx`, `src/app/characters/[id]/_components/acciones/*`, `docs/sistema.md`, `docs/tareas.md` (sin `GrupoAccion`) | comando: ídem |
| C6 | Sin regresión: para cada contrato de `fabrica/trabajos/T-00*.md` de main, la lista nueva es la vieja (la de `contrato.mjs` en main) menos los textos sin `/`, `.` ni `*`, más lo que viniera de líneas de continuación | comando: comprobación propia del revisor que compara las dos versiones de la función |
| C7 | Hay tests nuevos en `contrato.test.mjs` para líneas de continuación y para nombres sin `/`, `.` ni `*`, y los dos tests de `puedeTocar` que ya había no cambian sus valores esperados | diff |
| C8 | `fabrica/contrato/plantilla.md` lleva en la misma línea que `**Puede tocar:**`, detrás, el comentario "una ruta o glob entre backticks por punto; se admiten líneas de continuación sangradas", y `puedeTocar` sobre la plantilla sigue devolviendo `["docs/tareas.md"]` | diff + comando (comprobación propia del revisor, valor fijado aquí) |
| C9 | `docs/tareas.md`: la línea de T-008, hecha, en "Ideas del rodaje" de la épica "La fábrica" | diff |

Los ejemplos son el cuerpo de la sección Spec: el revisor los mete entre `## Spec` y `## Criterios` en un contrato de prueba (aquí no van esos encabezados para no confundir a la propia línea).

**Ejemplo A** (cada línea tal cual; la de `a/e/*` empieza por dos espacios):
```
**Puede tocar:**
- `a/b.ts`, `a/c.ts` (solo `Tipo`), `a/d.ts`,
  `a/e/*`
- `docs/x.md` (nota, ver `npm test`)
Texto suelto
- `z.ts`
```

**Ejemplo B** (el de T-007; las líneas de continuación empiezan por dos espacios):
```
**Puede tocar:**
- `src/lib/rules/acciones.ts`, `src/lib/rules/modificadores.ts` (solo `GrupoAccion`), `src/lib/rules/montaje.ts`,
  `src/lib/rules/fichaResuelta.ts`, `src/lib/rules/index.ts`
- `src/lib/rules/*.test.ts` (el test nuevo de la tirada libre; ningún test existente cambia sus valores esperados)
- `src/components/AccionModal.tsx`
- `src/app/characters/[id]/_components/AccionesTab.tsx`, `src/app/characters/[id]/_components/acciones/*`
- `docs/sistema.md` (el supuesto nuevo)
- `docs/tareas.md` (la entrada nueva)
```

## Inspección
```
C1  ok
C2  ok
C3  ok
C4  ok
C5  ok
C6  ok (en main ningún T-00* tiene líneas sangradas tras "Puede tocar": T-007 se reescribió a un punto por línea, así
    que C6 se reduce a "la vieja menos GrupoAccion, soloLectura, ResourceRow, AccionesTab..."; el oráculo es independiente)
C7  ok
C8  problema: no fija dónde va el comentario y nada comprueba que la plantilla se siga leyendo bien. Si el constructor
    lo pone en su propia línea justo debajo de `**Puede tocar:**` (lo natural con "junto a"), esa línea no está
    sangrada ni es un punto, el parser corta ahí y `puedeTocar(plantilla)` pasa de `["docs/tareas.md"]` a `[]`; todo
    contrato que salga de la plantilla tendría el C2 roto, que es justo el fallo que este trabajo arregla. C8 pasaría
    igual.
    → propuesta: fijar el sitio (en la misma línea, `**Puede tocar:** <!-- ... -->`, o en la línea de antes) y/o añadir
    un criterio: `puedeTocar` sobre `fabrica/contrato/plantilla.md` devuelve `["docs/tareas.md"]` (comando, valor fijado aquí).
C9  ok (hoy "Ideas del rodaje" está "(vacío)": la línea de T-008 se añade ya como hecha; el diff lo enseña)
Contrato: ok (alcance cubierto; "Puede tocar" son 4 archivos y basta; "Fuera de alcance" no choca con ningún criterio;
          sin schema)

Veredicto: vuelve al jefe
```

### Pasada 2
```
C1  ok (`fabrica:test` existe en package.json: node --test 'fabrica/**/*.test.mjs')
C2  ok
C3  ok (a mano con las reglas de la Spec: Tipo fuera por no tener / . *, `npm test` fuera por espacio, corta en
    "Texto suelto"; sale la lista fijada)
C4  ok
C5  ok (las 11, en ese orden; GrupoAccion fuera; `[id]` no lleva espacios)
C6  ok (verificado otra vez: ningún T-000..T-007 de main tiene líneas sangradas tras "Puede tocar", así que el caso
    "bullets después de una continuación", que la fórmula no describe, no se da)
C7  ok
C8  ok (arreglado: sitio fijado en la misma línea, y el valor `["docs/tareas.md"]` fijado. El regex de la etiqueta,
    /^\*\*Puede tocar:?\*\*/, no está anclado al final, así que el comentario detrás no rompe la detección; el
    comentario no lleva backticks, no aporta rutas)
C9  ok
Contrato: ok (alcance cubierto; 4 archivos en "Puede tocar", bastan; "Fuera de alcance" no choca; sin schema. Los
          ejemplos con "**Puede tocar:**" están bajo ## Criterios, fuera de la Spec, y no contaminan el C2 de este
          propio contrato)

Veredicto: pasa
```

## Construcción
```
fabrica/guion/contrato.mjs → puedeTocar: una línea sangrada (espacio o tab) que va justo tras un punto (o tras otra
    continuación) cuenta como parte del punto y se le sacan las rutas; solo es ruta un texto entre backticks sin
    espacios con `/`, `.` o `*`. Lo demás igual: empieza tras la etiqueta, salta blancos, corta en línea sin sangrar
    que no es punto o en `**…`.                                                         (C3, C4, C5, C6)
fabrica/guion/contrato.test.mjs → 4 tests nuevos: ejemplo A con dos espacios y con tab, línea sin sangrar tras un
    punto corta, nombres sin / . * fuera, y puedeTocar(plantilla) = ["docs/tareas.md"]. Los dos de antes intactos. (C7, C8)
fabrica/contrato/plantilla.md → comentario HTML detrás de `**Puede tocar:**` en la misma línea.             (C8)
docs/tareas.md → "Ideas del rodaje" de La fábrica: línea de T-008 hecha (sustituye el "(vacío)").            (C9)
Comprobado a mano: ejemplo B da las 11 en orden; contra main, en T-000..T-007 solo caen ResourceRow, soloLectura,
    AccionesTab y GrupoAccion, nada añadido. npm test (1726), fabrica:test (112), tsc y lint en verde. Commit 6dc2a1c.
No hecho: nada
Tests existentes cambiados: ninguno
```

## Revisión
```
C3  pasa
    evidencia: script propio con el ejemplo A metido en ## Spec → ["a/b.ts","a/c.ts","a/d.ts","a/e/*","docs/x.md"]
C4  pasa
    evidencia: mismo script con tabulador delante de `a/e/*` → misma lista que C3
C5  pasa
    evidencia: mismo script con el ejemplo B → las 11 en el orden fijado, sin GrupoAccion (deepEqual true)
C6  pasa
    evidencia: puedeTocar de main vs rama sobre T-000..T-007 de main: solo caen ResourceRow (T-002), soloLectura
    (T-005), AccionesTab (T-006), GrupoAccion (T-007); nada añadido, el resto idéntico
C7  pasa
    evidencia: diff de contrato.test.mjs solo añade 4 tests (continuación espacios/tab, línea sin sangrar corta,
    nombres sin / . *, plantilla); los dos de puedeTocar previos intactos
C8  pasa
    evidencia: plantilla.md:33 lleva el comentario detrás de `**Puede tocar:**` en la misma línea;
    puedeTocar(plantilla) = ["docs/tareas.md"]
C9  pasa
    evidencia: docs/tareas.md:928, "Ideas del rodaje" de La fábrica con `- [x] **T-008** — Parser de "Puede tocar"…`
```
Hallazgos (no votan):
- Una línea sangrada tras otra continuación también cuenta (enPunto no se resetea); coherente con la Spec, ningún
  contrato de main lo ejercita.

## Juicio
### Intento 1 · contigo
**Motivo:** todos los criterios pasan con evidencia

| # | veredicto | vota | evidencia |
|---|---|---|---|
| C1 | pasa | script | npm test; npx tsc --noEmit |
| C2 | pasa | alcance | 4 archivos cambiados, todos dentro de "Puede tocar" |
| C3 | pasa | revisor | script propio (scratchpad/check.mjs) con el ejemplo A entre ## Spec y ## Criterios: puedeTocar = ["a/b.ts","a/c.ts","a/d.ts","a/e/*","docs/x.md"], igual al… |
| C4 | pasa | revisor | mismo script con tabulador delante de `a/e/*`: ["a/b.ts","a/c.ts","a/d.ts","a/e/*","docs/x.md"], igual que C3 |
| C5 | pasa | revisor | mismo script con el ejemplo B: 11 rutas, deepEqual true con la lista fijada en su orden; GrupoAccion no sale |
| C6 | pasa | revisor | puedeTocar de main (git show main:fabrica/guion/contrato.mjs) vs rama sobre T-000..T-007 de main: nueva = vieja menos ResourceRow (T-002), soloLectura… |
| C7 | pasa | revisor | diff de fabrica/guion/contrato.test.mjs: solo añade 4 tests (continuación con espacios y tab, línea sin sangrar corta, nombres sin / . * fuera, plantilla)… |
| C8 | pasa | revisor | fabrica/contrato/plantilla.md:33 `**Puede tocar:** <!-- una ruta o glob entre backticks por punto; se admiten líneas de continuación sangradas -->`… |
| C9 | pasa | revisor | diff docs/tareas.md:928: "**Ideas del rodaje:**" con `- [x] **T-008** — Parser de "Puede tocar"...` en la épica La fábrica |
| script | pasa | script | lint: no aplica; ficha: no aplica; prod: pasa |

**Para el usuario:** Todo pasa. La rama fabrica/T-008-parser-puede-tocar está lista para que la mires; el push es tuyo.

## Decisión
aprobado: todos los criterios pasan a la primera tras la inspección; el usuario lo da por bueno y pide mergear.

## Métricas y retro
| vueltas | minutos | tokens | operario (fallos/llamadas) | ¿retocado antes del push? |
|---|---|---|---|---|
| 0/2 | 5,5 (+2 de la inspección devuelta) | ~295k (13 agentes en total) | 0/6 (+0/3 de la inspección devuelta) | no |

**Preguntas de reglas:** 0.
**Fue bien:** arregla F-016; el inspector cazó que un comentario mal puesto en la plantilla habría vaciado "Puede
tocar" en todos los contratos nuevos.
**Cambiaríamos:** otra devolución de la inspección por un criterio sin fijar (sitio del comentario): F-015 sigue
abierto.
