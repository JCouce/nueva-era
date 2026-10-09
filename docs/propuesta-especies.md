# Propuesta: implementar las especies

Encargo: `docs/prompt-especies.md`. Fuente: `docs/Especies.pdf` (9 páginas, sin commitear).
**Sin código.** Las decisiones que necesita el usuario van en el cuestionario (artifact);
las que necesita Murillo, en el §5.

Método de lectura: `pdftotext -layout` contrastado página a página con el render
(`pdftoppm`). El PDF no tiene tablas, solo listas, y la extracción cuadra con el render
(sin números fantasma). Las erratas van marcadas *(sic)*.

Diagrama del flujo propuesto (ficha → reglas → pantalla): `docs/diagrama-especies.png`.

> **Seguimiento: la lista de tareas vive en `docs/tareas.md`, sección "Especies reales".**
> Este documento explica el qué y el porqué; el estado está allí. Al terminar cada tarea,
> márcala `[x]` en `tareas.md` en ese mismo momento, no al final de la tanda. Si al
> construir algo cambia respecto a lo que dice aquí, actualiza también este documento.

**Revisión 2026-10-09.** Inventario contrastado otra vez con el PDF y afirmaciones sobre el
código comprobadas en el repo. Cambios: Empatía Biológica y Axadren re-enganchados,
M17 corregido, preguntas M22-M24 nuevas, reset de ficha al cambiar de especie (decisión
del usuario, §2.2), y §3.1 nuevo (`resolverFicha` / `montarTirada`).

---

## 0. Resumen

- **5 especies:** Humanos, Riux, Arianyi, Arkör y Manduk (este con 4 castas y 6 linajes
  nobles). Ninguna coincide con las provisionales salvo el id `arkoru`.
- **Recomendación de modelo: derivado.** La especie se guarda como una elección
  (`especieId` + casta/linaje) y todo lo que aporta se recalcula. "Aplicarla al crear"
  rompe el point-buy: un Arkör con Fuerza +2 escrita en la ficha pagaría esos 2 puntos
  como comprados.
- **Recomendación de orden: especies ya, en dos partes.** Primero el núcleo de creación
  (no depende de nada y la partida ya tiene fichas con números inventados). Antes de los
  bonos a tiradas, el **punto único de montaje de tiradas** con los **penalizadores por
  umbral** dentro. Aumentos, dotes y estados, después.

---

## 1. Inventario

Leyenda de clases: **C** creación · **P** permanente en la ficha · **K** condicional ·
**N** narrativo · **O** toca otra área.

### 1.1 Humanos

Lo que dice el documento:
- Trasfondo largo (Federación Tierra-Marte, Confederación, Liga del Gran Cisma).
- **Civilización Aumentada:** "reciben 60000 créditos que pueden emplear únicamente en
  aumentos. Si sobre parte de este dinero al escoger los aumentos, el dinero se pierde,
  pero, puede utilizarse la parte sobrante junto a recursos de creación del personaje para
  adquirir otros aumentos."
- **No trae** atributos, peso, altura, cultura ni descripción física.

| Rasgo | Clase | Nota |
|---|---|---|
| 60.000 créditos solo para aumentos | C · O (aumentos) | Los aumentos no existen en la app. La frase se contradice ("se pierde, pero puede utilizarse") |
| Trasfondo | N | — |

### 1.2 Riux

Lo que dice el documento:
- Peso 40-60 kg + (10 kg × Fuerza). Altura 170-220 cm.
- **Atributos:** Agilidad +1, Aguante +1, Inteligencia +1, Carácter −1, Fuerza −1.
- **Metabolismo de Ciclo Cerrado:** media ración para recuperar la misma fatiga, 4 h de
  Descanso Largo, 4 Descansos Breves al día en vez de 2.
- **Piel Irisada:** +2 en tiradas para resistir la radiación astral o ambiental.
- **Estasis:** entrar y salir de estasis sin daño.

| Rasgo | Clase | Nota |
|---|---|---|
| Atributos | P | Modificador de atributo, ya existe |
| Peso / altura | C · N | Rango de referencia; la ficha guarda peso y altura libres |
| Ciclo Cerrado | K · O (descanso) | El descanso existe en reglas (§7: 8 h, 5 comidas, 2 breves de 2) pero **no en la app** |
| Piel Irisada | K | No hay tirada "radiación"; sería una casilla en Salvación de Fortaleza |
| Estasis | N | Sin número |

### 1.3 Arianyi

Lo que dice el documento:
- Peso 30-55 kg + (10 kg × Fuerza). Altura 140-190 cm.
- **Atributos:** Agilidad +1, Percepción +1, Fuerza −1.
- **Evolución Psiónica:** "empieza con un punto gratuito en Resonancia y reduce en 1 punto
  el coste para cualquier poder psiónico de primer nivel".
- **Visión UV e Infrarroja:** ven calor y huellas químicas/eléctricas; 1 punto de fatiga
  por hora.
- **Empatía Biológica:** tocando (o muy cerca) perciben el estado neurovegetativo; requiere
  concentración, +2 a la tirada pertinente, en combate acción compleja.
- **Movimiento Acuático:** 8 + [(Potencia + Atletismo)/2] m. Aguantan el doble sin
  respirar.

| Rasgo | Clase | Nota |
|---|---|---|
| Atributos | P | Ya existe |
| Resonancia gratis | C · O (psiónica) | Nivel mínimo 1 y descuento de su coste. Afecta a requisitos (Inducción y Hipercognición piden Resonancia) |
| −1 al "coste de poder de primer nivel" | C · O (psiónica) | **Ambiguo**: coste de compra o coste de fatiga al usar (§5, M4) |
| Visión UV/IR | O (acción sin dado) · K | Activar con gasto de fatiga por hora; texto en Buscar/percibir |
| Empatía Biológica | K | Casilla +2 en las tiradas de **detectar**: Buscar/percibir (nervios, mentiras) y Tratar heridas (metabolismo). No en Convencer/mentir: esa es la tirada del que miente, no la del que lo detecta |
| Movimiento Acuático | P | Sustituye la fórmula de Nado (8 en vez de 4) |
| Apnea doble | N | No hay regla de apnea |

