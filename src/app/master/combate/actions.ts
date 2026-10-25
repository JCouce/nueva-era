"use server";

// Fase 6b (docs/fase-6b.md, subtarea 1.3): server actions esqueleto del
// gestor de combate. Sin UI todavía (bloque 2) — esto es solo las acciones
// y sus guardas, para que 2.x tenga contra qué construir. Mismo patrón de
// retorno que characters/[id]/actions.ts (ok/error tipado) y no el de
// master/actions.ts (FormData + no-op silencioso): esto va a alimentar una
// consola interactiva, no formularios sueltos, y ahí conviene poder
// mostrarle al máster por qué falló una acción.
import { refresh, revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, canAdjustCombatiente } from "@/lib/auth-helpers";
import {
  ajustarDanioVital,
  danioDeFoto,
  parseSheet,
  reconciliarVidaConEstados,
  resolverFicha,
  VITALIDAD_DE_FICHA,
  vitalidadAlEntrarEnCombate,
  leerEstados,
  estadoActivoCon,
  estadosAlCerrarVuelta,
  pasarTurno,
  vidaTrasCambioDeEstados,
  type CategoriaDanio,
  type DuracionEstado,
  type InmuneAlAplicar,
  type OperacionEstado,
} from "@/lib/rules";
import {
  ajustarDanioCombatienteSchema,
  ajustarVidaEnCombateSchema,
  aplicarEstadoEnCombateSchema,
  quitarEstadoEnCombateSchema,
} from "@/lib/validation";
import { ajustarVidaDeCombatientes } from "@/lib/vidaMando";
import { cambiarEstadosDeNpcs, cambiarEstadosDePersonajes, revalidarEstados } from "@/lib/estadosPersonaje";
import type { MandoResult } from "../actions";

export type CombateResult = { ok: true } | { ok: false; error: string };

async function requireMaster() {
  const user = await requireUser();
  return user.role === "MASTER" ? user : null;
}

// La Mesa (enseña la vida del combate, E1d) y la consola. `refresh()` trae la consola
// nueva en la misma respuesta de la acción: el contador de rondas no espera al polling.
function revalidateCombate() {
  revalidatePath("/master");
  revalidatePath("/master/combate");
  refresh();
}

async function ordenSiguiente(combateId: string): Promise<number> {
  return prisma.combatiente.count({ where: { combateId } });
}

// --- Combate ---

// Una sola instancia abierta a la vez (PREPARANDO o EN_CURSO, docs/fase-6b.md
// D1) — se comprueba aquí, no en el schema: no hay forma limpia de
// expresarlo en Prisma sin SQL a mano.
export async function crearCombateAction(): Promise<CombateResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede crear un combate." };

  const abierto = await prisma.combate.findFirst({
    where: { estado: { in: ["PREPARANDO", "EN_CURSO"] } },
  });
  if (abierto) return { ok: false, error: "Ya hay un combate abierto." };

  // Nace en PREPARANDO (default del schema): el máster monta la escena sin
  // que nadie más lo vea hasta que pulse "Comenzar combate".
  await prisma.combate.create({ data: {} });
  revalidateCombate();
  return { ok: true };
}

// Separada de crearCombateAction a propósito (pedido explícito del usuario,
// 2026-09-11): antes "crear" ya dejaba el combate EN_CURSO de inmediato, así
// que el jugador podía ver combatientes a medio montar antes de que el
// máster estuviera listo. Ahora el paso de PREPARANDO a EN_CURSO es una
// decisión aparte, y es justo lo que decide cuándo el jugador empieza a ver
// algo (characters/[id]/page.tsx solo busca EN_CURSO) y cuándo arranca el
// polling (4.1, mismo criterio).
export async function comenzarCombateAction(combateId: string): Promise<CombateResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede comenzar el combate." };

  const combate = await prisma.combate.findUnique({ where: { id: combateId } });
  if (!combate) return { ok: false, error: "No existe ese combate." };
  if (combate.estado !== "PREPARANDO") {
    return { ok: false, error: "Ese combate ya no está en preparación." };
  }

  await prisma.combate.update({
    where: { id: combateId },
    data: { estado: "EN_CURSO", iniciadoAt: new Date() },
  });
  revalidateCombate();
  return { ok: true };
}

