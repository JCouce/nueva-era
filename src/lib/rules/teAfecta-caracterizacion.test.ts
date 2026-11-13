// Caracterización de "te afecta" (docs/aportes/plan.md, fase 2): lo que enseñaba la hoja de
// tirada del árbol (HojaTirada, ArbolHabilidades.tsx) ANTES de que el origen de cada aporte
// fuera un dato. Las tiradas se montan como las montaba AccionesTab.tsx (citado por líneas) y
// los esperados se fijaron con el teAfecta de entonces (regex sobre etiquetas y caché de
// módulo). Si un esperado cambia, es un bug, no un ajuste.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ACCIONES, elegirEspecialidad, usarHabilidadAlternativa, type Accion } from "./acciones";
import { accionesDeAtaque } from "./combate";
import { equipar } from "./equipo";
import { accionesDeFarmacos } from "./farmacos";
import { accionesDeHerramientas } from "./herramientas";
import { accionesDeMovimiento, conEsquivaEnVuelo } from "./movimiento";
import { conExtrasDeFicha, resolverFicha, tiradaFijaVisible, VITALIDAD_DE_FICHA, type FichaResuelta } from "./fichaResuelta";
import { eleccionSinTocar, montarTirada } from "./montaje";
import { conEsquivaLevitando, conPsionicaEnTiradaFija } from "./poderes";
import { defaultSheet, type Sheet } from "./sheet";
import { teAfecta } from "./teAfecta";

// --- Fichas ---------------------------------------------------------------------

const base = (patch: Partial<Sheet> = {}): Sheet => {
  const s = defaultSheet();
  return {
    ...s,
    atributos: { fuerza: 2, agilidad: 2, aguante: 1, percepcion: 1, inteligencia: 1, caracter: 1 },
    habilidades: {
      ...s.habilidades,
      atletismo: { valor: 3, especialidades: [] },
      exploracion: { valor: 3, especialidades: ["supervivencia"] },
      combate_distancia: { valor: 3, especialidades: [] },
      combate_melee: { valor: 3, especialidades: [] },
      biociencia: { valor: 3, especialidades: ["medicina"] },
      tecnociencia: { valor: 2, especialidades: [] },
      sigilo: { valor: 2, especialidades: [] },
      percepcion: { valor: 2, especialidades: [] },
      social: { valor: 2, especialidades: [] },
    } as Sheet["habilidades"],
    vidaActual: 10,
    fatigaActual: 10,
    ...patch,
  };
};

// Los aumentos tienen su propia compra (compraAumento): aquí van directos al equipo, como en
// aumentosTiradas.test.ts.
let n = 0;
const conAumento = (s: Sheet, catalogoId: string, extra: { nivel?: number; eleccion?: string } = {}): Sheet => ({
  ...s,
  equipo: [...s.equipo, { instanciaId: `aum${++n}`, catalogoId, ...extra }],
});

// Arma de fuego con mejoras (Lanzagranadas: ajuste fijo; Mira: bono por tramo; Retroceso:
// alcance por modo; Puntero Láser, Silenciador) y munición especial; armadura con Visor
// Nocturno (casilla con alcance); Gran Puntería (selector «Apuntado») y Crítico Mejorado.
const fuego = (): Sheet => {
  let s = base({ municionEspecial: { incendiaria: 10, perforante: 10 } });
  s = equipar(s, { instanciaId: "arm", catalogoId: "traje_ultra_ligero" });
  s = equipar(s, { instanciaId: "vn", catalogoId: "visor_nocturno", nivel: 2, instaladoEnId: "arm" });
  s = equipar(s, { instanciaId: "fa", catalogoId: "fusil_asalto_impetus" });
  s = equipar(s, { instanciaId: "lg", catalogoId: "lanzagranadas_integrado", nivel: 1, instaladoEnId: "fa" });
  s = equipar(s, { instanciaId: "mt", catalogoId: "mira_telescopica", nivel: 3, instaladoEnId: "fa" });
  s = equipar(s, { instanciaId: "sr", catalogoId: "sistema_retroceso", nivel: 1, instaladoEnId: "fa" });
  s = equipar(s, { instanciaId: "pl", catalogoId: "puntero_laser", nivel: 1, instaladoEnId: "fa" });
  s = equipar(s, { instanciaId: "si", catalogoId: "silenciador", nivel: 1, instaladoEnId: "fa" });
  // Mira de nivel 3 sobre la integrada: su fuente lleva aclaración en minúscula.
  s = equipar(s, { instanciaId: "fp", catalogoId: "fusil_precision_telum" });
  s = equipar(s, { instanciaId: "mp", catalogoId: "mira_telescopica", nivel: 3, instaladoEnId: "fp" });
  return { ...s, dotes: [{ id: "dote_gran_punteria" }, { id: "dote_critico_mejorado", eleccion: "fusiles_de_asalto" }] };
};

