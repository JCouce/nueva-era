# Cómo enganchar un elemento nuevo a una Acción — la guía práctica

**Este es el documento que abres cuando llega el momento de implementar un Poder,
Dote o Aumento de verdad** (o cualquier pieza de capa 1 nueva), después de haber
leído `docs/motor.md` y decidido su `MotorMetadata`. `motor.md` responde "¿qué
tipo de efecto es esto?" — este documento responde "¿y ahora cómo lo escribo?".

## Antes de nada: ¿este documento es para ti, o necesitas otro?

Un Poder puede conectar al motor de tres formas distintas — mira su
`MotorMetadata` (`motor.md`) y sigue el camino que le toque:

| Si su `MotorMetadata` dice... | Vas a... |
|---|---|
| `tipo: "numerico"` o `tipo: "texto"`, `afecta.modo: "accion_existente"` | **Sigue leyendo este documento** — es justo lo que cubre: elegir uno de los cuatro mecanismos y declararlo. |
| `tipo: "accion"`, `mecanismo: "accion_equipo"` (o `"accion_sin_equipo"`, construido para poderes psiónicos en `src/lib/rules/poderes.ts`) | Este documento NO lo cubre. Es el patrón del registro `familia → generador` en `src/lib/rules/combate.ts` (T5/T6, `docs/motor.md` §Escalabilidad) — hoy sin guía propia escrita, lee ese código directamente antes de replicarlo. |
| Una "Acción sin dado" (declarar un gasto, activar algo sin tirar) | Ninguno de los dos documentos lo cubre — está sin diseñar. Ver la nota final de este documento ("Tiradas vs Acciones") antes de improvisar algo. |

Si tu Poder hace VARIAS cosas a la vez (genera su propia tirada Y además da un
+1 a otra Acción mientras está activo), es normal acabar usando este documento
para una parte y el patrón de `combate.ts` para la otra — no es ni/o.

---

**`docs/motor.md` es el documento marco** (los cinco tipos de modificador que
puede ser cualquier elemento de la ficha, capa 1/2/2.5). Este documento es el
detalle técnico de uno solo de esos cinco tipos — el numérico y el de
texto/condición, cuando afectan a una Acción que ya existe — y de los cuatro
mecanismos de entrega que ya existen para ellos. Léelo entero antes de añadir
el primero: son diez minutos y evita reinventar uno de los cuatro mecanismos
que ya existen.

Documento técnico, no de reglas (eso es `sistema.md`).

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
    → modificadorAccion() (acciones.ts) llama a aplicado() / valorEfectivo() (derivados.ts)
      → estas llaman a modificadoresActivos(sheet) con el sheet YA actualizado
        → que recorre especie + modificadoresDeEquipo(sheet)
          → que recorre TODO el equipo (armadura, arma, mejoras, subsistemas, movimiento) sin distinción
```

**Consecuencia práctica: si añades un `Modificador` de tipo `"atributo"`,
`"derivado"` o `"habilidad"` en el catálogo (a una mejora, una armadura, lo
que sea), llega solo a todas las tiradas que usen ese atributo o esa
habilidad. No hay que tocar `acciones.ts` ni `combate.ts` ni el modal.** Este
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

Los cuatro se suman en un solo sitio, `montarTirada` (§10), y se pintan en el
bloque **"// Desglose"** de `AccionModal` (`src/components/AccionModal.tsx`), una
línea por cada uno, con su fuente. Nunca se funden en silencio dentro de otro número — si lo
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
   (`ControlCondicion` en `AccionModal.tsx`), y `combate.ts` ya recoge las
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
  | { tipo: "grupo"; grupo: GrupoAccion }             // todas las de un grupo (Salvaciones, Acciones...)
  | { tipo: "habilidad"; habilidad: HabilidadId }     // cualquier tirada que use esa habilidad
  | { tipo: "grupoHabilidad"; grupo: GrupoAccion; habilidad: HabilidadId } // las de ese grupo con esa habilidad
  | { tipo: "modo"; contieneEtiqueta: string }        // solo si el modo elegido la contiene ("F. Auto")
  | { tipo: "familiaArma"; familia: FamiliaArma; empleo?: EmpleoArma } // tiradas de arma de esa familia (D2b-1)
  | { tipo: "aplicado"; aplicados: AplicadoId[] }     // tiradas con uno de esos aplicados (A2b)
  | { tipo: "todas" };                                // cualquier tirada, sin excepción
```

