# Nueva Era — Manual del Máster

> **Documento vivo.** Recoge las decisiones de diseño del sistema a fecha 2026-07-22.
> Lo que está firme va marcado como **[FIRME]**; lo que aún se está cociendo, como
> **[PROPUESTA]** o **[PENDIENTE]**. Si cambias un número, cámbialo aquí también:
> este manual es la fuente de verdad del *diseño*; el código es la fuente de verdad
> de la *implementación*.

---

## 1. Qué es Nueva Era (y de qué está hecho)

Nueva Era es un juego de rol **homebrew** con dos padres claros:

- **El chasis es Vampiro** (Mundo de Tinieblas, sistema Storyteller, d10). De ahí
  viene la resolución por *dice pools*, la compra de rasgos por puntos y la idea de
  que tu "clase" es en realidad un **clan**: no te define tus estadísticas, te
  define tus **poderes**.
- **La piel es Cyberpunk 2077.** De ahí vienen los arquetipos (Netrunner, Merc,
  Cazatalentos), el cyberware, las armas ligadas a una estadística y la estética
  Night City.

La filosofía de diseño que lo gobierna todo es un **triángulo**: 3 arquetipos, 3
atributos, 3 tipos de habilidades, 3 ramas de disciplinas por árbol, 3 tipos de
cyberware y 3 tipos de armas. La simetría no es capricho: es lo que te permite,
como diseñador de uno, **diseñar un patrón y rellenar tres carriles** en vez de
inventar cincuenta cosas sueltas.

> **Aviso honesto para el DM:** el triángulo da claridad y facilita la producción,
> pero su trampa es la **homogeneización** (que todos los netrunners se parezcan).
> Todo este manual está construido para evitarla. La gracia de un triángulo no son
> los tres vértices, son las **tensiones entre ellos**.

---

## 2. Cómo se resuelve una acción **[FIRME]**

Sistema de *dice pool* d10, como Vampiro:

1. Juntas **atributo + habilidad** → esa es tu reserva de dados (nº de d10).
2. Tiras y cuentas **éxitos** contra una dificultad (por defecto **6**).
3. Más éxitos = mejor resultado.

Ejemplo: un personaje con **Destreza 3** y **Sigilo 2** tira **5 dados** para colarse.

La **dificultad la marca la ficción, no la clase**. Una misma puerta puede abrirse
con Fuerza, Destreza o Inteligencia; lo que cambia es *cuál lo tiene fácil*
(ver §5, multidisciplinariedad).

---

## 3. Anatomía de un personaje

| Componente | Qué es | Rango | Se paga con |
|---|---|---|---|
| **Atributos** | Fuerza, Destreza, Inteligencia | 1–5 | XP |
| **Habilidades** | Lista cerrada de 12, agrupadas por atributo | 0–5 | XP |
| **Arquetipo** | Netrunner / Cazatalentos / Merc — **inamovible** | — | (de nacimiento) |
| **Disciplinas** | Los árboles de poderes de tu arquetipo | nodos 1–5 | XP |
| **Cyberware** | Implantes, con tope de capacidad | — | €$ (dinero) |
| **Equipo** | Armas ligadas a una **estadística** | — | €$ (dinero) |

Las **habilidades** que existen hoy (4 por atributo):

| Fuerza | Destreza | Inteligencia |
|---|---|---|
| Atletismo | Armas a distancia | Netrunning |
| Cuerpo a cuerpo | Sigilo | Tecnología |
| Intimidación | Conducción | Medicina |
| Aguante | Latrocinio | Percepción |

> **Regla de oro:** los atributos y las habilidades son un **sandbox universal**.
> No hay descuentos ni penalizaciones por arquetipo. Un Merc paga por Inteligencia
> exactamente lo mismo que un Netrunner. La clase **no toca las stats**.

---

## 4. Los tres arquetipos (tu "clan") **[FIRME]**

| Arquetipo | Atributo afín | Fantasía en combate |
|---|---|---|
| **Merc** | Fuerza | Tanque / *overrun*, aguanta y arrolla |
| **Cazatalentos** | Destreza | Sigilo / furtivo, golpea desde las sombras |
| **Netrunner** | Inteligencia | Mago digital: área, daño persistente, *execute* |

Tu arquetipo es **de nacimiento y no cambia jamás**. Lo que te da:

1. **Acceso a su árbol de disciplinas** a precio de clase (barato).
2. **Firmas exclusivas**: 2–3 disciplinas top que *solo* tu arquetipo puede tocar.
3. **Una disciplina de regalo** al crear el personaje: el **tronco** de tu árbol
   (el Netrunner nace con **Hackeo**). Es fija, no se elige.

