// Acciones propias de dote (docs/sistema.md §9.3, tanda D2c-1): cada AccionDote del catálogo
// (catalog/dotesTipos.ts) de una dote activa sale como fila en la sección "Dotes" de la
// pestaña Acciones, hermana de accionesDePsionica (poderes.ts). Lo expone resolverFicha
// (FichaResuelta.accionesDotes); la UI solo pinta.
//
//   tirada / enfrentada / ataque → Accion (FilaTirada): aplicado + habilidad, dificultad si
//               la trae, el texto por grado y lo que tira el objetivo en `poder` (el mismo
//               panel de resultado que los poderes). Con especialidad en la resolución va en
//               especialidad sola si la ficha tiene alguna de ellas, y si no, a la mitad
//               (`especialidadesAccion`, como la especialidad de un arma).
//   sin_dado  → AccionDirecta (FilaUsar), con sus notas.
//   Economía, límites, dificultad a criterio y notas: texto en la nota (§9.3).
//
// Lo que otras dotes añaden a una acción de dote (destino "accionDote", dotesDestinos.ts):
//   textos → a su nota, con la dote de la que salen (Ataque de Oportunidad Poderoso…).
//   bonos con casilla → una casilla de opción por acción (Finta: «Finta repetida»). La opción
//               de la dote dueña de la acción es la base; la de otra dote se suma a la base
//               (Maestro de Fintas +2 sobre el −2 de Finta = sin penalizador): vale la mejor
//               porque el jugador elige una sola opción.
//
// Requisito roto (S34) y "vale la mejor" entre básica y mejorada los resuelve dotesActivas:
// aquí solo llegan las activas.
import type { Accion, AccionDirecta } from "./acciones";
import type { CondicionTirada } from "./condiciones";
import type { GrupoAccion } from "./modificadores";
import type { Grado } from "./psionica";
import { etiquetaEconomia, type DetallePoder } from "./poderes";
import type { DoteActiva } from "./dotesEfectos";
import { DESTINOS_DOTES } from "../catalog/dotesDestinos";
import type { AccionDote, DoteCatalogo, EfectoDote } from "../catalog/dotesTipos";

export type AccionesDeDotes = {
  // Grupo "Dotes", y las copias en su grupo extra (Traicionero en "Iniciativa").
  tiradas: Accion[];
  directas: AccionDirecta[];
};

export const SIN_ACCIONES_DE_DOTES: AccionesDeDotes = { tiradas: [], directas: [] };

type Limite = AccionDote["limite"];
type LimiteUno = NonNullable<Exclude<Limite, unknown[]>>;

const POR: Record<LimiteUno["por"], string> = {
  turno: "turno",
  escena: "escena",
  dia: "día",
  objetivo: "objetivo",
  aliado: "aliado",
  pista: "pista",
};

const textoLimiteUno = (l: LimiteUno) => `${l.veces === 1 ? "una vez" : `${l.veces} veces`} por ${POR[l.por]}`;

function textoLimite(l: Limite): string | null {
  if (!l) return null;
  return Array.isArray(l) ? l.map(textoLimiteUno).join(" y ") : textoLimiteUno(l);
}

