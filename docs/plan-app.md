# Plan de construcción de la app

Cómo pasar de "documentos de reglas" a "ficha que se usa en mesa", con el sistema todavía a
medio escribir. Acompaña a `docs/sistema.md` (las reglas) y describe **cómo** se implementan.

> **Esto es arquitectura y razonamiento, no estado.** Qué fase está hecha y qué falta vive
> en `docs/tareas.md` — las fases y los "flancos" que este documento enumeraba se movieron
> allí y se actualizan ahí, no aquí.

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

> **Estado (4 sep 2026): hecho.** `SCHEMA_VERSION` va en la ficha y la cadena de migraciones vive
> en `lib/rules/migraciones.ts`. La primera (v1 → v2, la especie deja de ser texto libre) sirvió de
> estreno y está probada de punta a punta: una ficha v1 en la base de datos se lee, se migra, se
> muestra y se vuelve a guardar ya convertida.
>
> Al subir la versión hay que añadir el paso y su test. Si una migración no se puede resolver sin
> decidir algo (¿a qué habilidad van los puntos que sobran?), esa decisión se toma en el paso,
> explícitamente, en vez de dejar que `parseSheet` descarte en silencio.

---

## 3. Razas: lo que importa no son las razas

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

## 4. Cosas a tener en cuenta para cuando llegue la fase 2 / 6b

No son tareas en sí (esas están en `docs/tareas.md`), son consideraciones de diseño que se
detectaron pronto y todavía no se han aplicado porque la ficha viva no está construida:

**Sintéticos.** `COMBATE` distingue resistencia por **Fortaleza** (orgánicos), **Resiliencia**
(sintéticos) y **Estructura** (equipo). Si un jugador puede ser sintético, la ficha no debe
asumir "orgánico" en su modelo cuando se construya el estado en vivo.

**PNJs.** El máster necesitará enemigos con PG y estados. Hoy `Character` asume "personaje de
un jugador". No hay que construirlo antes de que haga falta, pero conviene no cerrarle la
puerta en el modelo cuando llegue la fase 6b.
