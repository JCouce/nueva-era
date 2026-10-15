// Dotes: pool, requisitos, compra y venta (docs/sistema.md §9.1 y §9.4). Tanda D1:
// las dotes están en la ficha, SIN efectos — ninguna toca todavía una tirada.
//
//   valoresDeRequisito / valoresRequisitoDeFicha  los números con los que se juega
//   cumpleRequisitoDote / estadoRequisitos        si un requisito se cumple y su texto
//   presupuestoDotes / puntosDotes*               el pool de la letra (solo en creación)
//   motivoNoComprable / comprarDote               compra con pool (creación) o XP (aprobada)
//   motivoNoQuitable / quitarDote                 venta: solo en creación, y nunca una
//                                                 dote que es requisito de otra comprada
//   dotesConRequisitoRoto / faltasDeDotes         la marca "requisito no cumplido" y su
//                                                 falta para enviar a revisión
//
// El máster compra con las mismas reglas que el jugador (decisión del usuario, D1):
// aquí no hay rama de máster. El NPC del máster (modo libre, §9.4) sí tiene la suya:
// CONTEXTO_LIBRE en comprar y quitar — sin requisitos, sin coste, quitar siempre.
import { APLICADOS, ATRIBUTOS, type AplicadoId, type AtributoId } from "./atributos";
import { HABILIDADES, type HabilidadId } from "./habilidades";
import { aplicados, atributosEfectivos } from "./derivados";
import { bonoHabilidad, type ModificadorConFuente } from "./modificadores";
import { bonosDeDisciplina, nivelEfectivo } from "./psionica";
import { especieDeFicha } from "./especie";
import { PUNTOS_DOTES_POR_LETRA } from "./prioridad";
import type { Sheet } from "./sheet";
import { dotePorId, eleccionValida, mismaDote, type DoteComprada } from "./dotesCompradas";
import { DOTES } from "../catalog/dotes";
import { ESPECIALIDADES_ARMA, especialidadPorId, etiquetaEspecialidad, type EspecialidadId } from "../catalog/especialidades";
import { DISCIPLINA_IDS, disciplinaPorId, type DisciplinaId } from "../catalog/psionica";
import type { DoteCatalogo, RequisitoDote, RequisitoDoteSimple } from "../catalog/dotesTipos";

// ── Valores con los que se juega ──────────────────────────────────────

// Lo que miran los requisitos (§9.1: "el valor con el que se juega, especie
// incluida"). Las especialidades, por id del catálogo (catalog/especialidades.ts).
export type ValoresRequisito = {
  atributos: Record<AtributoId, number>;
  aplicados: Record<AplicadoId, number>;
  habilidades: Record<HabilidadId, number>;
  especialidades: Record<HabilidadId, EspecialidadId[]>;
  disciplinas: Record<DisciplinaId, number>;
  psionico: boolean;
};

// Hueco para la psiónica por implante (§9.1): el Implante de Resonancia Métrica
// activará el requisito "psiónica de origen biológico" cuando exista el área de
// aumentos. Hoy ningún implante lo da.
function psionicaPorImplante(sheet: Sheet): boolean {
  void sheet;
  return false;
}

// `mods`: los de la especie (con casta y linaje). Solo la especie, ni equipo ni
// estados de combate: un requisito no debería romperse por quitarse una pieza o por
// estar herido.
// TODO(revisar): §9.1 dice "especie incluida"; si el equipo (exoesqueleto…) también
// debe contar para cumplir requisitos, se añade aquí y en fichaResuelta.ts.
export function valoresDeRequisito(sheet: Sheet, mods: ModificadorConFuente[]): ValoresRequisito {
  const bonos = bonosDeDisciplina(mods);
  const disciplinas = Object.fromEntries(
    DISCIPLINA_IDS.map((id) => [id, nivelEfectivo(sheet, id, bonos)]),
  ) as Record<DisciplinaId, number>;
  return {
    atributos: atributosEfectivos(sheet, mods),
    aplicados: aplicados(sheet, mods),
    // El nivel entero de la habilidad (no la mitad fuera de especialidad): el
    // requisito pide la habilidad a N, no una tirada.
    habilidades: Object.fromEntries(
      HABILIDADES.map((h) => [h.id, sheet.habilidades[h.id].valor + bonoHabilidad(mods, h.id)]),
    ) as Record<HabilidadId, number>,
    especialidades: Object.fromEntries(
      HABILIDADES.map((h) => [h.id, [...sheet.habilidades[h.id].especialidades]]),
    ) as Record<HabilidadId, EspecialidadId[]>,
    disciplinas,
    psionico: Object.values(disciplinas).some((n) => n > 0) || psionicaPorImplante(sheet),
  };
}

