# Propuesta: implementar los aumentos

- **Fuente literal:** `docs/aumentos.md` (26 operaciones genéticas y 11 implantes; 5 implantes
  en proceso que no se tocan).
- **Modelado:** `docs/modelado-aumentos.md` + `.json`, con las respuestas del usuario aplicadas
  (2026-10-22).
- **Reglas:** `docs/sistema.md` §11 (§11.3: decisiones del cuestionario, segunda y tercera
  ronda). Si algo de aquí choca con sistema.md, gana sistema.md.
- **Sin código.** Cada tanda se plantea, recibe luz verde y se construye con el ciclo de
  siempre: subagente que construye sin commit → revisión → navegador → commit.

> **Seguimiento en `docs/tareas.md`, sección "Aumentos".** Este documento explica el qué y
> el porqué. Al cerrar una tanda se marca allí en el momento. Si algo cambia al construir,
> se actualiza también aquí.

---

## 0. Resumen

- **Qué hay que construir:** 32 piezas (26 operaciones y 6 implantes con 1-4 niveles), unos
  430 efectos. El 97 % ya tiene destino en el modelo.
- **Cómo entran (§11.3):** son una **familia de equipo** con chip propio. Se compran en la
  Tienda, en una lista que junta operaciones e implantes, y se equipan y desequipan como
  cualquier pieza. Lo único que se guarda es la pieza; todo lo demás se recalcula.
- **Orden:** primero que se puedan comprar (A0); luego lo que más rinde, el +1 a atributos
  (A1); después las tiradas, los penalizadores y las acciones (A2-A4); al final las capas que
  solo sirven a una o dos piezas (A5-A7).
- **Fuera de esta propuesta:**
  - sobreesfuerzo del IRM y `habilita_psionica` (tarea de psiónica biológica);
  - extracción de implantes (falta la regla);
  - Shock S73, que inutiliza implantes;
  - penalizadores por carga (Matriz Ósea);
  - los 5 implantes en proceso.

---

## 1. Lo que ya existe y se aprovecha

| Pieza del motor | Dónde | Para qué sirve aquí |
|---|---|---|
| `OrigenModificador` ya incluye `"aumento"` | `rules/modificadores.ts` | Desglose "de dónde sale cada número" sin tocar el tipo |
| Modificador `atributo` + `atributosEfectivos` | `rules/derivados.ts` | +1 a básicos (A1) |
| `valoresDeRequisito` + hueco `psionicaPorImplante` | `rules/dotes.ts` | Requisitos de dote con aumentos (A1). El hueco del IRM se queda como está |
| `AjusteUmbrales` (hoy solo especie) | `rules/estados.ts` | Reducir penalizadores por heridas y fatiga (A3) |
| `CondicionTirada` (casillas con `ventaja` y `costeFatiga`) | `rules/condiciones.ts` | Bonos condicionales y ventajas pagando fatiga (A2) |
| Acciones de dote (`dotesAcciones.ts`) | `rules/` | Plantilla para las acciones propias de los aumentos (A4) |
| `EstadoActivo` con rondas o escena | `rules/estados.ts` | Activables (A5) |
| "Terminar escena" en Recursos | `RecursosTab`, `vidaPorEstados.ts` | Limpiar la casilla "usado esta escena" (A4) |
| `bolsaAumentos` en la especie | `catalog/especies.ts`, `fichaResuelta.ts` | Se gasta en A0 (y sube a 70.000) |

---

## 2. Tandas

### A0 · Catálogo, Tienda y ficha (sin efectos de reglas)

**Qué hace**
- `catalog/aumentos.ts` con las 32 piezas: rareza, coste, requisitos, niveles, variantes,
  elección y los textos de la ficha.
- Dos familias nuevas en el `Equipo`: `operacionGenetica` e `implante`.
- `PiezaEquipada` gana `eleccion?` (el sentido de Introgresión o el modelo del Brazo). Sube
  `SCHEMA_VERSION` con su paso en `migraciones.ts`.
