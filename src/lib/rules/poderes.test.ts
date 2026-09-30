import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  resolverPoder,
  opcionesDisponibles,
  accionesDePsionica,
  generaAccionDePoder,
  tiradaDePoder,
  enEspecialidadDePoder,
  costeFatiga,
  bloqueoPorFatiga,
  gradoDeTirada,
  textoDeGrado,
  cruzaSobrecarga,
  dificultadSobrecarga,
  danioSobrecarga,
  togglesDeFatiga,
  etiquetaPoder,
  levitacion,
  conEsquivaLevitando,
} from "./poderes";
import { defaultSheet, parseSheet, type Sheet } from "./sheet";
import { migrar } from "./migraciones";
import { pagarFatiga, fatigaEfectiva, ajustarFatigaTemporal, terminarEscena } from "./vitalidad";
import { resolverDanio, ACCIONES, usarHabilidadAlternativa, modificadorAccion, tirarDado } from "./acciones";
import { fuentesDeCapa1 } from "./capa1";
import { DISCIPLINAS, disciplinaPorId } from "../catalog/psionica";
import type { AccionPoder, ModificadorFatiga } from "./psionica";

const accion = (id: string) => disciplinaPorId("singularidad").acciones.find((a) => a.id === `psi_singularidad_${id}`)!;
const resolver = (id: string, nivelPoseido: number, elecciones: Record<string, string> = {}) =>
  resolverPoder(accion(id), { nivelPoseido, elecciones })!;

describe("resolverPoder — Singularidad", () => {
  test("Impulso nivel 3 con nivel 4 poseído, forma normal", () => {
    const p = resolver("impulso", 4, { nivel: "n3", modo: "normal" });
    assert.equal(p.nivelEmpleado, 3);
    assert.equal(p.economia, "estandar");
    assert.equal(p.fatiga, 3);
    assert.equal(p.alcance, 60);
    assert.equal(p.desplazamiento, 12);
    assert.equal(p.resolucion.tipo === "ataque" && p.resolucion.danio, 12);
    assert.equal(p.objetivoTira[1].dificultad, 11);
    assert.equal(p.objetivoTira[1].grados?.exito, "Se desplaza la mitad (6 m) hacia atrás");
    assert.equal(p.objetivoTira[1].grados?.fracaso, "Se desplaza 12 m hacia atrás y cae derribado");
  });

  test("Impulso Poderoso: suma sobre el nivel empleado; empuje 8 × poseído", () => {
    const p = resolver("impulso", 4, { nivel: "n3", modo: "poderoso" });
    assert.equal(p.economia, "compleja");
    assert.equal(p.fatiga, 4);
    assert.equal(p.resolucion.tipo === "ataque" && p.resolucion.danio, 14);
    assert.equal(p.desplazamiento, 32);
    assert.equal(p.objetivoTira[1].dificultad, 12);
    assert.equal(p.objetivoTira[1].grados?.exito, "Se desplaza la mitad (16 m) hacia atrás");
    assert.equal(p.objetivoTira[1].grados?.fracasoCritico, "Se desplaza 32 m hacia atrás, queda derribado y aturdido 1 turno");
  });

  test("las notas de la opción se añaden a las de la acción, no las sustituyen", () => {
    const p = resolver("impulso", 2, { modo: "poderoso" });
    assert.equal(p.notas.length, 2);
    assert.match(p.notas[0].texto, /cobertura ligera/);
    assert.match(p.notas[1].texto, /Impulso Poderoso/);
    assert.equal(resolver("impulso", 2).notas.length, 1);
  });

  test("Expansión Poderosa sube las dos dificultades del objetivo", () => {
    const normal = resolver("expansion", 2, { nivel: "n2" });
    const poderosa = resolver("expansion", 2, { nivel: "n2", modo: "poderoso" });
    assert.deepEqual(normal.objetivoTira.map((t) => t.dificultad), [8, 10]);
    assert.deepEqual(poderosa.objetivoTira.map((t) => t.dificultad), [9, 11]);
    assert.deepEqual(poderosa.objetivo, { tipo: "casilla", area: 8 });
    assert.equal(poderosa.resolucion.tipo === "ataque" && poderosa.resolucion.danio, 16);
    assert.equal(poderosa.fatiga, 3);
  });

  test("Convergencia Poderosa: el comodín salta la esquiva, que no tiene dificultad", () => {
    const p = resolver("convergencia", 6, { modo: "poderoso" });
    assert.equal(p.alcance, 90);
    assert.equal(p.resolucion.tipo === "ataque" && p.resolucion.danio, 13);
    assert.equal(p.objetivoTira[0].dificultad, undefined);
    assert.equal(p.objetivoTira[1].dificultad, 12);
  });

  test("por defecto: nivel empleado = poseído, forma normal", () => {
    const p = resolver("convergencia", 5);
    assert.equal(p.nivelEmpleado, 5);
    assert.deepEqual(p.elecciones, { nivel: "n5", modo: "normal" });
    assert.equal(p.fatiga, 5);
  });

  test("un nivel empleado por encima del poseído no se aplica", () => {
    const p = resolver("impulso", 2, { nivel: "n5" });
    assert.equal(p.nivelEmpleado, 2);
    assert.deepEqual(
      opcionesDisponibles(accion("impulso").ejes[0], 2).map((o) => o.id),
      ["n1", "n2"],
    );
  });

  test("sin nivel suficiente la acción no existe", () => {
    assert.equal(resolverPoder(accion("impulso"), { nivelPoseido: 0 }), null);
  });

  test("no muta el catálogo", () => {
    const antes = JSON.stringify(accion("impulso"));
    resolver("impulso", 6, { modo: "poderoso" });
    assert.equal(JSON.stringify(accion("impulso")), antes);
  });

  test("todas las combinaciones del catálogo resuelven sin 'tabla' ni marcadores sueltos", () => {
    for (const d of DISCIPLINAS)
      for (const a of d.acciones)
        for (let poseido = a.desdeNivel; poseido <= 6; poseido++) {
          const combos = a.ejes.reduce<Record<string, string>[]>(
            (acc, eje) => acc.flatMap((c) => opcionesDisponibles(eje, poseido).map((o) => ({ ...c, [eje.id]: o.id }))),
            [{}],
          );
          for (const elecciones of combos) {
            const p = resolverPoder(a, { nivelPoseido: poseido, elecciones, disciplina: d })!;
            assert.doesNotMatch(JSON.stringify(p), /"tabla"|\{\w+(\/2)?\}/, `${a.id} ${JSON.stringify(elecciones)}`);
          }
        }
  });
});

describe("resolverPoder — Valor", () => {
  const base: AccionPoder = { ...accion("convergencia"), ejes: [], alcance: { base: 2, porNivelPoseido: 3, porAplicado: { aplicado: "voluntad", valor: 2 } }, fatiga: { manual: "según la carga" } };

  test("porNivelPoseido y porAplicado se evalúan; manual se queda como texto", () => {
    const p = resolverPoder(
      { ...base, resolucion: { ...base.resolucion, danio: 1 } as AccionPoder["resolucion"] },
      { nivelPoseido: 4, aplicados: { voluntad: 3 } },
    )!;
    assert.equal(p.alcance, 2 + 12 + 6);
    assert.deepEqual(p.fatiga, { manual: "según la carga" });
    assert.equal(p.nivelEmpleado, 4);
  });

  test("un campo que sigue en 'tabla' es un error del catálogo", () => {
    assert.throws(() => resolverPoder(base, { nivelPoseido: 1 }), /tabla/);
  });
});

