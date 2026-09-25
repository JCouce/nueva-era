# Checklist: motorMetadata vs. prosa — 2026-09-24

**Qué es esto:** el resultado de una auditoría AUTOMÁTICA (multi-agente, vía
`.claude/workflows/auditoria-motor-metadata.js`) que compara, pieza a pieza,
lo que promete la `descripcion`/`detalle` de cada pieza del catálogo contra lo
que de verdad hace su código (`modificadores`/`condiciones`/`motorMetadata`).
Es una checklist de trabajo, no una fuente de reglas — cuando todos los ítems
estén marcados, borra este archivo.

**No lo confundas con estos otros dos, que son cosas distintas:**
- `docs/equipo-efectos-especiales.md` — barrido MANUAL, verificado contra el
  PDF original (`docs/Equipamiento.pdf`) y con el diseñador, no solo contra el
  catálogo ya transcrito. Más lento, más fiable en casos ambiguos — si una
  pieza aparece en los dos, ese manda. Retómalo con
  `docs/prompt-equipo-efectos.md`.
- `docs/tareas.md` — donde viven las decisiones permanentes que salen de
  cerrar los ítems de aquí. Este archivo es el tablero de trabajo; `tareas.md`
  es la memoria.

(Existió un tercero, `docs/barrido-motor-2026-09-22/*.md` — clasificación
estructural de cuando se diseñó `MotorMetadata`, no verificación de
contenido. Ya cumplió su función: lo poco que no estaba duplicado en otro
sitio se rescató a `docs/tareas.md` el 2026-09-24 y se borró.)

Generado sobre el catálogo completo (182 items). Resultado crudo (con la
explicación larga de cada discrepancia, por si hace falta el detalle):
`scratchpad/auditoria-completa-resultado.json` — vive en el scratchpad de la
sesión, no en el repo; si ya no está, hay que re-lanzar el workflow.

**Ya cerrado, no listado aquí:** Puntero Láser, Silenciador, Sistema de
Retroceso nv2, y las 5 armas con penalizador de sigilo (`armasFuego.ts`) —
arregladas el 2026-09-24, ver `combate.ts`. Los 11 casos "objetivo_tercero sin
tirada de portador" (escudos + Camuflaje Trifásico + detección de
Compartimento Oculto) — resueltos por regla en `docs/motor.md`, no necesitan
código. Compartimento Oculto (tirada ad hoc) y Malla Plasmática (colchón) —
movidos a `docs/tareas.md` como diseño pendiente, no repetir aquí.

## Orden de construcción — empieza por aquí

**Si eres un agente nuevo retomando esto: sigue esta lista de arriba abajo,
tier por tier. No hace falta que leas `docs/equipo-efectos-especiales.md` ni
`docs/tareas.md` enteros — cada ítem te dice si necesita algo de ahí, y solo
entonces vas a mirarlo.** El resto del archivo (debajo) es la referencia
temática con el detalle completo de cada pieza; esta lista es el orden real.

**Tier 1 — código puro, cero decisiones pendientes:**
1. ~~Derribo (4 armas de fuego, sección de abajo)~~ — ✅ hecho 2026-09-25 (9 armas, más Plasma SC/AAA tras cerrar la ambigüedad)
2. Bayoneta (`docs/tareas.md`, ítem 6 — el bloqueo que tenía ya no existe)
3. Materiales Sofisticados/Avanzados (`docs/tareas.md`, ítem 5 — copia el patrón de la VTM)
4. Lanzagranadas, interpolar `areaEfecto` real (`docs/tareas.md`, ítem 6 — copia el patrón de `tiradaDeGranada`)

