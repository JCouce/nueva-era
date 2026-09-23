// Modificadores: la vía única por la que cualquier cosa altera los números de
// un personaje.
//
// Razas, dotes, aumentos, equipo y estados hacen todos lo mismo —subir un
// atributo, cambiar un derivado, regalar habilidad, afectar a un tipo de
// tirada—, así que comparten un solo tipo. Cuando lleguen los poderes o los
// aumentos reales, serán datos nuevos en el catálogo, no código nuevo.
import type { AtributoId } from "./atributos";
import type { HabilidadId } from "./habilidades";

// Valores derivados que algo puede modificar directamente.
export const DERIVADOS_MODIFICABLES = [
  "vida",
  "fatiga",
  "alerta",
  "carrera",
  "carga",
] as const;
export type DerivadoId = (typeof DERIVADOS_MODIFICABLES)[number];

// Los grupos de la pestaña Acciones. Vive aquí (y no en acciones.ts, donde se
// usa) para que Modificador pueda dirigir un bono a un grupo entero sin que
// este fichero, más bajo en la cadena de imports, dependa de aquel.
// "Ataques" y "Herramientas" no viven en ACCIONES ni en GRUPOS_ACCION: los
// generan combate.ts y herramientas.ts a partir del equipo, no el catálogo
// fijo — ver el comentario de cabecera de tiradas.ts.
export type GrupoAccion =
  | "Ataques"
  | "Defensa"
  | "Salvaciones"
  | "Iniciativa"
  | "Acciones"
  | "Herramientas";

// A qué tirada(s) afecta un modificador de tipo "tirada". Cerrado a propósito
// — ver docs/modificadores-tiradas.md antes de añadir un sexto caso:
//
//   tiradaId  → una tirada concreta, por su id estable ("salv_fortaleza").
//               Sirve para las fijas de ACCIONES; las de ataque generadas por
//               combate.ts tienen id por instancia, así que esto no las
//               alcanza — para esas ya existen ajustesFijos/bonosTramo/
//               condiciones, más precisos.
//   grupo     → todas las tiradas de un grupo (Salvaciones, Acciones...).
//   habilidad → cualquier tirada que use esa habilidad, sea cual sea.
//   modo      → solo si el modo de disparo/golpe elegido contiene ese texto
//               ("F. Auto"). Exige que la tirada tenga condición "modo".
//   todas     → cualquier tirada, sin excepción. Para los "-1/-3/-5 a todo"
//               de los umbrales de salud/fatiga (docs/sistema.md §7) y los
//               estados que penalizan toda acción por igual — no hay forma
//               de expresar eso con los otros cuatro casos sin enumerar
//               grupos a mano y arriesgarse a que un grupo nuevo se quede
//               fuera en silencio.
export type AlcanceModificador =
  | { tipo: "tiradaId"; id: string }
  | { tipo: "grupo"; grupo: GrupoAccion }
  | { tipo: "habilidad"; habilidad: HabilidadId }
  | { tipo: "modo"; contieneEtiqueta: string }
  | { tipo: "todas" };

export type Modificador =
  | { tipo: "atributo"; id: AtributoId; valor: number }
  | { tipo: "derivado"; id: DerivadoId; valor: number }
  | { tipo: "habilidad"; id: HabilidadId; valor: number }
  | { tipo: "tirada"; alcance: AlcanceModificador; valor: number };

export type OrigenModificador =
  | "especie"
  | "dote"
  | "aumento"
  | "equipo"
  | "estado";

// Un modificador con su procedencia, para que la ficha pueda explicar de dónde
// sale cada número en vez de mostrar un total opaco.
export type ModificadorConFuente = Modificador & {
  origen: OrigenModificador;
  fuente: string; // etiqueta legible: "Arkorü", "Malherido", "Exoesqueleto 2"…
};

export function bonoAtributo(
  mods: ModificadorConFuente[],
  id: AtributoId,
): number {
  return mods.reduce(
    (t, m) => (m.tipo === "atributo" && m.id === id ? t + m.valor : t),
    0,
  );
}

export function bonoDerivado(
  mods: ModificadorConFuente[],
  id: DerivadoId,
): number {
  return mods.reduce(
    (t, m) => (m.tipo === "derivado" && m.id === id ? t + m.valor : t),
    0,
  );
}

export function bonoHabilidad(
  mods: ModificadorConFuente[],
  id: HabilidadId,
): number {
  return mods.reduce(
    (t, m) => (m.tipo === "habilidad" && m.id === id ? t + m.valor : t),
    0,
  );
}

// Lo que hace falta saber de una tirada concreta para decidir si le toca un
// modificador de alcance "tiradaId"/"grupo"/"habilidad"/"modo". La UI lo
// arma: `id`/`grupo`/`habilidad` salen de la propia Accion; `modoElegido` es
// la etiqueta de la opción de la condición "modo" que esté seleccionada
// ahora mismo en el modal (o null si no hay tal condición o no aplica).
export type ContextoAccion = {
  id: string;
  grupo: GrupoAccion;
  habilidad: HabilidadId | null;
  modoElegido: string | null;
};

// Exportada para condicionesActivas() (equipo.ts) — mismo criterio de alcance
// para CondicionTirada que para Modificador, sin duplicar la lógica de match.
export function alcanzaA(alcance: AlcanceModificador, ctx: ContextoAccion): boolean {
  if (alcance.tipo === "todas") return true;
  if (alcance.tipo === "tiradaId") return alcance.id === ctx.id;
  if (alcance.tipo === "grupo") return alcance.grupo === ctx.grupo;
  if (alcance.tipo === "habilidad") return alcance.habilidad === ctx.habilidad;
  return ctx.modoElegido !== null && ctx.modoElegido.includes(alcance.contieneEtiqueta);
}

export function bonoAlcance(mods: ModificadorConFuente[], ctx: ContextoAccion): number {
  return mods.reduce(
    (t, m) => (m.tipo === "tirada" && alcanzaA(m.alcance, ctx) ? t + m.valor : t),
    0,
  );
}

// Una línea por modificador que le toca a esta tirada ahora mismo, con su
// fuente — mismo patrón que desgloseCondiciones/desgloseBonosTramo.
export function desgloseAlcance(
  mods: ModificadorConFuente[],
  ctx: ContextoAccion,
): { etiqueta: string; valor: number }[] {
  return mods
    .filter((m): m is Extract<Modificador, { tipo: "tirada" }> & ModificadorConFuente =>
      m.tipo === "tirada" && alcanzaA(m.alcance, ctx),
    )
    .map((m) => ({ etiqueta: m.fuente, valor: m.valor }));
}

// Agrupa por fuente para poder mostrar "Arkorü: +1 Aguante" en la ficha.
export function porFuente(
  mods: ModificadorConFuente[],
): { fuente: string; origen: OrigenModificador; mods: ModificadorConFuente[] }[] {
  const mapa = new Map<string, ModificadorConFuente[]>();
  for (const m of mods) {
    const lista = mapa.get(m.fuente) ?? [];
    lista.push(m);
    mapa.set(m.fuente, lista);
  }
  return [...mapa.entries()].map(([fuente, lista]) => ({
    fuente,
    origen: lista[0].origen,
    mods: lista,
  }));
}
