// Antes de añadir un modificador nuevo a una tirada, lee
// docs/modificadores-tiradas.md — explica los tres mecanismos de este
// fichero, el que existe en modificadores.ts pero no funciona todavía, y
// cómo elegir entre ellos.
//
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

// Una línea por condición, con el valor que aporta AHORA MISMO según el
// estado — es el desglose que se pinta en el modal para que no haya ningún
// número fantasma: todo lo que suma o resta tiene su etiqueta al lado.
export function desgloseCondiciones(
  condiciones: CondicionTirada[],
  estado: EstadoCondiciones,
): { etiqueta: string; valor: number }[] {
  return condiciones.map((c) => {
    if (c.tipo === "toggle") {
      const activo = Boolean(estado[c.id]);
      return {
        etiqueta: activo ? c.etiqueta : `${c.etiqueta} (sin activar)`,
        valor: activo ? c.valorActivo : (c.valorInactivo ?? 0),
      };
    }
    if (c.tipo === "opcion") {
      const elegida = c.opciones.find((o) => o.id === estado[c.id]);
      return { etiqueta: `${c.etiqueta}: ${elegida?.etiqueta ?? "—"}`, valor: elegida?.valor ?? 0 };
    }
    const n = typeof estado[c.id] === "number" ? (estado[c.id] as number) : c.porDefecto;
    return { etiqueta: `${c.etiqueta} ×${n}`, valor: n * c.valorPorUnidad };
  });
}

// Un bono que no es una elección propia del jugador: depende del tramo que
// ya eligió en la condición "tramo" (la mira telescópica solo ayuda a media
// y larga, por ejemplo). Va aparte de CondicionTirada porque no se pinta
// como control — se limita a aparecer o no en el desglose según lo que el
// jugador ya haya elegido arriba. Cada uno lleva su fuente (la pieza que lo
// trae) para que, a diferencia de antes, no se funda en silencio dentro del
// valor de la opción de tramo.
export type BonoPorTramo = { fuente: string; porTramo: Partial<Record<TramoDistancia, number>> };

function tramoElegido(estado: EstadoCondiciones): TramoDistancia | null {
  return typeof estado.tramo === "string" ? (estado.tramo as TramoDistancia) : null;
}

export function valorBonosTramo(bonos: BonoPorTramo[], estado: EstadoCondiciones): number {
  const tramo = tramoElegido(estado);
  if (!tramo) return 0;
  return bonos.reduce((total, b) => total + (b.porTramo[tramo] ?? 0), 0);
}

export function desgloseBonosTramo(
  bonos: BonoPorTramo[],
  estado: EstadoCondiciones,
): { etiqueta: string; valor: number }[] {
  const tramo = tramoElegido(estado);
  if (!tramo) return [];
  return bonos.map((b) => ({ etiqueta: b.fuente, valor: b.porTramo[tramo] ?? 0 }));
}
