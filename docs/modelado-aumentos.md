# Modelado de los Aumentos: salida del workflow `modelar-area`

- **Qué es:** la salida del workflow `modelar-area` sobre `docs/aumentos.md` (fuente literal del diseñador), con el **modelo de aumentos** (`CatalogoAumentos`, `scripts/workflows/modelar-area-extraer.ts`; decisiones en `docs/sistema.md` §11).
- **Estado:** **propuesta sin construir**. Nada de esto está en `src/lib/rules` ni en el catálogo.
- **Quién manda:** `docs/sistema.md`. Si algo de aquí choca con él, gana sistema.md; un supuesto de este documento no existe para el código hasta que entre allí.
- **Borrador:** `docs/modelado-aumentos.json`, raíz `CatalogoAumentos { aumentos: Aumento[]; extraccion }`. Lleva aplicadas **las correcciones del verificador** (§7) y un `motor` por efecto.
- **Lectura:** cada lote es un trozo de una rama (Operaciones genéticas 1-3, Implantes 1-3) y cada item es una **pieza**. Donde la plantilla dice "disciplina", aquí es "pieza".
- **Notación de efectos:** `tipo · afecta · mecanismo · estado`. **(C)** = corregido en verificación. `#n` = claim del workflow.

---

## 1. Cobertura

### 1.1 Global

| Piezas | Efectos | Cubierto | parametro | resultado_texto | manual | pregunta | narrativo | Con `campoNuevo` |
|---|---|---|---|---|---|---|---|---|
| 32 + 3 bloques comunes | **432** | **97 %** | 395 | 0 | 0 | 5 | 32 | 27 |

Un efecto no cuenta como cubierto si su destino es `pregunta` o si propone un `campoNuevo` sin ruta en el modelo.

### 1.2 Por pieza

Filas por debajo del 100 % en **negrita**.

**Operaciones genéticas**

| Pieza | Efectos | % | parametro | pregunta | narrativo |
|---|---|---|---|---|---|
| Mielinización Central | 6 | 100 | 6 | 0 | 0 |
| Neurogénesis Hipocampal | 6 | 100 | 6 | 0 | 0 |
| Estabilización Engramática | 6 | 100 | 5 | 0 | 1 |
| Red Frontoparietal | 8 | 100 | 8 | 0 | 0 |
| Prefrontal Aumentada | 8 | 100 | 8 | 0 | 0 |
| **Optimización Foveo-Sensorial** | 7 | **86** | 6 | 1 | 0 |
| Optimización Vestíbulo-Auditiva | 6 | 100 | 6 | 0 | 0 |
| Consciencia Omnidireccional | 6 | 100 | 6 | 0 | 0 |
| Asa Estriatotalámica | 5 | 100 | 5 | 0 | 0 |
| Conectividad Callosa | 7 | 100 | 7 | 0 | 0 |
| Regulación Límbico-Prefrontal | 5 | 100 | 5 | 0 | 0 |
| Proyección Neuro-Expresiva | 6 | 100 | 6 | 0 | 0 |
| Matriz de Red Predeterminada | 8 | 100 | 7 | 0 | 1 |
| Integridad Osteotendinosa | 6 | 100 | 6 | 0 | 0 |
| Matriz Ósea Adaptativa | 7 | 100 | 7 | 0 | 0 |
| Hipertrofia Miofibrilar | 7 | 100 | 7 | 0 | 0 |
| Sincronización Neuromotora Profunda | 6 | 100 | 6 | 0 | 0 |
| Hiperdensidad Propioceptiva | 5 | 100 | 5 | 0 | 0 |
| Automatismo Bulboespinal | 7 | 100 | 7 | 0 | 0 |
| Bucle de Realimentación Motora | 5 | 100 | 5 | 0 | 0 |
| Biogénesis Mitocondrial | 7 | 100 | 7 | 0 | 0 |
| Angiogénesis Sistémica | 11 | 100 | 11 | 0 | 0 |
| Resiliencia Homeostática | 5 | 100 | 5 | 0 | 0 |
| Regeneración Tisular Acelerada | 11 | 100 | 11 | 0 | 0 |
| Estabilización Autonómica | 7 | 100 | 7 | 0 | 0 |
| **Introgresión Sensorial Heteróloga** | 34 | **97** | 29 | 1 | 4 |

**Implantes**

| Pieza | Efectos | % | parametro | pregunta | narrativo |
|---|---|---|---|---|---|
| Implante de Resonancia Métrica (1-4) | 43 | 100 | 34 | 0 | 9 |
| **Microprocesador Cuántico de Enlace (1-4)** | 57 | **93** | 50 | 0 | 7 |
| **Comunes implantes_1** | 4 | **50** | 2 | 1 | 1 |
| Brazo Biónico (1-4) | 42 | 100 | 40 | 0 | 2 |
| Ojo Biónico (1-4) | 26 | 100 | 24 | 0 | 2 |
| **Comunes implantes_2** | 3 | **33** | 1 | 2 | 0 |
| Neuroprótesis Simpática (1-4) | 21 | 100 | 20 | 0 | 1 |
| Enjambre Nanobot (1-4) | 30 | 100 | 27 | 0 | 3 |
| **Comunes implantes_3** | 4 | **50** | 3 | 0 | 1 |

`resultado_texto` y `manual` son 0 en todas las filas.

### 1.3 Qué impide el 100 %

**Efectos a `pregunta` (5)**

| Claim | Qué falta |
|---|---|
| Foveo-Sensorial #5 | "Ataque a distancia por puntería": ¿acción Apuntar o cualquier disparo? |
| Introgresión #18 | Vulnerabilidad electromagnética sin efecto definido |
| Comunes implantes_1 #3 | Extracción: dificultad, método, qué implantes |
| Comunes implantes_2 #2 | Extracción (ídem) |
| Comunes implantes_2 #3 | Duración de la extracción según un "método" sin definir |

**Efectos con `campoNuevo` sin ruta (sin consolidar, 9)**

| Claim | Campo nuevo |
|---|---|
| MQE #17 | `defensa_intrusion.accionIntrusion` (prueba del intruso cada turno, compleja, con concentración) |
| MQE #39 | `defensa_intrusion.escape` (Perspicacia + Tecnociencia dif. 10 para salir del cepo) |
| MQE #52, #57 | `defensa_intrusion.defensaAlternativa` (elegir defensa/contragolpe del nivel 3 en el nivel 4) |
| Comunes implantes_1 #3, #4 | `CatalogoAumentos.extraccion` |
| Comunes implantes_3 #3, #4 | `CatalogoAumentos.extraccion` |

En el borrador JSON, `extraccion` ya tiene sitio provisional en la raíz y la defensa del MQE lleva `tiradaIntruso`, `escape` y `defensaAlternativa`, marcados `_campoNuevo`.

---

## 2. Checklist del modelo

Leyenda: **✓** relleno · **—** no aplica · **✗** falta.

### 2.1 Operaciones genéticas

`motor` = un MotorMetadata por efecto (comprobado en el JSON: 32 piezas, cuentas iguales).

| Pieza | rareza | coste | requisitos | eleccion | repetible | efectos | motor |
|---|---|---|---|---|---|---|---|
| Mielinización Central | ✓ | ✓ | — (raíz) | — | ✓ no | ✓ 2 | ✓ 2 |
| Neurogénesis Hipocampal | ✓ | ✓ | ✓ Mielinización | — | ✓ no | ✓ 3 | ✓ 3 |
| Estabilización Engramática | ✓ | ✓ | ✓ Neurogénesis | — | ✓ no | ✓ 3 | ✓ 3 |
| Red Frontoparietal | ✓ | ✓ | ✓ Mielinización | — | ✓ no | ✓ 4 | ✓ 4 |
| Prefrontal Aumentada | ✓ | ✓ | ✓ Mielinización | — | ✓ no | ✓ 4 | ✓ 4 |
| Optimización Foveo-Sensorial | ✓ | ✓ | — (raíz) | — | ✓ no | ✓ 4 | ✓ 4 |
| Optimización Vestíbulo-Auditiva | ✓ | ✓ | ✓ Foveo | — | ✓ no | ✓ 4 | ✓ 4 |
| Consciencia Omnidireccional | ✓ | ✓ | ✓ Foveo + Prefrontal | — | ✓ no | ✓ 3 | ✓ 3 |
| Asa Estriatotalámica | ✓ | ✓ | ✓ Mielinización | — | ✓ no | ✓ 2 | ✓ 2 |
| Conectividad Callosa | ✓ | ✓ | ✓ Prefrontal | — | ✓ no | ✓ 5 | ✓ 5 |
| Regulación Límbico-Prefrontal | ✓ | ✓ | — (raíz) | — | ✓ no | ✓ 5 | ✓ 5 |
| Proyección Neuro-Expresiva | ✓ | ✓ | ✓ Regulación | — | ✓ no | ✓ 3 | ✓ 3 |
| Matriz de Red Predeterminada | ✓ | ✓ | ✓ Proyección | — | ✓ no | ✓ 7 | ✓ 7 |
| Integridad Osteotendinosa | ✓ | ✓ | — (raíz) | — | ✓ no | ✓ 3 | ✓ 3 |
| Matriz Ósea Adaptativa | ✓ | ✓ | — (raíz) | — | ✓ no | ✓ 4 | ✓ 4 |
| Hipertrofia Miofibrilar | ✓ | ✓ | ✓ Matriz Ósea + Integridad | — | ✓ no | ✓ 3 | ✓ 3 |
| Sincronización Neuromotora | ✓ | ✓ | ✓ Integridad | — | ✓ no | ✓ 3 | ✓ 3 |
| Hiperdensidad Propioceptiva | ✓ | ✓ | — (raíz) | — | ✓ no | ✓ 2 | ✓ 2 |
| Automatismo Bulboespinal | ✓ | ✓ | ✓ Hiperdensidad + Integridad | — | ✓ no | ✓ 3 | ✓ 3 |
| Bucle de Realimentación Motora | ✓ | ✓ | ✓ Automatismo | — | ✓ no | ✓ 2 | ✓ 2 |
| Biogénesis Mitocondrial | ✓ | ✓ | — (raíz) | — | ✓ no | ✓ 6 | ✓ 6 |
| Angiogénesis Sistémica | ✓ | ✓ | ✓ Matriz Ósea + Biogénesis | — | ✓ no | ✓ 7 | ✓ 7 |
| Resiliencia Homeostática | ✓ | ✓ | ✓ Angiogénesis | — | ✓ no | ✓ 7 | ✓ 7 |
| Regeneración Tisular Acelerada | ✓ | ✓ | ✓ Angiogénesis | — | ✓ no | ✓ 8 | ✓ 8 (+ `reemplazaAccion`, campo nuevo) |
| Estabilización Autonómica | ✓ | ✓ | — (raíz) | — | ✓ no | ✓ 7 | ✓ 7 |
| Introgresión Sensorial Heteróloga | ✓ | ✓ | — (raíz) | ✓ 6 sentidos | ✓ sí | ✓ 28 (con `opcion`) | ✓ 28 |