### 1.4 Arkör

El documento titula **"Arkör"** y en la prosa dice **"arköru"**; la app usaba "Arkorü". **Decidido: "Arköru"** (M20, §5b); el id interno sigue siendo `arkoru`.

Lo que dice el documento:
- Peso 80-120 kg + (15 kg × Fuerza). Altura 180-230 cm.
- **Atributos:** Fuerza +2, Agilidad −1.
- **Movilidad:** Salto Vertical 18 × (Pot + Atl) cm · Salto Horizontal 100 + [(Pot + Atl)
  × 25] cm · Escalada 8 + [(Pot + Atl)/2] m · Nado 2 + [(Pot + Atl)/2] m.
- **Capacidad de Carga:** la carga total aumenta un 20 %.
- **Inamovibles:** +2 en tiradas para evitar derribos.
- **Matriz Biometálica:** armadura natural 1; en ataque desarmado, sus críticos convierten
  el daño en letal.
- **Percepción sensorial:** −1 en percepción visual y en tiradas de ataque a distancia.
- **Adaptación Térmica:** +2 para soportar los efectos de las temperaturas.
- **Sistemas Filtradores:** +2 contra efectos de filtración en el aire *(sic: "bonficiador",
  "contras")*.
- **Acceso al Kerzul:** "un único objeto de kerzul durante su creación sin tener en cuenta
  su rareza".

| Rasgo | Clase | Nota |
|---|---|---|
| Atributos | P | Ya existe |
| 4 fórmulas de movimiento | P | Sustituyen constantes y multiplicadores, no son un +N. Carrera no cambia |
| Carga +20 % | P | Multiplicador sobre `cargaMaxima()`, no un +N |
| Inamovibles | K | Casilla +2 en "Saltar, escalar, levantarse" / salvación contra derribo (no hay tirada propia) |
| Armadura natural 1 | P | Línea nueva en el desglose de blindaje |
| Crítico desarmado letal | K | Texto de crítico en el ataque de Pelea |
| −1 visual / −1 a distancia | P · K | −1 fijo en ataques a distancia; −1 en Buscar/percibir solo si es visual |
| Térmica, Filtradores | K | Casillas +2 en Salvación de Fortaleza |
| Acceso al Kerzul | C · O (equipo) | Todo el kerzul es **Singular** y el tope más alto de Recursos es Muy Extraño: es la **única** vía de un jugador al kerzul. Precios de 12.000 a 48.000 |

### 1.5 Manduk

Se elige **casta** (Noble, Sabio, Guerrero, Siervo) y, si es noble, **linaje** (6 casas).

Lo que dice el documento, por casta:

| Casta | Atributos | Clase social |
|---|---|---|
| Noble | Carácter +1 | Éxito → crítico en tiradas contra intimidación y miedo; −1 al coste de cada punto de Actitud (mínimo 1) |
| Sabio | Int +1, Per +1, Fue −1, Agu −1, Car −1 | −1 al coste por punto de Biociencia, Cultura y Tecnociencia (mínimo 1); **+1 al coste** por punto de Atletismo, Combate Melee y Combate a Distancia |
| Guerrero | Fue +1, Agi +1, Agu +1, Car −1, Int −1 | −1 a los penalizadores por heridas; −1 al coste por punto de Atletismo, Combate a Distancia y Combate Melee (mínimo 1); **+1 al coste** por punto de Biociencia, Cultura y Tecnociencia |
| Siervo | Agu +1 *(sic: "Agaunte")*, Per +1, Car −1, Int −1 | −1 a los penalizadores por fatiga; media ración; 6 h de Descanso Largo |

Peso y altura también van por casta (Guerrero 70-110 kg + 15 × Fue, 180-220 cm, etc.).

Linajes ("solo afecta a la casta noble"):

| Casa | Atributo | Ventaja | Desventaja |
|---|---|---|---|
| Ílkrem | Fue +1 | Regenera 1 no letal/turno, 1 letal/minuto, 1 grave/hora; fatigado el doble de lento, exhausto nada | Daño de plasma o fuego → Fortaleza 9 contra aturdimiento |
| Zimethroni | Agi +1 | +4 m carrera, +2 m salto/nado/escalada; tras esquivar con éxito, 1 casilla gratis (1/turno) | Atacado físicamente mientras se mueve: +1 daño por cada 4 niveles |
| Irota | Agu +1 | Éxito = crítico en salvaciones contra toxinas, venenos y enfermedades | Fármacos y drogas a la mitad (duración, modificadores, vida/fatiga) |
| Maolher | Int +1 | −1 al coste de obtener o subir poderes psiónicos | Al usar un poder que gaste fatiga: Fortaleza (5 + nivel empleado) o 1 nivel de daño por punto de fatiga (letal en fracaso crítico, no letal en fracaso) |
| Axadren | Per +1 | Visión infrarroja; éxito = crítico en alerta contra enemigos ocultos | Explosión de plasma, destello o PEM → ceguera (dificultad 9); ceguera por causas similares +3 |
| Elión | Car +1 | Éxito = crítico contra efectos sugestivos | Fallar Empatía, Humor o Negociación es fallo crítico |

Clasificación de lo que no es obvio:
- **Atributos de casta + linaje** (P): se suman (Noble Ílkrem = Car +1, Fue +1).
- **Coste de habilidad por casta** (C · también XP): cambia `costeHabilidad` y el coste de
  subir con XP. Nivel N cuesta N−1 (mínimo 1) o N+1.
