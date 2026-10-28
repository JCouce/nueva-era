# Plan: ítems y aportes — la pestaña Acciones, coherente y mantenible

**Estado:** plan aprobado en conversación con el usuario (2026-10-28). El estado de cada fase va en su cabecera.
El estado de cada fase se marca aquí (cabecera de la fase) y en `docs/tareas.md`.

Este documento es a la vez **hoja de ruta** y **encargo para subagentes**: cada fase dice qué
leer, qué entregar, qué no tocar y cómo se da por buena. Un subagente que coja una fase lee
la sección 0 entera, la sección 1 (vocabulario) y su fase, y nada más de este documento.

---

## 0. Cómo se trabaja este plan

### 0.1 Flujo por fase
1. **Planteamiento en la sesión principal**: se repasa la fase con el usuario (alcance, forma).
   Sin luz verde explícita no se escribe código, aunque sea "la siguiente".
2. **Construcción por un subagente nuevo**, con el encargo de la fase (sección "Encargo").
   **Nunca commitea ni hace push.** Deja el árbol de trabajo sucio y devuelve un informe.
3. **Revisión en la sesión principal**: diff, `npm test`, `npm run lint`, navegador (skill
   `devtools-rapido`, login local `master`/`master`) y commit. Push solo si el usuario lo pide.
4. Al cerrar la fase: se marca aquí y en `docs/tareas.md`; si la fase cambió el modelo, se
   actualiza `docs/motor.md`.

### 0.2 Invariantes (valen para todas las fases)
- **Ningún número cambia.** Todo este plan es reordenación y tipado: el total, el desglose, los
  márgenes de crítico, los costes y los textos de cada tirada son los mismos antes y después.
  Si una fase cambia un número, es un bug salvo que el usuario lo haya pedido explícitamente.
  Patrón para garantizarlo: test de caracterización antes de mover nada (como
  `src/lib/rules/montaje-caracterizacion.test.ts`).
- **Ids de favoritas estables.** `sheet.favoritas` guarda ids de fila (`accion.id`,
  `fija:bloquear_danio`, `fija:reparar_fabricar`, `fija:tirada_libre`, id de acción de poder).
  Están persistidos en Postgres: cambiar un id borra la ★ del jugador.
- **No se toca la forma de la ficha** (`sheet.ts`, `SCHEMA_VERSION`, migraciones). Nada de este
  plan es estado guardado.
- **Consumidores de `AccionesTab`** que tienen que seguir funcionando: la ficha de jugador
  (`CharacterSheet.tsx`, también en modo cabina), `MesaFicha.tsx`, el editor de NPC
  (`app/master/npcs/[id]/NpcEditor.tsx`) y el combate del máster (`CombateConsole.tsx`,
  `NpcAccionesPanel.tsx`, sin `onReparar`/`onFabricar`).
- **La UI no calcula reglas** (CLAUDE.md, `eslint.config.mjs`). Cada fase que saque cálculo de la
  UI añade al ESLint la prohibición correspondiente, para que no vuelva.
- **Las reglas no cambian.** `docs/sistema.md` no se toca salvo para corregir una referencia a
  la UI (como S84 cuando la tirada libre se movió). Si una fase descubre una regla mal
  implementada, la apunta en el informe y no la arregla.
- `npm test` y `npm run lint` en verde al terminar cada fase.

### 0.3 Lecturas comunes antes de cualquier fase
- `CLAUDE.md` y `AGENTS.md` (Next 16 no es el que conoces).
- `docs/motor.md` — capas, los cinco tipos de modificador, mecanismos de entrega, `MotorMetadata`.
- `docs/modificadores-tiradas.md` — los cuatro mecanismos de entrega en detalle.
- `src/lib/rules/acciones.ts`, tipo `Accion` (líneas ~40-280): todos los campos sueltos que este
  plan clasifica.
- `src/app/characters/[id]/_components/AccionesTab.tsx` (~1360-1720: cómo se reparte hoy todo),
  `ArbolHabilidades.tsx`, `BarraSalvaciones.tsx`, `teAfecta.ts`.

---

## 1. Vocabulario

Este vocabulario es el oficial a partir de la fase 0, en código, docs y conversación.

### 1.1 Ítem
Cualquier elemento de **capa 1** que aporta algo a la ficha: equipo (armas, armaduras, mejoras,
subsistemas, implantes, herramientas, munición especial), aumento, poder psiónico, dote, rasgo
de especie, fármaco, **estado** (lo pone el máster, pero se comporta igual). "Pieza" en
conversaciones anteriores es lo mismo.

