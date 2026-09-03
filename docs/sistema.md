# Nueva Era — documento vivo del sistema

Este archivo es la **única fuente de verdad** para implementar la app: lo que no esté
aquí, no existe para el código.

La información llega a cuentagotas (conversaciones con el diseñador, hojas sueltas,
PDFs parciales), así que cada bloque lleva un **estado** y una **fuente**. Cuando algo
cambie, se edita aquí y se anota qué lo tumbó.

## Convención de estados

| Estado | Significado | Se puede implementar |
|---|---|---|
| `[FIRME]` | Escrito por el diseñador y sin ambigüedad | Sí |
| `[INFERIDO]` | Deducido de otro documento, no confirmado | Sí, marcando el supuesto |
| `[PROPUESTA]` | Idea nuestra a validar | No hasta confirmar |
| `[PENDIENTE]` | Título sin contenido | No |
| `[CONFLICTO]` | Dos fuentes se contradicen | No hasta resolver |

## Fuentes

| Ref | Documento | Fecha |
|---|---|---|
| `HOJA` | `docs/Creación de Personaje-1.txt` | 2026-08-26 |
| `COMBATE` | `docs/sistema-y-combate.md` (transcrito de `Sistema y Combate.pdf`) | 2026-08-28 |
| `EQUIP` | `docs/equipamiento.md` (transcrito de `Equipamiento.pdf`) | 2026-08-31 |
| `CONV-1` | Conversación con Murillo (diseñador) — aumentos, psiónica cuántica | 2026-08-26 |
| `CONV-n` | Conversaciones con el diseñador (se anotan abajo según lleguen) | — |

---

## 1. Identidad `[FIRME · HOJA]`

Campos de ficha: **Nombre**, **Edad**, **Especie**, **Trasfondo**, **Motivación**.

## 2. Atributos

### Básicos `[FIRME · HOJA]`

Fuerza · Agilidad · Aguante · Percepción · Inteligencia · Carácter.

- Se empieza con **0** en todos.
- **10 puntos** para repartir.
- Coste **lineal**: subir un atributo a N cuesta N puntos.
- Máximo **4/5** (interpretado como: 4 en creación, 5 techo del sistema — *pendiente de
  confirmar*).
- Bajar un atributo a **-1** otorga **1 punto adicional**.

### Aplicados `[FIRME · HOJA]`

Derivados, **no se compran**: son suma de dos básicos. Cada básico alimenta dos aplicados.

| Aplicado | Fórmula |
|---|---|
| Fortaleza | Fuerza + Aguante |
| Potencia | Fuerza + Agilidad |
| Reflejos | Agilidad + Percepción |
| Voluntad | Aguante + Carácter |
| Perspicacia | Inteligencia + Percepción |
| Expresión | Carácter + Inteligencia |

> **Implementación:** se guardan los 6 básicos y se calculan los 6 aplicados, igual que
> hoy el XP gastado se deriva de la ficha. Nunca se persisten los aplicados.

## 3. Habilidades `[FIRME · HOJA]`

Actitud · Atletismo · Biociencia · Combate a Distancia · Combate Melee · Cultura ·
Interpretación · Sigilo · Supervivencia · Tecnociencia.

- **10 puntos** para repartir. Máximo **3/5** (misma lectura que en atributos: 3 en
  creación, 5 techo — *pendiente de confirmar*).
- Habilidad **no entrenada = -1**.
- Al entrenar una habilidad se **escoge una especialidad**:
  - En la especialidad escogida se usa el **valor total**.
  - En el resto, **la mitad redondeando hacia arriba**.
  - Una **segunda especialidad** dentro de la misma habilidad cuesta **1 punto**.

> **Implementación:** una habilidad deja de ser un entero y pasa a ser
> `{ valor: number, especialidades: string[] }`.

### Emparejamiento atributo + habilidad `[INFERIDO · EQUIP]`

Las habilidades **no están soldadas a un atributo**. El par lo dicta
la acción, y hay equipo que altera el par por diseño (el Proyector de Pulso permite tirar
Tecnociencia en lugar de Combate a Distancia).