- **"Éxito → crítico"** (K): Noble, Irota, Axadren, Elión. Hay un precedente de una sola
  pieza: `margenCriticoExito = 0` de la VTM nivel 4, que hoy **decide la pantalla**
  (`AccionesTab.tsx:845`), no las reglas. Generalizarlo va en `montarTirada` (§3.1).
- **Axadren, "alerta contra enemigos ocultos"**: la Alerta pasiva no tira dado (6 +
  Perspicacia + Exploración), así que no puede haber crítico. Solo encaja en Alerta activa
  y Buscar/percibir (M22).
- **"Fallo → fallo crítico"** (K, Elión): sin precedente, hace falta el simétrico.
- **Penalizadores por heridas/fatiga −1** (P, Guerrero y Siervo): **dependen de que los
  umbrales se apliquen**, y hoy nada los aplica (ver §7).
- **Regeneración de Ílkrem** (O, tiempo de juego): la app no lleva el paso del tiempo.
- **Peaje de Maolher** (O, psiónica): calcado de la sobrecarga que ya tira la app.
- **Irota, fármacos a la mitad** (O, fármacos): toca `farmacos.ts`.
- **Zimethroni, +2 m a salto**: el salto va en centímetros (+200 cm).
- **Elión, "Humor" y "Negociación"**: las especialidades son **texto libre**
  (`ESPECIALIDADES_CONOCIDAS` solo da sugerencias: Empatía, Manipulación, Liderazgo) y el
  catálogo de psiónica ya cita "Negociación". Se aplica a la especialidad que se llame así,
  sea cual sea (M17).

---

## 2. Modelo de datos

### 2.1 Las dos vías

**Derivado** (lo que hacen hoy las provisionales): se guarda `especieId` (y casta/linaje);
atributos, movimiento, carga, blindaje y bonos se recalculan en cada render desde el
catálogo.

**Aplicado al crear**: al elegir especie se escriben los números en la ficha (atributos
+2, créditos, nivel de Resonancia…).

| Criterio | Derivado | Aplicado al crear |
|---|---|---|
| Cambiar de especie en borrador | Lo que aporta la especie se recalcula solo; lo comprado gracias a ella se resuelve con el reset (§2.2) | Hay que deshacer lo escrito por la especie anterior sin tocar lo comprado. Exige saber qué puso cada uno → acabas guardando el origen = derivado con más pasos |
| Point-buy | Lo comprado y lo de especie viven separados. `costeAtributo` sigue cobrando solo lo comprado | Fuerza 3 (+2 Arkör escrito) = 5 en la ficha → `costeAtributo(5)` cobra 30 puntos. Habría que restar la especie en cada cálculo |
| Tope de 4 en creación | Se aplica a lo comprado; decidir si cuenta el total es una línea | Mezclado: no se sabe qué parte es compra |
| Foto de aprobación | No cambia: congela lo comprado | La foto guarda números con la especie dentro |
| Cambio en el documento de Murillo | Se cambia el catálogo y todas las fichas se corrigen solas | Hay que migrar cada ficha |
| Coincide con el principio del proyecto | Sí: solo se guarda lo que decide el jugador | No |
| Coste | Cada cálculo mira la especie (ya lo hace hoy) | Una escritura, pero toda la lógica de deshacer |

**Recomendación: derivado.** El comentario del usuario ("la mayoría se aplica al crear")
se respeta igual: son efectos que **se deciden** al crear (se elige especie una vez y se
congela al aprobar), no efectos que haya que **escribir** al crear. La diferencia está
entre cuándo se elige y dónde se guarda.

### 2.2 Casos concretos

**Cambiar de especie antes de aprobar: reset de la ficha** *(decisión del usuario, 2026-10-09)*
- El problema no son los bonos de la especie (no se guardan, se recalculan solos), sino lo
  **comprado gracias a ella**: aumentos pagados con los 60.000 del humano, el kerzul del
  Arkör sin rareza, habilidades con el descuento de casta, la Resonancia gratis del
  arianyi (requisito de Inducción e Hipercognición), el descuento psiónico de Maolher.
  Deshacerlo pieza a pieza obligaría a guardar el origen de cada compra.
- Regla: cambiar **especie, casta o linaje** en borrador **resetea la ficha entera salvo lo
  que se ve en la pestaña Resumen**:
  - se conserva: nombre, edad, altura, peso, trasfondo, motivación, letras de prioridad y
    la nueva elección de especie;
  - vuelve al valor por defecto (`defaultSheet`) todo lo demás: atributos, habilidades y
    especialidades, psiónica, equipo, recursos, materiales, granadas, fármacos, munición;
  - vida y fatiga actuales, al máximo (centinela 999, se recorta solo);
  - `Character.creditos` (columna de la base), al valor de la letra de Recursos. De paso
    cierra el gotcha de `setPrioridadAction` para este caso.
- Aviso: **solo si hay algo que perder** (la ficha difiere de la por defecto fuera de
  Resumen, o los créditos no son los de la letra). Texto fijo, sin lista: *"Cambiar de
  especie reseteará la ficha (todo salvo el Resumen). ¿Seguir?"*. Si no hay nada que
  perder, el cambio es directo.
- Dónde vive: `elegirEspecie(ficha, eleccion, { aprobada, esMaster })` en `rules/especie.ts`
  devuelve `{ sheet, reseteada: boolean } | { error }`, y `hayQuePerder(ficha, creditos)` para
  decidir si se avisa. **El reset lo aplica el servidor** (`setEspecieAction`), no la
  pantalla: si alguien se salta el aviso, la ficha queda coherente igual.
- UI: el selector de especie va el primero en Resumen, junto a las prioridades, para que
  sea lo primero que se decide.

**Cambiar de especie después de aprobar**
- Hoy **se puede**: `saveIdentityAction` guarda `especieId` sin mirar si está aprobada. Con
  especies reales, eso reescribe atributos, movimiento y costes de una ficha aprobada.
- Propuesta: especie, casta y linaje **congelados al aprobar** para el jugador (el servidor
  rechaza el cambio). El máster puede, como con todo lo demás.

