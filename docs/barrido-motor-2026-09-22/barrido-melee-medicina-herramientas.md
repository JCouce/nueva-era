# Barrido capa 1 — Armas melee (+ Kerzul), Medicina, Herramientas

Checklist de `docs/motor.md`. Tramo: `ARMAS_MELEE` completo (armasMelee.ts, 39
piezas), `VALIJA_TACTICA_MEDICA` + `FARMACOS` (medicina.ts, 11), `VALIJA_TACTICA_
FABRICACION` + `RADAR` + `DISFRAZ_HOLOGRAFICO` + `ESCANER_DETECTOR` + `MATERIALES`
(herramientas.ts, 7). 57 piezas.

Formato: `pieza — efecto → acción → tipo`. Sin desarrollar lo ya resuelto; las
dudas nuevas se explican en su propia sección al final.

## Cómo se resuelven hoy las armas melee en general (aplica a las 39)

Todas siguen el mismo patrón ya mecanizado (`combate.ts::tiradaDeArmaMelee`):
**daño** (`formulaDanio`, ej. "Fue+2") → acción `Golpear con <arma>` → **tipo 1**
(modificador de acción, ya genérico para toda la familia, no arma por arma).
**`efectos`** (los "Crítico de X (N)") → **tipo 3** (texto informativo), ya
mecanizado vía `nota` — el máster aplica el estado a mano, diseño deliberado
("informa, no arbitra"). Con más de un modo (`modos.length > 1`) → **tipo 2**
trivial, el `dificultad` de cada modo ya es un `CondicionTirada` de opción
genérico (`condicionModo`). No repito esto pieza a pieza abajo salvo que un
efecto se salga de este patrón.

## Pelea (3/3 resueltas)
Puñetazo, Patada, Codazo o Rodillazo: daño+crítico → tipo 1+3, sin nada más
que transcribir. Sin coste/rareza (a mano vacía) — coherente, no hay nada que
mecanizar ahí.

## Armas Cortas (4/4 resueltas)
Tonfa/Porra, Maza de Armas, Pico de Cuervo, Hacha de Armas: mismo patrón,
sin efectos extra al `formulaDanio`/`efectos`.

## Armas de Asta (6/6 resueltas)
Bastón de Combate, Lanza Corta, Lanza Larga, Hacha de Guerra, Martillo
Enastado, Alabarda: mismo patrón. "Alcance 4" y "Arma a 2 manos" viven en
`uso` como texto — **tipo 4 (narrativo)**, correcto: no hay regla de alcance
en casillas mecanizada todavía en ningún sitio del motor (ni siquiera para
armas de fuego), así que no es un hueco de esta pieza en particular.

## Escudos (2 resueltas, 2 con duda nueva)
- Rodela, Escudo, Rodela de Metamaterial, Escudo de Metamaterial: el ataque
  (`formulaDanio`/`efectos`) → tipo 1+3, resuelto igual que cualquier melee.
- **`defensa: {cobertura, blindaje, puntosGolpe}`** — DUDA NUEVA. Hoy solo se
  pinta en `PiezaDetalle.tsx` (información en la ficha de Equipo), no
  alimenta ninguna acción: no hay tirada de "levantar el escudo", el
  `blindaje` del escudo no se suma a ningún cálculo (bloqueado además por el
  Hallazgo #5 general de blindaje), y `puntosGolpe` (el escudo se puede
  destruir) no tiene ningún sitio donde restarle daño. Sería tipo 1
  (acción "Levantar escudo", simple o estándar según el modelo, ya lo dice
  `descripcion`) + tipo 2 (blindaje/cobertura que se suma mientras está en
  alto) — pero las dos cosas están sin construir. Afecta a las 4 piezas de
  esta familia por igual.

## Espadas y Dagas (4/4 resueltas)
Cuchillo de Combate, Espada Ligera, Espada, Montante: mismo patrón. La nota
de `rareza` en S13 (`sistema.md`) ya está resuelta, no es duda de motor.

## Flagelos (2 resueltas, 1 con duda ya conocida)
- Látigo, Cadena Armada: mismo patrón, sin nada extra.
- **Mangual** — `uso` incluye `"Acción Estándar ignora 2 niveles de Cobertura
  física"` (tipo 2, numérico condicionado al modo "Estándar" — no mecanizado
  hoy, mismo patrón que el resto de "ignora N de cobertura/blindaje" del
  catálogo) y `"Bloqueo -2"` — **ya conocida, pregunta 31 de `sistema.md`**
  ("Bloqueo" no está definido en ningún sitio del proyecto). No re-abro la
  pregunta, solo la cito: el "ignora 2 niveles de Cobertura" en cambio SÍ es
  una duda nueva de esta pasada, porque no depende de qué es "Bloqueo" — es
  un modificador numérico condicionado a un modo, ya resoluble con el
  mecanismo 1 de `modificadores-tiradas.md` (`CondicionTirada` con nota) en
  cuanto se decida a qué acción de "ignorar cobertura" apunta exactamente
  (¿la propia tirada de ataque del Mangual, o la tirada de quien intenta
  cubrirse? — la cobertura hoy tampoco tiene mecanismo, es otro hueco
  transversal).

