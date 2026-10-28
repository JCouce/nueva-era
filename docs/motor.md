# El motor — modelo obligatorio para cualquier elemento nuevo

Este documento existe para que **nunca más haya una duda de cómo pasar un texto
en prosa de `EQUIP`/`sistema.md` al motor.** Se escribió el 2026-09-22, en
conversación, al detectar que el catálogo de equipo (que ya está casi
completo) tiene docenas de reglas que solo viven en texto libre (`especial`,
`efectos`, `descripcion`) sin que el motor las lea nunca. A partir de aquí, el
trabajo del proyecto es meter cada vez más elementos de este tipo — razas,
poderes psiónicos, dotes, ciberware/aumentos — y **todos y cada uno** deben
pasar por el análisis de este documento antes de darse por transcritos.

Es un documento de **arquitectura**, no de reglas de juego (eso es
`sistema.md`) ni de plomería de un mecanismo concreto (eso es
`modificadores-tiradas.md`, que es un caso particular de lo que aquí se
describe — ver más abajo).

## El motor en una frase

La app es un motor de tiradas. Todo lo demás — ficha, equipo, poderes, dotes,
estados, recursos — existe únicamente para alimentar ese motor o para
controlar cuánto de ese alimento queda disponible ahora mismo.

## Las dos capas y media

```
CAPA 1 (INPUT)              CAPA 2 (OUTPUT)           CAPA 2 y media (UTILITARIOS)
────────────────────        ──────────────────        ────────────────────────────
Especie                     Acciones                  Recursos
Atributos                     - con dado (tiradas)       - de instancia (munición,
Habilidades                   - sin dado (activar,         batería de una pieza
Equipo                          declarar un gasto)         concreta)
Poderes (Fase 5)                                        - de personaje (vida,
Dotes (Fase 5)                                             fatiga, carga — hoy ad
Aumentos (Fase 5)                                          hoc, ver más abajo)
Estados (máster)                                        Tienda
Historia/edad/identidad                                   - añade elementos nuevos
                                                             a la capa 1 (comprar)
```

- **Capa 1**: todo lo que el jugador (o el máster, para un NPC) añade a la
  ficha. Su único propósito en la app es complementar la capa 2.
- **Capa 2**: lo que el jugador recibe al ejecutar una acción — antes se
  llamaba "Tiradas" a secas; pasa a llamarse **Acciones**, porque no todo lo
  que se ejecuta tira un d12 (ver "Acciones sin dado" más abajo).
- **Capa 2 y media**: no son acciones ni inputs — son el control de cuánto
  input queda disponible ahora mismo (Recursos) o la forma de añadir input
  nuevo a la ficha (Tienda). Se comportan de forma parecida a la capa 1 y a la
  capa 2 a la vez, por eso viven aparte y no dentro de ninguna de las dos.

## El análisis obligatorio de cualquier elemento de capa 1

Antes de dar por transcrito un elemento del catálogo (una pieza de equipo, un
poder, una dote, un rasgo de especie, un aumento), tiene que responder a dos
preguntas. Si no puede responderlas, no está transcrito de verdad, por mucho
que su texto esté copiado en `descripcion`/`detalle`.

1. **¿A qué acción o acciones de la capa 2 afecta?** Un `tiradaId` concreto, un
   `grupo` entero, una habilidad entera, un `modo` — el mismo `AlcanceModificador`
   que ya usa el motor (`lib/rules/modificadores.ts`). Si la respuesta es
   "a ninguna todavía" (el peso, antes de que existan los penalizadores de
   Carga Transportable), dilo explícitamente — no es un hueco, es una pieza
   que apunta a un derivado que todavía no toca ninguna acción.
2. **¿Qué tipo de modificador es?** Uno de la lista cerrada de abajo (seis
   tipos de aporte más `narrativo`), **sin inventar otros**.
   Un elemento puede ser varios tipos a la vez (un arma es "modificador de
   acción" porque crea su propia fila, y además trae "modificador numérico"
   en sus mejoras) — pero cada efecto concreto dentro del elemento es de un
   único tipo.

### Los tipos de aporte: lista cerrada

| # | Tipo (nombre de aporte) | Qué hace | Ejemplo |
|---|---|---|---|
| 1 | **Modificador de acción** (Acción) | Añade una o varias acciones nuevas a la capa 2 | Equipar un arma añade "Disparar con X"; un poder psiónico; una acción de dote; Reparar/Fabricar |
| 2 | **Modificador numérico** (Ajuste) | `condición ? +N : +0` sobre una acción que ya existe | El Puntero Láser da +1 al ataque a corta/media distancia |
| 3 | **Modificador de texto** (Texto) | `condición ? nota informativa : nada` — no suma ningún número | El Visor Nocturno deja ver a través del humo; no crea su propia acción, solo cuelga una nota de "Buscar/percibir" |
| 4 | **Modificador narrativo** | No modifica nada, es solo para que quede apuntado | Trasfondo, motivación, y cualquier frase de sabor sin número detrás |
| 5 | **Modificador habilitador/deshabilitador** (Habilitador) | Habilita o deshabilita una acción entera **o un aporte** | Sin balas, ¿el disparo en F. Auto desaparece de la lista, se atenúa, o solo avisa? — **sin decidir todavía, ver abajo**; `bloqueada`, `soloConEspecialidad`, el permiso de la dote *Bloqueo* |
| 6 | **Resolución** | Cambia **cómo** se resuelve la tirada, no su total: qué aplicado, qué habilidad o especialidad, dados, umbrales de crítico/fallo, reglas del daño | Sutil (`aplicadoSutil`), `habilidadAlternativa`, `ventaja`, `criticoFijo`, `subeGradoFijo`, `falloCritico`, `anulaPenalizadores`, `ignoraBlindaje`, `extremidad` |
| 7 | **Coste** | Gasta un recurso al confirmar la acción; no toca el total | `costeFatiga`, `ahorroFatiga`, `usoPorEscena`, munición (`recursoInstanciaId`), `farmacoId`, la fatiga de un poder |

