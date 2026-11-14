// Malla Plasmática: activarla y el estado «Malla activa» (usuario 2026-11-14). Activar gasta 1
// carga de su batería (segundo recurso de la pieza) y pone el estado 10 rondas; lo que hace la
// Malla (devolver el golpe, sacrificar el colchón, detonarlo, el −8 al Sigilo, anular el
// Camuflaje) solo vale con el estado puesto.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { motivoDeBloqueo } from "./habilitacion";
import { defaultSheet, type Sheet } from "./sheet";
import { equipar } from "./equipo";
import { ajustarRecurso, claveBateria, recursoDe } from "./recursos";
import { accionesDirectasDeAtaque, MOTIVO_SIN_CARGAS } from "./combate";
import { estadoPorUso } from "./sigilo";
import { ESTADO_MALLA_ID, TURNOS_MALLA } from "../catalog/estados";
import type { EstadoActivo } from "./estados";
import { conExtrasDirectaDeFicha, resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";

const conMalla = (nivel: number): Sheet =>
  equipar(equipar(defaultSheet(), { instanciaId: "a1", catalogoId: "armadura_pesada" }), {
    instanciaId: "mp",
    catalogoId: "malla_plasmatica",
    nivel,
    instaladoEnId: "a1",
  });

const MALLA_ACTIVA: EstadoActivo = { estadoId: ESTADO_MALLA_ID, gradoId: "activo", rondasRestantes: TURNOS_MALLA };

const directa = (s: Sheet, id: string, estados: EstadoActivo[] = []) => {
  const d = accionesDirectasDeAtaque(s).find((a) => a.id === id);
  return d && conExtrasDirectaDeFicha(resolverFicha(s, { estados, vitalidad: VITALIDAD_DE_FICHA }), d);
};

describe("Malla Plasmática: Activar Malla Plasmática", () => {
  test("gasta 1 carga de la batería (no del colchón) y pone «Malla activa» 10 rondas", () => {
    const s = conMalla(1);
    const activar = directa(s, "activar_malla_mp")!;
    assert.equal(activar.label, "Activar Malla Plasmática");
    assert.deepEqual(activar.gastoRecurso, { instanciaId: claveBateria("mp"), cantidad: 1 });
    assert.deepEqual(estadoPorUso(activar, null), MALLA_ACTIVA);
    assert.equal(motivoDeBloqueo(activar.habilitacion), null);
    assert.match(activar.nota ?? "", /Reacción ante un ataque entrante o acción gratuita en tu turno/);
    assert.match(activar.nota ?? "", /quedan 10\/10/);
    // El gasto, como el de cualquier acción sin dado: sobre la batería; el colchón no se toca.
    const tras = ajustarRecurso(s, activar.gastoRecurso!.instanciaId, -activar.gastoRecurso!.cantidad);
    assert.equal(recursoDe(tras, claveBateria("mp"))?.actual, 9);
    assert.deepEqual(recursoDe(tras, "mp"), recursoDe(s, "mp"));
  });

  test("sin batería sale bloqueada", () => {
    const vacia = ajustarRecurso(conMalla(1), claveBateria("mp"), -10);
    assert.equal(motivoDeBloqueo(directa(vacia, "activar_malla_mp")!.habilitacion), MOTIVO_SIN_CARGAS);
  });

  test("con la Malla apagada por el Shock en el equipo, bloqueada", () => {
    const shock: EstadoActivo = { estadoId: "shock_equipo", gradoId: "fracaso_critico", rondasRestantes: 1 };
    assert.match(motivoDeBloqueo(directa(conMalla(1), "activar_malla_mp", [shock])!.habilitacion) ?? "", /Apagada/);
  });

  test("sin Malla no hay acción", () => {
    assert.equal(directa(defaultSheet(), "activar_malla_mp"), undefined);
  });
});
