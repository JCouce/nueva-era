// Absorción de daño por blindaje. Fuente: docs/sistema.md pregunta 29/§7 — 1
// punto de blindaje absorbe 1 nivel (= 1 punto) de daño. Mental y Fuego se
// quedan en 0 por defecto: ninguna fuente de blindaje del catálogo los
// menciona como cubiertos. Mejora Ignífuga nivel 1, instalada en la armadura
// que cuenta, reabre Fuego, pero solo para el blindaje de esa armadura (S19,
// S85). Tóxico SÍ cuenta como cualquier otro tipo: lo
// que el blindaje no toca es el estado de Enfermedad/Envenenamiento que
// dispare el arma, resuelto aparte por su propia salvación (ACCIONES).
import { equipoPorId, type Armadura, type Subsistema } from "../catalog/equipo";
import type { ArmaMelee } from "../catalog/armasMelee";
import { nivelesHasta, ultimoQueDefine } from "./equipo";
import { armaduraNaturalDeAumentos, blindajeReactivoDeAumentos } from "./aumentosTiradas";
import { blindajeDelBrazo } from "./brazoBionico";
import type { Sheet } from "./sheet";

export const TIPOS_DANIO = [
  { id: "cinetico", label: "Cinético" },
  { id: "electrico", label: "Eléctrico" },
  { id: "fuego", label: "Fuego" },
  { id: "frio", label: "Frío" },
  { id: "corrosivo", label: "Corrosivo" },
  { id: "plasma", label: "Plasma" },
  { id: "sonico", label: "Sónico" },
  { id: "toxico", label: "Tóxico" },
  { id: "mental", label: "Mental" },
] as const;
export type TipoDanio = (typeof TIPOS_DANIO)[number]["id"];

function armaduraEquipadaConInstancia(sheet: Sheet): { armadura: Armadura; instanciaId: string } | null {
  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (cat?.familia === "armadura") return { armadura: cat, instanciaId: pieza.instanciaId };
  }
  return null;
}

function armaduraEquipada(sheet: Sheet): Armadura | null {
  return armaduraEquipadaConInstancia(sheet)?.armadura ?? null;
}

// Mejora Ignífuga (cualquier nivel incluye el 1) instalada en la armadura que cuenta, no
// en otra que se lleve de más.
function armaduraConIgnifuga(sheet: Sheet): Armadura | null {
  const equipada = armaduraEquipadaConInstancia(sheet);
  if (!equipada) return null;
  const lleva = sheet.equipo.some(
    (p) => p.catalogoId === "mejora_ignifuga" && p.instaladoEnId === equipada.instanciaId,
  );
  return lleva ? equipada.armadura : null;
}

function absorcionEscudoDeflector(sheet: Sheet): number {
  const pieza = sheet.equipo.find((p) => p.catalogoId === "escudo_deflector");
  if (!pieza?.nivel) return 0;
  const cat = equipoPorId(pieza.catalogoId) as Subsistema | undefined;
  if (!cat) return 0;
  const definitivo = ultimoQueDefine(nivelesHasta(cat.niveles, pieza.nivel), "absorcion");
  return definitivo?.absorcion ?? 0;
}

// El escudo melee equipado (Rodela, Escudo, sus variantes de metamaterial o
// el de Kerzul) — null si no lleva ninguno. Si llevara más de uno (nada lo
// impide hoy), se usa el primero: caso de borde sin sentido de juego real,
// no vale la pena resolver "cuál cuenta".
function escudoMeleeEquipado(sheet: Sheet): ArmaMelee | null {
  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (cat?.familia === "armaMelee" && cat.defensa) return cat;
  }
  return null;
}

export function tieneEscudoMelee(sheet: Sheet): boolean {
  return escudoMeleeEquipado(sheet) !== null;
}

// Tejido Conductor nivel 2 (docs/equipamiento.md:188): "ignora el primer nivel de
// daño eléctrico" — un +1 de blindaje específico de tipo, que SE SUMA al blindaje
// normal (confirmado por Murillo, sistema.md pregunta 29), no lo sustituye. Es la
// ÚNICA de las tres mejoras "elementales" (Ignífuga/Anticorrosivo/Tejido Conductor)
// que trae este mecanismo en concreto — Ignífuga nivel 1 es distinto (habilita el
// blindaje de la armadura CONTRA fuego, en vez de sumar un extra) y Anticorrosivo no
// tiene ningún efecto de blindaje, solo cambia la categoría de daño (Hallazgo #4) y
// una salvación ya construida — no generalizar a partir de un solo caso real.
function bonoTejidoConductor(sheet: Sheet, tipo: TipoDanio): number {
  if (tipo !== "electrico") return 0;
  const pieza = sheet.equipo.find((p) => p.catalogoId === "tejido_conductor");
  return (pieza?.nivel ?? 0) >= 2 ? 1 : 0;
}

