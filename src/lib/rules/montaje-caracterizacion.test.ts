// Caracterización de M1a (propuesta-especies §3.1): lo que montaba cada sitio de la UI
// ANTES de montarTirada, replicado aquí con las mismas funciones de rules y citando
// archivo:línea del código de entonces. Los números esperados se fijaron con esas
// réplicas; montarTirada tiene que dar exactamente lo mismo. Si un esperado cambia, es
// un bug, no un ajuste.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ACCIONES, modificadorAccion, resolverTirada, type Accion, type Resultado } from "./acciones";
import {
  desgloseBonosTramo,
  desgloseCondiciones,
  estadoInicial,
  modoElegido,
  notasCondiciones,
  valorBonosTramo,
  valorCondiciones,
  type EstadoCondiciones,
} from "./condiciones";
import { bonoAlcance, desgloseAlcance, type ContextoAccion } from "./modificadores";
import { accionesDeAtaque } from "./combate";
import { consultaIndiceCondiciones, equipar } from "./equipo";
import { resolverFicha, VITALIDAD_DE_FICHA, type FichaResuelta } from "./fichaResuelta";
import type { EstadoActivo } from "./estados";
import { accionesDePsionica, conEsquivaLevitando, conPsionicaEnTiradaFija } from "./poderes";
import { prepararPoder, SELECCION_PODER_VACIA, type SeleccionPoder } from "./usoPoder";
import { defaultSheet, type Sheet } from "./sheet";
import { montarTirada, tirarMontada, SIN_ELECCION, type TiradaMontada } from "./montaje";
import { APLICADOS } from "./atributos";
import { HABILIDADES } from "./habilidades";

type Linea = { etiqueta: string; valor: number };

// --- Fichas ---------------------------------------------------------------------

const base = (): Sheet => {
  const s = defaultSheet();
  return {
    ...s,
    atributos: { fuerza: 2, agilidad: 1, aguante: 1, percepcion: 0, inteligencia: 1, caracter: -1 },
    habilidades: {
      ...s.habilidades,
      atletismo: { ...s.habilidades.atletismo, valor: 3 },
      exploracion: { valor: 3, especialidades: ["supervivencia"] },
      combate_distancia: { ...s.habilidades.combate_distancia, valor: 2 },
      combate_melee: { ...s.habilidades.combate_melee, valor: 2 },
      biociencia: { valor: 4, especialidades: ["medicina"] },
      tecnociencia: { ...s.habilidades.tecnociencia, valor: 2 },
    },
  };
};

// Traje Ultra Ligero (+1 a las salvaciones de Fortaleza y Reflejos, alcance tiradaId),
// Visor Nocturno (casilla con alcance en Buscar), fusil con Lanzagranadas (ajuste fijo
// −1), Mira nv1 (bono por tramo) y Sistema de Retroceso (alcance modo F. Auto), la VTM
// nv4 (opción "complejo" en Tratar heridas) y el puñetazo (Sutil, con la dote Combate Sutil).
const conEquipo = (s: Sheet): Sheet => {
  s = equipar(s, { instanciaId: "arm", catalogoId: "traje_ultra_ligero" });
  s = equipar(s, { instanciaId: "vn", catalogoId: "visor_nocturno", nivel: 2, instaladoEnId: "arm" });
  s = equipar(s, { instanciaId: "fa", catalogoId: "fusil_asalto_impetus" });
  s = equipar(s, { instanciaId: "lg", catalogoId: "lanzagranadas_integrado", nivel: 1, instaladoEnId: "fa" });
  s = equipar(s, { instanciaId: "mt", catalogoId: "mira_telescopica", nivel: 1, instaladoEnId: "fa" });
  s = equipar(s, { instanciaId: "sr", catalogoId: "sistema_retroceso", nivel: 1, instaladoEnId: "fa" });
  s = equipar(s, { instanciaId: "vtm", catalogoId: "valija_tactica_medica", nivel: 4 });
  s = equipar(s, { instanciaId: "pu", catalogoId: "pelea_punetazo" });
  // El estilo Sutil solo existe con Combate Sutil (D2b-2); base() ya cumple su requisito
  // (Agilidad 1, Combate Melee 2). La dote no toca ningún otro número.
  return { ...s, dotes: [{ id: "dote_combate_sutil" }] };
};

const ENFERMO_Y_ATURDIDO: EstadoActivo[] = [
  { estadoId: "enfermedad", gradoId: "nivel_2", rondasRestantes: null },
  { estadoId: "aturdido", gradoId: "fracaso", rondasRestantes: 1 },
];

const SIN_ESPECIE = resolverFicha(base(), { vitalidad: VITALIDAD_DE_FICHA, estados: [] });
const EQUIPADA = resolverFicha(conEquipo(base()), { vitalidad: VITALIDAD_DE_FICHA, estados: [] });
// Especie con atributos (Zimethroni, Agilidad +1) + estados de combate (Enfermedad baja
// atributos; Aturdido −2 a Defensa con alcance de grupo).
const ESPECIE_Y_ESTADOS = resolverFicha({ ...conEquipo(base()), especieId: "zimethroni" }, {
  vitalidad: VITALIDAD_DE_FICHA,
  estados: ENFERMO_Y_ATURDIDO,
});
const PSIONICA = resolverFicha({ ...base(), psionica: { traslacion: 2, singularidad: 2 }, fatigaActual: 8, fatigaTemporal: 0 }, {
  vitalidad: VITALIDAD_DE_FICHA,
  estados: ENFERMO_Y_ATURDIDO,
});

