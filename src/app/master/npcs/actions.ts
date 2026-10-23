"use server";

// Fase 6b, catálogo de NPCs (rediseño 2026-09-11, docs/fase-6b.md): ficha
// obligatoria para todo NpcTemplate — mismo Sheet que un Character, así que
// estas acciones son un espejo deliberadamente simplificado de
// characters/[id]/actions.ts: sin XP, sin aprobación, sin point-buy, sin
// coste en créditos al equipar — el máster edita los números directos,
// nadie le pone techo (mismo criterio que ya tiene al editar la ficha de
// un jugador: el máster no tiene tope de rareza tampoco). Sin UI todavía
// (llega en 5.1) — esto es el esqueleto, verificado con smoke test manual,
// mismo patrón que combate/actions.ts en la subtarea 1.3.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { atributoLibreSchema, eleccionEspecieSchema, especialidadDeHabilidadSchema } from "@/lib/validation";
import {
  type Sheet,
  defaultSheet,
  parseSheet,
  clampInt,
  addEspecialidad,
  AJUSTE_NEUTRO,
  bonosDeDisciplina,
  modificadoresActivos,
  removeEspecialidad,
  equipar,
  retirarPieza,
  piezaEquipadaEntradaSchema,
  ajustarRecurso,
  comprarRecarga,
  ajustarMaterial,
  comprarMaterial,
  repararPieza,
  fabricar,
  opcionesFabricarSchema,
  conversionArmaEntradaSchema,
  convertirArma,
  generarNpcAleatorio,
  ajustarGranada,
  comprarGranada,
  ajustarFarmaco,
  comprarFarmaco,
  ajustarMunicionEspecial,
  comprarMunicionEspecial,
  ajustarVida,
  ajustarFatiga,
  ATRIBUTO_MIN,
  ATRIBUTO_MAX,
  HABILIDAD_NO_ENTRENADA,
  HABILIDAD_MAX,
  type AtributoId,
  type HabilidadId,
  type PiezaEquipada,
  type MaterialTier,
  setNivelDisciplina,
  esDisciplinaId,
  type DisciplinaId,
  pagarFatiga,
  ajustarFatigaTemporal,
  terminarEscena,
  elegirEspecie,
  elegirAtributoLibre,
  reconciliarVida,
  type EleccionEspecie,
  doteCompradaSchema,
  comprarDote,
  quitarDote,
  CONTEXTO_LIBRE,
  compraAumentoSchema,
  comprarAumento,
  nuevaInstanciaId,
  armaIncorporadaEntradaSchema,
  fijarArmaIncorporada,
} from "@/lib/rules";

export type NpcResult = { ok: true; sheet: Sheet } | { ok: false; error: string };
export type NpcCreadoResult = { ok: true; id: string } | { ok: false; error: string };

async function requireMaster() {
  const user = await requireUser();
  return user.role === "MASTER" ? user : null;
}

function revalidateNpcs() {
  revalidatePath("/master/npcs");
}

// Un NPC no tiene estados: su tope de vida es el de reposo. parseSheet topa con el posible
// (cuenta los activables de aumento que lleve equipados, A5b); aquí, el exacto.
const leerNpc = (stats: unknown): Sheet => reconciliarVida(parseSheet(stats));

async function loadSheet(npcId: string): Promise<{ sheet: Sheet } | { error: string }> {
  if (!(await requireMaster())) return { error: "Solo el máster puede editar NPCs." };
  const npc = await prisma.npcTemplate.findUnique({ where: { id: npcId }, select: { stats: true } });
  if (!npc) return { error: "No existe ese NPC." };
  return { sheet: leerNpc(npc.stats) };
}

async function persist(npcId: string, sheet: Sheet): Promise<NpcResult> {
  await prisma.npcTemplate.update({ where: { id: npcId }, data: { stats: sheet } });
  revalidateNpcs();
  return { ok: true, sheet };
}

// --- Alta / baja / clonar ---

