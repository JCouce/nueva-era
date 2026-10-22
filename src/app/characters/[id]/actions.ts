"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { revalidarPanelMaster } from "@/lib/revalidarMaster";
import { requireUser, canEditCharacter } from "@/lib/auth-helpers";
import { cambiarEstadosDePersonajes, guardarFichaConFotos } from "@/lib/estadosPersonaje";
import { z } from "zod";
import {
  characterCreateSchema,
  characterIdSchema,
  eleccionEspecieSchema,
  especialidadDeHabilidadSchema,
} from "@/lib/validation";
import {
  type Sheet,
  parseSheet,
  setAtributoValue,
  setHabilidadValue,
  addEspecialidad,
  removeEspecialidad,
  descartarAvisoEspecialidades,
  resetBuild,
  equipar,
  retirarPieza,
  costeDePieza,
  costeDeRetirar,
  rarezaDePieza,
  rarezaPermitida,
  piezaEquipadaEntradaSchema,
  topeRarezaDeCompra,
  excepcionesRareza,
  bonosDeDisciplina,
  modificadoresActivos,
  type BonosDisciplina,
  type EstadoFicha,
  ajustarRecurso,
  comprarRecarga,
  ajustarMaterial,
  comprarMaterial,
  repararPieza,
  rarezaMaterial,
  fabricar,
  tieneVtf,
  piezaFabricablePorId,
  ajustarGranada,
  comprarGranada,
  MUNICION_GRANADA,
  ajustarFarmaco,
  comprarFarmaco,
  FARMACOS,
  comprarMunicionEspecial,
  ajustarMunicionEspecial,
  municionEspecialPorId,
  ajustarVida,
  ajustarFatiga,
  type MaterialTier,
  type AtributoId,
  type HabilidadId,
  type PiezaEquipada,
  type AprobacionSnapshot,
  parseSnapshot,
  setPrioridad,
  RECURSOS_POR_LETRA,
  costeSubidaXp,
  ATRIBUTO_MAX,
  HABILIDAD_MAX,
  type CategoriaPrioridad,
  type LetraPrioridad,
  setDisciplinaValue,
  setNivelDisciplina,
  nivelDisciplina,
  esDisciplinaId,
  DISCIPLINA_MAX,
  type DisciplinaId,
  pagarFatiga,
  ajustarFatigaTemporal,
  terminarEscena,
  elegirEspecie,
  creditosDeLaLetra,
  reconciliarVidaConEstados,
  type EleccionEspecie,
  fichaSoloLectura,
  transicionRevision,
  faltaParaEnviar,
  excesosDePuntos,
  pasosPersonaje,
  especieDeFicha,
  ajustesDeCoste,
  type AjusteCoste,
  comprarDote,
  quitarDote,
  faltasDeDotes,
  valoresRequisitoDeFicha,
  doteCompradaSchema,
  compraAumentoSchema,
  comprarAumento,
  devolucionAumento,
  ajusteCosteDeSubida,
  aumentoPorId,
  bolsaDeAumentos,
  nuevaInstanciaId,
  leerEstados,
  type EstadoActivo,
  gastarUsosEscena,
  liberarUsoEscena,
  usoDeAccionAumento,
} from "@/lib/rules";

export type SaveResult =
  // `mensaje`: qué ha pasado, cuando no basta con ver la ficha (acciones de aumento, A4a).
  | { ok: true; sheet: Sheet; xp?: number; creditos?: number; mensaje?: string }
  | { ok: false; error: string };

type Editable = {
  sheet: Sheet;
  // Ajuste de coste de la especie (§14.6), resuelto aquí con la ficha de la base:
  // el mismo que calcula resolverFicha en la pantalla (ficha.ajusteCoste). Es el del
  // point-buy de creación.
  ajuste: AjusteCoste;
  // El de subir con XP (aprobada): el de la especie más las rebajas de coste de
  // habilidad de los aumentos (A1). Igual que ficha.ajusteCosteSubida.
  ajusteXp: AjusteCoste;
  // Bonos de nivel de disciplina (Resonancia +1, §14.6): los requisitos miran el
  // nivel efectivo. Los mismos que FichaResuelta.psionica.bonos.
  bonosDisciplina: BonosDisciplina;
  estado: EstadoFicha;
  aprobada: boolean;
  snapshot: AprobacionSnapshot | null;
  xp: number;
  creditos: number;
  esMaster: boolean;
  // Quien edita (autoría del registro del máster) y los estados que le ha puesto el máster
  // (Character.estados): los usan las acciones de aumento que quitan un estado (A4a).
  userId: string;
  estados: EstadoActivo[];
};

// Carga la ficha comprobando permisos. Base de todas las acciones de autosave.
// Trae también el estado de aprobación y la XP disponible: aprobada + subir
// de nivel se paga con XP (ver setAtributoAction/setHabilidadAction), al
// mismo coste por nivel que en creación (docs/sistema.md, "Coste y progresión").
// `esMaster` es de quien EDITA, no del dueño de la ficha — lo usa
// equiparAction para saltarse el tope de rareza (decisión del usuario:
// el máster no tiene techo).
async function loadEditable(characterId: string): Promise<Editable | { error: string }> {
  const user = await requireUser();
  const character = await prisma.character.findUnique({
    where: { id: characterId },
  });
  if (!character) return { error: "Personaje no encontrado" };
  if (!canEditCharacter(user, character)) {
    return { error: "No tienes permiso para editar esta ficha" };
  }
  // Envío a revisión: el jugador no edita mientras el máster la revisa; el máster sí
  // (la regla vive en fichaSoloLectura, revision.ts).
  if (fichaSoloLectura({ estado: character.status, esMaster: user.role === "MASTER" })) {
    return { error: "La ficha está en revisión: retírala para seguir editando" };
  }
  const estados = leerEstados(character.estados);
  // Recorte exacto de la vida con los activables puestos (A5b): parseSheet topa con el posible.
  const sheet = reconciliarVidaConEstados(parseSheet(character.stats), estados);
  const ajuste = ajustesDeCoste(especieDeFicha(sheet));
  return {
    sheet,
    ajuste,
    ajusteXp: ajusteCosteDeSubida(ajuste, sheet, true),
    bonosDisciplina: bonosDeDisciplina(modificadoresActivos(sheet)),
    estado: character.status,
    aprobada: character.status === "APPROVED",
    snapshot: parseSnapshot(character.approvedSnapshot),
    xp: character.xp,
    creditos: character.creditos,
    esMaster: user.role === "MASTER",
    userId: user.id,
    estados,
  };
}

