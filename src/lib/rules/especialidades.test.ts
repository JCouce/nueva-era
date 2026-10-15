// Tanda ESP: catálogo de especialidades, especialidad por arma y migración a ids.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultSheet, parseSheet, SCHEMA_VERSION, type Sheet } from "./sheet";
import { migrar } from "./migraciones";
import { equipar } from "./equipo";
import { ajustarGranada } from "./recursos";
import { accionesDeAtaque } from "./combate";
import { modificadoresActivos } from "./derivados";
import { permisosDeDotes } from "./dotesEfectos";
import { eleccionSinTocar, montarTirada } from "./montaje";
import { HABILIDADES } from "./habilidades";
import type { Accion } from "./acciones";
import {
  ESPECIALIDADES,
  ESPECIALIDADES_ARMA,
  admiteEspecialidades,
  esEspecialidadDe,
  especialidadPorNombre,
  especialidadesDe,
  type EspecialidadId,
} from "../catalog/especialidades";
import { ESPECIALIDAD_ARMA, especialidadArmaFuego } from "../catalog/especialidadesArma";
import { ARMAS } from "../catalog/armasFuego";
import { ARMAS_MELEE } from "../catalog/armasMelee";
import { ARMAMENTO_PESADO } from "../catalog/armamentoPesado";
import { MUNICION_GRANADA } from "../catalog/municion";

describe("catálogo de especialidades", () => {
  test("ids únicos, snake_case sin tildes, y de una habilidad que existe", () => {
    const ids = ESPECIALIDADES.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const e of ESPECIALIDADES) {
      assert.match(e.id, /^[a-z][a-z_]*$/, e.id);
      assert.ok(HABILIDADES.some((h) => h.id === e.habilidad), e.id);
    }
  });

  test("recuento por habilidad de docs/fuente/habilidades.md; Interpretación y Sigilo sin lista", () => {
    const n = Object.fromEntries(HABILIDADES.map((h) => [h.id, especialidadesDe(h.id).length]));
    assert.deepEqual(n, {
      actitud: 6,
      atletismo: 8,
      biociencia: 5,
      combate_distancia: 5,
      combate_melee: 6,
      cultura: 4,
      interpretacion: 0,
      sigilo: 0,
      exploracion: 3,
      tecnociencia: 5,
    });
    assert.equal(admiteEspecialidades("sigilo"), false);
    assert.equal(admiteEspecialidades("interpretacion"), false);
  });

  test("especialidades de arma: las de Combate Melee y Combate a Distancia", () => {
    assert.equal(ESPECIALIDADES_ARMA.length, 11);
    assert.ok(ESPECIALIDADES_ARMA.every((e) => e.habilidad === "combate_melee" || e.habilidad === "combate_distancia"));
  });

  test("casar texto escrito a mano: sin tildes ni mayúsculas, singular/plural, solo en su habilidad", () => {
    assert.equal(especialidadPorNombre("biociencia", " INGENIERÍA genetica ")?.id, "ingenieria_genetica");
    assert.equal(especialidadPorNombre("combate_distancia", "Armas de Fuego Larga")?.id, "armas_de_fuego_largas");
    assert.equal(especialidadPorNombre("combate_melee", "Escudo")?.id, "escudos");
    assert.equal(especialidadPorNombre("tecnociencia", "Biónica"), undefined);
    assert.equal(especialidadPorNombre("exploracion", "Rastreo"), undefined); // es una acción, no especialidad
  });
});

// ── Especialidad por arma ─────────────────────────────────────────────────

