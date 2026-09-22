# Barrido capa-1 — armaduras, mejoras estándar, subsistemas, armamento pesado, granadas

Aplicación de la checklist de `docs/motor.md` (¿a qué acción afecta? ¿qué tipo de los
cinco es?) al tramo: `ARMADURAS` (10), `MEJORAS_ESTANDAR` (9), `SUBSISTEMAS` (5),
`ARMAMENTO_PESADO` (5), `MUNICION_GRANADA` (14). 43 piezas.

Cuando un efecto ya está identificado como hueco conocido (Hallazgos #1/#3/#5 de
`docs/equipo-efectos-especiales.md`, o preguntas 29/32/33 de `docs/sistema.md`), solo
se cita — no se re-analiza. Solo se desarrollan las dudas **nuevas**.

---

## Armaduras (10/10)

Estructura común a las 10: `blindaje`, `bonifMaxAgilidad`, `ranurasSubsistema`,
`topeExoesqueleto`/`topeMovilidadAerea`, y en 6 de ellas un `modificadores: [+1
salv_fortaleza, +1 salv_reflejos]`.

- **`blindaje`** → acción: ninguna todavía (derivado de absorción de daño que no
  existe). Tipo: numérico, pendiente. **Bloqueado por Hallazgo #5 / pregunta 29**
  (`sistema.md`) en las 10 sin excepción — una sola cita, no se repite por pieza.
- **`ranurasSubsistema`, `topeExoesqueleto`, `topeMovilidadAerea`** → acción:
  instalar un subsistema/mejora de movimiento (`validarInstalacion`,
  `lib/rules/equipo.ts`). Tipo: **5 (habilitador/deshabilitador), YA CONSTRUIDO, y es
  el primer precedente real de arbitraje `"duro"`** — sin armadura no hay ranura, sin
  ranura no se instala, punto, no hay aviso ni blando posible aquí. Vale la pena
  citarlo en la discusión pendiente de duro/blando del tipo 5: ya existe un caso
  100% duro en producción.
- **Traje Ultra Ligero, Ropa Inteligente, Armadura Ligera, Armadura Intermedia,
  Armadura Pesada** (las 5 con el `+1/+1`): tipo numérico, YA mecanizado, pero
  **duda ya conocida (❓ en `equipo-efectos-especiales.md` §Armaduras)**: el
  documento dice "contra congelación y llamarada", el código aplica a
  `salv_fortaleza` genérica entera (cubre también veneno/corrosión/fusión/shock/
  sordera/aturdimiento/enfermedad) — es la manifestación concreta del Hallazgo #3
  (salvaciones sin especificidad) para estas 5 piezas.
- **Ultra Ligero Avanzado, Armadura Ligera Avanzada, Armadura Intermedia Avanzada,
  Armadura Pesada Avanzada**: sin `modificadores` (correcto — el documento no repite
  el bono en las avanzadas, ya confirmado `🔕 IGNORAR` en el barrido anterior, no es
  un hueco). `descripcion`/`resumen`: narrativo puro.
- **Ropa Reforzada**: sin ranuras ni topes (los tres `null`/`0`) → tipo 5 con el
  mismo mecanismo de arriba, simplemente resuelto en "deshabilitado siempre" para
  esta pieza. Sin `modificadores`.

**Resultado: 0/10 al 100% resueltas** (las 10 arrastran el bloqueo de blindaje/H5),
pero salvo eso, todo lo demás de las 10 está o bien mecanizado, o bien es la misma
duda ya conocida (H3) repetida en 5 de ellas.

---

## Mejoras Estándar (9)

- **Soporte Vital** (3 niveles): Resistencia Térmica (+1 fortaleza, numérico, YA
  mecanizado, misma duda H3 que arriba) + Blindaje Ambiental (condicional a recibir
  daño en ambiente tóxico — **duda ya conocida, bloqueado por Hallazgo #3**,
  `equipo-efectos-especiales.md` ya lo tiene marcado ❓) + "Vulnerabilidad al Shock,
  apagón" — **bloqueado por pregunta 32** (shock/apagón sin definir), cita.