// Servidor (actions.ts): la misma cuenta que resolverFicha con la especie de la ficha.
export function valoresRequisitoDeFicha(sheet: Sheet): ValoresRequisito {
  return valoresDeRequisito(sheet, especieDeFicha(sheet)?.modificadores ?? []);
}

// ── Requisitos ─────────────────────────────────────────────────────────

function cumpleSimple(r: RequisitoDoteSimple, v: ValoresRequisito, compradas: readonly DoteComprada[]): boolean {
  switch (r.tipo) {
    case "atributo":
      return v.atributos[r.id] >= r.min;
    case "aplicado":
      return v.aplicados[r.id] >= r.min;
    case "habilidad":
      return v.habilidades[r.id] >= r.min;
    // §9.5: "Humor 2" = la habilidad a 2 o más Y tener elegida esa especialidad.
    case "especialidad":
      return v.habilidades[r.habilidad] >= r.min && v.especialidades[r.habilidad].includes(r.id);
    // "Nivel en una habilidad psiónica N": cualquier disciplina a N o más (§9.1).
    case "disciplina":
      return r.id === "cualquiera"
        ? Math.max(...Object.values(v.disciplinas)) >= r.min
        : v.disciplinas[r.id] >= r.min;
    case "psionico":
      return v.psionico;
    case "dote":
      return compradas.some((d) => d.id === r.id);
  }
}

export function cumpleRequisitoDote(r: RequisitoDote, v: ValoresRequisito, compradas: readonly DoteComprada[]): boolean {
  return r.tipo === "uno_de" ? r.opciones.some((o) => cumpleSimple(o, v, compradas)) : cumpleSimple(r, v, compradas);
}

const etiquetaDe = <T extends { id: string; label: string }>(lista: readonly T[], id: string) =>
  lista.find((x) => x.id === id)?.label ?? id;

function textoSimple(r: RequisitoDoteSimple): string {
  switch (r.tipo) {
    case "atributo":
      return `${etiquetaDe(ATRIBUTOS, r.id)} ${r.min}`;
    case "aplicado":
      return `${etiquetaDe(APLICADOS, r.id)} ${r.min}`;
    case "habilidad":
      return `${etiquetaDe(HABILIDADES, r.id)} ${r.min}`;
    case "especialidad":
      return `${etiquetaEspecialidad(r.id)} ${r.min} (${etiquetaDe(HABILIDADES, r.habilidad)})`;
    case "disciplina":
      return `${r.id === "cualquiera" ? "Cualquier disciplina" : disciplinaPorId(r.id).label} ${r.min}`;
    case "psionico":
      return "Psiónica de origen biológico";
    case "dote":
      return dotePorId(r.id)?.label ?? r.id;
  }
}

export function textoRequisitoDote(r: RequisitoDote): string {
  return r.tipo === "uno_de" ? r.opciones.map(textoSimple).join(" o ") : textoSimple(r);
}

export type EstadoRequisito = { texto: string; cumple: boolean };

export function estadoRequisitos(
  dote: DoteCatalogo,
  v: ValoresRequisito,
  compradas: readonly DoteComprada[],
): EstadoRequisito[] {
  return dote.requisitos.map((r) => ({ texto: textoRequisitoDote(r), cumple: cumpleRequisitoDote(r, v, compradas) }));
}

// ── Pool de creación ──────────────────────────────────────────────────
// Solo en creación (§9.1): una ficha aprobada compra con XP, al mismo coste.

export function presupuestoDotes(sheet: Sheet): number {
  const letra = sheet.prioridades.dotes;
  return letra ? PUNTOS_DOTES_POR_LETRA[letra] : 0;
}

export function puntosDotesGastados(sheet: Sheet): number {
  return sheet.dotes.reduce((t, d) => t + (dotePorId(d.id)?.coste ?? 0), 0);
}

export function puntosDotesDisponibles(sheet: Sheet): number {
  return presupuestoDotes(sheet) - puntosDotesGastados(sheet);
}

