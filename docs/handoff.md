# Traspaso: cómo seguir con este proyecto

Para quien recoja el trabajo (otra sesión, otro agente, tú mismo dentro de tres semanas).
Se lee entero antes de tocar nada: son cinco minutos y evita rehacer decisiones ya tomadas.

---

## 1. Qué es esto en una frase

Una app mobile-first para que un grupo de rol de unos diez jugadores lleve sus fichas de un
sistema **propio y todavía a medio escribir**, que va soltando el diseñador (Murillo) a
cuentagotas por chat y en PDFs parciales.

**La partida empieza alrededor del 23 de septiembre de 2026.** Lo imprescindible para el día 1
era: crear personaje, saber a cuánto tiras y consultar el equipo. Los dos primeros están
hechos.

## 2. Dónde está cada cosa

| Fichero | Qué es | Cuándo se toca |
|---|---|---|
| `docs/sistema.md` | **La fuente de verdad de las reglas.** Estado por bloque, fuente de cada regla, supuestos numerados (S1-S8), conflictos (C4-C13) y 30 preguntas abiertas | Siempre que se implemente o se aclare una regla |
| `docs/plan-app.md` | Las fases de construcción y por qué en ese orden | Al cerrar o replantear una fase |
| `docs/sistema-y-combate.md` | Transcripción del PDF de combate: dado, dificultades, salud, daño, 23 estados | Solo si llega una revisión del PDF |
| `docs/equipamiento.md` | Transcripción del PDF de equipamiento: armaduras, armas, kerzul, medicina | Idem |
| `docs/Creación de Personaje-1.txt` | La hoja original del diseñador | Nunca, es material fuente |
| `src/lib/rules/` | El motor: atributos, habilidades, ficha, derivados, creación, tiradas, modificadores, migraciones | Con su test al lado |
| `src/lib/catalog/` | Datos puros: hoy solo especies; aquí irá el equipo | Al añadir contenido |
| `CLAUDE.md` | Stack, comandos, arquitectura y gotchas del proyecto | Al cambiar estructura o comandos |

## 3. Estado exacto

**Hecho y desplegado** (hasta `2b7b091`): el sistema viejo eliminado, la ficha nueva con
identidad, 6 atributos, 6 aplicados derivados, 10 habilidades con especialidades, salud y
movimiento.

**Hecho y commiteado, sin desplegar** (`cfce81f`, `dbe8cf2`): chuleta de tiradas con dado,
motor de modificadores, dos especies de andamio y las migraciones de ficha.

| Fase | Estado | Qué la frena |
|---|---|---|
| 0. Cimientos | ✅ | — |
| 1. Motor de tiradas | ✅ salvo la Alerta | Conflicto C4 (Exploración) |
| 4. Modificadores y especies | ✅ con especies provisionales | El documento de especies |
| **3. Equipo** | ⬜ **es la siguiente** | Nada (ver §6) |
| 2. Ficha viva | ⬜ | Resuelta en el diseño de la fase 6b (§9): sí, la vida y los estados de combate se llevan en la app |
| 5. Poderes, dotes, aumentos | ⬜ | El diseñador, que aún no los ha escrito |
| 6. Máster | ✅ 6a cerrada, ver §9 | Queda la 6b (combate en vivo), sin diseño cerrado todavía |

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
- **Antes de dar por bueno un modificador nuevo, ábrelo en el modal de Tiradas y mira si
  aparece en el desglose** — no te fíes de que "está en el catálogo" signifique "se aplica".
  Hay cuatro mecanismos distintos según el tipo de bono (condición interactiva, ajuste fijo,
  bono por tramo, o alcance de personaje entero); usar el que no toca es la forma más fácil de
  que algo se calcule y no llegue a ningún sitio. Lee `docs/modificadores-tiradas.md` antes de
  tocar nada de esto — trae el árbol de decisión y un aviso importante: varios `tiradaId` del
  catálogo apuntan a tiradas que **todavía no existen** (poderes psiónicos, ceguera por
  destello...) a propósito, porque la regla no está clara — no es un bug, no le busques id.

## 6. La siguiente fase: el equipo

