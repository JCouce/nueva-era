# Barrido capa-1 — ARMAS (39), MEJORAS_ARMA (8), MOVIMIENTO (2)

Checklist de `docs/motor.md` aplicada a `src/lib/catalog/equipo.ts`. Solo informe,
ningún archivo de código tocado.

## Patrón general de las 39 armas de fuego (para no repetir 39 veces lo mismo)

Cada `ArmaFuego` tiene estos efectos, con la misma respuesta para las 39 salvo
excepciones anotadas abajo:

| Efecto | Acción | Tipo | Estado |
|---|---|---|---|
| El arma en sí | `ataque_fuego_{instanciaId}` ("Disparar con X"), generada por `tiradaDeArmaFuego` en `combate.ts` | 1 (acción) | ✅ ya hecho |
| `danio`/`dificultad` por modo (`modos[]`) | la misma acción, vía `ataque.modos` | 2 (numérico) | ✅ ya hecho |
| Tramo de distancia (`alcance`) | la misma acción, condición "Distancia" | 2 (numérico) | ✅ ya hecho — `ajusteTramoBase()` ya trae las excepciones de familia (escopeta +1 corta/bocajarro, fusil de precisión -2 corta) |
| Selector de modo si hay ≥2 (`modos[].etiqueta`) | la misma acción, condición "Modo de disparo" | 2 (numérico, la dificultad de cada modo) | ✅ ya hecho |
| `especial` (todo el texto "Efecto X (N) · Crítico de Y (N) · F. Auto (Esquiva N)") | la misma acción, `nota` | 3 (texto) | ✅ ya hecho — se vuelca entero a `Tirada.nota` (`combate.ts:169`) |
| Munición (`municion`, `tipoMunicion`) | la misma acción, aviso de insuficiencia en el selector de modo | 5 (habilitador, `arbitraje: "blando"`) | ✅ ya hecho — RECURSOS, hoy |

**Lo que hay DENTRO de `especial` que no está separado, y es donde vive la duda
real:** los números de "F. Auto (Esquiva N)" y "Crítico de X (N)" son la
dificultad de una tirada de **otro personaje** (quien esquiva el área, quien
salva contra el crítico) — no del portador del arma. El motor no tiene
`alcance: "objetivo"` (límite ya documentado en `modificadores-tiradas.md` §8,
final). Hoy esos números viven bien como texto plano dentro de la nota — **no
es un hueco nuevo, es el mismo límite ya conocido**, así que no lo cuento como
duda nueva, solo lo confirmo aplicado a este tramo del catálogo.

## Excepciones y dudas reales, arma por arma

- **Mosquito** (`pistola_mosquito`): su modificador `+2` con
  `alcance: { tiradaId: "ocultar_objeto" }` apunta a una tirada que **no existe**
  en `TIRADAS` — confirmado, `docs/equipo-efectos-especiales.md` ya lo tiene
  marcado ("❌ CORREGIDO 2026-09-12: no está hecho"). Tipo 2 (numérico) con
  destino roto — **DUDA solo en el "cuándo", no en el análisis**: bloqueado por
  que exista la acción "Ocultar objeto" (propuesta ya escrita en ese mismo
  documento, sin construir).
