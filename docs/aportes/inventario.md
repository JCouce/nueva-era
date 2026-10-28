# Inventario de aportes (fase 1)

**Fecha:** 2026-10-28. **Plan:** `docs/aportes/plan.md`, fase 1. **Estado:** en revisión.

Una tabla por estructura, una fila por campo, en el orden del tipo. Vocabulario de
`plan.md` §1 (tipo de aporte, blanco, entrega, momento, anclaje).

Cómo leer las columnas:
- **Tipo de aporte**: uno de los seis (Acción, Ajuste, Resolución, Coste, Texto, Habilitador).
  Un campo que no es aporte se marca con «—» y qué es: *identidad* (lo que la hoja es),
  *presentación*, *anclaje*, *dato de X* (sirve a un aporte de tipo X), *contenedor*,
  *salida* (resultado del montaje, no lo pone ningún ítem). Doble lectura: «A / B».
- **Blanco**: «la hoja» = el campo vive en la propia hoja (lo pone el ítem que la crea o se lo
  añade `conExtrasDeFicha`); «transversal (x)» = alcance que casa con varias hojas.
- **Entrega**: fijo · casilla · tramo. «casilla (hoja)» = el jugador lo elige en la propia hoja,
  no en el modal (Sutil, habilidad alternativa, especialidad a elegir).
- **Lo produce / Lo consume**: función y archivo (rutas relativas a `src/lib/rules/` salvo que se
  diga otra). En UI: `HojaTirada`/`HojaPoder` (`ArbolHabilidades.tsx`), `FilaTirada`/`FilaPoder`/
  `FilaUsar`/`tirar()`/`usarDirecta()` (`AccionesTab.tsx`), `AccionModal`, `ResultadoTirada`,
  `UsarModal`, `teAfecta` (`teAfecta.ts`). «vía montada» = la UI lo lee ya montado en
  `TiradaMontada`, no del campo.
- **Encaja / excepción / deuda**: *encaja* = cabe en el modelo tal cual; *excepción* = no sigue la
  regla y se propone declararla (§1.8); *deuda* = no sigue la regla y se arregla en una fase.

---

## 1. `Accion` (`acciones.ts:40`)

### 1.1 Campos de primer nivel

