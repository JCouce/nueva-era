---
id: T-003
titulo: La Mira Telescópica da su bono en Buscar / Percibir con un toggle
origen: manual
estado: contigo
vueltas: 0/2
rama: fabrica/T-003-mira-busqueda
base: c164eca
creado: 2026-10-19
inicio: 2026-10-19T13:27:34.186Z
operario: 0/6
fin: 2026-10-19T13:34:52.309Z
---

<!--
ESTRENO 3. Repite el trabajo del commit 4fb7799 (2026-09-28) desde el commit anterior. Primer estreno de catálogo y
motor (docs/motor.md). El contrato sale del encargo del usuario y de tres preguntas de reglas que el Jefe le hizo.
-->

## Encargo
"Veo que en la prosa aparece que la mira telescópica de las mejoras de armas da bonificador a buscar percibir, pero
ahora mismo no hay ninguna manera de aplicar ese mod en la ficha, debería estar disponible un toggle en el modal previo
a la tirada de buscar. Deja un toggle disponible para los personajes que tengan mira telescópica, creo que los rifles
de francotirador tienen la mira de level 1 integrada automáticamente." (usuario, 2026-10-19)

Decisiones de reglas del usuario (2026-10-19), preguntadas por el Jefe:
- **Sin distancia:** el bono de búsqueda es un toggle plano; Buscar / Percibir no gana selector de distancia.
- **Varias miras:** un solo toggle, con el bono de la mira de más nivel que lleve el personaje.
- **Nivel 2:** hereda el +1 del nivel 1. Bono de búsqueda: +1 con nivel 1 y 2, +2 con nivel 3.

## Spec
**Alcance:**
- Un toggle de búsqueda con mira en la tirada "Buscar / Percibir" (`alerta_activa`) para todo personaje que lleve una
  Mira Telescópica instalada en un arma, o un fusil de precisión (mira de nivel 1 integrada).
- Valor del toggle activo según las decisiones de arriba; inactivo, 0.
- `motor` de la Mira (`mejorasArma.ts`): las entradas de `alerta_activa` dejan de estar `bloqueado` y quedan como
  construidas, con el mecanismo que les toque según `docs/motor.md`.
- Las tres decisiones quedan escritas en `docs/sistema.md` (supuestos) y la deuda de
  `docs/equipo-efectos-especiales.md` sobre la Mira queda como resuelta.

**Fuera de alcance:**
- El bono al ataque por tramo (media/larga) de la Mira: ya funciona y no cambia.
- El toggle de visión nocturna/térmica del nivel 2: sigue como está.
- Cualquier otra mejora de arma o tirada.

**Puede tocar:**
- `src/lib/catalog/mejorasArma.ts`
- `src/lib/catalog/armasFuego.ts` (solo si hace falta para la mira integrada)
- `src/lib/rules/equipo.ts`, `src/lib/rules/combate.ts`
- `src/lib/rules/*.test.ts`
- `src/app/characters/[id]/_components/**` (solo si el toggle no aparece en el modal sin tocar la UI)
- `docs/sistema.md` (supuestos: las tres decisiones)
- `docs/equipo-efectos-especiales.md` (la entrada de la Mira)
- `docs/tareas.md` (su línea y las entradas que describan esta deuda)

