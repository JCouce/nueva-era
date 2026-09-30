# Prompt de relevo — construir la Psiónica, disciplina a disciplina

Eres el agente que **construye** la psiónica en la app. El modelado está **cerrado**: la
prosa, las reglas y la forma de los datos ya están decididas. El piloto (Singularidad) y
Traslación ya están hechos y probados; tu trabajo es seguir **disciplina a disciplina** con
la misma receta. No re-modeles ni re-preguntes lo que ya está decidido.

## Objetivo

Que un personaje con nivel en una disciplina vea sus poderes en **Acciones**, elija el nivel
empleado y las opciones, tire (o use, si no hay tirada), que la app **gaste la fatiga
correcta** con la cadena de modificadores, muestre resultados por grado y lo que tira el
objetivo, y resuelva la **sobrecarga**. Hecho para Singularidad y Traslación; falta el resto.

## 1. Lectura obligatoria (en este orden)

| Qué | Dónde | Para qué |
|---|---|---|
| Normas de trabajo | `CLAUDE.md`, `docs/traspaso.md` | Cómo se trabaja aquí, trampas conocidas |
| Estado | `docs/tareas.md` → `### Fase 5` | Qué está hecho y qué sigue |
| **Las reglas** | `docs/sistema.md` **§10.6** entero | TODAS las decisiones del usuario y del diseñador sobre psiónica. Manda sobre cualquier otra cosa |
| La prosa | `docs/psionica.md` | Fuente literal; consúltala cuando §10.6 no cubra algo |
| **El modelo de datos** | `docs/modelado-psionica.json` (raíz `CatalogoPsionica`) y su especificación en `MODELO_PSIONICA` dentro de `scripts/workflows/modelar-area-extraer.ts` | La forma exacta de cada poder: ejes, opciones (`cambia` sustituye, `suma` suma), `Valor`, `objetivoTira`, `resultados`, `ModificadorFatiga`, `sobrecarga` |
| El informe del modelado | `docs/modelado-psionica.md` §1–4 | Cobertura, checklist campo a campo, **qué hace la app con cada campo** (§3.1) y **capas de motor** con dependencias (§4) |
| Cómo se prueba | `docs/pruebas-psionica.md` | Un flujo por poder con los números esperados; el tuyo se añade aquí |
| El motor | `docs/motor.md` ("Acciones sin dado", "El dato: MotorMetadata", "Escalabilidad"), `docs/modificadores-tiradas.md` | Cómo se enganchan acciones y modificadores hoy |

## 2. Principios ya decididos (no los reabras)

- **La app calcula lo que sale de la ficha de quien usa el poder**: coste, tipo de acción,
  alcance, daño, su propio daño (se resta al confirmar), la sobrecarga.
- **Lo que hace el objetivo es texto tras tirar**, con sus cuatro grados (`objetivoTira`). No
  se tira por él ni se le aplican estados automáticamente.
- **Lo que se cuenta en mesa es mensaje** (objetivos múltiples: se muestra el coste por
  objetivo y el jugador se descuenta la fatiga a mano).
- **La dificultad la escribe el jugador** (la dice el máster); como mucho botones de referencia.
- **"Nivel de poder" a secas = nivel poseído**; "empleado" solo si la prosa lo dice o lo fija
  una fila de tabla. En el JSON, `porNivel` = empleado y `porNivelPoseido` = poseído.
- **Fatiga semi-global**: coste base → descuentos por nivel → ×2 Munición Supresora →
  Xovromium −1 → mínimo 0 (1 solo si la prosa lo dice) → pago con cargas (Derivación). Se
  descuenta **de la ficha** (`sheet.fatigaActual`), también en combate. Sin fatiga
  suficiente **no se deja confirmar** (salvo Proeza, con fatiga temporal).
- **Sobrecarga** (raíz del JSON): al cruzar el umbral de exhausto con un gasto psiónico →
  inconsciencia automática; salvación de Fortaleza 5 + nivel (empleado, o poseído en poderes
  de coste fijo) que decide el daño letal no absorbible (×0 / ×0,5 / ×1 / ×2 por grado).
  **La aplica la app.**
- **Si la prosa no lo dice, lo decide el máster en mesa.**
- La app **no cuenta acciones por turno**; el tipo de acción es una etiqueta. Las acciones y
  opciones de nivel no alcanzado **no aparecen**.