// ── Comprar ───────────────────────────────────────────────────────────

// `aprobada`: compra con XP (`xp` disponible); si no, con el pool de la letra.
// `libre`: NPC del máster (§9.4): sin requisitos, sin pool ni XP. Sí valen la dote
// visible, la elección y lo de repetible, igual que en personaje.
export type ContextoCompraDote = { valores: ValoresRequisito; aprobada: boolean; xp: number } | { libre: true };
export const CONTEXTO_LIBRE = { libre: true } as const;

function entradaNormalizada(dote: DoteCatalogo, eleccion: string | undefined): DoteComprada | null {
  const el = eleccionValida(dote, eleccion);
  if (el === null) return null;
  return el === undefined ? { id: dote.id } : { id: dote.id, eleccion: el };
}

// null si se puede comprar; si no, el motivo, en el texto que ve el jugador. Lo
// usan la pantalla (botón deshabilitado con su porqué) y el servidor (comprarDote).
export function motivoNoComprable(sheet: Sheet, entrada: DoteComprada, ctx: ContextoCompraDote): string | null {
  const dote = dotePorId(entrada.id);
  if (!dote) return "Dote desconocida";
  if (!dote.visible) return "Esta dote todavía no tiene efecto en la fuente: no se puede comprar";
  const nueva = entradaNormalizada(dote, entrada.eleccion);
  if (!nueva) return `Elige ${dote.eleccion?.label.toLowerCase() ?? "una opción"}`;
  if (!dote.repetible && sheet.dotes.some((d) => d.id === dote.id)) return "Ya tienes esta dote";
  if (dote.repetible && sheet.dotes.some((d) => mismaDote(d, nueva))) return "Ya la tienes con esa elección";
  if (dote.eleccion?.opciones === "especialidades_arma" && nueva.eleccion) {
    const valores = "libre" in ctx ? null : ctx.valores;
    if (!especialidadArmaElegible(dote, nueva.eleccion, sheet, valores)) {
      return valores
        ? "Elige una especialidad de arma que tengas, en la habilidad con la que cumples el requisito"
        : "Elige una especialidad de arma que tenga el NPC";
    }
  }
  if ("libre" in ctx) return null;
  const faltan = estadoRequisitos(dote, ctx.valores, sheet.dotes).filter((r) => !r.cumple);
  if (faltan.length) return `No cumples: ${faltan.map((r) => r.texto).join(", ")}`;
  if (ctx.aprobada) return ctx.xp >= dote.coste ? null : "No tienes XP suficiente";
  if (!sheet.prioridades.dotes) return "Asigna una letra de prioridad a Dotes";
  return puntosDotesDisponibles(sheet) >= dote.coste ? null : "No te quedan puntos de dotes";
}

// Crítico Mejorado: "una de sus especializaciones en armas para la habilidad con la que
// cumpla el requisito" (docs/dotes.md). La ficha tiene que tener esa especialidad y cumplir
// el requisito de habilidad de la dote en la habilidad de la especialidad.
export function especialidadArmaPropia(
  dote: DoteCatalogo,
  id: string,
  v: ValoresRequisito,
  compradas: readonly DoteComprada[],
): boolean {
  const esp = especialidadPorId(id);
  if (!esp || !v.especialidades[esp.habilidad].includes(esp.id)) return false;
  const deHabilidad = dote.requisitos
    .flatMap((r) => (r.tipo === "uno_de" ? r.opciones : [r]))
    .filter((r) => r.tipo === "habilidad" && r.id === esp.habilidad);
  return deHabilidad.length === 0 || deHabilidad.some((r) => cumpleSimple(r, v, compradas));
}

// `v` null = modo libre (NPC, §9.4): sin requisito de habilidad, basta con que la ficha
// tenga la especialidad ("una de sus especializaciones en armas").
// TODO(revisar): en libre se sigue exigiendo que el NPC tenga la especialidad (lo
// conservador); si el máster quiere ponerla sin tenerla, aquí se abre a todo ESPECIALIDADES_ARMA.
function especialidadArmaElegible(dote: DoteCatalogo, id: string, sheet: Sheet, v: ValoresRequisito | null): boolean {
  if (v) return especialidadArmaPropia(dote, id, v, sheet.dotes);
  const esp = especialidadPorId(id);
  return !!esp && sheet.habilidades[esp.habilidad].especialidades.includes(esp.id);
}