describe("accionesDePsionica", () => {
  const conNiveles = (psionica: Sheet["psionica"]): Sheet => ({ ...defaultSheet(), psionica });

  test("sin niveles no hay poderes", () => {
    assert.deepEqual(accionesDePsionica(defaultSheet()), []);
  });

  test("Singularidad 3: sus tres formas, resueltas a nivel 3", () => {
    const poderes = accionesDePsionica(conNiveles({ traslacion: 2, singularidad: 3 })).filter(
      (p) => p.disciplina.id === "singularidad",
    );
    assert.deepEqual(
      poderes.map((p) => p.accion.id),
      ["psi_singularidad_impulso", "psi_singularidad_expansion", "psi_singularidad_convergencia"],
    );
    for (const p of poderes) {
      assert.equal(p.nivelPoseido, 3);
      assert.equal(p.porDefecto.nivelEmpleado, 3);
      assert.equal(p.porDefecto.fatiga, 3);
    }
  });

  test("los poderes entran en fuentesDeCapa1 como familia 'poder'", () => {
    const fuentes = fuentesDeCapa1(conNiveles({ traslacion: 2, singularidad: 1 })).filter((f) =>
      f.catalogoId.startsWith("psi_singularidad_"),
    );
    assert.deepEqual(
      fuentes.map((f) => [f.familia, f.catalogoId, f.nivel]),
      [
        ["poder", "psi_singularidad_impulso", 1],
        ["poder", "psi_singularidad_expansion", 1],
        ["poder", "psi_singularidad_convergencia", 1],
      ],
    );
  });

  test("una acción sin su entrada de motor construida no se genera", () => {
    const impulso = accion("impulso");
    const sinConstruir: AccionPoder = {
      ...impulso,
      motor: impulso.motor.map((m) => (m.tipo === "accion" ? { ...m, estado: "bloqueado", bloqueoPor: "prueba" } : m)),
    };
    assert.equal(generaAccionDePoder(impulso), true);
    assert.equal(generaAccionDePoder(sinConstruir), false);
  });
});

describe("tiradaDePoder", () => {
  test("Impulso Poderoso nivel 2: grupo Psiónica, Perspicacia + Tecnociencia, daño resuelto", () => {
    const p = resolver("impulso", 3, { nivel: "n2", modo: "poderoso" });
    const t = tiradaDePoder(accion("impulso"), p)!;
    assert.equal(t.id, "psi_singularidad_impulso");
    assert.equal(t.label, "Impulso Poderoso (nivel 2)");
    assert.equal(t.grupo, "Psiónica");
    assert.equal(t.aplicado, "perspicacia");
    assert.equal(t.habilidad, "tecnociencia");
    assert.deepEqual(t.ataque?.modos, [{ id: "poder", danio: 13, formulaDanio: null, categoriaDanio: "Letal" }]);
  });

  test("forma normal: la etiqueta es la de la acción", () => {
    assert.equal(tiradaDePoder(accion("convergencia"), resolver("convergencia", 1))!.label, "Convergencia (nivel 1)");
  });

  test("la especialidad Física se aplica sola si el personaje la tiene", () => {
    const p = resolver("impulso", 1);
    const sin = defaultSheet();
    const con: Sheet = { ...sin, habilidades: { ...sin.habilidades, tecnociencia: { valor: 2, especialidades: ["física"] } } };
    assert.equal(enEspecialidadDePoder(sin, p), false);
    assert.equal(enEspecialidadDePoder(con, p), true);
  });
});

describe("costeFatiga", () => {
  const sing = disciplinaPorId("singularidad");
  const mod = (m: Partial<ModificadorFatiga> & Pick<ModificadorFatiga, "op" | "valor">): ModificadorFatiga => ({
    fuente: `prueba ${m.op}`,
    alcance: {},
    ...m,
  });

  test("Singularidad: el coste es la fila de nivel, +1 en forma Poderosa", () => {
    assert.equal(costeFatiga(sing, "psi_singularidad_impulso", resolver("impulso", 4, { nivel: "n3" })).total, 3);
    assert.equal(costeFatiga(sing, "psi_singularidad_impulso", resolver("impulso", 4, { nivel: "n3", modo: "poderoso" })).total, 4);
  });

  test("orden fijo: descuentos → ×2 → Xovromium −1, aunque lleguen desordenados", () => {
    const p = resolver("convergencia", 4, { nivel: "n4" });
    const c = costeFatiga(sing, "psi_singularidad_convergencia", p, {
      externos: [
        mod({ fuente: "Xovromium", op: "ignora_primero", valor: 1 }),
        mod({ fuente: "Munición Supresora", op: "multiplica", valor: 2 }),
        mod({ fuente: "Descuento", op: "suma", valor: -1 }),
      ],
    });
    assert.equal(c.total, (4 - 1) * 2 - 1);
    assert.deepEqual(
      c.desglose.map((l) => l.etiqueta),
      ["Coste del poder", "Descuento", "Munición Supresora", "Xovromium"],
    );
  });

  test("mínimo 0 por defecto; 1 si un modificador lo fija", () => {
    const p = resolver("impulso", 1);
    const descuento = mod({ op: "suma", valor: -5 });
    assert.equal(costeFatiga(sing, "psi_singularidad_impulso", p, { externos: [descuento] }).total, 0);
    assert.equal(
      costeFatiga(sing, "psi_singularidad_impulso", p, { externos: [descuento, mod({ op: "minimo", valor: 1 })] }).total,
      1,
    );
  });

  test("filtros: disciplina, acción, opción, nivel empleado y poseído, toggle", () => {
    const p = resolver("impulso", 3, { nivel: "n2", modo: "poderoso" });
    const coste = (m: ModificadorFatiga, toggles?: Set<string>) =>
      costeFatiga(sing, "psi_singularidad_impulso", p, { externos: [m], toggles }).total;
    const base = 3;
    assert.equal(coste(mod({ op: "suma", valor: -1, alcance: { disciplina: "traslacion" } })), base);
    assert.equal(coste(mod({ op: "suma", valor: -1, alcance: { rama: "metrica" } })), base - 1);
    assert.equal(coste(mod({ op: "suma", valor: -1, alcance: { accion: "psi_singularidad_expansion" } })), base);
    assert.equal(coste(mod({ op: "suma", valor: -1, alcance: { opcion: { eje: "modo", opcion: "poderoso" } } })), base - 1);
    assert.equal(coste(mod({ op: "suma", valor: -1, alcance: { nivelEmpleadoMax: 1 } })), base);
    assert.equal(coste(mod({ op: "suma", valor: -1, desdeNivelPoseido: 4 })), base);
    assert.equal(coste(mod({ op: "suma", valor: -1, desdeNivelPoseido: 3 })), base - 1);
    const conToggle = mod({ op: "suma", valor: -1, condicion: { toggle: "carga_ligera" } });
    assert.equal(coste(conToggle), base);
    assert.equal(coste(conToggle, new Set(["carga_ligera"])), base - 1);
  });

  test("el pago con cargas aún no existe: error claro, no se ignora", () => {
    assert.throws(
      () =>
        costeFatiga(sing, "psi_singularidad_impulso", resolver("impulso", 1), {
          externos: [mod({ op: "paga_con_recurso", valor: { recurso: "cargas", porPunto: 4 } })],
        }),
      /sin construir/,
    );
  });

  test("bloqueo: sin fatiga suficiente no se confirma", () => {
    const impulso = accion("impulso");
    assert.equal(bloqueoPorFatiga(impulso, 3, 3), null);
    assert.equal(bloqueoPorFatiga(impulso, 4, 3), "Te faltan 1 de fatiga (tienes 3, cuesta 4).");
    assert.equal(bloqueoPorFatiga({ ...impulso, permiteFatigaTemporal: true }, 4, 3), null);
  });
});