### 1.2 Árbol
La parte **fija**, que no crea ningún ítem:
```
Habilidad
└─ Especialidad
   └─ Hoja (= una acción concreta)
```
Una **hoja** es una acción **con dado** (`Accion`) o **sin dado** (`AccionDirecta`).

**Raíces fuera del árbol** (excepciones declaradas, ver 1.7): la **barra** (salvaciones y
tirada libre: sin habilidad) y **Sin dado** (acciones sin tirada, agrupadas por lo que hacen).

### 1.3 Aporte
Cada cosa concreta que hace un ítem. Un ítem tiene uno o varios; cada aporte es de **un** tipo:

| Tipo | Qué hace | Ejemplos hoy |
|---|---|---|
| **Acción** | Añade una hoja nueva | arma → "Disparar con X"; poder; acción de dote; Reparar/Fabricar |
| **Ajuste** | Suma un número al total de la tirada (o al valor de una habilidad) | Puntero Láser +1; bono de dote; `ajustesFijos`; `bonosTramo`; Modificador `tirada` y `habilidad` |
| **Resolución** | Cambia **cómo** se resuelve, no el total: aplicado, habilidad, especialidad, dados, umbrales, reglas del daño | Sutil (`aplicadoSutil`), `habilidadAlternativa`, `ventaja`, `criticoFijo`, `subeGradoFijo`, `falloCritico`, `anulaPenalizadores`, `ignoraBlindaje`, `extremidad`, `danio` de casilla |
| **Coste** | Gasta un recurso al confirmar; no toca el total | `costeFatiga`, `ahorroFatiga`, `usoPorEscena`, munición (`recursoInstanciaId`, `gasto*`), `farmacoId`, fatiga del poder |
| **Texto** | Información sin número | `nota`, `efectoCritico`, `efectoCriticoNatural`, `efectos`, `textosTirada`, Visor Nocturno |
| **Habilitador** | Enciende o apaga una hoja **o un aporte** | `bloqueada`, `poder.bloqueo`, `soloConEspecialidad`, permisos de dote (Bloquear, Sutil), escudo roto, Shock (`piezasInutilizadas`) |

Correspondencia con `MotorMetadata.tipo` (`src/lib/rules/motor.ts`): Acción = `accion`,
Ajuste = `numerico`, Texto = `texto`, Habilitador = `habilitador`. **Resolución y Coste son
nuevos**; `narrativo` sigue existiendo pero no llega nunca a la pestaña Acciones.

Por qué Resolución y Coste no son Ajuste:

| | Ajuste | Resolución | Coste |
|---|---|---|---|
| Toca | el total | la fórmula | recursos al confirmar |
| Se combina | suma conmutativa | no apila: hay regla de quién gana (la ventaja no se acumula, el crítico más bajo gana) | suma aparte del total |
| Puede impedir tirar | no | no | sí (sin fatiga → Habilitador) |
| Se pinta como | línea del desglose | chip/opción en la hoja | precio en el botón |

### 1.4 Blanco
A qué apunta un aporte. Generaliza `AlcanceModificador` (`modificadores.ts`):

- **Nodo del árbol**: `habilidad`, `especialidad`, `tiradaId` (una hoja), **hoja de una instancia**
  (la acción de *esa* pistola, no de todas: hoy implícito en los generadores de `combate.ts`).
- **Transversal**: `aplicado`, `grupo`, `grupoHabilidad`, `familiaArma`, `modo`, `todas`.
- **Derivado**: vida, fatiga, movimiento, carga, atributo, blindaje, nivel de disciplina
  (Modificador `atributo`, `derivado`, `disciplina`, `multiplicadorVida`; mecanismo
  `suma_derivado`). No se pintan en Acciones, pero están en el modelo.
- **Otro aporte** — excepción declarada: Gran Puntería modifica el selector «Apuntado».

### 1.5 Entrega
Cuándo actúa: **fijo** (siempre, por llevarlo: Modificador con alcance, `ajustesFijos`, los
campos fijos de `conExtrasDeFicha`), **casilla** (el jugador lo marca al tirar:
`CondicionTirada`), **tramo** (depende de otra elección ya hecha: `bonosTramo`). Se corresponde
con `MotorMetadata.mecanismo`.

**Una casilla es una entrega, no un aporte** (usuario, 2026-10-28, E1 del inventario): puede
agrupar varios aportes de tipos distintos que se activan juntos (Ojo Clínico: ventaja =
Resolución, 1 de fatiga = Coste). Cada aporte de la casilla se pinta según su tipo (fase 5).

### 1.6 Momento (Texto) y condición de grado (Texto y Coste)
- **antes**: informa una decisión (si tirar, cómo, qué casilla marcar). Se pinta en la hoja.
- **después**: solo tiene sentido con el resultado. Se pinta en el resultado.
- **El resultado enseña siempre todos los textos de la tirada**, los de antes incluidos: es el
  sitio donde el jugador lo lee todo junto.