**Seis tipos de aporte, no siete filas (usuario, 2026-10-28).** El narrativo
(4) se queda como tipo de catálogo, pero no es un aporte: nunca llega a la
pestaña Acciones. Los otros seis son los tipos de aporte del vocabulario de
"Ítems y aportes" (más abajo). La numeración 1-5 se conserva porque el resto
del documento y el historial hablan de "tipo 5", "tipo 1"…; los dos nuevos
van detrás.

**Por qué se amplió con Resolución y Coste (2026-10-28, `docs/aportes/plan.md` §1.3).**
Hasta entonces Sutil, la ventaja, los críticos fijos o la fatiga de un poder
se metían como "numérico" porque eran lo más parecido. No lo son, y tratarlos
igual es lo que obliga a la UI a conocer cada campo por su nombre:

| | Ajuste (2) | Resolución (6) | Coste (7) |
|---|---|---|---|
| Toca | el total | la fórmula | recursos al confirmar |
| Se combina | suma conmutativa | no apila: hay regla de quién gana (la ventaja no se acumula, el crítico más bajo gana) | suma aparte del total |
| Puede impedir tirar | no | no | sí (sin fatiga → Habilitador) |
| Se pinta como | línea del desglose | chip/opción en la hoja | precio en el botón |

La lista sigue siendo **cerrada**: añadir un tipo exige una justificación como
esta tabla (qué toca, cómo se combina, cómo se pinta, y por qué no cabe en
ninguno de los existentes). Si un efecto no encaja, se para y se discute; no
se estira el más cercano hasta que quepa.

### El tipo 5 lleva un sub-campo pendiente: `arbitraje`

Es una contradicción a propósito, sin resolver todavía (2026-09-22): puede
que el tipo 5 bloquee de verdad la acción (duro, como `validarInstalacion` —
sin armadura no instalas un subsistema, eso ya es así hoy) o puede que solo
avise y sea el jugador/máster quien decida (blando, como el aviso de munición
que ya existe hoy en RECURSOS — "la app informa, no arbitra"). Puede que la
respuesta sea distinta según el elemento. Por eso cada instancia del tipo 5
declara:

```
arbitraje: "duro" | "blando" | "pendiente"
```

Nunca se asume uno por defecto. Munición hoy es `"blando"` (decisión
explícita del usuario en la sesión de RECURSOS, 2026-09-22) — pero eso no
fija el valor para el resto de casos del tipo 5 que vengan después.

## El eje ortogonal: mecanismos de entrega

Los tipos de arriba responden "¿qué clase de efecto es esto?" — una
pregunta de **diseño**. Hay una segunda pregunta, de **ingeniería**, que es
ortogonal: "¿por qué mecanismo concreto llega este efecto hasta la acción?".
El motor ya tiene cuatro mecanismos de entrega documentados en
`docs/modificadores-tiradas.md` (léelo antes de añadir un modificador
numérico o de texto nuevo — este documento no repite ese detalle):

1. **`CondicionTirada`** — el jugador elige algo en el momento de tirar
   (toggle/opción/contador). Hoy solo funciona arma por arma
   (`condicionesDeMejoras`); con `alcance` llega a cualquier acción
   (`condicionesActivas`), pero solo para `mejoraEstandar`/`subsistema`/
   `herramienta` — no para `arma`/`armaMelee` todavía salvo el parche puntual
   de RECURSOS de hoy (ver "Casos detectados" abajo).
2. **`ajustesFijos`** — un número que se suma solo, sin elección del jugador.
3. **`bonosTramo`** — un número que depende de otra elección ya hecha.
4. **`Modificador` tipo `"tirada"` con `alcance`** — siempre activo mientras
   se lleva puesto. Ya genérico, llega a cualquier `tiradaId`/`grupo`/
   `habilidad`/`modo` sin tocar código nuevo.

**Dos mecanismos que todavía no existen, y hacen falta:**

- Uno para el **tipo 1** cuando el elemento no es equipo (poderes, dotes,
  aumentos) — hoy cada familia de armas tiene su propia función hardcodeada
  en `combate.ts` (`tiradaDeArmaFuego`, `tiradaDeArmaMelee`,
  `tiradaDeArmamentoPesado`...). No hay un "esta pieza declara que genera su
  propia acción" genérico. Cuando lleguen los poderes, van a necesitar esto.
- Uno para el **tipo 5** — ninguno de los cuatro mecanismos existentes sabe
  ocultar, atenuar o bloquear una acción entera. Solo saben sumar un número o
  colgar un texto. Esto es un hueco real de motor, no una reutilización de lo
  que ya hay.

No fusiones los dos ejes en una sola tabla — un mismo tipo semántico (p. ej.
numérico) puede entregarse por mecanismos distintos según cuándo se activa, y
mezclarlos en una tabla produce confusión, no claridad.