| Campo | Tipo de aporte | Blanco | Entrega | Momento (si Texto) | Lo produce (función:archivo) | Lo consume en UI (componente) | Encaja / excepción / deuda |
|---|---|---|---|---|---|---|---|
| `id` | — identidad (y clave de ★) | la hoja | — | — | `ACCIONES` (acciones.ts:370); generadores: `` `ataque_fuego_${instanciaId}` `` (combate.ts:393), `` `herramienta_${…}` `` (herramientas.ts:49), `` `volar_${…}` `` (movimiento.ts:39), `` `farmaco_${id}` `` (farmacos.ts:118), id de acción de poder/dote/aumento | `estrella(id)` y `memoria[id]` (AccionesTab), key de `HojaTirada`, `teAfecta` (`ACCIONES.find`) | deuda (fase 2): la instancia va dentro del string; nadie la lee de ahí (lo prohíbe el comentario de `recursoInstanciaId`). **Fase 2: resuelto** con `Accion.origen` (el ítem que la crea, con `instanciaId`) |
| `label` | — presentación | la hoja | — | — | ídem | `HojaTirada`, `FilaTirada`, `AccionModal` (título), `teAfecta` (no repite lo que ya dice el label) | encaja |
| `grupo` | — identidad / blanco transversal (`grupo`) | la hoja | — | — | generadores | `aBasicas`, títulos de sección y `conDado` (AccionesTab:1404-1414), `grupo === "Psiónica"/"Aumentos"` en `tirar()` y en el `bloqueo` del modal (AccionesTab:1812-1817) | deuda (fase 3): la UI reparte hojas por `grupo` |
| `aplicado` | — identidad (dato de Resolución base) | la hoja | — | — | generadores; `tiradaLibre` (acciones.ts:640) | `BarraSalvaciones` (icono), `HojaTirada` (abbr, vía montada), `AccionModal` (libre), `hojasArbol.aplicado` (AccionesTab:1435) | encaja |
| `aplicadoSutil` | Resolución | la hoja | casilla (hoja) | — | `tiradaDeArmaMelee` (combate.ts:809), `tiradaBloqueoDeArmaMelee` (combate.ts:875), solo con `extrasDotes.permisos.sutil` | `HojaTirada`/`FilaTirada` (chip Sutil; preselección comparando `ficha.aplicados`), `tirar()` (`danioSutil`, `formulaDanio.replace(/^Fue/, "Pot")`) | deuda (fase 3/5): la preselección y la fórmula Fue→Pot son regla en la UI |
| `habilidad` | — anclaje (habilidad) | — | — | — | generadores | `aBasicas` y `hojasArbol.habilidad` (AccionesTab), `HojaTirada` (vía montada) | encaja |
| `nota` | Texto | la hoja | fijo | antes | `ACCIONES`; `notaConPerfil` (combate.ts:702), `conTirada` (aumentosAcciones.ts:215), `accionesDeFarmacos` (farmacos.ts:107, con `notasFarmacos`); `conTextosEnTirada` (textosTirada.ts:70) pega los textos de ítems con «(fuente)» | `FilaTirada` (AccionesTab:410), `AccionModal` (prop `nota`), `teAfecta` (busca «(fuente)»). **`HojaTirada` no la pinta** | deuda (fases 2 y 4): un string con textos de varios ítems; el árbol no enseña el texto de «antes» |
| `efectoCritico` | Texto | la hoja | fijo | después (crítico) | `tiradaDeArmaFuego`/`tiradaDeArmaMelee`/`tiradaLanzarArmaMelee`/`tiradaGolpeBayoneta`/`tiradaDeProyectorPulso`/`tiradaGolpeAguijon` (combate.ts), `conTextosEnTirada`; `efectoCriticoConMunicion` (acciones.ts:841) lo cambia al tirar | `tirar()` → `ResultadoTirada` (:239-263); `teAfecta` | deuda (fase 2): textos de ítems concatenados en el string. **Fase 2: origen resuelto** (`Accion.textosDeFicha`, con `origen`); el string sigue igual hasta la fase 4 |
| `desarmado` | — identidad (casa blancos transversales) | — | — | — | `tiradaDeArmaMelee` (combate.ts:788) | `teAfecta` (contexto) | encaja |
| `contundente` | — identidad | — | — | — | `tiradaDeArmaMelee` (combate.ts:817) | `teAfecta` (contexto) | encaja |
| `efectos[]` (`{fuente, texto}`) | Texto | otra tirada / tercero | fijo | después (tras el daño) | `efectosDeMejoras` (combate.ts:188), `tiradaDeArmaFuego`, `efectosProyectorPulso` (combate.ts:1012), `tiradaDePoder` (poderes.ts:582), `conTirada` (aumentosAcciones.ts:236) | `tirar()` → `ResultadoTirada` (:324); `teAfecta` | encaja (origen solo texto) |
| `habilidadAlternativa` | anclaje (jugador) / Resolución | la hoja | casilla (hoja) | — | `ACCIONES` (acciones.ts:400, de la propia hoja: anclaje); `conEsquivaLevitando` (poderes.ts:864), `conEsquivaEnVuelo` (movimiento.ts:62), `conExtrasDeFicha` (fichaResuelta.ts:438, de `extrasDotes.alternativas`): Resolución puesta por otro ítem | `HojaTirada`/`FilaTirada` (chip; `usarHabilidadAlternativa` acciones.ts:959), `teAfecta` | deuda (fase 3): la hoja solo se pinta en su habilidad original, no en la alternativa (§1.7 pide «en cada anclaje posible») |
| `habilidadAlternativa.ajuste` | Ajuste | la hoja | casilla (hoja) | — | `conEsquivaEnVuelo` (movimiento.ts:62) | vía montada (`usarHabilidadAlternativa` lo pasa a `ajustesFijos`) | encaja |
| `especialidadArma` | anclaje (fijo) / Resolución (regla general §3: entera o mitad) | — | fijo | — | generadores de arma (combate.ts: `tiradaDeArmaFuego`, `tiradaDeArmaMelee`, `tiradaDeGranada`, `tiradaBloqueo*`…) | subtítulo de `AccionModal` (AccionesTab:1344), `HojaTirada` (vía `montada.especialidadArma`), `teAfecta` | encaja (ningún ítem la cambia: la Resolución es la regla general, no un aporte) |
| `especialidadesAccion` | anclaje (cualquiera) / Resolución (cuando la reescribe una elección) | — | fijo | — | `ACCIONES`, `tiradaDePoder` (poderes.ts:572), `construir` (dotesAcciones.ts:143), `conTirada`, `accionesDeFarmacos`; la reescriben `elegirEspecialidad` (acciones.ts:976) y `usarHabilidadAlternativa` | `hojasArbol.especialidades` (vía `especialidadesDeTirada`, AccionesTab:1435) — se pinta en cada especialidad (ArbolHabilidades.tsx:151); subtítulo de `AccionModal` | encaja |
| `soloConEspecialidad` | Habilitador (de la hoja) | la hoja | fijo | — | `ACCIONES` (acciones.ts:557-603) | `tiradaFijaVisible` (fichaResuelta.ts:474) desde AccionesTab:1394 | encaja |
| `especialidadAElegir` | anclaje (jugador) | — | casilla (hoja) | — | `ACCIONES` (acciones.ts:624) | `HojaTirada`/`FilaTirada` (chips; `elegirEspecialidad`) | deuda (fase 3): cuelga de la habilidad, no de cada especialidad candidata (ArbolHabilidades.tsx:150 «o a elegir, de la habilidad») |
| `familiaArma` | — identidad (blanco transversal `familiaArma`) | — | — | — | generadores de arma (combate.ts) | `teAfecta` (contexto) | encaja |
| `empleoArma` | — identidad | — | — | — | generadores de arma (combate.ts) | `teAfecta` (contexto) | encaja |
| `criticoFijo` | Resolución | la hoja (origen: especialidad de arma o `tiradaId`) | fijo | — | `conExtrasDeFicha` (fichaResuelta.ts:422-434, de `extrasDotes.criticos` y `grados`) | vía montada (`margenes`, `notas`) → `AccionModal`; `teAfecta` | encaja (las familias que lo admiten, `FAMILIAS_CON_CRITICO_FIJO`, están en código y no en el dato: deuda menor, fase 2). **Fase 2: resuelto**: `familias` en el destino de la dote y en `CriticoDeDote`; `criticoFijo.origen` |
| `falloCritico` | Resolución | transversal (especialidad) | fijo | — | `conExtrasDeFicha` (de `fallosCriticos`) | vía montada; `teAfecta` | encaja |
| `subeGradoFijo` | Resolución | la hoja / transversal | fijo | — | `conExtrasDeFicha` (de `grados`) | vía montada (`subeGrado`) → `ResultadoTirada` (`cambioGrado`); `teAfecta` | encaja |
| `efectoCriticoNatural` | Texto | la hoja | fijo | después (crítico natural) | `conTextosEnTirada` (`soloEnCriticoNatural`) | `tirar()` → `ResultadoTirada` (:243) | deuda (fase 2): string concatenado. **Fase 2: origen resuelto** (`textosDeFicha`); el string, fase 4 |
| `dificultadSugerida` | — identidad (dato de la hoja) | la hoja | — | — | `ACCIONES` (:513, :524), `tiradaDePoder` (poderes.ts:584), `construir` (dotesAcciones.ts), `conTirada` (aumentosAcciones.ts:227), `accionesDeFarmacos` (farmacos.ts:126), `tiradaDeHerramienta` (herramientas.ts:57) | `dificultadInicial` y key de `AccionModal` (AccionesTab:1798, 1822), `FabricarSeccion`, `ReparaFabricaModal` | encaja |
| `ventaja` | Resolución | la hoja / transversal | fijo | — | `tiradaDePoder` (`p.ventaja`), `conPsionicaEnTiradaFija` (poderes.ts:768), `conExtrasDeFicha` (de `ventajasFijas`) | vía montada → `AccionModal` (`tirarDado` con dos d12); `teAfecta` | encaja (fuente solo texto) |
| `poder` | — contenedor (ver 1.4) | — | — | — | `tiradaDePoder` (poderes.ts:552), `construir` (dotesAcciones.ts:189) | `tirar()` → `ResultadoTirada` (:116, :236, :339) | encaja |
| `bloqueada` | Habilitador | la hoja | fijo | — | `sinFatiga` (aumentosAcciones.ts) | `HojaTirada`/`FilaTirada` (apagada con motivo); bloqueo de `AccionModal` (AccionesTab:1816 relee `ficha.accionesAumentos`) | encaja (el dato no declara `arbitraje`) |
| `extremidad` | Resolución | la hoja | fijo | — | `tiradaBloqueoBrazo` (combate.ts:1200) | vía montada (aplicado y daño); `teAfecta` | encaja |
| `costeFatiga` | Coste | la hoja | fijo | — | `conTirada` (aumentosAcciones.ts:215) | vía montada (`costeFatiga`) → `tirar()` (`onPagarFatiga`) | encaja (sin fuente) |
| `recursoInstanciaId` | Coste | la hoja (cargador de esa instancia) | fijo (cantidad por modo y casilla) | — | `tiradaDeArmaFuego`, `tiradaDeArmamentoPesado`, `tiradaDeProyectorPulso`, `tiradaGolpeAguijon` (combate.ts), `tiradaDeVolar` (movimiento.ts) | `tirar()` (`gastoTotal` acciones.ts:889 → `onGastarRecurso`), `AccionModal` (`recursoActual` → `avisoInsuficiente`) | encaja (único campo de `Accion` con el id de instancia como dato) |
| `recursoUnidad` | — dato de Coste | — | — | — | generadores de arma (combate.ts:405, 587, 1098, 1149), `tiradaDeVolar` (movimiento.ts:46) | `AccionModal` vía `avisoInsuficiente` (acciones.ts:911) | encaja |
| `farmacoId` | Coste | la hoja | fijo (1 dosis) | — | `accionesDeFarmacos` (farmacos.ts:128) | `tirar()` (`onAjustarFarmaco`) | encaja (id de catálogo: los fármacos no tienen instancia) |
| `municionesEspeciales[]` | — contenedor (opciones de la casilla «Munición», ver 1.3) | — | — | — | `municionesDeArma` (combate.ts:315) | `tirar()` (`municionEspecialElegida`, `danioConMunicion`, `gastoMunicionEspecial`, `efectoCriticoConMunicion`) | encaja |
| `ignoraBlindaje` | Resolución (reglas del daño) / Texto (aviso) | daño del ataque | fijo | después | `ignoraBlindajeDe` (combate.ts:723) | `tirar()` → `danioInfo.ignoraBlindaje` → `ResultadoTirada` (:300); `teAfecta` | encaja (doble lectura: la regla es de daño, pero el blindaje es del objetivo y la app solo avisa) |
| `condiciones[]` | — contenedor (entrega casilla, ver §2) | — | casilla | — | `ACCIONES`, generadores, `conExtrasDeFicha` (índice), `conPsionicaEnTiradaFija`, `conApuntado` (combate.ts:1389), `prepararPoder` | `AccionModal` (controles, `resumenCasilla`/`resumenOpcion`), `teAfecta` | encaja |
| `ajustesFijos[]` | Ajuste | la hoja | fijo | — | combate.ts (`ajustesFijosDeMejoras` :252, `tiradaDeArmaFuego`, `tiradaDeGranada`, `tiradaGolpeBayoneta`…), `tiradaDePoder`, `construir` (dotesAcciones.ts), `accionesDeFarmacos`, `tiradaDeVolar`, `prepararPoder` (usoPoder.ts, casillas de fatiga), `usarHabilidadAlternativa` | `FilaTirada`/`FilaPoder` (signos), `HojaTirada` (`Desglose`), `teAfecta` | encaja (fuente solo texto) |
| `bonosTramo[]` | Ajuste | la hoja | tramo | — | `bonosTramoDeMejoras` (combate.ts:213), `conExtrasDeFicha` (dotes y aumentos) | vía montada (`desglose`); `teAfecta` | encaja (fuente solo texto) |
| `ataque` | — contenedor (ver 1.2) | — | — | — | generadores de arma, `tiradaDePoder`, `conTirada` | `tirar()` (`danioInfo`), `AccionModal` (`modoId`) | encaja |
| `vuelo` (`velocidadBase`, `bonusCritico`) | — dato de Acción (payout de «Volar») | la hoja | — | — | `tiradaDeVolar` (movimiento.ts:51) | `tirar()` (`resolverVuelo`) → `ResultadoTirada` (`vueloResuelto`) | encaja |
| `libre` | — identidad (raíz de la barra) | — | — | — | `tiradaLibre` (acciones.ts:640) | `AccionModal` (selectores), `tirar()` (etiqueta); `conExtrasDeFicha` la deja pasar sin extras | excepción (ya declarada: §1.8.1, barra) |

### 1.2 `ataque` y `ataque.modos[]`

| Campo | Tipo de aporte | Blanco | Entrega | Momento (si Texto) | Lo produce (función:archivo) | Lo consume en UI (componente) | Encaja / excepción / deuda |
|---|---|---|---|---|---|---|---|
| `modos[].id` | — identidad (opción de la casilla «modo») | — | — | — | `tiradaDeArmaFuego` (combate.ts:368), `tiradaDeArmaMelee` (:764), `conTirada` | `tirar()` y `AccionModal` (`modoId`) | encaja |
| `modos[].etiqueta` | — presentación | — | — | — | ídem | `tirar()` (`origenBase`) | encaja |
| `modos[].danio` | — dato de Acción (daño base) | la hoja | — | — | generadores de arma, `tiradaDePoder`, `conTirada` | `tirar()` → `danioInfo.base` → `ResultadoTirada` | encaja |
| `modos[].danioSutil` | — dato de Resolución (daño con Sutil) | la hoja | casilla (hoja) | — | `modoConPerfil` (combate.ts:731), `tiradaDeArmaMelee` | `tirar()` | encaja |
| `modos[].formulaDanio` | — dato de Acción | la hoja | — | — | generadores de arma | `tirar()` (fórmula, Fue→Pot con Sutil) | deuda (fase 3/5): el `replace` Fue→Pot vive en `tirar()` |
| `modos[].categoriaDanio` | — dato de Acción | la hoja | — | — | generadores | `tirar()` (`categoriaConAjuste`) → `ResultadoTirada` (:287) | encaja |
| `modos[].tipoDanio` | — dato de Acción / Resolución de otro ítem (Armas Modificadas) | daño | fijo | — | `modoConPerfil` (combate.ts:731) | `tirar()` → `ResultadoTirada` | deuda (fase 2): con Armas Modificadas es un aporte de otra pieza horneado en el generador, sin origen. **Fase 2: sin resolver** (E9: ver la nota de la sección de origen) |
| `modos[].danioExtra[]` | Resolución (daño) | daño | fijo | — | `modoConPerfil` (combate.ts:731) | `tirar()` → `ResultadoTirada` | deuda (fase 2): ídem |
| `modos[].gasto` | Coste | la hoja | fijo (por modo) | — | `tiradaDeArmaFuego`, `tiradaDeArmamentoPesado`, `tiradaDeProyectorPulso`, `tiradaGolpeAguijon` | `tirar()` (`gastoTotal`), `AccionModal` (`avisoInsuficiente`) | encaja |
| `danioAlFallar` | Resolución (daño) | la hoja | fijo | — | `tiradaDePoder` (poderes.ts) | `tirar()` → `danioInfo.alFallar` → `ResultadoTirada` | encaja |
| `sinBonoExitos` | Resolución (daño) | la hoja | fijo | — | `conTirada` (aumentosAcciones.ts:215) | vía montada (`conDanioFijo`) → `tirar()` | encaja |

