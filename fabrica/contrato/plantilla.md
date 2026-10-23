---
id: T-xxx
titulo: <frase corta con las palabras del usuario>
origen: manual            # manual | mainpatcher | linear | mesa
estado: spec              # spec | encolado | inspeccion | construyendo | revision | juicio | contigo | escalado | hecho | descartado
vueltas: 0/2
rama: fabrica/T-xxx-<slug>
# base: <sha>            # opcional; por defecto main. Para repetir un trabajo pasado: el commit anterior
creado: AAAA-MM-DD
---

<!--
Cada sección la escribe UNA estación. Nadie escribe en la sección de otro.
Encargo, Spec y Criterios se congelan con el ok del usuario (estado pasa a "encolado").
-->

## Encargo
<!-- jefe, con el usuario · qué se pide y por qué, en 2-4 frases -->

## Decisiones de reglas
<!-- jefe · dudas de reglas del trabajo y quién las resolvió · se congelan con el ok -->
| # | Duda | Decisión | Quién | Fundamento |
|---|---|---|---|---|

## Spec
<!-- jefe, con el usuario · se congela con su ok -->
**Alcance:**
-

**Fuera de alcance:**
-

**Puede tocar:** <!-- una ruta o glob entre backticks por punto; se admiten líneas de continuación sangradas -->
- `docs/tareas.md` (su línea, siempre; y las entradas que describan lo que el trabajo cambia)
-

## Criterios
<!-- jefe, con el usuario · congelados · cada uno: qué se observa + con qué se comprueba -->
| # | Qué se tiene que cumplir | Oráculo |
|---|---|---|
| C1 | `npm test` y `npx tsc --noEmit` en verde | comando |
| C2 | Ningún cambio fuera de "Puede tocar" | `git diff --stat` |
| C3 | | |

## Inspección
<!-- inspector · por criterio: ok | problema + propuesta · veredicto: pasa | vuelve al jefe -->

## Construcción
<!-- constructor · archivo → qué y por qué · qué criterio cubre · qué NO se hizo · o "bloqueo: <motivo>" -->

## Revisión
<!-- script y revisor · por criterio: pasa | falla | no aplica + evidencia · hallazgos aparte, no votan -->

## Juicio
<!-- juez · decisión (contigo | vuelve | escalado) + motivo · resumen para el usuario -->

## Decisión
<!-- usuario · aprobado | descartado | pide cambios, y por qué -->

## Métricas y retro
| vueltas | minutos | tokens | operario (fallos/llamadas) | ¿retocado antes del push? |
|---|---|---|---|---|
| | | | | |

**Preguntas de reglas:** <!-- cuántas hubo; cuántas resolvieron los árbitros; cuántas llegaron al usuario o a Murillo; cuántas de los árbitros corrigió el usuario -->
**Fue bien:**
**Cambiaríamos:**