describe("resultado de un poder", () => {
  test("margen → grado", () => {
    assert.equal(gradoDeTirada({ exito: true, critico: true }), "critico");
    assert.equal(gradoDeTirada({ exito: true, critico: false }), "exito");
    assert.equal(gradoDeTirada({ exito: false, critico: false }), "fracaso");
    assert.equal(gradoDeTirada({ exito: false, critico: true }), "fracasoCritico");
    assert.equal(gradoDeTirada({ exito: null, critico: false }), null);
  });

  test("sin texto de crítico cae al del grado normal", () => {
    const { poder } = tiradaDePoder(accion("impulso"), resolver("impulso", 1))!;
    assert.match(textoDeGrado(poder!.resultados, "critico")!, /^Impacta/);
    assert.equal(textoDeGrado(poder!.resultados, "fracasoCritico"), "No impacta");
  });

  test("lo que tira el objetivo lleva dificultad y metros de la forma elegida", () => {
    const { poder } = tiradaDePoder(accion("impulso"), resolver("impulso", 4, { nivel: "n3", modo: "poderoso" }))!;
    assert.equal(poder!.objetivoTira[0].dificultad, undefined);
    assert.equal(poder!.objetivoTira[1].dificultad, "12");
    assert.equal(poder!.objetivoTira[1].grados?.exito, "Se desplaza la mitad (16 m) hacia atrás");
  });

  test("las notas de daño van a efectos; las de antes de tirar no", () => {
    const convergencia = tiradaDePoder(accion("convergencia"), resolver("convergencia", 1))!;
    assert.equal(convergencia.efectos?.length, 4);
    assert.ok(convergencia.efectos!.every((e) => e.fuente === "Convergencia"));
    assert.match(convergencia.efectos![0].texto, /mitad de la absorción/);
    assert.equal(tiradaDePoder(accion("impulso"), resolver("impulso", 1))!.efectos, undefined);
  });
});

describe("sobrecarga", () => {
  test("salta al cruzar el umbral de exhausto, no si ya lo estaba ni si no llega", () => {
    // fatiga máx 8: exhausto por debajo de 2 (mínimo 2)
    assert.equal(cruzaSobrecarga(3, 1, 8), true);
    assert.equal(cruzaSobrecarga(2, 0, 8), true);
    assert.equal(cruzaSobrecarga(1, 0, 8), false);
    assert.equal(cruzaSobrecarga(8, 6, 8), false);
    // fatiga máx 30: exhausto por debajo de 3
    assert.equal(cruzaSobrecarga(5, 3, 30), false);
    assert.equal(cruzaSobrecarga(5, 2, 30), true);
  });

  test("dificultad 5 + nivel", () => {
    assert.deepEqual([1, 3, 6].map(dificultadSobrecarga), [6, 8, 11]);
  });

  test("daño = nivel × (0 / ½ / 1 / 2), la mitad redondeando hacia abajo", () => {
    assert.deepEqual(
      (["critico", "exito", "fracaso", "fracasoCritico"] as const).map((g) => danioSobrecarga(3, g)),
      [0, 1, 3, 6],
    );
    assert.equal(danioSobrecarga(1, "exito"), 0);
    assert.equal(danioSobrecarga(6, "exito"), 3);
  });
});

describe("daño al fallar", () => {
  test("solo Expansión permite tirar daño al fallar", () => {
    assert.equal(tiradaDePoder(accion("expansion"), resolver("expansion", 2))!.ataque?.danioAlFallar, true);
    assert.equal(tiradaDePoder(accion("impulso"), resolver("impulso", 2))!.ataque?.danioAlFallar, undefined);
    assert.equal(tiradaDePoder(accion("convergencia"), resolver("convergencia", 2))!.ataque?.danioAlFallar, undefined);
  });

  test("al fallar, el daño es el base sin bono por éxitos", () => {
    assert.deepEqual(resolverDanio(15, -3, "Letal"), { base: 15, bonoExitos: 0, total: 15, categoria: "Letal" });
  });
});

