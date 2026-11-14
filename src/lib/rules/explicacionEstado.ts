// Lo que explica el modal de un estado (ChipEstado, usuario 2026-11-14): qué hace el grado puesto,
// cuánto dura, si la inmunidad lo anula o se puso igualmente y, en los estados que tocan piezas
// (Shock, Shock en el equipo), qué piezas de ESA ficha apaga o hace funcionar peor. Vale para
// todos los estados: los que no tocan piezas solo enseñan su explicación. La pantalla pinta esto
// tal cual; las piezas las pone estadosParaPintar (fichaResuelta.ts) con la ficha.
import { estadoPorId } from "../catalog/estados";
import type { EstadoActivoDescrito } from "./estados";
import { etiquetaDuracion } from "./textosRegistro";

export type ExplicacionEstado = {
  // «Shock en el equipo» y «Fracaso» (null con un solo grado).
  titulo: string;
  grado: string | null;
  // La frase general del estado (catálogo) y lo que hace el grado puesto.
  resumen: string | null;
  efecto: string[];
  // «1 ronda», «hasta fin de escena», «automático: se va solo»…
  duracion: string;
  // Inmune (no hace nada) o puesto igualmente.
  avisos: string[];
  // Solo en los estados que tocan piezas, con la ficha: «Apagadas: Brazo Biónico», «Funcionan peor
  // (−2 a su bono y −2 al usarlas): Movilidad Aérea, …» o «No llevas nada a lo que le afecte.».
  piezas: string | null;
};

export function explicacionDeEstado(e: EstadoActivoDescrito): ExplicacionEstado {
  const estado = estadoPorId(e.estadoId);
  const grado = estado?.grados.find((g) => g.id === e.gradoId);
  const efecto = e.detalle.length > 0 ? e.detalle : (grado?.detalle ?? []);
  const resumen = estado && !efecto.includes(estado.resumen) ? estado.resumen : null;
  return {
    titulo: e.nombre,
    grado: e.grado,
    resumen,
    efecto,
    duracion: e.automatico ? "Automático: sale de tu vida o tu fatiga y se va solo." : (e.duracionActivable ?? etiquetaDuracion(e.duracion)),
    avisos: [
      ...(e.inmune ? [`Inmune (${e.inmune}): no te hace nada mientras lo seas.`] : []),
      ...(e.forzado ? ["Puesto igualmente, aunque eras inmune."] : []),
    ],
    piezas: textoPiezas(e),
  };
}

function textoPiezas(e: EstadoActivoDescrito): string | null {
  const p = e.piezas;
  if (!p) return null;
  const nombres = "apagadas" in p ? p.apagadas : p.peor;
  if (nombres.length === 0) return "No llevas nada a lo que le afecte.";
  const lista = nombres.join(", ");
  return "apagadas" in p ? `Apagadas: ${lista}.` : `Funcionan peor (−${p.penaliza} a su bono y −${p.penaliza} al usarlas): ${lista}.`;
}
