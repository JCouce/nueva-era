# Modelado de la Psiónica: salida del workflow `modelar-area`

- **Qué es:** la salida del workflow `modelar-area` sobre `docs/psionica.md` (fuente literal del diseñador: `docs/Psiónica.pdf`). Relanzado el 2026-09-29 con el **modelo v2** (forma aprobada y campos decididos en los cuestionarios, `docs/sistema.md` §10.6).
- **Estado:** es una **propuesta sin construir**. No hay nada de esto en `src/lib/rules` ni en el catálogo.
- **Quién manda:** `docs/sistema.md`. Si algo de aquí choca con él, gana sistema.md. Para el código, un supuesto de este documento no existe hasta que entre en sistema.md.
- **Borrador:** `docs/modelado-psionica.json`, con raíz `CatalogoPsionica { sobrecarga, disciplinas[] }`. Cada `Disciplina` lleva sus `acciones` (`AccionPoder`, con `motor`) y ya tiene aplicadas **las correcciones del verificador** (§7).
- **Convenciones:** N = nivel **empleado**; "nvK" / "poseído K" = nivel **poseído** en la disciplina. "Nivel de poder" a secas = poseído. Fatiga en puntos; 10 turnos = 1 minuto.

---

## 1. Cobertura

### 1.1 Global

| Efectos | Cubierto | parametro | resultado_texto | manual | pregunta | narrativo | Con `campoNuevo` |
|---|---|---|---|---|---|---|---|
| **603** | **98 %** | 360 | 117 | 75 | 5 | 46 | 18 |

Un efecto cuenta como "cubierto" cuando tiene destino en el modelo sin campo nuevo pendiente, o cuando es narrativo o manual por decisión. La ejecución anterior (modelo v1) daba 87 % con 103 campos nuevos; con el modelo v2 quedan 18.

### 1.2 Por item

| Item | Efectos | % | parametro | res_texto | manual | pregunta | narrativo |
|---|---|---|---|---|---|---|---|
| resonancia.sincronia | 19 | 100 | 18 | 0 | 0 | 0 | 1 |
| resonancia.rastreo | 16 | **88** | 15 | 0 | 0 | 0 | 1 |
| resonancia.leer_mente | 13 | 100 | 7 | 2 | 3 | 0 | 1 |
| resonancia.alerta | 12 | **92** | 8 | 3 | 0 | 1 | 0 |
| resonancia.vinculo | 8 | 100 | 7 | 0 | 0 | 0 | 1 |
| resonancia._comunes | 43 | 95 | 34 | 0 | 0 | 2 | 7 |
| induccion.comando | 22 | 100 | 9 | 13 | 0 | 0 | 0 |
| induccion.modulacion | 89 | 100 | 19 | 67 | 0 | 0 | 3 |
| induccion.supresion | 12 | 100 | 7 | 5 | 0 | 0 | 0 |
| induccion.estabilizacion | 12 | 100 | 8 | 0 | 4 | 0 | 0 |
| induccion.reconfiguracion_mnemonica | 8 | 100 | 3 | 5 | 0 | 0 | 0 |
| induccion._comunes | 14 | 100 | 7 | 3 | 0 | 0 | 4 |
| hipercongnicion.sondeo_no_local | 24 | 96 | 15 | 5 | 2 | 1 | 1 |
| hipercongnicion.precognicion | 25 | 100 | 7 | 1 | 16 | 0 | 1 |
| hipercongnicion.retrocognicion | 22 | 100 | 15 | 6 | 0 | 0 | 1 |
| hipercongnicion._comunes | 6 | 100 | 2 | 0 | 0 | 0 | 4 |
| traslacion.anclaje | 20 | 95 | 15 | 1 | 3 | 0 | 1 |
| traslacion.trasladar | 16 | **94** | 13 | 2 | 1 | 0 | 0 |
| traslacion.proyeccion | 15 | **93** | 12 | 1 | 1 | 0 | 1 |
| traslacion.proeza | 8 | 100 | 6 | 0 | 2 | 0 | 0 |
| traslacion.sensor | 10 | 100 | 4 | 3 | 2 | 0 | 1 |
| traslacion._comunes | 37 | 100 | 31 | 0 | 0 | 0 | 6 |
| contencion.contencion | 66 | 98 | 26 | 0 | 39 | 1 | 0 |
| contencion._comunes | 13 | 100 | 8 | 0 | 2 | 0 | 3 |
| singularidad.impulso | 18 | **94** | 16 | 0 | 0 | 0 | 2 |
| singularidad.expansion | 19 | 100 | 17 | 0 | 0 | 0 | 2 |
| singularidad.convergencia | 21 | 100 | 19 | 0 | 0 | 0 | 2 |
| singularidad._comunes | 15 | 100 | 12 | 0 | 0 | 0 | 3 |

### 1.3 Qué impide el 100 %

**Efectos en "pregunta" (5)**

| Claim | Texto | Por qué |
|---|---|---|
| resonancia.alerta#11 | Lo anterior sucederá siempre que el psiónico se encuentre en un estado en el que sea capaz de emplear sus poderes de resonancia sin impedimentos. | Condiciona la ventaja a poder usar Resonancia sin impedimentos (¿exhausto, Munición Supresora, interferencia?). Sin definir; arbitraje pendiente. |
| hipercongnicion.sondeo_no_local#17 | En el nivel 3 aumenta a 1 minuto el tiempo que dura el sondeo una vez conseguida la prueba con éxito. | El minuto de duración en nv3 choca con la errata de Murillo (crítico: turnos por nivel, prolongable; éxito: máximo turnos por nivel, sin prolongar). No se sabe si sigue vigente ni para qué grado. |
| contencion.contencion#23 | El foco receptor, cuyo bonificador se contabiliza, gastará el habitual en puntos de fatiga de la contención personal. | Choca con el ×2 de #19: si el foco paga 'el habitual de la personal', la colaboración anularía el ×2. Sin regla clara. |
| resonancia._comunes#7 | El nivel de habilidad de resonancia del psiónico será determinante a la hora de abordar estas problemáticas semánticas o biológicas. | No dice cómo influye el nivel (¿baja la dificultad de la barrera?). Sin número hoy; pregunta al diseñador. |
| resonancia._comunes#10 | Riesgo: intentar resonar con una supercomputadora alienígena sin los filtros adecuados; el exceso de datos puede 'quemar' las sinapsis del psiónico. | Riesgo sin mecánica (no dice daño ni tirada). Pregunta si 'quemar sinapsis' es daño mental. |

**Efectos con `campoNuevo` sin consolidar (18)**

| Claim | Campo nuevo |
|---|---|
| resonancia.rastreo#6 | Opcion.multiplicaTiempo: number — ×2/×10 sobre el tiempo de la fila de la tabla usada (Murillo); Economia es un string {tiempo} y no admite multiplicar |
| resonancia.rastreo#9 | Opcion.multiplicaTiempo: number — ×10 sobre el tiempo de la fila de la tabla (Murillo) |
| induccion.comando#20 | multiplesObjetivos.desdeNivelPoseido: number — Comando lo desbloquea en nv3 y el modelo no tiene dónde gatear multiplesObjetivos por nivel poseído (Opcion.cambia no incluye multiplesObjetivos) |
| induccion.modulacion#75 | multiplesObjetivos.{desdeNivelPoseido: number; economia?: Economia} — Modulación lo desbloquea en nv4 y con varios objetivos vuelve a acción compleja aunque en nv2+ la simple sea estándar; hoy ambos datos solo caben en el texto |
| hipercongnicion.sondeo_no_local#16 | escalera de economía: [{tiempo:'1 hora'},{tiempo:'10 minutos'},{tiempo:'1 minuto'},'compleja','estandar','simple'] — baja_un_paso tiene que saber bajar desde un tiempo en minutos/horas, no solo entre tipos de acción |
| hipercongnicion.sondeo_no_local#22 | Resultado.salvacionPropia: { aplicado: 'fortaleza'\|'voluntad'...; dificultad: Valor \| 'la_de_la_prueba'; estado: string; duracion?: Valor } — la tirada sale de la ficha de quien usa el poder, así que la app podría calcularla como hace con la sobrecarga |
| hipercongnicion.sondeo_no_local#23 | Valor.porFatigaPagada: number — daño = fatiga realmente pagada tras la cadena semi-global (reutilizable por el fracaso crítico de Munición Supresora) |
| hipercongnicion.sondeo_no_local#24 | Resultado.salvacionPropia (dificultad 'la_de_la_prueba') |
| hipercongnicion.precognicion#6 | Valor.unidad: 'm'\|'turnos'\|'minutos'... — hoy el Valor numérico no dice en qué se mide |
| hipercongnicion.precognicion#7 | Valor.unidad (turnos) |
| hipercongnicion.precognicion#25 | Resultado.salvacionPropia: { aplicado: 'voluntad'; dificultad: 8; estado: 'confusion' } |
| hipercongnicion.retrocognicion#3 | Valor.unidad (m) |
| hipercongnicion.retrocognicion#16 | escalera de economía con tiempos (ver sondeo_no_local#16) |
| hipercongnicion.retrocognicion#20 | Resultado.salvacionPropia: { aplicado: 'voluntad'; dificultad: 6; estado: 'aturdido' } |
| traslacion.anclaje#11 | accionesHermanas: AccionPoder[] — un item de prosa genera una segunda acción propia (Duelo de Métrica, decidida como acción propia en fichas con Traslación) y el modelo es una AccionPoder por item |
| traslacion.trasladar#10 | accionesHermanas: AccionPoder[] — Levitar es una acción propia distinta (desdeNivel 2, coste 1/min sin tabla, movimientoOtorgado) y movimientoOtorgado no cabe en Opcion.cambia |
| traslacion.proyeccion#8 | Valor.porContador: { contador: string; valor: number } — +N por cada unidad de un contador que declara el jugador (tramos de 200 kg sobre 100 kg); hoy va como nota de daño |
| singularidad.impulso#18 | Opcion.cambia.desplazamiento: Valor (y Valor.porNivelPoseido) — Opcion.cambia no incluye desplazamiento, y '8 × nivel de poder' a secas es nivel POSEÍDO por convención, que Valor.porNivel no distingue del empleado |

---

## 2. Checklist del modelo

Leyenda: **✓** relleno · **–** no aplica (null o vacío) · **~** relleno con supuesto, texto `«manual»` o pregunta abierta · **✗** falta (la prosa lo implica y el campo está vacío).

### 2.1 Raíz y disciplinas

- `sobrecarga`: ✓ umbral exhausto, inconsciencia automática, salvación de Fortaleza 5 + N, daño letal no absorbible = N, ×0/×0,5/×1/×2. La dificultad y el daño van como `«manual»`, porque `Valor.porNivel` se lee como poseído y aquí es empleado.

| Disciplina | rama | requisito | porNivel | reglas | modifFatiga | modifEconomía | bonosOtras | ventajas | acciones |
|---|---|---|---|---|---|---|---|---|---|
| Resonancia | ✓ metasensoria | – | ✓6 (fatiga/economia/alcance) | ✓7 | ✓5 | ✓4 | ✓1 | ✓1 | 5 |
| Inducción | ✓ metasensoria | ✓ resonancia 1 | – (coste por acción) | ✓5 | – | – | – | – | 5 |
| Hipercongnición | ✓ metasensoria | ✓ resonancia 2 | – (tramos por acción) | ✓5 | – | ✓4 | – | – | 3 |
| Traslación | ✓ metrica | – | ✓6 (fatiga/alcance/carga) | ✓4 | ✓4 | ✓1 | – | – | 5 |
| Contención | ✓ metrica | ✓ traslacion 1 | ✓6 (fatiga/economia) | ✓3 | ✓2 | – | – | – | 1 |
| Singularidad | ✓ metrica | ✓ traslacion 2 | – (coste por acción) | ✓4 | ✓1 | – | – | – | 3 |

### 2.2 Acciones

Columnas: desde = `desdeNivel` · eco = `economia` · fat = `fatiga` · fTemp = `permiteFatigaTemporal` · alc = `alcance` · dur = `duracion` · obj = `objetivo` · despl = `desplazamiento` · res = `resolucion` · pObj = `porObjetivo` · objTira = `objetivoTira` · ejes = `ejes` · rdos = `resultados` · dPropio = `danioPropio` · múlt = `multiplesObjetivos` · notas = `notas` · togg = `togglesPropios` · bonos = `bonosEnOtrasTiradas` · mov = `movimientoOtorgado` · aNP = `ajustesPorNivelPoseido` · man = `manual` · motor = `motor`. El número tras ✓ es cuántas entradas tiene.

| Acción | desde | eco | fat | fTemp | alc | dur | obj | despl | res | pObj | objTira | ejes | rdos | dPropio | múlt | notas | togg | bonos | mov | aNP | man | motor |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Sincronía | ✓1 | ✓ gratuita | ✓ 0 | – | ✓ 1 | – | ✓ unico | – | ✓ sin dado | ✓ sint | – | ✓3 | ~ solo en agresivo/barrera | – | – | ✓2 | – | – | – | – | – | ✓2 |
| Rastreo | ✓1 | ✓ tabla | ✓ tabla | – | ✓ tabla | – | ✓ varios | – | ✓ tirada | ✓ sint | – | ✓2 | ~2 (éx/fr) | – | – | ✓2 | – | – | – | – | – | ✓4 |
| Leer Mente | ✓1 | ✓ estándar | ✓ 1 | – | ✓ 1 | – | ✓ unico | – | ✓ enfrentada | – | ✓1 | ✓1 | ✓4 | – | – | ✓1 | – | – | – | – | ✓3 | ✓4 |
| Alerta psiónica | ✓1 | ~ gratuita (preg.) | ✓ 0 | – | ✓ 20·niv | – | – | – | ✓ tirada | – | ✓1 | ✓1 | ~2 | – | – | ✓2 | – | – | – | – | – | ✓6 |
| Vínculo | ✓1 | ✓ compleja | ✓ 1 | – | ✓ 1·niv | ✓ 1·niv | ✓ aliado | – | ✓ sin dado | – | – | – | – sin dado | – | ✓ | ✓3 | – | ✓1 | – | – | ✓1 | ✓4 |
| Comando | ✓1 | ✓ estándar | ✓ 1 | – | ✓ 20·niv | – | ✓ unico | – | ✓ enfrentada | ✓ sint | ✓2 | ✓1 | ✓4 | – | – | – | ✓1 | – | – | ✓1 | – | ✓4 |
| Modulación | ✓1 | ✓ compleja | ✓ 1 | – | ✓ 20·niv | – | ✓ unico | – | ✓ enfrentada | ✓ sint | ✓1 | ✓2 | – (por opción) | – | – | ✓1 | ✓1 | – | – | ✓3 | – | ✓6 |
| Supresión | ✓1 | ✓ compleja | ✓ 1 | – | ✓ 20·niv | ✓ 10 | ✓ unico | – | ✓ tirada | ✓ sint | – | ✓1 | ~2 | – | – | – | – | – | – | ✓2 | – | ✓3 |
| Estabilización | ✓1 | ✓ simple | ✓ 1 | – | – | ✓ 10 | ✓ propio | – | ✓ tirada | – | – | ✓2 | ~2 | – | – | – | – | ✓2 | – | ✓3 | ✓3 | ✓4 |
| Reconfiguración Mnemónica | ✓3 | ✓ compleja | ✓ 2 | – | ✓ 20·niv | ✗ (¿permanente?/manual) | ✓ unico | – | ✓ enfrentada | ✓ sint | ✓1 | – | ✓4 | – | – | – | ✓1 | – | – | – | ✓1 | ✓1 |
| Sondeo No-Local | ✓1 | ✓ compleja | ✓ 1 | – | ~ «manual» | ✓ 1·niv | ✓ casilla | – | ✓ tirada | – | – | ✓1 | ✓4 | – | – | ✓2 | – | – | – | ✓3 | ✓2 | ✓6 |
| Precognición | ✓1 | ✓ estándar | ✓ 1 | – | ✓ 10·niv | ✓ 1·niv | ✓ propio+área | – | ✓ tirada | – | – | – | ✓4 | – | – | ✓1 | – | – | – | – | ✓2 | ✓7 |
| Retrocognición | ✓1 | ✓ compleja | ✓ 1 | – | – | ✗ (¿instantánea?) | ✓ casilla+área | – | ✓ tirada | – | – | ✓1 | ✓4 | – | – | ✓2 | – | – | – | ✓2 | – | ✓5 |
| Anclaje | ✓1 | ✓ estándar | ✓ tabla | – | ✓ tabla | ✓ 1·niv | ✓ unico | – | ✓ enfrentada | – | ✓2 | ✓3 | ~2 | – | ✓ | ✓1 | – | – | – | – | ✓3 | ✓4 |
| ↳ Duelo de Métrica (`accionesHermanas`) | ✓1 | ✓ reacción | ✓ 1 | – | – | – | ✓ propio | – | ✓ enfrentada | – | ✓1 | ✓1 | ~2 | – | – | ✓1 | – | – | – | – | – | ✓2 |
| Trasladar | ✓1 | ✓ simple | ✓ tabla | – | ✓ tabla | – | ✓ unico | ✓ 10·niv | ✓ sin dado | – | – | ✓3 | ~1 (sin dado) | – | – | ✓1 | – | – | – | – | – | ✓3 |
| ↳ Levitar (auto-traslación) (`accionesHermanas`) | ✓2 | ✓ simple | ✓ 1 | – | – | ~ «manual» | ✓ propio | ✓ 10·niv | ✓ sin dado | – | – | – | ~1 | – | – | ✓1 | – | – | ✓ | ✓2 | ✓2 | ✓2 |
| Proyección | ✓1 | ✓ simple | ✓ 1 | – | ✓ 20·niv | – | ✓ unico | ✓ 20·niv | ✓ ataque | – | ✓1 | ✓2 | ~2 | – | – | ✓4 | – | – | – | – | ✓2 | ✓3 |
| Proeza | ✓1 | ✓ compleja | ~ tabla + extra a mano | ✓ | ✓ tabla | – | ✓ unico | – | ✓ tirada | – | – | ✓3 | ~2 | – | – | ✓2 | – | – | – | – | ✓2 | ✓5 |
| Sensor | ✓1 | ✓ estándar | ✓ 1 | – | ~ 2·niv (¿m o casillas?) | ✓ 1·niv | ✓ propio+área | – | ✓ sin dado | – | – | ✓1 | ~1 | – | – | ✓1 | – | – | – | – | ✓1 | ✓3 |
| Contención | ✓1 | ✓ tabla | ✓ tabla | – | – | ~ «manual» | ✓ propio | – | ✓ sin dado | – | – | ✓2 | ~1 | – | – | ✓1 | – | – | – | ✓14 | ✓6 | ✓11 |
| Impulso | ✓1 | ✓ estándar | ✓ tabla | – | ✓ tabla | – | ✓ unico | ✓ tabla | ✓ ataque | – | – | ✓2 | ~2 | – | – | ✓1 | – | – | – | – | – | ✓5 |
| Expansión | ✓1 | ✓ estándar | ✓ tabla | – | ✓ tabla | – | ✓ casilla+área | – | ✓ ataque | – | – | ✓2 | ~2 | – | – | ✓1 | – | – | – | – | – | ✓4 |
| Convergencia | ✓1 | ✓ estándar | ✓ tabla | – | ✓ tabla | – | ✓ unico | – | ✓ ataque | – | – | ✓2 | ~2 | – | – | ✓4 | – | – | – | – | – | ✓5 |