## Criterios
| # | Qué se tiene que cumplir | Oráculo |
|---|---|---|
| C1 | `npm test` y `npx tsc --noEmit` en verde | comando |
| C2 | Ningún cambio fuera de "Puede tocar" | `git diff --stat` |
| C3 | Fusil de asalto con Mira **nivel 1** instalada: la tirada "Buscar / Percibir" ofrece un toggle de la mira; activo, el total sube **+1**; inactivo, **0** | comando: comprobación propia del revisor sobre las funciones de reglas de la base que calculan las condiciones y bonos de la tirada; valores fijados aquí |
| C4 | Igual con Mira **nivel 2**: **+1** (y el toggle de visión nocturna/térmica sigue apareciendo) | comando: ídem |
| C5 | Igual con Mira **nivel 3**: **+2** | comando: ídem |
| C6 | Un **fusil de precisión** sin mira añadida: toggle de la mira con **+1** | comando: ídem |
| C7 | Fusil de precisión (integrada, nivel 1) **y** fusil de asalto con Mira nivel 3: **un solo** toggle de mira, con **+2** | comando: ídem |
| C8 | Sin mira (fusil de asalto sin mira, o sin armas): **no** aparece toggle de mira en "Buscar / Percibir" | comando: ídem |
| C9 | El ataque de un fusil de asalto con Mira nivel 1 sigue igual: **+1** en media y larga, **0** en corta | comando: ídem |
| C10 | En `/characters/[id]` de un personaje con fusil de precisión, el modal de "Buscar / Percibir" muestra el toggle, y al activarlo el desglose añade la línea de la mira con +1 | navegador |
| C11 | En `mejorasArma.ts` no queda ninguna entrada `motor` de la Mira sobre `alerta_activa` con `estado: "bloqueado"` | diff (grep) |
| C13 | En `docs/equipo-efectos-especiales.md`, la entrada de la Mira ya no dice que el bono de búsqueda esté sin construir ni bloqueado | diff |
| C12 | `docs/sistema.md` recoge las tres decisiones de arriba como supuestos, con fecha y fuente (el usuario) | prosa fuente |

**Para el revisor:** en C10 usa un personaje de la BD local con `master` / `master`. Si tienes que equiparle algo,
quítaselo al terminar.

## Inspección

```
C1  ok
C2  ok
C3  problema: el oráculo es "comprobación sobre la API pública de montaje (`montarTirada`)", y en c164eca esa API no
    existe (no hay `src/lib/rules/montaje.ts` ni ningún `montarTirada`/`tirarMontada` en `src/`). Las condiciones de
    equipo llegan a "Buscar / Percibir" vía `indiceDeCondiciones` + `consultaIndiceCondiciones` (`equipo.ts`), que
    `AccionesTab.tsx` mezcla en la tirada, y el valor sale de `valorCondiciones` / `desgloseCondiciones`
    (`condiciones.ts`). El revisor no puede ejecutar el oráculo tal cual.
    → propuesta: cambiar el oráculo de C3–C8 a "comprobación propia del revisor: `consultaIndiceCondiciones(
    indiceDeCondiciones(sheet), {id: "alerta_activa", grupo: "Acciones", habilidad: "exploracion", modoElegido: null})`
    + `valorCondiciones` con el toggle activo/inactivo, valores fijados aquí".
C4  problema: mismo oráculo inexistente que C3 → propuesta: la de C3.
C5  problema: mismo oráculo inexistente que C3 → propuesta: la de C3.
C6  problema: mismo oráculo inexistente que C3 → propuesta: la de C3.
C7  problema: mismo oráculo inexistente que C3 → propuesta: la de C3.
C8  problema: mismo oráculo inexistente que C3 → propuesta: la de C3.
C9  problema: mismo oráculo inexistente (`montarTirada`). → propuesta: la fila de ataque de `accionesDeAtaque`
    (`combate.ts`) con `valorBonosTramo(fila.bonosTramo, estado)` en corta/media/larga, valores +0/+1/+1 fijados aquí.
C10 ok
C11 ok
C12 ok
Contrato: problema: el alcance pide que la deuda de la Mira en `docs/equipo-efectos-especiales.md` (entrada hacia la
  línea 723, "Mira Telescópica niveles 1/3, sigue sin construir") quede como resuelta, y ningún criterio lo cubre.
  → propuesta: añadir C13 "la entrada de la Mira en `docs/equipo-efectos-especiales.md` deja de figurar como pendiente
  y remite a las decisiones del 2026-10-19 | prosa fuente / diff". El resto (Puede tocar, Fuera de alcance, tamaño,
  sin schema) ok.

Veredicto: vuelve al jefe
```

### Pasada 2

```
C1  ok
C2  ok
C3  ok (el oráculo ya no nombra una API inexistente; valores +1/0 fijados en el contrato)
C4  ok (el toggle "Visión nocturna/térmica activa" de n2 existe en la base, mejorasArma.ts:80)
C5  ok
C6  ok (los fusiles de precisión llevan `miraIntegrada: 1` en armasFuego.ts)
C7  ok
C8  ok
C9  ok
C10 ok
C11 ok (las entradas bloqueadas están en mejorasArma.ts:62 y :105)
C13 ok (cubre la deuda de equipo-efectos-especiales.md:723)
C12 ok
Contrato: ok (todo el alcance cubierto; Puede tocar alcanza y no se pasa; fuera de alcance no choca con ningún
  criterio; pequeño y sin schema)

Veredicto: pasa
```