- **Tienda:**
  - chip "Aumentos", con operaciones e implantes en la misma lista;
  - las operaciones que no cumplen requisitos salen bloqueadas y dicen qué falta;
  - los implantes se compran en cualquier nivel, y subir de nivel cobra la diferencia;
  - el Brazo pide el modelo al comprarlo; Introgresión pide el sentido y se puede volver a
    comprar con otro.
- **Bolsa del humano:** sube a **70.000** (con sus textos y tests) y se gasta primero; lo
  que falte sale de los créditos. También pueden gastarla las fichas ya aprobadas.
- **Ficha (Equipo):** chip "Aumentos" con la pieza, el nivel y los textos. Los implantes
  llevan las marcas "sabotaje" y "electrónico (Shock)". Desequipar una operación que otra
  pide marca esa otra como "requisito roto", igual que con las dotes.

**Piezas que estrenan algo:** ninguna da números todavía. Solo se ven y se pagan.

**Tests:** precio al subir de nivel, requisitos encadenados, compra repetida de
Introgresión, orden de la bolsa y migración.

**Construido (2026-10-22, sin commit):** como arriba, con estos matices:
- La ficha guarda `bolsaAumentosGastada` (v18); el saldo se recalcula.
- La letra de Recursos topa la rareza de los aumentos en creación, como al resto del equipo
  (supuesto, `TODO(revisar)` en `comprarAumentoAction`).
- El NPC compra aumentos sin coste pero con requisitos (`TODO(revisar)`: las dotes del NPC
  no los piden).
- Brazo de 3 a 4: se elige cualquier modelo del nivel 4 (`TODO(revisar)`).
- Los efectos "hueco" del modelado llevan en `motor` el mecanismo más cercano por tipo,
  marcado `TODO(revisar)` en la cabecera de `catalog/aumentos.ts`.

### A1 · Atributos y derivados (`atributo_por_pieza`)

**Decidido (usuario, 2026-10-22):** las rebajas de coste de habilidad solo valen con la
ficha aprobada, al subir con XP. En creación (point-buy, que se recalcula entero) no cuentan.

**Qué hace**
- Cada aumento emite su `Modificador` `atributo` con origen `"aumento"`.
- **Sin techo (R7):** los puntos de los aumentos van aparte, como los de la especie (S7). El
  4 de creación y el 6 de techo solo miran lo comprado.
- **Requisitos de dote:** `valoresDeRequisito` suma los aumentos **permanentes**. El +1 de
  un activable no cuenta (R3).
- **Rebajas de coste de habilidad** (Neurogénesis y Engramática): se suman, con un mínimo de
  1, y valen para lo que se compre después de tener la operación.
- **Hipertrofia:** vida = 8 + Fortaleza × 1,5, redondeado hacia abajo; con Fortaleza negativa
  no se multiplica. Se reconcilia la vida al equipar y al desequipar.

**Piezas:** 21 operaciones se quedan casi enteras (ver §3).

**Tests:** un atributo por encima de 6 con aumentos, un requisito de dote cumplido por un
aumento, coste de habilidad con las dos rebajas y la vida de Hipertrofia.

**Construido (2026-10-22, sin commit):** como arriba, con estos matices:
- Los aumentos salen de `modificadoresDeEquipo` y van por `modificadoresDeAumentos`
  (origen `"aumento"`). Los implantes acumulan niveles como el equipo; hoy ninguno da
  modificadores permanentes (los de Neuroprótesis son activables, A5).
- El estado de la ficha llega a `resolverFicha` con `OpcionesFicha.aprobada`. La ficha
  tiene dos ajustes: `ajusteCoste` (especie, para el point-buy) y `ajusteCosteSubida`
  (con las rebajas si está aprobada, para el "+"). El servidor, igual: `ajuste` y `ajusteXp`.
- `AjusteHabilidad.delta` pasa a número: casta y aumentos se suman en un solo delta y la
  pista dice "−2 aumentos" o "−3 casta y aumentos".
- Hipertrofia: Modificador `multiplicadorVida` (`valor` = factor). Si un día hay dos,
  cuenta el mayor (`TODO(revisar)` en `factorVida`).
