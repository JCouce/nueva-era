---
id: T-004
titulo: Con Traslación 4, anclar a varios objetivos a la vez pasa a acción estándar
origen: manual
estado: hecho
vueltas: 0/2
rama: fabrica/T-004-anclaje-varios-nv4
creado: 2026-10-19
inicio: 2026-10-19T14:13:58.921Z
operario: 0/6
fin: 2026-10-19T14:16:21.508Z
---

<!--
PRIMER TRABAJO REAL. Lo encontraron los árbitros en su examen (2026-10-19): un supuesto de sistema.md contradice una
respuesta de Murillo.
-->

## Encargo
Los árbitros encontraron una contradicción: Murillo respondió que, con Traslación a nivel 4, el anclaje colectivo pasa
a acción estándar (`docs/sistema.md`, respuestas del 2026-09-29), pero un supuesto posterior del mismo documento y el
código dicen que anclar a varios sigue siendo compleja. Manda lo que dijo Murillo. (usuario, 2026-10-19: "dale")

## Decisiones de reglas
| # | Duda | Decisión | Quién | Fundamento |
|---|---|---|---|---|
| R1 | Con Traslación 4, ¿anclar a varios a la vez es estándar o compleja? | Estándar | Murillo | `docs/sistema.md:928-929` "anclaje colectivo pasa a acción estándar (nv4)" |

## Spec
**Alcance:**
- Con Traslación poseída a nivel 4 o más, la acción Anclaje con la opción de varios objetivos a la vez baja de
  compleja a estándar.
- El supuesto de `docs/sistema.md` que dice "anclar a varios a la vez sigue siendo compleja" se corrige para que diga
  lo de Murillo, citándolo.
- El comentario del catálogo (`psionica.ts`, Traslación nivel 4) dice lo mismo.

**Fuera de alcance:**
- Anclaje de un objetivo (sigue siendo simple con nivel 4) y la opción de añadir un objetivo en otro turno (sigue sin
  respuesta de Murillo: no cambia).
- Cualquier otra acción o nivel de Traslación.

**Puede tocar:**
- `src/lib/catalog/psionica.ts`
- `src/lib/rules/poderes.test.ts`
- `docs/sistema.md` (el supuesto de Anclaje nivel 4)
- `docs/tareas.md` (su línea y las entradas que describan este comportamiento)

## Criterios
| # | Qué se tiene que cumplir | Oráculo |
|---|---|---|
| C1 | `npm test` y `npx tsc --noEmit` en verde | comando |
| C2 | Ningún cambio fuera de "Puede tocar" | `git diff --stat` |
| C3 | Traslación poseída 4, Anclaje con varios objetivos a la vez: economía **estándar** | comando: comprobación propia del revisor sobre las reglas de poderes (`resolver`/`prepararPoder` o equivalente), valor fijado aquí |
| C4 | Traslación poseída 4, Anclaje de un objetivo: **simple** (sin cambios) | comando: ídem |
| C5 | Traslación poseída 4, añadir un objetivo: **estándar** (sin cambios) | comando: ídem |
| C6 | Traslación poseída 3: un objetivo **estándar** y varios **compleja** (sin cambios) | comando: ídem |
| C8 | El comentario de Traslación 4 en `src/lib/catalog/psionica.ts` ya no dice que anclar a varios "sigue siendo compleja" | diff |
| C7 | `docs/sistema.md` ya no dice que anclar a varios con nivel 4 "sigue siendo compleja", y el texto nuevo cita la respuesta de Murillo | prosa fuente |

## Inspección
```
C1  ok
C2  ok
C3  ok (valor fijado en el contrato; se puede hacer en psionica.ts con otra entrada de modificadoresEconomia sobre la opción "varios", el motor ya la soporta en rules/poderes.ts:224-231)
C4  ok
C5  ok
C6  ok
C7  ok (el supuesto está en docs/sistema.md:991-992; la respuesta de Murillo en 928-929)
Contrato: problema: el tercer punto del alcance (el comentario del catálogo, psionica.ts:1925-1926, que hoy dice
  "anclar a varios a la vez sigue siendo compleja") no lo cubre ningún criterio → propuesta: añadir C8 "el comentario
  de modificadoresEconomia de Traslación en src/lib/catalog/psionica.ts ya no dice que varios sigue siendo compleja y
  recoge lo de Murillo", con oráculo diff.
  Lo demás bien: "Puede tocar" alcanza y no se pasa (4 archivos, sin schema), y "fuera de alcance" no choca con C4-C6.

Veredicto: vuelve al jefe
```

### Pasada 2
```
C1  ok
C2  ok
C3  ok
C4  ok
C5  ok
C6  ok
C7  ok
C8  ok (el texto a quitar está hoy en psionica.ts:1925-1926; observable por diff)
Contrato: ok. Los tres puntos del alcance tienen criterio (C3; C7; C8), "Puede tocar" alcanza sin pasarse
  (4 archivos, sin schema) y "fuera de alcance" no choca con C4-C6.

Veredicto: pasa
```