// --- Réplicas del código de antes (AccionesTab.tsx, AccionModal.tsx, Fabricar/Reparar) --

// AccionesTab.tsx:547-550 (conCondicionesDeEquipo) y :1110-1112 (tiradas fijas).
function conCondicionesDeEquipo(f: FichaResuelta, t: Accion): Accion {
  const extra = consultaIndiceCondiciones(f.indiceCondiciones, { id: t.id, grupo: t.grupo, habilidad: t.habilidad, modoElegido: null });
  return extra.length > 0 ? { ...t, condiciones: [...(t.condiciones ?? []), ...extra] } : t;
}
function fija(f: FichaResuelta, id: string): Accion {
  const niveles = f.psionica.paraEfectos;
  const t = conCondicionesDeEquipo(f, ACCIONES.find((a) => a.id === id)!);
  return conPsionicaEnTiradaFija(niveles, conEsquivaLevitando(niveles, t));
}
function ataque(f: FichaResuelta, label: string): Accion {
  return conCondicionesDeEquipo(f, accionesDeAtaque(f.ficha, f.modificadores, f.extrasDotes.permisos).find((t) => t.label === label)!);
}

// AccionesTab.tsx:73-75
const sumaAjustesFijos = (t: Accion) => (t.ajustesFijos ?? []).reduce((s, a) => s + a.valor, 0);

// FilaTirada, AccionesTab.tsx:156 y :190-204 (también FilaPoder, :387 y :406-423, sin Sutil).
function legacyFila(f: FichaResuelta, t: Accion, enEsp: boolean, sutil: boolean) {
  const mod = modificadorAccion(f.ficha, t, enEsp, f.modificadores, sutil);
  return {
    aplicado: mod.aplicado,
    habilidad: mod.habilidad,
    ajustes: (t.ajustesFijos ?? []).map((a) => a.valor),
    total: mod.total + sumaAjustesFijos(t),
  };
}

const APLICADO_LABEL = Object.fromEntries(APLICADOS.map((a) => [a.id, a.label]));
const HABILIDAD_LABEL = Object.fromEntries(HABILIDADES.map((h) => [h.id, h.label]));

type Abierto = { tirada: Accion; modBase: number; desgloseBase: Linea[]; ctxBase: Omit<ContextoAccion, "modoElegido"> };

// abrir, AccionesTab.tsx:599-620.
function legacyAbrir(f: FichaResuelta, t: Accion, enEsp: boolean, sutil: boolean): Abierto {
  const mod = modificadorAccion(f.ficha, t, enEsp, f.modificadores, sutil);
  const aplicadoId = sutil && t.aplicadoSutil ? t.aplicadoSutil : t.aplicado;
  const desgloseBase = [
    { etiqueta: APLICADO_LABEL[aplicadoId], valor: mod.aplicado },
    ...(t.habilidad
      ? [{ etiqueta: `${HABILIDAD_LABEL[t.habilidad]}${enEsp ? " (especialidad)" : ""}`, valor: mod.habilidad ?? 0 }]
      : []),
    ...(t.ajustesFijos ?? []).map((a) => ({ etiqueta: a.fuente, valor: a.valor })),
  ];
  return {
    tirada: t,
    modBase: mod.total + sumaAjustesFijos(t),
    desgloseBase,
    ctxBase: { id: t.id, grupo: t.grupo, habilidad: t.habilidad },
  };
}

// Fabricar/Reparar, FabricarSeccion.tsx:292-310 y ReparaFabricaModal.tsx:161-179: sin
// especialidad, sin Sutil, desglose con las etiquetas a mano y el modal con
// condiciones={[]} (FabricarSeccion.tsx:469, ReparaFabricaModal.tsx:252).
function legacyAbrirFabricar(f: FichaResuelta, t: Accion): Abierto {
  const mod = modificadorAccion(f.ficha, t, false, f.modificadores, false);
  return {
    tirada: { ...t, condiciones: [] },
    modBase: mod.total,
    desgloseBase: [
      { etiqueta: "Perspicacia", valor: mod.aplicado },
      { etiqueta: "Tecnociencia", valor: mod.habilidad ?? 0 },
    ],
    ctxBase: { id: t.id, grupo: t.grupo, habilidad: t.habilidad },
  };
}

// AccionModal.tsx:307-316 (total previsto y notas) y :560-574 (desglose).
function legacyModal(f: FichaResuelta, a: Abierto, estado: EstadoCondiciones, circunstancial: number) {
  const condiciones = a.tirada.condiciones ?? [];
  const bonosTramo = a.tirada.bonosTramo ?? [];
  const ctx: ContextoAccion = { ...a.ctxBase, modoElegido: modoElegido(condiciones, estado) };
  const total =
    a.modBase +
    valorCondiciones(condiciones, estado) +
    valorBonosTramo(bonosTramo, estado) +
    bonoAlcance(f.modificadores, ctx) +
    circunstancial;
  const desglose = [
    ...a.desgloseBase,
    ...desgloseAlcance(f.modificadores, ctx),
    ...desgloseCondiciones(condiciones, estado),
    ...desgloseBonosTramo(bonosTramo, estado),
    ...(circunstancial !== 0 ? [{ etiqueta: "Modificador circunstancial", valor: circunstancial }] : []),
  ];
  return { total, desglose, notas: notasCondiciones(condiciones, estado) };
}

