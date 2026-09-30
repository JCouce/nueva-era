# Pruebas de psiónica

Recorrido manual, paso a paso, de todo lo construido de la psiónica. Cada flujo dice cómo
preparar el personaje y qué números deben salir.

| Flujos | Qué | Personaje |
|---|---|---|
| A | Compra de disciplinas y sección Psiónica en Acciones | Traslación 2 + Singularidad 2 |
| B, C, D | Singularidad: Impulso, Expansión, Convergencia | el de A |
| E, F, G | Comunes: gasto de fatiga y bloqueo, sobrecarga, XP en ficha aprobada | el de A |
| H1–H8 | Traslación (con NPC de nivel 6 en H6) | Traslación 3 |
| I | Contención (con NPC de nivel 6 en I.6) | Traslación 1 + Contención 2 |
| J | Resonancia, tanda 1 (con NPC de nivel 6 en J.6) | Resonancia 3 |
| K | Resonancia, tandas 2 y 3: Alerta, Vínculo y Buscar / percibir | Resonancia 3, y NPC con Resonancia 4 |
| L | Inducción: Comando, Reconfiguración, Modulación, Supresión y Estabilización | NPC con Resonancia 1 + Inducción 5 (6 en L.8, 4 en L.10-L.12) |
| M | Hipercognición: Sondeo, Retrocognición y Precognición | NPC con Resonancia 3 + Hipercognición 5 |
| N | Fuentes externas: Xovromium, Munición Supresora y Derivación Psiónica | el de A (Singularidad 2) + 1 Xovromium; Derivación nivel 3 en N.5-N.6 |

Los números esperados valen para un personaje recién creado sin tocar: atributos a 0,
sin especie, **8 de vida y 8 de fatiga**, y tirada de poder **−1** (Perspicacia +0,
Tecnociencia sin entrenar −1).

Marca `[x]` lo que pasa. Si algo falla, anota el texto exacto de lo que sale.

## Preparación

- Dev server en marcha y sesión de **máster** (en local: usuario `master`, contraseña `master`).
- Crea un personaje llamado `QA-PSIONICA` en `/characters`.
- En **Resumen**, pon la letra **A** en **Psiónica**. Son 18 puntos.
- Haz primero el flujo A, que deja el personaje con **Traslación 2 y Singularidad 2**: de
  ahí parten B–G. H e I traen su propia preparación.
- **Antes de cada flujo de acción**, pon la fatiga a 8/8 con el **+** de Fatiga en
  **Recursos**.

Al terminar, borra `QA-PSIONICA` desde `/characters` (y los NPC de prueba desde
`/master/npcs`).

---

## A. Compra de disciplinas (pestaña Psiónica)

- [ ] **A.1 Requisito que bloquea la compra.** Mira la fila de Singularidad.
  → Pone "requiere Traslación 2" en rojo y su **+** está apagado.
- [ ] **A.2 Coste N×3.** Sube Traslación a 2.
  → La cabecera marca `9 / 18 (letra A)`. El + de Singularidad se enciende.
- [ ] **A.3 Compra con requisito cumplido.** Sube Singularidad a 1.
  → Cabecera `6 / 18`.
- [ ] **A.4 No bajar lo que otra disciplina necesita.** Mira Traslación.
  → Pone "mínimo 2: otra disciplina la requiere" y su **−** está apagado.
- [ ] **A.5 Sin puntos no se sube.** Mira el + de Traslación.
  → Apagado: el siguiente nivel cuesta 9 y quedan 6.
- [ ] **A.6 Aviso de disciplina sin poderes.** Mira la tarjeta de Traslación.
  → Pone "Sus poderes aún no están en la app…".
- [ ] **A.7 Nivel 2.** Sube Singularidad a 2.
  → Cabecera `0 / 18`.
- [ ] **A.8 Se guarda.** Recarga la página y vuelve a Psiónica.
  → Traslación 2, Singularidad 2 y `0 / 18`.
- [ ] **A.9 Sección Psiónica en Acciones.** Abre Acciones.
  → Entre Ataques y Defensa sale **Psiónica**, con el subtítulo "Singularidad · nivel 2".
  Debajo, tres filas. Cada una lleva `PSP 0 + Tecnociencia -1` y el total `-1`, el mismo
  que el botón Tirar del modal, más este resumen:
  - Impulso: `Estándar · 2 fatiga · 40 m · daño 11`
  - Expansión: `Estándar · 2 fatiga · 40 m · daño 15`
  - Convergencia: `Estándar · 2 fatiga · 30 m · daño 7`

---

## B. Impulso

Pulsa **Usar** en Impulso.