- `retirarPieza` (desequipar + `reconciliarVida`) en la ficha, su server action y la del
  NPC: quitar Hipertrofia o un +1 recorta la vida actual al nuevo máximo.
- Una operación con requisito roto no da efectos, en cadena, como una dote (usuario, 2026-10-22: `operacionesActivas`).

### A2 · Tiradas: bonos, ventajas y casillas

**Partida en dos pasadas (usuario, 2026-10-22):**
- **A2a:** canal de casillas de aumentos; salvaciones con un selector **"¿Contra qué?"** por
  salvación (decisión del usuario) que suma todo lo que aplica a esa amenaza; `noApila` del
  Ojo con miras y gafas; Alerta pasiva; armadura natural +1 contra Cinético.
- **A2b:** alcance `aplicado:<a>`, casillas de ventaja con fatiga de la rama cognitiva,
  Foveo tras Apuntar, ventaja fija en Iniciativa, Proyección/Matriz y textos de tirada.
- **Decidido para A2b (usuario, 2026-10-22):** el alcance `aplicado:<a>` mira el aplicado
  con el que se tira de verdad (tras casillas como Negociación Analítica); con Conectividad
  Callosa equipada y activa, la casilla de Prefrontal se oculta (Callosa es su progresión).
  Mielinización entra como casilla "Ahorro" (−1 al coste de fatiga de la tirada, mínimo 0).

**A2a construido (2026-10-22, sin commit):** como arriba, con estos matices:
- El canal es `rules/aumentosTiradas.ts`: las casillas y los selectores van al mismo índice
  que las de equipo, especie y dotes, y los textos a `textosTirada`.
- **Biogénesis sola:** dos opciones por amenaza, sin pagar y "pagando fatiga", porque pagar
  es opcional. Con Resiliencia, una sola opción con ventaja gratis.
- **Amenazas que coinciden:** dominación, sugestión y alteración de la voluntad cuentan
  también como manipulación mental (Regulación +1 y Matriz +2 = +3). Supuesto,
  `TODO(revisar)`.
- **Shock** sale como amenaza propia de Fortaleza (Estabilización: aturdimiento y shock).
- **Ceguera por detonación** es una opción aparte que suma lo de ceguera más la visión
  nocturna de Introgresión.
- **Ultravioleta** (+2 buscando accesos ocultos) entró también como casilla de Buscar/percibir.
  Su +2 a investigación de campo espera un alcance por especialidad.
- **`noApila`:** hoy solo la Mira Telescópica comparte grupo con el Ojo. Los visores no dan
  bono numérico. La mira integrada de los fusiles de precisión no compite
  (`TODO(revisar)`).
- **Pendiente para otras tandas:** los textos de alcance de visión del Ojo (nocturna 500 m,
  rayos X) en Buscar/percibir; el +3 del Visor Nocturno 2 contra ceguera por destello, que
  ya podría ir con Fortaleza (R11), pero es equipo.

**A2b construido (2026-10-22, sin commit):** como arriba, con estos matices:
- **Aplicado de verdad:** las casillas por aplicado se recogen antes de abrir la tirada con
  los aplicados *posibles* (el suyo, el de Sutil y el de cualquier casilla que lo cambie,
  también las que llegan del índice, como Negociación Analítica). `montarTirada` sabe ya el
  de verdad y deja las que no casan en el modal, sin efecto y con el motivo
  (`casillasSinEfecto`): se ven, pero no suman, no dan ventaja y no cobran.
- **Poderes:** `prepararPoder` recibe `indiceCondiciones` y consulta el índice como
  `conExtrasDeFicha`; así llegan Prefrontal, Mielinización o Callosa a la tirada del poder.
- **Ahorro de Mielinización:** campo `ahorroFatiga` en el toggle. `costeFatiga` sale neto
  (mínimo 0) y lo que no se gasta en casillas (`ahorroSinUsar`) se resta del coste del poder
  en `usarPoder`.