export async function crearNpcAction(nombre: string): Promise<NpcCreadoResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede crear NPCs." };
  const nombreLimpio = nombre.trim();
  if (!nombreLimpio) return { ok: false, error: "Falta el nombre." };

  const npc = await prisma.npcTemplate.create({
    data: { nombre: nombreLimpio, stats: defaultSheet() },
  });
  revalidateNpcs();
  return { ok: true, id: npc.id };
}

// Copia el Sheet entero con un nombre nuevo — la vía real para el "mook
// rápido de mesa" (decisión 2026-09-11): en vez de un modo ligero sin
// ficha, se clona una plantilla ya armada del catálogo. Adelanta media
// subtarea 5.3 (clonar en instancias numeradas), que además de esto añade
// la UI para clonar varias de golpe con nombres tipo "Goblin #1, #2, #3".
export async function clonarNpcAction(npcId: string, nuevoNombre: string): Promise<NpcCreadoResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede clonar NPCs." };
  const nombreLimpio = nuevoNombre.trim();
  if (!nombreLimpio) return { ok: false, error: "Falta el nombre." };

  const original = await prisma.npcTemplate.findUnique({ where: { id: npcId } });
  if (!original) return { ok: false, error: "No existe ese NPC." };

  const clon = await prisma.npcTemplate.create({
    data: { nombre: nombreLimpio, stats: original.stats as object, nota: original.nota },
  });
  revalidateNpcs();
  return { ok: true, id: clon.id };
}

// Envoltorios para <form action={...}> sin JS (5.1, mismo patrón que
// createCharacter/deleteCharacter en characters/actions.ts): las de arriba
// devuelven un resultado tipado para llamarse desde un client component,
// estas dos hablan FormData y navegan solas.
export async function crearNpcFormAction(formData: FormData) {
  const res = await crearNpcAction(String(formData.get("nombre") ?? ""));
  if (res.ok) redirect(`/master/npcs/${res.id}`);
}

// Generación al azar (lib/rules/npcAleatorio.ts): atributos, habilidades, un
// arma con mejora y una armadura con mejora, todo sorteado — el máster solo
// aprieta el botón. Mismo criterio "libre" que el resto del NPC: nada de
// point-buy ni coste, un único create.
export async function crearNpcAleatorioAction(): Promise<NpcCreadoResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede crear NPCs." };

  const { nombre, sheet } = generarNpcAleatorio();
  const npc = await prisma.npcTemplate.create({ data: { nombre, stats: sheet } });
  revalidateNpcs();
  return { ok: true, id: npc.id };
}

export async function crearNpcAleatorioFormAction() {
  const res = await crearNpcAleatorioAction();
  if (res.ok) redirect(`/master/npcs/${res.id}`);
}

export async function eliminarNpcFormAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await eliminarNpcAction(id);
}

export async function eliminarNpcAction(npcId: string): Promise<NpcResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede eliminar NPCs." };
  // onDelete: SetNull en Combatiente.npcTemplateId (schema.prisma) — borrar
  // una plantilla no revienta un combate histórico que ya la usó, solo
  // pierde el enlace; el combatiente conserva su `nombre`/`sheet` congelados.
  await prisma.npcTemplate.delete({ where: { id: npcId } });
  revalidateNpcs();
  return { ok: true, sheet: defaultSheet() };
}

export async function renombrarNpcAction(npcId: string, nombre: string): Promise<NpcResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede editar NPCs." };
  const nombreLimpio = nombre.trim();
  if (!nombreLimpio) return { ok: false, error: "El nombre no puede quedar vacío." };

  const npc = await prisma.npcTemplate.update({
    where: { id: npcId },
    data: { nombre: nombreLimpio },
  });
  revalidateNpcs();
  return { ok: true, sheet: leerNpc(npc.stats) };
}

