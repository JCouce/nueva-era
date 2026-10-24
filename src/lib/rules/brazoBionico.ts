// Brazo Biónico (A6a de docs/propuesta-aumentos.md, docs/sistema.md §11.3, R4 y R12): la
// Fuerza y la Agilidad propias del brazo, la casilla "Con el brazo biónico" de los ataques,
// la fila "Bloquear con el brazo biónico" y el blindaje para el golpe bloqueado.
//
// Base del brazo: la Fuerza y la Agilidad permanentes del usuario (comprado + especie +
// aumentos permanentes, sin estados ni activables), la misma base que los requisitos de dote
// (modificadoresDeRequisito), más el +N a la Fuerza del Exoesqueleto: se apilan (usuario,
// 2026-10-24). Encima, el delta del nivel o del modelo con
// su tope (`ExtremidadBionica`, en el catálogo). Los atributos del brazo solo valen en las
// tiradas y el daño hechos con él: no tocan la vida, los requisitos ni la ficha (usuario,
// 2026-10-22). A6b: la casilla también en "Bloquear con X" con un arma de una mano, y el arma
// incorporada (el vínculo, PiezaEquipada.armaIncorporada, vive en rules/equipo.ts): sus filas
// usan siempre el brazo, sin casilla.
import { aumentoPorId, nivelDeImplante } from "./aumentos";
import { atributosEfectivos, modificadoresActivos, topeAgilidadDeArmaduras } from "./derivados";
import { modificadoresDeRequisito } from "./dotes";
import { especieDeFicha } from "./especie";
import { ID_BRAZO_BIONICO, nivelesHasta, ultimoQueDefine, type PiezaEquipada } from "./equipo";
import type { AtributosExtremidad, CondicionTirada } from "./condiciones";
import type { Sheet } from "./sheet";

export const ID_CASILLA_BRAZO = "brazo_bionico";
export const ID_BLOQUEAR_BRAZO = "aumentos_bloquear_brazo";

// "+N sobre la del usuario con límite máximo de T": si la base ya pasa el tope, vale el tope.
export type AtributoDeExtremidad = { delta: number; tope?: number };

// Lo que trae un nivel o un modelo del brazo. `blindaje`: solo protege el golpe que se bloquea
// con el brazo (R12). `bloquea`: hay fila "Bloquear con el brazo biónico" (con la dote
// Bloqueo). `peleaLetal`: el Puñetazo y el codazo con el brazo hacen daño letal. El nivel 1 no
// trae ninguno de los tres.
export type ExtremidadBionica = {
  fuerza: AtributoDeExtremidad;
  agilidad: AtributoDeExtremidad;
  blindaje?: number;
  bloquea?: true;
  peleaLetal?: true;
};

export function valorDeExtremidad(base: number, a: AtributoDeExtremidad): number {
  const valor = base + a.delta;
  return a.tope === undefined ? valor : Math.min(valor, a.tope);
}

type ExtremidadEquipada = { pieza: PiezaEquipada; nivel: number; fuente: string; extremidad: ExtremidadBionica };

// El brazo equipado y lo que trae su nivel o su modelo, o null sin él. El modelo (niveles 3 y
// 4) viaja en `PiezaEquipada.eleccion`; si falta o no casa con el nivel, vale el último nivel
// que lo defina sin modelo (el 2). TODO(revisar): comprarAumento exige el modelo, así que ese
// caso solo sale con una ficha editada a mano.
function extremidadEquipada(sheet: Pick<Sheet, "equipo">): ExtremidadEquipada | null {
  const pieza = sheet.equipo.find((p) => p.catalogoId === ID_BRAZO_BIONICO);
  const cat = aumentoPorId(ID_BRAZO_BIONICO);
  if (!pieza?.nivel || cat?.familia !== "implante") return null;
  const nivel = nivelDeImplante(cat, pieza.nivel);
  const variante = nivel?.variantes?.find((v) => v.id === pieza.eleccion);
  const extremidad =
    variante?.extremidad ?? nivel?.extremidad ?? ultimoQueDefine(nivelesHasta(cat.niveles, pieza.nivel), "extremidad")?.extremidad;
  if (!extremidad) return null;
  const fuente = `${cat.label} ${pieza.nivel}${variante ? ` (${variante.label})` : ""}`;
  return { pieza, nivel: pieza.nivel, fuente, extremidad };
}

export type BrazoBionico = {
  instanciaId: string;
  nivel: number;
  // "Brazo Biónico 3 (Modelo Fuerte)": la fuente de las líneas del desglose.
  fuente: string;
  fuerza: number;
  agilidad: number;
  // La base del usuario de la que sale: permanente más el Exoesqueleto.
  base: { fuerza: number; agilidad: number };
  blindaje: number | null;
  bloquea: boolean;
  peleaLetal: boolean;
  // instanciaId del arma incorporada (A6b), o null.
  armaIncorporada: string | null;
};

