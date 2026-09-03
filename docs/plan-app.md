# Plan de construcción de la app

Cómo pasar de "documentos de reglas" a "ficha que se usa en mesa", con el sistema todavía a
medio escribir. Acompaña a `docs/sistema.md` (las reglas) y describe **cómo** se implementan.

---

## 1. El principio: la app asiste, no arbitra

La tentación es implementar el combate entero. Es un error: el sistema se resuelve en mesa con
un narrador, y una app que intente arbitrar acaba peleándose con las decisiones del máster.

Lo que sí quita trabajo real en mesa, por orden de valor:

1. **Saber a cuánto tiro.** El sistema es `1d12 + aplicado + habilidad + modificadores`, y los
   modificadores vienen de todas partes: heridas, fatiga, cobertura, distancia de disparo,
   estados, equipo. Sumarlo a mano cada tirada es el 80% de la fricción.
2. **Llevar la cuenta de lo que baja.** Puntos de golpe, fatiga y estados activos, con sus
   penalizadores aplicados solos.
3. **Tener el catálogo a mano** con lo que llevas equipado y lo que hace.

Todo lo demás (narrativa, dificultades circunstanciales, arbitrar un empate) es del máster.

### Tres capas, sin excepciones

```
CATÁLOGO   datos puros, sin lógica          armas, armaduras, estados, dificultades
   ↓
MOTOR      funciones puras, sin React       ficha + catálogo → números
   ↓
FICHA/UI   pinta lo que el motor devuelve   nunca calcula
```

La regla que ya sigue el código y que no se rompe: **solo se guarda lo que el jugador decide**;
todo lo derivable se recalcula en cada render. Hoy los 6 aplicados, los puntos gastados, la
salud y el movimiento salen así. Lo mismo valdrá para alerta, iniciativa, carga y modificadores
de estado.

---

## 2. ¿JSON fiable? Sí, pero cada cosa en su sitio

| Qué | Dónde vive | Formato | Por qué |
|---|---|---|---|
| **Catálogo** (armas, armaduras, estados…) | `src/lib/catalog/*.ts` | **TypeScript** con `as const` | Los ids se validan al compilar. Si un arma referencia un efecto que no existe, no compila: con 20 estados y 80 objetos, esto ahorra bugs silenciosos. |
| **Reglas numéricas** (dificultades, umbrales, costes) | `src/lib/rules/*.ts` | Constantes exportadas | Una sola fuente; cuando el diseñador cambie un número, se toca en un sitio. |
| **Ficha del personaje** | `Character.stats` (Postgres `Json`) | JSON validado con Zod | Ya funciona así. Permite cambiar el sistema entero sin migrar la base. |

**Si prefieres editar el catálogo sin tocar código**, la alternativa es JSON puro en `src/data/*.json`
validado con Zod al importarlo, más un test que falle si un fichero no cumple el esquema. Cuesta un
poco más de andamiaje y pierdes el autocompletado, pero cualquiera del grupo podría añadir un arma.
Recomendación: **TypeScript ahora**, y JSON el día que alguien que no programa quiera tocarlo.

### Lo que falta y es urgente: versionar la ficha

Las reglas van a seguir cambiando cada semana. Hoy `parseSheet` es tolerante (recorta lo que se
sale de rango, descarta lo que no reconoce), y eso evita que una ficha vieja reviente la página —
pero **descartar en silencio no es migrar**. Si mañana Exploración pasa a ser habilidad, las fichas
existentes deben ganar el campo, no perderlo.

Propuesta: `schemaVersion: number` en el Json y una cadena de migraciones
`migrations[from → to]`, aplicadas al leer. Cada cambio de reglas añade una función de 5 líneas y
un test. Es lo que permite tocar el sistema sin miedo.

> **Estado (3 sep 2026).** El **número de versión ya se escribe** (`SCHEMA_VERSION` en
> `lib/rules/sheet.ts`), porque sin él no se puede saber después de qué versión viene cada ficha.
> Las **migraciones están pospuestas a propósito**: hoy no hay datos que proteger, solo fichas de
> prueba.
>
> **El disparador para hacerlas no es "cuando haya un hueco", es antes de que el grupo cree sus
> personajes.** A partir de ese momento, cada cambio de reglas toca datos que le importan a
> alguien. Si llega un documento nuevo del diseñador antes de eso: se transcribe a los documentos,
> pero no se toca el modelo de datos.

---

## 3. Fases

Tu orden (reglas → habilidades → equipo) es el correcto. Un matiz: las habilidades **ya están**
implementadas; lo que falta entre las reglas y el equipo es la **capa de tiradas** y la **ficha
viva**. Queda así:

| Fase | Qué se construye | Depende de | Estado |
|---|---|---|---|
| **0. Cimientos** | ~~`schemaVersion` escrito · tests del motor · reorganizar `lib/rules/`~~ · **falta: las migraciones** | — | **Hecha, salvo migraciones** |
| **1. Motor de tiradas** | Tabla de dificultades · pares atributo+habilidad · derivados de combate (alerta, iniciativa, defensa) · **chuleta de tiradas** en la ficha · lanzador de d12 con los modificadores ya sumados | Fase 0 | **Se puede hacer ya** |
| **2. Ficha viva** | PG y fatiga actuales · daño por categoría (no letal/letal/grave) · estados activos con sus penalizadores automáticos · gasto de fatiga por +1 · descanso | Decisión 23 (ver abajo) | Bloqueada por una decisión, no por el diseñador |
| **3. Equipo** | Catálogo completo desde `equipamiento.md` · comprar con créditos · equipar · ranuras (subsistemas por armadura, mejoras por arma) · peso y carga | Fases 0-1 · pregunta de carga | Casi lista |
| **4. Razas** | Motor de modificadores + 2 razas placeholder | Fase 1 | **Se puede hacer ya** |
| **5. Poderes, dotes, aumentos** | Lo que el diseñador aún no ha escrito | Documentos | Bloqueada por el diseñador |
| **6. Máster** | Aplicar daño a fichas ajenas · fichas ligeras de PNJ · repartir recursos | Fase 2 | Más adelante |

