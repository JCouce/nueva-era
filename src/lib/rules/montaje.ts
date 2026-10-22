// Montaje de una tirada (propuesta-especies §3.1, M1): el único sitio que suma lo que
// entra en una tirada y decide sus márgenes de crítico. Las pantallas (filas de
// Acciones, el modal, Fabricar/Reparar, la salvación de sobrecarga) y prepararPoder
// pintan lo que devuelve; no suman nada por su cuenta (regla de ESLint).
//
// Vive aparte de acciones.ts porque depende de la ficha resuelta y de los cuatro
// mecanismos (condiciones.ts, modificadores.ts); acciones.ts se queda con el catálogo
// y la resolución del d12, que no saben de fichas. Ver docs/modificadores-tiradas.md,
// "Montaje: montarTirada".
import {
  MARGEN_CRITICO,
  modificadorAccion,
  resolverTirada,
  tieneEspecialidad,
  type Accion,
  type AjusteDanio,
  type Resultado,
} from "./acciones";
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
  type BonoPorTramo,
  type CondicionTirada,
  type EstadoCondiciones,
  type OpcionCondicion,
  type TramoDistancia,
} from "./condiciones";
import {
  alcanzaA,
  bonoAlcance,
  desgloseAlcance,
  descartadosPorNoApila,
  type ContextoAccion,
  type ModificadorConFuente,
} from "./modificadores";
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
  // Lo que hacen las casillas marcadas además de sumar (D2d, condiciones.ts), cada cosa con
  // la etiqueta de la casilla que la trae como fuente:
  //   ventaja     dos d12 y vale el mejor: la de la tirada (Alerta con Resonancia 4) o la de
  //               una casilla (Ojo Clínico). null sin ventaja. No se acumula.
  //   subeGrado   un fracaso (no el crítico) cuenta como éxito; lo aplica tirarMontada.
  //   danio       cambios al daño del ataque; los aplica resolverDanio (acciones.ts).
  //   costeFatiga fatiga que se paga al tirar (Ojo Clínico); 0 si ninguna.
  ventaja: string | null;
  subeGrado: string | null;
  danio: AjusteDanio;
  costeFatiga: number;
};

const SIN_AJUSTE_DANIO: AjusteDanio = { ajustes: [], categoria: null, sinBonoExitos: null };

type Toggle = Extract<CondicionTirada, { tipo: "toggle" }>;

// Cambios al daño de las casillas marcadas. «Derribo con acción estándar» (conBonoExitos)
// devuelve el bono por éxitos que quita «Derribo» (sinBonoExitos).
function danioDeCasillas(activas: Toggle[]): AjusteDanio {
  const conDanio = activas.filter((c) => c.danio);
  if (conDanio.length === 0) return SIN_AJUSTE_DANIO;
  const categoria = conDanio.find((c) => c.danio!.categoria);
  const sinBono = conDanio.find((c) => c.danio!.sinBonoExitos);
  const devuelve = conDanio.some((c) => c.danio!.conBonoExitos);
  return {
    ajustes: conDanio.filter((c) => c.danio!.ajuste).map((c) => ({ valor: c.danio!.ajuste!, fuente: c.etiqueta })),
    categoria: categoria ? { a: categoria.danio!.categoria!, fuente: categoria.etiqueta } : null,
    sinBonoExitos: sinBono && !devuelve ? sinBono.etiqueta : null,
  };
}

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

// No apilamiento (A2a, `noApila`): de lo que entra en la tirada con el mismo grupo (bonos con
// alcance, casillas marcadas y bonos por tramo en el tramo elegido) solo vale el mayor. Los
// demás se quedan en el desglose a 0, diciendo con cuál no se suman: nada desaparece.
type Entradas = { mods: ModificadorConFuente[]; condiciones: CondicionTirada[]; bonosTramo: BonoPorTramo[] };

function sinApilar(e: Entradas, ctx: ContextoAccion, estado: EstadoCondiciones): Entradas {
  type Aporte = { grupo: string | undefined; valor: number; fuente: string; ref: unknown };
  const tramo = typeof estado.tramo === "string" ? (estado.tramo as TramoDistancia) : null;
  const aportes: Aporte[] = [
    ...e.mods.flatMap((m): Aporte[] =>
      m.tipo === "tirada" && m.noApila && alcanzaA(m.alcance, ctx) ? [{ grupo: m.noApila, valor: m.valor, fuente: m.fuente, ref: m }] : [],
    ),
    ...e.condiciones.flatMap((c): Aporte[] =>
      c.tipo === "toggle" && c.noApila && Boolean(estado[c.id]) ? [{ grupo: c.noApila, valor: c.valorActivo, fuente: c.etiqueta, ref: c }] : [],
    ),
    ...e.bonosTramo.flatMap((b): Aporte[] =>
      b.noApila && tramo ? [{ grupo: b.noApila, valor: b.porTramo[tramo] ?? 0, fuente: b.fuente, ref: b }] : [],
    ),
  ];
  const fuera = descartadosPorNoApila(aportes, (a) => a.grupo, (a) => a.valor);
  if (fuera.size === 0) return e;
  const porRef = new Map([...fuera].map(([a, gana]) => [a.ref, `no se suma con ${gana.fuente}`]));
  return {
    mods: e.mods.map((m) => (porRef.has(m) ? { ...m, valor: 0, fuente: `${m.fuente} (${porRef.get(m)})` } : m)),
    condiciones: e.condiciones.map((c) =>
      c.tipo === "toggle" && porRef.has(c) ? { ...c, valorActivo: 0, etiqueta: `${c.etiqueta} (${porRef.get(c)})` } : c,
    ),
    bonosTramo: e.bonosTramo.map((b) => (porRef.has(b) ? { ...b, porTramo: {}, fuente: `${b.fuente} (${porRef.get(b)})` } : b)),
  };
}