// tirar, AccionesTab.tsx:826-843 (con el `if` de la VTM en :836).
function legacyTirar(f: FichaResuelta, a: Abierto, estado: EstadoCondiciones, dado: number, dificultad: number | null, circunstancial: number) {
  const condiciones = a.tirada.condiciones ?? [];
  const bonoCondiciones = valorCondiciones(condiciones, estado);
  const bonoTramo = valorBonosTramo(a.tirada.bonosTramo ?? [], estado);
  const bonoEquipoEspecie = bonoAlcance(f.modificadores, { ...a.ctxBase, modoElegido: modoElegido(condiciones, estado) });
  const margenCriticoExito = estado.vtm_tratamiento === "complejo" ? 0 : undefined;
  return resolverTirada({
    dado,
    modificador: a.modBase + bonoCondiciones + bonoTramo + bonoEquipoEspecie,
    circunstancial,
    dificultad,
    margenCriticoExito,
  });
}

// onTirar de FabricarSeccion.tsx:319-325 y ReparaFabricaModal.tsx:188-194.
function legacyTirarFabricar(f: FichaResuelta, a: Abierto, dado: number, dificultad: number | null, circunstancial: number) {
  const bono = bonoAlcance(f.modificadores, { ...a.ctxBase, modoElegido: null });
  return resolverTirada({ dado, modificador: a.modBase + bono, circunstancial, dificultad });
}

// tirarSalvacionSobrecarga, AccionesTab.tsx:654-659 (la salvación a secas, sin casillas).
function legacySobrecarga(f: FichaResuelta, dado: number, dificultad: number) {
  const salv = ACCIONES.find((a) => a.id === "salv_fortaleza")!;
  const modificador =
    modificadorAccion(f.ficha, salv, false, f.modificadores).total +
    bonoAlcance(f.modificadores, { id: salv.id, grupo: salv.grupo, habilidad: salv.habilidad, modoElegido: null });
  return resolverTirada({ dado, modificador, dificultad });
}

const res = (r: Resultado) => ({ modificador: r.modificador, circunstancial: r.circunstancial, total: r.total, margen: r.margen, exito: r.exito, critico: r.critico });

// --- Casos ------------------------------------------------------------------------

type Caso = {
  nombre: string;
  ficha: FichaResuelta;
  tirada: () => Accion;
  enEspecialidad: boolean;
  sutil: boolean;
  fabricar?: boolean;
  // Elecciones del modal (sobre el estado inicial de sus condiciones) y una tirada por
  // cada una: [dado, dificultad].
  elecciones: { cambios: EstadoCondiciones; circunstancial: number; dado: number; dificultad: number | null }[];
};

const CASOS: Caso[] = [
  {
    nombre: "salvación de Fortaleza sin especie",
    ficha: SIN_ESPECIE, tirada: () => fija(SIN_ESPECIE, "salv_fortaleza"), enEspecialidad: false, sutil: false,
    elecciones: [{ cambios: {}, circunstancial: 0, dado: 7, dificultad: 7 }],
  },
  {
    nombre: "Defensa sin especie, dos atacantes adicionales y circunstancial",
    ficha: SIN_ESPECIE, tirada: () => fija(SIN_ESPECIE, "defensa"), enEspecialidad: false, sutil: false,
    elecciones: [
      { cambios: {}, circunstancial: 0, dado: 12, dificultad: 5 },
      { cambios: { atacantes_adicionales: 2 }, circunstancial: -1, dado: 1, dificultad: 7 },
    ],
  },
  {
    nombre: "Buscar con y sin especialidad, con Visor Nocturno",
    ficha: EQUIPADA, tirada: () => fija(EQUIPADA, "alerta_activa"), enEspecialidad: true, sutil: false,
    elecciones: [
      { cambios: {}, circunstancial: 0, dado: 5, dificultad: 10 },
      { cambios: { visor_nocturno_n2_activo: true }, circunstancial: 2, dado: 9, dificultad: null },
    ],
  },
  {
    nombre: "Buscar sin especialidad",
    ficha: EQUIPADA, tirada: () => fija(EQUIPADA, "alerta_activa"), enEspecialidad: false, sutil: false,
    elecciones: [{ cambios: {}, circunstancial: 0, dado: 6, dificultad: 7 }],
  },
  {
    nombre: "salvación de Fortaleza con traje (alcance tiradaId)",
    ficha: EQUIPADA, tirada: () => fija(EQUIPADA, "salv_fortaleza"), enEspecialidad: false, sutil: false,
    elecciones: [{ cambios: {}, circunstancial: 0, dado: 3, dificultad: 10 }],
  },
  {
    nombre: "fusil con lanzagranadas, mira y retroceso: tramos y modos",
    ficha: EQUIPADA, tirada: () => ataque(EQUIPADA, "Disparar con Impetus"), enEspecialidad: false, sutil: false,
    elecciones: [
      { cambios: {}, circunstancial: 0, dado: 8, dificultad: 7 },
      { cambios: { tramo: "media" }, circunstancial: 0, dado: 8, dificultad: 7 },
      { cambios: { tramo: "larga", modo: "__fauto__" }, circunstancial: 1, dado: 12, dificultad: 7 },
    ],
  },
  {
    nombre: "puñetazo sin Sutil",
    ficha: EQUIPADA, tirada: () => ataque(EQUIPADA, "Golpear con Puñetazo"), enEspecialidad: false, sutil: false,
    elecciones: [{ cambios: {}, circunstancial: 0, dado: 10, dificultad: 7 }],
  },
  {
    nombre: "puñetazo con Sutil",
    ficha: EQUIPADA, tirada: () => ataque(EQUIPADA, "Golpear con Puñetazo"), enEspecialidad: false, sutil: true,
    elecciones: [{ cambios: {}, circunstancial: 0, dado: 10, dificultad: 7 }],
  },
  {
    nombre: "Tratar heridas con la VTM nv4: normal y complejo",
    ficha: EQUIPADA, tirada: () => fija(EQUIPADA, "medicina"), enEspecialidad: true, sutil: false,
    elecciones: [
      { cambios: {}, circunstancial: 0, dado: 2, dificultad: 7 },
      { cambios: { vtm_tratamiento: "complejo" }, circunstancial: 0, dado: 2, dificultad: 7 },
      { cambios: { vtm_tratamiento: "complejo" }, circunstancial: 0, dado: 1, dificultad: 13 },
    ],
  },
  {
    nombre: "Defensa con especie y estados (Aturdido, alcance grupo)",
    ficha: ESPECIE_Y_ESTADOS, tirada: () => fija(ESPECIE_Y_ESTADOS, "defensa"), enEspecialidad: false, sutil: false,
    elecciones: [{ cambios: { atacantes_adicionales: 1 }, circunstancial: 0, dado: 6, dificultad: 7 }],
  },
  {
    nombre: "salvación de Reflejos con especie y estados",
    ficha: ESPECIE_Y_ESTADOS, tirada: () => fija(ESPECIE_Y_ESTADOS, "salv_reflejos"), enEspecialidad: false, sutil: false,
    elecciones: [{ cambios: {}, circunstancial: 0, dado: 11, dificultad: 5 }],
  },
  {
    nombre: "puñetazo Sutil con especie y estados",
    ficha: ESPECIE_Y_ESTADOS, tirada: () => ataque(ESPECIE_Y_ESTADOS, "Golpear con Puñetazo"), enEspecialidad: false, sutil: true,
    elecciones: [{ cambios: {}, circunstancial: 0, dado: 4, dificultad: 7 }],
  },
  {
    nombre: "Fabricar con especie y estados",
    ficha: ESPECIE_Y_ESTADOS, enEspecialidad: false, sutil: false, fabricar: true,
    tirada: () => ({ id: "fabricar_pistola_mosquito", label: "Fabricar: Mosquito", grupo: "Acciones", aplicado: "perspicacia", habilidad: "tecnociencia" }),
    elecciones: [{ cambios: {}, circunstancial: 1, dado: 6, dificultad: 9 }],
  },
  {
    nombre: "Reparar sin especie",
    ficha: SIN_ESPECIE, enEspecialidad: false, sutil: false, fabricar: true,
    tirada: () => ({ id: "reparar_rod", label: "Reparar: Rodela", grupo: "Acciones", aplicado: "perspicacia", habilidad: "tecnociencia" }),
    elecciones: [{ cambios: {}, circunstancial: 0, dado: 12, dificultad: 3 }],
  },
];

