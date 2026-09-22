# Modificadores de una tirada — cómo llegan y cómo añadir uno nuevo

Documento técnico, no de reglas (eso es `sistema.md`). Es la guía para cuando
alguien —tú dentro de tres meses, u otra persona— necesite añadir un bono a
una tirada y no sepa dónde tocar. Léelo entero antes de añadir el primero:
son diez minutos y evita reinventar uno de los cuatro mecanismos que ya
existen.

## 1. El modelo mental

**`Sheet` es la única fuente de verdad. Todo lo demás es una función pura que
se recalcula en cada render.** No hay que "avisar" a nadie de que algo ha
cambiado — no hay eventos, ni pubsub, ni caché. Cuando el jugador equipa un
arma, React vuelve a renderizar con el `sheet` nuevo, y cada función que lee
de `sheet` (directa o indirectamente) devuelve el número correcto sin que
nadie la llame a propósito.

Esto ya funciona así para **atributos y habilidades**, vengan de donde
vengan (especie, equipo, o lo que sea que exista el año que viene: dotes,
aumentos, estados). La cadena es:

```
sheet.equipo cambia
  → se vuelve a renderizar con el sheet nuevo
    → modificadorTirada() (tiradas.ts) llama a aplicado() / valorEfectivo() (derivados.ts)
      → estas llaman a modificadoresActivos(sheet) con el sheet YA actualizado
        → que recorre especie + modificadoresDeEquipo(sheet)
          → que recorre TODO el equipo (armadura, arma, mejoras, subsistemas, movimiento) sin distinción
```

**Consecuencia práctica: si añades un `Modificador` de tipo `"atributo"`,
`"derivado"` o `"habilidad"` en el catálogo (a una mejora, una armadura, lo
que sea), llega solo a todas las tiradas que usen ese atributo o esa
habilidad. No hay que tocar `tiradas.ts` ni `combate.ts` ni el modal.** Este
tipo de modificador vive en `modificadores.ts` y ya está resuelto — no sigas
leyendo si es lo único que necesitas, esta guía es para el resto de casos.

## 2. Los cuatro mecanismos que SÍ dependen de la tirada en concreto

Atributos y habilidades son "de personaje": no les importa qué tirada las
está usando. Pero hay bonos que sí dependen de la tirada — de si el jugador
elige algo antes de tirar, de qué arma en concreto la generó, o de qué
tirada es en general (una salvación concreta, un grupo entero). Para eso hay
cuatro mecanismos:

| Mecanismo | Cuándo se usa | Ejemplo real | Dónde se declara |
|---|---|---|---|
| **`CondicionTirada`** (`toggle` / `opcion` / `contador`) | El jugador elige algo en el modal, en el momento de tirar | Bípode apoyado o no; tramo de distancia; atacantes adicionales en Defensa | `NivelModulo.condiciones` en el catálogo |
| **`ajustesFijos`** | Un número que se suma solo, sin elección del jugador, siempre igual | El -1 del Lanzagranadas Integrado por el peso | `NivelModulo.ajusteAtaque` en el catálogo |
| **`bonosTramo`** | Un número que se suma solo, pero que depende de qué tramo de distancia ya eligió el jugador | El +1 de la Mira Telescópica a media/larga distancia | `NivelModulo.ajusteTramo` en el catálogo |
| **`Modificador` tipo `"tirada"`** (alcance) | Un bono de personaje entero, no ligado a un arma o pieza concreta: una tirada fija por su id, un grupo entero, cualquier tirada de una habilidad, o solo cuando cierto modo está elegido | El +1 a Salvación de Fortaleza del Traje Ultra Ligero | `modificadores` del catálogo (especie o equipo), campo `alcance` |

Los cuatro se pintan en el mismo sitio: el bloque **"// Desglose"** de
`TiradaModal` (`src/components/TiradaModal.tsx`), una línea por cada uno,
con su fuente. Nunca se funden en silencio dentro de otro número — si lo
están, es un bug (ya nos pasó dos veces con el lanzagranadas y la mira, y
las dos veces el arreglo fue separar la línea, no esconder el número).