**Lo que NO te da:** ni un punto de atributo, ni descuentos en habilidades. Toda la
identidad de clase vive en **las disciplinas**. Dicho de otra forma: *los árboles de
disciplinas SON el sistema de clases del juego.* Un Merc juega como Merc por sus
poderes, no por sus números.

---

## 5. La matriz 3×3: arquetipo × atributo **[FIRME]**

Aquí está el corazón del diseño. **Arquetipo y atributo motor son dos diales
independientes**, no uno soldado.

- **Arquetipo** = qué árbol de disciplinas + tus firmas (fijo de nacimiento).
- **Atributo motor** = dónde inviertes de verdad; define tus *dice pools* y **qué
  armas usas** (el arma va ligada a la stat, no a la clase: **una daga siempre es
  Inteligencia**, la use quien la use).

|  | INT motor | DES motor | FUE motor |
|---|---|---|---|
| **Netrunner** | ★ nativo | cruce | cruce |
| **Cazatalentos** | cruce | ★ nativo | cruce |
| **Merc** | cruce | cruce | ★ nativo |

- **La diagonal (★)** = los 3 builds "sobre raíles". Baratos, naturales, lo que hará
  la mayoría.
- **Las 6 casillas "cruce"** = arquetipo y atributo desalineados (Merc-a-INT
  apuñalando con daga, Netrunner-a-Fuerza…). **Posibles, molones y caros.**

### De dónde sale lo caro de un cruce **[FIRME]**

Ni de atributos ni de habilidades (son planos). El cruce se paga en la **capa de
disciplinas**, por dos vías:

1. **La disciplina habilitadora, honda en tu propio árbol.** Ej.: "tu daño de
   Potencia escala con Inteligencia en vez de Fuerza". Está abajo del todo, con
   prerrequisitos → mucho XP para llegar.
2. **El recargo por disciplinas fuera de clase** (×1,5, ver §7) cuando además te
   metes a picotear en el árbol de otro arquetipo.

> **La decisión de balance más importante de todo el juego** es **dónde colocas la
> habilitadora** en el árbol. Es la única perilla que controla cuánta diversidad de
> cruces hay. Si la pones accesible, todos cruzan y el Merc-daga deja de ser
> especial. Si la pones muy honda, nadie la toca. Trátala con respeto.

---

## 6. La economía: dos monedas **[FIRME]**

| Moneda | Compra | Se gana con |
|---|---|---|
| **XP** (experiencia) | Atributos, habilidades, disciplinas | Combate, objetivos, rol |
| **€$** (eurodólares) | Cyberware, equipo | Botín, pagas, misiones |

### Modelo derivado: solo guardas lo *ganado*

Este es un principio importante y anti-trampas. **No se guarda un "saldo" mutable.**
Se guarda solo lo **ganado**, y el **disponible se recalcula** siempre:

```
XP disponible     = XP ganado     − XP gastado
Dinero disponible = Dinero ganado − Dinero gastado
```

- **Gasto de atributos/habilidades**: se recalcula por fórmula (§7).
- **Gasto de disciplinas/cyberware**: cada adquisición guarda su **coste pagado**
  como foto del momento.

**El coste pagado (importante para ti como máster):**
- Un cyberware/disciplina **regalado** = `coste pagado 0`. Honesto: la ficha dice
  "instalado, pagado 0 (regalo)", en vez de que infles el dinero ganado con pasta
  que el jugador no ganó.
- Si algún día **rebalanceas un precio** en el catálogo, no se recalcula el saldo de
  quien ya lo tenía. La foto del momento manda.

> Ventaja para ti: el disponible es **imposible de falsear** (no existe como número
> editable, se deriva de la ficha) y el **respec es gratis** (bajas un rasgo y el
> disponible sube solo). En fase de testing, XP/dinero *ganados* son editables a
> mano; cuando conectemos el rol del máster, pasarán a ser **solo tú** quien los
> otorga.

---

## 7. Tablas de coste **[FIRME atributos/skills · PROPUESTA disciplinas]**

### Atributos (coste = valor actual × 4)

| De → a | Coste XP |
|---|---|
| 1 → 2 | 4 |
| 2 → 3 | 8 |
| 3 → 4 | 12 |
| 4 → 5 | 16 |
| **Total 1 → 5** | **40** |

### Habilidades (nueva = 3; luego valor actual × 2)

| De → a | Coste XP |
|---|---|
| 0 → 1 | 3 |
| 1 → 2 | 2 |
| 2 → 3 | 4 |
| 3 → 4 | 6 |
| 4 → 5 | 8 |
| **Total 0 → 5** | **23** |