- [ ] **B.1 Por defecto: nivel poseído, forma normal.** Mira el modal.
  → Título "Impulso (nivel 2)". Selector de nivel con **1** y **2**, marcado el 2. La
  ficha dice: Acción Estándar, Fatiga 2, Alcance 40 m, Objetivo Único, Empuje 8 m, Daño 11
  letal. Nota: "Ignora la cobertura ligera…". Fatiga tras usarlo `8 → 6`. Desglose total
  −1.
- [ ] **B.2 Poderoso.** Elige **Impulso Poderoso**.
  → Título "Impulso Poderoso (nivel 2)". Acción Compleja, Fatiga 3, Empuje 16 m, Daño
  13. La nota de la cobertura sigue, y aparece otra de "Impulso Poderoso: +1 de
  fatiga…".
- [ ] **B.3 Nivel 1 + Poderoso.** Elige nivel **1**.
  → Fatiga 2, Alcance 20 m, Daño 12. El empuje **sigue en 16 m**: en Poderoso va por el
  nivel poseído, no por el empleado.
- [ ] **B.4 Nivel 1 normal.** Elige **Impulso**.
  → Acción Estándar, Fatiga 1, Empuje 4 m, Daño 10.
- [ ] **B.5 Tirada y resultado.** Vuelve a nivel 2, forma Impulso Poderoso, dificultad
  **Muy fácil (2)**, y pulsa **Tirar** (repite con Tirar otra vez hasta sacar éxito).
  → Éxito: "Impacta: daño cinético letal; el objetivo tira Fortaleza + Atletismo contra
  el desplazamiento". Fracaso: "No impacta".
- [ ] **B.6 Daño.** Con éxito, pulsa **Tirar daño**.
  → "Daño: X letal (13 base + N por éxitos)", donde N es la mitad de los éxitos
  redondeando hacia abajo. No sale bloque de Efectos.
- [ ] **B.7 El objetivo.** Despliega **El objetivo**.
  → "Reacción defensiva (Defensa / esquiva)…" y "Si es golpeado: Fortaleza + Atletismo…
  · dificultad 11". Grados:
  - Éxito crítico: "No le afecta"
  - Éxito: "Se desplaza la mitad (8 m) hacia atrás"
  - Fracaso: "Se desplaza 16 m hacia atrás y cae derribado"
  - Fracaso crítico: 16 m, derribado y aturdido 1 turno
- [ ] **B.8 Sin daño al fallar.** Cierra, reabre Impulso y tira con **Legendario (16)**.
  → Fracaso: "No impacta" y **sin** botón de Tirar daño (solo Expansión daña al fallar).
- [ ] **B.9 Historial.** Cierra el modal.
  → En "Acciones recientes" sale "Impulso Poderoso (nivel 2)".

---

## C. Expansión

Pon la fatiga a 8 y pulsa **Usar** en Expansión.

- [ ] **C.1 Por defecto.** Mira el modal.
  → Título "Expansión (nivel 2)". Acción Estándar, Fatiga 2, Alcance 40 m, Área 8 m, Daño
  15 letal. Nota: "Afecta a todo lo que haya en el área, aliados y el propio psiónico
  incluidos".
- [ ] **C.2 Poderosa.** Elige **Expansión Poderosa**.
  → Acción Compleja, Fatiga 3, Daño 16. Se añade la nota "Expansión Poderosa: +1 de
  fatiga…".
- [ ] **C.3 Nivel 1 + Poderosa.** Elige nivel **1**.
  → Fatiga 2, Alcance 20 m, Área 6 m, Daño 15.
- [ ] **C.4 El objetivo tira con Poderosa.** Deja nivel 2 y Expansión Poderosa. Tira con
  dificultad **Muy fácil (2)** y despliega **El objetivo**.
  → Esquiva con Reflejos + Atletismo "· dificultad 9". Expulsión "· dificultad 11", con
  el fracaso "Empujado 4 m y cae derribado". Con Poderosa **suben las dos**.
- [ ] **C.5 Resultado.** Mira el texto bajo el número.
  → Éxito: "La singularidad estalla en la casilla elegida…". Fracaso: "Se desvía una
  casilla por cada fallo antes de estallar…".
- [ ] **C.6 Al fallar también hay objetivo y daño.** Cierra, reabre Expansión y tira con
  **Legendario (16)**.
  → Sale fracaso, y aun así aparece "El objetivo" y el botón "Tirar daño (16 letal
  base)": la singularidad se desvía pero estalla igual. Al pulsarlo, "Daño: 16 letal",
  sin bono por éxitos.
- [ ] **C.7 Daño.** Tira hasta sacar éxito y pulsa **Tirar daño**.
  → "Daño: X letal (16 base + N por éxitos)".

