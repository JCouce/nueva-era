// Aumentos activables (tanda A5a de docs/propuesta-aumentos.md, docs/sistema.md §11.3): la
// Neuroprótesis Simpática (niveles 1-2) y la Proyección Neuro-Expresiva. Se activan con una
// acción de aumento (aumentosAcciones.ts, efecto "activar") que cobra la fatiga y pone un estado
// propio en Character.estados (catalog/estados.ts, ESTADOS_DE_AUMENTO). Mientras el estado está
// puesto, Y la pieza sigue equipada y funcionando, cuenta lo que trae su `activo` en el catálogo:
//   atributos         +N a atributos básicos, con origen "estado": entran en atributos efectivos,
//                     aplicados y derivados, pero no en los requisitos de dote (R3; S30: los
//                     requisitos no miran estados).
//   mejora            el "en lugar de" del nivel 2: el atributo elegido al activar (el grado del
//                     estado) recibe este valor en vez del de `atributos`.
//   reducePenalizadores  −N a cada penalizador por separado, sin pasar de 0: heridas y fatiga por
//                     el ajuste de umbrales (se suma a especie y Estabilización, A3) y cada
//                     modificador negativo de tirada de cada estado, con su línea
//                     (modificadoresDeEstados). No toca lo que pone el propio activable.
//   salvaciones       al selector "Contra…" (aumentosTiradas.ts), como cualquier aumento.
//   anulaPenalizadores Modificador "anulaPenalizadores" (lo resuelve montarTirada).
//   textos            textos en tiradas mientras dura (A5b: la segunda reacción de la
//                     Neuroprótesis 3, en Defensa).
//   sustituyeAtributosDe  (A5b) mientras este está encendido, los `atributos`/`mejora` del
//                     activable de ese estado no cuentan (Neuroprótesis 4: su +2 sustituye al
//                     +1/+2 de la activa, no se suman). El resto de lo que hace aquel, sí.
//   eliminaPenalizadoresUmbrales  (A5b) heridas y fatiga a 0 (Neuroprótesis 4), por el ajuste
//                     de umbrales con un valor que cubre cualquier tramo.
// Sin la pieza (o con el requisito roto), el estado sigue en la lista hasta que caduque o se
// desactive, pero no hace nada.
import type { AtributoId } from "./atributos";
import type { EfectoSalvacion } from "./aumentosTiradas";
import type { DestinoTexto } from "../catalog/especies";
import type { TextoEnTirada } from "./especie";
import { aumentoPorId, operacionesActivas } from "./aumentos";
import { nivelesHasta } from "./equipo";
import { SIN_AJUSTE_UMBRALES, type AjusteUmbrales, type EstadoActivo } from "./estados";
import type { AlcanceModificador, ModificadorConFuente } from "./modificadores";
import type { Sheet } from "./sheet";

export type ActivoAumento = {
  estadoId: string;
  atributos?: Partial<Record<AtributoId, number>>;
  mejora?: { atributos: AtributoId[]; valor: number };
  reducePenalizadores?: number;
  salvaciones?: EfectoSalvacion[];
  anulaPenalizadores?: AlcanceModificador;
  textos?: { en: DestinoTexto; texto: string }[];
  sustituyeAtributosDe?: string;
  eliminaPenalizadoresUmbrales?: true;
};

// Más que cualquier tramo de §7 (el peor es −5): el ajuste lo deja en 0 y no da línea.
const ELIMINA_UMBRAL = 99;

export type ReduccionDeEstados = { valor: number; fuente: string };

export type EfectosActivables = {
  modificadores: ModificadorConFuente[];
  ajusteUmbrales: AjusteUmbrales;
  // Para modificadoresDeEstados: −valor a cada penalizador de tirada de cada estado.
  reduceEstados: ReduccionDeEstados | null;
  salvaciones: { fuente: string; efectos: EfectoSalvacion[] }[];
  textos: TextoEnTirada[];
};

export const SIN_EFECTOS_ACTIVABLES: EfectosActivables = {
  modificadores: [],
  ajusteUmbrales: SIN_AJUSTE_UMBRALES,
  reduceEstados: null,
  salvaciones: [],
  textos: [],
};

