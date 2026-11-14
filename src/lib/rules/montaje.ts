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
  especialidadesDeTirada,
  modificadorAccion,
  resolverTirada,
  tieneEspecialidad,
  type Accion,
  type AjusteDanio,
  type Resultado,
} from "./acciones";
import { etiquetaEspecialidad, type EspecialidadId } from "../catalog/especialidades";
import type { Sheet } from "./sheet";
import { APLICADOS, ATRIBUTOS, type AplicadoId } from "./atributos";
import { aplicado as valorAplicado, atributoEfectivo } from "./derivados";
import { HABILIDADES, type HabilidadId } from "./habilidades";
import {
  bonosTramoAplicables,
  desgloseBonosTramo,
  desgloseCondiciones,
  estadoInicial,
  modoElegido,
  notasCondiciones,
  valorBonoTramo,
  valorBonosTramo,
  valorCondiciones,
  type AtributosExtremidad,
  type BonoPorTramo,
  type CondicionTirada,
  type EstadoCondiciones,
  type NotaMontada,
  type OpcionCondicion,
} from "./condiciones";
import type { OrigenAporte } from "./origen";
import { etiquetaShock } from "./shock";
import {
  alcanzaA,
  bonoAlcance,
  conPenalizadoresAnulados,
  desgloseAlcance,
  descartadosPorNoApila,
  penalizadoresAnulados,
  type ContextoAccion,
  type ModificadorConFuente,
  type RecursoUmbral,
} from "./modificadores";
import type { FichaResuelta } from "./fichaResuelta";

// Lo único de la ficha resuelta que hace falta para montar: prepararPoder lo arma con
// la ficha y los modificadores que recibe.
export type FichaParaTirada = Pick<FichaResuelta, "ficha" | "modificadores">;

// Lo que elige el jugador: en la fila (Sutil) y en el modal (casillas y circunstancial). La
// especialidad no se elige: la decide la tirada (enEspecialidadEfectiva).
export type EleccionTirada = {
  sutil: boolean;
  estadoCondiciones: EstadoCondiciones;
  circunstancial: number;
};

export const SIN_ELECCION: EleccionTirada = { sutil: false, estadoCondiciones: {}, circunstancial: 0 };

// Si la tirada va en especialidad: solo la que nombra una especialidad (la del arma,
// `especialidadArma`; la de la acción, `especialidadesAccion`, con cualquiera de las suyas; o
// las candidatas de `especialidadAElegir` mientras no se elija) y la ficha la tiene.
export function enEspecialidadEfectiva(sheet: Sheet, tirada: Accion): boolean {
  const fijas = especialidadesFijas(tirada);
  if (fijas.length === 0 || !tirada.habilidad) return false;
  return fijas.some((e) => tieneEspecialidad(sheet, tirada.habilidad!, e));
}

const especialidadesFijas = (t: Accion): readonly EspecialidadId[] => especialidadesDeTirada(t, true);

// Regla general (docs/sistema.md §3, usuario 2026-10-23): si la tirada no nombra especialidad,
// la habilidad suma entera; si la nombra, entera solo si la ficha la tiene, y si no, a la mitad.
export function habilidadEntera(sheet: Sheet, tirada: Accion): boolean {
  return especialidadesFijas(tirada).length === 0 || enEspecialidadEfectiva(sheet, tirada);
}