- Condición de grado opcional: siempre · en éxito · en crítico · en crítico natural · en fallo.
- **Coste también lleva condición de grado** (usuario, 2026-10-28, E3 del inventario): hay costes
  que dependen del resultado (daño propio de un poder al fallar, daño por punto de la Munición
  Supresora, peaje neurológico). Sin condición, el coste es "siempre", al confirmar.

### 1.7 Anclaje
Dónde cuelga una hoja de Acción: lista de (habilidad, especialidad?) y **quién elige**:
- **fijo**: un solo anclaje.
- **cualquiera**: varias especialidades, cuenta si tienes cualquiera (`especialidadesAccion`:
  Apoyo con Empatía o Liderazgo). Se pinta en cada una.
- **jugador**: el jugador elige antes de tirar (`especialidadAElegir`: Convencer;
  `habilidadAlternativa`: Cazador Cazado; poderes con eje que cambia habilidad o
  `habilidadesAElegir`). Se pinta en cada anclaje posible, con la elección ya puesta.

**Dónde se pinta un aporte se deduce de su blanco; dónde se pinta una hoja, de sus anclajes.**
Ningún ítem declara "dónde pintarme" aparte. Regla para blancos transversales: aparecen en
**cada hoja** a la que llegan (como hoy "te afecta").

### 1.8 Excepciones declaradas
Lo que no sigue la regla general y está bien que no la siga:
1. **Barra**: salvaciones y tirada libre (sin habilidad).
2. **Sin dado**: agrupadas por lo que hacen (Combate, Activar y desactivar, Poderes, Curación y
   fármacos, Sensores y comunicación, Referencia), no por habilidad.
3. **Aporte sobre aporte — lista cerrada** (usuario, 2026-10-28, E2 del inventario): Gran
   Puntería → selector «Apuntado»; Reflejos Felinos → descuento en «Atacantes adicionales»;
   munición especial con `sustituyeCritico` → crítico del arma. Un caso nuevo se añade aquí
   justificado; no es un tipo de blanco general.
4. **Tablero**: siempre Texto (`motor.md`, "Lo que queda fuera del modelo").
5. **Economía de creación** (coste, rareza, dinero inicial): fuera del modelo.

Cualquier excepción nueva se añade aquí con su motivo, o no es excepción sino deuda.

---

## 2. Diagnóstico de partida (2026-10-28)

Lo que hay hoy y motiva el plan, para que nadie lo redescubra:

- **El motor ya calcula casi todo**, pero cada familia mete **campos sueltos** en `Accion` (~40
  campos opcionales). La UI tiene que conocer cada campo por su nombre: `HojaTirada` y
  `FilaTirada` tienen un `if` por campo; `tirar()` en `AccionesTab.tsx` orquesta los gastos.
- **Nadie guarda el origen de cada aporte** como dato: las líneas de desglose y las casillas
  llevan una etiqueta de texto. `teAfecta.ts` lo reconstruye con regex sobre etiquetas
  (`nombreDeEtiqueta`, `sinAclaracion`) y una caché de módulo (`universales`). Frágil.
- **Cálculo de reglas en la UI**:
  - `ArbolHabilidades.tsx`: `fuentesDeHabilidad`, `fuentesDeEspecialidad`, el valor base con
    `HABILIDAD_NO_ENTRENADA` / `valorFueraDeEspecialidad` (réplica de `valorEfectivo`).
  - `AccionesTab.tsx`: `aBasicas`, `variantesDePoder`, `poderPintable`, `grupoDeAumento`,
    `conDado` (qué generador va a dónde), y los `useMemo` que llaman a `accionesDeAtaque`,
    `accionesDeHerramientas`, `accionesDeFarmacos`, `accionesDeMovimiento`.
- **Rendimiento**: cada tirada se monta dos veces por render (árbol + filas sueltas para ★ y
  cabina); `prepararPoder` se llama varias veces por poder sin memo.
- **Estrella de poder compartida**: todas las variantes de un poder usan `estrella(poder.accion.id)`.
- Ya existe un esbozo de "ítem genérico": `FuenteCapa1` / `fuentesDeCapa1` (`capa1.ts`) para
  equipo, poderes y dotes, con su `MotorMetadata`. Hoy solo lo usan los tests de catálogo.
- `FichaResuelta.piezasInutilizadas` existe como hueco para el Shock (S73), vacío.

---

## 3. Fases

