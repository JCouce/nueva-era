"use server";

// Fase 6b (docs/fase-6b.md, subtarea 1.3): server actions esqueleto del
// gestor de combate. Sin UI todavía (bloque 2) — esto es solo las acciones
// y sus guardas, para que 2.x tenga contra qué construir. Mismo patrón de
// retorno que characters/[id]/actions.ts (ok/error tipado) y no el de
// master/actions.ts (FormData + no-op silencioso): esto va a alimentar una
// consola interactiva, no formularios sueltos, y ahí conviene poder
// mostrarle al máster por qué falló una acción.
import { refresh, revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, canAdjustCombatiente, canEditCharacter } from "@/lib/auth-helpers";
import {
  ajustarDanioVital,
  danioDeFoto,
  parseSheet,
  reconciliarVidaConEstados,
  resolverFicha,
  VITALIDAD_DE_FICHA,
  vitalidadAlEntrarEnCombate,
  vitalidadAlSalirDeCombate,
  fotoEnMesa,
  topesDeVida,
  leerEstados,
  estadoActivoCon,
  estadosAlCerrarVuelta,
  pasarTurno,
  vidaTrasCambioDeEstados,
  GRADOS,
  bonosDeDisciplina,
  loQuitaElJugador,
  estadoPorId,
  estadosPropiosDeUso,
  modificadoresActivos,
  nivelesDePsionica,
  anadirTirada,
  anotarDanioTirada,
  danioTiradaSchema,
  leerTiradasCombate,
  tiradaNuevaSchema,
  type TiradaCombate,
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
import { cambiarEstadosDeNpcs, cambiarEstadosEnCombate, revalidarEstados } from "@/lib/estadosPersonaje";
import { conReintentos, escribirFicha } from "@/lib/escrituraFicha";
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

// Al terminar, el daño del combate vuelve a la ficha (td-13): cada jugador deja en su
// Character.stats la vida, la fatiga y el desglose de su foto (vitalidadAlSalirDeCombate); con
// varias filas, la misma que enseña la Mesa (fotoEnMesa). Solo si el combate estaba EN_CURSO: en
// PREPARANDO la foto es la de entrada y lo que vale es la ficha. En la misma transacción que lo
// cierra, con escribirFicha (td-22): si un jugador guarda a la vez, se repite entera.
export async function terminarCombateAction(combateId: string): Promise<CombateResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede terminar un combate." };

  const tocados = await conReintentos(() =>
    prisma.$transaction(async (tx) => {
      const combate = await tx.combate.findUnique({
        where: { id: combateId },
        select: {
          estado: true,
          combatientes: {
            where: { characterId: { not: null } },
            select: { characterId: true, orden: true, derrotado: true, pgActual: true, pgMax: true, fatigaActual: true, fatigaMax: true, danio: true },
          },
        },
      });
      if (!combate) return null;
      await tx.combate.update({ where: { id: combateId }, data: { estado: "TERMINADO", terminadoAt: new Date() } });
      if (combate.estado !== "EN_CURSO") return [];
      const ids = [...new Set(combate.combatientes.flatMap((c) => (c.characterId ? [c.characterId] : [])))];
      const fichas = await tx.character.findMany({ where: { id: { in: ids } }, select: { id: true, stats: true, estados: true } });
      const tocados: string[] = [];
      for (const f of fichas) {
        const foto = fotoEnMesa(combate.combatientes.filter((c) => c.characterId === f.id));
        if (!foto) continue;
        const estados = leerEstados(f.estados);
        const sheet = reconciliarVidaConEstados(parseSheet(f.stats), estados);
        const tras = vitalidadAlSalirDeCombate(
          sheet,
          {
            pgActual: foto.pgActual,
            pgMax: foto.pgMax,
            fatigaActual: foto.fatigaActual,
            fatigaMax: foto.fatigaMax,
            danio: danioDeFoto(foto.danio, foto.pgActual, foto.pgMax),
          },
          topesDeVida(sheet, estados),
        );
        if (tras === sheet) continue;
        await escribirFicha(tx, f.id, { stats: f.stats }, { stats: tras });
        tocados.push(f.id);
      }
      return tocados;
    }),
  );
  if (!tocados) return { ok: false, error: "No existe ese combate." };
  revalidateCombate();
  if (tocados.length > 0) revalidarEstados(tocados);
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
  if (npc.deletedAt) return { ok: false, error: "Ese NPC está en la papelera." };

  await prisma.combatiente.create({
    data: { combateId, ...fotoDeNpc(npc), orden: await ordenSiguiente(combateId) },
  });
  revalidateCombate();
  return { ok: true };
}

// «Añadir los N filtrados» de la consola: varios NPCs del catálogo de una vez, en el orden en
// que llegan y en una sola escritura. Los que no existen o están en la papelera se saltan.
const idsNpcsSchema = z.array(z.string().min(1)).min(1).max(100);

