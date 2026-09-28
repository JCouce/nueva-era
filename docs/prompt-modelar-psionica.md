# Prompt de relevo — modelar la Psiónica (y diseñar el workflow que lo haga)

Eres el agente que arranca la **Fase 5** de Nueva Era por la psiónica. El diseñador
(Murillo) ya ha entregado el contenido de **razas, psiónica, ciberimplantes y dotes**; el
usuario quiere empezar por **psiónica** y, sobre todo, dejar montado un **proceso
repetible** para dar de alta un área nueva del sistema — el mismo proceso servirá
después para razas, ciberimplantes y dotes.

## Objetivo de negocio

Un grupo de ~10 jugadores lleva sus fichas en esta app, y el sistema de reglas sigue
creciendo: tras el equipo llegan **cuatro áreas nuevas** (psiónica, razas,
ciberimplantes, dotes). Cada elemento de esas áreas es prosa escrita para humanos
("gasta 2 de fatiga para…", "+1 a…") que hay que convertir en algo que la app **calcule
sola** — tiradas, bonos, costes, gastos — o, si no se puede, que **avise** de forma
honesta. Hacerlo a mano pieza a pieza ya salió caro con el equipo: errores de
clasificación que solo afloraron en una auditoría posterior.

Lo que el usuario quiere es un **proceso repetible** que, dada la prosa de un área, le
diga **antes de escribir código**:
- qué efectos encajan ya en el motor existente (y con qué mecanismo),
- qué **capa nueva** hace falta construir y a cuántos elementos afecta cada una,
- qué preguntas hay que hacerle al diseñador.

Con eso el usuario decide el modelo, se construye, y el mismo proceso se reutiliza para
las otras tres áreas. **Psiónica es la primera** y sirve de banco de pruebas.

## Tu entregable (en este orden)

1. Entender el motor y el estado actual de la psiónica en la app (secciones 1-2).
2. Pasar la prosa de `docs/Psiónica.pdf` a `docs/psionica.md` (sección 0).
3. Diseñar el workflow `.claude/workflows/modelar-area.js` (sección 3) y **enseñárselo
   al usuario antes de escribirlo**.
4. Con luz verde: escribirlo, lanzarlo sobre psiónica (con opt-in explícito) y
   presentar el resultado. **Nada de código de psiónica en la app** hasta que el usuario
   decida el modelo con ese resultado delante.

---

## 0. La prosa: `docs/Psiónica.pdf`

19 páginas. `pdftotext -layout "docs/Psiónica.pdf" -` la extrae limpia (comprobado); si
algo sale raro en tablas, la skill `pdf` o revisarlo a mano. Dos ramas: **Dinámica
Métrica** (geometría del espacio, materia, física) y **Metasensoria** (Resonancia y
demás: leer/influir mentes y máquinas, probabilidades). Primer paso: transcribirla
**fiel** a `docs/psionica.md` (como `docs/equipamiento.md` para el equipo — fuente
literal, sin interpretar). Las reglas que se decidan después se resumen con su estado en
`docs/sistema.md` §10, que es la fuente de verdad del proyecto.

## 1. Lectura obligatoria (en este orden)

