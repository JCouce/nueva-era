# Tareas — Nueva Era

Qué está hecho y qué falta, en un solo sitio. Antes esto vivía repetido y desincronizado
entre `docs/traspaso.md`, `docs/plan-app.md` y el `## Pendiente` de `CLAUDE.md` — de hecho
`docs/prompt-relevo.md` llegó a dar por pendiente algo que ya estaba cerrado. Este archivo
sustituye a todo eso para el estado: **si vas a escribir "esto está pendiente" o "esto ya
está hecho" en cualquier otro documento del proyecto, para — va aquí, no allí.**

`docs/traspaso.md` explica cómo se trabaja (normas, trampas, mapa de archivos).
`docs/sistema.md` manda en las reglas del juego. Este archivo manda en el estado.

**Última actualización:** 2026-09-11.

## Ahora mismo

La partida empieza el 23 de septiembre de 2026. Lo imprescindible del día uno — crear
personaje, saber a cuánto tiras, consultar el equipo — está hecho. Lo siguiente con más
valor: cerrar el diseño de la fase 6b (combate en vivo) o llevarle al diseñador las
preguntas abiertas de más impacto (ver el final de este documento).

---

## Hecho

### Fase 0 — Cimientos ✅
`schemaVersion`, tests del motor, reorganización de `lib/rules/`, cadena de migraciones
de ficha.

### Fase 1 — Motor de tiradas ✅ (completo, con Alerta incluida)
Tabla de dificultades, pares atributo+habilidad, chuleta de tiradas, lanzador de d12. La
Alerta se desbloqueó el 2026-09-10 al resolverse que Exploración sustituye a Supervivencia
(`C4` en `docs/sistema.md`).

### Fase 4 — Modificadores y especies ✅ (con especies provisionales)
Motor de modificadores (`Modificador` + `Fuente`, un único tipo de efecto para razas,
dotes, aumentos y equipo) y dos especies placeholder: Humano y Arkorü. Las especies reales
siguen bloqueadas por el diseñador — ver Pendiente.

### Fase 3 — Equipo ✅ catálogo cerrado (2026-09-11)
- **Tienda con presupuesto real.** `equiparAction`/`desequiparAction` cobran y devuelven
  `Character.creditos`; el precio se recalcula siempre en servidor (`costeDePieza`,
  `lib/rules/equipo.ts`), nunca se fía del cliente.
- **Tope de rareza por letra de Recursos** en creación (la ficha `DRAFT`); no aplica al
  máster, que puede equipar cualquier rareza en cualquier ficha.
- **Ranuras validadas en servidor**: subsistemas por armadura, compatibilidad de mejoras
  por tipo de arma (`puedeInstalar` en `lib/rules/equipo.ts`).
- **Equipo enganchado al resto del motor**: un arma equipada genera su propia tirada de
  ataque (`lib/rules/combate.ts`); armaduras y módulos aportan `ModificadorConFuente`.
- **Carga Transportable, primer pase.** `cargaMaxima()`/`pesoEquipado()` se muestran en
  Resumen. **Los penalizadores por exceso de carga y la Proeza de Fuerza siguen sin
  mecanizar** — hoy el peso solo se enseña, no penaliza. Ver Pendiente.
- Las tres tandas que faltaban por transcribir del catálogo (Medicina y Farmacia,
  Herramientas y Accesorios, Armamento Pesado + Granadas) están hechas, cada una
  enganchada a una tirada real donde `docs/equipamiento.md` daba un bono limpio que
  mecanizar. Detalle completo: `docs/sistema.md` §12.
- **Fuera del catálogo a propósito** (no son huecos por descuido) — ver Pendiente:
  Munición Especial y Armas Modificadas.

### Fase 6a — Panel de máster ✅
- Schema: `status` (`DRAFT`/`APPROVED`), `approvedAt`, `xp`, `creditos` en `Character`,
  como columnas propias — no dentro de `stats`, porque los concede el máster, no el
  jugador, y compartir el JSON del autosave abriría una vía para que el jugador los
  tocara.
- Ruta `/master`: cola de fichas (`DRAFT` arriba, `APPROVED` abajo) con xp/créditos
  editables inline; tira solo-máster dentro de `characters/[id]`.
- Aprobar congela un snapshot de Atributos/Habilidades (`Character.approvedSnapshot`) que
  actúa de suelo: el jugador no puede bajar de ahí, solo comprar más. Revertir a `DRAFT`
  suelta el snapshot.
- Sin notificación en vivo — decisión explícita para esta fase, no un hueco: el jugador ve
  el cambio la próxima vez que entra a su ficha.

### Creación por prioridad — HOJA2 ✅ (no estaba en el plan original)
Llegó a mitad de la fase 6a y sustituye buena parte del motor de creación viejo: reparto
de letras A-E (`prioridad.ts`), coste triangular por nivel, Aplicados como media, Recursos
→ créditos iniciales, Altura/Peso. **Progresión con XP tras aprobar**: subir un
atributo/habilidad cuesta XP al mismo coste que en creación, nunca se puede bajar, y el
techo pasa a ser el del sistema (6) en vez del de creación (4). Fresh start hecho el
2026-09-10: no quedan personajes de prueba viejos que evitar tocar.

---

## Pendiente