**Por qué cuatro y no uno.** Cada uno resuelve una pregunta distinta:
"¿decide el jugador?" (condición), "¿depende de otra elección ya hecha?"
(bonoTramo), "¿es siempre igual mientras esté puesto?" (ajusteFijo), "¿es de
personaje entero, sin arma de por medio?" (alcance). Forzar los cuatro a
converger en un único mecanismo genérico sería más "elegante" en abstracto,
pero cada uno es hoy una función corta, fácil de leer y de testear — no
compensa la ceremonia de unificarlos.

## 3. El árbol de decisión: qué mecanismo usar

Cuando añadas un modificador nuevo, hazte estas preguntas en orden:

1. **¿El jugador tiene que decidir algo en el momento de tirar** (sí/no, una
   de varias opciones, un número)? → **`CondicionTirada`**. Añade el control
   en `condiciones` del nivel correspondiente, en el catálogo. Elige el tipo:
   - `toggle`: una decisión de sí/no ("¿está apoyado?", "¿es martes?").
   - `opcion`: una de varias, excluyentes (tramo, modo de disparo, munición).
   - `contador`: un número entre un mínimo y un máximo.

   **No hace falta tocar nada más.** El modal ya sabe dibujar los tres tipos
   (`ControlCondicion` en `TiradaModal.tsx`), y `combate.ts` ya recoge las
   condiciones de cualquier mejora instalada en el arma en cuestión
   (`condicionesDeMejoras`), sea cual sea. Es la razón de que estos tres
   tipos existan: cerrar la lista a formas conocidas es lo que permite que
   una mejora nueva sea solo datos, nunca código nuevo.

2. **¿Es automático, no depende de nada, y es siempre el mismo número
   mientras la pieza está puesta, en el arma que la lleva?** →
   **`ajustesFijos`** (campo `ajusteAtaque` del nivel). Aparece en el
   desglose con la etiqueta de la pieza que lo trae.

3. **¿Es automático, pero cambia según el tramo de distancia que el jugador
   ya eligió, en el arma que la lleva?** → **`bonosTramo`** (campo
   `ajusteTramo` del nivel).

4. **¿Es un bono de personaje entero, no ligado a un arma o pieza
   concreta** (una salvación de la especie, un traje que protege contra
   frío, un subsistema que ayuda a resistir algo)? → **`Modificador` tipo
   `"tirada"`, con `alcance`.** Ver sección 5: elige entre `tiradaId`,
   `grupo`, `habilidad` o `modo` según a qué tenga que llegar el bono.

## 4. ¿Solo se puede instalar en ciertas armas? La etiqueta ya existe

Esto es aparte de "qué bono da" — es "en qué armas se puede poner". Cada
mejora de arma declara `compatibilidad`, con tres formas:

```ts
{ tipo: "todas" }
{ tipo: "porTipoArma", tiposPermitidos: ["fusil_asalto", "fusil_precision"] }
{ tipo: "excluyeCategoriaDanio", categoriasExcluidas: ["Plasma"] }
```

La tienda no deja instalar una mejora en un arma que no cumpla su
`compatibilidad` (`validarInstalacion` en `equipo.ts`). Por construcción, un
bono de una mejora **nunca se aplica a un arma donde no se pudo instalar** —
no hace falta una segunda comprobación en ningún otro sitio.

**Límite de hoy:** las mejoras de arma (`mejoraArma`) solo se pueden
instalar en armas de fuego (`familia: "arma"`), nunca en armas melee. Si
algún día hace falta una mejora para, por ejemplo, las Armas Mecánicas de
`armasMelee.ts`, hay que abrir esa puerta primero en `validarInstalacion` —
es una ampliación de una vez, no algo que se repita por cada mejora.

## 5. `Modificador` tipo `"tirada"`: el alcance

Este es el mecanismo para bonos de personaje entero — especie, traje,
subsistema — que no dependen de una elección del jugador ni están ligados a
un arma concreta. Vive en `modificadores.ts`:

```ts
type AlcanceModificador =
  | { tipo: "tiradaId"; id: string }                 // una tirada fija, por su id ("salv_fortaleza")
  | { tipo: "grupo"; grupo: GrupoTirada }             // todas las de un grupo (Salvaciones, Acciones...)
  | { tipo: "habilidad"; habilidad: HabilidadId }     // cualquier tirada que use esa habilidad
  | { tipo: "modo"; contieneEtiqueta: string }        // solo si el modo elegido la contiene ("F. Auto")
  | { tipo: "todas" };                                // cualquier tirada, sin excepción
```

