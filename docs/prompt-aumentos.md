# Encargo: aumentos — de la prosa del diseñador al motor

Vas a preparar la entrada de los **aumentos** en Nueva Era. Es la cuarta área de Fase 5,
después de psiónica, especies y dotes, y se apoya en lo que ellas dejaron construido. La que
más se parece es el **equipo**.
**No escribas código de la app.** Entregas la transcripción limpia, el modelado y una
propuesta. El usuario decide después y se construye por tandas.

Este documento recoge lo hablado con el usuario el 2026-10-16. Si al trabajar ves que algo
de lo que dice aquí es falso en el repo, **dilo y corrígelo**; no lo arrastres.

---

## 0. La idea en cuatro líneas

- Los aumentos son **capa 1** (`docs/motor.md`): una caja más del cajón. Aportan a tiradas o
  crean las suyas propias.
- Hay dos ramas. Los **implantes** (biónicos) tienen niveles 1-4 y rareza y precio por nivel.
  Las **operaciones genéticas** tienen rareza, precio y requisitos en árbol.
- **Decisión del usuario:** se tratan como **equipo**. Son una familia nueva `implante` en el
  catálogo de equipo, con `modificadores` y `motorMetadata`, y se compran en la Tienda. Se ven
  en Equipo con un chip "Ciberimplante" o similar, y la bolsa del humano paga primero.
- El trabajo es **traducir → decidir → implementar**. El paso de en medio no se salta.

---

## 1. La fuente

- **`docs/fuente/aumentos.md`**: foto del documento "Aumentos" de Drive, convertida con
  pandoc. **No se edita a mano**; la regenera `npm run sync-drive` (ver `docs/drive-sync.md`).
  - Hay unas 25 **operaciones genéticas**, cada una con "Operación <Rareza>: N créditos" y
    "Requisitos: <otras operaciones>". *Introgresión Sensorial Heteróloga* es repetible, con
    6 sentidos a elegir.
  - Hay 11 **implantes** de nivel 1-4, cada nivel con "Objeto <Rareza>: N créditos": IRM,
    MQE, Brazo Biónico, Ojo Biónico, Neuroprótesis Simpática, Enjambre Nanobot, Control
    Anímico, Control Sensorial, Refuerzo Protésico, Sistema de Emergencia y Soporte Vital.
  - Al principio de "Implantes" vienen reglas generales: sabotaje, y extracción con
    perspicacia/reflejos + biónica.
- **`docs/fuente/especies.md:15`**: la bolsa del humano son **70.000** créditos, solo para
  aumentos. Lo que sobra se pierde, pero puede juntarse con los recursos de creación para
  comprar otros aumentos.
- **`docs/fuente/creacion-de-personaje.md:47`**: "Recursos (Aumentos y Equipamiento)".

**Regla del usuario: manda el documento nuevo.** Si choca con `sistema.md`, con un supuesto
o con el código, se sigue el documento. Solo se pregunta si la duda es real: una errata
evidente o algo que contradice al propio documento.

### Lo que ya contradice al repo
- La app tiene la bolsa del humano en **60.000** (`src/lib/catalog/especies.ts:519`,
  `sistema.md` §14 M3). El documento dice 70.000. Como es código, anótalo como tarea y no lo
  toques.
- `sistema.md` §11 tiene tres líneas (`[PARCIAL · CONV-1]`, "falta bastante por escribir").
  Queda superado.
- Preguntas abiertas **11** (tope de implantes) y **20** (Biociencia/Tecnociencia): el
  documento **no** las resuelve. Siguen abiertas.

---

## 2. Lee primero (en este orden)