// Todas las filas de ataque que genera el catálogo: cada arma sola, más la bayoneta, el
// lanzagranadas integrado, el Proyector de Pulso y las granadas.
function todosLosAtaques(): Accion[] {
  const filas: Accion[] = [];
  const conGranadas = (s: Sheet) => MUNICION_GRANADA.reduce((x, g) => ajustarGranada(x, g.id, 1), s);
  for (const arma of [...ARMAS, ...ARMAS_MELEE, ...ARMAMENTO_PESADO]) {
    const s = conGranadas(equipar(defaultSheet(), { instanciaId: "x", catalogoId: arma.id }));
    filas.push(...accionesDeAtaque(s, modificadoresActivos(s), permisosDeDotes(s)));
  }
  let s = equipar(defaultSheet(), { instanciaId: "f", catalogoId: "fusil_asalto_impetus" });
  s = equipar(s, { instanciaId: "b", catalogoId: "bayoneta", nivel: 1, instaladoEnId: "f" });
  s = conGranadas(equipar(s, { instanciaId: "l", catalogoId: "lanzagranadas_integrado", nivel: 1, instaladoEnId: "f" }));
  s = equipar(s, { instanciaId: "a", catalogoId: "armadura_pesada" });
  s = equipar(s, { instanciaId: "pp", catalogoId: "proyector_pulso", nivel: 1, instaladoEnId: "a" });
  filas.push(...accionesDeAtaque(s, modificadoresActivos(s), permisosDeDotes(s)));
  return filas;
}

describe("especialidad de cada arma (catalog/especialidadesArma.ts)", () => {
  test("la tabla cubre exactamente las armas del catálogo", () => {
    const ids = [...ARMAS, ...ARMAS_MELEE, ...ARMAMENTO_PESADO].map((a) => a.id).sort();
    assert.deepEqual(Object.keys(ESPECIALIDAD_ARMA).sort(), ids);
  });

  test("armas de fuego por empleo (S44): da lo mismo que la tabla de ESP (pistolas cortas, el resto largas)", () => {
    for (const a of ARMAS) {
      assert.equal(ESPECIALIDAD_ARMA[a.id], a.tipo === "pistola" ? "armas_de_fuego_cortas" : "armas_de_fuego_largas", a.id);
      assert.equal(ESPECIALIDAD_ARMA[a.id], especialidadArmaFuego(a), a.id);
    }
    // Subfusiles a dos manos y ametralladoras: largas.
    assert.ok(ARMAS.filter((a) => a.tipo === "subfusil" || a.tipo === "ametralladora").every((a) => a.empleo === "dos manos"));
  });

  test("toda fila de ataque con arma lleva una especialidad de la habilidad con la que ataca", () => {
    const ataques = todosLosAtaques().filter((t) => t.grupo === "Ataques");
    // Que estén las piezas especiales (si no, el test no prueba nada de ellas).
    for (const prefijo of ["golpear_bayoneta_", "lanzagranadas_", "ataque_proyector_pulso_aguijon_", "lanzar_granada_", "lanzar_melee_", "ataque_pesado_"]) {
      assert.ok(ataques.some((t) => t.id.startsWith(prefijo)), prefijo);
    }
    for (const t of ataques) {
      // Única excepción, a propósito: el Proyector de Pulso con Tecnociencia (TODO en combate.ts).
      if (t.id.startsWith("ataque_proyector_pulso_tecnociencia_")) {
        assert.equal(t.especialidadArma, undefined, t.id);
        continue;
      }
      assert.ok(t.especialidadArma, `${t.id} sin especialidad`);
      assert.ok(t.habilidad && esEspecialidadDe(t.habilidad, t.especialidadArma), `${t.id}: ${t.especialidadArma} no es de ${t.habilidad}`);
    }
  });
});