Qué más falta, aparte de lo marcado:
- **Inducción e Hipercognición** no tienen tabla común `porNivel`. No es un hueco: su coste va por acción o por tramo.
- **Acciones hermanas** (Duelo de Métrica, Levitar) viven en `accionesHermanas`, un campo nuevo que no está en el modelo v2 (ver §3.2).
- **`motor`** de todas las acciones se ha regenerado a partir de sus efectos: una entrada por terna única (tipo, afecta, mecanismo, estado). La propuesta traía 12 acciones con `motor: []`.

---

## 3. Campos del modelo que leerá la tubería

### 3.1 `camposModelo` (ordenados por nº de items)

| Campo | Items | Qué hace la app con él |
|---|---|---|
| `economia / ejes.*.opciones.*.cambia.economia / disciplina.porNivel.*.economia / acciones.*.economia` | 17 | Se resuelve en orden base/tabla -> opción elegida -> modificadoresEconomia/ajustesPorNivelPoseido (C4) y se pinta como etiqueta en el modal; la app no gestiona las acciones por turno, solo informa. |
| `ejes.* / ejes.*.opciones.*.cambia (resolucion, resultados, notas, objetivoTira, danioPropio)` | 16 | Un selector por eje en el modal (C2); la opción elegida se fusiona sobre la AccionPoder antes de calcular tirada, coste y resultados; nivel_empleado se limita a 1..nivel poseído. |
| `alcance / disciplina.porNivel.*.alcance / disciplina.porNivel.*.carga / duracion / objetivo.area / desplazamiento` | 15 | Valor evaluado contra la ficha (nivel empleado o poseído, aplicado como Perspicacia en carga) y pintado como dato informativo en el modal; la app no mide distancias ni pesos. |
| `resolucion (tipo, aplicado, habilidad[], dificultad, modificador) / porObjetivo.sintetico.resolucion` | 15 | Construye la Accion del motor (C1): aplicado + habilidad (selector si es array, preseleccionando la más alta), dificultad fija o referencias ajusteMaster, modificador propio como ajuste fijo; porObjetivo es un toggle orgánico/sintético que cambia la resolución; sin_dado va a AccionDirecta. |
| `fatiga / disciplina.porNivel.*.fatiga / ejes.*.opciones.*.cambia.fatiga / ejes.*.opciones.*.fatiga` | 14 | Coste base que fija el selector de nivel empleado o la opción del eje, antes de la cadena de ModificadorFatiga (C3); el coste final se muestra antes de confirmar y se descuenta de fatigaActual al confirmar. |
| `notas.*` | 14 | lugar 'tirada' se pinta en el modal antes de tirar, lugar 'danio' junto al daño del resultado (mismo canal que CondicionTirada.nota / Accion.efectos). |
| `disciplina.modificadoresEconomia.* / ajustesPorNivelPoseido.*` | 9 | Se aplican antes de abrir el modal (C4) contra el nivel POSEÍDO: baja_un_paso recorre la escalera de economía; sustituye/suma/multiplica cambia duración, área o economía de la acción o de la opción. |
| `objetivo / objetivoTira.* (que, dificultad, grados)` | 8 | Solo texto tras tirar: qué tira el objetivo, con la dificultad calculada desde la ficha propia (Valor) y sus cuatro grados; no se resuelve nada del objetivo. |
| `disciplina.requisito / disciplina.rama / desdeNivel / ejes.*.opciones.*.desdeNivel` | 7 | Gatea la generación (C1): sin la disciplina requisito al nivel pedido no se genera la acción; desdeNivel (POSEÍDO) filtra acciones y opciones; rama agrupa en el subgrupo Psiónica y es el alcance de los ModificadorFatiga externos. |
| `disciplina.reglas.*` | 6 | Texto de reglas colgado como nota en las acciones de 'aplica'; no se calcula nada. |
| `disciplina.modificadoresFatiga.*` | 5 | Entra en la cadena semi-global (C3) filtrado por alcance (rama/disciplina/acción/opción/nivel empleado) y desdeNivelPoseido; los que llevan condicion.toggle aparecen como toggle en el modal. |
| `resultados.*.texto / resultados.*.estados / resultados.*.danio` | 5 | Tras la tirada se muestra el grado obtenido con su texto, estados y duración calculada (C8); daño sobre 'propio' se resta de la vida (C7); en combate los estados pueden volcarse como EstadoActivo. |
| `resolucion.danio / ejes.*.opciones.poderoso.resolucion.danio` | 4 | Valor evaluado con el nivel empleado -> daño base de resolverDanio con la categoría (C1b); la opción Poderoso lo sustituye. |
| `multiplesObjetivos (texto, fatigaPorObjetivo)` | 3 | Mensaje en el modal con el coste por objetivo; el jugador se descuenta la fatiga a mano (C15). |
| `bonosEnOtrasTiradas.* / disciplina.bonosEnOtrasTiradas.* / togglesPropios` | 3 | BonoToggle como CondicionTirada con alcance (id de acción, grupo Salvaciones o 'alerta') que aparece en esas otras tiradas; si depende de un efecto activo, solo mientras dure (C9). |
| `sobrecarga.* (umbral, inconsciencia, salvacion.dificultad, multiplicadorPorGrado)` | 3 | Tras el gasto de C3, si se pasa de exhausto: estado inconsciente al terminar, salvación de Fortaleza 5 + nivel empleado lanzada por la app y daño letal no absorbible × multiplicador del grado (C5). |
| `danioPropio` | 2 | Se resta de vidaActual al confirmar la acción (C7), con la categoría indicada. |
| `disciplina.ventajas.*` | 2 | Desde el nivel poseído, las acciones listadas (incluidas las fijas como alerta_activa) se resuelven con 2d12 y se quedan el mejor (C11). |
| `accionesHermanas.psi_traslacion_levitar.* (desdeNivel, fatiga, economia, movimientoOtorgado.velocidad, ajustesPorNivelPoseido)` | 2 | Genera una segunda fila propia (C16) con su coste y la velocidad de levitación como movimiento otorgado mientras está activa. |
| `permiteFatigaTemporal` | 1 | Permite confirmar con coste > fatiga actual, anota la deuda temporal y la devuelve al cerrar la escena (C14). |
| `label` | 1 | Etiqueta de la fila y del modal. |

### 3.2 `camposNuevos` propuestos

| Campo | Forma | Motivo | Claims |
|---|---|---|---|
| `Opcion.multiplicaTiempo` | `multiplicaTiempo?: number  // ×2, ×10 sobre el tiempo de la fila usada` | Economia {tiempo} es un string y no se puede multiplicar; Rastreo multiplica la duración según lo conocido que sea el objetivo. | resonancia.rastreo#6, resonancia.rastreo#9 |
| `Escalera de economía con tiempos` | `ESCALERA_ECONOMIA = [{tiempo:'1 hora'},{tiempo:'10 minutos'},{tiempo:'1 minuto'},'compleja','estandar','simple'] (y tiempo como {cantidad, unidad} en vez de string)` | baja_un_paso tiene que saber bajar desde horas/minutos hasta tipos de acción; sirve también para multiplicaTiempo. | hipercongnicion.sondeo_no_local#16, hipercongnicion.retrocognicion#16 |
| `multiplesObjetivos.desdeNivelPoseido / multiplesObjetivos.economia / multiplesObjetivos.gratisHasta` | `multiplesObjetivos: { texto; fatigaPorObjetivo: Valor; desdeNivelPoseido?: number; economia?: Economia; gratisHasta?: Valor } \| null` | Comando (nv3) y Modulación (nv4) desbloquean varios objetivos por nivel poseído, Modulación vuelve a compleja con varios y Cautiverio da objetivos gratis hasta el nivel de poder; Opcion.cambia no incluye multiplesObjetivos. | induccion.comando#20, induccion.modulacion#75 |
| `Resultado.salvacionPropia` | `salvacionPropia?: { aplicado: AplicadoId; dificultad: Valor \| 'la_de_la_prueba'; estado: string; duracion?: Valor }` | La salvación sale de la ficha de quien usa el poder, así que la app puede lanzarla como la de la sobrecarga. | hipercongnicion.sondeo_no_local#22, hipercongnicion.sondeo_no_local#24, hipercongnicion.precognicion#25, hipercongnicion.retrocognicion#20 |
| `Valor.porFatigaPagada` | `{ base: number; porFatigaPagada?: number }  // × fatiga realmente pagada tras la cadena de ModificadorFatiga` | El daño mental del fracaso crítico de Sondeo depende de la fatiga final pagada, no de la base. | hipercongnicion.sondeo_no_local#23 |
| `Valor.unidad` | `unidad?: 'm' \| 'km2' \| 'kg' \| 'turnos' \| 'minutos' \| 'horas'` | El Valor numérico no dice en qué se mide y el modal tiene que mostrar '10 m × nivel' o 'nivel turnos'. | hipercongnicion.precognicion#6, hipercongnicion.precognicion#7, hipercongnicion.retrocognicion#3 |
| `accionesHermanas` | `accionesHermanas?: AccionPoder[]  // acciones propias que nacen de un item (Duelo de Métrica, Levitar)` | Un item genera una segunda acción con desdeNivel, coste y movimientoOtorgado propios que no caben en Opcion.cambia. | traslacion.anclaje#11, traslacion.trasladar#10 |
| `Valor.porContador` | `{ base: number; porContador?: { contador: string; valor: number } }  // +valor por unidad de un contador que declara el jugador` | +1 daño por cada 200 kg adicionales (y el mismo patrón vale para +1 fatiga por cada 10% de sobrepeso en Proeza). | traslacion.proyeccion#8 |
| `Opcion.cambia.desplazamiento + Valor.porNivelPoseido` | `Opcion.cambia incluye 'desplazamiento'; Valor: { base; porNivel?: number /* empleado */; porNivelPoseido?: number }` | Impulso Poderoso cambia los metros desplazados y '8 × nivel de poder' a secas es nivel POSEÍDO por convención, que porNivel no distingue del empleado. | singularidad.impulso#18 |

Además, al aplicar las correcciones han salido tres extensiones que no están en el modelo v2:
- `modificadoresEconomia[].minimo: Economia`: suelo de `baja_un_paso` (corrección de Retrocognición).
- `Opcion.cambia` con `desplazamiento` y `objetivo` en el Pick (Singularidad por nivel empleado). Es la misma idea que el campo nuevo de Impulso Poderoso.
- **Fusión parcial de `cambia.resolucion`**: la opción sobrescribe campo a campo (Rastreo y Singularidad solo cambian la dificultad o el daño).
- `accionesHermanas` sigue siendo campo nuevo; el catálogo lo usa tal cual.

---

## 4. Capas de motor (por nº de items que desbloquean)

| Capa | Amplía a | Items | Efectos | Depende de |
|---|---|---|---|---|
| **C1_generador_accion_poder**: Generador de acciones de poder (AccionPoder -> fila de Acciones) | REGISTRO_DE_ATAQUE / generaAccionPropia (combate.ts) + fuentesDeCapa1 (capa1.ts) + Accion y AccionDirecta (acciones.ts): el hueco 'mecanismo tipo 1 para no-equipo' que motor.md ya marca como pendiente | 18 | 55 | — |
| **C2_nivel_empleado_ejes_valor**: Selector de nivel empleado, ejes de opción y evaluador de Valor | CondicionTirada tipo 'opcion' (condiciones.ts), ampliada para que una opción cambie campos no numéricos de la acción y no solo sume un valor | 17 | 105 | C1_generador_accion_poder |
| **C4_ajustes_nivel_poseido_economia**: Ajustes por nivel poseído y escalera de economía/tiempo | nuevo (Accion no tiene hoy campo de economía; se engancha al paso de C2 que resuelve la fila antes del modal) | 12 | 34 | C1_generador_accion_poder, C2_nivel_empleado_ejes_valor |
| **C8_resultados_por_grado_estados**: Resultados por grado con estados y duraciones calculados | EstadoActivo + descontarDuracion (estados.ts) y Accion.efectoCritico / efectos (acciones.ts) | 9 | 105 | C1_generador_accion_poder, C2_nivel_empleado_ejes_valor |
| **C3_cadena_fatiga**: Gasto de fatiga al confirmar con la cadena semi-global de ModificadorFatiga | ajustarFatiga (vitalidad.ts) + gastoTotal / gastoActivo de CondicionTirada (acciones.ts, condiciones.ts), llevado de recursos de instancia a fatiga de personaje | 9 | 15 | C1_generador_accion_poder, C2_nivel_empleado_ejes_valor |
| **C1b_ataque_psionico**: Ataque psiónico con daño y desplazamiento calculados | Accion.ataque + resolverDanio (acciones.ts); desplazamiento sigue el patrón de Accion.vuelo / resolverVuelo | 5 | 26 | C1_generador_accion_poder, C2_nivel_empleado_ejes_valor |
| **C15_multiples_objetivos**: Múltiples objetivos gateados por nivel poseído | CondicionTirada tipo 'contador' (condiciones.ts) si se automatiza el coste; si no, nota en el modal | 4 | 12 | C1_generador_accion_poder, C4_ajustes_nivel_poseido_economia |
| **C6_salvacion_propia_disparada**: Salvación propia encadenada a un grado o a un evento | ACCIONES salv_* + resolverTirada (acciones.ts): reutiliza la tirada fija, lo nuevo es encadenarla automáticamente con la dificultad precalculada | 4 | 9 | C1_generador_accion_poder |
| **C13_mantenimiento_recurrente**: Mantenimiento de un efecto con coste recurrente (acción o fatiga por turno/hora) | descontarDuracion (estados.ts) + gasto de C3 al avanzar turno | 4 | 6 | C3_cadena_fatiga, C9_efecto_activo_propio |
| **C7_danio_propio**: Daño propio al confirmar o por grado | ajustarVida (vitalidad.ts) | 4 | 5 | C1_generador_accion_poder, C3_cadena_fatiga |
| **C5_sobrecarga**: Sobrecarga: cruzar exhausto con un gasto de fatiga | umbralFatiga / modificadoresDeUmbrales (estados.ts) + ajustarFatiga y ajustarVida (vitalidad.ts) | 3 | 18 | C3_cadena_fatiga, C6_salvacion_propia_disparada |
| **C16_acciones_hermanas**: Acciones hermanas derivadas de un item (Duelo de Métrica, Levitar) | C1 (generador) + Accion.vuelo / accionesDeMovimiento (movimiento.ts) para movimientoOtorgado | 3 | 6 | C1_generador_accion_poder, C9_efecto_activo_propio |
| **C9_efecto_activo_propio**: Efecto activo propio con duración que modifica las acciones del portador | EstadoActivo + modificadoresDeEstados (estados.ts) y Modificador tipo 'tirada' con AlcanceModificador (modificadores.ts), llevados de Combatiente a la ficha | 3 | 5 | C1_generador_accion_poder, C8_resultados_por_grado_estados |
| **C10_modificador_temporal_atributo**: Modificador temporal a un atributo básico propagado a derivados | Modificador tipo atributo + bonoAtributo (modificadores.ts) y derivados.ts | 2 | 10 | C9_efecto_activo_propio |
| **C11_ventaja_2d12**: Tirada con ventaja (2d12, se queda el mejor) | resolverTirada / tirarD12 (acciones.ts), activado por AlcanceModificador (tiradaId o grupo) | 2 | 2 | C1_generador_accion_poder |
| **C12_reacciones_por_turno**: Reacciones por turno como recurso de combate | nuevo (Combatiente de la consola de combate no tiene economía de acciones por turno) | 1 | 2 | C9_efecto_activo_propio |
| **C14_fatiga_temporal**: Fatiga temporal por escena (Proeza) | fatigaActual (vitalidad.ts), con un concepto nuevo de cierre de escena | 1 | 1 | C3_cadena_fatiga, C5_sobrecarga |

Orden de construcción según las dependencias: **C1 → C2 → (C1b, C3, C4, C6, C8, C11) → (C5, C7, C9, C15) → (C10, C12, C13, C14, C16)**.

---

## 5. Por disciplina y acción

La terna de motor se escribe `tipo · modo:id · mecanismo · estado`. Los claims con la misma terna y el mismo destino van en una fila. **(corr.)** marca los que se corrigieron en la verificación, y **[CN]** los que tienen `campoNuevo`.

### 5.1 Resonancia (metasensoria)

**Tabla común (N empleado):**