### Disciplinas **[PROPUESTA]** (en clase = rango actual × 4; nodo nuevo = 4)

| De → a | En clase | Fuera de clase (×1,5) |
|---|---|---|
| 0 → 1 | 4 | 6 |
| 1 → 2 | 4 | 6 |
| 2 → 3 | 8 | 12 |
| 3 → 4 | 12 | 18 |
| 4 → 5 | 16 | 24 |
| **Total 0 → 5** | **44** | **66** |

> El **tronco de regalo** (Hackeo para el Netrunner) empieza en rango 1 gratis, así
> que subirlo a 5 cuesta solo **40** (1→5), no 44.

---

## 8. XP, ritmo y "niveles" implícitos **[PROPUESTA]**

No hay niveles explícitos. En su lugar, **el XP acumulado te dice en qué punto está
un personaje** — y como los costes escalan, se **sube rápido al principio y lento al
final** (el feeling clásico de niveles).

### Referencia de ritmo

| Concepto | Valor |
|---|---|
| XP por combate significativo | **~10** |
| Especialista maxeado | **~300 XP** (~30 combates) |
| Build de cruce completo | **~400 XP** (~40 combates) |
| Presupuesto de creación | **~30–40 XP** |

Con ~2 combates por sesión → **~15 sesiones** para maxear un especialista; jugando
semanal, **~4 meses de campaña**. El cruce, ~5. Una campaña entera te lleva de
novato a leyenda sin agotarse en un mes ni eternizarse.

### Desglose de un especialista (~300 XP)

| Bloque | Ejemplo | XP |
|---|---|---|
| Atributos | INT 5, DES 3, FUE 2 | ~56 |
| Habilidades | 4 de INT altas + picoteo | ~80 |
| Disciplinas | Hackeo 5 + rama principal honda + medio carril | ~160 |
| **Total** | | **~296** |

> El **cruce cuesta ~33% más XP** (~400 vs ~300). Ahí tienes cuantificado que "el
> cruce es caro": no es imposible, **llegas notablemente más tarde**.

### Umbrales de desarrollo (niveles implícitos)

| XP acumulado | Estado | Sensación en mesa |
|---|---|---|
| 0 – 40 | Novato | núcleo básico, tronco + poco más |
| ~75 | Competente | tu rama principal funciona, primeros *spikes* |
| ~150 | Veterano | build definida, 1 rama sólida |
| ~250 | Élite | 1,5 carriles, nodos profundos |
| ~300 | Maxeado | especialista rematado |
| ~400 | Leyenda | cruce completo / todo lo que ibas a coger |

> **Recomendación:** un personaje recién creado **no debería nacer en blanco** (todo
> a 1 y solo el tronco). Dale el presupuesto de creación (~30–40 XP) como su "vida
> antes de la partida" → arranca ya en "novato competente".

**Las dos perillas del ritmo:** si el árbol se siente farmeo, **sube el XP/combate**;
si los personajes se maxean demasiado rápido, **encarece la curva de disciplinas**.

---

## 9. Los árboles de disciplinas **[FIRME estructura · PENDIENTE contenido]**

### Notación

Un árbol se describe como `n-n-n-n-…`, donde cada `n` es **cuántos nodos hay en ese
tier**. Ejemplo: `1-3-2-4-2` = 5 tiers; el primero tiene 1 nodo, el segundo 3, etc.
**La profundidad no es fija** (5 es solo un ejemplo).

- **Tier 1 = siempre 1**: es el **tronco**, la disciplina de regalo. El carnet de
  socio del arquetipo. Compartido por todos, neutro (no te empuja a ninguna rama).
- **Tier 2 = las ramas**: aquí eliges de verdad qué clase de personaje eres.
- **Nodos rango 1–5**: cada nodo se sube de 1 a 5 como un atributo.
- **Puntos para subir de tier**: para desbloquear el siguiente tier necesitas X
  puntos metidos en el árbol (número **[PENDIENTE]**). "Puntos" = suma de rangos
  comprados.

### Picoteo vs "1,5 carriles" — la perilla de *gating*

Que un personaje pueda maxear varias ramas o solo una **depende de cómo gatees los
tiers altos**:

| Modelo de gate | Efecto |
|---|---|
| **Por puntos en el árbol** | Con XP suficiente profundizas en varias ramas → **picoteo libre** |
| **Por puntos en la rama** (estilo runas de LoL) | Necesitas invertir *en esa rama* para bajar → emerge **"1,5 carriles"** (maxeas 1, medio de otra, dejas 1 vacía) |

