"use server";

// Fase 6b (docs/fase-6b.md, subtarea 1.3): server actions esqueleto del
// gestor de combate. Sin UI todavía (bloque 2) — esto es solo las acciones
// y sus guardas, para que 2.x tenga contra qué construir. Mismo patrón de
// retorno que characters/[id]/actions.ts (ok/error tipado) y no el de
// master/actions.ts (FormData + no-op silencioso): esto va a alimentar una
// consola interactiva, no formularios sueltos, y ahí conviene poder
// mostrarle al máster por qué falló una acción.
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, canAdjustCombatiente } from "@/lib/auth-helpers";
import { parseSheet, salud, estadoPorId, descontarDuracion, type EstadoActivo } from "@/lib/rules";

export type CombateResult = { ok: true } | { ok: false; error: string };

async function requireMaster() {
  const user = await requireUser();
  return user.role === "MASTER" ? user : null;
}

// Sin UI todavía que leer, así que solo /master (la cola) puede tener algo
// cacheado que enseñe de refilón que hay un combate en curso. Cuando llegue
// el bloque 2, esto gana la ruta de la consola.
function revalidateCombate() {
  revalidatePath("/master");
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
    select: { name: true, stats: true },
  });
  if (!character) return { ok: false, error: "No existe ese personaje." };

  // Foto del máximo actual (ver el comentario de Combatiente en
  // schema.prisma) — se copia aquí, no se vuelve a leer del Character.
  const { vida, fatiga } = salud(parseSheet(character.stats));

  await prisma.combatiente.create({
    data: {
      combateId,
      characterId,
      nombre: character.name,
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
  const { vida, fatiga } = salud(sheet);

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
export async function avanzarTurnoAction(combateId: string): Promise<CombateResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede mover el turno." };

  const combate = await prisma.combate.findUnique({
    where: { id: combateId },
    include: { combatientes: { orderBy: { orden: "asc" } } },
  });
  if (!combate) return { ok: false, error: "No existe ese combate." };
  if (combate.estado !== "EN_CURSO") return { ok: false, error: "El combate todavía no ha empezado." };
  if (combate.combatientes.length === 0) return { ok: false, error: "No hay combatientes en la cola." };

  const siguiente = combate.turnoIndex + 1;
  const daLaVuelta = siguiente >= combate.combatientes.length;

  // Solo escribe las filas que de verdad tenían algo que descontar — la
  // mayoría de combatientes no llevan estados puestos, no hace falta
  // tocarlas. Ojo: "tenía algo antes" es la condición correcta, no "cambió
  // de tamaño" — una duración que baja de 3 a 2 rondas sigue siendo un
  // cambio real aunque el array no pierda ninguna entrada.
  const actualizaciones = combate.combatientes.flatMap((c) => {
    const originales = c.estados as unknown as EstadoActivo[];
    if (originales.length === 0) return [];
    return [{ id: c.id, estados: descontarDuracion(originales) }];
  });

  await prisma.$transaction([
    prisma.combate.update({
      where: { id: combateId },
      data: {
        turnoIndex: daLaVuelta ? 0 : siguiente,
        ronda: daLaVuelta ? combate.ronda + 1 : combate.ronda,
      },
    }),
    ...actualizaciones.map((c) =>
      prisma.combatiente.update({ where: { id: c.id }, data: { estados: c.estados } }),
    ),
  ]);
  revalidateCombate();
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

export async function ajustarPgAction(combatienteId: string, delta: number): Promise<CombateResult> {
  return ajustarRecurso(combatienteId, delta, "pgActual", "pgMax");
}

export async function ajustarFatigaAction(combatienteId: string, delta: number): Promise<CombateResult> {
  return ajustarRecurso(combatienteId, delta, "fatigaActual", "fatigaMax");
}

// --- Estados ---

// Un combatiente solo lleva un grado de cada estado a la vez (mismo
// criterio que modificadoresDeEstados(), lib/rules/estados.ts): aplicar de
// nuevo un estado que ya tenía puesto sustituye el grado, no lo acumula.
export async function aplicarEstadoAction(
  combatienteId: string,
  estadoId: string,
  gradoId: string,
  rondasRestantes: number | null,
): Promise<CombateResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede aplicar un estado." };

  const estado = estadoPorId(estadoId);
  const grado = estado?.grados.find((g) => g.id === gradoId);
  if (!estado || !grado) return { ok: false, error: "Ese estado o grado no existe en el catálogo." };

  const combatiente = await prisma.combatiente.findUnique({
    where: { id: combatienteId },
    select: { estados: true },
  });
  if (!combatiente) return { ok: false, error: "No existe ese combatiente." };

  // `estados` es Json escrito solo por estas dos acciones, nunca por el
  // cliente — un cast basta; si algún día un formulario lo postea directo,
  // esto necesita el mismo tratamiento tolerante que parseSheet.
  const activos = (combatiente.estados as unknown as EstadoActivo[]).filter(
    (e) => e.estadoId !== estadoId,
  );
  activos.push({ estadoId, gradoId, rondasRestantes });

  await prisma.combatiente.update({ where: { id: combatienteId }, data: { estados: activos } });
  revalidateCombate();
  return { ok: true };
}

export async function quitarEstadoAction(
  combatienteId: string,
  estadoId: string,
): Promise<CombateResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede quitar un estado." };

  const combatiente = await prisma.combatiente.findUnique({
    where: { id: combatienteId },
    select: { estados: true },
  });
  if (!combatiente) return { ok: false, error: "No existe ese combatiente." };

  const activos = (combatiente.estados as unknown as EstadoActivo[]).filter(
    (e) => e.estadoId !== estadoId,
  );
  await prisma.combatiente.update({ where: { id: combatienteId }, data: { estados: activos } });
  revalidateCombate();
  return { ok: true };
}