| N | fatiga | economia | alcance |
|---|---|---|---|
| 1 | 1 | compleja | 10 |
| 2 | 2 | 1 minuto | 100 |
| 3 | 3 | 1 minuto | 2000 |
| 4 | 4 | 10 minutos | 10000 |
| 5 | 6 | 10 minutos | 200000 |
| 6 | 8 | 1 hora | 1000000 |

**Reglas:**
- `unidades_alcance` (todas): Alcance de la tabla en km² (radio). Alcance local = 1 km².
- `tabla_sustituye` (todas): El coste propio de cada acción es el uso local (cuenta como nivel empleado 1). Si se elige una fila de la tabla, esa fila SUSTITUYE tipo de acción, fatiga y alcance.
- `barreras` (todas): Barreras de lenguaje, conceptos abstractos, sesgos culturales o una gran diferencia biológica suben la dificultad (la dice el máster).
- `codigos_encriptados` (todas): Códigos encriptados suben la dificultad y pueden pedir varias acciones.
- `sintetico` (todas): Con conocimientos de Tecnociencia (Informática) se puede resonar con seres no orgánicos (puente bio-sintético).
- `local_induccion` (todas): En alcance local se puede usar Inducción (permiso extra).
- `interferencias` (todas): Zonas de interferencia suben la dificultad: apantallamiento electromagnético +2, instalación militar blindada / amortiguadores de decoherencia +4, búnker con supresión cuántica activa +6; algunos lugares son infranqueables.

**Ajustes por nivel poseído (disciplina):**
- Fatiga · resonancia_nv3: suma -1 desde nv3 · alcance {"disciplina":"resonancia","nivelEmpleadoMax":2}
- Fatiga · resonancia_nv5: suma -1 desde nv5 · alcance {"disciplina":"resonancia","nivelEmpleadoMin":3,"nivelEmpleadoMax":4}
- Fatiga · resonancia_nv6: suma -1 desde nv6 · alcance {"disciplina":"resonancia","nivelEmpleadoMin":4,"nivelEmpleadoMax":5}
- Fatiga · rastreo_indirecto: suma 1 · alcance {"accion":"psi_resonancia_rastreo","opcion":{"eje":"conocimiento","opcion":"indirecto"}}
- Fatiga · rastreo_desconocido: suma 4 · alcance {"accion":"psi_resonancia_rastreo","opcion":{"eje":"conocimiento","opcion":"desconocido"}}
- Economía · resonancia_nv2: baja_un_paso desde nv2 · alcance {"nivelEmpleado":1}
- Economía · resonancia_nv4_nivel2: sustituye → compleja desde nv4 · alcance {"nivelEmpleado":2}
- Economía · resonancia_nv4_vinculo: sustituye → estándar desde nv4 · alcance {"accion":"psi_resonancia_vinculo"}
- Economía · resonancia_nv6_nivel4: sustituye → 1 minuto desde nv6 · alcance {"nivelEmpleado":4}
- Bono · +2 por Resonancia 4: +2 en `alerta` desde nv4
- Ventaja 2d12 desde nv4 en alerta_activa, psi_resonancia_alerta

**MATRIZ poseído × N empleado (filas de la tabla: n1–n6). Fatiga efectiva / economía.** Aplica nv2 (N1 baja un paso), nv3 (−1 en N≤2), nv4 (N2 → compleja), nv5 (−1 en N3–4) y nv6 (−1 en N4–5, N4 → 1 min). Supuesto: los descuentos se acumulan y el mínimo es 0.

| Poseído \ N | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| 1 | 1 / compleja | | | | | |
| 2 | 1 / **estándar** | 2 / 1 min | | | | |
| 3 | **0** / estándar | **1** / 1 min | 3 / 1 min | | | |
| 4 | 0 / estándar | 1 / **compleja** | 3 / 1 min | 4 / 10 min | | |
| 5 | 0 / estándar | 1 / compleja | **2** / 1 min | **3** / 10 min | 6 / 10 min | |
| 6 | 0 / estándar | 1 / compleja | 2 / 1 min | **2** / **1 min** | **5** / 10 min | 8 / 1 h |

**Uso local (1 km², cuenta como N1):** usa el coste propio de la acción, al que se aplican nv2 y nv3. Desde nv3 existe la opción "local como reacción" en Sincronía, Rastreo y Leer Mente.

| Poseído | Leer Mente / Rastreo local (estándar, 1) | Sincronía simple | Sincronía compleja | Sincronía agresiva local |
|---|---|---|---|---|
| 1 | 1 / estándar | 0 / gratuita | 1 / estándar | 1 / compleja |
| 2 | 1 / simple | 0 / gratuita | 1 / simple | 1 / estándar |
| 3–6 | 0 / simple (o reacción) | 0 / gratuita | 0 / simple (o reacción) | 0 / estándar (o reacción) |

- **Rastreo:** a lo anterior (local o fila) se suman +1 (indirecto, tiempo ×2) o +4 (desconocido, tiempo ×10). Un P3 en local con objetivo desconocido paga 0 + 4 = 4.
- **Sincronía agresiva con fila n1–n6:** ¿paga la fila (n5 = 6, n6 = 8) o 1·N (5, 6)? Está preguntado. La matriz de arriba es la fila.

#### Sincronía: `psi_resonancia_sincronia`

- **Base:** desde nv1 · gratuita · fatiga 0 · alcance 1 · objetivo unico · sin dado
- **Sintético:** Expresion + Tecnociencia (Informática), dif Sencilla/Conceptos o emociones extraños/Paquete complejo y extraño (máster)
- **Eje `alcance`** (nivel_empleado): Local (1 km²): alc 1 · Local como reacción [nv3]: reacción, alc 1 · Nivel 1: tabla, fat tabla, alc tabla · Nivel 2 [nv2]: tabla, fat tabla, alc tabla · Nivel 3 [nv3]: tabla, fat tabla, alc tabla · Nivel 4 [nv4]: tabla, fat tabla, alc tabla · Nivel 5 [nv5]: tabla, fat tabla, alc tabla · Nivel 6 [nv6]: tabla, fat tabla, alc tabla
- **Eje `modo`** (opcion): Datos simples (conversación, imágenes en tiempo real): gratuita, fat 0 · Datos complejos: estándar, fat 1 · Mensaje agresivo (ataque mental): compleja, fat 1·niv, enfr. Expresion + Biociencia|Actitud, objetivo tira, resultados 4 grados, daño propio 1 mental
- **Eje `barrera`** (opcion): Sin barrera: sin cambios · Superar barrera: Expresion + Biociencia, dif Sencilla/Conceptos o emociones extraños/Paquete complejo y extraño (máster), resultados 2 grados

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1 | narrativo | — |
| #2, #3, #4, #5, #6, #7, #9, #10, #11, #12, #13, #14, #15, #16, #17 | parametro: `ejes.alcance.opciones`, `ejes.modo.opciones`, `ejes.alcance.opciones.n1.cambia`, `ejes.modo.opciones.simple.cambia.economia` +11 | accion · nueva:psi_resonancia_sincronia · accion_sin_equipo · bloqueado |
| #8, #18, #19 | parametro: `notas.0`, `notas.1` | texto · existente:psi_resonancia_sincronia · nota_fija · bloqueado |

#### Rastreo: `psi_resonancia_rastreo`

- **Base:** desde nv1 · tabla · fatiga tabla · alcance tabla · objetivo varios · Perspicacia + Biociencia
- **Sintético:** Perspicacia + Tecnociencia (Informática)
- **Eje `alcance`** (nivel_empleado): Local (1 km²): estándar, fat 1, alc 1 · Local como reacción [nv3]: reacción, fat 1, alc 1 · Nivel 1: tabla, fat tabla, alc tabla · Nivel 2 [nv2]: tabla, fat tabla, alc tabla · Nivel 3 [nv3]: tabla, fat tabla, alc tabla · Nivel 4 [nv4]: tabla, fat tabla, alc tabla · Nivel 5 [nv5]: tabla, fat tabla, alc tabla · Nivel 6 [nv6]: tabla, fat tabla, alc tabla
- **Eje `conocimiento`** (opcion): Familiar (conocido directamente): dif 6 · Vagamente conocido / indirecto: dif 9, nota · Desconocido (barrido): dif 12, nota

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1, #2, #3, #4, #5, #6 [CN], #8, #9 [CN] | parametro: `objetivo`, `porObjetivo.sintetico.resolucion`, `ejes.conocimiento.opciones`, `ejes.conocimiento.opciones.familiar.cambia.resolucion.dificultad` +2 | accion · nueva:psi_resonancia_rastreo · accion_sin_equipo · bloqueado |
| #7, #10 | parametro: `disciplina.modificadoresFatiga.3`, `disciplina.modificadoresFatiga.4` | numerico · existente:psi_resonancia_rastreo · hueco · bloqueado |
| #11 | narrativo | — |
| #12 | parametro: `disciplina.reglas.interferencias` | texto · existente:psi_resonancia_* · nota_fija · bloqueado |
| #13, #14, #15, #16 | parametro: `notas.0` | texto · existente:psi_resonancia_rastreo · nota_fija · bloqueado |

#### Leer Mente: `psi_resonancia_leer_mente`

- **Base:** desde nv1 · estándar · fatiga 1 · alcance 1 · objetivo unico · enfr. Perspicacia + Biociencia
- **Eje `alcance`** (nivel_empleado): Local (1 km²): alc 1 · Local como reacción [nv3]: reacción, alc 1 · Nivel 1: tabla, fat tabla, alc tabla · Nivel 2 [nv2]: tabla, fat tabla, alc tabla · Nivel 3 [nv3]: tabla, fat tabla, alc tabla · Nivel 4 [nv4]: tabla, fat tabla, alc tabla · Nivel 5 [nv5]: tabla, fat tabla, alc tabla · Nivel 6 [nv6]: tabla, fat tabla, alc tabla
- **Manual:** Mantenimiento (reacción o acción simple por turno) y duración de la lectura · +2 en tiradas enfrentadas contra el objetivo mientras dure · +2 en empatía/manipulación/negociación contra él, o resolverlo narrativamente

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1, #2, #3, #4, #8, #9, #10 | parametro: `objetivo`, `economia`, `resolucion`, `resultados.exito.texto` +3 | accion · nueva:psi_resonancia_leer_mente · accion_sin_equipo · bloqueado |
| #5 | manual: `manual.0` | texto · existente:psi_resonancia_leer_mente · nota_fija · ad_hoc |
| #6 | resultado_texto: `resultados.exito.texto` | accion · nueva:psi_resonancia_leer_mente · accion_sin_equipo · bloqueado |
| #7, #12 | manual: `manual.1`, `manual.2` | numerico · existente:social · eleccion_jugador · ad_hoc |
| #11 | resultado_texto: `objetivoTira.0.grados.critico` | texto · tercero:prueba_libre_detectar_lectura · nota_fija · bloqueado |
| #13 | narrativo | — |

#### Alerta psiónica: `psi_resonancia_alerta`

- **Base:** desde nv1 · gratuita · fatiga 0 · alcance 20·niv · Perspicacia + Biociencia|Tecnociencia, dif 6
- **Eje `forma`** (opcion): Pasiva (20 m × nivel): sin cambios · Activa (local, hasta 1 km²): estándar, fat 1, alc 1, Perspicacia + Biociencia|Tecnociencia, dif Dentro del alcance pasivo/Fuera del alcance pasivo (máster)

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1, #2, #4, #8, #9 | parametro: `ejes.forma.opciones`, `alcance`, `resolucion`, `ejes.forma.opciones.activa.cambia` +1 | accion · nueva:psi_resonancia_alerta · accion_sin_equipo · bloqueado |
| #3 | parametro: `notas.0` | habilitador · existente:psi_resonancia_alerta · gate_instalacion · bloqueado (arb. blando) |
| #5 | resultado_texto: `objetivoTira.0` | texto · tercero:sigilo · nota_fija · bloqueado |
| #6 | resultado_texto: `resultados.exito.texto` | accion · nueva:psi_resonancia_alerta · accion_sin_equipo · bloqueado |
| #7 | resultado_texto: `resultados.exito.texto` | texto · existente:psi_resonancia_alerta · nota_fija · bloqueado |
| #10 | parametro: `disciplina.ventajas.0` | numerico · existente:alerta_activa · hueco · bloqueado |
| #11 (corr.) | pregunta | texto · existente:alerta_activa · nota_fija · bloqueado (arb. pendiente) |
| #12 | parametro: `notas.1` | texto · existente:psi_resonancia_alerta · nota_fija · bloqueado |

#### Vínculo: `psi_resonancia_vinculo`

- **Base:** desde nv1 · compleja · fatiga 1 · alcance 1·niv · duración 1·niv · objetivo aliado · sin dado
- **Múltiples objetivos:** Tantos aliados como fatiga tengas: 1 de fatiga por aliado vinculado, descuéntatela a mano
- **Bonos en otras tiradas:** Vínculo +1 +1 en salv_voluntad
- **Manual:** Duración del vínculo activo

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1, #2, #7, #8 | parametro: `economia`, `fatiga`, `duracion`, `alcance` | accion · nueva:psi_resonancia_vinculo · accion_sin_equipo · bloqueado |
| #3 | narrativo | — |
| #4 | parametro: `bonosEnOtrasTiradas.0` | numerico · existente:salv_voluntad · eleccion_jugador · bloqueado |
| #5 | parametro: `notas.1` | texto · existente:psi_resonancia_alerta · nota_fija · bloqueado |
| #6 | parametro: `notas.2` | texto · tercero:defensa · nota_fija · bloqueado |

#### Comunes de Resonancia

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1, #2, #3, #4, #9, #12, #13 | narrativo | — |
| #5, #6, #11 | parametro: `disciplina.reglas.barreras`, `disciplina.reglas.codigos_encriptados` | texto · existente:psi_resonancia_* · nota_fija · bloqueado |
| #7, #10 | pregunta | — |
| #8 | parametro: `disciplina.reglas.sintetico` | habilitador · existente:psi_resonancia_* · gate_instalacion · bloqueado (arb. pendiente) |
| #14, #15, #16, #17, #19, #20, #21, #22, #23, #24, #25, #28, #29, #30, #31, #35, #36, #37, #39, #40, #41, #42 | parametro: `disciplina.porNivel.0.alcance`, `disciplina.porNivel.0.economia`, `disciplina.porNivel.0.fatiga`, `acciones.*.ejes.alcance.opciones.local.cambia.alcance` +18 | accion · existente:psi_resonancia_* · accion_sin_equipo · bloqueado |
| #18 | parametro: `disciplina.reglas.local_induccion` | habilitador · existente:psi_induccion_* · gate_instalacion · bloqueado (arb. pendiente) |
| #26, #38, #43 | parametro: `disciplina.modificadoresFatiga.0`, `disciplina.modificadoresFatiga.1`, `disciplina.modificadoresFatiga.2` | numerico · existente:psi_resonancia_* · hueco · bloqueado |
| #27 | parametro: `acciones.[sincronia,rastreo,leer_mente].ejes.alcance.opciones.local_reaccion` | accion · existente:psi_resonancia_sincronia · accion_sin_equipo · bloqueado |
| #32 | parametro: `disciplina.modificadoresEconomia.2` | accion · existente:psi_resonancia_vinculo · accion_sin_equipo · bloqueado |
| #33 | parametro: `disciplina.bonosEnOtrasTiradas.0` | numerico · existente:alerta_activa · eleccion_jugador · bloqueado |
| #34 | parametro: `disciplina.ventajas.0` | numerico · existente:alerta_activa · hueco · bloqueado |

### 5.2 Inducción (metasensoria, requiere Resonancia 1)

**Reglas:**
- `prueba_base` (todas): Prueba base: Expresión + Biociencia si el objetivo es un organismo vivo; Perspicacia + Tecnociencia (Informática) si es un sistema sintético.
- `resistencia_base` (todas): El objetivo resiste con Voluntad + Actitud (orgánico), Voluntad + Biociencia si es psiónico entrenado (Biociencia ≥ 1), o Perspicacia + Tecnociencia (Informática) si es sintético. Enfrentada: empate al defensor.
- `alcance` (todas): Alcance: 20 m por nivel en Inducción (poseído), sin fatiga adicional ni otras pruebas.
- `alcance_resonancia` (todas): Se puede combinar con el alcance local de Resonancia (permiso extra).
- `sugestion_remota` (psi_induccion_comando, psi_induccion_modulacion, psi_induccion_reconfiguracion_mnemonica): Desde nivel 5: las habilidades de sugestión pueden usarse a través de Resonancia fuera del alcance local con −4 a la prueba (toggle propio).

**MATRIZ poseído × lo que puede usar (Modulación, la única con eje de nivel empleado).** Fatiga = N empleado (1..poseído), sin descuentos de disciplina.

| Poseído | Economía | Fatiga (N elegible) | Estados disponibles | Varios objetivos |
|---|---|---|---|---|
| 1 | compleja | 1 | Sopor, Miedo, Hipomanía (+ aliado), Latencia, Cisma Lógico | — |
| 2 | **estándar** | 1–2 | ídem | — |
| 3 | estándar | 1–3 | + **Delirio, Manía** | — |
| 4 | estándar (compleja con varios) | 1–4 | ídem | **sí**: +1 fatiga por objetivo |
| 5 | ídem | 1–5 | + **Cautiverio** | +1 por objetivo · toggle −4 fuera de alcance local |
| 6 | ídem | 1–6 | ídem | hasta 6 objetivos **gratis**; +1 por cada uno que pase |

Resto de Inducción (coste fijo): Comando estándar/1 (reacción desde nv2; varios desde nv3, +1 por objetivo) · Supresión compleja/1, duración 10 turnos → 10 min × nivel (nv2) → 30 min × nivel (nv4) · Estabilización simple o reacción/1, 10 turnos → 10 min (nv2) → 30 min (nv4) · Reconfiguración compleja/2 desde nv3. En Comando, Modulación y Reconfiguración hay un toggle −4 fuera del alcance local desde nv5.

#### Comando: `psi_induccion_comando`