| Qué | Dónde | Para qué |
|---|---|---|
| Normas de trabajo | `CLAUDE.md`, `docs/traspaso.md` | Cómo se trabaja aquí, trampas conocidas |
| Estado del proyecto | `docs/tareas.md` → "Fase 5" (buscar `### Fase 5`) y `## Ahora mismo` | Qué está hecho, qué depende de Fase 5 |
| **El motor** | `docs/motor.md` entero, sobre todo: "Las dos capas y media", "El análisis obligatorio de cualquier elemento de capa 1", "Los cinco tipos, ni uno más", "El eje ortogonal: mecanismos de entrega", "El dato: `MotorMetadata`", "Acciones sin dado", "Capa 2 y media: los dos sabores de Recurso", "Casos ya detectados que no encajan limpio", "Checklist para dar de alta un elemento nuevo", "Escalabilidad para las fases que vienen" | Es el modelo que todo elemento nuevo tiene que responder: **a qué acción afecta y cuál de los 5 tipos es** |
| Tipos del motor en código | `src/lib/rules/motor.ts` (`TIPOS_MODIFICADOR`, `MECANISMOS_MOTOR`, `ESTADOS_MOTOR`, `Afecta`) | La lista **cerrada** de tipos y mecanismos que el workflow debe usar — nada inventado |
| Reglas del juego | `docs/sistema.md` §10 "Psiónica y arquitectura cuántica" (10.0–10.5), §2 "Creación por prioridad" y "Coste y progresión" (Psiónica N×3), §7 (fatiga: "es además el combustible de lo psiónico"), preguntas 10, 14–19, 33 | Lo que ya está decidido sobre psiónica: pool de creación propio, coste N×3, pares de tirada por tipo de objetivo, consecuencias de fallar "varían por poder" |
| Cómo se mecaniza un efecto en una tirada | `docs/modificadores-tiradas.md` | Condiciones (toggle/opción/contador), alcances, notas — antes de proponer cualquier modificador |
| **El workflow de referencia** | `.claude/workflows/auditoria-motor-metadata.js` (léelo entero, cabecera incluida) | El patrón a imitar: fases `agent()`/`pipeline()`/`parallel()`, schemas JSON, verificación adversarial, y la lista de "MEJORES PRÁCTICAS aprendidas a base de tropezar" |
| Script de apoyo del workflow | `scripts/workflows/auditoria-motor-metadata-extraer.ts` y `scripts/workflows/README.md` | Por qué la preparación de datos vive fuera del sandbox, convención de nombres, cómo se ejecuta (`node --import ./scripts/test-resolver.mjs ...`) |
| Skill de autoría | Skill `workflow-authoring` (cárgala **antes** de escribir el script) | API del runtime y trampas |
| Memoria del proyecto | `MEMORY.md` → `modelar-area-workflow-propuesto`, `auditoria-tras-forks-paralelos`, `motormetadata-primero-al-revisar-piezas`, `no-codificar-sin-confirmar-tarea`, `checklist-plan-build-review-por-item` | Lo que el usuario ya decidió y cómo quiere trabajar |

## 2. Estado actual de la psiónica en la app (verificado 2026-09-28)

- **Presupuesto de creación ya existe**: `PUNTOS_PSIONICA_POR_LETRA` y
  `COSTE_FACTOR_PSIONICA = 3` en `src/lib/rules/prioridad.ts`; categoría `psionica` en
  la tabla de prioridad (`PrioridadCard.tsx`).
- **La tab está vacía a propósito**: `src/app/characters/[id]/_components/PsionicaTab.tsx`
  muestra el presupuesto y "Poderes psiónicos — sin definir".
- **Cosas del catálogo que esperan a la psiónica** (cuando exista, hay que engancharlas):
  - **Derivación Psiónica** (`src/lib/catalog/subsistemas.ts`): "Conversión Psiónica" y
    la "desorientación psiónica" del nivel 1, aparcadas en Fase 5 (`docs/tareas.md`,
    buscar "Derivación Psiónica"); pregunta 33 de `sistema.md` (Canal de Alta Resonancia).
  - **Xovromium** (`src/lib/catalog/medicina.ts` ~l.396, `src/lib/rules/farmacos.ts`):
    "+1 a manifestaciones psiónicas", bloqueado porque no existe la tirada de
    manifestación.
  - **Munición Supresora** (`src/lib/catalog/municion.ts`): "un psiónico gasta el doble de
    fatiga y −2 a su empleo" — hoy solo texto.
  - **Fatiga** ya es recurso persistente (`sheet.fatigaActual`, `vitalidad.ts`) y se
    ajusta a mano en Recursos: es el combustible de lo psiónico (§7).
- **Hackeo/intrusión** (§10.5): norma por defecto según tipo de objetivo (Voluntad +
  Actitud / Voluntad + Biociencia enfrentada), "lo indica cada poder". Nada construido.

## 2b. Herramientas que tienes

| Herramienta | Para qué |
|---|---|
| Tool **`Workflow`** | Lanzar el workflow. Solo con opt-in explícito del usuario. Guía de tamaño: <10 agentes por ejecución salvo que el usuario diga otra cosa — agrupa items por lotes si hace falta |
| Skill **`workflow-authoring`** | API del runtime (`agent`, `pipeline`, `parallel`, `log`, schemas) y trampas. Cárgala antes de escribir el script |
| `.claude/workflows/auditoria-motor-metadata.js` | Plantilla viva: cópiale la estructura |
| `scripts/workflows/` + `scripts/test-resolver.mjs` | Scripts de Node que preparan el `args` del workflow (el sandbox no lee disco). Se ejecutan con `node --import ./scripts/test-resolver.mjs scripts/workflows/<script>.ts`. Aquí irá `modelar-area-extraer.ts` si lo necesitas (p.ej. para volcar a JSON los ids de acciones y la lista de mecanismos reales) |
| Tool **`Agent`** (fork/subagente) | Preparar el JSON de `args` y lanzar el workflow **fuera de tu contexto** (lección de la cabecera del de auditoría: un JSON grande se come el contexto) |
| Skill **`auditoria-motor-metadata`** | La auditoría de después, cuando la psiónica esté construida |
| `npm test` (~650 tests, <1 s) | Validar cualquier cosa que toques en `src/lib/rules` |

