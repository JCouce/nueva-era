---
id: T-001
titulo: Comprar un cargador rellena el arma y solo suma capacidad si ya estaba llena
origen: manual
estado: descartado
vueltas: 0/2
rama: fabrica/T-001-recargar-cargador
base: 9f5d7aa
creado: 2026-10-19
inicio: 2026-10-19T11:46:56.435Z
operario: 0/6
fin: 2026-10-19T11:50:23.476Z
---

<!--
ESTRENO. Repite el trabajo de los commits e7445ad + 35119e0 (2026-09-28) desde el commit anterior (base 9f5d7aa).
Al acabar se compara con lo que hizo el usuario: intentos, diff y si hubo que retocar algo.
-->

## Encargo
Al comprar "Cargador" en un arma a 0/7, la munición se queda en 7/14: suma una capacidad entera al máximo y al
actual, como si se acumularan cargadores de sobra. Lo que tiene que pasar es que el cargador se rellene (0/7 → 7/7).
Pero si el cargador ya está lleno, comprar otro tiene que seguir sirviendo: entonces sí suma un cargador de repuesto
(20/20 → 40/40), sin tope.

## Spec
**Alcance:**
- `comprarRecarga` con un recurso de tipo "stock" (munición de arma de fuego):
  - si `actual < max`, deja `actual = max` y `max` no cambia;
  - si `actual === max`, suma la capacidad del arma (`municion` de catálogo) a `max` y a `actual`.
- El coste no cambia (`PRECIO_CARGADOR_BALAS`).
- El comentario que explica el tipo "stock" en `recursos.ts` describe el comportamiento nuevo.

**Fuera de alcance:**
- La batería de subsistema (tipo "tope"): su máximo nunca crece y recargar solo restaura `actual`. Sigue igual.
- Durabilidad y colchón: siguen sin recargarse con créditos.
- UI, precios y cualquier otra función de `recursos.ts`.

**Puede tocar:**
- `src/lib/rules/recursos.ts`
- `src/lib/rules/recursos.test.ts`
- `docs/tareas.md` (su línea, siempre)

## Criterios
| # | Qué se tiene que cumplir | Oráculo |
|---|---|---|
| C1 | `npm test` y `npx tsc --noEmit` en verde | comando |
| C2 | Ningún cambio fuera de "Puede tocar" | `git diff --stat` |
| C3 | Arma de capacidad 7: con el recurso a **0/7**, `comprarRecarga` lo deja en **7/7**; a **3/7**, en **7/7** | comando: comprobación propia del revisor sobre `comprarRecarga`, con estos valores fijados aquí |
| C4 | Arma de capacidad 20: a **20/20** pasa a **40/40**, y otra compra a **60/60** | comando: comprobación propia del revisor, valores fijados aquí |
| C5 | Batería de subsistema (tipo "tope"), con cualquier subsistema de catálogo con célula: a medias pasa a **max/max**, y a tope se queda igual (el `max` nunca cambia) | comando: comprobación propia del revisor, valores fijados aquí |
| C6 | El coste de recargar munición sigue siendo `PRECIO_CARGADOR_BALAS` | comando: comprobación propia del revisor |
| C7 | El comentario del tipo "stock" en `recursos.ts` ya no dice que recargar siempre suma al máximo, y explica los dos casos | diff |

## Inspección
```
C1  ok
C2  ok
C3  ok (hay armas de catálogo con municion 7: armasFuego.ts:88, 198, 328)
C4  ok (hay armas de catálogo con municion 20: armasFuego.ts:171, 577)
C5  ok (subsistemas con célula en subsistemas.ts; max = celula.cargas, fijado por catálogo)
C6  ok
C7  ok (el comentario actual, recursos.ts:12-16, dice "Recargar SUMA una carga más": el diff lo hace comprobable)
Contrato: ok. Los cuatro puntos del alcance están cubiertos (C3, C4, C6, C7) y C5 cubre la regresión del tipo "tope". "Puede tocar" son los 2 archivos mínimos más tareas.md, sin schema.

Veredicto: pasa
```

## Construcción
Commit `69dbfd2` en `fabrica/T-001-recargar-cargador`.