- **Base:** desde nv1 · estándar · fatiga 1 · alcance 20·niv · objetivo unico · enfr. Expresion + Biociencia
- **Sintético:** enfr. Perspicacia + Tecnociencia (Informática)
- **Eje `modo`** (opcion): Orden (acción estándar): sin cambios · Orden como reacción [nv2]: reacción, resultados 4 grados, nota
- **Ajustes por nivel poseído:** nv3 sustituye `multiplesObjetivos` → (mensaje)
- **Toggles propios:** Fuera del alcance local (vía Resonancia) -4 (nv5)

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1, #2, #3, #4 | parametro: `label`, `fatiga`, `economia`, `resolucion` | accion · nueva:psi_induccion_comando · accion_sin_equipo · bloqueado |
| #5, #6, #7, #8, #9, #10 | resultado_texto: `resultados.fracasoCritico`, `resultados.fracaso`, `resultados.exito`, `resultados.critico` | accion · nueva:psi_induccion_comando · accion_sin_equipo · bloqueado |
| #11, #12, #13 | resultado_texto: `objetivoTira.1`, `objetivoTira.1.grados.exito`, `objetivoTira.1.grados.critico` | texto · tercero:resistir_induccion · nota_fija · bloqueado |
| #14, #20 [CN], #22 | parametro: `ejes.modo.opciones.reaccion.cambia.economia`, `multiplesObjetivos`, `multiplesObjetivos.fatigaPorObjetivo` | accion · existente:psi_induccion_comando · accion_sin_equipo · bloqueado |
| #15, #21 | parametro: `ejes.modo.opciones.reaccion.cambia.notas`, `multiplesObjetivos.texto` | texto · existente:psi_induccion_comando · nota_fija · bloqueado |
| #16, #17, #18, #19 | resultado_texto: `ejes.modo.opciones.reaccion.cambia.resultados.fracaso`, `ejes.modo.opciones.reaccion.cambia.resultados.fracasoCritico`, `ejes.modo.opciones.reaccion.cambia.resultados.exito`, `ejes.modo.opciones.reaccion.cambia.resultados.critico` | accion · existente:psi_induccion_comando · accion_sin_equipo · bloqueado |

#### Modulación: `psi_induccion_modulacion`

- **Base:** desde nv1 · compleja · fatiga 1 · alcance 20·niv · objetivo unico · enfr. Expresion + Biociencia
- **Sintético:** enfr. Perspicacia + Tecnociencia (Informática)
- **Eje `nivel`** (nivel_empleado): Nivel 1: fat 1 · Nivel 2 [nv2]: fat 2 · Nivel 3 [nv3]: fat 3 · Nivel 4 [nv4]: fat 4 · Nivel 5 [nv5]: fat 5 · Nivel 6 [nv6]: fat 6
- **Eje `estado`** (opcion): Sopor (orgánico): resultados 4 grados · Miedo (orgánico): objetivo tira (dif 5 + 1·niv), resultados 4 grados, nota · Hipomanía (orgánico): objetivo tira, resultados 4 grados · Hipomanía sobre aliado dispuesto (sin tirada): sin dado, resultados 1 grados · Latencia (sintético): enfr. Perspicacia + Tecnociencia (Informática), objetivo tira, resultados 4 grados · Cisma Lógico (sintético): enfr. Perspicacia + Tecnociencia (Informática), objetivo tira (dif «6 + nivel empleado»), resultados 4 grados · Delirio (orgánico) [nv3]: resultados 4 grados · Manía (orgánico) [nv3]: resultados 4 grados · Cautiverio (orgánico) [nv5]: objetivo tira (dif 6 + 1·niv), resultados 4 grados
- **Ajustes por nivel poseído:** nv2 sustituye `economia` → estándar · nv4 sustituye `multiplesObjetivos` → (mensaje) · nv6 sustituye `multiplesObjetivos.texto` → Varios objetivos como parte de una acción compleja, mismo estado para todos. Hasta tantas víctimas como tu nivel en Inducción sin fatiga adicional; +1 de fatiga por cada objetivo que exceda ese límite (descuéntalo a mano).
- **Toggles propios:** Fuera del alcance local (vía Resonancia) -4 (nv5)

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1, #2, #6, #17, #25, #35, #46 | parametro: `economia`, `ejes.nivel.opciones.*.cambia.fatiga`, `ejes.estado.opciones.sopor.label`, `ejes.estado.opciones.miedo.cambia.notas` +3 | accion · nueva:psi_induccion_modulacion · accion_sin_equipo · bloqueado |
| #3, #5, #34 | narrativo | — |
| #4, #77 | parametro: `notas.0`, `multiplesObjetivos.texto` | texto · existente:psi_induccion_modulacion · nota_fija · bloqueado |
| #7, #8, #9, #10, #11, #12, #13, #14, #15, #16, #18, #19, #20, #21, #26, #27, #28, #29, #30, #31, #32, #36, #37, #38, #39, #40, #41, #42, #43, #44, #45, #47, #48, #49, #50, #51, #52, #53 | resultado_texto: `ejes.estado.opciones.sopor.cambia.resultados.fracasoCritico`, `ejes.estado.opciones.sopor.cambia.resultados.fracaso`, `ejes.estado.opciones.sopor.cambia.resultados.exito`, `ejes.estado.opciones.sopor.cambia.resultados.critico` +16 | accion · nueva:psi_induccion_modulacion · accion_sin_equipo · bloqueado |
| #22, #23, #24, #86 | resultado_texto: `ejes.estado.opciones.miedo.cambia.objetivoTira.1`, `ejes.estado.opciones.miedo.cambia.objetivoTira.1.grados.exito`, `ejes.estado.opciones.miedo.cambia.objetivoTira.1.grados.fracaso`, `ejes.estado.opciones.cautiverio.cambia.objetivoTira.1` | texto · tercero:salv_fortaleza · nota_fija · bloqueado |
| #33 | resultado_texto: `ejes.estado.opciones.hipomania.cambia.objetivoTira.0` | texto · tercero:resistir_induccion · nota_fija · bloqueado |
| #54, #55 | resultado_texto: `ejes.estado.opciones.cisma_logico.cambia.objetivoTira.1`, `ejes.estado.opciones.cisma_logico.cambia.objetivoTira.1.grados.fracaso` | texto · tercero:autorreconocimiento_cisma · nota_fija · bloqueado |
| #56, #57, #58, #66, #75 [CN], #76, #78, #79, #88, #89 | parametro: `ajustesPorNivelPoseido.0`, `ejes.estado.opciones.delirio.desdeNivel`, `ejes.estado.opciones.delirio.label`, `ejes.estado.opciones.mania.label` +5 | accion · existente:psi_induccion_modulacion · accion_sin_equipo · bloqueado |
| #59, #60, #61, #62, #63, #64, #65, #67, #68, #69, #70, #71, #72, #73, #74, #80, #81, #82, #83, #84, #85, #87 | resultado_texto: `ejes.estado.opciones.delirio.cambia.resultados.fracasoCritico`, `ejes.estado.opciones.delirio.cambia.resultados.fracaso`, `ejes.estado.opciones.delirio.cambia.resultados.exito`, `ejes.estado.opciones.delirio.cambia.resultados.critico` +10 | accion · existente:psi_induccion_modulacion · accion_sin_equipo · bloqueado |

#### Supresión: `psi_induccion_supresion`

- **Base:** desde nv1 · compleja · fatiga 1 · alcance 20·niv · duración 10 · objetivo unico · Expresion + Biociencia, dif 10
- **Sintético:** Perspicacia + Tecnociencia (Informática), dif 10
- **Eje `modo`** (opcion): Reducir penalizadores por estados: sin cambios · +2 a una salvación contra el empeoramiento de una afección o fallo técnico: dur —, objetivo tira, resultados 2 grados · Liberar de todos los penalizadores (un turno) [nv2]: dur 1, resultados 2 grados
- **Ajustes por nivel poseído:** nv2 sustituye `ejes.modo.opciones.mitigar.duracion` → 100·niv · nv4 sustituye `ejes.modo.opciones.mitigar.duracion` → 300·niv

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1, #2, #3, #4 | parametro: `fatiga`, `economia`, `porObjetivo.sintetico`, `resolucion.dificultad` | accion · nueva:psi_induccion_supresion · accion_sin_equipo · bloqueado |
| #5, #6 | resultado_texto: `resultados.exito`, `resultados.critico` | accion · nueva:psi_induccion_supresion · accion_sin_equipo · bloqueado |
| #7 | resultado_texto: `ejes.modo.opciones.salvacion.cambia.objetivoTira.0` | texto · tercero:Salvaciones · nota_fija · bloqueado |
| #8, #9, #12 | parametro: `ajustesPorNivelPoseido.0`, `ejes.modo.opciones.liberar`, `ajustesPorNivelPoseido.1` | accion · existente:psi_induccion_supresion · accion_sin_equipo · bloqueado |
| #10, #11 | resultado_texto: `ejes.modo.opciones.liberar.cambia.resultados.exito` | accion · existente:psi_induccion_supresion · accion_sin_equipo · bloqueado |

#### Estabilización: `psi_induccion_estabilizacion`

- **Base:** desde nv1 · simple · fatiga 1 · alcance — · duración 10 · objetivo propio · Expresion + Biociencia, dif 6
- **Eje `economia`** (opcion): Acción simple: sin cambios · Reacción: reacción
- **Eje `uso`** (opcion): Mitigar tus penalizadores de estado: sin cambios · Bonificador inmediato a una salvación: dur —, resultados 2 grados
- **Ajustes por nivel poseído:** nv2 sustituye `ejes.uso.opciones.mitigar.duracion` → 100 · nv4 sustituye `ejes.uso.opciones.mitigar.duracion` → 300 · nv6 sustituye `bonosEnOtrasTiradas.1.valor` → 4
- **Bonos en otras tiradas:** Estabilización (+2) +2 en Salvaciones · Estabilización como reacción (sustituye al +2, no se suman) +3 en Salvaciones (nv4)
- **Manual:** Reducción de tus propios penalizadores de estado durante la duración (efecto activo sobre uno mismo). · Desde nivel 4: omite por completo tus penalizadores de daño y fatiga durante la misma duración. · Desde nivel 6: elimina por completo tus penalizadores de estado presentes durante la duración; no afecta a los adquiridos después.

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1, #2, #3 | parametro: `ejes.economia`, `objetivo`, `resolucion.dificultad` | accion · nueva:psi_induccion_estabilizacion · accion_sin_equipo · bloqueado |
| #4, #8, #10, #11 | manual: `manual.0`, `manual.1`, `manual.2` | numerico · existente:todas · hueco · ad_hoc |
| #5, #9, #12 | parametro: `bonosEnOtrasTiradas.0`, `bonosEnOtrasTiradas.1`, `bonosEnOtrasTiradas.2` | numerico · existente:Salvaciones · eleccion_jugador · bloqueado |
| #6, #7 | parametro: `ajustesPorNivelPoseido.0`, `ajustesPorNivelPoseido.1` | accion · existente:psi_induccion_estabilizacion · accion_sin_equipo · bloqueado |

#### Reconfiguración Mnemónica: `psi_induccion_reconfiguracion_mnemonica`

- **Base:** desde nv3 · compleja · fatiga 2 · alcance 20·niv · objetivo unico · enfr. Expresion + Biociencia
- **Sintético:** enfr. Perspicacia + Tecnociencia (Informática)
- **Toggles propios:** Fuera del alcance local (vía Resonancia) -4 (nv5)
- **Manual:** Cambios profundos: acción mantenida con concentración (incluso horas), fuera del motor.

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1, #2, #3 | parametro: `desdeNivel`, `economia`, `fatiga` | accion · nueva:psi_induccion_reconfiguracion_mnemonica · accion_sin_equipo · bloqueado |
| #4, #5, #6, #7, #8 | resultado_texto: `resultados.fracasoCritico`, `resultados.fracaso`, `resultados.exito`, `resultados.critico` | accion · nueva:psi_induccion_reconfiguracion_mnemonica · accion_sin_equipo · bloqueado |

#### Comunes de Inducción

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1, #4 | parametro: `disciplina.rama`, `disciplina.requisito` | — |
| #2, #3, #5, #6 | narrativo | — |
| #7, #8, #12 (corr.) | parametro: `disciplina.reglas.prueba_base`, `disciplina.reglas.alcance` | accion · nueva:psi_induccion_* · accion_sin_equipo · bloqueado |
| #9, #10, #11 | resultado_texto: `disciplina.reglas.resistencia_base` | texto · tercero:resistir_induccion · nota_fija · bloqueado |
| #13 | parametro: `disciplina.reglas.alcance_resonancia` | texto · existente:psi_induccion_* · nota_fija · bloqueado |
| #14 | parametro: `disciplina.reglas.sugestion_remota` | numerico · existente:psi_induccion_* · eleccion_jugador · bloqueado |

### 5.3 Hipercongnición (metasensoria, requiere Resonancia 2)

**Reglas:**
- `tramos_fijan_coste` (psi_hipercongnicion_sondeo_no_local, psi_hipercongnicion_retrocognicion): Los tramos (distancia en Sondeo, tiempo transcurrido en Retrocognición) son una opción que fija tipo de acción, fatiga y dificultad de referencia; el nivel poseído solo rebaja tiempos y dificultad (usuario 2026-09-28).
- `dificultad_niveles_pares` (psi_hipercongnicion_sondeo_no_local, psi_hipercongnicion_retrocognicion): Niveles pares: −1 a la dificultad de todas las tiradas del poder. Murillo (2026-09-29): −1 en nv4 y −2 en nv6 (ver pregunta sobre nv2).
- `tiempo_niveles_impares` (psi_hipercongnicion_sondeo_no_local, psi_hipercongnicion_retrocognicion): Niveles 3 y 5: el tiempo de la prueba baja un peldaño (1 h → 10 min → 1 min → compleja → estándar). Murillo: el tramo local llega a simple en nv5.
- `interferencia` (psi_hipercongnicion_sondeo_no_local, psi_hipercongnicion_retrocognicion, psi_hipercongnicion_precognicion): La interferencia (+0/+2/+4/+6) la mete el máster en la dificultad que dicta; la app solo la muestra como referencia.
- `enganches_externos` (todas): Todas las acciones cuelgan del grupo Psiónica > metasensoria > hipercongnicion: ahí se enganchan Xovromium (+1 a la tirada; ignora_primero en fatiga), Munición Supresora (fatiga ×2, −2 a la tirada) y Derivación Psiónica (paga_con_recurso; +1 a resistir metasensoria).

**Ajustes por nivel poseído (disciplina):**
- Economía · Hipercongnición nv3: baja_un_paso desde nv3 · alcance {"accion":"psi_hipercongnicion_sondeo_no_local"}
- Economía · Hipercongnición nv5: baja_un_paso desde nv5 · alcance {"accion":"psi_hipercongnicion_sondeo_no_local"}
- Economía · Hipercongnición nv3: baja_un_paso desde nv3 · alcance {"accion":"psi_hipercongnicion_retrocognicion"} · mínimo estándar
- Economía · Hipercongnición nv5: baja_un_paso desde nv5 · alcance {"accion":"psi_hipercongnicion_retrocognicion"} · mínimo estándar

**MATRIZ poseído × tramo (sin eje de nivel empleado; el poseído rebaja tiempo y dificultad).** nv3 y nv5: un peldaño menos de tiempo. nv4: −1 a la dificultad; nv6: −2.

| Sondeo: tramo | Fatiga | nv1–2 | nv3 | nv4 | nv5 | nv6 |
|---|---|---|---|---|---|---|
| Local | 1 | compleja · 6–7 | estándar · 6–7 | estándar · 5–6 | **simple** · 5–6 | simple · 4–5 |
| 1/4 | 1 | 1 min · 8–9 | compleja · 8–9 | compleja · 7–8 | estándar · 7–8 | estándar · 6–7 |
| 2/4 | 2 | 10 min · 10–11 | 1 min · 10–11 | 1 min · 9–10 | compleja · 9–10 | compleja · 8–9 |
| Máximo | 4 | 1 h · 12+ | 10 min · 12+ | 10 min · 11+ | 1 min · 11+ | 1 min · 10+ |

| Retrocognición: tiempo | Fatiga | nv1–2 | nv3 | nv4 | nv5 (mínimo estándar) | nv6 |
|---|---|---|---|---|---|---|
| < 1 hora | 1 | compleja · 6–8 | estándar · 6–8 | estándar · 5–7 | estándar · 5–7 | estándar · 4–6 |
| 24 horas | 1 | 1 min · 9–11 | compleja · 9–11 | compleja · 8–10 | estándar · 8–10 | estándar · 7–9 |
| 1 semana | 2 | 10 min · 12–14 | 1 min · 12–14 | 1 min · 11–13 | compleja · 11–13 | compleja · 10–12 |
| > 1 semana | 4 | 1 h · 15+ | 10 min · 15+ | 10 min · 14+ | 1 min · 14+ | 1 min · 13+ |

Precognición no tiene tramos: estándar, 1 de fatiga, dificultad 8, burbuja de 10 m × nivel y nivel turnos.

#### Sondeo No-Local: `psi_hipercongnicion_sondeo_no_local`

