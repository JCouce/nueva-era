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
| `HOJA2` | `docs/Creación de Personaje.odt` — revisión de `HOJA`: creación por prioridad, Aplicados como media, movimiento con otras constantes, coste de progresión, carga transportable, Altura/Peso | 2026-09-10 |
| `COMBATE` | `docs/sistema-y-combate.md` (transcrito de `Sistema y Combate.pdf`) | 2026-08-28 |
| `EQUIP` | `docs/equipamiento.md` (transcrito de `Equipamiento.pdf`) | 2026-08-31 |
| `CONV-1` | Conversación con Murillo (diseñador) — aumentos, psiónica cuántica | 2026-08-26 |
| `CONV-n` | Conversaciones con el diseñador (se anotan abajo según lleguen) | — |

**`HOJA2` sustituye a `HOJA` allí donde se contradicen** (creación por prioridad en vez de
10 puntos planos, Aplicados como media en vez de suma, otras constantes de movimiento). Donde
`HOJA2` no dice nada nuevo, `HOJA` sigue siendo la fuente.

---

## 1. Identidad `[FIRME · HOJA + HOJA2]`

Campos de ficha: **Nombre**, **Edad**, **Especie**, **Trasfondo**, **Motivación**, **Altura**,
**Peso**. Los dos últimos los añade `HOJA2`; no estaban en `HOJA` y la ficha implementada
todavía no los guarda.

## 2. Atributos

### Básicos `[FIRME · HOJA + HOJA2]`

Fuerza · Agilidad · Aguante · Percepción · Inteligencia · Carácter.

- Se empieza con **0** en todos.
- **Máximo 4/6** (`HOJA2`, era 4/5 en `HOJA`) — misma lectura que antes: 4 en creación, 6
  techo del sistema. La partición sigue *pendiente de confirmar* explícitamente, pero el
  patrón (creación/techo) ya lo dio por bueno el propio Murillo la vez anterior.
- Bajar un atributo a **-1** otorga **1 punto adicional**.
- **De dónde sale el pool para comprar y cuánto cuesta cada punto**: ver "Creación por
  prioridad" y "Coste y progresión" más abajo — `HOJA2` sustituye aquí a los "10 puntos
  planos, coste = valor a conseguir" de `HOJA`.

### Creación por prioridad `[FIRME · HOJA2 + CONV-4]`

`HOJA2` sustituye el pool plano de 10 puntos por un reparto de prioridades, calcado de
Shadowrun. Hay **5 categorías** — Atributos, Habilidades, Dotes, Psiónica, Recursos — y
**5 letras** (A-E), cada una con su propio presupuesto:

| Letra | Atributos | Habilidades | Dotes | Psiónica | Recursos |
|---|---|---|---|---|---|
| A | 18 pts | 18 pts | — | 18 pts | 66.000 créditos · Rareza Muy Extraño |
| B | 14 pts | 15 pts | — | 12 pts | 41.000 créditos · Rareza Extraño |
| C | 12 pts | 12 pts | — | 9 pts | 27.000 créditos · Rareza Poco Habitual |
| D | 10 pts | 9 pts | — | 3 pts | 13.000 créditos · Rareza Poco Habitual |
| E | 8 pts | 6 pts | 0 | 0 pts | 1.500 créditos · Rareza Común |

**Confirmado por Murillo el 2026-09-10 (`CONV-4`): cada letra se usa una sola vez, una por
categoría — hay que repartir las 5 entre las 5, sin repetir ninguna.** Es la decisión de
build: dónde pones la A y dónde la E define el personaje.

- **Dotes** solo tiene número en la fila E (0); el resto de casillas no aparecen en
  `HOJA2` tal cual — *pendiente de confirmar si faltan por transcribir o si Dotes no tiene
  pool propio en A-D*.
- Dotes y Psiónica ganan presupuesto pero **siguen sin catálogo**: no hay lista de dotes
  ni de poderes psiónicos todavía (ver secciones 9 y 10). El presupuesto se puede declarar
  en la ficha; gastarlo no, hasta que llegue el catálogo.
- Resuelve la pregunta 10 (¿la psiónica tiene pool propio?) y responde a la pregunta 7 en
  la parte de "cuánto dinero inicial" (ver sección 8, Economía).
- **La "Rareza X" de la columna Recursos es un tope de equipable, no solo flavor.**
  Implementado (2026-09-11): la Tienda bloquea equipar cualquier pieza por encima de la
  rareza de la letra elegida (`rarezaPermitida`, `lib/rules/equipo.ts`), con el mismo
  criterio de dos gastos que ya existía para los créditos. Decisiones del usuario al
  cerrarlo: el tope rige **solo en creación** (ficha sin aprobar) — una vez aprobada, o
  editando el máster, cualquier rareza pasa siempre que llegue el saldo; el **máster nunca
  tiene techo**, ni siquiera en `DRAFT`, para poder regalar algo narrativamente por encima
  del tope del jugador.

### Aplicados `[FIRME · HOJA2]`

Derivados, **no se compran**: son la **media** de dos básicos, redondeando hacia arriba.
`HOJA` decía que eran la suma; `HOJA2` lo corrige — cada básico sigue alimentando dos
aplicados.

| Aplicado | Fórmula |
|---|---|
| Fortaleza | ⌈(Fuerza + Aguante) / 2⌉ |
| Potencia | ⌈(Fuerza + Agilidad) / 2⌉ |
| Reflejos | ⌈(Agilidad + Percepción) / 2⌉ |
| Voluntad | ⌈(Aguante + Carácter) / 2⌉ |
| Perspicacia | ⌈(Inteligencia + Percepción) / 2⌉ |
| Expresión | ⌈(Carácter + Inteligencia) / 2⌉ |