`bonoAlcance()`/`desgloseAlcance()` (mismo fichero) resuelven cuál le toca a
una tirada dada, con un `ContextoTirada` que la UI arma sola (id, grupo,
habilidad de la tirada, y el modo que esté elegido ahora mismo en el modal,
si lo tiene). `TiradasTab` pasa `modificadoresActivos(sheet)` al modal junto
a la tirada; el modal hace el resto — no hay que tocar nada por cada
modificador nuevo, solo declararlo en el catálogo con el alcance correcto.

**Cuál elegir:**
- `tiradaId` → para salvaciones y otras tiradas fijas de `TIRADAS` (no sirve
  para las de ataque generadas por `combate.ts`, que tienen id por
  instancia — para esas, `ajustesFijos`/`bonosTramo`/`condiciones` son más
  precisos y ya existen).
- `grupo` → para algo que afecte a todo un grupo por igual (raro: casi
  siempre se quiere una tirada o una habilidad concretas, no el grupo
  entero — usarlo mal sobre-aplica el bono).
- `habilidad` → para algo que ayude en cualquier tirada de esa habilidad,
  sea cual sea el arma o el contexto.
- `modo` → solo tiene sentido en una tirada de ataque con condición "modo"
  (el Sistema de Retroceso, que solo ayuda en F. Auto). **Limitación
  conocida:** no distingue por tipo de arma — el documento dice que en
  ametralladoras el Sistema de Retroceso ayuda en *cualquier* modo, y este
  alcance no lo captura (ver el comentario en su entrada del catálogo).
- `todas` → para un penalizador de personaje entero, sin excepción: los
  "-1/-3/-5 a todo" de los umbrales de salud/fatiga (`docs/sistema.md` §7) y
  los estados de la fase 6b que golpean cualquier acción por igual. Úsalo
  poco — si el bono en realidad solo afecta a un grupo o una habilidad,
  usa ese alcance más preciso, no `todas` por comodidad.

**Ojo con inventar el alcance de algo que no está claro en las reglas.**
Varios de los 31 modificadores migrados con este mecanismo apuntan a un
`tiradaId` que **todavía no existe** (`poder_psionico`,
`resistir_metasensoria`, `salv_ceguera_destello`...) porque esa tirada no
está implementada o el documento no dice qué salvación la cubre. Eso es
correcto: el modificador se calcula, no encuentra destino, y no aporta nada
— ni de más ni de menos — hasta que la tirada exista o se aclare la regla.
**No le asignes un `tiradaId` que exista solo para que "haga algo"**: eso
sería inventar una regla, y aquí no se hace (ver `docs/traspaso.md` §4).

## 6. Ejemplo trazado de punta a punta: el Bípode

Para ver `CondicionTirada` con código real, sigue el Bípode:

1. **Catálogo** (`src/lib/catalog/equipo.ts`, mejora `bipode`, nivel 1):
   ```ts
   condiciones: [{
     id: "apoyado",
     tipo: "toggle",
     etiqueta: "Apoyado / tumbado (bípode)",
     valorActivo: 1,
     valorInactivo: -1,
   }]
   ```
2. **Motor** (`src/lib/rules/combate.ts`, `condicionesDeMejoras`): recorre
   `sheet.equipo`, encuentra el bípode instalado en esa arma, coge su
   `condiciones` y las añade a la tirada "Disparar con...". No sabe nada
   específico del bípode — trataría igual una mejora nueva.
3. **UI** (`src/components/TiradaModal.tsx`, `ControlCondicion`): ve un
   objeto `tipo: "toggle"` y dibuja el botón sí/no, sin saber qué mejora lo
   originó.
4. **Cálculo** (`src/lib/rules/condiciones.ts`, `valorCondiciones` /
   `desgloseCondiciones`): suma el valor activo o inactivo según el estado
   del modal, y genera la línea del desglose con la etiqueta.

Ni un solo `if (catalogoId === "bipode")` en ningún sitio. Esa es la prueba
de que el mecanismo es genérico: si no la encuentras al añadir tu mejora,
algo se ha hecho a mano que no hacía falta.

## 7. Cuando algo no aparece en el desglose: checklist

1. ¿Es un `Modificador` de tipo `atributo` / `derivado` / `habilidad`?
   Debería funcionar solo — si no, el bug está en `modificadoresDeEquipo` o
   en `modificadoresActivos`, revisa que la pieza esté bien enganchada ahí.
