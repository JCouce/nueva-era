// El estado «Personalizado» del máster (usuario, 2026-11-15) y los grupos del panel de estados.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet } from "./sheet";
import { ACCIONES } from "./acciones";
import { resolverFicha, VITALIDAD_DE_FICHA } from "./fichaResuelta";
import { montarTirada, SIN_ELECCION } from "./montaje";
import { activoAAplicar, describirEstadosActivos, inmunidadQueAnula, modificadoresDeEstados, type EstadoActivo } from "./estados";
import { leerEstados, ponerEstado } from "./estadosFicha";
import { aplicarOperacionEstado } from "./vidaPorEstados";
import { datosParaGuardar, leerDatosRegistro, planDeshacerEstados } from "./registro";
import { operacionConInmunidad } from "./inmunidades";
import { explicacionDeEstado } from "./explicacionEstado";
import { textoEntradaRegistro } from "./textosRegistro";
import {
  esIdPersonalizado,
  estadoDeActivo,
  leerPersonalizado,
  nuevoIdPersonalizado,
  resumenPersonalizado,
  type EstadoPersonalizado,
} from "./estadoPersonalizado";
import { estadoAAplicarSchema } from "../validation";
import {
  ESTADOS,
  ESTADOS_DE_FARMACO,
  GRUPO_DE_ESTADO,
  GRUPOS_ESTADO,
  estadosDelPanel,
  grupoDeEstado,
} from "../catalog/estados";

const BENDICION: EstadoPersonalizado = {
  nombre: "Bendición del chamán",
  modificadores: [
    { tipo: "atributo", id: "aguante", valor: 2 },
    { tipo: "habilidad", id: "sigilo", valor: -1 },
  ],
};
const MALDICION: EstadoPersonalizado = { nombre: "Maldición", modificadores: [{ tipo: "atributo", id: "aguante", valor: -1 }] };

const custom = (id: string, c: EstadoPersonalizado, rondas: number | null = null): EstadoActivo => ({
  estadoId: id,
  gradoId: "activo",
  rondasRestantes: rondas,
  custom: c,
});
const B = custom("custom:b1", BENDICION);
const M = custom("custom:m1", MALDICION, 3);

const sheet = { ...defaultSheet(), atributos: { ...defaultSheet().atributos, fuerza: 3, aguante: 3 } };
const resolver = (estados: EstadoActivo[]) => resolverFicha(sheet, { estados, vitalidad: VITALIDAD_DE_FICHA });

describe("Personalizado: lectura tolerante", () => {
  test("uno bien formado pasa tal cual, con su duración", () => {
    assert.deepEqual(leerEstados([B, M]), [B, M]);
  });

  test("varios a la vez conviven: cada uno con su id", () => {
    const r = leerEstados([B, custom("custom:b2", BENDICION)]);
    assert.equal(r.length, 2);
    assert.equal(ponerEstado([B], custom("custom:b2", MALDICION)).length, 2);
  });

  test("nombre recortado a 40 y líneas rotas fuera; sin nombre o sin ninguna línea buena, fuera entero", () => {
    const largo = "x".repeat(60);
    const [r] = leerEstados([
      {
        estadoId: "custom:a1",
        gradoId: "activo",
        rondasRestantes: null,
        custom: {
          nombre: `  ${largo}  `,
          modificadores: [
            { tipo: "atributo", id: "fuerza", valor: 2 },
            { tipo: "atributo", id: "fortaleza", valor: 1 }, // aplicado, no básico
            { tipo: "habilidad", id: "volar", valor: 1 },
            { tipo: "habilidad", id: "sigilo", valor: 0 },
            { tipo: "habilidad", id: "sigilo", valor: 11 },
            { tipo: "habilidad", id: "sigilo", valor: 1.5 },
            { tipo: "derivado", id: "alerta", valor: 1 },
            null,
          ],
        },
      },
    ]);
    assert.equal(r.custom?.nombre, "x".repeat(40));
    assert.deepEqual(r.custom?.modificadores, [{ tipo: "atributo", id: "fuerza", valor: 2 }]);

    assert.deepEqual(
      leerEstados([
        { estadoId: "custom:a2", gradoId: "activo", rondasRestantes: null, custom: { nombre: "   ", modificadores: BENDICION.modificadores } },
        { estadoId: "custom:a3", gradoId: "activo", rondasRestantes: null, custom: { nombre: "Nada", modificadores: [{ tipo: "atributo", id: "fuerza", valor: 0 }] } },
        { estadoId: "custom:a4", gradoId: "activo", rondasRestantes: null },
        { estadoId: "custom:A B", gradoId: "activo", rondasRestantes: null, custom: BENDICION },
        { estadoId: "custom:a5", gradoId: "fracaso", rondasRestantes: null, custom: BENDICION },
      ]),
      [],
    );
  });

  test("un estado del catálogo con `custom` colado no se lo queda", () => {
    const [r] = leerEstados([{ estadoId: "derribado", gradoId: "activo", rondasRestantes: null, custom: BENDICION }]);
    assert.equal(r.estadoId, "derribado");
    assert.equal(r.custom, undefined);
  });

  test("leerPersonalizado: no es un objeto o sin lista, null", () => {
    assert.equal(leerPersonalizado(null), null);
    assert.equal(leerPersonalizado({ nombre: "X" }), null);
    assert.equal(leerPersonalizado("Bendición"), null);
  });
});