### 2.2 Implantes (cabecera)

| Implante | descripcion | sabotaje | extraible | electronico |
|---|---|---|---|---|
| Resonancia Métrica (IRM) | ✓ | ✓ true | ✗ null (fuente no lo dice) | ✓ true |
| Microprocesador Cuántico (MQE) | ✓ | ✓ true | ✗ null | ✓ true |
| Brazo Biónico | ✓ | ✓ true | ✗ null | ✓ true |
| Ojo Biónico | ✓ | ✓ true | ✗ null | ✓ true |
| Neuroprótesis Simpática | ✓ | ✓ true | ✗ null | ✓ true (pregunta) |
| Enjambre Nanobot | ✓ | ✓ true | ✗ null | ✓ true |

### 2.3 Implantes (por nivel)

Formato de celda: `rareza/coste · sustituye · variantes · efectos/motor`.

| Implante | N1 | N2 | N3 | N4 |
|---|---|---|---|---|
| IRM | ✓/✓ · — · — · 3/3 | ✓/✓ · ✓3 · — · 2/2 | ✓/✓ · ✓3 · — · 2/2 | ✓/✓ · ✓5 · — · 2/2 |
| MQE | ✓/✓ · — · — · 2/2 | ✓/✓ · ✓3 · — · 2/2 | ✓/✓ · ✓5 · — · 4/4 | ✓/✓ · ✓5 · — · 4/4 |
| Brazo | ✓/✓ · — · — · 4/4 | ✓/✓ · ✓2 · — · 3/4 (blindaje lleva motor propio) | ✓/✓ · ✓2 · ✓ Fuerte/Ágil · 0/0 + variantes | ✓/✓ · ✓1 · ✓ Fuerte/Equilibrado/Ágil · 0/0 + variantes |
| Ojo | ✓/✓ · — · — · 4/4 | ✓/✓ · ✓1 · — · 4/4 | ✓/✓ · ✓2 · — · 3/3 | ✓/✓ · ✓4 · — · 6/6 |
| Neuroprótesis | ✓/✓ · — · — · 2/7 (activable con 5 internos) | ✓/✓ · ✓1 · — · 1/1 | ✓/✓ · — (añade) · — · 2/2 | ✓/✓ · — (añade) · — · 2/5 (activable con 4 internos) |
| Enjambre | ✓/✓ · — · — · 3/3 | ✓/✓ · — · — · 5/5 | ✓/✓ · — · — · 3/3 | ✓/✓ · ✓2 · — · 2/3 (nota de blindaje aparte) |

**Faltas reales:** solo `extraible` (null en los seis). El resto está relleno o no aplica.

---

## 3. Campos del modelo que leerá la tubería

### 3.1 `camposModelo`, ordenados por nº de piezas

| Campo | Piezas | Qué hace la app |
|---|---|---|
| `rareza` / `coste` (y por nivel) | 32 (todas) | Tienda: precio y chip de rareza ("Extraña" → "Extraño"). Implantes: comprar cualquier nivel directo; subir cobra la diferencia (§11.3). |
| `efectos[]` tipo `atributo` | 21 | Modificador `atributo` de la pieza → `atributosEfectivos` → aplicados y derivados; cuenta en requisitos de dote (§11.3 matiza S30). |
| `efectos[]` tipo `bono` / `ventaja` (`condicion`, `coste.fatiga`) | ~20 | `condicion: null` → Modificador `tirada` con alcance; `condicion` string → `CondicionTirada` (casilla) con `ventaja` y `costeFatiga`. Mismo camino que `dotesEfectos.ts`. |
| `requisitos` | 18 | Tienda bloquea con "te falta X" (todos, Y); al desequipar un requisito, la dependiente marca requisito roto, como las dotes. |
| `efectos[]` tipo `texto` (`lugar`, `condicion`, `porque`) | ~15 | `textosTirada` en las acciones del `lugar` (o ficha); visibles con su condición; `porque` explica por qué la app no lo aplica. |
| `efectos[].accion` (economía, coste, límite, resolución, daño, resultados, notas) | 9 | `sin_dado` → `AccionDirecta` que cobra `coste.fatiga`; `tirada`/`ataque` → acción propia como las de dote; `danio` → `ResultadoDanio`; economía y límite se muestran. |
| `efectos[]` tipo `reduce_penalizador` | 6 | Entra en `AjusteUmbrales`/estados junto al de especie, filtrado por alcance (capa `reduce_penalizador_por_pieza`). |
| `niveles.*.sustituye` / acumulación | 6 implantes | Al resolver el nivel N, junta efectos 1..N y quita los que un nivel posterior sustituye. |
| `sabotaje` / `extraible` / `electronico` | 6 implantes | Chips en la pieza; `electronico` alimenta la nota de Shock (S73); extracción por `accion_general_extraccion`. |
| `efectos[]` tipo `economia` / `limite` (DATO) | 3 | Solo texto en la tirada del alcance; nada cambia hasta `contador_usos_personaje`. |
| `activable` | 2 | Botón sin dado que cobra fatiga y pone un `EstadoActivo` propio con duración; mientras dura, sus efectos internos cuentan (capa `activable_estado_propio`). |
| `eleccion` / `repetible` / `efectos[].opcion` | 1 (Introgresión) | Selector al comprar; se guarda en la pieza; se puede comprar otra vez con otra opción; solo se construyen los efectos de la opción. |
| `multiplicaFortaleza` | 1 (Hipertrofia) | `salud()`: vida = 8 + Fortaleza × 1,5; `reconciliarVida` al equipar/desequipar. |
| `niveles.*.variantes` | 1 (Brazo) | Selector de modelo al comprar; efectos comunes del nivel + los de la variante. |
| `extremidad` | 1 (Brazo) | Fuerza/Agilidad del brazo = min(máx, básico + delta) → casilla "con el brazo" que recalcula el aplicado. |
| `noApila` | 1 (Ojo; también Regulación y Matriz de Red internamente) | Etiqueta de grupo; `montarTirada` deja solo el mayor (capa `no_apilamiento_mayor`). |
| `inmunidad` | 2 (Ojo, Regeneración) | Lista de estados inmunes en FichaResuelta; la consola del máster no aplica o avisa. |
| `habilita_psionica` | 1 (IRM) | Se guarda pero **no se conecta** (§11.3). |
| `sobreesfuerzo` | 1 (IRM) | En `prepararPoder`/`usarPoder`: si se cumple `cuando` y no está exento, Voluntad contra base + nivel empleado; resultados o carga crítica según umbral de fatiga. |
| `defensa_intrusion` | 1 (MQE) | Dato sobre un tercero: texto en la ficha con dificultad y alcance por nivel; la app no tira por el intruso. |

### 3.2 `camposNuevos` propuestos

| Campo | Forma | Por qué | Claims |
|---|---|---|---|
| Alcance `aplicado:<a>` | `AlcanceModificador { tipo: 'aplicado'; aplicados }` | "Pruebas que usen perspicacia, voluntad o expresión", "tirada de Potencia" | Mielinización #5, Neurogénesis #5, Prefrontal #5 #6, Asa #4, Sincronización #6 |
| Alcance `todas` y `grupoHabilidad:<g>+<h>` (string) | ya existen en `AlcanceModificador`; falta su forma string | Conectividad ("de cualquier tipo"), Ojo (ataques a distancia sin Iniciativa) | Conectividad #4, Ojo #5 |
| `descuento_fatiga` | `{ valor; alcance; limite }` | El modelo no puede quitar coste de fatiga a una tirada | Mielinización #5 |
| `reduce_penalizador.condicion` y `de: 'cualquiera'` | `condicion?`, `'cualquiera'` | La cobertura solo vale como casilla; "cualquier penalizador" social | Foveo #6 #7, Proyección #6 |
| `coste` en `economia` y en notas de acción | `coste?: { fatiga }` | Simplificar y ampliar área cobran fatiga | Asa #4, Introgresión #21 |
| `Operacion.reemplazaAccion` | `{ accion; por }[]` | Una operación posterior abarata la acción de su requisito | Regeneración #8 |
| `CatalogoAumentos.extraccion` | `AccionAumento` con aplicado perspicacia\|reflejos | Regla de la familia, no de una pieza | implantes_1/2/3 comunes |
| `defensa_intrusion.accionIntrusion / escape / defensaAlternativa` | ver §1.3 | No caben en los strings `defensa`/`contragolpe` | MQE #17 #39 #52 #57 |
| `armaIncorporada` + Alcance `arma_incorporada` | `PiezaEquipada.armaIncorporada: instanciaId` | Vincular arma montada a sus efectos | Brazo #9 #10 |
| `activable.eleccion` | `{ id; label; opciones: { efectos }[] }` | +2 a Fuerza o Agilidad se elige al activar | Neuroprótesis #11 |
| `activable.disparadoPor` | `{ accion; coste }` | Se enciende al pagar 3 por la acción simple adicional | Neuroprótesis #19 |
| `costeTrasUso` | `{ fatiga; hasta: 'descanso' \| 'escena' }` | Coste que sube tras el primer uso | Neuroprótesis #16 |

---

## 4. Capas de motor

### 4.1 Tabla por nº de items que desbloquean