**Point-buy y el tope de 4**
- Hoy el tope de 4 se aplica a lo comprado (`setAtributoValue`). Con el modelo derivado,
  un Arkör compra Fuerza 4 y juega con 6.
- Recomendación mientras Murillo no diga otra cosa: **el tope es sobre lo comprado**
  (supuesto nuevo). Es lo que ya hace el código y lo habitual en sistemas de prioridades.
- Pregunta aparte: el techo de 6 tras aprobar, ¿sobre lo comprado (Arkör llega a 8) o
  sobre el total? (M2).
- El mínimo −1: un Riux que baja Fuerza a −1 juega con −2. El punto devuelto va a lo
  comprado; no cambia nada.

**Coste de habilidades por casta**
- `costeHabilidad(valor, especialidades)` pasa a recibir el ajuste de la casta por
  habilidad (−1 con mínimo 1, o +1 por nivel). Función pura, con tests.
- El mismo ajuste en `costeSubidaXp` (hoy en `actions.ts`): HOJA2 dice que el coste rige
  en creación y XP por igual. Se mueve a `rules/` de paso (hoy es una función suelta de la
  action).

**Descuentos psiónicos** (Arianyi, Maolher)
- Resonancia del arianyi **(decidido, M5)**: es un **+1 adicional**, igual que el +2 de
  Fuerza del Arköru, no un nivel 1 regalado. Nivel efectivo = comprado + 1; el jugador
  compra al coste normal desde el primer nivel (comprar 1 cuesta 3 y juega con 2). Puede
  superar el máximo de 6. Vale con cualquier letra de Psiónica, incluida la E, y cuenta
  como requisito de Inducción e Hipercognición. Hace falta un modificador nuevo de tipo
  *disciplina* (hoy los modificadores tocan atributo, derivado, habilidad o tirada), y los
  requisitos se comprueban contra el nivel efectivo.
- −1 por nivel (Maolher) y −1 al nivel 1 (Arianyi, si es compra): un ajuste en el coste
  por nivel, como el de habilidades.

**Créditos iniciales**
- La letra de Recursos escribe `Character.creditos` en `setPrioridadAction`. Ninguna
  especie toca esos créditos: solo los Humanos traen **otra bolsa**, solo para aumentos.
- Propuesta: **no tocar `creditos`**. La bolsa de aumentos es un presupuesto derivado
  (60.000 si es humano), como el de atributos, y se gasta cuando existan los aumentos. Hoy
  se enseña en la ficha como "pendiente de aumentos" y ya está.
- Cómo se gastará **(decidido, M3)**: dos bolsas. Un aumento se paga **primero con la
  bolsa de aumentos**; si no llega, se come lo que quede y la diferencia sale de los
  créditos normales. Ejemplo: letra A (65.000) + 60.000 de humano; gasta 40.000 en equipo
  normal (quedan 25.000) y 55.000 en aumentos (quedan 5.000 en la bolsa); un aumento de
  25.000 se paga con esos 5.000 + 20.000 normales. Lo que quede en la bolsa al aprobar se
  pierde. UI: pendiente de diseñar cuando existan los aumentos; la Tienda de aumentos
  enseñará las dos bolsas y de cuál sale cada pago.
- Gotcha de paso (no es de especies): `setPrioridadAction` **sobrescribe** los créditos
  al cambiar la letra de Recursos, sin restar lo ya gastado en la Tienda. Comprar con la E
  y cambiar a la A devuelve el saldo entero. Anotado para otra tarea.

**Acceso al Kerzul**
- Es una excepción a la regla de rareza, y la pieza es una decisión del jugador, así que sí
  se guarda: un campo en la pieza equipada (`viaEspecie: true`), máximo una por ficha, solo
  en borrador y solo con especie Arkör.
- Alternativa sin cambiar la forma: contar piezas de kerzul equipadas y permitir una. Más
  frágil (¿qué pasa si el máster regala una segunda?).
- Si el jugador cambia de especie con la pieza puesta, el reset se la lleva con el resto
  del equipo.

**NPCs del máster** *(2026-10-09)*
- Un NPC usa el mismo `Sheet` (`NpcTemplate.stats`) y las mismas pestañas en modo `libre`,
  así que todo lo **derivado** de la especie le llega solo: atributos, movimiento, carga,
  armadura natural, Resonancia +1, toggles de tiradas. En combate, la vida y la fatiga
  máximas salen de `salud(sheet)` (`master/combate/actions.ts:143`).
- Lo de **creación** no aplica: costes por casta, descuentos psiónicos, kerzul sin rareza y
  bolsa de aumentos son reglas de point-buy, y el NPC se edita libre.
- Huecos que cubre E1:
  - la Identidad del NPC no tiene selector de especie (solo nombre y nota): se añade
    especie, casta y linaje;
  - `NpcEditor` es otro componente padre: `resolverFicha` se calcula también ahí, con un
    hook compartido (`useFichaResuelta`);
  - `elegirEspecie` en **modo libre** para NPC: sin reset, sin bloqueo por aprobación, sin
    créditos (los NPC no tienen esa columna).
- Un NPC ya metido en un combate guarda una foto de su ficha: cambiarle la especie después
  no afecta a ese combate (como cualquier otro cambio hoy).
- El generador de NPC aleatorios **no** elige especie (decisión del usuario: es un
  experimento que no se amplía).

**Foto de aprobación**
- No cambia: sigue congelando atributos y habilidades **comprados**. La especie queda
  congelada al aprobar, así que el jugador no puede mover lo que deriva de ella.
- **Pero el catálogo sí puede moverlo** *(decisión consciente, hay que dejarla escrita)*:
  los bonos de especie no se guardan en la ficha, viven en `especies.ts`. Si Murillo
  cambia el Arkör de Fuerza +2 a +1, **todas las fichas Arkör cambian, aprobadas
  incluidas**, sin que nadie las toque. Mientras el sistema esté en diseño es lo que
  queremos (corregir el catálogo corrige todas las fichas, sin migraciones). Cada cambio
  de números en `especies.ts` se avisa al máster antes del deploy. Si un día molesta, la
  salida es versionar el catálogo; hoy sería sobreingeniería.

