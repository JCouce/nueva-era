# Encargo: dotes — de la prosa del diseñador al motor

Vas a preparar la entrada de las **dotes** en Nueva Era. Es la tercera área de Fase 5
tras psiónica y especies, y se apoya en lo que ellas dejaron construido.
**No escribas código de la app.** Lo que entregas es la transcripción limpia, el modelado
y una propuesta; el usuario decide después y se construye por tandas.

Este documento recoge lo hablado con el usuario el 2026-10-14. Si al trabajar algo de lo
que dice aquí resulta falso en el repo, **dilo y corrígelo**, no lo arrastres.

---

## 0. La idea en cuatro líneas

- Las dotes son **capa 1** (`docs/motor.md`): una caja más del cajón, junto a especie,
  atributos, habilidades, equipo y psiónica.
- **Todas pasan por el motor**: las pasivas como modificadores que recoge `resolverFicha`;
  las activas generando su propia acción, que se tira con `montarTirada`.
- El trabajo es **traducir → decidir → implementar**. El paso de en medio no se salta.
- Es un área **ancha, no honda**: ~105 piezas, cada una sencilla, pero tocan combate,
  creación, aumentos y la economía de acciones.

---

## 1. La fuente

- **`docs/fuente/dotes.md`**: foto del documento "Dotes" de Drive (sync 2026-10-14, commit
  `9baaca1`), convertido con pandoc. Original en `docs/fuente/odt/dotes.odt`. **No se edita a
  mano**: lo regenera `npm run sync-drive` (ver `docs/drive-sync.md`).
- **`docs/fuente/creacion-de-personaje.md`** (~línea 82): presupuesto de Dotes por letra de
  prioridad, **A 18 / B 15 / C 12 / D 9 / E 6**.
- Estructura de cada dote: `Nombre (Coste N)`, `Requisito: …` y el efecto en prosa.
  Están agrupadas por habilidad: Actitud, Atletismo, Biociencia, Combate Melee, Combate a
  Distancia, Cultura, Exploración, Interpretación, Sigilo y Tecnociencia.

**Regla del usuario: manda el documento nuevo.** Si choca con lo que dicen `sistema.md`, un
supuesto o el código, se sigue el documento nuevo. Solo se pregunta si la duda es real
(una errata evidente, o algo que contradice al propio documento).

