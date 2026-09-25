# Encargo: seguir el repaso de efectos especiales del equipo

> Prompt listo para pegar entero en una sesión nueva para retomar esto. No es la fase
> 6b (ese es `docs/prompt-fase-6b.md`) — es una tarea aparte, arrancada el 2026-09-12:
> barrer `docs/equipamiento.md` **pieza a pieza, en conversación con el usuario**, para
> decidir qué efecto especial de cada arma/pieza merece mecanizarse, cuál ya lo está,
> y cuál es mejor dejar en texto. Se archiva cuando el barrido entero termine.
>
> **Este archivo es solo el "cómo retomar" — el "qué se sabe" vive en
> `docs/equipo-efectos-especiales.md`.** Tampoco confundir con
> `docs/checklist-motor-vs-prosa-2026-09-24.md` (auditoría automática distinta,
> multi-agente, sin tocar el PDF ni hablar con Murillo — ver la cabecera de
> `equipo-efectos-especiales.md` para cuál manda si las dos hablan de la misma
> pieza).

## Qué es esto, en una frase

El catálogo de equipo (fase 3, cerrada) transcribió fielmente el texto de cada pieza,
pero columnas como "Especial"/"Efecto"/"Efectos" (`especial`/`efectos: string | null`)
son **decorativas hoy**: no mueven ningún número, no avisan de nada al tirar. El
usuario va preguntando arma por arma "¿esto está contemplado?", y cada respuesta se
verifica contra el código real (no se adivina) y se deja anotada en tres sitios que
tienen que quedar sincronizados.

## Dónde vive esto — los tres sitios, siempre en sync

1. **`docs/equipo-efectos-especiales.md`** — el documento narrativo: los hallazgos
   grandes (van 4), el diseño del "mecanismo genérico" (sin construir todavía), y el
   backlog por categoría con veredicto (✅ Implementar / ✔️ Ya hecho / 🔕 Ignorar /
   ❓ Verificar) y su razonamiento. Es la fuente de verdad — lee la cabecera del propio
   archivo antes de tocar nada, explica el método con más detalle que este prompt.
2. **`docs/equipo-auditoria.html`** — checklist HTML standalone, en el repo (commiteado
   normal), que el usuario abre en cualquier navegador. Mismo contenido que el `.md`
   pero como tarjetas con checkbox, buscador y filtros por veredicto. Autocontenido
   (doctype/html/head/body completos).
3. **Artefacto publicado** —
   `https://claude.ai/code/artifact/7f641113-39dd-4171-ba5c-3e34019ef083` — mismo
   checklist, versión para abrir sin depender del navegador/login del usuario en local;
   usa la capacidad `db` del artifact para que el progreso (los checks) se sincronice
   solo entre dispositivos. **Ojo**: el artefacto NO lleva el wrapper
   `<!doctype>/<html>/<head>/<body>` (el propio Artifact tool ya lo añade) — publicar
   el archivo completo de `docs/equipo-auditoria.html` tal cual rompe el artefacto
   (ya pasó una vez). El proceso correcto para actualizarlo, cada vez que edites el
   `.html` local:
   ```
   python3 - << 'EOF'
   path = "docs/equipo-auditoria.html"
   out = "<tu scratchpad>/equipo-auditoria.html"
   content = open(path, encoding="utf-8").read()
   start = content.index("<title>")
   end = content.index("</script>") + len("</script>")
   open(out, "w", encoding="utf-8").write(content[start:end] + "\n")
   EOF
   ```
   y luego `Artifact` con `file_path` = ese archivo del scratchpad, `url` = la URL de
   arriba (nunca sin `url`, o crea un artefacto nuevo en vez de actualizar este).
   Verifica la sintaxis del `<script>` con `node --check` antes de publicar (mismo
   patrón que ya se ha usado toda la sesión).

**Al cerrar cada hallazgo/pieza**: edita los tres (bueno, dos — el HTML local y el
artefacto se derivan del mismo contenido) y comitea en git con mensaje descriptivo.
**Nunca hagas push sin que el usuario lo pida** — norma general del proyecto.