## Armas Mecánicas (5/5 con duda nueva, mismo patrón para las 5)
Hoja Dentada, Guantelete de Pistón, Sierra Circular, Martillo de Pistón,
Ariete Percusivo. Todas comparten el mismo efecto sin mecanizar: **"Acción
Compleja: ignora 1 nivel de armadura"** (Hoja Dentada, Sierra Circular) o
**"Acción Compleja: Derribo (N)"** (Guantelete, Martillo, Ariete) — **DUDA
NUEVA**: es tipo 2 (numérico, condicionado al modo "Compleja" elegido, mismo
mecanismo 1 de siempre) pero "ignora 1 nivel de armadura" depende otra vez
del Hallazgo #5 de blindaje sin resolver, y "Derribo (N)" es una tirada
enfrentada o un estado nuevo que no existe todavía en el catálogo de 23
estados de `sistema-y-combate.md` (a diferencia de Aturdimiento/Hemorragia,
que sí están). Ariete Percusivo además tiene "doble daño contra puertas,
muros y estructuras" — **duda nueva menor**: no hay concepto de "objetivo
estructura" en el motor (todo objetivo es un `Combatiente`), narrativo por
ahora, sin acción a la que apuntar. Sierra Circular tiene `categoriaDanio:
"(sin especificar en la fuente)"` en sus dos modos — dato que falta en
`equipamiento.md` mismo, no error de transcripción; que quede anotado como
supuesto pendiente si algún día se rellena a mano.

## Kerzul (10/10 con duda ya conocida + 1 duda nueva puntual)
Puñal, Espada/Hacha/Pico, Espadón/Hacha de Armas, Maza, Bastón de Combate,
Lanza Corta, Lanza Larga, Martillo Enastado, Alabarda, Escudo — todas
comparten dos efectos sin mecanizar:
- **"Ignora N puntos de blindaje"** — bloqueado por el Hallazgo #5
  (absorción de blindaje sin fórmula, pregunta 29 sin responder). Ya
  conocido, una línea por pieza basta, no lo repito diez veces.
- **"Crítico: Impacto Estructural (N)"** — reduce el blindaje del objetivo de
  forma permanente. Ya conocido, conflicto **C13** de `sistema.md` (no está
  en el catálogo de 23 estados). Mismo caso para las 10 piezas.
- **Retroceso entrópico** (comentario de cabecera del archivo: con acción
  Estándar/Compleja, quien usa un arma Kerzul arriesga una tirada de
  Fortaleza dificultad = daño básico del arma, o daño no letal + entorpecido)
  — **DUDA NUEVA**: esto es tipo 1 (una acción/reacción propia: "Salvación
  por retroceso entrópico") que hoy no genera ninguna fila en Tiradas/Acciones
  para NINGUNA de las 10 armas Kerzul. No está ni siquiera como nota — el
  comentario de cabecera del archivo lo documenta pero no llega al jugador
  en ningún sitio de la UI. Es un hueco real, no solo de mecanización sino
  de que el dato ni se muestra.
- Escudo de Kerzul hereda además la duda de `defensa` de los Escudos
  normales (arriba) — mismo caso, blindaje/cobertura/PG sin acción.

## Medicina (2/11 con duda nueva, resto resuelto)
- **Valija Táctica Médica (4 niveles)**: ya resuelta de verdad, no solo
  transcrita — `modificadores: [{tipo:"tirada", alcance:{tiradaId:"medicina"}}]`
  con +1/+1/+2/+3 por nivel, tipo 2 mecanizado. Ejemplo de cómo debería
  quedar el resto del catálogo.
- **9 Fármacos** (Analgésico, Hemostáticos, Estabilizadores Neurales,
  Calmante, Antipatógeno, Ultra Estimulante, Gel Sanador, Gel Sanador
  Avanzado, Xovromium): todos `modificadores: []` a propósito — son bonos
  **por dosis**, no "mientras se lleva puesto", y el motor no lleva
  inventario de dosis (mismo principio que RECURSOS, pero sin construir
  para consumibles). Se quedan en tipo 3 (texto, el jugador aplica el número
  a mano con el modificador circunstancial que ya existe en `TiradaModal`) —
  **esto es una decisión ya tomada y correcta, no una duda**, lo confirma el
  comentario de cabecera del archivo.
- **Nano-Elixir**: mismo caso que el resto, +5 a la tirada de curación de
  esa dosis — resuelto igual (tipo 3, manual).
- **Xovromium** — **DUDA NUEVA**: el propio catálogo dice "Requiere Voluntad
  + Biociencia o Actitud (dificultad 6) — no hay tirada fija en el catálogo
  para esta pareja". Es un caso de tipo 1 (necesita su propia acción de
  "manifestación psiónica") que ni siquiera tiene precedente porque Poderes
  (Fase 5) no existe todavía — bloqueado corriente arriba, no es culpa de
  esta pieza.