1. `CLAUDE.md`, `docs/traspaso.md` y `docs/tareas.md` (las secciones "Aumentos", "Especies
   reales" y "Centro de mando del máster (E1)").
2. `docs/motor.md`: **obligatorio**. Define el análisis de dos preguntas.
3. `docs/sistema.md`:
   - §9 (requisitos de dotes y supuesto S30) y §10 (uso de poderes y sobrecarga).
   - §11, §12 (equipamiento) y §14.6 (bolsa del humano).
   - Los supuestos **S30, S73-S78** y las preguntas **11, 20 y 32**.
4. Los precedentes, para imitar la forma:
   - Equipo: `docs/prompt-equipo.md`, `docs/equipamiento.md` y
     `docs/equipo-efectos-especiales.md`.
   - Dotes: `docs/prompt-dotes.md` → `docs/dotes.md` → `docs/modelado-dotes.md`.
5. El código que se va a reutilizar:
   - `src/lib/catalog/equipo.ts` (familias y el mapa de catálogo, ~l. 224) y
     `mejorasEstandar.ts` (ojo: **`soporte_vital` ya existe** como mejora estándar, ~l. 15).
   - `src/lib/rules/motor.ts` (`MotorMetadata`), `capa1.ts`, `fichaResuelta.ts` y
     `montaje.ts`.
   - `src/lib/rules/dotes.ts`: la lógica de requisitos y el hueco `psionicaPorImplante`.
   - `src/lib/rules/usoPoder.ts`: la salvación de sobrecarga, que es la candidata para el
     sobreesfuerzo del IRM.
   - `src/lib/rules/estadosFicha.ts` y `catalog/estados.ts`: estados con duración (E1), que
     son los candidatos para los efectos activables.
   - `FichaResuelta.piezasInutilizadas` (hueco vacío para el shock) y
     `FichaResuelta.bolsaAumentos`.

---

## 3. Lo que ya está claro (no lo re-litigues)

- **Familia de equipo, no área aparte.** Implantes y operaciones entran por el catálogo de
  equipo, la Tienda y la lista de Equipo, con un distintivo visual.
- **La bolsa del humano paga primero** y lo que falte sale de los créditos. Hay que guardar
  **cuánto de cada pieza se pagó con la bolsa**, porque hoy desequipar o vender reembolsa y
  no puede devolver bolsa como créditos.
- **Los efectos activables con duración** se apoyan en los estados de E1 (rondas, escena o
  hasta quitarlo) siempre que encajen.
- **Shock** (S73, pendiente de Murillo): va **después** de aumentos. Aquí solo se anota qué
  implantes son susceptibles, por nivel si cambia. No se construye.
- **Regla general** (`docs/motor.md`, "Lo que queda fuera del modelo"): lo que la app puede
  aplicar o recalcular se aplica; lo demás queda en texto. Casillas, reacciones, acciones
  extra y límites de uso se quedan en texto, como en dotes (§9.3).

### Decisiones abiertas (al cuestionario, no las tomes tú)
1. ¿Siempre activo (no se equipa ni pesa) o lista aparte (`sheet.aumentos`)?
2. +1 a atributos **básicos** (hoy el equipo no toca básicos): ¿cuenta para los requisitos
   de dotes (S30)?
3. ¿El IRM es la llave de la psiónica para especies no psiónicas? Hoy cualquier especie
   puede comprar psiónica. ¿Y su sobreesfuerzo?
4. El choque de id con la mejora estándar `soporte_vital`.
5. Elección de modelo dentro de un nivel (Brazo Biónico: Fuerte/Equilibrado/Ágil). Hoy
   `PiezaEquipada` no tiene campo de elección.
6. Las operaciones genéticas, ¿se compran en la Tienda igual que los implantes o tienen su
   propio flujo por el árbol de requisitos?

---

## 4. Riesgos ya vistos (revisión adversarial del 2026-10-16)

### Piezas de motor que no existen
- **Fuerza y Agilidad propias del Brazo Biónico**: con tope, elección de modelo, blindaje del
  brazo, bloquear con él y arma integrada.
- **"No apilable, vale el mayor"** entre familias: el Ojo frente a las miras, y Control
  Sensorial frente a los genéticos.
- **Armadura natural por tipo de daño**: hoy es un único `{valor, fuente}` de especie.
- **Reducir los penalizadores por heridas o fatiga**, también para un aplicado concreto: hoy
  `ajusteUmbrales` solo viene de la especie.
- **−1 al coste de habilidades**: hoy `ajusteCoste` solo viene de la especie.
- **Vida ×1,5 de Fortaleza**: hoy `salud()` es una fórmula fija.
- **Usos por escena o por descanso, y coste que sube**: no hay contadores ni descanso.
- **Dispositivo de armadura en el cuerpo** (Refuerzo Protésico 2-3): cargas pagadas con 2 de
  fatiga y tope de nivel.
- **Estado por pieza**: sabotaje, extracción y Sistema de Emergencia.
- **Regeneración** por tiempo y por categoría, **inmunidades** y **duración de estados a la
  mitad**.
- **Tempestad Nanobótica**: un ataque nuevo en `REGISTRO_DE_ATAQUE`.
- **Sobreesfuerzo del IRM**: Voluntad contra 6 + nivel. Se puede reutilizar la salvación de
  sobrecarga.

### Lo que ya existe
Modificador de atributo, ventaja, pagar fatiga, casillas y elección repetible.

### Se queda en texto o UX
Reacciones y acciones extra, simplificar acciones, exclusiones de uso simultáneo, "no puede
ser flanqueado" y el MQE entero (defensa ante intrusión psiónica, sin tirada propia del
portador).

### Erratas para Murillo (márcalas *(sic)* en la transcripción)
- Ojo Biónico: dos "Nivel 3" y ningún 2.
- IRM: el nivel 3 copia al 2.
- "Fallo" y "Fracaso" se usan como si fueran lo mismo.
- "Resistencia" no es un atributo (¿Aguante?).
- Cita aumentos que no existen: Hiperplasia, Estructura Ósea Aumentada, Resistencia de
  Tejidos Aumentada y Regeneración.
- Bucle de Realimentación dice "por turno".
- Frase rota en Control Sensorial 2.

### Formato roto de la fuente
La negrita de pandoc viene muy descuadrada (`\**`, `***\***`, títulos pegados a la línea
anterior, "Nivel 3\**"). Por eso hace falta transcripción antes del extractor.

---

## 5. Pasos

