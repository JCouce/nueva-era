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

### A4 · Acciones propias y "una vez por escena"

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
- **Erratas del documento:** el nivel 3 del IRM repite la frase del nivel 2, y la
  ortografía.