"Items (lista)" es lo que declaró el workflow; "piezas reales" cuenta además las piezas a las que la corrección del verificador extendió la capa (p. ej. todos los `atributo`).

| Capa | Amplía a | Items (lista) | Piezas reales | Nº efectos | Depende de |
|---|---|---|---|---|---|
| `atributo_por_pieza` | Modificador `atributo` + `atributosEfectivos` + requisitos de `dotes.ts` (S30) | 8 | **21** (+ Neuroprótesis vía activable) | 11 listados (≈32 efectos `atributo` en total) | — |
| `reduce_penalizador_por_pieza` | `AjusteUmbrales`, `modificadoresDeUmbrales`, `modificadoresDeEstados` | 6 | 7 (+ Ojo) | 8 | `alcance_por_aplicado` |
| `alcance_por_aplicado` | `AlcanceModificador` (variante nueva) | 5 | 5 | 6 | — |
| `accion_general_extraccion` | `ACCIONES` fijas + `CondicionTirada.aplicado` | 3 (bloques comunes) | 3 | 5 | — |
| `activable_estado_propio` | `EstadoActivo`/`DuracionEstado`, `AccionDirecta`, `pagarFatiga` | 2 | 2 | 4 | `atributo_por_pieza`, `reduce_penalizador_por_pieza` |
| `contador_usos_personaje` | recursos de personaje + `terminarEscena` | 2 | 2 (+ límites DATO de Proyección, Matriz de Red) | 2 | — |
| `sobreesfuerzo_en_ventana_poder` | peaje neurológico (`usoPoder.ts`) + sobrecarga | 1 | 1 | **25** | — |
| `extremidad_atributos_propios` | `CondicionTirada.aplicado` + `aplicado()` | 1 | 1 | **15** | — |
| `inmunidad_estado` | `ponerEstado` + consola de estados | 1 | 2 (+ Regeneración) | 2 (+1) | — |
| `ventaja_fija_por_pieza` | `Accion.ventaja` / `Disciplina.ventajas` + `montarTirada` | 1 | 1 | 1 | — |
| `descuento_fatiga_en_tirada` | `CondicionTirada.costeFatiga` + `ModificadorFatiga` | 1 | 1 | 1 | `alcance_por_aplicado`, `contador_usos_personaje` |
| `activable_eleccion_al_activar` | `activable_estado_propio` | 1 | 1 | 1 | `activable_estado_propio` |
| `activable_disparado_por_coste` | `activable_estado_propio` + `AccionDirecta` | 1 | 1 | 2 | `activable_estado_propio` |
| `no_apilamiento_mayor` | Modificador `tirada` + suma en `montarTirada` | 1 | 1 (+ `noApila` interno de Regulación y Matriz de Red) | 1 | — |
| `multiplicador_formula_salud` | `salud()` + `reconciliarVida` | 1 | 1 | 1 | — |

### 4.2 CAPAS NUEVAS, por piezas que desbloquean

1. **`atributo_por_pieza` (21 piezas).** La de más rendimiento: casi todas las operaciones dan +1 a un básico. El tipo existe; falta que el aumento lo emita y que `dotes.ts` lo cuente en requisitos (solo aumentos permanentes, no equipo ni activables).
2. **`reduce_penalizador_por_pieza` (7).** Neurogénesis, Matriz Ósea, Estabilización Autonómica, Foveo, Proyección, Neuroprótesis, Ojo. Estabilización Autonómica es casi gratis: `AjusteUmbrales` ya resta "N por tramo" (corrección del verificador).
3. **`alcance_por_aplicado` (5).** Mielinización, Neurogénesis, Prefrontal, Asa, Sincronización. Llave del resto de la rama cognitiva.
4. **`accion_general_extraccion` (3 bloques comunes).** Afecta a todos los implantes como regla general; bloqueada por falta de reglas (dificultad, método).
5. **`activable_estado_propio` (2).** Neuroprótesis y Proyección. Base de `activable_eleccion_al_activar` y `activable_disparado_por_coste`.
6. **`contador_usos_personaje` (2).** Mielinización y Neuroprótesis; convierte los `limite` DATO en límites reales.
7. **`inmunidad_estado` (2).** Ojo (ceguera) y Regeneración (hemorragia).
8. **Capas de una sola pieza:** `sobreesfuerzo_en_ventana_poder` (IRM, 25 efectos), `extremidad_atributos_propios` (Brazo, 15 efectos), `ventaja_fija_por_pieza` (Red Frontoparietal), `descuento_fatiga_en_tirada` (Mielinización), `activable_eleccion_al_activar` y `activable_disparado_por_coste` (Neuroprótesis), `no_apilamiento_mayor` (Ojo), `multiplicador_formula_salud` (Hipertrofia).

**Orden sugerido de construcción:** `atributo_por_pieza` → `alcance_por_aplicado` → `reduce_penalizador_por_pieza` → `activable_estado_propio` → resto según qué piezas se quieran primero en mesa.

---

## 5. Por pieza

En cada pieza: ejes de uso (acciones propias y casillas), ajustes por nivel cuando los hay, y la tabla de efectos agregada por terna. Los claims de rareza, coste y requisitos (`narrativo · ninguna · — · construido/pendiente`, destino `parametro`) se omiten de las tablas: van todos a su campo.

### 5.A Operaciones genéticas: rama cognitiva

**Mielinización Central** (Poco Habitual, 30 000, raíz)
- Ejes: ninguna acción propia. Uso limitado: 1/escena (DATO).

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #4 (C) | numerico · todas · suma_derivado · pendiente | efectos[0] | +1 Inteligencia (capa atributo) |
| #5 | texto · aplicado:perspicacia\|voluntad\|expresion · hueco · **bloqueado** | efectos[1] | Omitir 1 fatiga/escena; qué gasto se omite → pregunta. Campo nuevo `descuento_fatiga` |
| #6 | narrativo · ninguna · — · construido | efectos[1].texto | Apilamiento, viaja en el texto |

**Neurogénesis Hipocampal** (Poco Habitual, 45 000, req. Mielinización)

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #4 (C) | numerico · todas · suma_derivado · pendiente | efectos[0] | +1 Inteligencia |
| #5 | numerico · aplicado:P\|V\|E · hueco · pendiente | efectos[1] | −1 penalizador por fatiga en esos aplicados |
| #6 (C) | numerico · ninguna · — · pendiente | efectos[2] | coste_habilidad −1 (Biociencia, Cultura, Tecnociencia, mín. 1) |

**Estabilización Engramática** (Extraño, 45 000, req. Neurogénesis)

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #4 (C) | numerico · todas · suma_derivado · pendiente | efectos[0] | +1 Inteligencia "adicional" |
| #5 | narrativo · ninguna · — · construido | efectos[1] | Memoria imborrable (sabor) |
| #6 (C) | numerico · ninguna · — · pendiente | efectos[2] | coste_habilidad −1 a todas, mín. 1 |

**Red Frontoparietal** (Extraño, 30 000, req. Mielinización)
- Ejes: acción `aumentos_accion_combinada` · economía simple/estándar (la más compleja de las dos) · coste 1 fatiga · sin dado.

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #4 (C), #5 (C) | numerico · todas · suma_derivado · pendiente | efectos[0], [1] | +1 Inteligencia, +1 Carácter |
| #6 (C) | numerico · grupo:Iniciativa · hueco · pendiente | efectos[2] | Ventaja fija en las tres iniciativas (capa ventaja_fija_por_pieza) |
| #7 (C), #8 (C) | accion · aumentos_accion_combinada (nueva) · accion_equipo · pendiente | efectos[3].accion (+notas[0]) | Prueba mental + física en una acción |

**Prefrontal Aumentada** (Poco Habitual, 25 000, req. Mielinización)
- Ejes: casilla "Concentrarse" en tiradas de P/V/E → resuelve como compleja · ventaja · 1 fatiga. Excluye Asa.

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #4 (C) | numerico · todas · suma_derivado · pendiente | efectos[0] | +1 Percepción |
| #5 | texto · aplicado:P\|V\|E · eleccion_jugador · pendiente | efectos[1] | Economía → compleja (DATO) |
| #6, #7 | numerico · aplicado:P\|V\|E · eleccion_jugador · pendiente | efectos[2] (+coste.fatiga) | Ventaja, 1 fatiga (patrón Ojo Clínico) |
| #8 (C) | texto · aplicado:P\|V\|E · eleccion_jugador · pendiente | efectos[3] | Exclusión con Asa, nota de la casilla |

**Asa Estriatotalámica** (Poco Habitual, 15 000, req. Mielinización)
- Ejes: casilla "Simplificar" → compleja→estándar o estándar→simple · 1 fatiga. Excluye Conectividad y Prefrontal.

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #4 | texto · aplicado:P\|V\|E · eleccion_jugador · pendiente | efectos[0] | Economía DATO; `coste` en efecto economía = campo nuevo (C en el efecto) |
| #5 (C) | texto · aplicado:P\|V\|E · eleccion_jugador · pendiente | efectos[1] | Exclusión |

**Conectividad Callosa** (Extraño, 20 000, req. Prefrontal)
- Ejes: dos vías a la misma ventaja sobre **cualquier** acción simple/estándar:
  - Concentrarse → compleja · 1 fatiga.
  - Dos turnos en una acción compleja · coste **sin decir** (pregunta).

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #4 (C), #5 (C) | numerico · todas · eleccion_jugador · pendiente | efectos[0..1] | Ventaja + 1 fatiga; alcance `todas` (era grupo:Acciones) |
| #6 (C) | numerico · todas · eleccion_jugador · **bloqueado** | efectos[2..3] | Vía de dos turnos; ¿cuesta fatiga? |
| #7 (C) | texto · todas · nota_fija · pendiente | efectos[4] | Exclusión con Asa |

### 5.B Operaciones genéticas: rama sensorial