export async function setNotaNpcAction(npcId: string, nota: string): Promise<NpcResult> {
  if (!(await requireMaster())) return { ok: false, error: "Solo el máster puede editar NPCs." };
  const npc = await prisma.npcTemplate.update({
    where: { id: npcId },
    data: { nota: nota.slice(0, 2000) || null },
  });
  revalidateNpcs();
  return { ok: true, sheet: leerNpc(npc.stats) };
}

// Especie en modo libre (docs/sistema.md §14.3): sin reset, sin bloqueo por
// aprobación y sin créditos (NpcTemplate no tiene esa columna). Sí valida la
// combinación (casta y linaje donde tocan). Un NPC ya metido en un combate guarda
// su foto: esto no toca ese combate.
export async function setEspecieNpcAction(npcId: string, eleccion: EleccionEspecie): Promise<NpcResult> {
  const parsed = eleccionEspecieSchema.safeParse(eleccion);
  if (!parsed.success) return { ok: false, error: "Elección de especie inválida" };
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const res = elegirEspecie(ctx.sheet, parsed.data, { aprobada: false, esMaster: true, libre: true });
  if ("error" in res) return { ok: false, error: res.error };
  // Una especie nueva puede bajar el máximo de vida/fatiga: se recorta aquí (setEspecieAction).
  return persist(npcId, reconciliarVida(res.sheet));
}

// Atributo libre de la especie en modo libre: sin bloqueo.
export async function setAtributoLibreNpcAction(npcId: string, atributo: unknown): Promise<NpcResult> {
  const parsed = atributoLibreSchema.safeParse(atributo);
  if (!parsed.success) return { ok: false, error: "Atributo inválido" };
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const res = elegirAtributoLibre(ctx.sheet, parsed.data, { aprobada: false, esMaster: true, libre: true });
  if ("error" in res) return { ok: false, error: res.error };
  return persist(npcId, reconciliarVida(res.sheet));
}

// Dotes en modo libre (docs/sistema.md §9.4): el máster las pone y quita a mano, sin
// requisitos ni coste. Solo se valida que la dote exista y sea visible, la elección y
// lo de repetible (comprarDote con CONTEXTO_LIBRE); quitar, siempre. Un NPC ya metido
// en un combate guarda su foto: esto no toca ese combate.
export async function ponerDoteNpcAction(npcId: string, entrada: unknown): Promise<NpcResult> {
  const parsed = doteCompradaSchema.safeParse(entrada);
  if (!parsed.success) return { ok: false, error: "Dote inválida" };
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const res = comprarDote(ctx.sheet, parsed.data, CONTEXTO_LIBRE);
  if (!res.ok) return { ok: false, error: res.error };
  return persist(npcId, res.sheet);
}

export async function quitarDoteNpcAction(npcId: string, entrada: unknown): Promise<NpcResult> {
  const parsed = doteCompradaSchema.safeParse(entrada);
  if (!parsed.success) return { ok: false, error: "Dote inválida" };
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const res = quitarDote(ctx.sheet, parsed.data, CONTEXTO_LIBRE);
  if (!res.ok) return { ok: false, error: res.error };
  return persist(npcId, res.sheet);
}

// --- Atributos / habilidades / equipo: directo, sin point-buy ni coste ---
// (el máster no tiene pool que gastar ni créditos que cobrar al equipar a
// un NPC — mismo criterio que ya rige cuando el máster edita a un jugador:
// sin tope de rareza, aquí llevado un paso más allá porque tampoco hay
// ficha "aprobada" de la que protegerse).
//
// OJO, hallazgo real haciendo el smoke test: `setAtributoValue`/
// `setHabilidadValue` (lib/rules/creacion.ts) NO son una asignación directa
// — respetan el pool de creación (puntosAtributosDisponibles) y rechazan en
// silencio cualquier subida que lo deje negativo. Sin ninguna letra de
// prioridad asignada (el caso de un NpcTemplate, que no pasa por prioridad),
// el pool es 0, así que esas funciones no mueven el número NUNCA. Aquí se
// clampa directo contra los límites del sistema (ATRIBUTO_MIN/MAX,
// HABILIDAD_NO_ENTRENADA/MAX), sin pool y sin la restricción de "solo
// subir" que sí tiene un PJ en progresión con XP — un NPC se edita libre en
// las dos direcciones.