export async function agregarNpcsDeCatalogoAction(combateId: string, npcTemplateIds: unknown): Promise<CombateResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede añadir combatientes." };
  const parsed = idsNpcsSchema.safeParse(npcTemplateIds);
  if (!parsed.success) return { ok: false, error: "Lista de NPCs no válida." };

  const npcs = await prisma.npcTemplate.findMany({ where: { id: { in: parsed.data }, deletedAt: null } });
  const porId = new Map(npcs.map((n) => [n.id, n]));
  const enOrden = parsed.data.flatMap((id) => porId.get(id) ?? []);
  if (enOrden.length === 0) return { ok: false, error: "Ninguno de esos NPCs está en el catálogo." };

  const base = await ordenSiguiente(combateId);
  await prisma.combatiente.createMany({
    data: enOrden.map((npc, i) => ({ combateId, ...fotoDeNpc(npc), orden: base + i })),
  });
  revalidateCombate();
  return { ok: true };
}

// Ficha congelada del NPC para su fila de combate. Modo libre, como lo resuelven el editor y
// NpcAccionesPanel: las dotes del NPC cuentan sin mirar requisitos (§9.4) también en sus máximos.
function fotoDeNpc(npc: { id: string; nombre: string; stats: unknown }) {
  const sheet = parseSheet(npc.stats);
  const { vida, fatiga } = resolverFicha(sheet, { estados: [], vitalidad: VITALIDAD_DE_FICHA, libre: true }).salud;
  return {
    npcTemplateId: npc.id,
    nombre: npc.nombre,
    sheet,
    pgActual: vida,
    pgMax: vida,
    fatigaActual: fatiga,
    fatigaMax: fatiga,
  };
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
  const datosTurno = { turnoIndex: paso.turnoIndex, ronda: paso.ronda };
  if (!paso.cierraVuelta) {
    await prisma.combate.update({ where: { id: combateId }, data: datosTurno });
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
  // Las fichas se leen y se escriben en la misma transacción, con escribirFicha (td-22): si el
  // jugador guarda a la vez, se repite entera (todo lo que escribe es absoluto).
  const tocados = await conReintentos(() =>
    prisma.$transaction(async (tx) => {
      await tx.combate.update({ where: { id: combateId }, data: datosTurno });
      for (const c of actualizaciones) await tx.combatiente.update({ where: { id: c.id }, data: { estados: c.estados } });
      const jugadores = await tx.character.findMany({
        where: { id: { in: idsJugadores } },
        select: { id: true, estados: true, stats: true },
      });
      // Al caerse un estado por rondas, su foto recalcula el máximo (sube) sin tocar la
      // vida actual; vidaTrasCambioDeEstados solo restaría si el máximo bajara (S75).
      const ids: string[] = [];
      for (const j of jugadores) {
        const estados = estadosAlCerrarVuelta(j.estados);
        if (!estados) continue;
        const antes = leerEstados(j.estados);
        const sheet = reconciliarVidaConEstados(parseSheet(j.stats), antes);
        const vida = vidaTrasCambioDeEstados(
          sheet,
          antes,
          estados,
          combate.combatientes.filter((c) => c.characterId === j.id),
        );
        if (vida.sheet === sheet) await tx.character.update({ where: { id: j.id }, data: { estados } });
        else await escribirFicha(tx, j.id, { stats: j.stats }, { estados, stats: vida.sheet });
        for (const c of vida.combatientes) {
          await tx.combatiente.update({
            where: { id: c.id },
            data: { pgActual: c.pgActual, pgMax: c.pgMax, fatigaActual: c.fatigaActual, fatigaMax: c.fatigaMax },
          });
        }
        ids.push(j.id);
      }
      return ids;
    }),
  );
  revalidateCombate();
  if (tocados.length > 0) revalidarEstados(tocados);
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
// en la ficha (Character.estados, E1a), con su vida (S75); un NPC, en su fila. Una sola
// entrada en el registro del máster para todos, jugadores y NPC, que "Deshacer" devuelve
// entera (td-20). Un solo grado de cada estado a la vez: aplicar uno que ya tenía sustituye
// grado y duración.

// Inmunidades (A7): los inmunes, jugadores y NPC, vuelven en `inmunes` con su combatienteId
// (el id de la cola, que es el que repite "Aplicar igualmente" con `forzar`).
async function cambiarEstadosDeLaCola(
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
  const npcIds = filas.flatMap((f) => (f.characterId === null ? [f.id] : []));
  const hecho = await cambiarEstadosEnCombate(characterIds, npcIds, op, { userId, motivo }, forzar);
  if (!hecho) return { ok: false, error: "No existe el personaje de alguno de esos combatientes." };
  const inmunes: InmuneAlAplicar[] = [...hecho.inmunesNpc];
  for (const i of hecho.inmunes) {
    for (const f of filas.filter((f) => f.characterId === i.id)) inmunes.push({ ...i, id: f.id });
  }
  revalidateCombate();
  return { ok: true, registroId: hecho.registroId, ...(op.tipo === "poner" && { inmunes }) };
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
  return cambiarEstadosDeLaCola(user.id, combatienteIds, { tipo: "poner", estado: nuevo }, motivo, forzar);
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
  return cambiarEstadosDeLaCola(user.id, combatienteIds, { tipo: "quitar", estadoId }, motivo);
}

// --- Estados propios de los poderes de un NPC (P1 de psiónica) ---
//
// El mismo camino que la ficha del jugador (ponerEstadosDePoderAction), pero sobre la fila del
// NPC en la cola (Combatiente.estados, por cambiarEstadosDeNpcs como los estados que pone el
// máster a mano): la Contención al usarla, el Aturdido del fracaso crítico de Retrocognición y
// el Estabilizado. Nunca se fía del cliente: con la ficha congelada del NPC (su foto) se vuelven
// a calcular con estadosPropiosDeUso. «Terminar contención» quita solo estados de poder.
const estadoDePoderNpcSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("poner"),
    poderId: z.string().min(1).max(80),
    elecciones: z.record(z.string().max(40), z.string().max(40)),
    grado: z.enum(GRADOS).nullable(),
  }),
  z.object({ tipo: z.literal("quitar"), estadoId: z.string().min(1).max(60) }),
]);