export async function terminarCombateAction(combateId: string): Promise<CombateResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede terminar un combate." };

  await prisma.combate.update({
    where: { id: combateId },
    data: { estado: "TERMINADO", terminadoAt: new Date() },
  });
  revalidateCombate();
  return { ok: true };
}

// --- Combatientes: añadir ---

export async function agregarJugadorAction(
  combateId: string,
  characterId: string,
): Promise<CombateResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede añadir combatientes." };

  const yaEsta = await prisma.combatiente.findFirst({
    where: { combateId, characterId, derrotado: false },
  });
  if (yaEsta) return { ok: false, error: "Ese personaje ya está en este combate." };

  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { name: true, stats: true, estados: true },
  });
  if (!character) return { ok: false, error: "No existe ese personaje." };

  // Foto del máximo y de la vida/fatiga actuales (ver el comentario de Combatiente
  // en schema.prisma) — se copia aquí, no se vuelve a leer del Character.
  // Con los estados que ya lleve en la ficha: el máximo que ve el jugador al entrar.
  // Un estado puesto o quitado ya dentro del combate recalcula este máximo
  // (cambiarEstadosDePersonajes, S75).
  const sheet = parseSheet(character.stats);
  const { vida, fatiga } = resolverFicha(sheet, { estados: leerEstados(character.estados), vitalidad: VITALIDAD_DE_FICHA }).salud;
  const { pgActual, fatigaActual, danio } = vitalidadAlEntrarEnCombate(sheet, { vida, fatiga });

  await prisma.combatiente.create({
    data: {
      combateId,
      characterId,
      nombre: character.name,
      pgActual,
      pgMax: vida,
      danio,
      fatigaActual,
      fatigaMax: fatiga,
      orden: await ordenSiguiente(combateId),
    },
  });
  revalidateCombate();
  return { ok: true };
}

// Ficha obligatoria (2026-09-11): mismo patrón que agregarJugadorAction —
// PG/fatiga máximos salen de salud(sheet), no de un campo propio, y se
// congela una foto del Sheet entero (campo nuevo `sheet` en Combatiente)
// para que editar la plantilla después no afecte a un combate en marcha.
// Sin ad-hoc: era el tercer origen de Combatiente, desapareció a propósito
// — todo NPC sale de una plantilla del catálogo, ver docs/fase-6b.md
// "Catálogo de NPCs — rediseño".
export async function agregarNpcDeCatalogoAction(
  combateId: string,
  npcTemplateId: string,
): Promise<CombateResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede añadir combatientes." };

  const npc = await prisma.npcTemplate.findUnique({ where: { id: npcTemplateId } });
  if (!npc) return { ok: false, error: "No existe ese NPC." };

  const sheet = parseSheet(npc.stats);
  // Modo libre, como lo resuelven el editor y NpcAccionesPanel: las dotes del NPC cuentan
  // sin mirar requisitos (§9.4) también en sus máximos.
  const { vida, fatiga } = resolverFicha(sheet, { estados: [], vitalidad: VITALIDAD_DE_FICHA, libre: true }).salud;

  await prisma.combatiente.create({
    data: {
      combateId,
      npcTemplateId,
      nombre: npc.nombre,
      sheet,
      pgActual: vida,
      pgMax: vida,
      fatigaActual: fatiga,
      fatigaMax: fatiga,
      orden: await ordenSiguiente(combateId),
    },
  });
  revalidateCombate();
  return { ok: true };
}

// --- Combatientes: fuera de la cola de turnos, sin borrar la fila ---