**Optimización Foveo-Sensorial** (Poco Habitual, 30 000, raíz)

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #4 (C) | numerico · todas · suma_derivado · pendiente | efectos[0] | +1 Percepción |
| #5 | numerico · grupoHabilidad:Ataques+combate_distancia · eleccion_jugador · **bloqueado** | efectos[1] → **pregunta** | +1 "por puntería" (alcance corregido desde familia:arma_fuego) |
| #6 | numerico · grupoHabilidad:Ataques+combate_distancia · eleccion_jugador · pendiente | efectos[2] | −1 cobertura = casilla +1 |
| #7 | numerico · alerta_activa · eleccion_jugador · pendiente | efectos[3] | −1 cobertura en percepción visual |

**Optimización Vestíbulo-Auditiva** (Extraño, 25 000, req. Foveo)

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #4 (C) | numerico · todas · suma_derivado · pendiente | efectos[0] | +1 Percepción |
| #5 (C) | numerico · salv_ceguera · eleccion_jugador · **bloqueado** | efectos[1] | +2 contra ceguera: no se sabe qué salvación |
| #5 (C, mitad) | numerico · salv_fortaleza · eleccion_jugador · pendiente | efectos[2] | +2 contra sordera |
| #6 | numerico · alerta_activa · eleccion_jugador · pendiente | efectos[3] | Ventaja en percepción auditiva |

**Consciencia Omnidireccional** (Muy Extraño, 30 000, req. Foveo + Prefrontal)
- Ejes: casilla de esquiva con ventaja · 1 fatiga.

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #4 (C) | numerico · todas · suma_derivado · pendiente | efectos[0] | +1 Percepción |
| #5 | texto · objetivo_tercero ataque_melee_<instancia> · nota_fija · pendiente | efectos[1] | No puede ser flanqueado (cuelga de defensa) |
| #6 | numerico · defensa · eleccion_jugador · pendiente | efectos[2] | Ventaja en esquiva, 1 fatiga |

### 5.C Operaciones genéticas: rama de Carácter

**Regulación Límbico-Prefrontal** (Poco Habitual, 30 000, raíz)

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #4 (C) | numerico · todas · suma_derivado · pendiente | efectos[0] | +1 Carácter |
| #5 | numerico · salv_voluntad · eleccion_jugador · pendiente | efectos[1..4] | +1 contra coerción/intimidación/manipulación/miedo; `noApila` interno |

**Proyección Neuro-Expresiva** (Extraño, 25 000, req. Regulación)
- Ejes: ventaja en Actitud con lenguaje, 1/escena · activable 1 fatiga, 1 hora: anula penalizadores sociales.

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #4 (C) | numerico · todas · suma_derivado · pendiente | efectos[0] | +1 Carácter |
| #5 | numerico · habilidad:actitud · eleccion_jugador · pendiente | efectos[1] | Ventaja, límite DATO |
| #6 | numerico · social · hueco · **bloqueado** | efectos[2] | Activable + reduce_penalizador; `de: 'cualquiera'` |

**Matriz de Red Predeterminada** (Muy Extraño, 35 000, req. Proyección)

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #4 (C) | numerico · todas · suma_derivado · pendiente | efectos[0] | +1 Carácter |
| #5 (C) | narrativo · ninguna · — · construido | efectos[1] | Sabor |
| #6 (C) | numerico · grupo:Salvaciones · eleccion_jugador · pendiente | efectos[2..4] | +2 contra dominación/sugestión/alteración (era salv_voluntad) |
| #7 | texto · salv_voluntad · nota_fija · pendiente | efectos[5] | Salvación extra al final de cada turno |
| #8 | numerico · habilidad:actitud · eleccion_jugador · pendiente | efectos[6] | Ventaja 1/escena |

### 5.D Operaciones genéticas: rama física

**Integridad Osteotendinosa** (Poco Habitual, 30 000, raíz)

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #4 (C), #5 (C) | numerico · todas · suma_derivado · pendiente | efectos[0..1] | +1 Fuerza, +1 Agilidad |
| #6 | numerico · bloquear_danio · suma_derivado · **bloqueado** | efectos[2] | Armadura natural 1 vs perforante/cortante: tipos que no existen |

**Matriz Ósea Adaptativa** (Poco Habitual, 40 000, raíz)

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #4 (C), #5 (C) | numerico · todas · suma_derivado · pendiente | efectos[0..1] | +1 Fuerza, +1 Aguante |
| #6 | numerico · acciones_fisicas_carga · hueco · **bloqueado** | efectos[2] | −1 penalizador de carga (carga sin mecanizar, §5.5) |
| #7 | numerico · bloquear_danio · suma_derivado · **bloqueado** | efectos[3] | Armadura vs contundente/impacto masivo |

**Hipertrofia Miofibrilar** (Poco Habitual, 40 000, req. Matriz Ósea + Integridad)

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #5 (C) | numerico · todas · suma_derivado · pendiente | efectos[0] | +1 Fuerza |
| #6 | numerico · derivado:vida · hueco · pendiente | efectos[1] | Vida = 8 + Fortaleza × 1,5 (redondeo: pregunta) |
| #7 (C) | texto · ficha · nota_fija · pendiente | efectos[2] | Sana no letal al doble (tiempo) |

**Sincronización Neuromotora Profunda** (Poco Habitual, 40 000, req. Integridad)
- Ejes: casilla "la tirada usa Potencia" · ventaja · 1 fatiga · sin límite escrito.

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #4 (C), #5 (C) | numerico · todas · suma_derivado · pendiente | efectos[0..1] | +1 Fuerza, +1 Agilidad |
| #6 (C) | numerico · todas · eleccion_jugador · pendiente | efectos[2] | Ventaja con condición Potencia (o alcance `aplicado:potencia`) |

**Hiperdensidad Propioceptiva** (Poco Habitual, 40 000, raíz)

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #4 (C) | numerico · todas · suma_derivado · pendiente | efectos[0] | +1 Agilidad |
| #5 | texto · defensa · nota_fija · pendiente | efectos[1] | 2.ª reacción por ronda, 1 fatiga (a mano) |

**Automatismo Bulboespinal** (Extraño, 40 000, req. Hiperdensidad + Integridad)

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #5 | numerico · todas · suma_derivado · pendiente | efectos[0] | +1 Agilidad |
| #6 | texto · ninguna · — · ad_hoc | efectos[1] | 2.ª reacción sin fatiga |
| #7 | texto · defensa · nota_fija · pendiente | efectos[2] | Sin −3 de Sorprendido |

**Bucle de Realimentación Motora** (Muy Extraño, 25 000, req. Automatismo)

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #4 | texto · ninguna · — · ad_hoc | efectos[0] | 3.ª reacción, 1 fatiga ("por turno" normalizado a "por ronda") |
| #5 | numerico · atletismo · eleccion_jugador · pendiente | efectos[1] | Ventaja en equilibrio contra derribo |

### 5.E Operaciones genéticas: rama de Aguante y regeneración

**Biogénesis Mitocondrial** (Poco Habitual, 30 000, raíz)
- Ejes: casillas de ventaja en salv_fortaleza (asfixia/toxinas/venenos) · 1 fatiga cada una.

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #4 | numerico · todas · suma_derivado · pendiente | efectos[0] | +1 Aguante |
| #5 (C) | texto · ninguna · — · ad_hoc | efectos[1] | Consumibles de fatiga ×2 (lugar ficha; ningún fármaco recupera fatiga) |
| #6 | numerico · salv_fortaleza · eleccion_jugador · pendiente | efectos[2..4] | Ventaja con 1 fatiga |
| #7 | texto · ninguna · — · ad_hoc | efectos[5] | Hipoxia ×2 |

**Angiogénesis Sistémica** (Extraño, 40 000, req. Matriz Ósea + Biogénesis)
- Ejes: `aumentos_cortar_hemorragia` (1 fatiga) · `aumentos_cortar_exanguinante` (2 fatiga) · economía sin decir.

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #5 | numerico · todas · suma_derivado · pendiente | efectos[0] | +1 Aguante |
| #6, #9, #10, #11 | texto · ninguna · — · ad_hoc | efectos[1], [4..6] | Hemorragia a la mitad; descansos |
| #7 | accion · aumentos_cortar_hemorragia · accion_equipo · pendiente | efectos[2].accion | |
| #8 | accion · aumentos_cortar_exanguinante · accion_equipo · pendiente | efectos[3].accion | |

**Resiliencia Homeostática** (Extraño, 40 000, req. Angiogénesis)

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #4 | numerico · todas · suma_derivado · pendiente | efectos[0] | +1 Aguante |
| #5 | numerico · salv_fortaleza · eleccion_jugador · pendiente | efectos[1..6] | Ventaja gratis contra 6 cosas; deja sin uso la de pago de Biogénesis |

**Regeneración Tisular Acelerada** (Extraño, 30 000, req. Angiogénesis)
- Ejes: `aumentos_eliminar_exanguinante` (1 fatiga), reemplaza la de 2 de Angiogénesis (`reemplazaAccion`).

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #4, #5, #6, #9, #10, #11 | texto · ninguna · — · ad_hoc | efectos[0..2], [5..7] | Regeneración por tiempo y condiciones |
| #7 (C) | habilitador · estado:hemorragia · hueco · **bloqueado** | efectos[3] | Inmunidad a hemorragia (capa inmunidad_estado) |
| #8 | accion · aumentos_eliminar_exanguinante · accion_equipo · pendiente | efectos[4].accion | Campo nuevo `reemplazaAccion` |

**Estabilización Autonómica** (Poco Habitual, 15 000, raíz)
- Ejes: `aumentos_sacudir_miedo` (simple o reacción, Asustado) · `aumentos_dominar_terror` (estándar, Aterrorizado → Asustado).

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #4 (C) | numerico · todas · hueco · **pendiente** | efectos[0] | −1 heridas y fatiga por tramo: `AjusteUmbrales` ya existe |
| #5 (C, aturdimiento) | numerico · salvacion_aturdimiento · eleccion_jugador · **bloqueado** | efectos[1] | ¿Fortaleza o Voluntad? |
| #5 (confusión) | numerico · salvacion_confusion · eleccion_jugador · **bloqueado** | efectos[2] | Salvación sin definir |
| #5 (shock) | numerico · salv_fortaleza · eleccion_jugador · pendiente | efectos[3] | +2 |
| #5 (miedo) | numerico · salv_voluntad · eleccion_jugador · pendiente | efectos[4] | +2 |
| #6, #7 | accion · aumentos_sacudir_miedo / dominar_terror · accion_equipo · pendiente | efectos[5..6] | |