- **Compartimento Oculto** (2 niveles): sube la dificultad de **quien registra al
  portador** — **duda nueva, pero del mismo tipo estructural que la Cobertura del
  Camuflaje Trifásico** (ver Subsistemas más abajo): `Modificador`/`alcance` solo
  sabe aplicar bonos a la tirada de quien lo lleva puesto, nunca a la de un tercero.
  Nivel 2 apunta parcialmente a una tirada real (Escáner Detector) — ya marcado ❓ en
  el barrido anterior. Vale la pena, cuando se diseñe `alcance: objetivo` (si algún
  día se decide construirlo), tratar junto: Compartimento Oculto, Cobertura del
  Camuflaje, "devolver daño" de la Malla Plasmática — las tres son la misma pieza de
  motor.
- **Funda Automática** e **Inyector Hipodérmico** (2 niveles cada una): las dos
  cambian el **coste o tipo de una acción** (desenfundar gratis, inyectarse como
  acción simple en vez de compleja). **Duda nueva de verdad**: esto no encaja limpio
  en ninguno de los cinco tipos de `motor.md`. No es "modificador de acción" (no
  crea una acción nueva), no es numérico (no hay número), no es habilitador (no
  activa/desactiva nada, cambia el *coste* de algo que ya se puede hacer). El motor
  no tiene concepto de "coste de acción"/economía de turnos en absoluto — ni falta,
  hasta que exista, no hay dónde enganchar esto. Se queda como sexto caso sin encajar,
  a discutir, no forzado en ninguno de los cinco. Inyector nivel 2 además "susceptible
  a shock" — bloqueado por pregunta 32, cita.
- **Mejora Ignífuga** (2 niveles): usar blindaje total contra fuego / fuego pasa a
  letal — **bloqueado por Hallazgo #5**, cita.
- **Polímero Anticorrosivo** (2 niveles): `+1`/`+2` contra corrosión (numérico, YA
  mecanizado, misma duda H3); "daño corrosivo pasa a letal, ignora primer nivel" —
  **bloqueado por Hallazgo #5**, cita.
- **Tejido Conductor** (2 niveles): mismo patrón exacto que Anticorrosivo, mismas dos
  citas (H3 + H5).
- **Visor Nocturno** (2 niveles) y **Visor Térmico** (2 niveles): **100% resueltas**.
  Nivel con número (`salv_ceguera_destello +3`) → tipo 2, ya mecanizado, con
  `tiradaId` marcador específico (no el Fortaleza genérico — buen ejemplo de cómo SÍ
  se acota bien cuando el documento da un estado concreto). El texto de "ves a través
  del humo"/"detecta a través de humo, maleza" → tipo 3, ya construido (mecanismo del
  §8, primeros dos casos reales). Lo puramente narrativo (fogonazo ciega si el máster
  lo narra, rastro térmico con caducidad) → tipo 4, correctamente sin mecanizar.

**Resultado: 2/9 al 100% resueltas** (los dos visores). Las otras 7 arrastran alguna
duda — la mayoría ya conocida, dos genuinamente nuevas (Funda Automática/Inyector:
coste de acción sin encaje; Compartimento Oculto: tirada de tercero).

---

## Subsistemas (5) — la familia con más piezas sueltas

- **Camuflaje Trifásico**: numérico bloqueado **estructuralmente** (tirada de
  tercero, ya documentado — cero duda nueva aquí, cita). Texto informativo
  (Cobertura como nota en `sigilo`/`defensa`) ya **propuesto y aceptado** en el
  barrido anterior, pero **sin construir todavía** — no es una duda de análisis, es
  trabajo pendiente con la respuesta ya decidida.