describe("Personalizado: en la ficha resuelta", () => {
  test("el bono a un atributo toca el atributo de verdad y cascada a aplicados y vida", () => {
    const sin = resolver([]);
    const con = resolver([custom("custom:x", { nombre: "Aguante +2", modificadores: [{ tipo: "atributo", id: "aguante", valor: 2 }] })]);
    assert.equal(con.atributos.aguante, sin.atributos.aguante + 2);
    assert.ok(con.aplicados.fortaleza > sin.aplicados.fortaleza, `${con.aplicados.fortaleza} > ${sin.aplicados.fortaleza}`);
    assert.ok(con.salud.vida > sin.salud.vida, `${con.salud.vida} > ${sin.salud.vida}`);
    assert.ok(con.desgloses.atributos.aguante.fuentes.some((f) => JSON.stringify(f).includes("Aguante +2")));
  });

  test("el bono a una habilidad sube la tirada y sale en el desglose con el nombre", () => {
    const t = ACCIONES.find((a) => a.habilidad === "sigilo")!;
    const sin = montarTirada(resolver([]), t, SIN_ELECCION);
    const ficha = resolver([custom("custom:h", { nombre: "Pies de gato", modificadores: [{ tipo: "habilidad", id: "sigilo", valor: 2 }] })]);
    const con = montarTirada(ficha, t, SIN_ELECCION);
    assert.equal(con.total, sin.total + 2);
    assert.ok(con.desglose.some((l) => l.etiqueta.includes("Pies de gato +2")), JSON.stringify(con.desglose));
  });

  test("el atributo también sale nombrado en el aplicado del desglose", () => {
    const t = ACCIONES.find((a) => a.aplicado === "fortaleza")!;
    const con = montarTirada(resolver([B]), t, SIN_ELECCION);
    assert.ok(con.desglose[0].etiqueta.includes("Bendición del chamán +2 Aguante"), con.desglose[0].etiqueta);
  });

  test("dos personalizados a la vez: se suman, cada uno con su fuente", () => {
    const mods = modificadoresDeEstados([B, M]);
    assert.deepEqual(
      mods.map((m) => [m.fuente, m.tipo, m.valor]),
      [
        ["Bendición del chamán", "atributo", 2],
        ["Bendición del chamán", "habilidad", -1],
        ["Maldición", "atributo", -1],
      ],
    );
    assert.equal(resolver([B, M]).atributos.aguante, resolver([]).atributos.aguante + 1);
  });

  test("sin inmunidad que valga", () => {
    assert.equal(inmunidadQueAnula(B, [{ estadoId: B.estadoId, fuente: "Algo" }]), null);
    assert.equal(operacionConInmunidad(sheet, { tipo: "poner", estado: B }, false).tipo, "aplicar");
  });
});

