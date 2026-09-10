# Encargo: coger el relevo del proyecto

> Prompt listo para pegar entero en una sesión nueva (otro agente, o tú mismo dentro de
> unas semanas). Sustituye a cualquier resumen que te puedan dar de palabra — este texto
> es la fuente, y los archivos que cita son la fuente de la fuente.

---

Vas a seguir el desarrollo de **Nueva Era**, una app mobile-first para que un grupo de
rol de unos diez jugadores lleve sus fichas de un sistema propio que el diseñador
(Murillo) suelta a cuentagotas por chat y PDFs parciales. La partida empieza alrededor
del 23 de septiembre de 2026.

## Antes de nada: lee esto, en este orden

No escribas una línea de código antes de terminar esta lista. Son quince minutos y
evitan que repitas descubrimientos que ya están hechos.

1. **`CLAUDE.md`** — stack, comandos, arquitectura, gotchas. El resumen técnico del
   proyecto.
2. **`AGENTS.md`** — una línea, pero importante: este Next.js **no es el que conoces**.
   Hay APIs y convenciones distintas (`src/proxy.ts` en vez de `middleware.ts`, Prisma 7
   con driver adapters obligatorios). Si algo del framework no encaja con lo que
   recuerdas, es la versión, no un bug.
3. **`docs/handoff.md`, entero** — es el documento vivo del estado del proyecto: qué
   está hecho, qué falta, qué trampas ya han mordido a alguien, cómo se trabaja aquí.
   Está escrito para que no tengas que preguntar lo que ya se decidió. Su §9 tiene el
   estado exacto de la fase de máster y creación por prioridad, que es lo más reciente
   y lo más grande construido hasta ahora.
4. **`docs/sistema.md`** — la única fuente de verdad de las reglas del juego. Si una
   regla no está aquí, no existe para el código, por mucho que "tenga sentido". Cada
   bloque lleva un estado (`FIRME`/`INFERIDO`/`PARCIAL`/`PENDIENTE`/`CONFLICTO`) y una
   fuente. Al final hay supuestos numerados (S1, S2...), conflictos entre documentos
   (C4, C5...) y una lista de preguntas abiertas para el diseñador. Revísalas antes de
   asumir que algo está decidido.

## Los archivos de código que más te van a importar

| Archivo / carpeta | Qué es |
|---|---|
| `src/lib/rules/` | El motor de reglas entero, en espejo con `docs/sistema.md`. Cada módulo tiene su `.test.ts` al lado. Si vas a tocar una fórmula, aquí vive. |
| `src/lib/rules/prioridad.ts` | Lo más nuevo: creación por prioridad (letras A-E, coste triangular por nivel). Casi todo lo demás del motor depende de esto ahora. |
| `src/lib/rules/aprobacion.ts` | El guardarraíl de aprobación (snapshot, suelo). Ojo: sigue viva pero `characters/[id]/actions.ts` ya no la usa para atributos/habilidades — ver por qué en `docs/handoff.md` §9. |
| `src/lib/rules/creacion.ts` / `sheet.ts` / `derivados.ts` | Point-buy, forma de la ficha + migraciones, y todo lo que se calcula pero nunca se guarda (aplicados, salud, movimiento). |
| `src/app/characters/[id]/actions.ts` | Todas las server actions de la ficha: autosave, permisos, y desde hace poco también la progresión con XP. Es el sitio con más lógica de negocio fuera del motor puro. |
| `src/app/characters/[id]/CharacterSheet.tsx` | El componente cliente que orquesta toda la ficha: estado, autosave con cola, reconciliación optimista con el servidor. |
| `src/app/characters/[id]/_components/` | Un componente por tab (`AtributosTab`, `HabilidadesTab`, `ResumenTab`, `PrioridadCard`, `DotesTab`, `PsionicaTab`, `TiendaTab`, `EquipoTab`, `TiradasTab`). |
| `src/app/master/` | Panel del máster: `page.tsx` (la cola), `actions.ts` (aprobar/revertir/xp/créditos/prioridades), `MasterControls.tsx` (piezas compartidas con la tira que aparece dentro de la ficha). |
| `prisma/schema.prisma` | `Character.stats` (Json, la ficha entera) + `status`/`approvedAt`/`approvedSnapshot`/`xp`/`creditos` como columnas propias — deliberado, ver por qué en `docs/handoff.md` §9. |

## Estado exacto ahora mismo (2026-09-10)

No lo repito todo — está en `docs/handoff.md` §3 y §9 — pero el resumen:

**Hecho y verificado en Chrome** (no solo compilado): motor de tiradas, atributos,
habilidades, salud, movimiento, especies provisionales; catálogo de equipo con Tienda y
Equipo (equipar/desequipar, validación de ranuras); panel de máster completo
(aprobación, xp, créditos); creación por prioridad entera (reparto de letras, coste
triangular, Dotes/Psiónica con presupuesto declarado, Recursos→créditos, Altura/Peso);
progresión con XP tras aprobar (subir cuesta XP, nunca se puede bajar, techo del sistema
en vez del de creación).

**Deliberadamente sin hacer todavía**: Carga Transportable (fórmula lista en
`docs/sistema.md` §5.5, sin UI ni penalizadores). Compra en Tienda con créditos reales
(hoy se equipa gratis; ahora que existen créditos, es una decisión de producto pendiente
de que el usuario diga si la conecta). Panel de combate en vivo (fase 6b, sin diseñar en
detalle). Catálogos de Dotes, Psiónica, Aumentos y Especies reales — bloqueados porque
el diseñador no ha mandado esos documentos, no por nada del lado del código.

