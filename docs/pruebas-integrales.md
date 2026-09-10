# Pruebas integrales

Checklist de pruebas manuales para pasar antes de dar por buena una pieza de UI grande —
más allá del camino feliz que ya se verifica al cerrar cada subtarea. Un bloque por
sección; dentro de cada uno, casos límite, validaciones y permisos, no solo "funciona si
todo sale bien".

**Cómo se usa:** antes de una sesión de pruebas, lee "Preparación". Al terminar cada
bloque, "Limpieza" — siempre, aunque algo haya fallado. Marca `[x]` lo que pasa, anota al
lado lo que falla con el texto exacto del error, no un "no funciona".

---

## Preparación

1. Dev server corriendo (`npm run dev`) y **reiniciado si hubo una migración de Prisma
   desde la última vez** — el cliente en memoria se queda desfasado, ver
   `docs/traspaso.md` §5.
2. Sesión con rol MASTER. Si no tienes contraseña de una cuenta MASTER existente,
   registra una de prueba en `/login` y asciéndela: `npm run make-master -- <email>`
   (hace falta cerrar y reabrir sesión después, el rol viaja en el JWT).
3. Para los casos de permisos de jugador (D2, ver bloque de Casos de permisos más abajo),
   hace falta además una segunda sesión con rol PLAYER — puede ser una cuenta de prueba
   distinta, o una pestaña en modo incógnito para no pisar la sesión de máster.

## Limpieza (después de cada sesión de pruebas, sin excepción)

```sql
DELETE FROM "Combate";  -- los Combatiente se van solos por cascade
```

Verifica con `SELECT count(*) FROM "Combate";` que queda en 0. Si registraste usuarios de
prueba, bórralos (`DELETE FROM "User" WHERE email = '...';`). **No toques** personajes ni
`NpcTemplate` reales — son datos de la mesa, no de pruebas.

---

## Huecos conocidos — no son fallos, son piezas de otra subtarea

No pierdas tiempo buscando esto como si fuera un bug del bloque 2:

- **No hay botón para marcar a alguien "derrotado".** `marcarDerrotadoAction` existe
  desde la 1.3, pero ninguna subtarea del bloque 2 le puso una UI — quedó suelta. No es
  parte de 2.1-2.6.
- **No hay forma de añadir un NPC desde el catálogo de `NpcTemplate`** (solo ad-hoc).
  `agregarNpcDeCatalogoAction` existe desde la 1.3; su UI es la subtarea 5.2.
- **No hay ninguna pantalla donde un jugador vea u opere su propio combatiente.** El
  permiso D2 (el dueño del Character puede ajustar su propio PG/fatiga) está
  implementado y tiene test unitario (`permisos.test.ts`), pero **hoy no hay ningún
  camino de UI para ejercerlo** — la vista de jugador es la fase 3, todavía sin
  construir. Ver "Casos de permisos" más abajo para cómo probar esto de todas formas.

---

## Bloque 2.1 — Crear combate + añadir jugadores

- [x] Camino feliz: sin combate en curso → "Crear combate" → aparece "Ronda 1", cola
  vacía, lista de personajes disponibles.
- [x] **Ya hay un combate en curso.** Con un combate `EN_CURSO` ya creado, intenta crear
  otro (recarga la página con dos pestañas, o llama a la acción dos veces seguidas antes
  de que la UI se actualice). Debe rechazarlo: "Ya hay un combate en curso." No debe
  aparecer un segundo `Combate` en la base.
  Probado con dos pestañas reales sobre el mismo estado "sin combate": crear en la
  primera y, sin recargar, crear en la segunda. Mensaje exacto "Ya hay un combate en
  curso." y `SELECT count(*) FROM "Combate" WHERE estado='EN_CURSO';` devuelve 1.