- **Base:** desde nv1 · compleja · fatiga 1 · alcance «Alcance local de Resonancia» · duración 1·niv · objetivo casilla · Perspicacia + Tecnociencia (Física), dif 6/7 (máster)
- **Eje `tramo`** (opcion): Alcance local de Resonancia: compleja, fat 1, alc «Alcance local de Resonancia», Perspicacia + Tecnociencia (Física), dif 6/7 (máster) · 1/4 del alcance de Resonancia: 1 minuto, fat 1, alc «1/4 del alcance máximo de Resonancia (nivel poseído en Resonancia)», Perspicacia + Tecnociencia (Física), dif 8/9 (máster) · 2/4 del alcance de Resonancia: 10 minutos, fat 2, alc «2/4 del alcance máximo de Resonancia (nivel poseído en Resonancia)», Perspicacia + Tecnociencia (Física), dif 10/11 (máster) · Alcance máximo de Resonancia: 1 hora, fat 4, alc «Alcance máximo de Resonancia (nivel poseído en Resonancia)», Perspicacia + Tecnociencia (Física), dif 12+ (máster)
- **Ajustes por nivel poseído:** nv4 suma `resolucion.dificultad` → -1 · nv6 suma `resolucion.dificultad` → -1 · nv3 sustituye `duracion` → «1 minuto una vez conseguida la prueba (choca con la errata de Murillo, ver preguntas)»
- **Manual:** Concentración y mantenimiento de la visión (misma fatiga por turno, sin nueva tirada) · Prolongar el éxito crítico gastando fatiga

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1 | narrativo | — |
| #2, #4, #6, #7, #8, #9, #10, #20, #23 [CN] | parametro: `ejes.tramo.opciones.*.fatiga`, `resolucion`, `ejes.tramo`, `ejes.tramo.opciones.0` +5 | accion · nueva:psi_hipercongnicion_sondeo_no_local · accion_sin_equipo · bloqueado |
| #3, #5 | manual: `notas.1` | texto · existente:psi_hipercongnicion_sondeo_no_local · nota_fija · ad_hoc |
| #11, #12, #13, #14 | parametro: `notas.0` | texto · existente:psi_hipercongnicion_sondeo_no_local · nota_fija · bloqueado |
| #15 (corr.) | parametro: `ajustesPorNivelPoseido` | numerico · existente:psi_hipercongnicion_sondeo_no_local · ajuste_fijo · bloqueado |
| #16 [CN] | parametro: `disciplina.modificadoresEconomia` | accion · existente:psi_hipercongnicion_sondeo_no_local · accion_sin_equipo · bloqueado |
| #17 | pregunta: `ajustesPorNivelPoseido` | accion · existente:psi_hipercongnicion_sondeo_no_local · accion_sin_equipo · bloqueado |
| #18, #19, #21 | resultado_texto: `resultados.critico.texto`, `resultados.exito.texto` | accion · nueva:psi_hipercongnicion_sondeo_no_local · accion_sin_equipo · bloqueado |
| #22 [CN], #24 [CN] | resultado_texto: `resultados.fracaso.texto`, `resultados.fracasoCritico.texto` | texto · existente:salv_fortaleza · hueco · pendiente |

#### Precognición: `psi_hipercongnicion_precognicion`

- **Base:** desde nv1 · estándar · fatiga 1 · alcance 10·niv · duración 1·niv · objetivo propio (área 10·niv) · Perspicacia + Tecnociencia (Física), dif 8
- **Manual:** Bonos de la burbuja (+3/+2/+1 dentro/fuera), ignorar cobertura y segunda reacción mientras dure: efecto activo sobre uno mismo, a mano · Penalizadores del fracaso y fracaso crítico (−1/−2, sin reacción, media velocidad): a mano

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1 | narrativo | — |
| #2, #3, #4, #6 [CN], #7 [CN], #24 | parametro: `fatiga`, `economia`, `resolucion`, `objetivo.area` +2 | accion · nueva:psi_hipercongnicion_precognicion · accion_sin_equipo · bloqueado |
| #5 | parametro: `notas.0` | texto · existente:psi_hipercongnicion_precognicion · nota_fija · bloqueado |
| #8, #10, #14, #16, #18, #20 | manual: `resultados.critico.texto`, `resultados.exito.texto`, `resultados.fracaso.texto`, `resultados.fracasoCritico.texto` | numerico · existente:defensa · eleccion_jugador · ad_hoc |
| #9, #11, #15, #17, #19, #21 | manual: `resultados.critico.texto`, `resultados.exito.texto`, `resultados.fracaso.texto`, `resultados.fracasoCritico.texto` | numerico · existente:ataque_fuego_<instancia> · eleccion_jugador · ad_hoc |
| #12 | manual: `resultados.critico.texto` | texto · existente:ataque_fuego_<instancia> · nota_fija · ad_hoc |
| #13, #22 | manual: `resultados.critico.texto`, `resultados.fracasoCritico.texto` | texto · existente:defensa · hueco · ad_hoc |
| #23 | manual: `resultados.fracasoCritico.texto` | texto · ninguna:null · — · ad_hoc |
| #25 [CN] | resultado_texto: `resultados.fracasoCritico.texto` | texto · existente:salv_voluntad · hueco · pendiente |

#### Retrocognición: `psi_hipercongnicion_retrocognicion`

- **Base:** desde nv1 · compleja · fatiga 1 · alcance — · objetivo casilla (área 10·niv) · Perspicacia + Tecnociencia (Física), dif 6/7/8 (máster)
- **Eje `tiempo`** (opcion): Últimos minutos / menos de 1 hora: compleja, fat 1, Perspicacia + Tecnociencia (Física), dif 6/7/8 (máster) · Últimas 24 horas: 1 minuto, fat 1, Perspicacia + Tecnociencia (Física), dif 9/10/11 (máster) · Varios días (hasta 1 semana): 10 minutos, fat 2, Perspicacia + Tecnociencia (Física), dif 12/13/14 (máster) · Pasado extendido (más de una semana): 1 hora, fat 4, Perspicacia + Tecnociencia (Física), dif 15+ (máster)
- **Ajustes por nivel poseído:** nv4 suma `resolucion.dificultad` → -1 · nv6 suma `resolucion.dificultad` → -1

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1 | narrativo | — |
| #2, #3 [CN], #4, #5, #6, #7, #8, #9 | parametro: `resolucion`, `objetivo.area`, `notas.1`, `ejes.tiempo` +4 | accion · nueva:psi_hipercongnicion_retrocognicion · accion_sin_equipo · bloqueado |
| #10, #11, #12, #13, #14 | parametro: `notas.0` | texto · existente:psi_hipercongnicion_retrocognicion · nota_fija · bloqueado |
| #15 (corr.) | parametro: `ajustesPorNivelPoseido` | numerico · existente:psi_hipercongnicion_retrocognicion · ajuste_fijo · bloqueado |
| #16 [CN] | parametro: `disciplina.modificadoresEconomia` | accion · existente:psi_hipercongnicion_retrocognicion · accion_sin_equipo · bloqueado |
| #17, #18, #19, #21, #22 | resultado_texto: `resultados.critico.texto`, `resultados.exito.texto`, `resultados.fracaso.texto`, `resultados.fracasoCritico.texto` +1 | accion · nueva:psi_hipercongnicion_retrocognicion · accion_sin_equipo · bloqueado |
| #20 [CN] | resultado_texto: `resultados.fracaso.texto` | texto · existente:salv_voluntad · hueco · pendiente |

#### Comunes de Hipercongnición

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1, #4 | parametro: `disciplina.rama`, `disciplina.requisito` | — |
| #2, #3, #5, #6 | narrativo | — |

### 5.4 Traslación (metrica)

**Tabla común (N empleado):**

| N | fatiga | alcance | carga |
|---|---|---|---|
| 1 | 1 | 15 | 25·perspicacia |
| 2 | 2 | 30 | 50·perspicacia |
| 3 | 2 | 45 | 125·perspicacia |
| 4 | 3 | 60 | 250·perspicacia |
| 5 | 3 | 75 | 375·perspicacia |
| 6 | 4 | 90 | 500·perspicacia |

**Reglas:**
- `fatiga_metrica_general` (todas): Métrica: 1 punto de fatiga por nivel empleado. En Traslación solo se usa si la acción no fija su coste ni usa la tabla (hoy ninguna).
- `fatiga_por_carga_alcance` (psi_traslacion_anclaje, psi_traslacion_trasladar, psi_traslacion_proeza): La fatiga no depende del movimiento sino de la carga total o el alcance: se elige el nivel empleado cuya fila cubre la carga total (fila × Perspicacia aplicada) y el alcance, y se paga la fatiga de esa fila.
- `sobrecarga` (todas): Regla única de la psiónica (CatalogoPsionica.sobrecarga): cruzar exhausto con un gasto psiónico = inconsciente al terminar la acción + salvación de Fortaleza 5 + nivel empleado contra daño letal no absorbible = nivel empleado (×0/×0.5/×1/×2).
- `grupo_acciones` (todas): Las acciones cuelgan del grupo 'Psiónica' › 'Métrica' › 'Traslación': es el alcance al que se enganchan Xovromium (+1, ignora_primero), Munición Supresora (×2, −2) y Derivación Psiónica (paga_con_recurso).

**Ajustes por nivel poseído (disciplina):**
- Fatiga · traslacion nv3: multiplica 0 desde nv3 · alcance {"disciplina":"traslacion"} · toggle «carga < 10 kg»
- Fatiga · traslacion nv6: suma -1 desde nv6 · alcance {"disciplina":"traslacion"} · toggle «carga ≥ 10 kg y por debajo de la máxima del nivel»
- Fatiga · traslacion nv6: minimo 1 desde nv6 · alcance {"disciplina":"traslacion"} · toggle «carga ≥ 10 kg y por debajo de la máxima del nivel»
- Fatiga · duelo_metrica_superioridad: multiplica 0 · alcance {"accion":"psi_traslacion_duelo_metrica"} · toggle «soy 2 niveles superior»
- Economía · traslacion nv4: baja_un_paso desde nv4 · alcance {"accion":"psi_traslacion_anclaje"}

**MATRIZ poseído × N empleado (acciones "tabla": Anclaje, Trasladar, Proeza). Fatiga efectiva.** nv3: carga < 10 kg → 0. nv6: −1 (mínimo 1) si la carga es ≥ 10 kg y menor que la máxima. Los dos toggles se excluyen.

| Poseído \ N (alcance · carga × Perspicacia) | 1 (15 m · 25 kg) | 2 (30 · 50) | 3 (45 · 125) | 4 (60 · 250) | 5 (75 · 375) | 6 (90 · 500) |
|---|---|---|---|---|---|---|
| 1 | 1 | | | | | |
| 2 | 1 | 2 | | | | |
| 3–5 | 1 (0 si < 10 kg) | 2 (0) | 2 (0) | 3 (0) | 3 (0) | |
| 6 | **1** (0 si < 10 kg) | **1** (0) | **1** (0) | **2** (0) | **2** (0) | **3** (0) |

- **Economía de Anclaje:** estándar (varios a la vez: compleja; añadir uno: estándar) → desde nv4 **simple** (varios: estándar, según Murillo; añadir: ¿simple?, preguntado).
- **Por objetivo:** cada objetivo paga su fila (Anclaje varios). Proeza añade +1 por cada 10 % de exceso sobre la carga máxima, a mano, y permite fatiga temporal.
- **Coste propio, fuera de la tabla:** Proyección 1 (simple o reacción) · Sensor 1 (estándar; simple o reacción desde nv5) · Levitar 1/min (nv2; 10 min por punto en nv4, 1 h por punto en nv6) · Duelo de Métrica 1 (0 si eres 2 niveles superior).

#### Anclaje: `psi_traslacion_anclaje`

- **Base:** desde nv1 · estándar · fatiga tabla · alcance tabla · duración 1·niv · objetivo unico · enfr. Perspicacia + Tecnociencia (Física)
- **Eje `nivel`** (nivel_empleado): Nivel 1: sin cambios · Nivel 2 [nv2]: sin cambios · Nivel 3 [nv3]: sin cambios · Nivel 4 [nv4]: sin cambios · Nivel 5 [nv5]: sin cambios · Nivel 6 [nv6]: sin cambios
- **Eje `objetivos`** (opcion): Un objetivo: sin cambios · Varios objetivos este turno: compleja · Añadir un objetivo a los ya anclados: estándar
- **Eje `uso`** (opcion): Anclar: sin cambios · Oponerse al escape: gratuita, fat 0, objetivo tira, resultados 2 grados · Renovar al agotar la duración: estándar, sin dado, resultados 1 grados · Auto-anclaje: reacción, dur —, Reflejos + Tecnociencia (Física), dif 6, resultados 2 grados
- **Múltiples objetivos:** Cada objetivo paga su propia fatiga (la de la fila del nivel empleado). Todos deben estar dentro del alcance y la carga máxima del nivel, contada como carga total. Mantener a varios: acción estándar por turno.
- **Manual:** Mantener el anclaje: 1 acción simple por turno (un objetivo) o 1 acción estándar por turno (varios). · Concentración: −1 al resto de acciones mientras mantienes el anclaje. · Seguimiento de turnos restantes y de qué objetivos siguen anclados.
- **Acción hermana `psi_traslacion_duelo_metrica`** (Duelo de Métrica): desde nv1 · reacción · fatiga 1 · enfr. Perspicacia + Tecnociencia (Física)

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1 | narrativo | — |
| #2 | parametro: `economia` | accion · nueva:psi_traslacion_anclaje · accion_sin_equipo · bloqueado |
| #3, #4, #6, #7, #8, #10, #14, #15, #16, #18, #19, #20 | parametro: `resolucion`, `fatiga`, `resultados.exito.estados`, `ejes.uso.opciones.oponer_escape.cambia` +8 | accion · existente:psi_traslacion_anclaje · accion_sin_equipo · bloqueado |
| #5 | resultado_texto: `objetivoTira.0` | accion · existente:psi_traslacion_anclaje · accion_sin_equipo · bloqueado |
| #9, #17 | manual: `manual.0` | accion · existente:psi_traslacion_anclaje · hueco · ad_hoc |
| #11 [CN] | parametro | accion · nueva:psi_traslacion_duelo_metrica · accion_sin_equipo · bloqueado |
| #12 | parametro: `disciplina.modificadoresFatiga.3` | numerico · existente:psi_traslacion_duelo_metrica · hueco · pendiente |
| #13 | manual: `manual.1` | numerico · existente:todas_las_acciones · eleccion_jugador · ad_hoc |

#### Trasladar: `psi_traslacion_trasladar`

- **Base:** desde nv1 · simple · fatiga tabla · alcance tabla · objetivo unico · desplaza 10·niv · sin dado
- **Eje `nivel`** (nivel_empleado): Nivel 1: sin cambios · Nivel 2 [nv2]: sin cambios · Nivel 3 [nv3]: sin cambios · Nivel 4 [nv4]: sin cambios · Nivel 5 [nv5]: sin cambios · Nivel 6 [nv6]: sin cambios
- **Eje `objetivos`** (opcion): Un objetivo: sin cambios · Varios objetivos: estándar, nota
- **Eje `control`** (opcion): Trasladar: sin cambios · Repetir para seguir controlando: enfr. Perspicacia + Tecnociencia (Física), objetivo tira, resultados 2 grados
- **Acción hermana `psi_traslacion_levitar`** (Levitar (auto-traslación)): desde nv2 · simple · fatiga 1 · sin dado · movimiento levitar 10·niv m · nv4: «10 minutos por punto de fatiga», nv6: «1 hora por punto de fatiga»

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1 | parametro: `notas.0` | accion · nueva:psi_traslacion_trasladar · accion_sin_equipo · bloqueado |
| #2, #3, #4, #5, #7, #8 | parametro: `economia`, `ejes.objetivos.opciones.varios.cambia.economia`, `desplazamiento`, `ejes.objetivos.opciones.varios.cambia.notas` +2 | accion · existente:psi_traslacion_trasladar · accion_sin_equipo · bloqueado |
| #6, #9 | resultado_texto: `resultados.exito.texto` | accion · existente:psi_traslacion_trasladar · accion_sin_equipo · bloqueado |
| #10 [CN] | parametro | accion · nueva:psi_traslacion_levitar · accion_sin_equipo · bloqueado |
| #11, #13, #14, #15, #16 | parametro: `accionesHermanas.psi_traslacion_levitar.fatiga`, `accionesHermanas.psi_traslacion_levitar.movimientoOtorgado.velocidad`, `accionesHermanas.psi_traslacion_levitar.economia`, `accionesHermanas.psi_traslacion_levitar.ajustesPorNivelPoseido.0` +1 | accion · existente:psi_traslacion_levitar · accion_sin_equipo · bloqueado |
| #12 | manual: `accionesHermanas.psi_traslacion_levitar.manual.1` | numerico · existente:defensa · hueco · ad_hoc |

#### Proyección: `psi_traslacion_proyeccion`

- **Base:** desde nv1 · simple · fatiga 1 · alcance 20·niv · objetivo unico · desplaza 20·niv · ataque Reflejos + Tecnociencia (Física), -2, daño 4 + 1·niv letal
- **Eje `economia`** (opcion): Acción simple: sin cambios · Reacción: reacción
- **Eje `modo`** (opcion): Proyectar objetivo anclado: sin cambios · Auto-proyección (estándar, velocidad ×2): estándar, fat 1, alc —, sin dado, resultados 1 grados · Auto-proyección (compleja, velocidad ×4): compleja, fat 1, alc —, sin dado, resultados 1 grados
- **Manual:** Auto-proyección: +1 a esquiva hasta el inicio del siguiente turno (efecto activo sobre uno mismo). · +1 de daño por cada 200 kg extra, mientras Valor no admita un contador.

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1 | narrativo | — |
| #2 | parametro: `notas.0` | accion · nueva:psi_traslacion_proyeccion · accion_sin_equipo · bloqueado |
| #3, #4, #6, #7, #8 [CN], #9, #10, #11, #12, #13, #14 | parametro: `fatiga`, `ejes.economia`, `alcance`, `resolucion.danio` +5 | accion · existente:psi_traslacion_proyeccion · accion_sin_equipo · bloqueado |
| #5 | resultado_texto: `resultados.exito.texto` | accion · existente:psi_traslacion_proyeccion · accion_sin_equipo · bloqueado |
| #15 | manual: `manual.0` | numerico · existente:defensa · eleccion_jugador · ad_hoc |

#### Proeza: `psi_traslacion_proeza`