2. ¿Es una condición, un ajuste fijo o un bono por tramo? Comprueba que está
   en el nivel correcto del catálogo (`pieza.nivel` tiene que casar con el
   nivel instalado) y que la mejora está realmente instalada en la
   instancia de arma correcta (`instaladoEnId`).
3. ¿Es un `Modificador` tipo `"tirada"`? Comprueba el `alcance`: si es
   `tiradaId`, ¿el id coincide EXACTAMENTE con el de la tirada en
   `TIRADAS`? Si es `modo`, ¿la tirada tiene de verdad una condición
   `"modo"` y el texto está contenido en la etiqueta de la opción elegida?
   Puede que el id apunte a una tirada que aún no existe (ver sección 5) —
   eso no es un bug, es una regla pendiente de aclarar.

## 8. `CondicionTirada` y texto informativo en tiradas fijas de `TIRADAS`
   (2026-09-21, **construido 2026-09-23**)

Detectado durante el repaso de efectos especiales de equipo
(`docs/equipo-efectos-especiales.md`), al intentar enganchar el Visor Nocturno/
Térmico a `alerta_activa` ("Buscar / percibir"). El usuario lo generalizó: en
cuanto lleguen dotes, poderes psiónicos y aumentos (Fase 5, `docs/tareas.md`),
van a necesitar el mismo tipo de enganche a tiradas fijas — no solo equipo.

**Lo que ya está resuelto, no hace falta tocarlo:** el mecanismo 4 de la sección 2
(`Modificador` tipo `"tirada"` con `alcance`) ya es genérico y ya llega a
cualquier tirada fija por su `tiradaId`/`grupo`/`habilidad`/`modo`, venga de
donde venga (`modificadoresActivos(sheet)`, `derivados.ts:24`). El día que exista
`modificadoresDeDotes(sheet)` o `modificadoresDePoderes(sheet)`, se añaden a esa
misma lista y ya está — cero cambios en `tiradas.ts`, `combate.ts` o el modal.

**Lo que falta, confirmado con casos reales de esta sesión:**

1. **`CondicionTirada` (mecanismo 1) solo se recoge hoy por arma concreta** —
   `condicionesDeMejoras(sheet, instanciaId)` recorre mejoras instaladas en ESA
   arma. No existe ningún `condicionesActivas(sheet, tiradaId)` simétrico a
   `modificadoresActivos` para una tirada fija de `TIRADAS`. Sin eso, no se puede
   mostrar "¿qué visor llevas puesto?" como opción de `alerta_activa` — la tirada
   fija no sabe mirar el equipo del personaje en absoluto hoy.