// Melee con Sutil (Combate Sutil), Bloqueo, Golpe Fatigante y Reflejos Felinos (descuento en
// «Atacantes adicionales»).
const melee = (): Sheet => {
  let s = base();
  s = equipar(s, { instanciaId: "pu", catalogoId: "pelea_punetazo" });
  s = equipar(s, { instanciaId: "to", catalogoId: "corta_tonfa_porra" });
  // Escudo: ajuste de bloqueo con aclaración «(bloqueo)».
  s = equipar(s, { instanciaId: "es", catalogoId: "escudo_estandar" });
  return {
    ...s,
    dotes: [
      { id: "dote_combate_sutil" },
      { id: "dote_bloqueo" },
      { id: "dote_golpe_fatigante" },
      { id: "dote_reflejos_felinos" },
    ],
  };
};

// Dotes con casilla de especialidad (Bioma Predilecto, Ojo Clínico, Especialidad Médica),
// Cazador Cazado y Vigilancia Táctica (habilidad alternativa), Velocista, Presencia Imponente,
// Negociación Analítica, Traicionero.
const dotes = (): Sheet => ({
  ...base(),
  dotes: [
    { id: "dote_bioma_predilecto", eleccion: "Selva densa" },
    { id: "dote_ojo_clinico" },
    { id: "dote_especialidad_medica", eleccion: "ceguera_sordera" },
    { id: "dote_cazador_cazado" },
    { id: "dote_vigilancia_tactica" },
    { id: "dote_velocista" },
    { id: "dote_presencia_imponente" },
    { id: "dote_negociacion_analitica" },
    { id: "dote_traicionero" },
  ],
});

// Aumentos: casillas por escena (Mielinización, Matriz de Red, Proyección), ventaja fija (Red
// Frontoparietal), bono por tramo con «Apuntado» (Foveo), Brazo Biónico (extremidad), Ojo
// Biónico; con un fusil para que lleguen a un ataque. Una casilla por escena ya gastada.
const aumentos = (): Sheet => {
  let s = base();
  s = equipar(s, { instanciaId: "fa", catalogoId: "fusil_asalto_impetus" });
  s = equipar(s, { instanciaId: "pu", catalogoId: "pelea_punetazo" });
  for (const id of [
    "aum_mielinizacion_central",
    "aum_mielinizacion_ahorro",
    "aum_regulacion_limbico_prefrontal",
    "aum_proyeccion_neuro_expresiva",
    "aum_proyeccion_lenguaje",
    "aum_matriz_de_red_predeterminada",
    "aum_matriz_red_repetir",
    "aum_red_frontoparietal",
    "aum_optimizacion_foveo_sensorial",
    "aum_brazo_bionico",
    "aum_prefrontal_aumentada",
    "aum_prefrontal_concentrarse",
    "aum_vestibulo_auditiva",
    "aum_vestibulo_auditiva_rastreo",
    "aum_introgresion_ultravioleta_investigacion",
  ])
    s = conAumento(s, id);
  s = conAumento(s, "aum_ojo_bionico", { nivel: 3 });
  return { ...s, usosEscena: ["aum_matriz_red_repetir"] };
};

// Especies con texto en tirada, casillas, fallo crítico fijo y modificador a distancia.
const especie = (especieId: string, especieOpciones?: Sheet["especieOpciones"]): Sheet => {
  let s = base({ especieId, ...(especieOpciones && { especieOpciones }) });
  s = equipar(s, { instanciaId: "fa", catalogoId: "fusil_asalto_impetus" });
  s = equipar(s, { instanciaId: "pu", catalogoId: "pelea_punetazo" });
  return s;
};

// Fuente psiónica (au-04, T6a): el Implante de Resonancia Métrica 4, sin modificadores y sin
// sobreesfuerzo mientras no esté fatigado.
const IRM_4 = { instanciaId: "irm", catalogoId: "aum_implante_de_resonancia_metrica", nivel: 4 };
// Poderes con tirada que tocan las fijas (psiónica en la tirada, esquiva levitando).
const psionica = (): Sheet => ({ ...base(), psionica: { resonancia: 4, induccion: 3, traslacion: 3, singularidad: 2 }, equipo: [IRM_4] });

