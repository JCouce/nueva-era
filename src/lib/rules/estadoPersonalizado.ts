// El estado «Personalizado» del máster (usuario, 2026-11-15; docs/sistema.md §7): nombre libre y
// una o varias líneas «+N a un atributo básico o a una habilidad». No vive en el catálogo: sus
// datos van en el propio EstadoActivo (`custom`), con un id propio por cada uno («custom:1a2b3c4d»)
// para que convivan varios en el mismo objetivo. El bono a un atributo toca el atributo de verdad,
// como la Enfermedad: cascada a aplicados, vida y fatiga (decisión del usuario, 2026-11-15).
//
// El motor lo trata como uno más a través de `estadoDeActivo`: para un personalizado, un Estado
// sintético de un solo grado con sus modificadores; para el resto, el del catálogo.
import { estadoPorId, type Estado } from "../catalog/estados";
import { ATRIBUTOS, type AtributoId } from "./atributos";
import { HABILIDADES, type HabilidadId } from "./habilidades";
import type { DuracionEstado, EstadoActivo } from "./estados";

export const PREFIJO_PERSONALIZADO = "custom:";
export const GRADO_PERSONALIZADO = "activo";
export const MAX_NOMBRE_PERSONALIZADO = 40;
export const MAX_VALOR_PERSONALIZADO = 10;
export const MAX_LINEAS_PERSONALIZADO = 8;

export type ModificadorPersonalizado =
  | { tipo: "atributo"; id: AtributoId; valor: number }
  | { tipo: "habilidad"; id: HabilidadId; valor: number };

export type EstadoPersonalizado = { nombre: string; modificadores: ModificadorPersonalizado[] };

export const esIdPersonalizado = (id: string): boolean => id.startsWith(PREFIJO_PERSONALIZADO);

// Ocho hex bastan: el id solo tiene que no chocar con los otros personalizados del mismo objetivo.
export function nuevoIdPersonalizado(): string {
  return PREFIJO_PERSONALIZADO + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

const ID_VALIDO = /^custom:[a-z0-9]{1,32}$/;

export const esAtributoId = (id: string): id is AtributoId => ATRIBUTOS.some((a) => a.id === id);
export const esHabilidadId = (id: string): id is HabilidadId => HABILIDADES.some((h) => h.id === id);

const valorValido = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v !== 0 && Math.abs(v) <= MAX_VALOR_PERSONALIZADO;

// Lectura tolerante de lo guardado: el nombre recortado y las líneas que encajan; una línea rota se
// descarta. Sin nombre o sin ninguna línea buena, null (el estado entero se descarta).
export function leerPersonalizado(v: unknown): EstadoPersonalizado | null {
  if (typeof v !== "object" || v === null) return null;
  const { nombre, modificadores } = v as Record<string, unknown>;
  if (typeof nombre !== "string" || !Array.isArray(modificadores)) return null;
  const limpio = nombre.trim().slice(0, MAX_NOMBRE_PERSONALIZADO).trim();
  if (limpio === "") return null;
  const lineas = modificadores.flatMap((m): ModificadorPersonalizado[] => {
    if (typeof m !== "object" || m === null) return [];
    const { tipo, id, valor } = m as Record<string, unknown>;
    if (typeof id !== "string" || !valorValido(valor)) return [];
    if (tipo === "atributo" && esAtributoId(id)) return [{ tipo, id, valor }];
    if (tipo === "habilidad" && esHabilidadId(id)) return [{ tipo, id, valor }];
    return [];
  });
  if (lineas.length === 0) return null;
  return { nombre: limpio, modificadores: lineas.slice(0, MAX_LINEAS_PERSONALIZADO) };
}

export const esIdPersonalizadoValido = (id: string): boolean => ID_VALIDO.test(id);

export function etiquetaObjetivoPersonalizado(m: Pick<ModificadorPersonalizado, "tipo" | "id">): string {
  const lista: readonly { id: string; label: string }[] = m.tipo === "atributo" ? ATRIBUTOS : HABILIDADES;
  return lista.find((x) => x.id === m.id)?.label ?? m.id;
}

// «+2 Fuerza, −1 Sigilo».
export function resumenPersonalizado(c: EstadoPersonalizado): string {
  return c.modificadores
    .map((m) => `${m.valor > 0 ? "+" : "−"}${Math.abs(m.valor)} ${etiquetaObjetivoPersonalizado(m)}`)
    .join(", ");
}

const RESUMEN = "Estado a medida del máster: bonos o penalizadores a atributos y habilidades.";

function estadoSintetico(id: string, c: EstadoPersonalizado): Estado {
  return {
    id,
    label: c.nombre,
    resumen: RESUMEN,
    grados: [{ id: GRADO_PERSONALIZADO, label: c.nombre, modificadores: [...c.modificadores], detalle: [], duracionTurnos: null }],
  };
}

// El Estado de un activo: el sintético si es un personalizado, si no el del catálogo. Todo lo que
// lee un activo genérico (modificadores, chips, etiquetas) pasa por aquí, no por estadoPorId.
export function estadoDeActivo(a: Pick<EstadoActivo, "estadoId" | "custom">): Estado | null {
  if (esIdPersonalizado(a.estadoId)) return a.custom ? estadoSintetico(a.estadoId, a.custom) : null;
  return estadoPorId(a.estadoId);
}

// Lo que manda el panel del máster para poner un estado: uno del catálogo (con grado) o un
// personalizado (el id lo pone el servidor al aplicarlo, `activoAAplicar`).
export type EstadoAAplicar =
  | { estadoId: string; gradoId: string; duracion: DuracionEstado }
  | { custom: EstadoPersonalizado; duracion: DuracionEstado };

export const esPersonalizadoAAplicar = (
  e: EstadoAAplicar,
): e is { custom: EstadoPersonalizado; duracion: DuracionEstado } => "custom" in e;