export async function setAtributoNpcAction(
  npcId: string,
  atributoId: AtributoId,
  value: number,
): Promise<NpcResult> {
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const v = clampInt(value, ATRIBUTO_MIN, ATRIBUTO_MAX, ctx.sheet.atributos[atributoId]);
  return persist(npcId, { ...ctx.sheet, atributos: { ...ctx.sheet.atributos, [atributoId]: v } });
}

// Psiónica libre: sin pool ni XP, 0-6 en las dos direcciones, pero con los
// requisitos entre disciplinas (son regla del sistema, no de creación), contra el
// nivel efectivo: la Resonancia +1 de especie es derivada y también le llega (§14.3).
export async function setDisciplinaNpcAction(
  npcId: string,
  disciplinaId: DisciplinaId,
  value: number,
): Promise<NpcResult> {
  if (!esDisciplinaId(disciplinaId)) return { ok: false, error: "Disciplina desconocida" };
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const bonos = bonosDeDisciplina(modificadoresActivos(ctx.sheet));
  return persist(npcId, setNivelDisciplina(ctx.sheet, disciplinaId, value, bonos));
}

export async function setHabilidadNpcAction(
  npcId: string,
  habilidadId: HabilidadId,
  value: number,
): Promise<NpcResult> {
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const actual = ctx.sheet.habilidades[habilidadId];
  const v = clampInt(value, HABILIDAD_NO_ENTRENADA, HABILIDAD_MAX, actual.valor);
  return persist(npcId, {
    ...ctx.sheet,
    habilidades: { ...ctx.sheet.habilidades, [habilidadId]: { ...actual, valor: v } },
  });
}

export async function addEspecialidadNpcAction(
  npcId: string,
  habilidadId: HabilidadId,
  especialidadId: string,
): Promise<NpcResult> {
  const parsed = especialidadDeHabilidadSchema.safeParse({ habilidadId, especialidadId });
  if (!parsed.success) return { ok: false, error: "Especialidad inválida para esa habilidad" };
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  // NPC: sin ajuste de casta (§14.3).
  return persist(npcId, addEspecialidad(ctx.sheet, parsed.data.habilidadId, parsed.data.especialidadId, AJUSTE_NEUTRO));
}

export async function removeEspecialidadNpcAction(
  npcId: string,
  habilidadId: HabilidadId,
  especialidadId: string,
): Promise<NpcResult> {
  const parsed = especialidadDeHabilidadSchema.safeParse({ habilidadId, especialidadId });
  if (!parsed.success) return { ok: false, error: "Especialidad inválida para esa habilidad" };
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(npcId, removeEspecialidad(ctx.sheet, parsed.data.habilidadId, parsed.data.especialidadId));
}

export async function equiparNpcAction(npcId: string, pieza: PiezaEquipada): Promise<NpcResult> {
  // Sin `viaEspecie`: el NPC no tiene tope de rareza ni excepción que marcar (§14.3).
  const parsed = piezaEquipadaEntradaSchema.safeParse(pieza);
  if (!parsed.success) return { ok: false, error: "Pieza de equipo inválida" };
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const sheet = equipar(ctx.sheet, parsed.data);
  if (sheet === ctx.sheet) return { ok: false, error: "Pieza de equipo inválida" };
  return persist(npcId, sheet);
}

// Armas Modificadas (S87) sobre un arma del NPC: sin coste ni tope de rareza.
export async function convertirArmaNpcAction(npcId: string, entrada: unknown): Promise<NpcResult> {
  const parsed = conversionArmaEntradaSchema.safeParse(entrada);
  if (!parsed.success) return { ok: false, error: "Modificación inválida" };
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const sheet = convertirArma(ctx.sheet, parsed.data.instanciaId, parsed.data.modificaciones);
  if (sheet === ctx.sheet) return { ok: false, error: "Esa modificación no cabe en esa arma" };
  return persist(npcId, sheet);
}

