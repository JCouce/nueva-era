# Encargo: propuesta de implementación de especies

Vas a investigar las especies de Nueva Era y hacer una **propuesta** de cómo implementarlas.
**No escribas código.** El entregable es un documento de propuesta y, si hace falta, un
cuestionario de decisiones. El usuario decidirá después.

## 1. Lee primero (en este orden)
- `CLAUDE.md` y `docs/traspaso.md`: cómo se trabaja aquí, normas y trampas.
- `docs/tareas.md`: estado del proyecto (Fase 4 y Fase 5, y la lista de pendientes del final).
- `docs/sistema.md` §2 (atributos y creación por prioridad), §14 (especies) y la lista de
  supuestos y preguntas abiertas del final.
- `docs/motor.md` y `docs/modificadores-tiradas.md`: cómo se clasifica y engancha cualquier
  elemento nuevo del catálogo (**lectura obligatoria antes de proponer cómo dar de alta
  nada**).
- El código que ya existe de especies:
  - `src/lib/catalog/especies.ts`: dos especies **provisionales** (Humano y Arkorü, esta con
    números inventados para probar el motor).
  - `src/lib/rules/derivados.ts` y `src/lib/rules/modificadores.ts`: cómo entran hoy sus
    modificadores (origen `"especie"`).
  - `src/lib/rules/creacion.ts` y `src/lib/rules/prioridad.ts`: creación por prioridad.
  - `src/lib/rules/aprobacion.ts`: la foto que se congela al aprobar.
  - `src/app/characters/[id]/actions.ts`, sobre todo `setPrioridadAction`: la letra de
    Recursos fija `Character.creditos`, una columna de la base.
- **La fuente:** `docs/Especies.pdf` (sin commitear; **no lo borres ni lo muevas**).

## 2. Cómo leer el PDF
- Extrae el texto con `pdftotext -layout`, pero **contrasta toda tabla con el render**
  (`pdftoppm -png` y lee la imagen). En el PDF de equipamiento, `pdftotext` corrompió tablas y
  metió números fantasma.
- Transcribe fielmente, erratas marcadas *(sic)*, sin corregir reglas al diseñador.
- Separa lo que dice el documento de lo que tú interpretas.

## 3. Qué tiene que responder la propuesta
1. **Inventario:** qué especies hay y qué da cada una. Clasifica cada efecto:
   - en creación: atributos, créditos, habilidades, límites o topes, puntos de prioridad…;
   - permanente en la ficha: bonos a derivados, a tiradas, resistencias…;
   - condicional: solo contra X, solo si Y;
   - rasgos narrativos sin mecánica;
   - cosas que tocan otras áreas: psiónica, equipo, estados, movimiento.
2. **Modelo de datos.** Punto clave: el usuario dice que la mayoría de efectos se aplican **al
   crear el personaje** (atributos, dinero, alguna otra cosa). Choca con un principio del
   proyecto: *"solo se guarda lo que decide el jugador; todo lo derivable se recalcula"*.
   Evalúa las dos vías con pros y contras concretos y recomienda una:
   - **Derivado:** la especie es un modificador que se recalcula siempre (lo que hacen hoy
     las provisionales).
   - **Aplicado al crear:** se escribe en la ficha al elegir especie.

   Cubre, como mínimo:
   - qué pasa si el jugador cambia de especie antes y después de aprobar;
   - cómo interactúa con el point-buy y sus topes (¿el bono de especie cuenta para el tope de
     4 en creación?);
   - los créditos iniciales, que viven en una columna de la base y hoy los fija la letra de
     Recursos;
   - la foto de aprobación;
   - la migración de ficha (`SCHEMA_VERSION`, `migraciones.ts`) si cambia la forma.
3. **Dónde vive la lógica.** Sigue lo acordado con el usuario hoy (ver §4): funciones puras en
   `src/lib/rules/` que devuelven un resultado que la UI solo aplica, con tests. Nada de
   decidir reglas en componentes de React.