- [x] **Añadir el mismo personaje dos veces.** Añade a "villa" (o quien exista), y sin
  recargar intenta añadirlo otra vez desde la lista (si ya desapareció de "Añadir
  jugador", provoca la llamada igualmente, p. ej. reabriendo la página a mitad). Debe
  rechazarlo: "Ese personaje ya está en este combate."
  Probado con dos pestañas sobre el mismo combate vacío: añadir "gordo" en la primera y,
  sin recargar, añadir "gordo" también en la segunda. Mensaje exacto "Ese personaje ya
  está en este combate." y en la base solo queda una fila de `Combatiente` para ese
  `characterId` dentro del combate `EN_CURSO` (confirmado con
  `SELECT nombre, "combateId" FROM "Combatiente"` cruzado con el estado del combate).
- [ ] **Sin personajes creados.** Si en algún entorno de pruebas no hay ningún
  `Character`, la sección "Añadir jugador" debe decir "No hay personajes creados." (no
  "Ya están todos en combate.", que es el otro mensaje para lista vacía).
  **No probado esta sesión**: el entorno solo tiene dos `Character` reales (`villa`,
  `gordo`) y la norma de limpieza prohíbe tocarlos — no hay forma de vaciar la tabla sin
  borrar datos reales. Sí se confirmó el otro lado del mensaje: con ambos personajes ya
  en combate, la sección muestra "Ya están todos en combate." (visto al añadir a los dos
  durante esta misma sesión), así que al menos la rama contraria está verificada.
- [x] **PG del jugador coincide con su ficha real.** Al añadirlo, "PG X/X" debe coincidir
  con la vida calculada en su propia ficha (`/characters/<id>`, pestaña Resumen) — no un
  número inventado ni desfasado.
  "gordo" en combate: PG 10/10, Fatiga 9/9. Su ficha (`/characters/cmtvdieth0006z1yug9ombd7s`,
  Resumen): Puntos de vida 10, Puntos de fatiga 9. Coincide exacto.
- [x] Terminar combate sin nadie en la cola (0 combatientes) — no debe reventar, debe
  volver limpio a "No hay ningún combate en curso."
  Probado dos veces (una con la cola vacía tras el intento de duplicado, otra la
  original con "gordo" dentro terminada primero) — en ambos casos vuelve limpio a "No hay
  ningún combate en curso." sin error en consola.

## Bloque 2.2 — Añadir NPC ad-hoc

- [x] Camino feliz: nombre + PG → aparece en la cola con PG actual = máximo, el
  formulario se vacía solo.
  "Guardia" PG 15 → aparece "PG 15/15 · Fatiga 0/0", campos Nombre y PG vacíos tras el
  submit.
- [x] **Nombre vacío o solo espacios.** El botón "Añadir NPC" debe seguir deshabilitado
  con el campo vacío; si se fuerza espacios en blanco (" "), no debe crear un NPC sin
  nombre real.
  Con el campo Nombre en "   " (tres espacios) y PG "10", el botón "Añadir NPC" sigue
  deshabilitado (el cliente hace `trim()` antes de habilitar) — no llegó a intentarse el
  envío.
- [x] **PG en 0 o negativo.** El input es `type=number min=1`, pero prueba forzar un 0 o
  un negativo (pegar el valor, o cambiar el `min` desde las devtools) — el servidor debe
  rechazarlo igual ("PG inválidos."), el cliente no es la única barrera.
  Forzado por consola (quitando `min` y disparando `input`/`change`) a PG=0 y luego
  PG=-5, ambos con nombre real: el botón se habilita pero al enviar el servidor responde
  "PG inválidos." las dos veces y no se crea ningún `Combatiente` nuevo.
- [x] **PG con decimales** (ej. "12.5"). El campo no lo impide a nivel de HTML. Compueba
  qué pasa: ¿se guarda un PG fraccionario (12.5/12.5) o se trunca? Si se guarda
  fraccionario, anótalo como hallazgo — un PG con decimales no tiene sentido en las
  reglas del sistema.
  Con PG forzado a "12.5", el servidor lo acepta y la UI muestra "PG 12/12" — confirmado
  en la base (`SELECT "pgActual","pgMax" FROM "Combatiente" WHERE nombre='Decimal12_5'`
  → `12 | 12`, sin decimales). Se trunca a entero antes de guardar, no hay hallazgo.
- [x] **Dos NPC con el mismo nombre.** A diferencia de los jugadores, no hay guardarraíl
  contra duplicados — debe permitir dos filas "Guardia" sin fundirlas ni pisarse los PG
  entre sí.
  Añadidos dos "Guardia" (PG 15 y PG 20): quedan como dos filas independientes,
  "PG 15/15" y "PG 20/20", sin fundirse.
- [x] **Nombre muy largo** (40+ caracteres). Comprueba que no rompe el layout de la fila
  ni la desborda fuera de la tarjeta.
  "Comandante Supremo de la Guardia Imperial del Norte" (52 caracteres) a 390px de
  ancho (viewport móvil): el nombre hace wrap a dos líneas dentro de la tarjeta, no
  desborda ni rompe el layout (comprobado con captura de pantalla).

## Bloque 2.3 — Cola de iniciativa

- [x] Camino feliz: iniciativa por combatiente, "Ordenar por iniciativa" reordena
  descendente, "Siguiente turno" avanza y sube ronda al dar la vuelta, flechas mueven un
  puesto.
  4 combatientes (gordo=5, villa=10, Alfa=3, Beta=8): "Ordenar por iniciativa" deja el
  orden villa(10), Beta(8), gordo(5), Alfa(3) — confirmado en la base (`orden` 0-3).
  "Siguiente turno" recorrido completo: villa→gordo→Beta→Alfa→villa, y al volver a villa
  sube "RONDA 2". La flecha ▲ subió a gordo un puesto (confirmado con `orden` en la base).
- [x] **El turno sigue a la persona, no a la posición**, en los dos reordenamientos
  posibles — ya verificado al cerrar la subtarea, pero merece repetirse tras cualquier
  cambio futuro en esta zona: turno activo → "ordenar por iniciativa" → sigue el mismo
  nombre en "Turno de: X", aunque cambie de puesto. Turno activo → moverlo con una flecha
  → mismo nombre en "Turno de: X".
  Con el turno en "GORDO" (puesto 0), "Ordenar por iniciativa" lo mandó al puesto 2 y
  "TURNO DE:" siguió diciendo "GORDO". Después, subir a "GORDO" un puesto con la flecha
  ▲ tampoco cambió "TURNO DE: GORDO".
- [x] **Iniciativa vacía tras haber tenido un valor.** Pon una iniciativa, guárdala,
  bórrala del campo (déjalo en blanco) y quita el foco. Debe guardarse como "sin
  iniciativa" (null), no fallar ni dejar el valor viejo.
  **HALLAZGO:** no se guarda como "sin iniciativa" — se queda con el valor viejo. Pasos:
  con "villa" en iniciativa=10, borrar el campo (dejarlo vacío) y perder el foco (Tab).
  El campo se ve vacío en pantalla, pero tras recargar la página (F5) vuelve a mostrar
  "10" — `SELECT iniciativa FROM "Combatiente" WHERE nombre='villa'` confirma que en la
  base sigue en `10`, nunca llegó a `NULL`. No revienta ni da error visible, simplemente
  no persiste el vaciado.
- [x] **Iniciativa negativa y con decimales.** Prueba -3 y 7.5. ¿Se guarda tal cual? Con
  negativos, "ordenar por iniciativa" debería seguir funcionando (van al final, por
  debajo de los positivos). Con decimales, comprueba que el orden resultante tiene
  sentido (7.5 debe quedar entre 7 y 8 si los hay).
  Negativo: -3 se guarda tal cual (confirmado en base y tras recargar). Decimal: 7.5 se
  trunca a `7` antes de guardar (igual que el PG, no se guarda fraccionario). Con
  iniciativas 10/7/3/-3, "Ordenar por iniciativa" dejó villa(10), Beta(7), Alfa(3),
  gordo(-3) — el negativo al final, orden correcto.
- [x] **Todos con la misma iniciativa (o todos sin iniciativa).** "Ordenar por
  iniciativa" no debe reventar ni mezclar aleatoriamente — con empates totales, el orden
  resultante debe ser el mismo que ya tenían (orden estable).
  Los 4 combatientes con iniciativa=5: antes de ordenar, `orden` 0-3 era
  villa/Beta/Alfa/gordo; después de pulsar "Ordenar por iniciativa", el `orden` en la
  base es exactamente el mismo (villa/Beta/Alfa/gordo, 0-3) — orden estable confirmado.
- [x] **Un solo combatiente en la cola.** "Siguiente turno" debe dar la vuelta
  inmediatamente cada vez que se pulsa (ronda sube cada pulsación), sin quedarse
  colgado ni marcar error.
  Combate nuevo con un único NPC ("Solitario"): cada pulsación de "Siguiente turno" subió
  la ronda (1→2→3) sin bloquearse ni dar error, "Turno de: SOLITARIO" siempre.
- [x] **Flechas en los extremos.** Ya verificado que se deshabilitan visualmente en el
  primero (▲) y el último (▼) — confirma también que si de alguna forma se fuerza el
  clic (por ejemplo con las devtools, saltándose `disabled`), el servidor lo rechaza con
  "No se puede mover más en esa dirección." en vez de reventar o mover a nadie.
  Deshabilitadas visualmente en los extremos, confirmado. Forzando el clic en "Subir a
  villa" (primer puesto) quitando el atributo `disabled` por consola: no revienta y el
  `orden` en la base no cambia (correcto), **pero no aparece ningún mensaje de rechazo en
  pantalla** — ni "No se puede mover más en esa dirección." ni ningún otro texto, y la
  consola del navegador tampoco registra error. El checklist esperaba ver ese mensaje
  explícito; lo que hay es un no-op silencioso.
- [x] **Doble clic rápido en "Siguiente turno".** Comprueba que no avanza dos turnos de
  golpe por una doble pulsación accidental — la UI debe deshabilitar los botones mientras
  hay una acción en curso (`pending`).
  Con un doble clic real (evento de navegador, `dblClick`) sobre "Siguiente turno" solo
  avanzó un turno (`turnoIndex` +1, no +2) — el guardarraíl funciona para un doble clic
  real. Nota aparte: forzando dos `.click()` síncronos desde consola (sin dejar que React
  procese el primero, un caso más agresivo que cualquier doble clic humano) sí avanzó dos
  turnos de golpe — no lo cuento como hallazgo porque no representa una interacción real,
  pero queda anotado por si se quiere blindar también ese caso límite.

## Bloque 2.4 — Delta de PG/fatiga

- [x] Camino feliz: `±N` aplicado a PG y a fatiga, clampado en `[0, máximo]` en los dos
  sentidos (daño de sobra no baja de 0, curación de sobra no sube del máximo) — ya
  verificado, repetir tras cualquier cambio en esta zona.
  "gordo" (PG 10/10, Fatiga 9/9): `-3` a PG → 7/10; `+100` a PG → clampa a 10/10; `-20` a
  fatiga → clampa a 0/9; `+100` a fatiga → clampa de vuelta a 9/9. Los cuatro casos
  correctos.
- [x] **Delta con decimales** (ej. "2.5"). El servidor no lo rechaza (`Number.isFinite`
  acepta decimales) — comprueba qué PG queda. Si sale un PG fraccionario (17.5/20),
  anótalo como hallazgo, igual que el PG del NPC ad-hoc.
  NPC "Muñeco" en 10/20, delta `+2.5` → queda en 12/20 (`SELECT "pgActual"` confirma
  `12` en la base) — trunca el resultado, no se guarda fraccionario. Mismo criterio que
  el PG inicial del NPC ad-hoc, no es un hallazgo.
- [x] **Delta en 0 o vacío.** El botón no debe hacer nada visible (ni gastar la llamada,
  ni "aplicar 0") si el campo está vacío o en 0.
  Con el campo vacío, "Aplicar a PG" no generó ninguna petición nueva (contadas antes y
  después con `list_network_requests`: mismo número). Con el campo en `0` explícito,
  tampoco generó petición ni cambió el PG.
- [x] **Delta no numérico** (pegar texto en el campo, aunque sea `type=number`). No debe
  reventar la petición ni dejar el campo en un estado raro.
  Forzando `value = "texto"` por consola sobre el input: el propio `type=number` del
  navegador lo descarta y el campo queda vacío (no hay forma de que llegue texto crudo).
  Pulsar "Aplicar a PG" en ese estado no cambia el PG ni revienta — se comporta como el
  caso de campo vacío.
- [x] **Aplicar a fatiga en un NPC ad-hoc o de catálogo** (fatiga máxima 0 siempre, no
  llevan ficha completa). Ya verificado que no revienta y se queda en 0/0 — repetir si se
  toca esta zona.
  "Muñeco" (fatiga 0/0): aplicar `+5` a fatiga no revienta y se queda en 0/0.
- [x] **PG a un personaje jugador real**, para confirmar que el clamp usa su máximo
  real (el de su ficha), no un valor genérico.
  Cubierto con "gordo" arriba: el clamp usa su máximo real de ficha (10), no un valor
  genérico.

## Bloque 2.5 — Aplicar/quitar estado

- [x] Camino feliz: elegir estado → grado (si tiene más de uno) → rondas precargadas →
  aplicar → insignia con el grado entre paréntesis solo cuando el estado tiene más de
  un grado; quitar con la "×".
  "Aturdido" en gordo: al elegirlo aparece el desplegable Grado (4 grados) con "Fracaso
  crítico" precargado y Rondas en "1". Al aplicar, insignia "ATURDIDO (FRACASO CRÍTICO)
  · 1R" con botón "Quitar". "Derribado" en villa (un solo grado): no aparece desplegable
  de Grado, la insignia sale sin paréntesis ("DERRIBADO").
- [x] **Volver a aplicar el mismo estado con otro grado.** No debe acumular dos
  insignias del mismo estado — la nueva sustituye a la vieja (mismo criterio que
  `modificadoresDeEstados()`). Comprueba el texto y las rondas de la insignia resultante.
  Con "Aturdido (Fracaso crítico) · 1R" ya aplicado a gordo, se reaplicó con grado
  "Éxito" y rondas "3": la insignia pasó a "ATURDIDO (ÉXITO) · 3R", una sola, sin
  duplicar.
- [x] **Rondas negativas** (escribir "-5" a mano en el campo, antes de aplicar). No hay
  guardarraíl contra esto en el servidor — comprueba qué pasa: ¿se aplica con rondas
  negativas y desaparece en el siguiente avance de turno (por el filtro `> 0`), o se
  comporta de otra forma? Anota el resultado exacto.
  Se aplica tal cual: insignia "DERRIBADO · -5R" (el campo incluso queda marcado
  `invalid` por el navegador, pero el submit no lo bloquea). En el siguiente "Siguiente
  turno" la insignia desaparece de golpe — confirma el filtro `> 0` tras el descuento.
- [x] **Vaciar el campo de rondas a mano** antes de aplicar, en un estado que traía un
  valor por defecto. Debe aplicarse como "sin límite" (no expira solo) — confírmalo
  dejando pasar varios turnos y viendo que la insignia no se mueve ni desaparece.
  **HALLAZGO:** no se guarda como "sin límite" — se guarda con el valor por defecto
  precargado del catálogo para ese estado/grado, como si nunca se hubiera vaciado. Pasos:
  elegir "Ceguera" (precarga Rondas="1"), vaciar el campo Rondas a mano, pulsar "Aplicar
  estado". La insignia sale "CEGUERA (FRACASO) · 1R" y
  `SELECT estados FROM "Combatiente" WHERE nombre='gordo'` confirma
  `{"rondasRestantes": 1}` en vez de `null`. Se reprodujo dos veces (una reaplicando
  "Aturdido" ya activo con 3R — se quedó en 3R en vez de null; otra aplicando "Ceguera"
  desde cero — cayó al 1R precargado). En ambos casos, tras un "Siguiente turno" la
  insignia desaparece (confirmando que quedó con duración finita, no "sin límite").
- [x] **Cambiar de estado en el desplegable varias veces seguidas** antes de aplicar
  (Aturdido → Ceguera → Parálisis...). El desplegable de Grado y el campo de Rondas deben
  actualizarse cada vez al nuevo estado, sin arrastrar el grado o la duración del
  anterior.
  Aturdido (grado forzado a "Éxito crítico") → Ceguera (rondas forzadas a "9") →
  Parálisis: el desplegable Grado quedó en "Fracaso crítico" (el primero de Parálisis,
  no "Éxito crítico" de Aturdido) y Rondas volvió a "1" (el precargado de Parálisis, no
  el "9" que se había forzado para Ceguera). No arrastra nada del estado anterior.
- [x] **Dos combatientes distintos con estados distintos a la vez.** Confirma que aplicar
  o quitar un estado en una fila no toca las insignias de otra fila.
  gordo con "PARÁLISIS (FRACASO CRÍTICO) · 1R" y villa con "MIEDO (ASUSTADO) · 2R" a la
  vez; al quitar el de gordo, la insignia de villa siguió intacta sin cambios.
- [x] **Catálogo completo visible.** El desplegable de Estado debe listar exactamente los
  20 (Atrapado, Aturdido, Ceguera, Confusión, Congelación, Corrosión, Derribado,
  Enfermedad, Entorpecido, Envenenamiento, Fusión, Hemorragia, Inmovilizado, Llamarada,
  Miedo, Parálisis, Shock, Sordera, Sorprendido y desprevenido, Inconsciencia) — **sin**
  Fatiga, Heridas ni Muerte, que no están en el catálogo a propósito
  (`catalog/estados.ts`).
  Contados en el desplegable real: los 20 exactos, en ese orden, sin Fatiga/Heridas/Muerte.

## Bloque 2.6 — Descuento automático de duración

- [x] Camino feliz: una duración de N rondas baja de uno en uno en cada "Siguiente
  turno" y desaparece sola al llegar a 0; un estado sin duración (`null`) no se toca
  nunca — ya verificado, repetir tras cualquier cambio en esta zona.
  gordo con "Aturdido · 3R": tres "Siguiente turno" seguidos → 3→2→1→desaparece
  (`estados: []`). villa con "Envenenamiento" sin rondas (`rondasRestantes: null`,
  aplicado dejando el campo tal cual venía, sin tocarlo): tras los mismos tres avances
  de turno sigue exactamente igual, `rondasRestantes: null` sin cambiar.
- [x] **Varios estados con distinta duración a la vez**, en el mismo o en distintos
  combatientes. Cada uno debe descontar de forma independiente — que uno llegue a 0 y
  desaparezca no debe afectar a la cuenta de otro.
  Entre dos combatientes: gordo (Aturdido 3R) y villa (Envenenamiento sin límite) a la
  vez — cada uno siguió su cuenta sin interferirse. En el mismo combatiente: villa con
  Envenenamiento (sin límite) + Ceguera (1R) simultáneos — al avanzar turno, Ceguera
  desapareció y Envenenamiento quedó intacto en la misma fila.
- [x] **Duración de 1 ronda.** Debe desaparecer en el siguiente "Siguiente turno" que se
  pulse — no esperar a dos.
  "Ceguera · 1R" en villa desapareció en el primer "Siguiente turno" tras aplicarla, no
  hizo falta un segundo clic.
- [x] **"Siguiente turno" con nadie en la cola con estados activos.** No debe fallar ni
  hacer trabajo de más (comprueba que no hay escrituras innecesarias si es fácil de ver,
  p. ej. por los logs del dev server).
  Con `estados: []` en los dos combatientes, "Siguiente turno" avanzó de GORDO a VILLA
  sin error visible ni en consola. No se revisaron los logs del dev server para
  escrituras de más (no era fácil de ver desde Chrome sin acceso a la terminal del
  servidor en este disparo), pero el comportamiento observable es correcto.

---

## Casos de permisos (transversal a todo el bloque)

- [ ] **Un jugador (rol PLAYER) no puede entrar en `/master/combate`.** Con la sesión de
  un usuario PLAYER, navega directamente a la URL — debe redirigir a `/characters`, sin
  enseñar nada de la consola.
- [ ] **D2 desde fuera de la UI** (no hay pantalla de jugador todavía, ver "Huecos
  conocidos"): con la sesión de un PLAYER, comprueba que **su propio** combatiente sí
  puede ajustarse y el de **otro** no. Como no hay botón, esto se prueba llamando a la
  acción directamente — o simplemente confía en `permisos.test.ts` (`canAdjustCombatiente`,
  8 tests) hasta que exista una UI real de jugador que lo ejerza de verdad. Si tocas esta
  lógica, no te fíes solo del test unitario: en cuanto exista la vista de jugador
  (fase 3), repite este caso de punta a punta en el navegador.
- [ ] **El resto de acciones (crear/terminar combate, añadir combatiente, mover turno,
  iniciativa, reordenar, aplicar/quitar estado) son solo-máster.** Confirma que ninguna
  tiene rastro de "o el dueño también" en el código (`requireMaster()`, no
  `canAdjustCombatiente`) — repásalo en `combate/actions.ts` si tocas permisos.

## Robustez general

- [ ] **Recargar la página (F5) a mitad de una sesión de combate.** Todo debe seguir
  ahí tal cual (ronda, turno, cola, insignias, PG/fatiga) — nada vive solo en estado de
  React sin persistir.
- [ ] **Dos pestañas de máster abiertas a la vez**, ambas sobre el mismo combate. Aplica
  un cambio en una, y sin recargar la otra, comprueba qué pasa si intentas otra acción
  desde la pestaña vieja (p. ej. mover un combatiente que la otra pestaña ya movió). No
  hay bloqueo optimista todavía — puede que "gane" el último en escribir; confirma que al
  menos no revienta ni dejar datos corruptos (dos combatientes con el mismo `orden`, por
  ejemplo).
- [ ] **Terminar un combate que ya está terminado** (dos clics rápidos en "Terminar
  combate", o forzar la llamada dos veces). `terminarCombateAction` no comprueba si el
  combate existe o ya está `TERMINADO` antes de actualizar — confirma si esto revienta
  con un error de Prisma sin capturar (registro no encontrado) en vez de un
  `{ok:false, error}` limpio. Si revienta, es un hallazgo real, no un caso exótico.

---

## Progreso de esta sesión de pruebas

- **Inicio:** 2026-09-10 19:04 CEST.
- Dev server y Postgres ya estaban arriba, con la migración de las 17:51 aplicada antes
  del arranque del server (18:23) — no hizo falta reiniciar.
- Sesión MASTER: ya había una sesión activa en el Chrome del MCP (usuario `master`,
  reutilizada de una sesión manual anterior) — no hizo falta registrar cuenta de prueba.
- Estado inicial de la base: 0 `Combate`, personajes `villa` (sin aprobar) y `gordo`
  (aprobado). Nada que limpiar antes de empezar.