`bonoAlcance()`/`desgloseAlcance()` (mismo fichero) resuelven cuál le toca a
una tirada dada, con un `ContextoAccion` que la UI arma sola (id, grupo,
habilidad de la tirada, y el modo que esté elegido ahora mismo en el modal,
si lo tiene). Los resuelve `montarTirada` (§10) con los modificadores de la
`FichaResuelta` — no hay que tocar nada por cada modificador nuevo, solo
declararlo en el catálogo con el alcance correcto.

**Cuál elegir:**
- `tiradaId` → para salvaciones y otras tiradas fijas de `ACCIONES` (no sirve
  para las de ataque generadas por `combate.ts`, que tienen id por
  instancia — para esas, `ajustesFijos`/`bonosTramo`/`condiciones` son más
  precisos y ya existen).
- `grupo` → para algo que afecte a todo un grupo por igual (raro: casi
  siempre se quiere una tirada o una habilidad concretas, no el grupo
  entero — usarlo mal sobre-aplica el bono).
- `habilidad` → para algo que ayude en cualquier tirada de esa habilidad,
  sea cual sea el arma o el contexto.
- `grupoHabilidad` → cuando la regla dice "ataques con X": las tiradas de
  ese grupo que usen esa habilidad, y ninguna otra. Caso real: el −1 a
  distancia del Arköru (grupo `Ataques` + Combate a Distancia), que con
  `habilidad` a secas caía también en "Iniciativa (desenfundando)", que usa
  Combate a Distancia pero no es un ataque. En el índice de casillas va con
  las de su habilidad y la consulta descarta las de otro grupo
  (`consultaIndiceCondiciones`, `equipo.ts`).
- `modo` → solo tiene sentido en una tirada de ataque con condición "modo"
  (el Sistema de Retroceso, que solo ayuda en F. Auto). **Limitación
  conocida:** no distingue por tipo de arma — el documento dice que en
  ametralladoras el Sistema de Retroceso ayuda en *cualquier* modo, y este
  alcance no lo captura (ver el comentario en su entrada del catálogo).
- `familiaArma` → las tiradas generadas por arma de una familia (`Accion.familiaArma`, la
  pone `combate.ts`: ataque melee, disparo, pesado, lanzar, bloquear, levantar escudo), y
  con `empleo` solo las de un arma a una/dos manos. Lo usan las dotes (D2b-1). En el
  índice de casillas va por familia; el empleo lo filtra la consulta.
- `aplicado` → "pruebas que usen perspicacia, voluntad o expresión" (aumentos, A2b): cualquier
  tirada con ese aplicado, salvaciones y poderes incluidos. **Vale el aplicado con el que se
  tira de verdad**, no el de la ficha de la tirada: `montarTirada` pone
  `ContextoAccion.aplicado` tras Sutil y tras una casilla con `aplicado` (Negociación
  Analítica), y ahí casa el `Modificador`. Las casillas se recogen antes, en
  `consultaIndiceCondiciones`, con `ContextoAccion.aplicadosPosibles` (el de la tirada, el de
  Sutil y el de cualquier casilla que lo cambie: `aplicadosPosibles` en `textosTirada.ts`);
  las que no casan con el de verdad se quedan en el modal sin efecto
  (`TiradaMontada.casillasSinEfecto`, con el motivo). Los textos (`DestinoTexto` admite
  `aplicado` y `grupo`) salen si casa alguno de los posibles. Fuera de `montarTirada` (sin
  aplicado en el contexto) no casa nunca.
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
3. **UI** (`src/components/AccionModal.tsx`, `ControlCondicion`): ve un
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
   `ACCIONES`? Si es `modo`, ¿la tirada tiene de verdad una condición
   `"modo"` y el texto está contenido en la etiqueta de la opción elegida?
   Puede que el id apunte a una tirada que aún no existe (ver sección 5) —
   eso no es un bug, es una regla pendiente de aclarar.

