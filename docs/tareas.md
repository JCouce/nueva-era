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

**Última actualización:** 2026-09-28.

## Ahora mismo

Sin valoración de prioridad aquí a propósito — se queda obsoleta en cuanto cambia el
foco. Fuentes vivas, cada una con su propio orden interno, sin que ninguna documente
cuál va antes que la otra:
- `docs/checklist-motor-vs-prosa-2026-09-24.md` — catálogo de equipo pieza a pieza, con
  su propio "Orden de construcción" por tiers.
- `docs/prompt-gasto-recursos.md` — automatizar el gasto de RECURSOS (balas/cargas/
  dosis) al confirmar una tirada en vez del +/- manual de hoy. **Fase 1 (armas de
  fuego, Proyector de Pulso, Movilidad Aérea "Volar") y Fase 2 (fármacos) hechas
  2026-09-28** — los fármacos dejan de ser pieza equipada y pasan a pool con
  cantidad (`sheet.farmacos`, SCHEMA_VERSION 10), con su propia acción "Usar" en
  Acciones (grupo nuevo "Fármacos", `rules/farmacos.ts`) que gasta 1 dosis al
  confirmar. Documento cerrado, sin más fases pendientes.
- "Preguntas al diseñador" (final de este documento) — lo que bloquea a Murillo.

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
  Munición Especial y Armas Modificadas.

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
   (Acciones sin dado en sí) **sigue sin diseñar**, el rename no la adelanta.

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
  menciona Fuego como cubierto (es justo lo que Mejora Ignífuga reabriría, todavía sin
  construir). Tóxico cuenta como cualquier otro tipo (decisión del usuario,
  corrigiendo un supuesto peor que se había barajado antes): el blindaje sí reduce el
  daño de un arma tóxica, lo que se le escapa es el estado de Enfermedad/
  Envenenamiento que dispare, resuelto aparte por su propia salvación.
- **"Bloquear daño"** (Acciones → Defensa, `AccionesTab.tsx`/`BloquearDanioModal.tsx`
  nuevo): selector de tipo de daño + toggle "Escudo en alto" (solo si hay uno
  equipado) + contador de daño recibido → "Blindaje: N · Pasa: N". Es un calculador
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
  extra) y sigue sin construirse.
- **Fuera de esta pasada, a propósito**: Mejora Ignífuga nivel 1 (habilitar blindaje
  contra Fuego, mecanismo distinto al +1 de Tejido Conductor, sin construir); Malla
  Plasmática (es un colchón/buffer, no blindaje, bloqueada aparte); el "Ignora N puntos
  de blindaje" de las armas de Kerzul/Armas Mecánicas (efecto del ATACANTE, no del
  defensor — sigue sin construirse, `blindajeContra()` no está enganchado a ninguna
  tirada de ataque).
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

## Pendiente

### Fase 2 — Ficha viva (PG y fatiga en partida) ⬜ (parcial: fuera de combate, 2026-09-27)
Ya no está bloqueada por la pregunta de si se lleva en vivo — se resolvió que sí. **Fuera
de combate ya está**: `vidaActual`/`fatigaActual` persistidos en la ficha, con su propio
espacio en Recursos (ver "Vida y fatiga pasan a recurso persistente..." en Hecho). Lo que
falta sigue siendo dependencia de la fase 6b: daño por categoría, estados activos con
penalizadores automáticos, gasto de fatiga, descanso — y decidir si el snapshot de
`Combatiente` (que hoy sigue intacto y se pierde al cerrar el combate) se unifica alguna
vez con este recurso persistente o se queda como una cosa aparte.

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

### Equipo — mecanizar efectos especiales por pieza ⬜ (arrancada 2026-09-11)
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
     motor no rastrea en absoluto hoy — sigue sin construir, prerrequisito
     aparte de "Volar" en sí.
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
   - **Munición en Tienda — tarea nueva, sin diseñar.** Hoy comprar munición es
     un botón suelto en la pestaña Recursos. Hace falta una sección propia en
     la Tienda, con algo como una unidad de cada tipo de munición por cada
     tipo de arma compatible. Sin maquetar todavía.

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

### Fase 5 — Poderes, dotes, aumentos, especies reales ⬜ (bloqueado por el diseñador)
El diseñador (Murillo) aún no ha escrito estos documentos. No hay reglas que adelantar,
pero sí se adelantó la arquitectura que las va a recibir (ver "El motor — MotorMetadata +
arquitectura escalable" en Hecho): `fuentesDeCapa1` (`src/lib/rules/capa1.ts`) es el punto
de extensión ya construido para cuando exista una segunda fuente de capa 1, y el registro
`familia → generador` de `combate.ts` ya consulta `MotorMetadata.mecanismo` en vez de
tener familias hardcodeadas — dar de alta Poderes/Dotes/Ciberware el día que lleguen es,
en teoría, sumarlos a `fuentesDeCapa1` + registrar su generador, no rediseñar el proceso.

**Dependencia detectada (2026-09-21, repaso de efectos especiales de equipo):** el
estado `Shock` (`src/lib/catalog/estados.ts:670-678`) ya prevé una rama para
"equipamiento o armadura tecnológica" (resistencia = Estructura, no Fortaleza),
explícitamente sin mecanizar hoy porque no hay sintéticos ni aumentos en la ficha.
En cuanto arranque la Fase 5, revisar esto junto con la pregunta 32 de `sistema.md`
("susceptible a shock"/"apagón" sin definir, detectado en Inyector Hipodérmico/
Soporte Vital/Anticorrosivo/Tejido Conductor — `docs/equipo-efectos-especiales.md`
§Mejoras Estándar) — es la misma pieza de motor vista desde dos tareas distintas.

**Segunda dependencia, más grande (2026-09-21, mismo repaso — propuesta del usuario
de tratarla como mini épica propia):** antes de construir dotes/poderes/aumentos,
conviene resolver cómo llegan `CondicionTirada` (opciones seleccionables) y texto
informativo a **tiradas fijas** de `TIRADAS` (hoy solo funciona por arma concreta) —
problema completo en `docs/modificadores-tiradas.md` §8. Los modificadores numéricos
ya están resueltos y son extensibles sin cambios (`modificadoresActivos`); lo que
falta es específico de condiciones/texto, no de números. Sin diseñar, sin construir.

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
4. **Especies, poderes, dotes y aumentos**: fases enteras esperando a que el diseñador las
   escriba.