// El modo F. Auto del fusil se elige por su etiqueta: el id lo pone combate.ts.
function resolverCambios(t: Accion, cambios: EstadoCondiciones): EstadoCondiciones {
  if (cambios.modo !== "__fauto__") return cambios;
  const modo = t.condiciones?.find((c) => c.id === "modo");
  const fauto = modo?.tipo === "opcion" ? modo.opciones.find((o) => o.etiqueta.includes("F. Auto")) : undefined;
  return { ...cambios, modo: fauto!.id };
}

function legacy(caso: Caso) {
  const t = caso.tirada();
  const f = caso.ficha;
  const abierto = caso.fabricar ? legacyAbrirFabricar(f, t) : legacyAbrir(f, t, caso.enEspecialidad, caso.sutil);
  return {
    fila: caso.fabricar ? null : legacyFila(f, t, caso.enEspecialidad, caso.sutil),
    modBase: abierto.modBase,
    elecciones: caso.elecciones.map((e) => {
      const estado = { ...estadoInicial(abierto.tirada.condiciones ?? []), ...resolverCambios(t, e.cambios) };
      const modal = legacyModal(f, abierto, estado, e.circunstancial);
      const r = caso.fabricar
        ? legacyTirarFabricar(f, abierto, e.dado, e.dificultad, e.circunstancial)
        : legacyTirar(f, abierto, estado, e.dado, e.dificultad, e.circunstancial);
      return {
        ...modal,
        margenes: { criticoExito: estado.vtm_tratamiento === "complejo" ? 0 : 6, criticoFallo: 6 },
        resultado: res(r),
      };
    }),
  };
}

// Poderes: FilaPoder (AccionesTab.tsx:382-423) y abrirPoder → abrir (:675-678).
const CASOS_PODER: { nombre: string; ficha: FichaResuelta; accionId: string; seleccion: SeleccionPoder; dado: number; dificultad: number }[] = [
  { nombre: "Impulso nv2 sin casillas", ficha: PSIONICA, accionId: "psi_singularidad_impulso", seleccion: SELECCION_PODER_VACIA, dado: 6, dificultad: 7 },
  {
    nombre: "Impulso nv2 bajo Xovromium (ajuste fijo de casilla)",
    ficha: PSIONICA,
    accionId: "psi_singularidad_impulso",
    seleccion: { ...SELECCION_PODER_VACIA, casillas: ["Bajo Xovromium"] },
    dado: 6,
    dificultad: 7,
  },
];

function legacyPoder(c: (typeof CASOS_PODER)[number]) {
  const f = c.ficha;
  const poder = accionesDePsionica(f.ficha, f.psionica.paraEfectos).find((p) => p.accion.id === c.accionId)!;
  const p = prepararPoder({ ficha: f.ficha, modificadores: f.modificadores, niveles: f.psionica.paraEfectos, poder, seleccion: c.seleccion })!;
  const t = p.tirada!;
  const abierto = legacyAbrir(f, t, p.enEspecialidad, false);
  const estado = estadoInicial(t.condiciones ?? []);
  return {
    fila: legacyFila(f, t, p.enEspecialidad, false),
    modal: legacyModal(f, abierto, estado, 0),
    resultado: res(legacyTirar(f, abierto, estado, c.dado, c.dificultad, 0)),
  };
}

