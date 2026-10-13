// Montaje de una tirada (propuesta-especies §3.1, M1): el único sitio que suma lo que
// entra en una tirada y decide sus márgenes de crítico. Las pantallas (filas de
// Acciones, el modal, Fabricar/Reparar, la salvación de sobrecarga) y prepararPoder
// pintan lo que devuelve; no suman nada por su cuenta (regla de ESLint).
//
// Vive aparte de acciones.ts porque depende de la ficha resuelta y de los cuatro
// mecanismos (condiciones.ts, modificadores.ts); acciones.ts se queda con el catálogo
// y la resolución del d12, que no saben de fichas. Ver docs/modificadores-tiradas.md,
// "Montaje: montarTirada".
import { MARGEN_CRITICO, modificadorAccion, resolverTirada, type Accion, type Resultado } from "./acciones";
import { APLICADOS, type AplicadoId } from "./atributos";
import { HABILIDADES, type HabilidadId } from "./habilidades";
import {
  desgloseBonosTramo,
  desgloseCondiciones,
  estadoInicial,
  modoElegido,
  notasCondiciones,
  valorBonosTramo,
  valorCondiciones,
  type CondicionTirada,
  type EstadoCondiciones,
} from "./condiciones";
import { bonoAlcance, desgloseAlcance, type ContextoAccion } from "./modificadores";
import type { FichaResuelta } from "./fichaResuelta";

// Lo único de la ficha resuelta que hace falta para montar: prepararPoder lo arma con
// la ficha y los modificadores que recibe.
export type FichaParaTirada = Pick<FichaResuelta, "ficha" | "modificadores">;

// Lo que elige el jugador: en la fila (especialidad, Sutil) y en el modal (casillas y
// circunstancial).
export type EleccionTirada = {
  enEspecialidad: boolean;
  sutil: boolean;
  estadoCondiciones: EstadoCondiciones;
  circunstancial: number;
};

export const SIN_ELECCION: EleccionTirada = { enEspecialidad: false, sutil: false, estadoCondiciones: {}, circunstancial: 0 };

// La tirada tal como abre el modal, sin tocar nada: las casillas en su estado inicial
// y sin circunstancial. Con esto monta la fila, y su `modificador` es el mismo número
// que el modal recién abierto (M1b).
export function eleccionSinTocar(tirada: Accion, enEspecialidad: boolean, sutil = false): EleccionTirada {
  return { enEspecialidad, sutil, estadoCondiciones: estadoInicial(tirada.condiciones ?? []), circunstancial: 0 };
}

export type LineaDesglose = { etiqueta: string; valor: number };

export type TiradaMontada = {
  aplicado: { id: AplicadoId; valor: number };
  habilidad: { id: HabilidadId; valor: number } | null;
  ajustesFijos: { valor: number; fuente: string }[];
  // Aplicado + habilidad + ajustes fijos.
  base: number;
  // base + modificadores de alcance (también los umbrales de §7) + casillas + bonos por
  // tramo (sin circunstancial): el `modificador` del Resultado. Montada con
  // eleccionSinTocar, es lo que enseña la fila.
  modificador: number;
  circunstancial: number;
  total: number;
  // En el orden del modal: aplicado, habilidad, ajustes fijos, alcance (por fuente),
  // casillas, bonos por tramo y circunstancial (solo si no es 0).
  desglose: LineaDesglose[];
  // Un éxito es crítico con margen ≥ criticoExito; un fracaso, con margen ≤ −criticoFallo.
  margenes: { criticoExito: number; criticoFallo: number };
  notas: { etiqueta: string; nota: string }[];
  modoElegido: string | null;
};

// Márgenes que bajan las opciones elegidas (VTM nv4 "complejo": cualquier éxito es
// crítico). TODO(revisar): con dos fuentes activas a la vez se queda el margen más bajo;
// hoy solo existe la VTM, decidirlo cuando llegue la segunda (E4: "éxito → crítico").
function margenesDeCondiciones(condiciones: CondicionTirada[], estado: EstadoCondiciones): TiradaMontada["margenes"] {
  let criticoExito = MARGEN_CRITICO;
  for (const c of condiciones) {
    if (c.tipo !== "opcion") continue;
    const elegida = c.opciones.find((o) => o.id === estado[c.id]);
    if (elegida?.margenCriticoExito !== undefined) criticoExito = Math.min(criticoExito, elegida.margenCriticoExito);
  }
  return { criticoExito, criticoFallo: MARGEN_CRITICO };
}

export function montarTirada(ficha: FichaParaTirada, tirada: Accion, eleccion: EleccionTirada): TiradaMontada {
  const { enEspecialidad, sutil, estadoCondiciones: estado, circunstancial } = eleccion;
  const condiciones = tirada.condiciones ?? [];
  const bonosTramo = tirada.bonosTramo ?? [];
  const ajustesFijos = tirada.ajustesFijos ?? [];

  const mod = modificadorAccion(ficha.ficha, tirada, enEspecialidad, ficha.modificadores, sutil);
  const aplicadoId = sutil && tirada.aplicadoSutil ? tirada.aplicadoSutil : tirada.aplicado;
  const base = mod.total + ajustesFijos.reduce((t, a) => t + a.valor, 0);

  const modo = modoElegido(condiciones, estado);
  const ctx: ContextoAccion = { id: tirada.id, grupo: tirada.grupo, habilidad: tirada.habilidad, modoElegido: modo };
  const modificador =
    base + bonoAlcance(ficha.modificadores, ctx) + valorCondiciones(condiciones, estado) + valorBonosTramo(bonosTramo, estado);

  const habilidadLabel = tirada.habilidad ? HABILIDADES.find((h) => h.id === tirada.habilidad)!.label : null;
  const desglose: LineaDesglose[] = [
    { etiqueta: APLICADOS.find((a) => a.id === aplicadoId)!.label, valor: mod.aplicado },
    ...(habilidadLabel
      ? [{ etiqueta: `${habilidadLabel}${enEspecialidad ? " (especialidad)" : ""}`, valor: mod.habilidad ?? 0 }]
      : []),
    ...ajustesFijos.map((a) => ({ etiqueta: a.fuente, valor: a.valor })),
    ...desgloseAlcance(ficha.modificadores, ctx),
    ...desgloseCondiciones(condiciones, estado),
    ...desgloseBonosTramo(bonosTramo, estado),
    ...(circunstancial !== 0 ? [{ etiqueta: "Modificador circunstancial", valor: circunstancial }] : []),
  ];

  return {
    aplicado: { id: aplicadoId, valor: mod.aplicado },
    habilidad: tirada.habilidad ? { id: tirada.habilidad, valor: mod.habilidad ?? 0 } : null,
    ajustesFijos,
    base,
    modificador,
    circunstancial,
    total: modificador + circunstancial,
    desglose,
    margenes: margenesDeCondiciones(condiciones, estado),
    notas: notasCondiciones(condiciones, estado),
    modoElegido: modo,
  };
}

// La tirada ya montada contra el dado y la dificultad, con sus márgenes.
export function tirarMontada(montada: TiradaMontada, dado: number, dificultad: number | null): Resultado {
  return resolverTirada({
    dado,
    modificador: montada.modificador,
    circunstancial: montada.circunstancial,
    dificultad,
    margenCriticoExito: montada.margenes.criticoExito,
    margenCriticoFallo: montada.margenes.criticoFallo,
  });
}
