---
id: T-000
titulo: El selector de modo de los golpes melee se llama "Modo de ataque"
origen: manual
estado: hecho
vueltas: 0/2
rama: fabrica/T-000-modo-de-ataque
creado: 2026-10-16
---

<!--
EJEMPLO. Sirve para validar la plantilla (tanda 1). Reproduce el commit 284358f como si hubiera pasado por la fábrica.
Encargo, Spec, Criterios e Inspección se han escrito de verdad con los prompts de fabrica/. Lo de después se ha
rellenado a partir del commit real: no hubo ejecución.
-->

## Encargo
Al atacar con un arma melee que tiene varios modos, el selector se titula "Modo de disparo", porque reutiliza la
casilla de las armas de fuego. En melee tiene que llamarse "Modo de ataque", y en las armas de fuego seguir como está.

## Spec
**Alcance:**
- El selector de modo de las tiradas de ataque melee se titula "Modo de ataque", y su línea del desglose también.

**Fuera de alcance:**
- Armas de fuego: siguen con "Modo de disparo".
- Cualquier cambio en qué modos hay o en sus dificultades.

**Puede tocar:**
- `src/lib/rules/combate.ts`
- `src/lib/rules/*.test.ts`
- `docs/tareas.md` (su línea)

## Criterios
| # | Qué se tiene que cumplir | Oráculo |
|---|---|---|
| C1 | `npm test` y `npx tsc --noEmit` en verde | comando |
| C2 | Ningún cambio fuera de "Puede tocar" | `git diff --stat` |
| C3 | En la tirada de un arma melee con más de un modo, la condición `modo` tiene la etiqueta **"Modo de ataque"** y el desglose dice **"Modo de ataque: Simple"** con el modo por defecto | comando: test de caracterización, con estos dos valores fijados aquí |
| C4 | En la tirada de un arma de fuego con más de un modo, la etiqueta sigue siendo **"Modo de disparo"** | comando: test de caracterización |

## Inspección
```
Primera pasada (criterios en su versión anterior):
C3  problema: decía "montaje-caracterizacion.test.ts en verde". Ese test lo modifica el constructor (hay que
    cambiar sus valores esperados), así que comprobarlo no demuestra nada.
    → propuesta: fijar en el contrato la etiqueta y la línea del desglose que tienen que salir.
C4  problema: no existía. "Fuera de alcance" protege las armas de fuego, pero ningún criterio lo comprueba.
    → propuesta: un criterio que fije "Modo de disparo" en armas de fuego.
Veredicto: vuelve al jefe

Segunda pasada:
C1  ok
C2  ok
C3  ok: el valor esperado está fijado en el contrato; el constructor ya no lo elige.
C4  ok
Contrato: ok. Pequeño: un archivo de reglas y sus tests.
Veredicto: pasa
```

## Construcción
```
src/lib/rules/combate.ts → condicionModo recibe la etiqueta, por defecto "Modo de disparo";
    tiradaDeArmaMelee pasa "Modo de ataque"                                       (cubre C3, C4)
src/lib/rules/montaje-caracterizacion.test.ts → desglose esperado de 3 tiradas melee:
    "Modo de disparo: Simple" → "Modo de ataque: Simple"                          (cubre C3)
No hecho: nada
Tests existentes cambiados: montaje-caracterizacion.test.ts, porque el valor nuevo es el que fija C3
```

## Revisión
<!-- sin ejecución en este ejemplo -->

## Juicio
<!-- sin ejecución en este ejemplo -->

## Decisión
<!-- sin ejecución en este ejemplo -->

## Métricas y retro
| vueltas | minutos | tokens | ¿retocado antes del push? |
|---|---|---|---|
| — | — | — | — |

**Fue bien:** la inspección pilló dos agujeros reales: un oráculo que el constructor controla y un "fuera de alcance"
que nadie comprobaba.
**Cambiaríamos:** nada en el proceso. El commit real no tocó `docs/tareas.md`, pero en la fábrica todo trabajo lleva
su línea, por pequeño que sea: hay un solo proceso y no se hacen excepciones (usuario, 2026-10-16). Si algún día los
cambios mínimos merecen ir más ligeros, será con un proceso propio dentro de la fábrica, no saltándose este.