> **Plan:** empezamos con **gate por árbol (picoteo)**. Jugamos. Si vemos que todos
> maxean todo, apretamos a **gate por rama** y el "1,5 carriles" aparece solo. Es una
> perilla que se gira después, **no un rediseño**.

### El Netrunner (prototipo) **[FIRME dirección · PENDIENTE nodos]**

El Netrunner es un **mago digital**. Diseñamos su árbol **entero** primero como
prototipo; una vez funcione, replicamos el patrón a Merc y Cazatalentos.

- **Tronco (regalo): Hackeo.** No es "hack de daño", es el **verbo**: interfacear con
  la tecnología. Su rango 1–5 = tu potencia de intrusión (a qué nivel de seguridad
  llegas y la magnitud base). **Las tres ramas escalan de aquí.**
- **Rama Daño → Sobrecarga.** El *blaster*: daño directo, y arriba DoT, área y el
  **execute** (obligar al enemigo a dispararse). Aquí, en lo hondo, va la
  **habilitadora de cruce** ("tu daño escala con Fuerza").
- **Rama Control → Interferencia.** El *controlador*: ciegas ópticas, atascas armas,
  y arriba la marioneta.
- **Rama Intrusión → Ganzúa.** El *infiltrador/soporte*: abres puertas, cámaras y
  torretas, extraes datos y **buffeas el cyberware de un aliado**.

---

## 10. Sistemas pendientes de diseñar **[PENDIENTE]**

Anotados para no perderlos; se diseñan más adelante:

- **Cyberware**: catálogo común comprado con €$, con **tope de capacidad**. La "carga
  de cromo" es un solo número que sirve doble: te limita cuánto instalas **y** sube
  la dificultad de la tirada de ciberpsicosis.
- **Ciberpsicosis**: si la vida baja del ~10%, tiras Humanidad; la dificultad escala
  con el cromo instalado; si fallas, entras en *berserk*/cyberpsicópata X turnos.
- **Equipo/armas**: 3 tipos ligados a stat (armas de Fuerza, de Destreza, de
  Inteligencia). Agnósticas al arquetipo, no a la estadística.
- **Árboles de Merc y Cazatalentos**: se replican del patrón del Netrunner.
- **Disciplinas exclusivas** por arquetipo y **habilitadoras** de cruce (colocación).

---

## 11. Recomendaciones para el máster

Chuleta de lo que hemos aprendido diseñando esto. Léela antes de crear contenido.

1. **Diseña un arquetipo entero antes de tocar los otros.** El Netrunner es el
   prototipo. Árbol completo, números, habilitadora colocada, jugado. *Luego*
   replicas. No esboces los tres a medias.

2. **La profundidad de la habilitadora es tu decisión de balance nº 1.** Todo lo
   demás es cosmético al lado de eso. Cuánta diversidad de cruces hay cuelga de ese
   único número.

3. **Retos multidisciplinares + momentos de foco.** Que casi todo se pueda resolver
   de 3 formas (una puerta tecnológica/pesada/con candado favorece a una stat
   distinta) — pero deja **unas pocas** puertas que *solo* un especialista de verdad
   abre. Sin eso, nadie se siente irremplazable y el equipo es intercambiable.

4. **Contenido triangular.** El triángulo mecánico solo funciona si tus **encuentros
   premian los 3 pilares**. Si tus partidas son 70% combate a hostias, Inteligencia
   es una trampa y el Netrunner, decorativo. Reparte retos de hackeo/tech, de
   sigilo/social y de fuerza bruta.

5. **Clava las 3 diagonales primero; los cruces pueden ser ásperos.** Los 3 builds
   nativos tienen que ser sólidos y divertidos por sí solos. Los 6 cruces no tienen
   que estar perfectos: tienen que ser **posibles y molones** para quien quiera la
   fantasía. Un cruce no necesita ser óptimo, necesita **existir**.

6. **No metas "impuestos" en los árboles de clase.** Si el 100% de los jugadores
   acaba comprando el mismo nodo (porque sin él el combate es incómodo), ese nodo no
   es identidad: es un impuesto, y debería estar en las **reglas base**. Los árboles
   guardan lo que te **diferencia**, no lo que te hace funcional.

7. **Las stats no distinguen a las clases; las disciplinas sí.** No esperes que
   Inteligencia "haga netrunner" a alguien. Lo que hace netrunner es el **árbol**.
   Diseña identidad ahí.

---

*Fin del manual (por ahora). Se amplía según diseñamos.*