// La tirada tal como abre el modal, sin tocar nada: las casillas en su estado inicial
// y sin circunstancial. Con esto monta la fila, y su `modificador` es el mismo número
// que el modal recién abierto (M1b).
export function eleccionSinTocar(tirada: Accion, sutil = false): EleccionTirada {
  return { sutil, estadoCondiciones: estadoInicial(tirada.condiciones ?? []), circunstancial: 0 };
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
  notas: NotaMontada[];
  modoElegido: string | null;
  // Lo que hacen las casillas marcadas además de sumar (D2d, condiciones.ts), cada cosa con
  // la etiqueta de la casilla que la trae como fuente:
  //   ventaja     dos d12 y vale el mejor: la de la tirada (Alerta con Resonancia 4) o la de
  //               una casilla (Ojo Clínico). null sin ventaja. No se acumula.
  //   subeGrado   un fracaso (no el crítico) cuenta como éxito; lo aplica tirarMontada.
  //   danio       cambios al daño del ataque; los aplica resolverDanio (acciones.ts).
  //   costeFatiga fatiga que se paga al tirar (Ojo Clínico, y la fija de la tirada: Tempestad
  //               Nanobótica), ya sin lo que ahorre una casilla
  //               (Mielinización Central), sin bajar de 0; 0 si ninguna.
  //   ahorroSinUsar lo que la casilla de ahorro no ha encontrado que ahorrar en las casillas:
  //               se resta del coste del poder (usarPoder), si la tirada es de un poder.
  ventaja: string | null;
  subeGrado: string | null;
  danio: AjusteDanio;
  costeFatiga: number;
  ahorroSinUsar: number;
  // Casillas por aplicado (A2b) que no casan con el aplicado con el que se tira (Sutil o una
  // casilla que lo cambia): por id, el motivo. No suman ni dan ventaja ni cobran; el modal
  // las enseña con el motivo.
  casillasSinEfecto: Record<string, string>;
  // Usos "una vez por escena" que gasta esta tirada (A4a, usosEscena.ts): las casillas con
  // `usoPorEscena` marcadas y con efecto. Una sin efecto (por el aplicado) no gasta, ni el
  // ahorro de Mielinización si no ha ahorrado nada (sin casillas de pago y fuera de un poder).
  // Las bloqueadas ("Usada esta escena") cuentan como desmarcadas.
  usosEscena: string[];
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
  const multiplica = conDanio.find((c) => c.danio!.multiplica);
  return {
    ajustes: conDanio.filter((c) => c.danio!.ajuste).map((c) => ({ valor: c.danio!.ajuste!, fuente: c.etiqueta })),
    categoria: categoria ? { a: categoria.danio!.categoria!, fuente: categoria.etiqueta } : null,
    sinBonoExitos: sinBono && !devuelve ? sinBono.etiqueta : null,
    ...(multiplica && { multiplica: { valor: multiplica.danio!.multiplica!, fuente: multiplica.etiqueta } }),
  };
}

