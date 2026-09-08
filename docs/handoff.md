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
| 2. Ficha viva | ⬜ | **Decisión del usuario**: ¿la vida se lleva en la app o en papel? |
| 5. Poderes, dotes, aumentos | ⬜ | El diseñador, que aún no los ha escrito |
| 6. Máster | ⬜ | Va después de la 2 |

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
- **En la base local hay un personaje del usuario** (`Testo1`). No lo toques.

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
