// Absorción de daño por blindaje. Fuente: docs/sistema.md pregunta 29/§7 — 1
// punto de blindaje absorbe 1 nivel (= 1 punto) de daño. Mental y Fuego se
// quedan en 0 por defecto: ninguna fuente de blindaje del catálogo los
// menciona como cubiertos. Mejora Ignífuga nivel 1, instalada en la armadura
// que cuenta, reabre Fuego, pero solo para el blindaje de esa armadura (S19,
// S85). Tóxico SÍ cuenta como cualquier otro tipo: lo
// que el blindaje no toca es el estado de Enfermedad/Envenenamiento que
// dispare el arma, resuelto aparte por su propia salvación (ACCIONES).
//
// El escudo melee NO suma al blindaje del portador (Murillo, 2026-10-23): su blindaje solo
// sirve para que el propio escudo aguante cuando el golpe le da a él (golpeAlEscudo).
import { equipoPorId, type Armadura, type Subsistema } from "../catalog/equipo";
import type { ArmaMelee } from "../catalog/armasMelee";
import { nivelesHasta, ultimoQueDefine } from "./equipo";
import { armaduraNaturalDeAumentos, blindajeReactivoDeAumentos } from "./aumentosTiradas";
import { blindajeDelBrazo } from "./brazoBionico";
import { ajustarRecurso, MOTIVO_ESCUDO_ROTO, reconciliarRecursos } from "./recursos";
import type { Sheet } from "./sheet";
import type { EstadoActivo } from "./estados";
import { origenDePieza, type OrigenAporte } from "./origen";
import { absorcionDeGradoContencion, ESTADO_CONTENCION_ID } from "../catalog/psionica";

import { TIPOS_DANIO, cambiaEnCritico, type TipoDanio } from "../catalog/tiposDanio";
export { TIPOS_DANIO, cambiaEnCritico, type TipoDanio };

function armaduraEquipadaConInstancia(sheet: Sheet): { armadura: Armadura; instanciaId: string } | null {
  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (cat?.familia === "armadura") return { armadura: cat, instanciaId: pieza.instanciaId };
  }
  return null;
}

// Blindaje perdido para siempre (eq-20 del cuestionario, usuario 2026-11-13): el crítico de la
// Munición Perforante, el Proyector de Pulso 4 y el Impacto Estructural de Kerzul quitan puntos
// a la armadura del objetivo. Se guardan en el recurso "blindaje" de la instancia (recursos.ts,
// como la durabilidad del escudo): perdidos = máximo − actual. Lo que enseña la app (Resistir
// daño, Equipo) es el del catálogo menos los perdidos. Reparar la armadura los devuelve.
export type BlindajeDeArmadura = {
  instanciaId: string;
  etiqueta: string;
  base: number;
  perdido: number;
  actual: number;
};

export function blindajeDeInstancia(
  sheet: Pick<Sheet, "equipo" | "recursos">,
  instanciaId: string,
): BlindajeDeArmadura | null {
  const pieza = sheet.equipo.find((p) => p.instanciaId === instanciaId);
  const cat = pieza ? equipoPorId(pieza.catalogoId) : undefined;
  if (cat?.familia !== "armadura") return null;
  // Sin entrada en recursos (ficha sin reconciliar), la armadura está entera.
  const recurso = sheet.recursos.find((r) => r.instanciaId === instanciaId);
  const perdido = recurso ? Math.min(cat.blindaje, Math.max(0, recurso.max - recurso.actual)) : 0;
  return { instanciaId, etiqueta: cat.label, base: cat.blindaje, perdido, actual: cat.blindaje - perdido };
}

// La armadura que cuenta (la primera equipada), con su blindaje de ahora. null sin armadura.
export function blindajeDeArmadura(sheet: Pick<Sheet, "equipo" | "recursos">): BlindajeDeArmadura | null {
  const pieza = sheet.equipo.find((p) => equipoPorId(p.catalogoId)?.familia === "armadura");
  return pieza ? blindajeDeInstancia(sheet, pieza.instanciaId) : null;
}

// Quita `puntos` de blindaje a la armadura que cuenta (sin bajar de 0); con `puntos` negativo los
// devuelve (deshacer en Resistir daño). Sin armadura, la misma ficha.
export function romperBlindaje(sheet: Sheet, puntos: number): Sheet {
  const armadura = blindajeDeArmadura(sheet);
  if (!armadura || !Number.isFinite(puntos) || Math.round(puntos) === 0) return sheet;
  return ajustarRecurso(reconciliarRecursos(sheet), armadura.instanciaId, -Math.round(puntos));
}