---

## D. Convergencia

Pon la fatiga a 8 y pulsa **Usar** en Convergencia.

- [ ] **D.1 Por defecto.** Mira el modal.
  → Título "Convergencia (nivel 2)". Acción Estándar, Fatiga 2, Alcance 30 m, Objetivo
  Único, Daño 7 letal. **Sin notas antes de tirar**: las de Convergencia van con el
  daño.
- [ ] **D.2 Poderosa.** Elige **Convergencia Poderosa**.
  → Acción Compleja, Fatiga 3, Daño 9.
- [ ] **D.3 Nivel 1 normal.** Elige nivel **1** y **Convergencia**.
  → Fatiga 1, Alcance 15 m, Daño 6.
- [ ] **D.4 Daño y efectos.** Vuelve a nivel 2, forma normal, dificultad **Muy fácil
  (2)**. Tira hasta sacar éxito y pulsa **Tirar daño**.
  → "Daño: X letal (7 base + N por éxitos)" y un bloque **Efectos** con cuatro líneas
  "Convergencia: …": mitad de la absorción; Escudo Deflector y Malla Plasmática;
  armaduras que reciben daño permanente; fuego que ignora la absorción.
- [ ] **D.5 El objetivo.** Despliega **El objetivo**.
  → "Esquiva con Reflejos + Atletismo" (sin dificultad) y "Si no esquiva: prueba de
  Fortaleza… · dificultad 8", con sus cuatro grados (sin efecto / 1 de fuego / fuego y
  llamarada / blindaje −4).
- [ ] **D.6 Poderosa no cambia la dificultad del objetivo.** Repite con Convergencia
  Poderosa.
  → La prueba de Fortaleza sigue en dificultad 8; solo sube el daño.

---

## E. Gasto de fatiga y bloqueo

Pon la fatiga a 8 y abre Impulso (nivel 2, forma normal).

- [ ] **E.1 Se gasta aunque falle.** Tira con **Legendario (16)**.
  → Sale fracaso, y aun así, al cerrar y mirar Recursos, la fatiga está en 6/8. Al
  reabrir Impulso, "Fatiga tras usarlo" marca `6 → 4`.
- [ ] **E.2 Bloqueo.** Usa **Tirar otra vez** hasta que la fatiga llegue a 0.
  → Los botones de tirar se apagan con el aviso "Te faltan 2 de fatiga (tienes 0, cuesta
  2)."
- [ ] **E.3 Bloqueo tras recargar.** Recarga la página y abre Impulso.
  → Sigue bloqueado, con la línea `0 → -2`. A nivel 1 también (`0 → -1`).

---

## F. Sobrecarga

Pon la fatiga a 8 y anota la vida (8/8). Abre Impulso (nivel 2, forma normal).

- [ ] **F.1 Salta al cruzar a exhausto.** Tira cuatro veces: 8 → 6 → 4 → 2 → 0.
  → Las tres primeras no muestran nada especial. En la cuarta, que pasa de 2 a 0 y cruza
  el umbral de exhausto (por debajo de 2), sale el bloque rojo **Sobrecarga** con "quedas
  inconsciente" y el botón "Tirar salvación de Fortaleza (dificultad 7)".
- [ ] **F.2 Salvación y daño.** Pulsa el botón.
  → Sale "Fortaleza: X vs 7 · grado" y el daño: crítico 0, éxito 1, fracaso 2, fracaso
  crítico 4. En Recursos la vida baja justo eso. El historial muestra "Sobrecarga:
  salvación de Fortaleza".
- [ ] **F.3 No repite estando ya exhausto.** Deja la fatiga en 1 desde Recursos y usa
  Impulso a nivel 1 (coste 1).
  → No sale el bloque de Sobrecarga: ya estabas exhausto.

---

## G. Ficha aprobada: subir con XP

- [ ] **G.1 Aprobar y dar XP.** Pulsa **APROBAR**. En la cabecera, escribe 30 en XP y pulsa
  **Aplicar**. **Recarga la página**: la pestaña de compra no se entera de la XP nueva
  hasta recargar, que es un fallo conocido y no de la psiónica.
  → En Psiónica la cabecera marca **XP 30** y todos los − están apagados.
- [ ] **G.2 Compra con XP.** Sube Singularidad de 2 a 3.
  → Cuesta 9 y la XP queda en 21.
- [ ] **G.3 Otra disciplina.** Sube Resonancia a 1.
  → Cuesta 3 y la XP queda en 18.
- [ ] **G.4 Se guarda.** Recarga.
  → XP 18, Singularidad 3, Resonancia 1, Traslación 2. En Acciones, el selector de nivel
  de los tres poderes ofrece 1, 2 y 3.