- **Prefrontal con Callosa:** `casillasOcultasCon` en la operación. Callosa solo pide
  Prefrontal, así que "Callosa con requisito roto y Prefrontal funcionando" no puede darse.
- **Ventaja fija** (Red Frontoparietal): `FichaResuelta.ventajasFijas`, que pone
  `conExtrasDeFicha`; si la tirada ya trae ventaja, manda la suya.
- **Textos:** `DestinoTexto` admite grupo y aplicado. Asa va como texto (la app no lleva el
  tipo de acción), no como casilla. La acción combinada de Red Frontoparietal va como texto
  en las pruebas mentales hasta A4.
- **Pendiente de decidir:** una casilla de ventaja de pago cobra aunque la tirada ya tenga
  ventaja gratis (Red Frontoparietal en Iniciativa + Callosa); `TODO(revisar)` en
  `montaje.ts`.
- **Foveo:** no existe la acción Apuntar (Gran Puntería tampoco la tiene): casilla
  "Tras Apuntar" en el ataque, sin engancharla a ninguna dote.
- **Fuera de A2b, aunque la tabla de §3 las ponga en A2:** la ventaja de equilibrio de
  Bucle y la segunda reacción de Hiperdensidad (reacciones, A4).

**Qué hace**
- **Alcance nuevo `aplicado:<a>`** (Mielinización, Neurogénesis, Prefrontal, Asa y
  Sincronización con `aplicado:potencia`). Vale para cualquier tirada que use ese aplicado,
  salvaciones y poderes incluidos (R9).
- **Casillas con ventaja y coste de fatiga:**
  - Prefrontal, Asa y Conectividad; las dos vías de Conectividad cuestan 1 de fatiga.
  - Consciencia (esquiva).
  - Biogénesis y Resiliencia (salvaciones de Fortaleza).
  - Sincronización (Potencia).
  - Foveo, solo tras Apuntar.
- **Bonos a salvaciones:**
  - con **Fortaleza**: ceguera, sordera, aturdimiento, asfixia, toxinas, venenos y
    enfermedad;
  - con **Voluntad**: confusión, miedo, coerción e intimidación;
  - Regulación (+1) y Matriz de Red (+2) se suman.
- **Ventaja fija:** Red Frontoparietal en Iniciativa.
- **No apilamiento (`noApila`):** el Ojo con miras y gafas de visión aumentada; cuenta solo
  el mayor.
- **Alerta pasiva:** suben el Ojo y la Detección Química. La parte auditiva solo vale al
  buscar.
- **Armadura natural:** Osteotendinosa y Matriz Ósea dan +1 contra Cinético cada una, con
  una nota de a qué golpes vale.
- **Textos de tirada:** exclusiones (Asa, Callosa y Prefrontal), flanqueo de Consciencia y
  Sorprendido de Automatismo.

**Tests:** el alcance por aplicado (también en salvaciones), una ventaja que cobra fatiga,
`noApila` y la Alerta pasiva.

### A3 · Penalizadores (`reduce_penalizador_por_pieza`)

**Decidido (usuario, 2026-10-22):** Neurogénesis como compensación automática de +1 en las
pruebas mentales solo si hay penalizador por fatiga (nunca pasa de 0); la cobertura como
casillas que suman +1/+2 para compensar lo que el jugador resta a mano en el circunstancial
(no se modela la cobertura como selector), sin apilar (vale la mayor).

**Qué hace**
- `AjusteUmbrales` deja de depender solo de la especie: suma especie + aumentos (R8). Cada
  reducción baja el penalizador en 1.
  - Estabilización Autonómica: heridas y fatiga.
  - Neurogénesis: fatiga, solo en su aplicado.
  - Neuroprótesis 1: todos, mientras está activa (llega con A5).
- **Cobertura** con casilla en la tirada:
  - Foveo y Ojo 1-3: −1 a la cobertura visual (−2 en Ojo 2+).
  - Ojo 4: −2 a cualquier cobertura.
  - La cobertura total no se reduce.
- **Proyección:** anula cualquier penalizador social (llega con A5).

