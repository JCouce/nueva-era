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
import { APLICADOS, type AplicadoId } from "./atributos";

// Vive aparte de modificadores.ts a propósito: un ModificadorConFuente es
// permanente mientras se lleve algo puesto; una CondicionTirada es una
// elección de un instante, solo para ESTA tirada.
//
// `nota`: texto informativo que se muestra en el modal cuando la opción/el
// toggle está activo — sin sumar ningún número (docs/modificadores-tiradas.md
// §8, "texto informativo condicionado": Visor Nocturno, Mangual, Kerzul...).
// Independiente de `valorActivo`/`valor`: una condición puede llevar las dos
// cosas, solo el número, o solo la nota (con valor 0).
//
// `margenCriticoExito`: con la opción elegida (o el toggle activo), un éxito es
// crítico a partir de este margen en vez del general (VTM nv4 "complejo" y los
// "éxito → crítico" de especie, §14.8: 0, cualquier éxito). Lo lee montarTirada
// (montaje.ts); con varios activos gana el más bajo.
//
// `ventaja`, `costeFatiga`: como en el toggle, con la opción elegida (el selector "Contra…"
// de las salvaciones, A2a de aumentos). `fuenteVentaja` es de dónde sale la ventaja, para
// el aviso del modal. `partes`: de qué fuentes sale `valor` (su suma), para que el
// desglose las enseñe una a una en vez de un número opaco.
export type OpcionCondicion = {
  id: string;
  etiqueta: string;
  valor: number;
  nota?: string;
  margenCriticoExito?: number;
  ventaja?: true;
  fuenteVentaja?: string;
  costeFatiga?: number;
  partes?: { fuente: string; valor: number }[];
};

