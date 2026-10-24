// E4 (docs/sistema.md §14.8 y §14.10): lo que la especie pone en las tiradas. Casillas
// al mismo índice que el equipo, el −1 a distancia del Arköru, "éxito → crítico", un
// tramo menos de penalizador (Guerrero, Siervo) y los textos sin mecanizar.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ACCIONES, type Accion } from "./acciones";
import { accionesDeAtaque } from "./combate";
import { estadoInicial } from "./condiciones";
import { equipar } from "./equipo";
import { conExtrasDeFicha, resolverFicha, VITALIDAD_DE_FICHA, type FichaResuelta, type VitalidadActual } from "./fichaResuelta";
import { eleccionSinTocar, montarTirada, tirarMontada, type EleccionTirada } from "./montaje";
import { defaultSheet, type Sheet } from "./sheet";
import { ESPECIES, type Rasgo } from "../catalog/especies";

// Mismas cuentas que umbrales.test.ts: vida y fatiga 10 con la ficha entera.
function ficha(patch: Partial<Sheet> = {}): Sheet {
  const d = defaultSheet();
  return {
    ...d,
    atributos: { fuerza: 2, agilidad: 2, aguante: 2, percepcion: 0, inteligencia: 0, caracter: 2 },
    habilidades: { ...d.habilidades, atletismo: { valor: 2, especialidades: [] } },
    vidaActual: 10,
    fatigaActual: 10,
    fatigaTemporal: 0,
    ...patch,
  };
}

const resolver = (s: Sheet, vitalidad: VitalidadActual = VITALIDAD_DE_FICHA, libre = false) =>
  resolverFicha(s, { estados: [], vitalidad, libre });

const ESPECIE: Record<string, Partial<Sheet>> = {
  riux: { especieId: "riux" },
  arianyi: { especieId: "arianyi" },
  arkoru: { especieId: "arkoru" },
  humano: { especieId: "humano" },
  noble: { especieId: "manduk", especieOpciones: { casta: "noble", linaje: "ilkrem" } },
  guerrero: { especieId: "manduk", especieOpciones: { casta: "guerrero" } },
  siervo: { especieId: "manduk", especieOpciones: { casta: "siervo" } },
  irota: { especieId: "manduk", especieOpciones: { casta: "noble", linaje: "irota" } },
  axadren: { especieId: "manduk", especieOpciones: { casta: "noble", linaje: "axadren" } },
  elion: { especieId: "manduk", especieOpciones: { casta: "noble", linaje: "elion" } },
  zimethroni: { especieId: "manduk", especieOpciones: { casta: "noble", linaje: "zimethroni" } },
  ilkrem: { especieId: "manduk", especieOpciones: { casta: "noble", linaje: "ilkrem" } },
};

// La tirada fija tal como la pinta Acciones: con lo que añade la ficha.
const fija = (f: FichaResuelta, id: string): Accion => conExtrasDeFicha(f, ACCIONES.find((a) => a.id === id)!);
const ids = (t: Accion) => (t.condiciones ?? []).map((c) => c.id);

const marcada = (t: Accion, casilla: string): EleccionTirada => ({
  ...eleccionSinTocar(t),
  estadoCondiciones: { ...estadoInicial(t.condiciones ?? []), [casilla]: true },
});

function todosLosRasgos(): Rasgo[] {
  return ESPECIES.flatMap((e) => [
    ...e.rasgos,
    ...(e.castas ?? []).flatMap((c) => c.rasgos),
    ...(e.linajes?.opciones ?? []).flatMap((l) => l.rasgos),
  ]);
}

describe("E4: datos del catálogo", () => {
  test("cada casilla apunta a tiradas fijas que existen", () => {
    const fijas = new Set(ACCIONES.map((a) => a.id));
    for (const r of todosLosRasgos()) {
      for (const c of r.casillas ?? []) {
        for (const id of c.acciones) assert.ok(fijas.has(id), `${r.id}: "${id}" no está en ACCIONES`);
      }
      for (const t of r.textos ?? []) {
        for (const en of t.en) if (en.tipo === "tiradaId") assert.ok(fijas.has(en.id), `${r.id}: "${en.id}" no está en ACCIONES`);
      }
    }
  });

  test("lo construido en E4 declara MotorMetadata construido", () => {
    for (const r of todosLosRasgos()) {
      if (r.casillas?.length) assert.ok(r.motor.some((m) => m.mecanismo === "eleccion_jugador" && m.estado === "construido"), r.id);
      if (r.textos?.length) assert.ok(r.motor.some((m) => m.mecanismo === "nota_fija" && m.estado === "construido"), r.id);
      if (r.ajusteUmbrales) assert.ok(r.motor.some((m) => m.mecanismo === "siempre_activo" && m.estado === "construido"), r.id);
    }
  });

  test("Elión, fallo → fallo crítico: bloqueado hasta que la tirada sepa qué especialidad se usa, sin casilla", () => {
    const elion = ESPECIES.find((e) => e.id === "manduk")!.linajes!.opciones.find((l) => l.id === "elion")!;
    const rigidez = elion.rasgos.find((r) => r.id === "rigidez_narcisista")!;
    assert.equal(rigidez.casillas, undefined);
    assert.ok(rigidez.motor.every((m) => m.estado === "bloqueado" && m.bloqueoPor?.includes("La tirada sabe qué especialidad se usa")));
  });
});