Es la única pieza que falta del mínimo para jugar, y la que traerá decisiones de interfaz.

> **Hay un encargo escrito y listo para pegar en una sesión nueva: `docs/prompt-equipo.md`.**
> Trae las cinco decisiones ya planteadas y prohíbe empezar a codificar antes de cerrarlas.

**Los datos ya están**: `docs/equipamiento.md` tiene el catálogo completo transcrito y
verificado — armaduras y trajes, mejoras estándar, subsistemas, seis familias de armas de
fuego con su alcance por tramos, armamento pesado, granadas, melee, armas modificadas, el
material kerzul, herramientas y medicina. Van a `src/lib/catalog/` como TypeScript tipado,
siguiendo el patrón de `especies.ts`.

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
distintas y gestión de cargas. Cómo se muestra eso en un móvil es la decisión gorda.

**Lo que hay que decidir con el usuario antes de codificar:**

1. **¿Comprar o solo consultar?** El sistema tiene créditos y rareza, pero no sabemos con
   cuánto dinero empieza un personaje (pregunta 7). Un catálogo consultable con "lo tengo
   equipado" resuelve la mesa sin esa respuesta; una tienda con presupuesto, no.
2. **Ranuras.** Las armaduras admiten un número de subsistemas y un nivel máximo de
   exoesqueleto y movilidad aérea; las armas, un número de mejoras. Está todo en las tablas.
   ¿Se validan las ranuras o se confía en el jugador?
3. **El peso no sirve de nada todavía.** Todo el equipo pesa, y las heridas penalizan la
   capacidad de carga, pero **ningún documento dice cuánta carga aguanta un personaje**
   (pregunta 26). Sin eso, mostrar kilos es decorativo.
4. **Cómo se enchufa al resto.** Un arma equipada debería alimentar la chuleta de tiradas
   (su dificultad, el modificador por distancia) y una armadura debería aportar sus
   modificadores por la vía de `ModificadorConFuente`, que ya existe. Ahí está el valor real.
5. **Volumen en móvil.** Son cientos de objetos en una pantalla estrecha: hace falta
   agrupación por familia, búsqueda y un detalle plegable. Es la decisión de UX más gorda.

**Sugerencia de orden:** catálogo de datos primero (mecánico, sin riesgo), luego la tab de
consulta con lo equipado, y solo después la compra, si el usuario quiere y llega la respuesta
sobre el dinero inicial.

## 7. Lo que hay que preguntarle al diseñador

Las 30 preguntas están en `docs/sistema.md`. Por impacto:

1. **Exploración** (C4): desbloquea la Alerta y dos tiradas. Es la más barata de responder y la
   que más desatasca.
2. **Notación de las tiradas** (C8): si "Perspicacia + Medicina" significa Biociencia con la
   especialidad Medicina, cambia el cálculo de media docena de tiradas.
3. **Capacidad de carga** (26): sin fórmula, el peso del equipo es decorativo.
4. **Especies**, **poderes**, **dotes** y **aumentos**: son fases enteras esperando.

## 8. Lo que el usuario ya ha decidido, para no volver a preguntarlo

- El sistema viejo **desaparece**; no se compara con él ni se resucita.
- Las fichas antiguas **se borran**; los jugadores empiezan de cero.
- Las migraciones se escriben **antes de que el grupo cree sus personajes**, no después.
- Prefiere **pragmatismo con red**: nada de ceremonia, pero los guardarraíles del motor sí.
- Los documentos del diseñador se transcriben **fielmente**, con las erratas marcadas *(sic)*
  y sin corregirle las reglas.

## 9. Diseño cerrado: panel de máster (fase 6)

Brainstorm cerrado con el usuario el 2026-09-09. Va después de **3. Equipo**, no antes: no
tiene sentido aprobar ni dar créditos de una ficha que aún no puede comprar nada. Antes de
tocar código aquí, lee esta sección entera — evita rehacer las mismas preguntas.