**Tests:** especie + dos aumentos sobre el mismo tramo, alcance por aplicado y cobertura
total intacta.

**Construido (A3, matices):**
- El ajuste de umbrales es un valor sumado por recurso con fuente combinada, no una lista de
  fuentes. Neurogénesis no entra en él: va como compensación aparte (+1 con alcance
  `aplicado`) detrás del penalizador de fatiga, para tener su línea y casar con el aplicado
  efectivo.
- Cobertura: el Ojo 2 trae −1 a la visual (el modelado lo pone ahí; el nivel 1 no la trae) y el
  3 la hereda; "−2 en Ojo 2+" de arriba era impreciso. La cobertura total no se modela: lo
  dice la nota de la casilla.
- Matriz Ósea, solo nota en la carga (Personaje → Estado).

### A4 · Acciones propias y "una vez por escena"

**Decidido (usuario, 2026-10-22):** se parte en dos pasadas. **A4a** (luz verde): el contador
por escena y las acciones sin dado. **A4b** (pendiente de plantear): Barrido
electromagnético, Tempestad Nanobótica, Densificar (casilla en "Bloquear daño", +3 de
blindaje por 1 de fatiga) e Incorporar arma (solo la tirada; el vínculo va en A6).
- **Uso por escena:** `sheet.usosEscena` (ficha v19). Se gasta al tirar con la casilla
  marcada, no al marcarla. La casilla gastada queda bloqueada hasta "Terminar escena". En
  Recursos, junto a "Terminar escena", sale la lista de lo usado con un botón "liberar" para
  los errores.
- **Terminar escena del máster** (Mesa y combate) vacía también `usosEscena` en las fichas
  en juego. Deshacer no devuelve los usos.
- **Quitar estados:** Cortar hemorragia, Eliminar exanguinante, Sacudir miedo y Dominar
  terror cobran la fatiga. Si la ficha tiene el estado (`Character.estados`), lo quitan
  (Dominar terror: de Aterrorizado a Asustado), con una entrada en el registro que el máster
  puede deshacer. Es una excepción de permiso acotada a esto. La exanguinante no es un estado
  del catálogo: solo cobra, con una nota. *(Corrección: el planteamiento decía que la ficha
  no guardaba estados, y era falso.)*
- **Sanar letal** (Enjambre): cobra 1 de fatiga y sube 1 la vida actual, sin pasar del
  máximo. El límite de 1 por ronda queda como texto.
- **Sanar grave:** cada pulsación cobra 1 de fatiga. La nota dice "5 turnos seguidos; al
  quinto, +1 de vida", y esa vida la sube el jugador a mano.
- **Acción combinada:** un botón que cobra 1 de fatiga y sustituye al texto de A2b en las
  pruebas mentales.
- **Defensa del MQE:** una fila informativa en la sección "Aumentos" de Acciones.

**Qué hace**
- Acciones de aumento con la misma plantilla que las de dote:
  - **Sin dado:** Acción combinada, Cortar hemorragia y exanguinante (gratuitas), Eliminar
    exanguinante, Sacudir miedo y Dominar terror, Mensaje y Telemetría del MQE, Sanar letal
    del Enjambre (gratuita, 1 por ronda), Sanar grave y Densificar.
  - **Tirada o ataque:** Barrido electromagnético (ampliar a 30 m no pide tirada; encontrar
    y distinguir, sí), Incorporar arma al brazo (dificultad 8) y Tempestad Nanobótica
    (dificultad 0).
- **Casilla "usado esta escena"** (R1): un contador en la ficha que se limpia con "Terminar
  escena". La usan Mielinización (su descuento de 1 de fatiga), Proyección y Matriz de Red.
  Lo de "hasta un descanso" queda como texto.
- **MQE:** la defensa contra intrusión, como texto en la ficha con la dificultad y el
  contragolpe del nivel. El intruso tira lo que proceda por Resonancia; la app no tira por
  él.

**Tests:** que el coste de fatiga se cobre, que el límite por ronda y por escena funcione y
que la casilla se reinicie con "Terminar escena".