// `nota`: a qué golpes vale, si no es a todos (armadura natural de los aumentos, R6).
export type LineaBlindaje = { etiqueta: string; valor: number; nota?: string };

// Armadura natural de especie (Arköru 1, Matriz Biometálica, §14.7), ya resuelta en
// la FichaResuelta: se suma a la armadura puesta y, como ella, no cuenta contra
// Fuego ni Mental (M7, S19). `fuente` es de dónde sale, para su línea del desglose.
export type ArmaduraNatural = { valor: number; fuente: string | null };
export const SIN_ARMADURA_NATURAL: ArmaduraNatural = { valor: 0, fuente: null };

// Por qué el blindaje no cuenta contra `tipo`, o null si cuenta. Lo comparten el desglose y
// las casillas de blindaje reactivo (Densificar) y del brazo, que valen donde valga la armadura
// natural: contra Fuego siguen fuera aunque la armadura lleve Ignífuga.
export function blindajeNoCuenta(tipo: TipoDanio): string | null {
  if (tipo === "mental") return "Mental omite blindaje";
  if (tipo === "fuego") return "Fuego (falta Mejora Ignífuga)";
  return null;
}

// Desglose de qué aporta cada fuente contra `tipo` — fuente única de verdad
// para blindajeContra() (la suma de estas líneas) y para "Bloquear daño"
// (que las pinta una a una: "nada suma en silencio", mismo criterio que
// AccionModal.tsx). Mental/Fuego devuelven una única línea a 0 explicando por
// qué, en vez de una lista vacía sin más; Fuego con Mejora Ignífuga, solo la
// línea de la armadura.
//
// `reactivo` (A4b): la casilla de blindaje reactivo marcada (Densificar del Enjambre 3+). Sin
// la pieza, o contra Mental o Fuego, no suma nada.
// `conBrazo` (A6a, R12): la casilla "Bloqueado con el brazo biónico" marcada. Suma el blindaje
// del brazo (nivel 2+) a este golpe, donde cuente el blindaje; con el nivel 1, nada.
export function desgloseBlindaje(
  sheet: Sheet,
  tipo: TipoDanio,
  escudoEnAlto: boolean,
  armaduraNatural: ArmaduraNatural,
  reactivo = false,
  conBrazo = false,
): LineaBlindaje[] {
  // Ignífuga nv1 (S85): contra Fuego cuenta solo "el blindaje de su armadura", sin natural,
  // deflector, escudo, Densificar ni brazo.
  if (tipo === "fuego") {
    const ignifuga = armaduraConIgnifuga(sheet);
    if (ignifuga) return [{ etiqueta: `${ignifuga.label} · Mejora Ignífuga`, valor: ignifuga.blindaje }];
  }
  const noCuenta = blindajeNoCuenta(tipo);
  if (noCuenta) return [{ etiqueta: noCuenta, valor: 0 }];

  const lineas: LineaBlindaje[] = [];
  const armadura = armaduraEquipada(sheet);
  if (armadura) lineas.push({ etiqueta: armadura.label, valor: armadura.blindaje });

  if (armaduraNatural.valor > 0) {
    lineas.push({
      etiqueta: armaduraNatural.fuente ? `Armadura natural · ${armaduraNatural.fuente}` : "Armadura natural",
      valor: armaduraNatural.valor,
    });
  }

  // Aumentos (A2a, R6): +1 contra Cinético por pieza (Osteotendinosa, Matriz Ósea), con su
  // nota. Aparte de la de especie, que no cambia.
  for (const a of armaduraNaturalDeAumentos(sheet, tipo)) {
    lineas.push({ etiqueta: `Armadura natural · ${a.fuente}`, valor: a.valor, nota: a.nota });
  }

  const deflector = absorcionEscudoDeflector(sheet);
  if (deflector > 0) lineas.push({ etiqueta: "Escudo Deflector", valor: deflector });

  const conductor = bonoTejidoConductor(sheet, tipo);
  if (conductor > 0) lineas.push({ etiqueta: "Tejido Conductor", valor: conductor });

  if (escudoEnAlto) {
    const escudo = escudoMeleeEquipado(sheet);
    if (escudo?.defensa) lineas.push({ etiqueta: `${escudo.label} (en alto)`, valor: escudo.defensa.blindaje });
  }

  const r = reactivo ? blindajeReactivoDeAumentos(sheet) : null;
  // Su nota va junto a la casilla (casillaBlindajeReactivo), no repetida en el desglose.
  if (r) lineas.push({ etiqueta: `${r.etiqueta} · ${r.fuente}`, valor: r.valor });

  const brazo = conBrazo ? blindajeDelBrazo(sheet) : null;
  if (brazo) lineas.push({ etiqueta: `Bloqueado con el brazo · ${brazo.fuente}`, valor: brazo.valor });

  return lineas;
}