// Las especialidades de arma que la ficha puede elegir (Crítico Mejorado), en el orden del catálogo.
function especialidadesArmaElegibles(
  dote: DoteCatalogo,
  sheet: Sheet,
  v: ValoresRequisito | null,
): { valor: string; etiqueta: string }[] {
  return ESPECIALIDADES_ARMA.filter((e) => especialidadArmaElegible(dote, e.id, sheet, v)).map((e) => ({
    valor: e.id,
    etiqueta: e.label,
  }));
}

// `costeXp`: lo que hay que descontar de la XP (0 en creación, que gasta pool, y en libre).
export function comprarDote(
  sheet: Sheet,
  entrada: DoteComprada,
  ctx: ContextoCompraDote,
): { ok: true; sheet: Sheet; costeXp: number } | { ok: false; error: string } {
  const motivo = motivoNoComprable(sheet, entrada, ctx);
  if (motivo) return { ok: false, error: motivo };
  const dote = dotePorId(entrada.id)!;
  const nueva = entradaNormalizada(dote, entrada.eleccion)!;
  return { ok: true, sheet: { ...sheet, dotes: [...sheet.dotes, nueva] }, costeXp: "libre" in ctx || !ctx.aprobada ? 0 : dote.coste };
}

// ── Quitar ────────────────────────────────────────────────────────────

// `foto`: las dotes de la foto de aprobación (aprobacion.ts), null sin foto. En libre
// (NPC, §9.4) se quita siempre, aunque sea requisito de otra.
export type ContextoQuitarDote = { aprobada: boolean; foto: readonly DoteComprada[] | null } | { libre: true };

// ¿Dejaría `r` de cumplirse si desaparece la dote `id` (y quedan `quedan`)?
function dependeDe(r: RequisitoDote, id: string, quedan: readonly DoteComprada[]): boolean {
  if (r.tipo === "dote") return r.id === id;
  if (r.tipo !== "uno_de") return false;
  const dotes = r.opciones.filter((o): o is Extract<RequisitoDoteSimple, { tipo: "dote" }> => o.tipo === "dote");
  // Un uno_de con opciones que no son dote no se puede juzgar sin valores: hoy no
  // existe ninguno que mezcle dote con otra cosa (cruce del generador).
  return dotes.length === r.opciones.length && dotes.some((o) => o.id === id) && !dotes.some((o) => quedan.some((q) => q.id === o.id));
}

export function motivoNoQuitable(sheet: Sheet, entrada: DoteComprada, ctx: ContextoQuitarDote): string | null {
  const i = sheet.dotes.findIndex((d) => mismaDote(d, entrada));
  if (i < 0) return "No tienes esa dote";
  if ("libre" in ctx) return null;
  // Solo comprar, nunca vender (aprobacion.ts).
  if (ctx.aprobada) {
    if (ctx.foto?.some((d) => mismaDote(d, entrada))) return "Está en la foto de aprobación: solo se compra, no se vende";
    // TODO(revisar): una dote comprada con XP tras aprobar tampoco se vende (mismo
    // criterio que atributos/habilidades/disciplinas aprobados, que solo suben). Si se
    // quiere poder deshacer una compra con XP, aquí haría falta devolver la XP.
    return "La ficha está aprobada: las dotes se compran, no se venden";
  }
  const quedan = sheet.dotes.filter((_, j) => j !== i);
  if (quedan.some((d) => d.id === entrada.id)) return null; // otra copia de una repetible
  const dependientes = quedan.filter((d) => dotePorId(d.id)?.requisitos.some((r) => dependeDe(r, entrada.id, quedan)));
  if (dependientes.length) {
    const nombres = dependientes.map((d) => dotePorId(d.id)!.label).join(", ");
    return `Es requisito de ${nombres}: quita esa antes`;
  }
  return null;
}

export function quitarDote(
  sheet: Sheet,
  entrada: DoteComprada,
  ctx: ContextoQuitarDote,
): { ok: true; sheet: Sheet } | { ok: false; error: string } {
  const motivo = motivoNoQuitable(sheet, entrada, ctx);
  if (motivo) return { ok: false, error: motivo };
  const i = sheet.dotes.findIndex((d) => mismaDote(d, entrada));
  return { ok: true, sheet: { ...sheet, dotes: sheet.dotes.filter((_, j) => j !== i) } };
}

