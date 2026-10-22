---
id: T-002
titulo: Dar créditos y XP desde el panel del máster sin ir de uno en uno
origen: manual
estado: descartado
vueltas: 0/2
rama: fabrica/T-002-creditos-xp-master
base: 4bf2630
creado: 2026-10-19
inicio: 2026-10-19T12:16:41.123Z
operario: 0/6
fin: 2026-10-19T12:22:14.478Z
---

<!--
ESTRENO 2. Repite el trabajo del commit 949fe83 (2026-09-26) desde el commit anterior. Esta vez el contrato sale
solo del encargo del usuario, escrito sin recordar la solución. En la retro: dónde se fue el tiempo del usuario y qué
lo habría quitado.
-->

## Encargo
"Actualmente en el panel del máster tenemos un problema de usabilidad. Necesito que hagas una UI amigable y con una
buena experiencia para dar créditos y experiencia a los jugadores. Actualmente hay unos controles feísimos que tienen
un botón más y menos que va subiendo de uno en uno. Como puedes entender, es realmente tedioso asignarle miles de
créditos a un jugador haciendo clics de uno en uno. Por favor, usa tus conocimientos en UX y haz una interfaz moderna,
comprensible y con la importancia correspondiente; utiliza también los estilos de la app y la forma de comunicar la
información de la app. Esfuérzate, por favor." (usuario, 2026-10-19)

## Spec
**Alcance:**
- Sustituir el control de XP y Créditos de `ResourceRow` (hoy un stepper −/+ de 1 en 1) por uno en el que el máster
  da o quita cualquier cantidad de una vez.
- Vale en los dos sitios donde aparece `ResourceRow`: el panel `/master` y la ficha `/characters/[id]` vista por el
  máster.
- Estilo de la app: tokens de `globals.css`, tema oscuro neón, mobile-first.

**Fuera de alcance:**
- La server action (`src/app/master/actions.ts`): ya acepta cualquier delta y no deja bajar de 0. No se toca, y con
  ella los permisos.
- El modelo de datos, el resto del panel del máster (aprobar, devolver a borrador) y cualquier otra pantalla.
- Historial o deshacer de los cambios de créditos/XP.

**Puede tocar:**
- `src/app/master/MasterControls.tsx`
- `src/app/master/*.tsx` (componentes nuevos del panel, si hacen falta)
- `src/app/master/page.tsx` y `src/app/characters/[id]/page.tsx` (solo donde usan `ResourceRow`)
- `docs/tareas.md` (su línea y las entradas del panel del máster que describan este control)

## Criterios
| # | Qué se tiene que cumplir | Oráculo |
|---|---|---|
| C1 | `npm test` y `npx tsc --noEmit` en verde | comando |
| C2 | Ningún cambio fuera de "Puede tocar" | `git diff --stat` |
| C3 | En `/master`, dar **5000** créditos a un personaje cuesta como mucho 3 interacciones contando escribir la cantidad, y el total que se ve sube exactamente 5000 sin recargar a mano | navegador |
| C4 | En `/master`, quitar **1500** créditos funciona igual (baja exactamente 1500). Quitar más de los que tiene deja el total en **0** | navegador |
| C5 | Lo mismo con XP: dar **3** y quitar **1** cambian el total exactamente en esa cantidad | navegador |
| C6 | Una cantidad vacía, 0, decimal (`2.5`) o no numérica no cambia nada: el total sigue igual y la página no muestra error | navegador |
| C10 | Ningún valor escrito hace lo contrario de la acción elegida: al dar, el total nunca baja; al quitar, nunca sube (probar con `-500` en cada una) | navegador |
| C7 | En `/characters/[id]` como máster, dar y quitar créditos funciona igual que en C3 y C4 | navegador |
| C8 | A 400 px de ancho, `/master` no tiene scroll horizontal y cada control táctil del nuevo componente mide al menos 40 px de alto | navegador (`scrollWidth`, `getBoundingClientRect`) |
| C9 | El diff no añade colores literales en los componentes (hex, `rgb(`, `hsl(` ni clases de color de la paleta por defecto de Tailwind como `red-500`): solo tokens de `globals.css`. Se permiten `black` y `white` (`text-black`, `bg-white`…), que son el patrón de botón de acción de la app | diff (grep) |