- **Derivación Psiónica** (4 niveles): Estabilizador Neuronal, Blindaje
  Psico-Reactivo, Simbiosis Sináptica → numérico, correctamente apuntando a
  `tiradaId` marcadores que no existen aún porque la psiónica está bloqueada
  (Fase 5) — no es duda de tipo, es dependencia de fase, cita. Canal de Alta
  Resonancia (+10% alcance) → **bloqueado por pregunta 33** (propuesta de pasar a
  +N fijo), cita. **Conversión Psiónica** (N cargas → 1 punto de fatiga): esto **no
  modifica ninguna tirada** — es exactamente el "modificador de acción" que crea una
  **acción sin dado** que `motor.md` ya nombra como ejemplo. Confirmo la instancia:
  es acción sin dado + capa 2,5 de instancia (gasta la célula del propio subsistema,
  mismo patrón que RECURSOS de hoy, generalizado a "consumir para producir un efecto
  de personaje" en vez de "consumir para disparar").
- **Escudo Deflector**: absorción de daño — **bloqueado por Hallazgo #5**, cita
  (mismo motivo, es "otro contribuyente a la misma fórmula que a blindaje").
- **Malla Plasmática** (4 niveles) — la pieza más desglosada del catálogo:
  - Colchón de PG (10-16 según nivel, regenera N/turno, tiempo muerto si se
    destruye): **duda nueva de motor**, no de esta pieza en concreto — no es
    RECURSOS de instancia (no tiene `actual`/`max` en el sentido de recarga por
    compra) ni un derivado de personaje (PG/fatiga) — es un **buffer temporal
    ligado a "estar activo"**, con su propia mini-máquina de estados (destruido →
    tiempo de reactivación). Puede que sea un tercer sabor de "capa 2 y media" a
    nombrar cuando se diseñe el Hallazgo #5, o puede que sea distinto de RECURSOS
    del todo — se anota como caso límite, no se fuerza.
  - Crítico melee con plasma (shock/llamarada/fusión condicional): tipo 3 (toggle),
    **ya propuesto, sin construir** — mismo patrón que Visor Nocturno, no es duda.
  - Sacrificar 2 PG del colchón para sumar daño de plasma a un golpe melee: **acción
    sin dado**, mismo patrón que Conversión Psiónica — se declara antes de la tirada
    de ataque, no es la tirada en sí.
  - "Devuelve daño de plasma al atacante melee": mismo problema estructural que la
    Cobertura/Compartimento Oculto — tirada de un tercero, cita, no duda nueva.
  - "-8 sigilo al activarse, anula el camuflaje": numérico condicionado a que la
    Malla esté activa — **y activar la Malla en sí es otra acción sin dado** (gastas
    1 carga, no tiras nada). Tercera instancia del mismo patrón en esta sola pieza.
  - Nivel 2, detonación de pulso térmico en área: necesita una tirada de ataque
    propia que no existe — **amplía el Hallazgo #1** (igual que el Proyector de
    Pulso), cita, no re-abre.
- **Proyector de Pulso**: el subsistema entero es "modificador de acción" — sus
  cuatro modos (Pulso, Pulso Cargado, Barrido, Aguijón) necesitan su propia tirada de
  ataque, que **no existe hoy** (Hallazgo #1, cita, no re-abre — incluye el matiz ya
  conocido de Aguijón siendo melee-dentro-de-arma-a-distancia con "elige habilidad").
  Dos cosas nuevas detectadas en este barrido, no en el anterior:
  - **El consumo de cargas por modo no encaja en `gastoDelModo()` de hoy.** Ese
    helper (construido para RECURSOS esta misma sesión) solo entiende dos casos:
    1 bala (sin F. Auto) o cargador completo (con F. Auto). Aquí hay **cuatro modos,
    cada uno con su propio gasto fijo** (Pulso 1, Pulso Cargado 4, Barrido 5,
    Aguijón 1) — no binario. El día que se construya la tirada del Proyector de
    Pulso, el gasto por modo tiene que generalizarse más allá de las dos armas de
    fuego que lo usan hoy.
  - **"-5 al sigilo al disparar, con cualquier modo" (nivel 1) no es "siempre activo
    mientras se lleva puesto"** (mecanismo 4 de `modificadores-tiradas.md`) **ni
    "elegido por el jugador al tirar"** (mecanismo 1) — es una consecuencia
    automática de **haber ejecutado la acción de disparar ese turno**. Es un tercer
    momento de activación que ningún mecanismo actual cubre: ni permanente, ni
    a elección, sino "tras esta acción concreta". Vale la pena tenerlo en cuenta
    cuando se generalicen los mecanismos de entrega (`motor.md`, sección
    correspondiente) — puede que haga falta un quinto mecanismo, no solo el quinto
    tipo semántico.

