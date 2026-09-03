// Punto de entrada del motor de reglas. La app importa siempre desde
// "@/lib/rules"; el reparto interno en módulos es un detalle de organización.
//
//   atributos.ts   los 6 básicos y los 6 aplicados, con sus límites
//   habilidades.ts las 10 habilidades y las reglas de especialidad
//   sheet.ts       forma de la ficha, validación Zod y lectura tolerante
//   derivados.ts   lo que se calcula y nunca se guarda
//   creacion.ts    point-buy: costes, pools y operaciones sobre la ficha

export * from "./atributos";
export * from "./habilidades";
export * from "./sheet";
export * from "./derivados";
export * from "./creacion";
