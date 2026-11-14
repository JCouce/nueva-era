// Caracterización de la habilitación (docs/aportes/plan.md, fase 6 paso 1): qué hoja sale
// oculta, bloqueada (con qué motivo) o atenuada en Acciones. Los esperados se fijaron ANTES de
// unificar `Accion.bloqueada`, `PoderDisponible.bloqueo` / `PoderPreparado.bloqueo` e
// `inhabilitado`, `tiradaFijaVisible` y los permisos de dote en un solo `habilitacion`, con la
// pantalla de entonces replicada; `vista` lee ahora `habilitacion` como la pantalla de ahora
// (AccionesTab.tsx, ArbolHabilidades.tsx). Si un esperado cambia, es un bug, no un ajuste.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ACCIONES, type Accion, type AccionDirecta } from "./acciones";
import { accionesDeAtaque, accionesDirectasDeAtaque } from "./combate";
import { equipar } from "./equipo";
import { accionesDeFarmacos, accionesDirectasDeFarmacos } from "./farmacos";
import { accionesDeHerramientas, accionesDirectasDeHerramientas } from "./herramientas";
import { conExtrasDeFicha, conExtrasDirectaDeFicha, resolverFicha, VITALIDAD_DE_FICHA, type FichaResuelta } from "./fichaResuelta";
import { esVisible, motivoDeBloqueo, type Habilitacion } from "./habilitacion";
import { poderesDeFicha } from "./poderes";
import { prepararPoder, SELECCION_PODER_VACIA } from "./usoPoder";
import { ajustarRecurso, reconciliarRecursos } from "./recursos";
import { gastarUsoLimitado, type MesaDeFicha } from "./dotesAcciones";
import { defaultSheet, type Sheet } from "./sheet";
import { HABILIDADES } from "./habilidades";
import { DOTES } from "../catalog/dotes";
import type { EspecialidadId } from "../catalog/especialidades";

// --- La pantalla, replicada --------------------------------------------------------

type Vista = {
  // Ids de las hojas con dado que se pintan (las ocultas no están).
  conDado: string[];
  // Ataques con el interruptor Sutil (permiso de Combate Sutil).
  sutil: string[];
  // Lo que no sale activo: "tirada:<id>", "usar:<id>", "poder:<id>" (fila y hoja del árbol),
  // "poder-modal:<id>" (el modal del poder) → motivo; "atenuada · " delante si la fila del poder
  // sale atenuada.
  noActivas: Record<string, string>;
};

