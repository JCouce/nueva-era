// Controles interactivos dentro del modal de una tirada: el jugador los toca
// antes de tirar y su efecto se suma al modificador. Tres formas, las
// mínimas que hacen falta hoy — cualquier condición futura (dotes, poderes,
// estados) se declara con una de estas tres, sin inventar una cuarta:
//
//   toggle   → activo o no ("apoyado con el bípode", "puntero activo")
//   opcion   → una de varias, excluyentes ("tramo de distancia", "modo de disparo")
//   contador → un número entre un mínimo y un máximo ("atacantes adicionales esta ronda")
//
// Vive aparte de modificadores.ts a propósito: un ModificadorConFuente es
// permanente mientras se lleve algo puesto; una CondicionTirada es una
// elección de un instante, solo para ESTA tirada.
export type OpcionCondicion = { id: string; etiqueta: string; valor: number };

export type CondicionTirada =
  | {
      id: string;
      tipo: "toggle";
      etiqueta: string;
      valorActivo: number;
      valorInactivo?: number; // por defecto 0
      activaPorDefecto?: boolean;
    }
  | {
      id: string;
      tipo: "opcion";
      etiqueta: string;
      opciones: OpcionCondicion[];
      porDefecto: string; // id de la opción inicial
    }
  | {
      id: string;
      tipo: "contador";
      etiqueta: string;
      valorPorUnidad: number;
      min: number;
      max: number;
      porDefecto: number;
    };

export type TramoDistancia = "bocajarro" | "corta" | "media" | "larga";

// Estado que lleva el modal: qué opción está elegida en cada condición (por
// id), si un toggle está activo, o el número de un contador.
export type EstadoCondiciones = Record<string, string | number | boolean>;

export function estadoInicial(condiciones: CondicionTirada[]): EstadoCondiciones {
  const estado: EstadoCondiciones = {};
  for (const c of condiciones) {
    if (c.tipo === "toggle") estado[c.id] = c.activaPorDefecto ?? false;
    else if (c.tipo === "opcion") estado[c.id] = c.porDefecto;
    else estado[c.id] = c.porDefecto;
  }
  return estado;
}

// Suma el efecto de cada condición según su estado actual. Pura y testeable,
// igual que el resto del motor: el modal solo la llama tras cada toque.
export function valorCondiciones(
  condiciones: CondicionTirada[],
  estado: EstadoCondiciones,
): number {
  return condiciones.reduce((total, c) => {
    if (c.tipo === "toggle") {
      const activo = Boolean(estado[c.id]);
      return total + (activo ? c.valorActivo : (c.valorInactivo ?? 0));
    }
    if (c.tipo === "opcion") {
      const elegida = c.opciones.find((o) => o.id === estado[c.id]);
      return total + (elegida?.valor ?? 0);
    }
    const n = typeof estado[c.id] === "number" ? (estado[c.id] as number) : c.porDefecto;
    return total + n * c.valorPorUnidad;
  }, 0);
}