**Resultado: 0/5 al 100% resueltas** — es, con diferencia, la familia con más piezas
sin encaje limpio. Ninguna de las dudas es "no sabemos qué hacer" — casi todas ya
tienen dirección decidida (acciones sin dado, Hallazgo #1/#5) — pero el volumen de
piezas de motor que faltan por construir aquí es real y mayor que en cualquier otra
familia.

---

## Armamento Pesado (5)

Estructura ya resuelta de raíz (comentario de cabecera del propio archivo,
`armamentoPesado.ts:1-29`): dificultad fija → `ajustesFijos` (tipo 2, mecanismo 2, YA
mecanizado), acción "Disparar con X" → tipo 1, YA generada (`combate.ts`,
`tiradaDeArmamentoPesado`). `mejorasAdmitidas` es informativo, **no** enganchado a
`validarInstalacion` — a diferencia de las armas de fuego, aquí el tipo 5 (habilitar
instalar una mejora) **no está construido**, decisión ya documentada en la cabecera
del archivo, no un descuido — si algún día se decide dar mejoras a armamento pesado,
es trabajo nuevo.

Las 5 (Lanzallamas Ligero, Lanzacohetes RT, Lanzagranadas, Lanzamisiles AT, Cañón de
Plasma) comparten el mismo patrón para `efectos` (`"Área NxN (Esquiva N) · Efecto X
(N)"`): **ya identificado y aceptado en el barrido anterior** (`equipo-efectos-
especiales.md` §Otras Armas a Distancia) como `✅ IMPLEMENTAR` — mostrar la dificultad
de esquiva y el efecto como nota informativa (tipo 3, es tirada de un tercero, no se
auto-resuelve). **Pendiente de construir, no es duda** — el mismo patrón que ya se usó
para "Crítico de X" en armas de fuego se aplicaría igual aquí.

`cargador` (número por arma): es RECURSOS de instancia en potencia, pero
`ArmaPesada` está **fuera de alcance a propósito** del RECURSOS construido hoy
(`docs/tareas.md`, decisión explícita de la sesión) — cita, no duda.

**Resultado: 5/5 resueltas analíticamente** (0 dudas, nuevas o conocidas) — todo lo
que falta aquí es "pendiente de construir con la respuesta ya decidida", no análisis
sin resolver.

---

## Munición — Granadas (14)

Estructura común: cada una genera su acción "Lanzar X" (tipo 1, YA generada,
`combate.ts` → `tiradaDeGranada`), `dificultadArrojada` → `ajustesFijos` (tipo 2, YA
mecanizado), `danio`/`categoriaDanio` → YA mecanizado. `areaEfecto` (texto tipo "Área
NxN (Esquiva N) · Efecto X (N)") → mismo caso que Armamento Pesado arriba: `✅
IMPLEMENTAR`, ya decidido, pendiente de construir, no duda.

- **13 de las 14 quedan resueltas sin más** (Casera, Fragmentación, Aturdidora,
  Cegadora, Humo, Gas Tóxico, Bomba Sónica, Incendiaria, Fragmentación Tóxica, Electro
  Granada, Corrosiva, Crio Granada, Granada de Plasma — esta última con el mismo
  patrón Shock+Llamarada/Crítico de Fusión que las armas de plasma, ya conocido).
- **Granada PEM — duda nueva**: "solo afecta a sistemas y sintéticos" es una
  condición sobre el **tipo del objetivo**, no sobre el propio portador ni sobre una
  elección del jugador al tirar. El motor no tiene ningún concepto de "tipo de
  objetivo" hoy (ni sintético, ni orgánico, ni nada) — no hay dónde enganchar esto
  todavía, y no es solo un problema de "tirada de tercero" (eso ya tiene un hueco
  nombrado), es un eje nuevo: *el efecto depende de qué ES el objetivo, no de quién
  tira*. Se queda marcada, sin forzar tipo.
- `pesoKg: null` en las 14: ya documentado (columna "I" sin definir en `EQUIP`, no se
  inventa valor) — cita, no duda.

**Resultado: 13/14 resueltas**, 1 duda nueva (PEM).

---

## Resumen numérico

| Familia | Piezas | 100% resueltas | Con al menos 1 duda |
|---|---|---|---|
| Armaduras | 10 | 0 | 10 (las 10 por blindaje/H5 — 5 de ellas también por H3) |
| Mejoras Estándar | 9 | 2 (Visor Nocturno, Visor Térmico) | 7 |
| Subsistemas | 5 | 0 | 5 |
| Armamento Pesado | 5 | 5 | 0 |
| Granadas | 14 | 13 | 1 (Granada PEM) |
| **Total** | **43** | **20** | **23** |

### Dudas ya conocidas, solo referenciadas (no re-analizadas)
- Hallazgo #5 / pregunta 29 (blindaje sin fórmula): las 10 armaduras + Mejora
  Ignífuga + Polímero Anticorrosivo + Tejido Conductor + Escudo Deflector.
- Hallazgo #3 (salvaciones sin especificidad): 5 armaduras con `+1/+1` + Soporte
  Vital + Polímero Anticorrosivo + Tejido Conductor.
- Hallazgo #1 (Proyector de Pulso/Malla Plasmática sin tirada de ataque propia).
- Pregunta 32 (shock/apagón sin definir): Soporte Vital + Inyector Hipodérmico.
- Pregunta 33 (Canal de Alta Resonancia, % → +N).
- Fase 5 bloqueada (poderes psiónicos): los tres `tiradaId` marcador de Derivación
  Psiónica.

### Dudas nuevas detectadas en este barrido (candidatas a discutir, no a construir ya)
1. **Funda Automática / Inyector Hipodérmico**: "cambia el coste de una acción" no
   encaja en ninguno de los cinco tipos — el motor no tiene concepto de coste/turno.
2. **Compartimento Oculto**: modificador a la tirada de un tercero (quien cachea) —
   mismo hueco estructural que Cobertura/Malla Plasmática, nueva instancia a agrupar.
3. **Proyector de Pulso — gasto por modo**: 4 modos con gasto fijo propio, no encaja
   en el `gastoDelModo()` binario de hoy (1 bala / cargador completo).
4. **Proyector de Pulso — "-5 sigilo al disparar"**: activación ligada a "ejecutar
   esta acción este turno", un tercer momento de activación sin mecanismo (ni
   siempre-activo, ni elegido al tirar).
5. **Malla Plasmática — colchón de PG**: posible tercer sabor de "capa 2 y media"
   (buffer temporal con vida propia, distinto de recurso de instancia y de recurso
   de personaje).
6. **Granada PEM**: condición sobre el tipo de objetivo ("sintético"), eje nuevo sin
   precedente en el motor.

Ninguna duda nueva bloquea el resto del barrido — todas son casos aislados, no
patrones que se repitan decenas de veces (a diferencia de H3/H5, que sí son
transversales).