**Introgresión Sensorial Heteróloga** (Extraño, 15 000/sentido, raíz, repetible con otra opción)
- Eje de compra: `eleccion` "sentido" (6 opciones).
- Acción propia (Percepción Electromagnética): `aumentos_barrido_electromagnetico` · compleja · Perspicacia + Exploración · dificultad sin dar · éxito 30 m; casilla +1 fatiga → 60 m.

| Opción | Claims | Terna | Nota |
|---|---|---|---|
| (estructura) | #4, #5 | narrativo · ninguna · — | `repetible`, `eleccion` |
| Visión Nocturna | #6 | narrativo · construido | Sabor |
| | #7, #8 | texto · alerta_activa · nota_fija · pendiente | Sin penalizador de oscuridad; límite a gran distancia |
| | #9 | numerico · salv_ceguera · eleccion_jugador · **bloqueado** | +2 ceguera por detonación |
| Visión Térmica | #10 | narrativo · construido | Sabor |
| | #11-#15 | texto · alerta_activa · nota_fija · pendiente | Sin penalizadores; rastro térmico y su duración |
| Percepción Electromagnética | #16, #19 | texto · alerta_activa · nota_fija · pendiente | Detección, 10 m pasivo |
| | #17 | narrativo · construido | Sin pulsos rastreables |
| | #18 | texto · ninguna · — · **bloqueado** → **pregunta** | Vulnerabilidad sin efecto |
| | #20 | accion · aumentos_barrido_electromagnetico · accion_equipo · pendiente | |
| | #21 | texto · aumentos_barrido_electromagnetico · eleccion_jugador · pendiente | Casilla con fatiga (campo nuevo `notas[].coste`) |
| Ultravioleta | #22 | texto · alerta_activa · nota_fija · pendiente | Qué ve |
| | #23, #24 | numerico · alerta_activa · eleccion_jugador · pendiente | +2 investigación de campo; +2 accesos ocultos |
| Detección Química | #25 | texto · alerta_activa · nota_fija · pendiente | 20 m en cerrado |
| | #26 (C) | texto · objetivo_tercero sigilo · nota_fija · pendiente | Contrarresta camuflaje químico |
| | #27 | numerico · alerta_activa · eleccion_jugador · pendiente | +2 a ≤4 m |
| Ecolocalización | #28, #30-#34 | texto · alerta_activa · nota_fija · pendiente | Sónar pasivo, alcances |
| | #29 | narrativo · construido | Imperceptible a escáneres |

### 5.F Implantes

#### Implante de Resonancia Métrica (IRM)

- **Ejes de uso:** no tiene acción propia. Se engancha a la ventana del poder: **nivel de poder empleado** → ¿salta sobreesfuerzo? → Voluntad contra base + nivel.
- **Ajustes por nivel poseído (del implante):**

| Nivel implante | Rareza / coste | Dispara | Exentos | Dificultad | Fracaso | Fracaso crítico | Exhausto: fracaso | Exhausto: crítico |
|---|---|---|---|---|---|---|---|---|
| 1 | Poco Habitual / 30 000 | Fatigado **o** poder ≥3 | — | 6 + N | 1 letal | Grave + aturdido | Grave | Muerte cerebral |
| 2 | Poco Habitual / 60 000 | Fatigado **o** poder ≥4 | — | 6 + N (hereda) | No letal | Grave + aturdido | Letal | Muerte cerebral |
| 3 | Extraño / 120 000 | Fatigado **o** poder ≥5 | Poder 1 | 6 + N (hereda) | No letal | Letal + aturdido | Letal | Grave |
| 4 | Muy Extraño / 240 000 | **Solo** fatigado y poder ≥3 | Poder ≤2; sin fatiga, nunca | **4 + N** | No letal | Elige: aturdido o letal | Letal | Grave + aturdido |

- **Matriz nivel poseído × nivel de poder empleado** (celda = dificultad de Voluntad; "—" = no salta). Supuestos: manda la exención sobre "fatigado" (pregunta abierta); exhausto implica fatigado.

| Implante \ Poder N | N=1 | N=2 | N=3 | N=4 | N=5 |
|---|---|---|---|---|---|
| **1, sin fatiga** | — | — | 9 | 10 | 11 |
| **1, fatigado** | 7 | 8 | 9 | 10 | 11 |
| **2, sin fatiga** | — | — | — | 10 | 11 |
| **2, fatigado** | 7 | 8 | 9 | 10 | 11 |
| **3, sin fatiga** | — | — | — | — | 11 |
| **3, fatigado** | — | 8 | 9 | 10 | 11 |
| **4, sin fatiga** | — | — | — | — | — |
| **4, fatigado** | — | — | 7 | 8 | 9 |

- No hay ModificadorFatiga propio del implante: el coste del poder no cambia; la fatiga solo decide si salta la tirada y qué tabla se usa.
- **Efectos:**

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #1-#4, #8, #18, #26, #27, #36 | narrativo · ninguna · — · construido | descripcion / textos de nivel | Sabor; #27 es frase copiada del nivel 2 (errata) |
| #7 (C) | habilitador · psionica · gate_instalacion · **bloqueado** | niveles[0] habilita_psionica | §11.3: no se conecta |
| #9-#15 | accion · aumentos_sobreesfuerzo_irm (nueva) · hueco · pendiente | niveles[0] sobreesfuerzo | (C) añadido `tirada: salv_voluntad` |
| #19-#23, #28-#33, #37-#43 | accion · aumentos_sobreesfuerzo_irm · hueco · pendiente | niveles[1..3] sobreesfuerzo + sustituye | (C) dificultad omitida en N2-N3 (hereda) |

#### Microprocesador Cuántico de Enlace (MQE)

- **Ejes de uso:** `aumentos_mqe_comunicar` (gratuita, sin dado, de uno en uno) · `aumentos_mqe_telemetria` (N2+, gratuita, hasta 4 dispositivos).
- **Ajustes por nivel poseído:**

| Nivel | Rareza / coste | Alcance | Capacidad | Dif. infiltración | Defensa | Contragolpe al intruso |
|---|---|---|---|---|---|---|
| 1 | Común / 1 500 | 50 m | 6 s de audio, una línea o GPS | 13 (+1/turno) | Colapso del canal | 1 letal + Voluntad 10 vs aturdido |
| 2 | Común / 3 000 | 200 m | igual | 14 | Encriptación rotativa (datos falsos) | igual |
| 3 | Poco Habitual / 6 000 | 500 m | Datos pesados | 15 | Cepo 3 turnos (escape Persp.+Tecno. 10, estándar) | Grave + Voluntad 10, cada turno en el cepo |
| 4 | Extraño / 12 000 | 2 km | Volcados militares en segundos | 16 | Fortaleza cuántica **o** cepo N3 | 2 grave + Voluntad 12 + hemorragia 1d10 **o** el del cepo |

- Sin eje de nivel empleado: no hay matriz de coste.

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #1-#6, #47 | narrativo · ninguna · — · construido | descripcion | Sabor |
| #9-#15 | accion · aumentos_mqe_comunicar (nueva) · accion_equipo · pendiente | niveles[0] acción + notas | |
| #24, #25 | accion · aumentos_mqe_telemetria · accion_equipo · pendiente | niveles[1] acción | |
| #26, #33-#36, #45, #48, #49 | texto · aumentos_mqe_comunicar · nota_fija · pendiente | sustituye / textos | Alcance, capacidad, repetidores, interferencias |
| #16-#20, #27-#29, #37, #38, #40, #42, #50-#54, #56, #57 | texto · objetivo_tercero intrusion_psionica_mqe · nota_fija · pendiente | defensa_intrusion | #17, #52, #57: campos nuevos sin ruta. (C) añadido `tiradaIntruso` |
| #21, #30, #41, #55 | texto · objetivo_tercero salv_voluntad · nota_fija · pendiente | contragolpe | Salvación del intruso |
| #39 | texto · objetivo_tercero escapar_cepo_mqe · nota_fija · pendiente | — (campo nuevo `escape`) | |
| #46 | texto · objetivo_tercero tecnica · nota_fija · pendiente | niveles[3] firma digital | Confianza baja |

#### Brazo Biónico

- **Ejes de uso:** casilla "con el brazo" (capa extremidad) · `aumentos_montar_arma_brazo` (10 min, Perspicacia + Biociencia/Biónica dif. 8) · `aumentos_bloquear_brazo` (N2+, reacción).
- **Matriz nivel poseído × modelo** (Fuerza / Agilidad del brazo respecto al usuario; tope entre paréntesis):

| Nivel / modelo | Rareza / coste | Fuerza | Agilidad | Blindaje | Bloquea | Pelea letal |
|---|---|---|---|---|---|---|
| 1 | Común / 12 500 | +0 | −1 | 0 | No | No |
| 2 | Poco Habitual / 25 000 | +1 (5) | +0 | 3 | Sí | Sí |
| 3 Fuerte | Extraño / 50 000 | +2 (7) | +0 | 6 | Sí | Sí |
| 3 Ágil | Extraño / 50 000 | +1 (5) | +1 (5) | 3 | Sí | Sí |
| 4 Fuerte | Muy Extraño / 100 000 | +4 (10) | +0 | 8 | Sí | Sí |
| 4 Equilibrado | Muy Extraño / 100 000 | +2 (7) | +2 (6) | 6 | Sí | Sí |
| 4 Ágil | Muy Extraño / 100 000 | +1 (5) | +3 (8) | 3 | Sí | Sí |

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #1, #4, #9, #25, #29, #33 | narrativo · ninguna · — · construido | descripcion / estructura | Variantes y arma integrada |
| #5-#8, #18, #19, #26, #27, #30, #34, #35, #37, #38, #40, #41 | numerico · ataque_melee_<instancia> · hueco · **bloqueado** | extremidad.* | Capa extremidad_atributos_propios |
| #10 | texto · ataque_melee_<instancia> · nota_fija · **bloqueado** | niveles[0] economía | Desenfundado gratuito; (C) alcance `arma_incorporada` marcado capa nueva |
| #11 | texto · objetivo_tercero desarmar · nota_fija · **bloqueado** | niveles[0] | No puede ser desarmado |
| #12-#15 (C) | accion · aumentos_montar_arma_brazo · accion_equipo · pendiente | niveles[0] acción | |
| #20, #28, #36, #39, #42 | numerico · bloquear_danio · suma_derivado · **bloqueado** | blindaje | (C) bloqueoPor explícito |
| #21 | accion · aumentos_bloquear_brazo · accion_equipo · **bloqueado** | niveles[1] acción | (C) quitado el crítico inventado; resolución como supuesto |
| #22 | numerico · ataque_melee_<instancia> · eleccion_jugador · pendiente | niveles[1] categoria_danio | Pelea letal con casilla |