const ESPERADO: Record<string, unknown> = {
  "salvación de Fortaleza sin especie": {
    fila: { aplicado: 1, habilidad: null, ajustes: [], total: 1 },
    modBase: 1,
    elecciones: [
      {
        total: 1,
        desglose: [{ etiqueta: "Fortaleza", valor: 1 }],
        notas: [],
        margenes: { criticoExito: 6, criticoFallo: 6 },
        resultado: { modificador: 1, circunstancial: 0, total: 8, margen: 1, exito: true, critico: false },
      },
    ],
  },
  "Defensa sin especie, dos atacantes adicionales y circunstancial": {
    fila: { aplicado: 0, habilidad: 1, ajustes: [], total: 1 },
    modBase: 1,
    elecciones: [
      {
        total: 1,
        desglose: [
          { etiqueta: "Reflejos", valor: 0 },
          { etiqueta: "Atletismo", valor: 1 },
          { etiqueta: "Atacantes adicionales esta ronda ×0", valor: -0 }, // 0 × −1: el contador a cero da −0 (se pinta "+0")
          { etiqueta: "Tengo cobertura (+2) (sin activar)", valor: 0 },
        ],
        notas: [],
        margenes: { criticoExito: 6, criticoFallo: 6 },
        resultado: { modificador: 1, circunstancial: 0, total: 13, margen: 8, exito: true, critico: true },
      },
      {
        total: -2,
        desglose: [
          { etiqueta: "Reflejos", valor: 0 },
          { etiqueta: "Atletismo", valor: 1 },
          { etiqueta: "Atacantes adicionales esta ronda ×2", valor: -2 },
          { etiqueta: "Tengo cobertura (+2) (sin activar)", valor: 0 },
          { etiqueta: "Modificador circunstancial", valor: -1 },
        ],
        notas: [],
        margenes: { criticoExito: 6, criticoFallo: 6 },
        resultado: { modificador: -1, circunstancial: -1, total: -1, margen: -8, exito: false, critico: true },
      },
    ],
  },
  "Buscar con y sin especialidad, con Visor Nocturno": {
    fila: { aplicado: 0, habilidad: 3, ajustes: [], total: 3 },
    modBase: 3,
    elecciones: [
      {
        total: 3,
        desglose: [
          { etiqueta: "Perspicacia", valor: 0 },
          { etiqueta: "Exploración (especialidad)", valor: 3 },
          { etiqueta: "Visor Nocturno activo (sin activar)", valor: 0 },
          { etiqueta: "Visor Nocturno activo (sin activar)", valor: 0 },
          { etiqueta: "Buscando con la mira telescópica (sin activar)", valor: 0 },
        ],
        notas: [],
        margenes: { criticoExito: 6, criticoFallo: 6 },
        resultado: { modificador: 3, circunstancial: 0, total: 8, margen: -2, exito: false, critico: false },
      },
      {
        total: 5,
        desglose: [
          { etiqueta: "Perspicacia", valor: 0 },
          { etiqueta: "Exploración (especialidad)", valor: 3 },
          { etiqueta: "Visor Nocturno activo (sin activar)", valor: 0 },
          { etiqueta: "Visor Nocturno activo", valor: 0 },
          { etiqueta: "Buscando con la mira telescópica (sin activar)", valor: 0 },
          { etiqueta: "Modificador circunstancial", valor: 2 },
        ],
        notas: [
          {
            etiqueta: "Visor Nocturno activo",
            nota: "Ves a través de humo denso, niebla o partículas. Cobertura visual -2 dentro de 50 m (aplícalo a mano).",
          },
        ],
        margenes: { criticoExito: 6, criticoFallo: 6 },
        resultado: { modificador: 3, circunstancial: 2, total: 14, margen: null, exito: null, critico: false },
      },
    ],
  },
  "Buscar sin especialidad": {
    fila: { aplicado: 0, habilidad: 1, ajustes: [], total: 1 },
    modBase: 1,
    elecciones: [
      {
        total: 1,
        desglose: [
          { etiqueta: "Perspicacia", valor: 0 },
          { etiqueta: "Exploración", valor: 1 },
          { etiqueta: "Visor Nocturno activo (sin activar)", valor: 0 },
          { etiqueta: "Visor Nocturno activo (sin activar)", valor: 0 },
          { etiqueta: "Buscando con la mira telescópica (sin activar)", valor: 0 },
        ],
        notas: [],
        margenes: { criticoExito: 6, criticoFallo: 6 },
        resultado: { modificador: 1, circunstancial: 0, total: 7, margen: 0, exito: true, critico: false },
      },
    ],
  },
  "salvación de Fortaleza con traje (alcance tiradaId)": {
    fila: { aplicado: 1, habilidad: null, ajustes: [], total: 1 },
    modBase: 1,
    elecciones: [
      {
        total: 2,
        desglose: [{ etiqueta: "Fortaleza", valor: 1 }, { etiqueta: "Traje Ultra Ligero", valor: 1 }],
        notas: [],
        margenes: { criticoExito: 6, criticoFallo: 6 },
        resultado: { modificador: 2, circunstancial: 0, total: 5, margen: -5, exito: false, critico: false },
      },
    ],
  },
  "fusil con lanzagranadas, mira y retroceso: tramos y modos": {
    fila: { aplicado: 0, habilidad: 1, ajustes: [-1], total: 0 },
    modBase: 0,
    elecciones: [
      {
        total: -2,
        desglose: [
          { etiqueta: "Reflejos", valor: 0 },
          { etiqueta: "Combate a Distancia", valor: 1 },
          { etiqueta: "Lanzagranadas Integrado", valor: -1 },
          { etiqueta: "Distancia: Media (200-400 m)", valor: 0 },
          { etiqueta: "Modo de disparo: Simple", valor: -3 },
          { etiqueta: "Apuntado: No", valor: 0 },
          { etiqueta: "Mira Telescópica", valor: 1 },
        ],
        notas: [],
        margenes: { criticoExito: 6, criticoFallo: 6 },
        resultado: { modificador: -2, circunstancial: 0, total: 6, margen: -1, exito: false, critico: false },
      },
      {
        total: -2,
        desglose: [
          { etiqueta: "Reflejos", valor: 0 },
          { etiqueta: "Combate a Distancia", valor: 1 },
          { etiqueta: "Lanzagranadas Integrado", valor: -1 },
          { etiqueta: "Distancia: Media (200-400 m)", valor: 0 },
          { etiqueta: "Modo de disparo: Simple", valor: -3 },
          { etiqueta: "Apuntado: No", valor: 0 },
          { etiqueta: "Mira Telescópica", valor: 1 },
        ],
        notas: [],
        margenes: { criticoExito: 6, criticoFallo: 6 },
        resultado: { modificador: -2, circunstancial: 0, total: 6, margen: -1, exito: false, critico: false },
      },
      {
        total: -3,
        desglose: [
          { etiqueta: "Reflejos", valor: 0 },
          { etiqueta: "Combate a Distancia", valor: 1 },
          { etiqueta: "Lanzagranadas Integrado", valor: -1 },
          { etiqueta: "Sistema de Retroceso 1", valor: 1 },
          { etiqueta: "Distancia: Larga (400+ m)", valor: -2 },
          { etiqueta: "Modo de disparo: Estándar (F. Auto)", valor: -4 },
          { etiqueta: "Apuntado: No", valor: 0 },
          { etiqueta: "Mira Telescópica", valor: 1 },
          { etiqueta: "Modificador circunstancial", valor: 1 },
        ],
        notas: [],
        margenes: { criticoExito: 6, criticoFallo: 6 },
        resultado: { modificador: -4, circunstancial: 1, total: 9, margen: 2, exito: true, critico: false },
      },
    ],
  },
  "puñetazo sin Sutil": {
    fila: { aplicado: 1, habilidad: 1, ajustes: [], total: 2 },
    modBase: 2,
    elecciones: [
      {
        total: 2,
        desglose: [
          { etiqueta: "Potencia", valor: 1 },
          { etiqueta: "Combate Melee", valor: 1 },
          { etiqueta: "Modo de ataque: Simple", valor: 0 },
        ],
        notas: [],
        margenes: { criticoExito: 6, criticoFallo: 6 },
        resultado: { modificador: 2, circunstancial: 0, total: 12, margen: 5, exito: true, critico: false },
      },
    ],
  },
  "puñetazo con Sutil": {
    fila: { aplicado: 0, habilidad: 1, ajustes: [], total: 1 },
    modBase: 1,
    elecciones: [
      {
        total: 1,
        desglose: [
          { etiqueta: "Reflejos", valor: 0 },
          { etiqueta: "Combate Melee", valor: 1 },
          { etiqueta: "Modo de ataque: Simple", valor: 0 },
        ],
        notas: [],
        margenes: { criticoExito: 6, criticoFallo: 6 },
        resultado: { modificador: 1, circunstancial: 0, total: 11, margen: 4, exito: true, critico: false },
      },
    ],
  },
  "Tratar heridas con la VTM nv4: normal y complejo": {
    fila: { aplicado: 0, habilidad: 4, ajustes: [], total: 4 },
    modBase: 4,
    elecciones: [
      {
        total: 7,
        desglose: [
          { etiqueta: "Perspicacia", valor: 0 },
          { etiqueta: "Biociencia (especialidad)", valor: 4 },
          { etiqueta: "Valija Táctica Médica (VTM) 4", valor: 3 },
          { etiqueta: "Diagnóstico profundo (1 minuto, VTM nv3) (sin activar)", valor: 0 },
          { etiqueta: "Tipo de tratamiento (VTM nv4): Herida normal", valor: 0 },
        ],
        notas: [],
        margenes: { criticoExito: 6, criticoFallo: 6 },
        resultado: { modificador: 7, circunstancial: 0, total: 9, margen: 2, exito: true, critico: false },
      },
      {
        total: 7,
        desglose: [
          { etiqueta: "Perspicacia", valor: 0 },
          { etiqueta: "Biociencia (especialidad)", valor: 4 },
          { etiqueta: "Valija Táctica Médica (VTM) 4", valor: 3 },
          { etiqueta: "Diagnóstico profundo (1 minuto, VTM nv3) (sin activar)", valor: 0 },
          { etiqueta: "Tipo de tratamiento (VTM nv4): Estado complejo / estabilización / síntesis", valor: 0 },
        ],
        notas: [
          {
            etiqueta: "Tipo de tratamiento (VTM nv4)",
            nota: "Cualquier éxito en esta tirada cuenta como crítico.",
          },
        ],
        margenes: { criticoExito: 0, criticoFallo: 6 },
        resultado: { modificador: 7, circunstancial: 0, total: 9, margen: 2, exito: true, critico: true },
      },
      {
        total: 7,
        desglose: [
          { etiqueta: "Perspicacia", valor: 0 },
          { etiqueta: "Biociencia (especialidad)", valor: 4 },
          { etiqueta: "Valija Táctica Médica (VTM) 4", valor: 3 },
          { etiqueta: "Diagnóstico profundo (1 minuto, VTM nv3) (sin activar)", valor: 0 },
          { etiqueta: "Tipo de tratamiento (VTM nv4): Estado complejo / estabilización / síntesis", valor: 0 },
        ],
        notas: [
          {
            etiqueta: "Tipo de tratamiento (VTM nv4)",
            nota: "Cualquier éxito en esta tirada cuenta como crítico.",
          },
        ],
        margenes: { criticoExito: 0, criticoFallo: 6 },
        resultado: { modificador: 7, circunstancial: 0, total: 8, margen: -5, exito: false, critico: false },
      },
    ],
  },
  "Defensa con especie y estados (Aturdido, alcance grupo)": {
    fila: { aplicado: 0, habilidad: 1, ajustes: [], total: 1 },
    modBase: 1,
    elecciones: [
      {
        total: -2,
        desglose: [
          { etiqueta: "Reflejos", valor: 0 },
          { etiqueta: "Atletismo", valor: 1 },
          { etiqueta: "Enfermedad", valor: -1 },
          { etiqueta: "Aturdido", valor: -1 },
          { etiqueta: "Atacantes adicionales esta ronda ×1", valor: -1 },
          { etiqueta: "Tengo cobertura (+2) (sin activar)", valor: 0 },
        ],
        notas: [],
        margenes: { criticoExito: 6, criticoFallo: 6 },
        resultado: { modificador: -2, circunstancial: 0, total: 4, margen: -3, exito: false, critico: false },
      },
    ],
  },
  "salvación de Reflejos con especie y estados": {
    fila: { aplicado: 0, habilidad: null, ajustes: [], total: 0 },
    modBase: 0,
    elecciones: [
      {
        total: 0,
        desglose: [
          { etiqueta: "Reflejos", valor: 0 },
          { etiqueta: "Traje Ultra Ligero", valor: 1 },
          { etiqueta: "Enfermedad", valor: -1 },
        ],
        notas: [],
        margenes: { criticoExito: 6, criticoFallo: 6 },
        resultado: { modificador: 0, circunstancial: 0, total: 11, margen: 6, exito: true, critico: true },
      },
    ],
  },
  "puñetazo Sutil con especie y estados": {
    fila: { aplicado: 0, habilidad: 1, ajustes: [], total: 1 },
    modBase: 1,
    elecciones: [
      {
        total: 0,
        desglose: [
          { etiqueta: "Reflejos", valor: 0 },
          { etiqueta: "Combate Melee", valor: 1 },
          { etiqueta: "Enfermedad", valor: -1 },
          { etiqueta: "Modo de ataque: Simple", valor: 0 },
        ],
        notas: [],
        margenes: { criticoExito: 6, criticoFallo: 6 },
        resultado: { modificador: 0, circunstancial: 0, total: 4, margen: -3, exito: false, critico: false },
      },
    ],
  },
  "Fabricar con especie y estados": {
    fila: null,
    modBase: 1,
    elecciones: [
      {
        total: 1,
        desglose: [
          { etiqueta: "Perspicacia", valor: 0 },
          { etiqueta: "Tecnociencia", valor: 1 },
          { etiqueta: "Enfermedad", valor: -1 },
          { etiqueta: "Modificador circunstancial", valor: 1 },
        ],
        notas: [],
        margenes: { criticoExito: 6, criticoFallo: 6 },
        resultado: { modificador: 0, circunstancial: 1, total: 7, margen: -2, exito: false, critico: false },
      },
    ],
  },
  "Reparar sin especie": {
    fila: null,
    modBase: 1,
    elecciones: [
      {
        total: 1,
        desglose: [{ etiqueta: "Perspicacia", valor: 0 }, { etiqueta: "Tecnociencia", valor: 1 }],
        notas: [],
        margenes: { criticoExito: 6, criticoFallo: 6 },
        resultado: { modificador: 1, circunstancial: 0, total: 13, margen: 10, exito: true, critico: true },
      },
    ],
  },
};
const ESPERADO_PODER: Record<string, unknown> = {
  "Impulso nv2 sin casillas": {
    fila: { aplicado: 0, habilidad: 1, ajustes: [], total: 1 },
    modal: {
      total: 0,
      desglose: [
        { etiqueta: "Perspicacia", valor: 0 },
        { etiqueta: "Tecnociencia", valor: 1 },
        { etiqueta: "Enfermedad", valor: -1 },
      ],
      notas: [],
    },
    resultado: { modificador: 0, circunstancial: 0, total: 6, margen: -1, exito: false, critico: false },
  },
  "Impulso nv2 bajo Xovromium (ajuste fijo de casilla)": {
    fila: { aplicado: 0, habilidad: 1, ajustes: [1], total: 2 },
    modal: {
      total: 1,
      desglose: [
        { etiqueta: "Perspicacia", valor: 0 },
        { etiqueta: "Tecnociencia", valor: 1 },
        { etiqueta: "Xovromium", valor: 1 },
        { etiqueta: "Enfermedad", valor: -1 },
      ],
      notas: [],
    },
    resultado: { modificador: 1, circunstancial: 0, total: 7, margen: 0, exito: true, critico: false },
  },
};
const ESPERADO_SOBRECARGA = {
  sinEspecie: { modificador: 1, circunstancial: 0, total: 6, margen: -2, exito: false, critico: false },
  equipada: { modificador: 2, circunstancial: 0, total: 7, margen: -1, exito: false, critico: false },
  especieYEstados: { modificador: -1, circunstancial: 0, total: 11, margen: 1, exito: true, critico: false },
};