async function persist(
  characterId: string,
  sheet: Sheet,
  name?: string,
): Promise<SaveResult> {
  await prisma.character.update({
    where: { id: characterId },
    data: name === undefined ? { stats: sheet } : { name, stats: sheet },
  });
  return { ok: true, sheet };
}

// Aprobada: ya no es el pool de creación, es progresión con XP. Solo se
// puede subir (nunca bajar del valor actual — "comprado" con XP es tan
// firme como comprado en creación) y el techo pasa a ser el del sistema
// (6), no el de creación (4). El coste es el mismo Nivel×factor de
// "Coste y progresión" (docs/sistema.md), sumado nivel a nivel desde el
// valor actual hasta el pedido.
export async function setAtributoAction(
  characterId: string,
  atributoId: AtributoId,
  value: number,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  if (!ctx.aprobada) {
    return persist(characterId, setAtributoValue(ctx.sheet, atributoId, value));
  }

  const actual = ctx.sheet.atributos[atributoId];
  const objetivo = Math.max(actual, Math.min(ATRIBUTO_MAX, Math.round(value)));
  if (objetivo === actual) return { ok: true, sheet: ctx.sheet, xp: ctx.xp };

  const coste = costeSubidaXp({ tipo: "atributo" }, actual, objetivo, ctx.ajuste);
  if (coste > ctx.xp) return { ok: false, error: "No tienes XP suficiente" };

  const sheet: Sheet = { ...ctx.sheet, atributos: { ...ctx.sheet.atributos, [atributoId]: objetivo } };
  const xp = ctx.xp - coste;
  await prisma.character.update({ where: { id: characterId }, data: { stats: sheet, xp } });
  revalidatePath(`/characters/${characterId}`);
  revalidarPanelMaster();
  return { ok: true, sheet, xp };
}

export async function setHabilidadAction(
  characterId: string,
  habilidadId: HabilidadId,
  value: number,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  if (!ctx.aprobada) {
    return persist(characterId, setHabilidadValue(ctx.sheet, habilidadId, value, ctx.ajuste));
  }

  const actual = ctx.sheet.habilidades[habilidadId].valor;
  const objetivo = Math.max(actual, Math.min(HABILIDAD_MAX, Math.round(value)));
  if (objetivo === actual) return { ok: true, sheet: ctx.sheet, xp: ctx.xp };

  const coste = costeSubidaXp({ tipo: "habilidad", id: habilidadId }, actual, objetivo, ctx.ajusteXp);
  if (coste > ctx.xp) return { ok: false, error: "No tienes XP suficiente" };

  const sheet: Sheet = {
    ...ctx.sheet,
    habilidades: {
      ...ctx.sheet.habilidades,
      [habilidadId]: { ...ctx.sheet.habilidades[habilidadId], valor: objetivo },
    },
  };
  const xp = ctx.xp - coste;
  await prisma.character.update({ where: { id: characterId }, data: { stats: sheet, xp } });
  revalidatePath(`/characters/${characterId}`);
  revalidarPanelMaster();
  return { ok: true, sheet, xp };
}

// Mismo esquema que atributos/habilidades: en creación, pool de la letra de
// Psiónica; aprobada, solo subir y pagando XP. Los requisitos entre
// disciplinas (psionica.ts) se aplican en los dos casos.
export async function setDisciplinaAction(
  characterId: string,
  disciplinaId: DisciplinaId,
  value: number,
): Promise<SaveResult> {
  if (!esDisciplinaId(disciplinaId)) return { ok: false, error: "Disciplina desconocida" };
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  if (!ctx.aprobada) {
    return persist(characterId, setDisciplinaValue(ctx.sheet, disciplinaId, value, ctx.ajuste, ctx.bonosDisciplina));
  }

  const actual = nivelDisciplina(ctx.sheet, disciplinaId);
  const objetivo = Math.max(actual, Math.min(DISCIPLINA_MAX, Math.round(value)));
  if (objetivo === actual) return { ok: true, sheet: ctx.sheet, xp: ctx.xp };

  const sheet = setNivelDisciplina(ctx.sheet, disciplinaId, objetivo, ctx.bonosDisciplina);
  if (sheet === ctx.sheet) return { ok: false, error: "No cumples el requisito de la disciplina" };

  const coste = costeSubidaXp({ tipo: "disciplina", id: disciplinaId }, actual, objetivo, ctx.ajuste);
  if (coste > ctx.xp) return { ok: false, error: "No tienes XP suficiente" };

  const xp = ctx.xp - coste;
  await prisma.character.update({ where: { id: characterId }, data: { stats: sheet, xp } });
  revalidatePath(`/characters/${characterId}`);
  revalidarPanelMaster();
  return { ok: true, sheet, xp };
}