**Migración de ficha** (`SCHEMA_VERSION` 13 → 14)
- Se añade `especieOpciones` (casta y linaje; `{}` por defecto) y, si se elige el campo en
  la pieza, `viaEspecie` en `piezaEquipadaSchema`.
- **Reset general al desplegar E1** *(decisión del usuario, 2026-10-09)*: todas las fichas
  de producción se resetean (todo salvo lo de la pestaña Resumen, mismo reset que §2.2) y
  cada jugador elige especie y compra de nuevo. Pasos el día del deploy: backup de Neon →
  **confirmación explícita del usuario ese día** (es irreversible en prod) → script de
  reset → deploy. Así no hace falta migrar ni conservar los números inventados de Arkorü.
- `especieId`: `humano` y `arkoru` se conservan como ids.
- Ids nuevos: `riux`, `arianyi`, `manduk`.

### 2.3 Forma propuesta del catálogo (orientativa, no es código)

```
Especie
  id, label, descripcion, pesoRef, alturaRef        (narrativo, por casta si hay)
  modificadores: Modificador[]                        (lo de hoy: atributo/derivado/habilidad/tirada)
  opciones?: { casta: [...], linaje: [... solo si casta = noble] }   cada opción con sus propios modificadores
  creacion?: {                                        (se lee en point-buy, nunca se escribe)
    costeHabilidad?: Partial<Record<HabilidadId, -1 | +1>>
    psionica?: { gratis?: { resonancia: 1 }, descuentoPorNivel?, descuentoNivel1? }
    bolsaAumentos?: number
    kerzulSinRareza?: true
  }
  movimiento?: { saltoVertical?, saltoHorizontal?, escalada?, nado?, carrera? }  (constantes de fórmula)
  cargaMultiplicador?: number
  blindajeNatural?: number
  condiciones?: CondicionTirada[] con alcance        (casillas +2 contra radiación, etc.)
  motor: MotorMetadata[] por rasgo                    (docs/motor.md, obligatorio)
```

Cada rasgo lleva su `MotorMetadata`. `ESPECIES` entra en `motor.test.ts` (hoy está fuera a
propósito, por provisional).

---

## 3. Dónde vive la lógica

Mismo patrón que `usoPoder.ts`: funciones puras en `src/lib/rules/`, entrada explícita,
devuelven un resultado que la pantalla solo aplica, con tests.

| Qué | Dónde | Forma |
|---|---|---|
| Catálogo | `catalog/especies.ts` | Datos puros |
| Resolver la especie de una ficha (especie + casta + linaje → lista de efectos) | `rules/especie.ts` (nuevo) | `especieDeFicha(sheet)` → modificadores, ajustes de coste, reglas de movimiento, blindaje, condiciones |
| Elegir especie/casta/linaje | `rules/especie.ts` | `elegirEspecie(sheet, eleccion, { aprobada, esMaster })` → `{ sheet, reseteada } \| { error }`. Valida que el linaje solo va con noble y que no se cambia aprobada; aplica el reset (§2.2). `hayQuePerder(sheet, creditos)` decide si se avisa |
| Coste de habilidades y psiónica | `creacion.ts`, `psionica.ts` | Reciben el ajuste resuelto, no leen el catálogo por su cuenta |
| Coste en XP | `rules/progresion.ts` (sacado de `actions.ts`) | `costeSubidaXp(desde, hasta, factor, ajuste)` |
| Movimiento, carga, blindaje | `derivados.ts`, `blindaje.ts` | Reciben los modificadores ya montados por `resolverFicha` (§3.1); nunca los recalculan |
| Acceso al kerzul | `rules/equipo.ts` | `puedeEquiparSinRareza(sheet, pieza)` |
| Peaje de Maolher | `usoPoder.ts` | Un efecto más de `efectosDelResultado`, igual que la sobrecarga |

Server actions: `setEspecieAction` nueva (sale de `saveIdentityAction`), que llama a
`elegirEspecie`, guarda la ficha y, si hubo reset, fija `Character.creditos` a la letra de
Recursos. Regla de ESLint: añadir `elegirEspecie` y los cálculos de coste a
`no-restricted-imports` para que la UI no los use a mano.

### 3.1 La pantalla no calcula: `resolverFicha` y `montarTirada`

Medido el 2026-10-09: un render completo de Acciones en el peor caso (6 disciplinas a
nivel 6, 31 poderes, tiradas fijas, ataques, salud, movimiento, carga) cuesta **~1 ms** en
Node; en un móvil, unos 3-5 ms (un frame son 16). **El rendimiento no es el problema.** Lo
son estos antipatrones, que especies empeoraría:

| # | Hoy | Con especies |
|---|---|---|
| 1 | La pantalla decide reglas: el crítico de la VTM (`AccionesTab.tsx:845`) y la suma del modificador final del modal (`:849`) | Los "éxito → crítico" y "fallo → pifia" de castas y linajes irían ahí |
| 2 | `salud`, `movimiento`, `cargaMaxima`, `atributoEfectivo` llevan `mods = modificadoresActivos(sheet)` por defecto: cada llamada sin `mods` vuelve a montar especie + equipo (Resumen, 4 veces por render) | Cada llamada resolvería especie + casta + linaje otra vez, sin que se vea |
| 3 | Acciones suma los estados de combate (`modificadoresDeEstados`); Resumen no | Los −1 de Guerrero/Siervo sobre los umbrales darían números distintos según la pantalla |
| 4 | `indiceCondiciones` memoizado con `[sheet.equipo]` y un `eslint-disable` ("solo lee el equipo") | En cuanto la especie aporte casillas, cambiar de especie **no refresca el índice**: bug seguro |

