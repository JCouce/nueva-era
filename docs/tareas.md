# Tareas — Nueva Era

Qué está hecho y qué falta, en un solo sitio. Antes esto vivía repetido y desincronizado
entre `docs/traspaso.md`, `docs/plan-app.md` y el `## Pendiente` de `CLAUDE.md` — de hecho
`docs/prompt-relevo.md` llegó a dar por pendiente algo que ya estaba cerrado. Este archivo
sustituye a todo eso para el estado: **si vas a escribir "esto está pendiente" o "esto ya
está hecho" en cualquier otro documento del proyecto, para — va aquí, no allí.**

`docs/traspaso.md` explica cómo se trabaja (normas, trampas, mapa de archivos).
`docs/sistema.md` manda en las reglas del juego. `docs/motor.md` manda en la
arquitectura — el modelo obligatorio para pasar cualquier elemento nuevo (equipo,
razas, poderes, dotes, aumentos) de prosa a motor. Este archivo manda en el estado.

**Última actualización:** 2026-10-16.

## Ahora mismo

Sin valoración de prioridad aquí a propósito — se queda obsoleta en cuanto cambia el
foco. Frentes abiertos, cada uno con su sección en Pendiente:
- **Dotes**: D1–D2d, las dotes de NPC y las tiradas fijas de Apuntar, Carrera, Discernir
  mentiras y Resistir distracción hechas (0 efectos con `bloqueoPor: "tiradas-fijas"`);
  quedan la especialidad elegida en la tirada y las tiradas propias de Investigación, Rastreo
  y Subsistencia.
- **Aumentos**: hecho (tandas A0-A7 commiteadas, 2026-10-23). Queda lo que espera a Murillo
  (preguntas de A4-A7, 5 implantes en proceso, extracción, tope de implantes, Shock) y la
  psiónica biológica (IRM).
- **Puntos Heroicos**: sin empezar, con la prosa ya en `docs/fuente/`.
  *Neos Plouton* (`docs/fuente/neos-plouton.md`) es la aventura que juega la mesa, no un
  área de reglas que construir.
- **Equipo**: lo construible está hecho; lo que queda espera a Murillo o es diseño
  pequeño (ver su sección).
- **Panel de combate**: épica para debatir qué aporta; Fase 6b pausada mientras.
- **Centro de mando del máster + estados en la ficha (E1)**: decidido con maqueta, va antes
  que aumentos.
- Sync con Drive (`npm run sync-drive`, `docs/drive-sync.md`) — primera foto 2026-10-14 en
  `docs/fuente/`. **Pendiente: reconciliar la línea base** área por área (Creación de
  Personaje, Sistema, Equipamiento, Especies, Psiónica, Habilidades) contra
  `docs/sistema.md`. Primer adelanto (Creación): Vida/Fatiga base 8 → 10 (hecho, §4 `HOJA3`), Dotes con
  presupuesto por prioridad, topes de creación movidos.
- "Preguntas al diseñador" (final de este documento) — lo que bloquea a Murillo.
- **La fábrica** (épica en Pendiente, N1 construido, en rodaje desde 2026-10-22): cadena de montaje de cambios con
  Jefe de fábrica, línea determinista y revisión con oráculos. Uso y qué se apunta dónde: `fabrica/README.md`.

---

## Hecho

### Fase 0 — Cimientos ✅
`schemaVersion`, tests del motor, reorganización de `lib/rules/`, cadena de migraciones
de ficha.

### Fase 1 — Motor de tiradas ✅ (completo, con Alerta incluida)
Tabla de dificultades, pares atributo+habilidad, chuleta de tiradas, lanzador de d12. La
Alerta se desbloqueó el 2026-09-10 al resolverse que Exploración sustituye a Supervivencia
(`C4` en `docs/sistema.md`).

**UX corregida 2026-09-23 (feedback del usuario probando el §8 de arriba):** pulsar
"Tirar" cerraba el modal de golpe — si la tirada estaba lejos en la lista (scroll
hecho), el jugador se quedaba mirando la lista de botones sin ver el resultado, que
solo se actualizaba arriba del todo (`Marcador`, fuera de la vista). El resultado
ahora se muestra **dentro del propio modal**, sustituyendo a los controles tras
pulsar Tirar, con un botón "Cerrar" explícito — nuevo componente compartido
`ContenidoResultado` (`src/components/ResultadoTirada.tsx`) que usan tanto
`TiradaModal` como el `Marcador` de `TiradasTab` (que se queda como log rápido, ya
no como única fuente del resultado). El usuario probará el feeling antes de decidir
si hace falta más (p. ej. un atajo de "tirar otra vez" en la misma pantalla).

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
  Munición Especial y Armas Modificadas (estas, construidas el 2026-10-23 como
  transformación sobre un arma melee, S87).

**Fix de rendimiento (2026-09-23, detectado por el usuario en producción):** cada
clic en el stepper de un atributo/habilidad durante la creación disparaba un
server action inmediato (`SELECT` + `UPDATE` a Postgres por clic, sin fusionar) —
subir una habilidad de 0 a 4 eran 4 round-trips en fila. `CharacterSheet.tsx` ya
tenía el patrón correcto para identidad (`scheduleIdentity`, debounce 500ms); se
generalizó a un helper `scheduleCommit(key, fn, onOk)` con un timer por campo
(`atributo:id`/`habilidad:id`), reutilizable cuando existan dotes/poderes (Fase 5).
Delay centralizado en `AUTOSAVE_DEBOUNCE_MS`. Sin riesgo de guardarraíl: durante
creación, cliente y servidor validan el pool de puntos con la misma función pura
(`creacion.ts`). **Sin test automatizado** — el proyecto no tiene infraestructura
de test de componentes React (`npm test` solo cubre `lib/rules/*.test.ts`);
verificado con `tsc --noEmit` y `lint` limpios más revisión manual del código,
no con un check en navegador.

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

### El motor — MotorMetadata + arquitectura escalable ✅ (2026-09-23/24)
**El modelo entero vive en `docs/motor.md` — léelo antes de dar de alta cualquier
elemento nuevo (equipo, razas, poderes, dotes, aumentos), es de lectura obligatoria.**
Dos partes, las dos cerradas:

1. **Barrido de metadatos**: las 550 entradas `MotorMetadata` de las 215 piezas/niveles
   del catálogo de equipo (`src/lib/rules/motor.ts` + `src/lib/catalog/motor.test.ts`,
   en verde). Hecho por 4 forks en paralelo, uno por archivo — **una auditoría
   adversarial posterior encontró errores reales pese al test en verde** (una pieza
   "construida" que apuntaba a un id de tirada inexistente, una justificación de
   bloqueo copiada sin revalidar en 8 piezas, un campo entero sin declarar en 10
   armaduras, 3 fármacos mal tipados) — los 5 corregidos y commiteados. Lección para la
   próxima vez que se reparta trabajo de datos-con-juicio en paralelo: el test en verde
   prueba forma, no contenido, hace falta la auditoría después.
2. **Arquitectura escalable, construida y probada en vivo** (no solo propuesta): con
   ~300 elementos de capa 1 en camino (Poderes/Dotes/Ciberware, Fase 5) el proceso de
   generar la pestaña de Acciones tenía un cuello de botella real — `condicionesActivas()`
   se reescaneaba el equipo entero por cada fila mostrada, y `TiradasTab.tsx` no
   memoizaba nada. Construido: índice `Map` para `equipoPorId()`, un índice de
   condiciones construido una sola vez (`indiceDeCondiciones`/`consultaIndiceCondiciones`),
   memoización real en la pestaña, un registro `familia → generador` que sustituye los
   bucles hardcodeados de `combate.ts`, y el propio registro ya consulta
   `MotorMetadata.mecanismo` para decidir si genera una acción — `MotorMetadata` dejó de
   ser solo documentación. `src/lib/rules/capa1.ts` (`fuentesDeCapa1`) es el punto de
   extensión para cuando exista una segunda fuente de capa 1, todavía sin consumidores.
   Además, rename completo "Tiradas" → "Acciones" en código y UI (`docs/motor.md`
   §Escalabilidad, `docs/modificadores-tiradas.md` actualizado a la par) — el nombre ya
   encaja con que la pestaña vaya a acabar teniendo filas con y sin dado, pero esa parte
   (Acciones sin dado en sí) siguió sin diseñar entonces; la separación de filas con y sin dado en pestañas está
   en "Pestaña Acciones: pestañas y favoritas" (Pendiente).

**Catálogo dividido**, de paso: `src/lib/catalog/equipo.ts` pasó de 3222 a 190 líneas,
las 6 familias que vivían ahí (armaduras, armas de fuego, mejoras estándar, subsistemas,
movimiento, mejoras de arma) están en sus propios archivos, mismo patrón que ya usaban
`armasMelee.ts`/`armamentoPesado.ts`/`municion.ts`.

### Revisión pieza a pieza del catálogo, sesión 2026-09-24/25

Repaso sistemático de `docs/equipo-efectos-especiales.md` a raíz de que el barrido de
`MotorMetadata` se hizo con agentes en paralelo antes de que el motor existiera de
verdad (ver [[motor-metadata-barrido-estado]] en memoria) — método adoptado: ante una
pieza rara, comprobar primero si le falta dato/metadata antes de sospechar de la
lógica genérica.

- **Sutil en armas melee**: dejó de ser una nota de texto fija y pasa a un toggle real
  (`aplicadoSutil`/`danioSutil`), con mecanismo propio en `MotorMetadata`
  (`sustitucion_aplicado`) porque no encaja en `eleccion_jugador` (no pasa por
  `CondicionTirada`, su valor depende de la ficha). Bloqueo con arma Sutil ya no fuerza
  Potencia en automático.
- **Absorción de daño por blindaje resuelta (Murillo): 1 punto de blindaje = 1 nivel de
  daño**, y las mejoras "ignora el primer nivel de daño X" (Tejido Conductor) suman como
  +1 a blindaje de ese tipo. Sin construir en código todavía — ver Pendiente.
- **Puntero Láser construido entero** (+1 ataque, -2 sigilo) y **`condicionesActivas()`/
  `indiceDeCondiciones()` (`equipo.ts`) dejaron de excluir `mejoraArma`** — dos piezas
  reales (Puntero Láser, Mira Telescópica) necesitaban que una mejora de arma alcance
  una tirada fija ajena a la suya.
- **Visor Nocturno n1 y Mira Telescópica n2 homogeneizados**: mismo resultado de juego
  (capacidad sensorial sin matiz numérico) ahora con la misma forma de dato (toggle con
  nota en Buscar/percibir) que ya tenía Visor Térmico n1.
- **Bug grande, S9 no estaba implementado**: los niveles de una pieza no se acumulaban
  (`niveles.find` en vez de acumular 1..N) — detectado por el usuario al notar que Mira
  Telescópica/Visor Nocturno perdían capacidades de niveles inferiores al subir de
  nivel. Arreglado de raíz con dos helpers genéricos en `equipo.ts`
  (`nivelesHasta`/`acumulaPorClave`/`ultimoQueDefine`), y quitados los parches a mano
  que el catálogo venía usando para compensarlo (Soporte Vital, Sistema de Retroceso,
  Estabilizador Neuronal). Detalle completo en `docs/equipo-efectos-especiales.md`
  §"Control de subtareas independientes" y en `sistema.md` (supuesto S9).
- 416 tests, lint y `tsc --noEmit` limpios en todo lo anterior.

### Granadas → recurso con cantidad, 2026-09-27

Nace de un pedido concreto: el selector del Lanzagranadas Integrado/pesado listaba
siempre las 14 granadas del catálogo, tuviera el jugador la que tuviera — y "Lanzar a
mano" generaba una fila por INSTANCIA comprada, no por tipo. Solución: mismo patrón
que Materiales (tarea 8) — granada deja de ser una pieza equipable y pasa a
`sheet.granadas: Record<catalogoId, cantidad>`, con la diferencia de que aquí la
migración de fichas viejas SÍ es automática (1 instancia equipada = 1 unidad, sin la
ambigüedad que tenía Materiales). `SCHEMA_VERSION` 7→8.

- **Motor**: `recursos.ts` (`comprarGranada`/`ajustarGranada`/`sumarGranada`),
  migración 7→8 (`migraciones.ts`), `parseSheet` tolerante a ids de granada que ya no
  existan. `fabricar()` (`equipo.ts`) gana la rama granada — fabricar una con la VTF
  suma al recurso en vez de equipar. Limpiadas las ramas `familia === "granada"` que
  quedaban muertas en `costeDePieza`/`rarezaDePieza`/`pesoDePieza` (se quedaron solo
  donde siguen siendo necesarias por completitud de tipos).
- **`combate.ts`**: `accionesDeGranadas()` nueva (una fila "Lanzar X" por tipo en
  stock, no por `sheet.equipo`) — `tiradaDeGranada()` pierde el `instanciaId`.
  `tiradaDeLanzagranadas`/`tiradaDeArmamentoPesado` filtran el selector a los tipos en
  stock; sin ninguno, la fila entera se oculta (evita `ataque.modos: []`, que
  reventaría `AccionesTab.tsx` al pulsar Tirar). `REGISTRO_DE_ATAQUE` pierde la
  entrada `granada` (ya no es equipo-driven).
- **Server actions, jugador y NPC en espejo**: `comprarGranadaAction`/
  `ajustarGranadaAction` (`characters/[id]/actions.ts`, con el mismo tope de rareza
  que `equiparAction`) y `comprarGranadaNpcAction`/`ajustarGranadaNpcAction`
  (`master/npcs/actions.ts`, edición libre sin créditos ni tope).
