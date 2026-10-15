// Montaje de una tirada (propuesta-especies §3.1, M1): el único sitio que suma lo que
// entra en una tirada y decide sus márgenes de crítico. Las pantallas (filas de
// Acciones, el modal, Fabricar/Reparar, la salvación de sobrecarga) y prepararPoder
// pintan lo que devuelve; no suman nada por su cuenta (regla de ESLint).
//
// Vive aparte de acciones.ts porque depende de la ficha resuelta y de los cuatro
// mecanismos (condiciones.ts, modificadores.ts); acciones.ts se queda con el catálogo
// y la resolución del d12, que no saben de fichas. Ver docs/modificadores-tiradas.md,
// "Montaje: montarTirada".
import { MARGEN_CRITICO, modificadorAccion, resolverTirada, tieneEspecialidad, type Accion, type Resultado } from "./acciones";
import { etiquetaEspecialidad, type EspecialidadId } from "../catalog/especialidades";
import type { Sheet } from "./sheet";
import { APLICADOS, type AplicadoId } from "./atributos";
import { HABILIDADES, type HabilidadId } from "./habilidades";
import {
  bonosTramoAplicables,
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

// Si la tirada va en especialidad. Un ataque con arma (`especialidadArma`) lo sabe solo: en
// especialidad si la ficha tiene la del arma, y si no, a la mitad; lo que se eligiera en la
// fila no cuenta. Igual una acción de dote con especialidad (`especialidadesAccion`), con
// cualquiera de las suyas. El resto de tiradas, lo que eligió el jugador.
export function enEspecialidadEfectiva(sheet: Sheet, tirada: Accion, elegido: boolean): boolean {
  const fijas = especialidadesFijas(tirada);
  if (fijas.length > 0 && tirada.habilidad) return fijas.some((e) => tieneEspecialidad(sheet, tirada.habilidad!, e));
  return elegido;
}

const especialidadesFijas = (t: Accion): readonly EspecialidadId[] =>
  t.especialidadArma ? [t.especialidadArma] : (t.especialidadesAccion ?? []);

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
  // Si al final va en especialidad (enEspecialidadEfectiva).
  enEspecialidad: boolean;
  // Ataque con arma (o acción de dote con especialidad): su especialidad y si la ficha la
  // tiene, para que la fila lo enseñe en vez del selector. Con varias (Apoyo), la que se
  // tenga; sin ninguna, todas ("Empatía o Liderazgo").
  especialidadArma: { id: string; label: string; tiene: boolean } | null;
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

// Márgenes que bajan las casillas marcadas: la opción elegida (VTM nv4 "complejo") o el
// toggle activo ("éxito → crítico" de especie, §14.8). Con varias a la vez gana el
// margen más bajo (decidido en M1a, confirmado en E4).
function margenesDeCondiciones(condiciones: CondicionTirada[], estado: EstadoCondiciones): TiradaMontada["margenes"] {
  let criticoExito = MARGEN_CRITICO;
  for (const c of condiciones) {
    let margen: number | undefined;
    if (c.tipo === "opcion") margen = c.opciones.find((o) => o.id === estado[c.id])?.margenCriticoExito;
    else if (c.tipo === "toggle" && Boolean(estado[c.id])) margen = c.margenCriticoExito;
    if (margen !== undefined) criticoExito = Math.min(criticoExito, margen);
  }
  return { criticoExito, criticoFallo: MARGEN_CRITICO };
}

// El crítico fijo de la tirada (Crítico Mejorado), sin casilla: gana el margen más bajo.
function conCriticoFijo(margenes: TiradaMontada["margenes"], fijo: Accion["criticoFijo"]): TiradaMontada["margenes"] {
  return fijo ? { ...margenes, criticoExito: Math.min(margenes.criticoExito, fijo.margen) } : margenes;
}

export function montarTirada(ficha: FichaParaTirada, tirada: Accion, eleccion: EleccionTirada): TiradaMontada {
  const { sutil, estadoCondiciones: estado, circunstancial } = eleccion;
  const enEspecialidad = enEspecialidadEfectiva(ficha.ficha, tirada, eleccion.enEspecialidad);
  const condiciones = tirada.condiciones ?? [];
  // Sin los que piden especialidad si no se va en ella, y el mejor de los que no se suman.
  const bonosTramo = bonosTramoAplicables(tirada.bonosTramo ?? [], estado, enEspecialidad);
  const ajustesFijos = tirada.ajustesFijos ?? [];

  const mod = modificadorAccion(ficha.ficha, tirada, enEspecialidad, ficha.modificadores, sutil);
  const aplicadoId = sutil && tirada.aplicadoSutil ? tirada.aplicadoSutil : tirada.aplicado;
  const base = mod.total + ajustesFijos.reduce((t, a) => t + a.valor, 0);

  const modo = modoElegido(condiciones, estado);
  const ctx: ContextoAccion = {
    id: tirada.id,
    grupo: tirada.grupo,
    habilidad: tirada.habilidad,
    modoElegido: modo,
    ...(tirada.familiaArma && { familiaArma: tirada.familiaArma }),
    ...(tirada.empleoArma && { empleoArma: tirada.empleoArma }),
  };
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
    enEspecialidad,
    especialidadArma: especialidadFijaMontada(ficha.ficha, tirada, enEspecialidad),
    ajustesFijos,
    base,
    modificador,
    circunstancial,
    total: modificador + circunstancial,
    desglose,
    margenes: conCriticoFijo(margenesDeCondiciones(condiciones, estado), tirada.criticoFijo),
    // El crítico fijo (Crítico Mejorado) va primero, con su línea, en las notas del resultado.
    notas: [
      ...(tirada.criticoFijo
        ? [{ etiqueta: tirada.criticoFijo.fuente, nota: `Crítico con ${tirada.criticoFijo.margen} éxitos en vez de ${MARGEN_CRITICO}.` }]
        : []),
      ...notasCondiciones(condiciones, estado),
    ],
    modoElegido: modo,
  };
}

function especialidadFijaMontada(sheet: Sheet, tirada: Accion, tiene: boolean): TiradaMontada["especialidadArma"] {
  const fijas = especialidadesFijas(tirada);
  const habilidad = tirada.habilidad;
  if (fijas.length === 0 || !habilidad) return null;
  const propias = fijas.filter((e) => tieneEspecialidad(sheet, habilidad, e));
  const mostradas = propias.length > 0 ? propias : fijas;
  return { id: mostradas[0], label: mostradas.map(etiquetaEspecialidad).join(propias.length > 0 ? " / " : " o "), tiene };
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