describe("Personalizado: chips, aplicar y deshacer", () => {
  test("chip con el nombre y el resumen", () => {
    const [d] = describirEstadosActivos([B]);
    assert.equal(d.nombre, "Bendición del chamán");
    assert.equal(d.grado, null);
    assert.equal(d.valorTexto, "+2 Aguante, −1 Sigilo");
    assert.equal(d.label, "Bendición del chamán +2 Aguante, −1 Sigilo");
    assert.equal(resumenPersonalizado(BENDICION), "+2 Aguante, −1 Sigilo");
    assert.equal(explicacionDeEstado(d).titulo, "Bendición del chamán");
    assert.equal(estadoDeActivo({ estadoId: "custom:zz" }), null);
  });

  test("activoAAplicar: id nuevo con prefijo y la duración elegida", () => {
    const a = activoAAplicar({ custom: BENDICION, duracion: { tipo: "escena" } }, "custom:abc");
    assert.deepEqual(a, { estadoId: "custom:abc", gradoId: "activo", rondasRestantes: null, finDeEscena: true, custom: BENDICION });
    const id = nuevoIdPersonalizado();
    assert.ok(esIdPersonalizado(id) && leerEstados([{ ...a, estadoId: id }]).length === 1, id);
    assert.notEqual(nuevoIdPersonalizado(), nuevoIdPersonalizado());
  });

  test("validación: acepta el personalizado y rechaza 0, ids colados y nombre vacío", () => {
    const ok = estadoAAplicarSchema.safeParse({ custom: { ...BENDICION, nombre: "  Bendición  " }, duracion: { tipo: "rondas", rondas: 2 } });
    assert.ok(ok.success);
    assert.ok(ok.success && "custom" in ok.data && ok.data.custom.nombre === "Bendición");
    for (const malo of [
      { custom: { nombre: "X", modificadores: [{ tipo: "atributo", id: "fuerza", valor: 0 }] }, duracion: { tipo: "escena" } },
      { custom: { nombre: "X", modificadores: [{ tipo: "atributo", id: "fuerza", valor: 11 }] }, duracion: { tipo: "escena" } },
      { custom: { nombre: "X", modificadores: [] }, duracion: { tipo: "escena" } },
      { custom: { nombre: " ", modificadores: BENDICION.modificadores }, duracion: { tipo: "escena" } },
      { custom: BENDICION, estadoId: "custom:mio", duracion: { tipo: "escena" } },
      { custom: { ...BENDICION, extra: 1 }, duracion: { tipo: "escena" } },
    ]) {
      assert.equal(estadoAAplicarSchema.safeParse(malo).success, false, JSON.stringify(malo));
    }
    assert.ok(estadoAAplicarSchema.safeParse({ estadoId: "derribado", gradoId: "activo", duracion: { tipo: "escena" } }).success);
  });

  test("deshacer ponerlo y quitarlo, pasando por lo que guarda el registro", () => {
    const pj = { id: "pj", sheet, estados: [M] };
    const puesto = aplicarOperacionEstado(pj, { tipo: "poner", estado: B })!;
    assert.equal(puesto.estados.length, 2);
    // Con Aguante +2 sube el máximo: no se resta vida.
    const guardado = JSON.parse(JSON.stringify(datosParaGuardar({ tipo: "estado_poner", cambios: [puesto.cambio] })));
    const datos = leerDatosRegistro("estado_poner", guardado);
    assert.ok(datos && datos.tipo === "estado_poner");
    assert.deepEqual(datos.cambios[0].despues, B);
    assert.match(textoEntradaRegistro("estado_poner", datos, [{ id: "pj", nombre: "Kira" }]), /Bendición del chamán/);
    const deshecho = planDeshacerEstados(datos, [{ id: "pj", nombre: "Kira", sheet: puesto.vida.sheet, estados: puesto.estados }], [], []);
    assert.ok(deshecho.ok);
    assert.deepEqual(deshecho.ok && deshecho.plan.personajes[0].estados, [M]);

    const quitado = aplicarOperacionEstado(
      { id: "pj", sheet: puesto.vida.sheet, estados: puesto.estados },
      { tipo: "quitar", estadoId: B.estadoId },
    )!;
    const datosQuitar = leerDatosRegistro("estado_quitar", JSON.parse(JSON.stringify(datosParaGuardar({ tipo: "estado_quitar", cambios: [quitado.cambio] }))));
    assert.ok(datosQuitar && datosQuitar.tipo === "estado_quitar");
    const vuelve = planDeshacerEstados(datosQuitar, [{ id: "pj", nombre: "Kira", sheet: quitado.vida.sheet, estados: quitado.estados }], [], []);
    assert.ok(vuelve.ok);
    assert.deepEqual(vuelve.ok && vuelve.plan.personajes[0].estados, [M, B]);
  });
});

describe("grupos del panel de estados", () => {
  test("cada estado de ESTADOS tiene grupo, y el mapa no nombra estados que no existen", () => {
    for (const e of ESTADOS) assert.ok(Object.hasOwn(GRUPO_DE_ESTADO, e.id), `${e.id} sin grupo en GRUPO_DE_ESTADO`);
    for (const id of Object.keys(GRUPO_DE_ESTADO)) assert.ok(ESTADOS.some((e) => e.id === id), `${id} no está en ESTADOS`);
  });

  test("los de fármaco, a Fármacos; ninguno de los que se ponen cae en Otros", () => {
    for (const e of ESTADOS_DE_FARMACO) assert.equal(grupoDeEstado(e.id), "farmacos", e.id);
    for (const e of [...ESTADOS, ...ESTADOS_DE_FARMACO]) assert.notEqual(grupoDeEstado(e.id), "otros", e.id);
    assert.equal(grupoDeEstado("no_existe"), "otros");
  });

  test("el panel: cada uno con su grupo, de los que existen; los de solo quitar, en Otros", () => {
    const ids = new Set(GRUPOS_ESTADO.map((g) => g.id));
    const panel = estadosDelPanel(["sigilo"]);
    for (const x of panel) assert.ok(ids.has(x.grupo), x.estado.id);
    const sigilo = panel.find((x) => x.estado.id === "sigilo");
    assert.ok(sigilo, "sigilo debería salir para quitarlo");
    assert.equal(sigilo.grupo, "otros");
    assert.equal(sigilo.soloQuitar, true);
  });
});
