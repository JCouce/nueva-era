# Modelado de las Dotes: salida del workflow `modelar-area`

- **Qué es:** la salida del workflow `modelar-area` sobre `docs/dotes.md` (fuente literal del diseñador), lanzada el 2026-10-15 con lotes de 12 y el **modelo de dotes v1** (`scripts/workflows/modelar-area-extraer.ts`, decisiones en `docs/sistema.md` §9).
- **Estado:** es una **propuesta sin construir**. No hay nada de esto en `src/lib/rules` ni en el catálogo.
- **Quién manda:** `docs/sistema.md`. Si algo de aquí choca con él, gana sistema.md. Para el código, un supuesto de este documento no existe hasta que entre en sistema.md.
- **Borrador:** `docs/modelado-dotes.json`, con raíz `CatalogoDotes { dotes: Dote[] }`. Ya lleva aplicadas **las correcciones del verificador** (§8) y un `motor` regenerado desde los claims (una entrada por terna tipo · afecta · mecanismo · estado, con los claims que la componen).
- **Lectura:** donde la estructura común del workflow dice "disciplina", aquí es **grupo** (la habilidad de la sección de la fuente). Las dotes no tienen matriz de nivel, salvo las dos psiónicas con nivel empleado (§6.9).

---

## 1. Cobertura

### 1.1 Global

| Dotes | Efectos | Cubierto | parametro | resultado_texto | manual | pregunta | narrativo | Con `campoNuevo` | `campoNuevo` sin ruta |
|---|---|---|---|---|---|---|---|---|---|
| 105 | **631** | **96 %** | 551 | 51 | 1 | 11 | 17 | 46 | 15 |

Un efecto **no** cuenta como cubierto si su destino es `pregunta` o si propone un `campoNuevo` y no tiene ruta en el modelo (no cabe en ningún sitio). Los 31 efectos con campo nuevo **y** ruta tienen ya un sitio provisional en la propuesta. El workflow daba 96 % (631 efectos); tras las correcciones de §8 queda en 96 %, porque Depredador Acuático deja de ser pregunta.

### 1.2 Por dote

Las filas por debajo del 100 % van en **negrita**.

**Actitud**

| Dote | Efectos | % | parametro | res_texto | manual | pregunta | narrativo |
|---|---|---|---|---|---|---|---|
| Apoyo | 11 | 100 | 7 | 4 | 0 | 0 | 0 |
| Burla | 12 | 100 | 7 | 4 | 0 | 0 | 1 |
| Humor Negro | 7 | 100 | 5 | 1 | 0 | 0 | 1 |
| Humor de Afrontamiento | 11 | 100 | 7 | 4 | 0 | 0 | 0 |
| Mirada Desafiante | 5 | **80** | 5 | 0 | 0 | 0 | 0 |
| Presencia Imponente | 6 | 100 | 6 | 0 | 0 | 0 | 0 |
| Grito de Guerra | 5 | 100 | 5 | 0 | 0 | 0 | 0 |
| Violencia Aterradora | 8 | 100 | 8 | 0 | 0 | 0 | 0 |
| Alentar | 9 | 100 | 6 | 3 | 0 | 0 | 0 |
| Llamada a las Armas | 8 | 100 | 6 | 2 | 0 | 0 | 0 |
| Acción Inspiradora | 8 | 100 | 7 | 1 | 0 | 0 | 0 |
| Cazador Cazado | 4 | 100 | 4 | 0 | 0 | 0 | 0 |
| Enredar | 5 | 100 | 4 | 0 | 0 | 0 | 1 |
| Traicionero | 7 | 100 | 6 | 1 | 0 | 0 | 0 |
| Imitación | 7 | **86** | 6 | 0 | 0 | 0 | 1 |
| Negociación Analítica | 5 | 100 | 4 | 0 | 0 | 0 | 1 |

**Atletismo**

| Dote | Efectos | % | parametro | res_texto | manual | pregunta | narrativo |
|---|---|---|---|---|---|---|---|
| Paso Defensivo | 4 | 100 | 4 | 0 | 0 | 0 | 0 |
| Paso Atrás | 7 | 100 | 7 | 0 | 0 | 0 | 0 |
| Reflejos Felinos | 4 | 100 | 4 | 0 | 0 | 0 | 0 |
| Balanceo | 4 | 100 | 4 | 0 | 0 | 0 | 0 |
| Equilibrista | 4 | 100 | 4 | 0 | 0 | 0 | 0 |
| Como Pez en el Agua | 4 | 100 | 4 | 0 | 0 | 0 | 0 |
| Depredador Acuático | 3 | 100 | 3 | 0 | 0 | 0 | 0 |
| Movilidad | 4 | 100 | 4 | 0 | 0 | 0 | 0 |
| Movilidad Mejorada | 5 | 100 | 5 | 0 | 0 | 0 | 0 |
| Potencia de Lanzamiento | 4 | 100 | 4 | 0 | 0 | 0 | 0 |
| Lanzador Preciso | 4 | 100 | 4 | 0 | 0 | 0 | 0 |
| Salto Evasivo | 5 | **80** | 5 | 0 | 0 | 0 | 0 |
| Salto Evasivo Mejorado | 5 | **80** | 5 | 0 | 0 | 0 | 0 |
| Saber Caer | 4 | **75** | 3 | 0 | 0 | 1 | 0 |
| Caer Parado | 4 | **75** | 3 | 0 | 0 | 1 | 0 |
| Salto Ofensivo | 5 | 100 | 5 | 0 | 0 | 0 | 0 |
| Salto Ofensivo Mejorado | 5 | 100 | 5 | 0 | 0 | 0 | 0 |
| Agarre Rápido | 4 | 100 | 4 | 0 | 0 | 0 | 0 |
| Contacto a Tres Puntos | 4 | 100 | 4 | 0 | 0 | 0 | 0 |
| Velocista | 5 | 100 | 5 | 0 | 0 | 0 | 0 |
| Salida Explosiva | 5 | 100 | 5 | 0 | 0 | 0 | 0 |
| Zafarse | 4 | 100 | 4 | 0 | 0 | 0 | 0 |

**Biociencia**

| Dote | Efectos | % | parametro | res_texto | manual | pregunta | narrativo |
|---|---|---|---|---|---|---|---|
| Especialidad Médica | 7 | 100 | 7 | 0 | 0 | 0 | 0 |
| Ojo Clínico | 5 | 100 | 5 | 0 | 0 | 0 | 0 |
| Autocuidados | 7 | 100 | 7 | 0 | 0 | 0 | 0 |
| Optimización Biotecnológica de Traje | 8 | 100 | 6 | 1 | 0 | 0 | 1 |
| Potenciar Veneno | 9 | 100 | 6 | 3 | 0 | 0 | 0 |
| Artesano Biónico | 5 | 100 | 5 | 0 | 0 | 0 | 0 |
| Gran Maestro Biónico | 5 | 100 | 5 | 0 | 0 | 0 | 0 |
| Genio Genetista | 5 | 100 | 5 | 0 | 0 | 0 | 0 |
| Gran Genio Genetista | 5 | 100 | 5 | 0 | 0 | 0 | 0 |

**Combate Melee**

| Dote | Efectos | % | parametro | res_texto | manual | pregunta | narrativo |
|---|---|---|---|---|---|---|---|
| Bloqueo | 13 | 100 | 9 | 2 | 0 | 0 | 2 |
| Contraataque Rápido | 6 | 100 | 6 | 0 | 0 | 0 | 0 |
| Maestro en Contraataque | 5 | 100 | 5 | 0 | 0 | 0 | 0 |
| Combate Sutil | 4 | 100 | 4 | 0 | 0 | 0 | 0 |
| Ataque de Oportunidad | 4 | 100 | 4 | 0 | 0 | 0 | 0 |
| Ataque de Oportunidad Poderoso | 5 | 100 | 5 | 0 | 0 | 0 | 0 |
| Ataque de Oportunidad Múltiple | 5 | 100 | 5 | 0 | 0 | 0 | 0 |
| Maestro Oportunista | 5 | 100 | 5 | 0 | 0 | 0 | 0 |
| Arrollar | 24 | 100 | 17 | 7 | 0 | 0 | 0 |
| Apresar y Apuñalar | 3 | 100 | 3 | 0 | 0 | 0 | 0 |
| Ataque Melee Doble | 7 | 100 | 6 | 0 | 0 | 0 | 1 |
| Combate con Dos Armas Melee | 4 | 100 | 4 | 0 | 0 | 0 | 0 |
| Combinación | 6 | 100 | 6 | 0 | 0 | 0 | 0 |
| Combinación Rápida | 6 | 100 | 6 | 0 | 0 | 0 | 0 |
| Crítico Mejorado | 4 | 100 | 4 | 0 | 0 | 0 | 0 |
| Derribo Mejorado | 4 | 100 | 2 | 2 | 0 | 0 | 0 |
| Derribo Brutal | 6 | **83** | 6 | 0 | 0 | 0 | 0 |
| Desenfundado Rápido | 6 | **67** | 5 | 1 | 0 | 0 | 0 |
| Defensa con Escudo Rápida | 3 | 100 | 3 | 0 | 0 | 0 | 0 |
| Golpe Mejorado con Escudo | 3 | **67** | 3 | 0 | 0 | 0 | 0 |
| Defensa con Escudo Constante | 3 | 100 | 3 | 0 | 0 | 0 | 0 |
| Maestro del Escudo | 3 | 100 | 3 | 0 | 0 | 0 | 0 |
| Golpea Primero, Golpea Dos Veces | 3 | 100 | 3 | 0 | 0 | 0 | 0 |
| Finta | 10 | 100 | 7 | 3 | 0 | 0 | 0 |
| Maestro de Fintas | 6 | 100 | 6 | 0 | 0 | 0 | 0 |
| Golpe Fatigante | 9 | **89** | 4 | 4 | 0 | 0 | 1 |
| Asalto Sigiloso | 4 | 100 | 4 | 0 | 0 | 0 | 0 |
| Asesino | 5 | **80** | 4 | 1 | 0 | 0 | 0 |
| Mata Gigantes | 5 | 100 | 5 | 0 | 0 | 0 | 0 |
| Golpe Entorpecedor | 10 | **90** | 7 | 2 | 0 | 0 | 1 |
| Táctica de Flanqueo | 7 | 100 | 6 | 1 | 0 | 0 | 0 |
| Dominio Elevado | 6 | 100 | 5 | 1 | 0 | 0 | 0 |

**Combate a Distancia**

| Dote | Efectos | % | parametro | res_texto | manual | pregunta | narrativo |
|---|---|---|---|---|---|---|---|
| Cobertura Rápida | 3 | 100 | 3 | 0 | 0 | 0 | 0 |
| Disparo a la Carrera Mejorado | 4 | 100 | 4 | 0 | 0 | 0 | 0 |
| Gran Puntería | 4 | 100 | 3 | 1 | 0 | 0 | 0 |
| Puntería Relámpago | 4 | 100 | 4 | 0 | 0 | 0 | 0 |
| Puntería Relámpago Mejorada | 6 | 100 | 6 | 0 | 0 | 0 | 0 |
| Precisión Imperturbable | 5 | 100 | 5 | 0 | 0 | 0 | 0 |
| Recarga Relámpago | 5 | 100 | 5 | 0 | 0 | 0 | 0 |
| Tirador de Larga Distancia | 4 | 100 | 4 | 0 | 0 | 0 | 0 |
| Tirador de Larga Distancia Avanzado | 4 | 100 | 4 | 0 | 0 | 0 | 0 |

**Exploración**

| Dote | Efectos | % | parametro | res_texto | manual | pregunta | narrativo |
|---|---|---|---|---|---|---|---|
| Vigilancia Táctica | 5 | 100 | 5 | 0 | 0 | 0 | 0 |
| Encontrar el Ángulo | 8 | 100 | 5 | 2 | 0 | 0 | 1 |
| Rastreo al Paso | 9 | 100 | 8 | 0 | 0 | 0 | 1 |
| Bioma Predilecto | 6 | **83** | 6 | 0 | 0 | 0 | 0 |
| Olfato de Investigador | 4 | **75** | 3 | 0 | 0 | 1 | 0 |
| Descartar Teoría | 5 | 100 | 5 | 0 | 0 | 0 | 0 |

**Sigilo**

| Dote | Efectos | % | parametro | res_texto | manual | pregunta | narrativo |
|---|---|---|---|---|---|---|---|
| Movimiento Sigiloso | 3 | 100 | 3 | 0 | 0 | 0 | 0 |
| Movimiento Sigiloso Mejorado | 3 | 100 | 3 | 0 | 0 | 0 | 0 |
| Movimiento Sigiloso Constante | 3 | 100 | 3 | 0 | 0 | 0 | 0 |

**Tecnociencia (Psiónica)**

| Dote | Efectos | % | parametro | res_texto | manual | pregunta | narrativo |
|---|---|---|---|---|---|---|---|
| Potencia Psiónica | 5 | **80** | 4 | 0 | 0 | 1 | 0 |
| Maestría Psiónica | 9 | **44** | 4 | 0 | 0 | 5 | 0 |
| Gran Maestría Psiónica | 5 | **80** | 4 | 0 | 0 | 1 | 0 |
| Saber es Poder | 6 | **83** | 4 | 0 | 0 | 1 | 1 |
| Onda Residual | 7 | 100 | 6 | 0 | 0 | 0 | 1 |
| Impacto Métrico | 31 | **90** | 30 | 0 | 0 | 0 | 1 |
| Impacto Métrico Relámpago | 4 | 100 | 4 | 0 | 0 | 0 | 0 |
| Sobrecarga Métrica | 14 | 100 | 12 | 0 | 1 | 0 | 1 |

### 1.3 Qué impide el 100 %

**Efectos en "pregunta" (11)**

| Claim | Texto | Por qué |
|---|---|---|
| atletismo_2.saber_caer#4 | El personaje reduce en 4 metros la altura efectiva de cualquier caída a efectos de cálculo de daño. | regla de daño por caída (no aparece en ninguna fuente) |
| atletismo_2.caer_parado#4 | El personaje reduce en 8 metros la altura efectiva de cualquier caída a efectos de cálculo de daño. | regla de daño por caída (no aparece en ninguna fuente) |
| exploracion.olfato_de_investigador#4 | (Sin efecto en la fuente: la dote termina en la línea de requisito.) | §9.6: efecto de Olfato de Investigador pendiente de Murillo |
| tecnociencia_psionica.potencia_psionica#5 | Los poderes de nivel 1 no generan sobreesfuerzo en ningún contexto | regla del sobreesfuerzo biológico (sistema.md §9.6) |
| tecnociencia_psionica.maestria_psionica#5 | Los poderes de nivel 2 o menos no generan sobreesfuerzo en ningún contexto | regla del sobreesfuerzo biológico (sistema.md §9.6) |
| tecnociencia_psionica.maestria_psionica#6 | Con esta dote, al fracasar la tirada de salvación contra el sobreesfuerzo se recibe un nivel de daño no letal | regla del sobreesfuerzo biológico (sistema.md §9.6) |
| tecnociencia_psionica.maestria_psionica#7 | Con esta dote, en fracaso crítico de la salvación contra el sobreesfuerzo el daño pasa a ser letal y el usuar… | regla del sobreesfuerzo biológico (sistema.md §9.6) |
| tecnociencia_psionica.maestria_psionica#8 | Estando exhausto, el daño por fracaso (salvación contra sobreesfuerzo) pasa a ser letal y causa aturdimiento | regla del sobreesfuerzo biológico (sistema.md §9.6) |
| tecnociencia_psionica.maestria_psionica#9 | Estando exhausto, en caso de fracaso crítico el daño es grave | regla del sobreesfuerzo biológico (sistema.md §9.6) |
| tecnociencia_psionica.gran_maestria_psionica#5 | Los poderes de nivel 3 o menos no generan sobreesfuerzo en ningún contexto | regla del sobreesfuerzo biológico (sistema.md §9.6) |
| tecnociencia_psionica.saber_es_poder#6 | En estado de fatiga hay un 50% de probabilidades de no generar sobreesfuerzo al emplear poderes psiónicos | regla del sobreesfuerzo biológico (sistema.md §9.6) |

Casi todo es la **regla del sobreesfuerzo biológico** (las cuatro dotes de Psiónica; sistema.md §9.6), el **daño por caída** (Saber Caer, Caer Parado) y el efecto que falta de **Olfato de Investigador**.

**Efectos con `campoNuevo` que no caben en el modelo (15)**

| Claim | Texto | Campo nuevo |
|---|---|---|
| actitud_1.mirada_desafiante#5 | Solo puede emplearla una vez por día por objetivo | limite: Limite \| Limite[] — la dote lleva dos límites a la vez (1/turno y 1/día por objetivo) y Limite es único |
| actitud_2.imitacion#7 | Si su puntuación de interpretación es de 3 o superior el bonificador pasa a ser de +3. | Valor.siHabilidadMin: { habilidad: HabilidadId; min: number; valor: number } — el +3 depende de Interpretación ≥ 3, una habilidad; siAtributoMin solo mira atributos (o g… |
| atletismo_1.salto_evasivo#5 | El primer éxito en una tirada de esquiva para evitar un área contabiliza doble | exito_extra: { tipo: 'exito_extra'; alcance; valor: number; condicion } — 'el primer éxito cuenta doble' es +1 éxito solo si ya se supera; ni bono (convertiría fracasos)… |
| atletismo_2.salto_evasivo_mejorado#5 | El primer éxito en una tirada de esquiva para evitar un área contabiliza triple. | exito_multiplicado: { alcance; primerExitoVale: 3; condicion: 'Esquivando un área' } — un bono al total (+2) también convertiría fracasos en éxitos, y la prosa solo mult… |
| combate_melee_2.derribo_brutal#6 | Si se utiliza una acción estándar para derribar, el daño se resuelve como un ataque norma… | Efecto { tipo: 'danio_por_exitos'; alcance; condicion } — el Derribo topa el daño en el básico y esta dote devuelve el +1 por cada 2 éxitos; resolverDanio ya lo calcula,… |
| combate_melee_2.desenfundado_rapido#3 | La dote sirve para armas que se puedan utilizar a una mano | Efecto.soloEmpleo: 'una mano' — filtra el alcance familia:* a las armas con empleo de una mano (el catálogo ya lo tiene en ArmaMelee.empleo) |
| combate_melee_2.desenfundado_rapido#4 | Se aplica en las armas con las que cumpla el requisito | Efecto.siCumple: Requisito — el efecto de una familia solo vale si se cumple la rama del uno_de de su habilidad (melee con Combate Melee 1, fuego con Combate a Distancia… |
| combate_melee_2.golpe_mejorado_con_escudo#3 | El personaje causa daño letal al golpear con el escudo si así lo desea | Efecto { tipo: 'categoria_danio'; alcance: 'especialidad:escudos'; a: 'Letal'; condicion: 'Golpe letal' } — el ataque de escudo es No Letal en el catálogo y la categoría… |
| combate_melee_3.golpe_fatigante#3 | Restricción: golpea al cuerpo con un ataque que provoque daño contundente o con un arma a… | Efecto.filtroArma: { tipoDanio?: string[]; empleo?: 'una mano' \| 'dos manos' } (vale si cumple cualquiera) — el interruptor 'Golpe fatigante' solo debe salir en ataques… |
| combate_melee_3.asesino#5 | Restricción: solo se aplica si el personaje utiliza un estilo de combate (melee o distanc… | Efecto.requisitoAlcance?: Requisito — el efecto solo cuelga del alcance si el personaje cumple ese requisito (Asesino: melee si Combate Melee 2, distancia si Combate a D… |
| combate_melee_3.golpe_entorpecedor#6 | Si tiene éxito (en el reconocimiento) puede realizar un ataque para entorpecer a su rival… | Efecto.requisitoAlcance?: Requisito — el interruptor solo sale en ataques melee si se tiene Combate Melee 1 y en ataques a distancia si se tiene Combate a Distancia 1 ('… |
| exploracion.bioma_predilecto#6 | Al rastrear dentro de su bioma predilecto iguala las condiciones adversas a condiciones n… | fija_opcion: { tipo: 'fija_opcion'; alcance; condicionId: 'terreno'; de: 'adverso'; a: 'normal'; condicion } — un +3 en las opciones adversas se sumaría con Rastreo al P… |
| tecnociencia_psionica.impacto_metrico#6 | Puede utilizar un ataque de pelea o con un arma | resolucion.sobreArma: 'familia:ataque_melee' — la tirada (aplicado, habilidad, mejoras) y el daño base salen del arma elegida; el poder solo añade fatiga, daño extra y e… |
| tecnociencia_psionica.impacto_metrico#8 | Si golpea con éxito, el ataque hace un daño adicional letal igual a 2 + nivel de poder em… | resolucion.danioExtra: {valor: Valor; categoria} — daño que se suma al del arma, no lo sustituye |
| tecnociencia_psionica.impacto_metrico#22 | Vector Descendente: recibe un impacto de compresión vertical que le causa 1 nivel de daño… | Valor.porCadaNiveles: {cada: number; minimo: number} — floor(nivel empleado / 2) con mínimo 1; Valor hoy solo multiplica por nivel |

Los otros 31 efectos con `campoNuevo` sí tienen ruta (van como nota o con el dato a medias) y están en la tabla de §4.2.

---

## 2. Checklist del modelo

Leyenda: **✓** relleno · **–** no aplica (null, vacío o `false` correcto) · **~** relleno con supuesto o con pregunta abierta · **✗** falta (la prosa lo implica y el campo está vacío).

### 2.1 Dotes

Columnas: req = `requisitos` (nº) · elec = `eleccion` · rep = `repetible` · sust = `sustituye` · vis = `visible` · efectos = nº y tipos · UX = `candidataUX` · motor = entradas (claims).

**Actitud**

| Dote | coste | req | elec | rep | sust | vis | efectos | UX | motor |
|---|---|---|---|---|---|---|---|---|---|
| Apoyo ·? | ✓ 2 | ✓2 | – | – | – | ✓ | ✓2 (acción, vent) | ✓ | ✓4 |
| Burla ·? | ✓ 2 | ✓2 | – | – | – | ✓ | ✓1 (acción) | – | ✓5 |
| Humor Negro ·? | ✓ 4 | ✓2 | – | – | – | ✓ | ✓1 (acción) | ✓ | ✓2 |
| Humor de Afrontamiento ·? | ✓ 5 | ✓2 | – | – | – | ✓ | ✓1 (acción) | ✓ | ✓4 |
| Mirada Desafiante ·? | ✓ 2 | ✓2 | – | – | – | ✓ | ✓1 (acción) | ✓ | ✓1 |
| Presencia Imponente | ✓ 3 | ✓3 | – | – | – | ✓ | ✓1 (bono) | – | ✓2 |
| Grito de Guerra ·? | ✓ 3 | ✓2 | – | – | – | ✓ | ✓1 (acción) | ✓ | ✓2 |
| Violencia Aterradora ·? | ✓ 4 | ✓3 | – | – | – | ✓ | ✓2 (acción, vent) | ✓ | ✓3 |
| Alentar ·? | ✓ 2 | ✓2 | – | – | – | ✓ | ✓1 (acción) | – | ✓4 |
| Llamada a las Armas ·? | ✓ 4 | ✓2 | – | – | – | ✓ | ✓1 (acción) | ✓ | ✓3 |
| Acción Inspiradora ·? | ✓ 6 | ✓2 | – | – | – | ✓ | ✓1 (acción) | ✓ | ✓2 |
| Cazador Cazado ·? | ✓ 2 | ✓2 | – | – | – | ✓ | ✓1 (par) | – | ✓1 |
| Enredar ·? | ✓ 3 | ✓2 | – | – | – | ✓ | ✓1 (bono) | – | ✓1 |
| Traicionero ·? | ✓ 4 | ✓2 | – | – | – | ✓ | ✓1 (acción) | ✓ | ✓2 |
| Imitación ·? | ✓ 2 | ✓3 | – | – | – | ✓ | ✓2 (bono, txt) | – | ✓2 |
| Negociación Analítica | ✓ 2 | ✓2 | – | – | – | ✓ | ✓1 (par) | – | ✓1 |

**Atletismo**

| Dote | coste | req | elec | rep | sust | vis | efectos | UX | motor |
|---|---|---|---|---|---|---|---|---|---|
| Paso Defensivo | ✓ 2 | ✓1 | – | – | – | ✓ | ✓2 (txt×2) | ✓ | ✓1 |
| Paso Atrás ·? | ✓ 4 | ✓3 | – | – | – | ✓ | ✓1 (acción) | – | ✓2 |
| Reflejos Felinos ·? | ✓ 4 | ✓2 | – | – | – | ✓ | ✓1 (bono) | ✓ | ✓1 |
| Balanceo ·? | ✓ 2 | ✓1 | – | – | – | ✓ | ✓2 (grado, bono) | – | ✓2 |
| Equilibrista | ✓ 4 | ✓2 | – | – | – | ✓ | ✓1 (crit) | – | ✓1 |
| Como Pez en el Agua ·? | ✓ 1 | ✓1 | – | – | – | ✓ | ✓2 (txt, grado) | – | ✓2 |
| Depredador Acuático ·? | ✓ 3 | ✓1 | – | – | – | ✓ | ✓2 (bono, txt) | – | ✓1 |
| Movilidad | ✓ 2 | ✓2 | – | – | – | ✓ | ✓1 (txt) | – | ✓1 |
| Movilidad Mejorada | ✓ 4 | ✓3 | – | – | ✓ movilidad | ✓ | ✓1 (txt) | – | ✓1 |
| Potencia de Lanzamiento | ✓ 2 | ✓2 | – | – | – | ✓ | ✓2 (txt×2) | – | ✓1 |
| Lanzador Preciso ·? | ✓ 3 | ✓2 | – | – | – | ✓ | ✓2 (txt×2) | – | ✓1 |
| Salto Evasivo ·? | ✓ 3 | ✓3 | – | – | – | ✓ | ✓1 (txt) | – | ✓1 |
| Salto Evasivo Mejorado ·? | ✓ 6 | ✓3 | – | – | ✓ salto_evasivo | ✓ | ✓1 (txt) | – | ✓1 |
| Saber Caer ·? | ✓ 2 | ✓2 | – | – | – | ✓ | ✓1 (txt) | – | ✓1 |
| Caer Parado ·? | ✓ 4 | ✓2 | – | – | ~ null (preg.) | ✓ | ✓1 (txt) | – | ✓1 |
| Salto Ofensivo ·? | ✓ 2 | ✓2 | – | – | – | ✓ | ✓2 (txt×2) | – | ✓1 |
| Salto Ofensivo Mejorado ·? | ✓ 3 | ✓3 | – | – | – | ✓ | ✓5 (bono×5) | – | ✓1 |
| Agarre Rápido ·? | ✓ 2 | ✓2 | – | – | – | ✓ | ✓1 (acción) | ✓ | ✓1 |
| Contacto a Tres Puntos ·? | ✓ 2 | ✓1 | – | – | – | ✓ | ✓2 (txt×2) | – | ✓1 |
| Velocista ·? | ✓ 1 | ✓2 | – | – | – | ✓ | ✓2 (grado, crit) | – | ✓2 |
| Salida Explosiva | ✓ 4 | ✓3 | – | – | – | ✓ | ✓1 (acción) | – | ✓1 |
| Zafarse ·? | ✓ 2 | ✓2 | – | – | – | ✓ | ✓1 (acción) | ✓ | ✓1 |

