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
  | { tipo: "modo"; contieneEtiqueta: string };       // solo si el modo elegido la contiene ("F. Auto")
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

**Ojo con inventar el alcance de algo que no está claro en las reglas.**
Varios de los 31 modificadores migrados con este mecanismo apuntan a un
`tiradaId` que **todavía no existe** (`poder_psionico`,
`resistir_metasensoria`, `salv_ceguera_destello`...) porque esa tirada no
está implementada o el documento no dice qué salvación la cubre. Eso es
correcto: el modificador se calcula, no encuentra destino, y no aporta nada
— ni de más ni de menos — hasta que la tirada exista o se aclare la regla.
**No le asignes un `tiradaId` que exista solo para que "haga algo"**: eso
sería inventar una regla, y aquí no se hace (ver `docs/handoff.md` §4).

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