### Paso 1 — Transcripción limpia: `docs/aumentos.md`
- Fiel, como `docs/dotes.md`: sin interpretar ni corregir, y con las erratas marcadas
  *(sic)*.
- `## Operaciones genéticas` y `## Implantes`, con un `###` por pieza.
- Las **reglas generales** (sabotaje, extracción) van en su propio bloque, no metidas como
  efecto de una pieza.
- **Operación**: campos Rareza, Coste, Requisitos (en lista) y Efecto.
- **Implante**: descripción, y por cada **nivel** su Rareza, Coste y Efecto. Si el nivel
  tiene variantes (los modelos del Brazo), cada una en su sublista.
- Comprueba el recuento contra la fuente (~25 operaciones y 11 implantes) y apunta lo que
  venga sin coste o sin rareza.

### Paso 2 — Actualizar `docs/sistema.md`
- §11: estado nuevo y fuente.
  - Estructura de las dos ramas, compra con créditos y bolsa, y las reglas generales.
  - Lo que el documento no dice: tope (pregunta 11) y Biociencia/Tecnociencia (pregunta 20).
- §14.6: la bolsa es de 70.000.
- Añadir la fuente a la tabla de fuentes.
- Anotar en `docs/tareas.md` la tarea de código de la bolsa a 70.000.

### Paso 3 — Preparar y lanzar `modelar-area`
- El extractor (`scripts/workflows/modelar-area-extraer.ts`) conoce psiónica y dotes. Para
  aumentos hay que añadir:
  - `MODELO_AUMENTOS`: la forma objetivo de la pieza (implante por niveles con variantes, y
    operación con requisitos). **Enséñasela al usuario antes**, porque es la decisión que
    más condiciona.
  - `DECISIONES_POR_AREA.aumentos` → `sistema.md` §11.
  - `CONSUMIDORES_POR_AREA.aumentos`: dotes (*Genio Genetista*, sobreesfuerzo de
    *Potencia Psiónica*), psiónica (IRM) y especies (bolsa).
  - Un troceado por pieza (`trocearAumentos`): un `###` por lote. Mira si cada implante,
    con sus 4 niveles, cabe en un lote.
- Las decisiones del §3 que cambian la forma del modelo (1, 5 y 6) se cierran con el usuario
  **antes de lanzar**.
- **Lo lanza el agente principal**, no un subagente, porque el subagente no tiene la tool
  Workflow. Hace falta opt-in explícito del usuario.
- Salida esperada: `docs/modelado-aumentos.md` + `.json`, con la cobertura, las capas nuevas
  y las preguntas.

### Paso 4 — Propuesta: `docs/propuesta-aumentos.md`
Con el modelado delante:
1. **Inventario** por rama, con la clase de cada efecto: pasivo, activo, texto o "toca otra
   área". Incluye cuántas piezas desbloquea cada capa nueva.
2. **Modelo de datos**: la familia en el catálogo, cómo se guarda en la ficha (y si hay que
   subir `SCHEMA_VERSION`), el pago con la bolsa y la elección de modelo.
3. **Mecanismos nuevos** del §4, ordenados por cuántas piezas desbloquean. Para cada uno,
   dónde vive: en `src/lib/rules/`, con tests, y la UI solo pinta.
4. **Encaje con el shock**: susceptibilidad por familia, con excepción por nivel, para la
   tarea siguiente.
5. **Decisiones del usuario** (§3 y las que salgan), en un **cuestionario artifact**.
6. **Preguntas a Murillo**, con la opción recomendada mientras no conteste. Las erratas
   incluidas. Se siembran en `/preguntas` con `npm run seed-preguntas`.
7. **Plan por tandas** (A0, A1…), pequeñas y verificables. Orden probable: catálogo y compra
   con bolsa → pasivos simples → IRM y psiónica → capas nuevas por rentabilidad.

### Paso 5 — Implementación (otra sesión, por tandas)
Flujo de siempre: plantear la tanda → luz verde → un subagente nuevo construye sin commit →
revisión, tests y navegador en la sesión principal → commit cuando lo pida el usuario.

---

## 6. Normas del usuario

- **Nada de código de la app** en esta tarea. El extractor del workflow (paso 3) es tooling y
  sí se toca, pero enseñando antes el `MODELO_AUMENTOS`.
- Español, conciso y esquemático: subtítulos y listas, con ejemplos sacados del documento.
- "¿Por qué X?" es una pregunta, no luz verde.
- Ni commit ni push sin que te lo pidan.
- Los resultados largos se entregan por trozos: la idea llana en 3-4 líneas y un menú para
  profundizar.

## 7. Entregables

- `docs/aumentos.md` (paso 1) y `docs/sistema.md` §11 y §14.6 actualizados (paso 2).
- `MODELO_AUMENTOS` enseñado al usuario y, con su visto bueno y opt-in,
  `docs/modelado-aumentos.md` (paso 3).
- `docs/propuesta-aumentos.md` con el cuestionario (paso 4).
- En el chat, tras cada paso: 3-5 líneas con lo encontrado y lo que tiene que decidir el
  usuario.