Pares vistos en `EQUIP`: Perspicacia + Tecnociencia · Perspicacia + Biociencia ·
Perspicacia + Medicina · Reflejos + Tecnociencia · Voluntad + Biociencia · Voluntad +
Actitud · Reflejos + Combate a Distancia.

### Catálogo de especialidades `[PARCIAL]`

Ninguna fuente lo lista, pero entre `EQUIP` y `COMBATE` ya aparecen citadas de pasada:

| Habilidad | Especialidades vistas | Dónde |
|---|---|---|
| Tecnociencia | Mecánica | `EQUIP` |
| Biociencia | Química, Bioquímica, Medicina | `EQUIP`, `COMBATE` |
| Actitud | Empatía, Manipulación, Liderazgo | `COMBATE` |
| Combate Melee | Pelea | `COMBATE` |
| ¿? | **Exploración** (ver conflicto C4), Equilibrio | `COMBATE` |

Falta el catálogo completo de las 10 habilidades.

## 4. Salud `[FIRME · HOJA]`

- **Puntos de Vida** = 8 + Fortaleza
- **Puntos de Fatiga** = 8 + Voluntad

## 5. Movimiento `[FIRME · HOJA]`

| Tipo | Fórmula |
|---|---|
| Carrera | 15 + (Potencia + Atletismo) metros |
| Salto vertical | 10 × (Potencia + Atletismo) centímetros |
| Salto horizontal | 150 + [(Potencia + Atletismo) × 60] centímetros |
| Escalada | 5 + [(Potencia + Atletismo) / 2] metros |
| Nado | 5 + [(Potencia + Atletismo) / 2] metros |

## 6. Resolución de acciones `[FIRME · COMBATE]`

Detalle completo en `docs/sistema-y-combate.md`. Lo esencial:

- **Se tira 1d12** + atributo aplicado + habilidad + modificadores.
- **Dificultad**: Muy Fácil 2 · Fácil 5 · Normal 7 · Difícil 10 · Muy Difícil 13 ·
  Legendario 16. Se iguala o supera.
- **Crítico**: superar la dificultad (o al rival) **por 6**. **Fracaso crítico**: quedarse
  a 6 o más.
- **Tiradas enfrentadas**: gana el mayor resultado; **el empate favorece al defensor**.
- **Acciones por turno**: 2 simples · 1 estándar · 1 compleja (bloquea el turno) ·
  gratuitas sin límite · 1 reacción por ronda, salvo defensivas y salvaciones.
- Un turno de combate son **6 segundos**; una ronda es el turno de todos.

### Combate `[FIRME · COMBATE]`

- **Iniciativa**: reacción gratuita al empezar el combate; la tirada depende de cómo entre
  el personaje (lo habitual, Perspicacia + Exploración). Desprevenido total = sin tirada.
- **Ataque**: por cada **2 éxitos acumulados, +1 al daño**. Con **6 éxitos** sobre el
  objetivo, el ataque es **crítico**.
- **Defensa**: reacción gratuita e **ilimitada** por ronda, pero **-1 acumulativo por cada
  atacante adicional** en esa ronda. Aunque no supere al atacante, el defensor **resta su
  resultado** al del atacante. Gastar la reacción normal del turno en defender limpia los
  penalizadores acumulados.
- **Alerta** (percepción pasiva) = **6 + Perspicacia + Exploración**. Es la dificultad
  contra la que tira el sigilo ajeno; **en empate gana alerta**.
- **Cobertura** en niveles 1-5: del 1 al 4 suma su valor a la dificultad de ataques y
  alerta visual; el 5 da cobertura total pero impide atacar. La de escudos no afecta a la
  percepción.

## 7. Salud, daño y estados `[FIRME · COMBATE]`

**Puntos de golpe = 8 + Fortaleza · Puntos de fatiga = 8 + Voluntad.** Ambos bajan y ambos
imponen penalizadores por umbral:

| Recurso | Estado | Umbral | Efecto |
|---|---|---|---|
| Golpe | Herido | <50% | -1 a todo |
| Golpe | Malherido | <25% | -3 a todo, media velocidad, -25% carga |
| Golpe | Moribundo | <10% | -5 a todo, una casilla por turno, -50% carga |
| Fatiga | Fatigado | <25% | -1 a todo |
| Fatiga | Exhausto | <10% | -2 a todo, media velocidad, -25% carga |

- **La fatiga se gasta**: 1 punto antes de una tirada de ataque, defensa o salvación da
  **+1**. Es además el combustible de lo psiónico.
- **Categorías de daño**: no letal → letal → grave. Se suman todas para los PG restantes.
  El no letal se absorbe con **Fortaleza como armadura** y sana solo al descansar; el letal
  necesita asistencia médica; el grave siempre requiere medicina.
- **Daño específico** (eléctrico, fuego, frío, corrosivo, plasma, sónico, tóxico, mental),
  cada uno con su categoría de gravedad y su efecto asociado. El **mental omite armaduras**.
- **20 estados** documentados con sus cuatro grados de resultado (fracaso crítico, fracaso,
  éxito, éxito crítico): atrapado, aturdido, ceguera, confusión, congelación, corrosión,
  derribado, enfermedad, entorpecido, envenenamiento, fatiga, **fusión**, hemorragia,
  heridas, inmovilizado, llamarada, miedo, parálisis, shock, sordera, sorprendido y
  desprevenido, inconsciencia y muerte.
- **Descanso**: 8 horas para un descanso completo; 5 comidas de 1 punto de fatiga y 2
  descansos breves de 2 puntos a lo largo del día.

## 8. Economía `[INFERIDO · EQUIP]`

- Moneda: **créditos**.
- **Rareza**: Común → Poco Habitual → Extraño → Muy Extraño → Singular. Afecta al coste,
  a la dificultad de fabricación (base 7, +2 por rango) y a los materiales necesarios.
- Objetos por **niveles 1-4** y **ranuras** (subsistemas por armadura, mejoras por arma),
  con topes ya definidos en las tablas de `EQUIP`.

## 9. Dotes `[PENDIENTE]`

Título en `HOJA` sin contenido. Se desconoce qué son, cuántas se eligen y qué cuestan.

## 10. Psiónica y arquitectura cuántica `[PARCIAL · CONV-1 + CONV-2 + EQUIP]`

### 10.0 Principio rector `[FIRME · CONV-2]`

> **La computación cuántica y la psiónica comparten la misma naturaleza fundamental:**
> ambas se mueven en el terreno de las **ondas**, la **superposición de estados** y las
> **probabilidades**. Por eso la tecnología y la mente no necesitan traductores mecánicos
> ni códigos artificiales para entenderse.

Es la regla de la que cuelga todo lo demás de esta sección: no hay capa de interfaz entre
mente y máquina porque **hablan el mismo idioma físico**.

### 10.1 El entorno tecnológico es cuántico `[FIRME · CONV-2]`

Los sistemas procesan información mediante **cúbits** regidos por superposición y
entrelazamiento. El núcleo no calcula secuencialmente: sostiene una matriz
multidimensional donde **todas las soluciones y rutas posibles coexisten** en un campo de
probabilidad, hasta que un estímulo externo **obliga al sistema a colapsar** y manifestar
un resultado único.

> *Analogía del diseñador: una orquesta donde todos los músicos tocan todas las melodías
> posibles a la vez; la máquina sostiene el potencial sonoro entero hasta que decide qué
> realidad musical se materializa.*

### 10.2 Qué es la psiónica `[FIRME · CONV-2]`

Manifestación activa del **campo neuro-eléctrico y sináptico** del sistema nervioso
central. No emite comandos fijos, sino **corrientes de intencionalidad estructurada** como
frecuencias de onda y vectores de probabilidad biológica. El psiónico proyecta su propia
coherencia mental para influir en **la materia, la energía o los flujos de información**, a
nivel **no local**.