## 3. Estado del código (verificado 2026-09-30)

**Hecho y commiteado** (detalle y decisiones en `docs/tareas.md` → Fase 5 y `docs/sistema.md`
§10.6, apartados "Construcción…"):
- **Singularidad** completa (Impulso, Expansión, Convergencia).
- **Traslación** completa: Anclaje, Auto-anclaje, Trasladar, Levitar (también como
  movimiento en Resumen), Proyección, Auto-proyección, Proeza (fatiga temporal), Sensor y
  Duelo de Métrica. La Proeza pide el peso del objetivo y calcula sola el extra de fatiga.
- Compra de las 6 disciplinas (pool N×3, XP tras aprobar, requisitos en las dos
  direcciones) en la ficha y en el **editor de NPC** (modo libre).
- **Contención** completa (Contención con sus tres formas y Colaborar).
- Sin poderes todavía: **Resonancia, Inducción, Hipercognición**.

**Dónde vive cada cosa**

| Archivo | Qué |
|---|---|
| `src/lib/rules/psionica.ts` | Tipos del modelo v2 (`AccionPoder`, `Opcion`, `ModificadorFatiga`…) y compra de disciplinas |
| `src/lib/catalog/psionica.ts` | El catálogo: disciplinas, tablas `porNivel`, modificadores y acciones. Helpers `ejeNivelEmpleado`, `motorDeAccion`, `SIN_EXTRAS` |
| `src/lib/rules/poderes.ts` | `resolverPoder` (opciones → ajustes por nivel poseído → `"tabla"` → rebajas de economía → `Valor` → `suma` → marcadores `{campo}`), `accionesDePsionica`, `tiradaDePoder`, `costeFatiga` (cadena), `togglesDeFatiga`, `bloqueoPorFatiga`, sobrecarga, `levitacion` |
| `src/lib/rules/vitalidad.ts` | `pagarFatiga`, `fatigaEfectiva`, `terminarEscena` (fatiga temporal, ficha v13) |
| `src/app/characters/[id]/_components/` | `CabeceraPoder` (selectores, casillas, ficha del poder), `UsarPoderModal` (poderes sin tirada), `SobrecargaPanel`, `PsionicaTab`; la sección Psiónica y el pago en `AccionesTab` |
| `src/lib/rules/poderes.test.ts`, `psionica.test.ts` | Tests por disciplina; hay uno que resuelve TODAS las combinaciones del catálogo |

## 4. Receta para dar de alta una disciplina

1. Lee su prosa (`docs/psionica.md`), su bloque del borrador (`docs/modelado-psionica.json`)
   y las decisiones de §10.6. **El borrador tiene fallos**: ya salieron un +1 cobrado dos
   veces, "nivel de poder" a secas modelado como empleado (es **poseído**) y una tirada de
   ataque modelada como enfrentada. Transcribe contra la prosa, no copies el JSON.
2. Plantea al usuario la forma (qué acciones, qué piezas de motor faltan, decisiones) y
   espera luz verde. Disciplinas grandes, en tandas.
3. En el catálogo, lo que ya sabe hacer el motor:
   - tabla común por nivel empleado → `porNivel` de la disciplina + `"tabla"` en la acción;
   - valores que dependen del nivel poseído → `Valor.porNivelPoseido` o
     `ajustesPorNivelPoseido`;
   - formas y variantes → ejes `opcion`: `cambia` sustituye (las **notas se suman**),
     `suma` suma sobre lo resuelto;
   - rebajas de tipo de acción → `modificadoresEconomia` (nunca por debajo de simple);
   - descuentos de fatiga → `modificadoresFatiga`; si dependen de algo que declara el
     jugador, `condicion.toggle` (casilla), con `grupo` si se excluyen entre sí;
   - sin tirada → `resolucion: { tipo: "sin_dado" }` (sale el modal de "Usar");
   - penalizador propio → `resolucion.modificador`; dificultad fija → `resolucion.dificultad`
     (el modal la trae puesta);
   - varios objetivos → `multiplesObjetivos` (mensaje; la fatiga extra, a mano);
   - daño propio → `danioPropio` (se resta de la vida al usarlo);
   - lo que tira el objetivo → `objetivoTira` (solo texto, con grados).