describe("E4: casillas de especie", () => {
  const CASOS: { especie: string; tirada: string; casilla: string; valor: number }[] = [
    { especie: "riux", tirada: "salv_fortaleza", casilla: "especie_piel_irisada_radiacion", valor: 2 },
    { especie: "arkoru", tirada: "salv_fortaleza", casilla: "especie_adaptacion_termica_temperatura", valor: 2 },
    { especie: "arkoru", tirada: "salv_fortaleza", casilla: "especie_sistemas_filtradores_filtracion", valor: 2 },
    { especie: "arkoru", tirada: "atletismo", casilla: "especie_inamovibles_derribo", valor: 2 },
    { especie: "arkoru", tirada: "alerta_activa", casilla: "especie_percepcion_sensorial_visual", valor: -1 },
    { especie: "arianyi", tirada: "alerta_activa", casilla: "especie_empatia_biologica_empatia", valor: 2 },
    { especie: "arianyi", tirada: "medicina", casilla: "especie_empatia_biologica_empatia", valor: 2 },
  ];

  for (const { especie, tirada, casilla, valor } of CASOS) {
    test(`${especie}: «${casilla}» en ${tirada}, ${valor > 0 ? "+" : ""}${valor} al marcarla`, () => {
      assert.ok(!ids(fija(resolver(ficha()), tirada)).includes(casilla), "sin especie no aparece");
      assert.ok(!ids(fija(resolver(ficha(ESPECIE.humano)), tirada)).includes(casilla), "con otra especie no aparece");
      const f = resolver(ficha(ESPECIE[especie]));
      const t = fija(f, tirada);
      assert.ok(ids(t).includes(casilla));
      const sinMarcar = montarTirada(f, t, eleccionSinTocar(t));
      const conMarca = montarTirada(f, t, marcada(t, casilla));
      assert.equal(conMarca.total - sinMarcar.total, valor);
      assert.ok(conMarca.desglose.some((l) => l.valor === valor && l.etiqueta.startsWith("¿")));
    });
  }

  test("Empatía Biológica no está en Convencer / mentir", () => {
    assert.deepEqual(ids(fija(resolver(ficha(ESPECIE.arianyi)), "social")), []);
  });

  test("la casilla sin marcar no mueve la fila (estado inicial apagado)", () => {
    const f = resolver(ficha(ESPECIE.riux));
    const t = fija(f, "salv_fortaleza");
    const sinCasilla = ACCIONES.find((a) => a.id === "salv_fortaleza")!;
    assert.equal(montarTirada(f, t, eleccionSinTocar(t)).total, montarTirada(f, sinCasilla, eleccionSinTocar(sinCasilla)).total);
  });

  test("NPC en modo libre: también le llegan (son derivadas, §14.3)", () => {
    const f = resolver(ficha(ESPECIE.riux), VITALIDAD_DE_FICHA, true);
    assert.ok(ids(fija(f, "salv_fortaleza")).includes("especie_piel_irisada_radiacion"));
  });

  test("conviven con las del equipo, las del equipo primero", () => {
    let s = equipar(ficha(ESPECIE.arkoru), { instanciaId: "arm", catalogoId: "traje_ultra_ligero" });
    s = equipar(s, { instanciaId: "vn", catalogoId: "visor_nocturno", nivel: 2, instaladoEnId: "arm" });
    const t = fija(resolver(s), "alerta_activa");
    assert.deepEqual(ids(t), ["visor_nocturno_n1_activo", "visor_nocturno_n2_activo", "visor_nocturno_cobertura_alerta", "especie_percepcion_sensorial_visual"]);
  });
});

describe("E4: Arköru, −1 en percepción visual (Buscar / percibir = Alerta activa)", () => {
  test("la Alerta pasiva no lo lleva: la misma que sin la casilla", () => {
    const f = resolver(ficha(ESPECIE.arkoru));
    const sinEspecie = resolver(ficha());
    // Arköru no toca Percepción ni Exploración: la pasiva es la misma.
    assert.equal(f.alerta, sinEspecie.alerta);
  });
});