## Ítems y aportes (vocabulario oficial, 2026-10-28)

Vocabulario oficial desde el 2026-10-28 (plan aprobado por el usuario), en
código, docs y conversación. Pone nombre a los dos ejes de arriba (tipo y
mecanismo) y añade lo que faltaba para que la pestaña Acciones la pueda
montar el motor: dónde cuelga cada cosa. El detalle, los ejemplos campo a
campo y las fases están en `docs/aportes/plan.md` (sección 1); aquí va el
resumen.

- **Ítem**: cualquier elemento de capa 1 que aporta algo a la ficha — equipo
  (armas, armaduras, mejoras, subsistemas, implantes, herramientas, munición
  especial), aumento, poder psiónico, dote, rasgo de especie, fármaco y
  **estado** (lo pone el máster, pero se comporta igual). "Pieza" en
  conversaciones anteriores es lo mismo.
- **Árbol**: la parte fija, que no crea ningún ítem — **Habilidad ›
  Especialidad › Hoja**. Una hoja es una acción concreta, con dado (`Accion`)
  o sin dado (`AccionDirecta`). **Raíces fuera del árbol**: la barra
  (salvaciones y tirada libre, sin habilidad) y **Sin dado** (agrupadas por
  lo que hacen, no por habilidad).
- **Aporte**: cada cosa concreta que hace un ítem. Un ítem tiene uno o
  varios, y cada aporte es de **un** tipo de los seis: **Acción, Ajuste,
  Resolución, Coste, Texto, Habilitador** (tabla "Los tipos de aporte"
  arriba). Es lo mismo que hasta ahora se llamaba "efecto" en este documento.
- **Blanco**: a qué apunta un aporte. Generaliza `AlcanceModificador`: un
  nodo del árbol (`habilidad`, `especialidad`, `tiradaId`, o la hoja de *una*
  instancia concreta), algo transversal (`aplicado`, `grupo`,
  `grupoHabilidad`, `familiaArma`, `modo`, `todas`) o un derivado (vida,
  fatiga, movimiento, carga, atributo, blindaje, nivel de disciplina — no se
  pintan en Acciones, pero están en el modelo).
- **Entrega**: cuándo actúa — **fijo** (siempre, por llevarlo), **casilla**
  (el jugador lo marca al tirar: `CondicionTirada`) o **tramo** (depende de
  otra elección ya hecha: `bonosTramo`). Es el eje "mecanismos de entrega" de
  arriba, con nombres de cara al jugador; se corresponde con
  `MotorMetadata.mecanismo`.
- **Momento** (solo Texto): **antes** (informa una decisión: si tirar, cómo,
  qué casilla marcar; se pinta en la hoja) o **después** (solo tiene sentido
  con el resultado; se pinta en el resultado). El resultado enseña siempre
  todos los textos, los de antes incluidos. Condición de grado opcional:
  siempre · en éxito · en crítico · en crítico natural · en fallo.
- **Anclaje**: dónde cuelga una hoja de Acción — lista de (habilidad,
  especialidad?) y quién elige: **fijo** (uno solo), **cualquiera** (cuenta
  si tienes cualquiera, se pinta en cada una: `especialidadesAccion`) o
  **jugador** (elige antes de tirar, se pinta en cada anclaje posible:
  `especialidadAElegir`, `habilidadAlternativa`, `habilidadesAElegir`).

**La regla: dónde se pinta un aporte se deduce de su blanco; dónde se pinta
una hoja, de sus anclajes.** Ningún ítem declara "dónde pintarme" aparte. Un
blanco transversal aparece en **cada hoja** a la que llega.

Lo que no sigue la regla y está bien que no la siga son las **excepciones
declaradas** de `docs/aportes/plan.md` §1.8 (la barra, Sin dado, aporte sobre
aporte —Gran Puntería sobre «Apuntado»—, el tablero y la economía de
creación). Una excepción nueva se añade allí con su motivo, o no es
excepción sino deuda.

## El dato: `MotorMetadata`

Todo lo de arriba (los tipos, `arbitraje`, los mecanismos de entrega) es
un modelo mental — vive en la cabeza de quien lee el código, no en el
catálogo. Es la causa raíz de que tres barridos independientes del mismo
catálogo (2026-09-22) discreparan entre sí sobre qué estaba "resuelto": cada
uno infería a su manera, porque no había ningún dato del que leerlo. Se cierra
aquí (2026-09-23): cada efecto de cada elemento de capa 1 declara