describe("Traslación", () => {
  const tras = disciplinaPorId("traslacion");
  const acc = (id: string) => tras.acciones.find((a) => a.id === `psi_traslacion_${id}`)!;
  const res = (id: string, nivelPoseido: number, elecciones: Record<string, string> = {}, perspicacia = 2) =>
    resolverPoder(acc(id), { nivelPoseido, elecciones, disciplina: tras, aplicados: { perspicacia } })!;

  test("Anclaje paga la fila del nivel empleado: fatiga, alcance y carga", () => {
    const p = res("anclaje", 4, { nivel: "n3" });
    assert.equal(p.fatiga, 2);
    assert.equal(p.alcance, 45);
    assert.equal(p.carga, 125 * 2);
    // la duración va por el nivel POSEÍDO
    assert.equal(p.duracion, 4);
    assert.match(p.resultados.exito!.texto, /paralizado 4 turnos/);
  });

  test("nivel 4: Anclaje de un objetivo pasa a simple; varios a la vez sigue compleja", () => {
    assert.equal(res("anclaje", 3).economia, "estandar");
    assert.equal(res("anclaje", 4).economia, "simple");
    assert.equal(res("anclaje", 4, { objetivos: "varios" }).economia, "compleja");
    assert.equal(res("anclaje", 4, { objetivos: "anadir" }).economia, "estandar");
  });

  test("Anclaje es tirada de Perspicacia + Tecnociencia sin daño", () => {
    const t = tiradaDePoder(acc("anclaje"), res("anclaje", 1))!;
    assert.equal(t.aplicado, "perspicacia");
    assert.equal(t.habilidad, "tecnociencia");
    assert.equal(t.ataque, undefined);
    assert.equal(t.label, "Anclaje (nivel 1)");
  });

  test("casillas de carga: < 10 kg cuesta 0 desde nivel 3; por debajo de la máxima −1 con mínimo 1 en nivel 6", () => {
    const coste = (nivel: number, toggle?: string) => {
      const p = res("anclaje", nivel);
      return costeFatiga(tras, "psi_traslacion_anclaje", p, { toggles: new Set(toggle ? [toggle] : []) }).total;
    };
    assert.deepEqual(togglesDeFatiga(tras, "psi_traslacion_anclaje", res("anclaje", 2)), []);
    assert.equal(coste(3, "Carga < 10 kg"), 0);
    assert.equal(coste(6), 4);
    assert.equal(coste(6, "Carga por debajo de la máxima del nivel"), 3);
    assert.deepEqual(
      togglesDeFatiga(tras, "psi_traslacion_anclaje", res("anclaje", 6)).map((t) => t.toggle),
      ["Carga < 10 kg", "Carga por debajo de la máxima del nivel"],
    );
    // nivel 6 empleando la fila 1 (coste 1): −1 se queda en el mínimo 1
    const p1 = res("anclaje", 6, { nivel: "n1" });
    assert.equal(costeFatiga(tras, "psi_traslacion_anclaje", p1, { toggles: new Set(["Carga por debajo de la máxima del nivel"]) }).total, 1);
  });

  test("los descuentos de carga no tocan a Proyección ni a Sensor", () => {
    assert.deepEqual(togglesDeFatiga(tras, "psi_traslacion_proyeccion", res("proyeccion", 6)), []);
    assert.deepEqual(togglesDeFatiga(tras, "psi_traslacion_sensor", res("sensor", 6)), []);
  });

  test("Trasladar: sin tirada, velocidad 10 × nivel poseído, simple o estándar con varios", () => {
    const p = res("trasladar", 3, { nivel: "n1" });
    assert.equal(tiradaDePoder(acc("trasladar"), p), null);
    assert.equal(p.desplazamiento, 30);
    assert.equal(p.fatiga, 1);
    assert.equal(p.economia, "simple");
    assert.equal(res("trasladar", 3, { objetivos: "varios" }).economia, "estandar");
    assert.ok(res("trasladar", 3, { objetivos: "varios" }).multiplesObjetivos);
    assert.equal(res("trasladar", 3, { control: "mantener" }).objetivoTira.length, 1);
    assert.equal(etiquetaPoder(acc("trasladar"), res("trasladar", 3, { objetivos: "varios" })), "Trasladar (nivel 3)");
  });

  test("Proyección: Reflejos + Tecnociencia con −2 fijo, daño nivel + 4, alcance 20 × nivel", () => {
    const p = res("proyeccion", 3);
    const t = tiradaDePoder(acc("proyeccion"), p)!;
    assert.equal(t.aplicado, "reflejos");
    assert.deepEqual(t.ajustesFijos, [{ valor: -2, fuente: "Proyección (propio)" }]);
    assert.equal(t.ataque?.modos[0].danio, 7);
    assert.equal(p.alcance, 60);
    assert.equal(p.fatiga, 1);
    assert.equal(res("proyeccion", 3, { economia: "reaccion" }).economia, "reaccion");
  });

  test("Sensor: simple o reacción solo desde nivel 5; duración y radio por nivel poseído", () => {
    assert.deepEqual(opcionesDisponibles(acc("sensor").ejes[0], 4).map((o) => o.id), ["estandar"]);
    assert.deepEqual(opcionesDisponibles(acc("sensor").ejes[0], 5).map((o) => o.id), ["estandar", "simple", "reaccion"]);
    const p = res("sensor", 5, { economia: "reaccion" });
    assert.equal(p.economia, "reaccion");
    assert.equal(p.duracion, 5);
    assert.equal(p.objetivo?.area, 10);
  });

  test("Auto-proyección: sin tirada, 1 de fatiga, ×4 es compleja", () => {
    assert.equal(tiradaDePoder(acc("auto_proyeccion"), res("auto_proyeccion", 1)), null);
    assert.equal(res("auto_proyeccion", 1, { velocidad: "cuadruple" }).economia, "compleja");
    assert.equal(res("auto_proyeccion", 1).fatiga, 1);
  });
});

test("Traslación: la carga máxima solo sale en las acciones que pagan la tabla", () => {
  const tras = disciplinaPorId("traslacion");
  const r = (id: string) =>
    resolverPoder(tras.acciones.find((a) => a.id === `psi_traslacion_${id}`)!, { nivelPoseido: 2, disciplina: tras, aplicados: { perspicacia: 1 } })!;
  assert.equal(r("trasladar").carga, 50);
  assert.equal(r("proyeccion").carga, null);
  assert.equal(r("sensor").carga, null);
});

describe("Traslación, tanda 2", () => {
  const tras = disciplinaPorId("traslacion");
  const acc = (id: string) => tras.acciones.find((a) => a.id === `psi_traslacion_${id}`)!;
  const res = (id: string, nivelPoseido: number, elecciones: Record<string, string> = {}) =>
    resolverPoder(acc(id), { nivelPoseido, elecciones, disciplina: tras, aplicados: { perspicacia: 1 } });

  test("Levitar: desde nivel 2, 1 de fatiga, 10 × nivel m, periodo por nivel poseído", () => {
    assert.equal(res("levitar", 1), null);
    const n2 = res("levitar", 2)!;
    assert.equal(tiradaDePoder(acc("levitar"), n2), null);
    assert.equal(n2.fatiga, 1);
    assert.equal(n2.desplazamiento, 20);
    assert.equal(n2.economia, "simple");
    assert.deepEqual(n2.duracion, { manual: "1 minuto" });
    assert.deepEqual(res("levitar", 4)!.duracion, { manual: "10 minutos" });
    assert.deepEqual(res("levitar", 6)!.duracion, { manual: "1 hora" });
    assert.equal(res("levitar", 6)!.carga, null);
    assert.deepEqual(togglesDeFatiga(tras, "psi_traslacion_levitar", res("levitar", 6)!), []);
  });

  test("levitacion() en el movimiento de la ficha", () => {
    assert.equal(levitacion(defaultSheet()), null);
    assert.equal(levitacion({ ...defaultSheet(), psionica: { traslacion: 1 } }), null);
    assert.deepEqual(levitacion({ ...defaultSheet(), psionica: { traslacion: 3 } }), { velocidadM: 30, nivel: 3 });
  });

  test("Auto-anclaje: reacción, Reflejos + Tecnociencia, dificultad 6 sugerida, paga la fila", () => {
    const p = res("auto_anclaje", 3, { nivel: "n2" })!;
    const t = tiradaDePoder(acc("auto_anclaje"), p)!;
    assert.equal(t.aplicado, "reflejos");
    assert.equal(t.dificultadSugerida, 6);
    assert.equal(p.economia, "reaccion");
    assert.equal(p.fatiga, 2);
    assert.equal(p.carga, 50);
    assert.equal(costeFatiga(tras, "psi_traslacion_auto_anclaje", p, { toggles: new Set(["Carga < 10 kg"]) }).total, 0);
  });

  test("Duelo de Métrica: enfrentada, 1 de fatiga, gratis con la casilla de 2 niveles", () => {
    const p = res("duelo_metrica", 1)!;
    const t = tiradaDePoder(acc("duelo_metrica"), p)!;
    assert.equal(t.aplicado, "perspicacia");
    assert.equal(t.dificultadSugerida, undefined);
    assert.equal(p.economia, "reaccion");
    assert.equal(res("duelo_metrica", 1, { economia: "simple" })!.economia, "simple");
    assert.deepEqual(togglesDeFatiga(tras, "psi_traslacion_duelo_metrica", p).map((x) => x.toggle), ["Soy 2 niveles superior en Traslación"]);
    assert.equal(costeFatiga(tras, "psi_traslacion_duelo_metrica", p).total, 1);
    assert.equal(
      costeFatiga(tras, "psi_traslacion_duelo_metrica", p, { toggles: new Set(["Soy 2 niveles superior en Traslación"]) }).total,
      0,
    );
    // la casilla del duelo no aparece en otras acciones
    assert.ok(!togglesDeFatiga(tras, "psi_traslacion_anclaje", res("anclaje", 6)!).some((x) => /niveles superior/.test(x.toggle)));
  });
});