### Lo que ya contradice al repo
- `docs/sistema.md` §9 (`[PARCIAL · HOJA2]`, "sin catálogo"), el supuesto **S12** ("solo 0
  en la letra E") y la pregunta abierta 9 están **superados** por el documento nuevo.
- `src/lib/rules/prioridad.ts` → `PUNTOS_DOTES_POR_LETRA` solo tiene `E: 0`. El documento
  dice E = 6. **Es código**: anótalo como tarea, no lo toques.

---

## 2. Lee primero (en este orden)

1. `CLAUDE.md`, `docs/traspaso.md`, `docs/tareas.md` (Fase 5 y "Especies reales").
2. `docs/motor.md`: **obligatorio**, define el análisis de dos preguntas.
3. `docs/sistema.md` §2 (creación por prioridad), §3 (habilidades y especialidades), §9, §10.6
   (cómo quedaron las reglas de uso de los poderes) y la lista de supuestos y preguntas.
4. Los precedentes, para imitar la forma:
   - Psiónica: `docs/prompt-modelar-psionica.md` → `docs/psionica.md` (transcripción) →
     `docs/modelado-psionica.md` (salida del workflow).
   - Especies: `docs/prompt-especies.md` → `docs/propuesta-especies.md`.
5. El código que se va a reutilizar:
   - `src/lib/rules/motor.ts`: `MotorMetadata`, tipos y mecanismos.
   - `src/lib/rules/capa1.ts`: `fuentesDeCapa1`, el punto de extensión para una fuente nueva.
   - `src/lib/rules/poderes.ts` (`accionesDePsionica`) y `src/lib/rules/especie.ts` (E5):
     las dos implementaciones de `accion_sin_equipo`.
   - `src/lib/rules/fichaResuelta.ts`, `montaje.ts` (`montarTirada`/`tirarMontada`).
   - `src/lib/rules/usoPoder.ts`: el patrón "lógica fuera de la UI" (entrada explícita,
     devuelve lo que la pantalla aplica, tests, ESLint).
   - `src/lib/rules/sheet.ts`: forma de la ficha (`SCHEMA_VERSION`, `migraciones.ts`).

---

## 3. Lo que ya está claro (no lo re-litigues)

### Dos clases de dote, el mismo motor

| Clase | Ejemplo | Por dónde entra | Lógica propia |
|---|---|---|---|
| **Pasiva** | *Presencia Imponente*: +1 a intimidación (+2 con Fuerza ≥ 5) | Como el equipo: modificador (`siempre_activo`, `ajuste_fijo`, `eleccion_jugador`) que recoge `resolverFicha` | Ninguna |
| **Activa** | *Burla*: humor + expresión contra voluntad + actitud; éxito −1, crítico −2 durante 1 min | Como los poderes: acción propia (`accion_sin_equipo`), se tira con `montarTirada` | Una capa **fina**: usos, requisitos, efectos por grado |

- **No hace falta un `usoDote` del tamaño de `usoPoder`.** Lo pesado de `usoPoder` (fatiga,
  sobrecarga, Derivación, peaje) es solo de la psiónica.
- **Los efectos sobre terceros** (bono a un aliado, penalizador al enemigo) se resumen en
  prosa que el jugador lee (tipo 3, texto), igual que en los poderes.

### La ficha
- Los poderes **no** se guardan sueltos (la ficha guarda disciplina → nivel). Las dotes
  **sí**: se compran una a una, así que la ficha guarda **la lista de dotes elegidas**, como
  `equipo`. Lo derivable (puntos gastados, requisitos cumplidos) no se guarda.
- Los **contadores de uso** ("una vez por escena") son estado de partida, capa 2 y media,
  como `vidaActual` o `recursos`. No son capa 1.

### Lo que las dotes traen y no existe todavía
- **Requisitos**: atributo o habilidad con nivel, **especialidades** ("Ingeniería Genética
  3") y **otras dotes** en cadena (*Bloqueo* → *Contraataque Rápido* → *Maestro en
  Contraataque*).
- **Coste en puntos** del pool de Dotes (no créditos).
- **Contadores de uso**: por escena, por día, por objetivo, por aliado.

---

## 4. Riesgos ya vistos (míralos con lupa)

- **Reglas generales metidas dentro de una dote.** *Bloqueo* trae la regla completa del
  bloqueo (modificadores por tamaño, −3 desarmado contra armado). ¿Es una regla del
  sistema o algo que solo tiene quien compra la dote? ¿Existe hoy alguna acción de
  bloqueo en la app?
- **Choques con lo construido.** *Combate Sutil*: "reflejos en lugar de potencia para
  armas sutiles". El equipo ya tiene un estilo Sutil (Potencia en vez de Fuerza, ver
  `motor.ts` y `docs/equipamiento.md`). Comprueba si se pisan.
- **Dependencias de áreas sin código.** *Genio Genetista* y *Gran Genio Genetista* tocan
  los aumentos, que no existen. Esas dotes se quedan en texto con su `bloqueoPor`.
- **Economía de acciones.** ~24 "reacción", ~15 "acción gratuita" y ~14 "acción simple".
  Averigua si la app modela acciones por turno. Si no, probablemente sea texto
  informativo, pero que lo decida el usuario.
- **Formato roto de la fuente.** La negrita de pandoc viene descuadrada (`\**` sueltos,
  "Requisito:" unas veces en negrita y otras no, títulos de grupo pegados a dotes). Esto no
  molesta a quien la lee, pero sí al extractor del workflow (ver §5, paso 1).
- **Deriva entre agentes.** Con ~105 piezas repartidas, la clasificación se desvía de unos a
  otros (ya pasó con `MotorMetadata` del equipo). Hace falta auditoría adversarial al final;
  que los tests pasen no basta.

---

## 5. Pasos

### Paso 1 — Transcripción limpia: `docs/dotes.md`
- Fiel, como `docs/psionica.md`: sin interpretar ni corregir, erratas marcadas *(sic)*.
- `##` por grupo (habilidad) y `###` por dote. El extractor trocea por `###`, un lote por
  título.
- Campos fijos en cada dote: **Coste**, **Requisitos** (en lista, separando atributo,
  habilidad, especialidad y dote previa) y **Efecto** (la prosa literal).