### 1.3 `municionesEspeciales[]` (opciones de la casilla «Munición», `condicionMunicion` combate.ts:337)

| Campo | Tipo de aporte | Blanco | Entrega | Momento (si Texto) | Lo produce (función:archivo) | Lo consume en UI (componente) | Encaja / excepción / deuda |
|---|---|---|---|---|---|---|---|
| `id` | — identidad (id de catálogo de la munición) | — | — | — | `municionesDeArma` (combate.ts:315) | `tirar()` (`municionEspecialElegida` acciones.ts:830) | encaja |
| `label` | — presentación | — | — | — | ídem | `tirar()` (`origenBase`, fuente de `ignoraBlindaje`) | encaja |
| `stock` | — dato de Coste | — | casilla | — | ídem | etiqueta de la opción; `gastoMunicionEspecial` (acciones.ts:876) en `tirar()` | encaja |
| `ajusteDanio` | Resolución (daño) | daño del ataque | casilla | — | ídem | `danioConMunicion` (acciones.ts:856) en `tirar()` → `ResultadoTirada` | encaja |
| `tipoDanio` | Resolución (daño) | daño | casilla | — | ídem | `danioConMunicion` en `tirar()` | encaja |
| `ignoraBlindaje` | Resolución (daño) / Texto (aviso) | daño | casilla | después | ídem | `tirar()` → `ResultadoTirada` (:300) | encaja |
| `efecto` | Texto | la hoja | casilla | antes (nota de la opción) | ídem, y `condicionMunicion` lo pasa a la `nota` de la opción | `AccionModal` (nota de la opción); vía `montada.notas` | encaja |
| `efectoCritico` | Texto | la hoja | casilla | después (crítico) | ídem | `efectoCriticoConMunicion` en `tirar()` → `ResultadoTirada` | encaja |
| `sustituyeCritico` | — dato de Texto (sustituye al `efectoCritico` del arma) | otro aporte (el crítico del arma) | casilla | después | ídem | `efectoCriticoConMunicion` | excepción: aporte sobre aporte (ver Excepciones, E2) |

### 1.4 `poder: DetallePoder` (`poderes.ts:531`)

| Campo | Tipo de aporte | Blanco | Entrega | Momento (si Texto) | Lo produce (función:archivo) | Lo consume en UI (componente) | Encaja / excepción / deuda |
|---|---|---|---|---|---|---|---|
| `resultados` | Texto | la hoja | fijo | después (por grado) | `tiradaDePoder` (poderes.ts:552), `construir` (dotesAcciones.ts:189) | `tirar()` → `ResultadoTirada` (:339) | encaja |
| `danioPropio` | Coste | el propio personaje (vida) | fijo, según grado | — | `tiradaDePoder` | `efectosDelResultado` (usoPoder.ts) en `tirar()` → `onAjustarVida` | excepción: Coste que depende del resultado (ver E3) |
| `objetivoTira` | Texto | tercero | fijo | después | `tiradaDePoder`, `construir` | `ResultadoTirada`; `UsarPoderModal` (AccionesTab:1783, vía `resuelto`) | encaja |

---

## 2. `CondicionTirada` (`condiciones.ts:55`)

### 2.1 Comunes a las tres variantes

| Campo | Tipo de aporte | Blanco | Entrega | Momento (si Texto) | Lo produce (función:archivo) | Lo consume en UI (componente) | Encaja / excepción / deuda |
|---|---|---|---|---|---|---|---|
| `id` | — identidad (y id de uso en `usosEscena`) | — | — | — | catálogo (`NivelModulo.condiciones`, `ACCIONES`), `casillasDeEspecie` (especie.ts:371), `efectosDeDotes` (dotesEfectos.ts:249), `casillasDeAumentos` (aumentosTiradas.ts:238), `casillasDeFarmacos` (farmacos.ts:199), generadores | `AccionModal` (estado), `teAfecta` (`piezaPorCasilla`, `casillasDeCualquiera`) | deuda (fase 2): `teAfecta` deduce la pieza buscando el id en el catálogo (dos piezas iguales comparten id). **Fase 2: resuelto** con `CondicionTirada.origen` (con la instancia) |
| `tipo` | — entrega (toggle / opción / contador) | — | casilla | — | ídem | `AccionModal` | encaja |
| `etiqueta` | — presentación (y origen en texto) | — | — | — | ídem; las de dote llevan la fuente entre paréntesis | `AccionModal`, `teAfecta` (`nombreDeEtiqueta`, regex) | deuda (fase 2): el origen solo existe dentro de la etiqueta. **Fase 2: resuelto** (`CondicionTirada.origen`; la etiqueta ya no se lee) |
| `alcance` | — blanco del aporte | transversal / la hoja | casilla | — | ídem | `indiceDeCondiciones` (equipo.ts:919); `teAfecta` | encaja |

### 2.2 Variante `toggle`

| Campo | Tipo de aporte | Blanco | Entrega | Momento (si Texto) | Lo produce (función:archivo) | Lo consume en UI (componente) | Encaja / excepción / deuda |
|---|---|---|---|---|---|---|---|
| `valorActivo` | Ajuste | según `alcance` | casilla | — | catálogo, casillas de especie/dotes/aumentos/fármacos, `conPsionicaEnTiradaFija` | `AccionModal` (`resumenCasilla`), vía montada (`desglose`) | encaja |
| `valorInactivo` | Ajuste | ídem | casilla | — | `MEJORAS_ARMA`, `MEJORAS_ESTANDAR`, `condicionesSacrificioColchon` (combate.ts:672), `tiradaDeVolar` | ídem | encaja |
| `activaPorDefecto` | — dato de entrega | — | casilla | — | nadie hoy (grep sin resultados en catálogo y reglas) | `estadoInicial` (condiciones.ts:215) desde `AccionModal` y `eleccionSinTocar` | encaja |
| `nota` | Texto | ídem | casilla | antes y después | catálogo (Visor Nocturno, Mangual…), casillas de dote/aumento | `AccionModal` (bajo la casilla y en `montada.notas` con el resultado) | encaja |
| `margenCriticoExito` | Resolución | ídem | casilla | — | `efectosDeDotes`, `exitoCritico` (catalog/especies.ts) | vía montada (`margenes`) | encaja |
| `gastoActivo` / `gastoInactivo` | Coste | la hoja | casilla | — | `tiradaDeVolar` (movimiento.ts) | `gastoTotal` en `tirar()`, `avisoInsuficiente` en `AccionModal` | encaja |
| `ventaja` | Resolución | ídem | casilla | — | `efectosDeDotes`, `anadidosPorAccion` (dotesAcciones.ts), catálogo de aumentos | vía montada (`ventaja`) → `AccionModal` | encaja |
| `subeGrado` | Resolución | ídem | casilla | — | `efectosDeDotes` | vía montada → `tirarMontada` → `ResultadoTirada` (`cambioGrado`) | encaja |
| `noApila` | — dato de Ajuste (regla de combinación) | — | — | — | `IMPLANTES` (catalog/aumentos.ts), `MEJORAS_ARMA`, `CASILLAS_ULTRA_ESTIMULANTE` (farmacos.ts), `casillasCoberturaVisor` | `sinApilar` (montaje.ts) → desglose a 0 con motivo | encaja |
| `aplicado` | Resolución | ídem | casilla | — | `efectosDeDotes` (Negociación Analítica, `cambia_par`) | vía montada (`aplicado`) | encaja |
| `costeFatiga` | Coste | ídem | casilla | — | `efectosDeDotes` (Ojo Clínico), catálogo de aumentos | vía montada (`costeFatiga`) → `tirar()` (`onPagarFatiga`) | encaja |
| `ahorroFatiga` | Coste (negativo) | otros Costes de la tirada | casilla | — | `OPERACIONES_GENETICAS` (Mielinización Central) | vía montada (`costeFatiga`, `ahorroSinUsar`) → `tirar()` (`pagarPoder`) | encaja (combina como Coste: «suma aparte») |
| `danio` (`ajuste`, `categoria`, `sinBonoExitos`, `conBonoExitos`) | Resolución (daño) | daño del ataque | casilla | — | `casillaDeManiobra` y `efectosDeDotes` (dotesEfectos.ts) | vía montada (`danio`) → `tirar()` (`categoriaConAjuste`, `resolverDanio`) | encaja |
| `usoPorEscena` | Coste (un uso de escena) | — | casilla | — | `OPERACIONES_GENETICAS` | vía montada (`usosEscena`) → `tirar()` (`onGastarUsosEscena`) | encaja |
| `bloqueada` | Habilitador (de un aporte) | la casilla | fijo | — | `conUsosEscena` (usosEscena.ts:71), `casillaBlindajeBrazo`/`casillaBlindajeReactivo` (blindaje.ts) | `AccionModal` (casilla apagada con motivo); `sinBloqueadas` (montaje.ts) | encaja |
| `extremidad` | Resolución | ídem | casilla | — | `casillaBrazo` (brazoBionico.ts:163) | vía montada | encaja |
| `resumen` | — presentación | — | — | — | `efectosDeDotes` (Bioma Predilecto) | `AccionModal` (`resumenCasilla`) | encaja |