> *Analogía: afinar una copa de cristal con la voz — encontrar su frecuencia y proyectar
> un eco hasta que vibra al unísono.*

Los tres dominios (materia · energía · información) son probablemente los ejes por los que
se clasificarán los poderes. `EQUIP` ya nombra **metasensoria** como una categoría.

### 10.3 Interacción psiónico ↔ máquina `[FIRME · CONV-2]`

**No existe fricción ni barrera de interpretación** entre ambas fuerzas. Tres ejes:

**A. Entrelazamiento Neural Directo.** La mente emite un campo de frecuencia tan similar a
la coherencia de los cúbits que el sistema **reconoce el pulso sináptico como un nodo más
de su red**. El cerebro del operador actúa, literalmente, como un **cúbit biológico
temporal**.

**B. Navegación por Probabilidad.** El psiónico no introduce instrucciones: proyecta su
intención como **vector de dirección** dentro de la nube de probabilidad. Para extraer
información **sintoniza la frecuencia donde ese dato ya existe en superposición** y
colapsa el estado, materializando la respuesta **en su conciencia de forma instantánea**.

**C. Resonancia y Resistencia.** La ciberseguridad **no son muros lógicos estáticos**, sino
**tormentas controladas de ruido de fase y fluctuaciones de probabilidad**. El intruso debe
mantener su estabilidad mental **en sincronía con el núcleo**. Si la concentración flaquea,
la avalancha de estados paralelos **desestabiliza su psique**: colapsos cognitivos o
pérdida temporal de la consciencia.

### 10.4 Implicaciones mecánicas `[INFERIDO · de CONV-2]`

Deducciones nuestras, **a validar con el diseñador**:

| Implicación | De dónde sale |
|---|---|
| El psiónico hackea **sin hardware ni interfaz**: su cerebro es el nodo. El hacker digital necesita equipo. | Eje A |
| Extraer datos por vía psiónica es **instantáneo** (llega a la conciencia); la vía digital consume acciones y tiempo. | Eje B |
| El hackeo psiónico no es "romper una barrera" sino **elegir en qué rama colapsa** el sistema. Mecánicamente: fijar un resultado dentro de un abanico, no superar un muro. | Ejes A y B |
| La defensa se resuelve como **duelo de estabilidad mental**, no como puntuación de seguridad estática. Encaja con una tirada de **Voluntad** (o Perspicacia) contra el núcleo. | Eje C |
| **Fallar tiene coste mental, no físico**: fatiga, aturdimiento o inconsciencia. Los estados ya existen en `EQUIP`. | Eje C |
| Los objetivos necesitan un valor propio de **turbulencia / ruido de fase** que mida cuánto cuesta sostener la sincronía con ellos. | Eje C |

Esto casa con el equipo que ya describe `EQUIP`:
- **Derivación Psiónica**: convierte cargas de batería en absorción de fatiga y menciona
  explícitamente "colapsos sinápticos" y "resistir el retroceso o la desorientación".
- **Xovromium**: +1 a manifestaciones, ignora el primer nivel de fatiga; al fallar,
  "desestabiliza las vías sinápticas".
- **Munición Supresora**: dobla el coste en fatiga de los poderes del objetivo.
- **Interfaz neural** (camuflaje trifásico): existe hardware de control mental para **no
  psiónicos**, así que el entrelazamiento no es exclusivo de la psiónica.

**Estado del documento del diseñador:** poco más de la mitad escrito. Llega después de
las especies (`CONV-1`).

## 11. Aumentos `[PARCIAL · CONV-1]`

**Aumentos = biónicos + genéticos.** Los **biónicos** son implantes de hardware; los
**genéticos**, modificaciones del propio organismo. Ambos cuelgan del mismo bloque de
ficha (`CONV-1`).

**Estado del documento del diseñador:** falta bastante por escribir.

## 12. Equipamiento

El título está vacío en `HOJA`, pero el catálogo completo existe en `EQUIP` — ver
secciones 8 (economía) y el propio `docs/equipamiento.md`.

