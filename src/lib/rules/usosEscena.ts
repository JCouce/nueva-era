// "Una vez por escena" (tanda A4a de docs/propuesta-aumentos.md, §11.3 de docs/sistema.md):
// las casillas con `usoPorEscena` (Mielinización "Ahorro de fatiga", Proyección "Con
// lenguaje", Matriz de Red "Repetir tirada") se gastan al tirar con ellas marcadas y con
// efecto (montarTirada las devuelve en `usosEscena`), no al marcarlas. Lo gastado se guarda en
// sheet.usosEscena (ids de casilla) y no se puede volver a marcar hasta "Terminar escena"
// (terminarEscena, vitalidad.ts; también el del máster). En Recursos se puede liberar uno a
// mano, para los errores.
// "Hasta un descanso" (Neuroprótesis 3 y 4) no pasa por aquí: sigue como texto.
//
// Contadores (usuario, 2026-10-28): en la misma lista, una entrada "<clave>#<n>" por contador,
// con n ≥ 1 (a 0 no hay entrada). Se vacían igual con "Terminar escena" y se liberan igual en
// Recursos. La clave es el id de la acción y, si el contador va por algo más, detrás:
//   "<id>"                  límite "N veces por escena" de una acción de dote; las pulsaciones
//                           de Sanar grave (Enjambre 2).
//   "<id>@<aliadoId>"       límite "por aliado" (y escena) de una acción de dote (Apoyo).
//   "<id>~<turno>"          límite "por turno": solo en combate, con el turno del combate en
//                           curso (claveDeTurno); una entrada de otro turno ya no cuenta.
import { AUMENTOS } from "../catalog/aumentos";
import { DOTES } from "../catalog/dotes";
import type { CondicionTirada } from "./condiciones";
import type { Sheet } from "./sheet";

// 20 casillas por escena y los contadores (uno por acción limitada, aliado o turno).
export const MAX_USOS_ESCENA = 40;
export const MOTIVO_USADA_ESCENA = "Usada esta escena";

let cache: ReadonlyMap<string, string> | null = null;

// Id de casilla → "Etiqueta · Aumento", de las casillas por escena del catálogo (operaciones,
// opciones de elección y niveles de implante). Perezoso: el catálogo se lee al usarlo, no al
// cargar el módulo (sheet.ts lo importa).
function usosDelCatalogo(): ReadonlyMap<string, string> {
  if (cache) return cache;
  const mapa = new Map<string, string>();
  const anota = (casillas: readonly CondicionTirada[] | undefined, fuente: string) => {
    for (const c of casillas ?? []) if (c.tipo === "toggle" && c.usoPorEscena) mapa.set(c.id, `${c.etiqueta} · ${fuente}`);
  };
  for (const a of AUMENTOS) {
    if (a.familia === "operacionGenetica") {
      anota(a.casillas, a.label);
      for (const o of a.eleccion?.opciones ?? []) anota(o.casillas, a.label);
    } else for (const n of a.niveles) anota(n.condiciones, a.label);
  }
  cache = mapa;
  return mapa;
}

// Casilla "una vez por escena" del catálogo (no un contador).
export function esCasillaPorEscena(id: string): boolean {
  return usosDelCatalogo().has(id);
}

// --- Contadores ---

let cacheContadores: ReadonlyMap<string, string> | null = null;

// Id de acción con contador → su etiqueta: las acciones de dote con límite y las acciones de
// aumento con efecto "contador". Perezoso, como el de arriba.
function contadoresDelCatalogo(): ReadonlyMap<string, string> {
  if (cacheContadores) return cacheContadores;
  const mapa = new Map<string, string>();
  for (const d of DOTES) for (const e of d.efectos) if (e.tipo === "accion" && e.accion.limite) mapa.set(e.accion.id, e.accion.label);
  for (const a of AUMENTOS) {
    const acciones = a.familia === "operacionGenetica" ? [...(a.acciones ?? []), ...(a.eleccion?.opciones ?? []).flatMap((o) => o.acciones ?? [])] : a.niveles.flatMap((n) => n.acciones ?? []);
    for (const x of acciones) if (x.efecto?.tipo === "contador") mapa.set(x.id, `${x.label} · ${a.label}`);
  }
  cacheContadores = mapa;
  return mapa;
}

const ENTRADA_CONTADOR = /^([a-z0-9_]+)(?:@([A-Za-z0-9_-]{1,30}))?(?:~([A-Za-z0-9_.-]{1,30}))?#([1-9][0-9]?)$/;

type EntradaContador = { clave: string; accion: string; aliado: string | null; turno: string | null; n: number };

function leerEntrada(entrada: string): EntradaContador | null {
  const m = ENTRADA_CONTADOR.exec(entrada);
  if (!m || !contadoresDelCatalogo().has(m[1])) return null;
  return { clave: entrada.slice(0, entrada.lastIndexOf("#")), accion: m[1], aliado: m[2] ?? null, turno: m[3] ?? null, n: Number(m[4]) };
}

