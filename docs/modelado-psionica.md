# Modelado de la Psiónica — salida del workflow `modelar-area`

- **Qué es:** resultado del workflow `modelar-area` sobre `docs/psionica.md` (fuente del diseñador: `docs/Psiónica.pdf`).
- **Estado:** **propuesta sin construir.** Nada de esto está en `src/lib/rules` ni en el catálogo.
- **Quién manda:** `docs/sistema.md`. Si esto choca con sistema.md, gana sistema.md. Lo que aquí se da por supuesto no existe para el código hasta que entre en sistema.md.
- **Borrador de catálogo:** `docs/modelado-psionica.json`, un array de `Disciplina` con sus `acciones` (`AccionPoder`) y su `motor` (MotorMetadata), **con las correcciones del verificador ya aplicadas** (§7).
- **Convenciones:** N = nivel **empleado**; "nv K" o "poseído K" = nivel **poseído** en la disciplina. Fatiga en puntos, duración en turnos (10 turnos = 1 minuto).

---

## 1. Cobertura

### 1.1 Global

| Efectos | Cubierto | parametro | resultado_texto | manual | pregunta | narrativo | Con `campoNuevo` |
|---|---|---|---|---|---|---|---|
| **578** | **87 %** | 372 | 89 | 67 | 5 | 45 | 103 |

"Cubierto" quiere decir que el efecto tiene destino en el modelo objetivo sin campo nuevo pendiente, o que es narrativo o manual por decisión. Hay dos cosas que impiden el 100 %: los 5 efectos que quedan en "pregunta" y los efectos que dependen de un `campoNuevo` sin consolidar.

### 1.2 Por item

| Item | Efectos | % | parametro | res_texto | manual | pregunta | narrativo |
|---|---|---|---|---|---|---|---|
| resonancia.sincronia | 19 | 79 | 18 | 0 | 0 | 0 | 1 |
| resonancia.rastreo | 17 | 88 | 14 | 0 | 0 | 0 | 3 |
| resonancia.leer_mente | 12 | 100 | 8 | 0 | 3 | 0 | 1 |
| resonancia.alerta | 12 | 92 | 11 | 1 | 0 | 0 | 0 |
| resonancia.vinculo | 8 | 88 | 5 | 0 | 2 | 0 | 1 |
| resonancia._comunes | 43 | 79 | 30 | 0 | 0 | 4 | 9 |
| induccion.comando | 23 | 100 | 12 | 11 | 0 | 0 | 0 |
| induccion.modulacion | 87 | 94 | 40 | 44 | 0 | 0 | 3 |
| induccion.supresion | 12 | 100 | 7 | 5 | 0 | 0 | 0 |
| induccion.estabilizacion | 11 | 82 | 7 | 0 | 4 | 0 | 0 |
| induccion.reconfiguracion_mnemonica | 10 | 100 | 3 | 7 | 0 | 0 | 0 |
| induccion._comunes | 12 | 100 | 8 | 0 | 0 | 0 | 4 |
| hipercongnicion.sondeo_no_local | 25 | 100 | 18 | 4 | 2 | 0 | 1 |
| hipercongnicion.precognicion | 25 | 100 | 8 | 0 | 16 | 0 | 1 |
| hipercongnicion.retrocognicion | 21 | 100 | 15 | 4 | 0 | 0 | 2 |
| hipercongnicion._comunes | 6 | 100 | 2 | 0 | 0 | 0 | 4 |
| traslacion.anclaje | 20 | 90 | 14 | 1 | 4 | 0 | 1 |
| traslacion.trasladar | 16 | 75 | 12 | 3 | 1 | 0 | 0 |
| traslacion.proyeccion | 15 | 93 | 10 | 3 | 1 | 0 | 1 |
| traslacion.proeza | 8 | 75 | 6 | 1 | 1 | 0 | 0 |
| traslacion.sensor | 9 | 100 | 4 | 2 | 2 | 0 | 1 |
| traslacion._comunes | 20 | 90 | 16 | 0 | 0 | 0 | 4 |
| contencion.contencion | 67 | 87 | 38 | 0 | 29 | 0 | 0 |
| contencion._comunes | 13 | 100 | 8 | 0 | 2 | 0 | 3 |
| singularidad.impulso | 17 | **59** | 14 | 2 | 0 | 0 | 1 |
| singularidad.expansion | 19 | **37** | 17 | 0 | 0 | 1 | 1 |
| singularidad.convergencia | 17 | **47** | 15 | 1 | 0 | 0 | 1 |
| singularidad._comunes | 14 | **57** | 12 | 0 | 0 | 0 | 2 |

Lo peor cubierto es Singularidad, porque las pruebas encadenadas del objetivo (esquiva de área, empuje, Fortaleza contra llamarada) no tienen campo en el modelo.

### 1.3 Qué impide el 100 %

**Efectos en "pregunta" (5)**

| Claim | Texto | Por qué |
|---|---|---|
| resonancia._comunes#7 | "El nivel de Resonancia será determinante ante barreras semánticas/biológicas" | No dice cómo influye el nivel |
| resonancia._comunes#10 | "Resonar con una supercomputadora puede quemar las sinapsis" | Riesgo sin mecánica |
| resonancia._comunes#11 | "Códigos abiertos y códigos encriptados" | No dice qué cambia |
| resonancia._comunes#33 | nv4: combinar alerta por resonancia con la normal, mejor tirada +2 | ¿Es ventaja o una mecánica distinta? |
| singularidad.expansion#2 | "Su fuerza decae con la distancia" | ¿Sabor o reducción de daño sin cuantificar? |

**Efectos con `campoNuevo` sin consolidar (103), agrupados por campo** (detalle en §4.2)