### 2.3 Variante `opcion` y `OpcionCondicion`

| Campo | Tipo de aporte | Blanco | Entrega | Momento (si Texto) | Lo produce (función:archivo) | Lo consume en UI (componente) | Encaja / excepción / deuda |
|---|---|---|---|---|---|---|---|
| `opciones[]` | — contenedor | — | casilla | — | catálogo, `condicionTramo` (combate.ts:126), `condicionModo` (:292), `condicionMunicion` (:337), `condicionApuntado` (acciones.ts), `selectoresContra` (aumentosTiradas.ts), `opcionesTratamientoVtm` (medicina.ts) | `AccionModal` | encaja |
| `porDefecto` | — dato de entrega | — | casilla | — | ídem | `estadoInicial` | encaja |
| `opcion.id` | — identidad | — | — | — | ídem | `AccionModal`; `BonoPorTramo.porTramo` lo usa como clave | encaja |
| `opcion.etiqueta` | — presentación | — | — | — | ídem | `AccionModal`, `desgloseCondiciones` | encaja |
| `opcion.valor` | Ajuste | según `alcance` | casilla | — | ídem | `AccionModal` (`resumenOpcion`), vía montada | encaja |
| `opcion.nota` | Texto | ídem | casilla | antes y después | ídem | `AccionModal`, vía `montada.notas` | encaja |
| `opcion.margenCriticoExito` | Resolución | ídem | casilla | — | `opcionesTratamientoVtm`, `CRITICO_VTM4` (medicina.ts) | vía montada | encaja |
| `opcion.ventaja` | Resolución | ídem | casilla | — | `opcionesSinInmunidad` (aumentosTiradas.ts) | vía montada → `AccionModal` | encaja |
| `opcion.fuenteVentaja` | — origen de Resolución (texto) | — | — | — | `opcionesSinInmunidad` | `ventajaDeOpcion` (montaje.ts) → aviso del modal | encaja |
| `opcion.costeFatiga` | Coste | ídem | casilla | — | `opcionesSinInmunidad` | vía montada → `tirar()` | encaja |
| `opcion.partes[]` | — origen de Ajuste (texto) | — | — | — | `opcionesSinInmunidad` | `desgloseCondiciones` → desglose del modal | encaja (origen solo texto) |
| `opcion.sinValor` | — presentación | — | — | — | `selectorEleccion` (aumentosAcciones.ts), `CON_TIRADA` (farmacos.ts), `selectorBarridoRadar` (herramientas.ts), medicina.ts | `resumenOpcion` | encaja |
| `opcion.dificultad` | Resolución (dificultad de la variante) | ídem | casilla | — | `opcionesTratamientoVtm`, `OPCION_HERIDA_NORMAL` (medicina.ts) | `dificultadTrasCambio` desde `AccionModal` | encaja |

### 2.4 Variante `contador`

| Campo | Tipo de aporte | Blanco | Entrega | Momento (si Texto) | Lo produce (función:archivo) | Lo consume en UI (componente) | Encaja / excepción / deuda |
|---|---|---|---|---|---|---|---|
| `valorPorUnidad` | Ajuste | según `alcance` | casilla | — | `CONDICION_ATACANTES_ADICIONALES` (acciones.ts), catálogo | `AccionModal`, vía montada | encaja |
| `min` / `max` / `porDefecto` | — dato de entrega | — | casilla | — | ídem | `AccionModal`, `estadoInicial` | encaja |
| `descuento` (`unidades`, `fuente`) | Ajuste sobre otro aporte | otro aporte (el contador) | fijo | — | `conDescuentos` (fichaResuelta.ts:513, de `extrasDotes.descuentos`) | vía montada (`desgloseCondiciones`); `teAfecta` | excepción: aporte sobre aporte, Reflejos Felinos (ver E2) |

### 2.5 `BonoPorTramo` (`condiciones.ts:317`, lo que llevan `Accion.bonosTramo` y `extrasDotes.bonosTramo`)

| Campo | Tipo de aporte | Blanco | Entrega | Momento (si Texto) | Lo produce (función:archivo) | Lo consume en UI (componente) | Encaja / excepción / deuda |
|---|---|---|---|---|---|---|---|
| `fuente` | — origen (texto) | — | — | — | `bonosTramoDeMejoras` (combate.ts:213), `efectosDeDotes`, `bonosTramoDeAumentos` (aumentosTiradas.ts:270) | vía montada (`desglose`); `teAfecta` | deuda (fase 2): solo texto. **Fase 2: resuelto** (`BonoPorTramo.origen`) |
| `porTramo` | Ajuste | la hoja | tramo | — | ídem | vía montada | encaja |
| `condicion` | — dato de entrega (qué selector mira) | — | tramo | — | ídem («Apuntado», «modo», «Marcha») | `valorBonoTramo` | encaja |
| `soloEnEspecialidad` | Habilitador (del aporte) | el bono | fijo | — | `efectosDeDotes` | `bonosTramoAplicables` (montaje) | encaja |
| `excluyente` | — dato de Ajuste (combinación) | — | — | — | `efectosDeDotes` | `bonosTramoAplicables` | encaja |
| `noApila` | — dato de Ajuste (combinación) | — | — | — | `bonosTramoDeMejoras` | `sinApilar` | encaja |
| `siActiva` | Habilitador (del aporte: lo enciende una casilla) | el bono | casilla | — | `efectosDeDotes` (Bioma Predilecto) | `valorBonoTramo` | encaja |

---

## 3. Lo que `FichaResuelta` lleva a una tirada (`fichaResuelta.ts:118`)

### 3.1 `modificadores: ModificadorConFuente[]`, por tipo de `Modificador` (`modificadores.ts:145`)

Producen todos: `resolverFicha` (fichaResuelta.ts:289-326) con `especieDeFicha` (especie),
`efectosDeDotes` (dotes), `modificadoresDeEquipo` (equipo.ts:730), `modificadoresDeAumentos`
(aumentos.ts:276), `modificadoresDeEstados` (estados.ts:293), `efectosDeActivables`
(aumentosActivables.ts:92), `topeAgilidadAplicado` (derivados.ts:83) y `modificadoresDeUmbrales`
(estados.ts:164).

| Campo | Tipo de aporte | Blanco | Entrega | Momento (si Texto) | Lo produce (función:archivo) | Lo consume en UI (componente) | Encaja / excepción / deuda |
|---|---|---|---|---|---|---|---|
| `atributo` (`exceptoSaludYSalvaciones`) | Ajuste | derivado (atributo) | fijo | — | especie, dotes, equipo, aumentos, activables, `topeAgilidadAplicado` | vía montada (aplicado); `HojaTirada` (abbr y valor) | encaja (el tope de Agilidad de la armadura es una Resolución —un tope— entregada como Ajuste negativo: deuda menor, no llega a Acciones como aporte propio) |
| `derivado` (`noApila`) | Ajuste | derivado (vida, fatiga, alerta, movimiento, carga) | fijo | — | especie, equipo, aumentos | no se pinta en Acciones (Estado) | encaja |
| `habilidad` | Ajuste | nodo (habilidad) | fijo | — | especie, dotes (sin verificar cuáles) | `fuentesDeHabilidad` (ArbolHabilidades.tsx:76) | deuda (fase 3): el valor de la rama lo suma la UI |
| `tirada` (`alcance`, `noApila`, `compensa`) | Ajuste | según `alcance` (nodo o transversal) | fijo | — | todas las fuentes y `modificadoresDeUmbrales` | vía montada (`desgloseAlcance`); `fuentesDeHabilidad`/`fuentesDeEspecialidad` (ArbolHabilidades.tsx:76-91); `teAfecta` | encaja (los de umbral §7 no tienen ítem: ver E4) |
| `disciplina` | Ajuste | derivado (nivel de disciplina) | fijo | — | especie (Resonancia +1) | no se pinta en Acciones | encaja |
| `multiplicadorVida` | Resolución (cambia la fórmula, no suma) | derivado (vida) | fijo | — | `modificadoresDeAumentos` (Hipertrofia) | no se pinta en Acciones | encaja como Resolución; hoy vive en `Modificador` junto a los Ajustes |
| `anulaPenalizadores` | Resolución | transversal (alcance) | fijo | — | `efectosDeActivables` (Proyección activa) | vía montada (`conPenalizadoresAnulados`) | encaja |
| `origen` | — origen (categoría: especie/dote/aumento/equipo/estado) | — | — | — | todas | `teAfecta` (descarta `estado`) | deuda (fase 2): categoría, no ítem. **Fase 2: resuelto** con `item` (OrigenAporte; `origen` sigue siendo la categoría) salvo estados y umbrales (ver la sección de origen) |
| `fuente` | — origen (texto) | — | — | — | todas | desglose, `fuentesDeHabilidad`, `teAfecta` | deuda (fase 2): solo texto. **Fase 2**: el ítem va en `item`; `fuente` se queda para el desglose |