4. **Encaje con el motor:** para cada efecto, qué mecanismo usa (los de
   `modificadores-tiradas.md`) y qué falta construir. Marca lo que exigiría un mecanismo nuevo.
5. **Huecos y preguntas para el diseñador (Murillo).** Lo que el documento no resuelve, con
   la opción que recomendarías mientras no conteste.
6. **Plan por tandas**, pequeñas y verificables (plantear → luz verde → construir → tests →
   navegador → documentar).
7. **¿Especies ahora o esperar?** Evalúa honestamente si conviene hacer especies ya o
   antes otra área. Candidatas:
   - **Penalizadores por umbral** de salud y fatiga (−1/−3/−5 y −1/−2): existen en
     `estados.ts` pero ninguna tirada los aplica. De ellos dependen partes de la psiónica
     (Estabilización, Derivación nivel 4, Hipomanía).
   - **Punto único de montaje de tiradas** (ver §4, punto 2).
   - **Estados** bien definidos (tendrán tirada objetivo y valores numéricos).
   - **Dotes y aumentos** (dotes sin presupuesto definido: supuesto S12 en `sistema.md`).

   Da criterios, no solo opinión: qué desbloquea cada una, qué riesgo de rehacer trabajo
   hay si se hace en el orden equivocado, qué depende del diseñador y cuánto la necesita la
   partida (que ya empezó).

## 4. Recomendaciones de arquitectura ya acordadas (respétalas)
Tras una revisión crítica del motor, el usuario aprobó esto (el primer punto ya está hecho y
es la referencia a imitar):
1. **Lógica fuera de la UI.** `src/lib/rules/usoPoder.ts` (`prepararPoder`, `usarPoder`,
   `efectosDelResultado`) es el patrón:
   - entrada explícita (ficha, modificadores ya montados, selección del jugador), sin leer
     nada global;
   - devuelve un objeto que la pantalla solo aplica;
   - tests de caracterización;
   - una regla de ESLint (`no-restricted-imports` en `eslint.config.mjs`) que impide a la UI
     importar las funciones de reglas.

   Si especies necesita lógica de creación (aplicar la especie, validar el reparto), debe
   seguir esta forma.
2. **Punto único de montaje de tiradas (pendiente).** Hoy cada lista de tiradas de
   `AccionesTab` se monta distinto: las fijas reciben equipo, psiónica y levitación; los
   ataques, herramientas, fármacos y movimiento solo el equipo. Se acordó **no fusionar**
   los mecanismos de modificadores (siguen separados, cada fuente en su módulo), pero sí
   crear **una única función que monte cualquier tirada** aplicando todas las fuentes en
   orden. Si la especie da bonos a tiradas, di si depende de esto.
3. **Interesante, sin prioridad:** tipar los parches por ruta de texto de los poderes
   (`sobre: "resultados.exito.texto"`).
4. **Descartado por ahora:** ids mágicos, partir archivos grandes, limpiar comentarios con
   fecha. No los propongas como parte de especies.

## 5. Normas del usuario que no te puedes saltar
- **No escribas código** en esta tarea. Ni siquiera "lo obvio".
- Responde en español, conciso y esquemático (subtítulos y listas, no párrafos largos),
  explicando con ejemplos del documento y sin jerga interna.
- Si hay **más de 4 decisiones**, el usuario prefiere un **cuestionario interactivo**
  (artifact con la opción recomendada marcada y autoguardado), no preguntas en el chat.
- Cuando el usuario pregunta "¿por qué X?", es una pregunta, no luz verde.
- Nunca hagas commit ni push sin que te lo pida.

## 6. Entregable
- `docs/propuesta-especies.md` con los puntos del §3 y una recomendación clara en el punto 7.
- En el chat: resumen de 5-8 líneas con la recomendación (especies ahora o qué antes) y las
  decisiones que necesita el usuario, marcando la recomendada.