// Dotes (docs/sistema.md §9.1, tanda D1, sin efectos). Mismo esquema que las
// disciplinas: en creación gasta el pool de la letra de Dotes; aprobada, cuesta XP
// (el mismo número que su coste). Requisitos con los valores de juego (especie
// incluida) y el pool/XP se comprueban aquí con la ficha de la base, nunca con lo
// que diga la pantalla. El máster compra con las mismas reglas (decisión del usuario).
export async function comprarDoteAction(characterId: string, entrada: unknown): Promise<SaveResult> {
  const parsed = doteCompradaSchema.safeParse(entrada);
  if (!parsed.success) return { ok: false, error: "Dote inválida" };
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const res = comprarDote(ctx.sheet, parsed.data, {
    valores: valoresRequisitoDeFicha(ctx.sheet),
    aprobada: ctx.aprobada,
    xp: ctx.xp,
  });
  if (!res.ok) return { ok: false, error: res.error };
  if (!ctx.aprobada) return persist(characterId, res.sheet);

  const xp = ctx.xp - res.costeXp;
  await prisma.character.update({ where: { id: characterId }, data: { stats: res.sheet, xp } });
  revalidatePath(`/characters/${characterId}`);
  revalidarPanelMaster();
  return { ok: true, sheet: res.sheet, xp };
}

// Solo en creación, y nunca una dote que es requisito de otra comprada. Aprobada no
// se vende ninguna (la foto de aprobación dice cuáles venían de creación).
export async function quitarDoteAction(characterId: string, entrada: unknown): Promise<SaveResult> {
  const parsed = doteCompradaSchema.safeParse(entrada);
  if (!parsed.success) return { ok: false, error: "Dote inválida" };
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const res = quitarDote(ctx.sheet, parsed.data, { aprobada: ctx.aprobada, foto: ctx.snapshot?.dotes ?? null });
  if (!res.ok) return { ok: false, error: res.error };
  return persist(characterId, res.sheet);
}

// Reparto de letras (creación por prioridad, docs/sistema.md §2). Congelado
// tras aprobar, igual que atributos/habilidades. El caso de Recursos es
// especial: la letra fija los créditos iniciales (Character.creditos), un
// campo que normalmente solo toca el máster — aquí es seguro porque el valor
// sale de una tabla fija (RECURSOS_POR_LETRA), el jugador nunca escribe el
// número a mano.
export async function setPrioridadAction(
  characterId: string,
  categoria: CategoriaPrioridad,
  letra: LetraPrioridad | null,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  if (ctx.aprobada) return { ok: false, error: "La ficha ya está aprobada" };

  const sheet = setPrioridad(ctx.sheet, categoria, letra);
  if (categoria === "recursos") {
    const creditos = sheet.prioridades.recursos
      ? RECURSOS_POR_LETRA[sheet.prioridades.recursos].creditos
      : 0;
    await prisma.character.update({
      where: { id: characterId },
      data: { stats: sheet, creditos },
    });
    // El creditos que se acaba de fijar lo lee la tira de máster de esta
    // misma página (server component) y el panel /master — sin esto se
    // quedan con el valor viejo hasta un F5. Por el mismo motivo va también
    // en la respuesta: es lo que CharacterSheet reconcilia para que la
    // Tienda no siga mostrando el saldo de antes de elegir la letra.
    revalidatePath(`/characters/${characterId}`);
    revalidarPanelMaster();
    return { ok: true, sheet, creditos };
  }
  return persist(characterId, sheet);
}

export async function addEspecialidadAction(
  characterId: string,
  habilidadId: HabilidadId,
  especialidadId: string,
): Promise<SaveResult> {
  const parsed = especialidadDeHabilidadSchema.safeParse({ habilidadId, especialidadId });
  if (!parsed.success) return { ok: false, error: "Especialidad inválida para esa habilidad" };
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(characterId, addEspecialidad(ctx.sheet, parsed.data.habilidadId, parsed.data.especialidadId, ctx.ajuste));
}

export async function removeEspecialidadAction(
  characterId: string,
  habilidadId: HabilidadId,
  especialidadId: string,
): Promise<SaveResult> {
  const parsed = especialidadDeHabilidadSchema.safeParse({ habilidadId, especialidadId });
  if (!parsed.success) return { ok: false, error: "Especialidad inválida para esa habilidad" };
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(characterId, removeEspecialidad(ctx.sheet, parsed.data.habilidadId, parsed.data.especialidadId));
}

// Fuera el aviso de especialidades no reconocidas por la migración v17.
export async function descartarAvisoEspecialidadesAction(characterId: string): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(characterId, descartarAvisoEspecialidades(ctx.sheet));
}