- **Base:** desde nv1 · compleja · fatiga tabla · alcance tabla · objetivo unico · Potencia + Atletismo, dif 10
- **Eje `nivel`** (nivel_empleado): Nivel 1: sin cambios · Nivel 2 [nv2]: sin cambios · Nivel 3 [nv3]: sin cambios · Nivel 4 [nv4]: sin cambios · Nivel 5 [nv5]: sin cambios · Nivel 6 [nv6]: sin cambios
- **Eje `maniobra`** (opcion): Anclar: resultados 2 grados · Trasladar a mitad de velocidad: resultados 2 grados
- **Eje `limite`** (opcion): Por debajo del 200%: sin cambios · Llega al 200% (límite): resultados 4 grados, daño propio 1 mental, nota
- **Manual:** Fatiga extra: +1 por cada 10% de exceso de carga (mínimo +1), a mano. · Cada turno que prolongues el control, vuelves a pagar la misma fatiga extra.

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1 | parametro: `objetivo` | accion · nueva:psi_traslacion_proeza · accion_sin_equipo · bloqueado |
| #2, #3, #6, #7 | parametro: `ejes.maniobra`, `economia`, `ejes.limite.opciones.limite_200.cambia.resultados`, `ejes.limite.opciones.limite_200.cambia.danioPropio` | accion · existente:psi_traslacion_proeza · accion_sin_equipo · bloqueado |
| #4 | manual: `notas.0` | accion · existente:psi_traslacion_proeza · accion_sin_equipo · ad_hoc |
| #5 | manual: `manual.1` | accion · existente:psi_traslacion_proeza · hueco · ad_hoc |
| #8 | parametro: `permiteFatigaTemporal` | accion · existente:psi_traslacion_proeza · hueco · pendiente |

#### Sensor: `psi_traslacion_sensor`

- **Base:** desde nv1 · estándar · fatiga 1 · alcance 2·niv · duración 1·niv · objetivo propio (área 2·niv) · sin dado
- **Eje `economia`** (opcion): Acción estándar: sin cambios · Acción simple [nv5]: simple · Reacción [nv5]: reacción
- **Manual:** Efecto activo mientras dura: percepción sin línea de visión, interacción con objetos ocultos y objetivos válidos para Traslación.

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1 | narrativo | — |
| #2 | parametro: `economia` | accion · nueva:psi_traslacion_sensor · accion_sin_equipo · bloqueado |
| #3, #4, #5 | parametro: `fatiga`, `duracion`, `alcance` | accion · existente:psi_traslacion_sensor · accion_sin_equipo · bloqueado |
| #6, #7, #9 | resultado_texto: `resultados.exito.texto` | accion · existente:psi_traslacion_sensor · accion_sin_equipo · bloqueado |
| #8 (corr.), #10 (corr.) | manual: `notas.0` | texto · existente:psi_traslacion_sensor · nota_fija · bloqueado |

#### Comunes de Traslación

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1, #2, #10, #11, #13, #14 | narrativo | — |
| #3, #12, #15, #16, #17, #18, #19, #20, #22, #23, #24, #26, #27, #28, #30, #31, #32, #34, #35, #36 | parametro: `disciplina.reglas.0`, `disciplina.reglas.1`, `disciplina.porNivel.0.alcance`, `disciplina.porNivel.0.carga` +16 | accion · existente:psi_traslacion_* · accion_sin_equipo · bloqueado |
| #4 | parametro: `sobrecarga.umbral` | texto · existente:psionica · hueco · pendiente |
| #5 (corr.), #6 (corr.), #7 (corr.), #8 (corr.), #9 (corr.) | parametro: `sobrecarga.salvacion`, `sobrecarga.multiplicadorPorGrado.critico`, `sobrecarga.multiplicadorPorGrado.exito`, `sobrecarga.multiplicadorPorGrado.fracaso` +1 | accion · existente:salv_fortaleza · accion_sin_equipo · bloqueado |
| #21 | parametro: `accionesHermanas.psi_traslacion_levitar.desdeNivel` | accion · existente:psi_traslacion_levitar · accion_sin_equipo · bloqueado |
| #25, #37 | parametro: `disciplina.modificadoresFatiga.0`, `disciplina.modificadoresFatiga.1` | numerico · existente:psi_traslacion_* · hueco · pendiente |
| #29 | parametro: `disciplina.modificadoresEconomia.0` | accion · existente:psi_traslacion_anclaje · accion_sin_equipo · bloqueado |
| #33 | parametro: `ejes.economia.opciones.simple.desdeNivel` | accion · existente:psi_traslacion_sensor · accion_sin_equipo · bloqueado |

### 5.5 Contención (metrica, requiere Traslacion 1)

**Tabla común (N empleado):**

| N | fatiga | economia |
|---|---|---|
| 1 | 1 | simple |
| 2 | 1 | simple |
| 3 | 2 | simple |
| 4 | 3 | simple |
| 5 | 3 | simple |
| 6 | 4 | simple |

**Reglas:**
- `metrica_fatiga_general` (todas): Métrica: 1 punto de fatiga por nivel de poder empleado, salvo que la disciplina fije su propia tabla (Contención la fija: porNivel sustituye).
- `no_apilan` (psi_contencion_contencion): Entre contenciones se usa la mejor, no se apilan (tampoco la ampliada con otras).
- `absorcion_cubre` (psi_contencion_contencion): La absorción de la contención cubre todo daño salvo el mental y no la reducen efectos antiblindaje. 'Quieto' sustituye la absorción, no suma.

**Ajustes por nivel poseído (disciplina):**
- Fatiga · contencion.ampliada: multiplica 2 · alcance {"disciplina":"contencion","accion":"psi_contencion_contencion","opcion":{"eje":"forma","opcion":"ampliada"}} · toggle «ampliada sin otros participantes (el foco con participantes paga la personal)»
- Fatiga · contencion.nv6_personal_n1_gratis: suma -1 desde nv6 · alcance {"disciplina":"contencion","accion":"psi_contencion_contencion","opcion":{"eje":"forma","opcion":"personal"},"nivelEmpleadoMax":1}

**MATRIZ poseído × N empleado: duración (turnos) · fatiga personal / ampliada (×2 sin participantes) · −Agilidad · absorción (quieto; contra el ataque)**

| Poseído \ N | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| 1 | 10 · 1/— · −1 · 1 (3; 6) | | | | | |
| 2 | 10 · 1/2 · −1 | 10 · 1/2 · −1 · 1 (3; 6) | | | | |
| 3 | **20** · 1/2 · −1 | 10 · 1/2 · −1 | 10 · 2/4 · −2 · 2 (5; 10) | | | |
| 4 | **30** · 1/2 · −1 | 10 · 1/2 · −1 | **20** · 2/4 · −2 | 10 · 3/6 · −2 · 3 (7; 14) | | |
| 5 | **40** · 1/2 · −1 | 10 · 1/2 · −1 | **30** · 2/4 · −2 | **20** · 3/6 · −2 | 10 · 3/6 · −3 · 4 (9; 18) | |
| 6 | personal: **1 h · 0** / ampliada: 40 · 2 · **sin −Agi** | 10 · 1/2 · −1 | **40** · 2/4 · **−1** | **30** · 3/6 · **−1** | **20** · 3/6 · **−2** | 10 · 4/8 · −3 · 5 (11; 22) |

- **Economía:** personal simple. Ampliada estándar desde nv2 (¿poseído o empleado? preguntado). Mantener la ampliada: acción simple por turno, reacción desde nv4.
- **Área de la ampliada (manual):** 1 casilla adyacente por nivel. nv4: N1 ×2 · nv5: N1 ×3, N3 ×2 · nv6: N3 ×3, N4 ×2.
- **N2** no aparece en la prosa; se le da la fila de N1 (fatiga 1). ¿Duración y absorción iguales a N1? Supuesto.

#### Contención: `psi_contencion_contencion`

- **Base:** desde nv1 · tabla · fatiga tabla · alcance — · duración «10 turnos (1 minuto)» · objetivo propio · sin dado
- **Eje `nivel`** (nivel_empleado): Nivel 1: resultados 1 grados · Nivel 2 [nv2]: resultados 1 grados · Nivel 3 [nv3]: resultados 1 grados · Nivel 4 [nv4]: resultados 1 grados · Nivel 5 [nv5]: resultados 1 grados · Nivel 6 [nv6]: resultados 1 grados
- **Eje `forma`** (opcion): Personal: sin cambios · Ampliada (colectiva) [nv2]: estándar, nota
- **Ajustes por nivel poseído:** nv3 sustituye `ejes.nivel.opciones.n1.duracion` → «20 turnos» · nv4 sustituye `ejes.nivel.opciones.n1.duracion` → «30 turnos» · nv4 sustituye `ejes.nivel.opciones.n3.duracion` → «20 turnos» · nv5 sustituye `ejes.nivel.opciones.n1.duracion` → «40 turnos» · nv5 sustituye `ejes.nivel.opciones.n3.duracion` → «30 turnos» · nv5 sustituye `ejes.nivel.opciones.n4.duracion` → «20 turnos» · nv6 sustituye `ejes.nivel.opciones.n1.resultados.exito.texto` → Absorción 1 (3 quieto; 6 contra el ataque) · sin reducción de Agilidad · nv6 sustituye `ejes.nivel.opciones.n3.duracion` → «40 turnos» · nv6 sustituye `ejes.nivel.opciones.n4.duracion` → «30 turnos» · nv6 sustituye `ejes.nivel.opciones.n5.duracion` → «20 turnos» · nv6 sustituye `ejes.nivel.opciones.n3.resultados.exito.texto` → Absorción 2 (5 quieto; 10 contra el ataque) · Agilidad −1 · nv6 sustituye `ejes.nivel.opciones.n4.resultados.exito.texto` → Absorción 3 (7 quieto; 14 contra el ataque) · Agilidad −1 · nv6 sustituye `ejes.nivel.opciones.n5.resultados.exito.texto` → Absorción 4 (9 quieto; 18 contra el ataque) · Agilidad −2 · nv6 sustituye `ejes.forma.opciones.personal.duracion` → «Empleando nivel 1: 1 hora sin fatiga; después 1 de fatiga por hora (a mano). Otros niveles: la duración de su fila.»
- **Manual:** Absorción (normal/quieto/contra el ataque) y −Agilidad sobre uno mismo mientras dura: efecto activo propio, a mano · Área de la forma ampliada (1 casilla adyacente por nivel; ×2 en n1 desde nv4, ×3 en n1 y ×2 en n3 desde nv5, ×3 en n3 y ×2 en n4 desde nv6) y su duración: se mira en el manual · Concentración y mantenimiento de la forma colectiva (acción simple por turno; reacción desde nv4) · Participantes en una ampliada: +1 casilla por 1 fatiga cada uno (se la descuentan a mano); su casilla desaparece si quedan inconscientes o salen del área · Retirar la protección a un personaje del área (reacción o acción gratuita en su turno) · Nv6, nivel 1 personal: tras la primera hora, 1 fatiga por hora

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1 (corr.) | parametro: `disciplina.porNivel.1.economia` | accion · nueva:psi_contencion_contencion · accion_sin_equipo · bloqueado |
| #2 (corr.), #4 (corr.), #10 (corr.), #17 (corr.), #26 (corr.), #28 (corr.), #31 (corr.), #32 (corr.), #34 (corr.), #38 (corr.), #40 (corr.), #41 (corr.), #43 (corr.), #46 (corr.), #48 (corr.), #50 (corr.), #51 (corr.), #53 (corr.), #59 (corr.), #62 (corr.), #65 (corr.) | parametro: `disciplina.porNivel.1.fatiga`, `duracion`, `ejes.forma.opciones.ampliada.economia`, `disciplina.porNivel.3.fatiga` +12 | accion · existente:psi_contencion_contencion · accion_sin_equipo · bloqueado |
| #3, #6, #7, #27, #30, #33, #36, #42, #45, #52, #55 | manual: `manual.0`, `notas.0` | numerico · existente:bloquear_danio · suma_derivado · ad_hoc |
| #5, #29, #35, #44, #54, #58, #61, #64, #66 | manual: `manual.0`, `ajustesPorNivelPoseido.7`, `ajustesPorNivelPoseido.11`, `ajustesPorNivelPoseido.12` +1 | numerico · existente:defensa · hueco · ad_hoc |
| #8 (corr.), #9 (corr.) | parametro: `notas.0` | texto · existente:psi_contencion_contencion · nota_fija · bloqueado |
| #11 (corr.), #39 (corr.), #47 (corr.), #49 (corr.), #60 (corr.), #63 (corr.) | manual: `manual.1` | accion · existente:psi_contencion_contencion · accion_sin_equipo · ad_hoc |
| #12, #14, #15, #25 | manual: `manual.1`, `ejes.forma.opciones.ampliada.notas`, `notas.0` | texto · tercero:bloquear_danio · nota_fija · ad_hoc |
| #13, #37, #57 | manual: `manual.2`, `manual.5` | texto · existente:psionica_contencion · hueco · ad_hoc |
| #16 (corr.), #20 (corr.), #21 (corr.), #22 (corr.), #24 (corr.) | manual: `manual.4`, `manual.3` | texto · existente:psi_contencion_contencion · nota_fija · ad_hoc |
| #18 | manual: `disciplina.reglas.1` | texto · existente:bloquear_danio · nota_fija · ad_hoc |
| #19, #56 | parametro: `disciplina.modificadoresFatiga.0`, `disciplina.modificadoresFatiga.1` | accion · existente:psionica_contencion · hueco · bloqueado |
| #23 | pregunta | accion · existente:psionica_contencion · hueco · bloqueado |

#### Comunes de Contención

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1, #2, #11 | narrativo | — |
| #3 (corr.) | parametro: `disciplina.reglas.0` | accion · existente:psi_contencion_contencion · accion_sin_equipo · bloqueado |
| #4 | parametro: `sobrecarga.inconsciencia` | texto · nueva:psionica_contencion · hueco · bloqueado |
| #5, #6, #7, #8, #9 | parametro: `sobrecarga.salvacion.dificultad`, `sobrecarga.multiplicadorPorGrado.critico`, `sobrecarga.multiplicadorPorGrado.exito`, `sobrecarga.multiplicadorPorGrado.fracaso` +1 | texto · existente:salv_fortaleza · hueco · bloqueado |
| #10 | parametro: `disciplina.requisito` | — |
| #12 | manual: `disciplina.reglas.2` | numerico · existente:bloquear_danio · suma_derivado · ad_hoc |
| #13 | manual: `manual.0` | numerico · existente:defensa · hueco · ad_hoc |

### 5.6 Singularidad (metrica, requiere Traslacion 2)

**Reglas:**
- `coste_metrica` (todas): Coste: 1 punto de fatiga por nivel de poder empleado (regla general de Métrica, repetida en Singularidad)
- `ejecucion_comun` (todas): Impulso, Expansión y Convergencia comparten coste base y ejecución: acción estándar, tirada de ataque Perspicacia + Tecnociencia (Física si la tiene)
- `sobrecarga` (todas): Sobrecarga: regla única de toda la psiónica (CatalogoPsionica.sobrecarga)
- `poderosa` (psi_singularidad_impulso, psi_singularidad_expansion, psi_singularidad_convergencia): Forma Poderosa: acción compleja y +1 de fatiga plano (Murillo), sube daño y dificultad del objetivo según la forma

**Ajustes por nivel poseído (disciplina):**
- Fatiga · Singularidad Poderosa: suma 1 · alcance {"disciplina":"singularidad","opcion":{"eje":"modo","opcion":"poderoso"}}

**MATRIZ N empleado (1..poseído) × forma.** Normal: estándar, fatiga N. Poderosa: compleja, fatiga N + 1. El nivel poseído no ajusta nada; solo limita N.

| N | Impulso: alc · daño · empuje (dif) | Imp. Poderoso: daño · dif · empuje | Expansión: alc · área · daño · esquiva/empuje | Exp. Poderosa: daño · esquiva/empuje | Convergencia: alc · daño · Fort. | Conv. Poderosa: daño |
|---|---|---|---|---|---|---|
| 1 | 20 m · 10 · 4 m (9) | 12 · 10 · 8 m | 20 m · 6 m · 14 · 7/9 | 15 · 8/10 | 15 m · 6 · 7 | 8 |
| 2 | 40 m · 11 · 8 m (10) | 13 · 11 · 16 m | 40 m · 8 m · 15 · 8/10 | 16 · 9/11 | 30 m · 7 · 8 | 9 |
| 3 | 60 m · 12 · 12 m (11) | 14 · 12 · 24 m | 60 m · 10 m · 16 · 9/11 | 17 · 10/12 | 45 m · 8 · 9 | 10 |
| 4 | 80 m · 13 · 16 m (12) | 15 · 13 · 32 m | 80 m · 12 m · 17 · 10/12 | 18 · 11/13 | 60 m · 9 · 10 | 11 |
| 5 | 100 m · 14 · 20 m (13) | 16 · 14 · 40 m | 100 m · 14 m · 18 · 11/13 | 19 · 12/14 | 75 m · 10 · 11 | 12 |
| 6 | 120 m · 15 · 24 m (14) | 17 · 15 · 48 m | 120 m · 16 m · 19 · 12/14 | 20 · 13/15 | 90 m · 11 · 12 | 13 |

Daño letal en todas. Convergencia ignora la mitad de la absorción, el Escudo Deflector y la Malla Plasmática; su fuego ignora toda absorción.

#### Impulso: `psi_singularidad_impulso`