## Construcción
```
src/lib/catalog/psionica.ts → segunda entrada de modificadoresEconomia de Traslación ("Traslación 4: anclaje
  colectivo", baja_un_paso sobre Anclaje con objetivos=varios): compleja → estándar desde nivel poseído 4. La de
  "uno" y la opción "anadir" no se tocan. Comentario de nivel 4 reescrito citando a Murillo.   (cubre C3, C4, C5, C6, C8)
src/lib/rules/poderes.test.ts → el test de nivel 4 espera "estandar" para varios con nivel 4 y añade la comprobación
  de varios con nivel 3 = "compleja".                                                          (cubre C3, C6)
docs/sistema.md → el supuesto de Traslación tanda 1 (línea ~991) dice ahora que anclar a varios pasa a estándar,
  citando la respuesta de Murillo del 2026-09-29; añadir un objetivo sigue estándar.          (cubre C7)
docs/tareas.md → línea del trabajo en la sección de Traslación (Psiónica, Hecho).
Comprobado: npm test 1471/1471, npx tsc --noEmit y npm run lint en verde; diff solo en los 4 archivos de "Puede
  tocar". Commit c68d7bf en fabrica/T-004-anclaje-varios-nv4.                                   (cubre C1, C2)
No hecho: nada
Tests existentes cambiados: poderes.test.ts, "nivel 4: Anclaje de un objetivo pasa a simple; varios a la vez…":
  varios con nivel 4 pasa de "compleja" a "estandar" porque el valor viejo venía del supuesto que contradecía a
  Murillo (R1, sistema.md:928-929); se renombra el test en consecuencia.
```

## Revisión
```
C3  pasa
    evidencia: test propio temporal (borrado) con resolverPoder(psi_traslacion_anclaje, nivelPoseido 4, objetivos=varios) → "estandar"
C4  pasa
    evidencia: ídem, nivelPoseido 4, objetivos=uno → "simple"
C5  pasa
    evidencia: ídem, nivelPoseido 4, objetivos=anadir → "estandar"
C6  pasa
    evidencia: ídem, nivelPoseido 3: uno → "estandar", varios → "compleja"
C8  pasa
    evidencia: diff psionica.ts:1925-1927, el comentario dice "pasa de compleja a estándar (Murillo, 2026-09-29…)"; grep "sigue siendo compleja" vacío
C7  pasa
    evidencia: docs/sistema.md:991-994 cita literal la respuesta de sistema.md:929; grep "sigue siendo compleja" vacío
Hallazgo: el cambio del test existente (varios nv4 compleja → estandar) es el que pide R1. Nivel 5 también da estándar, coherente con "4 o más".
```

## Juicio
### Intento 1 · contigo
**Motivo:** todos los criterios pasan con evidencia

| # | veredicto | vota | evidencia |
|---|---|---|---|
| C1 | pasa | script | npm test; npx tsc --noEmit |
| C2 | pasa | alcance | 4 archivos cambiados, todos dentro de "Puede tocar" |
| C3 | pasa | revisor | test propio temporal con resolverPoder(psi_traslacion_anclaje, nivelPoseido 4, objetivos=varios) -> economia="estandar" (nivel 5 también estandar) |
| C4 | pasa | revisor | resolverPoder anclaje nivelPoseido 4, objetivos=uno -> economia="simple" |
| C5 | pasa | revisor | resolverPoder anclaje nivelPoseido 4, objetivos=anadir -> economia="estandar" |
| C6 | pasa | revisor | resolverPoder anclaje nivelPoseido 3: objetivos=uno -> "estandar", objetivos=varios -> "compleja" |
| C8 | pasa | revisor | diff src/lib/catalog/psionica.ts:1925-1927: el comentario pasa a 'varios a la vez pasa de compleja a estándar (Murillo, 2026-09-29 ...)'; grep 'sigue siendo… |
| C7 | pasa | revisor | docs/sistema.md:991-994 dice 'pasa de compleja a estándar (Murillo, respuestas del 2026-09-29: "anclaje colectivo pasa a acción estándar (nv4)")', cita… |
| script | pasa | script | lint: pasa; ficha: no aplica; prod: pasa |

**Para el usuario:** Todo pasa. La rama fabrica/T-004-anclaje-varios-nv4 está lista para que la mires; el push es tuyo.

## Decisión
aprobado: el usuario lo da por bueno; mergeado en main (5b8e77e). El push es suyo.

## Métricas y retro
| vueltas | minutos | tokens | operario (fallos/llamadas) | ¿retocado antes del push? |
|---|---|---|---|---|
| 0/2 | 2,5 (+1 de la inspección devuelta) | ~250k (13 agentes en total) | 0/7 | no |

**Preguntas de reglas:** 0. La única duda (R1) ya la había respondido Murillo; la encontraron los árbitros en su examen.
**Fue bien:** primer trabajo real: salió de un hallazgo de los árbitros y pasó a la primera. El constructor añadió por su
cuenta la comprobación de nivel 3 con varios objetivos, que no cambiaba.
**Cambiaríamos:** la inspección lo devolvió por un punto del alcance sin criterio (F-014, tercera vez): ya lo revisa el
Jefe antes de enseñar el contrato.