2. **El "texto informativo condicionado" no es ninguno de los 4 mecanismos** —
   la necesidad, detectada varias veces esta sesión (Mangual: "Bloqueo"/"ignora
   Cobertura" en modo Estándar; Kerzul: "Ignora N de blindaje"; Visores: "ves a
   través del humo"), es mostrar una nota de texto en el Marcador **sin sumar
   ningún número** — puramente informativa, condicionada a qué opción/modo esté
   elegido. Hoy cada caso se resolvería a mano, sin patrón común.

**Ojo, esto NO significa "unificar los 4 mecanismos en uno"** — la sección 2 ya
explica por qué se mantienen separados a propósito (cada uno resuelve una
pregunta distinta, forzarlos a converger no compensa la ceremonia). Por eso se
**extendió el mecanismo 1** con el mismo `alcance` que ya usa el mecanismo 4, en
vez de inventar un quinto sistema paralelo.

**Por qué importaba el momento**: al construirse antes de que arranque la Fase
5, dotes/poderes/aumentos se construyen sobre una pieza central ya resuelta, en
vez de que cada uno se invente su propio enganche suelto — el mismo patrón ad
hoc que se había repetido esta sesión con Mangual, Kerzul y los Visores.

### Cómo quedó construido

- **`CondicionTirada`** (`condiciones.ts`) gana `alcance?: AlcanceModificador`
  (las 3 variantes) y `nota?: string` (`toggle` y cada `OpcionCondicion`). Sin
  `alcance`, se comporta exactamente igual que siempre — cero cambios para lo
  que ya existía (Bípode, Sistema de Retroceso...).
- **`condicionesActivas(sheet, ctx)`** (`equipo.ts`), simétrica a
  `modificadoresDeEquipo`: recorre `sheet.equipo`, filtra a `mejoraEstandar`/
  `subsistema`/`herramienta` (excluye `mejoraArma` a propósito — esa familia ya
  se recoge por instancia de arma en `condicionesDeMejoras`, sin `alcance`, y
  mezclar las dos rutas duplicaría la condición si algún día una mejora de
  arma también declarase `alcance`), y se queda con las condiciones cuyo
  `alcance` matchea vía `alcanzaA()` (exportada de `modificadores.ts`, misma
  lógica que ya usaba `Modificador`, sin duplicarla).
- **`TiradasTab.tsx`**: un helper `conCondicionesDeEquipo(tirada)` mezcla
  `condicionesActivas(sheet, ctx)` en CUALQUIER tirada (ataques, herramientas,
  y las fijas de `TIRADAS`) antes de renderizarla — ninguna de las tres sabe
  que esto existe. `TIRADAS` en sí sigue siendo el array estático de siempre;
  no hizo falta moverlo a una función sheet-aware como se pensó al principio.
- **`TiradaModal.tsx`**: el texto de `nota` se pinta **en el propio modal**
  (bajo el toggle/la opción activa), no en el Marcador tras tirar — es donde
  el jugador ya está mirando mientras decide, y evita tener que arrastrar la
  nota por el histórico de tiradas.
- **Dos casos reales migrados**, ambos sobre `alerta_activa`: Visor Nocturno
  nivel 2 y Visor Térmico nivel 1 (`catalog/equipo.ts`) — los dos con
  `valorActivo: 0`, solo la nota, porque los números de verdad (cobertura -2,
  percepción -3) siguen sin poder auto-aplicarse (el motor no rastrea
  distancia real ni "dentro/fuera del gradiente").
- Sin cambios de schema/DB, sin dependencias nuevas. Tests en
  `equipo.test.ts` (`describe("condicionesActivas")`). 322 tests, lint y
  `tsc --noEmit` limpios.

**Pendiente, ahora que la pieza central existe — es migración de datos, no
arquitectura**: Mangual (Bloqueo/ignora Cobertura, bloqueado además por la
pregunta 31), Camuflaje Trifásico (`sigilo`/`defensa`), y cualquier caso nuevo
de Fase 5.

**Sin decidir, sin construir** — pendiente de una sesión de diseño dedicada, no
de esta tarea de diagnóstico. Ver también `docs/equipo-efectos-especiales.md`
§"Control de subtareas independientes".

### El modelo mental: "todo lo que no es la ficha en sí es equipo en otro sitio"

Idea del usuario (2026-09-21), y no es solo una metáfora — ya está así en el
código, solo que nadie lo había puesto en estos términos. Equipo, Estados, y lo
que traiga la Fase 5 (Dotes, Poderes, Aumentos) son la misma forma de cosa vista
desde ángulos distintos: algo que se **activa/desactiva sobre la ficha** (el
jugador equipa un arma, el máster aplica un estado, algo que se elige en algún
sitio) y que, mientras está activo, **aporta cosas a las tiradas**. La única
diferencia real es **quién decide activarlo/desactivarlo**:

- **Equipo**: el jugador, desde la Tienda (`equipar`/`desequipar`).
- **Estados**: el máster, desde la consola de combate (`aplicarEstadoAction`,
  `master/combate/actions.ts:360`) — con duración en vez de ranura, pero el
  mismo gesto de "esto está puesto ahora mismo".
- **Dotes/Poderes/Aumentos** (Fase 5, sin construir): previsiblemente el
  jugador al crear personaje o al conseguirlos en partida — mismo patrón otra
  vez.

Prueba de que esto no es una idea nueva sino una descripción de lo que ya hay:
`modificadoresDeEstados()` (`estados.ts:125`) lleva el comentario **"calcado de
`modificadoresDeEquipo()`"**, y `TiradasTab.tsx:294` ya mezcla los dos en el
mismo array antes de pasarlo a la tirada: `[...modificadoresActivos(sheet),
...modificadoresDeEstados(estadosCombate)]`. Dotes/Poderes/Aumentos serían un
tercer (cuarto, quinto) `...modificadoresDeX(sheet)` en esa misma lista — el
lado numérico ya está preparado para esto sin cambios, es el problema del §8
de arriba (`CondicionTirada` + texto) el que falta generalizar igual.

```
                              ┌─────────────────┐
                              │      TIRADA      │   (TiradaModal.tsx)
                              └────────┬─────────┘
                                       │
                    recibe, ya mezclados en un único array
                                       │
        ┌──────────┬──────────────────┼──────────────────┬──────────┐
        │          │                  │                  │          │
    ┌───▼───┐  ┌───▼────┐        ┌────▼────┐        ┌────▼───┐  ┌───▼────┐
    │Especie│  │ Equipo │        │ Estados │        │ Dotes  │  │Poderes/│
    │       │  │(jugador,│       │(máster, │        │(Fase 5,│  │Aumentos│
    │       │  │ Tienda)│        │ consola)│        │  sin   │  │(Fase 5,│
    │       │  │        │        │         │        │construir)│construir)│
    └───┬───┘  └───┬────┘        └────┬────┘        └────┬───┘  └────┬───┘
        │          │                  │                  │           │
        └──────────┴──────────────────┴──────────────────┴───────────┘
                                       │
                   cada fuente puede aportar 3 cosas a una tirada:
                                       │
       ┌───────────────────────┬──────┴───────────────────┬───────────────────────┐
       │                       │                           │                       │
┌──────▼───────────┐  ┌────────▼─────────────┐   ┌─────────▼──────────────────────┐
│ Modificador       │  │ CondicionTirada        │   │ Texto informativo              │
│ numérico          │  │ (opción/toggle/contador)│   │ (nota, sin número)             │
│ (bono/penalizador  │  │ elegida por el jugador  │   │                                 │
│  a la dificultad) │  │ al tirar                │   │                                 │
│                   │  │                         │   │                                 │
│ ✅ YA GENÉRICO      │  │ ❌ solo funciona hoy si  │   │ ❌ sin mecanismo formal —         │
│ (mecanismo 4,     │  │  la tirada la genera    │   │ hoy cada caso es ad hoc          │
│  sección 5, con   │  │  combate.ts para un arma │   │ (arma.efectos/especial → nota   │
│  alcance)         │  │  concreta (mecanismo 1) │   │  a mano, distinto por familia)  │
└───────────────────┘  └─────────────────────────┘   └─────────────────────────────────┘
```

**Qué falta, en una frase**: los dos mecanismos de la derecha del diagrama solo
saben mirar equipo-de-un-arma-concreta hoy — necesitan aprender a mirar
"cualquier fuente activa sobre la ficha, para cualquier tirada", igual que ya
sabe hacerlo el modificador numérico. Ese es el diseño pendiente del §8.

**Límite adicional, no un "falta construir" — un "no puede", confirmado con la
Cobertura/Camuflaje Trifásico (`docs/equipo-efectos-especiales.md` §Subsistemas,
2026-09-21):** los tres canales de arriba solo alcanzan la tirada de **quien lleva
puesta la fuente**. No existe ni en teoría un "alcance: objetivo" — algo que suba
la dificultad de la tirada de OTRO personaje (un atacante, alguien que te busca)
por llevar tú algo puesto. Es consecuencia directa de que `Tirada` no tiene campo
de objetivo. Cualquier diseño que salga de este §8 debería decidir explícitamente
si esto se queda fuera para siempre (coherente con "la app informa, no arbitra":
esos casos se informan en la tirada del PROPIO portador, como recordatorio para
que el máster se lo aplique al de enfrente, nunca en la tirada ajena) o si en
algún momento compensa modelarlo — no es una limitación técnica accidental, es la
misma que hace que el motor no pueda enganchar nada a un "objetivo" en absoluto.

### Nota (2026-09-22): variables transversales vs. de un solo consumidor

Idea del usuario, con un matiz importante. Hay campos del catálogo que solo
alimentan una cosa (`danio` solo sirve para la tirada de daño) y otros que varias
piezas distintas del motor querrían leer a la vez (`pesoKg`, ya usado por Carga
Transportable, y previsiblemente por más cosas el día de mañana). Al diseñar
nuevos campos para Dotes/Poderes/Aumentos (Fase 5), o al extender el mecanismo del
§8, merece la pena preguntarse cuál es cada campo nuevo — no para que cada pieza
lleve una lista fija de "variables importantes", sino para no duplicar en tres
sitios distintos algo que debería ser un único campo compartido.

**Disciplina a mantener, ya establecida en el propio catálogo**: no formalices un
campo nuevo (tipo, enum, lo que sea) hasta que haya un **segundo consumidor real**
— mismo criterio que ya usa Exoesqueleto ("se queda sin mecanizar a propósito...
hasta que aparezca un segundo caso que justifique generalizarlo"). Ejemplo de
cuándo SÍ toca generalizar: `célula` (Subsistema: cargas/recarga/coste) y
`cargador` (ArmaFuego: solo un número) ya son dos formas distintas resolviendo lo
mismo sin que nadie las una — eso ya pasó el umbral, hoy. Ejemplo de cuándo
esperar: "tamaño" no existe como campo tipado en ningún sitio del catálogo hoy —
solo la propuesta "Ocultar objeto" lo necesitaría, un único consumidor — mejor
esperar a un segundo caso real que adivinar la forma (¿enum? ¿número?) sin
evidencia. **El usuario está de acuerdo con esto para "tamaño" en concreto.**

**Matiz aparte (2026-09-22): `required` en el validador de TypeScript no es lo
mismo que "formalizar el campo ahora".** La propuesta del usuario es marcar como
obligatorios (no `T | null` opcional) los campos que **el documento SÍ da** pero
que alguien podría saltarse al transcribir — buena disciplina, sin relación con
"esperar a un segundo consumidor" (eso es sobre inventar campos nuevos, esto es
sobre no perder datos que ya existen). Ojo con la línea: `pesoKg` ya está bien
resuelto así (`null` reservado para cuando el documento de verdad no dice nada,
nunca para "no me molesté en poner el número" — ver cabecera de
`armasMelee.ts`). Pero forzar `required` en un campo que **no existe en el
documento en absoluto** (como "tamaño" hoy) obligaría a inventar un valor en las
~80 piezas del catálogo sin ninguna base textual — eso sí choca con la norma que
ya sigue el proyecto en todo lo demás (los datos inventados se marcan como
supuesto numerado, `sistema.md` S1-S17, no se cuelan silenciosos por todo el
catálogo). Regla práctica: `required` para lo que el documento da y se podría
saltar por descuido; campo opcional + supuesto numerado para lo que de verdad
hay que inventar.

### Nota (2026-09-23): "Tiradas" vs. "Acciones" — el cuarto concepto tiene nombre

Idea del usuario, surgida al mirar Malla Plasmática. Ya habíamos chocado con esto
sin nombrarlo: la Conversión Psiónica de Derivación Psiónica (ayer) no encajaba en
numérico/condición/texto porque **no modifica una tirada, es una declaración de
gasto de recurso sin dado de por medio**. Malla Plasmática da dos casos más del
mismo patrón: **activarla** (gastas 1 carga, no tiras nada, pero desde ese momento
tienes -8 a `sigilo` mientras dure) y **sacrificar 2 puntos del colchón** para sumar
daño de plasma a un golpe melee (se declara antes de tirar, no es la tirada en sí).

Propuesta del usuario: dejar de pensar en "Tiradas" como el contenedor de todo lo
que pasa en combate/acciones, y pensar en **Acciones** como el contenedor —
**algunas Acciones tiran dados (las Tiradas de hoy) y otras no** (declarar un gasto
de recurso, activar algo, sacrificar parte de un colchón). Encaja con el modelo
mental de la nota de arriba ("todo lo que no es la ficha en sí es equipo en otro
sitio"): una Acción-sin-dado es exactamente el mismo tipo de "fuente que se
activa/desactiva" que ya describe ese modelo, solo que su efecto no es un bono a
una tirada — es un cambio de estado (gastar recurso, activar un modo) que **luego**
sí puede alimentar a otras Tiradas (el -8 a sigilo, condicionado a que la Malla
esté activa, es un `Modificador` normal una vez declarada la activación).

**No construir todavía** — mismo problema del §8 de arriba, ampliado: el diseño
pendiente ya no es solo "`CondicionTirada` y texto en tiradas fijas", es también
"qué es una Acción, y cuáles de ellas tiran dado". Casos reales acumulados para
cuando se diseñe: Conversión Psiónica, activar/sacrificar de Malla Plasmática, y
presumiblemente la mayoría de RECURSOS (gastar munición, cargar un poder).