// El `activo` de cada pieza equipada que funciona, con su fuente ("Neuroprótesis Simpática 2").
// Implantes: por cada estado propio, el del nivel más alto que lo trae (cada nivel lo repite
// entero). `activo` y `activos` (A5b: un nivel con más de un estado propio, Neuroprótesis 4).
export function activosDeAumentos(sheet: Pick<Sheet, "equipo">): { fuente: string; activo: ActivoAumento }[] {
  const activas = operacionesActivas(sheet);
  return sheet.equipo.flatMap((pieza) => {
    const cat = aumentoPorId(pieza.catalogoId);
    if (!cat) return [];
    if (cat.familia === "operacionGenetica") {
      return cat.activo && activas.has(cat.id) ? [{ fuente: cat.label, activo: cat.activo }] : [];
    }
    if (pieza.nivel === undefined) return [];
    const porEstado = new Map<string, ActivoAumento>();
    for (const n of [...nivelesHasta(cat.niveles, pieza.nivel)].reverse()) {
      for (const a of [...(n.activo ? [n.activo] : []), ...(n.activos ?? [])]) {
        if (!porEstado.has(a.estadoId)) porEstado.set(a.estadoId, a);
      }
    }
    return [...porEstado.values()].map((activo) => ({ fuente: `${cat.label} ${pieza.nivel}`, activo }));
  });
}

export function efectosDeActivables(sheet: Pick<Sheet, "equipo">, estados: readonly EstadoActivo[]): EfectosActivables {
  const encendidos = activosDeAumentos(sheet).flatMap(({ fuente, activo }) => {
    const estado = estados.find((e) => e.estadoId === activo.estadoId);
    return estado ? [{ fuente, activo, grado: estado.gradoId }] : [];
  });
  if (encendidos.length === 0) return SIN_EFECTOS_ACTIVABLES;

  const modificadores: ModificadorConFuente[] = [];
  const salvaciones: EfectosActivables["salvaciones"] = [];
  const textos: TextoEnTirada[] = [];
  let reduccion: ReduccionDeEstados | null = null;
  let elimina: string | null = null;
  const sustituidos = new Set(encendidos.flatMap(({ activo }) => (activo.sustituyeAtributosDe ? [activo.sustituyeAtributosDe] : [])));
  for (const { fuente, activo, grado } of encendidos) {
    const atributos = sustituidos.has(activo.estadoId) ? {} : { ...activo.atributos };
    // "En lugar de": el elegido al activar recibe el valor de la mejora.
    const elegido = activo.mejora?.atributos.find((a) => a === grado);
    if (elegido && activo.mejora && !sustituidos.has(activo.estadoId)) atributos[elegido] = activo.mejora.valor;
    for (const [id, valor] of Object.entries(atributos) as [AtributoId, number][]) {
      modificadores.push({ tipo: "atributo", id, valor, origen: "estado", fuente });
    }
    for (const t of activo.textos ?? []) textos.push({ en: t.en, texto: t.texto, fuente, soloEnCritico: false });
    if (activo.eliminaPenalizadoresUmbrales) elimina = fuente;
    if (activo.anulaPenalizadores) {
      modificadores.push({ tipo: "anulaPenalizadores", alcance: activo.anulaPenalizadores, valor: 0, origen: "estado", fuente });
    }
    if (activo.salvaciones?.length) salvaciones.push({ fuente, efectos: activo.salvaciones });
    if (activo.reducePenalizadores) {
      reduccion = reduccion
        ? { valor: reduccion.valor + activo.reducePenalizadores, fuente: `${reduccion.fuente} y ${fuente}` }
        : { valor: activo.reducePenalizadores, fuente };
    }
  }
  const umbral = elimina ? { valor: ELIMINA_UMBRAL, fuente: elimina } : reduccion;
  const ajusteUmbrales: AjusteUmbrales = umbral ? { salud: { ...umbral }, fatiga: { ...umbral } } : SIN_AJUSTE_UMBRALES;
  return { modificadores, ajusteUmbrales, reduceEstados: reduccion, salvaciones, textos };
}