4. Si hace falta motor nuevo, añádelo general (en `poderes.ts`), no un parche del poder.
5. Tests en `poderes.test.ts`, `npm test` + `npx tsc --noEmit` + `npm run lint`.
6. Prueba en el navegador (skill `devtools-rapido`, personaje `QA-PSIONICA` con letra A en
   Psiónica; para niveles altos, un NPC en `/master/npcs`) y **borra los datos de prueba**.
7. Documenta: decisiones → `docs/sistema.md` §10.6 ("Construcción de X…"), estado →
   `docs/tareas.md`, flujo → `docs/pruebas-psionica.md`. Commit cuando lo pida el usuario.

**Trampas que ya nos mordieron**
- El linter de React (compilador) rechaza `Date.now()` en funciones que ve en render y usar
  una función antes de declararla: el `id` llega del click; `abrir` va antes del bloque de
  poderes en `AccionesTab`.
- La fila de un poder debe sumar `ajustesFijos` (si no, Proyección marcaba −1 en vez de −3).
- En el navegador, `closest('[class*="p-3"]')` coge el bloque interior de la tarjeta: sube
  hasta el elemento que tenga el botón.
- El Chrome del MCP puede estar ocupado por otra sesión: se puede matar su proceso (perfil
  `chrome-devtools-mcp/chrome-profile`).
- Los penalizadores por umbral de salud/fatiga **no se aplican en ninguna tirada** (hallazgo
  sin arreglar, fuera de la psiónica): los umbrales solo sirven hoy para la sobrecarga.

## 4b. Siguiente: Resonancia (plan planteado, pendiente de luz verde)

Plan presentado al usuario el 2026-09-30; lo dejó para el siguiente agente. **Vuelve a
planteárselo en 3-5 líneas y espera luz verde antes de tocar código.** Todo sale de §10.6 y
de las respuestas de Murillo: no hay decisiones nuevas pendientes. Si al transcribir sale un
hueco, apúntalo como supuesto en §10.6 y avisa. Prosa: `docs/psionica.md`, "### Resonancia".

**Tanda 1: tabla de alcance, Sincronía, Rastreo y Leer Mente**
- Todo poder lleva un eje de alcance: **Local** (coste propio del poder) o una **fila de la
  tabla** (10 km² … 1.000.000 km²); la fila sustituye tipo de acción/tiempo y fatiga (nivel
  4 = 10 minutos, 4 de fatiga). En local, desde nivel 3, puede usarse como reacción. Local
  sin coste propio (Rastreo) cuesta 1, como la fila 1.
- Rebajas y descuentos (se acumulan hasta 0; las rebajas de acción no bajan de simple):
  nivel 2, lo usado a nivel 1 (incluido el local) baja un paso; nivel 3, −1 a niveles 1-2;
  nivel 4, el nivel 2 pasa de 1 minuto a compleja; nivel 5, −1 a niveles 3-4; nivel 6, −1 a
  niveles 4-5 y el nivel 4 dura 1 minuto (tiempo de la tabla). `modificadoresFatiga` ya
  filtra por `nivelEmpleadoMin/Max`; `modificadoresEconomia` solo por nivel exacto: añadir
  rango. El tiempo va como `Economia` `{ tiempo }`.
- **Sincronía:** simple = gratuita; compleja = estándar y 1 de fatiga; **mensaje agresivo**
  = compleja, 1 × nivel empleado, Expresión + (Biociencia **o** Actitud) con selector que
  preselecciona la más alta, `danioPropio` 1 mental (se resta al usarlo), grados: crítico =
  confusión N turnos + N daño mental; éxito = confusión 1 turno; fallo = nada. Acción aparte
  **Superar la barrera** (idioma/biología): Expresión + Biociencia (Informática contra
  sintéticos), referencias 4/7/10 como nota; fallida = llega pero no se entiende. Nota "si
  no conoces al objetivo, primero Rastreo".
- **Rastreo:** Perspicacia + Biociencia, o Tecnociencia (Informática) contra sintéticos
  (eje orgánico/sintético que `cambia` la resolución); eje de objetivo: conocido (dif 6),
  vagamente (9, tiempo ×2, +1 fatiga), desconocido (12, tiempo ×10, +4 fatiga); el ×2/×10
  multiplica el tiempo de la fila elegida. Interferencias +2/+4/+6 como nota.