## 8. `CondicionTirada` y texto informativo en tiradas fijas de `ACCIONES`
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
misma lista y ya está — cero cambios en `acciones.ts`, `combate.ts` o el modal.

**Lo que falta, confirmado con casos reales de esta sesión:**

1. **`CondicionTirada` (mecanismo 1) solo se recoge hoy por arma concreta** —
   `condicionesDeMejoras(sheet, instanciaId)` recorre mejoras instaladas en ESA
   arma. No existe ningún `condicionesActivas(sheet, tiradaId)` simétrico a
   `modificadoresActivos` para una tirada fija de `ACCIONES`. Sin eso, no se puede
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
- **`AccionesTab.tsx`**: un helper `conCondicionesDeEquipo(tirada)` mezcla
  `condicionesActivas(sheet, ctx)` en CUALQUIER tirada (ataques, herramientas,
  y las fijas de `ACCIONES`) antes de renderizarla — ninguna de las tres sabe
  que esto existe. `ACCIONES` en sí sigue siendo el array estático de siempre;
  no hizo falta moverlo a una función sheet-aware como se pensó al principio.
- **`AccionModal.tsx`**: el texto de `nota` se pinta **en el propio modal**
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

**Actualizado 2026-09-24 — `condicionesActivas()` ya no es el camino real:**
seguía recorriendo `sheet.equipo` entero POR CADA tirada mostrada (`.map()`
sobre todas las de ataque/herramientas en la pestaña) — cuello de botella real
documentado en `docs/motor.md` §Escalabilidad. Se sustituyó por
`indiceDeCondiciones(sheet)` + `consultaIndiceCondiciones(indice, ctx)`
(`lib/rules/equipo.ts`): el índice se construye UNA VEZ (Map exacto por
`tiradaId` + listas para `grupo`/`habilidad`/`todas`, con el mismo criterio de
`alcanzaA()` de siempre), y cada tirada solo consulta. Devuelve exactamente lo
mismo que `condicionesActivas()` — verificado con test de equivalencia antes de
sustituir el call site — así que todo lo de arriba (qué familias cubre, qué
excluye, cómo se dibuja) sigue siendo cierto, solo cambió el cómo se calcula.
`condicionesActivas()` se queda en el código, sin uso real, con su test.

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
`modificadoresDeEquipo()`"**, y `AccionesTab.tsx:294` ya mezcla los dos en el
mismo array antes de pasarlo a la tirada: `[...modificadoresActivos(sheet),
...modificadoresDeEstados(estadosCombate)]`. Dotes/Poderes/Aumentos serían un
tercer (cuarto, quinto) `...modificadoresDeX(sheet)` en esa misma lista — el
lado numérico ya está preparado para esto sin cambios, es el problema del §8
de arriba (`CondicionTirada` + texto) el que falta generalizar igual.

```
                              ┌─────────────────┐
                              │      ACCIÓN       │   (AccionModal.tsx)
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
│ ✅ YA GENÉRICO      │  │ ✅ genérico para equipo, │   │ ✅ FORMALIZADO           │
│ (mecanismo 4,     │  │  desde el §8 de abajo   │   │ (mecanismo `nota_fija`,         │
│  sección 5, con   │  │  (indiceDeCondiciones,  │   │  docs/motor.md) — 2026-09-24   │
│  alcance)         │  │  2026-09-24)            │   │                                 │
└───────────────────┘  └─────────────────────────┘   └─────────────────────────────────┘
```

