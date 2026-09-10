// Punto de entrada del motor de reglas. La app importa siempre desde
// "@/lib/rules"; el reparto interno en módulos es un detalle de organización.
//
//   atributos.ts   los 6 básicos y los 6 aplicados, con sus límites
//   habilidades.ts las 10 habilidades y las reglas de especialidad
//   sheet.ts       forma de la ficha, validación Zod y lectura tolerante
//   derivados.ts   lo que se calcula y nunca se guarda
//   creacion.ts    point-buy: costes, pools y operaciones sobre la ficha
//   tiradas.ts     catálogo de acciones, dificultades y resolución del d12
//   modificadores.ts  cómo especies, dotes, aumentos, equipo y estados alteran números
//   migraciones.ts    qué pasa con las fichas cuando cambia el formato
//   equipo.ts         qué lleva puesto un personaje: validación de ranuras y sus modificadores
//   condiciones.ts    controles de un modal de tirada: toggle, opción, contador
//   combate.ts        el equipo convertido en tiradas de ataque concretas
//   herramientas.ts    herramientas activas equipadas (Radar…) convertidas en su propia tirada
//   aprobacion.ts      guardarraíl de la ficha aprobada: solo comprar, nunca vender

export * from "./atributos";
export * from "./habilidades";
export * from "./sheet";
export * from "./derivados";
export * from "./creacion";
export * from "./tiradas";
export * from "./modificadores";
export * from "./migraciones";
export * from "./equipo";
export * from "./condiciones";
export * from "./combate";
export * from "./herramientas";
export * from "./aprobacion";
export * from "./prioridad";
export * from "../catalog/especies";
export * from "../catalog/equipo";
export * from "../catalog/armasMelee";
export * from "../catalog/municion";
export * from "../catalog/medicina";
export * from "../catalog/herramientas";