**Construido (A4a, matices):**
- **Uso por escena:** el id del uso es el de la casilla (`usoPorEscena` en el toggle).
  `montarTirada` devuelve `usosEscena`; la pestaña Acciones los apunta al tirar, junto al cobro
  de fatiga de las casillas (`gastarUsosEscenaAction`). Además de la casilla sin efecto por el
  aplicado, **el ahorro de Mielinización no gasta si no ha ahorrado nada** (sin casillas de
  pago y fuera de un poder). La casilla gastada lleva `bloqueada` (la pone `conUsosEscena` al
  montar el índice, así llega también a los poderes) y `montarTirada` la trata como
  desmarcada. En un NPC no se gasta nada (no hay ficha que guardar).
- **Recursos:** tarjeta "Usado esta escena" con "Liberar" por entrada y su propio "Terminar
  escena" (el de la fatiga temporal solo sale con Traslación o fatiga temporal).
- **Terminar escena del máster:** `limpiarEstadosDeJugadores` vacía también los usos, aunque
  la ficha no tenga estados (esas no cuentan en "personajes" del resultado, pero se
  revalidan). Reescribe `stats`, así que puede pisar un autosave del jugador que entre a la vez
  (`TODO(revisar)`; ya pasaba al restar vida).
- **Acciones:** `rules/aumentosAcciones.ts`; datos en el catálogo (`acciones` en la operación o
  en el nivel del implante, `defensaIntrusion` en los niveles del MQE). El Mensaje del MQE
  cambia de nota con el nivel (alcance y capacidad). Sin fatiga suficiente, la acción sale
  bloqueada y el servidor la rechaza (no se paga a medias).
- **Servidor:** `usarAccionAumentoAction` valida que la ficha tiene la acción
  (`usoDeAccionAumento`), cobra, suma la vida (Sanar letal) y, si toca, cambia el estado con
  `cambiarEstadosDePersonajes` (registro `estado_quitar`/`estado_poner` con el jugador de autor y
  el motivo "<acción> (<pieza>), desde la ficha"). El cobro y el estado van en una sola
  transacción (`preparar` de `cambiarEstadosDePersonajes`; usuario, 2026-10-22). El mensaje de lo que ha pasado sale encima de la sección.
- **Eliminar exanguinante:** el texto no dice el tipo de acción: gratuita, como cortar
  (usuario, 2026-10-22; a la lista de Murillo, §5).
- **Enjambre:** "sin penalizadores por fatiga" es solo de la regeneración pasiva; las dos
  acciones no lo piden.

**Decidido A4b (usuario, 2026-10-22):** las cuatro recomendadas.
- **Barrido electromagnético:** "Ampliar a 30 m" (sin tirada ni coste, acción compleja),
  "Ampliar a 60 m" (1 de fatiga) y "Encontrar o distinguir" (Perspicacia + Exploración, la
  dificultad la elige el máster). Las tres van **juntas y en ese orden**, para que se vea que
  ampliar no tira y lo que se tira es la búsqueda.
- **Tempestad Nanobótica:** 1 de daño grave **fijo, sin sumar éxitos**. Ataque cuerpo a cuerpo
  de Reflejos + Tecnociencia, dificultad 0, 2 de fatiga al tirar. Quitar blindaje y sabotear
  objetos, como nota.
- **Densificar:** casilla en "Bloquear daño" (+3) que **cobra 1 de fatiga al marcarla**;
  desmarcarla sin cerrar el modal lo devuelve. Vale **donde cuenta el blindaje** (no contra el
  daño mental ni el fuego sin Ignífuga), igual que la armadura natural. El +3 contra el
  aturdimiento, como nota.
- **Incorporar arma:** Perspicacia + Biociencia a dificultad 8, con la **regla de especialidad
  de las acciones de dote**: si tienes Biónica, con la especialidad; si no, a la mitad. El
  vínculo del arma con el brazo, en A6.