**Biociencia**

| Dote | coste | req | elec | rep | sust | vis | efectos | UX | motor |
|---|---|---|---|---|---|---|---|---|---|
| Especialidad Médica ·? | ✓ 2 | ✓2 | ✓ | ✓ | – | ✓ | ✓2 (bono, crit) | ✓ | ✓1 |
| Ojo Clínico ·? | ✓ 3 | ✓2 | – | – | – | ✓ | ✓1 (vent) | ✓ | ✓1 |
| Autocuidados ·? | ✓ 6 | ✓4 | – | – | – | ✓ | ✓2 (bono×2) | ✓ | ✓2 |
| Optimización Biotecnológica de Traje ·? | ✓ 2 | ✓2 | – | – | – | ✓ | ✓1 (acción) | – | ✓2 |
| Potenciar Veneno ·? | ✓ 3 | ✓2 | – | – | – | ✓ | ✓1 (acción) | – | ✓2 |
| Artesano Biónico ·? | ✓ 4 | ✓2 | – | – | – | ✓ | ✓2 (txt×2) | – | ✓2 |
| Gran Maestro Biónico ·? | ✓ 6 | ✓2 | – | – | – | ✓ | ✓2 (txt×2) | – | ✓1 |
| Genio Genetista | ✓ 4 | ✓2 | – | – | – | ✓ | ✓2 (txt×2) | – | ✓2 |
| Gran Genio Genetista ·? | ✓ 6 | ✓2 | – | – | – | ✓ | ✓2 (txt×2) | – | ✓1 |

**Combate Melee**

| Dote | coste | req | elec | rep | sust | vis | efectos | UX | motor |
|---|---|---|---|---|---|---|---|---|---|
| Bloqueo ·? | ✓ 2 | ✓1 | – | – | – | ✓ | ✓9 (hab, txt×7, bono) | – | ✓4 |
| Contraataque Rápido | ✓ 4 | ✓3 | – | – | – | ✓ | ✓1 (txt) | ✓ | ✓1 |
| Maestro en Contraataque | ✓ 8 | ✓3 | – | – | ✓ contraataque_rapido | ✓ | ✓1 (txt) | – | ✓1 |
| Combate Sutil ·? | ✓ 2 | ✓2 | – | – | – | ✓ | ✓2 (par×2) | – | ✓1 |
| Ataque de Oportunidad ·? | ✓ 2 | ✓1 | – | – | – | ✓ | ✓1 (acción) | ✓ | ✓1 |
| Ataque de Oportunidad Poderoso | ✓ 4 | ✓3 | – | – | – | ✓ | ✓1 (txt) | – | ✓1 |
| Ataque de Oportunidad Múltiple ·? | ✓ 4 | ✓3 | – | – | – | ✓ | ✓1 (txt) | ✓ | ✓1 |
| Maestro Oportunista | ✓ 8 | ✓3 | – | – | ✓ ataque_de_oportunidad_multiple | ✓ | ✓1 (txt) | – | ✓1 |
| Arrollar ·? | ✓ 3 | ✓2 | – | – | – | ✓ | ✓1 (acción) | – | ✓6 |
| Apresar y Apuñalar ·? | ✓ 2 | ✓1 | – | – | – | ✓ | ✓1 (txt) | ✓ | ✓1 |
| Ataque Melee Doble | ✓ 3 | ✓1 | – | – | – | ✓ | ✓3 (txt×2, bono) | ✓ | ✓2 |
| Combate con Dos Armas Melee ·? | ✓ 4 | ✓2 | – | – | – | ✓ | ✓1 (txt) | – | ✓1 |
| Combinación ·? | ✓ 2 | ✓1 | – | – | – | ✓ | ✓3 (acción, bono×2) | ✓ | ✓3 |
| Combinación Rápida ·? | ✓ 4 | ✓3 | – | – | – | ✓ | ✓2 (bono×2) | – | ✓2 |
| Crítico Mejorado ·? | ✓ 4 | ✓1 | ✓ | – | – | ✓ | ✓1 (crit) | – | ✓1 |
| Derribo Mejorado ·? | ✓ 3 | ✓1 | – | – | – | ✓ | ✓2 (txt×2) | – | ✓1 |
| Derribo Brutal ·? | ✓ 5 | ✓3 | – | – | – | ✓ | ✓2 (bono, txt) | – | ✓2 |
| Desenfundado Rápido ·? | ✓ 1 | ✓1 | – | – | – | ✓ | ✓4 (txt×4) | – | ✓2 |
| Defensa con Escudo Rápida ·? | ✓ 1 | ✓1 | – | – | – | ✓ | ✓1 (txt) | – | ✓1 |
| Golpe Mejorado con Escudo | ✓ 2 | ✓1 | – | – | – | ✓ | ✓1 (txt) | – | ✓1 |
| Defensa con Escudo Constante ·? | ✓ 6 | ✓1 | – | – | – | ✓ | ✓1 (txt) | – | ✓1 |
| Maestro del Escudo ·? | ✓ 8 | ✓1 | – | – | – | ✓ | ✓1 (txt) | – | ✓1 |
| Golpea Primero, Golpea Dos Veces ·? | ✓ 1 | ✓1 | – | – | – | ✓ | ✓1 (txt) | ✓ | ✓1 |
| Finta ·? | ✓ 2 | ✓2 | – | – | – | ✓ | ✓2 (acción, bono) | ✓ | ✓4 |
| Maestro de Fintas ·? | ✓ 4 | ✓4 | – | – | – | ✓ | ✓1 (bono) | ✓ | ✓1 |
| Golpe Fatigante ·? | ✓ 2 | ✓1 | – | – | – | ✓ | ✓2 (txt×2) | – | ✓3 |
| Asalto Sigiloso ·? | ✓ 3 | ✓2 | – | – | – | ✓ | ✓1 (txt) | ✓ | ✓1 |
| Asesino ·? | ✓ 5 | ✓2 | – | – | – | ✓ | ✓2 (txt×2) | – | ✓1 |
| Mata Gigantes ·? | ✓ 4 | ✓3 | – | – | – | ✓ | ✓1 (txt) | – | ✓1 |
| Golpe Entorpecedor ·? | ✓ 2 | ✓2 | – | – | – | ✓ | ✓7 (acción, bono×4, txt×2) | ✓ | ✓3 |
| Táctica de Flanqueo ·? | ✓ 2 | ✓2 | – | – | – | ✓ | ✓4 (acción, bono×2, txt) | ✓ | ✓4 |
| Dominio Elevado ·? | ✓ 2 | ✓2 | – | – | – | ✓ | ✓2 (bono, txt) | – | ✓3 |

**Combate a Distancia**

| Dote | coste | req | elec | rep | sust | vis | efectos | UX | motor |
|---|---|---|---|---|---|---|---|---|---|
| Cobertura Rápida ·? | ✓ 1 | ✓1 | – | – | – | ✓ | ✓1 (txt) | – | ✓1 |
| Disparo a la Carrera Mejorado ·? | ✓ 2 | ✓1 | – | – | – | ✓ | ✓2 (bono, txt) | ✓ | ✓2 |
| Gran Puntería ·? | ✓ 2 | ✓1 | – | – | – | ✓ | ✓2 (grado, txt) | – | ✓2 |
| Puntería Relámpago | ✓ 4 | ✓2 | – | – | – | ✓ | ✓1 (txt) | ✓ | ✓1 |
| Puntería Relámpago Mejorada | ✓ 6 | ✓3 | – | – | – | ✓ | ✓2 (txt×2) | ✓ | ✓1 |
| Precisión Imperturbable ·? | ✓ 8 | ✓3 | – | – | ✓ punteria_relampago_mejorada | ✓ | ✓1 (txt) | – | ✓1 |
| Recarga Relámpago ·? | ✓ 2 | ✓2 | – | – | – | ✓ | ✓2 (txt×2) | ✓ | ✓1 |
| Tirador de Larga Distancia | ✓ 2 | ✓2 | – | – | – | ✓ | ✓1 (bono) | – | ✓1 |
| Tirador de Larga Distancia Avanzado ·? | ✓ 5 | ✓2 | – | – | – | ✓ | ✓1 (bono) | – | ✓1 |

**Exploración**

| Dote | coste | req | elec | rep | sust | vis | efectos | UX | motor |
|---|---|---|---|---|---|---|---|---|---|
| Vigilancia Táctica | ✓ 2 | ✓2 | – | – | – | ✓ | ✓2 (bono, par) | – | ✓2 |
| Encontrar el Ángulo ·? | ✓ 2 | ✓2 | – | – | – | ✓ | ✓1 (acción) | – | ✓3 |
| Rastreo al Paso | ✓ 2 | ✓3 | – | – | – | ✓ | ✓3 (bono×3) | – | ✓1 |
| Bioma Predilecto ·? | ✓ 3 | ✓1 | ~ abierta | – | – | ✓ | ✓5 (vent×2, bono×2, txt) | ✓ | ✓3 |
| Olfato de Investigador ·? | ✓ 2 | ✓2 | – | – | – | ~ false (§9.5) | – (sin efecto en la fuente) | – | – |
| Descartar Teoría ·? | ✓ 3 | ✓2 | – | – | – | ✓ | ✓2 (bono, txt) | ✓ | ✓2 |

**Sigilo**

| Dote | coste | req | elec | rep | sust | vis | efectos | UX | motor |
|---|---|---|---|---|---|---|---|---|---|
| Movimiento Sigiloso | ✓ 3 | ✓1 | – | – | – | ✓ | ✓3 (bono×3) | – | ✓1 |
| Movimiento Sigiloso Mejorado | ✓ 5 | ✓1 | – | – | ✓ movimiento_sigiloso | ✓ | ✓3 (bono×3) | – | ✓1 |
| Movimiento Sigiloso Constante | ✓ 6 | ✓1 | – | – | ✓ movimiento_sigiloso_mejorado | ✓ | ✓3 (bono×3) | – | ✓1 |

**Tecnociencia (Psiónica)**

| Dote | coste | req | elec | rep | sust | vis | efectos | UX | motor |
|---|---|---|---|---|---|---|---|---|---|
| Potencia Psiónica | ✓ 3 | ✓3 | – | – | – | ✓ | ✓1 (txt) | – | ✓1 |
| Maestría Psiónica ·? | ✓ 6 | ✓3 | – | – | ✓ potencia_psionica | ✓ | ✓5 (txt×5) | – | ✓1 |
| Gran Maestría Psiónica ·? | ✓ 9 | ✓3 | – | – | – | ✓ | ✓1 (txt) | – | ✓1 |
| Saber es Poder ·? | ✓ 6 | ✓3 | – | – | – | ✓ | ✓2 (txt×2) | ✓ | ✓1 |
| Onda Residual ·? | ✓ 6 | ✓1 | – | – | – | ✓ | ✓5 (txt×5) | – | ✓3 |
| Impacto Métrico ·? | ✓ 6 | ✓2 | – | – | – | ✓ | ✓1 (poder) | – | ✓5 |
| Impacto Métrico Relámpago ·? | ✓ 4 | ✓2 | – | – | – | ✓ | ✓1 (txt) | ✓ | ✓1 |
| Sobrecarga Métrica ·? | ✓ 6 | ✓3 | – | – | – | ✓ | ✓1 (poder) | – | ✓2 |

`·?` tras el nombre = la dote tiene preguntas abiertas al diseñador (§9).

### 2.2 Acciones propias (`AccionDote`)

Columnas: eco = `economia` · lím = `limite` · res = `resolucion` · objTira = `objetivoTira` · rdos = `resultados` (grados) · notas = nº.

| Dote | Acción | eco | lím | res | objTira | rdos | notas |
|---|---|---|---|---|---|---|---|
| Apoyo | Apoyo | ✓ reaccion/simple | ✓ 1/aliado | ✓ tirada dif 7 | – | ✓ exito/critico | ✓3 |
| Burla | Burla | ✓ simple/reaccion | – | ✓ enfrentada | ✓1 | ✓ exito/critico | ✓3 |
| Humor Negro | Humor negro (repetir salvación contra miedo) | ✓ reaccion | – | ✓ tirada dif ~manual | – | ✓ exito/critico | ✓2 |
| Humor de Afrontamiento | Humor de afrontamiento | ✓ simple/reaccion | ✓ 1/escena | ✓ tirada dif 7 | – | ✓ exito/critico | ✓2 |
| Mirada Desafiante | Mirada desafiante | ✓ gratuita | ✓ 1/turno | ✓ tirada dif ~manual | – | ✗ (preg.) | ✓2 |
| Grito de Guerra | Grito de guerra | ✓ gratuita | ✓ 1/escena | ✓ enfrentada | ~ sin definir | ✗ (preg.) | ✓2 |
| Violencia Aterradora | Violencia aterradora | ✓ gratuita | ✓ 1/escena | ✓ enfrentada | ~ sin definir | ✗ (preg.) | ✓3 |
| Alentar | Alentar | ✓ reaccion/simple | – | ✓ tirada dif 7 | – | ✓ exito/critico | ✓1 |
| Llamada a las Armas | Llamada a las armas | ✓ gratuita | – | ✓ tirada dif 8 | – | ✓ exito/critico | ✓2 |
| Acción Inspiradora | Acción inspiradora | ✓ gratuita | ✓ 1/escena | ✓ tirada dif 7 | – | ~ exito | ✓2 |
| Traicionero | Traicionero (distracción) | ✓ durante una escena social o a… | – | ✓ enfrentada | ✓1 | ~ exito | ✓1 |
| Paso Atrás | Paso atrás | ✓ reaccion | – | ✓ sin_dado | – | ✓1 | ✓3 |
| Agarre Rápido | Aferrarse a un asidero | ✓ gratuita | ✓ 1/turno | ✓ tirada dif ~manual | – | ✓ exito/fracaso | ✓1 |
| Salida Explosiva | Salida explosiva | ✓ reaccion | – | ✓ sin_dado | – | – (sin dado) | ✓1 |
| Zafarse | Zafarse | ✓ reaccion | – | ✓ tirada dif ~manual | – | ✓ exito/fracaso | ✓1 |
| Optimización Biotecnológica de Traje | Optimizar Soporte Vital | ✓ 1 hora | – | ✓ tirada dif 6 | – | ~ exito | ✓3 |
| Potenciar Veneno | Potenciar veneno | ✓ 10 minutos | – | ✓ tirada dif ~manual | – | ✓ critico/exito/fracaso | ✓2 |
| Ataque de Oportunidad | Ataque de oportunidad | ✓ reaccion | – | ✓ sin_dado | – | – (sin dado) | ✓2 |
| Arrollar | Arrollar | ✓ compleja | – | ✓ ataque | ✓2 | ✓ critico/exito/fracaso/fracasoCritico | ✓5 |
| Combinación | Combinación | ✓ compleja | – | ✓ sin_dado | – | – (sin dado) | ✓3 |
| Finta | Finta | ✓ simple/reaccion | – | ✓ enfrentada | ✓1 | ✓ exito/critico/fracasoCritico | – |
| Golpe Entorpecedor | Reconocer debilidad | ✓ simple | – | ✓ tirada dif 6 | – | ✓ critico/exito | – |
| Táctica de Flanqueo | Coordinar flanqueo | ✓ simple/reaccion | – | ✓ enfrentada | ✓1 | ~ exito | ✓1 |
| Encontrar el Ángulo | Encontrar el ángulo | ✓ reaccion/simple | – | ✓ tirada dif 6 | – | ✓ exito/critico | ✓1 |

Lo que falta, aparte de lo marcado:
- **Grito de Guerra, Violencia Aterradora y Mirada Desafiante** no tienen resultados: la fuente no dice qué tira el enemigo ni qué consigue la acción. Va a preguntas.
- **Acción Inspiradora** solo trae el éxito; **Agarre Rápido** y **Zafarse** traen éxito/fracaso sin crítico. Los demás grados que faltan se dan por "como el éxito".
- Las acciones de **poder** (Impacto Métrico, Sobrecarga Métrica) siguen el modelo `AccionPoder` de psiónica y se revisan en §6.9.

---

## 3. Campos del modelo que leerá la tubería

### 3.1 `camposModelo` (ordenados por nº de dotes)

| Campo | Dotes | Qué hace la app con él |
|---|---|---|
| `coste` | 105 | Se suma al gasto de puntos recalculado en cada render (nunca guardado) y se comprueba contra el saldo al comprar. |
| `requisitos[*] / requisitos.* / requisitos` | 105 | Validación al comprar y aviso de requisito roto en ficha, mirando el valor con el que se juega (especie incluida); resuelve uno_de, disciplina 'cualquiera', psionico (especie o implante) y dote previa. |
| `efectos[n] bono/margen_critico/ventaja/sube_grado/cambia_par (+ condicion)` | 62 | montarTirada recoge los efectos de dote cuyo alcance casa con la fila: condicion null → línea fija en el desglose; condicion string → toggle CondicionTirada; cambia_par sustituye aplicado/habilidad de la fila. |
| `efectos[n].accion (AccionDote: resolucion, economia, limite, notas, objetivoTira, resultados, dificultad)` | 27 | Genera una Accion (tirada/enfrentada/ataque) o AccionDirecta (sin_dado) en la pestaña Acciones; dificultad → dificultadSugerida; economia y limite se muestran como dato; notas con condicion → nota del toggle; objetivoTira y resultados → texto por grado en el panel de resultado. |
| `efectos[n].texto (+ lugar, porque, condicion)` | 8 | Se cuelga como nota en la acción/ficha indicada por lugar, solo visible cuando su condicion está activa. |
| `efectos[].valor (number \| base/siAtributoMin \| por tramo de movimiento_oculto)` | 7 | Se resuelve contra la ficha al montar (umbral de atributo/habilidad) o se convierte en opción por tramo; manual se muestra como texto. |
| `efectos[n] habilita` | 4 | La acción habilitada solo aparece en la lista si la ficha tiene la dote. |
| `eleccion / repetible` | 3 | Selector al comprar cuya respuesta se guarda en la ficha y parametriza el alcance de los efectos (especialidad elegida); repetible permite otra compra con elección distinta. |
| `efectos[n].accion de tipo poder (ejes.*.opciones.*, fatiga, duracion, objetivoTira.*.dificultad/grados, resultados.*.danio/estados, ejes.*.opciones.descendente.suma)` | 2 | Pasa por prepararPoder/usarPoder: selector de nivel empleado y de vector en el modal, que fija fatiga (cadena ModificadorFatiga) y suma de daño; duración y estados por grado se resuelven con evaluarValor y efectosDelResultado; objetivoTira se muestra como texto tras tirar. |
| `efectos[0].coste.fatiga` | 1 | Toggle que, marcado, cobra fatiga al confirmar vía pagarFatiga. |

Los recuentos con comodín (`atletismo_1.*`) se han expandido a las dotes del lote; son aproximados cuando el workflow agrupó por patrón.

### 3.2 `camposNuevos` propuestos

| Campo | Forma | Motivo | Claims |
|---|---|---|---|
| `Efecto economia` | `{ tipo: 'economia'; alcance: Alcance; economia?: Economia \| Economia[]; grados?: number; alternativas?: { economia; limite }[]; limite?: Limite; condicion }` | Cambiar el coste en acciones de una acción ya existente (de otra dote o genérica) como dato | combate_melee_1.contraataque_rapido#5, combate_melee_1.contraataque_rapido#6, combate_melee_1.maestro_en_contraataque#5, combate_melee_1.ataque_de_oportunidad_multiple#5, combate_melee_1.maestro_oportunista#5, combate_a_distancia.punteria_relampago#4, combate_a_distancia.punteria_relampago_mejorada#5, combate_a_distancia.precision_imperturbable#5, combate_a_distancia.recarga_relampago#4, combate_a_distancia.recarga_relampago#5, tecnociencia_psionica.impacto_metrico_relampago#4 |
| `Limite múltiple y fuera de AccionDote` | `limite: Limite \| Limite[] en AccionDote, en Dote y por alternativa de economía` | Dotes con dos límites a la vez, límites sin acción propia y límites distintos por economía | actitud_1.mirada_desafiante#5, exploracion.descartar_teoria#5, combate_a_distancia.recarga_relampago#5, combate_melee_1.contraataque_rapido#6 |
| `Efecto.requisitoAlcance` | `requisitoAlcance?: Requisito` | Cada rama del efecto solo vale si se cumple su requisito (melee vs distancia) | combate_melee_2.desenfundado_rapido#4, combate_melee_3.asesino#5, combate_melee_3.golpe_entorpecedor#6 |
| `Efecto texto.grados` | `grados?: Grado[]` | Mostrar el texto solo tras resolver con ese grado | combate_melee_3.golpe_fatigante#6, combate_melee_3.golpe_entorpecedor#9, combate_melee_3.tactica_de_flanqueo#7 |
| `Valor.siMin` | `siMin: { tipo: 'atributo' \| 'habilidad'; id; min; valor } (generaliza siAtributoMin)` | El umbral puede ser de una habilidad (Interpretación ≥ 3) | actitud_2.imitacion#7, actitud_1.presencia_imponente#6 |
| `Efecto exito_extra` | `{ tipo: 'exito_extra'; alcance; primerExitoVale: number; condicion }` | Multiplica un éxito ya obtenido sin convertir fracasos | atletismo_1.salto_evasivo#5, atletismo_2.salto_evasivo_mejorado#5 |
| `notas[].derivado` | `derivado?: { de: 'movimiento_basico' \| 'carrera'; factor?: number; redondeo?: 'arriba' \| 'abajo' }` | Mostrar los metros ya calculados en la nota | combate_melee_1.arrollar#8, atletismo_2.salida_explosiva#5 |
| `condicionFicha` | `condicionFicha?: 'no_fatigado' (estado que la app ya calcula) junto a condicion` | El bono se apaga solo con el umbral de fatiga, sin interruptor | biociencia.autocuidados#6, biociencia.autocuidados#7 |
| `AccionDote.requiereEquipo` | `requiereEquipo?: string[] (ids de equipo: valija, instrumental, laboratorio)` | Bloquear o avisar si falta el equipo; hoy es nota | biociencia.optimizacion_biotecnologica_de_traje#5, biociencia.potenciar_veneno#4 |
| `AccionDote.costeMateriales` | `costeMateriales?: { tier; unidades }` | Descontar sheet.materiales al confirmar | biociencia.optimizacion_biotecnologica_de_traje#7, biociencia.potenciar_veneno#5 |
| `Efectos sobre el daño` | `bono.sobre?: 'tirada' \| 'danio' y { tipo: 'danio_por_exitos'; alcance; condicion }` | Modificar o destopar resolverDanio en vez del d12 | combate_melee_3.golpe_fatigante#5, combate_melee_2.derribo_brutal#6 |
| `Efecto.filtroArma` | `filtroArma?: { tipoDanio?: string[]; empleo?: 'una mano' \| 'dos manos' } (cumplir cualquiera)` | El alcance no filtra por propiedades del arma | combate_melee_2.desenfundado_rapido#3, combate_melee_3.golpe_fatigante#3 |
| `AccionPoder.resolucion.sobreArma + danioExtra` | `sobreArma?: 'familia:ataque_melee'; danioExtra?: { valor: Valor; categoria }` | Tirada y daño base del arma elegida, el poder suma daño | tecnociencia_psionica.impacto_metrico#6, tecnociencia_psionica.impacto_metrico#8 |
| `AccionPoder.disciplinaNivel` | `disciplinaNivel: DisciplinaId` | De qué disciplina sale el nivel poseído que limita el empleado | tecnociencia_psionica.impacto_metrico#7, tecnociencia_psionica.sobrecarga_metrica#7 |
| `Valor.porCadaNiveles` | `porCadaNiveles?: { cada: number; minimo: number }` | floor(nivel empleado / cada) con mínimo | tecnociencia_psionica.impacto_metrico#22, tecnociencia_psionica.sobrecarga_metrica#12 |
| `resolucion.especialidad: string \| string[]` | `especialidad?: string \| string[] — cuenta la que tenga el personaje` | 'empatía o liderazgo' no cabe en una sola especialidad | actitud_1.apoyo#5 |
| `Efecto categoria_danio` | `{ tipo: 'categoria_danio'; alcance; a: categoría; condicion }` | Cambiar la categoría (No Letal → Letal) cambia la absorción | combate_melee_2.golpe_mejorado_con_escudo#3 |
| `Efecto bono.tramo` | `tramo?: TramoDistancia` | El bono depende del tramo ya elegido en el ataque | combate_a_distancia.tirador_de_larga_distancia#4 |
| `Efecto bono.soloEspecialidad / noAcumulaCon` | `soloEspecialidad?: boolean; noAcumulaCon?: string[]` | Vale solo con el toggle en especialidad y no se suma con la dote básica en ese alcance | combate_a_distancia.tirador_de_larga_distancia_avanzado#4 |
| `Efecto fija_opcion` | `{ tipo: 'fija_opcion'; alcance; condicionId; de; a; condicion }` | Sustituir la opción elegida en otra condición en vez de sumar | exploracion.bioma_predilecto#6 |
| `AccionPoder.economia: Economia[]` | `economia: Economia \| Economia[] \| 'tabla'` | 'simple o reacción' a elegir | tecnociencia_psionica.sobrecarga_metrica#6 |

Además, al aplicar las correcciones han salido dos extensiones que no están en el modelo v1:
- `Efecto texto.porque: "capa_pendiente"`: para textos que la app **sí** podrá aplicar cuando exista una capa (daño modificable, categoría de daño, valor por umbral). Ninguno de los seis motivos del modelo lo cubre. Ver §11.
- `eleccion.abierta: true`: Bioma Predilecto da los biomas como ejemplos, no como lista cerrada.

---

## 4. Capas de motor (por nº de dotes que desbloquean)