export type CondicionTirada = (
  | {
      id: string;
      tipo: "toggle";
      etiqueta: string;
      valorActivo: number;
      valorInactivo?: number; // por defecto 0
      activaPorDefecto?: boolean;
      nota?: string;
      margenCriticoExito?: number;
      // Gasto de sheet.recursos si el toggle está activo/inactivo al
      // confirmar la tirada (docs/prompt-gasto-recursos.md, Fase 1) — mismo
      // patrón que valorActivo/valorInactivo, pero para gastoTotal() en vez
      // de valorCondiciones(). Por defecto 0 (ver gastoTotal, acciones.ts).
      gastoActivo?: number;
      gastoInactivo?: number;
      // Lo que hace la casilla marcada además de sumar (dotes, D2d). Los junta montarTirada
      // (montaje.ts); la tirada y el daño los aplican tirarMontada y resolverDanio.
      //   ventaja      se tiran dos d12 y vale el mejor (Ojo Clínico, Apoyo…); no se acumula
      //   subeGrado    un fracaso (no el crítico) cuenta como éxito (Balanceo, §9.5)
      //   aplicado     la tirada usa este aplicado (Negociación Analítica: Perspicacia)
      //   costeFatiga  puntos de fatiga que se pagan al tirar con ella marcada (Ojo Clínico)
      //   danio        cambios al daño del ataque (Golpe Fatigante, Golpe Mejorado con Escudo,
      //                Derribo)
      ventaja?: true;
      subeGrado?: true;
      // Grupo de no apilamiento (A2a, `noApila`): de todo lo que entra en la tirada con el
      // mismo grupo (casillas, bonos con alcance, bonos por tramo) solo vale el mayor. Lo
      // resuelve montarTirada. "vision_aumentada": Ojo Biónico, miras y gafas.
      noApila?: string;
      aplicado?: AplicadoId;
      costeFatiga?: number;
      // Puntos de fatiga que se ahorran del gasto total de la tirada, sin bajar de 0
      // (Mielinización Central, A2b de aumentos: "omitir el gasto de un punto de fatiga", que
      // se combina con el de otras casillas). Lo resta montarTirada al final; lo que no
      // encuentra que ahorrar en las casillas lo deja en `ahorroSinUsar` (el coste del poder).
      ahorroFatiga?: number;
      danio?: EfectoDanioCasilla;
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
      // Cuenta `unidades` menos, sin bajar de `min` (Reflejos Felinos: un atacante adicional
      // menos en la esquiva, §9.3). Lo pone conExtrasDeFicha; sale en la etiqueta del desglose.
      descuento?: { unidades: number; fuente: string };
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

// Cambios al daño de una casilla marcada:
//   ajuste         se suma al total del daño (mínimo 0): Golpe Fatigante −1
//   categoria      el daño pasa a esta categoría: Golpe Mejorado con Escudo, "Letal"
//   sinBonoExitos  sin el +1 por cada dos éxitos (Derribo: daño máximo el básico)
//   conBonoExitos  lo devuelve aunque otra casilla lo quite (Derribo Brutal, acción estándar)
export type EfectoDanioCasilla = { ajuste?: number; categoria?: string; sinBonoExitos?: true; conBonoExitos?: true };

// Lo que enseña el control de la casilla a la derecha: el número si suma algo, y si no lo
// que hace ("ventaja", "fallo → éxito"…). Pura, para que el modal no decida nada.
export function resumenCasilla(c: Extract<CondicionTirada, { tipo: "toggle" }>, activo: boolean): string {
  const valor = activo ? c.valorActivo : (c.valorInactivo ?? 0);
  const signo = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
  const partes: string[] = [];
  if (valor !== 0 || (!c.ventaja && !c.subeGrado && !c.aplicado && c.margenCriticoExito === undefined && !c.danio && !c.ahorroFatiga))
    partes.push(signo(valor));
  if (c.ventaja) partes.push("ventaja");
  if (c.subeGrado) partes.push("fallo → éxito");
  if (c.aplicado) partes.push(APLICADOS.find((a) => a.id === c.aplicado)?.label ?? c.aplicado);
  if (c.margenCriticoExito !== undefined) partes.push(c.margenCriticoExito === 0 ? "éxito = crítico" : `crítico con ${c.margenCriticoExito}`);
  if (c.danio?.ajuste) partes.push(`${signo(c.danio.ajuste)} daño`);
  if (c.danio?.categoria) partes.push(c.danio.categoria.toLowerCase());
  if (c.danio?.sinBonoExitos) partes.push("daño básico");
  if (c.danio?.conBonoExitos) partes.push("daño con éxitos");
  if (c.costeFatiga) partes.push(`−${c.costeFatiga} fatiga`);
  if (c.ahorroFatiga) partes.push(`ahorra ${c.ahorroFatiga} fatiga`);
  return partes.join(" · ");
}

// Lo que enseña un botón de opción junto a su etiqueta: el número y, si los lleva, la
// ventaja y la fatiga que cobra. Pura, como resumenCasilla.
export function resumenOpcion(o: OpcionCondicion): string {
  const partes = [o.valor >= 0 ? `+${o.valor}` : `${o.valor}`];
  if (o.ventaja) partes.push("ventaja");
  if (o.costeFatiga) partes.push(`−${o.costeFatiga} fatiga`);
  return partes.join(" · ");
}

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
    return total + unidadesContador(c, estado) * c.valorPorUnidad;
  }, 0);
}

// Lo que cuenta un contador: lo marcado menos su descuento, sin bajar de su mínimo.
function unidadesContador(c: Extract<CondicionTirada, { tipo: "contador" }>, estado: EstadoCondiciones): number {
  const n = typeof estado[c.id] === "number" ? (estado[c.id] as number) : c.porDefecto;
  return c.descuento ? Math.max(c.min, n - c.descuento.unidades) : n;
}