---

## H. Traslación (flujos H1–H8)

Preparación propia: personaje nuevo con la letra **A** en Psiónica y **Traslación 3** (18
puntos). Pon la fatiga a 8 antes de cada flujo. La carga máxima sale 0 kg porque la
Perspicacia de un personaje sin tocar es 0 (25 kg × Perspicacia).

- [ ] **H.0 Filas.** En Acciones, el subtítulo pone "Traslación · nivel 3" y salen estas
  filas:
  - Anclaje: `PSP 0 + Tecnociencia -1`, `Estándar · 2 fatiga · 45 m`, `-1`
  - Trasladar: `Simple · 2 fatiga · 45 m`, sin número (no se tira)
  - Proyección: `REF 0 + Tecnociencia -1 -2`, `Simple · 1 fatiga · 60 m · daño 7`, `-3`
  - Auto-proyección: `Estándar · 1 fatiga`
  - Sensor: `Estándar · 1 fatiga`
  - (más Auto-anclaje, Levitar y Duelo de Métrica, ver H7, y Proeza, ver H8)

### H1. Anclaje
- [ ] **H1.1** Pulsa Usar.
  → "Anclaje (nivel 3)": Acción Estándar, Fatiga 2, Alcance 45 m, Duración 3 turnos,
  Carga máx. 0 kg. Hay selectores de nivel (1-3) y de objetivos (Uno / Varios a la vez /
  Añadir uno más), y la casilla **Carga < 10 kg**.
- [ ] **H1.2 Casilla de carga.** Márcala.
  → Fatiga 0, con el desglose "Traslación 3: carga < 10 kg ×0" y `8 → 8`.
- [ ] **H1.3 Varios a la vez.**
  → Acción Compleja, y el mensaje "Varios objetivos: cada uno paga… descuéntalos en
  Recursos".
- [ ] **H1.4 Tirada.** Vuelve a Uno, desmarca la casilla y tira con **Muy fácil**.
  → Éxito: "Anclado: queda paralizado 3 turnos o hasta que se libere…". "El objetivo"
  lista la esquiva, el escape enfrentado y el Duelo de Métrica.

### H2. Trasladar
- [ ] **H2.1** Pulsa Usar.
  → Modal **sin dado**: Acción Simple, Fatiga 2, Alcance 45 m, Desplaz. 30 m/turno, tres
  notas (requiere objetivo anclado…).
- [ ] **H2.2 Varios.**
  → Acción Estándar y mensaje de varios objetivos.
- [ ] **H2.3 Usar.** Elige "Mantener el control" y pulsa **Usar**.
  → "Usado · −2 fatiga" y, en "El objetivo", "Para liberarse: Fortaleza + Atletismo…". El
  historial muestra "Trasladar (nivel 3) · usado" y la fatiga baja a 6.

### H3. Proyección
- [ ] **H3.1** Pulsa Usar.
  → Acción Simple, Fatiga 1, Alcance 60 m, Daño 7 letal. El desglose muestra `Proyección
  (propio) -2` y total `-3`. El selector de Acción ofrece Simple / Reacción.
- [ ] **H3.2 Daño.** Tira con Muy fácil hasta acertar y pulsa Tirar daño.
  → En Efectos salen los avisos de peso (+1 por cada 200 kg), el daño del objeto lanzado y
  la regla de caída.

### H4. Auto-proyección
- [ ] **H4.1** Pulsa Usar y elige **×4 (compleja)**.
  → Acción Compleja, Fatiga 1, Objetivo "Tú", y las notas "Te mueves al cuádruple de tu
  velocidad (la prosa no dice cuál…)" y
  "+1 a tus esquivas… (a mano)". Al pulsar Usar gasta 1 de fatiga.

### H5. Sensor
- [ ] **H5.1** Pulsa Usar.
  → Sin selector de acción (a nivel 3 solo hay Estándar). Área "6 (radio, unidad a criterio
  del máster)", Duración 3 turnos y cuatro notas de efecto.

### H6. Niveles altos (NPC con Traslación 6)
En `/master/npcs` crea un NPC, ponle **Traslación 6** en su pestaña Psiónica y ve a
Acciones.
- [ ] **H6.1 Rebaja de nivel 4.** Abre Anclaje.
  → Acción **Simple** con "Uno"; con "Varios a la vez", **Compleja**.
- [ ] **H6.2 Casillas excluyentes.** Marca "Carga < 10 kg" y luego "Carga por debajo de la
  máxima del nivel".
  → Solo queda marcada la última. Fatiga 4 → 0 con la primera y 4 → 3 con la segunda. A
  nivel 1 con la segunda, 1 (mínimo).