```ts
type TipoModificador = "accion" | "numerico" | "texto" | "narrativo" | "habilitador";
// 1            2          3        4            5

type Mecanismo =
  | "eleccion_jugador"   // CondicionTirada, el jugador elige al tirar
  | "siempre_activo"     // Modificador tipo "tirada" con alcance, solo por llevarlo puesto
  | "ajuste_fijo"        // ajustesFijos
  | "bono_tramo"         // bonosTramo
  | "accion_sin_equipo"  // genera su propia acción sin ser una pieza de equipo (poderes, dotes) — construido para poderes psiónicos (accionesDePsionica, lib/rules/poderes.ts)
  | "gate_instalacion"   // bloquea/atenúa/avisa sobre una acción entera (el mecanismo que falta del tipo 5)
  | "accion_equipo"      // genera su propia acción SIENDO equipo — función hardcodeada por familia/id (combate.ts, lib/rules/herramientas.ts), ya construido, diseño permanente
  | "nota_fija"          // texto siempre presente, sin CondicionTirada de por medio, leído directo de un campo y volcado a Tirada.nota
  | "sustitucion_aplicado"; // el jugador elige al tirar QUÉ aplicado alimenta la acción (no un +N encima) — no es eleccion_jugador porque no hay CondicionTirada de por medio

type Afecta =
  | { modo: "accion_existente"; id: string }  // tiradaId/accionId que modifica
  | { modo: "accion_nueva"; id: string }      // genera esta acción nueva (tipo "accion")
  | { modo: "objetivo_tercero"; id: string }  // toca la tirada de OTRO personaje — SIEMPRE tipo "texto", ver nota más abajo
  | { modo: "ninguna" };                      // sin conexión, narrativo puro

type MotorMetadata = {
  tipo: TipoModificador;
  afecta: Afecta;
  mecanismo: Mecanismo | null;                 // null solo si afecta.modo === "ninguna"
  arbitraje?: "duro" | "blando" | "pendiente"; // obligatorio si tipo === "habilitador"
  estado: "construido" | "pendiente" | "bloqueado" | "ad_hoc";
  bloqueoPor?: string;                         // "H5", "pregunta 29", "Fase 5"... obligatorio si estado === "bloqueado"
};
```

**Correspondencia con el vocabulario de aportes (2026-10-28).** El bloque de
arriba es la foto del 2026-09-23; la lista viva es `TIPOS_MODIFICADOR` y
`MECANISMOS_MOTOR` en `src/lib/rules/motor.ts` (que ya tiene además
`suma_derivado`, 2026-09-27).

- **Tipo → aporte**: `accion` = Acción, `numerico` = Ajuste, `texto` = Texto,
  `habilitador` = Habilitador. `narrativo` existe pero no es aporte (nunca
  llega a Acciones). Resolución = `resolucion` y Coste = `coste`: se añadieron
  a `TIPOS_MODIFICADOR` en la fase 1 de `docs/aportes/plan.md` y el catálogo
  se reclasificó en la fase 1b (lista en `docs/aportes/inventario.md`): Sutil
  es `resolucion` + `sustitucion_aplicado`, y una casilla con ventaja y fatiga
  lleva dos metadatos, uno `resolucion` y otro `coste`. Las dotes salen del
  generador (`npm run gen-dotes`), que clasifica por tipo de efecto.
- **Mecanismo → entrega**: `eleccion_jugador` = casilla; `bono_tramo` =
  tramo; `siempre_activo`, `ajuste_fijo`, `nota_fija` y `suma_derivado` =
  fijo (este último con blanco derivado). `accion_equipo` y
  `accion_sin_equipo` no son entrega sino cómo nace un aporte de Acción;
  `gate_instalacion`, cómo se entrega un Habilitador; `sustitucion_aplicado`,
  un aporte de Resolución que el jugador elige al tirar sin pasar por
  `CondicionTirada`.
- **`Afecta` → blanco**: `accion_existente`/`accion_nueva` nombran el blanco
  o la hoja nueva con un id suelto; el blanco completo (nodo del árbol,
  transversal, derivado) es más rico que `Afecta` y su forma de dato se
  decide en las fases siguientes del plan, no aquí.

**`accion_equipo`/`nota_fija` (2026-09-23, al empezar el barrido pieza a pieza):**
la lista de mecanismos de arriba se escribió antes de rellenar un solo dato real, y
se quedaron dos huecos que no son "pendientes de construir" — son cosas **ya
construidas** que nunca tuvieron etiqueta:

- **`accion_equipo`**: el tipo 1 (modificador de acción) ya funciona para armas y
  herramientas activas — pero vía una función hardcodeada por familia (o por id,
  en el caso de Radar/Escáner/Disfraz) en `combate.ts`/`lib/rules/herramientas.ts`,
  no vía ningún mecanismo de datos genérico. `accion_sin_equipo` no vale para esto
  porque su propio nombre lo excluye ("sin ser una pieza de equipo") — es el hueco
  simétrico, y a diferencia de su hermano, este SÍ está construido y es el diseño
  permanente, no un hueco a rellenar.
- **`nota_fija`**: texto siempre presente (`arma.especial`, `arma.efectos`,
  `granada.areaEfecto`, `NivelModulo.notaTirada`) volcado directo a `Tirada.nota`,
  sin ningún `CondicionTirada` de por medio — a diferencia del texto condicional de
  Visor Nocturno (mecanismo `eleccion_jugador`, un toggle real). No es un
  descubrimiento nuevo: `docs/modificadores-tiradas.md` ya lo tenía dibujado con
  estas palabras exactas ("❌ sin mecanismo formal — hoy cada caso es ad hoc"), solo
  le faltaba el nombre en el tipo.