export async function marcarDerrotadoAction(
  combatienteId: string,
  derrotado: boolean,
): Promise<CombateResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede marcar un combatiente." };

  await prisma.combatiente.update({ where: { id: combatienteId }, data: { derrotado } });
  revalidateCombate();
  return { ok: true };
}

// --- Turno ---

// No salta a los derrotados todavía — es una decisión de UX (¿se saltan
// solos, o el máster los deja en la cola a propósito?) que le toca a una
// subtarea aparte, no a este esqueleto.
//
// Las rondas de los estados bajan solo al cerrar la vuelta (pasarTurno, S77), para
// todos a la vez; un turno normal solo mueve el índice.
export async function avanzarTurnoAction(combateId: string): Promise<CombateResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede mover el turno." };

  const combate = await prisma.combate.findUnique({
    where: { id: combateId },
    include: { combatientes: { orderBy: { orden: "asc" } } },
  });
  if (!combate) return { ok: false, error: "No existe ese combate." };
  if (combate.estado !== "EN_CURSO") return { ok: false, error: "El combate todavía no ha empezado." };
  if (combate.combatientes.length === 0) return { ok: false, error: "No hay combatientes en la cola." };

  const paso = pasarTurno(combate, combate.combatientes.length);
  const moverTurno = prisma.combate.update({
    where: { id: combateId },
    data: { turnoIndex: paso.turnoIndex, ronda: paso.ronda },
  });
  if (!paso.cierraVuelta) {
    await moverTurno;
    revalidateCombate();
    return { ok: true };
  }

  // Solo escribe las filas que de verdad tenían algo que descontar
  // (estadosAlCerrarVuelta). Los NPC, en su fila; los jugadores, en su ficha
  // (Character.estados, E1a): lo que quede en el Combatiente de un jugador se ignora.
  const actualizaciones = combate.combatientes.flatMap((c) => {
    if (c.characterId !== null) return [];
    const estados = estadosAlCerrarVuelta(c.estados);
    return estados ? [{ id: c.id, estados }] : [];
  });
  const idsJugadores = [
    ...new Set(combate.combatientes.flatMap((c) => (c.characterId !== null ? [c.characterId] : []))),
  ];
  const jugadores = await prisma.character.findMany({
    where: { id: { in: idsJugadores } },
    select: { id: true, estados: true, stats: true },
  });
  // Al caerse un estado por rondas, su foto recalcula el máximo (sube) sin tocar la
  // vida actual; vidaTrasCambioDeEstados solo restaría si el máximo bajara (S75). Si el que
  // se cae es un activable de aumento (la Neuroprótesis, A5b), recorta la ficha y la foto
  // a su máximo nuevo.
  const actualizacionesJugadores = jugadores.flatMap((j) => {
    const estados = estadosAlCerrarVuelta(j.estados);
    if (!estados) return [];
    const antes = leerEstados(j.estados);
    const sheet = reconciliarVidaConEstados(parseSheet(j.stats), antes);
    const vida = vidaTrasCambioDeEstados(
      sheet,
      antes,
      estados,
      combate.combatientes.filter((c) => c.characterId === j.id),
    );
    return [{ id: j.id, estados, stats: vida.sheet === sheet ? undefined : vida.sheet, fotos: vida.combatientes }];
  });

  await prisma.$transaction([
    moverTurno,
    ...actualizaciones.map((c) =>
      prisma.combatiente.update({ where: { id: c.id }, data: { estados: c.estados } }),
    ),
    ...actualizacionesJugadores.map((j) =>
      prisma.character.update({
        where: { id: j.id },
        data: j.stats ? { estados: j.estados, stats: j.stats } : { estados: j.estados },
      }),
    ),
    ...actualizacionesJugadores.flatMap((j) =>
      j.fotos.map((c) =>
        prisma.combatiente.update({
          where: { id: c.id },
          data: { pgActual: c.pgActual, pgMax: c.pgMax, fatigaActual: c.fatigaActual, fatigaMax: c.fatigaMax },
        }),
      ),
    ),
  ]);
  revalidateCombate();
  if (actualizacionesJugadores.length > 0) revalidarEstados(actualizacionesJugadores.map((j) => j.id));
  return { ok: true };
}