**Lo que no es criterio:** "moderna, comprensible, esfuérzate" no se puede comprobar con un oráculo. Lo juzga el
usuario en la Decisión, y el revisor puede dejar su opinión como hallazgo.

**Para el revisor:** prueba contra la BD local con `master` / `master`. Lo que des o quites a un personaje, devuélvelo
al terminar para dejar los totales como estaban.

## Inspección
```
C1  ok
C2  ok
C3  ok
C4  ok
C5  ok
C6  ok  (xp/creditos son Int en el schema y la action no filtra decimales: un 2.5 que llegue al servidor revienta,
         así que el criterio obliga a filtrarlo en el cliente; está bien que lo mida)
C10 ok
C7  ok
C8  ok
C9  ok
Contrato: ok  (cada punto del alcance está cubierto: control nuevo C3-C6/C10, los dos sitios C3/C7, estilo C8/C9;
              "Puede tocar" basta: ResourceRow vive en MasterControls.tsx y solo lo usan master/page.tsx y
              characters/[id]/page.tsx; un componente cliente nuevo cabe en src/app/master/*.tsx; sin schema)

Veredicto: pasa
```

## Construcción
```
src/app/master/AjusteRecurso.tsx → componente cliente nuevo por recurso: total grande en neón (créditos en accent,
    XP en info), input numérico (inputMode=numeric), botones "− Quitar" (borde danger) y "+ Dar" (bg-accent
    text-black, patrón CTA de la app), fila de atajos que rellenan la cantidad (XP 1/2/5/10, ¢ 100/500/1000/5000),
    vista previa "Dar → N · Quitar → M" y aviso efímero "+5.000 ¢". Llama a la action existente con FormData en
    useTransition; el revalidatePath de la action refresca el total sin recargar.          (C3, C4, C5, C7)
    La cantidad solo se acepta como entero positivo /^\d{1,9}$/ y > 0: vacío, 0, 2.5, texto o -500 dejan los
    botones deshabilitados y una pista en muted, sin tocar el servidor. El signo lo pone el botón, nunca el
    texto.                                                                                (C6, C10)
    Botones e input min-h-11 (44 px), atajos min-h-10 (40 px); input w-full min-w-0 flex-1 para no desbordar a
    400 px. Solo tokens de globals.css + text-black.                                       (C8, C9)
src/app/master/MasterControls.tsx → ResourceRow pinta dos AjusteRecurso (créditos arriba, XP abajo) y se elimina
    el Stepper −/+ de 1 en 1. Firma de ResourceRow intacta: master/page.tsx y characters/[id]/page.tsx no cambian.
docs/tareas.md → línea de T-002 bajo "Fase 6a — Panel de máster".
No hecho: verificación en navegador (C3-C8, C10) — sin herramienta de navegador en esta estación; queda para el
    revisor. tsc, npm test (465 ok) y lint en verde; grep de colores literales en el diff vacío.
Tests existentes cambiados: ninguno
```

## Revisión
```
Navegador: Chrome headless vía playwright-core (el MCP chrome-devtools tenía el perfil cogido por otra instancia),
app del worktree en :3412 contra la BD local, master/master. Personaje cmuh9sd17000267yunhinb8ze; totales
restaurados (38630 ¢ / 0 XP) y comprobados tras reload.

C3  pasa
    evidencia: /master, click input + "5000" + "+ Dar" = 3 interacciones; 38630 -> 43630 (+5000) sin recargar
C4  pasa
    evidencia: /master, quitar 1500: 43630 -> 42130; quitar 99999999: 42130 -> 0
C5  pasa
    evidencia: /master XP, dar 3: 0 -> 3; quitar 1: 3 -> 2
C6  pasa
    evidencia: "", "0", "2.5", "abc" en Dar y Quitar: botones disabled, total igual tras 2,5 s, pista en muted,
               sin pageerror/console.error ni texto de error
C10 pasa
    evidencia: "-500" en Dar y Quitar (créditos y XP): disabled, totales sin cambio; delta = signo del botón
               * cantidad > 0 (AjusteRecurso.tsx, aplicar)
C7  pasa
    evidencia: /characters/[id] como máster: +5000 (38630 -> 43630), -1500 (-> 42130), quitar de más -> 0
C8  pasa
    evidencia: 400 px: scrollWidth 400 = clientWidth, nada sobresale; 224 controles, alturas {44, 40}, mín. 40
C9  pasa
    evidencia: grep de hex/rgb(/hsl(/paleta Tailwind sobre las líneas añadidas de src: vacío; solo tokens + text-black

Hallazgos (no votan):
- Tarjetas de /master muy altas (~170 px por recurso): con 11+ pendientes, scroll largo. Para la Decisión.
- Atajos "1000"/"5000" sin punto (es-ES no agrupa 4 cifras) frente al total "38.630": incoherencia menor.
- aplicar() no captura errores de la action: si el servidor falla, no hay aviso.
- La sección Construcción se leyó antes del veredicto (va en el mismo archivo); los votos salen del diff y del navegador.
```

