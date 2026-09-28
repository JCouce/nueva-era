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
2. ~~Bayoneta (`docs/tareas.md`, ítem 6 — el bloqueo que tenía ya no existe)~~ — ✅ hecho 2026-09-25 (hereda crítico Hemorragia y lleva Bloqueo, decidido por el usuario — la prosa solo confirmaba daño y dificultad)
3. ~~Materiales Sofisticados/Avanzados~~ — obsoleto, ya no aplica: el bono numérico se aparcó (decisión del usuario, 2026-09-25, "es un fallo de diseño") y quedó absorbido entero por la tarea 8 (Fabricar y Reparar, `docs/tareas.md`), construida y probada en vivo. No copia el patrón de la VTM, la sustituye.
4. ~~Lanzagranadas, interpolar `areaEfecto` real~~ — ✅ hecho 2026-09-27 (`docs/tareas.md`, ítem 6)

**Tier 2 — la arquitectura compartida ya está construida (2026-09-27,
`AccionDirecta`/`FilaUsar`/`UsarModal.tsx`, ver `docs/tareas.md`, "'Acciones sin
dado' — arquitectura construida + primer caso real"). Lo que queda de aquí es
enganchar cada pieza, y cada una arrastra su propio prerrequisito aparte de la
arquitectura en sí:**
5. ~~El tipo "acción sin dado" en sí~~ — ✅ hecho 2026-09-27 (`AccionDirecta`, `acciones.ts`)
6. ~~Movilidad Aérea — Máxima Potencia~~ — ✅ hecho 2026-09-27. **Corregido en conversación: Máxima Potencia no es una `AccionDirecta`** — "en crítico, +25 m" es el resultado de una tirada, así que es la misma tirada "Volar" jugada a lo grande (acción Compleja + 2 cargas en vez de Simple + 1), no una acción sin dado aparte. `accionesDeMovimiento()` (`movimiento.ts`) + célula nueva en RECURSOS para la familia `movimiento` (`MejoraMovimiento.celula`, solo poblada para esta pieza). **El estado "¿está volando?"** (penalizadores de combate) sigue sin construir, prerrequisito aparte.
7. ~~VTM nivel 4 (crítico parametrizable) + Estabilizadores Neurales~~ — ✅ hecho 2026-09-28 (VTM nv3/nv4 en `medicina.ts`; Estabilizadores con la Fase 2 de fármacos). Solo queda la síntesis farmacológica (VTM nv1), ver su sección abajo.
8. ~~Malla Plasmática — colchón, sacrificar puntos por daño melee, detonación de pulso térmico en área~~ — ✅ hecho 2026-09-27/28 (`docs/tareas.md`). "Devolver daño al atacante" se revisó y se cerró sin código (ya está en la descripción del catálogo, mismo criterio que otros "comunicación de mesa"). Quedan sin construir: -8 a sigilo al activarse y neutralizar el Camuflaje Trifásico (necesita un mecanismo pieza-sobre-otra-pieza que no existe todavía) — no era el alcance pedido.
9. ~~Radar nv4 — "Marcar objetivo"~~ — ✅ hecho 2026-09-27, piloto de la arquitectura de arriba (`accionesDirectasDeHerramientas()`, `herramientas.ts`). Sin `onUsar`: no muta la ficha, solo un texto fijo que el jugador aplica a mano.

**Tier 3 — ~~`arma.uso` estructurado~~ — ✅ hecho 2026-09-28:**
10. ~~Cerrar el nombre del campo~~ — `empleo`, alineado con `ArmaFuego.empleo`
11. ~~Aplicarlo a las piezas~~ — las 39 armas melee, más la tirada "Lanzar" de las 4 arrojadizas

**Tier 4 — bloqueado por Murillo o por Fase 5, no tocar hasta respuesta**
(preguntas 32/34/35/36 de `docs/sistema.md`; Derivación Psiónica y Xovromium,
Fase 5): revisa la sección "Sueltos" de abajo antes de asumir que algo de ahí
está libre.

**Tier 5 — necesita diseño nuevo de verdad, no solo picar código** (mira
`docs/tareas.md` ítem 6 para el detalle de cada uno): Funda Automática/
Inyector Hipodérmico (coste de acción, sexto tipo sin encajar), Proyector de
Pulso (gasto por modo + el "-5 sigilo tras disparar"), Granada PEM (tipo de
objetivo), Mangual (ignora cobertura), Kerzul (retroceso entrópico), Armas
Mecánicas (Derribo(N) necesita estado nuevo). Escudos: PG/durabilidad y
blindaje ya construidos (docs/tareas.md, tarea 8 y Hallazgo #5) — sale de
este tier.

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

## `arma.uso` (armas melee) es etiqueta muerta — ✅ hecho 2026-09-28

**Hecho 2026-09-28**: `uso: string[]` desaparece de `ArmaMelee` y pasa a
`empleo` ("una mano"/"dos manos", mismo nombre que `ArmaFuego`; Puñetazo = una
mano) + `sutil` + `arrojadiza` + `alcance`. "Variable" no hacía falta: ninguna
melee lo es. Las arrojadizas generan "Lanzar [arma]" (supuesto S20 de
`docs/sistema.md`). Detalle en `docs/tareas.md`.

- [x] Maza de Armas (`corta_maza_armas`) — se empuña a una mano
- [x] Bastón de Combate (`asta_baston_combate`) — tiene alcance (Alcance 4)
- [x] Lanza Corta (`asta_lanza_corta`) — arrojadiza
- [x] Lanza Larga (`asta_lanza_larga`) — a dos manos
- [x] Hacha de Guerra (`asta_hacha_guerra`) — a dos manos
- [x] Alabarda (`asta_alabarda`) — a dos manos
- [x] Cuchillo de Combate (`espada_cuchillo_combate`) — a una mano + arrojadiza
- [x] Ariete Percusivo (`mecanica_ariete_percusivo`) — tiene alcance
- [x] Lanza Corta de Kerzul (`kerzul_lanza_corta`) — arrojadiza

## Movilidad Aérea — "Máxima potencia" — ✅ hecho 2026-09-27

**Decisión de 2026-09-24 corregida en conversación**: no es una "acción sin dado" —
"en crítico, +25 m" es un resultado de tirada, así que Máxima Potencia es la propia
tirada "Volar" jugada a lo grande (Compleja + 2 cargas), no una acción aparte. Ver
`docs/tareas.md`, "Movilidad Aérea — 'Volar' + RECURSOS", para el detalle completo.

- [x] Nivel 1 (`movilidad_aerea#1`) — consume 1 carga/acción; Máxima potencia dobla desplazamiento; crítico +25 m
- [x] Nivel 2 (`movilidad_aerea#2`) — Máxima potencia crítico +35 m
- [x] Nivel 3 (`movilidad_aerea#3`) — consume 1 carga/3 acciones; Máxima potencia crítico +50 m
- [x] Nivel 4 (`movilidad_aerea#4`) — Máxima potencia crítico +70 m (+80 con mejora de Velocidad, sin mecanizar — se menciona en la nota)

## Fusiles de precisión "con Mira Telescópica integrada" — ✅ cerrado 2026-09-28

**La decisión de 2026-09-24 (clonar `ajusteTramo` en cada fusil) era un error**:
`docs/equipamiento.md:627` dice que la mira integrada está "ya contabilizada en
la dificultad de ataque y en las mejoras disponibles" — el +1 ya está en el −2
de los 8 fusiles y la ranura ya descontada de `mejorasAdmitidas`. Añadir
`ajusteTramo` lo habría contado dos veces. Lo que se construyó es el
guardarraíl: `ArmaFuego.miraIntegrada`, no se puede instalar otra mira nv1, y
una nv2/nv3 sustituye a la integrada (supuesto S21 de `docs/sistema.md`).
Detalle en `docs/tareas.md`.

## Valija Táctica Médica (VTM) — solo queda la síntesis farmacológica

**Actualizado 2026-09-28**: niveles 3 y 4 ya construidos (ver `docs/tareas.md`,
entradas "Diagnóstico profundo" y "Crítico parametrizable") — los dos como
`condiciones` con `alcance: {tiradaId: "medicina"}` en `medicina.ts`, sin
arquitectura nueva. El bloqueo de "Estabilizadores Neurales" que citaba esta
entrada (gasto de consumibles al usarlos) se cerró aparte, en la Fase 2 de
fármacos (`docs/prompt-gasto-recursos.md`) — ya no depende de la VTM.

- [x] Nivel 3 (`valija_tactica_medica#3`) — diagnóstico profundo (1 min) da +2 — ✅ hecho 2026-09-28
- [x] Nivel 4 (`valija_tactica_medica#4`) — cualquier éxito cuenta como crítico — ✅ hecho 2026-09-28, selector "Herida normal / Estado complejo..."
- [x] Estabilizadores Neurales (`farmaco_estabilizadores_neurales`) — ✅ hecho, Fase 2 de fármacos (gasto + tirada "Usar Estabilizadores Neurales")
- [ ] Nivel 1 (`valija_tactica_medica#1`) — síntesis farmacéutica dif. base 7; +2 dif. por rango de rareza — **pendiente, necesita diseño real** (no existe "Fabricar fármaco" en la app; ver `docs/tareas.md` para las preguntas abiertas: qué gasta, qué significa "gran pureza"). Revertir congelación (dif. 6) NO es un hueco — ya se hace con la tirada "medicina" existente y una dificultad tecleada a mano.

## Escudos — falta la acción de levantarlos (aparte del "objetivo_tercero" ya resuelto)

- [x] Rodela (`escudo_rodela`) / Escudo estándar (`escudo_estandar`) — **decidido 2026-09-24: sin código.** Es coste de acción, comunicación de mesa como el resto de "objetivo_tercero sin tirada de portador" — ya está en `descripcion`.
- [x] **Matiz 2026-09-27, no contradice lo de arriba**: aunque el coste de acción en sí sigue sin arbitrarse, "Levantar [escudo]" ganó su propia fila con `AccionDirecta` (los cinco escudos, `accionesDirectasDeAtaque()` en `combate.ts`) — un recordatorio con el coste/cobertura/blindaje que además deja rastro en Acciones recientes, en vez de vivir solo en `descripcion`. Ver `docs/tareas.md`.

## Sueltos, cada uno con causa propia — no agrupar

- [ ] Sydiasi (`pistola_sydiasi`) — **decidido 2026-09-24: se arregla la última, tiene tarea propia en `docs/tareas.md`.** Ninguno de sus dos problemas es nuevo de hoy (ya estaban en `docs/tareas.md`/`docs/equipo-efectos-especiales.md`), los dos siguen con una decisión sin tomar — ver el detalle allí, no lo dupliques aquí.
- [ ] S.A.79 munición (`escopeta_sa79`) — contradicción interna, cifra a confirmar — **pregunta 34 en `docs/sistema.md`**
- [ ] Plaga (`fusil_precision_plaga`) — "mayor daño de plasma de su clase" — **pregunta 36 en `docs/sistema.md`**
- [ ] Tejido Conductor nv1 (`tejido_conductor#1`) — autoexclusión + sobra "+1 contra shock" — **no es pregunta nueva, es la 32 (shock/apagón) ya abierta en `docs/sistema.md`**
- [ ] Exoesqueleto nv1 (`exoesqueleto#1`) — ¿puede usarse sin armadura? — **pregunta 35 en `docs/sistema.md`**
- [x] Lanzallamas Ligero (`lanzallamas_ligero`) — **decidido 2026-09-24: sin código**, desenfundar/recargar es coste de acción, comunicación de mesa.
- [ ] Derivación Psiónica nv1 (`derivacion_psionica#1`) — **decidido 2026-09-24: aparcado dentro de Fase 5.** La psiónica en sí no está dada de alta todavía (bloqueada por el diseñador, `docs/tareas.md`) — normal que falten conceptos como "desorientación". No es una pregunta suelta, cae dentro de ese bloqueo general. Pa'lante cuando llegue Fase 5.
- [x] Radar nv4 (`radar#4`) — ✅ hecho 2026-09-27. Sin estado persistente ni lectura de cobertura/camuflaje por código, como estaba decidido: "Marcar objetivo" es una `AccionDirecta` (`accionesDirectasDeHerramientas()`, `herramientas.ts`) con un texto fijo en la nota — el jugador aplica el número a mano en su siguiente ataque.
- [x] Disfraz Holográfico nv2 (`disfraz_holografico#2`) — ✅ declarado 2026-09-28 (dos entradas `narrativo` en su `motor`). **Decidido 2026-09-24: los dos efectos son `narrativo`, sin construir nada.** "Reduce el rediseño a 1 min" y "mitiga penalizaciones por envergadura" (concepto que no existe en ningún otro sitio del sistema) se quedan como texto informativo — mismo patrón que la VTF. Solo falta declarar bien el `motorMetadata`, no hay código que escribir.
- [x] Lanzagranadas pesado (`lanzagranadas_pesado`) — **decidido 2026-09-24: sin código**, mismo criterio que Lanzallamas Ligero.
- [x] Soporte Vital nv2 (`soporte_vital#2`) — **decidido 2026-09-24: sin código**, duración en horas es comunicación de mesa.
- [ ] Polímero Anticorrosivo nv1 (`polimero_anticorrosivo#1`) — **no es pregunta nueva, es la 32 (shock/apagón) ya abierta en `docs/sistema.md`**
- [x] Visor Térmico nv1 (`visor_termico#1`) — **falso positivo del barrido, revisado 2026-09-24.** El código ya tiene un comentario explícito: "Mismo caso que Visor Nocturno n2 — el -3 depende de si lo mirado está fuera del gradiente resaltado, algo que el motor no sabe — se informa en Buscar/percibir, no se auto-aplica." `valorActivo: 0` es a propósito, no un hueco. No tocar.