> **Implementación:** se guardan los 6 básicos y se calculan los 6 aplicados, igual que
> hoy el XP gastado se deriva de la ficha. Nunca se persisten los aplicados. Al cambiar de
> suma a media, Vida, Fatiga y las 5 fórmulas de Movimiento cambian en cascada — pero como
> son derivados que nunca se guardan, no hace falta migrar nada: se recalculan solos.

## 3. Habilidades `[FIRME · HOJA + HOJA2]`

Actitud · Atletismo · Biociencia · Combate a Distancia · Combate Melee · Cultura ·
Exploración · Interpretación · Sigilo · Tecnociencia.

**Exploración sustituye a Supervivencia** (decisión del usuario, 2026-09-10, resuelve C4 y
C12): Supervivencia no se usaba en ninguna regla de `HOJA`/`COMBATE`, mientras que
Exploración aparece 5 veces (iniciativa, alerta, buscar/percibir) sin estar en la lista de
habilidades. Se sustituye la habilidad entera, no se añade como especialidad de otra.

- **Máximo 4/6** (`HOJA2`, era 3/5 en `HOJA`) — mismo criterio que en atributos: 4 en
  creación, 6 techo del sistema, *pendiente de confirmar la partición exacta*.
- El pool de creación ya no es "10 puntos planos": sale de la letra de prioridad asignada
  a Habilidades (ver arriba).
- Habilidad **no entrenada = -1**.
- Al entrenar una habilidad se **escoge una especialidad**:
  - En la especialidad escogida se usa el **valor total**.
  - En el resto, **la mitad redondeando hacia arriba**.
  - Una **segunda especialidad** dentro de la misma habilidad cuesta **1 punto**.

> **Implementación:** una habilidad deja de ser un entero y pasa a ser
> `{ valor: number, especialidades: string[] }`.

## 2.5 / 3.5 Coste y progresión `[FIRME · HOJA2]`

`HOJA2` da una fórmula de coste **por nivel**, no un coste total plano — y el usuario
confirma que **rige tanto la compra en creación (dentro del pool de la prioridad) como la
progresión posterior con XP**, sin distinguir fase:

| Categoría | Coste del nivel N | Ej. llegar a nivel 5 |
|---|---|---|
| Atributos | N × 2 | 2+4+6+8+10 = 30 |
| Habilidades | N × 1 | 1+2+3+4+5 = 15 |
| Psiónica | N × 3 | 3+6+9+12+15 = 45 |

Esto **sustituye** la regla vieja de `HOJA` ("el coste es exactamente el valor a
conseguir", coste marginal constante de 1 — la que estaba en el supuesto S1 y en la
sección "Básicos" original). Con `HOJA2` el coste marginal **crece con el nivel**: el
primer punto de un atributo cuesta 2, el segundo 4, etc. Responde a la pregunta 12
(progresión post-creación: sí hay XP, y esta es su fórmula).

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

Sin cambios de fórmula, pero Fortaleza y Voluntad ahora son media (no suma) de sus dos
básicos — ver sección 2, Aplicados — así que el resultado numérico cambia aunque la
fórmula de esta sección se quede igual.

## 5. Movimiento `[FIRME · HOJA2]`

`HOJA2` cambia las cinco constantes respecto a `HOJA` (columna vieja a la derecha, para
que quede el rastro):

| Tipo | Fórmula (`HOJA2`) | Fórmula vieja (`HOJA`) |
|---|---|---|
| Carrera | 16 + (Potencia + Atletismo) metros | 15 + (Potencia + Atletismo) |
| Salto vertical | 15 × (Potencia + Atletismo) centímetros | 10 × (Potencia + Atletismo) |
| Salto horizontal | 100 + [(Potencia + Atletismo) × 20] centímetros | 150 + [... × 60] |
| Escalada | 4 + [(Potencia + Atletismo) / 2] metros | 5 + [... / 2] |
| Nado | 4 + [(Potencia + Atletismo) / 2] metros | 5 + [... / 2] |

Ojo doble cambio: además de las constantes, **Potencia** ya no es la suma de Fuerza +
Agilidad, es su media redondeada hacia arriba (sección 2) — así que "Potencia +
Atletismo" da un número distinto aunque no toques nada de la fórmula de esta tabla.

## 5.5 Carga transportable `[FIRME · HOJA2]`

Resuelve la pregunta 26 (no había fórmula, y todo el equipo de `EQUIP` pesa en kg sin
nada que lo penalizara). Sale de **Fuerza**, no de Potencia:

- **Carga sin penalizador** = Fuerza × 20 kg. Con Fuerza 0, son 15 kg (no 0). Con Fuerza
  negativa, −5 kg por cada punto por debajo de 0 (no sigue la fórmula ×20 ahí).
- **Por encima del límite**: −1 a todas las acciones físicas, más −2 acumulativo (máx.
  −8) por cada 20% de exceso, velocidad de movimiento y nado/trepa a la mitad, y 1 punto
  de fatiga por hora mientras se mantenga la carga.
- **Al doble del límite**: −10 a acciones físicas, movimiento a un cuarto, 1 punto de
  fatiga por minuto.
- **Al cuádruple**: no puede moverse; 1 punto de fatiga por turno solo por sostener la
  carga.

**Proeza de Fuerza**: acción compleja + 1 punto de fatiga. Levantar/empujar/arrastrar algo
que supera 4-5 veces la carga sin penalizador. Se resuelve con Potencia + Atletismo,
dificultad 10. El propio documento invita a no tomárselo demasiado al pie de la letra —
permite que el narrador fije una "fuerza efectiva necesaria" para un obstáculo concreto en
vez de calcular el peso exacto siempre.