- **UI**: en Tienda el botón pasa de "Equipar" a "Comprar" (`AccionComprarGranada`,
  hermana de `AccionSimple`; `BotonEquipar` gana labels parametrizables para "comprando/
  ✓ Comprada"), muestra cuánto se lleva ya. Recursos gana la sección "Granadas" —solo
  los tipos con cantidad > 0, card nueva `GranadaCard` (cantidad + −/+, sin botón
  comprar, eso se queda en Tienda). Equipo pierde la sección entera (ya no hay
  instancias que listar). `FabricarSeccion.tsx` no se tocó: `onFabricar()` ya era
  agnóstico a la familia.
- 20 tests nuevos (recursos/migraciones/sheet/equipo/combate), 492 en total, lint y
  `tsc --noEmit` limpios. Probado en vivo con el personaje QA-MOTOR-TEST (jugador) y
  el NPC "qwer" (edición libre): comprar en Tienda suma y cobra, aparece en Recursos y
  ya no en Equipo, ajustar a 0 lo quita, el selector del Lanzagranadas Integrado
  interpola el área real por tipo y colapsa a "sin selector" con un único tipo,
  fabricar con la VTF gasta materiales siempre y solo entrega con éxito.

### Hallazgo #5 — absorción de daño por blindaje, 2026-09-27

Fórmula resuelta por Murillo el 2026-09-24 (1 punto de blindaje = 1 nivel de daño),
sin código hasta ahora — bloqueaba desde el 2026-09-21 (prioridad alta marcada por el
usuario). Construido de una sentada tras aclarar en conversación una excepción que
`sistema.md` dejaba abierta.

- **`lib/rules/blindaje.ts` (nuevo)**: `blindajeContra(sheet, tipo, escudoEnAlto)` suma
  armadura equipada + Escudo Deflector (absorción por nivel, campo `absorcion` nuevo en
  `NivelModulo`, S9 vía `ultimoQueDefine`) + escudo melee **solo si `escudoEnAlto`**
  (docs/equipamiento.md:886, "acción simple para levantarlo" — no hay estado
  persistente que guardar, se declara en el momento). Mental y Fuego devuelven 0
  siempre — supuesto S19 (`sistema.md`): ninguna fuente de blindaje del catálogo
  menciona Fuego como cubierto (es justo lo que Mejora Ignífuga reabre: nivel 1
  construido 2026-10-23, ver más abajo). Tóxico cuenta como cualquier otro tipo (decisión del usuario,
  corrigiendo un supuesto peor que se había barajado antes): el blindaje sí reduce el
  daño de un arma tóxica, lo que se le escapa es el estado de Enfermedad/
  Envenenamiento que dispare, resuelto aparte por su propia salvación.
- **"Bloquear daño"** (Acciones → Defensa, `AccionesTab.tsx`/`BloquearDanioModal.tsx`
  nuevo): selector de tipo de daño + toggle "Escudo en alto" (solo si hay uno
  equipado; quitado el 2026-10-23, ver "Cobertura y escudos") + contador de daño recibido → "Blindaje: N · Pasa: N". Es un calculador
  puro, sin dado y sin mutar la ficha — no necesita el patrón de callback de
  Reparar/Fabricar, ni ninguna prop nueva en `CharacterSheet`/`NpcEditor`/
  `NpcAccionesPanel` (los tres montan `AccionesTab` igual, la fila sale gratis en
  los tres sitios).
- **`motor.ts`** gana el mecanismo `suma_derivado` (un valor numérico se suma a un
  derivado propio fuera de Modificador/CondicionTirada) — las 10 armaduras, los 4
  niveles del Escudo Deflector y los 5 escudos melee pasan de `bloqueado`/"pregunta
  29" a `construido`.
- **Tejido Conductor nivel 2, mismo día** (`bonoTejidoConductor()`, `blindaje.ts`):
  "ignora el primer nivel de daño eléctrico" (`docs/equipamiento.md:188`) es un +1 de
  blindaje específico contra Eléctrico que se SUMA al normal, no lo sustituye —
  detectado como hueco por el usuario tras cerrar el resto. **Corrección de paso**: una
  entrada previa de `docs/sistema.md`/`equipo-efectos-especiales.md` agrupaba este
  mecanismo también con Mejora Ignífuga y Polímero Anticorrosivo por error — solo
  Tejido Conductor lo trae; Anticorrosivo nivel 2 no tiene ningún "ignora el primer
  nivel", solo cambia la categoría de daño (Hallazgo #4); Mejora Ignífuga nivel 1 es un
  mecanismo distinto (habilita el blindaje de la armadura contra Fuego, no suma un
  extra), construido aparte el 2026-10-23.
- **Fuera de esta pasada, a propósito**: ~~Mejora Ignífuga nivel 1 (habilitar blindaje
  contra Fuego, mecanismo distinto al +1 de Tejido Conductor, sin construir)~~ —
  **✅ construida 2026-10-23** (`armaduraConIgnifuga()`, `blindaje.ts`): instalada en la
  armadura que cuenta, contra Fuego el desglose da solo la línea "<Armadura> · Mejora
  Ignífuga" con su blindaje; no suman natural, deflector, escudo, Densificar ni brazo
  (supuesto S85, pendiente de Murillo). El nivel 2 (fuego letal en vez de grave) sigue
  pendiente; Malla
  Plasmática (es un colchón/buffer, no blindaje, bloqueada aparte); el "Ignora N puntos
  de blindaje" de las armas de Kerzul (efecto del ATACANTE, no del defensor) — **resuelto
  2026-09-28 como aviso en el resultado del daño**, ver "Ignora blindaje" en Hecho.
- **Desglose, mismo día (pedido del usuario tras probarlo mentalmente): "Bloquear
  daño" ya no muestra solo el total.** `desgloseBlindaje()` (`blindaje.ts`) es ahora la
  fuente única de verdad — una línea por fuente (armadura, Escudo Deflector, Tejido
  Conductor, escudo en alto), `blindajeContra()` pasa a ser la suma de esas líneas en
  vez de duplicar la lógica. Mental/Fuego devuelven una línea explicativa a 0 en vez de
  lista vacía. Mismo criterio "nada suma en silencio" que ya usa `AccionModal.tsx`.
- 17 tests nuevos (`blindaje.test.ts`), 509 en total, lint y `tsc --noEmit` limpios.
  Sin probar en navegador esta vez (extensión de Chrome no disponible en la sesión) —
  pendiente de una pasada manual.

### "Acciones sin dado" — arquitectura construida + primer caso real, 2026-09-27

Nace de una pregunta directa del usuario ("¿es mala práctica un componente bespoke
por cada acción sin dado?") tras ver que Reparar/Fabricar y Bloquear daño ya repetían
el mismo chasis de modal a mano. Con 3-4 casos reales a la vista (Movilidad Aérea,
Malla Plasmática, Radar nv4, VTM nv4), tocaba generalizar lo mínimo — la pregunta que
`docs/motor.md` dejó abierta desde 2026-09-22 ("¿un campo que apaga el dado o un tipo
hermano?").

- **`AccionDirecta`** (`acciones.ts`), tipo hermano discriminado de `Accion` — sin
  `aplicado`/`habilidad`/`dificultad`/`ataque`. `id`/`label`/`grupo`/`nota`/
  `condiciones`/`confirmarLabel`.
- **`accionesDirectasDeHerramientas()`** (`herramientas.ts`), mismo patrón que
  `accionesDeHerramientas()`: genera la fila sola al equipar la pieza, sin
  condicional a mano en `AccionesTab.tsx`.
- **`FilaUsar`** (`AccionesTab.tsx`) + **`UsarModal.tsx`** (nuevo, `components/`):
  hermano ligero de `AccionModal.tsx` — mismo `HudCard`/backdrop, sin dificultad,
  circunstancial, desglose ni rodar dado. Reutiliza `ControlCondicion` (exportada de
  `AccionModal.tsx`, antes privada).
- **Sin motor de efectos genérico** — cada pieza pasa su propio `onUsar` (opcional),
  mismo criterio que `onReparar`/`onFabricar` (tarea 8). Generalizar el efecto en sí
  para un puñado de casos habría sido la abstracción prematura que este proyecto evita
  a propósito.
- **Piloto: Radar nivel 4, "Marcar objetivo"** — sin `onUsar` (no muta la ficha, solo
  informa un texto fijo que el jugador aplica a mano), así que valida "fila + modal +
  generación por equipo" sin arrastrar todavía la mitad "efecto que escribe en el
  sheet". `MotorMetadata` de Radar nivel 4 gana su propia entrada (antes solo tenía la
  genérica de la herramienta entera).
- **Descartado como piloto: Movilidad Aérea.** Al mirar el catálogo de verdad, "Máxima
  Potencia" gasta 2 cargas de una célula de 10 que **no existe en RECURSOS** —
  `capacidadDePieza()` (`recursos.ts`) no contempla la familia `movimiento` en
  absoluto. Además, "volar" en sí pide una tirada (Reflejos + Tecnociencia) que no
  existe en ningún catálogo de tiradas. Descubierto en esta sesión, no antes — el
  checklist ya intuía que Movilidad Aérea arrastraba más de una pieza (separaba
  "Máxima Potencia" del estado "¿está volando?"), pero no que ni siquiera el gasto de
  carga tuviera dónde vivir. **✅ Ambos huecos cerrados el mismo día** — ver
  "Movilidad Aérea — 'Volar' + RECURSOS", más abajo. Correctamente descartada como
  `AccionDirecta` (nunca lo era), no como tarea sin hacer.
- **Deja rastro en "Acciones recientes", pedido del usuario tras probarlo mentalmente
  (mismo día).** `Lanzamiento` (`ResultadoTirada.tsx`) gana un flag `sinDado?: boolean`
  — los campos de `Resultado` se rellenan a 0/null (nunca se leen), `FilaHistorial`
  (`tonoResultado`/`textoExitos`) los ignora en cuanto ve el flag y muestra "usado" en
  vez de "N éxitos". `usarDirecta()` (`AccionesTab.tsx`) empuja la entrada al confirmar
  cualquier `AccionDirecta`, mismo cupo de 6 que las tiradas — no hace falta que cada
  pieza lo pida, es un comportamiento del propio `UsarModal`, no de los datos.
- 3 tests nuevos (`herramientas.test.ts`), 512 en total, lint y `tsc --noEmit`
  limpios. Sin probar en navegador (extensión de Chrome no disponible en la sesión).

### "Levantar [escudo]", segundo caso real de "acción sin dado", mismo día

Pedido explícito del usuario: "para todos los escudos", no solo uno — validó que la
arquitectura generalizara de verdad al segundo caso, no solo al piloto.

- **`accionesDirectasDeAtaque()`** (nueva, `combate.ts`): recorre `sheet.equipo`
  buscando cualquier `armaMelee` con `defensa` (los cinco escudos: Rodela, Escudo,
  sus variantes de metamaterial, Escudo de Kerzul) y genera "Levantar [nombre]" para
  cada uno equipado — sin registro por familia nuevo, esta vez vive junto a
  `accionesDeAtaque()` en el mismo archivo por ser la misma familia de equipo.
- **El coste de acción (Simple/Estándar) se lee de `cat.modos[0].etiqueta`**, no se
  hardcodea aparte — es la misma columna que ya usa el ataque del escudo
  (`docs/equipamiento.md:882-905`).
- **No revierte la decisión de 2026-09-24** ("sin código, comunicación de mesa"): el
  coste de acción sigue sin arbitrarse ni rastrearse como estado. Lo nuevo es que
  ahora hay un sitio en Acciones → Defensa que recuerda cobertura/blindaje/coste y
  deja rastro en Acciones recientes al pulsar "Levantar" — antes solo vivía en
  `descripcion`.
- 6 tests nuevos (`combate.test.ts`), 518 en total, lint y `tsc --noEmit` limpios.
  Sin probar en navegador (extensión de Chrome no disponible en la sesión).

### Movilidad Aérea — "Volar" + RECURSOS, mismo día

**Corrección de diseño en conversación, antes de escribir código**: el checklist traía
esto clasificado como "tirada normal + acción sin dado + recurso conectados", pero al
leer la prosa con calma ("Máxima potencia... **en crítico**, +25 m") quedó claro que
"crítico" es un resultado de una tirada — Máxima Potencia no es una acción aparte, es
**la misma tirada de Volar jugada a lo grande** (acción Compleja + 2 cargas en vez de
Simple + 1). Cero "acción sin dado" nueva aquí; solo una tirada normal + un recurso.

- **RECURSOS para la familia `movimiento`** — hasta ahora `capacidadDePieza()`
  (`recursos.ts`) no la contemplaba en absoluto, pese a que tanto Movilidad Aérea como
  Exoesqueleto mencionan una célula de 10 cargas en su propia `descripcion`. Se añadió
  `MejoraMovimiento.celula` (mismo shape que `Subsistema.celula`) y se pobló **solo
  para Movilidad Aérea** — Exoesqueleto se deja sin poblar a propósito: ninguna acción
  consume su batería todavía (su bono de Fuerza sigue sin mecanizar por el carve-out
  de exclusiones, ver `movimiento.ts`), poblarla sería un recurso fantasma en la
  pestaña Recursos.
- **`accionesDeMovimiento()`** (nuevo, `lib/rules/movimiento.ts`): genera "Volar"
  (Reflejos + Tecnociencia, grupo Acciones) por cada Movilidad Aérea equipada. "Dificultad
  de maniobrabilidad: -N" del catálogo se modela como **ajuste fijo al modificador**
  (+3/+3/+3/+4 según nivel) — matemáticamente idéntico a bajar N la dificultad, y el
  único mecanismo que el motor ya tiene para que un número de una pieza entre en la
  cuenta de una tirada (`ajustesFijos`, mismo patrón que el -1 del Lanzagranadas
  Integrado).
- **Refinado el mismo día (pedido del usuario): Máxima Potencia se elige de verdad, y
  el resultado da metros concretos, no una nota de texto.** Máxima Potencia es un
  **toggle `CondicionTirada`** ("maxima_potencia") dentro de la propia tirada —
  `valorActivo`/`valorInactivo` a 0 porque no toca el modificador, solo cambia el
  payout — y `Accion.vuelo: { velocidadBase, bonusCritico }` (campo hermano de
  `ataque`, mismo espíritu que `danio` pero en metros) alimenta **`resolverVuelo()`**
  (`acciones.ts`, mismo patrón que `resolverDanio()`): éxito da la base (doblada con
  Máxima Potencia), fallo dobla... la mitad de esa base, fracaso crítico devuelve
  "descontrolado" sin metros fijos, y el bonus de crítico (25/35/50/70 según nivel,
  campo nuevo `NivelModulo.bonusCriticoM`) solo aplica con Máxima Potencia activa. El
  resultado ("Vuelas 100 m" / "Desplazamiento descontrolado") se pinta en
  `ResultadoTirada.tsx` (`Lanzamiento.vueloResuelto`) y en el log compacto de Acciones
  recientes, igual que ya hace el daño.
- **Fuera de alcance, sin cambios**: el estado persistente "¿está volando?" y sus
  penalizadores de combate (-1 a ataques, esquivas con Tecnociencia) — sigue siendo un
  prerrequisito aparte, no esta tarea. La elección Velocidad/Maniobrabilidad de la
  Progresión de nivel 3 tampoco se guarda (mismo criterio que ya tenía `velocidadM`) —
  se menciona en la nota para que se aplique a mano. El gasto de cargas sigue sin
  automatizarse (igual que munición/batería en todo RECURSOS): la nota dice cuánto
  cuesta, el jugador ajusta el recurso a mano.
- 13 tests nuevos (`movimiento.test.ts`), 531 en total, lint y `tsc --noEmit` limpios.
  Sin probar en navegador (extensión de Chrome no disponible en la sesión).

### Vida y fatiga pasan a recurso persistente + colchón de Malla Plasmática, 2026-09-27

Pedido del usuario: "la vida solo se lleva en un número arriba perdido y solitario, no
tiene la importancia que se debe" — hasta ahora `salud()` solo daba un máximo derivado,
sin ningún `actual` que sobreviviera fuera de un combate en curso (el snapshot de
`Combatiente` en Fase 6b se pierde al cerrar el combate). De paso, mismo tratamiento
para el colchón de Malla Plasmática, la pieza aparcada en el barrido de motor
("buffer temporal sin nombre en capa 2 y media").

- **`Sheet.vidaActual`/`fatigaActual`** (nuevos, `SCHEMA_VERSION` 8→9): recurso
  persistente del propio personaje, no de una instancia de equipo — por eso vive
  suelto en la ficha y no dentro de `sheet.recursos`. Centinela 999 en
  `defaultSheet()`/la migración 8→9: `parseSheet` lo recorta de inmediato al máximo
  real de `salud()` (nuevo `lib/rules/vitalidad.ts`, `reconciliarVida()`), así que una
  ficha nueva o migrada arranca a tope sin duplicar aquí la fórmula de vida/fatiga.
  `ajustarVida()`/`ajustarFatiga()` (mismo patrón que `ajustarRecurso()`) con sus
  server actions gemelas jugador (`ajustarVidaAction`/`ajustarFatigaAction`) y NPC
  edición libre (`ajustarVidaNpcAction`/`ajustarFatigaNpcAction`).
- **Alcance confirmado en conversación, explícitamente fuera de esta tarea**: el
  snapshot `pgActual`/`pgMax`/`fatigaActual`/`fatigaMax` de `Combatiente` (Fase 6b) no
  se toca — el combate en vivo sigue con su propia foto, esto es solo para fuera de
  combate. Sigue siendo la dependencia de Fase 2 más abajo, sin cerrarla del todo.
- **UI**: nueva sección "//SYSTEM · vida y fatiga" al principio de `RecursosTab.tsx`
  (antes que Materiales), dos tarjetas con +/- manual (`EstadoCard`, mismo esqueleto
  que `DurabilidadCard`). `ResumenTab.tsx` pasa de enseñar solo el máximo a
  "actual/máximo" (`Dato` gana un prop `max` opcional) — el ajuste en sí vive en
  Recursos, Resumen es solo el vistazo rápido.
  - **Barras segmentadas, pedido del usuario el mismo día ("barras futuristas y
    molonas para llevar la vida")**: `BarraVital` nuevo (`src/components/`) —
    track oscuro + relleno con glow neón dividido en segmentos (mismo lenguaje
    visual que `BarraProgreso`, pero por valor actual/max en vez de por tiempo),
    tono por color de sistema (`danger`/`info`/`glitch` — Vida, Fatiga y el
    colchón de Malla Plasmática, que pasa a llamarse "Escudo" en la sección de
    Recursos). Por debajo del 25% el borde se pone rojo y parpadea
    (`animate-pulse`) sin importar el tono, a 0 el relleno desaparece del todo.
    `EstadoCard` (RecursosTab) monta la barra + el +/- de siempre debajo; la
    sección de colchón deja de usar `DurabilidadCard` y pasa a `EstadoCard`
    también, con tono `glitch`.
    - **Fix el mismo día (detectado por el usuario a ojo): un segmento por
      punto, no 10 fijos.** 10 segmentos fijos no cuadraban con un máximo de
      8, 12, 14... — el relleno terminaba a mitad de un bloque en vez de
      justo en su borde. `segmentos = max` (un punto = un segmento) garantiza
      que el borde del relleno siempre coincide con una línea divisoria,
      porque `actual` es siempre un entero — válido mientras los máximos de
      este sistema sean números pequeños (8-16), sin capar por si algún día
      no lo son.
    - **Orden, pedido del usuario el mismo día: Escudo debajo de Vida, no al
      final de la pestaña.** Mismo criterio que un HUD de videojuego (vida +
      su escudo van juntos, fatiga es un recurso aparte) — el colchón de
      Malla Plasmática se saca de su propia sección al final y se renderiza
      entre la tarjeta de Vida y la de Fatiga, dentro de la misma cabecera
      "vida y fatiga".
    - Sin probar en navegador (extensión de Chrome no disponible en toda la
      sesión) — pendiente de una pasada visual.
- **Malla Plasmática — colchón como RECURSOS** (`docs/checklist-motor-vs-prosa-2026-09-24.md`
  Tier 2, punto 8, resuelto en parte): `NivelModulo.colchon` nuevo (10/12/14/16 según
  nivel, mismo patrón que `absorcion` del Escudo Deflector) + `capacidadDePieza()`
  (`recursos.ts`) gana el tipo `"colchon"` — visible en Recursos solo con la pieza
  equipada, ajuste manual +/-, sin recarga por compra ni por Materiales (regenera N
  por turno y el tiempo de reactivación siguen sin automatizar, comunicación de mesa,
  igual que el resto de "acciones sin dado" de la pieza). El motor[] `bloqueado`
  ("buffer temporal sin nombre en capa 2 y media") se retira de los 4 niveles: el
  colchón pasa a ser estructural, igual que la célula de batería, sin entrada de
  MotorMetadata propia.
  - **Trade-off aceptado, apuntado para más adelante**: Malla Plasmática también
    tiene célula de batería (10 cargas, para activarse) — `sheet.recursos` solo
    guarda un recurso por instancia equipada hoy, así que el colchón (lo pedido)
    prioriza sobre la batería, que se queda sin trackear en RECURSOS hasta que exista
    un compuesto instancia+tipo. No es una regresión de algo que estuviera
    deliberadamente construido antes (era un efecto colateral del chequeo genérico de
    célula), pero sí un hueco real a tener en cuenta si algún día se necesita.
  - **Fuera de esta pasada, sin cambios**: sacrificar puntos del colchón por daño
    melee, devolver daño al atacante, -8 a sigilo al activarse, neutralizar el
    Camuflaje Trifásico, y la detonación de pulso térmico en área — todo sigue
    exactamente como estaba (`pendiente`/`bloqueado` en `motor[]`). **Los tres
    primeros se construyeron al día siguiente, ver "Malla Plasmática — acciones
    (sacrificio de colchón, detonación en área)" más abajo.**
- 15 tests nuevos (`vitalidad.test.ts`, más casos en `sheet.test.ts`/
  `migraciones.test.ts`/`recursos.test.ts`), 546 en total, lint y `tsc --noEmit`
  limpios. Sin probar en navegador (extensión de Chrome no disponible en la sesión).

### Malla Plasmática — acciones (sacrificio de colchón, detonación en área), 2026-09-28

Pedido del usuario: "¿podemos incluir también las acciones de Malla Plasmática?" —
de las 4 mecánicas que quedaron fuera de la pasada del 27 (ver entrada de arriba),
esta tarea cierra 3; -8 a sigilo y neutralizar el Camuflaje Trifásico siguen sin
construir, no entraron en el alcance confirmado.

- **Sacrificar colchón por daño de plasma en golpe melee desarmado**
  (Puñetazo/Patada, `pelea_punetazo`/`pelea_patada`): dos toggles nuevos en
  `tiradaDeArmaMelee()` (`combate.ts`), generados solo si hay Malla Plasmática
  equipada y el arma es una de esas dos — `condicionesSacrificioColchon(nivel)`.
  Puramente informativos (`valorActivo`/`valorInactivo` a 0, mismo patrón que
  Máxima Potencia en `movimiento.ts`): el motor no descuenta el colchón solo, la
  nota explica cuánto sacrificar y el jugador lo ajusta a mano en Recursos, mismo
  criterio que el resto de gasto de RECURSOS en toda la app. El crítico (shock/
  llamarada/fusión, dificultad 6+nivel) va en la misma nota, no en una condición
  aparte. Nivel 3+ suma un segundo toggle (4 puntos → +2 de plasma) como
  ALTERNATIVA al primero, no algo que se sume encima — el motor no arbitra si el
  jugador declara los dos a la vez, mismo criterio de confianza que el resto de
  toggles independientes de la app.
- **Detonación de pulso térmico en área (nivel 2+)**: cierra el Hallazgo #1 de
  esta pieza, pero NO con una tirada de ataque propia como proponía el
  comentario original (mismo molde que Proyector de Pulso) — con una "acción sin
  dado" (`tiradaDetonacionPulsoTermico()`, `AccionDirecta`), porque nadie tira
  nada: el colchón que el jugador decide sacrificar ES el daño (no hay fórmula
  que calcular) y quien esté en el área esquiva con su Esquivar de siempre.
  Mismo criterio que Radar nv4 "Marcar objetivo": informa con los números ya
  calculados (área 6x6, o 10x10 desde nivel 4; esquiva 5+nivel; shock/llamarada
  6+nivel), no muta la ficha. Primera entrada del grupo "Ataques" en
  `accionesDirectasDeAtaque()` — antes solo tenía "Levantar [escudo]" en
  Defensa; `AccionesTab.tsx` gana el bucket `ataqueDirecta` para pintarla junto
  a los ataques con dado. **Corregido el mismo día, feedback del usuario tras
  probarla**: "informa, no muta la ficha" se queda corto — ahora el jugador
  elige CUÁNTOS puntos sacrifica con un contador (`SacrificioRecursoModal.tsx`,
  nuevo, hermano de UsarModal para acciones sin dado con cantidad variable), ve
  el daño resultante antes de confirmar, y al confirmar se descuentan solos del
  colchón (`AccionDirecta.recursoInstanciaId` + `categoriaDanio`, mismo
  `onGastarRecurso` de la Fase 1 de RECURSOS) — ya no "a mano en Recursos". El
  daño queda también en Acciones recientes vía `danioResuelto`, reutilizando el
  mismo campo que un ataque normal.
- **"Devolver daño al atacante en melee" — revisado y cerrado sin código.**
  Pedido explícito del usuario: "debería verse reflejado si corresponde".
  `docs/motor.md` resuelve `objetivo_tercero` siempre como texto — con tirada de
  portador donde colgarlo, o sin ella. Este efecto nunca modifica una tirada del
  PORTADOR (modifica la del atacante, que el motor no puede tocar), así que cae
  en la rama "no hace falta código, ya está en la descripción del catálogo" —
  mismo criterio que Escudos/Lanzallamas/Soporte Vital (coste de acción,
  comunicación de mesa). Reclasificado de `bloqueado` a `ad_hoc` en `motor[]`
  de los 4 niveles, sin tocar código de combate.
- **Fuera de alcance, a propósito**: -8 a sigilo al activarse y neutralizar el
  Camuflaje Trifásico — este último necesita un mecanismo nuevo de verdad (una
  pieza apagando el efecto de OTRA pieza distinta; `gate_instalacion` siempre ha
  sido una pieza controlando su propia acción, nunca pieza-sobre-pieza). Ninguno
  de los dos se tocó.
- 8 tests nuevos (`combate.test.ts`), 554 en total, lint y `tsc --noEmit`
  limpios. Sin probar en navegador (extensión de Chrome no disponible en toda
  la sesión).

---

### `arma.uso` estructurado + "Lanzar" armas arrojadizas, 2026-09-28

Tier 3 del checklist (`docs/checklist-motor-vs-prosa-2026-09-24.md`). `ArmaMelee.uso:
string[]` mezclaba empuñadura, Sutil, Arrojadiza/Arrojadizo (escrito de las dos
formas), Alcance y dos textos sueltos del Mangual, y el motor solo leía "Sutil".
Ahora son campos tipados (`catalog/armasMelee.ts`):
- `empleo: "una mano" | "dos manos"`, mismo nombre y valores que `ArmaFuego.empleo`
  (decisión del usuario). El "Mano Libre" del Puñetazo se da por una mano. "Variable"
  no hacía falta: ninguna melee lo es.
- `sutil?`, `arrojadiza?`, `alcance?` (este último solo informativo).
- Mangual: "Bloqueo -2" ya era `bloqueoAjuste`; "ignora 2 niveles de Cobertura" pasa a
  `efectos`, así que ahora sí llega como texto a la tirada.

Las 4 arrojadizas (Lanza Corta, Cuchillo de Combate, Puñal y Lanza Corta de Kerzul)
generan una fila nueva "Lanzar [arma]" (`tiradaLanzarArmaMelee`, `combate.ts`): igual
que lanzar una granada, Potencia + Atletismo, alcance Potencia × 10 m, con la
dificultad y el daño del modo Simple. Es `INFERIDO` (supuesto S20 de
`docs/sistema.md`) — EQUIP no da ninguna regla de lanzamiento. Recoger el arma después
de lanzarla es comunicación de mesa, sin código. La ficha de Tienda/Equipo enseña
"Empleo"/"Alcance" y chips Sutil/Arrojadiza.

### Mira Telescópica integrada en fusiles de precisión, 2026-09-28

El plan del checklist (clonar el `ajusteTramo` +1 media/larga de la Mira nv1 en los 8
fusiles) se descartó al releer `docs/equipamiento.md:627`: la integrada está "ya
contabilizada en la dificultad de ataque y en las mejoras disponibles" — su +1 ya está
en el −2 de los fusiles (frente al −5/−4 de las armas vecinas) y su ranura ya
descontada. Lo que faltaba era no dejar meter otra encima:
- `ArmaFuego.miraIntegrada: 1` en los 8 fusiles de precisión (`armasFuego.ts`).
- `validarInstalacion()` (`equipo.ts`) rechaza una Mira nv1 en esos fusiles ("ya lleva
  integrada..."); nv2/nv3 sí entran y sustituyen a la integrada: no ocupan ranura
  (`mejorasArmaInstaladas()`/`sustituyeMiraIntegrada()`).
- `bonosTramoDeMejoras()` (`combate.ts`) resta el bono de la integrada: nv3 aporta +1,
  nv2 nada extra (solo su visión nocturna/térmica).
Decisión del usuario: bloquear solo el nivel 1. Ranura y resta del bono, supuesto S21
de `docs/sistema.md`.

### Munición en Tienda + Munición Especial, fase 1, 2026-09-28

Categoría nueva **"Munición"** en la Tienda (`SeccionMunicion`, `TiendaTab.tsx`):
- **Recargar**: una fila por arma de fuego equipada con su botón "Cargador" (50 cr.),
  la misma acción que el de Recursos, que se queda como acceso directo.
- **Munición especial**: los 8 tipos de EQUIP (`MUNICION_ESPECIAL`,
  `catalog/municion.ts`) — no son piezas equipables, van a un stock por tipo compartido
  entre armas (`sheet.municionEspecial`, SCHEMA_VERSION 11, mismo patrón que granadas).
  Se compran en lotes de 10 (`LOTE_MUNICION_ESPECIAL`, decisión del usuario) y el +/-
  de Recursos ajusta sueltas.
- **Mejora "Adaptador: munición X"** (EQUIP la llama "Munición Especial"; renombrada para
  no confundirla con las balas, que se compran aparte): una `mejoraArma` por tipo
  (`MEJORAS_MUNICION_ESPECIAL`, `mejorasArma.ts`), que se instala desde la propia card
  de la munición. Sin ella no se puede comprar ese tipo (`armasHabilitadasPara()`,
  `comprarMunicionEspecial()`, lo comprueba el servidor). Ocupa ranura, no se repite el
  mismo tipo en un arma, no va en armas de plasma. Coste según la rareza de la munición;
  Muy Extraño sin precio en EQUIP → 62.500 (supuesto S22).

Fase 2 (usarla al disparar) hecha el mismo día, ver su entrada.

### Munición Especial — fase 2: usarla al disparar, 2026-09-28

El disparo de un arma con algún adaptador lleva un selector **"Munición"** (condición
`municion`, `condicionMunicion()` en `combate.ts`): "Normal" por defecto más cada tipo
habilitado en ESA arma, con su stock en la etiqueta. `Accion.municionesEspeciales` lleva
los datos (stock, `ajusteDanio`, efecto) para que modal y `tirar()` usen los mismos.
- **Daño**: `MunicionEspecial.ajusteDanio` se suma a la base (+1 incendiaria/
  electrizante/criogénica/corrosiva, −1 perforante, 0 el resto) — el tipo ("+1 Fuego") se
  queda como texto, sin partir el daño en dos categorías (decisión del usuario).
- **Efecto**: nota de la opción elegida; sale en el modal y en el resultado. La
  perforante ("ignora 2 de blindaje") es solo texto: el blindaje visto desde el atacante
  no está construido.
- **Gasto**: con munición especial el cargador no se toca; `gastoMunicionEspecial()`
  descuenta del stock lo que el modo gastaría (F. Auto = capacidad del cargador,
  decisión del usuario). `avisoInsuficiente()` avisa contra ese stock — avisa, no
  bloquea, igual que con el cargador.
- En el combate en vivo (`NpcAccionesPanel`) no hay gasto, igual que el resto de RECURSOS.

### "Ignora N puntos de blindaje" — aviso en el resultado del daño, 2026-09-28

Decisión del usuario: aviso, no resta automática — el blindaje es del objetivo y la
ficha del atacante no lo conoce. Campo estructurado `ignoraBlindaje` en las 10 armas de
Kerzul (`ArmaMelee`, sacado del texto de `efectos`) y en la munición perforante
(`MunicionEspecial`). Viaja por `Accion.ignoraBlindaje` (Golpear y Lanzar) o por la
munición elegida, y `ResultadoTirada.tsx` pinta "Ignora N puntos de blindaje del
objetivo · <fuente>" bajo el daño ya tirado. La ficha del arma lo enseña como dato
propio. Las Armas Modificadas de Nanofilamento (2-4 puntos) usan el mismo aviso desde el
2026-10-23 (S87).

### Armas de energía se recargan con batería, 2026-09-28

Láser, Plasma y Rayo (`tipoMunicion: "energia"`) se recargaban con "Cargador 50 cr."
como cualquier arma balística. Ahora "Batería 150 cr." (decisión del usuario, S17
ampliado), en Recursos y en la Tienda. `recargaDePieza()` (`recursos.ts`) es el único
sitio que decide qué se compra y a qué precio — lo usan `comprarRecarga()`, RecursosTab
y TiendaTab. El aviso de "no te llega" dice "cargas" en vez de "balas" para estas armas.
De paso, el colchón de Malla Plasmática ya no aparece en la lista de munición/batería de
Recursos (no se recarga con créditos, tiene su propia barra bajo Vida).

### Mira Telescópica — bono de búsqueda como toggle, 2026-09-28

"El mismo bonificador sirve para tiradas de búsqueda": toggle plano "Buscando con la mira
telescópica" en **Buscar / Percibir** (`alerta_activa`), +1 con mira nivel 1-2 y +2 con
nivel 3, sin condicionar a distancia (decisión del usuario). Un solo toggle aunque haya
varias miras, del nivel más alto — `condicionBusquedaMiraDeFicha()` (`equipo.ts`) lo
agrega en `condicionesActivas()` y en el índice, y cuenta también la mira integrada de
los fusiles de precisión.

### Psiónica ✅ (modelo 2026-09-29; construida entera 2026-09-30)
Las seis disciplinas, las fuentes externas de la cadena de fatiga (Xovromium, Munición
Supresora, Derivación Psiónica) y psiónica en NPC. Pruebas manuales:
`docs/pruebas-psionica.md`. Historial de construcción:

**Modelo cerrado el 2026-09-29.** Prosa literal en
`docs/psionica.md`; todas las decisiones (usuario y Murillo) en `docs/sistema.md` §10.6.
Workflow `.claude/workflows/modelar-area.js` (+ `scripts/workflows/modelar-area-extraer.ts`)
relanzado con el modelo v2: `docs/modelado-psionica.md` (cobertura 98%, checklist, campos,
capas C1–C14) y borrador de catálogo `docs/modelado-psionica.json` (raíz
`CatalogoPsionica`, versiones Poderosas corregidas a mano con `Opcion.suma`). Lo que la
prosa no dice lo decide el máster en mesa. **Piloto Singularidad (encargo `docs/prompt-construir-psionica.md`), 2026-09-29:** pasos 1-2
hechos — tipos del modelo v2 en `src/lib/rules/psionica.ts`, catálogo en
`src/lib/catalog/psionica.ts` (6 disciplinas para la compra, acciones solo de Singularidad;
el +1 de Poderosa del borrador se cobraba dos veces, corregido), ficha v12 con
`sheet.psionica`, compra en `PsionicaTab` (N×3 con el pool o XP, requisitos que bloquean
subir y bajar). Especialidades Física/Informática/Biónica dadas de alta. Paso 3 hecho:
evaluador `resolverPoder` (`src/lib/rules/poderes.ts`: cambia → `Valor` → suma → marcadores
`{campo}` de los textos). Paso 4 hecho: `accionesDePsionica` (gate `accion_sin_equipo`
construido, también en `fuentesDeCapa1` como familia "poder") y sección Psiónica en Acciones
con el resumen al nivel poseído. Paso 5 hecho: "Usar" abre `AccionModal` con cabecera
propia (`CabeceraPoder`: nivel empleado, forma, ficha resuelta, notas de antes de tirar); el
poder se tira como `Accion` de grupo "Psiónica" (`tiradaDePoder`, especialidad automática) y
"Tirar daño" usa el daño resuelto. Paso 6 hecho: `costeFatiga` (cadena en orden fijo,
filtros por alcance/toggle, mínimo; `paga_con_recurso` sin construir, lanza error) y gasto
al tirar vía `ajustarFatiga`, falle o no; sin fatiga suficiente Tirar se apaga
(`bloqueoPorFatiga`). Fuentes externas (Munición Supresora, Xovromium, Derivación) y
toggles de fatiga en el modal: tras el piloto. Paso 7 hecho: `Accion.poder` (texto propio
por grado con respaldo del crítico al normal, `objetivoTira` con dificultad resuelta) pintado
en `ContenidoResultado` — "El objetivo" plegado y siempre visible; notas de daño como
`efectos`. Paso 8 hecho: sobrecarga (`cruzaSobrecarga` al cruzar a exhausto, salvación de
Fortaleza tirada por la app contra 5 + nivel, daño letal no absorbible restado de la vida;
la inconsciencia se avisa, la marca el máster). **Piloto cerrado.** Psiónica también en
el editor de NPC (pestaña libre 0-6 con requisitos, `setDisciplinaNpcAction`); el generador
aleatorio y la métrica "Poder" no la tienen, a propósito.
**Traslación, tanda 1 (2026-09-30):** Anclaje, Trasladar, Proyección, Auto-proyección y
Sensor. Motor nuevo: filas de la tabla de la disciplina (`"tabla"` → `porNivel` del nivel
empleado, carga máxima), rebajas de tipo de acción por nivel (`modificadoresEconomia`),
casillas de fatiga con grupos excluyentes (`togglesDeFatiga`), poderes sin tirada
(`UsarPoderModal`), mensaje de varios objetivos y penalizador propio como ajuste fijo.
Tanda 2 hecha (2026-09-30): Levitar (movimiento en Resumen + acción por periodos vía
`ajustesPorNivelPoseido`), Auto-anclaje (tabla, dificultad 6 sugerida con
`Accion.dificultadSugerida`) y Duelo de Métrica (enfrentada, casilla de gratis). Siguiente:
tanda 3 (Proeza con fatiga temporal).
Tanda 3 hecha (2026-09-30): Proeza, ficha v13 con `fatigaTemporal` (`pagarFatiga`,
`fatigaEfectiva`, `terminarEscena` en `vitalidad.ts`), fila "Fatiga temporal" con Terminar
escena en Recursos (también NPC), daño propio al 200 %. **Traslación completa.**
**Anclaje colectivo en nivel 4 (2026-10-19, T-004):** con Traslación 4, anclar a varios a
la vez baja de compleja a estándar, como respondió Murillo (antes un supuesto lo dejaba en
compleja); un objetivo sigue simple y añadir un objetivo, estándar.
**Contención hecha (2026-09-30):** poder sin tirada con datos en la ficha del modal
(`AccionPoder.datos`) y ajustes por nivel poseído filtrados por nivel empleado y opción;
acción aparte para colaborar. Siguiente: Resonancia.
**Esquiva levitando (2026-09-30):** casilla "Levitando: Física" en Defensa / esquiva para
fichas con Traslación 2+ (`Accion.habilidadAlternativa`, `usarHabilidadAlternativa`,
`conEsquivaLevitando`); mismo patrón que Sutil pero sobre la habilidad.
**Proeza con peso (2026-09-30):** campo "Peso del objetivo (kg)" en el modal
(`AccionPoder.excesoDeCarga`, `ExcesoResuelto` en `poderes.ts`): extra por cada 10 %
completo, bloqueos (sin peso / no pasa de la carga / >200 % / carga 0), 200 % automático y
botón "Prolongar un turno" (no borra una sobrecarga pendiente).
**Resonancia, tanda 1 (2026-09-30):** Sincronía, Mensaje agresivo, Superar la barrera,
Rastreo y Leer Mente. Motor nuevo, general: eje de alcance con opciones de nivel con nombre
(`Opcion.nivel`, `EjePoder.porDefecto`: Local = nivel 1), multiplicador de tiempo de la fila
(`Opcion.multiplicaTiempo`), habilidad a elegir con la más alta preseleccionada
(`PoderResuelto.habilidadesAElegir`, selector en `CabeceraPoder`). La fila de un poder en
Acciones enseña ya el coste descontado y la unidad del alcance; el modal se remonta al
cambiar la dificultad fija (Rastreo 6/9/12); el aviso de daño propio ya no dice
"inconsciente" salvo en la Proeza al 200 %.
**Resonancia, tanda 2 (2026-09-30):** Alerta pasiva, Alerta activa (coste fijo) y Vínculo.
Ventaja genérica: `Accion.ventaja` + `tirarDado` (dos d12, el mejor), enseñada en el modal
mientras rueda y en el resultado; la activa `Disciplina.ventajas`. Las casillas de bono del
propio poder (`togglesPropios`) llegan al modal como condiciones ("+2 por Resonancia 4").
**Resonancia, tanda 3 (2026-09-30):** ventaja y "+2 por Resonancia 4" también en la tirada
fija "Buscar / percibir". General: `conPsionicaEnTiradaFija` (`poderes.ts`) aplica a
cualquier tirada fija las `Disciplina.ventajas` y `bonosEnOtrasTiradas` que la nombran,
sumándose a las condiciones del equipo. **Resonancia completa.** Siguiente: Inducción.
**Inducción, tanda 1 (2026-09-30):** base común (selector orgánico/sintético que cambia la
prueba y lo que tira el objetivo, alcance 20 m × nivel, casilla −4 desde nivel 5 vía
`togglesPropios`), Comando (con "Evitar un ataque" nv2 y varios objetivos nv3) y
Reconfiguración Mnemónica (nv3). Sin motor nuevo.
**Inducción, tanda 2 (2026-09-30):** Modulación (ocho efectos, nivel empleado en coste y
efectos, estándar nv2, varios objetivos nv4/nv6) e Hipomanía a un aliado (sin tirada).
Motor: marcador `{campo*2}` en los textos.
**Inducción, tanda 3 (2026-09-30):** Supresión (tres usos, duración por nivel poseído) y
Estabilización (sobre uno mismo). El bonificador de salvación va en dos pasos: se tira
Estabilización y luego se marca la casilla de la salvación (`bonosEnOtrasTiradas` por
tramos con `hastaNivelPoseido`). **Inducción completa.** Siguiente: Hipercognición.
**Hipercognición (2026-09-30):** Sondeo No-Local, Precognición y Retrocognición. Motor:
`baja_un_paso` entiende tiempos (1 hora → 10 minutos → 1 minuto → compleja…),
`Valor.alcanceDe` (alcance de la fila de otra disciplina a su nivel en la ficha,
`ContextoPoder.niveles`) y daño propio por grado (`DetallePoder.danioPropio`, se resta al
tirar). **Las seis disciplinas completas.** Queda de la psiónica: las fuentes externas de
la cadena de fatiga (Xovromium, Munición Supresora, Derivación Psiónica).
**Fuentes externas, tanda 1 (2026-09-30):** casillas "Bajo Xovromium", "Afectado por
Munición Supresora" y "Supresora, fallo crítico" en todo poder (`FUENTES_EXTERNAS_FATIGA`,
`ModificadorFatiga.ademas` para el efecto en la tirada y el daño por punto,
`efectosDeCasillas`); fila de Xovromium en Fármacos.
**Fuentes externas, tanda 2 (2026-09-30):** Derivación Psiónica — contador "Pagar con
cargas" en el modal del poder (`derivacionDeFicha`, `pagoConCargas`, `maxPuntosConCargas`
en `poderes.ts`; gasta con `onGastarRecurso`) y casilla de nivel 3 en las salvaciones
(condición de equipo con alcance de grupo). **Fase 5, psiónica: completa.**
**Refactor: usar un poder sin UI (2026-09-30).** `src/lib/rules/usoPoder.ts` con
`prepararPoder` / `usarPoder` / `efectosDelResultado` y sus tests de caracterización; la
lógica de coste, cargas, sobrecarga, daño propio y avisos sale de `AccionesTab` (−90
líneas), que solo aplica. Regla de ESLint (`no-restricted-imports`) que impide a
`src/app` y `src/components` importar las funciones de coste/sobrecarga. Cambio de
comportamiento único: el máximo de fatiga de la sobrecarga ya cuenta los estados de
combate (antes solo los aplicados los contaban). ~~Pendiente
relacionado: los penalizadores por umbral de salud y fatiga siguen sin aplicarse.~~ *(Hecho en M1b.)*
~~**Hallazgo (sin arreglar):** los penalizadores por umbral de salud y fatiga
(`modificadoresDeUmbrales`, −1/−3/−5 y −1/−2) existen pero nada los aplica a las tiradas.~~
*Cerrado en M1b (2026-10-13): entran como modificadores de la `FichaResuelta`.*
Preguntas al diseñador: página pública `/preguntas` (tabla `Pregunta`, seed
`scripts/seed-preguntas.mjs` desde `scripts/data/preguntas-psionica.json`, 42 preguntas);
las decisiones del usuario siguen en artifacts y se vuelcan a `docs/sistema.md` §10.6.

### Pestaña Personaje (rediseño del Resumen) + envío a revisión ✅ (construida 2026-10-13; envío a revisión probado y aprobado por el usuario 2026-10-15)
Maqueta navegable con todo lo decidido: https://claude.ai/artifact/1cA8wJzudPge1PnLF9q55H
(decisiones 1-7 al final de la maqueta, todas con la opción sugerida). No depende de
especies E2-E5; va antes o justo después de E2. Plantear la forma en código antes de
construir (dos pasadas: rediseño, luego revisión).

**Rediseño** (decisiones 1-4)
- [x] La pestaña "Resumen" pasa a llamarse **"Personaje"** *(id `personaje`;
      `ResumenTab` borrado, ahora `_components/personaje/PersonajeTab.tsx`. Aviso de reset:
      "todo salvo Personaje")*
- [x] Sub-pestañas en el orden de creación: **Origen → Prioridades → Identidad → Estado**,
      cada una con "✓ hecho" / "● pendiente". Al entrar: en creación, el primer paso
      pendiente; en juego, Estado. En juego, Prioridades desaparece y Origen es solo lectura
      *(reglas en `lib/rules/personaje.ts`: `pasosPersonaje` con `falta` por paso, pensado
      para la barra de envío, y `subPestanaInicial`. Identidad solo exige nombre. Con todo
      hecho abre en Identidad. Aprobada: Origen "fijado", Identidad "editable")*
- [x] Origen: carrusel de tarjetas grandes por especie (arte, descripción, chips de
      atributos, 3 rasgos clave + "ver más", botón "Elegir"; aviso "Elegir otra especie
      resetea la ficha" en la tarjeta si hay algo que perder; el modal se mantiene).
      Manduk: debajo, casta (4 tarjetas) y, si es noble, casa (6). Rasgos etiquetados
      CREACIÓN / SIEMPRE / TIRADA / TEXTO (sale de `MotorMetadata` / `creacion`)
      *(`etiquetaRasgo` + test con los 39 rasgos del catálogo; 8 quedan con
      `TODO(revisar)` porque la etiqueta por regla no casa del todo con su prosa. El
      borrador y el modal salen a `useEleccionEspecie`, que comparte con el selector
      compacto del NPC, sin cambios de comportamiento ahí. Aprobada y jugador: solo su
      tarjeta, sin botón)*
- [x] Arte fase 1: emblema geométrico y color por especie hechos con código; la tarjeta
      acepta una imagen opcional (`public/especies/`) para cuando haya ilustraciones
      *(`personaje/arteEspecies.tsx`: colores por especie, casta y casa; `imagen` vacío en
      todas)*
- [x] Identidad: nombre, edad, altura, peso con barra del rango de la especie, motivación
      y trasfondo juntos. Estado: vida/fatiga en barras, alerta, movimiento, carga
      *(altura y peso por defecto = punto medio del rango, sin guardarse: supuesto S23,
      sistema.md §14.5. Se eligen arrastrando la propia barra del rango, con "↺ por
      defecto"; sin rango (Humanos), campos de texto numérico. La cabecera de la ficha
      muestra especie · casta · casa)*

**Envío a revisión** (decisiones 5-7)
- [x] Estados de la ficha: **En creación → En revisión → En juego** (`CharacterStatus`
      gana `IN_REVIEW`; migración + campo de nota del máster y fecha de envío). Chip de
      estado en la cabecera
      *(migración `envio_revision`: `submittedAt` y `reviewNote`. Transiciones y quién
      puede cada una en `transicionRevision` (`lib/rules/revision.ts`, con test); el chip
      es `components/EstadoFichaChip.tsx`, en la cabecera de la ficha, la tarjeta del
      máster y la lista de personajes)*
- [x] Jugador: barra fija abajo con lo que falta (de los "pendiente") y botón **"Enviar a
      revisión"**, activo solo con todo hecho. En revisión la ficha es **solo lectura** y
      puede **retirarla** para seguir editando
      *(bloquea `faltaParaEnviar`, también con un pool en negativo (`excesosDePuntos`,
      S72); `avisosParaEnviar` avisa de puntos sin gastar sin bloquear. El servidor revalida con la ficha y el nombre de la base. Solo lectura:
      `loadEditable` rechaza todo autosave y la ficha va en `<fieldset disabled>`
      (las sub-pestañas de Personaje siguen navegables). **El máster sí puede editar una
      ficha en revisión** (decisión del usuario, lo más barato): se cambia en
      `fichaSoloLectura` (`revision.ts`), que usan servidor y pantalla)*
- [x] Máster: **Aprobar** o **Devolver** con nota **opcional**; la nota se ve en la ficha
      del jugador al volver a creación. El máster puede **aprobar sin revisión**, como hoy
      *(en la tarjeta de máster de arriba de la ficha y en el panel, `StatusControl`;
      `devolverAction` guarda la nota (máx. 500), que se borra al reenviar o aprobar)*
- [x] Panel del máster: fichas "En revisión" arriba, con contador
      *(secciones En revisión / En creación / En juego)*
- [x] La migración va en el mismo deploy que especies *(desplegada el 2026-10-13, push `7193cf9`)*

### Cobertura y escudos (regla de Murillo) ✅, 2026-10-23

Regla FIRME de Murillo vía el usuario (`docs/sistema.md` §6 "Cobertura y escudos", supuesto
S86): si el ataque supera la defensa pero falla por la cobertura, golpea la cobertura; si es
un escudo, recibe el daño entero, resta su blindaje y el resto va a su durabilidad. El
blindaje del escudo **deja de sumar al del portador**.

- **Esquiva**: casilla "Tengo cobertura (+2)" en "Defensa / esquiva" (`ACCIONES`,
  `rules/acciones.ts`), para cualquier ficha, lleve escudo o no (+2 fijo, decisión del usuario).
- **Blindaje del portador sin escudo**: `desgloseBlindaje`/`blindajeContra` (`rules/blindaje.ts`)
  pierden el parámetro `escudoEnAlto`; fuera la casilla "Escudo en alto" de "Bloquear daño".
  Ignífuga (S85) y el Brazo Biónico no cambian.
- **Golpe al escudo**: `golpeAlEscudo(sheet, tipo, daño)` (`rules/blindaje.ts`) da el blindaje del
  escudo, lo que pasa a durabilidad (`max(0, daño − blindaje)`), la durabilidad actual y la
  resultante, y si se rompe. Contra Fuego el blindaje del escudo vale 0; contra Mental no se
  puede elegir. Usa el recurso `durabilidad` que ya existía (sin migración).
- **Escudo roto** (durabilidad a 0): "Golpear con", "Bloquear con" y "Levantar" ese escudo salen
  bloqueadas con "Escudo roto: repáralo" (`escudoRoto`, `rules/recursos.ts`; `combate.ts`).
  Reparar con Materiales las devuelve solas.
- **"Bloquear daño"**: selector "¿A qué da el golpe?" (A ti · Al escudo · A la cobertura). "Al
  escudo" enseña el blindaje del escudo y "El escudo recibe X · durabilidad A → B", con botón
  que lo resta (`onDaniarEscudo` → `ajustarRecursoAction`, solo en la ficha del jugador; en NPC y
  combate en vivo, solo los números). "A la cobertura": no recibes daño.
- Tests: desglose del portador sin escudo, `golpeAlEscudo` (durabilidad, rotura justo en 0 y con
  sobrante, fuego, mental, roto), filas bloqueadas con el escudo roto y la casilla de cobertura
  en la esquiva. Sin probar en navegador todavía.

## Pendiente

### Pestaña Acciones: pestañas y favoritas ✅ (usuario, 2026-10-23; T-005, T-006 y T-007)
Dentro de Acciones, una barra por **origen** de la fila (rehecha el 2026-10-23; antes era Básicas sin dado / Tiradas
con dado): **★** (Favoritas) · **Básicas** (catálogo fijo `ACCIONES` por grupo, Bloquear daño, Reparar/Fabricar,
Tirada libre) · **Equipo** (Ataques, Defensa con Bloquear con X y Levantar escudo, Movimiento con Volar,
Herramientas, Fármacos; Pelea incluida) · **Aptitudes** (Psiónica por disciplina, Dotes —también las de un grupo fijo,
como Traicionero—, Especie) · **Aumentos** (filas e informativas). Con dado y sin dado mezclados. Una tirada fija
modificada por algo propio (esquiva levitando, psiónica en tirada fija) sigue en Básicas. Las secciones se montan
como datos (`Seccion`) y cada pestaña pinta las suyas; la que no tiene filas no sale, y si se vacía la abierta se
vuelve a Básicas. Abre en ★ si hay alguna favorita que pintar, si no en Básicas (se decide al montar). El historial
queda encima, fuera de las pestañas. En solo lectura la barra sigue navegable: `AccionesTab` lleva
su propio `PanelFieldset` y `CharacterSheet` ya no lo envuelve. NPC y consola de combate, igual.
- [x] **T-005** — Básicas y Tiradas (2026-10-23)
- [x] **T-006** — Favoritas (2026-10-23): estrella (`BotonEstrella`) en toda fila con botón de Básicas y Tiradas
  (bloqueadas incluidas, no en `FilaInfo`), guardada en `sheet.favoritas` (v21, sin Prisma) con
  `marcarFavoritaAction`; cambia al momento y se deshace si falla el guardado. Bloquear daño y Reparar/Fabricar usan
  las claves fijas `fija:bloquear_danio` / `fija:reparar_fabricar`. Pestaña ★ la primera, con las marcadas de todas
  bajo sus subtítulos de siempre (las secciones del mismo título, como las dos Defensa, se juntan); un id sin acción no
  se pinta ni se limpia. Solo personajes: sin
  `onMarcarFavorita` (NPC, combate del máster) ni estrella ni pestaña.
- [x] **T-007** — Tirada libre (2026-10-23): fila "Tirada libre" al final de "Acciones" (Básicas), con estrella
  (clave fija `fija:tirada_libre`). El modal (`AccionModal`, por `Accion.libre`) pinta antes de la dificultad dos
  selects: aplicado (Perspicacia por defecto) y habilidad ("Ninguna" por defecto); se mantienen mientras siga abierto,
  no se guardan. Motor: `tiradaLibre`/`etiquetaTiradaLibre` (`acciones.ts`), grupo propio `Libre`, montada con
  `montarTirada` sin especialidad y con la habilidad entera; `conExtrasDeFicha` no le añade nada (S84). En Acciones
  recientes, "Tirada libre (Reflejos + Sigilo)". También en el editor de NPC y el combate del máster, sin estrella.

### La fábrica: automatizar el desarrollo y el mantenimiento de Nueva Era ⬜ (épica; N1 construido 2026-10-19, en rodaje desde 2026-10-22)
**Cómo está hoy:** `fabrica/README.md` es la foto vigente (procesos, piezas, uso y qué se apunta dónde) y
`fabrica/historial.md` guarda los fallos. Esta entrada guarda el plan, lo abierto y las ideas: las ideas o mejoras que
salgan usándola van aquí, en "Ideas del rodaje".

**Qué es.** Una cadena de montaje para los cambios del proyecto: entra un encargo y sale una rama verificada que el
usuario aprueba y sube él. Sustituye al enfoque anterior de la épica ("automatizar el mantenimiento", procesos sueltos
P1–P9 y empezar por P1 + P2), que el usuario descartó por falta de un proceso de punta a punta con valor medible:
P1 y P2 eran piezas sueltas de su proceso manual, no resultados. Mapa visual, piezas y decisiones: artifact "Dosier
de mantenimiento", pestaña **Fábrica** (https://claude.ai/artifact/RRrCuBcYGau6F7shAvWQ5m). Respuestas del cuestionario
de decisiones: https://claude.ai/artifact/28x6AhJuyGxnfpM4vBqgbP.

**Las piezas (fijas en todos los niveles):**
- **Tolvas**: de dónde vienen los encargos. N1: solo el usuario. Después: MainPatcher (diff de Drive), Linear, bugs
  de la mesa.
- **Jefe de fábrica**: un LLM, el único con el que habla el usuario. Con el contexto de la conversación redacta el
  encargo y la spec con él (eso es el "tu ok" antes de construir), lanza la línea, informa, relanza y actualiza el
  panel. No juzga ni toca los criterios una vez congelados.
- **La línea**: guion de Workflow determinista. Orden, puertas y vueltas en código; ningún modelo se salta estaciones.
  Inspector de criterios (comprueba que cada criterio sea verificable y tenga oráculo, sin el sesgo del Jefe) →
  constructor (worktree aparte, rama `fabrica/T-xxx`) → revisión → juez → usuario.
- **Revisión** (N1): lo mecánico como script (tests, tsc y "push seguro": `SCHEMA_VERSION` con su paso en
  `migraciones.ts`, migraciones Prisma con su SQL, scripts que apuntan a prod) + un único revisor LLM (criterios y UI
  en navegador). N2: cuatro revisores especializados (Motor, Fidelidad, UI, Push seguro), cada uno con su oráculo.
- **Juez**: script con reglas fijas. Un criterio en "falla" devuelve el trabajo (máx. 2 vueltas); a la tercera o ante
  una duda de diseño, escala. Un LLM solo redacta el resumen.
- **Contrato**: `T-xxx.md` por trabajo, en main (`fabrica/trabajos/`; la rama lleva solo código, 2026-10-19). Encargo, Spec, Criterios
  (congelados, cada uno con su oráculo), Construcción, Revisión, Juicio, Decisión, métricas (vueltas, minutos, tokens,
  si se retocó antes del push) y una retro de dos líneas. Cada estación escribe solo su sección.
- **Panel**: un único artifact para todos los trabajos (no uno por feature): por trabajo, cada estación con su
  veredicto, una línea de resumen y el motivo si falló. Lo actualiza el Jefe. Más adelante, familiar-office (SIMs).
- **Permisos**: cada estación es un agente con herramientas en lista blanca + hook que bloquea push,
  `prisma migrate`, seeds y `.env`. El push es siempre del usuario.

**Decidido para el N1 (usuario, 2026-10-16):** solo tolva manual; todas las estaciones, aunque sean sencillas; "tu ok"
a la spec siempre; juez script; 2 vueltas; contrato en la rama; la rama incluye su línea de `tareas.md`; sin tope de
tokens pero medido; métricas en el contrato y resumen en `knowledge/` al cerrar el N1; se pasa al N2 cuando el usuario
lo sienta fiable, con las métricas delante. Vive en este repo, centrada en Nueva Era; cuando esté probada, el proceso
se documenta en `knowledge/` para replicarlo.

**Todo en una carpeta.** Las piezas viven juntas en `fabrica/` para poder visitarlas sin buscar por el repo:
`README.md` (mapa y uso), `jefe.md`, `estaciones/` (prompts de inspector, constructor y revisor), `contrato/plantilla.md`,
`guion/` (Workflow de la línea), `juez/`, `comprobaciones/` (scripts de la revisión mecánica), `hooks/` y `trabajos/`.
Gotcha: Claude Code solo descubre skills, agentes y workflows en `.claude/`; ahí van envoltorios finos que apuntan a
`fabrica/`, nada de lógica.

**Hecho (2026-10-19):** tandas 1-4 (papeles, barreras, línea y estrenos T-001-T-003, descartados con su rama
conservada) y primer trabajo real, T-004 (aprobado).

**Abierto:**
- Rodaje: usarla en el día a día y apuntar lo que salga (fallos al historial, ideas aquí abajo).
- Comprobar F-011 tras reiniciar sesión: el revisor con chrome-devtools `--isolated`, sin pisar otras sesiones.
- Forma exacta del panel (hoy, el visor de terminal `fabrica:ver`).
- Medio plazo: aislar la BD por trabajo (`CREATE DATABASE t014 TEMPLATE …` en el mismo contenedor, `.env` por
  worktree) y el puerto de Next por worktree. Mientras, un trabajo que toque el modelo de datos escala al usuario.

**Idea para más adelante (usuario, 2026-10-16):** un proceso "cambio mínimo" dentro de la fábrica, con menos pruebas
y menos informe, para arreglos de una línea. Hasta que exista, todo pasa por el proceso completo, sin excepciones.

**Idea para más adelante (usuario, 2026-10-16):** correr el script de revisión de la tanda 2 también como GitHub
Action en cada push.

**Medir el operario (usuario, 2026-10-19):** el operario de la línea es un LLM que ejecuta comandos y copia su salida.
Se queda, pero cada trabajo apunta en Métricas sus fallos/llamadas (`operario` del resumen de la línea). Si el ratio
pasa del 5 %, se juntan pasos en scripts más gordos (unas 4 llamadas por trabajo en vez de unas 10); si aun así da
guerra, o al llegar al cron (N5), se sustituye el Workflow por un orquestador en Node con `claude -p`.

**Visor de terminal (2026-10-19, hecho):** `npm run fabrica:ver` pinta un trabajo en vivo (estaciones, criterios,
última decisión del juez, cronómetro y fallos del operario) para tenerlo en un split de Ghostty. Para eso el
frontmatter gana `inicio`, `fin` y `operario`, que escriben `contrato.mjs estado` y el juez. No es el panel de la tanda 5.

**Escalera:** N1 línea a mano · N2 revisores especializados con oráculo · N3 tolva MainPatcher (examen: reproducir los
syncs commiteados, recall ≥95 %) · N4 sin "tu ok" a la spec en lo pequeño · N5 cron y panel vivo.

**Ideas del rodaje:**
- [x] **T-008** — Parser de "Puede tocar" (2026-10-23, F-016): `puedeTocar` (`fabrica/guion/contrato.mjs`) lee también
  las líneas sangradas de continuación de un punto y solo toma como ruta lo que lleva `/`, `.` o `*`; la plantilla
  explica el formato en un comentario junto a la etiqueta.

**Material de partida (2026-10-16):** inventario del mantenimiento en
`~/Documents/jcouce/knowledge/concepts/nuevaera-maintenance-cycle.md`; investigación externa en
`.../concepts/automated-agent-maintenance.md`; coliseo (escalera N1–N6, reglas de seguridad) en
`.../runs/2026-10-16-coliseo-nuevaera-maintenance/`. Lo útil de los P1–P9 está recolocado en la fábrica (tabla
"Lo del dosier, recolocado" del artifact).

### Fase 6b — Panel de combate en vivo ⬜ (MVP funcional cerrado 2026-09-11, pausada)
**Hoja de ruta con subtareas, para ir cogiéndolas una a una: `docs/fase-6b.md`.** No
dupliques su detalle aquí — actualiza ese archivo al cerrar cada pieza y, cuando la fase
entera esté hecha, esta entrada pasa a ✅ con un resumen de dos líneas.
**En duda (usuario, 2026-10-09):** no convence el modo combate en general; no se extiende
hasta replantearlo. Caso conocido sin decidir: desde E1b (especies) todas las pestañas
ven los estados de combate, así que si un estado baja la vida/fatiga máxima por debajo de
la actual se ve "11/9" (lo guardado no se recorta).

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

**RECURSOS — cargas de batería, munición, dosis, gastadas y recargadas en partida.**
Propuesta 2026-09-22, **diseñado y construido 2026-09-22.** No estaba en el MVP
cerrado de fase 6b — se añade como extensión aparte. Un personaje puede llegar a llevar
**6+ recursos distintos a la vez** (batería del Camuflaje, batería de la Malla
Plasmática, cargador de cada arma con capacidad propia, pilas del Visor Nocturno,
dosis del Inyector...) — no son dos campos más, es una lista de N recursos por
personaje, cada uno atado a una instancia de equipo concreta.

- **Precedente parcial, no la solución entera**: `ajustarRecurso()`
  (`master/combate/actions.ts:323-345`) resuelve el patrón de UI para PG/fatiga —
  delta manual, clamp a `[0, max]`, permiso para dueño del personaje **y** máster —
  pero PG/fatiga son una **foto snapshot dentro de `Combatiente`** (se pierde al
  cerrar el combate, confirmado en el propio schema). RECURSOS necesita lo
  contrario: persistir fuera de combate, igual que el equipo.
- **Dónde vive**: dentro del `Sheet` (`Character.stats` y `NpcTemplate.stats`), NO en
  `Combatiente`. Como `Character` y `NpcTemplate` comparten el mismo `Sheet`, el
  panel de NPC lo hereda gratis — sin trabajo aparte, incluida la edición manual
  fuera de combate (mismo patrón que atributos/habilidades del NPC hoy).
- **Estructura**: `recursos: { instanciaId, actual, max }[]` en el `Sheet`, por
  instancia de pieza equipada (dos armas iguales = dos totales independientes).
  Se auto-puebla al equipar una pieza con `célula` (Subsistema) o `municion`
  (ArmaFuego), y desaparece al desequiparla.
- **Dos comportamientos de recarga, afinados en dos rondas de feedback el
  2026-09-28** (probado en vivo por el usuario, dos correcciones seguidas):
  1. **Balas** (`ArmaFuego.municion`): recurso tipo **stock**, sin cargadores
     individuales que rastrear (se ignora cuál está puesto, igual que en mesa) —
     un único total. Empieza en `actual = max = municion` al equipar el arma.
     Comprar "cargador de balas normales": si el cargador puesto NO está lleno,
     **solo rellena** `actual` hasta el `max` actual (0/7 → 7/7, no 7/14 — "rellena
     las balas que faltan", no compra un cargador nuevo de más capacidad). Si YA
     está lleno (nada que rellenar), la compra **sí suma** una capacidad entera
     (`municion` del catálogo) a `max` Y a `actual` — comprar un cargador de
     repuesto (20/20 → 40/40), sin tope superior (la Carga Transportable es el
     límite natural, aunque sus penalizadores siguen sin mecanizar). Precio fijo:
     **50 créditos**, válido para cualquier arma (no depende de su capacidad).
  2. **Batería** (`Subsistema.célula`): recurso tipo **tope fijo** — el máximo es
     la capacidad de la célula y no cambia nunca. Comprar "batería portátil"
     **recarga** `actual` a `max`, sin más. Precio fijo: **150 créditos**.
  Los dos ítems de prueba para testear esto: **batería portátil** (150 cr.) y
  **cargador de balas normales** (50 cr.) — comprar es una acción de tienda de
  efecto inmediato, no dejan objeto en el inventario ni ocupan ranura. Solo se
  pueden comprar para piezas que el personaje ya tiene equipadas (mismo patrón de
  compatibilidad que mejoras de arma/`puedeInstalar`).
- **Compatibilidad de "balas normales"**: genérico para toda `ArmaFuego` balística,
  con excepción explícita de la familia de energía (Láser/Plasma/Rayo — 12 piezas
  marcadas `tipoMunicion: "energia"` en `equipo.ts`), que necesita su propio tipo de
  recurso. El Cañón de Plasma (`armamentoPesado.ts`) queda fuera a propósito —
  `ArmaPesada` no entra en este primer pase de RECURSOS (ver más abajo).
- **Gasto por disparo**: confirmado que no existe una tabla "Ráfaga" separada en el
  catálogo — solo `"Simple"/"Estándar"/"Compleja"` (un disparo) frente a
  `"... (F. Auto)"` (automático). Regla: modo sin "F. Auto" gasta **1**; modo con
  "F. Auto" gasta **fijo = `municion` del arma** (el "cargador completo" ya
  documentado en `equipamiento.md`, ahora sin cargadores físicos que rastrear — el
  número no cambia aunque queden más balas sueltas en el stock).
- **Avisos proactivos de insuficiencia** ("no tienes balas para F. Auto, pero sí para
  disparo simple") — información, no bloqueo. Amplía el mecanismo del §8 de
  `docs/modificadores-tiradas.md` a `arma`/`armaMelee`, que hoy lo excluye a
  propósito (`condicionesActivas` solo recorre `mejoraEstandar`/`subsistema`/
  `herramienta`).
- **El gasto en sí sigue sin automatizarse** — se queda manual (botones +/-), igual
  que PG/fatiga hoy.
- **Gasto de recurso de un NPC durante un combate: escribe sobre `NpcTemplate.stats`
  en vivo, no sobre el `sheet` congelado de `Combatiente`.** Decisión explícita del
  usuario (2026-09-22), a sabiendas de que esto rompe el aislamiento que ese snapshot
  busca a propósito (`master/combate/page.tsx:29-33`: "editar la plantilla después no
  afecte a un combate en marcha") — si el máster edita la ficha del NPC a mitad de
  pelea, se mezcla con lo que pasa en el combate. Aceptado sin más: es el máster
  quien lo tocaría, y el efecto es menor que el de otros campos ya mutables en vivo.
  Sin problema equivalente para jugadores: un `Combatiente`-jugador nunca lleva
  `sheet` propio, siempre lee/escribe su `Character.stats` en vivo.
- Precios de los dos ítems de prueba, decisión del usuario sin base en `EQUIP`
  (`sistema.md` S17/S18).

**Construido 2026-09-22.** `lib/rules/recursos.ts` (nuevo, funciones puras: capacidad
por pieza, reconciliación, delta manual, comprar recarga, gasto por modo de disparo),
`sheet.ts` (`SCHEMA_VERSION` 5→6, migración 5→6 en `migraciones.ts`),
`equipo.ts` (rules: `equipar()`/`desequipar()` reconcilian; catalog: `tipoMunicion` en
`ArmaFuego`), `combate.ts` (aviso de insuficiencia en `tiradaDeArmaFuego`),
`characters/[id]/actions.ts` + `master/npcs/actions.ts` (`ajustarRecursoAction`/
`comprarRecargaAction` y sus gemelas NPC), `RecursosTab.tsx` (nuevo, compartido entre
ficha de jugador y editor de NPC). 27 tests nuevos (`recursos.test.ts` + casos en
`sheet.test.ts`/`migraciones.test.ts`/`combate.test.ts`), 355 en total, lint y
`tsc --noEmit` limpios. Probado en navegador con cuentas nuevas de jugador y máster:
auto-poblado al equipar, gasto manual, aviso de insuficiencia en el modal de tirada,
recarga tipo stock (balas) y tipo tope (batería) por separado, bloqueo por fondos
insuficientes, y — hallazgo corregido en el propio testing — una pieza YA equipada
antes de que existiera RECURSOS no se auto-poblaba hasta tocar el equipo; arreglado
moviendo la reconciliación también a `parseSheet()`, no solo a `equipar()`/
`desequipar()`, para que cualquier ficha vieja se ponga al día en la primera lectura.

**Fuera de alcance de este primer pase, a propósito:**
- ~~`ArmaPesada`, `ArmaMelee` y `MunicionGranada` no aportan recurso — solo
  `ArmaFuego.municion` y `Subsistema.célula`.~~ — **granada ya no aplica**, ver
  "Granadas → recurso con cantidad, 2026-09-27" arriba: pasó a `sheet.granadas`, con
  su propio par comprar/ajustar en vez de encajar en `capacidadDePieza()`. `ArmaPesada`
  y `ArmaMelee` (el Cañón de Plasma y el resto de Armamento Pesado) se quedan para una
  extensión futura si hace falta.
- El gasto por modo usa la regla genérica confirmada en conversación (sin "F. Auto" =
  1, con "F. Auto" = `municion` fija), no el dato real por arma que da
  `equipamiento.md` en algunos casos — la Sydiasi, por ejemplo, documenta "consume 3
  disparos del cargador por ataque" en automático, no el cargador completo (20). Con
  la regla genérica se le cobran 20 en vez de 3. Decisión consciente tomada en el
  diseño (`docs/tareas.md`, "Gasto por disparo" arriba); un barrido pieza a pieza como
  el de `docs/equipo-efectos-especiales.md` lo afinaría si algún día compensa.
- No hay ningún atajo de +/- de recursos dentro de la consola de combate
  (`CombateConsole.tsx`) — el gasto de un NPC en plena pelea se hace desde su propia
  ficha (`master/npcs/[id]`), abierta aparte, no desde la fila del combatiente. La
  consola de combate no se tocó en absoluto en esta tarea.

### Equipo — efectos especiales por pieza ⬜ (casi cerrado; lo construible, hecho)
**Estado 2026-10-15.** "Efectos especiales" = lo que el texto de cada pieza promete más
allá de sus números (críticos, avisos, acciones propias); la tarea era que la app los
aplique o los avise al tirar. Lo construible está hecho. Queda abierto
(`docs/checklist-motor-vs-prosa-2026-09-24.md`, ítems sin marcar):
- **Esperando a Murillo:** Armaduras Avanzadas y el +1 de salvación (8d), shock/apagón en
  Tejido Conductor, Polímero Anticorrosivo y compañía (32), munición de la S.A.79 (34),
  Exoesqueleto sin armadura (35), daño de la Plaga (36).
- **Diseño pequeño propio:** Síntesis farmacológica (VTM nv1: no existe "Fabricar
  fármaco") y la Sydiasi (consumo fijo de 3, última de la cola a propósito).
- **Repaso sin hacer:** ids de `MotorMetadata` que no existen (`esquiva` en Sistema de
  Retroceso, `salv_ceguera_destello` en Visor Nocturno, `camuflaje_trifasico` como acción
  en Malla Plasmática) y el sacrificio de colchón de la Malla marcado construido con
  toggle 0/0 — detectado en la calibración de psiónica, sin comprobar si sigue.

Historial:

**Hoja de ruta pieza a pieza: `docs/equipo-efectos-especiales.md`.** El catálogo de
equipo (fase 3) transcribió fielmente el texto de cada pieza, pero columnas como
"Crítico de Fusión (11)" son hoy decorativas — no mueven ningún número ni avisan de
nada al tirar. La tarea: un mecanismo genérico en `TiradasTab` (aviso, no
auto-aplicación — la app no arbitra) más el barrido pieza a pieza para poblarlo con
datos correctos. Sin empezar la implementación todavía, solo el diseño y el primer
mapeo (familia de armas de plasma).

**Consolidación, actualizada 2026-09-23** (arrancó 2026-09-22 porque el barrido
llevaba `docs/equipo-efectos-especiales.md`, `docs/modificadores-tiradas.md` §8 y
`docs/sistema.md` acumulando hallazgos sin orden de prioridad claro). Resumen
priorizado — la fuente detallada de cada uno sigue viviendo en su documento.

1. **✅ Hechos 2026-09-23:**
   - 🐛 Bug: Soporte Vital duplicaba su +1 a `salv_fortaleza` (aplicaba +2 real) —
     corregido, un modificador por nivel.
   - Fix: `tiradaDeArmaMelee` ahora vuelca `arma.efectos` al `nota`, igual que
     `tiradaDeArmaFuego` — visible en Tiradas todo el "Crítico de X" de Combate
     Melee que antes solo se veía en la ficha de Equipo.
   - Perf: debounce por campo (`scheduleCommit`, `AUTOSAVE_DEBOUNCE_MS`) en
     atributos/habilidades — antes cada clic de un stepper disparaba un
     round-trip completo a la DB, detectado por el usuario en producción.
   - **§8 de `docs/modificadores-tiradas.md` construido entero**:
     `condicionesActivas(sheet, ctx)` + `alcance`/`nota` en `CondicionTirada` +
     enganche en `TiradasTab`/`TiradaModal`. Dos casos reales migrados (Visor
     Nocturno n2, Visor Térmico n1). Desbloquea Fase 5 y el resto del barrido de
     equipo que solo necesitaba texto informativo (Mangual, Camuflaje
     Trifásico — ahora son migración de datos, no arquitectura).
   - Barrido de Subsistemas terminado entero (Escudo Deflector, Malla
     Plasmática, Proyector de Pulso) — ver `docs/equipo-efectos-especiales.md`.
   - 322 tests pasan, lint y `tsc --noEmit` limpios en todo lo anterior. Push a
     `main` hecho hasta el commit de los quick-wins y el fix de rendimiento —
     el commit del §8 pendiente de que el usuario pida el push.

2. **Tanda de respuestas de Murillo recibida y procesada (2026-09-23).** Ver
   "Preguntas al diseñador" al final de este documento — la mayoría se resolvió
   (algunas con cambio de código: salto vertical, Proyector de Pulso construido
   entero); 31 (Bloqueo), 32 (shock/apagón), 8d (armaduras avanzadas) y 29
   (blindaje) siguen sin respuesta, son las que más bloquean ahora.

3. **Diseño pendiente que bloquea construcción real:**
   - **Hallazgo #3 — salvaciones sin especificidad** ("¿contra qué resistes?").
     Bloquea `arm2`/`me1`/`me5` y Munición Especial en cuanto se dé de alta
     (hallazgo #2). Detalle: `docs/equipo-efectos-especiales.md`, hallazgo #3.
   - **RECURSOS — extensión de Fase 6b** (ver entrada de arriba). Bloquea
     Conversión Psiónica (Derivación Psiónica) y previsiblemente poderes/dotes que
     gasten cargas o fatiga en Fase 5.

   **✅ Hallazgo #5 — absorción de daño por blindaje, construido 2026-09-27** — ver
   entrada propia en "Hecho" arriba. Sigue pendiente engancharlo a Mejora Ignífuga/
   Anticorrosivo n2/Tejido Conductor n2 y al "Ignora N de blindaje" de Kerzul.
   *(2026-10-23: Mejora Ignífuga nivel 1 ✅ construida, S85; Tejido Conductor n2 y el
   "Ignora N" de Kerzul ya estaban, ver Hecho. Ignífuga nivel 2 sigue pendiente.)*

   **Compartimento Oculto — falta una tirada ad hoc "Esconder objeto" (decisión
   2026-09-24, el usuario).** Los dos niveles prometen ocultar un objeto
   (pequeño en nv1, mediano en nv2) contra cacheos/escáneres — hoy solo es
   texto en `descripcion`, sin ninguna acción que lo use. La tirada nueva
   debe sacar una lista de las armas/objetos que el personaje lleva y que
   encajan por tamaño en el compartimento — no está diseñada todavía, solo
   decidido que hace falta. No confundir con el caso "sin tirada de portador"
   de `docs/motor.md` (objetivo_tercero): esto es al revés, falta una tirada
   PROPIA que hoy no existe.

4. **Decisiones del barrido de 2026-09-24, tomadas en conversación — pendientes de
   construir, ninguna con código todavía** (checklist de piezas concretas en
   `docs/checklist-motor-vs-prosa-2026-09-24.md`, bórralo cuando todo esto esté cerrado):

   - **✅ "Acciones sin dado" — construida 2026-09-27** (`AccionDirecta`,
     `acciones.ts` + `FilaUsar`/`UsarModal.tsx` — ver entrada propia en
     "Hecho", más arriba). De la lista original de candidatos: **Movilidad
     Aérea resultó NO necesitarla** — Máxima Potencia es un toggle dentro de
     la tirada normal "Volar" (ya construida, ver su propia entrada en
     "Hecho"), no una acción sin dado. Siguen pendientes, cada una con su
     propio prerrequisito sin resolver: **Malla Plasmática** (sacrificar
     puntos del colchón, activarla — bloqueada por el colchón sin diseñar),
     **Derivación Psiónica** "Conversión Psiónica" (bloqueada por Fase 5), y
     **consumibles con efecto real** (VTM, Estabilizadores Neurales —
     bloqueados por el gasto de consumibles al usarlos, que tampoco existe).
     **Nota rescatada de `docs/barrido-motor-2026-09-22/barrido-armaduras-
     subsistemas-pesado.md`:** Movilidad Aérea tiene un segundo hueco además
     de "Máxima potencia" (ya construida) — mientras se está volando, otras
     tiradas cambian (esquivar usa Tecnociencia en vez de Atletismo, -1 a
     ataques) y eso depende de un estado "¿está volando ahora mismo?" que el
     motor no rastrea en absoluto hoy. **Descartado 2026-09-28 (el usuario):
     no hace falta que esté en la app** — se lleva en mesa.
   - **✅ `arma.uso` (armas melee) se estructura — hecho 2026-09-28**, ver su
     entrada en "Hecho". Texto original de la decisión:
     Pasa de `string[]` suelto a algo que el motor pueda leer: empuñadura
     (una mano / dos manos / variable, con efecto propio para cada modo
     cuando es variable) + arrojadiza (se tira con sus propios modificadores).
     Nombre del campo sin cerrar del todo — candidato: alinear con
     `ArmaFuego.empleo` en vez de mantener el nombre `uso` distinto entre las
     dos familias. Comprobado 2026-09-24: hoy NO existe ningún mecanismo de
     "arrojar un arma melee" en la app (grep vacío) — el Cuchillo de Combate
     ya está marcado "arrojadiza" en prosa sin ningún botón que lo use.
   - **✅ Mira Telescópica integrada en fusiles de precisión — cerrado 2026-09-28,
     con la decisión de abajo corregida** (no se añade `ajusteTramo`, ver su
     entrada en "Hecho"). Texto original: Los 8 fusiles (Telum, Yivrem, K9K, Tshulok,
     Láser/Rayo de Largo Alcance, Plasma SS, Plaga) necesitan el mismo
     `ajusteTramo: {media:1, larga:1}` que ya tiene Mira Telescópica nv1,
     pero `ArmaFuego` no tiene hoy campo `ajusteTramo` (solo `NivelModulo`) —
     hay que añadirlo al tipo y sumarlo en `tiradaDeArmaFuego`
     (`combate.ts`) junto a `bonosTramoDeMejoras()`. **Sin verificar (rescatado
     de `docs/barrido-motor-2026-09-22/barrido-armas-fuego.md`):** falta
     comprobar contra `docs/equipamiento.md` fila por fila si `mejorasAdmitidas`
     de estos 8 fusiles YA descuenta la ranura de la mira integrada o no —
     si no la descuenta, dar el bono sin tocar `mejorasAdmitidas` sería
     regalarles una ranura de más.
   - **✅ Crítico parametrizable — hecho 2026-09-28, VTM nivel 4.**
     `resolverTirada()` gana `margenCriticoExito` (por defecto `MARGEN_CRITICO`,
     el lado de pifia nunca cambia). Cómo se activa: idea del usuario en
     conversación — en vez de aplicarlo a ciegas a cualquier tirada de
     Biociencia, la VTM nivel 4 añade un selector nuevo ("Herida normal" /
     "Estado complejo, estabilización o síntesis") a la propia tirada "Tratar
     heridas", mismo mecanismo de `alcance: {tiradaId: "medicina"}` que ya usa
     Visor Nocturno (`medicina.ts`, `condiciones` del nivel 4) — cero
     arquitectura nueva. Elegir "complejo" pasa `margenCriticoExito: 0` en
     `tirar()` (`AccionesTab.tsx`). A propósito, no se extiende a las tiradas
     de fármacos (Gel Sanador, etc.) aunque la prosa también las mencione —
     alcance deliberadamente acotado a "medicina", ampliable luego si hace
     falta.
   - **✅ Diagnóstico profundo — hecho 2026-09-28, VTM nivel 3.** "Dedicándole
     1 minuto da +2" es un toggle nuevo en `medicina.ts` (`vtm_diagnostico_profundo`,
     mismo `alcance: {tiradaId: "medicina"}` que el de arriba) — a diferencia
     del crítico, este es un bono numérico normal (`valorActivo: 2`), así que
     entra solo por `valorCondiciones()`/`desgloseCondiciones()`, sin tocar
     `tirar()`. Se acumula con el selector de nivel 4 (S9, `acumulaPorClave`):
     con la VTM en nivel 4 salen los dos controles en el modal.
   - **⬜ Síntesis farmacológica (VTM nivel 1) — pendiente, apuntado para más
     adelante, no confundir con "aparcado por bloqueo del diseñador".** Hoy no
     existe NINGÚN mecanismo de "Fabricar un fármaco" en la app (comprobado:
     grep vacío) — solo se compran ya hechos en la Tienda. La prosa promete
     Perspicacia + Biociencia (Bioquímica), dificultad base 7 + 2 por rango de
     rareza superior del compuesto, acción compleja, con "gran pureza" en
     crítico. Antes de construirlo hay que decidir: ¿gasta el pool de
     Materiales que ya existe (Fabricar/Reparar, tarea 8) o algo nuevo
     ("cartuchos y componentes" que cita la prosa de nivel 1)?, y qué significa
     "gran pureza" en la ficha (¿+1 de efectividad, doble duración — ninguno
     de los dos se rastrea hoy?). Candidato natural: mismo patrón que
     Fabricar/Reparar de Materiales, pero para `sheet.farmacos` en vez de
     equipo.
   - **Sin código, es comunicación de mesa — decidido para varios casos del
     barrido.** Mismo criterio que "objetivo_tercero sin tirada de portador"
     (`docs/motor.md`): si el efecto es un coste de acción o un dato que
     nadie tira (desenfundar/recargar en acción compleja, duración en horas
     de una batería), ya se ve en la card de Equipo/Tienda — no hace falta
     construir nada. Aplica a: Escudos (levantar cuesta acción simple/
     estándar), Lanzallamas Ligero y Lanzagranadas pesado (desenfundar/
     recargar complejo), Soporte Vital (72h/24h de autonomía).
   - **Visor Térmico nv1 — NO es un hueco, revisado 2026-09-24.** El toggle
     "Modo térmico activo" (`mejorasEstandar.ts`) ya está a propósito con
     `valorActivo: 0` — mismo caso que Visor Nocturno n2, el -3 depende de si
     lo mirado está fuera del gradiente térmico, algo que el motor no puede
     saber, así que se informa (nota) en vez de auto-aplicarse. El hallazgo
     del barrido era un falso positivo. No tocar.
   - **Polímero Anticorrosivo nv1 — no es pregunta nueva, ya está la 32.** El
     "no susceptible a shock" que falta es el mismo hueco que la pregunta 32
     de `docs/sistema.md` (shock/apagón sin definir) — espera a esa
     respuesta, no duplicar la pregunta a Murillo.
   - **Radar nv4 — decidido 2026-09-24, resuelto sin estado ni cálculo.** Nada
     de trackear "quién está marcado" ni leer cobertura/camuflaje por código
     (se descartó esa vía). Es un ad hoc como Proyector de Pulso ("Marcar
     objetivo", acción custom que tira o no tira dados) más un texto fijo en
     las tiradas de ataque — mismo patrón `nota_fija`/`Accion.efectos` de
     hoy — tipo "-X de dificultad contra cobertura al objetivo marcado": el
     jugador aplica el número a mano. Encaja en lo ya construido.
   - **✅ Disfraz Holográfico nv2 — declarado 2026-09-28. Decidido 2026-09-24: los dos efectos son
     `narrativo`.** "Reduce el rediseño a 1 min" y "mitiga penalizaciones por
     envergadura" (concepto que no existe en ningún otro sitio del sistema)
     se quedan como texto informativo, mismo patrón que la VTF — solo falta
     declarar bien el `motorMetadata`, no hay lógica que escribir.
   - **Derivación Psiónica nv1 — decidido 2026-09-24: aparcado dentro de Fase
     5, no es pregunta suelta.** El +1 que cubre tanto "retroceso" como
     "desorientación" psiónica no tiene tirada para lo segundo porque la
     psiónica en sí no está dada de alta todavía (bloqueada por el
     diseñador, ver Fase 5 arriba) — normal que falten conceptos. Se resuelve
     cuando llegue esa fase, no antes.
   - **Estabilizadores Neurales — decidido 2026-09-24: se aborda junto con
     VTM, no aparte.** Mismo bloqueo (acción sin dado) y de propina: los
     consumibles/fármacos hoy no tienen NINGÚN mecanismo de "se gastan al
     usarlos" (`recursos.ts` solo trackea arma/subsistema con célula) — hay
     que construir también el gasto, no solo el efecto de curar "aturdido".
   - **✅ Munición en Tienda — hecho 2026-09-28**, ver "Munición en Tienda +
     Munición Especial, fase 1" en "Hecho".

   **Malla Plasmática — falta el "colchón"/segunda vida (decisión 2026-09-24,
   el usuario).** Los 4 niveles prometen un buffer de puntos de golpe que
   absorbe daño y se regenera por turno, activo mientras el subsistema esté
   encendido — no hay ningún recurso de personaje parecido hoy (`docs/motor.md`
   ya lo señala: "buffer temporal sin nombre en capa 2 y media"). Se activa al
   equiparse la pieza — básicamente una segunda barra de vida temporal. Sin
   diseñar el mecanismo exacto (¿vive en `Combatiente` como PG/fatiga, o es un
   recurso de instancia como munición?) — solo decidido que hay que
   construirlo, no forzarlo dentro de PG.

   **Sydiasi — arma pesada de arreglar, deliberadamente la última de la cola
   (decisión 2026-09-24, el usuario).** Dos problemas propios, ninguno nuevo
   de hoy — el barrido solo los reencontró:
   - **Consumo de munición**: la prosa dice "consume 3 disparos" en modo
     automático; `gastoDelModo()` (`recursos.ts`) le cobra el cargador
     entero (20) por la regla genérica (sin F.Auto = 1, con F.Auto =
     cargador completo) — **decisión consciente ya tomada** al construir
     RECURSOS (ver más arriba, "Fuera de alcance de este primer pase").
     Sin decidir todavía: ¿sigue mereciendo la pena la regla genérica, o la
     Sydiasi pasa a ser el caso especial con consumo fijo de 3?
   - **"A dos manos elimina el penalizador de retroceso"**: sin construir.
     Ya analizado en `docs/equipo-efectos-especiales.md` (2026-09-12): un
     toggle plano tipo Bípode no vale porque `condiciones.ts` no soporta
     "este toggle solo cuenta si el modo elegido es F.Auto" — se aplicaría
     también en modo Simple, donde no hay penalización que quitar. Sin
     decidir: ¿parche ad hoc solo para esta pieza, o generalizar
     `condiciones.ts` para toggles condicionados a otra condición (útil si
     aparecen más casos)?

5. **Rescatado 2026-09-24 de `docs/barrido-motor-2026-09-22/barrido-melee-medicina-
   herramientas.md` antes de borrarlo** (ese archivo era clasificación estructural
   puntual, ya cumplió su función — esto es lo único que no estaba ya en
   `docs/equipo-efectos-especiales.md` ni en `docs/sistema.md`):
   - **`defensa.puntosGolpe` de Escudos (durabilidad/roto) — construido 2026-09-25,
     ver tarea 8 más abajo.** `defensa.blindaje` — construido 2026-09-27 dentro del
     Hallazgo #5, ver su entrada en "Hecho".
   - **Mangual — "ignora N de Cobertura física" en modo Estándar.** Modificador
     numérico condicionado al modo, mecanizable con el mecanismo 1 de
     `modificadores-tiradas.md` en cuanto se decida a qué tirada de "cobertura"
     apunta — la cobertura en sí no tiene mecanismo en el motor todavía (mismo
     hueco transversal que toca a Radar nv4 y a los Escudos).
   - **Armas Mecánicas (Hoja Dentada, Guantelete de Pistón, Sierra Circular,
     Martillo de Pistón, Ariete Percusivo — 5 piezas), acción Compleja.**
     "Ignora 1 nivel de armadura" (el Hallazgo #5 ya calcula el blindaje del
     defensor, `blindajeContra()`, pero ninguna tirada de ataque está enganchada
     a esa función para restarle nada todavía) y "Derribo (N)" — que aquí necesita un
     estado `Derribo` que no existe en el catálogo de 23 estados
     (`sistema-y-combate.md`), distinto del Derribo de escopetas del barrido de
     hoy. Ariete Percusivo además: "doble daño contra estructuras" — no existe
     concepto de "objetivo estructura" en el motor (todo objetivo es un
     `Combatiente`), narrativo por ahora.
   - **Retroceso entrópico (las 10 armas Kerzul).** Peor que "sin mecanizar": ni
     siquiera se muestra en la UI — solo vive en un comentario de cabecera del
     catálogo (`armasMelee.ts`). Necesitaría su propia acción/reacción
     ("Salvación por retroceso entrópico") que hoy no genera ninguna fila en
     Acciones para ninguna de las 10 piezas.
   - **Xovromium — sin tirada fija de "manifestación psiónica".** Mismo
     bloqueo que Derivación Psiónica (arriba): depende de que exista Fase 5
     (Poderes). No urge.
   - **Materiales Sofisticados/Avanzados — el +2/+4 a `tecnica` queda
     APARCADO (decisión del usuario, 2026-09-25): es un fallo de diseño, la
     rareza del material debe ser la capacidad para construir/reparar cosas
     más raras, no un bono numérico a la tirada.** Absorbido por la tarea 8
     de abajo (Fabricar y Reparar), que sustituye por completo esta entrada.

6. **Rescatado 2026-09-24 de `barrido-armaduras-subsistemas-pesado.md` y
   `barrido-armas-fuego.md`** (mismo `docs/barrido-motor-2026-09-22/`, antes
   de borrarlos — lo que no estaba ya en `equipo-efectos-especiales.md` ni en
   `sistema.md`):
   - **Bayoneta — ✅ IMPLEMENTADA 2026-09-25.** `tiradaGolpeBayoneta`/
     `tiradaBloqueoBayoneta` (`combate.ts`), mismo patrón que
     `tiradaDeLanzagranadas`: se generan solo si la mejora Bayoneta está
     instalada en esa instancia del fusil/escopeta. Dos huecos que la prosa
     no cerraba, decididos por el usuario: hereda el mismo crítico que el
     Cuchillo de Combate (Hemorragia 1d6 turnos, no solo el daño) y lleva
     Bloqueo, igual que cualquier arma melee del catálogo.
   - **Funda Automática / Inyector Hipodérmico — "cambia el coste de una
     acción" no encaja en ninguno de los cinco tipos de `docs/motor.md`.**
     No es modificador de acción (no crea una acción nueva), no es numérico
     (no hay número), no es habilitador (no activa/desactiva, cambia el
     *coste* de algo que ya se puede hacer). El motor no tiene concepto de
     "coste de acción"/economía de turnos en absoluto. Sexto caso sin
     encajar limpio — a discutir, no forzarlo en los cinco existentes.
   - **Proyector de Pulso — el gasto por modo no encaja en `gastoDelModo()`.**
     Ese helper (RECURSOS) solo entiende dos casos: 1 bala, o cargador
     completo con F.Auto. El Proyector tiene 4 modos con su propio gasto fijo
     cada uno (Pulso 1, Pulso Cargado 4, Barrido 5, Aguijón 1) — no binario.
     Hace falta generalizar el helper el día que se construya su tirada
     (Hallazgo #1, ya conocido aparte).
   - **Proyector de Pulso — "-5 al sigilo al disparar" es un tercer momento
     de activación que ningún mecanismo cubre.** No es "siempre activo
     mientras se lleva puesto" (mecanismo 4) ni "elegido por el jugador al
     tirar" (mecanismo 1) — es consecuencia de **haber ejecutado la acción
     de disparar ese turno**. Ni permanente ni a elección, sino "tras esta
     acción concreta". Puede que haga falta un mecanismo nuevo cuando se
     generalicen los mecanismos de entrega en `docs/modificadores-tiradas.md`.
   - **✅ Lanzagranadas (Integrado y pesado), nota interpolada — hecho
     2026-09-27.** `tiradaDeLanzagranadas`/`tiradaDeArmamentoPesado`
     (`combate.ts`) ya no pintan el texto genérico fijo ("Área y efecto según
     la granada elegida"): `condicionModo()` gana un `nota?` opcional por
     modo, y cada granada del selector lleva su `areaEfecto` real como nota
     de esa opción (mismo mecanismo del §8, opción con nota condicionada —
     `OpcionCondicion.nota` ya lo soportaba, no hacía falta arquitectura
     nueva). Las dos entradas de `MOTOR_GRANADA` (`municion.ts`) pasan de
     `nota_fija`/"pendiente" a `eleccion_jugador`/"construido" — el mecanismo
     cambia porque ahora depende de qué granada elige el jugador al tirar, no
     es un texto siempre presente. Tests nuevos en `combate.test.ts`.
   - **Granada PEM — condición sobre el TIPO del objetivo ("solo afecta a
     sistemas y sintéticos"), eje nuevo sin precedente.** No es "tirada de
     tercero" (eso ya tiene hueco nombrado, objetivo_tercero) — es que el
     efecto depende de **qué ES** el objetivo, no de quién tira ni de qué
     tirada es. El motor no tiene ningún concepto de "tipo de objetivo" hoy
     (sintético, orgánico o cualquier otro). Sin forzar en ningún tipo
     existente.

7. **El barrido pieza a pieza en sí sigue mereciendo terminarse** (quedan ma2/ma4
   de Mejoras en Armas de Fuego, Munición, Otras Armas a Distancia, Armas
   Modificadas) — barato (lectura + anotación), da el mapa completo. La mayoría de
   lo ya marcado `✅ IMPLEMENTAR` con texto informativo ya se puede construir de
   verdad (el §8 existe); lo bloqueado por Hallazgo #3/#5 sigue esperando diseño.

8. **Fabricar y Reparar — feature nueva, diseñada 2026-09-25, en construcción.**
   Nace de dar de alta el bono de Materiales (arriba) y del hallazgo de
   `defensa.puntosGolpe` de Escudos sin mecanismo (ítem 5) a la vez — el
   usuario decidió unirlos en una sola pantalla dentro de la pestaña
   **Acciones**, con dos áreas independientes. Diseño cerrado:
   - **Materiales pasa de `Consumible` equipable a un recurso con cantidad**,
     un pool de personaje (no por instancia) con 3 contadores — Sencillos/
     Sofisticados/Avanzados —, comprado por unidades al precio ya transcrito
     en `herramientas.ts` (250/500/750). Vive junto a RECURSOS, no en
     `sheet.equipo`; las 3 piezas dejan de listarse en la Tienda.
   - **Reparar (hoy solo Escudos, vía `defensa.puntosGolpe`):** reutiliza
     `sheet.recursos` con un `TipoRecarga` nuevo (`"durabilidad"`,
     `capacidadDePieza()` en `recursos.ts`) en vez de un array aparte — se
     reconcilia solo al equipar un escudo, mismo mecanismo que ya reconcilia
     munición/batería. Gastar **1 unidad de material de rareza ≥ la del
     escudo** repara del todo (`actual = max`), sin tirada asociada (la
     conexión recursos↔tiradas se deja para cuando la feature esté cerrada,
     decisión del usuario). **Área siempre visible, sin requisito de VTF.**
   - **Fabricar:** coste en materiales = **precio de catálogo completo**
     (fuente: `docs/equipamiento.md:1130`, "igualar el precio del objeto" —
     NO precio/2, se descartó esa idea). Rareza mínima = la del objeto;
     cualquier tier de material ≥ esa rareza vale, el jugador elige de qué
     tier paga (un solo tier, sin combinar varios). Alcance v1: solo piezas
     "sueltas" sin nivel y sin host (armadura, arma, armaMelee, consumible,
     armaPesada, munición/granada) — ni instalables (mejora/subsistema/
     movimiento, necesitan elegir host) ni Herramientas con nivel (VTF,
     Radar...). La UI solo manda el `catalogoId`; al fabricar se añade a
     `sheet.equipo` exactamente igual que `equiparAction` (mismo `equipar()`,
     mismo `nuevaInstanciaId()`), pagando en materiales en vez de créditos.
     **Área visible solo con la VTF (`valija_tactica_fabricacion`) equipada
     — cualquier nivel, la VTF no gatea rareza, solo dificultad/tiempo/
     recuperación de materia prima (`herramientas.ts:36-105`).**
   - Servidor recalcula todo con el catálogo, igual que `equiparAction`
     (nunca confía en lo que mande el cliente).
   - Etapas de construcción: 0) quitar Materiales de la Tienda, 1) pool de
     materiales + compra, 2) durabilidad de Escudos + reparar, 3) fabricar +
     gating VTF + UI en Acciones, 4) esta documentación. Commit por etapa.
   - **Corrección 2026-09-25 (segunda revisión del usuario, tras la primera
     versión sin dado): Fabricar SÍ exige tirada** — la primera pasada de la
     etapa 3 la había dejado como acción sin dado igual que Reparar, pero
     `docs/equipamiento.md:1078-1081` sí pide una: Perspicacia + Tecnociencia
     o Biociencia, dificultad base 7 +2 por rango de rareza superior, éxito
     crítico da "gran calidad" (sin mecanizar todavía, aparcado a propósito).
     (Reparar se dejó sin tirada en esta primera pasada — corregido justo
     debajo, tercera revisión.)
     - **Dónde y cómo:** al pulsar "Construir" en `FabricarSeccion.tsx`
       (dentro de Reparar y Fabricar, con pieza y tier ya elegidos) se abre
       el mismo `AccionModal` que cualquier otra tirada de la app — misma
       animación de dado, mismo desglose, mismo veredicto. Vive montado
       localmente ahí (no en el `modal` único de AccionesTab.tsx) para que
       cerrar el resultado devuelva al jugador a la categoría/pieza que tenía
       abierta en el catálogo, en vez de mandarlo de vuelta a la pestaña.
       Sí reutiliza `historial`/`memoria` (props ya levantadas en
       CharacterSheet.tsx) para aparecer en "Acciones recientes" y recordar
       la última dificultad, igual que cualquier tirada.
     - **Qué pasa según el resultado (decisión del usuario):** el material
       se gasta SIEMPRE, salga lo que salga. Con éxito, además, se entrega
       la pieza (`fabricar()`, `rules/equipo.ts`, nuevo parámetro `exito`);
       con fracaso, no. La tirada no bloquea el botón — no hay infraestructura
       en el motor para que un resultado de tirada condicione una mutación de
       ficha (mismo caso que disparar no gasta munición solo), y esto no la
       inventa solo para esta feature.
     - **NPCs (edición libre de máster) no tiran:** `libre` (prop nueva en
       AccionesTab/ReparaFabricaModal/FabricarSeccion, mismo patrón que
       `AtributosTab`/`HabilidadesTab`) salta la tirada — Construir gasta y
       entrega en el acto, `fabricarNpcAction` sigue llamando a `fabricar()`
       con `exito: true` fijo.
     - Probado en vivo (QA-MOTOR-TEST: fracaso crítico con gasto de material
       sin entrega, luego éxito con entrega; NPC de prueba: sin tirada,
       entrega directa).
   - **Corrección 2026-09-25 (tercera revisión, "tiene que ser igual que lo
     otro"): Reparar también exige tirada.** Misma prosa de la VTF
     (`docs/equipamiento.md:1095-1099`): Perspicacia + la habilidad técnica
     aplicable, con **-4 a la dificultad** respecto a Fabricar (base 7 +2 por
     rango, -4 por ser reparación — `dificultadReparar()`,
     `ReparaFabricaModal.tsx`). No se reparte por "cada dos/cuatro éxitos"
     como la prosa general de daño por categorías: los Escudos son un pool de
     PG, no categorías, así que sigue siendo restaurar `actual = max` de un
     golpe — solo que ahora condicionado al éxito de la tirada, igual que
     Fabricar. Mismo patrón exacto: `AccionModal` montado localmente en
     `ReparacionSeccion` (dentro de `ReparaFabricaModal.tsx`, no en el
     `modal` único de AccionesTab), material gastado siempre, reparación solo
     con éxito, NPCs (`libre`) sin tirada. `repararPieza()` (`recursos.ts`)
     gana el mismo parámetro `exito` que `fabricar()`.
   - **Mensaje de efecto (2026-09-25, pedido del usuario tras probar la
     tirada):** el modal de la tirada de Fabricar/Reparar muestra, solo tras
     resolver, una línea con el efecto real — "Has construido: X." / "Has
     reparado: X." si hay éxito, "Has perdido los materiales." si no.
     `AccionModal.tsx` gana la prop opcional `notaResultado` (solo se pinta
     junto al resultado, nunca antes de tirar) — el resto de tiradas de la
     app no la pasan, así que no les afecta. De paso, se corrigió un fallo
     real detectado al construir esto: cuando `dificultadInicial` no
     coincidía con ningún botón fijo (el 3 de Reparar Común, 7-4), el campo
     "custom" se quedaba vacío en vez de mostrar el número — la tirada ya lo
     usaba bien internamente, era solo un fallo de visualización.
   - **Corrección 2026-09-25 (revisión del usuario, "¿aplicamos los niveles
     de la VTF?"): la dificultad ignoraba el nivel de la VTF equipada.**
     `tieneVtf()` era la única consulta a la VTF en todo el flujo — un
     booleano, sin nivel. Pero `docs/equipamiento.md` liga la dificultad de
     Fabricar (y por tanto la de Reparar, que es "la de fabricar, -4") al
     nivel: desde la VTF nivel 2, "Fabrica objetos poco habituales con la
     dificultad de los comunes" — SOLO Poco Habitual baja de rango, el
     documento no dice nada de Extraño/Muy Extraño, así que esos rangos no
     bajan ni con VTF nivel 4. El beneficio de nivel 2 persiste en 3 y 4 por
     acumulación de niveles (S9). `nivelVtf(sheet)` y
     `dificultadFabricacion(rareza, nivel)` (nuevas, `rules/equipo.ts`)
     sustituyen el cálculo suelto que había en `FabricarSeccion.tsx`/
     `ReparaFabricaModal.tsx`. Con tests (`equipo.test.ts`) y probado en vivo
     (VTF nivel 2, Pico de Cuervo Poco Habitual: dificultad sugerida 7, antes
     habría sido 9).

### Aumentos ✅ salvo lo que espera a Murillo (A0-A7 commiteadas, 2026-10-23)
**Las tandas de `docs/propuesta-aumentos.md` están cerradas.** Lo que queda espera a Murillo
(ver "Pendiente de Murillo" al final de esta sección; detalle en `sistema.md` §11.2 y en la
propuesta §5) o a la tarea de psiónica biológica (IRM: sobreesfuerzo y `habilita_psionica`).
Encargo y pasos: `docs/prompt-aumentos.md`. Fuente literal:
`docs/aumentos.md` (26 operaciones genéticas y 11 implantes; **5 implantes en proceso**,
de Control Anímico al final: no se modelan hasta la próxima foto de Drive). Decisión del usuario: entran
como **familia de equipo** (chip propio, Tienda, la bolsa del humano paga primero).
- [x] Transcripción fiel `docs/aumentos.md` (erratas para Murillo al final).
- [x] `sistema.md` §11 (dos ramas, lo que no dice) y §14.6 (bolsa 70.000); preguntas 11 y 20
  reabiertas.
- [x] `MODELO_AUMENTOS` enseñado al usuario → `modelar-area` → `docs/modelado-aumentos.md`.
- [x] Cuestionario de decisiones (2026-10-16, https://claude.ai/artifact/2ycU8EYmku9YBAVAFyJXgG):
  respuestas en `sistema.md` §11.3.
- [x] Segunda y tercera ronda de preguntas (`/preguntas`, área Aumentos, 2026-10-22):
  respuestas en `sistema.md` §11.3 y aplicadas en `docs/modelado-aumentos.json`.
- [x] `docs/propuesta-aumentos.md` con tandas (A0-A7). Falta la luz verde y las 3 decisiones de su §4.
- [x] A0 · Catálogo, Tienda y ficha (incluye la bolsa a 70.000). *(commiteada y probada en
  el navegador)* `catalog/aumentos.ts` (32 piezas, test cruzado con el JSON),
  `rules/aumentos.ts` (`comprarAumento`, `aumentosConRequisitoRoto`), ficha v18
  (`PiezaEquipada.eleccion`, `bolsaAumentosGastada`), chip "Aumentos" en Tienda y en Equipo,
  `comprarAumentoAction` y `comprarAumentoNpcAction`.
- [x] A1 · Atributos y derivados. *(commiteada y probada en el navegador)*
  `modificadoresDeAumentos` (+1 con origen "aumento", sin techo), requisitos de dote con
  aumentos (`modificadoresDeRequisito`), `rebajaCosteHabilidad` solo aprobada
  (`FichaResuelta.ajusteCosteSubida`, `ajusteXp` en el servidor), Hipertrofia
  (Modificador `multiplicadorVida` en `salud()`) y `retirarPieza` (recorta la vida al
  desequipar).
- [x] A2 · Tiradas: bonos, ventajas y casillas.
  - [x] A2a · Canal de casillas, selector "Contra…" de salvaciones, `noApila`, Alerta
    pasiva y armadura natural. *(commiteada y probada en el navegador)*
    `rules/aumentosTiradas.ts` (`casillasDeAumentos`, `textosDeAumentos`,
    `notasAlertaPasivaDeAumentos`, `armaduraNaturalDeAumentos`) al índice de condiciones y a
    `textosTirada` en `resolverFicha`; `OpcionCondicion` con `ventaja`/`costeFatiga`/`partes`;
    `noApila` en `montarTirada` y `bonoDerivado` (Ojo con la Mira Telescópica); armadura
    natural en `desgloseBlindaje`.
  - [x] A2b · Alcance `aplicado:<a>`, casillas de la rama cognitiva, Foveo, Iniciativa,
    Proyección/Matriz Actitud y textos de tirada. *(commiteada y probada en el navegador)*
    Alcance `{ tipo: "aplicado" }` (`alcanzaA` con `ContextoAccion.aplicado`, índice
    `porAplicado` con los aplicados posibles; `montarTirada` deja sin efecto las que no casan
    con el aplicado de verdad: `casillasSinEfecto`); `ahorroFatiga` en el toggle
    (`costeFatiga` neto y `ahorroSinUsar`, que `usarPoder` resta del poder);
    `prepararPoder` consulta el índice (`indiceCondiciones`); `FichaResuelta.ventajasFijas`
    (Red Frontoparietal) en `conExtrasDeFicha`; `DestinoTexto` por grupo y por aplicado.
- [x] A3 · Penalizadores. *(commiteada y probada en el navegador)*
  `reducePenalizador` en el catálogo; `ajusteUmbralesDeAumentos` (Estabilización) sumado al
  de especie con `sumaAjustesUmbrales` (`resolverFicha`, fuente combinada en el desglose);
  Neurogénesis como compensación con alcance `aplicado` (`reduccionesPorAplicadoDeAumentos`,
  6.º parámetro de `modificadoresDeUmbrales`, nunca pasa de 0); casillas de cobertura de
  Foveo y Ojo 2-4 (grupo `noApila` `reduccion_cobertura`) en ataques a distancia y
  Buscar/percibir; Matriz Ósea como nota en la carga (`notasCargaDeAumentos`).
- [x] A4 · Acciones propias y "una vez por escena".
  - [x] A4a · Contador por escena y acciones sin dado. *(commiteada)* Ficha v19 (`sheet.usosEscena`, `rules/usosEscena.ts`): casillas con
    `usoPorEscena` (Mielinización, Proyección, Matriz de Red) que `montarTirada` devuelve en
    `usosEscena` solo si tienen efecto y se gastan al tirar (`gastarUsosEscenaAction`);
    gastadas salen `bloqueada` ("Usada esta escena", `conUsosEscena` en el índice); lista con
    "Liberar" y "Terminar escena" en Recursos (`liberarUsoEscenaAction`); `terminarEscena` y
    el "Limpiar estados" del máster (`limpiarEstadosDeJugadores`) las vacían, sin registro.
    `rules/aumentosAcciones.ts` (`accionesDeAumentos` → `FichaResuelta.accionesAumentos`,
    sección "Aumentos" de Acciones): combinada, hemorragias, miedo, MQE (mensaje, telemetría
    y fila informativa de defensa por nivel) y Enjambre (sanar letal y grave).
    `usarAccionAumentoAction` cobra en el servidor y, con `cambiarEstadosDePersonajes`, quita
    Hemorragia o Miedo (o baja Aterrorizado a Asustado) con entrada de registro deshacible
    (autor: el jugador).
  - [x] A4b · Barrido electromagnético, Tempestad Nanobótica, Densificar e Incorporar arma.
    *(commiteada)* `accionesDeAumentos` devuelve `filas` en orden
    (directas y tiradas mezcladas; `directas` sigue para el servidor) y la sección "Aumentos"
    las pinta así. Acciones con dado (`tirada` en `AccionAumentoCatalogo`): Barrido en la
    opción Percepción Electromagnética de Introgresión (ampliar a 30 m, a 60 m por 1 de
    fatiga y la tirada de Perspicacia + Exploración), Incorporar arma del Brazo (Perspicacia +
    Biociencia, dificultad 8, `especialidadesAccion: ["bionica"]`) y Tempestad Nanobótica
    (Reflejos + Tecnociencia, dificultad 0; `Accion.costeFatiga` que `montarTirada` suma al
    cobro de fatiga al tirar, y `ataque.sinBonoExitos` para el daño fijo de 1 grave).
    Densificar: `blindajeReactivo` del Enjambre 3, `casillaBlindajeReactivo` y el 5.º
    parámetro de `desgloseBlindaje` (`blindaje.ts`); "Bloquear daño" cobra al marcar y
    devuelve al desmarcar (`onAjustarFatiga` nuevo en AccionesTab).
- [x] A5 · Activables.
  - [x] A5a · Capa de activables, Neuroprótesis 1-2 y Proyección (commit 0567b20). Efecto `activar` en `AccionAumentoCatalogo` (con `eleccion` en la
    Neuroprótesis 2: selector `ID_ELECCION_ACTIVABLE` en el modal) que cobra y pone un estado
    propio (`ESTADOS_DE_AUMENTO` en `catalog/estados.ts`: `aum_neuroprotesis` con grados
    activo/fuerza/agilidad, `aum_proyeccion`; fuera del selector del máster) por
    `usarAccionAumentoAction` → `cambiarEstadosDePersonajes` (cobro en `preparar`, registro
    deshacible). Reactivar sustituye (renueva); fila "Desactivar" generada con el estado
    puesto (efecto `desactivar`, sin coste, también sin la pieza). `activo` en la operación o
    en el nivel del implante y `rules/aumentosActivables.ts` (`efectosDeActivables`, estado +
    pieza que funciona): atributos con origen "estado" (fuera de `requisitosDotes`),
    `reducePenalizadores` (ajuste de umbrales + compensación por penalizador de estado en
    `modificadoresDeEstados`), salvaciones al "Contra…" (`casillasDeAumentos`, 2.º parámetro) y
    Modificador `anulaPenalizadores` (Proyección en Actitud, `conPenalizadoresAnulados` en
    `montarTirada`; Neurogénesis lleva `compensa`). Chip con `duracionActivable` ("3 rondas, en
    combate"). Los activables no restan vida al caerse (`vidaTrasCambioDeEstados`).
  - [x] A5b · Neuroprótesis 3-4 (commit 4db5ac6). Acción
    "Acción simple adicional" del nivel 3 (efecto `accionAdicional`, 2 de fatiga; casilla
    `ID_ACCION_REPETIDA` "Ya usada desde el último descanso" que cobra 3, apagada si no
    llega; `extra.repetida` en `usarAccionAumentoAction`). Con el nivel 4, pagar 3 pone
    `aum_neuroprotesis_4` (1 ronda, convive con `aum_neuroprotesis`): `activos` en el nivel del
    implante, `sustituyeAtributosDe` (+2 a los tres en lugar del +1/+2) y
    `eliminaPenalizadoresUmbrales`. Segunda reacción del nivel 3: `textos` del activo, en
    Defensa, solo con la Neuroprótesis activa. Vida: al cambiar un activable, la actual (ficha
    y fotos) se recorta al máximo nuevo (`vidaTrasCambioDeEstados`). **Combate:** lo que la
    ficha cobra o suma por su cuenta llega también a la foto del combate abierto
    (`fotoTrasCambioDeFicha`, `guardarFichaConFotos`; `pagarFatigaAction`,
    `usarAccionAumentoAction`, `devolverFatigaAction` nuevo para Densificar). Visual: sin "+0" en
    el selector de activar (`OpcionCondicion.sinValor`) y sin la duración repetida al lado del
    chip de un activable (`EstadoPanel`).
- [x] A6 · Brazo Biónico.
  - [x] A6a · Atributos del brazo, casilla, bloqueo y blindaje. `rules/brazoBionico.ts`: `brazoBionico(sheet)` (base permanente =
    `modificadoresDeRequisito`, más el delta del nivel o del modelo con su tope;
    `ExtremidadBionica` en `NivelImplante.extremidad` y `VarianteImplante.extremidad` del
    catálogo). Casilla toggle "Con el brazo biónico" (`ID_CASILLA_BRAZO`, campo `extremidad`
    en el toggle) en Puñetazo, "Codazo o Rodillazo" (nota "solo si es codazo"), cuerpo a cuerpo
    y fuego de una mano (no la Patada ni lo de dos manos), que pone `conCasillaBrazo` en
    `accionesDeAtaque`; con nivel 2+, `danio.categoria: "Letal"` en Puñetazo y codazo.
    `montarTirada` recalcula el aplicado con la Fuerza y la Agilidad del brazo
    (`conExtremidad`, línea "Potencia · Brazo Biónico 2: Fuerza 3 (tuya 1), …") y el daño de
    Fuerza (o de Potencia con Sutil) como ajuste con su fuente, aunque bajen.
    "Bloquear con el brazo biónico" (`aumentos_bloquear_brazo`, familia `bloquear_melee`: solo
    con la dote Bloqueo; nivel 2+), con `Accion.extremidad` fija. "Bloquear daño": casilla
    "Bloqueado con el brazo biónico" (`casillaBlindajeBrazo`, 6.º parámetro de
    `desgloseBlindaje`), nivel 2+, sin coste, donde cuente el blindaje.
  - [x] A6b · Casilla en "Bloquear con X" y arma incorporada, ficha **v20**. *(commiteada)* `llevaCasillaBrazo` admite `bloquear_melee` de una mano
    (escudos incluidos; la Pelea no, que es "Bloquear con el brazo biónico"). Vínculo
    `PiezaEquipada.armaIncorporada` (migración v19→v20 sin cambios de datos), con
    `esArmaIncorporable`, `armasIncorporables`, `conArmaIncorporadaValida` (en `parseSheet` y
    `desequipar`: arma no equipada, de dos manos, Pelea o escudo, fuera) y `fijarArmaIncorporada` en
    `rules/equipo.ts`. Selector "Arma incorporada" en la tarjeta del brazo (Equipo, también en
    el NPC), sin exigir la tirada; `fijarArmaIncorporadaAction` y
    `fijarArmaIncorporadaNpcAction` con Zod (`armaIncorporadaEntradaSchema`). Las filas del arma
    incorporada (golpe o disparo y su "Bloquear con X") llevan `Accion.extremidad` fija, sin
    casilla, y `NOTA_ARMA_INCORPORADA` (`conBrazo` en `combate.ts`).
- [x] A7 · Inmunidades. *(commiteada y probada en el navegador)* `rules/inmunidades.ts`:
  `inmunidadesDe(sheet)` con `inmuneA` del catálogo (Ojo Biónico 2-4 → ceguera, fuente "Ojo
  Biónico N"; Regeneración Tisular funcionando → hemorragia). Al poner un estado
  (`operacionConInmunidad` en `cambiarEstadosDePersonajes` y `cambiarEstadosDeNpcs`, este con
  `Combatiente.sheet`) el inmune se salta y vuelve en `inmunes`; los demás lo reciben. El panel
  de Estados (Mesa y combate) marca "Inmune: …" en la rejilla y, tras aplicar, avisa por
  personaje con **"Aplicar igualmente"** (`forzar`: `EstadoActivo.forzado`, que sí hace efecto;
  registro "… forzado (inmune) a …"). Un estado puesto antes de la inmunidad sigue en la lista
  sin efecto (`estadosConEfecto` en `resolverFicha`) y su chip dice "Inmune (fuente)". Ficha:
  "Inmune a: …" en Personaje → Estado. "Contra…" de Fortaleza: Ceguera y Ceguera por
  detonación "· inmune" con la nota "no hace falta tirar". Sin migración (`Character.estados`
  es columna aparte, lector tolerante).
- [ ] Cuando Murillo cierre los 5 implantes en proceso: `sync-drive`, transcribirlos de
  nuevo y modelarlos en una pasada corta.

Pendiente de Murillo (la app ya funciona con un supuesto en cada una; si contesta distinto, se
ajusta):
- [ ] Preguntas de A4-A7 (subir a `/preguntas`, área Aumentos): Eliminar exanguinante, Encontrar
  o distinguir, Tempestad y dotes cuerpo a cuerpo, Neuroprótesis 1 (atributos) y 4 (velocidad y
  carga), Ojo Biónico 2 frente a 4, tope del Brazo y escudos incorporables.
- [ ] Extracción de implantes y Biociencia o Tecnociencia (pregunta 20).
- [ ] Tope de implantes (pregunta 11).
- [ ] Shock S73 sobre implantes y el material de refuerzo.
- [ ] Erratas del documento (IRM nivel 3, ortografía).
- [x] **Código:** bolsa del humano a **70.000** (`catalog/especies.ts`, `bolsaAumentos`; el
  documento manda, antes 60.000) y textos/tests que digan 60.000. Va dentro de A0.

Enganches que ya esperan:
- ~~La bolsa del humano se ve pero no se gasta~~: se gasta desde A0 (bolsa primero, luego
  créditos).
- **Dependencia detectada (2026-09-21, repaso de efectos especiales de equipo):** el
  estado `Shock` (`src/lib/catalog/estados.ts:670-678`) ya prevé una rama para
  "equipamiento o armadura tecnológica" (resistencia = Estructura, no Fortaleza),
  explícitamente sin mecanizar hoy porque no hay sintéticos ni aumentos en la ficha.
  Al arrancar aumentos, revisar esto junto con la pregunta 32 de `sistema.md`
  ("susceptible a shock"/"apagón" sin definir, detectado en Inyector Hipodérmico/
  Soporte Vital/Anticorrosivo/Tejido Conductor — `docs/equipo-efectos-especiales.md`
  §Mejoras Estándar) — es la misma pieza de motor vista desde dos tareas distintas.

### Psiónica biológica por especie ⬜ (decidido con Murillo vía el usuario, 2026-10-16)
Solo los **Arianyi** y la **Casa Maolher** (Manduk) son psiónicos biológicos. Hoy la app
deja comprar psiónica a cualquiera que ponga puntos en creación, y S30 trata como psiónico
biológico a quien tenga una disciplina mayor que 0. El cambio:
- "Psiónico biológico" como atributo visible de la especie (o de la casa).
- Requisito en las disciplinas.
- El IRM (aumentos) lo da.
- Qué pasa con las fichas que ya tienen psiónica sin serlo: marca "requisito no cumplido",
  como al cambiar de especie.

Va **después** de aumentos: el IRM se modela allí pero no se conecta (`sistema.md` §11.3).

### Puntos Heroicos ⬜ (sin empezar)
No hay nada construido. Prosa del diseñador en `docs/fuente/puntos-heroicos.md`.

### Dotes ⬜ (D1–D2d y dotes de NPC hechas, 2026-10-15; quedan la especialidad en la tirada y las tiradas fijas)

Encargo y pasos: `docs/prompt-dotes.md`. Fuente literal: `docs/dotes.md` (105 dotes).
Decisiones del usuario (Cuestionario Dotes, 2026-10-14): `docs/sistema.md` §9.
- [x] Transcripción fiel `docs/dotes.md`.
- [x] `sistema.md` §9 con pool, requisitos, maniobras solo con dote y qué es texto.
- [x] `accion_sin_equipo` marcado como construido en el extractor y el workflow.
- [x] `MODELO_DOTES` aprobado (2026-10-15) y extractor/workflow adaptados por área
  (`trocearDotes`, lotes de 12).
- [x] `modelar-area` lanzado → `docs/modelado-dotes.md` + `.json` (96 % de 631 efectos,
  12 capas, 154 preguntas).
- [x] Capas decididas (7 se construyen, 5 texto): `sistema.md` §9.3.
- [x] Preguntas cribadas (160 → 9) y respondidas: `sistema.md` §9.5.
- [x] Campos nuevos y supuestos del redactor decididos → `MODELO_DOTES` v2 (`sistema.md` §9.3).
- [x] Candidatas a UX decididas (`sistema.md` §9.3): solo Reflejos Felinos y grupo extra de
  acción (Traicionero en Iniciativa); usos por turno → épica del panel de combate.
- [x] **D1 (2026-10-15): dotes en la ficha, sin efectos.**
  - Catálogo generado: `npm run gen-dotes` (`scripts/generar-catalogo-dotes.ts`) lee el
    borrador, valida contra el schema de compra de v2 (`src/lib/catalog/dotesTipos.ts`),
    normaliza v1 → v2 (Biónica en Biociencia, etiquetas de la lista cerrada, prosa de
    `docs/dotes.md`), cruza requisitos/coste/grupo con la transcripción y escribe
    `src/lib/catalog/dotes.ts` (105). El borrador `.json` no se ha tocado: la
    normalización vive en el script.
  - `sheet.dotes` (`SCHEMA_VERSION` 16), lectura tolerante, reset de especie, foto de
    aprobación con `dotes` opcional.
  - `rules/dotes.ts`: `PUNTOS_DOTES_POR_LETRA` A 18 · B 15 · C 12 · D 9 · E 6; pool en
    creación, XP tras aprobar (sin pool); el máster con las mismas reglas; requisitos con
    especie (S30); requisito roto = marca + falta para enviar a revisión; no se quita una
    dote que es requisito de otra; aprobada no se vende ninguna (S32).
  - Pestaña Dotes (`DotesTab.tsx`) y `comprarDoteAction` / `quitarDoteAction`.
  - Fuera de D1: efectos/capas, `fuentesDeCapa1` (hecho en D2a), Bloquear/Sutil/ataque de
    oportunidad con su dote, NPC (`NpcTemplate` no recibe dotes), catálogo de especialidades.
- [x] ~~**Especialidades en requisitos, provisional (S31)**~~ *(tanda ESP, 2026-10-15: los
  requisitos comparan ids del catálogo; fuera `claveEspecialidad` y
  `NOMBRES_ESPECIALIDAD_DOTES`; el generador valida los ids del borrador)*
- [x] Ajustar el borrador `docs/modelado-dotes.json` a v2 en los campos de efectos: lo hace
  el generador en D2a (normalización documentada en el script; el `.json` no se toca).
- [x] **D2a (2026-10-15, probada en navegador): casillas, bonos fijos y textos
  de dote en tiradas que ya existen.**
  - Catálogo con los 188 efectos (185 del borrador: el bono con umbral de Presencia
    Imponente se parte en dos, y el texto de defensas de Combinación y de Combinación
    Rápida en Esquiva + Bloquear) normalizados a v2 y cada uno con su MotorMetadata; tabla de
    destinos en `src/lib/catalog/dotesDestinos.ts`; reglas en `rules/dotesEfectos.ts`
    (casillas al índice, bonos fijos como Modificador "dote", textos en `textosTirada`),
    `fuentesDeCapa1` con familia "dote". Supuestos S34-S38 (`sistema.md`).
  - **Recuento por tanda** (lo imprime `npm run gen-dotes` y va al pie de `dotes.ts`):
    construidos 95 · texto 93 · pendientes D2b-1 0 · D2b-2 0 · D2c 0 · D2c-2 0 · D2d 0 ·
    tiradas-fijas 0 (2026-10-23, tarea "Tiradas fijas que faltan", más abajo). Antes:
    construidos 90 · texto 88 · tiradas-fijas 10. Antes de D2d: construidos 74 · texto 87 · D2d 17.
    Tras D2a era: construidos 20 · texto 38 · D2b-1 50. Tras D2b-1: construidos 41 · texto
    67 · D2b-2 20 · D2c 33. Tras D2b-2: construidos 45 · texto 78 · D2c 38. Tras D2c-1:
    construidos 72 · texto 81 · D2c-2 8.
    **Una tanda se cierra cuando sus pendientes llegan a 0.**
  - Plan de tandas:
    - [x] **D2a** — casillas, bonos fijos y textos en tiradas que ya existen.
    - [x] **D2b-1 (2026-10-15, probada en navegador)** — casillas/textos de
      dote en los ataques con arma (alcances `familia:*`, Levantar escudo) y el crítico fijo
      de Crítico Mejorado. 50 → 0 pendientes.
      - Familia de arma como dato: `Accion.familiaArma` / `empleoArma` (también en
        `AccionDirecta`, Levantar escudo), puestos en `combate.ts` donde se crea cada
        tirada; `AlcanceModificador` `familiaArma` (con empleo opcional), indexado en
        `indiceDeCondiciones` y consultado con `ContextoAccion`; `DestinoTexto` de familia.
        Test: cada tirada de arma del catálogo casa con exactamente una familia.
      - Requisito por rama (Asesino, Desenfundado Rápido, Golpe Entorpecedor) deducido en el
        generador; filtro de arma a una mano (Desenfundado Rápido, Apresar y Apuñalar).
      - Bono por tramo de dote (Tirador de Larga Distancia +1 en larga; Avanzado +2 solo en
        especialidad; con las dos, vale la mejor) y crítico fijo de Crítico Mejorado (solo
        ataques; ni lanzar ni bloquear), en `FichaResuelta.extrasDotes` → `conExtrasDeFicha`.
      - Bloqueos con la especialidad del arma, sin selector (S40 construido). Armas de fuego
        por empleo (S44 construido). Supuestos S45-S49 (`sistema.md`).
      - [x] **Auditoría de D2a + D2b-1** (2026-10-15): modo por lotes del workflow
        (`{ items, lote: 4 }`, envoltorio lanzado con `scriptPath`) y extractor
        `--familia dote --estado construido --sin-texto`: 25 dotes, 9 agentes, ~370K
        tokens. **0 hallazgos reales**: los 3 "confirmados" (−1 a defensas de Combinación,
        entorpecimiento de Golpe Entorpecedor, −2 a la salvación de Dominio Elevado) eran
        textos ya construidos que `--sin-texto` ocultaba al auditor; corregido (los textos
        van marcados "ya cubierto como texto, no auditar"). 11 huecos ya reconocidos, todos
        pendientes de D2c, D2d o tiradas-fijas. Siguientes tandas: misma receta, y antes de
        lanzar, nº de agentes y coste al usuario.
    - [x] **D2b-2 (2026-10-15, probada en navegador)** — habilitadores de
      Bloqueo y Combate Sutil. 20 → 0 pendientes (4 construidos, 11 textos; 5 movidos a D2c).
      - Revisión: la casilla «Desarmado frente a atacante armado» (−3) y su excepción solo
        salen al bloquear desarmado (Pelea), no con un arma (`filtroArma.desarmado`).
      - **Bloquear solo con Bloqueo** (§9.2, arbitraje duro): sin la dote no sale ninguna
        "Bloquear con X" (armas melee, Bayoneta, Aguijón). `FAMILIAS_SOLO_CON_DOTE`
        (`dotesDestinos.ts`) + `permisos` de `efectosDeDotes` → `FichaResuelta.extrasDotes`
        → `accionesDeAtaque(sheet, mods, permisos)` (`combate.ts`, parámetro obligatorio).
        Con la dote: especialidad del arma (S40), casilla «Desarmado frente a atacante
        armado» −3 con su texto de excepción, textos de Bloqueo (crítico/contraataque, solo
        melee, tamaño, daño al bloquear) y de Contraataque Rápido, Maestro en Contraataque,
        Combinación y Combinación Rápida.
      - **Sutil solo con Combate Sutil** (§9.5): sin la dote no hay `aplicadoSutil` ni
        `danioSutil` (ni interruptor en la fila): Potencia y daño con Fuerza. El Aguijón,
        Reflejos con la dote y Potencia sin ella (golpe y bloqueo; daño Fue+2+nivel en los
        dos casos).
      - Requisito roto ⇒ sin efecto (S34); NPC (modo libre) sin excepción: sin dotes no
        bloquea ni va en sutil (S50). `seed-npcs` no se ve afectado (sus NPC no llevan
        equipo); ningún test de NPC dependía de Bloquear ni de Sutil.
      - Ataque de oportunidad y Arrollar (y los textos de Poderoso/Múltiple/Maestro
        Oportunista) pasan a **D2c**: no existían en la app, no había nada que quitar.
      - [x] Aviso al grupo: lo gestiona el usuario por su cuenta (no bloquea el push). Texto
        sugerido (quita a todos algo que hoy usan):
      > Aviso de reglas: desde hoy **Bloquear** y el estilo **Sutil** (Reflejos con armas
      > sutiles, el Aguijón del Proyector de Pulso incluido) solo salen en la ficha si tenéis su
      > dote: **Bloqueo** y **Combate Sutil**. Si los usabais, compradlas en la pestaña Dotes (con
      > XP si la ficha ya está aprobada); sin Combate Sutil se tira con Potencia y el daño va con
      > Fuerza. Los NPC también: el máster les pone las dotes en su editor.
    - [x] **D2c-1 (2026-10-15, probada en navegador)** — acciones de dote.
      D2c 38 → 0 (30 construidos/textos; los 8 de poderes pasan a D2c-2).
      - Sección **Dotes** en Acciones: `accionesDeDotes` (`rules/dotesAcciones.ts`) →
        `FichaResuelta.accionesDotes` → `AccionesTab.tsx` (FilaTirada / FilaUsar; ESLint
        prohíbe llamar a `accionesDeDotes` desde la UI). 24 acciones: tirada y enfrentada con
        texto por grado y lo que tira el rival (`Accion.poder`); sin dado con su nota.
        Economía, límites, dificultad a criterio y materiales, texto.
      - Especialidad de la resolución sin selector (`Accion.especialidadesAccion`,
        `enEspecialidadEfectiva`): Apoyo con Empatía o Liderazgo, Traicionero en
        Manipulación, Arrollar en Pelea (S53, S54).
      - Ajustes al borrador en el generador (`AJUSTES_ACCION`): especialidad de Apoyo y de
        Arrollar, ventaja de Apoyo y de Violencia Aterradora como texto, grupo extra de
        Traicionero (Iniciativa, S56), nota de Combinación sin la casilla inexistente.
      - Textos de Ataque de Oportunidad Poderoso/Múltiple/Maestro Oportunista en su acción;
        casilla «Finta repetida» con la opción de Maestro de Fintas (S57).
      - Reflejos Felinos: descuento en el contador de atacantes de la esquiva
        (`CondicionTirada` contador `descuento`, `extrasDotes.descuentos`; S55). No toca
        Bloquear.
      - Tests: `rules/dotesAcciones.test.ts`.
      - [x] Probado en navegador (2026-10-15): Apoyo (entera con Empatía o Liderazgo), Finta repetida,
        Traicionero en Iniciativa, Reflejos Felinos con 2 atacantes, Paso Atrás que
        desaparece al quitar Paso Defensivo.
    - [x] **D2c-2 (2026-10-15, probada en navegador)** — poderes de dote y textos
      de dote en los poderes. 8 → 0 pendientes (2 construidos, 6 textos).
      - `poderesDeDotes` (`rules/dotesPoderes.ts`) → `FichaResuelta.poderesDotes` → sección
        **Dotes** de Acciones con `FilaPoder` y la ventana de los poderes (ESLint prohíbe
        llamar a `poderesDeDotes` desde la UI). Nivel poseído = el de su disciplina
        (`psionica.paraEfectos`); requisito roto o sin disciplina, no sale.
      - El generador normaliza la AccionPoder del borrador (`normalizarPoder`,
        `AJUSTES_PODER`) y la valida resolviéndola con `poderes.ts` en todos los niveles y
        opciones. `Valor.porCadaNiveles` nuevo (daño de Sobrecarga, compresión de Impacto).
      - *Impacto Métrico* sin dado (S60): cobra la fatiga y enseña el daño extra; el ataque,
        aparte. *Sobrecarga Métrica* con tirada y daño propio por resultado (S63).
      - `prepararPoder` recibe `textos` (`FichaResuelta.textosTirada`) y pone los del poder en
        la nota/crítico de su tirada o en las notas de su ventana (S64). Helper común con
        `conExtrasDeFicha`: `rules/textosTirada.ts`. Destino nuevo "poder" en
        `dotesDestinos.ts` (`dotes_impacto_metrico`, `psi_singularidad_expansion`).
      - La tanda "D2c-2" se queda en `TANDAS_DOTES` con 0, como las demás cerradas.
      - Tests: `rules/dotesPoderes.test.ts`.
      - [x] Probado en navegador (flujo O de `docs/pruebas-psionica.md`).
    - [x] **D2d (2026-10-15, probada en navegador)** — casillas que hacen algo
      más que sumar. 17 → 0 pendientes (16 construidos, 1 texto de tarjeta).
      - `CondicionTirada` toggle con `ventaja`, `subeGrado`, `aplicado`, `costeFatiga` y
        `danio` (`condiciones.ts`); `montarTirada` los junta (`TiradaMontada.ventaja`,
        `subeGrado`, `danio`, `costeFatiga`), `tirarMontada` aplica el fracaso → éxito
        (`Resultado.cambioGrado`) y `resolverDanio(base, margen, categoria, ajuste)` el daño.
        El modal tira con `montada.ventaja`; `resumenCasilla` dice qué hace cada casilla.
      - Una casilla por dote, destino y condición (`dotesEfectos.ts`): Especialidad Médica
        +1 y crítico con 5 en la misma; Equilibrista (éxito = crítico); Balanceo y Como Pez
        en el Agua (fracaso → éxito); Ojo Clínico (ventaja, −1 fatiga al tirar); Bioma
        Predilecto (ventaja en Iniciativa y Subsistencia); Salto Evasivo +1 / Mejorado +2
        (bono normal, decisión del usuario); Negociación Analítica (Perspicacia en vez de
        Expresión en Convencer / mentir).
      - Valor por umbral de ficha: Presencia Imponente +1/+2 (Fuerza ≥ 5) e Imitación +2/+3
        (Interpretación ≥ 3) en una sola casilla con el valor resuelto (S38 resuelto).
      - Ventaja en acciones de dote (Apoyo, Violencia Aterradora): casilla en la acción
        (`dotesAcciones.ts`); fuera las notas de "aplícala a mano".
      - Daño: Golpe Fatigante −1 (mínimo 0) solo con contundentes o a dos manos
        (`ArmaMelee.contundente`, filtro `contundente` en `familiaArma`); «Golpe letal» con
        armas de Escudos (filtro `especialidad`); maniobra **Derribo** (efecto `maniobra`)
        solo con Derribo Mejorado o Brutal: −2 y daño básico, Brutal sin −2 y «Derribo con
        acción estándar» que devuelve el bono por éxitos.
      - Supuestos S66-S71 (`sistema.md`). Tests: `rules/dotesD2d.test.ts`.
      - [x] Probado en navegador (casos en el informe de la tanda).
- [x] D1 probada en navegador (2026-10-15): compra con pool, XP en aprobada, quitar con
  dependientes, requisito roto marcado, Especialidad Médica repetida sin repetir pareja,
  Crítico Mejorado y Bioma Predilecto con texto libre, rechazo del servidor deshaciendo
  la compra, cambio de especie vaciando dotes. Sin probar en navegador (solo test): el
  bloqueo del envío a revisión, que solo ve el dueño (falta un usuario jugador local).
- [x] **Saldo negativo al bajar la letra (fallo anterior a D1, no solo de dotes;
  arreglado 2026-10-15):** si después de gastar se bajaba la letra de una categoría (o se
  la quitaba otra, `setLetra`), el pool se quedaba en negativo ("-3 / 6") sin bloquear
  nada. Ahora el cambio de letra se sigue permitiendo (para poder reordenar) y el saldo
  negativo es una **falta que bloquea el envío** ("Te has pasado 4 puntos en atributos"):
  `excesosDePuntos` (`revision.ts`), argumento obligatorio de `faltaParaEnviar`, en
  servidor y pantalla; vale para Atributos, Habilidades, Psiónica y Dotes (S72). Tests en
  `revision.test.ts`; probado en navegador.
- [x] ~~Código, en su tanda: Ataque de oportunidad desaparece sin la dote también en
  Finta/Presa/Desarme/Flanqueo.~~ Obsoleta: esas maniobras no existen en la app; si
  llegan, que lo recojan en su tanda.
- [x] ~~`docs/propuesta-dotes.md` y plan por tandas.~~ Obsoleta: el plan ya se ejecutó
  (D1-D2d).
- [x] Código, en su tanda: Bloqueo y Combate Sutil pasan a exigir su dote (D2b-2). Ataque
  de oportunidad, con D2c (no existe todavía en la app).
- [x] **Dotes para los NPC** (abierta en D2b-2; construida y commiteada
  2026-10-15): el máster pone dotes a un NPC (`NpcTemplate`) desde `/master/npcs/[id]`,
  sin requisitos ni coste (§9.4).
  - Reglas (`rules/dotes.ts`): `CONTEXTO_LIBRE` en `comprarDote`/`motivoNoComprable` y
    `quitarDote`/`motivoNoQuitable`. Libre = sin requisitos, sin pool ni XP (`costeXp` 0) y
    quitar siempre (también si es requisito de otra). Igual que en personaje: dote visible
    (Olfato de Investigador fuera), elección obligatoria (cerrada/abierta) y repetibles.
    *Crítico Mejorado* en libre: las especialidades de arma que tenga el NPC, en cualquier
    habilidad (`opcionesDeEleccion` con `v` null; `TODO(revisar)` si se abre a todas).
  - Server actions `ponerDoteNpcAction`/`quitarDoteNpcAction` (`master/npcs/actions.ts`),
    Zod con `doteCompradaSchema`, solo máster, guardan en `stats.dotes`.
  - UI: pestaña "Dotes" en `NpcEditor.tsx`, `DotesTab` con `libre` (sin saldo ni coste,
    requisitos ✓/✗ solo de referencia, sin marca de requisito roto, botón "Poner").
  - Combate: el `Combatiente` congela `stats` (dotes incluidas) y `NpcAccionesPanel` resuelve
    en libre; `agregarNpcDeCatalogoAction` calcula ahora la salud de la foto también en libre.
  - Tests: modo libre en `dotes.test.ts`; integración (Bloquear con Espada, `aplicadoSutil`)
    en `dotesEfectos.test.ts`.
- [x] **Tanda ESP (2026-10-15, probada en navegador): integrar el catálogo
  completo de especialidades** de `docs/fuente/habilidades.md` en `sistema.md` §3 y en el
  código. Va **antes de D2b-1** (el crítico fijo de Crítico Mejorado y las casillas de los
  ataques con arma ya la necesitan).
  - `src/lib/catalog/especialidades.ts` (42, por id; Interpretación y Sigilo sin lista,
    siempre enteras: S39). Ficha con ids (`SCHEMA_VERSION` 17): la migración casa por
    nombre y lo que no casa va a `avisoEspecialidades`, que la pestaña Habilidades enseña
    con un botón para descartarlo (S42). Selector de lista cerrada en Habilidades; server
    actions con Zod (`especialidadDeHabilidadSchema`).
  - Especialidad por arma (`src/lib/catalog/especialidadesArma.ts`, con test de
    cobertura): los ataques con arma van en especialidad solos si la ficha tiene la del
    arma, y si no, a la mitad (`enEspecialidadEfectiva`, `montaje.ts`); sin selector en esa
    fila. Bloqueos con el selector de siempre (S40; desde D2b-1, también con la del arma);
    lanzar usa Lanzamiento (S41).
  - Dotes: requisitos por id (S31 cerrado), Crítico Mejorado con lista cerrada de
    especialidades de arma que la ficha tiene (S43), poderes psiónicos y "Levitando:
    Física" por id.
  - Pendiente de revisar a mano: los `TODO(revisar)` de `especialidadesArma.ts` (asignaciones
    dudosas) y S39-S43. *(Cerrado: S39-S44 confirmados por el usuario; los TODO de
    subfusiles y ametralladoras se fueron con las armas de fuego por empleo, D2b-1.)*
- [x] **Especialidades de Combate a Distancia de la foto de Drive 2026-10-23** (construido
  2026-10-23): de 5 a 9 (`especialidades.ts`), armas por `tipo` a la de su nombre (S44
  sustituido), migración v21 → v22 (Cortas → Pistolas, Elásticas → Impulsoras, Largas → la del
  arma a dos manos equipada o fuera, con aviso), Arco Táctico y Ballesta Pro UE
  (`catalog/armasImpulsoras.ts`) y las dotes *Arquero Poderoso*, *Pistolero* y *Pistolero
  Infernal*. Detalle en `sistema.md` §3, §9.1, §9.5 y §12. Pendiente: sus `TODO(revisar)`
  (munición de arco/ballesta, mejoras que admiten, lectura de Arquero Poderoso) y el resto de
  dotes nuevas de esa foto (Fuego de Saturación, de Supresión, de Barrera, Disparo de
  Interdicción, Lanzamiento Doble…), sin transcribir.
- [ ] **La tirada sabe qué especialidad se usa** (sale de ESP, sin construir): hoy la fila
  de una tirada que no es ataque con arma solo dice sí/no (`EleccionTirada.enEspecialidad`).
  Cambiarlo por un selector de **cuál** de las especialidades de la ficha en esa habilidad
  (o ninguna), que llegue a `montarTirada`. Desbloquea el "fallo → fallo crítico" de Elión
  (`rigidez_narcisista` en `especies.ts`, `bloqueoPor` apunta aquí: con Empatía, Humor o
  Negociación el margen baja solo) y permite que las casillas de especialidad de las dotes
  (S35: Presencia Imponente, Intimidación, Investigación…) se apliquen solas en vez de
  marcarlas el jugador.
- [ ] **Tiradas fijas que faltan según `docs/fuente/habilidades.md`** (sigue abierta: falta
  la segunda parte). Va junto a la integración de especialidades.
  - [x] **Apuntar, Carrera, Discernir mentiras y Resistir distracción** (2026-10-23, sin
    commit; `sistema.md` §6 "Tiradas fijas", S79-S83). Filas nuevas en `ACCIONES`
    (`rules/acciones.ts`). Los 10 efectos de dote con `bloqueoPor: "tiradas-fijas"`, a 0:
    *Velocista* (fracaso → éxito y éxito → crítico sin casilla, sin encadenar), *Gran
    Puntería* (éxito → crítico en Apuntar y el texto de cobertura solo con crítico natural:
    `Accion.efectoCriticoNatural`), *Puntería Relámpago*, su *Mejorada* y *Precisión
    Imperturbable* (notas de Apuntar), *Cazador Cazado* y *Vigilancia Táctica* (casilla en la
    fila, `habilidadAlternativa` como Levitar). Selector «Apuntado» (No · Éxito · Crítico) en
    todos los ataques con Combate a Distancia, cambiado por *Gran Puntería*; *Foveo* deja la
    casilla "Tras Apuntar" y pasa a +1 con el selector (`BonoPorTramo.condicion`). Tests en
    `rules/tiradasFijas.test.ts`. Falta probarlo en el navegador.
  - [ ] Tiradas propias de **Investigación, Rastreo y Subsistencia**, que hoy van de apaño a
    "Buscar / percibir" (S36).

### Revisión de candidatas a UX ✅ (dotes, 2026-10-15: `sistema.md` §9.3; repetir en cada área nueva)

Al modelar, lo que la app podría explicar con UX en vez de prosa se etiqueta "candidata a
UX" (`docs/motor.md`). Cuando acabe el modelado de dotes: juntarlas por patrón (p.ej. "N
usos por turno" → varios botones de tirar, como el contador de atacantes de Esquivar) y
decidir una UX por patrón, no una por dote. Equilibrio: no desviarse especificando UX caso
a caso.

### Panel de combate: qué aporta ⬜ (épica para debatir, usuario 2026-10-14)

Pregunta de fondo: la app calcula tiradas y explica consecuencias; ¿qué da el panel de
combate que no dé ya la ficha? Ligado a la duda de Fase 6b ("no convence el modo combate").
O se va con todo o se quita lo de combate.
- **Aplicación automática de estados** desde el panel del máster, sin bloquear fichas ni
  turnos con polling. La de más valor por esfuerzo.
- **Organización**: turno actual e iniciativa (poco valor: lo dice el máster); **registro de
  acciones por turno** (interesante, proyecto aparte): un array de acciones con sus datos,
  arbitrado con las acciones por turno de `sistema.md` §6 (2 simples · 1 estándar · 1
  compleja · 1 reacción).
- **Arquitectura**: sincronizar turnos sin servidor en tiempo real da mala UX (polling).
  Alternativa: solo cliente con botón "nuevo turno" (patrón de "Terminar escena"); sirve a
  jugadores y másters novatos. Si el piloto demuestra uso, se plantea tiempo real (push).
- **Idea futura**: simulador de combates con un LLM decidiendo las acciones de cada
  personaje según lo que hicieron los anteriores en la iniciativa. Requisito común con el
  registro: acciones como datos (por eso las dotes guardan su coste en acciones).

- **Snapshot de `Combatiente`** (rescatado de la vieja Fase 2 "Ficha viva", cerrada el
  2026-10-15: la ficha ya es viva — cada cosa afecta a su tirada y las tiradas emiten
  consecuencias): el combate copia vida y fatiga en un snapshot que se pierde al cerrarlo.
  Decidir si se unifica con `vidaActual`/`fatigaActual` o se queda aparte.
### Especies reales ⬜ (plan cerrado 2026-10-09; E0-E5 y M1 hechas: todo lo construible de especies está construido, queda lo bloqueado)

Plan y porqués en `docs/propuesta-especies.md` (decisiones del usuario en §5b, ninguna
pendiente de Murillo); flujo en `docs/diagrama-especies.png`. Fuente: `docs/Especies.pdf`.
Orden decidido: E0 → E1 → E2 → E3 → M1 → E4 → E5. Cada tanda: plantear → luz verde →
construir → tests → navegador → documentar. Dudas nuevas que salgan: caso a caso, no se
construye la sugerida por defecto.

**E0 — Documentar**
- [x] `docs/especies.md`: transcripción fiel del PDF, erratas *(sic)*
- [x] `docs/sistema.md` §14 de `PENDIENTE` a `PARCIAL`, con las decisiones M1-M24

**E1 — Núcleo** (propuesta §2.2, §3, §3.1)
Se construye en tres pasadas con revisión y commit entre cada una: **E1a** modelo y reglas
puras (catálogo, ficha v14, `rules/especie.ts`), **E1b** `resolverFicha` (refactor sin cambio
de comportamiento), **E1c** servidor + UI + fuera provisionales.
- [x] Catálogo `especies.ts`: Humanos, Riux, Arianyi, Arköru, Manduk (4 castas, 6 linajes):
      atributos, narrativo, peso/altura de referencia. Fuera las provisionales *(E1a; el
      campo `provisional?` y su aviso en `ResumenTab`, fuera en E1c)*
- [x] Ficha v14: `especieOpciones` (casta, linaje) + migración
- [x] `rules/especie.ts`: `especieDeFicha` (especie + casta + linaje → efectos)
- [x] `elegirEspecie`: linaje solo para nobles, bloqueada si aprobada (salvo máster),
      **reset** de todo salvo Resumen + créditos a la letra; `hayQuePerder` para el aviso
      *(E1a: los créditos los fija `setEspecieAction` cuando `reseteada` es true)*
- [x] `setEspecieAction` (sale de `saveIdentityAction`): aplica el reset en el servidor
      *(E1c: Zod `eleccionEspecieSchema`; con reset fija `Character.creditos` con
      `creditosDeLaLetra`; `saveIdentityAction` ya no toca `especieId`)*
- [x] `resolverFicha` calculada una vez en `CharacterSheet`; fuera los
      `mods = modificadoresActivos(sheet)` por defecto; ESLint en componentes
      *(E1b: `rules/fichaResuelta.ts` + `hooks/useFichaResuelta.ts`; con los estados de
      combate dentro, Resumen/Atributos/Recursos y la cabecera ven ya los mismos números
      que Acciones. Quedan `TODO(revisar)`: daño de armas en reposo en `combate.ts` (M1),
      clamp de vida/fatiga sin estados en `vitalidad.ts`, chips de la tarjeta de especie)*
- [x] Resumen: la tarjeta de especie lista hoy todos los modificadores (equipo y, desde E1b, estados); que liste solo los de especie, casta y linaje
      *(E1c: lee `ficha.especie`, capa a capa; chips para los modificadores, texto para el
      resto de rasgos)*
- [x] UI: selector de especie/casta/linaje el primero en Resumen; aviso "se reseteará la
      ficha" solo si hay algo que perder
      *(E1c: `_components/EspecieSelector.tsx`, borrador local hasta que la elección esté
      completa; aviso con `UsarModal` vía `hayQueAvisar`; aprobada y no máster,
      deshabilitado con el motivo; rango de peso/altura bajo esos campos con
      `rangoReferencia`. ESLint: `elegirEspecie` vetada en componentes)*
- [x] `ESPECIES` entra en `motor.test.ts` (MotorMetadata por rasgo)
- [x] NPC: selector de especie/casta/linaje en la pestaña Identidad de `NpcEditor` (hoy
      solo nombre y nota) *(E1c: mismo `EspecieSelector`, sin aviso; `setEspecieNpcAction`)*
- [x] NPC: `resolverFicha` también en `NpcEditor`, vía un hook compartido con
      `CharacterSheet` (`useFichaResuelta`), para que el NPC no se quede con el cálculo viejo
      *(E1b; también `NpcAccionesPanel` de la consola de combate)*
- [x] NPC: `elegirEspecie` en modo libre: sin reset, sin bloqueo por aprobación, sin tocar
      créditos (los NPC no tienen esa columna)

**E2 — Creación** (2026-10-13: en dos pasadas. **E2a**: coste de habilidad por casta,
descuentos psiónicos y bolsa visible. **E2b**: Resonancia +1 y kerzul. Decisiones para E2b:
Resonancia efectiva = comprado + 1 **siempre**, también con 0 comprado (Arianyi con letra E
juega con Resonancia 1); un 7 cuenta para requisitos y los efectos usan la fila del 6, con
test. Nivel efectivo desde la `FichaResuelta` en poderes, requisitos, `PsionicaTab` y
`RecursosTab` (hoy lee `sheet.psionica`). Kerzul: función pura en `rules/` (tipo
`puedeEquiparSinRareza`) que usan `equiparAction` y la Tienda para la etiqueta "vía
especie". `viaEspecie` sube `SCHEMA_VERSION` con paso de migración y test, como E1a)
- [x] Coste de habilidad por casta, en creación y XP (`costeSubidaXp` sale a `rules/progresion.ts`)
      *(E2a: `costes` en el rasgo del catálogo → `ajustesDeCoste` → `FichaResuelta.ajusteCoste`;
      especialidades sin ajuste; pista "−1 casta" junto al coste)*
- [x] Modificador nuevo de tipo *disciplina*: Resonancia +1 del arianyi (adicional, puede
      pasar de 6, cuenta como requisito; requisitos contra el nivel efectivo)
      *(E2b: `{ tipo: "disciplina" }` en el rasgo → `FichaResuelta.psionica` con comprado /
      efectivo / paraEfectos; requisitos por parámetro `BonosDisciplina`; poderes, tiradas
      fijas, Levitar y Recursos leen `paraEfectos` (7 → fila del 6, S24); requisito roto
      marcado, S25, con `TODO(revisar)` sobre los poderes)*
- [x] Descuentos psiónicos: nivel 1 a coste 2 (arianyi), −1 por nivel (Maolher), creación y XP
      *(E2a: mismo `AjusteCoste`; Resonancia incluida; NPC neutro vía `resolverFicha({ libre })`)*
- [x] Bolsa de 60.000 del humano visible como "pendiente de aumentos"
      *(E2a: `bolsaAumentos` en el rasgo → `FichaResuelta.bolsaAumentos`; línea en Tienda y Recursos)*
- [x] Kerzul del Arköru sin rareza: una pieza, marca `viaEspecie`, solo en borrador
      *(E2b: `excepcionRareza` en el rasgo y `material: "kerzul"` en las 10 piezas →
      `puedeEquiparSinRareza` / `topeRarezaDeCompra` en `rules/equipo.ts`, que usan
      `equiparAction` (marca en servidor) y la Tienda; ficha v15)*

**E3 — Derivados**
- [x] Movimiento: fórmulas del Arköru (salto vertical con mínimo 15 cm), nado del Arianyi,
      +4 m carrera y +2 m salto/nado/escalada de Zimethroni
      *(`formulaMovimiento` en el rasgo → `FichaResuelta.formulaMovimiento` → `movimiento(…,
      formula)`; Zimethroni con `Modificador` "derivado", sumado después del mínimo: base 0 =
      215 cm. Notas en Estado con `notasDeEstado`)*
- [x] Carga +20 % (Arköru)
      *(`multiplicadorCarga` → `cargaMaxima(…, multiplicador)`; Fuerza 0 = 18 kg, nota "×1,2 · Arköru")*
- [x] Armadura natural 1 en `desgloseBlindaje` (se suma; no contra fuego ni mental)
      *(`armaduraNatural` en Matriz Biometálica → `FichaResuelta.blindaje.armaduraNatural`;
      Bloquear daño la lee de ahí. El crítico desarmado, E4)*

**Deploy de especies** (tras E3, decidido 2026-10-09: un solo reset y cada jugador crea su
ficha una vez, ya con costes de casta, descuentos y derivados)
- [x] Desplegado el 2026-10-13 (push `7193cf9`, migraciones de `IN_REVIEW` y ficha v15
      aplicadas en Neon). **Sin backup y sin reset general** (decisión del usuario ese día):
      el código migra las fichas viejas al leerlas; las fichas en creación se resetean solas
      al elegir especie (§14.3) y a las aprobadas sin especie se la pone el máster, sin reset.
      Queda `scripts/reset-fichas-especies.ts` por si un día hace falta

**M1 — Montaje único de tiradas** (propuesta §3.1; cierra el hallazgo de umbrales de arriba)
(2026-10-13: en dos pasadas. **M1a**: `montarTirada` en un solo sitio, sin cambiar ningún
número (caracterización de los 8 sitios de la UI y de la tirada de `prepararPoder`, la VTM
"complejo" pasa a dato). **M1b**, cambios de comportamiento: umbrales de salud y fatiga
dentro, vía los modificadores de la `FichaResuelta`, con la vida/fatiga **del combatiente**
en un combate en curso y **de la ficha** fuera; fatiga **efectiva** (la temporal de Proeza
cuenta para los umbrales mientras dura la escena, como dice `sheet.ts`). Test de que un
personaje herido que usa un poder tira con −1: de eso dependen Estabilización, Derivación
nv4 e Hipomanía. Y el daño melee/bayoneta/Sutil desde la ficha resuelta. Decidido tras
M1a: en M1b la fila de Acciones enseña el modificador completo sin casillas (`modificador`,
no `base`); con dos opciones que bajen el margen de crítico gana el más bajo, se revisa en E4)
- [x] Tests de caracterización de cada lista de Acciones antes de mover nada *(M1a: `montaje-caracterizacion.test.ts`, los 8 sitios + `prepararPoder`; ningún esperado cambió al migrar)*
- [x] `montarTirada`: total + desglose + márgenes de crítico/pifia *(M1a: `rules/montaje.ts`, con `tirarMontada`; ESLint veta las sumas sueltas en componentes)*
- [x] Penalizadores por umbral de salud y fatiga dentro (`modificadoresDeUmbrales`) *(M1b, 2026-10-13: modificadores de la `FichaResuelta` con alcance `todas`, con su línea en el desglose; vida/fatiga del combatiente en combate (jugador y NPC de la consola), de la ficha fuera; fatiga efectiva con la temporal de Proeza. Tabla entera de §7: media velocidad (carrera, vuelo, levitación) y −25 %/−50 % de carga, con nota en Estado; supuestos S26-S29. La fila de Acciones enseña el modificador completo, como el modal sin tocar. **Cambian números visibles, avisar a la mesa al desplegar:** los personajes heridos o cansados tiran peor (también los poderes y las salvaciones), y en Malherido/Exhausto/Moribundo bajan la velocidad y la carga; además la fila de Acciones ya no enseña solo atributo + habilidad, sino el total que se va a tirar (traje, estados, modo de disparo por defecto…))*
- [ ] Media velocidad en los metros de la tirada de Volar (Movilidad Aérea): Estado ya enseña el vuelo a la mitad, pero `accionesDeMovimiento` no recibe la ficha resuelta (`TODO(revisar)` en `rules/movimiento.ts`). "Una casilla por turno" de Moribundo sigue solo como nota
- [x] Sacar de `AccionesTab` la suma del modal y el crítico de la VTM *(M1a: la VTM "complejo" lleva `margenCriticoExito: 0` como dato de la opción)*
- [x] Índice de casillas sin el memo parcial `[sheet.equipo]` + `eslint-disable` (hecho en E1b: sale de `resolverFicha`)
- [x] Al entrar en combate el jugador arrancaba con la vida y la fatiga máximas, no con las
      de su ficha: con los umbrales sacados del combatiente, un herido perdía sus
      penalizadores *(M1b, 2026-10-13: `vitalidadAlEntrarEnCombate` en `vitalidad.ts`; los
      NPC siguen entrando enteros, salen de una plantilla)*
- [x] El daño de armas melee/bayoneta y el aplicado Sutil salen aún de la ficha en reposo (`combate.ts`, `TODO(revisar)`): con un estado que baje Fuerza, la tirada lo refleja y el daño no *(M1b, 2026-10-13: `accionesDeAtaque(sheet, mods)` con los modificadores de la `FichaResuelta`; también lanzar arma melee y el Aguijón. **Cambia números visibles, avisar a la mesa al desplegar:** el daño melee y el de Sutil reflejan los estados de combate que bajan Fuerza (Enfermedad…); la especie ya contaba)*

**E4 — Bonos a tiradas** (2026-10-13)
- [x] ~~Casillas de especie: +2 radiación (Riux), temperatura / filtración / derribo y −1
      visual (Arköru), Empatía Biológica en Buscar/percibir y Tratar heridas (Arianyi)~~
      *(dato `casillas` en el rasgo → `casillasDeEspecie` → mismo índice que el equipo; solo
      con el rasgo, también al NPC libre. −1 visual en Buscar/percibir = Alerta activa, no en
      la pasiva. `TODO(revisar)`: no hay salvación contra derribo donde poner la de Inamovibles)*
- [x] ~~−1 a distancia del Arköru (solo Combate a Distancia)~~ *(`Modificador` de tirada con
      alcance nuevo `grupoHabilidad` (Ataques + Combate a Distancia): granadas y arrojadizas
      van con Atletismo y quedan fuera solas, e Iniciativa desenfundando también)*
- [x] ~~Toggles "éxito → crítico" visibles solo para su casa: Noble (miedo, Voluntad), Irota
      (toxinas), Axadren (enemigo oculto: Alerta activa y Buscar), Elión (sugestión)~~
      *(toggle sin número con `margenCriticoExito: 0`, campo nuevo también en toggles; gana el
      margen más bajo)*
- [ ] "Fallo → fallo crítico" de Elión (especialidad Empatía / Humor / Negociación):
      **bloqueado** por la tarea "La tirada sabe qué especialidad se usa" (Dotes; la lista
      cerrada ya existe desde la tanda ESP, antes era la pregunta 3 / S5), fuera de E4
      (decisión del usuario, 2026-10-13). Forma decidida: especialidades por id; al tirar se
      elige **qué** especialidad se usa (no solo sí/no) y, con una de esas tres, el fallo
      crítico se aplica solo, sin casilla. MotorMetadata `bloqueado`
- [x] ~~−1 a los tramos de heridas (Guerrero) y fatiga (Siervo)~~ *(`ajusteUmbrales` en el
      rasgo → `FichaResuelta.ajusteUmbrales` → parámetro obligatorio de
      `modificadoresDeUmbrales`; un tramo en 0 no da línea. Solo el −N: velocidad y carga igual)*
- [x] ~~Textos: crítico desarmado letal (Arköru), casilla gratis tras esquivar y daño extra
      (Zimethroni), aturdimiento (Ílkrem), ceguera (Axadren)~~ *(`textos` en el rasgo →
      `conExtrasDeFicha`: Arköru en el crítico de toda la Pelea (Codazo o Rodillazo incluido, y la Malla Plasmática igual); Zimethroni, los dos en
      Defensa; Ílkrem en la Salvación de Fortaleza. `TODO(revisar)`: la ceguera del Axadren
      sin sitio, no hay salvación contra ceguera; la "Tensión ósea" del Zimethroni es daño
      recibido y va a Defensa)*

**E5 — Otras áreas** (2026-10-13; falta verificarlo en navegador)
- [x] ~~Peaje de Maolher en `usoPoder.ts` (Fortaleza 5 + nivel; no lo absorbe el blindaje)~~
      *(`peajeNeurologico` en el rasgo → `FichaResuelta.peajeNeurologico` → `usarPoder`
      devuelve `peaje: { dificultad, puntos }`; `tirarPeaje` / `danioDePeaje` en
      `usoPoder.ts`. Solo la fatiga pagada (no las cargas de Derivación; la temporal de
      Proeza sí); prolongar Proeza paga el suyo. Panel `PeajePanel` debajo del de
      sobrecarga; también al NPC de la consola, que lo resta a mano)*
- [x] ~~Irota: fármacos a la mitad (redondeo abajo, mínimo 1)~~ *(nota fija: `notaFarmacos`
      → `FichaResuelta.notasFarmacos` → filas de fármaco. "Bajo Xovromium" sigue en +1)*
- [x] ~~Visión UV/IR (Arianyi) e infrarroja (Axadren) como acción sin dado~~
      *(`accionSinDado` → `FichaResuelta.accionesEspecie` → "Activar visión" en Acciones;
      Arianyi cobra 1 de fatiga, la primera hora, con `onPagarFatiga`; las siguientes, a
      mano. Axadren, sin coste)*

**Bloqueado**
- ~~Gastar la bolsa de aumentos (dos bolsas, la de aumentos primero)~~: hecho en Aumentos A0
- Regeneración de Ílkrem, descanso y raciones (Riux, Siervo): la app no lleva el tiempo

**Aparte, detectado en la revisión**
- [ ] El modificador `{ tipo: "derivado", id: "carga" }` existe en `DERIVADOS_MODIFICABLES`
      pero `cargaMaxima` (`derivados.ts`) no lo suma. Hoy ninguna pieza lo usa; el día que
      alguna lo traiga, no tendría efecto (detectado al plantear E3, 2026-10-13)
- [ ] `setPrioridadAction` sobrescribe `Character.creditos` al cambiar la letra de
      Recursos sin restar lo gastado en la Tienda (el reset de especie solo lo tapa en ese caso)

### Centro de mando del máster + estados en la ficha (E1) ✅ (decidido 2026-10-16, cerrado con E1d)
Maqueta aprobada por el usuario (salvo el degradado púrpura de la cabecera, ya quitado):
https://claude.ai/artifact/1JWfab9ijSgaC4mCYNTKs9 — escritorio y móvil, Mesa y Combate.
Sustituye a la idea "Estados en la sub-pestaña Estado" (forma B: los estados se guardan).
Va **antes de aumentos**: los aumentos necesitan estados con duración (Neuroprótesis,
Control Anímico) y el hueco de piezas inutilizadas para el Shock (S73).

**Decisiones (usuario, 2026-10-16):**
- Primero el objetivo (uno o varios), luego la acción. Pestañas: Estados y Recompensas
  (xp y créditos). Botín e Historia llegarán como pestañas nuevas del mismo marco; no se
  enseñan hasta existir.
- **El mismo componente** en la Mesa y dentro del combate (objetivos = la cola, NPC
  incluidos; a un NPC solo se le ponen estados).
- Rebranding completo: los controles de xp/créditos de hoy (`MasterControls.tsx`) no se
  traen tal cual, se rediseñan.
- Registro con **deshacer**; si ya no se puede (créditos gastados, estado terminado), avisa
  en vez de dejar la ficha en negativo.
- Contador de rondas grande y "molón" junto a "Siguiente turno" (ronda, turno de quién,
  tiempo del turno, vuelta en segmentos, celebración al cerrar la vuelta, Espacio para pasar;
  sin animaciones con reducir movimiento). Terminar combate enseña resumen; el combate nuevo
  empieza en ronda 1.
- El jugador **no** se quita estados: solo los ve. "Terminar escena" del máster limpia los
  estados de escena de todos. Los estados mueven la vida máxima también fuera de combate; la
  vida actual no se recorta.
- Duración: N rondas (bajan con el turno) · fin de escena · hasta quitarlo. Un grado que baja
  solo o un estado que arrastra otro (Shock → Parálisis) se hacen a mano.

**Hallazgos de la revisión adversarial (2026-10-16) que fijan la forma:**
- Estados en **columna propia** `Character.estados` (Json), escrita solo por el máster, como
  `xp`/`creditos` (`traspaso.md` §9): el autosave del jugador reescribe `stats` entero sin
  transacción y pisaría lo del máster.
- **Un solo sitio** para los estados de un jugador, también en combate: hoy la ficha ya recibe
  los de su `Combatiente` (`CharacterSheet.tsx:558`) y se sumarían dos veces.
  `Combatiente.estados` queda para los NPC.
- La ficha guarda `sheet` en `useState`: los estados llegan como **prop aparte** (como
  `combate`) para que el polling los refresque.
- `aplicarEstadoAction` hoy no valida con Zod: las acciones nuevas sí.

**Pasadas** (cada una se plantea y se confirma antes de construirla):
- [x] **E1a — estados en la ficha (modelo y servidor):** columna + migración, lector tolerante,
  acciones aplicar/quitar a varios objetivos, avanzar turno descuenta en la ficha, ficha del
  jugador con los estados como prop y tarjetas en Personaje → Estado, hueco
  `piezasInutilizadas` vacío en `FichaResuelta`, tests.
  *(2026-10-16) Columna `Character.estados` (migración `estados_ficha`); `EstadoActivo` gana
  `finDeEscena?` y `DuracionEstado` (rondas · escena · hasta quitarlo). Motor en
  `rules/estadosFicha.ts`: `leerEstados` (tolerante), `ponerEstado`/`quitarEstado`,
  `estadosTrasTurno`, `estadosDeCombatiente` (jugador → su ficha; NPC → su fila).
  Acciones `aplicarEstadoAPersonajesAction`/`quitarEstadoDePersonajeAction` en
  `app/master/actions.ts` (Zod en `validation.ts`, escritura en `lib/estadosPersonaje.ts`);
  la consola de combate escribe en la ficha para jugadores y "Siguiente turno" descuenta ahí.
  La ficha recibe `estados` como prop; tarjetas en Personaje → Estado; `FichaResuelta` gana
  `estados` y `piezasInutilizadas` (vacío). Supuesto S74. La consola aún no ofrece "fin de
  escena" (llega con el componente compartido, E1c-E1d).*
  *(2026-10-16, vida perdida, S75) Poner un estado que baja el máximo resta lo mismo a la vida
  y fatiga actuales (ficha y foto de combate) y no se devuelve al quitarlo; la foto recalcula
  `pgMax`/`fatigaMax` en cada cambio de estados, también en "Siguiente turno". Motor en
  `rules/vidaPorEstados.ts`; la ficha copia `vidaGuardada` (prop fresca) a `sheet`.*
- [x] **E1b — registro con deshacer:** tabla nueva, xp/créditos/estados/fin de escena registran,
  deshacer con avisos de conflicto.
  *(2026-10-16) Modelo `RegistroMaster` (migración `registro_master`): tipo en texto, ids de
  personajes, `datos` con antes/después y vida restada, motivo, `deshechoAt`. Registran
  `adjustXp/CreditosAction`, las nuevas `darXpAction`/`darCreditosAction` (varios + motivo) y
  poner/quitar estado (Mesa y consola, solo jugadores). `deshacerRegistroAction` en
  transacción; criterios de "ya no se puede" en `rules/registro.ts`; `listarRegistro(n)` en
  `lib/registroMaster.ts` para E1c. "Fin de escena" registrará cuando exista (E1c).*
- [x] **E1c — centro de mando, Mesa:** pantalla nueva de escritorio y móvil (Estados,
  Recompensas, Registro, Terminar escena) con el componente compartido.
  *(2026-10-16) `/master` es la Mesa (`MesaMaster.tsx`, un componente con breakpoints `lg`:
  tres columnas en escritorio; tira de avatares, barra de pestañas y hoja inferior en móvil);
  la lista de fichas pasa a `/master/fichas` y las pestañas son Mesa · Combate · Fichas · NPCs.
  Panel compartido en `components/mando/` (`PanelMando` con objetivos y acciones por props,
  para E1d). "Terminar escena" (`terminarEscenaAction`, entrada `fin_escena` deshacible, S76);
  quitar XP/créditos en negativo da error en vez de recortar. Textos del registro en
  `rules/textosRegistro.ts`. Añadido "Quitar" el estado elegido a quien lo tenga (no estaba en
  la maqueta, `TODO(revisar)`).*
- [x] **E1d — combate:** el componente compartido en la consola y el contador de rondas.
  Incluye: las rondas de los estados bajan **al cerrar la vuelta**, no con cada turno de
  cualquiera como hasta ahora (`descontarDuracion` en `avanzarTurnoAction`; decisión del
  usuario, 2026-10-16).
  Cabos que deja E1c para aquí:
  - La Mesa enseña la vida de la ficha, no la del combate abierto: decidir qué se ve
    mientras hay combate.
  - "Terminar escena" solo limpia a los jugadores: los NPC con estados de escena del combate.
  - La tira vieja de xp/créditos dentro de la ficha (`ResourceRow`) no deja quitar en
    negativo pero no avisa: quitarla en favor de la Mesa o que avise.
  *(2026-10-16) Consola en tres columnas en escritorio (cola · `PanelMando` · registro) y en
  móvil cola + botón flotante "Aplicar estado a N" (hoja con `PanelEstados enLinea`) + dock;
  objetivos = filas de la cola, `aplicar/quitarEstadoEnCombateAction` (jugadores con registro,
  NPC sin él). `ContadorRondas.tsx` (tiempo del turno solo de pantalla) y motor en
  `rules/turnos.ts` (`pasarTurno`, segmentos, resumen, `vidaEnMesa`). Rondas al cerrar la
  vuelta (S77); "Terminar escena" también limpia NPC (S76); resumen del último combate; la
  Mesa enseña la vida del combate marcada; fuera `ResourceRow` de la ficha (sigue en Fichas,
  `TODO(revisar)`).*
- [x] **Pulido de UI (tras E1d).**
  *(2026-10-16) `ChipEstado` único (fondo magenta tintado, nombre en tinta y negrita, grado y
  duración en mono; sin `text-glitch`) en Mesa, cola del combate y ficha del jugador. Mesa
  móvil: pestañas Jugadores · Estados · Vida · Recompensas · Registro; el globo de un avatar
  lleva a su tarjeta. Pestaña **Vida** en `PanelMando` (daño/curación, vida/fatiga, cantidad,
  vista previa con el umbral que cruza, `rules/ajusteVida.ts`); en combate ajusta la foto, en
  la Mesa la ficha (o la foto si está en combate, S78). Registro tipo `vida` deshacible también
  para NPC (columna `RegistroMaster.combatienteIds`, migración `registro_combatientes`). Cola
  limpia: fuera `±N`/`PG`/`FAT.`, barras grandes que abren Vida, orden e iniciativa solo al
  preparar; en móvil "Acciones a N" con las tres pestañas.*

### Componente `Modal` común ⬜ (propuesta del usuario, 2026-10-13)
Hoy 7 modales montan cada uno su propio fondo `fixed inset-0` (UsarModal, AccionModal,
BloquearDanioModal, UsarPoderModal, ReparaFabricaModal, SacrificioRecursoModal y el de
`NpcAccionesPanel`) y solo 3 sitios pasan por `createPortal`. Un modal `fixed` dentro de
una tarjeta queda atrapado debajo del resto de la página: pasó en Fabricar (2026-09-25) y
en el selector de especie (2026-10-13). Propuesta: un componente base en
`src/components/Modal.tsx` que siempre hace portal a `document.body`, pone el fondo y cierra
al pulsar fuera y con Escape; los 7 pasan a usarlo y solo aportan su contenido. Sin hook
`useModal` (solo ahorraría un `useState`).

### Polling ligero: "¿hay algo nuevo?" ⬜ (idea, 2026-10-16)
Hoy `usePollingCombate` hace `router.refresh()` cada 15 s (4 s en combate): vuelve a
renderizar la página entera en el servidor, con todas sus consultas a Prisma, aunque no
haya cambiado nada. Alternativa: un endpoint mínimo que devuelva una versión (p. ej. el
`updatedAt` de la ficha y del combate, o un contador) y refrescar solo si cambia. Con ~10
jugadores no hace falta todavía; se plantea si el polling empieza a pesar, o al meter los
estados que escribe el máster (que van a necesitar refresco también fuera de combate).
Ojo con Neon: mientras alguien tenga la ficha abierta en primer plano, la base no se
suspende, con polling pesado o ligero.

### Armas Modificadas ✅ (2026-10-23)
Electrificantes, Térmicas, de Plasma, de Nanofilamento: construidas como transformación sobre
un arma melee (`PiezaEquipada.modificaciones`), con coste multiplicativo, rareza máxima, tramo
del arma sin modificar y daño desglosado por tipo en el golpe. En Tienda, Equipo (convertir),
creación y Fabricar. Detalle y decisiones: `docs/sistema.md` §12 y S87. Pendiente: el peso
cuenta en la carga cuando esta se construya.

### Penalizadores de Carga Transportable ⬜
La fórmula y el dato en pantalla ya están (Fase 3); falta aplicar los penalizadores por
exceso de carga (−25% malherido, −50% moribundo, −25% exhausto) y la Proeza de Fuerza.

### Sigilo / Visibilidad en combate ⬜ (idea sin construir, 2026-09-12)
Salió de revisar los penalizadores "al sigilo" de varias armas (`docs/
equipo-efectos-especiales.md`). Modelo propuesto por el usuario, pendiente de validar
con el diseñador — ver `docs/sistema.md` pregunta 25b: el sigilo no se re-tira en cada
instante, se tira una vez al esconderse y el margen queda como un valor persistente
("Escondido: X éxitos") hasta que ocurre un evento de alerta (disparo, alarma...), que
es lo que dispara el derecho a tirada de quien podría notarlo. Si se confirma, hace
falta un campo nuevo tipo **Visible / Escondido (X éxitos)** por combatiente — no
existe hoy ni en la ficha ni en la consola de combate. Sin empezar: es una pregunta de
reglas sin cerrar, no una tarea de implementación todavía.

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

Las preguntas completas, numeradas, viven en `docs/sistema.md` → "Preguntas abiertas
para el diseñador".

**Tanda de respuestas de Murillo, 2026-09-23** — la mayoría de lo que llevaba tiempo
abierto se resolvió (especialidades, tabla canónica de acciones, sigilo al disparar,
metros/casilla, nivel de fatiga, psiónica/hackeo, exoesqueleto, Proyector de Pulso ya
construido).

**2026-09-24: absorción de daño por blindaje resuelta** (pregunta 29/`C11`, prioridad
alta marcada por el usuario): 1 punto de blindaje = 1 nivel de daño. **Construida en
código el 2026-09-27** — ver Hallazgo #5 en "Hecho", arriba del todo.

**Lo que sigue sin respuesta, y es lo que más bloquea:**

1. **Armaduras Avanzadas y el +1 de salvación** (pregunta 8d): ¿lo mantienen, lo pierden,
   o ganan otro? Bloquea 10 piezas de `armaduras.ts`.
2. **"Susceptible a shock"/"apagón"** (pregunta 32): 3 piezas en `mejorasEstandar.ts`.
3. **Defensa de un sistema, fija o enfrentada** (pregunta 16, hackeo/psiónica): sin
   efecto en la app todavía (Fase 5 sigue bloqueada por el diseñador), pero cierra el
   diseño de esa sección en cuanto llegue.
4. ~~**Especies, poderes, dotes y aumentos**: fases enteras esperando a que el diseñador las
   escriba.~~ *(Ya están todas en Drive; especies, psiónica y dotes construidas.)*
5. **Agarre Rápido y Mirada Desafiante** (dotes, D2c-1, S59): la prosa no dice con qué
   tirada se resuelven; la app usa la que propuso el borrador del modelado, con
   `TODO(revisar)` en `scripts/generar-catalogo-dotes.ts`. Preguntar a Murillo qué tirada
   (aplicado + habilidad, dificultad) piden. *Zafarse* no entra: se apoya en la regla de
   Atrapado.
