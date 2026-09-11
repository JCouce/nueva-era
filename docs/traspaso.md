# Traspaso: cómo seguir con este proyecto

Para quien recoja el trabajo (otra sesión, otro agente, tú mismo dentro de tres semanas).
Se lee entero antes de tocar nada: son cinco minutos y evita rehacer decisiones ya tomadas.

> **Si vas a arrancar una sesión nueva para seguir el desarrollo, hay un encargo ya escrito
> y listo para pegar: `docs/prompt-relevo.md`.** Cita este documento y los archivos de
> código que más importan.

> **El estado — qué está hecho, qué falta, qué lo bloquea — vive en `docs/tareas.md`, no
> aquí.** Este documento es cómo se trabaja: mapa de archivos, normas y trampas conocidas.

---

## 1. Qué es esto en una frase

Una app mobile-first para que un grupo de rol de unos diez jugadores lleve sus fichas de un
sistema **propio y todavía a medio escribir**, que va soltando el diseñador (Murillo) a
cuentagotas por chat y en PDFs parciales.

**La partida empieza alrededor del 23 de septiembre de 2026.** Lo imprescindible para el día 1
era: crear personaje, saber a cuánto tiras y consultar el equipo. Estado exacto de eso y de
todo lo demás, en `docs/tareas.md`.

## 2. Dónde está cada cosa

| Fichero | Qué es | Cuándo se toca |
|---|---|---|
| `docs/sistema.md` | **La fuente de verdad de las reglas.** Estado por bloque, fuente de cada regla, supuestos numerados (S1-S8), conflictos (C4-C13) y 30 preguntas abiertas | Siempre que se implemente o se aclare una regla |
| `docs/tareas.md` | **La fuente de verdad del estado.** Qué está hecho, qué falta, qué lo bloquea | Al cerrar o abrir cualquier tarea — es el único sitio donde se anota esto |
| `docs/fase-6b.md` | Hoja de ruta con subtareas del gestor de combate, para cogerlas una a una | Al coger o cerrar una subtarea. Se archiva (resumen a `docs/tareas.md`) cuando la fase entera cierre |
| `docs/equipo-efectos-especiales.md` | Hoja de ruta pieza a pieza para mecanizar los efectos especiales del catálogo de equipo (críticos, efectos al impactar) | Al coger o cerrar una pieza/categoría |
| `docs/pruebas-integrales.md` | Checklist de pruebas manuales exhaustivas (no solo el camino feliz) para piezas de UI grandes | Al cerrar un bloque grande de UI, o al tocar código que ya tenga su sección aquí |
| `docs/plan-app.md` | Por qué la arquitectura es como es (capas, versionado de ficha, sistema de modificadores) | Al cambiar una decisión de arquitectura, no de estado |
| `docs/sistema-y-combate.md` | Transcripción del PDF de combate: dado, dificultades, salud, daño, 23 estados | Solo si llega una revisión del PDF |
| `docs/equipamiento.md` | Transcripción del PDF de equipamiento: armaduras, armas, kerzul, medicina | Idem |
| `docs/Creación de Personaje-1.txt` | La hoja original del diseñador | Nunca, es material fuente |
| `src/lib/rules/` | El motor: atributos, habilidades, ficha, derivados, creación, tiradas, modificadores, migraciones | Con su test al lado |
| `src/lib/catalog/` | Datos puros: especies y el catálogo de equipo entero | Al añadir contenido |
| `CLAUDE.md` | Stack, comandos, arquitectura y gotchas del proyecto | Al cambiar estructura o comandos |
| `docs/prompt-relevo.md` | Encargo para arrancar una sesión nueva: archivos clave, estado exacto, método de trabajo | Al cerrar una fase grande |
| `docs/prompt-fase-6b.md` | Encargo específico para seguir con el gestor de combate — decisiones recientes que no están en ningún otro sitio | Mientras dure la fase 6b; se archiva (como `prompt-equipo.md`) cuando cierre entera |
| `docs/prompt-equipo.md` | **Desfasado**: encargo para la fase de Equipo, que ya está construida (Tienda, Equipo, ranuras) | Histórico, no seguir como si fuera el siguiente paso |

## 3. Estado exacto