describe("Proeza y fatiga temporal", () => {
  const tras = disciplinaPorId("traslacion");
  const proeza = tras.acciones.find((a) => a.id === "psi_traslacion_proeza")!;
  const res = (nivelPoseido: number, elecciones: Record<string, string> = {}) =>
    resolverPoder(proeza, { nivelPoseido, elecciones, disciplina: tras, aplicados: { perspicacia: 1 } })!;
  const ficha = (fatigaActual: number, fatigaTemporal = 0): Sheet => ({ ...defaultSheet(), fatigaActual, fatigaTemporal });

  test("Proeza: Potencia + Atletismo dificultad 10, compleja, paga la fila, sin casillas de carga", () => {
    const p = res(4, { nivel: "n4" });
    const t = tiradaDePoder(proeza, p)!;
    assert.equal(t.aplicado, "potencia");
    assert.equal(t.habilidad, "atletismo");
    assert.equal(t.dificultadSugerida, 10);
    assert.equal(p.economia, "compleja");
    assert.equal(p.fatiga, 3);
    assert.deepEqual(togglesDeFatiga(tras, proeza.id, p), []);
  });

  test("Proeza no se bloquea sin fatiga; las demás sí", () => {
    assert.equal(bloqueoPorFatiga(proeza, 3, 0), null);
    assert.ok(bloqueoPorFatiga(tras.acciones.find((a) => a.id === "psi_traslacion_anclaje")!, 3, 0));
  });

  test("peso del objetivo: +1 por cada 10 % completo de exceso, mínimo 1", () => {
    // Traslación 3, Perspicacia 1 → carga máxima 125 kg; fila 3 = 2 de fatiga
    const r = (pesoKg?: number) =>
      resolverPoder(proeza, { nivelPoseido: 3, disciplina: tras, aplicados: { perspicacia: 1 }, pesoKg })!;
    assert.equal(r(200).exceso?.extra, 6); // 60 % de exceso
    assert.equal(r(200).fatiga, 2 + 6);
    assert.equal(r(200).exceso?.porcentajeCarga, 160);
    assert.equal(r(130).exceso?.extra, 1); // 4 % → mínimo 1
    assert.equal(r(145).exceso?.extra, 1); // 16 % → 1 (por cada 10 % completo)
    assert.equal(r(156.25).exceso?.extra, 2); // 25 %
    const p = r(200);
    const c = costeFatiga(tras, proeza.id, p);
    assert.equal(c.total, 8);
    assert.deepEqual(c.desglose.map((l) => l.valor), ["2", "+6"]);
  });

  test("bloqueos: sin peso, sin pasar de la carga, por encima del 200 %, carga 0", () => {
    const r = (pesoKg: number | undefined, perspicacia = 1) =>
      resolverPoder(proeza, { nivelPoseido: 3, disciplina: tras, aplicados: { perspicacia }, pesoKg })!.exceso!;
    assert.match(r(undefined).bloqueo!, /Escribe el peso/);
    assert.match(r(125).bloqueo!, /no hace falta Proeza/);
    assert.match(r(251).bloqueo!, /Supera el límite del 200 %/);
    assert.match(r(10, 0).bloqueo!, /carga máxima es 0 kg/);
    assert.equal(r(126).bloqueo, null);
  });

  test("al 200 % justo: en el límite, +10 de extra y 1 de daño mental propio", () => {
    const p = resolverPoder(proeza, { nivelPoseido: 3, disciplina: tras, aplicados: { perspicacia: 1 }, pesoKg: 250 })!;
    assert.equal(p.exceso?.enLimite, true);
    assert.equal(p.exceso?.extra, 10);
    assert.deepEqual(p.danioPropio, { valor: 1, categoria: "mental" });
    assert.ok(p.notas.some((n) => /Llegas al 200 %/.test(n.texto)));
    const bajo = resolverPoder(proeza, { nivelPoseido: 3, disciplina: tras, aplicados: { perspicacia: 1 }, pesoKg: 249 })!;
    assert.equal(bajo.exceso?.enLimite, false);
    assert.equal(bajo.danioPropio, null);
  });

  test("pagarFatiga: el exceso va a temporal solo si se permite", () => {
    assert.deepEqual([pagarFatiga(ficha(5), 3, true)].map((s) => [s.fatigaActual, s.fatigaTemporal]), [[2, 0]]);
    assert.deepEqual([pagarFatiga(ficha(2), 5, true)].map((s) => [s.fatigaActual, s.fatigaTemporal]), [[0, 3]]);
    assert.deepEqual([pagarFatiga(ficha(2, 1), 4, true)].map((s) => [s.fatigaActual, s.fatigaTemporal]), [[0, 3]]);
    assert.deepEqual([pagarFatiga(ficha(2), 5, false)].map((s) => [s.fatigaActual, s.fatigaTemporal]), [[0, 0]]);
  });

  test("fatiga efectiva, ajuste manual y terminar escena", () => {
    assert.equal(fatigaEfectiva(ficha(0, 3)), -3);
    assert.equal(fatigaEfectiva(ficha(6, 2)), 4);
    assert.equal(ajustarFatigaTemporal(ficha(0, 1), -5).fatigaTemporal, 0);
    assert.equal(ajustarFatigaTemporal(ficha(0, 1), 2).fatigaTemporal, 3);
    assert.equal(terminarEscena(ficha(0, 4)).fatigaTemporal, 0);
  });

  test("la sobrecarga se calcula con la fatiga efectiva", () => {
    // fatiga máx 8, actual 5 con 2 temporales → efectiva 3; gastar 2 cruza a exhausto (<2)
    assert.equal(cruzaSobrecarga(fatigaEfectiva(ficha(5, 2)), fatigaEfectiva(ficha(5, 2)) - 2, 8), true);
  });
});

