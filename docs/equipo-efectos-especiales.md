# Equipo — efectos especiales por pieza: hoja de ruta

El catálogo de equipo (fase 3, cerrada) transcribió cada pieza fielmente, incluido el
texto libre de columnas como "Especial"/"Efecto"/"Efectos" — pero **ese texto es solo
decorativo hoy**: `especial`/`efectos: string | null` se pinta como nota y no mueve
ningún número ni avisa de nada al jugar. Esta hoja de ruta es el barrido, pieza a
pieza, para convertir lo que tenga mecánica real en algo que la app sepa mostrar a
quien tira.

**No es fase 6b** (eso es combate en vivo) ni te obliga a tocar `docs/sistema.md` salvo
que aparezca una regla genuinamente ambigua — la mayoría de esto ya está `FIRME` en
`docs/equipamiento.md`, solo sin mecanizar.

## Cinco hallazgos, antes de la lista (2026-09-12, el 5º añadido 2026-09-21)

Revisando pieza a pieza contra el código real (no solo contra el PDF) aparecieron
cosas más grandes que "falta el efecto especial" — no son parte del barrido en sí,
mejor tratarlas aparte:

1. ~~**El Proyector de Pulso no genera ninguna tirada de ataque — y no es el único
   subsistema con este problema.**~~ **Construido 2026-09-23** (Murillo responde,
   sin número asignado en `sistema.md`: los "modo adicional" de nivel 2-4 son
   alternativas que el jugador elige libremente y puede cambiar cuando quiera, no
   niveles que se sustituyen). `tiradaDeProyectorPulso()` (`lib/rules/combate.ts`), registrada en
   `REGISTRO_DE_ATAQUE` bajo `"subsistema"` — primera familia con niveles que genera
   su propia Acción, requirió que `generaAccionPropia()` mirase el `MotorMetadata`
   acumulado de los niveles hasta el instalado (S9), no solo el del nivel exacto.
   Genera **dos Acciones gemelas** por pieza equipada, una por habilidad (Combate a
   Distancia / Tecnociencia) — la propia `descripcion` del subsistema dice que el
   aplicado es Reflejos "en ambos casos", así que no hizo falta inventar un
   mecanismo de "elige habilidad dentro de la misma tirada". Los tres matices que
   parecían bloqueantes se resolvieron así:
   - **Aguijón (melee dentro de arma a distancia):** al ser siempre Reflejos (nunca
     Potencia), no hay mezcla real de aplicados — es un modo más del selector, con
     `formulaDanio: "Fue+N"` en vez de un número, igual que un arma melee.
   - **"Elige habilidad":** resuelto con las dos Acciones gemelas (arriba), sin
     mecanismo nuevo.
   - **Los "Modo Adicional" de nivel 2-4:** confirmado por Murillo que son
     alternativas de elección libre, no exclusión forzada por un `CondicionTirada`.
     Se mecanizaron como texto informativo en la `nota` (mismo criterio "la app
     informa, no arbitra" que el resto del catálogo) en vez de un selector
     estructurado — el mecanismo genérico de impacto/crítico sigue sin construir
     (ver "El mecanismo genérico" más abajo), así que un selector estructurado solo
     para esta pieza habría sido inconsistente con el resto.
   **Lo que se queda fuera, a propósito:** las cargas por célula (RECURSOS) sí están
   conectadas (aviso de insuficiencia igual que munición); el "-5 al sigilo al
   disparar" **no** se construye — misma decisión de producto que la pregunta 25b
   (no sobrecargar la UI). El crítico "destruye 1 punto de blindaje" (nivel 4) se
   queda en texto, mismo patrón que Impacto Estructural de Kerzul. La "detonación de
   pulso térmico" de Malla Plasmática nivel 2 (mismo problema, ampliado 2026-09-23)
   **sigue sin construir** — esta tanda solo cubrió el Proyector de Pulso.
2. **"Munición Especial" y las 4 familias de "Armas Modificadas" (Electrificantes,
   Térmicas, de Plasma, de Nanofilamento) no existen en el catálogo.** No hay ninguna
   entrada en `MEJORAS_ARMA` con esos ids — hoy no se pueden ni comprar ni instalar.
   Antes de mecanizar su efecto hay que darlas de alta como piezas, con la
   complicación añadida de que su dificultad depende del tramo de daño básico del
   arma huésped (2 / 3-6 / 7+), no es un número fijo del catálogo como en el resto.
3. **Las salvaciones genéricas no saben contra qué se está resistiendo — y eso va a
   importar mucho en cuanto exista el mecanismo genérico de esta hoja de ruta.**
   Encontrado al preguntar por qué varias armaduras enseñan "+1 Fortaleza" y
   "+1 Reflejos" en azul (`docs/equipo-efectos-especiales.md` §Armaduras, item `arm2`):
   solo hay tres tiradas de salvación en `TIRADAS` — `salv_fortaleza`, `salv_reflejos`,
   `salv_voluntad` — y cada una cubre varios estados a la vez (`salv_fortaleza`: veneno,
   enfermedad, congelación, corrosión, fusión, shock, sordera, aturdimiento;
   `salv_reflejos`: al menos llamarada). Un bono como "+1 contra congelación y
   llamarada" (Traje Ultra Ligero, Soporte Vital, Polímero Anticorrosivo, Tejido
   Conductor...) hoy solo puede engancharse a TODA la tirada de Fortaleza o de
   Reflejos — no hay forma de decir "esto solo cuenta cuando se resiste congelación,
   no cuando se resiste veneno".
   **Por qué importa ahora, no antes:** hasta esta tarea, nadie había mirado con
   detalle qué resiste cada salvación — pero el propio mecanismo genérico que se está
   diseñando aquí (armas que en crítico exigen tirar contra Fusión, Shock, Ceguera,
   Aturdimiento...) multiplica los casos donde la especificidad de la salvación
   importa de verdad: un personaje con "+1 contra congelación" no debería llevarse ese
   +1 al resistir una Fusión de un arma de plasma, y hoy sí se lo llevaría porque las
   dos comparten `salv_fortaleza`.
   **Dirección propuesta (sin decidir, sin construir):** que la tirada de salvación
   pregunte "¿contra qué resistes?" — un array largo de opciones (congelación, veneno,
   corrosión, fusión, shock, sordera, aturdimiento, enfermedad, llamarada...), como un
   `CondicionTirada` tipo `opción` — y un tipo de alcance nuevo para `Modificador`
   (algo como `{ tipo: "salvacionContra", estadoId }`) que solo aplique cuando esa
   opción sea la elegida, mismo patrón que ya usa `modo` (que resuelve un modificador
   comparando contra la etiqueta del modo elegido, ver `docs/modificadores-tiradas.md`
   §5). Esto tocaría `tiradas.ts`, `modificadores.ts`, `TiradaModal.tsx`, y todo lo
   que hoy declara un modificador contra `salv_fortaleza`/`salv_reflejos` a pelo
   (armaduras, Soporte Vital, Anticorrosivo, Tejido Conductor). No es parte del
   barrido pieza a pieza — es una pieza de diseño de motor que varios items del
   barrido (`arm2`, `me1`, `me5`) están bloqueados por ella hasta que se decida.