function vista(ficha: FichaResuelta): Vista {
  const sheet = ficha.ficha;
  const mods = ficha.modificadores;
  const conExtras = (t: Accion) => conExtrasDeFicha(ficha, t);
  const conExtrasDirecta = (d: AccionDirecta) => conExtrasDirectaDeFicha(ficha, d);
  // AccionesTab.tsx, `fijas`: las ocultas no se pintan.
  const fijas = ACCIONES.map(conExtras).filter(esVisible);
  // AccionesTab.tsx, useMemo de ataques, herramientas y fármacos.
  const generadas = accionesDeAtaque(sheet, mods, ficha.extrasDotes.permisos).map(conExtras);
  const conDado: Accion[] = [
    ...fijas,
    ...generadas,
    ...accionesDeHerramientas(sheet).map(conExtras),
    ...accionesDeFarmacos(sheet, ficha.notasFarmacos).map(conExtras),
    ...ficha.accionesMovimiento.map(conExtras),
    ...ficha.accionesOcultacion.map(conExtras),
    // AccionesTab.tsx, acciones de dote y `filasAumentos`.
    ...ficha.accionesDotes.tiradas.map(conExtras),
    ...ficha.accionesAumentos.filas.flatMap((f) => (f.tipo === "tirada" ? [conExtras(f.accion)] : [])),
  ];
  const sinDado: AccionDirecta[] = [
    ...accionesDirectasDeAtaque(sheet).map(conExtrasDirecta),
    ...accionesDirectasDeHerramientas(sheet).map(conExtrasDirecta),
    ...accionesDirectasDeFarmacos(sheet, ficha.notasFarmacos).map(conExtrasDirecta),
    ...ficha.accionesDotes.directas.map(conExtrasDirecta),
    ...ficha.accionesAumentos.filas.flatMap((f) => (f.tipo === "directa" ? [f.accion] : [])),
    ...ficha.accionesEspecie,
  ];
  const noActivas: Record<string, string> = {};
  // FilaTirada y HojaTirada: «no disponible» y el motivo.
  const anota = (clave: string, h: Habilitacion | undefined) => {
    if (h?.estado === "bloqueada") noActivas[clave] = h.motivo;
    else if (h?.estado === "oculta") noActivas[clave] = `oculta · ${h.motivo}`;
  };
  for (const t of conDado) anota(`tirada:${t.id}`, t.habilitacion);
  // FilaUsar: botón apagado y el motivo.
  for (const d of sinDado) anota(`usar:${d.id}`, d.habilitacion);
  // FilaPoder, HojaPoder y el modal del poder (UsarPoderModal / AccionModal).
  for (const poder of [...poderesDeFicha(sheet, ficha.psionica), ...ficha.poderesDotes]) {
    const p = prepararPoder({
      ficha: sheet,
      modificadores: mods,
      niveles: ficha.psionica.paraEfectos,
      poder,
      seleccion: SELECCION_PODER_VACIA,
      textos: ficha.textosTirada,
      objetivos: ficha.objetivosTirada,
      indiceCondiciones: ficha.indiceCondiciones,
      fatigaEfectiva: ficha.fatigaEnJuego.efectiva,
      estados: ficha.estadosConEfecto,
    });
    if (!p) continue;
    const fila = motivoDeBloqueo(p.habilitacion);
    if (fila) noActivas[`poder:${poder.accion.id}`] = `${p.noFuncionaAhora ? "atenuada · " : ""}${fila}`;
    const modal = motivoDeBloqueo(p.habilitacionAlUsar);
    if (modal) noActivas[`poder-modal:${poder.accion.id}`] = modal;
  }
  return {
    conDado: conDado.map((t) => t.id).sort(),
    sutil: generadas.filter((t) => t.aplicadoSutil).map((t) => t.id).sort(),
    noActivas,
  };
}

// --- Fichas ---------------------------------------------------------------------------------

const base = (patch: Partial<Sheet> = {}): Sheet => {
  const s = defaultSheet();
  return {
    ...s,
    atributos: { fuerza: 2, agilidad: 2, aguante: 1, percepcion: 1, inteligencia: 1, caracter: 1 },
    habilidades: {
      ...s.habilidades,
      atletismo: { valor: 3, especialidades: [] },
      exploracion: { valor: 3, especialidades: [] },
      combate_melee: { valor: 3, especialidades: [] },
    } as Sheet["habilidades"],
    vidaActual: 10,
    fatigaActual: 10,
    ...patch,
  };
};
const resolver = (s: Sheet, mesa: MesaDeFicha | null = null) => resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA, mesa });
const IRM_1 = { instanciaId: "irm", catalogoId: "aum_implante_de_resonancia_metrica", nivel: 1 };
let n = 0;
const conPieza = (s: Sheet, catalogoId: string, nivel?: number): Sheet => ({
  ...s,
  equipo: [...s.equipo, { instanciaId: `x${++n}`, catalogoId, ...(nivel !== undefined && { nivel }) }],
});

// Exploración sin especialidad: Rastreo, Subsistencia, Trato con animales e Investigación, ocultas.
const sinEspecialidad = () => base();
// Con Supervivencia salen las tres suyas; Investigación sigue oculta.
const supervivencia = () =>
  base({ habilidades: { ...base().habilidades, exploracion: { valor: 3, especialidades: ["supervivencia"] } } });
