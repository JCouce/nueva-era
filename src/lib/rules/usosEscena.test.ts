import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, parseSheet, type Sheet } from "./sheet";
import { conExtrasDeFicha, resolverFicha, VITALIDAD_DE_FICHA, type FichaResuelta } from "./fichaResuelta";
import { ACCIONES, type Accion } from "./acciones";
import { estadoInicial, type CondicionTirada, type EstadoCondiciones } from "./condiciones";
import { montarTirada, SIN_ELECCION, type TiradaMontada } from "./montaje";
import { terminarEscena } from "./vitalidad";
import {
  gastarUsosEscena,
  liberarUsoEscena,
  MOTIVO_USADA_ESCENA,
  normalizarUsosEscena,
  usosEscenaDeFicha,
  vaciarUsosEscena,
} from "./usosEscena";

let n = 0;
const con = (ids: string[], base = defaultSheet()): Sheet =>
  ids.reduce((s, catalogoId) => ({ ...s, equipo: [...s.equipo, { instanciaId: `u${++n}`, catalogoId }] }), base);
const resolver = (s: Sheet) => resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA });
const tiradaFija = (f: FichaResuelta, id: string): Accion => conExtrasDeFicha(f, ACCIONES.find((a) => a.id === id)!);
const montar = (f: FichaResuelta, t: Accion, cambios: EstadoCondiciones = {}): TiradaMontada =>
  montarTirada(f, t, { ...SIN_ELECCION, estadoCondiciones: { ...estadoInicial(t.condiciones ?? []), ...cambios } });
const casilla = (t: Accion, id: string) => t.condiciones?.find((c) => c.id === id) as Extract<CondicionTirada, { tipo: "toggle" }>;

const MIELINIZACION = "aum_mielinizacion_central";
const PREFRONTAL = "aum_prefrontal_aumentada";
const REGULACION = "aum_regulacion_limbico_prefrontal";
const PROYECCION = "aum_proyeccion_neuro_expresiva";
const AHORRO = "aum_mielinizacion_ahorro";
const LENGUAJE = "aum_proyeccion_lenguaje";
const CONCENTRARSE = "aum_prefrontal_concentrarse";

describe("usos por escena: gastar, bloquear, liberar y terminar escena", () => {
  const sheet = con([REGULACION, PROYECCION]);

  test("se gasta al tirar con la casilla marcada, no al marcarla: la tirada dice qué gasta", () => {
    const f = resolver(sheet);
    const t = tiradaFija(f, "social");
    assert.deepEqual(montar(f, t).usosEscena, []);
    const marcada = montar(f, t, { [LENGUAJE]: true });
    assert.deepEqual(marcada.usosEscena, [LENGUAJE]);
    // Montar (marcar en el modal) no toca la ficha; al tirar se apunta.
    assert.deepEqual(f.ficha.usosEscena, []);
    assert.deepEqual(gastarUsosEscena(sheet, marcada.usosEscena).usosEscena, [LENGUAJE]);
  });

  test("gastada, sale bloqueada con el motivo y no se puede volver a gastar", () => {
    const gastada = gastarUsosEscena(sheet, [LENGUAJE]);
    const f = resolver(gastada);
    const t = tiradaFija(f, "social");
    assert.equal(casilla(t, LENGUAJE).bloqueada, MOTIVO_USADA_ESCENA);
    assert.equal(estadoInicial(t.condiciones ?? [])[LENGUAJE], false);
    // Aunque llegue marcada, ni da ventaja ni gasta.
    const m = montar(f, t, { [LENGUAJE]: true });
    assert.equal(m.ventaja, null);
    assert.deepEqual(m.usosEscena, []);
    // Gastar otra vez no cambia nada.
    assert.equal(gastarUsosEscena(gastada, [LENGUAJE]), gastada);
  });

  test("sin efecto por el aplicado, no gasta", () => {
    const f = resolver(con([MIELINIZACION, PREFRONTAL]));
    const cambia: CondicionTirada = { id: "a_reflejos", tipo: "toggle", etiqueta: "Con Reflejos", valorActivo: 0, aplicado: "reflejos" };
    const t = conExtrasDeFicha(f, { ...ACCIONES.find((a) => a.id === "salv_voluntad")!, condiciones: [cambia] });
    const m = montar(f, t, { [AHORRO]: true, [CONCENTRARSE]: true, a_reflejos: true });
    assert.ok(m.casillasSinEfecto[AHORRO]);
    assert.deepEqual(m.usosEscena, []);
  });

  test("el ahorro de Mielinización solo gasta si ahorra algo (o en un poder)", () => {
    const f = resolver(con([MIELINIZACION, PREFRONTAL]));
    const t = tiradaFija(f, "salv_voluntad");
    assert.deepEqual(montar(f, t, { [AHORRO]: true }).usosEscena, []);
    assert.deepEqual(montar(f, t, { [AHORRO]: true, [CONCENTRARSE]: true }).usosEscena, [AHORRO]);
    const poder: Accion = { ...t, id: "poder_x", grupo: "Psiónica" };
    assert.deepEqual(montar(f, poder, { [AHORRO]: true }).usosEscena, [AHORRO]);
  });

  test("liberar devuelve un uso; Terminar escena los vacía todos (y la fatiga temporal)", () => {
    const dos = gastarUsosEscena(con([MIELINIZACION, REGULACION, PROYECCION]), [LENGUAJE, AHORRO]);
    assert.deepEqual(liberarUsoEscena(dos, LENGUAJE).usosEscena, [AHORRO]);
    assert.equal(liberarUsoEscena(dos, "otro"), dos);
    const fin = terminarEscena({ ...dos, fatigaTemporal: 2 });
    assert.deepEqual(fin.usosEscena, []);
    assert.equal(fin.fatigaTemporal, 0);
    assert.deepEqual(vaciarUsosEscena(dos).usosEscena, []);
    const sinNada = defaultSheet();
    assert.equal(terminarEscena(sinNada), sinNada);
  });

  test("la lista de Recursos lleva la etiqueta de la casilla y su aumento", () => {
    assert.deepEqual(usosEscenaDeFicha({ usosEscena: [LENGUAJE] }), [
      { id: LENGUAJE, etiqueta: "Con lenguaje · Proyección Neuro-Expresiva" },
    ]);
  });

  test("lectura tolerante: solo ids del catálogo, sin repetir", () => {
    assert.deepEqual(normalizarUsosEscena([LENGUAJE, LENGUAJE, "inventada", 3]), [LENGUAJE]);
    assert.deepEqual(normalizarUsosEscena("x"), []);
    assert.deepEqual(parseSheet({ schemaVersion: 19, usosEscena: [AHORRO, "nope"] }).usosEscena, [AHORRO]);
  });
});
