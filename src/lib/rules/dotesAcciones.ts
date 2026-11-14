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
//   Economía, dificultad a criterio y notas: texto en la nota (§9.3).
//
// Límites (`limite`, usuario 2026-10-28): en la nota y, en la ficha de un jugador (con `mesa`),
// se cuentan de verdad con los contadores de la escena (usosEscena.ts) y se gastan al tirar
// (gastarUsoLimitado, en el servidor):
//   escena   N por escena: agotado, la tirada sale bloqueada hasta "Terminar escena".
//   aliado   1 por aliado (y escena): selector de aliado (los de la mesa con usos); sin
//            ninguno, bloqueada.
//   turno    N por turno: solo en combate (la ronda del combate en curso); fuera, texto.
//   dia, objetivo, pista: ninguna acción los usa hoy; quedan como texto.
// Sin `mesa` (NPC en la consola o en su editor) el límite es solo texto, como antes.
//
// Lo que otras dotes añaden a una acción de dote (destino "accionDote", dotesDestinos.ts):
//   textos → a su nota, con la dote de la que salen (Ataque de Oportunidad Poderoso…).
//   bonos con casilla → una casilla de opción por acción (Finta: «Finta repetida»). La opción
//               de la dote dueña de la acción es la base; la de otra dote se suma a la base
//               (Maestro de Fintas +2 sobre el −2 de Finta = sin penalizador): vale la mejor
//               porque el jugador elige una sola opción.
//   ventaja con casilla (D2d) → un toggle por efecto: marcado, dos d12 y vale el mejor (Apoyo
//               con vínculo fuerte, Violencia Aterradora tras un crítico).
//   objetivo (T3c) → `efectosObjetivoDeFicha`: lo que la acción le hace a su objetivo, en «El
//               objetivo» del resultado (intimidar en combate: Grito de Guerra y compañía).
//
// Lo que la acción te pone a ti por su grado (`resultados.<grado>.estadosPropios`, T3c: Miedo
// en el fracaso crítico al intimidar) va en `consecuenciasPropias`; lo aplica el servidor.
//
// Requisito roto (S34) y "vale la mejor" entre básica y mejorada los resuelve dotesActivas:
// aquí solo llegan las activas.
import type { Accion, AccionDirecta, UsoLimitado } from "./acciones";
import type { EfectoEnTirada } from "./efectosArma";
import type { ConsecuenciaPropia } from "./consecuenciasPropias";
import type { CondicionTirada } from "./condiciones";
import type { Sheet } from "./sheet";
import { claveContador, conContador, contadorEscena } from "./usosEscena";
import { bloqueadaPor, type Habilitacion } from "./habilitacion";
import type { GrupoAccion } from "./modificadores";
import type { Grado } from "./psionica";
import type { DetallePoder } from "./poderes";
import { etiquetaEconomia } from "./tipoAccion";
import { origenDeDote, type DoteActiva } from "./dotesEfectos";
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

// Lo que la ficha sabe de la mesa para los límites: los aliados (los otros personajes en juego)
// y el turno del combate en curso (claveDeTurno; null fuera de combate). Lo pone quien resuelve
// la ficha de un jugador (página y servidor, lib/mesaDeFicha.ts).
export type MesaDeFicha = { aliados: readonly { id: string; nombre: string }[]; turno: string | null };

export const ID_ALIADO_DOTE = "dote_aliado";

type ContextoLimites = { usosEscena: readonly string[]; mesa: MesaDeFicha | null };
const SIN_LIMITES: ContextoLimites = { usosEscena: [], mesa: null };

const limitesDe = (l: Limite): LimiteUno[] => (!l ? [] : Array.isArray(l) ? l : [l]);

