# Equipo — efectos especiales por pieza: hoja de ruta

El catálogo de equipo (fase 3, cerrada) transcribió cada pieza fielmente, incluido el
texto libre de su columna "Especial"/"Efecto" — pero **ese texto es solo decorativo
hoy**: `especial: string | null` se pinta en `DetalleArma` y no mueve ningún número ni
avisa de nada al jugar. Esta hoja de ruta es el barrido, pieza a pieza, para convertir
lo que tenga mecánica real en algo que la app sepa mostrar quien tira.

**No es fase 6b** (eso es combate en vivo) ni te obliga a tocar `docs/sistema.md` salvo
que aparezca una regla genuinamente ambigua — la mayoría de esto ya está `FIRME` en
`docs/equipamiento.md`, solo sin mecanizar.

## Cómo coger un item

1. Búscalo en `docs/equipamiento.md` (fuente de verdad) y lee la regla completa, no
   solo la fila de la tabla — el contexto de la sección explica el "por qué" (ver
   "Armas Modificadas" como ejemplo: el porqué de Shock/Llamarada/Fusión está en el
   párrafo de arriba de cada tabla, no en la fila).
2. Contrasta contra el catálogo (`src/lib/catalog/equipo.ts` y `estados.ts`) — mira si
   el/los estado(s) que necesita ya existen. Si falta alguno, es un hueco de verdad:
   decláralo, no lo rellenes a ojo.
3. Márcalo `[x]` aquí con una línea de qué se hizo. Si acabó siendo genuinamente ad hoc
   (no encajó en el mecanismo genérico), dilo explícito y por qué.

## El mecanismo genérico

**[ ] Sin construir todavía.** Diseño hablado (2026-09-11):

- La gramática que ya sigue `docs/equipamiento.md` en decenas de filas es consistente:
  `Efecto X (N)` = al impactar, el objetivo tira de salvación contra el estado X con
  dificultad N; `Crítico de X (N)` = lo mismo pero solo en golpe crítico (y en las
  armas de plasma, **sustituye** al efecto normal, no se suma).
- Los seis estados que aparecen en las armas de fuego principales ya existen enteros en
  `catalog/estados.ts`: `aturdido`, `ceguera`, `derribado`, `fusion`, `shock`,
  `llamarada`. No hace falta modelar ningún estado nuevo para esa parte.
- Propuesta: sustituir `especial: string | null` por campos estructurados —
  `efectoImpacto?: { estadoId: EstadoId; dificultad: number }` y
  `efectoCritico?: { estadoId: EstadoId; dificultad: number }` — y un aviso nuevo en
  `TiradasTab` (el `Marcador` del resultado) que, si la tirada fue de ataque, hubo
  éxito y el arma trae `efectoImpacto`/`efectoCritico` aplicable, muestra "Shock,
  dificultad 7" o lo que toque. **Sin auto-aplicar nada** — el máster lo resuelve a
  mano con el control de estados que ya existe en la consola de combate, mismo
  criterio que el resto de la app: la app informa, no arbitra.
- Piezas con efecto condicional a algo más que "impacto/crítico" (p. ej. "Derribo a
  Corta Distancia", que depende de la distancia del disparo, algo que la app no
  rastrea) probablemente no encajan en el mecanismo genérico tal cual — para esas, una
  nota visible en vez de forzar el aviso automático.

## Backlog — por categoría

### Armas de fuego — plasma (piloto, 6 armas + la mejora comprable)

**[ ] Sin empezar.** Caso ya analizado en conversación (2026-09-11): Efecto Shock y
Llamarada al impactar, Crítico de Fusión en vez de eso al sacar crítico, dificultad
sube con el arma (Plasma SD 11, SC 12, SB 12, SA 11, SS 12, Plaga 14). Además existe
como **mejora comprable** ("Armas Modificadas → Armas de Plasma",
`docs/equipamiento.md` §"Armas de Plasma"): la dificultad depende del tramo de daño
básico del arma a la que se instala (2 / 3-6 / 7+), no es fija — ese caso es más
complejo que una pistola ya construida con el efecto de fábrica.

### Armas de fuego — resto de la tabla principal

**[ ] Sin empezar.** ~30 armas más con `Crítico de Aturdimiento`/`Ceguera`/`Shock`, casi
todas con el mismo patrón que el plasma. Un par (Feritas, Azra, S.A.79, Gong, Asina,
Graviter, Zotrex, Matanza) añaden "Efecto Derribo a Corta Distancia" — condicional a
distancia, ver nota del mecanismo genérico arriba.

### Armas Modificadas (mejora comprable): Electrificantes / Térmicas / Nanofilamento

**[ ] Sin empezar.** Mismo patrón que Plasma (mejora comprable, dificultad por tramo de
daño) para Shock, Llamarada, y Hemorragia/Hemorragia Exanguinante respectivamente.
Nanofilamento además "ignora N puntos de blindaje" — otro campo estructurado, no es
solo estado+dificultad.

### Combate melee / Kerzul

**[ ] Sin empezar.** Sin revisar todavía si la tabla de melee sigue la misma gramática
o tiene la suya propia — mirar `docs/equipamiento.md` "Combate Melee" y "Armas Melee de
Kerzul" antes de asumir que es igual.

### Subsistemas (Malla Plasmática ya vista, resto sin mirar)

**[ ] Sin empezar.** La Malla Plasmática (`docs/equipamiento.md` "Subsistemas") ya
referencia Shock/Llamarada/Fusión en crítico con daño melee, con sus propias
condiciones (activación, colchón de puntos, gasto de carga) — más complejo que un arma.
Camuflaje Trifásico, Escudo Deflector, Derivación Psiónica, Proyector de Pulso: sin
revisar si tienen efectos especiales mecanizables o son solo números pasivos que el
sistema ya deriva.

### Armaduras, mejoras estándar, armamento pesado, granadas, medicina, herramientas

**[ ] Sin empezar.** Sin barrer todavía — probable que la mayoría no tenga nada
mecanizable (son en su mayoría números pasivos que `lib/rules` ya deriva), pero hay que
mirarlas para confirmarlo, no asumirlo.