describe("v12 → v13: fatiga temporal", () => {
  test("una ficha v12 arranca sin fatiga temporal; parseSheet la recorta", () => {
    const { ficha } = migrar({ schemaVersion: 12, psionica: { traslacion: 1 } }, 13);
    assert.equal(ficha.fatigaTemporal, 0);
    assert.deepEqual(ficha.psionica, { traslacion: 1 });
    assert.equal(parseSheet({ schemaVersion: 13, fatigaTemporal: -4 }).fatigaTemporal, 0);
    assert.equal(parseSheet({ schemaVersion: 13, fatigaTemporal: 3 }).fatigaTemporal, 3);
  });
});

describe("Contención", () => {
  const cont = disciplinaPorId("contencion");
  const acc = (id: string) => cont.acciones.find((a) => a.id === `psi_contencion_${id}`)!;
  const res = (nivelPoseido: number, elecciones: Record<string, string> = {}) =>
    resolverPoder(acc("contencion"), { nivelPoseido, elecciones, disciplina: cont })!;
  const dato = (p: ReturnType<typeof res>, etiqueta: string) => p.datos.find((d) => d.etiqueta === etiqueta)?.valor;

  test("tabla por nivel empleado: fatiga, absorción, quieto, contra el ataque, Agilidad", () => {
    const p = res(4, { nivel: "n4" });
    assert.equal(p.fatiga, 3);
    assert.equal(dato(p, "Absorción"), 3);
    assert.equal(dato(p, "Absorción quieto"), 7);
    assert.equal(dato(p, "Contra el ataque"), 14);
    assert.equal(dato(p, "Agilidad"), -2);
    assert.equal(dato(p, "Daño al objeto"), 4);
    assert.equal(p.economia, "simple");
    assert.equal(p.duracion, 10);
    // nivel 2 personal = nivel 1
    const n2 = res(2, { nivel: "n2" });
    assert.deepEqual([n2.fatiga, dato(n2, "Absorción"), dato(n2, "Absorción quieto")], [1, 1, 3]);
    assert.equal(tiradaDePoder(acc("contencion"), p), null);
  });

  test("duración según empleado y poseído", () => {
    assert.equal(res(2, { nivel: "n1" }).duracion, 10);
    assert.equal(res(3, { nivel: "n1" }).duracion, 20);
    assert.equal(res(4, { nivel: "n1" }).duracion, 30);
    assert.equal(res(4, { nivel: "n3" }).duracion, 20);
    assert.equal(res(5, { nivel: "n1" }).duracion, 40);
    assert.equal(res(5, { nivel: "n4" }).duracion, 20);
    assert.equal(res(6, { nivel: "n3" }).duracion, 40);
    assert.equal(res(6, { nivel: "n6" }).duracion, 10);
  });

  test("nivel 6: nivel 1 personal gratis 1 hora y sin −Agilidad; rebajas de Agilidad", () => {
    const p = res(6, { nivel: "n1" });
    assert.equal(p.fatiga, 0);
    assert.deepEqual(p.duracion, { manual: "1 hora gratis; después, 1 de fatiga por hora" });
    assert.equal(dato(p, "Agilidad"), 0);
    // ampliada a nivel 1 no es gratis ni dura 1 hora
    const amp = res(6, { nivel: "n1", forma: "ampliada" });
    assert.equal(amp.fatiga, 1);
    assert.equal(amp.duracion, 40);
    assert.deepEqual([3, 4, 5, 6].map((n) => dato(res(6, { nivel: `n${n}` }), "Agilidad")), [-1, -1, -2, -3]);
  });

  test("ampliada: desde nivel 2, estándar, ×2 de fatiga; como foco, sin ×2", () => {
    assert.deepEqual(opcionesDisponibles(acc("contencion").ejes[1], 1).map((o) => o.id), ["personal"]);
    const amp = res(3, { nivel: "n3", forma: "ampliada" });
    assert.equal(amp.economia, "estandar");
    assert.equal(costeFatiga(cont, "psi_contencion_contencion", amp).total, 4);
    const foco = res(3, { nivel: "n3", forma: "foco" });
    assert.equal(costeFatiga(cont, "psi_contencion_contencion", foco).total, 2);
    assert.equal(costeFatiga(cont, "psi_contencion_contencion", res(3, { nivel: "n3" })).total, 2);
  });

  test("colaborar: 1 de fatiga, sin tirada, desde nivel 1", () => {
    const p = resolverPoder(acc("colaborar"), { nivelPoseido: 1, disciplina: cont })!;
    assert.equal(p.fatiga, 1);
    assert.equal(tiradaDePoder(acc("colaborar"), p), null);
  });
});

test("Contención ampliada protege a varios", () => {
  const cont = disciplinaPorId("contencion");
  const p = resolverPoder(cont.acciones[0], { nivelPoseido: 2, elecciones: { forma: "ampliada" }, disciplina: cont })!;
  assert.equal(p.objetivo?.tipo, "varios");
});

describe("Esquiva levitando con Física", () => {
  const esquiva = ACCIONES.find((a) => a.id === "defensa")!;
  const ficha = (traslacion: number, tecno: number, especialidades: string[] = []): Sheet => {
    const s = defaultSheet();
    return {
      ...s,
      psionica: traslacion > 0 ? { traslacion } : {},
      habilidades: { ...s.habilidades, tecnociencia: { valor: tecno, especialidades } },
    };
  };

  test("solo con Traslación 2+ aparece la casilla", () => {
    assert.equal(conEsquivaLevitando(ficha(1, 4), esquiva).habilidadAlternativa, undefined);
    assert.deepEqual(conEsquivaLevitando(ficha(2, 4), esquiva).habilidadAlternativa, {
      habilidad: "tecnociencia",
      especialidad: "Física",
      etiqueta: "Levitando: Física",
    });
    // otras tiradas no
    const salv = ACCIONES.find((a) => a.id === "salv_fortaleza")!;
    assert.equal(conEsquivaLevitando(ficha(3, 4), salv).habilidadAlternativa, undefined);
  });

  test("con Física usa Tecnociencia entera; sin ella, la mitad", () => {
    const con = ficha(2, 4, ["Física"]);
    const sin = ficha(2, 4);
    const altCon = usarHabilidadAlternativa(con, conEsquivaLevitando(con, esquiva))!;
    const altSin = usarHabilidadAlternativa(sin, conEsquivaLevitando(sin, esquiva))!;
    assert.equal(altCon.tirada.habilidad, "tecnociencia");
    assert.equal(altCon.enEspecialidad, true);
    assert.equal(altSin.enEspecialidad, false);
    assert.equal(modificadorAccion(con, altCon.tirada, altCon.enEspecialidad).habilidad, 4);
    assert.equal(modificadorAccion(sin, altSin.tirada, altSin.enEspecialidad).habilidad, 2);
    assert.equal(altCon.tirada.label, "Defensa / esquiva (Física)");
  });
});