// Fármacos (y la casilla «Bajo Ultra Estimulante», que tiene cualquier ficha).
const farmacos = (): Sheet => ({
  ...base({ especieId: "manduk", especieOpciones: { casta: "noble", linaje: "irota" } }),
  farmacos: { farmaco_analgesico: 1, farmaco_ultra_estimulante: 1, farmaco_xovromium: 1, farmaco_hemostaticos: 1 },
});

// --- Las hojas del árbol, como AccionesTab ---------------------------------------

// AccionesTab.tsx:808-841 (generadas con conExtras), 842-858 (dotes y aumentos con
// conExtrasDeFicha) y 1396-1398 (fijas visibles, con psiónica y esquiva levitando/en vuelo).
function tiradasDeLaPestana(ficha: FichaResuelta): Accion[] {
  const sheet = ficha.ficha;
  const niveles = ficha.psionica.paraEfectos;
  const conExtras = (t: Accion) => conExtrasDeFicha(ficha, t);
  const fijas = ACCIONES.filter((t) => tiradaFijaVisible(ficha, t))
    .map(conExtras)
    .map((t) => conPsionicaEnTiradaFija(niveles, conEsquivaEnVuelo(sheet, conEsquivaLevitando(niveles, t))));
  return [
    ...fijas,
    ...accionesDeAtaque(sheet, ficha.modificadores, ficha.extrasDotes.permisos).map(conExtras),
    ...accionesDeMovimiento(sheet).map(conExtras),
    ...accionesDeHerramientas(sheet).map(conExtras),
    ...accionesDeFarmacos(sheet, ficha.notasFarmacos).map(conExtras),
    ...ficha.accionesDotes.tiradas.map(conExtras),
    ...ficha.accionesAumentos.filas.flatMap((f) => (f.tipo === "tirada" ? [conExtras(f.accion)] : [])),
  ];
}

// AccionesTab.tsx:1404 (aBasicas): al árbol, lo que tiene habilidad y no es salvación.
const alArbol = (t: Accion) => !(t.habilidad === null || t.grupo === "Salvaciones");

// HojaTirada (ArbolHabilidades.tsx:318-331): Sutil preseleccionado por el aplicado que dé más,
// habilidad alternativa y especialidad a elegir, cada una como la deja el jugador al pulsarla.
function afecta(ficha: FichaResuelta): Record<string, string[]> {
  const salida: Record<string, string[]> = {};
  const apunta = (clave: string, efectiva: Accion, sutil: boolean) => {
    const montada = montarTirada(ficha, efectiva, eleccionSinTocar(efectiva, sutil));
    const nombres = teAfecta(ficha, efectiva, montada);
    if (nombres.length > 0) salida[clave] = nombres;
  };
  for (const t of tiradasDeLaPestana(ficha).filter(alArbol)) {
    const sutilInicial = t.aplicadoSutil ? ficha.aplicados[t.aplicadoSutil] > ficha.aplicados[t.aplicado] : false;
    apunta(t.id, t, sutilInicial);
    if (t.aplicadoSutil) apunta(`${t.id}+sutil:${!sutilInicial}`, t, !sutilInicial);
    const alternativa = usarHabilidadAlternativa(t);
    if (alternativa) apunta(`${t.id}+alternativa`, alternativa, false);
    for (const e of t.especialidadAElegir ?? []) apunta(`${t.id}+${e}`, elegirEspecialidad(t, e), false);
  }
  return salida;
}

const resolver = (s: Sheet, libre = false) => resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA, libre });

const FICHAS: Record<string, () => FichaResuelta> = {
  vacia: () => resolver(base()),
  fuego: () => resolver(fuego(), true),
  melee: () => resolver(melee(), true),
  dotes: () => resolver(dotes(), true),
  aumentos: () => resolver(aumentos(), true),
  axadren: () => resolver(especie("manduk", { casta: "noble", linaje: "axadren" })),
  zimethroni: () => resolver(especie("manduk", { casta: "noble", linaje: "zimethroni" })),
  elion: () => resolver(especie("manduk", { casta: "noble", linaje: "elion" })),
  arkoru: () => resolver(especie("arkoru")),
  riux: () => resolver(especie("riux")),
  psionica: () => resolver(psionica()),
  farmacos: () => resolver(farmacos()),
};

// --- Esperados (fijados con el teAfecta de antes de la fase 2) ----------------------