**Actualizado 2026-09-24 — este diagrama describía un problema que ya se cerró:**
cuando se escribió (2026-09-22), los dos mecanismos de la derecha no sabían mirar
más que el equipo de un arma concreta, y el texto informativo no tenía mecanismo
con nombre. Los dos se resolvieron: `CondicionTirada` con `alcance` llegó a
cualquier tirada para equipo (`mejoraEstandar`/`subsistema`/`herramienta`, §8 de
abajo), y el texto informativo incondicional se formalizó como mecanismo
`nota_fija` en `docs/motor.md` al rellenar `MotorMetadata` sobre el catálogo
entero (2026-09-23/24) — es exactamente el mismo patrón que `arma.efectos`/
`especial` ya usaban, solo que ahora tiene nombre y está declarado pieza a pieza.

**Lo que SIGUE pendiente, más acotado que antes**: los tres canales de arriba
solo miran `sheet.equipo` — ninguno mira todavía `sheet.poderes`/`sheet.dotes`/
lo que traiga Fase 5. `src/lib/rules/capa1.ts` (`fuentesDeCapa1`, 2026-09-24) es
el punto de extensión pensado para el día que exista una segunda fuente, pero
hoy solo envuelve `sheet.equipo` — nadie lo consume todavía. Cuando llegue Fase
5, ese es el sitio donde sumar las fuentes nuevas, no un mecanismo nuevo.

**Límite adicional, no un "falta construir" — un "no puede", confirmado con la
Cobertura/Camuflaje Trifásico (`docs/equipo-efectos-especiales.md` §Subsistemas,
2026-09-21):** los tres canales de arriba solo alcanzan la tirada de **quien lleva
puesta la fuente**. No existe ni en teoría un "alcance: objetivo" — algo que suba
la dificultad de la tirada de OTRO personaje (un atacante, alguien que te busca)
por llevar tú algo puesto. Es consecuencia directa de que `Accion` no tiene campo
de objetivo.

**Decidido 2026-09-24, ya no queda abierto:** en `docs/motor.md`, `afecta.modo:
"objetivo_tercero"` es **siempre** tipo "texto" — esto SÍ se queda fuera para
siempre, no es un "pendiente de construir". La app nunca calcula ese número
aunque la regla original traiga uno (la cobertura del Escudo, +1 a +4): llega
como una frase que un jugador y el máster se dicen en mesa, nunca como una suma
de la app — "informa, no arbitra" hasta el final, no solo como parada intermedia.
Las piezas con este patrón (Escudos, Camuflaje Trifásico, Malla Plasmática,
Compartimento Oculto...) cuelgan la nota de la tirada del propio portador, igual
que ya hacían Visor Nocturno/Térmico.

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

**Actualizado 2026-09-24 — el nombre ya cambió, el diseño de fondo sigue sin
construir.** El rename de "Tiradas" a "Acciones" en todo el código (tipo
`Tirada`→`Accion`, `tiradas.ts`→`acciones.ts`, la pestaña, el modal...) se hizo
como limpieza (N2, `docs/motor.md` §Escalabilidad) — pero es **solo el nombre**.
Sigue sin existir una forma de representar una Acción sin dado: `Accion`
(antes `Tirada`) sigue implicando "aplicado + habilidad + d12 contra dificultad"
siempre. Conversión Psiónica, el activar/sacrificar de Malla Plasmática, y el
gasto de RECURSOS siguen sin poder vivir en esta lista — el rename deja el
nombre ya preparado para el día que se diseñe esto, no lo adelanta.

## 9. `Modificador` tipo `"disciplina"`: sube un nivel, no toca ninguna tirada

*(2026-10-13, especies E2b: Resonancia +1 del Arianyi, `docs/sistema.md` §14.6.)*

```ts
{ tipo: "disciplina"; id: DisciplinaId; valor: number }
```