// La opción elegida de cada condición de tipo opción.
function opcionesElegidas(condiciones: CondicionTirada[], estado: EstadoCondiciones): OpcionCondicion[] {
  return condiciones.flatMap((c) => {
    if (c.tipo !== "opcion") return [];
    const o = c.opciones.find((x) => x.id === estado[c.id]);
    return o ? [o] : [];
  });
}

export function montarTirada(ficha: FichaParaTirada, tirada: Accion, eleccion: EleccionTirada): TiradaMontada {
  const { sutil, estadoCondiciones: estado, circunstancial } = eleccion;
  const enEspecialidad = enEspecialidadEfectiva(ficha.ficha, tirada, eleccion.enEspecialidad);
  const ajustesFijos = tirada.ajustesFijos ?? [];
  const ctx: ContextoAccion = {
    id: tirada.id,
    grupo: tirada.grupo,
    habilidad: tirada.habilidad,
    modoElegido: modoElegido(tirada.condiciones ?? [], estado),
    ...(tirada.familiaArma && { familiaArma: tirada.familiaArma }),
    ...(tirada.empleoArma && { empleoArma: tirada.empleoArma }),
    ...(tirada.desarmado && { desarmado: true }),
    ...(tirada.contundente && { contundente: true }),
    ...(tirada.especialidadArma && { especialidadArma: tirada.especialidadArma }),
  };
  // Sin los que piden especialidad si no se va en ella, y el mejor de los que no se suman.
  const { mods, condiciones, bonosTramo } = sinApilar(
    {
      mods: ficha.modificadores,
      condiciones: tirada.condiciones ?? [],
      bonosTramo: bonosTramoAplicables(tirada.bonosTramo ?? [], estado, enEspecialidad),
    },
    ctx,
    estado,
  );

  const activas = condiciones.filter((c): c is Toggle => c.tipo === "toggle" && Boolean(estado[c.id]));
  // Casilla que cambia el aplicado (Negociación Analítica): manda sobre el estilo Sutil.
  const otroAplicado = activas.find((c) => c.aplicado)?.aplicado;
  const mod = otroAplicado
    ? modificadorAccion(ficha.ficha, { ...tirada, aplicado: otroAplicado }, enEspecialidad, mods, false)
    : modificadorAccion(ficha.ficha, tirada, enEspecialidad, mods, sutil);
  const aplicadoId = otroAplicado ?? (sutil && tirada.aplicadoSutil ? tirada.aplicadoSutil : tirada.aplicado);
  const base = mod.total + ajustesFijos.reduce((t, a) => t + a.valor, 0);

  const modo = ctx.modoElegido;
  const elegidas = opcionesElegidas(condiciones, estado);
  const modificador =
    base + bonoAlcance(mods, ctx) + valorCondiciones(condiciones, estado) + valorBonosTramo(bonosTramo, estado);

  const habilidadLabel = tirada.habilidad ? HABILIDADES.find((h) => h.id === tirada.habilidad)!.label : null;
  const desglose: LineaDesglose[] = [
    { etiqueta: APLICADOS.find((a) => a.id === aplicadoId)!.label, valor: mod.aplicado },
    ...(habilidadLabel
      ? [{ etiqueta: `${habilidadLabel}${enEspecialidad ? " (especialidad)" : ""}`, valor: mod.habilidad ?? 0 }]
      : []),
    ...ajustesFijos.map((a) => ({ etiqueta: a.fuente, valor: a.valor })),
    ...desgloseAlcance(mods, ctx),
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
    ventaja: tirada.ventaja ?? activas.find((c) => c.ventaja)?.etiqueta ?? ventajaDeOpcion(elegidas),
    subeGrado: activas.find((c) => c.subeGrado)?.etiqueta ?? null,
    danio: danioDeCasillas(activas),
    costeFatiga:
      activas.reduce((t, c) => t + (c.costeFatiga ?? 0), 0) + elegidas.reduce((t, o) => t + (o.costeFatiga ?? 0), 0),
  };
}

function ventajaDeOpcion(elegidas: OpcionCondicion[]): string | null {
  const o = elegidas.find((x) => x.ventaja);
  return o ? (o.fuenteVentaja ?? o.etiqueta) : null;
}

function especialidadFijaMontada(sheet: Sheet, tirada: Accion, tiene: boolean): TiradaMontada["especialidadArma"] {
  const fijas = especialidadesFijas(tirada);
  const habilidad = tirada.habilidad;
  if (fijas.length === 0 || !habilidad) return null;
  const propias = fijas.filter((e) => tieneEspecialidad(sheet, habilidad, e));
  const mostradas = propias.length > 0 ? propias : fijas;
  return { id: mostradas[0], label: mostradas.map(etiquetaEspecialidad).join(propias.length > 0 ? " / " : " o "), tiene };
}

// La tirada ya montada contra el dado y la dificultad, con sus márgenes. Con una casilla de
// fracaso → éxito marcada (Balanceo, Como Pez en el Agua), el fracaso normal cuenta como éxito
// sin éxitos de más (margen 0); el fracaso crítico se queda (§9.5).
export function tirarMontada(montada: TiradaMontada, dado: number, dificultad: number | null): Resultado {
  const r = resolverTirada({
    dado,
    modificador: montada.modificador,
    circunstancial: montada.circunstancial,
    dificultad,
    margenCriticoExito: montada.margenes.criticoExito,
    margenCriticoFallo: montada.margenes.criticoFallo,
  });
  if (!montada.subeGrado || r.exito !== false || r.critico || r.margen === null) return r;
  return { ...r, exito: true, margen: 0, cambioGrado: { fuente: montada.subeGrado, margenOriginal: r.margen } };
}
