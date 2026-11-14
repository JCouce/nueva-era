// Aumentos activables (tanda A5a de docs/propuesta-aumentos.md, docs/sistema.md §11.3): la
// Neuroprótesis Simpática (niveles 1-2) y la Proyección Neuro-Expresiva. Se activan con una
// acción de aumento (aumentosAcciones.ts, efecto "activar") que cobra la fatiga y pone un estado
// propio en Character.estados (catalog/estados.ts, ESTADOS_DE_AUMENTO). Mientras el estado está
// puesto, Y la pieza sigue equipada y funcionando, cuenta lo que trae su `activo` en el catálogo:
//   pruebas           +N a las tiradas que usan esos aplicados (Modificador de tirada con alcance
//                     «aplicado», origen "estado"), salvaciones incluidas: sube la tirada, no el
//                     atributo, así que no toca derivados, vida, carga, movimiento ni requisitos
//                     (sync Drive 2026-11-14; antes, +N a atributos básicos).
//   mejora            el "en lugar de" del nivel 2: el aplicado elegido al activar (el grado del
//                     estado) recibe este valor en vez del de `pruebas`.
//   reducePenalizadores  −N a los penalizadores por heridas y fatiga, sin pasar de 0, por el
//                     ajuste de umbrales (se suma a especie y Estabilización, A3; solo el −N de las
//                     tiradas, td-10). Los de los estados, no (sync Drive 2026-11-14; td-11 cae).
//   salvaciones       al selector "Contra…" (aumentosTiradas.ts), como cualquier aumento.
//   anulaPenalizadores Modificador "anulaPenalizadores" (lo resuelve montarTirada).
//   textos            textos en tiradas mientras dura (A5b: la segunda reacción de la
//                     Neuroprótesis 3, en Defensa).
//   sustituyePruebasDe  (A5b) mientras este está encendido, las `pruebas`/`mejora` del
//                     activable de ese estado no cuentan (Neuroprótesis 4: su +2 sustituye al
//                     +1/+2 de la activa, no se suman). El resto de lo que hace aquel, sí.
//   eliminaPenalizadoresUmbrales  (A5b) heridas y fatiga a 0 (Neuroprótesis 4), por el ajuste
//                     de umbrales con un valor que cubre cualquier tramo y `elimina`: fuera también
//                     la media velocidad y el recorte de carga de sus umbrales (td-10). Con
//                     "fatiga", solo la fatiga (Metabolismo Sintético 4, E5a).
//   ventajasFijas     (E5a) ventaja sin casilla en las tiradas de ese alcance mientras dura
//                     (Metabolismo Sintético 4: las salvaciones de Fortaleza); como las de
//                     Red Frontoparietal (ventajasFijasDeAumentos).
// Sin la pieza (o con el requisito roto), el estado sigue en la lista hasta que caduque o se
// desactive, pero no hace nada.
import type { AplicadoId } from "./atributos";
import type { EfectoSalvacion, VentajaFija } from "./aumentosTiradas";
import type { DestinoTexto } from "../catalog/especies";
import type { TextoEnTirada } from "./especie";
import { aumentoPorId, operacionesActivas } from "./aumentos";
import { nivelesHasta } from "./equipo";
import { SIN_AJUSTE_UMBRALES, type AjusteUmbrales, type EstadoActivo } from "./estados";
import type { AlcanceModificador, ModificadorConFuente } from "./modificadores";
import type { Sheet } from "./sheet";
import { origenDePieza, type OrigenAporte } from "./origen";

export type ActivoAumento = {
  estadoId: string;
  pruebas?: Partial<Record<AplicadoId, number>>;
  mejora?: { pruebas: AplicadoId[]; valor: number };
  reducePenalizadores?: number;
  salvaciones?: EfectoSalvacion[];
  anulaPenalizadores?: AlcanceModificador;
  textos?: { en: DestinoTexto; texto: string }[];
  sustituyePruebasDe?: string;
  eliminaPenalizadoresUmbrales?: true | "fatiga";
  ventajasFijas?: { alcance: AlcanceModificador }[];
};

// Más que cualquier tramo de §7 (el peor es −5): el ajuste lo deja en 0 y no da línea.
const ELIMINA_UMBRAL = 99;

type ReduccionDeUmbrales = { valor: number; fuente: string };

export type EfectosActivables = {
  modificadores: ModificadorConFuente[];
  ajusteUmbrales: AjusteUmbrales;
  salvaciones: { fuente: string; efectos: EfectoSalvacion[]; origen: OrigenAporte }[];
  textos: TextoEnTirada[];
  ventajasFijas: VentajaFija[];
};

export const SIN_EFECTOS_ACTIVABLES: EfectosActivables = {
  modificadores: [],
  ajusteUmbrales: SIN_AJUSTE_UMBRALES,
  salvaciones: [],
  textos: [],
  ventajasFijas: [],
};