// --- Iniciativa y orden de la cola ---
//
// `orden` es la posición real en la cola (subtarea 1.1); `iniciativa` es solo
// el número que el máster teclea para decidirla. Reordenar (a mano con las
// flechas, o de golpe con "ordenar por iniciativa") mueve `orden`, y las dos
// funciones de abajo tienen que recalcular `Combate.turnoIndex` para que
// siga apuntando al MISMO combatiente que estaba en su turno, no a la
// posición numérica que ahora ocupa otro — exactamente el riesgo que ya
// avisaba el comentario de `turnoIndex` en schema.prisma.

export async function establecerIniciativaAction(
  combatienteId: string,
  iniciativa: number | null,
): Promise<CombateResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede fijar la iniciativa." };
  if (iniciativa !== null && !Number.isFinite(iniciativa)) {
    return { ok: false, error: "Iniciativa inválida." };
  }

  await prisma.combatiente.update({ where: { id: combatienteId }, data: { iniciativa } });
  revalidateCombate();
  return { ok: true };
}

// Recoloca a todo el mundo por iniciativa descendente (los que no tienen
// iniciativa puesta van al final) y conserva a quién le tocaba el turno.
export async function ordenarPorIniciativaAction(combateId: string): Promise<CombateResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede reordenar la cola." };

  const combate = await prisma.combate.findUnique({
    where: { id: combateId },
    include: { combatientes: { orderBy: { orden: "asc" } } },
  });
  if (!combate) return { ok: false, error: "No existe ese combate." };

  const activoId = combate.combatientes[combate.turnoIndex]?.id ?? null;

  // sort() es estable: entre dos iniciativas iguales gana quien ya iba
  // primero en el orden actual, no un desempate arbitrario.
  const ordenados = [...combate.combatientes].sort(
    (a, b) => (b.iniciativa ?? -Infinity) - (a.iniciativa ?? -Infinity),
  );

  await prisma.$transaction(
    ordenados.map((c, i) => prisma.combatiente.update({ where: { id: c.id }, data: { orden: i } })),
  );

  const nuevoIndex = activoId ? ordenados.findIndex((c) => c.id === activoId) : 0;
  await prisma.combate.update({
    where: { id: combateId },
    data: { turnoIndex: nuevoIndex < 0 ? 0 : nuevoIndex },
  });

  revalidateCombate();
  return { ok: true };
}

// Sube o baja un puesto a un combatiente, intercambiando `orden` con su
// vecino inmediato — nada de drag-and-drop (ver el brainstorm de diseño).
export async function moverCombatienteAction(
  combatienteId: string,
  direccion: "arriba" | "abajo",
): Promise<CombateResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede reordenar la cola." };

  const combatiente = await prisma.combatiente.findUnique({ where: { id: combatienteId } });
  if (!combatiente) return { ok: false, error: "No existe ese combatiente." };

  const combate = await prisma.combate.findUnique({
    where: { id: combatiente.combateId },
    include: { combatientes: { orderBy: { orden: "asc" } } },
  });
  if (!combate) return { ok: false, error: "No existe ese combate." };

  const lista = combate.combatientes;
  const idx = lista.findIndex((c) => c.id === combatienteId);
  const vecinoIdx = direccion === "arriba" ? idx - 1 : idx + 1;
  if (vecinoIdx < 0 || vecinoIdx >= lista.length) {
    return { ok: false, error: "No se puede mover más en esa dirección." };
  }
  const vecino = lista[vecinoIdx];

  const activoId = lista[combate.turnoIndex]?.id ?? null;

  await prisma.$transaction([
    prisma.combatiente.update({ where: { id: combatiente.id }, data: { orden: vecino.orden } }),
    prisma.combatiente.update({ where: { id: vecino.id }, data: { orden: combatiente.orden } }),
  ]);

  const nuevoIndex =
    activoId === combatiente.id ? vecinoIdx : activoId === vecino.id ? idx : combate.turnoIndex;
  if (nuevoIndex !== combate.turnoIndex) {
    await prisma.combate.update({ where: { id: combate.id }, data: { turnoIndex: nuevoIndex } });
  }

  revalidateCombate();
  return { ok: true };
}