> **Implementación (2026-09-11), primer pase:** `cargaMaxima()` en `lib/rules/derivados.ts`
> calcula el límite sin penalizador y se muestra en Resumen junto al peso equipado
> conocido (`pesoEquipado()`, `lib/rules/equipo.ts`). Los tramos de penalizador (por
> encima del límite, doble, cuádruple) y la Proeza de Fuerza **no** están mecanizados
> todavía — son mecánica de tirada/estado, fase aparte.
>
> **Hueco de datos, no del motor:** `EQUIP` no trae columna de Peso para armaduras ni
> para ningún módulo instalable (subsistemas, mejoras estándar, mejoras de arma,
> movimiento) — solo armas de fuego y prácticamente toda arma melee tienen kg.
> `pesoEquipado()` solo suma lo que el catálogo sí sabe pesar; la interfaz avisa de qué
> falta en vez de fingir un total real. Decisión del usuario: mostrar el dato parcial con
> el aviso, no esperar a que llegue el peso de armaduras/módulos.
>
> **Corrección (2026-09-11):** la leyenda de `EQUIP` ("Peso `I` = insignificante", cabecera
> del documento) se había leído mal al transcribir el catálogo — 7 armas melee (Armas
> Cortas, Cuchillo de Combate, Látigo, Rodela de Metamaterial) llevaban `pesoKg: null`
> ("sin dato") en vez de `pesoKg: 0` ("pesa, pero no cuenta"). Corregido en
> `catalog/armasMelee.ts`. El total de `pesoEquipado()` no cambia (ambos sumaban 0), pero
> el detalle de cada pieza ahora dice "Insignificante" en vez de "No especificado".

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

## 8. Economía `[PARCIAL · EQUIP + HOJA2]`

- Moneda: **créditos**.
- **Rareza**: Común → Poco Habitual → Extraño → Muy Extraño → Singular. Afecta al coste,
  a la dificultad de fabricación (base 7, +2 por rango) y a los materiales necesarios.
- Objetos por **niveles 1-4** y **ranuras** (subsistemas por armadura, mejoras por arma),
  con topes ya definidos en las tablas de `EQUIP`.
- **Recursos iniciales, por fin con número** (`HOJA2`, responde a la pregunta 7): salen de
  la letra de prioridad asignada a Recursos — ver la tabla en "Creación por prioridad"
  (sección 2). De 1.500 créditos/Común (letra E) a 66.000 créditos/Muy Extraño (letra A).
  Sigue sin confirmar si los créditos son la **única** moneda.

## 9. Dotes `[PARCIAL · HOJA2]`

`HOJA` tenía el título sin contenido. `HOJA2` le da presupuesto de creación (0 puntos en
la letra E; el resto de casillas de la tabla de prioridad no aparecen en el documento,
*pendiente de confirmar si faltan por transcribir*), pero sigue sin decir **qué son las
dotes, cuántas se eligen ni qué compra cada punto** — no hay catálogo. Se puede declarar
el pool en la ficha; gastarlo no, hasta que llegue.

## 10. Psiónica y arquitectura cuántica `[PARCIAL · CONV-1 + CONV-2 + EQUIP + HOJA2]`