4. **El tipo de daño elemental y su categoría de gravedad son cosas distintas, y el
   catálogo solo guarda una de las dos según lo que imprimiera la fila de origen.**
   `docs/sistema-y-combate.md` §"Daño específico" trae la tabla completa (ya `FIRME`,
   resumida en `sistema.md` líneas 290-294) — cada tipo elemental tiene su propia
   categoría de gravedad, y no siempre coincide con lo intuitivo:

   | Tipo | Categoría | Efecto |
   |---|---|---|
   | Eléctrico | Letal (grave en crítico) | Shock |
   | Fuego | Grave | Llamarada |
   | Frío | No letal (letal en crítico) | Congelamiento |
   | Corrosivo | Grave | Corrosión |
   | Plasma | Grave | Shock y llamarada — cuenta también como eléctrico **y** fuego si el objetivo es resistente/vulnerable a esos |
   | Sónico | No letal (letal en crítico) | Sordera y aturdimiento |
   | Tóxico | Letal | Envenenamiento, enfermedad o parálisis |
   | Mental | Letal | Omite armaduras y blindajes |

   `categoriaDanio: string` (`tiradas.ts`) es un texto suelto, sin tipo, y
   `resolverDanio()` lo pasa a través sin tocarlo — hoy carga lo que sea que
   escribiera la fila de `docs/equipamiento.md`: unas veces el **tipo elemental**
   ("Plasma" en la Plasma SD, "Fuego" en el Fusil Láser), otras ya la **categoría
   resuelta** ("Letal"/"Grave" directamente, como en Bellum o Rayo Ligero). El
   Marcador de `TiradasTab` ya muestra ese texto junto al daño (detectado por el
   usuario al preguntar por la Plasma SD: "debería aparecer 12 daño grave") — pero no
   siempre es la categoría real: un arma "Eléctrico" no dice en ningún sitio que
   cuenta como Letal. **Propuesta (sin construir)**: una tabla `TIPO_A_CATEGORIA` fija
   en el motor, y mostrar los dos en el Marcador cuando no coincidan ("Daño: 12 Plasma
   · Grave") — no colapsar el tipo elemental en la categoría, porque el propio Plasma
   lo necesita distinto (la regla de "cuenta como eléctrico y fuego" depende del tipo,
   no de la categoría). Toca a prácticamente todas las armas con daño elemental del
   barrido de abajo, no es un caso aislado de la Plasma SD.

   **Aclaración (2026-09-13, pregunta del usuario sobre la Rayo de Partículas):**
   "cinético" no es un noveno tipo elemental — es justo el caso base, "sin elemento",
   un golpe físico corriente. La frase "el ataque es de tipo cinético" (Rayo Ligero,
   Rayo de Partículas, Rayo de Largo Alcance) aclara que, aunque se vendan como armas
   de energía, mecánicamente golpean como un disparo normal. Confirmado en el
   catálogo: las tres ya llevan `categoriaDanio: "Grave"` **directamente**, sin nombre
   elemental — la ausencia de tipo elemental ES la forma correcta de representar
   "esto es cinético", nada que traducir con la tabla `TIPO_A_CATEGORIA`. Esto también
   explica el porqué del propio hallazgo: las armas que ya muestran la categoría
   resuelta directamente son las cinéticas (no la necesitan); las que muestran un
   nombre elemental son las que sí necesitan pasar por la tabla.

5. **No existe ningún cálculo de absorción de daño por blindaje en todo el motor —
   y el propio sistema tampoco dice la fórmula.** (2026-09-21, pregunta del usuario
   sobre Mejora Ignífuga.) `blindaje` **no aparece ni una vez en `src/lib/rules/`** —
   solo vive como número suelto del catálogo (`equipo.ts`), pintado en la ficha de
   Equipo (`PiezaDetalle.tsx:100`) sin que ningún cálculo lo consuma.
   `resolverDanio()` (`tiradas.ts:294`) hace `base + bonoExitos = total` y termina ahí:
   no resta blindaje, no sabe que existe. Tampoco hay un "blindaje total" agregado en
   `derivados.ts` (que sí suma Aplicados, Movimiento, etc.) — ni siquiera está
   calculado el ingrediente, solo el número de una pieza suelta.
   **Y no es solo que falte implementarlo: `sistema.md` ya tiene una pregunta abierta
   sin responder exactamente sobre esto — la 29** ("¿El daño de un arma se resta 1:1
   de los PG tras el blindaje? Con armas de 7-20 y personajes de 6-16, un disparo
   corriente se lleva media vida" — marcada *(C11)*, conflicto detectado). La única
   pista es la línea de "Absorción de daño" (`sistema-y-combate.md:134-136`): "el
   objetivo puede tener una puntuación de armadura que reduzca el daño total... algunas
   formas de absorción solo sirven contra determinados ataques o tipos" — dice QUE
   existe, no CÓMO se resta. El dato de que "Mental omite armaduras y blindajes"
   (`sistema-y-combate.md:279`) confirma que para el resto de tipos algo debería
   aplicar, sin decir cuánto.
   **Bloquea, sin conectar hasta ahora**: Mejora Ignífuga nivel 1 ("usar el blindaje
   total contra fuego" — implica que por defecto NO aplica), y todos los "el daño pasa
   a letal en vez de grave" ya marcados 🔕 IGNORAR por el mismo motivo sin que nadie
   los hubiera enlazado entre sí: Mejora Ignífuga nivel 2, Polímero Anticorrosivo
   nivel 2, Tejido Conductor nivel 2 (`me4`/`me6` del backlog).
   **Propuesta del usuario, sin construir, bloqueada por la pregunta 29**: una tirada
   "que no tira" — "Bloquear daño" — donde eliges tipo de daño + valor recibido y la
   app calcula cuánto se "come" el blindaje, consultable en cualquier momento (hoy no
   hay dónde consultar "cuánto aguanto", ni en la app ni en el documento). Necesita
   primero la fórmula de la 29, y que blindaje se agregue de verdad (armadura +
   subsistemas tipo Escudo Deflector/Malla Plasmática, que hoy tampoco suman a nada).
   **Prioridad alta (2026-09-21, el usuario lo marca explícitamente).** Además, la
   estructura de datos no puede ser un "blindaje total" plano y único — tiene que
   **entender de cuánto daño bloquea y contra qué tipos de daño concretos**, no un
   número suelto que se aplica igual a todo. Encaja con el propio Hallazgo #4 (tipo
   elemental vs. categoría): la absorción probablemente necesite razonar por tipo
   igual que las salvaciones del Hallazgo #3, no solo por categoría de gravedad.

## Cómo coger un item

1. Búscalo en `docs/equipamiento.md` (fuente de verdad) y lee la regla completa, no
   solo la fila de la tabla — el contexto de la sección explica el "por qué".
2. Contrasta contra el catálogo (`src/lib/catalog/equipo.ts`, `armasMelee.ts`,
   `estados.ts`) — mira si el estado que necesita ya existe. Si falta alguno, es un
   hueco de verdad: decláralo, no lo rellenes a ojo.
3. Márcalo `[x]` aquí con una línea de qué se hizo. Si acabó siendo genuinamente ad hoc
   (no encajó en el mecanismo genérico), dilo explícito y por qué.

## El mecanismo genérico

**[ ] Sin construir todavía.** Diseño hablado (2026-09-11/12):

- **Relacionado con el hallazgo #3** (arriba): este aviso solo dice "tira Salvación de
  Fortaleza/Reflejos contra Fusión/Shock/lo que sea, dificultad N" — no hace falta
  resolver la especificidad de la salvación para mostrarlo. Pero el día que además
  haya bonos que solo cuenten "contra tal estado" (como los que ya existen en
  armaduras), los dos mecanismos se cruzan: ese día sí hará falta la pieza de diseño
  del hallazgo #3, no antes.
- La gramática que sigue `docs/equipamiento.md` en decenas de filas es consistente:
  `Efecto X (N)` = al impactar, el objetivo tira de salvación contra el estado X con
  dificultad N; `Crítico de X (N)` = lo mismo pero solo en golpe crítico (en las armas
  de plasma, **sustituye** al efecto normal, no se suma).
- Propuesta: sustituir `especial`/`efectos: string | null` por campos estructurados —
  `efectoImpacto?: { estadoId: EstadoId; dificultad: number }` y
  `efectoCritico?: { estadoId: EstadoId; dificultad: number }` — y un aviso nuevo en
  `TiradasTab` (el `Marcador` del resultado) que, si la tirada fue de ataque, hubo
  éxito, y el arma trae el efecto aplicable, muestra "Shock, dificultad 7" o lo que
  toque. **Sin auto-aplicar nada** — el máster lo resuelve a mano con el control de
  estados que ya existe en la consola de combate: la app informa, no arbitra.
- **Variante encontrada al revisar**: unas pocas armas (escopetas y un par de
  ametralladoras) tienen "Efecto Derribo **a Corta Distancia**" — no depende de
  impacto/crítico sino del tramo de distancia ya elegido. El motor ya sabe qué tramo
  se eligió (`condicionTramo` en `combate.ts`), así que es una tercera variante
  razonable del mismo mecanismo (`efectoPorTramo?: { estadoId; dificultad; tramos:
  TramoDistancia[] }`), no haría falta inventar nada más.
- Piezas condicionadas a algo que el motor no rastrea en absoluto (distancia real al
  objetivo más allá del tramo, si hubo daño previo, ambiente narrativo) no encajan —
  para esas, la nota de texto de siempre, sin aviso automático.
- **Cuarta variante, corregida 2026-09-12**: el aviso no tiene por qué ser siempre "el
  objetivo resiste un estado" — también sirve para enseñar **la dificultad de esquiva
  de un ataque en área** (F. Auto de un arma de fuego, granadas, armamento pesado).
  Es la tirada de un tercero, la app no la resuelve — pero ocultarla del todo (como se
  hizo al principio con "F. Auto (Esquiva N)", corregido más abajo) fue un error: no
  auto-resolver y no informar son cosas distintas. Esta variante en concreto ni
  siquiera necesita depender de impacto/crítico, solo de qué modo está elegido — el
  disparador ya existe en el motor (`alcance: { tipo: "modo", contieneEtiqueta: "F.
  Auto" }`), es la variante más barata de las cuatro.
- **Quinta variante, propuesta 2026-09-21 (pregunta del usuario sobre el Mangual):
  texto libre segmentado por modo, sin estructurar en estado+dificultad.** Las cuatro
  variantes de arriba asumen que el efecto se puede reducir a `{ estadoId, dificultad,
  ... }` — pero hay reglas de arma que no encajan en esa forma (el "Bloqueo -2" y el
  "ignora 2 niveles de Cobertura física" del Mangual, `docs/equipamiento.md` §Flagelos:
  no son un estado que se resista, son texto de regla). Para esos casos no hace falta
  forzar la estructura: basta con mostrar el texto **tal cual, en el Marcador, filtrado
  por qué modo está seleccionado** (mismo disparador `alcance: { tipo: "modo", ... }`
  que ya usa la variante 4) — sin inventar un campo por cada regla nueva que aparezca.
  Sirve tanto para reglas mecanizables más adelante (Bloqueo, en cuanto se resuelva la
  pregunta 31 de `sistema.md`) como para las que nunca lo serán — el propio usuario lo
  resume con un ejemplo: una pistola cuyo efecto sea "el objetivo se enamora" se queda
  en texto para siempre, y **eso está bien**, no hay que perseguir un medidor de
  enamoramiento en la ficha. **Confirmado por el tipo `Tirada` (`tiradas.ts:27-65`):
  no lleva ningún campo de objetivo ni enlace a otro personaje** — arquitectónicamente
  no hay dónde engancharía un auto-aplicado aunque se quisiera, lo que hace explícito y
  no solo por convención el principio "la app informa, no arbitra".

## Propuesta: tirada nueva "Ocultar objeto" (2026-09-12, sin construir)

Salió de revisar el item del Mosquito de arriba: `ocultar_objeto` es un marcador sin
tirada real detrás, así que hoy el "+2 para esconder el arma" del Mosquito no hace
nada. Idea del usuario para darle destino de verdad, no solo al Mosquito — a
**cualquier arma que se quiera esconder**, con la dificultad subiendo según lo grande
que sea:

- Una tirada fija nueva, "Ocultar objeto" (Sigilo, seguramente + Reflejos o Agilidad —
  a decidir), con un selector (`CondicionTirada` tipo `opción`) de qué se esconde:
  **"Objeto pequeño"** genérico (dificultad baja, para lo que no es un arma) y una
  opción por cada arma que el personaje lleve equipada, con la dificultad subiendo por
  categoría de arma (más grande, más difícil de esconder).
- El **+2 del Mosquito** (y cualquier bono equivalente de otra pieza, ya cableado con
  el mismo `alcance: { tiradaId: "ocultar_objeto" }`) se sumaría solo a la opción de
  esa arma en concreto — necesita el mismo patrón que ya usa `modo` (un alcance que
  mira qué opción está elegida), no un bono a la tirada entera.
- **Las dificultades por categoría son una propuesta del usuario, no una regla del
  documento** — `docs/equipamiento.md` solo da el +2 del Mosquito, "respecto al resto
  de pistolas" (un bono relativo, no una dificultad absoluta de ocultar nada). No hay
  ninguna tabla de "dificultad de esconder un arma" en la fuente. Por eso esto no se
  implementa como una regla `FIRME`, sino como **supuesto numerado** con números de
  partida deliberadamente provisionales, para que el diseñador tenga algo concreto que
  corregir en vez de un hueco en blanco — mismo espíritu que ya usa el proyecto con
  otros supuestos (`docs/sistema.md`, S1-S16). Punto de partida propuesto (ajustable):
  Pistolas 7 (Mosquito 5, por su +2), Escopetas 8, Fusiles de Asalto 9, Fusiles de
  Precisión 10 — el resto de categorías (subfusiles, ametralladoras, armas melee,
  armamento pesado) sin asignar todavía.
- **Pendiente de decidir antes de construirlo**: ¿el par atributo+habilidad correcto es
  Sigilo a secas, o combina con algo más? ¿Aplica igual a un arma enfundada que a una
  claramente visible? Esto son preguntas para el diseñador, no para inventar aquí.

**Siguiente paso si se construye**: añadir el supuesto (S17) y la pregunta asociada en
`docs/sistema.md`, igual que el resto del catálogo de reglas inventadas-a-falta-de-dato.

**Extensión propuesta (2026-09-21, pregunta del usuario sobre Compartimento
Oculto): reusar el mismo selector para "resistir un registro", no solo para "pasar
desapercibido".** Compartimento Oculto (`docs/equipamiento.md:121-134`) sube +3/+4 la
dificultad **de quien te registra** — un momento de juego distinto al de "Ocultar
objeto" original (activo, del portador, para que nadie note el arma mientras camina)
pero con la misma necesidad de un selector "qué escondo, de qué tamaño". Complicaciones
genuinas antes de dar esto por diseñado:
- **La tirada contra la que compite ya existe, pero es de Herramientas**: `Escáner
  Detector` (`herramientas.ts:196-230`, Perspicacia + Tecnociencia/Biociencia,
  dificultad fija 6 superficial / 8 profundo) — y Herramientas está **fuera de
  alcance de esta tarea a propósito** (ver cabecera del documento). El +3/+4 de
  Compartimento Oculto apunta justo a esa frontera.
- **"Cacheo físico rutinario" no tiene tirada en ningún sitio** — ni fija ni de
  herramienta. Sería territorio nuevo entero, no un enganche a algo existente.
- **Decisión de diseño pendiente, no solo de datos**: ¿el Escáner Detector pasa de
  dificultad fija a **enfrentado** contra "Ocultar objeto" (cambia el diseño de una
  tirada que ya existe), o el +3/+4 se queda como nota informativa que el máster suma
  a mano sin tocar esa tirada? El cacheo físico seguiría sin sitio donde enganchar
  nada en cualquiera de los dos casos.

## Casos sueltos, por arma (genuinamente ad hoc)

A diferencia del mecanismo genérico de arriba (que cubre decenas de armas con el mismo
código), esto es exactamente lo que el usuario predijo al principio de la tarea:
reglas de una sola pieza, que no generalizan. Se recogen aquí aparte para no diluir la
lista principal con casos de uno.

- **Sydiasi — "puede usarse a dos manos para eliminar el penalizador por retroceso"**
  (2026-09-12). Hoy solo vive en `descripcion` (texto narrativo, no en `especial`) —
  cero mecánica: el modo F. Auto siempre cuesta -4, no hay forma de bajarlo a -3
  declarando que se agarra a dos manos. Un toggle tipo Bípode ("A dos manos") sería
  fácil de montar, **pero el motor de condiciones no sabe condicionar un toggle a qué
  opción está elegida en OTRA condición** (aquí, que el modo sea F. Auto) — sumaría el
  +1 también en modo Simple, donde no hay penalización que quitar. Arreglarlo bien
  exigiría lógica especial solo para esta pistola en `tiradaDeArmaFuego`
  (`combate.ts`), no el mecanismo genérico. **Verdad ignorable** (el propio usuario lo
  apunta): es un único punto de dificultad, en una sola pistola Poco Habitual, con una
  imprecisión menor si se implementa sin la condición cruzada (el jugador tendría que
  saber no activar el toggle en modo Simple). Sin decidir si merece la pena.

## Control de subtareas independientes (2026-09-21)

El barrido pieza a pieza de más abajo son casi todas variantes del mismo mecanismo
genérico — pero según se avanza van saliendo piezas que son **trabajo propio, aparte**,
que no se resuelven solas cuando el mecanismo genérico se construya. Se centralizan
aquí para no perder de vista qué queda, más allá de "qué arma falta revisar". Cada una
ya tiene su detalle completo en la sección que le corresponde — esto es solo el índice
de control.

- ✅ **Bug grande: los niveles de una pieza no se acumulaban (S9) — arreglado
  2026-09-25.** Detectado por el usuario probando Mira Telescópica + Visor Nocturno a
  la vez: equipar un nivel alto de una mejora hacía desaparecer lo que daban los
  niveles inferiores (`niveles.find(n => n.nivel === pieza.nivel)` en 6 funciones de
  `equipo.ts`/`combate.ts` solo miraba el bloque exacto). `sistema.md` ya documentaba
  S9 ("se acumula, salvo total explícito") pero nadie lo había implementado — el
  catálogo lo venía parcheando a mano, pieza por pieza (Soporte Vital, Sistema de
  Retroceso, Estabilizador Neuronal repetían el efecto de nivel 1 en los niveles
  superiores), parches que además se habrían duplicado con la nueva acumulación real.
  Arreglado con dos helpers genéricos en `equipo.ts` (`nivelesHasta`,
  `acumulaPorClave` para arrays indexados por clave — id de condición, alcance de
  modificador —, `ultimoQueDefine` para valores únicos tipo total como `ajusteTramo`)
  y quitados los parches a mano, que ya no hacen falta. Test nuevo por caso
  (`equipo.test.ts`): Soporte Vital n3 (un único +1, no +3), Sistema de Retroceso n2
  (un único +1, no +2), Mira Telescópica n3 (conserva el toggle de visión de n2).
- ⬜ **El mecanismo genérico en sí** (§"El mecanismo genérico") — sin construir, las 5
  variantes: impacto, crítico, por tramo, por modo elegido, y texto libre segmentado
  por modo (la quinta, 2026-09-21).
- ✅ **Fix barato: `arma.efectos` no llega al `nota` en melee** (§Kerzul, 2026-09-21,
  **arreglado 2026-09-23**) — `tiradaDeArmaMelee` (`combate.ts:269-296`) combinaba el
  aviso de Sutil con `arma.efectos` en el `nota`, mismo criterio que `arma.especial`
  en `tiradaDeArmaFuego`. Tests nuevos en `combate.test.ts` ("arma melee equipada").
  **Superado 2026-09-24**: el aviso de Sutil en texto desapareció al construirse el
  toggle real (ver `sistema.md` §"Tabla canónica de acciones") — `arma.efectos` sigue
  volcándose al `nota` igual que entonces, ya sin el texto de Sutil mezclado.
- ✅ **MINI ÉPICA (2026-09-21, propuesta del usuario — construida 2026-09-23):
  `CondicionTirada` y texto informativo en tiradas fijas de `TIRADAS`.**
  `condicionesActivas(sheet, ctx)` (`equipo.ts`) + `alcance`/`nota` en
  `CondicionTirada` (`condiciones.ts`) + enganche en `TiradasTab`/`TiradaModal`.
  Dos casos reales migrados: Visor Nocturno n2 y Visor Térmico n1. Detalle
  completo, incluida la forma exacta que quedó construida, en
  `docs/modificadores-tiradas.md` §8. Lo que queda es migrar más piezas
  (Mangual, Camuflaje Trifásico) — datos, no arquitectura.
- ⬜🏗️ **RECURSOS (2026-09-22, el usuario la propone)** — cargas de batería, munición,
  dosis, gastadas/recargadas en partida (Derivación Psiónica "Conversión Psiónica" es
  el primer caso concreto). Extensión de Fase 6b, no tab nueva de la ficha — precedente
  ya construido (`ajustarRecurso`, PG/fatiga). Detalle en `docs/tareas.md`, entrada de
  Fase 6b. Sin diseñar del todo, sin construir.
- ✅ **Hallazgo #1 (Proyector de Pulso), construido 2026-09-23.** Sigue pendiente la
  mitad de la ampliación: la "detonación de pulso térmico" de Malla Plasmática
  nivel 2, mismo problema, no cubierta en esta tanda.
- ⬜ **Hallazgo #2** — Munición Especial y las 4 Armas Modificadas no existen en el
  catálogo; hay que darlas de alta antes de mecanizar su efecto.
- ⬜ **Hallazgo #3** — Salvaciones genéricas sin especificidad ("¿contra qué resistes?").
  Bloquea `arm2`, `me1`, `me5` del backlog.
- ⬜ **Hallazgo #4** — Tipo elemental vs. categoría de daño mezclados en
  `categoriaDanio: string`; falta la tabla `TIPO_A_CATEGORIA`.
- 🟡 **Hallazgo #5 — fórmula resuelta 2026-09-24, sin construir todavía** — `sistema.md`
  pregunta 29/C11: **1 punto de blindaje absorbe 1 nivel (= 1 punto) de daño.** Sigue
  sin existir el cálculo en el motor (`blindaje` no aparece en `src/lib/rules/`).
  Desbloquea Mejora Ignífuga, Anticorrosivo nivel 2, Tejido Conductor nivel 2, y la
  propuesta de tirada "Bloquear daño". **Confirmado 2026-09-24:** el "ignora el
  primer nivel de daño X" de Ignífuga/Anticorrosivo/Tejido Conductor **suma** al
  blindaje normal contra ese tipo (un +1 a blindaje específico de tipo), no lo
  sustituye. Sigue abierto si la absorción base (sin esas mejoras) es plana para
  cualquier tipo de daño o el Mental es la única excepción confirmada (§7 de
  `sistema.md`) — conecta con el Hallazgo #4.
- ⬜ **Tirada nueva "Ocultar objeto"** (§"Propuesta: tirada nueva") — pendiente de
  validar con el diseñador antes de construir (dificultades por categoría inventadas).
- ⬜ **Sydiasi — caso ad hoc del retroceso a dos manos** (§"Casos sueltos, por arma") —
  lógica especial fuera del mecanismo genérico, sin decidir si merece la pena.
- ✅ **Pregunta 31 de `sistema.md` — "Bloqueo" sin definir — resuelta y construida
  2026-09-24.** Bloqueo mecanizado (`tiradaBloqueoDeArmaMelee()`, `combate.ts`), con
  el ajuste propio del Mangual (-2) y test (`combate.test.ts:342-373`).
- ⬜ **Kerzul — Inercia Entrópica** (§Kerzul, `ker3`) — mini-tarea propia: dificultad
  dinámica (el propio daño básico de la acción, no un número de catálogo), afecta a
  quien empuña, no al objetivo. No encaja en `efectoImpacto`/`efectoCritico`.
- ⬜ **Pregunta 32 de `sistema.md` — "susceptible a shock"/"apagón" sin definir de
  forma consistente** — bloquea Inyector Hipodérmico, y roza Soporte Vital/
  Anticorrosivo/Tejido Conductor. Pendiente de que Murillo la responda; parte de la
  respuesta además choca con Fase 5 (sintéticos/aumentos), ya bloqueada.
- ✅ **Bug arreglado: Soporte Vital duplicaba su modificador de +1 salv_fortaleza**
  (§Mejoras Estándar, `me1`, encontrado 2026-09-21, **arreglado 2026-09-23**) —
  distinto del hallazgo #3 (que sigue abierto, bloquea el resto de `me1`): esto era
  un bug de implementación puro, ya corregido en los 3 niveles de
  `catalog/equipo.ts`. Test `equipo.test.ts` actualizado para reflejar el +1
  correcto (antes esperaba el +2 del bug). Sin cambios de tipo ni de modelo de
  datos.

## Leyenda de la lista

| Marca | Significa |
|---|---|
| ✅ IMPLEMENTAR | Encaja limpio en el mecanismo genérico (o su variante por tramo). |
| ✔️ YA HECHO | Ya tiene un `Modificador`/`CondicionTirada`/`ajusteTramo` cableado en el catálogo — confirmado leyendo el código, no solo el PDF. |
| 🔕 IGNORAR | Depende de un concepto que el motor no modela (absorción, alcance, "ambiente tóxico", coste de acción) o de una tirada ajena al portador (la esquiva de un tercero, el cacheo de quien te registra) — mismo criterio que ya usa `equipo.ts` en su propia cabecera: forzarlo sería inventar una regla que el documento no da. |
| ❓ VERIFICAR | Encontré algo que no cuadra del todo, o que necesita mirarse con más calma antes de decidir — no es ni "hecho" ni "para implementar" todavía. |

## Backlog — por categoría (mismo orden que `docs/equipamiento.md`)

### Armaduras y Trajes

- Blindaje, bonif. de Agilidad, ranuras de subsistema, tope de exoesqueleto/mov. aérea:
  **✔️ YA HECHO** — campos numéricos del catálogo, consumidos por `derivados.ts`/`equipo.ts`.
- "+1 a salvación contra congelación y llamarada" (Traje Ultra Ligero, Ropa
  Inteligente, Armadura Ligera/Intermedia/Pesada): **❓ VERIFICAR**. Está cableado
  como `+1 a salv_fortaleza` **y** `+1 a salv_reflejos` en las cinco — pero
  `salv_fortaleza` es la salvación genérica que además cubre veneno, aturdimiento,
  sordera, corrosión, fusión, shock y enfermedad (ver su `nota` en `tiradas.ts`). El
  documento dice "contra congelación y llamarada", no contra todo eso. Puede ser una
  simplificación consciente de cuando se construyó la fase 3 (el motor no sabe acotar
  un modificador a "solo cuando la dificultad es de tal estado concreto") o un
  descuido que sobre-aplica el bono. No hay una forma limpia de acotarlo hoy sin un
  concepto nuevo — antes de tocarlo, decidir si se documenta como supuesto (S-número
  en `sistema.md`) o se dejaba así a propósito.
- Armaduras Avanzadas ("más rendimiento de subsistemas", "varias baterías a la vez"):
  **🔕 IGNORAR** — sin número, puramente narrativo.

### Mejoras Estándar

- **Soporte Vital (niveles 1-3): ❓ VERIFICAR, más grave de lo que parecía**
  (revisado a fondo 2026-09-21, pregunta del usuario). Dos problemas distintos, no uno:
  - **Bloqueado por el hallazgo #3** (igual que las armaduras) — la regla real
    (`docs/equipamiento.md:97-119`) distingue **tres cosas separadas**: Resistencia
    Térmica (+1 fijo contra frío/calor, solo nivel 1, incondicional) y Blindaje
    Ambiental (+1/+2/+3 según nivel contra tóxico/radiación, **y solo si hay daño en
    ese ambiente concreto** — nivel 1 da protección total normalmente, se degrada a
    +1 solo al recibir daño). El catálogo lo aplana todo a `salv_fortaleza` genérico
    sin nivel ni condición. Bloqueado hasta que se resuelva el hallazgo #3.
  - **✅ Bug de implementación aparte, arreglado 2026-09-23, no relacionado con el
    hallazgo #3**: los tres niveles (`catalog/equipo.ts`) llevaban el modificador
    `{ tiradaId: "salv_fortaleza", valor: 1 }` **literalmente duplicado** — la
    intención (según el comentario del propio código) era cubrir "congelación y
    calor extremo" con el mismo +1, pero al no haber forma de decir eso sin repetir
    la entrada, `resolverModificadores` (`modificadores.ts:131-132`, un `reduce` que
    suma sin deduplicar) aplicaba **+2 real** a Salvación de Fortaleza en vez de +1.
    Se veía en la UI como dos chips azules idénticos "+1 Salvación de Fortaleza"
    (`ChipsModificadores`, un chip por entrada del array). Verificado que NO pasa en
    Anticorrosivo/Tejido Conductor ni en las armaduras (`arm2`) — ahí cada
    modificador aparece una vez. **Corregido**: un único modificador por nivel, con
    comentario explicando por qué (congelación y calor extremo comparten el mismo
    +1, no son dos bonos). Test `equipo.test.ts` actualizado (antes esperaba el +2
    del bug). El resto del ítem (bloqueo por el hallazgo #3) sigue sin resolver.
- **Compartimento Oculto (+3/+4 dificultad para ser descubierto): ❓ VERIFICAR,
  reabierto 2026-09-21 (pregunta del usuario)** — antes marcado 🔕 IGNORAR liso
  ("sube la dificultad de QUIEN TE CACHEA, no hay tirada de cacheo a la que
  aplicarlo"), pero la mitad de la regla (nivel 2, "contra escáneres avanzados") SÍ
  apunta a una tirada real: `Escáner Detector` (Herramientas). Desarrollado como
  extensión de la propuesta "Ocultar objeto" más abajo — pendiente de decidir si el
  Escáner Detector se vuelve enfrentado, y el "cacheo físico" sigue sin ninguna
  tirada a la que engancharse en cualquier caso.
- Funda Automática / Inyector Hipodérmico (cambian el tipo de acción de un desenfundado
  o una aplicación): **🔕 IGNORAR** — no hay concepto de "coste de acción" mecanizado
  en ninguna tirada.
  **Aparte (2026-09-21, pregunta del usuario): "inmune/susceptible a shock" del propio
  Inyector Hipodérmico — ❓ VERIFICAR, bloqueado por pregunta 32 de `sistema.md`.**
  Nivel 1 es puramente mecánico (inmune a shock y pirateo); nivel 2 incorpora
  electrónica y "se vuelve susceptible a efectos de shock" — pero el documento nunca
  dice qué pasa exactamente cuando le afecta. Mismo patrón suelto que Soporte Vital
  ("apagón") y Anticorrosivo/Tejido Conductor ("no es susceptible a shock") — cuatro
  piezas, tres comportamientos distintos bajo la misma etiqueta de texto, ninguno
  definido del todo. El estado `Shock` (`estados.ts:670-678`) ya prevé una rama para
  "equipamiento o armadura tecnológica" pero está deliberadamente sin mecanizar,
  bloqueada por Fase 5 (sintéticos/aumentos, `tareas.md`). No es "añadir una variable
  a todo": hay al menos tres comportamientos distintos que unificar primero, y una
  dependencia real con una fase ya bloqueada por el diseñador.
- **Mejora Ignífuga: nivel 1 (usar blindaje total contra fuego) y nivel 2 (fuego cuenta
  como letal, +2 en vez de +1 contra llamarada): 🔕 IGNORAR hasta que se construya el
  Hallazgo #5** (fórmula ya resuelta 2026-09-24: 1 blindaje = 1 nivel de daño; falta el
  cálculo en código). No confundir con `resolverDanio`, que es daño por éxitos, no
  reducción por blindaje. Se revisita junto con Polímero Anticorrosivo/Tejido Conductor
  en cuanto se construya el Hallazgo #5.
- Polímero Anticorrosivo / Tejido Conductor (+1/+2 contra un estado; "ignora el primer
  nivel de daño X"): el "+1/+2" **❓ VERIFICAR** (mismo caso salv_fortaleza genérico de
  arriba); el "ignora el primer nivel de daño" es un **+1 a blindaje específico de ese
  tipo de daño (confirmado 2026-09-24)** — **🔕 IGNORAR hasta que se construya el
  Hallazgo #5**, mismo motivo que Mejora Ignífuga.
- **Visor Nocturno / Visor Térmico — reabierto 2026-09-21, ✅ construido
  2026-09-23.**
  - `+3 contra ceguera` (Visor Nocturno n2): **✔️ YA HECHO** (`salv_ceguera_destello`,
    bien acotado — es un `tiradaId` marcador específico, no el Fortaleza genérico).
  - "cegado dificultad 8 ante fogonazo" (n1): sigue **🔕 IGNORAR** — depende de que el
    máster narre un fogonazo, ningún mecanismo lo resuelve.
  - **"-2 cobertura visual dentro de 50m" (n2) y "-3 fuera del gradiente térmico"
    (Térmico n1): ✅ HECHO, como texto informativo, no auto-aplicado** (siguen sin
    poder auto-aplicarse — dependen de distancia real / si lo mirado está dentro o
    fuera del gradiente, cosas que el motor no rastrea). Construido el mecanismo del
    §8 de `docs/modificadores-tiradas.md`: cada mejora declara un `CondicionTirada`
    tipo `toggle` con `alcance: { tipo: "tiradaId", id: "alerta_activa" }` y `nota`
    — aparece como interruptor en la tirada "Buscar / percibir" **solo si el
    personaje lleva el visor puesto**, y al activarlo se ve el texto en el modal.
    Primeros dos casos reales del mecanismo genérico nuevo.
  - **Visor Térmico n2 (rastro térmico reciente, con caducidad 5 turnos/10-15 min, a
    la mitad con frío/ventilación) no encaja en nada de esto**: no es un modificador de
    ninguna tirada, es una capacidad narrativa de rastreo — se queda en texto puro,
    **🔕 IGNORAR** confirmado.
  - **Homogeneización 2026-09-25 (revisión de Mira Telescópica n2):** Visor Nocturno
    **n1** (visión en penumbra, sin matiz numérico) se había dejado `narrativo/construido`,
    sin toggle ni nota — la única pieza de este grupo con esa forma distinta, aunque da
    exactamente el mismo tipo de resultado (una capacidad sensorial, sin número, que vale
    la pena recordar en Buscar/percibir) que sus hermanas. Corregido a la misma forma que
    Visor Térmico n1: toggle con `alcance: alerta_activa`, `valorActivo/valorInactivo: 0`,
    nota "Ves en penumbra y oscuridad parcial." **Mira Telescópica n2** ("visión nocturna y
    térmica, como el visor de nivel 1", `docs/equipamiento.md:674`) recibe la misma forma,
    sin heredar el -3 del gradiente térmico (el texto no lo menciona) — a confirmar con
    Murillo si debería. Test actualizado (`equipo.test.ts`).

### Subsistemas

- **Camuflaje Trifásico — reabierto 2026-09-21 (pregunta del usuario: ¿a qué tirada
  afecta, numérico/condición/texto?).** Confirma algo más grande que la propia pieza:
  - **Bonificador numérico: 🔕 IGNORAR, y no es "falta esfuerzo" — es estructural.**
    La Cobertura (narrativa y la de esta pieza) sube la dificultad de la tirada de
    **quien ataca o busca al portador**, nunca la del propio portador — y
    `Modificador`/`alcance` solo sabe aplicar bonos a la tirada de quien la lleva
    puesta (`modificadoresActivos(sheet)`, siempre del propio personaje). No hay
    ningún mecanismo, ni en teoría, para que un bono alcance la tirada de un tercero
    — consecuencia directa de que `Tirada` no lleva campo de objetivo (`tiradas.ts:
    27-65`, ya confirmado al principio de esta sesión). `modificadores: []` vacío en
    los 4 niveles (`equipo.ts:1682-1697` y siguientes) ya lo reflejaba, solo que sin
    explicar el porqué estructural.
  - **CondicionTirada: mismo bloqueo**, mismo motivo (no hay tirada de un tercero a
    la que enganchar nada).
  - **Texto informativo: ✅ IMPLEMENTAR (quinta variante) — caso limpio, dos tiradas
    candidatas (corrección 2026-09-21, apunte del usuario).** `sigilo` (detección:
    visual/térmica/acústica) y **`defensa`** ("Defensa / esquiva" — encaja aún mejor
    para "dificulta ser acertado por ataques a distancia o melee",
    `equipamiento.md:255`) — las dos ya existen en `TIRADAS`, las dos son del propio
    portador. Con una `CondicionTirada` tipo opción (Modo Activo Estático/Dinámico,
    Pasivo, Desactivado) mostrarían "Cobertura 3/3/4 (Visual/Térmica/Acústica)" como
    recordatorio para que el máster lo aplique a mano contra quien ataque o busque
    al portador — informa donde sí tiene sentido (la tirada propia), no donde no
    puede (la ajena). Mismo bloqueo de arquitectura que el §8 de
    `modificadores-tiradas.md` (extender `CondicionTirada` a tiradas fijas) — buen
    caso de prueba real para cuando se diseñe.
  - El apartado de "ocultar un objeto en contacto directo, tamaño limitado" refuerza
    la propuesta "Ocultar objeto" de más arriba, mismo tipo de necesidad.
- **Derivación Psiónica — desglosado en 5 piezas (2026-09-22, pregunta del usuario:
  a qué tirada afecta cada una, conceptualmente e ignorando límites de hoy).**
  Confirmado en código que los `tiradaId` marcadores (`resistir_retroceso_psionico`,
  `resistir_metasensoria`, `poder_psionico`) apuntan a tiradas que no existen todavía
  porque la psiónica está `PENDIENTE` en `sistema.md` — correcto tal cual, no tocar
  hasta que exista esa parte del sistema. El desglose:
  - **Estabilizador Neuronal Básico** (+1 resistir retroceso/desorientación):
    **✔️ YA HECHO** (en cuanto exista la tirada) — numérico limpio, self-tirada, sin
    problema de objetivo.
  - **Blindaje Psico-Reactivo** (+1 resistir metasensoria): **✔️ YA HECHO** igual —
    es una salvación, la tira el propio objetivo (a diferencia de la Cobertura de
    arriba, aquí no hay problema de "tirada de un tercero").
  - **Simbiosis Sináptica Total** (reduce en 1 el penalizador por fatiga en tiradas
    de poder): **✔️ YA HECHO como simplificación** — numéricamente equivale a +1,
    pero conceptualmente es "cancela parte de un penalizador condicional que ya
    existe" (Fatigado/-1, Exhausto/-2), no un bono nuevo — condicional sobre otra
    condición. Aceptado tal cual por ahora, sin mejor forma de representarlo con el
    motor actual.
  - **Canal de Alta Resonancia** (+10% de alcance efectivo del poder): **❓
    VERIFICAR/PROPUESTA** — no es un bono a una dificultad, es un modificador
    porcentual a un valor derivado distinto (alcance del poder, no existe todavía).
    Añadida como pregunta 33 en `sistema.md`: sugerir a Murillo que sea un +N fijo
    en vez de %, para no necesitar un tipo de `Modificador` nuevo solo para este caso.
  - **Conversión Psiónica** (N cargas de la célula → absorbe 1 punto de fatiga
    psiónica): **❓ VERIFICAR, no es ninguna de las tres categorías tal cual.** No
    modifica la dificultad de ninguna tirada — es una conversión de recurso (batería
    → fatiga), declarada al usar el poder. Emparentado con **RECURSOS**, discusión
    nueva abierta 2026-09-22 (ver `docs/tareas.md`, entrada de Fase 6b) — mismo
    patrón que ya existe para PG/fatiga en combate (`ajustarRecurso`,
    `master/combate/actions.ts:323`), generalizado a cargas de equipo. No es un
    modificador de tirada, es una acción de recurso ligada al momento de tirar.
- **Escudo Deflector — confirmado 2026-09-23 (pregunta del usuario): directo, sin
  nada nuevo que decidir.** La "absorción de daño" **🔕 IGNORAR por ahora** — pero no
  por falta de concepto genérico, es literalmente otro contribuyente más a la misma
  fórmula que le falta al Hallazgo #5 (blindaje de armadura + esto). Se resuelve el
  día que se diseñe el Hallazgo #5, no antes.
- **Malla Plasmática — desglosada del todo 2026-09-23 (pregunta del usuario: "¿es
  un recurso, ni siquiera entra en Tiradas?").** Tenía razón en parte, pero hay más
  piezas de las que parecía:
  - **El "colchón de PG" no es blindaje** — es un buffer separado con vida propia
    (10-16 PG según nivel, regenera N/turno, tiempo muerto si se destruye), distinto
    de una resta plana de blindaje. **🔕 IGNORAR** sigue aplicando, pero como nuance
    nueva para cuando se diseñe Hallazgo #5/RECURSOS: hay al menos dos formas de
    "absorber daño" en el sistema, no solo una.
  - "Crítico melee con plasma liberado causa shock/llamarada/fusión (dificultad
    6-8+nivel)": **✅ IMPLEMENTAR**, sin cambios — `CondicionTirada` tipo `toggle`.
  - **El coste de esa opción (2 puntos del colchón, "se declara antes de la tirada
    de ataque") es una acción sin dado** — mismo patrón exacto que la Conversión
    Psiónica de Derivación Psiónica (ayer). Ver la nota nueva de "Acciones vs.
    Tiradas" en `docs/modificadores-tiradas.md` §8.
  - **"Si el usuario es impactado en melee, devuelve daño al atacante"**: mismo
    problema que la Cobertura — es la tirada de un TERCERO (el atacante), no la
    propia. No auto-aplicable; como mucho, aviso en la propia `defensa`.
  - **"-8 sigilo al activarse, anula el camuflaje"**: modificador numérico limpio a
    `sigilo`, condicionado a que la Malla esté activa — y **activar la Malla en sí
    es una acción sin dado** (gastas 1 carga, no tiras nada), que luego SÍ modifica
    otras tiradas mientras dura. Otro caso real del mismo patrón de "Acciones".
  - **Nivel 2, "detonación de pulso térmico" (área 6x6, esquiva, shock+llamarada,
    fusión con fracaso crítico) — mismo problema que tenía el Proyector de Pulso
    (Hallazgo #1), ya resuelto para éste pero NO para la Malla Plasmática**: sigue
    sin tirada de ataque propia. Candidata siguiente si se decide que merece la pena.
- **Proyector de Pulso: Hallazgo #1, construido 2026-09-23** —
  `tiradaDeProyectorPulso()` (`lib/rules/combate.ts`). Sus 4 modos y los tres "modo
  adicional" de nivel 2-4 están todos mecanizados: **✅ HECHO**, texto informativo
  en la nota de la tirada (no un `CondicionTirada` estructurado, ver detalle en el
  propio Hallazgo #1 más arriba).

### Mejoras de Movimiento

- Exoesqueleto (+N Fuerza): **🔕 IGNORAR**, y ya documentado explícitamente así en el
  propio catálogo ("se queda sin mecanizar a propósito... hasta que aparezca un
  segundo caso que justifique generalizarlo").
- Movilidad Aérea (dificultad de maniobra, velocidad, potencia máxima): **🔕 IGNORAR**
  — todo depende de estar en "modo vuelo" activo, sin ese contexto en el motor.

### Armas de fuego (pistolas, escopetas, subfusiles, fusiles de asalto/precisión, ametralladoras)

- Daño/dificultad/alcance por modo de disparo: **✔️ YA HECHO** (`arma.modos`,
  `arma.alcance`, ya alimentan `combate.ts`).
- `Efecto X (N)` / `Crítico de X (N)` en la columna Especial/Efecto (≈30 armas: Bellum,
  Dragon, Sydiasi, Norgul, Pistola Láser, Rayo Ligero, Plasma SD/SC/SB/SA/SS/AAA/Plaga,
  Feritas, Azra, S.A.79, Gong, Nova, Vrekoy, FAS 300, Victoria, Impetus, Davray, B12,
  Fusil Láser, Yojimbo, Rayo de Partículas, Telum, Yivrem, K9K, Tshulok, Láser/Rayo de
  Largo Alcance, Asina, Graviter, Zotrex, Matanza, Electro TK): **✅ IMPLEMENTAR** —
  el grueso del trabajo de esta tarea, una pasada mecánica arma por arma con el mismo
  código (piloto ya hecho en conversación con la familia de plasma: Efecto Shock y
  Llamarada al impactar, Crítico de Fusión en su lugar, dificultad 11-14 según el
  modelo).
- `Efecto Derribo a Corta Distancia (N)` (Feritas, Azra, S.A.79, Gong, Asina, Graviter,
  Zotrex, Matanza, Electro TK): **✅ IMPLEMENTAR** con la variante por tramo (ver
  "El mecanismo genérico" arriba). El estado `derribado` en sí **ya existe entero**
  (`catalog/estados.ts`) — falta solo el aviso, no el estado. **Nota (2026-09-12,
  pregunta del usuario):** el **+1 al ataque** que además llevan las escopetas en
  Corta/Bocajarro (característica de familia, no de esta columna) **ya está
  implementado** — `ajusteTramoBase()` en `combate.ts` ya lo suma solo para
  `tipo === "escopeta"` (y el -2 de fusiles de precisión, la otra excepción de
  familia, también). El Derribo en sí no lleva ese +1, son dos cosas separadas que
  coinciden en el mismo tramo. **Hallazgo menor, confirmado contra el render del PDF
  (páginas 18 y 23-24, no solo pdftotext, 2026-09-13)**: las versiones de plasma de
  escopeta y ametralladora (Plasma SC, Plasma AAA) son las únicas de sus categorías
  cuya columna "Efecto"/"Efectos" no lista "Derribo a Corta Distancia" — solo llevan
  "Efecto Shock y Llamarada · Crítico de Fusión · F. Auto (Esquiva N)", pese a que la
  característica general de la categoría dice que TODAS las escopetas/ametralladoras
  causan Derribo en esos rangos. No es un artefacto de extracción de texto, está así
  en el propio render. Lectura más probable: las versiones de plasma usan esa misma
  casilla para su efecto elemental en vez de sumar también Derribo (una pieza, un
  efecto especial) — consistente en las dos categorías, así que parece intencional y
  no un descuido puntual, pero sigue siendo lectura nuestra, no una frase explícita
  del documento que lo diga.
- `F. Auto (Esquiva N)`: **✅ IMPLEMENTAR (corregido 2026-09-12)**. Duda del usuario que
  destapó el error: se había marcado "ignorar" razonando solo "es la tirada de un
  tercero, no la resuelve la app" — cierto, pero eso no es motivo para no *enseñarla*.
  En F. Auto el arma deja de tirar contra un objetivo y pasa a atacar en área (2
  casillas, 4 en ametralladoras): quien cae dentro tira su propia Esquiva contra esa
  dificultad fija, la app no la resuelve — pero sí debería aparecer junto al daño
  ("Daño: 11 Fuego · Esquiva del área: dificultad 9"), igual que un aviso de crítico.
  Más fácil de montar que el propio mecanismo genérico: el disparador ya existe en el
  motor (`alcance: { tipo: "modo", contieneEtiqueta: "F. Auto" }`, el mismo que usa el
  Sistema de Retroceso) — solo hace falta un campo `esquivaFAuto?: number` por arma y
  mostrarlo cuando ese modo esté elegido, sin inventar ningún mecanismo nuevo.
- Mosquito ("+2 para esconder el arma"): **❌ CORREGIDO (2026-09-12): no está hecho.**
  Se había marcado "hecho" porque el modificador `+2` con
  `alcance: { tipo: "tiradaId", id: "ocultar_objeto" }` ya existe en el catálogo — pero
  `ocultar_objeto` **no es una tirada real**, no está en `TIRADAS` (`tiradas.ts`). Es el
  mismo patrón que `resistir_retroceso_psionico` (marcador sin destino, `docs/
  modificadores-tiradas.md` §5): el modificador se calcula y no llega a ningún sitio.
  El usuario lo detectó probando la app de verdad — no hay ninguna tirada de "ocultar
  un objeto" ni una opción dentro de Sigilo. Ver la propuesta de diseño más abajo
  ("Tirada nueva: Ocultar objeto"), que resuelve esto y de paso da destino real al
  marcador.

### Mejoras en Armas de Fuego

- Bípode (apoyado/no apoyado), Sistema de Retroceso (F. Auto): **✔️ YA HECHO** — trazados
  en `docs/modificadores-tiradas.md` como ejemplo del mecanismo de condiciones.
  **Arquitectura corregida 2026-09-25: `condicionesActivas()`/`indiceDeCondiciones()`
  (`equipo.ts`) ya no excluyen `mejoraArma`.** Dos casos reales (Puntero Láser -2
  sigilo, Mira Telescópica bono a percepción) pedían lo mismo — dejó de ser
  "generalizar por si acaso" para ser el segundo caso confirmado. Salvaguarda contra
  duplicar lo que `condicionesDeMejoras()` ya aporta sin condiciones: una mejora de
  arma nunca debe declarar `alcance` sobre su propia tiradaId. Test nuevo en
  `equipo.test.ts` que fija este comportamiento.
  **Mira Telescópica niveles 1/3, sigue sin construir — ya no por arquitectura, por
  diseño sin resolver:** el bono al **ataque** (media/larga distancia) sí está
  construido (`ajusteTramo`). El mismo bono a **percepción/búsqueda** (`alerta_activa`)
  no tiene dónde enganchar el "solo en media/larga distancia" — `alerta_activa` es una
  tirada fija sin ningún concepto de tramo/Distancia (eso solo existe en las tiradas de
  ataque, vía la `CondicionTirada` "Distancia" que genera cada arma). Antes de
  construirlo hay que decidir: ¿se simplifica a un toggle plano (+1/+2 mientras se use
  la mira para buscar, sin condicionar a distancia) o se le añade un selector de
  Distancia a `alerta_activa` solo para esto? Metadata dejada en `bloqueado` con el
  motivo real hasta que se decida.
  **Aclaración (2026-09-13, pregunta del usuario sobre qué es "retroceso"):** no es un
  penalizador que se acumule disparo a disparo — es la dificultad, ya fija, que F. Auto
  tiene peor que Simple/Estándar en el propio arma (p. ej. Sydiasi -3/-4: ese -1 de
  diferencia ES el retroceso, ya viene en los `modos` del catálogo, nada que
  implementar ahí). Las armas de plasma ya llevan la MISMA dificultad en sus dos modos
  (p. ej. Plasma SD: -3/-3) — así es como el catálogo ya refleja "no acumulan
  retroceso", correcto tal cual. La mejora Sistema de Retroceso (+1 en F. Auto) ya
  excluye plasma vía `compatibilidad: excluyeCategoriaDanio: ["Plasma"]`. Único límite,
  ya conocido y ya comentado en el propio catálogo (no un hallazgo nuevo): "en
  ametralladoras ayuda en cualquiera de sus modos" no se puede expresar con el alcance
  actual (`modo`, que solo sabe si F. Auto está elegido, no si el arma es una
  ametralladora) — en una ametralladora disparando en modo Estándar, ese +1 no se
  aplica aunque debería.
- **Revisión pieza a pieza 2026-09-25** (Puntero Láser, Silenciador, Linterna, Bayoneta,
  Lanzagranadas Integrado) — confirmado que la mayoría de "huecos" de esta lista no son
  arquitectura, es `MotorMetadata`/dato sin rellenar en la pieza (barrida por agentes en
  paralelo antes de existir el motor, ver `docs/tareas.md`):
  - **Puntero Láser: ✅ construido entero 2026-09-25** (+1 al ataque y -2 al sigilo,
    los dos). El +1 al ataque (`ataque_fuego`) le faltaba el bloque `condiciones`
    (toggle) que el Bípode ya tenía — `condicionesDeMejoras()` (`combate.ts`) es
    genérico, no hacía falta código nuevo, solo el dato (`mejorasArma.ts`). El -2 al
    sigilo necesitó además quitar la exclusión de `mejoraArma` en
    `condicionesActivas()`/`indiceDeCondiciones()` (`equipo.ts`) — dos toggles
    independientes en el mismo nivel, uno sin `alcance` (vive en `ataque_fuego` vía
    `condicionesDeMejoras`) y otro con `alcance: {tiradaId: "sigilo"}` (vive en la
    tirada fija "Sigilo" vía `condicionesActivas`), sin estado compartido entre ellos
    — mismo patrón de toggles independientes que Visor Nocturno/Térmico.
  - Silenciador, Linterna, Bayoneta, Lanzagranadas Integrado: pendientes de esta misma
    revisión, uno a uno.
- Láser de Largo Alcance / Rayo de Largo Alcance — alcances: **✔️ YA HECHO**, verificado
  contra el código a petición del usuario (2026-09-13): `equipo.ts` ya lleva
  `{ corta: 50, media: 1000, larga: 2000 }` y `{ corta: 50, media: 1200, larga: 2400 }`
  exactos de la tabla, y ya son los de mayor alcance de los 8 fusiles de precisión
  (por encima de Telum/Yivrem/K9K/Tshulok). Nada que cambiar. **Pendiente relacionado,
  sin verificar todavía**: las dos dicen llevar integrada la Mira Telescópica de nivel
  1, y la característica general de Fusiles de Precisión dice que ese +1 "ya está
  contabilizado en la dificultad de ataque y en las mejoras disponibles" — no
  comprobado si `mejorasAdmitidas: 3` en estas dos realmente descuenta el hueco
  ocupado por la mira integrada o es el mismo número que un fusil de precisión sin
  ella.
- Munición Especial (mejora de arma, para instalar munición perforante/incendiaria/
  etc.): **❓ VERIFICAR si existe siquiera en el catálogo** — no la vi en
  `MEJORAS_ARMA` al buscar. Si no está, hace falta darla de alta antes de mecanizar
  nada de la sección "Munición" de abajo.

### Munición

- Munición Regular: solo coste, sin efecto — nada que hacer.
- Munición Especial (Perforante, Incendiaria, Electrizante, Tóxica, Criogénica,
  Corrosiva, Radiactiva, Supresora): **✅ IMPLEMENTAR** el efecto (mismo patrón
  impacto/crítico que un arma), **pero depende del hallazgo #2** de arriba — si la
  pieza no existe en el catálogo, hay que crearla primero. Perforante además "ignora
  los 2 primeros puntos de blindaje" — campo estructurado nuevo, no solo estado+
  dificultad (mismo caso que Nanofilamento más abajo).
  **También depende del hallazgo #3, confirmado 2026-09-21 (pregunta del usuario)**:
  `docs/equipamiento.md:762-802` nombra el estado y dificultad exactos de cada una —
  Incendiaria→Llamarada(7)/Ceguera(10) en crítico, Electrizante→Shock(7→10),
  Tóxica/Radiactiva→envenenamiento(7), Criogénica→Congelación(7), Corrosiva→
  Corrosión(7), Supresora→"la toxina"(8) — casi todas bajo `salv_fortaleza`
  (Llamarada bajo `salv_reflejos`). En cuanto existan como pieza, los bonos ya
  cableados de Anticorrosivo ("+2 contra corrosión") o Tejido Conductor ("+2 contra
  shock") se aplicarían a las ocho munición por igual sin el hallazgo #3 resuelto —
  mismo bug de sobre-aplicación que `arm2`/`me1`/`me5`, multiplicado.

### Otras Armas a Distancia (Armamento Pesado, Granadas)

- Ambas categorías: `Efecto X (N)` que golpea a quien falla la esquiva de área:
  **✅ IMPLEMENTAR**, mismo mecanismo. La propia dificultad de esquiva del área
  (`Esquiva (N)`) — **corregido 2026-09-12, mismo motivo que el de arriba**: es la
  tirada del objetivo, la app no la resuelve, pero sí se enseña junto al daño
  ("Esquiva del área: dificultad 8") — **✅ IMPLEMENTAR** también, no ignorar.
- Granada de Plasma: mismo patrón Shock+Llamarada / Crítico de Fusión que las armas de
  plasma — **✅ IMPLEMENTAR** junto con el resto de la familia.

### Combate Melee

- **Mangual — "Bloqueo -2" y "Acción Estándar ignora 2 niveles de Cobertura física"**
  (2026-09-21, pregunta del usuario). Ojo, esto vive en `uso`, no en `efectos` — es
  distinto del resto de esta sección. **"Bloqueo -2": ✅ resuelto y construido
  2026-09-24 (pregunta 31, ver más abajo).** "Ignora 2 niveles de Cobertura física"
  sigue **❓ VERIFICAR, bloqueado** (ver más abajo, es un problema aparte).
  - **"Bloqueo" no existe como mecánica en ningún sitio del proyecto** — ni en
    `sistema.md`, ni en `sistema-y-combate.md`, ni en el código (`tiradas.ts` no tiene
    ningún `tiradaId` ni nota que lo mencione). La única aparición en todo el proyecto
    es esta fila del Mangual. La única defensa que el sistema define es la "Acción
    defensiva" genérica (`sistema-y-combate.md` §"Acción defensiva"): reacción
    gratuita, por defecto Reflejos + Atletismo (ya cableada como la tirada fija
    `defensa`, `tiradas.ts:86`) — con la frase "Existen otras formas de defensa" sin
    desarrollar. Bloqueo probablemente sea una de esas otras formas (defenderse con el
    arma en mano), pero no hay fórmula ni valor base al que aplicarle el -2. Añadida
    pregunta 31 a `sistema.md` — bloquea decidir si esto se engancha a la tirada
    `defensa` existente (condicionado a "Mangual equipado + elige bloquear") o necesita
    algo nuevo.
  - **"Ignora 2 niveles de Cobertura física" no se puede auto-aplicar** — Cobertura
    (`sistema-y-combate.md` §"Cobertura", `FIRME`) es puramente narrativa: la decide el
    máster según la escena, sin ningún campo "cobertura del objetivo" en el motor.
    Mismo motivo que ya justificó 🔕 IGNORAR el "-2 niveles de cobertura visual" del
    Visor Nocturno (`me8`).
  - **Hallazgo aparte, más barato de arreglar**: hoy ninguno de los dos avisos llega ni
    siquiera como texto a la tab Tiradas. `arma.uso` (donde viven ambas frases) solo se
    lee en la ficha de Equipo (`PiezaDetalle.tsx:184`) — `tiradaDeArmaMelee`
    (`combate.ts:269`) no lo vuelca a `nota`, solo mira `uso` para el caso de "Sutil".
    Mismo principio que ya aplicasteis con F.Auto (Esquiva)/Derribo a tramo: "no
    auto-resolver" y "no informar" son cosas distintas — esto ni se resuelve ni se
    informa. Candidato **✅ IMPLEMENTAR** barato (volcar `uso` al `nota`, sin tocar el
    -2 de cobertura que no hay dónde aplicar), independiente de si "Bloqueo" se acaba
    mecanizando o no.
- Pelea, Armas Cortas, Armas de Asta, Espadas y Dagas, Flagelos, Armas Mecánicas: TODAS
  llevan `efectos: string | null` con `Crítico de Aturdimiento (N)` / `Crítico de
  Hemorragia (N turnos)` / `Crítico de Hemorragia Exanguinante` — **✅ IMPLEMENTAR**,
  mismo mecanismo que las armas de fuego, aplicado en `tiradaDeArmaMelee` (`combate.ts`)
  en vez de `tiradaDeArmaFuego`. Confirmado en código: `ArmaMelee.efectos` es hoy
  puramente decorativo, igual que `especial` en `ArmaFuego`.
- **Armas Mecánicas — desglose completo (2026-09-21, pregunta del usuario, verificado
  contra el render del PDF páginas 34-35, no solo `pdftotext -layout` que aquí también
  corrompe la tabla)**: Hoja Dentada, Guantelete de Pistón, Sierra Circular, Martillo
  de Pistón, Ariete Percusivo. Dos matices que no habían salido en el resto del barrido:
  - **No todos los efectos son "estado + dificultad".** `estados.ts` confirma que
    `aturdido`/`derribado` sí son salvación contra una dificultad (encajan en
    `{ estadoId, dificultad }`), pero `hemorragia` (`estados.ts:521`) se aplica
    **directo, sin salvación**, solo con duración ("1 turno" aquí, "1d6 turnos" en
    Armas Cortas/Asta/Espadas/Flagelos). El mecanismo genérico necesita que
    `efectoImpacto`/`efectoCritico` sean una **unión**: `{ estadoId, dificultad }` si
    hay salvación, o `{ estadoId, duracionTurnos }` si se aplica directo — afecta a
    todo el "Crítico de Hemorragia (N turnos)" del resto de la sección, no solo a
    Mecánicas.
  - **Ariete Percusivo cambia de estado entre impacto y crítico** — Derribo(6) al
    impactar, pero Crítico: **Aturdimiento**(12), no "más Derribo". El resto de la
    familia sí mantiene el mismo estado en los dos (Guantelete/Martillo: Aturdimiento
    en ambos). Así en el render, no es artefacto de extracción.
  - Tabla por pieza:

    | Arma | Al impactar | Crítico | Acción Compleja (solo con ese modo elegido) |
    |---|---|---|---|
    | Hoja Dentada | Hemorragia 1 turno (duración) | Hemorragia Exanguinante | "ignora 1 nivel de armadura" — texto libre (quinta variante), sin resta de blindaje por categoría en el motor, mismo motivo que `me4`/`ker1` |
    | Sierra Circular | Igual que Hoja Dentada | Igual | Igual |
    | Guantelete de Pistón | Aturdimiento(6) | Aturdimiento(10) | Derribo(8) — estado+dificultad normal, mecanizable, condicionado al modo |
    | Martillo de Pistón | Aturdimiento(6) | Aturdimiento(12) | Derribo(8) |
    | Ariete Percusivo | Derribo(6) | Aturdimiento(12) | Derribo(10) + "doble daño contra puertas/muros/estructuras" (texto libre, sin concepto de "tipo de objetivo" en el motor) |

  El modo Estándar/Compleja ya es una `CondicionTirada` tipo `opción` — la parte de
  Derribo(8)/(10) es **✅ IMPLEMENTAR** normal; "ignora armadura" y "doble daño
  estructuras" son **✅ IMPLEMENTAR (quinta variante, texto segmentado por modo)**, no
  estado+dificultad.
- Flagelos (Látigo, Cadena Armada): "Crítico Derribado o Entorpecido (N)" — el jugador
  elige cuál de los dos en el momento, no es un estado fijo. **✅ IMPLEMENTAR** con una
  pequeña variante (el aviso ofrece los dos, el máster/jugador elige cuál aplicar).
- Escudos (Rodela, Escudo, y sus versiones de Metamaterial): la "cobertura/armadura/PG
  propios" del escudo **🔕 IGNORAR** (mismo "colchón" sin concepto que Malla
  Plasmática/Escudo Deflector). El "Crítico de Aturdimiento" del golpe con el propio
  escudo sí: **✅ IMPLEMENTAR**, mismo patrón melee normal.
  **Aclaración (2026-09-21, pregunta del usuario):** "levantar la Rodela/Escudo cuesta
  una acción simple/estándar" **🔕 IGNORAR también, no es una tirada** — no hay dado de
  por medio, es puro coste de turno (el documento ni siquiera lo describe como tirada,
  solo como requisito de acción). Mismo motivo que Funda Automática/Inyector
  Hipodérmico arriba: el motor no modela "coste de acción" en ninguna tirada, así que
  no hay sitio donde engancharlo aunque quisiéramos.

### Armas Modificadas (mejora comprable)

- Electrificantes, Térmicas, de Plasma, de Nanofilamento: **❓ VERIFICAR primero el
  hallazgo #2** — ninguna existe hoy en `MEJORAS_ARMA`. Una vez dadas de alta, su
  efecto (Shock / Llamarada / Shock+Llamarada+Fusión / Hemorragia+Hemorragia
  Exanguinante) sería **✅ IMPLEMENTAR**, con la complicación de que la dificultad
  depende del tramo de daño básico del arma huésped (2 / 3-6 / 7+), no es un valor
  fijo del catálogo — para esto sí hace falta código nuevo (calcular el tramo del daño
  base del arma al instalar la mejora), no solo datos. Nanofilamento además "ignora N
  puntos de blindaje" (campo estructurado nuevo) y es exclusivo de armas de filo — la
  `compatibilidad` de mejoras ya soporta exclusión por categoría de daño
  (`excluyeCategoriaDanio`), revisar si hace falta ampliarla para "solo armas de filo".

### Kerzul

- Armas Melee de Kerzul: "Ignora N puntos de blindaje" — **auto-aplicar sigue 🔕
  IGNORAR** (sin resta de blindaje por categoría en el motor, mismo motivo que Mejora
  Ignífuga), **pero mostrarlo como texto en el Marcador es ✅ IMPLEMENTAR, y barato**
  (2026-09-21, pregunta del usuario). "Crítico: Impacto Estructural (N)" **✅
  IMPLEMENTAR** como aviso igual — su efecto real (reducir blindaje del objetivo de
  forma permanente) sigue siendo "el máster lo anota a mano", coherente con "la app
  informa, no arbitra".
  **Hallazgo consolidado, arreglado 2026-09-23**: esto no era un caso especial de
  Kerzul, era la confirmación de que faltaba un fix genérico en TODA la sección
  Combate Melee. `tiradaDeArmaMelee` (`combate.ts:269-296`) ahora vuelca
  `arma.efectos` al `nota` — mismo criterio que `arma.especial` en
  `tiradaDeArmaFuego`. Con ese único cambio (sin condicionar por modo) se resolvió
  de golpe: el "Ignora N de blindaje" de Kerzul, y cualquier "Crítico de X (N)" de
  toda la sección (Pelea, Cortas, Asta, Espadas, Flagelos, Mecánicas) — antes
  invisibles en Tiradas, visibles solo en la ficha de Equipo (`PiezaDetalle.tsx`),
  ahora en las dos. Tests nuevos en `combate.test.ts`. **La quinta variante (texto
  segmentado por modo) sigue pendiente para lo que de verdad depende del modo
  elegido** (Mangual: "Bloqueo"/"ignora Cobertura" viven en `uso`, no en `efectos`;
  Armas Mecánicas: "Acción Compleja: X" solo con ese modo) — este fix era el caso
  base, más barato, cubría la mayoría de la sección de una vez, pero no todo.
- **Inercia Entrópica** (tirada de Fortaleza extra al atacar Estándar/Complejo con
  kerzul, o daño no letal + entorpecido, con fallo crítico además derribado): **❓
  VERIFICAR / candidata a mini-tarea propia** — no es un "efecto de crítico del
  objetivo", es una regla de uso del arma que afecta a quien la empuña. No encaja en
  `efectoImpacto`/`efectoCritico` tal cual; necesitaría su propio diseño si se decide
  mecanizar. Regla completa en `docs/equipamiento.md:1024-1033` (recuadro aparte antes
  de la tabla, fácil pasarlo por alto). **Matices verificados (2026-09-21, pregunta del
  usuario) contra la tabla de modos de cada pieza:**
  - **Puñal de Kerzul es inmune** — su único modo es "Simple" (nunca Estándar/Compleja),
    así que Inercia Entrópica no se dispara jamás con él.
  - **Escudo de Kerzul siempre está en riesgo** — su único modo es "Estándar" (no tiene
    Simple), así que CADA golpe con él dispara la tirada de Fortaleza.
  - **La dificultad de esa tirada de Fortaleza no es un número fijo del catálogo**: es
    el propio "daño básico de la acción empleada" — una fórmula `Fue+N` que depende del
    modo elegido y de la Fuerza del propio atacante, resuelta en el momento de tirar, no
    un valor que se pueda poner tal cual en `tiradas.ts`. Es justo lo que confirma que
    esto necesita diseño propio y no encaja en el mecanismo genérico (que asume
    dificultades fijas de catálogo).
- Escudo de Kerzul: mismo patrón que los escudos normales + kerzul (ver ambas
  secciones).

### Herramientas y Accesorios / Medicina y Farmacia

**Fuera de alcance de esta tarea** — no es que no haya nada que hacer, es que es un
tipo de contenido distinto del que la motivó (armas y sus críticos). VTF, VTM,
Materiales, Radar, Disfraz Holográfico, Escáner Detector: son tiradas de **uso activo**
(Tecnociencia/Biociencia con una dificultad dada), más parecido a cómo
`tiradasDeHerramientas()` ya cubre la Valija Táctica Médica que a un crítico de arma —
si se quiere mecanizar, es "faltan tiradas fijas de estas herramientas", una tarea
distinta con su propio alcance. Los Fármacos dan bonos temporales con duración
(+2 iniciativa, -1 por heridas, etc.) — más parecido a "un estado que el jugador se
aplica a sí mismo" que a un efecto de crítico; también fuera de alcance aquí. Anotado
para no perderlo, no para cogerlo en esta hoja de ruta.