// Actualizados por decisión del usuario (2026-10-28, fase 2): "te afecta" enseña el nombre del
// ítem (OrigenAporte.label), uno por ítem. Cambiaron solo los nombres que el regex sacaba mal o
// de forma desigual: etiquetas de casilla («Ahorro de fatiga · Mielinización Central» →
// «Mielinización Central», «+2 por Resonancia 4» → «Resonancia», «Levitando: Física» →
// «Traslación»), niveles («Mira Telescópica 3», «Ojo Biónico 3» → sin número, y el Ojo Biónico
// repetido en uno) y la especie, que ahora es el nombre del rasgo («Arköru» → «Percepción
// sensorial», «Tras esquivar · Casa de Zimethroni» → «Tras esquivar»). Ninguna tirada ganó ni
// perdió ítems.

const ESPERADO: Record<string, Record<string, string[]>> = {
  vacia: {},
  fuego: {
    "alerta_activa": ["Visor Nocturno", "Mira Telescópica"],
    "apuntar": ["Gran Puntería"],
    "ataque_fuego_fa": ["Crítico Mejorado: Fusiles de Asalto", "Mira Telescópica", "Sistema de Retroceso", "Visor Nocturno", "Gran Puntería", "Lanzagranadas Integrado"],
    "ataque_fuego_fp": ["Mira Telescópica", "Visor Nocturno", "Gran Puntería"],
  },
  melee: {
    "defensa": ["Reflejos Felinos"],
    "ataque_melee_pu": ["Golpe Fatigante"],
    "ataque_melee_pu+sutil:true": ["Golpe Fatigante"],
    "bloquear_melee_pu": ["Bloqueo"],
    "bloquear_melee_pu+sutil:true": ["Bloqueo"],
    "ataque_melee_to": ["Golpe Fatigante"],
    "bloquear_melee_to": ["Bloqueo"],
    "ataque_melee_es": ["Golpe Fatigante"],
    "bloquear_melee_es": ["Bloqueo"],
  },
  dotes: {
    "iniciativa_arma": ["Vigilancia Táctica", "Bioma Predilecto: Selva densa"],
    "iniciativa_distraccion": ["Vigilancia Táctica", "Bioma Predilecto: Selva densa"],
    "iniciativa_distraccion+alternativa": ["Vigilancia Táctica", "Bioma Predilecto: Selva densa"],
    "iniciativa": ["Vigilancia Táctica", "Bioma Predilecto: Selva densa"],
    "medicina": ["Ojo Clínico", "Especialidad Médica: Ceguera y sordera"],
    "carrera": ["Velocista"],
    "discernir_mentiras": ["Cazador Cazado"],
    "discernir_mentiras+alternativa": ["Cazador Cazado"],
    "resistir_distraccion": ["Vigilancia Táctica"],
    "resistir_distraccion+alternativa": ["Vigilancia Táctica"],
    "rastreo": ["Bioma Predilecto: Selva densa"],
    "subsistencia": ["Bioma Predilecto: Selva densa"],
    "social": ["Presencia Imponente", "Negociación Analítica"],
    "social+empatia": ["Negociación Analítica"],
    "social+humor": ["Negociación Analítica"],
    "social+intimidacion": ["Presencia Imponente", "Negociación Analítica"],
    "social+liderazgo": ["Negociación Analítica"],
    "social+manipulacion": ["Negociación Analítica"],
    "social+negociacion": ["Negociación Analítica"],
    "dotes_traicionero__iniciativa": ["Vigilancia Táctica", "Bioma Predilecto: Selva densa"],
  },
  aumentos: {
    "iniciativa_arma": ["Red Frontoparietal"],
    "iniciativa_distraccion": ["Red Frontoparietal", "Mielinización Central", "Proyección Neuro-Expresiva", "Matriz de Red Predeterminada", "Prefrontal Aumentada"],
    "iniciativa_distraccion+alternativa": ["Red Frontoparietal", "Mielinización Central", "Proyección Neuro-Expresiva", "Matriz de Red Predeterminada", "Prefrontal Aumentada"],
    "iniciativa": ["Red Frontoparietal", "Mielinización Central", "Prefrontal Aumentada"],
    "alerta_activa": ["Mielinización Central", "Optimización Foveo-Sensorial", "Prefrontal Aumentada", "Ojo Biónico"],
    "medicina": ["Mielinización Central", "Prefrontal Aumentada"],
    "apuntar": ["Mielinización Central", "Prefrontal Aumentada"],
    "discernir_mentiras": ["Mielinización Central", "Proyección Neuro-Expresiva", "Matriz de Red Predeterminada", "Prefrontal Aumentada"],
    "resistir_distraccion": ["Mielinización Central", "Proyección Neuro-Expresiva", "Matriz de Red Predeterminada", "Prefrontal Aumentada"],
    "rastreo": ["Mielinización Central", "Prefrontal Aumentada"],
    "subsistencia": ["Mielinización Central", "Prefrontal Aumentada"],
    "trato_animales_lectura": ["Mielinización Central", "Prefrontal Aumentada"],
    "trato_animales_interaccion": ["Mielinización Central", "Prefrontal Aumentada"],
    "tecnica": ["Mielinización Central", "Prefrontal Aumentada"],
    "social": ["Mielinización Central", "Proyección Neuro-Expresiva", "Matriz de Red Predeterminada", "Prefrontal Aumentada"],
    "social+empatia": ["Mielinización Central", "Proyección Neuro-Expresiva", "Matriz de Red Predeterminada", "Prefrontal Aumentada"],
    "social+humor": ["Mielinización Central", "Proyección Neuro-Expresiva", "Matriz de Red Predeterminada", "Prefrontal Aumentada"],
    "social+intimidacion": ["Mielinización Central", "Proyección Neuro-Expresiva", "Matriz de Red Predeterminada", "Prefrontal Aumentada"],
    "social+liderazgo": ["Mielinización Central", "Proyección Neuro-Expresiva", "Matriz de Red Predeterminada", "Prefrontal Aumentada"],
    "social+manipulacion": ["Mielinización Central", "Proyección Neuro-Expresiva", "Matriz de Red Predeterminada", "Prefrontal Aumentada"],
    "social+negociacion": ["Mielinización Central", "Proyección Neuro-Expresiva", "Matriz de Red Predeterminada", "Prefrontal Aumentada"],
    "ataque_fuego_fa": ["Ojo Biónico", "Optimización Foveo-Sensorial"],
  },
  axadren: {
    // + Visión infrarroja: nota en Buscar / percibir en vez de la acción «Activar visión» (D3 del triaje 2026-10-28).
    "alerta_activa": ["Ojo avizor", "Visión infrarroja"],
  },
  zimethroni: {
    "defensa": ["Tras esquivar", "Tensión ósea"],
  },
  elion: {
    "discernir_mentiras": ["Rigidez narcisista"],
    "resistir_distraccion": ["Rigidez narcisista"],
    "social": ["Rigidez narcisista"],
    "social+empatia": ["Rigidez narcisista"],
    "social+humor": ["Rigidez narcisista"],
    "social+intimidacion": ["Rigidez narcisista"],
    "social+liderazgo": ["Rigidez narcisista"],
    "social+manipulacion": ["Rigidez narcisista"],
    "social+negociacion": ["Rigidez narcisista"],
  },
  arkoru: {
    "alerta_activa": ["Percepción sensorial"],
    "atletismo": ["Inamovibles"],
    "ataque_fuego_fa": ["Percepción sensorial"],
    "ataque_melee_pu": ["Matriz Biometálica"],
  },
  riux: {},
  // P1 de psiónica (2026-10-28): las casillas de Leer Mente («Mente leída», en las enfrentadas) y
  // de Auto-proyección (esquiva). «Manteniendo anclaje» va a todas: "te afecta" no lista las de
  // alcance `todas`.
  psionica: {
    "defensa": ["Traslación", "Leer Mente", "Auto-proyección"],
    "defensa+alternativa": ["Traslación", "Leer Mente", "Auto-proyección"],
    "alerta_activa": ["Resonancia"],
    "iniciativa_distraccion": ["Leer Mente"],
    "iniciativa_distraccion+alternativa": ["Leer Mente"],
    "discernir_mentiras": ["Leer Mente"],
    "resistir_distraccion": ["Leer Mente"],
    "sigilo": ["Leer Mente"],
    "hurto": ["Leer Mente"],
    "social": ["Leer Mente"],
    "social+empatia": ["Leer Mente"],
    "social+humor": ["Leer Mente"],
    "social+intimidacion": ["Leer Mente"],
    "social+liderazgo": ["Leer Mente"],
    "social+manipulacion": ["Leer Mente"],
    "social+negociacion": ["Leer Mente"],
  },
  farmacos: {},
};

describe("te afecta: caracterización (fase 2)", () => {
  for (const [nombre, ficha] of Object.entries(FICHAS)) {
    test(nombre, () => {
      assert.deepEqual(afecta(ficha()), ESPERADO[nombre]);
    });
  }
});