#### Ojo Biónico

- **Ejes de uso:** casilla "¿percepción visual?" en Buscar/percibir; bono fijo en ataques a distancia; casilla de cobertura.
- **Matriz nivel poseído:**

| Nivel | Rareza / coste | Percepción visual | Ataque a distancia | Ceguera | Cobertura | Visión |
|---|---|---|---|---|---|---|
| 1 | Poco Habitual / 16 000 | +1 | +1 | +2 salvación | — | Nocturna + térmica 500 m |
| 2 | Extraño / 32 000 | +2 | +1 | Inmune | −1 | igual |
| 3 | Muy Extraño / 64 000 | +3 | +2 | Inmune | −1 | + rayos X 10 m |
| 4 | Muy Extraño / 128 000 | +4 | +3 | Inmune | −2 | Multiespectro 50 m a través de paredes ligeras |

- No se apila con miras ni visores: vale el mayor.

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #1-#3, #9, #10, #14, #15, #19-#21 | narrativo · ninguna · — · construido | descripcion / metadatos | |
| #4, #11, #16, #22 | numerico · alerta_activa · eleccion_jugador · pendiente | bono percepción | |
| #5, #17, #23 | numerico · grupoHabilidad:Ataques+combate_distancia · siempre_activo · pendiente | bono distancia | |
| #6 (C) | numerico · salv_ceguera · eleccion_jugador · **bloqueado** | niveles[0] | (C) id unificado y condición "¿Es contra ceguera?" |
| #7 | numerico · ataque_fuego_<instancia> · hueco · **bloqueado** | noApila | Capa no_apilamiento_mayor |
| #8 | texto · alerta_activa · eleccion_jugador · pendiente | niveles[0] | Visión nocturna/térmica |
| #12, #24 (C) | habilitador · estado:ceguera · hueco · **bloqueado** | inmunidad | |
| #13, #26 | numerico · ataque a distancia / alerta_activa · eleccion_jugador · pendiente | reduce_penalizador cobertura | Confianza baja |
| #18, #25 | texto · alerta_activa · nota_fija · pendiente | rayos X / multiespectro | |

#### Neuroprótesis Simpática

- **Ejes de uso:**
  - `aumentos_activar_neuroprotesis`: gratuita en tu turno o reacción · 2 fatiga · 3 rondas.
  - `aumentos_accion_simple_adicional` (N3+): economía sin indicar (C) · 2 fatiga la primera vez, 3 tras usarla hasta descansar · 1/turno.
  - Disparo N4: pagar 3 por la acción adicional enciende el boost del turno (1/descanso).
- **Matriz nivel poseído × opciones** (coste efectivo):

| Nivel | Activar (2 fatiga, 3 rondas) | Acción simple adicional | Boost N4 |
|---|---|---|---|
| 1 | +1 Fue/Agi/Per; −1 penal. de estado; −1 salv. Fortaleza vs toxinas | — | — |
| 2 | +2 a Fue **o** Agi (elige al activar), el otro +1; +1 Per | — | — |
| 3 | igual que 2 + 2.ª reacción mientras está activa | 2 fatiga; luego 3 hasta descanso | — |
| 4 | igual que 3 | 2 fatiga; luego 3 | Al pagar 3: ese turno +2 Fue/Agi/Per y sin penal. de heridas/fatiga; 1/descanso |

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #1-#3, #9, #10, #12, #13, #17, #18 | narrativo · ninguna · — · construido/pendiente | descripcion / metadatos | |
| #4 | accion · aumentos_activar_neuroprotesis · accion_equipo · pendiente | niveles[0].efectos[0] | |
| #5 (C) | numerico · atributo:fuerza / agilidad / percepcion · hueco · **bloqueado** | activable.efectos[0..2] | (C) un motor por atributo |
| #6 | numerico · todas · hueco · **bloqueado** | activable.efectos[3] | |
| #7 | numerico · salv_fortaleza · eleccion_jugador · pendiente | activable.efectos[4] | −1, construible hoy |
| #8, #14 | texto · aumentos_activar_neuroprotesis · nota_fija · pendiente | duración / 2.ª reacción | |
| #11 (C) | numerico · atributo:fuerza\|agilidad · hueco · **bloqueado** | niveles[1] | (C) motor añadido; campo nuevo `activable.eleccion` |
| #15 (C) | accion · aumentos_accion_simple_adicional · accion_equipo · pendiente | niveles[2] acción | |
| #16, #21 | texto · aumentos_accion_simple_adicional · nota_fija · pendiente | notas / límite | Campo nuevo `costeTrasUso` |
| #19 (C), #20 | numerico · atributo:* / todas · hueco · **bloqueado** | niveles[3] activable | `disparadoPor` |

#### Enjambre Nanobot

- **Ejes de uso:** `sanar_letal` (1 fatiga) · `sanar_grave` (5 fatiga en ≥5 turnos) · `densificar` (reacción, 1 fatiga, +3 blindaje a un golpe) · `tempestad_nanobotica` (N4, estándar, 2 fatiga, Reflejos + Tecnociencia, 1 grave, melee).

| Nivel | Rareza / coste | Añade |
|---|---|---|
| 1 | Poco Habitual / 25 000 | +3 a fármacos y medicina sobre uno mismo (y para quien te cura) |
| 2 | Extraño / 50 000 | Regeneración pasiva (sin fatiga) + acciones de sanar |
| 3 | Muy Extraño / 100 000 | +4 Fortaleza vs toxinas/venenos/enfermedad; Densificar; +3 vs aturdimiento del golpe densificado |
| 4 | Muy Extraño / 200 000 | Regeneración al doble y también fatigado; Tempestad Nanobótica |

| Claims | Terna | Ruta | Nota |
|---|---|---|---|
| #1-#3, #6, #7, #14-#16, #20-#22 | narrativo · ninguna · — | descripcion / metadatos | |
| #4 | numerico · grupo:Fármacos y medicina · eleccion_jugador · pendiente | niveles[0].efectos[0..1] | |
| #5 | texto · objetivo_tercero medicina · nota_fija · pendiente | niveles[0].efectos[2] | |
| #8-#10, #13 (C) | texto · ficha · nota_fija · pendiente | niveles[1].efectos[0..2] | (C) un motor por texto |
| #11, #12 | accion · aumentos_enjambre_sanar_* · accion_equipo · pendiente | niveles[1] acciones | |
| #17, #19 | numerico · salv_fortaleza · eleccion_jugador · pendiente | niveles[2] bonos | |
| #18 | accion · aumentos_enjambre_densificar · accion_equipo · pendiente | niveles[2] acción | |
| #23, #24 (C) | texto · ficha · nota_fija · pendiente | sustituye / texto N4 | |
| #25, #27, #28 | accion · aumentos_tempestad_nanobotica · accion_equipo · pendiente | niveles[3] acción | |
| #26, #30 | texto · aumentos_tempestad_nanobotica · nota_fija · pendiente | notas | |
| #29 | texto · objetivo_tercero blindaje_del_objetivo · nota_fija · **bloqueado** | danio.efectoBlindaje | Frase rota |

#### Reglas comunes de los implantes

| Claims | Terna | Nota |
|---|---|---|
| implantes_1/3 #1 | narrativo · construido | Encabezado |
| implantes_1 #2, implantes_2 #1, implantes_3 #2 | narrativo · → `Implante.sabotaje` | Flag; sin efecto ni medio definidos |
| implantes_1 #3 #4, implantes_2 #2 #3, implantes_3 #3 #4 | accion/texto · aumentos_extraer_implante · hueco/nota_fija · **bloqueado** | (C) modelada como `CatalogoAumentos.extraccion` |

---

## 6. Textos agrupados por `porque`

| `porque` | Qué lo explica | Ejemplos |
|---|---|---|
| **turno** (economía de acciones y reacciones, la app no las cuenta) | Reacciones extra, exclusiones de uso, salvación extra al final del turno | Hiperdensidad, Automatismo, Bucle, Neuroprótesis N3 (2.ª reacción), Prefrontal/Asa/Conectividad (exclusiones), Matriz de Red (repetir salvación), Mielinización (1/escena), Neuroprótesis N1/N4 |
| **tiempo** (la app no lleva el paso del tiempo) | Regeneración, descansos, duraciones | Hipertrofia, Biogénesis (consumibles, hipoxia), Angiogénesis (hemorragia, descansos), Regeneración (7 textos), Enjambre N2/N4, Introgresión (rastro térmico) |
| **tercero** (la tirada es de otro) | Flanqueo, desarme, camuflaje químico, medicina ajena, firma digital | Consciencia, Brazo N1, Introgresión química, Enjambre N1, MQE N4 |
| **tablero** (distancias y alcances) | Metros, radios | Introgresión (nocturna, química, ecolocalización, electromagnética 10 m), Ojo N3/N4 |
| **sin_regla** (no hay regla base que modificar) | Oscuridad, interferencias, vulnerabilidad EM | Introgresión, Ojo N1, MQE N3 |
| **narrativo** (sabor) | Descripciones y frases sin número | Engramática, Matriz de Red, Introgresión, IRM, MQE |

---

## 7. Susceptible a Shock (`electronico`)