- **Base:** desde nv1 · estándar · fatiga tabla · alcance tabla · objetivo unico · desplaza tabla · ataque Perspicacia + Tecnociencia (Física), daño tabla letal
- **Eje `nivel`** (nivel_empleado): Nivel 1: fat 1, alc 20, empuje 4 m, daño 10, objetivo tira (dif 9) · Nivel 2 [nv2]: fat 2, alc 40, empuje 8 m, daño 11, objetivo tira (dif 10) · Nivel 3 [nv3]: fat 3, alc 60, empuje 12 m, daño 12, objetivo tira (dif 11) · Nivel 4 [nv4]: fat 4, alc 80, empuje 16 m, daño 13, objetivo tira (dif 12) · Nivel 5 [nv5]: fat 5, alc 100, empuje 20 m, daño 14, objetivo tira (dif 13) · Nivel 6 [nv6]: fat 6, alc 120, empuje 24 m, daño 15, objetivo tira (dif 14)
- **Eje `modo`** (opcion): Impulso: sin cambios · Impulso Poderoso: compleja, nota

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1, #2 | narrativo | — |
| #3, #4 (corr.), #5 (corr.), #6 (corr.), #7 (corr.) | parametro: `resolucion`, `alcance`, `objetivo`, `resolucion.danio` +1 | accion · nueva:psi_singularidad_impulso · accion_sin_equipo · bloqueado |
| #8 | parametro: `objetivoTira.0` | texto · tercero:defensa · nota_fija · bloqueado |
| #9, #10, #11, #12, #13, #17 | parametro: `objetivoTira.1.dificultad`, `objetivoTira.1.grados.critico`, `objetivoTira.1.grados.exito`, `objetivoTira.1.grados.fracaso` +2 | texto · tercero:resistir_empuje · nota_fija · bloqueado |
| #14 | parametro: `notas.0` | texto · existente:psi_singularidad_impulso · nota_fija · bloqueado |
| #15, #16, #18 [CN] | parametro: `ejes.modo.opciones.poderoso.economia`, `ejes.modo.opciones.poderoso.resolucion.danio` | accion · existente:psi_singularidad_impulso · accion_sin_equipo · bloqueado |

#### Expansión: `psi_singularidad_expansion`

- **Base:** desde nv1 · estándar · fatiga tabla · alcance tabla · objetivo casilla (área tabla) · ataque Perspicacia + Tecnociencia (Física), daño tabla letal
- **Eje `nivel`** (nivel_empleado): Nivel 1: fat 1, alc 20, área 6, daño 14, objetivo tira (dif 7/9) · Nivel 2 [nv2]: fat 2, alc 40, área 8, daño 15, objetivo tira (dif 8/10) · Nivel 3 [nv3]: fat 3, alc 60, área 10, daño 16, objetivo tira (dif 9/11) · Nivel 4 [nv4]: fat 4, alc 80, área 12, daño 17, objetivo tira (dif 10/12) · Nivel 5 [nv5]: fat 5, alc 100, área 14, daño 18, objetivo tira (dif 11/13) · Nivel 6 [nv6]: fat 6, alc 120, área 16, daño 19, objetivo tira (dif 12/14)
- **Eje `modo`** (opcion): Expansión: sin cambios · Expansión Poderosa: compleja, nota

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1, #2 | narrativo | — |
| #3, #4 (corr.), #5 (corr.), #6 (corr.) | parametro: `alcance`, `objetivo`, `objetivo.area`, `resolucion.danio` | accion · nueva:psi_singularidad_expansion · accion_sin_equipo · bloqueado |
| #7, #8, #9, #10, #18 | parametro: `objetivoTira.0.dificultad`, `objetivoTira.0.que`, `ejes.modo.opciones.poderoso.objetivoTira.0.dificultad` | texto · tercero:defensa · nota_fija · bloqueado |
| #11, #12, #13, #14, #15, #19 | parametro: `objetivoTira.1.dificultad`, `objetivoTira.1.grados.critico`, `objetivoTira.1.grados.exito`, `objetivoTira.1.grados.fracaso` +2 | texto · tercero:resistir_empuje · nota_fija · bloqueado |
| #16, #17 | parametro: `ejes.modo.opciones.poderoso.economia`, `ejes.modo.opciones.poderoso.resolucion.danio` | accion · existente:psi_singularidad_expansion · accion_sin_equipo · bloqueado |

#### Convergencia: `psi_singularidad_convergencia`

- **Base:** desde nv1 · estándar · fatiga tabla · alcance tabla · objetivo unico · ataque Perspicacia + Tecnociencia (Física), daño tabla letal
- **Eje `nivel`** (nivel_empleado): Nivel 1: fat 1, alc 15, daño 6, objetivo tira (dif 7) · Nivel 2 [nv2]: fat 2, alc 30, daño 7, objetivo tira (dif 8) · Nivel 3 [nv3]: fat 3, alc 45, daño 8, objetivo tira (dif 9) · Nivel 4 [nv4]: fat 4, alc 60, daño 9, objetivo tira (dif 10) · Nivel 5 [nv5]: fat 5, alc 75, daño 10, objetivo tira (dif 11) · Nivel 6 [nv6]: fat 6, alc 90, daño 11, objetivo tira (dif 12)
- **Eje `modo`** (opcion): Convergencia: sin cambios · Convergencia Poderosa: compleja, nota

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1, #2 | narrativo | — |
| #3, #4 (corr.), #5 (corr.) | parametro: `alcance`, `objetivo`, `resolucion.danio` | accion · nueva:psi_singularidad_convergencia · accion_sin_equipo · bloqueado |
| #6, #7, #8, #10 | parametro: `notas.0`, `notas.2`, `notas.1`, `notas.3` | texto · existente:psi_singularidad_convergencia · nota_fija · bloqueado |
| #9, #12, #13, #14, #15, #16, #17, #18, #19 | parametro: `objetivoTira.1.que`, `objetivoTira.1.dificultad`, `objetivoTira.1.grados.critico`, `objetivoTira.1.grados.exito` +2 | texto · tercero:salv_fortaleza · nota_fija · bloqueado |
| #11 | parametro: `objetivoTira.0` | texto · tercero:defensa · nota_fija · bloqueado |
| #20, #21 | parametro: `ejes.modo.opciones.poderoso.economia`, `ejes.modo.opciones.poderoso.resolucion.danio` | accion · existente:psi_singularidad_convergencia · accion_sin_equipo · bloqueado |

#### Comunes de Singularidad

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1, #10, #13 | parametro: `disciplina.rama`, `disciplina.requisito`, `disciplina.reglas.ejecucion_comun` | — |
| #2, #11, #12 | narrativo | — |
| #3 | parametro: `disciplina.reglas.coste_metrica` | accion · existente:grupo:Psiónica/metrica/singularidad · hueco · bloqueado |
| #4 | parametro: `catalogo.sobrecarga.inconsciencia` | accion · nueva:psi_sobrecarga · hueco · pendiente |
| #5, #6, #7, #8, #9 | parametro: `catalogo.sobrecarga.salvacion.dificultad`, `catalogo.sobrecarga.multiplicadorPorGrado.critico`, `catalogo.sobrecarga.multiplicadorPorGrado.exito`, `catalogo.sobrecarga.multiplicadorPorGrado.fracaso` +1 | accion · existente:psi_sobrecarga · hueco · pendiente |
| #14 (corr.), #15 (corr.) | parametro: `acciones.*.economia`, `acciones.*.resolucion` | accion · nueva:psi_singularidad_* · accion_sin_equipo · bloqueado |

---

## 6. Errores de fidelidad del verificador y cómo se han aplicado

El verificador encontró 24 errores. Todos están aplicados en el JSON.

| # | Item · ruta | Problema | Aplicado |
|---|---|---|---|
| 1 | resonancia.rastreo · `ejes[conocimiento].opciones[indirecto\|desconocido]` | Falta el multiplicador de tiempo: la prosa dice ×2 (indirecto) y ×10 (desconocido), y Murillo confirma que multiplica el tiempo de la fila de la tabla. La propuesta solo cambia la dificultad. | Nota "tiempo ×2" en indirecto y "×10" en desconocido (cambia.notas). El campo estructurado `Opcion.multiplicaTiempo` sigue propuesto en camposNuevos. |
| 2 | resonancia.rastreo · `ejes[conocimiento].opciones[*].cambia.resolucion` | Cada opción reescribe la resolución completa con habilidad 'biociencia' y así pisa porObjetivo.sintetico (Tecnociencia (Informática)). Contra un sintético se tiraría Biociencia. | Cada opción cambia solo `resolucion.dificultad` (6/9/12). **Supuesto nuevo:** `cambia.resolucion` se fusiona campo a campo, así que la habilidad sigue saliendo de la base o de `porObjetivo.sintetico`. |
| 3 | resonancia.rastreo · `ejes[alcance].opciones[local].cambia` | Rastreo no tiene coste propio (fatiga 'tabla'). La opción local no fija fila, así que la fatiga queda indefinida. Local cuenta como nivel empleado 1 (fila 1: fatiga 1). | `fatiga: 1` en `local` y `local_reaccion` (local = nivel empleado 1). |
| 4 | hipercongnicion (disciplina) · `modificadoresEconomia[retrocognicion nv3+nv5]` | Dos baja_un_paso sin suelo dejan el tramo local en simple en nv5. La prosa de Retrocognición dice 'de compleja a estándar (mínimo tiempo posible)', y la respuesta de Murillo sobre simple es solo para Sondeo. | Se añade `minimo: "estandar"` a los dos `baja_un_paso` de Retrocognición (campo nuevo en `modificadoresEconomia`). Sondeo sigue bajando a simple en nv5, como dijo Murillo. La duda queda en preguntas. |
| 5 | hipercongnicion.precognicion · `resultados.fracasoCritico.estados` | Confusión aparece como estado automático, pero la prosa la condiciona a fallar una salvación de Voluntad dificultad 8. | Confusión sale de `estados`; queda en el texto con su salvación de Voluntad 8. |
| 6 | hipercongnicion.sondeo_no_local · `resultados.fracaso.estados y resultados.fracasoCritico.estados` | Aturdido aparece como estado automático, pero la prosa dice 'puede quedar aturdido' tras una salvación de Fortaleza (8 en fracaso, la dificultad de la prueba en fracaso crítico). | Aturdido sale de `estados` en fracaso y fracaso crítico; queda en el texto con su salvación de Fortaleza. |
| 7 | hipercongnicion.retrocognicion · `resultados.fracaso.estados` | Aturdido aparece como automático, pero la prosa pide antes una salvación de Voluntad dificultad 6 contra aturdimiento. El fracaso crítico sí es automático. | Aturdido sale de `estados` en el fracaso (sigue automático en el fracaso crítico). |
| 8 | singularidad.impulso · `fatiga / alcance / desplazamiento / resolucion.danio / objetivoTira[1].dificultad / ejes[nivel].opciones[*].cambia` | La prosa dice 'nivel de poder empleado' en todo, pero se codifica con Valor.porNivel, que por convención es nivel POSEÍDO. El eje nivel_empleado existe pero todas sus opciones tienen cambia {}, así que la elección del jugador no cambia nada: un nivel 6 que emplee nivel 1 pagaría 6 de fatiga y haría 15 de daño. | Cada opción Nn del eje `nivel` fija fatiga N, alcance 20N, `resolucion.danio` 9+N, empuje 4N m (campo `desplazamiento`, fuera del Pick de `Opcion.cambia`) y `objetivoTira` con 8+N. La base queda en "tabla". Poderoso: compleja + nota con los +2/+1/8×N. El +1 de fatiga sigue en `modificadoresFatiga`. |
| 9 | singularidad.expansion · `fatiga / alcance / objetivo.area / resolucion.danio / objetivoTira[*].dificultad / ejes[nivel].opciones[*].cambia` | Mismo fallo: todo es 'nivel empleado' pero va con porNivel (poseído) y el eje nivel_empleado tiene cambia vacío. | Opción Nn: fatiga N, alcance 20N, `objetivo.area` 4+2N (fuera del Pick), daño 13+N, esquiva 6+N y empuje 8+N. Poderosa: compleja + nota (+1 daño, +1 a las dos dificultades). |
| 10 | singularidad.convergencia · `fatiga / alcance / resolucion.danio / objetivoTira[1].dificultad / ejes[nivel].opciones[*].cambia` | Mismo fallo: 'nivel empleado' codificado como porNivel (poseído), con el eje nivel_empleado vacío. | Opción Nn: fatiga N, alcance 15N, daño 5+N, Fortaleza 6+N. Poderosa: compleja + nota (+2 daño). |
| 11 | singularidad.impulso · `motor` | motor está vacío ([]) aunque la clasificación da la acción propia y los textos a terceros (defensa, resistir_empuje). | Motor regenerado a partir de los efectos (acción nueva + textos a terceros `defensa` y `resistir_empuje`). |
| 12 | singularidad.expansion · `motor` | motor vacío ([]). | Ídem (psi_singularidad_expansion + defensa + resistir_empuje). |
| 13 | singularidad.convergencia · `motor` | motor vacío ([]). | Ídem (psi_singularidad_convergencia + defensa + salv_fortaleza). |
| 14 | singularidad.impulso · `ejes[modo].opciones[poderoso]` | 'Los metros desplazados aumentan a 8 x nivel' solo va en el texto de objetivoTira; el campo desplazamiento sigue en 4× con la opción Poderoso. | Resuelto con la #8: el empuje 4N va por opción de nivel y el 8× de Poderoso va en nota, sin el 4× estructurado contradiciéndolo. |
| 15 | induccion.comando · `multiplesObjetivos` | La prosa lo habilita desde nivel 3, pero el campo no lleva nivel: con nv1-2 la app mostraría el mensaje igualmente. | `multiplesObjetivos: null` en la base y ajuste `desdeNivel 3` que lo fija. |
| 16 | induccion.modulacion · `multiplesObjetivos` | Varios objetivos es desde nivel 4, pero el mensaje se muestra desde nv1. | `multiplesObjetivos: null` en la base y ajuste `desdeNivel 4`; el ajuste de nv6 lo sustituye después. |
| 17 | induccion.modulacion · `ejes[estado].opciones[latencia].cambia.resultados.critico.texto` | 'al reiniciar sufre un turno los efectos del fracaso': 'fracaso' es el del objetivo, que en resultados (punto de vista del psiónico) es el Éxito. Leído desde el psiónico remite al efecto equivocado (el −2 suave). | Texto reescrito sin nombrar el grado: desglosa los efectos del "fracaso del objetivo" (el Éxito del psiónico). |
| 18 | induccion.supresion · `ajustesPorNivelPoseido (duracion)` | Los ajustes nv2/nv4 sustituyen duracion a secas y pisan la duración de las opciones 'liberar' (1 turno, 'durante todo ese turno') y 'salvacion' (null). La prosa solo alarga el uso de reducir penalizadores. | Los ajustes nv2/nv4 apuntan a `ejes.modo.opciones.mitigar.duracion`; `liberar` y `salvacion` conservan su duración. |
| 19 | induccion.estabilizacion · `ajustesPorNivelPoseido (duracion)` | Mismo pisado: la duración 100/300 sustituye también a la opción uso=salvacion, que tiene duracion null. | Los ajustes nv2/nv4 apuntan a `ejes.uso.opciones.mitigar.duracion`. |
| 20 | induccion.estabilizacion · `bonosEnOtrasTiradas` | Con nv6 aparecen a la vez tres toggles en Salvaciones (+2, +3 reacción y +4 reacción) que se pueden marcar juntos. Por decisión, +3/+4 SUSTITUYEN al +2 y +4 sustituye a +3: nunca se suman. | Dos toggles: "+2" y "como reacción" (+3 desde nv4, que pasa a +4 con un ajuste nv6). La etiqueta dice que son excluyentes. `BonoToggle` no tiene campo `excluye`: la exclusión solo va en el texto. |
| 21 | contencion · `modificadoresFatiga[0] (contencion.ampliada ×2)` | Prosa [Nivel 2] l.7: cuando varios participan, el foco 'gastará el habitual en puntos de fatiga de la contención personal', o sea sin ×2. El ×2 queda incondicional. | Condición `toggle` en el ×2 de la ampliada. La duda del foco sigue en preguntas. |
| 22 | contencion.contencion · `ajustesPorNivelPoseido (desdeNivel 6, ejes.nivel.opciones.n1.duracion)` | La prosa de nv6 ('1 hora sin fatiga') solo vale para la forma personal, pero el ajuste sustituye la duración de n1 en cualquier forma. Con eso, n1 ampliada pierde los 40 turnos que le da nv5. | Fuera el ajuste nv6 sobre `n1.duracion` (así n1 ampliada se queda en 40 turnos). Se añade un ajuste nv6 sobre `ejes.forma.opciones.personal.duracion`. |
| 23 | contencion.contencion · `motor` | motor: [] vacío. La acción no declara su propio accion_nueva psi_contencion_contencion (accion_sin_equipo, bloqueado) ni las entradas de absorción (bloquear_danio, suma_derivado, ad_hoc), cuando en las demás acciones sí se declaran. | Motor completado con `accion_nueva psi_contencion_contencion` y la absorción `bloquear_danio · suma_derivado · ad_hoc`, sacados de sus efectos (ver regeneración de `motor`). |
| 24 | traslacion · `modificadoresFatiga[0..2] (nv3 ×0 y nv6 −1 / mínimo 1)` | Con Traslación 6, una carga <10 kg también está por debajo de la máxima y activa los dos toggles. La cadena queda ×0 → −1 → mínimo 1 = 1, y lo que nv3 dejaba gratis pasa a costar 1. El mínimo 1 de la prosa acompaña solo a la reducción de nv6. | El toggle de nv6 pasa a "carga ≥ 10 kg y por debajo de la máxima", excluyente con el de "carga < 10 kg"; así lo gratis de nv3 no vuelve a costar 1. |

Además, la verificación de efectos corrigió **58 clasificaciones**, marcadas (corr.) en §5. En Contención casi todas son del mismo fallo: el id decía `psionica_contencion` en vez de `psi_contencion_contencion`. En Singularidad son `accion_existente` que pasan a `accion_nueva` en el nivel donde nace la acción.

---

## 7. Preguntas para el diseñador

Están deduplicadas y agrupadas por disciplina. Entre corchetes, el item del que salen.

### 7.1 Resonancia (19)