Pista del motor que casi seguro vas a necesitar: `MECANISMOS_MOTOR` ya reserva
**`accion_sin_equipo`** — "genera su propia acción sin ser una pieza de equipo (poderes,
dotes) — mecanismo que aún no existe". Es el hueco natural de un poder psiónico.

## 3. Qué tiene que hacer el workflow `modelar-area` (diseño acordado con el usuario)

Hermano del de auditoría: aquél **audita** algo ya construido; éste **modela** algo nuevo,
antes de escribir código.

**Entrada** (`args`): un array de items, un poder = un item —
`{ id, label, rama, prosa: string[] }` — sacado de `docs/psionica.md`. Más, como contexto
fijo para los agentes: la lista cerrada de `TIPOS_MODIFICADOR` y `MECANISMOS_MOTOR`
(`motor.ts`) y los ids de las acciones/tiradas que existen hoy (fijas de `acciones.ts`;
las de ataque/herramientas se generan desde el equipo, así que resúmelas por familia).

| Fase | Quién | Qué hace | Sale |
|---|---|---|---|
| 1. Extraer efectos | 1 agente por item (o por lote) | Parte la prosa en efectos atómicos, sin interpretar de más | `claims[]` por item |
| 2. Clasificar | 1 agente por item | Cada claim → acción afectada (existente / nueva / de un tercero / ninguna), uno de los **5 tipos**, y el mecanismo de `MECANISMOS_MOTOR` que lo entrega **o `hueco`** con una frase de qué falta | propuesta de `MotorMetadata` + huecos |
| 3. Agrupar huecos | 1 agente con todos los huecos | Junta huecos iguales entre items: "gasto de fatiga al activar", "tirada de manifestación", "acción propia de un poder"… | lista de capas nuevas con nº de items |
| 4. Verificar | 1 agente adversarial por clasificación "ya cubierto por X" | Intenta refutarla contra `motor.md` y el código real | clasificaciones confirmadas/corregidas |

**Salida**: un documento `docs/modelado-psionica.md` para que el usuario lo revise, con
(a) las capas nuevas ordenadas por nº de poderes que desbloquean, (b) la propuesta de
`MotorMetadata` por poder, (c) preguntas para Murillo. Con eso el usuario decide el
modelo; luego se construye con un piloto, se pasan los datos y al final se reutiliza
`auditoria-motor-metadata` (generalizando su extractor, que hoy solo recorre `EQUIPO`).

**Cómo saber que el workflow funciona**: antes o además de psiónica, pásalo por 5-10
piezas de equipo ya auditadas — su `MotorMetadata` real es la respuesta correcta. Si no
la reproduce razonablemente, ajusta los prompts antes de fiarte del resultado sobre
psiónica.

Aplica las lecciones de la cabecera del de auditoría: el JSON de `args` lo prepara y lo
pasa un subagente (no lo leas en tu contexto), `args` por lotes si es grande, y el
workflow **solo analiza, no escribe código**.

## 4. Reglas del usuario que no te puedes saltar

- **No escribas código de una tarea nueva sin confirmar antes su forma** en 2-3 frases y
  esperar luz verde explícita — ni el script del workflow, ni la psiónica.
- **Workflow: solo con opt-in explícito del usuario** para lanzarlo (el diseño sí puedes
  proponerlo).
- **Nunca `git push`** sin que lo pida en ese momento. Commit solo cuando lo pida.
- Pruebas en navegador con la skill `devtools-rapido` (script por bloque, `el.click()`).
- `docs/sistema.md` manda en las reglas: lo que tomes como supuesto va a su tabla de
  supuestos (el último es S22); el estado va a `docs/tareas.md`, no a otros docs.
- Responde en español, conciso, esquemático (subtítulos/bullets, no párrafos largos).

## 5. Primer mensaje que deberías mandar al usuario

Algo así: "He leído el motor, sistema §10, el workflow de auditoría y `Psiónica.pdf`
(N poderes en dos ramas). Te propongo este diseño de `modelar-area` [tabla corta]. ¿Lo
escribo?" — y antes o después, la transcripción a `docs/psionica.md`.