- [ ] **H6.3 Sensor a nivel 5+.** Abre Sensor.
  → El selector ofrece Estándar / Simple / Reacción.

Borra el NPC al terminar.

### H7. Levitar, Auto-anclaje y Duelo de Métrica (Traslación 3)
- [ ] **H7.1 Movimiento.** En Resumen, junto al resto de movimiento.
  → "Levitar (Traslación 3) 30 m". Con Traslación 1 no aparece.
- [ ] **H7.2 Levitar.** En Acciones, Usar en Levitar.
  → Sin dado: Acción Simple, Fatiga 1, Duración "1 minuto", Desplaz. 30 m/turno, tres
  notas (la última remite a la casilla "Levitando: Física" de la esquiva). Al pulsar Usar,
  "Usado · −1 fatiga".
- [ ] **H7.3 Auto-anclaje.** Fila: `REF 0 + Tecnociencia -1`, `Reacción · 2 fatiga`, `-1`.
  Pulsa Usar.
  → Selector de nivel 1-3, casilla "Carga < 10 kg", Carga máx. y la dificultad ya puesta
  en **6** (campo custom).
- [ ] **H7.4 Duelo de Métrica.** Fila: `PSP 0 + Tecnociencia -1`, `Reacción · 1 fatiga`,
  `-1`. Pulsa Usar.
  → Selector Reacción / Simple, la nota "Como dificultad, escribe el total de la tirada de
  quien te ancla…" y la casilla "Soy 2 niveles superior en Traslación": al marcarla,
  Fatiga 0.

- [ ] **H7.5 Esquiva levitando.** En Defensa / esquiva, marca "Levitando: Física".
  → La fila pasa de `REF 0 + Atletismo -1` a `REF 0 + Tecnociencia (Física, mitad) N`, con
  N la mitad de tu Tecnociencia redondeando hacia arriba (entera y sin "mitad" si tienes la
  especialidad Física); el modal se titula "Defensa / esquiva (Física)" y el desglose usa
  Tecnociencia. Con Traslación 1 la casilla no aparece.

### H8. Proeza y fatiga temporal (Traslación 3)
Preparación propia: personaje nuevo con letra **A** en Psiónica y **B** en Atributos,
**Inteligencia 1 y Percepción 1** (Perspicacia 1) y **Traslación 3**: carga máxima 125 kg.
Fatiga a 8.
- [ ] **H8.1 Fila de Recursos.** En Recursos, bajo Fatiga.
  → "Fatiga temporal (Proeza) 0" con − / + y "Terminar escena".
- [ ] **H8.2 Sin peso.** Abre Proeza (fila `POT 0 + Atletismo -1`, `Compleja · 2 fatiga ·
  45 m`).
  → Campo "Peso del objetivo (kg)" vacío, Carga máx. 125 kg, dificultad **Difícil 10**
  marcada, y Tirar apagado con "Escribe el peso del objetivo.". Sin selector de 200 %.
- [ ] **H8.3 Bloqueos por peso.** Escribe 100 y luego 300.
  → 100: "No pasa de tu carga máxima: no hace falta Proeza…". 300: "Supera el límite del
  200 % de tu carga máxima.". Tirar apagado en los dos.
- [ ] **H8.4 Exceso.** Escribe 200.
  → "160 % de tu carga (125 kg) → +6 de fatiga", Fatiga 8, desglose "Coste del poder 2 ·
  Exceso de carga (160 % de tu carga) +6", `8 → 0`, Tirar habilitado.
- [ ] **H8.5 Tirar y prolongar.** Tira.
  → Sale el panel de Sobrecarga (8 → 0 cruza a exhausto) y el botón "Prolongar un turno
  (−6 fatiga)". Púlsalo: el panel de Sobrecarga **sigue** y aparece "Te has quedado sin
  fatiga…". En Recursos: Fatiga 0/8, Fatiga temporal 6, efectiva −6. En Resumen: "0/8 (6
  temporal de Proeza · efectiva -6)".
- [ ] **H8.6 Al 200 %.** Terminar escena, fatiga a 8, anota la vida. Proeza con peso 250.
  → "200 % de tu carga (125 kg) → +10 de fatiga · en el límite", nota "Llegas al 200 %…" y
  `8 → -4`. Al tirar: "Recibes 1 de daño mental (ya restado)…" y la vida baja 1. Prolongar
  cobra otros 10 sin volver a restar vida: Fatiga temporal 14.
- [ ] **H8.7 Terminar escena y recargar.** Pulsa Terminar escena y recarga.
  → Fatiga temporal 0 tras recargar (con un valor distinto de 0, también se conserva).
