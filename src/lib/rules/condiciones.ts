// Antes de añadir un modificador nuevo a una tirada, lee
// docs/modificadores-tiradas.md — explica los mecanismos de este fichero, el
// de alcance de modificadores.ts (para bonos de personaje entero, sin arma
// de por medio), y cómo elegir entre ellos.
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
import type { AlcanceModificador } from "./modificadores";

// Vive aparte de modificadores.ts a propósito: un ModificadorConFuente es
// permanente mientras se lleve algo puesto; una CondicionTirada es una
// elección de un instante, solo para ESTA tirada.
//
// `nota`: texto informativo que se muestra en el modal cuando la opción/el
// toggle está activo — sin sumar ningún número (docs/modificadores-tiradas.md
// §8, "texto informativo condicionado": Visor Nocturno, Mangual, Kerzul...).
// Independiente de `valorActivo`/`valor`: una condición puede llevar las dos
// cosas, solo el número, o solo la nota (con valor 0).
export type OpcionCondicion = { id: string; etiqueta: string; valor: number; nota?: string };

export type CondicionTirada = (
  | {
      id: string;
      tipo: "toggle";
      etiqueta: string;
      valorActivo: number;
      valorInactivo?: number; // por defecto 0
      activaPorDefecto?: boolean;
      nota?: string;
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
    }
) & {
  // Sin `alcance`: la condición solo se pinta en la tirada del arma/mejora
  // que la declara (patrón de siempre, condicionesDeMejoras en combate.ts).
  // Con `alcance`: además se recoge para CUALQUIER tirada que matchee (fija o
  // generada), vía condicionesActivas() (equipo.ts) — mismo AlcanceModificador
  // que ya usa Modificador tipo "tirada", sin inventar un segundo concepto de
  // alcance. Excluye "modo" en la práctica: no tiene sentido de origen (ver
  // condicionesActivas). docs/modificadores-tiradas.md §8.
  alcance?: AlcanceModificador;
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

// Los textos de las condiciones activas AHORA MISMO, con la etiqueta de qué
// condición los trae — el "texto informativo" del §8 de
// docs/modificadores-tiradas.md (Visor Nocturno, Mangual...), que no suma
// número pero sí debe leerse, y de dónde viene. Solo toggle/opción llevan
// `nota`; el contador no tiene sentido de "activo/inactivo" así que no
// aporta ninguna. Pensado para mostrarse junto al resultado, no solo
// mientras se elige — ver TiradaModal.
export function notasCondiciones(
  condiciones: CondicionTirada[],
  estado: EstadoCondiciones,
): { etiqueta: string; nota: string }[] {
  const notas: { etiqueta: string; nota: string }[] = [];
  for (const c of condiciones) {
    if (c.tipo === "toggle") {
      if (Boolean(estado[c.id]) && c.nota) notas.push({ etiqueta: c.etiqueta, nota: c.nota });
    } else if (c.tipo === "opcion") {
      const elegida = c.opciones.find((o) => o.id === estado[c.id]);
      if (elegida?.nota) notas.push({ etiqueta: c.etiqueta, nota: elegida.nota });
    }
  }
  return notas;
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

// La etiqueta del modo actualmente elegido (si la tirada tiene condición
// "modo"), o null si no la tiene o no hay nada elegido todavía. Lo usa
// ContextoTirada (modificadores.ts) para resolver los modificadores con
// alcance "modo" — el Sistema de Retroceso, que solo ayuda en F. Auto.
export function modoElegido(
  condiciones: CondicionTirada[],
  estado: EstadoCondiciones,
): string | null {
  const modo = condiciones.find((c) => c.id === "modo" && c.tipo === "opcion");
  if (!modo || modo.tipo !== "opcion") return null;
  return modo.opciones.find((o) => o.id === estado.modo)?.etiqueta ?? null;
}
