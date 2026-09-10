# Encargo: la fase del equipo

> Prompt listo para arrancar la fase 3 en una sesión nueva. Se copia entero y se pega.
> El análisis de por qué está escrito así vive en `docs/traspaso.md` §6.

---

Vamos con la fase del equipo (fase 3 de `docs/plan-app.md`). Lee antes
`docs/traspaso.md` entero: tiene el estado del proyecto, cómo se trabaja aquí y las
trampas que ya nos han mordido. La fuente de verdad de las reglas es
`docs/sistema.md`; el catálogo transcrito está en `docs/equipamiento.md`.

## Qué quiero

Que el grupo pueda consultar el equipo desde la ficha y ver qué lleva puesto. La
partida es alrededor del 23 de septiembre y esto es lo único que falta del mínimo
para jugar (crear personaje ✅, saber a cuánto tiras ✅, consultar el equipo ⬜).

## Lo que hace especial a este catálogo

No es una lista de objetos con precio. Hay **25 módulos instalables con niveles**, y
algunos son más un poder que un objeto. Se reparten en cuatro familias que se
comportan distinto, y esto es lo que hay que modelar bien:

1. **Subsistemas (5)** — camuflaje trifásico, derivación psiónica, escudo deflector,
   malla plasmática, proyector de pulso. Niveles 1-4. **Consumen ranura**: cada
   armadura admite entre 0 y 3. Son los que más se parecen a poderes: tienen modos de
   uso (activo/pasivo, estático/dinámico), célula de 10 cargas con su recarga, acción
   de activación (gratuita o reacción) y efectos que cambian en cada nivel. El
   proyector de pulso incluso trae su propia tabla de cuatro modos de ataque.
2. **Mejoras estándar (9)** — soporte vital, compartimento oculto, funda automática,
   inyector, ignífuga, anticorrosivo, tejido conductor, visor nocturno, visor térmico.
   Niveles 1-2 o 1-3. **No consumen ranura** (el soporte vital lo dice explícitamente).
3. **Movimiento (2)** — exoesqueleto y movilidad aérea. Niveles 1-4, pero con **tope de
   nivel según la armadura** (columna propia en la tabla, no ranura de subsistema).
4. **Mejoras de arma (4 con niveles + varias sin)** — mira telescópica, puntero, bípode,
   sistema de retroceso, bayoneta, lanzagranadas, silenciador, linterna, munición
   especial. Tienen **restricciones de compatibilidad** ("solo fusiles de asalto y de
   precisión", "solo Fusil de Asalto", "las armas de plasma no pueden instalarla") y
   cada arma indica en su tabla cuántas mejoras admite.

Aparte están las **herramientas** (valija de fabricación, valija médica, radar, disfraz
holográfico, escáner detector), que no se instalan en nada: se llevan encima.

## Antes de escribir código, quiero decidir contigo cinco cosas

No las resuelvas por tu cuenta: propón tu recomendación de cada una y espera.

1. **¿Catálogo consultable o tienda con presupuesto?** El sistema tiene créditos y
   rareza, pero no sabemos con cuánto dinero empieza un personaje (pregunta 7 de
   `docs/sistema.md`). Un catálogo con "esto lo llevo equipado" funciona sin esa
   respuesta; una tienda, no.
2. **Cómo se muestra un módulo que es medio objeto y medio poder.** Un arma cabe en una
   fila; el camuflaje trifásico tiene descripción, dos modos, cuatro niveles con
   coberturas distintas y gestión de cargas. ¿Ficha desplegable? ¿Pantalla de detalle?
   ¿Se muestran los cuatro niveles o solo el que tienes?
3. **¿Se validan las ranuras y los requisitos, o se confía en el jugador?** Tenemos los
   datos para validar: subsistemas por armadura, topes de exoesqueleto y movilidad
   aérea, compatibilidad de mejoras por tipo de arma, número de mejoras por arma.
4. **Qué hacemos con el peso.** Todo pesa y las heridas penalizan la capacidad de carga,
   pero **ningún documento dice cuánto puede cargar un personaje** (pregunta 26). ¿Lo
   mostramos como dato informativo o lo dejamos fuera hasta que Murillo conteste?
5. **Cuánto se enchufa al resto de la ficha.** Algunos módulos son mecanizables ya:
   exoesqueleto da +N a Fuerza, escudo deflector absorbe N, soporte vital da +1 a
   salvaciones. Eso encaja con el tipo `ModificadorConFuente` que ya existe y aparecería
   solo en la chuleta de tiradas y en los derivados. Otros (camuflaje, proyector) son
   irreducibles a un número y solo se pueden mostrar como texto. ¿Conectamos los
   mecanizables desde el principio o primero solo consulta?

## Restricciones de método (están en el traspaso, las repito por importantes)

- **No te inventes reglas.** Si algo no está definido, se declara en la interfaz con su
  motivo (patrón `PendienteTab` y las tiradas con `bloqueada`) o se anota como supuesto
  numerado en `docs/sistema.md` con su pregunta. Nada de rellenar huecos en silencio.
- **El catálogo va en `src/lib/catalog/`** como TypeScript tipado, siguiendo el patrón de
  `especies.ts`. Los datos salen de `docs/equipamiento.md`, que ya está verificado
  contra el PDF: no hace falta volver a abrirlo.
- **Cada fórmula con su test** (`npm test`, ~150 ms, sin dependencias).
- **Si cambia la forma de la ficha, migración**: sube `SCHEMA_VERSION`, añade el paso en
  `lib/rules/migraciones.ts` y su test. Guardar lo equipado cambiará la ficha, así que
  esto toca sí o sí.
- **Solo se guarda lo que el jugador decide**; lo derivable se recalcula.
- **Verifica en el navegador**, no solo que compile, y borra los datos de prueba al
  terminar. En la base local hay un personaje mío (`Testo1`) que no se toca.
- **No hagas push**: un push a `main` despliega a producción.

## Cómo quiero que empieces

1. Lee el traspaso y la sección de equipamiento que necesites.
2. Enséñame las cinco decisiones con tu recomendación en cada una, en corto.
3. Cuando las cerremos, propón el plan por trozos y vamos uno a uno, empezando por el
   catálogo de datos, que es mecánico y sin riesgo.