- [ ] **H8.8 NPC.** En el editor de un NPC con Traslación, pestaña Recursos.
  → Sale la misma fila de Fatiga temporal con Terminar escena.

---

## I. Contención

Personaje nuevo con la letra **A** en Psiónica, **Traslación 1** y **Contención 2** (12
puntos). Fatiga a 8.

- [ ] **I.1 Personal.** En Acciones › Contención · nivel 2, Usar en Contención.
  → Sin dado. Selectores de nivel (1-2) y Forma (Personal / Ampliada / Ampliada, soy el
  foco). Ficha: Acción Simple, Fatiga 1, Objetivo Tú, Duración 10 turnos, Absorción 1,
  Absorción quieto 3, Contra el ataque 6, Agilidad -1, Daño al objeto 2, y cinco notas.
- [ ] **I.2 Ampliada.** Elige Ampliada.
  → Acción Estándar, Objetivo Varios, Fatiga 2 con el desglose "Contención ampliada ×2", y
  cuatro notas más (área, mantenerla, protegidos, retirar protección).
- [ ] **I.3 Foco.** Elige "Ampliada, soy el foco".
  → Fatiga 1 (sin ×2) y la nota de colaboradores.
- [ ] **I.4 Usar.** Nivel 1, Personal, Usar.
  → "Usado · −1 fatiga".
- [ ] **I.5 Colaborar.** Usar en "Colaborar en una contención".
  → Acción "a criterio del máster", Fatiga 1 y dos notas.
- [ ] **I.6 Niveles altos (NPC con Traslación 1 y Contención 6).**
  → Nivel 1 Personal: Fatiga 0, Duración "1 hora gratis; después, 1 de fatiga por hora",
  Agilidad 0. Nivel 1 Ampliada: Fatiga 2, Duración 40 turnos, Agilidad 0. Nivel 3: Duración 40,
  Agilidad -1. Nivel 6: Duración 10, Agilidad -3.

## J. Resonancia, tanda 1

Personaje nuevo con la letra **A** en Psiónica y **Resonancia 3** (18 puntos). Fatiga a 8.
Para J.3, sube **Actitud** por encima de Biociencia.

- [ ] **J.1 Filas en Acciones.** Sección Resonancia · nivel 3.
  → Sincronía `Gratuita · 0 fatiga · 1 km²`; Mensaje agresivo `Estándar · 0 fatiga · 1 km²`
  (compleja rebajada por nivel 2; 1 − 1 por nivel 3); Superar la barrera `con la Sincronía ·
  0 fatiga`; Rastreo y Leer Mente `Simple · 0 fatiga · 1 km²`.
- [ ] **J.2 Rastreo.** Usar en Rastreo.
  → Alcance con `Local` marcado, `Local, reacción` y 1-3. Dificultad puesta a **6**;
  Vagamente → **9**; Desconocido → **12** y la nota "Tarda 10 veces lo normal (10 × acción
  simple)". Con Desconocido y alcance 3: Acción `10 minutos`, Fatiga **7** (3 + 4). Con
  Vagamente y alcance 2: `2 minutos`, Fatiga **2** (2 + 1 − 1). Sintético: el desglose
  cambia Biociencia por **Tecnociencia**.
- [ ] **J.3 Mensaje agresivo.** Usar.
  → Selector Habilidad con **Actitud** marcada (la más alta); pulsar Biociencia cambia el
  desglose. Tirar: la vida baja **1**, fatiga igual (coste 0) y el aviso "Recibes 1 de daño
  mental (ya restado)." — sin "inconsciente". Con éxito crítico: "Confusión tantos turnos
  como nivel empleado (1) y 1 de daño mental".
- [ ] **J.4 Leer Mente.** Alcance 3 y Tirar.
  → Acción `1 minuto`, fatiga **8 → 5**. Con fracaso: "Lo lees solo durante 1 turno (con el
  +2 en enfrentadas contra él ese turno)".
- [ ] **J.5 Sincronía.** Datos complejos + Local, reacción.
  → Acción `Reacción`, Fatiga 0. Con alcance 2: `1 minuto`, Fatiga **1** (2 − 1); Usar →
  "Usado · −1 fatiga".
- [ ] **J.6 Niveles altos (NPC con Resonancia 6).** Leer Mente.
  → Alcance 1: `Estándar`, Fatiga 0. Alcance 2: `Compleja`, 1. Alcance 4: `1 minuto`,
  Fatiga **2** (4 − 1 − 1). Alcance 5: 10 minutos, 5. Alcance 6: 1 hora, 8. Rastreo
  desconocido con alcance 6: `10 horas`, Fatiga 12.

## K. Resonancia, tanda 2: Alerta y Vínculo

