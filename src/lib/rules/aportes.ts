// Los aportes de los ítems de la ficha a una tirada (docs/aportes/plan.md §1.3 y fase 2): de qué
// ítem viene cada cosa que la ficha pone en ESTA tirada, leído del `origen` que dejó quien lo
// generó (sin reconstruirlo de etiquetas). Lo pinta "te afecta" (teAfecta.ts).
//
// Lo general no entra: los bonos con alcance "todas", "habilidad" o "especialidad" (ya salen en el
// número de su rama y en todas sus filas), lo de un estado (lo pone el máster o la vida y la
// fatiga) y lo de la propia tirada (el catálogo o el arma que la genera).
import { ID_APUNTADO, especialidadesDeTirada, type Accion } from "./acciones";
import type { AplicadoId } from "./atributos";
import type { CondicionTirada } from "./condiciones";
import type { FichaResuelta } from "./fichaResuelta";
import { alcanzaA, type ContextoAccion } from "./modificadores";
import type { TiradaMontada } from "./montaje";
import { claveOrigen, type OrigenAporte } from "./origen";

// Los tipos de aporte que llegan a una tirada (plan §1.3), sin Acción: la hoja ya es la acción.
export type TipoAporte = "ajuste" | "resolucion" | "coste" | "texto" | "habilitador";

// `etiqueta`: cómo lo nombra el propio aporte (la línea del desglose, la casilla, el texto).
export type Aporte = { tipo: TipoAporte; origen: OrigenAporte; etiqueta: string };

const ALCANCES_GENERALES = new Set(["todas", "habilidad", "especialidad"]);

// El contexto con el que montarTirada mira los alcances, con el aplicado con el que se tira de
// verdad (Sutil incluido). Sin modo elegido: la tirada aún no se ha abierto.
const contexto = (t: Accion, aplicado: AplicadoId): ContextoAccion => ({
  id: t.id,
  grupo: t.grupo,
  habilidad: t.habilidad,
  modoElegido: null,
  aplicado,
  ...(t.familiaArma && { familiaArma: t.familiaArma }),
  ...(t.empleoArma && { empleoArma: t.empleoArma }),
  ...(t.desarmado && { desarmado: true }),
  ...(t.contundente && { contundente: true }),
  ...(t.mediaFuerza && { mediaFuerza: true }),
  ...(t.sinPenalizadorDesarmado && { sinPenalizadorDesarmado: true }),
  ...(t.especialidadArma && { especialidadArma: t.especialidadArma }),
  especialidades: especialidadesDeTirada(t, true),
});

// Una casilla es una entrega, no un aporte (plan §1.5): puede llevar varios, uno por tipo.
function tiposDeCasilla(c: CondicionTirada): TipoAporte[] {
  const tipos = new Set<TipoAporte>();
  if (c.tipo === "contador") tipos.add("ajuste");
  if (c.tipo === "toggle") {
    if (c.valorActivo !== 0 || (c.valorInactivo ?? 0) !== 0) tipos.add("ajuste");
    if (c.ventaja || c.subeGrado || c.aplicado || c.danio || c.extremidad || c.margenCriticoExito !== undefined) tipos.add("resolucion");
    if (c.costeFatiga || c.ahorroFatiga || c.usoPorEscena || c.gastoActivo || c.gastoInactivo || c.gastaEstado) tipos.add("coste");
    // Enciende bonos por opción de otro selector (Bioma Predilecto en «Marcha»).
    if (c.resumen) tipos.add("habilitador");
  }
  if (c.tipo === "opcion") {
    if (c.opciones.some((o) => o.valor !== 0)) tipos.add("ajuste");
    if (c.opciones.some((o) => o.ventaja || o.margenCriticoExito !== undefined)) tipos.add("resolucion");
    if (c.opciones.some((o) => o.costeFatiga)) tipos.add("coste");
  }
  return tipos.size > 0 ? [...tipos] : ["texto"];
}

// En el orden en que los enseñaba "te afecta": bonos con alcance, resoluciones fijas, bonos por
// tramo, casillas, ajustes fijos y textos. Uno por ítem y tipo, el primero que aparece.
export function aportesDeTirada(
  ficha: Pick<FichaResuelta, "modificadores">,
  t: Accion,
  montada: Pick<TiradaMontada, "aplicado">,
): Aporte[] {
  const ctx = contexto(t, montada.aplicado.id);
  const aportes: Aporte[] = [];
  const pon = (tipo: TipoAporte, origen: OrigenAporte | undefined, etiqueta: string) => {
    if (origen) aportes.push({ tipo, origen, etiqueta });
  };

  for (const m of ficha.modificadores) {
    if (m.tipo === "tirada" && m.origen !== "estado" && !ALCANCES_GENERALES.has(m.alcance.tipo) && alcanzaA(m.alcance, ctx))
      pon("ajuste", m.item, m.fuente);
  }
  if (t.ventaja) pon("resolucion", t.origenVentaja, t.ventaja);
  if (t.criticoFijo) pon("resolucion", t.criticoFijo.origen, t.criticoFijo.fuente);
  if (t.subeGradoFijo) pon("resolucion", t.origenSubeGrado, t.subeGradoFijo);
  if (t.falloCritico) pon("resolucion", t.falloCritico.origen, t.falloCritico.fuente);
  if (t.extremidad) pon("resolucion", t.extremidad.origen, t.extremidad.fuente);
  if (t.habilidadAlternativa) pon("resolucion", t.habilidadAlternativa.origen, t.habilidadAlternativa.etiqueta);
  for (const b of t.bonosTramo ?? []) pon("ajuste", b.origen, b.fuente);
  for (const c of t.condiciones ?? []) {
    // Reflejos Felinos: un descuento sobre el contador de la tirada (aporte sobre aporte, §1.8.3).
    if (c.tipo === "contador" && c.descuento) for (const o of c.descuento.origenes ?? []) pon("ajuste", o, c.descuento.fuente);
    if (c.alcance?.tipo === "todas" || c.id === ID_APUNTADO) continue;
    for (const tipo of tiposDeCasilla(c)) pon(tipo, c.origen, c.etiqueta);
  }
  // Gran Puntería cambia el selector «Apuntado» de los ataques (aporte sobre aporte, §1.8.3):
  // detrás de las casillas, como un cambio de grado.
  const apuntado = t.condiciones?.find((c) => c.id === ID_APUNTADO);
  if (apuntado) pon("resolucion", apuntado.origen, apuntado.etiqueta);
  for (const a of t.ajustesFijos ?? []) pon("ajuste", a.origen, a.fuente);
  for (const e of t.efectos ?? []) pon("texto", e.origen, e.texto);
  if (t.ignoraBlindaje) pon("resolucion", t.ignoraBlindaje.origen, t.ignoraBlindaje.fuente);
  for (const x of t.textosDeFicha ?? []) pon("texto", x.origen, x.texto);

  const propia = t.origen && claveOrigen(t.origen);
  const vistos = new Set<string>();
  return aportes.filter((a) => {
    if (a.origen.tipo === "estado" || a.origen.tipo === "accion") return false;
    const item = claveOrigen(a.origen);
    if (item === propia) return false;
    const clave = `${item}|${a.tipo}`;
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
}