**Tier 2 — primero hace falta construir una pieza de arquitectura compartida
("acciones sin dado" — botón "Usar" sin tirar dado, ver `docs/tareas.md` ítem
4), luego se aplica a varios sitios a la vez:**
5. El tipo "acción sin dado" en sí (diseñar antes de tocar nada de abajo)
6. Movilidad Aérea — Máxima Potencia + el estado "¿está volando?" (`docs/tareas.md` ítem 4)
7. VTM nivel 4 (crítico parametrizable) + Estabilizadores Neurales (`docs/tareas.md` ítems 4-5)
8. Malla Plasmática — colchón, sacrificar puntos, activarse (`docs/tareas.md` ítem 4)
9. Radar nv4 — "Marcar objetivo" + texto fijo en el ataque (`docs/tareas.md` ítem 4)

**Tier 3 — `arma.uso` estructurado (9 piezas melee, `docs/tareas.md` ítem 4):**
10. Cerrar el nombre del campo (empuñadura/empleo/lo que se decida)
11. Aplicarlo a las 9 piezas de la sección de abajo

**Tier 4 — bloqueado por Murillo o por Fase 5, no tocar hasta respuesta**
(preguntas 32/34/35/36 de `docs/sistema.md`; Derivación Psiónica y Xovromium,
Fase 5): revisa la sección "Sueltos" de abajo antes de asumir que algo de ahí
está libre.

**Tier 5 — necesita diseño nuevo de verdad, no solo picar código** (mira
`docs/tareas.md` ítem 6 para el detalle de cada uno): Funda Automática/
Inyector Hipodérmico (coste de acción, sexto tipo sin encajar), Proyector de
Pulso (gasto por modo + el "-5 sigilo tras disparar"), Granada PEM (tipo de
objetivo), Escudos (blindaje/PG propio), Mangual (ignora cobertura), Kerzul
(retroceso entrópico), Armas Mecánicas (Derribo(N) necesita estado nuevo).

**Sydiasi**: deliberadamente la última de todas — `docs/tareas.md` ítem 3, dos
decisiones propias sin tomar.

**Antes de dar cualquiera de estos por bien construido**, comprueba si la
pieza también aparece en `docs/equipo-efectos-especiales.md` — si sí, ese
documento manda en caso de discrepancia (está verificado contra el PDF
original).

---

## Derribo (Knockdown) — ✅ IMPLEMENTADO 2026-09-25

**Cerrado, con más alcance que este checklist original**: no solo las 4 armas
listadas abajo — las **9** armas de fuego con "Efecto Derribo a Corta
Distancia (N)" en `especial` (Feritas, Azra, S.A.79, Gong, Asina, Graviter,
Zotrex, Matanza, Electro TK) llevan ahora `ArmaFuego.efectoDerribo` + nota
condicionada a Corta/Bocajarro (`condicionTramo()`, `combate.ts`). Detalle
completo y decisión sobre Plasma SC/Plasma AAA en
`docs/equipo-efectos-especiales.md` §Armas de fuego.

- [x] Azra (`escopeta_azra`) — Derribo en Corta Distancia y a Bocajarro
- [x] S.A.79 (`escopeta_sa79`) — Derribo (regla genérica + versión cuantificada)
- [x] ~~Plasma SG (`escopeta_plasma_sc`) — caso ambiguo~~ — **resuelto 2026-09-25 (el usuario): sí lleva Derribo, dificultad 9 (par de Gong).** Ya no es una pregunta abierta para Murillo.
- [x] Asina (`ametralladora_asina`) — Derribo a Bocajarro
- [x] Feritas, Gong, Graviter, Zotrex, Matanza, Electro TK — mismo fix, no estaban en la lista original de 4 pero tenían el mismo problema (`especial` prometía Derribo siempre, sin condicionar a tramo).
- [x] Plasma AAA (`ametralladora_plasma_aaa`) — mismo caso ambiguo que Plasma SC, mismo resuelto: dificultad 11 (par de Matanza).

## `arma.uso` (armas melee) es etiqueta muerta — el motor solo la lee para Sutil

**Decidido 2026-09-24** (detalle en `docs/tareas.md`): se estructura en
empuñadura (una mano/dos manos/variable con efecto propio) + arrojadiza. Sin
construir todavía.