Orden: 0 → 1 → 1b → umbrales (tarea previa) → 2 → 3 → 4 → 5. La 6 depende de una regla pendiente; la 7 se decide al final.
Cada fase deja la app funcionando y se puede parar entre fases.

### Fase 0 — Vocabulario oficial en `motor.md` ✅ (2026-10-28)
**Tipo:** solo docs. **Quién:** subagente, revisado en la sesión principal. La fila de `traspaso.md` ya se añadió con el plan.

**Objetivo:** que `docs/motor.md` hable este idioma, sin dos vocabularios en paralelo.

**Entregable:**
- Sección nueva en `docs/motor.md` "Ítems y aportes" con la sección 1 de este plan (resumida,
  enlazando aquí para el detalle).
- La tabla "Los cinco tipos, ni uno más" pasa a seis tipos de aporte (añade Resolución y Coste,
  `narrativo` se queda como tipo de catálogo que no llega a Acciones). El título deja de decir
  "ni uno más" o se reescribe con el número nuevo; explicar por qué se amplió (tabla 1.3).
- Nota de correspondencia con `MotorMetadata.tipo` y `mecanismo`: qué valores existen hoy y qué
  falta (`resolucion`, `coste` en `TIPOS_MODIFICADOR`; eso se hace en la fase 1, no aquí).
- `docs/traspaso.md`: fila para `docs/aportes/`.

**Hecho cuando:** el usuario lo ha leído y dado por bueno.

---

### Fase 1 — Inventario de aportes ✅ (2026-10-28)
**Tipo:** docs + un cambio pequeño de tipos. **Quién:** subagente (lectura extensa).

**Objetivo:** saber, con datos, cuánto encaja en el modelo y qué se sale. Ningún cambio de
comportamiento.

**Lee antes:** sección 0, sección 1, `acciones.ts` (tipo `Accion`), `condiciones.ts` (tipo
`CondicionTirada` entero), `fichaResuelta.ts` (tipo `FichaResuelta`, `conExtrasDeFicha`),
`montaje.ts` (tipo `TiradaMontada`), `modificadores.ts` (`Modificador`, `AlcanceModificador`),
`usoPoder.ts` (`PoderPreparado`), `motor.ts`, `capa1.ts`.

**Entregable: `docs/aportes/inventario.md`** con una tabla por estructura. Una fila por campo:

| Campo | Tipo de aporte | Blanco | Entrega | Momento (si Texto) | Lo produce (función:archivo) | Lo consume en UI (componente) | Encaja / excepción / deuda |
|---|---|---|---|---|---|---|---|

Estructuras a cubrir, sin dejarse ninguna:
1. Cada campo de `Accion` (incluido lo de dentro de `ataque.modos`, `municionesEspeciales`,
   `vuelo`, `poder: DetallePoder`).
2. Cada campo de `CondicionTirada` (las tres variantes: toggle, opción, contador) y de sus
   opciones.
3. Los extras de `FichaResuelta` que llegan a una tirada: `modificadores` (por tipo de
   `Modificador`), `indiceCondiciones`, `textosTirada`, `extrasDotes.*` (permisos, bonosTramo,
   criticos, descuentos, grados, alternativas…), `ventajasFijas`, `fallosCriticos`,
   `piezasInutilizadas`, `accionesDotes`, `accionesAumentos`, `accionesEspecie`,
   `poderesDotes`, `notasFarmacos`.
4. Los campos de `TiradaMontada` y de `PoderPreparado` (lo que la UI lee para pintar).
5. `AccionDirecta`.

Además, en el mismo documento:
- **Excepciones encontradas**: lista con caso, por qué no encaja y propuesta (excepción
  declarada para la sección 1.8, o deuda a resolver en qué fase).
- **Recuento**: cuántos campos por tipo de aporte; cuántos encajan limpio.
- **Origen disponible**: para cada tipo de aporte, si hoy se puede saber de qué ítem viene sin
  parsear texto (y si no, dónde se pierde). Esto alimenta la fase 2.

**Cambio de código permitido (único):** añadir `"resolucion"` y `"coste"` a
`TIPOS_MODIFICADOR` (`motor.ts`) **sin** reclasificar ninguna `MotorMetadata` existente del
catálogo. La reclasificación de metadatos va en el informe como lista propuesta, para decidir
con el usuario.

**No toques:** ningún componente, ningún generador, ningún catálogo.