```
src/lib/rules/recursos.ts → comprarRecarga: el tipo "stock" solo suma la capacidad a max y actual si
  actual >= max (lleno); si no, cae a la misma rama que "tope" (actual = max, max intacto). Coste sin
  tocar. Comentario de cabecera del tipo "stock" reescrito con los dos casos.   (cubre C3, C4, C5, C6, C7)
src/lib/rules/recursos.test.ts → test del stock partido en tres: 0/7 y 3/7 → 7/7 (Mosquito); 20/20 → 40/40
  → 60/60 (pistola_sydiasi); stock crecido y gastado (15/40) se rellena a 40/40 sin sumar.   (cubre C3, C4, C6)
docs/tareas.md → entrada nueva "Comprar cargador rellena el arma (T-001)" antes de "## Pendiente".
npm test (602 en verde), npx tsc --noEmit y npm run lint limpios.   (cubre C1)
No hecho: no reescribo el punto 1 de la entrada RECURSOS de tareas.md (describe el comportamiento viejo);
  "Puede tocar" limita tareas.md a su línea, así que la entrada nueva lo señala en vez de editarlo.
Tests existentes cambiados:
  - "un recurso tipo stock (arma) suma la capacidad tanto a max como a actual": esperaba 5/7 → 12/14, que es
    justo el bug del encargo. Ahora 0/7 y 3/7 → 7/7, valores de C3.
  - "reconciliar no pisa un actual ya gastado ni un max ya crecido por compra": llegaba a 11/14 comprando a
    4/7, cosa que ya no hace crecer el max. Ahora compra a 7/7 (→ 14/14) y gasta 3 → 11/14; mismo estado
    final y misma aserción tras reconciliar, solo cambia el camino para llegar.
```

## Revisión
```
C3  pasa
    evidencia: comprobación propia sobre comprarRecarga (pistola_mosquito): 0/7 -> 7/7, 3/7 -> 7/7
C4  pasa
    evidencia: comprobación propia (pistola_sydiasi): 20/20 -> 40/40 -> 60/60
C5  pasa
    evidencia: comprobación propia (camuflaje_trifasico en armadura_ligera): 4/10 -> 10/10, 10/10 -> 10/10, max intacto
C6  pasa
    evidencia: coste 50 en ambos casos de stock === PRECIO_CARGADOR_BALAS; recursos.ts:315 sin tocar
C7  pasa
    evidencia: diff recursos.ts:13-21, desaparece "Recargar SUMA una carga más" y explica relleno (actual < max) y repuesto (actual === max)
```
Hallazgos (no votan):
- El punto 1 de RECURSOS en docs/tareas.md sigue con el comportamiento viejo; la entrada nueva lo señala.
- Tests existentes con esperados cambiados: los nuevos son los del contrato (C3); el de reconciliar mantiene su estado final 11/14.

## Juicio
### Intento 1 · contigo
**Motivo:** todos los criterios pasan con evidencia

| # | veredicto | vota | evidencia |
|---|---|---|---|
| C1 | pasa | script | npm test; npx tsc --noEmit |
| C2 | pasa | alcance | 3 archivos cambiados, todos dentro de "Puede tocar" |
| C3 | pasa | revisor | script propio (scratchpad/rev/check.test.ts) sobre comprarRecarga del worktree, pistola_mosquito: 0/7 -> 7/7 y 3/7 -> 7/7; recursos.ts:312 ( |
| C4 | pasa | revisor | script propio, pistola_sydiasi: 20/20 -> 40/40, y otra compra 40/40 -> 60/60 |
| C5 | pasa | revisor | script propio, camuflaje_trifasico (célula 10, instalado en armadura_ligera): 4/10 -> 10/10 y 10/10 -> 10/10, max intacto; coste 150 (PRECIO |
| C6 | pasa | revisor | script propio: coste 50 tanto rellenando (0/7) como sumando repuesto (20/20) === PRECIO_CARGADOR_BALAS (50); recursos.ts:315 sin tocar en el |
| C7 | pasa | revisor | diff recursos.ts:13-21: quita 'Recargar SUMA una carga más' y describe los dos casos (actual < max rellena sin tocar max; actual === max sum |
| script | pasa | script | lint: pasa; ficha: no aplica; prod: pasa |

**Para el usuario:** Todo pasa. La rama fabrica/T-001-recargar-cargador está lista para que la mires; el push es tuyo.

## Decisión
descartado: es el estreno, un ensayo. El arreglo ya está en main desde 2026-09-28 (e7445ad + 35119e0); la rama
queda solo para comparar.

## Métricas y retro
| vueltas | minutos | tokens | operario (fallos/llamadas) | ¿retocado antes del push? |
|---|---|---|---|---|
| 0/2 | 3,5 | ~200k (9 agentes) | 0/6 | no aplica (ensayo) |

Ensayo 1 (misma spec, antes de los arreglos F-005 a F-007): el trabajo salió bien pero la línea abortó en el juez
(F-006). Rama `fabrica/T-001-ensayo1`.

**Fue bien:** a la primera, con el mismo comportamiento final que el commit del usuario; el operario sin fallos; el
inspector leyó el código de la base y el revisor comprobó C3-C6 con su propio script.
**Cambiaríamos:**
- El "a la primera" tiene ventaja: el contrato se escribió conociendo la segunda corrección del usuario. El próximo
  estreno sale solo del encargo original.
- Dos ejecuciones dieron dos implementaciones (`max + cap` y `actual + cap`), iguales en todo lo que fija el contrato.
  Lo no fijado lo decide cada constructor; se acepta mientras no cambie el comportamiento.
- La entrada RECURSOS de `tareas.md` quedó desfasada (F-008).