Propuesta, mismo patrón que `usoPoder.ts`:
- **`resolverFicha(sheet, { estadosCombate })`** en `rules/`, pura. Una pasada que devuelve la
  `FichaResuelta`: modificadores (especie + equipo + estados), especie resuelta (casta y
  linaje → efectos), derivados (aplicados, salud, movimiento, carga, blindaje) e índice de
  casillas (equipo **y** especie).
- **Se calcula una vez** en `CharacterSheet` y en `NpcEditor` (hook compartido `useFichaResuelta`), con `useMemo([sheet, estadosCombate])` sobre la
  ficha entera (sin deps parciales: cuesta ~1 ms y elimina el problema 4), y baja a las
  pestañas.
- **Fuera los parámetros por defecto** `mods = modificadoresActivos(sheet)`: obligatorios, y
  TypeScript caza cualquier recálculo escondido.
- **`montarTirada(fichaResuelta, tirada, casillasMarcadas)`**: el punto único de montaje (M1
  del §6). Devuelve modificador total con desglose y márgenes de crítico y pifia. Absorbe
  la suma del modal y la VTM; ahí entran los umbrales, el −1 de Guerrero/Siervo y los
  "éxito → crítico".
- **ESLint**: `modificadoresActivos`, `especieDeFicha` y los derivados sueltos a
  `no-restricted-imports` en componentes ("usa resolverFicha / montarTirada").

Encaje en las tandas: `resolverFicha` nace en **E1** (es donde `especieDeFicha` tiene
sitio); `montarTirada` es **M1** tal cual. No añade tandas.

---

## 4. Encaje con el motor

Mecanismos de `docs/modificadores-tiradas.md`. ✅ existe · 🟡 existe con ajuste · 🔴 falta.

| Efecto | Tipo | Mecanismo | Estado |
|---|---|---|---|
| Atributos (todas) | numérico | `Modificador` atributo | ✅ |
| −1 ataque a distancia (Arkör) | numérico | `Modificador` tirada, alcance habilidad Combate a Distancia | ✅ (no cubre lanzar granadas: supuesto) |
| Movimiento Arkör / Arianyi / Zimethroni | numérico | Constantes de fórmula por especie en `movimiento()` | 🟡 hoy solo hay `bonoDerivado("carrera")`; faltan saltos, escalada y nado |
| Carga +20 % | numérico | Multiplicador en `cargaMaxima()` | 🟡 |
| Armadura natural 1 | numérico | Línea en `desgloseBlindaje` | 🟡 |
| +2 radiación / temperatura / filtración / derribo | numérico condicional | `CondicionTirada` (casilla) con alcance en Salvación de Fortaleza / Saltar-levantarse | 🔴 las casillas con alcance solo salen del equipo. Hace falta que la especie sea otra fuente → **punto único de montaje** |
| −1 percepción visual | numérico condicional | Casilla en Buscar/percibir | 🔴 igual que arriba |
| Empatía Biológica +2 | numérico condicional | Casilla en Buscar/percibir y Tratar heridas | 🔴 igual |
| Éxito → crítico (Noble, Irota, Axadren, Elión) | numérico condicional | `margenCriticoExito = 0` como casilla, en `montarTirada` | 🔴 un precedente (VTM) que hoy decide la pantalla; hay que generalizarlo y sacarlo a reglas (segundo consumidor real). Axadren: solo Alerta activa y Buscar/percibir (M22) |
| Fallo → fallo crítico (Elión) | condicional | Simétrico: margen de pifia | 🔴 nuevo |
| Crítico desarmado letal | texto | `nota_fija` / `efectoCritico` en Pelea | ✅ datos |
| −1 penalizador heridas/fatiga (Guerrero, Siervo) | numérico | Ajuste sobre `modificadoresDeUmbrales` | 🔴 **los umbrales no se aplican a ninguna tirada hoy** |
| Coste habilidad por casta | creación | Ajuste en `costeHabilidad` + XP | 🔴 nuevo, pequeño |
| Resonancia gratis, descuentos psiónicos | creación | Ajuste en `psionica.ts` | 🔴 nuevo, pequeño |
| Acceso al kerzul | habilitador (arbitraje duro, en creación) | Excepción en la validación de rareza | 🔴 nuevo, pequeño |
| Bolsa de 60.000 para aumentos | creación | Presupuesto derivado | ⛔ bloqueado: no hay aumentos |
| Visión UV/IR (fatiga/hora), Visión IR Axadren | acción sin dado + texto | `AccionDirecta` "Activar visión" + nota en Buscar/percibir | 🟡 el patrón existe (Radar); gasto por hora a mano |
| Peaje Maolher | acción (salvación tras usar) | Efecto en `usoPoder.ts`, calcado de la sobrecarga | 🟡 |
| Irota, fármacos a la mitad | numérico | Ajuste en `farmacos.ts` | 🟡 sin precedente pero local |
| Ílkrem regeneración | recurso de personaje en el tiempo | — | ⛔ la app no lleva el tiempo; texto |
| Ílkrem aturdimiento, Axadren ceguera, Zimethroni daño extra | texto (objetivo propio, disparado por otro) | Texto en la ficha | ✅ texto; mecanizar depende de "estados bien definidos" |
| Descanso (Riux, Siervo), raciones | texto | Texto en la ficha | ⛔ no hay descanso en la app |
| Zimethroni casilla gratis tras esquivar | texto | Nota en Defensa | ✅ datos |
| Estasis, apnea, peso/altura | narrativo | Descripción; peso/altura como referencia junto al campo | ✅ |

**¿Depende del punto único de montaje?** Solo lo condicional. Los bonos de especie **sin
condición** (el −1 a distancia del Arkör) ya llegan hoy a todas las listas: el modal suma
`bonoAlcance(mods)` y `mods` incluye la especie (`AccionesTab.tsx:506` y `:838`). Lo que
no llega son las **casillas** (+2 contra radiación, −1 visual, Empatía Biológica): hoy las
casillas de alcance solo salen del equipo y cada lista las recibe distinto. Hecho
`montarTirada` antes, la especie es una fuente más en una sola función (§3.1).