describe("ataque con arma: en especialidad sola, sin selector", () => {
  const conEspada = (especialidades: EspecialidadId[]): Sheet => {
    const s = defaultSheet();
    return equipar(
      { ...s, habilidades: { ...s.habilidades, combate_melee: { valor: 4, especialidades } } },
      { instanciaId: "e", catalogoId: "espada" },
    );
  };
  const montar = (s: Sheet, elegido: boolean) => {
    const t = accionesDeAtaque(s, modificadoresActivos(s), permisosDeDotes(s)).find((x) => x.id === "ataque_melee_e")!;
    return montarTirada({ ficha: s, modificadores: modificadoresActivos(s) }, t, eleccionSinTocar(t, elegido));
  };

  test("con la especialidad del arma: valor entero, sin tocar nada", () => {
    const m = montar(conEspada(["espadas_y_dagas"]), false);
    assert.equal(m.habilidad?.valor, 4);
    assert.equal(m.enEspecialidad, true);
    assert.deepEqual(m.especialidadArma, { id: "espadas_y_dagas", label: "Espadas y Dagas", tiene: true });
  });

  test("sin ella: la mitad redondeando arriba, aunque la fila dijera que sí", () => {
    const m = montar(conEspada(["pelea"]), true);
    assert.equal(m.habilidad?.valor, 2);
    assert.equal(m.enEspecialidad, false);
    assert.equal(m.especialidadArma?.tiene, false);
  });

  test("lanzar una granada usa Lanzamiento (Atletismo)", () => {
    let s = defaultSheet();
    s = ajustarGranada({ ...s, habilidades: { ...s.habilidades, atletismo: { valor: 3, especialidades: ["lanzamiento"] } } }, MUNICION_GRANADA[0].id, 1);
    const t = accionesDeAtaque(s, modificadoresActivos(s), permisosDeDotes(s)).find((x) => x.id.startsWith("lanzar_granada_"))!;
    const m = montarTirada({ ficha: s, modificadores: modificadoresActivos(s) }, t, eleccionSinTocar(t, false));
    assert.equal(m.habilidad?.valor, 3);
  });
});

// ── Migración v16 → v17 ─────────────────────────────────────────────────

describe("migración v16 → v17: especialidades de texto a ids", () => {
  test("casa por nombre en su habilidad; lo que no casa va al aviso", () => {
    const { ficha } = migrar(
      {
        schemaVersion: 16,
        habilidades: {
          biociencia: { valor: 2, especialidades: ["Medicina", "medicina", "Química"] },
          tecnociencia: { valor: 2, especialidades: ["Física", "Biónica"] },
          sigilo: { valor: 1, especialidades: ["Urbano"] },
          combate_distancia: { valor: 1, especialidades: ["Armas de Fuego Larga"] },
        },
      },
      17,
    );
    const h = ficha.habilidades as Record<string, { especialidades: string[] }>;
    assert.deepEqual(h.biociencia.especialidades, ["medicina"]);
    assert.deepEqual(h.tecnociencia.especialidades, ["fisica"]);
    assert.deepEqual(h.sigilo.especialidades, []);
    assert.deepEqual(h.combate_distancia.especialidades, ["armas_de_fuego_largas"]);
    assert.deepEqual(ficha.avisoEspecialidades, ["Biociencia: Química", "Sigilo: Urbano", "Tecnociencia: Biónica"]);
    assert.equal(ficha.schemaVersion, 17);
  });

  test("Crítico Mejorado: la elección casa con una especialidad de arma o la dote se quita", () => {
    const { ficha } = migrar(
      {
        schemaVersion: 16,
        dotes: [
          { id: "dote_critico_mejorado", eleccion: "Espadas y dagas" },
          { id: "dote_bloqueo" },
        ],
      },
      17,
    );
    assert.deepEqual(ficha.dotes, [{ id: "dote_critico_mejorado", eleccion: "espadas_y_dagas" }, { id: "dote_bloqueo" }]);
    const otra = migrar({ schemaVersion: 16, dotes: [{ id: "dote_critico_mejorado", eleccion: "Rifles" }] }, 17).ficha;
    assert.deepEqual(otra.dotes, []);
    assert.deepEqual(otra.avisoEspecialidades, ["Crítico Mejorado: Rifles (dote quitada)"]);
  });

  test("parseSheet de una ficha v16 sale al día y valida", () => {
    const s = parseSheet({ schemaVersion: 16, habilidades: { actitud: { valor: 2, especialidades: ["Empatía", "Seducción"] } } });
    assert.equal(s.schemaVersion, SCHEMA_VERSION);
    assert.deepEqual(s.habilidades.actitud.especialidades, ["empatia"]);
    assert.deepEqual(s.avisoEspecialidades, ["Actitud: Seducción"]);
  });
});