- Los bloques que **no son dotes** (la regla de tamaño y desarmado dentro de *Bloqueo*)
  van marcados aparte, no mezclados como si fueran efecto de la dote.
- Comprueba el recuento contra la fuente (~105) y apunta cualquier dote sin coste o sin
  requisito.

### Paso 2 — Actualizar `docs/sistema.md`
- §9: estado nuevo, fuente `docs/fuente/dotes.md` + `creacion-de-personaje.md`, presupuesto
  A-E, estructura de una dote (coste, requisitos, efecto).
- Tachar S12 y la pregunta 9 con la resolución, y añadir la fuente nueva a la tabla de
  fuentes.
- Anotar en `docs/tareas.md` la tarea de código `PUNTOS_DOTES_POR_LETRA`.

### Paso 3 — Preparar y lanzar `modelar-area`
- El extractor (`scripts/workflows/modelar-area-extraer.ts`) solo conoce psiónica. Para
  dotes hay que añadir:
  - `MODELO_DOTES`: forma objetivo del catálogo. **Propónsela al usuario antes**: es la
    decisión que más condiciona todo.
  - `DECISIONES_POR_AREA.dotes` → la sección de `sistema.md` §9.
  - `CONSUMIDORES_POR_AREA.dotes`: piezas externas que leen dotes, si las hay.
- `accion_sin_equipo` ya figura como **construido** en el extractor y en el workflow
  (corregido el 2026-10-14). Lo que una dote activa necesite y no exista (contadores,
  requisitos) sale como hueco aparte.
- Cierra con el usuario, **antes de lanzar**, las preguntas que cambian la forma del modelo
  (cómo se guardan los requisitos, contadores sí o no, qué hacer con la economía de
  acciones).
- **Lo lanza el agente principal**, no un subagente: el subagente no tiene la tool
  Workflow. Hace falta opt-in explícito del usuario.
- Salida esperada: `docs/modelado-dotes.md` + `.json`, con cobertura, capas nuevas y
  preguntas.

### Paso 4 — Propuesta: `docs/propuesta-dotes.md`
Con el modelado delante, como `propuesta-especies.md`:
1. **Inventario** por grupo, con la clase de cada dote: pasiva, activa, narrativa o
   "toca otra área".
2. **Modelo de datos**: catálogo (`src/lib/catalog/dotes.ts`), campo en el `Sheet`, subida
   de `SCHEMA_VERSION`.
3. **Mecanismos nuevos**: requisitos, gasto del pool, contadores de uso. Para cada uno, a
   cuántas dotes afecta y dónde vive (`src/lib/rules/`, con tests, y la UI solo pinta).
4. **Encaje en `fuentesDeCapa1`**: qué hay que registrar para que las dotes entren.
5. **Decisiones del usuario.** Si son más de 4, cuestionario en un artifact.
6. **Preguntas al diseñador** (Murillo), con la opción recomendada mientras no conteste.
   Se siembran en `/preguntas` con `npm run seed-preguntas`.
7. **Plan por tandas** (D0, D1…), pequeñas y verificables.

### Paso 5 — Implementación (otra sesión, por tandas)
Flujo de siempre: plantear la tanda → luz verde → un subagente nuevo construye sin commit
→ revisión, tests y navegador en la principal → commit cuando lo pida el usuario.
Orden probable: requisitos y pool en creación → pasivas → activas → contadores. Lo decide
la propuesta.

---

## 6. Normas del usuario

- **Nada de código de la app** en esta tarea. El extractor del workflow (paso 3) es tooling
  y sí se toca, pero enseñando antes el `MODELO_DOTES`.
- Español, conciso y esquemático: subtítulos y listas, ejemplos sacados del documento.
- "¿Por qué X?" es una pregunta, no luz verde.
- Ni commit ni push sin que te lo pidan.
- Resultados largos se entregan por trozos: la idea llana en 3-4 líneas y un menú para
  profundizar.

## 7. Entregables

- `docs/dotes.md` (paso 1) y `docs/sistema.md` §9 actualizado (paso 2).
- `MODELO_DOTES` enseñado al usuario y, con su visto bueno y opt-in, `docs/modelado-dotes.md`
  (paso 3).
- `docs/propuesta-dotes.md` (paso 4).
- En el chat, tras cada paso: 3-5 líneas con lo encontrado y lo que necesita decidir el
  usuario.