// Comprar = equipar: no hay inventario aparte (ver lib/rules/equipo.ts), así
// que el coste se cobra en el mismo golpe que se añade la pieza. El precio
// se recalcula aquí con el catálogo — no se confía en lo que mande el
// cliente — y si no llega a cubrirlo, se rechaza sin tocar ni la ficha ni
// los créditos.
export async function equiparAction(
  characterId: string,
  pieza: PiezaEquipada,
): Promise<SaveResult> {
  // El shape llega del cliente sin garantías: se valida aquí, no solo se confía
  // en que `equipar` recorte lo que no reconoce. `viaEspecie` no se acepta del
  // cliente: lo pone el servidor abajo.
  const parsed = piezaEquipadaEntradaSchema.safeParse(pieza);
  if (!parsed.success) return { ok: false, error: "Pieza de equipo inválida" };
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  let nueva: PiezaEquipada = parsed.data;
  if (aumentoPorId(nueva.catalogoId)) return { ok: false, error: "Los aumentos se compran desde su ficha de la Tienda" };

  // Tope de rareza por letra de Recursos (docs/sistema.md §2): solo en
  // creación, nunca al máster (decisión del usuario, 2026-09-11) — aprobada
  // o editando el máster, cualquier rareza pasa siempre que llegue el saldo.
  // Excepción de especie (kerzul del Arköru, §14.6): la decide
  // puedeEquiparSinRareza y la pieza queda marcada `viaEspecie`; se paga igual.
  if (!ctx.aprobada && !ctx.esMaster) {
    const letra = ctx.sheet.prioridades.recursos;
    const tope = letra ? RECURSOS_POR_LETRA[letra].rareza : null;
    const compra = topeRarezaDeCompra(ctx.sheet, nueva.catalogoId, rarezaDePieza(nueva), tope, {
      estado: ctx.estado,
      esMaster: ctx.esMaster,
      excepciones: excepcionesRareza(especieDeFicha(ctx.sheet)),
    });
    if (compra.tipo === "bloqueada") return { ok: false, error: compra.motivo };
    if (compra.tipo === "viaEspecie") nueva = { ...nueva, viaEspecie: true };
  }

  const coste = costeDePieza(nueva);
  if (coste > ctx.creditos) return { ok: false, error: "No tienes créditos suficientes" };

  const sheet = equipar(ctx.sheet, nueva);
  if (sheet === ctx.sheet) return { ok: false, error: "Pieza de equipo inválida" };

  const creditos = ctx.creditos - coste;
  await prisma.character.update({ where: { id: characterId }, data: { stats: sheet, creditos } });
  revalidatePath(`/characters/${characterId}`);
  revalidarPanelMaster();
  return { ok: true, sheet, creditos };
}

// Aumentos (docs/sistema.md §11.3, A0). Requisitos, subir de nivel (paga la
// diferencia), elección y reparto bolsa → créditos los decide comprarAumento
// (rules/aumentos.ts) con la ficha de la base; nunca con lo que mande la pantalla.
// Vale también con la ficha aprobada (la bolsa también se gasta, §11.3).
export async function comprarAumentoAction(characterId: string, entrada: unknown): Promise<SaveResult> {
  const parsed = compraAumentoSchema.safeParse(entrada);
  if (!parsed.success) return { ok: false, error: "Aumento inválido" };
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const compra = parsed.data;

  // Tope de rareza por letra de Recursos, como el resto del equipo (solo en creación y
  // nunca al máster). Sin excepción de especie: el kerzul no es un aumento.
  // La letra de Recursos topa también los aumentos, como al resto del equipo (usuario,
  // 2026-10-22).
  if (!ctx.aprobada && !ctx.esMaster) {
    const letra = ctx.sheet.prioridades.recursos;
    const tope = letra ? RECURSOS_POR_LETRA[letra].rareza : null;
    const rareza = rarezaDePieza({ instanciaId: "-", catalogoId: compra.catalogoId, nivel: compra.nivel });
    if (tope && !rarezaPermitida(rareza, tope)) {
      return { ok: false, error: `Tu letra de Recursos no llega a ${rareza}: tope ${tope}.` };
    }
  }

  const res = comprarAumento(ctx.sheet, compra, {
    libre: false,
    instanciaId: nuevaInstanciaId(),
    bolsaTotal: bolsaDeAumentos(especieDeFicha(ctx.sheet)),
    creditos: ctx.creditos,
  });
  if (!res.ok) return { ok: false, error: res.error };

  const creditos = ctx.creditos - res.pago.deCreditos;
  await prisma.character.update({ where: { id: characterId }, data: { stats: res.sheet, creditos } });
  revalidatePath(`/characters/${characterId}`);
  revalidarPanelMaster();
  return { ok: true, sheet: res.sheet, creditos };
}

// Desequipar devuelve el coste íntegro de lo retirado (decisión del usuario,
// 2026-09-10) — incluida cualquier mejora o subsistema que colgara de la
// pieza, porque desequipar() se los lleva por delante en el mismo golpe. Los
// aumentos, solo en creación (usuario, 2026-10-22): la bolsa a la bolsa y el resto
// a créditos; aprobada la ficha no se revenden (costeDeRetirar los cuenta a 0).
export async function desequiparAction(
  characterId: string,
  instanciaId: string,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const devolucion = ctx.aprobada ? null : devolucionAumento(ctx.sheet, instanciaId);
  const refund = costeDeRetirar(ctx.sheet, instanciaId) + (devolucion?.deCreditos ?? 0);
  // retirarPieza recorta la vida actual si el máximo baja (Hipertrofia y los +1, A1).
  const sinPieza = retirarPieza(ctx.sheet, instanciaId, ctx.estados);
  const sheet = devolucion
    ? { ...sinPieza, bolsaAumentosGastada: Math.max(0, sinPieza.bolsaAumentosGastada - devolucion.deBolsa) }
    : sinPieza;
  const creditos = ctx.creditos + refund;
  await prisma.character.update({ where: { id: characterId }, data: { stats: sheet, creditos } });
  revalidatePath(`/characters/${characterId}`);
  revalidarPanelMaster();
  return { ok: true, sheet, creditos };
}

// RECURSOS (docs/tareas.md, fase 6b): gasto manual (+/-), igual que PG/fatiga
// en combate, pero sobre la ficha persistente — sin coste en créditos, es
// solo anotar cuánto queda.
export async function ajustarRecursoAction(
  characterId: string,
  instanciaId: string,
  delta: number,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(characterId, ajustarRecurso(ctx.sheet, instanciaId, delta));
}

