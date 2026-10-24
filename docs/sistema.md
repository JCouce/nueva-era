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
| `[PARCIAL]` | Sección con partes `FIRME`/`INFERIDO` y partes sin cerrar o sin mecanizar; cada bloque lleva su propio estado | Sí, bloque a bloque |
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
| `ESP` | `docs/especies.md` (transcrito de `Especies.pdf`) — las 5 especies, castas y linajes Manduk | 2026-09-26 |
| `HOJA3` | `docs/fuente/creacion-de-personaje.md` (sync de Drive) — revisión de `HOJA2`: pool de Dotes A-E, Vida/Fatiga base 10 | 2026-10-14 |
| `DOTES` | `docs/fuente/dotes.md` (sync de Drive), transcrito en `docs/dotes.md` — 105 dotes, +3 de la foto del 2026-10-23 (Arquero Poderoso, Pistolero, Pistolero Infernal) | 2026-10-14 / 2026-10-23 |
| `AUM` | `docs/fuente/aumentos.md` (sync de Drive), transcrito en `docs/aumentos.md` — 26 operaciones genéticas y 11 implantes (5 en proceso) | 2026-10-16 |
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
- Bajar un atributo a **-1** otorga **2 puntos adicionales** (usuario, 2026-10-23; `HOJA` decía 1).
- **De dónde sale el pool para comprar y cuánto cuesta cada punto**: ver "Creación por
  prioridad" y "Coste y progresión" más abajo — `HOJA2` sustituye aquí a los "10 puntos
  planos, coste = valor a conseguir" de `HOJA`.

### Creación por prioridad `[FIRME · HOJA2 + CONV-4]`

`HOJA2` sustituye el pool plano de 10 puntos por un reparto de prioridades, calcado de
Shadowrun. Hay **5 categorías** — Atributos, Habilidades, Dotes, Psiónica, Recursos — y
**5 letras** (A-E), cada una con su propio presupuesto:

| Letra | Atributos | Habilidades | Dotes | Psiónica | Recursos |
|---|---|---|---|---|---|
| A | 18 pts | 18 pts | 18 pts | 18 pts | 66.000 créditos · Rareza Muy Extraño |
| B | 14 pts | 15 pts | 15 pts | 12 pts | 41.000 créditos · Rareza Extraño |
| C | 12 pts | 12 pts | 12 pts | 9 pts | 27.000 créditos · Rareza Poco Habitual |
| D | 10 pts | 9 pts | 9 pts | 3 pts | 13.000 créditos · Rareza Poco Habitual |
| E | 8 pts | 6 pts | 6 pts | 0 pts | 1.500 créditos · Rareza Común |

**Confirmado por Murillo el 2026-09-10 (`CONV-4`): cada letra se usa una sola vez, una por
categoría — hay que repartir las 5 entre las 5, sin repetir ninguna.** Es la decisión de
build: dónde pones la A y dónde la E define el personaje.

- **Dotes**: columna completa desde `HOJA3` (2026-10-14); antes solo se conocía la E (0,
  supuesto S12, ya tumbado). En código desde la tanda D1 (`PUNTOS_DOTES_POR_LETRA`,
  2026-10-15). Catálogo y reglas de compra: sección 9.
- Psiónica: pool y catálogo en la sección 10.
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

Derivados, **no se compran**: son la **media** de dos básicos, redondeando hacia abajo (S11).
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
  - En el resto, **la mitad redondeando hacia abajo**: un 1 fuera de especialidad cuenta 0.
    La fuente (`creacion-de-personaje.md`) dice "hacia arriba"; decisión del usuario,
    2026-10-23 (`valorFueraDeEspecialidad`, `derivados.ts`).
  - Una **segunda especialidad** dentro de la misma habilidad cuesta **1 punto**.

> **Implementación:** una habilidad deja de ser un entero y pasa a ser
> `{ valor: number, especialidades: EspecialidadId[] }` (ids del catálogo de abajo;
> `SCHEMA_VERSION` 17, tanda ESP 2026-10-15).

### Qué especialidad lleva cada tirada `[FIRME · usuario 2026-10-23]`

- **Si la tirada, según el documento fuente, no nombra especialidad, la habilidad suma
  entera** (sin mitad y sin casilla). Ejemplos: Defensa, Iniciativa, Apuntar, Buscar /
  percibir, Saltar, las herramientas, Volar, el Proyector de Pulso con Tecnociencia, el
  Xovromium, Finta, las tiradas de Biociencia de Resonancia e Inducción, la Proeza.
- **Si la nombra** —en forma larga, "Perspicacia + Biociencia (Medicina)", o corta,
  "Perspicacia + Medicina" (C8, pregunta 26)— va **entera si la ficha la tiene y a la mitad si
  no**. Lo decide la tirada, nunca el jugador: **la fila ya no tiene casilla de
  especialidad**.
- En código (`rules/montaje.ts`, `habilidadEntera`): la tirada nombra especialidad con
  `especialidadArma` (ataques y bloqueos), `especialidadesAccion` (filas fijas, dotes,
  aumentos, fármacos y poderes, con su `resolucion.especialidad`) o `especialidadAElegir`
  (Convencer / mentir); sin ninguna, entera. La tirada libre (S84) no nombra ninguna.
- Decisiones de la misma tanda (usuario, 2026-10-23):
  - **Saltar, levantarse / Escalar**: la fila "Saltar, escalar, levantarse" se parte. Saltar
    y levantarse, "potencia + atletismo" (salto, derribo), entera; Escalar, "potencia +
    escalada", con Escalada.
  - **Convencer / mentir**: selector **obligatorio** en la fila entre las especialidades de
    Actitud (no deja tirar sin elegir); entera si la ficha tiene la elegida, la mitad si no.
    Lista: S89.
  - **Hackeo**: Informática.
  - **Iniciativa (distrayendo)**: "expresión + manipulación o sigilo" → Manipulación fija;
    casilla "Con Sigilo" en la fila, y Sigilo (a secas en la fuente) va entero.
  - **Escáner Detector 2**: "Tecnociencia (o Biociencia)" → la más alta de las dos, entera.
  - **Sigilo** tiene especialidades (Esconderse, Hurto: tabla de abajo). La fila Sigilo va
    con Esconderse ("reflejos + esconderse") y hay fila **Hurto** ("reflejos + hurto",
    enfrentada a Perspicacia + Exploración).
  - **Tratar heridas** y los fármacos con tirada (salvo Xovromium): Medicina.
  - **Alerta de Resonancia contra sintéticos**: Tecnociencia entera (deja de llevar
    Informática; antes era supuesto). Rastreo, Superar la barrera e Inducción sintéticos
    siguen con Informática, que la prosa nombra.
- **Habilidad sin lista de especialidades** (Interpretación): no admite ninguna y se
  tira siempre con el valor entero (supuesto S39). La regla "al entrenar se escoge una
  especialidad" no se exige en ningún sitio (ni pasos de personaje ni envío a revisión): la
  primera especialidad va incluida (S3), pero elegirla no bloquea nada.
- **Ataques y bloqueos con arma: la especialidad la pone el arma** (tanda ESP, decisión del
  usuario; los bloqueos desde D2b-1, S40). Cada arma tiene la suya
  (`src/lib/catalog/especialidadesArma.ts`: melee y pesado por tabla, armas de fuego e
  impulsoras por su tipo, desde 2026-10-23); si la ficha la tiene en la habilidad con la que tira, la tirada va entera
  sin tocar nada, y si no, a la mitad.

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

### Emparejamiento atributo + habilidad `[FIRME · CONV-5 + ya construido]`

Las habilidades **no están soldadas a un atributo**. El par lo dicta
la acción, y hay equipo que altera el par por diseño (el Proyector de Pulso permite tirar
Tecnociencia en lugar de Combate a Distancia).

Pares vistos en `EQUIP`: Perspicacia + Tecnociencia · Perspicacia + Biociencia ·
Perspicacia + Medicina · Reflejos + Tecnociencia · Voluntad + Biociencia · Voluntad +
Actitud · Reflejos + Combate a Distancia.

**Tabla canónica de acciones habituales (resuelve la pregunta 27, Murillo 2026-09-23
+ lo ya construido en el motor):**

| Acción | Atributo + Habilidad | Fuente |
|---|---|---|
| Atacar a distancia | Reflejos + Combate a Distancia | Murillo, ya en `combate.ts` |
| Atacar cuerpo a cuerpo | Potencia + Combate Melee (excepción: armas "Sutiles" → Reflejos + Combate Melee) | Murillo, ya en `combate.ts` |
| Esquivar / Defensa | Reflejos + Atletismo | Murillo, ya en `acciones.ts` (`defensa`) |
| Alerta (percepción pasiva) | Perspicacia + Exploración | Murillo, ya en `acciones.ts` (`alerta_activa`) |
| Iniciativa | Perspicacia + Exploración por defecto; variantes según cómo se entra en combate (con arma en mano: Reflejos + Combate a Distancia; con distracción: Expresión + Actitud) | Ya `FIRME` más arriba (sección "Combate"), ya en `acciones.ts` |
| Ocultarse | Reflejos + Sigilo | Ya en `acciones.ts` (`sigilo`) — no la tocó esta tanda, se incluye por consistencia con el resto de la tabla |
| Saltar / Escalar / Nadar | Potencia + Atletismo | Ya en `acciones.ts` (`atletismo`, tirada genérica) — misma base que las 5 fórmulas de movimiento |
| Tratar heridas | Perspicacia + Biociencia (especialidad Medicina si se tiene) | Ya en `acciones.ts` (`medicina`) + confirmado por Murillo en la pregunta 26 |
| Lanzar un arma melee arrojadiza | Potencia + Atletismo; alcance el de cada arma (Lanza Corta y Lanza Corta de Kerzul Potencia × 12 m, Cuchillo de Combate y Puñal de Kerzul × 6) | Par `INFERIDO` (supuesto S20); alcance `FIRME` (`docs/fuente/equipamiento.md`, 2026-10-24). En `combate.ts` (`tiradaLanzarArmaMelee`) |

Murillo añade que "también entra en juego alguna dote" en varias de estas tiradas — sin
efecto hoy, porque Dotes sigue sin catálogo (sección 9).

**Cerrado 2026-09-24:** en armas melee, "Sutil" era solo una nota de texto en la tirada
("se tira Reflejos en vez de Potencia"), sin toggle real. Ahora es un toggle de verdad
en `FilaTirada` (`AccionesTab.tsx`): el jugador elige al tirar si ataca/bloquea con
Potencia (por defecto) o Reflejos+Potencia-para-daño (`aplicadoSutil`/`danioSutil` en
`Accion`, `lib/rules/acciones.ts`/`combate.ts`). Mecanismo propio en `MotorMetadata`
(`sustitucion_aplicado`, ver `docs/motor.md`) porque no pasa por `CondicionTirada` — su
valor depende de la ficha (Potencia - Fuerza), no es un número fijo del catálogo.

### Catálogo de especialidades `[FIRME · docs/fuente/habilidades.md (foto 2026-10-23) + usuario 2026-10-15]`

Lista cerrada, sacada de la línea "Especialidades:" de cada habilidad en
`docs/fuente/habilidades.md`. En código: `src/lib/catalog/especialidades.ts` (`{ id, label,
habilidad }`, ids estables en snake_case sin tildes; añadir una es una fila). 48 en total.

| Habilidad | Especialidades (id) |
|---|---|
| Actitud (6) | Empatía `empatia`, Humor `humor`, Intimidación `intimidacion`, Liderazgo `liderazgo`, Manipulación `manipulacion`, Negociación `negociacion` |
| Atletismo (8) | Acrobacias, Carrera, Equilibrio, Escalada, Escapismo, Lanzamiento, Nado, Salto (`salto`: la fuente lista "Salto" y describe Horizontal y Vertical) |
| Biociencia (5) | Biónica `bionica`, Bioquímica `bioquimica`, Biotecnología `biotecnologia`, Ingeniería Genética `ingenieria_genetica`, Medicina `medicina` |
| Combate Melee (6) | Armas Cortas `armas_cortas`, Armas de Asta `armas_de_asta`, Escudos `escudos`, Espadas y Dagas `espadas_y_dagas`, Flagelos `flagelos`, Pelea `pelea` |
| Combate a Distancia (9) | Armas Arrojadizas `armas_arrojadizas`, Armas Impulsoras `armas_impulsoras`, Pistolas `pistolas`, Escopetas `escopetas`, Subfusiles `subfusiles`, Fusiles de Asalto `fusiles_de_asalto`, Fusiles de Precisión `fusiles_de_precision`, Ametralladoras `ametralladoras`, Armas Pesadas `armas_pesadas` |
| Cultura (4) | Economía `economia`, Historia `historia`, Lingüística `linguistica`, Sociedad `sociedad` |
| Exploración (3) | Investigación `investigacion`, Táctica `tactica`, Supervivencia `supervivencia` |
| Tecnociencia (5) | Astrografía `astrografia`, Física `fisica`, Informática `informatica`, Mecánica `mecanica`, Química `quimica` |
| Sigilo (2) | Esconderse `esconderse`, Hurto `hurto` (foto de Drive 2026-10-23; antes sin lista) |
| Interpretación | — (la fuente no trae lista: no admite especialidades, S39) |

**Cambio de la foto de Drive del 2026-10-23** (`docs/fuente/habilidades.md`): Combate a
Distancia pasa de 5 especialidades a 9; desaparecen Armas Elásticas y Armas de Fuego
Cortas/Largas. Las fichas viejas se migran en la v22 (`rules/migraciones.ts`, decisión del
usuario): Cortas → Pistolas, Elásticas → Armas Impulsoras, Largas → la especialidad del
primer arma de fuego a dos manos del equipo (por su tipo) o, si no lleva ninguna, se quita y
queda en el aviso de especialidades; la elección de *Crítico Mejorado* sigue la misma
traducción, y si se queda sin especialidad la dote se quita (`TODO(revisar)`, no lo decidió
el usuario). Se aplica igual a los NPCs (comparten `parseSheet`).

Rastreo, Subsistencia y Trato con Animales son **acciones** de Supervivencia, no
especialidades. Química es de Tecnociencia y Biónica de Biociencia (la fuente manda sobre lo
citado de pasada en `EQUIP`).

**Especialidad por arma** (`especialidadesArma.ts`): cada grupo de Combate Melee del catálogo
de equipo va a la especialidad de su nombre; las armas de fuego, por su `tipo`, a la
especialidad que se llama como él (pistola → Pistolas, escopeta → Escopetas, subfusil →
Subfusiles, fusil de asalto/de precisión → Fusiles de Asalto/de Precisión, ametralladora →
Ametralladoras; usuario, 2026-10-23, sustituye a S44); Arco Táctico y Ballesta a Armas
Impulsoras; el disparo del Proyector de Pulso a Pistolas; armamento pesado y lanzagranadas
integrado a Armas Pesadas; lanzar (arma arrojadiza o granada, Potencia + Atletismo) a
Lanzamiento. Las dudosas llevan comentario en la tabla (Armas Mecánicas, Kerzul mixtas,
Bayoneta, Lanzagranadas integrado). Un test obliga a que toda fila de
ataque con arma tenga una especialidad de la habilidad con la que ataca (salvo el disparo del
Proyector de Pulso con Tecnociencia, sin especialidad a propósito: entera, §3).

## 4. Salud `[FIRME · HOJA3]`

`HOJA3` (Creación de Personaje, foto de Drive 2026-10-14,
`docs/fuente/creacion-de-personaje.md`) sube la base de 8 a 10 (columna vieja a la
derecha, para que quede el rastro):

| Recurso | Fórmula (`HOJA3`) | Fórmula vieja (`HOJA`/`HOJA2`) |
|---|---|---|
| **Puntos de Vida** | 10 + Fortaleza | 8 + Fortaleza |
| **Puntos de Fatiga** | 10 + Voluntad | 8 + Voluntad |

Además, Fortaleza y Voluntad son media (no suma) de sus dos básicos — ver sección 2,
Aplicados. Los máximos no se guardan (se recalculan con `salud()`, `rules/derivados.ts`),
así que el cambio de base llega solo a todas las fichas; la vida y fatiga actuales
guardadas se quedan como estaban.

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
Agilidad, es su media redondeada hacia abajo (sección 2) — así que "Potencia +
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
> calcula el límite sin penalizador y se muestra en Personaje → Estado junto al peso equipado
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
>
> **Reconciliación con la foto de Drive (2026-10-23):** `docs/fuente/equipamiento.md` ya da
> peso en kg a todas las armas melee (Armas Cortas, Asta, Espadas, Flagelos, Rodela de
> Metamaterial) y a las granadas; la "I" desaparece. Transcrito en `catalog/armasMelee.ts`
> y `catalog/municion.ts`. Solo la Pelea sigue en `null`.

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

### Cobertura y escudos `[FIRME · Murillo (vía usuario), 2026-10-23]`

- La cobertura (niveles 1-4) sube la dificultad de los ataques en su nivel, sea la que sea
  (escudo, muro...). Si el ataque **supera la defensa pero falla por la cobertura**, golpea
  la cobertura en vez de al portador.
- Si la cobertura es un **escudo**, el escudo recibe el **daño total** del ataque, le resta
  **su propio blindaje** y **todo lo que sobra va a su durabilidad**. Al portador no le llega
  nada. Con la durabilidad a 0, **el escudo se rompe**.
- **El blindaje del escudo no suma al blindaje del portador**: solo sirve para que el escudo
  aguante.
- Bloquear con el escudo (dote Bloqueo) desvía el golpe sin que el escudo lo reciba.
- El Brazo Biónico no cambia: "Bloqueado con el brazo" sigue sumando su blindaje al golpe.
- En la app (S86): la esquiva lleva la casilla "Tengo cobertura (+2)" para cualquier ficha;
  "Bloquear daño" pregunta "¿A qué da el golpe?" (A ti · Al escudo · A la cobertura) y "Al
  escudo" resta de la durabilidad del escudo (`golpeAlEscudo`, `rules/blindaje.ts`). La app
  no conoce coberturas genéricas (muros...), solo la del escudo.

### Tiradas fijas de habilidades `[FIRME · fuente/habilidades.md + S79-S83]`

Filas del grupo Acciones (`rules/acciones.ts`, `ACCIONES`), construidas el 2026-10-23:

- **Apuntar**: Perspicacia + Combate a Distancia, acción simple, dificultad 6 contra un
  objetivo mediano (más cobertura y visibilidad; +1 por tamaño mayor, −1 por menor). Éxito:
  +1 al siguiente ataque a distancia; crítico: además omite 1 nivel de cobertura. La fuente
  no nombra especialidad: Combate a Distancia entera (§3, usuario 2026-10-23).
- **Saltar, levantarse** (Potencia + Atletismo, entera) y **Escalar** (Potencia + Atletismo
  con Escalada), filas aparte desde 2026-10-23 (§3). **Sigilo** (Reflejos + Sigilo con
  Esconderse) y **Hurto** (Reflejos + Sigilo con Hurto, enfrentada a Perspicacia +
  Exploración). **Hackeo**, con Informática; **Tratar heridas**, con Medicina; **Convencer /
  mentir**, con la especialidad de Actitud que se elija al tirar (S89).
- **Carrera**: Reflejos + Atletismo (Carrera), dificultad 6, acción estándar o compleja.
  Éxito +2 m, crítico +4 m, fallo nada, fallo crítico mueve la mitad; compleja, ×2. Los
  metros van en la nota (no se calculan).
- **Discernir mentiras**: Perspicacia + Actitud (Empatía), acción gratuita, dificultad según
  contexto.
- **Resistir distracción**: Perspicacia + Actitud (Empatía), enfrentada a la distracción
  del rival (Expresión + Manipulación): si gana, sorprendido contra su primer ataque; con
  crítico, desprevenido.
- **Selector «Apuntado»** (No · Éxito · Crítico) en todo ataque con Combate a Distancia
  (S81): Éxito +1; Crítico +1 y la nota "omite 1 nivel de cobertura" (la cobertura se sigue
  restando a mano).
- Dotes: *Velocista* (S80), *Gran Puntería* (S79), *Puntería Relámpago* y su *Mejorada* y
  *Precisión Imperturbable* (textos en la nota de Apuntar), *Cazador Cazado* y *Vigilancia
  Táctica* (S83). *Foveo-Sensorial* va con el selector (S82).
- Pendientes de la misma tarea: Investigación, Rastreo y Subsistencia siguen en "Buscar /
  percibir" (S36).

## 7. Salud, daño y estados `[FIRME · COMBATE]`

**Puntos de golpe = 10 + Fortaleza · Puntos de fatiga = 10 + Voluntad** (base 10 desde `HOJA3`, §4; antes 8). Ambos bajan y ambos
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
  *En la app (decisiones del usuario, 2026-10-24; pregunta 24, fase 1: la ficha):*
  `vidaActual` sigue siendo la verdad y la ficha guarda además `danio` (`rules/danio.ts`,
  v23), el **desglose** de la vida perdida (máximo − actual) en no letal / letal / grave.
  Se normaliza contra la vida perdida en cada lectura (`reconciliarVida`): el daño sin
  categoría (S75, panel de mando, −/+ de vida) es **letal por defecto**, y una cura sin
  categoría quita **de lo más leve primero** (no letal, luego letal, luego grave). En
  Recursos, la tarjeta de Vida pinta la barra con lo perdido por categoría y una fila por
  categoría para recibir o curar 1 (`ajustarDanioCategoria`). Peaje neurológico y
  sobrecarga ya restan con su categoría. Pendiente: combate (foto del combatiente) y panel
  de mando, Fortaleza absorbiendo el no letal, curas por descanso/medicina.
- **Daño específico** (eléctrico, fuego, frío, corrosivo, plasma, sónico, tóxico, mental),
  cada uno con su categoría de gravedad y su efecto asociado. El **mental omite armaduras**.
  *En la app (2026-10-24, aviso de Murillo: "el fuego es daño grave"):* la gravedad de
  cada tipo vive en `catalog/tiposDanio.ts` tal cual la fuente — grave: fuego, corrosivo,
  plasma; letal: eléctrico (grave en crítico), tóxico, mental; no letal: frío y sónico
  (letal en crítico). `categoriaDanioDeTexto` la usa, así que un daño "Fuego" se resta
  como grave. Las Armas Modificadas Térmica y de Plasma, que convierten el básico, pegan
  Grave (S87). Pendiente: el nivel de Mejora Ignífuga que deja el fuego en letal.
- **20 estados** documentados con sus cuatro grados de resultado (fracaso crítico, fracaso,
  éxito, éxito crítico): atrapado, aturdido, ceguera, confusión, congelación, corrosión,
  derribado, enfermedad, entorpecido, envenenamiento, fatiga, **fusión**, hemorragia,
  heridas, inmovilizado, llamarada, miedo, parálisis, shock, sordera, sorprendido y
  desprevenido, inconsciencia y muerte.
- **Descanso**: 8 horas para un descanso completo; 5 comidas de 1 punto de fatiga y 2
  descansos breves de 2 puntos a lo largo del día.

*En la app (M1b, 2026-10-13), la tabla de umbrales entera se aplica sola, en la
`FichaResuelta` (`resolverFicha`, `rules/fichaResuelta.ts`):*
- **−N a todo**: `modificadoresDeUmbrales` (`rules/estados.ts`) entra en
  `FichaResuelta.modificadores` como `Modificador` de tirada con alcance `todas`. Llega a
  todas las tiradas (montarTirada, poderes con `prepararPoder`, salvación de sobrecarga,
  Fabricar/Reparar) con su línea en el desglose ("Herido −1"). Bandas excluyentes por
  recurso (S14), mínimo de Moribundo/Exhausto según S15.
- **De dónde sale la vida/fatiga**: entrada explícita de `resolverFicha` (`vitalidad`).
  Fuera de combate, la de la ficha (`vidaActual`, y la fatiga **efectiva**: menos la
  temporal de Proeza) contra sus máximos. En un combate en curso, la foto del
  `Combatiente` (`pgActual/pgMax`, `fatigaActual/fatigaMax`): para el jugador, su fila
  (`CharacterSheet`, `miCombatiente`); para el NPC de la consola, la de su fila, no la de
  su plantilla (`NpcAccionesPanel`). La temporal de la ficha también se resta en combate.
- **Media velocidad y carga** (`movimientoPorUmbrales`, `estados.ts`): carrera, vuelo y
  levitación a la mitad; carga −25 % o −50 %. Supuestos S26-S29. Notas en Personaje →
  Estado: "media velocidad · Malherido", "−25 % · Exhausto", "una casilla por turno ·
  Moribundo".
- **Sin mecanizar**: "una casilla por turno" de Moribundo (solo la nota; el número de
  carrera no cambia) y la media velocidad en los metros de la tirada de Volar (solo se
  parte el vuelo de Estado; pendiente en `docs/tareas.md`).

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

## 9. Dotes `[FIRME · DOTES + HOJA3 + usuario 2026-10-14]`

Fuente: `docs/fuente/dotes.md` (foto de Drive), transcrita fiel en `docs/dotes.md`. Encargo
y plan: `docs/prompt-dotes.md`. **Manda siempre el documento nuevo** sobre lo anterior
(regla del usuario); solo se pregunta ante duda real.

### 9.1 Qué es una dote `[FIRME · DOTES]`
- **108 dotes** con nombre, **coste** en puntos, **requisitos** y efecto en prosa,
  ordenadas bajo la habilidad a la que pertenecen: Actitud 16 · Atletismo 22 · Biociencia 9 ·
  Combate Melee 32 · Combate a Distancia 12 · Exploración 6 · Sigilo 3 · Tecnociencia 8 (todas
  en el subgrupo **Psiónica**). Cultura e Interpretación, sin dotes todavía. Las 3 últimas de
  Combate a Distancia (*Arquero Poderoso*, *Pistolero*, *Pistolero Infernal*) son de la foto
  del 2026-10-23; el resto de dotes nuevas de esa foto no está transcrito todavía.
- El grupo solo ordena: no es requisito (*Mata Gigantes*, en Combate Melee, pide Táctica).
- **Pool de creación** por letra: A 18 · B 15 · C 12 · D 9 · E 6 (`HOJA3`). Lo que sobra al
  aprobar la ficha **se pierde**.
- **Con experiencia** se compran pagando el mismo número que su coste.
- **Requisitos**: atributo, aplicado, habilidad, especialidad, disciplina psiónica o dote
  previa. Miran el valor **con el que se juega, especie incluida**. "Nivel en una habilidad
  psiónica N" se cumple con **cualquier disciplina** a N o más. "Psiónica de origen
  biológico" equivale a **tener psiónica**, por especie o por implante (el Implante de
  Resonancia Métrica activará el mismo requisito cuando exista).
- **Versiones mejoradas**: se compran sin la básica si sus requisitos no la piden (se lee
  el documento tal cual; el usuario lo confirma con Murillo). Si se tienen las dos, **vale
  la mejor**, no se suman (*Movimiento Sigiloso* −2 y *Mejorado* −4 → −4).
- **Dotes con elección dentro** (*Especialidad Médica*, *Crítico Mejorado*, *Bioma
  Predilecto*): se elige al comprar y queda guardado. *Especialidad Médica* se puede comprar
  varias veces, con otra pareja de afecciones cada vez.

### 9.2 Maniobras que solo existen con su dote `[FIRME · DOTES + usuario 2026-10-14]`
- **Bloqueo**: sin la dote la acción "Bloquear con X" **no aparece**. Con ella se mantiene lo
  de la pregunta 31 y se añaden las casillas que hagan falta (desarmado frente a armado,
  −3). Tamaño y contraataque, como texto.
- **Combate Sutil**: usar Reflejos con armas sutiles exige la dote; sin ella se ataca con
  Potencia (hoy es un interruptor para todos).
- **Arrollar** y **Ataque de oportunidad**: solo con la dote.

*En la app (D2b-2, 2026-10-15):* Bloqueo y Combate Sutil **construidos** (detalle al final
de §9.3). Arrollar y Ataque de oportunidad no existían en la app: **construidos en D2c-1**
como acciones de dote (solo salen con la dote).

### 9.3 Qué aplica la app y qué es texto `[FIRME · usuario 2026-10-14]`
Regla general (ver `docs/motor.md`, "Lo que queda fuera del modelo"): **lo que la app puede
aplicar o recalcular se aplica en la ficha; lo demás queda como texto.**
- **Texto para siempre**: casillas, alcance, tamaño, altura. No habrá tablero.
- **Texto hoy**: acciones por turno (reacción, gratuita…) y todos los **límites de uso** (por
  escena, por día, por objetivo). El coste en acciones y el límite se guardan como dato en
  el catálogo aunque solo se muestren, para el día que exista registro de acciones
  (`docs/tareas.md`, "Panel de combate: qué aporta").
- **Efectos sobre otros personajes**: texto que lee el jugador.
- **Cambios de resultado** (*Velocista*, *Equilibrista*, *Gran Puntería*: fracaso → éxito,
  éxito → crítico; *Crítico Mejorado*: crítico con 5): **los aplica la app** al tirar, con
  su línea en el desglose.
- ***Impacto Métrico* y *Sobrecarga Métrica***: se usan con la ventana de los poderes
  (nivel empleado, fatiga, efectos por resultado).
- **Dotes de áreas sin construir** (aumentos genéticos, biónica): se pueden comprar ya; su
  efecto es texto hasta que exista el área.
- ***Olfato de Investigador*** no tiene efecto en la fuente: no aparece hasta que Murillo lo
  escriba.
- **Sobreesfuerzo** (*Potencia/Maestría/Gran Maestría Psiónica*, *Saber es Poder*): la
  regla solo existe para el implante (`docs/fuente/aumentos.md`). Las cuatro dotes quedan
  como texto hasta que Murillo la escriba para los psiónicos de nacimiento. Su efecto es
  general (todos los poderes del nivel indicado), no de una disciplina.

- **Capas de motor nuevas** (Capas de Dotes, usuario 2026-10-15; detalle en
  `docs/modelado-dotes.md` §4). **Se construyen**: `sube_grado` (fracaso → éxito),
  ventaja con casilla (*Ojo Clínico*, *Bioma Predilecto*), valor de bono según la ficha
  (*Presencia Imponente* +2 con Fuerza ≥ 5, *Imitación* +3 con Interpretación ≥ 3), crítico
  con 5 fijo (*Crítico Mejorado*), casillas que tocan el daño (*Golpe Fatigante*, *Derribo
  Brutal*), fatiga cobrada por casilla (*Ojo Clínico*) y *Salto Evasivo* como **bono
  normal** (casilla «Esquivando un área» +1; +2 en la Mejorada; vale la mejor). Cambiado
  por el usuario en D2d: antes era éxito extra que no convertía un fallo en acierto; ahora
  sí puede convertir un fallo justo en acierto. **Quedan como texto**: gasto de materiales
  (*Optimización Biotecnológica*, *Potenciar Veneno*), nota con metros calculados
  (*Arrollar*), la capa que cambiaría la opción de terreno de otra casilla (*Bioma
  Predilecto*; su +3 al rastrear en terreno adverso **sí se aplica**, como casilla: supuesto
  del redactor aceptado), poder sobre el ataque de un arma (*Impacto Métrico*: la app cobra
  la fatiga y enseña el daño extra) y el +Fuerza temporal (*Sobrecarga Métrica*).
- **Capa nueva: cambio de par** (usuario 2026-10-15, D2d): una dote cambia el aplicado y la
  habilidad con los que se tira (*Negociación Analítica*, *Cazador Cazado*, la segunda parte
  de *Vigilancia Táctica*: Perspicacia + Táctica en lugar de Empatía). No estaba entre las
  capas aprobadas; Combate Sutil no es esta capa (va con su habilitador, D2b-2). *Cazador
  Cazado* y *Vigilancia Táctica* se construyeron con sus tiradas fijas (2026-10-23, S83).

- **Golpe Mejorado con Escudo**: se construye, casilla «Golpe letal» en el ataque con escudo
  que cambia el daño a letal (va con las casillas que tocan el daño).

- **Modelo de catálogo** (`MODELO_DOTES` v2 en `scripts/workflows/modelar-area-extraer.ts`,
  usuario 2026-10-15): se aceptan los campos que piden las capas aprobadas y las lecturas de
  §9.5 (economía y límites múltiples como dato, requisito por rama, texto por grado, umbral de
  atributo o habilidad, éxito extra, apagado por fatiga, efectos sobre el daño, categoría de
  daño, filtro de arma, tope del nivel empleado, especialidad «o», bono por tramo, elección
  abierta). Se descartan los de las capas que quedan como texto. Supuestos del redactor de
  `docs/modelado-dotes.md` §11: Equilibrista y el «éxito → crítico» de Velocista van por margen
  de crítico; Sobrecarga Métrica sin descuentos de Traslación; Bioma Predilecto +3 en rastreo
  adverso; `capa_pendiente` se descarta (esos efectos se modelan como efecto real). El
  borrador `docs/modelado-dotes.json` se ajusta a v2 en la primera tanda de código.

- **UX propia** (UX de Dotes, usuario 2026-10-15; candidatas en `docs/modelado-dotes.md` §5).
  **Se construye**: *Reflejos Felinos* resta uno al contador de atacantes adicionales en la
  esquiva (mínimo 0), y las acciones de dote pueden declarar un grupo extra donde aparecer
  (*Traicionero* también en Iniciativa). **Todo lo demás, con casillas y texto**: usos por
  turno (13 dotes) → épica "Panel de combate: qué aporta"; contadores por escena, aliado u
  objetivo → texto (*Finta*: casilla «finta repetida»); acciones con disparador → siempre en
  la lista, disparador en la nota; *Especialidad Médica* una casilla por pareja comprada,
  *Bioma Predilecto* casilla «en mi bioma» por tirada, ataque doble y de oportunidad como
  texto; dos pasos (*Golpe Entorpecedor*, *Táctica de Flanqueo*) → el jugador marca la
  casilla del ataque siguiente; *Combinación* → casilla −1 en el ataque, −1 a defensas como
  texto.

*En la app (D2a, 2026-10-15):*
- Los 185 efectos del borrador (105 dotes) están en el catálogo (`npm run gen-dotes`), cada uno con su
  MotorMetadata; destino de cada alcance en `catalog/dotesDestinos.ts`. Lo que no es de D2a
  queda `pendiente` con su tanda (D2b-1, D2b-2, D2c, D2d; plan en `docs/tareas.md`, "Dotes").