### 3.2 Resto de extras

| Campo | Tipo de aporte | Blanco | Entrega | Momento (si Texto) | Lo produce (función:archivo) | Lo consume en UI (componente) | Encaja / excepción / deuda |
|---|---|---|---|---|---|---|---|
| `indiceCondiciones` | — contenedor de casillas con alcance (Ajuste/Resolución/Coste/Texto según la casilla) | transversal | casilla | — | `indiceDeCondiciones` (equipo.ts:919) con equipo + `casillasDeEspecie` + `dotes.casillas` + `conUsosEscena(casillasDeAumentos)` + `casillasDeFarmacos` | `conExtrasDeFicha` vía `consultaIndiceCondiciones` (equipo.ts:976); `prepararPoder` (FilaPoder y AccionesTab le pasan el índice); `teAfecta` (`casillasDeCualquiera`, con una ficha vacía en caché de módulo) | deuda (fase 2): `CondicionIndexada` es `{condicion, orden}`, el origen se pierde al indexar. **Fase 2: resuelto**: el origen va en la propia casilla (`CondicionTirada.origen`), ya no hace falta la caché |
| `textosTirada[]` (`TextoEnTirada`: `en`, `texto`, `fuente`, `soloEnCritico`, `soloEnCriticoNatural`) | Texto | `en` (tiradaId, desarmado, aplicado, transversal) | fijo | antes (nota) / después (crítico, crítico natural) | `textosDeEspecie` (especie.ts:399), `efectosDeDotes`, `textosDeAumentos` (aumentosTiradas.ts:254), `efectosDeActivables` | `conExtrasDeFicha` → `conTextosEnTirada` (los pega a `nota`/`efectoCritico`); `prepararPoder`; `conExtrasDirectaDeFicha`; `teAfecta` (busca «(fuente)» en los strings) | deuda (fases 2 y 4): bien tipado aquí, se aplana a string al pegarlo |
| `extrasDotes.bonosTramo` | Ajuste | transversal (alcance) | tramo | — | `efectosDeDotes` + `bonosTramoDeAumentos` | `conExtrasDeFicha` | encaja (origen en `bono.fuente`, texto) |
| `extrasDotes.criticos` | Resolución | especialidad de arma (y familias de ataque en código) | fijo | — | `efectosDeDotes` (Crítico Mejorado) | `conExtrasDeFicha` | deuda menor (fase 2): el blanco «solo ataques» está en `FAMILIAS_CON_CRITICO_FIJO`, no en el dato. **Fase 2: resuelto** (`CriticoDeDote.familias`, del destino) |
| `extrasDotes.permisos.familias` | Habilitador (de hojas: «Bloquear con X») | familia de arma | fijo | — | `efectosDeDotes` (Bloqueo) | `accionesDeAtaque(…, ficha.extrasDotes.permisos)` (AccionesTab:810) | encaja (sin origen: lista de familias, no qué dote) |
| `extrasDotes.permisos.sutil` | Habilitador (de un aporte: Sutil) | familia de arma | fijo | — | `efectosDeDotes` (Combate Sutil) | ídem | encaja (ídem) |
| `extrasDotes.descuentos` | Ajuste sobre otro aporte | el contador «Atacantes adicionales» | fijo | — | `efectosDeDotes` (Reflejos Felinos) | `conExtrasDeFicha` (`conDescuentos`) | excepción: aporte sobre aporte (E2) |
| `extrasDotes.grados` | Resolución | transversal (alcance) | fijo | — | `efectosDeDotes` (Velocista, Gran Puntería) | `conExtrasDeFicha`; `selectorApuntadoDeFicha` (fichaResuelta.ts:502); `teAfecta` | encaja; Gran Puntería sobre «Apuntado» = excepción ya declarada (§1.8.3) |
| `extrasDotes.alternativas` | Resolución / anclaje (jugador) | transversal (alcance) | casilla (hoja) | — | `efectosDeDotes` (Cazador Cazado, Vigilancia Táctica) | `conExtrasDeFicha` → `habilidadAlternativa` | deuda (fase 3): como `habilidadAlternativa` |
| `ventajasFijas` | Resolución | transversal (alcance) | fijo | — | `ventajasFijasDeAumentos` (aumentosTiradas.ts:264) | `conExtrasDeFicha` | encaja |
| `fallosCriticos` | Resolución | transversal (especialidad) | fijo | — | `fallosCriticosDeEspecie` (especie.ts:388) | `conExtrasDeFicha` | encaja |
| `piezasInutilizadas` | Habilitador (de ítem entero) | ítem (`instanciaId`) | fijo | — | `resolverFicha` (siempre vacío, fichaResuelta.ts:342) | nadie | deuda (fase 6, Shock S73) |
| `accionesDotes` (`tiradas`, `directas`) | Acción | nodo (anclaje de la acción) / Sin dado | — | — | `accionesDeDotes` (dotesAcciones.ts:204) | AccionesTab:842 (separa por `grupo`), `HojaTirada`, `FilaUsar` | encaja (copias en otro grupo con id `__grupo`: ver ★ en el plan) |
| `accionesAumentos.filas` | Acción | nodo / Sin dado | — | — | `accionesDeAumentos` (aumentosAcciones.ts:245) | AccionesTab:855, `grupoDeAumento` (reparte en Sin dado) | deuda (fase 3): `grupoDeAumento` decide en la UI |
| `accionesAumentos.directas` | Acción | Sin dado | — | — | ídem | ídem | encaja |
| `accionesAumentos.informativas` (`InfoDeAumento`) | Texto | Sin dado («Referencia») | fijo | antes | ídem | `FilaInfo` (AccionesTab, sección Referencia) | encaja (excepción declarada §1.8.2) |
| `accionesEspecie` | Acción | Sin dado («Activar y desactivar») | — | — | `accionesSinDadoDeEspecie` (especie.ts:441) | AccionesTab:1574 → `FilaUsar` | encaja |
| `poderesDotes` | Acción | nodo (habilidad del poder) / Sin dado | — | — | `poderesDeDotes` (dotesPoderes.ts:39) | AccionesTab:880 → `FilaPoder`/`HojaPoder` | encaja |
| `notasFarmacos` | Texto | hojas de fármaco | fijo | antes | `notasFarmacosDeEspecie` (especie.ts:436) | AccionesTab:824-825 se lo pasa a `accionesDeFarmacos`/`accionesDirectasDeFarmacos` | deuda (fase 3): la UI orquesta el generador; strings sin fuente estructurada |

---

## 4. Lo que la UI lee para pintar

### 4.1 `TiradaMontada` (`montaje.ts:92`)

Todo es **salida** del montaje (lo produce `montarTirada`, montaje.ts:312); la columna «Tipo» dice
qué aportes agrega.

| Campo | Tipo de aporte | Blanco | Entrega | Momento (si Texto) | Lo produce (función:archivo) | Lo consume en UI (componente) | Encaja / excepción / deuda |
|---|---|---|---|---|---|---|---|
| `aplicado` | — salida (Resolución: el aplicado con el que se tira) | la hoja | — | — | `montarTirada` | `HojaTirada`, `FilaTirada`, `FilaPoder`, `HojaPoder` (abbr y valor), `teAfecta` (vía `HojaTirada`), `tirar()` (libre) | encaja |
| `habilidad` | — salida | la hoja | — | — | ídem | `FilaTirada`, `FilaPoder`, `tirar()` (libre) | encaja |
| `enEspecialidad` | — salida (anclaje) | — | — | — | ídem | no se lee en UI (sí `especialidadArma.tiene`) | encaja |
| `especialidadArma` | — salida (anclaje, presentación) | — | — | — | `especialidadFijaMontada` | `HojaTirada`, `FilaTirada` («sin X: la mitad») | encaja |
| `ajustesFijos` | — salida (Ajuste) | — | fijo | — | ídem | `FilaTirada`, `FilaPoder` | encaja |
| `base` | — salida | — | — | — | ídem | no se lee en UI | encaja |
| `modificador` | — salida (suma de Ajustes) | — | — | — | ídem | `HojaTirada`/`HojaPoder` (`Desglose`), `FilaTirada`, `FilaPoder`, `BarraSalvaciones` | encaja |
| `circunstancial` | — salida (lo escribe el jugador; no es de ningún ítem) | — | — | — | ídem | `AccionModal` | encaja |
| `total` | — salida | — | — | — | ídem | `AccionModal` | encaja |
| `desglose` | — salida (líneas de Ajuste con etiqueta) | — | — | — | ídem | `HojaTirada`/`HojaPoder` (`Desglose`), `AccionModal` | deuda (fase 2): cada línea lleva solo etiqueta. **Fase 2: sin resolver** (rompe tests de caracterización de montaje: ver la sección de origen) |
| `margenes` | — salida (Resolución) | — | — | — | `margenesDeCondiciones`, `conCriticoFijo`, `conFalloCritico` | `tirarMontada` (no la UI) | encaja |
| `notas` | — salida (Texto de casillas + Resolución explicada en texto: crítico fijo, fallo crítico, sube grado) | — | — | antes y después | ídem, `notasCondiciones` | `AccionModal` (bloque de notas) | encaja |
| `modoElegido` | — salida | — | — | — | `modoElegido` (condiciones.ts) | no se lee en UI | encaja |
| `ventaja` | — salida (Resolución, con fuente en texto) | — | — | — | ídem | `AccionModal` (`tirarDado`, aviso) | encaja |
| `subeGrado` | — salida (Resolución) | — | — | — | ídem | `tirarMontada` | encaja |
| `danio` (`AjusteDanio`) | — salida (Resolución del daño, fuentes en texto) | — | — | — | `danioDeCasillas`, `conDanioFijo`, `ajusteDanioDeExtremidad` | `tirar()` (`categoriaConAjuste`, `danioInfo.ajuste`) → `ResultadoTirada` | encaja |
| `costeFatiga` | — salida (Coste) | — | — | — | `fatigaDeCasillas` | `tirar()` (`onPagarFatiga`) | encaja |
| `ahorroSinUsar` | — salida (Coste) | — | — | — | `fatigaDeCasillas` | `tirar()` (`pagarPoder`) | encaja |
| `casillasSinEfecto` | — salida (Habilitador de aporte: casilla por aplicado que no casa) | — | — | — | `conAplicadoEfectivo` | `AccionModal` | encaja |
| `usosEscena` | — salida (Coste) | — | — | — | `usosGastados` | `tirar()` (`onGastarUsosEscena`) | encaja |