**Se mudó a `docs/tareas.md`.** Ahí está la tabla de fases, qué está hecho y qué lo
bloquea — actualízalo ahí cuando cierres o abras algo, no aquí.

## 4. Cómo se trabaja aquí

Estas reglas salieron de decisiones tomadas con el usuario. Respétalas o discútelas, pero no
las ignores por descuido.

**No te inventes reglas.** Si el sistema no define algo, hay dos salidas legítimas: declararlo
en la interfaz (ver `PendienteTab` y las tiradas con `bloqueada`, que muestran el motivo al
jugador) o implementarlo como **supuesto numerado** en `docs/sistema.md` con su pregunta
asociada. Lo que no vale es rellenar el hueco en silencio.

**`docs/sistema.md` manda.** Lo que no esté ahí no existe para el código. Al implementar una
regla se marca su estado; al aclararse un conflicto, se actualiza y se anota qué lo tumbó.

**Cada fórmula lleva su test.** `npm test` corre con `node --test`, sin dependencias, en ~150 ms.
No es burocracia: las reglas las escribe otra persona y cambian cada semana, y un error de
fórmula no se ve en pantalla. El salto vertical negativo se detectó de chiripa levantando la
app; con test no habría hecho falta la chiripa.

**Al cambiar la forma de la ficha, migración.** Se sube `SCHEMA_VERSION`, se añade el paso en
`lib/rules/migraciones.ts` y su test. `parseSheet` es tolerante y recorta lo que no encaja,
pero **descartar en silencio no es migrar**: si un dato del jugador cambia de sitio, la
decisión se toma explícitamente en la migración.

**Solo se guarda lo que el jugador decide.** Atributos comprados y habilidades. Todo lo
derivable —aplicados, puntos gastados, vida, fatiga, movimiento, modificadores— se recalcula
en cada render. Nunca persistas un derivado.

**Verifica en el navegador, no solo que compile.** `tsc` y los tests no ven un cálculo mal
cableado a la interfaz. El flujo probado: crear usuario y personaje en la base local, entrar
con Chrome (MCP `chrome-devtools`), comprobar los números a mano, y **borrar los datos de
prueba al terminar**.

**Idioma:** dominio y UI en español (`atributos`, `habilidades`, `especieId`). El código
heredado en inglés (`Sheet`, `parseSheet`) se queda como está.

**Git:** commits temáticos y en español, con el pie de coautoría. **No hagas push sin que el
usuario lo pida**: un push a `main` despliega a producción en Vercel.

## 5. Trampas que ya nos han mordido

- **`pdftotext` corrompe algunas tablas.** En el PDF de equipamiento, un glifo fantasma se
  extrae como `1` y se pega a los números: la tabla de armaduras salía con blindaje 11 en vez
  de 1. Cuando transcribas tablas, **contrasta contra el render** (`pdftoppm -png` y leer la
  imagen).
- **Los tests necesitan el resolver.** El código importa sin extensión (lo que espera el
  bundler de Next) y Node exige extensión: `scripts/test-resolver.mjs` la completa. Si añades
  tests, importa sin extensión como el resto del código.
- **Postgres local va en el puerto 5433**, no el 5432.
- **El Chrome del MCP puede estar ocupado** por otra sesión. Alternativa probada: login por
  HTTP con `curl` contra `/api/auth/csrf` y `/api/auth/callback/credentials`, que sirve para
  comprobar el HTML renderizado en servidor.
- **Rellenar formularios con `fill_form` no siempre dispara los eventos de React.** Usa `fill`
  campo a campo.
- **Fresh start el 2026-09-10**: se borraron todos los `Character` de la base local al cerrar
  la creación por prioridad (`HOJA2`). No hay ficha del usuario que evitar tocar — pero sigue
  la misma norma de siempre: si creas una de prueba, bórrala al terminar.