**Un fresh start ya se hizo** (2026-09-10): no hay personajes de prueba viejos que
evitar tocar. Si creas uno para probar, bórralo al terminar — es la única norma que
sigue en pie.

## Cómo se trabaja aquí — lo que no está escrito en ningún sitio más

Esto es lo que yo hubiera querido que me dijeran al entrar, más allá de lo que ya dice
`docs/handoff.md` §4:

- **No te inventes reglas.** Dos salidas legítimas si algo no está definido: declararlo
  en la interfaz (patrón `PendienteTab`, tiradas con `bloqueada`, o las tabs de
  Dotes/Psiónica que muestran "sin catálogo todavía") o anotarlo como supuesto numerado
  en `docs/sistema.md`. Rellenar el hueco en silencio no es una opción, ni siquiera para
  ir rápido.
- **Verifica en el navegador de verdad, no solo `tsc`.** Este proyecto usa Chrome vía
  MCP (`chrome-devtools`, no Playwright salvo que se pida). El flujo probado: crear
  usuario/personaje de prueba, entrar, comprobar los números a mano, borrar al terminar.
  Un cálculo mal cableado a la interfaz no lo ve ni el compilador ni los tests.
- **Cambiar el schema de Prisma dejará el cliente cacheado.** Si después de una
  migración el dev server tira un `PrismaClientValidationError` con un campo que
  *acabas* de añadir, no es un bug tuyo: reinicia el dev server (`npm run dev`), el
  cliente generado se quedó desfasado de cuando arrancó.
- **`assert.strict` distingue `-0` de `0`.** Si una fórmula puede dar `-0` (típico de
  `Math.ceil`/`Math.round` con negativos cerca de cero), un test con `assert.equal`
  puede fallar aunque el número sea "el mismo". Normaliza con `|| 0` en la propia
  función, no en el test.
- **`revalidatePath` en cada sitio que lee lo que acabas de escribir**, no solo en la
  ruta donde vive la action. La tira del máster dentro de `characters/[id]/page.tsx` lee
  columnas (`xp`, `creditos`) que también toca `/master` — como son dos renders de
  servidor distintos de datos que se solapan, hace falta revalidar los dos o uno de los
  dos se queda con caché vieja hasta un F5. Ya ha pasado dos veces en esta fase.
- **El cliente reconcilia con el servidor, no al revés.** `CharacterSheet.tsx` aplica
  cambios de forma optimista con las mismas funciones puras del motor, pero en cuanto el
  servidor tiene lógica que el cliente no puede replicar sin conocer más estado (el
  guardarraíl de aprobación, la XP disponible), la acción devuelve la ficha real y el
  cliente la adopta (`onOk` en `runSave`). Si añades una acción con lógica nueva del
  lado servidor, pregúntate si el optimismo del cliente puede quedarse "mintiendo" un
  instante — si sí, reconcilia.
- **Las letras de prioridad no se repiten entre categorías** (`setLetra` en
  `prioridad.ts` se encarga solo). Si escribes un test que asigna la misma letra a dos
  categorías para tener presupuesto de sobra en las dos, la segunda asignación le quita
  la letra a la primera — usa letras distintas.
- **Git**: commits en español, con el pie de coautoría que te dé el sistema. **No hagas
  push sin que el usuario lo pida explícitamente** — un push a `main` despliega a
  producción en Vercel. Trabaja a pasos pequeños, verificados uno a uno, no un commit
  gigante al final.

## Lo que queda, para cuando el usuario te diga por dónde tirar

No empieces ninguna de estas por tu cuenta — pregunta prioridad primero. En el orden que
yo recomendaría, de más a menos aislado/rápido:

1. **Tienda con créditos.** Ya existe el catálogo, la validación de ranuras y los
   créditos — falta decidir si se conecta el gasto real al equipar, o se queda
   "equipar gratis" para esta partida.
2. **Housekeeping de `docs/handoff.md` / `docs/prompt-equipo.md`.** El segundo describe
   una fase (Equipo) que ya está construida — está desfasado, confunde si alguien lo lee
   como si fuera el siguiente paso.
3. **Carga Transportable.** Fórmula ya en `docs/sistema.md` §5.5, falta engancharla
   (dato en Resumen, penalizadores más adelante).
4. **Fase 6b — panel de combate en vivo.** Encargo del usuario sin diseño cerrado
   todavía: estados/buffs, vida en vivo. Necesita una sesión de diseño como esta, no
   solo picar código.
5. **Todo lo que depende del diseñador** (Dotes, Psiónica, Aumentos, Especies reales,
   varios conflictos de `docs/sistema.md` como C4/Exploración que bloquea la Alerta) —
   no hay mucho que adelantar aquí sin que Murillo responda.

## Cómo quiero que empieces

1. Lee los cuatro documentos de arriba, en ese orden.
2. Antes de tocar código, dile al usuario en corto qué has entendido del estado actual y
   pregúntale por dónde seguir — no asumas la lista de "lo que queda" como orden de
   trabajo, es una sugerencia, no una cola.
3. Trabaja a pasos pequeños: un cambio, sus tests, verificación en Chrome si toca UI,
   commit. Así si algo se tuerce, se ve exactamente dónde.