// --- PG / fatiga (D2: el dueño del Character también puede, no solo el máster) ---
//
// ajustarDanioCombatienteAction/ajustarFatigaAction son para la fila propia del jugador en su
// ficha (CombateTab). El máster usa ajustarVidaEnCombateAction (pestaña Vida, con registro).

async function ajustarRecurso(
  combatienteId: string,
  delta: number,
  campo: "pgActual" | "fatigaActual",
  campoMax: "pgMax" | "fatigaMax",
): Promise<CombateResult> {
  const user = await requireUser();
  if (!Number.isFinite(delta) || delta === 0) return { ok: false, error: "Delta inválido." };

  const combatiente = await prisma.combatiente.findUnique({
    where: { id: combatienteId },
    include: { character: { select: { ownerId: true } } },
  });
  if (!combatiente) return { ok: false, error: "No existe ese combatiente." };
  if (!canAdjustCombatiente(user, combatiente)) {
    return { ok: false, error: "No puedes tocar a ese combatiente." };
  }

  const actual = Math.max(0, Math.min(combatiente[campoMax], combatiente[campo] + delta));
  await prisma.combatiente.update({ where: { id: combatienteId }, data: { [campo]: actual } });
  revalidateCombate();
  return { ok: true };
}

// La vida de la foto por categoría (§7): delta > 0 recibe daño de esa categoría, < 0 la cura.
export async function ajustarDanioCombatienteAction(input: {
  combatienteId: string;
  categoria: CategoriaDanio;
  delta: number;
}): Promise<CombateResult> {
  const user = await requireUser();
  const parsed = ajustarDanioCombatienteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Entrada inválida." };
  const { combatienteId, categoria, delta } = parsed.data;

  const c = await prisma.combatiente.findUnique({
    where: { id: combatienteId },
    include: { character: { select: { ownerId: true } } },
  });
  if (!c) return { ok: false, error: "No existe ese combatiente." };
  if (!canAdjustCombatiente(user, c)) return { ok: false, error: "No puedes tocar a ese combatiente." };

  const r = ajustarDanioVital({ actual: c.pgActual, tope: c.pgMax, danio: danioDeFoto(c.danio, c.pgActual, c.pgMax) }, categoria, delta);
  await prisma.combatiente.update({ where: { id: combatienteId }, data: { pgActual: r.actual, danio: r.danio } });
  revalidateCombate();
  return { ok: true };
}

export async function ajustarFatigaAction(combatienteId: string, delta: number): Promise<CombateResult> {
  return ajustarRecurso(combatienteId, delta, "fatigaActual", "fatigaMax");
}

// Pestaña Vida del panel de mando en el combate: daño (negativo) o curación de PG o
// fatiga a varias filas de la cola (jugadores y NPC), en su foto, con una entrada en el
// registro que se deshace también para los NPC.
export async function ajustarVidaEnCombateAction(input: {
  combatienteIds: string[];
  recurso: "vida" | "fatiga";
  cantidad: number;
  categoria?: CategoriaDanio;
}): Promise<MandoResult> {
  const user = await requireMaster();
  if (!user) return { ok: false, error: "Solo el máster puede ajustar la vida." };
  const parsed = ajustarVidaEnCombateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Entrada inválida." };
  const { combatienteIds, recurso, cantidad, categoria } = parsed.data;
  const res = await ajustarVidaDeCombatientes(combatienteIds, recurso, cantidad, categoria, { userId: user.id });
  if (res.ok) revalidateCombate();
  return res;
}