## 13. Progresión `[PENDIENTE]`

`HOJA` cubre solo la creación (10 puntos de atributos + 10 de habilidades). No hay nada
sobre cómo se progresa después: si hay XP, si se reparten puntos por hitos, ni cuál es el
techo real.

## 14. Especies `[PENDIENTE — en camino]`

`HOJA` incluye el campo. `EQUIP` menciona **arianyi**, **arkorü**, humanos y una
**confederación** al describir fabricantes de armas. Se desconoce si dan modificadores.

**Es el próximo documento que envía el diseñador** (`CONV-1`).

---

## Supuestos tomados al implementar

La app ya tiene atributos, habilidades, salud y movimiento funcionando. Para llegar ahí
hubo que rellenar huecos que los documentos no cubren. **Cada uno de estos supuestos es
una decisión reversible**, y está aislado en `src/lib/rules.ts`:

| # | Supuesto | Por qué |
|---|---|---|
| S1 | El coste de una habilidad es **lineal**, igual que en atributos: subirla a N cuesta N puntos. | `HOJA` lo dice de los atributos ("el coste es exactamente el valor a conseguir") pero no de las habilidades, y solo hay 10 puntos para repartir. |
| S2 | Una habilidad **no puede valer 0**: o está sin entrenar (−1) o vale 1 como mínimo. | `HOJA` solo contempla "no entrenada = −1" y valores entrenados. El 0 no aparece. |
| S3 | Al entrenar, la **primera especialidad va incluida**; a partir de la segunda cuesta 1 punto. | `HOJA` dice que al entrenar "se debe escoger una especialidad" y que "una segunda especialidad tiene de coste 1 punto". |
| S4 | Tope de **3 especialidades** por habilidad. | No hay tope escrito; se pone uno para que la UI no crezca sin fin. |
| S5 | Las especialidades son **texto libre**. | No existe catálogo todavía. Cuando llegue, se cambia a lista cerrada. |
| S6 | El movimiento **no baja de 0**. | Con Potencia 0 y Atletismo −1, las fórmulas dan un salto vertical de **−10 cm**. Se corta en 0 hasta saber qué quiere el diseñador. |
| S7 | En creación el tope es **4** en atributos y **3** en habilidades; 5 queda como techo del sistema para más adelante. | Lectura de "máxima puntuación 4/5" y "3/5". |
| S8 | El **valor de Atletismo** que entra en las fórmulas de movimiento es el valor puro, sin aplicar la mitad por estar fuera de especialidad. | Las fórmulas de `HOJA` dicen "Potencia + Atletismo" a secas. |

## Conflictos detectados

| # | Conflicto | Estado |
|---|---|---|
| 1 | `EQUIP` pide tiradas de "Perspicacia + **Medicina**", pero Medicina no está entre las 10 habilidades de `HOJA`. Encaja como **especialidad de Biociencia** (`EQUIP` ya nombra Mecánica/Química/Bioquímica como especialidades). | Resuelto por inferencia, confirmar |
| 2 | `EQUIP` llama a la misma escopeta **Plasma SC** en la tabla y **Plasma SG** en la descripción; el fusil, **Plasma SA** / **Plasma AR**. | Errata del original, elegir nombre |
| 3 | ~~La munición corrosiva no indica dificultad del efecto.~~ | **Resuelto** en la revisión del 31 ago: Corrosión (dificultad 7) |
| C4 | **Exploración** se usa en las tiradas más importantes del juego —iniciativa, alerta, descubrir a un atacante oculto— pero **no está entre las 10 habilidades** de `HOJA`. O es una habilidad que falta en la hoja, o una especialidad (¿de Supervivencia? ¿de Cultura?) que se nombra como si fuera habilidad. **Bloquea implementar la Alerta.** | Sin resolver |
| C5 | `COMBATE` nombra **Resiliencia** (resistencia al shock en sintéticos) y **Estructura** (en equipamiento) como puntuaciones de salvación. Ninguna está entre los 6 aplicados de `HOJA`. ¿Son atributos de PNJ/objeto y no de PJ? | Sin resolver |
| C6 | `EQUIP` habla de daño **agravado**; `COMBATE` define solo no letal, letal y grave. Probablemente "agravado" sea el nombre viejo de "grave". | Sin resolver |
| C7 | `COMBATE` usa **Potencia + Atletismo** para levantarse de un derribo y **Fortaleza o Potencia + Atletismo** para escapar de un agarre: confirma que el par atributo-habilidad es libre, pero no hay tabla de pares canónicos. | Informativo |