describe("E4: Arköru, −1 fijo en Combate a Distancia (no granadas ni arrojadizas, M8)", () => {
  let s = equipar(ficha(), { instanciaId: "fa", catalogoId: "fusil_asalto_impetus" });
  s = equipar(s, { instanciaId: "lc", catalogoId: "asta_lanza_corta" });
  s = { ...s, granadas: { granada_fragmentacion: 1 } };
  const linea = (f: FichaResuelta, pref: string) => {
    const t = conExtrasDeFicha(f, accionesDeAtaque(f.ficha, f.modificadores, f.extrasDotes.permisos).find((a) => a.id.startsWith(pref))!);
    return montarTirada(f, t, eleccionSinTocar(t)).desglose.find((l) => l.etiqueta === "Arköru" && l.valor === -1);
  };

  test("disparar un arma de fuego: −1 con su línea", () => {
    assert.ok(linea(resolver({ ...s, ...ESPECIE.arkoru }), "ataque_fuego_"));
    assert.equal(linea(resolver(s), "ataque_fuego_"), undefined);
  });

  test("lanzar una granada: sin −1", () => {
    assert.equal(linea(resolver({ ...s, ...ESPECIE.arkoru }), "lanzar_granada_"), undefined);
  });

  test("lanzar un arma arrojadiza: sin −1", () => {
    assert.equal(linea(resolver({ ...s, ...ESPECIE.arkoru }), "lanzar_melee_"), undefined);
  });

  test("ni en Defensa, ni en la Salvación de Reflejos, ni en Iniciativa desenfundando", () => {
    const f = resolver({ ...s, ...ESPECIE.arkoru });
    // iniciativa_arma usa Combate a Distancia, pero no es del grupo Ataques (alcance grupoHabilidad).
    for (const id of ["defensa", "salv_reflejos", "iniciativa_arma"]) {
      const t = fija(f, id);
      assert.ok(!montarTirada(f, t, eleccionSinTocar(t)).desglose.some((l) => l.etiqueta === "Arköru"), id);
    }
  });
});

describe("E4: éxito → crítico (margen de crítico 0 con la casilla)", () => {
  const CASOS = [
    { especie: "noble", tirada: "salv_voluntad", casilla: "especie_contra_miedo_miedo" },
    { especie: "irota", tirada: "salv_fortaleza", casilla: "especie_contra_toxinas_toxinas" },
    { especie: "axadren", tirada: "alerta_activa", casilla: "especie_contra_ocultos_oculto" },
    { especie: "elion", tirada: "salv_voluntad", casilla: "especie_contra_sugestion_sugestion" },
  ];

  for (const { especie, tirada, casilla } of CASOS) {
    test(`${especie}: un éxito justo (margen 0) es crítico con la casilla y no sin ella`, () => {
      const f = resolver(ficha(ESPECIE[especie]));
      const t = fija(f, tirada);
      assert.ok(ids(t).includes(casilla));
      const sin = montarTirada(f, t, eleccionSinTocar(t));
      const con = montarTirada(f, t, marcada(t, casilla));
      assert.equal(con.total, sin.total, "la casilla no suma");
      const dificultad = 6 + con.modificador;
      assert.deepEqual([tirarMontada(con, 6, dificultad).margen, tirarMontada(con, 6, dificultad).critico], [0, true]);
      assert.equal(tirarMontada(sin, 6, dificultad).critico, false);
      // Un fracaso sigue siendo fracaso, no crítico.
      assert.equal(tirarMontada(con, 5, dificultad).critico, false);
    });
  }

  test("solo para su casa: Elión no ve la de miedo del Noble en Voluntad (sí la de sugestión)", () => {
    // Elión es Noble: lleva las dos. Un Guerrero ninguna.
    assert.deepEqual(ids(fija(resolver(ficha(ESPECIE.elion)), "salv_voluntad")), [
      "especie_contra_miedo_miedo",
      "especie_contra_sugestion_sugestion",
    ]);
    assert.deepEqual(ids(fija(resolver(ficha(ESPECIE.guerrero)), "salv_voluntad")), []);
  });
});

