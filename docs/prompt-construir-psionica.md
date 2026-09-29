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
  Duelo de Métrica.
- Compra de las 6 disciplinas (pool N×3, XP tras aprobar, requisitos en las dos
  direcciones) en la ficha y en el **editor de NPC** (modo libre).
- Sin poderes todavía: **Contención, Resonancia, Inducción, Hipercognición**.

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

## 4b. Siguiente: Contención (plan ya planteado al usuario)

Un único poder **sin tirada**, casi todo datos:
- Tabla por nivel empleado (fatiga 1/1/2/3/3/4, absorción 1/1/2/3/4/5, absorción quieto
  3/3/5/7/9/11, Agilidad −1/−1/−2/−2/−3/−3). Nivel 2 personal = nivel 1.
- Duraciones que dependen de empleado **y** poseído (nivel 5 empleando nivel 1: 40 turnos;
  nivel 6 empleando nivel 1 personal: gratis 1 hora, luego 1/hora y sin −Agilidad…): única
  pieza de motor nueva, que un ajuste por nivel poseído se filtre por nivel empleado.
- Campo genérico de datos extra en la ficha del modal (Absorción, Absorción quieto, Agilidad).
- Forma: Personal (simple) / Ampliada (estándar, ×2 de fatiga, mantener = simple por turno,
  reacción desde nivel 4) / Colaborar en la de otro (1 de fatiga por casilla).
- Absorción y −Agilidad se aplican **a mano** (efectos activos sobre uno mismo); área y
  duración de la ampliada, en el manual. Notas: quieto, ir contra el ataque (consume la
  reacción), no se apila, cubre todo menos daño mental.

Después: Resonancia (daño propio, ventaja, bonos en otras tiradas), Inducción (objetivo
orgánico/sintético, elegir habilidad, varios objetivos), Hipercognición, y las fuentes
externas (Xovromium, Munición Supresora, Derivación Psiónica).

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