// Línea del desglose de la armadura: su blindaje de ahora, con lo perdido en la nota.
function lineaDeArmadura(sheet: Sheet, etiqueta: (label: string) => string): LineaBlindaje | null {
  const a = blindajeDeArmadura(sheet);
  if (!a) return null;
  return {
    etiqueta: etiqueta(a.etiqueta),
    valor: a.actual,
    ...(a.perdido > 0 && { nota: `${a.perdido} de ${a.base} perdido${a.perdido > 1 ? "s" : ""} para siempre (repárala con materiales).` }),
  };
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

function absorcionEscudoDeflector(sheet: Sheet): { valor: number; origen: OrigenAporte } | null {
  const pieza = sheet.equipo.find((p) => p.catalogoId === "escudo_deflector");
  if (!pieza?.nivel) return null;
  const cat = equipoPorId(pieza.catalogoId) as Subsistema | undefined;
  if (!cat) return null;
  const definitivo = ultimoQueDefine(nivelesHasta(cat.niveles, pieza.nivel), "absorcion");
  return { valor: definitivo?.absorcion ?? 0, origen: origenDePieza("equipo", cat, pieza.instanciaId) };
}

// El escudo melee equipado (Rodela, Escudo, sus variantes de metamaterial o
// el de Kerzul) — null si no lleva ninguno. Si llevara más de uno (nada lo
// impide hoy), se usa el primero: caso de borde sin sentido de juego real,
// no vale la pena resolver "cuál cuenta".
function escudoMeleeEquipado(sheet: Pick<Sheet, "equipo">): { escudo: ArmaMelee; instanciaId: string } | null {
  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (cat?.familia === "armaMelee" && cat.defensa) return { escudo: cat, instanciaId: pieza.instanciaId };
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
function bonoTejidoConductor(sheet: Sheet, tipo: TipoDanio): { valor: number; origen: OrigenAporte } | null {
  if (tipo !== "electrico") return null;
  const pieza = sheet.equipo.find((p) => p.catalogoId === "tejido_conductor");
  const cat = pieza && equipoPorId(pieza.catalogoId);
  return pieza && cat && (pieza.nivel ?? 0) >= 2 ? { valor: 1, origen: origenDePieza("equipo", cat, pieza.instanciaId) } : null;
}

// `nota`: a qué golpes vale, si no es a todos (armadura natural de los aumentos, R6).
// `origen`: la pieza que lo da, para que el Shock (conShockEnLineas, rules/shock.ts) la deje en lo
// que aporta de verdad. Sin él (armadura natural de especie, Contención), no es de una pieza.
export type LineaBlindaje = { etiqueta: string; valor: number; nota?: string; origen?: OrigenAporte };

// Armadura natural de especie (Arköru 1, Matriz Biometálica, §14.7), ya resuelta en
// la FichaResuelta: se suma a la armadura puesta y, como ella, no cuenta contra
// Fuego ni Mental (M7, S19). `fuente` es de dónde sale, para su línea del desglose.
export type ArmaduraNatural = { valor: number; fuente: string | null };
export const SIN_ARMADURA_NATURAL: ArmaduraNatural = { valor: 0, fuente: null };

// Absorción de la Contención puesta (estado propio, P1 de psiónica), ya resuelta en la
// FichaResuelta. Cubre todo daño menos el mental, también el fuego (Murillo, 2026-09-29: "todo
// daño menos el mental"), y se suma al resto. Con los estados que hacen efecto (sin inmunes).
export type AbsorcionPropia = { valor: number; fuente: string };

export function absorcionDeContencion(estados: readonly EstadoActivo[]): AbsorcionPropia | null {
  const puesto = estados.find((e) => e.estadoId === ESTADO_CONTENCION_ID);
  const valor = puesto ? absorcionDeGradoContencion(puesto.gradoId) : null;
  return valor ? { valor, fuente: "Contención" } : null;
}

// Por qué el blindaje no cuenta contra `tipo`, o null si cuenta. Lo comparten el desglose y
// las casillas de blindaje reactivo (Densificar) y del brazo, que valen donde valga la armadura
// natural: contra Fuego siguen fuera aunque la armadura lleve Ignífuga.
export function blindajeNoCuenta(tipo: TipoDanio): string | null {
  if (tipo === "mental") return "Mental omite blindaje";
  if (tipo === "fuego") return "Fuego (falta Mejora Ignífuga)";
  return null;
}

// Desglose de qué aporta cada fuente contra `tipo` — fuente única de verdad
// para blindajeContra() (la suma de estas líneas) y para "Resistir daño"
// (que las pinta una a una: "nada suma en silencio", mismo criterio que
// AccionModal.tsx). Mental/Fuego devuelven una única línea a 0 explicando por
// qué, en vez de una lista vacía sin más; Fuego con Mejora Ignífuga, solo la
// línea de la armadura.
//
// `reactivo` (A4b): la casilla de blindaje reactivo marcada (Densificar del Enjambre 3+). Sin
// la pieza, o contra Mental o Fuego, no suma nada.
// `conBrazo` (A6a, R12): la casilla "Bloqueado con el brazo biónico" marcada. Suma el blindaje
// del brazo (nivel 2+) a este golpe, donde cuente el blindaje; con el nivel 1, nada.
// `contencion` (P1 de psiónica): la absorción de la Contención puesta, que vale también contra
// el fuego; contra el mental, no.
export function desgloseBlindaje(
  sheet: Sheet,
  tipo: TipoDanio,
  armaduraNatural: ArmaduraNatural,
  reactivo = false,
  conBrazo = false,
  contencion: AbsorcionPropia | null = null,
): LineaBlindaje[] {
  const deContencion: LineaBlindaje[] =
    contencion && tipo !== "mental" ? [{ etiqueta: `Absorción · ${contencion.fuente}`, valor: contencion.valor }] : [];
  // Ignífuga nv1 (S85): contra Fuego cuenta solo "el blindaje de su armadura", sin natural,
  // deflector, Densificar ni brazo.
  if (tipo === "fuego") {
    const ignifuga = armaduraConIgnifuga(sheet) && lineaDeArmadura(sheet, (l) => `${l} · Mejora Ignífuga`);
    if (ignifuga) return [ignifuga, ...deContencion];
  }
  const noCuenta = blindajeNoCuenta(tipo);
  if (noCuenta) return [{ etiqueta: noCuenta, valor: 0 }, ...deContencion];

  const lineas: LineaBlindaje[] = [];
  const armadura = lineaDeArmadura(sheet, (l) => l);
  if (armadura) lineas.push(armadura);

  if (armaduraNatural.valor > 0) {
    lineas.push({
      etiqueta: armaduraNatural.fuente ? `Armadura natural · ${armaduraNatural.fuente}` : "Armadura natural",
      valor: armaduraNatural.valor,
    });
  }

  // Aumentos (A2a, R6): +1 contra Cinético por pieza (Osteotendinosa, Matriz Ósea), con su
  // nota. Aparte de la de especie, que no cambia.
  for (const a of armaduraNaturalDeAumentos(sheet, tipo)) {
    lineas.push({ etiqueta: `Armadura natural · ${a.fuente}`, valor: a.valor, nota: a.nota, ...(a.origen && { origen: a.origen }) });
  }

  const deflector = absorcionEscudoDeflector(sheet);
  if (deflector && deflector.valor > 0) lineas.push({ etiqueta: "Escudo Deflector", ...deflector });

  const conductor = bonoTejidoConductor(sheet, tipo);
  if (conductor) lineas.push({ etiqueta: "Tejido Conductor", ...conductor });

  const r = reactivo ? blindajeReactivoDeAumentos(sheet) : null;
  // Su nota va junto a la casilla (casillaBlindajeReactivo), no repetida en el desglose.
  if (r) lineas.push({ etiqueta: `${r.etiqueta} · ${r.fuente}`, valor: r.valor, ...(r.origen && { origen: r.origen }) });

  const brazo = conBrazo ? blindajeDelBrazo(sheet) : null;
  if (brazo) lineas.push({ etiqueta: `Bloqueado con el brazo · ${brazo.fuente}`, valor: brazo.valor, origen: brazo.origen });

  return [...lineas, ...deContencion];
}

// La casilla "Bloqueado con el brazo biónico" de "Resistir daño" (A6a, R12), o null sin el Brazo
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

// La casilla de blindaje reactivo de "Resistir daño" (Densificar, Enjambre 3+; A4b), o null sin
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

// `fatiga`: la que se comprueba, la en juego (FichaResuelta.fatigaEnJuego.actual, td-25: en
// combate, la de la foto). Sin ella, la de la ficha.
export function casillaBlindajeReactivo(
  sheet: Pick<Sheet, "equipo" | "fatigaActual">,
  tipo: TipoDanio,
  marcada: boolean,
  fatiga: number = sheet.fatigaActual,
): CasillaBlindajeReactivo | null {
  const r = blindajeReactivoDeAumentos(sheet);
  if (!r) return null;
  const noCuenta = blindajeNoCuenta(tipo);
  const sinFatiga =
    !marcada && fatiga < r.costeFatiga ? `No te llega la fatiga: cuesta ${r.costeFatiga} y te quedan ${fatiga}.` : null;
  return {
    etiqueta: `${r.etiqueta} (${r.fuente.replace(/ \d+$/, "")}, ${r.costeFatiga} fatiga)`,
    valor: r.valor,
    costeFatiga: r.costeFatiga,
    nota: r.nota,
    bloqueada: noCuenta ? MOTIVO_NO_CUENTA[tipo as "mental" | "fuego"] : sinFatiga,
  };
}

// Cuánto blindaje tiene el personaje AHORA MISMO contra `tipo`: la suma del desglose.
export function blindajeContra(
  sheet: Sheet,
  tipo: TipoDanio,
  armaduraNatural: ArmaduraNatural,
  contencion: AbsorcionPropia | null = null,
): number {
  return desgloseBlindaje(sheet, tipo, armaduraNatural, false, false, contencion).reduce((total, l) => total + l.valor, 0);
}

// La categoría con la que el portador recibe un golpe de `tipo` (R8, 2026-10-24): la del tipo
// (tiposDanio.ts; null en Cinético, que la pone el arma) salvo que una mejora de la armadura
// que cuenta diga otra — Mejora Ignífuga 2 y Polímero Anticorrosivo 2: "lo considera letal en
// lugar de grave". `fuente`: la mejora que la cambia, o null. "Resistir daño" la enseña.
export function categoriaDelGolpe(
  sheet: Sheet,
  tipo: TipoDanio,
  critico = false,
): { categoria: string | null; fuente: string | null } {
  // En crítico, la categoría de crítico del tipo si la tiene (Eléctrico, Frío, Sónico).
  const t = TIPOS_DANIO.find((x) => x.id === tipo);
  const delTipo = (critico && t && "categoriaCritico" in t ? t.categoriaCritico : t?.categoria) ?? null;
  const armadura = armaduraEquipadaConInstancia(sheet);
  if (armadura && delTipo === "Grave") {
    for (const p of sheet.equipo) {
      if (p.instaladoEnId !== armadura.instanciaId || p.nivel === undefined) continue;
      const cat = equipoPorId(p.catalogoId);
      if (cat?.familia !== "mejoraEstandar") continue;
      if (nivelesHasta(cat.niveles, p.nivel).some((n) => n.recibeComoLetal === tipo)) {
        return { categoria: "Letal", fuente: `${cat.label} ${p.nivel}` };
      }
    }
  }
  return { categoria: delTipo, fuente: null };
}

// El golpe le da al escudo (Murillo, 2026-10-23): el ataque supera la defensa pero falla por
// la cobertura del escudo. El escudo recibe el daño total, le resta su propio blindaje y el
// resto va a su durabilidad (el recurso "durabilidad" de la pieza, recursos.ts); al portador
// no le llega nada. Con la durabilidad a 0 se rompe. Contra Fuego su blindaje vale 0 (un
// escudo no lleva Ignífuga) y contra Mental no aplica (S86). null sin escudo equipado.
// `bloqueada`: por qué no se puede elegir "al escudo" ahora (roto, o daño mental).
export type GolpeAlEscudo = {
  instanciaId: string;
  etiqueta: string;
  blindaje: LineaBlindaje;
  aDurabilidad: number;
  durabilidadActual: number;
  durabilidadMax: number;
  durabilidadResultante: number;
  seRompe: boolean;
  bloqueada: string | null;
};

export function golpeAlEscudo(
  sheet: Pick<Sheet, "equipo" | "recursos">,
  tipo: TipoDanio,
  danio: number,
): GolpeAlEscudo | null {
  const equipado = escudoMeleeEquipado(sheet);
  const defensa = equipado?.escudo.defensa;
  if (!equipado || !defensa) return null;
  const { escudo, instanciaId } = equipado;
  // Sin entrada en recursos (ficha sin reconciliar) el escudo está entero.
  const recurso = sheet.recursos.find((r) => r.instanciaId === instanciaId);
  const durabilidadMax = recurso?.max ?? defensa.puntosGolpe;
  const durabilidadActual = recurso?.actual ?? durabilidadMax;
  const blindaje: LineaBlindaje =
    tipo === "fuego"
      ? { etiqueta: `${escudo.label} · Fuego (un escudo no lleva Ignífuga)`, valor: 0 }
      : { etiqueta: escudo.label, valor: defensa.blindaje };
  const aDurabilidad = Math.max(0, Math.round(danio) - blindaje.valor);
  const durabilidadResultante = Math.max(0, durabilidadActual - aDurabilidad);
  const bloqueada =
    durabilidadActual === 0 ? MOTIVO_ESCUDO_ROTO : tipo === "mental" ? "Mental: el daño mental no lo para un escudo." : null;
  return {
    instanciaId,
    etiqueta: escudo.label,
    blindaje,
    aDurabilidad,
    durabilidadActual,
    durabilidadMax,
    durabilidadResultante,
    seRompe: durabilidadActual > 0 && durabilidadResultante === 0,
    bloqueada,
  };
}