**Pregunta 10 resuelta por `HOJA2`:** la psiónica tiene **pool de creación propio** (letra
de prioridad asignada a Psiónica, ver sección 2), no sale de los puntos de Atributos ni de
Habilidades. También tiene fórmula de coste por nivel (Nivel × 3, ver "Coste y
progresión" en la sección 2). Sigue sin existir el **catálogo de poderes** — hay pool y
coste, pero no hay en qué gastarlo todavía.

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

**Estado de la transcripción (2026-09-11):** armaduras, armas de fuego, mejoras estándar,
subsistemas, movimiento, mejoras de arma y todo el combate melee (incluido Kerzul) están
en el catálogo desde la fase 3 (docs/traspaso.md §6). Quedaban tres bloques enteros sin
transcribir — Medicina y Farmacia, Herramientas y Accesorios, y Otras Armas a Distancia
(armamento pesado + granadas) — que se cierran de uno en uno:

> **Medicina y Farmacia, hecho.** `catalog/medicina.ts`: Valija Táctica Médica (VTM, 4
> niveles) y los 10 Fármacos. Dos familias de catálogo nuevas para esto —
> `herramienta` (con niveles, pero sin host: se equipa directo, como una armadura) y
> `consumible` (precio plano, sin niveles) — reutilizables para Herramientas (bloque
> siguiente). La VTM da su bono de aplicación ("+1/+2/+3 según nivel") como
> `Modificador` tipo `"tirada"` con alcance a la tirada fija `medicina` ("Tratar
> heridas") — no hizo falta ninguna tirada nueva. Los Fármacos van **sin ningún
> modificador mecanizado**, a propósito: sus bonos son por dosis (un solo uso), y el
> motor no lleva inventario de dosis consumidas — tratarlos como "mientras está
> equipado" daría un bono permanente por poseer una sola unidad, que no es la regla.
> Se quedan en `detalle`, para aplicar a mano al narrar el uso — el Nano-Elixir (+5 a
> esa tirada) es el caso más claro. Xovromium (Voluntad + Biociencia o Actitud) no
> tiene tirada fija a la que engancharse sin inventar una: se queda igual, en texto.
>
> **Herramientas y Accesorios, hecho.** `catalog/herramientas.ts`: Valija Táctica de
> Fabricación (VTF, 4 niveles), Radar (4), Disfraz Holográfico (2), Escáner Detector (2) y
> los 3 Materiales. Radar, Escáner Detector y Disfraz Holográfico piden **Perspicacia +
> Tecnociencia** — pareja distinta de "Buscar/percibir" (Perspicacia + Exploración), así
> que **no son un bono a esa tirada: son su propia acción**, generada dinámicamente por
> tenerlas equipadas (`lib/rules/herramientas.ts`, `tiradasDeHerramientas()` — mismo
> patrón que `combate.ts` con las armas, nueva fila "Herramientas" en la pestaña Tiradas).
> Ninguna trae un bono numérico limpio: la "dificultad 7" o "dificultad 6 superficial, 8
> profundo" que da el documento es la dificultad que el jugador teclea en el modal, no un
> modificador — va como texto en `notaTirada` (nuevo campo de `NivelModulo`), mismo
> criterio que la `nota` de las tiradas fijas. La VTF, a diferencia de la VTM, **tampoco**
> trae ningún bono limpio (nada de "+N a las tiradas"): se equipa como referencia para la
> tirada fija `tecnica`, sin modificador y sin tirada propia. Los Materiales son
> `consumible` sin tirada, igual que los Fármacos.
>
> **Otras Armas a Distancia (Armamento Pesado + Granadas), hecho — cierra el catálogo de
> equipo.** `catalog/armamentoPesado.ts`: Lanzallamas Ligero, Lanzacohetes RT, Lanzagranadas
> (pesado, independiente), Lanzamisiles AT y Cañón de Plasma. No encajan en `ArmaFuego`: esa
> tabla da tramos corta/media/larga con dificultad por tramo (mecanizados con
> `condicionTramo`, elección del jugador); Armamento Pesado da una única dificultad fija por
> arma y un único "Alcance" en metros (o ninguno, el Lanzallamas es de área pura). Familia de
> catálogo nueva (`armaPesada`, sin host, precio plano — mismo perfil que `ArmaFuego`/
> `Consumible`); su dificultad se mecaniza como `ajustesFijos` en `lib/rules/combate.ts`
> (automática, sin elección — no `condicionModo`, que es para cuando SÍ hay varias opciones)
> y el alcance queda como texto informativo en `nota`, mismo criterio que Radar/Escáner. El
> Lanzagranadas pesado reutiliza `MUNICION_GRANADA` para su daño según granada cargada, igual
> que el Lanzagranadas Integrado (mejora de arma) ya hacía. `mejorasAdmitidas` es solo
> informativo: el catálogo de Mejoras de Arma filtra por `TipoArma` (fusil_asalto,
> ametralladora...) y `armaPesada` no es una de esas familias — extender ese sistema a
> armamento pesado es una decisión aparte que este bloque no pedía.
>
> Granadas: los datos ya existían (`MUNICION_GRANADA` en `catalog/municion.ts`, usados hasta
> ahora solo como munición del Lanzagranadas). Ahora tienen familia propia (`granada`) y se
> compran/equipan sueltas, igual que un Consumible. Cada una equipada genera su propia tirada
> "Lanzar [Granada]" (`lib/rules/combate.ts`) — **Potencia + Atletismo** (es un lanzamiento a
> mano, no un disparo, por eso no comparte pareja con las armas de fuego), con
> `dificultadArrojada` como único `ajustesFijos`. Sin `modificadores`: su único número
> mecanizado va en la tirada, no como bono de personaje. Con esto se cierra el catálogo de
> equipo entero — las cuatro grandes familias que quedaban (Medicina, Herramientas, Armamento
> Pesado, Granadas) están todas transcritas y enganchadas a tiradas donde correspondía.

## 13. Progresión `[PARCIAL · HOJA2]`

`HOJA2` da la fórmula de coste por nivel (Atributos N×2, Habilidades N×1, Psiónica N×3 —
ver "Coste y progresión", sección 2) y confirma que rige tanto creación como progresión.
Sigue sin decir **de dónde sale la XP** (por sesión, por hito, por encuentro) ni si hay
techo real más allá del 6 de atributos/habilidades.

## 14. Especies `[PENDIENTE — en camino]`

`HOJA` incluye el campo. `EQUIP` menciona **arianyi**, **arkorü**, humanos y una
**confederación** al describir fabricantes de armas. Se desconoce si dan modificadores.

**Es el próximo documento que envía el diseñador** (`CONV-1`).

> **En la app hay dos especies de andamio** (`src/lib/catalog/especies.ts`): Humano, sin
> modificadores, y Arkorü, con números **inventados por nosotros** para poder construir y probar el
> motor de modificadores. La ficha las marca como provisionales a la vista del jugador. Cuando
> llegue el documento real, sustituir las especies es añadir entradas al catálogo: no hay código
> que tocar.

---

## Supuestos tomados al implementar

La app ya tiene atributos, habilidades, salud y movimiento funcionando. Para llegar ahí
hubo que rellenar huecos que los documentos no cubren. **Cada uno de estos supuestos es
una decisión reversible**, y está aislado en `src/lib/rules.ts`:

| # | Supuesto | Por qué |
|---|---|---|
| ~~S1~~ | ~~El coste de una habilidad es lineal, igual que en atributos: subirla a N cuesta N puntos.~~ **Superado por `HOJA2`**: el coste es por nivel (Atributos N×2, Habilidades N×1, Psiónica N×3), no un total plano — ver "Coste y progresión", sección 2. | Se queda aquí tachado como rastro: así se ve qué regla vieja sustituyó `HOJA2` y por qué. |
| S2 | Una habilidad **no puede valer 0**: o está sin entrenar (−1) o vale 1 como mínimo. | `HOJA` solo contempla "no entrenada = −1" y valores entrenados. El 0 no aparece. |
| S3 | Al entrenar, la **primera especialidad va incluida**; a partir de la segunda cuesta 1 punto. | `HOJA` dice que al entrenar "se debe escoger una especialidad" y que "una segunda especialidad tiene de coste 1 punto". |
| S4 | Tope de **3 especialidades** por habilidad. | No hay tope escrito; se pone uno para que la UI no crezca sin fin. |
| S5 | Las especialidades son **texto libre**. | No existe catálogo todavía. Cuando llegue, se cambia a lista cerrada. |
| S6 | El movimiento **no baja de 0**. | Con Potencia 0 y Atletismo −1, las fórmulas dan un salto vertical de **−10 cm**. Se corta en 0 hasta saber qué quiere el diseñador. |
| S7 | En creación el tope es **4** tanto en atributos como en habilidades; 6 es el techo del sistema, alcanzable en partida con puntos que reparte el máster. | `HOJA2` sube el "4/5" y "3/5" de `HOJA` a "4/6" en los dos, unificando el máximo de creación. La partición 4-creación/6-techo la confirma el usuario (2026-09-10); falta que Murillo la valide con una fórmula de progresión concreta. |
| S8 | El **valor de Atletismo** que entra en las fórmulas de movimiento es el valor puro, sin aplicar la mitad por estar fuera de especialidad. | Las fórmulas de `HOJA` dicen "Potencia + Atletismo" a secas. |
| S9 | En un módulo con niveles (mejora estándar o subsistema de `EQUIP`), un efecto que un nivel introduce y los superiores no repiten ni anulan se **acumula**: el nivel N conserva lo desbloqueado en 1..N-1. Cuando el documento da un total explícito para ese nivel ("mejora la bonificación a +2"), se usa ese total tal cual, sin sumarlo al de niveles inferiores. | `EQUIP` describe cada nivel como una mejora sobre el anterior, nunca como un reemplazo (p. ej. Soporte Vital nivel 1 da Resistencia Térmica y los niveles 2-3 no la repiten, pero tampoco dicen que se pierda). Asumir que se pierde algo al subir de nivel sería más raro que asumir que se mantiene. |
| S10 | El bono de Fuerza del Exoesqueleto, que `EQUIP` duplica para "carga transportable y proezas de fuerza", se aplica **x2 a las 5 fórmulas de movimiento** (Carrera, Salto Vertical, Salto Horizontal, Escalada, Nado) **y a la Carga Transportable** (sección 5.5, `cargaMaxima()`) — la cita completa de `EQUIP`, ya cerrada del todo (2026-09-11: hasta ahora solo se aplicaba a movimiento). No toca la Fuerza general ni Fortaleza/Vida, que siguen sin mecanizar. | `EQUIP` no dice explícitamente qué cuenta como "proeza de fuerza"; las 5 fórmulas salen de Potencia + Atletismo, la misma base física, así que tratarlas todas igual es lo más consistente. Pendiente de confirmar con Murillo. |
| S11 | El redondeo de los Aplicados (media de dos básicos) es **hacia arriba**. | Decisión explícita del usuario (2026-09-10): mismo criterio que ya usa el motor para especialidades fuera de especialidad (`Math.ceil`), por consistencia con lo que ya existía. `HOJA2` no especifica el redondeo. |
| S12 | Dotes no tiene presupuesto de creación en las letras A-D, solo **0 en la letra E**. | `HOJA2` solo rellena esa casilla de la tabla de prioridad; las demás están vacías. Puede ser que falten por transcribir — pendiente de confirmar con Murillo antes de construir nada sobre esto. |
| S13 | Espada Ligera, Espada y Montante (`catalog/armasMelee.ts`) son **Común**. | `EQUIP` deja esas tres celdas de rareza en blanco (a diferencia de Pelea, que también tiene el coste en blanco: aquí sí hay coste, 100-150 cr.). Decisión del usuario (2026-09-11): Común encaja con ese rango de precio, igual que el resto de piezas Común del catálogo. |
| S14 | Los umbrales de un mismo recurso **no se acumulan**: solo el más profundo alcanzado aporta su penalizador (Malherido sustituye a Herido, no se suma). PG y fatiga sí son independientes entre sí — Herido (PG) y Fatigado (fatiga) a la vez sí suman sus dos penalizadores. | `SISTEMA` (`docs/sistema-y-combate.md` §"Puntos de salud") da los umbrales como tres/dos filas de una tabla, sin decir si se combinan. Sumar -1-3-5 en Moribundo (-9 a todo) sería más severo que cualquier otra regla del sistema; tratar los tramos como bandas excluyentes es la lectura estándar en este tipo de tablas y la que no exige inventar un techo nuevo. |
| S15 | El "(mínimo 1)" de Moribundo y Exhausto (`docs/sistema.md` §7) se implementa como: el umbral de esa banda es `max(2, PGmáx × 0.1)`, comparado con `<`. Así un personaje con PG máximos bajos entra en Moribundo en cuanto le queda 1 punto, en vez de que la banda quede vacía por redondeo (con PGmáx=8, el 10% son 0,8, que sin el mínimo nunca se cruza antes de llegar a 0, que ya es "inconsciente", un estado distinto). Herido, Malherido y Fatigado no llevan ese "mínimo" en el documento, así que no se les aplica. | El documento fija el mínimo en puntos absolutos ("mínimo 1") pero no dice cómo combinarlo con el corte porcentual cuando ambos compiten. Es una decisión de redondeo, no de regla del juego — pendiente de que Murillo confirme si el criterio es este u otro. |

## Conflictos detectados

| # | Conflicto | Estado |
|---|---|---|
| 1 | `EQUIP` pide tiradas de "Perspicacia + **Medicina**", pero Medicina no está entre las 10 habilidades de `HOJA`. Encaja como **especialidad de Biociencia** (`EQUIP` ya nombra Mecánica/Química/Bioquímica como especialidades). | Resuelto por inferencia, confirmar |
| 2 | `EQUIP` llama a la misma escopeta **Plasma SC** en la tabla y **Plasma SG** en la descripción; el fusil, **Plasma SA** / **Plasma AR**. | Errata del original, elegir nombre |
| 3 | ~~La munición corrosiva no indica dificultad del efecto.~~ | **Resuelto** en la revisión del 31 ago: Corrosión (dificultad 7) |
| C4 | ~~**Exploración** se usa en las tiradas más importantes del juego... pero no está entre las 10 habilidades.~~ **Resuelto** (2026-09-10, decisión del usuario): Exploración sustituye a Supervivencia en la lista de habilidades. Desbloquea Iniciativa y Alerta. | Resuelto |
| C5 | `COMBATE` nombra **Resiliencia** (resistencia al shock en sintéticos) y **Estructura** (en equipamiento) como puntuaciones de salvación. Ninguna está entre los 6 aplicados de `HOJA`. ¿Son atributos de PNJ/objeto y no de PJ? | Sin resolver |
| C6 | `EQUIP` habla de daño **agravado**; `COMBATE` define solo no letal, letal y grave. Probablemente "agravado" sea el nombre viejo de "grave". | Sin resolver |
| C7 | `COMBATE` usa **Potencia + Atletismo** para levantarse de un derribo y **Fortaleza o Potencia + Atletismo** para escapar de un agarre: confirma que el par atributo-habilidad es libre, pero no hay tabla de pares canónicos. | Informativo |
| C8 | **La notación de las tiradas mezcla habilidades y especialidades sin avisar.** Los documentos escriben tanto `Perspicacia + Biociencia (Medicina)` —forma larga y correcta— como `Perspicacia + Medicina` a secas, y lo mismo con Empatía, Manipulación y Bioquímica. De 12 pares distintos, **4 usan el nombre de una especialidad como si fuera la habilidad**. No es cosmético: decide si la habilidad cuenta entera o a la mitad. | Sin resolver |
| C9 | **Una casilla no tiene medida.** El movimiento se calcula en metros (`carrera = 15 + Potencia + Atletismo`), pero las penalizaciones por herida dicen "solo una casilla por turno" y las áreas de las armas van en casillas (6x6, 8x8). Sin la equivalencia metros/casilla, las dos escalas no se pueden conectar. | Sin resolver |
| C10 | **"Niveles" de fatiga contra "puntos" de fatiga.** La salud define **puntos** (8 + Voluntad) y dos estados (Fatigado, Exhausto), pero los fármacos hablan de "consume 2 **niveles** de fatiga" y de "ignorar el primer **nivel** de fatiga acumulada". ¿Un nivel es un punto, o es un estado? | Sin resolver |
| C11 | **La escala de daño y la de vida no encajan del todo.** Las armas hacen de 7 a 20 de daño (mediana 12), los personajes tienen entre 6 y 16 puntos de golpe y los blindajes absorben de 1 a 8. Un fusil corriente (10) contra armadura ligera (4) se lleva 6 puntos: media vida de un PJ típico, antes de sumar +1 por cada dos éxitos. Puede ser letalidad buscada, pero conviene confirmar que **el daño del arma se resta 1:1 de los puntos de golpe**. | Sin resolver |
| C12 | ~~Cultura y Supervivencia no se usan en ninguna regla, mientras que Exploración aparece 5 veces sin estar en la lista.~~ **Resuelto junto con C4**: Supervivencia se sustituye por Exploración. Cultura se queda en la lista tal cual, sigue sin usarse en ninguna regla conocida — no es parte de esta decisión. | Resuelto (parcial: Cultura sigue sin uso) |
| C13 | **Impacto Estructural** (crítico de las armas de kerzul: reduce el blindaje del objetivo de forma permanente) está definido solo dentro de `EQUIP` y no aparece en el catálogo de 23 estados de `COMBATE`. Menor, pero es un efecto que vive fuera de su sitio. | Informativo |

## Preguntas abiertas para el diseñador

Agrupadas para soltarlas en tandas. Se tachan según lleguen respuestas.

**Sobre la ficha ya implementada** (cada una valida o tumba un supuesto)
1. ~~"Máxima puntuación 4/5" y "3/5"~~ **`HOJA2` los sube a "4/6" en los dos** (antes eran distintos entre sí). ~~Sigue abierto si el 4 es de creación y el 6 techo del sistema, o el 6 se alcanza de otra forma.~~ **Resuelta (usuario, 2026-09-10):** el 4 es el tope de creación; el 6 se alcanza en partida, con puntos adicionales que el máster reparte durante la aventura. *(S7)*
2. ~~¿Los atributos aplicados tienen tope propio, o son libremente la suma?~~ **Resuelta (usuario, 2026-09-10):** es una media, no una suma — ya implementado así (ver S11). No hay tope propio aparte del redondeo.
3. Catálogo de especialidades de cada una de las 10 habilidades. *(S5)*
4. ¿Cuántas especialidades puede tener una habilidad como máximo? *(S4)*
5. ~~¿Cuánto cuesta subir una habilidad?~~ **Resuelta por `HOJA2`:** Nivel × 1 (Atributos Nivel × 2, Psiónica Nivel × 3) — ver "Coste y progresión", sección 2. *(S1, tachado)*
6. Un personaje recién creado tiene salto vertical **negativo** con las fórmulas tal cual (Potencia 0 + Atletismo −1 → −10 cm). ¿Se corta en 0, hay un mínimo, o Atletismo no entrenado cuenta como 0 aquí? *(S6, S8)* — Verificado 2026-09-10: con las fórmulas de `HOJA2` sigue dando −10 cm sin el corte de S6; el motor ya lo recorta (`derivados.ts`, test en `derivados.test.ts`). Sigue pendiente de designer si el corte en 0 es lo correcto.

**Bloqueantes para el catálogo de equipo**
7. ~~¿Cuánto empieza teniendo un personaje?~~ **Resuelta por `HOJA2`:** depende de la letra de prioridad en Recursos, de 1.500 a 66.000 créditos. ~~Sigue abierto si los créditos son la única moneda.~~ **Resuelta (usuario, 2026-09-10): sí, es la única moneda.**
8. ~~Ranuras: ¿las mejoras de arma se limitan solo por la columna "Mejoras" de cada arma?~~ **Resuelta (usuario, 2026-09-10):** sí, se valida solo el número de esa columna, sin restricción adicional por tipo de mejora.
8b. Los efectos de nivel de una mejora estándar o subsistema, ¿se acumulan al subir de nivel o
cada nivel sustituye entero al anterior? *(S9)*
8c. El bono de Fuerza del Exoesqueleto se duplica para "carga transportable y proezas de
fuerza": ¿cuenta el movimiento entero (Carrera, Saltos, Escalada, Nado) como "proeza de
fuerza", o solo alguna de esas cinco fórmulas? *(S10)*

**Diseño pendiente**
9. ~~Dotes: `HOJA2` da presupuesto (0 en la letra E, el resto sin rellenar), pero sigue sin decir qué son, cuántas se eligen ni qué compra cada punto.~~ **En proceso (usuario, 2026-09-10):** el diseñador ya lo está preparando, no hace falta insistir — se retoma cuando llegue el documento.
10. ~~Psiónica: ¿los poderes se compran con los 10 puntos de creación, con otro pool, o vienen dados por especie/dote?~~ **Resuelta por `HOJA2`:** pool propio, ligado a la letra de prioridad. Sigue sin catálogo de poderes.
11. ~~Aumentos: ¿hay un tope de capacidad de lo que un cuerpo aguanta instalado? ¿Biónicos y genéticos comparten ese tope o van por separado? ¿Instalarse de más tiene consecuencia?~~ **En proceso (usuario, 2026-09-10):** el diseñador ya lo está preparando — se retoma cuando llegue el documento.
12. ~~Progresión post-creación: ¿XP, hitos, puntos por sesión?~~ **Resuelta por `HOJA2`:** hay XP, y el coste por nivel es el mismo que en creación (Nivel × factor según categoría) — ver "Coste y progresión", sección 2.
13. ~~Especies: lista y qué modifican.~~ **En proceso (usuario, 2026-09-10):** confirmado, ya en camino.

**Sobre la dualidad hackeo digital / cuántico** (`CONV-1`, `CONV-2`)
14. Si mente y máquina comparten naturaleza (ondas, superposición, probabilidad), ¿la intrusión psiónica y la digital usan **la misma mecánica** con distinto vector, o son dos subsistemas separados? *(Lo primero simplifica muchísimo la app: un motor, dos entradas.)*
15. ¿Qué par atributo + habilidad resuelve la intrusión psiónica? El eje C apunta a **Voluntad** para sostener la sincronía, pero no sabemos si la habilidad es Tecnociencia, una habilidad psiónica propia o el rango del poder.
16. ¿Qué mide la defensa de un sistema? `CONV-2` la describe como tormenta de ruido de fase: ¿es un número del objetivo o una tirada enfrentada del núcleo?
17. Fallar la intrusión psiónica provoca "colapso cognitivo o pérdida de consciencia". ¿Eso es fatiga, daño (no letal/letal), o los estados Aturdido/Inconsciente que ya usa `EQUIP`?
18. ¿Existen sistemas **no cuánticos** (legacy digital) donde el psiónico no pueda entrar y sí el hacker clásico? Sería la razón de diseño para que ambas vías convivan.
19. Si el cerebro actúa como cúbit y hay **interfaces neurales** para no psiónicos (`EQUIP`, camuflaje trifásico), ¿puede un no psiónico entrelazarse con hardware, o eso está vetado?
20. ~~¿Los aumentos genéticos usan Biociencia donde los biónicos usan Tecnociencia?~~ **En proceso (usuario, 2026-09-10):** parte del documento de aumentos que el diseñador ya está preparando.

**Huecos detectados al planificar la app** (ver `docs/plan-app.md`)
26. ~~No existe fórmula de capacidad de carga.~~ **Resuelta por `HOJA2`:** sale de Fuerza (Fuerza × 20 kg, con pisos y penalizadores propios) — ver "Carga transportable", sección 5.5.
27. **No hay tabla canónica de tiradas.** Los documentos citan 14 pares atributo + habilidad dispersos en prosa. Hace falta una tabla cerrada de las acciones habituales (atacar, defender, esquivar, saltar, escalar, iniciativa, alerta, ocultarse, tratar heridas…), porque parte de los pares actuales son inferencia nuestra.

**Sobre combate y salud** (`COMBATE`)
21. ~~Mecánica exacta del dado y conteo de éxitos.~~ **Resuelta:** 1d12 + aplicado + habilidad vs dificultad; crítico al superar por 6.
22. ~~**Exploración** no existe como habilidad en la hoja pero se usa en iniciativa y alerta.~~ **Resuelta**: sustituye a Supervivencia. *(C4)*
23. ~~¿La app debe llevar la cuenta de PG y fatiga actuales en partida, con sus estados de herida, o eso se lleva en mesa?~~ **Resuelta (usuario, 2026-09-10): en vivo.** La app lleva PG y fatiga en partida — confirma lo ya apuntado en `docs/traspaso.md` §9 (fase 6b). Es la decisión que determina que la ficha pasa a guardar estado mutable además de la creación.
24. ~~Si se lleva en la app: ¿se registra el daño por categoría (no letal / letal / grave)?~~ **Resuelta: sí.** "Grave" ya es categoría documentada (`COMBATE`, ver también la línea 278 de este documento); las tres categorías se registran por separado.
25. **Resiliencia** y **Estructura**: ¿son puntuaciones de PNJ y equipo, o algún personaje jugador (un sintético) puede tenerlas? *(C5)*

**Incongruencias entre documentos, para la misma tanda de preguntas**
26. Cuando el sistema dice "Perspicacia + Medicina", ¿quiere decir Biociencia usando la especialidad Medicina? Lo mismo con Empatía, Manipulación y Bioquímica. Es lo que decide si la habilidad cuenta entera o a la mitad. *(C8)* — Nota (usuario, 2026-09-10): depende del catálogo de especialidades, que aún está por definir (pregunta 3); no hay mucho en los documentos que hable de ellas todavía. Sigue abierta, ligada a esa.
27. ¿Cuántos metros mide una casilla? *(C9)*
28. Un "nivel de fatiga", ¿es un punto de fatiga o un estado (Fatigado/Exhausto)? *(C10)*
29. El daño de un arma, ¿se resta 1:1 de los puntos de golpe tras el blindaje? Con armas de 7 a 20 y personajes de 6 a 16 puntos, un disparo corriente se lleva media vida. *(C11)*
30. ~~**Cultura** y **Supervivencia** no aparecen en ninguna regla... ¿Es Supervivencia la habilidad madre de Exploración?~~ **Resuelta**: Supervivencia desaparece, la sustituye Exploración entera. Cultura se queda sin resolver — sigue sin uso conocido. *(C12)*

---

## Registro de conversaciones

Aquí se anota lo que llegue por chat, con fecha, para poder rastrear qué regla vino de
dónde y qué tumbó a qué.

| Ref | Fecha | Qué aportó | Qué cambió |
|---|---|---|---|
| `CONV-4` | 2026-09-10 | `docs/Creación de Personaje.odt` (`HOJA2`), revisión de la hoja de creación: sistema de prioridad (A-E entre Atributos/Habilidades/Dotes/Psiónica/Recursos), Aplicados como media en vez de suma, techo de creación 4/6 unificado, otras constantes de movimiento, coste por nivel (Nivel×factor) para creación y progresión, carga transportable completa, Altura y Peso en identidad. Por WhatsApp, Murillo confirma que las 5 letras de prioridad se usan **una vez cada una, sin repetir** ("Es igual que shadowrun"). | Resuelve las preguntas 5, 7 (parcial), 10, 12 y 26. Tumba el supuesto S1 (coste lineal de habilidades) y actualiza S7 (4/6 en vez de 4/5 y 3/5). Añade S11 (redondeo de Aplicados hacia arriba, decisión del usuario) y S12 (Dotes sin presupuesto en A-D, solo pendiente confirmar). Deja pendiente si el pool de Dotes A-D existe y no se transcribió. **Con este alcance, el motor de creación implementado hoy queda desactualizado en varios puntos — ver `docs/traspaso.md` para el plan de qué tocar.** |
| `CONV-3` | 2026-09-03 | Dos PDFs: **Sistema y Combate** (28 ago, 12 págs) y **Equipamiento** revisado (31 ago, 49 págs frente a las 43 anteriores). | Secciones 6 y 7 pasan de `[INFERIDO]` a `[FIRME]`: ya se conoce el dado (1d12), la tabla de dificultades, los críticos, las acciones por turno, los umbrales de herida y fatiga, las categorías de daño y 20 estados. Resuelve la pregunta 21; abre C4-C7 y las preguntas 22-25. En equipamiento: cambian **todas** las tablas de armas, aparece el efecto **fusión**, las **distancias de disparo** con modificadores y 12 secciones nuevas (armas de Kerzul, otras armas a distancia, medicina y farmacia). |
| `CONV-2` | 2026-08-26 | Documento de arquitectura cuántica y psiónica: principio rector (cuántica y psiónica comparten naturaleza — ondas, superposición, probabilidad — y no necesitan traductores), entorno de cúbits que colapsan ante estímulo externo, psiónica como campo neuro-eléctrico que actúa sobre materia/energía/información, y los tres ejes de interacción (entrelazamiento neural, navegación por probabilidad, resonancia y resistencia). | Nueva sección 10 completa. Cierra el *por qué* de la dualidad de hackeo; abre las preguntas 13-18 sobre su mecánica. La ciberseguridad deja de ser "muro con nivel" y pasa a ser duelo de estabilidad mental. |
| `CONV-1` | 2026-08-26 | Aumentos = biónicos + genéticos. La psiónica es **cuántica**, no digital-cibernética; por eso los psiónicos también hackean, aunque el modelo digital sigue existiendo. Próximos envíos: especies, luego poderes psiónicos; ambos documentos a poco más de la mitad. | Secciones 10 y 11 pasan de `[PENDIENTE]` a `[PARCIAL]`. Nuevas preguntas sobre la dualidad de hackeo. |