**`sustitucion_aplicado` (2026-09-24, estilo Sutil en armas melee,
`docs/equipamiento.md:848-850`):** un pase anterior había etiquetado el toggle
de Sutil como `eleccion_jugador` porque "el jugador elige al tirar" — cierto en
espíritu, falso en los hechos: `eleccion_jugador` significa concretamente
"pasa por una `CondicionTirada`" (`condiciones.ts`), y Sutil no pasa por ahí.
Su valor no es un número fijo del catálogo (lo que `CondicionTirada.valorActivo`
exige) sino `aplicado(sheet, "potencia") - aplicado(sheet, "fuerza")`, que
depende de la ficha del personaje — así que se resuelve con un booleano ad hoc
(`FilaTirada` → `modificadorAccion`, ver `combate.ts`/`acciones.ts`), no con la
infraestructura de condiciones. Se le da nombre propio en vez de forzarlo
dentro de `eleccion_jugador` (que habría sido mentir en el dato para no abrir
un mecanismo nuevo) y en vez de generalizar `CondicionTirada` para admitir
valores calculados (que habría sido construir infraestructura para una
muestra de tamaño uno). Si aparece un segundo caso real — un poder, una
dote — que necesite "cambiar qué aplicado alimenta una tirada", ese es el
momento de fusionar los dos mecanismos; hasta entonces, `sustitucion_aplicado`
se queda tal cual, sin generalizar. (D2b-2, 2026-10-15: la dote *Combate Sutil* no es
ese segundo caso, es el permiso para usar este mismo interruptor: sin ella
`combate.ts` no pone `aplicadoSutil`. El habilitador de *Bloqueo* es el primer tipo 5
construido con arbitraje "duro": `FAMILIAS_SOLO_CON_DOTE`, `catalog/dotesDestinos.ts`.)