**Lo importante:** las fases 0, 1 y 4 no dependen del diseñador. Se pueden construir enteras
mientras Murillo escribe especies y poderes.

---

## 4. Razas: lo que importa no son las razas

Dos placeholder está bien, pero el trabajo de verdad no es inventarse dos especies: es construir el
**sistema de modificadores** por el que entrarán cuando lleguen las reales.

Una raza puede hacer casi cualquier cosa: subir un atributo, cambiar un derivado, dar una habilidad
gratis, otorgar un poder, alterar una salvación. Y exactamente lo mismo harán las **dotes**, los
**aumentos** (biónicos y genéticos) y parte del **equipo**. Si cada uno se implementa por su lado,
acabamos con cuatro sistemas que se pisan.

Propuesta: un único tipo de efecto, con la fuente anotada.

```ts
type Modificador =
  | { tipo: "atributo";  id: AtributoId;  valor: number }
  | { tipo: "derivado";  id: DerivadoId;  valor: number }   // PG, fatiga, alerta, movimiento…
  | { tipo: "habilidad"; id: HabilidadId; valor: number }
  | { tipo: "tirada";    contexto: string; valor: number }  // "salvaciones de fortaleza", "sigilo"…

type Fuente = { origen: "raza" | "dote" | "aumento" | "equipo" | "estado"; ref: string }
```

El motor suma todos los modificadores activos y la UI muestra de dónde sale cada uno. Cuando lleguen
las razas reales, son datos nuevos en el catálogo: **cero código**.

Placeholder sugeridos, tomados del material existente: **Humano** (sin modificadores, la referencia)
y **Arkorü** (el material los describe como los del kerzul y la técnica de forja). Así, cuando
lleguen las de verdad, al menos los nombres encajan con la ficción.

---

## 5. Flancos que no estaban en la lista

Salen de revisar los tres documentos contra el código actual.

**a. La decisión que bloquea la fase 2.** ¿La app lleva PG y fatiga **en partida**? Hasta ahora la
ficha es una hoja de creación: guarda decisiones, no estado. Llevar la cuenta significa guardar
estado mutable (daño por categoría, fatiga gastada, estados activos), y con eso vienen concurrencia
(dos personas tocando la misma ficha), historial y "deshacer". Es una decisión tuya y del grupo,
no del diseñador: **¿lleváis la vida en la app o en papel?**

**b. No hay fórmula de capacidad de carga.** El sistema la penaliza (−25% malherido, −50%
moribundo, −25% exhausto) y todo el equipo tiene peso en kg, pero **ningún documento dice cuánta
carga aguanta un personaje**. Sin eso, el peso del catálogo es decorativo. Pregunta para el
diseñador.

**c. No hay tabla canónica de tiradas.** Los documentos citan 14 pares distintos
(`potencia + atletismo` para saltos y derribos, `perspicacia + exploración` para alerta e
iniciativa, `reflejos + atletismo` para defender…) pero de forma dispersa, en prosa. Para la chuleta
de la fase 1 hace falta consolidarlos en una tabla, y eso hay que validarlo con el diseñador porque
algunos pares son inferencia nuestra.

**d. Cero tests.** Hay decenas de fórmulas y 20 estados con cuatro grados de resultado cada uno.
Cada vez que el diseñador cambie un número, algo se romperá en silencio. Los tests del motor son
baratos (funciones puras, sin React ni base de datos) y son lo que permite ir rápido después.

**e. Sintéticos.** `COMBATE` distingue resistencia por **Fortaleza** (orgánicos), **Resiliencia**
(sintéticos) y **Estructura** (equipo). Si un jugador puede ser sintético, la ficha no debe asumir
"orgánico" en su modelo. Conviene saberlo antes de la fase 2, no después.

**f. En mesa puede no haber cobertura.** La PWA instalable ya estaba en pendientes; si la ficha pasa
a llevar la vida en combate (fase 2), deja de ser un capricho.

**g. PNJs.** El máster necesitará enemigos con PG y estados. Hoy `Character` asume "personaje de un
jugador". No hay que construirlo ahora, pero conviene no cerrarle la puerta en el modelo.

---

## 6. Por dónde empezar

Orden recomendado para las próximas sesiones:

1. **Fase 0** entera. Es aburrida y es la que hace que todo lo demás sea seguro.
2. **Fase 1** hasta la chuleta de tiradas. Es lo que hará que el grupo empiece a usar la app en
   mesa de verdad.
3. **Fase 4** (motor de modificadores + 2 razas placeholder), porque es la pieza que necesitan
   dotes, aumentos y equipo para no duplicarse.
4. **Fase 3** (equipo), que es mucho volumen de datos pero poco riesgo.

La fase 2 espera a que decidas si la vida se lleva en la app. Las fases 5 y 6, a que llegue material.