**El punto de partida cambia el enfoque de toda la fase.** `canEditCharacter()` ya deja al
`MASTER` editar cualquier ficha, y `/characters` ya le lista todas. No hace falta ningún
mecanismo de "enviar" la ficha al máster (ni foto, ni export): vive en la misma base de datos
y él ya tiene lectura y escritura totales, hoy. Tampoco hace falta un modelo `Campaign`
mientras solo haya una mesa — se añade el día que haga falta una segunda, no antes. Y añadir
equipo a la ficha de un jugador **ya funciona** sin código nuevo, porque `stats.equipo` cae
dentro del mismo permiso.

Lo que de verdad falta es superficie de UI dedicada y un puñado de campos nuevos.

### Alcance de la fase 6a

- ✅ **Schema**: `status` (`DRAFT` | `APPROVED`, default `DRAFT`), `approvedAt`, `xp Int`,
  `creditos Int` en `Character`. Un solo máster confirmado → sin `approvedBy`.
- ✅ **`xp` y `creditos` van como columnas propias, no dentro de `stats`.** A diferencia del
  resto de la ficha, estos los concede el máster, no el jugador. Si vivieran en el mismo `stats`
  que escribe el autosave del jugador, el criterio de permiso de esa acción ("dueño o máster")
  dejaría al jugador con una vía, aunque fuera por bug, de tocar un recurso que no es suyo.
  Server actions propias (`adjustXpAction`, `adjustCreditosAction` en `app/master/actions.ts`),
  con `role === 'MASTER'` comprobado ahí y en ningún otro sitio.
- ✅ **Ruta `/master`**: dashboard único, no enlaces sueltos en la nav. Cola de fichas en `DRAFT`
  arriba (para aprobar), `APPROVED` abajo, con `xp`/`creditos` editables inline. En
  `characters/[id]` hay una tira solo-máster (estado, botón aprobar/revertir, steppers de
  xp/créditos) encima de la ficha ya existente — no hizo falta una vista nueva para leerla, esa
  ya estaba. Markup compartido entre ambas en `app/master/MasterControls.tsx`. En `AppHeader`,
  link "Panel" visible solo si `role === 'MASTER'`, y los tres puntos de entrada (login,
  `/login` ya logueado, `/`) aterrizan directo en `/master` para ese rol.
- ✅ **Notificación**: ninguna en 6a, como estaba previsto. El jugador ve el estado/xp/créditos
  actualizados la próxima vez que entra a su ficha. Sin websockets.
- ✅ **Aprobar bloquea bajar Atributos y Habilidades**, no el resto de la ficha (Identidad,
  Equipo, narrativa siguen editables por el jugador). Al aprobar se congela una foto de esos dos
  bloques (`Character.approvedSnapshot Json?`, motor en `lib/rules/aprobacion.ts` — 8 tests
  propios); cualquier guardado posterior del jugador se recorta si algún atributo o habilidad
  **baja** por debajo de su valor aprobado, en `characters/[id]/actions.ts`
  (`setAtributoAction`/`setHabilidadAction`). Solo comprar, nunca vender. `resetBuildAction`
  queda bloqueado del todo en ficha aprobada (resetear es vender todo de golpe). Verificado en
  Chrome con datos reales: bajar un atributo/habilidad en el suelo se recorta tanto en servidor
  como en el cliente (el autosave optimista de `CharacterSheet.tsx` ahora reconcilia con lo que
  devuelve el servidor en vez de asumir que siempre coincide — si no, el recorte del guardarraíl
  no se veía hasta el siguiente F5). Revertir a `DRAFT` suelta el snapshot
  (`Prisma.DbNull`); volver a aprobar congela uno nuevo con los valores de ese momento.
  - **Esto es el guardarraíl, no el sistema de progresión.** Subir un punto por encima del
    snapshot vía XP necesita una fórmula de coste que el diseñador no ha dado — Progresión sigue
    `[PENDIENTE]` en `docs/sistema.md`. La 6a solo impide bajar; el "cómo se compra un punto
    nuevo con XP" es trabajo aparte en cuanto llegue esa regla.
  - Fichas aprobadas **antes** de que existiera este campo tienen `approvedSnapshot: null` — sin
    snapshot no hay suelo (fallback deliberado, no bug); vuelven a tener guardarraíl la próxima
    vez que se aprueben.

