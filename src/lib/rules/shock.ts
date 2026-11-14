// El Shock sobre las piezas (S73, pl-01…pl-03, usuario 2026-11-14; docs/sistema.md §7).
//
// Dos estados (catalog/estados.ts): «Shock» toca las piezas del cuerpo (implantes) y «Shock en el
// equipo», todo el equipo tecnológico a la vez. Cada pieza (o nivel) declara cómo le afecta con
// `shock`; sin declararlo, el valor por defecto de su familia (shockDePieza, criterio en §7 de
// sistema.md). Lo que hace el grado puesto:
//   - `apagadas` (fracaso crítico): la pieza no funciona. Va a FichaResuelta.piezasInutilizadas, sus
//     aportes no llegan a ninguna tirada y sus acciones propias salen bloqueadas.
//   - `penaliza` (fracaso −2, éxito −1; usuario 2026-11-14, pl-02): cada bono numérico positivo de
//     la pieza pierde N sin bajar de 0 (bonoConShock), esté donde esté, y las tiradas que la usan
//     (las de `origen` la pieza) llevan −N. Lo aplica la app: resolverFicha a los modificadores
//     con `item`, conPiezasAfectadas a lo que trae la tirada y conShockEnLineas a los desgloses
//     sin dado (Resistir daño).
//   - `conReglaPropia` (eq-29, decisiones del usuario 2026-11-14): la pieza que declara `alShock`
//     no se apaga ni lleva −N en ningún grado con efecto: hace lo suyo (Inyector 2, como el nivel
//     1; Soporte Vital, salvaciones a +1 y sin resistencia térmica). Lo aplica piezasEnUso (el
//     nivel) y conShockEnSalvaciones (el selector «Contra…»).
// «Apagón» (Soporte Vital) es lo mismo que estar afectado por el Shock (pl-03, eq-28).
import { equipoPorId, type Equipo } from "../catalog/equipo";
import { estadoPorId, type GradoEstado } from "../catalog/estados";
import type { AmenazaId, EfectoSalvacion } from "./aumentosTiradas";
import { nivelesHasta, ultimoQueDefine, type PiezaEquipada } from "./equipo";
import { estadosConEfecto, type EstadoActivo } from "./estados";
import { inmunidadesDe } from "./inmunidades";
import { sinMejorasNoAdmitidas } from "./compatibilidadArma";
import type { ModificadorConFuente } from "./modificadores";
import type { OrigenAporte } from "./origen";
import type { Sheet } from "./sheet";

// `cuerpo`: la toca el Shock (Fortaleza); `equipo`: el Shock en el equipo (Estructura); `inmune`:
// ninguno (no es electrónica, o lo dice la pieza).
export type AfectaShock = "cuerpo" | "equipo" | "inmune";

// Munición de las armas de energía (láser, rayo de partículas, plasma): el arma es electrónica.
const MUNICION_DE_ENERGIA: ReadonlySet<string> = new Set(["bateria_laser", "celula_particulas", "bateria_plasma", "bateria_plasma_canon"]);

function porDefecto(cat: Equipo): AfectaShock {
  switch (cat.familia) {
    case "implante":
      return "cuerpo";
    case "mejoraEstandar":
    case "subsistema":
    case "movimiento":
    case "herramienta":
      return "equipo";
    case "arma":
    case "armaPesada":
      return cat.tipoMunicion && MUNICION_DE_ENERGIA.has(cat.tipoMunicion) ? "equipo" : "inmune";
    // Operaciones genéticas (nunca, §11.3), armaduras (sus placas; lo electrónico son sus mejoras y
    // subsistemas), mejoras de arma mecánicas, melee, munición, granadas y consumibles.
    // TODO(revisar): las armas mecánicas («hoja motorizada», pistones), el Lanzamisiles AT (misil
    // guiado), las modificaciones Electrificante y Térmica de las Armas Modificadas y la Ropa
    // Inteligente no dicen si son electrónicas: quedan inmunes hasta que se aclare.
    default:
      return "inmune";
  }
}

// Lo que declara el nivel más alto instalado que lo diga (S9), o la pieza, o el de su familia.
export function shockDePieza(cat: Equipo, nivel?: number): AfectaShock {
  if ("niveles" in cat) {
    const define = ultimoQueDefine(nivelesHasta(cat.niveles, nivel ?? cat.niveles[0]?.nivel ?? 1), "shock");
    if (define?.shock) return define.shock;
  }
  if (cat.familia === "implante") return cat.shock;
  return porDefecto(cat);
}