- **`border-accent` sobre `HudCard` no siempre gana** — `HudCard` ya trae `border-border` en su
  propia plantilla, y con Tailwind v4 dos utilidades de igual especificidad (mismo elemento,
  mismo tipo de propiedad) las decide el orden en que el motor las generó en el CSS final, no
  el orden del `className` en el JSX. Encontrado en 2026-09-11 (fase 6b, resaltar la fila del
  turno activo en `CombateConsole.tsx`): `border-accent` se aplicaba en el DOM pero el borde
  seguía gris — confirmado con `getComputedStyle` antes de arreglarlo, no a ojo. Arreglo:
  `!border-accent` (el `!` de Tailwind fuerza `!important`, gana siempre). **Mismo patrón sin
  el `!` ya existía antes en `TiradasTab.tsx` (`critico ? "border-accent"`) y `TiendaTab.tsx`
  (`activo ? "border-accent ..."`)** — no se ha comprobado si ahí también falla; si tocas esas
  pantallas, verifica el borde de verdad (con `getComputedStyle`, no de un vistazo) antes de
  asumir que se ve.
- **Antes de dar por bueno un modificador nuevo, ábrelo en el modal de Tiradas y mira si
  aparece en el desglose** — no te fíes de que "está en el catálogo" signifique "se aplica".
  Hay cuatro mecanismos distintos según el tipo de bono (condición interactiva, ajuste fijo,
  bono por tramo, o alcance de personaje entero); usar el que no toca es la forma más fácil de
  que algo se calcule y no llegue a ningún sitio. Lee `docs/modificadores-tiradas.md` antes de
  tocar nada de esto — trae el árbol de decisión y un aviso importante: varios `tiradaId` del
  catálogo apuntan a tiradas que **todavía no existen** (poderes psiónicos, ceguera por
  destello...) a propósito, porque la regla no está clara — no es un bug, no le busques id.

## 6. El equipo: por qué el catálogo es como es

Fase cerrada — el estado exacto y lo que quedó fuera a propósito están en `docs/tareas.md`,
no aquí. Lo que sí vale la pena dejar fijado es la forma del dominio, porque no es obvia
mirando solo el código:

**El catálogo no es una lista de objetos con precio.** Hay **25 módulos instalables con
niveles**, repartidos en cuatro familias que se comportan distinto:

| Familia | Cuáles | Regla propia |
|---|---|---|
| **Subsistemas** (5) | camuflaje trifásico, derivación psiónica, escudo deflector, malla plasmática, proyector de pulso | **Consumen ranura**: la armadura admite de 0 a 3. Tienen modos, célula de 10 cargas, acción de activación y efectos distintos por nivel |
| **Mejoras estándar** (9) | soporte vital, compartimento oculto, funda, inyector, ignífuga, anticorrosivo, tejido conductor, visor nocturno, visor térmico | **No consumen ranura** |
| **Movimiento** (2) | exoesqueleto, movilidad aérea | No gastan ranura de subsistema, pero la armadura les pone **tope de nivel** |
| **Mejoras de arma** (4 con niveles + varias sin) | mira, puntero, bípode, retroceso, bayoneta, lanzagranadas, silenciador, linterna, munición especial | **Compatibilidad por tipo de arma**, y cada arma dice cuántas admite |

Los subsistemas son, en la práctica, **poderes que se instalan**: un arma cabe en una fila de
tabla, pero el camuflaje trifásico tiene descripción, dos modos, cuatro niveles con coberturas
distintas y gestión de cargas.

## 7. Lo que hay que preguntarle al diseñador

Las 30 preguntas, con cuáles son las de más impacto ahora mismo, están al final de
`docs/tareas.md`. La lista completa numerada vive en `docs/sistema.md`.

## 8. Lo que el usuario ya ha decidido, para no volver a preguntarlo

- El sistema viejo **desaparece**; no se compara con él ni se resucita.
- Las fichas antiguas **se borran**; los jugadores empiezan de cero.
- Las migraciones se escriben **antes de que el grupo cree sus personajes**, no después.
- Prefiere **pragmatismo con red**: nada de ceremonia, pero los guardarraíles del motor sí.
- Los documentos del diseñador se transcriben **fielmente**, con las erratas marcadas *(sic)*
  y sin corregirle las reglas.

## 9. Diseño cerrado: panel de máster (fase 6)

Estado (6a hecha, 6b pendiente) en `docs/tareas.md`. Lo que queda aquí es el brainstorm
cerrado con el usuario el 2026-09-09 — el "por qué" de cómo quedó montado, que no es obvio
mirando solo el código. Va después de **3. Equipo**, no antes: no tiene sentido aprobar ni
dar créditos de una ficha que aún no puede comprar nada.