### Fase 2 — Ficha viva (PG y fatiga en partida) ⬜
Ya no está bloqueada por la pregunta de si se lleva en vivo — se resolvió que sí. La
implementación (daño por categoría, estados activos con penalizadores automáticos, gasto
de fatiga, descanso) va dentro de la fase 6b, de la que es dependencia.

### Fase 6b — Panel de combate en vivo ⬜ (MVP funcional cerrado 2026-09-11, pausada)
**Hoja de ruta con subtareas, para ir cogiéndolas una a una: `docs/fase-6b.md`.** No
dupliques su detalle aquí — actualiza ese archivo al cerrar cada pieza y, cuando la fase
entera esté hecha, esta entrada pasa a ✅ con un resumen de dos líneas.

El camino completo funciona de punta a punta: crear/editar NPCs con ficha en un
catálogo propio, montar un combate, meter jugadores y NPCs, llevar la cola de turnos e
iniciativa, aplicar estados, y que un NPC ataque de verdad (tirada real, no PG a ojo).
Pausada aquí a propósito — lo que queda (clonar NPC en instancias numeradas, plantillas
de encuentro, y el bloque 6 de brillo: niebla, selección múltiple, log, aviso de turno,
historial) es todo azúcar sobre un MVP que ya sirve, y el bloque 6 en concreto está
pensado para después de probarlo en mesa real, no antes.

Resumen de la forma que tomó el diseño: instancias de `Combate` con `Combatiente`s
(jugador o NPC de catálogo — el NPC ad-hoc suelto se probó y se quitó, ver
`docs/fase-6b.md` "Catálogo de NPCs — rediseño"), motor de estados que reutiliza el
`OrigenModificador: "estado"` que ya existía reservado en `lib/rules/modificadores.ts`
desde la fase 4, y reactividad por polling inteligente para empezar (es mesa física, no
hace falta latencia de videojuego online) con SSE como mejora si hace falta.

### Equipo — mecanizar efectos especiales por pieza ⬜ (arrancada 2026-09-11)
**Hoja de ruta pieza a pieza: `docs/equipo-efectos-especiales.md`.** El catálogo de
equipo (fase 3) transcribió fielmente el texto de cada pieza, pero columnas como
"Crítico de Fusión (11)" son hoy decorativas — no mueven ningún número ni avisan de
nada al tirar. La tarea: un mecanismo genérico en `TiradasTab` (aviso, no
auto-aplicación — la app no arbitra) más el barrido pieza a pieza para poblarlo con
datos correctos. Sin empezar la implementación todavía, solo el diseño y el primer
mapeo (familia de armas de plasma).

### Fase 5 — Poderes, dotes, aumentos, especies reales ⬜ (bloqueado por el diseñador)
El diseñador (Murillo) aún no ha escrito estos documentos. No hay nada que adelantar del
lado del código.

### Munición Especial ⬜
Mejora de arma (perforante, incendiaria, tóxica, electrizante, criogénica, corrosiva,
radiactiva, supresora). Su coste depende de qué munición cargues en el arma, y la munición
en general sigue aparcada hasta que el diseñador conteste la pregunta 7 de economía
(`docs/sistema.md`). Ver el comentario en `src/lib/catalog/equipo.ts` antes de
`MEJORAS_ARMA`.

### Armas Modificadas ⬜
Electrificantes, Térmicas, de Plasma, de Nanofilamento. Su coste es un **multiplicador**
sobre el precio de otra arma ya comprada ("Básico × 10"), no un objeto con precio propio —
no encaja en el patrón del catálogo (`coste: number` plano o por nivel) sin decidir antes
cómo modelar "coste = precio de otra pieza × N". Ver comentario de cabecera en
`src/lib/catalog/armasMelee.ts`.

### Penalizadores de Carga Transportable ⬜
La fórmula y el dato en pantalla ya están (Fase 3); falta aplicar los penalizadores por
exceso de carga (−25% malherido, −50% moribundo, −25% exhausto) y la Proeza de Fuerza.

### Búsqueda por texto en la Tienda ⬜
`TiendaTab` agrupa por familia y filtra "solo compatible ahora", pero no hay campo de
búsqueda libre. Con cientos de piezas en una pantalla estrecha, puede hacer falta antes de
que el grupo use la Tienda a fondo en mesa.

### Login con Google ⬜
Modelos `Account`/`Session` de Auth.js ya listos (adapter incluido); falta añadir el
provider en `src/auth.ts` y las credenciales `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`.

### PWA instalable ⬜
Sin empezar. Gana peso si la fase 6b lleva la app a mesa sin cobertura garantizada.

### Chat máster-jugador ⬜ (sin fecha)
Pedido por el usuario, pero es un modelo de mensajes y una UI nuevos, sin relación directa
con la ficha. No se diseña hasta que 6a y 6b estén cerradas.

---

## Preguntas al diseñador

Las 30 preguntas completas, numeradas, viven en `docs/sistema.md` → "Preguntas abiertas
para el diseñador". Por impacto:

1. **Notación de las tiradas** (`C8`): si "Perspicacia + Medicina" significa Biociencia
   con la especialidad Medicina, cambia el cálculo de media docena de tiradas.
2. **Capacidad de carga** (pregunta 26, parcialmente resuelta — ver Fase 3 y los
   penalizadores pendientes arriba).
3. **Especies, poderes, dotes y aumentos**: fases enteras esperando a que el diseñador las
   escriba.