export function brazoBionico(sheet: Sheet): BrazoBionico | null {
  const e = extremidadEquipada(sheet);
  if (!e) return null;
  const exoesqueleto = modificadoresActivos(sheet).filter((m) => m.tipo === "atributo" && m.exceptoSaludYSalvaciones);
  const permanentes = atributosEfectivos(sheet, [
    ...modificadoresDeRequisito(sheet, especieDeFicha(sheet)?.modificadores ?? []),
    ...exoesqueleto,
  ]);
  const base = { fuerza: permanentes.fuerza, agilidad: permanentes.agilidad };
  // El tope de Agilidad de la armadura (S93) también topa la del brazo: va dentro de la armadura,
  // y si no, el brazo sería una forma de saltárselo. La base no lo lleva (es la permanente).
  const topeArmadura = topeAgilidadDeArmaduras(sheet)?.tope ?? Infinity;
  return {
    instanciaId: e.pieza.instanciaId,
    nivel: e.nivel,
    fuente: e.fuente,
    fuerza: valorDeExtremidad(base.fuerza, e.extremidad.fuerza),
    agilidad: Math.min(valorDeExtremidad(base.agilidad, e.extremidad.agilidad), topeArmadura),
    base,
    blindaje: e.extremidad.blindaje ?? null,
    bloquea: e.extremidad.bloquea === true,
    peleaLetal: e.extremidad.peleaLetal === true,
    armaIncorporada: e.pieza.armaIncorporada ?? null,
  };
}

// El blindaje del brazo para "Bloquear daño" (R12), sin mirar atributos: con el nivel 1, null.
export function blindajeDelBrazo(sheet: Pick<Sheet, "equipo">): { valor: number; fuente: string } | null {
  const e = extremidadEquipada(sheet);
  return e?.extremidad.blindaje ? { valor: e.extremidad.blindaje, fuente: e.fuente } : null;
}

function atributosDeBrazo(brazo: BrazoBionico, danioDeFuerza: boolean): AtributosExtremidad {
  return { fuente: brazo.fuente, fuerza: brazo.fuerza, agilidad: brazo.agilidad, ...(danioDeFuerza && { danioDeFuerza: true as const }) };
}

// ── Casilla "Con el brazo biónico" ─────────────────────────────────────

// Lo de un ataque que decide si lleva la casilla.
export type AtaqueParaBrazo = {
  catalogoId: string;
  familiaArma?: string;
  empleoArma?: string;
  // El daño sale de la Fuerza (las fórmulas "Fue+N" del cuerpo a cuerpo).
  danioDeFuerza: boolean;
};

const PUNETAZO = "pelea_punetazo";
const CODAZO = "pelea_codazo_rodillazo";
const PATADA = "pelea_patada";

// Puñetazo y "Codazo o Rodillazo" (solo el codazo, por la nota), las armas de cuerpo a cuerpo
// de una mano, las de fuego de una mano y "Bloquear con X" con un arma de cuerpo a cuerpo de una
// mano, escudos incluidos (A6b). La Patada no: es la pierna. Lanzar un arma arrojadiza y lanzar
// granadas, tampoco (usuario, 2026-10-22).
export function llevaCasillaBrazo(a: AtaqueParaBrazo): boolean {
  if (a.catalogoId === PATADA) return false;
  if (a.empleoArma !== "una mano") return false;
  return a.familiaArma === "ataque_melee" || a.familiaArma === "ataque_fuego" || a.familiaArma === "bloquear_melee";
}

const esPeleaDeBrazo = (catalogoId: string) => catalogoId === PUNETAZO || catalogoId === CODAZO;

export function casillaBrazo(brazo: BrazoBionico, a: AtaqueParaBrazo): CondicionTirada | null {
  if (!llevaCasillaBrazo(a)) return null;
  const esPelea = esPeleaDeBrazo(a.catalogoId);
  // "Bloquear con Puñetazo" con el brazo es bloquear con el brazo: eso ya es la fila "Bloquear
  // con el brazo biónico" (nivel 2+; con el 1 no se bloquea). TODO(revisar): sin casilla.
  if (esPelea && a.familiaArma === "bloquear_melee") return null;
  const letal = esPelea && brazo.peleaLetal;
  const nota = [
    `Fuerza ${brazo.fuerza} y Agilidad ${brazo.agilidad} del brazo (${brazo.fuente}) en vez de las tuyas, aunque sean menores${a.danioDeFuerza ? "; también en el daño" : ""}.`,
    a.catalogoId === CODAZO ? "Solo si es codazo, no rodillazo." : null,
    letal ? "Daño letal en vez de no letal." : null,
  ]
    .filter(Boolean)
    .join(" ");
  return {
    id: ID_CASILLA_BRAZO,
    tipo: "toggle",
    etiqueta: "Con el brazo biónico",
    valorActivo: 0,
    nota,
    extremidad: atributosDeBrazo(brazo, a.danioDeFuerza),
    ...(letal && { danio: { categoria: "Letal" } }),
  };
}

// ── Arma incorporada (A6b) ─────────────────────────────────────────────

export const NOTA_ARMA_INCORPORADA =
  "Incorporada en el Brazo Biónico: desenfundado gratis, no te la pueden desarmar, cuenta para la carga.";

// Las filas del arma incorporada que van con el brazo (las mismas que llevarían la casilla):
// siempre con sus atributos, sin casilla. Lanzarla, no (fuera de A6b). null si no toca.
export function extremidadIncorporada(brazo: BrazoBionico, instanciaId: string, a: AtaqueParaBrazo): AtributosExtremidad | null {
  if (brazo.armaIncorporada !== instanciaId || !llevaCasillaBrazo(a)) return null;
  return atributosDeBrazo(brazo, a.danioDeFuerza);
}

// ── "Bloquear con el brazo biónico" ─────────────────────────────────────

// Lo que la fila de bloqueo saca del brazo: tira siempre con sus atributos (sin casilla).
export function extremidadDeBloqueo(brazo: BrazoBionico): AtributosExtremidad | null {
  return brazo.bloquea ? atributosDeBrazo(brazo, false) : null;
}