## Preguntas abiertas para el diseñador

Agrupadas para soltarlas en tandas. Se tachan según lleguen respuestas.

**Sobre la ficha ya implementada** (cada una valida o tumba un supuesto)
1. "Máxima puntuación 4/5" y "3/5": ¿es 4 en creación y 5 el techo del sistema? ¿O el 5 se alcanza de otra forma? *(S7)*
2. ¿Los atributos aplicados tienen tope propio, o son libremente la suma?
3. Catálogo de especialidades de cada una de las 10 habilidades. *(S5)*
4. ¿Cuántas especialidades puede tener una habilidad como máximo? *(S4)*
5. ¿Cuánto cuesta subir una habilidad? Se ha asumido coste lineal como en atributos. *(S1)*
6. Un personaje recién creado tiene salto vertical **negativo** con las fórmulas tal cual (Potencia 0 + Atletismo −1 → −10 cm). ¿Se corta en 0, hay un mínimo, o Atletismo no entrenado cuenta como 0 aquí? *(S6, S8)*

**Bloqueantes para el catálogo de equipo**
7. ¿Los créditos son la única moneda? ¿Cuánto empieza teniendo un personaje?
8. Ranuras: ¿las mejoras de arma se limitan solo por la columna "Mejoras" de cada arma?

**Diseño pendiente**
9. Dotes: qué son, cuántas se eligen, coste.
10. Psiónica: ¿los poderes se compran con los 10 puntos de creación, con otro pool, o vienen dados por especie/dote?
11. Aumentos: ¿hay un **tope de capacidad** de lo que un cuerpo aguanta instalado? ¿Biónicos y genéticos comparten ese tope o van por separado? ¿Instalarse de más tiene consecuencia (rechazo, pérdida de humanidad, algo)?
12. Progresión post-creación: ¿XP, hitos, puntos por sesión?
13. Especies: lista y qué modifican. *(En camino.)*

**Sobre la dualidad hackeo digital / cuántico** (`CONV-1`, `CONV-2`)
14. Si mente y máquina comparten naturaleza (ondas, superposición, probabilidad), ¿la intrusión psiónica y la digital usan **la misma mecánica** con distinto vector, o son dos subsistemas separados? *(Lo primero simplifica muchísimo la app: un motor, dos entradas.)*
15. ¿Qué par atributo + habilidad resuelve la intrusión psiónica? El eje C apunta a **Voluntad** para sostener la sincronía, pero no sabemos si la habilidad es Tecnociencia, una habilidad psiónica propia o el rango del poder.
16. ¿Qué mide la defensa de un sistema? `CONV-2` la describe como tormenta de ruido de fase: ¿es un número del objetivo o una tirada enfrentada del núcleo?
17. Fallar la intrusión psiónica provoca "colapso cognitivo o pérdida de consciencia". ¿Eso es fatiga, daño (no letal/letal), o los estados Aturdido/Inconsciente que ya usa `EQUIP`?
18. ¿Existen sistemas **no cuánticos** (legacy digital) donde el psiónico no pueda entrar y sí el hacker clásico? Sería la razón de diseño para que ambas vías convivan.
19. Si el cerebro actúa como cúbit y hay **interfaces neurales** para no psiónicos (`EQUIP`, camuflaje trifásico), ¿puede un no psiónico entrelazarse con hardware, o eso está vetado?
20. ¿Los aumentos genéticos usan Biociencia donde los biónicos usan Tecnociencia?