// ── Requisito no cumplido ─────────────────────────────────────────────
// Decisión del usuario (D1): si un requisito deja de cumplirse (bajar una habilidad,
// quitar una especialidad, cambiar de especie siendo máster con la ficha aprobada…),
// la dote NO se borra: queda marcada, y en creación bloquea el envío a revisión.

export type DoteRota = { dote: DoteComprada; label: string; faltan: string[] };

export function dotesConRequisitoRoto(sheet: Sheet, v: ValoresRequisito): DoteRota[] {
  return sheet.dotes.flatMap((d) => {
    const cat = dotePorId(d.id);
    if (!cat) return [];
    const faltan = estadoRequisitos(cat, v, sheet.dotes)
      .filter((r) => !r.cumple)
      .map((r) => r.texto);
    return faltan.length ? [{ dote: d, label: etiquetaDote(cat, d.eleccion), faltan }] : [];
  });
}

export function faltasDeDotes(sheet: Sheet, v: ValoresRequisito): string[] {
  return dotesConRequisitoRoto(sheet, v).map((r) => `Requisito no cumplido en la dote ${r.label}`);
}

// ── Para la pantalla ──────────────────────────────────────────────────

export function etiquetaEleccion(dote: DoteCatalogo, eleccion: string | undefined): string | null {
  if (!eleccion || !dote.eleccion) return null;
  const { eleccion: el } = dote;
  if (el.opciones === "especialidades_arma") return etiquetaEspecialidad(eleccion);
  return ("etiquetas" in el && el.etiquetas?.[eleccion]) || eleccion;
}

// "Especialidad Médica (Ceguera y sordera)".
export function etiquetaDote(dote: DoteCatalogo, eleccion: string | undefined): string {
  const el = etiquetaEleccion(dote, eleccion);
  return el ? `${dote.label} (${el})` : dote.label;
}

// Lo que pinta el selector de elección. `cerrada`: select con estas opciones (las ya
// elegidas de una repetible, fuera). Si no: input de texto libre con `opciones` de
// sugerencia (Bioma Predilecto: los ejemplos de la fuente). Crítico Mejorado: cerrada,
// con las especialidades de arma que la ficha tiene en la habilidad con la que cumple
// el requisito (`v`: ficha.requisitosDotes); `v` null = modo libre (NPC): las que tenga.
export function opcionesDeEleccion(
  dote: DoteCatalogo,
  sheet: Sheet,
  v: ValoresRequisito | null,
): { cerrada: boolean; opciones: { valor: string; etiqueta: string }[] } | null {
  const el = dote.eleccion;
  if (!el) return null;
  if (el.opciones === "especialidades_arma") {
    return {
      cerrada: true,
      opciones: especialidadesArmaElegibles(dote, sheet, v).filter(
        (o) => !sheet.dotes.some((d) => mismaDote(d, { id: dote.id, eleccion: o.valor })),
      ),
    };
  }
  if ("abierta" in el && el.abierta) return { cerrada: false, opciones: el.opciones.map((o) => ({ valor: o, etiqueta: o })) };
  return {
    cerrada: true,
    opciones: el.opciones
      .filter((o) => !sheet.dotes.some((d) => mismaDote(d, { id: dote.id, eleccion: o })))
      .map((o) => ({ valor: o, etiqueta: ("etiquetas" in el && el.etiquetas?.[o]) || o })),
  };
}

// Secciones de la pestaña: grupo (habilidad) y subgrupo, en el orden de la fuente.
// Sin las no visibles (Olfato de Investigador, §9.3).
export type SeccionDotes = { clave: string; label: string; dotes: DoteCatalogo[] };

export const SECCIONES_DOTES: readonly SeccionDotes[] = (() => {
  const secciones = new Map<string, SeccionDotes>();
  for (const d of DOTES) {
    if (!d.visible) continue;
    const clave = d.subgrupo ? `${d.grupo}:${d.subgrupo}` : d.grupo;
    let s = secciones.get(clave);
    if (!s) {
      const label = etiquetaDe(HABILIDADES, d.grupo) + (d.subgrupo === "psionica" ? " · Psiónica" : "");
      s = { clave, label, dotes: [] };
      secciones.set(clave, s);
    }
    s.dotes.push(d);
  }
  return [...secciones.values()];
})();
