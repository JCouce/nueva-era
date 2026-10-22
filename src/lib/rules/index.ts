// Punto de entrada del motor de reglas. La app importa siempre desde
// "@/lib/rules"; el reparto interno en módulos es un detalle de organización.
//
//   atributos.ts   los 6 básicos y los 6 aplicados, con sus límites
//   habilidades.ts las 10 habilidades y las reglas de especialidad (catálogo de
//                  especialidades: catalog/especialidades.ts; por arma: especialidadesArma.ts)
//   sheet.ts       forma de la ficha, validación Zod y lectura tolerante
//   derivados.ts   lo que se calcula y nunca se guarda
//   formulaMovimiento.ts  constantes del movimiento general, que una especie puede cambiar
//   creacion.ts    point-buy: costes, pools y operaciones sobre la ficha
//   acciones.ts    catálogo de acciones, dificultades y resolución del d12
//   montaje.ts     montarTirada: total, desglose y márgenes de crítico de cualquier tirada
//   modificadores.ts  cómo especies, dotes, aumentos, equipo y estados alteran números
//   migraciones.ts    qué pasa con las fichas cuando cambia el formato
//   equipo.ts         qué lleva puesto un personaje: validación de ranuras y sus modificadores
//   recursos.ts        cargas de batería/munición gastadas y recargadas en partida (fase 6b)
//   condiciones.ts    controles de un modal de tirada: toggle, opción, contador
//   combate.ts        el equipo convertido en tiradas de ataque concretas
//   herramientas.ts    herramientas activas equipadas (Radar…) convertidas en su propia tirada
//   aprobacion.ts      guardarraíl de la ficha aprobada: solo comprar, nunca vender
//   estados.ts         fase 6b — umbrales de salud/fatiga y catálogo de estados de combate
//   npc.ts             fase 6b — "Poder" del catálogo de NPCs (métrica del usuario, no del sistema)
//   npcAleatorio.ts    generación de NPC al azar (botón del catálogo de NPCs)
//   blindaje.ts        absorción de daño por blindaje (armadura, Escudo Deflector, escudo en alto)
//   movimiento.ts      Movilidad Aérea equipada convertida en su propia tirada ("Volar")
//   vitalidad.ts       vida/fatiga como recurso persistente de la ficha (vidaActual/fatigaActual)
//   farmacos.ts        fármacos del pool (sheet.farmacos) convertidos en su propia acción "Usar"
//   psionica.ts        forma de los poderes psiónicos y compra de disciplinas (N×3, requisitos)
//   poderes.ts         evaluador: poder + nivel + opciones elegidas → valores concretos
//   especie.ts         especie + casta + linaje → efectos; elegir especie (validación y reset)
//   fichaResuelta.ts   resolverFicha: modificadores y derivados de una ficha en una pasada
//   personaje.ts       pestaña Personaje: pasos (hecho/pendiente), etiquetas de rasgos, identidad por defecto
//   revision.ts        envío a revisión: transiciones de estado, solo lectura, faltas y avisos
//   progresion.ts      coste por nivel con ajuste de especie, subida con XP y coste del siguiente nivel
//   dotes.ts           dotes: pool, requisitos, compra (pool o XP), venta y requisito no cumplido (D1)
//   dotesEfectos.ts    lo que las dotes ponen en las tiradas: casillas, bonos fijos y textos (D2a)
//   dotesAcciones.ts   acciones propias de dote (sección Dotes de Acciones, D2c-1)
//   dotesPoderes.ts    poderes de dote (Impacto/Sobrecarga Métrica) como PoderDisponible (D2c-2)
//   dotesCompradas.ts  sheet.dotes: forma y lectura tolerante
//   aumentos.ts        aumentos: compra, subir de nivel, elección, bolsa y requisito roto (A0); +1 a atributos, vida de Hipertrofia y rebajas de coste (A1); reducción de penalizadores por heridas, fatiga y carga (A3)
//   aumentosTiradas.ts lo que los aumentos ponen en tiradas y blindaje: casillas, selector "Contra…" de salvaciones, textos, Alerta pasiva y armadura natural (A2a)
//   aumentosAcciones.ts acciones propias de aumento (sección Aumentos de Acciones: sin dado y con dado) y su uso en servidor (A4a, A4b)
//   aumentosActivables.ts lo que hacen los activables encendidos (estado propio + pieza): atributos, penalizadores, "Contra…" (A5a)
//   brazoBionico.ts    Brazo Biónico: Fuerza y Agilidad del brazo, casilla en los ataques, bloqueo y blindaje (A6a)
//   usosEscena.ts      casillas "una vez por escena": gastar al tirar, bloquear, liberar y vaciar (A4a)
//   vidaPorEstados.ts  vida/fatiga que se pierden al bajar el máximo por un estado (S75)
//   registro.ts        registro del máster: qué se guarda de cada acción y cómo se deshace (E1b)
//   textosRegistro.ts  textos del centro de mando: entradas del registro, duraciones, hora relativa (E1c)
//   turnos.ts          combate en el centro de mando: vuelta, contador de rondas, resumen, vida en la Mesa (E1d)
//   ajusteVida.ts      pestaña Vida del máster: daño/curación, vista previa y umbral que cruza

export * from "./atributos";
export * from "./habilidades";
export * from "./sheet";
export * from "./derivados";
export * from "./formulaMovimiento";
export * from "./creacion";
export * from "./acciones";
export * from "./montaje";
export * from "./modificadores";
export * from "./migraciones";
export * from "./equipo";
export * from "./recursos";
export * from "./condiciones";
export * from "./combate";
export * from "./herramientas";
export * from "./aprobacion";
export * from "./prioridad";
export * from "./estados";
export * from "./estadosFicha";
export * from "./npc";
export * from "./npcAleatorio";
export * from "./blindaje";
export * from "./movimiento";
export * from "./vitalidad";
export * from "./farmacos";
export * from "./psionica";
export * from "./poderes";
export * from "./usoPoder";
export * from "./especie";
export * from "./personaje";
export * from "./revision";
export * from "./fichaResuelta";
export * from "./progresion";
export * from "./dotes";
export * from "./dotesCompradas";
export * from "./aumentos";
export * from "./aumentosTiradas";
export * from "./aumentosAcciones";
export * from "./aumentosActivables";
export * from "./brazoBionico";
export * from "./usosEscena";
export * from "./dotesEfectos";
export * from "./dotesAcciones";
export * from "./dotesPoderes";
export * from "./vidaPorEstados";
export * from "./registro";
export * from "./textosRegistro";
export * from "./turnos";
export * from "./ajusteVida";
export * from "../catalog/especies";
export * from "../catalog/equipo";
export * from "../catalog/armasMelee";
export * from "../catalog/municion";
export * from "../catalog/medicina";
export * from "../catalog/herramientas";
export * from "../catalog/armamentoPesado";
export * from "../catalog/estados";
export * from "../catalog/psionica";
export * from "../catalog/dotes";
export * from "../catalog/dotesTipos";
export * from "../catalog/especialidades";