describe("E4: un tramo menos de penalizador (Guerrero heridas, Siervo fatiga)", () => {
  const enCombate = (pgActual: number, fatigaActual: number): VitalidadActual => ({
    origen: "combate",
    pgActual,
    pgMax: 10,
    fatigaActual,
    fatigaMax: 10,
  });
  const UMBRALES = /^(Herido|Malherido|Moribundo|Fatigado|Exhausto)/;
  const lineas = (f: FichaResuelta) => {
    const t = ACCIONES.find((a) => a.id === "salv_fortaleza")!;
    return montarTirada(f, t, eleccionSinTocar(t)).desglose.filter((l) => UMBRALES.test(l.etiqueta));
  };

  test("Guerrero Herido: sin línea de penalizador", () => {
    assert.deepEqual(lineas(resolver(ficha(ESPECIE.guerrero), enCombate(4, 10))), []);
  });
  test("Guerrero Malherido: −2", () => {
    assert.deepEqual(lineas(resolver(ficha(ESPECIE.guerrero), enCombate(2, 10))), [
      { etiqueta: "Malherido (Manduk · Guerrero)", valor: -2 },
    ]);
  });
  test("Guerrero Moribundo: −4", () => {
    assert.deepEqual(lineas(resolver(ficha(ESPECIE.guerrero), enCombate(1, 10))), [
      { etiqueta: "Moribundo (Manduk · Guerrero)", valor: -4 },
    ]);
  });
  test("Guerrero no toca la fatiga: Fatigado −1", () => {
    assert.deepEqual(lineas(resolver(ficha(ESPECIE.guerrero), enCombate(10, 2))), [{ etiqueta: "Fatigado", valor: -1 }]);
  });
  test("Siervo Fatigado: sin línea", () => {
    assert.deepEqual(lineas(resolver(ficha(ESPECIE.siervo), enCombate(10, 2))), []);
  });
  test("Siervo Exhausto: −1", () => {
    assert.deepEqual(lineas(resolver(ficha(ESPECIE.siervo), enCombate(10, 1))), [
      { etiqueta: "Exhausto (Manduk · Siervo)", valor: -1 },
    ]);
  });
  test("Siervo no toca las heridas: Herido −1", () => {
    assert.deepEqual(lineas(resolver(ficha(ESPECIE.siervo), enCombate(4, 10))), [{ etiqueta: "Herido", valor: -1 }]);
  });
  test("solo el −N: el Guerrero Malherido sigue a media velocidad", () => {
    const f = resolver(ficha(ESPECIE.guerrero), enCombate(2, 10));
    assert.deepEqual(f.umbrales.movimiento.mediaVelocidad, ["Malherido"]);
  });
});

describe("E4: textos sin mecanizar, solo con su rasgo", () => {
  test("Zimethroni: dos notas en Defensa", () => {
    const nota = fija(resolver(ficha(ESPECIE.zimethroni)), "defensa").nota!;
    assert.match(nota, /una casilla de movimiento gratis/);
    assert.match(nota, /\+1 al daño recibido por cada 4 niveles/);
    assert.equal(fija(resolver(ficha()), "defensa").nota, ACCIONES.find((a) => a.id === "defensa")!.nota);
  });

  test("Ílkrem: aturdimiento con plasma o fuego, en la Salvación de Fortaleza", () => {
    assert.match(fija(resolver(ficha(ESPECIE.ilkrem)), "salv_fortaleza").nota!, /plasma o fuego.*Falla metabólica · Casa de Ílkrem/);
    assert.doesNotMatch(fija(resolver(ficha(ESPECIE.irota)), "salv_fortaleza").nota!, /plasma o fuego/);
  });

  test("Arköru: crítico desarmado letal en toda la Pelea (Codazo o Rodillazo incluido), no en armas", () => {
    let s = equipar(ficha(ESPECIE.arkoru), { instanciaId: "pu", catalogoId: "pelea_punetazo" });
    s = equipar(s, { instanciaId: "pa", catalogoId: "pelea_patada" });
    s = equipar(s, { instanciaId: "co", catalogoId: "pelea_codazo_rodillazo" });
    s = equipar(s, { instanciaId: "el", catalogoId: "espada_ligera" });
    const ataques = (f: FichaResuelta) => accionesDeAtaque(f.ficha, f.modificadores, f.extrasDotes.permisos).map((t) => conExtrasDeFicha(f, t));
    const critico = (f: FichaResuelta, label: string) => ataques(f).find((t) => t.label === label)!.efectoCritico;
    const f = resolver(s);
    // El crítico propio del arma (Aturdimiento) va delante; la especie lo completa.
    const letal = "Aturdimiento (6) · Daño letal. (Matriz Biometálica · Arköru)";
    assert.equal(critico(f, "Golpear con Puñetazo"), letal);
    assert.equal(critico(f, "Golpear con Patada"), letal);
    assert.equal(critico(f, "Golpear con Codazo o Rodillazo"), letal);
    assert.doesNotMatch(critico(f, "Golpear con Espada Ligera") ?? "", /letal/);
    assert.equal(critico(resolver({ ...s, especieId: "humano" }), "Golpear con Puñetazo"), "Aturdimiento (6)");
  });

  // Una tirada no física: en las físicas sale siempre «Bajo Ultra Estimulante» (S94).
  test("sin especie, conExtrasDeFicha devuelve la misma tirada", () => {
    const t = ACCIONES.find((a) => a.id === "discernir_mentiras")!;
    assert.equal(conExtrasDeFicha(resolver(ficha()), t), t);
  });
});