### 4.2 `PoderPreparado` (`usoPoder.ts:77`)

| Campo | Tipo de aporte | Blanco | Entrega | Momento (si Texto) | Lo produce (función:archivo) | Lo consume en UI (componente) | Encaja / excepción / deuda |
|---|---|---|---|---|---|---|---|
| `poder` (`PoderDisponible`) | Acción (el ítem: poder de disciplina o de dote) | nodo (habilidad del poder) / Sin dado | — | — | `accionesDePsionica` (poderes.ts:467), `poderesDeDotes` | `FilaPoder`, `HojaPoder`, `UsarPoderModal` (título) | encaja (sabe su ítem: `accion.id`, `disciplina`) |
| `resuelto` (`PoderResuelto`) | — contenedor (economía, fatiga, alcance, daño, `objetivoTira`, `habilidadesAElegir`, notas; sin desglosar aquí) | — | — | — | `resolverPoder` (poderes.ts:161) | `FilaPoder`, `HojaPoder`, cabecera y pie del poder (AccionesTab:1052-1118), `variantesDePoder` (AccionesTab:1469) | deuda (fase 3): `variantesDePoder` y `poderPintable` deciden en la UI |
| `seleccion` | — elección del jugador (anclaje jugador: eje o habilidad) | — | casilla | — | `prepararPoder` | `HojaPoder` (abre con la selección), cabecera del poder | encaja |
| `coste` (`CosteFatiga`) | Coste | el poder | fijo + casillas | — | `costeFatiga` (poderes.ts:663), `pagoConCargas` | `FilaPoder`, `HojaPoder` («N fatiga»), cabecera del poder | encaja |
| `casillas` (`ToggleFatiga[]`) | Coste / Ajuste (Xovromium, Supresora: `efectosDeCasillas`) | el poder | casilla | — | `togglesDeFatiga` (poderes.ts:741) | cabecera del poder (AccionesTab:1095) | deuda (fase 5): sus Ajustes llegan a la tirada como `ajustesFijos` (prepararPoder), la entrega casilla se pierde |
| `cargas` | Coste (Derivación Psiónica) | el poder | casilla (contador de puntos) | — | `prepararPoder` (con `derivacionDeFicha`) | cabecera del poder (AccionesTab:1105-1111) | encaja (sabe la instancia: `derivacion.instanciaId`) |
| `bloqueo` | Habilitador | el poder | fijo | — | `prepararPoder` (`bloqueoPorRequisito`, `exceso`, `bloqueoPorFatiga`) | `FilaPoder`, `HojaPoder`, `AccionModal`, `UsarPoderModal` | encaja |
| `fatigaActual` | — dato de Coste | — | — | — | `fatigaEfectiva` | cabecera del poder (AccionesTab:1094) | encaja |
| `tirada` | — contenedor (`Accion`, §1) | — | — | — | `tiradaDePoder` + textos + índice | `FilaPoder`, `HojaPoder`, `abrir()` | encaja |
| `enEspecialidad` | — salida (anclaje) | — | — | — | `enEspecialidadDePoder` | `FilaPoder` | encaja |
| `montada` | — contenedor (`TiradaMontada`, §4.1) | — | — | — | `montarTirada` | `FilaPoder`, `HojaPoder` | encaja |
| `extraProrroga` | Coste (prolongar Proeza) | el poder | — | — | `prepararPoder` | `usarPoder` (no la UI) | encaja |

---

## 5. `AccionDirecta` (`acciones.ts:254`)

Producen: `accionDirectaDeHerramienta` (herramientas.ts:82), `accionesDirectasDeAtaque`
(combate.ts:1469), `tiradaDetonacionPulsoTermico` (combate.ts:1406), `accionActivarCamuflaje`
(combate.ts:1431), `accionesDirectasDeFarmacos` (farmacos.ts:134), `accionesSinDadoDeEspecie`
(especie.ts:441), `directa`/`desactivar` (aumentosAcciones.ts) y las directas de `accionesDeDotes`.

| Campo | Tipo de aporte | Blanco | Entrega | Momento (si Texto) | Lo produce (función:archivo) | Lo consume en UI (componente) | Encaja / excepción / deuda |
|---|---|---|---|---|---|---|---|
| `id` | — identidad (clave de ★) | la hoja | — | — | ver arriba (`` `levantar_escudo_${instanciaId}` ``, `` `radar_marcar_${…}` ``…) | `FilaUsar` (`estrella`) | deuda (fase 2): instancia dentro del string. **Fase 2: resuelto** (`AccionDirecta.origen`) |
| `label` | — presentación | — | — | — | ídem | `FilaUsar`, `UsarModal`, `SacrificioRecursoModal`, historial | encaja |
| `grupo` | — identidad | — | — | — | ídem | AccionesTab (separa Ataques/Defensa/Acciones y `grupo === "Aumentos"` en `usarDirecta()`) | deuda (fase 3): el reparto en Sin dado es de la UI |
| `familiaArma` | — identidad | — | — | — | `accionesDirectasDeAtaque` | `conExtrasDirectaDeFicha` (textos de dote) | encaja |
| `empleoArma` | — identidad | — | — | — | ídem | ídem | encaja |
| `nota` | Texto | la hoja | fijo | antes | productores + `conExtrasDirectaDeFicha` (fichaResuelta.ts:528) | `UsarModal`, `SacrificioRecursoModal` | deuda (fase 2): textos de ítems en string |
| `condiciones` | — contenedor (selectores de formulario: a qué va el bono de un activable, «ya usada» que cuesta 3) | la hoja | casilla | — | `selectorEleccion`, `casillaRepetida` (aumentosAcciones.ts) | `UsarModal` → `usarDirecta()` (`ID_ELECCION_ACTIVABLE`, `ID_ACCION_REPETIDA`) | deuda (fase 5): reutiliza `CondicionTirada` sin tirada; su Coste lo cobra el servidor |
| `confirmarLabel` | — presentación | — | — | — | `directa`, `desactivar`, `accionesSinDadoDeEspecie`, `accionesDirectasDeFarmacos`, combate.ts, herramientas.ts | `UsarModal`, `SacrificioRecursoModal` | encaja |
| `bloqueada` | Habilitador | la hoja | fijo | — | `usoDeAccionAumento` (aumentosAcciones.ts), `accionActivarCamuflaje`, `accionesDirectasDeAtaque` | `FilaUsar` (botón apagado con motivo) | encaja |
| `farmacoId` | Coste | — | fijo (1 dosis) | — | `accionesDirectasDeFarmacos` (farmacos.ts:146) | `usarDirecta()` (`onAjustarFarmaco`) | encaja |
| `recursoInstanciaId` | Coste (cantidad elegida) | — | casilla (contador del modal) | — | `tiradaDetonacionPulsoTermico` (combate.ts:1406) | `abrirDirecta()` → `SacrificioRecursoModal` → `confirmarSacrificio()` | encaja (sabe la instancia) |
| `categoriaDanio` | — dato de Acción (daño del sacrificio) | — | — | — | ídem | `confirmarSacrificio()`, `SacrificioRecursoModal` | encaja |
| `gastoRecurso` (`instanciaId`, `cantidad`) | Coste | — | fijo | — | `accionActivarCamuflaje` (combate.ts:1449) | `usarDirecta()` (`onGastarRecurso`) | encaja (sabe la instancia) |
| `costeFatiga` | Coste | — | fijo | — | `accionesSinDadoDeEspecie` (especie.ts:441), `directa` (aumentosAcciones.ts) | `FilaUsar` («N fatiga»), `usarDirecta()` (`onPagarFatiga`; las de aumento las cobra el servidor) | encaja |

`AccionDeAumento` (aumentosAcciones.ts:109) añade `fuente` (origen en texto) y `efecto`
(`EfectoAccionAumento`: lo que aplica el servidor al usarla). `InfoDeAumento` va en §3.2.

---

## Excepciones encontradas

Propuestas, para que el usuario decida (excepción declarada en §1.8 o deuda).