**Cadencia real (decidida 2026-09-21, Combate Melee):** el sync completo de los tres
en cada respuesta era ceremonia de más para aclaraciones menores sobre un ítem ya
existente. En el día a día: **anota cada respuesta solo en el `.md`** al momento; el
HTML local + el artefacto publicado se regeneran juntos en una pasada al final de la
sesión (o cuando el usuario lo pida explícitamente), no micro-aclaración a
micro-aclaración. El sync de los tres sigue aplicando tal cual para hallazgos grandes
o piezas que de verdad se cierran (como los 4 hallazgos ya documentados).

## Método (ya rodado, no lo reinventes)

1. El usuario señala una pieza o pregunta algo ("¿el X está contemplado?", "¿qué es
   Y?"). No asumas la respuesta — léela en `docs/equipamiento.md` primero.
2. Contrasta contra el código real: `src/lib/catalog/equipo.ts` (armas de fuego,
   armaduras, mejoras, subsistemas), `armasMelee.ts`, `armamentoPesado.ts`,
   `municion.ts`, `herramientas.ts`, `medicina.ts`; y el motor en `src/lib/rules/`
   (`tiradas.ts`, `combate.ts`, `condiciones.ts`, `modificadores.ts`, `estados.ts`).
3. **Si algo no cuadra o parece transcrito raro, no te fíes de `pdftotext` a secas** —
   ya corrompe alguna tabla (trampa conocida, `docs/traspaso.md` §5). Usa `Read` con
   `pages` sobre `docs/Equipamiento.pdf` para ver el render de verdad antes de afirmar
   nada (ya ha hecho falta dos veces esta tarea, con el Derribo de escopetas/
   ametralladoras).
4. Da la respuesta al usuario con la razón sourced (cita el archivo/línea/tabla).
5. **No implementes código sin que te lo pidan explícitamente** — el usuario ha
   repetido varias veces "apúntalo, no lo arregles aún". Esto es una fase de
   diagnóstico y catalogación, no de construcción.
6. Anota el hallazgo/veredicto en los tres sitios (ver arriba) y comitea.

## Qué se ha decidido ya (no lo vuelvas a discutir)

- **El "mecanismo genérico" propuesto** (sin construir): sustituir
  `especial`/`efectos: string` por campos estructurados (`efectoImpacto`,
  `efectoCritico`, `efectoPorTramo`, y una variante por `modo` elegido) y mostrar un
  aviso en el `Marcador` de `TiradasTab` cuando corresponda — **sin auto-aplicar
  nada**, el máster resuelve el estado a mano con el control que ya existe en la
  consola de combate. "No auto-resolver" y "no informar" son cosas distintas — varias
  correcciones de esta sesión salieron de mezclar las dos.
- **Cuatro hallazgos grandes**, con su razonamiento completo en el `.md`:
  1. El Proyector de Pulso no genera ninguna tirada de ataque (falta la tirada
     entera, no solo el efecto).
  2. "Munición Especial" y las 4 "Armas Modificadas" (Electrificantes/Térmicas/
     Plasma/Nanofilamento) no existen en el catálogo — no se pueden comprar hoy.
  3. Las 3 salvaciones genéricas (`salv_fortaleza`/`salv_reflejos`/`salv_voluntad`)
     no saben "contra qué" se resiste — un bono "+1 contra congelación" hoy se aplica
     a TODA la salvación de Fortaleza (que también cubre veneno, shock, etc.).
     Bloquea varios items del barrido (armaduras, Soporte Vital, Anticorrosivo).
  4. Tipo elemental (Plasma/Fuego/Eléctrico...) y categoría de gravedad
     (Letal/Grave/No letal) son cosas distintas — `categoriaDanio: string` mezcla las
     dos según lo que imprimiera la fila de origen. Tabla completa tipo→categoría en
     `docs/sistema-y-combate.md` §"Daño específico". "Cinético" no es un tipo más, es
     el caso base sin elemento (ya bien representado, sin nombre elemental).
- **Propuestas anotadas, sin construir**: una tirada nueva "Ocultar objeto" con
  selector de qué se esconde (dificultades inventadas, pendientes de confirmar con
  el diseñador); un modelo de sigilo persistente ("Escondido: X éxitos", ver
  `docs/sistema.md` pregunta 25b y `docs/tareas.md`).
- **Un caso "ad hoc de verdad"**: la Sydiasi (a dos manos elimina el retroceso en
  F.Auto) no encaja en el mecanismo genérico sin lógica especial — sección aparte
  "Casos sueltos por arma" en el `.md`, veredicto propio (🟠 Ad hoc).
- **Cosas que ya estaban bien y NO hacía falta tocar** (para no perder tiempo
  re-verificándolas): el +1 al ataque de las escopetas en Corta/Bocajarro
  (`ajusteTramoBase`), que las armas de plasma no acumulen retroceso (dificultad
  igual en sus dos modos, ya en el catálogo), los alcances del Láser/Rayo de Largo
  Alcance, el Sistema de Retroceso excluyendo plasma.

## Dónde se quedó — sigue por aquí

**Actualizado 2026-09-22.** Repasado a fondo, con correcciones y hallazgos nuevos:
Armaduras, Mejoras Estándar (completo: Soporte Vital, Compartimento Oculto, Inyector
Hipodérmico, Mejora Ignífuga, Visor Nocturno/Térmico), Mejoras de Movimiento,
**Armas de fuego completo** (pistolas → ametralladoras) y la mayoría de Mejoras en
Armas de Fuego, **Combate Melee entero** (incluido Kerzul: Inercia Entrópica,
Escudo de Kerzul), y de Subsistemas: Camuflaje Trifásico y Derivación Psiónica.

**IMPORTANTE — antes de seguir el barrido pieza a pieza, lee la consolidación de
prioridades en `docs/tareas.md`** (entrada "Equipo — mecanizar efectos especiales
por pieza", sección "Consolidación 2026-09-22"): hay dos bugs de una línea listos
para arreglar ya, tres preguntas nuevas para Murillo listas para enviar (31-33 en
`sistema.md`), y tres bloques de diseño (Hallazgo #5 absorción de daño, §8 de
`docs/modificadores-tiradas.md` condiciones/texto en tiradas fijas, RECURSOS) que
bloquean casi todo lo que queda marcado `✅ IMPLEMENTAR` — terminar el inventario no
sustituye a decidir esos tres. El usuario pidió explícitamente esta consolidación
porque el barrido llevaba demasiados hallazgos repartidos en 4 documentos sin un
orden de prioridad claro — no repitas el problema, mantén `tareas.md` al día según
avances.

**Sin terminar del barrido, en este orden:**
- Subsistemas: **Escudo Deflector, Malla Plasmática, Proyector de Pulso** — sigue
  por aquí, es justo donde se quedó la conversación.
- `ma2` (Puntero Láser, Silenciador, Linterna, Bayoneta, Lanzagranadas Integrado) y
  `ma4` (Mira Telescópica integrada de los fusiles "de Largo Alcance" — ¿descuenta el
  hueco de mejoras?) siguen en ❓ Verificar, sin cerrar del todo.
- Munición y Otras Armas a Distancia: listadas con veredicto, pero sin el repaso
  arma-por-arma en conversación que sí tuvo "Armas de fuego".
- Armas Modificadas: pendiente entero (bloqueado de raíz por el Hallazgo #2 — ni
  existen en el catálogo).
- Herramientas/Medicina: **fuera de alcance a propósito** (ya decidido, no lo repitas
  — son tiradas de uso activo, un tipo de contenido distinto al que motivó esto).

**El método ahora es más profundo que al principio**: para cada pieza, pregúntate
explícitamente las tres categorías que surgieron esta sesión — ¿modificador
numérico? ¿`CondicionTirada`? ¿texto informativo? — y si algo afecta a la tirada de
un TERCERO (no de quien lleva la pieza puesta), es 🔕 IGNORAR estructural, no "falta
esfuerzo" (ver `docs/modificadores-tiradas.md` §8, límite de "objetivo"). Varios
verdictos de piezas ya cerradas en sesiones anteriores (antes de este método) podrían
merecer una segunda pasada si el usuario lo pide — no lo hagas por iniciativa propia,
solo si lo señala.
