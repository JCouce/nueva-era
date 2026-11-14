// La base de la ficha con sus estados: lo primero que monta resolverFicha (el Shock sobre las
// piezas, los activables encendidos, los estados con efecto) y la lista de modificadores que sale
// de ahí. La comparten resolverFicha y el tope de la vida y la fatiga (topesDeVida, vitalidad.ts:
// td-12, curar topa en el máximo que se ve), así que los dos máximos no pueden separarse.
// Archivo aparte porque vitalidad.ts no puede importar fichaResuelta.ts (la importa ella).
import { especieDeFicha, type EspecieResuelta } from "./especie";
import { afectacionDePiezas, conShockEnModificadores, piezasEnUso, type AfectacionDePiezas } from "./shock";
import { efectosDeActivables, type EfectosActivables } from "./aumentosActivables";
import { inmunidadesDe } from "./inmunidades";
import { modificadoresDeAumentos } from "./aumentos";
import { modificadoresDeEquipo } from "./equipo";
import {
  estabilizacionPuesta,
  estadosConEfecto,
  modificadoresDeEstados,
  type Estabilizacion,
  type EstadoActivo,
  type Inmunidad,
} from "./estados";
import type { ModificadorConFuente } from "./modificadores";
import type { Sheet } from "./sheet";

export type BaseDeFicha = {
  especie: EspecieResuelta | null;
  // Shock (S73, rules/shock.ts): lo que aportan las piezas lo pone la ficha sin las apagadas
  // (`enUso`). Las de regla propia (`alShock`, eq-29) no se apagan ni llevan −N: la de
  // `comoNivel` entra en `enUso` con ese nivel (piezasEnUso).
  afectacion: AfectacionDePiezas;
  enUso: Sheet;
  // Activables encendidos (A5a): estado propio puesto y pieza que funciona.
  activables: EfectosActivables;
  // A7: lo puesto antes de ganar la inmunidad sigue en la lista pero no hace nada.
  inmunidades: Inmunidad[];
  conEfecto: EstadoActivo[];
  // Estabilizado (Estabilización, mitigar): reduce los estados que tenía al ponérselo y, desde
  // nv4, quita heridas y fatiga.
  estabilizado: Estabilizacion | null;
};

export function baseDeFicha(sheet: Sheet, estados: EstadoActivo[]): BaseDeFicha {
  const afectacion = afectacionDePiezas(sheet, estados);
  const enUso = piezasEnUso(sheet, afectacion);
  const inmunidades = inmunidadesDe(enUso);
  const conEfecto = estadosConEfecto(estados, inmunidades);
  return {
    especie: especieDeFicha(sheet),
    afectacion,
    enUso,
    activables: efectosDeActivables(enUso, estados),
    inmunidades,
    conEfecto,
    estabilizado: estabilizacionPuesta(conEfecto),
  };
}

// = [...modificadoresActivos(sheet), ...estados], sin el tope de Agilidad (va detrás y no toca la
// vida ni la fatiga). Los bonos de las piezas penalizadas por el Shock, ya con su −N
// (conShockEnModificadores): el punto único por el que atributos, aplicados, derivados y tiradas
// los leen reducidos. `dotes`: los de las dotes activas (hoy solo de tirada), en su sitio.
export function modificadoresDeBase(base: BaseDeFicha, dotes: readonly ModificadorConFuente[] = []): ModificadorConFuente[] {
  const { especie, enUso, conEfecto, activables, estabilizado, afectacion } = base;
  return conShockEnModificadores(
    [
      ...(especie?.modificadores ?? []),
      ...dotes,
      ...modificadoresDeEquipo(enUso),
      ...modificadoresDeAumentos(enUso),
      ...modificadoresDeEstados(conEfecto, activables.reduceEstados, estabilizado),
      ...activables.modificadores,
    ],
    afectacion.penalizadas,
  );
}
