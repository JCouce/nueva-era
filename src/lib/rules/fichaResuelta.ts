// La ficha resuelta, sin UI (propuesta-especies §3.1): una sola pasada que monta los
// modificadores (especie + equipo + estados de combate) y todo lo que cuelga de ellos.
// Las pantallas la calculan una vez por cambio (useFichaResuelta) y leen de aquí; no
// llaman a modificadoresActivos ni a los derivados sueltos (regla de ESLint).
//
// Mismo patrón que usoPoder.ts: entrada explícita, nada se lee de fuera salvo el
// catálogo. Los estados de combate no están en la ficha, por eso entran aparte.
import { APLICADOS, ATRIBUTOS, type AplicadoId, type AtributoId } from "./atributos";
import { tieneEscudoMelee } from "./blindaje";
import {
  alerta,
  aplicados,
  atributosEfectivos,
  cargaMaxima,
  desgloseAplicado,
  desgloseAtributo,
  movimiento,
  salud,
  type Fuente,
} from "./derivados";
import { especieDeFicha, type EspecieResuelta } from "./especie";
import { indiceDeCondiciones, modificadoresDeEquipo, type IndiceCondiciones } from "./equipo";
import { modificadoresDeEstados, type EstadoActivo } from "./estados";
import type { ModificadorConFuente } from "./modificadores";
import type { Sheet } from "./sheet";

export type DesgloseDerivado = { total: number; fuentes: Fuente[] };

export type FichaResuelta = {
  ficha: Sheet;
  especie: EspecieResuelta | null;
  // Especie, equipo y estados de combate, en ese orden (el de modificadoresActivos
  // más los estados detrás, como los sumaba Acciones).
  modificadores: ModificadorConFuente[];
  atributos: Record<AtributoId, number>;
  aplicados: Record<AplicadoId, number>;
  desgloses: {
    atributos: Record<AtributoId, DesgloseDerivado>;
    aplicados: Record<AplicadoId, DesgloseDerivado>;
  };
  salud: { vida: number; fatiga: number };
  alerta: number;
  movimiento: ReturnType<typeof movimiento>;
  cargaMaxima: number;
  // Lo de blindaje que no depende de la tirada; el desglose contra un tipo de daño
  // (desgloseBlindaje) lo pide el modal con lo que elige el jugador.
  blindaje: { tieneEscudoMelee: boolean };
  // Casillas con alcance del equipo, indexadas una vez (consultaIndiceCondiciones).
  indiceCondiciones: IndiceCondiciones;
};

export type OpcionesFicha = { estadosCombate: EstadoActivo[] };

export function resolverFicha(sheet: Sheet, { estadosCombate }: OpcionesFicha): FichaResuelta {
  const especie = especieDeFicha(sheet);
  // = [...modificadoresActivos(sheet), ...estados], sin volver a resolver la especie.
  const modificadores: ModificadorConFuente[] = [
    ...(especie?.modificadores ?? []),
    ...modificadoresDeEquipo(sheet),
    ...modificadoresDeEstados(estadosCombate),
  ];
  return {
    ficha: sheet,
    especie,
    modificadores,
    atributos: atributosEfectivos(sheet, modificadores),
    aplicados: aplicados(sheet, modificadores),
    desgloses: {
      atributos: Object.fromEntries(
        ATRIBUTOS.map((a) => [a.id, desgloseAtributo(sheet, a.id, modificadores)]),
      ) as Record<AtributoId, DesgloseDerivado>,
      aplicados: Object.fromEntries(
        APLICADOS.map((a) => [a.id, desgloseAplicado(sheet, a.id, modificadores)]),
      ) as Record<AplicadoId, DesgloseDerivado>,
    },
    salud: salud(sheet, modificadores),
    alerta: alerta(sheet, modificadores),
    movimiento: movimiento(sheet, modificadores),
    cargaMaxima: cargaMaxima(sheet, modificadores),
    blindaje: { tieneEscudoMelee: tieneEscudoMelee(sheet) },
    indiceCondiciones: indiceDeCondiciones(sheet),
  };
}