**Qué es.** Un bono al **nivel** de una disciplina psiónica. No es un bono a una tirada:
no pasa por `bonoAlcance`/`desgloseAlcance` ni aparece en el desglose del modal. Lo que
cambia es el nivel con el que la ficha juega esa disciplina, y de ahí cuelga todo lo
demás (qué poderes salen en Acciones, su fila de la tabla, los "desde nivel X", los bonos
por nivel en tiradas fijas, Levitar…).

**Cómo se resuelve.** `resolverFicha` suma los modificadores de este tipo
(`bonosDeDisciplina`, `psionica.ts`) y expone por disciplina, en
`FichaResuelta.psionica.disciplinas[id]`:

| Campo | Qué es | Quién lo mira |
|---|---|---|
| `comprado` | lo que guarda la ficha (`sheet.psionica`) | coste, tope de 6, XP: la compra |
| `bono` | la suma de los modificadores `"disciplina"` | la pista "2 (1 + 1 especie)" (`textoNivelDisciplina`) |
| `efectivo` | comprado + bono, **también con 0 comprado**; puede pasar de 6 | requisitos entre disciplinas (`cumpleRequisito`, `sueloPorRequisitos`, `setNivelDisciplina`, `requisitosRotos`) |
| `paraEfectos` | `min(efectivo, 6)` | todo lo que resuelve un poder o un bono por nivel |

`FichaResuelta.psionica.paraEfectos` es el mapa de `paraEfectos` que reciben
`accionesDePsionica`, `conPsionicaEnTiradaFija`, `levitacion`/`conEsquivaLevitando`,
`prepararPoder` (`niveles`) y `fuentesDeCapa1`. Ninguno lee `sheet.psionica` por su cuenta:
un 7 cumple cualquier "desde nivel X" y usa la fila del 6 de las tablas. La sobrecarga
usa el nivel empleado del poder, que ya no pasa del poseído (≤ 6).

Los requisitos reciben los bonos por **parámetro obligatorio** (`BonosDisciplina`; en
tests, `SIN_BONOS_DISCIPLINA`), mismo patrón que `AjusteCoste`: en pantalla salen de
`ficha.psionica.bonos`, en el servidor de `bonosDeDisciplina(modificadoresActivos(sheet))`.

**Cuándo usarlo.** Cuando un rasgo, dote o aumento diga "+N a la disciplina X" o "cuenta
como nivel N en X". **No** para "+N a las tiradas de los poderes de X" (eso es un
`Modificador` `"tirada"` con alcance `grupo: "Psiónica"`, §5) ni para descuentos de coste
(eso es `AjusteCoste`, `progresion.ts`).

## 10. Montaje: `montarTirada`

*(2026-10-13, M1a — propuesta-especies §3.1.)* **El único sitio que suma una tirada.**
`src/lib/rules/montaje.ts`:

```ts
montarTirada(ficha: FichaParaTirada, tirada: Accion, eleccion: EleccionTirada): TiradaMontada
tirarMontada(montada: TiradaMontada, dado: number, dificultad: number | null): Resultado
eleccionSinTocar(tirada: Accion, sutil?: boolean): EleccionTirada
// EleccionTirada = { sutil, estadoCondiciones, circunstancial }
// eleccionSinTocar: las casillas en su estado inicial (estadoInicial), sin circunstancial
// La especialidad no se elige: la nombra la tirada (habilidadEntera, docs/sistema.md §3)
```

`FichaParaTirada` es `Pick<FichaResuelta, "ficha" | "modificadores">`: la pantalla pasa la
`FichaResuelta`; `prepararPoder` arma el par con lo que recibe.

Qué devuelve y dónde entra cada mecanismo:

| Campo | Qué es |
|---|---|
| `aplicado`, `habilidad` | `modificadorAccion` (con Sutil y especialidad de la elección) |
| `ajustesFijos` | los de la tirada, tal cual |
| `base` | aplicado + habilidad + ajustes fijos |
| `modificador` | base + `Modificador` con alcance (umbrales de §7 incluidos) + `CondicionTirada` + `bonosTramo` (el `modificador` del `Resultado`). Montada con `eleccionSinTocar`, **lo que enseña la fila**: el mismo número que el modal recién abierto (M1b) |
| `total` | modificador + circunstancial: el "Tirar (+N)" del modal |
| `desglose` | una línea por fuente, en este orden: aplicado, habilidad, ajustes fijos, alcance, casillas, tramos, circunstancial (si ≠ 0) |
| `margenes` | `{ criticoExito, criticoFallo }`, por defecto `MARGEN_CRITICO` (6) |
| `notas`, `modoElegido` | `notasCondiciones` y la etiqueta del modo elegido (para el alcance `modo`) |

**Los márgenes son dato de la casilla, no código de pantalla.** `OpcionCondicion` y el
`toggle` llevan `margenCriticoExito?`; `montarTirada` lo toma de cualquier opción elegida o
toggle activo, y con varios gana el más bajo. La VTM nv4 (`medicina.ts`, condición
`vtm_tratamiento`) declara `margenCriticoExito: 0` en "complejo" y cualquier éxito pasa a
crítico; antes era un `if` por id en `AccionesTab`. Los "éxito → crítico" de especie (E4)
son toggles sin número con el mismo `margenCriticoExito: 0`.

Quién lo usa: `FilaTirada` y `FilaPoder` (`modificador`; la de poder vía
`PoderPreparado.montada`, que `prepararPoder` monta con `eleccionSinTocar`),
`AccionModal` (total, desglose y notas en vivo; entrega la montada al tirar), `tirar`, la
salvación de sobrecarga y las tiradas de Fabricar/Reparar (`tirarMontada`). ESLint veta en
componentes `modificadorAccion`, `bonoAlcance`, `desgloseAlcance`, `resolverTirada`,
`valorCondiciones`, `valorBonosTramo`, `desgloseCondiciones` y `desgloseBonosTramo`.

Tests: `montaje-caracterizacion.test.ts` fija lo que montaba cada sitio de la UI antes de
`montarTirada` (réplicas citando archivo:línea) y comprueba que da lo mismo. **Si un
número de ahí cambia, es un bug.** Sus fichas están enteras de vida y fatiga, así que M1b
no movió ninguno: lo que M1b cambia a propósito vive en `umbrales.test.ts`.

**No apilamiento (`noApila`, A2a de aumentos, 2026-10-22).** Un `Modificador` `tirada` o
`derivado`, una casilla `toggle` y un `BonoPorTramo` (vía `NivelModulo.noApila` junto a
`ajusteTramo`) pueden llevar un grupo. `montarTirada` junta lo que entra en la tirada con el
mismo grupo (alcance que casa, casilla marcada, bono en el tramo elegido) y deja solo el
mayor; los demás siguen en el desglose a 0, con "(no se suma con X)". En los derivados lo
hace `bonoDerivado`. Hoy: `vision_aumentada` (Ojo Biónico y Mira Telescópica).

**Ahorro de fatiga (A2b).** Un toggle con `ahorroFatiga` (Mielinización Central) resta ese
número del gasto de fatiga de las casillas marcadas: `costeFatiga` sale neto, sin bajar de 0,
y lo que no encuentra que ahorrar va a `ahorroSinUsar`, que `usarPoder(…, ahorro)` resta del
coste del poder. **Ventaja fija sin casilla:** `Accion.ventaja`, que pone `conExtrasDeFicha`
desde `FichaResuelta.ventajasFijas` (Red Frontoparietal en Iniciativa) si la tirada no trae
otra. **Poderes:** `prepararPoder` consulta el mismo índice de casillas
(`EntradaPoder.indiceCondiciones`).

**Opciones con ventaja y fatiga (A2a).** `OpcionCondicion` lleva también `ventaja`,
`fuenteVentaja`, `costeFatiga` y `partes` (una línea del desglose por fuente). Lo usa el
selector "Contra…" de las salvaciones (`rules/aumentosTiradas.ts`).