| Capa | Amplía a | Dotes | Efectos | Depende de |
|---|---|---|---|---|
| **sube_grado**: Cambio de grado del resultado al tirar (Equilibrista sale tras §8: va por `margen_critico`; Velocista solo por su fracaso → éxito) | CondicionTirada (condiciones.ts) + montarTirada/tirarMontada (montaje.ts): hoy solo margenCriticoExito; se añade subeGrado {de, a} leído tras calcular el grado en acciones.ts | 4 | 4 | — |
| **ventaja_por_casilla**: Ventaja activada por interruptor | CondicionTirada (toggle con ventaja: true) + Accion.ventaja / tirarDado (acciones.ts) | 2 | 3 | — |
| **exito_extra**: Éxitos extra solo si ya se acierta | CondicionTirada + cálculo de margen/grado en acciones.ts (resolverTirada): campo exitosExtraSiAcierta aplicado después de decidir el grado | 2 | 2 | — |
| **valor_por_umbral_ficha**: Valor de bono que depende de un umbral de la ficha | CondicionTirada.valorActivo (hoy número fijo de catálogo): pasa a aceptar Valor resuelto con la ficha en montarTirada | 2 | 2 | — |
| **gasto_materiales_accion**: Gasto de materiales al confirmar una acción propia | Gasto de materiales de equipo.ts (el usado por Fabricar/Reparar) llevado a Accion/AccionDirecta como costeMateriales | 2 | 2 | — |
| **danio_modificable**: Condiciones que actúan sobre el daño, no sobre la tirada | resolverDanio (acciones.ts) + Accion.ataque: CondicionTirada con modDanio / danioPorExitos | 2 | 2 | — |
| **fatiga_por_casilla**: Gasto de fatiga al confirmar con casilla marcada | CondicionTirada.gastoActivo (hoy solo recursos) + costeFatiga/pagarFatiga de vitalidad.ts | 1 | 1 | — |
| **nota_con_derivado**: Notas con valor derivado de la ficha | Derivados de movimiento en fichaResuelta (movimiento.ts/derivados.ts) inyectados en el texto de notas al montar | 1 | 1 | — |
| **margen_critico_fijo**: Margen de crítico permanente por alcance | CondicionTirada.margenCriticoExito / montaje.ts (cálculo de margenes), por el mismo camino que los bonos fijos de especie a tiradas (E4) | 1 | 1 | — |
| **fija_opcion_condicion**: Efecto que sustituye la opción de otra condición | CondicionTirada tipo 'opcion' (condiciones.ts) y valorCondiciones en montaje.ts | 1 | 1 | — |
| **poder_sobre_arma**: Poder resuelto con el ataque de un arma | AccionPoder/prepararPoder (usoPoder.ts, poderes.ts) combinada con Accion.ataque de combate.ts | 1 | 1 | danio_modificable |
| **efecto_activo_propio**: Efecto temporal activo sobre la propia ficha | EstadoActivo (estados.ts) + resolverFicha (fichaResuelta.ts): hoy los estados solo dan modificadores a tiradas, no tocan atributos | 1 | 1 | — |

Detalle de cada capa:

- **sube_grado** — Tras resolver la tirada, un efecto (fijo o por casilla) sube el grado: fracaso→éxito o éxito→crítico, con su línea en el desglose. Ya aprobada en el modelo como efecto sube_grado. El caso éxito→crítico ya se puede expresar con margenCriticoExito=0; lo nuevo es fracaso→éxito y que se lea desde el grado ya calculado, no desde el margen. Dotes: Balanceo, Equilibrista, Como Pez en el Agua, Velocista, Gran Puntería.
- **ventaja_por_casilla** — Dos d12 y vale el mejor, pero solo si el jugador marca la casilla (situacional: diagnóstico, bioma predilecto). Hoy Accion.ventaja solo la pone Disciplina.ventajas, siempre activa. Dotes: Ojo Clínico, Bioma Predilecto.
- **exito_extra** — El primer éxito cuenta doble/triple: suma N éxitos al margen únicamente cuando la tirada ya es éxito; no mueve el total del dado ni convierte fracasos. Se parece a sube_grado y a un bono pero no es ninguno de los dos. Dotes: Salto Evasivo, Salto Evasivo Mejorado.
- **valor_por_umbral_ficha** — El número que aporta una casilla o un bono fijo se resuelve contra la ficha al montar la tirada (Fuerza ≥5 → +2; Interpretación ≥3 → +3). Generaliza Valor.siAtributoMin a atributo o habilidad. Dotes: Presencia Imponente, Imitación.
- **gasto_materiales_accion** — Una acción de dote (no Fabricar/Reparar) descuenta sheet.materiales al confirmarse, con bloqueo si no hay. Comparte motivo con requiereEquipo (instrumental/valija/laboratorio), que hoy va como nota. Dotes: Optimización Biotecnológica de Traje, Potenciar Veneno.
- **danio_modificable** — Una casilla puede modificar el resultado de resolverDanio: restar/sumar al daño (Golpe Fatigante −1) o levantar el tope de daño básico del Derribo para que vuelva el +1 por cada 2 éxitos (Derribo Brutal con acción estándar). Dotes: Derribo Brutal, Golpe Fatigante.
- **fatiga_por_casilla** — Marcar un toggle de una tirada normal cobra fatiga al confirmar, por el mismo camino que poderes y visión del Arianyi (pagarFatiga). Hoy costeFatiga solo vive en AccionDirecta/poderes, y gastoActivo del toggle solo descuenta sheet.recursos. Dotes: Ojo Clínico.
- **nota_con_derivado** — Una nota de acción muestra un número ya calculado a partir de un derivado (mitad del movimiento básico redondeando arriba, metros de carrera), en vez de la fórmula en prosa. Dotes: Arrollar.
- **margen_critico_fijo** — Crítico con 5 éxitos siempre que se ataque con armas de la especialidad elegida, sin casilla. Hoy margenCriticoExito solo viaja en una opción/toggle marcado. Dotes: Crítico Mejorado.
- **fija_opcion_condicion** — Con la casilla activa, una opción elegida en otra condición de la tirada cuenta como otra (terreno adverso → normal), evitando la doble cuenta con bonos y cambiando también lo que dependa de la opción (ritmo de rastreo). Dotes: Bioma Predilecto.
- **poder_sobre_arma** — Acción de poder cuya tirada y daño base salen de un arma melee equipada (o golpe de Pelea) elegida al usarla; el poder añade fatiga por nivel empleado, daño extra y efectos por grado. Dotes: Impacto Métrico.
- **efecto_activo_propio** — Un efecto con duración que modifica un atributo propio (Fuerza +2 +1/nivel empleado) y obliga a recalcular aplicados y derivados mientras dura. Dotes: Sobrecarga Métrica.

**Piezas que no son capa nueva pero bloquean muchas dotes** (sacadas de los claims, no del listado de capas):

- **Fuente `sheet.dotes` en `fuentesDeCapa1`** (que las dotes alimenten casillas, bonos fijos, sustituciones y bonos por tramo): 42 dotes. Es el prerrequisito de casi todo.
- **Generador de acciones de dotes** (`accion_sin_equipo` para dotes, análogo a `accionesDePsionica`): 26 dotes.
- **Condiciones de dote en familias de arma** (`condicionesActivas` hoy excluye arma/armaMelee): 15 dotes con números sobre `*_<instancia>`.
- **`habilita`** (gate por dote: Bloqueo, Sutil…): 1 dotes; capa aprobada en §9.3, sin construir.

---

## 5. Candidatas a UX, agrupadas por patrón

### Usos y economía por turno (registro de acciones) (13)

- **Mirada Desafiante**: una vez por turno; una vez por día por objetivo
- **Paso Defensivo**: N usos por turno (1 desplazamiento gratuito tras crítico en esquiva)
- **Agarre Rápido**: 1 uso por turno
- **Contraataque Rápido**: N usos por turno: contraataque gratuito 1/turno
- **Ataque de Oportunidad Múltiple**: N usos por turno: ataque de oportunidad gratuito 1/turno
- **Apresar y Apuñalar**: Reacción extra tras presa: contador de reacciones disponibles
- **Golpea Primero, Golpea Dos Veces**: acción simple extra el primer turno (registro de acciones por turno)
- **Asalto Sigiloso**: coste en acciones: moverse en sigilo y atacar con la reacción en la misma acción (registro de acciones por turno)
- **Disparo a la Carrera Mejorado**: N usos por turno (1): el interruptor de disparo a la carrera sin penalizador podría gastarse y reponerse por turno
- **Puntería Relámpago**: economía alternativa de una acción existente (Apuntar como reacción): candidata al registro de acciones por turno
- **Puntería Relámpago Mejorada**: N usos por turno (1 gratuita) + reacción: candidata al registro de acciones por turno
- **Recarga Relámpago**: N usos por turno (recarga gratuita 1/turno) + economía de la recarga en el botón Recargar de Recursos
- **Impacto Métrico Relámpago**: economía alternativa elegible al usar una acción (estándar en vez de compleja)

### Contadores de uso (escena, aliado, objetivo, pista) (7)

- **Apoyo**: una vez por aliado por escena (contador por aliado)
- **Humor de Afrontamiento**: una vez por escena (contador de usos)
- **Grito de Guerra**: una vez por escena de combate
- **Reflejos Felinos**: Compensa el contador de atacantes adicionales (tope: no pasa de 0)
- **Finta**: penalizador por objetivo repetido: contador de fintas por enemigo en vez de casilla
- **Maestro de Fintas**: estado por objetivo ('ya fintado'): la app podría recordar contra quién se ha fintado en vez de un interruptor
- **Descartar Teoría**: botón 'Repetir (−2)' en el resultado de un fracaso con Investigación, con contador de 1 uso por pista

### Ofrecer la acción solo cuando se da su disparador (5)

- **Humor Negro**: ofrecer la acción tras fallar una salvación contra miedo
- **Violencia Aterradora**: ofrecer la acción tras un ataque melee letal que deja a 0 PG; una vez por escena de combate
- **Llamada a las Armas**: disponible solo en el primer turno de combate
- **Acción Inspiradora**: ofrecer la acción tras un crítico propio en enfrentada o contra dificultad 8+; una vez por escena
- **Zafarse**: mostrar la acción solo con el estado Atrapado activo

### Selector / filtro en el modal de tirada (4)

- **Especialidad Médica**: Selector de afección tratada en 'Tratar heridas' que active solo las parejas compradas (una casilla por compra de la dote)
- **Ataque de Oportunidad**: Lanzar desde esta acción el Golpear con X filtrado a modos Simple
- **Ataque Melee Doble**: Botón de ataque doble que monte las dos tiradas (una por arma) con su casilla marcada
- **Bioma Predilecto**: interruptor de entorno persistente ('estoy en mi bioma') que active solo las casillas de esta dote en vez de marcarlas tirada a tirada

### Casilla que la app activa o apaga sola (2)

- **Autocuidados**: La app ya conoce el umbral Fatigado (FichaResuelta): podría ocultar la casilla sola cuando el personaje esté fatigado o exhausto
- **Saber es Poder**: tirada de 50 % (moneda) al usar un poder estando fatigado

### Acción en dos pasos (una tirada enciende el interruptor de la siguiente) (2)

- **Golpe Entorpecedor**: acción en dos pasos: una tirada previa (Reconocer debilidad) que, al salir bien, enciende el interruptor del ataque siguiente
- **Táctica de Flanqueo**: acción en dos pasos: la tirada de coordinar enciende el +3 del ataque siguiente

### Pintar la acción en otro grupo (Iniciativa) (1)

- **Traicionero**: acción que puede sustituir a la tirada de iniciativa: pintarla también en el grupo Iniciativa (hoy AccionDote no tiene grupo)

### Casilla con coste (ventaja que cobra fatiga) (1)

- **Ojo Clínico**: Casilla 'Ventaja (Ojo Clínico, 1 fatiga)' en Tratar heridas que active los dos d12 y descuente la fatiga al confirmar

### Otros (1)

- **Combinación**: una acción compleja que encadena tres tiradas de ataque melee (la tercera, solo sutil o pelea) en vez de tres tiradas sueltas con su casilla

---

## 6. Por grupo y dote

Las dotes no tienen ejes de uso ni ajustes por nivel poseído (salvo §6.9). Por cada dote: sus efectos de la propuesta y la tabla de claims agregados por terna. **✎** = corregido en verificación (o en esta redacción, **✎✎**).

### 6.1 Actitud

#### Apoyo (`dote_apoyo`, coste 2)

- Requisitos: uno de (actitud/empatia 1 o actitud/liderazgo 1); aplicado expresion 1.
- acción `dotes_apoyo` (reaccion/simple, 1/aliado): tirada expresion + actitud, dif 7
- ventaja en `dotes_apoyo` si «¿El vínculo de afecto con el aliado es fuerte?»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos.0, requisitos.1 | — |
| accion · accion_nueva:dotes_apoyo · accion_sin_equipo · pendiente | 4, 5, ✎10 | parametro → efectos.0.accion.economia; parametro → efectos.0.accion.limite; parametro → efectos.0.accion.resolucion | campo nuevo: resolucion.especialidad: string \| string[] |
| texto · objetivo_tercero:salvacion_efecto_mental_aliado · nota_fija · pendiente | 6, 8 | resultado_texto → efectos.0.accion.resultados.critico.texto; resultado_texto → efectos.0.accion.resultados.exito.texto | — |
| texto · objetivo_tercero:siguiente_prueba_aliado · nota_fija · pendiente | 7, 9 | resultado_texto → efectos.0.accion.resultados.critico.texto; resultado_texto → efectos.0.accion.resultados.exito.texto | — |
| numerico · accion_nueva:dotes_apoyo · eleccion_jugador · pendiente | 11 | parametro → efectos.1 | — |

#### Burla (`dote_burla`, coste 2)

- Requisitos: especialidad actitud/humor 1; atributo caracter 1.
- acción `dotes_burla` (simple/reaccion): enfrentada expresion + actitud + humor

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos.0, requisitos.1 | — |
| accion · accion_nueva:dotes_burla · accion_sin_equipo · pendiente | 4, 5 | parametro → efectos.0.accion.economia; parametro → efectos.0.accion.resolucion | — |
| narrativo · ninguna · — · pendiente | 6 | narrativo → efectos.0.accion.notas.1 | — |
| texto · objetivo_tercero:tiradas_perspicacia_objetivo · nota_fija · pendiente | 7, 9 | resultado_texto → efectos.0.accion.resultados.critico.texto; resultado_texto → efectos.0.accion.resultados.exito.texto | — |
| texto · objetivo_tercero:tiradas_voluntad_objetivo · nota_fija · pendiente | 8, 10 | resultado_texto → efectos.0.accion.resultados.critico.texto; resultado_texto → efectos.0.accion.resultados.exito.texto | — |
| texto · objetivo_tercero:tiradas_perspicacia_voluntad_objetivo · nota_fija · pendiente | 11 | parametro → efectos.0.accion.notas.2 | — |
| texto · objetivo_tercero:enfrentada_contra_burla_objetivo · nota_fija · pendiente | 12 | parametro → efectos.0.accion.notas.2 | — |

#### Humor Negro (`dote_humor_negro`, coste 4)

- Requisitos: especialidad actitud/humor 2; aplicado voluntad 1.
- acción `dotes_humor_negro` (reaccion): tirada expresion + actitud + humor, dif «la de la salvación contra miedo que fallaste»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos.0, requisitos.1 | — |
| accion · accion_nueva:dotes_humor_negro · accion_sin_equipo · pendiente | 4, 6 | parametro → efectos.0.accion; parametro → efectos.0.accion.resolucion | — |
| narrativo · ninguna · — · pendiente | 5 | narrativo → efectos.0.accion.notas.1 | — |
| texto · objetivo_tercero:miedo_aliados · nota_fija · pendiente | 7 | resultado_texto → efectos.0.accion.resultados.critico.texto | — |

#### Humor de Afrontamiento (`dote_humor_de_afrontamiento`, coste 5)

- Requisitos: especialidad actitud/humor 3; aplicado expresion 2.
- acción `dotes_humor_de_afrontamiento` (simple/reaccion, 1/escena): tirada expresion + actitud + humor, dif 7

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos.0, requisitos.1 | — |
| accion · accion_nueva:dotes_humor_de_afrontamiento · accion_sin_equipo · pendiente | ✎4, 5, ✎6, 7 | parametro → efectos.0.accion.economia; parametro → efectos.0.accion.limite; parametro → efectos.0.accion.notas.0; parametro → efectos.0.accion.resolucion | — |
| texto · objetivo_tercero:tiradas_contra_efectos_emocionales_aliados · nota_fija · pendiente | 8, 10 | resultado_texto → efectos.0.accion.resultados.critico.texto; resultado_texto → efectos.0.accion.resultados.exito.texto | — |
| texto · objetivo_tercero:penalizadores_aliados · nota_fija · pendiente | 9 | resultado_texto → efectos.0.accion.resultados.exito.texto | — |
| texto · objetivo_tercero:penalizadores_umbral_aliados · nota_fija · pendiente | 11 | resultado_texto → efectos.0.accion.resultados.critico.texto | — |

#### Mirada Desafiante (`dote_mirada_desafiante`, coste 2)

- Requisitos: especialidad actitud/intimidacion 1; atributo caracter 1.
- acción `dotes_mirada_desafiante` (gratuita, 1/turno): tirada expresion + actitud + intimidacion, dif «la de intimidar a ese objetivo; la fuente no la fija»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos.0, requisitos.1 | — |
| accion · accion_nueva:dotes_mirada_desafiante · accion_sin_equipo · pendiente | 4, ✎5 | parametro → efectos.0.accion; parametro → ∅ | campo nuevo: limite: Limite \| Limite[] |

#### Presencia Imponente (`dote_presencia_imponente`, coste 3)

- Requisitos: atributo fuerza 2; atributo caracter 1; especialidad actitud/intimidacion 1.
- bono `especialidad:intimidacion` {"base": 1, "siAtributoMin": {"atributo": "fuerza", "min": 5, "valor": 2}} si «¿Tu físico influye en la amenaza?»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4 | parametro → coste, requisitos.0, requisitos.1, requisitos.2 | — |
| numerico · accion_existente:social · eleccion_jugador · pendiente | 5 | parametro → efectos.0.valor.base | — |
| numerico · accion_existente:social · hueco · pendiente | ✎6 | parametro → efectos.0.valor.siAtributoMin | hueco: CondicionTirada cuyo valorActivo dependa de un atributo de la ficha (Fuerza ≥5 → +2); eleccion_jugador solo admite número fijo de catálogo |

#### Grito de Guerra (`dote_grito_de_guerra`, coste 3)

- Requisitos: atributo caracter 2; especialidad actitud/intimidacion 2.
- acción `dotes_grito_de_guerra` (gratuita, 1/escena): enfrentada expresion + actitud + intimidacion

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos.0, requisitos.1 | — |
| accion · accion_nueva:dotes_grito_de_guerra · accion_sin_equipo · pendiente | 4 | parametro → efectos.0.accion | — |
| accion · accion_nueva:dotes_grito_de_guerra · accion_sin_equipo · bloqueado | 5 | parametro → efectos.0.accion.resolucion | bloqueo: La fuente no dice qué tiran los enemigos ni qué logra el grito (pregunta al diseñador) |

#### Violencia Aterradora (`dote_violencia_aterradora`, coste 4)

- Requisitos: especialidad actitud/intimidacion 3; atributo caracter 1; dote dote_mirada_desafiante.
- acción `dotes_violencia_aterradora` (gratuita, 1/escena): enfrentada expresion + actitud + intimidacion
- ventaja en `dotes_violencia_aterradora` si «¿El ataque que lo desencadenó fue crítico?»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4 | parametro → coste, requisitos.0, requisitos.1, requisitos.2 | — |
| accion · accion_nueva:dotes_violencia_aterradora · accion_sin_equipo · pendiente | 5, ✎7 | parametro → efectos.0.accion; parametro → efectos.0.accion.limite | — |
| accion · accion_nueva:dotes_violencia_aterradora · accion_sin_equipo · bloqueado | ✎6 | parametro → efectos.0.accion.notas.1 | bloqueo: La fuente no define qué tiran los enemigos ni qué consigue 'aterrorizar' (pregunta al diseñador) |
| numerico · accion_nueva:dotes_violencia_aterradora · eleccion_jugador · pendiente | 8 | parametro → efectos.1 | — |

#### Alentar (`dote_alentar`, coste 2)

- Requisitos: especialidad actitud/liderazgo 1; atributo caracter 1.
- acción `dotes_alentar` (reaccion/simple): tirada expresion + actitud + liderazgo, dif 7

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos.0, requisitos.1 | — |
| accion · accion_nueva:dotes_alentar · accion_sin_equipo · pendiente | 4, ✎5, 6 | parametro → efectos.0.accion; parametro → efectos.0.accion.economia; parametro → efectos.0.accion.resolucion | — |
| texto · objetivo_tercero:tiradas_contra_miedo_aliados · nota_fija · pendiente | 7 | resultado_texto → efectos.0.accion.resultados.exito.texto | — |
| texto · objetivo_tercero:salvacion_miedo_aliados · nota_fija · pendiente | 8 | resultado_texto → efectos.0.accion.resultados.exito.texto | — |
| texto · objetivo_tercero:miedo_aliados · nota_fija · pendiente | 9 | resultado_texto → efectos.0.accion.resultados.critico.texto | — |

#### Llamada a las Armas (`dote_llamada_a_las_armas`, coste 4)

- Requisitos: especialidad actitud/liderazgo 3; atributo caracter 1.
- acción `dotes_llamada_a_las_armas` (gratuita): tirada expresion + actitud + liderazgo, dif 8

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos.0, requisitos.1 | — |
| accion · accion_nueva:dotes_llamada_a_las_armas · accion_sin_equipo · pendiente | ✎4, 5, 6 | parametro → efectos.0.accion.economia; parametro → efectos.0.accion.notas.0; parametro → efectos.0.accion.resolucion | — |
| texto · objetivo_tercero:tiradas_contra_miedo_aliados · nota_fija · pendiente | 7 | resultado_texto → efectos.0.accion.resultados.exito.texto | — |
| texto · objetivo_tercero:primer_ataque_aliados · nota_fija · pendiente | 8 | resultado_texto → efectos.0.accion.resultados.critico.texto | — |

#### Acción Inspiradora (`dote_accion_inspiradora`, coste 6)

- Requisitos: atributo caracter 2; especialidad actitud/liderazgo 2.
- acción `dotes_accion_inspiradora` (gratuita, 1/escena): tirada voluntad + actitud + liderazgo, dif 7

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos.0, requisitos.1 | — |
| accion · accion_nueva:dotes_accion_inspiradora · accion_sin_equipo · pendiente | 4, ✎5, 6, ✎8 | parametro → efectos.0.accion; parametro → efectos.0.accion.limite; parametro → efectos.0.accion.notas.1; parametro → efectos.0.accion.resolucion.dificultad | — |
| texto · objetivo_tercero:siguiente_tirada_aliados · nota_fija · pendiente | 7 | resultado_texto → efectos.0.accion.resultados.exito.texto | — |

#### Cazador Cazado (`dote_cazador_cazado`, coste 2)

- Requisitos: especialidad actitud/manipulacion 1; aplicado perspicacia 1.
- cambia par en `detectar_mentiras` → perspicacia + actitud + manipulacion si «¿Calando si alguien miente, finge u oculta sus intenciones?»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos.0, requisitos.1 | — |
| numerico · accion_existente:detectar_mentiras · sustitucion_aplicado · bloqueado | ✎4 | parametro → efectos.0 | bloqueo: S5 / pregunta 3: especialidades en lista cerrada (elegir qué especialidad cuenta al tirar), y no existe la tirada de detectar mentiras (Perspicacia + Actitud/Empatía) |

#### Enredar (`dote_enredar`, coste 3)

- Requisitos: especialidad actitud/manipulacion 2; aplicado expresion 2.
- bono `social` 2 si «Vuelve a mentir tras ser descubierto (reduce en 2 el penalizador)»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| narrativo · ninguna · — · construido | 4 | narrativo → ∅ | — |
| numerico · accion_existente:social · eleccion_jugador · pendiente | 5 | parametro → efectos[0].valor | — |

#### Traicionero (`dote_traicionero`, coste 4)

- Requisitos: especialidad actitud/manipulacion 3; aplicado expresion 1.
- acción `dotes_traicionero` (durante una escena social o antes de un combate (vale como tirada de iniciativa)): enfrentada expresion + actitud + manipulacion

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| accion · accion_nueva:dotes_traicionero · accion_sin_equipo · pendiente | ✎4, ✎5, 6 | parametro → efectos[0].accion.economia; parametro → efectos[0].accion.notas[0]; parametro → efectos[0].accion.resolucion | — |
| texto · objetivo_tercero:defensa · nota_fija · pendiente | 7 | resultado_texto → efectos[0].accion.resultados.exito.texto | — |

#### Imitación (`dote_imitacion`, coste 2)