| # | Caso | Por qué no encaja | Propuesta |
|---|---|---|---|
| E1 | **Una casilla lleva varios aportes** (Ojo Clínico: ventaja + 1 fatiga; las casillas de aumentos con `ventaja` + `costeFatiga`; Mielinización: ahorro + uso por escena) | §1.3 dice «cada aporte es de un tipo»; una `CondicionTirada` mezcla Ajuste, Resolución y Coste en un objeto | No es excepción: aclarar en §1.5 que **la casilla es una entrega**, no un aporte, y puede agrupar varios aportes del mismo ítem. La hoja genérica (fase 5) pinta cada aporte por su tipo dentro de la casilla |
| E2 | **Aporte sobre aporte, más casos** además de Gran Puntería: Reflejos Felinos (`descuento` sobre el contador «Atacantes adicionales»), munición especial `sustituyeCritico` (sustituye el Texto de crítico del arma) | El blanco es otro aporte, no un nodo ni un transversal | Ampliar la excepción declarada §1.8.3 a una lista cerrada: Gran Puntería → «Apuntado», Reflejos Felinos → «Atacantes adicionales», munición especial → crítico del arma |
| E3 | **Coste que depende del resultado**: `poder.danioPropio` (Sondeo), daño por punto de Munición Supresora (`efectosDeCasillas`), peaje neurológico (salvación tras pagar) | §1.3 define Coste «al confirmar»; estos se cobran según el grado | Ampliar Coste con la misma condición de grado que Texto (siempre · en éxito · en crítico · en fallo…). Si no se quiere tocar el tipo, excepción declarada nueva |
| E4 | **Aportes sin ítem**: los modificadores de umbral de salud/fatiga (§7, `modificadoresDeUmbrales`, origen `"estado"`) | No los pone ningún ítem ni el máster: salen de la vida y fatiga actuales | Excepción declarada nueva: «aportes de la propia ficha (umbrales §7)», o tratarlos como un ítem sintético «Salud» en la fase 2 |
| E5 | **Anclaje «jugador» que no se pinta en cada anclaje posible**: `especialidadAElegir` (cuelga de la habilidad), `habilidadAlternativa` (solo en la habilidad original); los poderes sí, pero calculado en la UI (`variantesDePoder`) | Contradice §1.7 | Deuda, fase 3 |
| E6 | **El Texto «antes» no se ve en el árbol**: `HojaTirada` no pinta `nota` (solo `FilaTirada`, para ★/cabina, y el modal) | Contradice §1.6 («antes: se pinta en la hoja») | Deuda, fase 4 |
| E7 | **Textos de ítems aplanados a string**: `conTextosEnTirada` pega `TextoEnTirada` a `nota`/`efectoCritico` con «(fuente)»; `teAfecta` los recupera con regex | Se pierde tipo y origen | Deuda, fases 2 (origen) y 4 (momento). **Origen resuelto en la fase 2** (`Accion.textosDeFicha`); el aplanado sigue para la fase 4 |
| E8 | **Ajustes de casilla del poder entregados como fijos**: `prepararPoder` convierte las casillas de fatiga (Xovromium +1, Supresora −2) en `ajustesFijos` | La entrega (casilla) se pierde al llegar a la tirada | Deuda, fase 5 |
| E9 | **Armas Modificadas horneado en el generador**: `tipoDanio`/`danioExtra` de `modoConPerfil` | Es un aporte de otra pieza que entra en la hoja sin origen | Deuda, fase 2. **Sin resolver en la fase 2**: la modificación es parte de la propia arma (`pieza.modificaciones`), así que `Accion.origen` ya la cubre; un `origen` por modificación en `DanioExtra` rompe 2 tests de `armasModificadas.test.ts` (pendiente de decisión) |
| E10 | **Regla de blanco en código**: `FAMILIAS_CON_CRITICO_FIJO` (fichaResuelta.ts:409) | El blanco de Crítico Mejorado («solo ataques») no está en el dato | Deuda menor, fase 2 (al dar blanco completo). **Resuelto en la fase 2** (`familias` en el destino `especialidadArmaElegida`) |
| E11 | **`multiplicadorVida` y el tope de Agilidad** viven como `Modificador` (tipo de Ajuste) | Uno multiplica y el otro topa: son Resolución sobre un derivado | Encaja si se tipan como Resolución; no llegan a Acciones, prioridad baja (sin fase) |

No aparecen excepciones nuevas para la barra, Sin dado, el tablero ni la economía de creación:
lo que hay encaja en las ya declaradas.

---

## Recuento

Campos inventariados: **181** (cada fila de las tablas; los grupos `min`/`max`/`porDefecto` y
`gastoActivo`/`gastoInactivo` cuentan como una fila).

**Por tipo de aporte** (las filas con doble lectura cuentan en su primer tipo):

| Tipo | Filas |
|---|---|
| Acción | 6 |
| Ajuste | 16 |
| Resolución | 29 |
| Coste | 18 |
| Texto | 14 |
| Habilitador | 10 |
| Anclaje con doble lectura (anclaje / Resolución): `habilidadAlternativa`, `especialidadArma`, `especialidadesAccion`, `especialidadAElegir` | 4 |
| — (no es aporte: identidad, presentación, dato de X, contenedor, salida, origen) | 84 |

**Por encaje:**

| Estado | Filas |
|---|---|
| encaja | 145 |
| excepción | 5 (`libre` —ya declarada—, `sustituyeCritico`, `danioPropio`, `descuento`, `extrasDotes.descuentos`) |
| deuda | 31 |

De las 93 filas que **sí** son aporte, 76 encajan limpio. Las deudas se concentran en dos sitios:
el **origen** (fase 2: ids con la instancia dentro del string, etiquetas, `fuente` en texto, índice
sin origen) y **la UI repartiendo hojas** (fase 3: `grupo`, `aBasicas`, `variantesDePoder`,
`grupoDeAumento`, anclajes de jugador).

---

## Origen disponible

Si hoy se puede saber de qué ítem viene cada aporte **sin parsear texto**.

| Tipo | ¿Sabe su ítem? | Dónde se pierde |
|---|---|---|
| **Acción** | A medias. `PoderDisponible` sí (`accion.id`, `disciplina`). Las hojas de equipo llevan la instancia **dentro del id** (`` `ataque_fuego_${instanciaId}` ``), que no se debe parsear. Dotes y aumentos: id de acción del catálogo, sin id de la dote/pieza (`AccionDeAumento.fuente` es texto). Las fijas de `ACCIONES` no tienen ítem (correcto). | En cada generador (combate.ts, herramientas.ts, dotesAcciones.ts, aumentosAcciones.ts). En la UI, `conDado` (AccionesTab:1406) sabe la familia («Arma», «Dote»…) por de qué lista vino, y la tira. `FuenteCapa1` (capa1.ts) sí tiene `instanciaId`, pero solo la usan los tests |
| **Ajuste** | No. `ModificadorConFuente` lleva `origen` (categoría: especie/dote/aumento/equipo/estado) y `fuente` (texto), sin id. `ajustesFijos`, `bonosTramo` y `opcion.partes` llevan `fuente: string`. Las casillas, solo `etiqueta` | En los productores: `fuente: cat.label` (combate.ts:197, 260, 285), `fuente: a.fuente` (aumentosTiradas.ts), etiquetas de dote con la fuente entre paréntesis. `teAfecta` lo reconstruye con `piezaPorCasilla` (id de casilla → pieza del catálogo, no instancia), `nombreDeEtiqueta` (regex) y `casillasDeCualquiera` (caché de módulo) |
| **Resolución** | No. `criticoFijo`, `falloCritico`, `ventaja`, `subeGradoFijo`, `extremidad`, `ignoraBlindaje`, `habilidadAlternativa.ajuste` llevan `fuente: string`; `aplicadoSutil` ni eso (el permiso es una lista de familias sin dote); las casillas que resuelven, solo la etiqueta | En `efectosDeDotes`, `ventajasFijasDeAumentos`, `fallosCriticosDeEspecie` (`fuente: r.label`), `conExtrasDeFicha` |
| **Coste** | Sí, el mejor parado: `recursoInstanciaId`, `gastoRecurso.instanciaId` y `cargas.derivacion.instanciaId` llevan la instancia; `farmacoId` el id de catálogo (los fármacos no tienen instancia); `usoPorEscena` usa el id de la casilla como id del uso; el coste de un poder es del poder. **No** lo saben `costeFatiga` (de `Accion`, casilla u opción) ni `ahorroFatiga` | `fatigaDeCasillas` (montaje.ts) suma la fatiga de casillas sin conservar de qué casilla viene |
| **Texto** | No. `efectos[].fuente` y `TextoEnTirada.fuente` («rasgo · capa») son texto; al llegar a la hoja, `conTextosEnTirada` los **aplana** dentro de `nota`/`efectoCritico`/`efectoCriticoNatural` con «(fuente)». `notasFarmacos` son strings sueltos | `conTextosEnTirada` (textosTirada.ts:70); `teAfecta` busca `(${fuente})` dentro del string |
| **Habilitador** | Solo `piezasInutilizadas` (por `instanciaId`), y está vacío. `bloqueada` y `poder.bloqueo` son solo el motivo; `soloConEspecialidad` un flag; `permisos` una lista de familias sin la dote | `efectosDeDotes` (permisos), `sinFatiga` (aumentosAcciones.ts) |