// Vida y fatiga (docs/tareas.md, 2026-09-27): recurso persistente del propio
// personaje, no de una instancia de equipo — mismo criterio "libre de
// créditos" que ajustarRecursoAction, solo anota cuánto queda.
export async function ajustarVidaAction(characterId: string, delta: number): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(characterId, ajustarVida(ctx.sheet, delta, ctx.estados));
}

export async function ajustarFatigaAction(characterId: string, delta: number): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(characterId, ajustarFatiga(ctx.sheet, delta, ctx.estados));
}

// Pago de fatiga de un poder psiónico, de las casillas de una tirada y de las acciones sin
// dado; con `permiteTemporal` (Proeza) el exceso sobre la fatiga que se tiene pasa a fatiga
// temporal. En combate se cobra también de la foto (guardarFichaConFotos, A5b).
export async function pagarFatigaAction(
  characterId: string,
  coste: number,
  permiteTemporal: boolean,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const sheet = pagarFatiga(ctx.sheet, coste, permiteTemporal === true);
  await guardarFichaConFotos(characterId, ctx.sheet, sheet);
  return { ok: true, sheet };
}

// Devolver fatiga que se acaba de cobrar (desmarcar Densificar en "Bloquear daño", A4b): como
// ajustarFatigaAction, pero en combate también a la foto, para deshacer lo que hizo
// pagarFatigaAction. El +/- de Recursos sigue siendo solo de la ficha.
export async function devolverFatigaAction(characterId: string, cantidad: number): Promise<SaveResult> {
  if (!Number.isInteger(cantidad) || cantidad <= 0 || cantidad > 99) return { ok: false, error: "Cantidad no válida" };
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const sheet = ajustarFatiga(ctx.sheet, cantidad, ctx.estados);
  await guardarFichaConFotos(characterId, ctx.sheet, sheet);
  return { ok: true, sheet };
}

export async function ajustarFatigaTemporalAction(characterId: string, delta: number): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(characterId, ajustarFatigaTemporal(ctx.sheet, delta));
}

export async function terminarEscenaAction(characterId: string): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(characterId, terminarEscena(ctx.sheet));
}

// Usos "una vez por escena" de los aumentos (A4a, usosEscena.ts): se gastan al tirar con la
// casilla marcada (la lista la da montarTirada en el cliente) y se liberan a mano en Recursos.
// Solo restringen al propio jugador, así que basta con validar que son ids del catálogo
// (gastarUsosEscena descarta el resto).
const usosEscenaSchema = z.array(z.string().min(1).max(60)).min(1).max(10);
const usoEscenaSchema = z.string().min(1).max(60);

export async function gastarUsosEscenaAction(characterId: string, ids: unknown): Promise<SaveResult> {
  const parsed = usosEscenaSchema.safeParse(ids);
  if (!parsed.success) return { ok: false, error: "Usos no válidos" };
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(characterId, gastarUsosEscena(ctx.sheet, parsed.data));
}

export async function liberarUsoEscenaAction(characterId: string, id: unknown): Promise<SaveResult> {
  const parsed = usoEscenaSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Uso no válido" };
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(characterId, liberarUsoEscena(ctx.sheet, parsed.data));
}

// Acciones propias de aumento (A4a, aumentosAcciones.ts). El servidor comprueba que la ficha
// tiene la acción (pieza equipada, requisito sano, nivel) y que llega la fatiga; cobra y, en
// Sanar letal, suma la vida. Las que quitan o bajan un estado (Cortar hemorragia, Sacudir
// miedo, Dominar terror) son la única vía del jugador a Character.estados, que si no solo
// escribe el máster: solo ese estado, por el mismo camino que el máster
// (cambiarEstadosDePersonajes) y con una entrada en su registro, con el jugador de autor, que
// el máster puede deshacer. Deshacer devuelve el estado, no la fatiga.
// Sin el estado, la acción se cobra igual y el mensaje lo dice. Con estado, el cobro va en la
// misma transacción que el cambio de estado (`preparar` de cambiarEstadosDePersonajes).
// Activables (A5a): activar pone el estado propio del aumento (renueva si ya estaba) y
// desactivar lo quita, por el mismo camino. `extra`: lo del modal, que valida
// usoDeAccionAumento: `eleccion` (Neuroprótesis 2: a qué va el +2) y `repetida` (A5b: la casilla
// "ya usada" de la acción adicional, que cobra 3 y, con el nivel 4, pone su estado).
// En combate, lo que se cobra (o se cura) va también a la foto del combatiente (A5b).
const accionAumentoSchema = z.string().min(1).max(60);
const extraAccionAumentoSchema = z
  .object({ eleccion: z.string().min(1).max(40).optional(), repetida: z.boolean().optional() })
  .optional();