- [sincronia] Sincronía, mensaje agresivo: si se elige una fila de la tabla (n1-n6), ¿la fatiga es la de la fila (sustituye, n5 = 6, n6 = 8) o 1 por nivel empleado (n5 = 5, n6 = 6)? ¿Y la economía es compleja o el tiempo de la fila?
- [sincronia] Sincronía, mensaje agresivo en alcance local: ¿se puede usar a nivel empleado > 1 (más confusión y daño) sin salir de local, o local siempre es nivel 1?
- [sincronia] Sincronía contra un sintético: ¿el mensaje agresivo también usa Expresión + Tecnociencia (Informática)? ¿Y qué tira para resistir una máquina sin ficha (pregunta 16)?
- [sincronia] Sincronía, mensaje agresivo: ¿tiene algún efecto el fracaso crítico del psiónico (además del daño mental propio)?
- [rastreo] Rastreo no dice coste propio: en alcance local, ¿qué fatiga cuesta (la fila local de la tabla no da fatiga)?
- [rastreo] Rastreo con varios objetivos: ¿una tirada y un coste para todos, o coste/tirada por objetivo?
- [leer_mente] Leer Mente contra un sintético: ¿Perspicacia + Tecnociencia (Informática) como Rastreo? ¿Qué tira la máquina para resistir (pregunta 16)?
- [leer_mente] Leer Mente: ¿el mantenimiento con reacción o acción simple es por turno? ¿Cuesta fatiga mantenerlo?
- [leer_mente] Leer Mente: ¿el objetivo psiónico entrenado resiste con Voluntad + Biociencia en vez de + Actitud, como en Inducción?
- [alerta] Alerta pasiva: ¿qué economía tiene cuando se tira (gratuita, reacción, simple como Buscar/percibir)? Se ha propuesto gratuita.
- [alerta] Alerta nv4: ¿qué es 'sin impedimentos'? ¿Exhausto, bajo Munición Supresora, en zona de interferencia…?
- [alerta] Alerta activa: ¿el alcance local de 1 km² sustituye al pasivo (20 m × nivel) o lo amplía? ¿La forma activa puede usar filas de la tabla de Resonancia?
- [vinculo] Vínculo: ¿el propio psiónico cuenta como 'conectado' y recibe también el +1 a Salvación de Voluntad?
- [vinculo] Vínculo: ¿puede crearse con un alcance de la tabla de Resonancia (filas n1-n6) o su alcance es siempre 1 km² × nivel?
- [_comunes] Resonancia (comunes#7): ¿cómo influye el nivel en Resonancia al superar barreras semánticas o biológicas? ¿Baja la dificultad, abre la resonancia con especies muy distintas…?
- [_comunes] Resonancia (comunes#8): 'conocimientos en Tecnociencia (Informática)' para el puente bio-sintético, ¿basta con Tecnociencia ≥ 1 o hace falta la especialidad Informática?
- [_comunes] Resonancia (comunes#10): 'quemar las sinapsis' con una supercomputadora alienígena, ¿tiene mecánica (daño mental, salvación) o es solo ambientación?
- [_comunes] Resonancia (comunes#17): la fila 'Alcance local: acción estándar' no da fatiga. Para las acciones sin coste propio (Rastreo), ¿cuánto cuesta el uso local?
- [_comunes] Resonancia nv2: ¿'baja un paso' puede dejar una acción simple en gratuita, o simple es el mínimo?

### 7.2 Inducción (10)

- [comando] Comando nv3 (varios objetivos): ¿el psiónico hace una sola tirada enfrentada contra la resistencia de cada objetivo por separado, o una tirada por objetivo?
- [modulacion] Hipomanía: sus grados, ¿están escritos desde el objetivo como el resto de Modulación? Si es así, cuando el psiónico gana la tirada el objetivo recibe los inconvenientes (−2 emocional, 20% de fallo) y, cuando pierde, recibe los beneficios completos. ¿Es así como tiene que funcionar?
- [modulacion] Latencia (fracaso y fracaso crítico): el '−1' que dura tantos turnos como nivel de poder, ¿se aplica a las acciones físicas y de procesamiento, como el −2, o a todas sus tiradas?
- [modulacion] Cautiverio (éxito del objetivo): '−1 a fuerza o agilidad', ¿quién elige cuál: el psiónico o el máster?
- [modulacion] Modulación nv4 (varios objetivos): ¿el psiónico hace una sola tirada contra la resistencia de cada objetivo, o tira una vez por objetivo?
- [supresion] Supresión: 'reduce los penalizadores obtenidos por estados en 1', ¿es 1 menos al penalizador total o 1 menos por cada estado activo?
- [estabilizacion] Estabilización nv2: la duración pasa a '10 minutos' a secas, mientras que en Supresión es '10 minutos × nivel'. ¿También escala con el nivel? Y nv4 '30 minutos', ¿es igual que en Supresión (30 min × nivel)?
- [estabilizacion] Estabilización para ganar el bonificador de salvación: ¿hace falta superar la tirada de dificultad 6 antes de sumar el +2/+3/+4, o el bonificador se aplica sin tirada (solo pagando 1 de fatiga)?
- [_comunes] Inducción nv5: ¿qué acciones cuentan como 'habilidades de sugestión' para usarlas a través de Resonancia fuera del alcance local con −4? ¿Solo Comando, Modulación y Reconfiguración, o también Supresión?
- [_comunes] Sobrecarga (salvación de Fortaleza 5 + nivel empleado, daño = nivel empleado): en los poderes de coste fijo que no eligen nivel (Comando, Supresión, Estabilización, Reconfiguración), ¿qué nivel empleado cuenta: tu nivel en Inducción, el nivel de la sección donde aparece el poder o el coste en fatiga?

### 7.3 Hipercongnición (16)

- [sondeo_no_local] Rebaja de dificultad: la prosa dice 'niveles pares' (nv2, nv4, nv6) y Murillo dijo '−1 en nv4 y −2 en nv6'. ¿Nivel 2 no rebaja nada? ¿O es −1/−2/−3 en nv2/4/6?
- [sondeo_no_local] Nivel 3: 'aumenta a 1 minuto el tiempo que dura el sondeo una vez conseguida la prueba'. Con la errata (crítico = turnos por nivel y prolongable; éxito = máximo turnos por nivel, sin prolongar), ¿sigue vigente el minuto? ¿Para qué grado?
- [sondeo_no_local] Tiempo en niveles impares: la prosa pone 'mínimo estándar', pero Murillo dice que el tramo local baja a simple en nv5. ¿Los demás tramos siguen la escalera normal (1 h → 10 min → 1 min…) y solo el local baja por debajo de estándar?
- [sondeo_no_local] Prolongar el crítico gastando fatiga: ¿cuesta la misma fatiga del tramo por turno y sin nueva tirada, como el mantenimiento general?
- [sondeo_no_local] Aturdido en fracaso y fracaso crítico: ¿qué grado del estado aturdido se aplica (según el resultado de la salvación, como en el catálogo de estados) y cuánto dura? ¿1 turno por defecto?
- [sondeo_no_local] '1/4 del alcance por nivel de Resonancia': ¿es la fracción del alcance máximo de la tabla de Resonancia para el nivel que se tiene en Resonancia?
- [sondeo_no_local] Búnker con supresión cuántica: '¿infranqueable sin una brecha previa?'. ¿Qué cuenta como brecha (hackeo, sabotaje físico…)?
- [precognicion] 'Tiradas defensivas': Murillo dejó fuera las salvaciones. ¿Entran Defensa/esquiva y bloquear en cuerpo a cuerpo? ¿La iniciativa cuenta?
- [precognicion] Fracaso: '−1 en el siguiente turno'. ¿El siguiente turno del psiónico o lo que queda de este?
- [precognicion] Crítico: ignorar el primer nivel de cobertura, ¿solo en ataques a distancia o también en cuerpo a cuerpo? ¿Y la segunda reacción dura lo mismo que la burbuja?
- [precognicion] Fracaso crítico: ¿qué grado del estado confusión se aplica si falla la salvación de Voluntad 8 y cuánto dura?
- [retrocognicion] Rebaja de dificultad en niveles pares: igual que en Sondeo, ¿nv2 no rebaja y es −1 en nv4 y −2 en nv6?
- [retrocognicion] ¿La respuesta de Murillo 'el tramo local baja a simple en nv5' vale también para el tramo 'menos de 1 hora' de Retrocognición, o aquí el mínimo sigue siendo estándar?
- [retrocognicion] Fracaso crítico 'aturdimiento durante un turno' y fracaso con salvación de Voluntad 6: ¿qué grado del estado aturdido del catálogo se aplica en cada caso?
- [retrocognicion] Retrocognición no tiene nada que haga durar el efecto (a diferencia de Sondeo nv3): ¿la lectura es instantánea (un solo volcado)?
- [_comunes] Hipercongnición llega a nivel 6 (Murillo), pero la prosa solo describe reducciones en niveles 2-5 (pares/impares) y no hay tabla común por nivel: ¿hay algo más a nivel 6 aparte del −2 de dificultad?

### 7.4 Traslación (15)

- [anclaje] 'Oponerse al escape': ¿qué acción gasta el psiónico (gratuita, reacción)? Solo se sabe que no cuesta fatiga.
- [anclaje] Nivel 4 'Anclaje pasa a acción simple': ¿añadir un objetivo en otro turno (estándar) también baja a simple? Varios a la vez baja a estándar (Murillo).
- [anclaje] Duelo de Métrica: ¿sustituye a la esquiva contra el ataque, o sirve también para escapar una vez anclado?
- [anclaje] Auto-anclaje: ¿qué fila de la tabla se paga (la que cubre el peso propio)?
- [trasladar] Al repetir Trasladar para mantener el control, ¿qué tira el psiónico contra la Fortaleza + Atletismo del objetivo? Se asume Perspicacia + Física.
- [trasladar] Trasladar sobre un objetivo ya anclado, sin repetir, ¿lleva tirada? Murillo habla de 'una tirada inicial': se asume que es la del Anclaje y que Trasladar va sin dado.
- [proyeccion] Auto-proyección: ¿hace falta estar auto-anclado antes? ¿El ×2/×4 es sobre la velocidad normal de movimiento o sobre la de Levitar?
- [proyeccion] Si Proyección falla contra un blanco, ¿dónde acaba lo proyectado? ¿Hay daño al estamparlo igualmente?
- [proeza] Carga máxima de referencia para el exceso y el 200%: ¿la de la fila del nivel empleado o la del nivel poseído?
- [proeza] ¿Se paga la fila de la tabla más el extra por exceso, o solo el extra?
- [sensor] Radio del Sensor '2 × nivel': ¿metros o casillas?
- [sensor] 'Si la forma de lo percibido no es poco habitual' parece errata de 'es poco habitual': ¿se confirma?
- [_comunes] Nivel 6 '−1 de fatiga (mínimo 1)' con una carga < 10 kg (gratis por nivel 3): ¿cuesta 0 o 1? ¿El mínimo 1 solo limita esta reducción o manda sobre todo?
- [_comunes] Para los poderes de coste fijo (Sensor, Proyección, Levitar, Duelo de Métrica), ¿qué 'nivel empleado' cuenta para la salvación y el daño de la sobrecarga?
- [_comunes] Nivel 3 (cargas < 10 kg gratis): ¿vale también para Proyección y Levitar, que tienen coste propio, o solo para las acciones que pagan la tabla?

### 7.5 Contención (6)

- [contencion] Forma ampliada colectiva: la prosa dice que el foco 'gastará el habitual en puntos de fatiga de la contención personal'. ¿Significa que, con colaboradores, el foco NO paga el ×2 de la ampliada? Choca con la regla del ×2.
- [contencion] Ampliada: '1 casilla adyacente por nivel de poder'. ¿Nivel poseído o empleado? El foco 'establece el nivel de poder empleado', lo que apunta a empleado, pero la convención general es 'nivel de poder' a secas = poseído.
- [contencion] 'Doble/triple de área de influencia en su forma colectiva': ¿el doble de las casillas que da el nivel empleado (p.ej. n1 → 2 casillas)?
- [contencion] Tipo de acción de la contención personal en niveles empleados 3-6: la prosa solo dice 'acción simple' en nivel 1. ¿Sigue siendo simple? (asumido así)
- [contencion] Duración de la ampliada con los ajustes por nivel poseído (n1 a 20/30/40 turnos, 1 hora en nv6): ¿la hora gratis de nv6 aplica solo a la forma personal (así lo dice la prosa) y las demás ampliaciones de duración a ambas formas?
- [contencion] Ir contra el ataque: el daño al objeto bloqueado es 'letal para orgánicos que ataquen desarmados'. En el resto de casos, ¿qué categoría de daño es (contundente)?

### 7.6 Singularidad (8)

- [impulso] Impulso Poderoso: 'los metros desplazados aumentan a 8 x nivel de poder' — sin 'empleado'. Por convención se lee nivel POSEÍDO, pero el empuje normal es 4 × nivel EMPLEADO. ¿Es 8 × nivel empleado (errata)?
- [impulso] Impulso, tirada contra desplazamiento con éxito: 'la mitad de metros' — ¿redondeo hacia arriba o abajo, y cae derribado o no (el texto solo dice derribado en fracaso)?
- [expansion] Expansión: área '4 metros + (2 × nivel empleado)' — ¿radio o diámetro?
- [expansion] Expansión Poderosa: '+1 a la dificultad contra esquiva y efectos' — ¿'efectos' incluye la prueba de Fortaleza + Atletismo contra la expulsión? (Murillo solo confirmó daño y esquiva).
- [convergencia] Convergencia: 'ignora la mitad de la absorción' y 'fuego = mitad de la armadura' — ¿redondeo hacia arriba o abajo?
- [convergencia] Convergencia, fracaso crítico: ¿incluye también el daño de fuego del fracaso (mitad de la armadura) y la llamarada, o solo lo que dice (−4 de absorción y fuego sin fin)?
- [_comunes] ¿Puede un objetivo con Traslación usar el Duelo de Métrica (tirada enfrentada de Perspicacia + Física como reacción) contra Impulso, Expansión o Convergencia, o solo contra Anclaje/Trasladar?
- [_comunes] ¿Cuál es el nivel máximo de Singularidad? La prosa no trae tabla por nivel; se asume 1–6 como el resto de disciplinas.

### 7.7 Transversales (8)

- Fatiga y vida de personaje: el gasto de C3, el daño de C5/C7 y la fatiga temporal de C14 ¿escriben en la ficha (sheet.fatigaActual/vidaActual) o en la foto del Combatiente? motor.md tiene esa divergencia aparcada y ahora la bloquean varias capas.
- Concentración/mantenimiento: el modelo lo deja en 'manual' por decisión, pero hay huecos que piden coste recurrente de acción o fatiga por turno/hora (C13). ¿Se construye C13 o se queda como mensaje?
- Estados infligidos (C8): ¿la app vuelca EstadoActivo sobre el Combatiente objetivo o se queda en texto, como dice el principio 'lo que hace el objetivo es texto'? Si se vuelcan, faltan en el catálogo de estados confusión, asustado/aterrorizado, anclado, paralizado, apagado de emergencia, cautiverio, coma...
- 'Nivel de poder' a secas en duraciones, alcances y estados (Leer Mente, Comando, Modulación, Sensor, Anclaje): convención = poseído, pero la prosa de Métrica mezcla empleado y poseído en la misma frase. Afecta a C2, C1b y C8.
- Tipo 5 (arbitraje duro/blando) para los gates de psiónica: requisito de disciplina, desdeNivel, carga máxima superada (Proeza), fatiga insuficiente sin permiteFatigaTemporal. ¿Bloquear o avisar?
- Economía de acciones por turno: la app no cuenta simple/estándar/compleja/reacción por turno; C4, C12, C13 y la reacción de Comando dependen de si se modela o solo se informa.
- Contención ampliada 'desde nivel 2': ¿por nivel poseído o empleado? (contencion.contencion#10).
- 'Escena' no existe en la app: la fatiga temporal (C14) y varias duraciones necesitan un cierre de escena explícito o manual.

---

## 8. Avisos del proceso

- **Lotes caídos:** ninguno. **Efectos sin veredicto:** ninguno. **Incoherencias que el workflow normalizó:** ninguna.
- **Ids que no casan entre sí (sin normalizar en los efectos, solo aquí):**
  - Contención: #13, #19, #23, #37, #56 y #57 siguen con `psionica_contencion`, mientras que el resto se corrigió a `psi_contencion_contencion`.
  - Sobrecarga: cada lote la ancla en un sitio. Traslación la pone en `salv_fortaleza` (y `psionica` para el umbral), Contención en `salv_fortaleza` (y `accion_nueva psionica_contencion` para la inconsciencia) y Singularidad en `psi_sobrecarga`. En el JSON es una sola regla, `sobrecarga`, en la raíz; el motor de cada acción no la repite.
  - Hipercognición: el id `hipercongnicion` (con la errata "cong") viene de la fuente. Se mantiene para no romper los claims.
- **Supuestos añadidos al aplicar las correcciones** (§3.2): fusión parcial de `cambia.resolucion`, `minimo` en `modificadoresEconomia` y `desplazamiento`/`objetivo` dentro de `Opcion.cambia`.
- **Singularidad Poderosa:** los incrementos (+2 daño, +1 dificultad, empuje 8×) van **solo en nota**. Para estructurarlos hace falta una operación relativa en `Opcion.cambia` o combinar los dos ejes.
- **Rutas desplazadas en Singularidad:** al aplicar las correcciones #8–#10, las rutas de los efectos que apuntan a `alcance`, `fatiga`, `desplazamiento`, `objetivo.area`, `resolucion.danio` y `objetivoTira.*` han pasado a `ejes.nivel.opciones.Nn.cambia.*`; la base queda en "tabla". En las tablas de §5 se ven las rutas originales.
- **Estabilización:** la exclusión entre los toggles +2 y "como reacción" solo va en la etiqueta; `BonoToggle` no tiene `excluye`.
- **`motor` regenerado** para todas las acciones a partir de los efectos (antes 12 venían vacíos). Los efectos de `_comunes` no se vuelcan en `motor`, porque el modelo no tiene `Disciplina.motor`; están en §5.
- La matriz de Resonancia supone que los descuentos se acumulan con mínimo 0 y que la fila de la tabla sustituye al coste propio (regla `tabla_sustituye`). Los costes de opción (+1/+4 de Rastreo) se suman después.