## Juicio
### Intento 1 · contigo
**Motivo:** todos los criterios pasan con evidencia

| # | veredicto | vota | evidencia |
|---|---|---|---|
| C1 | pasa | script | npm test; npx tsc --noEmit |
| C2 | pasa | alcance | 3 archivos cambiados, todos dentro de "Puede tocar" |
| C3 | pasa | revisor | Navegador (Chrome headless con playwright-core; el MCP chrome-devtools tenía el perfil bloqueado por otra instancia), /master, primer person |
| C4 | pasa | revisor | /master: quitar 1500 -> 43630 -> 42130 (delta -1500); quitar 99999999 -> 42130 -> 0. Restaurado a 38630 y comprobado tras reload. |
| C5 | pasa | revisor | /master XP: dar 3 -> 0 -> 3; quitar 1 -> 3 -> 2. Restaurado a 0 y comprobado tras reload. |
| C6 | pasa | revisor | /master créditos con '', '0', '2.5' y 'abc', en Dar y en Quitar: botón disabled, click forzado no cambia el total (0 -> 0 tras 2,5 s), pista |
| C10 | pasa | revisor | /master con '-500' en Dar y Quitar, créditos y XP: botones disabled, totales sin cambio (créditos 0 -> 0, XP 2 -> 2). El signo lo pone el bo |
| C7 | pasa | revisor | /characters/cmuh9sd17000267yunhinb8ze como máster (2 [data-total] en la tira): dar 5000 -> 38630 -> 43630; quitar 1500 -> 42130; quitar 9999 |
| C8 | pasa | revisor | Viewport 400 px en /master: documentElement.scrollWidth=400=clientWidth, body.scrollWidth=400, ningún elemento con right > 400; 224 controle |
| C9 | pasa | revisor | grep sobre líneas '+' del diff de src por hex, rgb(, hsl( y clases de paleta Tailwind (red\|blue\|...-NNN): sin coincidencias. Clases de col |
| script | pasa | script | lint: pasa; ficha: no aplica; prod: pasa |

**Para el usuario:** Todo pasa. La rama fabrica/T-002-creditos-xp-master está lista para que la mires; el push es tuyo.

## Decisión
descartado: es el estreno 2, un ensayo. El usuario da el resultado por muy bueno ("lo ha hecho mucho mejor que el
primer commit"), pero no se mergea: el panel del máster se rediseñó después (E1c). La rama queda para comparar.

## Métricas y retro
| vueltas | minutos | tokens | operario (fallos/llamadas) | ¿retocado antes del push? |
|---|---|---|---|---|
| 0/2 | 5,7 (+1 de la inspección devuelta) | ~265k (13 agentes en total) | 0/6 (+1 de la inspección devuelta) | no aplica (ensayo) |

**Tiempo del usuario:** unos 2 min de encargo, un ok tras la inspección devuelta y la revisión de la UI. Lo que más
pesa es mirar la UI: unas capturas en el informe del revisor lo abaratarían.
**Fue bien:** con un encargo de 4 frases y sin conocer la solución, el resultado supera al commit original (que era
una corrección menor, con un encargo peor explicado). La inspección pilló dos agujeros reales (decimales y negativos,
y los colores black/white) antes de construir. El revisor probó todo en el navegador con números exactos y dejó la BD
como estaba.
**Cambiaríamos:** F-010 (C6b saltado en silencio), F-011 (navegador ocupado por otra sesión), F-012 (el revisor lee
la Construcción). Hallazgos para un trabajo real: tarjetas de /master altas, formato de los atajos ("5000" frente a
"38.630") y sin aviso si falla la action.

**Rama que se conserva para comparar:** `fabrica/T-002-creditos-xp-master`.