function textoEconomia(e: AccionDote["economia"]): string {
  const lista = Array.isArray(e) ? e : [e];
  const texto = lista.map(etiquetaEconomia).join(" o ");
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

// Dificultad de la resolución: número → la que abre el modal; a criterio → texto en la nota.
function dificultadDe(r: AccionDote["resolucion"]): { sugerida?: number; texto?: string } {
  if (r.tipo !== "tirada" || r.dificultad === undefined) return {};
  const d = r.dificultad;
  if (typeof d === "number") return { sugerida: d };
  if ("manual" in d) return { texto: `Dificultad: ${d.manual}.` };
  if ("base" in d) return { sugerida: d.base };
  // TODO(revisar): dificultad por nivel empleado en una acción de dote; ninguna la usa hoy.
  return { texto: "Dificultad: a criterio del máster." };
}

// Textos por grado. Un crítico que empieza por "Además" se suma al éxito (si no, el panel
// de resultado enseñaría solo el añadido).
function resultadosDe(a: AccionDote): Partial<Record<Grado, string>> {
  const r: Partial<Record<Grado, string>> = {};
  for (const [g, v] of Object.entries(a.resultados) as [Grado, { texto: string }][]) r[g] = v.texto;
  if (r.critico && r.exito && /^además/i.test(r.critico)) r.critico = `${r.exito} ${r.critico}`;
  return r;
}

const junta = (partes: (string | null | undefined)[]) => partes.filter(Boolean).join(" · ") || undefined;

type Bono = { doteId: string; fuente: string; condicion: string; valor: number };

// Lo que las dotes activas ponen sobre acciones de dote: textos y bonos, por id de acción.
function anadidosPorAccion(activas: readonly DoteActiva[]) {
  const textos = new Map<string, string[]>();
  const bonos = new Map<string, Bono[]>();
  for (const { dote } of activas) {
    dote.efectos.forEach((e, i) => {
      if (dote.motor[i]?.estado !== "construido") return;
      if (e.tipo === "texto" && DESTINOS_DOTES[e.lugar]?.tipo === "accionDote") {
        const texto = e.condicion ? `${e.condicion}: ${e.texto}` : e.texto;
        textos.set(e.lugar, [...(textos.get(e.lugar) ?? []), `${texto} (${dote.label})`]);
      }
      if (e.tipo === "bono" && DESTINOS_DOTES[e.alcance]?.tipo === "accionDote" && typeof e.valor === "number" && e.condicion) {
        const b = { doteId: dote.id, fuente: dote.label, condicion: e.condicion, valor: e.valor };
        bonos.set(e.alcance, [...(bonos.get(e.alcance) ?? []), b]);
      }
    });
  }
  return { textos, bonos };
}

// Nombre corto de la casilla por acción; sin entrada, la condición de la base.
const ETIQUETA_CASILLA: Readonly<Record<string, string>> = { dotes_finta: "Finta repetida" };

function casillaDeBonos(accion: AccionDote, dueña: DoteCatalogo, bonos: Bono[] | undefined): CondicionTirada | null {
  const base = bonos?.find((b) => b.doteId === dueña.id);
  if (!base) return null;
  const otras = bonos!.filter((b) => b !== base);
  return {
    id: `${accion.id}_casilla`,
    tipo: "opcion",
    etiqueta: ETIQUETA_CASILLA[accion.id] ?? base.condicion,
    opciones: [
      { id: "no", etiqueta: "No", valor: 0 },
      { id: base.doteId, etiqueta: `${base.condicion} (${base.fuente})`, valor: base.valor },
      ...otras.map((b) => ({ id: b.doteId, etiqueta: `${b.condicion} (${b.fuente})`, valor: base.valor + b.valor })),
    ],
    porDefecto: "no",
  };
}

function construir(
  dote: DoteCatalogo,
  accion: AccionDote,
  anadidos: ReturnType<typeof anadidosPorAccion>,
): { tirada: Accion } | { directa: AccionDirecta } {
  const r = accion.resolucion;
  const dificultad = dificultadDe(r);
  const nota = junta([
    [textoEconomia(accion.economia), textoLimite(accion.limite)].filter(Boolean).join(", "),
    ...accion.notas.map((n) => (n.condicion ? `${n.condicion}: ${n.texto}` : n.texto)),
    dificultad.texto,
    r.tipo === "enfrentada" ? "Enfrentada: la dificultad es el total del rival." : null,
    ...(anadidos.textos.get(accion.id) ?? []),
  ]);

  if (r.tipo === "sin_dado") {
    // Sin dado no hay grado: lo que pasa al usarla, a la nota.
    const resultados = resultadosDe(accion);
    return {
      directa: {
        id: accion.id,
        label: accion.label,
        grupo: "Dotes",
        nota: junta([nota, resultados.exito]),
      },
    };
  }

  const casilla = casillaDeBonos(accion, dote, anadidos.bonos.get(accion.id));
  const detalle: DetallePoder = { resultados: resultadosDe(accion), objetivoTira: accion.objetivoTira };
  const especialidades = r.especialidad === undefined ? [] : [r.especialidad].flat();
  return {
    tirada: {
      id: accion.id,
      label: accion.label,
      grupo: "Dotes",
      aplicado: r.aplicado,
      habilidad: r.habilidad,
      ...(nota && { nota }),
      ...(especialidades.length > 0 && { especialidadesAccion: especialidades }),
      ...(dificultad.sugerida !== undefined && { dificultadSugerida: dificultad.sugerida }),
      ...(r.tipo === "ataque" && r.modificador !== undefined && { ajustesFijos: [{ valor: r.modificador, fuente: accion.label }] }),
      ...(casilla && { condiciones: [casilla] }),
      poder: detalle,
    },
  };
}

// Una copia en el grupo extra: id propio (la fila y la memoria de dificultad del modal van
// por id) y ese grupo, para que le lleguen sus modificadores (Iniciativa).
// TODO(revisar): Traicionero como iniciativa recibe los bonos de grupo Iniciativa (Vigilancia
// Táctica +2); los textos de dote de Iniciativa van por id a las tres tiradas fijas, no aquí.
const enGrupo = <T extends { id: string; grupo: GrupoAccion }>(a: T, grupo: GrupoAccion): T => ({
  ...a,
  id: `${a.id}__${grupo.toLowerCase()}`,
  grupo,
});

export function accionesDeDotes(activas: readonly DoteActiva[]): AccionesDeDotes {
  const tiradas: Accion[] = [];
  const directas: AccionDirecta[] = [];
  const anadidos = anadidosPorAccion(activas);
  for (const { dote } of activas) {
    dote.efectos.forEach((e: EfectoDote, i) => {
      if (e.tipo !== "accion" || dote.motor[i]?.estado !== "construido") return;
      const hecha = construir(dote, e.accion, anadidos);
      const extra = e.accion.grupoExtra;
      if ("tirada" in hecha) tiradas.push(hecha.tirada, ...(extra ? [enGrupo(hecha.tirada, extra)] : []));
      else directas.push(hecha.directa, ...(extra ? [enGrupo(hecha.directa, extra)] : []));
    });
  }
  return tiradas.length === 0 && directas.length === 0 ? SIN_ACCIONES_DE_DOTES : { tiradas, directas };
}