**Huecos detectados al planificar la app** (ver `docs/plan-app.md`)
26. **No existe fórmula de capacidad de carga.** El sistema la penaliza (−25% malherido, −50% moribundo, −25% exhausto) y todo el equipo tiene peso en kg, pero ningún documento dice cuánto puede cargar un personaje. ¿Sale de Fuerza? ¿De Potencia? Sin esto, el peso del catálogo no sirve para nada.
27. **No hay tabla canónica de tiradas.** Los documentos citan 14 pares atributo + habilidad dispersos en prosa. Hace falta una tabla cerrada de las acciones habituales (atacar, defender, esquivar, saltar, escalar, iniciativa, alerta, ocultarse, tratar heridas…), porque parte de los pares actuales son inferencia nuestra.

**Sobre combate y salud** (`COMBATE`)
21. ~~Mecánica exacta del dado y conteo de éxitos.~~ **Resuelta:** 1d12 + aplicado + habilidad vs dificultad; crítico al superar por 6.
22. **Exploración** no existe como habilidad en la hoja pero se usa en iniciativa y alerta. ¿Habilidad que falta o especialidad? *(C4 — bloquea la Alerta en la ficha.)*
23. ¿La app debe **llevar la cuenta de PG y fatiga actuales** en partida, con sus estados de herida, o eso se lleva en mesa? Es la decisión que determina si la ficha pasa a guardar estado mutable además de la creación.
24. Si se lleva en la app: ¿se registra el daño **por categoría** (no letal / letal / grave), que es lo que exige el sistema para saber cuándo alguien está muerto de verdad?
25. **Resiliencia** y **Estructura**: ¿son puntuaciones de PNJ y equipo, o algún personaje jugador (un sintético) puede tenerlas? *(C5)*

---

## Registro de conversaciones

Aquí se anota lo que llegue por chat, con fecha, para poder rastrear qué regla vino de
dónde y qué tumbó a qué.

| Ref | Fecha | Qué aportó | Qué cambió |
|---|---|---|---|
| `CONV-3` | 2026-09-03 | Dos PDFs: **Sistema y Combate** (28 ago, 12 págs) y **Equipamiento** revisado (31 ago, 49 págs frente a las 43 anteriores). | Secciones 6 y 7 pasan de `[INFERIDO]` a `[FIRME]`: ya se conoce el dado (1d12), la tabla de dificultades, los críticos, las acciones por turno, los umbrales de herida y fatiga, las categorías de daño y 20 estados. Resuelve la pregunta 21; abre C4-C7 y las preguntas 22-25. En equipamiento: cambian **todas** las tablas de armas, aparece el efecto **fusión**, las **distancias de disparo** con modificadores y 12 secciones nuevas (armas de Kerzul, otras armas a distancia, medicina y farmacia). |
| `CONV-2` | 2026-08-26 | Documento de arquitectura cuántica y psiónica: principio rector (cuántica y psiónica comparten naturaleza — ondas, superposición, probabilidad — y no necesitan traductores), entorno de cúbits que colapsan ante estímulo externo, psiónica como campo neuro-eléctrico que actúa sobre materia/energía/información, y los tres ejes de interacción (entrelazamiento neural, navegación por probabilidad, resonancia y resistencia). | Nueva sección 10 completa. Cierra el *por qué* de la dualidad de hackeo; abre las preguntas 13-18 sobre su mecánica. La ciberseguridad deja de ser "muro con nivel" y pasa a ser duelo de estabilidad mental. |
| `CONV-1` | 2026-08-26 | Aumentos = biónicos + genéticos. La psiónica es **cuántica**, no digital-cibernética; por eso los psiónicos también hackean, aunque el modelo digital sigue existiendo. Próximos envíos: especies, luego poderes psiónicos; ambos documentos a poco más de la mitad. | Secciones 10 y 11 pasan de `[PENDIENTE]` a `[PARCIAL]`. Nuevas preguntas sobre la dualidad de hackeo. |