// Aumentos del NPC: sin coste ni bolsa (§14.3), con las mismas reglas de compra
// (requisitos, un implante de cada que solo sube, elección).
// Los requisitos se piden igual que a un jugador, aunque las dotes del NPC no los pidan
// (§9.4): decisión del usuario, 2026-10-22.
export async function comprarAumentoNpcAction(npcId: string, entrada: unknown): Promise<NpcResult> {
  const parsed = compraAumentoSchema.safeParse(entrada);
  if (!parsed.success) return { ok: false, error: "Aumento inválido" };
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const res = comprarAumento(ctx.sheet, parsed.data, { libre: true, instanciaId: nuevaInstanciaId() });
  if (!res.ok) return { ok: false, error: res.error };
  return persist(npcId, res.sheet);
}

export async function desequiparNpcAction(npcId: string, instanciaId: string): Promise<NpcResult> {
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(npcId, retirarPieza(ctx.sheet, instanciaId));
}

// Arma incorporada del Brazo Biónico (A6b): misma validación que la del personaje.
export async function fijarArmaIncorporadaNpcAction(npcId: string, entrada: unknown): Promise<NpcResult> {
  const parsed = armaIncorporadaEntradaSchema.safeParse(entrada);
  if (!parsed.success) return { ok: false, error: "Arma no válida" };
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const res = fijarArmaIncorporada(ctx.sheet, parsed.data.brazoInstanciaId, parsed.data.armaInstanciaId);
  if (!res.ok) return res;
  return persist(npcId, res.sheet);
}

// RECURSOS: mismo criterio "libre" que el resto de la ficha del NPC — sin
// créditos que cobrar al recargar, el máster ajusta el número directo.
export async function ajustarRecursoNpcAction(
  npcId: string,
  instanciaId: string,
  delta: number,
): Promise<NpcResult> {
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(npcId, ajustarRecurso(ctx.sheet, instanciaId, delta));
}

// Vida y fatiga (docs/tareas.md, 2026-09-27): mismo criterio "libre" que el
// resto de la ficha del NPC.
export async function ajustarVidaNpcAction(npcId: string, delta: number): Promise<NpcResult> {
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(npcId, ajustarVida(ctx.sheet, delta));
}

export async function ajustarFatigaNpcAction(npcId: string, delta: number): Promise<NpcResult> {
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(npcId, ajustarFatiga(ctx.sheet, delta));
}

export async function pagarFatigaNpcAction(npcId: string, coste: number, permiteTemporal: boolean): Promise<NpcResult> {
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(npcId, pagarFatiga(ctx.sheet, coste, permiteTemporal === true));
}

export async function ajustarFatigaTemporalNpcAction(npcId: string, delta: number): Promise<NpcResult> {
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(npcId, ajustarFatigaTemporal(ctx.sheet, delta));
}

export async function terminarEscenaNpcAction(npcId: string): Promise<NpcResult> {
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(npcId, terminarEscena(ctx.sheet));
}

export async function comprarRecargaNpcAction(npcId: string, instanciaId: string): Promise<NpcResult> {
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const resultado = comprarRecarga(ctx.sheet, instanciaId);
  if (!resultado) return { ok: false, error: "No hay ningún recurso que recargar ahí." };
  return persist(npcId, resultado.sheet);
}

// Materiales (docs/tareas.md, tarea 8): mismo criterio "libre" que RECURSOS.
export async function ajustarMaterialNpcAction(
  npcId: string,
  tier: MaterialTier,
  delta: number,
): Promise<NpcResult> {
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(npcId, ajustarMaterial(ctx.sheet, tier, delta));
}