// --- Estados (panel de mando dentro del combate, E1d) ---
//
// Objetivos = filas de la cola, jugadores y NPC mezclados. Un jugador lleva sus estados
// en la ficha (Character.estados, E1a), con su vida (S75) y una sola entrada en el
// registro del máster para todos los jugadores de la acción; un NPC, en su fila y sin
// registro. Un solo grado de cada estado a la vez: aplicar uno que ya tenía sustituye
// grado y duración.
// TODO(revisar): con jugadores y NPC mezclados, "Deshacer" (registro) solo devuelve lo de
// los jugadores; lo de los NPC se queda. El registro ya admite combatientes
// (`combatienteIds`, pestaña Vida): registrar los estados de NPC pide su propio tipo de
// cambio (sin vida restada) y su deshacer.

// Inmunidades (A7): los inmunes, jugadores y NPC, vuelven en `inmunes` con su combatienteId
// (el id de la cola, que es el que repite "Aplicar igualmente" con `forzar`).
async function cambiarEstadosEnCombate(
  userId: string,
  combatienteIds: string[],
  op: OperacionEstado,
  motivo: string | undefined,
  forzar = false,
): Promise<MandoResult> {
  const ids = [...new Set(combatienteIds)];
  const filas = await prisma.combatiente.findMany({ where: { id: { in: ids } }, select: { id: true, characterId: true } });
  if (filas.length !== ids.length) return { ok: false, error: "Alguno de esos combatientes ya no está en la cola." };

  const characterIds = filas.flatMap((f) => (f.characterId !== null ? [f.characterId] : []));
  let registroId: string | null = null;
  const inmunes: InmuneAlAplicar[] = [];
  if (characterIds.length > 0) {
    const hecho = await cambiarEstadosDePersonajes(characterIds, op, { userId, motivo }, { forzar });
    if (!hecho) return { ok: false, error: "No existe el personaje de alguno de esos combatientes." };
    registroId = hecho.registroId;
    for (const i of hecho.inmunes) {
      for (const f of filas.filter((f) => f.characterId === i.id)) inmunes.push({ ...i, id: f.id });
    }
  }
  const npcs = await cambiarEstadosDeNpcs(ids, op, forzar);
  inmunes.push(...npcs.inmunes);
  revalidateCombate();
  return { ok: true, registroId, ...(op.tipo === "poner" && { inmunes }) };
}

export async function aplicarEstadoEnCombateAction(input: {
  combatienteIds: string[];
  estado: { estadoId: string; gradoId: string; duracion: DuracionEstado };
  motivo?: string;
  forzar?: boolean;
}): Promise<MandoResult> {
  const user = await requireMaster();
  if (!user) return { ok: false, error: "Solo el máster puede aplicar un estado." };
  const parsed = aplicarEstadoEnCombateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Entrada inválida." };

  const { combatienteIds, estado, motivo, forzar } = parsed.data;
  const nuevo = estadoActivoCon(estado.estadoId, estado.gradoId, estado.duracion);
  return cambiarEstadosEnCombate(user.id, combatienteIds, { tipo: "poner", estado: nuevo }, motivo, forzar);
}

// También la × de cada chip de estado en la cola (con un solo combatiente).
export async function quitarEstadoEnCombateAction(input: {
  combatienteIds: string[];
  estadoId: string;
  motivo?: string;
}): Promise<MandoResult> {
  const user = await requireMaster();
  if (!user) return { ok: false, error: "Solo el máster puede quitar un estado." };
  const parsed = quitarEstadoEnCombateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Entrada inválida." };

  const { combatienteIds, estadoId, motivo } = parsed.data;
  return cambiarEstadosEnCombate(user.id, combatienteIds, { tipo: "quitar", estadoId }, motivo);
}