## Construcción

```
Commit 5502591 en fabrica/T-003-mira-busqueda (worktree limpio).

src/lib/catalog/mejorasArma.ts → BONO_BUSQUEDA_MIRA {1:1, 2:1, 3:2} y CONDICION_BUSQUEDA_MIRA_ID; las
    entradas motor de alerta_activa de n1 y n3 pasan de bono_tramo/bloqueado a numerico/eleccion_jugador/
    construido; n2 gana la suya (hereda el +1)                                   (C11, C3-C5)
src/lib/rules/equipo.ts → nivelMiraTelescopica(sheet) (máx. entre miras instaladas y miraIntegrada de
    fusiles) y condicionBusquedaMira(sheet): un único toggle con alcance tiradaId alerta_activa, valor
    según BONO_BUSQUEDA_MIRA; se añade al final de condicionesActivas() y de indiceDeCondiciones() (mismo
    orden en las dos). No va como CondicionTirada por nivel del catálogo porque la integrada no es una
    pieza instalada y dos miras darían dos toggles (C7). Llega al modal por el conCondicionesDeEquipo que
    ya existía en AccionesTab: no hizo falta tocar la UI                           (C3-C8, C10)
src/lib/rules/equipo.test.ts → suite "Mira Telescópica en Buscar / Percibir": n1 +1/0, n2 +1 con toggle
    de visión, n3 +2, fusil de precisión +1, precisión + asalto n3 = un toggle +2, sin mira no hay
    toggle, no llega a otras tiradas; cada caso comprueba también índice ≡ condicionesActivas (C3-C8)
src/lib/rules/combate.test.ts → test nuevo: con mira n1 el ataque no lleva el toggle de búsqueda y
    valorBonosTramo da 0/+1/+1 en corta/media/larga                              (C9)
docs/sistema.md → supuesto S23 con las tres decisiones, fecha y fuente (usuario, 2026-10-19)   (C12)
docs/equipo-efectos-especiales.md → la entrada de la Mira pasa a "resuelto 2026-10-19", remite a S23 (C13)
docs/tareas.md → entrada "Mira Telescópica en Buscar / Percibir, 2026-10-19 (T-003)" en Hecho y
    fecha de última actualización

npm test (652 ok), npx tsc --noEmit y npm run lint en verde                     (C1)
No hecho: la comprobación en navegador (C10) es del revisor; armasFuego.ts y _components no se tocan.
Tests existentes cambiados: equipo.test.ts, "S9: Mira Telescópica en nivel 3 conserva el toggle de
    visión de nivel 2". Antes esperaba exactamente 1 condición en alerta_activa; ahora espera
    ["mira_telescopica_n2_activo", "mira_telescopica_busqueda"], porque una mira n3 tiene que ofrecer
    también el toggle de búsqueda (C5). Lo que el test protegía (que n3 conserva el toggle de n2) sigue
    comprobándose.
```

## Revisión

```
C3  pasa
    evidencia: script propio sobre consultaIndiceCondiciones(indiceDeCondiciones) + valorCondiciones, ctx alerta_activa:
    asalto + mira n1 -> [mira_telescopica_busqueda], activo 1, inactivo 0 (índice ≡ condicionesActivas)
C4  pasa
    evidencia: mira n2 -> [mira_telescopica_n2_activo, mira_telescopica_busqueda], activo 1, inactivo 0
C5  pasa
    evidencia: mira n3 -> búsqueda activo 2, inactivo 0
C6  pasa
    evidencia: solo fusil_precision_telum -> un toggle de búsqueda, activo 1
C7  pasa
    evidencia: precisión + asalto con mira n3 -> un solo toggle de búsqueda, activo 2
C8  pasa
    evidencia: asalto sin mira -> []; ficha sin armas -> []
C9  pasa
    evidencia: accionesDeAtaque(asalto + mira n1), valorBonosTramo corta/media/larga = 0/1/1; el ataque no lleva el toggle
C10 pasa
    evidencia: next dev del worktree (:3013), master/master, PruebaEquipos (fusil de precisión). Modal Buscar / Percibir:
    toggle "Mira Telescópica 1 (buscando con la mira)"; desglose "(sin activar) +0", TOTAL +0 -> tras activar, línea
    +1 y TOTAL +1 (elementFromPoint ok). Chrome headless con puppeteer: el MCP chrome-devtools no arrancó (perfil
    ocupado). No se equipó ni guardó nada.
C11 pasa
    evidencia: mejorasArma.ts:67, :93, :95, :112 (alerta_activa de la Mira) todas construido; el bloqueado de :166 es
    de otra mejora
C13 pasa
    evidencia: equipo-efectos-especiales.md:723 pasa de "sigue sin construir ... bloqueado" a "resuelto 2026-10-19"
C12 pasa
    evidencia: docs/sistema.md S23 recoge las tres decisiones, fuente el usuario, 2026-10-19
```