describe("caracterización: lo que montaba la UI antes de montarTirada", () => {
  for (const caso of CASOS) {
    test(caso.nombre, () => assert.deepEqual(legacy(caso), ESPERADO[caso.nombre]));
  }
  for (const c of CASOS_PODER) {
    test(`poder: ${c.nombre}`, () => assert.deepEqual(legacyPoder(c), ESPERADO_PODER[c.nombre]));
  }
  test("salvación de sobrecarga", () => {
    assert.deepEqual(
      {
        sinEspecie: res(legacySobrecarga(SIN_ESPECIE, 5, 8)),
        equipada: res(legacySobrecarga(EQUIPADA, 5, 8)),
        especieYEstados: res(legacySobrecarga(ESPECIE_Y_ESTADOS, 12, 10)),
      },
      ESPERADO_SOBRECARGA,
    );
  });
});

// --- Lo mismo, con montarTirada ---------------------------------------------------

const fila = (m: TiradaMontada) => ({
  aplicado: m.aplicado.valor,
  habilidad: m.habilidad?.valor ?? null,
  ajustes: m.ajustesFijos.map((a) => a.valor),
  total: m.base,
});

function nuevo(caso: Caso) {
  const t = caso.tirada();
  const f = caso.ficha;
  const enFila = montarTirada(f, t, { ...SIN_ELECCION, enEspecialidad: caso.enEspecialidad, sutil: caso.sutil });
  return {
    fila: caso.fabricar ? null : fila(enFila),
    modBase: enFila.base,
    elecciones: caso.elecciones.map((e) => {
      const estado = { ...estadoInicial(t.condiciones ?? []), ...resolverCambios(t, e.cambios) };
      const m = montarTirada(f, t, {
        enEspecialidad: caso.enEspecialidad,
        sutil: caso.sutil,
        estadoCondiciones: estado,
        circunstancial: e.circunstancial,
      });
      return {
        total: m.total,
        desglose: m.desglose,
        notas: m.notas,
        margenes: m.margenes,
        resultado: res(tirarMontada(m, e.dado, e.dificultad)),
      };
    }),
  };
}