- [ ] Maza de Armas (`corta_maza_armas`) — se empuña a una mano
- [ ] Bastón de Combate (`asta_baston_combate`) — tiene alcance (Alcance 4)
- [ ] Lanza Corta (`asta_lanza_corta`) — arrojadiza
- [ ] Lanza Larga (`asta_lanza_larga`) — a dos manos
- [ ] Hacha de Guerra (`asta_hacha_guerra`) — a dos manos
- [ ] Alabarda (`asta_alabarda`) — a dos manos
- [ ] Cuchillo de Combate (`espada_cuchillo_combate`) — a una mano + arrojadiza
- [ ] Ariete Percusivo (`mecanica_ariete_percusivo`) — tiene alcance
- [ ] Lanza Corta de Kerzul (`kerzul_lanza_corta`) — arrojadiza

## Movilidad Aérea — "Máxima potencia" no existe en código

**Decidido 2026-09-24:** es una "acción sin dado" (botón "Usar" → modal de
decisiones, sin tirar), la primera pieza de arquitectura nueva que pide
`docs/motor.md`. No implementar sin diseñar antes ese tipo — ver
`docs/tareas.md`.

- [ ] Nivel 1 (`movilidad_aerea#1`) — consume 1 carga/acción; Máxima potencia dobla desplazamiento; crítico +25 m
- [ ] Nivel 2 (`movilidad_aerea#2`) — Máxima potencia crítico +35 m
- [ ] Nivel 3 (`movilidad_aerea#3`) — consume 1 carga/3 acciones; Máxima potencia crítico +50 m
- [ ] Nivel 4 (`movilidad_aerea#4`) — Máxima potencia crítico +70 m (+80 con mejora de Velocidad)

## Fusiles de precisión "con Mira Telescópica integrada"

**Decidido 2026-09-24:** clonar `ajusteTramo` de Mira Telescópica nv1 en cada
fusil — pide añadir `ajusteTramo` a `ArmaFuego` (hoy solo lo tiene
`NivelModulo`). Pequeña extensión de tubería, no arquitectura nueva. Detalle
en `docs/tareas.md`.

- [ ] Telum (`fusil_precision_telum`) — Mira Telescópica nv1 integrada de serie
- [ ] Yivrem (`fusil_precision_yivrem`) — Mira Telescópica nv1 integrada

## Valija Táctica Médica (VTM) — necesita diseño (umbral de crítico + dificultad de síntesis)

**Nivel 4 decidido 2026-09-24:** `resolverTirada()` necesita aceptar un
margen de crítico distinto del fijo (`MARGEN_CRITICO = 6`) — detalle en
`docs/tareas.md`. Niveles 1 y 3 (dificultades de síntesis/diagnóstico) siguen
sin diseñar. Todo depende también de que exista la "acción sin dado" para
consumibles/uso de VTM (mismo bloqueo que Movilidad Aérea, arriba).

- [ ] Nivel 1 (`valija_tactica_medica#1`) — síntesis farmacéutica dif. base 7; +2 dif. por rango de rareza; revertir congelación (dif. 6)
- [ ] Nivel 3 (`valija_tactica_medica#3`) — diagnóstico profundo (1 min) da +2
- [ ] Nivel 4 (`valija_tactica_medica#4`) — cualquier éxito cuenta como crítico (estados complejos, estabilización, síntesis) — **esto es el mismo hueco que "umbral de crítico variable", ver si conviene resolverlo junto al resto de VTM**
- [ ] **Estabilizadores Neurales (`farmaco_estabilizadores_neurales`) — decidido 2026-09-24: se aborda junto con VTM**, no aparte (mismo bloqueo: acción sin dado + gasto de consumibles al usarlos, que tampoco existe hoy). Ver más abajo, ya no está en "Sueltos".

## Escudos — falta la acción de levantarlos (aparte del "objetivo_tercero" ya resuelto)