- **Casillas**: los bonos con condición van como casilla en la tirada, al mismo índice que
  las de equipo y especie (`rules/dotesEfectos.ts`). Con elección, una por compra
  (*Especialidad Médica*, una por pareja). **Bonos fijos** (*Vigilancia Táctica* +2 en
  Iniciativa): Modificador de tirada con origen "dote", sale en el desglose con la dote.
  **Textos**: nota de la tirada, o texto de crítico si son del crítico (*Paso Defensivo*);
  los de "ficha" solo en la tarjeta de la dote.
- **Vale la mejor**: con la básica y la mejorada, solo da efecto la mejorada (también en
  cadena: *Movimiento Sigiloso Constante* → *Mejorado* → básica).
- Supuestos de la tanda: S34-S38.

*En la app (D2b-1, 2026-10-15): tiradas generadas por arma.*
- Cada ataque, lanzamiento, bloqueo y "Levantar [escudo]" lleva su **familia de arma** como
  dato (`Accion.familiaArma`, `combate.ts`), y el empleo de su arma: ataque melee, disparo,
  armamento pesado, lanzar arma melee, lanzar granada, bloquear melee, levantar escudo (S45).
  Las dotes con alcance `familia:<f>` ponen ahí sus casillas y textos; en "Levantar
  [escudo]", que no tiene dado, solo textos en su nota.
- **Requisito por rama** (§9.5: Asesino, Desenfundado Rápido, Golpe Entorpecedor): el efecto
  de cada rama solo sale si la ficha cumple el requisito de esa rama (S46).
- **Filtro de arma**: *Desenfundado Rápido* (y *Apresar y Apuñalar*) solo en armas a una
  mano (S49).
- **Bono por tramo**: *Tirador de Larga Distancia* +1 en larga; *Avanzado* +2 en larga solo
  si el ataque va en especialidad (anula el −2); con las dos, vale la mejor en cada ataque
  (S47).
- ***Crítico Mejorado***: crítico con 5 éxitos, fijo y sin casilla, en los ataques con armas
  de la especialidad elegida (ni al lanzar ni al bloquear); su línea sale en las notas del
  resultado (S48).

*En la app (D2b-2, 2026-10-15): maniobras que solo existen con su dote (§9.2).*
- ***Bloqueo***: habilitador con arbitraje duro. Sin la dote no sale ninguna "Bloquear con X"
  (armas melee, Bayoneta, Aguijón del Proyector de Pulso). Con ella, como antes (especialidad
  del arma, S40) más la casilla «Desarmado frente a atacante armado» (−3), con su excepción
  (ataque natural o desarmado letal) como texto, y los textos de *Bloqueo* (solo contra melee,
  tamaño, daño al bloquear; contraataque en el crítico), *Contraataque Rápido*, *Maestro en
  Contraataque*, *Combinación* y *Combinación Rápida*.
- ***Combate Sutil***: sin la dote no hay estilo Sutil en golpes ni bloqueos melee (ni
  interruptor en la fila): se tira con Potencia y el daño va con Fuerza. El Aguijón, con
  Potencia sin la dote y Reflejos con ella (S51).
- Requisito no cumplido ⇒ como sin la dote (S34). El NPC del máster no se salta el gate (S50).
- Supuestos de la tanda: S50-S52.

*En la app (D2c-1, 2026-10-15): acciones propias de dote.*
- **Sección "Dotes" en Acciones** (`rules/dotesAcciones.ts`, `FichaResuelta.accionesDotes`):
  cada acción de una dote activa sale como fila; sin dotes con acción no hay sección, y con
  el requisito roto la acción no sale (S34). Tirada y enfrentada → fila de tirada con el texto
  por grado y lo que tira el rival en el resultado; sin dado → "Usar" con su nota (*Paso
  Atrás*, *Salida Explosiva*, *Ataque de oportunidad*, *Combinación*). Economía, límites,
  dificultad a criterio y gasto de materiales: texto en la nota.
- **Especialidad** en la resolución → la fila va en especialidad sola (S54). ***Arrollar***,
  tirada de ataque Potencia + Combate Melee en Pelea (S53). ***Traicionero*** sale también en
  Iniciativa (S56).
- **Lo que otras dotes ponen en una acción de dote**: los textos de *Ataque de Oportunidad
  Poderoso*, *Múltiple* y *Maestro Oportunista* en la nota del ataque de oportunidad (con
  Maestro, el de Múltiple no sale: vale la mejor); la casilla «Finta repetida» (S57).
- ***Reflejos Felinos***: un atacante menos en la esquiva (S55).
- ***Combinación***: sin casillas nuevas (el −1 ya está en los golpes melee y el −1 a defensas
  en la nota de Esquiva y Bloquear).
- Quedan para **D2c-2**: *Impacto Métrico*, *Sobrecarga Métrica* (poderes de dote) y los
  textos de *Onda Residual* e *Impacto Métrico Relámpago* en las tiradas de poder.
- Supuestos de la tanda: S53-S59.

*En la app (D2c-2, 2026-10-15): poderes de dote y textos de dote en los poderes.*
- **Poderes de dote** (`rules/dotesPoderes.ts`, `FichaResuelta.poderesDotes`): *Impacto
  Métrico* (Singularidad) y *Sobrecarga Métrica* (Traslación) son poderes normales al nivel
  de su disciplina (el mismo que usan los poderes), en la sección "Dotes" de Acciones con la
  misma fila y la misma ventana que los de Psiónica: nivel empleado, 1 de fatiga por nivel
  empleado, casillas externas, sobrecarga y peaje como cualquier poder. Requisito roto ⇒ no
  sale (S34); sin la disciplina, tampoco. Sin las reglas propias de la disciplina (S61).
- ***Impacto Métrico*** no tira en la app (S60): la ventana cobra la fatiga y enseña el daño
  extra (2 + nivel empleado, letal) y, con el vector descendente, la compresión (S62).
- ***Sobrecarga Métrica***: tirada Perspicacia + Biociencia (Medicina), dificultad 5 + nivel
  empleado; el daño propio por resultado se resta solo; el +Fuerza es dato y texto (S63).
- **Textos de dote en un poder** (destino "poder", por el id de su acción): `prepararPoder`
  recibe los textos de la ficha y pone los de ese poder en la nota o el crítico de su tirada;
  si no tira, en las notas de su ventana (S64). *Onda Residual* → Expansión; *Impacto
  Métrico Relámpago* → Impacto Métrico.
- Supuestos de la tanda: S60-S64.

*En la app (D2d): casillas que hacen algo más que sumar.* Construidas todas las capas de
arriba; 0 pendientes de D2d.
- **Una casilla por dote, destino y condición** (`rules/dotesEfectos.ts`): lo que traen los
  efectos de esa condición va junto en la misma casilla (S69). La casilla puede, además de
  sumar: dar **ventaja** (dos d12, vale el mejor; *Ojo Clínico* cobra 1 de fatiga al tirar,
  *Bioma Predilecto* en Iniciativa y Subsistencia), convertir el **fracaso en éxito**
  (*Balanceo*, *Como Pez en el Agua*: solo el fracaso normal, S66), bajar el **margen de
  crítico** (*Equilibrista*: cualquier éxito es crítico; *Especialidad Médica*: crítico con
  5, en la misma casilla que su +1), cambiar el **aplicado** (*Negociación Analítica*:
  Perspicacia en vez de Expresión en Convencer / mentir, S70) y tocar el **daño** del golpe.
- **Valor por umbral de ficha**: *Presencia Imponente* (+1, +2 con Fuerza ≥ 5) e
  *Imitación* (+2, +3 con Interpretación ≥ 3) ponen una sola casilla con el valor que toca
  según la ficha (valores de requisito: con especie, sin equipo; también el NPC). S38
  resuelto.
- **Ventaja en acciones de dote**: *Apoyo* (vínculo fuerte) y *Violencia Aterradora* (tras
  un crítico), casilla en la propia acción (`rules/dotesAcciones.ts`).
- **Daño**: *Golpe Fatigante* −1 al daño (mínimo 0), solo con armas contundentes o a dos
  manos (S67); *Golpe Mejorado con Escudo*, casilla «Golpe letal» en el golpe con un arma de
  Escudos que pasa el daño a Letal; maniobra **Derribo** (habilidades.md) solo con *Derribo
  Mejorado* o *Derribo Brutal*: casilla «Derribo» en los golpes melee, −2 y daño básico sin
  bono por éxitos, la resistencia del rival en su nota; con *Brutal* sin −2, y su casilla
  «Derribo con acción estándar» devuelve el bono por éxitos (S68).
- *Salto Evasivo*: bono normal (ver arriba).
- Supuestos de la tanda: S66-S71.

### 9.4 Fichas y NPCs `[FIRME · usuario 2026-10-14]`
- **Fichas ya aprobadas**: no reciben los puntos de dotes de su letra; compran dotes con
  experiencia.
- **NPCs**: el máster les pone dotes a mano, sin requisitos ni coste.

*En la app (2026-10-15, tarea "Dotes para los NPC"):* pestaña Dotes del editor de NPC,
modo libre (`CONTEXTO_LIBRE`, `rules/dotes.ts`). Se ven los requisitos (✓/✗) pero no
bloquean, no hay pool, XP ni marca de requisito roto, y se quita siempre (también una que
es requisito de otra). Sí se mantiene lo que no es requisito: Olfato de Investigador
oculta, elección obligatoria y repetibles. *Crítico Mejorado*: las especialidades de arma
que tenga el NPC, en cualquier habilidad (S65).

### 9.5 Lecturas de la prosa `[FIRME · usuario 2026-10-15, Preguntas de Dotes]`
De las 160 preguntas del modelado (`docs/modelado-dotes.md` §9) quedaron 9; el resto lo
resolvían §9.1-9.4, `docs/fuente/habilidades.md`, `docs/fuente/reglas-base.md` (Miedo, Asfixia)
o eran texto. Decidido:
- **Requisito de especialidad con número** («Humor 2»): la habilidad a 2 o más **y** tener
  elegida esa especialidad.
- **Cambio de resultado** (*Balanceo*, *Velocista*…): solo el fracaso normal pasa a éxito;
  el fracaso crítico se queda.
- ***Imitación***: casilla «Imitando a alguien» en Convencer / mentir.
- ***Especialidad Médica***, «hemorragia y herida»: solo el estado Heridas, no toda cura.
- **Sin *Combate Sutil* no hay modo sutil**: tirada con Potencia y daño con Fuerza, también
  el Aguijón del Proyector de Pulso.
- ***Combinación Rápida***: ataque a ataque (el sutil no lleva −1); el −1 a defensas solo se
  va si los tres fueron sutiles.
- **Ataque de oportunidad**: sin la dote **nadie** lo hace, en ningún caso (tampoco por
  Finta, Presa, Desarme o Táctica de Flanqueo).
- ***Arrollar***: a las criaturas solo daño en crítico, el básico del Derribo; a los
  obstáculos, el daño normal.
- ***Potenciar Veneno***: «nivel de la toxina» es el nivel de objeto (1-4) del equipo.
- **Lecturas tomadas por obvias** (validadas sin veto): *Apoyo* vínculo fuerte = casilla de
  ventaja; *Humor Negro* repite contra la misma dificultad; *Humor de Afrontamiento* y
  *Llamada a las Armas* solo a aliados; *Enredar* +2 con casilla; *Imitación* +3 mira
  Interpretación entera; *Reflejos Felinos* −1 al contador de atacantes solo en esquiva;
  *Salto Ofensivo* mantiene el +2 de dificultad y "a distancia" incluye lanzar; *Zafarse* =
  liberarse como reacción estando Atrapado; *Especialidad Médica* solo en tiradas de quien
  trata; *Ojo Clínico* casilla en Medicina y la fatiga solo paga la ventaja; *Autocuidados*
  "no fatigado" = ni Fatigado ni Exhausto y "emocional" lo marca el jugador; *Potenciar
  Veneno* fracaso crítico = fracaso; "reduce la dificultad en 1" = +1; *Arrollar*
  Potencia + Combate Melee, una tirada; *Combinación* −1 solo a esquiva y bloqueo; *Crítico
  Mejorado* no repetible y no vale al lanzar; *Derribo Brutal* casilla; *Finta* −2 fijo y
  *Maestro de Fintas* lo quita tras finta con éxito; *Golpe Fatigante* siempre −1 al daño
  (mínimo 0), puñetazo y patada son contundentes; *Asalto Sigiloso* = Sigilo normal; *Golpe
  Entorpecedor* la debilidad vale un ataque; *Asesino*, *Desenfundado Rápido*, *Golpe
  Entorpecedor*: cada rama exige su requisito; *Táctica de Flanqueo* +3 melee o distancia;
  *Dominio Elevado* vale en maniobras; *Gran Puntería* = acción Apuntar (construida
  2026-10-23, §6 "Tiradas fijas"); *Precisión
  Imperturbable* Apuntar gratis pero se tira; *Tirador Avanzado* "de especialidad" = con una
  especialidad que se tenga; *Bioma Predilecto* subsistencia siempre en su bioma,
  iniciativa solo en combate, lista abierta, no repetible; *Descartar Teoría* repite con
  −2; *Saber es Poder* no pide psiónica; vector descendente daño letal que se suma; nivel
  empleado con tope en Singularidad/Traslación y la fatiga se paga aunque falle; "volado" =
  voleo; la ventaja no se acumula.
- **Dotes de Pistolas y Armas Impulsoras** (foto 2026-10-23; lectura de esta tanda, sin
  confirmar): *Pistolero* = casilla «Disparo doble» −1 ("cada ataque aumenta su dificultad
  en 1") más texto, solo en armas de la especialidad Pistolas empuñadas (no el Proyector de
  Pulso). *Pistolero Infernal* y *Arquero Poderoso*, solo texto en sus disparos: la app no
  cobra la fatiga de Arquero Poderoso ni recalcula el daño. `TODO(revisar)` en
  `scripts/generar-catalogo-dotes.ts` (FILTROS_ARMA): si "sumando su total de puntuación de
  fuerza" es daño Fue + 8 en vez de 1/2 Fue + 8 o un bono a la tirada, si vale la Ballesta
  ("con arco"), y si Pistolero Infernal arrastra el +1 de dificultad de Pistolero.

### 9.6 Pendiente de Murillo
Efecto de *Olfato de Investigador*; regla del sobreesfuerzo biológico; mejoradas sin la
básica (lo pregunta el usuario). No se siembran en `/preguntas` por ahora.

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

### 10.5 Mecánica de resolución `[FIRME · CONV-5]`

Respuestas de Murillo (2026-09-23) a las preguntas 14, 15, 17, 18 y 19. Sin efecto en la
app todavía — el catálogo de poderes psiónicos sigue sin existir (Fase 5) — pero cierran
el diseño para cuando llegue.

- **Pregunta 14, resuelta:** mente y máquina **no son mecánicas separadas, pero tampoco
  una única tirada universal**. Usan el mismo poder y el mismo marco conceptual (la base
  de la sección 10.0-10.3), pero cada poder concreto está pensado para un tipo de objetivo
  — orgánico o sintético — y la tirada y las consecuencias cambian según cuál sea (ejemplo
  de Murillo: Modulación es un poder pensado para sintéticos). No hay "un motor, dos
  entradas" limpio como proponía la pregunta original — hay un motor, y cada poder declara
  para qué tipo de objetivo vale.
- **Preguntas 15/19, resueltas — norma general de qué tirada resuelve cada poder:** *"lo
  indica cada poder"* (no hay una tirada universal), pero Murillo da la norma por defecto:
  - Objetivo **orgánico no psiónico** → Voluntad + Actitud (lo tira quien intenta influir).
  - Objetivo **sintético** → Perspicacia + **"Informática"**.
  - Objetivo/resolución **psiónica** → tirada enfrentada de Voluntad + Biociencia (los dos
    bandos).

  **Ojo, sin corregir a propósito:** "Informática" no es ninguna de las 10 habilidades de
  la sección 3 (la más parecida es Tecnociencia). No lo doy por Tecnociencia sin más
  porque sería una decisión nuestra, no la palabra de Murillo — se deja tal cual la dijo,
  pendiente de que confirme si es un nombre informal de Tecnociencia o una habilidad
  nueva que falta añadir a la lista.
- **Pregunta 17/21, resuelta:** fallar una intrusión psiónica **no tiene una consecuencia
  única** — cada poder describe sus propios grados de fracaso (fracaso y fracaso crítico),
  y varían: "a veces no pasa nada, a veces hay daño y aturdimiento". Mismo patrón que ya
  usa el catálogo de equipo (efecto por grado de resultado), no hace falta una regla
  aparte.
- **Pregunta 18/22, resuelta:** sí existen sistemas digitales **no cuánticos** (legacy) —
  "no son lo más común, es tecnología que existió y sigue existiendo". Confirma la razón
  de diseño para que convivan hackeo psiónico y hackeo digital clásico: el legacy es
  terreno exclusivo del segundo.
- **Pregunta 19/23, resuelta:** sí existen interfaces para que un **no psiónico** se
  entrelace con un sistema cuántico — es la propia tecnología con la que se entrena a los
  aspirantes a psiónico. Cara y arriesgada para quien no está entrenado, y ocupa bastante
  (el tamaño de una habitación normal), no es portátil. Ejemplo de Murillo: la cabina del
  navegante en naves con salto al hiperespacio — el salto lo hace un psiónico, pero sin el
  apoyo técnico de la nave sería incapaz o moriría.

**Sigue abierta, sin respuesta en esta tanda:** la pregunta 16 (¿la defensa de un sistema
es un número fijo del objetivo o una tirada enfrentada?).

### 10.6 Catálogo de poderes: reglas de uso `[FIRME · usuario 2026-09-28 + docs/psionica.md]`

La prosa literal vive en `docs/psionica.md` (de `docs/Psiónica.pdf`). Decisiones del usuario
al preparar su modelado:

- **Coste**: cada disciplina (Resonancia, Inducción, Hipercongnición, Traslación, Contención,
  Singularidad) se compra por separado, nivel N a N×3, igual que atributos (×2) y
  habilidades (×1).
- **Nivel empleado**: con nivel N en una disciplina se puede usar cualquier nivel ≤ N.
- **Tabla de niveles de Resonancia**: su fatiga/acción/alcance es lo que dice la tabla para
  el nivel empleado y **sustituye**, no acumula (nivel 2 cuesta 2, no 1 + 2).
- **Sobrecarga** (pasar de exhausto → inconsciente + salvación de Fortaleza 5 + nivel, texto
  de Métrica): aplica **también a Metasensoria**, y salta **al cruzar el umbral de exhausto
  (<10% de la fatiga) con un gasto psiónico**. **No se puede gastar fatiga que no se tiene**;
  0 de fatiga = inconsciente. Excepción, Proeza: ver "Fatiga temporal" abajo.
- **Coste mínimo de fatiga de un poder = 0** (usuario, 2026-09-28): los descuentos pueden
  dejarlo gratis, salvo que la prosa especifique "mínimo 1" (Traslación nv6), que entonces
  manda.