- **Rayo Ligero, Plasma SD, Plasma SC/SG (escopeta), Plasma SB (subfusil),
  Plasma AR/SA (fusil asalto)**: la `descripcion` (no `especial`) trae un
  penalizador de sigilo propio al disparar ("-6 al sigilo", "-5 al sigilo",
  solo percepción visual) que **no llega a ningún sitio** — ni siquiera como
  texto, porque `tiradaDeArmaFuego` solo vuelca `arma.especial`, nunca
  `arma.descripcion`. **Comprobado que NO es un patrón universal de "toda arma
  de plasma"**: Plasma SS (fusil de precisión) y Plasma AAA (ametralladora) no
  mencionan sigilo en su descripción — así que no vale generalizar por
  categoría de daño, hay que leerlas una a una. Esto es exactamente la
  pregunta abierta **25b de `sistema.md`** ("penalizador propio al sigilo de
  varias armas de fuego, sin resolver si es la tirada de detección tras
  disparar u otra"), y además depende del modelo de sigilo persistente
  propuesto ahí mismo, sin validar con Murillo. **DUDA real, no forzar**: tipo
  2 (numérico) casi seguro, pero el destino (¿a qué tirada resta exactamente?)
  es la pregunta 25b sin responder.
- **Fusiles de precisión con Mira Telescópica integrada** (los 8: Telum,
  Yivrem, K9K, Tshulok, Láser/Rayo de Largo Alcance, Plasma SS, Plaga): el
  propio `docs/equipo-efectos-especiales.md` deja abierto si
  `mejorasAdmitidas` ya descuenta el hueco que ocuparía la mira integrada, o
  es el mismo número que un fusil sin ella — no lo he podido verificar con
  las fuentes que tengo a mano (haría falta contar ranuras usadas contra el
  original de `docs/equipamiento.md` fila por fila). **DUDA, la dejo tal cual
  ya estaba marcada**, no la fuerzo.

Todo lo demás de las 39 armas (Bellum, Dragon, Sydiasi, Norgul, Feritas, Azra,
S.A.79, Gong, Nova, Vrekoy, FAS 300, Victoria, Impetus, Davray, B12, Fusil
Láser, Yojimbo, Rayo de Partículas, Telum, Yivrem, K9K, Tshulok, Láser/Rayo de
Largo Alcance, Plasma SS, Plaga, Asina, Graviter, Zotrex, Matanza, Electro TK,
Plasma AAA, Pistola Láser) sigue el patrón general de la tabla sin excepción:
**resuelto, 5 efectos, 2 tipos (1 y 2 y 3 y 5 combinados), 0 dudas.**

## MEJORAS_ARMA (8 piezas)

| Pieza | Efecto | Acción | Tipo | Estado |
|---|---|---|---|---|
| Mira Telescópica n1 | +1 media/larga | `ataque_fuego_*` del arma huésped, condición "Distancia" | 2 | ✅ hecho (`ajusteTramo`) |
| Mira Telescópica n2 | Visión nocturna/térmica como Visor n1, 500m | `alerta_activa` ("Buscar/percibir") | 3 (texto) | ❌ **NO hecho** — `modificadores: []`, sin `condiciones`, sin `nota`. Es el mismo patrón exacto que Visor Nocturno/Térmico (ya migrados al §8 de `modificadores-tiradas.md`) y aquí no se aplicó. **Hallazgo real, no duda** — falta trabajo de datos, no de diseño. |
| Mira Telescópica n3 | +2 media/larga (total, no +1 extra, S9) | igual que n1 | 2 | ✅ hecho |
| Puntero Láser n1 | +1 ataque / -2 sigilo mientras activo | `ataque_fuego_*` del arma huésped | 2, condicionado a un toggle | ❌ **NO hecho** — `modificadores: []`, sin `condiciones`. El propio comentario del catálogo dice "es un toggle, como el camuflaje" pero nunca se construyó el toggle — a diferencia del Bípode, que sí lo tiene. `docs/equipo-efectos-especiales.md` lo tenía como "❓ VERIFICAR"; queda **confirmado que no está**. |
| Puntero Láser n2 | Con ojo biónico o Mira n3, deja de penalizar sigilo | condiciona el toggle de arriba | 2 (modifica otro modificador) | Depende de que n1 se construya primero; además "ojo biónico" no existe en el catálogo (Fase 5, aumentos) — **DUDA real, bloqueado por Fase 5**. |
| Linterna | Ilumina 50m perfecta / 250m penumbra, gratis | ninguna acción concreta hoy | 3 o 4 (texto o narrativo) | El propio catálogo dice "sin dificultad ni acción asociada" — leído así, no hay número que mecanizar. Podría acabar siendo tipo 3 el día que exista una acción de "ver en la oscuridad" con tramos de distancia, pero hoy no hay ninguna a la que enganchar. **No es duda, es "tipo 4 por ahora"**. |
| Bípode n1/n2 | +1 apoyado / -1 sin apoyar (n1) o 0 (n2) | `ataque_fuego_*` del arma huésped, toggle | 2 | ✅ hecho |
| Silenciador | Reduce a -2 el penalizador de sigilo en ataques sorpresivos (en vez del habitual) | probablemente la misma acción de sigilo de la pregunta 25b de arriba | 2 | ❌ **NO hecho** — `modificadores: []`. Depende de que 25b se resuelva primero (mismo bloqueo que el sigilo de las armas de plasma): sin saber a qué tirada concreta resta el "penalizador habitual", no se puede fijar el Silenciador a -2 de algo que no existe todavía como número. **DUDA, ligada a 25b, no nueva**. |
| Sistema de Retroceso n1/n2 | +1 en modo F.Auto (portador); n2 además +1 a la dificultad de esquiva de quien te dispara (tercero) | `ataque_fuego_*` del arma huésped, alcance `modo` | 2 | ✅ hecho la parte del portador (n1 y n2 suman igual, S9). La parte de "sube la esquiva del objetivo" se queda en texto — mismo límite de "no hay alcance objetivo", no es hueco nuevo. Límite ya conocido, también documentado en `Sistema de Retroceso` de `equipo-efectos-especiales.md`: en una ametralladora disparando en modo Estándar (no F.Auto) el bono debería aplicar igualmente y hoy no lo hace — el alcance `modo` no distingue por tipo de arma. |
| Bayoneta | -1 dificultad, mismo daño que cuchillo de combate, arma pasa a dos manos mientras se usa así | **acción nueva** ("Golpear con bayoneta"), no la del arma de fuego | 1 (acción) | ❌ **NO hecho, y el comentario del catálogo que lo bloqueaba está desfasado**: dice "encaja mejor cuando exista el tipo ArmaMelee (Fase E)" — **ArmaMelee ya existe** (39 piezas en `armasMelee.ts`), así que la razón para no construirlo ya no aplica. Es el hallazgo más accionable de este tramo: falta generar una segunda `Tirada` (perfil de cuchillo de combate) cuando el fusil/escopeta lleva la Bayoneta instalada, mismo patrón que `tiradaDeLanzagranadas`. |
| Lanzagranadas Integrado | -1 al arma huésped; genera su propio perfil de disparo (13 munición-granada) | `ataque_fuego_*` (ajustesFijos) + `lanzagranadas_*` (acción propia) | 2 y 1 | ✅ hecho, los dos |

## MOVIMIENTO (2 piezas)

| Pieza | Efecto | Acción | Tipo | Estado |
|---|---|---|---|---|
| Exoesqueleto | +N Fuerza en tiradas/atributos, EXCLUYENDO vida y ciertas salvaciones; duplica Fuerza en Carga Transportable y "proezas de fuerza" | derivados (movimiento, Carga Transportable) + potencialmente varias tiradas de Fuerza | 2 | `modificadores: []` **a propósito**, ya documentado en el propio catálogo: "si se mecaniza como modificador de atributo tal cual, el motor lo aplicaría también donde no debe". Es una excepción real que el `AlcanceModificador` actual no sabe expresar (necesita "todo lo que use Fuerza EXCEPTO vida/estas salvaciones concretas"). **No es duda de análisis — es un hueco de motor conocido y ya escrito**, coincide con lo que `bonoFuerzaExoesqueleto()` en `derivados.ts` ya resuelve a mano por fuera del sistema de modificadores normal. |
| Movilidad Aérea | Dificultad de maniobra, velocidad, -1 a ataques en vuelo, esquivas usan Tecnociencia en vez de Atletismo — todo condicionado a "modo vuelo" activo | una tirada nueva de maniobra + condiciona otras tiradas existentes (ataque, esquiva) | 1 (la maniobra) + 2 condicionado (el resto) | Sin mecanizar, y correctamente marcado `🔕 IGNORAR` en `docs/equipo-efectos-especiales.md`: depende de un contexto ("¿está el personaje volando ahora mismo?") que el motor no rastrea en absoluto hoy — no es solo falta de dato, es falta de estado. **No lo cuento como duda del catálogo, es un hueco de estado de juego más grande** (parecido a "sigilo persistente" de la pregunta 25b: hace falta un campo de estado nuevo antes de que esto tenga sentido). |

## Resumen

- **39 armas de fuego**: 34 totalmente resueltas (patrón general, 0 dudas). 5
  con alguna duda real (Mosquito, y las 4 de la familia Plasma/Rayo con
  penalizador de sigilo en la descripción no expuesto).
- **8 mejoras de arma**: 3 ya hechas del todo (Mira n1/n3, Bípode,
  Lanzagranadas). 1 sin número que mecanizar por ahora (Linterna). **4 con
  trabajo real pendiente, no dudas de diseño**: Mira n2 (falta la nota de
  §8, mismo patrón ya usado en Visor Nocturno — barato), Puntero Láser
  (falta el toggle, mismo patrón que Bípode — barato), Silenciador (bloqueado
  por 25b), Bayoneta (el bloqueo que tenía ya no aplica, ArmaMelee existe —
  el más accionable de todos).
- **2 mejoras de movimiento**: las dos correctamente aparcadas, ninguna es un
  hallazgo nuevo — ya estaban bien diagnosticadas en `equipo-efectos-especiales.md`.

**Dudas agrupadas** (todas dependen de algo externo, ninguna es ambigüedad de
análisis):
1. Pregunta 25b de `sistema.md` (sigilo al disparar) — bloquea 5 piezas: Rayo
   Ligero, Plasma SD, Plasma SC/SG, Plasma SB, Plasma AR/SA, y el Silenciador.
2. La acción "Ocultar objeto" sin construir — bloquea el Mosquito.
3. "Ojo biónico" (Fase 5, aumentos) sin existir — bloquea Puntero Láser n2.
4. Verificar `mejorasAdmitidas` de los 8 fusiles de precisión contra
   `docs/equipamiento.md` fila por fila (si la mira integrada ya está
   descontada) — sin verificar, no until leer la fuente en detalle.

**Trabajo accionable ya, sin esperar a nadie** (mismos patrones ya construidos
en otras piezas, es transcripción, no diseño): Mira Telescópica n2 (copiar el
patrón de Visor Nocturno), Puntero Láser n1 (copiar el patrón de Bípode),
Bayoneta (generar una segunda `Tirada` de cuchillo de combate, mismo patrón
que `tiradaDeLanzagranadas`).