describe("Resonancia — tanda 1", () => {
  const RES = disciplinaPorId("resonancia");
  const accionR = (id: string) => RES.acciones.find((a) => a.id === `psi_resonancia_${id}`)!;
  const resolverR = (
    id: string,
    nivelPoseido: number,
    elecciones: Record<string, string> = {},
    habilidades?: Partial<Record<"biociencia" | "actitud", number>>,
  ) => resolverPoder(accionR(id), { nivelPoseido, elecciones, disciplina: RES, habilidades })!;
  const coste = (id: string, p: ReturnType<typeof resolverR>) => costeFatiga(RES, `psi_resonancia_${id}`, p).total;

  test("por defecto, alcance local: coste propio, 1 km² y nivel empleado 1", () => {
    const p = resolverR("sincronia", 4);
    assert.equal(p.elecciones.nivel, "local");
    assert.equal(p.nivelEmpleado, 1);
    assert.equal(p.alcance, 1);
    assert.equal(p.economia, "gratuita");
    assert.equal(coste("sincronia", p), 0);
    assert.equal(etiquetaPoder(accionR("sincronia"), p), "Sincronía (local)");
  });

  test("una fila de la tabla sustituye acción, fatiga y alcance", () => {
    const p = resolverR("sincronia", 3, { mensaje: "complejo", nivel: "n3" });
    assert.deepEqual(p.economia, { tiempo: "1 minuto" });
    assert.equal(p.fatiga, 3);
    assert.equal(p.alcance, 2000);
    assert.equal(etiquetaPoder(accionR("sincronia"), p), "Sincronía (nivel 3)");
  });

  test("datos complejos en local: estándar y 1; Resonancia 2 lo baja a simple, Resonancia 3 a 0", () => {
    const n1 = resolverR("sincronia", 1, { mensaje: "complejo" });
    assert.equal(n1.economia, "estandar");
    assert.equal(coste("sincronia", n1), 1);
    assert.equal(resolverR("sincronia", 2, { mensaje: "complejo" }).economia, "simple");
    assert.equal(coste("sincronia", resolverR("sincronia", 3, { mensaje: "complejo" })), 0);
  });

  test("local como reacción solo desde nivel 3", () => {
    assert.equal(resolverR("leer_mente", 2, { nivel: "local_reaccion" }).economia, "simple"); // no disponible: local
    const p = resolverR("leer_mente", 3, { nivel: "local_reaccion" });
    assert.equal(p.economia, "reaccion");
    assert.equal(p.nivelEmpleado, 1);
    assert.equal(etiquetaPoder(accionR("leer_mente"), p), "Leer Mente (local, reacción)");
  });

  test("rebajas de la tabla por nivel poseído", () => {
    // nv2: la fila 1 (compleja) baja a estándar.
    assert.equal(resolverR("leer_mente", 2, { nivel: "n1" }).economia, "estandar");
    // nv4: la fila 2 pasa de 1 minuto a compleja.
    assert.deepEqual(resolverR("leer_mente", 3, { nivel: "n2" }).economia, { tiempo: "1 minuto" });
    assert.equal(resolverR("leer_mente", 4, { nivel: "n2" }).economia, "compleja");
    // nv6: la fila 4 dura 1 minuto.
    assert.deepEqual(resolverR("leer_mente", 5, { nivel: "n4" }).economia, { tiempo: "10 minutos" });
    assert.deepEqual(resolverR("leer_mente", 6, { nivel: "n4" }).economia, { tiempo: "1 minuto" });
  });

  test("descuentos de fatiga por nivel poseído, acumulados", () => {
    const c = (poseido: number, nivel: string) => coste("leer_mente", resolverR("leer_mente", poseido, { nivel }));
    assert.equal(c(2, "n2"), 2);
    assert.equal(c(3, "n2"), 1); // nv3: −1 a niveles 1-2
    assert.equal(c(3, "n1"), 0);
    assert.equal(c(5, "n3"), 2); // nv5: −1 a niveles 3-4
    assert.equal(c(5, "n5"), 6);
    assert.equal(c(6, "n4"), 2); // 4 − 1 (nv5) − 1 (nv6)
    assert.equal(c(6, "n5"), 5);
    assert.equal(c(6, "n6"), 8);
  });

  test("Rastreo: local cuesta 1 y estándar, dificultad 6 con Biociencia", () => {
    const p = resolverR("rastreo", 1);
    assert.equal(p.economia, "estandar");
    assert.equal(coste("rastreo", p), 1);
    assert.deepEqual(p.resolucion, { tipo: "tirada", aplicado: "perspicacia", habilidad: "biociencia", dificultad: 6 });
    assert.equal(tiradaDePoder(accionR("rastreo"), p)!.dificultadSugerida, 6);
  });

  test("Rastreo vagamente conocido: dificultad 9, +1 de fatiga y el tiempo de la fila ×2", () => {
    const p = resolverR("rastreo", 2, { nivel: "n2", conocimiento: "vago" });
    assert.equal(p.resolucion.tipo === "tirada" && p.resolucion.dificultad, 9);
    assert.deepEqual(p.economia, { tiempo: "2 minutos" });
    assert.equal(coste("rastreo", p), 3);
  });

  test("Rastreo desconocido: dificultad 12, +4 de fatiga y ×10 (1 hora → 10 horas)", () => {
    const p = resolverR("rastreo", 6, { nivel: "n6", conocimiento: "desconocido" });
    assert.equal(p.resolucion.tipo === "tirada" && p.resolucion.dificultad, 12);
    assert.deepEqual(p.economia, { tiempo: "10 horas" });
    assert.equal(coste("rastreo", p), 12);
    assert.deepEqual(resolverR("rastreo", 4, { nivel: "n4", conocimiento: "desconocido" }).economia, { tiempo: "100 minutos" });
  });

  test("Rastreo en local con ×2: el tiempo va como nota (una acción no se multiplica)", () => {
    const p = resolverR("rastreo", 1, { conocimiento: "vago" });
    assert.equal(p.economia, "estandar");
    assert.ok(p.notas.some((n) => n.texto.includes("Tarda 2 veces lo normal (2 × acción estándar)")));
    assert.equal(coste("rastreo", p), 2);
  });

  test("objetivo sintético: Tecnociencia (Informática)", () => {
    const p = resolverR("rastreo", 1, { receptor: "sintetico" });
    assert.equal(p.resolucion.tipo !== "sin_dado" && p.resolucion.habilidad, "tecnociencia");
    let s = defaultSheet();
    s = { ...s, habilidades: { ...s.habilidades, tecnociencia: { valor: 2, especialidades: ["Informática"] } } };
    assert.equal(enEspecialidadDePoder(s, p), true);
    const b = resolverR("superar_barrera", 1, { receptor: "sintetico" });
    assert.equal(b.resolucion.tipo !== "sin_dado" && b.resolucion.habilidad, "tecnociencia");
  });

  test("Mensaje agresivo: preselecciona la habilidad más alta y deja elegir la otra", () => {
    const alta = resolverR("mensaje_agresivo", 1, {}, { biociencia: 1, actitud: 3 });
    assert.deepEqual(alta.habilidadesAElegir, ["biociencia", "actitud"]);
    assert.equal(alta.resolucion.tipo === "enfrentada" && alta.resolucion.habilidad, "actitud");
    assert.equal(alta.elecciones.habilidad, "actitud");
    const pedida = resolverR("mensaje_agresivo", 1, { habilidad: "biociencia" }, { biociencia: 1, actitud: 3 });
    assert.equal(pedida.resolucion.tipo === "enfrentada" && pedida.resolucion.habilidad, "biociencia");
    assert.equal(tiradaDePoder(accionR("mensaje_agresivo"), pedida)!.habilidad, "biociencia");
    // Sin ficha (empate): la primera.
    const sin = resolverR("mensaje_agresivo", 1);
    assert.equal(sin.resolucion.tipo === "enfrentada" && sin.resolucion.habilidad, "biociencia");
  });

  test("Mensaje agresivo: compleja, 1 de fatiga en local, 1 de daño mental propio, grados por nivel empleado", () => {
    const p = resolverR("mensaje_agresivo", 1);
    assert.equal(p.economia, "compleja");
    assert.equal(coste("mensaje_agresivo", p), 1);
    assert.deepEqual(p.danioPropio, { valor: 1, categoria: "mental" });
    assert.equal(resolverR("mensaje_agresivo", 2).economia, "estandar");
    const n3 = resolverR("mensaje_agresivo", 3, { nivel: "n3" });
    assert.equal(n3.resultados.critico!.texto, "Confusión tantos turnos como nivel empleado (3) y 3 de daño mental");
    assert.equal(n3.resultados.exito!.texto, "Confusión durante 1 turno");
    assert.equal(textoDeGrado(tiradaDePoder(accionR("mensaje_agresivo"), n3)!.poder!.resultados, "fracasoCritico"), "Sin efecto");
  });

  test("Leer Mente: enfrentada Perspicacia + Biociencia, estándar, 1 de fatiga y cuatro grados", () => {
    const p = resolverR("leer_mente", 1);
    assert.deepEqual(p.resolucion, { tipo: "enfrentada", aplicado: "perspicacia", habilidad: "biociencia" });
    assert.equal(p.economia, "estandar");
    assert.equal(coste("leer_mente", p), 1);
    assert.deepEqual(Object.keys(p.resultados).sort(), ["critico", "exito", "fracaso", "fracasoCritico"]);
    assert.match(p.resultados.fracaso!.texto, /1 turno/);
  });

  test("Superar la barrera: sin coste, va con la Sincronía", () => {
    const p = resolverR("superar_barrera", 1);
    assert.equal(coste("superar_barrera", p), 0);
    assert.deepEqual(p.economia, { tiempo: "con la Sincronía" });
    assert.equal(p.resultados.fracaso!.texto, "El mensaje llega, pero no se entiende");
  });

  test("Resonancia aparece en Acciones con sus acciones", () => {
    const s = setNivelDisciplinaTest(defaultSheet(), 1);
    const ids = accionesDePsionica(s).filter((p) => p.disciplina.id === "resonancia").map((p) => p.accion.id);
    assert.deepEqual(ids, [
      "psi_resonancia_sincronia",
      "psi_resonancia_mensaje_agresivo",
      "psi_resonancia_superar_barrera",
      "psi_resonancia_rastreo",
      "psi_resonancia_leer_mente",
      "psi_resonancia_alerta_pasiva",
      "psi_resonancia_alerta_activa",
      "psi_resonancia_vinculo",
    ]);
  });
});