// El `activo` de cada pieza equipada que funciona, con su fuente ("Neuroprótesis Simpática 2").
// Implantes: por cada estado propio, el del nivel más alto que lo trae (cada nivel lo repite
// entero). `activo` y `activos` (A5b: un nivel con más de un estado propio, Neuroprótesis 4).
// `origen` (fase 2): la pieza, para lo que el activable pone en las tiradas.
export function activosDeAumentos(sheet: Pick<Sheet, "equipo">): { fuente: string; activo: ActivoAumento; origen: OrigenAporte }[] {
  const activas = operacionesActivas(sheet);
  return sheet.equipo.flatMap((pieza) => {
    const cat = aumentoPorId(pieza.catalogoId);
    if (!cat) return [];
    if (cat.familia === "operacionGenetica") {
      return cat.activo && activas.has(cat.id) ? [{ fuente: cat.label, activo: cat.activo, origen: origenDePieza("aumento", cat, pieza.instanciaId) }] : [];
    }
    if (pieza.nivel === undefined) return [];
    const porEstado = new Map<string, ActivoAumento>();
    for (const n of [...nivelesHasta(cat.niveles, pieza.nivel)].reverse()) {
      for (const a of [...(n.activo ? [n.activo] : []), ...(n.activos ?? [])]) {
        if (!porEstado.has(a.estadoId)) porEstado.set(a.estadoId, a);
      }
    }
    const origen = origenDePieza("aumento", cat, pieza.instanciaId);
    return [...porEstado.values()].map((activo) => ({ fuente: `${cat.label} ${pieza.nivel}`, activo, origen }));
  });
}

// Los activables con su estado puesto.
function encendidosDe(sheet: Pick<Sheet, "equipo">, estados: readonly EstadoActivo[]) {
  return activosDeAumentos(sheet).flatMap(({ fuente, activo, origen }) => {
    const estado = estados.find((e) => e.estadoId === activo.estadoId);
    return estado ? [{ fuente, activo, grado: estado.gradoId, origen }] : [];
  });
}

export function efectosDeActivables(sheet: Pick<Sheet, "equipo">, estados: readonly EstadoActivo[]): EfectosActivables {
  const encendidos = encendidosDe(sheet, estados);
  if (encendidos.length === 0) return SIN_EFECTOS_ACTIVABLES;

  const modificadores: ModificadorConFuente[] = [];
  const salvaciones: EfectosActivables["salvaciones"] = [];
  const textos: TextoEnTirada[] = [];
  const ventajasFijas: VentajaFija[] = [];
  let reduccion: ReduccionDeUmbrales | null = null;
  let eliminaSalud: string | null = null;
  let eliminaFatiga: string | null = null;
  const sustituidos = new Set(encendidos.flatMap(({ activo }) => (activo.sustituyePruebasDe ? [activo.sustituyePruebasDe] : [])));
  for (const { fuente, activo, grado, origen } of encendidos) {
    const pruebas = sustituidos.has(activo.estadoId) ? {} : { ...activo.pruebas };
    // "En lugar de": el elegido al activar recibe el valor de la mejora.
    const elegido = activo.mejora?.pruebas.find((a) => a === grado);
    if (elegido && activo.mejora && !sustituidos.has(activo.estadoId)) pruebas[elegido] = activo.mejora.valor;
    for (const [id, valor] of Object.entries(pruebas) as [AplicadoId, number][]) {
      modificadores.push({ tipo: "tirada", alcance: { tipo: "aplicado", aplicados: [id] }, valor, origen: "estado", fuente, item: origen });
    }
    for (const t of activo.textos ?? []) textos.push({ en: t.en, texto: t.texto, fuente, soloEnCritico: false, origen });
    if (activo.eliminaPenalizadoresUmbrales) {
      eliminaFatiga = fuente;
      if (activo.eliminaPenalizadoresUmbrales === true) eliminaSalud = fuente;
    }
    for (const v of activo.ventajasFijas ?? []) ventajasFijas.push({ alcance: v.alcance, fuente, origen });
    if (activo.anulaPenalizadores) {
      modificadores.push({ tipo: "anulaPenalizadores", alcance: activo.anulaPenalizadores, valor: 0, origen: "estado", fuente, item: origen });
    }
    if (activo.salvaciones?.length) salvaciones.push({ fuente, efectos: activo.salvaciones, origen });
    if (activo.reducePenalizadores) {
      reduccion = reduccion
        ? { valor: reduccion.valor + activo.reducePenalizadores, fuente: `${reduccion.fuente} y ${fuente}` }
        : { valor: activo.reducePenalizadores, fuente };
    }
  }
  const umbral = (elimina: string | null) => (elimina ? { valor: ELIMINA_UMBRAL, fuente: elimina, elimina: true as const } : reduccion && { ...reduccion });
  const salud = umbral(eliminaSalud);
  const fatiga = umbral(eliminaFatiga);
  const ajusteUmbrales: AjusteUmbrales = salud || fatiga ? { salud, fatiga } : SIN_AJUSTE_UMBRALES;
  return { modificadores, ajusteUmbrales, salvaciones, textos, ventajasFijas };
}