export async function usarAccionAumentoAction(characterId: string, accionId: unknown, extra?: unknown): Promise<SaveResult> {
  const parsed = accionAumentoSchema.safeParse(accionId);
  const parsedExtra = extraAccionAumentoSchema.safeParse(extra ?? undefined);
  if (!parsed.success || !parsedExtra.success) return { ok: false, error: "Acción no válida" };
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const uso = usoDeAccionAumento(ctx.sheet, ctx.estados, parsed.data, parsedExtra.data ?? {});
  if (!uso.ok) return { ok: false, error: uso.error };
  if (!uso.op) {
    await guardarFichaConFotos(characterId, ctx.sheet, uso.sheet);
    return { ok: true, sheet: uso.sheet, mensaje: uso.mensaje };
  }
  const coste = uso.coste;
  const hecho = await cambiarEstadosDePersonajes(
    [characterId],
    uso.op,
    { userId: ctx.userId, motivo: `${uso.accion.label} (${uso.accion.fuente}), desde la ficha` },
    // El cobro, en la misma transacción que el estado; cambiarEstadosDePersonajes lo lleva
    // también a la foto del combate abierto.
    coste > 0 ? (s) => pagarFatiga(s, coste, false) : undefined,
  );
  if (!hecho) return { ok: false, error: "Personaje no encontrado" };
  // Cambiar el estado puede tocar la vida (S75): la ficha que vale es la de la base.
  const fila = await prisma.character.findUnique({ where: { id: characterId }, select: { stats: true, estados: true } });
  const sheet = fila ? reconciliarVidaConEstados(parseSheet(fila.stats), leerEstados(fila.estados)) : uso.sheet;
  return { ok: true, sheet, mensaje: uso.mensaje };
}

// "Recargar" (cargador de balas / batería portátil, S17/S18 de sistema.md):
// precio fijo, no se confía en lo que calcule el cliente — se recalcula aquí
// con el catálogo, igual que equiparAction.
export async function comprarRecargaAction(
  characterId: string,
  instanciaId: string,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const resultado = comprarRecarga(ctx.sheet, instanciaId);
  if (!resultado) return { ok: false, error: "No hay ningún recurso que recargar ahí." };
  if (resultado.coste > ctx.creditos) return { ok: false, error: "No tienes créditos suficientes" };

  const creditos = ctx.creditos - resultado.coste;
  await prisma.character.update({
    where: { id: characterId },
    data: { stats: resultado.sheet, creditos },
  });
  revalidatePath(`/characters/${characterId}`);
  revalidarPanelMaster();
  return { ok: true, sheet: resultado.sheet, creditos };
}

// Materiales (docs/tareas.md, tarea 8): mismo patrón que RECURSOS, pero
// sobre el pool de personaje en vez de una instancia de equipo.
export async function ajustarMaterialAction(
  characterId: string,
  tier: MaterialTier,
  delta: number,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(characterId, ajustarMaterial(ctx.sheet, tier, delta));
}

// Precio recalculado en servidor, igual que comprarRecargaAction — no se
// confía en lo que mande el cliente.
export async function comprarMaterialAction(
  characterId: string,
  tier: MaterialTier,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const resultado = comprarMaterial(ctx.sheet, tier);
  if (resultado.coste > ctx.creditos) return { ok: false, error: "No tienes créditos suficientes" };

  const creditos = ctx.creditos - resultado.coste;
  await prisma.character.update({
    where: { id: characterId },
    data: { stats: resultado.sheet, creditos },
  });
  revalidatePath(`/characters/${characterId}`);
  revalidarPanelMaster();
  return { ok: true, sheet: resultado.sheet, creditos };
}

// Granadas (docs/tareas.md, 2026-09-27): comprar suma 1 unidad al recurso en
// vez de equipar — mismo tope de rareza que equiparAction (solo en
// creación, nunca al máster), precio recalculado en servidor con el
// catálogo, igual que el resto de compras.
export async function comprarGranadaAction(
  characterId: string,
  catalogoId: string,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const granada = MUNICION_GRANADA.find((g) => g.id === catalogoId);
  if (!granada) return { ok: false, error: "Granada inválida" };

  if (!ctx.aprobada && !ctx.esMaster) {
    const letra = ctx.sheet.prioridades.recursos;
    const tope = letra ? RECURSOS_POR_LETRA[letra].rareza : null;
    if (tope && !rarezaPermitida(granada.rareza, tope)) {
      return { ok: false, error: `Tu letra de Recursos no llega a ${granada.rareza}: tope ${tope}.` };
    }
  }

  const resultado = comprarGranada(ctx.sheet, catalogoId);
  if (!resultado) return { ok: false, error: "Granada inválida" };
  if (resultado.coste > ctx.creditos) return { ok: false, error: "No tienes créditos suficientes" };

  const creditos = ctx.creditos - resultado.coste;
  await prisma.character.update({
    where: { id: characterId },
    data: { stats: resultado.sheet, creditos },
  });
  revalidatePath(`/characters/${characterId}`);
  revalidarPanelMaster();
  return { ok: true, sheet: resultado.sheet, creditos };
}

// Gasto manual (+/-) sobre el recurso, sin coste en créditos — mismo patrón
// que ajustarRecursoAction/ajustarMaterialAction.
export async function ajustarGranadaAction(
  characterId: string,
  catalogoId: string,
  delta: number,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(characterId, ajustarGranada(ctx.sheet, catalogoId, delta));
}

// Fármacos (docs/prompt-gasto-recursos.md, Fase 2): mismo patrón exacto que
// Granadas — comprar suma 1 unidad al recurso, con el mismo tope de rareza
// de creación y el mismo precio recalculado en servidor.
export async function comprarFarmacoAction(
  characterId: string,
  catalogoId: string,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const farmaco = FARMACOS.find((f) => f.id === catalogoId);
  if (!farmaco) return { ok: false, error: "Fármaco inválido" };

  if (!ctx.aprobada && !ctx.esMaster) {
    const letra = ctx.sheet.prioridades.recursos;
    const tope = letra ? RECURSOS_POR_LETRA[letra].rareza : null;
    if (tope && !rarezaPermitida(farmaco.rareza, tope)) {
      return { ok: false, error: `Tu letra de Recursos no llega a ${farmaco.rareza}: tope ${tope}.` };
    }
  }

  const resultado = comprarFarmaco(ctx.sheet, catalogoId);
  if (!resultado) return { ok: false, error: "Fármaco inválido" };
  if (resultado.coste > ctx.creditos) return { ok: false, error: "No tienes créditos suficientes" };

  const creditos = ctx.creditos - resultado.coste;
  await prisma.character.update({
    where: { id: characterId },
    data: { stats: resultado.sheet, creditos },
  });
  revalidatePath(`/characters/${characterId}`);
  revalidarPanelMaster();
  return { ok: true, sheet: resultado.sheet, creditos };
}