// La regla propia de una pieza frente al Shock, en vez de la general (apagarse o −N). Cerrada a
// los dos casos que da la fuente (eq-29):
//   comoNivel      funciona como ese nivel (Inyector 2 → 1: pierde el tambor, conserva la simple)
//   salvacionesA   cada bono positivo de sus salvaciones baja a `valor` (nunca sube), sin las
//                  amenazas de `pierde` (Soporte Vital: todo a +1, la resistencia térmica fuera;
//                  la «protección total» del Blindaje Ambiental también queda en +1, sin su nota)
// En NivelModulo; hereda por niveles como `shock` (ultimoQueDefine).
export type AlShock = { tipo: "comoNivel"; nivel: number } | { tipo: "salvacionesA"; valor: number; pierde: AmenazaId[] };

// Lo que declara el nivel más alto instalado que lo diga. Solo las piezas con NivelModulo.
export function alShockDePieza(cat: Equipo, nivel?: number): AlShock | undefined {
  if (!("niveles" in cat) || cat.familia === "implante" || nivel === undefined) return undefined;
  return ultimoQueDefine(nivelesHasta(cat.niveles, nivel), "alShock")?.alShock;
}

// Una pieza con regla propia, tocada por un estado con efecto (cualquier grado salvo éxito crítico).
export type PiezaConReglaPropia = { origen: OrigenAporte; regla: AlShock; estado: string };

// Una pieza tocada por un estado que la penaliza (fracaso, éxito). `valor`: lo que pierde cada
// bono y lo que se resta al usarla. `estado`: el estado que la penaliza, de origen de la línea del
// uso.
export type PiezaPenalizada = { origen: OrigenAporte; valor: number; fuente: string; estado: OrigenAporte };

export type AfectacionDePiezas = {
  // instanciaId → el estado que la apaga («Shock», «Shock en el equipo»).
  inutilizadas: ReadonlyMap<string, string>;
  // instanciaId → −N a cada bono y a usarla.
  penalizadas: ReadonlyMap<string, PiezaPenalizada>;
  // instanciaId → su regla (`alShock`), que sustituye a las dos de arriba en todos los grados.
  conReglaPropia: ReadonlyMap<string, PiezaConReglaPropia>;
};

export const SIN_AFECTACION: AfectacionDePiezas = { inutilizadas: new Map(), penalizadas: new Map(), conReglaPropia: new Map() };

// Lo que hace cada estado puesto (sin los que anula una inmunidad, A7) a las piezas: la lista de
// piezas de la ficha que toca, con el grado. Lo comparten afectacionDePiezas y la explicación del
// estado (piezasDeEstado).
type Toque = { estadoId: string; estadoLabel: string; grado: string; piezas: NonNullable<GradoEstado["piezas"]>; tocadas: { pieza: PiezaEquipada; cat: Equipo }[] };

// Las mejoras que su arma no admite (td-03) no funcionan: el Shock no tiene nada que tocarles.
function toques(sheet: Pick<Sheet, "equipo">, estados: readonly EstadoActivo[]): Toque[] {
  const conEfecto = estadosConEfecto([...estados], inmunidadesDe(sheet));
  const util = sinMejorasNoAdmitidas(sheet);
  return conEfecto.flatMap((e) => {
    const estado = estadoPorId(e.estadoId);
    const grado = estado?.grados.find((g) => g.id === e.gradoId);
    if (!estado?.afectaPiezas || !grado?.piezas) return [];
    const tocadas = util.equipo.flatMap((pieza) => {
      const cat = equipoPorId(pieza.catalogoId);
      return cat && shockDePieza(cat, pieza.nivel) === estado.afectaPiezas ? [{ pieza, cat }] : [];
    });
    return [{ estadoId: estado.id, estadoLabel: estado.label, grado: grado.label, piezas: grado.piezas, tocadas }];
  });
}

const origenDeTocada = (cat: Equipo, instanciaId: string): OrigenAporte => ({
  tipo: cat.familia === "implante" || cat.familia === "operacionGenetica" ? "aumento" : "equipo",
  id: cat.id,
  label: cat.label,
  instanciaId,
});

// Con los estados que hacen efecto (sin los que anula una inmunidad, A7). Si dos estados tocan la
// misma pieza (no pasa hoy: cada pieza es de cuerpo o de equipo), apagar gana a penalizar. La
// pieza con regla propia va a su grupo en cualquier grado con efecto.
export function afectacionDePiezas(sheet: Pick<Sheet, "equipo">, estados: readonly EstadoActivo[]): AfectacionDePiezas {
  const tocan = toques(sheet, estados);
  if (tocan.length === 0) return SIN_AFECTACION;
  const inutilizadas = new Map<string, string>();
  const penalizadas = new Map<string, PiezaPenalizada>();
  const conReglaPropia = new Map<string, PiezaConReglaPropia>();
  for (const t of tocan) {
    for (const { pieza, cat } of t.tocadas) {
      const regla = alShockDePieza(cat, pieza.nivel);
      if (regla) {
        conReglaPropia.set(pieza.instanciaId, { origen: origenDeTocada(cat, pieza.instanciaId), regla, estado: t.estadoLabel });
      } else if ("apagadas" in t.piezas) {
        inutilizadas.set(pieza.instanciaId, t.estadoLabel);
        penalizadas.delete(pieza.instanciaId);
      } else if (!inutilizadas.has(pieza.instanciaId)) {
        penalizadas.set(pieza.instanciaId, {
          origen: origenDeTocada(cat, pieza.instanciaId),
          valor: t.piezas.penaliza,
          fuente: `${t.estadoLabel} (${t.grado.toLowerCase()})`,
          estado: { tipo: "estado", id: t.estadoId, label: t.estadoLabel },
        });
      }
    }
  }
  return { inutilizadas, penalizadas, conReglaPropia };
}