---

## 5. Preguntas para Murillo

**Todas resueltas por el usuario el 2026-10-09** (cuestionario de especies): ninguna queda
para Murillo. Las respuestas son las de la columna "Mientras tanto" salvo las que cambia
el §5b. Si en adelante aparece una duda nueva, se decide caso a caso (no se construye la
sugerida por defecto: puede dar regresiones).

| # | Pregunta | Mientras tanto |
|---|---|---|
| M1 | ¿El tope de 4 en creación incluye el bono de especie? | No: tope sobre lo comprado |
| M2 | ¿El techo de 6 incluye la especie (un Arkör, ¿Fuerza 8?) | Techo 6 sobre lo comprado; el total puede pasar de 6 |
| M3 | Humanos: "el dinero se pierde, pero puede utilizarse la parte sobrante…". ¿Qué se pierde y cuándo? | Solo sirve para aumentos, se puede juntar con los créditos de Recursos y lo que quede al aprobar se pierde |
| M4 | Arianyi: "reduce en 1 el coste para cualquier poder psiónico de primer nivel". ¿Coste de comprar el nivel 1 de una disciplina (3 → 2) o fatiga al usar un poder a nivel 1? | Compra: el nivel 1 de cada disciplina cuesta 2 (es como lo usa Maolher, "coste para obtener o aumentar") |
| M5 | Arianyi: el punto gratis de Resonancia, ¿también con Psiónica en E? ¿Cuenta como requisito de Inducción/Hipercognición? | Sí a las dos; subir a 2 cuesta lo normal (6) |
| M6 | Arianyi: ¿Movimiento Acuático sustituye al Nado? | Sí |
| M7 | Arkör, armadura natural 1: ¿se suma a la armadura puesta? ¿Vale contra fuego? | Se suma, como Tejido Conductor; no contra fuego ni mental (S19) |
| M8 | Arkör, −1 visual: ¿afecta a la Alerta pasiva? ¿"Ataque a distancia" incluye lanzar granadas y armas arrojadizas? | Alerta pasiva no (es sentido general); solo Combate a Distancia |
| M9 | Arkör, kerzul: ¿paga el precio? ¿Cualquier objeto (incluido el Escudo)? | Paga el precio; cualquier objeto de kerzul del catálogo |
| M10 | Manduk: ¿un noble tiene que elegir linaje? ¿Existe noble sin casa? | Obligatorio |
| M11 | Castas: el −1/+1 de coste por punto, ¿rige también con XP? ¿Y el −1 de Maolher ("obtener **o aumentar**")? | Sí a los dos (HOJA2: la misma fórmula en creación y XP) |
| M12 | Guerrero/Siervo "reducen en 1 los penalizadores": ¿−1/−3/−5 pasa a 0/−2/−4? | Sí, cada tramo uno menos |
| M13 | Noble: "éxito → crítico en tiradas contra intimidación y miedo". ¿Es la Salvación de Voluntad? | Sí, como casilla en Voluntad |
| M14 | Zimethroni: "+2 m en velocidad de salto": ¿vertical y horizontal? | Los dos (+200 cm) |
| M15 | Zimethroni: "+1 daño por cada 4 niveles": ¿niveles de daño recibidos? | Sí; solo texto |
| M16 | Maolher: el daño del peaje, ¿lo absorbe el blindaje? ¿Se tira en cada uso aunque el poder falle? | No lo absorbe (como la sobrecarga); se tira siempre que se pague fatiga |
| M17 | Elión: "Humor" y "Negociación", ¿son especialidades de Actitud? | Las especialidades son texto libre: aplicar a cualquier tirada hecha con una especialidad que se llame Empatía, Humor o Negociación |
| M18 | Irota: fármacos "a la mitad", ¿redondeo? | Hacia abajo, mínimo 1 |
| M19 | Riux/Siervo: "media ración"; en las reglas una comida recupera 1 de fatiga. ¿Qué es media ración? | Solo texto |
| M20 | Nombre: "Arkör" (título), "arköru" (prosa) o "Arkorü" (app, equipamiento) | "Arkör" para la especie; se conserva el id `arkoru` |
| M21 | Peso "40-60 kg + 10 kg × Fuerza": ¿Fuerza comprada o con especie? ¿Es obligatorio? | Con especie; solo se muestra como referencia, no se valida |
| M22 | Axadren: "éxito crítico en alerta contra enemigos ocultos". La Alerta pasiva no tira dado. ¿Es la Alerta activa, Buscar/percibir o las dos? | Las dos |
| M23 | Arkör, Salto Vertical 18 × (Pot + Atl): ¿sigue valiendo el mínimo de 15 cm de la fórmula general? | Sí, mínimo 15 cm |
| M24 | ¿Hay suelo para el atributo total? Un Riux que compra Fuerza −1 juega con −2 (y un Sabio con Fuerza, Aguante y Carácter a −1, con −2 en los tres) | Sin suelo extra: −2 es válido; carga y movimiento ya cortan en 0 |

---

### 5b. Respuestas que cambian la propuesta