| Campo nuevo | Claims |
|---|---|
| Pruebas encadenadas (`resistencia.pruebas[]`, `Resultado.salvacion`) | 25 (modulacion #20/#52/#84; sondeo #23/#25; precog #25; retro #19; impulso #8–#12; expansion #7–#15; convergencia #12–#15) |
| Modificador aditivo por opción o regla (`Opcion.ajusteDificultad`, `Regla.condicion`, `resolucion.modificador`…) | 16 (rastreo #4/#14–#16; alerta #12; induccion._comunes #12; sondeo #11–#14; precog #5; retro #10–#13; proyeccion #11) |
| Extensiones de `ModificadorFatiga` (alcance.opcion, desdeNivelPoseido, condicion) | 8 (rastreo #8/#11; resonancia._comunes #26; anclaje #12; traslacion._comunes #17/#20; contencion #19/#57) |
| `AccionPoder.notas` | 7 (sincronia #8/#18/#19; impulso #13; convergencia #6/#7/#9) |
| Valores que no son alcance (`objetivo`, `desplazamiento`, `Valor.porAplicado`) | 7 (impulso #4; expansion #4/#5; convergencia #3; trasladar #4/#13; traslacion._comunes #14) |
| `ajustesPorNivelPoseido[].siOpcion` | 6 (contencion #40/#48/#50/#57/#61/#64) |
| Sobrecarga estructurada | 6 (singularidad._comunes #4–#9) |
| `Opcion.cambia.resistencia` | 5 (sincronia #12; trasladar #8; impulso #16; expansion #18/#19) |
| `bonoATirada` / `requiere` / `bloqueadaSi` | 5 (estabilizacion #8/#11; trasladar #1; proyeccion #2; alerta #3) |
| Suplementos de fatiga (`fatigaExtra`, `fatigaPorObjetivo`, `porUnidad.exentos`) | 4 (proeza #4; anclaje #18; modulacion #86/#87) |
| `Disciplina.modificadoresEconomia` | 3 (resonancia._comunes #22/#31/#42) |
| `efectoDirecto` | 2 (contencion #8/#9) |
| Uno por campo: `costeDanio`, habilidad alternativa, `permiteFatigaTemporal`, `alcanceLocal`, `Disciplina.ventajas`, `resultadosDe`, `ejes[].desdeNivel`, `resistencia.conDisciplina`, `resolucion.opcional`, `accionesDerivadas`, `ignoraBlindaje` fracción | 11 |

---

## 2. Checklist del modelo

Leyenda: **✓** relleno · **–** no aplica (null o vacío con motivo) · **✗** falta (la prosa lo implica y no está, o está en `{manual}`/pregunta) · **~** relleno pero con supuesto o pregunta abierta.

### 2.1 Disciplinas

| Disciplina | rama | requisito | porNivel | reglas | modificadoresFatiga | extra |
|---|---|---|---|---|---|---|
| Resonancia | ✓ metasensoria | – | ✓ 6 filas (fatiga/economía/alcance) | ✓ 8 | ✓ 3 (nv3/nv5/nv6) | `alcanceLocal`, `modificadoresEconomia` (3), `ventajas` |
| Inducción | ✓ | ✓ Resonancia 1 | ~ solo alcance 20·N | ✓ 11 | – | — |
| Hipercongnición | ✓ | ✓ Resonancia 2 | ✗ vacío (¿falta la tabla?) | ✓ 3 | – | — |
| Traslación | ✓ métrica | – | ✓ 6 filas (fatiga/alcance/carga `{manual}`) | ✓ 4 | ~ 3 con condición declarada | — |
| Contención | ✓ | ✓ Traslación 1 | ~ sin fila de nivel 2 | ✓ 2 | ~ 2 (con `alcance.opcion`) | — |
| Singularidad | ✓ | ✓ Traslación 2 | – (fatiga = N) | ✓ 3 | – | — |

### 2.2 Acciones

Columnas: desde = desdeNivel · eco = economía · fat = fatiga · alc = alcance · dur = duración · res = resolución · pObj = porObjetivo · resist = resistencia · ejes · rdos = resultados · vent = ventaja · aNP = ajustesPorNivelPoseido · man = manual · mot = motor.

| Acción | desde | eco | fat | alc | dur | res | pObj | resist | ejes | rdos | vent | aNP | man | mot |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Sincronía | ✓1 | ✓tabla | ~tabla | ✓tabla | – | ✓sin_dado | ✓sint | ✓ | ✓4 | ~solo en agresivo | – | – | – | ✓ |
| Rastreo | ✓1 | ✓tabla | ✓tabla | ✓tabla | – | ✓ | ✓sint | ~(¿resiste?) | ✓3 | ✗solo éxito | – | – | – | ✓ |
| Leer mente | ✓1 | ✓estándar | ~1 | ✓tabla | ✓10 | ✓enfr | ✗sint | ✓ | ✓2 | ✓4 | – | – | ✓3 | ✓ |
| Alerta | ✓1 | ~gratuita | ✓0 | ~20·N | – | ✓ | ✓sint | ✓ | ✓forma | ✗solo éxito | ✓nv4 | ✓nv4 | ✓2 | ✓ |
| Vínculo | ✓1 | ✓compleja | ✓1 | ~1·N | ~10·N | ✓sin_dado | – | – | ✓nivel | – | – | ✓nv4 | ✓2 | ✓ (+derivada) |
| Comando | ✓1 | ✓estándar | ✓1+adic | ✓tabla | – | ✓enfr | ✓sint | ✓3 | ✓3 | ✓4 | – | – | – | ✓ |
| Modulación | ✓1 | ✓compleja | ✓N | ✓tabla | – | ✓enfr | ~(por opción) | ✓3 | ✓4 | ✓por opción | – | ✓nv2/nv6 | – | ✓ |
| Supresión | ✓1 | ✓compleja | ✓1 | ✓tabla | ✓10 | ✓dif10 | ✓sint | – | ✓2 | ✓ | – | ~nv2/nv4 | – | ✓ |
| Estabilización | ✓1 | ✓simple | ✗`{manual}` | – (propio) | ✓10 | ~dif6 | – | – | ✓2 | ✓por opción | – | ✓8 | ✓1 | ✓ |
| Reconf. Mnemónica | ✓3 | ✓compleja | ✓2 | ✓tabla | ✗(¿prolongado?) | ~enfr | ✓sint | ✓3 | ✓nivel | ✓4 | – | – | – | ✓ |
| Sondeo No-Local | ✓1 | ✓por tramo | ✓por tramo | ~`{manual}` | ~N | ✓ | – | – | ✓3 | ✓4 | – | ✓11 | ✓2 | ✓ |
| Precognición | ✓1 | ✓estándar | ✓1 | ✓10·N | ✓N | ✓dif8 | – | – | ✓2 | ✓4 | – | – | ✓4 | ✓ |
| Retrocognición | ✓1 | ✓por tramo | ✓por tramo | ✓10·N | ✗(¿instantánea?) | ✓ | – | – | ✓3 | ✓4 | – | ✓10 | – | ✓ |
| Anclaje | ✓1 | ✓estándar | ✓tabla×obj | ✓tabla | ~N | ✓enfr | – | ✓+conDisc | ✓3 | ✗solo éxito | – | ✓nv4 | ✓4 | ✓ |
| Trasladar | ✓1 | ✓simple | ✓tabla | ✓tabla | – | ~sin_dado | – | – (en opción) | ✓4 | ✗solo éxito | – | ✓nv4/nv6 | ✓2 | ✓ |
| Proyección | ✓1 | ✓simple | ~1 | ✓20·N | – | ✓ataque | – | ✓ | ✓4 | ✗solo éxito | – | – | ✓2 | ✓ |
| Proeza | ✓1 | ✓compleja | ✗`{manual}`+extra | ✓tabla | – | ~enfr | – | ✓ | ✓4 | ✗solo éxito | – | – | ✓2 | ✓ |
| Sensor | ✓1 | ✓estándar | ~1 | ~2·N | ✓N | ✓sin_dado | – | – | ✓2 | – (efectoDirecto) | – | – | ✓1 | ✓ |
| Contención | ✓1 | ✓simple | ✓tabla | – (personal) | ✓10 | ✓sin_dado | – | – | ✓2 | – | – | ✓9 | ✓10 | ✓ |
| Confrontar | ✓1 | ✓reacción | ~0 | – | – | ✓sin_dado | – | – | ✗(¿nivel?) | ✓(efectoDirecto) | – | – | ✓1 | ✓ |
| Sumarse | ~2 | ✗sin especificar | ✓1 | ✓+1 casilla | – | ✓sin_dado | – | – | – | – | – | – | ✓1 | ✓ |
| Impulso | ✓1 | ✓estándar | ✓N | ✓20·N | – | ✓ataque | – | ✓+pruebas | ✓2 | ~sin fr. crítico | – | – | – | ✓ |
| Expansión | ✓1 | ✓estándar | ✓N | ✓20·N | – | ~(¿dif. casilla?) | – | ✓+pruebas | ✓2 | ~sin fr. crítico | – | – | – | ✓ |
| Convergencia | ✓1 | ✓estándar | ✓N | ✓15·N | – | ✓ataque | – | ✓+pruebas | ✓2 | ~sin fr. crítico | – | – | – | ✓ |

`motor` de Inducción y de Singularidad venía vacío en la propuesta. En el JSON se ha completado con la entrada estándar `accion_sin_equipo` bloqueada.

---

## 3. Campos del modelo que leerá la tubería

### 3.1 `camposModelo` (ordenados por nº de items)

| Campo | Items | Qué hace la app |
|---|---|---|
| `ejes[]` (nivel_empleado / opción / contador) y `opciones.*.{desdeNivel, cambia}` | 19 | Un control por eje en el modal: selector 1..poseído, radio filtrado por `desdeNivel` y stepper. La opción elegida hace merge de `cambia` sobre la acción **antes** de resolver "tabla" y antes de la cadena de fatiga (`cambia.fatiga` sustituye la base) |
| `resolucion` + `porObjetivo` | 16 | `sin_dado` genera una AccionDirecta; tirada/enfrentada/ataque generan una Accion. `porObjetivo` añade un selector orgánico/sintético que hace merge parcial |
| `fatiga` (Valor, porNivel, porUnidad) | 13 | Evalúa el Valor con N y los contadores para obtener el coste base, que pasa por la cadena ModificadorFatiga y se muestra en el desglose; se aplica `ajustarFatiga` al confirmar |
| `economia` | 13 | Etiqueta informativa tras opción, ajustesPorNivelPoseido y cadena de economía. No descuenta acciones del turno |
| `alcance` / `duracion` | 13 | Evalúa el Valor y lo pinta como texto. La duración alimenta `rondasRestantes` si hay EstadoActivo |
| `resultados.{grado}.{texto, estados, danio}` | 10 | Tras `resolverTirada` pinta el Resultado del grado. Estados: "aplica X durante N" (en combate, botón para crear el EstadoActivo). Daño propio: `ajustarVida` |
| `ajustesPorNivelPoseido[]` | 9 | Al generar la acción aplica, en orden de desdeNivel, los ajustes con desdeNivel ≤ nivel poseído. `{manual}` se vuelca a la nota |
| `Disciplina.reglas[]` | 9 | Nota en toda acción incluida en `aplica`. Las que llevan número (interferencias, sobrecarga) necesitan su dato estructurado |
| `Disciplina.porNivel[N]` y campos "tabla" | 6 | Con N elegido, lee la fila (sustituye, no acumula). La fatiga entra como base en la cadena |
| `Disciplina.rama` / `requisito` / `desdeNivel` | 5 | La rama da el subgrupo de "Psiónica". El requisito es un gate de compra (creacion.ts). desdeNivel decide si se emite la acción |
| `resolucion.danio` + `categoria` | 4 | `Accion.ataque` con danioBase evaluado, que pasa a `resolverDanio` |
| `resistencia` | 5 | Texto para el objetivo: orgánico / psiónico entrenado (Biociencia ≥ 1) / sintético; salvación con la dificultad evaluada |
| `Disciplina.modificadoresFatiga[]` | 1 | Entran en la cadena global cuando el nivel poseído alcanza la fuente, filtrados por alcance |
| `ventaja` | 1 | 2d12, se queda el mejor, con los dos dados a la vista |

### 3.2 `camposNuevos` propuestos

| Campo | Forma | Motivo | Claims |
|---|---|---|---|
| Pruebas encadenadas | `resistencia.pruebas[] {id,label,aplicado,habilidad?,dificultad,porExito?,resultados}`; `Resultado.salvacion {aplicado,habilidad?,dificultad \| 'dificultad_prueba',sobre,evita?,exito?,fracaso?}` | `salvacion` no lleva habilidad, ni grados, ni efecto por éxito, y solo admite una | 25 |
| Modificador aditivo | `Opcion.ajusteDificultad`, `Opcion.cambia.modificador`, `Regla.condicion: CondicionTirada`, `resolucion.modificador` | Interferencias, −4 fuera de alcance local y −2 de Puntería **suman**, y `cambia` solo sustituye | 16 |
| Extensiones de ModificadorFatiga | `alcance.opcion {eje,opcion}`, `desdeNivelPoseido`, `condicion {declarada}` | Filtrar por opción de eje, por nivel poseído explícito y por condiciones que declara el jugador (carga < 10 kg, nivel ≥ rival + 2) | 8 |
| `AccionPoder.notas` | `string[]` que se vuelca a `Accion.nota` | Avisos fijos (precondiciones, ignora cobertura, ignora escudo) | 7 |
| `objetivo` / `desplazamiento` / `Valor.porAplicado` | `{tipo:'unico'\|'casilla'\|'varios', area?}`, `Valor`, `{aplicado, valor}` | Blanco, área, metros recorridos, carga 25 kg × Perspicacia | 7 |
| `ajustesPorNivelPoseido[].siOpcion` | `{eje, opcion}` | Ampliaciones de Contención que valen para un nivel **y** una forma | 6 |
| Sobrecarga estructurada | `{umbral:'exhausto', estadoPropio, salvacion 5+N, danio N letal no absorbible, multiplicadorPorGrado 0/0,5/1/2}` | Es común a toda la psiónica y merece un dato único | 6 |
| `Opcion.cambia.resistencia` | `Partial<resistencia>` | Resistencia que solo existe en un modo, o que la versión "Poderosa" sube | 5 |
| `bonoATirada` / `requiere` / `bloqueadaSi` | `{alcance, valor, soloEconomia?}` / `{accion, estado}` / `{estado}[]` con arbitraje | +N en Salvaciones (Estabilización); objetivo anclado; Alerta pasiva exhausto | 5 |
| Suplementos de fatiga | `fatigaExtra: Valor`, `fatigaPorObjetivo: boolean`, `porUnidad.exentos` | Hoy `fatiga` es "tabla" **o** un Valor, y `porUnidad` no multiplica la tabla | 4 |
| `Disciplina.modificadoresEconomia` | `{fuente, desdeNivelPoseido, alcance, op:'baja_un_paso'\|'sustituye', valor?}[]` | Resonancia nv2/nv4/nv6 afecta a toda la disciplina | 3 |
| `efectoDirecto` | `Resultado` para acciones sin dado | Confrontar hace daño N al objeto | 2 |
| `costeDanio` | `{valor, categoria}` en acción u opción | Daño propio fijo del mensaje agresivo | 1 |
| Habilidad alternativa | `habilidad: HabilidadId \| HabilidadId[]` | "Biociencia o Actitud" | 1 |
| `permiteFatigaTemporal` + `Sheet.fatigaTemporal` | `true`; `number` | Solo Proeza | 1 |
| `Disciplina.alcanceLocal` | `{alcance, economia, fatiga?}` | Fila especial de Resonancia | 1 |
| `Disciplina.ventajas` | `{desdeNivelPoseido, accion, condicion}[]` | Ventaja también en la Buscar/percibir ordinaria | 1 |
| `resolucion.resultadosDe` | `'objetivo'\|'psionico'` | En Inducción los grados se narran desde el objetivo | 1 |
| `ejes[].desdeNivel` | `number` | El contador de objetivos de Comando existe desde nv3 | 1 |
| `resistencia.conDisciplina` | `{disciplina, par, fatiga, economia?}` | Duelo de Métrica | 1 |
| `resolucion.opcional` | `true` | Auto-anclaje, "si el narrador lo exige" | 1 |
| `accionesDerivadas` | `AccionPoder[]` | "Alertar por vínculo" | 1 |
| `resolucion.ignoraBlindaje` fracción | `number \| {fraccion}` | Convergencia ignora la mitad | 1 |

---

## 4. Capas de motor (por nº de items que desbloquean)

| Capa | Amplía a | Items | Efectos | Depende de |
|---|---|---|---|---|
| **C01** Generador de Acciones desde AccionPoder | `generaAccionPropia`/REGISTRO (combate.ts), `fuentesDeCapa1`, `Accion`/`AccionDirecta`, grupo "Psiónica" | 27 | 26 | — |
| **C05** Gasto de fatiga al confirmar con cadena ModificadorFatiga | `ajustarFatiga` (vitalidad.ts) + patrón `gastoTotal/gastoActivo` | 22 | 34 | C01, C02, C03 |
| **C08** Resolución del poder (tirada/enfrentada/ataque, porObjetivo, resistencia texto) | `Accion` + `resolverTirada`; generaliza `sustitucion_aplicado` | 19 | 34 | C01, C02 |
| **C02** Selector de nivel empleado + tabla porNivel + evaluación de Valor | nuevo (el modal no reescribe la acción) | 17 | 56 | C01 |
| **C03** Ejes opción/contador sustitutivos | `CondicionTirada` opción/contador con `cambia` | 16 | 60 | C02 |
| **C04** Ajustes por nivel poseído + cadena de economía | nuevo | 10 | 31 | C02, C03 |
| **C09** Resultados por grado | `efectoCritico`/`efectos` + ResultadoTirada.tsx | 10 | 38 | C08 |
| **C10** Pruebas encadenadas | nuevo | 10 | 33 | C08, C09 |
| **C11** Estados con duración infligidos | `EstadoActivo`, `descontarDuracion`, catálogo de estados | 10 | 38 | C09, C02 |
| **C16** Habilitador/deshabilitador (tipo 5) | `bloqueada` + `gate_instalacion` con arbitraje | 9 | 4 | C01 |
| **C14** Modificadores aditivos a la tirada del poder | `CondicionTirada` + `ajustesFijos` | 7 | 16 | C01 |
| **C12** Ataque psiónico con daño parametrizado | `Accion.ataque`, `resolverDanio`, `ignoraBlindaje` | 5 | 11 | C08, C02 |
| **C17** Efectos activos propios con duración (a mano, §10.6) | `EstadoActivo` + Modificador sobre la ficha propia | 5 | 20 | C01, C11 |
| **C06** Sobrecarga al cruzar exhausto | `umbralFatiga` + `ajustarVida` | 4 | 8 | C05, C10 |
| **C13** Daño propio | `ajustarVida` | 4 | 3 | C09, C05 |
| **C18** Mantenimiento/concentración (a mano, §10.6) | nuevo | 4 | 6 | C05, C17 |
| **C15** Ventaja genérica | `resolverTirada`/`tirarD12` + nuevo Modificador | 2 | 3 | C01 |
| **C07** Fatiga temporal (Proeza) | `Sheet.fatigaActual`, `umbralFatiga` | 1 | 2 | C05, C06 |
| **C19** Acciones derivadas de efecto activo | `AccionDirecta` | 1 | 1 | C17, C16 |

Camino crítico: **C01 → C02 → C03 → C05/C08.** Con esas cinco capas quedan en pie todas las acciones con coste y tirada. El resto se reduce a resultados, pruebas encadenadas y estados.

---

## 5. Por disciplina y acción

Formato de la terna de motor: `tipo · afecta(modo:id) · mecanismo · estado`. En la tabla de efectos se agrupan en una fila los claims que comparten terna y destino. Los marcados **(corr.)** se corrigieron en la verificación.

### 5.1 Resonancia (metasensoria)

**Tabla común (nivel empleado):**

| N | Alcance (km², unidad dudosa) | Acción/tiempo | Fatiga |
|---|---|---|---|
| 1 | 10 | Compleja | 1 |
| 2 | 100 | 1 minuto | 2 |
| 3 | 2 000 | 1 minuto | 3 |
| 4 | 10 000 | 10 minutos | 4 |
| 5 | 200 000 | 10 minutos | 6 |
| 6 | 1 000 000 | 1 hora | 8 |
| Local | 1 | Estándar (reacción desde poseído 3 en Sincronía, Rastreo y Leer mente) | ¿? |

**Ajustes por nivel poseído (disciplina):** nv2 baja un paso la economía de lo empleado a N1 · nv3 −1 fatiga en N≤2 · nv4 N2 pasa a compleja; ventaja en Alerta; combinar alertas (+2); Vínculo pasa a estándar · nv5 −1 fatiga en N3–4 · nv6 −1 fatiga en N4–5; N4 pasa a 1 minuto.

**MATRIZ poseído × N (acciones "tabla": Sincronía, Rastreo). Fatiga efectiva / economía** (supuesto: los descuentos se acumulan y el mínimo es 0; ambas cosas están preguntadas)

| Poseído \ N | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| 1 | 1 / compleja | | | | | |
| 2 | 1 / estándar | 2 / 1 min | | | | |
| 3 | **0** / estándar | 1 / 1 min | 3 / 1 min | | | |
| 4 | 0 / estándar | 1 / **compleja** | 3 / 1 min | 4 / 10 min | | |
| 5 | 0 / estándar | 1 / compleja | **2** / 1 min | **3** / 10 min | 6 / 10 min | |
| 6 | 0 / estándar | 1 / compleja | 2 / 1 min | **2** / **1 min** | **5** / 10 min | 8 / 1 h |

A esto se suman los costes propios de modo u opción (Sincronía: gratuita / estándar + 1 / compleja + 1·N; Rastreo: +1 indirecto, +4 desconocido). **Está pendiente saber si sustituyen a la tabla o se suman a ella.**

#### Sincronía — `psi_resonancia_sincronia`

- **Ejes:** nivel (N) · alcance {tabla | local: 1 km² estándar | local reacción (poseído 3)} · mensaje {datos simples: gratuita | datos complejos: estándar, 1 fat. | agresivo: compleja, 1·N fat., −1 nivel de daño mental propio, enfrentada Expresión + (Biociencia\|Actitud)} · barrera {sin | con: Expresión + Biociencia, dificultad 4/7/10 a criterio del máster}.
- **Por objetivo sintético:** Expresión + Tecnociencia (Informática).
- **Resistencia (agresivo):** Voluntad + Actitud; psiónico entrenado: Voluntad + Biociencia.
- **Coste efectivo por modo:** simple 0·/gratuita · complejo 1 / estándar · agresivo N (N1 1, N2 2 … N6 6; la tabla da 6 y 8 en N5–6, preguntado).

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1 | narrativo | — |
| #2–#7, #9, #10, #12–#17 | parametro: alcance, ejes, fatiga, ejes.modo.*, ejes.barrera.*, porObjetivo.sintetico | accion · nueva:psi_resonancia_sincronia · accion_sin_equipo · bloqueado |
| #11 | parametro (campoNuevo `costeDanio`) | ídem |
| #8, #18, #19 | parametro (campoNuevo `notas`) | texto · existente:psi_resonancia_sincronia / social · nota_fija · bloqueado |

#### Rastreo — `psi_resonancia_rastreo`

- **Ejes:** nivel · alcance (igual que Sincronía) · objetivo {familiar: dificultad 6 | indirecto: dificultad 9, tiempo ×2, +1 fat. | desconocido: dificultad 12, tiempo ×10, +4 fat.}.
- **Resolución:** Perspicacia + Biociencia (sintético: Tecnociencia (Informática)).
- **Coste efectivo:** matriz de Resonancia + 0 / +1 / +4.
- **Interferencias** (regla de disciplina): +2 / +4 / +6 a la dificultad.

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1, #12, #13 | narrativo | — |
| #2–#7, #9, #10 | parametro: resultados.exito, resolucion, ejes.conocimiento.* | accion · nueva:psi_resonancia_rastreo · accion_sin_equipo · bloqueado |
| #8, #11 | parametro (campoNuevo ModificadorFatiga.alcance.opcion) | ídem |
| #14–#16 | disciplina.reglas.interferencias (campoNuevo `Regla.condicion`) | numerico · existente:psi_resonancia_* · eleccion_jugador · bloqueado |
| #17 | disciplina.reglas.interferencias | texto · existente:psi_resonancia_* · nota_fija · bloqueado |

#### Leer mente — `psi_resonancia_leer_mente`

- **Ejes:** nivel (solo alcance) · alcance {tabla | local | local reacción (poseído 3)}.
- **Coste:** estándar, 1 fat. (fijo, choca con la tabla), 10 turnos.
- **Resolución:** enfrentada Perspicacia + Biociencia contra Voluntad + Actitud (o Biociencia).
- **Resultados:** los 4 grados. **Manual:** mantenimiento, +2 en enfrentadas y +2 social.

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1–#5, #8, #9 | parametro: label, economia, fatiga, resolucion, resultados.* | accion · nueva:psi_resonancia_leer_mente · accion_sin_equipo · bloqueado |
| #6 | manual | narrativo · — · — · ad_hoc |
| #7 **(corr.)** | manual | numerico · existente:todas · eleccion_jugador · ad_hoc |
| #11 | manual | numerico · existente:social · eleccion_jugador · ad_hoc |
| #10 | parametro: resultados.fracasoCritico | texto · tercero:percibir_intrusion_psionica · nota_fija · bloqueado |
| #12 | narrativo | — |

#### Alerta por resonancia — `psi_resonancia_alerta`

- **Ejes:** forma {pasiva: 20·N m (¿poseído?), gratuita, 0 fat., dificultad 6 | activa: 1 km², 1 fat., dificultad 8, economía sin especificar}.
- **Resolución:** Perspicacia + Biociencia / Tecnociencia (sin especialidad, corregido).
- **Nv4 poseído:** ventaja (2d12) y combinar con la alerta normal (mejor tirada +2).
- **Bloqueo:** la pasiva no funciona si estás exhausto (arbitraje pendiente).

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1, #2, #4, #6, #8–#10 | parametro: ejes.forma, alcance, resolucion, resultados.exito, ejes.forma.opciones.1.* | accion · nueva:psi_resonancia_alerta · accion_sin_equipo · bloqueado |
| #3 | parametro (campoNuevo `bloqueadaSi`) | habilitador · nueva:psi_resonancia_alerta · gate_instalacion · bloqueado (arbitraje pendiente) |
| #5 | parametro: resistencia | texto · tercero:sigilo · nota_fija · bloqueado |
| #7 **(corr.)** | resultado_texto: resultados.exito.texto | texto · existente:defensa · nota_fija · ad_hoc |
| #11 | parametro: ventaja | numerico · existente:alerta_activa · hueco (ventaja) · bloqueado |
| #12 | disciplina.reglas.interferencias | numerico · existente:psi_resonancia_alerta · eleccion_jugador · bloqueado |

#### Vínculo — `psi_resonancia_vinculo`

- **Coste:** compleja (estándar desde poseído 4), 1 fat., sin dado.
- **Alcance:** 1 km² × "punto de poder". **Duración:** 1 min × N = 10·N turnos (corregido).
- **Acción derivada:** `psi_resonancia_vinculo_alertar` (reacción, 0 fat.).
- **Manual:** +1 a Voluntad y alerta pasiva compartida.

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1, #2, #7, #8 | parametro: economia, fatiga, duracion, alcance | accion · nueva:psi_resonancia_vinculo · accion_sin_equipo · bloqueado |
| #3 | narrativo | — |
| #4 | manual | numerico · existente:salv_voluntad · eleccion_jugador · ad_hoc |
| #5 | manual | texto · tercero:alerta_activa · nota_fija · ad_hoc |
| #6 | parametro (campoNuevo `accionesDerivadas`) | accion · nueva:psi_resonancia_vinculo_alertar · accion_sin_equipo · bloqueado |

#### Comunes de Resonancia

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1–#4, #6, #9, #12, #13 | narrativo | — |
| #5 | narrativo (reglas.barrera_semantica) | — |
| #7, #10, #11 | **pregunta** | — |
| #8 | disciplina.reglas.puente_biosintetico | habilitador · existente:psi_resonancia_* · gate_instalacion · bloqueado (arbitraje pendiente) |
| #14–#16, #19–#21, #23–#25, #28–#30, #35–#37, #39–#41 | disciplina.porNivel.* | accion · existente:psi_resonancia_* · accion_sin_equipo · bloqueado |
| #17 | campoNuevo `alcanceLocal` | ídem |
| #18 | disciplina.reglas.induccion_en_local | habilitador · existente:psi_induccion_* · gate_instalacion · bloqueado |
| #22, #31, #42 | campoNuevo `modificadoresEconomia` | accion · existente:psi_resonancia_* · accion_sin_equipo · bloqueado |
| #26, #38, #43 | disciplina.modificadoresFatiga.0/1/2 | ídem |
| #27 | ejes.alcance.opciones.2 | accion · existente:psi_resonancia_sincronia · accion_sin_equipo · bloqueado |
| #32 | ajustesPorNivelPoseido.0 (Vínculo) | accion · existente:psi_resonancia_vinculo · accion_sin_equipo · bloqueado |
| #33 | **pregunta** | numerico · existente:alerta_activa · hueco (combinar dos tiradas) · bloqueado |
| #34 | campoNuevo `Disciplina.ventajas` | numerico · existente:alerta_activa · hueco (ventaja) · bloqueado |

### 5.2 Inducción (metasensoria, requiere Resonancia 1)

- **Prueba base:** Expresión + Biociencia (orgánico) / Perspicacia + Tecnociencia (Informática) (sintético).
- **Resistencia:** Voluntad + Actitud · Voluntad + Biociencia (psiónico entrenado) · Perspicacia + Informática (sintético).
- **Alcance:** 20 m × N. Se combina con el alcance local de Resonancia.
- **Nv5 poseído:** sugestión fuera del alcance local vía Resonancia, con −4.
- **Grados:** en las enfrentadas se leen **desde el objetivo** (`resultadosDe: 'objetivo'`).

#### Comando — `psi_induccion_comando`

- **Ejes:** nivel · modo {orden: estándar | orden por reacción (poseído 2), solo para evitar un ataque} · contador de objetivos adicionales (el eje existe desde poseído 3).
- **Coste:** 1 + 1 por objetivo adicional (¿cuenta el primero? preguntado).

| Poseído | Opciones | Coste efectivo |
|---|---|---|
| 1 | orden | estándar, 1 |
| 2 | + orden por reacción | reacción, 1 (¿?) |
| 3–6 | + varios objetivos (misma orden) | estándar, 1 + k adicionales |

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1–#4 | parametro: porObjetivo, fatiga, economia, resolucion | accion · nueva:psi_induccion_comando · accion_sin_equipo · bloqueado |
| #5, #7–#11 | resultado_texto: resultados.* (#5 con campoNuevo `resultadosDe`) | ídem |
| #6 | resultado_texto: resultados.exito | texto · tercero:siguiente_tirada · nota_fija · bloqueado |
| #12–#14 | disciplina.reglas.acciones_extremas | texto · tercero:resistencia_comando · nota_fija · bloqueado |
| #15, #18–#20 | ejes.modo.opciones.1.* | accion · existente:psi_induccion_comando · accion_sin_equipo · bloqueado |
| #16, #22 | label / reglas.orden_identica | texto · existente:psi_induccion_comando · nota_fija · bloqueado |
| #17 | resultado_texto (reacción, éxito) | texto · tercero:ataque_<familia>_<instancia> · nota_fija · bloqueado |
| #21 | ejes.objetivos_adicionales (campoNuevo `ejes[].desdeNivel`) | accion · existente · accion_sin_equipo · bloqueado |
| #23 | fatiga.porUnidad | ídem |

#### Modulación — `psi_induccion_modulacion`

- **Ejes:** nivel · estado {Sopor, Miedo, Hipomanía (orgánico); Latencia, Cisma Lógico (sintético, resolución Perspicacia + Informática); Delirio, Manía (poseído 3); Cautiverio (poseído 5)} · blancos {uno | varios (poseído 4): compleja, +1/objetivo} · contador de objetivos.
- **Coste:** N de fatiga; compleja, que pasa a estándar desde poseído 2.

**MATRIZ poseído × opciones (coste efectivo a N empleado)**

| Poseído | Estados disponibles | 1 objetivo | Varios (k adicionales) |
|---|---|---|---|
| 1 | Sopor, Miedo, Hipomanía, Latencia, Cisma | compleja, N | — |
| 2 | ídem | **estándar**, N | — |
| 3 | + Delirio, Manía | estándar, N | — |
| 4 | ídem | estándar, N | compleja, N + k |
| 5 | + Cautiverio | estándar, N | compleja, N + k |
| 6 | ídem | estándar, N | compleja, N + max(0, objetivos − nivel) (¿N o poseído?) |

| Claims | Destino / ruta | Motor |
|---|---|---|
| #3, #5, #32 | narrativo | — |
| #1, #2, #6, #16, #23, #33, #44 | parametro: economia, fatiga, ejes.estado.opciones.N | accion · nueva:psi_induccion_modulacion · accion_sin_equipo · bloqueado |
| #7–#15, #17–#19, #21, #22, #26, #34, #37, #38, #40–#42, #45, #47, #49–#51, #53 | parametro/resultado_texto: ejes.estado.opciones.{0..4}.cambia.resultados.* | ídem |
| #55–#65, #69, #71–#83, #85 | parametro/resultado_texto: opciones 5–7 (Delirio, Manía, Cautiverio) | accion · existente:psi_induccion_modulacion · accion_sin_equipo · bloqueado |
| #54, #73, #74 | ajustesPorNivelPoseido.0, ejes.blancos.opciones.1 | ídem |
| #86, #87 | campoNuevo `porUnidad.exentos` | ídem |
| #4, #75 | reglas.percibir_psionico / mismo_estado | texto · existente · nota_fija · bloqueado |
| #20, #84 | campoNuevo `Resultado.salvacion` | texto · tercero:salv_fortaleza · nota_fija · bloqueado |
| #52 | campoNuevo `Resultado.salvacion` | texto · tercero:salir_bloqueo_cisma · nota_fija · bloqueado |
| #24, #39, #43 | resultado_texto | texto · tercero:todas · nota_fija · bloqueado |
| #25 | resultado_texto | texto · tercero:salv_fortaleza · nota_fija · bloqueado |
| #27, #30 | resultado_texto | texto · tercero:resistir_efectos_emocionales · nota_fija · bloqueado |
| #28, #29 | resultado_texto | texto · tercero:acciones_concentracion · nota_fija · bloqueado |
| #31 | reglas.hipomania_estres | texto · tercero:resistencia_induccion · nota_fija · bloqueado |
| #35 / #36 | resultado_texto | texto · tercero:acciones_fisicas / acciones_procesamiento · nota_fija · bloqueado |
| #46, #48 | resultado_texto | texto · tercero:iniciativa · nota_fija · bloqueado |
| #66 / #67, #70 / #68 | resultado_texto | texto · tercero:ataque_melee_<instancia> / defensa / salv_voluntad · nota_fija · bloqueado |

#### Supresión — `psi_induccion_supresion`

- **Coste:** compleja, 1 fat. Tirada contra dificultad 10 (prueba base según el blanco).
- **Ejes:** uso {mitigar: −1/−2 a los penalizadores de estado | salvación: +2 | liberar (poseído 2): sin penalizadores 1 turno}. Los modos salvación y liberar tienen ahora su propio crítico (corregido).
- **Duración por poseído:** 1–10 turnos · 2–3: 100·N turnos · 4+: 300 turnos (se contradice con 100·4 = 400, preguntado).

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1–#4, #8, #9, #11, #12 | parametro: fatiga, economia, porObjetivo, resolucion.dificultad, ajustesPorNivelPoseido, ejes.modo.opciones.2 | accion · nueva/existente:psi_induccion_supresion · accion_sin_equipo · bloqueado |
| #5, #6, #10 | resultado_texto | texto · tercero:todas · nota_fija · bloqueado |
| #7 **(corr.)** | resultado_texto | texto · tercero:salv_* · nota_fija · bloqueado |

#### Estabilización — `psi_induccion_estabilizacion`

- **Ejes:** acción {simple | reacción} · uso {mitigar propios | +salvación inmediata}.
- **Fatiga:** sin especificar (`{manual}`). Dificultad 6.
- **Por poseído:** nv2 10 min · nv4 30 min, omite los penalizadores de daño y fatiga, +3 a la salvación como reacción · nv6 elimina los penalizadores de estado, +4 como reacción. Se añaden los ajustes nv4/nv6 que faltaban y el crítico de mitigar (corregido).

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1–#3, #5, #6 | parametro | accion · nueva/existente:psi_induccion_estabilizacion · accion_sin_equipo · bloqueado |
| #4, #7, #9, #10 | manual | numerico · existente:todas · hueco (buff propio) · ad_hoc |
| #8, #11 **(corr.)** | campoNuevo `bonoATirada` | numerico · existente:salv_* · eleccion_jugador · bloqueado |

#### Reconfiguración Mnemónica — `psi_induccion_reconfiguracion_mnemonica`

- desdeNivel 3, compleja, 2 fat. Enfrentada con la prueba base (supuesto). 4 grados narrados desde el objetivo.

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1–#3 | parametro: desdeNivel, economia, fatiga | accion · nueva · accion_sin_equipo · bloqueado |
| #4–#10 | resultado_texto: resultados.* | ídem |

#### Comunes de Inducción

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1, #4 | parametro: rama, requisito | narrativo |
| #2, #3, #5, #6 | narrativo | — |
| #7–#10 | reglas.prueba_base / resistencia_base, porNivel.alcance | accion · nueva:psi_induccion_<accion> · accion_sin_equipo · bloqueado |
| #11 | reglas.alcance_resonancia | texto · existente · nota_fija · bloqueado |
| #12 | reglas.sugestion_remota (campoNuevo `Opcion.cambia.modificador`) | numerico · existente · eleccion_jugador · bloqueado |

### 5.3 Hipercongnición (metasensoria, requiere Resonancia 2)

- **Sin tabla común** (preguntado).
- **Nivel poseído:** los pares (2/4/6) dan −1 a la dificultad (acumulación supuesta); los impares (3/5) bajan un escalón el tiempo (suelo: estándar).
- **Interferencias:** +0/+2/+4/+6, que ahora **suman** mediante `ajusteDificultad` (corregido).
- **Especialidad:** "Física", normalizada al formato de `ESPECIALIDADES_CONOCIDAS` (§9).

#### Sondeo No-Local — `psi_hipercongnicion_sondeo_no_local`

**MATRIZ poseído × tramo de distancia (dificultad / tiempo / fatiga)**

| Poseído | Local (Resonancia) | ¼ alcance | 2/4 alcance | Máximo |
|---|---|---|---|---|
| 1 | 6-7 / compleja / 1 | 8-9 / 1 min / 1 | 10-11 / 10 min / 2 | 12+ / 1 h / 4 |
| 2 | 5-6 / compleja / 1 | 7-8 / 1 min / 1 | 9-10 / 10 min / 2 | 11+ / 1 h / 4 |
| 3 | 5-6 / **estándar** / 1 | 7-8 / **compleja** / 1 | 9-10 / **1 min** / 2 | 11+ / **10 min** / 4 |
| 4 | 4-5 / estándar / 1 | 6-7 / compleja / 1 | 8-9 / 1 min / 2 | 10+ / 10 min / 4 |
| 5 | 4-5 / estándar / 1 | 6-7 / **estándar** / 1 | 8-9 / **compleja** / 2 | 10+ / **1 min** / 4 |
| 6 | 3-4 / estándar / 1 | 5-6 / estándar / 1 | 7-8 / compleja / 2 | 9+ / 1 min / 4 |

- **Duración:** N turnos; desde poseído 3, 10 turnos. Mantenerla cuesta la misma fatiga por turno (manual).
- **Fracaso:** salvación de Fortaleza 8 o aturdido. **Fracaso crítico:** 1 nivel de daño mental por punto de fatiga y salvación de Fortaleza (dificultad de la prueba) o aturdido. Las salvaciones son condicionales (corregido).

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1 | narrativo | — |
| #2 | parametro: ejes.distancia.opciones.*.fatiga | accion · existente · hueco (gasto de fatiga) · bloqueado |
| #3, #5 | manual | texto · existente · nota_fija · ad_hoc |
| #4, #6–#10, #15–#22, #24 | parametro/resultado_texto: resolucion, ejes, ajustesPorNivelPoseido, duracion, resultados.* (#15 ajuste_fijo) | accion/numerico · nueva/existente:psi_hipercongnicion_sondeo_no_local · accion_sin_equipo · bloqueado |
| #11–#14 | ejes.interferencia.* (campoNuevo `ajusteDificultad`) | numerico · existente · eleccion_jugador · bloqueado |
| #23, #25 | resultados.fracaso/fracasoCritico (campoNuevo `Resultado.salvacion`) | accion · existente · accion_sin_equipo · bloqueado |

#### Precognición — `psi_hipercongnicion_precognicion`

- Estándar, 1 fat., dificultad 8 (+ interferencia). Burbuja de 10·N m durante N turnos.
- **Los cuatro grados** son bonos o penalizadores propios con duración, así que van a **manual** por decisión.
- **Fracaso crítico:** 1 de daño mental propio y salvación de Voluntad 8 contra confusión.

| Poseído | Coste | Dificultad |
|---|---|---|
| 1–6 | estándar, 1 fat. (no escala) | 8 + interferencia |

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1 | narrativo | — |
| #2 | parametro: fatiga | accion · existente · hueco (gasto de fatiga) · bloqueado |
| #3, #4, #6, #7, #24, #25 | parametro: economia, resolucion, alcance, duracion, resultados.fracasoCritico | accion · nueva/existente · accion_sin_equipo · bloqueado |
| #5 | ejes.interferencia (campoNuevo) | numerico · existente · eleccion_jugador · bloqueado |
| #8, #10, #14, #16, #18, #20 | manual | numerico · existente:defensa · eleccion_jugador · ad_hoc |
| #9, #11, #12, #15, #17, #19, #21 | manual | numerico · existente:ataque_fuego_<instancia> · eleccion_jugador · ad_hoc |
| #13, #22 | manual | texto · existente · hueco (economía de reacciones) · ad_hoc |
| #23 | manual | texto · existente · hueco (estado temporal propio) · ad_hoc |

#### Retrocognición — `psi_hipercongnicion_retrocognicion`

**MATRIZ poseído × tramo de tiempo (dificultad / tiempo / fatiga)**

| Poseído | Minutos | 24 h | Semana | Extendido |
|---|---|---|---|---|
| 1 | 6-8 / compleja / 1 | 9-11 / 1 min / 1 | 12-14 / 10 min / 2 | 15+ / 1 h / 4 |
| 2 | 5-7 / compleja / 1 | 8-10 / 1 min / 1 | 11-13 / 10 min / 2 | 14+ / 1 h / 4 |
| 3 | 5-7 / estándar / 1 | 8-10 / compleja / 1 | 11-13 / 1 min / 2 | 14+ / 10 min / 4 |
| 4 | 4-6 / estándar / 1 | 7-9 / compleja / 1 | 10-12 / 1 min / 2 | 13+ / 10 min / 4 |
| 5 | 4-6 / estándar / 1 | 7-9 / estándar / 1 | 10-12 / compleja / 2 | 13+ / 1 min / 4 |
| 6 | 3-5 / estándar / 1 | 6-8 / estándar / 1 | 9-11 / compleja / 2 | 12+ / 1 min / 4 |

Radio de 10·N m. Interferencia ambiental +0/+2/+4/+6.

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1, #9 | narrativo | — |
| #2–#8, #14–#18, #20, #21 | parametro/resultado_texto | accion/numerico · nueva/existente · accion_sin_equipo / ajuste_fijo · bloqueado |
| #10–#13 | ejes.interferencia.* (campoNuevo) | numerico · existente · eleccion_jugador · bloqueado |
| #19 | resultados.fracaso (campoNuevo `Resultado.salvacion`) | accion · existente · accion_sin_equipo · bloqueado |

#### Comunes de Hipercongnición

| Claims | Destino | Motor |
|---|---|---|
| #1, #4 | parametro: rama, requisito | narrativo |
| #2, #3, #5, #6 | narrativo | — |

### 5.4 Traslación (métrica)

**Tabla (fila del nivel que cubre carga y alcance):**

| N | Alcance | Carga máx. | Fatiga |
|---|---|---|---|
| 1 | 15 m | 25 kg × Perspicacia | 1 |
| 2 | 30 m | 50 kg × Per | 2 |
| 3 | 45 m | 125 kg × Per | 2 |
| 4 | 60 m | 250 kg × Per | 3 |
| 5 | 75 m | 375 kg × Per | 3 |
| 6 | 90 m | 500 kg × Per | 4 |

**Especiales por poseído:** nv2 levitación · nv3 cargas < 10 kg sin fatiga · nv4 Anclaje pasa a simple · nv5 Sensor en simple o reacción · nv6 −1 fatiga si la carga no llega a la máxima (mínimo 1). Los de nv3 y nv6 se añaden como reglas y ModificadorFatiga (corregido).

**MATRIZ poseído × N: fatiga efectiva por objetivo** (a = carga < 10 kg; b = carga < máxima)

| Poseído \ N | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| 1–2 | 1 | 2 | | | | |
| 3–5 | 1 (a: 0) | 2 (a: 0) | 2 (a: 0) | 3 (a: 0) | 3 (a: 0) | |
| 6 | 1 (a: 0; b: 1) | 2 (a: 0; b: 1) | 2 (b: 1) | 3 (b: 2) | 3 (b: 2) | 4 (b: 3) |

Con poseído 6 y a+b, ¿el coste es 0 o 1? Está preguntado.

#### Anclaje — `psi_traslacion_anclaje`

- **Coste:** estándar (simple desde poseído 4), fatiga de tabla **por objetivo**.
- **Resolución:** enfrentada Perspicacia + Física contra esquiva Reflejos + Atletismo. Duración N turnos.
- **Ejes:** objetivos {uno | varios mismo turno: compleja | añadir: estándar} · uso {anclar | auto-anclaje: reacción, Reflejos + Física 6 opcional | duelo de métrica reacción/simple: 1 fat., gratis si tu nivel supera en 2 al del atacante}.
- **Manual:** mantenimiento, −1 de concentración, renovación y seguimiento.

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1 | narrativo | — |
| #2–#6, #8, #14–#16, #19, #20 | parametro: economia, resolucion, fatiga, resistencia, resultados.exito.estados, duracion, ejes.*, porNivel.carga | accion · nueva/existente:psi_traslacion_anclaje · accion_sin_equipo · bloqueado |
| #11, #12, #18 | campoNuevo `conDisciplina` / ModificadorFatiga.condicion / `fatigaPorObjetivo` | ídem |
| #7 | resultado_texto | texto · tercero:escapar_anclaje · nota_fija · bloqueado |
| #9, #10, #17 | manual | accion · existente · hueco (mantenimiento) · ad_hoc |
| #13 | manual | numerico · existente:todas · eleccion_jugador · ad_hoc |

#### Trasladar — `psi_traslacion_trasladar`

- **Coste:** simple (estándar con varios objetivos), tabla. Sin dado. Desplazamiento 10·N m.
- **Requiere** objetivo anclado por ti (arbitraje pendiente).
- **Ejes:** modo {normal | levitación (poseído 2): 1 fat. por minuto; 10 min desde poseído 4; 1 h desde poseído 6} · control {soltar | retener: enfrentada; el objetivo resiste con Fortaleza + Atletismo como reacción gratuita (corregido)}.

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1 | campoNuevo `requiere` | habilitador · existente · gate_instalacion · bloqueado (arbitraje pendiente) |
| #2, #3, #7, #10, #11, #14–#16 | parametro | accion · nueva/existente · accion_sin_equipo · bloqueado |
| #4, #13 | campoNuevo `desplazamiento` | ídem |
| #8 | campoNuevo `Opcion.cambia.resistencia` | ídem |
| #5, #6, #9 | resultado_texto | ídem |
| #12 | manual | numerico · existente:defensa · hueco (sustituir habilidad) · ad_hoc |

#### Proyección — `psi_traslacion_proyeccion`

- **Coste:** simple o reacción, 1 fat. fija.
- **Resolución:** ataque Reflejos + Física con −2 de Puntería (añadido, corregido). Alcance 20·N m.
- **Daño:** 4 + N letal, +1 por cada 200 kg extra; lo reciben lo lanzado y el blanco.
- **Auto-proyección:** estándar ×2 o compleja ×4 de velocidad, 1 fat., +1 a esquiva (manual).

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1 | narrativo | — |
| #2 | campoNuevo `requiere` | habilitador · existente · gate_instalacion · bloqueado |
| #3, #4, #6–#8, #12–#14 | parametro | accion · nueva/existente · accion_sin_equipo · bloqueado |
| #5, #9, #10 | resultado_texto | ídem |
| #11 | campoNuevo `resolucion.modificador` | ídem |
| #15 | manual | numerico · existente:defensa · eleccion_jugador · ad_hoc |

#### Proeza — `psi_traslacion_proeza`

- **Coste:** compleja; fila de la tabla + 1 por cada 10 % de exceso (mínimo +1). Admite **fatiga temporal**.
- **Ejes:** maniobra {anclar | trasladar a mitad de velocidad} · límite {<200 % | 200 %: inconsciente y 1 de daño mental}.
- Texto de la fatiga temporal corregido (§7).

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1, #3, #6, #7 | parametro | accion · nueva/existente · accion_sin_equipo · bloqueado |
| #4 | campoNuevo `fatigaExtra` | ídem |
| #2 | resultado_texto | habilitador · existente:psi_traslacion_proyeccion · gate_instalacion · bloqueado |
| #5 | manual | accion · existente · hueco (mantenimiento) · ad_hoc |
| #8 | campoNuevo `permiteFatigaTemporal` | accion · existente · hueco (fatiga temporal) · bloqueado |

#### Sensor — `psi_traslacion_sensor`

- Estándar (simple o reacción desde poseído 5), 1 fat., N turnos, radio 2·N (¿m?). Sin dado; el efecto va en `efectoDirecto`.

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1 | narrativo | — |
| #2–#6, #8 | parametro/resultado_texto | accion · nueva · accion_sin_equipo · bloqueado |
| #7 | manual | habilitador · existente:tecnica · gate_instalacion · ad_hoc |
| #9 | manual | habilitador · existente:psi_traslacion_anclaje · gate_instalacion · ad_hoc |

#### Comunes de Traslación

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1, #2, #10, #12 | narrativo | — |
| #3, #11, #13–#16, #18, #19 | parametro: reglas, porNivel.*, ajustes | accion · existente:grupo/acción · accion_sin_equipo · bloqueado |
| #17, #20 | campoNuevo ModificadorFatiga.condicion | ídem |
| #4 | reglas.sobrecarga | accion · existente:grupo:psionica · hueco (umbral de recurso) · bloqueado |
| #5–#9 **(corr.)** | reglas.sobrecarga | texto · existente:salv_fortaleza · nota_fija · bloqueado |

### 5.5 Contención (métrica, requiere Traslación 1)

**Tabla (N):** 1 → 1 fat. · 2 → **sin datos** · 3 → 2 · 4 → 3 · 5 → 3 (¿errata?) · 6 → 4. Duración base 10 turnos.

**MATRIZ poseído × N empleado: duración (turnos) · fatiga personal / ampliada (×2) · −Agilidad**

| Poseído \ N | 1 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|
| 1–2 | 10 · 1/2 · −1 | | | | |
| 3 | **20** · 1/2 · −1 | 10 · 2/4 · −2 | | | |
| 4 | **30** · 1/2 · −1 | **20** · 2/4 · −2 | 10 · 3/6 · −2 | | |
| 5 | **40** · 1/2 · −1 | **30** · 2/4 · −2 | **20** · 3/6 · −2 | 10 · 3/6 · −3 | |
| 6 | 40 (personal: **1 h, 0 fat.**) · 1/2 · **0** | **40** · 2/4 · **−1** | **30** · 3/6 · **−1** | **20** · 3/6 · **−2** | 10 · 4/8 · −3 |

- **Área colectiva:** N casillas. Con poseído 4, N1 ×2; con poseído 5, N1 ×3 y N3 ×2; con poseído 6, N3 ×3 y N4 ×2.
- **Mantenimiento de la ampliada:** acción simple, o reacción desde poseído 4.
- **Absorción** (manual): N1 1 · N3 2 · N4 3 · N5 4 · N6 5. Quieto: 3/5/7/9/11. Confrontar la dobla.

#### Contención — `psi_contencion_contencion`

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1, #2, #4, #10, #11, #17, #21, #23, #26, #28, #32–#33, #35, #39, #41, #42, #44, #47, #49, #51, #52, #54, #60, #63, #66 | parametro: economia, porNivel.*.fatiga, duracion, ejes.forma.*, ajustesPorNivelPoseido.* | accion · nueva/existente:psi_contencion_contencion · accion_sin_equipo · bloqueado |
| #19, #57 | campoNuevo ModificadorFatiga.alcance.opcion (+ siOpcion) | ídem |
| #40, #48, #50, #61, #64 | campoNuevo `siOpcion` | ídem |
| #3, #6, #27, #30, #34, #37, #43, #46, #53, #56 | manual | numerico · existente:bloquear_danio · suma_derivado · ad_hoc |
| #5, #29, #36, #45, #55, #59, #62, #65, #67 | manual | numerico · existente:defensa · hueco (−atributo básico) · ad_hoc |
| #12 | manual | texto · tercero:bloquear_danio · nota_fija · ad_hoc |
| #13–#16, #18, #24, #38, #58 | manual | texto · existente · nota_fija · ad_hoc |
| #25 | manual | texto · tercero:psi_contencion_confrontar · nota_fija · ad_hoc |

#### Confrontar — `psi_contencion_confrontar` / Sumarse — `psi_contencion_sumarse`

| Claims | Destino / ruta | Motor |
|---|---|---|
| #7, #31 | acciones.1 | accion · nueva/existente:psi_contencion_confrontar · accion_sin_equipo · bloqueado |
| #8, #9 | campoNuevo `efectoDirecto` (resultado añadido, corregido) | ídem |
| #20, #22 | acciones.2 | accion · nueva/existente:psi_contencion_sumarse · accion_sin_equipo · bloqueado |

#### Comunes de Contención

| Claims | Destino | Motor |
|---|---|---|
| #1, #2, #11 | narrativo | — |
| #3 | reglas.fatiga_metrica | accion · existente · accion_sin_equipo · bloqueado |
| #4 | reglas.sobrecarga | texto · existente:grupo_psionica · nota_fija · bloqueado |
| #5–#9 | reglas.sobrecarga | texto · existente:salv_fortaleza · nota_fija · bloqueado |
| #10 | parametro: requisito | narrativo · pendiente |
| #12 | manual | numerico · existente:bloquear_danio · suma_derivado · ad_hoc |
| #13 | manual | numerico · existente:defensa · hueco · ad_hoc |

### 5.6 Singularidad (métrica, requiere Traslación 2)

**Común a las tres formas:** estándar, N de fatiga, ataque Perspicacia + Tecnociencia (Física). La versión "Poderosa" es compleja y cuesta N + 1.

**MATRIZ poseído × forma (a N = poseído máximo; cualquier N ≤ poseído vale)**

| N | Impulso | Imp. Poderoso | Expansión | Exp. Poderosa | Convergencia | Conv. Poderosa |
|---|---|---|---|---|---|---|
| 1 | est · 1 fat · 10 dmg · 20 m | comp · 2 · 12 | est · 1 · 14 · área 6 m | comp · 2 · 15 | est · 1 · 6 · 15 m | comp · 2 · 8 |
| 2 | est · 2 · 11 · 40 m | comp · 3 · 13 | est · 2 · 15 · 8 m | comp · 3 · 16 | est · 2 · 7 · 30 m | comp · 3 · 9 |
| 3 | est · 3 · 12 · 60 m | comp · 4 · 14 | est · 3 · 16 · 10 m | comp · 4 · 17 | est · 3 · 8 · 45 m | comp · 4 · 10 |
| 4 | est · 4 · 13 · 80 m | comp · 5 · 15 | est · 4 · 17 · 12 m | comp · 5 · 18 | est · 4 · 9 · 60 m | comp · 5 · 11 |
| 5 | est · 5 · 14 · 100 m | comp · 6 · 16 | est · 5 · 18 · 14 m | comp · 6 · 19 | est · 5 · 10 · 75 m | comp · 6 · 12 |
| 6 | est · 6 · 15 · 120 m | comp · 7 · 17 | est · 6 · 19 · 16 m | comp · 7 · 20 | est · 6 · 11 · 90 m | comp · 7 · 13 |

**Pruebas del objetivo:**

- Impulso: empuje Fortaleza + Atletismo 8 + N (9 + N en la Poderosa), 4·N m (8·N).
- Expansión: esquiva Reflejos + Atletismo 6 + N (7 + N) y expulsión 8 + N (9 + N).
- Convergencia: Fortaleza 6 + N, con fuego y llamarada.

#### Impulso — `psi_singularidad_impulso`

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1 | narrativo | — |
| #2, #3, #5, #7, #14 **(corr.)**, #15 **(corr.)** | parametro: resolucion, alcance, danio, ejes.modo.* | accion · nueva/existente · accion_sin_equipo · bloqueado |
| #6, #17 **(corr.)** | resultado_texto | ídem |
| #4 | campoNuevo `objetivo` | ídem |
| #8–#12 | campoNuevo `resistencia.pruebas` | ídem |
| #13 | campoNuevo `notas` | texto · existente · nota_fija · bloqueado |
| #16 **(corr.)** | campoNuevo `Opcion.cambia.resistencia` | texto · tercero:resistir_empuje · nota_fija · bloqueado |

#### Expansión — `psi_singularidad_expansion`

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1 | narrativo | — |
| #2 | **pregunta** | narrativo |
| #3, #6, #16 **(corr.)**, #17 **(corr.)** | parametro | accion · nueva/existente · accion_sin_equipo · bloqueado |
| #4, #5 | campoNuevo `objetivo` / `area` | ídem |
| #7–#15 | campoNuevo `resistencia.pruebas` | ídem |
| #18 **(corr.)** | campoNuevo `Opcion.cambia.resistencia` | texto · tercero:defensa · nota_fija · bloqueado |
| #19 **(corr.)** | ídem | texto · tercero:resistir_empuje · nota_fija · bloqueado |

#### Convergencia — `psi_singularidad_convergencia`

| Claims | Destino / ruta | Motor |
|---|---|---|
| #1 | narrativo | — |
| #2, #4, #10, #11, #16 **(corr.)**, #17 **(corr.)** | parametro | accion · nueva/existente · accion_sin_equipo · bloqueado |
| #8 | resultado_texto | ídem |
| #3 | campoNuevo `objetivo` | ídem |
| #12–#15 | campoNuevo `resistencia.pruebas` | ídem |
| #5 | campoNuevo `ignoraBlindaje` fracción | texto · existente · nota_fija · bloqueado |
| #6, #7, #9 | campoNuevo `notas` | texto · existente · nota_fija · bloqueado |

#### Comunes de Singularidad

| Claims | Destino | Motor |
|---|---|---|
| #1, #10, #12 | parametro: rama, requisito, reglas.formas_comunes | narrativo |
| #2, #11 | narrativo | — |
| #3 | acciones.*.fatiga | accion · nueva:psi_singularidad_* · hueco (gasto de fatiga) · bloqueado |
| #4 | campoNuevo sobrecarga | texto · existente · hueco (umbral) · bloqueado |
| #5–#9 | campoNuevo sobrecarga.salvacion | texto · existente:salv_fortaleza · hueco (tirada encadenada) · bloqueado |
| #13, #14 | acciones.*.economia / resolucion | accion · nueva · accion_sin_equipo · bloqueado |

---

## 6. Errores de fidelidad del verificador y cómo se han aplicado

Todos están aplicados en `docs/modelado-psionica.json` salvo donde se indica.

| # | Item / ruta | Problema | Aplicado como |
|---|---|---|---|
| 1 | sincronia · agresivo | Faltaba el daño mental propio | `cambia.costeDanio {1, mental, propio}` y la mención en el texto de los 4 grados (se añaden fracaso y fracaso crítico) |
| 2 | sincronia · agresivo.habilidad | Se perdía "o Actitud" | `habilidad: ["biociencia","actitud"]` (campo nuevo de alternativas, no un eje) |
| 3 | rastreo · indirecto/desconocido | Faltaba +1/+4 de fatiga | `cambia.fatigaExtra: 1 / 4` (suma, no sustituye) |
| 4 | rastreo · resolución de la opción | Pisaba el `porObjetivo` sintético | `cambia.dificultad: 9 / 12` en vez de reescribir la resolución |
| 5 | alerta · nv4 combinar | Omitido | `ajustesPorNivelPoseido` nv4 `{manual}` + línea de manual + regla `combinar_alerta_nv4` |
| 6 | alerta · activa.economia | Heredaba "gratuita" | `{tiempo:"sin especificar (preguntado)"}` |
| 7 | alerta · sintético.especialidad | Informática inventada | Especialidad eliminada |
| 8 | vinculo · duracion | Turnos en vez de minutos | `{base:0, porNivel:10}` |
| 9 | vinculo · manual[2] | Reacción en manual e incoherente con su claim | `accionesDerivadas: [psi_resonancia_vinculo_alertar]`, quitada de manual |
| 10 | resonancia · economía nv2/nv4/nv6 | No se modelaba | `Disciplina.modificadoresEconomia` (3 entradas) |
| 11 | hipercongnición · interferencia | Opciones con `cambia {}` | `ajusteDificultad: 0/2/4/6` en cada opción (Sondeo, Precog, Retro) |
| 12 | hipercongnición · estados en fracasos | Aturdido/confusión incondicionales | `estados: []` y `Resultado.salvacion` con el estado en su fracaso. El aturdido de 1 turno del fracaso crítico de Retro se mantiene incondicional |
| 13 | hipercongnición · especialidad | Proponía normalizar a `"fisica"` | **Aplicado distinto:** `"Física"`, que es el formato de `ESPECIALIDADES_CONOCIDAS` (§9) |
| 14 | inducción · especialidad | "informatica" → "Informática" | Aplicado en Inducción **y también en Resonancia** por coherencia |
| 15 | supresion · crítico en salvación/liberar | Heredaba el de la raíz | Crítico propio en ambas opciones |
| 16 | estabilizacion · +3/+4 como reacción | Faltaba | Ajustes nv4/nv6 sobre `ejes.uso.opciones.1.cambia.resultados.exito.texto` |
| 17 | estabilizacion · crítico nv4/nv6 | Contradecía al éxito | Ajustes nv4/nv6 también sobre `…critico.texto` |
| 18 | impulso · cobertura ligera | Omitido | En el texto de crítico/éxito (normal y poderoso) + `notas` + motor `nota_fija` |
| 19 | impulso/expansion · textos poderosos | Perdían grados y "+1 por cada 2 éxitos" | Textos completos con los números de la variante |
| 20 | traslación · especiales nv3/nv6 | Faltaban | Reglas `n3_cargas_ligeras`, `n6_reduccion` + 3 ModificadorFatiga con `condicion` declarada |
| 21 | anclaje · duelo sin coste | Omitido | Frase en los resultados de `duelo_metrica_*` |
| 22 | trasladar · retener_control | Faltaba la resistencia del objetivo | Texto en éxito/fracaso + `cambia.resistencia` (campo nuevo) |
| 23 | proyeccion · −2 de Puntería | Omitido | `resolucion.modificador: -2` + texto + manual (sigue preguntado) |
| 24 | proeza · fatiga | "tabla" ignoraba el exceso | `fatiga {manual}` + `fatigaExtra {porUnidad exceso_10pct, minimo 1}` + manual |
| 25 | proeza · texto de fatiga temporal | Devolvía toda la fatiga | Texto reescrito: solo es temporal el extra; efectiva ≤ 0 → inconsciente |
| 26 | contencion · rutas de ajustes | Faltaba `.cambia` | `ejes.nivel.opciones.N.cambia.duracion` en los 9 |
| 27 | contencion · área colectiva | Omitida | Línea de manual |
| 28 | contencion · ×2 de la ampliada | No estaba | ModificadorFatiga `multiplica 2` con `alcance.opcion` (campo nuevo) + línea de manual |
| 29 | confrontar · resultados | Vacío | `resultados.exito` + `efectoDirecto` con daño {0 + 1·N} |
| 30 | contencion · motor[2] | `mecanismo: null`, apuntaba a defensa | `afecta agilidad`, `hueco` descrito, `ad_hoc` |

Además, 13 claims se reclasificaron en la verificación (marcados **(corr.)** en §5): leer_mente#7, alerta#7, supresion#7, estabilizacion#8/#11, traslacion._comunes#5–#9, impulso#14–#17, expansion#16–#19, convergencia#16/#17.

---

## 7. Preguntas para el diseñador

### 7.1 Resonancia

- **Unidad del alcance:** la tabla dice "Radio" pero da km². ¿Radio en km o área en km²?
- **Alcance local** (1 km², estándar): ¿cuánta fatiga? ¿Vale con cualquier nivel poseído?
- **Tabla o coste propio:** Leer mente (estándar, 1), Vínculo (compleja, 1) y los modos de Sincronía (gratuita, estándar + 1, compleja + 1·N), ¿sustituyen a la tabla o se aplican sobre ella? ¿O la tabla solo fija el alcance?
- **Nv2 "simplifica las acciones de nivel 1":** ¿se refiere a lo empleado a nivel 1 (también el local, que pasaría de estándar a simple) o a los poderes que se aprenden a nivel 1?
- **Descuentos de fatiga nv3/nv5/nv6:** ¿se acumulan? ¿Pueden dejar el coste en 0? ¿Hay mínimo de 1?
- **Nv6 "reduce la duración a 1 minuto para el nivel 4":** ¿tiempo de acción o duración del efecto?
- **Nv1 "en alcance local se puede usar Inducción":** ¿es un requisito de Inducción o un permiso?
- **Barreras semánticas o biológicas:** ¿cómo influye el nivel de Resonancia?
- **"Quemar las sinapsis"** con supercomputadoras: ¿daño o tirada, o solo sabor?
- **Códigos abiertos vs encriptados:** ¿cambian la dificultad o exigen Hackeo?
- **Nv4:** "combinar alertas, mejor tirada + 2" y "ventaja en Alerta", ¿se acumulan? ¿Valen para la forma pasiva?
- **Sincronía:**
  - Modo agresivo: ¿qué pasa en fracaso y en fracaso crítico? ¿Se puede usar contra sintéticos? ¿Qué resiste la máquina?
  - Fatiga del agresivo (1·N) frente a la tabla (6 y 8 en N5–6): ¿cuál manda?
  - ¿Se puede mitigar el daño mental propio? ¿Omite blindaje?
  - La prueba de barrera, ¿solo si el máster la pide? Si falla, ¿llega el mensaje distorsionado o no llega?
- **Rastreo:**
  - ¿Las interferencias aplican a toda Resonancia?
  - ¿+1/+4 se suman a la tabla y reciben los descuentos por nivel?
  - "Duración ×2 / ×10": ¿sobre qué tiempo base?
  - ¿Qué pasa al fallar? ¿Puede resistirse el objetivo?
- **Leer mente:**
  - ¿El nivel empleado solo cambia el alcance, o también cuesta la fatiga de la tabla?
  - Mapeo de grados en la enfrentada (crítico por 6, el empate gana el defensor).
  - La tirada del objetivo para darse cuenta: ¿qué par y qué dificultad?
  - ¿Contra sintéticos, Perspicacia + Informática?
  - ¿La resistencia de un psiónico entrenado es Voluntad + Biociencia?
- **Alerta:**
  - 20 m × nivel: ¿poseído o empleado?
  - ¿La pasiva es continua o la pide el máster? ¿Qué economía tiene?
  - Activa: ¿qué acción es y cuánto dura?
  - ¿Qué pasa en fracaso y en crítico?
  - "Sin impedimentos", ¿basta con no estar exhausto, o cuentan también las interferencias y la Munición Supresora?
- **Vínculo:**
  - "1 min por nivel del psiónico": ¿empleado, poseído o del personaje?
  - "1 km² por punto de poder": ¿qué es un punto de poder? ¿Por qué no usa la tabla?
  - ¿A cuántos aliados? ¿Tienen que aceptar?
  - ¿Economía y fatiga de la tabla a más nivel?
  - ¿El +1 lo recibe también el psiónico?

### 7.2 Inducción

- **Alcance** 20 m × nivel: ¿empleado o poseído?
- **Nv5 sugestión remota:** ¿qué acciones son "de sugestión"? ¿El −4 va a la prueba del psiónico?
- **Grados de las enfrentadas:** confirmar que se leen desde el objetivo (crítico por 6, empate al defensor).
- **Comando:**
  - La orden por reacción, ¿cuesta 1 fat. y usa la misma prueba?
  - Con 3 objetivos, ¿1 + 3 o 1 + 2?
  - Acciones extremas: ¿qué salvación se repite?
  - "Posible confusión": ¿es el estado Confusión o solo texto?
- **Modulación:**
  - Nv4: ¿el primer objetivo también paga?
  - Nv6: ¿los exentos van por nivel empleado o poseído?
  - Hipomanía: ¿los grados son del objetivo o del psiónico (uso sobre aliados)?
  - Sopor: "fatigado N turnos", ¿con N empleado o poseído? "Efectos de fatiga", ¿solo el penalizador, o baja la fatiga real?
  - Latencia: el −1 residual, ¿a acciones físicas y de procesamiento o a todas?
  - Cautiverio: ¿es el estado Parálisis tal cual ("o" frente a "y"; "a 4 m" frente a "−4 m")?
  - Delirio/Manía: la fatiga por turno, ¿es del objetivo? ¿Qué pasa al llegar a 0?
- **Supresión:**
  - Duración nv2 (10 min × N) frente a nv4 (30 min): ¿cuál manda? ¿N empleado o poseído?
  - ¿La tirada contra 10 es la prueba base?
  - El uso +2 a la salvación: ¿también tira contra 10, con el mismo coste? ¿A qué salvación se aplica?
- **Estabilización:**
  - ¿Cuánta fatiga? ¿Prueba base contra 6?
  - El +3/+4 ¿sustituye al +2 o se suma? ¿Solo como reacción?
  - Nv4 "omite los penalizadores de daño y fatiga": ¿son los umbrales de salud y fatiga? ¿Durante cuánto?
  - ¿Es intencionado que nv2 dé 10 min fijos y Supresión 10 min × N?
- **Reconfiguración Mnemónica:**
  - ¿Se resuelve con la prueba base?
  - "Acoplamiento prolongado": ¿dura varios turnos o basta con la acción compleja?

### 7.3 Hipercongnición

- ¿Existe el nivel 6? ¿Los −1 de dificultad de los niveles pares se acumulan?
- "Un nivel de daño mental": ¿es 1 PG de categoría mental?
- ¿Falta a propósito la tabla común (fatiga, acción, alcance)?
- "Nivel de poder": ¿de Hipercongnición? Sondeo mezcla niveles de Resonancia y de Hipercongnición.
- **Sondeo:**
  - ¿Las fracciones se calculan sobre el alcance del nivel poseído en Resonancia? ¿"Dos cuartos" es la mitad?
  - ¿Quién fija la dificultad dentro del rango?
  - Duración: el crítico dura 1 turno y el éxito N turnos; nv3 da 1 minuto. ¿N empleado o poseído?
  - "Mantener cada turno" frente a "no pudiendo prolongarse".
  - ¿Cuánto dura el aturdido? ¿Es `salv_fortaleza`?
  - ¿Aislamiento y blindaje son un solo factor?
  - Si el tramo local ya es estándar en nv3, ¿nv5 no lo baja más?
- **Precognición:**
  - "Tiradas defensivas": ¿incluye salvaciones?
  - Dentro o fuera de la burbuja: ¿cuenta la posición del atacante? ¿La burbuja se mueve con el psiónico?
  - ¿Cuánto duran los −2 y la reacción perdida?
  - ¿Se aplica la escala de interferencias +2/+4/+6?
  - ¿La segunda reacción dura todo el efecto?
- **Retrocognición:**
  - ¿Cuánto dura el aturdido del fracaso?
  - ¿Se confirma el aturdido automático, sin salvación, del fracaso crítico?
  - ¿Rangos a criterio del narrador?
  - ¿La lectura es instantánea?

### 7.4 Traslación

- Nv3 (cargas < 10 kg) y nv6 (−1): ¿dependen del nivel poseído o del empleado?
- Nv6, "cargas < nivel máximo": con menos de 10 kg y nv6, ¿cuesta 0 o 1?
- ¿La tabla 1/2/2/3/3/4 sustituye al "1 por nivel" de Métrica?
- Sobrecarga: ¿el daño es igual al nivel empleado? ¿Es la misma tirada en Metasensoria?
- ¿El radio del Sensor está en metros o en casillas?
- **Anclaje:**
  - ¿"Anclado" es Inmovilizado, Parálisis o un estado nuevo?
  - ¿Qué pasa en crítico, fracaso y fracaso crítico?
  - Duración: ¿N empleado o poseído?
  - Para oponerse al escape, ¿gasta acción o fatiga?
  - ¿Nv4 afecta también a la versión de varios objetivos?
  - ¿La carga máxima es total o por objetivo? ¿El −1 de concentración se acumula por objetivo?
  - Duelo "dos niveles mayor": ¿se compara el poseído o el empleado?
- **Trasladar:**
  - Para retener, ¿se repite Trasladar o Anclaje? ¿Qué tira el psiónico?
  - ¿Hay tirada y grados, o es automático?
  - Levitación: ¿1/min sustituye a la tabla o se suma? ¿Velocidad con N al activar?
- **Proyección:**
  - Puntería: ¿−2 a la tirada o +2 a la dificultad?
  - ¿1 fat. fija siempre?
  - ¿Qué pasa si falla?
  - Estampar sin blanco, ¿pide Puntería?
- **Proeza:**
  - ¿La carga máxima es la del nivel empleado o la del poseído? ¿Se paga la fila + el extra, o solo el extra?
  - ¿Qué tirada la resuelve? Si falla, ¿se paga la fatiga igualmente?
  - ¿Se puede pasar del 200 %?
- **Sensor:**
  - "No es poco habitual": ¿errata? ¿Qué habilidad se tira?
  - Radio: ¿metros o casillas?
  - ¿1 fat. fija o la de la tabla?
  - "Biónica": ¿de qué habilidad es especialidad?

### 7.5 Contención

- ¿Se puede emplear a N2? ¿Qué valores tiene?
- Tabla 1/2/3/3/4: ¿es intencionado? ¿El 3 de N5 es errata?
- ¿Agilidad básica, o Reflejos y Defensa directamente?
- ¿Qué tipos de daño cubre la absorción? ¿Se suma a la armadura?
- "Quieto": ¿la absorción pasa a ese valor o se suma? ¿Implica renunciar a toda Defensa?
- **Confrontar:** ¿consume la reacción? ¿Cuesta fatiga? ¿El doble se calcula sobre el "quieto"? ¿Qué tipo y categoría de daño hace?
- **Ampliada:** "1 casilla por nivel": ¿empleado o poseído? ¿El ×2 se aplica sobre la tabla?
- **Sumarse:** ¿qué nivel mínimo? ¿Qué acción? ¿Le afecta el ×2?
- ¿Los beneficiarios no psiónicos pueden confrontar? ¿A qué coste?
- Nv6, N1 personal durante 1 h: ¿sustituye a los 40 turnos? ¿Vale también para la ampliada?
- "No se apila": ¿tampoco con la personal del propio beneficiario?
- Sobrecarga: ¿daño = nivel o = coste? ¿La inconsciencia es automática pase lo que pase con la salvación?

### 7.6 Singularidad

- ¿Nivel máximo 6?
- Sin la especialidad Física, ¿se tira la mitad o Perspicacia sola?
- Sobrecarga: ¿daño = N? ¿Redondeo de la mitad?
- ¿La fatiga extra de la Poderosa pasa por la cadena de ModificadorFatiga?
- ¿Qué pasa en fracaso crítico del ataque?
- ¿"Cinético" es letal normal a efectos de blindaje?
- **Impulso:** ¿qué niveles cuentan como cobertura ligera? ¿Redondeo de la mitad? ¿Poderoso cuesta +1 plano o +1 por nivel?
- **Expansión:**
  - ¿Qué dificultad tiene acertar a la casilla?
  - ¿Cuántos metros es una casilla?
  - ¿Decae con la distancia?
  - Poderosa +1 de daño (las otras +2): ¿errata?
  - ¿Afecta al psiónico y a los aliados que estén dentro?
- **Convergencia:**
  - ¿"Armadura de plasma" es la Malla Plasmática?
  - ¿Fuego 0 si no lleva armadura? ¿Redondeo?
  - ¿La pérdida de absorción es permanente?
  - ¿El fracaso crítico incluye el fuego del fracaso?
  - En el crítico del objetivo, ¿se mantiene el daño base?

### 7.7 Transversales

- **¿Dónde se descuenta el gasto de fatiga:** `sheet.fatigaActual` o `Combatiente.fatigaActual`? Es la primera vez que hay que decidirlo.
- **Estados y pruebas del objetivo:** ¿solo texto (§10.6) o, en combate, se crea el EstadoActivo y se tira la prueba del rival?
- **Efectos propios y mantenimiento (C17/C18):** ¿se confirma que van a mano? ¿Se quiere mecanizar ya el −Agilidad de Contención?
- **Arbitraje de los gates** (requisito, objetivo anclado, exhausto, no gastar fatiga que no se tiene): ¿duro o blando?
- **Grados en enfrentadas:** ¿desde qué tirada? (`resultadosDe`).
- **Orden de la tubería de coste:** opción → ajustes → tabla → suplementos → cadena → mínimo. ¿Cómo se ordenan Xovromium (ignora el primer nivel) y Munición Supresora (×2) frente a los descuentos por nivel?
- **Máquinas sin ficha** (pregunta 16): ¿qué tiran para resistir?
- **Ventaja** frente a "combinar dos alertas + 2": ¿son la misma mecánica?

---

## 8. Avisos del proceso

- **Lotes caídos:** ninguno. **Efectos sin veredicto:** ninguno. **Incoherencias señaladas por el workflow:** ninguna.
- **Incoherencia entre correcciones (normalizada):** el verificador pedía `"fisica"` en Hipercongnición y `"Informática"` en Inducción. Se ha normalizado todo a mayúscula con tilde (`"Física"`, `"Informática"`), que es el formato de `ESPECIALIDADES_CONOCIDAS` en `src/lib/rules/habilidades.ts`. Ninguna de las dos está hoy en esa lista: habrá que darlas de alta.
- **`motor` vacío** en las propuestas de Inducción y Singularidad: completado con la entrada `accion_sin_equipo` bloqueada.
- **Efectos `no_aplica` en la verificación:** los narrativos, los manuales por decisión y los huecos genéricos (gasto de fatiga, sobrecarga, ventaja) no pasaron por el verificador de fidelidad. Conviene revisarlos a mano: Singularidad `_comunes` #3–#12 y Hipercongnición #2 de Sondeo y de Precognición.
- **Supuestos que las matrices dan por buenos** (preguntados): los descuentos de fatiga se acumulan con mínimo 0 (Resonancia), los −1 de Hipercongnición se acumulan, y el N de las fórmulas es siempre el nivel empleado.
- **El borrador JSON usa campos nuevos** (`ajusteDificultad`, `costeDanio`, `fatigaExtra`, `resistencia.pruebas`, `Resultado.salvacion`, `efectoDirecto`, `modificadoresEconomia`, `accionesDerivadas`, `requiere`, `bloqueadaSi`, `notas`, `objetivo`, `desplazamiento`…) que el modelo objetivo aún no tiene. Son propuesta y no están consolidados.