| Pieza | N1 | N2 | N3 | N4 | Nota |
|---|---|---|---|---|---|
| IRM | ✓ | ✓ | ✓ | ✓ | Coprocesador cuántico |
| MQE | ✓ | ✓ | ✓ | ✓ | N3 "aísla frente a interferencias EM": ¿protege del Shock? (pregunta) |
| Brazo Biónico | ✓ | ✓ | ✓ | ✓ | Servomotores |
| Ojo Biónico | ✓ | ✓ | ✓ | ✓ | Optoelectrónico |
| Neuroprótesis Simpática | ✓ | ✓ | ✓ | ✓ | Biotecnológico con microestimuladores: **pregunta** si cuenta |
| Enjambre Nanobot | ✓ | ✓ | ✓ | ✓ | Micro-máquinas |
| Operaciones genéticas | — | | | | Orgánicas; no electrónicas |
| Introgresión, Percepción EM | — | | | | Orgánica, pero "vulnerable a descargas" (pregunta, sin efecto) |

Ningún implante cambia `electronico` entre niveles.

---

## 8. Errores de fidelidad del verificador y cómo se han aplicado

Todos aplicados en `docs/modelado-aumentos.json`.

### 8.1 Operaciones genéticas 1

| Pieza / ruta | Problema | Aplicado |
|---|---|---|
| Todos los `atributo` | `atributo:<x>` no es id real; `siempre_activo` es de Modificador `tirada` | `numerico · todas · suma_derivado · pendiente` (precedente `especies.ts`) en las 21 piezas |
| Neurogénesis / Engramática `coste_habilidad` | Iba a `narrativo` pendiente | `numerico · ninguna · — · pendiente` (patrón derivadoEstatico) |
| Red Frontoparietal motor[2] | Ventaja solo a `iniciativa` y con siempre_activo | `grupo:Iniciativa · hueco · pendiente` |
| Red Frontoparietal motor[3] | `accion_sin_equipo` | `accion_equipo` |
| Prefrontal / Asa / Mielinización / Neurogénesis | `aplicado:...` fuera de la gramática de Alcance | Se mantiene, declarado `_campoNuevo` (capa `alcance_por_aplicado`) |
| Asa efectos[0] | `_coste` inventado | `coste: { fatiga: 1 }` con `_campoNuevo` |
| Prefrontal motor[3], Asa motor[1] | Exclusión condicionada marcada `nota_fija` | `eleccion_jugador` |
| Foveo alcances | `familia:arma_fuego` deja fuera el pesado | `habilidad:combate_distancia` / `grupoHabilidad:Ataques+combate_distancia` |
| Foveo motor[1] | Bloqueado sin `bloqueoPor` | `bloqueoPor` con la pregunta de "puntería" |
| Vestíbulo motor[1..2] | Ceguera pendiente; sordera a id inexistente | Ceguera `salv_ceguera` bloqueado; sordera `salv_fortaleza` pendiente |

### 8.2 Operaciones genéticas 2

| Pieza / ruta | Problema | Aplicado |
|---|---|---|
| Conectividad Callosa alcances | `grupo:Acciones` deja fuera ataques e iniciativa | `todas` en efectos y motor |
| Conectividad efectos[2].coste | Coste inventado en la vía de dos turnos | Quitado; motor bloqueado por pregunta |
| Matriz de Red motor[2..4] | Limitado a `salv_voluntad` | `grupo:Salvaciones` |
| Sincronización | `aplicado:potencia` no existe | `todas` + condición "la tirada usa Potencia"; `_campoNuevo` alternativo |
| Rama 2: `hueco` sin frase | Convención rota | Frase de hueco en todos (o cambiados a `suma_derivado` por la corrección de atributos) |
| Hipertrofia motor[2] | Texto con afecta ninguna | `texto · ficha · nota_fija · pendiente` |
| Matriz de Red motor[1] | Narrativo pendiente | `construido` |

### 8.3 Operaciones genéticas 3

| Pieza / ruta | Problema | Aplicado |
|---|---|---|
| Estabilización Autonómica motor[0] | Bloqueado por "capa nueva" cuando `AjusteUmbrales` ya existe | `pendiente`, hueco "AjusteUmbrales solo lo alimenta la especie" |
| Estabilización Autonómica aturdimiento | "La fuente lo dice" falso | `salvacion_aturdimiento` bloqueado (¿Fortaleza o Voluntad?) |
| Biogénesis motor[1] | Nota en `farmaco_<id>` sin fármacos que recuperen fatiga | Texto en ficha, `ad_hoc` |
| Regeneración motor[3] | Inmunidad como texto bloqueado | `habilitador · estado:hemorragia · hueco · bloqueado` |
| Introgresión camuflaje químico | `porque: tercero` pero motor sobre alerta_activa | `objetivo_tercero sigilo`, colgado de alerta_activa |

### 8.4 Implantes

| Pieza / ruta | Problema | Aplicado |
|---|---|---|
| IRM sobreesfuerzo | Se perdía que es de Voluntad | `tirada: "salv_voluntad"` en N1 (heredado) |
| IRM N2/N3 dificultad | String "hereda del nivel 1" | Omitida (la herencia la aplica la acumulación) |
| IRM habilita_psionica | Narrativo bloqueado | `habilitador · psionica · gate_instalacion · bloqueado` |
| MQE defensa_intrusion | Faltaba la prueba del intruso cada turno | `tiradaIntruso` en N1 (heredado) |
| Ojo ceguera (N1, N2, N4) | Ids marcadores distintos | `salv_ceguera` en toda el área |
| Ojo N1 efectos[2] | Condición null con motor de casilla | Condición "¿Es contra ceguera?" |
| Brazo `arma_incorporada` | Alcance inválido | Marcado `_capaNueva` |
| Brazo bloquear | Crítico y resolución inventados | Crítico quitado; resolución con `_supuesto` |
| Brazo blindaje | Bloqueado sin `bloqueoPor` | `bloqueoPor` con la pregunta |
| Extracción común | No modelada | `CatalogoAumentos.extraccion`, bloqueada |
| Neuroprótesis atributos (N1, N4) | Tres atributos en un motor; mecanismo null con hueco | Un motor por atributo, `hueco` |
| Neuroprótesis N3 economía | "gratuita" inventada | `{ tiempo: "sin indicar" }` |
| Neuroprótesis N2 | Sin motor para la elección al activar | Motor añadido, bloqueado |
| Enjambre N2/N4 regeneración | Tres textos en un motor bloqueado | Un motor por texto, `ficha · nota_fija · pendiente` |

---

## 9. Preguntas para el diseñador

Deduplicadas. Las que se repetían en varias piezas están en "Transversales".

### 9.1 Rama cognitiva

- **Mielinización:** ¿qué fatiga se omite 1/escena: el +1 genérico (§7, solo ataque/defensa/salvación) o el coste de capacidades (Prefrontal, Asa, Red)? ¿"Combinar con el gasto de otros aumentos" = el punto gratis paga el coste de otro aumento?
- **Neurogénesis:** ¿"−1 a penalizadores por fatiga" es un tramo menos (como el Siervo, §14.8) o solo el −N sin la media velocidad?
- **Neurogénesis + Engramática:** ¿Biociencia/Cultura/Tecnociencia bajan 2 (mín. 1)? ¿Incluye especialidades y solo puntos comprados después?
- **Engramática:** ¿la memoria imborrable tiene efecto de reglas?
- **Red Frontoparietal:** ¿la prueba física combinada puede ser un ataque? ¿Hay límite de usos?
- **Prefrontal:** ¿Concentrarse con una acción simple la sube a compleja (dos saltos)? ¿Se acumula con otras ventajas o con el +1 por fatiga?
- **Asa:** ¿se puede simplificar dos pasos pagando 2? ¿Hay límite? ¿Vale para poderes con Voluntad?
- **Conectividad Callosa:** ¿la vía de dos turnos cuesta fatiga? ¿"De cualquier tipo" incluye ataques y defensas? ¿Sustituye a Prefrontal (no las dos en la misma tirada)?

### 9.2 Rama sensorial

- **Foveo:** ¿"por puntería" es tras Apuntar o cualquier disparo? ¿Incluye pesadas, arrojadizas y granadas? ¿La reducción de cobertura vale contra cobertura 5? ¿Y en alerta pasiva?
- **Vestíbulo:** ¿el +2 vale también en la tirada de Medicina para quitar ceguera/sordera? ¿La ventaja auditiva sube la alerta pasiva? ¿Rastrear por sonido es Exploración?
- **Consciencia Omnidireccional:** ¿la esquiva con dos dados es solo ventaja o una reacción extra que limpia penalizadores por atacantes? ¿Límite por ronda? ¿"No puede ser flanqueado" anula solo Táctica de Flanqueo?

### 9.3 Rama de Carácter

- **Regulación:** ¿"tiradas contra intimidación" es solo Voluntad o también la tirada social enfrentada? Si un efecto es miedo y coerción, ¿+1 o +2?
- **Proyección:** ¿qué es "cualquier penalizador en interacciones sociales" (¿heridas y fatiga?) y qué acción cuesta activarlo? ¿Se puede usar a la vez la ventaja de Proyección y la de Matriz de Red en la misma escena?
- **Matriz de Red:** ¿el +2 vale en Fortaleza cuando la alteración es química? ¿Se suma al +1 de Regulación? ¿La "repetición" de Actitud se decide antes o después de tirar?

### 9.4 Rama física

- **Integridad / Matriz Ósea:** ¿cómo se mapean perforante, cortante, contundente e "impacto masivo" a los tipos de daño de la app (¿subtipos del cinético?)? ¿Qué es "impacto masivo"?
- **Matriz Ósea:** ¿"−1 a penalizadores de carga" es 1 en total o un tramo menos? ¿Vale en los tramos doble y cuádruple?
- **Hipertrofia:** ¿redondeo de Fortaleza × 1,5? ¿Con Fortaleza negativa también multiplica? ¿Cuál es la velocidad base de curación natural?
- **Sincronización:** ¿se puede pagar 1 fatiga en cada tirada de Potencia sin tope?
- **Hiperdensidad:** ¿la 2.ª reacción se paga al usarla y vale para cualquier reacción?
- **Automatismo:** ¿cubre solo el −3 de Sorprendido o también Desprevenido?
- **Bucle:** ¿3.ª reacción por turno o por ronda? ¿El equilibrio es la Potencia + Atletismo de Derribado?