**Fase 2 (2026-10-28, en revisión):** `OrigenAporte` (`rules/origen.ts`) puesto por cada
productor. Lleva origen: `ModificadorConFuente.item` (especie, dotes, equipo, aumentos,
activables), `CondicionTirada.origen` (equipo con alcance y mejoras de arma, especie, dotes,
aumentos, fármacos, psiónica en tiradas fijas, brazo biónico, Gran Puntería en «Apuntado»),
`contador.descuento.origenes`, `TextoEnTirada.origen` y `Accion.textosDeFicha`, `BonoPorTramo.origen`,
`ajustesFijos[]`/`efectos[]` de mejoras, `criticoFijo`/`falloCritico`/`habilidadAlternativa`/
`extremidad` `.origen`, `origenVentaja`/`origenSubeGrado`, los extras de `extrasDotes`,
`ventajasFijas`, `fallosCriticos`, y `Accion.origen`/`AccionDirecta.origen` en las acciones que crea un
ítem. **Sin origen**: modificadores de estados y umbrales (2 tests con `deepEqual`; "te afecta" los
descarta por categoría), `LineaDesglose` y notas de `TiradaMontada` (9 tests más, 6 de ellos de
`montaje-caracterizacion`), `DanioExtra` (E9), el selector «Contra…» (junta varias fuentes),
`notasFarmacos` (strings, fase 3), el tope de Agilidad. Los Costes siguen con `recursoInstanciaId`
/`farmacoId`. Lo lee `aportesDeTirada` (`rules/aportes.ts`).

Para la fase 2: el patrón que ya funciona es el de Coste (`instanciaId` como dato, puesto por el
generador que conoce la pieza). El punto más rentable es `FichaResuelta`: `resolverFicha` y
`indiceDeCondiciones` son el embudo por el que pasan casi todos los Ajustes, Resoluciones y
Textos con alcance.

---

## Reclasificaciones de `MotorMetadata` (fase 1b, aplicadas 2026-10-28)

Lista sacada en la fase 1 de cruzar cada pieza del catálogo que lleva una señal de Resolución o
Coste (`ventaja`, `margenCriticoExito`, `subeGrado`, `cambia_par`, `extremidad`, `costeFatiga`,
`ahorroFatiga`, `usoPorEscena`…) con su `motor`. En la fase 1b se resolvió qué metadato es cada
efecto (índice entre corchetes, contando desde 0 en el array `motor` de la pieza o del nivel) y se
aplicó. `afecta`, `mecanismo` y `estado` no se han tocado en ninguna.

**A `resolucion`, aplicadas** (mecanismo igual):
- Sutil en armas melee, la `sustitucion_aplicado`: `pelea_punetazo`, `pelea_patada`,
  `pelea_codazo_rodillazo`, `asta_lanza_corta`, `espada_cuchillo_combate`, `espada_ligera`,
  `flagelo_latigo`, `flagelo_cadena_armada` (catalog/armasMelee.ts). ✅
- Dotes con `sustitucion_aplicado` (efecto `cambia_par`): `dote_cazador_cazado` [0],
  `dote_negociacion_analitica` [0], `dote_combate_sutil` [0] y [1], `dote_vigilancia_tactica` [1]
  (la de `resistir_distraccion`; la [0] de `grupo:Iniciativa` es un +2 y se queda `numerico`). ✅
- Grado y crítico: `dote_velocista` [0] (`sube_grado`) y [1] (`margen_critico`),
  `dote_critico_mejorado` [0], `dote_gran_punteria` [0], `dote_equilibrista` [0],
  `dote_balanceo` [0] (la [1] es un +1, se queda `numerico`), `dote_como_pez_en_el_agua` [1],
  `dote_especialidad_medica` [1] (`margen_critico`; la [0] es el +1, se queda `numerico`),
  `valija_tactica_medica` nivel 4: la literal tras `MOTOR_BONO_APLICACION` (el selector de
  tratamiento con `margenCriticoExito: 0`; las dos de `MOTOR_BONO_APLICACION` son el +3 y se
  quedan `numerico`). ✅
- Ventaja: `dote_apoyo` [1], `dote_violencia_aterradora` [1], `dote_bioma_predilecto` [0]
  (Iniciativa) y [1] (Subsistencia) — eran dos, no una; [2] y [3] son el +3 de Rastreo y se
  quedan `numerico`. `aum_red_frontoparietal` [1] (ventaja fija en `grupo:Iniciativa`).
  Casillas de ventaja de los aumentos: `aum_optimizacion_vestibulo_auditiva` [2] (`alerta_activa`)
  y [3] (`rastreo`) — la [1] es el +2 de salvación, se queda `numerico`;
  `aum_bucle_de_realimentacion_motora` [1]; `aum_biogenesis_mitocondrial` [2] (ventaja en
  salvación con 1 de fatiga: lleva también un Coste, ver "partir" abajo);
  `aum_resiliencia_homeostatica` [1]; `aum_matriz_de_red_predeterminada` [4] (casilla «Repetir
  tras fallar»; la [2] es el +2 de salvación, se queda `numerico`). ✅
- Daño: `dote_derribo_brutal` [1] (`danio_por_exitos`; la [0], que quita el −2 de la maniobra,
  se queda `numerico`), `dote_golpe_mejorado_con_escudo` [0] (`categoria_danio`). ✅
- Extremidad: `aum_brazo_bionico` nivel 1 [0]; nivel 2 [0] (casilla del brazo), [1] (blindaje y
  bloqueo, `aumentos_bloquear_brazo`) y [2] (letal en pelea); niveles 3 y 4 [0] y [1]. ✅
  Duda para la auditoría: el blindaje del brazo en el golpe bloqueado es un número; se ha dejado
  en Resolución porque el metadato también cubre que la fila use la Fuerza/Agilidad del brazo.
- `aum_proyeccion_neuro_expresiva` [2] (`anulaPenalizadores` del activable; `suma_derivado`
  sobre `habilidad:actitud`). Verificado: es la única `suma_derivado` que no es el +1 de Carácter
  [0]. ✅
- Kerzul con `ignoraBlindaje` (`kerzul_*`, las diez armas): la `texto`/`nota_fija` comentada como
  «"Ignora N puntos de blindaje"» (la otra `nota_fija` construida es el crítico de Impacto
  Estructural, y la `ad_hoc` son los `efectos`). ✅ **Añadida en 1b**: el mismo caso en la
  modificación `nanofilamento` (armasModificadas.ts), última entrada de su `motor`.

**A `coste`, aplicada:**
- `aum_mielinizacion_central` [1]: era `texto`/`eleccion_jugador` (casilla de ahorro de fatiga,
  una vez por escena). ✅

**Partir en dos (Resolución + Coste), aplicado** (fase 1b ampliada, con permiso del usuario):
un metadato `resolucion` (la ventaja) y justo detrás uno `coste`, con el mismo `afecta`,
`mecanismo` y `estado`. ✅
- Aumentos: `aum_prefrontal_aumentada` [2]+[3], `aum_consciencia_omnidireccional` [2]+[3],
  `aum_conectividad_callosa` [0]+[1] (cubre las dos casillas, Concentrarse y Dos turnos),
  `aum_sincronizacion_neuromotora_profunda` [1]+[2], `aum_biogenesis_mitocondrial` [2]+[3]
  (ventaja en salvación con 1 de fatiga; no estaba en la lista de la fase 1) y
  `aum_proyeccion_neuro_expresiva` [1]+[2] (casilla «Con lenguaje»: el Coste es el
  `usoPorEscena`; el `costeFatiga` de Proyección es de la acción «Activar Proyección», que no
  tiene metadato propio). `CONSTRUIDOS_A2A` (`aumentos.test.ts`) sube 1 en cada una.
- `dote_ojo_clinico`: el efecto se parte en el modelado (`docs/modelado-dotes.json`): `ventaja`
  y un efecto nuevo `coste` (`fatiga: 1`) con la misma condición. El tipo de efecto `coste` es
  nuevo en `efectoDoteSchema` (dotesTipos.ts), lo aplica `dotesEfectos.ts` en la casilla de la
  misma condición (la misma casilla de antes: mismo id, ventaja y 1 de fatiga) y el generador
  lo clasifica como `coste`.
- Sin partir, mismo caso: `aum_matriz_de_red_predeterminada` [4] (casilla «Repetir tras
  fallar»: ventaja + `usoPorEscena`, como Proyección). No estaba entre las siete autorizadas;
  queda `resolucion` sola.

**Generador de dotes**: `dotes.ts` sale de `npm run gen-dotes`. `clasificar`
(`scripts/generar-catalogo-dotes.ts`) emite `resolucion` para `cambia_par`, `margen_critico`,
`sube_grado`, `ventaja`, `exito_extra`, `danio_por_exitos` y `categoria_danio`, y `coste` para
el efecto `coste`; regenerar da exactamente las reclasificaciones de arriba. El test
`src/lib/catalog/dotes.generado.test.ts` falla si `dotes.ts` no coincide con lo que genera.
`exito_extra` no lo usa ninguna dote hoy: se ha puesto en Resolución por la lista, pero sumar
éxitos podría leerse como un número; revisarlo cuando aparezca el primero.

**Se quedan como están** (el coste es parte de la acción que crean, no un aporte aparte): las
`accion`/`accion_equipo` de aumentos con fatiga (`aum_angiogenesis_sistemica`,
`aum_enjambre_nanobot`, `aum_neuroprotesis_simpatica`…) y `arianyi:vision_uv_ir`.

**Para decidir:** `dote_reflejos_felinos` (`descuento_contador`) es un Ajuste sobre otro aporte
(E2); se queda `numerico` (no tocado en 1b).