// Gasto manual (+/-) sobre el recurso, sin coste en créditos — mismo patrón
// que ajustarGranadaAction. También la usa AccionesTab.tsx (onGastarFarmaco)
// para el gasto automático de 1 dosis al confirmar "Usar" (Fase 2, paso 2).
export async function ajustarFarmacoAction(
  characterId: string,
  catalogoId: string,
  delta: number,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(characterId, ajustarFarmaco(ctx.sheet, catalogoId, delta));
}

// Munición especial (docs/tareas.md, 2026-09-28): un lote por compra, mismo
// tope de rareza de creación y precio recalculado en servidor que Granadas.
// comprarMunicionEspecial() ya rechaza si ningún arma está habilitada.
export async function comprarMunicionEspecialAction(
  characterId: string,
  municionId: string,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const municion = municionEspecialPorId(municionId);
  if (!municion) return { ok: false, error: "Munición inválida" };

  if (!ctx.aprobada && !ctx.esMaster) {
    const letra = ctx.sheet.prioridades.recursos;
    const tope = letra ? RECURSOS_POR_LETRA[letra].rareza : null;
    if (tope && !rarezaPermitida(municion.rareza, tope)) {
      return { ok: false, error: `Tu letra de Recursos no llega a ${municion.rareza}: tope ${tope}.` };
    }
  }

  const resultado = comprarMunicionEspecial(ctx.sheet, municionId);
  if (!resultado) return { ok: false, error: `Ningún arma equipada admite ${municion.label.toLowerCase()}.` };
  if (resultado.coste > ctx.creditos) return { ok: false, error: "No tienes créditos suficientes" };

  const creditos = ctx.creditos - resultado.coste;
  await prisma.character.update({
    where: { id: characterId },
    data: { stats: resultado.sheet, creditos },
  });
  revalidatePath(`/characters/${characterId}`);
  revalidarPanelMaster();
  return { ok: true, sheet: resultado.sheet, creditos };
}

export async function ajustarMunicionEspecialAction(
  characterId: string,
  municionId: string,
  delta: number,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(characterId, ajustarMunicionEspecial(ctx.sheet, municionId, delta));
}

// Reparar (docs/tareas.md, tarea 8): sin requisito de VTF (a diferencia de
// Fabricar), pero sí de rareza — mismo criterio que equiparAction con el
// tope de rareza: se valida aquí, con rarezaPermitida(), ANTES de llamar a
// la función pura, que ya no vuelve a comprobarlo (ver su comentario).
//
// `exito`: mismo criterio que fabricarAction — la tirada (Perspicacia +
// habilidad técnica, -4 a la dificultad) se juega en el cliente (AccionModal,
// dentro de ReparaFabricaModal.tsx) antes de llamar aquí.
export async function repararAction(
  characterId: string,
  instanciaId: string,
  tier: MaterialTier,
  exito: boolean,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const pieza = ctx.sheet.equipo.find((p) => p.instanciaId === instanciaId);
  if (!pieza) return { ok: false, error: "Esa pieza ya no está equipada." };

  const rarezaPieza = rarezaDePieza(pieza);
  const tope = rarezaMaterial(tier);
  if (!tope || !rarezaPermitida(rarezaPieza, tope)) {
    return { ok: false, error: `Necesitas material de rareza ${rarezaPieza ?? "?"} o superior.` };
  }
  if (ctx.sheet.materiales[tier] < 1) return { ok: false, error: "No tienes materiales de ese tier." };

  const sheet = repararPieza(ctx.sheet, instanciaId, tier, exito);
  if (sheet === ctx.sheet) return { ok: false, error: "Esa pieza ya está al máximo de durabilidad." };
  return persist(characterId, sheet);
}

// Fabricar (docs/tareas.md, tarea 8): requiere la VTF equipada (a
// diferencia de Reparar) y rareza suficiente, ambos validados aquí ANTES de
// llamar a la función pura — mismo criterio que equiparAction/repararAction.
// La UI solo manda el catalogoId, nunca coste ni rareza: se recalculan aquí
// con el catálogo, igual que el resto de acciones de compra.
//
// `exito`: el cliente ya tiró el dado (mismo AccionModal que cualquier otra
// tirada, ver FabricarSeccion.tsx) antes de llamar aquí — el servidor no
// repite esa tirada, igual que no repite ninguna otra del motor (el azar de
// TODAS las tiradas de la app es del cliente, no hay RNG de servidor en
// ningún sitio; confiar en el cliente para el resultado no es un hueco nuevo
// de esta feature). Lo que el servidor sigue validando es lo de siempre:
// VTF equipada, rareza y stock — `exito` solo decide si, además de gastar el
// material, se entrega la pieza.
export async function fabricarAction(
  characterId: string,
  catalogoId: string,
  tier: MaterialTier,
  exito: boolean,
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  if (!tieneVtf(ctx.sheet)) {
    return { ok: false, error: "Necesitas la Valija Táctica de Fabricación equipada." };
  }

  const cat = piezaFabricablePorId(catalogoId);
  if (!cat) return { ok: false, error: "Esa pieza no se puede fabricar." };

  const tope = rarezaMaterial(tier);
  if (!tope || !rarezaPermitida(cat.rareza, tope)) {
    return { ok: false, error: `Necesitas material de rareza ${cat.rareza} o superior.` };
  }

  const sheet = fabricar(ctx.sheet, catalogoId, tier, exito);
  if (sheet === ctx.sheet) return { ok: false, error: "No tienes materiales suficientes de ese tier." };
  return persist(characterId, sheet);
}