**El punto de partida cambia el enfoque de toda la fase.** `canEditCharacter()` ya deja al
`MASTER` editar cualquier ficha, y `/characters` ya le lista todas. No hace falta ningún
mecanismo de "enviar" la ficha al máster (ni foto, ni export): vive en la misma base de datos
y él ya tiene lectura y escritura totales, hoy. Tampoco hace falta un modelo `Campaign`
mientras solo haya una mesa — se añade el día que haga falta una segunda, no antes. Y añadir
equipo a la ficha de un jugador **ya funciona** sin código nuevo, porque `stats.equipo` cae
dentro del mismo permiso.

Lo que de verdad falta es superficie de UI dedicada y un puñado de campos nuevos.

### Por qué quedó así (fase 6a)

`xp` y `creditos` van como columnas propias de `Character`, no dentro de `stats`. A
diferencia del resto de la ficha, estos los concede el máster, no el jugador: si vivieran
en el mismo `stats` que escribe el autosave del jugador, el criterio de permiso de esa
acción ("dueño o máster") dejaría al jugador con una vía, aunque fuera por bug, de tocar un
recurso que no es suyo. De ahí `adjustXpAction`/`adjustCreditosAction` en
`app/master/actions.ts`, con `role === 'MASTER'` comprobado solo ahí.

Aprobar bloquea **bajar** Atributos y Habilidades, no el resto de la ficha (Identidad,
Equipo, narrativa siguen editables). Al aprobar se congela una foto de esos dos bloques
(`Character.approvedSnapshot`, motor en `lib/rules/aprobacion.ts`); un guardado posterior
que baje algo por debajo de lo aprobado se recorta, tanto en servidor como en el cliente
(el autosave optimista de `CharacterSheet.tsx` reconcilia con lo que devuelve el servidor
en vez de asumir que siempre coincide). Solo comprar, nunca vender — `resetBuildAction`
queda bloqueado del todo en ficha aprobada. Esto es el guardarraíl, no el sistema de
progresión: subir un punto por encima del snapshot vía XP se paga aparte (ver abajo).
Fichas aprobadas antes de que existiera este campo tienen `approvedSnapshot: null` — sin
snapshot no hay suelo, fallback deliberado, no bug.

Sin notificación en tiempo real en esta fase: el jugador ve el estado/xp/créditos
actualizados la próxima vez que entra a su ficha.

### Creación por prioridad (HOJA2) — hecha durante la 6a, no era el plan original

`docs/Creación de Personaje.odt` (`HOJA2`) llegó a mitad de la fase 6a y reemplaza buena
parte del motor de creación de `HOJA`. Se implementó entera antes de seguir, porque
bloqueaba probar el guardarraíl de aprobación con datos reales. Ver `docs/sistema.md` §2 y
`CONV-4` para el detalle de las reglas.

La progresión con XP tras aprobar paga al mismo coste por nivel que en creación, nunca deja
bajar del valor actual, y el techo pasa a ser el del sistema (6) en vez del de creación (4)
— `aprobacion.ts` (`aplicarSueloAtributo`/`Habilidad`) queda sin usar en este camino: el "no
bajar" ya lo garantiza comparar siempre contra el valor actual, no hizo falta el snapshot
para eso.

**Sin resolver:** con la fórmula Nivel×2, llegar a 4 en un atributo (el tope de creación)
cuesta 20 puntos — más que el presupuesto de la mejor letra posible (A, 18). Puede ser
intencional (el 4 no tiene por qué ser alcanzable solo con el pool de creación) o un número
que no cuadra en `HOJA2`. Preguntado al usuario, pendiente de que lo lleve al diseñador.

### Fase 6b — panel de combate: por qué así

Diseño cerrado el 2026-09-11, ahora en construcción por subtareas: `docs/fase-6b.md`.

Aquí sí compensa algo más vivo que un refresco al entrar — es el sitio real donde el
usuario quiere el efecto "wow" de ver la vida moverse sin recargar. La solución sigue sin
ser websockets: polling corto (5-10 s) contra el mismo endpoint de siempre, activo solo
mientras hay un combate marcado como en curso. Cero infraestructura nueva, funciona igual
en serverless. Si eso se queda corto, se escala a algo real-time (Postgres LISTEN/NOTIFY, o
un servicio como Supabase Realtime) — pero no antes de probar que el polling no basta.
