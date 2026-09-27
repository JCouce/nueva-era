// Absorción de daño por blindaje. Fuente: docs/sistema.md pregunta 29/§7 — 1
// punto de blindaje absorbe 1 nivel (= 1 punto) de daño. Mental y Fuego se
// quedan en 0 por defecto: ninguna fuente de blindaje del catálogo los
// menciona como cubiertos (Mejora Ignífuga es quien reabre Fuego, todavía sin
// construir — docs/tareas.md). Tóxico SÍ cuenta como cualquier otro tipo: lo
// que el blindaje no toca es el estado de Enfermedad/Envenenamiento que
// dispare el arma, resuelto aparte por su propia salvación (ACCIONES).
import { equipoPorId, type Armadura, type Subsistema } from "../catalog/equipo";
import type { ArmaMelee } from "../catalog/armasMelee";
import { nivelesHasta, ultimoQueDefine } from "./equipo";
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

function armaduraEquipada(sheet: Sheet): Armadura | null {
  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (cat?.familia === "armadura") return cat;
  }
  return null;
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

export type LineaBlindaje = { etiqueta: string; valor: number };

// Desglose de qué aporta cada fuente contra `tipo` — fuente única de verdad
// para blindajeContra() (la suma de estas líneas) y para "Bloquear daño"
// (que las pinta una a una: "nada suma en silencio", mismo criterio que
// AccionModal.tsx). Mental/Fuego devuelven una única línea a 0 explicando por
// qué, en vez de una lista vacía sin más.
export function desgloseBlindaje(sheet: Sheet, tipo: TipoDanio, escudoEnAlto: boolean): LineaBlindaje[] {
  if (tipo === "mental") return [{ etiqueta: "Mental omite blindaje", valor: 0 }];
  if (tipo === "fuego") return [{ etiqueta: "Fuego (falta Mejora Ignífuga)", valor: 0 }];

  const lineas: LineaBlindaje[] = [];
  const armadura = armaduraEquipada(sheet);
  if (armadura) lineas.push({ etiqueta: armadura.label, valor: armadura.blindaje });

  const deflector = absorcionEscudoDeflector(sheet);
  if (deflector > 0) lineas.push({ etiqueta: "Escudo Deflector", valor: deflector });

  const conductor = bonoTejidoConductor(sheet, tipo);
  if (conductor > 0) lineas.push({ etiqueta: "Tejido Conductor", valor: conductor });

  if (escudoEnAlto) {
    const escudo = escudoMeleeEquipado(sheet);
    if (escudo?.defensa) lineas.push({ etiqueta: `${escudo.label} (en alto)`, valor: escudo.defensa.blindaje });
  }

  return lineas;
}

// Cuánto blindaje tiene el personaje AHORA MISMO contra `tipo`. `escudoEnAlto`
// se declara en el momento (docs/equipamiento.md:886, "acción simple para
// levantarlo") — no hay estado persistente de "escudo levantado" que guardar
// en la ficha, es una elección de este cálculo en concreto, igual que
// "atacantes adicionales" en Defensa.
export function blindajeContra(sheet: Sheet, tipo: TipoDanio, escudoEnAlto: boolean): number {
  return desgloseBlindaje(sheet, tipo, escudoEnAlto).reduce((total, l) => total + l.valor, 0);
}