### 9.5 Rama de Aguante y regeneración

- **Biogénesis:** ¿cada comida da 4 de fatiga en vez de 2? ¿Cuenta en descansos breves? ¿"Hipoxia ×2" es solo los turnos antes de Asfixia? ¿Asfixia/toxinas/venenos siempre con Fortaleza?
- **Angiogénesis:** ¿qué acción cuesta cortar la hemorragia? ¿"Sana el doble" = 4 no letales? ¿Cuántas veces el intercambio 2 no letal → 1 letal? ¿Qué es la hemorragia exanguinante (no está en §7)?
- **Resiliencia:** ¿"efectos térmicos extremos" incluye la Llamarada (Reflejos)?
- **Regeneración:** el descanso corto no sana daño: ¿de dónde sale "2 letales en lugar de 1" (¿no letal?)? ¿Regenera letal sin asistencia médica (§7)? ¿Con Angiogénesis la exanguinante pasa a 1 de fatiga? ¿"Estado de fatiga" = umbral Fatigado?
- **Estabilización Autonómica:** ¿qué salvación resiste Confusión? ¿Y el aturdimiento (Fortaleza o Voluntad)? ¿"−1 a penalizadores acumulados" es por tramo o en total? ¿Librarse del miedo es automático?

### 9.6 Introgresión Sensorial Heteróloga

- ¿Dificultad y fracaso del barrido electromagnético a 30 m?
- ¿Qué efecto tiene la vulnerabilidad EM?
- ¿El +2 de investigación de campo vale en toda Investigación?
- ¿El +2 químico a 4 m sube la alerta pasiva?
- ¿Cada sentido nuevo cuesta otros 15 000?

### 9.7 IRM

- ¿"Activar el implante" = usar cualquier poder?
- ¿Cada nivel sustituye el sobreesfuerzo anterior aunque no diga "en lugar de"?
- ¿"Fallo" (N2-N4) = "Fracaso"?
- ¿N2 y N3 siguen en Voluntad 6 + N?
- N3: ¿la frase copiada del N2 es errata o falta texto?
- N3: fatigado con poder de nivel 1, ¿salta? (supuesto: manda la exención)
- N4: ¿"no estar en fatiga" = no estar Fatigado (<25 %)?
- Exhausto: ¿sobreesfuerzo además de la sobrecarga o en su lugar? (supuesto: las dos, sobrecarga primero)
- ¿Cuánto daño letal en el crítico N4 (¿1?)?
- En poderes sin nivel elegible, ¿nivel empleado = nivel poseído (§10.6)?

### 9.8 MQE

- ¿Cada nivel sustituye al anterior? ¿Se mantiene el +1 de dificultad por turno en N2-N4?
- N2: ¿los 4 dispositivos levantan el "de uno en uno" de los mensajes?
- N4: ¿la defensa/contragolpe del cepo se elige al instalar o en cada intrusión? ¿Van juntos?
- ¿Qué tira el intruso contra la dificultad (Perspicacia + Informática, §10.5)? ¿El contragolpe salta al fallar o al detectar?
- ¿Cuánto es el "daño grave" del N3 (¿1?)?
- N4: ¿"inconsciente de inmediato" es efecto real o sabor?
- N4: ¿la firma digital oculta tiene efecto mecánico?
- N3: ¿el aislamiento EM protege del Shock (S73) o de inhibidores?

### 9.9 Brazo Biónico

- ¿El blindaje (3/6/8) protege a todo el personaje, solo al brazo o solo al bloquear? ¿Se apila con la armadura?
- ¿Bloquear con el brazo exige la dote Bloqueo? ¿Se tira Potencia + Combate Melee (Pelea) con la Fuerza del brazo?
- ¿El N1 puede bloquear o hacer daño letal? ¿El Modelo Fuerte conserva lo del N2? (supuesto: sí)
- ¿Fuerza/Agilidad del brazo afectan solo a golpes y bloqueos, o también a daño Fue+X, trepar, levantar? ¿Y armas a dos manos?
- Si el usuario supera el tope del modelo, ¿el brazo se queda en el tope?
- Arma incorporada: ¿cuenta para la carga? ¿Puede ser de fuego a una mano? ¿Qué pasa si se falla la dif. 8?

### 9.10 Ojo Biónico

- Confirmar errata: el primer "Nivel 3" es el nivel 2.
- ¿"No se apila con miras" vale para los dos bonos y la salvación? ¿Qué piezas cuentan como visión aumentada?
- Cobertura: ¿baja la total (5) a 4? ¿Vale contra escudos? ¿Qué es "termo-óptica"? ¿Qué significa "reduce en dos niveles por completo"?
- N4: ¿los 50 m valen para nocturna y térmica (500 m en N1)?
- ¿"Percepción visual" afecta a la alerta pasiva?
- ¿"Ataques a distancia" incluye granadas y arrojadizas? (supuesto: solo Combate a Distancia)

### 9.11 Neuroprótesis Simpática

- ¿"Tres turnos" = tres rondas?
- ¿"Penalizadores por estado" incluye umbrales de heridas y fatiga?
- ¿El +1 temporal puede pasar del techo de 6?
- N2: ¿el +2 se elige en cada activación? ¿El otro queda en +1?
- N3: ¿segunda reacción por turno o por ronda (§6: 1 por ronda)?
- N3: ¿la acción simple adicional exige el implante activo? ¿Qué economía tiene conseguirla?
- N4: ¿los 3 de fatiga son la reutilización de la acción del N3 o un pago aparte?
- N4: ¿el +2 se suma al del activable N1-2 o lo sustituye?

### 9.12 Enjambre Nanobot

- N1: ¿el +3 va a la tirada de aplicar el fármaco y a Tratar heridas? ¿Y fármacos sin tirada?
- N2: ¿qué acción cuesta sanar un letal? ¿Sin límite? ¿Los 5 de fatiga son 1 por turno durante 5 turnos?
- N3: ¿la salvación es siempre Fortaleza? ¿El +3 vs aturdimiento vale solo para el golpe densificado? ¿El blindaje +3 cubre cualquier tipo de daño?
- N4: ¿"1 grave cada 10 turnos" frente a "1 por hora" es errata?
- N4: ¿la frase rota quiere decir que destruye 1 punto de blindaje del objetivo al acertar?
- N4: ¿dificultad y resultado de sabotear objetos con Tempestad?

### 9.13 Reglas comunes de implantes

- **Extracción:** ¿dificultad y resultados por grado? ¿Qué implantes son extraíbles? ¿"Convertirse en recursos" = créditos, componentes o reinstalar? ¿Qué le pasa al cuerpo? ¿Qué métodos hay, cuánto dura cada uno y qué instrumental?
- **Sabotaje:** ¿cuáles no son susceptibles? ¿Por qué medios, con qué tirada y dificultad? ¿Qué efecto tiene (pierde el bono entero, como S73)?
- **Pregunta 20 (sigue abierta):** la extracción usa Biónica (Biociencia) y la Tempestad usa Tecnociencia. ¿Qué habilidad rige fabricar, reparar y extraer implantes?

### 9.14 Transversales

1. **Tope de atributos:** la rama cognitiva da hasta +4 a Inteligencia, la de Carácter +3, la física +4 a Fuerza. ¿Respetan el máximo de 4 en creación y 6 de techo? ¿Se apilan sin tope?
2. **Requisitos de dote:** ¿un +1 de un activable temporal (Neuroprótesis) cuenta como el de una operación, o solo los permanentes?
3. **"Pruebas que usen perspicacia, voluntad o expresión":** ¿incluye salvaciones de Voluntad y poderes? ¿Cuenta el aplicado efectivo aunque una casilla lo cambie (Brazo, Negociación Analítica)?
4. **Exclusiones de uso simultáneo** (Prefrontal/Asa/Conectividad): ¿por tirada o por turno?
5. **Salvación contra ceguera:** ¿con qué atributo? (Vestíbulo, Introgresión, Ojo, Visor, Axadren)
6. **Reducción de penalizadores por heridas/fatiga:** ¿se apila con Guerrero/Siervo y entre aumentos? ¿−1 por tramo (§14.8)? ¿Se construyen los penalizadores por carga como −N a tiradas?
7. **Contador de usos y descanso:** ¿la app pasa a llevar los usos por escena/descanso? "Descanso breve o largo" no existe en la app.
8. **Duraciones** que `DuracionEstado` no tiene: "una hora" y "este turno". ¿Una hora = escena?
9. **Sobreesfuerzo y psiónica:** con `habilita_psionica` sin conectar, ¿el sobreesfuerzo se tira para cualquier personaje con disciplinas que lleve el IRM? ¿Peaje neurológico y sobreesfuerzo se tiran los dos, y en qué orden?
10. **Arbitraje de los nuevos tipo 5** (límite agotado, inmunidad): ¿bloqueo duro o aviso blando?

**Recuento:** 88 entradas (78 por pieza y bloque común + 10 transversales); varias agrupan subpreguntas.

---

## 10. Avisos del proceso

- **Lotes caídos:** ninguno (6/6).
- **Efectos sin veredicto:** ninguno.
- **Incoherencias normalizadas por el workflow:** ninguna reportada.
- **Normalizaciones aplicadas al redactar:**
  - Rarezas "Extraña"/"Muy Extraña" → "Extraño"/"Muy Extraño".
  - Ojo Biónico: bloque "Nivel 3 (sic)" tomado como nivel 2.
  - Bucle: "por turno" → "por ronda" (con pregunta).
  - Las piezas de las ramas 1 y 3 se modelaron con el patrón corregido de `atributo` aunque el workflow solo listó en la capa las de la rama 2: la capa `atributo_por_pieza` cubre en realidad 21 piezas.
  - Extracción: las tres propuestas (`CatalogoAumentos.extraccion`, `Implante.extraccion`) se unificaron en una sola regla en la raíz del JSON.
- **Estado de `motor` en el borrador:** las operaciones tienen un motor por efecto; en implantes los motores se agrupan por efecto del nivel, no por claim.