// Sin la especialidad, pero con algo que engancha (UV en Investigación, oído biónico en Rastreo).
const enganchadas = () => ({
  ...base(),
  equipo: [
    { instanciaId: "uv", catalogoId: "aum_introgresion_sensorial_heterologa", eleccion: "espectro_ultravioleta" },
    { instanciaId: "fo", catalogoId: "aum_optimizacion_foveo_sensorial" },
    { instanciaId: "va", catalogoId: "aum_optimizacion_vestibulo_auditiva" },
  ],
});
// Melee sin dotes: sin Bloquear ni Sutil.
const meleeSinDotes = () => {
  let s = base();
  s = equipar(s, { instanciaId: "pu", catalogoId: "pelea_punetazo" });
  s = equipar(s, { instanciaId: "to", catalogoId: "corta_tonfa_porra" });
  return equipar(s, { instanciaId: "e1", catalogoId: "escudo_rodela" });
};
// Con Bloqueo y Combate Sutil, y el escudo roto (S86).
const meleeEscudoRoto = () => ajustarRecurso({ ...meleeSinDotes(), dotes: [{ id: "dote_bloqueo" }, { id: "dote_combate_sutil" }] }, "e1", -8);
// Camuflaje trifásico sin cargas.
const camuflajeSinCargas = () => {
  const s = reconciliarRecursos(
    equipar(equipar(base(), { instanciaId: "a1", catalogoId: "armadura_pesada" }), {
      instanciaId: "cam",
      catalogoId: "camuflaje_trifasico",
      nivel: 1,
      instaladoEnId: "a1",
    }),
  );
  return ajustarRecurso(s, "cam", -10);
};
// Aumentos con fatiga fija que no llega (A4a, A4b).
const aumentosSinFatiga = () => {
  let s = base({ fatigaActual: 1, vidaActual: 8 });
  for (const id of ["aum_matriz_osea_adaptativa", "aum_biogenesis_mitocondrial", "aum_angiogenesis_sistemica"]) s = conPieza(s, id);
  return conPieza(s, "aum_enjambre_nanobot", 4);
};
// Acción de dote con su límite gastado (Humor de afrontamiento, 1 por escena).
const KIRA = { id: "ckira0000000000000000000a", nombre: "Kira" };
const MESA: MesaDeFicha = { aliados: [KIRA], turno: null };
// Todas las especialidades que piden las dotes, como limitesDotes.test.ts.
const especialidadesDeDotes: Record<string, EspecialidadId[]> = {};
for (const d of DOTES)
  for (const r of d.requisitos.flatMap((x) => (x.tipo === "uno_de" ? x.opciones : [x])))
    if (r.tipo === "especialidad") (especialidadesDeDotes[r.habilidad] ??= []).push(r.id);
const doteGastada = () => {
  const d = defaultSheet();
  const s: Sheet = {
    ...d,
    atributos: Object.fromEntries(Object.keys(d.atributos).map((k) => [k, 4])) as Sheet["atributos"],
    habilidades: Object.fromEntries(
      HABILIDADES.map((h) => [h.id, { valor: 6, especialidades: [...new Set(especialidadesDeDotes[h.id] ?? [])] }]),
    ) as Sheet["habilidades"],
    dotes: [{ id: "dote_humor_de_afrontamiento" }],
  };
  const t = resolver(s, MESA).accionesDotes.tiradas.find((x) => x.id === "dotes_humor_de_afrontamiento")!;
  const r = gastarUsoLimitado(s, t.usoLimitado!, null, MESA.aliados);
  assert.ok(r.ok);
  return r.sheet;
};
// Psiónica sin fuente (au-04): todo bloqueado con el motivo.
const psionicaSinAcceso = () => base({ psionica: { resonancia: 1 } });
// Y además exhausta: la fila de Alerta pasiva, atenuada (lo era por `inhabilitado`, aunque el
// motivo que se enseñaba fuese el de sin acceso).
const psionicaSinAccesoExhausta = () => base({ psionica: { resonancia: 1 }, fatigaActual: 1 });
// Con el implante: Alerta pasiva exhausta (ps-06) y, con fatiga 1, Impulso de Singularidad sin
// fatiga para el modal.
const psionicaExhausta = () => base({ psionica: { resonancia: 1, traslacion: 2, singularidad: 2 }, equipo: [IRM_1], fatigaActual: 1 });
// Requisito roto (S25): Inducción sin Resonancia.
const requisitoRoto = () => base({ psionica: { induccion: 1 }, equipo: [IRM_1] });

