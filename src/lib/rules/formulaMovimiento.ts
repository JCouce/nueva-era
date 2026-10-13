// Las constantes de las fórmulas de movimiento que una especie puede cambiar
// (docs/sistema.md §5 y §14.7). Fichero aparte para que especie.ts (que las
// resuelve) y derivados.ts (que las aplica) no se importen el uno al otro.
//
//   salto vertical    saltoVerticalPorPunto × base cm, mínimo 15
//   salto horizontal  100 + base × saltoHorizontalPorPunto cm
//   escalada          escaladaBase + floor(base / 2) m
//   nado              nadoBase + floor(base / 2) m
// La carrera no cambia de fórmula con ninguna especie; Zimethroni la suma aparte
// con un Modificador "derivado", como sus otros +N.
export type FormulaMovimiento = {
  saltoVerticalPorPunto: number;
  saltoHorizontalPorPunto: number;
  escaladaBase: number;
  nadoBase: number;
};

export const FORMULA_MOVIMIENTO_GENERAL: FormulaMovimiento = {
  saltoVerticalPorPunto: 15,
  saltoHorizontalPorPunto: 20,
  escaladaBase: 4,
  nadoBase: 4,
};
