// "Poder" — métrica de catálogo para comparar NPCs de un vistazo (pedido del
// usuario, 2026-09-11, al rediseñar el catálogo de NPCs). NO es una regla
// del sistema del diseñador — es una fórmula provisional del propio
// usuario, para calibrarse más adelante con una herramienta de balance
// (mencionada esa misma sesión, sin construir todavía). No la trates como
// definitiva si aparece una revisión.
//
//   poder = experiencia invertida (coste triangular de atributos+habilidades,
//           el mismo que ya usa el point-buy de creación) + créditos del
//           equipo instalado / 100
//
// Reutiliza el motor ya existente (creacion.ts, equipo.ts) tal cual — el NPC
// no gasta XP ni créditos de verdad al editarse (docs/fase-6b.md, "Catálogo
// de NPCs — rediseño": "el máster no tiene pool que gastar"), así que esto
// no es un saldo real, es solo "cuánto costaría montar esta ficha desde
// cero" usado como indicador de fuerza relativa.
import { ATRIBUTOS } from "./atributos";
import { HABILIDADES } from "./habilidades";
import { costeAtributo, costeHabilidad } from "./creacion";
import { costeDePieza } from "./equipo";
import type { Sheet } from "./sheet";

export function creditosInvertidos(sheet: Sheet): number {
  return sheet.equipo.reduce((total, pieza) => total + costeDePieza(pieza), 0);
}

// A diferencia de puntosAtributosGastados/puntosHabilidadesGastados
// (creacion.ts, que dejan que un atributo bajado a -1 reste del pool de
// creación), aquí cada rasgo por debajo de su base cuenta como 0, nunca
// negativo — un atributo penalizado no debe restar "poder" a otro que sí es
// bueno, solo no sumar nada él mismo.
export function experienciaInvertida(sheet: Sheet): number {
  const deAtributos = ATRIBUTOS.reduce(
    (total, a) => total + Math.max(0, costeAtributo(sheet.atributos[a.id])),
    0,
  );
  const deHabilidades = HABILIDADES.reduce((total, h) => {
    const { valor, especialidades } = sheet.habilidades[h.id];
    return total + Math.max(0, costeHabilidad(valor, especialidades.length));
  }, 0);
  return deAtributos + deHabilidades;
}

export function poder(sheet: Sheet): number {
  return experienciaInvertida(sheet) + creditosInvertidos(sheet) / 100;
}
