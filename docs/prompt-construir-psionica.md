# Prompt de relevo — construir la Psiónica (piloto con Singularidad)

Eres el agente que **construye** la psiónica en la app. El modelado está **cerrado**: la
prosa, las reglas y la forma de los datos ya están decididas. Tu trabajo es convertir ese
modelo en código, empezando por un **piloto con una sola disciplina (Singularidad)** que
recorra todo el camino crítico. No re-modeles ni re-preguntes lo que ya está decidido.

## Objetivo

Que un personaje con nivel en una disciplina psiónica vea sus poderes en la pestaña
**Acciones**, elija el nivel empleado y las opciones, tire (o use), y que la app **gaste la
fatiga correcta** aplicando la cadena de modificadores, muestre los resultados por grado y
resuelva la **sobrecarga**. Primero Singularidad (Impulso, Expansión, Convergencia); después,
disciplina a disciplina, el resto.

## 1. Lectura obligatoria (en este orden)

| Qué | Dónde | Para qué |
|---|---|---|
| Normas de trabajo | `CLAUDE.md`, `docs/traspaso.md` | Cómo se trabaja aquí, trampas conocidas |
| Estado | `docs/tareas.md` → `### Fase 5` | Qué está hecho y qué sigue |
| **Las reglas** | `docs/sistema.md` **§10.6** entero | TODAS las decisiones del usuario y del diseñador sobre psiónica. Manda sobre cualquier otra cosa |
| La prosa | `docs/psionica.md` | Fuente literal; consúltala cuando §10.6 no cubra algo |
| **El modelo de datos** | `docs/modelado-psionica.json` (raíz `CatalogoPsionica`) y su especificación en `MODELO_PSIONICA` dentro de `scripts/workflows/modelar-area-extraer.ts` | La forma exacta de cada poder: ejes, opciones (`cambia` sustituye, `suma` suma), `Valor`, `objetivoTira`, `resultados`, `ModificadorFatiga`, `sobrecarga` |
| El informe del modelado | `docs/modelado-psionica.md` §1–4 | Cobertura, checklist campo a campo, **qué hace la app con cada campo** (§3.1) y **capas de motor** con dependencias (§4) |
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

## 3. Estado del código (verificado 2026-09-29)

- **La ficha no guarda psiónica todavía**: `Sheet` (`src/lib/rules/sheet.ts`,
  `SCHEMA_VERSION = 11`) no tiene campo de niveles por disciplina. Hará falta uno (p.ej.
  `sheet.psionica: Record<DisciplinaId, number>`), con migración en `migraciones.ts` y
  `parseSheet` tolerante, como el resto.
- **Compra**: `PUNTOS_PSIONICA_POR_LETRA` y `COSTE_FACTOR_PSIONICA = 3` en `prioridad.ts`
  (`costeMarginal`/`costeTotal` ya existen). La pestaña `PsionicaTab.tsx`
  (`src/app/characters/[id]/_components/`) muestra el presupuesto y "sin definir". Requisitos
  entre disciplinas (Inducción ← Resonancia 1, etc.) son gate de compra.
- **Generación de acciones**: `REGISTRO_DE_ATAQUE` y `generaAccionPropia()` en
  `src/lib/rules/combate.ts` (hoy solo equipo). `fuentesDeCapa1()` en `src/lib/rules/capa1.ts`
  es el punto de extensión pensado para una segunda fuente de capa 1 (poderes) y **no tiene
  consumidores todavía**. Mecanismo `accion_sin_equipo` en `motor.ts`: previsto, sin construir.
- **Acciones sin dado**: `AccionDirecta` + `UsarModal.tsx` (patrón de Radar, escudos, fármacos).
- **Gasto al confirmar**: patrón `gastoTotal`/`gastoActivo` en `acciones.ts` (hoy para
  munición y cargas). La fatiga se ajusta con `ajustarFatiga` (`vitalidad.ts`); umbrales en
  `estados.ts` (`umbralFatiga`).
- **Especialidades**: "Física", "Informática" y "Biónica" (Tecnociencia) **no están** en
  `ESPECIALIDADES_CONOCIDAS` (`habilidades.ts`); hay que darlas de alta.
- **Ventaja (2d12)** no existe en ningún sitio; es mecánica nueva y genérica.

## 4. El piloto: Singularidad

Por qué: 3 acciones de ataque con daño calculado, un eje de nivel empleado, una opción que
**suma** (Poderosa), texto del objetivo con grados (esquiva, empuje, Fortaleza) y sobrecarga.
Toca casi todo el modelo con poco volumen.

Camino crítico propuesto (cada paso con su test en `src/lib/rules/*.test.ts`):
1. **Datos**: el catálogo en código (`src/lib/catalog/psionica.ts`) a partir del JSON, tipado
   (los tipos salen de `MODELO_PSIONICA`). Solo Singularidad para empezar.
2. **Ficha**: niveles por disciplina en el `Sheet` + compra en `PsionicaTab` con el pool y el
   coste N×3.
3. **Evaluador**: resolver un `AccionPoder` con el nivel poseído y las opciones elegidas →
   valores concretos (aplica `cambia`, luego `suma`, evalúa `Valor`).
4. **Generador**: acciones de poder en Acciones (grupo "Psiónica"), vía `fuentesDeCapa1` +
   registro, marcando `accion_sin_equipo` como construido.
5. **Modal**: selector de nivel empleado y de opciones; muestra coste, alcance, daño, notas.
6. **Gasto de fatiga** con la cadena y el bloqueo si no llega.
7. **Resultado**: grados propios + `objetivoTira` como texto; daño con `resolverDanio`.
8. **Sobrecarga**: aviso, salvación calculada y daño aplicado.

Después del piloto: resto de disciplinas, toggles externos (Xovromium, Munición Supresora,
Derivación Psiónica), ventaja, Levitar como movimiento, Duelo de Métrica, fatiga temporal.

## 5. Reglas del usuario que no te puedes saltar

- **No escribas código de una tarea nueva sin confirmar antes su forma** en 2-3 frases y
  esperar luz verde explícita. "La siguiente de la lista" no es luz verde.
- **Ciclo por paso**: plantear → esperar revisión → construir → revisar, uno a uno. Di en cada
  planteamiento si es solo código o tiene alguna decisión pendiente.
- **Nunca `git push`** sin que lo pida en ese momento. Commit solo cuando lo pida.
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

Algo así: "He leído §10.6, el modelo y el borrador JSON. Para el piloto con Singularidad
propongo empezar por [paso 1-2: forma del catálogo en código y dónde guarda la ficha los
niveles, en 2-3 frases]. ¿Le doy?"