// El uso limitado de una acción, su bloqueo si está agotado y el selector de aliado. null si no
// tiene límite que se cuente (o no hay mesa).
function limiteContado(
  accion: AccionDote,
  { usosEscena, mesa }: ContextoLimites,
): { uso: UsoLimitado; habilitacion?: Habilitacion; selector?: CondicionTirada } | null {
  if (!mesa) return null;
  const uso: UsoLimitado = { accionId: accion.id, claves: [] };
  const motivos: string[] = [];
  let selector: CondicionTirada | undefined;
  for (const l of limitesDe(accion.limite)) {
    if (l.por === "escena" || (l.por === "turno" && mesa.turno)) {
      const clave = l.por === "escena" ? claveContador(accion.id) : claveContador(accion.id, { turno: mesa.turno! });
      uso.claves.push({ clave, veces: l.veces });
      const usados = contadorEscena(usosEscena, clave);
      if (usados >= l.veces) motivos.push(`Usada ${l.por === "escena" ? "esta escena" : "este turno"} (${usados}/${l.veces}).`);
    } else if (l.por === "aliado") {
      uso.porAliado = { veces: l.veces };
      const libres = mesa.aliados.filter((a) => contadorEscena(usosEscena, claveContador(accion.id, { aliado: a.id })) < l.veces);
      if (libres.length === 0) {
        motivos.push(mesa.aliados.length === 0 ? "No hay aliados en la mesa." : "Ya la has usado con todos tus aliados esta escena.");
      } else {
        selector = {
          id: ID_ALIADO_DOTE,
          tipo: "opcion",
          etiqueta: "Aliado",
          opciones: libres.map((a) => ({ id: a.id, etiqueta: a.nombre, valor: 0, sinValor: true as const })),
          porDefecto: libres[0].id,
        };
      }
    }
  }
  if (uso.claves.length === 0 && !uso.porAliado) return null;
  return {
    uso,
    ...(motivos.length > 0 && { habilitacion: bloqueadaPor(motivos.join(" "), "duro") }),
    ...(selector && { selector }),
  };
}

// Gasta un uso de la acción (al tirar): sube sus contadores y, por aliado, el del elegido. Lo
// vuelve a comprobar todo (el servidor lo llama con el uso que él mismo ha calculado).
export function gastarUsoLimitado(
  sheet: Sheet,
  uso: UsoLimitado,
  aliadoId: string | null,
  aliados: readonly { id: string }[],
): { ok: true; sheet: Sheet } | { ok: false; error: string } {
  let tras = sheet;
  for (const { clave, veces } of uso.claves) {
    const usados = contadorEscena(sheet.usosEscena, clave);
    if (usados >= veces) return { ok: false, error: "Ya no te quedan usos de esa acción." };
    tras = conContador(tras, clave, usados + 1);
  }
  if (uso.porAliado) {
    if (!aliadoId || !aliados.some((a) => a.id === aliadoId)) return { ok: false, error: "Elige un aliado de la mesa." };
    const clave = claveContador(uso.accionId, { aliado: aliadoId });
    const usados = contadorEscena(sheet.usosEscena, clave);
    if (usados >= uso.porAliado.veces) return { ok: false, error: "Ya la has usado con ese aliado esta escena." };
    tras = conContador(tras, clave, usados + 1);
  }
  return { ok: true, sheet: tras };
}

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
  const ventajas = new Map<string, CondicionTirada[]>();
  const objetivos = new Map<string, EfectoEnTirada[]>();
  for (const activa of activas) {
    const { dote } = activa;
    dote.efectos.forEach((e, i) => {
      if (dote.motor[i]?.estado !== "construido") return;
      if (e.tipo === "objetivo" && DESTINOS_DOTES[e.lugar]?.tipo === "accionDote") {
        const efecto: EfectoEnTirada = { ...e.efecto, fuente: dote.label, origen: origenDeDote(activa) };
        objetivos.set(e.lugar, [...(objetivos.get(e.lugar) ?? []), efecto]);
      }
      if (e.tipo === "texto" && DESTINOS_DOTES[e.lugar]?.tipo === "accionDote") {
        const texto = e.condicion ? `${e.condicion}: ${e.texto}` : e.texto;
        textos.set(e.lugar, [...(textos.get(e.lugar) ?? []), `${texto} (${dote.label})`]);
      }
      if (e.tipo === "bono" && DESTINOS_DOTES[e.alcance]?.tipo === "accionDote" && typeof e.valor === "number" && e.condicion) {
        const b = { doteId: dote.id, fuente: dote.label, condicion: e.condicion, valor: e.valor };
        bonos.set(e.alcance, [...(bonos.get(e.alcance) ?? []), b]);
      }
      if (e.tipo === "ventaja" && DESTINOS_DOTES[e.alcance]?.tipo === "accionDote") {
        const c: CondicionTirada = {
          id: `${e.alcance}_ventaja_${dote.id}`,
          tipo: "toggle",
          etiqueta: `${e.condicion ?? "Con ventaja"} (${dote.label})`,
          valorActivo: 0,
          ventaja: true,
          ...(e.coste && { costeFatiga: e.coste.fatiga }),
        };
        ventajas.set(e.alcance, [...(ventajas.get(e.alcance) ?? []), c]);
      }
    });
  }
  return { textos, bonos, ventajas, objetivos };
}