**La 6a está cerrada.** Las cuatro piezas de arriba, verificadas en Chrome con datos reales, no
solo con tests.

### Creación por prioridad (HOJA2) — hecha durante la 6a, no era el plan original

`docs/Creación de Personaje.odt` (`HOJA2`) llegó a mitad de la fase 6a y reemplaza buena parte
del motor de creación de `HOJA`. Se implementó entera antes de seguir, porque bloqueaba probar
el guardarraíl de aprobación con datos reales. Ver `docs/sistema.md` §2 y `CONV-4` para el
detalle de las reglas; aquí solo el estado de la implementación:

- **Hecho y verificado en Chrome**: reparto de letras (`prioridad.ts`, `PrioridadCard.tsx`),
  coste triangular en creación (`creacion.ts`, Stepper de Atributos/Habilidades), Aplicados
  como media, Movimiento con las constantes nuevas, tabs de Dotes/Psiónica con presupuesto
  declarado y catálogo pendiente, Recursos → créditos iniciales, Altura/Peso.
- **Progresión con XP tras aprobar, hecha** (2026-09-10, después del fresh start): subir un
  atributo/habilidad ya no está bloqueado del todo — se paga con XP al mismo coste por nivel
  que en creación (`characters/[id]/actions.ts`), nunca se puede bajar del valor actual, y el
  techo pasa a ser el del sistema (6) en vez del de creación (4). `aprobacion.ts`
  (`aplicarSueloAtributo`/`Habilidad`) queda sin usar en este camino — el "no bajar" ya lo
  garantiza comparar siempre contra el valor actual, no hizo falta el snapshot para eso.
- **Fresh start hecho** (2026-09-10): se borraron los `Character` existentes, las cuentas de
  usuario se quedan igual. Todo el mundo crea ficha desde cero con el sistema nuevo.
- **Deliberadamente fuera de esta pasada**: Carga Transportable (el usuario pidió centrarse en
  la creación primero).
- **Sin resolver**: con la fórmula Nivel×2, llegar a 4 en un atributo (el tope de creación)
  cuesta 20 puntos — más que el presupuesto de la mejor letra posible (A, 18). Puede ser
  intencional (el 4 no tiene por qué ser alcanzable solo con el pool de creación) o un número
  que no cuadra en `HOJA2`. Preguntado al usuario, pendiente de que lo lleve al diseñador.

### Fase 6b — panel de combate (después de 6a, diseño sin cerrar)

Encargo del usuario, no diseñado en detalle todavía: el máster aplica estados/buffs/debuffs,
controla la vida de cada jugador y gestiona el combate en vivo. Dos cosas que ya se saben:

- Resuelve la pregunta 23 de `docs/sistema.md` (¿la app lleva PG y fatiga en vivo, o eso se
  lleva en mesa?): con esta fase, la respuesta pasa a ser sí. Necesita un recurso de **estado en
  vivo** separado de `stats` (PG actuales, estados activos) — mismo motivo que `xp`/`creditos`:
  lo escribe el máster, no el jugador, así que no puede colgar del JSON que guarda el autosave.
  El catálogo de 20 estados de `docs/sistema.md` §7 es la base para "qué se le puede aplicar a
  alguien".
- **Aquí sí compensa algo más vivo que un refresco al entrar** — es el sitio real donde el
  usuario quiere el efecto "wow" de ver la vida o la XP moverse sin recargar. La solución sigue
  sin ser websockets: polling corto (5-10 s) contra el mismo endpoint de siempre, activo solo
  mientras hay un combate marcado como en curso. Cero infraestructura nueva, funciona igual en
  serverless. Si eso se queda corto, se escala a algo real-time (Postgres LISTEN/NOTIFY, o un
  servicio como Supabase Realtime) — pero no antes de probar que el polling no basta.

**Fuera de alcance de 6b, fase propia sin fecha:** chat máster-jugador. Pedido por el usuario,
pero es un modelo de mensajes y una UI nuevos, sin relación directa con la ficha — no se diseña
hasta que 6a y 6b estén cerradas.