// Las piezas de la ficha que toca un estado puesto, para explicarlo (explicacionDeEstado): las que
// apaga o las que penaliza (con cuánto), por nombre, y las de regla propia con lo que hacen
// («Inyector Hipodérmico: funciona como nivel 1.»). null si el estado no toca piezas con el grado
// puesto (éxito crítico, otro estado) o la inmunidad lo anula.
// `propias`: las de regla propia, con su regla; el texto lo pone explicacionDeEstado (textoReglaPropia).
export type PiezasDeEstado = ({ apagadas: string[] } | { penaliza: number; peor: string[] }) & { propias: { pieza: string; regla: AlShock }[] };

export function piezasDeEstado(sheet: Pick<Sheet, "equipo">, estados: readonly EstadoActivo[], estadoId: string): PiezasDeEstado | null {
  const t = toques(sheet, estados).find((x) => x.estadoId === estadoId);
  if (!t) return null;
  const propias: { pieza: string; regla: AlShock }[] = [];
  const generales: string[] = [];
  for (const { pieza, cat } of t.tocadas) {
    const regla = alShockDePieza(cat, pieza.nivel);
    if (regla) {
      if (!propias.some((x) => x.pieza === cat.label)) propias.push({ pieza: cat.label, regla });
    } else if (!generales.includes(cat.label)) generales.push(cat.label);
  }
  return "apagadas" in t.piezas ? { apagadas: generales, propias } : { penaliza: t.piezas.penaliza, peor: generales, propias };
}

// La ficha con la que se calcula lo que aportan las piezas (FichaResuelta.fichaSinApagadas): sin
// las apagadas (vuelo, exoesqueleto, absorción, activables, inmunidades… no pasan por un aporte
// con origen), sin las mejoras que su arma no admite (td-03, sinMejorasNoAdmitidas) y la de
// regla `comoNivel` leída con ese nivel (Inyector 2 bajo Shock: rebajas, modificadores y todo lo
// demás del nivel 1).
export function piezasEnUso<S extends Pick<Sheet, "equipo">>(ficha: S, afectacion: Pick<AfectacionDePiezas, "inutilizadas"> & Partial<Pick<AfectacionDePiezas, "conReglaPropia">>): S {
  const sheet = sinMejorasNoAdmitidas(ficha);
  const propias = afectacion.conReglaPropia;
  if (afectacion.inutilizadas.size === 0 && !propias?.size) return sheet;
  const equipo = sheet.equipo.flatMap((p): PiezaEquipada[] => {
    if (afectacion.inutilizadas.has(p.instanciaId)) return [];
    const regla = propias?.get(p.instanciaId)?.regla;
    return regla?.tipo === "comoNivel" ? [{ ...p, nivel: regla.nivel }] : [p];
  });
  return { ...sheet, equipo };
}

// Los bonos de salvación del selector «Contra…» (aumentosTiradas.ts), cada uno con su pieza de
// origen, con el Shock: los de una pieza penalizada pierden N sin bajar de 0 (bonoConShock); los de
// una con `salvacionesA` bajan a su valor y pierden las amenazas de `pierde` (y la nota, que es de
// cuándo vale el bono normal). Los tocados llevan «<pieza> (shock)» de fuente. Las apagadas ni
// llegan (piezasEnUso): su línea a 0 la pone aportesApagados.
export function conShockEnSalvaciones<E extends EfectoSalvacion & { fuente: string; origen?: OrigenAporte }>(
  efectos: E[],
  afectacion: Partial<Pick<AfectacionDePiezas, "penalizadas" | "conReglaPropia">>,
): E[] {
  if (!afectacion.penalizadas?.size && !afectacion.conReglaPropia?.size) return efectos;
  return efectos.flatMap((e): E[] => {
    const id = e.origen?.instanciaId;
    if (!id || !e.origen) return [e];
    const regla = afectacion.conReglaPropia?.get(id)?.regla;
    if (regla?.tipo === "salvacionesA") {
      const contra = e.contra.filter((c) => !regla.pierde.includes(c));
      if (contra.length === 0) return [];
      const bono = e.bono !== undefined && e.bono > 0 ? Math.min(e.bono, regla.valor) : e.bono;
      return [{ ...e, contra, bono, nota: undefined, fuente: etiquetaShock(e.origen.label) }];
    }
    const p = afectacion.penalizadas?.get(id);
    if (!p || e.bono === undefined || e.bono <= 0) return [e];
    return [{ ...e, bono: bonoConShock(e.bono, p.valor), fuente: etiquetaShock(e.origen.label) }];
  });
}