Hallazgos (no votan):
- `nivelMiraTelescopica` cuenta cualquier `mira_telescopica` de `sheet.equipo`, esté instalada o no. Igual que lo que
  ya hacía `condicionesActivas` en la base, pero una mira suelta en el inventario también daría el toggle.
- El MCP chrome-devtools falló con "browser is already running" (sin `--isolated` en esta sesión).

## Juicio
### Intento 1 · contigo
**Motivo:** todos los criterios pasan con evidencia

| # | veredicto | vota | evidencia |
|---|---|---|---|
| C1 | pasa | script | npm test; npx tsc --noEmit |
| C2 | pasa | alcance | 7 archivos cambiados, todos dentro de "Puede tocar" |
| C3 | pasa | revisor | script propio (consultaIndiceCondiciones(indiceDeCondiciones) + valorCondiciones, ctx alerta_activa): fusil_asalto_impetus + mira n1 -> ids… |
| C4 | pasa | revisor | script propio: mira n2 -> ids [mira_telescopica_n2_activo, mira_telescopica_busqueda], activo 1, inactivo 0; el toggle de visión sigue |
| C5 | pasa | revisor | script propio: mira n3 -> toggle busqueda activo 2, inactivo 0 |
| C6 | pasa | revisor | script propio: solo fusil_precision_telum -> un toggle mira_telescopica_busqueda, activo 1, inactivo 0 |
| C7 | pasa | revisor | script propio: fusil_precision_telum + asalto con mira n3 -> un solo mira_telescopica_busqueda, activo 2 (etiqueta 'Mira Telescópica 3') |
| C8 | pasa | revisor | script propio: asalto sin mira -> ids []; defaultSheet sin armas -> ids [] |
| C9 | pasa | revisor | script propio: accionesDeAtaque(asalto+mira n1) 'Disparar con Impetus', valorBonosTramo corta/media/larga = [0,1,1]; condiciones del ataque [tramo, modo], sin… |
| C10 | pasa | revisor | Chrome headless (puppeteer; el MCP chrome-devtools no arrancaba por perfil ocupado) sobre next dev del worktree :3013, master/master… |
| C11 | pasa | revisor | grep alerta_activa en mejorasArma.ts: entradas de la Mira en :67, :93, :95, :112 todas estado construido; el único 'bloqueado' que queda (:166) es de otra… |
| C13 | pasa | revisor | diff docs/equipo-efectos-especiales.md:723: 'sigue sin construir ... Metadata dejada en bloqueado' sustituido por 'Mira Telescópica, bono a búsqueda —… |
| C12 | pasa | revisor | docs/sistema.md fila S23 nueva: (a) toggle plano sin distancia, (b) varias miras -> un toggle con la de más nivel, (c) +1 n1 y n2, +2 n3; fuente 'decisiones… |
| script | pasa | script | lint: pasa; ficha: no aplica; prod: pasa |

**Para el usuario:** Todo pasa. La rama fabrica/T-003-mira-busqueda está lista para que la mires; el push es tuyo.

## Decisión

## Métricas y retro
| vueltas | minutos | tokens | operario (fallos/llamadas) | ¿retocado antes del push? |
|---|---|---|---|---|
| | | | | |

**Tiempo del usuario:**
**Fue bien:**
**Cambiaríamos:**
