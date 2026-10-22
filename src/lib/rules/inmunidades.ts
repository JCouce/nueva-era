// Inmunidades a estados (tanda A7 de docs/propuesta-aumentos.md, docs/sistema.md §11):
// Ojo Biónico 2-4 contra la ceguera y Regeneración Tisular Acelerada, funcionando, contra la
// hemorragia. Los datos, en el catálogo (`inmuneA` del nivel o de la operación).
//   - Al poner el estado (máster: Mesa o combate), al inmune no se le aplica y el resultado
//     lo dice; "Aplicar igualmente" lo pone forzado (EstadoActivo.forzado), que sí hace efecto.
//   - Un estado puesto antes de ganar la inmunidad sigue en la lista sin hacer nada
//     (estadosConEfecto, en resolverFicha) y su chip dice "Inmune (fuente)".
// Mismas reglas para el NPC, con la ficha de su fila de combate.
// TODO(revisar): ni la ceguera ni la hemorragia tocan la vida máxima, así que ganar o perder la
// inmunidad no mueve la vida. Si un estado con inmunidad la tocara, ganarla subiría el máximo
// sin curar (bien) y perderla (desequipar el Ojo) recortaría la actual al máximo nuevo como al
// desequipar (retirarPieza), no restaría la bajada como S75.
import { estadoPorId } from "../catalog/estados";
import { aumentoPorId, operacionesActivas } from "./aumentos";
import { nivelesHasta } from "./equipo";
import type { EstadoActivo, Inmunidad } from "./estados";
import type { OperacionEstado } from "./vidaPorEstados";
import type { Sheet } from "./sheet";

// Una por estado: si dos piezas dan la misma, vale la primera del equipo.
export function inmunidadesDe(sheet: Pick<Sheet, "equipo">): Inmunidad[] {
  const activas = operacionesActivas(sheet);
  const todas = sheet.equipo.flatMap((pieza): Inmunidad[] => {
    const cat = aumentoPorId(pieza.catalogoId);
    if (!cat) return [];
    if (cat.familia === "operacionGenetica") {
      return activas.has(cat.id) ? (cat.inmuneA ?? []).map((estadoId) => ({ estadoId, fuente: cat.label })) : [];
    }
    if (pieza.nivel === undefined) return [];
    const ids = new Set(nivelesHasta(cat.niveles, pieza.nivel).flatMap((n) => n.inmuneA ?? []));
    return [...ids].map((estadoId) => ({ estadoId, fuente: `${cat.label} ${pieza.nivel}` }));
  });
  return todas.filter((i, idx) => todas.findIndex((j) => j.estadoId === i.estadoId) === idx);
}

export function inmunidadContra(sheet: Pick<Sheet, "equipo">, estadoId: string): Inmunidad | null {
  return inmunidadesDe(sheet).find((i) => i.estadoId === estadoId) ?? null;
}

// "Ceguera (Ojo Biónico 2)".
export function textoInmunidad(i: Inmunidad): string {
  return `${estadoPorId(i.estadoId)?.label ?? i.estadoId} (${i.fuente})`;
}

// Lo que se hace con una operación sobre alguien con esta ficha (null: sin ficha, como un
// combatiente viejo sin foto): quitar, siempre; poner, solo si no es inmune o se fuerza. El
// `forzado` del estado solo se guarda cuando de verdad había inmunidad.
export type OperacionTrasInmunidad = { tipo: "aplicar"; op: OperacionEstado } | { tipo: "inmune"; inmunidad: Inmunidad };

export function operacionConInmunidad(
  sheet: Pick<Sheet, "equipo"> | null,
  op: OperacionEstado,
  forzar: boolean,
): OperacionTrasInmunidad {
  if (op.tipo === "quitar") return { tipo: "aplicar", op };
  const limpio: EstadoActivo = { ...op.estado };
  delete limpio.forzado;
  const inmunidad = sheet ? inmunidadContra(sheet, op.estado.estadoId) : null;
  if (!inmunidad) return { tipo: "aplicar", op: { tipo: "poner", estado: limpio } };
  if (forzar) return { tipo: "aplicar", op: { tipo: "poner", estado: { ...limpio, forzado: true } } };
  return { tipo: "inmune", inmunidad };
}

// Quien no recibió el estado por inmune, para el aviso del máster. `id`: el que mandó la
// pantalla (characterId en la Mesa, combatienteId en el combate).
export type InmuneAlAplicar = { id: string; nombre: string } & Inmunidad;

// "Javi es inmune a Ceguera (Ojo Biónico 2)".
export function textoInmuneAlAplicar(i: InmuneAlAplicar, nombre = i.nombre): string {
  return `${nombre} es inmune a ${textoInmunidad(i)}`;
}