## Herramientas (1/7 con duda nueva, resto resuelto)
- **VTF, Radar, Disfraz Holográfico, Escáner Detector**: ya resueltos de
  verdad. Radar/Disfraz/Escáner generan su propia acción dinámica
  (`lib/rules/herramientas.ts::tiradasDeHerramientas`, tipo 1 mecanizado,
  mismo patrón que `combate.ts`); VTF no trae ningún número limpio y se
  apoya en la tirada fija "tecnica" tal cual — decisión ya documentada en la
  cabecera del archivo, no una duda.
- **Materiales Sencillos**: sin número, solo habilita qué rarezas puedes
  fabricar — tipo 5 (habilitador, `arbitraje: pendiente`, mismo criterio
  general que munición/rareza de creación) para la propia fabricación con
  la VTF, ya que sin materiales la acción "Fabricar" no debería estar
  disponible aunque hoy nada lo impide.
- **Materiales Sofisticados / Materiales Avanzados** — **DUDA NUEVA, la más
  clara y barata de arreglar de todo el barrido**: el texto da un número
  limpio ("+2 a la tirada al reparar objetos... con la valija", "+4 a la
  tirada al reparar objetos de hasta rareza extraña") que apunta claramente
  a la tirada fija `tecnica` (confirmado que existe: `tiradas.ts:181-182`,
  "Reparar / hackear / fabricar"), pero `modificadores: []` en las dos
  piezas — el mismo patrón que ya resolvió la Valija Táctica Médica
  (`{tipo:"tirada", alcance:{tiradaId:"tecnica"}, valor:2}`) encajaría
  aquí sin inventar nada. La única razón para no mecanizarlo ya es que,
  a diferencia de la VTM (bono "mientras se lleva puesta"), este bono
  depende de **poseer** el material — y "poseer" no es lo mismo que
  "llevar equipado" en el modelo de hoy (`sheet.equipo` es lo que llevas
  puesto, Materiales son más bien inventario consumible). Encaja con la
  nota de RECURSOS de motor.md sobre si Materiales debería tratarse como
  un tercer tipo de recurso "de stock" en vez de un simple `Consumible`.

## Resumen numérico
- **57 piezas** analizadas.
- **43 piezas 100% resueltas** (Pelea 3, Cortas 4, Asta 6, Espadas/Dagas 4,
  Flagelos-Látigo/Cadena 2, VTM 1, Fármacos 9, VTF+Radar+Disfraz+Escáner 4,
  Materiales Sencillos 1, más Kerzul-blindaje/Impacto Estructural que están
  "resueltas" en el sentido de que ya están correctamente clasificadas y
  citadas — cuento las 10 Kerzul en la categoría de duda ya conocida, no
  aquí, porque además tienen la duda nueva del retroceso entrópico).
- **14 piezas con al menos una duda**: 4 Escudos (defensa sin acción), 1
  Mangual (Bloqueo ya conocida + ignora cobertura nueva), 5 Armas Mecánicas
  (ignora armadura / Derribo sin estado), 10 Kerzul (blindaje/Impacto
  Estructural ya conocidos + retroceso entrópico nuevo — cuentan una vez
  cada una aunque acumulen dos motivos), 1 Xovromium (tirada sin catálogo),
  2 Materiales (bono sin mecanizar, el más barato de arreglar).

## Dudas nuevas detectadas en este barrido (no estaban ya en equipo-efectos-especiales.md ni en sistema.md)
1. **`defensa` de Escudos (4 piezas + Escudo de Kerzul = 5)**: sin acción de
   "levantar escudo" ni consumo de su blindaje/PG propios.
2. **"Ignora N de Cobertura" del Mangual**: numérico condicionado a modo,
   mecanizable ya salvo por no saber a qué acción de "cobertura" apunta
   (la cobertura en sí no tiene mecanismo en el motor).
3. **"Acción Compleja: ignora armadura / Derribo(N)" de las 5 Armas
   Mecánicas**: mismo problema de cobertura/blindaje, más "Derribo" como
   estado sin catalogar.
4. **Retroceso entrópico de las 10 armas Kerzul**: ni siquiera se muestra
   hoy en la UI, no solo sin mecanizar.
5. **Xovromium sin tirada fija de manifestación psiónica**: bloqueado por
   Fase 5 (Poderes), no urge resolver antes de que exista esa fase.
6. **Materiales Sofisticados/Avanzados sin mecanizar su +2/+4 a "tecnica"**:
   la más barata de arreglar — mismo patrón que ya usa la VTM, encaja sin
   inventar nada, el único fleco es decidir "poseer vs. equipar" para
   consumibles en general (relacionado con la nota de motor.md sobre
   Recursos de stock).

## Dudas ya conocidas, solo referenciadas (no re-analizadas)
- **Hallazgo #5** (blindaje sin fórmula, pregunta 29 sin responder): afecta
  a las 10 armas Kerzul + las 2 Armas Mecánicas con "ignora armadura".
- **Pregunta 31** ("Bloqueo" sin definir): Mangual.
- **Conflicto C13** ("Impacto Estructural" fuera del catálogo de estados):
  las 10 armas Kerzul.
