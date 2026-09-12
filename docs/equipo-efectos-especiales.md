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

## Tres hallazgos, antes de la lista (2026-09-12)

Revisando pieza a pieza contra el código real (no solo contra el PDF) aparecieron tres
cosas más grandes que "falta el efecto especial" — no son parte del barrido en sí,
mejor tratarlas aparte:

1. **El Proyector de Pulso no genera ninguna tirada de ataque.** Es un `Subsistema`
   (`catalog/equipo.ts`), y `combate.ts` (`tiradasDeAtaque`) solo recorre
   `arma`/`armaMelee`/`armaPesada`/`granada` — un subsistema instalado nunca aparece
   en la tab Tiradas. Sus 4 modos de ataque (Pulso, Pulso Cargado, Barrido, Aguijón)
   están descritos en `modos[].descripcion` como texto, no como `Tirada`. Esto es más
   grande que "añadir un efecto de crítico": falta la tirada entera. Candidato a su
   propia subtarea si se decide que merece la pena (es la única pieza así, del resto
   de subsistemas ninguno genera ataques).
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

- Soporte Vital (niveles 1-3, +1/+2/+3 salv. ambiental): **❓ VERIFICAR**, mismo caso
  que las armaduras — cableado a `salv_fortaleza` genérico, cuando el texto lo
  condiciona a "si sufre daño en ambiente tóxico".
- Compartimento Oculto (+3/+4 dificultad para ser descubierto): **🔕 IGNORAR** — la
  dificultad sube para QUIEN TE CACHEA, no hay tirada de "cacheo" en el catálogo a la
  que aplicarlo.
- Funda Automática / Inyector Hipodérmico (cambian el tipo de acción de un desenfundado
  o una aplicación): **🔕 IGNORAR** — no hay concepto de "coste de acción" mecanizado
  en ninguna tirada.
- Mejora Ignífuga: nivel 1 (usar blindaje total contra fuego) y nivel 2 (fuego cuenta
  como letal, +2 en vez de +1 contra llamarada): **🔕 IGNORAR** por ahora — depende de
  si el motor resta blindaje por categoría de daño al resolver un impacto, cosa que no
  vi en esta pasada (no confundir con `resolverDanio`, que es daño por éxitos, no
  reducción por blindaje). Si en algún momento se mecaniza blindaje-vs-categoría, esto
  se revisita junto con Polímero Anticorrosivo/Tejido Conductor.
- Polímero Anticorrosivo / Tejido Conductor (+1/+2 contra un estado; "ignora el primer
  nivel de daño X"): el "+1/+2" **❓ VERIFICAR** (mismo caso salv_fortaleza genérico de
  arriba); el "ignora el primer nivel de daño" **🔕 IGNORAR**, mismo motivo que Mejora
  Ignífuga.
- Visor Nocturno: nivel 2 "+3 contra ceguera" **✔️ YA HECHO** (`salv_ceguera_destello`,
  +3 — y este SÍ está bien acotado: `salv_ceguera_destello` es un `tiradaId` marcador
  específico, no el Fortaleza genérico). Nivel 1 "cegado dificultad 8 ante fogonazo" y
  "-2 niveles de cobertura visual dentro de 50 m": **🔕 IGNORAR**, dependen de que el
  máster narre un fogonazo o de distancia real al objetivo (más allá del tramo de
  disparo, que sí se rastrea).
- Visor Térmico (-3 percepción fuera del gradiente, rastreo de huellas térmicas):
  **🔕 IGNORAR**, narrativo/situacional.

### Subsistemas

- Camuflaje Trifásico: **🔕 IGNORAR** entero — las coberturas dependen de modo/
  movimiento, sin concepto de "cobertura" en el motor (ya documentado así en el propio
  catálogo, `notaApilamiento`).
- Derivación Psiónica: **✔️ YA HECHO** — los `tiradaId` marcadores
  (`resistir_retroceso_psionico`, `resistir_metasensoria`, `poder_psionico`) apuntan a
  tiradas que no existen todavía porque la psiónica está `PENDIENTE` en `sistema.md`.
  Correcto tal cual, no tocar hasta que exista esa parte del sistema.
- Escudo Deflector: la "absorción de daño" **🔕 IGNORAR** — sin concepto de absorción
  en el motor (ya documentado en el catálogo).
- Malla Plasmática: el "colchón de PG" **🔕 IGNORAR** (mismo motivo). Pero el "crítico
  melee con plasma liberado causa shock/llamarada/fusión (dificultad 6-8 + nivel)" es
  **✅ IMPLEMENTAR** — mismo patrón que un arma, aplicado a un golpe melee cuando el
  jugador declaró liberar plasma (encaja como `CondicionTirada` tipo `toggle`,
  "¿liberar plasma este golpe?", ya que es una elección declarada antes de atacar).
- Proyector de Pulso: ver el hallazgo #1 de arriba — no genera tirada de ataque en
  absoluto hoy. Sus 4 efectos (Shock/Hemorragia en Pulso y Pulso Cargado, Esquiva+Shock
  en Barrido, Envenenamiento por Radiación o Ceguera según el modo del nivel 2/3) serían
  **✅ IMPLEMENTAR** en cuanto exista la tirada — no antes.

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
  "El mecanismo genérico" arriba).