// Los estados que la acción te pone por su grado, como consecuencia propia.
function consecuenciasDe(a: AccionDote): Partial<Record<Grado, ConsecuenciaPropia>> | null {
  const c: Partial<Record<Grado, ConsecuenciaPropia>> = {};
  for (const [g, v] of Object.entries(a.resultados) as [Grado, AccionDote["resultados"][Grado]][]) {
    if (v?.estadosPropios) c[g] = { texto: v.texto, estados: v.estadosPropios };
  }
  return Object.keys(c).length > 0 ? c : null;
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
  limites: ContextoLimites,
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

  const limite = limiteContado(accion, limites);
  const casillas = [
    ...(limite?.selector ? [limite.selector] : []),
    ...[casillaDeBonos(accion, dote, anadidos.bonos.get(accion.id))].filter((c) => c !== null),
    ...(anadidos.ventajas.get(accion.id) ?? []),
  ];
  const detalle: DetallePoder = { resultados: resultadosDe(accion), objetivoTira: accion.objetivoTira };
  const objetivos = anadidos.objetivos.get(accion.id) ?? [];
  const consecuencias = consecuenciasDe(accion);
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
      ...(casillas.length > 0 && { condiciones: casillas }),
      poder: detalle,
      ...(objetivos.length > 0 && { efectosObjetivoDeFicha: objetivos }),
      ...(consecuencias && { consecuenciasPropias: consecuencias }),
      ...(limite && { usoLimitado: limite.uso }),
      ...(limite?.habilitacion && { habilitacion: limite.habilitacion }),
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

// `limites`: los usos gastados de la ficha y su mesa, para contar los límites (sin mesa, texto).
export function accionesDeDotes(activas: readonly DoteActiva[], limites: ContextoLimites = SIN_LIMITES): AccionesDeDotes {
  const tiradas: Accion[] = [];
  const directas: AccionDirecta[] = [];
  const anadidos = anadidosPorAccion(activas);
  for (const activa of activas) {
    const { dote } = activa;
    const origen = origenDeDote(activa);
    dote.efectos.forEach((e: EfectoDote, i) => {
      if (e.tipo !== "accion" || dote.motor[i]?.estado !== "construido") return;
      const hecha = construir(dote, e.accion, anadidos, limites);
      const extra = e.accion.grupoExtra;
      if ("tirada" in hecha) {
        const tirada = { ...hecha.tirada, origen };
        tiradas.push(tirada, ...(extra ? [enGrupo(tirada, extra)] : []));
      } else {
        const directa = { ...hecha.directa, origen };
        directas.push(directa, ...(extra ? [enGrupo(directa, extra)] : []));
      }
    });
  }
  return tiradas.length === 0 && directas.length === 0 ? SIN_ACCIONES_DE_DOTES : { tiradas, directas };
}