export async function estadoDePoderNpcAction(
  combatienteId: unknown,
  operacion: unknown,
): Promise<{ ok: true; mensaje: string | null } | { ok: false; error: string }> {
  const user = await requireMaster();
  if (!user) return { ok: false, error: "Solo el máster puede tocar los estados de un NPC." };
  const id = z.string().min(1).max(60).safeParse(combatienteId);
  const op = estadoDePoderNpcSchema.safeParse(operacion);
  if (!id.success || !op.success) return { ok: false, error: "Datos no válidos" };
  const fila = await prisma.combatiente.findUnique({
    where: { id: id.data },
    select: { characterId: true, sheet: true, estados: true },
  });
  if (!fila || fila.characterId !== null || !fila.sheet) return { ok: false, error: "Ese NPC ya no está en la cola." };
  const estados = leerEstados(fila.estados);

  if (op.data.tipo === "quitar") {
    const estadoId = op.data.estadoId;
    // Los de poder y los que se quita el propio portador (la oportunidad del Antipatógeno, que
    // gasta su tirada).
    if (!loQuitaElJugador(estadoId)) return { ok: false, error: "Estado no válido" };
    if (!estados.some((e) => e.estadoId === estadoId)) return { ok: true, mensaje: "Ya no estaba puesto." };
    await cambiarEstadosDeNpcs([id.data], { tipo: "quitar", estadoId });
    revalidateCombate();
    return { ok: true, mensaje: `Se le quita ${estadoPorId(estadoId)?.label ?? estadoId}.` };
  }

  const sheet = parseSheet(fila.sheet);
  const niveles = nivelesDePsionica(sheet, bonosDeDisciplina(modificadoresActivos(sheet))).paraEfectos;
  const nuevos = estadosPropiosDeUso(sheet, niveles, op.data.poderId, op.data.elecciones, op.data.grado, estados);
  if (nuevos.length === 0) return { ok: true, mensaje: null };
  const puestos: string[] = [];
  const inmune: string[] = [];
  for (const estado of nuevos) {
    const r = await cambiarEstadosDeNpcs([id.data], { tipo: "poner", estado });
    (r.inmunes.length > 0 ? inmune : puestos).push(estadoPorId(estado.estadoId)?.label ?? estado.estadoId);
  }
  revalidateCombate();
  const partes = [
    puestos.length > 0 ? `Se le pone ${puestos.join(" y ")}.` : null,
    inmune.length > 0 ? `Es inmune a ${inmune.join(" y ")}: no se le pone.` : null,
  ];
  return { ok: true, mensaje: partes.filter(Boolean).join(" ") };
}

// --- Tiradas de cada combatiente, para la consola (rules/tiradasCombate.ts) ---
//
// Las manda la pestaña Acciones al tirar, en segundo plano: si algo falla aquí, la tirada en el
// móvil sigue igual. Solo se guarda con un combate EN_CURSO en el que esté el combatiente; si no
// lo hay, no se hace nada y no es un error. La ronda la pone el servidor, nunca el cliente.
// Jugador: por su characterId (canEditCharacter), dentro del combate en curso. NPC: solo el
// máster, por la id de su fila.
const destinoTiradaSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("jugador"), characterId: z.string().min(1).max(60) }),
  z.object({ tipo: z.literal("npc"), combatienteId: z.string().min(1).max(60) }),
]);
export type DestinoTirada = z.infer<typeof destinoTiradaSchema>;