- `F. Auto (Esquiva N)`: **🔕 IGNORAR** — es la dificultad de esquiva de quien recibe
  el disparo en área, no del atacante; queda como nota, cualquier objetivo con ficha
  propia ya puede tirar su Esquiva genérica y aplicar esa dificultad a mano.
- Mosquito ("+2 para esconder el arma"): **✔️ YA HECHO** (`ocultar_objeto`, +2).

### Mejoras en Armas de Fuego

- Mira Telescópica (niveles 1 y 3, bonos a media/larga distancia y percepción), Bípode
  (apoyado/no apoyado), Sistema de Retroceso (F. Auto): **✔️ YA HECHO** — trazados en
  `docs/modificadores-tiradas.md` como ejemplo del mecanismo de condiciones.
- Puntero Láser (+1 ataque / -2 sigilo mientras esté activo), Silenciador (-2 sigilo en
  vez del habitual), Linterna, Bayoneta, Lanzagranadas Integrado: **❓ VERIFICAR** — no
  confirmado en esta pasada si están cableados como `CondicionTirada`/`ajustesFijos` o
  se quedaron en texto; revisar uno a uno, es rápido (mismo patrón que Bípode).
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

### Otras Armas a Distancia (Armamento Pesado, Granadas)

- Ambas categorías: `Efecto X (N)` que golpea a quien falla la esquiva de área:
  **✅ IMPLEMENTAR**, mismo mecanismo. La propia dificultad de esquiva del área
  (`Esquiva (N)`) es la del objetivo, no del atacante: **🔕 IGNORAR** esa parte, mismo
  criterio que "F. Auto (Esquiva N)" de las armas de fuego.
- Granada de Plasma: mismo patrón Shock+Llamarada / Crítico de Fusión que las armas de
  plasma — **✅ IMPLEMENTAR** junto con el resto de la familia.

### Combate Melee

- Pelea, Armas Cortas, Armas de Asta, Espadas y Dagas, Flagelos, Armas Mecánicas: TODAS
  llevan `efectos: string | null` con `Crítico de Aturdimiento (N)` / `Crítico de
  Hemorragia (N turnos)` / `Crítico de Hemorragia Exanguinante` — **✅ IMPLEMENTAR**,
  mismo mecanismo que las armas de fuego, aplicado en `tiradaDeArmaMelee` (`combate.ts`)
  en vez de `tiradaDeArmaFuego`. Confirmado en código: `ArmaMelee.efectos` es hoy
  puramente decorativo, igual que `especial` en `ArmaFuego`.
- Armas Mecánicas en concreto (Hoja Dentada, Guantelete de Pistón, Sierra Circular,
  Martillo de Pistón, Ariete Percusivo): además de la parte de crítico, combinan una
  "Acción Compleja" alternativa (Derribo, ignora blindaje) — encaja como
  `CondicionTirada` tipo `opción` (modo de golpe: Estándar vs. Compleja), cuyo efecto
  extra sería igual de mecanizable. **✅ IMPLEMENTAR**, algo más de trabajo que el resto
  de melee por la doble vía.
- Flagelos (Látigo, Cadena Armada): "Crítico Derribado o Entorpecido (N)" — el jugador
  elige cuál de los dos en el momento, no es un estado fijo. **✅ IMPLEMENTAR** con una
  pequeña variante (el aviso ofrece los dos, el máster/jugador elige cuál aplicar).
- Escudos (Rodela, Escudo, y sus versiones de Metamaterial): la "cobertura/armadura/PG
  propios" del escudo **🔕 IGNORAR** (mismo "colchón" sin concepto que Malla
  Plasmática/Escudo Deflector). El "Crítico de Aturdimiento" del golpe con el propio
  escudo sí: **✅ IMPLEMENTAR**, mismo patrón melee normal.

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

- Armas Melee de Kerzul: "Ignora N puntos de blindaje" **🔕 IGNORAR** por ahora, mismo
  motivo que Mejora Ignífuga (sin resta de blindaje por categoría en el motor). "Crítico:
  Impacto Estructural (N)" **✅ IMPLEMENTAR** como aviso (mismo patrón melee) — pero su
  efecto real (reducir el blindaje del objetivo de forma permanente) es algo que la app
  no puede aplicar sola sin tocar la ficha ajena: el aviso informa, el máster lo anota a
  mano, coherente con "la app no arbitra".
- **Inercia Entrópica** (tirada de Fortaleza extra al atacar Estándar/Complejo con
  kerzul, o daño no letal + entorpecido, con fallo crítico además derribado): **❓
  VERIFICAR / candidata a mini-tarea propia** — no es un "efecto de crítico del
  objetivo", es una regla de uso del arma que afecta a quien la empuña. No encaja en
  `efectoImpacto`/`efectoCritico` tal cual; necesitaría su propio diseño si se decide
  mecanizar.
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