describe("Resonancia — tanda 2", () => {
  const RES = disciplinaPorId("resonancia");
  const accionR = (id: string) => RES.acciones.find((a) => a.id === `psi_resonancia_${id}`)!;
  const resolverR = (id: string, nivelPoseido: number, elecciones: Record<string, string> = {}) =>
    resolverPoder(accionR(id), { nivelPoseido, elecciones, disciplina: RES })!;
  const coste = (id: string, p: ReturnType<typeof resolverR>) => costeFatiga(RES, `psi_resonancia_${id}`, p).total;

  test("Alerta pasiva: Perspicacia + Biociencia dif 6, sin fatiga, 20 m × nivel poseído", () => {
    const p = resolverR("alerta_pasiva", 3);
    assert.deepEqual(p.resolucion, { tipo: "tirada", aplicado: "perspicacia", habilidad: "biociencia", dificultad: 6 });
    assert.equal(coste("alerta_pasiva", p), 0);
    assert.equal(p.alcance, 60);
    assert.equal(tiradaDePoder(accionR("alerta_pasiva"), p)!.dificultadSugerida, 6);
    const s = resolverR("alerta_pasiva", 1, { receptor: "sintetico" });
    assert.equal(s.resolucion.tipo === "tirada" && s.resolucion.habilidad, "tecnociencia");
  });

  test("Alerta activa: estándar, 1 de fatiga, 1 km², dif 8, sin rebajas de la tabla en ningún nivel", () => {
    for (let n = 1; n <= 6; n++) {
      const p = resolverR("alerta_activa", n);
      assert.equal(p.economia, "estandar", `nivel ${n}`);
      assert.equal(coste("alerta_activa", p), 1, `nivel ${n}`);
      assert.equal(p.alcance, 1);
      assert.equal(p.resolucion.tipo === "tirada" && p.resolucion.dificultad, 8);
    }
  });

  test("desde Resonancia 4: ventaja y casilla +2 en las dos Alertas", () => {
    for (const id of ["alerta_pasiva", "alerta_activa"]) {
      const n3 = tiradaDePoder(accionR(id), resolverR(id, 3))!;
      assert.equal(n3.ventaja, undefined);
      assert.equal(n3.condiciones, undefined);
      const n4 = tiradaDePoder(accionR(id), resolverR(id, 4))!;
      assert.equal(n4.ventaja, "Resonancia 4");
      assert.equal(n4.condiciones!.length, 1);
      const c = n4.condiciones![0];
      assert.equal(c.tipo === "toggle" && c.valorActivo, 2);
    }
    assert.equal(resolverR("leer_mente", 6).ventaja, null);
  });

  test("tirarDado: con ventaja, dos dados y vale el mejor", () => {
    const secuencia = [3, 9];
    const r = tirarDado(true, () => secuencia.shift()!);
    assert.deepEqual(r, { dado: 9, dados: [3, 9] });
    assert.deepEqual(tirarDado(false, () => 5), { dado: 5 });
  });

  test("Vínculo: sin tirada, compleja (estándar desde 4), 1 por aliado, nivel km² y nivel minutos", () => {
    const n3 = resolverR("vinculo", 3);
    assert.equal(n3.resolucion.tipo, "sin_dado");
    assert.equal(n3.economia, "compleja");
    assert.equal(coste("vinculo", n3), 1);
    assert.equal(n3.alcance, 3);
    assert.equal(n3.duracion, 3);
    assert.equal(n3.multiplesObjetivos?.fatigaPorObjetivo, 1);
    assert.equal(resolverR("vinculo", 2).economia, "compleja");
    const n4 = resolverR("vinculo", 4);
    assert.equal(n4.economia, "estandar");
    assert.equal(coste("vinculo", resolverR("vinculo", 6)), 1);
  });
});

function setNivelDisciplinaTest(s: Sheet, nivel: number): Sheet {
  return { ...s, psionica: { ...s.psionica, resonancia: nivel } };
}