**Resultado (2026-10-28):** `docs/aportes/inventario.md`, 181 filas; de 93 aportes, 76 encajan
limpio. Decisiones del usuario sobre las excepciones: E1 → §1.5, E2 → §1.8.3, E3 → §1.6, E4 →
los umbrales serán **estados automáticos** (tarea aparte, antes de la fase 2: ver "Tarea previa a
la fase 2"). El resto (E5-E11) son deudas ya asignadas a fases en el inventario.

**Hecho cuando:** el inventario cubre las cinco estructuras, cada fila tiene las ocho columnas,
`npm test` en verde, y el usuario ha revisado la lista de excepciones (puede que añada o quite
excepciones declaradas en la sección 1.8 de este plan).

**Encargo para el subagente:**
> Lee `docs/aportes/plan.md` secciones 0, 1, 2 y "Fase 1". Haz el inventario de la fase 1 en
> `docs/aportes/inventario.md`. Solo puedes tocar ese archivo y `src/lib/rules/motor.ts`
> (añadir los dos tipos). No commitees. Devuelve: ruta del inventario, recuento por tipo, la
> lista de excepciones y la lista de reclasificaciones de `MotorMetadata` propuestas.

---

### Fase 1b — Reclasificar `MotorMetadata` al vocabulario nuevo ⬜
**Tipo:** datos de catálogo (metadato documental, sin efecto en ejecución). **Quién:** subagente.

**Objetivo:** que el catálogo use `resolucion` y `coste` donde corresponde, para que la
auditoría y los workflows (`modelar-area`, `auditoria-motor-metadata`) hablen el vocabulario
nuevo desde ya.

**Lee antes:** sección 0, 1, `docs/aportes/inventario.md` (sección de reclasificaciones
propuestas), `docs/motor.md` ("El dato: `MotorMetadata`"), `src/lib/rules/motor.ts`,
`src/lib/catalog/motor.test.ts`, la skill `auditoria-motor-metadata`
(`~/.claude/skills` o `.claude/skills` del repo).

**Pasos:**
1. Resolver primero las piezas marcadas «(sin verificar cuál)» en el inventario: leer la prosa de
   la pieza (`docs/fuente/`, `docs/sistema.md`) y el código que produce cada efecto para saber
   qué metadato corresponde a qué efecto.
2. Aplicar las reclasificaciones de la lista: cambiar `tipo` a `resolucion`/`coste`; partir en
   dos los metadatos que hoy juntan Resolución y Coste (un `MotorMetadata` por efecto, como
   exige `motor.md`). No cambiar `afecta`, `mecanismo` ni `estado` salvo que el cambio de tipo lo
   exija (y entonces, justificarlo).
3. Pasar la auditoría `auditoria-motor-metadata` sobre las piezas tocadas.

**No toques:** ningún campo del catálogo que no sea `motor`; ningún generador ni componente;
ningún test (si un test de catálogo falla, es que la reclasificación viola una regla: se para y
se informa).

**Hecho cuando:** todas las reclasificaciones propuestas aplicadas o descartadas con motivo,
ninguna «(sin verificar cuál)» pendiente, `npm test`/`lint`/`tsc` en verde sin tocar tests, y el
inventario actualizado (columna de reclasificación marcada como aplicada).

---

### Tarea previa a la fase 2 — Umbrales como estados automáticos ⬜ (fuera de este plan)
Decisión del usuario (2026-10-28, E4 del inventario): los umbrales de salud y fatiga (§7)
dejan de ser aportes sin ítem y pasan a ser **estados** («Malherido», «Fatigado»…) que se ponen
solos al pasar el umbral y se quitan al volver. Es funcionalidad nueva y toca reglas: se plantea
con el usuario como tarea propia (`docs/tareas.md`) antes de la fase 2. Cuando exista, la fase 2
no necesita el origen `"umbral"`: su origen es `"estado"`.

---

### Fase 2 — Origen en cada aporte ⬜
**Tipo:** motor + `teAfecta`. **Quién:** subagente.

**Objetivo:** que cada aporte que llega a una tirada lleve **de qué ítem viene** como dato, y
que "te afecta" lo lea en vez de reconstruirlo.

**Lee antes:** sección 0, 1, 2, el inventario (columna "Origen disponible"), `teAfecta.ts`
entero, `fichaResuelta.ts` (`conExtrasDeFicha`, `resolverFicha`), `equipo.ts`
(`consultaIndiceCondiciones`, `condicionesDeMejoras`), `montaje.ts` (`LineaDesglose`).

**Diseño propuesto (a confirmar en el planteamiento):**
- Tipo nuevo en `lib/rules`: `OrigenAporte = { tipo: "equipo" | "aumento" | "poder" | "dote" |
  "especie" | "farmaco" | "estado" | "accion"; id: string; label: string;
  instanciaId?: string }`. `"accion"` = lo trae la propia tirada de catálogo (no es de ningún
  ítem). Los umbrales de heridas/fatiga son estados automáticos (tarea previa), con origen
  `"estado"`.
- Campo **opcional** `origen?: OrigenAporte` en: `ModificadorConFuente`, `CondicionTirada`,
  `TextoEnTirada`, los extras de `extrasDotes`/`ventajasFijas`/`fallosCriticos`, y en las líneas
  de desglose (`LineaDesglose`) y notas de `TiradaMontada`.
- Se rellena **en el sitio donde nace el aporte** (el generador que ya sabe de qué pieza es),
  no después.
- Función nueva en motor, `aportesDeTirada(ficha, accion, montada)`: devuelve la lista de
  aportes de esa tirada `{ tipo, origen, etiqueta }`, sin números duplicados. Sustituye la
  lógica de `teAfecta.ts` (que pasa a ser un `map` o desaparece).

**Pasos:**
1. **Caracterización primero**: test que fija la salida actual de `teAfecta` para un conjunto
   de fichas representativas (al menos: arma de fuego con mejoras y munición especial, melee
   con Sutil, dote con casilla de especialidad, Cazador Cazado, aumento con casilla por
   escena, especie con texto, poder con tirada, fármaco). Se commitea antes del cambio.
2. Añadir `origen` en los productores, familia a familia.
3. `aportesDeTirada` en motor + sus tests. El test de caracterización tiene que seguir en verde
   (mismos nombres; si alguno cambia, justificarlo en el informe: puede ser un bug del regex).
4. `teAfecta.ts` deja de importar `equipoPorId`, `resolverFicha`, `defaultSheet`, `ACCIONES`,
   `alcanzaA`; sin regex, sin caché de módulo.
5. ESLint: prohibir en `src/app`/`src/components` lo que `teAfecta` dejó de usar
   (`alcanzaA`, `especialidadesDeTirada` si ya no hace falta en UI).

**No toques:** totales, desgloses (salvo añadir `origen`), la forma de `Sheet`, componentes
salvo `teAfecta.ts` y `ArbolHabilidades.tsx` (si cambia la firma).

**Hecho cuando:** "te afecta" sale igual en el navegador para las fichas de prueba, sin regex,
`npm test`/`lint` en verde, y los `origen` cubren todos los tipos de aporte del inventario
(los que no, listados en el informe con motivo).

---

### Fase 3 — El árbol lo monta el motor ⬜
**Tipo:** motor + UI. **Quién:** subagente. **La más grande: puede partirse en 3a (motor) y 3b
(UI) con revisión entre medias.**

**Objetivo:** una función del motor devuelve la pestaña entera ya clasificada; la UI solo pinta.
Desaparece todo el cálculo de reglas de `AccionesTab.tsx` y `ArbolHabilidades.tsx`.

**Lee antes:** sección 0, 1, 2, el inventario, `AccionesTab.tsx` entero, `ArbolHabilidades.tsx`,
`BarraSalvaciones.tsx`, `poderes.ts` (`accionesDePsionica`), `usoPoder.ts` (`prepararPoder`),
`combate.ts` (`accionesDeAtaque`, `accionesDirectasDeAtaque`), `herramientas.ts`, `farmacos.ts`,
`movimiento.ts`, `aumentosAcciones.ts`, `dotesAcciones.ts`, `habilidades.ts` (`valorEfectivo`).

**Diseño propuesto (a confirmar):** `src/lib/rules/arbolAcciones.ts`, exportado desde
`@/lib/rules`:
```ts
arbolDeAcciones(ficha: FichaResuelta, opciones: { conReparaFabrica: boolean }): ArbolAcciones

type ArbolAcciones = {
  barra: { salvaciones: HojaTirada[]; libre: HojaLibre };
  ramas: RamaHabilidad[];          // las HABILIDADES en su orden, todas aunque estén vacías
  sinDado: GrupoSinDado[];         // en el orden de GRUPOS_SIN_DADO, vacíos fuera
  porId: ReadonlyMap<string, Hoja>; // para ★ y cabina: una hoja por id de favorita
};
type RamaHabilidad = {
  habilidad: HabilidadId; total: number; desglose: LineaDesglose[]; entrenada: boolean;
  directas: Hoja[];                // sin especialidad de esta habilidad
  especialidades: RamaEspecialidad[];
};
type RamaEspecialidad = {
  especialidad: EspecialidadId; total: number; desglose: LineaDesglose[];
  estado: "tiene" | "mitad" | "sinEntrenar";
  hojas: Hoja[]; generica: HojaGenerica;
};
type Hoja =
  | { tipo: "tirada"; id: string; accion: Accion; montada: TiradaMontada; origen: OrigenAporte; aportes: Aporte[] }
  | { tipo: "poder"; id: string; poder: PoderDisponible; preparado: PoderPreparado; variante: string | null; ... }
  | { tipo: "reparaFabrica"; id: string }
  | { tipo: "directa"; id: string; accion: AccionDirecta; ... }
  | { tipo: "info"; ... };
```
Devuelve **datos**, nunca `ReactNode` ni callbacks. La UI pone los `onClick`.

**Lo que se muda al motor** (con sus tests):
- Generadores por familia y su reparto (`conDado`, `aBasicas`, `grupoDeAumento`,
  `GRUPOS_BASICOS`, `GRUPOS_SIN_DADO`, títulos de secciones sueltas).
- Visibilidad de poderes (`poderPintable`) y `variantesDePoder` (anclajes de poder).
- Totales y desgloses de habilidad y especialidad, **usando `valorEfectivo`** y los
  modificadores, no una réplica.
- `aplicadoHabitual` (aplicado inicial de la genérica).
- Preselección de Sutil (hoy en `HojaTirada`/`FilaTirada`: "el aplicado que dé más").

**Lo que se queda en la UI:** estado de plegado, pestaña elegida, interruptores de
Sutil/alternativa/especialidad elegida (la elección del jugador), modales, `tirar()`.

**Pasos:**
1. **Caracterización**: test que, para las fichas de prueba de la fase 2 más un NPC, fija qué
   hojas salen, dónde cuelgan, con qué total, y qué ids de favorita existen. Se monta
   replicando el reparto actual de `AccionesTab.tsx` (citando líneas, como
   `montaje-caracterizacion.test.ts`).
2. `arbolDeAcciones` + tests; la caracterización en verde.
3. UI: `AccionesTab` llama una vez (`useMemo` por `ficha`) y pinta. Las filas de ★ y cabina se
   sacan de `porId`, no de un segundo montaje.
4. **Ids**: todas las hojas conservan el id de favorita de hoy. Las variantes de un poder
   **comparten ★** (decisión del usuario, 2026-10-28): todas usan `poder.accion.id`; en
   Favoritas el poder sale una vez y la variante se elige al usarlo.
5. ESLint: prohibir en UI `valorFueraDeEspecialidad`, `HABILIDAD_NO_ENTRENADA`,
   `HABILIDAD_MIN_ENTRENADA`, `especialidadesDe`, `esEspecialidadDe`, `prepararPoder` fuera de
   `usoPoder`, generadores `accionesDe*`.
6. Navegador: ficha de jugador (móvil y cabina), NPC, combate del máster.

**No toques:** `montarTirada`, `tirarMontada`, `prepararPoder`, `conExtrasDeFicha` (se llaman,
no se cambian), el diseño visual de la pestaña.

**Hecho cuando:** `AccionesTab.tsx` no importa ningún generador ni calcula ningún total;
`ArbolHabilidades.tsx` no calcula ningún valor; mismas hojas en los mismos sitios con los
mismos números en las cuatro pantallas consumidoras; las ★ guardadas siguen marcadas.

**Decisiones del usuario (2026-10-28) que entran en esta fase** — son lo único que añade algo
visible; ningún número existente cambia:
- **Exploración siempre en el árbol**: Rastreo, Subsistencia, Trato con animales e
  Investigación se pintan en su especialidad aunque la ficha no la tenga (a la mitad).
  `tiradaFijaVisible` (S99) sigue mandando para ★ y cabina. Actualizar el texto de S99 en
  `docs/sistema.md` para que diga dónde aplica.
- **Genérica por habilidad**: una hoja "Tirar <Habilidad>" en el nodo de cada habilidad, con
  selector de aplicado, la habilidad entera (§3: no nombra especialidad) y grupo `Libre`, como
  la genérica de especialidad. Con ella, la Libre de la barra queda para atributo a secas.

**Cierra las tres casillas abiertas** de "Acciones por habilidad" en `docs/tareas.md`: valores
calculados por la pantalla, genérica por habilidad y Exploración oculta en el árbol.

---

### Fase 4 — Texto: momento antes / después ⬜
**Tipo:** motor + UI. **Quién:** subagente.

**Objetivo:** cada texto declara su momento y su condición de grado; la hoja enseña los de
"antes", el resultado enseña **todos**.

**Lee antes:** sección 0, 1.6, el inventario (filas de tipo Texto), `ResultadoTirada.tsx`,
`AccionModal.tsx`, `textosTirada.ts`, `fichaResuelta.ts` (`conTextosEnTirada`).

**Pasos:**
1. **Planteamiento con el usuario**: clasificar cada campo de texto del inventario en
   antes / después / ambos con un criterio único ("¿informa una decisión antes de tirar?").
   Propuesta de partida: `nota` → ambos; `efectoCritico`/`efectoCriticoNatural` → después;
   `efectos` (para otra tirada o un tercero) → después; casillas `nota` → antes;
   `textosTirada` → según destino.
2. Tipo `TextoDeTirada = { texto: string; origen: OrigenAporte; momento: "antes" | "despues" |
   "ambos"; grado?: "exito" | "critico" | "criticoNatural" | "fallo" }` y función del motor que
   da los de una tirada montada y los de un resultado.
3. `ResultadoTirada` pinta un bloque "Todo lo que aplica" con todos, agrupados por origen.
4. La hoja pinta solo "antes" y "ambos".

**No toques:** el contenido de los textos (copy), las reglas.

**Hecho cuando:** ningún texto se pierde (test: la unión de antes+después de cada tirada del
conjunto de caracterización contiene todos los textos de hoy), y el resultado los enseña juntos.

---

### Fase 5 — Hoja genérica por tipo de aporte ⬜
**Tipo:** UI (+ vista en motor). **Quién:** subagente.

**Objetivo:** una hoja pinta por **tipo de aporte**, no por campo. Añadir un campo nuevo a
`Accion` no obliga a tocar componentes.

**Diseño propuesto:** el motor da, por hoja, `aportes: Aporte[]` (de la fase 2) con
`tipo` y lo necesario para pintarlo:
- Ajuste → línea del `Desglose` (ya existe).
- Resolución → chip (activo/inactivo si es elección del jugador; fijo si no).
- Coste → precio junto al botón ("1 fatiga", "3 balas"). Aprobado por el usuario (2026-10-28).
- Texto (antes) → línea bajo la hoja.
- Habilitador → estado de la hoja (`activa | bloqueada (motivo) | oculta`).

`HojaTirada`, `FilaTirada` y `HojaPoder` convergen en un componente por tipo de aporte.
`tirar()` aplica los Costes recorriendo los aportes de tipo Coste en vez de mirar
`recursoInstanciaId`/`farmacoId`/`costeFatiga`/`usosEscena` uno a uno (la lógica de cada gasto
sigue en el motor: `gastoTotal`, `gastoMunicionEspecial`…).

**Hecho cuando:** `HojaTirada` no lee ningún campo suelto de `Accion` salvo `id`/`label`;
añadir un aporte de un tipo existente no toca UI. Mismo aspecto visual salvo el precio del
Coste, que es nuevo.

---

### Fase 6 — Habilitador a nivel de aporte y Shock ⬜ (bloqueada por S73)
**Tipo:** motor. **Quién:** subagente, cuando Murillo confirme S73.

**Objetivo:** un habilitador puede apagar una hoja **o los aportes de un ítem**. El Shock (y
cualquier "pieza averiada") rellena `FichaResuelta.piezasInutilizadas` y los aportes de esas
piezas no entran en `montarTirada`.

**Pasos:**
1. Unificar `Accion.bloqueada`, `PoderDisponible.bloqueo`, `soloConEspecialidad`
   (`tiradaFijaVisible`) y los permisos de dote en un `habilitacion: { estado: "activa" |
   "bloqueada" | "oculta"; motivo?: string; arbitraje: Arbitraje }` que da el motor.
2. Filtrado por `piezasInutilizadas` en `resolverFicha`/`conExtrasDeFicha` usando `origen`
   (fase 2): por eso va después.
3. La UI decide solo la presentación según `arbitraje` (ocultar/atenuar/avisar).

**Hecho cuando:** con una pieza marcada inutilizada en un test, ninguno de sus aportes llega a
ninguna tirada y el desglose lo explica.

---

### Fase 7 — Normalizar `Accion` (opcional, decidir al cerrar la 5) ⬜
Sustituir los campos sueltos de `Accion` por `aportes: Aporte[]` en los generadores. Es la fase
cara y la que más toca; solo merece la pena si las fases 2-5 dejan claro que la vista derivada
no basta. Se decide con datos del inventario y de la fase 5, no ahora.

---

## 4. Riesgos conocidos
- **Fase 3 es grande**: partirla (3a motor con caracterización, 3b UI) si el diff pasa de
  ~800 líneas.
- **El NPC y el combate** usan `AccionesTab` con props distintas (sin reparar/fabricar, sin
  favoritas, sheet congelado): probarlos en cada fase de UI, no solo la ficha.
- **`MotorMetadata` vs aportes en ejecución**: `MotorMetadata` es el contrato del catálogo
  (documental, auditado por la skill `auditoria-motor-metadata`); los aportes son lo que
  produce el motor en ejecución. No fusionarlos en este plan: que hablen el mismo vocabulario
  (fases 0-1) basta.