export async function comprarMaterialNpcAction(npcId: string, tier: MaterialTier): Promise<NpcResult> {
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(npcId, comprarMaterial(ctx.sheet, tier).sheet);
}

// Granadas (docs/tareas.md, 2026-09-27): mismo criterio "libre" que
// RECURSOS/Materiales — sin créditos ni tope de rareza que comprobar.
export async function ajustarGranadaNpcAction(
  npcId: string,
  catalogoId: string,
  delta: number,
): Promise<NpcResult> {
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(npcId, ajustarGranada(ctx.sheet, catalogoId, delta));
}

export async function comprarGranadaNpcAction(npcId: string, catalogoId: string): Promise<NpcResult> {
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const resultado = comprarGranada(ctx.sheet, catalogoId);
  if (!resultado) return { ok: false, error: "Granada inválida" };
  return persist(npcId, resultado.sheet);
}

// Munición especial: mismo criterio "libre" que Granadas — sin créditos ni
// tope de rareza, pero sí exige un arma habilitada, como al jugador.
export async function ajustarMunicionEspecialNpcAction(
  npcId: string,
  municionId: string,
  delta: number,
): Promise<NpcResult> {
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(npcId, ajustarMunicionEspecial(ctx.sheet, municionId, delta));
}

export async function comprarMunicionEspecialNpcAction(npcId: string, municionId: string): Promise<NpcResult> {
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const resultado = comprarMunicionEspecial(ctx.sheet, municionId);
  if (!resultado) return { ok: false, error: "Ningún arma equipada admite esa munición." };
  return persist(npcId, resultado.sheet);
}

// Fármacos (docs/prompt-gasto-recursos.md, Fase 2): mismo criterio "libre"
// que Granadas — sin créditos ni tope de rareza que comprobar.
export async function ajustarFarmacoNpcAction(
  npcId: string,
  catalogoId: string,
  delta: number,
): Promise<NpcResult> {
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  return persist(npcId, ajustarFarmaco(ctx.sheet, catalogoId, delta));
}

export async function comprarFarmacoNpcAction(npcId: string, catalogoId: string): Promise<NpcResult> {
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const resultado = comprarFarmaco(ctx.sheet, catalogoId);
  if (!resultado) return { ok: false, error: "Fármaco inválido" };
  return persist(npcId, resultado.sheet);
}

// Fabricar: sin requisito de VTF ni tope de rareza (edición libre, mismo
// criterio que equiparNpcAction/repararNpcAction) — solo hace falta que
// haya stock suficiente del tier. Tampoco tira dado (a diferencia del PJ,
// fabricarAction): `exito: true` fijo, edición libre significa sin azar
// tampoco, no solo sin tope de rareza.
export async function fabricarNpcAction(
  npcId: string,
  catalogoId: string,
  tier: MaterialTier,
  opciones?: unknown,
): Promise<NpcResult> {
  const parsedOpciones = opcionesFabricarSchema.optional().safeParse(opciones);
  if (!parsedOpciones.success) return { ok: false, error: "Encargo de fabricación inválido." };
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const sheet = fabricar(ctx.sheet, catalogoId, tier, true, parsedOpciones.data);
  if (sheet === ctx.sheet) return { ok: false, error: "No se pudo fabricar (id inválido o sin materiales)." };
  return persist(npcId, sheet);
}

// Reparar: sin tope de rareza (edición libre, mismo criterio que
// equiparNpcAction) — solo hace falta que haya stock del tier. Tampoco tira
// dado, mismo criterio que fabricarNpcAction: `exito: true` fijo.
export async function repararNpcAction(
  npcId: string,
  instanciaId: string,
  tier: MaterialTier,
): Promise<NpcResult> {
  const ctx = await loadSheet(npcId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const sheet = repararPieza(ctx.sheet, instanciaId, tier, true);
  if (sheet === ctx.sheet) return { ok: false, error: "No hay nada que reparar ahí (o no tienes materiales)." };
  return persist(npcId, sheet);
}