El personaje de J (Resonancia 3). Fatiga a 8. Para K.3, un NPC con **Resonancia 4**.

- [ ] **K.1 Filas.** → Alerta pasiva `Pasiva · 0 fatiga · 60 m`; Alerta activa `Estándar ·
  1 fatiga · 1 km²`; Vínculo `Compleja · 1 fatiga · 3 km²`.
- [ ] **K.2 Alerta pasiva y activa (nivel 3).** Usar.
  → Selector Amenazas (Orgánicas / Sintéticas, esta cambia a Tecnociencia). Dificultad
  puesta a **6** (pasiva) y **8** (activa). Sin ventaja ni casilla de +2.
- [ ] **K.3 Resonancia 4 (NPC).** Alerta activa.
  → Casilla "+2 por Resonancia 4 (combinada con tu alerta normal)": al marcarla, el total
  sube 2. Aviso "Ventaja (Resonancia 4): tiras 2d12 y te quedas el mejor". Al tirar, giran
  **dos números, cada uno con su barra**; al asentarse, el mejor queda "d12 · vale" y el otro
  tachado "d12 · descartado". El resultado enseña `2d12 <mejor> · <otro tachado>`. Fatiga 8 → 7.
  Alerta activa sigue en Estándar y 1 también con Resonancia 6. Vínculo: `Estándar`, 4 km²,
  4 minutos.
- [ ] **K.5 Buscar / percibir (NPC con Resonancia 4).** Tirar en Acciones › Buscar /
  percibir.
  → Casilla "+2 por Resonancia 4 (combinada con tu alerta psiónica)" (total −1 → +1 al
  marcarla) y el aviso "Ventaja (Resonancia 4, si puedes usar Resonancia sin impedimentos)".
  Giran dos dados y el resultado enseña `2d12 <mejor> · <otro>`. Con Resonancia 3, la tirada
  no cambia.
- [ ] **K.4 Vínculo (nivel 3).** Usar.
  → Sin dado. Objetivo Aliado, Duración 3 minutos, mensaje "Varios objetivos: cada uno paga
  1 de fatiga…" y tres notas. Usar → "Usado · −1 fatiga".

## L. Inducción, tanda 1

NPC (o ficha editada) con **Resonancia 1** e **Inducción 5**. Fatiga a 8.

- [ ] **L.1 Filas.** → Comando `Estándar · 1 fatiga · 100 m`; Reconfiguración Mnemónica
  `Compleja · 2 fatiga · 100 m`. Con Inducción 2, Reconfiguración no aparece.
- [ ] **L.2 Comando.** Usar.
  → Selectores Objetivo (Orgánico / Sintético), Uso (Dar una orden / Evitar un ataque) y
  Objetivos (Uno / Varios). Desglose Expresión + Biociencia; con Sintético, Perspicacia +
  Tecnociencia. Casilla "Fuera del alcance local de Resonancia (−4)": total −1 → −5.
- [ ] **L.3 Evitar un ataque + Varios.** → Acción `Reacción`, Fatiga 1 y el mensaje "cada uno
  paga 1 de fatiga… La orden tiene que ser idéntica para todos".
- [ ] **L.4 Tirar.** → Fatiga 8 → 7; el resultado va desde tu lado (con fracaso crítico en
  Evitar un ataque: "Ataca sin impedimentos"; con crítico en una orden: "Actúa bajo tu orden
  durante los próximos 10 turnos").
- [ ] **L.5 Reconfiguración Mnemónica.** → Compleja, Fatiga 2, dos notas y la casilla −4.
- [ ] **L.6 Modulación.** Usar.
  → Título "Sopor (nivel 5)", Acción `Estándar`, Fatiga **5** (1 por nivel empleado). Ocho
  efectos (Cautiverio incluido con Inducción 5). Nivel 3 + Delirio: título "Delirio (nivel
  3)", Fatiga 3; con tu crítico "Confuso crítico y con miedo **6** turnos…".
- [ ] **L.7 Efectos.** Miedo, nivel 2: "El objetivo" trae la salvación de Fortaleza
  dificultad **7**. Cisma Lógico: desglose Perspicacia + Tecnociencia y dificultad del
  bucle 6 + nivel.
- [ ] **L.8 Varios (Inducción 6).** → Acción `Compleja` y el mensaje "…hasta 6 víctimas no
  pagan fatiga extra".
- [ ] **L.9 Hipomanía a un aliado.** Nivel 2 → sin dado, Estándar, Fatiga 2, nota "durante 2
  turnos…"; Usar → "Usado · −2 fatiga".