// La fuente de lo que aporta una pieza con regla propia, con la marca: «Inyector Hipodérmico
// (shock)» en el tipo de acción de inyectarse.
export function conMarcaDeReglaPropia<T extends { fuente: string; origen?: OrigenAporte }>(xs: T[], propias: ReadonlyMap<string, PiezaConReglaPropia>): T[] {
  if (propias.size === 0) return xs;
  return xs.map((x) => (x.origen?.instanciaId && propias.has(x.origen.instanciaId) ? { ...x, fuente: etiquetaShock(x.origen.label) } : x));
}

// «Apagada por Shock.»: el `bloqueada` de las acciones propias de una pieza apagada. Con `pieza`,
// la hoja no es de la pieza pero va con ella (el arma incorporada en un Brazo Biónico apagado):
// «Apagada por Shock (Brazo Biónico).».
export const motivoApagada = (motivo: string, pieza?: string) => `Apagada por ${motivo}${pieza ? ` (${pieza})` : ""}.`;

// «Movilidad Aérea (shock)»: la línea de desglose de lo que aporta de verdad una pieza tocada
// (0 si está apagada, el bono reducido si está penalizada) y la del −N al usarla.
export const MARCA_SHOCK = "(shock)";
export const etiquetaShock = (pieza: string) => `${pieza} ${MARCA_SHOCK}`;

// Una etiqueta de desglose partida en trozos, con la marca «(shock)» aparte para que la pantalla la
// resalte (usuario 2026-11-14: en azul). Sin marca, un solo trozo.
export function trozosDeEtiqueta(etiqueta: string): { texto: string; shock?: true }[] {
  const partes = etiqueta.split(MARCA_SHOCK);
  return partes.flatMap((texto, i) => [
    ...(texto ? [{ texto }] : []),
    ...(i < partes.length - 1 ? [{ texto: MARCA_SHOCK, shock: true as const }] : []),
  ]);
}

// Un bono de una pieza penalizada: los positivos pierden N sin bajar de 0; los negativos (la
// Maniobrabilidad −3 de Movilidad Aérea) y el 0 no cambian.
export const bonoConShock = (valor: number, penaliza: number) => (valor > 0 ? Math.max(0, valor - penaliza) : valor);

// Los modificadores con `item` de una pieza penalizada, cada bono positivo con su −N (por separado)
// y la fuente «<pieza> (shock)»: los de atributo bajan el atributo en toda la ficha (el +Fuerza del
// Exoesqueleto baja la Potencia), los de tirada su tirada, los de derivado su derivado. El factor
// de vida (multiplicadorVida) no es un bono que se sume: no cambia.
export function conShockEnModificadores(mods: ModificadorConFuente[], penalizadas: ReadonlyMap<string, PiezaPenalizada>): ModificadorConFuente[] {
  if (penalizadas.size === 0) return mods;
  return mods.map((m) => {
    const p = m.item?.instanciaId ? penalizadas.get(m.item.instanciaId) : undefined;
    if (!p || m.tipo === "multiplicadorVida" || m.tipo === "anulaPenalizadores" || m.valor <= 0) return m;
    return { ...m, valor: bonoConShock(m.valor, p.valor), fuente: etiquetaShock(m.item!.label) };
  });
}

// Una línea de desglose sin dado (Resistir daño: blindaje, absorción) con lo que aporta de verdad
// si su pieza está tocada: apagada, 0; penalizada, el bono reducido. Sin origen, tal cual.
export function conShockEnLineas<L extends { etiqueta: string; valor: number; origen?: OrigenAporte }>(
  lineas: L[],
  afectacion: Partial<AfectacionDePiezas>,
): L[] {
  return lineas.map((l) => {
    const id = l.origen?.instanciaId;
    if (!id) return l;
    if (afectacion.inutilizadas?.has(id)) return { ...l, etiqueta: etiquetaShock(l.origen!.label), valor: 0 };
    const p = afectacion.penalizadas?.get(id);
    return p && l.valor > 0 ? { ...l, etiqueta: etiquetaShock(l.origen!.label), valor: bonoConShock(l.valor, p.valor) } : l;
  });
}
