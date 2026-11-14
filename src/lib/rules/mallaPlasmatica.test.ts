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
import { accionesDeAtaque, accionesDirectasDeAtaque, MOTIVO_MALLA_INACTIVA, MOTIVO_SIN_CARGAS } from "./combate";
import { estadoPorUso } from "./sigilo";
import { ESTADO_MALLA_ID, TURNOS_MALLA } from "../catalog/estados";
import type { EstadoActivo } from "./estados";
import { conExtrasDeFicha, conExtrasDirectaDeFicha, resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";
import { resolverGolpe, type EntradaResistir } from "./resistirDanio";

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

describe("Malla Plasmática: el estado «Malla activa» manda", () => {
  const ficha = (s: Sheet, estados: EstadoActivo[]) => resolverFicha(s, { estados, vitalidad: VITALIDAD_DE_FICHA });
  const punetazo = (s: Sheet, estados: EstadoActivo[]) => {
    const conPunetazo = equipar(s, { instanciaId: "p1", catalogoId: "pelea_punetazo" });
    const f = ficha(conPunetazo, estados);
    return conExtrasDeFicha(f, accionesDeAtaque(conPunetazo, f.modificadores, f.extrasDotes.permisos).find((t) => t.id === "ataque_melee_p1")!);
  };
  const casilla = (s: Sheet, estados: EstadoActivo[], id: string) => {
    const c = punetazo(s, estados).condiciones?.find((x) => x.id === id);
    assert.ok(c && c.tipo === "toggle", id);
    return c;
  };

  test("sin el estado, los sacrificios del colchón salen bloqueados; con él, libres", () => {
    for (const id of ["sacrificio_colchon_menor", "sacrificio_colchon_mayor"]) {
      assert.equal(casilla(conMalla(3), [], id).bloqueada, MOTIVO_MALLA_INACTIVA, id);
      assert.equal(casilla(conMalla(3), [MALLA_ACTIVA], id).bloqueada, undefined, id);
    }
  });

  test("sin el estado, la detonación sale bloqueada; con él, disponible", () => {
    const s = conMalla(2);
    assert.equal(motivoDeBloqueo(directa(s, "detonacion_pulso_termico_mp")!.habilitacion), MOTIVO_MALLA_INACTIVA);
    assert.equal(motivoDeBloqueo(directa(s, "detonacion_pulso_termico_mp", [MALLA_ACTIVA])!.habilitacion), null);
  });

  test("Resistir daño: sin el estado, «Golpe cuerpo a cuerpo» bloqueada y sin aviso aunque venga marcada", () => {
    const entrada: EntradaResistir = {
      tipo: "cinetico",
      critico: false,
      danio: 3,
      reactivo: false,
      conBrazo: false,
      marcadas: ["malla_devuelve"],
      rompeBlindaje: 0,
      categoria: null,
    };
    const sin = resolverGolpe(ficha(conMalla(2), []), entrada);
    assert.equal(sin.casillas.find((c) => c.id === "malla_devuelve")?.bloqueada, MOTIVO_MALLA_INACTIVA);
    assert.deepEqual(sin.avisos, []);
    const con = resolverGolpe(ficha(conMalla(2), [MALLA_ACTIVA]), entrada);
    assert.equal(con.casillas.find((c) => c.id === "malla_devuelve")?.bloqueada, null);
    assert.match(con.avisos[0] ?? "", /^Devuelves 2 de plasma/);
  });
});