- [ ] **L.10 Supresión (Inducción 4).** → Compleja, Fatiga 1, Dificultad 10 marcada,
  Duración **120 minutos** (30 × 4). "Liberar del todo": Duración "este turno". "+2 a una
  salvación": sin duración.
- [ ] **L.11 Estabilización (Inducción 4).** → Reacción (o Simple), Fatiga 1, Dificultad 6,
  Objetivo Tú. Uso "Bonificador a una salvación" y Tirar: con éxito, "+3 a tu salvación:
  márcalo en la casilla «+3 por Estabilización»". Fatiga 8 → 7.
- [ ] **L.12 La casilla en la salvación.** Salvación de Voluntad → casilla "+3 por
  Estabilización (si la superaste)"; al marcarla, total +0 → +3. Con Inducción 1-3 es +2;
  con 6, +4; sin Inducción, no aparece.

## M. Hipercognición

NPC (o ficha editada) con **Resonancia 3** e **Hipercognición 5**. Fatiga a 8.

- [ ] **M.1 Filas.** → Sondeo No-Local `Simple · 1 fatiga · 1 km²`; Precognición `Estándar ·
  1 fatiga`; Retrocognición `Simple · 1 fatiga`.
- [ ] **M.2 Sondeo, tramos.** Local: Simple, Fatiga 1, Duración "1 minuto (10 turnos)",
  Dificultad 5 marcada (6 − 1). "¼ de tu Resonancia": Estándar, Alcance **500 km²**,
  Dificultad 7. "Todo tu alcance" + "Militar +4": Acción `1 minuto`, Fatiga 4, Alcance
  **2000 km²**, Dificultad **15** (12 + 4 − 1).
- [ ] **M.3 Fracaso crítico.** Local con Legendario (16) y Tirar: con fracaso crítico, el
  texto "Desorientación dimensional…" y el aviso "Recibes 1 de daño mental (ya restado)";
  la vida baja 1 y la fatiga 1.
- [ ] **M.4 Retrocognición.** "Hasta 1 semana": Compleja (10 minutos rebajado dos pasos),
  Fatiga 2, Área 50 m de radio, Dificultad **11** (12 − 1).
- [ ] **M.5 Precognición.** → Estándar, Fatiga 1, Área 50 m de radio, Duración 5 turnos,
  Dificultad 8.

## N. Fuentes externas: Xovromium y Munición Supresora

El personaje de A (Traslación 2, Singularidad 2), con 1 Xovromium comprado. Vida y fatiga a 8.

- [ ] **N.1 Casillas.** Usar en Impulso (nivel 2, fatiga 2). → Tres casillas: "Bajo
  Xovromium", "Afectado por Munición Supresora", "Supresora, fallo crítico".
- [ ] **N.2 Xovromium.** Márcala → desglose de fatiga "Xovromium −1" (8 → 7) y línea
  "Xovromium +1" en el desglose de la tirada.
- [ ] **N.3 Supresora, fallo crítico.** Quita Xovromium y marca esta → "×2" (8 → 4), línea −2
  en la tirada. Marcar la otra de Supresora desmarca esta. Al tirar: aviso "Munición
  Supresora: recibes 4 de daño letal (ya restado)"; vida 8 → 4 y fatiga 8 → 4.
- [ ] **N.4 Fila de Xovromium.** Fármacos › Usar Xovromium: Voluntad + Biociencia (o
  Actitud si es más alta), dificultad 6 puesta; al tirar gasta la dosis.
- [ ] **N.5 Derivación Psiónica (nivel 3, 10 cargas).** Usar en Impulso (nivel 2). → Contador
  "Pagar con cargas (Derivación 3)", "2 cargas por punto · tienes 10". Con 1: Fatiga 1,
  desglose "Derivación Psiónica (2 cargas) −1", 8 → 7. Con 2: Fatiga 0, 8 → 8, y el **+** se
  apaga. Al tirar: la fatiga no baja y las cargas pasan de 10 a 6.
- [ ] **N.6 Blindaje Psico-Reactivo.** Salvación de Voluntad → casilla "Contra
  metasensoría: Blindaje Psico-Reactivo +1". Con Derivación nivel 2, no aparece.

---

## Fuera de estas pruebas

No son fallos:

- Los penalizadores por umbral de salud y fatiga no se aplican en ninguna tirada (y con
  ellos, la Derivación nivel 4 y la parte de "mitigar" de la Estabilización). Traslación
  está completa.
- Xovromium, Munición Supresora y Derivación Psiónica no afectan aún ni a la tirada ni a
  la fatiga.
- La inconsciencia por sobrecarga no se aplica como estado; la marca el máster.
- En combate, la consola del máster no refleja el gasto de fatiga de la ficha (decidido
  así).