// La casilla "Bloqueado con el brazo biónico" de "Bloquear daño" (A6a, R12), o null sin el Brazo
// de nivel 2 o más. Sin coste. `bloqueada`: el tipo de daño no lo para el blindaje (el mismo
// criterio que la armadura natural y Densificar).
export type CasillaBlindajeBrazo = { etiqueta: string; valor: number; nota: string; bloqueada: string | null };

export function casillaBlindajeBrazo(sheet: Pick<Sheet, "equipo">, tipo: TipoDanio): CasillaBlindajeBrazo | null {
  const brazo = blindajeDelBrazo(sheet);
  if (!brazo) return null;
  const noCuenta = blindajeNoCuenta(tipo);
  return {
    etiqueta: "Bloqueado con el brazo biónico",
    valor: brazo.valor,
    nota: `${brazo.fuente}: su blindaje solo protege el golpe que bloqueas con el brazo, como un escudo.`,
    bloqueada: noCuenta ? MOTIVO_NO_CUENTA[tipo as "mental" | "fuego"] : null,
  };
}

// La casilla de blindaje reactivo de "Bloquear daño" (Densificar, Enjambre 3+; A4b), o null sin
// la pieza. Se cobra al marcarla y se devuelve al desmarcarla (lo hace el modal con estos
// datos). `bloqueada`: por qué no se puede marcar ahora (el tipo de daño no lo para el
// blindaje, o no llega la fatiga; marcada ya está pagada, así que la fatiga no la bloquea).
export type CasillaBlindajeReactivo = {
  etiqueta: string;
  valor: number;
  costeFatiga: number;
  nota: string;
  bloqueada: string | null;
};

const MOTIVO_NO_CUENTA = {
  mental: "No vale contra el daño mental: no lo para el blindaje.",
  fuego: "No vale contra el fuego: contra el fuego solo cuenta la armadura (con Mejora Ignífuga).",
} as const;

export function casillaBlindajeReactivo(
  sheet: Pick<Sheet, "equipo" | "fatigaActual">,
  tipo: TipoDanio,
  marcada: boolean,
): CasillaBlindajeReactivo | null {
  const r = blindajeReactivoDeAumentos(sheet);
  if (!r) return null;
  const noCuenta = blindajeNoCuenta(tipo);
  const sinFatiga =
    !marcada && sheet.fatigaActual < r.costeFatiga
      ? `No te llega la fatiga: cuesta ${r.costeFatiga} y te quedan ${sheet.fatigaActual}.`
      : null;
  return {
    etiqueta: `${r.etiqueta} (${r.fuente.replace(/ \d+$/, "")}, ${r.costeFatiga} fatiga)`,
    valor: r.valor,
    costeFatiga: r.costeFatiga,
    nota: r.nota,
    bloqueada: noCuenta ? MOTIVO_NO_CUENTA[tipo as "mental" | "fuego"] : sinFatiga,
  };
}

// Cuánto blindaje tiene el personaje AHORA MISMO contra `tipo`. `escudoEnAlto`
// se declara en el momento (docs/equipamiento.md:886, "acción simple para
// levantarlo") — no hay estado persistente de "escudo levantado" que guardar
// en la ficha, es una elección de este cálculo en concreto, igual que
// "atacantes adicionales" en Defensa.
export function blindajeContra(
  sheet: Sheet,
  tipo: TipoDanio,
  escudoEnAlto: boolean,
  armaduraNatural: ArmaduraNatural,
): number {
  return desgloseBlindaje(sheet, tipo, escudoEnAlto, armaduraNatural).reduce((total, l) => total + l.valor, 0);
}