// Devuelve atributos y habilidades a cero. La identidad se conserva.
// Bloqueado en fichas aprobadas: resetear es vender todo de golpe.
export async function resetBuildAction(characterId: string): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  if (ctx.aprobada) return { ok: false, error: "La ficha ya está aprobada" };
  return persist(characterId, resetBuild(ctx.sheet));
}

// Especie, casta y linaje (docs/sistema.md §14.2-14.3). Única vía para cambiarlos:
// saveIdentityAction ya no los toca. elegirEspecie valida la combinación, rechaza el
// cambio del jugador en una ficha aprobada y, en borrador, resetea todo salvo el
// Personaje; con reset, los créditos vuelven a los de la letra de Recursos (mismo
// valor que fija setPrioridadAction). El reset lo aplica siempre el servidor, haya
// avisado la pantalla o no.
export async function setEspecieAction(
  characterId: string,
  eleccion: EleccionEspecie,
): Promise<SaveResult> {
  const parsed = eleccionEspecieSchema.safeParse(eleccion);
  if (!parsed.success) return { ok: false, error: "Elección de especie inválida" };
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const res = elegirEspecie(ctx.sheet, parsed.data, {
    aprobada: ctx.aprobada,
    esMaster: ctx.esMaster,
    libre: false,
  });
  if ("error" in res) return { ok: false, error: res.error };
  // El reset deja vida y fatiga en el centinela 999 y una especie nueva puede bajar el
  // máximo: se recortan aquí, no al releer, para que la pantalla no vea "999/9".
  const sheet = reconciliarVidaConEstados(res.sheet, ctx.estados);
  if (!res.reseteada) return persist(characterId, sheet);

  const creditos = creditosDeLaLetra(sheet.prioridades);
  await prisma.character.update({ where: { id: characterId }, data: { stats: sheet, creditos } });
  revalidatePath(`/characters/${characterId}`);
  revalidarPanelMaster();
  return { ok: true, sheet, creditos };
}

export async function saveIdentityAction(
  characterId: string,
  patch: {
    name: string;
    edad: number | null;
    altura: number | null;
    peso: number | null;
    trasfondo: string;
    motivacion: string;
  },
): Promise<SaveResult> {
  const ctx = await loadEditable(characterId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const nameParsed = characterCreateSchema.safeParse({ name: patch.name });
  if (!nameParsed.success) return { ok: false, error: "El nombre no es válido" };

  const numeroOpcional = (v: number | null) => (v === null ? null : clampInt(v, 0, 999));

  return persist(
    characterId,
    {
      ...ctx.sheet,
      edad: numeroOpcional(patch.edad),
      altura: numeroOpcional(patch.altura),
      peso: numeroOpcional(patch.peso),
      trasfondo: String(patch.trasfondo ?? "").slice(0, 2000),
      motivacion: String(patch.motivacion ?? "").slice(0, 500),
    },
    nameParsed.data.name,
  );
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

// --- Envío a revisión (docs/tareas.md, "Envío a revisión") ----------------------
// No pasan por loadEditable: retirar es justo lo que hace un jugador con la ficha en
// solo lectura. El permiso es el mismo (canEditCharacter) más la transición.

export type RevisionResult = { ok: true } | { ok: false; error: string };

async function cambiarEstadoRevision(
  rawId: string,
  accion: "enviar" | "retirar",
): Promise<RevisionResult> {
  const parsed = characterIdSchema.safeParse(rawId);
  if (!parsed.success) return { ok: false, error: "Ficha inválida" };
  const characterId = parsed.data;

  const user = await requireUser();
  const character = await prisma.character.findUnique({ where: { id: characterId } });
  if (!character) return { ok: false, error: "Personaje no encontrado" };
  if (!canEditCharacter(user, character)) return { ok: false, error: "No tienes permiso para editar esta ficha" };

  const res = transicionRevision({
    estado: character.status,
    accion,
    esMaster: user.role === "MASTER",
    esDueno: character.ownerId === user.id,
  });
  if ("error" in res) return { ok: false, error: res.error };

  if (accion === "enviar") {
    // Con el nombre y la ficha de la base, no con lo que diga la pantalla.
    const sheet = parseSheet(character.stats);
    const pasos = pasosPersonaje({ sheet, nombre: character.name, aprobada: false });
    const falta = faltaParaEnviar(
      pasos,
      faltasDeDotes(sheet, valoresRequisitoDeFicha(sheet)),
      excesosDePuntos(sheet, ajustesDeCoste(especieDeFicha(sheet))),
    );
    if (falta.length) return { ok: false, error: `Falta: ${falta.join(", ")}` };
  }

  await prisma.character.update({
    where: { id: characterId },
    data:
      accion === "enviar"
        ? { status: res.estado, submittedAt: new Date(), reviewNote: null }
        : { status: res.estado, submittedAt: null },
  });
  revalidarPanelMaster();
  revalidatePath("/characters");
  revalidatePath(`/characters/${characterId}`);
  return { ok: true };
}

export async function enviarARevisionAction(characterId: string): Promise<RevisionResult> {
  return cambiarEstadoRevision(characterId, "enviar");
}

export async function retirarRevisionAction(characterId: string): Promise<RevisionResult> {
  return cambiarEstadoRevision(characterId, "retirar");
}