**Construido (A4b, matices):**
- **Orden:** `accionesDeAumentos` devuelve `filas` (directas y tiradas, en el orden del
  catálogo) y la sección "Aumentos" las pinta así; `directas` queda para el servidor. Las
  tiradas pasan por `conExtrasDeFicha` como las de dote (les llegan las casillas con alcance).
- **Barrido:** las tres acciones van en la opción de Introgresión (`OpcionAumento.acciones`);
  la fuente es "Introgresión Sensorial Heteróloga (Percepción Electromagnética)". Las dos de
  ampliar son acciones complejas (la de 60 m también: "si además emplea…") y las cobra el
  servidor como el resto de A4a. "Encontrar o distinguir" no lleva economía propia
  (`TODO(revisar)`) ni dificultad sugerida: el modal abre en 7 y la nota dice que la pone el
  máster.
- **Tempestad:** solo en "Aumentos", no copiada en "Ataques": no es un arma, así que no le
  tocan las casillas y textos de dote por familia o empleo de arma (`TODO(revisar)` si alguna
  dote de ataque cuerpo a cuerpo debería valer). Campos nuevos en `Accion`: `costeFatiga`
  (fatiga fija al tirar; el ahorro de Mielinización la rebaja) y `ataque.sinBonoExitos`
  (`montarTirada` lo pasa a `danio.sinBonoExitos`; ninguna casilla lo devuelve). Sin 2 de
  fatiga la fila sale "no disponible" (antes la etiqueta de `Accion.bloqueada` decía "sin
  definir", y no la usaba nadie) y "Tirar otra vez" se apaga. Quitar blindaje va en
  `efectos` (aviso tras el daño).
- **Densificar:** `blindajeReactivo` en el nivel 3 del Enjambre; `casillaBlindajeReactivo` y
  `desgloseBlindaje(…, reactivo)` en `blindaje.ts`, con `blindajeNoCuenta` compartido. El
  modal cobra con `onPagarFatiga` y devuelve con `onAjustarFatiga` (nuevo, desde
  CharacterSheet y NpcEditor). Cambiar a Mental o Fuego con la casilla marcada la desmarca y
  devuelve. Cerrar el modal con ella marcada no devuelve nada. El +3 contra el aturdimiento,
  en la nota de la casilla (al circunstancial).
- **Incorporar arma:** en el nivel 1 del Brazo, así que sale en todos. Nota: "La app aún no
  guarda qué arma lleva el brazo".
- **Requisito roto:** Introgresión y los implantes no tienen requisitos, así que el caso no se
  da hoy; el camino es el mismo `operacionesActivas` de A4a.

### A5 · Activables (Neuroprótesis y Proyección)

**Qué hace**
- **`activable_estado_propio`:** un botón sin dado que cobra la fatiga y pone un
  `EstadoActivo` propio.
  - Neuroprótesis 1 dura 3 rondas; la 4 dura 1 ronda; Proyección dura hasta el final de la
    escena (R2).
  - Mientras dura, sus efectos cuentan: atributos (que no valen para requisitos, R3) y
    reducción de penalizadores.
- **Neuroprótesis:**
  - **Nivel 2:** se elige al activar si el +2 va a Fuerza o a Agilidad.
  - **Nivel 3:** la acción simple adicional solo pide que el implante no esté saboteado ni
    apagado; segunda reacción por ronda.
  - **Nivel 4:** se enciende al pagar 3 por esa acción, y su +2 sustituye al +1/+2.
- **Proyección:** se activa como acción gratuita.

**Tests:** activar y expirar por rondas, elegir al activar, que no cuente para requisitos y
la sustitución del nivel 4.

### A6 · Brazo Biónico

**Qué hace**
- **`extremidad_atributos_propios`:** casilla "con el brazo biónico" en golpes, bloqueos y
  armas de una mano (R4). Cambia Fuerza y Agilidad por las del brazo (básico + delta, con su
  tope), aunque salgan menores.
- **Bloquear con el brazo:**
  - pide **siempre la dote Bloqueo**;
  - el blindaje del brazo solo protege el golpe bloqueado (R12);
  - con el nivel 1 no se bloquea ni se hace daño letal.
- **Arma incorporada:** vínculo entre el brazo y la instancia del arma (cualquier arma a una
  mano, también de fuego). Cuenta para la carga, se desenfunda gratis y no te la pueden
  desarmar.

**Tests:** el aplicado con el brazo por debajo y por encima del propio, Bloqueo sin dote
bloqueado y el blindaje solo en el bloqueo.

### A7 · Inmunidades

**Qué hace:** `inmunidad_estado` para el Ojo 2 y 4 (ceguera) y para Regeneración
(hemorragia). La consola del máster avisa o no deja aplicar el estado. Aviso o bloqueo duro
lo decides tú al plantear la tanda.

---

## 3. Qué queda vivo tras cada tanda

| Tras | Operaciones casi completas | Implantes |
|---|---|---|
| A0 | Ninguna (solo se compran y se leen) | Ninguno |
| A1 | Engramática, Hiperdensidad, Hipertrofia, Bucle (texto) | — |
| A2 | Toda la rama cognitiva salvo Mielinización; sensorial; Carácter salvo Proyección; física; Aguante | Ojo 1-3 (sin inmunidad) |
| A3 | Neurogénesis, Estabilización Autonómica, Foveo | Ojo 4 |
| A4 | Mielinización, Matriz de Red, Angiogénesis, Regeneración (sin inmunidad), Introgresión | MQE, Enjambre |
| A5 | Proyección | Neuroprótesis |
| A6 | — | Brazo |
| A7 | Regeneración | Ojo completo |

El IRM sale en la Tienda desde A0, pero sin sobreesfuerzo ni psiónica hasta la tarea de
psiónica biológica.

---

## 4. Lo que hay que decidir antes de A0

**Decidido (usuario, 2026-10-22): las tres recomendadas.** Catálogo a mano con test cruzado
contra el JSON, guardado en `sheet.equipo` y sin reventa. **Corregido tras A0 (usuario,
2026-10-22):** la recomendación 3 partía de un dato falso (el equipo sí devuelve su coste).
Queda así: en creación, quitar un aumento devuelve lo pagado (bolsa a la bolsa, resto a
créditos); aprobada la ficha, nada.

1. **Cómo se escribe el catálogo:**
   - **Recomendado:** a mano en `catalog/aumentos.ts`, copiando el JSON, con un test que
     cruce ids, costes y requisitos contra `docs/modelado-aumentos.json`.
   - Alternativa: un generador como el de dotes (`gen-dotes`). Compensa si el JSON va a
     cambiar mucho (los 5 implantes en proceso), pero añade una pieza que mantener.
2. **Dónde se guardan:**
   - **Recomendado:** en `sheet.equipo`, como el resto del equipo (§11.3).
   - Alternativa: `sheet.aumentos` aparte, que separa mejor pero duplica el equipar y la
     Tienda.
3. **Precio de reventa** al desequipar o cambiar de nivel: el documento no lo dice.
   **Recomendado:** que no devuelva nada. *(Corrección al construir A0: el resto del equipo
   sí devuelve su coste íntegro al desequipar, decisión del 2026-09-10; los aumentos quedan
   como excepción, sin reventa, que es lo decidido.)*

---

## 5. Pendiente de Murillo o de otras tareas

- **Extracción de implantes:** dificultad, método, qué implantes y Biociencia o Tecnociencia
  (pregunta 20).
- **Tope de implantes:** pregunta 11.
- **Shock S73:** afecta a todos los implantes salvo el material de refuerzo, que está por
  diseñar.
- **5 implantes en proceso:** `sync-drive` cuando Murillo los cierre, y una pasada corta de
  modelado.
- **Eliminar exanguinante** (Regeneración): qué acción cuesta. La app la da por gratuita, como
  cortar la hemorragia (usuario, 2026-10-22).
- **Encontrar o distinguir** (barrido): qué acción cuesta. **Tempestad:** si le valen las dotes
  de ataque cuerpo a cuerpo (hoy no).
- **Erratas del documento:** el nivel 3 del IRM repite la frase del nivel 2, y la
  ortografía.