const FICHAS: Record<string, () => FichaResuelta> = {
  sinEspecialidad: () => resolver(sinEspecialidad()),
  supervivencia: () => resolver(supervivencia()),
  enganchadas: () => resolver(enganchadas()),
  meleeSinDotes: () => resolver(meleeSinDotes()),
  meleeEscudoRoto: () => resolver(meleeEscudoRoto()),
  camuflajeSinCargas: () => resolver(camuflajeSinCargas()),
  aumentosSinFatiga: () => resolver(aumentosSinFatiga()),
  doteGastada: () => resolver(doteGastada(), MESA),
  psionicaSinAcceso: () => resolver(psionicaSinAcceso()),
  psionicaSinAccesoExhausta: () => resolver(psionicaSinAccesoExhausta()),
  psionicaExhausta: () => resolver(psionicaExhausta()),
  requisitoRoto: () => resolver(requisitoRoto()),
};

// --- Esperados (fijados con el código de antes) ----------------------------------------------

const ESPERADO: Record<string, Vista> = {
  sinEspecialidad: {
    conDado: ["alerta_activa", "apuntar", "atletismo", "carrera", "defensa", "discernir_mentiras", "escalar", "hurto", "iniciativa", "iniciativa_arma", "iniciativa_distraccion", "medicina", "mimetismo", "resistir_distraccion", "salv_fortaleza", "salv_reflejos", "salv_voluntad", "sigilo", "social", "tecnica"],
    sutil: [],
    noActivas: {},
  },
  supervivencia: {
    conDado: ["alerta_activa", "apuntar", "atletismo", "carrera", "defensa", "discernir_mentiras", "escalar", "hurto", "iniciativa", "iniciativa_arma", "iniciativa_distraccion", "medicina", "mimetismo", "rastreo", "resistir_distraccion", "salv_fortaleza", "salv_reflejos", "salv_voluntad", "sigilo", "social", "subsistencia", "tecnica", "trato_animales_interaccion", "trato_animales_lectura"],
    sutil: [],
    noActivas: {},
  },
  enganchadas: {
    conDado: ["alerta_activa", "apuntar", "atletismo", "carrera", "defensa", "discernir_mentiras", "escalar", "hurto", "iniciativa", "iniciativa_arma", "iniciativa_distraccion", "investigacion", "medicina", "mimetismo", "rastreo", "resistir_distraccion", "salv_fortaleza", "salv_reflejos", "salv_voluntad", "sigilo", "social", "tecnica"],
    sutil: [],
    noActivas: {},
  },
  meleeSinDotes: {
    conDado: ["alerta_activa", "apuntar", "ataque_melee_e1", "ataque_melee_pu", "ataque_melee_to", "atletismo", "carrera", "defensa", "discernir_mentiras", "escalar", "esconder_arma", "hurto", "iniciativa", "iniciativa_arma", "iniciativa_distraccion", "medicina", "mimetismo", "resistir_distraccion", "salv_fortaleza", "salv_reflejos", "salv_voluntad", "sigilo", "social", "tecnica"],
    sutil: [],
    noActivas: {},
  },
  meleeEscudoRoto: {
    conDado: ["alerta_activa", "apuntar", "ataque_melee_e1", "ataque_melee_pu", "ataque_melee_to", "atletismo", "bloquear_melee_e1", "bloquear_melee_pu", "bloquear_melee_to", "carrera", "defensa", "discernir_mentiras", "escalar", "esconder_arma", "hurto", "iniciativa", "iniciativa_arma", "iniciativa_distraccion", "medicina", "mimetismo", "resistir_distraccion", "salv_fortaleza", "salv_reflejos", "salv_voluntad", "sigilo", "social", "tecnica"],
    sutil: ["ataque_melee_pu", "bloquear_melee_pu"],
    noActivas: {
      "tirada:ataque_melee_e1": "Escudo roto: repáralo",
      "tirada:bloquear_melee_e1": "Escudo roto: repáralo",
      "usar:levantar_escudo_e1": "Escudo roto: repáralo",
    },
  },
  camuflajeSinCargas: {
    conDado: ["alerta_activa", "apuntar", "atletismo", "carrera", "defensa", "discernir_mentiras", "escalar", "hurto", "iniciativa", "iniciativa_arma", "iniciativa_distraccion", "medicina", "mimetismo", "resistir_distraccion", "salv_fortaleza", "salv_reflejos", "salv_voluntad", "sigilo", "social", "tecnica"],
    sutil: [],
    noActivas: {
      "usar:activar_camuflaje_cam": "Sin cargas: recarga o cambia la batería",
    },
  },
  aumentosSinFatiga: {
    conDado: ["alerta_activa", "apuntar", "atletismo", "aumentos_tempestad_nanobotica", "carrera", "defensa", "discernir_mentiras", "escalar", "hurto", "iniciativa", "iniciativa_arma", "iniciativa_distraccion", "medicina", "mimetismo", "resistir_distraccion", "salv_fortaleza", "salv_reflejos", "salv_voluntad", "sigilo", "social", "tecnica"],
    sutil: [],
    noActivas: {
      "tirada:aumentos_tempestad_nanobotica": "No te llega la fatiga: cuesta 2 y te quedan 1.",
      "usar:aumentos_cortar_exanguinante": "No te llega la fatiga: cuesta 2 y te quedan 1.",
      // Sanar letal cuesta 2 desde el sync Drive 2026-11-14 (antes 1).
      "usar:aumentos_enjambre_sanar_letal": "No te llega la fatiga: cuesta 2 y te quedan 1.",
      // Sanar grave cuesta 4 desde el sync Drive 2026-11-14 (antes, pulsaciones de 1).
      "usar:aumentos_enjambre_sanar_grave": "No te llega la fatiga: cuesta 4 y te quedan 1.",
    },
  },
  doteGastada: {
    conDado: ["alerta_activa", "apuntar", "atletismo", "carrera", "defensa", "discernir_mentiras", "dotes_humor_de_afrontamiento", "escalar", "hurto", "iniciativa", "iniciativa_arma", "iniciativa_distraccion", "investigacion", "medicina", "mimetismo", "rastreo", "resistir_distraccion", "salv_fortaleza", "salv_reflejos", "salv_voluntad", "sigilo", "social", "subsistencia", "tecnica", "trato_animales_interaccion", "trato_animales_lectura"],
    sutil: [],
    noActivas: {
      "tirada:dotes_humor_de_afrontamiento": "Usada esta escena (1/1).",
    },
  },
  psionicaSinAcceso: {
    conDado: ["alerta_activa", "apuntar", "atletismo", "carrera", "defensa", "discernir_mentiras", "escalar", "hurto", "iniciativa", "iniciativa_arma", "iniciativa_distraccion", "medicina", "mimetismo", "resistir_distraccion", "salv_fortaleza", "salv_reflejos", "salv_voluntad", "sigilo", "social", "tecnica"],
    sutil: [],
    noActivas: {
      "poder:psi_resonancia_sincronia": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder-modal:psi_resonancia_sincronia": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder:psi_resonancia_mensaje_agresivo": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder-modal:psi_resonancia_mensaje_agresivo": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder:psi_resonancia_superar_barrera": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder-modal:psi_resonancia_superar_barrera": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder:psi_resonancia_rastreo": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder-modal:psi_resonancia_rastreo": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder:psi_resonancia_leer_mente": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder-modal:psi_resonancia_leer_mente": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder:psi_resonancia_alerta_pasiva": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder-modal:psi_resonancia_alerta_pasiva": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder:psi_resonancia_alerta_activa": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder-modal:psi_resonancia_alerta_activa": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder:psi_resonancia_vinculo": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder-modal:psi_resonancia_vinculo": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
    },
  },
  psionicaSinAccesoExhausta: {
    conDado: ["alerta_activa", "apuntar", "atletismo", "carrera", "defensa", "discernir_mentiras", "escalar", "hurto", "iniciativa", "iniciativa_arma", "iniciativa_distraccion", "medicina", "mimetismo", "resistir_distraccion", "salv_fortaleza", "salv_reflejos", "salv_voluntad", "sigilo", "social", "tecnica"],
    sutil: [],
    noActivas: {
      "poder:psi_resonancia_sincronia": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder-modal:psi_resonancia_sincronia": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder:psi_resonancia_mensaje_agresivo": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder-modal:psi_resonancia_mensaje_agresivo": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder:psi_resonancia_superar_barrera": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder-modal:psi_resonancia_superar_barrera": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder:psi_resonancia_rastreo": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder-modal:psi_resonancia_rastreo": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder:psi_resonancia_leer_mente": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder-modal:psi_resonancia_leer_mente": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder:psi_resonancia_alerta_pasiva": "atenuada · Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder-modal:psi_resonancia_alerta_pasiva": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder:psi_resonancia_alerta_activa": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder-modal:psi_resonancia_alerta_activa": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder:psi_resonancia_vinculo": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
      "poder-modal:psi_resonancia_vinculo": "Requiere ser Arianyi o de la Casa de Maolher, o llevar el Implante de Resonancia Métrica",
    },
  },
  psionicaExhausta: {
    conDado: ["alerta_activa", "apuntar", "atletismo", "carrera", "defensa", "discernir_mentiras", "escalar", "hurto", "iniciativa", "iniciativa_arma", "iniciativa_distraccion", "medicina", "mimetismo", "resistir_distraccion", "salv_fortaleza", "salv_reflejos", "salv_voluntad", "sigilo", "social", "tecnica"],
    sutil: [],
    noActivas: {
      "poder:psi_resonancia_alerta_pasiva": "atenuada · Exhausto: no funciona",
      "poder-modal:psi_resonancia_alerta_pasiva": "Exhausto: no funciona",
      "poder-modal:psi_traslacion_anclaje": "Te faltan 1 de fatiga (tienes 1, cuesta 2).",
      "poder-modal:psi_traslacion_auto_anclaje": "Te faltan 1 de fatiga (tienes 1, cuesta 2).",
      "poder-modal:psi_traslacion_trasladar": "Te faltan 1 de fatiga (tienes 1, cuesta 2).",
      "poder-modal:psi_traslacion_proeza": "Escribe el peso del objetivo.",
      "poder-modal:psi_singularidad_impulso": "Te faltan 1 de fatiga (tienes 1, cuesta 2).",
      "poder-modal:psi_singularidad_expansion": "Te faltan 1 de fatiga (tienes 1, cuesta 2).",
      "poder-modal:psi_singularidad_convergencia": "Te faltan 1 de fatiga (tienes 1, cuesta 2).",
    },
  },
  requisitoRoto: {
    conDado: ["alerta_activa", "apuntar", "atletismo", "carrera", "defensa", "discernir_mentiras", "escalar", "hurto", "iniciativa", "iniciativa_arma", "iniciativa_distraccion", "medicina", "mimetismo", "resistir_distraccion", "salv_fortaleza", "salv_reflejos", "salv_voluntad", "sigilo", "social", "tecnica"],
    sutil: [],
    noActivas: {
      "poder:psi_induccion_comando": "Requiere Resonancia 1",
      "poder-modal:psi_induccion_comando": "Requiere Resonancia 1",
      "poder:psi_induccion_modulacion": "Requiere Resonancia 1",
      "poder-modal:psi_induccion_modulacion": "Requiere Resonancia 1",
      "poder:psi_induccion_hipomania_aliado": "Requiere Resonancia 1",
      "poder-modal:psi_induccion_hipomania_aliado": "Requiere Resonancia 1",
      "poder:psi_induccion_supresion": "Requiere Resonancia 1",
      "poder-modal:psi_induccion_supresion": "Requiere Resonancia 1",
      "poder:psi_induccion_estabilizacion": "Requiere Resonancia 1",
      "poder-modal:psi_induccion_estabilizacion": "Requiere Resonancia 1",
    },
  },
};

describe("habilitación: lo que la pantalla enseñaba antes de unificarla", () => {
  for (const [nombre, ficha] of Object.entries(FICHAS)) {
    test(nombre, () => {
      assert.deepEqual(vista(ficha()), ESPERADO[nombre]);
    });
  }
});