**`objetivo_tercero` es SIEMPRE tipo "texto", cerrado 2026-09-24 (duda que
dejó la auditoría, resuelta en conversación):** aunque la regla original traiga
un número real (la cobertura del Escudo, "+1 a +4 a la dificultad de quien te
ataca"), el motor nunca lo suma — no puede, no tiene forma de tocar la tirada
de otro personaje — así que ese número solo llega como una frase que un
jugador le dice al máster, o el máster al jugador, en la propia mesa. El `tipo`
describe cómo lo trata el motor, no si la frase original lleva una cifra
dentro: si la app jamás lo calcula, es texto, punto. No reabrir esta duda para
ninguna entrada `objetivo_tercero` nueva.

Dos ejes deliberadamente separados dentro del mismo tipo:

- **`tipo`/`afecta`/`mecanismo`/`arbitraje`** es la clasificación semántica —
  la respuesta a las dos preguntas obligatorias de más arriba. No cambia
  nunca una vez decidida, esté construido o no.
- **`estado`/`bloqueoPor`** es el estado de construcción — sí cambia con el
  tiempo. Que algo esté `bloqueado` o `ad_hoc` es una clasificación tan válida
  y completa como `construido`: lo único que no vale es no declarar nada.

`objetivo_tercero` formaliza un patrón que hasta el barrido del 2026-09-22
solo existía como intuición repetida en varias piezas sueltas (Compartimento
Oculto, Cobertura del Camuflaje Trifásico, "devuelve daño" de la Malla
Plasmática): el motor no tiene forma de tocar la tirada de otro personaje, así
que ese efecto se degrada a tipo "texto" — el máster hace de puente, como ya
pasa con cualquier Crítico.

**Dónde vive ese texto, cerrado 2026-09-24 (el usuario):** depende de si hay
una tirada de PORTADOR a la que colgarlo — alguien tiene que tirar algo para
que el aviso tenga sentido en ese momento.

- **Con tirada de portador** (el disparo del arma que lleva la mejora): el
  texto cuelga de esa tirada, vía `notaTirada`/`notaTercero` +
  `Accion.efectos` — construido 2026-09-24 (Puntero Láser, Silenciador,
  Sistema de Retroceso nv2, y la familia de armas con penalizador de sigilo
  en `armasFuego.ts`; ver `combate.ts`, `notasDeMejoras()`/`notaTercero`).
- **Sin tirada de portador** (piezas pasivas — un escudo, un camuflaje, un
  compartimento oculto: nadie tira nada por llevarlos puestos): **no hace
  falta nada en el motor.** El texto ya está en `descripcion`/`detalle` y ya
  se ve en la propia card de Equipo/Tienda — ese es el sitio, definitivo, no
  un hueco a rellenar. No reabrir esta rama para las piezas que caigan aquí
  (los 5 escudos, Camuflaje Trifásico, y el efecto de detección de
  Compartimento Oculto son los casos ya identificados, `docs/tareas.md`).

Dos piezas de este mismo lote NO son "solo dónde vive el texto" — son
mecanismos que faltan de verdad, siguen bloqueados y su solución vive en
`docs/tareas.md`, no aquí: la tirada ad hoc "Esconder objeto" que necesita
Compartimento Oculto para listar qué se puede ocultar, y el "colchón"/segunda
vida de la Malla Plasmática (recurso de personaje que no existe hoy).

El siguiente paso de verdad es un schema Zod que exija `MotorMetadata` en
cada efecto de cada pieza del catálogo, y un test que lo corra sobre los
catálogos enteros. Eso convierte "¿está esto regularizado?" en una pregunta
que responde el test, no un informe en prosa.

## Acciones sin dado (capa 2 ampliada)

No todo lo que hace un personaje tira un d12. Activar la Malla Plasmática,
declarar la Conversión Psiónica de Derivación Psiónica, o comprar un
"Cargador"/"Batería" (RECURSOS, 2026-09-22) son acciones reales que gastan o
cambian algo sin que haya ninguna resolución de dado de por medio. Hoy
`Tirada` (`lib/rules/tiradas.ts`) siempre implica "aplicado + habilidad + d12
contra dificultad" — no hay forma de representar una acción sin dado en esa
misma lista.

**Consecuencia acordada (2026-09-22): la pestaña "Tiradas" pasa a ser
"Acciones"**, y su catálogo pasa a vivir en `acciones.ts` (no dentro de
`tiradas.ts`), con una forma que sí sepa distinguir "esto tira" de "esto no
tira".

**Decidido y construido 2026-09-27: tipo hermano, no un campo que apaga el
dado.** `AccionDirecta` (`acciones.ts`) es independiente de `Accion` —
`id`/`label`/`grupo`/`nota`/`condiciones`/`confirmarLabel`, sin
`aplicado`/`habilidad`/`dificultad`/`ataque`, que no significan nada aquí. Se
generan igual que las tiradas de equipo (un generador por familia, hoy
`accionesDirectasDeHerramientas()` en `herramientas.ts`), se pintan con una
fila `FilaUsar` (botón "Usar" en vez de "Tirar") y abren `UsarModal.tsx`
(`components/`) — hermano ligero de `AccionModal.tsx`, mismo lenguaje visual,
sin dificultad/circunstancial/desglose/rodar dado. El efecto de cada pieza se
resuelve con su propio callback (`onUsar`, opcional) pasado desde fuera — no
hay motor de efectos genérico, mismo criterio que Reparar/Fabricar (tarea 8):
generalizar de más para un puñado de casos reales sería la abstracción
prematura que este proyecto evita a propósito.

**Primer caso real: Radar nivel 4, "Marcar objetivo".** Sin `onUsar` — no
muta la ficha, solo informa (nota fija que el jugador aplica a mano) — así
que valida la mitad "fila + modal + generación por equipo" sin necesitar
resolver todavía la mitad "efecto que escribe en el sheet". Segundo caso,
mismo día: "Levantar [escudo]" (los cinco escudos), igual de ligero.

**Movilidad Aérea resultó NO ser un tercer caso de `AccionDirecta`.** Al leer
la prosa con calma ("Máxima potencia... **en crítico**, +25 m") quedó claro
que Máxima Potencia no es una acción aparte — "crítico" es un resultado de
tirada, así que es la propia tirada "Volar" jugada a lo grande (acción
Compleja + 2 cargas en vez de Simple + 1), no un botón "Usar" independiente.
Se construyó como una `Accion` normal (`accionesDeMovimiento()`,
`lib/rules/movimiento.ts`), con Máxima Potencia como un toggle
`CondicionTirada` (`valorActivo`/`valorInactivo` a 0 — no toca el
modificador, solo el payout) y un campo nuevo `Accion.vuelo:
{velocidadBase, bonusCritico}`, hermano de `ataque` pero en metros en vez de
daño, resuelto por `resolverVuelo()` (mismo patrón que `resolverDanio()`) —
más la célula de RECURSOS que le faltaba a la familia `movimiento`. Lección:
antes de dar una pieza por "acción sin dado", comprobar si la prosa menciona
"crítico"/"éxito"/"fallo" — si lo hace, hay una tirada de por medio y no es
sin dado. Malla Plasmática sigue siendo candidata real (activar/sacrificar
puntos del colchón no depende de ninguna tirada), pero arrastra su propio
prerrequisito sin resolver — ver `docs/tareas.md`.

**No confundir con el tipo 3 (Visor Nocturno).** Visor Nocturno no crea su
propia acción — solo cuelga una nota sobre una acción que ya existe
("Buscar/percibir"). Solo entra en "acciones sin dado" lo que de verdad es
una activación única, propia, sin dado detrás.

## Capa 2 y media: los dos sabores de Recurso

- **De instancia** (`lib/rules/recursos.ts`, construido 2026-09-22): atado a
  un `instanciaId` de una pieza equipada concreta. Dos armas iguales, dos
  contadores independientes. Es lo que hay hoy: munición, batería.
- **De personaje**: un único valor por personaje, no por pieza — vida,
  fatiga, carga transportable, y probablemente sigilo persistente si se
  mecaniza la propuesta de la pregunta 25b de `sistema.md`. Hoy viven como
  **foto de combate** (`Combatiente.pgActual`/`fatigaActual`, se resetean al
  cerrar el `Combate`) — arquitectura distinta a la de RECURSOS de instancia,
  que se decidió persistente a propósito el mismo día.

**Esta divergencia es una decisión aparcada, no un bloqueante.** Puede que el
combate acabe escribiendo sobre la ficha en vez de sobre un snapshot, puede
que se resuelva de otra forma — es trivial comparado con el volumen real del
trabajo, que es regularizar varios cientos de elementos de capa 1, no dos o
tres recursos de personaje. No se prioriza hasta que haga falta de verdad.

## Lo que queda fuera del modelo, a propósito

- **Coste y rareza**: metadatos de creación/economía (cuánto pagas, qué tope
  de rareza te deja tu letra de Recursos), no efecto de la pieza una vez la
  llevas puesta. No son ninguno de los tipos — tampoco el aporte **Coste**
  (7), que es gastar un recurso al usar una acción, no el precio de
  compra — si algo los está forzando ahí, es una señal de que se está
  confundiendo "cuánto cuesta" con "qué hace".
- **Identidad narrativa** (trasfondo, motivación, edad, altura, peso mientras
  no alimenten ningún derivado): modificador narrativo por definición, no
  hay nada que mecanizar salvo que el diseñador dé una regla concreta que los
  use.
- **El tablero** (casillas, alcance, tamaño, altura): la app no tendrá nunca un grid —
  queda fuera por definición del proyecto (usuario, 2026-10-14). Regla general: **lo que la
  app puede aplicar o recalcular se aplica en la ficha; lo demás es texto** (tipo 3 o 4).
  Un efecto que solo depende del tablero no es un hueco a construir. Distinto es lo que la
  app *podría* ganar con UX en vez de prosa (p.ej. "N usos por turno" como varios botones,
  igual que el contador de atacantes adicionales de Esquivar): eso se etiqueta **candidata
  a UX** al modelar y se decide por patrón, no pieza a pieza (`docs/tareas.md`).
- **El "Poder" del NPC** (`lib/rules/npc.ts`): una métrica de bookkeeping
  solo para el máster — no la ve el jugador, no alimenta ninguna acción.
  Utilidad del máster, prima hermana de Recursos/Tienda pero fuera del ciclo
  capa 1 → capa 2 por completo.

## Casos ya detectados que no encajan limpio — para no repetir el error

- **Derivados estáticos** (vida, fatiga, movimiento, carga máxima, alerta
  pasiva): no son acciones (no hay d12), son fórmulas sobre la capa 1 que se
  muestran como número fijo. A veces el camino es Capa 1 → Derivado → Acción,
  no un salto directo — el peso de un arma no modifica ninguna acción hoy,
  alimenta un derivado (Carga Transportable) que el día que se mecanicen sus
  penalizadores sí tocará acciones.
- **Proyector de Pulso** (subsistema, `equipo.ts`): parece limpio ("es un
  arma, capa 1 que apunta a `ataque_con_proyector_de_pulso`") pero no lo es
  del todo — su modo Aguijón es melee dentro de un arma a distancia (sin
  precedente en la forma de `ArmaFuego` hoy), y puede operarse con
  Tecnociencia en vez de Combate a Distancia ("elige habilidad", no solo
  "elige atributo", también sin precedente). Ver
  `docs/equipo-efectos-especiales.md`, Hallazgo #1.
- **El aviso de munición insuficiente** (RECURSOS, hoy): es el primer caso
  real de `CondicionTirada` con `alcance` aplicado a `arma`/`armaMelee` — el
  mecanismo 1 de arriba excluye esas dos familias a propósito en
  `condicionesActivas()` (para no duplicar con `condicionesDeMejoras`), así
  que el aviso de munición se construyó **dentro** de `tiradaDeArmaFuego`
  (`combate.ts`), no reutilizando `condicionesActivas`. Si llega un segundo
  caso parecido, es la señal de que hace falta generalizar esto de verdad en
  vez de repetir el parche.

## Checklist para dar de alta un elemento nuevo

Antes de marcar una pieza del catálogo (o una raza, poder, dote, aumento)
como transcrita de verdad:

1. Lee la regla completa en la fuente (`EQUIP`, `sistema.md`, el documento
   que traiga Murillo), no solo la fila de una tabla.
2. Por cada efecto que tenga, rellena: **¿a qué acción(es) de capa 2 afecta?**
   y **¿qué tipo de aporte es?** (los seis de la lista cerrada, o narrativo)
3. Si es tipo 5, declara `arbitraje` (duro/blando/pendiente) — nunca lo
   asumas.
4. Si es tipo 1 (crea su propia acción) y no es una pieza de equipo con
   precedente ya construido, dilo explícito — es terreno sin mecanismo
   genérico todavía.
5. Si un efecto no encaja en ninguno de la lista, para y discútelo antes de
   forzarlo — la lista es cerrada a propósito: ampliarla exige justificarlo
   como se hizo con Resolución y Coste (2026-10-28), no estirar el más
   cercano hasta que quepa cualquier cosa.
6. Solo cuando cada efecto tiene sus dos respuestas, el elemento está
   transcrito de verdad — copiar el texto a `descripcion`/`detalle` no cuenta
   como transcripción, es solo el primer paso.

## Siguiente paso (hecho 2026-09-23/24)

El barrido está cerrado: `src/lib/rules/motor.ts` (tipo + schema Zod) y
`src/lib/catalog/motor.test.ts` (recorre el catálogo entero de equipo,
exige `MotorMetadata` completo en cada efecto) llevan las 550 entradas de
las 215 piezas/niveles del catálogo de equipo, en verde. `ESPECIES` entra
en el test desde E1a (2026-10-09), con MotorMetadata por rasgo de especie,
casta y linaje; los rasgos de coste de creación (castas, descuentos
psiónicos, bolsa de aumentos) van con `creacion: true` y `motor: []`,
porque coste y rareza quedan fuera de este modelo.

Una auditoría adversarial posterior (agente fresco, releyendo la fuente
desde cero, sin mirar primero lo declarado) encontró un puñado de errores
reales, concentrados en patrones (una constante compartida mal tipada, una
justificación de bloqueo copiada sin revalidar, un campo entero sin
declarar) — la lección, no solo para este barrido: **un test en verde
prueba forma, no contenido; un barrido de datos-con-juicio repartido en
paralelo necesita una auditoría adversarial después, no basta con el test.**
Los 5 errores encontrados están corregidos y commiteados (2026-09-24):
Derribo (justificación de bloqueo falsa en 8 piezas), `bonifMaxAgilidad`
(sin declarar en las 10 armaduras), 3 fármacos mal tipados narrativo en vez
de numérico, `movilidad_aerea` (2 efectos sin declarar), y la convención
`objetivo_tercero` (dudosa, cerrada como "siempre texto" — ver el bloque
`Afecta` más arriba).

## Escalabilidad para las fases que vienen (diagnosticado 2026-09-24, construido y probado en vivo el mismo día)

Cuando se escribió esta sección, `MotorMetadata` describía fielmente cómo se
comportaba cada pieza, pero **ningún código lo leía** — era documentación al
lado del dato real, no conectada al motor. Importaba porque vienen ~300
elementos nuevos de capa 1 (poderes, dotes, ciberware, razas, más estados, y
probablemente más tipos todavía) repartidos en varios catálogos nuevos, y un
personaje puede llevar activos simultáneamente del orden de 20-25 elementos
de capa 1 a la vez. El proceso de entonces no estaba pensado para eso — **ya
lo está**: los 5 puntos de abajo se construyeron, se revisaron uno a uno
(commits `88dfe28`, `3e5ff7e`+`9d7edd0`, `be268bb`, `c1cf353`, `861076e`+
`b336832`+`1a213d6`, `5c9413e`+`4b6edbe`) y se probaron en el navegador de
punta a punta, no solo con tests.

**Diagnóstico original, verificado contra el código de entonces:**

1. Generar la lista de Tiradas hacía hasta 5 pasadas completas separadas
   sobre `sheet.equipo`, y cada pasada buscaba cada pieza con
   `equipoPorId()` — `EQUIPO.find(...)`, lineal sobre el catálogo entero.
2. El cuello de botella real: `condicionesActivas()` se invocaba una vez
   POR CADA tirada mostrada, repitiendo una pasada completa sobre
   `sheet.equipo` cada vez — tiradas × piezas equipadas × tamaño del
   catálogo, no una sola pasada.
3. Cero memoización — el componente de la pestaña recalculaba todo en cada
   render, no solo cuando cambiaba el equipo.
4. El `Sheet` solo tenía un array de capa 1 (`sheet.equipo`). Copiar el
   patrón de arriba por cada familia nueva (Poderes, Dotes, Ciberware...)
   no solo sería lento — serían 5-10 pipelines casi idénticos que mantener
   sincronizados a mano, el mismo riesgo que ya se documentó para el aviso
   de munición.

En cómputo puro, a la escala dada esto seguía siendo rápido en términos
absolutos — el problema real nunca fue CPU, fue recalcular sin necesidad en
cada render y tener que copiar el mismo patrón hardcodeado por cada familia
nueva en vez de generalizarlo una vez.

**Arquitectura construida — cada punto con su archivo real, no propuesta:**

1. **Índice de catálogo por id**: `equipoPorId()` (`catalog/equipo.ts`) usa
   un `Map` construido una vez a nivel de módulo, no `.find()`.
2. **`fuentesDeCapa1(sheet)`** (`src/lib/rules/capa1.ts`, nuevo): enumera
   "todo lo activo de capa 1 de un personaje", agnóstica de familia — hoy
   solo envuelve `sheet.equipo` (única fuente real todavía), listo para
   sumar `sheet.poderes`/`sheet.dotes`/lo que traiga Fase 5 sin que sus
   consumidores cambien. **Sin consumidores reales todavía** — es el punto
   de extensión, no algo ya en uso.
3. **Generación de acciones dirigida por el dato**: `REGISTRO_DE_ATAQUE`
   (`src/lib/rules/combate.ts`) — un mapa `familia → función generadora`
   sustituye los bucles hardcodeados de antes, y desde `generaAccionPropia()`
   (mismo archivo) consulta `MotorMetadata.mecanismo === "accion_equipo"` +
   `estado === "construido"` antes de generar — `MotorMetadata` ya decide
   de verdad, no es solo documentación. Dar de alta una familia nueva es
   añadir una entrada al registro, no tocar `accionesDeAtaque()`.
4. **Índice de bonos/condiciones construido una sola vez**:
   `indiceDeCondiciones`/`consultaIndiceCondiciones` (`lib/rules/equipo.ts`)
   sustituyen el escaneo por tirada — `condicionesActivas()` se queda en el
   código, sin uso real, con su test de equivalencia.
5. **Memoización real** en `AccionesTab.tsx` (antes `TiradasTab.tsx`):
   `useMemo` con `sheet.equipo`/`sheet.recursos` como dependencias, no
   `sheet` entero — confirmado que un cambio de atributo/habilidad no
   dispara el recálculo, solo equipar/desequipar.

Dar de alta un poder/dote/aumento que solo modifica Acciones ya existentes
(numérico o texto, `afecta.modo: "accion_existente"`) es, hoy, solo datos —
`MotorMetadata` correcto en el catálogo, sin tocar el motor genérico. Dar de
alta uno que genera su propia Acción nueva sigue pidiendo una función
generadora registrada (paso 3) — sigue siendo código, pero un solo sitio en
vez de cuatro. Ver `docs/modificadores-tiradas.md` para la guía práctica de
qué mecanismo usar en cada caso.

**De paso, el catálogo se dividió** (`catalog/equipo.ts`: 3222 → 190 líneas,
6 familias a sus propios archivos, mismo patrón que ya usaban
`armasMelee.ts`/`armamentoPesado.ts`/`municion.ts`) y se hizo el rename
completo "Tiradas" → "Acciones" en código y UI — el nombre ya encajaba con que
la pestaña fuera a tener filas con y sin dado el día de mañana; esa parte
(Acciones sin dado, sección de arriba) se construyó el 2026-09-27.