- [x] Rodela (`escudo_rodela`) / Escudo estándar (`escudo_estandar`) — **decidido 2026-09-24: sin código.** Es coste de acción, comunicación de mesa como el resto de "objetivo_tercero sin tirada de portador" — ya está en `descripcion`.

## Sueltos, cada uno con causa propia — no agrupar

- [ ] Sydiasi (`pistola_sydiasi`) — **decidido 2026-09-24: se arregla la última, tiene tarea propia en `docs/tareas.md`.** Ninguno de sus dos problemas es nuevo de hoy (ya estaban en `docs/tareas.md`/`docs/equipo-efectos-especiales.md`), los dos siguen con una decisión sin tomar — ver el detalle allí, no lo dupliques aquí.
- [ ] S.A.79 munición (`escopeta_sa79`) — contradicción interna, cifra a confirmar — **pregunta 34 en `docs/sistema.md`**
- [ ] Plaga (`fusil_precision_plaga`) — "mayor daño de plasma de su clase" — **pregunta 36 en `docs/sistema.md`**
- [ ] Tejido Conductor nv1 (`tejido_conductor#1`) — autoexclusión + sobra "+1 contra shock" — **no es pregunta nueva, es la 32 (shock/apagón) ya abierta en `docs/sistema.md`**
- [ ] Exoesqueleto nv1 (`exoesqueleto#1`) — ¿puede usarse sin armadura? — **pregunta 35 en `docs/sistema.md`**
- [x] Lanzallamas Ligero (`lanzallamas_ligero`) — **decidido 2026-09-24: sin código**, desenfundar/recargar es coste de acción, comunicación de mesa.
- [ ] Derivación Psiónica nv1 (`derivacion_psionica#1`) — **decidido 2026-09-24: aparcado dentro de Fase 5.** La psiónica en sí no está dada de alta todavía (bloqueada por el diseñador, `docs/tareas.md`) — normal que falten conceptos como "desorientación". No es una pregunta suelta, cae dentro de ese bloqueo general. Pa'lante cuando llegue Fase 5.
- [ ] Radar nv4 (`radar#4`) — **decidido 2026-09-24, mucho más simple de lo que parecía**: nada de estado persistente ni de leer cobertura/camuflaje por código. Es un ad hoc como Proyector de Pulso (acción custom, tira o no tira dados) para "Marcar objetivo", más un texto fijo (mismo patrón `nota_fija`/`Accion.efectos` de hoy) en las tiradas de ataque: "-X de dificultad contra cobertura al objetivo marcado" — el jugador elige la dificultad adecuada a mano, cero cálculo automático. Encaja en lo ya construido, no es arquitectura nueva.
- [ ] Disfraz Holográfico nv2 (`disfraz_holografico#2`) — **decidido 2026-09-24: los dos efectos son `narrativo`, sin construir nada.** "Reduce el rediseño a 1 min" y "mitiga penalizaciones por envergadura" (concepto que no existe en ningún otro sitio del sistema) se quedan como texto informativo — mismo patrón que la VTF. Solo falta declarar bien el `motorMetadata`, no hay código que escribir.
- [x] Lanzagranadas pesado (`lanzagranadas_pesado`) — **decidido 2026-09-24: sin código**, mismo criterio que Lanzallamas Ligero.
- [x] Soporte Vital nv2 (`soporte_vital#2`) — **decidido 2026-09-24: sin código**, duración en horas es comunicación de mesa.
- [ ] Polímero Anticorrosivo nv1 (`polimero_anticorrosivo#1`) — **no es pregunta nueva, es la 32 (shock/apagón) ya abierta en `docs/sistema.md`**
- [x] Visor Térmico nv1 (`visor_termico#1`) — **falso positivo del barrido, revisado 2026-09-24.** El código ya tiene un comentario explícito: "Mismo caso que Visor Nocturno n2 — el -3 depende de si lo mirado está fuera del gradiente resaltado, algo que el motor no sabe — se informa en Buscar/percibir, no se auto-aplica." `valorActivo: 0` es a propósito, no un hueco. No tocar.