- Requisitos: especialidad actitud/manipulacion 1; habilidad interpretacion 1; atributo caracter 1.
- bono `imitar` 2 si «Imitando a otra persona»
- texto [capa_pendiente] en `imitar`: Con Interpretación 3 o más, el bono es +3. (si «Imitando a otra persona»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4 | parametro → coste, requisitos[0], requisitos[1], requisitos[2] | — |
| narrativo · ninguna · — · construido | 5 | narrativo → ∅ | — |
| numerico · accion_existente:imitar · eleccion_jugador · bloqueado | 6 | parametro → efectos[0].valor | bloqueo: falta la tirada de imitar: Interpretación sin contenido en la fuente |
| numerico · accion_existente:imitar · hueco · bloqueado | ✎7 | parametro → ∅ | hueco: Valor del bono que depende del nivel de una habilidad del portador (Interpretación ≥ 3 → +3): eleccion_jugador exige número fijo de catálogo y Valor solo tiene siAtributoMin, no umbral por hab… |

#### Negociación Analítica (`dote_negociacion_analitica`, coste 2)

- Requisitos: aplicado perspicacia 2; especialidad actitud/negociacion 1.
- cambia par en `social` → perspicacia si «Negociando: Perspicacia en lugar de Expresión»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| narrativo · ninguna · — · construido | 4 | narrativo → ∅ | — |
| numerico · accion_existente:social · sustitucion_aplicado · pendiente | 5 | parametro → efectos[0].aplicado | — |


### 6.2 Atletismo

#### Paso Defensivo (`dote_paso_defensivo`, coste 2)

- Requisitos: habilidad atletismo 1.
- texto [tablero] en `defensa`: Con éxito crítico en la esquiva puedes desplazarte una casilla como acción gratuita. (si «Éxito crítico en la esquiva»)
- texto [turno] en `defensa`: Ese desplazamiento, una vez por turno (acción gratuita). (si «Éxito crítico en la esquiva»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2 | parametro → coste, requisitos[0] | — |
| texto · accion_existente:defensa · nota_fija · pendiente | 3, 4 | parametro → efectos[0]; parametro → efectos[1] | — |

#### Paso Atrás (`dote_paso_atras`, coste 4)

- Requisitos: dote dote_paso_defensivo; habilidad atletismo 3; aplicado reflejos 2.
- acción `dotes_paso_atras` (reaccion): sin_dado

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4 | parametro → coste, requisitos[0], requisitos[1], requisitos[2] | — |
| accion · accion_nueva:dotes_paso_atras · accion_sin_equipo · pendiente | 5 | parametro → efectos[0].accion | — |
| texto · accion_existente:dotes_paso_atras · nota_fija · pendiente | 6, 7 | parametro → efectos[0].accion.notas[1]; parametro → efectos[0].accion.notas[2] | — |

#### Reflejos Felinos (`dote_reflejos_felinos`, coste 4)

- Requisitos: habilidad atletismo 3; aplicado reflejos 2.
- bono `defensa` 1 si «Con penalizador por acciones defensivas acumuladas (atacantes adicionales ≥ 1)»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| numerico · accion_existente:defensa · eleccion_jugador · pendiente | 4 | parametro → efectos[0] | — |

#### Balanceo (`dote_balanceo`, coste 2)

- Requisitos: especialidad atletismo/equilibrio 1.
- sube grado fracaso → exito en `atletismo` si «Tirada de equilibrio sobre superficie inestable o resbaladiza»
- bono `atletismo` 1 si «¿Para evitar un derribo?»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2 | parametro → coste, requisitos[0] | — |
| numerico · accion_existente:atletismo · hueco · bloqueado | 3 | parametro → efectos[0] | hueco: capa de cambio de grado del resultado al tirar (sube_grado: fracaso→éxito, éxito→crítico) con su línea en el desglose; bloqueo: capa nueva sube_grado (aprobada en sistema.md §9.3, sin construi… |
| numerico · accion_existente:atletismo · eleccion_jugador · pendiente | 4 | parametro → efectos[1] | — |

#### Equilibrista (`dote_equilibrista`, coste 4)

- Requisitos: especialidad atletismo/equilibrio 3; atributo agilidad 2.
- crítico con 0 éxitos en `atletismo` si «Tirada de equilibrio»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| numerico · accion_existente:atletismo · eleccion_jugador · pendiente | ✎✎4 | parametro → efectos[0] | — |

#### Como Pez en el Agua (`dote_como_pez_en_el_agua`, coste 1)

- Requisitos: especialidad atletismo/nado 1.
- texto [turno] en `atletismo`: Mantenerse a flote en medio acuático es una acción gratuita. (si «Nadando»)
- sube grado fracaso → exito en `atletismo` si «Moverse nadando en aguas turbulentas»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2 | parametro → coste, requisitos[0] | — |
| texto · accion_existente:atletismo · nota_fija · pendiente | 3 | parametro → efectos[0] | — |
| numerico · accion_existente:atletismo · hueco · bloqueado | 4 | parametro → efectos[1] | hueco: capa de cambio de grado del resultado al tirar (sube_grado: fracaso→éxito, éxito→crítico) con su línea en el desglose; bloqueo: capa nueva sube_grado (aprobada en sistema.md §9.3, sin construi… |

#### Depredador Acuático (`dote_depredador_acuatico`, coste 3)

- Requisitos: especialidad atletismo/nado 3.
- bono `familia:ataque_melee` 2 si «Dentro del agua»
- texto [tercero] en `familia:ataque_melee`: No anula la reducción de daño −2 de los golpes contundentes bajo el agua. (si «Dentro del agua»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2 | parametro → coste, requisitos[0] | — |
| numerico · accion_existente:ataque_melee_<instancia> · eleccion_jugador · pendiente | ✎✎3 | parametro → efectos[0] | — |

#### Movilidad (`dote_movilidad`, coste 2)

- Requisitos: especialidad atletismo/acrobacias 1; aplicado reflejos 1.
- texto [tercero] en `ficha`: Al moverte, ignoras el primer ataque de oportunidad que provoques, siempre que estés prevenido del atacante.

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| texto · objetivo_tercero:dotes_ataque_de_oportunidad · nota_fija · pendiente | 4 | parametro → efectos[0] | — |

#### Movilidad Mejorada (`dote_movilidad_mejorada`, coste 4)

- Requisitos: dote dote_movilidad; especialidad atletismo/acrobacias 3; aplicado reflejos 2. sustituye a `dote_movilidad`.
- texto [tercero] en `ficha`: Al moverte, ignoras todos los ataques de oportunidad que provoques durante el movimiento, siempre que estés prevenido del atacante.

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4 | parametro → coste, requisitos[0], requisitos[1], requisitos[2] | — |
| texto · objetivo_tercero:dotes_ataque_de_oportunidad · nota_fija · pendiente | 5 | parametro → efectos[0] | — |

#### Potencia de Lanzamiento (`dote_potencia_de_lanzamiento`, coste 2)

- Requisitos: especialidad atletismo/lanzamiento 1; aplicado potencia 1.
- texto [tablero] en `familia:lanzar_granada`: Para la distancia de lanzamiento, tu Potencia cuenta 1 más (alcance (Potencia + 1) × 10 m).
- texto [tablero] en `familia:lanzar_melee`: Para la distancia de lanzamiento, tu Potencia cuenta 1 más (alcance (Potencia + 1) × 10 m).

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| texto · accion_existente:lanzar_granada_<id> · nota_fija · pendiente | 4 | parametro → efectos[0] | — |

#### Lanzador Preciso (`dote_lanzador_preciso`, coste 3)

- Requisitos: especialidad atletismo/lanzamiento 2; aplicado reflejos 1.
- texto [tablero] en `familia:lanzar_granada`: Ignoras un nivel de cobertura física del objetivo.
- texto [tablero] en `familia:lanzar_melee`: Ignoras un nivel de cobertura física del objetivo.

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| texto · accion_existente:lanzar_granada_<id> · nota_fija · pendiente | 4 | parametro → efectos[0] | — |

#### Salto Evasivo (`dote_salto_evasivo`, coste 3)

- Requisitos: especialidad atletismo/salto 2; especialidad atletismo/acrobacias 2; aplicado reflejos 1.
- texto [sin_regla] en `defensa`: Esquivando un área: el primer éxito cuenta doble (+1 éxito si aciertas). (si «Esquivando un área»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4 | parametro → coste, requisitos[0], requisitos[1], requisitos[2] | — |
| numerico · accion_existente:defensa · hueco · pendiente | 5 | parametro → ∅ | hueco: éxito extra condicionado a que la tirada ya sea éxito (suma a los éxitos acumulados, no al total del dado); campo nuevo: exito_extra: { tipo: 'exito_extra'; alcance; valor: number; condicion } |

#### Salto Evasivo Mejorado (`dote_salto_evasivo_mejorado`, coste 6)

- Requisitos: especialidad atletismo/salto 4; especialidad atletismo/acrobacias 4; aplicado reflejos 2. sustituye a `dote_salto_evasivo`.
- texto [sin_regla] en `defensa`: Esquivando un área: el primer éxito cuenta triple (+2 éxitos si aciertas). No se suma con Salto Evasivo. (si «Esquivando un área»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4 | parametro → coste, requisitos[0], requisitos[1], requisitos[2] | — |
| numerico · accion_existente:defensa · hueco · pendiente | 5 | parametro → ∅ | hueco: éxitos extra condicionados a acertar (el primer éxito cuenta N veces), sin convertir un fallo en éxito; campo nuevo: exito_multiplicado: { alcance; primerExitoVale: 3; condicion: 'Esquivando u… |

#### Saber Caer (`dote_saber_caer`, coste 2)

- Requisitos: especialidad atletismo/salto 1; atributo agilidad 1.
- texto [sin_regla] en `ficha`: Caídas: la altura efectiva se reduce en 4 m para calcular el daño.

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| texto · accion_existente:danio_caida · nota_fija · bloqueado | 4 | pregunta → efectos[0].texto | bloqueo: regla de daño por caída (no aparece en ninguna fuente) |

#### Caer Parado (`dote_caer_parado`, coste 4)

- Requisitos: especialidad atletismo/salto 3; atributo agilidad 2.
- texto [sin_regla] en `ficha`: Caídas: la altura efectiva se reduce en 8 m para calcular el daño (no se suma con Saber Caer).

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| texto · accion_existente:danio_caida · nota_fija · bloqueado | 4 | pregunta → efectos[0].texto | bloqueo: regla de daño por caída (no aparece en ninguna fuente) |

#### Salto Ofensivo (`dote_salto_ofensivo`, coste 2)

- Requisitos: especialidad atletismo/salto 2; aplicado reflejos 1.
- texto [turno] en `atletismo`: Puedes atacar (melee o a distancia) durante un salto como una sola acción.
- texto [turno] en `atletismo`: La acción combinada cuesta la más compleja de las dos (salto o ataque).

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| texto · accion_existente:atletismo · nota_fija · pendiente | 4, 5 | parametro → efectos[0].texto; parametro → efectos[1].texto | — |

#### Salto Ofensivo Mejorado (`dote_salto_ofensivo_mejorado`, coste 3)

- Requisitos: especialidad atletismo/salto 3; aplicado reflejos 2; dote dote_salto_ofensivo.
- bono `familia:ataque_melee` 2 si «Atacando durante un salto»
- bono `familia:ataque_fuego` 2 si «Atacando durante un salto»
- bono `familia:lanzar_melee` 2 si «Atacando durante un salto»
- bono `familia:lanzar_granada` 2 si «Atacando durante un salto»
- bono `familia:ataque_pesado` 2 si «Atacando durante un salto»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4 | parametro → coste, requisitos[0], requisitos[1], requisitos[2] | — |
| numerico · accion_existente:ataque_melee_<instancia> · eleccion_jugador · pendiente | 5 | parametro → efectos[0].valor | — |

#### Agarre Rápido (`dote_agarre_rapido`, coste 2)

- Requisitos: especialidad atletismo/escalada 1; aplicado reflejos 1.
- acción `dotes_agarre_rapido` (gratuita, 1/turno): tirada reflejos + atletismo + escalada, dif «según el asidero (máster)»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| accion · accion_nueva:dotes_agarre_rapido · accion_sin_equipo · pendiente | 4 | parametro → efectos[0].accion | — |

#### Contacto a Tres Puntos (`dote_contacto_a_tres_puntos`, coste 2)

- Requisitos: especialidad atletismo/escalada 2.
- texto [sin_regla] en `atletismo`: Puedes trepar con una mano ocupada sin penalización. (si «Trepando con una mano ocupada»)
- texto [narrativo] en `atletismo`: La mano ocupada cuenta como en uso mientras trepas, salvo que te pares y te apoyes en los otros tres puntos. (si «Trepando con una mano ocupada»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2 | parametro → coste, requisitos[0] | — |
| texto · accion_existente:atletismo · nota_fija · pendiente | 3, 4 | parametro → efectos[0].texto; parametro → efectos[1].texto | — |

#### Velocista (`dote_velocista`, coste 1)

- Requisitos: especialidad atletismo/carrera 1; aplicado potencia 1.
- sube grado fracaso → exito en `carrera`
- crítico con 0 éxitos en `carrera` si «Corriendo (acción estándar o compleja)»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| numerico · accion_existente:carrera · hueco · bloqueado | ✎✎4 | parametro → efectos[0] | hueco: cambio de grado de resultado al tirar (fracaso → éxito) con su línea en el desglose; bloqueo: acción Carrera (reflejos + carrera dif. 6, fuente/habilidades.md) sin pasar a sistema.md ni a acci… |
| numerico · accion_existente:carrera · eleccion_jugador · bloqueado | ✎5 | parametro → efectos[1] | bloqueo: acción Carrera (reflejos + carrera dif. 6, fuente/habilidades.md) sin pasar a sistema.md ni a acciones.ts |

#### Salida Explosiva (`dote_salida_explosiva`, coste 4)

- Requisitos: especialidad atletismo/carrera 3; aplicado potencia 2; dote dote_velocista.
- acción `dotes_salida_explosiva` (reaccion): sin_dado

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4 | parametro → coste, requisitos[0], requisitos[1], requisitos[2] | — |
| accion · accion_nueva:dotes_salida_explosiva · accion_sin_equipo · pendiente | 5 | parametro → efectos[0].accion | campo nuevo: notas[].valorDerivado: 'carrera' |

#### Zafarse (`dote_zafarse`, coste 2)

- Requisitos: especialidad atletismo/escapismo 2; atributo agilidad 1.
- acción `dotes_zafarse` (reaccion): tirada potencia + atletismo + escapismo, dif «según lo que te atrapa (máster)»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| accion · accion_nueva:dotes_zafarse · accion_sin_equipo · pendiente | 4 | parametro → efectos[0].accion | — |


### 6.3 Biociencia

#### Especialidad Médica (`dote_especialidad_medica`, coste 2)

- Requisitos: especialidad biociencia/medicina 2; atributo inteligencia 1. elección «Pareja de afecciones», repetible.
- bono `medicina` 1 si «Tratando una afección de la pareja elegida»
- crítico con 5 éxitos en `medicina` si «Tratando una afección de la pareja elegida»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4, 7 | parametro → coste, eleccion, repetible, requisitos[0], requisitos[1] | — |
| numerico · accion_existente:medicina · eleccion_jugador · pendiente | 5, 6 | parametro → efectos[0]; parametro → efectos[1] | — |

#### Ojo Clínico (`dote_ojo_clinico`, coste 3)

- Requisitos: especialidad biociencia/medicina 3; aplicado perspicacia 2.
- ventaja en `medicina` si «Prueba de diagnóstico», cuesta 1 fatiga

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| numerico · accion_existente:medicina · hueco · pendiente | 4, 5 | parametro → efectos[0]; parametro → efectos[0].coste.fatiga | hueco: ventaja opcional activada por una casilla al tirar: hoy Accion.ventaja solo existe fija (disciplinas en conPsionicaEnTiradaFija) y CondicionTirada solo suma números; hueco: gasto de fatiga al … |

#### Autocuidados (`dote_autocuidados`, coste 6)

- Requisitos: especialidad biociencia/medicina 3; habilidad actitud 2; aplicado fortaleza 1; aplicado voluntad 1.
- bono `salv_fortaleza` 1 si «Contra enfermedad (no vale si estás fatigado)»
- bono `salv_voluntad` 1 si «Contra efectos emocionales (no vale si estás fatigado)»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4, 5 | parametro → coste, requisitos[0], requisitos[1], requisitos[2], requisitos[3] | — |
| numerico · accion_existente:salv_fortaleza · eleccion_jugador · pendiente | 6 | parametro → efectos[0] | campo nuevo: condicionFicha: 'no_fatigado' |
| numerico · accion_existente:salv_voluntad · eleccion_jugador · pendiente | 7 | parametro → efectos[1] | campo nuevo: condicionFicha: 'no_fatigado' |

#### Optimización Biotecnológica de Traje (`dote_optimizacion_biotecnologica_de_traje`, coste 2)

- Requisitos: especialidad biociencia/biotecnologia 2; atributo inteligencia 1.
- acción `dotes_optimizar_soporte_vital` (1 hora): tirada perspicacia + biociencia + biotecnologia, dif 6

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| narrativo · ninguna · — · construido | 4 | narrativo → efectos[0].accion.notas[2] | — |
| accion · accion_nueva:dotes_optimizar_soporte_vital · accion_sin_equipo · pendiente | ✎5, 6, 8 | parametro → efectos[0].accion.notas[0]; parametro → efectos[0].accion.resolucion; resultado_texto → efectos[0].accion.resultados.exito | arbitraje: pendiente; campo nuevo: requiereEquipo: string[] en AccionDote |
| accion · accion_nueva:dotes_optimizar_soporte_vital · hueco · bloqueado | 7 | parametro → efectos[0].accion.notas[1] | hueco: gasto de materiales del inventario (sheet.materiales) al confirmar una acción propia que no es Fabricar/Reparar; bloqueo: equivalencia 'material común biológico' ↔ materiales sencillos/sofisti… |

#### Potenciar Veneno (`dote_potenciar_veneno`, coste 3)

- Requisitos: especialidad biociencia/bioquimica 2; atributo inteligencia 1.
- acción `dotes_potenciar_veneno` (10 minutos): tirada perspicacia + biociencia + bioquimica, dif «5 + nivel de la toxina»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| accion · accion_nueva:dotes_potenciar_veneno · accion_sin_equipo · pendiente | 4, 6, 7, 8, 9 | parametro → efectos[0].accion; parametro → efectos[0].accion.resolucion; resultado_texto → efectos[0].accion.resultados.critico; resultado_texto → efectos[0].a… | campo nuevo: requiereEquipo: string[] en AccionDote |
| accion · accion_nueva:dotes_potenciar_veneno · hueco · bloqueado | 5 | parametro → efectos[0].accion.notas[1] | hueco: gasto de materiales del inventario (sheet.materiales) al confirmar una acción propia que no es Fabricar/Reparar; bloqueo: equivalencia 'material común biológico' ↔ materiales de la ficha sin d… |

#### Artesano Biónico (`dote_artesano_bionico`, coste 4)

- Requisitos: especialidad biociencia/bionica 3; atributo inteligencia 2.
- texto [area_sin_construir] en `ficha`: −1 a la dificultad de fabricar y reparar implantes biónicos.
- texto [area_sin_construir] en `ficha`: Fabricar y reparar implantes biónicos cuesta un 10 % menos.

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| numerico · accion_existente:fabricar_implante_bionico · siempre_activo · bloqueado | 4 | parametro → efectos[0] | bloqueo: área de aumentos/biónica sin construir (sistema.md §11, §9.3) |
| texto · accion_existente:fabricar_implante_bionico · nota_fija · bloqueado | 5 | parametro → efectos[1] | bloqueo: área de aumentos/biónica sin construir (sistema.md §11, §9.3) |

#### Gran Maestro Biónico (`dote_gran_maestro_bionico`, coste 6)

- Requisitos: especialidad biociencia/bionica 6; dote dote_artesano_bionico.
- texto [area_sin_construir] en `ficha`: Fabricar y reparar implantes biónicos cuesta un 15 % menos (sustituye al 10 % de Artesano Biónico).
- texto [area_sin_construir] en `ficha`: Con éxito crítico en la fabricación o reparación, el coste baja un 25 %. (si «Éxito crítico al fabricar o reparar un implante biónico»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| texto · accion_existente:fabricar_implante_bionico · nota_fija · bloqueado | 4, 5 | parametro → efectos[0]; parametro → efectos[1] | bloqueo: área de aumentos/biónica sin construir (sistema.md §11, §9.3) |

#### Genio Genetista (`dote_genio_genetista`, coste 4)

- Requisitos: especialidad biociencia/ingenieria_genetica 3; atributo inteligencia 2.
- texto [area_sin_construir] en `ficha`: −1 a la dificultad para realizar aumentos genéticos.
- texto [area_sin_construir] en `ficha`: Realizar aumentos genéticos cuesta un 10 % menos.

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| numerico · accion_existente:realizar_aumento_genetico · siempre_activo · bloqueado | 4 | parametro → efectos[0] | bloqueo: área de aumentos genéticos sin construir (sistema.md §11, §9.3) |
| texto · accion_existente:realizar_aumento_genetico · nota_fija · bloqueado | 5 | parametro → efectos[1] | bloqueo: área de aumentos genéticos sin construir (sistema.md §11, §9.3) |

#### Gran Genio Genetista (`dote_gran_genio_genetista`, coste 6)

- Requisitos: especialidad biociencia/ingenieria_genetica 6; dote dote_genio_genetista.
- texto [area_sin_construir] en `ficha`: Realizar aumentos genéticos cuesta un 15 % menos (sustituye al 10 % de Genio Genetista).
- texto [area_sin_construir] en `ficha`: Con éxito crítico al realizar el aumento, el coste baja un 25 %. (si «Éxito crítico al realizar un aumento genético»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| texto · accion_existente:realizar_aumento_genetico · nota_fija · bloqueado | 4, 5 | parametro → efectos[0]; parametro → efectos[1] | bloqueo: área de aumentos genéticos sin construir (sistema.md §11, §9.3) |


### 6.4 Combate Melee

#### Bloqueo (`dote_bloqueo`, coste 2)

- Requisitos: habilidad combate_melee 1.
- habilita `familia:bloquear_melee`
- texto [tercero] en `familia:bloquear_melee`: Solo vale contra ataques melee.
- texto [turno] en `familia:bloquear_melee`: Si superas al atacante con crítico, puedes contraatacarle como reacción. (si «critico»)
- texto [tablero] en `familia:bloquear_melee`: El contraataque solo puede ser melee y solo si tienes el alcance adecuado. (si «critico»)
- texto [tercero] en `familia:bloquear_melee`: Ciertos ataques pueden causar daño o efectos al ser bloqueados aunque el bloqueo tenga éxito.
- texto [tablero] en `familia:bloquear_melee`: Atacante más grande: −2 por cada tamaño de diferencia.
- texto [tablero] en `familia:bloquear_melee`: Atacante más pequeño: +1 por cada tamaño de diferencia.
- bono `familia:bloquear_melee` -3 si «Desarmado frente a atacante armado»
- texto [tercero] en `familia:bloquear_melee`: Si tu ataque natural o desarmado hace daño letal no cuentas como desarmado: no marques la casilla. (si «Desarmado frente a atacante armado»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2 | parametro → coste, requisitos[0] | — |
| texto · accion_existente:bloquear_melee_<instancia> · nota_fija · pendiente | 3, 6, 7, 9, 10, 11 | parametro → efectos[1]; parametro → efectos[4]; parametro → efectos[5]; parametro → efectos[6]; resultado_texto → efectos[2]; resultado_texto → efectos[3] | — |
| habilitador · accion_existente:bloquear_melee_<instancia> · gate_instalacion · pendiente | 4 | parametro → efectos[0] | arbitraje: duro |
| narrativo · ninguna · — · construido | 5, 8 | narrativo → ∅ | — |
| numerico · accion_existente:bloquear_melee_<instancia> · eleccion_jugador · pendiente | 12 | parametro → efectos[7] | — |
| texto · accion_existente:bloquear_melee_<instancia> · eleccion_jugador · pendiente | 13 | parametro → efectos[8] | — |

#### Contraataque Rápido (`dote_contraataque_rapido`, coste 4)

- Requisitos: atributo agilidad 1; habilidad combate_melee 3; dote dote_bloqueo.
- texto [turno] en `familia:bloquear_melee`: Contraataque como acción gratuita en vez de reacción, una vez por turno. (si «critico»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4 | parametro → coste, requisitos[0], requisitos[1], requisitos[2] | — |
| texto · accion_existente:bloquear_melee_<instancia> · nota_fija · pendiente | 5, 6 | parametro → efectos[0] | campo nuevo: Efecto tipo 'economia': { alcance: Alcance; economia: Economia; limite: Limite; condicion }; campo nuevo: limite en el Efecto 'economia' propuesto en #5: { veces: 1, por: 'turno' } |

#### Maestro en Contraataque (`dote_maestro_en_contraataque`, coste 8)

- Requisitos: atributo agilidad 2; habilidad combate_melee 6; dote dote_contraataque_rapido. sustituye a `dote_contraataque_rapido`.
- texto [turno] en `familia:bloquear_melee`: Contraataque como acción gratuita, sin límite por turno. (si «critico»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4 | parametro → coste, requisitos[0], requisitos[1], requisitos[2] | — |
| texto · accion_existente:bloquear_melee_<instancia> · nota_fija · pendiente | 5 | parametro → efectos[0] | campo nuevo: Efecto tipo 'economia' (ver Contraataque Rápido): { alcance, economia: 'gratuita', limite: null } como dato |

#### Combate Sutil (`dote_combate_sutil`, coste 2)

- Requisitos: atributo agilidad 1; habilidad combate_melee 1.
- cambia par en `familia:ataque_melee` → reflejos si «Sutil»
- cambia par en `familia:bloquear_melee` → reflejos si «Sutil»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| habilitador · accion_existente:ataque_melee_<instancia> · sustitucion_aplicado · pendiente | 4 | parametro → efectos[0] | arbitraje: duro |

#### Ataque de Oportunidad (`dote_ataque_de_oportunidad`, coste 2)

- Requisitos: habilidad combate_melee 1.
- acción `dotes_ataque_de_oportunidad` (reaccion): sin_dado

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2 | parametro → coste, requisitos[0] | — |
| accion · accion_nueva:dotes_ataque_de_oportunidad · accion_sin_equipo · pendiente | 3, ✎4 | parametro → efectos[0].accion; parametro → efectos[0].accion.notas[1] | — |

#### Ataque de Oportunidad Poderoso (`dote_ataque_de_oportunidad_poderoso`, coste 4)

- Requisitos: habilidad combate_melee 3; atributo fuerza 1; dote dote_ataque_de_oportunidad.
- texto [turno] en `dotes_ataque_de_oportunidad`: Puedes usar un ataque de modo Estándar en el ataque de oportunidad.

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4 | parametro → coste, requisitos[0], requisitos[1], requisitos[2] | — |
| texto · accion_existente:dotes_ataque_de_oportunidad · nota_fija · pendiente | 5 | parametro → efectos[0] | — |

#### Ataque de Oportunidad Múltiple (`dote_ataque_de_oportunidad_multiple`, coste 4)

- Requisitos: habilidad combate_melee 3; atributo agilidad 1; dote dote_ataque_de_oportunidad.
- texto [turno] en `dotes_ataque_de_oportunidad`: Un ataque de oportunidad por turno como acción gratuita, sin gastar la reacción.

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4 | parametro → coste, requisitos[0], requisitos[1], requisitos[2] | — |
| texto · accion_existente:dotes_ataque_de_oportunidad · nota_fija · pendiente | 5 | parametro → efectos[0] | campo nuevo: Efecto tipo 'economia': { alcance: 'dotes_ataque_de_oportunidad'; economia: ['reaccion','gratuita']; limite: { veces: 1, por: 'turno' } sobre la gratuita } |

#### Maestro Oportunista (`dote_maestro_oportunista`, coste 8)

- Requisitos: habilidad combate_melee 6; atributo agilidad 2; dote dote_ataque_de_oportunidad_multiple. sustituye a `dote_ataque_de_oportunidad_multiple`.
- texto [turno] en `dotes_ataque_de_oportunidad`: Tus ataques de oportunidad son acción gratuita, sin límite.

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4 | parametro → coste, requisitos[0], requisitos[1], requisitos[2] | — |
| texto · accion_existente:dotes_ataque_de_oportunidad · nota_fija · pendiente | 5 | parametro → efectos[0] | campo nuevo: Efecto tipo 'economia' (ver Múltiple): { economia: 'gratuita', limite: null } como dato |

#### Arrollar (`dote_arrollar`, coste 3)

- Requisitos: atributo fuerza 2; especialidad combate_melee/pelea 1.
- acción `dotes_arrollar` (compleja): ataque potencia + combate_melee

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| accion · accion_nueva:dotes_arrollar · accion_sin_equipo · pendiente | 4, ✎5, ✎6, ✎7, ✎9, ✎10, ✎11, ✎16, ✎17, ✎18, ✎19, ✎20, ✎23, ✎24 | parametro → efectos[0].accion; parametro → efectos[0].accion.notas[0]; parametro → efectos[0].accion.notas[1]; parametro → efectos[0].accion.notas[2]; parametr… | — |
| texto · accion_existente:dotes_arrollar · hueco · pendiente | 8 | parametro → efectos[0].accion.notas[1] | hueco: nota con un valor derivado de la ficha calculado al mostrar (fracción de un derivado, como la mitad del movimiento básico redondeando arriba); campo nuevo: AccionDote.notas[].derivado: { de: '… |
| texto · objetivo_tercero:defensa · nota_fija · pendiente | 12, 21 | parametro → efectos[0].accion.objetivoTira[0] | — |
| texto · objetivo_tercero:bloquear_melee_<instancia> · nota_fija · pendiente | 13 | parametro → efectos[0].accion.objetivoTira[0] | — |
| texto · objetivo_tercero:atletismo · nota_fija · pendiente | 14, 15 | resultado_texto → efectos[0].accion.objetivoTira[1].grados.exito; resultado_texto → efectos[0].accion.resultados.critico | — |
| texto · objetivo_tercero:dotes_ataque_de_oportunidad · nota_fija · pendiente | 22 | parametro → efectos[0].accion.notas[4] | — |

#### Apresar y Apuñalar (`dote_apresar_y_apunalar`, coste 2)

- Requisitos: habilidad combate_melee 1.
- texto [turno] en `familia:ataque_melee`: Tras una presa con éxito, si llevas esta arma de una mano, ganas una reacción para atacar con ella.

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2 | parametro → coste, requisitos[0] | — |
| texto · accion_existente:ataque_melee_<instancia> · nota_fija · pendiente | 3 | parametro → efectos[0] | — |

#### Ataque Melee Doble (`dote_ataque_melee_doble`, coste 3)

- Requisitos: habilidad combate_melee 2.
- texto [turno] en `familia:ataque_melee`: Con un arma melee en cada mano: un ataque con cada una como acción estándar, ambos con modos que normalmente sean acción simple. (si «Ataque doble»)
- texto [tablero] en `familia:ataque_melee`: Los dos ataques al mismo objetivo, dentro de tu alcance. (si «Ataque doble»)
- bono `familia:ataque_melee` -1 si «Ataque doble»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2 | parametro → coste, requisitos[0] | — |
| texto · accion_existente:ataque_melee_<instancia> · eleccion_jugador · pendiente | 3, 4, 5 | parametro → efectos[0]; parametro → efectos[1] | — |
| numerico · accion_existente:ataque_melee_<instancia> · eleccion_jugador · pendiente | 6 | parametro → efectos[2] | — |
| narrativo · ninguna · — · construido | 7 | narrativo → ∅ | — |

#### Combate con Dos Armas Melee (`dote_combate_con_dos_armas_melee`, coste 4)

- Requisitos: dote dote_ataque_melee_doble; habilidad combate_melee 3.
- texto [turno] en `familia:ataque_melee`: En el ataque doble puedes combinar un ataque de modo Estándar y uno Simple, en vez de dos Simples. (si «Ataque doble»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| texto · accion_existente:ataque_melee_<instancia> · eleccion_jugador · pendiente | 4 | parametro → efectos[0] | — |

#### Combinación (`dote_combinacion`, coste 2)

- Requisitos: habilidad combate_melee 1.
- acción `dotes_combinacion` (compleja): sin_dado
- bono `familia:ataque_melee` -1 si «Combinación»
- bono `grupo:Defensa` -1 si «Combinación este turno»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2 | parametro → coste, requisitos[0] | — |
| accion · accion_nueva:dotes_combinacion · accion_sin_equipo · pendiente | 3, ✎5 | parametro → efectos[0].accion; parametro → efectos[0].accion.notas[1] | — |
| numerico · accion_existente:ataque_melee_<instancia> · eleccion_jugador · pendiente | 4 | parametro → efectos[1] | — |
| numerico · accion_existente:defensa · eleccion_jugador · pendiente | 6 | parametro → efectos[2] | — |

#### Combinación Rápida (`dote_combinacion_rapida`, coste 4)

- Requisitos: habilidad combate_melee 2; atributo agilidad 2; dote dote_combinacion.
- bono `familia:ataque_melee` 1 si «Combinación en modo sutil»
- bono `grupo:Defensa` 1 si «Combinación en modo sutil este turno»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4 | parametro → coste, requisitos[0], requisitos[1], requisitos[2] | — |
| numerico · accion_existente:defensa · eleccion_jugador · pendiente | 5 | parametro → efectos[1] | — |
| numerico · accion_existente:ataque_melee_<instancia> · eleccion_jugador · pendiente | 6 | parametro → efectos[0] | — |

#### Crítico Mejorado (`dote_critico_mejorado`, coste 4)

- Requisitos: uno de (combate_melee 3 o combate_distancia 3). elección «Especialidad de arma».
- crítico con 5 éxitos en `especialidad:<elegida>`

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, eleccion, requisitos[0] | — |
| numerico · accion_existente:ataque_melee_<instancia>|ataque_fuego_<instancia> · eleccion_jugador · pendiente | ✎✎4 | parametro → efectos[0] | — |

#### Derribo Mejorado (`dote_derribo_mejorado`, coste 3)

- Requisitos: habilidad combate_melee 2.
- texto [tercero] en `familia:ataque_melee`: Derribo con éxito: el objetivo pierde 1 punto de fatiga. (si «Derribo»)
- texto [tercero] en `familia:ataque_melee`: Si el objetivo saca fracaso crítico en su tirada contra el derribo, además queda aturdido hasta el final de su próximo turno. (si «Derribo»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2 | parametro → coste, requisitos[0] | — |
| texto · objetivo_tercero:resistir_derribo · nota_fija · pendiente | 3, 4 | resultado_texto → efectos[0]; resultado_texto → efectos[1] | — |

#### Derribo Brutal (`dote_derribo_brutal`, coste 5)

- Requisitos: atributo fuerza 2; habilidad combate_melee 3; dote dote_derribo_mejorado.
- bono `familia:ataque_melee` 2 si «Derribo causando daño»
- texto [capa_pendiente] en `familia:ataque_melee`: Derribo con acción estándar: el daño se resuelve como un ataque normal, con el aumento por éxitos (sin el tope de daño básico). (si «Derribo con acción estándar»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4 | parametro → coste, requisitos[0], requisitos[1], requisitos[2] | — |
| numerico · accion_existente:ataque_melee_<instancia> · eleccion_jugador · pendiente | 5 | parametro → efectos[0] | — |
| numerico · accion_existente:ataque_melee_<instancia> · hueco · pendiente | ✎6 | parametro → ∅ | hueco: Ninguna condición puede cambiar el cálculo de daño por éxitos (levantar el tope de daño básico del Derribo con acción estándar); campo nuevo: Efecto { tipo: 'danio_por_exitos'; alcance; condic… |

#### Desenfundado Rápido (`dote_desenfundado_rapido`, coste 1)

- Requisitos: uno de (combate_distancia 1 o combate_melee 1).
- texto [turno] en `familia:ataque_melee`: Armas a una mano: puedes desenfundar y hacer un ataque simple en la misma acción.
- texto [turno] en `familia:ataque_fuego`: Armas a una mano: puedes desenfundar y hacer un ataque simple en la misma acción.
- texto [tercero] en `familia:ataque_melee`: Si es tu primer ataque contra este objetivo y actúas antes que él, está sorprendido contra este ataque. (si «Desenfundando, primer ataque y actúas antes»)
- texto [tercero] en `familia:ataque_fuego`: Si es tu primer disparo contra este objetivo y actúas antes que él, está sorprendido contra este ataque. (si «Desenfundando, primer disparo y actúas antes»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2 | parametro → coste, requisitos[0] | — |
| narrativo · ninguna · — · pendiente | 3, 4 | parametro → ∅ | campo nuevo: Efecto.soloEmpleo: 'una mano'; campo nuevo: Efecto.siCumple: Requisito |
| texto · accion_existente:ataque_melee_<instancia> · nota_fija · pendiente | 5 | parametro → efectos[0] | — |
| texto · objetivo_tercero:defensa · nota_fija · pendiente | 6 | resultado_texto → efectos[2] | — |

#### Defensa con Escudo Rápida (`dote_defensa_con_escudo_rapida`, coste 1)

- Requisitos: especialidad combate_melee/escudos 1.
- texto [turno] en `familia:levantar_escudo`: Puedes levantar el escudo con una reacción en vez de una acción simple.

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2 | parametro → coste, requisitos[0] | — |
| texto · accion_existente:levantar_escudo_<instancia> · nota_fija · pendiente | 3 | parametro → efectos[0] | — |

#### Golpe Mejorado con Escudo (`dote_golpe_mejorado_con_escudo`, coste 2)

- Requisitos: especialidad combate_melee/escudos 2.
- texto [capa_pendiente] en `familia:ataque_melee`: Golpe con escudo: si quieres, el daño es letal en vez de no letal. (si «Golpe letal con escudo»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2 | parametro → coste, requisitos[0] | — |
| texto · accion_existente:ataque_melee_<instancia> · eleccion_jugador · pendiente | 3 | parametro → ∅ | campo nuevo: Efecto { tipo: 'categoria_danio'; alcance: 'especialidad:escudos'; a: 'Letal'; condicion: 'Golpe letal' } |

#### Defensa con Escudo Constante (`dote_defensa_con_escudo_constante`, coste 6)

- Requisitos: especialidad combate_melee/escudos 4.
- texto [turno] en `familia:levantar_escudo`: Puedes levantar el escudo con una acción gratuita contra cualquier ataque, salvo si estás desprevenido.

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2 | parametro → coste, requisitos[0] | — |
| texto · accion_existente:levantar_escudo_<instancia> · nota_fija · pendiente | 3 | parametro → efectos[0] | — |

#### Maestro del Escudo (`dote_maestro_del_escudo`, coste 8)

- Requisitos: especialidad combate_melee/escudos 6.
- texto [tercero] en `familia:levantar_escudo`: +1 a la cobertura del escudo en alto (el atacante la suma a su dificultad).

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2 | parametro → coste, requisitos[0] | — |
| texto · objetivo_tercero:ataque_contra_portador · nota_fija · pendiente | 3 | parametro → efectos[0] | — |

#### Golpea Primero, Golpea Dos Veces (`dote_golpea_primero_golpea_dos_veces`, coste 1)

- Requisitos: habilidad combate_melee 1.
- texto [turno] en `grupo:Iniciativa`: Si en el primer turno del combate actúas antes que un enemigo, ese turno tienes una acción simple adicional para un golpe melee simple.

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2 | parametro → coste, requisitos[0] | — |
| texto · accion_existente:iniciativa · nota_fija · pendiente | 3 | parametro → efectos[0] | — |

#### Finta (`dote_finta`, coste 2)

- Requisitos: atributo agilidad 1; habilidad combate_melee 1.
- acción `dotes_finta` (simple/reaccion): enfrentada expresion + combate_melee
- bono `dotes_finta` -2 si «Finta repetida contra el mismo enemigo»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| accion · accion_nueva:dotes_finta · accion_sin_equipo · pendiente | ✎4, 5, ✎9 | parametro → efectos[0].accion.economia; parametro → efectos[0].accion.resolucion; resultado_texto → efectos[0].accion.resultados.fracasoCritico | — |
| texto · objetivo_tercero:alerta_activa · nota_fija · pendiente | 6 | parametro → efectos[0].accion.objetivoTira | — |
| texto · objetivo_tercero:defensa · nota_fija · pendiente | ✎7, ✎8 | resultado_texto → efectos[0].accion.resultados.critico; resultado_texto → efectos[0].accion.resultados.exito | — |
| numerico · accion_nueva:dotes_finta · eleccion_jugador · pendiente | ✎10 | parametro → efectos[1] | — |

#### Maestro de Fintas (`dote_maestro_de_fintas`, coste 4)

- Requisitos: atributo agilidad 2; aplicado expresion 1; habilidad combate_melee 3; dote dote_finta.
- bono `dotes_finta` 2 si «Finta repetida contra un enemigo ya engañado»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4, 5 | parametro → coste, requisitos[0], requisitos[1], requisitos[2], requisitos[3] | — |
| numerico · accion_existente:dotes_finta · eleccion_jugador · pendiente | 6 | parametro → efectos[0] | — |

#### Golpe Fatigante (`dote_golpe_fatigante`, coste 2)

- Requisitos: habilidad combate_melee 2.
- texto [capa_pendiente] en `familia:ataque_melee`: Golpe fatigante (golpe al cuerpo, con daño contundente o arma a dos manos): el daño se reduce en 1. (si «Golpe fatigante»)
- texto [tercero] en `familia:ataque_melee`: Si el golpe tiene éxito, el rival tira una salvación de Fortaleza + Atletismo enfrentada al resultado de tu ataque. Éxito: sin efecto. Fracaso: pierde 1 punto de fatiga. Fracaso crítico: pierde 1 punto de fatiga y durante su siguiente turno sufre asfixia grado 1. (si «Golpe fatigante»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2 | parametro → coste, requisitos[0] | — |
| numerico · accion_existente:ataque_melee_<instancia> · eleccion_jugador · pendiente | ✎3 | parametro → ∅ | arbitraje: pendiente; campo nuevo: Efecto.filtroArma: { tipoDanio?: string[]; empleo?: 'una mano' \| 'dos manos' } (vale si cumple cualquiera) |
| narrativo · ninguna · — · construido | 4 | narrativo → ∅ | — |
| numerico · accion_existente:ataque_melee_<instancia> · hueco · pendiente | 5 | parametro → efectos[0] | hueco: modificador al daño (no a la tirada) que el jugador elige al tirar: CondicionTirada solo mueve el total de la tirada, no el daño de resolverDanio; campo nuevo: Efecto.bono.sobre: 'tirada' \| '… |
| texto · objetivo_tercero:salvacion_fortaleza_atletismo · nota_fija · pendiente | 6, 7, 8, 9 | resultado_texto → efectos[1] | campo nuevo: Efecto.texto.grados?: Grado[] |

#### Asalto Sigiloso (`dote_asalto_sigiloso`, coste 3)

- Requisitos: habilidad combate_melee 1; habilidad sigilo 2.
- texto [turno] en `sigilo`: Como parte de la misma acción puedes acercarte en sigilo hasta alcanzar a un objetivo y atacarle gastando tu reacción.

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| texto · accion_existente:sigilo · nota_fija · pendiente | 4 | parametro → efectos[0] | — |

#### Asesino (`dote_asesino`, coste 5)

- Requisitos: uno de (combate_melee 2 o combate_distancia 2); habilidad sigilo 3.
- texto [tercero] en `familia:ataque_melee`: Si atacas a un objetivo sorprendido o desprevenido, tus ataques siguientes mantienen la condición de sorpresa. Solo con Combate Melee 2. (si «Objetivo sorprendido o desprevenido»)
- texto [tercero] en `familia:ataque_fuego`: Si atacas a un objetivo sorprendido o desprevenido, tus ataques siguientes mantienen la condición de sorpresa. Solo con Combate a Distancia 2. (si «Objetivo sorprendido o desprevenido»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| texto · objetivo_tercero:defensa · nota_fija · pendiente | 4, ✎5 | parametro → ∅; resultado_texto → efectos[0] | arbitraje: pendiente; campo nuevo: Efecto.requisitoAlcance?: Requisito |

#### Mata Gigantes (`dote_mata_gigantes`, coste 4)

- Requisitos: habilidad combate_melee 3; atributo fuerza 4; especialidad exploracion/tactica 1.
- texto [tablero] en `familia:ataque_melee`: Cuando haces maniobras contra un enemigo de mayor tamaño, cuentas como si fueras un tamaño mayor. (si «Maniobra contra un enemigo de mayor tamaño»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4 | parametro → coste, requisitos[0], requisitos[1], requisitos[2] | — |
| texto · accion_existente:ataque_melee_<instancia> · nota_fija · pendiente | 5 | parametro → efectos[0] | — |

#### Golpe Entorpecedor (`dote_golpe_entorpecedor`, coste 2)

- Requisitos: uno de (combate_melee 1 o combate_distancia 1); especialidad exploracion/tactica 1.
- acción `dotes_reconocer_debilidad` (simple): tirada perspicacia + exploracion + tactica, dif 6
- bono `familia:ataque_melee` -2 si «Golpe entorpecedor (debilidad reconocida)»
- bono `familia:ataque_fuego` -2 si «Golpe entorpecedor (debilidad reconocida)»
- bono `familia:ataque_melee` 2 si «Debilidad reconocida con crítico»
- bono `familia:ataque_fuego` 2 si «Debilidad reconocida con crítico»
- texto [tercero] en `familia:ataque_melee`: Si el ataque tiene éxito, el objetivo queda entorpecido 1d4 turnos; con crítico, entorpecido en su grado crítico durante 1d4 turnos. (si «Golpe entorpecedor (debilidad reconocida)»)
- texto [tercero] en `familia:ataque_fuego`: Si el ataque tiene éxito, el objetivo queda entorpecido 1d4 turnos; con crítico, entorpecido en su grado crítico durante 1d4 turnos. (si «Golpe entorpecedor (debilidad reconocida)»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| narrativo · ninguna · — · construido | 4 | narrativo → ∅ | — |
| accion · accion_nueva:dotes_reconocer_debilidad · accion_sin_equipo · pendiente | 5 | parametro → efectos[0].accion | — |
| numerico · accion_existente:ataque_melee_<instancia> · eleccion_jugador · pendiente | ✎6, 7, 8 | parametro → efectos[1]; parametro → efectos[3]; parametro → ∅ | arbitraje: pendiente; campo nuevo: Efecto.requisitoAlcance?: Requisito |
| texto · objetivo_tercero:entorpecido · nota_fija · pendiente | 9, 10 | resultado_texto → efectos[5] | campo nuevo: Efecto.texto.grados?: Grado[] |

#### Táctica de Flanqueo (`dote_tactica_de_flanqueo`, coste 2)

- Requisitos: habilidad combate_melee 1; especialidad exploracion/tactica 1.
- acción `dotes_tactica_de_flanqueo` (simple/reaccion): enfrentada reflejos + exploracion + tactica
- bono `familia:ataque_melee` 3 si «Flanqueo coordinado (Táctica de Flanqueo con éxito)»
- bono `familia:ataque_fuego` 3 si «Flanqueo coordinado (Táctica de Flanqueo con éxito)»
- texto [tercero] en `familia:ataque_melee`: Si golpeas con éxito, tu aliado que flanquea puede hacer un ataque de oportunidad contra el objetivo. (si «Flanqueo coordinado (Táctica de Flanqueo con éxito)»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| texto · accion_existente:dotes_tactica_de_flanqueo · nota_fija · pendiente | 4 | parametro → efectos[0].accion.notas[0] | — |
| accion · accion_nueva:dotes_tactica_de_flanqueo · accion_sin_equipo · pendiente | 5 | parametro → efectos[0].accion | — |
| numerico · accion_existente:ataque_melee_<instancia> · eleccion_jugador · pendiente | 6 | parametro → efectos[1] | — |
| texto · objetivo_tercero:dotes_ataque_de_oportunidad · nota_fija · pendiente | 7 | resultado_texto → efectos[2] | campo nuevo: Efecto.texto.grados?: Grado[] |

#### Dominio Elevado (`dote_dominio_elevado`, coste 2)

- Requisitos: especialidad exploracion/tactica 1; habilidad combate_melee 1.
- bono `familia:ataque_melee` 1 si «Objetivo en posición inferior (desnivel apreciable: escalones, rocas, vehículos…)»
- texto [tercero] en `familia:ataque_melee`: El objetivo en posición inferior sufre -2 a su salvación para mantener el equilibrio y no caer derribado por tus maniobras. (si «Objetivo en posición inferior (desnivel apreciable: escalones, rocas, vehículos…)»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| texto · accion_existente:ataque_melee_<instancia> · eleccion_jugador · pendiente | 4 | parametro → efectos[0].condicion | — |
| numerico · accion_existente:ataque_melee_<instancia> · eleccion_jugador · pendiente | 5 | parametro → efectos[0] | — |
| texto · objetivo_tercero:salvacion_derribo · nota_fija · pendiente | 6 | resultado_texto → efectos[1] | — |


### 6.5 Combate a Distancia

#### Cobertura Rápida (`dote_cobertura_rapida`, coste 1)

- Requisitos: especialidad atletismo/acrobacias 1.
- texto [turno] en `ficha`: Puedes deslizarte tras un movimiento para ponerte a cubierto agazapado como parte de la misma acción.

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2 | parametro → coste, requisitos[0] | — |
| texto · ninguna · — · pendiente | 3 | parametro → efectos[0] | — |

#### Disparo a la Carrera Mejorado (`dote_disparo_a_la_carrera_mejorado`, coste 2)

- Requisitos: habilidad combate_distancia 1.
- bono `familia:ataque_fuego` 2 si «Disparo a la carrera (una vez por turno)»
- texto [turno] en `familia:ataque_fuego`: Solo con un disparo que normalmente sea acción simple, y una vez por turno. (si «Disparo a la carrera (una vez por turno)»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2 | parametro → coste, requisitos[0] | — |
| numerico · accion_existente:ataque_fuego_<instancia> · eleccion_jugador · pendiente | ✎3 | parametro → efectos[0] | — |
| texto · accion_existente:ataque_fuego_<instancia> · eleccion_jugador · pendiente | ✎4 | parametro → efectos[1] | — |

#### Gran Puntería (`dote_gran_punteria`, coste 2)

- Requisitos: habilidad combate_distancia 1.
- sube grado exito → critico en `apuntar`
- texto [tercero] en `apuntar`: Crítico natural al apuntar: la cobertura del objetivo baja 2 niveles para tu ataque (salvo cobertura total). (si «critico natural»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2 | parametro → coste, requisitos[0] | — |
| numerico · accion_existente:apuntar · hueco · bloqueado | 3 | parametro → efectos[0] | hueco: cambio de grado del resultado al tirar (fracaso→éxito, éxito→crítico) con su línea en el desglose; bloqueo: acción Apuntar (fuente/habilidades.md: perspicacia + combate a distancia, dif. 6, ac… |
| texto · accion_existente:apuntar · nota_fija · bloqueado | 4 | resultado_texto → efectos[1] | bloqueo: acción Apuntar sin construir |

#### Puntería Relámpago (`dote_punteria_relampago`, coste 4)

- Requisitos: dote dote_gran_punteria; habilidad combate_distancia 2.
- texto [turno] en `apuntar`: Puedes apuntar como reacción durante el turno.

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| texto · accion_existente:apuntar · nota_fija · bloqueado | 4 | parametro → efectos[0] | bloqueo: acción Apuntar sin construir; campo nuevo: efecto 'economia': { tipo: 'economia'; alcance: Alcance; economia: Economia \| Economia[]; limite: Limite } |

#### Puntería Relámpago Mejorada (`dote_punteria_relampago_mejorada`, coste 6)

- Requisitos: dote dote_punteria_relampago; atributo percepcion 1; habilidad combate_distancia 3.
- texto [turno] en `apuntar`: Puedes apuntar con una única acción gratuita por turno.
- texto [turno] en `apuntar`: Sigues pudiendo apuntar como reacción (Puntería Relámpago).

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4 | parametro → coste, requisitos[0], requisitos[1], requisitos[2] | — |
| texto · accion_existente:apuntar · nota_fija · bloqueado | 5, 6 | parametro → efectos[0]; parametro → efectos[1] | bloqueo: acción Apuntar sin construir; campo nuevo: efecto 'economia' (economia: 'gratuita', limite: { veces: 1, por: 'turno' }) |

#### Precisión Imperturbable (`dote_precision_imperturbable`, coste 8)

- Requisitos: dote dote_punteria_relampago_mejorada; atributo percepcion 2; habilidad combate_distancia 4. sustituye a `dote_punteria_relampago_mejorada`.
- texto [turno] en `apuntar`: Apuntas a cualquier objetivo de forma gratuita.

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4 | parametro → coste, requisitos[0], requisitos[1], requisitos[2] | — |
| texto · accion_existente:apuntar · nota_fija · bloqueado | 5 | parametro → efectos[0] | bloqueo: acción Apuntar sin construir; alcance de la regla (pregunta); campo nuevo: efecto 'economia' (economia: 'gratuita', limite: null) |

#### Recarga Relámpago (`dote_recarga_relampago`, coste 2)

- Requisitos: atributo agilidad 1; habilidad combate_distancia 2.
- texto [turno] en `familia:ataque_fuego`: Recargar armas de fuego cuesta un grado menos (compleja → estándar, estándar → simple).
- texto [turno] en `familia:ataque_fuego`: Si la recarga ya es simple: puedes recargar como acción gratuita (una vez por turno) o como reacción durante la ronda.

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| texto · accion_existente:ataque_fuego_<instancia> · nota_fija · pendiente | 4, 5 | parametro → efectos[0]; parametro → efectos[1] | campo nuevo: efecto 'economia' con desplazamiento relativo ({ tipo: 'economia'; alcance: 'recargar:familia:arma_fuego'; grados: -1 }); campo nuevo: Economia/Limite por alternativa dentro del mismo ef… |

#### Tirador de Larga Distancia (`dote_tirador_de_larga_distancia`, coste 2)

- Requisitos: atributo percepcion 1; habilidad combate_distancia 1.
- bono `familia:ataque_fuego` 1 si «tramo:larga»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| numerico · accion_existente:ataque_fuego_<instancia> · bono_tramo · pendiente | 4 | parametro → efectos[0] | campo nuevo: tramo?: TramoDistancia en Efecto bono |

#### Tirador de Larga Distancia Avanzado (`dote_tirador_de_larga_distancia_avanzado`, coste 5)

- Requisitos: atributo percepcion 2; habilidad combate_distancia 3.
- bono `familia:ataque_fuego` 2 si «tramo:larga + en especialidad»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| numerico · accion_existente:ataque_fuego_<instancia> · bono_tramo · pendiente | 4 | parametro → efectos[0] | campo nuevo: soloEspecialidad?: boolean y noAcumulaCon?: string[] en Efecto bono |


### 6.6 Exploración

#### Vigilancia Táctica (`dote_vigilancia_tactica`, coste 2)

- Requisitos: especialidad exploracion/tactica 1; aplicado perspicacia 1.
- bono `grupo:Iniciativa` 2 (fijo)
- cambia par en `resistir_distraccion` → perspicacia + exploracion + tactica si «Resistir con Perspicacia + Táctica (Vigilancia Táctica)»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| numerico · accion_existente:grupo:Iniciativa · siempre_activo · pendiente | 4 | parametro → efectos[0] | — |
| numerico · accion_existente:resistir_distraccion · sustitucion_aplicado · bloqueado | 5 | parametro → efectos[1] | bloqueo: acción 'resistir distracción' (Perspicacia + Empatía) sin construir; hoy solo nota en iniciativa_distraccion |

#### Encontrar el Ángulo (`dote_encontrar_el_angulo`, coste 2)

- Requisitos: especialidad exploracion/tactica 2; aplicado perspicacia 1.
- acción `dotes_encontrar_el_angulo` (reaccion/simple): tirada perspicacia + exploracion + tactica, dif 6

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| narrativo · ninguna · — · construido | 4 | narrativo → efectos[0].accion.notas[0] | — |
| texto · accion_existente:dotes_encontrar_el_angulo · nota_fija · pendiente | 5 | parametro → efectos[0].accion.economia | — |
| accion · accion_nueva:dotes_encontrar_el_angulo · accion_sin_equipo · pendiente | 6 | parametro → efectos[0].accion.resolucion | — |
| texto · accion_existente:dotes_encontrar_el_angulo · accion_sin_equipo · pendiente | 7, 8 | resultado_texto → efectos[0].accion.resultados.critico.texto; resultado_texto → efectos[0].accion.resultados.exito.texto | — |

#### Rastreo al Paso (`dote_rastreo_al_paso`, coste 2)

- Requisitos: especialidad exploracion/supervivencia 2; aplicado perspicacia 1; atributo aguante 1.
- bono `rastreo` 3 si «Condiciones normales, velocidad total»
- bono `rastreo` 3 si «Condiciones adversas, mitad de velocidad»
- bono `rastreo` 3 si «Condiciones adversas, velocidad total»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4 | parametro → coste, requisitos[0], requisitos[1], requisitos[2] | — |
| narrativo · ninguna · — · construido | 5 | narrativo → ∅ | — |
| numerico · accion_existente:rastreo · bono_tramo · bloqueado | 6, 7, 8, 9 | parametro → efectos[0..2]; parametro → efectos[0]; parametro → efectos[1]; parametro → efectos[2] | bloqueo: acción Rastreo (fuente/habilidades.md) sin pasar a sistema.md ni a acciones.ts |

#### Bioma Predilecto (`dote_bioma_predilecto`, coste 3)

- Requisitos: especialidad exploracion/supervivencia 3. elección «Bioma predilecto».
- ventaja en `grupo:Iniciativa` si «En combate dentro de tu bioma predilecto»
- ventaja en `subsistencia` si «Dentro de tu bioma predilecto»
- bono `rastreo` 3 si «Condiciones adversas, mitad de velocidad (en tu bioma predilecto)»
- bono `rastreo` 3 si «Condiciones adversas, velocidad total (en tu bioma predilecto)»
- texto [turno] en `rastreo`: En tu bioma predilecto el terreno adverso cuenta como normal también para el ritmo. No se suma con Rastreo al Paso en la misma opción. (si «Rastreando dentro de tu bioma predilecto»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, eleccion, requisitos[0] | — |
| numerico · accion_existente:grupo:Iniciativa · hueco · pendiente | 4 | parametro → efectos[0] | hueco: ventaja (dos d12, vale el mejor) activada por un interruptor al tirar; hoy Accion.ventaja solo la pone Disciplina.ventajas, siempre activa por nivel |
| numerico · accion_existente:subsistencia · hueco · bloqueado | 5 | parametro → efectos[1] | hueco: ventaja (dos d12, vale el mejor) activada por un interruptor al tirar; hoy Accion.ventaja solo la pone Disciplina.ventajas, siempre activa por nivel; bloqueo: acción Subsistencia (fuente/habil… |
| numerico · accion_existente:rastreo · bono_tramo · bloqueado | ✎✎6 | parametro → ∅ | bloqueo: acción Rastreo (fuente/habilidades.md) sin pasar a sistema.md ni a acciones.ts; campo nuevo: fija_opcion: { tipo: 'fija_opcion'; alcance; condicionId: 'terreno'; de: 'adverso'; a: 'normal'; … |

#### Olfato de Investigador (`dote_olfato_de_investigador`, coste 2)

- Requisitos: especialidad exploracion/investigacion 2; aplicado perspicacia 1. **oculta** (`visible: false`).
- Sin efectos en la propuesta.

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| narrativo · ninguna · — · bloqueado | 4 | pregunta → visible | bloqueo: §9.5: efecto de Olfato de Investigador pendiente de Murillo |

#### Descartar Teoría (`dote_descartar_teoria`, coste 3)

- Requisitos: especialidad exploracion/investigacion 3; aplicado perspicacia 1.
- bono `especialidad:investigacion` -2 si «Repitiendo la prueba con Descartar Teoría»
- texto [turno] en `especialidad:investigacion`: Si fracasas o te estancas ante una pista contradictoria, puedes replantear el razonamiento y repetir la prueba con −2 en vez de perder el hilo. Una vez por pista o investigación.

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos[0], requisitos[1] | — |
| numerico · accion_existente:investigacion · eleccion_jugador · bloqueado | 4 | parametro → efectos[0] | bloqueo: tiradas de Investigación (Inspección de Escena, Análisis de Pistas, Búsqueda Documental; fuente/habilidades.md) sin pasar a sistema.md ni a acciones.ts |
| texto · accion_existente:investigacion · nota_fija · bloqueado | 5 | parametro → efectos[1].texto | bloqueo: tiradas de Investigación (fuente/habilidades.md) sin pasar a sistema.md ni a acciones.ts; campo nuevo: limite: Limite en el nivel de Dote (no solo en AccionDote) |


### 6.7 Sigilo

#### Movimiento Sigiloso (`dote_movimiento_sigiloso`, coste 3)

- Requisitos: habilidad sigilo 2.
- bono `sigilo` 2 si «movimiento_oculto:mitad»
- bono `sigilo` 2 si «movimiento_oculto:total»
- bono `sigilo` 2 si «movimiento_oculto:esprint»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2 | parametro → coste, requisitos | — |
| numerico · accion_existente:sigilo · bono_tramo · pendiente | 3 | parametro → efectos[].valor (bono por tramo de movimiento_oculto) | — |

#### Movimiento Sigiloso Mejorado (`dote_movimiento_sigiloso_mejorado`, coste 5)

- Requisitos: habilidad sigilo 3. sustituye a `dote_movimiento_sigiloso`.
- bono `sigilo` 2 si «movimiento_oculto:mitad»
- bono `sigilo` 4 si «movimiento_oculto:total»
- bono `sigilo` 4 si «movimiento_oculto:esprint»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2 | parametro → coste, requisitos | — |
| numerico · accion_existente:sigilo · bono_tramo · pendiente | 3 | parametro → efectos[].valor (bono por tramo de movimiento_oculto) | — |

#### Movimiento Sigiloso Constante (`dote_movimiento_sigiloso_constante`, coste 6)

- Requisitos: habilidad sigilo 5. sustituye a `dote_movimiento_sigiloso_mejorado`.
- bono `sigilo` 2 si «movimiento_oculto:mitad»
- bono `sigilo` 4 si «movimiento_oculto:total»
- bono `sigilo` 8 si «movimiento_oculto:esprint»

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2 | parametro → coste, requisitos | — |
| numerico · accion_existente:sigilo · bono_tramo · pendiente | 3 | parametro → efectos[].valor (bono por tramo de movimiento_oculto) | — |


### 6.8 Tecnociencia (Psiónica)

#### Potencia Psiónica (`dote_potencia_psionica`, coste 3)

- Requisitos: psionico; disciplina cualquiera 3; aplicado voluntad 1.
- texto [sin_regla] en `ficha`: Los poderes de nivel 1 no generan sobreesfuerzo en ningún contexto.

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4 | parametro → coste, requisitos.0, requisitos.1, requisitos.2 | — |
| texto · accion_existente:salv_sobreesfuerzo · nota_fija · bloqueado | 5 | pregunta → efectos.0 | bloqueo: regla del sobreesfuerzo biológico (sistema.md §9.6) |

#### Maestría Psiónica (`dote_maestria_psionica`, coste 6)

- Requisitos: dote dote_potencia_psionica; disciplina cualquiera 5; aplicado voluntad 3. sustituye a `dote_potencia_psionica`.
- texto [sin_regla] en `ficha`: Los poderes de nivel 2 o menos no generan sobreesfuerzo en ningún contexto.
- texto [sin_regla] en `ficha`: Salvación contra el sobreesfuerzo, fracaso: recibes 1 nivel de daño no letal.
- texto [sin_regla] en `ficha`: Salvación contra el sobreesfuerzo, fracaso crítico: el daño es letal y quedas aturdido 1 turno.
- texto [sin_regla] en `ficha`: Estando exhausto, fracaso en la salvación contra el sobreesfuerzo: el daño es letal y causa aturdimiento. (si «exhausto»)
- texto [sin_regla] en `ficha`: Estando exhausto, fracaso crítico en la salvación contra el sobreesfuerzo: el daño es grave. (si «exhausto»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4 | parametro → coste, requisitos.0, requisitos.1, requisitos.2 | — |
| texto · accion_existente:salv_sobreesfuerzo · nota_fija · bloqueado | 5, 6, 7, 8, 9 | pregunta → efectos.0; pregunta → efectos.1; pregunta → efectos.2; pregunta → efectos.3; pregunta → efectos.4 | bloqueo: regla del sobreesfuerzo biológico (sistema.md §9.6) |

#### Gran Maestría Psiónica (`dote_gran_maestria_psionica`, coste 9)

- Requisitos: dote dote_maestria_psionica; disciplina cualquiera 6; aplicado voluntad 4.
- texto [sin_regla] en `ficha`: Los poderes de nivel 3 o menos no generan sobreesfuerzo en ningún contexto.

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4 | parametro → coste, requisitos.0, requisitos.1, requisitos.2 | — |
| texto · accion_existente:salv_sobreesfuerzo · nota_fija · bloqueado | 5 | pregunta → efectos.0 | bloqueo: regla del sobreesfuerzo biológico (sistema.md §9.6) |

#### Saber es Poder (`dote_saber_es_poder`, coste 6)

- Requisitos: aplicado perspicacia 3; aplicado fortaleza 1; habilidad biociencia 3.
- texto [narrativo] en `ficha`: Entiendes el proceso biológico de tu poder y sabes gestionar mejor la fatiga al emplearlo.
- texto [sin_regla] en `ficha`: En estado de fatiga, al emplear poderes psiónicos hay un 50 % de probabilidades de no generar sobreesfuerzo. (si «fatigado»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4 | parametro → coste, requisitos.0, requisitos.1, requisitos.2 | — |
| narrativo · ninguna · — · construido | 5 | narrativo → efectos.0 | — |
| texto · accion_existente:salv_sobreesfuerzo · nota_fija · bloqueado | 6 | pregunta → efectos.1 | bloqueo: regla del sobreesfuerzo biológico (sistema.md §9.6) |

#### Onda Residual (`dote_onda_residual`, coste 6)

- Requisitos: disciplina singularidad 3.
- texto [narrativo] en `psi_singularidad_expansion`: Onda Residual: el eco métrico remanente perturba la física de la zona.
- texto [tablero] en `psi_singularidad_expansion`: Onda Residual: las casillas del área de la explosión quedan cargadas de inestabilidad gravitatoria durante el turno siguiente.
- texto [tablero] en `psi_singularidad_expansion`: Onda Residual: quien intente atravesar esas casillas o iniciar un movimiento en ellas reduce su velocidad a la mitad (cada casilla cuenta como dos).
- texto [tercero] en `psi_singularidad_expansion`: Onda Residual: −2 a Reflejos mientras dure el efecto y esté dentro del área.
- texto [tercero] en `psi_singularidad_expansion`: Onda Residual: el efecto no perjudica al psiónico que lo ha desencadenado.

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2 | parametro → coste, requisitos.0 | — |
| narrativo · ninguna · — · construido | 3 | narrativo → efectos.0 | — |
| texto · accion_existente:psi_singularidad_expansion · nota_fija · pendiente | 4, 7 | parametro → efectos.1; parametro → efectos.4 | — |
| texto · objetivo_tercero:movimiento · nota_fija · pendiente | 5 | parametro → efectos.2 | — |
| texto · objetivo_tercero:tiradas_con_reflejos · nota_fija · pendiente | 6 | parametro → efectos.3 | — |

#### Impacto Métrico (`dote_impacto_metrico`, coste 6)

- Requisitos: disciplina singularidad 2; habilidad combate_melee 2.
- poder `dotes_impacto_metrico` (ver §6.9)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos.0, requisitos.1 | — |
| narrativo · ninguna · — · construido | 4 | narrativo → ∅ | — |
| accion · accion_nueva:dotes_impacto_metrico · accion_sin_equipo · pendiente | 5, 7, 8, 10, 22 | parametro → efectos.0.accion.economia; parametro → efectos.0.accion.ejes.1; parametro → efectos.0.accion.fatiga; parametro → ∅ | campo nuevo: disciplinaNivel: 'singularidad'; campo nuevo: resolucion.danioExtra: {valor: Valor; categoria}; campo nuevo: Valor.porCadaNiveles: {cada: number; minimo: number} |
| accion · accion_nueva:dotes_impacto_metrico · hueco · pendiente | 6 | parametro → ∅ | hueco: acción de poder que se resuelve con la tirada y el daño de un arma melee equipada (o golpe de Pelea) elegida al usarla; campo nuevo: resolucion.sobreArma: 'familia:ataque_melee' |
| texto · objetivo_tercero:resistir_empuje · nota_fija · pendiente | 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 23, 29, 30 | parametro → efectos.0.accion.ejes.1.opciones.ascendente.cambia.notas.0; parametro → efectos.0.accion.ejes.1.opciones.descendente.cambia.notas.0; parametro → ef… | — |
| texto · objetivo_tercero:mantener_vuelo · nota_fija · pendiente | 24, 25, 26, 27, 28 | parametro → efectos.0.accion.objetivoTira.1; parametro → efectos.0.accion.objetivoTira.1.grados.critico; parametro → efectos.0.accion.objetivoTira.1.grados.exi… | — |
| texto · accion_existente:dotes_impacto_metrico · nota_fija · pendiente | 31 | parametro → efectos.0.accion.notas.1 | — |

#### Impacto Métrico Relámpago (`dote_impacto_metrico_relampago`, coste 4)

- Requisitos: dote dote_impacto_metrico; habilidad combate_melee 3.
- texto [turno] en `dotes_impacto_metrico`: Impacto Métrico Relámpago: puedes resolverlo como acción estándar siempre que el ataque original no sea de mayor complejidad. (si «El ataque original no es de mayor complejidad que una acción estándar»)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3 | parametro → coste, requisitos.0, requisitos.1 | — |
| texto · accion_existente:dotes_impacto_metrico · nota_fija · pendiente | 4 | parametro → efectos.0 | campo nuevo: economiaAlternativa: {accion: Alcance; valor: Economia; condicion} en Efecto de dote |

#### Sobrecarga Métrica (`dote_sobrecarga_metrica`, coste 6)

- Requisitos: disciplina traslacion 2; aplicado voluntad 2; especialidad biociencia/medicina 1.
- poder `dotes_sobrecarga_metrica` (ver §6.9)

| Terna (tipo · afecta · mecanismo · estado) | Claims | Destino → ruta | MotorMetadata / nota |
|---|---|---|---|
| estructura de compra (coste, requisitos, elección) | 1, 2, 3, 4 | parametro → coste, requisitos.0, requisitos.1, requisitos.2 | — |
| narrativo · ninguna · — · construido | 5 | narrativo → ∅ | — |
| accion · accion_nueva:dotes_sobrecarga_metrica · accion_sin_equipo · pendiente | 6, 7, 8, 10, 11, 12, 13, 14 | parametro → efectos.0.accion.duracion; parametro → efectos.0.accion.economia; parametro → efectos.0.accion.fatiga; parametro → efectos.0.accion.resolucion; par… | campo nuevo: AccionPoder.economia: Economia[]; campo nuevo: disciplinaNivel: 'traslacion'; campo nuevo: Valor.porCadaNiveles: {cada: 2; minimo: 1} |
| numerico · accion_existente:atributo:fuerza · hueco · ad_hoc | 9 | manual → efectos.0.accion.datos.0 | hueco: efecto activo temporal sobre un atributo propio, con duración, que recalcule aplicados y derivados |


### 6.9 Dotes con nivel empleado: matrices

Solo **Impacto Métrico** y **Sobrecarga Métrica** tienen eje `nivel_empleado` (siguen el modelo `AccionPoder` de psiónica). El nivel empleado lo limita el nivel **poseído** en la disciplina de `disciplinaNivel` (campo nuevo). Ninguna de las dos tiene `ajustesPorNivelPoseido`.

**Cadena de ModificadorFatiga que se cruza:**
- Singularidad: su único modificador es «Singularidad Poderosa» (+1 en la opción `modo: poderoso`), que Impacto Métrico no tiene. No aplica.
- Traslación: sus modificadores tienen `alcance: { disciplina: "traslacion" }` y condición de **carga** (nv3: ×0 con carga < 10 kg; nv6: −1, mínimo 1, con carga ≥ 10 kg). Sobrecarga Métrica no mueve carga: se asume que **no aplican** (pendiente de confirmar al construir; si el alcance se lee por disciplina sin mirar la condición, nv3+ la dejaría gratis con el toggle marcado).
- La regla general de **sobrecarga** psiónica (pasar de exhausto) sí aplica a las dos.

**Impacto Métrico** (requisito Singularidad 2 y Combate Melee 2; acción compleja, o estándar con Impacto Métrico Relámpago):

| Poseído Singularidad | N=1 | N=2 | N=3 | N=4 | N=5 | N=6 |
|---|---|---|---|---|---|---|
| 2 | 1 fat · +3 letal · 4 m · dif 9 | 2 fat · +4 letal · 8 m · dif 10 | — | — | — | — |
| 3 | 1 fat · +3 letal · 4 m · dif 9 | 2 fat · +4 letal · 8 m · dif 10 | 3 fat · +5 letal · 12 m · dif 11 | — | — | — |
| 4 | 1 fat · +3 letal · 4 m · dif 9 | 2 fat · +4 letal · 8 m · dif 10 | 3 fat · +5 letal · 12 m · dif 11 | 4 fat · +6 letal · 16 m · dif 12 | — | — |
| 5 | 1 fat · +3 letal · 4 m · dif 9 | 2 fat · +4 letal · 8 m · dif 10 | 3 fat · +5 letal · 12 m · dif 11 | 4 fat · +6 letal · 16 m · dif 12 | 5 fat · +7 letal · 20 m · dif 13 | — |
| 6 | 1 fat · +3 letal · 4 m · dif 9 | 2 fat · +4 letal · 8 m · dif 10 | 3 fat · +5 letal · 12 m · dif 11 | 4 fat · +6 letal · 16 m · dif 12 | 5 fat · +7 letal · 20 m · dif 13 | 6 fat · +8 letal · 24 m · dif 14 |

Fatiga = N; daño extra letal = 2 + N (suma al del arma); desplazamiento en fracaso del objetivo = 4·N m (éxito: 2·N); dificultad de la salvación del objetivo (Fortaleza + Atletismo) = 8 + N. Vector descendente: sin desplazamiento, +1 a esa dificultad y +⌊N/2⌋ (mín. 1) de daño.

**Sobrecarga Métrica** (requisito Traslación 2, Voluntad 2, Medicina 1; acción simple o reacción, dura 1 turno):

| Poseído Traslación | N=1 | N=2 | N=3 | N=4 | N=5 | N=6 |
|---|---|---|---|---|---|---|
| 2 | 1 fat · Fue +3 · dif 6 · éx 1 NL / fr 1 L | 2 fat · Fue +4 · dif 7 · éx 1 NL / fr 2 L | — | — | — | — |
| 3 | 1 fat · Fue +3 · dif 6 · éx 1 NL / fr 1 L | 2 fat · Fue +4 · dif 7 · éx 1 NL / fr 2 L | 3 fat · Fue +5 · dif 8 · éx 1 NL / fr 3 L | — | — | — |
| 4 | 1 fat · Fue +3 · dif 6 · éx 1 NL / fr 1 L | 2 fat · Fue +4 · dif 7 · éx 1 NL / fr 2 L | 3 fat · Fue +5 · dif 8 · éx 1 NL / fr 3 L | 4 fat · Fue +6 · dif 9 · éx 2 NL / fr 4 L | — | — |
| 5 | 1 fat · Fue +3 · dif 6 · éx 1 NL / fr 1 L | 2 fat · Fue +4 · dif 7 · éx 1 NL / fr 2 L | 3 fat · Fue +5 · dif 8 · éx 1 NL / fr 3 L | 4 fat · Fue +6 · dif 9 · éx 2 NL / fr 4 L | 5 fat · Fue +7 · dif 10 · éx 2 NL / fr 5 L | — |
| 6 | 1 fat · Fue +3 · dif 6 · éx 1 NL / fr 1 L | 2 fat · Fue +4 · dif 7 · éx 1 NL / fr 2 L | 3 fat · Fue +5 · dif 8 · éx 1 NL / fr 3 L | 4 fat · Fue +6 · dif 9 · éx 2 NL / fr 4 L | 5 fat · Fue +7 · dif 10 · éx 2 NL / fr 5 L | 6 fat · Fue +8 · dif 11 · éx 3 NL / fr 6 L |

Tirada Perspicacia + Biociencia (Medicina) contra 5 + N. Crítico: sin daño. Éxito: ⌊N/2⌋ (mín. 1) daño no letal propio. Fracaso: N letal propio. Fracaso crítico: N letal + hemorragia 1d8 turnos. La subida de Fuerza es `manual` (efecto activo propio, §10.6).

---

## 7. Textos agrupados por «porque»

### turno (acciones por turno y límites de uso) — 30

- **Paso Defensivo** (`defensa`): Ese desplazamiento, una vez por turno (acción gratuita). *Si: Éxito crítico en la esquiva.*
- **Como Pez en el Agua** (`atletismo`): Mantenerse a flote en medio acuático es una acción gratuita. *Si: Nadando.*
- **Salto Ofensivo** (`atletismo`): Puedes atacar (melee o a distancia) durante un salto como una sola acción.
- **Salto Ofensivo** (`atletismo`): La acción combinada cuesta la más compleja de las dos (salto o ataque).
- **Bloqueo** (`familia:bloquear_melee`): Si superas al atacante con crítico, puedes contraatacarle como reacción. *Si: critico.*
- **Contraataque Rápido** (`familia:bloquear_melee`): Contraataque como acción gratuita en vez de reacción, una vez por turno. *Si: critico.*
- **Maestro en Contraataque** (`familia:bloquear_melee`): Contraataque como acción gratuita, sin límite por turno. *Si: critico.*
- **Ataque de Oportunidad Poderoso** (`dotes_ataque_de_oportunidad`): Puedes usar un ataque de modo Estándar en el ataque de oportunidad.
- **Ataque de Oportunidad Múltiple** (`dotes_ataque_de_oportunidad`): Un ataque de oportunidad por turno como acción gratuita, sin gastar la reacción.
- **Maestro Oportunista** (`dotes_ataque_de_oportunidad`): Tus ataques de oportunidad son acción gratuita, sin límite.
- **Apresar y Apuñalar** (`familia:ataque_melee`): Tras una presa con éxito, si llevas esta arma de una mano, ganas una reacción para atacar con ella.
- **Ataque Melee Doble** (`familia:ataque_melee`): Con un arma melee en cada mano: un ataque con cada una como acción estándar, ambos con modos que normalmente sean acción simple. *Si: Ataque doble.*
- **Combate con Dos Armas Melee** (`familia:ataque_melee`): En el ataque doble puedes combinar un ataque de modo Estándar y uno Simple, en vez de dos Simples. *Si: Ataque doble.*
- **Desenfundado Rápido** (`familia:ataque_melee`): Armas a una mano: puedes desenfundar y hacer un ataque simple en la misma acción.
- **Desenfundado Rápido** (`familia:ataque_fuego`): Armas a una mano: puedes desenfundar y hacer un ataque simple en la misma acción.
- **Defensa con Escudo Rápida** (`familia:levantar_escudo`): Puedes levantar el escudo con una reacción en vez de una acción simple.
- **Defensa con Escudo Constante** (`familia:levantar_escudo`): Puedes levantar el escudo con una acción gratuita contra cualquier ataque, salvo si estás desprevenido.
- **Golpea Primero, Golpea Dos Veces** (`grupo:Iniciativa`): Si en el primer turno del combate actúas antes que un enemigo, ese turno tienes una acción simple adicional para un golpe melee simple.
- **Asalto Sigiloso** (`sigilo`): Como parte de la misma acción puedes acercarte en sigilo hasta alcanzar a un objetivo y atacarle gastando tu reacción.
- **Cobertura Rápida** (`ficha`): Puedes deslizarte tras un movimiento para ponerte a cubierto agazapado como parte de la misma acción.
- **Disparo a la Carrera Mejorado** (`familia:ataque_fuego`): Solo con un disparo que normalmente sea acción simple, y una vez por turno. *Si: Disparo a la carrera (una vez por turno).*
- **Puntería Relámpago** (`apuntar`): Puedes apuntar como reacción durante el turno.
- **Puntería Relámpago Mejorada** (`apuntar`): Puedes apuntar con una única acción gratuita por turno.
- **Puntería Relámpago Mejorada** (`apuntar`): Sigues pudiendo apuntar como reacción (Puntería Relámpago).
- **Precisión Imperturbable** (`apuntar`): Apuntas a cualquier objetivo de forma gratuita.
- **Recarga Relámpago** (`familia:ataque_fuego`): Recargar armas de fuego cuesta un grado menos (compleja → estándar, estándar → simple).
- **Recarga Relámpago** (`familia:ataque_fuego`): Si la recarga ya es simple: puedes recargar como acción gratuita (una vez por turno) o como reacción durante la ronda.
- **Bioma Predilecto** (`rastreo`): En tu bioma predilecto el terreno adverso cuenta como normal también para el ritmo. No se suma con Rastreo al Paso en la misma opción. *Si: Rastreando dentro de tu bioma predilecto.*
- **Descartar Teoría** (`especialidad:investigacion`): Si fracasas o te estancas ante una pista contradictoria, puedes replantear el razonamiento y repetir la prueba con −2 en vez de perder el hilo. Una vez por pista o investigación.
- **Impacto Métrico Relámpago** (`dotes_impacto_metrico`): Impacto Métrico Relámpago: puedes resolverlo como acción estándar siempre que el ataque original no sea de mayor complejidad. *Si: El ataque original no es de mayor complejidad que una acción estándar.*

### tercero (lo que le pasa a otro personaje) — 21

- **Depredador Acuático** (`familia:ataque_melee`): No anula la reducción de daño −2 de los golpes contundentes bajo el agua. *Si: Dentro del agua.*
- **Movilidad** (`ficha`): Al moverte, ignoras el primer ataque de oportunidad que provoques, siempre que estés prevenido del atacante.
- **Movilidad Mejorada** (`ficha`): Al moverte, ignoras todos los ataques de oportunidad que provoques durante el movimiento, siempre que estés prevenido del atacante.
- **Bloqueo** (`familia:bloquear_melee`): Solo vale contra ataques melee.
- **Bloqueo** (`familia:bloquear_melee`): Ciertos ataques pueden causar daño o efectos al ser bloqueados aunque el bloqueo tenga éxito.
- **Bloqueo** (`familia:bloquear_melee`): Si tu ataque natural o desarmado hace daño letal no cuentas como desarmado: no marques la casilla. *Si: Desarmado frente a atacante armado.*
- **Derribo Mejorado** (`familia:ataque_melee`): Derribo con éxito: el objetivo pierde 1 punto de fatiga. *Si: Derribo.*
- **Derribo Mejorado** (`familia:ataque_melee`): Si el objetivo saca fracaso crítico en su tirada contra el derribo, además queda aturdido hasta el final de su próximo turno. *Si: Derribo.*
- **Desenfundado Rápido** (`familia:ataque_melee`): Si es tu primer ataque contra este objetivo y actúas antes que él, está sorprendido contra este ataque. *Si: Desenfundando, primer ataque y actúas antes.*
- **Desenfundado Rápido** (`familia:ataque_fuego`): Si es tu primer disparo contra este objetivo y actúas antes que él, está sorprendido contra este ataque. *Si: Desenfundando, primer disparo y actúas antes.*
- **Maestro del Escudo** (`familia:levantar_escudo`): +1 a la cobertura del escudo en alto (el atacante la suma a su dificultad).
- **Golpe Fatigante** (`familia:ataque_melee`): Si el golpe tiene éxito, el rival tira una salvación de Fortaleza + Atletismo enfrentada al resultado de tu ataque. Éxito: sin efecto. Fracaso: pierde 1 punto de fatiga. Fracaso crítico: pierde 1 punto de fatiga y durante su siguiente turno sufre asfixia grado 1. *Si: Golpe fatigante.*
- **Asesino** (`familia:ataque_melee`): Si atacas a un objetivo sorprendido o desprevenido, tus ataques siguientes mantienen la condición de sorpresa. Solo con Combate Melee 2. *Si: Objetivo sorprendido o desprevenido.*
- **Asesino** (`familia:ataque_fuego`): Si atacas a un objetivo sorprendido o desprevenido, tus ataques siguientes mantienen la condición de sorpresa. Solo con Combate a Distancia 2. *Si: Objetivo sorprendido o desprevenido.*
- **Golpe Entorpecedor** (`familia:ataque_melee`): Si el ataque tiene éxito, el objetivo queda entorpecido 1d4 turnos; con crítico, entorpecido en su grado crítico durante 1d4 turnos. *Si: Golpe entorpecedor (debilidad reconocida).*
- **Golpe Entorpecedor** (`familia:ataque_fuego`): Si el ataque tiene éxito, el objetivo queda entorpecido 1d4 turnos; con crítico, entorpecido en su grado crítico durante 1d4 turnos. *Si: Golpe entorpecedor (debilidad reconocida).*
- **Táctica de Flanqueo** (`familia:ataque_melee`): Si golpeas con éxito, tu aliado que flanquea puede hacer un ataque de oportunidad contra el objetivo. *Si: Flanqueo coordinado (Táctica de Flanqueo con éxito).*
- **Dominio Elevado** (`familia:ataque_melee`): El objetivo en posición inferior sufre -2 a su salvación para mantener el equilibrio y no caer derribado por tus maniobras. *Si: Objetivo en posición inferior (desnivel apreciable: escalones, rocas, vehículos…).*
- **Gran Puntería** (`apuntar`): Crítico natural al apuntar: la cobertura del objetivo baja 2 niveles para tu ataque (salvo cobertura total). *Si: critico natural.*
- **Onda Residual** (`psi_singularidad_expansion`): Onda Residual: −2 a Reflejos mientras dure el efecto y esté dentro del área.
- **Onda Residual** (`psi_singularidad_expansion`): Onda Residual: el efecto no perjudica al psiónico que lo ha desencadenado.

### sin regla (falta regla del diseñador) — 13

- **Salto Evasivo** (`defensa`): Esquivando un área: el primer éxito cuenta doble (+1 éxito si aciertas). *Si: Esquivando un área.*
- **Salto Evasivo Mejorado** (`defensa`): Esquivando un área: el primer éxito cuenta triple (+2 éxitos si aciertas). No se suma con Salto Evasivo. *Si: Esquivando un área.*
- **Saber Caer** (`ficha`): Caídas: la altura efectiva se reduce en 4 m para calcular el daño.
- **Caer Parado** (`ficha`): Caídas: la altura efectiva se reduce en 8 m para calcular el daño (no se suma con Saber Caer).
- **Contacto a Tres Puntos** (`atletismo`): Puedes trepar con una mano ocupada sin penalización. *Si: Trepando con una mano ocupada.*
- **Potencia Psiónica** (`ficha`): Los poderes de nivel 1 no generan sobreesfuerzo en ningún contexto.
- **Maestría Psiónica** (`ficha`): Los poderes de nivel 2 o menos no generan sobreesfuerzo en ningún contexto.
- **Maestría Psiónica** (`ficha`): Salvación contra el sobreesfuerzo, fracaso: recibes 1 nivel de daño no letal.
- **Maestría Psiónica** (`ficha`): Salvación contra el sobreesfuerzo, fracaso crítico: el daño es letal y quedas aturdido 1 turno.
- **Maestría Psiónica** (`ficha`): Estando exhausto, fracaso en la salvación contra el sobreesfuerzo: el daño es letal y causa aturdimiento. *Si: exhausto.*
- **Maestría Psiónica** (`ficha`): Estando exhausto, fracaso crítico en la salvación contra el sobreesfuerzo: el daño es grave. *Si: exhausto.*
- **Gran Maestría Psiónica** (`ficha`): Los poderes de nivel 3 o menos no generan sobreesfuerzo en ningún contexto.
- **Saber es Poder** (`ficha`): En estado de fatiga, al emplear poderes psiónicos hay un 50 % de probabilidades de no generar sobreesfuerzo. *Si: fatigado.*

### tablero (casillas, alcance, tamaño; texto para siempre) — 12

- **Paso Defensivo** (`defensa`): Con éxito crítico en la esquiva puedes desplazarte una casilla como acción gratuita. *Si: Éxito crítico en la esquiva.*
- **Potencia de Lanzamiento** (`familia:lanzar_granada`): Para la distancia de lanzamiento, tu Potencia cuenta 1 más (alcance (Potencia + 1) × 10 m).
- **Potencia de Lanzamiento** (`familia:lanzar_melee`): Para la distancia de lanzamiento, tu Potencia cuenta 1 más (alcance (Potencia + 1) × 10 m).
- **Lanzador Preciso** (`familia:lanzar_granada`): Ignoras un nivel de cobertura física del objetivo.
- **Lanzador Preciso** (`familia:lanzar_melee`): Ignoras un nivel de cobertura física del objetivo.
- **Bloqueo** (`familia:bloquear_melee`): El contraataque solo puede ser melee y solo si tienes el alcance adecuado. *Si: critico.*
- **Bloqueo** (`familia:bloquear_melee`): Atacante más grande: −2 por cada tamaño de diferencia.
- **Bloqueo** (`familia:bloquear_melee`): Atacante más pequeño: +1 por cada tamaño de diferencia.
- **Ataque Melee Doble** (`familia:ataque_melee`): Los dos ataques al mismo objetivo, dentro de tu alcance. *Si: Ataque doble.*
- **Mata Gigantes** (`familia:ataque_melee`): Cuando haces maniobras contra un enemigo de mayor tamaño, cuentas como si fueras un tamaño mayor. *Si: Maniobra contra un enemigo de mayor tamaño.*
- **Onda Residual** (`psi_singularidad_expansion`): Onda Residual: las casillas del área de la explosión quedan cargadas de inestabilidad gravitatoria durante el turno siguiente.
- **Onda Residual** (`psi_singularidad_expansion`): Onda Residual: quien intente atravesar esas casillas o iniciar un movimiento en ellas reduce su velocidad a la mitad (cada casilla cuenta como dos).

### área sin construir (aumentos, biónica, fabricación) — 8

- **Artesano Biónico** (`ficha`): −1 a la dificultad de fabricar y reparar implantes biónicos.
- **Artesano Biónico** (`ficha`): Fabricar y reparar implantes biónicos cuesta un 10 % menos.
- **Gran Maestro Biónico** (`ficha`): Fabricar y reparar implantes biónicos cuesta un 15 % menos (sustituye al 10 % de Artesano Biónico).
- **Gran Maestro Biónico** (`ficha`): Con éxito crítico en la fabricación o reparación, el coste baja un 25 %. *Si: Éxito crítico al fabricar o reparar un implante biónico.*
- **Genio Genetista** (`ficha`): −1 a la dificultad para realizar aumentos genéticos.
- **Genio Genetista** (`ficha`): Realizar aumentos genéticos cuesta un 10 % menos.
- **Gran Genio Genetista** (`ficha`): Realizar aumentos genéticos cuesta un 15 % menos (sustituye al 10 % de Genio Genetista).
- **Gran Genio Genetista** (`ficha`): Con éxito crítico al realizar el aumento, el coste baja un 25 %. *Si: Éxito crítico al realizar un aumento genético.*

### capa pendiente (añadido en esta redacción, §11) — 4

- **Imitación** (`imitar`): Con Interpretación 3 o más, el bono es +3. *Si: Imitando a otra persona.*
- **Derribo Brutal** (`familia:ataque_melee`): Derribo con acción estándar: el daño se resuelve como un ataque normal, con el aumento por éxitos (sin el tope de daño básico). *Si: Derribo con acción estándar.*
- **Golpe Mejorado con Escudo** (`familia:ataque_melee`): Golpe con escudo: si quieres, el daño es letal en vez de no letal. *Si: Golpe letal con escudo.*
- **Golpe Fatigante** (`familia:ataque_melee`): Golpe fatigante (golpe al cuerpo, con daño contundente o arma a dos manos): el daño se reduce en 1. *Si: Golpe fatigante.*

### narrativo (sabor) — 3

- **Contacto a Tres Puntos** (`atletismo`): La mano ocupada cuenta como en uso mientras trepas, salvo que te pares y te apoyes en los otros tres puntos. *Si: Trepando con una mano ocupada.*
- **Saber es Poder** (`ficha`): Entiendes el proceso biológico de tu poder y sabes gestionar mejor la fatiga al emplearlo.
- **Onda Residual** (`psi_singularidad_expansion`): Onda Residual: el eco métrico remanente perturba la física de la zona.

---

## 8. Errores de fidelidad del verificador y cómo se han aplicado

El verificador encontró **24** fallos. Todos están aplicados en `docs/modelado-dotes.json`.

| Dote | Ruta | Problema | Corrección aplicada |
|---|---|---|---|
| actitud_1.apoyo | `efectos.0.accion.limite` | La prosa dice 'una vez por aliado por escena'; {veces:1, por:'aliado'} pierde el 'por escena'. | Nota «Una vez por aliado y escena.» añadida; `limite` se queda en `{1, aliado}`. |
| actitud_1.mirada_desafiante | `efectos.0.accion.notas` | Se omite el segundo límite 'solo una vez por día por objetivo'. | Nota del segundo límite (1/día por objetivo) añadida; `limite` sigue `{1, turno}`. |
| actitud_1.violencia_aterradora | `efectos.0.accion.notas` | El límite es 'una vez por escena de combate'; limite.por 'escena' pierde 'de combate' y no hay nota. | Nota «Solo en escena de combate.» añadida. |
| actitud_1.cazador_cazado | `efectos.0.alcance / motor.0.afecta.id` | La tirada sustituida es Perspicacia + Actitud (Empatía), no alerta_activa (Perspicacia + Exploración). Engancharla en Buscar/percibir cambia la habilidad, no la especialidad. | `alcance` → `detectar_mentiras` (marcador); el motor ya venía bloqueado por S5/pregunta 3 desde el claim #4. |
| combate_melee_2.critico_mejorado | `motor.0` | mecanismo 'hueco' sin texto de hueco. Además CondicionTirada.margenCriticoExito ya existe y lo lee montaje.ts:79-80. afecta solo ataque_melee aunque la elección puede ser de Combate a Distancia. | Claim #4 → `eleccion_jugador` (toggle activo por defecto con `margenCriticoExito: 5`), afecta `ataque_melee_<instancia>` o `ataque_fuego_<instancia>` según la especialidad elegida. |
| combate_melee_2.derribo_brutal | `efectos` | Falta la segunda consecuencia: con acción estándar, el daño del derribo se resuelve como un ataque normal, con aumento por éxitos (sin el tope de daño básico). | Efecto texto «Derribo con acción estándar» añadido (claim #6, capa `danio_modificable`). `porque: capa_pendiente`, valor fuera de la lista del modelo (ver §11). |
| combate_melee_2.golpe_mejorado_con_escudo | `efectos / motor` | efectos y motor vacíos: el efecto (daño letal opcional al golpear con escudo) se pierde. | Efecto texto con interruptor «Golpe letal con escudo» añadido; el cambio real de categoría espera al campo nuevo `categoria_danio`. |
| combate_melee_2.finta | `motor.1.afecta.modo` | El −2 por finta repetida modifica una acción nacida en esta misma dote. | Ya venía bien en el claim #10 (`accion_nueva`); el `motor` regenerado lo recoge. |
| tecnociencia_psionica.sobrecarga_metrica | `motor.1` | tipo numerico con mecanismo null: null solo vale para narrativo. La subida temporal de Fuerza (2 + nivel, 1 turno) al activar un poder no la entrega ningún mecanismo de la lista (siempre_activo exige que rija siempre). | Motor de la subida de Fuerza: `hueco` + `ad_hoc` (ya en el claim #9). Especialidad `Medicina` → `medicina` en requisito y resolución. |
| tecnociencia_psionica.sobrecarga_metrica | `requisitos.2.id / efectos.0.accion.resolucion.especialidad` | id de especialidad 'Medicina' en mayúscula, cuando el resto del catálogo usa ids en minúscula ('empatia', 'humor', 'escudos'). | Motor de la subida de Fuerza: `hueco` + `ad_hoc` (ya en el claim #9). Especialidad `Medicina` → `medicina` en requisito y resolución. |
| combate_melee_3.golpe_fatigante | `efectos[0] / motor[0]` | La prosa dice 'reduce el daño en 1'; la propuesta lo pone como bono -1 a la tirada de ataque (familia:ataque_melee). Además la restricción 'daño contundente o arma a dos manos' y 'golpea al cuerpo' no aparece en ningún efecto. | Quitado el bono −1 a la tirada. El −1 va al **daño** como texto con interruptor «Golpe fatigante», con la restricción de arma escrita (capa `danio_modificable`, campo `filtroArma`). |
| atletismo_1.depredador_acuatico | `efectos[0] / motor[0]` | Se trata como texto porque_sin_regla, pero el penalizador existe: fuente/habilidades.md (Nado): ataque melee dentro del agua -2 por dificultad. | Texto `sin_regla` → bono +2 «Dentro del agua» en `familia:ataque_melee` (anula el −2 de Nado) + nota de que la reducción de daño sigue. Claim #3 pasa de `pregunta` a `parametro`. |
| atletismo_1.salto_evasivo | `efectos` | efectos está vacío aunque la dote tiene efecto ('el primer éxito en esquiva para evitar un área cuenta doble') y motor[0] lo describe. | Efecto texto en `defensa` añadido (igual que la Mejorada); el motor sigue en `hueco` / capa `exito_extra`. |
| atletismo_1.equilibrista | `motor[0]` | Éxito → crítico marcado como hueco (sube_grado), pero ese paso ya lo entrega el motor: CondicionTirada con margenCriticoExito:0 (patrón exitoCritico de especies.ts, leído en montaje.ts:79-80). Solo fracaso → éxito necesita la capa nueva. | `sube_grado` → `margen_critico` 0 con interruptor «Tirada de equilibrio»; claim #4 → `eleccion_jugador`, deja de depender de la capa `sube_grado`. |
| atletismo_2.velocista | `motor[0], motor[1]` | motor[1] usa siempre_activo, que no puede bajar el margen de crítico. Además 'carrera' no existe como tirada en acciones.ts (solo en fuente/habilidades.md:26), así que el estado no es pendiente. | Éxito → crítico como `margen_critico` 0 (claim #5 `eleccion_jugador`). Claims #4 y #5 bloqueados por la acción Carrera. |
| atletismo_2.caer_parado | `sustituye` | sustituye:'dote_saber_caer' es una inferencia: la prosa no la llama Mejorada ni pide Saber Caer, y no dice si las reducciones se suman (4+8) o vale la mejor. | `sustituye` → `null`; la duda (¿8 m o 4 + 8?) queda en preguntas. |
| atletismo_2.salto_ofensivo_mejorado | `efectos` | 'Ataque a distancia' solo cubre ataque_fuego. Quedan fuera lanzar_melee, lanzar_granada y ataque_pesado, que también son ataques a distancia y sufren el +2 por saltar. | Bonos +2 «Atacando durante un salto» añadidos en `lanzar_melee`, `lanzar_granada` y `ataque_pesado` (además de melee y fuego). |
| combate_melee_3.tactica_de_flanqueo | `efectos[1]` | La prosa da +3 'en su siguiente ataque contra ese objetivo' sin limitarlo a melee, y el flanqueo de fuente/sistema.md:88-89 tampoco es solo cuerpo a cuerpo. | Bono +3 también en `familia:ataque_fuego` («siguiente ataque» no dice melee). |
| exploracion.bioma_predilecto | `eleccion.opciones / motor` | La prosa da los biomas como ejemplos ('como selvas densas…'), no como lista cerrada. Los tres motor con mecanismo 'hueco' no llevan la frase de hueco. efectos[2] va como texto sin_regla, pero la regla de rastreo sí existe (fuente/habilidades.md:130-135). | Elección abierta (lista de ejemplos + «Otro», `abierta: true`). Rastreo: texto `sin_regla` → dos bonos +3 por opción adversa (bloqueados por Rastreo) + aviso de no acumulación con Rastreo al Paso; el campo `fija_opcion` sigue propuesto. El `hueco` de las ventajas se rellena al regenerar `motor` desde los claims. |
| exploracion (vigilancia_tactica, encontrar_el_angulo, rastreo_al_paso, bioma_predilecto, olfato_de_investigador, descartar_teoria) | `requisitos[].id, efectos[].especialidad/alcance` | Los ids de especialidad van con nombre visible ('Táctica', 'Supervivencia', 'Investigación'), mientras que combate_melee_3 usa slugs ('tactica'). Un mismo requisito no casaría entre lotes. | Ids de especialidad a slug: `tactica`, `supervivencia`, `investigacion` (también `especialidad:investigacion`). |
| actitud_2.imitacion | `efectos[0].valor` | Se pierde el tramo 'si Interpretación ≥ 3 el bonificador pasa a +3'; solo queda +2. | Texto con el tramo de Interpretación ≥ 3 → +3 añadido; el número real espera a `Valor.siMin` (capa `valor_por_umbral_ficha`). |
| combate_a_distancia.tirador_de_larga_distancia_avanzado | `efectos[0] / sustituye` | Con las dos dotes se suman +1 y +2 = +3 contra un −2 de larga distancia y queda un +1 neto, cuando la prosa solo quita el penalizador. Además la básica no se puede sustituir entera porque fuera de especialidad sigue rigiendo. | `noAcumulaCon: [dote_tirador_de_larga_distancia]` en el bono (campo nuevo ya propuesto); `sustituye` sigue `null`. |
| actitud_2.enredar / traicionero / imitacion / negociacion_analitica | `requisitos[].id (tipo especialidad) y accion.resolucion.especialidad` | Las especialidades usan la etiqueta con tilde ('Manipulación', 'Negociación') mientras que el resto de lotes usa slugs ('medicina', 'pelea', 'bioquimica'). El mismo campo queda con dos convenciones. | Ids de especialidad a slug: `manipulacion`, `negociacion`. |
| combate_melee_1.arrollar / ataque_de_oportunidad / actitud_2.traicionero / biociencia.optimizacion_biotecnologica_de_traje | `clasificación de partes internas de la acción propia` | Notas, resultados, economía y equipo necesario que viajan dentro del AccionDote de la misma dote se emitieron como texto/nota_fija (o habilitador) sobre accion_existente. | Ya venía corregido en los claims (partes internas de la acción propia → `accion_nueva` + `accion_sin_equipo`); se refleja en el `motor` regenerado. |

Aparte, el verificador corrigió la clasificación de **48** claims (marcados ✎ en §6). El patrón dominante: partes internas de la acción propia de una dote (límite, economía, notas, resultados) que el clasificador había emitido como `texto/nota_fija` sobre `accion_existente`; pasan a `accion_nueva` + `accion_sin_equipo`, dentro del efecto `accion`.

---

## 9. Preguntas para el diseñador

### Actitud (24)

- Apoyo: en éxito crítico, ¿el aliado sigue eligiendo una de las dos opciones (salvación con +2 o prueba con +3) o recibe ambas?
- Apoyo: ¿quién decide si el 'vínculo de afecto es fuerte' (máster) y hay alguna regla de vínculos, o es pura declaración en mesa?
- Burla: '−1 a tiradas de perspicacia y voluntad' ¿son las tiradas cuyo aplicado es Perspicacia o Voluntad (incluida la Salvación de Voluntad), o algo más concreto?
- Burla: el +2 del objetivo tras resarcirse ¿dura para siempre contra ese burlador, la escena, o solo la siguiente burla?
- Humor Negro: ¿la repetición con Expresión + Humor va contra la misma dificultad (o la misma tirada enfrentada) que la salvación fallada?
- Humor Negro / Alentar: 'reducir el miedo en un grado' presupone grados de miedo; ¿cuáles son los grados del estado miedo y qué hace cada uno?
- Humor de Afrontamiento: ¿qué son 'penalizadores a tiradas de efectos' en el éxito (¿penalizadores causados por estados?) y por qué en el crítico pasa a hablar de 'fatiga o heridas'? ¿El crítico mantiene además la reducción de 1 a los de efectos?
- Humor de Afrontamiento: ¿el propio personaje se beneficia también, o solo los aliados que le escuchan?
- Mirada Desafiante: ¿qué tirada hace la mirada (¿Expresión + Intimidación?), contra qué tira el objetivo y qué consigue en éxito y en crítico?
- Grito de Guerra: ¿qué tiran los enemigos para resistir (¿Voluntad + Actitud?) y qué les pasa en éxito y en crítico (¿miedo, en qué grado?, ¿penalizador?)?
- Violencia Aterradora: ¿qué tiran los enemigos y qué es 'aterrorizar' en reglas (¿estado miedo, en qué grado y duración?)?
- Alentar: no trae límite de uso; ¿se puede repetir sin límite en la escena (acumulando el +1 o relanzando de nuevo)?
- Llamada a las Armas: ¿el +2 contra miedo y la ventaja del crítico alcanzan también al propio personaje, o solo a los compañeros?
- Acción Inspiradora: solo se define el éxito; ¿el éxito crítico añade algo (p.ej. ventaja en más de una tirada)?
- Cazador Cazado: dice 'en lugar de empatía' para detectar mentiras, lo que supone una tirada canónica con la especialidad Empatía (¿Perspicacia + Actitud/Empatía?). La app hoy lo resuelve en 'Buscar / percibir' (Perspicacia + Exploración). ¿Cuál es la tirada de calar mentiras e intenciones ocultas?
- Enredar: ¿cuánto es el 'penalizador de dificultad' por volver a mentir tras ser descubierto? No aparece en la fuente (habilidades.md, Manipulación, ni sistema.md). ¿Lo fija el máster cada vez?
- Enredar: si ese penalizador es menor que 2, ¿la dote solo lo anula (tope en 0) o el sobrante se convierte en bonificador? La app lo aplicará como +2 a la tirada salvo que se diga lo contrario.
- Traicionero: la especialidad Manipulación ya permite la distracción como iniciativa (éxito → sorprendido, crítico → desprevenido). ¿La dote sube el éxito a desprevenido y la extiende a escenas sociales? En ese caso, ¿qué da el éxito crítico con la dote?
- Traicionero: 'desprevenido contra el primer ataque', ¿el primer ataque de cualquiera o solo el del personaje que hizo la distracción?
- Imitación: ¿qué tirada es la de imitar a alguien? La sección Interpretación de habilidades.md está vacía. ¿Expresión + Interpretación, Expresión + Actitud (Manipulación) o la del Disfraz Holográfico?
- Imitación: el +3 con Interpretación 3, ¿mira la habilidad entera o una especialidad concreta de Interpretación?
- *(común del lote)* Requisitos de especialidad con número ('Humor 2', 'Intimidación 3', 'Liderazgo 3'): en la ficha una especialidad no tiene nivel propio (es un nombre dentro de la habilidad, que se tira con el valor entero de esta). ¿'Humor 3' significa Actitud 3 o más con la especialidad Humor, o las especialidades pasan a tener nivel?
- *(común del lote)* Humor e Intimidación aparecen como especialidades de Actitud junto a Empatía, Manipulación, Liderazgo y Negociación: ¿es esa la lista cerrada de especialidades de Actitud (pregunta 3)?
- *(común del lote)* Con Intimidación como especialidad de Actitud, ¿intimidar fuera de estas dotes se tira como 'Convencer / mentir' (Expresión + Actitud) con la especialidad Intimidación, o necesita su propia tirada fija?

### Atletismo (18)

- Paso Atrás 'se contabiliza como acción defensiva': ¿suma al penalizador acumulado de las siguientes esquivas (-1 como un atacante adicional) y/o gasta la reacción normal del turno (que según §6 limpia el penalizador)? Las dos lecturas chocan.
- Reflejos Felinos: ¿reduce el penalizador acumulado en 1 en total (-3 pasa a -2) o en 1 por cada acción defensiva (lo anularía)? Se asume en total, sin pasar de 0.
- Balanceo/Como Pez en el Agua: el 'fallo se convierte en éxito', ¿incluye el fracaso crítico o solo el fracaso normal?
- Balanceo: ¿qué tirada es 'evitar ser derribado'? Hoy se cuelga de 'Saltar, escalar, levantarse' como el Arköru; el derribo de las armas pide 'su propia salvación' sin decir cuál.
- Como Pez en el Agua: ¿existe alguna tirada para mantenerse a flote o nadar en aguas turbulentas (dificultad, par)? Hoy no hay acción de nadar; se cuelga de Saltar, escalar, levantarse.
- Depredador Acuático: ¿cuál es el penalizador de dificultad de los ataques melee dentro del agua? No existe en sistema.md. ¿Afecta también a Bloquear y a lanzar armas?
- Lanzador Preciso: la cobertura suma a la dificultad antes de tirar; ¿'al acertar' significa que se omite al calcular si se acierta, o afecta a algo posterior (p. ej. el área de una granada contra quien está a cubierto)? ¿Rebaja también la cobertura total (nivel 5) a 4 y permite atacar?
- Salto Evasivo: '¿el primer éxito cuenta doble' significa +1 éxito si la esquiva tiene éxito (afecta a cuánto se reduce el daño/área), o también ayuda a pasar de fracaso a éxito? ¿Es la Defensa / esquiva o una salvación de Reflejos contra el área?
- ¿'El primer éxito contabiliza triple' significa +2 éxitos sobre el margen cuando hay al menos un éxito? ¿Cuenta un margen 0 (empate con la dificultad) como 'primer éxito'?
- ¿Puede el éxito triplicado llevar el resultado a crítico (6 éxitos), o solo sirve para restar del área/ataque?
- No hay regla de daño por caída en el sistema: ¿cuánto daño y de qué categoría por metro? Saber Caer y Caer Parado dependen de ella.
- ¿Caer Parado sustituye a Saber Caer (8 m en total) o se suman (12 m)? El nombre no dice 'Mejorado' y no pide Saber Caer como requisito.
- habilidades.md dice que, con la especialidad de Salto, las reacciones durante un salto ya forman parte de la misma acción simple, y que un ataque durante el salto tiene +2 de dificultad. ¿Salto Ofensivo mantiene ese +2 (lo quita solo la versión Mejorada)?
- ¿'A distancia' incluye lanzamientos y armamento pesado/granadas, o solo armas de fuego?
- ¿Aferrarse con Agarre Rápido requiere la tirada habitual de reflejos + escalada, o la dote solo cambia la acción a gratuita? ¿Con qué dificultad?
- ¿Qué penalización tiene normalmente trepar con una mano ocupada? habilidades.md solo dice que para agarrarse hace falta al menos una mano libre.
- La tirada de Correr (reflejos + carrera, dificultad 6) de habilidades.md no tiene acción en la app. ¿Se confirma ese par? acciones.ts usa potencia + atletismo para el resto del movimiento.
- ¿Zafarse usa la tirada normal de liberarse del estado Atrapado (potencia/fortaleza + atletismo) o una con Escapismo y Agilidad (requisito de la dote)? ¿Vale también para el estado Inmovilizado?

### Biociencia (19)

- ¿'Tratamiento' incluye solo la tirada de Tratar heridas (Perspicacia + Biociencia) o también las salvaciones/curas con fármacos de esas afecciones?
- 'Herida' como afección: ¿es el estado 'heridas' de §7 (y no el daño letal/grave normal que también se trata con medicina)?
- ¿Qué es una 'prueba de diagnóstico'? ¿La misma tirada de Tratar heridas (Perspicacia + Biociencia/Medicina) antes de tratar, u otra tirada aparte con su dificultad?
- ¿La ventaja de Ojo Clínico se acumula con el +1 por gastar fatiga de §7 (que solo cita ataque, defensa y salvación)?
- 'Siempre que no esté fatigado': ¿significa estar bajo el umbral Fatigado (<25 %, y por tanto también Exhausto) o haber gastado cualquier punto de fatiga?
- ¿Qué estados cuentan como 'efectos emocionales'? ¿Miedo y confusión, o todo lo que salva Voluntad (efectos mentales)?
- ¿Qué pasa con fracaso y fracaso crítico (¿se pierde el material?) y con éxito crítico (¿más del 50 %?)?
- 'Material común biológico': ¿equivale a materiales sencillos de la ficha? ¿Cuántas unidades?
- ¿El +50 % es permanente o hasta la siguiente recarga? ¿Se acumula si se repite?
- ¿Qué es el 'nivel de la toxina'? Los venenos/munición tóxica del catálogo de equipo no traen un nivel de toxina explícito.
- ¿Fracaso crítico tiene algo más que perder el veneno (intoxicarse, por ejemplo)?
- ¿Hay tope de niveles al potenciar, y se puede repetir sobre la misma toxina?
- ¿La fabricación de implantes biónicos se tira con Biociencia (Biónica) o con Tecnociencia? (pregunta 20 de sistema.md, en proceso)
- ¿El 15 % de Gran Maestro sustituye al 10 % de Artesano Biónico (vale la mejor) o se suman (25 %)? ¿Y el 25 % con crítico es el total?
- ¿El crítico que da el 25 % es el de la tirada de fabricación/reparación del implante?
- ¿El 15 % de Gran Genio Genetista sustituye al 10 % de Genio Genetista o se suman? ¿El 25 % con crítico es el total?
- *(común del lote)* Requisitos de especialidad con número ('Medicina 2', 'Biónica 6'): en la ficha una especialidad no tiene nivel propio (habilidad = { valor, especialidades: string[] }). ¿Se lee como 'Biociencia N o más y tener la especialidad X'?
- *(común del lote)* Biotecnología, Biónica e Ingeniería Genética no están en el catálogo de especialidades de Biociencia (§3 lista Química, Bioquímica, Medicina). ¿Se añaden? ¿Biónica es de Biociencia o de Tecnociencia?
- *(común del lote)* 'Reduce en 1 la dificultad' se modela como +1 a la tirada (equivalente: el margen y el crítico salen iguales). Confirmar que no hay diferencia de regla.

### Combate Melee (54)

- Bloqueo: 'la tirada es la misma de ataque del arma'. ¿Incluye el ajuste de dificultad del modo de ataque (p.ej. el −1 de la Patada o de algunas armas)? Hoy Bloquear con X solo lleva el par y el ajuste propio de bloqueo (Mangual −2).
- Bloqueo, tamaño: 'penalizador de dificultad de −2' / 'bonificador de +1': ¿se suman a la tirada del que bloquea (−2 / +1)? Se asume así.
- Bloqueo: el contraataque en crítico, ¿consume la reacción normal de la ronda (1 por ronda) aunque el bloqueo sea reacción gratuita?
- Combate Sutil: la dote solo habla del atributo de la tirada. El estilo Sutil de EQUIP además calcula el daño con Potencia en vez de Fuerza. ¿Ese daño también exige la dote, o sin dote se puede pegar a lo bruto con Fuerza y nada más cambia?
- Combate Sutil: ¿bloquear con un arma sutil usando Reflejos también exige la dote? Se asume que sí, porque la pregunta 31 dio el bloqueo por igual que el ataque.
- Combate Sutil: el modo Aguijón del Proyector de Pulso está fijo en Reflejos ('Sutil') en combate.ts. ¿Sin la dote pasa a tirarse con Potencia?
- Ataque de oportunidad: §9.2 dice que solo existe con la dote, pero las reglas base lo nombran en otros sitios (Paso 'no provoca ataque de oportunidad'; Presa y Desarme dan 'derecho a un ataque de oportunidad'; Arrollar 'provoca ataque de oportunidad de la forma habitual'). Sin la dote, ¿esos casos no dan nada, o dan un ataque de oportunidad aunque no se tenga la dote?
- Ataque de Oportunidad Múltiple: '1 por turno como acción gratuita', ¿es además del de reacción (2 por ronda en total) o sustituye al de reacción?
- Arrollar: 'tirada de ataque con el atributo de potencia'. ¿Con qué habilidad: Combate Melee (con la especialidad Pelea al ser requisito) o Atletismo? Se asume Combate Melee.
- Arrollar: ¿qué daño hace a los objetivos? La prosa dice que los obstáculos 'reciben el daño' y que el éxito simple desplaza 'sin hacerle daño'. ¿El crítico hace daño? ¿Daño de Pelea (Fuerza), del arma que se lleve o de otro tipo?
- Arrollar: ¿se tira una sola vez y ese total vale para todos los objetivos del trayecto, o una tirada por objetivo?
- Apresar y Apuñalar: la reacción que se gana, ¿es una reacción extra además de la normal de la ronda? ¿Se gana en cada presa con éxito, también al repetir la presa sobre un objetivo ya atrapado?
- Combate con Dos Armas Melee: si el ataque doble combina un Estándar y un Simple, ¿cuánto cuesta en acciones? Ataque Melee Doble lo fija en acción estándar con dos simples; con estándar + simple, ¿pasa a ser compleja, o sigue siendo estándar? ¿Se mantiene el +1 de dificultad en cada ataque?
- Combinación: «−1 en acciones defensivas» ¿incluye salvaciones o solo Defensa/esquiva y Bloqueo?
- Combinación: ¿los tres ataques pueden ser con modos de acción estándar (p. ej. escudos o armas pesadas) o solo ataques simples?
- Combinación Rápida: el modo de combate sutil exige la dote Combate Sutil (sistema.md §9.2), pero no figura en sus requisitos. ¿Hace falta tenerla para que sirva?
- Combinación Rápida: ¿los tres ataques tienen que ser en modo sutil para quitar los penalizadores, o basta con el que se tire en sutil?
- Crítico Mejorado: si el personaje cumple los dos requisitos (Melee 3 y Distancia 3), ¿elige una especialidad de cualquiera de las dos? ¿Se puede comprar otra vez para otra especialidad?
- Crítico Mejorado: ¿cuenta también para lanzar un arma melee arrojadiza de esa especialidad?
- Derribo Mejorado: la maniobra base ya quita 1 de fatiga si el objetivo saca fracaso crítico. Con la dote y fracaso crítico, ¿pierde 2 (1 + 1) o solo 1 más el aturdido?
- Derribo Mejorado: ¿vale también para el derribo de armas de fuego a corta distancia y para el de Arrollar (que dice que las mejoras del derribo se aplican solas)?
- Derribo Brutal: «si se utiliza una acción estándar para derribar», ¿es gastar la acción estándar del turno en el ataque (con cualquier arma) o atacar con un modo de arma que ya cuesta acción estándar?
- Desenfundado Rápido: dice «primer disparo». ¿Lo de dejar sorprendido al objetivo vale también para el primer ataque melee?
- Desenfundado Rápido: «ataque simple», ¿solo con modos de arma que cuestan acción simple?
- Defensa con Escudo Rápida: dice «en lugar de una acción simple», pero solo la Rodela se levanta con acción simple; el resto de escudos, con estándar. ¿La reacción vale para todos?
- Defensa con Escudo Constante: si se tienen también la Rápida, ¿vale la mejor (gratuita) como en las versiones mejoradas, o se lee como dotes independientes?
- Defensa con Escudo Constante: «contra cualquier ataque que no esté desprevenido» se lee como «salvo si el portador está desprevenido». ¿Es así?
- Maestro del Escudo: un escudo de cobertura 4 pasaría a 5, que es cobertura total y no deja atacar. ¿Tiene tope en 4?
- Golpea Primero, Golpea Dos Veces: ¿el golpe extra tiene que ser contra el enemigo al que adelantaste, o contra cualquiera?
- Finta: el fracaso crítico «provoca ataque de oportunidad», pero el ataque de oportunidad solo existe con su dote (sistema.md §9.2). ¿Puede hacerlo un enemigo que no tenga esa dote?
- Finta: con éxito crítico, ¿el enemigo queda desprevenido en vez de sorprendido, o además del ataque como sorprendido?
- Finta: el −2 por repetir contra el mismo enemigo, ¿se acumula con cada finta (−2, −4…) o es −2 fijo? ¿Dura todo el combate?
- Finta pone el -2 'tras la primera finta contra un enemigo' (salga como salga), pero Maestro de Fintas lo quita solo contra un enemigo 'previamente engañado por la maniobra'. Si la primera finta falló, ¿las siguientes siguen llevando el -2 aunque se tenga Maestro de Fintas?
- 'Penalizador de dificultad de -2' (Finta): ¿es -2 a la tirada del que finta o +2 a la dificultad? Con la tirada enfrentada contra alerta viene a ser lo mismo, pero confírmalo.
- 'Asfixia grado 1' no está entre los 20 estados (sistema.md §7). ¿Qué hace, y qué es el 'grado 1'? (¿El grado 'fracaso' de su tabla?)
- ¿El -1 al daño se aplica siempre al marcar la maniobra, o solo cuando el rival falla la salvación?
- ¿Un ataque desarmado (puñetazo, patada) cuenta como 'daño contundente' para esta dote?
- Si el acercamiento en sigilo tiene éxito, ¿el ataque se hace contra un objetivo sorprendido o desprevenido (con el -3 a su primera defensa), o la dote solo ahorra la acción?
- ¿El acercamiento pide una tirada de Sigilo contra la alerta del objetivo, como cualquier movimiento sigiloso?
- 'Segundos ataques mantienen la condición de sorpresivo': ¿solo el segundo ataque, o todos los siguientes? ¿Solo en ese turno, o mientras dure el combate?
- Sorprendido da -3 a la 'primera tirada defensiva contra un enemigo oculto'. Con Asesino, ¿el -3 vale para cada ataque siguiente, y el desprevenido sigue sin poder defenderse en todos?
- ¿Los ataques con armamento pesado y las granadas cuentan como 'estilo distancia' para esta dote?
- ¿Qué cuenta como 'maniobra' (Carga, Derribo, Desarme, Guardia, Presa, Placaje, Bloqueo, Arrollar…)? ¿Y qué da un tamaño de más en cada una? La única tabla de tamaños es la de Bloqueo (-2 por tamaño mayor, +1 por menor).
- 'Dificultad estándar 6': en la tabla de sistema.md §6 Normal es 7 y no hay ninguna dificultad 6. ¿Es 6 o 7?
- El 'efecto crítico' del golpe crítico, ¿es el grado de fracaso crítico de Entorpecido (además del -1, media velocidad…)?
- ¿La debilidad reconocida vale para un solo ataque o para varios contra ese objetivo? ¿Hay que atacar en el mismo turno?
- ¿Lo de 'siempre que cumpla el requisito' quiere decir Combate Melee 1 para melee y Combate a Distancia 1 para distancia, como en Asesino?
- El aliado que recibe el ataque de oportunidad, ¿necesita la dote Ataque de Oportunidad (sistema.md §9.2 dice que la maniobra solo existe con la dote)? ¿Le cuesta su reacción?
- ¿El +3 vale también si el siguiente ataque es a distancia?
- El rival se opone con Perspicacia + Exploración: ¿tira de verdad, o se usa su alerta pasiva (6 + Perspicacia + Exploración)?
- ¿Qué salvación hace el objetivo para no caer derribado (Reflejos + Atletismo como Entorpecido, o Salvación de Reflejos a secas)?
- ¿El +1 vale solo para la tirada de ataque o también para las maniobras (Derribo, Placaje…) desde la posición elevada?
- *(común del lote)* «Penalizador de dificultad de −N» (Combinación, Finta, y el −2 del Derribo en habilidades.md) se aplica como −N a la tirada de quien lo hace, igual que «aumenta en N la dificultad». ¿Es así?
- *(común del lote)* Varias dotes de este lote (Golpe Entorpecedor, Asesino) se limitan al estilo de combate (melee o distancia) cuyo requisito cumple el personaje. ¿Es una regla general de las dotes con requisito 'Combate Melee N o Combate a Distancia N'?

### Combate a Distancia (11)

- Cobertura Rápida: ¿deslizarse a cubierto requiere tirada de Acrobacias o es automático? ¿La 'misma acción' es la acción simple de movimiento?
- Disparo a la Carrera Mejorado: el Disparo a la Carrera base es acción estándar y solo hay una estándar por turno; ¿'una vez por turno' añade algo, o la dote permite hacerlo con acciones simples (dos por turno)?
- Gran Puntería: 'al apuntar' se lee como la tirada de la acción Apuntar (no el ataque). ¿Correcto? *(Construido así, 2026-10-23: el éxito → crítico va en la fila Apuntar; supuesto S79, pendiente de Murillo.)*
- Gran Puntería: cuando el éxito pasa a crítico por la dote, ¿también gana el 'omite 1 nivel de cobertura' del crítico de Apuntar? *(Supuesto S79: sí; con la dote, «Apuntado: Éxito» lleva la nota de omitir 1 nivel. Pendiente de Murillo.)*
- Gran Puntería: con crítico natural al apuntar, ¿la cobertura baja 2 niveles en total o 2 más el nivel que ya omite el crítico de Apuntar (3)? *(Supuesto S79, aprobado por el usuario: 2 en total. Pendiente de Murillo.)*
- Precisión Imperturbable: 'de forma gratuita el tirador apunta a cualquier objetivo', ¿es Apuntar como acción gratuita sin límite por turno (sigue tirando perspicacia + combate a distancia) o apunta automáticamente sin tirada (siempre el +1 de Apuntar en el siguiente ataque)? ¿'Cualquier objetivo' quiere decir también varios a la vez?
- Recarga Relámpago: la recarga como reacción, ¿consume la única reacción por ronda del personaje?
- Recarga Relámpago: ¿aplica también al armamento pesado (recarga compleja) y a las armas de energía (cambio de batería)?
- Tirador de Larga Distancia Avanzado: 'ataques de especialidad' se lee como ataques tirados con una especialidad que el personaje tiene (Armas de Fuego Cortas/Larga…). ¿Correcto?
- Tirador de Larga Distancia Avanzado: no exige Tirador de Larga Distancia. Si se tienen las dos, ¿en especialidad queda en 0 (no se suman) y fuera de especialidad sigue el -1 de la básica?
- *(común del lote)* Apuntar y Disparo a la Carrera están en fuente/habilidades.md (acciones de Combate a Distancia) pero no en sistema.md ni en la app; cinco dotes del lote dependen de ellas. ¿Se transcriben ya como acciones (Apuntar: perspicacia + combate a distancia, dif. 6, acción simple, +1 al siguiente ataque; Disparo a la carrera: -2 al ataque)? *(Apuntar transcrita como tirada fija, 2026-10-23, `sistema.md` §6; Disparo a la Carrera sigue sin fila.)*

### Exploración (8)

- 'Dificultad estándar de 6': en sistema.md §6 la dificultad Normal es 7. ¿Es 6 a propósito (como Apuntar en habilidades.md) o debería ser 7?
- Si el personaje informa a un aliado, ¿informar cuesta alguna acción aparte, y el efecto caduca si el aliado no ataca en su siguiente turno?
- Subsistencia 'en combate dentro de su bioma': ¿la ventaja en subsistencia aplica siempre que se esté en el bioma (fuera de combate), y solo la de iniciativa exige combate?
- ¿La lista de biomas es cerrada (selva densa, zona árida, subsuelo, baja gravedad, frío extremo) o son ejemplos y el jugador define el suyo con el máster?
- ¿Se puede comprar varias veces con biomas distintos, como Especialidad Médica?
- (Ya en §9.5) Falta el efecto de Olfato de Investigador.
- 'Repetir la prueba asumiendo un penalizador menor de −2': ¿−2 sobre la tirada repetida, o 'menor' frente a algún penalizador que tendría la repetición sin la dote (¿cuál?)?
- *(común del lote)* Rastreo, Subsistencia e Investigación (Inspección de Escena, Análisis de Pistas, Búsqueda Documental) vienen en docs/fuente/habilidades.md pero no están en sistema.md ni en acciones.ts; cuatro dotes de Exploración cuelgan de ellas. Hay que pasarlas antes de construir estas dotes (decisión del usuario, no del diseñador).

### Tecnociencia (Psiónica) (20)

- Maestría Psiónica: las consecuencias 'con esta dote' (fracaso → 1 nivel no letal; crítico → letal + aturdido) ¿sustituyen a las del implante (aumentos.md) o son la consecuencia base del sobreesfuerzo para psiónicos de nacimiento?
- Maestría Psiónica: exhausto + fracaso 'causa aturdimiento': ¿cuántos turnos (1, como en el fracaso crítico)? Y exhausto + fracaso crítico: daño grave, ¿con aturdimiento también?
- Maestría Psiónica: '1 nivel de daño' ¿equivale a 1 punto de golpe?
- Gran Maestría Psiónica: ¿conserva el alivio de Maestría en la salvación contra el sobreesfuerzo (fracaso no letal, etc.)? Se asume que sí: solo el umbral de nivel 'vale el mejor'.
- Saber es Poder: 'en estado de fatiga' ¿significa Fatigado (<25 %) o basta con haber gastado algo de fatiga? ¿Vale también Exhausto?
- Saber es Poder: ¿cómo se resuelve el 50 % (d12 par/impar, moneda)?
- Saber es Poder: no pide tener psiónica ni ninguna disciplina, a diferencia de las otras dotes de sobreesfuerzo. ¿Es intencionado?
- Onda Residual: 'durante el turno siguiente' ¿es el siguiente turno del psiónico o la ronda siguiente completa?
- Onda Residual: el −2 a Reflejos ¿va al aplicado (todas las tiradas con Reflejos: esquiva, salvación de Reflejos, sigilo) o solo a la esquiva? ¿Afecta también a aliados?
- Onda Residual: Expansión afecta al propio psiónico; la onda no. ¿Confirmas que la explosión le sigue afectando y solo la onda posterior le exime?
- Impacto Métrico: los modificadores por tamaño hablan de 'horizontal de 4 metros y vertical de 2 metros por nivel', pero el vector frontal da 2 m (éxito) y 4 m (fracaso). ¿El tamaño divide los dos casos? ¿Los 2 m verticales son los del ascendente?
- Impacto Métrico, vector descendente: '1 nivel de daño adicional por cada dos niveles empleados' ¿de qué categoría (letal, como el resto del daño adicional)? ¿Se suma al 2 + nivel?
- Impacto Métrico, vector descendente: '+1 a la dificultad para evitar el efecto': si no hay desplazamiento, ¿qué efecto evita la salvación (el derribo)?
- Impacto Métrico: el nivel empleado ¿lo limita el nivel en Singularidad? Si el ataque falla, ¿se paga igualmente la fatiga?
- Impacto Métrico: 'volado' en el vector descendente ¿es 'voleo'? Objetivo volando con éxito crítico: 'una casilla' ¿cuántos metros?
- Impacto Métrico Relámpago: ¿qué ataques melee son 'de mayor complejidad' que una acción estándar (p. ej. el ataque pesado)? Con uno de esos, ¿se mantiene como compleja?
- Sobrecarga Métrica: si la prueba de Perspicacia + Medicina falla, ¿se gana igualmente la Fuerza durante el turno, o solo se recibe el daño?
- Sobrecarga Métrica: el +Fuerza ¿sube también Potencia y Fortaleza (y por tanto los puntos de golpe) durante el turno?
- Sobrecarga Métrica: el nivel empleado ¿lo limita el nivel en Traslación?
- *(común del lote)* Sobreesfuerzo para psiónicos de nacimiento (afecta a Potencia, Maestría, Gran Maestría Psiónica y Saber es Poder): ¿cuándo salta, qué tirada es (¿Voluntad dificultad 6 + nivel empleado, como en el implante?) y qué pasa al fallar? Sin esa regla las cuatro dotes son solo texto (sistema.md §9.6).

### Transversales (6)

- sube_grado y exito_extra: 'el fallo se convierte en éxito' ¿incluye el fracaso crítico? y 'el primer éxito cuenta doble' ¿suma al margen (afecta a daño y crítico) o solo al grado?
- Ventaja por casilla: ¿se acumula con otra ventaja o desventaja (fija de disciplina, bioma + ojo clínico), o como máximo hay una?
- Daño: ¿el −1 de Golpe Fatigante se aplica antes o después del +1 por cada 2 éxitos, y puede bajar de 1?
- Material común biológico: sheet.materiales solo distingue tier (sencillos/sofisticados/avanzados); ¿qué tier y cuántas unidades gasta, y hace falta un tipo 'biológico'?
- Efectos temporales propios (Sobrecarga Métrica): EstadoActivo solo vive en combate; ¿quién descuenta la duración fuera de combate y la mantiene el jugador o el máster?
- Límites de uso (N por turno/día/objetivo): ¿se quedan como dato que se muestra o la app los acabará contando? Condiciona el Efecto economia y los Limite múltiples.

---

## 10. Avisos del proceso

- **Lotes caídos:** ninguno (12 lotes de 12 items como máximo, 105 dotes).
- **Efectos sin veredicto:** ninguno. Todos los claims tienen `verificacion` (confirmado, corregido o no_aplica).
- **Incoherencias normalizadas en la redacción:**
  - `motor` venía en tres formatos según el lote (`afecta: {modo, id}`, `afectaModo/afectaId` y `efecto/alcance`). Se ha **regenerado** desde los claims ya verificados, con un formato único y la lista de claims de cada entrada; así recoge también las correcciones del verificador, que no se habían propagado a las propuestas.
  - Ids de especialidad mezclados (`Manipulación`, `Táctica`, `Medicina` frente a `pelea`, `medicina`): todos a slug.
  - Algunos claims estructurales (coste, requisitos) venían `construido` en unos lotes y `pendiente` en otros. Da igual para la cobertura; al construir, todos dependen del área de compra de dotes, que no existe.
  - `combate_a_distancia` es el lote, pero el grupo de la dote es `combate_distancia` (id de habilidad).

## 11. Supuestos de esta redacción (no están en sistema.md)

- **`porque: "capa_pendiente"`** en cinco textos (Derribo Brutal, Golpe Mejorado con Escudo, Golpe Fatigante, Imitación). Son números que la app podrá aplicar cuando exista la capa, no textos para siempre. Alternativa: dejarlos como `sin_regla`, que es engañoso porque la regla sí está.
- **Equilibrista y Velocista (éxito → crítico)** pasan a `margen_critico` 0 en vez de `sube_grado`, como pide el verificador. `sube_grado` queda solo para fracaso → éxito.
- **Sobrecarga Métrica** no recibe los ModificadorFatiga de Traslación (son de carga).
- **Bioma Predilecto** en rastreo: dos bonos +3 por opción adversa, en vez del campo `fija_opcion`, mientras no se decida ese campo.