- **Leer Mente:** enfrentada Perspicacia + Biociencia contra Voluntad + Actitud, estándar,
  1 de fatiga. Grados desde el psiónico (como Inducción): crítico = 1 minuto sin mantener;
  éxito = 10 turnos, mantener con reacción o simple, +2 en enfrentadas contra él; fracaso =
  1 turno; fracaso crítico = nada y el objetivo nota la anomalía.
- Motor nuevo: habilidad a elegir (`habilidad` como array → selector con la más alta
  preseleccionada) y el rango de nivel en las rebajas.

**Tanda 2: Alerta y Vínculo**
- **Alerta pasiva:** tirada normal, Perspicacia + Biociencia/Tecnociencia, dif 6, alcance
  20 m × nivel poseído; si estás exhausto, aviso (se puede tirar). **Activa:** estándar, 1 de
  fatiga, 1 km², dif 8. Desde nivel 4: **ventaja** (2d12, el mejor, enseñando los dos dados:
  mecánica nueva y genérica en modal y resultado) y casilla **"+2 por Resonancia 4"**.
- **Vínculo:** sin tirada, compleja (estándar desde nivel 4), 1 de fatiga, 1 minuto × nivel
  poseído, alcance nivel km². +1 a salvaciones de Voluntad de los vinculados = a mano;
  "alertar por vínculo" = nota; tantos aliados como fatiga se tenga.

**Tanda 3 (aparte, mini-épica):** la ventaja y el "+2 por Resonancia 4" también en la
tirada fija "Buscar / percibir". Choca con el problema ya anotado de que las tiradas fijas
no admiten condiciones que vengan de fuera (`docs/modificadores-tiradas.md` §8,
`docs/tareas.md` "Segunda dependencia"). Plantéala como pieza propia.

Después de Resonancia: Inducción (objetivo orgánico/sintético, elegir habilidad, varios
objetivos), Hipercognición, y las fuentes externas (Xovromium, Munición Supresora,
Derivación Psiónica).

**Pendiente fuera de la psiónica** (no lo arregles sin que lo pida): penalizadores por
umbral sin aplicar; la XP que da el máster no llega a las pestañas de compra hasta recargar
(`CharacterSheet.tsx`, estado `xp`); sembrar `/preguntas` en Neon (lo hace el usuario).

## 5. Reglas del usuario que no te puedes saltar

- **No escribas código de una tarea nueva sin confirmar antes su forma** en 2-3 frases y
  esperar luz verde explícita. "La siguiente de la lista" no es luz verde.
- **Ciclo por paso**: plantear → esperar revisión → construir → revisar, uno a uno. Di en cada
  planteamiento si es solo código o tiene alguna decisión pendiente.
- **Nunca `git push`** sin que lo pida en ese momento. Commit solo cuando lo pida.
- Cuando el usuario pregunta ("¿por qué X?", "¿cuánto cuesta Y?") es una pregunta, no luz
  verde: responde y propón, sin tocar código.
- Con un artifact o una respuesta larga: esquemático, con subtítulos y listas, y los
  números reales de la prueba en vez de "funciona".
- `npm test`, `npx tsc --noEmit` y `npm run lint` limpios antes de dar algo por bueno. Tras
  tocar `schema.prisma`: `npx prisma generate` y reiniciar el dev server.
- Pruebas en navegador con la skill `devtools-rapido` (script por bloque, `el.click()`),
  mobile-first.
- Decisiones nuevas de reglas → `docs/sistema.md` §10.6; estado → `docs/tareas.md`.
- Para tandas de más de 4 decisiones, el usuario prefiere un **cuestionario interactivo**
  (artifact con la opción sugerida marcada y autoguardado) antes que preguntas en el chat.
- Responde en español, conciso, esquemático; explica con ejemplos de la prosa, sin jerga
  interna ni referencias a secciones de documentos que el usuario no ha visto.

## 6. Primer mensaje que deberías mandar al usuario

Algo así: "He leído el encargo, §10.6 y el estado. Siguiente disciplina: [la que toque según
`docs/tareas.md`]. Propongo [forma en 3-5 líneas: poderes, piezas de motor nuevas,
decisiones pendientes con la recomendada]. ¿Le doy?"