export function claveContador(accionId: string, extra: { aliado?: string; turno?: string } = {}): string {
  return `${accionId}${extra.aliado ? `@${extra.aliado}` : ""}${extra.turno ? `~${extra.turno}` : ""}`;
}

// El turno del combate en curso para los límites "por turno": combate y ronda (cada combatiente
// actúa una vez por ronda). Fuera de combate, null: el límite por turno no se cuenta.
export function claveDeTurno(combate: { id: string; ronda: number } | null): string | null {
  return combate ? `${combate.id.slice(-8)}.${combate.ronda}` : null;
}

export function contadorEscena(usos: readonly string[], clave: string): number {
  for (const u of usos) {
    const e = leerEntrada(u);
    if (e?.clave === clave) return e.n;
  }
  return 0;
}

// Pone el contador de `clave` a `n` (0 = sin entrada). Con turno, quita además las entradas de
// esa acción de otros turnos, que ya no cuentan.
export function conContador(sheet: Sheet, clave: string, n: number): Sheet {
  const nueva = leerEntrada(`${clave}#1`);
  if (!nueva) return sheet;
  const resto = sheet.usosEscena.filter((u) => {
    const e = leerEntrada(u);
    if (!e) return true;
    if (e.clave === clave) return false;
    return !(nueva.turno && e.turno && e.accion === nueva.accion && e.aliado === nueva.aliado);
  });
  const valor = Math.max(0, Math.min(99, Math.floor(n)));
  const usosEscena = valor > 0 ? [...resto, `${clave}#${valor}`].slice(-MAX_USOS_ESCENA) : resto;
  return usosEscena.length === sheet.usosEscena.length && usosEscena.every((u, i) => u === sheet.usosEscena[i]) ? sheet : { ...sheet, usosEscena };
}

export function esUsoEscena(id: string): boolean {
  return esCasillaPorEscena(id) || leerEntrada(id) !== null;
}

// Lectura tolerante (parseSheet): solo ids del catálogo (casillas y contadores), sin repetir y
// hasta el tope.
export function normalizarUsosEscena(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((x): x is string => typeof x === "string" && esUsoEscena(x)))].slice(0, MAX_USOS_ESCENA);
}

// Apunta los usos gastados al tirar. Los que ya estaban, o no son casillas del catálogo, no
// cambian nada (los contadores van por conContador, en el servidor).
export function gastarUsosEscena(sheet: Sheet, ids: readonly string[]): Sheet {
  const nuevos = ids.filter((id) => esCasillaPorEscena(id) && !sheet.usosEscena.includes(id));
  if (nuevos.length === 0) return sheet;
  return { ...sheet, usosEscena: [...new Set([...sheet.usosEscena, ...nuevos])].slice(0, MAX_USOS_ESCENA) };
}

// "Liberar" en Recursos: devuelve un uso (para los errores).
export function liberarUsoEscena(sheet: Sheet, id: string): Sheet {
  return sheet.usosEscena.includes(id) ? { ...sheet, usosEscena: sheet.usosEscena.filter((u) => u !== id) } : sheet;
}

export function vaciarUsosEscena(sheet: Sheet): Sheet {
  return sheet.usosEscena.length === 0 ? sheet : { ...sheet, usosEscena: [] };
}

// Lo gastado esta escena, con su etiqueta, para la lista de Recursos. `aliados`: para poner el
// nombre en los contadores por aliado.
export function usosEscenaDeFicha(
  sheet: Pick<Sheet, "usosEscena">,
  aliados: readonly { id: string; nombre: string }[] = [],
): { id: string; etiqueta: string }[] {
  const mapa = usosDelCatalogo();
  return sheet.usosEscena.map((id) => {
    const e = leerEntrada(id);
    if (!e) return { id, etiqueta: mapa.get(id) ?? id };
    const label = contadoresDelCatalogo().get(e.accion) ?? e.accion;
    const con = e.aliado ? ` · con ${aliados.find((a) => a.id === e.aliado)?.nombre ?? "un aliado"}` : "";
    const cuando = e.turno ? " · este turno" : "";
    return { id, etiqueta: `${label}${con}${cuando} (${e.n})` };
  });
}

// Las casillas por escena ya gastadas salen bloqueadas, con el motivo (resolverFicha, al
// índice de condiciones: llegan así a las tiradas fijas, generadas y de poder).
export function conUsosEscena(casillas: CondicionTirada[], usados: readonly string[]): CondicionTirada[] {
  if (usados.length === 0) return casillas;
  return casillas.map((c) =>
    c.tipo === "toggle" && c.usoPorEscena && usados.includes(c.id) ? { ...c, bloqueada: MOTIVO_USADA_ESCENA } : c,
  );
}
