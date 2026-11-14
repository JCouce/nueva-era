// La elección que abre un nivel de una pieza (NivelModulo.eleccion) y lo que cambia según la opción
// (NivelModulo.porEleccion). Hoy, la Progresión de Movilidad Aérea 3: Velocidad o Maniobrabilidad
// (eq-36, docs/sistema.md §6). Se guarda en PiezaEquipada.eleccion; se elige en Equipo con su
// acción de servidor (fijarEleccionDeNivel).
//
// Sin elegir, la pieza funciona con los valores de la tabla de su nivel (los que no dependen de la
// elección) y lo dice: en la pieza (Equipo) y en la nota de la tirada que la usa (`aviso`).
import { z } from "zod";
import { equipoPorId, type EleccionDeNivel, type Equipo, type NivelModulo } from "../catalog/equipo";
import type { PiezaEquipada } from "./equipo";
import type { Sheet } from "./sheet";

// Las familias con NivelModulo. Los aumentos usan `eleccion` para otra cosa (el sentido de
// Introgresión, el modelo del Brazo Biónico: rules/aumentos.ts) y no pasan por aquí.
type ConNiveles = Extract<Equipo, { familia: "subsistema" | "mejoraEstandar" | "mejoraArma" | "movimiento" | "herramienta" }>;

function conNiveles(cat: Equipo | null): ConNiveles | null {
  if (!cat) return null;
  return cat.familia === "subsistema" ||
    cat.familia === "mejoraEstandar" ||
    cat.familia === "mejoraArma" ||
    cat.familia === "movimiento" ||
    cat.familia === "herramienta"
    ? cat
    : null;
}

// La elección que vale con el nivel instalado: la del nivel más alto hasta él que la declare (S9).
function eleccionHasta(cat: ConNiveles, nivel: number | undefined): EleccionDeNivel | null {
  if (nivel === undefined) return null;
  const niveles = cat.niveles.filter((n) => n.nivel <= nivel).sort((a, b) => b.nivel - a.nivel);
  return niveles.find((n) => n.eleccion)?.eleccion ?? null;
}

export type EleccionDePieza = {
  etiqueta: string;
  opciones: EleccionDeNivel["opciones"];
  // La opción guardada, o null si todavía no se ha elegido.
  elegida: EleccionDeNivel["opciones"][number] | null;
  // Sin elegir: qué pasa mientras tanto. Lo pintan la pieza y la tirada.
  aviso: string | null;
};

const avisoSinElegir = (e: EleccionDeNivel, label: string) =>
  `${e.etiqueta} de ${label} sin elegir (${e.opciones.map((o) => o.label).join(" o ")}): se usan los valores base de la tabla. Elígela en Equipo.`;

// La elección de la pieza, o null si su nivel no tiene ninguna. Una guardada que ya no es opción
// (otro nivel, otro catálogo) cuenta como sin elegir.
export function eleccionDePieza(pieza: PiezaEquipada): EleccionDePieza | null {
  const cat = conNiveles(equipoPorId(pieza.catalogoId));
  const eleccion = cat ? eleccionHasta(cat, pieza.nivel) : null;
  if (!cat || !eleccion) return null;
  const elegida = eleccion.opciones.find((o) => o.id === pieza.eleccion) ?? null;
  return { etiqueta: eleccion.etiqueta, opciones: eleccion.opciones, elegida, aviso: elegida ? null : avisoSinElegir(eleccion, cat.label) };
}

// El nivel instalado con lo que cambia la opción elegida ya puesto (velocidadM, bonusCriticoM,
// maniobrabilidad…). Lo leen Volar, la esquiva en vuelo y la velocidad de vuelo de la ficha.
export function nivelConEleccion(pieza: PiezaEquipada, cat: { niveles: NivelModulo[] }): NivelModulo | undefined {
  const nivel = cat.niveles.find((n) => n.nivel === pieza.nivel);
  if (!nivel) return undefined;
  const opcion = eleccionDePieza(pieza)?.elegida?.id;
  const cambios = opcion ? nivel.porEleccion?.[opcion] : undefined;
  return cambios ? { ...nivel, ...cambios } : nivel;
}

export const eleccionNivelEntradaSchema = z.object({
  instanciaId: z.string().min(1).max(60),
  // null: quitar la elección.
  eleccion: z.string().min(1).max(40).nullable(),
});

// Guarda (o quita) la elección de una pieza de la ficha. El servidor comprueba que la pieza es
// de la ficha, que su nivel tiene elección y que la opción es una de las suyas.
export function fijarEleccionDeNivel(
  sheet: Sheet,
  instanciaId: string,
  eleccion: string | null,
): { ok: true; sheet: Sheet } | { ok: false; error: string } {
  const pieza = sheet.equipo.find((p) => p.instanciaId === instanciaId);
  if (!pieza) return { ok: false, error: "No llevas esa pieza" };
  const actual = eleccionDePieza(pieza);
  if (!actual) return { ok: false, error: "Esa pieza no tiene nada que elegir en su nivel" };
  if (eleccion !== null && !actual.opciones.some((o) => o.id === eleccion)) return { ok: false, error: "Esa opción no es de la pieza" };
  const equipo = sheet.equipo.map((p) => {
    if (p !== pieza) return p;
    const sinEleccion = { ...p };
    delete sinEleccion.eleccion;
    return eleccion === null ? sinEleccion : { ...sinEleccion, eleccion };
  });
  return { ok: true, sheet: { ...sheet, equipo } };
}

// Al equipar desde la Tienda: una elección que no es opción de la pieza no se guarda (las piezas
// sin elección no llevan `eleccion`).
export function conEleccionValida(pieza: PiezaEquipada): PiezaEquipada {
  if (pieza.eleccion === undefined || eleccionDePieza(pieza)?.elegida) return pieza;
  const sin = { ...pieza };
  delete sin.eleccion;
  return sin;
}
