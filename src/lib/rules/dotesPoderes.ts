// Poderes de dote (docs/sistema.md §9.3, tanda D2c-2): Impacto Métrico y Sobrecarga Métrica
// se usan con la ventana de los poderes (nivel empleado, fatiga, efectos por resultado).
// Hermana de accionesDePsionica (poderes.ts): devuelve PoderDisponible normales, así que se
// preparan, se pagan y se tiran por el mismo camino (prepararPoder / usarPoder /
// efectosDelResultado, usoPoder.ts). Lo expone resolverFicha (FichaResuelta.poderesDotes); la
// UI los pinta en la sección "Dotes" de Acciones con FilaPoder y UsarPoderModal.
//
//   nivel poseído  el de su disciplina (`disciplinaNivel`), el mismo que usan los poderes
//                  (FichaResuelta.psionica.paraEfectos); sin llegar a su `desdeNivel`, no sale.
//   disciplina     la del nivel, SIN sus descuentos de fatiga, rebajas de economía ni
//                  ventajas: son reglas de los poderes de la disciplina, no de la dote
//                  (supuesto del modelado aceptado en §9.3: "Sobrecarga Métrica sin descuentos
//                  de Traslación"). Las casillas externas (Xovromium, Munición Supresora) sí.
//   bloqueo        el requisito de la disciplina sin cumplir (bloqueoPorRequisito), como los
//                  poderes: se ve y no se usa.
//
// Requisito roto de la dote (S34) y "vale la mejor": dotesActivas; aquí solo llegan las activas.
import { bloqueoPorRequisito, resolverPoder, valoresHabilidad, type PoderDisponible } from "./poderes";
import type { Disciplina, NivelesPsionica } from "./psionica";
import type { DoteActiva } from "./dotesEfectos";
import type { Sheet } from "./sheet";
import { disciplinaPorId } from "../catalog/psionica";
import type { AccionPoderDote, EfectoDote } from "../catalog/dotesTipos";

// El generador deja el efecto con la forma de AccionPoderDote y la valida con poderes.ts.
export const accionDePoderDote = (e: Extract<EfectoDote, { tipo: "poder" }>): AccionPoderDote =>
  e.accion as unknown as AccionPoderDote;

// TODO(revisar): sin descuentos ni ventajas de la disciplina (ver cabecera). Hoy ninguno de
// Singularidad ni de Traslación alcanzaría a estas acciones (van por id de acción), así que
// no cambia ningún número; es la regla para la próxima disciplina que tenga uno general.
const sinReglasDeDisciplina = (d: Disciplina): Disciplina => ({
  ...d,
  modificadoresFatiga: [],
  modificadoresEconomia: [],
  ventajas: [],
});

export function poderesDeDotes(activas: readonly DoteActiva[], sheet: Sheet, niveles: NivelesPsionica): PoderDisponible[] {
  const poderes: PoderDisponible[] = [];
  for (const { dote } of activas) {
    dote.efectos.forEach((e, i) => {
      if (e.tipo !== "poder" || dote.motor[i]?.estado !== "construido") return;
      const accion = accionDePoderDote(e);
      const original = disciplinaPorId(accion.disciplinaNivel);
      const nivelPoseido = niveles[accion.disciplinaNivel] ?? 0;
      if (nivelPoseido <= 0) return;
      const disciplina = sinReglasDeDisciplina(original);
      const porDefecto = resolverPoder(accion, { nivelPoseido, disciplina, habilidades: valoresHabilidad(sheet), niveles });
      if (!porDefecto) return;
      poderes.push({ disciplina, accion, nivelPoseido, porDefecto, bloqueo: bloqueoPorRequisito(original, niveles) });
    });
  }
  return poderes;
}