// Una línea por condición, con el valor que aporta AHORA MISMO según el
// estado — es el desglose que se pinta en el modal para que no haya ningún
// número fantasma: todo lo que suma o resta tiene su etiqueta al lado.
export function desgloseCondiciones(
  condiciones: CondicionTirada[],
  estado: EstadoCondiciones,
): { etiqueta: string; valor: number }[] {
  return condiciones.flatMap((c) => {
    if (c.tipo === "toggle") {
      const activo = Boolean(estado[c.id]);
      return {
        etiqueta: activo ? c.etiqueta : `${c.etiqueta} (sin activar)`,
        valor: activo ? c.valorActivo : (c.valorInactivo ?? 0),
      };
    }
    if (c.tipo === "opcion") {
      const elegida = c.opciones.find((o) => o.id === estado[c.id]);
      const etiqueta = `${c.etiqueta}: ${elegida?.etiqueta ?? "—"}`;
      if (elegida?.partes?.length) return elegida.partes.map((p) => ({ etiqueta: `${etiqueta} · ${p.fuente}`, valor: p.valor }));
      return { etiqueta, valor: elegida?.valor ?? 0 };
    }
    const n = typeof estado[c.id] === "number" ? (estado[c.id] as number) : c.porDefecto;
    const d = c.descuento;
    const conDescuento = d && n > c.min ? ` (${d.unidades === 1 ? "uno" : d.unidades} menos: ${d.fuente})` : "";
    return { etiqueta: `${c.etiqueta} ×${n}${conDescuento}`, valor: unidadesContador(c, estado) * c.valorPorUnidad };
  });
}

// Los textos de las condiciones activas AHORA MISMO, con la etiqueta de qué
// condición los trae — el "texto informativo" del §8 de
// docs/modificadores-tiradas.md (Visor Nocturno, Mangual...), que no suma
// número pero sí debe leerse, y de dónde viene. Solo toggle/opción llevan
// `nota`; el contador no tiene sentido de "activo/inactivo" así que no
// aporta ninguna. Pensado para mostrarse junto al resultado, no solo
// mientras se elige — ver AccionModal.
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
//
// `soloEnEspecialidad`: solo cuenta si la tirada va en especialidad (Tirador de Larga
// Distancia Avanzado). `excluyente`: entre los bonos con la misma clave solo vale el mejor
// en el tramo elegido, no se suman (la básica y la Avanzada). Los resuelve
// bonosTramoAplicables, que es lo que suma y pinta montarTirada.
export type BonoPorTramo = {
  fuente: string;
  porTramo: Partial<Record<TramoDistancia, number>>;
  soloEnEspecialidad?: true;
  excluyente?: string;
  // Grupo de no apilamiento con casillas y bonos con alcance (el de la casilla, arriba).
  noApila?: string;
};

function tramoElegido(estado: EstadoCondiciones): TramoDistancia | null {
  return typeof estado.tramo === "string" ? (estado.tramo as TramoDistancia) : null;
}

export function bonosTramoAplicables(bonos: BonoPorTramo[], estado: EstadoCondiciones, enEspecialidad: boolean): BonoPorTramo[] {
  const tramo = tramoElegido(estado);
  const valor = (b: BonoPorTramo) => (tramo ? (b.porTramo[tramo] ?? 0) : 0);
  const validos = bonos.filter((b) => !b.soloEnEspecialidad || enEspecialidad);
  const mejor = new Map<string, BonoPorTramo>();
  for (const b of validos) {
    if (!b.excluyente) continue;
    const actual = mejor.get(b.excluyente);
    if (!actual || valor(b) > valor(actual)) mejor.set(b.excluyente, b);
  }
  return validos.filter((b) => !b.excluyente || mejor.get(b.excluyente) === b);
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
// ContextoAccion (modificadores.ts) para resolver los modificadores con
// alcance "modo" — el Sistema de Retroceso, que solo ayuda en F. Auto.
export function modoElegido(
  condiciones: CondicionTirada[],
  estado: EstadoCondiciones,
): string | null {
  const modo = condiciones.find((c) => c.id === "modo" && c.tipo === "opcion");
  if (!modo || modo.tipo !== "opcion") return null;
  return modo.opciones.find((o) => o.id === estado.modo)?.etiqueta ?? null;
}
