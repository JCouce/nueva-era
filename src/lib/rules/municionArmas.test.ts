import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, type Sheet } from "./sheet";
import { equipar } from "./equipo";
import { accionesDeAtaque } from "./combate";
import { ajustarRecurso, comprarRecarga, municionRegularDePieza, recargaDePieza, recursoDe } from "./recursos";
import { avisoInsuficiente, gastoTotal } from "./acciones";
import { modificadoresActivos } from "./derivados";
import { permisosDeDotes } from "./dotesEfectos";
import { esVisible, motivoDeBloqueo } from "./habilitacion";
import { EQUIPO } from "../catalog/equipo";
import { MUNICION_REGULAR } from "../catalog/municion";

const con = (catalogoId: string): Sheet => equipar(defaultSheet(), { instanciaId: "a", catalogoId });
const ataques = (s: Sheet) => accionesDeAtaque(s, modificadoresActivos(s), permisosDeDotes(s));

// td-01 (usuario 2026-11-14): flechas para el Arco Táctico y virotes para la Ballesta, al precio
// de la Calibre Estándar, con su nombre en la Tienda y en Recursos, sin mezclarse con las balas.
describe("td-01: flechas y virotes", () => {
  test("mismo precio y rareza que la Calibre Estándar", () => {
    for (const id of ["flechas", "virotes"] as const) {
      assert.equal(MUNICION_REGULAR[id].coste, MUNICION_REGULAR.calibre_estandar.coste, id);
      assert.equal(MUNICION_REGULAR[id].rareza, MUNICION_REGULAR.calibre_estandar.rareza, id);
      assert.equal(MUNICION_REGULAR[id].proyectilesPorUnidad, 1, id);
    }
  });

  test("cada impulsora con la suya; el resto de armas de fuego, como antes", () => {
    assert.equal(municionRegularDePieza({ catalogoId: "arco_tactico" })?.id, "flechas");
    assert.equal(municionRegularDePieza({ catalogoId: "ballesta_pro_ue" })?.id, "virotes");
    assert.equal(municionRegularDePieza({ catalogoId: "pistola_sydiasi" })?.id, "calibre_estandar");
  });

  test("recarga: su nombre y su precio (Tienda y Recursos)", () => {
    const arco = con("arco_tactico");
    const pieza = arco.equipo[0];
    assert.deepEqual(
      { ...recargaDePieza(pieza, recursoDe(arco, "a")), municion: undefined },
      { etiqueta: "Flechas", precio: 2, municion: undefined, proyectiles: 1 },
    );
    const ballesta = ajustarRecurso(con("ballesta_pro_ue"), "a", -4);
    const r = recargaDePieza(ballesta.equipo[0], recursoDe(ballesta, "a"));
    assert.equal(r?.etiqueta, "Virotes");
    assert.equal(r?.precio, 8); // 4 virotes que faltan × 2
    assert.equal(comprarRecarga(ballesta, "a")?.coste, 8);
  });

  test("el disparo gasta 1 de su recurso y el aviso habla de flechas o virotes", () => {
    for (const [arma, unidad] of [["arco_tactico", "flechas"], ["ballesta_pro_ue", "virotes"]] as const) {
      const s = ajustarRecurso(con(arma), "a", -10);
      const t = ataques(s).find((x) => x.id === "ataque_fuego_a")!;
      assert.equal(t.recursoInstanciaId, "a");
      assert.equal(t.recursoUnidad, unidad);
      assert.equal(gastoTotal(t, "0", {}), 1);
      assert.match(avisoInsuficiente(t, "0", {}, recursoDe(s, "a")) ?? "", new RegExp(`Solo quedan 0/\\d+ ${unidad}`));
    }
  });

  test("una ficha que ya llevaba el arco sigue igual: el recurso es de la instancia, sin migración", () => {
    // Lo guardado antes (cargador con 0 de 1) se lee tal cual y se recarga con flechas.
    const vieja: Sheet = { ...con("arco_tactico"), recursos: [{ instanciaId: "a", actual: 0, max: 1 }] };
    assert.deepEqual(recursoDe(vieja, "a"), { instanciaId: "a", actual: 0, max: 1 });
    assert.equal(recargaDePieza(vieja.equipo[0], recursoDe(vieja, "a"))?.etiqueta, "Flechas");
  });
});

// eq-37: el aviso de munición insuficiente en todas las armas de fuego, impulsoras y pesadas
// con cargador: avisa y no bloquea («la app informa, no arbitra»).
describe("eq-37: aviso de munición en todas las armas que gastan cargador", () => {
  const conCargador = EQUIPO.filter(
    (e) => e.familia === "arma" || (e.familia === "armaPesada" && e.tipoMunicion !== undefined),
  );

  test("hay armas de fuego, impulsoras y pesadas en la lista", () => {
    assert.ok(conCargador.some((e) => e.familia === "arma" && e.tipo === "arma_impulsora"));
    assert.ok(conCargador.some((e) => e.familia === "armaPesada"));
    assert.ok(conCargador.length > 40);
  });

  for (const cat of conCargador) {
    test(`${cat.label}: sin munición avisa con su unidad y la fila sigue activa`, () => {
      const s = ajustarRecurso(con(cat.id), "a", -10_000);
      const t = ataques(s).find((x) => x.recursoInstanciaId === "a" && x.ataque);
      assert.ok(t, "su disparo gasta del recurso de la instancia");
      const recurso = recursoDe(s, "a")!;
      assert.equal(recurso.actual, 0);
      const modo = t.ataque!.modos[0].id;
      const unidad = municionRegularDePieza({ catalogoId: cat.id })!.unidadRecurso;
      assert.match(avisoInsuficiente(t, modo, {}, recurso) ?? "", new RegExp(`Solo quedan 0/\\d+ ${unidad} — esto gasta \\d+`));
      assert.ok(esVisible(t));
      assert.equal(motivoDeBloqueo(t.habilitacion), null);
    });
  }
});