| # | Decisión |
|---|---|
| M1, M2, modelo | El bono de especie es **totalmente adicional** y puede superar cualquier límite: el tope de 4 en creación y el techo de 6 miran solo lo comprado. Coste de atributos el de siempre (×2 por nivel): un Arköru que compra Fuerza 4 paga 20 y juega con 6 |
| M3 | Dos bolsas para el humano; los aumentos tiran primero de la suya (§2.2, Créditos iniciales) |
| M5 | Resonancia +1 adicional, no nivel regalado (§2.2, Descuentos psiónicos) |
| M13, M17, M22 | Las condiciones van como **casilla en la tirada** ("¿es contra miedo?", "¿enemigo oculto?", "¿es Empatía / Humor / Negociación?") que **solo aparece para la especie y casa que la tiene** (Noble, Elión, Axadren). Encaja en `montarTirada`: la especie es una fuente de casillas más |
| M20 | Nombre en la app: "Arköru" |
| Orden | Especies núcleo (E0-E3) → montaje único con umbrales (M1) → bonos a tiradas (E4-E5) |
| Fichas en prod | Reset general al desplegar E1, con backup y confirmación ese día (§2.2, Migración) |
| /preguntas | Las preguntas viejas de psiónica **no se borran**: se conservan como fe de erratas |

## 6. Plan por tandas

Cada tanda: plantear → luz verde → construir → tests → navegador → documentar
(`sistema.md` §14 + supuestos, `tareas.md`).

El desglose en tareas sueltas, con casillas, está en `docs/tareas.md` → "Especies reales".
Se trabaja desde esa lista y cada tarea se tacha (`[x]`) en cuanto se completa.

| Tanda | Qué | Depende de | Verificación |
|---|---|---|---|
| **E0** | Transcribir el PDF a `docs/especies.md` (fiel, *sic*), `sistema.md` §14 a `PARCIAL` con las decisiones M1-M24 (§5b) | — | Revisión del usuario |
| **E1** Núcleo | Catálogo con las 5 especies, casta y linaje (atributos y narrativo). Ficha v14 (`especieOpciones`). `rules/especie.ts` con `especieDeFicha`/`elegirEspecie` y el **reset** al cambiar (§2.2). `resolverFicha` calculada una vez en `CharacterSheet` (§3.1). Especie congelada al aprobar. Selector el primero en Resumen. Fuera las provisionales | — | Tests de cada especie y del reset; crear un Manduk Noble Ílkrem en local y ver sus atributos; cambiar de especie con compras y ver el aviso y el reset |
| **E2** Creación | Coste de habilidad por casta (creación y XP), Resonancia gratis y descuentos psiónicos, bolsa de aumentos como dato visible, acceso al kerzul | E1 | Tests de coste; en navegador, Sabio con Tecnociencia 4 paga 7 y no 10 |
| **E3** Derivados | Movimiento (Arkör, Arianyi, Zimethroni), carga +20 %, armadura natural | E1 | Tests; Resumen y "Bloquear daño" en navegador |
| **M1** Montaje único | `montarTirada` (§3.1): monta cualquier tirada con todas las fuentes en orden, **con los umbrales de salud y fatiga dentro**; se lleva la suma del modal y el crítico de la VTM fuera de la pantalla | — | Tests de caracterización antes de mover nada; mismo desglose que hoy en cada lista |
| **E4** Tiradas | Casillas de especie (+2 radiación/temperatura/filtración/derribo, −1 visual, Empatía +2), "éxito → crítico", "fallo → fallo crítico", −1 heridas/fatiga de casta, textos (crítico desarmado, Zimethroni) | M1 | Abrir cada tirada y ver la línea en el desglose |
| **E5** Otras áreas | Peaje de Maolher en `usoPoder`, Irota en fármacos, Visión UV/IR como acción | E4 | Tests en `usoPoder.test.ts` / `farmacos` |
| — | Bolsa de aumentos gastable, regeneración de Ílkrem, descanso | Aumentos / tiempo de juego | Bloqueado |

---

## 7. ¿Especies ahora o esperar?

### Candidatas

| Candidata | Qué desbloquea | Riesgo de rehacer si se hace en mal orden | Depende de Murillo | Cuánto la necesita la partida |
|---|---|---|---|---|
| **Especies** | Fichas correctas de verdad; hoy hay números inventados (Arkorü) y 3 especies que no existen en la app | El núcleo (E1-E3) no depende de nada. Los bonos a tiradas (E4) sí: hechos antes del montaje único, se cablean lista a lista y luego se rehacen | Poco: el núcleo es `FIRME`; 24 preguntas pero todas con opción por defecto razonable | **Alta**: es lo primero que elige un jugador y cambia atributos. Cuanto más tarde, más fichas aprobadas con números falsos |
| **Umbrales** (−1/−3/−5, −1/−2) | Estabilización, Derivación nv4, Hipomanía; Guerrero y Siervo | Bajo. Si se meten sueltos antes del montaje único, se añaden a mano en cada lista (lo mismo que ya pasó con la psiónica) | No (`FIRME` + S14/S15) | **Alta**: cada tirada de un personaje herido sale hoy mal |
| **Montaje único** | Que cualquier fuente nueva (especie, estados, dotes, aumentos) llegue a todas las tiradas | Es la base: todo lo que se haga antes en tiradas se rehace | No | Indirecta; su valor es no rehacer |
| **Estados bien definidos** | Mecanizar derribo, aturdimiento, ceguera (y los de Ílkrem/Axadren) | Bajo si espera | **Sí** (tirada objetivo y números por llegar) | Media: hoy se llevan a mano |
| **Dotes y aumentos** | Humanos (60.000), el resto de la Fase 5 | — | **Sí, del todo** (no hay catálogo; S12) | No se pueden hacer |

### Recomendación

**Especies ahora, partidas en dos:**
1. **E0-E3 ya.** Es todo creación y derivados: no toca la lista de tiradas, no depende del
   montaje único y arregla las fichas que ya se están jugando.
2. **M1 (montaje único con umbrales dentro) antes de E4.** Los umbrales son la primera
   fuente que se monta en la función nueva: así salen los dos a la vez sin cablear nada dos
   veces, y los −1 de Guerrero y Siervo tienen sobre qué aplicarse.
3. **E4-E5 después.** Estados, dotes y aumentos esperan a Murillo.

Si el usuario prefiere no abrir especies hasta que Murillo conteste, lo siguiente es M1 con
umbrales: no depende de nadie y la partida lo nota en cada tirada con heridas.