function nuevoPoder(c: (typeof CASOS_PODER)[number]) {
  const f = c.ficha;
  const poder = accionesDePsionica(f.ficha, f.psionica.paraEfectos).find((p) => p.accion.id === c.accionId)!;
  const p = prepararPoder({ ficha: f.ficha, modificadores: f.modificadores, niveles: f.psionica.paraEfectos, poder, seleccion: c.seleccion })!;
  const t = p.tirada!;
  const m = montarTirada(f, t, {
    enEspecialidad: p.enEspecialidad,
    sutil: false,
    estadoCondiciones: estadoInicial(t.condiciones ?? []),
    circunstancial: 0,
  });
  return {
    fila: fila(p.montada!),
    modal: { total: m.total, desglose: m.desglose, notas: m.notas },
    resultado: res(tirarMontada(m, c.dado, c.dificultad)),
  };
}

const sobrecarga = (f: FichaResuelta, dado: number, dificultad: number) =>
  res(tirarMontada(montarTirada(f, ACCIONES.find((a) => a.id === "salv_fortaleza")!, SIN_ELECCION), dado, dificultad));

describe("montarTirada da lo mismo que la UI de antes", () => {
  for (const caso of CASOS) {
    test(caso.nombre, () => assert.deepEqual(nuevo(caso), ESPERADO[caso.nombre]));
  }
  for (const c of CASOS_PODER) {
    test(`poder: ${c.nombre}`, () => assert.deepEqual(nuevoPoder(c), ESPERADO_PODER[c.nombre]));
  }
  test("salvación de sobrecarga", () => {
    assert.deepEqual(
      {
        sinEspecie: sobrecarga(SIN_ESPECIE, 5, 8),
        equipada: sobrecarga(EQUIPADA, 5, 8),
        especieYEstados: sobrecarga(ESPECIE_Y_ESTADOS, 12, 10),
      },
      ESPERADO_SOBRECARGA,
    );
  });
  test("el margen de la VTM sale del dato de la opción, no del id de la condición", () => {
    const t: Accion = {
      ...ACCIONES.find((a) => a.id === "salv_voluntad")!,
      condiciones: [
        {
          id: "otra",
          tipo: "opcion",
          etiqueta: "Prueba",
          porDefecto: "a",
          opciones: [{ id: "a", etiqueta: "A", valor: 0 }, { id: "b", etiqueta: "B", valor: 0, margenCriticoExito: 2 }],
        },
      ],
    };
    const eleccion = (b: boolean) => ({ ...SIN_ELECCION, estadoCondiciones: { otra: b ? "b" : "a" } });
    assert.deepEqual(montarTirada(SIN_ESPECIE, t, eleccion(false)).margenes, { criticoExito: 6, criticoFallo: 6 });
    assert.deepEqual(montarTirada(SIN_ESPECIE, t, eleccion(true)).margenes, { criticoExito: 2, criticoFallo: 6 });
    assert.deepEqual(montarTirada(SIN_ESPECIE, t, { ...SIN_ELECCION, estadoCondiciones: { vtm_tratamiento: "complejo" } }).margenes, {
      criticoExito: 6,
      criticoFallo: 6,
    });
  });
});