// Daño fijo de la propia tirada (Tempestad Nanobótica, A4b): sin bono por éxitos, y ninguna
// casilla lo devuelve.
function conDanioFijo(ajuste: AjusteDanio, fuente: string | undefined): AjusteDanio {
  return fuente ? { ...ajuste, sinBonoExitos: fuente } : ajuste;
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

// Fallo → fallo crítico (Elión): margen ≤ −1, cualquier fracaso.
function conFalloCritico(margenes: TiradaMontada["margenes"], fuente: string | null): TiradaMontada["margenes"] {
  return fuente ? { ...margenes, criticoFallo: 1 } : margenes;
}

// No apilamiento (A2a, `noApila`): de lo que entra en la tirada con el mismo grupo (bonos con
// alcance, casillas marcadas, bonos por tramo en el tramo elegido y ajustes fijos: el +5 del
// Nano-Elixir frente al Enjambre Nanobot, au-07) solo vale el mayor. Los
// demás se quedan en el desglose a 0, diciendo con cuál no se suman: nada desaparece.
// `incluidos` (Accion.yaIncluidos, td-06): lo del grupo que ya va en los números de la tirada
// (la mira de serie del fusil de precisión). No suma; el mayor del grupo aporta solo lo que lo
// supera, y lo dice en su etiqueta.
type AjusteFijo = NonNullable<Accion["ajustesFijos"]>[number];
type Entradas = { mods: ModificadorConFuente[]; condiciones: CondicionTirada[]; bonosTramo: BonoPorTramo[]; ajustes: AjusteFijo[] };

function sinApilar(e: Entradas, ctx: ContextoAccion, estado: EstadoCondiciones, incluidos: readonly BonoPorTramo[] = []): Entradas {
  type Aporte = { grupo: string | undefined; valor: number; fuente: string; ref: unknown };
  const aportes: Aporte[] = [
    ...e.mods.flatMap((m): Aporte[] =>
      m.tipo === "tirada" && m.noApila && alcanzaA(m.alcance, ctx) ? [{ grupo: m.noApila, valor: m.valor, fuente: m.fuente, ref: m }] : [],
    ),
    ...e.condiciones.flatMap((c): Aporte[] =>
      c.tipo === "toggle" && c.noApila && Boolean(estado[c.id]) ? [{ grupo: c.noApila, valor: c.valorActivo, fuente: c.etiqueta, ref: c }] : [],
    ),
    ...e.bonosTramo.flatMap((b): Aporte[] =>
      b.noApila && typeof estado[b.condicion ?? "tramo"] === "string"
        ? [{ grupo: b.noApila, valor: valorBonoTramo(b, estado), fuente: b.fuente, ref: b }]
        : [],
    ),
    ...e.ajustes.flatMap((a): Aporte[] => (a.noApila ? [{ grupo: a.noApila, valor: a.valor, fuente: a.fuente, ref: a }] : [])),
  ];
  const fuera = descartadosPorNoApila(aportes, (a) => a.grupo, (a) => a.valor);
  // Lo ya incluido de cada grupo (el mayor, si hay varios) en lo elegido ahora.
  const yaVa = new Map<string, { valor: number; fuente: string }>();
  for (const b of incluidos) {
    const v = valorBonoTramo(b, estado);
    if (b.noApila && v > 0 && v > (yaVa.get(b.noApila)?.valor ?? 0)) yaVa.set(b.noApila, { valor: v, fuente: b.fuente });
  }
  const porRef = new Map<unknown, { valor: number; nota: string }>(
    [...fuera].map(([a, gana]) => [a.ref, { valor: 0, nota: `no se suma con ${gana.fuente}` }]),
  );
  for (const a of aportes) {
    const inc = a.grupo ? yaVa.get(a.grupo) : undefined;
    if (!inc || a.valor <= 0 || fuera.has(a)) continue;
    const queda = Math.max(0, a.valor - inc.valor);
    porRef.set(a.ref, { valor: queda, nota: queda > 0 ? `solo lo que supera a ${inc.fuente}` : `no supera a ${inc.fuente}` });
  }
  if (porRef.size === 0) return e;
  return {
    mods: e.mods.map((m) => {
      const r = m.tipo === "tirada" ? porRef.get(m) : undefined;
      return m.tipo === "tirada" && r ? { ...m, valor: r.valor, fuente: `${m.fuente} (${r.nota})` } : m;
    }),
    condiciones: e.condiciones.map((c) => {
      const r = c.tipo === "toggle" ? porRef.get(c) : undefined;
      return c.tipo === "toggle" && r ? { ...c, valorActivo: r.valor, etiqueta: `${c.etiqueta} (${r.nota})` } : c;
    }),
    bonosTramo: e.bonosTramo.map((b) => {
      const r = porRef.get(b);
      return r ? { ...b, porTramo: { [String(estado[b.condicion ?? "tramo"])]: r.valor }, fuente: `${b.fuente} (${r.nota})` } : b;
    }),
    ajustes: e.ajustes.map((a) => {
      const r = porRef.get(a);
      return r ? { ...a, valor: r.valor, fuente: `${a.fuente} (${r.nota})` } : a;
    }),
  };
}

// Casillas que reducen el penalizador por heridas o fatiga solo en esta tirada (fármacos, fa-01):
// su `valorActivo` pasa a ser lo que compensan de verdad, sin pasar de 0 lo que le queda al umbral
// en esta tirada (tras especie, aumentos y compensaciones; con Proyección, nada). Entre ellas, por
// recurso, solo vale la mayor (fa-02); la que se queda sin nada lo dice en su etiqueta.
const RECURSOS_UMBRAL: readonly RecursoUmbral[] = ["salud", "fatiga"];

function conReduccionesDeUmbral(
  condiciones: CondicionTirada[],
  estado: EstadoCondiciones,
  mods: ModificadorConFuente[],
  ctx: ContextoAccion,
): CondicionTirada[] {
  const reductoras = condiciones.filter((c): c is Toggle => c.tipo === "toggle" && c.reduceUmbral !== undefined);
  if (reductoras.length === 0) return condiciones;
  const anulados = penalizadoresAnulados(mods, ctx);
  const compensa = new Map<Toggle, number>();
  const pierdeCon = new Map<Toggle, string>();
  for (const recurso of RECURSOS_UMBRAL) {
    const cuanto = (c: Toggle) => c.reduceUmbral?.[recurso] ?? 0;
    const marcadas = reductoras.filter((c) => Boolean(estado[c.id]) && cuanto(c) > 0);
    if (marcadas.length === 0) continue;
    const neto = anulados
      ? 0
      : mods.reduce((t, m) => (m.tipo === "tirada" && m.umbral === recurso && alcanzaA(m.alcance, ctx) ? t + m.valor : t), 0);
    const gana = marcadas.reduce((mejor, c) => (cuanto(c) > cuanto(mejor) ? c : mejor));
    compensa.set(gana, (compensa.get(gana) ?? 0) + Math.max(0, Math.min(cuanto(gana), -neto)));
    for (const c of marcadas) if (c !== gana) pierdeCon.set(c, gana.etiqueta);
  }
  return condiciones.map((c) => {
    if (c.tipo !== "toggle" || !c.reduceUmbral) return c;
    const gana = !compensa.has(c) ? pierdeCon.get(c) : undefined;
    return { ...c, valorActivo: compensa.get(c) ?? 0, ...(gana && { etiqueta: `${c.etiqueta} (no se suma con ${gana})` }) };
  });
}

// Las casillas con alcance "aplicado" (A2b de aumentos) se recogen antes de abrir la tirada
// con los aplicados con los que podría tirarse (consultaIndiceCondiciones); aquí, ya sabido el
// de verdad (usuario, 2026-10-22: tras Sutil y casillas como Negociación Analítica), las que no
// casan se quedan en el modal pero sin efecto: a 0, sin ventaja, sin coste ni ahorro.
function conAplicadoEfectivo(
  condiciones: CondicionTirada[],
  aplicado: AplicadoId,
): { condiciones: CondicionTirada[]; sinEfecto: Record<string, string> } {
  const sinEfecto: Record<string, string> = {};
  const label = APLICADOS.find((a) => a.id === aplicado)!.label;
  const filtradas = condiciones.flatMap((c): CondicionTirada[] => {
    if (c.alcance?.tipo !== "aplicado" || c.alcance.aplicados.includes(aplicado)) return [c];
    const motivo = `no aplica tirando con ${label}`;
    sinEfecto[c.id] = motivo;
    return c.tipo === "toggle" ? [{ id: c.id, tipo: "toggle", etiqueta: `${c.etiqueta} (${motivo})`, valorActivo: 0, alcance: c.alcance }] : [];
  });
  return { condiciones: filtradas, sinEfecto };
}

// Brazo Biónico (A6a): la tirada con la Fuerza y la Agilidad de la extremidad en vez de las del
// usuario, aunque sean menores (R4). Se añade a los modificadores lo que falta para llegar a
// ellas desde las efectivas (con estados y activables), solo para esta tirada.
const ATRIBUTOS_EXTREMIDAD = ["fuerza", "agilidad"] as const;

function conExtremidad(sheet: Sheet, mods: ModificadorConFuente[], e: AtributosExtremidad): ModificadorConFuente[] {
  return [
    ...mods,
    ...ATRIBUTOS_EXTREMIDAD.map(
      (id): ModificadorConFuente => ({ tipo: "atributo", id, valor: e[id] - atributoEfectivo(sheet, id, mods), origen: "aumento", fuente: e.fuente }),
    ),
  ];
}

// "Potencia · Brazo Biónico 2: Fuerza 3 (tuya 1), Agilidad 2 (tuya 2)": solo los atributos del
// aplicado que cambia la extremidad.
function etiquetaAplicado(sheet: Sheet, aplicadoId: AplicadoId, mods: ModificadorConFuente[], e: AtributosExtremidad | undefined): string {
  const def = APLICADOS.find((a) => a.id === aplicadoId)!;
  if (!e) return def.label;
  const partes = ATRIBUTOS_EXTREMIDAD.filter((id) => (def.de as readonly string[]).includes(id)).map(
    (id) => `${ATRIBUTOS.find((a) => a.id === id)!.label} ${e[id]} (tuya ${atributoEfectivo(sheet, id, mods)})`,
  );
  return partes.length > 0 ? `${def.label} · ${e.fuente}: ${partes.join(", ")}` : def.label;
}

// El daño que sale de la Fuerza (o de la Potencia con Sutil) con la extremidad: lo que cambia
// respecto al del usuario, como un ajuste más del daño con su fuente (también si baja).
function ajusteDanioDeExtremidad(
  sheet: Sheet,
  mods: ModificadorConFuente[],
  conBrazo: ModificadorConFuente[],
  e: AtributosExtremidad | undefined,
  sutilDanio: boolean,
): AjusteDanio["ajustes"] {
  if (!e?.danioDeFuerza) return [];
  const [nombre, tuya, delBrazo] = sutilDanio
    ? ["Potencia", valorAplicado(sheet, "potencia", mods), valorAplicado(sheet, "potencia", conBrazo)]
    : ["Fuerza", atributoEfectivo(sheet, "fuerza", mods), e.fuerza];
  return delBrazo === tuya ? [] : [{ valor: delBrazo - tuya, fuente: `${e.fuente}: ${nombre} ${delBrazo} (tuya ${tuya})` }];
}

// «Disparo poderoso» (Arquero Poderoso, do-03): en un arma que suma media Fuerza al daño (el
// Arco, «1/2 Fue + 8»), la casilla la suma entera: lo que falta hasta la Fuerza, con su fuente.
function ajusteDanioFuerzaEntera(sheet: Sheet, mods: ModificadorConFuente[], tirada: Accion, activas: Toggle[]): AjusteDanio["ajustes"] {
  const casilla = tirada.mediaFuerza ? activas.find((c) => c.danio?.fuerzaEntera) : undefined;
  if (!casilla) return [];
  const fuerza = atributoEfectivo(sheet, "fuerza", mods);
  const falta = fuerza - Math.floor(fuerza / 2);
  return falta === 0 ? [] : [{ valor: falta, fuente: `${casilla.etiqueta}: Fuerza entera (${fuerza})` }];
}

const conAjustesDanio = (a: AjusteDanio, extra: AjusteDanio["ajustes"]): AjusteDanio =>
  extra.length > 0 ? { ...a, ajustes: [...a.ajustes, ...extra] } : a;

// La opción elegida de cada condición de tipo opción.
function opcionesElegidas(condiciones: CondicionTirada[], estado: EstadoCondiciones): OpcionCondicion[] {
  return condiciones.flatMap((c) => {
    if (c.tipo !== "opcion") return [];
    const o = c.opciones.find((x) => x.id === estado[c.id]);
    return o ? [o] : [];
  });
}

// Una casilla bloqueada no cuenta aunque llegue marcada.
function sinBloqueadas(condiciones: CondicionTirada[], estado: EstadoCondiciones): EstadoCondiciones {
  const bloqueadas = condiciones.filter((c) => c.tipo === "toggle" && c.bloqueada && Boolean(estado[c.id]));
  if (bloqueadas.length === 0) return estado;
  return { ...estado, ...Object.fromEntries(bloqueadas.map((c) => [c.id, false])) };
}

function usosGastados(activas: Toggle[], fatiga: Pick<TiradaMontada, "ahorroSinUsar">, esPoder: boolean): string[] {
  const ahorro = activas.reduce((t, c) => t + (c.ahorroFatiga ?? 0), 0);
  const ahorroUsado = esPoder || fatiga.ahorroSinUsar < ahorro;
  return activas.filter((c) => c.usoPorEscena && (!c.ahorroFatiga || ahorroUsado)).map((c) => c.id);
}

export function montarTirada(ficha: FichaParaTirada, tirada: Accion, eleccion: EleccionTirada): TiradaMontada {
  const { sutil, circunstancial } = eleccion;
  const estado = sinBloqueadas(tirada.condiciones ?? [], eleccion.estadoCondiciones);
  const enEspecialidad = enEspecialidadEfectiva(ficha.ficha, tirada);
  // El aplicado con el que se tira de verdad. Una casilla que lo cambia (Negociación
  // Analítica) manda sobre el estilo Sutil.
  const otroAplicado = (tirada.condiciones ?? []).find(
    (c): c is Toggle => c.tipo === "toggle" && Boolean(estado[c.id]) && c.aplicado !== undefined,
  )?.aplicado;
  const aplicadoId = otroAplicado ?? (sutil && tirada.aplicadoSutil ? tirada.aplicadoSutil : tirada.aplicado);
  // La extremidad con la que se tira (A6a): la de la tirada, o la de la casilla marcada.
  const extremidad =
    tirada.extremidad ??
    (tirada.condiciones ?? []).find(
      (c): c is Toggle => c.tipo === "toggle" && Boolean(estado[c.id]) && c.extremidad !== undefined,
    )?.extremidad;
  const porAplicado = conAplicadoEfectivo(tirada.condiciones ?? [], aplicadoId);
  const ctx: ContextoAccion = {
    id: tirada.id,
    grupo: tirada.grupo,
    habilidad: tirada.habilidad,
    modoElegido: modoElegido(tirada.condiciones ?? [], estado),
    aplicado: aplicadoId,
    ...(tirada.familiaArma && { familiaArma: tirada.familiaArma }),
    ...(tirada.empleoArma && { empleoArma: tirada.empleoArma }),
    ...(tirada.desarmado && { desarmado: true }),
    ...(tirada.contundente && { contundente: true }),
    ...(tirada.mediaFuerza && { mediaFuerza: true }),
    ...(tirada.sinPenalizadorDesarmado && { sinPenalizadorDesarmado: true }),
    ...(tirada.especialidadArma && { especialidadArma: tirada.especialidadArma }),
    especialidades: especialidadesDeTirada(tirada),
  };
  const falloCritico = tirada.falloCritico && alcanzaA(tirada.falloCritico.alcance, ctx) ? tirada.falloCritico.fuente : null;
  // Sin los que piden especialidad si no se va en ella, y el mejor de los que no se suman.
  const sinApilados = sinApilar(
    {
      mods: ficha.modificadores,
      condiciones: porAplicado.condiciones,
      bonosTramo: bonosTramoAplicables(tirada.bonosTramo ?? [], estado, enEspecialidad),
      ajustes: tirada.ajustesFijos ?? [],
    },
    ctx,
    estado,
    tirada.yaIncluidos,
  );
  const { bonosTramo } = sinApilados;
  const ajustesFijos = sinApilados.ajustes;
  const condiciones = conReduccionesDeUmbral(sinApilados.condiciones, estado, sinApilados.mods, ctx);
  // Proyección activa (A5a): sus penalizadores, a 0 en las tiradas de Actitud.
  const mods = conPenalizadoresAnulados(sinApilados.mods, ctx);

  const activas = condiciones.filter((c): c is Toggle => c.tipo === "toggle" && Boolean(estado[c.id]));
  // Los atributos de la extremidad solo valen para el aplicado y el daño de esta tirada.
  const modsAplicado = extremidad ? conExtremidad(ficha.ficha, mods, extremidad) : mods;
  // Sin especialidad nombrada (la tirada libre incluida, T-007) la habilidad cuenta entera
  // aunque no vaya "en especialidad": el desglose no lo dice.
  const entera = habilidadEntera(ficha.ficha, tirada);
  const mod = otroAplicado
    ? modificadorAccion(ficha.ficha, { ...tirada, aplicado: otroAplicado }, entera, modsAplicado, false)
    : modificadorAccion(ficha.ficha, tirada, entera, modsAplicado, sutil);
  const base = mod.total + ajustesFijos.reduce((t, a) => t + a.valor, 0);

  const modo = ctx.modoElegido;
  const elegidas = opcionesElegidas(condiciones, estado);
  const fatiga = fatigaDeCasillas(activas, elegidas, tirada.ventaja != null, tirada.costeFatiga ?? 0);
  const modificador =
    base + bonoAlcance(mods, ctx) + valorCondiciones(condiciones, estado) + valorBonosTramo(bonosTramo, estado);

  const habilidadLabel = tirada.habilidad ? HABILIDADES.find((h) => h.id === tirada.habilidad)!.label : null;
  const desglose: LineaDesglose[] = [
    { etiqueta: etiquetaAplicado(ficha.ficha, aplicadoId, mods, extremidad), valor: mod.aplicado },
    ...(habilidadLabel
      ? [{ etiqueta: `${habilidadLabel}${enEspecialidad ? " (especialidad)" : ""}`, valor: mod.habilidad ?? 0 }]
      : []),
    ...ajustesFijos.map((a) => ({ etiqueta: a.fuente, valor: a.valor })),
    ...desgloseAlcance(mods, ctx),
    ...desgloseCondiciones(condiciones, estado),
    ...desgloseBonosTramo(bonosTramo, estado),
    // Lo que una pieza apagada (Shock) ya no aporta, a 0: «Ojo Biónico (shock)».
    ...(tirada.piezasApagadas ?? []).map((p) => ({ etiqueta: etiquetaShock(p.origen.label), valor: 0 })),
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
    margenes: conFalloCritico(conCriticoFijo(margenesDeCondiciones(condiciones, estado), tirada.criticoFijo), falloCritico),
    // El crítico fijo (Crítico Mejorado) va primero, con su línea, en las notas del resultado.
    notas: [
      ...(tirada.criticoFijo
        ? [resolucion(tirada.criticoFijo.fuente, notaCriticoFijo(tirada.criticoFijo.margen), tirada.criticoFijo.origen)]
        : []),
      ...(falloCritico ? [resolucion(falloCritico, "Cualquier fallo es fallo crítico.", tirada.falloCritico?.origen)] : []),
      ...(tirada.subeGradoFijo ? [resolucion(tirada.subeGradoFijo, "Un fracaso (no el crítico) cuenta como éxito.", tirada.origenSubeGrado)] : []),
      ...notasCondiciones(condiciones, estado),
    ],
    modoElegido: modo,
    ventaja: tirada.ventaja ?? activas.find((c) => c.ventaja)?.etiqueta ?? ventajaDeOpcion(elegidas),
    subeGrado: activas.find((c) => c.subeGrado)?.etiqueta ?? tirada.subeGradoFijo ?? null,
    danio: conAjustesDanio(conDanioFijo(danioDeCasillas(activas), tirada.ataque?.sinBonoExitos), [
      ...ajusteDanioDeExtremidad(ficha.ficha, mods, modsAplicado, extremidad, sutil && tirada.aplicadoSutil !== undefined),
      ...ajusteDanioFuerzaEntera(ficha.ficha, mods, tirada, activas),
    ]),
    ...fatiga,
    casillasSinEfecto: porAplicado.sinEfecto,
    usosEscena: usosGastados(activas, fatiga, tirada.grupo === "Psiónica"),
  };
}

// Lo que cuestan las casillas marcadas y las opciones elegidas, menos lo que ahorran las de
// ahorro (Mielinización Central), sin bajar de 0. Lo que sobra del ahorro, aparte.
// La ventaja no se acumula (usuario, 2026-10-22, como el selector "Contra…" de A2a): si la
// tirada ya trae ventaja gratis (Red Frontoparietal en Iniciativa, una casilla u opción sin
// coste), las de ventaja de pago no cobran; sin gratis, de las de pago solo cobra la más barata.
// `fija`: la fatiga propia de la tirada (Tempestad Nanobótica, A4b), que el ahorro también
// puede rebajar, como el coste de un poder.
function fatigaDeCasillas(
  activas: Toggle[],
  elegidas: OpcionCondicion[],
  ventajaDeTirada: boolean,
  fija: number,
): Pick<TiradaMontada, "costeFatiga" | "ahorroSinUsar"> {
  const fuentes = [...activas, ...elegidas];
  const ventajaGratis = ventajaDeTirada || fuentes.some((c) => c.ventaja && !c.costeFatiga);
  const deVentaja = fuentes.filter((c) => c.ventaja && c.costeFatiga);
  const otras = fuentes.filter((c) => !(c.ventaja && c.costeFatiga));
  const porVentaja = ventajaGratis || deVentaja.length === 0 ? 0 : Math.min(...deVentaja.map((c) => c.costeFatiga ?? 0));
  const bruto = otras.reduce((t, c) => t + (c.costeFatiga ?? 0), 0) + porVentaja + fija;
  const ahorro = activas.reduce((t, c) => t + (c.ahorroFatiga ?? 0), 0);
  return { costeFatiga: Math.max(0, bruto - ahorro), ahorroSinUsar: Math.max(0, ahorro - bruto) };
}

const resolucion = (etiqueta: string, nota: string, origen: OrigenAporte | undefined): NotaMontada => ({
  etiqueta,
  nota,
  ...(origen && { origen }),
  momento: "despues",
});

const notaCriticoFijo = (margen: number) =>
  margen === 0 ? "Cualquier éxito es crítico." : `Crítico con ${margen} éxitos en vez de ${MARGEN_CRITICO}.`;

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