type FilaDeTiradas = { id: string; tiradas: Prisma.JsonValue; combate: { ronda: number } };

async function filaDeTiradas(destino: DestinoTirada): Promise<FilaDeTiradas | null> {
  const user = await requireUser();
  const select = { id: true, tiradas: true, combate: { select: { ronda: true } } } as const;
  if (destino.tipo === "npc") {
    if (user.role !== "MASTER") return null;
    return prisma.combatiente.findFirst({
      where: { id: destino.combatienteId, characterId: null, combate: { estado: "EN_CURSO" } },
      select,
    });
  }
  const character = await prisma.character.findUnique({
    where: { id: destino.characterId },
    select: { ownerId: true, deletedAt: true },
  });
  if (!character || !canEditCharacter(user, character)) return null;
  // Una fila derrotada puede convivir con la nueva si se le volvió a meter: la activa primero.
  return prisma.combatiente.findFirst({
    where: { characterId: destino.characterId, combate: { estado: "EN_CURSO" } },
    orderBy: [{ derrotado: "asc" }, { createdAt: "desc" }],
    select,
  });
}

class TiradasCambiadas extends Error {}

// Leer, cambiar y escribir condicionado a que el Json siga siendo el leído (como escribirFicha):
// dos tiradas seguidas del mismo combatiente no se pisan. Se reintenta con lo nuevo.
async function cambiarTiradas(
  destino: DestinoTirada,
  cambio: (lista: TiradaCombate[], ronda: number) => TiradaCombate[],
): Promise<string | null> {
  for (let intento = 1; ; intento++) {
    const fila = await filaDeTiradas(destino);
    if (!fila) return null;
    const antes = leerTiradasCombate(fila.tiradas);
    const despues = cambio(antes, fila.combate.ronda);
    if (despues === antes) return fila.id;
    const r = await prisma.combatiente.updateMany({
      where: { id: fila.id, tiradas: { equals: fila.tiradas as Prisma.InputJsonValue } },
      data: { tiradas: despues },
    });
    if (r.count > 0) return fila.id;
    if (intento >= 3) throw new TiradasCambiadas();
  }
}

export async function registrarTiradaAction(destino: unknown, tirada: unknown): Promise<CombateResult> {
  const d = destinoTiradaSchema.safeParse(destino);
  const t = tiradaNuevaSchema.safeParse(tirada);
  if (!d.success || !t.success) return { ok: false, error: "Datos no válidos" };
  try {
    await cambiarTiradas(d.data, (lista, ronda) => anadirTirada(lista, t.data, ronda, Date.now()));
  } catch (e) {
    if (e instanceof TiradasCambiadas) return { ok: false, error: "No se pudo apuntar la tirada." };
    throw e;
  }
  // La consola del máster la recoge con su polling; si la tira el máster (NPC), ya.
  if (d.data.tipo === "npc") refresh();
  return { ok: true };
}

export async function anotarDanioTiradaAction(destino: unknown, id: unknown, danio: unknown): Promise<CombateResult> {
  const d = destinoTiradaSchema.safeParse(destino);
  const i = z.string().min(1).max(64).safeParse(id);
  const x = danioTiradaSchema.safeParse(danio);
  if (!d.success || !i.success || !x.success) return { ok: false, error: "Datos no válidos" };
  try {
    await cambiarTiradas(d.data, (lista) => anotarDanioTirada(lista, i.data, x.data));
  } catch (e) {
    if (e instanceof TiradasCambiadas) return { ok: false, error: "No se pudo apuntar el daño." };
    throw e;
  }
  if (d.data.tipo === "npc") refresh();
  return { ok: true };
}

// «Ver más» de la consola: todas las tiradas guardadas de esa fila en este combate. Bajo
// demanda, para no mandar el historial entero en cada refresco del polling.
export async function historialTiradasAction(
  combatienteId: unknown,
): Promise<{ ok: true; tiradas: TiradaCombate[] } | { ok: false; error: string }> {
  const user = await requireMaster();
  if (!user) return { ok: false, error: "Solo el máster puede ver el historial de tiradas." };
  const id = z.string().min(1).max(60).safeParse(combatienteId);
  if (!id.success) return { ok: false, error: "Datos no válidos" };
  const fila = await prisma.combatiente.findUnique({ where: { id: id.data }, select: { tiradas: true } });
  if (!fila) return { ok: false, error: "Ese combatiente ya no está en la cola." };
  return { ok: true, tiradas: leerTiradasCombate(fila.tiradas) };
}