- **Gasto de fatiga semi-global**: el coste de fatiga de cualquier poder pasa por una sola
  cadena de modificadores (descuentos por nivel poseído, ×2 de Munición Supresora, "ignora el
  primer nivel" de Xovromium, conversión con cargas de Derivación Psiónica…), no se aplica
  poder a poder.
- **Porcentajes de alcance** (Derivación Psiónica n2, pregunta 33): valen tal cual; el alcance
  es informativo (metros/km) y multiplicarlo no exige un tipo de bono nuevo.
- **"Informática", "Física", "Mecánica", "Medicina", "Biónica"** son especialidades de
  Tecnociencia/Biociencia (cierra la duda de "Informática" de 10.5). En el catálogo de poderes
  van por id (`fisica`, `informatica`; tanda ESP).
- **Efectos mantenidos se acumulan** (varios poderes activos a la vez).
- **Estados nuevos** que nombra la psiónica (asustado, aterrorizado, confuso crítico,
  indefenso, coma, asfixia…): se apuntan en la lista de estados y se parametrizan más
  adelante; en la tirada basta mostrar el texto ("aplica miedo").
- **Ventaja** (tirar 2 dados y quedarse el mejor; Alerta nivel 4): mecánica propia y
  genérica, no un parche de Alerta.
- **Efectos activos con duración sobre uno mismo** (bonos de Precognición, absorción y
  −Agilidad de Contención…) y **concentración/mantenimiento**: se llevan **a mano**, fuera del
  motor por ahora.
- **Xovromium** (`docs/equipamiento.md:1338`, "+1 a las manifestaciones psiónicas"): toggle
  de +1 en **toda tirada que resuelva un poder**. ~~Visible si el personaje tiene Xovromium
  en recursos~~ — **sustituido 2026-09-30: siempre visible** (ver "Fuentes externas, tanda
  1" abajo).
- **"Psiónico entrenado"** (el que resiste con Voluntad + Biociencia en vez de Voluntad +
  Actitud): cualquiera con **Biociencia ≥ 1** (entrenada).
- **Fatiga temporal (Proeza) — confirmada por el usuario 2026-09-28.** Proeza
  es la única acción que puede gastar más fatiga de la que se tiene. Ese extra se apunta
  aparte como *fatiga temporal*: cuenta para los umbrales (fatigado/exhausto/inconsciente)
  mientras dura, y al cerrar la escena se devuelve ("volverá al nivel de fatiga que le
  correspondiese"). Si la fatiga efectiva llega a 0 o menos, inconsciente al terminar la
  acción; al 200% de carga, además, el nivel de daño mental que ya dice la prosa.
- **La app solo aplica lo de la ficha de quien tira.** Lo que le toca hacer al objetivo
  (esquivar, resistir un empuje, salvar contra un estado, pruebas encadenadas) se muestra
  como **texto con sus cuatro grados en el panel de resultado**, después de tirar; no se
  estructura ni se tira por él.
- **Dificultades**: la app no las calcula. El máster dice el número y el jugador lo escribe
  (interferencias, distancia, objetivo conocido/desconocido van dentro de ese número). Como
  mucho, botones de referencia (p.ej. conocido / vagamente conocido / desconocido) si caben.
- **Fatiga condicional**: los descuentos/incrementos de fatiga pueden depender de la opción
  elegida (forma ampliada ×2) o de una condición que declara el jugador con un toggle ("soy 2
  niveles superior" en Duelo de Métrica, "carga < 10 kg").
- **Avisos fijos** ("ignora cobertura ligera", "ignora escudo deflector"...): nota antes de
  tirar si afecta al impacto, nota en el daño si afecta al daño. Lo que hay que saber antes
  de actuar (Sincronía: "si no conoces al objetivo, primero Rastreo") va en la tirada.
- **Cuestionario de modelado (usuario, 2026-09-28)** — 26 decisiones, principio común: la app
  calcula lo que sale de la ficha propia; lo que depende de contar cosas en mesa va como
  mensaje y se ajusta a mano.
  - *Sale de la ficha, la app lo calcula/aplica*: daño mental propio del mensaje agresivo
    (se resta al confirmar); habilidad alternativa ("biociencia o actitud") con selector
    preseleccionando la más alta; tipo de acción final ya rebajado por nivel (Resonancia
    nv2/4/6); "Alcance local" como opción de toda acción de Resonancia (reacción desde nv3);
    ventaja automática también en "Buscar / percibir" con Resonancia 4+ (con UI que enseñe los
    dos dados); toggle "Estabilización como reacción" +3/+4 en las salvaciones; penalizadores
    propios fijos (Proyección −2 como dificultad de manejo de arma; toggle −4 fuera de alcance
    local en Inducción nv5); carga máxima con Perspicacia aplicada; objetivo y área calculados
    en Singularidad; dificultad del objetivo ya sumada al marcar "Poderoso"; sobrecarga: aviso +
    salvación de Fortaleza calculada + daño según grado aplicado; fatiga temporal de Proeza como
    contador en Recursos con "Terminar escena".
  - *Levitación*: nuevo tipo de movimiento "Levitar" en la ficha, velocidad 10 × nivel m.
  - *Grados de Inducción*: texto post-tirada traducido al punto de vista del psiónico (si gana
    por 6+, se muestra el "fracaso crítico" del objetivo).
  - *Mensaje + a mano*: objetivos múltiples (Comando nv3, Modulación nv4/nv6, Anclaje) — se
    muestra el coste por objetivo y el jugador se descuenta la fatiga; Proeza: nota "+1 de
    fatiga por cada 10% de peso extra", fatiga a mano; área/duración de Contención ampliada:
    no se calcula, se mira en el manual.
  - *Notas, no acciones*: Alertar por Vínculo, Confrontar (Contención), "requiere objetivo
    anclado" (Trasladar/Proyección), Alerta pasiva exhausta (aviso, se puede tirar).
  - *Acciones propias*: "Duelo de Métrica" como reacción en fichas con Traslación, con toggle
    "soy 2 niveles superior". Auto-anclaje: siempre con tirada de Reflejos + Física.
  - *Hipercongnición*: sus tramos (distancia, tiempo transcurrido) son una opción que fija
    tiempo y fatiga; el nivel solo rebaja tiempos y dificultad.
- **Convenciones generales (usuario, cuestionario 2, 2026-09-29):**
  - **"Nivel de poder" a secas = nivel POSEÍDO** en la disciplina (no el empleado). El
    empleado solo cuando la prosa dice "nivel empleado" o la tabla lo fija por fila.
  - Poder sin resultados por grado: éxito = funciona, fracaso = no funciona, críticos sin
    efecto extra. La fatiga se paga aunque falle. Estado sin duración escrita = 1 turno.
  - Descuentos de fatiga por nivel se acumulan hasta 0 (mínimo 1 solo si la prosa lo dice).
  - Coste propio de una acción de Resonancia = uso cercano/local; si se elige un alcance de
    la tabla, esa fila sustituye tipo de acción y fatiga. En Traslación, la acción que dice su
    coste (Sensor, Proyección, Levitación) paga ese; la que dice "según carga y nivel" paga la
    tabla; la regla general de Métrica (1 por nivel) solo si no hay nada más. Levitar cuesta
    solo 1/minuto (10 min en nv4, 1 h en nv6), sin la fila de la tabla.
  - Sin fatiga suficiente el botón no deja confirmar (salvo Proeza). La fatiga se descuenta
    de la ficha, también en combate. Orden de la cadena: coste base → descuentos por nivel →
    ×2 Munición Supresora → Xovromium −1 → mínimo → pago con cargas (Derivación Psiónica).
  - Alerta psiónica pasiva: **tirada normal** (no un número pasivo).
  - Resonancia nv2 "acciones de nivel 1" = las usadas a nivel empleado 1, incluido el local;
    nv6 "duración a 1 minuto para nivel 4" = tiempo de acción de la tabla.
  - Estabilización cuesta 1 de fatiga (como Supresión); su +3/+4 sustituye al +2.
  - ~~Biónica es especialidad de Tecnociencia.~~ **Tumbado por `docs/fuente/habilidades.md`
    (2026-10-14): Biónica es especialidad de Biociencia** (también en `DOTES`).
- **Respuestas de Murillo (web `/preguntas`, 2026-09-29):**
  - *Resonancia*: alcance local con Inducción es un permiso extra. Barreras de lenguaje o
    biología y códigos encriptados suben la dificultad (los encriptados pueden pedir varias
    acciones). Mensaje agresivo: si no dice qué pasa al fallar, no pasa nada. Barrera
    idiomática fallida: el mensaje llega pero no se entiende. Rastreo ×2/×10 multiplica el
    tiempo de la fila de la tabla usada. Darse cuenta de Leer Mente: prueba libre según los
    conocimientos del objetivo. Alerta activa: acción estándar (mejorará en niveles altos,
    sin definir). Vínculo: el "punto de poder" es el nivel en Resonancia (nivel 5 = 5 km²);
    tantos aliados como fatiga se tenga.
  - *Inducción*: Comando nv2 cuesta 1 y usa la prueba base; en acciones extremas se repite la
    salvación original (Voluntad + Biociencia o + Actitud). Hipomanía vale sobre aliados.
    Supresión: nv2 = 10 min × nivel, nv4 = **30 min × nivel**; el uso +2 a salvación también
    tira contra 10 y cuesta 1. Estabilización nv4 omite por completo los penalizadores de
    daño y fatiga durante la misma duración. Reconfiguración: basta la acción compleja; cambios
    profundos piden acción mantenida con concentración (incluso horas).
  - *Hipercognición*: tiene nivel 6; −1 de dificultad en nv4 y −2 en nv6. **Errata en Sondeo:**
    el éxito crítico debería durar turnos por nivel de poder y prolongarse gastando fatiga; el
    éxito normal dura como máximo turnos por nivel, sin prolongar. El tramo local baja a simple
    en nv5. Precognición: las salvaciones no cuentan como tiradas defensivas; el fracaso
    crítico dura 1 turno.
  - *Traslación*: la carga máxima de Anclaje es el total de todos los objetivos; oponerse al
    escape no cuesta fatiga; anclaje colectivo pasa a acción estándar (nv4). Trasladar: una
    tirada inicial y dura lo que dura; si el objetivo se resiste, enfrentadas; al acabar el
    tiempo se paga fatiga y se mantiene sin nueva tirada de ataque. Proeza: Potencia +
    Atletismo dificultad 10 ("si no recuerdo mal"). Sensor: la habilidad para identificar
    depende del objetivo (Bio o Tecnociencia). Proyección sin blanco: tirada de ataque, pero
    casi siempre se resuelve sin tirada salvo que sea determinante.
  - *Contención*: nivel 2 personal = igual que nivel 1. La tabla de fatiga es la que es. La
    absorción cubre todo daño menos el mental y no se puede reducir con efectos antiblindaje.
    "Quieto" sustituye la absorción, no suma. Ir contra el ataque consume la reacción. Sumarse
    a una ampliada ajena pide nivel 1 y fatiga; el foco sigue siendo el psiónico principal.
    Los protegidos (psiónicos o no) pueden quedarse quietos, ir contra el ataque o esquivar,
    con el coste de acción normal. Entre contenciones se usa la mejor, no se apilan.
  - *Singularidad*: Poderosa cuesta +1 de fatiga plano. "Cobertura ligera" = follaje, neblina,
    una caja de cartón (interpretación del máster). Expansión: con éxito cae en la casilla
    elegida; cada fallo la desvía una casilla. Expansión Poderosa +1 no es errata (sube daño y
    dificultad de esquiva). Convergencia: "armadura de plasma" = Malla Plasmática; la pérdida
    de absorción es permanente; sin armadura el fuego del fracaso se queda en el primer nivel
    ya recibido, con llamarada igualmente (el mínimo de fuego es 1).
- **Lo que Murillo dejó a medias, decidido por el usuario (2026-09-29):**
  - Hipomanía sobre un aliado dispuesto: no tira, se aplica directamente el Éxito.
  - Alerta nivel 4: **toggle "+2 por Resonancia 4"** en las dos tiradas de alerta (Buscar /
    percibir y la Alerta psiónica), además de la ventaja automática ya decidida.
  - Ir contra el ataque (Contención): consume la reacción; el daño (nivel empleado) lo recibe
    el objeto bloqueado — hoy la app no modela daño a objetos, llegará. Fatiga extra: la prosa
    no la menciona, se asume ninguna.
  - Expansión: el daño no decae aparte (la decadencia es el −4 por casilla al esquivar);
    afecta a todo lo que haya en el área, aliados y el propio psiónico incluidos.
  - Proeza: límite del 200% de la carga máxima del nivel (inconsciente + 1 daño mental al
    llegar); se resuelve con Potencia + Atletismo dificultad 10.
  - Sobrecarga: inconsciencia automática; la salvación de Fortaleza (5 + nivel empleado) solo
    decide el daño letal no absorbible = nivel empleado (crítico 0, éxito la mitad, fracaso
    todo, fracaso crítico el doble).
- **Cierre del modelado (usuario, 2026-09-29):**
  - **Regla general: si la prosa no lo dice, lo decide el máster en mesa.** Cubre los detalles
    de segundo orden que salieron en el último modelado (grados exactos de un estado,
    redondeos, a qué tiradas afecta un penalizador del objetivo…); se muestran como texto.
  - "Quemar las sinapsis" al resonar con máquinas es ambientación, sin mecánica.
  - Acción de Resonancia sin coste propio en alcance local (Rastreo): cuesta 1, como la fila 1.
  - Sobrecarga en poderes que no eligen nivel (Comando, Supresión, Sensor, Levitar…): cuenta
    el nivel poseído en la disciplina.
  - Las rebajas de tipo de acción no bajan de simple (gratuita solo si la prosa lo dice).
  - Hipercognición: −1 de dificultad en nivel 4 y −2 en nivel 6 (el 2 no rebaja).
  - Traslación: carga < 10 kg cuesta 0 (el nv3 manda; el "mínimo 1" del nv6 solo limita su
    propia rebaja); estos descuentos solo afectan a las acciones que pagan la tabla, no a
    Proyección ni Levitar.
  - Contención ampliada con colaboradores: el foco paga lo normal (sin ×2) y cada colaborador
    1 por casilla que añade. La personal es acción simple en todos los niveles.
  - Impulso Poderoso: empuje de 8 × nivel **poseído**. Las versiones Poderosas **suman** sobre
    el nivel empleado elegido (+1 fatiga; Impulso +2 daño y +1 dificultad del empuje; Expansión
    +1 daño y +1 a esquiva y expulsión; Convergencia +2 daño).
  - Acciones y opciones de nivel no alcanzado: no aparecen en Acciones.
  - La app no cuenta acciones por turno: el tipo de acción es solo una etiqueta.
- **Construcción (usuario, 2026-09-29):** al resolver un poder, las opciones elegidas
  sustituyen lo que traen salvo las **notas, que se añaden** a las de la acción (la nota de
  "Impulso Poderoso" no borra "ignora la cobertura ligera"). Los textos con "la mitad" de un
  valor redondean hacia abajo, y también el daño de sobrecarga con éxito (nivel 3 → 1; nivel
  1 → 0). Lo que tira el objetivo se muestra siempre tras tirar (plegado), no solo con éxito.
  La inconsciencia por sobrecarga se avisa; el estado lo marca el máster en la consola.
  Expansión fallada deja tirar daño (base, sin bono por éxitos): se desvía y estalla igual.
- **Construcción de Traslación, tanda 1 (usuario, 2026-09-30):**
  - Anclaje se tira como **ataque sin daño** (Perspicacia + Física, dificultad que escribe el
    jugador); la esquiva, el escape enfrentado y el Duelo de Métrica del objetivo son texto.
  - "Anclaje pasa a ser acción simple" (nivel 4) se aplica al anclaje de **un** objetivo;
    anclar a varios a la vez pasa de compleja a **estándar** (Murillo, respuestas del
    2026-09-29: "anclaje colectivo pasa a acción estándar (nv4)"; corregido 2026-10-19, T-004).
    Añadir un objetivo en otro turno sigue estándar (sin respuesta).
  - Auto-proyección es una acción aparte de Proyección (sin tirada ni objetivo). Qué
    velocidad dobla o cuadruplica (carrera o traslación de 10 × nivel) no lo dice la prosa:
    **preguntado a Murillo** en `/preguntas` (Traslación); mientras, a criterio del máster.
- **Construcción de Traslación, tanda 2 (usuario, 2026-09-30):**
  - Auto-anclaje: "el gasto apropiado de fatiga" = la fila de la tabla del nivel empleado,
    con tu propio peso como carga (y sus casillas de carga). Reacción, dificultad 6.
  - Levitar: movimiento en Personaje → Estado (10 × nivel poseído m) y acción sin tirada de 1 de
    fatiga por periodo (1 min; 10 min desde nivel 4; 1 h en nivel 6); prolongar = volver a
    usarla. Mientras levitas, la Defensa / esquiva tiene la casilla **"Levitando: Física"**
    (fichas con Traslación 2+): cambia Atletismo por Tecnociencia, entera con la
    especialidad Física y la mitad sin ella (regla general de especialidades) (usuario,
    2026-09-30).
  - Duelo de Métrica: tirada enfrentada en toda ficha con Traslación; la dificultad es el
    total de quien te ancla. Casilla "soy 2 niveles superior" = coste 0.
- **Construcción de Traslación, tanda 3: Proeza (usuario, 2026-09-30):**
  - Ficha v13 con `fatigaTemporal`. Proeza paga la fila del nivel empleado (sin casillas
    de carga) y lo que no llega va a fatiga temporal; es la única acción que no se bloquea
    sin fatiga. Fatiga efectiva = actual − temporal: es la que cuenta para sobrecarga y
    bloqueos. "Terminar escena" (Recursos) la devuelve a 0.
  - **Peso del objetivo (usuario, 2026-09-30, sustituye al extra "a mano"):** el jugador
    escribe el peso y la app calcula el extra: **+1 por cada 10 % completo** de exceso sobre
    la carga máxima de la fila, mínimo +1, cobrado junto a la fila (primero de la fatiga
    normal, el resto a temporal). Sin peso, sin pasar de la carga máxima o **por encima del
    200 %**, no deja tirar (con carga máxima 0, nunca). "Prolongar un turno" tras tirar
    vuelve a cobrar solo el extra.
  - Al llegar al 200 % justo: la app resta 1 de vida (daño mental sin absorción) al usarla y
    avisa de la inconsciencia; la inconsciencia no se aplica como estado. Con fatiga efectiva ≤ 0 tras
    cualquier poder, aviso de inconsciencia al terminar la acción.
- **Construcción de Contención (usuario, 2026-09-30):** un poder sin tirada con tabla por
  nivel empleado (fatiga, absorción, absorción quieto, contra el ataque = 2 × quieto,
  −Agilidad, daño al objeto = nivel empleado) que se enseña como datos y se aplica a mano.
  Duraciones y rebajas de −Agilidad por nivel poseído según la prosa; con nivel 6, el nivel 1
  personal es gratis la primera hora y sin −Agilidad *(supuesto: la Agilidad a 0 vale para
  el nivel 1 en cualquier forma; el "gratis 1 hora", solo en la personal, como dice la
  prosa)*. Formas: personal (simple), ampliada (estándar, ×2) y ampliada como foco con
  colaboradores (sin ×2). Colaborar en la ampliada de otro es una acción aparte (1 de
  fatiga, tipo de acción a criterio del máster: la prosa no lo dice).
  - Sensor: el radio (nivel × 2) va sin unidad, a criterio del máster, hasta que Murillo la
    diga. La carga máxima se enseña solo en las acciones que pagan la fila (Anclaje,
    Trasladar); no se comprueba, es dato.
- **Construcción de Resonancia, tanda 1 (usuario, 2026-09-30):** Sincronía, Mensaje
  agresivo, Superar la barrera, Rastreo y Leer Mente.
  - Toda acción con alcance elige **Local** (su coste propio, 1 km², cuenta como nivel
    empleado 1; es la opción por defecto), **Local, reacción** (desde nivel 3) o una fila
    1-6 de la tabla, que sustituye tipo de acción, fatiga y alcance. Rebajas por nivel
    poseído tal cual la tabla (nv2 baja un paso lo usado a nivel 1; nv3 −1 a niveles 1-2;
    nv4 nivel 2 = compleja; nv5 −1 a niveles 3-4; nv6 −1 a niveles 4-5 y nivel 4 = 1 minuto).
  - Mensaje agresivo y Superar la barrera son **acciones aparte** de la Sincronía (tiran;
    la Sincronía no). Mensaje agresivo: habilidad Biociencia o Actitud con selector que
    preselecciona la más alta; 1 de daño mental propio que se resta al tirar.
  - *Supuestos (la prosa no lo precisa):* Superar la barrera no tiene coste ni acción
    propia (va con la Sincronía). Rastreo en local es acción estándar (la de "Alcance
    local" de la tabla) y 1 de fatiga. El "Local, reacción" vale también para el Mensaje
    agresivo (la prosa dice "sincronía"). El ×2/×10 de Rastreo sobre una acción (local o
    fila 1) no se convierte en tiempo: sale como nota "tarda N veces lo normal".
  - Leer Mente: grados desde el psiónico — su fracaso (el objetivo salva) aún da 1 turno
    de lectura; su fracaso crítico (el objetivo saca crítico) no da nada y el objetivo nota
    la anomalía.
- **Construcción de Resonancia, tanda 2 (usuario, 2026-09-30):** Alerta pasiva, Alerta
  activa y Vínculo.
  - Alerta pasiva y activa son dos acciones (cambian alcance y unidades). Pasiva: tirada
    normal, dificultad 6, sin fatiga, 20 m × nivel poseído; estar exhausto es solo una nota.
    Activa: estándar, 1 de fatiga, 1 km², dificultad 8.
  - **La Alerta activa tiene coste fijo** (estándar y 1) y no pasa por las rebajas de la
    tabla (Murillo: "mejorará en niveles altos, sin definir").
  - Desde Resonancia 4, en las dos: **ventaja** (dos d12, vale el mejor; el modal y el
    resultado enseñan los dos) y casilla "+2 por Resonancia 4". La ventaja es genérica
    (`Accion.ventaja`, `tirarDado`), la da `Disciplina.ventajas`.
  - Vínculo: sin tirada, compleja (estándar desde nivel 4), 1 de fatiga por aliado (mensaje
    de varios objetivos), nivel poseído en km² y en minutos. +1 a Voluntad y alertar por el
    vínculo, notas.
  - ~~*Supuesto:* contra amenazas sintéticas, la Alerta tira Tecnociencia con la especialidad
    Informática, como Rastreo.~~ **Tumbado (usuario, 2026-10-23, §3):** la prosa solo dice
    "tecnociencia", así que va **entera, sin especialidad**. Las tiradas de Biociencia de
    Resonancia (Mensaje agresivo, Superar la barrera, Rastreo, Leer Mente y Alerta, contra
    orgánicos) tampoco nombran especialidad: enteras.
- **Construcción de Resonancia, tanda 3 (usuario, 2026-09-30):** con Resonancia 4+, la
  tirada fija "Buscar / percibir" gana la ventaja y la casilla "+2 por Resonancia 4
  (combinada con tu alerta psiónica)". El "sin impedimentos" de la prosa no se comprueba:
  va escrito en el aviso de ventaja de las tres alertas y lo decide el máster.
  **Resonancia completa.**
- **Construcción de Inducción, tanda 1 (usuario, 2026-09-30):** base común, Comando y
  Reconfiguración Mnemónica.
  - Toda acción con tirada es **enfrentada** con selector Orgánico (Expresión + Biociencia,
    entera: no nombra especialidad, §3; resiste Voluntad + Actitud o + Biociencia si es
    entrenado) / Sintético (Perspicacia + Tecnociencia con Informática; resiste Perspicacia +
    Informática). Alcance 20 m × nivel poseído, con nota
    de que se combina con el local de Resonancia. Desde nivel 5, casilla "Fuera del
    alcance local de Resonancia (−4)".
  - Grados escritos desde el psiónico: su crítico = el fracaso crítico del objetivo (Comando:
    obedece 10 turnos); su fracaso crítico = el éxito crítico del objetivo.
  - Comando: estándar, 1. Nivel 2, opción "Evitar un ataque" (reacción, 1, prueba base,
    grados propios). Nivel 3, varios objetivos con el mensaje de siempre.
  - Reconfiguración Mnemónica (nivel 3): compleja, 2; cambios profundos, nota.
  - *Supuesto:* "un punto adicional por cada objetivo" (Comando nv3) se lee como el mensaje
    de Traslación: se cobra el poder una vez y cada objetivo extra paga 1 a mano.
- **Construcción de Inducción, tanda 2: Modulación (usuario, 2026-09-30):**
  - **En la Modulación, "nivel de poder" = nivel EMPLEADO** (duraciones y dificultades de
    sus efectos). Excepción a la regla general "a secas = poseído": la acción cobra 1 de
    fatiga por nivel empleado y, con el poseído, emplear más no serviría de nada. Qué
    efectos hay (Delirio y Manía en nivel 3, Cautiverio en nivel 5) va por nivel poseído
    ("adquiere"). Vale también para "Hipomanía a un aliado".
  - Selector de efecto con los ocho estados; los sintéticos (Latencia, Cisma Lógico) tiran
    Perspicacia + Informática. Grados desde el psiónico; las salvaciones del objetivo que
    salen de un crítico (paro cardíaco 5 + nivel, asfixia 6 + nivel, bucle de Cisma 6 +
    nivel) se enseñan con su dificultad ya calculada.
  - Compleja, estándar desde nivel 2; con varios objetivos (nivel 4) sigue compleja ("como
    parte de una acción compleja"). Nivel 6: hasta 6 víctimas sin fatiga extra, en el
    mensaje.
  - Hipomanía sin críticos en la prosa: el crítico del psiónico usa el "50 % y −4" que la
    prosa mete en el fracaso del objetivo; su fracaso crítico, el texto de su fracaso.
    Sobre un aliado dispuesto, acción aparte sin tirada que aplica el éxito.
- **Construcción de Inducción, tanda 3: Supresión y Estabilización (usuario, 2026-09-30):**
  - Supresión: tirada normal (no enfrentada) de la prueba base contra 10, compleja, 1.
    Usos: reducir penalizadores (−1, crítico −2; 1 minuto, 10 × nivel poseído minutos
    desde el 2, 30 × nivel desde el 4), +2 a una salvación del objetivo, y liberar del todo
    (nivel 2, este turno).
  - Estabilización: sobre uno mismo, Expresión + Biociencia contra 6, reacción o simple,
    1. Mitigar: 1 minuto, 10 minutos (nivel 2), 30 minutos (nivel 4) — sin "× nivel", como
    la prosa —; nivel 4 omite además los penalizadores de daño y fatiga; nivel 6 los elimina
    por completo.
  - **El bonificador a la salvación va en dos pasos**: se tira Estabilización (paga la
    fatiga y la sobrecarga) y, si sale, en las tres salvaciones fijas se marca la casilla
    "+N por Estabilización (si la superaste)", que no cobra nada: +2 hasta nivel 3, +3 en
    4-5, +4 en 6 (`BonoToggle.hastaNivelPoseido`, sin sumarse).
  - Los penalizadores de estado se aplican a mano (y los de umbral de salud y fatiga siguen
    sin aplicarse en ninguna tirada).
  - **Inducción completa.**
- **Construcción de Hipercognición (usuario, 2026-09-30):** Sondeo No-Local, Precognición
  y Retrocognición, todas con Perspicacia + Tecnociencia (Física). "Nivel de poder" =
  poseído.
  - Sondeo y Retrocognición: el tramo (distancia / tiempo transcurrido) fija tiempo,
    fatiga y **dificultad sugerida = el valor bajo del rango** (6, 8, 10, 12 / 6, 9, 12,
    15); la interferencia (+0/+2/+4/+6) es un selector que se suma. Nivel 4: −1; nivel 6:
    −2. Niveles 3 y 5: un paso de tiempo cada uno (1 hora → 10 minutos → 1 minuto →
    compleja → estándar → simple).
  - **Alcance de los tramos del Sondeo calculado con el nivel de Resonancia de la ficha**
    (¼, ½ y todo el alcance de su fila; local 1 km²).
  - **Duración del Sondeo:** nivel turnos (errata de Murillo); **desde nivel 3, 1 minuto**
    (la línea de nivel 3 alarga la duración). Solo el crítico se prolonga, pagando la misma
    fatiga cada turno a mano.
  - El **daño propio que depende del resultado** lo resta la app al tirar: fracaso crítico
    del Sondeo (1 de daño mental por punto de fatiga) y de Precognición (1).
  - Precognición: estándar, 1, dificultad 8, burbuja de 10 m × nivel, nivel turnos. Los
    bonos, a mano. Las salvaciones no cuentan como defensivas.
  - *Supuesto:* el −1/−2 por nivel par vale solo para Sondeo y Retrocognición (donde lo pone
    la prosa), no para Precognición.
  - **Las seis disciplinas, completas.**
- **Fuentes externas, tanda 1: Xovromium y Munición Supresora (usuario, 2026-09-30):**
  - Casillas en el modal de **todo** poder, **siempre visibles** (la app no sabe si te has
    tomado la dosis o te han disparado; sustituye al "visible si tiene Xovromium en
    recursos", que fallaba con la última dosis):
    - "Bajo Xovromium": +1 a la tirada del poder y −1 a la fatiga (ignora el primero).
    - "Afectado por Munición Supresora": ×2 fatiga y −2 a la tirada.
    - "Supresora, fallo crítico": lo mismo y 1 de daño letal por punto de fatiga gastado,
      que la app resta. Las dos de Supresora se excluyen.
  - Orden de la cadena como estaba decidido: ×2 antes del −1 (nivel 3 → 3; Supresora 6;
    con las dos, 5).
  - Xovromium tiene fila en Fármacos: Voluntad + la más alta de Biociencia o Actitud,
    dificultad 6, gasta la dosis. Los efectos de fallar o de acabarse, a mano.
- **Fuentes externas, tanda 2: Derivación Psiónica (usuario, 2026-09-30):**
  - Contador **"Pagar con cargas"** en el modal de todo poder si la ficha tiene el
    subsistema: el jugador elige cuántos puntos paga con cargas (empieza en 0), a 4/3/2/1
    cargas por punto según el nivel; tope = lo que dan sus cargas y el coste. Es el último
    paso de la cadena; la sobrecarga cuenta solo la fatiga de verdad. Con varias
    instaladas, la de mejor conversión.
  - Nivel 3 (Blindaje Psico-Reactivo): casilla "Contra metasensoría +1" en las tres
    salvaciones.
  - Niveles 1 y 4, sin mecánica: la prosa psiónica no tiene tirada de "retroceso" (n1);
    rebajar penalizadores por fatiga (n4) espera a que esos penalizadores se apliquen.
  - Nivel 2 (Canal de Alta Resonancia), **construido 2026-10-24** (pregunta 33 cerrada: el
    porcentaje se queda): +10 % al alcance de los poderes en metros, a la baja y con mínimo
    de 2 m; no en alcances con otra unidad (km²) ni en los de 0 (S91).
  - **Psiónica completa**, salvo lo que depende de los penalizadores por umbral.
- **Máquinas sin ficha** (qué tira una IA/servidor que no es personaje para resistir un poder):
  pendiente de Murillo — es la pregunta 16.
- Las erratas y huecos de la prosa (Hipomanía sin crítico, Comando n2 cortado, unidades de
  alcance, etc.) se han mandado a Murillo.

## 11. Aumentos `[PARCIAL · CONV-1 + AUM + ESP]`

**Aumentos = biónicos + genéticos** (`CONV-1`). El catálogo literal está en
`docs/aumentos.md`. El encargo de modelado, en `docs/prompt-aumentos.md`.

### 11.1 Las dos ramas `[FIRME · AUM]`
| | Operaciones genéticas | Implantes |
|---|---|---|
| Cuántas | 26 | 11: 6 cerrados y 5 **en proceso** (de Control Anímico al final; no se modelan) |
| Niveles | No: cada operación es una pieza | 1-4, 1-3 o 1-2; precio y rareza **por nivel** |
| Rareza | "Operación \<Rareza\>" (Poco Habitual · Extraña · Muy Extraña) | "Objeto \<Rareza\>" (de Común a Muy Extraña) |
| Precio | 15.000-45.000 créditos | De 1.500 (MQE 1) a 240.000 (IRM 4) |
| Requisitos | Otras operaciones, en árbol (*Mielinización Central* → *Neurogénesis Hipocampal* → *Estabilización Engramática*) | Ninguno escrito |
| Repetible | Solo *Introgresión Sensorial Heteróloga*, un sentido distinto cada vez (6) | No |

- **Se compran con créditos**, como el equipo.
- **Reglas generales de los implantes**: casi todos son susceptibles de **sabotaje**.
  Algunos biónicos se pueden **extraer** como recurso con **perspicacia o reflejos +
  biónica** y el instrumental adecuado.
- **Qué aportan**: lo más común es +1 a un atributo **básico**. También ventaja ("dos dados,
  el mejor") pagando fatiga, bonos a salvaciones y tiradas concretas, armadura natural por
  tipo de daño, reducción de penalizadores por heridas o fatiga, reacciones o acciones
  extra, regeneración e inmunidades.
- **Decisión del usuario (2026-10-16)**: los aumentos entran en la app como una **familia de
  equipo**, con chip propio en Equipo y compra en la Tienda. Lo que falta por decidir está
  en `docs/prompt-aumentos.md` §3.
- *En la app (A0, sin efectos de reglas):* `catalog/aumentos.ts` (familias
  `operacionGenetica` e `implante` del `Equipo`, cruzado con `docs/modelado-aumentos.json`
  por test). Se guardan en `sheet.equipo`; `PiezaEquipada.eleccion` lleva el sentido de
  Introgresión o el modelo del Brazo (ficha v18). La compra la decide `comprarAumento`
  (`rules/aumentos.ts`): requisitos (todos), un implante de cada que solo sube pagando la
  diferencia, elección obligatoria donde toca y otra Introgresión solo con otro sentido.
  **Quitar (usuario, 2026-10-22):** en creación devuelve lo pagado, lo de la bolsa a la bolsa
  y el resto a créditos (`PiezaEquipada.pagoBolsa`, `devolucionAumento`); aprobada la ficha,
  no devuelve nada (el resto del equipo sí devuelve su coste siempre). Quitar una operación
  que otra pide marca esa otra "requisito roto" (`aumentosConRequisitoRoto`). **La letra de
  Recursos topa su rareza en creación**, como al resto del equipo (usuario, 2026-10-22).
  **NPC:** sin coste, pero con los mismos requisitos que un jugador (usuario, 2026-10-22).
  **Brazo 3 → 4:** se elige cualquier modelo del nivel 4 (usuario, 2026-10-22).
- *En la app (A1, atributos y derivados):* cada operación da sus +1 como `Modificador`
  "atributo" con origen `"aumento"` y la pieza de fuente (`modificadoresDeAumentos`,
  `rules/aumentos.ts`), y entran en `modificadoresActivos` y en `resolverFicha` (también al
  NPC): atributos efectivos, desglose, aplicados y derivados. **Sin techo** (R7, S7): el
  point-buy sigue mirando `sheet.atributos`; el efectivo puede pasar de 6. **Requisitos de
  dote:** cuentan especie + aumentos permanentes (`modificadoresDeRequisito`, `dotes.ts`),
  ni equipo normal ni estados (S30). **Rebajas de coste** (Neurogénesis −1 en Biociencia,
  Cultura y Tecnociencia; Engramática −1 en todas): un solo delta por habilidad, sumado a la
  casta de Manduk, mínimo 1 por nivel, **solo con la ficha aprobada** (usuario, 2026-10-22):
  `FichaResuelta.ajusteCosteSubida` (con `OpcionesFicha.aprobada`) para el "+" y `ajusteXp`
  en `setHabilidadAction`; el point-buy de creación sigue con el ajuste de especie
  (`ajusteCoste`). **Hipertrofia:** Modificador `multiplicadorVida` (×1,5) que lee `salud()`:
  vida = 10 + ⌊Fortaleza × 1,5⌋ con Fortaleza > 0, y 10 + Fortaleza si no (base 10 desde `HOJA3`, §4). Quitar un aumento
  (o cualquier pieza) recorta la vida actual al nuevo máximo (`retirarPieza`,
  `vitalidad.ts`); ponerlo no la sube. **Requisito roto (usuario, 2026-10-22):** una operación
  sin todos sus requisitos funcionando no da efectos (ni atributos ni rebajas), en cadena,
  como una dote (S34): `operacionesActivas` (`rules/aumentos.ts`). **Dos multiplicadores de
  vida:** cuenta el mayor (supuesto; hoy solo existe Hipertrofia, que no se repite).
- *En la app (A2a, tiradas y blindaje):* `rules/aumentosTiradas.ts`, con
  `operacionesActivas` (requisito roto, sin nada) y los niveles de implante acumulados (el
  nivel alto sustituye la misma casilla o salvación).
  - **Selector "Contra…"** (decisión del usuario) en las salvaciones de Fortaleza y Voluntad
    que tengan alguna amenaza cubierta: "Nada en especial" por defecto y una opción por
    amenaza (`AMENAZAS`). La opción suma todo lo que le aplica, con una línea por fuente en
    el desglose. Fortaleza: ceguera, ceguera por detonación (suma también lo de ceguera),
    sordera, aturdimiento, shock, asfixia, toxinas, venenos, enfermedad, radiación y frío o
    calor del ambiente. Voluntad: confusión, miedo, coerción, intimidación, manipulación
    mental, dominación, sugestión coercitiva y alteración de la voluntad.
  - **Ventaja:** no se acumula. Si una fuente la da gratis (Resiliencia), no se cobra la de
    pago (Biogénesis). Si solo hay de pago, salen dos opciones, sin pagar y "pagando
    fatiga" (ventaja y 1 de fatiga), porque el texto lo deja a elección ("permite emplear").
  - **Dominación mental, sugestión coercitiva y alteración de la voluntad cuentan también
    como manipulación mental** (usuario, 2026-10-22): Regulación (+1) y Matriz (+2) se
    suman (+3).
  - **Matriz de Red:** la repetición de la salvación al final de cada turno, como texto en
    la salvación de Voluntad.
  - **`noApila` (grupo `vision_aumentada`):** de lo que entra en una tirada con el mismo
    grupo, solo vale el mayor; el resto sale en el desglose a 0, diciendo con cuál no se
    suma. Ojo Biónico a distancia (+1/+1/+2/+3, siempre activo) y su casilla de percepción
    visual en Buscar/percibir (+1/+2/+3/+4), contra la Mira Telescópica (bono por tramo y
    casilla de búsqueda). Los visores no dan bono numérico, así que hoy no entran. La mira
    integrada de los fusiles de precisión va dentro de los números del arma y no compite
    (`TODO(revisar)`, `combate.ts`).
  - **Alerta pasiva:** el Ojo la sube con su nivel (Modificador `derivado` "alerta", también
    con `noApila`). La Detección Química va como nota junto a la Alerta (+2 a 4 m o menos) y
    como casilla en Buscar/percibir. La ventaja auditiva de Vestíbulo, solo casilla en
    Buscar/percibir.
  - **Casillas en Buscar/percibir:** Ojo (visual), Vestíbulo (ventaja auditiva), Detección
    Química (+2 a 4 m o menos) y Ultravioleta (+2 buscando accesos ocultos).
  - **Armadura natural (R6):** Osteotendinosa y Matriz Ósea, +1 contra Cinético cada una,
    una línea por pieza en "Bloquear daño" con su nota. La de especie no cambia.
- *En la app (A2b, rama cognitiva e Iniciativa):* mismo canal (`rules/aumentosTiradas.ts`),
  con `operacionesActivas`.
  - **Alcance por aplicado** (R9: "pruebas que usen perspicacia, voluntad o expresión" =
    cualquier tirada con ese aplicado, salvaciones y poderes incluidos). **Vale el aplicado
    con el que se tira de verdad** (usuario, 2026-10-22): tras Sutil y tras una casilla que lo
    cambie (Negociación Analítica). La casilla sale si la tirada puede tirarse con ese
    aplicado; si al final se tira con otro, se queda en el modal "sin efecto" (ni suma, ni
    ventaja, ni cobra).
  - **Casillas de ventaja con 1 de fatiga:** Prefrontal ("Concentrarse", pruebas mentales;
    **no sale con Conectividad Callosa funcionando**, usuario 2026-10-22), Callosa
    ("Concentrarse" y "Dos turnos", cualquier tirada), Consciencia (esquiva, en Defensa) y
    Sincronización (Potencia). La nota dice lo de la acción compleja o los dos turnos.
  - **Mielinización:** casilla "Ahorro de fatiga" en las pruebas mentales: −1 al gasto de
    fatiga de la tirada (casillas de pago y, en un poder, el coste del poder), mínimo 0
    (usuario, 2026-10-22). "Una vez por escena" va en la nota hasta A4.
  - **Foveo:** +1 en los ataques con Combate a Distancia cuando el selector «Apuntado» no
    está en "No" (S82; desde 2026-10-23, que existe la acción Apuntar). Antes era una casilla
    "Tras Apuntar" suelta.
  - **Proyección** ("Con lenguaje") y **Matriz de Red** ("Repetir tras fallar"): ventaja en
    cualquier tirada de Actitud, con su nota (una vez por escena, hasta A4).
  - **Red Frontoparietal:** ventaja sin casilla en las tres de Iniciativa; la acción combinada
    (física + mental por 1 de fatiga), como texto en las pruebas mentales hasta A4.
  - **Textos:** Asa (bajar un paso por 1 de fatiga, con la exclusión de Callosa y
    Prefrontal) en las pruebas mentales; Consciencia (no te pueden flanquear) y Automatismo
    (Sorprendido sin −3 en la primera tirada defensiva) en Defensa.
  - **La ventaja no se acumula al cobrar (usuario, 2026-10-22):** si la tirada ya trae
    ventaja gratis (Red Frontoparietal en Iniciativa, una casilla u opción sin coste), las
    casillas de ventaja de pago no cobran; sin gratis, de varias de pago solo cobra una
    (`fatigaDeCasillas`, `montaje.ts`).
  - **Reacciones y equilibrio (usuario, 2026-10-22):** Hiperdensidad (2.ª reacción por 1 de
    fatiga), Automatismo (la deja gratis) y Bucle (3.ª reacción por 1 de fatiga) como texto
    en Defensa; Bucle, casilla de ventaja en Atletismo "Equilibrio para no caer derribado".
- *En la app (A3, penalizadores):* campo `reducePenalizador` de la operación, con
  `operacionesActivas` (requisito roto, sin nada).
  - **Heridas y fatiga (R8):** Estabilización Autonómica −1 a las dos. El ajuste de la
    especie y el de los aumentos se suman en un valor por recurso (`sumaAjustesUmbrales`,
    `rules/estados.ts`); el tramo nunca pasa de 0 y el desglose lleva las fuentes juntas
    ("Malherido (Manduk · Guerrero y Estabilización Autonómica)": −3 + 2 = −1). Solo el −N:
    media velocidad y carga del umbral no cambian. Neuroprótesis 1 llega con A5.
  - **Neurogénesis Hipocampal (usuario, 2026-10-22):** compensación automática sin casilla,
    +1 con alcance `aplicado` (perspicacia, voluntad, expresión; el aplicado con el que se
    tira de verdad), en su propia línea ("Neurogénesis Hipocampal (Fatigado)"). Solo sale si
    el tramo de fatiga sigue penalizando tras especie y Estabilización, y nunca lo deja por
    encima de 0 (Siervo Fatigado: nada; Siervo Exhausto: −1 y +1).
  - **Cobertura (usuario, 2026-10-22):** casillas que suman para compensar la cobertura que
    el jugador resta a mano en el circunstancial, en ataques con Combate a Distancia y en
    Buscar/percibir. Foveo y Ojo 2-3: "Objetivo con cobertura visual" +1; Ojo 4: "Objetivo
    con cobertura (física o visual)" +2 (sustituye a la del 2). El Ojo 1 no trae. Mismo grupo
    `noApila` (`reduccion_cobertura`): vale la mayor. La nota recuerda que la cobertura
    total no se reduce.
  - **Matriz Ósea:** −1 a los penalizadores por carga solo como nota junto a la carga
    (Personaje → Estado); la carga no está mecanizada (§5.5).
- *En la app (A4a, una vez por escena y acciones sin dado):*
  - **Una vez por escena (R1):** ficha v19, `sheet.usosEscena` (ids de casilla,
    `rules/usosEscena.ts`). Las casillas con `usoPorEscena` (Mielinización "Ahorro de fatiga",
    Proyección "Con lenguaje", Matriz de Red "Repetir tras fallar") **se gastan al tirar** con
    ellas marcadas, no al marcarlas (usuario, 2026-10-22): `montarTirada` las devuelve en
    `usosEscena` y la pestaña Acciones las apunta. Una casilla sin efecto (por el aplicado) no
    gasta; el ahorro de Mielinización tampoco si no ha ahorrado nada (sin casillas de pago y
    fuera de un poder). Gastada, sale en el modal **bloqueada** ("Usada esta escena") hasta
    terminar la escena. "Hasta un descanso" (Neuroprótesis 3 y 4) sigue como texto.
  - **Terminar escena:** el del jugador (Recursos) y el "Limpiar estados" del máster (Mesa y
    combate, en las mismas fichas de jugador) vacían `usosEscena`. **Deshacer ese "Limpiar
    estados" no devuelve los usos de escena** (usuario, 2026-10-22): solo los estados. En Recursos, la lista de lo usado lleva "Liberar" por entrada, para los errores.
  - **Acciones de aumento** (`rules/aumentosAcciones.ts`, sección "Aumentos" de Acciones, con
    `operacionesActivas` y los niveles del implante; la misma acción en un nivel alto
    sustituye a la del bajo): Acción combinada (Red Frontoparietal, 1 de fatiga, sin límite;
    sustituye al texto de A2b en las pruebas mentales), Cortar hemorragia (1, gratuita) y
    exanguinante (2, gratuita) de Angiogénesis, Eliminar exanguinante (Regeneración, 1,
    gratuita como cortar: el texto no lo dice; usuario 2026-10-22, pendiente de Murillo),
    Sacudir miedo y Dominar terror (Estabilización, sin coste), Mensaje subvocal (MQE; desde el
    nivel 2 a varias personas, usuario 2026-10-22) y Telemetría (MQE 2+), Sanar letal y Sanar
    grave (Enjambre 2+, 1 cada pulsación). Sin fatiga suficiente, la acción sale bloqueada.
  - **Estados (usuario, 2026-10-22):** Cortar hemorragia quita `hemorragia`; Sacudir miedo
    quita `miedo` en Asustado; Dominar terror lo pasa de Aterrorizado a Asustado (con la misma
    duración). Si la ficha no tiene el estado, la acción se cobra igual y lo dice. La
    exanguinante no es un estado del catálogo: sus dos acciones solo cobran, con la nota de
    avisar al máster. Es la única vía del jugador a `Character.estados`: el servidor comprueba
    la pieza, cobra y cambia solo ese estado por `cambiarEstadosDePersonajes`, **en una sola
    transacción** (el cobro va en su `preparar`), con una entrada
    del registro del máster (autor: el jugador) que se puede deshacer; deshacer devuelve el
    estado, no la fatiga.
  - **Sanar letal:** +1 a la vida actual, sin pasar del máximo en reposo; "una vez por ronda",
    texto. **Sanar grave:** cada pulsación cobra 1; "5 turnos seguidos; al quinto, súmate 1 de
    vida a mano". Lo de "sin penalizadores por fatiga" del Enjambre es solo de la regeneración
    pasiva (fuera de A4a).
  - **Defensa del MQE:** fila informativa sin botón con alcance, dificultad de infiltración
    (+1 por turno), defensa y contragolpe del nivel que se tenga; el nivel 4 dice que el cepo
    del 3 se puede elegir en cada intrusión. La app no tira por el intruso.
- *En la app (A4b, acciones con dado y Densificar):* mismo canal (`rules/aumentosAcciones.ts`),
  con `operacionesActivas`, la opción elegida de la operación y los niveles del implante. La
  sección "Aumentos" pinta las filas **en el orden del catálogo**, directas y tiradas
  mezcladas.
  - **Barrido electromagnético** (Introgresión con Percepción Electromagnética; usuario,
    2026-10-22): "Ampliar a 30 m" (acción compleja, sin coste ni tirada), "Ampliar a 60 m"
    (1 de fatiga) y "Encontrar o distinguir" (Perspicacia + Exploración, la dificultad la
    pone el máster: el modal abre en la de siempre). Juntas y en ese orden: ampliar no tira; lo
    que se tira es la búsqueda. La búsqueda no lleva economía propia (`TODO(revisar)`).
  - **Tempestad Nanobótica** (Enjambre 4): ataque cuerpo a cuerpo de Reflejos + Tecnociencia,
    dificultad 0 (la de un ataque por defecto), **1 grave fijo sin sumar éxitos**
    (`ataque.sinBonoExitos`) y **2 de fatiga cobrados al tirar** (`Accion.costeFatiga`, que
    `montarTirada` suma a la fatiga de las casillas; el ahorro de Mielinización también la
    rebaja, como el coste de un poder). Sin 2 de fatiga, la fila sale apagada. Solo en la
    sección "Aumentos", no en "Ataques" (no es un arma). Quitar 1 de blindaje al objetivo por
    acierto, aviso tras el daño (se resta a mano); sabotear objetos, nota sin tirada.
  - **Densificar** (Enjambre 3+): casilla en "Bloquear daño", +3 de blindaje contra ese golpe.
    **Se cobra 1 de fatiga al marcarla y se devuelve al desmarcarla** sin cerrar el modal; sin
    fatiga, apagada con el motivo. Vale donde cuenta el blindaje (no contra Mental ni Fuego sin
    Ignífuga, el mismo criterio que la armadura natural: `blindajeNoCuenta`); cambiar a uno de
    esos tipos con ella marcada la desmarca y devuelve la fatiga. El +3 contra el aturdimiento,
    nota. En el combate en vivo del máster suma igual y la fatiga se cobra a mano.
  - **Incorporar arma** (Brazo, cualquier nivel): Perspicacia + Biociencia a dificultad 8 con
    la regla de especialidad de las acciones de dote (con Biónica, en especialidad; sin ella, a
    la mitad). Acción extendida de 10 minutos, instrumental, arma de una mano (también de
    fuego), repetir si fallas, quitarla igual: nota. El vínculo del arma con el brazo, en A6.
- *En la app (A5a, activables: Neuroprótesis 1-2 y Proyección; usuario, 2026-10-22):*
  - **Activar** es una acción de aumento sin dado (`rules/aumentosAcciones.ts`, efecto
    `activar`) que cobra la fatiga y pone un **estado propio** en `Character.estados`
    (`ESTADOS_DE_AUMENTO`, `catalog/estados.ts`; no salen en el selector del máster). Mismo
    camino que A4a: servidor, una transacción con el cobro, entrada del registro (autor: el
    jugador); deshacer devuelve el estado, no la fatiga. Con `operacionesActivas` y los niveles
    del implante; sin fatiga, bloqueada con el motivo.
  - **Duración (R2):** Neuroprótesis 3 rondas (baja con "Siguiente turno", al cerrar la
    vuelta); Proyección hasta el final de la escena. Las dos se van con "Limpiar estados". El
    chip lo dice: "3 rondas, en combate" (fuera de combate no corren: se desactiva a mano) y
    "hasta el final de la escena".
  - **Reactivar** estando activa **renueva la duración** (sustituye el estado; no apila).
    **Desactivar:** fila propia con el estado puesto, sin coste y sin devolver la fatiga, con
    entrada en el registro; sale aunque ya no se lleve la pieza.
  - **Efectos** (`rules/aumentosActivables.ts`): solo con el estado puesto **y** la pieza
    equipada y funcionando; sin ella, el estado sigue en la lista pero no hace nada.
  - **Neuroprótesis 1:** +1 a Fuerza, Agilidad y Percepción con origen "estado": cuentan en
    atributos, aplicados y derivados, **no en requisitos de dote** (R3, S30). **−1 a cada
    penalizador por separado, sin pasar de 0:** heridas y fatiga por el ajuste de umbrales (se
    suma a especie y Estabilización: "Malherido (Neuroprótesis Simpática 1)" −2); cada
    modificador negativo **de tirada** de cada estado, con su línea ("Neuroprótesis Simpática 1
    (Aturdido)" +1). Los penalizadores de estado a atributos (Enfermedad, Parálisis) no se
    tocan (supuesto: "penalizador" = el −N a la tirada). **−1 a las salvaciones de Fortaleza
    contra enfermedad, radiación, toxinas y venenos** por el selector "Contra…", solo mientras
    está activa; ese −1 no se reduce (no es un estado).
  - **Neuroprótesis 2:** al activar se elige a qué va el +2 (Fuerza o Agilidad); ese sustituye
    al +1 ("en lugar de") y el otro y Percepción reciben +1. La elección es el grado del
    estado (`fuerza`/`agilidad`); con el nivel 1, un único grado.
  - **Proyección:** acción gratuita, 1 de fatiga. Mientras dura, **anula los penalizadores en
    cualquier tirada de Actitud** ("Convencer / mentir", "Iniciativa (distrayendo)"): heridas,
    fatiga y estados, con sus compensaciones (Neuroprótesis, Neurogénesis), una línea
    "Proyección Neuro-Expresiva (anula penalizadores)" que deja la suma a 0. No toca el
    circunstancial ni los bonos. Su +1 de Carácter es el permanente de A1.
  - **Vida (supuesto):** el +1 a Fuerza puede subir la vida máxima; al caerse o desactivarse
    la Neuroprótesis **no se resta vida** (S75 no cuenta los activables), para que activarla no
    cueste vida de verdad. *(Matizado en A5b: si queda por encima del máximo nuevo, se recorta.)*
- *En la app (A5b, Neuroprótesis 3-4, recorte de vida y fatiga en combate; usuario, 2026-10-22):*
  - **Acción simple adicional (nivel 3):** acción de aumento sin dado (efecto
    `accionAdicional`), 2 de fatiga. Solo pide el implante (nivel 3+), no tenerlo activado; el
    sabotaje y los descansos no los lleva la app. Casilla en el modal **"Ya usada desde el
    último descanso (cuesta 3)"**: cobra 3; si no llega la fatiga sale apagada con el motivo, y
    el servidor rechaza cualquier coste que no llegue. Con el nivel 3 no toca estados ni deja
    registro.
  - **Segunda reacción (nivel 3):** texto en Defensa ("Segunda reacción por ronda mientras la
    Neuroprótesis está activa") y en la nota de Activar, solo con el estado de la activa puesto.
  - **Nivel 4:** pagar 3 por la acción adicional (la casilla marcada) pone un estado propio,
    `aum_neuroprotesis_4`, de **1 ronda** (chip "1 ronda, en combate"), con registro como A5a.
    Va aparte del de la activa: conviven, y al caerse el de 1 ronda la activa sigue con lo que le
    quede. Mientras dura: **+2 a Fuerza, Agilidad y Percepción que sustituye al +1/+2 de la
    activa** (no se suman; también sin la activa), con origen "estado" (fuera de los requisitos
    de dote), y **sin penalizadores por heridas ni fatiga** (el ajuste de umbrales los deja a 0;
    la media velocidad y la carga del umbral no cambian, como en A3). Los −1 de la activa a los
    estados y el −1 de Fortaleza siguen. "No se puede volver a usar hasta un descanso", texto en
    la nota.
  - **Vida al caerse un activable (usuario, 2026-10-22; cambia A5a):** sigue sin restarse lo
    que baja el máximo, pero **si la vida actual queda por encima del máximo nuevo, se recorta
    a él** (como al desequipar, `retirarPieza`): nada de 9/8. Igual la fatiga y las fotos de
    combate abiertas. Solo cuando cambian los activables (ponerse, caerse, desactivarse o
    cambiar de grado); un estado normal sigue con S75 y S74. Lo recortado cuenta como restado:
    deshacer en el registro lo devuelve.
  - **Tope de la vida y la fatiga actuales con un activable puesto (usuario, 2026-10-22):**
    "con la Neuroprótesis puesta el máximo real es 9 y tienes que poder curarte hasta 9". El
    tope al que se cura (+/- de Recursos, Sanar letal, la pestaña Vida del máster sobre la
    ficha) y al que se recorta es el **máximo en reposo más los activables puestos**
    (`topesDeVida`); los estados del máster siguen fuera (S74). Al leer, `parseSheet` no conoce
    `Character.estados` y recorta al **máximo posible** (`topesPosibles`: los activables
    equipados en su mejor grado), así que nunca baja un 9 curado con ella puesta; el recorte
    exacto (`reconciliarVidaConEstados`) lo hacen las lecturas que sí los conocen: la página de
    la ficha, `loadEditable`, la Mesa, la pestaña Vida, los cambios de estado, "Siguiente
    turno" y deshacer del registro. Así se llega a 9/9 y nunca se ve ni se guarda 9/8.
    Recortes al caerse, por todos los caminos: "Desactivar" en la ficha, quitar desde la Mesa o
    el combate, "Limpiar estados", caducar con "Siguiente turno" y deshacer "Activar" en el
    registro (deshacer "Desactivar" devuelve lo recortado). Un NPC no tiene estados: su tope es
    el de reposo.
  - **Fatiga en combate:** en combate la vida y la fatiga que valen son las de la foto
    (`Combatiente`), y hasta A5b lo que cobraba la ficha (acciones de aumento, casillas de una
    tirada, poderes) solo bajaba `stats.fatigaActual`: la foto no se enteraba. Ahora la misma
    diferencia va también a la foto del combate abierto (suelo 0, tope su máximo), en la misma
    transacción: `pagarFatigaAction`, `usarAccionAumentoAction` (también Sanar letal, que sube
    la vida) y devolver la fatiga de Densificar. El +/- de Recursos sigue siendo solo de la
    ficha, y el ajuste de la fila propia en Combate, solo de la foto.
    `TODO(revisar)`: el "no te llega la fatiga" de las acciones mira la de la ficha, no la de
    la foto.
- *En la app (A6a, Brazo Biónico: atributos, casilla, bloqueo y blindaje; usuario, 2026-10-22):*
  `rules/brazoBionico.ts`, con los datos por nivel y modelo en el catálogo
  (`extremidad` del nivel 1-2 y de cada modelo del 3-4; el modelo viaja en
  `PiezaEquipada.eleccion`).
  - **Atributos del brazo:** base = Fuerza y Agilidad **permanentes** del usuario (comprado +
    especie + aumentos permanentes; sin estados ni activables: la misma base que los requisitos
    de dote) más el +N a la Fuerza del Exoesqueleto, que se apila (usuario, 2026-10-24), y
    encima el delta con su tope. Si la base ya pasa el tope, vale el tope
    ("con límite máximo"). Nivel 1: Fuerza igual, Agilidad −1. Nivel 2: Fuerza +1 (tope 5),
    blindaje 3. Nivel 3 Fuerte: Fuerza +2 (tope 7), blindaje 6; Ágil: como el 2 y Agilidad +1
    (tope 5), blindaje 3. Nivel 4 Fuerte: Fuerza +4 (tope 10), blindaje 8; Equilibrado: Fuerza
    +2 (tope 7), Agilidad +2 (tope 6), blindaje 6; Ágil: Fuerza +1 (tope 5), Agilidad +3 (tope
    8), blindaje 3. **Solo valen en las tiradas y el daño hechos con el brazo**: no tocan
    atributos, aplicados, vida ni requisitos de la ficha.
  - **Casilla "Con el brazo biónico"** (toggle sin coste): en Puñetazo, "Codazo o Rodillazo"
    (nota: solo si es codazo), las armas de cuerpo a cuerpo de una mano y las de fuego de una
    mano. No en la Patada ni en las de dos manos. Marcada, `montarTirada` recalcula el aplicado
    con la Fuerza y la Agilidad del brazo en lugar de las **efectivas** del usuario (con estados
    y activables), aunque salgan menores (R4); la línea del aplicado dice "Potencia · Brazo
    Biónico 2: Fuerza 3 (tuya 1), Agilidad 2 (tuya 2)". El daño que sale de la Fuerza (o de la
    Potencia, con Sutil) cambia con ellas: un ajuste del daño con su fuente ("Brazo Biónico 2:
    Fuerza 5 (tuya 6)" −1). Con el nivel 2+, el Puñetazo y el codazo con la casilla son
    **letales**; las armas no cambian de categoría.
  - **"Bloquear con el brazo biónico":** fila de Defensa con el nivel 2+, familia
    `bloquear_melee` (solo con la dote Bloqueo, sus casillas incluidas), Potencia + Combate
    Melee siempre con los atributos del brazo, sin casilla. Especialidad Pelea, sin Sutil y sin
    contar como desarmado (supuesto, `TODO(revisar)`).
  - **Blindaje (R12):** casilla "Bloqueado con el brazo biónico" en "Bloquear daño", sin coste,
    solo con el nivel 2+: suma el blindaje del brazo (3, 6 u 8) a ese golpe, donde cuente el
    blindaje (no contra Mental ni Fuego sin Ignífuga, `blindajeNoCuenta`); cambiar a uno de
    esos tipos la desmarca. Vale igual en el combate en vivo del máster (el mismo modal).
  - **Fuera (A6a):** el arma incorporada, el sabotaje y la extracción. Lanzar un arma
    arrojadiza y lanzar granadas, sin casilla (usuario, 2026-10-22).
- *En la app (A6b, Brazo Biónico: bloqueo con arma y arma incorporada; usuario, 2026-10-22):*
  ficha **v20**.
  - **Casilla en "Bloquear con X":** con un arma de cuerpo a cuerpo de una mano, escudos de una
    mano incluidos, igual que en sus ataques. No a dos manos ni en la Pelea: bloquear con el
    Puñetazo o el codazo es bloquear con el brazo, que ya es "Bloquear con el brazo biónico"
    (nivel 2+; con el 1 no se bloquea) (supuesto, `TODO(revisar)`).
  - **Arma incorporada:** `PiezaEquipada.armaIncorporada` en la pieza del brazo, que apunta a
    un arma equipada de una mano, de cuerpo a cuerpo o de fuego (ni la Pelea ni los escudos, que
    no caben "en su interior": usuario, 2026-10-22). Se fija en Equipo, en la tarjeta del brazo ("Arma
    incorporada": Ninguna o una de esas armas), **sin exigir la tirada** de "Incorporar arma",
    que sigue en Acciones. El servidor comprueba que el arma está equipada y es de una mano. Si
    el arma se desequipa, el vínculo cae; al leer la ficha, un vínculo que no cumple se
    descarta.
  - **Efectos:** las filas del arma incorporada (golpe o disparo y su "Bloquear con X") van
    **siempre** con la Fuerza y la Agilidad del brazo, sin casilla, y su nota dice
    "Incorporada en el Brazo Biónico: desenfundado gratis, no te la pueden desarmar, cuenta para
    la carga". Desenfundado, desarme y carga son **solo texto**. Lanzarla, sin cambios.
  - **Fuera:** lanzar o arrojar con el brazo, las granadas, la carga como número, el sabotaje y
    la extracción.
- *En la app (A7, inmunidades; usuario, 2026-10-22):* `rules/inmunidades.ts`, con los datos en el
  catálogo (`inmuneA` del nivel del implante o de la operación).
  - **Quién:** Ojo Biónico 2, 3 y 4 contra la **ceguera** (fuente "Ojo Biónico N"; el 1, nada) y
    Regeneración Tisular Acelerada **funcionando** (`operacionesActivas`) contra la
    **hemorragia**. La exanguinante no es un estado: fuera.
  - **Al aplicar (Mesa y combate):** poner el estado a un inmune **no lo pone**; los demás
    objetivos lo reciben igual. El panel de Estados marca "Inmune: Javi (Ojo Biónico 2)" en la
    rejilla y, tras aplicar, avisa "Javi es inmune a Ceguera (Ojo Biónico 2): no se le ha
    aplicado" con **"Aplicar igualmente"**, que repite la operación solo para los inmunes y la
    guarda **forzada** (`EstadoActivo.forzado`). Un forzado **sí hace efecto** y se registra como
    cualquier poner ("Ceguera (Fracaso) forzado (inmune) a Javi"); deshacer, igual. Quitar no
    mira inmunidades.
  - **NPC:** lo mismo, con los aumentos de la ficha de su fila de combate (`Combatiente.sheet`).
  - **Puesto antes de ganar la inmunidad** (sin forzar): sigue en la lista pero **no hace nada**
    (`estadosConEfecto` antes de `modificadoresDeEstados` en `resolverFicha`: ni tiradas, ni
    atributos, ni vida máxima); su chip dice "Inmune (Ojo Biónico 2)". El máster lo quita cuando
    quiera.
  - **Ficha:** "Inmune a: Ceguera (Ojo Biónico 2)" en Personaje → Estado. En el selector
    "Contra…" de Fortaleza, Ceguera y Ceguera por detonación salen "· inmune" con la nota
    "Inmune (Ojo Biónico 2): no hace falta tirar" (siguen elegibles: el máster puede forzar).
  - **Vida:** ni la ceguera ni la hemorragia tocan la vida máxima, así que ganar o perder la
    inmunidad no mueve la vida. Si algún día un estado con inmunidad la tocara, ganarla subiría
    el máximo sin curar y perderla recortaría como al desequipar (`TODO(revisar)` en
    `inmunidades.ts`).

### 11.2 Lo que el documento no dice `[PENDIENTE]`
- **Tope de implantes**: pregunta 11, sigue abierta.
- **Biociencia o Tecnociencia**: pregunta 20, sigue abierta. Hay dos datos: la extracción y
  el Brazo usan **biónica** (especialidad de Biociencia), y Tempestad Nanobótica usa
  **tecnociencia**.
- **Erratas** pendientes de Murillo: ver "Notas de transcripción" en `docs/aumentos.md`.
- **Eliminar exanguinante** (Regeneración Tisular): el texto no dice qué acción cuesta. La app
  la trata como gratuita, igual que cortar la hemorragia en Angiogénesis (usuario, 2026-10-22).
- **Encontrar o distinguir** (barrido de la Percepción Electromagnética): qué acción cuesta. El
  texto solo pone la acción compleja en ampliar el área; la app no le da tipo propio.
- **Tempestad Nanobótica**: si le valen las dotes de ataque cuerpo a cuerpo. La app no se las
  aplica, porque no es un arma (usuario, 2026-10-22).
- **Neuroprótesis Simpática 1**: si "reducir penalizadores por estado en 1" alcanza también a
  los −N a atributos (Enfermedad, Parálisis). La app solo reduce los de las tiradas.
- **Ojo Biónico 2 frente a 4**: el 2 es "inmune a efecto de ceguera" y el 4 "completamente
  inmune a la ceguera". ¿Cubre el 2 una ceguera física (tapar o arrancar el ojo)? La app bloquea
  la ceguera desde el 2 y el máster puede "Aplicar igualmente" (usuario, 2026-10-22).
- **Neuroprótesis Simpática 4**: si "elimina por completo penalizadores por heridas o fatiga"
  quita también la media velocidad y la carga del umbral. La app solo quita el −N de las
  tiradas, como las reducciones de A3.
- **Brazo Biónico, "con límite máximo"**: si tu Fuerza o Agilidad ya pasa el tope del modelo,
  ¿el brazo vale el tope (menos que tú) o al menos lo tuyo? La app usa el tope.
- **Brazo Biónico, arma incorporada**: ¿se puede incorporar un escudo de una mano? La app no lo
  deja (no cabe "en su interior"; usuario, 2026-10-22), pero bloquear con él sí usa el brazo.

### 11.3 Decisiones del usuario `[FIRME · usuario 2026-10-16, Cuestionario Aumentos]`
- **En la ficha**: una pieza de equipo más, que se equipa y se desequipa ("un jugador se
  puede equivocar y querer quitarla"). Sale en Equipo con un chip propio y se compra en la
  Tienda.
- **El +1 a un atributo básico cuenta para los requisitos de dotes**: el aumento es parte
  del cuerpo, como la especie. Matiza S30.
- **Brazo Biónico**: el modelo se elige al comprar y queda guardado. Cambiar de modelo es
  comprar otro brazo.
- **Operaciones genéticas**: en la Tienda, en la misma lista que los implantes. Las que no
  cumplen requisitos salen bloqueadas y dicen qué falta.
- **Bolsa del humano**: las fichas ya aprobadas también pueden gastarla. Lo que no se gaste
  se pierde igual.
- **Sobreesfuerzo del IRM**: lo tira la app, en la ventana del poder, como la sobrecarga.
  Le salta a cualquiera que lleve el IRM y use un poder; si toca también la sobrecarga, se
  tiran las dos, primero la sobrecarga. **No se construye hasta la tarea de psiónica
  biológica** (usuario, R5).
- **IRM y psiónica: se modela pero no se conecta** en este desarrollo, y no se tocan los
  requisitos de la psiónica. Según Murillo (vía el usuario, 2026-10-16), las únicas especies
  **psiónicas biológicas** son los **Arianyi** y la **Casa Maolher** de los Manduk. Hoy la
  app trata como psiónico biológico a cualquiera que ponga puntos en psiónica al crear.
  Cambio futuro:
  - "psiónico biológico" pasa a ser un atributo de especie visible;
  - las disciplinas lo piden como requisito;
  - el IRM lo da.
  
  Tarea aparte en `docs/tareas.md`.
- **Niveles de implante** (sin consulta a Murillo; quedan como supuestos hasta que lo
  confirme):
  - Se puede comprar **cualquier nivel directamente**, y subir de nivel cuesta **la
    diferencia de precio**.
  - **Los niveles se acumulan**: cada nivel trae los efectos de los anteriores, salvo lo que
    diga "en lugar de".
  - ~~"Resistencia" = Aguante~~ **En espera:** solo aparece en implantes que siguen en
    proceso (Refuerzo Protésico, Sistema de Emergencia).

**Segunda ronda** (usuario 2026-10-16, tras el modelado):
- **Cómo se construye**:
  - **"Una vez por escena"**: la misma casilla que en dotes, que se limpia con "Terminar
    escena". "Hasta un descanso breve o largo" (Neuroprótesis 3 y 4) queda como texto.
  - **Duraciones**: turno = ronda ("tres turnos" son 3 rondas). "Una hora" dura hasta el
    final de la escena.
  - **El +1 temporal de un activable** (Neuroprótesis 1) **no cuenta** para requisitos de
    dotes. Solo cuentan los aumentos permanentes.
  - **Brazo Biónico**: casilla "con el brazo biónico" en las tiradas de golpes, bloqueos y
    armas de una mano, que cambia tu Fuerza y Agilidad por las del brazo.
  - **Armadura natural** (Osteotendinosa, Matriz Ósea): +1 contra Cinético cada una, con
    una nota de a qué golpes vale. Con las dos, +2.
- **Reglas** (pendientes de que Murillo las confirme):
  - **Techo de atributos: los aumentos no tienen límite** (usuario, 2026-10-16, cambia lo
    que respondió en R7). Sus puntos van aparte de los comprados y de los de especie, igual
    que el bono de especie (S7): el 4 de creación y el 6 de techo miran solo lo comprado, y
    el total puede pasar de 6. Vale también para el +1 temporal de los activables.
  - **Penalizadores por heridas y fatiga**: cada reducción baja el penalizador en 1 y se
    suma a la de la especie y a la de otros aumentos. Nota del usuario: malherido acaba
    siendo un estado más, con un penalizador igual al máximo que le corresponde menos los
    bonificadores de aumentos y especie.
  - **"Pruebas que usen perspicacia, voluntad o expresión"**: cualquier tirada que use ese
    aplicado, salvaciones de Voluntad y poderes incluidos.
  - **Rebajas de coste de habilidad**: se suman (mínimo 1), y valen para lo que se compre
    después de tener la operación.
  - **Ceguera**: se salva con **Fortaleza**.
  - **Blindaje del Brazo**: solo protege el golpe que bloqueas con el brazo, como un escudo.

**Tercera ronda** (usuario 2026-10-22, `/preguntas` área Aumentos; ids `aumentos.<grupo>.<n>`):
- **Reglas generales**:
  - **Dificultad por defecto de un ataque: 0** (sin penalizador), como un puñetazo. Vale
    para cualquier ataque cuya dificultad no esté escrita (Tempestad Nanobótica incluida).
  - **Salvaciones**: asfixia, toxinas, venenos, enfermedades y aturdimiento con
    **Fortaleza** (salvo que el texto diga otra cosa, como el MQE); Confusión con
    **Voluntad**.
  - **Sanación natural = la de los descansos**: sin descanso no se sana nada.
  - **Fatigado** es el estado por umbral de fatiga restante que ya tiene el sistema.
  - **Hemorragia exanguinante**: no para nunca hasta que te curen por medios médicos.
  - **Cobertura**: los aumentos visuales (Foveo, Ojo 1-3) reducen solo la cobertura visual;
    la total no se reduce salvo con un ataque que la atraviese. **Ojo nivel 4**: −2 niveles
    de cualquier cobertura, física o visual.
  - **Alerta pasiva**: los bonos de vista (Ojo) y de olfato (Detección Química) sí la suben,
    mientras el sentido se pueda usar (en el vacío con traje, no). La ventaja auditiva
    (Vestíbulo-Auditiva) no: solo al buscar activamente.
- **Por pieza** (lo que coincide con la recomendada va sin marca; lo que el usuario cambió,
  con *):
  - **Mielinización Central***: ahorras **un** punto de fatiga, aunque el gasto combinado
    sea mayor. Una vez por escena.
  - **Red Frontoparietal***: la acción física simultánea es **cualquier acción simple o
    estándar física**, ataques y defensas incluidos. Sin límite de usos, pagando el punto.
  - **Asa Estriatotalámica**: un solo paso por acción.
  - **Conectividad Callosa***: la vía de "dos turnos" **también cuesta 1 de fatiga**. Vale
    para cualquier acción, ataques incluidos.
  - **Conectividad Callosa y Prefrontal Aumentada*** no se juntan: Prefrontal es solo para
    acciones mentales y Callosa es su progresión sin límite. Prefrontal sí se suma al +1 de
    pagar otro punto de fatiga.
  - **Foveo-Sensorial**: solo tras Apuntar.
  - **Ojo Biónico**: cuentan como visión aumentada las miras y las **gafas que hagan algo
    parecido***. Los 50 m del nivel 4 son solo de los rayos X; nocturna y térmica, 500 m.
    El primer "Nivel 3" (Extraño, 32.000) es el **nivel 2** (errata).
  - **Introgresión***: ampliar la Percepción Electromagnética a 30 m **no tiene
    dificultad**; la tienen encontrar y distinguir cosas (la pone el máster). La
    vulnerabilidad eléctrica es descripción. Cada sentido nuevo cuesta 15.000.
  - **Consciencia Omnidireccional**: ventaja en la esquiva normal; anula cualquier bono por
    flanquear o rodear, también de dotes.
  - **Automatismo Bulboespinal**: solo quita el −3 de Sorprendido; Desprevenido sigue igual.
  - **Neuroprótesis Simpática**: segunda reacción por ronda. Nivel 1: reduce en 1
    **todos*** los penalizadores por estado, **heridas y fatiga incluidos**. Nivel 2: +2 a
    Fuerza o Agilidad elegido en cada activación (el otro y Percepción, +1). Nivel 3: la
    acción simple extra solo pide que el implante **no esté saboteado ni apagado***, no que
    esté activado. Nivel 4: es el segundo uso del nivel 3, y el +2 sustituye al +1/+2.
  - **Regulación Límbico-Prefrontal**: cualquier tirada para resistir la intimidación; +1
    aunque el efecto sea miedo y coerción a la vez. Con Matriz de Red (+2) se suma: +3.
  - **Proyección Neuro-Expresiva***: anula **cualquier** penalizador social, heridas y
    fatiga incluidos. Activarla es gratuito.
  - **Proyección y Matriz de Red*** se pueden usar en la misma escena: una tira con
    ventaja y la otra repite con ventaja tras fallar.
  - **Hipertrofia Miofibrilar**: Fortaleza × 1,5 redondeado hacia abajo; con Fortaleza
    negativa no se multiplica.
  - **Biogénesis Mitocondrial***: "consumible" es otro nombre de alimento (un gel
    nutritivo); los fármacos no dan fatiga y no cambian. La hipoxia duplica solo los turnos
    antes de la Asfixia.
  - **Resiliencia Homeostática**: solo frío y calor del ambiente, no armas de fuego.
  - **Angiogénesis Sistémica***: cortar una hemorragia es **acción gratuita**. El cambio de
    no letal por letal en el descanso largo se hace **todas las veces que dé el tiempo**.
  - **Regeneración Tisular**: 2 letales por descanso corto, sin asistencia médica.
  - **Estabilización Autonómica**: librarse del miedo es automático, gastando la acción.
  - **Enjambre Nanobot**: el +3 va a la tirada de Medicina para aplicar fármacos o tratar.
    Sanar un letal es **una sola acción gratuita por ronda***. El grave: 1 de fatiga por
    turno durante 5 turnos, pudiendo actuar. Blindaje y +3 contra aturdimiento valen
    **contra todo lo que pare un blindaje*** (el daño mental, no). La velocidad del nivel 4
    es la del paréntesis. Cada acierto quita 1 punto de blindaje al objetivo (errata).
  - **MQE**: cada nivel sustituye al anterior y la dificultad sigue subiendo +1 por turno.
    El psiónico se infiltra con **lo que proceda por Resonancia***. Contragolpe del nivel 3:
    1 nivel grave. **Nivel 2: los mensajes subvocales llegan a varias personas***. Nivel
    4: defensa y contragolpe juntos, elegidos en cada intrusión; lo de dejar inconsciente y
    ocultar la firma es descripción. Aislar el canal de radio no protege del Shock.
  - **Brazo Biónico**: para bloquear **siempre hace falta la dote Bloqueo***. Se usa el
    atributo del brazo aunque sea menor. El nivel 1 no bloquea ni hace letal; los modelos
    de los niveles 3 y 4, sí. El arma incorporada cuenta para la carga, cualquier arma a
    una mano (también de fuego), y si fallas la de dificultad 8 se repite con otros 10
    minutos.
  - **Shock***: afecta a **todos los implantes**, salvo los que sean puro material de
    refuerzo (pendientes de diseñar; Refuerzo Protésico ya no debe existir). Las
    operaciones genéticas, no.
  - **IRM**: "Fracaso" y "Fallo" son lo mismo; hay que unificar el texto.
  - **Bucle de Realimentación Motora**: la tercera reacción es por ronda.
- **Dudas resueltas** (usuario 2026-10-22, segunda pasada):
  - **Mielinización Central**: una vez **por escena**, como dice el documento.
  - **Foveo-Sensorial**: el bono solo vale **tras la acción de Apuntar**.
  - **Matriz de Red Predeterminada**: fallas y repites **esa misma tirada** con ventaja, una
    vez por escena.
  - **Proyección Neuro-Expresiva**: activarla es **acción gratuita**.
- **Erratas pendientes de corregir en el documento**: IRM nivel 3 repite la frase del nivel
  2, y la ortografía.

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
> Tecnociencia** (entera, sin especialidad; el Escáner 2 admite también Biociencia y tira con
> la más alta, §3) — pareja distinta de "Buscar/percibir" (Perspicacia + Exploración), así
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
>
> **Armas Impulsoras (foto de Drive 2026-10-23), hecho.** `catalog/armasImpulsoras.ts`: Arco
> Táctico y Ballesta Pro UE, especialidad Armas Impulsoras. Forma de `ArmaFuego` con `tipo:
> "arma_impulsora"` (su tabla trae lo mismo: acción, dificultad, daño, corta/media/larga,
> munición, mejoras), así que comparten el ataque de `combate.ts` y salen en la Tienda con las
> armas a distancia. Motor propio: el daño del Arco "1/2 Fue + 8" (`danioFuerza: "mitad"`,
> con la Fuerza efectiva y la mitad hacia abajo, como S28) y la munición especial sin
> adaptador (el selector de munición sale con el stock de la ficha). Texto: recarga, Crítico
> de Hemorragia (1d6 turnos) y Silencioso, en `especial`. `TODO(revisar)` en el archivo: la
> fuente no trae flechas ni virotes (usan el recurso genérico de balas), los tramos de
> distancia son los de "Armas de Fuego" y qué mejoras de arma admiten.
>
> **Armas Modificadas (Electrificantes, Térmicas, de Plasma, de Nanofilamento), hecho
> 2026-10-23 — S87.** No son piezas: son una transformación sobre un arma melee, guardada en
> `PiezaEquipada.modificaciones` (sin ranura ni migración: campo opcional; `parseSheet`
> descarta una combinación que ya no valga y deja el arma). Datos de las cuatro tablas en
> `catalog/armasModificadas.ts`; tramo, compatibilidad, coste, rareza, peso, nombre y el golpe
> resultante en `lib/rules/armasModificadas.ts`. El golpe (y el lanzamiento, si es
> arrojadiza) sale con el daño **desglosado por tipo** (`ataque.modos[].tipoDanio` /
> `danioExtra`, colores `--color-danio-*`): Electrificante suma su eléctrico aparte; Térmica y
> Plasma convierten el básico (fuego, plasma) y le suman su extra; Nanofilamento pasa todo el
> golpe a **Grave**, +1 del mismo tipo, e ignora 2/3/4 de blindaje (el aviso `ignoraBlindaje`
> de siempre). Shock/Llamarada/Hemorragia van a la nota del golpe; Fusión y Hemorragia
> Exanguinante, al crítico. Se elige en la Tienda (al comprar), en Equipo (convertir un arma
> que ya llevas, pagando la diferencia), en creación (el mismo tope de rareza de la letra) y en
> Fabricar con la VTF (arma nueva modificada, o modificación sobre un arma tuya pagando la
> diferencia en materiales). Peso: solo se enseña. Sin gasto de energía; Bloquear no cambia.

## 13. Progresión `[PARCIAL · HOJA2]`

`HOJA2` da la fórmula de coste por nivel (Atributos N×2, Habilidades N×1, Psiónica N×3 —
ver "Coste y progresión", sección 2) y confirma que rige tanto creación como progresión.
Sigue sin decir **de dónde sale la XP** (por sesión, por hito, por encuentro) ni si hay
techo real más allá del 6 de atributos/habilidades.

## 14. Especies `[PARCIAL · ESP + usuario 2026-10-09]`

Prosa literal en `docs/especies.md` (de `docs/Especies.pdf`); análisis y plan en
`docs/propuesta-especies.md`. Las dudas de lectura (M1-M24) las resolvió el usuario el
2026-10-09; ninguna queda para Murillo. Se citan como "usuario, Mn".

**Por qué `PARCIAL`:** la bolsa de aumentos de los Humanos no se puede gastar (no hay
aumentos, sección 11) y la regeneración de Ílkrem y el descanso no tienen dónde vivir en la
app. El resto es `FIRME` o `INFERIDO` bloque a bloque.

> **Estado en la app:** E1 construida y desplegada (2026-10-13, sin reset general, ver 14.3): catálogo real (`src/lib/catalog/especies.ts`), elección
> con reset en el servidor (`setEspecieAction`), carrusel en Personaje → Origen y selector
> compacto en el editor de NPC.
> **E2 construida:** coste de habilidad por casta, descuentos psiónicos (Arianyi, Maolher),
> bolsa de aumentos visible (E2a), Resonancia +1 del Arianyi y acceso al kerzul del Arköru
> (E2b), todo en 14.6.
> **E3 construida:** movimiento, carga y armadura natural por especie (14.7).
> **E4 construida** (2026-10-13): casillas, −1 a distancia del Arköru, "éxito → crítico",
> un tramo menos de penalizador (Guerrero, Siervo) y los textos en su tirada (14.8, 14.10).
> El fallo → fallo crítico de Elión, construido el 2026-10-24 con la tarea "La tirada sabe qué
> especialidad se usa" (14.8).
> **E5 construida** (2026-10-13): peaje neurológico del Maolher, nota de fármacos del Irota
> y "Activar visión" del Arianyi y del Axadren (14.9). Con E5 queda construido todo lo
> construible de especies; lo que falta está bloqueado (bolsa de aumentos, descanso y
> regeneración, fallo crítico de Elión, salvaciones contra ceguera y derribo).

### 14.1 Lista y elección `[FIRME · ESP + usuario M10, M20]`

| Especie | id | Opciones |
|---|---|---|
| Humanos | `humano` | **Atributo +1** de libre elección (§14.4), obligatorio |
| Riux | `riux` | — |
| Arianyi | `arianyi` | — |
| Arköru | `arkoru` | — |
| Manduk | `manduk` | **Casta** obligatoria: Noble, Sabio, Guerrero, Siervo. **Linaje** solo si es Noble, y obligatorio (M10): Ílkrem, Zimethroni, Irota, Maolher, Axadren, Elión |

- **Nombre:** el PDF titula "Arkör" y en la prosa dice "arköru"; en la app, **"Arköru"**, id
  `arkoru` (usuario, M20).
- Los efectos de casta y linaje **se suman** (Noble Ílkrem = Carácter +1 y Fuerza +1).

### 14.2 Modelo: se guarda la elección, los efectos se derivan `[FIRME · usuario 2026-10-09, M1, M2, M24]`

- La ficha guarda solo la **elección**: especie + casta + linaje. Atributos, movimiento,
  carga, blindaje, costes y bonos de especie se **recalculan** en cada render desde el
  catálogo; nunca se escriben en la ficha.
- **Los bonos de especie son totalmente adicionales** y pueden superar cualquier límite
  (M1, M2):
  - el **tope de 4 en creación** y el **techo de 6** miran solo lo **comprado**;
  - el total (comprado + especie) puede pasar de 6;
  - el **coste de atributos no cambia** (N × 2 por nivel, sobre lo comprado). Ejemplo: un
    Arköru que compra Fuerza 4 paga 20 y juega con 6.
- **Sin suelo extra** para el total (M24): un Riux que compra Fuerza −1 juega con −2. Carga y
  movimiento ya cortan en 0.
- **Congelada al aprobar:** el jugador no puede cambiar especie, casta ni linaje en una
  ficha aprobada (lo rechaza el servidor). El máster sí.
- **El catálogo mueve las fichas aprobadas** (decisión consciente): si cambia un número de
  especie en el catálogo, cambian todas las fichas de esa especie, aprobadas incluidas, sin
  migración. Cada cambio de números se avisa al máster antes del deploy.

### 14.3 Cambiar de especie: reset de ficha `[FIRME · usuario 2026-10-09]`

- En **borrador**, cambiar especie, casta o linaje **resetea la ficha entera salvo lo de la
  pestaña Personaje**. Motivo: lo comprado gracias a la especie (descuentos de casta,
  Resonancia +1, kerzul sin rareza, bolsa de aumentos) no se puede deshacer pieza a pieza.
  - Se conserva: nombre, edad, altura, peso, trasfondo, motivación, letras de prioridad y la
    nueva elección de especie.
  - Vuelve al valor por defecto: atributos, habilidades y especialidades, psiónica, equipo,
    recursos, materiales, granadas, fármacos y munición.
  - Vida y fatiga actuales, al máximo.
  - Créditos (`Character.creditos`), al valor de la letra de Recursos.
- **Aviso solo si hay algo que perder** (la ficha difiere de la por defecto fuera de Personaje,
  o los créditos no son los de la letra). Texto fijo: *"Cambiar de especie reseteará la ficha
  (todo salvo Personaje). ¿Seguir?"*. Si no hay nada que perder, el cambio es directo.
- El reset lo aplica el **servidor**, no la pantalla.
- **NPC del máster: no aplica.** El editor de NPC es modo libre: sin reset, sin bloqueo por
  aprobación, sin créditos. Le llega todo lo derivado (atributos, movimiento, carga,
  armadura natural, Resonancia +1, bonos a tiradas); no le aplica lo de creación (costes por
  casta, descuentos psiónicos, kerzul sin rareza, bolsa de aumentos). Un NPC ya metido en un
  combate guarda su foto: cambiarle la especie después no toca ese combate.
- **Sin reset general al desplegar** (decisión del usuario, 2026-10-13; sustituye a la de
  2026-10-09): las fichas viejas se migran al leerlas. Las que están en creación pasan por
  este reset cuando el jugador elige especie (con aviso si hay algo que perder); a las
  aprobadas cuya especie provisional ya no existe se la pone el máster, sin reset. El
  script del reset general sigue en `scripts/reset-fichas-especies.ts`.

### 14.4 Atributos `[FIRME · ESP + fuente 2026-10-23]`

| Especie / opción | Modificadores |
|---|---|
| Humanos | **+1 a un atributo de libre elección** (`docs/fuente/especies.md`, "·Atributos") |
| Riux | Agilidad +1, Aguante +1, Inteligencia +1, Carácter −1, Fuerza −1 |
| Arianyi | Agilidad +1, Percepción +1, Fuerza −1 |
| Arköru | Fuerza +2, Agilidad −1 |
| Manduk Noble | Carácter +1 |
| Manduk Sabio | Inteligencia +1, Percepción +1, Fuerza −1, Aguante −1, Carácter −1 |
| Manduk Guerrero | Fuerza +1, Agilidad +1, Aguante +1, Carácter −1, Inteligencia −1 |
| Manduk Siervo | Aguante +1 *(PDF: "Agaunte", sic)*, Percepción +1, Carácter −1, Inteligencia −1 |
| Linaje (solo Noble) | Ílkrem Fuerza +1 · Zimethroni Agilidad +1 · Irota Aguante +1 · Maolher Inteligencia +1 · Axadren Percepción +1 · Elión Carácter +1 |

- **Atributo libre de los Humanos** (decisiones del usuario, 2026-10-23):
  - Se guarda la elección en `especieOpciones.atributo`; el +1 lo deriva `especieDeFicha`
    como un bono de especie más (fuente "Humanos · libre elección"): adicional, fuera del
    tope de 4 / techo de 6 y sin tocar el coste (§14.2).
  - **Obligatorio para enviar a revisión** (falta del paso Origen: "Elige el atributo +1").
  - **Va aparte de la especie: elegirlo o cambiarlo no resetea** la ficha (no deshace
    ninguna compra). Cambiar de especie sí lo pierde.
  - **Ficha aprobada:** el jugador lo elige **una vez** si aún no lo tenía (las humanas
    aprobadas antes de esto); después queda congelado. El máster lo cambia siempre; en el
    NPC, modo libre.

### 14.5 Peso y altura de referencia `[FIRME · ESP + usuario M21]`

| Especie / casta | Peso | Altura |
|---|---|---|
| Humanos | — | — |
| Riux | 40-60 kg + 10 kg × Fuerza | 170-220 cm |
| Arianyi | 30-55 kg + 10 kg × Fuerza | 140-190 cm |
| Arköru | 80-120 kg + 15 kg × Fuerza | 180-230 cm |
| Manduk Noble | 50-70 kg + 10 kg × Fuerza | 170-200 cm |
| Manduk Sabio | 40-60 kg + 10 kg × Fuerza | 165-185 cm |
| Manduk Guerrero | 70-110 kg + 15 kg × Fuerza | 180-220 cm |
| Manduk Siervo | 40-60 kg + 10 kg × Fuerza | 140-165 cm |

- Fuerza **con** especie (M21). Solo **referencia** junto a los campos libres de Identidad;
  no se valida.
- **Valor por defecto** (supuesto S23, decisión del usuario 2026-10-13): altura y peso vienen
  rellenos con el **punto medio redondeado** del rango (`identidadPorDefecto`,
  `lib/rules/personaje.ts`); sin rango (Humanos, Manduk sin casta), vacíos. El por defecto
  **no se guarda**: mientras `altura`/`peso` sean `null` la ficha lo enseña (atenuado), así
  sigue a la especie y a la Fuerza; en cuanto el jugador escribe, se guarda lo suyo, y si
  borra el campo vuelve a `null` y al por defecto.

### 14.6 Creación y progresión `[FIRME · ESP + usuario M3, M4, M5, M9, M11]`

**Coste de habilidad por casta** (M11: rige igual en creación y con XP)

| Casta | −1 por nivel (mínimo 1) | +1 por nivel |
|---|---|---|
| Noble | Actitud | — |
| Sabio | Biociencia, Cultura, Tecnociencia | Atletismo, Combate Melee, Combate a Distancia |
| Guerrero | Atletismo, Combate a Distancia, Combate Melee | Biociencia, Cultura, Tecnociencia |
| Siervo | — | — |

- Nivel N cuesta `max(1, N − 1)` o `N + 1` en lugar de N (sección 2.5).
- **Especialidades sin ajuste** (decisión del usuario, 2026-10-13): el ajuste es por punto
  de habilidad. La primera especialidad sigue incluida y cada una a partir de la segunda
  cuesta 1, con cualquier casta.
- *En la app (E2a):* el rasgo de casta lleva `costes.habilidades`; `ajustesDeCoste`
  (`rules/especie.ts`) lo junta en un `AjusteCoste` que reciben `creacion.ts` y
  `progresion.ts` (`costeSubidaXp`, `costeSiguienteNivel`). Ejemplo con test: Sabio con
  Tecnociencia 4 paga 1+1+2+3 = 7 en vez de 10.

**Psiónica**
- **Arianyi, Resonancia +1 adicional** (M5, decisión que cambia la propuesta): no es un
  nivel regalado, es un +1 sobre lo comprado, igual que el +2 de Fuerza del Arköru.
  - Nivel efectivo = comprado + 1; puede superar el máximo de 6.
  - Vale con cualquier letra de Psiónica, incluida la E.
  - Cuenta como requisito de Inducción e Hipercognición (los requisitos miran el nivel
    efectivo).
- **Arianyi, −1 al coste del nivel 1** de cada disciplina (M4): el nivel 1 cuesta 2 en vez de
  3. Solo la compra, no la fatiga al usar. **Vale también para Resonancia** (usuario,
  2026-10-09): comprar Resonancia 1 cuesta 2 y juega con 2.
- **Maolher, −1 al coste de cada nivel** de cualquier disciplina, en creación y con XP (M11):
  nivel N cuesta N × 3 − 1.
- *En la app (E2a):* los dos descuentos de coste están mecanizados (`costes.psionicaNivel1`
  y `costes.psionicaPorNivel` en el rasgo → `AjusteCoste` → `psionica.ts` y
  `progresion.ts`).
- *En la app (E2b):* la Resonancia +1 es un `Modificador` de tipo `"disciplina"` en el rasgo
  Evolución Psiónica (`docs/modificadores-tiradas.md` §9). `resolverFicha` da por disciplina
  `comprado` / `efectivo` (comprado + bono, también con 0 comprado) / `paraEfectos`
  (`min(efectivo, 6)`) en `FichaResuelta.psionica`. Compra, tope de 6 y XP miran lo comprado;
  los requisitos, el efectivo; poderes, bonos por nivel en tiradas fijas, Levitar y Recursos,
  `paraEfectos` (**un 7 cumple requisitos y usa la fila del 6**, supuesto S24). Psiónica
  enseña "2 (1 + 1 especie)" con el stepper sobre lo comprado.
- **Requisito roto** (supuesto S25): el máster con la ficha aprobada o el NPC cambian de
  especie sin reset; si una disciplina queda con el requisito sin cumplir, no se borra
  nada y Psiónica la marca "requisito no cumplido"; en Acciones sus poderes salen
  bloqueados con el motivo. Con un 7, la cabecera dice "nivel 7 · efectos de nivel 6".
- *NPC:* `resolverFicha(sheet, { libre: true })` deja el ajuste neutro y sin bolsa (14.3).

**Humanos, bolsa de aumentos** (M3)
- **70.000** créditos aparte, **solo para aumentos** (`docs/fuente/especies.md`; antes
  60.000). No toca `Character.creditos`.
- Un aumento se paga **primero con la bolsa**; si no llega, lo que falte sale de los
  créditos normales.
- Se puede gastar también con la ficha aprobada (§11.3). Lo que no se gaste se pierde: nunca
  se convierte en créditos.
- *En la app (E2a + A0):* `bolsaAumentos` en el rasgo del humano es el total; la ficha guarda
  solo lo gastado (`sheet.bolsaAumentosGastada`, ficha v18) y `FichaResuelta.bolsaAumentos`
  da `{ total, gastada, saldo }`. `comprarAumento` (`rules/aumentos.ts`) reparte el pago
  (`repartoPago`: bolsa primero, luego créditos). Tienda y Recursos enseñan "Bolsa de
  aumentos saldo / total". Quitar un aumento en creación devuelve a la bolsa lo que salió
  de ella; aprobada la ficha, nada.

**Arköru, acceso al kerzul** (M9)
- Una sola pieza de kerzul del catálogo (cualquiera, Escudo incluido) **sin tope de rareza**,
  solo en creación (ficha en borrador). Todo el kerzul es Singular, por encima de cualquier
  letra de Recursos: es la única vía de un jugador.
- **Paga el precio** con sus créditos.
- La pieza queda marcada como "vía especie"; el reset de 14.3 se la lleva con el equipo.
- *En la app (E2b):* el rasgo lleva `excepcionRareza: { material: "kerzul", maxPiezas: 1 }`
  y cada pieza de kerzul del catálogo `material: "kerzul"` (las 10, Escudo incluido).
  `puedeEquiparSinRareza` (`rules/equipo.ts`) decide la excepción: ficha **En creación**
  (`DRAFT`; en revisión es solo lectura), quien compra es el **jugador** (el máster no tiene
  tope, así que si equipa él no se marca ni gasta el hueco), la especie trae la excepción, la
  pieza es de ese material y no hay ya `maxPiezas` piezas `viaEspecie`. `equiparAction` la
  aplica vía `topeRarezaDeCompra` y el **servidor** pone `viaEspecie: true` (nunca la acepta
  del cliente). Quitar la pieza libera el hueco. La Tienda pinta "vía especie" o el motivo
  ("Ya tienes tu pieza de kerzul vía especie"); Equipo marca la pieza. Ficha v15 (la marca es
  opcional, la migración no mueve nada). El NPC no la recibe (es de creación, §14.3).

### 14.7 Movimiento, carga y blindaje `[FIRME · ESP + usuario M6, M7, M14, M23]`

| Fórmula | General (sección 5) | Arköru | Arianyi | Zimethroni (Noble) |
|---|---|---|---|---|
| Carrera | 16 + (Pot + Atl) m | igual | igual | +4 m |
| Salto vertical | 15 × (Pot + Atl) cm, mínimo 15 | 18 × (Pot + Atl) cm, mínimo 15 (M23) | igual | +200 cm (M14) |
| Salto horizontal | 100 + (Pot + Atl) × 20 cm | 100 + (Pot + Atl) × 25 cm | igual | +200 cm (M14) |
| Escalada | 4 + (Pot + Atl)/2 m | 8 + (Pot + Atl)/2 m | igual | +2 m |
| Nado | 4 + (Pot + Atl)/2 m | 2 + (Pot + Atl)/2 m | 8 + (Pot + Atl)/2 m, **sustituye** (M6) | +2 m |

- **Arköru, carga +20 %:** multiplica la carga sin penalizador de la sección 5.5 (× 1,2), no
  es un +N.
- **Arköru, armadura natural 1:** línea propia en el blindaje, **se suma** a la armadura
  puesta; no vale contra Fuego ni Mental (M7, mismo criterio que S19).
- **Zimethroni, orden del +N** (decisión del usuario 2026-10-13): los +N se suman **después**
  del mínimo y del corte en 0. Salto vertical = `max(15, 15 × base) + 200`: con base 0 o
  negativa, 215 cm. Escalada, nado y salto horizontal igual (`max(0, …) + N`). La carrera
  suma su +4 dentro del corte, como antes de E3: con 16 + base no se llega a cortar.

*En la app (E3), todo mecanizado; se resuelve una vez en la `FichaResuelta` y le llega
también al NPC en modo libre (14.3):*
- **Fórmula de movimiento** (Arköru, Arianyi): `formulaMovimiento` en el rasgo (solo las
  constantes que cambian: `saltoVerticalPorPunto`, `saltoHorizontalPorPunto`, `escaladaBase`,
  `nadoBase`) → `formulaMovimientoDeEspecie` (`rules/especie.ts`) la completa con
  `FORMULA_MOVIMIENTO_GENERAL` (15/20/4/4, `rules/formulaMovimiento.ts`) → `movimiento(sheet,
  mods, formula)`. La base (Potencia + Atletismo + exoesqueleto) no cambia.
- **+N de Zimethroni**: `Modificador` `{ tipo: "derivado" }` en el rasgo Hiperactivo;
  `DERIVADOS_MODIFICABLES` gana `saltoVertical`, `saltoHorizontal`, `escalada` y `nado`.
- **Carga**: `multiplicadorCarga: 1.2` en el rasgo → `cargaMaxima(sheet, mods,
  multiplicador)`, sobre el total de 5.5 con el exoesqueleto dentro. Los tres tramos dan
  entero (Fuerza × 24, 18, 12, 6), sin redondeo.
- **Armadura natural**: `armaduraNatural: 1` en Matriz Biometálica →
  `FichaResuelta.blindaje.armaduraNatural` → `desgloseBlindaje(…, armaduraNatural)`, línea
  "Armadura natural · Arköru" en Bloquear daño. El crítico desarmado letal sigue pendiente (E4).
- **Notas en Personaje → Estado** (`notasDeEstado`, `rules/fichaResuelta.ts`): junto al
  valor, de dónde sale que no sea el general: "fórmula · Arköru", "+200 · Casa de
  Zimethroni", "×1,2 · Arköru"; conviven con la del exoesqueleto.

### 14.8 Tiradas

**Bonos y casillas** `[FIRME · ESP; en qué tirada cae: INFERIDO · propuesta §1/§4 + usuario M8, M13, M17, M22]`

Las condiciones van como **casilla en la tirada** que solo aparece si la ficha tiene ese
rasgo (usuario, §5b de la propuesta).

| Rasgo | Efecto | Dónde |
|---|---|---|
| Riux, Piel Irisada | +2 contra radiación astral o ambiental | Casilla en Salvación de Fortaleza |
| Arköru, Inamovibles | +2 para evitar derribos | Casilla en "Saltar, levantarse" (antes "Saltar, escalar, levantarse"). No hay salvación contra derribo (el de las armas pide "su propia salvación" sin decir cuál): `TODO(revisar)` |
| Arköru, Adaptación Térmica | +2 contra efectos de temperatura | Casilla en Salvación de Fortaleza |
| Arköru, Sistemas Filtradores | +2 contra efectos de filtración en el aire | Casilla en Salvación de Fortaleza |
| Arköru, visión | −1 en ataques a distancia | Fijo en toda tirada de Combate a Distancia (armas de fuego, pesadas, lanzagranadas, Proyector de Pulso a distancia); **no** en granadas ni armas arrojadizas, que se lanzan con Atletismo (M8). Ver la nota de Iniciativa abajo |
| Arköru, visión | −1 en percepción visual | Casilla en Buscar/percibir, que es la Alerta activa; **no** en Alerta pasiva, que no tira (M8) |
| Arköru, Matriz Biometálica | Crítico desarmado → daño letal | Texto de crítico en toda la Pelea: Puñetazo, Patada y Codazo o Rodillazo ("ataque desarmado" sin excepciones, usuario 2026-10-13; la Malla Plasmática también) |
| Arianyi, Empatía Biológica | +2 a la tirada pertinente; tocando o muy cerca; requiere concentración; en combate, acción compleja | Casilla en Buscar/percibir (nervios, mentiras) y Tratar heridas (metabolismo). **No** en Convencer/mentir: esa es la tirada del que miente |

**Éxito → crítico y fallo → fallo crítico** `[FIRME · ESP + usuario M13, M17, M22]`

| Rasgo | Efecto | Dónde |
|---|---|---|
| Manduk Noble | Éxito cuenta como crítico contra intimidación y miedo | Casilla "¿es contra miedo?" en Salvación de Voluntad (M13) |
| Irota | Éxito cuenta como crítico en salvaciones contra toxinas, venenos y enfermedades | Casilla en la **Salvación de Fortaleza**, visible solo para Irota (usuario, 2026-10-09) |
| Axadren | Éxito cuenta como crítico en alerta contra enemigos ocultos | Casilla "¿enemigo oculto?" en Alerta activa y Buscar/percibir (M22). La Alerta pasiva no tira dado |
| Elión | Éxito cuenta como crítico contra efectos sugestivos | Casilla en la **Salvación de Voluntad**, visible solo para Elión (usuario, 2026-10-09) |
| Elión | Fallo cuenta como fallo crítico en Empatía, Humor o Negociación | **Construido** (2026-10-24), sin casilla: en las tiradas que nombran una de las tres (Discernir mentiras, Resistir distracción, Convencer / mentir con ella elegida…) cualquier fallo es crítico (margen de fallo crítico 1, nota en el resultado). Vale la especialidad que nombra la tirada, la tenga o no la ficha (usuario, 2026-10-24). Sustituye a la casilla de M17 |

**Penalizadores por umbral** `[FIRME · ESP + usuario M12]`
- **Guerrero:** heridas un punto menos por tramo: −1/−3/−5 → 0/−2/−4.
- **Siervo:** fatiga un punto menos por tramo: −1/−2 → 0/−1.
- Solo el −N a todo de la sección 7: la media velocidad y la reducción de carga del mismo
  umbral no cambian (`TODO(revisar)` en `estados.ts`).

*En la app (E4, 2026-10-13):*
- **Casillas**: dato `casillas` del rasgo (tiradas fijas por id + la `CondicionTirada`);
  `casillasDeEspecie` las mete en el **mismo índice** que las del equipo
  (`FichaResuelta.indiceCondiciones`), así que salen solo con el rasgo y `montarTirada` las
  suma sin código propio. También al NPC en modo libre (son derivadas, 14.3).
- **"Éxito → crítico"**: casilla sin número con `margenCriticoExito: 0` (el mismo dato que
  la VTM "complejo"); con dos márgenes activos gana el más bajo.
- **−1 a distancia**: `Modificador` de tirada con alcance `grupoHabilidad` (grupo
  `Ataques` + Combate a Distancia), decisión del usuario 2026-10-13: no llega a "Iniciativa
  (desenfundando)", que usa la misma habilidad pero no es un ataque.
- **Umbrales**: dato `ajusteUmbrales` del rasgo → `FichaResuelta.ajusteUmbrales` →
  parámetro obligatorio de `modificadoresDeUmbrales`. Un tramo que queda en 0 no da línea;
  los demás salen como "Malherido (Manduk · Guerrero) −2".
- **Textos** (14.10): dato `textos` del rasgo → `FichaResuelta.textosTirada`;
  `conExtrasDeFicha` los añade a la nota de la tirada (o a su texto de crítico).

### 14.9 Efectos en otras áreas `[FIRME · ESP + usuario M16, M18]`

- **Maolher, peaje neurológico:** al usar un poder que consuma fatiga, salvación de
  Fortaleza, dificultad 5 + nivel empleado.
  - Éxito: nada. Fracaso: 1 nivel de daño **no letal** por punto de fatiga. Fracaso
    crítico: 1 nivel de daño **letal** por punto de fatiga.
  - Se tira siempre que se pague fatiga, aunque el poder falle; el blindaje no lo absorbe
    (M16, como la sobrecarga de la sección 10.6).
- **Irota, fármacos y drogas a la mitad:** duración, modificadores y efectos sobre vida o
  fatiga, tanto beneficiosos como perjudiciales. Redondeo hacia abajo, mínimo 1 (M18).
- **Arianyi, Visión UV e infrarroja:** ve calor y huellas químicas o eléctricas; cuesta 1
  punto de fatiga por hora. Acción sin dado ("activar visión"); el gasto por hora, a mano.
- **Axadren, visión infrarroja:** la misma percepción; el PDF no le pone coste.

*En la app (E5, 2026-10-13):*
- **Peaje**: dato `peajeNeurologico: { dificultadBase: 5 }` en el rasgo →
  `FichaResuelta.peajeNeurologico` → `usarPoder` devuelve `peaje: { dificultad, puntos }`
  (`rules/usoPoder.ts`). En Acciones, un panel "Peaje neurológico · Salvación de Fortaleza,
  dificultad X" con botón Tirar, **debajo del de sobrecarga** si saltan los dos. La tirada es
  la Salvación de Fortaleza montada con `montarTirada` (umbrales, estados…) y resuelta con
  `tirarMontada`; `danioDePeaje` decide el daño, que se resta de la vida como el resto de
  daño propio de los poderes, sin blindaje. También al NPC (es efecto): en la consola de
  combate sale el panel, pero el daño lo resta el máster. Tres decisiones del usuario:
  - **Solo cuenta la fatiga pagada**: lo que pagan las cargas de Derivación Psiónica no
    (todo con cargas = sin peaje). La parte que Proeza manda a fatiga temporal sí cuenta.
  - **Prolongar un turno de Proeza paga peaje** por los puntos de ese extra, con el nivel
    empleado del poder. Cada peaje lleva su panel.
  - Un poder con fatiga no numérica (se paga a mano) no genera peaje: también a mano
    (`TODO(revisar)` en `usoPoder.ts`).
- **Irota**: la app no mecaniza los efectos de los fármacos, así que va como **nota fija**
  (dato `notaFarmacos` → `FichaResuelta.notasFarmacos` → `accionesDeFarmacos` /
  `accionesDirectasDeFarmacos`) en cada fila de fármaco y en su tirada. La casilla "Bajo
  Xovromium" de los poderes no cambia: la mitad de 1 con mínimo 1 sigue siendo 1 (+1 a la
  tirada, −1 de fatiga).
- **Visión**: dato `accionSinDado` → `FichaResuelta.accionesEspecie` → fila "Activar visión"
  en el grupo Acciones, con la nota de qué ve. Arianyi: al confirmar se cobra **1 punto de
  fatiga, la primera hora** (por el mismo `onPagarFatiga` que los poderes); las horas
  siguientes, a mano (lo dice la nota; la app no lleva el tiempo). Axadren: sin coste.

### 14.10 Sin mecanizar: texto en la ficha `[FIRME · ESP + usuario M15, M19]`

| Rasgo | Texto | Por qué no se mecaniza |
|---|---|---|
| Humanos, gastar la bolsa | Ver 14.6 | No hay aumentos |
| Ílkrem, regeneración | 1 nivel no letal por turno, 1 letal por minuto (10 turnos), 1 grave por hora; fatigado, el doble de lento; exhausto, nada | La app no lleva el paso del tiempo |
| Ílkrem, falla metabólica | Daño de plasma o fuego → Fortaleza (dificultad 9) contra aturdimiento | Depende de "estados bien definidos". Nota en la Salvación de Fortaleza (E4) |
| Axadren, deslumbramiento | Explosión de plasma, destello intenso o PEM → ceguera (dificultad 9); otras cegueras similares, dificultad +3 | Ídem. Sin nota: no hay salvación contra ceguera (§Ceguera no dice qué atributo la resiste), `TODO(revisar)` |
| Zimethroni, hiperactividad | Atacado físicamente mientras se mueve: +1 daño por cada 4 niveles recibidos (M15) | Ídem. Nota en Defensa (E4; `TODO(revisar)`: es daño recibido, Bloquear daño no lleva notas) |
| Zimethroni, tras esquivar | Esquiva con éxito → 1 casilla gratis, una vez por turno | Nota en Defensa (E4) |
| Riux, Ciclo Cerrado | Media ración para la misma fatiga; Descanso Largo de 4 h; 4 Descansos Breves al día en vez de 2 | No hay descanso en la app; "media ración", solo texto (M19) |
| Siervo | Media ración; Descanso Largo de 6 h | Ídem |
| Riux, Estasis · Arianyi, apnea doble | Narrativo | Sin número / sin regla de apnea |

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
| S4 | Tope de **3 especialidades** por habilidad. | **Murillo (2026-09-23) confirma que las reglas no ponen tope, solo el coste en experiencia.** Se mantiene el 3 igualmente, como límite de interfaz deliberado (decisión del usuario, 2026-09-23: la diferencia es menor, no compensa tocarlo ahora) — ya no es un hueco de regla, es UX. |
| ~~S5~~ | ~~Las especialidades son **texto libre**.~~ **Cerrado (tanda ESP, 2026-10-15):** lista cerrada por id desde `docs/fuente/habilidades.md` (§3, `catalog/especialidades.ts`). | El fallo crítico de Elión (§14.8), construido con la tarea "La tirada sabe qué especialidad se usa" (2026-10-24). |
| ~~S6~~ | ~~El movimiento no baja de 0.~~ **Superado (Murillo, 2026-09-23):** el salto vertical tiene mínimo **15 cm**, no 0; el resto de fórmulas de movimiento sigue cortándose en 0 (no preguntado, no respondido). El mínimo de 15 cm vale también para el salto vertical del Arköru (usuario, M23, §14.7). | Se queda aquí tachado como rastro — igual que S1. |
| S7 | En creación el tope es **4** tanto en atributos como en habilidades; 6 es el techo del sistema, alcanzable en partida con puntos que reparte el máster. | `HOJA2` sube el "4/5" y "3/5" de `HOJA` a "4/6" en los dos, unificando el máximo de creación. La partición 4-creación/6-techo la confirma el usuario (2026-09-10); falta que Murillo la valide con una fórmula de progresión concreta. **Especies (usuario, M1-M2, 2026-10-09):** el 4 y el 6 miran solo lo comprado; el bono de especie va aparte y el total puede superarlos (§14.2). **Aumentos (usuario, 2026-10-16):** igual, sus puntos van aparte y sin límite (§11.3). |
| S8 | El **valor de Atletismo** que entra en las fórmulas de movimiento es el valor puro, sin aplicar la mitad por estar fuera de especialidad. | Las fórmulas de `HOJA` dicen "Potencia + Atletismo" a secas. |
| S9 | En un módulo con niveles (mejora estándar o subsistema de `EQUIP`), un efecto que un nivel introduce y los superiores no repiten ni anulan se **acumula**: el nivel N conserva lo desbloqueado en 1..N-1. Cuando el documento da un total explícito para ese nivel ("mejora la bonificación a +2"), se usa ese total tal cual, sin sumarlo al de niveles inferiores. **Implementado de verdad 2026-09-25** (antes solo estaba escrito aquí: el código leía únicamente el bloque del nivel exacto, `niveles.find(n => n.nivel === pieza.nivel)`, y perdía todo lo de 1..N-1 que el nivel actual no repitiera — bug real, detectado en Mira Telescópica/Visor Nocturno, que hasta entonces se parcheaba a mano copiando el efecto en cada nivel superior). `nivelesHasta()`/`acumulaPorClave()`/`ultimoQueDefine()` en `lib/rules/equipo.ts` lo resuelven de forma genérica; los parches a mano ya no hacen falta y se han quitado (Soporte Vital, Sistema de Retroceso, Estabilizador Neuronal). | `EQUIP` describe cada nivel como una mejora sobre el anterior, nunca como un reemplazo (p. ej. Soporte Vital nivel 1 da Resistencia Térmica y los niveles 2-3 no la repiten, pero tampoco dicen que se pierda). Asumir que se pierde algo al subir de nivel sería más raro que asumir que se mantiene. |
| S10 | El bono de Fuerza del Exoesqueleto, que `EQUIP` duplica para "carga transportable y proezas de fuerza", se aplica **x2 a las 5 fórmulas de movimiento** (Carrera, Salto Vertical, Salto Horizontal, Escalada, Nado) **y a la Carga Transportable** (sección 5.5, `cargaMaxima()`) — la cita completa de `EQUIP`, ya cerrada del todo (2026-09-11: hasta ahora solo se aplicaba a movimiento). **El +N normal a la Fuerza** ("aplicable a tiradas y atributos") se mecaniza el 2026-10-23 (decisión del usuario): modificador de atributo con `exceptoSaludYSalvaciones`, que cuenta en Atributos, Potencia/Fortaleza de las tiradas y el daño melee Fue+N, pero **no** en la vida, en ninguna salvación (todas las de Fortaleza: "ambientales, tóxicos o de fatiga" son casi todas), ni en movimiento/carga (allí ya entra el doble aparte). Con el Brazo Biónico marcado manda la Fuerza del brazo, que ya lo lleva: se apilan (usuario, 2026-10-24). Los requisitos de dotes no lo cuentan (son de especie y aumentos). Activo siempre que esté equipado; la batería no se gasta. | `EQUIP` no dice explícitamente qué cuenta como "proeza de fuerza"; las 5 fórmulas salen de Potencia + Atletismo, la misma base física, así que tratarlas todas igual es lo más consistente. Pendiente de confirmar con Murillo. |
| S11 | El redondeo de los Aplicados (media de dos básicos) es **hacia abajo**. | Decisión explícita del usuario (2026-10-23; antes, 2026-09-10, era hacia arriba): mismo criterio que la habilidad fuera de especialidad (`Math.floor`). `HOJA2` no especifica el redondeo. |
| S12 | ~~Dotes no tiene presupuesto de creación en las letras A-D, solo **0 en la letra E**.~~ **Tumbado por `HOJA3` (2026-10-14):** A 18 · B 15 · C 12 · D 9 · E 6. | `HOJA2` solo rellenaba la casilla E; el documento nuevo trae la columna entera. |
| S13 | Espada Ligera, Espada y Montante (`catalog/armasMelee.ts`) son **Común**. | `EQUIP` deja esas tres celdas de rareza en blanco (a diferencia de Pelea, que también tiene el coste en blanco: aquí sí hay coste, 100-150 cr.). Decisión del usuario (2026-09-11): Común encaja con ese rango de precio, igual que el resto de piezas Común del catálogo. |
| S14 | Los umbrales de un mismo recurso **no se acumulan**: solo el más profundo alcanzado aporta su penalizador (Malherido sustituye a Herido, no se suma). PG y fatiga sí son independientes entre sí — Herido (PG) y Fatigado (fatiga) a la vez sí suman sus dos penalizadores. | `SISTEMA` (`docs/sistema-y-combate.md` §"Puntos de salud") da los umbrales como tres/dos filas de una tabla, sin decir si se combinan. Sumar -1-3-5 en Moribundo (-9 a todo) sería más severo que cualquier otra regla del sistema; tratar los tramos como bandas excluyentes es la lectura estándar en este tipo de tablas y la que no exige inventar un techo nuevo. |
| S15 | El "(mínimo 1)" de Moribundo y Exhausto (`docs/sistema.md` §7) se implementa como: el umbral de esa banda es `max(2, PGmáx × 0.1)`, comparado con `<`. Así un personaje con PG máximos bajos entra en Moribundo en cuanto le queda 1 punto, en vez de que la banda quede vacía por redondeo (con PGmáx=8, el 10% son 0,8, que sin el mínimo nunca se cruza antes de llegar a 0, que ya es "inconsciente", un estado distinto). Herido, Malherido y Fatigado no llevan ese "mínimo" en el documento, así que no se les aplica. | El documento fija el mínimo en puntos absolutos ("mínimo 1") pero no dice cómo combinarlo con el corte porcentual cuando ambos compiten. Es una decisión de redondeo, no de regla del juego — pendiente de que Murillo confirme si el criterio es este u otro. |
| S16 | Al transcribir los 20 estados de combate (`catalog/estados.ts`, fuente `docs/sistema-y-combate.md` §"Efectos y estados"): cada grado (Fracaso crítico/Fracaso/Éxito/Éxito crítico, o nivel acumulado) se mecaniza como **autocontenido**, sin sumarse al texto base salvo que el documento diga explícitamente "además de lo anterior". Se convierte en `Modificador` un número que **reduce un atributo básico directamente** ("Fuerza y Aguante en 1") o es un **penalizador plano a "todas las tiradas"**, sin condición. Se queda solo en texto (`detalle`, sin mecanizar): penalizadores a "tiradas que usen" un atributo o aplicado concreto (no hay alcance para eso todavía — sería el siguiente hueco del motor de modificadores si algún día compensa cerrarlo), reducción de velocidad/carga (mismo motivo que la Carga Transportable, aparcada: es un porcentaje o un tope, no un delta), daño narrado (se aplica con la acción de PG de la consola de máster, no como modificador pasivo) y cualquier condición que dependa de que el narrador decida algo. | Los 20 estados mezclan, en la misma tabla, penalizadores planos (mecanizables ya) con penalizadores condicionados por atributo/aplicado/objetivo y con daño narrado — no hay una sola regla de transcripción que sirva para todo el bloque sin fijar antes qué se mecaniza y qué no. Reduce el riesgo de "inventar" un alcance de modificador que el motor no soporta solo para que un número "haga algo". |
| S17 | Precio de la **batería portátil** (recarga a tope cualquier célula de Subsistema o de Movilidad Aérea): **150 créditos**, fijo, sin depender de la capacidad de la célula. Desde 2026-10-24 **ya no la usan las armas de energía**: se recargan con su munición regular por proyectil (S95). | `EQUIP` no la menciona — es un ítem nuevo para probar RECURSOS (`docs/tareas.md`, extensión de fase 6b). Decisión explícita del usuario (2026-09-22); el uso en armas de energía, sustituido por S95 (2026-10-24). |
| S18 | ~~Cargador de balas normales a 50 créditos fijos.~~ **Sustituido por S95 (2026-10-24)**: el cargador se paga por proyectil (Munición Calibre Estándar, 2 cr./proyectil): lo que falta para llenarlo, o un cargador entero de repuesto si ya está lleno. | Era un ítem nuevo para RECURSOS sin base en `EQUIP` (usuario, 2026-09-22); el documento nuevo trae «Munición Regular» con precio por proyectil (`docs/fuente/equipamiento.md`). |
| S19 | Blindaje (`blindajeContra()`, `lib/rules/blindaje.ts`): la absorción de 1:1 aplica a **cualquier tipo de daño salvo Mental y Fuego**, que se quedan en 0. Tóxico cuenta como cualquier otro tipo — el blindaje SÍ reduce el daño de un arma tóxica; lo que no toca es el estado de Enfermedad/Envenenamiento que dispare esa arma, que se resuelve aparte con su propia salvación. | Mental ya "omite armaduras" (§7, `FIRME`); Fuego no se menciona como cubierto en ninguna fuente de blindaje del catálogo (armadura, Escudo Deflector) — es justo lo que Mejora Ignífuga reabre, así que sin ella se asume 0. Decisión explícita del usuario (2026-09-27), pendiente de que Murillo confirme si hay más excepciones. La armadura natural del Arköru sigue el mismo criterio (usuario, M7, §14.7). **Mejora Ignífuga nivel 1, construida 2026-10-23**: instalada en la armadura que cuenta, reabre Fuego solo para el blindaje de esa armadura (S85). |
| S20 | Lanzar un arma melee "Arrojadiza" (Lanza Corta, Cuchillo de Combate, Puñal y Lanza Corta de Kerzul) se resuelve **igual que lanzar una granada**: Potencia + Atletismo, con la dificultad y el daño del primer modo del arma (el Simple). Sin estilo Sutil — es un lanzamiento, no un golpe. **Alcance: el suyo** (2026-10-24): Lanza Corta y Lanza Corta de Kerzul Potencia × 12 m, Cuchillo de Combate y Puñal de Kerzul Potencia × 6 m (`ArmaMelee.arrojadiza` lleva el multiplicador); antes Potencia × 10 m, el de la granada. | `EQUIP` marca "Arrojadiza" sin par ni dificultad. Decisión explícita del usuario (2026-09-28): reutilizar la única regla de lanzamiento a mano que ya existe; pendiente de que Murillo confirme el par. **El alcance sí lo trae la foto de Drive** ("Arrojadiza: Potencia x 12" / "Arrojadizo: Potencia x 6", `docs/fuente/equipamiento.md`): este supuesto decía que no, corregido 2026-10-24. |
| S21 | En un fusil de precisión (Mira Telescópica nv1 integrada, `ArmaFuego.miraIntegrada`), no se puede instalar otra mira de nivel 1; una de **nivel 2 o 3 sustituye a la integrada**: no ocupa ranura de mejora y solo aporta el bono de tramo que supera al de la integrada (nv3 → +1 en media/larga; nv2 → nada extra, solo su visión nocturna/térmica). | `EQUIP` dice que la integrada está "ya contabilizada en la dificultad de ataque y en las mejoras disponibles", y no dice qué pasa al mejorarla. Bloquear solo el nivel 1 es decisión del usuario (2026-09-28); lo de la ranura y la resta del bono es la lectura que evita contar dos veces lo que ya está en la dificultad. Pendiente de que Murillo confirme. |
| S22 | La mejora **Munición Especial** se da de alta como una mejora de arma **por tipo de munición**, y cada una **ocupa una ranura** de `mejorasAdmitidas`. Para munición **Muy Extraña** (radiactiva, supresora) cuesta **62.500** créditos. | `EQUIP` dice que se puede instalar "repetidas veces para distintos tipos", pero no si cada una ocupa ranura; y su tabla de precios solo llega a Extraño (500 / 2.500 / 12.500, ×5 por rango): se sigue la misma progresión. Decisión del usuario (2026-09-28), pendiente de que Murillo confirme. |
| S23 | Altura y peso por defecto = **punto medio redondeado** del rango de referencia de la especie (§14.5), sin guardarse en la ficha. | El documento solo da rangos; el usuario (2026-10-13) quiere los campos rellenos de entrada sin que el jugador tenga que mirar la tabla. |
| S24 | Un nivel efectivo de disciplina por encima de 6 (Resonancia comprada 6 + 1 del Arianyi = 7) **cuenta como 7 para los requisitos** y para cualquier "desde nivel X", pero **los efectos usan la fila del 6** (tablas por nivel y fórmulas "× nivel": Alerta pasiva da 120 m con 6 y con 7). §14.6. | `ESP` dice que el +1 "puede superar el máximo", pero las tablas de `docs/psionica.md` acaban en el 6 y no hay fila 7 que leer. Decisión del usuario (2026-10-13), con test (`especie.test.ts`). Pendiente de que Murillo diga si un 7 debe hacer algo más. |
| S25 | **Requisito roto**: si el máster cambia la especie de una ficha aprobada (sin reset) o la de un NPC (modo libre), puede quedar una disciplina con su requisito sin cumplir (ex-Arianyi con Inducción y Resonancia comprada 0). **No se borra nada**: Psiónica la marca como "requisito no cumplido" (`requisitosRotos`, `psionica.ts`); se puede bajar pero no subir. En Acciones sus poderes **se ven bloqueados**, con el motivo ("Requiere Resonancia 1"), y no aplican efectos pasivos ni ventajas (`bloqueoPorRequisito`, `poderes.ts`). §14.6. | El reset de §14.3 no aplica en esos dos casos, y borrar lo comprado sería destruir datos del máster. Verlo bloqueado (ni usable ni escondido) le enseña al máster qué ha roto. Decisión del usuario (2026-10-13). |
| S26 | La **media velocidad** de Malherido y Exhausto (§7) parte a la mitad la **carrera, el vuelo (Movilidad Aérea) y la levitación (Traslación)**. Saltos, escalada y nado no cambian. `TODO(revisar)` en `fichaResuelta.ts` y `estados.ts`. | §7 dice "media velocidad" sin decir qué movimientos son "velocidad". Leído como desplazamiento por turno; los saltos y la escalada/nado son distancias de una acción, no una velocidad. Propuesta por defecto implementada en M1b (2026-10-13), pendiente de Murillo (pregunta 37). |
| S27 | **Malherido y Exhausto a la vez no se acumulan**: la velocidad se divide entre 2 una sola vez, y de las reducciones de carga se aplica **la mayor**, no la suma (Malherido + Exhausto = −25 %; Moribundo + Exhausto = −50 %). Moribundo + Exhausto sí da media velocidad (la de Exhausto). | Misma lectura que S14 llevada al otro eje: sumar dos "media velocidad" (un cuarto) o −25 % −25 % no lo dice ninguna fila de la tabla. Propuesta por defecto implementada en M1b (2026-10-13), pendiente de Murillo (pregunta 38). |
| S28 | Las reducciones de §7 **redondean hacia abajo** (carrera 21 → 10; carga 45 × 0,75 → 33). | El documento no da redondeo. Hacia abajo es lo conservador para un penalizador. Propuesta por defecto implementada en M1b (2026-10-13), pendiente de Murillo (pregunta 39). |
| S29 | La reducción de carga de §7 va **al final, sobre la carga ya multiplicada por la especie** (Arköru: Fuerza 4 → 96 kg, Malherido → 72, Moribundo → 48). | Los dos son porcentajes sobre el mismo número: el orden solo cambia el redondeo, pero hay que fijarlo. Propuesta por defecto implementada en M1b (2026-10-13), pendiente de Murillo (pregunta 40). |
| S30 | Los **requisitos de dote** (§9.1, "especie incluida") miran atributos, aplicados, habilidades y disciplinas **con los modificadores de especie solamente**: ni equipo ni estados de combate ni umbrales de salud/fatiga. La habilidad cuenta entera (no la mitad fuera de especialidad) más el bono de especie; la disciplina, su nivel efectivo (Resonancia +1 del Arianyi incluida); "psiónica de origen biológico" = alguna disciplina efectiva > 0 (hueco para el implante en `psionicaPorImplante`, `dotes.ts`). **Aumentos (§11.3, construido en A1):** sus +1 permanentes sí cuentan, como la especie; el equipo normal no; el +1 temporal de un activable tampoco (R3). | Lectura literal de §9.1: un requisito no debería romperse por quitarse una pieza o por estar herido. Tanda D1 (2026-10-15). Resuelto el TODO del equipo con §11.3: el equipo normal no cuenta, los aumentos sí. |
| ~~S31~~ | ~~Especialidad en requisitos de dote por nombre normalizado.~~ **Cerrado (tanda ESP, 2026-10-15):** los requisitos comparan **ids** del catálogo; el generador de dotes falla si un id del borrador no es una especialidad de la habilidad del requisito (tabla de equivalencias en el script, hoy vacía). Los nombres legibles salen del catálogo (adiós a `NOMBRES_ESPECIALIDAD_DOTES`). | — |
| S32 | **Ficha aprobada: ninguna dote se vende**, ni las de la foto de aprobación ni las compradas después con XP (mismo criterio que atributos, habilidades y disciplinas aprobados, que solo suben). La foto (`approvedSnapshot.dotes`, opcional para no invalidar las fotos viejas) dice cuáles venían de creación. `TODO(revisar)` en `dotes.ts` (`motivoNoQuitable`). | El usuario fijó "una dote de la foto no se quita"; para las compradas con XP no dijo nada, y quitarlas sin devolver XP pierde XP y devolviéndola es vender. Lo conservador: nada. Tanda D1 (2026-10-15). |
| S33 | **Lectura tolerante de `sheet.dotes`**: una entrada sin la elección que su dote exige, o con una fuera de la lista cerrada, **se descarta entera** (no se queda la dote sin elección); una elección abierta se recorta a 60 caracteres; a una dote sin elección se le quita la que traiga. | "Descartar elecciones que no encajan" (encargo D1) leído como descartar la compra: una *Especialidad Médica* sin pareja no significa nada. Ninguna ficha tiene dotes todavía, así que no se pierde nada real. Tanda D1 (2026-10-15). |
| S34 | **Dote con requisito no cumplido: sin efecto.** Mientras una dote lleve la marca de D1 ("requisito no cumplido"), no pone casillas, bonos ni textos (`dotesActivas`, `rules/dotesEfectos.ts`), y no cuenta en `fuentesDeCapa1`. Sin cascada: una dote cuyo requisito es otra dote marcada sigue valiendo (la marca tampoco la propaga). Una mejorada marcada no sustituye a la básica. NPC del máster (modo libre): no se miran requisitos (§9.4). | Lo conservador: que una dote que ya no se cumple no siga sumando. Igual que la psiónica con requisito roto (S25). Tanda D2a (2026-10-15), pendiente de que el usuario lo confirme. |
| S35 | ~~**Bono de especialidad = casilla en la habilidad.**~~ **Sustituido (2026-10-24):** el alcance `especialidad` casa con las tiradas que nombran esa especialidad (la del arma, la de la acción o la elegida en Convencer / mentir), la tenga o no la ficha. Un bono de especialidad sin condición suma solo; con condición, su casilla solo sale en esas tiradas. *Presencia Imponente*: casilla «¿Tu físico influye en la amenaza?» en Convencer / mentir con Intimidación elegida; ya no en "Iniciativa (distrayendo)", que es Manipulación o Sigilo (usuario, 2026-10-24). Queda como apaño solo lo que no tiene tirada propia (S36). | Decisión del usuario (D2a, 2026-10-15); sustituido con la tarea "La tirada sabe qué especialidad se usa". |
| S36 | **Rastreo, Subsistencia e Investigación van a "Buscar / percibir".** No tienen tirada propia; sus casillas (*Rastreo al Paso*, *Bioma Predilecto*, *Descartar Teoría*) van a la única tirada de Exploración del grupo Acciones (mismo aplicado y habilidad), con la acción en la etiqueta, y sus textos a su nota. No a "Iniciativa (habitual)". Es un apaño: se mueven a su tirada cuando exista (tarea "Tiradas fijas que faltan según habilidades.md"). | El criterio de S35 antes de sustituirse, a falta de tirada propia. Tanda D2a (2026-10-15); aceptado como apaño por el usuario (2026-10-15). |
| S37 | ***Movimiento Sigiloso*: casilla de opción sin el penalizador.** La dote pone en Sigilo una casilla "moviéndote oculto" con lo que reduce en cada ritmo (mitad, total, esprint), pero la tirada de Sigilo de la app no lleva el penalizador por moverse oculto (−2/−4/−8, `docs/fuente/habilidades.md`): ese sigue a mano. La etiqueta dice cuánto compensa ("Moviéndome oculto: reduce 2 (Movimiento Sigiloso)", "reduce hasta 4" en la Mejorada). *Movimiento Sigiloso Constante* ("sin penalizador") no es un número fijo: texto en Sigilo, sin casilla. | Añadir el penalizador a Sigilo sería una regla nueva fuera de la tanda. Tanda D2a (2026-10-15); etiqueta y Constante, usuario 2026-10-15. |
| S38 | ~~**Bono con umbral de ficha, partido.**~~ **Resuelto en D2d**: *Presencia Imponente* (+2 con Fuerza ≥ 5) e *Imitación* (+3 con Interpretación ≥ 3) ponen **una** casilla con el valor ya resuelto con la ficha (los valores de requisito: con especie, sin equipo ni estados; la habilidad entera), y la etiqueta dice el umbral cuando se cumple. El texto del umbral de *Imitación* del borrador pasa a la tarjeta de la dote. | Decisión del usuario (D2a, 2026-10-15; D2d). |
| S39 | **Habilidad sin lista de especialidades (Interpretación): siempre entera.** No admite especialidades y la tirada usa el valor entero, no la mitad (`valorEfectivo`, `derivados.ts`). **Sigilo sale de aquí (2026-10-23)**: la foto de Drive le da Esconderse y Hurto (§3). Con la regla general de §3 (sin especialidad nombrada, entera) el caso queda cubierto también por ahí. `TODO(revisar)`. | La regla de §3 es "en la escogida, entera; en el resto, la mitad": sin lista no hay "resto". Con la mitad, nadie podría tirar Sigilo entero nunca. Tanda ESP (2026-10-15), pendiente de confirmar. **Confirmado por el usuario (Especialidades ESP, 2026-10-15)**; nota suya: probablemente falten especialidades por decidir en la fuente y se corrija más adelante. |
| S40 | ~~**La especialidad automática del arma solo va en los ataques**~~ **Construido el cambio (D2b-1, 2026-10-15): "Bloquear con X" (melee, Bayoneta, Aguijón) va con la especialidad de su arma, sin selector.** Antes:, no en "Bloquear con X" (tampoco el bloqueo de la Bayoneta ni el del Aguijón): el bloqueo sigue con el selector de la fila. `TODO(revisar)` en `combate.ts`. | El encargo decía "ataques con arma". Si el bloqueo también usa la del arma, es una línea por bloqueo. Tanda ESP (2026-10-15). **Cambia (usuario, Especialidades ESP, 2026-10-15): los bloqueos también usan la especialidad del arma**, como los ataques; se construye con D2b-1. |
| S41 | **Lanzar (arma melee arrojadiza o granada) usa Lanzamiento (Atletismo)**, no Armas Arrojadizas (Combate a Distancia), porque la tirada es Potencia + Atletismo (INFERIDO 2026-09-28). `TODO(revisar)` en `especialidadesArma.ts`. | La especialidad tiene que ser de la habilidad con la que se tira. Tanda ESP (2026-10-15). **Confirmado por el usuario (Especialidades ESP, 2026-10-15).** |
| S42 | **Migración v17**: cada texto de especialidad se casa por nombre normalizado (sin tildes ni mayúsculas, sin la "s" final de cada palabra) con una especialidad de **su** habilidad; lo que no casa se quita y se guarda en `avisoEspecialidades` (la pestaña Habilidades lo enseña con un botón para descartarlo). La elección de *Crítico Mejorado* se casa igual con una especialidad de arma; si no casa, la dote se quita (y va al aviso). | Decisión del usuario (ESP): no hay fichas activas, no se inventan equivalencias (Biónica en Tecnociencia o Química en Biociencia van al aviso). |
| S43 | ***Crítico Mejorado*: lista cerrada de especialidades de arma** (todas las de Combate Melee y a Distancia, Pelea y Escudos incluidas), y solo las que la ficha tiene **en la habilidad con la que cumple el requisito** (≥ 3). `TODO(revisar)` si Pelea o Escudos no cuentan como "especializaciones en armas". | Prosa: "una de sus especializaciones en armas para la habilidad con la que cumpla el requisito". Tanda ESP (2026-10-15). **Confirmado por el usuario (Especialidades ESP, 2026-10-15): Pelea y Escudos cuentan.** |
| S44 | ~~**Armas de fuego por empleo**: a una mano, Armas de Fuego Cortas; a dos manos, Largas; ametralladoras, Largas (no Pesadas).~~ **Sustituido (2026-10-23, foto de Drive `docs/fuente/habilidades.md` + usuario):** las especialidades de Combate a Distancia pasan a ser por familia de arma, y cada arma de fuego va por su `tipo` a la de su nombre (§3, "Especialidad por arma"); el Proyector de Pulso a Pistolas. Lo que sigue del supuesto vale para el resto: Armas Mecánicas, Kerzul mixtas (Espadas y Dagas), Bayoneta y lanzagranadas integrado (Armas Pesadas): como los dejó la tanda ESP (`especialidadesArma.ts`). | Usuario, Especialidades ESP (2026-10-15). **Construido (D2b-1, 2026-10-15)**: `especialidadArmaFuego` en `especialidadesArma.ts`. **Sustitución construida (2026-10-23)**: `especialidadArmaFuego` va por `ESPECIALIDAD_POR_TIPO_ARMA`; fichas viejas, migración v21 → v22. |
| S45 | **Familia y empleo de cada tirada de arma.** Bayoneta: golpe melee y bloqueo melee, a dos manos. Proyector de Pulso por su tipo: Aguijón ataque melee (su bloqueo, bloquear melee), disparo (Combate a Distancia y Tecnociencia) disparo; **sin empleo** (va en la armadura), así que un filtro de empleo no lo alcanza. **Lanzagranadas integrado: armamento pesado**, como su especialidad (S44), con el empleo del arma que lo lleva. Armamento pesado a dos manos ("Empleo a dos manos" del catálogo). Granada lanzada: a una mano. `TODO(revisar)` en `combate.ts` (lanzagranadas integrado, empleo del Proyector). | Familias del encargo D2b-1 (usuario); lo no dicho, por la especialidad ya decidida o la descripción del catálogo. **Confirmado por el usuario (2026-10-15)**: lanzagranadas integrado como armamento pesado; Proyector de Pulso sin empleo (va en la armadura y "permite disparar sin desenfundar", `docs/equipamiento.md`), así que no le alcanzan las dotes "a una mano". |
| S46 | **Requisito por rama deducido.** Si una dote pide "Combate Melee N o Combate a Distancia M", sus efectos sobre golpes y bloqueos melee exigen Combate Melee ≥ N, y los de disparos y armamento pesado Combate a Distancia ≥ M (valores de juego, especie incluida, como la compra); el NPC del máster no mira requisitos. Lanzar y Levantar escudo no tienen rama: si una dote del patrón los tocara, el generador falla. Encajan: *Asesino*, *Desenfundado Rápido*, *Golpe Entorpecedor* (y *Crítico Mejorado*, cuya especialidad ya se elige en la rama que cumple; en juego se vuelve a comprobar). | §9.5 "cada rama exige su requisito"; el borrador no traía `requisitoAlcance` (decisión del usuario, D2b-1). |
| S47 | ***Tirador de Larga Distancia* y su *Avanzado*: vale la mejor en cada ataque**, no la dote entera: en especialidad +2 (no +3), fuera de especialidad +1 (la básica), no 0. "De especialidad" = el ataque va en especialidad (`enEspecialidadEfectiva`). El disparo de Tecnociencia del Proyector no nombra especialidad (va entero desde 2026-10-23, §3) y ya no tiene selector: nunca va "en especialidad", así que solo le llega la básica. | "Vale la mejor" (§9.1) leído por tirada: quitar la básica entera dejaría peor al que tiene las dos fuera de especialidad. D2b-1. **Confirmado por el usuario (2026-10-15)**: fuera de especialidad solo aplica la básica (−2 + 1 = −1). |
| S48 | ***Crítico Mejorado* solo en ataques** (golpe melee, disparo, armamento pesado) cuya especialidad de arma es la elegida: ni al lanzar el arma (§9.5) ni al bloquear con ella (la prosa dice "ataques"). En juego deja de valer si la ficha ya no tiene esa especialidad en la rama que cumple. La línea va en las notas del resultado ("Crítico con 5 éxitos en vez de 6"), no en el desglose numérico. | D2b-1; el desglose solo lleva números. |
| S49 | **Filtro "a una mano" también en *Apresar y Apuñalar*** ("llevando un arma de una sola mano"), además de *Desenfundado Rápido* (decisión del usuario). Sin empleo conocido (Proyector de Pulso) el filtro no casa. | Su texto solo tiene sentido en armas a una mano. D2b-1. |
| S50 | **El NPC del máster no se salta el gate de Bloqueo y Combate Sutil.** El modo libre solo deja de mirar requisitos: sin la dote en su ficha, el NPC no bloquea ni va en sutil. Desde la tarea "Dotes para los NPC" (2026-10-15) el máster se las pone en el editor de NPC (§9.4). | Decisión del usuario (D2b-2); §9.4 dice que el máster les pone dotes a mano. |
| S51 | **El Aguijón con *Combate Sutil* sigue como estaba**: Reflejos fijo, sin interruptor, daño de Fuerza (Fue+4+nivel: «4 + Fuerza + Nivel» de la tabla de `docs/fuente/equipamiento.md`; corregido 2026-10-24, antes Fue+2+nivel). Sin la dote, Potencia (golpe y bloqueo) con el mismo daño. Las armas Sutil normales, en cambio, dejan elegir y sacan el daño Sutil de Potencia. `TODO(revisar)` en `combate.ts`. | Decisión del usuario (D2b-2: "con la dote, como hoy"). |
| S52 | **El texto de *Combinación Rápida* ("en modo sutil, sin el −1 a tus defensas") sale aunque la ficha no tenga *Combate Sutil*** (no es requisito de la dote). Es texto: no se mecaniza ni se oculta. | Conservador: la dote no pide Combate Sutil y el texto no suma nada. D2b-2. |
| S53 | ***Arrollar*: Potencia + Combate Melee, en especialidad Pelea** (entera con Pelea, la mitad sin ella). La prosa dice "tirada de ataque con el atributo de potencia" y no nombra la habilidad; se toma Combate Melee/Pelea (Pelea es su requisito). Sin arma ni daño: el total es la dificultad de los objetivos; los metros, como texto en la nota. No lleva familia de arma, así que no le llegan las casillas de los golpes melee (Combinación, Dominio Elevado…). | Decisión del usuario (D2c-1). |
| S54 | **Acción de dote con especialidad: va en especialidad sola.** Si la resolución trae especialidad (una o varias), la tirada va entera si la ficha tiene cualquiera de ellas y a la mitad si no, sin selector (como los ataques con la especialidad del arma). ***Apoyo***: "expresión + empatía o liderazgo" → Empatía o Liderazgo, con cualquiera de las dos va en especialidad. Su ventaja por vínculo fuerte (y la de *Violencia Aterradora* tras un crítico) es una casilla de ventaja en la acción desde D2d. | Decisión del usuario (D2c-1); el borrador no traía la especialidad de Apoyo (conversión en el generador). |
| S55 | ***Reflejos Felinos*: un atacante adicional menos en el contador de la esquiva**, nunca por debajo de 0: con 1 atacante 0, con 2 −1, con 3 −2. No toca *Bloquear* (usa el mismo contador). Sale en la etiqueta de la línea del desglose ("×2 (uno menos: Reflejos Felinos)"). | §9.3 UX propia y §9.5; decisión del usuario (D2c-1). |
| S56 | ***Traicionero* en Iniciativa es una tirada de iniciativa**: la copia del grupo Iniciativa recibe los bonos con alcance de grupo Iniciativa (*Vigilancia Táctica* +2); la de la sección Dotes, no. Los textos de dote de Iniciativa siguen yendo a las tres tiradas fijas. `TODO(revisar)` en `dotesAcciones.ts`. | Conservador sobre "pudiendo usarse como tirada de iniciativa" (D2c-1). |
| S57 | **«Finta repetida» es una casilla de opción**: No (0) · contra el mismo enemigo (−2, *Finta*) · y con *Maestro de Fintas*, contra un enemigo ya engañado (0). El jugador elige una: así "vale la mejor" sin sumar casillas. | §9.3 y §9.5 ("Maestro de Fintas lo quita tras finta con éxito"); D2c-1. |
| S58 | **Texto de crítico que empieza por "Además"** (*Humor Negro*, *Alentar*, *Llamada a las Armas*) se enseña tras el del éxito: el crítico incluye el efecto del éxito. Sin texto de crítico vale el del éxito; sin el de fracaso crítico, el del fracaso (como los poderes). | Lectura de la prosa ("además"); D2c-1. |
| S59 | ***Agarre Rápido*, *Zafarse* y *Mirada Desafiante* llevan tirada aunque la prosa solo da la economía**: Reflejos + Atletismo (Escalada), Potencia + Atletismo (Escapismo; "potencia o fortaleza + atletismo" de Atrapado, `fuente/reglas-base.md`) y Expresión + Actitud (Intimidación), con la dificultad a criterio del máster. Es lo que traía el borrador; no se toca por no ser un error evidente. `TODO(revisar)` en `generar-catalogo-dotes.ts`. | Pendiente de Murillo (D2c-1). **Usuario (2026-10-15)**: vale; *Zafarse* se apoya en la regla de Atrapado; *Agarre Rápido* y *Mirada Desafiante*, pregunta pendiente a Murillo (`docs/tareas.md`, "Preguntas al diseñador"). |
| S60 | ***Impacto Métrico* no tira en la app.** Es un poder sobre el ataque de un arma (§9.3: texto): la ventana del poder (nivel empleado, vector) cobra la fatiga al pulsar "Usar", aunque el ataque falle (§9.5), y enseña el daño extra; la tirada de ataque (Potencia + Combate Melee, con el arma o el golpe de Pelea) la hace el jugador aparte, en Ataques, y lo dice la primera nota. Lo que pasa si impacta o falla, el tamaño y lo que tira el objetivo van como notas y texto tras usarlo. Se convierte en el generador (`normalizarPoder`, `scripts/generar-catalogo-dotes.ts`). | Decisión del usuario (D2c-2) sobre §9.3. |
| S61 | **Los poderes de dote no reciben las reglas propias de su disciplina**: ni descuentos de fatiga, ni rebajas de tipo de acción, ni ventajas (son de los poderes de la disciplina). Sí las casillas externas (*Xovromium*, *Munición Supresora*), la *Derivación Psiónica*, la sobrecarga y el peaje neurológico, que son de cualquier gasto psiónico. Hoy no cambia ningún número (las reglas de Singularidad y Traslación van por id de acción). `TODO(revisar)` en `dotesPoderes.ts`. | Supuesto del modelado aceptado en §9.3 ("Sobrecarga Métrica sin descuentos de Traslación"), extendido a *Impacto Métrico*. |
| S62 | ***Impacto Métrico*, vector descendente**: la compresión es un dato aparte ("Daño por compresión (letal, se suma)", 1 por cada dos niveles empleados, mínimo 1) junto al daño extra, y +1 a la dificultad del objetivo. El borrador quitaba el desplazamiento en este vector, pero la tirada del objetivo que vuela lo usa ("se desplaza 4 m × nivel"): se deja, y una nota dice que los metros solo cuentan si volaba. `TODO(revisar)` en `generar-catalogo-dotes.ts` (`AJUSTES_PODER`). | Prosa del vector descendente; §9.5 ("daño letal que se suma"). |
| S63 | ***Sobrecarga Métrica***: "acción simple o reacción" se enseña como simple, con una nota que dice que también va como reacción. El +Fuerza (2 + nivel empleado, 1 turno) es un dato de la ventana y una nota "aplícalo a mano" (§9.3: texto). El daño propio por resultado se resta solo: éxito 1 no letal por cada dos niveles empleados (mínimo 1), fracaso 1 letal por nivel, fracaso crítico igual más la hemorragia (1d8 turnos) como texto. | Prosa de la dote; `Valor.porCadaNiveles` nuevo en `rules/psionica.ts`. |
| S64 | **Texto de dote en un poder sin tirada** (*Impacto Métrico Relámpago*): va a las notas de la ventana del poder, junto a las suyas; sin dado no hay crítico que separar, así que un texto de crítico saldría también ahí (hoy no hay ninguno). Con tirada, como en cualquier otra: nota o texto de crítico. | Conservador (D2c-2), mismo criterio que las acciones sin dado (`conExtrasDirectaDeFicha`). |
| S65 | ***Crítico Mejorado* en un NPC (modo libre)**: la elección sigue siendo una lista cerrada, con las especialidades de arma que **tenga** el NPC, en cualquier habilidad (sin mirar la del requisito). "Una de sus especializaciones en armas" se lee como parte de la elección, no del requisito. `TODO(revisar)` en `rules/dotes.ts` (`especialidadArmaElegible`) si el máster quiere ponerla sin tener la especialidad. | Conservador (tarea "Dotes para los NPC", 2026-10-15). En libre el efecto no mira la especialidad (`efectosDeDotes` con valores null), así que el crítico vale igual. |
| S66 | **Fracaso → éxito con casilla** (*Balanceo*, *Como Pez en el Agua*): marcada, un fracaso normal cuenta como éxito **sin éxitos de más** (margen 0) y el resultado enseña el fracaso original y la casilla; el fracaso crítico y el éxito no cambian. Se aplica en `tirarMontada`, después del dado. | Decisión del usuario (D2d) y §9.5 ("solo el fracaso normal pasa a éxito"); el margen 0 es del redactor. |
| S67 | **Armas contundentes** (`ArmaMelee.contundente`, para *Golpe Fatigante*): la fuente no da tipo de daño por arma; se marcan los golpes a mano vacía (§9.5), Tonfa o Porra, Maza de Armas, Bastón de Combate, Martillo Enastado, los escudos, Guantelete y Martillo de Pistón, Ariete Percusivo y sus versiones de Kerzul. El filtro es "contundente **o** a dos manos": cualquier arma a dos manos vale. `TODO(revisar)`: Mangual y Cadena Armada (flagelos; equipamiento.md separa contundentes de flexibles) quedan fuera. *Golpe Mejorado con Escudo* va por la especialidad Escudos del arma (Escudo de Kerzul incluido). | Redactor (D2d), sobre la decisión del usuario de construir el filtro de tipo de daño. |
| S68 | **Maniobra Derribo solo con dote de derribo** (*Derribo Mejorado* o *Derribo Brutal*; *Arrollar* no cuenta): casilla «Derribo» en todo golpe melee, "penalizador de dificultad de −2" leído como −2 al ataque, y daño básico sin bono por éxitos. La resistencia del rival y el fracaso crítico (−1 fatiga) van en su nota; los textos de *Derribo Mejorado* siguen en la nota del golpe. "Puede no causar daño, sin −2" y el ±2 por tamaño, a mano en el circunstancial (`TODO(revisar)`). *Brutal*: la casilla vale 0, y «Derribo con acción estándar» devuelve el bono por éxitos aunque «Derribo» esté marcada. | Decisión del usuario (D2d); el −2 al ataque y el tamaño a mano son del redactor. |
| S69 | **Una casilla por dote, destino y condición**: los efectos de una misma dote con el mismo destino (y filtro de arma) y la misma condición van a una casilla que junta lo de todos (*Especialidad Médica*: +1 y crítico con 5, una por pareja comprada). El id es el del primer efecto, así que las casillas de D2a no cambian de id. | Decisión del usuario (D2d) para Especialidad Médica; el resto por el mismo patrón. |
| S70 | ***Negociación Analítica*: casilla en el modal de Convencer / mentir** («Negociando: Perspicacia en lugar de Expresión»): marcada, la tirada usa Perspicacia (con su valor y su línea en el desglose). La fila sigue enseñando Expresión: el cambio se ve al marcarla en el modal. Si hubiese a la vez estilo Sutil, manda la casilla. | Decisión del usuario (D2d): selector en el modal antes de tirar. |
| S71 | ***Ojo Clínico*: la fatiga se paga al tirar con la casilla marcada** (1 punto, sin temporal), se acierte o no; sin `onPagarFatiga` (consola del máster), a mano. La ventaja no se acumula: con varias casillas de ventaja, dos d12 igual. | §9.5 ("la fatiga solo paga la ventaja", "la ventaja no se acumula"); el momento del pago es del redactor. |
| S72 | **Pool de creación en negativo: se permite, pero bloquea el envío a revisión.** Bajar la letra de una categoría tras gastar (o que otra categoría se lleve su letra) deja el pool en negativo; el cambio de letra no se impide, para poder reordenar prioridades, y el exceso es una falta ("Te has pasado N puntos en …") en Atributos, Habilidades, Psiónica y Dotes. El máster puede aprobar igual. | Decisión del usuario (2026-10-15). |
| S73 | **Shock: dos grados, cuerpo y equipo (opción B).** El máster aplica el Shock con dos grados: el de **Fortaleza** (cuerpo) decide la parálisis y los implantes; el de **Estructura** (equipo), todos los sistemas electrónicos que lleva encima a la vez, no pieza a pieza. La app no tira: el grado lo pone el máster. Propuesta de la mesa, también pendiente: una pieza afectada **pierde su bono entero** (no −2/−1), salvo excepción escrita en la pieza, por nivel. Un "averiado" pieza a pieza (sabotaje, Sistema de Emergencia) iría aparte, como herramienta del máster. | Decisión del usuario (2026-10-16), fiel a `fuente/reglas-base.md` (Shock). **Pendiente de que Murillo la confirme**: maqueta https://claude.ai/artifact/VYm4ZrSrPBuYSMmx6nLLEX |
| S74 | **Estados de la ficha y vida máxima (E1a).** Los estados que pone el máster (`Character.estados`) mueven la vida y la fatiga máximas también fuera de combate. La vida actual no se recorta al máximo con estados (`parseSheet` reconcilia contra el máximo en reposo, sin estados): lo que baja al poner el estado es S75; curar topa en el máximo en reposo. *(Superado por S75: "la vida actual no se recorta" y "un estado puesto o quitado dentro del combate no mueve la foto `pgMax`".)* Una duración de **0 rondas** vale (la usa el catálogo: se cae al cerrar la vuelta, S77). | Decisión del usuario (2026-10-16: "los estados mueven la vida máxima también fuera de combate"); el tope de curar, del redactor. |
| S75 | **Vida perdida al bajar el máximo.** Cuando poner un estado (o cambiarle el grado) **baja** la vida máxima, la vida actual baja lo mismo y se guarda; igual la fatiga. No se recupera al quitarse el estado ni al caerse por rondas: es castigo. Si el máximo sube o no cambia, la actual no se toca. Suelo 0; llegar a 0 no hace nada automático (la inconsciencia la marca el máster). En combate baja también la foto del jugador (`pgActual`/`fatigaActual`), y la foto recalcula `pgMax`/`fatigaMax` con los estados nuevos cada vez que cambian (poner, quitar, caerse por rondas). Deshacer la acción en el registro del máster (E1b) devuelve lo restado, hasta el máximo. **Activables de aumento (A5a-A5b):** sus estados no cuentan para la bajada, pero si al cambiar quedan la vida o la fatiga por encima del máximo nuevo, se recortan a él; y mientras están puestos suben el tope al que se cura (§11, A5b). Motor: `rules/vidaPorEstados.ts`. | Decisión del usuario (2026-10-16; activables, 2026-10-22). |
| S76 | **Terminar escena (E1c).** "Terminar escena" del máster quita los estados con duración "fin de escena" a todos los personajes **en juego** (aprobados), en una sola acción del registro que se deshace entera (si a alguno le han vuelto a poner uno de esos estados, no se deshace ninguno). Quitar no resta vida (S75); las fotos de combate abiertas recalculan su máximo. Desde E1d también limpia los estados de escena de los **NPC** del combate abierto, sin registro (deshacer no se los devuelve). Recompensas: quitar XP o créditos que dejaría a alguien en negativo **no se hace para nadie** y se explica (antes se recortaba a 0). Motor: `quitarEstadosDeEscena` (`rules/vidaPorEstados.ts`), `planAjusteRecurso` (`rules/registro.ts`). | Decisión del usuario (2026-10-16); "solo aprobados" y "NPC fuera", del redactor. |
| S77 | **Las rondas de los estados bajan al cerrar la vuelta (E1d).** "N rondas" se cuenta en vueltas de la cola, no en turnos: cada estado con duración en rondas pierde una cuando el turno pasa del último de la cola al primero (sube la ronda), para todos a la vez (jugadores en su ficha, NPC en su fila), y se cae al llegar a 0. Un turno normal no descuenta nada. Un estado de 1 ronda puesto a mitad de vuelta dura hasta el final de esa vuelta. Sustituye al criterio de la fase 6b (subtarea 2.6: cada turno de cualquiera descontaba una ronda). Al caerse uno, la foto de combate del jugador recalcula su máximo (S75). Motor: `pasarTurno` (`rules/turnos.ts`), `descontarDuracion`, `estadosAlCerrarVuelta`. | Decisión del usuario (2026-10-16). |
| S78 | **Vida y fatiga a mano por el máster (pestaña Vida, tras E1d).** El máster elige daño o curación y una cantidad; el signo lo pone el modo y las tres categorías de daño restan igual (§7). Suelo 0; la curación topa en el máximo en reposo en la ficha (S74, el mismo `ajustarVida` del jugador) y en `pgMax`/`fatigaMax` en la foto de combate. En combate se ajusta la foto de cada fila (jugador o NPC); en la Mesa, la ficha, salvo que el jugador esté en un combate **en curso**: entonces su foto, la que enseña la Mesa (`TODO(revisar)`). Una acción a varios es una entrada `vida` del registro; deshacerla vuelve al "antes" de cada uno (recortado al tope de hoy) y **no se puede** si el valor actual ya no es el "después" registrado (hay que deshacer antes lo posterior); un objetivo que ya no existe o de un combate terminado se salta. La vista previa enseña el umbral de §7 que se cruza con su −N base (sin el ajuste de especie, §14.8). Motor: `rules/ajusteVida.ts`, `planAjusteVida`/`planDeshacerVida` (`rules/registro.ts`). | Decisión del usuario (2026-10-16: pestaña Vida, deshacer también para NPC); Mesa en combate y "solo mira el valor", del redactor. |
| S79 | ***Gran Puntería*: el éxito al apuntar es crítico, sin casilla** (crítico con 0 éxitos en la fila Apuntar), y el texto "la cobertura baja 2 niveles" solo sale con **crítico natural** (6 éxitos o más). En el selector «Apuntado» del ataque, con la dote, "Éxito" lleva la nota de omitir 1 nivel de cobertura y "Crítico" la de **2 niveles en total** (salvo cobertura total), **no 3** (el 1 del crítico de Apuntar no se suma al 2 de la dote). El bono sigue siendo +1. | "Al apuntar" = la tirada de Apuntar (§9.5). Que el éxito convertido también omita 1 nivel y el "2 en total" son lectura nuestra, aprobada por el usuario (2026-10-23); preguntas de Gran Puntería en `docs/modelado-dotes.md` (Combate a Distancia), pendientes de Murillo. |
| S80 | ***Velocista* en Carrera, siempre activo y sin casilla: fracaso → éxito y éxito → crítico, en un solo salto.** El fracaso que pasa a éxito queda con margen 0 y **no** llega a crítico; el fracaso crítico no cambia. "Al correr como acción estándar o compleja" es toda tirada de Carrera. | El texto dice "considera el fracaso como éxito y el éxito como éxito crítico"; encadenarlos convertiría todo fracaso en crítico. Decisión del usuario (2026-10-23). |
| S81 | **Selector «Apuntado» en todos los ataques con Combate a Distancia**, para cualquier ficha (lo que salió en la acción Apuntar previa: No · Éxito · Crítico). La app no comprueba que se apuntara de verdad ni que el ataque sea antes del final del próximo turno: lo marca el jugador. | La regla de Apuntar (fuente/habilidades.md) da el bono al siguiente ataque; la app no lleva registro de acciones por turno. Decisión del usuario (2026-10-23). |
| S82 | ***Foveo-Sensorial* "por puntería" = el selector «Apuntado» en Éxito o Crítico**: +1 al ataque a distancia (además del +1 de Apuntar), como bono por opción, sin casilla propia. | Antes era la casilla "Tras Apuntar" porque no existía la acción (§11.3). Decisión del usuario (2026-10-23). |
| S83 | ***Cazador Cazado* y *Vigilancia Táctica*: casilla en la fila** (como Levitar: «Con Manipulación (Cazador Cazado)» en Discernir mentiras; «Con Táctica (Vigilancia Táctica)» en Resistir distracción) que cambia habilidad y especialidad; la tirada va entera si la ficha tiene esa especialidad y a la mitad si no. El aplicado (Perspicacia) no cambia. | La prosa da el par entero; las dos tiradas fijas van con Empatía, que es lo que sustituyen. |
| S84 | **Tirada libre (T-007): aplica lo que casa por aplicado/habilidad (alcances `todas`, `aplicado`, `habilidad`), sin casillas ni extras de dote o aumento, y sin especialidad.** Fila "Tirada libre" al final de "Acciones" (pestaña Básicas): el jugador elige en el modal un aplicado y una habilidad (o ninguna) y tira 1d12 + aplicado + habilidad. Entran los modificadores de tirada de alcance `todas`, `aplicado` y `habilidad`, y `anulaPenalizadores`; no los de `tiradaId` de otra acción, `grupo`, `grupoHabilidad`, `familiaArma` ni `modo` (grupo propio `Libre`). Sin casillas, ventajas, textos, bonos por tramo, descuentos ni crítico fijo de dote o aumento. La habilidad cuenta entera, como en Buscar (regla general de §3: no nombra especialidad). | Usuario, 2026-10-23: es para lo que el máster pide en mesa y la app no tiene como fila; ninguna acción con nombre, así que no le toca nada que apunte a una. |
| S85 | **Contra Fuego, con Mejora Ignífuga (nivel 1) instalada en la armadura que cuenta, solo cuenta el blindaje de esa armadura**: no suman la armadura natural (de especie o de aumentos), el Escudo Deflector, el blindaje reactivo (Densificar) ni el brazo biónico, cuyas casillas siguen bloqueadas contra Fuego. Ignífuga instalada en otra armadura que no es la que cuenta no hace nada. | Lectura literal de "la puntuación total de blindaje de su armadura" (`catalog/mejorasEstandar.ts`), pendiente de confirmar con Murillo. Usuario, 2026-10-23. |
| S86 | **Cobertura y escudos en la app** (regla FIRME de Murillo, 2026-10-23, §6 "Cobertura y escudos"): (1) **contra Fuego el blindaje del escudo vale 0** (un escudo no lleva Mejora Ignífuga, S19): todo el daño va a su durabilidad; **contra Mental no aplica**: "Al escudo" sale bloqueado. (2) **Escudo roto** (durabilidad a 0) **bloquea "Golpear con", "Bloquear con" y "Levantar" ese escudo**, con el motivo "Escudo roto: repáralo"; es derivado, así que repararlo con Materiales lo devuelve solo. (3) **La casilla "Tengo cobertura" de la esquiva es un +2 fijo para cualquier cobertura**, sin mirar su nivel, y sale en cualquier ficha, lleve escudo o no. | (1) y (2), lectura de la regla; (3), decisión del usuario (2026-10-23). |
| S87 | **Armas Modificadas** (decisiones del usuario, 2026-10-23): (1) **no son piezas ni ocupan ranura**: campo opcional `modificaciones` del arma melee (`PiezaEquipada`). (2) **Compatibilidad**: toda arma melee que se compra salvo Pelea y kerzul; **escudos, solo Electrificante**; **Nanofilamento, solo armas de filo** (`ArmaMelee.filo`: Cuchillo de Combate, Espada Ligera, Espada, Montante, Hacha de Armas, Hacha de Guerra, Lanza Corta y Larga, Alabarda, Pico de Cuervo; las mecánicas no). (3) **Varias a la vez**: Plasma no se combina con nada; Electrificante, Térmica y Nanofilamento, libremente (Nanofilamento + Térmica = golpe grave y de fuego). (4) **Tramo** = el +N del **primer modo** del arma **sin modificar** ("2 o menos" cae en la fila "2"), igual para todas sus modificaciones; el daño extra va a todos los modos. (5) **Coste multiplicativo**: básico × N₁ × N₂…; convertir un arma que ya tienes cuesta la diferencia. (6) **Rareza**: la mayor entre el arma y sus modificaciones; cuenta para el tope de la letra de Recursos y para Fabricar (material y dificultad). (7) **Lanzar** una arrojadiza modificada lleva el mismo daño extra y efectos. (8) **Peso**: solo se muestra (+%). (9) **Sin gasto de energía**; Bloquear no cambia. | Lectura del usuario sobre `docs/fuente/equipamiento.md` ("Armas Modificadas" y la cabecera de Escudos: "Modificaciones disponibles: Electrificante"). Supuestos de construcción, sin decisión del usuario: los **porcentajes de peso de varias modificaciones se suman** sobre el básico; las modificaciones **no se quitan** (convertir solo añade); el daño extra lleva la categoría del golpe (Letal/No Letal, o Grave con Nanofilamento, Térmica o Plasma: convierten el básico a fuego/plasma, que son graves); al reparar, la rareza que cuenta es la del arma modificada. |
| S88 | **Reconciliación de armas con la foto de Drive (2026-10-23)**: daño, dificultad y peso de armas de fuego, armamento pesado, granadas y melee se toman de las tablas de `docs/fuente/equipamiento.md` (armas de fuego y granadas −1 de daño en general, Asina–Plasma AAA −2/−3; melee y kerzul +1 a todo "Fue+N" salvo Pelea, Rodela y Escudo; Mosquito dificultad −3; Cañón de Plasma 16 con Efecto de Fusión (12)). Al subir el daño melee, el Cuchillo y las armas que estaban en Fue+2 pasan al tramo "3 a 6" de las Armas Modificadas. **Azra: 11 Letal** — la tabla dice "1 Letal", errata por patrón. | Usuario, 2026-10-23. |
| S89 | **Construcción de la regla de especialidades (§3, 2026-10-23)**: (1) el selector de **Convencer / mentir** ofrece las **seis** de Actitud (Empatía, Humor, Intimidación, Liderazgo, Manipulación **y Negociación**): la fuente da "expresión + X" para las cinco primeras y dice que Negociación "como el resto de especialidades de actitud utiliza el atributo de expresión". (2) Fila **Hurto** nueva (Reflejos + Sigilo con Hurto; la dificultad y la enfrentada, en la nota). (3) **Sin migración** por dar especialidades a Sigilo: la ficha guarda `especialidades: []` en Sigilo, que sigue siendo válido; quien tuviera Sigilo pasa a tirar la fila Sigilo a la mitad hasta que elija Esconderse (la primera especialidad va incluida, S3). (4) **Reparar y Fabricar** ("Perspicacia + la habilidad técnica aplicable") no nombran especialidad: enteras. (5) La fila "Saltar, levantarse" conserva el id `atletismo` (de ella cuelgan equilibrio, nado y derribo: Balanceo, Equilibrista, Como Pez en el Agua, Inamovibles, Bucle de Equilibrio) y su nota de escapar de un agarre; los textos de *Contacto a Tres Puntos* pasan a Escalar. | Lectura de la fuente y decisiones de construcción, sin preguntar; revisables. |
| S90 | **Arreglos del catálogo de armas tras auditoría contra la foto de Drive (2026-10-24)**, todos de `docs/fuente/equipamiento.md` salvo (14): (1) **Mira Telescópica sobre la integrada** (S21): el desglose dice «Mira Telescópica 3 (la integrada ya va en la dificultad) +1», y un bono por tramo que no cubre el tramo elegido no pinta fila a 0 (la mira a corta/bocajarro). (2) **Bayoneta**: «el daño será idéntico» al Cuchillo de Combate → lee daño, categoría y crítico de su ficha de catálogo (hoy Fue+3), dificultad −1 aparte. (3) **Sistema de Retroceso**: +1 por arma (`ajusteModo`, bono del modo elegido en la tirada de esa arma), en F. Auto; **en ametralladoras, en cualquiera de sus modos**. Antes era un modificador de personaje: se colaba en el F. Auto de otras armas. (4) **Granadas a mano**: alcance Potencia × 14 m. (5) **Arrojadizas melee**: alcance propio (S20). (6) **Granada de Plasma**: 500 créditos y Efecto Fusión (12) como efecto, no de crítico. (7) **Ametralladoras en F. Auto: 100 proyectiles por ataque**, no el cargador (`gastoDelModo`). (8) **Levantar escudo: Acción Simple en todos** («Empleo: Acción Simple para levantar el escudo», cabecera de Escudos); la columna Acción de la tabla es la del golpe. (9) **Plaga**: munición de energía (cargas), como el resto de plasma. (10) **A bocajarro en F. Auto: +3 a la dificultad de esquiva del objetivo**, aviso en la opción Bocajarro de toda arma con F. Auto (junto al Derribo, si lo hay). (11) **Impacto Estructural**: el crítico lleva su efecto («reduce de forma permanente el blindaje del objetivo en 1 punto»; 2 en armas a dos manos). (12) **Puntero Láser 2**: con Ojo Biónico o Mira Telescópica 3 en la misma arma, el aviso de −2 al Sigilo no sale. **Puñal de Kerzul** sin retroceso entrópico (solo ataca en Simple). **Escudos**: la nota de Levantar recuerda que se benefician del Escudo Deflector y la Malla Plasmática (texto; el reparto de absorción no se automatiza). (13) **Munición especial con daño de otro tipo** (Incendiaria Fuego, Electrizante Eléctrico, Criogénica Frío, Corrosiva Corrosivo): el +1 va **aparte** como daño extra con la **gravedad de su tipo** (§7 «Daño Específico»; en crítico, la de crítico si cambia), en el desglose por tipo de las Armas Modificadas; antes se sumaba al daño del arma con su categoría (decisión 2026-09-28, sustituida). La Perforante (−1, sin tipo) sigue sumando al básico. (14) **Sierra Circular: Letal** en los dos modos. (15) **Sydiasi en F. Auto: 3 disparos por ataque** («consume 3 disparos del cargador por cada ataque»), campo `gastoFAuto` del arma, que manda sobre la regla general. | (1)-(13): lectura de la fuente, aprobada por el usuario (2026-10-24). (14): la tabla no trae categoría ("Fue+6 / Fue +8" a secas); Letal por decisión del usuario (2026-10-24), pendiente de Murillo. Fuera a propósito: Bípode en lanzagranadas (pregunta abierta), nombres Plasma SC/SA, Derribo de plasma, precios de batería/cargador. |
| S91 | **Arreglos de armaduras, subsistemas, mejoras estándar y fármacos tras auditoría contra la foto de Drive (2026-10-24)**, de `docs/fuente/equipamiento.md`: (1) **Proyector de Pulso**: daño de la tabla — Pulso 7 + nivel, Pulso Cargado 10 + nivel, Barrido 9 + nivel, Aguijón 4 + Fuerza + nivel (S51); alcance en tres tramos (Pulso y Barrido 20 + 10n / 80 + 20n / 160 + 20n; **Pulso Cargado 30 + 10n / 100 + 20n / 200 + 20n**, la tabla le da los suyos) y el modificador general de distancia (bocajarro +4, corta +2, media 0, larga −2), con un solo selector para los tres modos y los metros del Cargado en la etiqueta. Lectura de los tramos como en las armas de fuego (el primer número abre la corta). (2) **Bonos a salvaciones del equipo solo contra su amenaza**, por el selector «Contra…» de los aumentos, que ahora sale también en la salvación de Reflejos: armaduras corrientes +1 contra congelación (Fortaleza) y llamarada (Reflejos); Soporte Vital +1 contra congelación y frío o calor extremos; Polímero +1/+2 contra corrosión; Tejido +1/+2 contra shock; Visor Nocturno 2 +3 contra la ceguera por detonación; Mejora Ignífuga 2 sube a +2 el de la armadura contra llamarada (pone la diferencia; en una avanzada, que no trae bono, el +2 entero). Amenazas nuevas: congelación, corrosión, llamarada. Cuentan **la primera armadura de la ficha** (la que cuenta para el blindaje) **y las mejoras instaladas en ella**. (3) **Golpe desarmado con armadura**: Ligera e Intermedia +1 al daño, Pesada +2 (el traje, la ropa y las avanzadas no lo dicen: nada), en toda la Pelea; y bloquear desarmado sin la casilla del −3. (4) **Refuerzo de Combate** (mejora estándar nueva, nivel 1-2, Común, 500/3000 cr): +1 más al daño desarmado con la armadura y letal, crítico con Aturdimiento (7); nivel 2, +2 en total (no se suma al 1) y Aturdimiento (8). Por ser letal, bloquear desarmado tampoco lleva el −3 ("si el ataque desarmado de quien bloquea causa daño letal no se considera desarmado", Bloqueo). Solo instalado en la armadura que cuenta. (5) **Valija Médica**: su bono de aplicación (+1, +1, +2, +3; el documento no da +1 por nivel) también en las filas "Usar [fármaco]". (6) **Visor Nocturno 2**: "reduce en 2 los niveles de cobertura visual a 50 m" como las casillas del Ojo Biónico: +2 en ataques a distancia y Buscar, sin apilarse con el Ojo ni Foveo. (7) **Malla Plasmática 3-4**: el plasma liberado causa shock y llamarada (5 + nivel) y en crítico fusión (7 + nivel), en los dos sacrificios. El daño extra de plasma sigue sin desglose por tipo (solo texto). (8) **Mejora Ignífuga 2 / Polímero 2** ("lo considera letal en lugar de grave"): "Bloquear daño" enseña la categoría con la que cuenta el golpe (`categoriaDelGolpe`, `blindaje.ts`); el daño a la vida sigue apuntándose a mano. **Derivación Psiónica 2** (Canal de Alta Resonancia): +10 % al alcance en metros, mínimo 2 m, a la baja, no en alcances de 0 ni en km² (§10, pregunta 33). (9) **Fármacos**: Antipatógeno, casilla "Segunda salvación con Antipatógeno" (+3) en la salvación de Fortaleza mientras quede una dosis suya o de un Gel Sanador (que "incluye sus efectos"); Calmante y Analgésico (−1 al penalizador por herida) siguen sin mecánica: la ficha no guarda qué dosis siguen haciendo efecto; Nano-Elixir, su +5 ya iba sumado (metadata corregida). (10) Textos: Estabilizadores Neurales purgan un grado (todo en crítico); Compartimento Oculto 2 sube la dificultad **en** 4; Introgresión ultravioleta, la casilla vale también en investigación de campo. | Lectura del documento; construcción de los encargos R1-R10/F1/D7-D9 de la auditoría, aprobados por el usuario (2026-10-24). |
| S92 | **Materiales al reparar** (lo que ya hace la app, sin regla escrita del todo): cada intento gasta **1 unidad** de un tier que llegue a la rareza de la pieza (Sencillos hasta Poco Habitual, Sofisticados hasta Extraño, Avanzados hasta Muy Extraño — la misma rareza que da el documento para fabricar), salga o no la tirada; con éxito restaura la durabilidad entera. Los bonos del documento (+2 con Sofisticados y la valija en objetos comunes y poco habituales, +4 con Avanzados y multiherramienta hasta Extraño) no los suma la app: circunstancial. | `docs/fuente/equipamiento.md`, "Materiales"; `repararPieza` (`recursos.ts`). Pendiente de confirmar con Murillo. 2026-10-24. |
| S93 | **Respuestas del usuario tras el segundo barrido de equipo (2026-10-24)**: (1) **Bonificador Máximo de Agilidad** de las armaduras (columna de la tabla, «Máx. Nivel N» / «Ilimitado»): la Agilidad calculada de la ficha se topa en N mientras se lleva esa armadura; con dos armaduras, vale el tope menor. (2) **Ropa Reforzada** no lleva el +1 a salvaciones contra congelación y llamarada del resto de armaduras. (3) **Codazo o Rodillazo**: No Letal, como Puñetazo y Patada (la tabla pone «Fuerza» sin categoría). (4) **Electro TK**: munición de energía (batería), no balística. | Decisiones del usuario (2026-10-24); el documento no lo decía. |
| S94 | **Dificultades, tratamientos y topes de equipo que el documento ya daba (2026-10-24)**: (1) **Dificultad con la que se abre el modal** (`dificultadSugerida`): Gel Sanador, Gel Sanador Avanzado, Nano-Elixir y Calmante 4; Estabilizadores Neurales 6; Hemostáticos 7 (`CON_TIRADA`, `rules/farmacos.ts`); Escáner Detector 6 y Radar 7 (`NivelModulo.dificultadTirada`, `rules/herramientas.ts`). (2) **Variantes con su dificultad**: opción de la condición con `dificultad` (`OpcionCondicion`, `condiciones.ts`); al elegirla el modal la pone (`dificultadTrasCambio`) y, si la opción no trae, vuelve a la sugerida; el jugador la puede cambiar luego a mano. Hemostáticos: hemorragia normal 7 / exanguinante 9; Escáner 2: superficial 6 / profundo 8; Radar 3 y 4: función habitual 7 / penetración de obstáculos 8 (alcance 20 m en el 3, 100 m en el 4; el documento no repite la dificultad en el 4 y se supone la misma). (3) **Ultra Estimulante**: casilla «Bajo Ultra Estimulante» siempre visible, como la de Xovromium (la app no sabe si te la has tomado): +2 en las tiradas del grupo Iniciativa y +1 en las tiradas con un aplicado que lleve Fuerza o Agilidad (Fortaleza, Potencia, Reflejos), sin las salvaciones («acciones físicas»; alcance `aplicado` con `salvoGrupo`); no se apilan entre sí (una iniciativa con Reflejos se queda en +2). La reducción de penalizadores por heridas y fatiga, el bajón al terminar y el colapso por doble dosis siguen a mano. (4) **Soporte Vital, Blindaje Ambiental**: +1/+2/+3 (niveles 1/2/3, el alto sustituye) en el selector «Contra…» de Fortaleza contra Toxinas y Radiación, con la nota «protección total… sin tirada; el +N solo si la armadura está dañada o sufres un ataque o evento que te haga daño directo en el ambiente tóxico» (`EfectoSalvacion.nota`). El apagón sigue en la pregunta 32. (5) **Tratamientos de la VTM** en «Tratar heridas» (selector `vtm_tratamiento`): nivel 1 congelación (regulación térmica) 6 y envenenamiento o enfermedad (depuración biológica) 6; nivel 2 parálisis o ceguera temporal 7 y confusión 7; en el nivel 4 los estados complejos que nombra (parálisis, ceguera, confusión, envenenamiento, enfermedad) y la estabilización/síntesis llevan «cualquier éxito es crítico»; la congelación no, porque no la nombra. (6) **Derivación Psiónica 4, Simbiosis Sináptica Total**: −1 al penalizador por fatiga en las tiradas del grupo Psiónica, como compensación sin pasar de 0 (`NivelModulo.reducePenalizador`, `reduccionesDeEquipo`); sustituye al +1 que apuntaba a una tirada inexistente. Con Neurogénesis Hipocampal a la vez, las compensaciones se descuentan en orden (TODO en `estados.ts`). (7) **Tope de Agilidad (S93) construido**: modificador «Tope de Agilidad (armadura)» detrás de todos los demás en `resolverFicha` (`topeAgilidadAplicado`, `derivados.ts`), así aplicados, movimiento y tiradas usan la Agilidad topada; la pestaña Atributos enseña «Agilidad 5 → 4 (armadura)». El **brazo biónico** también se topa (va dentro de la armadura; si no, sería una forma de saltárselo); su base no. Los **requisitos de dote** no: miran la ficha permanente, sin equipo (`modificadoresDeRequisito`), y vestirse no debe apagar dotes. (8) **Textos**: VTF nivel 1 con el escáner para registrar diseños (acción estándar, dificultad de fabricarlo) y desenfundar con acción compleja; el −1 a ataques y la esquiva con Tecnociencia en vuelo de Movilidad Aérea pasan a texto construido (descartado de la app el 2026-09-28, se lleva en mesa). | `docs/fuente/equipamiento.md` (Fármacos, Valija Táctica Médica, Radar, Escáner Detector, Valija Táctica de Fabricación, Soporte Vital, Derivación Psiónica); (7) decisión del usuario en S93; (3) visibilidad y alcance de «acciones físicas», (6) orden de compensaciones y (7) brazo/requisitos, supuestos de esta implementación. |
| S95 | **Munición regular y armamento pesado (2026-10-24)**: (1) **Precio por proyectil** (`MUNICION_REGULAR`, `catalog/municion.ts`; `recargaDePieza`, `recursos.ts`): Calibre Estándar 2 (Común) para armas de fuego y ametralladoras; **Batería Láser** 2 (Extraño), **Célula de Partículas** 15 por rayo (Muy Extraño) y **Batería de Plasma** 20 (Singular) para las de energía, según su familia (`tipoMunicion` del arma). Recargar cobra lo que falta hasta el máximo; ya lleno, un cargador entero de repuesto (el comportamiento de stock de siempre). La rareza de la munición cuenta para el tope de creación, como una granada. El stock sigue siendo de cada arma (`sheet.recursos`): la familia sale del arma, no hay stock de batería compartido que migrar. (2) **Armamento pesado** con recurso propio, su cargador de la tabla (columna Ammo.): Lanzallamas Ligero 30, Lanzacohetes RT 1, Lanzamisiles AT 1, Cañón de Plasma 12; cada disparo gasta 1, con el aviso de insuficiente. Se recarga con su munición: **Depósito de Lanzallamas** 60 (Común, se compra entero y llena los 30), **Cohete** 250 (Común), **Misil** 5000 (Poco Habitual), **Batería de Plasma para Cañón** 5000 por proyectil (Singular). El Lanzagranadas sigue gastando granadas. (3) **Electro TK**: de energía (S93), **Célula de Partículas** — el documento no la describe; su daño Grave es el de los rayos de partículas (los láser hacen Fuego, el plasma Plasma). (4) Textos: Munición Radiactiva, «si vuelve a ser dañado ya envenenado por radiación, relanza y puede agravarse un nivel» y «con crítico, sin ningún efecto»; Munición Supresora, «con crítico, sin efecto» y «acumular fallos pasa a fallo crítico y prolonga la duración». Supuestos: el **Arco y la Ballesta** usan el precio de Calibre Estándar (el documento no da precio de flechas ni virotes); el Depósito a medias se paga entero. | `docs/fuente/equipamiento.md`, «Munición Regular», «Munición Especial» y tabla de «Armamento Pesado»; encargo del usuario (2026-10-24). |
| S96 | **Proyector de Pulso, Malla Plasmática, área del F. Auto y pesos que faltaban (2026-10-24)**: (1) **Proyector de Pulso**: el crítico (Hemorragia y las variantes de los modos adicionales de nivel 2-4 — Envenenamiento por Radiación, Ceguera, blindaje destruido) sale en el **efecto crítico** de la tirada, como en las armas melee y de fuego, en el disparo y en el Aguijón; la nota se queda con lo que no es crítico (daño a Fuego con Llamarada del nivel 3, Shock +1 del nivel 4). Como el disparo es una sola tirada para los tres modos y el Barrido no trae crítico, el texto lo dice: «Hemorragia (Pulso y Pulso Cargado; el Barrido no tiene crítico)». El **−5 al Sigilo** del nivel 1 («el uso de cualquier modo de ataque») es aviso en los efectos del disparo y del Aguijón, como el Puntero Láser. (2) **Malla Plasmática**: la Malla se activa sin dado y la ficha no guarda si está activa, así que no hay tirada suya donde colgar el aviso: el **−8 al Sigilo** va como **casilla «Malla Plasmática activa»** (−8 / 0) en las tiradas de Sigilo (Sigilo y Hurto), marcada por el jugador cuando le buscan con la vista. Que **anule el Camuflaje Trifásico activo** no se puede mecanizar (tampoco se guarda si el camuflaje está activo: activarlo solo gasta la carga): es aviso en «Activar Camuflaje Trifásico» cuando hay Malla equipada y en la nota de la casilla. (3) **Área del F. Auto**: nota del modo F. Auto en la tirada, «Ataque en área: 2 casillas adyacentes» en pistolas, escopetas, subfusiles, fusiles de asalto y de precisión, y **4** en ametralladoras (las impulsoras no tienen F. Auto). (4) **Peso**: las mejoras de arma con peso lo traen en el catálogo (`pesoKg` del nivel, S9): **Bípode 1 +5 kg**, Bípode 2 0 kg («no suma peso adicional»), **Lanzagranadas Integrado +1,5 kg**; y las **granadas que se llevan** cuentan en la Carga, cada una con el peso de su tabla (0,3-0,5 kg). | `docs/fuente/equipamiento.md`: Proyector de Pulso (tabla «Modo de Ataque» y niveles 1-4), Malla Plasmática nivel 1, «Fuego Automático» de Pistolas, Escopetas, Subfusiles, Fusiles de Asalto, Fusiles de Precisión y Ametralladoras, Bípode, Lanza Granadas Integrado y tabla de Granadas; encargo del usuario (2026-10-24). |

## Conflictos detectados

| # | Conflicto | Estado |
|---|---|---|
| 1 | `EQUIP` pide tiradas de "Perspicacia + **Medicina**", pero Medicina no está entre las 10 habilidades de `HOJA`. Encaja como **especialidad de Biociencia** (`EQUIP` ya nombra Mecánica/Química/Bioquímica como especialidades). | Resuelto por inferencia, confirmar |
| 2 | `EQUIP` llama a la misma escopeta **Plasma SC** en la tabla y **Plasma SG** en la descripción; el fusil, **Plasma SA** / **Plasma AR**. | Resuelto (usuario, 2026-10-23): se quedan **Plasma SG** y **Plasma AR**, los de la descripción |
| 3 | ~~La munición corrosiva no indica dificultad del efecto.~~ | **Resuelto** en la revisión del 31 ago: Corrosión (dificultad 7) |
| C4 | ~~**Exploración** se usa en las tiradas más importantes del juego... pero no está entre las 10 habilidades.~~ **Resuelto** (2026-09-10, decisión del usuario): Exploración sustituye a Supervivencia en la lista de habilidades. Desbloquea Iniciativa y Alerta. | Resuelto |
| C5 | `COMBATE` nombra **Resiliencia** (resistencia al shock en sintéticos) y **Estructura** (en equipamiento) como puntuaciones de salvación. Ninguna está entre los 6 aplicados de `HOJA`. ¿Son atributos de PNJ/objeto y no de PJ? | Sin resolver |
| C6 | `EQUIP` habla de daño **agravado**; `COMBATE` define solo no letal, letal y grave. Probablemente "agravado" sea el nombre viejo de "grave". | Sin resolver |
| C7 | `COMBATE` usa **Potencia + Atletismo** para levantarse de un derribo y **Fortaleza o Potencia + Atletismo** para escapar de un agarre: confirma que el par atributo-habilidad es libre, pero no hay tabla de pares canónicos. | Informativo |
| C8 | ~~**La notación de las tiradas mezcla habilidades y especialidades sin avisar.** Los documentos escriben tanto `Perspicacia + Biociencia (Medicina)` —forma larga y correcta— como `Perspicacia + Medicina` a secas, y lo mismo con Empatía, Manipulación y Bioquímica. De 12 pares distintos, **4 usan el nombre de una especialidad como si fuera la habilidad**. No es cosmético: decide si la habilidad cuenta entera o a la mitad.~~ | **Resuelto (Murillo, 2026-09-23):** la forma corta es siempre una especialidad de la habilidad aplicada — la escogida cuenta entera, la no escogida a la mitad. Ver pregunta 26. |
| C9 | ~~**Una casilla no tiene medida.** El movimiento se calcula en metros (`carrera = 15 + Potencia + Atletismo`), pero las penalizaciones por herida dicen "solo una casilla por turno" y las áreas de las armas van en casillas (6x6, 8x8). Sin la equivalencia metros/casilla, las dos escalas no se pueden conectar.~~ | **Resuelto (Murillo, 2026-09-23): una casilla son 2 metros.** Sin cambio de código — hoy no hay ninguna pantalla que trabaje en casillas, queda documentado para cuando exista un mapa de combate. |
| C10 | ~~**"Niveles" de fatiga contra "puntos" de fatiga.** La salud define **puntos** (8 + Voluntad) y dos estados (Fatigado, Exhausto), pero los fármacos hablan de "consume 2 **niveles** de fatiga" y de "ignorar el primer **nivel** de fatiga acumulada". ¿Un nivel es un punto, o es un estado?~~ | **Resuelto (Murillo, 2026-09-23): es lo mismo** — vas consumiendo puntos hasta llegar a Fatigado o Exhausto. Sin cambio de código, ya se implementaba así (`fatigaActual`, puntos). |
| C11 | ~~**La escala de daño y la de vida no encajan del todo.** Las armas hacen de 7 a 20 de daño (mediana 12), los personajes tienen entre 6 y 16 puntos de golpe y los blindajes absorben de 1 a 8. Un fusil corriente (10) contra armadura ligera (4) se lleva 6 puntos: media vida de un PJ típico, antes de sumar +1 por cada dos éxitos. Puede ser letalidad buscada, pero conviene confirmar que **el daño del arma se resta 1:1 de los puntos de golpe**.~~ | **Resuelto (Murillo, 2026-09-24): 1 punto de blindaje = 1 nivel de daño.** Ver pregunta 29. |
| C12 | ~~Cultura y Supervivencia no se usan en ninguna regla, mientras que Exploración aparece 5 veces sin estar en la lista.~~ **Resuelto junto con C4**: Supervivencia se sustituye por Exploración. Cultura se queda en la lista tal cual, sigue sin usarse en ninguna regla conocida — no es parte de esta decisión. | Resuelto (parcial: Cultura sigue sin uso) |
| C13 | **Impacto Estructural** (crítico de las armas de kerzul: reduce el blindaje del objetivo de forma permanente) está definido solo dentro de `EQUIP` y no aparece en el catálogo de 23 estados de `COMBATE`. Menor, pero es un efecto que vive fuera de su sitio. Desde 2026-10-24 el crítico de cada arma lleva el texto del efecto (S90 (11)); el blindaje del objetivo se baja a mano. | Informativo |

## Preguntas abiertas para el diseñador

Agrupadas para soltarlas en tandas. Se tachan según lleguen respuestas.

**Sobre la ficha ya implementada** (cada una valida o tumba un supuesto)
1. ~~"Máxima puntuación 4/5" y "3/5"~~ **`HOJA2` los sube a "4/6" en los dos** (antes eran distintos entre sí). ~~Sigue abierto si el 4 es de creación y el 6 techo del sistema, o el 6 se alcanza de otra forma.~~ **Resuelta (usuario, 2026-09-10):** el 4 es el tope de creación; el 6 se alcanza en partida, con puntos adicionales que el máster reparte durante la aventura. *(S7)*
2. ~~¿Los atributos aplicados tienen tope propio, o son libremente la suma?~~ **Resuelta (usuario, 2026-09-10):** es una media, no una suma — ya implementado así (ver S11). No hay tope propio aparte del redondeo.
3. ~~Catálogo de especialidades de cada una de las 10 habilidades. *(S5)*~~ **Resuelta
(`docs/fuente/habilidades.md`, integrado en la tanda ESP, 2026-10-15):** lista cerrada en §3;
Interpretación y Sigilo no traen lista (S39). Cierra S5 y S31.
4. ~~¿Cuántas especialidades puede tener una habilidad como máximo?~~ **Resuelta
(Murillo, 2026-09-23): sin límite, siempre que se pague la experiencia pertinente** ("que
no es demasiada"). **Decisión de producto (2026-09-23, el usuario): se deja el tope de 3
que ya tiene la app (`S4`) — la diferencia es menor y no compensa el cambio ahora mismo.**
`S4` queda marcado como límite de interfaz deliberado, no como límite de las reglas.
5. ~~¿Cuánto cuesta subir una habilidad?~~ **Resuelta por `HOJA2`:** Nivel × 1 (Atributos Nivel × 2, Psiónica Nivel × 3) — ver "Coste y progresión", sección 2. *(S1, tachado)*
6. ~~Un personaje recién creado tiene salto vertical **negativo** con las fórmulas tal cual (Potencia 0 + Atletismo −1 → −10 cm). ¿Se corta en 0, hay un mínimo, o Atletismo no entrenado cuenta como 0 aquí?~~ **Resuelta (Murillo, 2026-09-23):** el mínimo es **15 cm**, no 0 — "otra errata del documento". Implementado en `derivados.ts` (`Math.max(15, 15 * base)`), test actualizado en `derivados.test.ts`. *(S6, tachado; S8 sigue en pie)*

**Bloqueantes para el catálogo de equipo**
7. ~~¿Cuánto empieza teniendo un personaje?~~ **Resuelta por `HOJA2`:** depende de la letra de prioridad en Recursos, de 1.500 a 66.000 créditos. ~~Sigue abierto si los créditos son la única moneda.~~ **Resuelta (usuario, 2026-09-10): sí, es la única moneda.**
8. ~~Ranuras: ¿las mejoras de arma se limitan solo por la columna "Mejoras" de cada arma?~~ **Resuelta (usuario, 2026-09-10):** sí, se valida solo el número de esa columna, sin restricción adicional por tipo de mejora.
8b. Los efectos de nivel de una mejora estándar o subsistema, ¿se acumulan al subir de nivel o
cada nivel sustituye entero al anterior? *(S9)*
8c. ~~El bono de Fuerza del Exoesqueleto se duplica para "carga transportable y proezas de
fuerza": ¿cuenta el movimiento entero (Carrera, Saltos, Escalada, Nado) como "proeza de
fuerza", o solo alguna de esas cinco fórmulas?~~ **Parcialmente resuelta (Murillo,
2026-09-23):** "Duplica la fuerza que él mismo otorga, en carga transportable y proezas de
fuerza" — confirma que lo que se duplica es **solo el bono que el propio exoesqueleto da**,
no la Fuerza entera del personaje, que es como ya lo implementa `bonoFuerzaExoesqueleto()`
(`derivados.ts`) — nada que cambiar ahí. Sigue sin decir si las cinco fórmulas de
movimiento cuentan todas igual como "proeza de fuerza", o solo alguna. *(S10, sigue en pie
en esa parte)*
8d. Las Armaduras Avanzadas (Ultra Ligero, Ligera, Intermedia y Pesada Avanzadas): a
diferencia de sus versiones base — que repiten cada una, explícitas, el "+1 en tiradas de
salvación contra efectos de congelación y llamarada" — el párrafo de las Avanzadas no lo
menciona en absoluto (verificado contra el render de la página 2 del PDF, no solo el texto
plano). ¿Lo conservan igual que la base, lo pierden, o ganan alguno adicional (el usuario
sospecha que también contra eléctrico, 2026-09-12)? Pendiente de confirmar con el diseñador.

**Diseño pendiente**
9. ~~Dotes: `HOJA2` da presupuesto (0 en la letra E, el resto sin rellenar), pero sigue sin decir qué son, cuántas se eligen ni qué compra cada punto.~~ **Resuelta (2026-10-14):** llegó el documento de Dotes (`DOTES`) y el pool completo (`HOJA3`); ver sección 9.
10. ~~Psiónica: ¿los poderes se compran con los 10 puntos de creación, con otro pool, o vienen dados por especie/dote?~~ **Resuelta por `HOJA2`:** pool propio, ligado a la letra de prioridad. Sigue sin catálogo de poderes.
11. ~~Aumentos: ¿hay un tope de capacidad de lo que un cuerpo aguanta instalado? ¿Biónicos y genéticos comparten ese tope o van por separado? ¿Instalarse de más tiene consecuencia?~~ **En proceso (usuario, 2026-09-10):** el diseñador ya lo está preparando — se retoma cuando llegue el documento. **Reabierta (2026-10-16):** el documento de aumentos (`AUM`) llegó y no lo dice.
12. ~~Progresión post-creación: ¿XP, hitos, puntos por sesión?~~ **Resuelta por `HOJA2`:** hay XP, y el coste por nivel es el mismo que en creación (Nivel × factor según categoría) — ver "Coste y progresión", sección 2.
13. ~~Especies: lista y qué modifican.~~ **En proceso (usuario, 2026-09-10):** confirmado, ya en camino. **Resuelta por `ESP`** (2026-10-09): ver sección 14. Sus dudas de lectura (M1-M24) las cerró el usuario; no queda ninguna para Murillo.

**Sobre la dualidad hackeo digital / cuántico** (`CONV-1`, `CONV-2`)
14. ~~Si mente y máquina comparten naturaleza (ondas, superposición, probabilidad), ¿la intrusión psiónica y la digital usan **la misma mecánica** con distinto vector, o son dos subsistemas separados?~~ **Resuelta, ver sección 10.5.**
15. ~~¿Qué par atributo + habilidad resuelve la intrusión psiónica?~~ **Resuelta, ver sección 10.5** (norma por defecto según tipo de objetivo; "lo indica cada poder").
16. ¿Qué mide la defensa de un sistema? `CONV-2` la describe como tormenta de ruido de fase: ¿es un número del objetivo o una tirada enfrentada del núcleo? — **Sin respuesta en la tanda de 2026-09-23.**
17. ~~Fallar la intrusión psiónica provoca "colapso cognitivo o pérdida de consciencia". ¿Eso es fatiga, daño (no letal/letal), o los estados Aturdido/Inconsciente que ya usa `EQUIP`?~~ **Resuelta, ver sección 10.5** (varía por poder, sin regla universal).
18. ~~¿Existen sistemas **no cuánticos** (legacy digital) donde el psiónico no pueda entrar y sí el hacker clásico?~~ **Resuelta, ver sección 10.5:** sí existen.
19. ~~Si el cerebro actúa como cúbit y hay **interfaces neurales** para no psiónicos (`EQUIP`, camuflaje trifásico), ¿puede un no psiónico entrelazarse con hardware, o eso está vetado?~~ **Resuelta, ver sección 10.5:** sí, existe esa tecnología (así se entrena a los aspirantes a psiónico).
20. ~~¿Los aumentos genéticos usan Biociencia donde los biónicos usan Tecnociencia?~~ **En proceso (usuario, 2026-09-10):** parte del documento de aumentos que el diseñador ya está preparando. **Reabierta (2026-10-16):** `AUM` no lo resuelve; pistas mixtas (biónica de Biociencia para extraer, tecnociencia en Tempestad Nanobótica), ver §11.2.

**Huecos detectados al planificar la app** (ver `docs/plan-app.md`)
26. ~~No existe fórmula de capacidad de carga.~~ **Resuelta por `HOJA2`:** sale de Fuerza (Fuerza × 20 kg, con pisos y penalizadores propios) — ver "Carga transportable", sección 5.5.
27. ~~**No hay tabla canónica de tiradas.** Los documentos citan 14 pares atributo + habilidad dispersos en prosa. Hace falta una tabla cerrada de las acciones habituales (atacar, defender, esquivar, saltar, escalar, iniciativa, alerta, ocultarse, tratar heridas…), porque parte de los pares actuales son inferencia nuestra.~~ **Resuelta (Murillo, 2026-09-23):** ver la tabla canónica en "Emparejamiento atributo + habilidad" (sección 2.5/3.5) — la mayoría de las acciones pedidas ya estaban implementadas correctamente, esto era más "escribirlo cerrado" que "inventar pares nuevos".

**Sobre combate y salud** (`COMBATE`)
21. ~~Mecánica exacta del dado y conteo de éxitos.~~ **Resuelta:** 1d12 + aplicado + habilidad vs dificultad; crítico al superar por 6.
22. ~~**Exploración** no existe como habilidad en la hoja pero se usa en iniciativa y alerta.~~ **Resuelta**: sustituye a Supervivencia. *(C4)*
23. ~~¿La app debe llevar la cuenta de PG y fatiga actuales en partida, con sus estados de herida, o eso se lleva en mesa?~~ **Resuelta (usuario, 2026-09-10): en vivo.** La app lleva PG y fatiga en partida — confirma lo ya apuntado en `docs/traspaso.md` §9 (fase 6b). Es la decisión que determina que la ficha pasa a guardar estado mutable además de la creación.
24. ~~Si se lleva en la app: ¿se registra el daño por categoría (no letal / letal / grave)?~~ **Resuelta: sí.** "Grave" ya es categoría documentada (`COMBATE`, ver también la línea 278 de este documento); las tres categorías se registran por separado. **Construida, fase 1 (ficha), 2026-10-24**: desglose `danio` en la ficha, letal por defecto, cura de lo más leve primero (§7, "En la app"); combate y panel de mando pendientes.
25. **Resiliencia** y **Estructura**: ¿son puntuaciones de PNJ y equipo, o algún personaje jugador (un sintético) puede tenerlas? *(C5)*
25b. ~~Varias armas de fuego llevan un penalizador propio "al sigilo" al dispararlas
(p. ej. Rayo Ligero y Plasma SD/SC/etc.: "-6 al sigilo, solo percepción visual"; el
Silenciador da a entender que el disparo normal ya trae un penalizador implícito,
"reduce a -2" sin decir a cuánto). ¿A qué tirada concreta se resta?~~ **Resuelta
(Murillo, 2026-09-23):** el penalizador se aplica **justo después de resolver el
ataque**, a la reacción de detección de los observadores (Perspicacia + Exploración)
— no a una tirada propia del atacante. Encaja con el flujo que ya describe `COMBATE`
(§"Ataque furtivo y sorpresivo"). **Decisión de producto (2026-09-23, el usuario):**
aunque es mecanizable como aviso `objetivo_tercero` colgado de la propia tirada de
disparo, ~~no se construye~~ — saldría en casi toda arma de fuego del catálogo y
sobrecargaría la UI de avisos por poco beneficio. ~~Se queda como texto en la
descripción del arma, sin aviso automático~~ (`MotorMetadata` de las piezas afectadas
pasa de `bloqueado` a `pendiente`, `armasFuego.ts` + Silenciador en `mejorasArma.ts`).

**Decisión revertida (2026-09-24, el usuario):** el "no se construye" del párrafo
anterior nació de un caso concreto que se generalizó por error al redactar la regla
— la objeción real no era "esto siempre sobrecarga la UI", era un malentendido en
una conversación puntual. Se construye: cada pieza afectada cuelga el aviso
`objetivo_tercero`/`nota_fija` de su propia tirada de disparo (`arma.especial` para
armas de fuego, `NivelModulo.notaTirada` para mejoras de arma, ambos concatenados
en `Accion.nota` — `notasDeMejoras()` y el join de `tiradaDeArmaFuego`, `combate.ts`).
`MotorMetadata` de las piezas afectadas pasa de `pendiente`/`bloqueado` a
`construido`: Rayo Ligero, Plasma SD, Plasma SG, Plasma SB, Plasma AR
(`armasFuego.ts`), Silenciador y Sistema de Retroceso nv2 (`mejorasArma.ts`). Si en
el futuro un aviso concreto resulta ser puro ruido (no este patrón entero), se
retira caso a caso, no con una regla general.

**Modelo propuesto por el usuario (2026-09-12), pendiente de validar con el
diseñador, no implementar todavía:** el sigilo no se re-tira en cada instante —
se tira **una vez**, al esconderse/infiltrarse, y el margen de esa tirada
("X éxitos") queda como un **valor persistente** ("Escondido: X éxitos") mientras
nada cambie: quien tenga una Alerta pasiva por debajo de ese número no ve al
personaje, a todos los efectos, hasta que ocurra un **evento de alerta** (disparo,
alarma, ataque...). Ese evento es lo que dispara el derecho a tirada de los que
podrían haberlo notado — no antes. El penalizador de sigilo de un arma ("-6 al
disparar") **restaría de ese valor persistente** en el momento de disparar, no de
una tirada nueva. Consecuencia de interfaz si esto se confirma: la ficha y/o el
combate necesitarían un campo **Visible / Escondido (X éxitos)** por personaje —
hoy no existe ningún sitio donde vivir ese número. Sin decidir todavía si además
el descuento por arma se resta automáticamente al disparar o es el máster quien
lo anota a mano.

**Incongruencias entre documentos, para la misma tanda de preguntas**
26. ~~Cuando el sistema dice "Perspicacia + Medicina", ¿quiere decir Biociencia usando la especialidad Medicina? Lo mismo con Empatía, Manipulación y Bioquímica. Es lo que decide si la habilidad cuenta entera o a la mitad.~~ *(C8)* **Resuelta (Murillo, 2026-09-23):** sí — es una especialidad de Biociencia: "la escogida suma el total de puntos, la no escogida la mitad". Confirma el criterio general para cualquier caso de "Aplicado + nombre de especialidad" a secas en los documentos (Empatía, Manipulación y Bioquímica incluidas), sin cambio de comportamiento — así es como ya lo calcula el motor.
27. ~~¿Cuántos metros mide una casilla?~~ **Resuelta (Murillo, 2026-09-23): 2 metros.** *(C9)*
28. ~~Un "nivel de fatiga", ¿es un punto de fatiga o un estado (Fatigado/Exhausto)?~~ **Resuelta (Murillo, 2026-09-23): es lo mismo, un punto.** *(C10)*
29. ~~El daño de un arma, ¿se resta 1:1 de los puntos de golpe tras el blindaje? Con armas de 7 a 20 y personajes de 6 a 16 puntos, un disparo corriente se lleva media vida.~~ *(C11)* — **Resuelta (Murillo, 2026-09-24): 1 punto de blindaje absorbe 1 nivel (= 1 punto) de daño.** Mismo uso de "nivel" que la pregunta 28 (fatiga): un nivel es un punto, no un estado. Lo que queda de tras la absorción se resta 1:1 de los puntos de golpe. Desbloquea Mejora Ignífuga y Tejido Conductor nivel 2 (Polímero Anticorrosivo nivel 2 no tiene un efecto de blindaje equivalente, ver corrección abajo).
    **Sub-pregunta resuelta (Murillo, 2026-09-24):** el "ignora el primer nivel de daño
    X" de Tejido Conductor **suma** al blindaje normal contra ese tipo de daño
    (equivale a un +1 a blindaje específico de tipo), no lo sustituye.
    **Corrección 2026-09-27** (al construir el código): esta frase exacta solo la trae
    Tejido Conductor nivel 2 (`docs/equipamiento.md:188`, contra Eléctrico) —
    Anticorrosivo nivel 2 no tiene ningún "ignora el primer nivel", solo cambia la
    categoría de daño (Hallazgo #4) y sube su salvación, ya construida aparte. Mejora
    Ignífuga nivel 1 es un mecanismo distinto: no suma un extra, **habilita** que el
    blindaje de la armadura cuente contra Fuego (que por defecto es 0, ver supuesto
    S19) — una entrada previa de este documento los agrupaba a los tres por error.
    **Construido en código 2026-09-27** (`blindajeContra()`, `lib/rules/blindaje.ts` +
    la acción "Bloquear daño" en Acciones): el +1 de Tejido Conductor ya está
    enganchado. Mejora Ignífuga nivel 1, construida 2026-10-23: contra Fuego cuenta
    solo el blindaje de la armadura que la lleva (S85); el nivel 2 sigue pendiente. La excepción de tipo (Mental/Fuego) se tomó como supuesto
    S19, no como respuesta de Murillo — sigue abierto si hay más excepciones aparte de
    Mental y Fuego.
30. ~~**Cultura** y **Supervivencia** no aparecen en ninguna regla... ¿Es Supervivencia la habilidad madre de Exploración?~~ **Resuelta**: Supervivencia desaparece, la sustituye Exploración entera. Cultura se queda sin resolver — sigue sin uso conocido. *(C12)*
31. ~~**"Bloqueo" no está definido en ningún sitio.**~~ **Resuelta (2026-09-24).**
    Bloqueo es "otra forma de defensa" (junto a Esquivar), activa con cualquier arma
    melee equipada: mismo par atributo+habilidad que el **ataque** de esa arma
    (Potencia + Combate Melee; Reflejos + Combate Melee si el arma es Sutil — decisión
    del usuario por el mismo patrón ya confirmado por Murillo para atacar, ver
    "Emparejamiento atributo + habilidad"). Igual que Esquivar, es reacción gratuita
    e ilimitada con el mismo -1 acumulativo por atacante adicional. Lleva la
    **dificultad del arma**, como el ataque ("la tirada empleada para el bloqueo es la
    misma de ataque", `fuente/dotes.md`), **salvo los escudos** (decisión del usuario,
    2026-10-23). El "-2" del Mangual es un ajuste propio de esa pieza sobre su
    Bloqueo que se suma a su dificultad: −4 (decisión del usuario, 2026-10-23).
    Implementado: `tiradaBloqueoDeArmaMelee()` (`lib/rules/combate.ts`), genera
    "Bloquear con X" junto a "Golpear con X" para cualquier arma melee equipada.
32. **"Susceptible a shock" / "apagón" no está definido de forma consistente.** Varias
    piezas de `EQUIP` dicen ser inmunes o susceptibles a shock (Inyector Hipodérmico,
    Soporte Vital, Polímero Anticorrosivo, Tejido Conductor), pero: (a) "apagón" — lo
    que dispara la pérdida de bonos en Soporte Vital — aparece **una sola vez en todo
    el documento** (`docs/equipamiento.md:108`), sin definir qué lo causa ni si es lo
    mismo que sufrir el estado `Shock` en combate; (b) Inyector Hipodérmico nivel 2
    dice "se vuelve susceptible a efectos de shock" pero nunca dice **qué pasa** cuando
    le afecta; (c) las cuatro piezas no se comportan igual entre sí — inmunidad total
    (Anticorrosivo, Tejido Conductor, Inyector n1) frente a degradación parcial
    (Soporte Vital: bonos a +1 salvo uno que se pierde entero). ¿Es "apagón" lo mismo
    que el estado `Shock` (`catalog/estados.ts:670-678`, que ya prevé una rama sin
    mecanizar para "equipamiento o armadura tecnológica", resistida por Estructura) o
    un evento distinto? Esa rama del estado `Shock` está deliberadamente sin construir
    porque depende de que existan sintéticos/aumentos en la ficha (aumentos, sin empezar).
    Detectado por el usuario al revisar el Inyector Hipodérmico (2026-09-21).
33. ~~**Propuesta, no ambigüedad: Canal de Alta Resonancia (Derivación Psiónica nivel 2)
    da "+10% de alcance efectivo de los poderes" — sugerir a Murillo que sea un +N
    fijo en vez de un porcentaje.** Todo el resto del catálogo (armas, mejoras,
    subsistemas) usa bonos planos — un porcentaje sería el único caso de todo `EQUIP`
    que no encaja en la forma `Modificador { valor: number }` ya usada en cientos de
    sitios. No es una regla dudosa, es una propuesta de simplificación para que el
    día que existan poderes psiónicos (Fase 5) esto no obligue a un tipo de bono
    nuevo solo para un caso. Detectado por el usuario al revisar Derivación Psiónica
    (2026-09-22).~~ **Cerrada (usuario, 2026-09-28): el porcentaje se queda** — el alcance de un poder es informativo y multiplicarlo no pide un bono nuevo (§10.6).
34. **S.A.79: contradicción interna en la munición.** La prosa de `descripcion` dice
    "tambor extraíble de 20 cartuchos"; el dato transcrito en el catálogo
    (`escopeta_sa79.municion`) trae un número distinto. No hay forma de saber cuál es
    el correcto sin volver a `docs/equipamiento.md` fila por fila o preguntar
    directamente — puede ser un error de transcripción nuestro, no necesariamente del
    documento fuente. Detectado en el barrido motorMetadata-vs-prosa (2026-09-24).
35. **Exoesqueleto: ¿puede usarse sin armadura?** La prosa dice que sí; el código exige
    `familia === "armadura"` para poder instalarlo (`equipo.ts`, comprobar la función
    exacta de instalación). Puede ser un requisito de diseño real ("necesitas algo
    donde anclarlo") transcrito mal como límite de código, o al revés. Detectado en
    el barrido motorMetadata-vs-prosa (2026-09-24).
36. **Plaga: "el mayor daño de plasma de su clase" — verificar la cifra.** La
    descripción hace una afirmación comparativa (superlativo dentro de su categoría);
    no se ha verificado que el número transcrito sea de verdad el más alto de todos
    los fusiles de precisión de plasma del catálogo. Puede ser solo una comprobación
    de datos (no hace falta preguntar a Murillo si los números ya están bien
    transcritos en otro sitio), o puede hacer falta confirmar con él si el catálogo
    entero de plasma está bien relativizado entre sí. Detectado en el barrido
    motorMetadata-vs-prosa (2026-09-24).

**Umbrales de salud y fatiga (§7), abiertas al mecanizarlos en M1b (2026-10-13)**
37. **"Media velocidad": ¿a qué movimientos?** Hoy carrera, vuelo y levitación; saltos,
    escalada y nado no. ¿Es así, o afecta a todo el movimiento? *(S26)*
38. **Malherido y Exhausto a la vez**: ¿se acumulan (un cuarto de velocidad, −50 % de
    carga) o se aplica solo el peor? Hoy, el peor. *(S27)*
39. **Redondeo de la mitad y de los porcentajes**: hoy hacia abajo. *(S28)*
40. **Arköru (carga +20 %) malherido**: ¿el −25 % va sobre la carga ya con el +20 %, o se
    restan los porcentajes entre sí (+20 −25 = −5 %)? Hoy, sobre la carga ya multiplicada. *(S29)*

**Barrido de items contra la foto de Drive (2026-10-24)**
41. **Mejoras de arma en el armamento pesado**: el Bípode dice «disponible para […] el
    lanzagranadas» y esas armas admiten 2 mejoras, pero hoy ninguna mejora de arma se puede
    instalar en armamento pesado. ¿Cuáles entran (solo el Bípode, o todas las que encajen)?
42. **Maniobrabilidad de Movilidad Aérea**: «Dificultad de Maniobrabilidad −3» (−4 en nivel 4).
    ¿Es un penalizador o un bonificador? La app lo aplica como +3/+4 (que suba con el nivel y
    que la opción Maniobrabilidad «disminuya la dificultad en 1» apuntan a bonificador). ¿Y
    cuenta también para la esquiva en vuelo?
43. **Derribo de Plasma SC y Plasma AAA**: su fila de la tabla no trae «Efecto Derribo»; la
    regla de la familia dice que derriban, sin número. La app usa 9 y 11. ¿Qué dificultad?

---

## Registro de conversaciones

Aquí se anota lo que llegue por chat, con fecha, para poder rastrear qué regla vino de
dónde y qué tumbó a qué.

| Ref | Fecha | Qué aportó | Qué cambió |
|---|---|---|---|
| `ESP` | 2026-10-09 | `docs/Especies.pdf` (9 págs, creado el 2026-09-26), transcrito en `docs/especies.md`: Humanos, Riux, Arianyi, Arkör y Manduk (4 castas, 6 linajes nobles), con atributos, peso, altura y rasgos. Mismo día, el usuario resuelve las 24 dudas de lectura (M1-M24, `docs/propuesta-especies.md` §5 y §5b). | Sección 14 pasa de `[PENDIENTE]` a `[PARCIAL]`. Resuelve la pregunta 13. Anota S5, S6, S7 y S19. |
| `CONV-4` | 2026-09-10 | `docs/Creación de Personaje.odt` (`HOJA2`), revisión de la hoja de creación: sistema de prioridad (A-E entre Atributos/Habilidades/Dotes/Psiónica/Recursos), Aplicados como media en vez de suma, techo de creación 4/6 unificado, otras constantes de movimiento, coste por nivel (Nivel×factor) para creación y progresión, carga transportable completa, Altura y Peso en identidad. Por WhatsApp, Murillo confirma que las 5 letras de prioridad se usan **una vez cada una, sin repetir** ("Es igual que shadowrun"). | Resuelve las preguntas 5, 7 (parcial), 10, 12 y 26. Tumba el supuesto S1 (coste lineal de habilidades) y actualiza S7 (4/6 en vez de 4/5 y 3/5). Añade S11 (redondeo de Aplicados hacia arriba, decisión del usuario) y S12 (Dotes sin presupuesto en A-D, solo pendiente confirmar). Deja pendiente si el pool de Dotes A-D existe y no se transcribió. **Con este alcance, el motor de creación implementado hoy queda desactualizado en varios puntos — ver `docs/traspaso.md` para el plan de qué tocar.** |
| `CONV-3` | 2026-09-03 | Dos PDFs: **Sistema y Combate** (28 ago, 12 págs) y **Equipamiento** revisado (31 ago, 49 págs frente a las 43 anteriores). | Secciones 6 y 7 pasan de `[INFERIDO]` a `[FIRME]`: ya se conoce el dado (1d12), la tabla de dificultades, los críticos, las acciones por turno, los umbrales de herida y fatiga, las categorías de daño y 20 estados. Resuelve la pregunta 21; abre C4-C7 y las preguntas 22-25. En equipamiento: cambian **todas** las tablas de armas, aparece el efecto **fusión**, las **distancias de disparo** con modificadores y 12 secciones nuevas (armas de Kerzul, otras armas a distancia, medicina y farmacia). |
| `CONV-2` | 2026-08-26 | Documento de arquitectura cuántica y psiónica: principio rector (cuántica y psiónica comparten naturaleza — ondas, superposición, probabilidad — y no necesitan traductores), entorno de cúbits que colapsan ante estímulo externo, psiónica como campo neuro-eléctrico que actúa sobre materia/energía/información, y los tres ejes de interacción (entrelazamiento neural, navegación por probabilidad, resonancia y resistencia). | Nueva sección 10 completa. Cierra el *por qué* de la dualidad de hackeo; abre las preguntas 13-18 sobre su mecánica. La ciberseguridad deja de ser "muro con nivel" y pasa a ser duelo de estabilidad mental. |
| `CONV-1` | 2026-08-26 | Aumentos = biónicos + genéticos. La psiónica es **cuántica**, no digital-cibernética; por eso los psiónicos también hackean, aunque el modelo digital sigue existiendo. Próximos envíos: especies, luego poderes psiónicos; ambos documentos a poco más de la mitad. | Secciones 10 y 11 pasan de `[PENDIENTE]` a `[PARCIAL]`. Nuevas preguntas sobre la dualidad de hackeo. |