**Umbrales de salud y fatiga (M1b, 2026-10-13).** El "−1/−3/−5 a todo" y "−1/−2 a todo"
de §7 no los suma nadie a mano: `resolverFicha` los añade al final de
`FichaResuelta.modificadores` (`modificadoresDeUmbrales`, alcance `todas`, fuente
"Herido", "Exhausto"…), así que entran por el mismo `bonoAlcance`/`desgloseAlcance` que
cualquier otro `Modificador` de tirada, en todas las tiradas y en `prepararPoder`. La
vida/fatiga con la que se calculan es una entrada explícita de `resolverFicha`
(`vitalidad`: la de la ficha fuera de combate; la del `Combatiente` dentro, también para
un NPC en la consola). El daño melee/bayoneta/Sutil (`accionesDeAtaque(sheet, mods)`)
también sale de esos modificadores, con especie y estados.

## 11. Lo que pone la especie en una tirada (E4)

*(2026-10-13, `docs/sistema.md` §14.8 y §14.10.)* La especie no inventa mecanismo: usa los
mismos, con el dato en el rasgo (`catalog/especies.ts`) y resuelto una vez en la
`FichaResuelta` (`rules/especie.ts`).

| Dato del rasgo | Mecanismo | Llega por |
|---|---|---|
| `modificadores` (tipo `"tirada"`) | 4, alcance | `FichaResuelta.modificadores` → `bonoAlcance`, como el equipo (el −1 a distancia del Arköru, alcance `grupoHabilidad`) |
| `casillas: { acciones, condicion }[]` | 1, `CondicionTirada` | `casillasDeEspecie` → **el mismo índice que el equipo** (`indiceDeCondiciones(sheet, deOtrasFuentes)`), con alcance `tiradaId` por cada acción. Id `especie_<rasgo>_<casilla>`, etiqueta con el rasgo detrás |
| `ajusteUmbrales: { salud?, fatiga? }` | 4, alcance `todas` | `FichaResuelta.ajusteUmbrales` → parámetro obligatorio de `modificadoresDeUmbrales` (sin especie, `SIN_AJUSTE_UMBRALES`) |
| `textos: { en, texto, soloEnCritico? }[]` | `nota_fija` | `FichaResuelta.textosTirada` → `conExtrasDeFicha` los suma a `Accion.nota` (o a `efectoCritico`). Destino: una tirada fija por id o los ataques desarmados (`Accion.desarmado`) |
| `notaFarmacos` (E5) | `nota_fija` | `FichaResuelta.notasFarmacos` → parámetro obligatorio de `accionesDeFarmacos` / `accionesDirectasDeFarmacos`, al final de la nota de cada fila (Irota) |
| `peajeNeurologico` (E5) | ninguno: tirada propia | `FichaResuelta.peajeNeurologico` → `usarPoder` devuelve el `peaje`; la tirada es la Salvación de Fortaleza montada con `montarTirada` (`montarPeaje` / `tirarPeaje`, `usoPoder.ts`) |
| `accionSinDado` (E5) | acción sin dado | `FichaResuelta.accionesEspecie` (`AccionDirecta`, con `costeFatiga` opcional) → fila "Usar" en Acciones |

**`conExtrasDeFicha(ficha, tirada)`** (`fichaResuelta.ts`) es lo que antes era el
`conCondicionesDeEquipo` de `AccionesTab`: casillas del índice (equipo y especie) y textos de
especie, para cualquier tirada (fija o generada). La pantalla solo lo llama; ESLint veta en
componentes `consultaIndiceCondiciones`, `casillasDeEspecie`, `textosDeEspecie`,
`ajusteUmbralesDeEspecie` y `modificadoresDeUmbrales`. Ni un `if (especie === …)`: un
rasgo nuevo con casilla es solo dato.
